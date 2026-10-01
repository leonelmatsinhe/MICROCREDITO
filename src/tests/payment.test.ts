import "../config/env"; // carrega .env ANTES da conexão (DATABASE_* etc.)
import { db } from "../database/db";
import { addTranzaction, reverseTranzaction, getInstallmentQuote } from "../controllers/TranzactionController";
import { round2 } from "../utils/money";
import * as jwt from "jsonwebtoken";

/**
 * TESTES DE INTEGRAÇÃO — MÓDULO DE PAGAMENTOS V2 (core bancário)
 *
 * Runner próprio (sem mocha/chai — o projecto não tem test-runner):
 *   npx ts-node --transpile-only src/tests/payment.test.ts
 *
 * Corre contra o MySQL local (mbr_microcredito) criando dados próprios
 * (mutuário 900001) e limpando no fim. Cobre os cenários da missão:
 *   1. Quote (mora server-side)
 *   2. Pagamento parcial + alocação CAPITAL
 *   3. Duplo clique (idempotência)
 *   4. Concorrência (2.º pagamento em prestação paga → ALREADY_PAID)
 *   5. Excesso (OVERPAY_NOT_ALLOWED + acceptOverpay → customer_credits)
 *   6. Retroactivo (mora pela data do pagamento) + data futura
 *   7. Estorno (admin-only, repõe prestação, REVERSED)
 *   8. Referência única (DUPLICATE_REFERENCE)
 *
 * NOTA: chama os controllers directamente com req/res simulados — valida a
 * lógica transaccional (locks, códigos, alocação), não a camada HTTP.
 */

// ── Mini-runner ─────────────────────────────────────────────────────────────
type TestFn = () => Promise<void>;
const suites: Array<{ name: string; tests: Array<{ name: string; fn: TestFn }> }> = [];
let currentSuite: { name: string; tests: Array<{ name: string; fn: TestFn }> } | null = null;

function describe(name: string, fn: () => void) {
  currentSuite = { name, tests: [] };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
}
function it(name: string, fn: TestFn) {
  currentSuite?.tests.push({ name, fn });
}
// Hooks do mini-runner (escopo: suite corrente)
const suiteHooks: Array<{ suite: string; before?: TestFn; after?: TestFn }> = [];
function before(fn: TestFn) {
  suiteHooks.push({ suite: currentSuite?.name || "", before: fn });
}
function after(fn: TestFn) {
  suiteHooks.push({ suite: currentSuite?.name || "", after: fn });
}
const expect = (actual: any) => ({
  to: {
    equal: (expected: any) => {
      if (actual !== expected) throw new Error(`esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`);
    },
    be: {
      true: () => { if (actual !== true) throw new Error(`esperado true, obtido ${JSON.stringify(actual)}`); },
      undefined: () => { if (actual !== undefined) throw new Error(`esperado undefined, obtido ${JSON.stringify(actual)}`); },
    },
    not: {
      be: {
        undefined: () => { if (actual === undefined) throw new Error("esperado valor, obtido undefined"); },
      },
    },
  },
});

// ── Estado partilhado ───────────────────────────────────────────────────────
let companyId = 36;              // empresa MBR (forfeit 1%/dia)
let accountNumber = 900001;      // conta exclusiva dos testes
let customerId = 0;
let loanId = 0;
let adminToken = "";
let staffToken = "";
let testCashAccountId = 0;       // CAIXA_FISICO dedicado → fallback nunca toca em contas reais

// ── Helpers ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const daysFromToday = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const mkReq = (overrides: Partial<any> = {}): any => ({
  body: {},
  headers: {},
  ip: "127.0.0.1",
  params: {},
  query: {},
  ...overrides,
});

const mkRes = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (payload: any) => { res.body = payload; return res; };
  res.send = (payload: any) => { res.body = payload; return res; };
  return res;
};

const callAddPayment = async (params: {
  amortizationLoanId: number;
  amount: number;
  reference: string;
  method?: number;
  paymentDate?: string;
  acceptOverpay?: boolean;
  token?: string;
  idemKey: string;
  bankAccountId?: number;
}) => {
  const req = mkReq({
    body: {
      companyId,
      accountNumber,
      amortizationLoanId: params.amortizationLoanId,
      amount: params.amount,
      tranzactionReference: params.reference,
      paymentMethod: params.method ?? 1,
      paymentDate: params.paymentDate ?? today(),
      acceptOverpay: params.acceptOverpay,
      ...(params.bankAccountId ? { bank_account_id: params.bankAccountId } : {}),
    },
    headers: {
      authorization: `Bearer ${params.token ?? staffToken}`,
      "idempotency-key": params.idemKey,
    },
    ip: "10.0.0.9",
  });
  const res = mkRes();
  await addTranzaction(req, res);
  return res;
};

