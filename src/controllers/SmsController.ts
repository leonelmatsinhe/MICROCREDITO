import { Request, Response } from "express";
import { Op } from "sequelize";
import { SmsModel } from "../database/models/SmsModel";
import { enqueueSms, flushSmsQueue, isCompanySmsEnabled } from "../services/SmsGatewayService";

const findAllSms = async (req: Request, res: Response) => {
    try {
        const { from, to, companyId } = req.query;

        // Datas por defeito — chamadas sem filtros não podem derrubar o servidor
        const fromDate = from ? String(from) : "1900-01-01";
        const toDate = to ? String(to) : new Date().toISOString().slice(0, 10);
        const where: any = {
            createdAt: {
                [Op.between]: [fromDate, toDate],
            },
        };
        if (companyId) where.companyId = companyId;

        const sms = await SmsModel.findAll({ where });
        return res.status(200).send({ success: true, result: sms });
    } catch (err: any) {
        console.error("findAllSms:", err?.message || err);
        return res.status(500).send({ success: false, message: "Erro ao listar SMS." });
    }
};

const findSmsByCustomer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const sms = await SmsModel.findAll({
            where: {
                accountNumber: id,
            },
        });

        return res.status(200).send({ success: true, result: sms });
    } catch (err: any) {
        console.error("findSmsByCustomer:", err?.message || err);
        return res.status(500).send({ success: false, message: "Erro ao listar SMS." });
    }
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

        // Empresa com SMS desactivado: nenhuma operação de SMS ocorre
        if (!(await isCompanySmsEnabled(parsedCompanyId))) {
            return res.status(403).send({
                success: false,
                message: "O envio de SMS está desactivado nas configurações da empresa. Contacte o Administrador.",
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

        // Enviar imediatamente via Tsemba (sem bloquear a resposta)
        flushSmsQueue();

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
