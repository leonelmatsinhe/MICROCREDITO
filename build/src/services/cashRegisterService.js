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
exports.getSystemRegisterToday = exports.getTodayRegister = exports.getDailySummary = exports.listRegisters = exports.suggestOpeningBalance = exports.listMovements = exports.recordPayment = exports.recordDisbursement = exports.createMovement = exports.closeRegister = exports.recalculateTotals = exports.openRegister = exports.getOpenRegister = exports.todayKey = void 0;
const db_1 = require("../database/db");
const CashRegisterModel_1 = require("../database/models/CashRegisterModel");
const CashMovementModel_1 = require("../database/models/CashMovementModel");
const sequelize_1 = require("sequelize");
// Arredonda para 2 casas decimais (dinheiro).
const round2 = (value) => Math.round(value * 100) / 100;
// Dia actual no fuso do servidor, formato YYYY-MM-DD (igual ao resto do sistema).
const todayKey = () => new Date().toISOString().slice(0, 10);
exports.todayKey = todayKey;
const registerPlain = (register) => (Object.assign(Object.assign({}, register.toJSON()), { opening_balance: Number(register.getDataValue("opening_balance")) || 0, total_in: Number(register.getDataValue("total_in")) || 0, total_out: Number(register.getDataValue("total_out")) || 0, total_cash_in: Number(register.getDataValue("total_cash_in")) || 0, total_cash_out: Number(register.getDataValue("total_cash_out")) || 0, total_bank_in: Number(register.getDataValue("total_bank_in")) || 0, total_bank_out: Number(register.getDataValue("total_bank_out")) || 0, closing_balance_informed: register.getDataValue("closing_balance_informed") != null
        ? Number(register.getDataValue("closing_balance_informed"))
        : null, closing_balance_calculated: register.getDataValue("closing_balance_calculated") != null
        ? Number(register.getDataValue("closing_balance_calculated"))
        : null, difference: register.getDataValue("difference") != null
        ? Number(register.getDataValue("difference"))
        : null }));
const movementPlain = (movement) => (Object.assign(Object.assign({}, movement.toJSON()), { amount: Number(movement.getDataValue("amount")) || 0 }));
/**
 * Busca o caixa ABERTO do utilizador para hoje (por empresa).
 * Devolve null se não houver caixa aberto.
 */
const getOpenRegister = (userId, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const register = yield CashRegisterModel_1.CashRegisterModel.findOne({
        where: {
            userId,
            companyId,
            status: "ABERTO",
            // ABERTO só interessa para o dia corrente; caixas esquecidos de dias
            // anteriores não bloqueiam nem recebem movimentos.
            opening_date: (0, exports.todayKey)(),
        },
        order: [["id", "DESC"]],
    });
    return register ? registerPlain(register) : null;
});
exports.getOpenRegister = getOpenRegister;
/**
 * Abre o caixa do dia. Exige opening_balance >= 0.
 * Falha com { code: "ALREADY_OPEN" } se já existir caixa aberto hoje.
 */
const openRegister = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, companyId, openingBalance } = params;
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
        throw { code: "INVALID_BALANCE", message: "Informe um saldo inicial válido (>= 0)." };
    }
    const existing = yield (0, exports.getOpenRegister)(userId, companyId);
    if (existing) {
        throw { code: "ALREADY_OPEN", message: "Já existe um caixa aberto hoje para este utilizador." };
    }
    // Segunda barreira: o índice único (userId, opening_date, companyId, status)
    // rejeita corridas concorrentes mesmo se a verificação acima passar.
    try {
        const register = yield CashRegisterModel_1.CashRegisterModel.create({
            companyId,
            userId,
            opening_date: (0, exports.todayKey)(),
            opening_time: new Date(),
            opening_balance: round2(openingBalance),
            total_in: 0,
            total_out: 0,
            total_cash_in: 0,
            total_cash_out: 0,
            total_bank_in: 0,
            total_bank_out: 0,
            status: "ABERTO",
        });
        return registerPlain(register);
    }
    catch (error) {
        if (String(error === null || error === void 0 ? void 0 : error.name).includes("UniqueConstraint")) {
            throw { code: "ALREADY_OPEN", message: "Já existe um caixa aberto hoje para este utilizador." };
        }
        throw error;
    }
});
exports.openRegister = openRegister;
/**
 * Recalcula os 6 totais do caixa a partir dos movimentos persistidos
 * (fonte de verdade): globais + separação CASH vs BANK. Implementação
 * delegada ao treasuryService (único dono da lógica de dinheiro).
 */
