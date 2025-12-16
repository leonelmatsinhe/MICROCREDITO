import { Request, Response } from "express";
import { Op } from "sequelize";
import { SmsModel } from "../database/models/SmsModel";
import { default as axios } from "axios"

const SMS_API_KEY = process.env.SMS_API_KEY

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
    let { companyId, receipient, sender, accountNumber, smsBody } = req.body;

    const sms = await SmsModel.create({
        companyId,
        receipient,
        sender,
        accountNumber,
        smsBody,
    });

    if (sms != null) {
        const parameters = `apiKey=${SMS_API_KEY}&numbers=${receipient}&sender=${sender}&message=${smsBody}`

        axios.get(`https://api.txtlocal.com/send/?${parameters}`)
            .then((response: any) => {
                console.log(response)
                res.status(200).send({
                    success: true,
                    message: "SMS enviado com sucesso",
                });
            }).catch((err: { message: any; }) => {
                res.status(200).send({
                    success: false,
                    message: err.message,
                });
            });
    } else {
        res.status(200).send({
            success: false,
            result: "There was an error sending SMS.",
        });
    }
};

export { findAllSms, findSmsByCustomer, sendSms };