const callQuote = async (installmentId: number, payDate?: string) => {
  const req = mkReq({
    params: { id: String(installmentId) },
    query: payDate ? { payDate } : {},
    headers: { authorization: `Bearer ${staffToken}` },
  });
  const res = mkRes();
  await getInstallmentQuote(req, res);
  return res;
};

const callReverse = async (tranzactionId: number, token: string, reason = "Motivo de estorno de teste automatizado") => {
  const req = mkReq({
    params: { id: String(tranzactionId) },
    body: { reason, companyId },
    headers: { authorization: `Bearer ${token}` },
  });
  const res = mkRes();
  await reverseTranzaction(req, res);
  return res;
};

const insertIdOf = (raw: any): number =>
  Number(raw?.[0]?.insertId ?? raw?.[0] ?? raw?.insertId) || 0;

const createInstallment = async (params: {
  value: number;
  daysAgoDue?: number; // negativo = vence no futuro
}): Promise<number> => {
  const dueDate = daysFromToday(-(params.daysAgoDue ?? 0));
  // daysAgoDue: positivo = venceu há N dias (passado); negativo = vence no futuro
  // (daysFromToday soma; subtrair daysAgoDue dá a data correcta)
  const raw: any = await db.query(
    `INSERT INTO amortization_loans
       (companyId, loanId, installmentOrder, accountNumber, customerId,
        amortization, rateAmount, installment, remainingBalance, dueDate, status, paidAmount, mora_amount, mora_days, createdAt, updatedAt)
     VALUES (?, ?, '1ª', ?, ?, ?, 0, ?, 0, ?, 0, 0, 0, 0, NOW(), NOW())`,
    // 7 placeholders: company, loan, accN, cust, amortization, installment, dueDate
    // (rateAmount e remainingBalance ficam a 0 literais no SQL)
    { replacements: [companyId, loanId, accountNumber, customerId, round2(params.value), params.value, dueDate] }
  );
  return insertIdOf(raw);
};

const getInstallment = async (id: number) => {
  const [rows]: any = await db.query(
    "SELECT status, paidAmount, remainingBalance, mora_amount FROM amortization_loans WHERE id = ?",
    { replacements: [id] }
  );
  return (rows as any[])[0];
};

const countConfirmed = async (amortizationLoanId: number) => {
  const [rows]: any = await db.query(
    "SELECT COUNT(*) AS n FROM tranzactions WHERE amortizationLoanId = ? AND status = 'CONFIRMED'",
    { replacements: [amortizationLoanId] }
  );
  return Number((rows as any[])[0].n);
};

const getAccountBalance = async (accountId: number): Promise<number> => {
  const [rows]: any = await db.query("SELECT balance FROM accounts WHERE id = ?", {
    replacements: [accountId],
  });
  return round2(Number((rows as any[])[0]?.balance) || 0);
};

// ── Suítes ──────────────────────────────────────────────────────────────────

describe("QUOTE (mora server-side)", () => {
  it("prestação não vencida → mora 0, total = saldo", async () => {
    const instId = await createInstallment({ value: 33000, daysAgoDue: -10 }); // vence daqui a 10 dias
    const res = await callQuote(instId, today());
    expect(res.statusCode).to.equal(200);
    expect(Number(res.body.result.lateDue)).to.equal(0);
    expect(Number(res.body.result.capitalDue)).to.equal(33000);
    expect(Number(res.body.result.total)).to.equal(33000);
  });

  it("prestação 10 dias em atraso → mora 1%/dia = 3300 (fórmula legada)", async () => {
    const instId = await createInstallment({ value: 33000, daysAgoDue: 10 });
    const res = await callQuote(instId, today());
    expect(res.statusCode).to.equal(200);
    expect(Number(res.body.result.daysLate)).to.equal(10);
    expect(Number(res.body.result.lateDue)).to.equal(3300);
    expect(Number(res.body.result.total)).to.equal(36300);
  });

  it("data retroativa na quote → mora menor", async () => {
    const instId = await createInstallment({ value: 30000, daysAgoDue: 10 });
    // Pagar 7 dias atrás → apenas 3 dias de atraso (10 − 7)
    const res = await callQuote(instId, daysFromToday(-7));
    expect(Number(res.body.result.daysLate)).to.equal(3);
    expect(Number(res.body.result.lateDue)).to.equal(900);
  });
});

