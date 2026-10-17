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
 * TESTES DE INTEGRAÇÃO — CARTEIRA POR GESTOR + COBRANÇA DE CAMPO (SPRINT 6)
 *
 * Runner próprio (o projecto não tem test-runner):
 *   npx ts-node --transpile-only src/tests/collectionCobranca.test.ts
 *   (ou: npm run test:collection)
 *
 * Sobe as ROTAS REAIS por HTTP com dois Gestores, um Admin e clientes com
 * prestações vencidas, e verifica:
 *
 *  1. ESCOPO: o Gestor só vê a SUA carteira (clientes e créditos); o Admin vê tudo;
 *  2. COBRANÇA DE CAMPO: visita, ligação, promessa e recusa — a promessa guarda
 *     data prometida, valor prometido, observação e localização GPS;
 *  3. PROVA DE VISITAS: histórico auditável (quem, quando, onde) + contadores;
 *  4. PÁGINA COBRANÇA: clientes com prestações vencidas com filtros por dias de atraso;
 *  5. DASHBOARD DO GESTOR: total da carteira, PAR 30, a receber hoje, promessas do dia;
 *  6. RANKING por gestor (Admin) — 403 para o Gestor.
 *  7. PORTFÓLIO: a carteira inclui os clientes DISPONÍVEIS (sem gestor válido) e
 *     exclui os de outro Gestor de Crédito activo;
 *  8. ASSUMIR CARTEIRA: o cliente disponível passa para o gestor, o de outro
 *     gestor activo é recusado (409) sem alterar o dono.
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
let adminId = 0;
let gestorAId = 0;
let gestorBId = 0;
let adminToken = "";
let gestorAToken = "";
let gestorBToken = "";
let customerA = 0; // conta do gestor A
let customerB = 0; // conta do gestor B
let loanA = 0;
let loanB = 0;

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

