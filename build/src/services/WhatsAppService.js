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
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWhatsAppMessages = exports.sendPasswordResetWhatsApp = exports.sendReminderWhatsApp = exports.sendPaymentWhatsApp = exports.sendDisbursementWhatsApp = exports.sendWhatsAppMessage = void 0;
const WhatsAppModel_1 = require("../database/models/WhatsAppModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const CompanyModel_1 = require("../database/models/CompanyModel");
const dateFormatMZ_1 = require("../utils/dateFormatMZ");
const normalizePhone = (phone) => {
    if (!phone)
        return null;
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length === 12)
        return digits.slice(3);
    if (digits.length === 9)
        return digits;
    if (digits.length === 12 && digits.startsWith("258"))
        return digits.slice(3);
    return digits.length === 9 ? digits : null;
};
const getCustomer = (companyId, accountNumber) => __awaiter(void 0, void 0, void 0, function* () {
    return CustomerModel_1.CustomerModel.findOne({
        where: { companyId, accountNumber },
        attributes: ["id", "customerName", "customerPhone", "accountNumber"],
    });
});
const sendWhatsAppMessage = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const normalizedPhone = normalizePhone(payload.phone || null);
    if (!normalizedPhone) {
        return { sent: false, reason: "invalid_phone" };
    }
    // Registrar na base de dados
    const message = yield WhatsAppModel_1.WhatsAppModel.create({
        companyId: payload.companyId,
        phone: normalizedPhone,
        accountNumber: payload.accountNumber ? String(payload.accountNumber) : null,
        customerId: (_a = payload.customerId) !== null && _a !== void 0 ? _a : (payload.accountNumber
            ? (_c = (_b = (yield CustomerModel_1.CustomerModel.findOne({
                where: { companyId: payload.companyId, accountNumber: String(payload.accountNumber) },
                attributes: ["id"],
            }))) === null || _b === void 0 ? void 0 : _b.getDataValue("id")) !== null && _c !== void 0 ? _c : null
            : null),
        messageType: payload.messageType,
        messageBody: payload.messageBody,
        status: "queued",
        direction: "outbound",
        payloadJson: payload.payloadJson ? JSON.stringify(payload.payloadJson) : null,
    });
    const plainMessage = message.toJSON();
    // TODO: Integrar com Evolution API quando configurada
    // Por agora, apenas registamos na base de dados
    console.log(`[WhatsApp] Mensagem enfileirada: ${payload.messageType} para ${normalizedPhone}`);
    return { sent: true, messageId: plainMessage.id };
});
exports.sendWhatsAppMessage = sendWhatsAppMessage;
// Enviar WhatsApp de desembolso
const sendDisbursementWhatsApp = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const customer = yield getCustomer(params.companyId, params.accountNumber);
    if (!customer)
        return { sent: false, reason: "customer_not_found" };
    const msg = `Ola ${customer.customerName}. Seu credito de ${Number(params.amount).toLocaleString("pt-MZ")} MZN foi desembolsado. Parcelas: ${params.installments}. ${params.firstDueDate ? `Vence: ${(0, dateFormatMZ_1.formatDateMZ)(params.firstDueDate)}.` : ''} Obrigado.`;
    return (0, exports.sendWhatsAppMessage)({
        companyId: params.companyId,
        accountNumber: params.accountNumber,
        phone: customer.customerPhone,
        messageType: "loan_disbursement",
        messageBody: msg,
        payloadJson: {
            loan_id: params.loanId,
            amount: params.amount,
            installments: params.installments,
        },
    });
});
exports.sendDisbursementWhatsApp = sendDisbursementWhatsApp;
// Enviar WhatsApp de pagamento
const sendPaymentWhatsApp = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const customer = yield getCustomer(params.companyId, params.accountNumber);
    if (!customer)
        return { sent: false, reason: "customer_not_found" };
    const msg = `Ola ${customer.customerName}. Pagamento de ${Number(params.paidAmount).toLocaleString("pt-MZ")} MZN confirmado. Ref: ${params.reference || "N/A"}. Obrigado.`;
    return (0, exports.sendWhatsAppMessage)({
        companyId: params.companyId,
        accountNumber: params.accountNumber,
        phone: customer.customerPhone,
        messageType: "installment_payment",
        messageBody: msg,
        payloadJson: {
            paid_amount: params.paidAmount,
            reference: params.reference,
        },
    });
});
exports.sendPaymentWhatsApp = sendPaymentWhatsApp;
// Enviar WhatsApp de lembrete
const sendReminderWhatsApp = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const customer = yield getCustomer(params.companyId, params.accountNumber);
    if (!customer)
        return { sent: false, reason: "customer_not_found" };
    const msg = `Ola ${customer.customerName}. Sua prestacao de ${Number(params.installmentAmount).toLocaleString("pt-MZ")} MZN vence em ${(0, dateFormatMZ_1.formatDateMZ)(params.dueDate)}. Evite juros facendo o pagamento.`;
    return (0, exports.sendWhatsAppMessage)({
        companyId: params.companyId,
        accountNumber: params.accountNumber,
        phone: customer.customerPhone,
        messageType: "upcoming_installment",
        messageBody: msg,
        payloadJson: {
            installment_amount: params.installmentAmount,
            due_date: params.dueDate,
        },
    });
});
exports.sendReminderWhatsApp = sendReminderWhatsApp;
// Enviar WhatsApp de redefinicao de senha
const sendPasswordResetWhatsApp = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    const customer = yield getCustomer(params.companyId, params.accountNumber);
    if (!customer)
        return { sent: false, reason: "customer_not_found" };
    // Buscar nome da empresa
    const company = yield CompanyModel_1.CompanyModel.findByPk(params.companyId);
    const companyName = ((_d = company === null || company === void 0 ? void 0 : company.toJSON()) === null || _d === void 0 ? void 0 : _d.companyName) || 'Mais Mola';
    const msg = `Ola ${customer.customerName}. Sua senha de acesso ao portal da ${companyName} e: ${params.newPassword}. Telefone: ${customer.customerPhone}. Altere apos o primeiro acesso.`;
    return (0, exports.sendWhatsAppMessage)({
        companyId: params.companyId,
        accountNumber: params.accountNumber,
        phone: customer.customerPhone,
        messageType: "password_reset",
        messageBody: msg,
        payloadJson: {
            new_password: params.newPassword,
        },
    });
});
exports.sendPasswordResetWhatsApp = sendPasswordResetWhatsApp;
// Listar mensagens WhatsApp
const listWhatsAppMessages = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    const whereClause = {};
    if (filters.companyId)
        whereClause.companyId = filters.companyId;
    if (filters.accountNumber)
        whereClause.accountNumber = filters.accountNumber;
    const limit = Math.min(500, Math.max(1, filters.limit || 100));
    return WhatsAppModel_1.WhatsAppModel.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit,
    });
});
exports.listWhatsAppMessages = listWhatsAppMessages;
