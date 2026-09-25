/* Sincroniza os dados REAIS de `microcredito` para a base da aplicação
   (`mbr_microcredito`), conforme as decisões tomadas:
     · preserva: financing_wallets, interest_rates, users, companies, accounts,
       provincias/distritos/planos (referência) e login_attempts;
     · apaga e recarrega: todas as restantes tabelas operacionais
       (clientes, créditos, prestações, pagamentos, caixa, banco, documentos…);
     · contas: mantém os registos da app mas com os SALDOS reais;
     · empresa 36: identidade real (MBR Microcrédito);
     · recibos: apaga o recibo de teste e repõe a sequência AT em 0.
   Nada é escrito na base `microcredito` (só leitura).
   Uso: node tools-tmp/sync-real-data.js [--executar]   (sem a flag só mostra o plano) */
require("dotenv").config();
const mysql = require("mysql2/promise");

const ORIGEM = process.argv.includes("--origem") ? process.argv[process.argv.indexOf("--origem") + 1] : "microcredito";
const EXECUTAR = process.argv.includes("--executar");

const PRESERVAR = new Set([
  "financing_wallets",
  "interest_rates",
  "users",
  "companies",
  "accounts",
  "provinces",
  "districts",
  "subscription_plans",
  "login_attempts",
]);
// Recibos: não vêm da origem (a base real não os tem) — apagam-se (era o recibo de teste).
const RECIBOS = ["recibos", "recibos_sequencia"];

// Identidade da empresa que passa a vir dos dados reais.
const EMPRESA_ID = 36;
const EMPRESA_CAMPOS = ["companyName", "companyEmail", "companyWebsite", "companyManager", "smsSender", "companyPhone", "companyAddress"];

const chunk = (arr, size) => arr.reduce((acc, item, i) => (i % size ? acc[acc.length - 1].push(item) : acc.push([item]), acc), []);

