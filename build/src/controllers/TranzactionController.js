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
exports.checkAndLiquidateLoan = exports.checkReference = exports.getInstallmentQuote = exports.reverseTranzaction = exports.updateTranzaction = exports.addTranzaction = exports.getLoanLateInterest = exports.getCustomerTranzactions = exports.findAllPaymentsOverview = exports.findPaginatedTransactions = exports.findTransactionsByCompany = exports.findAlltranzactions = void 0;
const moment_1 = __importDefault(require("moment"));
const db_1 = require("../database/db");
const sequelize_1 = require("sequelize");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const LoanModel_1 = require("../database/models/LoanModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const NotificationModel_1 = require("../database/models/NotificationModel");
const UserModel_1 = require("../database/models/UserModel");
const ReciboModel_1 = require("../database/models/ReciboModel");
const SmsGatewayService_1 = require("../services/SmsGatewayService");
const CompanyModel_1 = require("../database/models/CompanyModel");
const money_1 = require("../utils/money");
const paymentsV2Models_1 = require("../database/models/paymentsV2Models");
const lateInterestService_1 = require("../services/lateInterestService");
const bankAccountResolver_1 = require("../services/bankAccountResolver");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
const paymentMethodMap_1 = require("../utils/paymentMethodMap");
const jwt = __importStar(require("jsonwebtoken"));
const decodeJwt = (req) => {
    try {
        const [, token] = (req.headers.authorization || "").split(" ");
        return jwt.verify(token, process.env.APP_SECRET + "") || {};
    }
    catch (_a) {
        return {};
    }
};
const clientIpOf = (req) => {
    const fwd = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(fwd) ? fwd[0] : fwd) || req.ip || "";
    const str = String(ip).split(",")[0].trim();
    return str ? str.slice(0, 60) : null;
};
/** Grava 1 linha no audit_log (append-only). Falha de auditoria nunca quebra o fluxo. */
const writeAudit = (req, action, entity, entityId, beforeData, afterData, transaction) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const decoded = decodeJwt(req);
        yield paymentsV2Models_1.AuditLogModel.create({
            user_id: decoded.id || null,
            company_id: decoded.companyId || null,
            ip: clientIpOf(req),
            action,
            entity,
            entity_id: entityId,
            before_data: beforeData !== null && beforeData !== void 0 ? beforeData : null,
            after_data: afterData !== null && afterData !== void 0 ? afterData : null,
        }, transaction ? { transaction } : undefined);
    }
    catch (auditErr) {
        console.error("[audit_log] Falha ao gravar auditoria:", (auditErr === null || auditErr === void 0 ? void 0 : auditErr.message) || auditErr);
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// LEITURAS (GET) — legado mantido
// ─────────────────────────────────────────────────────────────────────────────
const findAlltranzactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, companyId } = req.query;
    if (!companyId) {
        return res.status(400).send({
            success: false,
            message: "companyId is required.",
        });
    }
    const whereClause = {
        companyId,
    };
    if (from && to) {
        whereClause.createdAt = {
            [sequelize_1.Op.between]: [
                new Date(`${from}T00:00:00`),
                new Date(`${to}T23:59:59`),
            ],
        };
    }
    else if (from) {
        whereClause.createdAt = {
            [sequelize_1.Op.gte]: new Date(`${from}T00:00:00`),
        };
    }
    else if (to) {
        whereClause.createdAt = {
            [sequelize_1.Op.lte]: new Date(`${to}T23:59:59`),
        };
    }
    const tranzactions = yield TranzactionModel_1.TranzactionModel.findAll({
        where: whereClause,
        order: [["id", "DESC"]],
    });
    return res.status(200).send({ success: true, result: tranzactions || [] });
});
exports.findAlltranzactions = findAlltranzactions;
const findTransactionsByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { from, to, limit } = req.query;
    const whereClause = {
        companyId: id,
    };
    if (from && to) {
        whereClause.createdAt = {
            [sequelize_1.Op.between]: [
                new Date(`${from}T00:00:00`),
                new Date(`${to}T23:59:59`),
            ],
        };
    }
    else if (from) {
        whereClause.createdAt = {
            [sequelize_1.Op.gte]: new Date(`${from}T00:00:00`),
        };
    }
    else if (to) {
        whereClause.createdAt = {
            [sequelize_1.Op.lte]: new Date(`${to}T23:59:59`),
        };
    }
    const queryOptions = {
        where: whereClause,
        order: [["id", "DESC"]],
    };
    if (limit) {
        const parsedLimit = parseInt(limit, 10);
        if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
            queryOptions.limit = parsedLimit;
        }
    }
    const tranzactions = yield TranzactionModel_1.TranzactionModel.findAll(Object.assign({}, queryOptions));
    return tranzactions.length > 0
        ? res.status(200).send({ success: true, result: tranzactions })
        : res.status(200).send({
            success: true,
            result: [],
        });
});
exports.findTransactionsByCompany = findTransactionsByCompany;
const findPaginatedTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { page = "1", limit = "15", fromDate, toDate, search, paymentMethod, creditManager, } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;
        const whereClause = { companyId: id };
        // Filtrar por gestor de crédito (buscar loanIds do gestor)
        if (creditManager) {
            const managerLoans = yield LoanModel_1.LoanModel.findAll({
                where: {
                    companyId: id,
                    creditManager: parseInt(creditManager),
                },
                attributes: ["id"],
            });
            const managerLoanIds = managerLoans.map((l) => l.id);
            if (managerLoanIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    result: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: limitNum,
                        hasNextPage: false,
                        hasPrevPage: false,
                    },
                    totals: { totalAmount: 0, totalLateInterest: 0, totalInterestRate: 0 },
                });
            }
            whereClause.loanId = { [sequelize_1.Op.in]: managerLoanIds };
        }
        if (fromDate && toDate) {
            whereClause.createdAt = {
                [sequelize_1.Op.between]: [
                    new Date(`${fromDate}T00:00:00`),
                    new Date(`${toDate}T23:59:59`),
                ],
            };
        }
        else if (fromDate) {
            whereClause.createdAt = {
                [sequelize_1.Op.gte]: new Date(`${fromDate}T00:00:00`),
            };
        }
        else if (toDate) {
            whereClause.createdAt = {
                [sequelize_1.Op.lte]: new Date(`${toDate}T23:59:59`),
            };
        }
        if (paymentMethod && paymentMethod !== "0") {
            whereClause.paymentMethod = parseInt(paymentMethod);
        }
        if (search) {
            const searchTerm = `%${search}%`;
            whereClause[sequelize_1.Op.or] = [
                { accountNumber: { [sequelize_1.Op.like]: searchTerm } },
                { tranzactionReference: { [sequelize_1.Op.like]: searchTerm } },
                { staffName: { [sequelize_1.Op.like]: searchTerm } },
                { description: { [sequelize_1.Op.like]: searchTerm } },
            ];
        }
        const { count, rows } = yield TranzactionModel_1.TranzactionModel.findAndCountAll({
            where: whereClause,
            order: [["id", "DESC"]],
            limit: limitNum,
            offset,
        });
        const totalPages = Math.ceil(count / limitNum);
        // Totais do conjunto filtrado em SQL (COALESCE para NULL→0)
        const totalsResult = yield TranzactionModel_1.TranzactionModel.findOne({
            where: whereClause,
            attributes: [
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), 0), "totalAmount"],
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("latePaymentInterest")), 0), "totalLateInterest"],
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("interestRateAmount")), 0), "totalInterestRate"],
            ],
            raw: true,
        });
        const totals = {
            totalAmount: Number((totalsResult === null || totalsResult === void 0 ? void 0 : totalsResult.totalAmount) || 0),
            totalLateInterest: Number((totalsResult === null || totalsResult === void 0 ? void 0 : totalsResult.totalLateInterest) || 0),
            totalInterestRate: Number((totalsResult === null || totalsResult === void 0 ? void 0 : totalsResult.totalInterestRate) || 0),
        };
        return res.status(200).json({
            success: true,
            result: rows,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: count,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
            },
            totals,
        });
    }
    catch (error) {
        console.error("Erro ao buscar transacções paginadas:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao buscar transacções.",
        });
    }
});
exports.findPaginatedTransactions = findPaginatedTransactions;
const getCustomerTranzactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const tranzaction = yield TranzactionModel_1.TranzactionModel.findAll({
        where: {
            accountNumber: id,
        },
    });
    return tranzaction
        ? res.status(200).send({ success: true, result: tranzaction })
        : res.status(204).send({
            success: false,
            result: "No transactions found with the ID provided",
        });
});
exports.getCustomerTranzactions = getCustomerTranzactions;
const getLoanLateInterest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const loan = yield LoanModel_1.LoanModel.findByPk(id, { attributes: ["id", "companyId", "status"] });
    if (!loan)
        return res.status(404).json({ success: false, message: "Crédito não encontrado." });
    const transactions = yield TranzactionModel_1.TranzactionModel.findAll({
        where: { loanId: id, status: "CONFIRMED" },
        attributes: ["latePaymentInterest", "paymentDate"],
        raw: true,
    });
    const lateInterestByDate = {};
    transactions.forEach((transaction) => {
        const date = String(transaction.paymentDate || "").slice(0, 10);
        lateInterestByDate[date] = Math.max(lateInterestByDate[date] || 0, Number(transaction.latePaymentInterest) || 0);
    });
    const chargedLateInterest = Object.values(lateInterestByDate).reduce((sum, interest) => sum + interest, 0);
    let totalLateInterest = chargedLateInterest;
    if (Number(loan.status) === 1) {
        const company = yield CompanyModel_1.CompanyModel.findByPk(loan.companyId, { attributes: ["forfeit"] });
        const pendingInstallments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: id, status: { [sequelize_1.Op.ne]: 1 } },
        });
        const calculated = (0, calculateLateAmount_1.installmentPanification)(pendingInstallments, Number((company === null || company === void 0 ? void 0 : company.getDataValue("forfeit")) || 0));
        totalLateInterest = calculated.reduce((sum, installment) => sum + (Number(installment.latePaymentInterest) || 0), 0);
    }
    return res.status(200).json({
        success: true,
        result: {
            totalLateInterest: (0, money_1.round2)(totalLateInterest),
            chargedLateInterest: (0, money_1.round2)(chargedLateInterest),
            source: Number(loan.status) === 1 ? "pending" : "charged",
        },
    });
});
exports.getLoanLateInterest = getLoanLateInterest;
/**
 * GET /api/tranzaction/loan/reference-check?companyId&paymentMethod&reference
 * Validação async do frontend: referência já usada neste método/empresa?
 */
