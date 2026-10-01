import fs from "fs";
import path from "path";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import moment from "moment";
import { Op, Transaction } from "sequelize";
import { db } from "../database/db";
import { AT_CERTIFICADO_ENABLED } from "../config/certificacao";
import { ReciboModel } from "../database/models/ReciboModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { FinancingWalletModel } from "../database/models/FinancingWalletModel";
import { AccountModel } from "../database/models/AccountModel";
import { AuditLogModel } from "../database/models/paymentsV2Models";

/**
 * RECIBOS — NUMERAÇÃO SEQUENCIAL LEGAL (AUTORIDADE TRIBUTÁRIA DE MOÇAMBIQUE)
 * ------------------------------------------------------------------------
 * Requisitos implementados:
 *  · uma série por empresa/ano (formato `REC-AAAA-00001`);
 *  · sequência SEM SALTOS: o contador é reservado dentro de uma transacção com
 *    `SELECT ... FOR UPDATE` e só é incrementado se o recibo for realmente
 *    gravado (ROLLBACK devolve o número — não abre buraco na numeração legal);
 *  · SELO ELECTRÓNICO: hash SHA-256 dos dados do recibo + código de validação +
 *    QR Code que abre a página pública de validação (`/validar`) — calculados e
 *    gravados na BD SEMPRE; a APRESENTAÇÃO no PDF depende da feature flag
 *    AT_CERTIFICADO_ENABLED (config/certificacao.ts — TODO AT: ativar quando
 *    tiver Certificado AT 2026/001);
 *  · um recibo por pagamento individual, com capital, juros, mora e desconto
 *    discriminados;
 *  · PDF moderno com identificação do emitente (logotipo + NUIT), dados do
 *    cliente, carteira de financiamento, decomposição do pagamento, extrato das
 *    prestações pendentes e rodapé legal. Os elementos do selo AT (QR, hash,
 *    código, link de validação, texto do Decreto n.º 22/2023) só são impressos
 *    com AT_CERTIFICADO_ENABLED=true — ver config/certificacao.ts.
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
 * Data/hora de emissão no fuso de Moçambique (UTC+2 fixo — não depende do
 * fuso configurado no servidor). O fuso NUNCA aparece no texto: o mutuário
 * lê "01/10/2026 13:54", sem "(África/Maputo)".
 */
