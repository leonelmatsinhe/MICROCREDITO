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
exports.reciboPdf = exports.recibos = exports.statementExcel = exports.statement = exports.transactions = exports.mora = exports.installments = exports.loans = exports.dashboard = exports.profile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const roles_1 = require("../middlewares/roles");
const ReciboModel_1 = require("../database/models/ReciboModel");
const partnerPortalService_1 = require("../services/partnerPortalService");
const reciboService_1 = require("../services/reciboService");
const FinancierReportController_1 = require("./FinancierReportController");
const financingWalletService_1 = require("../services/financingWalletService");
/**
 * PORTAL DO PARCEIRO FINANCIADOR — todas as rotas são SÓ DE LEITURA e todos os
 * filtros usam `partner.walletId` (lido da base de dados no middleware).
 * Nenhum endpoint aceita walletId/companyId do pedido: o parceiro nunca vê
 * dados de outra carteira, nem do relatório do Banco de Moçambique.
 */
const period = (req) => ({
    from: req.query.from ? String(req.query.from).slice(0, 10) : undefined,
    to: req.query.to ? String(req.query.to).slice(0, 10) : undefined,
});
const withScope = (partner) => ({
    companyId: partner.companyId,
    walletId: partner.walletId,
});
/** GET /api/partner/profile */
const profile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const partner = (0, roles_1.getPartner)(req);
    const company = yield (0, partnerPortalService_1.getPartnerCompany)(partner.companyId);
    const wallet = yield (0, financingWalletService_1.getWalletWithAnalytics)(partner.companyId, partner.walletId);
    return res.status(200).json({
        success: true,
        result: {
            user: {
                id: partner.userId,
                name: partner.userName,
                email: partner.email,
                userRole: 4,
                walletId: partner.walletId,
            },
            carteira: wallet,
            empresa: company
                ? {
                    name: company.companyName || "",
                    nuit: company.companyNuit || "",
                    phone: company.companyPhone || "",
                    email: company.companyEmail || "",
                    address: company.companyAddress || "",
                }
                : null,
        },
    });
});
exports.profile = profile;
/** GET /api/partner/dashboard */
const dashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = (0, roles_1.getPartner)(req);
        const data = yield (0, partnerPortalService_1.getPartnerDashboard)(withScope(partner), period(req));
        return res.status(200).json({ success: true, result: data });
    }
    catch (error) {
        console.error("[Portal Parceiro] dashboard:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao carregar o painel do parceiro." });
    }
});
exports.dashboard = dashboard;
/** GET /api/partner/loans */
const loans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = (0, roles_1.getPartner)(req);
        const result = yield (0, partnerPortalService_1.getPartnerLoans)(withScope(partner), Object.assign(Object.assign({}, period(req)), { search: req.query.search ? String(req.query.search) : undefined, status: req.query.status !== undefined ? Number(req.query.status) : undefined }));
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("[Portal Parceiro] loans:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao carregar os créditos da carteira." });
    }
});
exports.loans = loans;
/** GET /api/partner/installments?scope=pagas|pendentes|atraso|todas */
const installments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = (0, roles_1.getPartner)(req);
        const scope = String(req.query.scope || "todas");
        const result = yield (0, partnerPortalService_1.getPartnerInstallments)(withScope(partner), Object.assign({ scope, loanId: req.query.loanId ? Number(req.query.loanId) : undefined }, period(req)));
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("[Portal Parceiro] installments:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao carregar as prestações." });
    }
});
exports.installments = installments;
/** GET /api/partner/mora */
const mora = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = (0, roles_1.getPartner)(req);
        const result = yield (0, partnerPortalService_1.getPartnerMora)(withScope(partner));
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("[Portal Parceiro] mora:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao carregar os juros de mora." });
    }
});
exports.mora = mora;
/** GET /api/partner/transactions */
const transactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = (0, roles_1.getPartner)(req);
        const result = yield (0, partnerPortalService_1.getPartnerTransactions)(withScope(partner), Object.assign(Object.assign({}, period(req)), { loanId: req.query.loanId ? Number(req.query.loanId) : undefined, limit: req.query.limit ? Number(req.query.limit) : undefined }));
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("[Portal Parceiro] transactions:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao carregar os recebimentos." });
    }
});
exports.transactions = transactions;
/** GET /api/partner/statement */
const statement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = (0, roles_1.getPartner)(req);
        const result = yield (0, partnerPortalService_1.getPartnerStatement)(withScope(partner), period(req));
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("[Portal Parceiro] statement:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao carregar o extrato." });
    }
});
exports.statement = statement;
/** GET /api/partner/statement/excel — extrato em Excel (só leitura/export). */
const statementExcel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = (0, roles_1.getPartner)(req);
        const scope = withScope(partner);
        const p = period(req);
        const detail = yield (0, partnerPortalService_1.getPartnerStatement)(scope, p);
        const wallet = yield (0, financingWalletService_1.getWalletWithAnalytics)(scope.companyId, scope.walletId);
        const company = yield (0, partnerPortalService_1.getPartnerCompany)(scope.companyId);
        const wb = yield (0, FinancierReportController_1.buildWorkbook)({
            company,
            wallet,
            statement: { resumo: detail.resumo, desembolsos: detail.desembolsos, recebimentos: detail.recebimentos },
            period: p,
        });
        const label = String((wallet === null || wallet === void 0 ? void 0 : wallet.codigo) || "carteira").replace(/[^A-Za-z0-9_-]/g, "");
        const fileName = `Extrato_${label}_${p.from || "inicio"}_${p.to || "hoje"}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        yield wb.xlsx.write(res);
        return res.end();
    }
    catch (error) {
        console.error("[Portal Parceiro] excel:", (error === null || error === void 0 ? void 0 : error.message) || error);
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: "Erro ao gerar o extrato em Excel." });
        }
    }
});
exports.statementExcel = statementExcel;
/** GET /api/partner/recibos — recibos dos pagamentos da carteira. */
const recibos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = (0, roles_1.getPartner)(req);
        const result = yield (0, reciboService_1.listRecibosByWallet)(partner.companyId, partner.walletId);
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("[Portal Parceiro] recibos:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao carregar os recibos." });
    }
});
exports.recibos = recibos;
/** GET /api/partner/recibos/:id/pdf — PDF do recibo (só da carteira do parceiro). */
const reciboPdf = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = (0, roles_1.getPartner)(req);
        const id = Number(req.params.id);
        const recibo = (yield ReciboModel_1.ReciboModel.findByPk(id, { raw: true }));
        if (!recibo || Number(recibo.companyId) !== partner.companyId || Number(recibo.walletId) !== partner.walletId) {
            return res.status(404).json({ success: false, message: "Recibo não encontrado nesta carteira." });
        }
        if (!recibo.pdf_url) {
            return res.status(404).json({ success: false, message: "PDF do recibo indisponível." });
        }
        const fileName = path_1.default.basename(String(recibo.pdf_url));
        const filePath = path_1.default.join(process.cwd(), "uploads", "docs", fileName);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "Ficheiro do recibo não encontrado no servidor." });
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
        return res.sendFile(filePath);
    }
    catch (error) {
        console.error("[Portal Parceiro] recibo pdf:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao obter o recibo." });
    }
});
exports.reciboPdf = reciboPdf;
