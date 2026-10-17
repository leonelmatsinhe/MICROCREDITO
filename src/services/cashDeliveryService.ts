/**
 * COMPROVATIVO DE ENTREGA DE VALORES AO COFRE CENTRAL
 * ---------------------------------------------------------------------------
 * Documento PDF próprio (A4) para os movimentos ENTREGA_COFRE (entrega do
 * excedente do operador ao Tesoureiro/Cofre Central, com comprovativo assinado
 * nos termos da circular do Banco de Moçambique). Substitui o mero texto na
 * descrição do movimento por um documento com:
 *
 *   - número próprio (CE-<ano>-<id>);
 *   - selo electrónico: hash SHA-256 dos dados + segredo da empresa;
 *   - QR Code com os dados legíveis + URL pública de validação;
 *   - espaço para Assinatura do Operador e do Tesoureiro.
 *
 * O PDF é determinístico (gerado on-demand a partir do movimento imutável) —
 * não ocupa disco nem exige colunas novas. TERMINOLOGIA: nunca "sangria".
 */
import crypto from "crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { CashMovementModel } from "../database/models/CashMovementModel";
import { CashRegisterModel } from "../database/models/CashRegisterModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { UserModel } from "../database/models/UserModel";

/** Categoria oficial documentada por este comprovativo. */
export const CASH_DELIVERY_CATEGORY = "ENTREGA_COFRE";

/** Chave privada usada no hash — nunca vai para o documento. */
const hashSecret = (): string =>
  String(process.env.RECIBO_HASH_SECRET || process.env.APP_SECRET || "MBRM-COFRE-2026");

/** Número do documento: CE-<ano>-<id do movimento>. */
export const comprovativoNumero = (movement: any): string => {
  const ano = new Date(movement?.createdAt || Date.now()).getFullYear();
  const id = String(movement?.id || 0).padStart(5, "0");
  return `CE-${ano}-${id}`;
};

/** SHA-256 dos dados da entrega + segredo da empresa (não reversível). */
export const buildComprovativoHash = (input: {
  companyId: number;
  movementId: number;
  numero: string;
  valor: number;
  dataISO: string;
}): string => {
  const payload = [
    String(input.companyId),
    String(input.movementId),
    input.numero,
    Number(input.valor || 0).toFixed(2),
    input.dataISO,
    hashSecret(),
  ].join("|");
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
};

