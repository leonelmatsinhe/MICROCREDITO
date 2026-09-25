import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { GuarateeAssessmentModel } from "../database/models/GuarateeAssessmentModel";
import { AccountModel } from "../database/models/AccountModel";
import { installmentPanification } from "../utils/calculateLateAmount";

/**
 * Documentos legais do crédito em PDF (pdfkit no backend).
 * Réplica fiel dos geradores pdfmake do frontend
 * (web-app-v2/src/utils/legalDocs.js + pdfHeader.js):
 *  - Contrato de Concessão (20 cláusulas + vigésima primeira de seguro)
 *  - Termo de Compromisso
 *  - Declaração de Garantias
 *  - Extracto do Crédito (landscape, colunas Price: Ordem | Amortização | Juros |
 *    Prestação | Saldo | Vencimento + TOTAIS, como no PDF oficial antigo)
 */

type Align = "left" | "center" | "right";

interface RichPart {
  text: string;
  bold?: boolean;
  color?: string;
}

interface Cell {
  text?: string;
  rich?: RichPart[];
  bold?: boolean;
  color?: string;
  align?: Align;
  fontSize?: number;
  fillColor?: string;
}

interface TableOpts {
  x: number;
  y: number;
  widths: number[];
  aligns: Align[];
  header?: string[];
  headerFontSize?: number;
  rows: Cell[][];
  fontSize?: number;
  headerBg?: string;
  zebra?: boolean;
  padY?: number;
  padX?: number;
  gridColor?: string;
  outerLine?: string;
  outerWidth?: number;
  headerTextColor?: string;
}

const COLORS = {
  primary: "#1565c0",
  navy: "#1a237e",
  red: "#c62828",
  green: "#2e7d32",
  orange: "#f57c00",
  grey: "#666666",
  lightGrey: "#999999",
  grid: "#e0e0e0",
  headerFill: "#e8eaf6",
  zebra: "#f5f5f5",
};

// ── Formatação (idêntica ao Intl pt-MZ do frontend, incluindo a regra CLDR
//    de agrupamento só a partir de 5 dígitos: "2179,11" mas "10 279,11") ──
const groupInteger = (int: string): string =>
  int.length >= 5 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : int;

const fmtMoney = (value: any): string => {
  const n = Math.round((Number(value) || 0) * 100) / 100;
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  const sign = n < 0 ? "-" : "";
  return `${sign}${groupInteger(int)},${dec} MZN`;
};

const fmtDateShort = (dateStr: any): string => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Número por extenso (português) — espelho de web-app-v2/src/utils/formatters.js
const numberToWords = (num: number): string => {
  if (num === 0) return "zero";
  const ones = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete", "dezoito", "dezanove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
    "seiscentos", "setecentos", "oitocentos", "novecentos"];

  const convertGroup = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " e " + ones[n % 10] : "");
    }
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const remainder = n % 100;
      return hundreds[h] + (remainder !== 0 ? " e " + convertGroup(remainder) : "");
    }
    return "";
  };

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);
  if (intPart === 0 && decPart === 0) return "zero";

  let result = "";
  let remaining = intPart;
  let groupIndex = 0;
  while (remaining > 0) {
    const group = remaining % 1000;
    if (group !== 0) {
      let groupText = convertGroup(group);
      if (groupIndex === 2 && group === 1) {
        groupText = "um milhão";
      } else if (groupIndex > 2) {
        groupText += " mil";
      } else if (groupIndex === 1) {
        groupText = group === 1 ? "mil" : groupText + " mil";
      }
      if (result !== "") {
        groupText += group < 100 && remaining >= 1000 ? " e " : "";
      }
      result = groupText + (result !== "" ? " e " : "") + result;
    }
    remaining = Math.floor(remaining / 1000);
    groupIndex++;
  }
  return result;
};

const convertGender = (cu: any): string => {
  const g = String(cu?.customerGender || "").toLowerCase();
  return g === "f" || g === "feminino" ? "A MUTUÁRIA" : "O MUTUÁRIO";
};
const convertGenderLabel = (cu: any): string => {
  const g = String(cu?.customerGender || "").toLowerCase();
  return g === "f" || g === "feminino" ? "Mulher" : "Homem";
};

/** Caminho local do logotipo (companies.companyLogo → uploads/...), como no reciboService. */
const companyLogoPath = (logo: any): string | null => {
  if (!logo) return null;
  const fileName = path.basename(String(logo));
  const candidates = [
    path.join(process.cwd(), "uploads", "img", fileName),
    path.join(process.cwd(), "uploads", "documents", fileName),
    path.join(process.cwd(), "uploads", fileName),
  ];
  return candidates.find((c) => fs.existsSync(c)) || null;
};

// ── Primitivas de desenho ──────────────────────────────────────────────

interface Ctx {
  doc: PDFKit.PDFDocument;
  left: number;
  right: number;
  contentBottom: number;
  company: any;
}

/** Cabeçalho da empresa: dados à esquerda, logo à direita, linha azul, título centrado.
 *  Espaçamento determinístico (lineBreak:false não avança doc.y de forma fiável). */
const drawCompanyHeader = (ctx: Ctx, title: string): number => {
  const { doc, left, right, company: c } = ctx;
  let y = doc.page.margins.top;

  const logoFile = companyLogoPath(c.companyLogo);
  const textWidth = right - left - (logoFile ? 100 : 0);

  const line = (text: string, size: number, bold: boolean, color: string, gap: number) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(color);
    doc.text(text, left, y, { width: textWidth, lineBreak: false });
    y += size * 1.25 + gap;
  };

  line(String(c.companyName || "Empresa"), 14, true, COLORS.primary, 3);
  if (c.companyAddress) line(String(c.companyAddress), 8, false, "#444444", 2);
  line(`NUIT: ${c.companyNuit || ""}`, 8, false, "#444444", 2);
  line(`Tel: ${c.companyPhone || ""} | Email: ${c.companyEmail || ""}`, 8, false, "#444444", 2);
  if (c.companyWebsite) line(`Website: ${c.companyWebsite}`, 8, false, "#444444", 2);

  if (logoFile) {
    try { doc.image(logoFile, right - 85, doc.page.margins.top, { fit: [85, 70] }); } catch { /* logo inválido — ignora */ }
  }

  const lineY = Math.max(y + 8, doc.page.margins.top + 72);
  doc.save().moveTo(left, lineY).lineTo(right, lineY).lineWidth(2).strokeColor(COLORS.primary).stroke().restore();

  const titleY = lineY + 10;
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#000000");
  doc.text(String(title).toUpperCase(), left, titleY, { width: right - left, align: "center", lineBreak: false });
  return titleY + 13 * 1.3 + 10;
};

