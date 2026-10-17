/**
 * TESTE DE REGRESSÃO — GARANTIAS COMO BASE INICIAL DE ANÁLISE
 *
 * Regra de negócio (2026-10):
 *   1. Um crédito NÃO pode ser aprovado/desembolsado sem PELO MENOS UMA
 *      garantia registada — mesmo que o valor exigido fosse zero.
 *   2. O valor das garantias tem de cobrir o TOTAL A PAGAR (capital + juros).
 *   3. Fail-closed: se o total a pagar não for apurável (≤ 0), não aprova.
 *
 * Runner próprio (o projecto não tem test-runner):
 *   npx ts-node --transpile-only src/tests/guaranteeCoverage.test.ts
 *
 * Função pura — não toca na base de dados.
 */
import {
  evaluateGuaranteeCoverage,
  guaranteeCoverageMessage,
  guaranteeCoverageError,
  GuaranteeCoverage,
} from "../services/guaranteeCoverageService";

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
  if (!value) throw new Error(`${label} esperado verdadeiro`);
};
const assertFalse = (value: any, label = "") => {
  if (value) throw new Error(`${label} esperado falso`);
};

const evaluate = (guaranteeCount: number, guaranteesTotal: number, requiredTotal: number) =>
  evaluateGuaranteeCoverage({ guaranteeCount, guaranteesTotal, requiredTotal });

console.log("\nSem garantias registadas — bloqueio mesmo com valor exigido");

test("0 garantias, total 100.000 → bloqueado (NO_GUARANTEES)", () => {
  const r = evaluate(0, 0, 100000);
  assertFalse(r.covered);
  assertEqual(r.reason, "NO_GUARANTEES");
  assertFalse(r.registered);
  assertEqual(r.shortfall, 100000);
  assertEqual(r.coveragePct, 0);
});

test("0 garantias com valor exigido 0 → ainda bloqueado (fail-closed)", () => {
  const r = evaluate(0, 0, 0);
  assertFalse(r.covered);
  assertEqual(r.reason, "INVALID_REQUIRED");
});

test("valor exigido negativo → bloqueado", () => {
  assertFalse(evaluate(0, 0, -500).covered);
});

test("contagem 0 com valor somado > 0 (dados inconsistentes) → NO_GUARANTEES", () => {
  const r = evaluate(0, 50000, 100000);
  assertFalse(r.covered);
  assertEqual(r.reason, "NO_GUARANTEES");
});

console.log("\nGarantias registadas — cobertura vs total a pagar");

test("1 garantia cobre exactamente o total → aprovado", () => {
  const r = evaluate(1, 100000, 100000);
  assertTrue(r.covered);
  assertEqual(r.reason, null);
  assertEqual(r.coveragePct, 100);
  assertEqual(r.shortfall, 0);
});

test("1 garantia abaixo do total → INSUFFICIENT com o que falta", () => {
  const r = evaluate(1, 60000, 100000);
  assertFalse(r.covered);
  assertEqual(r.reason, "INSUFFICIENT");
  assertEqual(r.shortfall, 40000);
  assertEqual(r.coveragePct, 60);
});

test("duas garantias somam e cobrem → aprovado", () => {
  const r = evaluate(2, 50000 + 50000, 100000);
  assertTrue(r.covered);
});

test("tolerância de meio cêntimo não bloqueia por arredondamento", () => {
  assertTrue(evaluate(1, 99999.997, 100000).covered);
});

test("1 cêntimo em falta continua a bloquear", () => {
  assertFalse(evaluate(1, 99999.99, 100000).covered);
});

test("valores são arredondados a 2 casas", () => {
  const r = evaluate(1, 100000.004, 100000);
  assertEqual(r.guaranteesTotal, 100000);
  assertTrue(r.covered);
});

test("total de garantias negativo (dados sujos) não aprova", () => {
  const r = evaluate(1, -5000, 100000);
  assertEqual(r.guaranteesTotal, 0);
  assertFalse(r.covered);
});

console.log("\nMensagens de bloqueio");

const fakeCoverage = (overrides: Partial<GuaranteeCoverage>): GuaranteeCoverage => ({
  loanId: 1,
  guaranteeCount: 1,
  guaranteesTotal: 60000,
  requiredTotal: 100000,
  shortfall: 40000,
  covered: false,
  registered: true,
  coveragePct: 60,
  source: "simulated",
  reason: "INSUFFICIENT",
  ...overrides,
});

test("mensagem de NO_GUARANTEES fala em cadastro obrigatório", () => {
  const msg = guaranteeCoverageMessage(
    fakeCoverage({ guaranteeCount: 0, guaranteesTotal: 0, reason: "NO_GUARANTEES", registered: false })
  );
  assertTrue(msg.includes("Nenhuma garantia registada"), "mensagem sem garantias");
  assertTrue(msg.includes("obrigatório"), "mensagem sem 'obrigatório'");
});

test("erro devolve código próprio para crédito sem garantias", () => {
  const body = guaranteeCoverageError(
    fakeCoverage({ guaranteeCount: 0, guaranteesTotal: 0, reason: "NO_GUARANTEES", registered: false })
  );
  assertEqual(body.error, "GARANTIAS_AUSENTES");
  assertEqual(body.reason, "NO_GUARANTEES");
});

test("erro de cobertura insuficiente mantém o código histórico", () => {
  const body = guaranteeCoverageError(fakeCoverage({}));
  assertEqual(body.error, "GARANTIAS_INSUFICIENTES");
});

test("mensagem de cobertura insuficiente indica o valor em falta", () => {
  const msg = guaranteeCoverageMessage(fakeCoverage({}));
  assertTrue(msg.includes("40"), "mensagem sem o valor em falta");
  assertTrue(msg.includes("Total a pagar") || msg.includes("total a pagar"), "mensagem sem total");
});

console.log(`\n${passed}/${passed + failed} testes passaram`);
if (failed > 0) {
  console.error("\nFalhas:");
  failures.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}
