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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CASH_DRAWER_OUT_CATEGORIES = exports.CASH_CLOSING_TYPES = exports.CASH_CATEGORY_LABELS = exports.MZN_DENOMINATIONS = exports.getTreasuryPanel = exports.getCashLimitSituation = exports.annotateCashDifference = exports.justifyCashDifference = exports.listCashDifferences = exports.getSystemRegisterToday = exports.getTodayRegister = exports.getDailySummary = exports.listRegisters = exports.suggestOpeningBalance = exports.listMovements = exports.recordPayment = exports.recordDisbursement = exports.createMovement = exports.closeRegister = exports.recalculateTotals = exports.openRegister = exports.getOpenRegister = exports.computeClosingDifference = exports.buildRegisterView = exports.buildMapaBM = exports.buildLimitInfo = exports.cashInDrawer = exports.openingFundoMemo = exports.registerPublic = exports.todayKey = void 0;
const db_1 = require("../database/db");
const CashRegisterModel_1 = require("../database/models/CashRegisterModel");
Object.defineProperty(exports, "CASH_CLOSING_TYPES", { enumerable: true, get: function () { return CashRegisterModel_1.CASH_CLOSING_TYPES; } });
const CashMovementModel_1 = require("../database/models/CashMovementModel");
Object.defineProperty(exports, "CASH_CATEGORY_LABELS", { enumerable: true, get: function () { return CashMovementModel_1.CASH_CATEGORY_LABELS; } });
Object.defineProperty(exports, "CASH_DRAWER_OUT_CATEGORIES", { enumerable: true, get: function () { return CashMovementModel_1.CASH_DRAWER_OUT_CATEGORIES; } });
const CashDifferenceModel_1 = require("../database/models/CashDifferenceModel");
const mznDenominations_1 = require("../utils/mznDenominations");
Object.defineProperty(exports, "MZN_DENOMINATIONS", { enumerable: true, get: function () { return mznDenominations_1.MZN_DENOMINATIONS; } });
const cashLimit_1 = require("../utils/cashLimit");
const sequelize_1 = require("sequelize");
// Arredonda para 2 casas decimais (dinheiro).
const round2 = (value) => Math.round(value * 100) / 100;
// Dia actual no fuso do servidor, formato YYYY-MM-DD (igual ao resto do sistema).
const todayKey = () => new Date().toISOString().slice(0, 10);
exports.todayKey = todayKey;
const registerPlain = (register) => (Object.assign(Object.assign({}, register.toJSON()), { opening_balance: Number(register.getDataValue("opening_balance")) || 0, counted_open: register.getDataValue("counted_open") != null
        ? Number(register.getDataValue("counted_open"))
        : null, total_in: Number(register.getDataValue("total_in")) || 0, total_out: Number(register.getDataValue("total_out")) || 0, total_cash_in: Number(register.getDataValue("total_cash_in")) || 0, total_cash_out: Number(register.getDataValue("total_cash_out")) || 0, total_bank_in: Number(register.getDataValue("total_bank_in")) || 0, total_bank_out: Number(register.getDataValue("total_bank_out")) || 0, closing_balance_informed: register.getDataValue("closing_balance_informed") != null
        ? Number(register.getDataValue("closing_balance_informed"))
        : null, closing_balance_calculated: register.getDataValue("closing_balance_calculated") != null
        ? Number(register.getDataValue("closing_balance_calculated"))
        : null, difference: register.getDataValue("difference") != null
        ? Number(register.getDataValue("difference"))
        : null }));
const movementPlain = (movement) => (Object.assign(Object.assign({}, movement.toJSON()), { amount: Number(movement.getDataValue("amount")) || 0 }));
// ─────────────────────────────────────────────────────────────────────────────
// CONFORMIDADE CONTABILIDADE MOÇAMBICANA — fecho cego por denominação
// ─────────────────────────────────────────────────────────────────────────────
/**
 * VERSÃO PÚBLICA DO CAIXA (para o frontend).
 *
 * `closing_balance_calculated` NUNCA sai daqui: o saldo apurado pelo sistema
 * é controlo interno — o operador conta o numerário denominação a denominação
 * (contagem cega) e o backend apura a diferença no fecho.
 */
const registerPublic = (plain) => {
    const _a = plain || {}, { closing_balance_calculated } = _a, rest = __rest(_a, ["closing_balance_calculated"]);
    return rest;
};
exports.registerPublic = registerPublic;
/**
 * FUNDO DE MANEIO CONTADO NA ABERTURA (memorando físico da gaveta).
 *
 * Desde "abrir com saldo zero disponível", o saldo inicial (`opening_balance`)
 * é SEMPRE 0: o valor que existe na gaveta ao abrir é contado como fundo de
 * maneio (`counted_open`) e fica fora do saldo — não arrasta, não é sugerido e
 * não dá direito a valor disponível a ninguém. O memorando é a base física da
 * reconciliação do fecho, do Mapa BM e do limite de numerário.
 *
 * Registos antigos (pré-regra) guardavam o fundo em `opening_balance`.
 */
