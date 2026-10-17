import "../config/env"; // carrega .env ANTES de qualquer conexão (DATABASE_* etc.)
import express from "express";
import bodyParser from "body-parser";
import * as jwt from "jsonwebtoken";
import { Server } from "http";
import { Op } from "sequelize";
import { tenantGuard } from "../middlewares/tenantGuard";
import { routes } from "../routes";
import { LoanModel } from "../database/models/LoanModel";
import { CompanyModel } from "../database/models/CompanyModel";

/**
 * TESTES DE INTEGRAÇÃO — TENANT GUARD (isolamento single-tenant)
 *
 * Runner próprio (sem mocha/chai — o projecto não tem test-runner):
 *   npx ts-node --transpile-only src/tests/tenantGuard.test.ts
 *   (ou: npm run test:tenant)
 *
 * Sobe uma app Express com a MESMA ordem do src/app.ts (tenantGuard PRIMEIRO,
 * depois body-parser, depois as rotas reais) e faz pedidos HTTP a sério, com
 * token assinado com APP_SECRET. Cobre:
 *   1. modo multi: o guard é inerte (companyId da URL mantém-se)
 *   2. modo single: params, query e body são reescritos para a empresa única
 *   3. CRITÉRIO: token da empresa 1 com companyId=2 na URL devolve os dados da
 *      empresa 1 (mesmos créditos), não os da empresa 2
 *   4. tentativa de forja gera WARNING ([TenantGuard] AVISO DE SEGURANÇA ...)
 *      e pedidos legítimos não geram ruído
 *   5. omissão: sem SINGLE_TENANT_COMPANY_ID o valor forçado é 1
 *   6. sem regressão: rotas públicas (sem companyId) continuam a responder
 *   7. auto-registo de empresa, /api/super-admin/* e /api/debug/companies
 *      estão desactivados (404) em src/routes.ts
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

// ── App de teste (mesma ordem de middlewares do src/app.ts) ─────────────────
type TenantEnv = { mode?: string; companyId?: string };
type TestApp = { port: number; close: () => Promise<void> };

const startApp = async (env: TenantEnv): Promise<TestApp> => {
  if (env.mode === undefined) delete process.env.TENANT_MODE;
  else process.env.TENANT_MODE = env.mode;

  if (env.companyId === undefined) delete process.env.SINGLE_TENANT_COMPANY_ID;
  else process.env.SINGLE_TENANT_COMPANY_ID = env.companyId;

  const app = express();

  app.use(tenantGuard); // PRIMEIRO, antes de todas as rotas
  app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
  app.use(bodyParser.json({ limit: "10mb" }));

  // Sondas: mostram o companyId que qualquer controlador veria no pedido
  app.get("/probe/params/:companyId", (req, res) =>
    res.json({ companyId: (req.params as any).companyId })
  );
  app.get("/probe/query", (req, res) =>
    res.json({ companyId: (req.query as any).companyId })
  );
  app.post("/probe/body", (req, res) =>
    res.json({ companyId: (req.body as any).companyId })
  );

  app.use(routes); // rotas REAIS (inclui o middleware auth)

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address: any = server.address();

  return {
    port: Number(address.port),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
};

// ── Helpers HTTP ────────────────────────────────────────────────────────────
let token = "";

const call = async (
  app: TestApp,
  path: string,
  init: { method?: string; body?: any } = {}
): Promise<any> => {
  const response = await fetch(`http://127.0.0.1:${app.port}${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, body: json };
};

/** Corre um pedido capturando os warnings do tenantGuard. */
const callCapturingWarnings = async (
  app: TestApp,
  path: string,
  init: { method?: string; body?: any } = {}
): Promise<{ status: number; body: any; warnings: string[] }> => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: any[]) => warnings.push(args.map(String).join(" "));
  try {
    const result = await call(app, path, init);
    return { ...result, warnings: warnings.filter((w) => w.includes("[TenantGuard]")) };
  } finally {
    console.warn = original;
  }
};

const loanIds = (payload: any): number[] =>
  ((payload?.body?.result || []) as any[])
    .map((l) => Number(l.id))
    .sort((a, b) => a - b);