/** Tabela com grelha, header colorido, zebra e quebra de página com header repetido. */
const drawTable = (ctx: Ctx, opts: TableOpts): number => {
  const { doc, contentBottom } = ctx;
  const fs_ = opts.fontSize ?? 7;
  const padY = opts.padY ?? 3;
  const padX = opts.padX ?? 4;
  const gridColor = opts.gridColor ?? COLORS.grid;

  const rowHeight = (cells: Cell[]): number => {
    let h = 0;
    cells.forEach((cell, i) => {
      const fSize = cell.fontSize ?? fs_;
      doc.font(cell.bold || (cell.rich || []).some(p => p.bold) ? "Helvetica-Bold" : "Helvetica").fontSize(fSize);
      const text = cell.rich ? cell.rich.map(p => p.text).join("") : (cell.text || "");
      const textH = doc.heightOfString(text, { width: opts.widths[i] - 2 * padX });
      h = Math.max(h, textH);
    });
    return h + 2 * padY;
  };

  const drawRow = (cells: Cell[], rowY: number, bg: string | null): number => {
    const h = rowHeight(cells);
    if (rowY + h > contentBottom) {
      doc.addPage();
      rowY = doc.page.margins.top;
    }
    let x = opts.x;
    if (bg) {
      doc.save().rect(opts.x, rowY, opts.widths.reduce((s, w) => s + w, 0), h).fill(bg).restore();
    }
    cells.forEach((cell, i) => {
      const w = opts.widths[i];
      const cellBg = cell.fillColor || null;
      if (cellBg) doc.save().rect(x, rowY, w, h).fill(cellBg).restore();
      const fSize = cell.fontSize ?? fs_;
      const align = cell.align || opts.aligns[i] || "left";
      const color = cell.color || "#000000";
      const textY = rowY + padY;
      const textW = w - 2 * padX;
      if (cell.rich) {
        let cx = x + padX;
        cell.rich.forEach(part => {
          doc.font(part.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fSize).fillColor(part.color || color);
          const partW = doc.widthOfString(part.text);
          doc.text(part.text, cx, textY, { lineBreak: false });
          cx += partW;
        });
      } else {
        doc.font(cell.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fSize).fillColor(color);
        doc.text(cell.text || "", x + padX, textY, { width: textW, align, lineBreak: false });
      }
      // grelha vertical
      doc.save().moveTo(x, rowY).lineTo(x, rowY + h).lineWidth(0.5).strokeColor(gridColor).stroke().restore();
      x += w;
    });
    // linha inferior + fecho à direita
    doc.save()
      .moveTo(x, rowY).lineTo(x, rowY + h)
      .moveTo(opts.x, rowY + h).lineTo(x, rowY + h)
      .lineWidth(0.5).strokeColor(gridColor).stroke().restore();
    return rowY + h;
  };

  let y = opts.y;

  const drawHeader = (rowY: number): number => {
    if (!opts.header) return rowY;
    const headerCells: Cell[] = opts.header.map((t, i) => ({
      text: t,
      bold: true,
      fillColor: opts.headerBg || COLORS.headerFill,
      color: opts.headerTextColor || "#000000",
      fontSize: opts.headerFontSize ?? fs_,
    }));
    return drawRow(headerCells, rowY, null);
  };

  if (opts.header) y = drawHeader(y);

  opts.rows.forEach((cells, idx) => {
    const zebraBg = opts.zebra && idx % 2 === 1 ? COLORS.zebra : null;
    y = drawRow(cells, y, zebraBg);
  });

  if (opts.outerLine) {
    doc.save()
      .moveTo(opts.x, opts.y).lineTo(opts.x + opts.widths.reduce((s, w) => s + w, 0), opts.y)
      .moveTo(opts.x, y).lineTo(opts.x + opts.widths.reduce((s, w) => s + w, 0), y)
      .lineWidth(opts.outerWidth ?? 1).strokeColor(opts.outerLine).stroke().restore();
  }
  return y;
};

/** Rodapé em todas as páginas: "Documento processado por computador" | "Empresa | Pág. i/n". */
const drawFooters = (ctx: Ctx): void => {
  const { doc, company } = ctx;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - doc.page.margins.bottom - 12;
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.grey);
    doc.text("Documento processado por computador", doc.page.margins.left, y, { lineBreak: false });
    const label = `${company.companyName || ""} | Pág. ${i - range.start + 1}/${range.count}`;
    const labelW = doc.widthOfString(label);
    doc.text(label, doc.page.width - doc.page.margins.right - labelW, y, { lineBreak: false });
  }
};

/** Parágrafo justificado simples (fontSize 8, como no pdfmake). */
const para = (ctx: Ctx, text: string, opts: { size?: number; align?: Align; gap?: number } = {}): void => {
  const { doc } = ctx;
  doc.font("Helvetica").fontSize(opts.size ?? 8).fillColor("#000000");
  doc.text(text, { width: ctx.right - ctx.left, align: opts.align || "justify", lineGap: 1 });
  if (opts.gap) doc.moveDown(opts.gap);
};