const MAPUTO_UTC_OFFSET_MIN = 120;
const fmtDateTimeMaputo = (value: any): string => {
  if (!value) return "—";
  const parsed = value instanceof Date ? moment.utc(value) : moment.utc(String(value));
  if (!parsed.isValid()) return String(value);
  return parsed.utcOffset(MAPUTO_UTC_OFFSET_MIN).format("DD/MM/YYYY HH:mm");
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
 *
 * NOTA (feature flag AT): o selo é calculado e gravado na BD SEMPRE — mesmo
 * com AT_CERTIFICADO_ENABLED=false. A flag controla apenas se os elementos
 * aparecem no PDF (ver renderReciboPdf) — quando a licença chegar, os recibos
 * passam a mostrá-los sem regenerar nada no banco de dados.
 */
export const ensureReciboSeal = async (reciboId: number, force = false, transaction?: Transaction | null): Promise<any> => {
  const recibo: any = (await ReciboModel.findByPk(reciboId, { raw: true, ...(transaction ? { transaction } : {}) })) as any;
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
    { where: { id: reciboId }, ...(transaction ? { transaction } : {}) }
  );

  return (await ReciboModel.findByPk(reciboId, { raw: true, ...(transaction ? { transaction } : {}) })) as any;
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
export const getReciboDetalhe = async (id: number, transaction?: Transaction | null): Promise<ReciboDetalhe | null> => {
  const recibo: any = await ReciboModel.findByPk(id, { raw: true, ...(transaction ? { transaction } : {}) });
  if (!recibo) return null;

  const companyId = Number(recibo.companyId);
  const empresa: any = (await CompanyModel.findByPk(companyId, { raw: true, ...(transaction ? { transaction } : {}) })) || {};
  const cliente: any = recibo.customerId
    ? (await CustomerModel.findByPk(Number(recibo.customerId), { raw: true, ...(transaction ? { transaction } : {}) })) || {}
    : {};
  const credito: any = recibo.loanId
    ? (await LoanModel.findByPk(Number(recibo.loanId), { raw: true, ...(transaction ? { transaction } : {}) })) || {}
    : {};
  const carteira: any = recibo.walletId
    ? (await FinancingWalletModel.findByPk(Number(recibo.walletId), { raw: true, ...(transaction ? { transaction } : {}) })) || {}
    : {};

  let prestacoesPendentes: any[] = [];
  if (recibo.loanId) {
    prestacoesPendentes = (await AmorizationLoanModel.findAll({
      where: { loanId: Number(recibo.loanId), status: { [Op.in]: [0, -1] } },
      order: [["dueDate", "ASC"], ["id", "ASC"]],
      raw: true,
      ...(transaction ? { transaction } : {}),
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

// ─────────────────────────────────────────────────────────────────────────────
// EMISSÃO ATÓMICA — DENTRO DA TRANSACTION DO PAGAMENTO
// ---------------------------------------------------------------------------
// REGRA DE OURO: recibo é documento fiscal. O pagamento só existe com o seu
// recibo: numeração reservada com FOR UPDATE, selo (hash/QR) e PDF gerados
// dentro da MESMA transaction — se o PDF falhar, o pagamento inteiro sofre
// rollback (nunca há pagamento sem recibo nem recibo sem pagamento).
// ---------------------------------------------------------------------------

export type ReciboEmitido = {
  id: number;
  numero: string;
  hash: string;
  pdf_url: string;
  qr_url: string | null;
  at_validation_code: string | null;
};

/**
 * Emite o recibo legal do pagamento DENTRO da transaction indicada.
 * Chamado por addTranzaction com a transaction `t` do pagamento.
 * Lança em qualquer falha → rollback total do pagamento.
 */
export const emitReciboInTransaction = async (params: {
  tranzactionId: number;
  companyId: number;
  createdBy?: number | null;
  ip?: string | null;
  transaction: Transaction;
}): Promise<ReciboEmitido> => {
  const { tranzactionId, companyId, transaction } = params;

  // Idempotência: um recibo por tranzaction (mesmo dentro da transaction).
  const existing: any = await ReciboModel.findOne({
    where: { tranzactionId, companyId },
    transaction,
  });
  if (existing) {
    const selado = await ensureReciboSeal(Number(existing.getDataValue("id")), false, transaction);
    return {
      id: Number(existing.getDataValue("id")),
      numero: String(existing.getDataValue("numero")),
      hash: String(selado?.hash_at || existing.getDataValue("hash_at") || ""),
      pdf_url: String(existing.getDataValue("pdf_url") || ""),
      qr_url: (existing.getDataValue("qr_code_url") as string) || null,
      at_validation_code: (existing.getDataValue("at_validation_code") as string) || null,
    };}

  // A tranzaction foi criada NA MESMA transaction do pagamento — a leitura
  // tem de usar essa conexão (sem isto, findByPk noutra conexão devolveria
  // null para a linha ainda não committada).
  const tranzaction: any = await TranzactionModel.findByPk(tranzactionId, { raw: true, transaction });
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
  const effectiveWalletId = Number(tranzaction.walletId) || Number(loan.walletId) || null;
  const wallet: any = effectiveWalletId
    ? (await FinancingWalletModel.findByPk(Number(effectiveWalletId), { raw: true })) || {}
    : {};

  const valorPago = round2(Number(tranzaction.amount) || 0);
  const valorJuros = round2(Number(tranzaction.interestRateAmount) || 0);
  const valorMora = round2(Number(tranzaction.mora_amount) || Number(tranzaction.latePaymentInterest) || 0);
  const valorDesconto = round2(Number(tranzaction.discountAmount) || 0);
  const valorCapital = round2(Math.max(0, valorPago - valorJuros));

  let saldoRestante = 0;
  if (tranzaction.loanId) {
    const pendentes: any[] = (await AmorizationLoanModel.findAll({
      where: { loanId: Number(tranzaction.loanId), status: { [Op.in]: [0, -1] } },
      attributes: ["installment", "paidAmount"],
      raw: true,
      transaction,
    })) as any[];
    saldoRestante = round2(
      pendentes.reduce((total, item) => total + Math.max(0, Number(item.installment) - Number(item.paidAmount || 0)), 0)
    );
  }

  const metodo = await resolvePaymentMethod(tranzaction.paymentMethod, Number(companyId));
  const ano = Number(moment(tranzaction.paymentDate || undefined).year()) || new Date().getFullYear();
  const serie = "REC";

  // 1) Número sequencial legal — FOR UPDATE dentro da MESMA transaction.
  const { sequencia, numero } = await reserveSequence(transaction, Number(companyId), ano, serie);

  // 2) Registo do recibo (ainda sem hash/pdf — entram em seguida).
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
      status: "EMITIDO",
    },
    { transaction }
  );
  const reciboId = Number(created.getDataValue("id"));

  // 3) Selo electrónico (hash + QR + código AT) — na mesma transaction.
  const selado = await ensureReciboSeal(reciboId, false, transaction);

  // 4) PDF (pdfkit) — na mesma transaction. Falha → rollback do pagamento.
  const pdfUrl = await renderReciboPdf(reciboId, { transaction });
  if (!pdfUrl) throw new Error("Falha ao gerar o PDF do recibo.");
  await ReciboModel.update({ pdf_url: pdfUrl }, { where: { id: reciboId }, transaction });

  // 5) Auditoria da emissão (userId + ip do pedido) — mesma transaction.
  try {
    await AuditLogModel.create(
      {
        user_id: params.createdBy ?? null,
        company_id: Number(companyId),
        ip: params.ip || null,
        action: "RECIBO_EMIT",
        entity: "recibos",
        entity_id: reciboId,
        before_data: null,
        after_data: {
          numero,
          tranzactionId,
          valor: valorPago,
          hash: String(selado?.hash_at || ""),
          pdf_url: pdfUrl,
        },
      },
      { transaction }
    );
  } catch { /* audit nunca bloqueia o recibo */ }

  return {
    id: reciboId,
    numero,
    hash: String(selado?.hash_at || ""),
    pdf_url: pdfUrl,
    qr_url: (selado?.qr_code_url as string) || null,
    at_validation_code: (selado?.at_validation_code as string) || null,
  };
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
  primaryDark: "#1a3c2a",
  light: "#eef6f0",
  lime: "#f1f8e9",
  border: "#e0e0e0",
  orange: "#ef6c00",
  red: "#c62828",
  amber: "#b45309",
  grey: "#757575",
  dark: "#1f2937",
  zebra: "#f7faf8",
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
  // `transaction` quando o PDF é gerado DENTRO da transacção do pagamento —
  // o recibo ainda não foi committado, por isso as leituras têm de usar a
  // MESMA conexão (senão findByPk noutra conexão devolveria null).
  options: { compress?: boolean; transaction?: Transaction | null } = {}
): Promise<string | null> => {
  const tx = options.transaction || null;
  const selado = await ensureReciboSeal(reciboId, false, tx);
  const detalhe = await getReciboDetalhe(reciboId, tx);
  if (!detalhe) return null;
  const { recibo, empresa, cliente, credito, carteira, prestacoesPendentes } = detalhe;
  if (!recibo) return null;

  const companyId = Number(recibo.companyId);
  const outDir = docsDir();
  await fs.promises.mkdir(outDir, { recursive: true });
  // Sufixo de revisão do layout (`-r2`): ao mudar o desenho do recibo, os
  // pdf_url gravados na BD deixam de apontar para ficheiros existentes — assim
  // TODOS os recibos já emitidos são regenerados UMA vez com o layout actual
  // (na primeira descarga ou no job de arranque), sem consumir numeração.
  const fileName = options.compress === false
    ? `verificacao-recibo-${String(recibo.numero).replace(/[^A-Za-z0-9-]/g, "")}.pdf`
    : `recibo-${String(recibo.numero).replace(/[^A-Za-z0-9-]/g, "")}-r3.pdf`;
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
  // TODO AT: Ativar quando tiver Certificado AT 2026/001
  // O selo (hash, código, QR, link) é SEMPRE calculado e gravado na BD — a flag
  // controla apenas se APARECE no PDF apresentado ao mutuário.
  const mostrarSelo = AT_CERTIFICADO_ENABLED;

  /** Marca de água diagonal — repetida em cada página (bem clara, não estorva a leitura). */
  const marcaDeAgua = () => {
    doc.save();
    doc.opacity(0.03).fillColor(COLORS.primary).fontSize(70).font("Helvetica-Bold");
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
   * legal (mini logo + número do recibo + mutuário) — a página 2 nunca é
   * "órfã": identifica o documento mesmo destacada do resto.
   */
  const newPage = (continuacao: boolean) => {
    doc.addPage();
    marcaDeAgua();
    if (continuacao) {
      let miniX = left;
      const miniLogo = logoPath;
      if (miniLogo) {
        try {
          doc.image(miniLogo, left, 40, { fit: [26, 26] });
          miniX = left + 32;
        } catch { /* logotipo inválido — segue sem imagem */ }
      }
      doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(9).text(
        `RECIBO DE PAGAMENTO N.º ${recibo.numero} — continuação`,
        miniX,
        40,
        { width: pageWidth - (miniX - left), lineBreak: false }
      );
      doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7.5).text(
        `${nomeCliente} · NUIT ${recibo.customer_nuit || cliente.customerNuit || "—"}`,
        miniX,
        53,
        { width: pageWidth - (miniX - left), lineBreak: false }
      );
      y = 70;
    } else {
      y = 56;
    }
  };

  // ── Cabeçalho: emitente (+ QR Code quando há selo AT) ──
  // Sem selo AT o cabeçalho é mais compacto (110pt em vez de 128) — ganha-se
  // espaço para a tabela do extrato na página 1.
  const headerH = mostrarSelo ? 128 : 110;
  marcaDeAgua();
  doc.roundedRect(left, 40, pageWidth, headerH, 10).fill(COLORS.lime);
  const logoPath = companyLogoPath(empresa.companyLogo);
  let textLeft = left + 14;
  if (logoPath) {
    try {
      doc.image(logoPath, textLeft, 56, { fit: [70, 58] });
      textLeft += 80;
    } catch { /* logotipo inválido — segue sem imagem */ }
  }
  // TODO AT: Com o selo activo, um ficheiro nomeado "qr" em uploads/img é
  // embutido no PDF. Sem selo AT, um PNG transparente "mbr-mark.png" nessa
  // pasta aparece como marca d'água leve no canto superior direito (sem QR).
  // Sem selo AT, o texto do cabeçalho ocupa toda a largura (não há QR à direita).
  const textWidth = pageWidth - (textLeft - left) - (mostrarSelo ? 132 : 14);
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

  // Marca d'água leve no canto superior direito (substitui o QR quando a
  // certificação AT está desligada).
  if (!mostrarSelo) {
    const markPath = path.join(process.cwd(), "uploads", "img", "mbr-mark.png");
    if (fs.existsSync(markPath)) {
      try {
        doc.opacity(0.1).image(markPath, right - 78, 48, { width: 66, height: 66 });
        doc.opacity(1);
      } catch { /* marca opcional — segue sem ela */ }
    }
  }

  // ── QR Code de validação ──
  // TODO AT: Ativar quando tiver Certificado AT 2026/001 — o QR é gerado e
  // gravado em uploads/recibos sempre, mas só é impresso com a flag AT activa.
  if (mostrarSelo) {
    // QR maior, com moldura branca para leitura fiável em papel.
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
  }

  // ── Faixa de título ──
  const titleY = mostrarSelo ? 176 : 158;
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
  // TODO AT: Ativar quando tiver Certificado AT 2026/001 — hash, código de
  // validação e link de validação ficam gravados na BD mas só são impressos
  // quando AT_CERTIFICADO_ENABLED=true.
  let sealY = titleY + 54;
  if (mostrarSelo) {
    // A hash SHA-256 tem 64 caracteres: é impressa em DUAS linhas de 32, com a
    // etiqueta alinhada ao bloco — assim nunca é cortada nem empurra as restantes
    // linhas da faixa (era o defeito do layout anterior).
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
    sealY += sealH;
  }

  // ── Cartões de dados ──
  let y = sealY + 2;

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

  // Cartão 1 — Mutuário (nome em largura total; SEM avatar de iniciais —
  // removido a pedido: o recibo legal não precisa de avatar e o retrato do
  // mutuário é o logotipo institucional no cabeçalho). Linha de endereço
  // quando o mutuário o tem registado.
  card(92);
  cardTitle("Mutuário");
  field("Nome", nomeCliente, left + 12, y + 30, pageWidth - 24, true);
  field("NUIT", String(recibo.customer_nuit || cliente.customerNuit || "—"), left + 12, y + 52, 120);
  field("Conta", String(recibo.customer_account || cliente.accountNumber || "—"), left + 150, y + 52, 120);
  field("Telefone", fmtPhone(cliente.customerPhone || cliente.phoneNumber || cliente.phone), left + 290, y + 52, 150);
  const enderecoMutuario = [
    String(cliente.customerAddress || "").trim(),
    String(cliente.customerBairro || "").trim(),
  ].filter(Boolean).join(" — ");
  field("Endereço", enderecoMutuario || "—", left + 12, y + 72, pageWidth - 24);
  y += 100;

  // Cartão 2 — Crédito e carteira de financiamento
  card(76);
  cardTitle("Crédito e carteira de financiamento");
  // Isenção de IVA (operações de microcrédito) — no canto direito do título.
  doc.fillColor(COLORS.grey).font("Helvetica").fontSize(6.8)
    .text("Isento de IVA — art. 9.º do CIVA (código do IVA: 4)", left, y + 10, {
      width: pageWidth - 12,
      align: "right",
      lineBreak: false,
    });
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

  // Cartão 3 — Pagamento recebido (destacado). Valor pago em tipo grande
  // (#1a3c2a), breakdown à direita — hierarquia visual em vez de verde claro.
  card(106, { fill: mostrarSelo ? COLORS.lime : "#f4f9f5", stroke: mostrarSelo ? "#a5d6a7" : "#cfe3d5" });
  cardTitle("Pagamento recebido");
  doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text("Valor pago", left + 12, y + 22, { width: 200 });
  // 20px bold (era 32 — estourava o cartão com valores altos). Continua
  // destacado em #1a3c2a, sem colidir com o breakdown à direita.
  doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(20).text(fmtMoney(recibo.valor_pago), left + 12, y + 31, {
    width: 260,
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
  doc.fillColor(Number(recibo.saldo_restante) > 0 ? COLORS.orange : COLORS.primaryDark)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(fmtMoney(recibo.saldo_restante), left + 285, y + 84, {
      width: 200,
    });
  y += 114;

  // ── Extrato do crédito — prestações pendentes ──
  // PAGINAÇÃO INTELIGENTE — MÁXIMO 2 PÁGINAS:
  //   · ≤6 prestações → tudo na página 1 (com fecho);
  //   · 7..24 → página 1 com início do extrato, página 2 com o resto + fecho;
  //   · >24 (ex.: 36x) → modo COMPACTO (fonte 7.5, linhas de 11pt) para caber
  //     sempre em 2 páginas. Nunca há 3ª página nem página órfã de assinaturas.
  const totalPrestacoes = prestacoesPendentes.length;
  const compacto = totalPrestacoes > 24;
  const LINE = compacto ? 11 : 14; // altura de linha da tabela
  const fonteTabela = compacto ? 7.5 : 8;

  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(9).text(
    totalPrestacoes > 0
      ? `EXTRATO DO CRÉDITO — PRESTAÇÕES PENDENTES (${totalPrestacoes} prestações)`
      : "EXTRATO DO CRÉDITO — PRESTAÇÕES PENDENTES",
    left,
    y,
    { width: pageWidth }
  );
  y += 15;

  const colX = [left + 6, left + 60, left + 150, left + 245, left + 330, left + 415];
  const colW = [54, 90, 95, 85, 85, 100];
  // Altura reservada ao fecho (total pendente + assinaturas; + texto legal AT).
  const FECHO_H = mostrarSelo ? 150 : 95;

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

  // Capacidades por página (linhas): página 1 deve deixar FECHO_H se a tabela
  // couber toda; senão DIVIDE ao meio (ex.: 18 prestações → ~9 + 9) garantindo
  // que o resto cabe na página 2 com espaço para o fecho — nunca há 3ª página.
  const CAP_P1_COM_FECHO = Math.max(1, Math.floor((contentBottom - y - FECHO_H) / LINE));
  const CAP_P1 = Math.max(1, Math.floor((contentBottom - y) / LINE));
  // Página 2: mini-cabeçalho + header da tabela + linha "Mostrando…" + fecho.
  const CAP_P2 = Math.max(1, Math.floor((contentBottom - (mostrarSelo ? 150 : 86)) / LINE));
  const metade = Math.ceil(totalPrestacoes / 2);
  let capPrimeira: number;
  if (totalPrestacoes <= CAP_P1_COM_FECHO) {
    capPrimeira = CAP_P1_COM_FECHO;
  } else {
    // Divide balanceado; garante resto ≤ CAP_P2 e ≥1 linha em cada página.
    capPrimeira = Math.min(CAP_P1, metade);
    capPrimeira = Math.max(capPrimeira, Math.min(totalPrestacoes - 1, totalPrestacoes - CAP_P2));
    capPrimeira = Math.min(capPrimeira, totalPrestacoes - 1);
  }

  drawTableHeader();

  if (totalPrestacoes === 0) {
    // Badge de crédito liquidado — em vez de texto solto em tabela vazia.
    const liquidado = "Crédito liquidado — sem prestações pendentes";
    const badgeW = doc.font("Helvetica-Bold").fontSize(8).widthOfString(liquidado) + 30;
    doc.roundedRect(left + 6, y + 2, badgeW, 18, 9).fill("#e3f2e8");
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(8)
      .text(liquidado, left + 6, y + 7, { width: badgeW, align: "center", lineBreak: false });
    y += 26;
  } else {
    const hoje = moment().startOf("day");
    let capacidade = capPrimeira;
    let nestaPagina = 0;
    let imprimidas = 0;

    prestacoesPendentes.forEach((item, index) => {
      if (nestaPagina >= capacidade) {
        // Quebra para a página 2 com mini-cabeçalho MBR (nunca página órfã).
        newPage(true);
        y = 72;
        drawTableHeader();
        capacidade = CAP_P2;
        nestaPagina = 0;
        // Contador de progresso do extrato (ex.: "Mostrando 1-12 de 18").
        doc.fillColor(COLORS.grey).font("Helvetica").fontSize(6.8)
          .text(`Mostrando 1–${imprimidas} de ${totalPrestacoes} — continuação na página 2`, left, y + 1, {
            width: pageWidth,
            align: "right",
            lineBreak: false,
          });
        y += 10;
      }
      const pendente = Math.max(0, Number(item.installment) - Number(item.paidAmount || 0));
      const vencimento = moment(String(item.dueDate));
      const atraso = vencimento.isValid() && vencimento.isBefore(hoje);
      if (index % 2 === 1) doc.rect(left, y, pageWidth, LINE).fill(COLORS.zebra);
      doc.fillColor(COLORS.dark).font("Helvetica").fontSize(fonteTabela);
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
      imprimidas += 1;
    });

    // Rodapé do extrato na página onde a tabela termina ("Mostrando 1–X de Y").
    doc.fillColor(COLORS.grey).font("Helvetica").fontSize(6.8)
      .text(`Mostrando 1–${imprimidas} de ${totalPrestacoes}`, left, y + 3, {
        width: pageWidth,
        align: "right",
        lineBreak: false,
      });
    y += 14;
  }

  // ── Fecho: total pendente + (texto legal AT) + assinaturas ──
  // O fecho vai SEMPRE na página onde a tabela termina se couber; senão abre-se
  // a página 2 (máximo absoluto do documento — a capacidade CAP_P2 da tabela
  // já reserva espaço para este bloco). Sem 3ª página, sem página órfã.
  if (y + FECHO_H > contentBottom + 8) {
    if (doc.bufferedPageRange().count === 1) {
      newPage(false);
      y = 56;
    } else {
      y = Math.min(y, contentBottom - 40); // 2 páginas é o limite — encaixa
    }
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

  // TODO AT: Ativar quando tiver Certificado AT 2026/001 — o texto legal do
  // Decreto n.º 22/2023, a hash e o link de validação só entram no documento
  // quando a instituição tiver o certificado AT.
  let sigY: number;
  if (mostrarSelo) {
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
    sigY = Math.min(doc.y + 22, contentBottom - 30);
  } else {
    sigY = y + 14;
  }
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
  // A última página fecha o documento ("Documento processado por computador…");
  // as anteriores indicam continuação ("Continua na página seguinte").
  const range = doc.bufferedPageRange();
  const footerLines = (pagina: number) => {
    const ultima = pagina === range.count;
    const continuidade = ultima ? "Documento processado por computador" : "Continua na página seguinte";
    if (mostrarSelo) {
      return [
        `${empresa.companyName || "MBRM"} · NUIT ${empresa.companyNuit || "—"} · Documento válido com QR Code e Hash AT · Sistema v2.0.9`,
        `${recibo.numero} · Hash: ${hash ? `${hash.slice(0, 24)}…` : "—"} · Emitido em ${fmtDateTimeMaputo(emissao)} · ${continuidade} · Página ${pagina}/${range.count}`,
      ];
    }
    return [
      `${empresa.companyName || "MBRM"} · NUIT ${empresa.companyNuit || "—"} · ${continuidade} — MBR Microcrédito — Sistema v2.0.9 · Página ${pagina}/${range.count}`,
      `${recibo.numero} · Emitido em ${fmtDateTimeMaputo(emissao)}`,
    ];
  };
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
