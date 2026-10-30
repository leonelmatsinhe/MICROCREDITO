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
exports.sendCustomerCredentials = exports.getCustomerPaymentReciboPdf = exports.requestCustomerLoan = exports.registerPortalPayment = exports.getCustomerLoanDetail = exports.getCustomerDashboard = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
const db_1 = require("../database/db");
const ReciboModel_1 = require("../database/models/ReciboModel");
const reciboService_1 = require("../services/reciboService");
const password_1 = require("../utils/password");
const CustomerModel_1 = require("../database/models/CustomerModel");
const LoanModel_1 = require("../database/models/LoanModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const UserModel_1 = require("../database/models/UserModel");
const NotificationModel_1 = require("../database/models/NotificationModel");
const MpesaOpenApiService_1 = require("../services/MpesaOpenApiService");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
const lateInterestService_1 = require("../services/lateInterestService");
const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
// Dashboard do mutuário — créditos, prestações, resumo
const getCustomerDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId, companyId } = req.params;
        const customerIdNum = parseInt(String(customerId), 10);
        const companyIdNum = parseInt(String(companyId), 10);
        if (Number.isNaN(customerIdNum) || Number.isNaN(companyIdNum)) {
            return res.status(400).json({ success: false, message: "IDs inválidos." });
        }
        // Buscar cliente
        const customer = yield CustomerModel_1.CustomerModel.findOne({
            where: { id: customerIdNum, companyId: companyIdNum },
        });
        if (!customer) {
            return res.status(404).json({ success: false, message: "Cliente não encontrado." });
        }
        const customerData = customer.toJSON();
        // Taxa diária de mora + limites de invalidação/limitação — MESMA FONTE
        // (motor V2 company_penalty_rules com fallback companies.forfeit)
        const { forfeit, maxLateDays, capPercent } = yield (0, lateInterestService_1.getLegacyPenaltyParams)(companyIdNum);
        // Buscar créditos do cliente
        const loans = yield LoanModel_1.LoanModel.findAll({
            where: { companyId: companyIdNum, customerId: customerIdNum },
            order: [["id", "DESC"]],
        });
        const loanList = [];
        let totalDisbursed = 0;
        let totalPaid = 0;
        let totalDebt = 0;
        let globalTotalLateFee = 0;
        for (const loan of loans) {
            const loanData = loan.toJSON();
            const status = Number(loanData.status);
            loanData.status = status;
            // Buscar prestações — a ordem cronológica é sempre pela data de vencimento
            const installments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
                where: { companyId: companyIdNum, loanId: loanData.id },
                order: [["dueDate", "ASC"], ["id", "ASC"]],
            });
            // MESMA FONTE DE VERDADE do Admin/Gestor (/api/loan/amortization): enriquece
            // cada prestação com paidAmount, remainingBalance, lateDays e latePaymentInterest
            // (mora = prestação × (forfeit/100) × dias em atraso).
            const installmentList = (0, calculateLateAmount_1.installmentPanification)(installments, forfeit, undefined, { maxLateDays, capPercent });
            const installmentIds = installments.map((item) => item.id);
            const paidTransactions = installmentIds.length > 0
                ? yield TranzactionModel_1.TranzactionModel.findAll({
                    where: { amortizationLoanId: { [sequelize_1.Op.in]: installmentIds } },
                    attributes: ["id", "amortizationLoanId", "amount", "latePaymentInterest", "paymentDate"],
                    order: [["id", "ASC"]],
                    raw: true,
                })
                : [];
            const chargedLateByInstallment = {};
            paidTransactions.forEach((tx) => {
                const item = installments.find((entry) => Number(entry.id) === Number(tx.amortizationLoanId));
                if (!item)
                    return;
                const key = Number(tx.amortizationLoanId);
                const paymentDate = tx.paymentDate ? String(tx.paymentDate).slice(0, 10) : null;
                const dueDate = String(item.dueDate || '').slice(0, 10);
                const days = paymentDate && dueDate
                    ? Math.max(0, Math.floor((new Date(`${paymentDate}T00:00:00`).getTime() - new Date(`${dueDate}T00:00:00`).getTime()) / 86400000))
                    : 0;
                const current = chargedLateByInstallment[key] || { interest: 0, days: 0, date: null, paid: 0, value: Number(item.installment) || 0 };
                current.paid += Number(tx.amount) || 0;
                const dateInterest = Number(tx.latePaymentInterest) || 0;
                current.interest = Math.max(current.interest, dateInterest);
                if (!current.date && current.paid >= current.value - 0.01) {
                    current.days = days;
                    current.date = paymentDate;
                }
                chargedLateByInstallment[key] = current;
            });
            const paidInstallments = installmentList.filter((a) => Number(a.status) === 1);
            const pendingInstallments = installmentList.filter((a) => Number(a.status) !== 1);
            // Calcular totais
            const loanTotal = installmentList.reduce((sum, a) => sum + (Number(a.installment) || 0), 0);
            const loanPaid = installmentList.reduce((sum, a) => sum + (Number(a.paidAmount) || (Number(a.status) === 1 ? Number(a.installment) : 0)), 0);
            // Juros de mora pendentes — soma da mora calculada pela fonte de verdade
            const totalLateFee = installmentList.filter((a) => Number(a.status) !== 1).reduce((sum, a) => sum + (Number(a.latePaymentInterest) || 0), 0);
            const loanDebt = Math.max(0, loanTotal - loanPaid);
            if (status === 1 || status === 3) {
                totalDisbursed += Number(loanData.amount) || 0;
            }
            totalPaid += loanPaid;
            totalDebt += Math.max(0, loanDebt);
            globalTotalLateFee += totalLateFee;
            loanList.push({
                id: loanData.id,
                amount: loanData.amount,
                interestRate: loanData.interestRate,
                numberOfInstallments: loanData.numberOfInstallments,
                status: loanData.status,
                dateCreated: loanData.dateCreated,
                loanDescription: loanData.loanDescription,
                totalPaid: loanPaid,
                totalDebt: Math.max(0, loanDebt),
                totalLateFee: globalTotalLateFee,
                paidCount: paidInstallments.length,
                pendingCount: pendingInstallments.length,
                installments: installmentList.map((a) => {
                    var _a, _b, _c, _d, _e, _f;
                    return ({
                        id: a.id,
                        installmentOrder: a.installmentOrder,
                        installment: a.installment,
                        dueDate: a.dueDate,
                        status: Number(a.status),
                        paidAmount: Number(a.paidAmount) || 0,
                        amortization: Number(a.amortization) || 0,
                        rateAmount: Number(a.rateAmount) || 0,
                        remainingBalance: Number(a.remainingBalance) || 0,
                        lateDays: Number(a.status) === 1 ? (((_a = chargedLateByInstallment[Number(a.id)]) === null || _a === void 0 ? void 0 : _a.days) || 0) : Number(a.lateDays) || 0,
                        latePaymentInterest: Number(a.status) === 1 ? (((_b = chargedLateByInstallment[Number(a.id)]) === null || _b === void 0 ? void 0 : _b.interest) || 0) : Number(a.latePaymentInterest) || 0,
                        chargedLateDays: ((_c = chargedLateByInstallment[Number(a.id)]) === null || _c === void 0 ? void 0 : _c.days) || 0,
                        chargedLatePaymentInterest: ((_d = chargedLateByInstallment[Number(a.id)]) === null || _d === void 0 ? void 0 : _d.interest) || 0,
                        chargedLateDate: ((_e = chargedLateByInstallment[Number(a.id)]) === null || _e === void 0 ? void 0 : _e.date) || null,
                        totalToPay: Math.round((Number(a.installment) + (Number(a.status) === 1 ? (((_f = chargedLateByInstallment[Number(a.id)]) === null || _f === void 0 ? void 0 : _f.interest) || 0) : Number(a.latePaymentInterest) || 0)) * 100) / 100,
                    });
                }),
            });
        }
        // Mapa prestação (amortizationLoanId) → número de ordem, para o histórico
        const installmentOrderById = {};
        loanList.forEach((loan) => {
            (loan.installments || []).forEach((inst) => {
                installmentOrderById[Number(inst.id)] = inst.installmentOrder;
            });
        });
        // Histórico de pagamentos (todas as transações da conta)
        const transactions = yield TranzactionModel_1.TranzactionModel.findAll({
            where: { companyId: companyIdNum, customerId },
            order: [["createdAt", "DESC"]],
        });
        // Recibos já emitidos para os pagamentos deste cliente (mapa tranzactionId →
        // recibo), para o histórico mostrar o comprovativo de cada pagamento.
        const reciboByTranzaction = {};
        try {
            const txIds = transactions.map((t) => toNumber(t.id)).filter(Boolean);
            if (txIds.length > 0) {
                const recibosRows = (yield ReciboModel_1.ReciboModel.findAll({
                    where: { companyId: companyIdNum, tranzactionId: { [sequelize_1.Op.in]: txIds } },
                    attributes: ["id", "tranzactionId", "numero", "pdf_url"],
                    raw: true,
                }));
                (recibosRows || []).forEach((row) => {
                    reciboByTranzaction[Number(row.tranzactionId)] = row;
                });
            }
        }
        catch (error) {
            // A tabela pode ainda não existir numa base antiga — o portal funciona sem recibos.
            console.error("[Portal Mutuário] Recibos indisponíveis:", (error === null || error === void 0 ? void 0 : error.message) || error);
        }
        const payments = transactions.map((t) => {
            const tx = t.toJSON();
            const recibo = reciboByTranzaction[Number(tx.id)] || null;
            return {
                id: tx.id,
                amount: toNumber(tx.amount),
                totalAmount: toNumber(tx.totalAmount) || (toNumber(tx.amount) + (toNumber(tx.latePaymentInterest) || toNumber(tx.mora_amount))),
                principalAmount: toNumber(tx.amount),
                // Comprovativo do pagamento (recibo com numeração sequencial legal)
                reciboId: recibo ? Number(recibo.id) : null,
                reciboNumero: recibo ? recibo.numero : null,
                reciboPdf: recibo ? recibo.pdf_url : null,
                // As transacções registadas no portal já se encontram concluídas
                status: "completed",
                reference: tx.tranzactionReference || null,
                paymentMethod: tx.paymentMethod || null,
                // Dados da prestação liquidada (para o histórico do portal)
                amortizationLoanId: tx.amortizationLoanId || null,
                installmentOrder: installmentOrderById[Number(tx.amortizationLoanId)] || null,
                paymentDate: tx.paymentDate || null,
                latePaymentInterest: toNumber(tx.latePaymentInterest) || toNumber(tx.mora_amount),
                createdAt: tx.createdAt,
            };
        });
        const activeLoansList = loanList.filter((l) => Number(l.status) === 1);
        const pendingLoansList = loanList.filter((l) => Number(l.status) === 0);
        // Conta de colecta da empresa (M-Pesa por defeito) — para o portal mostrar
        // onde o cliente deve enviar o pagamento.
        let collectAccount = null;
        try {
            const { getDefaultCollectAccount } = yield Promise.resolve().then(() => __importStar(require("../services/bankAccountService")));
            collectAccount = yield getDefaultCollectAccount(companyIdNum);
        }
        catch ( /* portal funciona sem conta configurada */_a) { /* portal funciona sem conta configurada */ }
        return res.status(200).json({
            success: true,
            collectAccount: collectAccount
                ? {
                    id: collectAccount.id,
                    bank_name: collectAccount.bank_name,
                    accountNumber: collectAccount.accountNumber,
                    accountHolder: collectAccount.accountHolder || null,
                    type: collectAccount.type,
                }
                : null,
            customer: {
                id: customerData.id,
                name: customerData.customerName,
                phone: customerData.customerPhone,
                email: customerData.customerEmail || null,
                accountNumber: customerData.accountNumber,
                nuit: customerData.customerNuit || null,
                isSelfRegistered: customerData.isSelfRegistered || 0,
                registrationDate: customerData.createdAt || customerData.dateCreated || null,
                monthlySalary: customerData.customerMonthlySalary
                    ? Number(customerData.customerMonthlySalary)
                    : 0,
            },
            summary: {
                totalLoans: loans.length,
                // Nº de créditos activos (status 1)
                activeLoans: activeLoansList.length,
                // Valor do crédito activo (soma dos montantes dos créditos activos)
                activeLoanAmount: Number(activeLoansList
                    .reduce((sum, l) => sum + toNumber(l.amount), 0)
                    .toFixed(2)),
                // Pedidos pendentes (status 0) — usados pelo portal para avisar o mutuário
                pendingLoans: pendingLoansList.length,
                pendingAmount: Number(pendingLoansList
                    .reduce((sum, l) => sum + toNumber(l.amount), 0)
                    .toFixed(2)),
                totalDisbursed,
                totalPaid,
                totalDebt,
                totalLateFee: globalTotalLateFee,
                totalMoraPaid: transactions.reduce((sum, tx) => sum + (toNumber(tx.latePaymentInterest) || toNumber(tx.mora_amount)), 0),
            },
            loans: loanList,
            payments,
        });
    }
    catch (error) {
        console.error("Erro no portal do mutuário:", error);
        return res.status(500).json({ success: false, message: error.message || "Erro interno." });
    }
});
exports.getCustomerDashboard = getCustomerDashboard;
// Detalhes de um préstamo específico
const getCustomerLoanDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId, loanId } = req.params;
        const customerIdNum = parseInt(String(customerId), 10);
        const loanIdNum = parseInt(String(loanId), 10);
        const loan = yield LoanModel_1.LoanModel.findByPk(loanIdNum);
        if (!loan) {
            return res.status(404).json({ success: false, message: "Empréstimo não encontrado." });
        }
        const loanData = loan.toJSON();
        // Verificar se pertence ao cliente
        const customer = yield CustomerModel_1.CustomerModel.findOne({
            where: { id: customerIdNum, companyId: loanData.companyId },
        });
        if (!customer || Number(loanData.customerId) !== customerIdNum) {
            return res.status(403).json({ success: false, message: "Acesso negado." });
        }
        // Buscar prestações — ordem cronológica pela data de vencimento
        const installments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { companyId: loanData.companyId, loanId: loanIdNum },
            order: [["dueDate", "ASC"], ["id", "ASC"]],
        });
        // Buscar pagamentos
        const payments = yield TranzactionModel_1.TranzactionModel.findAll({
            where: { companyId: loanData.companyId, loanId: loanIdNum },
            order: [["createdAt", "DESC"]],
        });
        return res.status(200).json({
            success: true,
            loan: loanData,
            installments: installments.map((a) => a.toJSON()),
            payments: payments.map((p) => p.toJSON()),
        });
    }
    catch (error) {
        console.error("Erro ao buscar detalhes:", error);
        return res.status(500).json({ success: false, message: error.message || "Erro interno." });
    }
});
exports.getCustomerLoanDetail = getCustomerLoanDetail;
// ============================================================
// Pagamento de prestação a partir do portal do mutuário.
// MÉTODO EXCLUSIVO: M-Pesa Open API (C2B assíncrono com webhook e polling).
// Assegura robustez total, eliminação de risco de timeout e emissão
// imediata do recibo oficial com QR Code.
// ============================================================
const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;
const registerPortalPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, customerId } = req.params;
        const { installmentId, loanId, amount, method, phone, } = req.body;
        const companyIdNum = parseInt(String(companyId), 10);
        const customerIdNum = parseInt(String(customerId), 10);
        const loanIdNum = parseInt(String(loanId), 10);
        const installmentIdNum = parseInt(String(installmentId), 10);
        if (Number.isNaN(companyIdNum) ||
            Number.isNaN(customerIdNum) ||
            Number.isNaN(loanIdNum) ||
            Number.isNaN(installmentIdNum)) {
            return res.status(400).json({ success: false, message: "Parâmetros inválidos." });
        }
        const payMethod = String(method || "mpesa").toLowerCase();
        if (payMethod !== "mpesa") {
            return res.status(400).json({
                success: false,
                message: "Os pagamentos de prestações são processados exclusivamente via M-Pesa Open API.",
            });
        }
        const payerPhone = String(phone || "").trim();
        if (!payerPhone) {
            return res.status(400).json({
                success: false,
                message: "Indique o número de telemóvel M-Pesa (ex.: 25884xxxxxxx).",
            });
        }
        const paymentAmount = round2(toNumber(amount));
        if (!(paymentAmount > 0)) {
            return res.status(400).json({ success: false, message: "Indique um valor de pagamento superior a 0 MZN." });
        }
        const result = yield (0, MpesaOpenApiService_1.initiateC2BPayment)({
            companyId: companyIdNum,
            customerId: customerIdNum,
            loanId: loanIdNum,
            amortizationLoanId: installmentIdNum,
            amount: paymentAmount,
            phone: payerPhone,
        });
        if (result.status === "SUCCESS") {
            return res.status(201).json({
                success: true,
                status: "SUCCESS",
                message: result.message,
                reference: result.transactionReference,
                mpesaReceipt: result.mpesaReceipt,
                tranzactionId: result.tranzactionId,
                recibo: result.recibo,
                isPartial: result.isPartial,
            });
        }
        if (result.status === "PENDING_PIN") {
            return res.status(200).json({
                success: true,
                status: "PENDING_PIN",
                mpesaTxId: result.mpesaTxId,
                reference: result.transactionReference,
                message: result.message,
            });
        }
        return res.status(400).json({
            success: false,
            status: "FAILED",
            message: result.message,
        });
    }
    catch (error) {
        console.error("[Portal Mutuário] Erro no pagamento M-Pesa:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(400).json({ success: false, message: (error === null || error === void 0 ? void 0 : error.message) || "Erro interno ao processar pagamento." });
    }
});
exports.registerPortalPayment = registerPortalPayment;
const requestCustomerLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, customerId } = req.params;
        const { amount, numberOfInstallments, loanDescription, capacityExcessObservation, } = req.body;
        const companyIdNum = parseInt(String(companyId), 10);
        const customerIdNum = parseInt(String(customerId), 10);
        if (Number.isNaN(companyIdNum) || Number.isNaN(customerIdNum)) {
            return res.status(400).json({ success: false, message: "IDs inválidos." });
        }
        const loanAmount = toNumber(amount);
        const installments = parseInt(String(numberOfInstallments), 10);
        if (!(loanAmount > 0)) {
            return res
                .status(400)
                .json({ success: false, message: "Indique o montante pretendido (maior que 0)." });
        }
        if (Number.isNaN(installments) || installments < 1 || installments > 18) {
            return res.status(400).json({
                success: false,
                message: "Número de prestações inválido (entre 1 e 18 meses).",
            });
        }
        const customer = yield CustomerModel_1.CustomerModel.findOne({
            where: { id: customerIdNum, companyId: companyIdNum },
        });
        if (!customer) {
            return res.status(404).json({ success: false, message: "Cliente não encontrado." });
        }
        const customerData = customer.toJSON();
        // O mutuário só pode solicitar novo crédito quando toda a dívida estiver liquidada
        const outstandingLoans = yield LoanModel_1.LoanModel.findAll({
            where: {
                companyId: companyIdNum,
                customerId: customerIdNum,
                status: { [sequelize_1.Op.in]: [1, 3] },
            },
        });
        let outstandingDebt = 0;
        for (const outstandingLoan of outstandingLoans) {
            const loanIdNum = toNumber(outstandingLoan.id);
            if (!loanIdNum)
                continue;
            const installmentRows = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
                where: { loanId: loanIdNum },
            });
            installmentRows.forEach((row) => {
                const data = row.toJSON();
                if (Number(data.status) === 1)
                    return;
                const remaining = (toNumber(data.installment) || 0) - (toNumber(data.paidAmount) || 0);
                if (remaining > 0)
                    outstandingDebt += remaining;
            });
        }
        if (outstandingDebt > 0) {
            return res.status(400).json({
                success: false,
                message: `Não é possível solicitar novo crédito com dívida por liquidar (${outstandingDebt.toLocaleString("pt-MZ")} MZN). Solicite apenas quando toda a dívida estiver liquidada.`,
            });
        }
        // Evitar pedidos duplicados enquanto existir um em análise
        const existingPending = yield LoanModel_1.LoanModel.findOne({
            where: {
                companyId: companyIdNum,
                customerId: customerIdNum,
                status: 0,
            },
        });
        if (existingPending) {
            return res.status(400).json({
                success: false,
                message: "Já existe um pedido de crédito em análise. Aguarde a resposta da instituição.",
            });
        }
        // Atribuir gestor: mantém o do último crédito ou usa o primeiro gestor da empresa
        const lastLoan = yield LoanModel_1.LoanModel.findOne({
            where: { companyId: companyIdNum, customerId: customerIdNum },
            order: [["id", "DESC"]],
        });
        let creditManager = lastLoan ? toNumber(lastLoan.creditManager) : 0;
        if (!creditManager || creditManager < 1) {
            const firstManager = yield UserModel_1.UserModel.findOne({
                where: {
                    companyId: companyIdNum,
                    userRole: { [sequelize_1.Op.in]: [1, 3] },
                },
                order: [["id", "ASC"]],
            });
            creditManager = firstManager ? toNumber(firstManager.id) : 0;
        }
        const observation = String(capacityExcessObservation || "").trim();
        const loan = yield LoanModel_1.LoanModel.create({
            companyId: companyIdNum,
            accountNumber: customerData.accountNumber,
            customerId: customerIdNum,
            amount: loanAmount,
            numberOfInstallments: installments,
            // A taxa de juro é definida pelo Admin/Gestor na aprovação (0 até lá)
            interestRate: 0,
            creditManager,
            loanDescription: String(loanDescription || "").trim() || "Pedido de novo crédito efectuado no portal do mutuário",
            capacityExcessObservation: observation || null,
            dateCreated: new Date().toISOString().slice(0, 10),
            status: 0,
        });
        // Notificar administradores/gestores da empresa
        try {
            const staffWhere = [{ companyId: companyIdNum, userRole: { [sequelize_1.Op.in]: [0, 1] } }];
            if (creditManager > 0) {
                staffWhere.push({ companyId: companyIdNum, id: creditManager });
            }
            const staff = yield UserModel_1.UserModel.findAll({
                where: { [sequelize_1.Op.or]: staffWhere },
            });
            const recipients = [];
            const seen = new Set();
            for (const user of staff) {
                const userId = toNumber(user.id);
                if (!userId || seen.has(userId))
                    continue;
                seen.add(userId);
                recipients.push({
                    companyId: companyIdNum,
                    recipientType: "admin",
                    recipientId: userId,
                    title: "Nova solicitação de crédito",
                    message: `Conta ${customerData.accountNumber} solicitou um crédito de ${loanAmount.toLocaleString("pt-MZ")} MZN.`,
                    type: "loan_request",
                    referenceId: loan.id,
                    isRead: false,
                });
            }
            if (recipients.length > 0) {
                yield NotificationModel_1.NotificationModel.bulkCreate(recipients);
            }
        }
        catch (err) {
            console.error("Erro ao notificar nova solicitação de crédito:", err);
        }
        return res.status(201).json({
            success: true,
            message: "Pedido enviado com sucesso. A instituição definirá a taxa de juro e responderá em breve.",
            loanId: loan.id,
        });
    }
    catch (error) {
        console.error("Erro ao solicitar novo crédito:", error);
        return res.status(500).json({ success: false, message: error.message || "Erro interno." });
    }
});
exports.requestCustomerLoan = requestCustomerLoan;
// ============================================================
// Recibo (comprovativo) de um pagamento, a partir do portal do mutuário.
// O recibo tem numeração sequencial legal (AT) e é emitido UMA vez por
// pagamento — se ainda não existir (pagamentos anteriores à numeração de
// recibos), é emitido agora, de forma idempotente.
// A rota vive na zona pública do portal, mas o recibo só é devolvido se o
// pagamento pertencer mesmo ao cliente/empresa indicados no caminho.
// ============================================================
const getCustomerPaymentReciboPdf = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyIdNum = parseInt(String(req.params.companyId), 10);
        const customerIdNum = parseInt(String(req.params.customerId), 10);
        const tranzactionIdNum = parseInt(String(req.params.tranzactionId), 10);
        if (Number.isNaN(companyIdNum) ||
            Number.isNaN(customerIdNum) ||
            Number.isNaN(tranzactionIdNum)) {
            return res.status(400).json({ success: false, message: "Parâmetros inválidos." });
        }
        // O pagamento tem de pertencer a este cliente desta empresa.
        const tranzaction = (yield TranzactionModel_1.TranzactionModel.findOne({
            where: {
                id: tranzactionIdNum,
                companyId: companyIdNum,
                customerId: customerIdNum,
            },
            raw: true,
        }));
        if (!tranzaction) {
            return res.status(404).json({ success: false, message: "Pagamento não encontrado." });
        }
        // Um recibo por pagamento (idempotente).
        let recibo = (yield ReciboModel_1.ReciboModel.findOne({
            where: { companyId: companyIdNum, tranzactionId: tranzactionIdNum },
            raw: true,
        }));
        if (!recibo) {
            const { generateReciboForTranzaction } = yield Promise.resolve().then(() => __importStar(require("../services/reciboService")));
            recibo = yield generateReciboForTranzaction({
                tranzactionId: tranzactionIdNum,
                companyId: companyIdNum,
                createdBy: null,
            });
        }
        if (!recibo) {
            return res.status(500).json({ success: false, message: "Não foi possível emitir o recibo." });
        }
        const reciboId = toNumber(recibo.id);
        const detalhe = yield (0, reciboService_1.getReciboDetalhe)(reciboId);
        if (!detalhe) {
            return res.status(404).json({ success: false, message: "Recibo não encontrado." });
        }
        // O recibo pode ter sido emitido antes de o pagamento trazer o cliente —
        // confirma-se sempre pelo crédito/pagamento, nunca apenas pelo caminho.
        const reciboCustomerId = toNumber(detalhe.recibo.customerId);
        if (reciboCustomerId && reciboCustomerId !== customerIdNum) {
            return res.status(403).json({ success: false, message: "Acesso negado." });
        }
        // PDF: reutiliza o ficheiro em disco; gera na primeira chamada.
        const docDir = path_1.default.join(process.cwd(), "uploads", "docs");
        let pdfUrl = detalhe.recibo.pdf_url;
        let filePath = pdfUrl ? path_1.default.join(docDir, path_1.default.basename(String(pdfUrl))) : "";
        if (!pdfUrl || !fs_1.default.existsSync(filePath)) {
            pdfUrl = yield (0, reciboService_1.renderReciboPdf)(reciboId);
            filePath = pdfUrl ? path_1.default.join(docDir, path_1.default.basename(String(pdfUrl))) : "";
            if (pdfUrl) {
                yield ReciboModel_1.ReciboModel.update({ pdf_url: pdfUrl }, { where: { id: reciboId } });
            }
        }
        if (!filePath || !fs_1.default.existsSync(filePath)) {
            return res.status(500).json({ success: false, message: "Não foi possível gerar o PDF do recibo." });
        }
        const numero = String(detalhe.recibo.numero || `recibo-${reciboId}`);
        const disposition = String(req.query.download || "") === "1" ? "attachment" : "inline";
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `${disposition}; filename="Recibo-${numero.replace(/[^A-Za-z0-9-]/g, "")}.pdf"`);
        return res.sendFile(filePath);
    }
    catch (error) {
        console.error("[Portal Mutuário] Erro no recibo do pagamento:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao obter o recibo do pagamento." });
    }
});
exports.getCustomerPaymentReciboPdf = getCustomerPaymentReciboPdf;
// Gerar código de 6 dígitos
const generateSixDigitCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
// Enviar credenciais ao mutuário
const sendCustomerCredentials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId, channel, newPassword } = req.body;
        if (!customerId) {
            return res.status(400).json({ success: false, message: "customerId é obrigatório." });
        }
        const customer = yield CustomerModel_1.CustomerModel.findByPk(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Cliente não encontrado." });
        }
        const customerData = customer.toJSON();
        const phone = customerData.customerPhone;
        if (!phone) {
            return res.status(400).json({ success: false, message: "Cliente não possui telefone." });
        }
        // Verificar se já foi enviado (via raw query)
        let alreadySent = false;
        let sentAt = '';
        try {
            const [rows] = yield db_1.db.query(`SELECT credentialsSent, credentialsSentAt FROM customers WHERE id = ${customerId}`);
            if (rows && rows.length > 0) {
                alreadySent = rows[0].credentialsSent === 1;
                sentAt = rows[0].credentialsSentAt || '';
            }
        }
        catch (e) { /* coluna pode não existir ainda */ }
        // Gerar nova senha se não foi fornecida
        const password = newPassword || generateSixDigitCode();
        // Se já foi enviado e NÃO vem uma senha nova explícita, não há nada para
        // gravar nem reenviar — apenas notificar. (Se o modal gerou um código novo,
        // `newPassword` está presente e o reenvio prossegue normalmente abaixo.)
        if (alreadySent && !newPassword) {
            return res.status(200).json({
                success: true,
                alreadySent: true,
                message: `As credenciais já foram enviadas anteriormente em ${sentAt || 'data desconhecida'}.`,
                password: '',
            });
        }
        // Actualizar senha com hash bcrypt — mas NUNCA voltar a encriptar um valor
        // que já seja hash (double-hash tornaria o login impossível).
        yield customer.update({ password: (0, password_1.hashPasswordIfNeeded)(password) });
        // Tentar enviar via canal escolhido (SMS/WhatsApp)
        let channelMessage = '';
        let enqueued = false;
        try {
            if (channel === "whatsapp") {
                const { sendPasswordResetWhatsApp } = yield Promise.resolve().then(() => __importStar(require("../services/WhatsAppService")));
                yield sendPasswordResetWhatsApp({
                    companyId: customerData.companyId,
                    accountNumber: customerData.accountNumber,
                    newPassword: password,
                });
                channelMessage = 'via WhatsApp';
                enqueued = true;
            }
            else {
                const { enqueuePasswordResetSms } = yield Promise.resolve().then(() => __importStar(require("../services/SmsGatewayService")));
                const result = yield enqueuePasswordResetSms({
                    companyId: customerData.companyId,
                    accountNumber: customerData.accountNumber,
                    newPassword: password,
                });
                if (result === null || result === void 0 ? void 0 : result.created) {
                    channelMessage = 'via SMS';
                    enqueued = true;
                }
                else if ((result === null || result === void 0 ? void 0 : result.reason) === 'sms_disabled') {
                    channelMessage = '(SMS desactivado nas configurações da empresa - contacte o Administrador)';
                }
                else {
                    channelMessage = '(não enviado - telefone inválido ou em falta)';
                }
            }
        }
        catch (e) {
            // SMS/WhatsApp pode não estar configurado
            channelMessage = '(envio pendente - configure SMS/WhatsApp)';
        }
        // Só marcar credenciais como enviadas quando o SMS/WhatsApp foi
        // realmente enfileirado — senão o mutuário fica sem acesso e a UI
        // diz que já foram enviadas.
        if (enqueued) {
            try {
                yield db_1.db.query(`UPDATE customers SET credentialsSent = 1, credentialsSentAt = '${new Date().toISOString()}' WHERE id = ${customerId}`);
            }
            catch (e) { /* coluna pode não existir ainda */ }
        }
        return res.status(200).json({
            success: true,
            alreadySent: false,
            resent: alreadySent,
            enqueued,
            password: password,
            message: alreadySent
                ? `Credenciais reenviadas ${channelMessage}.`
                : `Credenciais actualizadas ${channelMessage}.`,
        });
    }
    catch (error) {
        console.error("Envio de credenciais:", error);
        return res.status(500).json({ success: false, message: error.message || "Erro interno." });
    }
});
exports.sendCustomerCredentials = sendCustomerCredentials;
