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
 */

export type PenaltyRule = {
  forfeit_percent: number;
  grace_days: number;
  cap_percent: number;
  base: "INSTALLMENT" | "OUTSTANDING_BALANCE";
  business_days_only: boolean;
};

/** Lê a regra de mora da empresa; fallback = companies.forfeit (legado). */
export const getPenaltyRule = async (companyId: number): Promise<PenaltyRule> => {
  try {
    const [rows]: any = await db.query(
      "SELECT forfeit_percent, grace_days, cap_percent, base, business_days_only FROM company_penalty_rules WHERE company_id = ? LIMIT 1",
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
 * Respeita a base configurada: prestação integral OU saldo em falta.
 */
export const dailyAccrualAmount = (params: {
  installmentValue: number;
  outstandingBalance: number;
  dueDate: string;
  accrualDate: string;
  rule: PenaltyRule;
}): { days: number; baseAmount: number; amount: number } => {
  const { installmentValue, outstandingBalance, dueDate, accrualDate, rule } = params;
  const days = effectiveLateDays(dueDate, accrualDate, rule);
  if (days <= 0) return { days: 0, baseAmount: 0, amount: 0 };

  const baseAmount =
    rule.base === "OUTSTANDING_BALANCE"
      ? round2(Math.max(0, outstandingBalance))
      : round2(Math.max(0, installmentValue));
  if (baseAmount <= 0) return { days: 0, baseAmount: 0, amount: 0 };

  // Mora acumulada até ao dia anterior (para respeitar o cap)
  const daily = round2(baseAmount * (rule.forfeit_percent / 100));

  return { days: 1, baseAmount, amount: daily };
};

/**
 * Total de mora ACCRUED (não cobrada) de uma prestação até uma data.
 * Se existirem accruals, devolve a soma; se não, calcula pela fórmula
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
      `SELECT SUM(amount) AS total, MAX(days) AS max_days, COUNT(*) AS n
         FROM late_accruals WHERE amortization_loan_id = ? AND status = 'ACCRUED'`,
      { replacements: [amortizationLoanId] }
    );
    const row = (rows as any[])[0] || {};
    const nAccruals = Number(row.n) || 0;
    if (nAccruals > 0) {
      let total = num(row.total);
      // Accruals ainda não cobrem a data de referência? completa por fórmula
      // proporcional ao número de dias em falta (job corre 1×/dia).
      const maxDays = Number(row.max_days) || 0;
      const daysLate = effectiveLateDays(dueDate, ref, rule);
      if (daysLate > maxDays) {
        const baseAmount =
          rule.base === "OUTSTANDING_BALANCE"
            ? round2(Math.max(0, installmentValue - paidAmount))
            : round2(Math.max(0, installmentValue));
        const daily = round2(baseAmount * (rule.forfeit_percent / 100));
        total = round2(total + daily * (daysLate - maxDays));
      }
      // Aplica o cap
      const baseCap =
        rule.base === "OUTSTANDING_BALANCE"
          ? round2(Math.max(0, installmentValue - paidAmount))
          : round2(Math.max(0, installmentValue));
      const cap = round2(baseCap * (rule.cap_percent / 100));
      return { amount: Math.min(round2(total), cap), daysLate: Math.max(maxDays, effectiveLateDays(dueDate, ref, rule)), source: "accruals" };
    }
  } catch { /* tabela ausente → fórmula */ }

  // 2) Fórmula ao vivo (legado compatível)
  const daysLate = effectiveLateDays(dueDate, ref, rule);
  if (daysLate <= 0) return { amount: 0, daysLate: 0, source: "formula" };
  const baseAmount =
    rule.base === "OUTSTANDING_BALANCE"
      ? round2(Math.max(0, installmentValue - paidAmount))
      : round2(Math.max(0, installmentValue));
  const raw = round2(baseAmount * (rule.forfeit_percent / 100) * daysLate);
  const cap = round2(baseAmount * (rule.cap_percent / 100));
  return { amount: Math.min(raw, cap), daysLate, source: "formula" };
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
        const days = effectiveLateDays(dueDate, today, rule);
        if (days <= 0) { skipped += 1; continue; }

        const baseAmount =
          rule.base === "OUTSTANDING_BALANCE"
            ? round2(Math.max(0, num(inst.installment) - num(inst.paidAmount)))
            : round2(Math.max(0, num(inst.installment)));
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