/** URL pública de validação (a mesma que o QR Code abre). */
export const comprovativoValidationUrl = (params: { numero: string; hash: string }): string => {
  const base =
    process.env.PUBLIC_VALIDATION_URL ||
    process.env.PUBLIC_BASE_URL ||
    "https://maismola.co.mz";
  const clean = String(base).replace(/\/+$/, "");
  return `${clean}/validar?entrega=${encodeURIComponent(params.numero)}&hash=${encodeURIComponent(params.hash)}`;
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
  ["MBRM", params.nuit, params.numero, params.data, Number(params.valor || 0).toFixed(2), params.hash, params.url].join(
    "*"
  );

const fmtMZN = (value: number): string =>
  `${(Number(value) || 0).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MZN`;

const fmtDate = (value: any): string => {
  const d = new Date(value || Date.now());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Carrega a entrega (movimento ENTREGA_COFRE) ou lança erro de negócio. */
const loadDelivery = async (movementId: number, companyId: number): Promise<any> => {
  const movement: any = await CashMovementModel.findOne({
    where: { id: movementId, companyId },
  });
  if (!movement) {
    throw { code: "NOT_FOUND", message: "Movimento de caixa não encontrado." };
  }
  if (
    String(movement.getDataValue("category")) !== CASH_DELIVERY_CATEGORY ||
    String(movement.getDataValue("type")) !== "SAIDA"
  ) {
    throw {
      code: "INVALID_CATEGORY",
      message: "O comprovativo só é emitido para entregas de valores ao Cofre Central (ENTREGA_COFRE).",
    };
  }
  return movement;
};

/** Dados selados do comprovativo (numero + hash + URL + conteúdo do QR). */
export const buildComprovativoSeal = async (
  movementId: number,
  companyId: number
): Promise<{ movement: any; numero: string; hash: string; url: string; qrContent: string }> => {
  const movement = await loadDelivery(movementId, companyId);
  const empresa: any = ((await CompanyModel.findByPk(companyId, { raw: true })) as any) || {};
  const numero = comprovativoNumero(movement);
  const dataISO = new Date(movement.getDataValue("createdAt") || Date.now()).toISOString().slice(0, 10);
  const hash = buildComprovativoHash({
    companyId,
    movementId,
    numero,
    valor: Number(movement.getDataValue("amount")) || 0,
    dataISO,
  });
  const url = comprovativoValidationUrl({ numero, hash });
  const qrContent = buildQrContent({
    nuit: String(empresa.companyNuit || ""),
    numero,
    data: fmtDate(movement.getDataValue("createdAt")),
    valor: Number(movement.getDataValue("amount")) || 0,
    hash,
    url,
  });
  return { movement, numero, hash, url, qrContent };
};

/**
 * Valida um comprovativo (endpoint público do QR Code).
 * Aceita `numero` + `hash` e recompõe o hash a partir do movimento gravado.
 */
export const validateComprovativo = async (params: {
  numero?: string;
  hash?: string;
  movementId?: number;
}): Promise<any> => {
  const numero = String(params.numero || "").trim();
  const hash = String(params.hash || "").trim().toLowerCase();
  if (!hash) {
    throw { code: "INVALID_HASH", message: "Hash de validação em falta." };
  }

  // CE-<ano>-<id> → id do movimento (ou movementId explícito).
  let movementId = Number(params.movementId) || 0;
  if (!movementId && /^CE-\d{4}-\d+$/.test(numero)) {
    movementId = Number(numero.split("-")[2]);
  }
  if (!movementId) {
    return { valid: false, numero: numero || null, message: "Número de comprovativo inválido." };
  }

  const movement: any = await CashMovementModel.findOne({ where: { id: movementId } });
  if (!movement) {
    return { valid: false, numero: numero || null, message: "Comprovativo não encontrado." };
  }

  const companyId = Number(movement.getDataValue("companyId"));
  const seal = await buildComprovativoSeal(movementId, companyId);
  const expected = seal.hash;
  const valid =
    hash.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(hash, "utf8"), Buffer.from(expected, "utf8")) &&
    (!numero || numero === seal.numero);

  return {
    valid,
    numero: seal.numero,
    data: fmtDate(movement.getDataValue("createdAt")),
    valor: Number(movement.getDataValue("amount")) || 0,
    descricao: movement.getDataValue("description") || "",
    message: valid
      ? "Comprovativo válido — entrega de valores ao Cofre Central registada."
      : "Comprovativo inválido — os dados não conferem com o registo.",
  };
};

/**
 * Gera o PDF do Comprovativo de Entrega de Valores ao Cofre Central (A4).
 * Devolve o buffer + o selo (numero/hash/url) para o controlador enviar.
 */
export const generateComprovativoPdf = async (
  movementId: number,
  companyId: number
): Promise<{ buffer: Buffer; numero: string; hash: string; url: string }> => {
  const { movement, numero, hash, url, qrContent } = await buildComprovativoSeal(movementId, companyId);
  const empresa: any = ((await CompanyModel.findByPk(companyId, { raw: true })) as any) || {};
  const register: any = await CashRegisterModel.findOne({
    where: { id: Number(movement.getDataValue("cashRegisterId")) || 0 },
    raw: true,
  });
  const operador: any = await UserModel.findOne({
    where: { id: Number(movement.getDataValue("userId")) || 0 },
    attributes: ["id", "name"],
    raw: true,
  });

  const valor = Number(movement.getDataValue("amount")) || 0;
  const dataEntrega = movement.getDataValue("createdAt");

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // ── Cabeçalho institucional ──
  doc.fontSize(14).font("Helvetica-Bold").text(String(empresa.companyName || "MBR Microcrédito"), { align: "center" });
  if (empresa.companyNuit) {
    doc.fontSize(9).font("Helvetica").text(`NUIT: ${empresa.companyNuit}`, { align: "center" });
  }
  doc.moveDown(0.8);
  doc.fontSize(13).font("Helvetica-Bold").text("COMPROVATIVO DE ENTREGA DE VALORES AO COFRE CENTRAL", {
    align: "center",
  });
  doc.fontSize(9).font("Helvetica").text(`Documento nº ${numero}`, { align: "center" });
  doc.moveDown(1.2);

  // ── Corpo: dados da entrega ──
  const row = (label: string, value: string) => {
    doc.fontSize(10).font("Helvetica-Bold").text(`${label}: `, { continued: true });
    doc.font("Helvetica").text(value);
    doc.moveDown(0.35);
  };
  row("Data", fmtDate(dataEntrega));
  row("Operador (entregou)", operador?.name ? `${operador.name}` : "—");
  row("Recebido por (Tesoureiro/Cofre)", "______________________________");
  row("Valor entregue", fmtMZN(valor));
  row("Descrição", String(movement.getDataValue("description") || "—"));
  row("Registo", `Movimento de caixa #${movement.getDataValue("id")} · Caixa #${movement.getDataValue("cashRegisterId") || "—"}`);
  row("Tipo de movimento", "ENTREGA_COFRE — Entrega de Valores ao Cofre Central");
  doc.moveDown(0.6);

  doc
    .fontSize(8)
    .font("Helvetica")
    .text(
      "Comprovativo emitido nos termos da circular do Banco de Moçambique relativa ao limite de numerário em caixa. " +
        "O excedente entregue ao Cofre Central/Tesoureiro é registado no Mapa Diário de Caixa — Modelo BM.",
      { align: "justify" }
    );
  doc.moveDown(1);

  // ── Selos: QR Code + hash SHA-256 ──
  try {
    const qrBuffer = await QRCode.toBuffer(qrContent, { width: 220, margin: 1, errorCorrectionLevel: "M" });
    const qrY = doc.y;
    doc.image(qrBuffer, doc.page.width - 50 - 120, qrY, { width: 120 });
    doc.fontSize(8).font("Helvetica-Bold").text("SELO ELECTRÓNICO (QR DE VALIDAÇÃO)", 50, qrY);
    doc.fontSize(7).font("Helvetica").text("Hash SHA-256:", 50, qrY + 16);
    const hashParts = hash.match(/.{1,32}/g) || [hash];
    doc.fontSize(6.5).text(hashParts.join("\n"), 50, qrY + 28);
    doc.fontSize(7).text(`Validação: ${url}`, 50, qrY + 62, { width: 280 });
  } catch (error: any) {
    console.error("[Comprovativo] Falha ao gerar QR Code:", error?.message || error);
    doc.fontSize(8).font("Helvetica").text(`Hash SHA-256: ${hash}`);
  }

  doc.moveDown(6);

  // ── Assinaturas ──
  const sigY = Math.max(doc.y, 640);
  doc.fontSize(10).font("Helvetica");
  doc.text("______________________________", 70, sigY);
  doc.text("Assinatura do Operador", 70, sigY + 16);
  doc.text("______________________________", doc.page.width - 50 - 200, sigY);
  doc.text("Assinatura do Tesoureiro", doc.page.width - 50 - 200, sigY + 16);

  doc.fontSize(7).fillColor("#555555").text(
    `Documento gerado electronicamente em ${fmtDate(new Date())} · valide no QR Code acima`,
    50,
    doc.page.height - 60,
    { align: "center", width: doc.page.width - 100 }
  );

  doc.end();
  const buffer = await done;
  return { buffer, numero, hash, url };
};
