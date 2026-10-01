"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWorkbook = exports.buildGridWorkbook = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const FONT = "Calibri";
const NUMFMT = "#,##0.00";
const HEADER_FILL = "FFBFBFBF"; // cinzento (como o relatório BM)
const TOTAL_FILL = "FFD9D9D9";
const thin = { style: "thin", color: { argb: "FF000000" } };
const ALL_BORDERS = { top: thin, bottom: thin, left: thin, right: thin };
function buildGridWorkbook(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { title, sheetName, columns, rows, totalLabel } = input;
        const wb = new exceljs_1.default.Workbook();
        const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
        columns.forEach((col, i) => {
            var _a;
            ws.getColumn(i + 1).width = (_a = col.width) !== null && _a !== void 0 ? _a : 18;
        });
        const put = (r, cIdx, value, opt = {}) => {
            var _a, _b;
            const cell = ws.getCell(r, cIdx);
            cell.value = value;
            cell.font = { name: FONT, size: (_a = opt.size) !== null && _a !== void 0 ? _a : 9, bold: !!opt.bold, italic: !!opt.italic };
            cell.alignment = { horizontal: (_b = opt.align) !== null && _b !== void 0 ? _b : "left", vertical: "middle", wrapText: !!opt.wrap };
            if (opt.fill)
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opt.fill } };
            if (opt.border)
                cell.border = ALL_BORDERS;
            if (opt.numFmt)
                cell.numFmt = opt.numFmt;
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
                var _a;
                const raw = row[col.key];
                const value = col.money ? Number(raw) || 0 : (raw === undefined || raw === null || raw === "" ? "-" : String(raw));
                put(r, i + 1, value, {
                    align: (_a = col.align) !== null && _a !== void 0 ? _a : (col.money ? "right" : "left"),
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
                }
                else if (col.money) {
                    const sum = rows.reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0);
                    put(r, i + 1, Math.round(sum * 100) / 100, { bold: true, size: 10, align: "right", fill: TOTAL_FILL, border: true, numFmt: NUMFMT });
                }
                else {
                    put(r, i + 1, "", { fill: TOTAL_FILL, border: true });
                }
            });
        }
        return (yield wb.xlsx.writeBuffer());
    });
}
exports.buildGridWorkbook = buildGridWorkbook;
/** Envia o workbook como download no response Express. */
function sendWorkbook(res, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const buffer = yield buildGridWorkbook(input);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${input.fileName}"`);
        res.send(buffer);
    });
}
exports.sendWorkbook = sendWorkbook;
