/**
 * Smoke test (SOMENTE LEITURA) da cobertura de garantias.
 * Corre: npx ts-node --transpile-only scripts/smoke-guarantee-coverage.ts
 * Confere que getGuaranteeCoverage devolve o total exigido correcto e que a
 * mensagem de bloqueio aparece quando as garantias não cobrem o total.
 */
import "dotenv/config";
import { db } from "../src/database/db";
import { LoanModel } from "../src/database/models/LoanModel";
import {
  getGuaranteeCoverage,
  guaranteeCoverageMessage,
} from "../src/services/guaranteeCoverageService";

const main = async () => {
  await db.authenticate();

  const loans: any[] = await LoanModel.findAll({
    order: [["id", "DESC"]],
    limit: 8,
    raw: true,
  });
  if (loans.length === 0) {
    console.log("Sem créditos na BD — smoke ignorado.");
    process.exit(0);
  }

  let failures = 0;
  for (const loan of loans) {
    const coverage = await getGuaranteeCoverage({ loan });
    const status = coverage.covered ? "COBERTO " : "FALTAM  ";
    console.log(
      `#${coverage.loanId} ${status} garantias=${coverage.guaranteesTotal.toFixed(2)} ` +
        `exigido=${coverage.requiredTotal.toFixed(2)} (${coverage.source}) ` +
        `faltam=${coverage.shortfall.toFixed(2)} pct=${coverage.coveragePct}% n=${coverage.guaranteeCount}`
    );

    // Invariante 1: exigido >= capital do crédito (nunca abaixo do capital).
    const capital = Number(loan.amount) || 0;
    if (coverage.requiredTotal + 0.005 < capital) {
      console.error(`  ✗ exigido (${coverage.requiredTotal}) < capital (${capital})`);
      failures++;
    }
    // Invariante 2: shortfall coerente com covered.
    const expectedShortfall = Math.max(0, Math.round((coverage.requiredTotal - coverage.guaranteesTotal) * 100) / 100);
    if (Math.abs(coverage.shortfall - expectedShortfall) > 0.011) {
      console.error(`  ✗ shortfall incoerente: ${coverage.shortfall} vs ${expectedShortfall}`);
      failures++;
    }
    if (coverage.covered && coverage.shortfall > 0) {
      console.error("  ✗ covered=true com shortfall>0");
      failures++;
    }
  }

  // Invariante 3: mensagem de bloqueio contém os valores.
  const sample = await getGuaranteeCoverage({ loan: loans[0] });
  const msg = guaranteeCoverageMessage({ ...sample, covered: false, shortfall: 1234.5 });
  if (!msg.includes("1234,50") && !msg.includes("1.234,50")) {
    console.error("  ✗ mensagem sem o shortfall:", msg);
    failures++;
  }
  console.log("\nMensagem de exemplo:", guaranteeCoverageMessage(sample));

  await db.close();
  console.log(failures === 0 ? "\nSMOKE OK" : `\nSMOKE COM ${failures} FALHA(S)`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((e) => {
  console.error("SMOKE ERRO:", e?.message || e);
  process.exit(1);
});
