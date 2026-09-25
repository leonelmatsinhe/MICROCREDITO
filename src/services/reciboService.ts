import fs from "fs";
import path from "path";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import moment from "moment";
import { Op, Transaction } from "sequelize";
import { db } from "../database/db";
import { ReciboModel } from "../database/models/ReciboModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { FinancingWalletModel } from "../database/models/FinancingWalletModel";
import { AccountModel } from "../database/models/AccountModel";

/**
 * RECIBOS — NUMERAÇÃO SEQUENCIAL LEGAL (AUTORIDADE TRIBUTÁRIA DE MOÇAMBIQUE)
 * ------------------------------------------------------------------------
 * Requisitos implementados:
 *  · uma série por empresa/ano (formato `REC-AAAA-00001`);
 *  · sequência SEM SALTOS: o contador é reservado dentro de uma transacção com
 *    `SELECT ... FOR UPDATE` e só é incrementado se o recibo for realmente
 *    gravado (ROLLBACK devolve o número — não abre buraco na numeração legal);
 *  · SELO ELECTRÓNICO: hash SHA-256 dos dados do recibo + código de validação +
 *    QR Code que abre a página pública de validação (`/validar`);
 *  · um recibo por pagamento individual, com capital, juros, mora e desconto
 *    discriminados;
 *  · PDF moderno com identificação do emitente (logotipo + NUIT), dados do
 *    cliente, carteira de financiamento, decomposição do pagamento, extrato das
 *    prestações pendentes e rodapé legal com hash.
 */

const round2 = (value: number): number => Math.round((Number(value) || 0) * 100) / 100;

