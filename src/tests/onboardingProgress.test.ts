import "../config/env"; // carrega .env ANTES de qualquer conexão (DATABASE_* etc.)
import express from "express";
import bodyParser from "body-parser";
import * as jwt from "jsonwebtoken";
import { Server } from "http";
import { QueryTypes } from "sequelize";
import { db } from "../database/db";
import { tenantGuard } from "../middlewares/tenantGuard";
import { routes } from "../routes";
import { runMigrations } from "../migrations";

/**
 * TESTES DE INTEGRAÇÃO — ONBOARDING (CHECKLIST DO PRIMEIRO DIA)
 *
 * Runner próprio (o projecto não tem test-runner):
 *   npx ts-node --transpile-only src/tests/onboardingProgress.test.ts
 *   (ou: npm run test:onboarding)
 *
 * Sobe as ROTAS REAIS por HTTP com duas empresas e verifica:
 *
 *  1. PROGRESSO DO PRÓPRIO: /api/onboarding/me começa vazio, guarda o conjunto
 *     de tarefas concluídas e devolve-o de volta (persistente, não só no browser);
 *  2. IDEMPOTÊNCIA: guardar duas vezes o mesmo conjunto não duplica linhas;
 *  3. DESMARCAR: uma tarefa retirada do conjunto desaparece da base de dados;
 *  4. SANITIZAÇÃO: ids inválidos, repetidos ou em maiúsculas são normalizados
 *     (nunca criam lixo na tabela);
 *  5. CORPO INVÁLIDO: `taskIds` que não seja lista é recusado (400) e não apaga
 *     o progresso existente;
 *  6. ISOLAMENTO POR UTILIZADOR: o progresso de um colega não aparece no meu;
 *  7. VISTA DO ADMIN: /api/onboarding/team mostra TODOS os utilizadores da
 *     empresa (mesmo os que ainda não começaram) com o respectivo progresso,
 *     incluindo parceiros financiadores;
 *  8. PERMISSÕES: só o Admin acede a /team (Gestor, Operador e Parceiro: 403);
 *  9. MULTI-EMPRESA: o Admin de outra empresa nunca vê estes utilizadores.
 */

// ── Mini-runner ─────────────────────────────────────────────────────────────
const failures: string[] = [];
let passed = 0;

const check = (cond: boolean, message: string) => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
};

const checkEqual = (actual: any, expected: any, message: string) =>
  check(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message} (esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)})`
  );

// ── Infra ───────────────────────────────────────────────────────────────────
let app: { port: number; close: () => Promise<void> } | null = null;
let companyId = 0;
let otherCompanyId = 0;
let adminId = 0;
let gestorId = 0;
let operadorId = 0;
let partnerId = 0;
let otherAdminId = 0;
let adminToken = "";
let gestorToken = "";
let operadorToken = "";
let partnerToken = "";
let otherAdminToken = "";

const call = async (
  path: string,
  init: { method?: string; body?: any; token?: string } = {}
): Promise<{ status: number; body: any; raw: string }> => {
  const response = await fetch(`http://127.0.0.1:${app!.port}${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${init.token || adminToken}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const raw = await response.text();
  let body: any = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { raw: raw.slice(0, 200) };
  }
  return { status: response.status, body, raw };
};

const insertCompany = async (name: string, nuit: string): Promise<number> => {
  const [id] = await db.query(
    `INSERT INTO companies
       (companyName, companyEmail, companyWebsite, companyManager, companyNuit, companyPhone,
        districtId, provinceId, forfeit, companyAddress, companyStatus, createdAt, updatedAt)
     VALUES (?, ?, '', 'Teste Onboarding', ?, '840000011',
        155, 1, 0, 'Teste', 1, NOW(), NOW())`,
    { replacements: [name, `teste.onboarding.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@local.invalid`, nuit] }
  );
  return Number(id);
};

const insertUser = async (userId: any, name: string, role: number): Promise<number> => {
  const [id] = await db.query(
    `INSERT INTO users
       (name, email, password, updatedPassword, phone, companyId, status, userRole, createdAt, updatedAt)
     VALUES (?, ?, 'x', 0, '840000012', ?, 1, ?, NOW(), NOW())`,
    {
      replacements: [
        name,
        `teste.onboarding.${userId}.${Math.random().toString(36).slice(2, 9)}@local.invalid`,
        userId,
        role,
      ],
    }
  );
  return Number(id);
};

