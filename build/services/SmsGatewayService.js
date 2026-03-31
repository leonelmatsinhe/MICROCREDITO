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
exports.hydrateSmsQueuePayload = exports.listSmsQueueHistory = exports.getPendingSmsQueue = exports.enqueueOutstandingLateInterestAlerts = exports.enqueueUpcomingInstallmentAlerts = exports.enqueueLateInterestSms = exports.enqueuePaymentSms = exports.enqueueDisbursementSms = exports.enqueueSms = void 0;
const moment_1 = __importDefault(require("moment"));
const sequelize_1 = require("sequelize");
const SmsQueueModel_1 = require("../database/models/SmsQueueModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const DebtModel_1 = require("../database/models/DebtModel");
const normalizePhoneForGateway = (phone) => {
    if (!phone)
        return null;
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length === 12)
        return digits.slice(3);
    if (digits.length === 9)
        return digits;
    return null;
};
const safeMoney = (value) => Number(value || 0).toLocaleString("pt-MZ");
const parsePayload = (value) => {
    if (!value)
        return null;
    if (typeof value === "object")
        return value;
    try {
        return JSON.parse(String(value));
    }
    catch (_a) {
        return null;
    }
};
const getCustomerForSms = (companyId, accountNumber) => __awaiter(void 0, void 0, void 0, function* () {
    return CustomerModel_1.CustomerModel.findOne({
        where: { companyId, accountNumber },
        attributes: ["id", "customerName", "customerPhone", "accountNumber"],
    });
});
const buildQueuePayload = (payload) => {
    var _a, _b, _c, _d;
    const normalizedPhone = normalizePhoneForGateway(payload.phone || null);
    if (!normalizedPhone)
        return null;
    return {
        companyId: payload.companyId,
        accountNumber: payload.accountNumber ? String(payload.accountNumber) : null,
        loanId: (_a = payload.loanId) !== null && _a !== void 0 ? _a : null,
        amortizationLoanId: (_b = payload.amortizationLoanId) !== null && _b !== void 0 ? _b : null,
        transactionId: (_c = payload.transactionId) !== null && _c !== void 0 ? _c : null,
        debtId: (_d = payload.debtId) !== null && _d !== void 0 ? _d : null,
        customerName: payload.customerName || null,
        phone: normalizedPhone,
        messageType: payload.messageType,
        messageBody: payload.messageBody,
        payloadJson: payload.payloadJson ? JSON.stringify(payload.payloadJson) : null,
        status: payload.status || "queued",
    };
};
const enqueueSms = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const queuePayload = buildQueuePayload(payload);
    if (!queuePayload) {
        return { created: false, reason: "invalid_phone" };
    }
    const created = yield SmsQueueModel_1.SmsQueueModel.create(queuePayload);
    return { created: true, row: created };
});
exports.enqueueSms = enqueueSms;
const enqueueDisbursementSms = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const customer = yield getCustomerForSms(params.companyId, params.accountNumber);
    if (!customer)
        return { created: false, reason: "customer_not_found" };
    const msg = `Credito desembolsado com sucesso. Valor: ${safeMoney(params.amount)} MZN. Prestacoes: ${params.installments}. ${params.firstDueDate ? `Primeiro vencimento: ${params.firstDueDate}. ` : ""}Conta: ${params.accountNumber}.`;
    return (0, exports.enqueueSms)({
        companyId: params.companyId,
        loanId: params.loanId,
        accountNumber: params.accountNumber,
        customerName: customer.customerName,
        phone: customer.customerPhone,
        messageType: "loan_disbursement",
        messageBody: msg,
        payloadJson: {
            loan_id: params.loanId,
            amount: params.amount,
            installments: params.installments,
            first_due_date: params.firstDueDate || null,
        },
    });
});
exports.enqueueDisbursementSms = enqueueDisbursementSms;
const enqueuePaymentSms = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const customer = yield getCustomerForSms(params.companyId, params.accountNumber);
    if (!customer)
        return { created: false, reason: "customer_not_found" };
    const interest = Number(params.latePaymentInterest || 0);
    const msg = `Pagamento recebido. Valor: ${safeMoney(params.paidAmount)} MZN.${interest > 0 ? ` Juros de mora: ${safeMoney(interest)} MZN.` : ""} Ref: ${params.reference || "N/A"}. Obrigado.`;
    return (0, exports.enqueueSms)({
        companyId: params.companyId,
        loanId: (_a = params.loanId) !== null && _a !== void 0 ? _a : null,
        amortizationLoanId: (_b = params.amortizationLoanId) !== null && _b !== void 0 ? _b : null,
        transactionId: params.transactionId,
        accountNumber: params.accountNumber,
        customerName: customer.customerName,
        phone: customer.customerPhone,
        messageType: "installment_payment",
        messageBody: msg,
        payloadJson: {
            transaction_id: params.transactionId,
            payment_date: params.paymentDate || null,
            paid_amount: params.paidAmount,
            late_payment_interest: interest,
            reference: params.reference || null,
        },
    });
});
exports.enqueuePaymentSms = enqueuePaymentSms;
const enqueueLateInterestSms = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d;
    const customer = yield getCustomerForSms(params.companyId, params.accountNumber);
    if (!customer)
        return { created: false, reason: "customer_not_found" };
    const msg = `Aviso de juros de mora. Conta ${params.accountNumber} possui ${safeMoney(params.debtAmount)} MZN em mora${params.dueDate ? ` (vencimento ${params.dueDate})` : ""}. Regularize para evitar agravamento.`;
    return (0, exports.enqueueSms)({
        companyId: params.companyId,
        loanId: (_c = params.loanId) !== null && _c !== void 0 ? _c : null,
        amortizationLoanId: (_d = params.amortizationLoanId) !== null && _d !== void 0 ? _d : null,
        debtId: params.debtId,
        accountNumber: params.accountNumber,
        customerName: customer.customerName,
        phone: customer.customerPhone,
        messageType: "late_interest_notice",
        messageBody: msg,
        payloadJson: {
            debt_id: params.debtId,
            debt_amount: params.debtAmount,
            due_date: params.dueDate || null,
        },
    });
});
exports.enqueueLateInterestSms = enqueueLateInterestSms;
const enqueueUpcomingInstallmentAlerts = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const today = (0, moment_1.default)().format("YYYY-MM-DD");
    const endDate = (0, moment_1.default)().add(Math.max(1, params.daysAhead), "days").format("YYYY-MM-DD");
    const installments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: {
            companyId: params.companyId,
            dueDate: { [sequelize_1.Op.between]: [today, endDate] },
            status: { [sequelize_1.Op.in]: [0, -1] },
        },
        attributes: ["id", "loanId", "accountNumber", "dueDate", "installment", "status"],
    });
    let queued = 0;
    let skipped = 0;
    for (const installment of installments) {
        const existent = yield SmsQueueModel_1.SmsQueueModel.findOne({
            where: {
                companyId: params.companyId,
                amortizationLoanId: installment.id,
                messageType: "upcoming_installment_alert",
                status: { [sequelize_1.Op.in]: ["queued", "processing", "sent"] },
            },
        });
        if (existent) {
            skipped += 1;
            continue;
        }
        const customer = yield getCustomerForSms(params.companyId, installment.accountNumber);
        const normalizedPhone = normalizePhoneForGateway((customer === null || customer === void 0 ? void 0 : customer.customerPhone) || null);
        if (!customer || !normalizedPhone) {
            skipped += 1;
            continue;
        }
        yield SmsQueueModel_1.SmsQueueModel.create({
            companyId: params.companyId,
            accountNumber: String(installment.accountNumber),
            loanId: installment.loanId,
            amortizationLoanId: installment.id,
            customerName: customer.customerName,
            phone: normalizedPhone,
            messageType: "upcoming_installment_alert",
            messageBody: `Lembrete: a sua prestacao vence em ${installment.dueDate}. Valor: ${safeMoney(installment.installment)} MZN. Evite juros de mora efetuando o pagamento atempadamente.`,
            payloadJson: JSON.stringify({
                installment_id: installment.id,
                loan_id: installment.loanId,
                due_date: installment.dueDate,
                installment_amount: installment.installment,
            }),
            status: "queued",
        });
        queued += 1;
    }
    return { queued, skipped };
});
exports.enqueueUpcomingInstallmentAlerts = enqueueUpcomingInstallmentAlerts;
const enqueueOutstandingLateInterestAlerts = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const debts = yield DebtModel_1.DebtModel.findAll({
        where: { companyId: params.companyId },
        order: [["updatedAt", "DESC"]],
        limit: Math.max(1, params.limit || 100),
    });
    let queued = 0;
    let skipped = 0;
    for (const debt of debts) {
        const existent = yield SmsQueueModel_1.SmsQueueModel.findOne({
            where: {
                companyId: params.companyId,
                debtId: debt.id,
                messageType: "late_interest_notice",
                status: { [sequelize_1.Op.in]: ["queued", "processing", "sent"] },
            },
        });
        if (existent) {
            skipped += 1;
            continue;
        }
        const amort = debt.amortisationId
            ? (yield AmortizationLoanModel_1.AmorizationLoanModel.findByPk(debt.amortisationId, {
                attributes: ["id", "dueDate"],
            }))
            : null;
        const result = yield (0, exports.enqueueLateInterestSms)({
            companyId: params.companyId,
            debtId: Number(debt.id),
            loanId: debt.loanId,
            amortizationLoanId: debt.amortisationId,
            accountNumber: debt.accountNumber,
            debtAmount: Number(debt.debtAmount || 0),
            dueDate: (amort === null || amort === void 0 ? void 0 : amort.dueDate) || null,
        });
        if (result.created)
            queued += 1;
        else
            skipped += 1;
    }
    return { queued, skipped };
});
exports.enqueueOutstandingLateInterestAlerts = enqueueOutstandingLateInterestAlerts;
const getPendingSmsQueue = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    const whereClause = {
        status: { [sequelize_1.Op.in]: ["queued", "processing"] },
    };
    if (filters.companyId)
        whereClause.companyId = filters.companyId;
    const limit = Math.min(500, Math.max(1, filters.limit || 50));
    return SmsQueueModel_1.SmsQueueModel.findAll({
        where: whereClause,
        order: [["createdAt", "ASC"]],
        limit,
    });
});
exports.getPendingSmsQueue = getPendingSmsQueue;
const listSmsQueueHistory = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    const whereClause = {};
    if (filters.companyId)
        whereClause.companyId = filters.companyId;
    if (filters.status)
        whereClause.status = filters.status;
    if (filters.from || filters.to) {
        whereClause.createdAt = {};
        if (filters.from)
            whereClause.createdAt[sequelize_1.Op.gte] = new Date(`${filters.from}T00:00:00`);
        if (filters.to)
            whereClause.createdAt[sequelize_1.Op.lte] = new Date(`${filters.to}T23:59:59`);
    }
    const limit = Math.min(1000, Math.max(1, filters.limit || 200));
    const rows = yield SmsQueueModel_1.SmsQueueModel.findAll({
        where: whereClause,
        order: [["id", "DESC"]],
        limit,
    });
    return rows.map((row) => {
        const plain = row.toJSON ? row.toJSON() : row;
        plain.payloadJson = parsePayload(plain.payloadJson);
        return plain;
    });
});
exports.listSmsQueueHistory = listSmsQueueHistory;
const hydrateSmsQueuePayload = (row) => {
    const plain = row.toJSON ? row.toJSON() : row;
    plain.payloadJson = parsePayload(plain.payloadJson);
    return plain;
};
exports.hydrateSmsQueuePayload = hydrateSmsQueuePayload;
