"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.getBMReportExcel = exports.getBMReport = void 0;
const sequelize_1 = require("sequelize");
const moment_1 = __importDefault(require("moment"));
const exceljs_1 = __importDefault(require("exceljs"));
const CompanyModel_1 = require("../database/models/CompanyModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const LoanModel_1 = require("../database/models/LoanModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
function formatDateBR(date) {
    if (!date)
        return "-";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}
/**
 * GET /api/reports/banco-mocambique/:companyId
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
 *
 * Gera dados para o relatório obrigatório do Banco de Moçambique
 */
const getBMReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const { from, to } = req.query;
        const companyIdNum = parseInt(String(companyId), 10);
        if (Number.isNaN(companyIdNum) || companyIdNum <= 0) {
            return res.status(400).json({ success: false, message: "companyId inválido." });
        }
        // 1. Buscar dados da empresa
        const company = yield CompanyModel_1.CompanyModel.findByPk(companyIdNum);
        if (!company) {
            return res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
        const companyData = company.toJSON();
        // 2. Buscar província
        let provinceName = "";
        try {
            const { ProvinceModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/ProvinceModel")));
            const province = yield ProvinceModel.findByPk(companyData.provinceId);
            if (province) {
                provinceName = province.toJSON().name || "";
            }
        }
        catch (_a) { }
        // 3. Buscar créditos do período — desembolsados (status 1) e terminados (status 3)
        const loanWhere = {
            companyId: companyIdNum,
            status: { [sequelize_1.Op.in]: [1, 3] },
            [sequelize_1.Op.and]: [
                { disbursementDate: { [sequelize_1.Op.not]: null } },
                { disbursementDate: { [sequelize_1.Op.ne]: "" } },
            ],
        };
        // Filtrar exclusivamente pelo campo real de desembolso do crédito.
        if (from && to) {
            loanWhere[sequelize_1.Op.and].push({ disbursementDate: {
                    [sequelize_1.Op.between]: [String(from), String(to)],
                } });
        }
        else if (from) {
            loanWhere[sequelize_1.Op.and].push({ disbursementDate: { [sequelize_1.Op.gte]: String(from) } });
        }
        else if (to) {
            loanWhere[sequelize_1.Op.and].push({ disbursementDate: { [sequelize_1.Op.lte]: String(to) } });
        }
        const loans = yield LoanModel_1.LoanModel.findAll({
            where: loanWhere,
            order: [["id", "ASC"]],
        });
        // 4. Para cada crédito, buscar cliente, amortizações e transações
        const reportData = [];
        for (const loan of loans) {
            const loanData = loan.toJSON();
            // Buscar cliente
            const customer = yield CustomerModel_1.CustomerModel.findOne({
                where: {
                    companyId: companyIdNum,
                    accountNumber: loanData.accountNumber,
                },
            });
            const customerData = customer ? customer.toJSON() : null;
            // Buscar amortizações do crédito (ordem cronológica por vencimento)
            const amortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
                where: {
                    companyId: companyIdNum,
                    loanId: loanData.id,
                },
                order: [["dueDate", "ASC"], ["id", "ASC"]],
            });
            const amortList = amortizations.map((a) => a.toJSON());
            const company = yield CompanyModel_1.CompanyModel.findByPk(companyIdNum, { attributes: ["forfeit"] });
            const calculatedAmortizations = (0, calculateLateAmount_1.installmentPanification)(amortList, Number((company === null || company === void 0 ? void 0 : company.getDataValue("forfeit")) || 0));
            // Buscar transações reais do crédito
            const transactions = yield TranzactionModel_1.TranzactionModel.findAll({
                where: {
                    companyId: companyIdNum,
                    loanId: loanData.id,
                },
            });
            const txList = transactions.map((t) => t.toJSON());
            // Primeira prestação (para valor da prestação)
            const firstInstallment = amortList[0];
            // Última prestação (para prazo de reembolso)
            const lastInstallment = amortList[amortList.length - 1];
            // Prestações em atraso (status = 0 e data vencida)
            const now = (0, moment_1.default)();
            const overdueInstallments = calculatedAmortizations.filter((a) => {
                if (![0, -1].includes(Number(a.status)))
                    return false;
                const dueDate = (0, moment_1.default)(a.dueDate);
                return dueDate.isBefore(now, "day");
            });
            // Crédito em Atraso (11): soma das prestações vencidas + juros de mora
            const overdueAmount = overdueInstallments.reduce((sum, a) => sum + Math.max(0, (Number(a.installment) || 0) - (Number(a.paidAmount) || 0)) + (Number(a.latePaymentInterest) || 0), 0);
            // Máximo dias em atraso
            const maxDaysOverdue = overdueInstallments.reduce((max, a) => {
                const days = now.diff((0, moment_1.default)(a.dueDate), "days");
                return days > max ? days : max;
            }, 0);
            // =====================================================
            // CRÉDITO EM DÍVIDA (10):
            // Total (capital + juros) - valor total já liquidado
            // =====================================================
            // Total do crédito = soma de todas as prestações (capital + juros)
            const totalLoanWithInterest = amortList.reduce((sum, a) => sum + (Number(a.installment) || 0), 0);
            // Total já pago = soma dos valores das transações (amount = valor efectivamente pago)
            const totalPaid = txList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            // Crédito em dívida = Total - Pago
            const creditInDebt = Math.max(0, Math.round((totalLoanWithInterest - totalPaid) * 100) / 100);
            reportData.push({
                // (1) N° da Operação
                operationNumber: loanData.id,
                // (2) Nome do Cliente
                customerName: (customerData === null || customerData === void 0 ? void 0 : customerData.customerName) || "-",
                // (3) Data Desembolso
                disbursementDate: formatDateBR(loanData.disbursementDate),
                // (4) Montante do Desembolso
                disbursementAmount: Number(loanData.amount) || 0,
                // (5) Finalidade do Crédito — usar borrowerInfo.finalidade se disponível, senão loanDescription
                creditPurpose: (() => { try {
                    const bi = loanData.borrowerInfo ? (typeof loanData.borrowerInfo === 'string' ? JSON.parse(loanData.borrowerInfo) : loanData.borrowerInfo) : null;
                    return (bi === null || bi === void 0 ? void 0 : bi.finalidade) || loanData.loanDescription || '-';
                }
                catch (_a) {
                    return loanData.loanDescription || '-';
                } })(),
                // (6) Valor da Prestação
                installmentValue: firstInstallment ? Number(firstInstallment.installment) || 0 : 0,
                // (7) Periodicidade dos Pagamentos
                paymentFrequency: "Mensal",
                // (8) Prazo de Reembolso
                repaymentDate: lastInstallment ? formatDateBR(lastInstallment.dueDate) : "-",
                // (9) Taxa de Juro
                interestRate: Number(loanData.interestRate) * 100,
                // (10) Crédito em Dívida = Total (capital+juros) - Total pago
                creditInDebt: creditInDebt,
                // (11) Crédito em Atraso
                creditOverdue: Math.round(overdueAmount * 100) / 100,
                // (12) Dias em Atraso
                daysOverdue: maxDaysOverdue,
                // (13) PPEs
                ppe: (customerData === null || customerData === void 0 ? void 0 : customerData.customerPPE) === 1 ? "Sim" : "Não",
                // Extras para display
                status: loanData.status,
            });
        }
        // 5. Calcular totais
        const totals = {
            disbursementAmount: reportData.reduce((sum, r) => sum + r.disbursementAmount, 0),
            installmentValue: reportData.reduce((sum, r) => sum + r.installmentValue, 0),
            creditInDebt: reportData.reduce((sum, r) => sum + r.creditInDebt, 0),
            creditOverdue: reportData.reduce((sum, r) => sum + r.creditOverdue, 0),
        };
        return res.status(200).json({
            success: true,
            company: {
                name: companyData.companyName || "",
                address: companyData.companyAddress || "",
                province: provinceName,
                phone: companyData.companyPhone || "",
                email: companyData.companyEmail || "",
                nuit: companyData.companyNuit || "",
                manager: companyData.companyManager || "",
            },
            reportData,
            totals,
            period: {
                from: from ? String(from) : null,
                to: to ? String(to) : null,
            },
        });
    }
    catch (error) {
        console.error("Erro ao gerar relatório BM:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao gerar relatório.",
        });
    }
});
exports.getBMReport = getBMReport;
// =====================================================================
// GET /api/reports/banco-mocambique/:companyId/excel
// Download do .xlsx com bordas/fontes REAIS (exceljs), cópia fiel do
// modelo Reporte_BM_Mensal_*.xlsx (CARTEIRA DE CRÉDITO MENSAL).
// Query: from, to (YYYY-MM-DD) + campos manuais opcionais do cabeçalho.
// =====================================================================
const getBMReportExcel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const q = req.query;
        const companyIdNum = parseInt(String(companyId), 10);
        if (Number.isNaN(companyIdNum) || companyIdNum <= 0) {
            return res.status(400).json({ success: false, message: "companyId inválido." });
        }
        // --- dados da empresa (cabeçalho) ---
        const company = yield CompanyModel_1.CompanyModel.findByPk(companyIdNum);
        if (!company)
            return res.status(404).json({ success: false, message: "Empresa não encontrada." });
        const c = company.toJSON();
        let provinceName = "";
        try {
            const { ProvinceModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/ProvinceModel")));
            const p = yield ProvinceModel.findByPk(c.provinceId);
            if (p)
                provinceName = p.toJSON().name || "";
        }
        catch (_b) { }
        const esc = (v) => (v === undefined || v === null ? "" : String(v));
        const hdr = {
            denominacao: esc(c.companyName),
            endereco: esc(c.companyAddress),
            bairro: esc(q.neighborhood),
            cidade: esc(q.city),
            estado: esc(q.state),
            provincia: provinceName,
            telefone: esc(c.companyPhone),
            telemovel: esc(q.mobile),
            email: esc(c.companyEmail),
            trabalhadores: esc(q.numberOfEmployees),
            inicio: esc(q.activityStartDate),
            responsavel: esc(c.companyManager),
            representadas: esc(q.represented) || esc(c.companyManager),
        };
        // --- créditos do período (mesma lógica do relatório JSON) ---
        const from = q.from ? String(q.from) : null;
        const to = q.to ? String(q.to) : null;
        const loanWhere = {
            companyId: companyIdNum,
            status: { [sequelize_1.Op.in]: [1, 3] },
            [sequelize_1.Op.and]: [{ disbursementDate: { [sequelize_1.Op.not]: null } }, { disbursementDate: { [sequelize_1.Op.ne]: "" } }],
        };
        if (from && to)
            loanWhere[sequelize_1.Op.and].push({ disbursementDate: { [sequelize_1.Op.between]: [from, to] } });
        else if (from)
            loanWhere[sequelize_1.Op.and].push({ disbursementDate: { [sequelize_1.Op.gte]: from } });
        else if (to)
            loanWhere[sequelize_1.Op.and].push({ disbursementDate: { [sequelize_1.Op.lte]: to } });
        const loans = yield LoanModel_1.LoanModel.findAll({ where: loanWhere, order: [["id", "ASC"]] });
        const companyRow = yield CompanyModel_1.CompanyModel.findByPk(companyIdNum, { attributes: ["forfeit"] });
        const forfeit = Number((companyRow === null || companyRow === void 0 ? void 0 : companyRow.getDataValue("forfeit")) || 0);
        const now = (0, moment_1.default)();
        const rows = [];
        for (const loan of loans) {
            const l = loan.toJSON();
            const customer = yield CustomerModel_1.CustomerModel.findOne({ where: { companyId: companyIdNum, accountNumber: l.accountNumber } });
            const cd = customer ? customer.toJSON() : null;
            const amortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
                where: { companyId: companyIdNum, loanId: l.id },
                order: [["dueDate", "ASC"], ["id", "ASC"]],
            });
            const amortList = amortizations.map((a) => a.toJSON());
            const calculated = (0, calculateLateAmount_1.installmentPanification)(amortList, forfeit);
            const transactions = yield TranzactionModel_1.TranzactionModel.findAll({ where: { companyId: companyIdNum, loanId: l.id } });
            const txList = transactions.map((t) => t.toJSON());
            const first = amortList[0];
            const last = amortList[amortList.length - 1];
            const overdue = calculated.filter((a) => [0, -1].includes(Number(a.status)) && (0, moment_1.default)(a.dueDate).isBefore(now, "day"));
            const overdueAmount = overdue.reduce((s, a) => s + Math.max(0, (Number(a.installment) || 0) - (Number(a.paidAmount) || 0)) + (Number(a.latePaymentInterest) || 0), 0);
            const maxDays = overdue.reduce((m, a) => Math.max(m, now.diff((0, moment_1.default)(a.dueDate), "days")), 0);
            const totalWithInterest = amortList.reduce((s, a) => s + (Number(a.installment) || 0), 0);
            const totalPaid = txList.reduce((s, t) => s + (Number(t.amount) || 0), 0);
            const creditInDebt = Math.max(0, Math.round((totalWithInterest - totalPaid) * 100) / 100);
            const purpose = (() => { try {
                const bi = l.borrowerInfo ? (typeof l.borrowerInfo === "string" ? JSON.parse(l.borrowerInfo) : l.borrowerInfo) : null;
                return (bi === null || bi === void 0 ? void 0 : bi.finalidade) || l.loanDescription || "-";
            }
            catch (_a) {
                return l.loanDescription || "-";
            } })();
            rows.push({
                op: String(l.id), name: (cd === null || cd === void 0 ? void 0 : cd.customerName) || "-", disbDate: formatDateBR(l.disbursementDate),
                disbAmount: Number(l.amount) || 0, purpose, installment: first ? Number(first.installment) || 0 : 0,
                frequency: "Mensal", repayDate: last ? formatDateBR(last.dueDate) : "-",
                rate: Number(l.interestRate) * 100, creditInDebt, creditOverdue: Math.round(overdueAmount * 100) / 100,
                days: maxDays, ppe: (cd === null || cd === void 0 ? void 0 : cd.customerPPE) === 1 ? "Sim" : "Não",
            });
        }
        const totalDisb = rows.reduce((s, r) => s + r.disbAmount, 0);
        // --- construir workbook ---
        const wb = new exceljs_1.default.Workbook();
        const ws = wb.addWorksheet("CARTEIRA DE CRÉDITO MENSAL", { views: [{ showGridLines: false }] });
        const FONT = "Calibri";
        const NCOLS = 13;
        const widths = [15, 28, 17, 20, 18, 17, 22, 17, 12, 18, 18, 13, 9];
        widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
        const thin = { style: "thin", color: { argb: "FF000000" } };
        const allBorders = { top: thin, bottom: thin, left: thin, right: thin };
        const put = (r, cIdx, value, opt = {}) => {
            var _a, _b;
            const cell = ws.getCell(r, cIdx);
            cell.value = value;
            cell.font = { name: FONT, size: (_a = opt.size) !== null && _a !== void 0 ? _a : 9, bold: !!opt.bold, italic: !!opt.italic };
            cell.alignment = { horizontal: (_b = opt.align) !== null && _b !== void 0 ? _b : "left", vertical: "middle", wrapText: !!opt.wrap };
            if (opt.fill)
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opt.fill } };
            if (opt.border)
                cell.border = allBorders;
            if (opt.numFmt)
                cell.numFmt = opt.numFmt;
        };
        const mergeRow = (r, text, opt = {}) => {
            ws.mergeCells(r, 1, r, 12);
            put(r, 1, text, opt);
        };
        // Cabeçalho institucional
        let r = 2;
        mergeRow(r++, "BANCO DE MOÇAMBIQUE", { bold: true, size: 14 });
        mergeRow(r++, "DEPARTAMENTO DE SUPERVISÃO PRUDENCIAL", { bold: true, size: 11 });
        mergeRow(r++, "REPORTE PERIÓDICO DE INFORMAÇÕES DE MICROFINANÇAS", { bold: true, size: 11 });
        mergeRow(r++, "INSTITUIÇÕES SUJEITAS À MONITORIZAÇÃO", { bold: true, size: 11 });
        r = 9;
        const pf = (from || "").split("-").reverse().join("/");
        const pt = (to || "").split("-").reverse().join("/");
        mergeRow(r++, `PERÍODO DE REPORTE: ${pf} a ${pt}`, { bold: true, size: 10 });
        mergeRow(r++, `DATA: ${formatDateBR(new Date())} (DD/MM/AAAA)`, { bold: true, size: 10 });
        r = 13;
        mergeRow(r++, "1. IDENTIFICAÇÃO DA INSTITUIÇÃO", { bold: true, size: 11, fill: "FFD9D9D9" });
        mergeRow(r++, `Denominação: ${hdr.denominacao}`, { size: 10 });
        mergeRow(r++, `Endereço: ${hdr.endereco}${hdr.bairro ? "  Bairro: " + hdr.bairro : ""}${hdr.cidade ? "  Cidade: " + hdr.cidade : ""}${hdr.estado ? "  Estado: " + hdr.estado : ""}`, { size: 10 });
        mergeRow(r++, `Província: ${hdr.provincia}`, { size: 10 });
        mergeRow(r++, `Telefone: ${hdr.telefone}${hdr.telemovel ? "   Telemóvel: " + hdr.telemovel : ""}`, { size: 10 });
        mergeRow(r++, `E-mail: ${hdr.email}`, { size: 10 });
        mergeRow(r++, `Nº de Trabalhadores: ${hdr.trabalhadores}`, { size: 10 });
        mergeRow(r++, `Data de Início das Actividades: ${hdr.inicio}`, { size: 10 });
        mergeRow(r++, `Nome do Responsável pela Gestão da Instituição: ${hdr.responsavel}`, { size: 10 });
        mergeRow(r++, `Instituição(ões) Representada(s): ${hdr.representadas}`, { size: 10 });
        r = 27;
        put(r, 9, "(Valores em Meticais)", { size: 9, italic: true });
        r++;
        // Cabeçalho da grelha (linha 28)
        const headers = ["Nº da Operação (1)", "Nome do Cliente (2)", "Data de Desembolso (3)", "Montante do Desembolso (4)", "Finalidade do Crédito (5)", "Valor da Prestação (6)", "Periodicidade dos Pagamentos (7)", "Prazo de Reembolso (8)", "Taxa de Juro (9)", "Crédito em Dívida (10)", "Crédito em Em Atraso (11)", "Dias em Atraso (12)", "PPEs (13)"];
        headers.forEach((h, i) => put(r, i + 1, h, { bold: true, size: 9, align: "center", wrap: true, fill: "FFBFBFBF", border: true }));
        ws.getRow(r).height = 42;
        r++;
        // Linhas de dados
        rows.forEach((d) => {
            put(r, 1, d.op, { align: "center", border: true });
            put(r, 2, d.name, { align: "left", border: true });
            put(r, 3, d.disbDate, { align: "center", border: true });
            put(r, 4, d.disbAmount, { align: "right", border: true, numFmt: "#,##0.00" });
            put(r, 5, d.purpose, { align: "left", border: true });
            put(r, 6, d.installment, { align: "right", border: true, numFmt: "#,##0.00" });
            put(r, 7, d.frequency, { align: "center", border: true });
            put(r, 8, d.repayDate, { align: "center", border: true });
            put(r, 9, `${d.rate.toFixed(2)}%`, { align: "center", border: true });
            put(r, 10, d.creditInDebt, { align: "right", border: true, numFmt: "#,##0.00" });
            put(r, 11, d.creditOverdue, { align: "right", border: true, numFmt: "#,##0.00" });
            put(r, 12, d.days, { align: "center", border: true });
            put(r, 13, d.ppe, { align: "center", border: true });
            r++;
        });
        // TOTAL DO DESEMBOLSO
        put(r, 3, "TOTAL DO DESEMBOLSO =", { bold: true, size: 10, align: "right", fill: "FFD9D9D9", border: true });
        put(r, 4, totalDisb, { bold: true, size: 10, align: "right", fill: "FFD9D9D9", border: true, numFmt: "#,##0.00" });
        for (let i = 1; i <= NCOLS; i++) {
            if (i !== 3 && i !== 4)
                put(r, i, "", { fill: "FFD9D9D9", border: true });
        }
        r += 2;
        // Notas explicativas
        put(r++, 1, "Notas Explicativas", { bold: true, size: 10 });
        const notes = [
            "1- Número da operação de crédito", "2- Nome do cliente", "3- Data de desembolso inicial",
            "4- Valor do crédito concedido", "5- Finalidade de crédito desembolsado, designadamente para empresas, consumo ou habitação",
            "6- Montante da prestação periódica para amortizar o crédito", "7- Periodicidade dos pagamentos, indica se são diária, semanal, mensal ou anual",
            "8- Data de vencimento do crédito desembolsado", "9- Percentagem da taxa de juro aplicada ao crédito",
            "10- Montante do crédito desembolsado que falta pagar, excluindo prestações em atraso",
            "11- Montante das prestações em atraso incluindo capital e juros", "12- Dias em atraso do pagamento das prestações",
            "13- Crédito concedido a pessoas politicamente expostas",
        ];
        notes.forEach((n) => put(r++, 1, n, { size: 9 }));
        // --- enviar como download ---
        const fileName = `Reporte_BM_Mensal_${pf.replace(/\//g, "-")}_a_${pt.replace(/\//g, "-")}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
        yield wb.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error("Erro ao gerar Excel BM:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message || "Erro ao gerar Excel." });
        }
    }
});
exports.getBMReportExcel = getBMReportExcel;