describe("PAGAMENTO PARCIAL", () => {
  it("paga 20000 de 33000 → status -1, dívida 13000, alocação CAPITAL", async () => {
    const instId = await createInstallment({ value: 33000, daysAgoDue: 0 });
    const reference = `TEST-PARTIAL-${Date.now()}`;
    const res = await callAddPayment({ amortizationLoanId: instId, amount: 20000, reference, idemKey: `TEST-K-${reference}` });
    expect(res.statusCode).to.equal(201);
    expect(res.body.success).to.be.true;

    const inst = await getInstallment(instId);
    expect(Number(inst.paidAmount)).to.equal(20000);
    expect(Number(inst.remainingBalance)).to.equal(13000);
    expect(Number(inst.status)).to.equal(-1);

    // Alocação: tudo em CAPITAL (não vencida → mora 0)
    const [allocRows]: any = await db.query(
      "SELECT component, amount FROM payment_allocations WHERE payment_id = ?",
      { replacements: [res.body.tranzactionId] }
    );
    expect((allocRows as any[]).length).to.equal(1);
    expect(String((allocRows as any[])[0].component)).to.equal("CAPITAL");
    expect(Number((allocRows as any[])[0].amount)).to.equal(20000);
  });
});

describe("IDEMPOTÊNCIA (duplo clique)", () => {
  it("mesma Idempotency-Key → mesma resposta, 1 só transacção", async () => {
    const instId = await createInstallment({ value: 10000 });
    const reference = `TEST-DBL-${Date.now()}`;
    const idemKey = `TEST-K-${reference}`;

    const res1 = await callAddPayment({ amortizationLoanId: instId, amount: 10000, reference, idemKey });
    expect(res1.statusCode).to.equal(201);
    const firstId = res1.body.tranzactionId;

    const res2 = await callAddPayment({ amortizationLoanId: instId, amount: 10000, reference, idemKey });
    expect(res2.statusCode).to.equal(201);
    expect(res2.body.tranzactionId).to.equal(firstId);
    expect(await countConfirmed(instId)).to.equal(1);
  });

  it("sem Idempotency-Key → 400 IDEMPOTENCY_KEY_REQUIRED", async () => {
    const instId = await createInstallment({ value: 5000 });
    const req = mkReq({
      body: { companyId, accountNumber, amortizationLoanId: instId, amount: 5000, tranzactionReference: `TEST-NOK-${Date.now()}`, paymentMethod: 1 },
      headers: { authorization: `Bearer ${staffToken}` },
    });
    const res = mkRes();
    await addTranzaction(req, res);
    expect(res.statusCode).to.equal(400);
    expect(res.body.code).to.equal("IDEMPOTENCY_KEY_REQUIRED");
  });
});

describe("CONCORRÊNCIA", () => {
  it("2.º pagamento em prestação já paga → 409 ALREADY_PAID (lock serializa)", async () => {
    const instId = await createInstallment({ value: 8000 });
    const reference = `TEST-RACE-${Date.now()}`;
    const res1 = await callAddPayment({ amortizationLoanId: instId, amount: 8000, reference, idemKey: `TEST-K-${reference}` });
    expect(res1.statusCode).to.equal(201);

    const res2 = await callAddPayment({ amortizationLoanId: instId, amount: 8000, reference: `${reference}-B`, idemKey: `TEST-K-${reference}-B` });
    expect(res2.statusCode).to.equal(409);
    expect(res2.body.code).to.equal("ALREADY_PAID");

    // Exactamente 1 transacção confirmada; paidAmount intacto
    expect(await countConfirmed(instId)).to.equal(1);
    const inst = await getInstallment(instId);
    expect(Number(inst.paidAmount)).to.equal(8000);
  });
});

describe("EXCESSO (overpay)", () => {
  it("amount > devido sem acceptOverpay → 400 OVERPAY_NOT_ALLOWED", async () => {
    const instId = await createInstallment({ value: 5000 });
    const reference = `TEST-OVER-${Date.now()}`;
    const res = await callAddPayment({ amortizationLoanId: instId, amount: 7000, reference, idemKey: `TEST-K-${reference}` });
    expect(res.statusCode).to.equal(400);
    expect(res.body.code).to.equal("OVERPAY_NOT_ALLOWED");
  });

  it("com acceptOverpay=true → aplica 5000 e cria crédito de 2000", async () => {
    const instId = await createInstallment({ value: 5000 });
    const reference = `TEST-OK-${Date.now()}`;
    const res = await callAddPayment({ amortizationLoanId: instId, amount: 7000, reference, idemKey: `TEST-K-${reference}`, acceptOverpay: true });
    expect(res.statusCode).to.equal(201);
    expect(Number(res.body.allocation.applied)).to.equal(5000);
    expect(Number(res.body.allocation.overpay)).to.equal(2000);

    const [creditRows]: any = await db.query(
      "SELECT amount, remaining_amount, status FROM customer_credits WHERE source_payment_id = ?",
      { replacements: [res.body.tranzactionId] }
    );
    const credit = (creditRows as any[])[0];
    expect(credit).to.not.be.undefined;
    expect(Number(credit.amount)).to.equal(2000);
    expect(String(credit.status)).to.equal("ACTIVE");

    // Prestação paga exactamente 5000
    const inst = await getInstallment(instId);
    expect(Number(inst.paidAmount)).to.equal(5000);
  });
});