const fmtMoney = (value: any): string =>
  `${Number(value || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;

const fmtNumber = (value: any): string =>
  Number(value || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** moment seguro: aceita Date (vindo do Sequelize) ou string ISO. */
const toMoment = (value: any) => (value instanceof Date ? moment(value) : moment(String(value)));

const fmtDate = (value: any): string => {
  if (!value) return "—";
  const parsed = toMoment(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : String(value);
};

/**
 * Data/hora de emissão no fuso de Moçambique, com o fuso explícito no documento
 * (UTC+2 fixo — não depende do fuso configurado no servidor).
 */
const MAPUTO_UTC_OFFSET_MIN = 120;
const fmtDateTimeMaputo = (value: any): string => {
  if (!value) return "—";
  const parsed = value instanceof Date ? moment.utc(value) : moment.utc(String(value));
  if (!parsed.isValid()) return String(value);
  return `${parsed.utcOffset(MAPUTO_UTC_OFFSET_MIN).format("DD/MM/YYYY HH:mm")} (África/Maputo)`;
};

/**
 * Telefone moçambicano legível: `25884562587` → `+258 84 562 587`.
 * Os dados legados têm comprimentos irregulares (com/sem indicativo, com 8 a 11
 * dígitos) — o agrupamento 2-3-3 é aplicado ao que existir, sem inventar dígitos.
 */
const fmtPhone = (value: any): string => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "—";
  const local = digits.startsWith("258") ? digits.slice(3) : digits;
  if (local.length < 8) return `+258 ${local}`;
  return `+258 ${[local.slice(0, 2), local.slice(2, 5), local.slice(5)].filter(Boolean).join(" ")}`;
};

/** Data de emissão congelada no momento em que o recibo é criado. */
const diaDaEmissao = (recibo: any): string =>
  moment(recibo?.created_at || recibo?.createdAt || undefined).isValid()
    ? moment(recibo?.created_at || recibo?.createdAt).format("DD/MM/YYYY")
    : moment().format("DD/MM/YYYY");

const docsDir = () => path.join(process.cwd(), "uploads", "docs");
const qrDir = (companyId: number, ano: number) => path.join(process.cwd(), "uploads", "recibos", String(companyId), String(ano));

/** Software certificado gravado em cada recibo (referência da certificação AT). */
export const SOFTWARE_CERTIFICATION = "MBRM v2.0 Cert AT 2026/001";

/**
 * Métodos de pagamento gravados pelo sistema em dois formatos: o código legado
 * (1..8) e o código da tesouraria (CASH/BANK/MPESA/EMOLA). Alguns ecrãs gravam
 * o **id da conta** (accounts.id) — por isso o rótulo é resolvido primeiro na
 * tabela de contas e só depois nos códigos legados.
 */
const LEGACY_METHOD_LABELS: Record<string, string> = {
  "1": "Numerário",
  "2": "Cheque",
  "3": "Transferência bancária",
  "4": "Depósito bancário",
  "5": "TPA",
  "6": "e-Mola",
  "7": "M-Pesa",
  "8": "e-Mola",
  CASH: "Numerário",
  BANK: "Transferência bancária",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
};

const PURPOSE_LABELS: Record<string, string> = {
  DESEMBOLSO: "conta de desembolso",
  REEMBOLSO: "conta de reembolso",
  RESERVA: "conta de reserva",
  MISTO: "conta mista",
};

/**
 * Devolve o rótulo legível e a descrição completa do método de pagamento.
 * Ex.: código `10` (conta Moza Banco) → "Moza Banco · conta de reembolso".
 */
/**
 * Traduz o código/número de método de pagamento para texto legível (conta
 * bancária com finalidade, códigos legados da tesouraria). Exportado para que a
 * página de detalhe do crédito mostre o mesmo rótulo que sai no recibo.
 */
export const resolvePaymentMethod = async (
  value: any,
  companyId: number
): Promise<{ label: string; description: string }> => {
  if (value === null || value === undefined || value === "") {
    return { label: "—", description: "Não indicado" };
  }

  const raw = String(value).trim();

  // 1) Pode ser o id de uma conta (é assim que alguns ecrãs gravam o método).
  const asId = Number(raw);
  if (Number.isFinite(asId) && asId > 0) {
    try {
      const account: any = (await AccountModel.findOne({
        where: { id: asId, companyId },
        raw: true,
      })) as any;
      if (account) {
        const banco = String(account.bank_name || account.accountDescription || `Conta ${asId}`);
        const tipo = PURPOSE_LABELS[String(account.purpose)] || String(account.purpose || "").toLowerCase();
        const numero = account.accountNumber ? ` · ${account.accountNumber}` : "";
        return {
          label: banco,
          description: `${banco}${numero}${tipo ? ` · ${tipo}` : ""}`,
        };
      }
    } catch {
      /* tabela de contas indisponível — segue para os códigos legados */
    }
  }

  // 2) Códigos legados / da tesouraria.
  const legacy = LEGACY_METHOD_LABELS[raw.toUpperCase()];
  if (legacy) return { label: legacy, description: legacy };

  // 3) Contas pelo nome (ex.: "MPESA", "BANK" já tratados acima).
  return { label: raw, description: raw };
};

// ─────────────────────────────────────────────────────────────────────────────
// SELO ELECTRÓNICO (HASH + QR CODE)
// ─────────────────────────────────────────────────────────────────────────────

/** Chave privada da empresa usada no hash — nunca vai para o documento. */
const hashSecret = (): string =>
  String(process.env.RECIBO_HASH_SECRET || process.env.APP_SECRET || "MBRM-RECIBO-AT-2026");

export type ReciboSealInput = {
  companyId: number;
  companyNuit?: string | null;
  numero: string;
  ano: number;
  sequencia: number;
  loanId?: number | null;
  customerId?: number | null;
  tranzactionId?: number | null;
  valorPago: number;
  dataISO: string;
};

/** SHA-256 dos dados do recibo + segredo da empresa (não reversível). */
export const buildReciboHash = (input: ReciboSealInput): string => {
  const payload = [
    String(input.companyNuit || ""),
    String(input.companyId),
    input.numero,
    String(input.ano),
    String(input.sequencia),
    String(input.loanId ?? ""),
    String(input.customerId ?? ""),
    String(input.tranzactionId ?? ""),
    Number(input.valorPago || 0).toFixed(2),
    input.dataISO,
    hashSecret(),
  ].join("|");
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
};

/** URL pública de validação (a mesma que o QR Code abre). */
export const validationUrl = (params: { numero: string; hash: string }): string => {
  const base =
    process.env.PUBLIC_VALIDATION_URL
    || process.env.PUBLIC_BASE_URL
    || "https://maismola.co.mz";
  const clean = String(base).replace(/\/+$/, "");
  return `${clean}/validar?rec=${encodeURIComponent(params.numero)}&hash=${encodeURIComponent(params.hash)}`;
};

/** Conteúdo do QR Code: identificação legível + URL de validação. */
export const buildQrContent = (params: {
  nuit: string;
  numero: string;
  data: string;
  valor: number;
  hash: string;
  url: string;
}): string =>
  [
    "MBRM",
    params.nuit,
    params.numero,
    params.data,
    fmtNumber(params.valor),
    params.hash,
    params.url,
  ].join("*");

/**
 * Garante que o recibo tem o selo electrónico (hash, código de validação,
 * conteúdo e PNG do QR Code). Idempotente: se já tiver hash, devolve como está
 * — o selo é calculado uma única vez, no momento da emissão.
 */
export const ensureReciboSeal = async (reciboId: number, force = false): Promise<any> => {
  const recibo: any = (await ReciboModel.findByPk(reciboId, { raw: true })) as any;
  if (!recibo) return null;
  const faltaSelo = !recibo.hash_at || !recibo.qr_code_url;
  const faltaMetodo = !recibo.metodo_pagamento_desc && !!recibo.tranzactionId;
  if (!force && !faltaSelo && !faltaMetodo) return recibo;

  const companyId = Number(recibo.companyId);
  const empresa: any = ((await CompanyModel.findByPk(companyId, { raw: true })) as any) || {};
  const dataEmissao = recibo.created_at || recibo.createdAt || new Date();
  const momentoEmissao = toMoment(dataEmissao);
  const dataEmissaoIso = momentoEmissao.isValid() ? momentoEmissao.toISOString() : new Date().toISOString();

  const hash = buildReciboHash({
    companyId,
    companyNuit: empresa.companyNuit,
    numero: String(recibo.numero),
    ano: Number(recibo.ano),
    sequencia: Number(recibo.sequencia),
    loanId: recibo.loanId,
    customerId: recibo.customerId,
    tranzactionId: recibo.tranzactionId,
    valorPago: Number(recibo.valor_pago),
    dataISO: dataEmissaoIso,
  });

  // Recibos antigos guardaram o método como código/id de conta (ex.: "10"):
  // resolve-se agora para texto legível, uma única vez.
  let metodoLabel: string | null = null;
  let metodoDesc: string | null = null;
  if (!recibo.metodo_pagamento_desc && recibo.tranzactionId) {
    try {
      const tx: any = (await TranzactionModel.findByPk(Number(recibo.tranzactionId), { raw: true })) as any;
      if (tx) {
        const metodo = await resolvePaymentMethod(tx.paymentMethod, companyId);
        metodoLabel = metodo.label;
        metodoDesc = metodo.description;
      }
    } catch { /* pagamento removido — mantém-se o valor gravado */ }
  }

  const atCode = `AT-${recibo.ano}-${String(recibo.sequencia).padStart(5, "0")}`;
  const url = validationUrl({ numero: String(recibo.numero), hash });
  const qrContent = buildQrContent({
    nuit: String(empresa.companyNuit || ""),
    numero: String(recibo.numero),
    data: momentoEmissao.isValid() ? momentoEmissao.format("DD/MM/YYYY") : fmtDate(dataEmissao),
    valor: Number(recibo.valor_pago),
    hash,
    url,
  });

  // PNG do QR Code — guardado por empresa/ano (o PDF apenas o embute).
  let qrPublicUrl: string | null = null;
  try {
    const dir = qrDir(companyId, Number(recibo.ano));
    await fs.promises.mkdir(dir, { recursive: true });
    const fileName = `QR-${String(recibo.numero).replace(/[^A-Za-z0-9-]/g, "")}.png`;
    const filePath = path.join(dir, fileName);
    await QRCode.toFile(filePath, qrContent, { width: 600, margin: 1, errorCorrectionLevel: "M" });
    qrPublicUrl = `/recibos/${companyId}/${recibo.ano}/${fileName}`;
  } catch (error: any) {
    console.error("[Recibo] Falha ao gerar o QR Code:", error?.message || error);
  }

  await ReciboModel.update(
    {
      hash_at: hash,
      qr_content: qrContent,
      qr_code_url: qrPublicUrl,
      at_validation_code: atCode,
      software_certification: SOFTWARE_CERTIFICATION,
      ...(metodoLabel ? { metodo_pagamento: metodoLabel } : {}),
      ...(metodoDesc ? { metodo_pagamento_desc: metodoDesc } : {}),
    },
    { where: { id: reciboId } }
  );

  return (await ReciboModel.findByPk(reciboId, { raw: true })) as any;
};

/** Recibo pelo hash ou pelo número (utilizado pela validação pública do QR). */
export const findReciboForValidation = async (params: {
  hash?: string | null;
  numero?: string | null;
}): Promise<any | null> => {
  const where: any = {};
  if (params.hash) where.hash_at = String(params.hash).trim().toLowerCase();
  if (params.numero) where.numero = String(params.numero).trim();
  if (Object.keys(where).length === 0) return null;
  return (await ReciboModel.findOne({ where, raw: true })) as any;
};

/** GETTER tolerante a instâncias Sequelize e a objectos simples. */
const pick = (row: any, key: string): any => {
  if (!row) return undefined;
  return typeof row.getDataValue === "function" ? row.getDataValue(key) : row[key];
};

/**
 * Reserva o próximo número da série, dentro de uma transacção.
 * Se a transacção fizer rollback, o incremento desaparece com ela — a
 * numeração legal mantém-se contínua.
 */
const reserveSequence = async (
  transaction: Transaction,
  companyId: number,
  ano: number,
  serie = "REC"
): Promise<{ sequencia: number; numero: string }> => {
  const [rows]: any = await db.query(
    "SELECT ultima_sequencia FROM recibos_sequencia WHERE companyId = ? AND ano = ? FOR UPDATE",
    { replacements: [companyId, ano], transaction }
  );

  let ultima = Number((rows as any[])[0]?.ultima_sequencia);
  if (!Number.isFinite(ultima)) {
    // Primeira vez neste ano: cria o contador a zero de forma atómica.
    try {
      await db.query(
        "INSERT INTO recibos_sequencia (companyId, ano, ultima_sequencia) VALUES (?, ?, 0)",
        { replacements: [companyId, ano], transaction }
      );
      ultima = 0;
    } catch (error: any) {
      // Corrida entre dois pedidos: relê o valor já criado pelo outro.
      const [again]: any = await db.query(
        "SELECT ultima_sequencia FROM recibos_sequencia WHERE companyId = ? AND ano = ? FOR UPDATE",
        { replacements: [companyId, ano], transaction }
      );
      ultima = Number((again as any[])[0]?.ultima_sequencia);
      if (!Number.isFinite(ultima)) throw error;
    }
  }

  const sequencia = ultima + 1;
  await db.query(
    "UPDATE recibos_sequencia SET ultima_sequencia = ? WHERE companyId = ? AND ano = ?",
    { replacements: [sequencia, companyId, ano], transaction }
  );

  return {
    sequencia,
    numero: `${serie}-${ano}-${String(sequencia).padStart(5, "0")}`,
  };
};

export type ReciboDetalhe = {
  recibo: any;
  empresa: any;
  cliente: any;
  credito: any;
  carteira: any;
  prestacoesPendentes: any[];
};

/** Lê um recibo com todo o contexto necessário para o PDF/extrato. */
export const getReciboDetalhe = async (id: number): Promise<ReciboDetalhe | null> => {
  const recibo: any = await ReciboModel.findByPk(id, { raw: true });
  if (!recibo) return null;

  const companyId = Number(recibo.companyId);
  const empresa: any = (await CompanyModel.findByPk(companyId, { raw: true })) || {};
  const cliente: any = recibo.customerId
    ? (await CustomerModel.findByPk(Number(recibo.customerId), { raw: true })) || {}
    : {};
  const credito: any = recibo.loanId
    ? (await LoanModel.findByPk(Number(recibo.loanId), { raw: true })) || {}
    : {};
  const carteira: any = recibo.walletId
    ? (await FinancingWalletModel.findByPk(Number(recibo.walletId), { raw: true })) || {}
    : {};

  let prestacoesPendentes: any[] = [];
  if (recibo.loanId) {
    prestacoesPendentes = (await AmorizationLoanModel.findAll({
      where: { loanId: Number(recibo.loanId), status: { [Op.in]: [0, -1] } },
      order: [["dueDate", "ASC"], ["id", "ASC"]],
      raw: true,
    })) as any[];
  }

  return { recibo, empresa, cliente, credito, carteira, prestacoesPendentes };
};

/**
 * Gera o recibo de um pagamento (idempotente: um recibo por tranzaction).
 * Devolve o registo criado/reutilizado, já com o selo electrónico.
 */
export const generateReciboForTranzaction = async (params: {
  tranzactionId: number;
  companyId: number;
  createdBy?: number | null;
}): Promise<any> => {
  const { tranzactionId, companyId } = params;

  const existing: any = await ReciboModel.findOne({
    where: { tranzactionId, companyId },
    raw: true,
  });
  if (existing) return ensureReciboSeal(Number(existing.id)) || existing;

  const tranzaction: any = await TranzactionModel.findByPk(tranzactionId, { raw: true });
  if (!tranzaction) throw new Error("Pagamento não encontrado para emissão do recibo.");
  if (Number(tranzaction.companyId) !== Number(companyId)) {
    throw new Error("Pagamento não pertence a esta empresa.");
  }

  const loan: any = tranzaction.loanId
    ? (await LoanModel.findByPk(Number(tranzaction.loanId), { raw: true })) || {}
    : {};
  const customer: any = tranzaction.customerId
    ? (await CustomerModel.findByPk(Number(tranzaction.customerId), { raw: true })) || {}
    : {};
  // A carteira vem do pagamento (tranzactions.walletId); só se este não a tiver
  // é que se usa a do crédito. Assim o recibo nunca perde a origem do capital.
  const effectiveWalletId = Number(tranzaction.walletId) || Number(loan.walletId) || null;
  const wallet: any = effectiveWalletId
    ? (await FinancingWalletModel.findByPk(Number(effectiveWalletId), { raw: true })) || {}
    : {};

  // Decomposição do pagamento: capital vs. juros vs. mora.
  const valorPago = round2(Number(tranzaction.amount) || 0);
  const valorJuros = round2(Number(tranzaction.interestRateAmount) || 0);
  const valorMora = round2(Number(tranzaction.mora_amount) || Number(tranzaction.latePaymentInterest) || 0);
  const valorDesconto = round2(Number(tranzaction.discountAmount) || 0);
  const valorCapital = round2(Math.max(0, valorPago - valorJuros));

  // Saldo devedor do crédito após este pagamento (todas as prestações abertas).
  let saldoRestante = 0;
  if (tranzaction.loanId) {
    const pendentes: any[] = (await AmorizationLoanModel.findAll({
      where: { loanId: Number(tranzaction.loanId), status: { [Op.in]: [0, -1] } },
      attributes: ["installment", "paidAmount"],
      raw: true,
    })) as any[];
    saldoRestante = round2(
      pendentes.reduce((total, item) => total + Math.max(0, Number(item.installment) - Number(item.paidAmount || 0)), 0)
    );
  }

  // Método de pagamento legível (resolve contas/hidden ids e códigos legados).
  const metodo = await resolvePaymentMethod(tranzaction.paymentMethod, Number(companyId));

  const ano = Number(moment(tranzaction.paymentDate || undefined).year()) || new Date().getFullYear();
  const serie = "REC";

  const recibo = await db.transaction(async (transaction) => {
    const { sequencia, numero } = await reserveSequence(transaction, Number(companyId), ano, serie);

    const created: any = await ReciboModel.create(
      {
        companyId: Number(companyId),
        numero,
        serie,
        sequencia,
        ano,
        tranzactionId: Number(tranzactionId),
        loanId: tranzaction.loanId ? Number(tranzaction.loanId) : null,
        customerId: tranzaction.customerId ? Number(tranzaction.customerId) : null,
        walletId: effectiveWalletId,
        customer_name: customer.customerName || null,
        customer_nuit: customer.customerNuit || null,
        customer_account: tranzaction.accountNumber ? String(tranzaction.accountNumber) : null,
        wallet_nome: wallet.nome || null,
        metodo_pagamento: metodo.label,
        metodo_pagamento_desc: metodo.description,
        referencia: tranzaction.tranzactionReference || null,
        valor_pago: valorPago,
        valor_capital: valorCapital,
        valor_juros: valorJuros,
        valor_mora: valorMora,
        valor_desconto: valorDesconto,
        saldo_restante: saldoRestante,
        created_by: params.createdBy ?? null,
      },
      { transaction }
    );
    return created;
  });

  // Selo + PDF: gerados fora da transacção (o número já está reservado e gravado).
  const reciboId = Number(pick(recibo, "id"));
  try {
    await ensureReciboSeal(reciboId);
    const pdfUrl = await renderReciboPdf(reciboId);
    if (pdfUrl) {
      await ReciboModel.update({ pdf_url: pdfUrl }, { where: { id: reciboId } });
    }
  } catch (error: any) {
    console.error("[Recibo] Falha ao gerar o selo/PDF:", error?.message || error);
  }

  return (await ReciboModel.findByPk(reciboId, { raw: true })) || recibo;
};

/** Recibos de um crédito (mais recentes primeiro). */
export const listRecibosByLoan = async (companyId: number, loanId: number) =>
  (await ReciboModel.findAll({
    where: { companyId, loanId },
    order: [["id", "DESC"]],
    raw: true,
  })) as any[];

/** Recibos de uma carteira analítica (portal do financiador). */
export const listRecibosByWallet = async (companyId: number, walletId: number) =>
  (await ReciboModel.findAll({
    where: { companyId, walletId },
    order: [["id", "DESC"]],
    raw: true,
  })) as any[];

/** Recibos de um cliente. */
export const listRecibosByCustomer = async (companyId: number, customerId: number) =>
  (await ReciboModel.findAll({
    where: { companyId, customerId },
    order: [["id", "DESC"]],
    raw: true,
  })) as any[];

// ─────────────────────────────────────────────────────────────────────────────
// PDF — LAYOUT MODERNO (COMPLIANCE AT)
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: "#0f6b2f",
  primaryDark: "#0b4f23",
  light: "#e8f5e9",
  lime: "#f1f8e9",
  border: "#e0e0e0",
  orange: "#ef6c00",
  red: "#c62828",
  amber: "#b45309",
  grey: "#757575",
  dark: "#1f2937",
  zebra: "#f9fbe7",
};

/** Cor da badge de cada carteira de financiamento. */
const WALLET_COLORS: Record<string, string> = {
  blue: "#2563eb",
  orange: "#f97316",
  "deep-orange": "#ea580c",
  green: "#16a34a",
  grey: "#64748b",
  purple: "#7c3aed",
  teal: "#0d9488",
  brown: "#92400e",
  pink: "#db2777",
  cyan: "#0891b2",
};

/** Iniciais do mutuário para o avatar do recibo (ex.: "Kanyacudie Ozias Uau" → "KO"). */
const initialsOf = (name: string): string =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "MB";

/** Caminho local do logotipo da empresa (companies.companyLogo → uploads/...). */
const companyLogoPath = (logo: any): string | null => {
  if (!logo) return null;
  const fileName = path.basename(String(logo));
  const candidates = [
    path.join(process.cwd(), "uploads", "img", fileName),
    path.join(process.cwd(), "uploads", "documents", fileName),
    path.join(process.cwd(), "uploads", fileName),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

/**
 * Desenha o PDF do recibo (pdfkit) e devolve o caminho público do ficheiro.
 * Layout moderno: cabeçalho com logotipo + QR Code, faixa de identificação,
 * três cartões (mutuário, crédito/carteira, pagamento), extrato das prestações
 * pendentes e rodapé legal com hash e assinaturas.
 */
export const renderReciboPdf = async (
  reciboId: number,
  // `compress: false` gera um PDF inspeccionável (usado na verificação do
  // layout); em produção o PDF vai comprimido, como até aqui.
  options: { compress?: boolean } = {}
): Promise<string | null> => {
  const selado = await ensureReciboSeal(reciboId);
  const detalhe = await getReciboDetalhe(reciboId);
  if (!detalhe) return null;
  const { recibo, empresa, cliente, credito, carteira, prestacoesPendentes } = detalhe;
  if (!recibo) return null;

  const companyId = Number(recibo.companyId);
  const outDir = docsDir();
  await fs.promises.mkdir(outDir, { recursive: true });
  const fileName = options.compress === false
    ? `verificacao-recibo-${String(recibo.numero).replace(/[^A-Za-z0-9-]/g, "")}.pdf`
    : `recibo-${String(recibo.numero).replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
  const outPath = path.join(outDir, fileName);

  const doc = new PDFDocument({
    margin: 40,
    size: "A4",
    bufferPages: true,
    compress: options.compress !== false,
  });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const pageWidth = doc.page.width - left - doc.page.margins.right;
  const right = left + pageWidth;
  const hash = String(selado?.hash_at || recibo.hash_at || "");
  const atCode = String(selado?.at_validation_code || recibo.at_validation_code || "—");
  const cert = String(selado?.software_certification || recibo.software_certification || SOFTWARE_CERTIFICATION);
  const url = hash ? validationUrl({ numero: String(recibo.numero), hash }) : "";

  /** Marca de água diagonal — repetida em cada página. */
  const marcaDeAgua = () => {
    doc.save();
    doc.opacity(0.055).fillColor(COLORS.primary).fontSize(70).font("Helvetica-Bold");
    doc.rotate(-32, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.text(String(empresa.companyName || "Mais Mola").toUpperCase(), 60, doc.page.height / 2 - 40, {
      width: doc.page.width - 120,
      align: "center",
      lineBreak: false,
    });
    doc.restore();
  };
  const emissao = recibo.created_at || recibo.createdAt;
  const nomeCliente = String(recibo.customer_name || cliente.customerName || "—");

  // Geometria de página: a tabela de prestações nunca passa por cima do rodapé
  // — quando o espaço acaba abre-se página nova (ver paginação mais abaixo).
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  // O pdfkit abre uma página nova quando a linha SEGUINTE já não cabe, mesmo
  // depois de a última linha ter sido escrita — por isso o rodapé fica afastado
  // do limite (senão o recibo ganhava páginas em branco no fim).
  const contentBottom = pageBottom - 38; // reserva da faixa de rodapé fixa (2 linhas)
  const footerY = pageBottom - 22;

  /**
   * Nova página do recibo. Nas páginas de continuação repete-se a identificação
   * legal (número do recibo + mutuário) — exigência de rastreabilidade da AT.
   */
  const newPage = (continuacao: boolean) => {
    doc.addPage();
    marcaDeAgua();
    if (continuacao) {
      doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(9).text(
        `RECIBO DE PAGAMENTO N.º ${recibo.numero} — continuação`,
        left,
        40,
        { width: pageWidth, lineBreak: false }
      );
      doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7.5).text(
        `${nomeCliente} · NUIT ${recibo.customer_nuit || cliente.customerNuit || "—"}`,
        left,
        53,
        { width: pageWidth, lineBreak: false }
      );
      y = 70;
    } else {
      y = 56;
    }
  };

  // ── Cabeçalho: emitente + QR Code ──
  marcaDeAgua();
  doc.roundedRect(left, 40, pageWidth, 128, 10).fill(COLORS.lime);
  const logoPath = companyLogoPath(empresa.companyLogo);
  let textLeft = left + 14;
  if (logoPath) {
    try {
      doc.image(logoPath, textLeft, 56, { fit: [70, 58] });
      textLeft += 80;
    } catch { /* logotipo inválido — segue sem imagem */ }
  }
  const textWidth = pageWidth - (textLeft - left) - 132;
  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(15);
  doc.text(String(empresa.companyName || "Instituição de Microcrédito"), textLeft, 62, { width: textWidth });
  doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.dark);
  doc.text(`NUIT: ${empresa.companyNuit || "—"}`, textLeft, 84, { width: textWidth });
  doc.fillColor(COLORS.grey);
  doc.text(String(empresa.companyAddress || ""), textLeft, 96, { width: textWidth });
  doc.text(
    `Tel.: ${empresa.companyPhone || "—"}  ·  E-mail: ${empresa.companyEmail || "—"}`,
    textLeft,
    108,
    { width: textWidth }
  );
  doc.text(
    String(empresa.companyWebsite || "").replace(/^https?:\/\//, ""),
    textLeft,
    120,
    { width: textWidth }
  );

  // QR Code (maior, com moldura branca para leitura fiável em papel)
  const qrSize = 110;
  const qrX = right - qrSize - 12;
  const qrY = 46;
  const qrPath = selado?.qr_code_url
    ? path.join(process.cwd(), "uploads", String(selado.qr_code_url).replace(/^\//, ""))
    : null;
  doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10).fill("#ffffff");
  if (qrPath && fs.existsSync(qrPath)) {
    try { doc.image(qrPath, qrX, qrY, { width: qrSize, height: qrSize }); } catch { /* segue sem QR */ }
  } else {
    doc.rect(qrX, qrY, qrSize, qrSize).fill(COLORS.border);
    doc.fillColor(COLORS.grey).fontSize(7).text("QR indisponível", qrX, qrY + qrSize / 2 - 4, {
      width: qrSize,
      align: "center",
    });
  }
  doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text("Valide por QR Code", qrX - 8, qrY + qrSize + 3, {
    width: qrSize + 16,
    align: "center",
    lineBreak: false,
  });

  // ── Faixa de título ──
  const titleY = 176;
  doc.roundedRect(left, titleY, pageWidth, 46, 8).fill(COLORS.primary);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(15);
  doc.text("RECIBO DE PAGAMENTO", left + 14, titleY + 9, { width: pageWidth * 0.5, lineBreak: false });
  doc.fontSize(12).text(`N.º ${recibo.numero}`, left, titleY + 9, {
    width: pageWidth - 14,
    align: "right",
    lineBreak: false,
  });
  doc.font("Helvetica").fontSize(8.5);
  doc.text(`Data de emissão: ${fmtDateTimeMaputo(emissao)}`, left + 14, titleY + 28, {
    width: pageWidth * 0.7,
    lineBreak: false,
  });

  // ── Faixa do selo electrónico ──
  // A hash SHA-256 tem 64 caracteres: é impressa em DUAS linhas de 32, com a
  // etiqueta alinhada ao bloco — assim nunca é cortada nem empurra as restantes
  // linhas da faixa (era o defeito do layout anterior).
  const sealY = titleY + 54;
  const sealH = 54;
  doc.roundedRect(left, sealY, pageWidth, sealH, 8).fillAndStroke(COLORS.light, "#c8e6c9");
  doc.strokeColor("#c8e6c9").lineWidth(0.7);
  const labelX = left + 12;
  const labelW = 116;
  const sealValueX = left + 134;
  const sealValueW = pageWidth - 146;
  const hashParts = (hash || "—").match(/.{1,32}/g) || ["—"];
  doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(6.8);
  doc.text("HASH AT (SHA-256)", labelX, sealY + 8, { width: labelW, lineBreak: false });
  doc.fillColor(COLORS.dark).font("Courier-Bold").fontSize(6.6);
  hashParts.slice(0, 2).forEach((part, index) => {
    doc.text(part, sealValueX, sealY + 7 + index * 8, { width: sealValueW, lineBreak: false });
  });
  doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(6.8);
  doc.text("CÓDIGO DE VALIDAÇÃO", labelX, sealY + 26, { width: labelW, lineBreak: false });
  doc.fillColor(COLORS.dark).font("Courier").fontSize(6.8);
  doc.text(`${atCode}  ·  ${cert}`, sealValueX, sealY + 25, { width: sealValueW, lineBreak: false });
  doc.fillColor(COLORS.grey).font("Helvetica").fontSize(6.4);
  doc.text(url ? `Valide em ${url}` : "Validação por QR Code", labelX, sealY + 40, {
    width: pageWidth - 24,
    lineBreak: false,
  });

  // ── Cartões de dados ──
  let y = sealY + sealH + 2;

  const card = (height: number, options: { fill?: string; stroke?: string } = {}) => {
    doc.roundedRect(left, y, pageWidth, height, 8)
      .fillAndStroke(options.fill || "#ffffff", options.stroke || COLORS.border);
    doc.strokeColor(COLORS.border).lineWidth(0.7);
  };
  const cardTitle = (title: string) => {
    doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(8.5).text(title.toUpperCase(), left + 12, y + 9, {
      width: pageWidth - 24,
    });
    doc.moveTo(left + 12, y + 21).lineTo(right - 12, y + 21).strokeColor(COLORS.border).lineWidth(0.6).stroke();
  };
  const field = (label: string, value: string, x: number, fy: number, width: number, bold = false) => {
    doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text(label, x, fy, { width });
    doc.fillColor(COLORS.dark).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).text(value, x, fy + 9, { width });
  };

  // Cartão 1 — Mutuário (com avatar de iniciais)
  card(76);
  cardTitle("Mutuário");
  field("Nome", nomeCliente, left + 12, y + 30, pageWidth * 0.55, true);
  field("NUIT", String(recibo.customer_nuit || cliente.customerNuit || "—"), left + 12, y + 52, 120);
  field("Conta", String(recibo.customer_account || cliente.accountNumber || "—"), left + 150, y + 52, 120);
  field("Telefone", fmtPhone(cliente.customerPhone || cliente.phoneNumber || cliente.phone), left + 290, y + 52, 150);
  // Avatar
  const avatarX = right - 46;
  doc.circle(avatarX, y + 40, 18).fill(COLORS.light);
  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(12).text(initialsOf(nomeCliente), avatarX - 18, y + 34, {
    width: 36,
    align: "center",
  });
  y += 84;

  // Cartão 2 — Crédito e carteira de financiamento
  card(76);
  cardTitle("Crédito e carteira de financiamento");
  field("Crédito n.º", String(pick(credito, "id") || recibo.loanId || "—"), left + 12, y + 30, 100);
  field("Montante do crédito", fmtMoney(pick(credito, "amount")), left + 122, y + 30, 150, true);
  const taxaCredito = Number(pick(credito, "interestRate")) || 0;
  // A taxa gravada é a taxa do PERÍODO do plano (prestações mensais — sistema
  // francês), por isso o recibo identifica-a como "a.m." e não como "%" solto.
  const taxaTexto = taxaCredito ? `${(taxaCredito * 100).toFixed(2).replace(".", ",")}% a.m.` : "—";
  field("Taxa de juro", taxaTexto, left + 282, y + 30, 90);
  field("Data de desembolso", fmtDate(pick(credito, "disbursementDate")), left + 382, y + 30, 130);

  // Carteira de financiamento — badge colorida (ou estado honesto quando o
  // crédito é anterior às carteiras e ainda não foi classificado).
  doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text("Carteira de financiamento", left + 12, y + 52, {
    width: 220,
  });
  const badgeY = y + 61;
  if (carteira && carteira.codigo) {
    const badgeColor = WALLET_COLORS[String(carteira.cor_badge)] || WALLET_COLORS.blue;
    const badgeLabel = String(carteira.codigo);
    doc.font("Helvetica-Bold").fontSize(8);
    const badgeWidth = doc.widthOfString(badgeLabel) + 16;
    doc.roundedRect(left + 12, badgeY, badgeWidth, 14, 7).fill(badgeColor);
    doc.fillColor("#ffffff").text(badgeLabel, left + 12, badgeY + 4, { width: badgeWidth, align: "center" });
    doc.fillColor(COLORS.dark).font("Helvetica").fontSize(8);
    doc.text(String(carteira.nome || recibo.wallet_nome || ""), left + 20 + badgeWidth, badgeY + 3, {
      width: pageWidth - badgeWidth - 40,
    });
  } else {
    // Crédito anterior às carteiras: não é um erro do sistema — é o fundo
    // geral da instituição, identificado como LEGADO (badge cinza, sem o azul
    // "A CLASSIFICAR" que parecia uma falha e confundia o mutuário e a AT).
    const aviso = recibo.wallet_nome
      ? String(recibo.wallet_nome)
      : "Geral MBRM — crédito anterior às carteiras de financiamento";
    const legadoLabel = "LEGADO";
    doc.font("Helvetica-Bold").fontSize(7.5);
    const legadoW = doc.widthOfString(legadoLabel) + 16;
    doc.roundedRect(left + 12, badgeY, legadoW, 14, 7).fill("#e2e8f0");
    doc.fillColor("#475569").text(legadoLabel, left + 12, badgeY + 4, {
      width: legadoW,
      align: "center",
      lineBreak: false,
    });
    doc.fillColor(COLORS.grey).font("Helvetica").fontSize(8).text(aviso, left + 20 + legadoW, badgeY + 3, {
      width: pageWidth - legadoW - 44,
      lineBreak: false,
    });
  }
  y += 84;

  // Cartão 3 — Pagamento recebido (destacado). As três linhas de campos ficam
  // espaçadas de forma a que nenhum valor toque no rótulo seguinte (7pt).
  card(106, { fill: COLORS.lime, stroke: "#a5d6a7" });
  cardTitle("Pagamento recebido");
  doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text("Valor pago", left + 12, y + 26, { width: 200 });
  doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(16).text(fmtMoney(recibo.valor_pago), left + 12, y + 34, {
    width: 250,
  });
  field("Capital", fmtMoney(recibo.valor_capital), left + 280, y + 26, 110);
  field("Juros", fmtMoney(recibo.valor_juros), left + 395, y + 26, 110);
  field("Juros de mora", fmtMoney(recibo.valor_mora), left + 280, y + 50, 110);
  if (Number(recibo.valor_desconto) > 0) {
    field("Desconto", `- ${fmtMoney(recibo.valor_desconto)}`, left + 395, y + 50, 110);
  } else {
    field("Referência", String(recibo.referencia || "—"), left + 395, y + 50, 110);
  }
  const metodoDesc = String(recibo.metodo_pagamento_desc || recibo.metodo_pagamento || "—");
  field("Método de pagamento", metodoDesc, left + 12, y + 74, 265);
  doc.fillColor(COLORS.orange).font("Helvetica").fontSize(7).text("Saldo devedor após este pagamento", left + 285, y + 74, {
    width: 200,
  });
  doc.fillColor(COLORS.orange).font("Helvetica-Bold").fontSize(11).text(fmtMoney(recibo.saldo_restante), left + 285, y + 84, {
    width: 200,
  });
  y += 114;

  // ── Extrato do crédito — prestações pendentes ──
  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(9).text("EXTRATO DO CRÉDITO — PRESTAÇÕES PENDENTES", left, y, {
    width: pageWidth,
  });
  y += 15;

  const colX = [left + 6, left + 60, left + 150, left + 245, left + 330, left + 415];
  const colW = [54, 90, 95, 85, 85, 100];
  const LINE = 13;
  // Altura reservada ao fecho (total pendente + texto legal + assinaturas).
  const FECHO_H = 150;

  const drawTableHeader = () => {
    doc.roundedRect(left, y, pageWidth, 16, 4).fill(COLORS.primary);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
    doc.text("Prestação", colX[0], y + 5, { width: colW[0], lineBreak: false });
    doc.text("Vencimento", colX[1], y + 5, { width: colW[1], lineBreak: false });
    doc.text("Valor (MZN)", colX[2], y + 5, { width: colW[2], align: "right", lineBreak: false });
    doc.text("Pago (MZN)", colX[3], y + 5, { width: colW[3], align: "right", lineBreak: false });
    doc.text("Pendente (MZN)", colX[4], y + 5, { width: colW[4], align: "right", lineBreak: false });
    doc.text("Estado", colX[5], y + 5, { width: colW[5], align: "center", lineBreak: false });
    y += 16;
  };

  drawTableHeader();

  // ── Paginação do extrato ──
  // O extrato lista TODAS as prestações pendentes. Quando o espaço de uma
  // página acaba, abre-se a seguinte com o cabeçalho da tabela repetido — a
  // tabela nunca é cortada nem se sobrepõe ao rodapé legal.
  const CAP_CONTINUACAO = Math.max(1, Math.floor((contentBottom - 88) / LINE));
  const capPrimeiraCompleta = Math.max(1, Math.floor((contentBottom - y) / LINE));
  const capPrimeiraComFecho = Math.max(1, Math.floor((contentBottom - y - FECHO_H) / LINE));
  const capPrimeira =
    prestacoesPendentes.length <= capPrimeiraComFecho ? capPrimeiraComFecho : capPrimeiraCompleta;

  if (prestacoesPendentes.length === 0) {
    doc.fillColor(COLORS.grey).font("Helvetica").fontSize(8).text("Crédito sem prestações pendentes.", left + 6, y + 6);
    y += 22;
  } else {
    const hoje = moment().startOf("day");
    let capacidade = capPrimeira;
    let nestaPagina = 0;

    prestacoesPendentes.forEach((item, index) => {
      if (nestaPagina >= capacidade) {
        newPage(true);
        y = 72;
        drawTableHeader();
        capacidade = CAP_CONTINUACAO;
        nestaPagina = 0;
      }
      const pendente = Math.max(0, Number(item.installment) - Number(item.paidAmount || 0));
      const vencimento = moment(String(item.dueDate));
      const atraso = vencimento.isValid() && vencimento.isBefore(hoje);
      if (index % 2 === 1) doc.rect(left, y, pageWidth, LINE).fill(COLORS.zebra);
      doc.fillColor(COLORS.dark).font("Helvetica").fontSize(8);
      // `installmentOrder` vem da base já formatado ("2ª"); se vier um número,
      // acrescenta-se o ordinal — nunca deixar sair "NaNª" no recibo.
      const ordemBruta = (item as any).installmentOrder;
      const ordem =
        typeof ordemBruta === "string" && ordemBruta.trim() !== ""
          ? ordemBruta
          : `${Number(ordemBruta) || index + 1}ª`;
      doc.text(ordem, colX[0], y + 3, { width: colW[0], lineBreak: false });
      doc.text(fmtDate(item.dueDate), colX[1], y + 3, { width: colW[1], lineBreak: false });
      doc.text(fmtNumber(item.installment), colX[2], y + 3, { width: colW[2], align: "right", lineBreak: false });
      doc.text(fmtNumber(item.paidAmount), colX[3], y + 3, { width: colW[3], align: "right", lineBreak: false });
      doc
        .font("Helvetica-Bold")
        .text(fmtNumber(pendente), colX[4], y + 3, { width: colW[4], align: "right", lineBreak: false });
      const estado = atraso ? "Em atraso" : "Pendente";
      const cor = atraso ? COLORS.red : COLORS.amber;
      const w = doc.font("Helvetica-Bold").fontSize(6.8).widthOfString(estado) + 12;
      const badgeX = colX[5] + (colW[5] - w) / 2;
      doc.roundedRect(badgeX, y + 2.4, w, 9, 4.5).fill(atraso ? "#fdecea" : "#fef3c7");
      doc.fillColor(cor).text(estado, badgeX, y + 4.4, { width: w, align: "center", lineBreak: false });
      y += LINE;
      nestaPagina += 1;
    });
  }

  // ── Fecho: total pendente + rodapé legal + assinaturas ──
  // Se o fecho não couber depois da tabela, passa para uma página nova em vez
  // de se sobrepor ao texto legal (era o defeito do layout anterior).
  if (y + FECHO_H > contentBottom) {
    newPage(false);
  }

  y += 10;
  doc.roundedRect(left + pageWidth / 2, y, pageWidth / 2, 20, 6).fill(COLORS.light);
  doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(11).text(
    `Total pendente: ${fmtMoney(recibo.saldo_restante)}`,
    left + pageWidth / 2 + 10,
    y + 5,
    { width: pageWidth / 2 - 20, align: "right", lineBreak: false }
  );
  y += 34;

  doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text(
    "Recibo emitido electronicamente com numeração sequencial por empresa e ano, nos termos da legislação fiscal em vigor em " +
      "Moçambique (Autoridade Tributária de Moçambique — Regulamento de Facturação, Decreto n.º 22/2023 de 12 de Maio). " +
      "Este documento serve de comprovativo do pagamento identificado acima e não substitui a factura. " +
      `Hash de validação: ${hash || "—"}. Processado por computador. Software certificado: ${cert}.` +
      (url ? ` Valide este recibo em ${url} ou escaneie o QR Code.` : ""),
    left,
    y,
    { width: pageWidth, align: "justify", lineGap: 1.2 }
  );

  const sigY = Math.min(doc.y + 22, contentBottom - 30);
  doc.moveTo(left, sigY).lineTo(left + 190, sigY).strokeColor(COLORS.grey).lineWidth(0.6).stroke();
  doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text(
    `Assinatura / carimbo do emitente\n${fmtDateTimeMaputo(emissao)}`,
    left,
    sigY + 3,
    { width: 200 }
  );
  doc.moveTo(right - 190, sigY).lineTo(right, sigY).stroke();
  doc.text("Assinatura do mutuário\nData: ____ / ____ / ________", right - 190, sigY + 3, { width: 195 });

  // ── Faixa de rodapé fixa em TODAS as páginas (com Página X de Y) ──
  // Em duas linhas: uma única linha com todos os dados ultrapassava a largura
  // da página e era cortada nas margens.
  const range = doc.bufferedPageRange();
  const footerLines = (pagina: number) => [
    `${empresa.companyName || "MBRM"} · NUIT ${empresa.companyNuit || "—"} · Documento válido com QR Code e Hash AT · Sistema v2.0`,
    `${recibo.numero} · Hash: ${hash ? `${hash.slice(0, 24)}…` : "—"} · Emitido em ${fmtDateTimeMaputo(emissao)} · Página ${pagina} de ${range.count}`,
  ];
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.moveTo(left, footerY - 10).lineTo(right, footerY - 10).strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.fillColor("#9e9e9e").font("Helvetica").fontSize(6);
    footerLines(i - range.start + 1).forEach((linha, index) => {
      doc.text(linha, left, footerY - 8 + index * 9, {
        width: pageWidth,
        align: "center",
        lineBreak: false,
      });
    });
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return `/docs/${fileName}`;
};