/** Linhas na tabela de progresso do utilizador (prova directa na base de dados). */
const rowsFor = async (userId: number): Promise<string[]> => {
  const rows: any = await db.query(
    "SELECT taskId FROM onboarding_progress WHERE userId = ? ORDER BY taskId ASC",
    { replacements: [userId], type: QueryTypes.SELECT }
  );
  return (rows as any[]).map((row) => String(row.taskId));
};

const setupDatabase = async () => {
  companyId = await insertCompany("TESTE ONBOARDING (apagar)", "000000011");
  otherCompanyId = await insertCompany("TESTE ONBOARDING OUTRA (apagar)", "000000012");
  if (!companyId || !otherCompanyId) throw new Error("Não foi possível criar as empresas de teste.");

  adminId = await insertUser(companyId, "TESTE Onboarding Admin", 1);
  gestorId = await insertUser(companyId, "TESTE Onboarding Gestor", 3);
  operadorId = await insertUser(companyId, "TESTE Onboarding Operador", 2);
  partnerId = await insertUser(companyId, "TESTE Onboarding Parceiro", 4);
  otherAdminId = await insertUser(otherCompanyId, "TESTE Onboarding Admin B", 1);

  const secret = process.env.APP_SECRET + "";
  const token = (id: number, cid: number) => jwt.sign({ id, companyId: cid }, secret, { expiresIn: "1h" });
  adminToken = token(adminId, companyId);
  gestorToken = token(gestorId, companyId);
  operadorToken = token(operadorId, companyId);
  partnerToken = token(partnerId, companyId);
  otherAdminToken = token(otherAdminId, otherCompanyId);
};

const cleanupDatabase = async () => {
  const safe = async (sql: string, replacements: any[]) => {
    try {
      await db.query(sql, { replacements });
    } catch (error: any) {
      console.warn(`[cleanup] ${error?.message || error}`);
    }
  };
  const ids = [companyId, otherCompanyId].filter((id) => !!id);
  if (ids.length > 0) {
    await safe("DELETE FROM onboarding_progress WHERE companyId IN (?)", [ids]);
    await safe("DELETE FROM user_logs WHERE companyId IN (?)", [ids]);
    await safe("DELETE FROM users WHERE companyId IN (?)", [ids]);
    await safe("DELETE FROM companies WHERE id IN (?)", [ids]);
    console.log(`  · dados de teste limpos (empresas ${ids.join(", ")})`);
  }
};

const startApp = async () => {
  const server: Server = await new Promise((resolve) => {
    const instance = express();
    instance.use(tenantGuard);
    instance.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
    instance.use(bodyParser.json({ limit: "10mb" }));
    instance.use(routes);
    const s = instance.listen(0, () => resolve(s));
  });
  const address: any = server.address();
  return {
    port: Number(address.port),
    close: () =>
      new Promise<void>((resolve) =>
        server.close(() => {
          resolve();
        })
      ),
  };
};