const recalculateTotals = (registerId, transaction) => __awaiter(void 0, void 0, void 0, function* () {
    const { recalculateRegisterTotals } = yield Promise.resolve().then(() => __importStar(require("./treasuryService")));
    return recalculateRegisterTotals(registerId, transaction);
});
exports.recalculateTotals = recalculateTotals;
/**
 * Fecha o caixa. Exige closing_balance_informed (valor CONTADO EM DINHEIRO
 * FÍSICO); calcula closing_balance_calculated (cash) e difference no backend.
 * Os totais bancários ficam separados (total_bank_in/out) — o fecho do caixa
 * de dinheiro físico não é afectado por transferências electrónicas.
 */
const closeRegister = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { registerId, userId, companyId, closingBalanceInformed } = params;
    if (!Number.isFinite(closingBalanceInformed) || closingBalanceInformed < 0) {
        throw { code: "INVALID_BALANCE", message: "Informe um valor contado válido (>= 0)." };
    }
    const register = yield CashRegisterModel_1.CashRegisterModel.findOne({
        where: { id: registerId, companyId },
    });
    if (!register) {
        throw { code: "NOT_FOUND", message: "Caixa não encontrado." };
    }
    if (register.getDataValue("status") === "FECHADO") {
        throw { code: "ALREADY_CLOSED", message: "Este caixa já foi fechado e é imutável." };
    }
    // CAIXA DO SISTEMA (userId = 0): qualquer utilizador autenticado da empresa
    // pode reconciliá-lo — os movimentos pertencem ao portal, não a um operador.
    const registerUserId = Number(register.getDataValue("userId"));
    if (registerUserId !== 0 && registerUserId !== Number(userId)) {
        throw { code: "FORBIDDEN", message: "Só o responsável pelo caixa o pode fechar." };
    }
    // Recalcular a partir dos movimentos persistidos antes do fecho.
    const totals = yield (0, exports.recalculateTotals)(registerId);
    // ── RECONCILIAÇÃO V2 — divergência > 0,01 MZN bloqueia o fecho ──
    // Compara tranzactions do dia vs movimentos de caixa vs recibos emitidos.
    try {
        const { reconcileDay } = yield Promise.resolve().then(() => __importStar(require("./reconciliationService")));
        const day = register.getDataValue("opening_date") || (0, exports.todayKey)();
        const reconciliation = yield reconcileDay(companyId, String(day).slice(0, 10));
        if (!reconciliation.ok) {
            throw {
                code: "RECONCILIATION_FAILED",
                message: `Fecho bloqueado: divergência entre transacções, caixa e recibos (${reconciliation.differences.movementsVsTranzactions.toFixed(2)} / ${reconciliation.differences.recibosVsTranzactions.toFixed(2)} MZN). Consulte /api/cash-registers/reconciliation.`,
                reconciliation,
            };
        }
    }
    catch (reconError) {
        // Só o bloqueio de reconciliação propaga — falha do próprio serviço de
        // reconciliação (ex.: tabela em migração) NÃO trava o fecho (legado segue).
        if ((reconError === null || reconError === void 0 ? void 0 : reconError.code) === "RECONCILIATION_FAILED")
            throw reconError;
        console.error("[closeRegister] Reconciliação indisponível (fecho segue):", (reconError === null || reconError === void 0 ? void 0 : reconError.message) || reconError);
    }
    const openingBalance = Number(register.getDataValue("opening_balance")) || 0;
    // Fecho em dinheiro físico: inicial + entradas cash − saídas cash.
    const closingCalculated = round2(openingBalance + totals.totalCashIn - totals.totalCashOut);
    const difference = round2(closingBalanceInformed - closingCalculated);
    yield register.update({
        status: "FECHADO",
        closing_balance_informed: round2(closingBalanceInformed),
        closing_balance_calculated: closingCalculated,
        difference,
        closing_time: new Date(),
        closed_at: new Date(),
        closedBy: userId,
        notes: (_a = params.notes) !== null && _a !== void 0 ? _a : register.getDataValue("notes"),
        total_in: totals.totalIn,
        total_out: totals.totalOut,
        total_cash_in: totals.totalCashIn,
        total_cash_out: totals.totalCashOut,
        total_bank_in: totals.totalBankIn,
        total_bank_out: totals.totalBankOut,
    });
    return registerPlain(register);
});
exports.closeRegister = closeRegister;
/**
 * MOVIMENTO MANUAL — delega no treasuryService (fonte única de verdade).
 * Mantém a assinatura antiga para os controladores existentes.
 */
