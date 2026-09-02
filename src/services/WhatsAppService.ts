import { WhatsAppModel } from "../database/models/WhatsAppModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { CompanyModel } from "../database/models/CompanyModel";

const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12) return digits.slice(3);
  if (digits.length === 9) return digits;
  if (digits.length === 12 && digits.startsWith("258")) return digits.slice(3);
  return digits.length === 9 ? digits : null;
};

const getCustomer = async (companyId: number, accountNumber: any) => {
  return CustomerModel.findOne({
    where: { companyId, accountNumber },
    attributes: ["id", "customerName", "customerPhone", "accountNumber"],
  }) as any;
};

type WhatsAppPayload = {
  companyId: number;
  accountNumber?: string | number;
  phone?: string;
  messageType: string;
  messageBody: string;
  payloadJson?: Record<string, any>;
};

export const sendWhatsAppMessage = async (payload: WhatsAppPayload) => {
  const normalizedPhone = normalizePhone(payload.phone || null);
  if (!normalizedPhone) {
    return { sent: false, reason: "invalid_phone" };
  }

  // Registrar na base de dados
  const message = await WhatsAppModel.create({
    companyId: payload.companyId,
    phone: normalizedPhone,
    accountNumber: payload.accountNumber ? String(payload.accountNumber) : null,
    messageType: payload.messageType,
    messageBody: payload.messageBody,
    status: "queued",
    direction: "outbound",
    payloadJson: payload.payloadJson ? JSON.stringify(payload.payloadJson) : null,
  });

  const plainMessage = message.toJSON() as any;

  // TODO: Integrar com Evolution API quando configurada
  // Por agora, apenas registamos na base de dados
  console.log(`[WhatsApp] Mensagem enfileirada: ${payload.messageType} para ${normalizedPhone}`);

  return { sent: true, messageId: plainMessage.id };
};

// Enviar WhatsApp de desembolso
export const sendDisbursementWhatsApp = async (params: {
  companyId: number;
  loanId: number;
  accountNumber: string | number;
  amount: number;
  installments: number;
  firstDueDate?: string | null;
}) => {
  const customer = await getCustomer(params.companyId, params.accountNumber);
  if (!customer) return { sent: false, reason: "customer_not_found" };

  const msg = `Ola ${customer.customerName}. Seu credito de ${Number(params.amount).toLocaleString("pt-MZ")} MZN foi desembolsado. Parcelas: ${params.installments}. ${params.firstDueDate ? `Vence: ${params.firstDueDate}.` : ''} Obrigado.`;

  return sendWhatsAppMessage({
    companyId: params.companyId,
    accountNumber: params.accountNumber,
    phone: customer.customerPhone,
    messageType: "loan_disbursement",
    messageBody: msg,
    payloadJson: {
      loan_id: params.loanId,
      amount: params.amount,
      installments: params.installments,
    },
  });
};

// Enviar WhatsApp de pagamento
export const sendPaymentWhatsApp = async (params: {
  companyId: number;
  accountNumber: string | number;
  paidAmount: number;
  reference?: string;
}) => {
  const customer = await getCustomer(params.companyId, params.accountNumber);
  if (!customer) return { sent: false, reason: "customer_not_found" };

  const msg = `Ola ${customer.customerName}. Pagamento de ${Number(params.paidAmount).toLocaleString("pt-MZ")} MZN confirmado. Ref: ${params.reference || "N/A"}. Obrigado.`;

  return sendWhatsAppMessage({
    companyId: params.companyId,
    accountNumber: params.accountNumber,
    phone: customer.customerPhone,
    messageType: "installment_payment",
    messageBody: msg,
    payloadJson: {
      paid_amount: params.paidAmount,
      reference: params.reference,
    },
  });
};

// Enviar WhatsApp de lembrete
export const sendReminderWhatsApp = async (params: {
  companyId: number;
  accountNumber: string | number;
  installmentAmount: number;
  dueDate: string;
}) => {
  const customer = await getCustomer(params.companyId, params.accountNumber);
  if (!customer) return { sent: false, reason: "customer_not_found" };

  const msg = `Ola ${customer.customerName}. Sua prestacao de ${Number(params.installmentAmount).toLocaleString("pt-MZ")} MZN vence em ${params.dueDate}. Evite juros facendo o pagamento.`;

  return sendWhatsAppMessage({
    companyId: params.companyId,
    accountNumber: params.accountNumber,
    phone: customer.customerPhone,
    messageType: "upcoming_installment",
    messageBody: msg,
    payloadJson: {
      installment_amount: params.installmentAmount,
      due_date: params.dueDate,
    },
  });
};

// Enviar WhatsApp de redefinicao de senha
export const sendPasswordResetWhatsApp = async (params: {
  companyId: number;
  accountNumber: string | number;
  newPassword: string;
}) => {
  const customer = await getCustomer(params.companyId, params.accountNumber);
  if (!customer) return { sent: false, reason: "customer_not_found" };

  // Buscar nome da empresa
  const company = await CompanyModel.findByPk(params.companyId) as any;
  const companyName = company?.toJSON()?.companyName || 'MBR Microcrédito';

  const msg = `Ola ${customer.customerName}. Sua senha de acesso ao portal da ${companyName} e: ${params.newPassword}. Telefone: ${customer.customerPhone}. Altere apos o primeiro acesso.`;

  return sendWhatsAppMessage({
    companyId: params.companyId,
    accountNumber: params.accountNumber,
    phone: customer.customerPhone,
    messageType: "password_reset",
    messageBody: msg,
    payloadJson: {
      new_password: params.newPassword,
    },
  });
};

// Listar mensagens WhatsApp
export const listWhatsAppMessages = async (filters: {
  companyId?: number;
  accountNumber?: string;
  limit?: number;
}) => {
  const whereClause: any = {};
  if (filters.companyId) whereClause.companyId = filters.companyId;
  if (filters.accountNumber) whereClause.accountNumber = filters.accountNumber;

  const limit = Math.min(500, Math.max(1, filters.limit || 100));

  return WhatsAppModel.findAll({
    where: whereClause,
    order: [["createdAt", "DESC"]],
    limit,
  });
};