// ── Testes ──────────────────────────────────────────────────────────────────
const main = async () => {
  process.env.APP_SECRET = process.env.APP_SECRET || "dev-secret";
  delete process.env.TENANT_MODE;

  await runMigrations();
  await setupDatabase();
  app = await startApp();

  console.log(
    `\nEmpresa: ${companyId} (Admin ${adminId}, Gestor ${gestorId}, Operador ${operadorId}, Parceiro ${partnerId}) · Outra empresa: ${otherCompanyId}`
  );

  // ── 1. Progresso do próprio utilizador ──────────────────────────────────
  console.log("\n[1] /api/onboarding/me — o meu progresso");
  const inicial = await call("/api/onboarding/me", { token: adminToken });
  checkEqual(inicial.status, 200, "GET /api/onboarding/me responde 200");
  checkEqual(inicial.body?.result?.taskIds, [], "começa sem tarefas concluídas");
  checkEqual(inicial.body?.result?.total, 0, "total = 0");

  const guardar = await call("/api/onboarding/me", {
    method: "PUT",
    token: adminToken,
    body: { taskIds: ["abrir-caixa", "primeiro-mutuario"] },
  });
  checkEqual(guardar.status, 200, "PUT /api/onboarding/me responde 200");
  checkEqual(
    [...(guardar.body?.result?.taskIds || [])].sort(),
    ["abrir-caixa", "primeiro-mutuario"],
    "devolve as duas tarefas guardadas"
  );
  check(!!guardar.body?.result?.lastCompletedAt, "regista quando foi concluída a última tarefa");

  const relido = await call("/api/onboarding/me", { token: adminToken });
  checkEqual(
    [...(relido.body?.result?.taskIds || [])].sort(),
    ["abrir-caixa", "primeiro-mutuario"],
    "o progresso persiste (nova leitura devolve o mesmo conjunto)"
  );
  checkEqual(await rowsFor(adminId), ["abrir-caixa", "primeiro-mutuario"], "na base de dados ficaram as 2 linhas");

  // ── 2. Idempotência ─────────────────────────────────────────────────────
  console.log("\n[2] Guardar duas vezes o mesmo conjunto não duplica nada");
  const repetido = await call("/api/onboarding/me", {
    method: "PUT",
    token: adminToken,
    body: { taskIds: ["abrir-caixa", "primeiro-mutuario"] },
  });
  checkEqual(repetido.status, 200, "repetir o PUT responde 200");
  checkEqual(await rowsFor(adminId), ["abrir-caixa", "primeiro-mutuario"], "continuam 2 linhas (sem duplicados)");
  const [contagem]: any = await db.query("SELECT COUNT(*) AS n FROM onboarding_progress WHERE userId = ?", {
    replacements: [adminId],
  });
  checkEqual(Number((contagem as any[])[0]?.n), 2, "contagem na tabela = 2");

  // ── 3. Desmarcar ────────────────────────────────────────────────────────
  console.log("\n[3] Desmarcar uma tarefa remove-a da base de dados");
  const desmarcar = await call("/api/onboarding/me", {
    method: "PUT",
    token: adminToken,
    body: { taskIds: ["abrir-caixa"] },
  });
  checkEqual(desmarcar.body?.result?.taskIds, ["abrir-caixa"], "só fica a tarefa assinalada");
  checkEqual(await rowsFor(adminId), ["abrir-caixa"], "a linha da tarefa desmarcada foi apagada");

  // ── 4. Sanitização ──────────────────────────────────────────────────────
  console.log("\n[4] Ids inválidos/repetidos são normalizados");
  const lixo = await call("/api/onboarding/me", {
    method: "PUT",
    token: adminToken,
    body: {
      taskIds: [
        "ABRIR-CAIXA",
        "abrir-caixa",
        "primeiro-credito",
        "primeiro-credito",
        "abrir caixa",
        "",
        "x".repeat(80),
        42,
        null,
      ],
    },
  });
  checkEqual(lixo.status, 200, "PUT com entradas inválidas responde 200");
  checkEqual(
    [...(lixo.body?.result?.taskIds || [])].sort(),
    ["abrir-caixa", "primeiro-credito"],
    "só ficaram os ids válidos, em minúsculas e sem repetições"
  );
  checkEqual(await rowsFor(adminId), ["abrir-caixa", "primeiro-credito"], "a tabela reflecte a normalização");

  const tecto = await call("/api/onboarding/me", {
    method: "PUT",
    token: adminToken,
    body: { taskIds: Array.from({ length: 60 }, (_, i) => `tarefa-${i}`) },
  });
  checkEqual(tecto.body?.result?.total, 40, "o número de tarefas por utilizador está limitado a 40");

  // ── 5. Corpo inválido nunca apaga progresso ─────────────────────────────
  console.log("\n[5] Corpo inválido é recusado e não apaga progresso");
  const antes = await rowsFor(adminId);
  const invalido = await call("/api/onboarding/me", {
    method: "PUT",
    token: adminToken,
    body: { taskIds: "abrir-caixa" },
  });
  checkEqual(invalido.status, 400, "`taskIds` que não é lista responde 400");
  checkEqual(invalido.body?.error, "INVALID_PAYLOAD", "erro identificado como INVALID_PAYLOAD");
  checkEqual(await rowsFor(adminId), antes, "o progresso existente ficou intacto");

  // Voltar a um conjunto pequeno e estável para os testes seguintes.
  await call("/api/onboarding/me", { method: "PUT", token: adminToken, body: { taskIds: ["abrir-caixa"] } });

  // ── 6. Isolamento por utilizador ────────────────────────────────────────
  console.log("\n[6] Cada utilizador tem o seu progresso");
  const gestorMe = await call("/api/onboarding/me", { token: gestorToken });
  checkEqual(gestorMe.status, 200, "o Gestor acede ao seu próprio progresso");
  checkEqual(gestorMe.body?.result?.taskIds, [], "o Gestor ainda não concluiu nada (não vê o do Admin)");
  await call("/api/onboarding/me", {
    method: "PUT",
    token: gestorToken,
    body: { taskIds: ["painel-dia", "abrir-caixa", "cobranca-campo"] },
  });
  const gestorDepois = await call("/api/onboarding/me", { token: gestorToken });
  checkEqual(gestorDepois.body?.result?.total, 3, "o Gestor passou a ter 3 tarefas");
  const adminDepois = await call("/api/onboarding/me", { token: adminToken });
  checkEqual(adminDepois.body?.result?.taskIds, ["abrir-caixa"], "o progresso do Admin não mudou");

  // O parceiro financiador (userRole 4) também tem checklist.
  const parceiroMe = await call("/api/onboarding/me", { token: partnerToken });
  checkEqual(parceiroMe.status, 200, "o Parceiro financiador acede ao seu checklist");
  await call("/api/onboarding/me", { method: "PUT", token: partnerToken, body: { taskIds: ["carteira"] } });

  // ── 7. Vista do Admin — progresso de cada utilizador da empresa ─────────
  console.log("\n[7] /api/onboarding/team — progresso por colega (Admin)");
  const equipa = await call("/api/onboarding/team", { token: adminToken });
  checkEqual(equipa.status, 200, "GET /api/onboarding/team responde 200");
  const linhas: any[] = equipa.body?.result?.users || [];
  const porId = new Map(linhas.map((row) => [Number(row.userId), row]));
  checkEqual(linhas.length, 4, "a empresa tem 4 utilizadores (mesmo os que não começaram)");

  const linhaAdmin: any = porId.get(adminId);
  const linhaGestor: any = porId.get(gestorId);
  const linhaOperador: any = porId.get(operadorId);
  const linhaParceiro: any = porId.get(partnerId);
  checkEqual(linhaAdmin?.taskIds, ["abrir-caixa"], "a linha do Admin mostra o que ele concluiu");
  checkEqual(linhaAdmin?.role, 1, "a linha diz o perfil (Admin) para o frontend calcular o total");
  checkEqual(linhaGestor?.total, 3, "a linha do Gestor mostra as 3 tarefas");
  check(!!linhaGestor?.lastCompletedAt, "a linha do Gestor tem a data da última conclusão");
  checkEqual(linhaOperador?.taskIds, [], "o Operador aparece com progresso vazio (ainda não começou)");
  checkEqual(linhaParceiro?.taskIds, ["carteira"], "o progresso do parceiro financiador entra na vista do Admin");
  checkEqual(linhaAdmin?.name, "TESTE Onboarding Admin", "a linha traz o nome para a tabela");

  const nomes = linhas.map((row) => String(row.name)).join(" | ");
  check(nomes.includes("TESTE Onboarding Admin B") === false, "não aparecem utilizadores de outra empresa");

  // ── 8. Permissões ───────────────────────────────────────────────────────
  console.log("\n[8] Só o Admin vê a equipa");
  const gestorTeam = await call("/api/onboarding/team", { token: gestorToken });
  checkEqual(gestorTeam.status, 403, "o Gestor não acede à vista da equipa (403)");
  const operadorTeam = await call("/api/onboarding/team", { token: operadorToken });
  checkEqual(operadorTeam.status, 403, "o Operador não acede à vista da equipa (403)");
  const parceiroTeam = await call("/api/onboarding/team", { token: partnerToken });
  checkEqual(parceiroTeam.status, 403, "o Parceiro financiador não acede à vista da equipa (403)");
  const semToken = await call("/api/onboarding/team", { token: "invalido" });
  checkEqual(semToken.status, 401, "sem sessão válida responde 401");

  // ── 9. Multi-empresa ────────────────────────────────────────────────────
  console.log("\n[9] O Admin de outra empresa não vê estes utilizadores");
  const equipaB = await call("/api/onboarding/team", { token: otherAdminToken });
  checkEqual(equipaB.status, 200, "o Admin da outra empresa acede à sua própria vista");
  const linhasB: any[] = equipaB.body?.result?.users || [];
  checkEqual(linhasB.length, 1, "só vê o utilizador da sua empresa");
  checkEqual(Number(linhasB[0]?.userId), otherAdminId, "é o Admin da empresa B");
  check(
    !linhasB.some((row) => Number(row.userId) === adminId),
    "o Admin da empresa A não aparece na empresa B"
  );

  // ── Resultado ───────────────────────────────────────────────────────────
  console.log(`\n${passed} verificações passaram, ${failures.length} falharam.`);
  if (failures.length > 0) {
    console.error("\nFALHAS:");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exitCode = 1;
  }
};

main()
  .catch((error: any) => {
    console.error("Erro fatal no teste:", error?.message || error);
    if (error?.sql) console.error("SQL:", error.sql);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanupDatabase();
    } catch (cleanupError: any) {
      console.warn("[cleanup] erro:", cleanupError?.message || cleanupError);
    }
    if (app) await app.close();
    try {
      await db.close();
    } catch {
      /* já fechada */
    }
    process.exit(process.exitCode || 0);
  });
