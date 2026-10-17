/**
 * TESTE DE REGRESSÃO — BASE DOS JUROS DE MORA
 *
 * Regra de negócio (2026-10): a mora diária é calculada sobre o SALDO DEVEDOR
 * da prestação (installment − paidAmount), NUNCA sobre o valor integral
 * quando o cliente já pagou parte. Um pagamento parcial reduz imediatamente a
 * base e, por consequência, o total de mora exigível.
 *
 * Runner próprio (o projecto não tem test-runner):
 *   npx ts-node --transpile-only src/tests/lateInterestBase.test.ts
 *
 * Não toca na base de dados: cobre apenas as funções puras do motor de mora.
 */
import {
  lateInterestOnOutstanding,
  cappedDays,
  PenaltyRule,
} from "../services/lateInterestService";
import { installmentPanification } from "../utils/calculateLateAmount";
import { round2 } from "../utils/money";

// ── Mini-runner ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

const test = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error: any) {
    failed += 1;
    failures.push(`${name}: ${error?.message}`);
    console.error(`  ✗ ${name}\n    ${error?.message}`);
  }
};

const assertEqual = (actual: any, expected: any, label = "") => {
  if (actual !== expected) {
    throw new Error(`${label} esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`);
  }
};

const rule = (overrides: Partial<PenaltyRule> = {}): PenaltyRule => ({
  forfeit_percent: 1, // 1%/dia
  grace_days: 0,
  cap_percent: 100,
  base: "INSTALLMENT",
  business_days_only: false,
  max_late_days: 0,
  ...overrides,
});

// ── Fórmula base ────────────────────────────────────────────────────────────
console.log("\nMora sobre o saldo devedor (lateInterestOnOutstanding)");

test("prestação por pagar na totalidade: base = prestação", () => {
  const mora = lateInterestOnOutstanding({
    installmentValue: 1000,
    paidAmount: 0,
    daysLate: 10,
    rule: rule(),
  });
  assertEqual(mora, 100);
});

test("pagamento parcial: base = saldo devedor (400 pagos → base 600)", () => {
  const mora = lateInterestOnOutstanding({
    installmentValue: 1000,
    paidAmount: 400,
    daysLate: 10,
    rule: rule(),
  });
  assertEqual(mora, 60, "mora com saldo de 600 a 1%/dia por 10 dias:");
});

test("pagamento parcial NÃO usa o valor integral da prestação", () => {
  const comSaldo = lateInterestOnOutstanding({
    installmentValue: 1000,
    paidAmount: 400,
    daysLate: 10,
    rule: rule(),
  });
  const comIntegral = lateInterestOnOutstanding({
    installmentValue: 1000,
    paidAmount: 0,
    daysLate: 10,
    rule: rule(),
  });
  assertEqual(comSaldo === comIntegral, false, "as duas bases devem diferir:");
  assertEqual(comSaldo, 60);
});

test("saldo devedor zero → mora zero", () => {
  const mora = lateInterestOnOutstanding({
    installmentValue: 1000,
    paidAmount: 1000,
    daysLate: 30,
    rule: rule(),
  });
  assertEqual(mora, 0);
});

test("pagamento superior à prestação nunca gera base negativa", () => {
  const mora = lateInterestOnOutstanding({
    installmentValue: 1000,
    paidAmount: 1500,
    daysLate: 30,
    rule: rule(),
  });
  assertEqual(mora, 0);
});

test("forfeit 0 → mora inválida (0)", () => {
  const mora = lateInterestOnOutstanding({
    installmentValue: 1000,
    paidAmount: 200,
    daysLate: 30,
    rule: rule({ forfeit_percent: 0 }),
  });
  assertEqual(mora, 0);
});

test("cap aplica-se ao saldo devedor, não à prestação original", () => {
  // base 600, 100 dias a 1% = 600; cap 5% → 30 (com base 1000 seria 50)
  const mora = lateInterestOnOutstanding({
    installmentValue: 1000,
    paidAmount: 400,
    daysLate: 100,
    rule: rule({ cap_percent: 5 }),
  });
  assertEqual(mora, 30);
});

test("max_late_days limita os dias contados", () => {
  const dias = cappedDays(90, rule({ max_late_days: 30 }));
  assertEqual(dias, 30);
  assertEqual(cappedDays(10, rule({ max_late_days: 30 })), 10);
  assertEqual(cappedDays(90, rule({ max_late_days: 0 })), 90);
});

test("arredondamento a 2 casas (saldo 833,33 a 1,5%/dia por 7 dias)", () => {
  const mora = lateInterestOnOutstanding({
    installmentValue: 1233.33,
    paidAmount: 400,
    daysLate: 7,
    rule: rule({ forfeit_percent: 1.5 }),
  });
  assertEqual(mora, round2(833.33 * 0.015 * 7));
});

// ── Plano de amortização (installmentPanification) ──────────────────────────
console.log("\nPlano de amortização com pagamento parcial");

const plan = installmentPanification(
  [
    {
      id: 1,
      loanId: 10,
      installmentOrder: 1,
      accountNumber: 900001,
      amortization: 800,
      rateAmount: 200,
      installment: 1000,
      paidAmount: 400,
      dueDate: "2026-01-01",
      status: -1,
    },
    {
      id: 2,
      loanId: 10,
      installmentOrder: 2,
      accountNumber: 900001,
      amortization: 800,
      rateAmount: 200,
      installment: 1000,
      paidAmount: 0,
      dueDate: "2026-01-01",
      status: 0,
    },
  ],
  1, // 1%/dia
  "2026-01-11",
  { maxLateDays: 0, capPercent: 100 }
);

test("prestação parcialmente paga: mora sobre o saldo (600 → 60)", () => {
  assertEqual(plan[0].latePaymentInterest, 60);
  assertEqual(plan[0].paidAmount, 400);
});

test("prestação por pagar: mora sobre o valor integral (1000 → 100)", () => {
  assertEqual(plan[1].latePaymentInterest, 100);
});

test("saldo devedor do plano vem do capital amortizado e fecha em 0 na última linha", () => {
  assertEqual(plan[0].remainingBalance, 800);
  assertEqual(plan[1].remainingBalance, 0);
});

test("prestação paga (status 1) não gera mora", () => {
  const pago = installmentPanification(
    [{
      id: 3,
      loanId: 10,
      installmentOrder: 3,
      accountNumber: 900001,
      amortization: 1000,
      rateAmount: 0,
      installment: 1000,
      paidAmount: 1000,
      dueDate: "2026-01-01",
      status: 1,
    }],
    1,
    "2026-02-01",
    { maxLateDays: 0, capPercent: 100 }
  );
  assertEqual(pago[0].latePaymentInterest, 0);
});

// ── Resultado ───────────────────────────────────────────────────────────────
console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) {
  console.error("\nFalhas:");
  failures.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}
console.log("Mora auditada: base = SALDO DEVEDOR da prestação.");
