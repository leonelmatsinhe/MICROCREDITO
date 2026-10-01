"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../config/env"); // carrega .env ANTES da conexão (DATABASE_* etc.)
const db_1 = require("../database/db");
const TranzactionController_1 = require("../controllers/TranzactionController");
const money_1 = require("../utils/money");
const jwt = __importStar(require("jsonwebtoken"));
const suites = [];
let currentSuite = null;
function describe(name, fn) {
    currentSuite = { name, tests: [] };
    suites.push(currentSuite);
    fn();
    currentSuite = null;
}
function it(name, fn) {
    currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.tests.push({ name, fn });
}
// Hooks do mini-runner (escopo: suite corrente)
const suiteHooks = [];
function before(fn) {
    suiteHooks.push({ suite: (currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.name) || "", before: fn });
}
function after(fn) {
    suiteHooks.push({ suite: (currentSuite === null || currentSuite === void 0 ? void 0 : currentSuite.name) || "", after: fn });
}
const expect = (actual) => ({
    to: {
        equal: (expected) => {
            if (actual !== expected)
                throw new Error(`esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`);
        },
        be: {
            true: () => { if (actual !== true)
                throw new Error(`esperado true, obtido ${JSON.stringify(actual)}`); },
            undefined: () => { if (actual !== undefined)
                throw new Error(`esperado undefined, obtido ${JSON.stringify(actual)}`); },
        },
        not: {
            be: {
                undefined: () => { if (actual === undefined)
                    throw new Error("esperado valor, obtido undefined"); },
            },
        },
    },
});
// ── Estado partilhado ───────────────────────────────────────────────────────
let companyId = 36; // empresa MBR (forfeit 1%/dia)
let accountNumber = 900001; // conta exclusiva dos testes
let customerId = 0;
let loanId = 0;
let adminToken = "";
let staffToken = "";
let testCashAccountId = 0; // CAIXA_FISICO dedicado → fallback nunca toca em contas reais
// ── Helpers ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const daysFromToday = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};
const mkReq = (overrides = {}) => (Object.assign({ body: {}, headers: {}, ip: "127.0.0.1", params: {}, query: {} }, overrides));
const mkRes = () => {
    const res = { statusCode: 200, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    res.send = (payload) => { res.body = payload; return res; };
    return res;
};
const callAddPayment = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const req = mkReq({
        body: Object.assign({ companyId,
            accountNumber, amortizationLoanId: params.amortizationLoanId, amount: params.amount, tranzactionReference: params.reference, paymentMethod: (_a = params.method) !== null && _a !== void 0 ? _a : 1, paymentDate: (_b = params.paymentDate) !== null && _b !== void 0 ? _b : today(), acceptOverpay: params.acceptOverpay }, (params.bankAccountId ? { bank_account_id: params.bankAccountId } : {})),
        headers: {
            authorization: `Bearer ${(_c = params.token) !== null && _c !== void 0 ? _c : staffToken}`,
            "idempotency-key": params.idemKey,
        },
        ip: "10.0.0.9",
    });
    const res = mkRes();
    yield (0, TranzactionController_1.addTranzaction)(req, res);
    return res;
});
const callQuote = (installmentId, payDate) => __awaiter(void 0, void 0, void 0, function* () {
    const req = mkReq({
        params: { id: String(installmentId) },
        query: payDate ? { payDate } : {},
        headers: { authorization: `Bearer ${staffToken}` },
    });
    const res = mkRes();
    yield (0, TranzactionController_1.getInstallmentQuote)(req, res);
    return res;
});
const callReverse = (tranzactionId, token, reason = "Motivo de estorno de teste automatizado") => __awaiter(void 0, void 0, void 0, function* () {
    const req = mkReq({
        params: { id: String(tranzactionId) },
        body: { reason, companyId },
        headers: { authorization: `Bearer ${token}` },
    });
    const res = mkRes();
    yield (0, TranzactionController_1.reverseTranzaction)(req, res);
    return res;
});
const insertIdOf = (raw) => { var _a, _b, _c; return Number((_c = (_b = (_a = raw === null || raw === void 0 ? void 0 : raw[0]) === null || _a === void 0 ? void 0 : _a.insertId) !== null && _b !== void 0 ? _b : raw === null || raw === void 0 ? void 0 : raw[0]) !== null && _c !== void 0 ? _c : raw === null || raw === void 0 ? void 0 : raw.insertId) || 0; };
const createInstallment = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    const dueDate = daysFromToday(-((_d = params.daysAgoDue) !== null && _d !== void 0 ? _d : 0));
    // daysAgoDue: positivo = venceu há N dias (passado); negativo = vence no futuro
    // (daysFromToday soma; subtrair daysAgoDue dá a data correcta)
    const raw = yield db_1.db.query(`INSERT INTO amortization_loans
       (companyId, loanId, installmentOrder, accountNumber, customerId,
        amortization, rateAmount, installment, remainingBalance, dueDate, status, paidAmount, mora_amount, mora_days, createdAt, updatedAt)
     VALUES (?, ?, '1ª', ?, ?, ?, 0, ?, 0, ?, 0, 0, 0, 0, NOW(), NOW())`, 
    // 7 placeholders: company, loan, accN, cust, amortization, installment, dueDate
    // (rateAmount e remainingBalance ficam a 0 literais no SQL)
    { replacements: [companyId, loanId, accountNumber, customerId, (0, money_1.round2)(params.value), params.value, dueDate] });
    return insertIdOf(raw);
});
const getInstallment = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.db.query("SELECT status, paidAmount, remainingBalance, mora_amount FROM amortization_loans WHERE id = ?", { replacements: [id] });
    return rows[0];
});
const countConfirmed = (amortizationLoanId) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.db.query("SELECT COUNT(*) AS n FROM tranzactions WHERE amortizationLoanId = ? AND status = 'CONFIRMED'", { replacements: [amortizationLoanId] });
    return Number(rows[0].n);
});
const getAccountBalance = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    const [rows] = yield db_1.db.query("SELECT balance FROM accounts WHERE id = ?", {
        replacements: [accountId],
    });
    return (0, money_1.round2)(Number((_e = rows[0]) === null || _e === void 0 ? void 0 : _e.balance) || 0);
});
// ── Suítes ──────────────────────────────────────────────────────────────────
describe("QUOTE (mora server-side)", () => {
    it("prestação não vencida → mora 0, total = saldo", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 33000, daysAgoDue: -10 }); // vence daqui a 10 dias
        const res = yield callQuote(instId, today());
        expect(res.statusCode).to.equal(200);
        expect(Number(res.body.result.lateDue)).to.equal(0);
        expect(Number(res.body.result.capitalDue)).to.equal(33000);
        expect(Number(res.body.result.total)).to.equal(33000);
    }));
    it("prestação 10 dias em atraso → mora 1%/dia = 3300 (fórmula legada)", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 33000, daysAgoDue: 10 });
        const res = yield callQuote(instId, today());
        expect(res.statusCode).to.equal(200);
        expect(Number(res.body.result.daysLate)).to.equal(10);
        expect(Number(res.body.result.lateDue)).to.equal(3300);
        expect(Number(res.body.result.total)).to.equal(36300);
    }));
    it("data retroativa na quote → mora menor", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 30000, daysAgoDue: 10 });
        // Pagar 7 dias atrás → apenas 3 dias de atraso (10 − 7)
        const res = yield callQuote(instId, daysFromToday(-7));
        expect(Number(res.body.result.daysLate)).to.equal(3);
        expect(Number(res.body.result.lateDue)).to.equal(900);
    }));
});
describe("PAGAMENTO PARCIAL", () => {
    it("paga 20000 de 33000 → status -1, dívida 13000, alocação CAPITAL", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 33000, daysAgoDue: 0 });
        const reference = `TEST-PARTIAL-${Date.now()}`;
        const res = yield callAddPayment({ amortizationLoanId: instId, amount: 20000, reference, idemKey: `TEST-K-${reference}` });
        expect(res.statusCode).to.equal(201);
        expect(res.body.success).to.be.true;
        const inst = yield getInstallment(instId);
        expect(Number(inst.paidAmount)).to.equal(20000);
        expect(Number(inst.remainingBalance)).to.equal(13000);
        expect(Number(inst.status)).to.equal(-1);
        // Alocação: tudo em CAPITAL (não vencida → mora 0)
        const [allocRows] = yield db_1.db.query("SELECT component, amount FROM payment_allocations WHERE payment_id = ?", { replacements: [res.body.tranzactionId] });
        expect(allocRows.length).to.equal(1);
        expect(String(allocRows[0].component)).to.equal("CAPITAL");
        expect(Number(allocRows[0].amount)).to.equal(20000);
    }));
});
describe("IDEMPOTÊNCIA (duplo clique)", () => {
    it("mesma Idempotency-Key → mesma resposta, 1 só transacção", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 10000 });
        const reference = `TEST-DBL-${Date.now()}`;
        const idemKey = `TEST-K-${reference}`;
        const res1 = yield callAddPayment({ amortizationLoanId: instId, amount: 10000, reference, idemKey });
        expect(res1.statusCode).to.equal(201);
        const firstId = res1.body.tranzactionId;
        const res2 = yield callAddPayment({ amortizationLoanId: instId, amount: 10000, reference, idemKey });
        expect(res2.statusCode).to.equal(201);
        expect(res2.body.tranzactionId).to.equal(firstId);
        expect(yield countConfirmed(instId)).to.equal(1);
    }));
    it("sem Idempotency-Key → 400 IDEMPOTENCY_KEY_REQUIRED", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 5000 });
        const req = mkReq({
            body: { companyId, accountNumber, amortizationLoanId: instId, amount: 5000, tranzactionReference: `TEST-NOK-${Date.now()}`, paymentMethod: 1 },
            headers: { authorization: `Bearer ${staffToken}` },
        });
        const res = mkRes();
        yield (0, TranzactionController_1.addTranzaction)(req, res);
        expect(res.statusCode).to.equal(400);
        expect(res.body.code).to.equal("IDEMPOTENCY_KEY_REQUIRED");
    }));
});
describe("CONCORRÊNCIA", () => {
    it("2.º pagamento em prestação já paga → 409 ALREADY_PAID (lock serializa)", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 8000 });
        const reference = `TEST-RACE-${Date.now()}`;
        const res1 = yield callAddPayment({ amortizationLoanId: instId, amount: 8000, reference, idemKey: `TEST-K-${reference}` });
        expect(res1.statusCode).to.equal(201);
        const res2 = yield callAddPayment({ amortizationLoanId: instId, amount: 8000, reference: `${reference}-B`, idemKey: `TEST-K-${reference}-B` });
        expect(res2.statusCode).to.equal(409);
        expect(res2.body.code).to.equal("ALREADY_PAID");
        // Exactamente 1 transacção confirmada; paidAmount intacto
        expect(yield countConfirmed(instId)).to.equal(1);
        const inst = yield getInstallment(instId);
        expect(Number(inst.paidAmount)).to.equal(8000);
    }));
});
describe("EXCESSO (overpay)", () => {
    it("amount > devido sem acceptOverpay → 400 OVERPAY_NOT_ALLOWED", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 5000 });
        const reference = `TEST-OVER-${Date.now()}`;
        const res = yield callAddPayment({ amortizationLoanId: instId, amount: 7000, reference, idemKey: `TEST-K-${reference}` });
        expect(res.statusCode).to.equal(400);
        expect(res.body.code).to.equal("OVERPAY_NOT_ALLOWED");
    }));
    it("com acceptOverpay=true → aplica 5000 e cria crédito de 2000", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 5000 });
        const reference = `TEST-OK-${Date.now()}`;
        const res = yield callAddPayment({ amortizationLoanId: instId, amount: 7000, reference, idemKey: `TEST-K-${reference}`, acceptOverpay: true });
        expect(res.statusCode).to.equal(201);
        expect(Number(res.body.allocation.applied)).to.equal(5000);
        expect(Number(res.body.allocation.overpay)).to.equal(2000);
        const [creditRows] = yield db_1.db.query("SELECT amount, remaining_amount, status FROM customer_credits WHERE source_payment_id = ?", { replacements: [res.body.tranzactionId] });
        const credit = creditRows[0];
        expect(credit).to.not.be.undefined;
        expect(Number(credit.amount)).to.equal(2000);
        expect(String(credit.status)).to.equal("ACTIVE");
        // Prestação paga exactamente 5000
        const inst = yield getInstallment(instId);
        expect(Number(inst.paidAmount)).to.equal(5000);
    }));
});
describe("DATA RETROACTIVA / FUTURA", () => {
    it("pagamento 7 dias atrás em prestação de 10 dias → mora de só 3 dias (900)", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 30000, daysAgoDue: 10 });
        const reference = `TEST-RETRO-${Date.now()}`;
        const res = yield callAddPayment({
            amortizationLoanId: instId,
            amount: 30900,
            reference,
            idemKey: `TEST-K-${reference}`,
            paymentDate: daysFromToday(-7),
        });
        expect(res.statusCode).to.equal(201);
        expect(Number(res.body.allocation.lateInterest)).to.equal(900);
        const inst = yield getInstallment(instId);
        expect(Number(inst.status)).to.equal(1);
    }));
    it("data futura → 400 FUTURE_DATE", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 5000 });
        const reference = `TEST-FUT-${Date.now()}`;
        const res = yield callAddPayment({ amortizationLoanId: instId, amount: 5000, reference, idemKey: `TEST-K-${reference}`, paymentDate: daysFromToday(2) });
        expect(res.statusCode).to.equal(400);
        expect(res.body.code).to.equal("FUTURE_DATE");
    }));
});
describe("ESTORNO (reverse)", () => {
    it("staff não admin → 403 FORBIDDEN", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield callReverse(1, staffToken);
        expect(res.statusCode).to.equal(403);
        expect(res.body.code).to.equal("FORBIDDEN");
    }));
    it("motivo curto → 400 REASON_REQUIRED", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield callReverse(1, adminToken, "curto");
        expect(res.statusCode).to.equal(400);
        expect(res.body.code).to.equal("REASON_REQUIRED");
    }));
    it("estorno integral: prestação reposta, tx REVERSED, 2.º estorno → 409", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 12000 });
        const reference = `TEST-REV-${Date.now()}`;
        const createRes = yield callAddPayment({ amortizationLoanId: instId, amount: 12000, reference, idemKey: `TEST-K-${reference}` });
        expect(createRes.statusCode).to.equal(201);
        const txId = createRes.body.tranzactionId;
        const revRes = yield callReverse(txId, adminToken);
        expect(revRes.statusCode).to.equal(200);
        expect(Number(revRes.body.result.newStatus)).to.equal(0);
        const inst = yield getInstallment(instId);
        expect(Number(inst.status)).to.equal(0);
        expect(Number(inst.paidAmount)).to.equal(0);
        const [txRows] = yield db_1.db.query("SELECT status FROM tranzactions WHERE id = ?", { replacements: [txId] });
        expect(String(txRows[0].status)).to.equal("REVERSED");
        const revRes2 = yield callReverse(txId, adminToken);
        expect(revRes2.statusCode).to.equal(409);
        expect(revRes2.body.code).to.equal("ALREADY_REVERSED");
    }));
});
describe("REFERÊNCIA ÚNICA", () => {
    it("mesma referência + método → 409 DUPLICATE_REFERENCE", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 4000 });
        const reference = `TEST-DUP-${Date.now()}`;
        const resA = yield callAddPayment({ amortizationLoanId: instId, amount: 2000, reference, method: 2, idemKey: `TEST-K-${reference}` });
        expect(resA.statusCode).to.equal(201);
        // Prestação A ainda tem saldo — nova prestação para o 2.º pagamento
        const instId2 = yield createInstallment({ value: 4000 });
        const resB = yield callAddPayment({ amortizationLoanId: instId2, amount: 2000, reference, method: 2, idemKey: `TEST-K-${reference}-B` });
        expect(resB.statusCode).to.equal(409);
        expect(resB.body.code).to.equal("DUPLICATE_REFERENCE");
    }));
});
// ── CONTA DE DESTINO (bank_account_id → accounts) ─────────────────────────
describe("CONTA DE DESTINO (bank_account_id)", () => {
    let reembolsoId = 0;
    let caixaId = 0;
    let despesaId = 0;
    // Contas de teste dedicadas (limpas no fim)
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        const mk = (purpose, type, balance, isActive = 1) => __awaiter(void 0, void 0, void 0, function* () {
            const raw = yield db_1.db.query(`INSERT INTO accounts
           (companyId, accountDescription, accountNumber, bank_name, purpose, type, is_active, balance, is_default_reembolso, is_default_desembolso, createdBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 329, NOW(), NOW())`, { replacements: [companyId, `TEST ${purpose}`, `TEST-${Date.now()}-${purpose}`, 'Banco Teste', purpose, type, isActive, balance] });
            return Number(raw[0]);
        });
        reembolsoId = yield mk("REEMBOLSO", "BANCO", 100);
        caixaId = yield mk("REEMBOLSO", "CAIXA_FISICO", 50);
        despesaId = yield mk("DESEMBOLSO", "BANCO", 999); // "conta de despesa"
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        for (const id of [reembolsoId, caixaId, despesaId]) {
            if (id) {
                yield db_1.db.query("DELETE FROM accounts WHERE id = ?", { replacements: [id] }).catch(() => { });
            }
        }
    }));
    it("conta DESEMBOLSO (despesa) → 400 INVALID_BANK_ACCOUNT", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 3000 });
        const reference = `TEST-BADACC-${Date.now()}`;
        const res = yield callAddPayment({
            amortizationLoanId: instId, amount: 3000, reference,
            idemKey: `TEST-K-${reference}`, bankAccountId: despesaId,
        });
        expect(res.statusCode).to.equal(400);
        expect(res.body.code).to.equal("INVALID_BANK_ACCOUNT");
    }));
    it("conta REEMBOLSO inactiva → 400 INVALID_BANK_ACCOUNT", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 3000 });
        const inactiveId = yield new Promise((resolve) => {
            (() => __awaiter(void 0, void 0, void 0, function* () {
                const raw = yield db_1.db.query(`INSERT INTO accounts
             (companyId, accountDescription, accountNumber, bank_name, purpose, type, is_active, balance, is_default_reembolso, is_default_desembolso, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 'REEMBOLSO', 'BANCO', 0, 0, 0, 0, 329, NOW(), NOW())`, { replacements: [companyId, 'TEST INATIVA', `TEST-INAT-${Date.now()}`, 'Banco Teste'] });
                resolve(Number(raw[0]));
            }))();
        });
        try {
            const reference = `TEST-INATACC-${Date.now()}`;
            const res = yield callAddPayment({
                amortizationLoanId: instId, amount: 3000, reference,
                idemKey: `TEST-K-${reference}`, bankAccountId: inactiveId,
            });
            expect(res.statusCode).to.equal(400);
            expect(res.body.code).to.equal("INVALID_BANK_ACCOUNT");
        }
        finally {
            yield db_1.db.query("DELETE FROM accounts WHERE id = ?", { replacements: [inactiveId] }).catch(() => { });
        }
    }));
    it("balance da conta destino aumenta com o pagamento e volta com o estorno", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 6000 });
        const reference = `TEST-BAL-${Date.now()}`;
        const before = yield getAccountBalance(reembolsoId);
        const res = yield callAddPayment({
            amortizationLoanId: instId, amount: 6000, reference,
            idemKey: `TEST-K-${reference}`, bankAccountId: reembolsoId,
        });
        expect(res.statusCode).to.equal(201);
        expect(Number(res.body.bank_account_id)).to.equal(reembolsoId);
        const afterPay = yield getAccountBalance(reembolsoId);
        expect(afterPay).to.equal(before + 6000);
        // Estorno → saldo volta ao original
        const revRes = yield callReverse(res.body.tranzactionId, adminToken);
        expect(revRes.statusCode).to.equal(200);
        const afterReversal = yield getAccountBalance(reembolsoId);
        expect(afterReversal).to.equal(before);
    }));
    it("sem bank_account_id → 400 (sem caixa aberto nem conta CAIXA_FISICO nos testes)", () => __awaiter(void 0, void 0, void 0, function* () {
        // Nota: este cenário depende da empresa NÃO ter caixa físico; empresa 36
        // pode ter — por isso aceitamos 201 (fallback) OU 400 (sem fallback), mas
        // exigimos que a resposta identifique a conta usada.
        const instId = yield createInstallment({ value: 2500 });
        const reference = `TEST-NOACC-${Date.now()}`;
        const res = yield callAddPayment({
            amortizationLoanId: instId, amount: 2500, reference,
            idemKey: `TEST-K-${reference}`,
        });
        if (res.statusCode === 201) {
            // fallback funcionou — resposta identifica a conta de destino
            expect(res.body.bank_account_id).to.not.be.undefined;
        }
        else {
            expect(res.statusCode).to.equal(400);
        }
    }));
});
// ── RECIBO LEGAL (backend-authoritative) ─────────────────────────────────
describe("RECIBO LEGAL (backend-authoritative)", () => {
    let reciboId = 0;
    let reciboNumero = "";
    let reciboHash = "";
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        // Cleanup próprio dos recibos de teste (a sequência da empresa NÃO é
        // revertida — em produção o rollback da transaction já garante isso).
        if (reciboId) {
            yield db_1.db.query("DELETE FROM audit_log WHERE action='RECIBO_EMIT' AND entity_id = ?", { replacements: [reciboId] }).catch(() => { });
            yield db_1.db.query("DELETE FROM recibos WHERE id = ?", { replacements: [reciboId] }).catch(() => { });
        }
    }));
    it("pagamento → recibo com numero sequencial + hash + PDF na MESMA resposta", () => __awaiter(void 0, void 0, void 0, function* () {
        const instId = yield createInstallment({ value: 97200, daysAgoDue: -5 });
        const reference = `TEST-REC-${Date.now()}`;
        const res = yield callAddPayment({
            amortizationLoanId: instId, amount: 97200, reference,
            idemKey: `TEST-K-${reference}`,
        });
        expect(res.statusCode).to.equal(201);
        const recibo = res.body.recibo;
        expect(recibo).to.not.be.undefined;
        expect(recibo === null || recibo === void 0 ? void 0 : recibo.numero).to.not.be.undefined;
        reciboId = Number(recibo.id);
        reciboNumero = String(recibo.numero);
        reciboHash = String(recibo.hash || "");
        // Número da série REC-AAAA-NNNNN
        if (!/^REC-\d{4}-\d{5}$/.test(reciboNumero))
            throw new Error(`número inválido: ${reciboNumero}`);
        // Hash SHA-256 (64 hex)
        if (!/^[a-f0-9]{64}$/.test(reciboHash))
            throw new Error(`hash SHA-256 inválida: ${reciboHash}`);
        // pdf_url aponta para o endpoint do backend
        if (!String(recibo.pdf_url || "").includes("/api/recibos/"))
            throw new Error(`pdf_url inesperada: ${recibo.pdf_url}`);
        // Gravado na BD dentro da mesma transacção: linha com pdf_url preenchido
        const [rows] = yield db_1.db.query("SELECT numero, hash_at, pdf_url, status FROM recibos WHERE id = ?", { replacements: [reciboId] });
        const row = rows[0];
        if (!row)
            throw new Error("recibo não foi gravado na BD");
        expect(String(row.status || "EMITIDO")).to.equal("EMITIDO");
        if (!row.pdf_url)
            throw new Error("recibo sem pdf_url — PDF não foi gerado na transacção");
        if (!row.hash_at)
            throw new Error("recibo sem hash_at — selo não foi calculado na transacção");
    }));
    it("GET /api/recibos/:id/pdf (renderReciboPdf) → PDF válido no disco", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (!reciboId)
            throw new Error("recibo não criado no teste anterior");
        const { renderReciboPdf } = yield Promise.resolve().then(() => __importStar(require("../services/reciboService")));
        const detalhe = yield (yield Promise.resolve().then(() => __importStar(require("../services/reciboService")))).getReciboDetalhe(reciboId);
        expect(detalhe).to.not.be.undefined;
        const pdfUrl = (_a = detalhe === null || detalhe === void 0 ? void 0 : detalhe.recibo) === null || _a === void 0 ? void 0 : _a.pdf_url;
        if (!pdfUrl)
            throw new Error("recibo sem pdf_url");
        const fs = yield Promise.resolve().then(() => __importStar(require("fs")));
        const path = yield Promise.resolve().then(() => __importStar(require("path")));
        const abs = path.join(process.cwd(), "uploads", "docs", path.basename(String(pdfUrl)));
        if (!fs.existsSync(abs))
            throw new Error(`PDF não existe no disco: ${abs}`);
        const head = fs.readFileSync(abs).subarray(0, 5).toString();
        expect(head).to.equal("%PDF-");
    }));
    it("updateTranzaction com recibo emitido → 403 RECEIPT_ALREADY_ISSUED", () => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        if (!reciboId)
            throw new Error("recibo não criado");
        const [txRows] = yield db_1.db.query("SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-REC-%' LIMIT 1");
        const txId = Number((_b = txRows[0]) === null || _b === void 0 ? void 0 : _b.id);
        if (!txId)
            throw new Error("tranzaction do recibo não encontrada");
        const { updateTranzaction } = yield Promise.resolve().then(() => __importStar(require("../controllers/TranzactionController")));
        const req = mkReq({
            params: { id: String(txId) },
            body: { amount: 1, companyId },
            headers: { authorization: `Bearer ${staffToken}` },
        });
        const res = mkRes();
        yield updateTranzaction(req, res);
        expect(res.statusCode).to.equal(403);
        expect(res.body.code).to.equal("RECEIPT_ALREADY_ISSUED");
    }));
    it("validação pública: findReciboForValidation + hash bate (QR do fiscal)", () => __awaiter(void 0, void 0, void 0, function* () {
        if (!reciboNumero || !reciboHash)
            throw new Error("recibo não criado");
        const { findReciboForValidation } = yield Promise.resolve().then(() => __importStar(require("../services/reciboService")));
        const porNumero = yield findReciboForValidation({ numero: reciboNumero });
        if (!porNumero)
            throw new Error("recibo não encontrado pelo número");
        const porHash = yield findReciboForValidation({ hash: reciboHash });
        if (!porHash)
            throw new Error("recibo não encontrado pelo hash");
        expect(Number(porNumero.id)).to.equal(Number(porHash.id));
        expect(Number(porNumero.id)).to.equal(reciboId);
    }));
    it("emitReciboInTransaction é idempotente (1 recibo por pagamento)", () => __awaiter(void 0, void 0, void 0, function* () {
        var _c;
        const [txRows] = yield db_1.db.query("SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-REC-%' LIMIT 1");
        const txId = Number((_c = txRows[0]) === null || _c === void 0 ? void 0 : _c.id);
        if (!txId)
            throw new Error("tranzaction não encontrada");
        const { emitReciboInTransaction } = yield Promise.resolve().then(() => __importStar(require("../services/reciboService")));
        const segunda = yield emitReciboInTransaction({
            tranzactionId: txId,
            companyId,
            createdBy: 329,
            transaction: null,
        });
        expect(Number(segunda.id)).to.equal(reciboId);
        // Continua a haver exactamente 1 recibo para este pagamento
        const [cnt] = yield db_1.db.query("SELECT COUNT(*) AS n FROM recibos WHERE tranzactionId = ?", { replacements: [txId] });
        expect(Number(cnt[0].n)).to.equal(1);
    }));
});
// ── Setup/Teardown + execução ───────────────────────────────────────────
const cleanup = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.db.query(`DELETE FROM payment_allocations WHERE payment_id IN (SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-%')`);
        // audit_log ANTES de apagar as tranzactions (senão ficam órfãos)
        yield db_1.db.query(`DELETE FROM audit_log WHERE entity='tranzactions' AND entity_id IN (SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-%')`);
        yield db_1.db.query(`DELETE FROM tranzactions WHERE tranzactionReference LIKE 'TEST-%'`);
        // RECIBOS DE TESTE — ESCOPO ESTREITO: só recibos cujo pagamento é uma
        // tranzaction TEST-% apagada NESTE cleanup. NUNCA se apagam recibos
        // órfãos em geral (documentos fiscais podem ter a tranzaction noutro
        // ambiente — produção). Depois, a sequência é realinhada ao máximo REAL
        // por empresa/ano (operação sem destruição: só alinha o contador).
        yield db_1.db.query(`DELETE FROM audit_log WHERE action='RECIBO_EMIT' AND entity_id IN (SELECT id FROM recibos WHERE tranzactionId IN (SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-%'))`).catch(() => { });
        yield db_1.db.query(`DELETE FROM recibos WHERE tranzactionId IN (SELECT id FROM tranzactions WHERE tranzactionReference LIKE 'TEST-%')`);
        yield db_1.db.query(`UPDATE recibos_sequencia s SET s.ultima_sequencia = (SELECT COALESCE(MAX(sequencia),0) FROM recibos r WHERE r.companyId = s.companyId AND r.ano = s.ano)`);
        yield db_1.db.query(`DELETE FROM idempotency_keys WHERE idem_key LIKE 'TEST-K-TEST-%'`);
        yield db_1.db.query(`DELETE FROM customer_credits WHERE account_number = ?`, { replacements: [accountNumber] });
        yield db_1.db.query(`DELETE FROM late_accruals WHERE amortization_loan_id IN (SELECT id FROM amortization_loans WHERE accountNumber = ?)`, { replacements: [accountNumber] });
        yield db_1.db.query(`DELETE FROM debts WHERE accountNumber = ?`, { replacements: [String(accountNumber)] });
        // órfãos de corridas anteriores: entradas BANK_ACCOUNT apontam (via
        // after_data) para tranzactions TEST já apagadas — entity_id aqui é o id
        // da CONTA, por isso o filtro tem de ser pelo tranzactionId do payload.
        yield db_1.db.query(`DELETE FROM audit_log WHERE action LIKE 'BANK_ACCOUNT_%' AND JSON_EXTRACT(after_data,'$.tranzactionId') NOT IN (SELECT id FROM tranzactions)`);
        // conta CAIXA_FISICO dedicada dos testes
        yield db_1.db.query(`DELETE FROM accounts WHERE type='CAIXA_FISICO' AND accountNumber LIKE 'TEST-CASH-%'`);
        yield db_1.db.query(`DELETE FROM amortization_loans WHERE accountNumber = ?`, { replacements: [accountNumber] });
        yield db_1.db.query(`DELETE FROM customer_loans WHERE accountNumber = ?`, { replacements: [accountNumber] });
        yield db_1.db.query(`DELETE FROM customers WHERE accountNumber = ?`, { replacements: [accountNumber] });
        yield db_1.db.query(`DELETE FROM accounts WHERE accountDescription LIKE 'TEST %'`);
        yield db_1.db.query(`DELETE FROM accounts WHERE accountNumber LIKE 'TEST-%'`);
    }
    catch (e) {
        console.warn("[cleanup] aviso:", e === null || e === void 0 ? void 0 : e.message);
    }
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    let passed = 0, failed = 0;
    const failures = [];
    // ── Setup: mutuário + crédito de teste com token real (JWT do .env) ──
    process.env.APP_SECRET = process.env.APP_SECRET || "dev-secret";
    try {
        yield cleanup(); // garante estado limpo (restos de corridas anteriores)
        const custRaw = yield db_1.db.query(`INSERT INTO customers
         (companyId, customerName, customerPhone, customerMonthlySalary, accountNumber, password, customerStatus, createdAt, updatedAt)
       VALUES (?, 'TEST Pagamentos V2', '258840000000', 9000, ?, 'teste-sem-login', 1, NOW(), NOW())`, { replacements: [companyId, accountNumber] });
        customerId = insertIdOf(custRaw);
        const loanRaw = yield db_1.db.query(`INSERT INTO customer_loans
         (companyId, creditManager, accountNumber, customerId, amount, numberOfInstallments, interestRate, loanDescription, administrativeFee, rate_type, status, dateCreated, createdAt, updatedAt)
       VALUES (?, 329, ?, ?, 30000, 3, 0.12, 'Teste V2', 0, 'MENSAL', 1, CURDATE(), NOW(), NOW())`, { replacements: [companyId, accountNumber, customerId] });
        loanId = insertIdOf(loanRaw);
        // CAIXA_FISICO de teste: o fallback de conta de destino prioriza caixa
        // físico, garantindo que os pagamentos sem bank_account_id Explícito
        // incrementam ESTA conta (limpa no fim) e nunca as contas reais.
        const cashRaw = yield db_1.db.query(`INSERT INTO accounts
         (companyId, accountDescription, accountNumber, bank_name, purpose, type, is_active, balance, is_default_reembolso, is_default_desembolso, createdBy, createdAt, updatedAt)
       VALUES (?, 'TEST CAIXA_FISICO', ?, 'Caixa Teste', 'REEMBOLSO', 'CAIXA_FISICO', 1, 0, 0, 0, 329, NOW(), NOW())`, { replacements: [companyId, `TEST-CASH-${Date.now()}`] });
        testCashAccountId = insertIdOf(cashRaw);
        adminToken = jwt.sign({ id: 329, companyId, userRole: 0 }, process.env.APP_SECRET + "", { expiresIn: "1h" });
        staffToken = jwt.sign({ id: 1, companyId, userRole: 1 }, process.env.APP_SECRET + "", { expiresIn: "1h" });
    }
    catch (e) {
        console.error("Falha no setup dos testes:", e === null || e === void 0 ? void 0 : e.message);
        process.exit(1);
    }
    const t0 = Date.now();
    for (const suite of suites) {
        console.log(`\n▸ ${suite.name}`);
        // Hooks before/after do suite (escopo por nome)
        const hooks = suiteHooks.filter((h) => h.suite === suite.name);
        for (const hook of hooks) {
            try {
                if (hook.before)
                    yield hook.before();
            }
            catch (error) {
                console.log(`  ⚠ before falhou: ${error === null || error === void 0 ? void 0 : error.message}`);
            }
        }
        for (const test of suite.tests) {
            try {
                yield test.fn();
                passed += 1;
                console.log(`  ✓ ${test.name}`);
            }
            catch (error) {
                failed += 1;
                failures.push({ name: `${suite.name} › ${test.name}`, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) });
                console.log(`  ✗ ${test.name} — ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            }
        }
        for (const hook of hooks.reverse()) {
            try {
                if (hook.after)
                    yield hook.after();
            }
            catch (error) {
                console.log(`  ⚠ after falhou: ${error === null || error === void 0 ? void 0 : error.message}`);
            }
        }
    }
    yield cleanup();
    yield db_1.db.close().catch(() => { });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n══════════════════════════════════════`);
    console.log(`  ${passed} passaram, ${failed} falharam (${secs}s)`);
    if (failures.length > 0) {
        console.log(`\n  FALHAS:`);
        failures.forEach((f) => console.log(`   - ${f.name}: ${f.error}`));
        process.exit(1);
    }
    process.exit(0);
});
main().catch((e) => {
    console.error("Erro fatal nos testes:", e);
    process.exit(1);
});
