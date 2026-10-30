import axios from "axios";
import crypto from "crypto";
import constants from "constants";
import { Op } from "sequelize";
import { db } from "../database/db";
import { MpesaTransactionModel } from "../database/models/MpesaTransactionModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { LoanModel } from "../database/models/LoanModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { DebtModel } from "../database/models/DebtModel";
import { NotificationModel } from "../database/models/NotificationModel";
import { checkAndLiquidateLoan } from "../controllers/TranzactionController";
import { getLegacyPenaltyParams } from "./lateInterestService";
import { installmentPanification } from "../utils/calculateLateAmount";

export type MpesaInitiateResult = {
  success: boolean;
  status: "INITIATED" | "PENDING_PIN" | "SUCCESS" | "FAILED" | "TIMEOUT";
  mpesaTxId: number;
  transactionReference: string;
  conversationId?: string | null;
  message: string;
  responseCode?: string;
  responseDescription?: string;
  tranzactionId?: number | null;
  recibo?: { id: number; numero: string; pdf_url: string | null } | null;
  excess?: number;
  isPartial?: boolean;
};

const round2 = (value: any): number => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
};

const toNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Lê configuração M-Pesa do ambiente
 */
export const getMpesaConfig = () => {
  return {
    host: process.env.MPESA_API_HOST || "api.sandbox.vm.co.mz",
    apiKey: process.env.MPESA_API_KEY || "",
    publicKey: process.env.MPESA_PUBLIC_KEY || "",
    origin: process.env.MPESA_ORIGIN || "developer.mpesa.vm.co.mz",
    serviceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE || "171717",
    isMock:
      process.env.MPESA_MOCK === "true" ||
      !process.env.MPESA_API_KEY ||
      process.env.MPESA_API_KEY.includes("trocar") ||
      !process.env.MPESA_PUBLIC_KEY,
  };
};

/**
 * Criptografa a API Key usando a Public Key RSA com PKCS1 Padding
 */
export const generateBearerToken = (publicKeyStr: string, apiKey: string): string => {
  try {
    const formattedKey = publicKeyStr.includes("BEGIN PUBLIC KEY")
      ? publicKeyStr
      : `-----BEGIN PUBLIC KEY-----\n${publicKeyStr}\n-----END PUBLIC KEY-----`;
    const buffer = Buffer.from(apiKey);
    const encrypted = crypto.publicEncrypt(
      {
        key: formattedKey,
        padding: constants.RSA_PKCS1_PADDING,
      },
      buffer
    );
    return encrypted.toString("base64");
  } catch (error: any) {
    console.error("[M-Pesa] Erro ao criptografar chave pública:", error?.message || error);
    throw new Error("Falha na autenticação com o servidor M-Pesa (Chave inválida).");
  }
};

/**
 * Iniciação de Pagamento C2B via Open API (Single-Stage)
 */
