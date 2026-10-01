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
exports.hasOpenRegister = exports.getReconciliation = exports.getDailySummary = exports.getSystemRegister = exports.getPortalAlert = exports.getHistory = exports.createManualMovement = exports.getMovements = exports.findOne = exports.close = exports.openToday = exports.getOpeningBalanceSuggestion = exports.getToday = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const cashRegisterService_1 = require("../services/cashRegisterService");
const CashRegisterModel_1 = require("../database/models/CashRegisterModel");
const sequelize_1 = require("sequelize");
const CashMovementModel_1 = require("../database/models/CashMovementModel");
const UserModel_1 = require("../database/models/UserModel");
/**
 * Resolve userId + companyId do pedido. Prioridade:
 *  1. middleware checkCashRegisterOpen (req.userId / req.companyId);
 *  2. payload do JWT (o token do sistema guarda apenas { id }).
 */
const resolveIdentity = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const authed = req;
    let userId = Number((_a = authed.userId) !== null && _a !== void 0 ? _a : 0);
    let companyId = Number((_b = authed.companyId) !== null && _b !== void 0 ? _b : 0);
    if (!userId || !companyId) {
        const authHeader = req.headers.authorization || "";
        const [, token] = authHeader.split(" ");
        if (token) {
            const decoded = jwt.verify(token, process.env.APP_SECRET + "");
            userId = Number(decoded === null || decoded === void 0 ? void 0 : decoded.id) || userId;
            if (decoded === null || decoded === void 0 ? void 0 : decoded.companyId)
                companyId = Number(decoded.companyId);
        }
    }
    if (userId && !companyId) {
        const user = yield UserModel_1.UserModel.findByPk(userId, { attributes: ["id", "companyId"] });
        companyId = Number((_d = (_c = user === null || user === void 0 ? void 0 : user.getDataValue) === null || _c === void 0 ? void 0 : _c.call(user, "companyId")) !== null && _d !== void 0 ? _d : user === null || user === void 0 ? void 0 : user.companyId) || 0;
    }
    return { userId, companyId };
});
const errorStatus = (error) => {
    switch (error === null || error === void 0 ? void 0 : error.code) {
        case "NOT_FOUND": return 404;
        case "ALREADY_OPEN":
        case "ALREADY_CLOSED":
        case "INVALID_BALANCE":
        case "INVALID_AMOUNT":
        case "INVALID_TYPE":
        case "INVALID_CATEGORY":
        case "INVALID_DESCRIPTION": return 400;
        case "FORBIDDEN": return 403;
        default: return 500;
    }
};
/**
 * GET /api/cash-registers/today
 * Estado do caixa de hoje do utilizador: { register, isOpen, categories }.
 * register = null → frontend mostra banner "Nenhum caixa aberto hoje".
 */
const getToday = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const register = yield (0, cashRegisterService_1.getTodayRegister)(userId, companyId);
        return res.status(200).json({
            success: true,
            result: {
                register,
                isOpen: !!register && register.status === "ABERTO",
                today: (0, cashRegisterService_1.todayKey)(),
                categories: CashMovementModel_1.CASH_CATEGORIES,
            },
        });
    }
    catch (error) {
        console.error("[cash-registers/today] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao obter o caixa de hoje." });
    }
});
exports.getToday = getToday;
/**
 * GET /api/cash-registers/opening-balance-suggestion
 * Sugere o saldo inicial do caixa de hoje: valor CONTADO em dinheiro no
 * último fecho do utilizador (fallback: último fecho da empresa / 0 no
 * primeiro dia). O frontend pré-preenche o dialog "Abrir Caixa do Dia".
 */
