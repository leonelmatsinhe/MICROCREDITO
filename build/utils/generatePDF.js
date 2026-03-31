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
exports.generateContrat = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const moment_1 = __importDefault(require("moment"));
moment_1.default.locale("pt-br");
function pick(row, key) {
    if (row && typeof row.getDataValue === "function") {
        return row.getDataValue(key);
    }
    return row === null || row === void 0 ? void 0 : row[key];
}
function formatMzn(n) {
    const num = typeof n === "number" ? n : parseFloat(String(n));
    if (Number.isNaN(num))
        return "—";
    return `${num.toLocaleString("pt-MZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} MZN`;
}
/** Gera PDF de resumo do contrato / plano de amortização (sem Puppeteer). */
const generateContrat = (company, customer, amortization) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    try {
        const outDir = path_1.default.join(process.cwd(), "uploads", "docs");
        yield fs_1.default.promises.mkdir(outDir, { recursive: true });
        const accountNumber = pick(customer, "accountNumber");
        const outPath = path_1.default.join(outDir, `${accountNumber}.pdf`);
        const doc = new pdfkit_1.default({ margin: 48, size: "A4" });
        const stream = fs_1.default.createWriteStream(outPath);
        doc.pipe(stream);
        doc.fontSize(16).text("Microcrédito — Documento resumo", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor("#555555").text(`Emitido em ${(0, moment_1.default)().format("LL")}`, {
            align: "center",
        });
        doc.fillColor("#000000");
        doc.moveDown();
        doc.fontSize(11).text("Entidade", { underline: true });
        doc.fontSize(10);
        doc.text(String((_a = company.companyName) !== null && _a !== void 0 ? _a : ""));
        doc.text(`Endereço: ${(_b = company.companyAddress) !== null && _b !== void 0 ? _b : "—"}`);
        doc.text(`Tel.: ${(_c = company.companyPhone) !== null && _c !== void 0 ? _c : "—"} | NUIT: ${(_d = company.companyNuit) !== null && _d !== void 0 ? _d : "—"}`);
        doc.text(`E-mail: ${(_e = company.companyEmail) !== null && _e !== void 0 ? _e : "—"}`);
        doc.text(`Responsável: ${(_f = company.companyManager) !== null && _f !== void 0 ? _f : "—"}`);
        doc.moveDown();
        doc.fontSize(11).text("Mutuário", { underline: true });
        doc.fontSize(10);
        doc.text(String((_g = customer.customerName) !== null && _g !== void 0 ? _g : ""));
        doc.text(`Conta n.º ${(_h = customer.accountNumber) !== null && _h !== void 0 ? _h : "—"}`);
        doc.text(`Morada: ${(_j = customer.customerAddress) !== null && _j !== void 0 ? _j : "—"}`);
        doc.text(`Telemóvel: ${(_k = customer.customerPhone) !== null && _k !== void 0 ? _k : "—"} | NUIT: ${(_l = customer.customerNuit) !== null && _l !== void 0 ? _l : "—"}`);
        doc.text(`Profissão: ${(_m = customer.customerProfession) !== null && _m !== void 0 ? _m : "—"}`);
        doc.text(`Local de trabalho: ${(_o = customer.customerLocalOfWork) !== null && _o !== void 0 ? _o : "—"}`);
        doc.moveDown();
        const rows = Array.isArray(amortization) ? amortization : [];
        doc.fontSize(11).text("Plano de amortização", { underline: true });
        doc.moveDown(0.3);
        if (rows.length === 0) {
            doc.fontSize(10).text("Sem linhas de prestação registadas.");
        }
        else {
            doc.fontSize(8).text("Pr. | Vencimento | Prestação | Juros | Saldo devedor | Estado");
            doc.moveDown(0.2);
            for (const row of rows) {
                const ord = pick(row, "installmentOrder");
                const due = pick(row, "dueDate");
                const inst = pick(row, "installment");
                const rate = pick(row, "rateAmount");
                const bal = pick(row, "remainingBalance");
                const st = pick(row, "status");
                const statusLabel = st === 0 ? "Pendente" : st === 1 ? "Paga" : String(st !== null && st !== void 0 ? st : "—");
                const balTxt = bal != null && bal !== "" ? formatMzn(bal) : "—";
                doc.fontSize(8).text(`${ord} | ${due !== null && due !== void 0 ? due : "—"} | ${formatMzn(inst)} | ${formatMzn(rate)} | ${balTxt} | ${statusLabel}`);
                if (doc.y > 720) {
                    doc.addPage();
                }
            }
        }
        doc.end();
        yield new Promise((resolve, reject) => {
            stream.on("finish", () => resolve());
            stream.on("error", reject);
        });
        return true;
    }
    catch (e) {
        console.error("Erro ao gerar PDF do contrato:", e);
        return false;
    }
});
exports.generateContrat = generateContrat;
