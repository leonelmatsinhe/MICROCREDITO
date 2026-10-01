"use strict";
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
exports.ACCOUNT_TYPES = exports.ACCOUNT_PURPOSES = exports.getWalletTotals = exports.transferBankToCash = exports.transferCashToBank = exports.transferBetweenAccounts = exports.recalculateRegisterTotals = exports.registerMovement = exports.getOrCreateSystemRegister = exports.todayKey = exports.creditAccountInTransaction = exports.isElectronic = void 0;
const db_1 = require("../database/db");
const AccountModel_1 = require("../database/models/AccountModel");
Object.defineProperty(exports, "ACCOUNT_PURPOSES", { enumerable: true, get: function () { return AccountModel_1.ACCOUNT_PURPOSES; } });
Object.defineProperty(exports, "ACCOUNT_TYPES", { enumerable: true, get: function () { return AccountModel_1.ACCOUNT_TYPES; } });
const CashRegisterModel_1 = require("../database/models/CashRegisterModel");
const CashMovementModel_1 = require("../database/models/CashMovementModel");
const BankTransactionModel_1 = require("../database/models/BankTransactionModel");
// Métodos que movem dinheiro electrónico (totais bank_* do caixa).
const isElectronic = (method) => method === "BANK" || method === "MPESA" || method === "EMOLA";
exports.isElectronic = isElectronic;
// Arredonda para 2 casas (dinheiro).
const round2 = (value) => Math.round(value * 100) / 100;
/**
 * CRÉDITO ATÓMICO DA CONTA DE DESTINO — chamado DENTRO da transacção SQL do
 * pagamento (passo 10.b de addTranzaction / loop de addTranzactionBulk).
 *
 * Bloqueia a linha da conta (SELECT ... FOR UPDATE), incrementa o saldo e
 * cria o lançamento no extrato real (bank_transactions) — tudo no MESMO
 * commit do pagamento (se algo falhar, rollback desfaz saldo e extrato).
 * O movimento de caixa correspondente é registado pós-commit pelo
 * recordPayment com skipAccountLedger → sem crédito duplicado do mesmo dinheiro.
 */
const creditAccountInTransaction = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, accountId, amount, description, userId = null, cashRegisterId = null, referenceType = null, referenceId = null, transaction, } = params;
    const credit = round2(amount);
    if (!(credit > 0)) {
        throw { code: "INVALID_AMOUNT", message: "O valor a creditar deve ser maior que zero." };
    }
    const account = yield AccountModel_1.AccountModel.findOne({
        where: { id: Number(accountId), companyId: Number(companyId) },
        transaction,
        lock: (transaction === null || transaction === void 0 ? void 0 : transaction.LOCK) ? transaction.LOCK.UPDATE : undefined,
    });
    if (!account) {
        throw { code: "ACCOUNT_NOT_FOUND", message: "Conta de destino não encontrada." };
    }
    const newBalance = round2((Number(account.getDataValue("balance")) || 0) + credit);
    yield account.update({ balance: newBalance }, { transaction });
    yield BankTransactionModel_1.BankTransactionModel.create({
        companyId: Number(companyId),
        accountId: Number(accountId),
        cashRegisterId: cashRegisterId !== null && cashRegisterId !== void 0 ? cashRegisterId : null,
        type: "ENTRADA",
        category: "REEMBOLSO_BANCO",
        amount: credit,
        balanceAfter: newBalance,
        description: String(description || "").slice(0, 255),
        referenceType: referenceType !== null && referenceType !== void 0 ? referenceType : null,
        referenceId: referenceId !== null && referenceId !== void 0 ? referenceId : null,
        createdBy: userId,
    }, { transaction });
    return { newBalance };
});
exports.creditAccountInTransaction = creditAccountInTransaction;
// Dia actual (YYYY-MM-DD) — igual ao resto do sistema.
const todayKey = () => new Date().toISOString().slice(0, 10);
exports.todayKey = todayKey;
const sign = (type, amount) => type === "ENTRADA" ? round2(amount) : -round2(amount);
/**
 * CAIXA DO SISTEMA — caixa técnico para movimentos que chegam FORA do
 * expediente (pagamentos do portal do mutuário em M-Pesa/transferência).
 *
 * Características:
 *  - userId = 0 (não é de nenhum operador — não conta no índice único deles);
 *  - opening_balance = 0 e opening_date = hoje;
 *  - status ABERTO até ser reconciliado: quando um operador abrir o caixa
 *    real do dia, o admin pode fechar este no Histórico (o valor contado
 *    bate com o calculado porque só tem dinheiro electrónico).
 * Idempotente: se já existir um Caixa do Sistema hoje, reutiliza-o.
 */
