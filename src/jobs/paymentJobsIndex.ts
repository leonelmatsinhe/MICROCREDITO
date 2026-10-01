import { startLateAccrualJob } from "./accrueLateJob";

/**
 * ARRANQUE DOS JOBS DO MÓDULO DE PAGAMENTOS V2.
 * Chamado no bootstrap do app.ts. Devolve os timers criados para shutdown
 * limpo (clearInterval em.SIGTERM, se aplicável).
 */
export const startPaymentJobs = (): NodeJS.Timeout[] => {
  const timers: NodeJS.Timeout[] = [];
  try {
    timers.push(startLateAccrualJob());
    console.log("[Jobs] Late accrual de mora agendado (janela 00:05, catch-up horário)");
  } catch (error: any) {
    console.error("[Jobs] Falha ao agendar accrual de mora:", error?.message || error);
  }
  return timers;
};