const openingFundoMemo = (register) => {
    const get = (key) => (register === null || register === void 0 ? void 0 : register.getDataValue) ? register.getDataValue(key) : register === null || register === void 0 ? void 0 : register[key];
    const counted = get("counted_open");
    if (counted !== undefined && counted !== null)
        return round2(Number(counted) || 0);
    return round2(Number(get("opening_balance")) || 0);
};
exports.openingFundoMemo = openingFundoMemo;
/** Dinheiro físico apurado na gaveta (fundo de maneio + entradas cash − saídas cash). */
const cashInDrawer = (register) => round2((0, exports.openingFundoMemo)(register) +
    (Number(register === null || register === void 0 ? void 0 : register.total_cash_in) || 0) -
    (Number(register === null || register === void 0 ? void 0 : register.total_cash_out) || 0));
exports.cashInDrawer = cashInDrawer;
/** Situação do LIMITE DE NUMERÁRIO EM CAIXA (circular do BM). */
const buildLimitInfo = (register) => {
    const limit = (0, cashLimit_1.getCashLimitMzn)();
    const provider = (0, exports.cashInDrawer)(register);
    const excedente = round2(Math.max(0, provider - limit));
    return {
        cash_limit_mzn: limit,
        limite_activo: (0, cashLimit_1.isCashLimitEnabled)(),
        dinheiro_em_caixa: provider,
        excedido: (0, cashLimit_1.isCashLimitEnabled)() && excedente > 0,
        excedente,
    };
};
exports.buildLimitInfo = buildLimitInfo;
/**
 * MAPA DIÁRIO DE CAIXA — MODELO BM.
 *
 * Quadro oficial do dia (dinheiro físico):
 *   Saldo Inicial + Entradas − Saídas − Entregas ao Cofre = Saldo Final.
 * As "Saídas" excluem as entregas ao cofre e os depósitos bancários (têm linha
 * própria) e as diferenças de caixa aparecem em linha de memorando.
 * Sempre calculado no backend (o PDF só imprime o quadro).
 */
const buildMapaBM = (register, movements = []) => {
    const cashMovements = (movements || []).filter((m) => String(m.paymentMethod || "CASH") === "CASH");
    const sum = (predicate) => round2(cashMovements
        .filter(predicate)
        .reduce((total, m) => total + (Number(m.amount) || 0), 0));
    const entregasCofre = sum((m) => m.category === "ENTREGA_COFRE" && m.type === "SAIDA");
    const depositosBancarios = sum((m) => ["DEPOSITO_BANCARIO", "DEPOSITO_BANCO"].includes(String(m.category)) && m.type === "SAIDA");
    const quebras = sum((m) => m.category === "DIFERENCA_CAIXA" && m.type === "SAIDA");
    const sobras = sum((m) => m.category === "DIFERENCA_CAIXA" && m.type === "ENTRADA");
    // Saldo inicial do Mapa BM = o FUNDO DE MANEIO físico contado na abertura
    // (rótulo do PDF: "Saldo Inicial (Fundo de Maneio)"). O saldo DISPONÍVEL do
    // caixa é outro e começa sempre a zero (opening_balance = 0).
    const saldoInicial = (0, exports.openingFundoMemo)(register);
    const entradas = round2(Number(register === null || register === void 0 ? void 0 : register.total_cash_in) || 0);
    const saidasTotais = round2(Number(register === null || register === void 0 ? void 0 : register.total_cash_out) || 0);
    const saidasOperacionais = round2(saidasTotais - entregasCofre - depositosBancarios - quebras);
    const saldoFinal = round2(saldoInicial + entradas - saidasTotais);
    return {
        titulo: "Mapa de Caixa - Modelo BM",
        data: (register === null || register === void 0 ? void 0 : register.opening_date) || null,
        tipo_fechamento: (register === null || register === void 0 ? void 0 : register.tipo_fechamento) || null,
        tipo_fechamento_label: (register === null || register === void 0 ? void 0 : register.tipo_fechamento)
            ? CashRegisterModel_1.CASH_CLOSING_TYPE_LABELS[String(register.tipo_fechamento)] || register.tipo_fechamento
            : null,
        saldo_inicial: saldoInicial,
        entradas,
        saidas: saidasOperacionais,
        entregas_cofre: entregasCofre,
        depositos_bancarios: depositosBancarios,
        quebras,
        sobras,
        saldo_final: saldoFinal,
        // Movimento electrónico do dia (não passa pela gaveta — contexto do BM)
        entradas_electronicas: round2(Number(register === null || register === void 0 ? void 0 : register.total_bank_in) || 0),
        saidas_electronicas: round2(Number(register === null || register === void 0 ? void 0 : register.total_bank_out) || 0),
        valor_contado: (register === null || register === void 0 ? void 0 : register.closing_balance_informed) != null
            ? round2(Number(register.closing_balance_informed))
            : null,
        diferenca: (register === null || register === void 0 ? void 0 : register.difference) != null ? round2(Number(register.difference)) : null,
    };
};
exports.buildMapaBM = buildMapaBM;
/**
 * Vista pública de um caixa: campos sem o saldo apurado + mapa BM + limite.
 * Usada por todos os endpoints que falam com o frontend.
 */