const getOrCreateSystemRegister = (companyId, transaction) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield CashRegisterModel_1.CashRegisterModel.findOne(Object.assign({ where: { companyId, userId: 0, status: "ABERTO", opening_date: (0, exports.todayKey)() }, order: [["id", "DESC"]] }, (transaction ? { transaction, lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined } : {})));
    if (existing)
        return existing;
    try {
        const created = yield CashRegisterModel_1.CashRegisterModel.create({
            companyId,
            userId: 0,
            opening_date: (0, exports.todayKey)(),
            opening_time: new Date(),
            opening_balance: 0,
            total_in: 0,
            total_out: 0,
            total_cash_in: 0,
            total_cash_out: 0,
            total_bank_in: 0,
            total_bank_out: 0,
            status: "ABERTO",
            notes: "Caixa técnico do portal — pagamentos recebidos fora do expediente. Reconciliar no fecho do caixa real.",
        }, ...(transaction ? [{ transaction }] : []));
        console.log(`[TESOURARIA] Caixa do Sistema aberto automaticamente (empresa ${companyId}) — movimento fora de expediente`);
        return created;
    }
    catch (error) {
        // Corrida concorrente: outro processo criou entretanto — buscar e reutilizar.
        if (String(error === null || error === void 0 ? void 0 : error.name).includes("UniqueConstraint")) {
            const retry = yield CashRegisterModel_1.CashRegisterModel.findOne(Object.assign({ where: { companyId, userId: 0, status: "ABERTO", opening_date: (0, exports.todayKey)() } }, (transaction ? { transaction } : {})));
            if (retry)
                return retry;
        }
        throw error;
    }
});
exports.getOrCreateSystemRegister = getOrCreateSystemRegister;
/**
 * REGISTO CENTRAL DE MOVIMENTOS — toda a lógica de dinheiro num só lugar.
 * Lança { code, message } em caso de regra violada (transacção revertida).
 */
