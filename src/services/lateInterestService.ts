import moment from "moment";
import { Op } from "sequelize";
import { db } from "../database/db";
import { round2, num } from "../utils/money";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";

/**
 * MOTOR DE MORA V2 — regras por empresa (company_penalty_rules) + accrual
 * diário (late_accruals). Mantém compatibilidade total com o legado:
 * - Sem regra na empresa → usa companies.forfeit (1%/dia sobre a prestação).
 * - Sem accruals registados → calcula por fórmula (comportamento actual).
 *
 * Fórmula diária: base × (forfeit_percent/100) por dia de atraso efectivo.
 * Atraso efectivo = max(0, diasEntre(dueDate, dataReferência) − grace_days).
 * Cap: mora acumulada nunca passa cap_percent da base.
 *
 * REGRAS DE NEGÓCIO (2026-10):
 * - A base da mora é SEMPRE o saldo devedor da prestação (installment −
 *   paidAmount). Pagamento parcial reduz a mora dos dias seguintes — a coluna
 *   `base` da tabela é mantida por compatibilidade mas é IGNORADA.
 * - max_late_days > 0 → a mora CESSA após N dias de atraso.
 * - forfeit_percent = 0 → mora INVÁLIDA/desactivada para a empresa.
 */

export type PenaltyRule = {
  forfeit_percent: number;
  grace_days: number;
  cap_percent: number;
  base: "INSTALLMENT" | "OUTSTANDING_BALANCE";
  business_days_only: boolean;
  /** 0 ou NULL = sem limite de dias de mora; > 0 = mora cessa após N dias. */
  max_late_days: number;
};

/**
 * Base de cálculo da mora = SALDO DEVEDOR da prestação (nunca o valor
 * integral quando há pagamento parcial).
 */
const outstandingBase = (installmentValue: number, paidAmount: number): number =>
  round2(Math.max(0, round2(num(installmentValue)) - round2(num(paidAmount))));

/** Limita os dias de atraso ao máximo configurado (0/NULL = ilimitado). */
export const cappedDays = (days: number, rule: PenaltyRule): number =>
  rule.max_late_days > 0 ? Math.min(days, rule.max_late_days) : days;

/**
 * Mora devida hoje com base no SALDO DEVEDOR ACTUAL da prestação.
 *
 * É a ÚNICA fórmula usada para decidir quanto o cliente deve de mora:
 * tanto o caminho de accruals como o caminho de fórmula passam por aqui,
 * pelo que um pagamento parcial reduz imediatamente a base (e o total
 * exigível) — nunca se cobra sobre o valor integral da prestação.
 *
 * forfeit_percent = 0 → mora inválida (0); cap_percent limita a mora ao
 * saldo devedor, não ao valor original da prestação.
 */
export const lateInterestOnOutstanding = (params: {
  installmentValue: number;
  paidAmount: number;
  daysLate: number;
  rule: PenaltyRule;
}): number => {
  const { installmentValue, paidAmount, daysLate, rule } = params;
  if (Number(daysLate) <= 0 || rule.forfeit_percent <= 0) return 0;

  const baseAmount = outstandingBase(installmentValue, paidAmount);
  if (baseAmount <= 0) return 0;

  const raw = round2(baseAmount * (rule.forfeit_percent / 100) * Number(daysLate));
  const cap = round2(baseAmount * (rule.cap_percent / 100));
  return Math.min(raw, cap);
};

/** Lê a regra de mora da empresa; fallback = companies.forfeit (legado). */
export const getPenaltyRule = async (companyId: number): Promise<PenaltyRule> => {
  try {
    const [rows]: any = await db.query(
      "SELECT forfeit_percent, grace_days, cap_percent, base, business_days_only, max_late_days FROM company_penalty_rules WHERE company_id = ? LIMIT 1",
      { replacements: [companyId] }
    );
    const rule = (rows as any[])[0];
    if (rule) {
      return {
        forfeit_percent: num(rule.forfeit_percent),
        grace_days: Math.max(0, Number(rule.grace_days) || 0),
        cap_percent: num(rule.cap_percent) || 100,
        base: String(rule.base) === "OUTSTANDING_BALANCE" ? "OUTSTANDING_BALANCE" : "INSTALLMENT",
        business_days_only: !!Number(rule.business_days_only),
        max_late_days: Math.max(0, Number(rule.max_late_days) || 0),
      };
    }
  } catch { /* tabela ainda não migrada → segue legado */ }

  // Legado: companies.forfeit (percentagem/dia sobre a prestação integral)
  const [companyRows]: any = await db.query(
    "SELECT forfeit FROM companies WHERE id = ? LIMIT 1",
    { replacements: [companyId] }
  );
  return {
    forfeit_percent: num((companyRows as any[])[0]?.forfeit) || 0,
    grace_days: 0,
    cap_percent: 100,
    base: "INSTALLMENT",
    business_days_only: false,
    max_late_days: 0,
  };
};