const getOpeningBalanceSuggestion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const suggestion = yield (0, cashRegisterService_1.suggestOpeningBalance)(Number(userId), Number(companyId));
        return res.status(200).json({ success: true, result: suggestion });
    }
    catch (error) {
        console.error("[cash-registers/opening-balance-suggestion] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao sugerir o saldo inicial." });
    }
});
exports.getOpeningBalanceSuggestion = getOpeningBalanceSuggestion;
/**
 * POST /api/cash-registers/open
 * Body: { opening_balance }. Cria o caixa ABERTO de hoje.
 */
const openToday = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f, _g;
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        // Aceita opening_balance (camelCase) ou opening_balance (snake_case).
        const rawBalance = (_f = (_e = req.body) === null || _e === void 0 ? void 0 : _e.opening_balance) !== null && _f !== void 0 ? _f : (_g = req.body) === null || _g === void 0 ? void 0 : _g.openingBalance;
        const openingBalance = Number(rawBalance);
        if (rawBalance === undefined || rawBalance === null || rawBalance === "") {
            return res.status(400).json({
                success: false,
                message: "O saldo inicial (opening_balance) é obrigatório para abrir o caixa.",
            });
        }
        const register = yield (0, cashRegisterService_1.openRegister)({ userId, companyId, openingBalance });
        return res.status(201).json({ success: true, result: register });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json({ success: false, message: error.message });
        }
        console.error("[cash-registers/open] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao abrir o caixa." });
    }
});
exports.openToday = openToday;
/**
 * POST /api/cash-registers/:id/close
 * Body: { closing_balance_informed }. Calcula saldo final e divergência no backend.
 */
const close = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _h;
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const body = req.body || {};
        const raw = (_h = body.closing_balance_informed) !== null && _h !== void 0 ? _h : body.closingBalanceInformed;
        if (raw === undefined || raw === null || raw === "") {
            return res.status(400).json({
                success: false,
                message: "O valor contado em caixa (closing_balance_informed) é obrigatório.",
            });
        }
        const registerId = parseInt(String(req.params.id), 10);
        if (Number.isNaN(registerId)) {
            return res.status(400).json({ success: false, message: "id inválido." });
        }
        const register = yield (0, cashRegisterService_1.closeRegister)({
            registerId,
            userId,
            companyId,
            closingBalanceInformed: Number(raw),
        });
        return res.status(200).json({ success: true, result: register });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json({ success: false, message: error.message });
        }
        console.error("[cash-registers/close] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao fechar o caixa." });
    }
});
exports.close = close;
/**
 * GET /api/cash-registers/:id — detalhe do caixa (histórico/auditoria).
 */
const findOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const registers = yield (0, cashRegisterService_1.listRegisters)(Number(companyId), 1000);
        const register = registers.find((r) => r.id === parseInt(String(req.params.id), 10));
        if (!register) {
            return res.status(404).json({ success: false, message: "Caixa não encontrado." });
        }
        // Detalhe inclui os movimentos do caixa.
        register.movements = yield (0, cashRegisterService_1.listMovements)(register.id, Number(companyId));
        return res.status(200).json({ success: true, result: register });
    }
    catch (error) {
        console.error("[cash-registers/:id] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao obter o caixa." });
    }
});
exports.findOne = findOne;
/**
 * GET /api/cash-registers/:id/movements — movimentos do caixa.
 */
const getMovements = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const registerId = parseInt(String(req.params.id), 10);
        if (Number.isNaN(registerId)) {
            return res.status(400).json({ success: false, message: "id inválido." });
        }
        const movements = yield (0, cashRegisterService_1.listMovements)(registerId, Number(companyId));
        return res.status(200).json({ success: true, result: movements });
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("[cash-registers/movements] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao listar movimentos." });
    }
});
exports.getMovements = getMovements;
/**
 * POST /api/cash-registers/:id/movements
 * Body: { type, category, amount, description, payment_method?, bank_account_id? }
 * Movimento MANUAL. Por defeito é CASH (gaveta); se payment_method = BANK/
 * MPESA/EMOLA, exige bank_account_id e o treasuryService actualiza o saldo
 * da conta + cria a contrapartida no extrato bancário — tudo numa transacção.
 */