/** Parágrafo com segmentos mistos (bold incluído), prefixo "1. ". */
const numberedPara = (ctx: Ctx, parts: (string | RichPart)[]): void => {
  const { doc } = ctx;
  doc.moveDown(0.2);
  const all: RichPart[] = [{ text: "1. ", bold: true }, ...parts.map(p => (typeof p === "string" ? { text: p } : p))];
  all.forEach((part, idx) => {
    doc.font(part.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor(part.color || "#000000");
    const isLast = idx === all.length - 1;
    doc.text(part.text, { width: ctx.right - ctx.left, align: "justify", continued: !isLast, lineGap: 1 });
  });
  doc.moveDown(0.2);
};

const clauseHeader = (ctx: Ctx, name: string, subtitle: string): void => {
  const { doc } = ctx;
  doc.moveDown(0.8);
  let y = doc.y + 8;
  if (y + 45 > ctx.contentBottom) { doc.addPage(); y = doc.page.margins.top; }
  const width = ctx.right - ctx.left;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text(`CLÁUSULA ${name}`, ctx.left, y, { width, align: "center", lineBreak: false });
  y += 10 * 1.3;
  doc.fontSize(9).text(subtitle, ctx.left, y, { width, align: "center", lineBreak: false });
  doc.y = y + 9 * 1.35 + 4;
};

const plainTextCell = (text: string, extra: Partial<Cell> = {}): Cell => ({ text, ...extra });

// ── Dados carregados por crédito ───────────────────────────────────────

export interface LegalDocsData {
  loan: any;
  customer: any;
  company: any;
  amortizations: any[];
  guarantees: any[];
  accounts: any[];
}

export const loadLegalDocsData = async (loanId: number): Promise<LegalDocsData | null> => {
  const loan: any = await LoanModel.findByPk(loanId);
  if (!loan) return null;
  const companyId = Number(loan.getDataValue("companyId"));
  const company: any = await CompanyModel.findByPk(companyId);
  const customer: any = await CustomerModel.findOne({
    where: { accountNumber: loan.getDataValue("accountNumber"), companyId },
  });
  const amorts: any[] = await AmorizationLoanModel.findAll({
    where: { loanId },
    order: [["dueDate", "ASC"], ["id", "ASC"]],
  });
  const forfeit = Number(company?.getDataValue("forfeit")) || 0;
  const amortizations = installmentPanification(amorts, forfeit);
  const guarantees: any[] = await GuarateeAssessmentModel.findAll({
    where: { loanId },
    order: [["id", "DESC"]],
  });
  const accounts: any[] = await AccountModel.findAll({ where: { companyId } });
  return { loan, customer, company, amortizations, guarantees, accounts };
};

// ── 1. EXTRACTO DO CRÉDITO (landscape, colunas Price do PDF oficial) ───

export const buildExtractoCredito = (ctx: Ctx, data: LegalDocsData): void => {
  const { doc, left, right } = ctx;
  const { loan, customer: cu, amortizations } = data;
  const width = right - left;

  let y = drawCompanyHeader(ctx, "Extracto do Crédito");

  // DADOS DO CLIENTE
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.navy);
  doc.text("DADOS DO CLIENTE", left, y, { lineBreak: false });
  y += 9 * 1.3 + 5;
  y = drawTable(ctx, {
    x: left, y, widths: [width / 4, width / 4, width / 4, width / 4], aligns: ["left", "left", "left", "left"],
    rows: [[
      { rich: [{ text: "Nome: ", bold: true }, { text: String(cu?.customerName || "") }] },
      { rich: [{ text: "Conta: ", bold: true }, { text: String(cu?.accountNumber || loan.getDataValue("accountNumber") || "") }] },
      { rich: [{ text: "Telefone: ", bold: true }, { text: `258${String(cu?.customerPhone || "")}` }] },
      { rich: [{ text: "NUIT: ", bold: true }, { text: String(cu?.customerNuit || "") }] },
    ]],
    fontSize: 8, padY: 4, outerLine: COLORS.navy, outerWidth: 1,
  });
  y += 10;

  // RESUMO DO CRÉDITO
  const totalInterest = amortizations.reduce((s, r) => s + (parseFloat(r.rateAmount) || 0), 0);
  const contractTotal = amortizations.reduce((s, r) => s + (parseFloat(r.installment) || 0), 0);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.navy);
  doc.text("RESUMO DO CRÉDITO", left, y, { lineBreak: false });
  y += 9 * 1.3 + 5;
  const cw = width / 5;
  y = drawTable(ctx, {
    x: left, y, widths: [cw, cw, cw, cw, cw], aligns: ["center", "center", "center", "center", "center"],
    rows: [
      ["Capital Financiado", "Taxa de Juros", "Nº Prestações", "Total Juros", "Total Dívida"].map(t => plainTextCell(t, { bold: true, fontSize: 7, color: COLORS.grey, fillColor: "#fafafa" })),
      [
        plainTextCell(fmtMoney(loan.getDataValue("amount")), { bold: true, fontSize: 9 }),
        plainTextCell(`${((parseFloat(loan.getDataValue("interestRate")) || 0) * 100).toFixed(1)}%`, { bold: true, fontSize: 9 }),
        plainTextCell(String(loan.getDataValue("numberOfInstallments") || 0), { bold: true, fontSize: 9 }),
        plainTextCell(fmtMoney(totalInterest), { bold: true, fontSize: 9 }),
        plainTextCell(fmtMoney(contractTotal), { bold: true, fontSize: 9, color: COLORS.red }),
      ],
    ],
    padY: 4, outerLine: COLORS.navy, outerWidth: 1,
  });
  y += 10;

  // SITUAÇÃO ACTUAL
  const installmentTotalDue = (inst: any) =>
    Math.round((Math.max(0, Number(inst?.installment || 0) - Number(inst?.paidAmount || 0)) + Number(inst?.latePaymentInterest || 0)) * 100) / 100;
  const totalPaid = amortizations.reduce((s, r) => s + (parseFloat(r.paidAmount) || 0), 0);
  const remaining = amortizations.filter(r => Number(r.status) !== 1).reduce((s, r) => s + installmentTotalDue(r), 0);
  const paidCount = amortizations.filter(r => Number(r.status) === 1).length;
  const pendingCount = amortizations.length - paidCount;

  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.navy);
  doc.text("SITUAÇÃO ACTUAL", left, y, { lineBreak: false });
  y += 9 * 1.3 + 5;
  const sw = width / 4;
  y = drawTable(ctx, {
    x: left, y, widths: [sw, sw, sw, sw], aligns: ["center", "center", "center", "center"],
    rows: [
      ["Total Pago", "Saldo Remanescente", "Prestações Pagas", "Prestações Pendentes"].map(t =>
        plainTextCell(t, { bold: true, fontSize: 7, fillColor: "#fafafa", color: t.startsWith("Total Pago") ? COLORS.green : t.startsWith("Saldo") ? COLORS.red : COLORS.navy })),
      [
        plainTextCell(fmtMoney(totalPaid), { bold: true, fontSize: 9, color: COLORS.green }),
        plainTextCell(fmtMoney(remaining), { bold: true, fontSize: 9, color: COLORS.red }),
        plainTextCell(`${paidCount} de ${amortizations.length}`, { bold: true, fontSize: 9 }),
        plainTextCell(String(pendingCount), { bold: true, fontSize: 9, color: COLORS.orange }),
      ],
    ],
    padY: 4, outerLine: COLORS.navy, outerWidth: 1,
  });
  y += 10;

  // PLANO DE AMORTIZAÇÃO — colunas Price (ordem exacta do PDF oficial)
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.navy);
  doc.text(`PLANO DE AMORTIZAÇÃO (${amortizations.length} prestações)`, left, y, { lineBreak: false });
  y += 9 * 1.3 + 5;

  const amortizacaoOf = (row: any) => {
    const prestacao = parseFloat(row.installment) || 0;
    const juros = parseFloat(row.rateAmount) || 0;
    return row.amortization != null ? parseFloat(row.amortization) || 0 : Math.max(0, Math.round((prestacao - juros) * 100) / 100);
  };

  const planRows: Cell[][] = amortizations.map((row) => {
    const isPaid = Number(row.status) === 1;
    return [
      plainTextCell(String(row.installmentOrder || ""), { align: "center" }),
      plainTextCell(fmtMoney(amortizacaoOf(row)), { align: "right" }),
      plainTextCell(fmtMoney(parseFloat(row.rateAmount) || 0), { align: "right" }),
      plainTextCell(fmtMoney(parseFloat(row.installment) || 0), { align: "right", bold: true }),
      plainTextCell(fmtMoney(Math.max(0, parseFloat(row.remainingBalance) || 0)), { align: "right", color: isPaid ? COLORS.green : COLORS.red }),
      plainTextCell(fmtDateShort(row.dueDate), { align: "center" }),
    ];
  });
  planRows.push([
    plainTextCell("TOTAIS", { bold: true, color: COLORS.navy }),
    plainTextCell(fmtMoney(amortizations.reduce((s, r) => s + amortizacaoOf(r), 0)), { align: "right", bold: true }),
    plainTextCell(fmtMoney(totalInterest), { align: "right", bold: true, color: COLORS.navy }),
    plainTextCell(fmtMoney(contractTotal), { align: "right", bold: true }),
    plainTextCell(fmtMoney(remaining), { align: "right", bold: true, color: COLORS.red }),
    plainTextCell("", {}),
  ]);

  y = drawTable(ctx, {
    x: left, y, widths: [50, 160, 140, 150, 170, width - 670], aligns: ["center", "right", "right", "right", "right", "center"],
    header: ["Ordem", "Amortização", "Juros", "Prestação", "Saldo", "Vencimento"],
    headerBg: COLORS.navy, headerTextColor: "#ffffff",
    rows: planRows, zebra: true, gridColor: "#cfd8dc",
  });
};

// ── 2. CONTRATO DE CONCESSÃO (20 cláusulas + vigésima primeira) ────────