/**
 * Parâmetros prontos para a fórmula legada (installmentPanification):
 * substitui companies.forfeit e propaga os limites de invalidação/limitação
 * (dias máximos + cap) para todos os cálculos legados.
 */
export const getLegacyPenaltyParams = async (
  companyId: number
): Promise<{ forfeit: number; maxLateDays: number; capPercent: number }> => {
  const rule = await getPenaltyRule(companyId);
  return {
    forfeit: rule.forfeit_percent,
    maxLateDays: rule.max_late_days,
    capPercent: rule.cap_percent,
  };
};

/**
 * Dias de atraso efectivos (desconta carência; opcionalmente só dias úteis).
 * Business days: conta seg-sex entre dueDate e a data de referência.
 */
export const effectiveLateDays = (
  dueDate: string,
  referenceDate: string,
  rule: PenaltyRule
): number => {
  const due = moment(String(dueDate).slice(0, 10), "YYYY-MM-DD");
  const ref = moment(String(referenceDate).slice(0, 10), "YYYY-MM-DD");
  if (!due.isValid() || !ref.isValid() || ref.diff(due, "days") <= 0) return 0;

  if (!rule.business_days_only) {
    return Math.max(0, ref.diff(due, "days") - rule.grace_days);
  }
  // Dias úteis: conta dias seg-sex estritamente após a carência
  let businessDays = 0;
  let cursor = due.clone().add(1, "day");
  let counted = 0;
  while (cursor.isBefore(ref) || cursor.isSame(ref, "day")) {
    const dow = cursor.day(); // 0 dom, 6 sáb
    if (dow !== 0 && dow !== 6) {
      counted += 1;
      if (counted > rule.grace_days) businessDays += 1;
    }
    cursor.add(1, "day");
  }
  return businessDays;
};

/**
 * Mora diária do dia D para uma prestação (usada pelo job de accrual).
 * Base = SALDO DEVEDOR (installment − paidAmount), nunca o valor integral.
 */
export const dailyAccrualAmount = (params: {
  installmentValue: number;
  paidAmount: number;
  dueDate: string;
  accrualDate: string;
  rule: PenaltyRule;
}): { days: number; baseAmount: number; amount: number } => {
  const { installmentValue, paidAmount, dueDate, accrualDate, rule } = params;
  const rawDays = effectiveLateDays(dueDate, accrualDate, rule);
  if (rawDays <= 0) return { days: 0, baseAmount: 0, amount: 0 };

  // Base = SALDO DEVEDOR (pagamento parcial reduz a mora futura)
  const baseAmount = outstandingBase(installmentValue, paidAmount);
  if (baseAmount <= 0) return { days: 0, baseAmount: 0, amount: 0 };

  // Dias de atraso ao alcance do limite + mora diária
  const days = 1;
  const daily = round2(baseAmount * (rule.forfeit_percent / 100));

  return { days, baseAmount, amount: daily };
};

/**
 * Total de mora ACCRUED (não cobrada) de uma prestação até uma data.
 *
 * Se existirem accruals até à data de referência, devolve a soma completada
 * com os dias em falta — mas SEMPRE limitada à fórmula sobre o saldo devedor
 * actual (installment − paidAmount). Se não existirem, calcula pela fórmula
 * (compatibilidade com prestações antigas sem accrual diário).
 */