(async () => {
  const destino = process.env.DATABASE_NAME;
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASS,
    database: destino,
    port: Number(process.env.DATABASE_PORT) || 3306,
  });

  const tabelas = async (db) => {
    const [rows] = await conn.query(
      "SELECT table_name t FROM information_schema.TABLES WHERE table_schema = ? AND table_type = ? ORDER BY table_name",
      [db, "BASE TABLE"]
    );
    return rows.map((r) => String(r.t));
  };
  const colunas = async (db, t) => {
    const [rows] = await conn.query(
      "SELECT COLUMN_NAME c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
      [db, t]
    );
    return rows.map((r) => String(r.c));
  };
  const contar = async (db, t) => {
    const [[r]] = await conn.query(`SELECT COUNT(*) n FROM \`${db}\`.\`${t}\``);
    return Number(r.n);
  };
  const selectAll = async (db, t, cols) =>
    (await conn.query(`SELECT ${cols.map((c) => `\`${c}\``).join(",")} FROM \`${db}\`.\`${t}\``))[0];

  const tabsOrigem = await tabelas(ORIGEM);
  const tabsDestino = await tabelas(destino);

  const importar = [];
  const limpar = [];
  for (const t of tabsDestino) {
    if (PRESERVAR.has(t) || RECIBOS.includes(t)) continue;
    if (!tabsOrigem.includes(t)) {
      limpar.push(t); // tabela exclusiva da app (ex.: login_attempts) — só limpa
      continue;
    }
    importar.push(t);
  }

  console.log(`Base da app : ${destino}`);
  console.log(`Dados reais : ${ORIGEM}  (só leitura)`);
  console.log(`\nPRESERVADAS (${[...PRESERVAR].filter((t) => tabsDestino.includes(t)).length}): ${[...PRESERVAR].filter((t) => tabsDestino.includes(t)).join(", ")}`);
  console.log(`\nAPAGAR + RECARREGAR (${importar.length}):`);
  for (const t of importar) {
    console.log(`   ${t.padEnd(24)} app=${String(await contar(destino, t)).padStart(5)}  →  reais=${String(await contar(ORIGEM, t)).padStart(5)}`);
  }
  if (limpar.length) console.log(`\nAPENAS LIMPAR (só existem na app, sem origem real): ${limpar.join(", ")}`);
  console.log(`\nRECIBOS: apagar o recibo de teste e repor a sequência AT em 0.`);
  console.log(`EMPRESA ${EMPRESA_ID}: identidade real (${EMPRESA_CAMPOS.join(", ")}).`);
  console.log(`CONTAS: manter registos, actualizar balance/initial_balance com os valores reais.`);

  if (!EXECUTAR) {
    console.log("\n(modo de ensaio — nada foi alterado; acrescente --executar para aplicar)");
    await conn.end();
    return;
  }

  console.log("\n>>> a executar …");
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  await conn.beginTransaction();
  try {
    for (const t of importar) {
      // Só as colunas existentes nas DUAS bases: as novas (walletId, mora, …)
      // ficam a NULL — os créditos entram por classificar, como se pretende.
      const colsOrigem = await colunas(ORIGEM, t);
      const comuns = (await colunas(destino, t)).filter((c) => colsOrigem.includes(c));
      if (!comuns.length) {
        console.log(`   ${t}: sem colunas comuns — ignorada`);
        continue;
      }
      await conn.query(`DELETE FROM \`${t}\``);
      const linhas = await selectAll(ORIGEM, t, comuns);
      if (linhas.length) {
        for (const bloco of chunk(linhas, 200)) {
          const valores = bloco.map((linha) => comuns.map((c) => linha[c] ?? null));
          await conn.query(`INSERT INTO \`${t}\` (${comuns.map((c) => `\`${c}\``).join(",")}) VALUES ?`, [valores]);
        }
      }
      console.log(`   ${t}: ${linhas.length} linha(s) importada(s)`);
    }

    for (const t of limpar) {
      await conn.query(`DELETE FROM \`${t}\``);
      console.log(`   ${t}: limpa (sem origem real)`);
    }

    await conn.query("DELETE FROM recibos");
    await conn.query("UPDATE recibos_sequencia SET ultima_sequencia = 0");
    console.log("   recibos: apagados · sequência AT reposta em 0");

    // Contas: registos da app, saldos reais.
    const colsContas = await colunas(destino, "accounts");
    const colsContasOrigem = await colunas(ORIGEM, "accounts");
    const camposSaldo = ["balance", "initial_balance"].filter(
      (c) => colsContas.includes(c) && colsContasOrigem.includes(c)
    );
    const contasOrigem = await selectAll(ORIGEM, "accounts", ["id", ...camposSaldo]);
    for (const conta of contasOrigem) {
      if (!camposSaldo.length) break;
      const sets = camposSaldo.map((c) => `\`${c}\` = ?`).join(", ");
      const [res] = await conn.query(`UPDATE \`accounts\` SET ${sets} WHERE id = ?`, [
        ...camposSaldo.map((c) => conta[c]),
        conta.id,
      ]);
      console.log(`   conta ${conta.id}: saldo actualizado (${res.affectedRows} linha)`);
    }

    // Empresa: identidade real.
    const colsEmpresa = await colunas(destino, "companies");
    const camposEmpresa = EMPRESA_CAMPOS.filter((c) => colsEmpresa.includes(c));
    const [empresaOrigem] = await conn.query(
      `SELECT ${camposEmpresa.map((c) => `\`${c}\``).join(",")} FROM \`${ORIGEM}\`.companies WHERE id = ?`,
      [EMPRESA_ID]
    );
    if (empresaOrigem[0]) {
      await conn.query(`UPDATE \`companies\` SET ${camposEmpresa.map((c) => `\`${c}\` = ?`).join(", ")} WHERE id = ?`, [
        ...camposEmpresa.map((c) => empresaOrigem[0][c]),
        EMPRESA_ID,
      ]);
      console.log(`   empresa ${EMPRESA_ID}: identidade real aplicada (${empresaOrigem[0].companyName})`);
    } else {
      await conn.query(`DELETE FROM \`companies\` WHERE id = ?`, [EMPRESA_ID]);
      console.log(`   empresa ${EMPRESA_ID}: não existe na origem — removida da app`);
    }

    await conn.commit();
    console.log(">>> transacção confirmada");
  } catch (error) {
    await conn.rollback();
    console.error(">>> ERRO — tudo revertido:", error.message);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    await conn.end();
    process.exitCode = 1;
    return;
  }
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");

  console.log("\n=== VERIFICAÇÃO ===");
  for (const t of tabsDestino) {
    if (PRESERVAR.has(t)) continue;
    const n = await contar(destino, t);
    const esperado = tabsOrigem.includes(t) ? await contar(ORIGEM, t) : 0;
    const ok = t.startsWith("recibos") ? n === 0 : n === esperado;
    console.log(`   ${t.padEnd(24)} ${String(n).padStart(5)} (esperado ${esperado}) ${ok ? "OK" : "CONFERIR"}`);
  }
  await conn.end();
})();
