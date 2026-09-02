import { Request, Response } from "express";
import {
  sendWhatsAppMessage,
  sendDisbursementWhatsApp,
  sendPaymentWhatsApp,
  sendReminderWhatsApp,
  sendPasswordResetWhatsApp,
  listWhatsAppMessages,
} from "../services/WhatsAppService";

export const sendWhatsApp = async (req: Request, res: Response) => {
  try {
    const { companyId, phone, accountNumber, messageType, messageBody } = req.body;

    if (!companyId || !phone || !messageBody) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatorios: companyId, phone, messageBody.",
      });
    }

    const result = await sendWhatsAppMessage({
      companyId: Number(companyId),
      phone,
      accountNumber,
      messageType: messageType || "manual",
      messageBody,
    });

    return result.sent
      ? res.status(200).json({ success: true, message: "Mensagem WhatsApp enviada.", messageId: result.messageId })
      : res.status(422).json({ success: false, message: "Nao foi possivel enviar.", reason: result.reason });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Erro ao enviar WhatsApp." });
  }
};

export const listWhatsApp = async (req: Request, res: Response) => {
  try {
    const { companyId, accountNumber, limit } = req.query;

    const messages = await listWhatsAppMessages({
      companyId: companyId ? Number(companyId) : undefined,
      accountNumber: accountNumber as string,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json({ success: true, result: messages });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Erro ao listar mensagens." });
  }
};
