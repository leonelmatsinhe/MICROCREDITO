import "./../config/env";
import { runMigrations } from "./index";

/**
 * Executa as migrações de base de dados de forma isolada.
 * Uso: npm run migrate   (ou: node build/src/migrations/run.js)
 */
const main = async () => {
  console.log("[Migration] A aplicar migrações de base de dados...");
  const result = await runMigrations();
  console.log(
    `[Migration] Concluído: ${result.applied} aplicadas, ${result.skipped} já existentes, ${result.errors.length} erros.`
  );
  if (result.errors.length > 0) {
    result.errors.forEach((error) => console.error("[Migration]", error));
    process.exit(1);
  }
  process.exit(0);
};

main().catch((error: any) => {
  console.error("[Migration] Falha geral:", error?.message || error);
  process.exit(1);
});