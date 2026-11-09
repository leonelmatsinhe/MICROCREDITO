import { UserModel } from "../database/models/UserModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { SmsQueueModel } from "../database/models/SmsQueueModel";
import { bulkSmsToInternational } from "./BulkSmsProvider";

const safeMoney = (value: any): string =>
  Number(value || 0).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).replace(/[\u00A0\u202F]/g, ".");

/**
 * Enfileira SMS diretamente para um membro da equipa (Admin ou Gestor)
 */
export const enqueueStaffSms = async (params: {
  companyId: number;
  staffUserId?: number | null;
  phone: string;
  messageType: string;
  messageBody: string;
  payloadJson?: Record<string, any>;
}) => {
  try {
    const internationalPhone = bulkSmsToInternational(params.phone);
    if (!internationalPhone) return { created: false, reason: "invalid_staff_phone" };

    const record = await SmsQueueModel.create({
      companyId: params.companyId,
      customerId: null,
      phone: internationalPhone,
      messageType: params.messageType,
      messageBody: params.messageBody.trim(),
      payloadJson: params.payloadJson ? JSON.stringify(params.payloadJson) : null,
      status: "queued",
    });

    return { created: true, id: (record as any).id };
  } catch (error: any) {
    console.error("[StaffSmsAlert] Erro ao enfileirar SMS para staff:", error?.message || error);
    return { created: false, error: error?.message };
  }
};

/**
 * Alerta ao Gestor de Crédito quando um mutuário da sua carteira paga via M-Pesa
 */
export const enqueueStaffMpesaPaymentAlert = async (params: {
  companyId: number;
  customerId: number;
  loanId: number;
  customerName: string;
  amount: number;
  installmentOrder: number | string;
  mpesaReceipt: string;
  remainingBalance: number;
}) => {
  try {
    // Buscar o gestor responsável por este cliente (campo assignedUserId ou similar)
    const customer: any = await CustomerModel.findByPk(params.customerId, { raw: true });
    let gestor: any = null;

    if (customer?.assignedUserId) {
      gestor = await UserModel.findByPk(Number(customer.assignedUserId), { raw: true });
    }

    // Se o cliente não tiver gestor atribuído, envia para os gestores da empresa ou para o Admin
    if (!gestor || !gestor.phone) {
      gestor = await UserModel.findOne({
        where: { companyId: params.companyId, userRole: 3 },
        order: [["id", "ASC"]],
        raw: true,
      });
    }

    if (!gestor || !gestor.phone) return { created: false, reason: "no_gestor_phone" };

    const body = `Mais Mola Alerta Gestor: Mutuario ${params.customerName} liquidou prestacao ${params.installmentOrder} (${safeMoney(params.amount)} MZN) via M-Pesa. Recibo: ${params.mpesaReceipt}. Saldo: ${safeMoney(params.remainingBalance)} MZN.`;

    return await enqueueStaffSms({
      companyId: params.companyId,
      staffUserId: Number(gestor.id),
      phone: gestor.phone,
      messageType: "staff_mpesa_payment_alert",
      messageBody: body,
      payloadJson: params,
    });
  } catch (error: any) {
    console.error("[StaffSmsAlert] Falha no alerta de pagamento para o gestor:", error?.message || error);
    return { created: false, error: error?.message };
  }
};

/**
 * Alerta ao Gestor e Admin quando um novo pedido de crédito é submetido pelo mutuário
 */
export const enqueueStaffNewLoanRequestAlert = async (params: {
  companyId: number;
  customerId: number;
  loanId: number;
  customerName: string;
  amount: number;
  installments: number;
}) => {
  try {
    const customer: any = await CustomerModel.findByPk(params.customerId, { raw: true });
    let targetPhone = "";
    let staffId = null;

    if (customer?.assignedUserId) {
      const gestor: any = await UserModel.findByPk(Number(customer.assignedUserId), { raw: true });
      if (gestor?.phone) {
        targetPhone = gestor.phone;
        staffId = gestor.id;
      }
    }

    // Se não encontrou gestor, envia para o Admin da empresa
    if (!targetPhone) {
      const admin: any = await UserModel.findOne({
        where: { companyId: params.companyId, userRole: 1 },
        raw: true,
      });
      if (admin?.phone) {
        targetPhone = admin.phone;
        staffId = admin.id;
      }
    }

    if (!targetPhone) return { created: false, reason: "no_staff_phone" };

    const body = `Mais Mola Alerta: Novo pedido de credito (#${params.loanId}) de ${safeMoney(params.amount)} MZN submetido no portal por ${params.customerName} (${params.installments} parcelas). Aguarda analise.`;

    return await enqueueStaffSms({
      companyId: params.companyId,
      staffUserId: staffId,
      phone: targetPhone,
      messageType: "staff_new_loan_request",
      messageBody: body,
      payloadJson: params,
    });
  } catch (error: any) {
    console.error("[StaffSmsAlert] Falha no alerta de novo crédito:", error?.message || error);
    return { created: false, error: error?.message };
  }
};

/**
 * Alerta ao Admin para aprovação e desembolso de crédito
 */
export const enqueueAdminPendingApprovalAlert = async (params: {
  companyId: number;
  loanId: number;
  customerName: string;
  amount: number;
  gestorName?: string;
}) => {
  try {
    const admin: any = await UserModel.findOne({
      where: { companyId: params.companyId, userRole: 1 },
      raw: true,
    });

    if (!admin || !admin.phone) return { created: false, reason: "no_admin_phone" };

    const gestorInfo = params.gestorName ? ` pelo Gestor ${params.gestorName}` : "";
    const body = `Mais Mola Admin: Credito #${params.loanId} de ${safeMoney(params.amount)} MZN submetido${gestorInfo} para ${params.customerName}. Aguarda sua aprovacao e desembolso.`;

    return await enqueueStaffSms({
      companyId: params.companyId,
      staffUserId: Number(admin.id),
      phone: admin.phone,
      messageType: "admin_loan_approval_alert",
      messageBody: body,
      payloadJson: params,
    });
  } catch (error: any) {
    console.error("[StaffSmsAlert] Falha no alerta de aprovação p/ Admin:", error?.message || error);
    return { created: false, error: error?.message };
  }
};

/**
 * Resumo Diário Executivo de Fecho para o Administrador (enviado às 18:30)
 */
export const enqueueAdminDailyExecutiveClose = async (params: {
  companyId: number;
  totalCollectedMpesa: number;
  txCountMpesa: number;
  totalDisbursed: number;
  disbursedCount: number;
  overdueCount: number;
}) => {
  try {
    const admin: any = await UserModel.findOne({
      where: { companyId: params.companyId, userRole: 1 },
      raw: true,
    });

    if (!admin || !admin.phone) return { created: false, reason: "no_admin_phone" };

    const todayStr = new Date().toLocaleDateString("pt-MZ");
    const body = `Mais Mola Fecho ${todayStr}: M-Pesa arrecadado: ${safeMoney(params.totalCollectedMpesa)} MZN (${params.txCountMpesa} txs). Desembolsado: ${safeMoney(params.totalDisbursed)} MZN (${params.disbursedCount}). Parcelas em mora: ${params.overdueCount}.`;

    return await enqueueStaffSms({
      companyId: params.companyId,
      staffUserId: Number(admin.id),
      phone: admin.phone,
      messageType: "admin_daily_close_summary",
      messageBody: body,
      payloadJson: params,
    });
  } catch (error: any) {
    console.error("[StaffSmsAlert] Falha no resumo diário executivo:", error?.message || error);
    return { created: false, error: error?.message };
  }
};