const buildRegisterView = (plain, movements = [], extra = {}) => (Object.assign(Object.assign(Object.assign({}, (0, exports.registerPublic)(plain)), { mapa_bm: (0, exports.buildMapaBM)(plain, movements), limites: (0, exports.buildLimitInfo)(plain) }), extra));
exports.buildRegisterView = buildRegisterView;
/**
 * Diferença apurada no fecho: valor contado − saldo apurado.
 * > 0 = sobra (entrou mais dinheiro do que o apurado);
 * < 0 = quebra (falta dinheiro na gaveta).
 */
const computeClosingDifference = (counted, calculated) => round2(counted - calculated);
exports.computeClosingDifference = computeClosingDifference;
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
 * Abre o caixa do dia — SEM SALDO DISPONÍVEL ("saldo zero na abertura").
 *
 * O saldo inicial (`opening_balance`) é SEMPRE 0: o valor existente na gaveta
 * não arrasta, não fica disponível e não dá direito a ninguém. A contagem por
 * denominação aceite aqui é o FUNDO DE MANEIO — gravada como memorando físico
 * (`counted_open` + `denominations_open`) que reconcilia o fecho, o Mapa BM e
 * o limite de numerário sem gerar sobras/quebras fantasma.
 *
 * Aceita:
 *  - `denominations`: contagem por denominação do fundo de maneio (o backend
 *    soma a grelha — o operador não escreve o total à mão);
 *  - `openingBalance`: fundo informado directamente (compatibilidade).
 *
 * Falha com { code: "ALREADY_OPEN" } se já existir caixa aberto hoje.
 */
const openRegister = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, companyId } = params;
    // ── MODO ELECTRÓNICO: o caixa de numerário está desactivado ──
    // A empresa gere o dia por conta bancária; ABRIR caixa físico aqui criaria
    // um registo paralelo que o modo electrónico não reconcilia. O operador é
    // encaminhado para Configurações → Caixa.
    const { isElectronicCashMode, PHYSICAL_MODE_REQUIRED_MESSAGE } = yield Promise.resolve().then(() => __importStar(require("./cashModeService")));
    if (yield isElectronicCashMode(companyId)) {
        throw { code: "INVALID_MODE", message: PHYSICAL_MODE_REQUIRED_MESSAGE };
    }
    // Uma contagem enviada é sempre autoritária (mesmo que dê 0 unidades: o
    // operador está a dizer que não há dinheiro na gaveta).
    const hasDenominations = params.denominations !== undefined && params.denominations !== null;
    const denominationsOpen = (0, mznDenominations_1.normalizeDenominationsFull)(params.denominations);
    const openingBalance = hasDenominations
        ? (0, mznDenominations_1.sumDenominations)(denominationsOpen)
        : Number(params.openingBalance);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
        throw { code: "INVALID_BALANCE", message: "Informe um saldo inicial válido (>= 0) ou a contagem por denominação." };
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
            // SALDO ZERO DISPONÍVEL NA ABERTURA: o valor contado (fundo de maneio)
            // nunca vira saldo — fica como memorando físico em `counted_open`.
            opening_balance: 0,
            counted_open: round2(openingBalance),
            denominations_open: hasDenominations ? denominationsOpen : null,
            total_in: 0,
            total_out: 0,
            total_cash_in: 0,
            total_cash_out: 0,
            total_bank_in: 0,
            total_bank_out: 0,
            status: "ABERTO",
        });
        return (0, exports.buildRegisterView)(registerPlain(register));
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
 * FECHA O CAIXA — CONTAGEM CEGA POR DENOMINAÇÃO.
 *
 * O operador informa a contagem do numerário físico denominação a denominação
 * (notas e moedas); o backend soma, apura a diferença contra o saldo calculado
 * e NUNCA devolve o saldo apurado (`closing_balance_calculated`) ao frontend.
 *
 * Diferença != 0 → cria automaticamente:
 *   1. o movimento DIFERENCA_CAIXA (auto de ocorrência — a gaveta regulariza-se
 *      com o valor efectivamente contado);
 *   2. uma pendência em `cash_differences` para o Admin justificar e lançar no
 *      Livro Caixa (conta 58x — Quebras de Caixa).
 *
 * Os totais bancários ficam separados (total_bank_in/out) — o fecho do caixa de
 * dinheiro físico não é afectado por transferências electrónicas.
 */
