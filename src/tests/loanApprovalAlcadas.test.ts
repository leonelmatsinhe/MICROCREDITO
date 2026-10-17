import "../config/env"; // carrega .env ANTES de qualquer conexão (DATABASE_* etc.)
import express from "express";
import bodyParser from "body-parser";
import * as jwt from "jsonwebtoken";
import * as fs from "fs";
import { Server } from "http";
import { db } from "../database/db";
import { tenantGuard } from "../middlewares/tenantGuard";
import { routes } from "../routes";
import { runMigrations } from "../migrations";

/**
 * TESTES DE INTEGRAÇÃO — ALÇADAS DE APROVAÇÃO (modelo Admin único)
 *
 * Runner próprio (o projecto não tem test-runner):
 *   npx ts-node --transpile-only src/tests/loanApprovalAlcadas.test.ts
 *   (ou: npm run test:approvals)
 *
 * Sobe as ROTAS REAIS por HTTP (mesma ordem de middlewares do src/app.ts) numa
 * empresa/utilizadores temporários (criados e apagados no fim) e verifica:
 *
 *  1. Modelo de alçadas: APROVAÇÃO E DESEMBOLSO EXCLUSIVOS DO ADMIN (único);
 *     o Gestor de Crédito apenas lança e valida a instrução do processo;
 *  2. Um Gestor que tente aprovar (qualquer valor) recebe mensagem de alçada
 *     insuficiente (403) — também pela rota legada PUT /api/loan/:id;
 *  3. Um crédito (ex.: 150.000) SÓ SAI depois de aprovado pelo Admin e o
 *     desembolso é do Admin — o Gestor não pode desembolsar (403);
 *  4. APROVAR não mexe no caixa (0 movimentos); DESEMBOLSAR mexe;
 *  5. Estados do crédito: RASCUNHO · AGUARDANDO_APROVACAO ·
 *     APROVADO_PARCIALMENTE · APROVADO · REPROVADO · AGUARDANDO_DESEMBOLSO ·
 *     DESEMBOLSADO;
 *  6. Linha do tempo auditável: quem aprovou, quando e com que parecer.
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

// ── Infra de teste ──────────────────────────────────────────────────────────
let app: { port: number; close: () => Promise<void> } | null = null;
let companyId = 0;
let customerId = 0;
let accountNumber = 900501;
let walletId = 0;
let admin1Id = 0;
let admin2Id = 0;
let gestorId = 0;
let operadorId = 0;
let admin1Token = "";
let admin2Token = "";
let gestorToken = "";
let operadorToken = "";
const createdLoanIds: number[] = [];

const call = async (
  path: string,
  init: { method?: string; body?: any; token?: string } = {}
): Promise<{ status: number; body: any; raw: string }> => {
  const response = await fetch(`http://127.0.0.1:${app!.port}${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${init.token || admin1Token}`,
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
  // Empresa e utilizadores temporários — o teste NUNCA toca nos dados reais.
  const [companyInsertId] = await db.query(
    `INSERT INTO companies
       (companyName, companyEmail, companyWebsite, companyManager, companyNuit, companyPhone,
        districtId, provinceId, forfeit, companyAddress, companyStatus, cash_register_mode,
        createdAt, updatedAt)
     VALUES (?, ?, '', 'Teste Alçadas', '000000001', '840000002',
        155, 1, 0, 'Teste', 1, 'PHYSICAL', NOW(), NOW())`,
    // cash_register_mode: o desembolso aqui testado exige caixa aberto (PHYSICAL).
    { replacements: ["TESTE ALCADAS (apagar)", "teste.alcadas@local.invalid"] }
  );
  companyId = Number(companyInsertId);
  if (!companyId) throw new Error("Não foi possível criar a empresa de teste.");

  const insertUser = async (name: string, email: string, role: number): Promise<number> => {
    const [userId] = await db.query(
      `INSERT INTO users
         (name, email, password, updatedPassword, phone, companyId, status, userRole, createdAt, updatedAt)
       VALUES (?, ?, 'x', 0, '840000003', ?, 1, ?, NOW(), NOW())`,
      { replacements: [name, email, companyId, role] }
    );
    return Number(userId);
  };

  admin1Id = await insertUser("TESTE Admin Alçadas 1", `teste.alcadas.admin1.${Date.now()}@local.invalid`, 1);
  admin2Id = await insertUser("TESTE Admin Alçadas 2", `teste.alcadas.admin2.${Date.now()}@local.invalid`, 1);
  gestorId = await insertUser("TESTE Gestor Alçadas", `teste.alcadas.gestor.${Date.now()}@local.invalid`, 3);
  operadorId = await insertUser("TESTE Operador Alçadas", `teste.alcadas.operador.${Date.now()}@local.invalid`, 2);

  admin1Token = jwt.sign({ id: admin1Id, companyId }, process.env.APP_SECRET + "", { expiresIn: "1h" });
  admin2Token = jwt.sign({ id: admin2Id, companyId }, process.env.APP_SECRET + "", { expiresIn: "1h" });
  gestorToken = jwt.sign({ id: gestorId, companyId }, process.env.APP_SECRET + "", { expiresIn: "1h" });
  operadorToken = jwt.sign({ id: operadorId, companyId }, process.env.APP_SECRET + "", { expiresIn: "1h" });

  // Mutuário com rendimento folgado (capacidade 1/3 nunca bloqueia os testes).
  const [customerInsertId] = await db.query(
    `INSERT INTO customers
       (companyId, customerName, customerPhone, customerMonthlySalary, accountNumber, password, customerStatus, createdAt, updatedAt)
     VALUES (?, 'TEST Alçadas', '258840000002', 500000, ?, 'teste-sem-login', 1, NOW(), NOW())`,
    { replacements: [companyId, accountNumber] }
  );
  customerId = Number(customerInsertId);

  // KYC completo (os 3 documentos base com ficheiro) — o desembolso exige-o.
  for (const docName of [
    "BI / Passaporte / Carta de condução",
    "NUIT",
    "Comprovativo de rendimentos",
  ]) {
    await db.query(
      `INSERT INTO customer_documents (companyId, accountNumber, documentName, documentFileUrl, uploadedBy, createdAt, updatedAt)
       VALUES (?, ?, ?, 'teste://doc.pdf', ?, NOW(), NOW())`,
      { replacements: [companyId, accountNumber, docName, admin1Id] }
    );
  }

  // Carteira de financiamento sem capital alocado (ilimitado analiticamente).
  const [walletInsertId] = await db.query(
    `INSERT INTO financing_wallets
       (companyId, codigo, nome, tipo, allocated_amount, initial_disbursed_amount, is_ativa, tem_portal, portal_ativo, created_at, updated_at)
     VALUES (?, 'TEST_ALC', 'Carteira Teste Alçadas', 'FINANCIAMENTO', NULL, 0, 1, 0, 1, NOW(), NOW())`,
    { replacements: [companyId] }
  );
  walletId = Number(walletInsertId);
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

  // Pacotes de concessão gerados no desembolso → apagar ficheiros + linhas.
  try {
    const [packages]: any = await db.query(
      "SELECT storage_dir FROM concession_packages WHERE companyId = ?",
      { replacements: [companyId] }
    );
    for (const row of packages as any[]) {
      if (row.storage_dir) {
        try {
          fs.rmSync(String(row.storage_dir), { recursive: true, force: true });
        } catch { /* best-effort */ }
      }
    }
  } catch { /* tabela pode não existir */ }

  await safe("DELETE FROM loan_approvals WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM concession_packages WHERE companyId = ?", [companyId]);
  await safe(
    "DELETE FROM loan_guarantees WHERE loanId IN (SELECT id FROM (SELECT id FROM customer_loans WHERE companyId = ?) AS loans)",
    [companyId]
  );
  await safe(
    "DELETE FROM amortization_loans WHERE loanId IN (SELECT id FROM (SELECT id FROM customer_loans WHERE companyId = ?) AS loans)",
    [companyId]
  );
  await safe("DELETE FROM notifications WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM customer_documents WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM customer_loans WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM customers WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM financing_wallets WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM cash_movements WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM cash_differences WHERE companyId = ?", [companyId]);
  await safe("DELETE FROM cash_registers WHERE companyId = ?", [companyId]);
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

