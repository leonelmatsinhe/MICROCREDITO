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
exports.sendSms = exports.findSmsByCustomer = exports.findAllSms = void 0;
const sequelize_1 = require("sequelize");
const SmsModel_1 = require("../database/models/SmsModel");
const SmsGatewayService_1 = require("../services/SmsGatewayService");
const findAllSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to, companyId } = req.query;
        // Datas por defeito — chamadas sem filtros não podem derrubar o servidor
        const fromDate = from ? String(from) : "1900-01-01";
        const toDate = to ? String(to) : new Date().toISOString().slice(0, 10);
        const where = {
            createdAt: {
                [sequelize_1.Op.between]: [fromDate, toDate],
            },
        };
        if (companyId)
            where.companyId = companyId;
        const sms = yield SmsModel_1.SmsModel.findAll({ where });
        return res.status(200).send({ success: true, result: sms });
    }
    catch (err) {
        console.error("findAllSms:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).send({ success: false, message: "Erro ao listar SMS." });
    }
});
exports.findAllSms = findAllSms;
const findSmsByCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const sms = yield SmsModel_1.SmsModel.findAll({
            where: {
                accountNumber: id,
            },
        });
        return res.status(200).send({ success: true, result: sms });
    }
    catch (err) {
        console.error("findSmsByCustomer:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).send({ success: false, message: "Erro ao listar SMS." });
    }
});
exports.findSmsByCustomer = findSmsByCustomer;
const sendSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { companyId, receipient, sender, accountNumber, smsBody } = req.body;
        const parsedCompanyId = Number(companyId);
        const normalizedBody = String(smsBody || "").trim();
        const normalizedRecipient = String(receipient || "").trim();
        if (!parsedCompanyId || Number.isNaN(parsedCompanyId) || !normalizedRecipient || !normalizedBody) {
            return res.status(400).send({
                success: false,
                message: "Campos obrigatórios: companyId, receipient e smsBody.",
            });
        }
        // Empresa com SMS desactivado: nenhuma operação de SMS ocorre
        if (!(yield (0, SmsGatewayService_1.isCompanySmsEnabled)(parsedCompanyId))) {
            return res.status(403).send({
                success: false,
                message: "O envio de SMS está desactivado nas configurações da empresa. Contacte o Administrador.",
            });
        }
        yield SmsModel_1.SmsModel.create({
            companyId: parsedCompanyId,
            receipient: normalizedRecipient,
            sender,
            accountNumber,
            smsBody: normalizedBody,
        });
        const result = yield (0, SmsGatewayService_1.enqueueSms)({
            companyId: parsedCompanyId,
            accountNumber: accountNumber || null,
            phone: normalizedRecipient,
            messageType: "manual_notification",
            messageBody: normalizedBody,
            payloadJson: {
                source: "legacy_sendSms_endpoint",
                sender: sender || null,
            },
        });
        if (!result.created) {
            return res.status(422).send({
                success: false,
                message: "Não foi possível enfileirar o SMS no gateway.",
                reason: result.reason || "unknown",
            });
        }
        // Enviar imediatamente via Tsemba (sem bloquear a resposta)
        (0, SmsGatewayService_1.flushSmsQueue)();
        return res.status(200).send({
            success: true,
            message: "SMS enfileirado com sucesso no gateway.",
        });
    }
    catch (err) {
        return res.status(500).send({
            success: false,
            message: err.message || "Erro interno ao enfileirar SMS.",
        });
    }
});
exports.sendSms = sendSms;
