import ExcelJS from "exceljs";

/**
 * Helper partilhado para exportação de grelhas em Excel (exceljs) com o mesmo
 * estilo visual do relatório do Banco de Moçambique: fonte Calibri, cabeçalho
 * de colunas a negrito com preenchimento cinzento, bordas finas em todas as
 * células, linha de TOTAL com preenchimento e formato numérico #,##0.00.
 */

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
  money?: boolean;
}

export interface ExcelExportInput {
  title: string;
  sheetName: string;
  columns: ExcelColumn[];
  rows: Record<string, any>[];
  fileName: string;
  totalLabel?: string;
}

const FONT = "Calibri";
const NUMFMT = "#,##0.00";
const HEADER_FILL = "FFBFBFBF"; // cinzento (como o relatório BM)
const TOTAL_FILL = "FFD9D9D9";

const thin = { style: "thin", color: { argb: "FF000000" } } as const;
const ALL_BORDERS = { top: thin, bottom: thin, left: thin, right: thin };

export async function buildGridWorkbook(input: ExcelExportInput): Promise<Buffer> {
  const { title, sheetName, columns, rows, totalLabel } = input;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });

  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width ?? 18;
  });

  const put = (r: number, cIdx: number, value: any, opt: any = {}) => {
    const cell = ws.getCell(r, cIdx);
    cell.value = value;
    cell.font = { name: FONT, size: opt.size ?? 9, bold: !!opt.bold, italic: !!opt.italic };
    cell.alignment = { horizontal: opt.align ?? "left", vertical: "middle", wrapText: !!opt.wrap };
    if (opt.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opt.fill } };
    if (opt.border) cell.border = ALL_BORDERS;
    if (opt.numFmt) cell.numFmt = opt.numFmt;
  };

  // Título + data de geração
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  let r = 1;
  ws.mergeCells(r, 1, r, columns.length);
  put(r, 1, title, { bold: true, size: 12 });
  r++;
  ws.mergeCells(r, 1, r, columns.length);
  put(r, 1, `Gerado em ${dateStr}`, { size: 9, italic: true });
  r += 2;

  // Cabeçalho da grelha
  columns.forEach((col, i) => {
    put(r, i + 1, col.header, { bold: true, size: 9, align: "center", wrap: true, fill: HEADER_FILL, border: true });
  });
  ws.getRow(r).height = 30;
  r++;

  // Linhas de dados
  rows.forEach((row) => {
    columns.forEach((col, i) => {
      const raw = row[col.key];
      const value = col.money ? Number(raw) || 0 : (raw === undefined || raw === null || raw === "" ? "-" : String(raw));
      put(r, i + 1, value, {
        align: col.align ?? (col.money ? "right" : "left"),
        border: true,
        numFmt: col.money ? NUMFMT : undefined,
      });
    });
    r++;
  });

  // Linha de TOTAL (soma das colunas monetárias)
  const hasMoney = columns.some((c) => c.money);
  if (hasMoney && rows.length > 0) {
    columns.forEach((col, i) => {
      if (i === 0) {
        put(r, 1, totalLabel || "TOTAL", { bold: true, size: 10, align: "left", fill: TOTAL_FILL, border: true });
      } else if (col.money) {
        const sum = rows.reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0);
        put(r, i + 1, Math.round(sum * 100) / 100, { bold: true, size: 10, align: "right", fill: TOTAL_FILL, border: true, numFmt: NUMFMT });
      } else {
        put(r, i + 1, "", { fill: TOTAL_FILL, border: true });
      }
    });
  }

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

/** Envia o workbook como download no response Express. */
export async function sendWorkbook(res: any, input: ExcelExportInput): Promise<void> {
  const buffer = await buildGridWorkbook(input);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${input.fileName}"`);
  res.send(buffer);
}
