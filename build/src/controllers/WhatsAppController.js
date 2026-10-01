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
exports.listWhatsApp = exports.sendWhatsApp = void 0;
const WhatsAppService_1 = require("../services/WhatsAppService");
const sendWhatsApp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, phone, accountNumber, messageType, messageBody } = req.body;
        if (!companyId || !phone || !messageBody) {
            return res.status(400).json({
                success: false,
                message: "Campos obrigatorios: companyId, phone, messageBody.",
            });
        }
        const result = yield (0, WhatsAppService_1.sendWhatsAppMessage)({
            companyId: Number(companyId),
            phone,
            accountNumber,
            messageType: messageType || "manual",
            messageBody,
        });
        return result.sent
            ? res.status(200).json({ success: true, message: "Mensagem WhatsApp enviada.", messageId: result.messageId })
            : res.status(422).json({ success: false, message: "Nao foi possivel enviar.", reason: result.reason });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Erro ao enviar WhatsApp." });
    }
});
exports.sendWhatsApp = sendWhatsApp;
const listWhatsApp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, accountNumber, limit } = req.query;
        const messages = yield (0, WhatsAppService_1.listWhatsAppMessages)({
            companyId: companyId ? Number(companyId) : undefined,
            accountNumber: accountNumber,
            limit: limit ? Number(limit) : undefined,
        });
        return res.status(200).json({ success: true, result: messages });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Erro ao listar mensagens." });
    }
});
exports.listWhatsApp = listWhatsApp;