// ── Testes ──────────────────────────────────────────────────────────────────
const main = async () => {
  // Empresa com dados (tenant real desta instalação) e outra empresa qualquer
  const grouped: any[] = (await LoanModel.findAll({
    attributes: ["companyId"],
    group: ["companyId"],
    raw: true,
  })) as any[];

  // Contagem de créditos por empresa (para escolher o tenant com dados)
  const counts: Array<{ companyId: number; total: number }> = [];
  for (const row of grouped) {
    const companyId = Number((row as any).companyId);
    counts.push({
      companyId,
      total: await LoanModel.count({ where: { companyId } }),
    });
  }
  counts.sort((a, b) => b.total - a.total);

  const tenant = counts[0];
  const others: any[] = (await CompanyModel.findAll({
    where: tenant ? { id: { [Op.ne]: tenant.companyId } } : {},
    raw: true,
  })) as any[];
  const stranger = others.length > 0 ? Number(others[0].id) : null;

  console.log(
    `Dados: empresa com créditos = ${tenant ? tenant.companyId : "nenhuma"}` +
      `${tenant ? ` (${tenant.total} créditos)` : ""}, outra empresa = ${stranger ?? "nenhuma"}`
  );

  token = jwt.sign(
    { id: 329, companyId: tenant ? tenant.companyId : 1 },
    process.env.APP_SECRET + ""
  );

  // ── 1. Modo multi-empresa: guard inerte ──────────────────────────────────
  console.log("\n[1] TENANT_MODE ausente (multi-empresa) — guard inerte");
  const multi = await startApp({ mode: undefined, companyId: undefined });
  try {
    const paramsProbe = await callCapturingWarnings(multi, "/probe/params/2");
    checkEqual(paramsProbe.body.companyId, "2", "params.companyId da URL é preservado");
    checkEqual(paramsProbe.warnings.length, 0, "não gera warning");

    const queryProbe = await call(multi, "/probe/query?companyId=2");
    checkEqual(queryProbe.body.companyId, "2", "query.companyId é preservado");

    const bodyProbe = await call(multi, "/probe/body", { method: "POST", body: { companyId: 2 } });
    checkEqual(bodyProbe.body.companyId, 2, "body.companyId é preservado");

    if (tenant && stranger) {
      const legit = await call(multi, `/api/loans/overview/${tenant.companyId}`);
      const forged = await call(multi, `/api/loans/overview/${stranger}`);
      check(legit.status === 200, `GET /api/loans/overview/${tenant.companyId} responde 200`);
      check(legit.body?.result?.length > 0, "empresa real devolve créditos");
      checkEqual(
        forged.body?.result?.length || 0,
        0,
        `empresa ${stranger} (sem créditos) devolve lista vazia no modo multi`
      );
    }
  } finally {
    await multi.close();
  }

  // ── 2. Modo single-tenant com empresa explícita ──────────────────────────
  const singleId = tenant ? String(tenant.companyId) : "1";
  console.log(`\n[2] TENANT_MODE=single, SINGLE_TENANT_COMPANY_ID=${singleId}`);
  const single = await startApp({ mode: "single", companyId: singleId });
  try {
    const paramsProbe = await callCapturingWarnings(single, "/probe/params/2");
    checkEqual(paramsProbe.body.companyId, singleId, "params.companyId forçado para a empresa única");
    checkEqual(paramsProbe.warnings.length, 1, "forja em params gera 1 warning");
    check(
      paramsProbe.warnings[0]?.includes("[TenantGuard] AVISO DE SEGURANÇA") &&
        paramsProbe.warnings[0]?.includes("recebido '2'"),
      `warning identifica a forja: ${paramsProbe.warnings[0] || "(nenhum)"}`
    );

    const queryProbe = await callCapturingWarnings(single, "/probe/query?companyId=2");
    checkEqual(queryProbe.body.companyId, singleId, "query.companyId forçado");
    checkEqual(queryProbe.warnings.length, 1, "forja em query gera 1 warning");

    const bodyProbe = await callCapturingWarnings(single, "/probe/body", {
      method: "POST",
      body: { companyId: 2 },
    });
    checkEqual(bodyProbe.body.companyId, Number(singleId), "body.companyId forçado (number preservado)");
    checkEqual(bodyProbe.warnings.length, 1, "forja em body gera 1 warning");

    const legitBody = await callCapturingWarnings(single, "/probe/body", {
      method: "POST",
      body: { companyId: Number(singleId) },
    });
    checkEqual(legitBody.body.companyId, Number(singleId), "body legítimo mantém-se");
    checkEqual(legitBody.warnings.length, 0, "pedido legítimo não gera warning");

    // CRITÉRIO: token da empresa X, companyId=outra na URL → dados da empresa X
    if (tenant && stranger) {
      const legit = await call(single, `/api/loans/overview/${tenant.companyId}`);
      const forged = await callCapturingWarnings(single, `/api/loans/overview/${stranger}`);
      check(forged.status === 200, "pedido forjado continua a responder 200");
      checkEqual(
        loanIds(forged),
        loanIds(legit),
        "companyId=outra na URL devolve exactamente os créditos da empresa única"
      );
      check(
        (forged.body?.result || []).every((l: any) => Number(l.companyId) === tenant.companyId),
        "todos os créditos devolvidos pertencem à empresa única"
      );
      check(
        forged.warnings.length === 1 &&
          forged.warnings[0].includes(`recebido '${stranger}'`) &&
          forged.warnings[0].includes(`forçado para '${tenant.companyId}'`) &&
          forged.warnings[0].includes("/api/loans/overview/"),
        `warning do pedido HTTP real: ${forged.warnings[0] || "(nenhum)"}`
      );
    } else {
      console.log("  ! sem empresa com créditos nesta base de dados — critério de dados não verificado");
    }

    // Sem regressão: rota pública sem companyId continua a funcionar
    const publicRoute = await call(single, "/api/subscription-plans");
    check(publicRoute.status === 200, "rota pública /api/subscription-plans continua a responder 200");
  } finally {
    await single.close();
  }

  // ── 3. Omissão: sem SINGLE_TENANT_COMPANY_ID → 1 ─────────────────────────
  console.log("\n[3] TENANT_MODE=single sem SINGLE_TENANT_COMPANY_ID — omissão");
  const fallback = await startApp({ mode: "single", companyId: undefined });
  try {
    const probe = await callCapturingWarnings(fallback, "/probe/params/2");
    checkEqual(probe.body.companyId, "1", "omissão usa o id 1");
  } finally {
    await fallback.close();
  }

  // ── 4. Rotas de plataforma desactivadas ──────────────────────────────────
  console.log("\n[4] Rotas de multi-empresa desactivadas em src/routes.ts");
  const closed = await startApp({ mode: "single", companyId: singleId });
  try {
    const register = await call(closed, "/api/companies/register", {
      method: "POST",
      body: { companyName: "Empresa Pirata", companyId: 2 },
    });
    checkEqual(register.status, 404, "POST /api/companies/register (auto-registo) já não existe");

    const superAdmin = await call(closed, "/api/super-admin/companies");
    checkEqual(superAdmin.status, 404, "GET /api/super-admin/companies já não existe");

    const superAdminUsers = await call(closed, "/api/super-admin/users");
    checkEqual(superAdminUsers.status, 404, "GET /api/super-admin/users já não existe");

    const debug = await call(closed, "/api/debug/companies");
    checkEqual(debug.status, 404, "GET /api/debug/companies já não existe");
  } finally {
    await closed.close();
  }

  // ── Resumo ───────────────────────────────────────────────────────────────
  console.log(`\n${passed} verificação(ões) passaram, ${failures.length} falharam.`);
  if (failures.length > 0) {
    failures.forEach((f) => console.error(`  ✗ ${f}`));
    process.exit(1);
  }
  console.log("TENANT GUARD OK");
  process.exit(0);
};

main().catch((error: any) => {
  console.error("Falha inesperada nos testes:", error?.stack || error);
  process.exit(1);
});
