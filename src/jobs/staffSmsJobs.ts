import { Op } from "sequelize";
import { CompanyModel } from "../database/models/CompanyModel";
import { UserModel } from "../database/models/UserModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { LoanModel } from "../database/models/LoanModel";
import { MpesaTransactionModel } from "../database/models/MpesaTransactionModel";
import {
  enqueueStaffSms,
  enqueueAdminDailyExecutiveClose,
} from "../services/StaffSmsAlertService";
import { queryMpesaTransactionStatus } from "../services/MpesaOpenApiService";

const safeMoney = (value: any): string =>
  Number(value || 0).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).replace(/[\u00A0\u202F]/g, ".");

/**
 * Resumo matinal das 07:30 para os Gestores de Crédito:
 * Número de prestações a vencer hoje e total a cobrar da sua carteira.
 */
export const runMorningGestorSummariesJob = async () => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const companies: any[] = (await CompanyModel.findAll({ attributes: ["id"] })) as any[];

    for (const comp of companies) {
      const companyId = Number(comp.id);
      const gestores: any[] = (await UserModel.findAll({
        where: { companyId, userRole: 3 },
        raw: true,
      })) as any[];

      for (const gestor of gestores) {
        if (!gestor.phone) continue;

        // Prestações que vencem hoje associadas aos empréstimos do gestor
        const loans: any[] = (await LoanModel.findAll({
          where: { companyId, creditManager: gestor.id },
          attributes: ["id"],
          raw: true,
        })) as any[];

        const loanIds = loans.map((l: any) => Number(l.id));
        if (loanIds.length === 0) continue;

        const dueToday: any[] = (await AmorizationLoanModel.findAll({
          where: {
            companyId,
            loanId: { [Op.in]: loanIds },
            dueDate: todayStr,
            status: { [Op.ne]: 1 },
          },
          attributes: ["id", "installment", "paidAmount"],
          raw: true,
        })) as any[];

        if (dueToday.length === 0) continue;

        const totalDueToday = dueToday.reduce((sum, item) => {
          const rem = Math.max(0, Number(item.installment || 0) - Number(item.paidAmount || 0));
          return sum + rem;
        }, 0);

        const body = `Bom dia ${gestor.name}. Hoje tem ${dueToday.length} prestacao(oes) a vencer na sua carteira, totalizando ${safeMoney(totalDueToday)} MZN. Bom trabalho!`;

        await enqueueStaffSms({
          companyId,
          staffUserId: Number(gestor.id),
          phone: gestor.phone,
          messageType: "gestor_morning_summary",
          messageBody: body,
          payloadJson: { date: todayStr, totalDue: totalDueToday, count: dueToday.length },
        });
      }
    }
  } catch (error: any) {
    console.error("[StaffSmsJobs] Falha no resumo matinal dos gestores:", error?.message || error);
  }
};

/**
 * Resumo executivo de fecho diário das 18:30 para o Admin da Empresa:
 * Total arrecadado via M-Pesa hoje, total desembolsado e prestações em atraso.
 */
export const runEveningAdminCloseJob = async () => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const companies: any[] = (await CompanyModel.findAll({ attributes: ["id"] })) as any[];

    for (const comp of companies) {
      const companyId = Number(comp.id);

      // Total arrecadado via M-Pesa hoje
      const mpesaTxs: any[] = (await TranzactionModel.findAll({
        where: {
          companyId,
          paymentDate: todayStr,
          paymentMethod: 7, // M-Pesa
        },
        attributes: ["amount", "latePaymentInterest"],
        raw: true,
      })) as any[];

      const totalMpesa = mpesaTxs.reduce(
        (sum, tx) => sum + Number(tx.amount || 0) + Number(tx.latePaymentInterest || 0),
        0
      );

      // Desembolsos realizados hoje
      const disbursements: any[] = (await LoanModel.findAll({
        where: {
          companyId,
          dateCreated: todayStr,
          status: 1, // Desembolsado
        },
        attributes: ["amount"],
        raw: true,
      })) as any[];

      const totalDisbursed = disbursements.reduce(
        (sum, loan) => sum + Number(loan.amount || 0),
        0
      );

      // Prestações com atraso activo
      const overdueCount = await AmorizationLoanModel.count({
        where: {
          companyId,
          status: { [Op.ne]: 1 },
          dueDate: { [Op.lt]: todayStr },
        },
      });

      await enqueueAdminDailyExecutiveClose({
        companyId,
        totalCollectedMpesa: totalMpesa,
        txCountMpesa: mpesaTxs.length,
        totalDisbursed,
        disbursedCount: disbursements.length,
        overdueCount,
      });
    }
  } catch (error: any) {
    console.error("[StaffSmsJobs] Falha no fecho executivo do Admin:", error?.message || error);
  }
};

/**
 * Verificação automática de transações M-Pesa pendentes (Anti-abandono):
 * A cada 2 minutos, busca transações em PENDING_PIN com mais de 3 minutos
 * e consulta ativamente o status na Vodacom para auto-liquidação.
 */
export const verifyPendingMpesaTransactionsJob = async () => {
  try {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pendingList: any[] = (await MpesaTransactionModel.findAll({
      where: {
        status: "PENDING_PIN",
        createdAt: {
          [Op.between]: [twentyFourHoursAgo, threeMinutesAgo],
        },
        queryCount: { [Op.lt]: 5 },
      },
      limit: 10,
    })) as any[];

    for (const tx of pendingList) {
      try {
        await queryMpesaTransactionStatus(Number(tx.id));
      } catch (err: any) {
        console.warn(`[M-Pesa AutoReconcile] Falha ao verificar tx ${tx.id}:`, err?.message || err);
      }
    }
  } catch (error: any) {
    console.error("[StaffSmsJobs] Erro na auto-reconciliação M-Pesa:", error?.message || error);
  }
};

/**
 * Inicialização e agendamento dos Jobs de Staff e Reconciliação
 */
export const startStaffAndMpesaJobs = () => {
  // 1. Auto-reconciliação de transações M-Pesa a cada 2 minutos
  setInterval(() => {
    verifyPendingMpesaTransactionsJob().catch(() => {});
  }, 2 * 60 * 1000);

  // 2. Agendamento diário das 07:30 (Resumo Gestores) e 18:30 (Fecho Admin)
  const scheduleDailyJobs = () => {
    const now = new Date();

    // 07:30
    const morningTarget = new Date();
    morningTarget.setHours(7, 30, 0, 0);
    if (morningTarget <= now) morningTarget.setDate(morningTarget.getDate() + 1);

    setTimeout(() => {
      runMorningGestorSummariesJob().catch(() => {});
      setInterval(() => {
        runMorningGestorSummariesJob().catch(() => {});
      }, 24 * 60 * 60 * 1000);
    }, morningTarget.getTime() - now.getTime());

    // 18:30
    const eveningTarget = new Date();
    eveningTarget.setHours(18, 30, 0, 0);
    if (eveningTarget <= now) eveningTarget.setDate(eveningTarget.getDate() + 1);

    setTimeout(() => {
      runEveningAdminCloseJob().catch(() => {});
      setInterval(() => {
        runEveningAdminCloseJob().catch(() => {});
      }, 24 * 60 * 60 * 1000);
    }, eveningTarget.getTime() - now.getTime());
  };

  scheduleDailyJobs();
  console.log("[StaffSmsJobs] Jobs de Staff (07:30 / 18:30) e Reconciliação M-Pesa (2m) activos.");
};
