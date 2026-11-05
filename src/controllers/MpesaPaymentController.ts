import { Request, Response } from "express";
import {
  initiateC2BPayment,
  queryMpesaTransactionStatus,
  handleMpesaCallback,
  executeB2CDisbursement,
  queryCustomerMaskedName,
} from "../services/MpesaOpenApiService";
import { MpesaTransactionModel } from "../database/models/MpesaTransactionModel";

/**
 * Iniciar Pagamento C2B (Single Stage)
 * POST /api/mpesa/c2b/initiate
 */
export const initiateC2B = async (req: Request, res: Response) => {
  try {
    const { companyId, customerId, loanId, amortizationLoanId, amount, phone } = req.body;

    if (!companyId || !customerId || !loanId || !amortizationLoanId || !amount || !phone) {
      return res.status(400).json({
        success: false,
        message: "Todos os parâmetros são obrigatórios (companyId, customerId, loanId, amortizationLoanId, amount, phone).",
      });
    }

    const result = await initiateC2BPayment({
      companyId: Number(companyId),
      customerId: Number(customerId),
      loanId: Number(loanId),
      amortizationLoanId: Number(amortizationLoanId),
      amount: Number(amount),
      phone: String(phone),
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[M-Pesa Controller] Erro ao iniciar C2B:", error?.message || error);
    return res.status(400).json({
      success: false,
      message: error?.message || "Erro ao comunicar com a Vodacom M-Pesa.",
    });
  }
};

/**
 * Webhook Oficial de Callback da Vodacom
 * POST /api/mpesa/c2b/callback
 */
export const mpesaCallbackWebhook = async (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    console.log("[M-Pesa Webhook] Callback recebido da Vodacom:", JSON.stringify(payload));

    const result = await handleMpesaCallback(payload);
    // Vodacom espera HTTP 200 para confirmar a receção do callback
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[M-Pesa Webhook] Erro ao processar callback:", error?.message || error);
    return res.status(200).json({ success: false, error: error?.message });
  }
};

/**
 * Polling de Status da Transação para o Frontend
 * GET /api/mpesa/c2b/status/:id
 */
export const getTransactionStatus = async (req: Request, res: Response) => {
  try {
    const mpesaTxId = parseInt(req.params.id, 10);
    if (!Number.isFinite(mpesaTxId)) {
      return res.status(400).json({ success: false, message: "ID de transação inválido." });
    }

    const tx: any = await MpesaTransactionModel.findByPk(mpesaTxId);
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transação não encontrada." });
    }

    // Se já foi concluída com sucesso, busca dados do recibo para o frontend descarregar
    let reciboData = null;
    if (tx.reciboId) {
      const { ReciboModel } = await import("../database/models/ReciboModel");
      reciboData = await ReciboModel.findByPk(tx.reciboId, { raw: true });
    }

    return res.status(200).json({
      success: true,
      status: tx.status,
      mpesaReceipt: tx.mpesaReceipt,
      responseCode: tx.responseCode,
      responseDescription: tx.responseDescription,
      tranzactionId: tx.tranzactionId,
      recibo: reciboData
        ? { id: (reciboData as any).id, numero: (reciboData as any).numero, pdf_url: (reciboData as any).pdf_url }
        : null,
    });
  } catch (error: any) {
    console.error("[M-Pesa Controller] Erro ao verificar status:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro interno ao obter status." });
  }
};

/**
 * Consulta ativa à Vodacom (Query Transaction Status)
 * POST /api/mpesa/c2b/query/:id
 */
export const queryVodacomStatus = async (req: Request, res: Response) => {
  try {
    const mpesaTxId = parseInt(req.params.id, 10);
    if (!Number.isFinite(mpesaTxId)) {
      return res.status(400).json({ success: false, message: "ID de transação inválido." });
    }

    const result = await queryMpesaTransactionStatus(mpesaTxId);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[M-Pesa Controller] Erro na consulta ativa:", error?.message || error);
    return res.status(500).json({ success: false, message: error?.message || "Erro na consulta à Vodacom." });
  }
};

// Compatibilidade legado com rotas antigas
export const b2Customer = async (req: Request, res: Response) => {
  try {
    const { companyId, loanId, customerId, amount, phone, accountNumber } = req.body;
    if (!companyId || !loanId || !customerId || !amount || !phone) {
      return res.status(400).json({
        success: false,
        message: "Todos os parâmetros são obrigatórios (companyId, loanId, customerId, amount, phone).",
      });
    }

    const result = await executeB2CDisbursement({
      companyId: Number(companyId),
      loanId: Number(loanId),
      customerId: Number(customerId),
      amount: Number(amount),
      phone: String(phone),
      accountNumber: String(accountNumber || ""),
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || "Erro ao processar o desembolso B2C.",
    });
  }
};

export const c2Business = initiateC2B;

/**
 * Consulta de Nome Mascarado do Titular M-Pesa (Anti-Fraude)
 * GET /api/mpesa/customer-name?phone=25884xxxxxxx&customerId=123
 */
export const getCustomerName = async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId || (req as any).user?.companyId;
    const phone = String(req.query.phone || "");
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;

    if (!phone) {
      return res.status(200).json({
        success: false,
        message: "O numero de telemovel M-Pesa e obrigatorio.",
        responseDescription: "O numero de telemovel M-Pesa e obrigatorio.",
      });
    }

    const result = await queryCustomerMaskedName({
      companyId: Number(companyId),
      phone,
      customerId,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[M-Pesa Controller] Erro ao consultar nome do titular:", error?.message || error);
    return res.status(200).json({
      success: false,
      message: error?.message || "Erro interno ao consultar titular M-Pesa.",
      responseDescription: error?.message || "Erro interno ao consultar titular M-Pesa.",
    });
  }
};