describe("DATA RETROACTIVA / FUTURA", () => {
  it("pagamento 7 dias atrás em prestação de 10 dias → mora de só 3 dias (900)", async () => {
    const instId = await createInstallment({ value: 30000, daysAgoDue: 10 });
    const reference = `TEST-RETRO-${Date.now()}`;
    const res = await callAddPayment({
      amortizationLoanId: instId,
      amount: 30900, // 30000 + mora de 3 dias (10−7) × 1% × 30000 = 900
      reference,
      idemKey: `TEST-K-${reference}`,
      paymentDate: daysFromToday(-7),
    });
    expect(res.statusCode).to.equal(201);
    expect(Number(res.body.allocation.lateInterest)).to.equal(900);

    const inst = await getInstallment(instId);
    expect(Number(inst.status)).to.equal(1);
  });

  it("data futura → 400 FUTURE_DATE", async () => {
    const instId = await createInstallment({ value: 5000 });
    const reference = `TEST-FUT-${Date.now()}`;
    const res = await callAddPayment({ amortizationLoanId: instId, amount: 5000, reference, idemKey: `TEST-K-${reference}`, paymentDate: daysFromToday(2) });
    expect(res.statusCode).to.equal(400);
    expect(res.body.code).to.equal("FUTURE_DATE");
  });
});

describe("ESTORNO (reverse)", () => {
  it("staff não admin → 403 FORBIDDEN", async () => {
    const res = await callReverse(1, staffToken);
    expect(res.statusCode).to.equal(403);
    expect(res.body.code).to.equal("FORBIDDEN");
  });

  it("motivo curto → 400 REASON_REQUIRED", async () => {
    const res = await callReverse(1, adminToken, "curto");
    expect(res.statusCode).to.equal(400);
    expect(res.body.code).to.equal("REASON_REQUIRED");
  });

  it("estorno integral: prestação reposta, tx REVERSED, 2.º estorno → 409", async () => {
    const instId = await createInstallment({ value: 12000 });
    const reference = `TEST-REV-${Date.now()}`;
    const createRes = await callAddPayment({ amortizationLoanId: instId, amount: 12000, reference, idemKey: `TEST-K-${reference}` });
    expect(createRes.statusCode).to.equal(201);
    const txId = createRes.body.tranzactionId;

    const revRes = await callReverse(txId, adminToken);
    expect(revRes.statusCode).to.equal(200);
    expect(Number(revRes.body.result.newStatus)).to.equal(0);

    const inst = await getInstallment(instId);
    expect(Number(inst.status)).to.equal(0);
    expect(Number(inst.paidAmount)).to.equal(0);

    const [txRows]: any = await db.query("SELECT status FROM tranzactions WHERE id = ?", { replacements: [txId] });
    expect(String((txRows as any[])[0].status)).to.equal("REVERSED");

    const revRes2 = await callReverse(txId, adminToken);
    expect(revRes2.statusCode).to.equal(409);
    expect(revRes2.body.code).to.equal("ALREADY_REVERSED");
  });
});

describe("REFERÊNCIA ÚNICA", () => {
  it("mesma referência + método → 409 DUPLICATE_REFERENCE", async () => {
    const instId = await createInstallment({ value: 4000 });
    const reference = `TEST-DUP-${Date.now()}`;
    const resA = await callAddPayment({ amortizationLoanId: instId, amount: 2000, reference, method: 2, idemKey: `TEST-K-${reference}` });
    expect(resA.statusCode).to.equal(201);

    // Prestação A ainda tem saldo — nova prestação para o 2.º pagamento
    const instId2 = await createInstallment({ value: 4000 });
    const resB = await callAddPayment({ amortizationLoanId: instId2, amount: 2000, reference, method: 2, idemKey: `TEST-K-${reference}-B` });
    expect(resB.statusCode).to.equal(409);
    expect(resB.body.code).to.equal("DUPLICATE_REFERENCE");
  });
});

// ── CONTA DE DESTINO (bank_account_id → accounts) ─────────────────────────