export const buildContratoConcessao = (ctx: Ctx, data: LegalDocsData): void => {
  const { doc, left, right } = ctx;
  const { loan: l, customer: cu, company: c, amortizations: plan, guarantees, accounts } = data;
  const width = right - left;

  let y = drawCompanyHeader(ctx, "Contrato de Concessão de Empréstimo");

  const amount = parseFloat(l.getDataValue("amount")) || 0;
  const rate = ((parseFloat(l.getDataValue("interestRate")) || 0) * 100).toFixed(1);
  const adminFeeRate = parseFloat(l.getDataValue("administrativeFee")) || 0;
  const preparationFee = Math.round(amount * adminFeeRate * 100) / 100;
  const adminFeePct = (adminFeeRate * 100).toFixed(1);
  const companyName = String(c.getDataValue("companyName") || "Mais Mola");
  const companyAbbr = companyName.replace(/\s+/g, "").substring(0, 10).toUpperCase();
  const showInsuranceClause = Number(c.getDataValue("contractHideInsuranceClause") || 0) !== 1;
  const numInstallments = l.getDataValue("numberOfInstallments");
  const isPJ = String(cu?.getDataValue("customerType") || "PF") === "PJ";

  // Entre: Mutuante & Mutuário
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000");
  doc.text("\nEntre:\n", { width, align: "left" });
  para(ctx, `${companyName}, uma instituição financeira licenciada pelo Banco de Moçambique, titular do NUIT ${c.getDataValue("companyNuit") || ""}, com sede em ${c.getDataValue("companyAddress") || ""}, doravante designada por Mutuante ou Credora`);
  doc.font("Helvetica").fontSize(8).fillColor("#000000");
  doc.text("\n&\n", { width, align: "center" });
  para(ctx, isPJ
    ? `${cu.getDataValue("customerName") || ""}, titular do NUIT ${cu.getDataValue("customerNuit") || ""}, com sede em ${cu.getDataValue("customerAddress") || ""}, titular do Alvará nº ${cu.getDataValue("companyLicenseNumber") || ""}, que exerce actividade de ${cu.getDataValue("companyMainActivity") || ""}, neste acto representada pelo seu representante legal ${cu.getDataValue("companyLegalRepresentative") || ""}, portador do BI nº ${cu.getDataValue("companyRepresentativeIdNumber") || ""}, de ora em diante designada O MUTUÁRIO.`
    : `${cu.getDataValue("customerName") || ""}, portador do B.I número ${cu.getDataValue("customerNationalId") || ""}, residente no ${cu.getDataValue("customerAddress") || ""}, de ora em diante denominado ${convertGender(cu)}.`);

  // CLÁUSULA PRIMEIRA
  clauseHeader(ctx, "PRIMEIRA", "(Objecto, Montante e Forma de Desenvolvimento do Capital)");
  numberedPara(ctx, [
    "O presente contrato tem por objecto, regular a concessão de um empréstimo, em forma de mútuo que o Mutuante disponibiliza ao Mutuário e, este último confessa-se para todos os efeitos legais, devedor do Mutuante, no montante de capital de ",
    { text: `${fmtMoney(amount)} (${numberToWords(amount)} meticais)`, bold: true },
    ", acrescidos de juros acordados de ",
    { text: `${rate}%`, bold: true },
    ", irão vencendo nos termos e condições indicados nas cláusulas que se seguem.",
  ]);

  clauseHeader(ctx, "SEGUNDA", "(Forma de Desembolso e Entrada em Vigor do Contrato)");
  numberedPara(ctx, ["O valor do empréstimo foi entregue ao Mutuário, através do desembolso directo na conta do Mutuário."]);
  numberedPara(ctx, ["O presente contrato entra imediatamente em vigor na data da sua assinatura."]);

  clauseHeader(ctx, "TERCEIRA", "(Prazo)");
  numberedPara(ctx, [`O presente contrato é celebrado por um período de ${numInstallments} ${Number(numInstallments) === 1 ? "mês" : "meses"}, contados a partir da data da disponibilização do capital mutuado.`]);

  clauseHeader(ctx, "QUARTA", "(Taxas de Juros e Plano de Pagamento)");
  numberedPara(ctx, [`O montante desembolsado e que constitui a dívida confessada, no presente contrato, vence juros remuneratórios de ${rate}%, sendo estes calculados mensalmente sobre o capital em dívida e pagáveis conjuntamente com o reembolso do capital.`]);
  numberedPara(ctx, ["O reembolso do capital e juros será efectuado de acordo com o plano de amortização constante do presente contrato, conforme tabela abaixo:"]);

  // Plano de Pagamento das Prestações
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("Plano de Pagamento das Prestações", { width, align: "center" });
  doc.moveDown(0.5);

  if (plan.length > 0) {
    const totalInterest = plan.reduce((s, r) => s + (parseFloat(r.rateAmount) || 0), 0);
    const totalAmortization = plan.reduce((s, r) => s + (parseFloat(r.amortization) || 0), 0);
    const totalInstallment = plan.reduce((s, r) => s + (parseFloat(r.installment) || 0), 0);
    const cw = width / 5;
    y = drawTable(ctx, {
      x: left, y: doc.y, widths: [cw, cw, cw, cw, cw], aligns: ["center", "center", "center", "center", "center"],
      header: ["Capital Financiado", "Taxa de Juro", "Nº Prestações", "Total de Juros", "Total a Pagar"],
      rows: [[
        plainTextCell(fmtMoney(amount), { bold: true, fontSize: 10, fillColor: "#ffffff" }),
        plainTextCell(`${rate}%`, { bold: true, fontSize: 10, fillColor: "#ffffff" }),
        plainTextCell(String(numInstallments), { bold: true, fontSize: 10, fillColor: "#ffffff" }),
        plainTextCell(fmtMoney(totalInterest), { bold: true, fontSize: 10, fillColor: "#ffffff" }),
        plainTextCell(fmtMoney(totalInstallment), { bold: true, fontSize: 10, fillColor: "#ffffff", color: "#1565c0" }),
      ]],
      padY: 4,
    });
    doc.y = y + 8;

    const pw = [45, 100, 90, 100, 100, width - 435];
    let saldo = amount;
    const planRows: Cell[][] = plan.map((a, idx) => {
      const amort = parseFloat(a.amortization) || 0;
      const apiBalance = a.remainingBalance !== undefined && a.remainingBalance !== null ? parseFloat(a.remainingBalance) : null;
      saldo = apiBalance !== null ? apiBalance : Math.max(0, saldo - amort);
      if (idx === plan.length - 1) saldo = 0;
      return [
        plainTextCell(`${idx + 1}ª`, { align: "center" }),
        plainTextCell(fmtMoney(amort), { align: "right" }),
        plainTextCell(fmtMoney(parseFloat(a.rateAmount) || 0), { align: "right" }),
        plainTextCell(fmtMoney(parseFloat(a.installment) || 0), { align: "right", bold: true }),
        plainTextCell(fmtMoney(saldo), { align: "right", color: saldo > 0 ? "#000000" : COLORS.green }),
        plainTextCell(fmtDateShort(a.dueDate), { align: "center" }),
      ];
    });
    planRows.push([
      plainTextCell("Total", { align: "center", bold: true }),
      plainTextCell(fmtMoney(totalAmortization), { align: "right", bold: true }),
      plainTextCell(fmtMoney(totalInterest), { align: "right", bold: true }),
      plainTextCell(fmtMoney(totalInstallment), { align: "right", bold: true }),
      plainTextCell("0,00 MZN", { align: "right", bold: true, color: COLORS.green }),
      plainTextCell("", {}),
    ]);
    y = drawTable(ctx, {
      x: left, y: doc.y, widths: pw, aligns: ["center", "right", "right", "right", "right", "center"],
      header: ["Ordem", "Amortização", "Juros", "Prestação", "Saldo", "Vencimento"],
      headerBg: "#f0f0f0", headerTextColor: "#000000",
      rows: planRows, padY: 2.5,
    });
    doc.y = y + 8;
  } else {
    doc.y += 10;
  }

  clauseHeader(ctx, "QUINTA", "(Reembolso e Local)");
  para(ctx, "As rendas mensais de capital e juros a amortizar serão pagas pelo Mutuário ao Mutuante, através de crédito a efectuar nas seguintes contas:");
  doc.moveDown(0.3);
  if (accounts.length > 0) {
    const aw = [30, (width - 60) * 0.36, (width - 60) * 0.34, 0];
    aw[3] = width - 30 - aw[1] - aw[2];
    y = drawTable(ctx, {
      x: left, y: doc.y, widths: aw, aligns: ["center", "left", "left", "center"],
      header: ["#", "Banco", "Titular", "Nº Conta"],
      rows: accounts.map((acc, idx) => [
        plainTextCell(String(idx + 1), { align: "center" }),
        plainTextCell(String(acc.getDataValue("accountDescription") || "--")),
        plainTextCell(String(acc.getDataValue("accountHolder") || "--")),
        plainTextCell(String(acc.getDataValue("accountNumber") || "--"), { align: "center", bold: true }),
      ]),
      padY: 2.5,
    });
    doc.y = y + 4;
  } else {
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLORS.lightGrey);
    doc.text("(Sem contas registadas)", { width, align: "left" });
    doc.font("Helvetica").fontSize(8).fillColor("#000000");
  }

  clauseHeader(ctx, "SEXTA", "(Prova de Reembolso)");
  para(ctx, "O talão de depósito ou nota de transferência bancária servem como prova de reembolso da prestação devida.");

  clauseHeader(ctx, "SÉTIMA", "(Comissão de Preparos)");
  numberedPara(ctx, [
    "Pela operação o Mutuário ",
    adminFeeRate > 0
      ? { text: `paga uma taxa de preparos de ${fmtMoney(preparationFee)} (${numberToWords(preparationFee)} meticais), correspondentes a ${adminFeePct}% sobre o capital do empréstimo, sendo estes liquidados de uma só vez na data do desembolso do capital.`, bold: true }
      : "está isento do pagamento da taxa de preparos administrativos.",
  ]);

  clauseHeader(ctx, "OITAVA", "(Mora e Incumprimento)");
  numberedPara(ctx, [`A mora pela amortização de qualquer prestação vencida implica a aplicação de juros moratórios de ${c.getDataValue("forfeit") || 0.1}% por dia, a calcular sobre o capital e juros das prestações vencidas.`]);

  clauseHeader(ctx, "NONA", "(Garantias do Empréstimo)");
  para(ctx, "Para este empréstimo, o Mutuário apresenta como garantias:");
  doc.moveDown(0.2);
  if (guarantees.length > 0) {
    guarantees.forEach(g => {
      doc.font("Helvetica").fontSize(8).fillColor("#000000");
      doc.text(`•  ${g.getDataValue("guaranteeDescription") || g.getDataValue("description") || "Sem descrição"}`, left + 12, doc.y, { width: width - 12 });
    });
  } else {
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLORS.lightGrey);
    doc.text("•  (Sem garantias registadas)", left + 12, doc.y, { width: width - 12 });
  }
  doc.font("Helvetica").fontSize(8).fillColor("#000000");

  clauseHeader(ctx, "DÉCIMA", "(Futuro Uso das Garantias)");
  para(ctx, "As garantias descritas na cláusula nona poderão ser usadas em futuros créditos, mediante solicitação de novo empréstimo.");

  clauseHeader(ctx, "DÉCIMA PRIMEIRA", "(Pari Passu)");
  para(ctx, "Caso venha a ocorrer uma situação em que o Mutuário não possa cumprir pontualmente e integralmente com todas as suas obrigações, o Mutuante concorre em igualdade de circunstância com os restantes credores.");

  clauseHeader(ctx, "DÉCIMA SEGUNDA", "(Entrega Voluntária dos Bens)");
  numberedPara(ctx, ["Em caso de incumprimento do presente pelo Mutuário, o Mutuante reserva-se ao direito de se fazer pelas garantias assumidas sem recurso aos tribunais."]);

  clauseHeader(ctx, "DÉCIMA TERCEIRA", "(Execução das Garantias)");
  numberedPara(ctx, ["O bem poderá ser executado logo que vencida qualquer uma das prestações e que o Mutuário tenha efectuado a sua completa e integral liquidação."]);

  clauseHeader(ctx, "DÉCIMA QUARTA", "(Exigibilidade do Crédito)");
  numberedPara(ctx, ["O Crédito objecto do presente contrato considera-se vencido e automaticamente todo o capital e juros em dívida nos seguintes casos: falta de pagamento de uma ou mais prestações vencidas, aplicação para fins diferentes daqueles pelos quais o financiamento foi destinado."]);

  clauseHeader(ctx, "DÉCIMA QUINTA", "(Endereços)");
  para(ctx, "Todas as comunicações entre o Mutuante e o Mutuário deverão ser efectuadas por escrito, e dirigidas para os endereços constantes no Contrato.");

  clauseHeader(ctx, "DÉCIMA SEXTA", "(Despesas)");
  numberedPara(ctx, ["Todas as despesas inerentes à execução do presente contrato, incluindo o valor de impostos de selo, correm por conta e responsabilidade do Mutuário."]);

  clauseHeader(ctx, "DÉCIMA SÉTIMA", "(Liquidação Antecipada)");
  numberedPara(ctx, ["Em caso de reembolso antecipado da totalidade ou da parte do capital em dívida, o mesmo deverá ser efectuado nas datas do vencimento das prestações."]);

  clauseHeader(ctx, "DÉCIMA OITAVA", "(Acordo)");
  para(ctx, "O presente contrato vai ser assinado em duplicado, ficando uma à disposição do Mutuante e outra do Mutuário.");

  clauseHeader(ctx, "DÉCIMA NONA", "(Foro)");
  para(ctx, "Em caso de litígio o foro competente é o Tribunal Judicial da Cidade de Maputo, com expressa renúncia a qualquer outro.");

  clauseHeader(ctx, "VIGÉSIMA", "(Disposições Finais)");
  para(ctx, "O presente contrato é regido pela legislação moçambicana em vigor.");

  // Vigésima primeira (seguro) — ocultável por empresa
  if (showInsuranceClause) {
    buildInsuranceClause(ctx, data, { companyName, companyAbbr, amount, rate, numInstallments });
  }

  // Data e assinaturas — duas colunas no mesmo Y, com página nova se não couber
  doc.moveDown(2);
  doc.font("Helvetica").fontSize(8).fillColor("#000000");
  doc.text(`Maputo, aos ${fmtDateShort(l.getDataValue("updatedAt") || l.getDataValue("dateCreated"))}`, { width, align: "center" });
  doc.moveDown(2.5);

  const SIG_H = 70;
  let signY = doc.y + 10;
  if (signY + SIG_H > ctx.contentBottom) {
    doc.addPage();
    signY = doc.page.margins.top;
  }
  const half = width / 2;
  const leftSig = `__________________________\n\n${c.getDataValue("companyManager") || "Gestor de Crédito"}\n\n(O MUTUANTE)`;
  const rightSig = isPJ
    ? `__________________________\n\nPela MUTUÁRIA\n${cu.getDataValue("customerName") || ""}\nRepresentada por: ${cu.getDataValue("companyLegalRepresentative") || ""}\nBI: ${cu.getDataValue("companyRepresentativeIdNumber") || ""}`
    : `__________________________\n\n${cu.getDataValue("customerName") || ""}\n\n(${convertGender(cu).trim()})`;
  doc.font("Helvetica").fontSize(8).fillColor("#000000");
  doc.text(leftSig, left + 20, signY, { width: half - 40, align: "center" });
  doc.text(rightSig, left + half + 20, signY, { width: half - 40, align: "center" });
};