export const initiateC2BPayment = async (params: {
  companyId: number;
  customerId: number;
  loanId: number;
  amortizationLoanId: number;
  amount: number;
  phone: string;
}): Promise<MpesaInitiateResult> => {
  const { companyId, customerId, loanId, amortizationLoanId, amount, phone } = params;
  const paymentAmount = round2(amount);

  if (paymentAmount <= 0) {
    throw new Error("O valor do pagamento deve ser superior a 0 MZN.");
  }

  // Validação estrita do número M-Pesa (Moçambique: 25884 ou 25885 + 7 dígitos)
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  if (!/^258(84|85)\d{7}$/.test(normalizedPhone)) {
    throw new Error("Número M-Pesa inválido. Deve ter 12 dígitos e começar por 25884 ou 25885.");
  }

  // Verificar cliente e crédito
  const customer: any = await CustomerModel.findOne({ where: { id: customerId, companyId } });
  if (!customer) throw new Error("Mutuário não encontrado.");

  const loan: any = await LoanModel.findOne({ where: { id: loanId, companyId, customerId } });
  if (!loan) throw new Error("Crédito não encontrado.");

  const installment: any = await AmorizationLoanModel.findOne({ where: { id: amortizationLoanId, loanId } });
  if (!installment) throw new Error("Prestação não encontrada.");

  if (Number(installment.status) === 1) {
    throw new Error("Esta prestação já se encontra liquidada.");
  }

  const installmentValue = round2(installment.installment);
  const alreadyPaid = round2(installment.paidAmount);
  const remaining = round2(Math.max(0, installmentValue - alreadyPaid));

  if (remaining <= 0) {
    throw new Error("Não existe saldo em dívida nesta prestação.");
  }

  // Cálculo de mora oficial
  const { forfeit, maxLateDays, capPercent } = await getLegacyPenaltyParams(companyId);
  const calculatedInstallment = installmentPanification(
    [{ ...installment.toJSON(), paidAmount: alreadyPaid }],
    forfeit,
    undefined,
    { maxLateDays, capPercent }
  )[0];
  const currentLateInterest = round2(Number(calculatedInstallment?.latePaymentInterest || 0));
  const currentTotalDue = round2(remaining + currentLateInterest);

  // Prestação seguinte para eventual troco
  const nextInstallment: any = await AmorizationLoanModel.findOne({
    where: { loanId, status: { [Op.ne]: 1 }, id: { [Op.gt]: amortizationLoanId } },
    order: [["dueDate", "ASC"], ["id", "ASC"]],
  });
  const nextRemaining = nextInstallment
    ? round2(Math.max(0, toNumber(nextInstallment.installment) - toNumber(nextInstallment.paidAmount)))
    : 0;

  // Valor mínimo de 15%
  const minAllowed = Math.min(remaining, round2(installmentValue * 0.15));
  if (paymentAmount < minAllowed - 0.001) {
    throw new Error(`O valor a pagar deve ser no mínimo ${minAllowed.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })} MZN.`);
  }

  const excess = round2(Math.max(0, paymentAmount - currentTotalDue));
  if (excess > 0 && (!nextInstallment || excess > nextRemaining + 0.001)) {
    throw new Error(
      nextInstallment
        ? `Pagamento rejeitado: o troco de ${excess.toLocaleString("pt-MZ")} MZN excede o saldo da prestação seguinte.`
        : "Pagamento rejeitado: não existe prestação seguinte para receber o excedente."
    );
  }

  // Referências únicas de rastreamento
  const suffix = Date.now().toString().slice(-6);
  const transactionRef = `T${loanId}${suffix}`.slice(0, 10);
  const cleanAcc = String(customer.accountNumber || customerId).replace(/[^a-zA-Z0-9]/g, "");
  const thirdPartyRef = `${cleanAcc}${suffix}`.slice(0, 30);

  // Registar tentativa em mpesa_transactions (Estado inicial INITIATED)
  const mpesaTx: any = await MpesaTransactionModel.create({
    companyId,
    customerId,
    loanId,
    amortizationLoanId,
    accountNumber: String(customer.accountNumber || ""),
    transactionReference: transactionRef,
    thirdPartyReference: thirdPartyRef,
    msisdn: normalizedPhone,
    amount: paymentAmount,
    excessAmount: excess,
    lateInterest: currentLateInterest,
    status: "INITIATED",
  });

  const config = getMpesaConfig();

  // MODO MOCK / SANDBOX DE DESENVOLVIMENTO:
  // Se não houver chaves de produção reais ou MPESA_MOCK=true, simula a resposta
  // da Vodacom com ConversationID e aguarda o PIN ou liquida diretamente
  if (config.isMock) {
    const mockConversationId = `AG_SIM_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const mockTransactionId = `MP${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    await mpesaTx.update({
      conversationId: mockConversationId,
      status: "PENDING_PIN",
      responseCode: "INS-000000",
      responseDescription: "Request processed successfully (Mock Sandbox)",
      rawInitiateResponse: JSON.stringify({
        output_ResponseCode: "INS-000000",
        output_ResponseDesc: "Request processed successfully",
        output_TransactionID: mockTransactionId,
        output_ConversationID: mockConversationId,
        output_ThirdPartyReference: thirdPartyRef,
      }),
    });

    return {
      success: true,
      status: "PENDING_PIN",
      mpesaTxId: Number(mpesaTx.id),
      transactionReference: transactionRef,
      conversationId: mockConversationId,
      message: "Pedido M-Pesa enviado para o telemóvel. Introduza o PIN para confirmar.",
      responseCode: "INS-000000",
      responseDescription: "Request processed successfully",
      excess,
    };
  }

  // MODO REAL: Comunicação com a Vodacom Open API
  try {
    const token = generateBearerToken(config.publicKey, config.apiKey);
    const url = `https://${config.host}:18352/ipg/v1x/c2bPayment/singleStage/`;

    const requestBody = {
      input_TransactionReference: transactionRef,
      input_CustomerMSISDN: normalizedPhone,
      input_Amount: String(Math.round(paymentAmount)),
      input_ThirdPartyReference: thirdPartyRef,
      input_ServiceProviderCode: config.serviceProviderCode,
    };

    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Origin: config.origin,
      },
      timeout: 30000,
    });

    const data = response.data || {};
    const respCode = String(data.output_ResponseCode || "");
    const respDesc = String(data.output_ResponseDesc || "");
    const conversationId = data.output_ConversationID || null;
    const mpesaReceipt = data.output_TransactionID || null;

    const isVodacomSuccess =
      respCode === "INS-0" ||
      respCode === "INS-000000" ||
      respDesc.toLowerCase().includes("success");

    await mpesaTx.update({
      conversationId,
      responseCode: respCode,
      responseDescription: respDesc,
      rawInitiateResponse: JSON.stringify(data),
      status: isVodacomSuccess ? "PENDING_PIN" : "FAILED",
    });

    if (!isVodacomSuccess) {
      return {
        success: false,
        status: "FAILED",
        mpesaTxId: Number(mpesaTx.id),
        transactionReference: transactionRef,
        conversationId,
        responseCode: respCode,
        responseDescription: respDesc,
        message: `M-Pesa recusou o pedido: ${respDesc || "código " + respCode}`,
      };
    }

    // Se já retornou o TransactionID na resposta inicial (alguns gateways resolvem síncrono):
    if (mpesaReceipt && mpesaReceipt !== "000000000000") {
      const finalizeResult = await finalizeMpesaPayment(Number(mpesaTx.id), { mpesaReceipt });
      return {
        success: true,
        status: "SUCCESS",
        mpesaTxId: Number(mpesaTx.id),
        transactionReference: transactionRef,
        conversationId,
        message: finalizeResult.message,
        tranzactionId: finalizeResult.tranzactionId,
        recibo: finalizeResult.recibo,
        excess,
      };
    }

    return {
      success: true,
      status: "PENDING_PIN",
      mpesaTxId: Number(mpesaTx.id),
      transactionReference: transactionRef,
      conversationId,
      message: "Pedido M-Pesa enviado para o seu telemóvel. Introduza o PIN para confirmar o pagamento.",
      responseCode: respCode,
      responseDescription: respDesc,
      excess,
    };
  } catch (error: any) {
    const errorData = error.response?.data || {};
    const respCode = errorData.output_ResponseCode || "ERROR";
    const respDesc = errorData.output_ResponseDesc || error.message || "Erro de comunicação";

    await mpesaTx.update({
      status: "FAILED",
      responseCode: respCode,
      responseDescription: respDesc,
      errorMessage: error.message,
      rawInitiateResponse: JSON.stringify(errorData),
    });

    return {
      success: false,
      status: "FAILED",
      mpesaTxId: Number(mpesaTx.id),
      transactionReference: transactionRef,
      responseCode: respCode,
      responseDescription: respDesc,
      message: errorData.output_ResponseDesc
        ? `Pagamento não concluído no servidor M-Pesa: ${errorData.output_ResponseDesc}`
        : "Não foi possível comunicar com o servidor M-Pesa. Tente novamente mais tarde.",
    };
  }
};