const createManualMovement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        // Categorias automáticas não podem ser criadas manualmente.
        const AUTOMATIC_ONLY = ["DESEMBOLSO", "REEMBOLSO", "JUROS_MORA", "TAXA_ADMIN"];
        const { type, category, amount, description, payment_method, bank_account_id } = req.body || {};
        if (AUTOMATIC_ONLY.includes(category)) {
            return res.status(400).json({
                success: false,
                message: `A categoria ${category} é criada automaticamente pelo sistema (desembolsos/pagamentos).`,
            });
        }
        const method = String(payment_method || "CASH").toUpperCase();
        const { registerMovement, isElectronic } = yield Promise.resolve().then(() => __importStar(require("../services/treasuryService")));
        if (!isElectronic(method) && method !== "CASH") {
            return res.status(400).json({ success: false, message: `Método de pagamento inválido: ${method}` });
        }
        // O treasuryService localiza o caixa ABERTO de hoje deste utilizador,
        // valida a conta bancária e os saldos, insere o movimento e recalcula
        // os totais — tudo dentro de UMA transacção MySQL.
        const movement = yield registerMovement({
            companyId: Number(companyId),
            userId,
            type,
            category,
            amount: Number(amount),
            paymentMethod: method,
            bankAccountId: bank_account_id ? Number(bank_account_id) : null,
            description,
            automatic: false,
        });
        return res.status(201).json({ success: true, result: movement });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json({ success: false, error: error.code, message: error.message });
        }
        console.error("[cash-registers/movements/create] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao registar o movimento." });
    }
});
exports.createManualMovement = createManualMovement;
/**
 * GET /api/cash-registers/history — histórico de caixas da empresa (auditoria).
 */ const getHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        // Filtros opcionais de data (YYYY-MM-DD) — validados antes de consultar.
        const { from, to, limit } = req.query;
        const dateRe = /^\d{4}-\d{2}-\d{2}$/;
        if ((from && !dateRe.test(String(from))) || (to && !dateRe.test(String(to)))) {
            return res.status(400).json({
                success: false,
                message: "Datas inválidas. Use o formato YYYY-MM-DD.",
            });
        }
        if (from && to && String(from) > String(to)) {
            return res.status(400).json({
                success: false,
                message: "Intervalo inválido: 'from' não pode ser maior que 'to'.",
            });
        }
        let limitNum = 60;
        if (limit !== undefined) {
            const parsed = parseInt(String(limit), 10);
            if (Number.isNaN(parsed) || parsed <= 0 || parsed > 365) {
                return res.status(400).json({ success: false, message: "limit inválido (1-365)." });
            }
            limitNum = parsed;
        }
        const registers = yield (0, cashRegisterService_1.listRegisters)(Number(companyId), limitNum, from, to);
        return res.status(200).json({ success: true, result: registers });
    }
    catch (error) {
        console.error("[cash-registers/history] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao listar histórico de caixas." });
    }
});
exports.getHistory = getHistory;
/**
 * GET /api/cash-registers/portal-alert
 * Alerta do sino (navbar): pagamentos do portal recebidos FORA de expediente
 * ainda não vistos. "Não vistos" = chegados DEPOIS do último fecho de um caixa
 * presencial da empresa (o fecho funciona como marcador de "já vi o portal").
 *
 * Resposta: { success, result: null | { registerId, status, count, totalIn,
 *             byMethod, latestAt, movements[] } }
 * `null` quando não há nada para notificar — o sino não mostra alerta.
 */