const closeRegister = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { registerId, userId, companyId } = params;
    // ── CONTAGEM POR DENOMINAÇÃO ─────────────────────────────────────────────
    // O total contado é SEMPRE calculado no backend a partir das notas/moedas —
    // o operador não escreve o total à mão. O valor informado directamente só é
    // aceite quando não vem contagem (compatibilidade com clientes antigos).
    const denominationsClose = (0, mznDenominations_1.normalizeDenominationsFull)(params.denominations);
    const hasDenominations = params.denominations !== undefined && params.denominations !== null;
    const closingBalanceInformed = hasDenominations
        ? (0, mznDenominations_1.sumDenominations)(denominationsClose)
        : Number(params.closingBalanceInformed);
    if (!Number.isFinite(closingBalanceInformed) || closingBalanceInformed < 0) {
        throw {
            code: "INVALID_BALANCE",
            message: "Informe a contagem do numerário por denominação (notas e moedas) para fechar o caixa.",
        };
    }
    const requestedTipoFechamento = params.tipoFechamento
        ? String(params.tipoFechamento).trim().toUpperCase()
        : null;
    if (requestedTipoFechamento &&
        !CashRegisterModel_1.CASH_CLOSING_TYPES.includes(requestedTipoFechamento)) {
        throw {
            code: "INVALID_CLOSING_TYPE",
            message: `Tipo de fecho inválido: ${params.tipoFechamento}. Use ${CashRegisterModel_1.CASH_CLOSING_TYPES.join(", ")}.`,
        };
    }
    // ── MODO ELECTRÓNICO: fecho de caixa de numerário está desactivado ──
    const { isElectronicCashMode, PHYSICAL_MODE_REQUIRED_MESSAGE } = yield Promise.resolve().then(() => __importStar(require("./cashModeService")));
    if (yield isElectronicCashMode(companyId)) {
        throw { code: "INVALID_MODE", message: PHYSICAL_MODE_REQUIRED_MESSAGE };
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
    let totals = yield (0, exports.recalculateTotals)(registerId);
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
    // Saldo APURADO em dinheiro físico (fundo de maneio contado na abertura +
    // entradas cash − saídas cash): o fundo é memorado, mas entra aqui para a
    // gaveta bater certo com a contagem — sem sobras/quebras fantasma e sem
    // dar direito a esse valor a ninguém. Fica apenas no servidor — nunca é
    // devolvido ao frontend.
    const closingCalculated = round2((0, exports.openingFundoMemo)(register) + totals.totalCashIn - totals.totalCashOut);
    const difference = (0, exports.computeClosingDifference)(closingBalanceInformed, closingCalculated);
    const hasDifference = Math.abs(difference) >= 0.01;
    // ── TIPO DE FECHAMENTO ───────────────────────────────────────────────────
    // A divergência manda: se o contado não bate, o fecho é sempre DIVERGENCIA
    // (auto de ocorrência). Caso contrário respeita o tipo pedido pelo operador.
    const tipoFechamento = hasDifference
        ? "DIVERGENCIA"
        : (requestedTipoFechamento || "NORMAL");
    // Fecho com entrega ao cofre / depósito do excedente EXIGE o movimento do dia
    // (entrega ao Cofre/Tesoureiro com comprovativo assinado, ou guia de depósito).
    if (tipoFechamento === "ENTREGA_COFRE" || tipoFechamento === "DEPOSITO_BANCARIO") {
        const entregues = (yield CashMovementModel_1.CashMovementModel.findAll({
            where: { cashRegisterId: registerId, category: tipoFechamento, type: "SAIDA" },
            attributes: ["id"],
            raw: true,
        }));
        if (entregues.length === 0) {
            throw {
                code: "DELIVERY_REQUIRED",
                message: tipoFechamento === "ENTREGA_COFRE"
                    ? "O fecho com entrega ao Cofre exige um movimento ENTREGA_COFRE registado (entrega do excedente ao Cofre Central/Tesoureiro, com comprovativo assinado)."
                    : "O fecho com depósito bancário exige um movimento DEPOSITO_BANCARIO registado (guia de depósito do excedente no banco).",
            };
        }
    }
    // ── AUTO DE OCORRÊNCIA AUTOMÁTICO (quebra / sobra) ───────────────────────
    let diferencaPendente = null;
    if (hasDifference) {
        const quebra = difference < 0;
        const valorAbsoluto = round2(Math.abs(difference));
        // 1. Movimento DIFERENCA_CAIXA: a gaveta fica regularizada com o valor
        //    efectivamente contado (quebra sai, sobra entra).
        const movimentoDiferenca = yield (0, exports.createMovement)({
            cashRegisterId: registerId,
            companyId,
            type: quebra ? "SAIDA" : "ENTRADA",
            category: "DIFERENCA_CAIXA",
            amount: valorAbsoluto,
            description: quebra
                ? `Auto de ocorrência — quebra de caixa de ${valorAbsoluto.toFixed(2)} MZN (conta ${CashDifferenceModel_1.CASH_DIFFERENCE_ACCOUNT_DEFAULT} — Quebras de Caixa)`
                : `Auto de ocorrência — sobra de caixa de ${valorAbsoluto.toFixed(2)} MZN (conta ${CashDifferenceModel_1.CASH_DIFFERENCE_ACCOUNT_DEFAULT} — Quebras de Caixa)`,
            userId,
            automatic: true,
        });
        // Totais já com a regularização — o mapa diário fecha no valor contado.
        totals = yield (0, exports.recalculateTotals)(registerId);
        // 2. Pendência para o Admin justificar e lançar no Livro Caixa (conta 58x).
        const pendencia = yield CashDifferenceModel_1.CashDifferenceModel.create({
            companyId,
            cashRegisterId: registerId,
            cashMovementId: Number((_a = movimentoDiferenca === null || movimentoDiferenca === void 0 ? void 0 : movimentoDiferenca.getDataValue) === null || _a === void 0 ? void 0 : _a.call(movimentoDiferenca, "id")) || null,
            userId,
            data_caixa: String(register.getDataValue("opening_date") || (0, exports.todayKey)()).slice(0, 10),
            tipo: quebra ? "QUEBRA" : "SOBRA",
            valor: valorAbsoluto,
            valor_contado: round2(closingBalanceInformed),
            valor_apurado: closingCalculated,
            conta_contabilistica: CashDifferenceModel_1.CASH_DIFFERENCE_ACCOUNT_DEFAULT,
            status: "PENDENTE",
        });
        diferencaPendente = pendencia.toJSON();
        console.warn(`[Caixa] ${quebra ? "QUEBRA" : "SOBRA"} de caixa de ${valorAbsoluto.toFixed(2)} MZN no fecho do caixa #${registerId} ` +
            `(empresa ${companyId}) — pendência #${diferencaPendente.id} para o Admin justificar e lançar na conta ${CashDifferenceModel_1.CASH_DIFFERENCE_ACCOUNT_DEFAULT}.`);
    }
    yield register.update({
        status: "FECHADO",
        closing_balance_informed: round2(closingBalanceInformed),
        closing_balance_calculated: closingCalculated,
        difference,
        denominations_close: hasDenominations ? denominationsClose : null,
        tipo_fechamento: tipoFechamento,
        closing_time: new Date(),
        closed_at: new Date(),
        closedBy: userId,
        notes: (_b = params.notes) !== null && _b !== void 0 ? _b : register.getDataValue("notes"),
        total_in: totals.totalIn,
        total_out: totals.totalOut,
        total_cash_in: totals.totalCashIn,
        total_cash_out: totals.totalCashOut,
        total_bank_in: totals.totalBankIn,
        total_bank_out: totals.totalBankOut,
    });
    const movements = yield (0, exports.listMovements)(registerId, companyId);
    // Resposta pública: sem `closing_balance_calculated`.
    return (0, exports.buildRegisterView)(registerPlain(register), movements, {
        tipo_fechamento_label: CashRegisterModel_1.CASH_CLOSING_TYPE_LABELS[String(register.getDataValue("tipo_fechamento"))] || null,
        diferenca_apurada: hasDifference,
        diferenca_pendente: diferencaPendente,
        contagem_denominacoes: hasDenominations ? denominationsClose : null,
        aviso: hasDifference
            ? "Diferença apurada: foi criado um auto de ocorrência (DIFERENCA_CAIXA) pendente de justificação pelo Admin e de lançamento na conta 58x — Quebras de Caixa."
            : null,
    });
});
exports.closeRegister = closeRegister;
/**
 * MOVIMENTO MANUAL — delega no treasuryService (fonte única de verdade).
 * Mantém a assinatura antiga para os controladores existentes.
 */