const checkReference = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, paymentMethod, reference } = req.query;
        if (!companyId || !paymentMethod || !reference) {
            return res.status(400).json({ success: false, message: "companyId, paymentMethod e reference são obrigatórios." });
        }
        const existing = yield TranzactionModel_1.TranzactionModel.findOne({
            where: {
                companyId: Number(companyId),
                paymentMethod: Number(paymentMethod),
                tranzactionReference: String(reference).trim(),
                status: "CONFIRMED",
            },
            attributes: ["id"],
        });
        return res.status(200).json({ success: true, result: { exists: !!existing, tranzactionId: existing ? Number(existing.getDataValue("id")) : null } });
    }
    catch (error) {
        console.error("[reference-check] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao validar a referência." });
    }
});
exports.checkReference = checkReference;
/** Soma a mora JÁ COBRADA em transacções CONFIRMED da prestação. */
const sumChargedLateInterest = (amortizationLoanId, transaction) => __awaiter(void 0, void 0, void 0, function* () {
    const rows = yield TranzactionModel_1.TranzactionModel.findAll(Object.assign({ where: { amortizationLoanId, status: "CONFIRMED" }, attributes: ["latePaymentInterest"], raw: true }, (transaction ? { transaction } : {})));
    return (0, money_1.round2)(rows.reduce((s, t) => s + (0, money_1.num)(t.latePaymentInterest), 0));
});
/**
 * GET /api/installments/:id/quote?payDate=YYYY-MM-DD — QUOTE OFICIAL do servidor.
 * Fonte única da verdade: o frontend deixa de calcular mora em JS.
 * Motor V2 (accruals + company_penalty_rules) com fallback de fórmula legada.
 */
const getInstallmentQuote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const id = parseInt(String(req.params.id), 10);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ success: false, message: "id inválido." });
        }
        const payDate = String(req.query.payDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
        const installment = yield AmortizationLoanModel_1.AmorizationLoanModel.findByPk(id);
        if (!installment) {
            return res.status(404).json({ success: false, message: "Prestação não encontrada." });
        }
        const loan = yield LoanModel_1.LoanModel.findByPk(installment.getDataValue("loanId"), {
            attributes: ["companyId", "status"],
        });
        if (!loan) {
            return res.status(404).json({ success: false, message: "Crédito não encontrado." });
        }
        const companyId = Number(loan.getDataValue("companyId"));
        const installmentValue = (0, money_1.round2)((0, money_1.num)(installment.getDataValue("installment")));
        const paidAmount = (0, money_1.round2)((0, money_1.num)(installment.getDataValue("paidAmount")));
        const dueDate = String(installment.getDataValue("dueDate") || "").slice(0, 10);
        const status = Number(installment.getDataValue("status"));
        const capitalDue = (0, money_1.round2)(Math.max(0, installmentValue - paidAmount));
        const interestDue = (0, money_1.round2)((0, money_1.num)(installment.getDataValue("rateAmount")));
        // Mora pelo motor V2 (accruals → regra → fórmula legada)
        const late = yield (0, lateInterestService_1.getAccruedLateInterest)({
            amortizationLoanId: id,
            installmentValue,
            paidAmount,
            dueDate,
            companyId,
            referenceDate: payDate,
        });
        // Crédito a favor do cliente (overpays anteriores) — abate o total
        let customerCredit = 0;
        try {
            const [creditRows] = yield db_1.db.query(`SELECT COALESCE(SUM(remaining_amount),0) AS total FROM customer_credits
          WHERE company_id = ? AND account_number = ? AND status = 'ACTIVE'`, { replacements: [companyId, Number(installment.getDataValue("accountNumber"))] });
            customerCredit = (0, money_1.round2)((0, money_1.num)((_a = creditRows[0]) === null || _a === void 0 ? void 0 : _a.total));
        }
        catch ( /* tabela ainda não migrada */_b) { /* tabela ainda não migrada */ }
        const alreadyCharged = yield sumChargedLateInterest(id);
        const lateDue = (0, money_1.round2)(Math.max(0, late.amount - alreadyCharged));
        const total = (0, money_1.round2)(status === 1 ? 0 : capitalDue + lateDue);
        const netTotal = (0, money_1.round2)(Math.max(0, total - customerCredit));
        return res.status(200).json({
            success: true,
            result: {
                installmentId: id,
                loanId: Number(installment.getDataValue("loanId")),
                installmentOrder: installment.getDataValue("installmentOrder"),
                dueDate,
                payDate,
                status,
                paid: paidAmount,
                installmentValue,
                capitalDue,
                interestDue,
                daysLate: late.daysLate,
                lateDue,
                lateSource: late.source,
                customerCredit,
                total,
                netTotal,
                payableUntil: dueDate,
            },
        });
    }
    catch (error) {
        console.error("[quote] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao calcular a quote." });
    }
});
exports.getInstallmentQuote = getInstallmentQuote;
/**
 * Todos os pagamentos da empresa, enriquecidos com cliente + prestação.
 * (Legado — usado pela página "Pagamentos" e exportações PDF/Excel.)
 */
const findAllPaymentsOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = parseInt(String(req.params.companyId), 10);
        if (!Number.isFinite(companyId) || companyId <= 0) {
            return res.status(400).json({ success: false, message: "companyId inválido." });
        }
        const tranzactions = (yield TranzactionModel_1.TranzactionModel.findAll({
            where: { companyId },
            order: [["paymentDate", "DESC"], ["id", "DESC"]],
            raw: true,
        }));
        if (tranzactions.length === 0) {
            return res.status(200).json({ success: true, result: [] });
        }
        // Mutuários — nome e telefone por conta
        const accountNumbers = [...new Set(tranzactions.map((t) => t.accountNumber))];
        const customers = (yield CustomerModel_1.CustomerModel.findAll({
            where: { companyId, accountNumber: { [sequelize_1.Op.in]: accountNumbers } },
            attributes: ["accountNumber", "customerName", "customerPhone"],
            raw: true,
        }));
        const customerByAccount = {};
        customers.forEach((c) => {
            customerByAccount[String(c.accountNumber)] = c;
        });
        // Prestações — nº de ordem e vencimento a que cada pagamento se refere
        const amortIds = [...new Set(tranzactions.map((t) => t.amortizationLoanId).filter((v) => v != null))];
        const amortById = {};
        if (amortIds.length > 0) {
            const amortizations = (yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
                where: { id: { [sequelize_1.Op.in]: amortIds } },
                attributes: ["id", "installmentOrder", "dueDate", "installment", "paidAmount", "status"],
                raw: true,
            }));
            amortizations.forEach((a) => {
                amortById[Number(a.id)] = a;
            });
        }
        const displayedLateByPaymentGroup = {};
        const result = tranzactions.map((t) => {
            var _a, _b, _c, _d;
            const customer = customerByAccount[String(t.accountNumber)] || null;
            const amort = amortById[Number(t.amortizationLoanId)] || null;
            const paymentDate = String(t.paymentDate || t.createdAt || "").slice(0, 10);
            const paymentGroup = `${Number(t.amortizationLoanId) || 0}:${paymentDate}`;
            const rawLateInterest = Number(t.latePaymentInterest) || 0;
            // Registos antigos repetiam a mesma mora em pagamentos parciais do mesmo dia.
            const displayedLateInterest = rawLateInterest > 0 && !displayedLateByPaymentGroup[paymentGroup]
                ? rawLateInterest
                : 0;
            if (displayedLateInterest > 0)
                displayedLateByPaymentGroup[paymentGroup] = true;
            const discountAmount = Number(t.discountAmount) || 0;
            const totalAmount = Number(t.totalAmount) || (Number(t.amount) || 0) + displayedLateInterest - discountAmount;
            return Object.assign(Object.assign({}, t), { latePaymentInterest: displayedLateInterest, displayedLatePaymentInterest: displayedLateInterest, totalAmount: (0, money_1.round2)(totalAmount), customerName: (customer === null || customer === void 0 ? void 0 : customer.customerName) || `Conta ${t.accountNumber}`, customerPhone: (customer === null || customer === void 0 ? void 0 : customer.customerPhone) || "", installmentOrder: (_a = amort === null || amort === void 0 ? void 0 : amort.installmentOrder) !== null && _a !== void 0 ? _a : null, installmentDueDate: (amort === null || amort === void 0 ? void 0 : amort.dueDate) ? String(amort.dueDate).slice(0, 10) : null, installmentValue: (_b = amort === null || amort === void 0 ? void 0 : amort.installment) !== null && _b !== void 0 ? _b : null, installmentPaidAmount: (_c = amort === null || amort === void 0 ? void 0 : amort.paidAmount) !== null && _c !== void 0 ? _c : null, installmentStatus: (_d = amort === null || amort === void 0 ? void 0 : amort.status) !== null && _d !== void 0 ? _d : null });
        });
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("findAllPaymentsOverview:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao listar pagamentos." });
    }
});
exports.findAllPaymentsOverview = findAllPaymentsOverview;
// ─────────────────────────────────────────────────────────────────────────────
// PAGAMENTO INDIVIDUAL — V2 TRANSACCIONAL (lock, validações, idempotência)
// ─────────────────────────────────────────────────────────────────────────────
const addTranzaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e;
    const body = req.body || {};
    const { companyId, accountNumber, amortizationLoanId, amount, interestRateAmount, phoneNumber, tranzactionReference, paymentMethod, description, receiptUrl, loanId: _loanIdIgnored, // loanId real vem da prestação (evita mismatch)
    paymentDate, discountApplied, notes, } = body;
    // ── 0. IDEMPOTÊNCIA — header Idempotency-Key obrigatório ──
    const idemKey = String(req.headers["idempotency-key"] || "").trim();
    if (!idemKey || idemKey.length < 8) {
        return res.status(400).json({
            success: false,
            code: "IDEMPOTENCY_KEY_REQUIRED",
            message: "Header Idempotency-Key (UUID) é obrigatório.",
        });
    }
    // ── 1. Validações de entrada (baratas, fora da transacção) ──
    if (!companyId || !accountNumber || !amortizationLoanId) {
        return res.status(400).json({
            success: false,
            message: "companyId, accountNumber e amortizationLoanId são obrigatórios.",
        });
    }
    if (!tranzactionReference || !String(tranzactionReference).trim()) {
        return res.status(400).json({
            success: false,
            code: "REFERENCE_REQUIRED",
            message: "A referência do pagamento é obrigatória.",
        });
    }
    const payDate = String(paymentDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (payDate > today) {
        return res.status(400).json({
            success: false,
            code: "FUTURE_DATE",
            message: "A data de pagamento não pode ser futura.",
        });
    }
    // Identidade (JWT) — received_by + auditoria
    const decoded = decodeJwt(req);
    const receivedBy = Number(decoded.id) || null;
    const clientIp = clientIpOf(req);
    // ── 2. Chave de idempotência já usada? Devolve a resposta original ──
    try {
        const previous = yield paymentsV2Models_1.IdempotencyKeyModel.findOne({ where: { idem_key: idemKey } });
        if (previous) {
            const saved = previous.getDataValue("response_body");
            if (saved) {
                return res.status(Number(previous.getDataValue("response_status")) || 200).json(saved);
            }
            // Existe sem resposta = pedido em curso noutro request
            return res.status(409).json({
                success: false,
                code: "IDEMPOTENCY_KEY_REUSED",
                message: "Pedido em processamento com a mesma Idempotency-Key — aguarde.",
            });
        }
        yield paymentsV2Models_1.IdempotencyKeyModel.create({
            idem_key: idemKey,
            company_id: Number(companyId),
            user_id: receivedBy,
            endpoint: "POST /api/tranzaction",
        });
    }
    catch (err) {
        // Corrida: outro request criou a chave primeiro → devolve a resposta dele
        if (String(err === null || err === void 0 ? void 0 : err.name).includes("UniqueConstraint") || String((_c = err === null || err === void 0 ? void 0 : err.original) === null || _c === void 0 ? void 0 : _c.code) === "ER_DUP_ENTRY") {
            const previous = yield paymentsV2Models_1.IdempotencyKeyModel.findOne({ where: { idem_key: idemKey } });
            const saved = (_d = previous === null || previous === void 0 ? void 0 : previous.getDataValue) === null || _d === void 0 ? void 0 : _d.call(previous, "response_body");
            if (saved) {
                return res.status(Number(previous.getDataValue("response_status")) || 200).json(saved);
            }
            return res.status(409).json({
                success: false,
                code: "IDEMPOTENCY_KEY_REUSED",
                message: "Pedido em processamento com a mesma Idempotency-Key — aguarde.",
            });
        }
        // Tabela indisponível → segue o fluxo normal (fallback legado)
        console.error("[idempotency] tabela indisponível, seguindo sem idempotência:", err === null || err === void 0 ? void 0 : err.message);
    }
    try {
        const result = yield db_1.db.transaction((t) => __awaiter(void 0, void 0, void 0, function* () {
            var _g;
            // ── 3. Prestação COM LOCK (2 caixas, mesma prestação → serializado) ──
            const installment = yield AmortizationLoanModel_1.AmorizationLoanModel.findByPk(Number(amortizationLoanId), {
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!installment) {
                throw { http: 404, payload: { success: false, message: "Prestação não encontrada." } };
            }
            if (Number(installment.getDataValue("status")) === 1) {
                throw {
                    http: 409,
                    payload: {
                        success: false,
                        code: "ALREADY_PAID",
                        message: "Esta prestação já está totalmente paga.",
                    },
                };
            }
            const loan = yield LoanModel_1.LoanModel.findByPk(installment.getDataValue("loanId"), {
                attributes: ["id", "companyId", "walletId", "status"],
                transaction: t,
            });
            if (!loan) {
                throw { http: 404, payload: { success: false, message: "Crédito não encontrado." } };
            }
            const realLoanId = Number(loan.getDataValue("id"));
            const loanCompanyId = Number(loan.getDataValue("companyId"));
            const walletId = Number(installment.getDataValue("walletId")) || Number(loan.getDataValue("walletId")) || null;
            // ── CONTA DE DESTINO (accounts.id, purpose REEMBOLSO/MISTO/caixa) ──
            // Prioridade: body → caixa aberto do utilizador → 1.ª conta CAIXA_FISICO
            // da empresa (com warning em audit_log). Sem conta válida → 400.
            const { CashRegisterModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/CashRegisterModel")));
            let bankAccountId = Number(body.bank_account_id) || Number(body.bankAccountId) || 0;
            if (!bankAccountId) {
                const openRegister = yield CashRegisterModel.findOne({
                    where: { companyId: loanCompanyId, userId: receivedBy || 0, status: "ABERTO" },
                    order: [["id", "DESC"]],
                    transaction: t,
                });
                bankAccountId = Number(openRegister === null || openRegister === void 0 ? void 0 : openRegister.getDataValue("bank_account_id")) || 0;
            }
            if (!bankAccountId) {
                const cashAccount = yield (0, bankAccountResolver_1.getFirstCashAccount)(loanCompanyId);
                bankAccountId = Number(cashAccount === null || cashAccount === void 0 ? void 0 : cashAccount.id) || 0;
                if (bankAccountId) {
                    console.warn(`[addTranzaction] bank_account_id derivado por FALLBACK (caixa físico #${bankAccountId}) — sem conta no pedido nem no caixa`);
                }
            }
            const destAccount = yield (0, bankAccountResolver_1.validateReembolsoAccount)(bankAccountId, loanCompanyId);
            if (!destAccount) {
                throw { http: 400, payload: { success: false, code: "INVALID_BANK_ACCOUNT", message: "Conta de destino inválida." } };
            }
            // ── 4. MORA recalculada NO SERVIDOR (motor V2 → fallback legado) ──
            const installmentValue = (0, money_1.round2)((0, money_1.num)(installment.getDataValue("installment")));
            const previousPaid = (0, money_1.round2)((0, money_1.num)(installment.getDataValue("paidAmount")));
            const dueDate = String(installment.getDataValue("dueDate") || "").slice(0, 10);
            const late = yield (0, lateInterestService_1.getAccruedLateInterest)({
                amortizationLoanId: Number(amortizationLoanId),
                installmentValue,
                paidAmount: previousPaid,
                dueDate,
                companyId: loanCompanyId,
                referenceDate: payDate,
            });
            const alreadyCharged = yield sumChargedLateInterest(Number(amortizationLoanId), t);
            const latePaymentInterest = (0, money_1.round2)(Math.max(0, late.amount - alreadyCharged));
            // ── 5. VALIDAÇÃO SERVER-SIDE DO VALOR (não confiar no frontend) ──
            const saldoEmFalta = (0, money_1.round2)(installmentValue - previousPaid);
            const totalDue = (0, money_1.round2)(saldoEmFalta + latePaymentInterest);
            const payAmount = (0, money_1.round2)((0, money_1.num)(amount));
            if (payAmount <= 0) {
                throw {
                    http: 400,
                    payload: { success: false, code: "INVALID_AMOUNT", message: "O valor a pagar deve ser maior que zero." },
                };
            }
            const acceptOverpay = !!body.acceptOverpay;
            if (payAmount > totalDue && !acceptOverpay) {
                throw {
                    http: 400,
                    payload: {
                        success: false,
                        code: "OVERPAY_NOT_ALLOWED",
                        message: `Valor acima do devido (total a pagar ${totalDue.toFixed(2)} MZN). Ajuste o valor ou confirme o excesso.`,
                        details: { totalDue, sent: payAmount },
                    },
                };
            }
            const overpayAmount = (0, money_1.round2)(Math.max(0, payAmount - totalDue));
            const appliedAmount = (0, money_1.round2)(payAmount - overpayAmount);
            // ── 6. Desconto (perdão manual) — marca prestação como paga ──
            const discountAmount = discountApplied
                ? (0, money_1.round2)(Math.max(0, (0, money_1.subMoney)(saldoEmFalta, Math.max(0, (0, money_1.subMoney)(payAmount, latePaymentInterest)))))
                : 0;
            // ── 7. Referência única por empresa+método (409 DUPLICATE_REFERENCE) ──
            const refNormalized = String(tranzactionReference).trim();
            const duplicate = yield TranzactionModel_1.TranzactionModel.findOne({
                where: {
                    companyId: loanCompanyId,
                    paymentMethod: Number(paymentMethod) || 0,
                    tranzactionReference: refNormalized,
                    status: "CONFIRMED",
                },
                transaction: t,
            });
            if (duplicate) {
                throw {
                    http: 409,
                    payload: {
                        success: false,
                        code: "DUPLICATE_REFERENCE",
                        message: `A referência "${refNormalized}" já foi usada neste método de pagamento.`,
                    },
                };
            }
            // ── 8. Novo estado da prestação ──
            const paymentTowardsBalance = (0, money_1.round2)(Math.max(0, (0, money_1.subMoney)(appliedAmount, latePaymentInterest)));
            const newTotalPaid = (0, money_1.round2)(previousPaid + paymentTowardsBalance);
            const isFullPayment = discountApplied ? true : (0, money_1.moneyGte)(newTotalPaid, installmentValue);
            const newStatus = isFullPayment ? 1 : -1;
            const finalPaidAmount = (0, money_1.round2)(Math.min(newTotalPaid, installmentValue));
            const debtAmount = isFullPayment ? 0 : (0, money_1.round2)(Math.max(0, installmentValue - finalPaidAmount));
            // ── 9. CRIA A TRANSAÇÃO (dentro da transacção SQL) ──
            const tranzaction = yield TranzactionModel_1.TranzactionModel.create({
                companyId: loanCompanyId,
                accountNumber: Number(accountNumber),
                customerId: installment.getDataValue("customerId"),
                amortizationLoanId: Number(amortizationLoanId),
                amount: appliedAmount,
                totalAmount: appliedAmount,
                latePaymentInterest,
                interestRateAmount: (0, money_1.num)(interestRateAmount) || (0, money_1.round2)((0, money_1.num)(installment.getDataValue("rateAmount"))),
                phoneNumber: String(phoneNumber || ""),
                tranzactionReference: refNormalized,
                paymentMethod: Number(paymentMethod) || 0,
                description: String(description || `Pagamento prestação ${installment.getDataValue("installmentOrder")}`),
                receiptUrl: String(receiptUrl || ""),
                staffName: String(body.staffName || "—"),
                received_by: receivedBy,
                received_ip: clientIp,
                idem_key: idemKey,
                status: "CONFIRMED",
                bank_account_id: bankAccountId,
                loanId: realLoanId,
                paymentDate: payDate,
                notes: notes || null,
                discountApplied: !!discountApplied,
                discountAmount,
                walletId: walletId || null,
                mora_amount: latePaymentInterest,
            }, { transaction: t });
            const tranzactionId = Number(tranzaction.getDataValue("id"));
            // ── 10. ALOCAÇÃO (ordem fixa) → payment_allocations ──
            // LATE_INTEREST → INTEREST → CAPITAL (PENALTY fica reservada para multas fixas futuras)
            const allocations = [];
            let pool = appliedAmount;
            const lateSlice = (0, money_1.round2)(Math.min(pool, latePaymentInterest));
            if (lateSlice > 0) {
                allocations.push({ component: "LATE_INTEREST", amount: lateSlice });
                pool = (0, money_1.subMoney)(pool, lateSlice);
            }
            const rateAmount = (0, money_1.round2)((0, money_1.num)(installment.getDataValue("rateAmount")));
            const interestSlice = (0, money_1.round2)(Math.min(pool, rateAmount));
            if (interestSlice > 0) {
                allocations.push({ component: "INTEREST", amount: interestSlice });
                pool = (0, money_1.subMoney)(pool, interestSlice);
            }
            const capitalSlice = (0, money_1.round2)(Math.min(pool, saldoEmFalta));
            if (capitalSlice > 0) {
                allocations.push({ component: "CAPITAL", amount: capitalSlice });
                pool = (0, money_1.subMoney)(pool, capitalSlice);
            }
            // Resíduo por arredondamento — nunca descartar cêntimos
            if (pool > 0.005) {
                allocations.push({ component: "CAPITAL", amount: (0, money_1.round2)(pool) });
            }
            yield paymentsV2Models_1.PaymentAllocationModel.bulkCreate(allocations.map((a) => ({
                payment_id: tranzactionId,
                amortization_loan_id: Number(amortizationLoanId),
                component: a.component,
                amount: a.amount,
            })), { transaction: t });
            // ── 10.b SALDO DA CONTA DE DESTINO — DENTRO da transacção ──
            // Bloqueia a linha (FOR UPDATE), incrementa o saldo e cria o lançamento
            // no extrato real (bank_transactions) no MESMO commit do pagamento.
            // O movimento de caixa pós-commit usa skipAccountLedger → sem duplo
            // crédito do mesmo dinheiro.
            const { creditAccountInTransaction } = yield Promise.resolve().then(() => __importStar(require("../services/treasuryService")));
            yield creditAccountInTransaction({
                companyId: loanCompanyId,
                accountId: bankAccountId,
                amount: appliedAmount,
                description: `Reembolso de prestação — conta ${accountNumber}`,
                userId: receivedBy,
                cashRegisterId: Number((_g = req.cashRegister) === null || _g === void 0 ? void 0 : _g.id) || null,
                referenceType: "tranzactions",
                referenceId: tranzactionId,
                transaction: t,
            });
            yield paymentsV2Models_1.AuditLogModel.create({
                user_id: receivedBy,
                company_id: loanCompanyId,
                ip: clientIp,
                action: "BANK_ACCOUNT_CREDIT",
                entity: "accounts",
                entity_id: bankAccountId,
                before_data: null,
                after_data: { tranzactionId, amount: appliedAmount },
            }, { transaction: t });
            // ── 11. EXCESSO → customer_credits (troco nunca desaparece) ──
            if (overpayAmount > 0 && acceptOverpay) {
                yield paymentsV2Models_1.CustomerCreditModel.create({
                    company_id: loanCompanyId,
                    customer_id: Number(installment.getDataValue("customerId")),
                    account_number: Number(accountNumber),
                    amount: overpayAmount,
                    remaining_amount: overpayAmount,
                    source_payment_id: tranzactionId,
                    status: "ACTIVE",
                }, { transaction: t });
            }
            // ── 12. Actualiza a prestação (mesma transacção) ──
            yield AmortizationLoanModel_1.AmorizationLoanModel.update(Object.assign({ status: newStatus, paidAmount: finalPaidAmount, remainingBalance: isFullPayment ? 0 : debtAmount }, (latePaymentInterest > 0
                ? {
                    mora_amount: (0, money_1.round2)((0, money_1.num)(installment.getDataValue("mora_amount")) + latePaymentInterest),
                    mora_days: Math.max(0, (0, moment_1.default)(payDate).diff((0, moment_1.default)(dueDate), "days")),
                }
                : {})), { where: { id: Number(amortizationLoanId) }, transaction: t });
            // ── 13. Dívida parcial — mesma transacção ──
            const { DebtModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/DebtModel")));
            if (!isFullPayment) {
                const existingDebt = yield DebtModel.findOne({
                    where: { amortisationId: Number(amortizationLoanId) },
                    transaction: t,
                });
                if (existingDebt) {
                    yield DebtModel.update({ debtAmount }, { where: { id: existingDebt.getDataValue("id") }, transaction: t });
                }
                else {
                    yield DebtModel.create({
                        companyId: loanCompanyId,
                        customerId: installment.getDataValue("customerId"),
                        accountNumber: String(accountNumber),
                        loanId: realLoanId,
                        amortisationId: Number(amortizationLoanId),
                        debtAmount,
                        updatedBy: String(body.staffName || ""),
                        dateInserted: payDate,
                    }, { transaction: t });
                }
            }
            else {
                yield DebtModel.destroy({ where: { amortisationId: Number(amortizationLoanId) }, transaction: t });
            }
            // ── 14. Auditoria (append-only, dentro da transacção) ──
            yield paymentsV2Models_1.AuditLogModel.create({
                user_id: receivedBy,
                company_id: loanCompanyId,
                ip: clientIp,
                action: "PAYMENT_CREATE",
                entity: "tranzactions",
                entity_id: tranzactionId,
                before_data: { paidAmount: previousPaid, status: Number(installment.getDataValue("status")) },
                after_data: {
                    paidAmount: finalPaidAmount,
                    status: newStatus,
                    amount: appliedAmount,
                    latePaymentInterest,
                    overpayAmount,
                    reference: refNormalized,
                },
            }, { transaction: t });
            // ── 15. RECIBO LEGAL — DENTRO da transacção (REGRA DE OURO AT) ──
            // Numeração sequencial (FOR UPDATE), selo SHA-256 + QR e PDF no mesmo
            // commit: se o PDF falhar, o pagamento INTEIRO sofre rollback — nunca
            // existe pagamento sem recibo nem recibo sem pagamento.
            const { emitReciboInTransaction } = yield Promise.resolve().then(() => __importStar(require("../services/reciboService")));
            const reciboEmitido = yield emitReciboInTransaction({
                tranzactionId,
                companyId: loanCompanyId,
                createdBy: receivedBy,
                ip: clientIp,
                transaction: t,
            });
            return {
                tranzactionId,
                appliedAmount,
                latePaymentInterest,
                overpayAmount,
                walletId,
                realLoanId,
                bankAccountId,
                destAccountName: destAccount.name,
                recibo: reciboEmitido,
            };
        }));
        // ── PÓS-COMMIT (best-effort — falha NÃO desfaz o pagamento) ──
        // Caixa: abre transacção própria → chamado APÓS o commit principal.
        try {
            const { recordPayment } = yield Promise.resolve().then(() => __importStar(require("../services/cashRegisterService")));
            const openRegister = req.cashRegister;
            if (openRegister) {
                yield recordPayment({
                    companyId: Number(companyId),
                    userId: receivedBy || undefined,
                    loanId: result.realLoanId,
                    amortizationLoanId: Number(amortizationLoanId),
                    tranzactionId: result.tranzactionId,
                    customerId: null,
                    // Movimento único REEMBOLSO com o total recebido. appliedAmount JÁ
                    // inclui a mora (a alocação consome LATE_INTEREST primeiro) e é igual
                    // a tranzactions.totalAmount — a reconciliação do fecho compara estes
                    // dois valores. Separar a mora num movimento JUROS_MORA extra (como
                    // antes) inflacionava o caixa exactamente pela mora.
                    amount: result.appliedAmount,
                    lateInterest: 0,
                    adminFee: 0,
                    accountNumber,
                    // methodToTreasury: código legado (1/3/6/7…) → CASH/BANK/MPESA/EMOLA.
                    // Antes lia body.payment_method (inexistente) → caixa via CASH.
                    paymentMethod: (0, paymentMethodMap_1.methodToTreasury)(body.paymentMethod),
                    bankAccountId: result.bankAccountId,
                    // O saldo da conta destino foi creditado no passo 10.b (mesma
                    // transacção SQL) — o movimento de caixa não pode creditar de novo.
                    skipAccountLedger: true,
                });
            }
        }
        catch (cashError) {
            console.error("[CAIXA] Falha ao registar pagamento no caixa (pagamento mantido):", (cashError === null || cashError === void 0 ? void 0 : cashError.message) || cashError);
        }
        // Recibo já foi emitido DENTRO da transacção (passo 15) — aqui é apenas
        // propagado na resposta. (Fallback pós-commit mantido só para recibos
        // legados que porventura não tenham PDF: nunca toca em pagamentos novos.)
        let recibo = result.recibo || null;
        if (!(recibo === null || recibo === void 0 ? void 0 : recibo.pdf_url)) {
            try {
                const { generateReciboForTranzaction } = yield Promise.resolve().then(() => __importStar(require("../services/reciboService")));
                recibo = yield generateReciboForTranzaction({
                    tranzactionId: result.tranzactionId,
                    companyId: Number(companyId),
                    createdBy: receivedBy,
                });
            }
            catch (reciboError) {
                console.error("[Recibo] Falha ao completar o recibo do pagamento:", (reciboError === null || reciboError === void 0 ? void 0 : reciboError.message) || reciboError);
            }
        }
        // Notificação ao cliente
        try {
            const customer = yield CustomerModel_1.CustomerModel.findOne({ where: { accountNumber } });
            if (customer && companyId) {
                yield NotificationModel_1.NotificationModel.create({
                    companyId,
                    recipientType: "customer",
                    recipientId: customer.id,
                    title: "Pagamento confirmado",
                    message: `O seu pagamento de ${Number(result.appliedAmount).toLocaleString("pt-MZ")} MZN foi registado com sucesso.`,
                    type: "payment_received",
                    referenceId: result.tranzactionId,
                    isRead: false,
                });
            }
        }
        catch (err) {
            console.error("Erro ao criar notificação de pagamento:", err);
        }
        // Liquidação do crédito
        try {
            yield checkAndLiquidateLoan(result.realLoanId, Number(companyId), Number(accountNumber));
        }
        catch (err) {
            console.error("Erro ao verificar liquidação do crédito:", err);
        }
        // SMS
        try {
            yield (0, SmsGatewayService_1.enqueuePaymentSms)({
                companyId: Number(companyId),
                transactionId: result.tranzactionId,
                loanId: result.realLoanId,
                amortizationLoanId: Number(amortizationLoanId),
                accountNumber,
                paidAmount: result.appliedAmount,
                latePaymentInterest: result.latePaymentInterest,
                paymentDate: payDate,
                reference: String(tranzactionReference),
            });
        }
        catch (smsError) {
            console.error("Erro ao enfileirar SMS de pagamento:", smsError);
        }
        const responseBody = {
            success: true,
            message: "Payment updated successfully.",
            walletId: result.walletId || null,
            tranzactionId: result.tranzactionId,
            bank_account_id: result.bankAccountId,
            destination: result.destAccountName,
            allocation: {
                applied: result.appliedAmount,
                lateInterest: result.latePaymentInterest,
                overpay: result.overpayAmount,
            },
            recibo: recibo ? { id: Number(recibo.id), numero: recibo.numero, hash: recibo.hash || null, pdf_url: `/api/recibos/${Number(recibo.id)}/pdf`, pdf_path: recibo.pdf_url || null, qr_url: recibo.qr_url || null } : null,
        };
        // Guarda a resposta para idempotência (retries devolvem isto)
        try {
            yield paymentsV2Models_1.IdempotencyKeyModel.update({ response_status: 201, response_body: responseBody }, { where: { idem_key: idemKey } });
        }
        catch ( /* best-effort */_f) { /* best-effort */ }
        return res.status(201).send(responseBody);
    }
    catch (error) {
        // Erros de negócio lançados como { http, payload }
        if ((error === null || error === void 0 ? void 0 : error.http) && (error === null || error === void 0 ? void 0 : error.payload)) {
            return res.status(error.http).json(error.payload);
        }
        // Corrida no índice único de referência (2 pedidos simultâneos)
        if (String(error === null || error === void 0 ? void 0 : error.name).includes("UniqueConstraint") || String((_e = error === null || error === void 0 ? void 0 : error.original) === null || _e === void 0 ? void 0 : _e.code) === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                code: "DUPLICATE_REFERENCE",
                message: "Referência de pagamento duplicada (ou chave de idempotência em uso).",
            });
        }
        console.error("[addTranzaction] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).send({ success: false, message: "There was an error in the payment." });
    }
});
exports.addTranzaction = addTranzaction;
// ─────────────────────────────────────────────────────────────────────────────
// ESTORNO FORMAL — só ADMIN (userRole 0); motivo obrigatório; tudo transaccional
// ─────────────────────────────────────────────────────────────────────────────
const reverseTranzaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _h, _j, _k;
    const decoded = decodeJwt(req);
    if (Number(decoded.userRole) !== 0) {
        return res.status(403).json({
            success: false,
            code: "FORBIDDEN",
            message: "Apenas Administradores podem anular pagamentos.",
        });
    }
    const { id } = req.params;
    const reason = String(((_h = req.body) === null || _h === void 0 ? void 0 : _h.reason) || "").trim();
    if (reason.length < 10) {
        return res.status(400).json({
            success: false,
            code: "REASON_REQUIRED",
            message: "Motivo obrigatório (mínimo 10 caracteres).",
        });
    }
    try {
        const result = yield db_1.db.transaction((t) => __awaiter(void 0, void 0, void 0, function* () {
            // Transacção com lock
            const tranzaction = yield TranzactionModel_1.TranzactionModel.findByPk(Number(id), {
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!tranzaction) {
                throw { http: 404, payload: { success: false, message: "Pagamento não encontrado." } };
            }
            if (String(tranzaction.getDataValue("status")) === "REVERSED") {
                throw {
                    http: 409,
                    payload: { success: false, code: "ALREADY_REVERSED", message: "Este pagamento já foi anulado." },
                };
            }
            const amortizationLoanId = Number(tranzaction.getDataValue("amortizationLoanId"));
            const amount = (0, money_1.round2)((0, money_1.num)(tranzaction.getDataValue("amount")));
            const lateCharged = (0, money_1.round2)((0, money_1.num)(tranzaction.getDataValue("latePaymentInterest")));
            // Prestação com lock — devolve ao estado anterior ao pagamento
            const installment = yield AmortizationLoanModel_1.AmorizationLoanModel.findByPk(amortizationLoanId, {
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!installment) {
                throw { http: 404, payload: { success: false, message: "Prestação da transacção não encontrada." } };
            }
            const installmentValue = (0, money_1.round2)((0, money_1.num)(installment.getDataValue("installment")));
            const paidAmount = (0, money_1.round2)((0, money_1.num)(installment.getDataValue("paidAmount")));
            const paidTowardsBalance = (0, money_1.round2)(Math.max(0, (0, money_1.subMoney)(amount, lateCharged)));
            const newPaid = (0, money_1.round2)(Math.max(0, paidAmount - paidTowardsBalance));
            const newStatus = newPaid <= 0 ? 0 : (0, money_1.moneyGte)(newPaid, installmentValue) ? 1 : -1;
            // Transacção → REVERSED (nunca editar valores; estado por campo status)
            yield tranzaction.update({
                status: "REVERSED",
                reversed_by: Number(decoded.id) || null,
                reversal_reason: reason,
            }, { transaction: t });
            // Recibo original → ANULADO (nunca apagar; o PDF mantém-se para trilha)
            let reciboOriginalId = null;
            try {
                const reciboOriginal = yield ReciboModel_1.ReciboModel.findOne({
                    where: { tranzactionId: Number(id) },
                    transaction: t,
                });
                if (reciboOriginal) {
                    reciboOriginalId = Number(reciboOriginal.getDataValue("id"));
                    yield reciboOriginal.update({ status: "ANULADO", annulment_reason: reason }, { transaction: t });
                }
            }
            catch ( /* tabela recibo indisponível */_l) { /* tabela recibo indisponível */ }
            // Restaura a prestação
            yield installment.update({
                status: newStatus,
                paidAmount: newPaid,
                remainingBalance: newPaid <= 0 ? installmentValue : (0, money_1.round2)(installmentValue - newPaid),
            }, { transaction: t });
            // Alocações do pagamento estornadas
            yield paymentsV2Models_1.PaymentAllocationModel.destroy({ where: { payment_id: Number(id) }, transaction: t });
            // Mora: devolve accruals CHARGED cobrados por este pagamento a ACCRUED
            if (lateCharged > 0) {
                yield db_1.db.query(`UPDATE late_accruals
             SET status = 'ACCRUED'
           WHERE amortization_loan_id = ?
             AND status = 'CHARGED'
             AND id IN (
               SELECT sub.id FROM (
                 SELECT id FROM late_accruals
                  WHERE amortization_loan_id = ? AND status = 'CHARGED'
                  ORDER BY id DESC
                  LIMIT 100
               ) AS sub
             )`, { replacements: [amortizationLoanId, amortizationLoanId], transaction: t });
            }
            // Crédito a favor gerado por este pagamento (overpay) → anula
            yield paymentsV2Models_1.CustomerCreditModel.update({ status: "CANCELLED" }, { where: { source_payment_id: Number(id), status: "ACTIVE" }, transaction: t });
            // ── SALDO DA CONTA DE DESTINO: decrement no mesmo commit do estorno ──
            // (o dinheiro "sai" da conta onde o pagamento tinha entrado)
            const originalBankAccountId = Number(tranzaction.getDataValue("bank_account_id")) || 0;
            if (originalBankAccountId) {
                const { AccountModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/AccountModel")));
                yield AccountModel.decrement("balance", {
                    by: amount,
                    where: { id: originalBankAccountId },
                    transaction: t,
                });
                yield paymentsV2Models_1.AuditLogModel.create({
                    user_id: Number(decoded.id) || null,
                    company_id: tranzaction.getDataValue("companyId"),
                    ip: clientIpOf(req),
                    action: "BANK_ACCOUNT_DEBIT",
                    entity: "accounts",
                    entity_id: originalBankAccountId,
                    before_data: null,
                    after_data: { tranzactionId: Number(id), amount },
                }, { transaction: t });
            }
            // Dívida parcial (se a prestação voltou a dever)
            const { DebtModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/DebtModel")));
            if (newStatus === 1) {
                yield DebtModel.destroy({ where: { amortisationId: amortizationLoanId }, transaction: t });
            }
            else {
                const debtAmount = (0, money_1.round2)(installmentValue - newPaid);
                const existingDebt = yield DebtModel.findOne({
                    where: { amortisationId: amortizationLoanId },
                    transaction: t,
                });
                if (existingDebt) {
                    yield DebtModel.update({ debtAmount }, { where: { id: existingDebt.getDataValue("id") }, transaction: t });
                }
                else {
                    yield DebtModel.create({
                        companyId: tranzaction.getDataValue("companyId"),
                        customerId: installment.getDataValue("customerId"),
                        accountNumber: String(tranzaction.getDataValue("accountNumber")),
                        loanId: tranzaction.getDataValue("loanId"),
                        amortisationId: amortizationLoanId,
                        debtAmount,
                        updatedBy: `Estorno por admin #${decoded.id}`,
                        dateInserted: new Date().toISOString().slice(0, 10),
                    }, { transaction: t });
                }
            }
            // Auditoria
            yield paymentsV2Models_1.AuditLogModel.create({
                user_id: Number(decoded.id) || null,
                company_id: tranzaction.getDataValue("companyId"),
                ip: clientIpOf(req),
                action: "PAYMENT_REVERSE",
                entity: "tranzactions",
                entity_id: Number(id),
                before_data: { status: "CONFIRMED", paidAmount, installmentStatus: Number(installment.getDataValue("status")) },
                after_data: { status: "REVERSED", reason, newPaid, newStatus },
            }, { transaction: t });
            return {
                tranzactionId: Number(id),
                newPaid,
                newStatus,
                lateReversed: lateCharged,
                reciboOriginalId,
                bankAccountId: Number(tranzaction.getDataValue("bank_account_id")) || null,
            };
        }));
        // ── Pós-commit: movimento de SAÍDA no caixa (best-effort) ──
        try {
            const { registerMovement } = yield Promise.resolve().then(() => __importStar(require("../services/treasuryService")));
            const amountReversed = (0, money_1.round2)((0, money_1.num)((_j = req.body) === null || _j === void 0 ? void 0 : _j.amount) || 0);
            if (amountReversed > 0) {
                yield registerMovement({
                    companyId: Number((_k = req.body) === null || _k === void 0 ? void 0 : _k.companyId),
                    userId: Number(decoded.id) || null,
                    type: "SAIDA",
                    category: "REEMBOLSO",
                    amount: amountReversed,
                    paymentMethod: "CASH",
                    description: `Estorno do pagamento #${result.tranzactionId} — ${reason}`,
                    reference: `REV-${result.tranzactionId}`,
                    loanId: null,
                    amortizationLoanId: null,
                    tranzactionId: result.tranzactionId,
                    customerId: null,
                    automatic: true,
                });
            }
        }
        catch (cashError) {
            console.error("[CAIXA] Falha ao registar SAÍDA do estorno:", (cashError === null || cashError === void 0 ? void 0 : cashError.message) || cashError);
        }
        return res.status(200).json({
            success: true,
            message: "Pagamento anulado (estorno) com sucesso.",
            result,
        });
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.http) && (error === null || error === void 0 ? void 0 : error.payload))
            return res.status(error.http).json(error.payload);
        console.error("[reverseTranzaction] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao anular o pagamento." });
    }
});
exports.reverseTranzaction = reverseTranzaction;
// ─────────────────────────────────────────────────────────────────────────────
// UPDATE — COM GUARDAS (recibo emitido → use estorno; REVERSED → imutável)
// ─────────────────────────────────────────────────────────────────────────────
const updateTranzaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _m;
    const { id } = req.params;
    // Guarda 1: recibo emitido → edição proibida (documento legal AT)
    try {
        const recibo = yield ReciboModel_1.ReciboModel.findOne({ where: { tranzactionId: Number(id) } });
        if (recibo) {
            return res.status(403).json({
                success: false,
                code: "RECEIPT_ALREADY_ISSUED",
                message: "Este pagamento já tem recibo emitido — use o estorno formal (POST /api/tranzaction/:id/reverse).",
            });
        }
    }
    catch ( /* tabela recibo indisponível — segue para as restantes guardas */_o) { /* tabela recibo indisponível — segue para as restantes guardas */ }
    // Guarda 2: transacção REVERSED é imutável
    let beforeData = null;
    try {
        const tranzaction = yield TranzactionModel_1.TranzactionModel.findByPk(Number(id));
        if (!tranzaction) {
            return res.status(404).json({ success: false, message: "Not found" });
        }
        if (String(tranzaction.getDataValue("status")) === "REVERSED") {
            return res.status(403).json({
                success: false,
                code: "REVERSED_IMMUTABLE",
                message: "Transacção anulada — imutável.",
            });
        }
        beforeData = {
            phoneNumber: tranzaction.getDataValue("phoneNumber"),
            description: tranzaction.getDataValue("description"),
            notes: tranzaction.getDataValue("notes"),
        };
    }
    catch ( /* segue */_p) { /* segue */ }
    // Guarda 3: whitelist de campos — valores monetários NUNCA por aqui
    const allowedFields = ["phoneNumber", "description", "notes", "receiptUrl"];
    const patch = {};
    for (const field of allowedFields) {
        if (((_m = req.body) === null || _m === void 0 ? void 0 : _m[field]) !== undefined)
            patch[field] = req.body[field];
    }
    if (Object.keys(patch).length === 0) {
        return res.status(400).json({
            success: false,
            code: "NO_VALID_FIELDS",
            message: "Nenhum campo editável enviado (valores monetários exigem estorno formal).",
        });
    }
    const tranzaction = yield TranzactionModel_1.TranzactionModel.update(patch, { where: { id } });
    // Auditoria da edição (best-effort)
    yield writeAudit(req, "PAYMENT_UPDATE", "tranzactions", Number(id), beforeData, patch, null);
    return tranzaction != null
        ? res.status(201).send({ success: true, message: "Payment updated successfully." })
        : res.status(500).send({ success: false, message: "Not found" });
});
exports.updateTranzaction = updateTranzaction;
/**
 * Verifica se todas as prestações de um crédito foram pagas (status = 1).
 * Se sim, actualiza o status do crédito para 3 (Liquidado) e notifica.
 * (Legado mantido — chamado pós-commit.)
 */
