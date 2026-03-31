import { Request, Response } from "express";
import { Op } from "sequelize";
import { SmsModel } from "../database/models/SmsModel";
import { enqueueSms } from "../services/SmsGatewayService";

const findAllSms = async (req: Request, res: Response) => {
    const { from, to, companyId } = req.query;

    const sms = await SmsModel.findAll({
        where: {
            createdAt: {
                [Op.between]: [from, to],
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
};

const findSmsByCustomer = async (req: Request, res: Response) => {
    const { id } = req.params;
    const sms = await SmsModel.findAll({
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
};

const sendSms = async (req: Request, res: Response) => {
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

        await SmsModel.create({
            companyId: parsedCompanyId,
            receipient: normalizedRecipient,
            sender,
            accountNumber,
            smsBody: normalizedBody,
        });

        const result = await enqueueSms({
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
                reason: (result as any).reason || "unknown",
            });
        }

        return res.status(200).send({
            success: true,
            message: "SMS enfileirado com sucesso no gateway.",
        });
    } catch (err: any) {
        return res.status(500).send({
            success: false,
            message: err.message || "Erro interno ao enfileirar SMS.",
        });
    }
};

export { findAllSms, findSmsByCustomer, sendSms };