const createMovement = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e, _f, _g, _h;
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
        userId: (_c = params.userId) !== null && _c !== void 0 ? _c : null,
        type: params.type,
        category: params.category,
        amount: params.amount,
        paymentMethod: "CASH",
        description: params.description,
        loanId: (_d = params.loanId) !== null && _d !== void 0 ? _d : null,
        amortizationLoanId: (_e = params.amortizationLoanId) !== null && _e !== void 0 ? _e : null,
        tranzactionId: (_f = params.tranzactionId) !== null && _f !== void 0 ? _f : null,
        customerId: (_g = params.customerId) !== null && _g !== void 0 ? _g : null,
        automatic: (_h = params.automatic) !== null && _h !== void 0 ? _h : false,
    });
});
exports.createMovement = createMovement;
/**
 * Movimentos automáticos de DESMBOLSO/PAGAMENTO — delegam no treasuryService
 * com o método de pagamento e a conta bancária escolhidos no frontend.
 */
const recordDisbursement = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _j, _k, _l, _m;
    const { registerMovement, isElectronic } = yield Promise.resolve().then(() => __importStar(require("./treasuryService")));
    const method = (params.paymentMethod || "CASH").toUpperCase();
    const electronic = isElectronic(method);
    // O caixa ABERTO do utilizador — obrigatório apenas em modo FÍSICO. No modo
    // ELECTRÓNICO o desembolso segue sem caixa (o dia é reconciliado por conta
    // bancária; o movimento fica auditado no Caixa do Sistema).
    const open = yield (0, exports.getOpenRegister)((_j = params.userId) !== null && _j !== void 0 ? _j : 0, params.companyId);
    if (!open) {
        const { isPhysicalCashMode } = yield Promise.resolve().then(() => __importStar(require("./cashModeService")));
        if (yield isPhysicalCashMode(params.companyId)) {
            throw { code: "CAIXA_FECHADO", message: "Abra o caixa do dia para continuar" };
        }
    }
    yield registerMovement({
        companyId: params.companyId,
        userId: (_k = params.userId) !== null && _k !== void 0 ? _k : null,
        type: "SAIDA",
        category: "DESEMBOLSO",
        amount: params.amount,
        paymentMethod: (electronic ? method : "CASH"),
        bankAccountId: electronic ? Number(params.bankAccountId) : null,
        description: `Desembolso de crédito — conta ${(_l = params.accountNumber) !== null && _l !== void 0 ? _l : params.loanId}`,
        loanId: params.loanId,
        customerId: (_m = params.customerId) !== null && _m !== void 0 ? _m : null,
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
    var _o, _p, _q, _r, _s, _t, _u, _v, _w;
    const { registerMovement, isElectronic } = yield Promise.resolve().then(() => __importStar(require("./treasuryService")));
    const method = (params.paymentMethod || "CASH").toUpperCase();
    const electronic = isElectronic(method);
    const open = yield (0, exports.getOpenRegister)((_o = params.userId) !== null && _o !== void 0 ? _o : 0, params.companyId);
    if (!open) {
        const { isPhysicalCashMode } = yield Promise.resolve().then(() => __importStar(require("./cashModeService")));
        if (yield isPhysicalCashMode(params.companyId)) {
            throw { code: "CAIXA_FECHADO", message: "Abra o caixa do dia para continuar" };
        }
    }
    const base = {
        companyId: params.companyId,
        userId: (_p = params.userId) !== null && _p !== void 0 ? _p : null,
        type: "ENTRADA",
        paymentMethod: (electronic ? method : "CASH"),
        bankAccountId: electronic ? Number(params.bankAccountId) : null,
        loanId: (_q = params.loanId) !== null && _q !== void 0 ? _q : null,
        amortizationLoanId: (_r = params.amortizationLoanId) !== null && _r !== void 0 ? _r : null,
        tranzactionId: (_s = params.tranzactionId) !== null && _s !== void 0 ? _s : null,
        customerId: (_t = params.customerId) !== null && _t !== void 0 ? _t : null,
        reference: { type: "amortization_loans", id: (_u = params.amortizationLoanId) !== null && _u !== void 0 ? _u : null },
        skipAccountLedger: !!params.skipAccountLedger,
    };
    const accountLabel = (_w = (_v = params.accountNumber) !== null && _v !== void 0 ? _v : params.loanId) !== null && _w !== void 0 ? _w : "-";
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
 * SUGESTÃO DE SALDO INICIAL — INVALIDADA ("zerar e tirar do rasto").
 *
 * O caixa de hoje abre SEM SALDO DISPONÍVEL (opening_balance = 0 sempre): o
 * valor do fecho anterior NÃO é arrastado nem sugerido e ninguém ganha direito
 * a ele. O que existe na gaveta ao abrir é contado como FUNDO DE MANEIO
 * (memorando físico — `counted_open`) e serve apenas de base física à
 * reconciliação do fecho, ao Mapa BM e ao limite de numerário.
 *
 * O endpoint mantém-se (clientes antigos) mas devolve sempre zero.
 */
const suggestOpeningBalance = (_userId, _companyId) => __awaiter(void 0, void 0, void 0, function* () {
    return { suggested: 0, source: "saldo-zero", previousDate: null };
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
        // registerPublic: sem o saldo apurado (closing_balance_calculated).
        return Object.assign(Object.assign({}, (0, exports.registerPublic)(plain)), { limites: (0, exports.buildLimitInfo)(plain) });
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
    // Mapa diário consolidado (Modelo BM) — todos os caixas do dia somados.
    const consolidated = registers.reduce((acc, r) => {
        const plain = registerPlain(r);
        const mapa = (0, exports.buildMapaBM)(plain);
        acc.saldo_inicial = round2(acc.saldo_inicial + mapa.saldo_inicial);
        acc.entradas = round2(acc.entradas + mapa.entradas);
        acc.saidas = round2(acc.saidas + mapa.saidas);
        acc.entregas_cofre = round2(acc.entregas_cofre + mapa.entregas_cofre);
        acc.depositos_bancarios = round2(acc.depositos_bancarios + mapa.depositos_bancarios);
        acc.quebras = round2(acc.quebras + mapa.quebras);
        acc.sobras = round2(acc.sobras + mapa.sobras);
        acc.saldo_final = round2(acc.saldo_final + mapa.saldo_final);
        return acc;
    }, {
        saldo_inicial: 0, entradas: 0, saidas: 0, entregas_cofre: 0,
        depositos_bancarios: 0, quebras: 0, sobras: 0, saldo_final: 0,
    });
    return {
        date: day,
        // registerPublic em cada caixa: o saldo apurado não vai para o frontend.
        registers: registers.map((r) => (Object.assign(Object.assign({}, (0, exports.registerPublic)(registerPlain(r))), { limites: (0, exports.buildLimitInfo)(registerPlain(r)) }))),
        totals,
        channelSplit,
        bankStatement,
        mapa_bm: Object.assign({ titulo: "Mapa de Caixa - Modelo BM", data: day }, consolidated),
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
    const movements = yield (0, exports.listMovements)(plain.id, companyId);
    return (0, exports.buildRegisterView)(plain, movements, { movements });
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
    // registerPublic: o Caixa do Sistema também não revela o saldo apurado.
    return (0, exports.registerPublic)(plain);
});
exports.getSystemRegisterToday = getSystemRegisterToday;
// ─────────────────────────────────────────────────────────────────────────────
// DIFERENÇAS DE CAIXA (QUEBRAS / SOBRAS) — PENDENTES PARA O ADMIN
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Lista as diferenças de caixa apuradas nos fechos. Filtro opcional por status
 * (PENDENTE = por justificar/lançar pelo Admin; JUSTIFICADA = já lançada).
 * Enriquecida com o nome do operador e o dia do caixa (para o ecrã do Admin).
 */
const listCashDifferences = (companyId, status, limit = 100) => __awaiter(void 0, void 0, void 0, function* () {
    const where = { companyId };
    if (status) {
        const wanted = String(status).toUpperCase();
        if (!["PENDENTE", "JUSTIFICADA"].includes(wanted)) {
            throw { code: "INVALID_STATUS", message: "Status inválido (PENDENTE ou JUSTIFICADA)." };
        }
        where.status = wanted;
    }
    const rows = (yield CashDifferenceModel_1.CashDifferenceModel.findAll({
        where,
        order: [["id", "DESC"]],
        limit,
    }));
    if (rows.length === 0)
        return [];
    const userIds = [...new Set(rows.map((r) => Number(r.getDataValue("userId"))).filter(Boolean))];
    const names = { 0: "Sistema (Portal)" };
    if (userIds.length > 0) {
        const { UserModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/UserModel")));
        const users = (yield UserModel.findAll({
            where: { id: { [sequelize_1.Op.in]: userIds } },
            attributes: ["id", "name"],
            raw: true,
        }));
        users.forEach((u) => { names[Number(u.id)] = String(u.name || `Utilizador #${u.id}`); });
    }
    return rows.map((row) => {
        const plain = row.toJSON();
        const registerUserId = Number(plain.userId);
        return Object.assign(Object.assign({}, plain), { valor: Number(plain.valor) || 0, valor_contado: plain.valor_contado != null ? Number(plain.valor_contado) : null, valor_apurado: plain.valor_apurado != null ? Number(plain.valor_apurado) : null, userName: names[registerUserId] || `Utilizador #${registerUserId}`, tipo_label: plain.tipo === "QUEBRA" ? "Quebra de caixa" : "Sobra de caixa", conta_label: `${plain.conta_contabilistica || CashDifferenceModel_1.CASH_DIFFERENCE_ACCOUNT_DEFAULT} — Quebras de Caixa` });
    });
});
exports.listCashDifferences = listCashDifferences;
/**
 * JUSTIFICA E LANÇA uma diferença de caixa no Livro Caixa.
 *
 * Só o Admin da empresa o pode fazer (validado na rota). O movimento
 * DIFERENCA_CAIXA já foi criado no fecho — aqui fica registada a justificação
 * escrita, quem a fez e quando, e a conta de lançamento (58x — Quebras de
 * Caixa), passando a pendência a JUSTIFICADA.
 */
const justifyCashDifference = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, companyId, userId, justificacao } = params;
    if (!justificacao || String(justificacao).trim().length < 10) {
        throw {
            code: "INVALID_JUSTIFICATION",
            message: "A justificação é obrigatória (mínimo 10 caracteres) — é ela que documenta o auto de ocorrência.",
        };
    }
    const pendencia = yield CashDifferenceModel_1.CashDifferenceModel.findOne({ where: { id, companyId } });
    if (!pendencia) {
        throw { code: "NOT_FOUND", message: "Diferença de caixa não encontrada." };
    }
    if (String(pendencia.getDataValue("status")) === "JUSTIFICADA") {
        throw { code: "ALREADY_JUSTIFIED", message: "Esta diferença já foi justificada e lançada." };
    }
    yield pendencia.update({
        status: "JUSTIFICADA",
        justificacao: String(justificacao).trim(),
        conta_contabilistica: params.contaContabilistica
            ? String(params.contaContabilistica).trim().slice(0, 10)
            : CashDifferenceModel_1.CASH_DIFFERENCE_ACCOUNT_DEFAULT,
        justifiedBy: userId,
        justifiedAt: new Date(),
    });
    console.log(`[Caixa] Diferença #${id} (${pendencia.getDataValue("tipo")}) justificada pelo utilizador ${userId} — lançada na conta ${pendencia.getDataValue("conta_contabilistica")}.`);
    return pendencia.toJSON();
});
exports.justifyCashDifference = justifyCashDifference;
/**
 * OBSERVAÇÃO / JUSTIFICAÇÃO DO OPERADOR no auto de ocorrência.
 *
 * O modal "Auto de Ocorrência - Diferença de Caixa" abre logo após o fecho
 * cego quando a diferença é != 0 e a observação é OBRIGATÓRIA: documenta a
 * quebra/sobra da perspectiva de quem contou. O texto fica no auto (status
 * PENDENTE) ao lado da justificação do Admin — não a substitui.
 */
const annotateCashDifference = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, companyId, userId, observacao } = params;
    if (!observacao || String(observacao).trim().length < 10) {
        throw {
            code: "INVALID_OBSERVATION",
            message: "A observação/justificação do operador é obrigatória (mínimo 10 caracteres) — é ela que documenta o auto de ocorrência.",
        };
    }
    const pendencia = yield CashDifferenceModel_1.CashDifferenceModel.findOne({ where: { id, companyId } });
    if (!pendencia) {
        throw { code: "NOT_FOUND", message: "Diferença de caixa não encontrada." };
    }
    // Só o operador responsável pelo caixa (ou o Admin) documenta o auto.
    const dono = Number(pendencia.getDataValue("userId")) === Number(userId);
    if (!dono && !params.isAdmin) {
        throw {
            code: "FORBIDDEN",
            message: "Só o operador responsável pelo caixa (ou o Administrador) pode registar a observação.",
        };
    }
    if (String(pendencia.getDataValue("status")) === "JUSTIFICADA") {
        throw {
            code: "ALREADY_JUSTIFIED",
            message: "Esta diferença já foi justificada e lançada pelo Admin.",
        };
    }
    yield pendencia.update({ observacao_operador: String(observacao).trim() });
    console.log(`[Caixa] Auto de ocorrência #${id} (${pendencia.getDataValue("tipo")}) documentado pelo operador ${userId}.`);
    return pendencia.toJSON();
});
exports.annotateCashDifference = annotateCashDifference;
/**
 * Situação actual do limite de numerário em caixa para um caixa concreto —
 * usado pelo aviso do frontend ("obriga ENTREGA_COFRE ou DEPOSITO_BANCARIO
 * antes de continuar a operar").
 */