/**
 * Consulta de Status da Transação na Vodacom (Query Transaction Status)
 */
export const queryMpesaTransactionStatus = async (mpesaTxId: number): Promise<any> => {
  const tx: any = await MpesaTransactionModel.findByPk(mpesaTxId);
  if (!tx) throw new Error("Registo M-Pesa não encontrado.");

  // Se já foi finalizada com sucesso, retorna de imediato
  if (tx.status === "SUCCESS") {
    return {
      success: true,
      status: "SUCCESS",
      mpesaReceipt: tx.mpesaReceipt,
      tranzactionId: tx.tranzactionId,
      reciboId: tx.reciboId,
      message: "Pagamento já se encontra liquidado com sucesso.",
    };
  }

  const config = getMpesaConfig();

  // Em modo simulação/mock: se está PENDING_PIN, finaliza com sucesso simulando a digitação do PIN
  if (config.isMock) {
    const mockReceipt = `MP${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    const finalizeRes = await finalizeMpesaPayment(tx.id, { mpesaReceipt: mockReceipt });
    return {
      success: true,
      status: "SUCCESS",
      mpesaReceipt: mockReceipt,
      tranzactionId: finalizeRes.tranzactionId,
      recibo: finalizeRes.recibo,
      message: "Pagamento confirmado com sucesso via M-Pesa.",
    };
  }

  try {
    const token = generateBearerToken(config.publicKey, config.apiKey);
    const url = `https://${config.host}:18353/ipg/v1x/queryTransactionStatus/`;

    const requestBody = {
      input_QueryReference: tx.conversationId || tx.transactionReference,
      input_ServiceProviderCode: config.serviceProviderCode,
      input_ThirdPartyReference: tx.thirdPartyReference,
    };

    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Origin: config.origin,
      },
      timeout: 15000,
    });

    const data = response.data || {};
    const respCode = String(data.output_ResponseCode || "");
    const mpesaReceipt = data.output_TransactionID || null;

    await tx.update({
      queryCount: (tx.queryCount || 0) + 1,
      lastQueriedAt: new Date(),
      responseCode: respCode,
      responseDescription: data.output_ResponseDesc || "",
    });

    const querySuccess =
      respCode === "INS-0" ||
      respCode === "INS-000000" ||
      String(data.output_ResponseDesc || "").toLowerCase().includes("success");

    if (querySuccess && mpesaReceipt) {
      const finalizeRes = await finalizeMpesaPayment(tx.id, { mpesaReceipt });
      return {
        success: true,
        status: "SUCCESS",
        mpesaReceipt,
        tranzactionId: finalizeRes.tranzactionId,
        recibo: finalizeRes.recibo,
        message: "Pagamento confirmado com sucesso via M-Pesa.",
      };
    }

    return {
      success: false,
      status: tx.status,
      message: data.output_ResponseDesc || "Aguardando confirmação do PIN M-Pesa no telemóvel.",
    };
  } catch (error: any) {
    await tx.update({
      queryCount: (tx.queryCount || 0) + 1,
      lastQueriedAt: new Date(),
      errorMessage: error?.message || "Erro na consulta de status",
    });
    return {
      success: false,
      status: tx.status,
      message: "Aguardando confirmação do PIN M-Pesa no telemóvel.",
    };
  }
};