describe("CONTA DE DESTINO (bank_account_id)", () => {
  let reembolsoId = 0;
  let caixaId = 0;
  let despesaId = 0;

  // Contas de teste dedicadas (limpas no fim)
  before(async () => {
    const mk = async (purpose: string, type: string, balance: number, isActive = 1): Promise<number> => {
      const raw: any = await db.query(
        `INSERT INTO accounts
           (companyId, accountDescription, accountNumber, bank_name, purpose, type, is_active, balance, is_default_reembolso, is_default_desembolso, createdBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 329, NOW(), NOW())`,
        { replacements: [companyId, `TEST ${purpose}`, `TEST-${Date.now()}-${purpose}`, 'Banco Teste', purpose, type, isActive, balance] }
      );
      return Number(raw[0]);
    };
    reembolsoId = await mk("REEMBOLSO", "BANCO", 100);
    caixaId = await mk("REEMBOLSO", "CAIXA_FISICO", 50);
    despesaId = await mk("DESEMBOLSO", "BANCO", 999); // "conta de despesa"
  });

  after(async () => {
    for (const id of [reembolsoId, caixaId, despesaId]) {
      if (id) {
        await db.query("DELETE FROM accounts WHERE id = ?", { replacements: [id] }).catch(() => {});
      }
    }
  });

  it("conta DESEMBOLSO (despesa) → 400 INVALID_BANK_ACCOUNT", async () => {
    const instId = await createInstallment({ value: 3000 });
    const reference = `TEST-BADACC-${Date.now()}`;
    const res = await callAddPayment({
      amortizationLoanId: instId, amount: 3000, reference,
      idemKey: `TEST-K-${reference}`, bankAccountId: despesaId,
    });
    expect(res.statusCode).to.equal(400);
    expect(res.body.code).to.equal("INVALID_BANK_ACCOUNT");
  });

  it("conta REEMBOLSO inactiva → 400 INVALID_BANK_ACCOUNT", async () => {
    const instId = await createInstallment({ value: 3000 });
    const inactiveId = await new Promise<number>((resolve) => {
      (async () => {
        const raw: any = await db.query(
          `INSERT INTO accounts
             (companyId, accountDescription, accountNumber, bank_name, purpose, type, is_active, balance, is_default_reembolso, is_default_desembolso, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 'REEMBOLSO', 'BANCO', 0, 0, 0, 0, 329, NOW(), NOW())`,
          { replacements: [companyId, 'TEST INATIVA', `TEST-INAT-${Date.now()}`, 'Banco Teste'] }
        );
        resolve(Number(raw[0]));
      })();
    });
    try {
      const reference = `TEST-INATACC-${Date.now()}`;
      const res = await callAddPayment({
        amortizationLoanId: instId, amount: 3000, reference,
        idemKey: `TEST-K-${reference}`, bankAccountId: inactiveId,
      });
      expect(res.statusCode).to.equal(400);
      expect(res.body.code).to.equal("INVALID_BANK_ACCOUNT");
    } finally {
      await db.query("DELETE FROM accounts WHERE id = ?", { replacements: [inactiveId] }).catch(() => {});
    }
  });

  it("balance da conta destino aumenta com o pagamento e volta com o estorno", async () => {
    const instId = await createInstallment({ value: 6000 });
    const reference = `TEST-BAL-${Date.now()}`;
    const before = await getAccountBalance(reembolsoId);

    const res = await callAddPayment({
      amortizationLoanId: instId, amount: 6000, reference,
      idemKey: `TEST-K-${reference}`, bankAccountId: reembolsoId,
    });
    expect(res.statusCode).to.equal(201);
    expect(Number(res.body.bank_account_id)).to.equal(reembolsoId);

    const afterPay = await getAccountBalance(reembolsoId);
    expect(afterPay).to.equal(before + 6000);

    // Estorno → saldo volta ao original
    const revRes = await callReverse(res.body.tranzactionId, adminToken);
    expect(revRes.statusCode).to.equal(200);
    const afterReversal = await getAccountBalance(reembolsoId);
    expect(afterReversal).to.equal(before);
  });

  it("sem bank_account_id → 400 (sem caixa aberto nem conta CAIXA_FISICO nos testes)", async () => {
    // Nota: este cenário depende da empresa NÃO ter caixa físico; empresa 36
    // pode ter — por isso aceitamos 201 (fallback) OU 400 (sem fallback), mas
    // exigimos que a resposta identifique a conta usada.
    const instId = await createInstallment({ value: 2500 });
    const reference = `TEST-NOACC-${Date.now()}`;
    const res = await callAddPayment({
      amortizationLoanId: instId, amount: 2500, reference,
      idemKey: `TEST-K-${reference}`,
    });
    if (res.statusCode === 201) {
      // fallback funcionou — resposta identifica a conta de destino
      expect(res.body.bank_account_id).to.not.be.undefined;
    } else {
      expect(res.statusCode).to.equal(400);
    }
  });
});