const registerMovement = (input) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { companyId, userId = null, type, category, amount, paymentMethod, bankAccountId = null, description, reference, loanId = null, amortizationLoanId = null, tranzactionId = null, customerId = null, automatic = false, allowWithoutOpenRegister = false, skipAccountLedger = false, } = input;
    // ── Validações de entrada ──
    if (type !== "ENTRADA" && type !== "SAIDA") {
        throw { code: "INVALID_TYPE", message: "Tipo inválido (ENTRADA ou SAIDA)." };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw { code: "INVALID_AMOUNT", message: "O valor deve ser maior que zero." };
    }
    if (!description || !String(description).trim()) {
        throw { code: "INVALID_DESCRIPTION", message: "A descrição é obrigatória." };
    }
    const transaction = yield db_1.db.transaction();
    try {
        // ── Passo 1: caixa ABERTO do dia é obrigatório (diário de auditoria) ──
        let register = yield CashRegisterModel_1.CashRegisterModel.findOne({
            where: Object.assign({ companyId, status: "ABERTO", opening_date: (0, exports.todayKey)() }, (userId ? { userId } : {})),
            order: [["id", "DESC"]],
            lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
            transaction,
        });
        // ── PORTAL DO MUTUÁRIO: pagamento nunca é rejeitado por caixa fechado ──
        // O dinheiro electrónico (M-Pesa/transferência) entrou na conta bancária
        // independentemente do expediente. O movimento cai no "Caixa do Sistema"
        // do dia (aberto automaticamente) e aparece marcado para reconciliação.
        let usedSystemRegister = false;
        if (!register && allowWithoutOpenRegister) {
            register = yield (0, exports.getOrCreateSystemRegister)(companyId, transaction);
            usedSystemRegister = true;
        }
        if (!register) {
            throw { code: "CAIXA_FECHADO", message: "Abra o caixa do dia para continuar" };
        }
        // ── Passo 2: validações de método/conta ──
        let account = null;
        if ((0, exports.isElectronic)(paymentMethod)) {
            if (!bankAccountId) {
                throw { code: "BANK_ACCOUNT_REQUIRED", message: "Conta bancária obrigatória para pagamentos electrónicos." };
            }
            account = yield AccountModel_1.AccountModel.findOne({
                where: { id: bankAccountId, companyId },
                transaction,
                lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
            });
            if (!account) {
                throw { code: "ACCOUNT_NOT_FOUND", message: "Conta bancária não encontrada." };
            }
            if (!Number(account.getDataValue("is_active"))) {
                throw { code: "ACCOUNT_INACTIVE", message: "A conta bancária está inactiva." };
            }
        }
        // ── Passo 3: inserir em cash_movements ──
        // Movimentos do Caixa do Sistema ganham a etiqueta no início da descrição
        // (visível na tabela e no PDF) — nunca se misturam com o dinheiro da gaveta.
        const finalDescription = usedSystemRegister
            ? `[Portal — fora de expediente] ${String(description).trim()}`
            : String(description).trim();
        const movement = yield CashMovementModel_1.CashMovementModel.create({
            companyId,
            cashRegisterId: register.getDataValue("id"),
            bankAccountId: account ? bankAccountId : null,
            type,
            paymentMethod,
            category,
            amount: round2(amount),
            description: finalDescription,
            loanId,
            amortizationLoanId,
            tranzactionId,
            customerId,
            referenceType: (_a = reference === null || reference === void 0 ? void 0 : reference.type) !== null && _a !== void 0 ? _a : null,
            referenceId: (_b = reference === null || reference === void 0 ? void 0 : reference.id) !== null && _b !== void 0 ? _b : null,
            isAutomatic: automatic,
            createdBy: userId,
        }, { transaction });
        // ── Passo 4: dinheiro electrónico → bank_transactions + saldo real ──
        // (skipAccountLedger: o saldo já foi creditado na transacção do pagamento)
        if (account && !skipAccountLedger) {
            const current = Number(account.getDataValue("balance")) || 0;
            const delta = sign(type, amount);
            const newBalance = round2(current + delta);
            // Contas BANCO activas nunca ficam negativas.
            if (newBalance < 0 && String(account.getDataValue("type")) === "BANCO" && Number(account.getDataValue("is_active"))) {
                throw {
                    code: "INSUFFICIENT_FUNDS",
                    message: `Saldo insuficiente em ${account.getDataValue("bank_name")} ${account.getDataValue("accountNumber")} (disponível: ${current.toFixed(2)} MZN).`,
                };
            }
            yield account.update({ balance: newBalance }, { transaction });
            yield BankTransactionModel_1.BankTransactionModel.create({
                companyId,
                accountId: bankAccountId,
                cashRegisterId: register.getDataValue("id"),
                type,
                // Mapeia a categoria do caixa para a categoria do extrato bancário.
                category: mapToBankCategory(category),
                amount: round2(amount),
                balanceAfter: newBalance,
                description: finalDescription,
                referenceType: (_c = reference === null || reference === void 0 ? void 0 : reference.type) !== null && _c !== void 0 ? _c : null,
                referenceId: (_d = reference === null || reference === void 0 ? void 0 : reference.id) !== null && _d !== void 0 ? _d : null,
                createdBy: userId,
            }, { transaction });
        }
        // ── Passo 5: recalcular totais CASH/BANK do caixa (fonte de verdade) ──
        yield (0, exports.recalculateRegisterTotals)(register.getDataValue("id"), transaction);
        yield transaction.commit();
        if (automatic) {
            console.log(`[TESOURARIA] ${type}/${category}/${paymentMethod} ${round2(amount)} MZN — caixa #${register.getDataValue("id")}${usedSystemRegister ? " (SISTEMA/portal)" : ""}` +
                (account ? ` · conta #${bankAccountId}` : ""));
        }
        return movement;
    }
    catch (error) {
        yield transaction.rollback();
        throw error;
    }
});
exports.registerMovement = registerMovement;
/**
 * Mapeia a categoria do caixa para a categoria do extrato bancário.
 * Categorias manuais em conta bancária são registadas como OUTROS no extrato.
 */
const mapToBankCategory = (category) => {
    switch (category) {
        case "DESEMBOLSO": return "DESEMBOLSO_BANCO";
        case "REEMBOLSO":
        case "JUROS_MORA":
        case "TAXA_ADMIN": return "REEMBOLSO_BANCO";
        case "DEPOSITO_BANCO": return "DEPOSITO_CAIXA";
        case "LEVANTAMENTO_BANCO": return "LEVANTAMENTO_BANCO";
        default: return "OUTROS";
    }
};
/**
 * Recalcula os 4 totais do caixa a partir dos movimentos persistidos
 * (total_in/out globais + total_cash_in/out + total_bank_in/out).
 * Exportado também para o cashRegisterService (fecho do caixa).
 */
