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
    const { from, to, companyId } = req.query;
    const sms = yield SmsModel_1.SmsModel.findAll({
        where: {
            createdAt: {
                [sequelize_1.Op.between]: [from, to],
            },
            companyId: companyId,
        },
    });
    return sms.length != null
        ? res.status(200).send({ success: true, result: sms })
        : res.status(204).send({
            success: false,
            message: "No SMS sent as of now.",
        });
});
exports.findAllSms = findAllSms;
const findSmsByCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const sms = yield SmsModel_1.SmsModel.findAll({
        where: {
            accountNumber: id,
        },
    });
    return sms != null
        ? res.status(200).send({ success: true, result: sms })
        : res.status(204).send({
            success: false,
            result: "No SMS found.",
        });
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
