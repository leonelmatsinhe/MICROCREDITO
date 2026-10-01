import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getCurrentUser } from "../middlewares/roles";
import { CompanyModel } from "../database/models/CompanyModel";

/**
 * EXPORTAÇÃO GENÉRICA DE RELATÓRIOS TABELARES — PDF NO BACKEND
 * ---------------------------------------------------------------------------
 * REGRA: documento PDF nunca é gerado no browser. Todas as grelhas
 * (Caixa, Pagamentos, Mutuários, Créditos, Prestações, BM, SMS…) passam a
 * pedir este endpoint com { title, subtitle, columns, rows, orientation,
 * filename, totals } e recebem o PDF pronto (Content-Type application/pdf).
 * Substitui todos os `pdfMake.createPdf(...)` do frontend — removidos.
 */

type TablePdfColumn = {
  label: string;
  /** largura em pontos; por omissão divide o espaço restante igualmente */
  width?: number;
  align?: "left" | "right" | "center";
};

type TablePdfBody = {
  title: string;
  subtitle?: string;
  columns: TablePdfColumn[];
  rows: (string | number | null | undefined)[][];
  /** linha final destacada (ex.: totais) — mesma largura das colunas */
  totalsRow?: (string | number | null | undefined)[] | null;
  /** "portrait" (default) ou "landscape" */
  orientation?: "portrait" | "landscape";
  filename?: string;
  /** filtros/parâmetros do relatório impressos sob o título */
  meta?: string[];
};

const MAX_ROWS = 5000;
const MAX_COLS = 16;

const cellText = (value: any): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return value.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
};