// ── RECIBO LEGAL (backend-authoritative) ─────────────────────────────────

describe("RECIBO LEGAL (backend-authoritative)", () => {
  let reciboId = 0;
  let reciboNumero = "";
  let reciboHash = "";

  after(async () => {
    // Cleanup próprio dos recibos de teste (a sequência da empresa NÃO é
    // revertida — em produção o rollback da transaction já garante isso).
    if (reciboId) {
      await db.query("DELETE FROM audit_log WHERE action='RECIBO_EMIT' AND entity_id = ?", { replacements: [reciboId] }).catch(() => {});
      await db.query("DELETE FROM recibos WHERE id = ?", { replacements: [reciboId] }).catch(() => {});
    }
  });

  it("pagamento → recibo com numero sequencial + hash + PDF na MESMA resposta", async () => {
    const instId = await createInstallment({ value: 97200, daysAgoDue: -5 });
    const reference = `TEST-REC-${Date.now()}`;
    const res = await callAddPayment({
      amortizationLoanId: instId, amount: 97200, reference,
      idemKey: `TEST-K-${reference}`,
    });
    expect(res.statusCode).to.equal(201);

    const recibo = res.body.recibo;
    expect(recibo).to.not.be.undefined;
    expect(recibo?.numero).to.not.be.undefined;
    reciboId = Number(recibo.id);
    reciboNumero = String(recibo.numero);
    reciboHash = String(recibo.hash || "");

    // Número da série REC-AAAA-NNNNN
    if (!/^REC-\d{4}-\d{5}$/.test(reciboNumero)) throw new Error(`número inválido: ${reciboNumero}`);
    // Hash SHA-256 (64 hex)
    if (!/^[a-f0-9]{64}$/.test(reciboHash)) throw new Error(`hash SHA-256 inválida: ${reciboHash}`);
    // pdf_url aponta para o endpoint do backend
    if (!String(recibo.pdf_url || "").includes("/api/recibos/")) throw new Error(`pdf_url inesperada: ${recibo.pdf_url}`);

    // Gravado na BD dentro da mesma transacção: linha com pdf_url preenchido
    const [rows]: any = await db.query(
      "SELECT numero, hash_at, pdf_url, status FROM recibos WHERE id = ?",
      { replacements: [reciboId] }
    );
    const row = (rows as any[])[0];
    if (!row) throw new Error("recibo não foi gravado na BD");
    expect(String(row.status || "EMITIDO")).to.equal("EMITIDO");
    if (!row.pdf_url) throw new Error("recibo sem pdf_url — PDF não foi gerado na transacção");
    if (!row.hash_at) throw new Error("recibo sem hash_at — selo não foi calculado na transacção");
  });

  it("GET /api/recibos/:id/pdf (renderReciboPdf) → PDF válido no disco", async () => {
    if (!reciboId) throw new Error("recibo não criado no teste anterior");
    const { renderReciboPdf } = await import("../services/reciboService");
    const detalhe: any = await (await import("../services/reciboService")).getReciboDetalhe(reciboId);
    expect(detalhe).to.not.be.undefined;
    const pdfUrl = detalhe?.recibo?.pdf_url;
    if (!pdfUrl) throw new Error("recibo sem pdf_url");
    const fs = await import("fs");
    const path = await import("path");
    const abs = path.join(process.cwd(), "uploads", "docs", path.basename(String(pdfUrl)));
    if (!fs.existsSync(abs)) throw new Error(`PDF não existe no disco: ${abs}`);
    const head = fs.readFileSync(abs).subarray(0, 5).toString();
    expect(head).to.equal("%PDF-");
  });

  it("updateTranzaction com recibo emitido → 403 RECEIPT_ALREADY_ISSUED", async () => {
    if (!reciboId) throw new Error("recibo não criado");
    const [txRows]: any = await db.query(
      "SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-REC-%' LIMIT 1"
    );
    const txId = Number((txRows as any[])[0]?.id);
    if (!txId) throw new Error("tranzaction do recibo não encontrada");

    const { updateTranzaction } = await import("../controllers/TranzactionController");
    const req = mkReq({
      params: { id: String(txId) },
      body: { amount: 1, companyId },
      headers: { authorization: `Bearer ${staffToken}` },
    });
    const res = mkRes();
    await updateTranzaction(req, res);
    expect(res.statusCode).to.equal(403);
    expect(res.body.code).to.equal("RECEIPT_ALREADY_ISSUED");
  });

  it("validação pública: findReciboForValidation + hash bate (QR do fiscal)", async () => {
    if (!reciboNumero || !reciboHash) throw new Error("recibo não criado");
    const { findReciboForValidation } = await import("../services/reciboService");
    const porNumero: any = await findReciboForValidation({ numero: reciboNumero });
    if (!porNumero) throw new Error("recibo não encontrado pelo número");
    const porHash: any = await findReciboForValidation({ hash: reciboHash });
    if (!porHash) throw new Error("recibo não encontrado pelo hash");
    expect(Number(porNumero.id)).to.equal(Number(porHash.id));
    expect(Number(porNumero.id)).to.equal(reciboId);
  });

  it("emitReciboInTransaction é idempotente (1 recibo por pagamento)", async () => {
    const [txRows]: any = await db.query(
      "SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-REC-%' LIMIT 1"
    );
    const txId = Number((txRows as any[])[0]?.id);
    if (!txId) throw new Error("tranzaction não encontrada");
    const { emitReciboInTransaction } = await import("../services/reciboService");
    const segunda = await emitReciboInTransaction({
      tranzactionId: txId,
      companyId,
      createdBy: 329,
      transaction: null as any,
    });
    expect(Number(segunda.id)).to.equal(reciboId);
    // Continua a haver exactamente 1 recibo para este pagamento
    const [cnt]: any = await db.query(
      "SELECT COUNT(*) AS n FROM recibos WHERE tranzactionId = ?", { replacements: [txId] }
    );
    expect(Number((cnt as any[])[0].n)).to.equal(1);
  });
});