const createMovement = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e, _f, _g;
    const { registerMovement } = yield Promise.resolve().then(() => __importStar(require("./treasuryService")));
    // Validações de entrada (mantidas aqui para erros específicos do caixa)
    if (params.type !== "ENTRADA" && params.type !== "SAIDA") {
        throw { code: "INVALID_TYPE", message: "Tipo de movimento inválido (ENTRADA ou SAIDA)." };
    }
    if (!CashMovementModel_1.CASH_CATEGORIES.includes(params.category)) {
        throw { code: "INVALID_CATEGORY", message: `Categoria inválida: ${params.category}` };
    }
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
        throw { code: "INVALID_AMOUNT", message: "O valor do movimento deve ser maior que zero." };
    }
    if (!params.description || String(params.description).trim().length === 0) {
        throw { code: "INVALID_DESCRIPTION", message: "A descrição é obrigatória." };
    }
    // O caixa indicado tem de existir, estar ABERTO e ser de hoje.
    const register = yield CashRegisterModel_1.CashRegisterModel.findOne({
        where: { id: params.cashRegisterId, companyId: params.companyId },
    });
    if (!register) {
        throw { code: "NOT_FOUND", message: "Caixa não encontrado." };
    }
    if (register.getDataValue("status") !== "ABERTO") {
        throw { code: "REGISTER_CLOSED", message: "Caixa fechado é imutável — não aceita movimentos." };
    }
    if (String(register.getDataValue("opening_date")) !== (0, exports.todayKey)()) {
        throw { code: "REGISTER_NOT_TODAY", message: "Só o caixa aberto hoje aceita movimentos." };
    }
    // Movimentos manuais são sempre CASH (BANK é para desembolso/pagamento real);
    // o treasuryService insere, recalcula e devolve o movimento persistido.
    return registerMovement({
        companyId: params.companyId,
        userId: (_b = params.userId) !== null && _b !== void 0 ? _b : null,
        type: params.type,
        category: params.category,
        amount: params.amount,
        paymentMethod: "CASH",
        description: params.description,
        loanId: (_c = params.loanId) !== null && _c !== void 0 ? _c : null,
        amortizationLoanId: (_d = params.amortizationLoanId) !== null && _d !== void 0 ? _d : null,
        tranzactionId: (_e = params.tranzactionId) !== null && _e !== void 0 ? _e : null,
        customerId: (_f = params.customerId) !== null && _f !== void 0 ? _f : null,
        automatic: (_g = params.automatic) !== null && _g !== void 0 ? _g : false,
    });
});
exports.createMovement = createMovement;
/**
 * Movimentos automáticos de DESMBOLSO/PAGAMENTO — delegam no treasuryService
 * com o método de pagamento e a conta bancária escolhidos no frontend.
 */