const setupDatabase = async () => {
  const [companyInsertId] = await db.query(
    `INSERT INTO companies
       (companyName, companyEmail, companyWebsite, companyManager, companyNuit, companyPhone,
        districtId, provinceId, forfeit, companyAddress, companyStatus, createdAt, updatedAt)
     VALUES (?, ?, '', 'Teste Cobrança', '000000002', '840000004',
        155, 1, 0, 'Teste', 1, NOW(), NOW())`,
    { replacements: ["TESTE COBRANCA (apagar)", "teste.cobranca@local.invalid"] }
  );
  companyId = Number(companyInsertId);
  if (!companyId) throw new Error("Não foi possível criar a empresa de teste.");

  const insertUser = async (name: string, email: string, role: number): Promise<number> => {
    const [userId] = await db.query(
      `INSERT INTO users
         (name, email, password, updatedPassword, phone, companyId, status, userRole, createdAt, updatedAt)
       VALUES (?, ?, 'x', 0, '840000005', ?, 1, ?, NOW(), NOW())`,
      { replacements: [name, email, companyId, role] }
    );
    return Number(userId);
  };

  adminId = await insertUser("TESTE Admin Cobrança", `teste.cobranca.admin.${Date.now()}@local.invalid`, 1);
  gestorAId = await insertUser("TESTE Gestor A", `teste.cobranca.gestorA.${Date.now()}@local.invalid`, 3);
  gestorBId = await insertUser("TESTE Gestor B", `teste.cobranca.gestorB.${Date.now()}@local.invalid`, 3);

  adminToken = jwt.sign({ id: adminId, companyId }, process.env.APP_SECRET + "", { expiresIn: "1h" });
  gestorAToken = jwt.sign({ id: gestorAId, companyId }, process.env.APP_SECRET + "", { expiresIn: "1h" });
  gestorBToken = jwt.sign({ id: gestorBId, companyId }, process.env.APP_SECRET + "", { expiresIn: "1h" });

  // Dois clientes: um na carteira do Gestor A, outro do Gestor B.
  const insertCustomer = async (name: string, accountNumber: number, gestorId: number): Promise<number> => {
    const [customerId] = await db.query(
      `INSERT INTO customers
         (companyId, customerName, customerPhone, customerMonthlySalary, accountNumber, password, customerStatus, creditManager, createdAt, updatedAt)
       VALUES (?, ?, '258840000003', 500000, ?, 'teste-sem-login', 1, ?, NOW(), NOW())`,
      { replacements: [companyId, name, accountNumber, gestorId] }
    );
    return Number(customerId);
  };

  customerA = await insertCustomer("TEST Cobrança A", 900601, gestorAId);
  customerB = await insertCustomer("TEST Cobrança B", 900602, gestorBId);

  // Créditos activos com prestações vencidas (40 e 10 dias de atraso).
  const insertLoan = async (
    customerId: number,
    accountNumber: number,
    gestorId: number
  ): Promise<number> => {
    const [loanId] = await db.query(
      `INSERT INTO customer_loans
         (companyId, creditManager, accountNumber, customerId, amount, numberOfInstallments,
          interestRate, loanDescription, administrativeFee, rate_type, status, approvalState,
          disbursementDate, dateCreated, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 50000, 4, 0.1, 'Teste Cobrança', 0, 'MENSAL', 1, 'DESEMBOLSADO',
          CURDATE(), CURDATE(), NOW(), NOW())`,
      { replacements: [companyId, gestorId, accountNumber, customerId] }
    );
    return Number(loanId);
  };

  loanA = await insertLoan(customerA, 900601, gestorAId);
  loanB = await insertLoan(customerB, 900602, gestorBId);

  // Prestações: a do Gestor A venceu há 40 dias (PAR 30), a do Gestor B há 10.
  const insertInstallment = async (
    loanId: number,
    customerId: number,
    accountNumber: number,
    daysAgo: number
  ) => {
    await db.query(
      `INSERT INTO amortization_loans
         (companyId, loanId, installmentOrder, accountNumber, customerId,
          amortization, rateAmount, installment, remainingBalance, dueDate, status, paidAmount, mora_amount, mora_days, createdAt, updatedAt)
       VALUES (?, ?, '1ª', ?, ?, 20000, 0, 25000, 0, DATE_SUB(CURDATE(), INTERVAL ? DAY), 0, 0, 0, 0, NOW(), NOW())`,
      { replacements: [companyId, loanId, accountNumber, customerId, daysAgo] }
    );
    // 2.ª prestação do A vence hoje (valor a receber hoje).
    if (daysAgo > 30) {
      await db.query(
        `INSERT INTO amortization_loans
           (companyId, loanId, installmentOrder, accountNumber, customerId,
            amortization, rateAmount, installment, remainingBalance, dueDate, status, paidAmount, mora_amount, mora_days, createdAt, updatedAt)
         VALUES (?, ?, '2ª', ?, ?, 20000, 0, 25000, 0, CURDATE(), 0, 0, 0, 0, NOW(), NOW())`,
        { replacements: [companyId, loanId, accountNumber, customerId] }
      );
    }
  };

  await insertInstallment(loanA, customerA, 900601, 40);
  await insertInstallment(loanB, customerB, 900602, 10);
};