const recalculateRegisterTotals = (registerId, transaction) => __awaiter(void 0, void 0, void 0, function* () {
    const rows = (yield CashMovementModel_1.CashMovementModel.findAll(Object.assign({ where: { cashRegisterId: registerId }, attributes: ["type", "paymentMethod", "amount"], raw: true }, (transaction ? { transaction } : {}))));
    let totalIn = 0, totalOut = 0, totalCashIn = 0, totalCashOut = 0, totalBankIn = 0, totalBankOut = 0;
    rows.forEach((row) => {
        const amount = Number(row.amount) || 0;
        const electronic = (0, exports.isElectronic)(String(row.paymentMethod));
        if (row.type === "ENTRADA") {
            totalIn += amount;
            if (electronic)
                totalBankIn += amount;
            else
                totalCashIn += amount;
        }
        else {
            totalOut += amount;
            if (electronic)
                totalBankOut += amount;
            else
                totalCashOut += amount;
        }
    });
    const totals = {
        totalIn: round2(totalIn),
        totalOut: round2(totalOut),
        totalCashIn: round2(totalCashIn),
        totalCashOut: round2(totalCashOut),
        totalBankIn: round2(totalBankIn),
        totalBankOut: round2(totalBankOut),
    };
    // IMPORTANTE: as colunas da tabela são snake_case (total_in, total_cash_in,
    // ...). O update estático do Sequelize INTERSECTA as chaves com os atributos
    // do modelo e descarta silenciosamente as desconhecidas — usar as chaves
    // camelCase aqui fazia o update correr sem gravar NADA (bug dos totais a 0).
    yield CashRegisterModel_1.CashRegisterModel.update({
        total_in: totals.totalIn,
        total_out: totals.totalOut,
        total_cash_in: totals.totalCashIn,
        total_cash_out: totals.totalCashOut,
        total_bank_in: totals.totalBankIn,
        total_bank_out: totals.totalBankOut,
    }, Object.assign({ where: { id: registerId } }, (transaction ? { transaction } : {})));
    return totals;
});
exports.recalculateRegisterTotals = recalculateRegisterTotals;
/**
 * TRANSFERÊNCIA entre duas contas da carteira (ex.: FNB → BCI).
 * Cria SAIDA na origem + ENTRADA no destino, ambas categoria TRANSFERENCIA,
 * na mesma transacção. Respeita saldo não-negativo na origem.
 */
const transferBetweenAccounts = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f;
    const { companyId, userId = null, fromAccountId, toAccountId, amount } = params;
    if (fromAccountId === toAccountId) {
        throw { code: "INVALID_TRANSFER", message: "Origem e destino têm de ser contas diferentes." };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw { code: "INVALID_AMOUNT", message: "O valor da transferência deve ser maior que zero." };
    }
    // Origem: SAIDA / TRANSFERENCIA (valida saldo dentro do registerMovement).
    const out = yield (0, exports.registerMovement)({
        companyId,
        userId,
        type: "SAIDA",
        category: "TRANSFERENCIA",
        amount,
        paymentMethod: "BANK",
        bankAccountId: fromAccountId,
        description: ((_e = params.description) === null || _e === void 0 ? void 0 : _e.trim()) || `Transferência para conta #${toAccountId}`,
        reference: { type: "accounts", id: toAccountId },
        automatic: true,
    });
    // Destino: ENTRADA / TRANSFERENCIA.
    yield (0, exports.registerMovement)({
        companyId,
        userId,
        type: "ENTRADA",
        category: "TRANSFERENCIA",
        amount,
        paymentMethod: "BANK",
        bankAccountId: toAccountId,
        description: ((_f = params.description) === null || _f === void 0 ? void 0 : _f.trim()) || `Transferência recebida da conta #${fromAccountId}`,
        reference: { type: "accounts", id: fromAccountId },
        automatic: true,
    });
    return out;
});
exports.transferBetweenAccounts = transferBetweenAccounts;
/**
 * DEPÓSITO de dinheiro físico no banco (casa de moeda CASH→BANK).
 * Cria SAIDA/CASH (DEPOSITO_BANCO) + ENTRADA/BANK (DEPOSITO_CAIXA) na mesma
 * transacção lógica. O caixa ABERTO é validado pelas duas chamadas.
 */