const recordDisbursement = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _h, _j, _k, _l;
    const { registerMovement, isElectronic } = yield Promise.resolve().then(() => __importStar(require("./treasuryService")));
    const method = (params.paymentMethod || "CASH").toUpperCase();
    const electronic = isElectronic(method);
    // O caixa ABERTO do utilizador — sem ele, nenhum movimento é aceite.
    const open = yield (0, exports.getOpenRegister)((_h = params.userId) !== null && _h !== void 0 ? _h : 0, params.companyId);
    if (!open) {
        throw { code: "CAIXA_FECHADO", message: "Abra o caixa do dia para continuar" };
    }
    yield registerMovement({
        companyId: params.companyId,
        userId: (_j = params.userId) !== null && _j !== void 0 ? _j : null,
        type: "SAIDA",
        category: "DESEMBOLSO",
        amount: params.amount,
        paymentMethod: (electronic ? method : "CASH"),
        bankAccountId: electronic ? Number(params.bankAccountId) : null,
        description: `Desembolso de crédito — conta ${(_k = params.accountNumber) !== null && _k !== void 0 ? _k : params.loanId}`,
        loanId: params.loanId,
        customerId: (_l = params.customerId) !== null && _l !== void 0 ? _l : null,
        reference: { type: "customer_loans", id: params.loanId },
        automatic: true,
    });
});
exports.recordDisbursement = recordDisbursement;
/**
 * Movimentos automáticos de PAGAMENTO de prestação:
 *  - ENTRADA / REEMBOLSO  → capital + juros normais;
 *  - ENTRADA / JUROS_MORA → juros de mora, se houver (> 0);
 *  - ENTRADA / TAXA_ADMIN → taxa administrativa, se houver (> 0).
 * Todos com o mesmo paymentMethod/bankAccountId (escolhidos no frontend).
 */
const recordPayment = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _m, _o, _p, _q, _r, _s, _t, _u, _v;
    const { registerMovement, isElectronic } = yield Promise.resolve().then(() => __importStar(require("./treasuryService")));
    const method = (params.paymentMethod || "CASH").toUpperCase();
    const electronic = isElectronic(method);
    const open = yield (0, exports.getOpenRegister)((_m = params.userId) !== null && _m !== void 0 ? _m : 0, params.companyId);
    if (!open) {
        throw { code: "CAIXA_FECHADO", message: "Abra o caixa do dia para continuar" };
    }
    const base = {
        companyId: params.companyId,
        userId: (_o = params.userId) !== null && _o !== void 0 ? _o : null,
        type: "ENTRADA",
        paymentMethod: (electronic ? method : "CASH"),
        bankAccountId: electronic ? Number(params.bankAccountId) : null,
        loanId: (_p = params.loanId) !== null && _p !== void 0 ? _p : null,
        amortizationLoanId: (_q = params.amortizationLoanId) !== null && _q !== void 0 ? _q : null,
        tranzactionId: (_r = params.tranzactionId) !== null && _r !== void 0 ? _r : null,
        customerId: (_s = params.customerId) !== null && _s !== void 0 ? _s : null,
        reference: { type: "amortization_loans", id: (_t = params.amortizationLoanId) !== null && _t !== void 0 ? _t : null },
        skipAccountLedger: !!params.skipAccountLedger,
    };
    const accountLabel = (_v = (_u = params.accountNumber) !== null && _u !== void 0 ? _u : params.loanId) !== null && _v !== void 0 ? _v : "-";
    yield registerMovement(Object.assign(Object.assign({}, base), { category: "REEMBOLSO", amount: params.amount, description: `Reembolso de prestação — conta ${accountLabel}`, automatic: true }));
    if (Number(params.lateInterest) > 0) {
        yield registerMovement(Object.assign(Object.assign({}, base), { category: "JUROS_MORA", amount: Number(params.lateInterest), description: `Juros de mora — conta ${accountLabel}`, automatic: true }));
    }
    if (Number(params.adminFee) > 0) {
        yield registerMovement(Object.assign(Object.assign({}, base), { category: "TAXA_ADMIN", amount: Number(params.adminFee), description: `Taxa administrativa — conta ${accountLabel}`, automatic: true }));
    }
});
exports.recordPayment = recordPayment;
/**
 * Lista os movimentos de um caixa (mais recentes primeiro).
 */