/**
 * Webhook Callback Oficial da Vodacom (POST /api/mpesa/c2b/callback)
 */
export const handleMpesaCallback = async (callbackData: any): Promise<any> => {
  const conversationId =
    callbackData?.output_ConversationID ||
    callbackData?.input_ConversationID ||
    callbackData?.output_OriginatorConversationID;

  const transactionRef =
    callbackData?.output_TransactionReference ||
    callbackData?.input_TransactionReference;

  const thirdPartyRef =
    callbackData?.output_ThirdPartyReference ||
    callbackData?.input_ThirdPartyReference;

  const whereClause: any = {};
  if (conversationId) {
    whereClause.conversationId = conversationId;
  } else if (transactionRef) {
    whereClause.transactionReference = transactionRef;
  } else if (thirdPartyRef) {
    whereClause.thirdPartyReference = thirdPartyRef;
  } else {
    throw new Error("Callback sem referências identificadoras da Vodacom.");
  }

  const tx: any = await MpesaTransactionModel.findOne({
    where: whereClause,
    order: [["id", "DESC"]],
  });

  if (!tx) {
    console.warn("[M-Pesa Webhook] Transação não encontrada para o callback:", callbackData);
    return { success: false, message: "Transação não encontrada." };
  }

  // Idempotência: se já estiver como SUCCESS, não processa novamente
  if (tx.status === "SUCCESS") {
    return {
      success: true,
      message: "Transação já processada anteriormente.",
      tranzactionId: tx.tranzactionId,
      reciboId: tx.reciboId,
    };
  }

  const respCode = String(callbackData.output_ResponseCode || "");
  const respDesc = String(callbackData.output_ResponseDesc || "");
  const mpesaReceipt = String(callbackData.output_TransactionID || "").toUpperCase();

  await tx.update({
    rawCallbackPayload: JSON.stringify(callbackData),
    responseCode: respCode,
    responseDescription: respDesc,
  });

  const isSuccess =
    respCode === "INS-000000" ||
    respCode === "INS-0" ||
    respDesc.toLowerCase().includes("success") ||
    (mpesaReceipt && mpesaReceipt !== "000000000000");

  if (!isSuccess) {
    await tx.update({ status: "FAILED", errorMessage: respDesc || "Rejeitado pela Vodacom no callback" });
    return { success: false, status: "FAILED", message: respDesc };
  }

  const finalizeRes = await finalizeMpesaPayment(tx.id, { mpesaReceipt });
  return {
    success: true,
    status: "SUCCESS",
    tranzactionId: finalizeRes.tranzactionId,
    recibo: finalizeRes.recibo,
    message: "Pagamento liquidado com sucesso pelo callback Vodacom.",
  };
};