// ── Helpers de domínio ──────────────────────────────────────────────────────

/** Cria um crédito (SQL, como os dados históricos) + garantia que cobre o total. */
const createTestLoan = async (params: {
  amount: number;
  installments?: number;
  rate?: number;
  approvalState?: string;
}): Promise<number> => {
  const [loanInsertId] = await db.query(
    `INSERT INTO customer_loans
       (companyId, creditManager, accountNumber, customerId, amount, numberOfInstallments,
        interestRate, loanDescription, administrativeFee, rate_type, status, approvalState,
        dateCreated, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Teste Alçadas', 0, 'MENSAL', 0, ?, CURDATE(), NOW(), NOW())`,
    {
      replacements: [
        companyId,
        admin1Id,
        accountNumber,
        customerId,
        params.amount,
        params.installments ?? 6,
        params.rate ?? 0.1,
        params.approvalState ?? "AGUARDANDO_APROVACAO",
      ],
    }
  );
  const loanId = Number(loanInsertId);
  createdLoanIds.push(loanId);
  await db.query(
    `INSERT INTO loan_guarantees (loanId, guaranteeDescription, guaranteeFileUrl, purchaseAmount, status, createdAt, updatedAt)
     VALUES (?, 'Garantia de teste (alçadas)', 'teste://garantia.pdf', 9999999.00, 1, NOW(), NOW())`,
    { replacements: [loanId] }
  );
  return loanId;
};