const listMovements = (registerId, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const register = yield CashRegisterModel_1.CashRegisterModel.findOne({
        where: { id: registerId, companyId },
    });
    if (!register)
        throw { code: "NOT_FOUND", message: "Caixa não encontrado." };
    const movements = (yield CashMovementModel_1.CashMovementModel.findAll({
        where: { cashRegisterId: registerId },
        order: [["id", "DESC"]],
    }));
    return movements.map(movementPlain);
});
exports.listMovements = listMovements;
/**
 * Histórico de caixas da empresa — para auditoria.
 *
 * Filtros opcionais:
 *  - from/to (YYYY-MM-DD): intervalo por opening_date;
 *  - limit: máximo de registos (default 60).
 * Enriquecido com o nome do utilizador responsável e o total de movimentos
 * de cada caixa, para exibição directa na página de histórico.
 */
/**
 * SUGESTÃO DE SALDO INICIAL ao abrir o caixa de hoje.
 *
 * Base: o VALOR CONTADO EM DINHEIRO no fecho do último caixa FECHADO do
 * utilizador (não o calculado — o contado é o que estava mesmo na gaveta).
 * No dia seguinte, esse valor vira o fundo de troco inicial.
 *
 * Fallbacks em cascata (cascata de robustez, nunca erro):
 *  1. Valor contado do último fecho com closing_balance_informed definido;
 *  2. Saldo calculado (cash) do último fecho sem contagem registada;
 *  3. 0 — primeiro dia do utilizador ou sem histórico.
 * Nunca sugere a partir do Caixa do Sistema (userId = 0) nem de caixas
 * ABERTOS esquecidos — só de caixas FECHADOS.
 */