const checkAndLiquidateLoan = (loanId, companyId, accountNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const allInstallments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: { loanId },
    });
    if (allInstallments.length === 0)
        return;
    const allPaid = allInstallments.every((inst) => Number(inst.status) === 1);
    if (!allPaid)
        return;
    const loan = yield LoanModel_1.LoanModel.findByPk(loanId);
    if (!loan || Number(loan.status) === 3)
        return;
    yield LoanModel_1.LoanModel.update({ status: 3 }, { where: { id: loanId } });
    const loanAmount = Number(loan.amount).toLocaleString("pt-MZ");
    try {
        const customer = yield CustomerModel_1.CustomerModel.findOne({ where: { accountNumber } });
        if (customer) {
            yield NotificationModel_1.NotificationModel.create({
                companyId,
                recipientType: "customer",
                recipientId: customer.id,
                title: "Crédito liquidado",
                message: `Parabéns! O seu crédito de ${loanAmount} MZN foi totalmente liquidado. Todas as prestações foram pagas com sucesso.`,
                type: "loan_approved",
                referenceId: loanId,
                isRead: false,
            });
        }
    }
    catch (err) {
        console.error("Erro ao notificar cliente sobre liquidação:", err);
    }
    try {
        const admins = yield UserModel_1.UserModel.findAll({
            where: { companyId, userRole: 0 },
        });
        const bulkNotifs = [];
        for (const admin of admins) {
            bulkNotifs.push({
                companyId,
                recipientType: "admin",
                recipientId: admin.id,
                title: "Crédito liquidado",
                message: `O crédito de ${loanAmount} MZN (conta ${accountNumber}) foi totalmente liquidado.`,
                type: "payment_received",
                referenceId: loanId,
                isRead: false,
            });
        }
        if (bulkNotifs.length > 0) {
            yield NotificationModel_1.NotificationModel.bulkCreate(bulkNotifs);
        }
    }
    catch (err) {
        console.error("Erro ao notificar admins sobre liquidação:", err);
    }
    try {
        if (loan.creditManager) {
            yield NotificationModel_1.NotificationModel.create({
                companyId,
                recipientType: "gestor",
                recipientId: loan.creditManager,
                title: "Crédito liquidado",
                message: `O crédito de ${loanAmount} MZN (conta ${accountNumber}) foi totalmente liquidado.`,
                type: "payment_received",
                referenceId: loanId,
                isRead: false,
            });
        }
    }
    catch (err) {
        console.error("Erro ao notificar gestor sobre liquidação:", err);
    }
});
exports.checkAndLiquidateLoan = checkAndLiquidateLoan;
