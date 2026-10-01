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
exports.buildWorkbook = exports.getWalletsBreakdown = exports.sendFinancierReportEmail = exports.getFinancierReportExcel = exports.getFinancierReport = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const CompanyModel_1 = require("../database/models/CompanyModel");
const partnerPortalService_1 = require("../services/partnerPortalService");
const financingWalletService_1 = require("../services/financingWalletService");
/**
 * RELATÓRIO DE FINANCIADOR (parceiro) e DESAGREGAÇÃO INTERNA DO BM
 * ---------------------------------------------------------------
 * · Relatório BM (oficial): TODOS os desembolsos, sem discriminar carteiras.
 *   A desagregação por carteira existe apenas como ferramenta interna
 *   (endpoint /api/reports/wallets-breakdown) e nunca entra no ficheiro BM.
 * · Relatório de financiador: APENAS os desembolsos e recebimentos da carteira
 *   do parceiro, com 2 tabelas (aba Desembolsos + aba Recebimentos), exportável
 *   para Excel e enviável por e-mail ao parceiro.
 */
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const num = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
const formatDate = (value) => {
    if (!value)
        return "—";
    const iso = String(value).slice(0, 10);
    const [year, month, day] = iso.split("-");
    return year && month && day ? `${day}/${month}/${year}` : String(value);
};
const readParams = (req) => ({
    from: req.query.from ? String(req.query.from).slice(0, 10) : undefined,
    to: req.query.to ? String(req.query.to).slice(0, 10) : undefined,
});
/** Estilo comum das células dos relatórios. */
const buildWorkbook = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { company, wallet, statement, period } = params;
    const wb = new exceljs_1.default.Workbook();
    wb.creator = "MBRM — Sistema de Microcrédito";
    wb.created = new Date();
    const thin = { style: "thin", color: { argb: "FF9E9E9E" } };
    const border = { top: thin, bottom: thin, left: thin, right: thin };
    const headerRow = (ws, title, columns) => {
        ws.mergeCells(1, 1, 1, columns.length);
        const titleCell = ws.getCell(1, 1);
        titleCell.value = title;
        titleCell.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF1B5E20" } };
        ws.mergeCells(2, 1, 2, columns.length);
        const subtitle = ws.getCell(2, 1);
        subtitle.value =
            `${(company === null || company === void 0 ? void 0 : company.companyName) || "MBRM"} · NUIT: ${(company === null || company === void 0 ? void 0 : company.companyNuit) || "—"} · ` +
                `Carteira: ${(wallet === null || wallet === void 0 ? void 0 : wallet.codigo) || "—"} — ${(wallet === null || wallet === void 0 ? void 0 : wallet.nome) || ""}` +
                ((wallet === null || wallet === void 0 ? void 0 : wallet.parceiro_nome) ? ` · Parceiro: ${wallet.parceiro_nome}` : "") +
                ` · Período: ${period.from ? formatDate(period.from) : "início"} a ${period.to ? formatDate(period.to) : "hoje"}`;
        subtitle.font = { name: "Calibri", size: 9.5, italic: true };
        let summary = "";
        if (wallet && wallet.allocated_amount !== null && wallet.allocated_amount !== undefined) {
            summary =
                `Capital alocado: ${num(wallet.allocated_amount).toFixed(2)} MT · ` +
                    `Desembolsado: ${num(wallet.disbursed).toFixed(2)} MT · ` +
                    `Saldo analítico: ${num(wallet.saldo_analitico).toFixed(2)} MT`;
        }
        else {
            summary = `Carteira sem limite analítico definido · Desembolsado: ${num(wallet === null || wallet === void 0 ? void 0 : wallet.disbursed).toFixed(2)} MT`;
        }
        ws.mergeCells(3, 1, 3, columns.length);
        const summaryCell = ws.getCell(3, 1);
        summaryCell.value = summary;
        summaryCell.font = { name: "Calibri", size: 9.5, bold: true };
        const header = ws.getRow(5);
        columns.forEach(([label], index) => {
            const cell = header.getCell(index + 1);
            cell.value = label;
            cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B5E20" } };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.border = border;
            ws.getColumn(index + 1).width = columns[index][1];
        });
        header.height = 22;
        return 6;
    };
    const money = (ws, row, col, value) => {
        const cell = ws.getCell(row, col);
        cell.value = round2(value);
        cell.numFmt = "#,##0.00";
        cell.alignment = { horizontal: "right" };
        cell.border = border;
        return cell;
    };
    // ── Aba 1: DESEMBOLSOS ──
    const wsLoans = wb.addWorksheet("Desembolsos");
    const loanColumns = [
        ["Nº Crédito", 12],
        ["Cliente", 30],
        ["Conta", 16],
        ["Data Desembolso", 16],
        ["Montante (MT)", 16],
        ["Taxa Juro", 11],
        ["Prestações", 11],
        ["Saldo Devedor (MT)", 18],
        ["Prest. em Atraso", 14],
        ["Mora Gerada (MT)", 15],
        ["Finalidade", 30],
    ];
    let row = headerRow(wsLoans, "DESEMBOLSOS DA CARTEIRA", loanColumns);
    statement.desembolsos.forEach((loan) => {
        var _a;
        const values = [
            loan.id,
            loan.customerName,
            String((_a = loan.accountNumber) !== null && _a !== void 0 ? _a : "—"),
            formatDate(loan.disbursementDate),
            round2(loan.amount),
            `${(num(loan.interestRate) * 100).toFixed(2)}%`,
            num(loan.numberOfInstallments),
            round2(loan.saldo_devedor),
            num(loan.prestacoes_atraso),
            round2(loan.mora_gerada),
            loan.loanDescription || "—",
        ];
        values.forEach((value, index) => {
            const cell = wsLoans.getCell(row, index + 1);
            if (typeof value === "number" && [5, 8, 10].includes(index + 1)) {
                cell.value = value;
                cell.numFmt = "#,##0.00";
            }
            else {
                cell.value = value;
            }
            cell.font = { name: "Calibri", size: 9.5 };
            cell.border = border;
        });
        row += 1;
    });
    wsLoans.getCell(row, 4).value = "TOTAL DESEMBOLSADO";
    wsLoans.getCell(row, 4).font = { name: "Calibri", size: 10, bold: true };
    money(wsLoans, row, 5, statement.desembolsos.reduce((total, loan) => total + num(loan.amount), 0));
    wsLoans.getCell(row, 8).value = round2(statement.desembolsos.reduce((total, loan) => total + num(loan.saldo_devedor), 0));
    wsLoans.getCell(row, 8).numFmt = "#,##0.00";
    wsLoans.getCell(row, 8).font = { name: "Calibri", size: 10, bold: true };
    // ── Aba 2: RECEBIMENTOS ──
    const wsTx = wb.addWorksheet("Recebimentos");
    const txColumns = [
        ["Data", 14],
        ["Cliente", 30],
        ["Nº Crédito", 12],
        ["Valor Recebido (MT)", 18],
        ["Capital (MT)", 15],
        ["Juros (MT)", 14],
        ["Mora (MT)", 13],
        ["Desconto (MT)", 14],
        ["Método", 12],
        ["Recibo", 20],
        ["Referência", 22],
    ];
    row = headerRow(wsTx, "RECEBIMENTOS DA CARTEIRA", txColumns);
    statement.recebimentos.forEach((tx) => {
        var _a;
        const values = [
            formatDate(tx.paymentDate),
            tx.customerName,
            tx.loanId,
            round2(tx.amount),
            round2(tx.capital),
            round2(tx.juros),
            round2(tx.mora),
            round2(tx.desconto),
            String((_a = tx.paymentMethod) !== null && _a !== void 0 ? _a : "—"),
            tx.recibo_numero || "—",
            tx.reference || "—",
        ];
        values.forEach((value, index) => {
            const cell = wsTx.getCell(row, index + 1);
            if (typeof value === "number" && [4, 5, 6, 7, 8].includes(index + 1)) {
                cell.value = value;
                cell.numFmt = "#,##0.00";
            }
            else {
                cell.value = value;
            }
            cell.font = { name: "Calibri", size: 9.5 };
            cell.border = border;
        });
        row += 1;
    });
    wsTx.getCell(row, 3).value = "TOTAL RECEBIDO";
    wsTx.getCell(row, 3).font = { name: "Calibri", size: 10, bold: true };
    money(wsTx, row, 4, statement.recebimentos.reduce((total, tx) => total + num(tx.amount), 0));
    money(wsTx, row, 6, statement.recebimentos.reduce((total, tx) => total + num(tx.juros), 0));
    money(wsTx, row, 7, statement.recebimentos.reduce((total, tx) => total + num(tx.mora), 0));
    return wb;
});
exports.buildWorkbook = buildWorkbook;
const buildStatement = (companyId, walletId, period) => __awaiter(void 0, void 0, void 0, function* () {
    const statement = yield (0, partnerPortalService_1.getPartnerStatement)({ companyId, walletId }, period);
    const company = yield CompanyModel_1.CompanyModel.findByPk(companyId, { raw: true });
    const wallet = yield (0, financingWalletService_1.getWalletWithAnalytics)(companyId, walletId);
    return { statement, company, wallet };
});
/** GET /api/reports/financiadores/:companyId/:walletId */
const getFinancierReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        const walletId = Number(req.params.walletId);
        const period = readParams(req);
        const { statement, company, wallet } = yield buildStatement(companyId, walletId, period);
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Carteira de financiamento não encontrada." });
        }
        const dashboard = yield (0, partnerPortalService_1.getPartnerDashboard)({ companyId, walletId }, period);
        return res.status(200).json({
            success: true,
            empresa: company
                ? {
                    name: company.companyName || "",
                    nuit: company.companyNuit || "",
                    address: company.companyAddress || "",
                    phone: company.companyPhone || "",
                    email: company.companyEmail || "",
                }
                : null,
            carteira: wallet,
            resumo: statement.resumo,
            kpis: dashboard.kpis,
            // Gráficos do relatório (barras por mês + distribuição dos recebimentos)
            serie_mensal: statement.serie_mensal || { meses: [], desembolsos: [], recebimentos: [], juros: [] },
            distribuicao_recebimentos: statement.distribuicao_recebimentos || { capital: 0, juros: 0, mora: 0, desconto: 0 },
            desembolsos: statement.desembolsos,
            recebimentos: statement.recebimentos,
            periodo: { from: period.from || null, to: period.to || null },
        });
    }
    catch (error) {
        console.error("[Financiador] Erro ao gerar relatório:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao gerar o relatório do financiador." });
    }
});
exports.getFinancierReport = getFinancierReport;
/** GET /api/reports/financiadores/:companyId/:walletId/excel */
const getFinancierReportExcel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        const walletId = Number(req.params.walletId);
        const period = readParams(req);
        const { statement, company, wallet } = yield buildStatement(companyId, walletId, period);
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Carteira de financiamento não encontrada." });
        }
        const wb = yield buildWorkbook({ company, wallet, statement, period });
        const label = String(wallet.codigo || "carteira").replace(/[^A-Za-z0-9_-]/g, "");
        const fileName = `Relatorio_Financiador_${label}_${period.from || "inicio"}_${period.to || "hoje"}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        yield wb.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error("[Financiador] Erro no Excel:", (error === null || error === void 0 ? void 0 : error.message) || error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Erro ao gerar o Excel do financiador." });
        }
    }
});
exports.getFinancierReportExcel = getFinancierReportExcel;
/** POST /api/reports/financiadores/:companyId/:walletId/email */
const sendFinancierReportEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const companyId = Number(req.params.companyId);
        const walletId = Number(req.params.walletId);
        const period = readParams(req);
        const { statement, company, wallet } = yield buildStatement(companyId, walletId, period);
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Carteira de financiamento não encontrada." });
        }
        const to = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || wallet.parceiro_email || "").trim();
        if (!to) {
            return res.status(400).json({
                success: false,
                message: "Esta carteira não tem e-mail de parceiro configurado. Indique o destinatário.",
            });
        }
        const wb = yield buildWorkbook({ company, wallet, statement, period });
        const buffer = yield wb.xlsx.writeBuffer();
        const label = String(wallet.codigo || "carteira").replace(/[^A-Za-z0-9_-]/g, "");
        const fileName = `Relatorio_Financiador_${label}_${period.from || "inicio"}_${period.to || "hoje"}.xlsx`;
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.EMAIL_HOST || "mail.outboxsolutions.co.mz",
            port: Number(process.env.EMAIL_PORT || 587),
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_SECRET,
            },
            tls: { rejectUnauthorized: false },
        });
        yield transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject: `Relatório de financiamento — ${wallet.parceiro_nome || wallet.nome} (${period.from || "início"} a ${period.to || "hoje"})`,
            html: `
        <p>Exmo(a). Sr(a). <b>${wallet.parceiro_nome || "Parceiro"}</b>,</p>
        <p>Segue em anexo o relatório do movimento da carteira <b>${wallet.nome}</b> (${wallet.codigo}).</p>
        <ul>
          <li>Capital alocado: <b>${statement.resumo.capital_alocado === null ? "—" : `${num(statement.resumo.capital_alocado).toFixed(2)} MT`}</b></li>
          <li>Desembolsado no período: <b>${num(statement.resumo.desembolsado_periodo).toFixed(2)} MT</b></li>
          <li>Recebido no período: <b>${num(statement.resumo.recebido_periodo).toFixed(2)} MT</b></li>
          <li>Saldo analítico disponível: <b>${statement.resumo.saldo_analitico === null ? "—" : `${num(statement.resumo.saldo_analitico).toFixed(2)} MT`}</b></li>
          <li>Saldo a receber: <b>${num(statement.resumo.saldo_a_receber).toFixed(2)} MT</b></li>
        </ul>
        <p>Com os melhores cumprimentos,<br/>${(company === null || company === void 0 ? void 0 : company.companyName) || "MBRM"}</p>
      `,
            attachments: [{ filename: fileName, content: Buffer.from(buffer) }],
        });
        return res.status(200).json({ success: true, message: `Relatório enviado para ${to}.` });
    }
    catch (error) {
        console.error("[Financiador] Erro ao enviar e-mail:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({
            success: false,
            message: `Não foi possível enviar o e-mail: ${(error === null || error === void 0 ? void 0 : error.message) || "erro desconhecido"}.`,
        });
    }
});
exports.sendFinancierReportEmail = sendFinancierReportEmail;
/**
 * GET /api/reports/wallets-breakdown/:companyId
 * Desagregação por carteira — uso INTERNO (análise). Nunca entra no relatório
 * oficial do BM, que continua a somar todos os desembolsos sem discriminar.
 */
const getWalletsBreakdown = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        const period = readParams(req);
        const wallets = yield (0, financingWalletService_1.getWalletsWithAnalytics)(companyId);
        const detalhe = yield Promise.all(wallets.map((wallet) => __awaiter(void 0, void 0, void 0, function* () {
            const loans = yield (0, partnerPortalService_1.getPartnerLoans)({ companyId, walletId: Number(wallet.id) }, period);
            const transactions = yield (0, partnerPortalService_1.getPartnerTransactions)({ companyId, walletId: Number(wallet.id) }, period);
            return {
                carteira: wallet,
                desembolsado_periodo: round2(loans.reduce((total, loan) => total + num(loan.amount), 0)),
                recebido_periodo: round2(transactions.reduce((total, tx) => total + num(tx.amount), 0)),
                juros_periodo: round2(transactions.reduce((total, tx) => total + num(tx.juros), 0)),
                mora_periodo: round2(transactions.reduce((total, tx) => total + num(tx.mora), 0)),
                num_creditos: loans.length,
                num_recebimentos: transactions.length,
            };
        })));
        return res.status(200).json({
            success: true,
            aviso: "Desagregação interna. O relatório oficial do Banco de Moçambique mantém todos os desembolsos consolidados.",
            periodo: { from: period.from || null, to: period.to || null },
            result: detalhe,
            totais: {
                desembolsado: round2(detalhe.reduce((total, item) => total + item.desembolsado_periodo, 0)),
                recebido: round2(detalhe.reduce((total, item) => total + item.recebido_periodo, 0)),
                juros: round2(detalhe.reduce((total, item) => total + item.juros_periodo, 0)),
                mora: round2(detalhe.reduce((total, item) => total + item.mora_periodo, 0)),
            },
        });
    }
    catch (error) {
        console.error("[Financiador] Erro na desagregação:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao gerar a desagregação por carteira." });
    }
});
exports.getWalletsBreakdown = getWalletsBreakdown;