const suggestOpeningBalance = (userId, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    // Só de caixas reais e fechados; o mais recente primeiro.
    const lastClosed = yield CashRegisterModel_1.CashRegisterModel.findOne({
        where: {
            companyId,
            status: "FECHADO",
            // Gaveta é por utilizador: só herda a contagem dos PRÓPRIOS fechos.
            userId,
        },
        order: [["id", "DESC"]],
    });
    // Sem fecho próprio (ex.: primeiro dia): usa o último fecho de QUALQUER
    // operador da empresa — o dinheiro é o mesmo no balcão.
    const fallback = lastClosed
        ? null
        : yield CashRegisterModel_1.CashRegisterModel.findOne({
            where: { companyId, userId: { [sequelize_1.Op.ne]: 0 }, status: "FECHADO" },
            order: [["id", "DESC"]],
        });
    const register = lastClosed || fallback;
    if (!register) {
        return { suggested: 0, source: "primeiro-dia", previousDate: null };
    }
    const informed = register.getDataValue("closing_balance_informed");
    const calculated = register.getDataValue("closing_balance_calculated");
    const date = String(register.getDataValue("opening_date") || "");
    if (informed != null) {
        return {
            suggested: round2(Number(informed) || 0),
            source: lastClosed ? "contado-anterior" : "contado-outro-operador",
            previousDate: date,
        };
    }
    // Fecho sem contagem (não deveria acontecer — fecho exige contagem — mas
    // fica à prova de dados antigos): usa o calculado cash.
    return {
        suggested: round2(Number(calculated) || 0),
        source: lastClosed ? "calculado-anterior" : "calculado-outro-operador",
        previousDate: date,
    };
});
exports.suggestOpeningBalance = suggestOpeningBalance;
const listRegisters = (companyId, limit = 60, from, to) => __awaiter(void 0, void 0, void 0, function* () {
    const where = { companyId };
    if (from && to)
        where.opening_date = { [sequelize_1.Op.between]: [String(from), String(to)] };
    else if (from)
        where.opening_date = { [sequelize_1.Op.gte]: String(from) };
    else if (to)
        where.opening_date = { [sequelize_1.Op.lte]: String(to) };
    const registers = (yield CashRegisterModel_1.CashRegisterModel.findAll({
        where,
        order: [["id", "DESC"]],
        limit,
    }));
    if (registers.length === 0)
        return [];
    // Nomes dos utilizadores responsáveis (uma só query para todos os caixas)
    const userIds = [...new Set(registers.map((r) => Number(r.getDataValue("userId"))))];
    const { UserModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/UserModel")));
    const users = (yield UserModel.findAll({
        where: { id: { [sequelize_1.Op.in]: userIds } },
        attributes: ["id", "name"],
        raw: true,
    }));
    const nameById = {};
    users.forEach((u) => { nameById[Number(u.id)] = u.name; });
    // Caixa do Sistema (userId = 0) — movimentos do portal fora de expediente.
    nameById[0] = "Sistema (Portal)";
    // Total de movimentos por caixa (uma só query agrupada)
    const registerIds = registers.map((r) => Number(r.getDataValue("id")));
    const counts = (yield CashMovementModel_1.CashMovementModel.findAll({
        where: { cashRegisterId: { [sequelize_1.Op.in]: registerIds } },
        attributes: ["cashRegisterId", [db_1.db.fn("COUNT", db_1.db.col("id")), "movementCount"]],
        group: ["cashRegisterId"],
        raw: true,
    }));
    const countByRegister = {};
    counts.forEach((c) => {
        countByRegister[Number(c.cashRegisterId)] = Number(c.movementCount) || 0;
    });
    return registers.map((register) => {
        const userId = Number(register.getDataValue("userId"));
        const plain = registerPlain(register);
        // Caixa do Sistema (userId = 0) — identificar claramente na UI de auditoria.
        plain.isSystemRegister = userId === 0;
        plain.userName = userId === 0
            ? "Sistema (Portal)"
            : nameById[userId] || `Utilizador #${userId}`;
        plain.movementCount = countByRegister[Number(register.getDataValue("id"))] || 0;
        return plain;
    });
});
exports.listRegisters = listRegisters;
/**
 * RESUMO DIÁRIO CONSOLIDADO (todas as caixas da empresa num dia):
 * totais CASH/BANK somados + movimentos por conta bancária (para o relatório
 * BM e para a tela de fecho).
 */
const getDailySummary = (companyId, date) => __awaiter(void 0, void 0, void 0, function* () {
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? String(date) : (0, exports.todayKey)();
    const registers = (yield CashRegisterModel_1.CashRegisterModel.findAll({
        where: { companyId, opening_date: day },
        order: [["id", "ASC"]],
    }));
    const totals = registers.reduce((acc, r) => {
        acc.opening_balance += Number(r.getDataValue("opening_balance")) || 0;
        acc.total_cash_in += Number(r.getDataValue("total_cash_in")) || 0;
        acc.total_cash_out += Number(r.getDataValue("total_cash_out")) || 0;
        acc.total_bank_in += Number(r.getDataValue("total_bank_in")) || 0;
        acc.total_bank_out += Number(r.getDataValue("total_bank_out")) || 0;
        acc.total_in += Number(r.getDataValue("total_in")) || 0;
        acc.total_out += Number(r.getDataValue("total_out")) || 0;
        return acc;
    }, { opening_balance: 0, total_cash_in: 0, total_cash_out: 0, total_bank_in: 0, total_bank_out: 0, total_in: 0, total_out: 0 });
    Object.keys(totals).forEach((key) => {
        totals[key] = round2(totals[key]);
    });
    // ── Separação PORTAL vs PRESENCIAL (relatório BM / PDF do caixa) ──
    // Portal = movimentos do Caixa do Sistema (userId = 0) e/ou descrição com
    // a etiqueta "[Portal — fora de expediente]". In-person = restantes caixas.
    const registerIds = registers.map((r) => Number(r.getDataValue("id")));
    const systemRegisterIds = registers
        .filter((r) => Number(r.getDataValue("userId")) === 0)
        .map((r) => Number(r.getDataValue("id")));
    let portalIn = 0, portalOut = 0, inPersonIn = 0, inPersonOut = 0;
    if (registerIds.length > 0) {
        const dayMovements = (yield CashMovementModel_1.CashMovementModel.findAll({
            where: { cashRegisterId: { [sequelize_1.Op.in]: registerIds } },
            attributes: ["cashRegisterId", "type", "amount", "description"],
            raw: true,
        }));
        dayMovements.forEach((m) => {
            const regId = Number(m.cashRegisterId);
            const isPortal = systemRegisterIds.includes(regId) ||
                String(m.description || "").includes("[Portal — fora de expediente]");
            const amount = Number(m.amount) || 0;
            if (isPortal) {
                if (m.type === "ENTRADA")
                    portalIn += amount;
                else
                    portalOut += amount;
            }
            else {
                if (m.type === "ENTRADA")
                    inPersonIn += amount;
                else
                    inPersonOut += amount;
            }
        });
    }
    const channelSplit = {
        portal: {
            in: round2(portalIn),
            out: round2(portalOut),
            // Líquido do canal portal (electrónico)
            net: round2(portalIn - portalOut),
            registerCount: systemRegisterIds.length,
        },
        inPerson: {
            in: round2(inPersonIn),
            out: round2(inPersonOut),
            net: round2(inPersonIn - inPersonOut),
            registerCount: registerIds.length - systemRegisterIds.length,
        },
    };
    // Extrato do dia agrupado por conta bancária (dados reais de accounts).
    const { getStatementGroupedByAccount } = yield Promise.resolve().then(() => __importStar(require("./bankAccountService")));
    const bankStatement = yield getStatementGroupedByAccount(companyId, day);
    return {
        date: day,
        registers: registers.map(registerPlain),
        totals,
        channelSplit,
        bankStatement,
    };
});
exports.getDailySummary = getDailySummary;
/**
 * Caixa de HOJE do utilizador: aberto (com movimentos) ou o último fechado
 * do dia. Se nenhum existir, devolve null — o frontend mostra o banner
 * "Nenhum caixa aberto hoje".
 */
const getTodayRegister = (userId, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const today = (0, exports.todayKey)();
    const register = yield CashRegisterModel_1.CashRegisterModel.findOne({
        where: {
            userId,
            companyId,
            opening_date: today,
            [sequelize_1.Op.or]: [{ status: "ABERTO" }, { status: "FECHADO" }],
        },
        order: [["id", "DESC"]],
    });
    if (!register)
        return null;
    const plain = registerPlain(register);
    plain.movements = yield (0, exports.listMovements)(plain.id, companyId);
    return plain;
});
exports.getTodayRegister = getTodayRegister;
/**
 * CAIXA DO SISTEMA de hoje (userId = 0) — movimentos do portal fora de
 * expediente. NÃO é criado aqui (só nasce quando um pagamento do portal
 * chega de noite); devolve null nos dias sem movimentos fora de hora.
 * Enriquecido com os movimentos para o card do Caixa Central.
 *
 * @param portalSince Data/hora (ISO) de corte opcional — quando fornecida,
 *        apenas os movimentos criados DEPOIS dessa hora são devolvidos em
 *        `movements`, e o resumo `newSince` (qtde + total ENTRADAS) alimenta
 *        o alerta do sino: "pagamentos que chegaram depois do último fecho".
 */
