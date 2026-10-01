import { runLateAccrualJob } from "../services/lateInterestService";

/**
 * JOB DE ACCRUAL DIÁRIO DE MORA — lateInterestService.runLateAccrualJob.
 *
 * Corre todos os dias na janela 00:00–00:59 (alvo 00:05). O tick é horário:
 * se o servidor estiver desligado à meia-noite, faz catch-up na primeira
 * hora em que ligar (uma execução por dia, garantida pela data).
 *
 * Idempotência: a tabela late_accruals tem UNIQUE(amortization_loan_id,
 * accrual_date) e o job usa INSERT IGNORE — correr 2× no mesmo dia não
 * duplica mora.
 */

// Data de hoje no fuso do servidor (YYYY-MM-DD).
const todayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// Hora local HH:MM.
const nowHHMM = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

let lastRunDate = "";

const tick = async (): Promise<void> => {
  const today = todayKey();
  if (lastRunDate === today) return; // já correu hoje

  const hhmm = nowHHMM();
  // Janela normal (00:00–00:59) OU catch-up fora da janela (servidor ligou
  // tarde) — em ambos os casos corre 1×/dia, pois o job é idempotente.
  const inWindow = hhmm >= "00:00" && hhmm <= "00:59";
  if (!inWindow && lastRunDate !== "" && lastRunDate !== today) {
    // fora da janela mas ainda não correu hoje → catch-up permitido
  } else if (!inWindow) {
    return;
  }

  try {
    const result = await runLateAccrualJob();
    lastRunDate = today;
    console.log(
      `[LateAccrualJob] mora diária: ${result.created} criado(s), ${result.skipped} ignorado(s), ${result.errors} erro(s) em ${result.processed} prestação(ões).`
    );
  } catch (error: any) {
    console.error("[LateAccrualJob] Falha no accrual de mora:", error?.message || error);
  }
};

/** Arranca o timer horário do accrual. Devolve o timer para shutdown limpo. */
export const startLateAccrualJob = (): NodeJS.Timeout => {
  // 1.ª execução suave no arranque (catch-up se o servidor esteve off à meia-noite)
  setTimeout(() => { tick().catch(() => {}); }, 15_000);
  return setInterval(() => { tick().catch(() => {}); }, 60 * 60 * 1000);
};