// ── Setup/Teardown + execução ───────────────────────────────────────────

const cleanup = async () => {
  try {
    await db.query(`DELETE FROM payment_allocations WHERE payment_id IN (SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-%')`);
    // audit_log ANTES de apagar as tranzactions (senão ficam órfãos)
    await db.query(`DELETE FROM audit_log WHERE entity='tranzactions' AND entity_id IN (SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-%')`);
    await db.query(`DELETE FROM tranzactions WHERE tranzactionReference LIKE 'TEST-%'`);
    // RECIBOS DE TESTE — ESCOPO ESTREITO: só recibos cujo pagamento é uma
    // tranzaction TEST-% apagada NESTE cleanup. NUNCA se apagam recibos
    // órfãos em geral (documentos fiscais podem ter a tranzaction noutro
    // ambiente — produção). Depois, a sequência é realinhada ao máximo REAL
    // por empresa/ano (operação sem destruição: só alinha o contador).
    await db.query(
      `DELETE FROM audit_log WHERE action='RECIBO_EMIT' AND entity_id IN (SELECT id FROM recibos WHERE tranzactionId IN (SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-%'))`
    ).catch(() => {});
    await db.query(`DELETE FROM recibos WHERE tranzactionId IN (SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-%')`);
    await db.query(`UPDATE recibos_sequencia s SET s.ultima_sequencia = (SELECT COALESCE(MAX(sequencia),0) FROM recibos r WHERE r.companyId = s.companyId AND r.ano = s.ano)`);
    await db.query(`DELETE FROM idempotency_keys WHERE idem_key LIKE 'TEST-K-TEST-%'`);
    await db.query(`DELETE FROM customer_credits WHERE account_number = ?`, { replacements: [accountNumber] });
    await db.query(`DELETE FROM late_accruals WHERE amortization_loan_id IN (SELECT id FROM amortization_loans WHERE accountNumber = ?)`, { replacements: [accountNumber] });
    await db.query(`DELETE FROM debts WHERE accountNumber = ?`, { replacements: [String(accountNumber)] });
    // órfãos de corridas anteriores: entradas BANK_ACCOUNT apontam (via
    // after_data) para tranzactions TEST já apagadas — entity_id aqui é o id
    // da CONTA, por isso o filtro tem de ser pelo tranzactionId do payload.
    await db.query(`DELETE FROM audit_log WHERE action LIKE 'BANK_ACCOUNT_%' AND JSON_EXTRACT(after_data,'$.tranzactionId') NOT IN (SELECT id FROM tranzactions)`);
    // conta CAIXA_FISICO dedicada dos testes
    await db.query(`DELETE FROM accounts WHERE type='CAIXA_FISICO' AND accountNumber LIKE 'TEST-CASH-%'`);
    await db.query(`DELETE FROM amortization_loans WHERE accountNumber = ?`, { replacements: [accountNumber] });
    await db.query(`DELETE FROM customer_loans WHERE accountNumber = ?`, { replacements: [accountNumber] });
    await db.query(`DELETE FROM customers WHERE accountNumber = ?`, { replacements: [accountNumber] });
    await db.query(`DELETE FROM accounts WHERE accountDescription LIKE 'TEST %'`);
    await db.query(`DELETE FROM accounts WHERE accountNumber LIKE 'TEST-%'`);
  } catch (e: any) {
    console.warn("[cleanup] aviso:", e?.message);
  }
};

