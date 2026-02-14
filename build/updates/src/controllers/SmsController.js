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
exports.sendSms = exports.findSmsByCustomer = exports.findAllSms = void 0;
const sequelize_1 = require("sequelize");
const SmsModel_1 = require("../database/models/SmsModel");
const axios_1 = __importDefault(require("axios"));
const SMS_API_KEY = process.env.SMS_API_KEY;
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
    let { companyId, receipient, sender, accountNumber, smsBody } = req.body;
    const sms = yield SmsModel_1.SmsModel.create({
        companyId,
        receipient,
        sender,
        accountNumber,
        smsBody,
    });
    if (sms != null) {
        const parameters = `apiKey=${SMS_API_KEY}&numbers=${receipient}&sender=${sender}&message=${smsBody}`;
        axios_1.default.get(`https://api.txtlocal.com/send/?${parameters}`)
            .then((response) => {
            console.log(response);
            res.status(200).send({
                success: true,
                message: "SMS enviado com sucesso",
            });
        }).catch((err) => {
            res.status(200).send({
                success: false,
                message: err.message,
            });
        });
    }
    else {
        res.status(200).send({
            success: false,
            result: "There was an error sending SMS.",
        });
    }
});
exports.sendSms = sendSms;