const getLoanRow = async (loanId: number) => {
  const [rows]: any = await db.query(
    "SELECT status, approvalState FROM customer_loans WHERE id = ?",
    { replacements: [loanId] }
  );
  return (rows as any[])[0] || null;
};

const countCashMovements = async (): Promise<number> => {
  const [rows]: any = await db.query(
    "SELECT COUNT(*) AS n FROM cash_movements WHERE companyId = ?",
    { replacements: [companyId] }
  );
  return Number((rows as any[])[0]?.n) || 0;
};

const countInstallments = async (loanId: number): Promise<number> => {
  const [rows]: any = await db.query(
    "SELECT COUNT(*) AS n FROM amortization_loans WHERE loanId = ?",
    { replacements: [loanId] }
  );
  return Number((rows as any[])[0]?.n) || 0;
};

const getTimeline = async (loanId: number, token?: string) =>
  call(`/api/loan/${loanId}/approval-timeline`, { token });

const approve = async (loanId: number, token: string, notes?: string) =>
  call(`/api/loan/${loanId}/approve`, { method: "POST", token, body: { notes: notes || null } });

const disburse = async (loanId: number, token: string) =>
  call("/api/createInstallmentsLoan/", {
    method: "POST",
    token,
    body: {
      companyId,
      loanId,
      accountNumber,
      interestRate: 0.1,
      numberOfInstallments: 12,
      amount: 150000,
      dueDate: new Date().toISOString().slice(0, 10),
      status: 0,
      walletId,
      payment_method: "CASH",
      admin_fee_value: 0,
    },
  });

