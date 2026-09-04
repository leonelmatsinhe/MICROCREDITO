import moment from "moment";
import { Op } from "sequelize";
import { SmsQueueModel } from "../database/models/SmsQueueModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { DebtModel } from "../database/models/DebtModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { sendTsembaSms, isTsembaConfigured } from "./TsembaSmsProvider";

export type SmsQueueStatus = "queued" | "processing" | "sent" | "failed" | "cancelled";

type EnqueuePayload = {
  companyId: number;
  accountNumber?: string | number | null;
  loanId?: number | null;
  amortizationLoanId?: number | null;
  transactionId?: number | null;
  debtId?: number | null;
  customerName?: string | null;
  phone?: string | null;
  messageType: string;
  messageBody: string;
  payloadJson?: Record<string, any> | null;
  status?: SmsQueueStatus;
};

type ReminderResult = {
  queued: number;
  skipped: number;
};

const normalizePhoneForGateway = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12) return digits.slice(3);
  if (digits.length === 9) return digits;
  return null;
};

const safeMoney = (value: any): string => Number(value || 0).toLocaleString("pt-MZ");

const parsePayload = (value: any): Record<string, any> | null => {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

const getCustomerForSms = async (companyId: number, accountNumber: any) => {
  return CustomerModel.findOne({
    where: { companyId, accountNumber },
    attributes: ["id", "customerName", "customerPhone", "accountNumber"],
  }) as any;
};

const buildQueuePayload = (payload: EnqueuePayload) => {
  const normalizedPhone = normalizePhoneForGateway(payload.phone || null);
  if (!normalizedPhone) return null;
  return {
    companyId: payload.companyId,
    accountNumber: payload.accountNumber ? String(payload.accountNumber) : null,
    loanId: payload.loanId ?? null,
    amortizationLoanId: payload.amortizationLoanId ?? null,
    transactionId: payload.transactionId ?? null,
    debtId: payload.debtId ?? null,
    customerName: payload.customerName || null,
    phone: normalizedPhone,
    messageType: payload.messageType,
    messageBody: payload.messageBody,
    payloadJson: payload.payloadJson ? JSON.stringify(payload.payloadJson) : null,
    status: payload.status || "queued",
  };
};

/**
 * Indica se a empresa autoriza o envio de SMS (configuração smsEnabled).
 * Ausência do campo/coluna é tratada como autorizado (default 1), para não
 * bloquear o envio em bases de dados pré-migração.
 */
export const isCompanySmsEnabled = async (companyId: number): Promise<boolean> => {
  if (!companyId) return false;
  try {
    const company: any = await CompanyModel.findByPk(companyId, {
      attributes: ["id", "smsEnabled"],
    });
    if (!company) return false;
    const value = Number((company as any).getDataValue?.("smsEnabled") ?? 1);
    return value === 1;
  } catch (error: any) {
    console.error("[SMS] Erro ao verificar smsEnabled:", error?.message || error);
    return true;
  }
};

export const enqueueSms = async (payload: EnqueuePayload) => {
  // Se a empresa desactivou o SMS, nenhuma operação de SMS ocorre.
  if (!(await isCompanySmsEnabled(payload.companyId))) {
    return { created: false, reason: "sms_disabled" };
  }
  const queuePayload = buildQueuePayload(payload);
  if (!queuePayload) {
    return { created: false, reason: "invalid_phone" };
  }
  const created = await SmsQueueModel.create(queuePayload);
  return { created: true, row: created };
};

export const enqueueDisbursementSms = async (params: {
  companyId: number;
  loanId: number;
  accountNumber: string | number;
  amount: number;
  installments: number;
  firstDueDate?: string | null;
}) => {
  const customer = await getCustomerForSms(params.companyId, params.accountNumber);
  if (!customer) return { created: false, reason: "customer_not_found" };

  // Template: max 160 chars, sem caracteres especiais
  const msg = `Ola ${customer.customerName}. Seu credito de ${safeMoney(params.amount)} MZN foi desembolsado. Parcelas: ${params.installments}. ${params.firstDueDate ? `Vence: ${params.firstDueDate}.` : ''} Obrigado.`;

  return enqueueSms({
    companyId: params.companyId,
    loanId: params.loanId,
    accountNumber: params.accountNumber,
    customerName: customer.customerName,
    phone: customer.customerPhone,
    messageType: "loan_disbursement",
    messageBody: msg,
    payloadJson: {
      loan_id: params.loanId,
      amount: params.amount,
      installments: params.installments,
      first_due_date: params.firstDueDate || null,
    },
  });
};

export const enqueuePaymentSms = async (params: {
  companyId: number;
  transactionId: number;
  loanId?: number | null;
  amortizationLoanId?: number | null;
  accountNumber: string | number;
  paidAmount: number;
  latePaymentInterest?: number;
  paymentDate?: string;
  reference?: string;
}) => {
  const customer = await getCustomerForSms(params.companyId, params.accountNumber);
  if (!customer) return { created: false, reason: "customer_not_found" };

  const interest = Number(params.latePaymentInterest || 0);
  // Template: max 160 chars, sem caracteres especiais
  const msg = `Ola ${customer.customerName}. Pagamento de ${safeMoney(params.paidAmount)} MZN confirmado.${interest > 0 ? ` Mora: ${safeMoney(interest)} MZN.` : ''} Ref: ${params.reference || 'N/A'}. Obrigado.`;

  return enqueueSms({
    companyId: params.companyId,
    loanId: params.loanId ?? null,
    amortizationLoanId: params.amortizationLoanId ?? null,
    transactionId: params.transactionId,
    accountNumber: params.accountNumber,
    customerName: customer.customerName,
    phone: customer.customerPhone,
    messageType: "installment_payment",
    messageBody: msg,
    payloadJson: {
      transaction_id: params.transactionId,
      payment_date: params.paymentDate || null,
      paid_amount: params.paidAmount,
      late_payment_interest: interest,
      reference: params.reference || null,
    },
  });
};

export const enqueueLateInterestSms = async (params: {
  companyId: number;
  debtId: number;
  loanId?: number | null;
  amortizationLoanId?: number | null;
  accountNumber: string | number;
  debtAmount: number;
  dueDate?: string | null;
}) => {
  const customer = await getCustomerForSms(params.companyId, params.accountNumber);
  if (!customer) return { created: false, reason: "customer_not_found" };

  // Template: max 160 chars, sem caracteres especiais
  const msg = `Ola ${customer.customerName}. Sua prestacao esta em atraso. Valor: ${safeMoney(params.debtAmount)} MZN. ${params.dueDate ? `Vencimento: ${params.dueDate}.` : ''} Regularize para evitar juros.`;

  return enqueueSms({
    companyId: params.companyId,
    loanId: params.loanId ?? null,
    amortizationLoanId: params.amortizationLoanId ?? null,
    debtId: params.debtId,
    accountNumber: params.accountNumber,
    customerName: customer.customerName,
    phone: customer.customerPhone,
    messageType: "late_interest_notice",
    messageBody: msg,
    payloadJson: {
      debt_id: params.debtId,
      debt_amount: params.debtAmount,
      due_date: params.dueDate || null,
    },
  });
};

export const enqueueUpcomingInstallmentAlerts = async (params: {
  companyId: number;
  daysAhead: number;
}): Promise<ReminderResult> => {
  // Empresa com SMS desactivado: não gera alertas
  if (!(await isCompanySmsEnabled(params.companyId))) {
    return { queued: 0, skipped: 0 };
  }

  const today = moment().format("YYYY-MM-DD");
  const endDate = moment().add(Math.max(1, params.daysAhead), "days").format("YYYY-MM-DD");

  const installments = await AmorizationLoanModel.findAll({
    where: {
      companyId: params.companyId,
      dueDate: { [Op.between]: [today, endDate] },
      status: { [Op.in]: [0, -1] },
    },
    attributes: ["id", "loanId", "accountNumber", "dueDate", "installment", "status"],
  });

  let queued = 0;
  let skipped = 0;

  for (const installment of installments as any[]) {
    const existent = await SmsQueueModel.findOne({
      where: {
        companyId: params.companyId,
        amortizationLoanId: installment.id,
        messageType: "upcoming_installment_alert",
        status: { [Op.in]: ["queued", "processing", "sent"] },
      },
    });
    if (existent) {
      skipped += 1;
      continue;
    }

    const customer = await getCustomerForSms(params.companyId, installment.accountNumber);
    const normalizedPhone = normalizePhoneForGateway(customer?.customerPhone || null);
    if (!customer || !normalizedPhone) {
      skipped += 1;
      continue;
    }

    await SmsQueueModel.create({
      companyId: params.companyId,
      accountNumber: String(installment.accountNumber),
      loanId: installment.loanId,
      amortizationLoanId: installment.id,
      customerName: customer.customerName,
      phone: normalizedPhone,
      messageType: "upcoming_installment_alert",
      // Template: max 160 chars, sem caracteres especiais
      messageBody: `Ola ${customer.customerName}. Sua prestacao de ${safeMoney(installment.installment)} MZN vence em ${installment.dueDate}. Evite juros facendo o pagamento.`,
      payloadJson: JSON.stringify({
        installment_id: installment.id,
        loan_id: installment.loanId,
        due_date: installment.dueDate,
        installment_amount: installment.installment,
      }),
      status: "queued",
    });
    queued += 1;
  }

  return { queued, skipped };
};

export const enqueueOutstandingLateInterestAlerts = async (params: {
  companyId: number;
  limit?: number;
}): Promise<ReminderResult> => {
  const debts = await DebtModel.findAll({
    where: { companyId: params.companyId },
    order: [["updatedAt", "DESC"]],
    limit: Math.max(1, params.limit || 100),
  });

  let queued = 0;
  let skipped = 0;

  for (const debt of debts as any[]) {
    const existent = await SmsQueueModel.findOne({
      where: {
        companyId: params.companyId,
        debtId: debt.id,
        messageType: "late_interest_notice",
        status: { [Op.in]: ["queued", "processing", "sent"] },
      },
    });
    if (existent) {
      skipped += 1;
      continue;
    }

    const amort = debt.amortisationId
      ? ((await AmorizationLoanModel.findByPk(debt.amortisationId, {
          attributes: ["id", "dueDate"],
        })) as any)
      : null;
    const result = await enqueueLateInterestSms({
      companyId: params.companyId,
      debtId: Number(debt.id),
      loanId: debt.loanId,
      amortizationLoanId: debt.amortisationId,
      accountNumber: debt.accountNumber,
      debtAmount: Number(debt.debtAmount || 0),
      dueDate: amort?.dueDate || null,
    });
    if (result.created) queued += 1;
    else skipped += 1;
  }

  return { queued, skipped };
};

const MAX_SMS_RETRIES = 5;

/**
 * Erros de nível de conta/plataforma (saldo, quota, chave) — transitórios.
 * Nestes casos a mensagem NÃO queima tentativas nem é marcada como failed:
 * fica em fila e volta a tentar quando o problema for resolvido (ex.: depois
 * de comprar unidades na Tsemba).
 */
const isTransientGatewayError = (error: string): boolean => {
  const err = String(error || "").toLowerCase();
  return (
    err.includes("tsemba_api_key") ||
    err.includes("saldo") ||
    err.includes("insuficiente") ||
    err.includes("insufficient") ||
    err.includes("balance") ||
    err.includes("carteira") ||
    err.includes("wallet") ||
    err.includes("quota") ||
    err.includes("credit")
  );
};

/**
 * Processa a fila de SMS: envia as mensagens pendentes através da API da Tsemba
 * e actualiza o estado (sent / queued para nova tentativa / failed após retries).
 *
 * - Mensagens `failed` por motivos transitórios (ex.: saldo insuficiente) são
 *   recuperadas automaticamente para `queued` e voltam a ser tentadas.
 * - Erros transitórios (saldo/quota/chave) não contam como tentativa e param o
 *   lote (backoff) — evitam queimar 5 tentativas contra uma conta sem saldo.
 *
 * Se a chave ainda não estiver configurada no .env, não toca na fila (deferred).
 */
export const processSmsQueue = async (params: { limit?: number } = {}) => {
  const limit = Math.min(200, Math.max(1, params.limit || 50));
  const results = {
    sent: 0,
    failed: 0,
    deferred: 0,
    skipped: 0,
    recovered: 0,
    disabled: 0,
    configured: true,
  };

  if (!isTsembaConfigured()) {
    // Sem chave: manter tudo na fila até o utilizador colar a API key no .env
    return { ...results, configured: false };
  }

  // Empresas que autorizam SMS — mensagens de empresas desactivadas ficam em
  // fila (não são enviadas) até o Admin voltar a activar o serviço.
  const companies: any[] = (await CompanyModel.findAll({
    attributes: ["id", "smsEnabled"],
  })) as any[];
  const enabledCompanyIds = new Set<number>();
  for (const company of companies) {
    const value = Number(company.getDataValue?.("smsEnabled") ?? 1);
    if (value === 1) enabledCompanyIds.add(Number(company.id));
  }

  // Recuperar mensagens paradas por motivos de conta (ex.: saldo insuficiente):
  //  - `failed` com erro transitório → voltam a `queued` (retries repostos);
  //  - `queued` com retries esgotadas (retries >= MAX) → repõe retries; no
  //    código actual nenhuma linha em fila legitima atinge este estado, logo é
  //    sempre um artefacto de recuperação/versão anterior.
  const stuckRows: any[] = (await SmsQueueModel.findAll({
    where: { status: { [Op.in]: ["failed", "queued"] } },
    order: [["id", "ASC"]],
    limit: 500,
  })) as any[];
  for (const row of stuckRows) {
    const isFailed = String(row.status) === "failed";
    const isTransient = isTransientGatewayError(String(row.errorMessage || ""));
    const exhausted = Number(row.retries || 0) >= MAX_SMS_RETRIES;
    if (isFailed ? isTransient : exhausted) {
      await row.update({
        status: "queued",
        retries: 0,
        errorMessage: null,
        lastAttemptAt: new Date(),
      });
      results.recovered += 1;
    }
  }

  const rows = await SmsQueueModel.findAll({
    where: {
      status: { [Op.in]: ["queued", "processing"] },
      retries: { [Op.lt]: MAX_SMS_RETRIES },
    },
    order: [["createdAt", "ASC"]],
    limit,
  });

  results.skipped = rows.length;

  for (const row of rows as any[]) {
    if (!enabledCompanyIds.has(Number(row.companyId))) {
      // Empresa com SMS desactivado: mantém em fila, sem enviar
      results.disabled += 1;
      continue;
    }

    const attempt = Number(row.retries || 0) + 1;
    const result = await sendTsembaSms({
      to: row.phone,
      message: row.messageBody,
    });

    if (result.success) {
      await row.update({
        status: "sent",
        gatewayMessageId: result.gatewayMessageId || null,
        errorMessage: null,
        retries: attempt,
        sentAt: new Date(),
        lastAttemptAt: new Date(),
      });
      results.sent += 1;
    } else if (isTransientGatewayError(result.error || "")) {
      // Problema de conta (saldo/quota/chave): mantém em fila sem queimar
      // tentativas e pára o lote (backoff) para não sobrecarregar a API.
      await row.update({
        status: "queued",
        errorMessage: String(result.error || "").slice(0, 250),
        lastAttemptAt: new Date(),
      });
      results.deferred += 1;
      break;
    } else {
      await row.update({
        status: attempt >= MAX_SMS_RETRIES ? "failed" : "queued",
        retries: attempt,
        errorMessage: String(result.error || "").slice(0, 250),
        lastAttemptAt: new Date(),
      });
      results.failed += 1;
    }
  }

  return results;
};

/**
 * Dispara o processamento da fila sem bloquear a resposta (fire-and-forget).
 */
export const flushSmsQueue = (limit = 100) => {
  processSmsQueue({ limit }).catch((error) => {
    console.error("[SMS] Erro ao processar a fila:", error?.message || error);
  });
};

export const getPendingSmsQueue = async (filters: {
  companyId?: number;
  limit?: number;
}) => {
  const whereClause: any = {
    status: { [Op.in]: ["queued", "processing"] },
  };
  if (filters.companyId) whereClause.companyId = filters.companyId;
  const limit = Math.min(500, Math.max(1, filters.limit || 50));

  return SmsQueueModel.findAll({
    where: whereClause,
    order: [["createdAt", "ASC"]],
    limit,
  });
};

export const listSmsQueueHistory = async (filters: {
  companyId?: number;
  from?: string;
  to?: string;
  status?: SmsQueueStatus;
  limit?: number;
}) => {
  const whereClause: any = {};
  if (filters.companyId) whereClause.companyId = filters.companyId;
  if (filters.status) whereClause.status = filters.status;
  if (filters.from || filters.to) {
    whereClause.createdAt = {};
    if (filters.from) whereClause.createdAt[Op.gte] = new Date(`${filters.from}T00:00:00`);
    if (filters.to) whereClause.createdAt[Op.lte] = new Date(`${filters.to}T23:59:59`);
  }
  const limit = Math.min(1000, Math.max(1, filters.limit || 200));
  const rows = await SmsQueueModel.findAll({
    where: whereClause,
    order: [["id", "DESC"]],
    limit,
  });
  return rows.map((row: any) => {
    const plain = row.toJSON ? row.toJSON() : row;
    plain.payloadJson = parsePayload(plain.payloadJson);
    return plain;
  });
};

export const hydrateSmsQueuePayload = (row: any) => {
  const plain = row.toJSON ? row.toJSON() : row;
  plain.payloadJson = parsePayload(plain.payloadJson);
  return plain;
};

// Template para reenvio de senha
export const enqueuePasswordResetSms = async (params: {
  companyId: number;
  accountNumber: string | number;
  newPassword: string;
}) => {
  const customer = await getCustomerForSms(params.companyId, params.accountNumber);
  if (!customer) return { created: false, reason: "customer_not_found" };

  // Buscar nome da empresa
  const company = await CompanyModel.findByPk(params.companyId) as any;
  const companyName = company?.toJSON()?.companyName || 'MBR Microcrédito';

  // Template: max 160 chars, sem caracteres especiais
  const msg = `Ola ${customer.customerName}. Sua senha de acesso ao portal da ${companyName} e: ${params.newPassword}. Telefone: ${customer.customerPhone}. Altere apos o primeiro acesso.`;

  return enqueueSms({
    companyId: params.companyId,
    accountNumber: params.accountNumber,
    customerName: customer.customerName,
    phone: customer.customerPhone,
    messageType: "password_reset",
    messageBody: msg,
    payloadJson: {
      account_number: params.accountNumber,
      new_password: params.newPassword,
    },
  });
};

// Templates de WhatsApp (mesma estrutura, formato diferente)
export const getWhatsAppTemplates = () => ({
  disbursement: {
    name: "Credito Desembolsado",
    template: "Ola {nome}. Seu credito de {valor} MZN foi desembolsado. Parcelas: {parcelas}. Vence: {vencimento}. Obrigado.",
    placeholders: ["nome", "valor", "parcelas", "vencimento"],
  },
  payment: {
    name: "Pagamento Confirmado",
    template: "Ola {nome}. Pagamento de {valor} MZN confirmado. Ref: {referencia}. Obrigado.",
    placeholders: ["nome", "valor", "referencia"],
  },
  upcoming: {
    name: "Lembrete de Prestacao",
    template: "Ola {nome}. Sua prestacao de {valor} MZN vence em {data}. Evite juros facendo o pagamento.",
    placeholders: ["nome", "valor", "data"],
  },
  latePayment: {
    name: "Prestacao em Atraso",
    template: "Ola {nome}. Sua prestacao esta em atraso. Valor: {valor} MZN. Regularize para evitar juros.",
    placeholders: ["nome", "valor"],
  },
  passwordReset: {
    name: "Redefinicao de Senha",
    template: "Ola {nome}. Sua nova senha: {senha}. Altere apos o primeiro acesso.",
    placeholders: ["nome", "senha"],
  },
});
