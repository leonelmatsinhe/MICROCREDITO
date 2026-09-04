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
exports.getWhatsAppTemplates = exports.enqueuePasswordResetSms = exports.hydrateSmsQueuePayload = exports.listSmsQueueHistory = exports.getPendingSmsQueue = exports.flushSmsQueue = exports.processSmsQueue = exports.enqueueOutstandingLateInterestAlerts = exports.enqueueUpcomingInstallmentAlerts = exports.enqueueLateInterestSms = exports.enqueuePaymentSms = exports.enqueueDisbursementSms = exports.enqueueSms = exports.isCompanySmsEnabled = void 0;
const moment_1 = __importDefault(require("moment"));
const sequelize_1 = require("sequelize");
const SmsQueueModel_1 = require("../database/models/SmsQueueModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const DebtModel_1 = require("../database/models/DebtModel");
const CompanyModel_1 = require("../database/models/CompanyModel");
const TsembaSmsProvider_1 = require("./TsembaSmsProvider");
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
/**
 * Indica se a empresa autoriza o envio de SMS (configuração smsEnabled).
 * Ausência do campo/coluna é tratada como autorizado (default 1), para não
 * bloquear o envio em bases de dados pré-migração.
 */
const isCompanySmsEnabled = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (!companyId)
        return false;
    try {
        const company = yield CompanyModel_1.CompanyModel.findByPk(companyId, {
            attributes: ["id", "smsEnabled"],
        });
        if (!company)
            return false;
        const value = Number((_c = (_b = (_a = company).getDataValue) === null || _b === void 0 ? void 0 : _b.call(_a, "smsEnabled")) !== null && _c !== void 0 ? _c : 1);
        return value === 1;
    }
    catch (error) {
        console.error("[SMS] Erro ao verificar smsEnabled:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return true;
    }
});
exports.isCompanySmsEnabled = isCompanySmsEnabled;
const enqueueSms = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Se a empresa desactivou o SMS, nenhuma operação de SMS ocorre.
    if (!(yield (0, exports.isCompanySmsEnabled)(payload.companyId))) {
        return { created: false, reason: "sms_disabled" };
    }
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
    // Template: max 160 chars, sem caracteres especiais
    const msg = `Ola ${customer.customerName}. Seu credito de ${safeMoney(params.amount)} MZN foi desembolsado. Parcelas: ${params.installments}. ${params.firstDueDate ? `Vence: ${params.firstDueDate}.` : ''} Obrigado.`;
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
    var _d, _e;
    const customer = yield getCustomerForSms(params.companyId, params.accountNumber);
    if (!customer)
        return { created: false, reason: "customer_not_found" };
    const interest = Number(params.latePaymentInterest || 0);
    // Template: max 160 chars, sem caracteres especiais
    const msg = `Ola ${customer.customerName}. Pagamento de ${safeMoney(params.paidAmount)} MZN confirmado.${interest > 0 ? ` Mora: ${safeMoney(interest)} MZN.` : ''} Ref: ${params.reference || 'N/A'}. Obrigado.`;
    return (0, exports.enqueueSms)({
        companyId: params.companyId,
        loanId: (_d = params.loanId) !== null && _d !== void 0 ? _d : null,
        amortizationLoanId: (_e = params.amortizationLoanId) !== null && _e !== void 0 ? _e : null,
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
    var _f, _g;
    const customer = yield getCustomerForSms(params.companyId, params.accountNumber);
    if (!customer)
        return { created: false, reason: "customer_not_found" };
    // Template: max 160 chars, sem caracteres especiais
    const msg = `Ola ${customer.customerName}. Sua prestacao esta em atraso. Valor: ${safeMoney(params.debtAmount)} MZN. ${params.dueDate ? `Vencimento: ${params.dueDate}.` : ''} Regularize para evitar juros.`;
    return (0, exports.enqueueSms)({
        companyId: params.companyId,
        loanId: (_f = params.loanId) !== null && _f !== void 0 ? _f : null,
        amortizationLoanId: (_g = params.amortizationLoanId) !== null && _g !== void 0 ? _g : null,
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
    // Empresa com SMS desactivado: não gera alertas
    if (!(yield (0, exports.isCompanySmsEnabled)(params.companyId))) {
        return { queued: 0, skipped: 0 };
    }
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
            // Template: max 160 chars, sem caracteres especiais
            messageBody: `Ola ${customer.customerName}. Sua prestacao de ${safeMoney(installment.installment)} MZN vence em ${installment.dueDate}. Evite juros facendo o pagamento.`,
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
const MAX_SMS_RETRIES = 5;
/**
 * Erros de nível de conta/plataforma (saldo, quota, chave) — transitórios.
 * Nestes casos a mensagem NÃO queima tentativas nem é marcada como failed:
 * fica em fila e volta a tentar quando o problema for resolvido (ex.: depois
 * de comprar unidades na Tsemba).
 */
const isTransientGatewayError = (error) => {
    const err = String(error || "").toLowerCase();
    return (err.includes("tsemba_api_key") ||
        err.includes("saldo") ||
        err.includes("insuficiente") ||
        err.includes("insufficient") ||
        err.includes("balance") ||
        err.includes("carteira") ||
        err.includes("wallet") ||
        err.includes("quota") ||
        err.includes("credit"));
};
/**
 * Processa a fila de SMS: envia as mensagens pendentes através da API da Tsemba
 * e actualiza o estado (sent / queued para nova tentativa / failed após retries).
 *
 * - Mensagens `failed` por motivos transitórios (ex.: saldo insuficiente) são
 *   recuperadas automaticamente para `queued` e voltam a ser tentadas.
 * - Erros transitórios (saldo/quota/chave) não contam como tentativa e param o
 *   lote (backoff) — evitam queimar 5 tentativas contra uma conta sem saldo.
 *
 * Se a chave ainda não estiver configurada no .env, não toca na fila (deferred).
 */
const processSmsQueue = (params = {}) => __awaiter(void 0, void 0, void 0, function* () {
    var _h, _j;
    const limit = Math.min(200, Math.max(1, params.limit || 50));
    const results = {
        sent: 0,
        failed: 0,
        deferred: 0,
        skipped: 0,
        recovered: 0,
        disabled: 0,
        configured: true,
    };
    if (!(0, TsembaSmsProvider_1.isTsembaConfigured)()) {
        // Sem chave: manter tudo na fila até o utilizador colar a API key no .env
        return Object.assign(Object.assign({}, results), { configured: false });
    }
    // Empresas que autorizam SMS — mensagens de empresas desactivadas ficam em
    // fila (não são enviadas) até o Admin voltar a activar o serviço.
    const companies = (yield CompanyModel_1.CompanyModel.findAll({
        attributes: ["id", "smsEnabled"],
    }));
    const enabledCompanyIds = new Set();
    for (const company of companies) {
        const value = Number((_j = (_h = company.getDataValue) === null || _h === void 0 ? void 0 : _h.call(company, "smsEnabled")) !== null && _j !== void 0 ? _j : 1);
        if (value === 1)
            enabledCompanyIds.add(Number(company.id));
    }
    // Recuperar mensagens paradas por motivos de conta (ex.: saldo insuficiente):
    //  - `failed` com erro transitório → voltam a `queued` (retries repostos);
    //  - `queued` com retries esgotadas (retries >= MAX) → repõe retries; no
    //    código actual nenhuma linha em fila legitima atinge este estado, logo é
    //    sempre um artefacto de recuperação/versão anterior.
    const stuckRows = (yield SmsQueueModel_1.SmsQueueModel.findAll({
        where: { status: { [sequelize_1.Op.in]: ["failed", "queued"] } },
        order: [["id", "ASC"]],
        limit: 500,
    }));
    for (const row of stuckRows) {
        const isFailed = String(row.status) === "failed";
        const isTransient = isTransientGatewayError(String(row.errorMessage || ""));
        const exhausted = Number(row.retries || 0) >= MAX_SMS_RETRIES;
        if (isFailed ? isTransient : exhausted) {
            yield row.update({
                status: "queued",
                retries: 0,
                errorMessage: null,
                lastAttemptAt: new Date(),
            });
            results.recovered += 1;
        }
    }
    const rows = yield SmsQueueModel_1.SmsQueueModel.findAll({
        where: {
            status: { [sequelize_1.Op.in]: ["queued", "processing"] },
            retries: { [sequelize_1.Op.lt]: MAX_SMS_RETRIES },
        },
        order: [["createdAt", "ASC"]],
        limit,
    });
    results.skipped = rows.length;
    for (const row of rows) {
        if (!enabledCompanyIds.has(Number(row.companyId))) {
            // Empresa com SMS desactivado: mantém em fila, sem enviar
            results.disabled += 1;
            continue;
        }
        const attempt = Number(row.retries || 0) + 1;
        const result = yield (0, TsembaSmsProvider_1.sendTsembaSms)({
            to: row.phone,
            message: row.messageBody,
        });
        if (result.success) {
            yield row.update({
                status: "sent",
                gatewayMessageId: result.gatewayMessageId || null,
                errorMessage: null,
                retries: attempt,
                sentAt: new Date(),
                lastAttemptAt: new Date(),
            });
            results.sent += 1;
        }
        else if (isTransientGatewayError(result.error || "")) {
            // Problema de conta (saldo/quota/chave): mantém em fila sem queimar
            // tentativas e pára o lote (backoff) para não sobrecarregar a API.
            yield row.update({
                status: "queued",
                errorMessage: String(result.error || "").slice(0, 250),
                lastAttemptAt: new Date(),
            });
            results.deferred += 1;
            break;
        }
        else {
            yield row.update({
                status: attempt >= MAX_SMS_RETRIES ? "failed" : "queued",
                retries: attempt,
                errorMessage: String(result.error || "").slice(0, 250),
                lastAttemptAt: new Date(),
            });
            results.failed += 1;
        }
    }
    return results;
});
exports.processSmsQueue = processSmsQueue;
/**
 * Dispara o processamento da fila sem bloquear a resposta (fire-and-forget).
 */
const flushSmsQueue = (limit = 100) => {
    (0, exports.processSmsQueue)({ limit }).catch((error) => {
        console.error("[SMS] Erro ao processar a fila:", (error === null || error === void 0 ? void 0 : error.message) || error);
    });
};
exports.flushSmsQueue = flushSmsQueue;
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
// Template para reenvio de senha
const enqueuePasswordResetSms = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _k;
    const customer = yield getCustomerForSms(params.companyId, params.accountNumber);
    if (!customer)
        return { created: false, reason: "customer_not_found" };
    // Buscar nome da empresa
    const company = yield CompanyModel_1.CompanyModel.findByPk(params.companyId);
    const companyName = ((_k = company === null || company === void 0 ? void 0 : company.toJSON()) === null || _k === void 0 ? void 0 : _k.companyName) || 'MBR Microcrédito';
    // Template: max 160 chars, sem caracteres especiais
    const msg = `Ola ${customer.customerName}. Sua senha de acesso ao portal da ${companyName} e: ${params.newPassword}. Telefone: ${customer.customerPhone}. Altere apos o primeiro acesso.`;
    return (0, exports.enqueueSms)({
        companyId: params.companyId,
        accountNumber: params.accountNumber,
        customerName: customer.customerName,
        phone: customer.customerPhone,
        messageType: "password_reset",
        messageBody: msg,
        payloadJson: {
            account_number: params.accountNumber,
            new_password: params.newPassword,
        },
    });
});
exports.enqueuePasswordResetSms = enqueuePasswordResetSms;
// Templates de WhatsApp (mesma estrutura, formato diferente)
const getWhatsAppTemplates = () => ({
    disbursement: {
        name: "Credito Desembolsado",
        template: "Ola {nome}. Seu credito de {valor} MZN foi desembolsado. Parcelas: {parcelas}. Vence: {vencimento}. Obrigado.",
        placeholders: ["nome", "valor", "parcelas", "vencimento"],
    },
    payment: {
        name: "Pagamento Confirmado",
        template: "Ola {nome}. Pagamento de {valor} MZN confirmado. Ref: {referencia}. Obrigado.",
        placeholders: ["nome", "valor", "referencia"],
    },
    upcoming: {
        name: "Lembrete de Prestacao",
        template: "Ola {nome}. Sua prestacao de {valor} MZN vence em {data}. Evite juros facendo o pagamento.",
        placeholders: ["nome", "valor", "data"],
    },
    latePayment: {
        name: "Prestacao em Atraso",
        template: "Ola {nome}. Sua prestacao esta em atraso. Valor: {valor} MZN. Regularize para evitar juros.",
        placeholders: ["nome", "valor"],
    },
    passwordReset: {
        name: "Redefinicao de Senha",
        template: "Ola {nome}. Sua nova senha: {senha}. Altere apos o primeiro acesso.",
        placeholders: ["nome", "senha"],
    },
});
exports.getWhatsAppTemplates = getWhatsAppTemplates;