// ── Testes ──────────────────────────────────────────────────────────────────
const main = async () => {
  process.env.APP_SECRET = process.env.APP_SECRET || "dev-secret";
  delete process.env.TENANT_MODE; // guard de tenant inerte (modo multi)
  process.env.CASH_LIMIT_MZN = "75000";

  // Schema actualizado ANTES de tudo (as migrações correm no arranque real).
  await runMigrations();

  await setupDatabase();
  app = await startApp();

  console.log(
    `\nEmpresa de teste: ${companyId} · Admin1 ${admin1Id} · Admin2 ${admin2Id} · Gestor ${gestorId} · Operador ${operadorId}`
  );

  // ── 0. Schema + regras semeadas ──────────────────────────────────────────
  console.log("\n[0] Schema — tabela de regras de aprovação (Admin único)");
  const [ruleRows]: any = await db.query(
    "SELECT role, minAmount, maxAmount, requiredApprovals, distinctApprovers FROM approval_rules WHERE companyId IS NULL ORDER BY id"
  );
  const rules = ruleRows as any[];
  check(rules.length >= 1, "approval_rules tem regras globais");
  const gestorRule = rules.find((r) => r.role === "GESTOR");
  check(!gestorRule, "GESTOR sem alçada de aprovação (sem regra activa)");
  const adminRule = rules.find((r) => r.role === "ADMIN");
  check(!!adminRule, "regra ADMIN existe (aprovação exclusiva do Admin)");
  check(
    adminRule?.maxAmount === null || adminRule?.maxAmount === undefined,
    "ADMIN: sem limite de valor"
  );
  checkEqual(Number(adminRule?.requiredApprovals), 1, "ADMIN: 1 aprovação (Admin único)");
  const [timelineTables]: any = await db.query("SHOW TABLES LIKE 'loan_approvals'");
  check((timelineTables as any[]).length === 1, "tabela loan_approvals existe (linha do tempo)");
  const [loanColumns]: any = await db.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_loans' AND COLUMN_NAME = 'approvalState'"
  );
  check((loanColumns as any[]).length === 1, "customer_loans.approvalState existe (estado do ciclo)");

  // ── 1. ACEITAÇÃO: Gestor a aprovar 30.000 → alçada insuficiente ─────────
  console.log("\n[1] Alçada insuficiente — Gestor tenta aprovar 30.000 MT");
  const loan30k = await createTestLoan({ amount: 30000 });
  const gestorTry = await approve(loan30k, gestorToken, "Tento aprovar eu mesmo");
  checkEqual(gestorTry.status, 403, "POST /approve (Gestor, 30.000) responde 403");
  checkEqual(gestorTry.body?.error, "INSUFFICIENT_AUTHORITY", "erro INSUFFICIENT_AUTHORITY");
  check(
    /Alçada insuficiente/i.test(String(gestorTry.body?.message || "")),
    `mensagem de alçada insuficiente: "${gestorTry.body?.message}"`
  );
  check(
    /exclusivos do Administrador/i.test(String(gestorTry.body?.message || "")),
    "a mensagem indica que a aprovação é exclusiva do Administrador"
  );
  const loan30kRow = await getLoanRow(loan30k);
  check(
    String(loan30kRow?.approvalState) !== "APROVADO",
    "o crédito NÃO ficou aprovado (estado intacto)"
  );

  // ── 2. Gestor SEM alçada — valida a instrução, o Admin aprova ────────────
  console.log("\n[2] Gestor sem alçada — lança e valida a instrução, o Admin aprova");
  const loan20k = await createTestLoan({ amount: 20000, approvalState: "RASCUNHO" });
  const gestorValida = await call(`/api/loan/${loan20k}/submit`, {
    method: "POST",
    token: gestorToken,
    body: { notes: "Instrução completa — validada para aprovação" },
  });
  checkEqual(gestorValida.status, 200, "Gestor valida a instrução (POST /submit)");
  checkEqual(gestorValida.body?.approvalState, "AGUARDANDO_APROVACAO", "instrução validada → AGUARDANDO_APROVACAO");
  const gestorOk = await approve(loan20k, gestorToken, "Tento aprovar dentro do valor");
  checkEqual(gestorOk.status, 403, "Gestor NÃO aprova nem 20.000 (403)");
  check(
    /Alçada insuficiente/i.test(String(gestorOk.body?.message || "")),
    "Gestor recebe mensagem de alçada insuficiente"
  );
  const adminOk = await approve(loan20k, admin1Token, "Aprovação do Admin");
  checkEqual(adminOk.status, 200, "o Admin aprova a instrução validada");
  checkEqual(adminOk.body?.approvalState, "APROVADO", "estado APROVADO (1 de 1)");
  const loan20kRow = await getLoanRow(loan20k);
  checkEqual(loan20kRow?.approvalState, "APROVADO", "customer_loans.approvalState = APROVADO");
  checkEqual(Number(loan20kRow?.status), 0, "status legado mantém 0 (pendente de desembolso)");
  checkEqual(await countCashMovements(), 0, "APROVAR não mexeu no caixa (0 movimentos)");

  // ── 3. Admin único aprova qualquer valor com 1 aprovação ─────────────────
  console.log("\n[3] Admin único aprova 90.000 MT (1 aprovação)");
  const loan90k = await createTestLoan({ amount: 90000 });
  const admin90k = await approve(loan90k, admin1Token);
  checkEqual(admin90k.status, 200, "POST /approve (Admin, 90.000) responde 200");
  checkEqual(admin90k.body?.approvalState, "APROVADO", "estado APROVADO (1 de 1)");
  checkEqual(await countCashMovements(), 0, "APROVAR não mexeu no caixa (0 movimentos)");

  // ── 4. ACEITAÇÃO: 150.000 só sai depois de APROVADO e pelo Admin ────────
  console.log("\n[4] Admin único — 150.000 MT só sai depois da aprovação do Admin");
  const loan150k = await createTestLoan({ amount: 150000, installments: 12 });

  // Abre o caixa do Admin1 (o desembolso exige caixa aberto — middleware).
  const opened = await call("/api/cash-registers/open", {
    method: "POST",
    body: { denominations: { "1000": 10 } },
    token: admin1Token,
  });
  checkEqual(opened.status, 201, "caixa aberto para o desembolso");

  // ANTES de aprovar: o dinheiro não sai.
  const earlyDisburse = await disburse(loan150k, admin1Token);
  checkEqual(earlyDisburse.status, 409, "desembolso sem aprovação é bloqueado (409)");
  checkEqual(earlyDisburse.body?.error, "APPROVAL_REQUIRED", "erro APPROVAL_REQUIRED");
  checkEqual(await countInstallments(loan150k), 0, "nenhum plano de amortização foi criado");
  checkEqual(await countCashMovements(), 0, "o caixa continuou intacto (dinheiro não saiu)");

  const gestorOn150k = await approve(loan150k, gestorToken);
  checkEqual(gestorOn150k.status, 403, "Gestor não aprova 150.000 (403)");
  check(
    /Alçada insuficiente/i.test(String(gestorOn150k.body?.message || "")),
    "Gestor recebe mensagem de alçada insuficiente"
  );

  const operadorOn150k = await approve(loan150k, operadorToken);
  checkEqual(operadorOn150k.status, 403, "Operador não tem alçada (403)");

  const firstApproval = await approve(loan150k, admin1Token, "Aprovação do Admin");
  checkEqual(firstApproval.status, 200, "aprovação do Admin responde 200");
  checkEqual(firstApproval.body?.approvalState, "APROVADO", "estado APROVADO (1 de 1)");
  checkEqual(firstApproval.body?.approvalsCount, 1, "approvalsCount = 1");
  checkEqual(firstApproval.body?.requiredApprovals, 1, "requiredApprovals = 1 (Admin único)");

  const secondAdmin = await approve(loan150k, admin2Token);
  checkEqual(secondAdmin.status, 409, "crédito já aprovado não aprova de novo (409)");

  // Linha do tempo: quem aprovou e quando.
  const timelineBefore = await getTimeline(loan150k, admin1Token);
  const eventsBefore: any[] = timelineBefore.body?.result || [];
  const approvalEvents = eventsBefore.filter((e) => e.event === "APROVACAO");
  checkEqual(approvalEvents.length, 1, "linha do tempo tem 1 evento APROVACAO");
  checkEqual(approvalEvents[0]?.approvalsCount, 1, "o evento de aprovação regista 1 de 1");
  checkEqual(approvalEvents[0]?.actorName, "TESTE Admin Alçadas 1", "a linha do tempo identifica quem aprovou");
  check(!!approvalEvents[0]?.createdAt, "a aprovação tem data/hora");

  // O desembolso é do Admin — o Gestor não mexe no caixa.
  const gestorDisburse = await disburse(loan150k, gestorToken);
  checkEqual(gestorDisburse.status, 403, "Gestor não pode desembolsar (403)");
  check(
    /Apenas o Administrador/i.test(String(gestorDisburse.body?.message || "")),
    `mensagem: desembolso exclusivo do Administrador: "${gestorDisburse.body?.message}"`
  );

  // Agora SÓ agora o dinheiro pode sair.
  const okDisburse = await disburse(loan150k, admin1Token);
  checkEqual(okDisburse.status, 200, "desembolso pelo Admin responde 200");
  checkEqual(okDisburse.body?.success, true, "plano de amortização criado");
  const loan150kRow = await getLoanRow(loan150k);
  checkEqual(loan150kRow?.approvalState, "DESEMBOLSADO", "estado DESEMBOLSADO");
  checkEqual(Number(loan150kRow?.status), 1, "status legado 1 (desembolsado)");
  checkEqual(await countInstallments(loan150k), 12, "12 prestações criadas");
  check((await countCashMovements()) > 0, "DESEMBOLSAR mexeu no caixa (movimento registado)");

  const timelineAfter = await getTimeline(loan150k, admin1Token);
  const eventsAfter: any[] = timelineAfter.body?.result || [];
  const disburseEvent = eventsAfter.find((e) => e.event === "DESEMBOLSO");
  check(!!disburseEvent, "linha do tempo regista o desembolso (quem e quando)");
  checkEqual(disburseEvent?.actorName, "TESTE Admin Alçadas 1", "o desembolso identifica o Admin");

  const approveAfterDisburse = await approve(loan150k, admin2Token);
  checkEqual(approveAfterDisburse.status, 409, "um crédito desembolsado já não se aprova (409)");

  // ── 5. Reprovação com parecer e reabertura (decisões do Admin) ───────────
  console.log("\n[5] Reprovação com parecer e reabertura");
  const loan50k = await createTestLoan({ amount: 50000 });
  const gestorReject = await call(`/api/loan/${loan50k}/reject`, {
    method: "POST",
    token: gestorToken,
    body: { reason: "Tento reprovar eu mesmo" },
  });
  checkEqual(gestorReject.status, 403, "Gestor não reprova créditos (403)");
  const reject = await call(`/api/loan/${loan50k}/reject`, {
    method: "POST",
    token: admin1Token,
    body: { reason: "Garantias fracas para o perfil do mutuário" },
  });
  checkEqual(reject.status, 200, "POST /reject pelo Admin responde 200");
  checkEqual(reject.body?.approvalState, "REPROVADO", "estado REPROVADO");
  const loan50kRow = await getLoanRow(loan50k);
  checkEqual(Number(loan50kRow?.status), -1, "status legado -1 (rejeitado)");

  const approveRejected = await approve(loan50k, admin1Token);
  checkEqual(approveRejected.status, 409, "um crédito reprovado não aprova (409)");
  checkEqual(approveRejected.body?.error, "INVALID_STATE", "erro INVALID_STATE");

  const reopen = await call(`/api/loan/${loan50k}`, {
    method: "PUT",
    token: admin1Token,
    body: { status: 0 },
  });
  checkEqual(reopen.status, 200, "PUT /api/loan/:id {status:0} reabre o pedido");
  const reopenedRow = await getLoanRow(loan50k);
  checkEqual(reopenedRow?.approvalState, "AGUARDANDO_APROVACAO", "reaberto → AGUARDANDO_APROVACAO");

  const approveReopened = await approve(loan50k, admin1Token, "Nova análise");
  checkEqual(approveReopened.status, 200, "após reabrir, o Admin aprova");
  checkEqual(approveReopened.body?.approvalState, "APROVADO", "estado APROVADO");

  // ── 6. Rascunho → o Gestor valida → o Admin aprova ───────────────────────
  console.log("\n[6] Estado Rascunho — o Gestor valida, o Admin aprova");
  const draft = await createTestLoan({ amount: 15000, approvalState: "RASCUNHO" });
  const approveDraft = await approve(draft, admin1Token);
  checkEqual(approveDraft.status, 409, "um rascunho não aprova directamente (409)");
  const submit = await call(`/api/loan/${draft}/submit`, {
    method: "POST",
    token: gestorToken,
    body: { notes: "Instrução pronta para análise" },
  });
  checkEqual(submit.status, 200, "POST /submit (validação do Gestor) responde 200");
  checkEqual(submit.body?.approvalState, "AGUARDANDO_APROVACAO", "validada → AGUARDANDO_APROVACAO");
  const approveSubmitted = await approve(draft, admin1Token);
  checkEqual(approveSubmitted.status, 200, "o Admin aprova a instrução validada");
  checkEqual(approveSubmitted.body?.approvalState, "APROVADO", "estado APROVADO");

  // ── 7. Rota legada (PUT /api/loan/:id) respeita o mesmo modelo ───────────
  console.log("\n[7] Caminho legado (status → 1/-1) — a porta lateral está fechada");
  const legacy30k = await createTestLoan({ amount: 30000 });
  const legacyGestor = await call(`/api/loan/${legacy30k}`, {
    method: "PUT",
    token: gestorToken,
    body: { status: 1 },
  });
  checkEqual(legacyGestor.status, 403, "PUT {status:1} por Gestor responde 403");
  check(
    /Alçada insuficiente/i.test(String(legacyGestor.body?.message || "")),
    "o caminho legado devolve a mesma mensagem de alçada insuficiente"
  );
  const legacyGestorReject = await call(`/api/loan/${legacy30k}`, {
    method: "PUT",
    token: gestorToken,
    body: { status: -1 },
  });
  checkEqual(legacyGestorReject.status, 403, "PUT {status:-1} por Gestor responde 403 (reprovação é do Admin)");

  const legacy150k = await createTestLoan({ amount: 150000, installments: 12 });
  const legacyAdmin = await call(`/api/loan/${legacy150k}`, {
    method: "PUT",
    token: admin1Token,
    body: { status: 1 },
  });
  checkEqual(legacyAdmin.status, 200, "PUT {status:1} pelo Admin responde 200");
  const legacyRow = await getLoanRow(legacy150k);
  checkEqual(legacyRow?.approvalState, "APROVADO", "o Admin aprova pelo caminho legado (1 de 1)");
  checkEqual(Number(legacyRow?.status), 0, "não activa sem desembolso (status 0 — aprovar não mexe no caixa)");
  const legacyApproveAgain = await approve(legacy150k, admin2Token);
  checkEqual(legacyApproveAgain.status, 409, "já aprovado — nova aprovação recusada (409)");

  // ── 8. Endpoint de regras (a UI mostra as alçadas antes da decisão) ─────
  console.log("\n[8] GET /api/loan/approval-rules — alçadas visíveis na UI");
  const rulesAsGestor = await call(`/api/loan/approval-rules?amount=30000`, { token: gestorToken });
  checkEqual(rulesAsGestor.status, 200, "GET /approval-rules responde 200");
  checkEqual(rulesAsGestor.body?.result?.allowed, false, "Gestor: allowed=false para 30.000");
  check(
    /Alçada insuficiente/i.test(String(rulesAsGestor.body?.result?.message || "")),
    "resumo devolve a mensagem de alçada insuficiente"
  );
  const rulesAsAdmin = await call(`/api/loan/approval-rules?amount=150000`, { token: admin1Token });
  checkEqual(rulesAsAdmin.body?.result?.allowed, true, "Admin: allowed=true para 150.000");
  checkEqual(rulesAsAdmin.body?.result?.requiredApprovals, 1, "requiredApprovals = 1 (Admin único)");
  checkEqual(rulesAsAdmin.body?.result?.isCommittee, false, "isCommittee = false (sem comitê)");

  // ── 9. AGUARDANDO_DESEMBOLSO + invalidação de desembolso ────────────────
  console.log("\n[9] Estado AGUARDANDO_DESEMBOLSO e invalidação de desembolso");
  const loanPrep = await createTestLoan({ amount: 20000 });
  const approvePrep = await approve(loanPrep, admin1Token, "Aprovado — preparar desembolso");
  checkEqual(approvePrep.status, 200, "o Admin aprova 20.000");
  const gestorPrepare = await call(`/api/loan/${loanPrep}/prepare-disbursement`, {
    method: "POST",
    token: gestorToken,
    body: { notes: "Tento preparar eu mesmo" },
  });
  checkEqual(gestorPrepare.status, 403, "Gestor não prepara desembolso (403)");
  const prepare = await call(`/api/loan/${loanPrep}/prepare-disbursement`, {
    method: "POST",
    token: admin1Token,
    body: { notes: "Desembolso agendado para amanhã" },
  });
  checkEqual(prepare.status, 200, "POST /prepare-disbursement pelo Admin responde 200");
  checkEqual(prepare.body?.approvalState, "AGUARDANDO_DESEMBOLSO", "APROVADO → AGUARDANDO_DESEMBOLSO");
  const prepareRow = await getLoanRow(loanPrep);
  checkEqual(prepareRow?.approvalState, "AGUARDANDO_DESEMBOLSO", "estado persistido no crédito");
  const approvePrepared = await approve(loanPrep, admin1Token);
  checkEqual(approvePrepared.status, 409, "aguardando desembolso já não volta a aprovar (409)");
  const prepTimeline = await getTimeline(loanPrep, admin1Token);
  const prepEvents: any[] = prepTimeline.body?.result || [];
  check(
    prepEvents.some((e) => e.event === "PREPARACAO_DESEMBOLSO" && String(e.notes || "").includes("agendado")),
    "linha do tempo regista a preparação do desembolso (com observação)"
  );

  // Invalidar o desembolso dos 150.000 (sem pagamentos) → volta à fila de desembolso
  const invalidate = await call(`/api/loan/${loan150k}/invalidate-disbursement`, {
    method: "PUT",
    token: admin1Token,
  });
  checkEqual(invalidate.status, 200, "PUT /invalidate-disbursement responde 200");
  const invalidatedRow = await getLoanRow(loan150k);
  checkEqual(invalidatedRow?.approvalState, "AGUARDANDO_DESEMBOLSO", "desembolso invalidado → AGUARDANDO_DESEMBOLSO");
  checkEqual(Number(invalidatedRow?.status), 0, "status legado volta a 0");
  checkEqual(await countInstallments(loan150k), 0, "o plano de prestações foi removido");
  const timelineFinal = await getTimeline(loan150k, admin1Token);
  const finalEvents: any[] = timelineFinal.body?.result || [];
  check(
    finalEvents.some((e) => e.event === "INVALIDACAO_DESEMBOLSO"),
    "linha do tempo regista a invalidação do desembolso"
  );

  // As aprovações mantêm-se: o crédito pode ser desembolsado de novo pelo Admin
  const redisburse = await disburse(loan150k, admin1Token);
  checkEqual(redisburse.status, 200, "após invalidar, o crédito aprovado desembolsa de novo");
  const redisbursedRow = await getLoanRow(loan150k);
  checkEqual(redisbursedRow?.approvalState, "DESEMBOLSADO", "volta a DESEMBOLSADO");

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
    if (error?.parent) console.error("Causa:", error.parent?.message || error.parent);
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