const cleanupDatabase = async () => {
  if (!companyId) return;
  const safe = async (sql: string, replacements: any[]) => {
    try {
      await db.query(sql, { replacements });
    } catch (error: any) {
      console.warn(`[cleanup] ${error?.message || error}`);
    }
  };
  await safe("DELETE FROM collection_activities WHERE companyId = ?", [companyId]);
  await safe(
    "DELETE FROM amortization_loans WHERE loanId IN (SELECT id FROM (SELECT id FROM customer_loans WHERE companyId = ?) AS loans)",
    [companyId]
  );
  await safe("DELETE FROM customer_loans WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM customers WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM user_logs WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM users WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM companies WHERE id = ?", [companyId]);
  console.log(`  · dados de teste limpos (empresa ${companyId})`);
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
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

// ── Testes ──────────────────────────────────────────────────────────────────
const main = async () => {
  process.env.APP_SECRET = process.env.APP_SECRET || "dev-secret";
  delete process.env.TENANT_MODE;

  await runMigrations();
  await setupDatabase();
  app = await startApp();

  console.log(`\nEmpresa: ${companyId} · Admin ${adminId} · GestorA ${gestorAId} · GestorB ${gestorBId}`);

  // ── 1. ESCOPO: o Gestor só vê a sua carteira ─────────────────────────────
  console.log("\n[1] Escopo por gestor — cada um vê a sua carteira");
  const loansAsGestorA = await call(`/api/loan/findAllLoans/all/${companyId}`, { token: gestorAToken });
  const loanRowsA: any[] = loansAsGestorA.body?.result || [];
  checkEqual(loanRowsA.length, 1, "Gestor A vê 1 crédito (o seu)");
  checkEqual(Number(loanRowsA[0]?.id), loanA, "o crédito visível é o da carteira do Gestor A");

  const loansAsAdmin = await call(`/api/loan/findAllLoans/all/${companyId}`, { token: adminToken });
  checkEqual((loansAsAdmin.body?.result || []).length, 2, "o Admin vê os 2 créditos");

  const loansAsGestorB = await call(`/api/loan/findAllLoans/all/${companyId}`, { token: gestorBToken });
  checkEqual(Number((loansAsGestorB.body?.result || [])[0]?.id), loanB, "Gestor B vê o crédito dele");

  const customersAsGestorA = await call(`/api/customers/${companyId}?limit=100`, { token: gestorAToken });
  const customerRowsA: any[] = customersAsGestorA.body?.result?.customers || customersAsGestorA.body?.result || [];
  const namesA = JSON.stringify(customerRowsA);
  check(namesA.includes("TEST Cobrança A"), "Gestor A vê o seu cliente");
  check(!namesA.includes("TEST Cobrança B"), "Gestor A NÃO vê o cliente do Gestor B");

  const customersAsAdmin = await call(`/api/customers/${companyId}?limit=100`, { token: adminToken });
  const namesAdmin = JSON.stringify(customersAsAdmin.body?.result || {});
  check(
    namesAdmin.includes("TEST Cobrança A") && namesAdmin.includes("TEST Cobrança B"),
    "o Admin vê todos os clientes"
  );

  // ── 2. Cobrança de campo: visita, ligação, promessa, recusa ──────────────
  console.log("\n[2] Cobrança de campo — registos com prova de quem fez o quê");
  const visita = await call("/api/collection/activities", {
    method: "POST",
    token: gestorAToken,
    body: {
      accountNumber: 900601,
      activityType: "VISITA_DOMICILIAR",
      notes: "Visita ao domicílio — mutuário ausente",
      latitude: -25.9692487,
      longitude: 32.5731748,
      gpsAccuracy: 12.5,
    },
  });
  checkEqual(visita.status, 201, "POST /api/collection/activities (visita) responde 201");
  checkEqual(visita.body?.result?.activityLabel, "Visita domiciliária", "visita registada");

  const ligacao = await call("/api/collection/activities", {
    method: "POST",
    token: gestorAToken,
    body: { accountNumber: 900601, activityType: "LIGACAO_TELEFONICA", notes: "Contacto telefónico — sem resposta" },
  });
  checkEqual(ligacao.status, 201, "ligação telefónica registada");

  // PROMESSA: data prometida + valor prometido + observação + GPS.
  const promessa = await call("/api/collection/activities", {
    method: "POST",
    token: gestorAToken,
    body: {
      accountNumber: 900601,
      activityType: "PROMESSA_PAGAMENTO",
      promisedDate: new Date().toISOString().slice(0, 10),
      promisedAmount: 15000,
      notes: "Mutuário prometeu pagar até sexta-feira",
      latitude: -25.9692487,
      longitude: 32.5731748,
      gpsAccuracy: 8,
    },
  });
  checkEqual(promessa.status, 201, "promessa de pagamento registada");

  const [promiseRows]: any = await db.query(
    "SELECT promisedDate, promisedAmount, notes, latitude, longitude, gpsAccuracy, status FROM collection_activities WHERE companyId = ? AND activityType = 'PROMESSA_PAGAMENTO'",
    { replacements: [companyId] }
  );
  const promiseRow: any = (promiseRows as any[])[0];
  checkEqual(
    String(promiseRow?.promisedDate),
    new Date().toISOString().slice(0, 10),
    "promessa guarda a DATA prometida"
  );
  checkEqual(Number(promiseRow?.promisedAmount), 15000, "promessa guarda o VALOR prometido");
  check(
    String(promiseRow?.notes || "").includes("sexta-feira"),
    "promessa guarda a OBSERVAÇÃO"
  );
  checkEqual(Number(promiseRow?.latitude), -25.9692487, "promessa guarda a LATITUDE GPS");
  checkEqual(Number(promiseRow?.longitude), 32.5731748, "promessa guarda a LONGITUDE GPS");
  check(Number(promiseRow?.gpsAccuracy) === 8, "promessa guarda a precisão GPS");
  checkEqual(promiseRow?.status, "PENDENTE", "promessa nasce PENDENTE");

  // Validações da promessa.
  const promessaSemData = await call("/api/collection/activities", {
    method: "POST",
    token: gestorAToken,
    body: { accountNumber: 900601, activityType: "PROMESSA_PAGAMENTO", promisedAmount: 5000 },
  });
  checkEqual(promessaSemData.status, 400, "promessa sem data prometida → 400");
  const promessaSemValor = await call("/api/collection/activities", {
    method: "POST",
    token: gestorAToken,
    body: { accountNumber: 900601, activityType: "PROMESSA_PAGAMENTO", promisedDate: "2026-12-01" },
  });
  checkEqual(promessaSemValor.status, 400, "promessa sem valor prometido → 400");

  // Escopo: o Gestor B não regista cobrança em clientes do Gestor A.
  const foraDaCarteira = await call("/api/collection/activities", {
    method: "POST",
    token: gestorBToken,
    body: { accountNumber: 900601, activityType: "VISITA_DOMICILIAR" },
  });
  checkEqual(foraDaCarteira.status, 403, "Gestor B não regista cobrança em cliente do Gestor A (403)");
  checkEqual(foraDaCarteira.body?.error, "OUT_OF_PORTFOLIO", "erro OUT_OF_PORTFOLIO");

  // Recusa.
  const recusa = await call("/api/collection/activities", {
    method: "POST",
    token: gestorBToken,
    body: { accountNumber: 900602, activityType: "RECUSA", notes: "Mutuário recusou qualquer pagamento" },
  });
  checkEqual(recusa.status, 201, "recusa registada (Gestor B, cliente dele)");

  // ── 3. Prova de visitas: histórico auditável ─────────────────────────────
  console.log("\n[3] Histórico de cobrança — prova de quantas visitas cada gestor fez");
  const historico = await call("/api/collection/activities?accountNumber=900601", { token: gestorAToken });
  const eventos: any[] = historico.body?.result || [];
  checkEqual(eventos.length, 3, "histórico do cliente tem 3 registos (visita, ligação, promessa)");
  check(
    eventos.every((e) => e.createdByName === "TESTE Gestor A" && !!e.activityDate),
    "cada registo prova QUEM fez e QUANDO"
  );
  checkEqual(
    eventos.filter((e) => e.activityType === "VISITA_DOMICILIAR").length,
    1,
    "contagem de visitas provável pelo histórico"
  );
  const historicoGestorB = await call("/api/collection/activities", { token: gestorBToken });
  const eventosB: any[] = historicoGestorB.body?.result || [];
  check(
    eventosB.length === 1 && eventosB[0]?.activityType === "RECUSA",
    "o Gestor B só vê as atividades da carteira dele"
  );

  // ── 4. Cobrança: vencidas com filtros por dias de atraso ─────────────────
  console.log("\n[4] Clientes com prestações vencidas — filtros por dias de atraso");
  const vencidasAdmin = await call("/api/collection/overdue", { token: adminToken });
  checkEqual(vencidasAdmin.status, 200, "GET /api/collection/overdue responde 200");
  const vencidas: any[] = vencidasAdmin.body?.result || [];
  checkEqual(vencidas.length, 2, "o Admin vê os 2 clientes com prestações vencidas");
  const linhaA = vencidas.find((v) => v.accountNumber === 900601);
  checkEqual(linhaA?.maxDaysLate, 40, "cliente A: 40 dias de atraso");
  checkEqual(linhaA?.totalOverdue, 25000, "cliente A: 25.000 em atraso (1 prestação vencida)");
  checkEqual(linhaA?.overdueCount, 1, "cliente A: 1 prestação vencida (a de hoje ainda não venceu)");
  check(
    linhaA?.lastActivity?.activityType === "PROMESSA_PAGAMENTO",
    "a linha mostra a última atividade de cobrança (prova do que já foi feito)"
  );

  const filtro31 = await call("/api/collection/overdue?minDays=31", { token: adminToken });
  const filtradas31: any[] = filtro31.body?.result || [];
  checkEqual(filtradas31.length, 1, "filtro 31+ dias: só o cliente A");
  checkEqual(Number(filtradas31[0]?.accountNumber), 900601, "é o cliente A");

  const filtro10 = await call("/api/collection/overdue?minDays=1&maxDays=20", { token: adminToken });
  const filtradas10: any[] = filtro10.body?.result || [];
  checkEqual(filtradas10.length, 1, "filtro 1-20 dias: só o cliente B");
  checkEqual(Number(filtradas10[0]?.accountNumber), 900602, "é o cliente B");

  const vencidasGestorA = await call("/api/collection/overdue", { token: gestorAToken });
  const vencidasA: any[] = vencidasGestorA.body?.result || [];
  checkEqual(vencidasA.length, 1, "o Gestor A vê só as vencidas da carteira dele");
  checkEqual(Number(vencidasA[0]?.accountNumber), 900601, "é o seu cliente");

  // ── 5. Dashboard do Gestor ──────────────────────────────────────────────
  console.log("\n[5] Dashboard do Gestor — carteira, PAR 30, a receber hoje, promessas do dia");
  const dashboard = await call("/api/collection/dashboard", { token: gestorAToken });
  checkEqual(dashboard.status, 200, "GET /api/collection/dashboard responde 200");
  const dash = dashboard.body?.result || {};
  checkEqual(dash.totalCarteira, 50000, "total da carteira = 50.000 em dívida (2 prestações de 25.000)");
  checkEqual(dash.par30, 50000, "PAR 30 = 50.000 (crédito com atraso > 30 dias)");
  checkEqual(dash.aReceberHoje, 25000, "a receber hoje = 25.000 (prestação que vence hoje)");
  checkEqual(dash.promessasDoDia, 1, "promessas do dia = 1 (prometida para hoje)");
  checkEqual(dash.valorPrometidoHoje, 15000, "valor prometido hoje = 15.000");
  checkEqual(dash.atividadesMes?.visitas, 1, "visitas do mês = 1 (prova de cobrança)");
  checkEqual(dash.atividadesMes?.chamadas, 1, "chamadas do mês = 1");
  checkEqual(dash.atividadesMes?.promessas, 1, "promessas do mês = 1");

  const dashGestorB = await call("/api/collection/dashboard", { token: gestorBToken });
  const dashB = dashGestorB.body?.result || {};
  checkEqual(dashB.par30, 0, "Gestor B: PAR 30 = 0 (atraso de 10 dias não conta)");
  checkEqual(dashB.atividadesMes?.visitas, 0, "Gestor B: sem visitas — cada um responde pela sua meta");

  // ── 6. Ranking por gestor (Admin) ───────────────────────────────────────
  console.log("\n[6] Ranking por gestor — Admin vê, Gestor não");
  const ranking = await call("/api/collection/ranking", { token: adminToken });
  checkEqual(ranking.status, 200, "GET /api/collection/ranking (Admin) responde 200");
  const rankingRows: any[] = ranking.body?.result || [];
  checkEqual(rankingRows.length, 2, "ranking com os 2 gestores");
  const rankA = rankingRows.find((r) => r.gestorId === gestorAId);
  const rankB = rankingRows.find((r) => r.gestorId === gestorBId);
  checkEqual(rankA?.visitasMes, 1, "ranking prova as visitas do Gestor A");
  checkEqual(rankA?.carteira, 50000, "ranking mostra a carteira do Gestor A");
  checkEqual(rankB?.promessasMes, 0, "Gestor B sem promessas no mês");
  checkEqual(rankA?.clientes, 1, "ranking conta os clientes por gestor");

  const rankingGestor = await call("/api/collection/ranking", { token: gestorAToken });
  checkEqual(rankingGestor.status, 403, "o Gestor NÃO acede ao ranking (403)");

  // ── 7. Portfólio da carteira: atribuídos + disponíveis ─────────────────
  console.log("\n[7] Portfólio da carteira — clientes atribuídos + disponíveis");
  // Cliente SEM gestor válido: o cliente não tem `creditManager` e o crédito
  // aponta para um Administrador (que não é Gestor de Crédito) — é o que resta
  // quando o gestor antigo é apagado ou promovido. Existe na empresa, não
  // pertence a ninguém: é a parte da carteira que o ecrã «A Minha Carteira»
  // tem de mostrar e deixar cobrar sem esperar por uma atribuição.
  const [clienteDisponivelId] = await db.query(
    `INSERT INTO customers
       (companyId, customerName, customerPhone, customerMonthlySalary, accountNumber, password, customerStatus, creditManager, createdAt, updatedAt)
     VALUES (?, 'TEST Cobrança Disponível', '258840000006', 400000, 900603, 'teste-sem-login', 1, NULL, NOW(), NOW())`,
    { replacements: [companyId] }
  );
  const [loanCId] = await db.query(
    `INSERT INTO customer_loans
       (companyId, creditManager, accountNumber, customerId, amount, numberOfInstallments,
        interestRate, loanDescription, administrativeFee, rate_type, status, approvalState,
        disbursementDate, dateCreated, createdAt, updatedAt)
     VALUES (?, ?, 900603, ?, 30000, 2, 0.1, 'Teste Cobrança', 0, 'MENSAL', 1, 'DESEMBOLSADO',
        CURDATE(), CURDATE(), NOW(), NOW())`,
    { replacements: [companyId, adminId, clienteDisponivelId] }
  );
  await db.query(
    `INSERT INTO amortization_loans
       (companyId, loanId, installmentOrder, accountNumber, customerId,
        amortization, rateAmount, installment, remainingBalance, dueDate, status, paidAmount, mora_amount, mora_days, createdAt, updatedAt)
     VALUES (?, ?, '1ª', 900603, ?, 15000, 0, 15000, 15000, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 0, 0, 0, 0, NOW(), NOW())`,
    { replacements: [companyId, loanCId, clienteDisponivelId] }
  );

  const portfolioA = await call("/api/collection/portfolio", { token: gestorAToken });
  checkEqual(portfolioA.status, 200, "GET /api/collection/portfolio responde 200");
  const carteiraA: any[] = portfolioA.body?.result?.rows || [];
  checkEqual(
    carteiraA.map((r) => Number(r.accountNumber)).sort((a, b) => a - b),
    [900601, 900603],
    "a carteira do Gestor A tem o seu cliente e o cliente disponível"
  );
  check(
    !carteiraA.some((r) => Number(r.accountNumber) === 900602),
    "o cliente de outro Gestor de Crédito activo NÃO entra nesta carteira"
  );
  const disponivel = carteiraA.find((r) => Number(r.accountNumber) === 900603);
  checkEqual(disponivel?.available, true, "o cliente sem gestor válido aparece como DISPONÍVEL");
  checkEqual(disponivel?.ownerName, null, "o cliente disponível não tem gestor atribuído");
  checkEqual(disponivel?.overdueCount, 0, "cliente disponível sem prestações vencidas");
  const proximoVencimento: any = await db.query(
    "SELECT DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 15 DAY), '%Y-%m-%d') AS d",
    { type: QueryTypes.SELECT }
  );
  checkEqual(
    disponivel?.nextDueDate,
    (proximoVencimento as any[])[0]?.d,
    "o portfólio mostra o PRÓXIMO VENCIMENTO do cliente"
  );
  checkEqual(portfolioA.body?.result?.totals?.clientes, 2, "totais: 2 clientes na lista");
  checkEqual(portfolioA.body?.result?.totals?.disponiveis, 1, "totais: 1 cliente disponível para assumir");
  checkEqual(portfolioA.body?.result?.totals?.comAtraso, 1, "totais: 1 cliente em atraso");

  const soAtraso = await call("/api/collection/portfolio?onlyOverdue=1", { token: gestorAToken });
  checkEqual(
    (soAtraso.body?.result?.rows || []).map((r: any) => Number(r.accountNumber)),
    [900601],
    "filtro «só em atraso» deixa de fora o cliente disponível sem atraso"
  );
  const pesquisa = await call("/api/collection/portfolio?search=Dispon%C3%ADvel", { token: gestorBToken });
  checkEqual(
    (pesquisa.body?.result?.rows || []).map((r: any) => Number(r.accountNumber)),
    [900603],
    "pesquisa por nome encontra o cliente disponível"
  );

  // Cobrar um cliente disponível — sem o assumir primeiro.
  const visitaDisponivel = await call("/api/collection/activities", {
    method: "POST",
    token: gestorBToken,
    body: { accountNumber: 900603, activityType: "VISITA_DOMICILIAR", notes: "Visita a cliente disponível" },
  });
  checkEqual(visitaDisponivel.status, 201, "o Gestor cobra um cliente DISPONÍVEL (visita registada)");
  const promessaDisponivel = await call("/api/collection/activities", {
    method: "POST",
    token: gestorBToken,
    body: {
      accountNumber: 900603,
      activityType: "PROMESSA_PAGAMENTO",
      promisedDate: new Date().toISOString().slice(0, 10),
      promisedAmount: 12000,
    },
  });
  checkEqual(promessaDisponivel.status, 201, "promessa de pagamento no cliente disponível");
  const portfolioComPromessa = await call("/api/collection/portfolio", { token: gestorBToken });
  const linhaPromessa = (portfolioComPromessa.body?.result?.rows || []).find(
    (r: any) => Number(r.accountNumber) === 900603
  );
  checkEqual(
    linhaPromessa?.pendingPromise?.promisedAmount,
    12000,
    "o portfólio mostra a promessa PENDENTE (última cobrança + valor prometido)"
  );

  // ── 8. Assumir carteira (claim) ────────────────────────────────────────
  console.log("\n[8] Assumir carteira — disponível passa para o gestor");
  const roubo = await call("/api/collection/claim", {
    method: "POST",
    token: gestorBToken,
    body: { accountNumber: 900601 },
  });
  checkEqual(roubo.status, 409, "assumir o cliente de outro Gestor activo → 409");
  checkEqual(roubo.body?.error, "ALREADY_ASSIGNED", "erro ALREADY_ASSIGNED");
  const donoA: any = await db.query("SELECT creditManager FROM customers WHERE id = ?", {
    replacements: [customerA],
    type: QueryTypes.SELECT,
  });
  checkEqual(
    Number((donoA as any[])[0]?.creditManager),
    gestorAId,
    "o cliente do Gestor A continua com o mesmo gestor (nada foi roubado)"
  );

  const assumir = await call("/api/collection/claim", {
    method: "POST",
    token: gestorBToken,
    body: { accountNumber: 900603 },
  });
  checkEqual(assumir.status, 200, "o Gestor B assume o cliente disponível");
  checkEqual(assumir.body?.result?.loansAffected, 1, "o crédito sem gestor passou também para ele");
  const donoDepois: any = await db.query("SELECT creditManager FROM customers WHERE id = ?", {
    replacements: [clienteDisponivelId],
    type: QueryTypes.SELECT,
  });
  checkEqual(
    Number((donoDepois as any[])[0]?.creditManager),
    gestorBId,
    "o cliente passou a ser da carteira do Gestor B"
  );

  const portfolioA2 = await call("/api/collection/portfolio", { token: gestorAToken });
  const contasA2: number[] = (portfolioA2.body?.result?.rows || []).map((r: any) => Number(r.accountNumber));
  check(
    !contasA2.includes(900603),
    "depois de assumido, o cliente sai da lista do Gestor A (deixou de estar disponível)"
  );
  const portfolioB2 = await call("/api/collection/portfolio", { token: gestorBToken });
  const linhaB = (portfolioB2.body?.result?.rows || []).find((r: any) => Number(r.accountNumber) === 900603);
  checkEqual(linhaB?.available, false, "para o Gestor B o cliente deixa de estar disponível");
  checkEqual(linhaB?.ownerName, "TESTE Gestor B", "o portfólio mostra o novo responsável");
  checkEqual(
    portfolioB2.body?.result?.totals?.disponiveis,
    0,
    "já não há clientes disponíveis nesta empresa"
  );

  const assumirDeNovo = await call("/api/collection/claim", {
    method: "POST",
    token: gestorBToken,
    body: { accountNumber: 900603 },
  });
  checkEqual(assumirDeNovo.status, 200, "assumir um cliente que já é meu é idempotente (200)");

  // ── Resultado ────────────────────────────────────────────────────────────
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
    } catch { /* já fechada */ }
    process.exit(process.exitCode || 0);
  });