// ── 3. TERMO DE COMPROMISSO ────────────────────────────────────────────

export const buildTermoCompromisso = (ctx: Ctx, data: LegalDocsData): void => {
  const { doc, left, right } = ctx;
  const { loan: l, customer: cu, company: c } = data;
  const width = right - left;

  drawCompanyHeader(ctx, "Termo de Compromisso de Recebimento de Crédito");
  doc.y += 10;

  const amount = parseFloat(l.getDataValue("amount")) || 0;
  const isPJ = String(cu?.getDataValue("customerType") || "PF") === "PJ";
  doc.font("Helvetica").fontSize(10).fillColor("#000000");

  if (isPJ) {
    doc.text("Pelo presente, nós ", { width, align: "justify", continued: true, lineGap: 6 });
    doc.font("Helvetica-Bold").text(cu.getDataValue("customerName") || "", { underline: true, continued: true });
    doc.font("Helvetica").text(", NUIT ", { continued: true });
    doc.font("Helvetica-Bold").text(cu.getDataValue("customerNuit") || "", { continued: true });
    doc.font("Helvetica").text(", representada por ", { continued: true });
    doc.font("Helvetica-Bold").text(cu.getDataValue("companyLegalRepresentative") || "", { continued: true });
    doc.font("Helvetica").text(", com BI nº ", { continued: true });
    doc.font("Helvetica-Bold").text(cu.getDataValue("companyRepresentativeIdNumber") || "", { continued: true });
    doc.font("Helvetica").text(", declaramos que recebemos na data de hoje o valor de ", { continued: true });
    doc.font("Helvetica-Bold").text(`${fmtMoney(amount)} (${numberToWords(amount)} meticais)`, { continued: true });
    doc.font("Helvetica").text(" da MBR Microcrédito.", { align: "justify" });
  } else {
    doc.text("Pelo presente, eu ", { width, align: "justify", continued: true, lineGap: 6 });
    doc.font("Helvetica-Bold").text(cu.getDataValue("customerName") || "", { underline: true, continued: true });
    doc.font("Helvetica").text("\nCidadão(ã) moçambicano(a) com o nº do BI ", { continued: true });
    doc.font("Helvetica-Bold").text(cu.getDataValue("customerNationalId") || "", { continued: true });
    doc.font("Helvetica").text(", ", { continued: true });
    doc.font("Helvetica-Bold").text("declaro que recebi", { continued: true });
    doc.font("Helvetica").text(" na data de hoje, o valor de ", { continued: true });
    doc.font("Helvetica-Bold").text(`${fmtMoney(amount)} (${numberToWords(amount)} meticais)`, { continued: true });
    doc.font("Helvetica").text(", em:", { align: "justify" });
  }

  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(10);
  doc.text("Cheque (________)    Numerário (________)    Transferência (________)", { width, align: "left" });
  doc.moveDown(0.3);
  doc.font("Helvetica").text(" da ", { continued: true });
  doc.font("Helvetica-Bold").text(String(c.getDataValue("companyName") || "Mais Mola"), { continued: true });
  doc.font("Helvetica").text(".", { align: "justify" });

  doc.moveDown(0.8);
  para(ctx, "Sendo expressão da verdade e sem qualquer coação, firmo presente.", { size: 10 });
  doc.moveDown(1.2);
  doc.font("Helvetica").fontSize(10).fillColor("#000000");
  doc.text(`Mukhatine, ${fmtDateShort(l.getDataValue("updatedAt") || l.getDataValue("dateCreated"))}`, { width, align: "center" });
  doc.moveDown(3);
  doc.text("……………………………………………………………………………………", { width, align: "center" });
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(9);
  if (isPJ) {
    doc.text(String(cu.getDataValue("customerName") || ""), { width, align: "center" });
    doc.font("Helvetica").fontSize(8);
    doc.text(`Representada por: ${cu.getDataValue("companyLegalRepresentative") || ""}`, { width, align: "center" });
  } else {
    doc.text(`(${cu.getDataValue("customerName") || ""})`, { width, align: "center" });
  }
};