const getPortalAlert = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        // Marcador de "já visto": último fecho de um caixa real (userId != 0).
        // Sem fecho hoje → conta tudo do Caixa do Sistema do dia.
        const lastClose = yield CashRegisterModel_1.CashRegisterModel.findOne({
            where: {
                companyId: Number(companyId),
                status: "FECHADO",
                userId: { [sequelize_1.Op.ne]: 0 },
                closing_time: { [sequelize_1.Op.ne]: null },
            },
            order: [["closing_time", "DESC"]],
            attributes: ["closing_time"],
            raw: true,
        });
        const portalSince = (lastClose === null || lastClose === void 0 ? void 0 : lastClose.closing_time) || null;
        const register = yield (0, cashRegisterService_1.getSystemRegisterToday)(Number(companyId), portalSince);
        if (!register)
            return res.status(200).json({ success: true, result: null });
        const fresh = register.newSince;
        if (!fresh || fresh.count === 0) {
            // Caixa do Sistema existe, mas nada novo desde o último fecho.
            return res.status(200).json({ success: true, result: null });
        }
        return res.status(200).json({
            success: true,
            result: {
                registerId: register.id,
                status: register.status,
                count: fresh.count,
                totalIn: fresh.totalIn,
                byMethod: fresh.byMethod,
                latestAt: register.movements.length > 0
                    ? register.movements[register.movements.length - 1].createdAt
                    : null,
                movements: register.movements.slice(-10).map((m) => ({
                    id: m.id,
                    type: m.type,
                    paymentMethod: m.paymentMethod,
                    amount: m.amount,
                    description: m.description,
                    createdAt: m.createdAt,
                })),
            },
        });
    }
    catch (error) {
        console.error("[cash-registers/portal-alert] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao obter o alerta do portal." });
    }
});
exports.getPortalAlert = getPortalAlert;
/**
 * GET /api/cash-registers/system-register
 * Caixa do Sistema de hoje (portal, fora de expediente) com movimentos.
 * Devolve null nos dias sem pagamentos fora de hora — o frontend esconde o card.
 */
const getSystemRegister = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const register = yield (0, cashRegisterService_1.getSystemRegisterToday)(Number(companyId));
        return res.status(200).json({ success: true, result: register });
    }
    catch (error) {
        console.error("[cash-registers/system-register] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao obter o Caixa do Sistema." });
    }
});
exports.getSystemRegister = getSystemRegister;
/**
 * GET /api/cash-registers/daily-summary?date=YYYY-MM-DD
 * Resumo consolidado do dia (todas as caixas da empresa): totais CASH/BANK +
 * extrato bancário agrupado por conta. Base para o relatório BM/fecho.
 */
const getDailySummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const { date } = req.query;
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
            return res.status(400).json({ success: false, message: "Data inválida. Use o formato YYYY-MM-DD." });
        }
        const summary = yield (0, cashRegisterService_1.getDailySummary)(Number(companyId), date ? String(date) : undefined);
        return res.status(200).json({ success: true, result: summary });
    }
    catch (error) {
        console.error("[cash-registers/daily-summary] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao gerar o resumo diário." });
    }
});
exports.getDailySummary = getDailySummary;
// Verificação de caixa aberto usada pelo middleware (export auxiliar p/ testes).
/**
 * GET /api/cash-registers/reconciliation?date=YYYY-MM-DD
 * RECONCILIAÇÃO DO DIA — tranzactions vs movimentos de caixa vs recibos.
 * O fecho diário usa a mesma função para bloquear divergências > 0,01 MZN.
 */
const getReconciliation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const { date } = req.query;
        const day = date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))
            ? String(date)
            : (0, cashRegisterService_1.todayKey)();
        const { reconcileDay } = yield Promise.resolve().then(() => __importStar(require("../services/reconciliationService")));
        const result = yield reconcileDay(Number(companyId), day);
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("[reconciliation] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao reconciliar o dia." });
    }
});
exports.getReconciliation = getReconciliation;
const hasOpenRegister = (userId, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    return !!(yield (0, cashRegisterService_1.getOpenRegister)(userId, companyId));
});
exports.hasOpenRegister = hasOpenRegister;