/** Nome de ficheiro seguro (sem caracteres de caminho). */
const safeFileName = (name: string | undefined, title: string): string => {
  const base = String(name || title || "relatorio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "relatorio"}-${new Date().toISOString().slice(0, 10)}.pdf`;
};

const tablePdf = async (req: Request, res: Response) => {
  try {
    const body = req.body as TablePdfBody;
    if (!body || !Array.isArray(body.columns) || body.columns.length === 0 || !Array.isArray(body.rows)) {
      return res.status(400).json({
        success: false,
        message: "Corpo inválido: envia { title, columns, rows }.",
      });
    }
    if (body.columns.length > MAX_COLS || body.rows.length > MAX_ROWS) {
      return res.status(413).json({
        success: false,
        message: `Limite excedido: máximo ${MAX_COLS} colunas e ${MAX_ROWS} linhas.`,
      });
    }

    const user = getCurrentUser(req);
    const companyId = Number(user?.companyId || req.body?.companyId || 0);
    const empresa: any = companyId
      ? (await CompanyModel.findByPk(companyId, { raw: true })) || {}
      : {};

    const orientation = body.orientation === "landscape" ? "landscape" : "portrait";
    const fileName = safeFileName(body.filename, body.title);

    const doc = new PDFDocument({
      margin: 36,
      size: "A4",
      layout: orientation,
      bufferPages: true,
      info: {
        Title: body.title,
        Author: empresa.companyName || "MBRM",
        Creator: "MBRM v2.0 Cert AT 2026/001",
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Cache-Control", "no-store");
    doc.pipe(res);

    const left = doc.page.margins.left;
    const pageWidth = doc.page.width - left - doc.page.margins.right;
    const contentBottom = doc.page.height - doc.page.margins.bottom - 24;

    // ── Cabeçalho: empresa + título + meta ──
    doc.fillColor("#0f6b2f").font("Helvetica-Bold").fontSize(13);
    doc.text(String(empresa.companyName || "MBR Microcrédito"), left, 40, { width: pageWidth * 0.7 });
    doc.fillColor("#555555").font("Helvetica").fontSize(8);
    const nuitLinha = `NUIT: ${empresa.companyNuit || "—"}${empresa.companyPhone ? `  ·  Tel.: ${empresa.companyPhone}` : ""}`;
    doc.text(nuitLinha, left, 58, { width: pageWidth * 0.7 });
    doc
      .fillColor("#1f2937")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(String(body.title), left, 78, { width: pageWidth });
    let y = doc.y + 4;
    const metaLines = [
      ...(Array.isArray(body.meta) ? body.meta.filter(Boolean).map(String) : []),
      body.subtitle ? String(body.subtitle) : "",
    ].filter(Boolean);
    if (metaLines.length > 0) {
      doc.fillColor("#666666").font("Helvetica").fontSize(8);
      doc.text(metaLines.join("  ·  "), left, y, { width: pageWidth });
      y = doc.y + 6;
    } else {
      y += 8;
    }
    doc
      .moveTo(left, y)
      .lineTo(left + pageWidth, y)
      .strokeColor("#0f6b2f")
      .lineWidth(1)
      .stroke();
    y += 12;

    // ── Larguras de coluna ──
    const fixedTotal = body.columns.reduce((sum, col) => sum + (Number(col.width) || 0), 0);
    const remaining = Math.max(0, pageWidth - fixedTotal);
    const flexibleCount = body.columns.filter((col) => !Number(col.width)).length;
    const flexibleWidth = flexibleCount > 0 ? remaining / flexibleCount : 0;
    const colX: number[] = [];
    const colW: number[] = [];
    let cursor = left;
    body.columns.forEach((col) => {
      colX.push(cursor);
      const w = Number(col.width) || flexibleWidth;
      colW.push(w);
      cursor += w;
    });

    const alignOf = (col: TablePdfColumn): "left" | "right" | "center" =>
      col.align || (typeof col === "object" ? "left" : "left");

    const drawHeader = () => {
      doc.rect(left, y, pageWidth, 18).fill("#0f6b2f");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
      body.columns.forEach((col, index) => {
        doc.text(String(col.label), colX[index] + 4, y + 5, {
          width: colW[index] - 8,
          align: alignOf(col),
          lineBreak: false,
          ellipsis: true,
          height: 12,
        });
      });
      y += 18;
    };
    drawHeader();

    // ── Linhas (zebra + paginação automática) ──
    const LINE = 15;
    body.rows.forEach((row, rowIndex) => {
      if (y + LINE > contentBottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }
      if (rowIndex % 2 === 1) {
        doc.rect(left, y, pageWidth, LINE).fill("#f3faf3");
      }
      doc.fillColor("#1f2937").font("Helvetica").fontSize(7.5);
      body.columns.forEach((col, index) => {
        doc.text(cellText(row[index]), colX[index] + 4, y + 4, {
          width: colW[index] - 8,
          align: alignOf(col),
          lineBreak: false,
          ellipsis: true,
          height: 12,
        });
      });
      y += LINE;
    });

    // ── Linha de totais ──
    if (body.totalsRow && body.totalsRow.length > 0) {
      if (y + 18 > contentBottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }
      doc.rect(left, y, pageWidth, 18).fill("#e8f5e9");
      doc.fillColor("#0b4f23").font("Helvetica-Bold").fontSize(7.8);
      body.columns.forEach((col, index) => {
        doc.text(cellText(body.totalsRow![index]), colX[index] + 4, y + 5, {
          width: colW[index] - 8,
          align: alignOf(col),
          lineBreak: false,
          ellipsis: true,
          height: 12,
        });
      });
      y += 18;
    }

    // ── Rodapé fixo em todas as páginas ──
    const range = doc.bufferedPageRange();
    for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      const footerY = doc.page.height - doc.page.margins.bottom - 14;
      doc
        .strokeColor("#e0e0e0")
        .lineWidth(0.6)
        .moveTo(left, footerY - 4)
        .lineTo(left + pageWidth, footerY - 4)
        .stroke();
      doc.fillColor("#888888").font("Helvetica").fontSize(7);
      doc.text(
        `Emitido por ${user?.userName || user?.email || "sistema"} — MBRM v2.0 Cert AT 2026/001`,
        left,
        footerY,
        { width: pageWidth * 0.7, lineBreak: false }
      );
      doc.text(
        `Página ${pageIndex - range.start + 1} de ${range.count}`,
        left,
        footerY,
        { width: pageWidth, align: "right", lineBreak: false }
      );
    }

    doc.end();
  } catch (error: any) {
    console.error("[TablePDF] Erro ao gerar relatório:", error?.message || error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "Erro ao gerar o PDF do relatório." });
    }
    return res.end();
  }
};

export { tablePdf };
export type { TablePdfBody };