const transferCashToBank = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h, _j;
    const { companyId, userId = null, toAccountId, amount } = params;
    if (!Number.isFinite(amount) || amount <= 0) {
        throw { code: "INVALID_AMOUNT", message: "O valor do depósito deve ser maior que zero." };
    }
    // Passo 1 — sai dinheiro físico da gaveta.
    const out = yield (0, exports.registerMovement)({
        companyId,
        userId,
        type: "SAIDA",
        category: "DEPOSITO_BANCO",
        amount,
        paymentMethod: "CASH",
        description: ((_g = params.description) === null || _g === void 0 ? void 0 : _g.trim()) || `Depósito no banco (conta #${toAccountId})`,
        reference: { type: "accounts", id: toAccountId },
        automatic: true,
    });
    // Passo 2 — entra dinheiro electrónico na conta.
    yield (0, exports.registerMovement)({
        companyId,
        userId,
        type: "ENTRADA",
        category: "DEPOSITO_BANCO",
        amount,
        paymentMethod: "BANK",
        bankAccountId: toAccountId,
        description: ((_h = params.description) === null || _h === void 0 ? void 0 : _h.trim()) || `Depósito em dinheiro (do caixa do dia)`,
        reference: { type: "cash_movements", id: Number((_j = out === null || out === void 0 ? void 0 : out.getDataValue) === null || _j === void 0 ? void 0 : _j.call(out, "id")) || null },
        automatic: true,
    });
    return out;
});
exports.transferCashToBank = transferCashToBank;
/**
 * LEVANTAMENTO de dinheiro físico no banco (BANK→CASH).
 * SAIDA/BANK na conta + ENTRADA/CASH no caixa.
 */
const transferBankToCash = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _k, _l, _m;
    const { companyId, userId = null, fromAccountId, amount } = params;
    if (!Number.isFinite(amount) || amount <= 0) {
        throw { code: "INVALID_AMOUNT", message: "O valor do levantamento deve ser maior que zero." };
    }
    // Passo 1 — sai dinheiro electrónico da conta (valida saldo).
    const out = yield (0, exports.registerMovement)({
        companyId,
        userId,
        type: "SAIDA",
        category: "LEVANTAMENTO_BANCO",
        amount,
        paymentMethod: "BANK",
        bankAccountId: fromAccountId,
        description: ((_k = params.description) === null || _k === void 0 ? void 0 : _k.trim()) || `Levantamento em dinheiro (conta #${fromAccountId})`,
        reference: { type: "accounts", id: fromAccountId },
        automatic: true,
    });
    // Passo 2 — entra dinheiro físico na gaveta.
    yield (0, exports.registerMovement)({
        companyId,
        userId,
        type: "ENTRADA",
        category: "LEVANTAMENTO_BANCO",
        amount,
        paymentMethod: "CASH",
        description: ((_l = params.description) === null || _l === void 0 ? void 0 : _l.trim()) || `Levantamento em dinheiro recebido`,
        reference: { type: "bank_movements", id: Number((_m = out === null || out === void 0 ? void 0 : out.getDataValue) === null || _m === void 0 ? void 0 : _m.call(out, "id")) || null },
        automatic: true,
    });
    return out;
});
exports.transferBankToCash = transferBankToCash;
/**
 * Saldo agregado da carteira (para o card "Saldo em Bancos" do dashboard):
 * soma accounts.balance por tipo, opcionalmente só activas.
 */
const getWalletTotals = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const accounts = (yield AccountModel_1.AccountModel.findAll({
        where: { companyId, is_active: 1 },
        attributes: ["type", "balance"],
        raw: true,
    }));
    const totals = { bank: 0, cash: 0, mobile: 0, ewallet: 0, total: 0 };
    accounts.forEach((a) => {
        const balance = Number(a.balance) || 0;
        const type = String(a.type);
        if (type === "BANCO")
            totals.bank += balance;
        else if (type === "CAIXA_FISICO")
            totals.cash += balance;
        else if (type === "MOBILE_MONEY")
            totals.mobile += balance;
        else
            totals.ewallet += balance;
        totals.total += balance;
    });
    return {
        bank: round2(totals.bank),
        cash: round2(totals.cash),
        mobile: round2(totals.mobile),
        ewallet: round2(totals.ewallet),
        total: round2(totals.total),
    };
});
exports.getWalletTotals = getWalletTotals;