const getSystemRegisterToday = (companyId, portalSince) => __awaiter(void 0, void 0, void 0, function* () {
    const register = yield CashRegisterModel_1.CashRegisterModel.findOne({
        where: {
            companyId,
            userId: 0,
            opening_date: (0, exports.todayKey)(),
        },
        order: [["id", "DESC"]],
    });
    if (!register)
        return null;
    const plain = registerPlain(register);
    plain.isSystemRegister = true;
    plain.userName = "Sistema (Portal)";
    // Todos os movimentos do caixa (card do Caixa Central usa a lista completa).
    const allMovements = yield (0, exports.listMovements)(plain.id, companyId);
    plain.movements = allMovements;
    // Corte opcional para o ALERTA: só o que chegou após o último fecho.
    if (portalSince) {
        const since = new Date(portalSince);
        if (!Number.isNaN(since.getTime())) {
            const fresh = allMovements.filter((m) => new Date(m.createdAt).getTime() > since.getTime());
            plain.movements = fresh;
            plain.newSince = {
                since: since.toISOString(),
                count: fresh.length,
                totalIn: round2(fresh.reduce((s, m) => s + (String(m.type) === "ENTRADA" ? Number(m.amount) || 0 : 0), 0)),
                byMethod: fresh.reduce((acc, m) => {
                    if (String(m.type) === "ENTRADA") {
                        const key = String(m.paymentMethod || "BANK");
                        acc[key] = round2((acc[key] || 0) + (Number(m.amount) || 0));
                    }
                    return acc;
                }, {}),
            };
        }
    }
    return plain;
});
exports.getSystemRegisterToday = getSystemRegisterToday;
