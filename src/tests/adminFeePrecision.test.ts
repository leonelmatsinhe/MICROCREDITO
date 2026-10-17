/**
 * TESTE DE REGRESSÃO — TAXA ADMINISTRATIVA (0,01% do capital)
 *
 * O modelo tem de aceitar uma taxa administrativa de 0,01% (fracção 0.0001)
 * sem a arredondar a ZERO — o que acontecia quando a coluna era DECIMAL(15,2)
 * ou quando a UI/número era lido com vírgula ("0,01" → NaN → 0).
 *
 * Runner próprio (o projecto não tem test-runner):
 *   npx ts-node --transpile-only src/tests/adminFeePrecision.test.ts
 *
 * Apenas funções puras — não toca na base de dados.
 */
import {
  ADMIN_FEE_MIN_FRACTION,
  adminFeeAmountOnPrincipal,
  adminFeeFractionToPercent,
  adminFeePercentToFraction,
  formatAdminFeePercent,
  normalizeStoredAdminFee,
  parseAdminFeePayload,
  parseLooseNumber,
  roundAdminFeeFraction,
} from "../utils/adminFee";

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

const assertTrue = (value: any, label = "") => {
  if (!value) throw new Error(`${label} esperado verdadeiro, obtido ${JSON.stringify(value)}`);
};

const assertFalse = (value: any, label = "") => {
  if (value) throw new Error(`${label} esperado falso, obtido ${JSON.stringify(value)}`);
};

console.log("\nLeitura tolerante (vírgula portuguesa)");
test("lê 0,01 como 0.01", () => assertEqual(parseLooseNumber("0,01"), 0.01));
test("lê 0,01% como 0.01", () => assertEqual(parseLooseNumber(" 0,01% "), 0.01));
test("lê 12.5 como 12.5", () => assertEqual(parseLooseNumber("12.5"), 12.5));
test("texto inválido devolve null", () => assertEqual(parseLooseNumber("abc"), null));
test("vazio devolve null", () => assertEqual(parseLooseNumber(""), null));

console.log("\nPercentagem ↔ fracção (0,01% = 0.0001)");
test("0,01% → 0.0001", () => assertEqual(adminFeePercentToFraction(0.01), 0.0001));
test("0,01% (vírgula) → 0.0001", () => assertEqual(adminFeePercentToFraction("0,01"), 0.0001));
test("0.0001 → 0,01%", () => assertEqual(adminFeeFractionToPercent(0.0001), 0.01));
test("0,1% → 0.001", () => assertEqual(adminFeePercentToFraction(0.1), 0.001));
test("1% → 0.01", () => assertEqual(adminFeePercentToFraction(1), 0.01));
test("round-trip 0,01% não perde precisão", () => {
  const fraction = adminFeePercentToFraction(0.01) as number;
  assertEqual(adminFeeFractionToPercent(fraction), 0.01);
  assertEqual(adminFeePercentToFraction(adminFeeFractionToPercent(fraction)), 0.0001);
});
test("a fracção de 0,01% é >= ao mínimo representável", () => {
  assertTrue((adminFeePercentToFraction(0.01) as number) >= ADMIN_FEE_MIN_FRACTION);
});
test("arredonda para 6 casas (o que o DECIMAL(15,6) guarda)", () => {
  assertEqual(roundAdminFeeFraction(0.0001234), 0.000123);
});

console.log("\nValor cobrado sobre o capital");
test("150.000 × 0,01% = 15,00", () => assertEqual(adminFeeAmountOnPrincipal(150000, 0.0001), 15));
test("1.000.000 × 0,01% = 100,00", () => assertEqual(adminFeeAmountOnPrincipal(1000000, 0.0001), 100));
test("capital 0 → 0", () => assertEqual(adminFeeAmountOnPrincipal(0, 0.0001), 0));
test("isento (0) → 0", () => assertEqual(adminFeeAmountOnPrincipal(150000, 0), 0));
test("valor guardado como string DECIMAL é preservado", () =>
  assertEqual(normalizeStoredAdminFee("0.000100"), 0.0001));

console.log("\nPayload da API (nunca grava 0 em silêncio)");
test("administrativeFee (fracção) 0.0001 é aceite", () => {
  const parsed = parseAdminFeePayload({ administrativeFee: 0.0001 });
  assertTrue(parsed.ok);
  if (parsed.ok) assertEqual(parsed.fraction, 0.0001);
});
test("administrativeFeePercent 0,01 é aceite como percentagem", () => {
  const parsed = parseAdminFeePayload({ administrativeFeePercent: "0,01" });
  assertTrue(parsed.ok);
  if (parsed.ok) {
    assertEqual(parsed.fraction, 0.0001);
    assertEqual(parsed.source, "PERCENT");
  }
});
test("campo da fracção com \"%\" (\"0,01%\") é lido como percentagem", () => {
  const parsed = parseAdminFeePayload({ administrativeFee: "0,01%" });
  assertTrue(parsed.ok);
  if (parsed.ok) assertEqual(parsed.fraction, 0.0001);
});
test("ausente → 0 (isento)", () => {
  const parsed = parseAdminFeePayload({});
  assertTrue(parsed.ok);
  if (parsed.ok) {
    assertEqual(parsed.fraction, 0);
    assertEqual(parsed.source, "ABSENT");
  }
});
test("percentagem positiva abaixo da precisão é REJEITADA (não vira 0)", () => {
  const parsed = parseAdminFeePayload({ administrativeFeePercent: 0.00001 });
  assertFalse(parsed.ok, "deve falhar");
});
test("percentagem negativa é rejeitada", () => {
  assertFalse(parseAdminFeePayload({ administrativeFeePercent: -0.01 }).ok);
});
test("taxa acima de 100% é rejeitada", () => {
  assertFalse(parseAdminFeePayload({ administrativeFee: 1.5 }).ok);
});
test("texto inválido é rejeitado em vez de virar 0", () => {
  assertFalse(parseAdminFeePayload({ administrativeFee: "abc" }).ok);
});
test("campo explícito 0 continua a significar isento", () => {
  const parsed = parseAdminFeePayload({ administrativeFeePercent: 0 });
  assertTrue(parsed.ok);
  if (parsed.ok) assertEqual(parsed.fraction, 0);
});

console.log("\nApresentação");
test("0.0001 apresenta 0,01 (não 0)", () => assertEqual(formatAdminFeePercent(0.0001), "0,01"));
test("0 apresenta 0", () => assertEqual(formatAdminFeePercent(0), "0"));
test("0.001 apresenta 0,1", () => assertEqual(formatAdminFeePercent(0.001), "0,1"));

console.log(`\n${passed}/${passed + failed} testes passaram`);
if (failed > 0) {
  console.error("\nFalhas:");
  failures.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}