/**
 * Finalização Atômica e Idempotente do Pagamento
 */
export const finalizeMpesaPayment = async (
  mpesaTxId: number,
  options?: { mpesaReceipt?: string }
): Promise<any> => {
  const mpesaTx: any = await MpesaTransactionModel.findByPk(mpesaTxId);
  if (!mpesaTx) throw new Error("Registo M-Pesa não encontrado.");

  // Se já finalizado com sucesso, retorna os dados existentes de forma idempotente
  if (mpesaTx.status === "SUCCESS" && mpesaTx.tranzactionId) {
    let reciboData = null;
    if (mpesaTx.reciboId) {
      const { ReciboModel } = await import("../database/models/ReciboModel");
      reciboData = await ReciboModel.findByPk(mpesaTx.reciboId, { raw: true });
    }
    return {
      success: true,
      alreadyFinalized: true,
      tranzactionId: mpesaTx.tranzactionId,
      recibo: reciboData,
      message: "Pagamento já se encontra liquidado.",
    };
  }

  const companyId = Number(mpesaTx.companyId);
  const customerId = Number(mpesaTx.customerId);
  const loanId = Number(mpesaTx.loanId);
  const amortizationLoanId = Number(mpesaTx.amortizationLoanId);
  const paymentAmount = round2(mpesaTx.amount);
  const currentLateInterest = round2(mpesaTx.lateInterest);
  const excess = round2(mpesaTx.excessAmount);
  const payerPhone = mpesaTx.msisdn;
  const mpesaReceipt = options?.mpesaReceipt || mpesaTx.mpesaReceipt || `MP${Date.now().toString().slice(-8)}`;

  const customer: any = await CustomerModel.findByPk(customerId);
  const loan: any = await LoanModel.findByPk(loanId);
  const installment: any = await AmorizationLoanModel.findByPk(amortizationLoanId);

  if (!customer || !loan || !installment) {
    throw new Error("Entidades relacionadas ao crédito não foram encontradas.");
  }

  const customerData = customer.toJSON();
  const installmentData = installment.toJSON();
  const installmentValue = round2(installmentData.installment);
  const alreadyPaid = round2(installmentData.paidAmount);
  const remaining = round2(Math.max(0, installmentValue - alreadyPaid));

  // Alocação bancária estrita:
  // 1. Mora (Juros de mora acumulados)
  const actualLateCovered = round2(Math.min(paymentAmount, currentLateInterest));
  // 2. Capital / Parcela da prestação
  const actualInstallmentCovered = round2(Math.min(remaining, Math.max(0, paymentAmount - actualLateCovered)));

  const newTotalPaid = round2(alreadyPaid + actualInstallmentCovered);
  const isFullPayment = newTotalPaid >= installmentValue - 0.01;
  const newStatus = isFullPayment ? 1 : -1;
  const finalPaidAmount = Math.min(newTotalPaid, installmentValue);
  const debtAmount = isFullPayment ? 0 : round2(Math.max(0, installmentValue - finalPaidAmount));

  const todayStr = new Date().toISOString().slice(0, 10);
  const txReference = mpesaReceipt;
  const description = `Pagamento via M-Pesa (${payerPhone}) — Prestação ${installmentData.installmentOrder || amortizationLoanId} do crédito ${loanId} (recibo M-Pesa: ${mpesaReceipt})`;

  // Início da transação de persistência
  const t = await db.transaction();
  let tranzactionRecord: any = null;

  try {
    // 1. Criar transação em `tranzacoes`
    tranzactionRecord = await TranzactionModel.create(
      {
        companyId,
        amortizationLoanId,
        loanId,
        accountNumber: customerData.accountNumber,
        customerId,
        amount: actualInstallmentCovered,
        totalAmount: paymentAmount,
        latePaymentInterest: actualLateCovered,
        mora_amount: actualLateCovered,
        interestRateAmount: 0,
        phoneNumber: payerPhone,
        paymentDate: todayStr,
        tranzactionReference: txReference,
        paymentMethod: 7, // 7 = M-Pesa
        description,
        receiptUrl: null,
        staffName: "Portal do Mutuário (M-Pesa API)",
        notes: `M-Pesa Open API: ${mpesaTx.transactionReference}`,
        discountApplied: false,
        discountAmount: 0,
      },
      { transaction: t }
    );

    // 1.b Registar em payment_allocations (V2)
    try {
      const { PaymentAllocationModel } = await import("../database/models/paymentsV2Models");
      const allocations: any[] = [];
      if (actualLateCovered > 0) {
        allocations.push({
          payment_id: tranzactionRecord.id,
          amortization_loan_id: amortizationLoanId,
          component: "LATE_INTEREST",
          amount: actualLateCovered,
        });
      }
      if (actualInstallmentCovered > 0) {
        allocations.push({
          payment_id: tranzactionRecord.id,
          amortization_loan_id: amortizationLoanId,
          component: "CAPITAL",
          amount: actualInstallmentCovered,
        });
      }
      if (allocations.length > 0) {
        await PaymentAllocationModel.bulkCreate(allocations, { transaction: t });
      }
    } catch (allocErr) {
      // Non-blocking
    }

    // 2. Atualizar prestação
    await AmorizationLoanModel.update(
      {
        status: newStatus,
        paidAmount: finalPaidAmount,
        remainingBalance: isFullPayment ? 0 : debtAmount,
      },
      { where: { id: amortizationLoanId }, transaction: t }
    );

    // 3. Atualizar / destruir débito parcial
    if (!isFullPayment) {
      const existingDebt: any = await DebtModel.findOne({
        where: { amortisationId: amortizationLoanId },
        transaction: t,
      });
      if (existingDebt) {
        await DebtModel.update({ debtAmount }, { where: { id: existingDebt.id }, transaction: t });
      } else {
        await DebtModel.create(
          {
            companyId,
            customerId,
            accountNumber: String(customerData.accountNumber),
            loanId,
            amortisationId: amortizationLoanId,
            debtAmount,
            updatedBy: "Portal do Mutuário (M-Pesa API)",
            dateInserted: todayStr,
          },
          { transaction: t }
        );
      }
    } else {
      await DebtModel.destroy({ where: { amortisationId: amortizationLoanId }, transaction: t });
    }

    // 4. Se houver troco aplicado na prestação seguinte
    if (excess > 0) {
      const nextInstallment: any = await AmorizationLoanModel.findOne({
        where: { loanId, status: { [Op.ne]: 1 }, id: { [Op.gt]: amortizationLoanId } },
        order: [["dueDate", "ASC"], ["id", "ASC"]],
        transaction: t,
      });

      if (nextInstallment) {
        const nextData = nextInstallment.toJSON();
        const nextPaymentAmount = excess;
        const nextPaid = round2(nextData.paidAmount);
        const nextValue = round2(nextData.installment);
        const nextTotalPaid = round2(nextPaid + nextPaymentAmount);
        const nextFull = nextTotalPaid >= nextValue - 0.01;

        await TranzactionModel.create(
          {
            companyId,
            amortizationLoanId: nextData.id,
            loanId,
            accountNumber: customerData.accountNumber,
            customerId,
            amount: nextPaymentAmount,
            totalAmount: nextPaymentAmount,
            latePaymentInterest: 0,
            interestRateAmount: 0,
            phoneNumber: payerPhone,
            paymentDate: todayStr,
            tranzactionReference: `${txReference}-TR`,
            paymentMethod: 7,
            description: `Troco aplicado na prestação ${nextData.installmentOrder || nextData.id} (M-Pesa: ${mpesaReceipt})`,
            receiptUrl: null,
            staffName: "Portal do Mutuário (M-Pesa API)",
            notes: `Troco M-Pesa ref ${mpesaTx.transactionReference}`,
            discountApplied: false,
            discountAmount: 0,
          },
          { transaction: t }
        );

        await AmorizationLoanModel.update(
          {
            status: nextFull ? 1 : -1,
            paidAmount: Math.min(nextTotalPaid, nextValue),
            remainingBalance: nextFull ? 0 : round2(nextValue - nextTotalPaid),
          },
          { where: { id: nextData.id }, transaction: t }
        );
      }
    }

    await t.commit();
  } catch (sqlErr: any) {
    await t.rollback();
    console.error("[M-Pesa Finalize] Rollback na transação SQL:", sqlErr?.message || sqlErr);
    if (sqlErr?.errors) {
      console.error("[M-Pesa Finalize] Detailed Validation Errors:", JSON.stringify(sqlErr.errors, null, 2));
    }
    throw sqlErr;
  }

  // Operações pós-commit (notificação, liquidação geral, caixa, recibo e SMS)
  const tranzactionId = Number(tranzactionRecord.id);

  // 5. Notificação in-app para o cliente
  try {
    await NotificationModel.create({
      companyId,
      recipientType: "customer",
      recipientId: customerId,
      title: isFullPayment ? "Prestação liquidada via M-Pesa" : "Pagamento parcial M-Pesa registado",
      message: `O seu pagamento de ${paymentAmount.toLocaleString("pt-MZ")} MZN via M-Pesa (${mpesaReceipt}) foi confirmado.${excess > 0 ? ` Troco de ${excess.toLocaleString("pt-MZ")} MZN aplicado à prestação seguinte.` : isFullPayment ? "" : ` Saldo em dívida: ${debtAmount.toLocaleString("pt-MZ")} MZN.`}`,
      type: "payment_received",
      referenceId: tranzactionId,
      isRead: false,
    });
  } catch (notifErr) {
    console.error("Erro ao criar notificação do cliente:", notifErr);
  }

  // 6. Verificar liquidação total do crédito
  try {
    await checkAndLiquidateLoan(loanId, companyId, customerData.accountNumber);
  } catch (liqErr) {
    console.error("Erro ao verificar liquidação do crédito:", liqErr);
  }

  // 7. Tesouraria / Caixa Central (entrada na conta M-Pesa da empresa)
  try {
    const { getDefaultCollectAccount } = await import("./bankAccountService");
    const collectAccount = await getDefaultCollectAccount(companyId);
    if (collectAccount) {
      const { registerMovement } = await import("./treasuryService");
      await registerMovement({
        companyId,
        userId: null,
        type: "ENTRADA",
        category: "REEMBOLSO",
        amount: paymentAmount,
        paymentMethod: "MPESA",
        bankAccountId: collectAccount.id,
        description: `Reembolso M-Pesa via portal — conta ${customerData.accountNumber} (recibo M-Pesa: ${mpesaReceipt})`,
        loanId,
        amortizationLoanId,
        tranzactionId,
        customerId,
        reference: { type: "customer_portal", id: tranzactionId },
        automatic: true,
        allowWithoutOpenRegister: true,
      });
    }
  } catch (cashErr: any) {
    console.error("[CAIXA] Entrada automática mantida com aviso:", cashErr?.message || cashErr);
  }

  // 8. Emissão do Recibo Oficial (Certificação AT com QR Code)
  let recibo: any = null;
  try {
    const { generateReciboForTranzaction } = await import("./reciboService");
    recibo = await generateReciboForTranzaction({
      tranzactionId,
      companyId,
      createdBy: null,
    });
  } catch (recErr: any) {
    console.error("[Recibo] Falha ao emitir o recibo do pagamento M-Pesa:", recErr?.message || recErr);
  }

  // 9. Atualizar registo mpesa_transactions para SUCCESS
  await mpesaTx.update({
    status: "SUCCESS",
    mpesaReceipt,
    tranzactionId,
    reciboId: recibo ? Number(recibo.id) : null,
  });

  // 10. Enfileirar SMS de confirmação com link do recibo ao Mutuário
  try {
    const { enqueuePaymentSms } = await import("./SmsGatewayService");
    await enqueuePaymentSms({
      companyId,
      transactionId: tranzactionId,
      loanId,
      amortizationLoanId,
      accountNumber: customerData.accountNumber,
      paidAmount: paymentAmount,
      latePaymentInterest: currentLateInterest,
      paymentDate: todayStr,
      reference: mpesaReceipt,
      reciboNumeros: recibo?.numero ? [String(recibo.numero)] : null,
    });
  } catch (smsErr) {
    console.error("Erro ao enfileirar SMS ao cliente:", smsErr);
  }

  // 11. Disparo de SMS Operacional ao Gestor de Crédito responsável (Sprint 3)
  try {
    const { enqueueStaffMpesaPaymentAlert } = await import("./StaffSmsAlertService");
    await enqueueStaffMpesaPaymentAlert({
      companyId,
      customerId,
      loanId,
      customerName: customerData.customerName,
      amount: paymentAmount,
      installmentOrder: installmentData.installmentOrder || amortizationLoanId,
      mpesaReceipt,
      remainingBalance: isFullPayment ? 0 : debtAmount,
    });
  } catch (staffSmsErr) {
    // Best effort - não trava a finalização
  }

  return {
    success: true,
    message: isFullPayment
      ? `Pagamento de ${paymentAmount.toLocaleString("pt-MZ")} MZN concluído com sucesso via M-Pesa.${excess > 0 ? ` Troco de ${excess.toLocaleString("pt-MZ")} MZN aplicado à prestação seguinte.` : " Prestação liquidada."}`
      : `Pagamento parcial de ${paymentAmount.toLocaleString("pt-MZ")} MZN concluído via M-Pesa. Saldo em falta: ${debtAmount.toLocaleString("pt-MZ")} MZN.`,
    tranzactionId,
    mpesaReceipt,
    isPartial: !isFullPayment,
    recibo: recibo
      ? { id: Number(recibo.id), numero: recibo.numero, pdf_url: recibo.pdf_url || null }
      : null,
  };
};