const getCashLimitSituation = (userId, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    var _x;
    const register = yield (0, exports.getOpenRegister)(userId, companyId);
    const limites = (0, exports.buildLimitInfo)(register || { opening_balance: 0, total_cash_in: 0, total_cash_out: 0 });
    return Object.assign({ registerId: (_x = register === null || register === void 0 ? void 0 : register.id) !== null && _x !== void 0 ? _x : null }, limites);
});
exports.getCashLimitSituation = getCashLimitSituation;
/**
 * PAINEL DE TESOURARIA (Admin) — visão por operador de:
 *   1. excedentes do limite de numerário em caixa (caixas abertas agora);
 *   2. diferenças de caixa pendentes (quebras/sobras por justificar e lançar
 *      na conta 58x — Quebras de Caixa).
 */
const getTreasuryPanel = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const today = (0, exports.todayKey)();
    // ── 1. Excedentes do limite de numerário (caixas ABERTOS) ─────────────
    const openRegisters = (yield CashRegisterModel_1.CashRegisterModel.findAll({
        where: { companyId, status: "ABERTO" },
        order: [["id", "DESC"]],
    }));
    const registerUserIds = [
        ...new Set(openRegisters.map((r) => Number(r.getDataValue("userId"))).filter(Boolean)),
    ];
    const names = { 0: "Sistema (Portal)" };
    if (registerUserIds.length > 0) {
        const { UserModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/UserModel")));
        const users = (yield UserModel.findAll({
            where: { id: { [sequelize_1.Op.in]: registerUserIds } },
            attributes: ["id", "name"],
            raw: true,
        }));
        users.forEach((u) => {
            names[Number(u.id)] = String(u.name || `Utilizador #${u.id}`);
        });
    }
    const excedentes = openRegisters
        .map((r) => {
        const plain = registerPlain(r);
        const limites = (0, exports.buildLimitInfo)(plain);
        const userId = Number(plain.userId);
        return {
            registerId: plain.id,
            userId,
            userName: names[userId] || `Utilizador #${userId}`,
            opening_date: String(plain.opening_date || today).slice(0, 10),
            dinheiro_em_caixa: limites.dinheiro_em_caixa,
            cash_limit_mzn: limites.cash_limit_mzn,
            excedente: limites.excedente,
            excedido: limites.excedido,
        };
    })
        .filter((row) => row.excedido)
        .sort((a, b) => b.excedente - a.excedente);
    // ── 2. Diferenças de caixa pendentes agrupadas POR OPERADOR ──────────
    const pendentes = yield (0, exports.listCashDifferences)(companyId, "PENDENTE", 500);
    const porOperador = {};
    for (const d of pendentes) {
        const key = Number(d.userId) || 0;
        if (!porOperador[key]) {
            porOperador[key] = {
                userId: key,
                userName: d.userName,
                total_pendentes: 0,
                valor_pendente: 0,
                quebras: 0,
                sobras: 0,
                ultima_data: null,
            };
        }
        const agg = porOperador[key];
        agg.total_pendentes += 1;
        agg.valor_pendente = round2(agg.valor_pendente + (Number(d.valor) || 0));
        if (String(d.tipo) === "QUEBRA")
            agg.quebras += 1;
        else
            agg.sobras += 1;
        const dataCaixa = String(d.data_caixa || "").slice(0, 10);
        if (!agg.ultima_data || dataCaixa > agg.ultima_data)
            agg.ultima_data = dataCaixa;
    }
    const diferencasPorOperador = Object.values(porOperador).sort((a, b) => b.valor_pendente - a.valor_pendente);
    return {
        date: today,
        limite: { cash_limit_mzn: (0, cashLimit_1.getCashLimitMzn)(), limite_activo: (0, cashLimit_1.isCashLimitEnabled)() },
        caixas_abertos: openRegisters.length,
        excedentes,
        diferencas_por_operador: diferencasPorOperador,
        summary: {
            total_excedentes: excedentes.length,
            valor_excedentes: round2(excedentes.reduce((sum, r) => sum + r.excedente, 0)),
            total_diferencas_pendentes: pendentes.length,
            valor_diferencas_pendentes: round2(pendentes.reduce((sum, d) => sum + (Number(d.valor) || 0), 0)),
            conta_contabilistica: "58 — Quebras de Caixa",
        },
    };
});
exports.getTreasuryPanel = getTreasuryPanel;