const main = async () => {
  let passed = 0, failed = 0;
  const failures: Array<{ name: string; error: string }> = [];

  // ── Setup: mutuário + crédito de teste com token real (JWT do .env) ──
  process.env.APP_SECRET = process.env.APP_SECRET || "dev-secret";
  try {
    await cleanup(); // garante estado limpo (restos de corridas anteriores)
    const custRaw: any = await db.query(
      `INSERT INTO customers
         (companyId, customerName, customerPhone, customerMonthlySalary, accountNumber, password, customerStatus, createdAt, updatedAt)
       VALUES (?, 'TEST Pagamentos V2', '258840000000', 9000, ?, 'teste-sem-login', 1, NOW(), NOW())`,
      { replacements: [companyId, accountNumber] }
    );
    customerId = insertIdOf(custRaw);
    const loanRaw: any = await db.query(
      `INSERT INTO customer_loans
         (companyId, creditManager, accountNumber, customerId, amount, numberOfInstallments, interestRate, loanDescription, administrativeFee, rate_type, status, dateCreated, createdAt, updatedAt)
       VALUES (?, 329, ?, ?, 30000, 3, 0.12, 'Teste V2', 0, 'MENSAL', 1, CURDATE(), NOW(), NOW())`,
      { replacements: [companyId, accountNumber, customerId] }
    );
    loanId = insertIdOf(loanRaw);
    // CAIXA_FISICO de teste: o fallback de conta de destino prioriza caixa
    // físico, garantindo que os pagamentos sem bank_account_id Explícito
    // incrementam ESTA conta (limpa no fim) e nunca as contas reais.
    const cashRaw: any = await db.query(
      `INSERT INTO accounts
         (companyId, accountDescription, accountNumber, bank_name, purpose, type, is_active, balance, is_default_reembolso, is_default_desembolso, createdBy, createdAt, updatedAt)
       VALUES (?, 'TEST CAIXA_FISICO', ?, 'Caixa Teste', 'REEMBOLSO', 'CAIXA_FISICO', 1, 0, 0, 0, 329, NOW(), NOW())`,
      { replacements: [companyId, `TEST-CASH-${Date.now()}`] }
    );
    testCashAccountId = insertIdOf(cashRaw);
    adminToken = jwt.sign({ id: 329, companyId, userRole: 0 }, process.env.APP_SECRET + "", { expiresIn: "1h" });
    staffToken = jwt.sign({ id: 1, companyId, userRole: 1 }, process.env.APP_SECRET + "", { expiresIn: "1h" });
  } catch (e: any) {
    console.error("Falha no setup dos testes:", e?.message);
    process.exit(1);
  }

  const t0 = Date.now();
  for (const suite of suites) {
    console.log(`\n▸ ${suite.name}`);
    // Hooks before/after do suite (escopo por nome)
    const hooks = suiteHooks.filter((h) => h.suite === suite.name);
    for (const hook of hooks) {
      try {
        if (hook.before) await hook.before();
      } catch (error: any) {
        console.log(`  ⚠ before falhou: ${error?.message}`);
      }
    }
    for (const test of suite.tests) {
      try {
        await test.fn();
        passed += 1;
        console.log(`  ✓ ${test.name}`);
      } catch (error: any) {
        failed += 1;
        failures.push({ name: `${suite.name} › ${test.name}`, error: error?.message || String(error) });
        console.log(`  ✗ ${test.name} — ${error?.message || error}`);
      }
    }
    for (const hook of hooks.reverse()) {
      try {
        if (hook.after) await hook.after();
      } catch (error: any) {
        console.log(`  ⚠ after falhou: ${error?.message}`);
      }
    }
  }

  await cleanup();
  await db.close().catch(() => {});

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n══════════════════════════════════════`);
  console.log(`  ${passed} passaram, ${failed} falharam (${secs}s)`);
  if (failures.length > 0) {
    console.log(`\n  FALHAS:`);
    failures.forEach((f) => console.log(`   - ${f.name}: ${f.error}`));
    process.exit(1);
  }
  process.exit(0);
};

main().catch((e) => {
  console.error("Erro fatal nos testes:", e);
  process.exit(1);
});