// ── 4. DECLARAÇÃO DE GARANTIAS ─────────────────────────────────────────

export const buildDeclaracaoGarantias = (ctx: Ctx, data: LegalDocsData): void => {
  const { doc, left, right } = ctx;
  const { loan: l, customer: cu, company: c, guarantees } = data;
  const width = right - left;

  let y = drawCompanyHeader(ctx, "Declaração de Garantias");
  doc.y = y + 6;

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
  doc.text("1. Dados cliente", { width, align: "left" });
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(8);
  const isPJ = String(cu?.getDataValue("customerType") || "PF") === "PJ";
  if (isPJ) {
    doc.font("Helvetica-Bold").text(`EMPRESA: ${String(cu.getDataValue("customerName") || "").toUpperCase()}`, { width });
    doc.font("Helvetica");
    doc.text(`NUIT: ${cu.getDataValue("customerNuit") || ""}`, { width });
    doc.text(`Alvará: ${cu.getDataValue("companyLicenseNumber") || ""} | Actividade: ${cu.getDataValue("companyMainActivity") || ""}`, { width });
    doc.text(`Representante: ${cu.getDataValue("companyLegalRepresentative") || ""}`, { width });
    doc.text(`Sede: ${cu.getDataValue("customerAddress") || ""} | Tel: ${cu.getDataValue("customerPhone") || ""}`, { width });
  } else {
    doc.font("Helvetica-Bold").text(`${convertGenderLabel(cu).toUpperCase()}: ${String(cu.getDataValue("customerName") || "").toUpperCase()}`, { width });
    doc.font("Helvetica");
    doc.text(`Nº do cliente: ${cu.getDataValue("accountNumber") || ""}`, { width });
    doc.text(`Morada: ${cu.getDataValue("customerAddress") || ""}`, { width });
    doc.text(`Telemóvel: +${cu.getDataValue("customerPhone") || ""}`, { width });
    doc.text(`NUIT: ${cu.getDataValue("customerNuit") || ""}`, { width });
  }

  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
  doc.text("2. Bens de garantia", { width });
  doc.moveDown(0.4);

  const guarRows: Cell[][] = guarantees.map((g) => [
    plainTextCell("", {}),
    plainTextCell(String(g.getDataValue("guaranteeDescription") || g.getDataValue("description") || "--")),
    plainTextCell(fmtDateShort(g.getDataValue("createdAt") || g.getDataValue("dateCreated"))),
    plainTextCell(fmtMoney(g.getDataValue("purchaseAmount") || g.getDataValue("purchaseValue") || 0), { align: "right" }),
  ]);
  // numeração das linhas
  guarRows.forEach((row, i) => { row[0] = plainTextCell(String(i + 1), { align: "center" }); });

  const gw = [30, (width - 30) * 0.46, (width - 30) * 0.28, 0];
  gw[3] = width - 30 - gw[1] - gw[2];
  y = drawTable(ctx, {
    x: left, y: doc.y, widths: gw, aligns: ["center", "left", "left", "right"],
    header: ["#", "Descrição", "Data de submissão", "Avaliação (MZN)"],
    rows: guarRows, padY: 3,
  });
  doc.y = y + 10;

  const totalGuaranteeAmount = guarantees.reduce((s, g) => s + (parseFloat(g.getDataValue("purchaseAmount") || g.getDataValue("purchaseValue")) || 0), 0);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
  doc.text(`Valor total dos bens para garantia ${fmtMoney(totalGuaranteeAmount)} (${numberToWords(totalGuaranteeAmount)} meticais)`, { width });
  doc.moveDown(0.5);
  para(ctx, `E por ser verdade, certifico que todas as informações por mim prestadas ao Gestor de Crédito, bem como os bens acima descritos, servem de garantia para a satisfação da obrigação prevista no contrato de concessão de empréstimo celebrado com a ${c.getDataValue("companyName") || ""}`, { size: 9 });

  doc.moveDown(1.5);
  doc.font("Helvetica").fontSize(8).fillColor("#000000");
  doc.text(`Maputo, aos ${fmtDateShort(l.getDataValue("updatedAt") || l.getDataValue("dateCreated"))}`, { width, align: "center" });
  doc.moveDown(2.5);

  const SIG_H = 70;
  let signY = doc.y + 10;
  if (signY + SIG_H > ctx.contentBottom) {
    doc.addPage();
    signY = doc.page.margins.top;
  }
  const half = width / 2;
  const leftSig = `__________________________\n\n${l.getDataValue("creditManager") || "Gestor de Crédito"}\n\n(GESTOR DE CRÉDITO)`;
  const rightSig = isPJ
    ? `__________________________\n\n${cu.getDataValue("customerName") || ""}\nRepresentada por: ${cu.getDataValue("companyLegalRepresentative") || ""}`
    : `__________________________\n\n${cu.getDataValue("customerName") || ""}\n\n(${convertGender(cu).trim()})`;
  doc.font("Helvetica").fontSize(8).fillColor("#000000");
  doc.text(leftSig, left + 10, signY, { width: half - 30, align: "center" });
  doc.text(rightSig, left + half + 20, signY, { width: half - 30, align: "center" });
};