export const getAccruedLateInterest = async (params: {
  amortizationLoanId: number;
  installmentValue: number;
  paidAmount: number;
  dueDate: string;
  companyId: number;
  referenceDate?: string;
}): Promise<{ amount: number; daysLate: number; source: "accruals" | "formula" }> => {
  const { amortizationLoanId, installmentValue, paidAmount, dueDate, companyId, referenceDate } = params;
  const ref = String(referenceDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const rule = await getPenaltyRule(companyId);

  // 1) Tenta pela tabela de accruals (fonte oficial do V2)
  try {
    const [rows]: any = await db.query(
      `SELECT SUM(amount) AS total, COUNT(*) AS n
         FROM late_accruals
        WHERE amortization_loan_id = ? AND status = 'ACCRUED'
          AND accrual_date <= ?`,
      { replacements: [amortizationLoanId, ref] }
    );
    const row = (rows as any[])[0] || {};
    const nAccruals = Number(row.n) || 0;
    if (nAccruals > 0) {
      let total = num(row.total);
      // Cada linha de late_accruals representa UM dia (coluna days = 1).
      // O n.º de dias já cobertos é portanto COUNT(*), nunca MAX(days) — ler
      // MAX(days) dava sempre 1 e voltava a completar todos os dias por
      // fórmula, duplicando a mora cobrada.
      const maxDays = nAccruals;
      const daysLate = cappedDays(effectiveLateDays(dueDate, ref, rule), rule);
      if (daysLate > maxDays) {
        const baseAmount = outstandingBase(installmentValue, paidAmount);
        const daily = round2(baseAmount * (rule.forfeit_percent / 100));
        total = round2(total + daily * (daysLate - maxDays));
      }
      // REGRA DO SALDO DEVEDOR: o acumulado histórico nunca pode exceder a
      // mora calculada sobre o saldo devedor ACTUAL da prestação. Assim que o
      // cliente paga parte da prestação, a base (e a mora exigível) desce —
      // mesmo que os accruals antigos tenham sido gerados sobre um valor maior.
      const maxAllowed = lateInterestOnOutstanding({
        installmentValue,
        paidAmount,
        daysLate,
        rule,
      });
      return {
        amount: Math.min(round2(total), maxAllowed),
        daysLate,
        source: "accruals",
      };
    }
  } catch { /* tabela ausente → fórmula */ }

  // 2) Fórmula ao vivo (legado compatível)
  const rawDays = effectiveLateDays(dueDate, ref, rule);
  const daysLate = cappedDays(rawDays, rule);
  if (daysLate <= 0) return { amount: 0, daysLate: 0, source: "formula" };
  // Base = SALDO DEVEDOR (nunca a prestação integral com pagamento parcial)
  const amount = lateInterestOnOutstanding({ installmentValue, paidAmount, daysLate, rule });
  return { amount, daysLate, source: "formula" };
};

/**
 * JOB DE ACCRUAL — corre todo dia às 00:05.
 * Para cada prestação em atraso (status != 1, dueDate < hoje), insere o
 * accrual do dia (idempotente por UNIQUE(amortization_loan_id, accrual_date)).
 * Devolve resumo para log.
 */
export const runLateAccrualJob = async (): Promise<{
  processed: number; created: number; skipped: number; errors: number;
}> => {
  const today = new Date().toISOString().slice(0, 10);
  let processed = 0, created = 0, skipped = 0, errors = 0;

  try {
    const installments: any[] = await AmorizationLoanModel.findAll({
      where: { status: { [Op.ne]: 1 } },
      raw: true,
    });

    for (const inst of installments) {
      processed += 1;
      try {
        const dueDate = String(inst.dueDate || "").slice(0, 10);
        if (!dueDate || dueDate >= today) { skipped += 1; continue; }

        const rule = await getPenaltyRule(Number(inst.companyId));
        const days = cappedDays(effectiveLateDays(dueDate, today, rule), rule);
        if (days <= 0) { skipped += 1; continue; }

        // Base = SALDO DEVEDOR (pagamento parcial reduz a mora futura)
        const baseAmount = outstandingBase(num(inst.installment), num(inst.paidAmount));
        if (baseAmount <= 0) { skipped += 1; continue; }

        // Cap: não accrue além do cap acumulado
        const [sumRows]: any = await db.query(
          `SELECT COALESCE(SUM(amount),0) AS total FROM late_accruals
            WHERE amortization_loan_id = ? AND status='ACCRUED'`,
          { replacements: [Number(inst.id)] }
        );
        const accrued = num((sumRows as any[])[0]?.total);
        const cap = round2(baseAmount * (rule.cap_percent / 100));
        if (accrued >= cap) { skipped += 1; continue; }

        const daily = round2(baseAmount * (rule.forfeit_percent / 100));
        const amount = round2(Math.min(daily, round2(cap - accrued)));

        const [result]: any = await db.query(
          `INSERT IGNORE INTO late_accruals
             (amortization_loan_id, accrual_date, days, base_amount, rate, amount, status, created_at)
           VALUES (?, ?, 1, ?, ?, ?, 'ACCRUED', NOW())`,
          { replacements: [Number(inst.id), today, baseAmount, rule.forfeit_percent, amount] }
        );
        if (Number(result?.affectedRows) > 0) created += 1; else skipped += 1;
      } catch {
        errors += 1;
      }
    }
  } catch {
    errors += 1;
  }

  return { processed, created, skipped, errors };
};
