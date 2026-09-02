import moment from "moment";
import { Op } from "sequelize";
import { SmsQueueModel } from "../database/models/SmsQueueModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { DebtModel } from "../database/models/DebtModel";
import { CompanyModel } from "../database/models/CompanyModel";

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

export const enqueueSms = async (payload: EnqueuePayload) => {
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