// ── Cláusula vigésima primeira (seguro) — texto integral do frontend ───

const buildInsuranceClause = (ctx: Ctx, data: LegalDocsData, info: { companyName: string; companyAbbr: string; amount: number; rate: string; numInstallments: any }): void => {
  const { doc, left } = ctx;
  const { customer: cu, loan: l } = data;
  const width = ctx.right - ctx.left;
  const { companyName, companyAbbr, amount, rate, numInstallments } = info;

  const point = (title: string, num: string, text: string) => {
    if (title && num) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000");
      doc.moveDown(0.5);
      doc.text(title, { width });
      doc.font("Helvetica-Bold").fontSize(8);
      doc.text(`${num.trim()} `, { continued: true });
      doc.font("Helvetica").text(text, { width, align: "justify" });
    } else {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000");
      doc.text(`${String(num || title).trim()} `, { continued: true });
      doc.font("Helvetica").text(text, { width, align: "justify" });
    }
  };
  const list = (items: string[]) => {
    items.forEach(t => {
      doc.font("Helvetica").fontSize(8).fillColor("#000000");
      doc.text(`      ${t}`, left + 10, doc.y, { width: width - 10 });
    });
  };

  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("CLÁUSULA VIGÉSIMA PRIMEIRA", { width, align: "center", lineBreak: false });
  doc.fontSize(9).text("(Protecção do Empréstimo, Seguro, Garantias e Recuperação do Crédito)", { width, align: "center", lineBreak: false });

  point("1. Finalidade do Empréstimo", "1.1.", `O crédito concedido ao MUTUÁRIO integra o montante global do valor disponibilizado, destinado ao financiamento das actividades de geração de renda, dos beneficiários elegíveis definidos, celebrado entre a KMAD e a ${companyName} (${companyAbbr}).`);
  point("", "1.2.", "O MUTUÁRIO reconhece que os recursos recebidos constituem capital destinado à concessão de crédito e que a sua utilização, reembolso e recuperação deverão observar as condições estabelecidas no presente contrato.");
  point("2. Obrigatoriedade do seguro antes do desembolso", "2.1.", "A contratação e activação do seguro obrigatório constituem condição suspensiva para o desembolso do crédito.");
  point("", "2.2.", `A ${companyName} não efectuará qualquer desembolso ao MUTUÁRIO enquanto não estiver comprovada a existência de uma apólice de seguro válida e activa, emitida por uma seguradora legalmente autorizada a operar na República de Moçambique.`);
  point("", "2.3.", "O seguro deverá abranger, conforme disponibilidade e condições da seguradora:");
  list(["a) Morte do MUTUÁRIO;", "b) Invalidez permanente total;", "c) Incapacidade temporária para o trabalho;", "d) Desemprego involuntário, quando aplicável; e", "e) Outras coberturas consideradas necessárias para a protecção do crédito."]);
  point("", "2.4.", `A ${companyName} deverá ser indicada como beneficiária preferencial da indemnização até ao limite do saldo devedor, relativamente às coberturas directamente relacionadas com o crédito.`);
  point("3. Protecção do capital", "3.1.", "O MUTUÁRIO reconhece que a preservação do capital constitui condição essencial do financiamento.");
  point("", "3.2.", `O MUTUÁRIO obriga-se a utilizar os recursos exclusivamente para a finalidade aprovada pela ${companyName} e definida no respectivo processo de crédito.`);
  point("", "3.3.", `É expressamente proibida a utilização do financiamento para fins diferentes dos aprovados, salvo autorização prévia e escrita da ${companyName}.`);
  point("", "3.4.", "O incumprimento das obrigações de utilização, conservação ou reembolso do capital poderá determinar a exigência do reembolso antecipado do saldo devedor, sem prejuízo de outros direitos previstos no contrato e na legislação aplicável.");
  point("4. Garantias do crédito", "4.1.", `Como condição para a concessão do financiamento, o MUTUÁRIO deverá prestar as garantias exigidas pela ${companyName}, adequadas ao montante, prazo, finalidade e perfil de risco do crédito.`);
  point("", "4.2.", "As garantias poderão incluir, conforme aplicável:");
  list(["a) Garantia pessoal/fiança;", "b) Aval;", "c) Penhor de bens móveis, equipamentos, mercadorias ou outros activos;", "d) Hipoteca ou outra garantia real legalmente admissível;", "e) Cessão de créditos ou de receitas provenientes de contratos; e", `f) Outras garantias aceites pela ${companyName}.`]);
  point("", "4.3.", `A existência de seguro não elimina nem substitui as garantias exigidas pela ${companyName}, salvo decisão expressa da ${companyName} em sentido contrário.`);
  point("", "4.4.", "Sempre que o financiamento seja garantido por um bem susceptível de seguro, o MUTUÁRIO deverá manter o referido bem devidamente seguro durante toda a vigência do crédito.");
  point("5. Seguro dos bens dados em garantia", "5.1.", "Os bens dados em garantia deverão, sempre que a sua natureza o permita, estar cobertos por seguro adequado contra os principais riscos associados ao activo.");
  point("", "5.2.", `A ${companyName} deverá ser indicada como beneficiária preferencial da indemnização até ao limite do saldo devedor, sempre que legalmente admissível.`);
  point("", "5.3.", "Em caso de destruição, perda ou dano do bem dado em garantia, a indemnização do seguro deverá ser utilizada, conforme aplicável, para:");
  list(["a) reposição ou reparação do bem; ou", `b) amortização ou liquidação do saldo devedor perante a ${companyName}.`]);
  point("6. Morte ou invalidez permanente do mutuário", "6.1.", `Em caso de morte ou invalidez permanente total do MUTUÁRIO decorrente de evento coberto pela apólice, a ${companyName} comunicará o sinistro à seguradora e adoptará as medidas necessárias para acionar a cobertura.`);
  point("", "6.2.", `O valor da indemnização será aplicado prioritariamente na liquidação do saldo devedor do MUTUÁRIO perante a ${companyName}, até ao limite do capital seguro.`);
  point("", "6.3.", "Caso a indemnização seja superior ao saldo devedor, o remanescente será destinado ao beneficiário legalmente competente, nos termos da apólice e da legislação aplicável.");
  point("", "6.4.", "Caso a indemnização seja inferior ao saldo devedor ou o sinistro seja recusado pela seguradora por motivo previsto na apólice, o saldo não coberto continuará a ser devido pelo MUTUÁRIO ou pelos responsáveis legalmente obrigados.");
  point("7. Incapacidade temporária", "7.1.", "Quando esta cobertura estiver expressamente contratada, a incapacidade temporária poderá permitir o pagamento das prestações do crédito pela seguradora durante o período previsto na apólice.");
  point("", "7.2.", `A incapacidade temporária não implica automaticamente a suspensão das obrigações do MUTUÁRIO perante a ${companyName}, salvo quando o pagamento pela seguradora estiver confirmado e abranger a respectiva prestação.`);
  point("8. Desemprego involuntário", "8.1.", "Quando contratada esta cobertura, o desemprego involuntário do MUTUÁRIO poderá dar lugar ao pagamento das prestações do crédito pela seguradora, dentro dos limites, períodos de carência e condições estabelecidas na apólice.");
  point("", "8.2.", "O desemprego voluntário, abandono do emprego, despedimento por justa causa ou outras situações expressamente excluídas pela apólice não serão considerados eventos cobertos.");
  point("9. Incumprimento e recuperação do crédito", "9.1.", "O não pagamento de qualquer prestação na data de vencimento constituirá incumprimento nos termos definidos no contrato de crédito.");
  point("", "9.2.", `Verificado o incumprimento, a ${companyName} poderá adoptar medidas de recuperação, incluindo:`);
  list(["a) Contacto e notificação do MUTUÁRIO;", "b) Plano de regularização ou reestruturação, quando justificável;", "c) Acionamento das garantias constituídas;", "d) Acionamento do seguro, quando o incumprimento resultar de evento coberto;", "e) Execução das garantias legalmente admissíveis; e", "f) Recurso às demais vias extrajudiciais ou judiciais disponíveis."]);
  point("", "9.3.", `A ${companyName} deverá procurar recuperar o crédito de forma proporcional e adequada, tendo em consideração a preservação do Capital e os direitos do MUTUÁRIO.`);
  point("10. Obrigação de comunicação de alterações", "10.1.", `O MUTUÁRIO obriga-se a comunicar imediatamente à ${companyName}, qualquer alteração relevante que possa afectar a sua capacidade de pagamento, incluindo perda de emprego, incapacidade para trabalhar, redução significativa dos rendimentos, perda ou deterioração dos bens dados em garantia, ou qualquer outro facto relevante para o cumprimento do contrato.`);
  point("", "10.2.", "O MUTUÁRIO deverá igualmente comunicar qualquer alteração, cancelamento, suspensão ou não renovação da apólice de seguro.");
  point("11. Manutenção das garantias e seguros", "11.1.", `Durante toda a vigência do crédito, o MUTUÁRIO deverá assegurar a manutenção das garantias e seguros exigidos pela ${companyName}.`);
  point("", "11.2.", `A ${companyName} poderá solicitar, a qualquer momento, comprovativos da validade das garantias e das apólices de seguro.`);
  point("", "11.3.", "A falta de manutenção das garantias ou do seguro obrigatório poderá constituir incumprimento contratual, e dar lugar às medidas previstas no presente contrato.");
  point("12. Proibição de levantamento ou transferência de garantias", "12.1.", `Sem autorização prévia e escrita da ${companyName}, o MUTUÁRIO não poderá vender, transferir, alienar, onerar, dar novamente em garantia ou praticar qualquer acto que possa reduzir o valor dos bens dados em garantia.`);
  point("", "12.2.", "Qualquer violação desta obrigação poderá determinar o vencimento antecipado do crédito, nos termos do presente contrato e da legislação aplicável.");
  point("13. Vencimento antecipado", "13.1.", `Sem prejuízo das disposições legais aplicáveis, a ${companyName} poderá declarar antecipadamente vencido o crédito quando se verifique, designadamente:`);
  list(["a) Utilização indevida dos fundos;", "b) Prestação de informações falsas ou materialmente incorrectas;", "c) Incumprimento reiterado das prestações;", "d) Cancelamento ou inexistência do seguro obrigatório;", "e) Deterioração ou desaparecimento das garantias sem reposição adequada;", "f) Alienação não autorizada de bens dados em garantia; ou", "g) Ocorrência de qualquer outro facto grave que comprometa significativamente a recuperação do crédito."]);
  point("", "13.2.", "Declarado o vencimento antecipado, o MUTUÁRIO deverá proceder ao pagamento integral do saldo devedor, acrescido dos encargos contratualmente devidos e legalmente admissíveis.");
  point("14. Aplicação dos valores recuperados", "14.1.", `Os valores recebidos pela ${companyName} provenientes de pagamentos do MUTUÁRIO, indemnizações de seguros, execução de garantias ou outras formas de recuperação serão aplicados na regularização das obrigações do crédito, observando a ordem de imputação prevista no contrato e na legislação aplicável.`);
  point("", "14.2.", `A ${companyName} manterá registos adequados dos valores desembolsados, recebidos, recuperados e eventualmente indemnizados pela seguradora, de modo a permitir o acompanhamento da utilização e recuperação do capital.`);
  point("15. Responsabilidade pela sustentabilidade do Fundo", "15.1.", "O MUTUÁRIO reconhece que o cumprimento pontual das suas obrigações contribui directamente para a preservação e continuidade do Fundo KMAD.");
  point("", "15.2.", `O MUTUÁRIO compromete-se, por isso, a cumprir rigorosamente as condições do financiamento, permitindo que os valores recuperados possam, nos termos do contrato com a ${companyName} e das regras aplicáveis ao uso do capital, continuar a beneficiar outros membros elegíveis da comunidade.`);
  point("", "15.3.", `A presente cláusula não prejudica os direitos da ${companyName} decorrentes dos Contratos celebrados com os clientes, nem limita as obrigações da ${companyName} perante os seus clientes relativamente à administração, controlo, pagamento das prestações e preservação dos recursos disponibilizados.`);

  // Tabela de informação do mutuário
  doc.moveDown(1.2);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("Tabela de Prestação de Informação do Mutuário", { width, align: "center" });
  doc.moveDown(0.6);

  const plan = data.amortizations;
  const firstInstallment = plan[0] || {};
  const lastInstallment = plan[plan.length - 1] || {};
  const installValue = parseFloat(firstInstallment.installment) || 0;
  const lastDue = lastInstallment.dueDate ? fmtDateShort(lastInstallment.dueDate) : "-";

  const iw = width / 2;
  const y = drawTable(ctx, {
    x: left, y: doc.y, widths: [iw, iw], aligns: ["left", "left"],
    header: ["Item", "Informação"],
    rows: [
      [plainTextCell("Mutuário"), plainTextCell(String(cu?.getDataValue("customerName") || "-"))],
      [plainTextCell("Valor do crédito"), plainTextCell(fmtMoney(amount))],
      [plainTextCell("Prazo"), plainTextCell(`${numInstallments} meses`)],
      [plainTextCell("Taxa"), plainTextCell(`${rate}% ao mês`)],
      [plainTextCell("Finalidade"), plainTextCell("-")],
      [plainTextCell("Garantia"), plainTextCell("-")],
      [plainTextCell("Seguro de vida/crédito"), plainTextCell("Não")],
      [plainTextCell("Capital seguro"), plainTextCell(fmtMoney(amount))],
      [plainTextCell("Seguro do bem"), plainTextCell("Não")],
      [plainTextCell("Beneficiário"), plainTextCell(`${companyName} até ao saldo devedor`)],
      [plainTextCell("Prestação mensal"), plainTextCell(fmtMoney(installValue))],
      [plainTextCell("Data do desembolso"), plainTextCell(fmtDateShort(l.getDataValue("dateCreated")))],
      [plainTextCell("Data do vencimento"), plainTextCell(lastDue)],
    ],
    fontSize: 8, padY: 3,
  });
  doc.y = y + 15;
};

// ── Pipeline: cria o doc, chama o builder, devolve o Buffer ────────────

const LANDSCAPE_DOCS = new Set(["extracto"]);

export const renderLegalDoc = async (tipo: string, data: LegalDocsData): Promise<Buffer> => {
  const landscape = LANDSCAPE_DOCS.has(tipo);
  const doc = new PDFDocument({
    size: "A4",
    layout: landscape ? "landscape" : "portrait",
    margin: landscape ? 30 : 40,
    bufferPages: true,
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve) => doc.on("end", resolve));

  const ctx: Ctx = {
    doc,
    left: doc.page.margins.left,
    right: doc.page.width - doc.page.margins.right,
    contentBottom: doc.page.height - doc.page.margins.bottom - (landscape ? 20 : 24),
    company: data.company,
  };

  switch (tipo) {
    case "contrato": buildContratoConcessao(ctx, data); break;
    case "termo": buildTermoCompromisso(ctx, data); break;
    case "garantias": buildDeclaracaoGarantias(ctx, data); break;
    case "extracto": buildExtractoCredito(ctx, data); break;
    default: throw new Error(`Tipo de documento desconhecido: ${tipo}`);
  }

  drawFooters(ctx);
  doc.end();
  await done;
  return Buffer.concat(chunks);
};
