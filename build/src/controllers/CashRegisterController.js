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
exports.hasOpenRegister = exports.reconcileElectronicHandler = exports.openElectronicDayHandler = exports.getElectronicReport = exports.getElectronicToday = exports.updateCashMode = exports.getCashMode = exports.getTreasuryPanelView = exports.validateComprovativoEntrega = exports.getComprovativoEntrega = exports.observeDifference = exports.justifyDifference = exports.getDifferences = exports.getReconciliation = exports.getDailySummary = exports.getSystemRegister = exports.getPortalAlert = exports.getHistory = exports.createManualMovement = exports.getMovements = exports.findOne = exports.close = exports.openToday = exports.getOpeningBalanceSuggestion = exports.getToday = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const cashRegisterService_1 = require("../services/cashRegisterService");
const CashRegisterModel_1 = require("../database/models/CashRegisterModel");
const CashMovementModel_1 = require("../database/models/CashMovementModel");
const mznDenominations_1 = require("../utils/mznDenominations");
const cashLimit_1 = require("../utils/cashLimit");
const sequelize_1 = require("sequelize");
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
        case "INVALID_DESCRIPTION":
        case "INVALID_JUSTIFICATION":
        case "INVALID_OBSERVATION":
        case "INVALID_HASH":
        case "INVALID_DENOMINATIONS":
        case "INVALID_STATUS":
        case "INVALID_CLOSING_TYPE":
        case "INVALID_JUSTIFICATION_ACCOUNT":
        case "AUTOMATIC_ONLY":
        case "BANK_ACCOUNT_REQUIRED":
        case "INVALID_MODE":
        case "INVALID_ACCOUNT":
        case "ACCOUNT_INACTIVE":
        case "REGISTER_NOT_TODAY":
        case "INVALID_TRANSFER": return 400;
        case "ACCOUNT_NOT_FOUND": return 404;
        // Circular do BM: precisa de ENTREGA_COFRE ou DEPOSITO_BANCARIO primeiro.
        case "CASH_LIMIT_EXCEEDED": return 409;
        case "DELIVERY_REQUIRED": return 409;
        case "ALREADY_JUSTIFIED": return 409;
        case "REGISTER_CLOSED":
        case "CAIXA_FECHADO":
        case "INSUFFICIENT_FUNDS": return 409;
        case "FORBIDDEN": return 403;
        default: return 500;
    }
};
/** Erros com código de negócio recebem o código no corpo (o frontend reage). */
const errorBody = (error) => (Object.assign({ success: false, error: error === null || error === void 0 ? void 0 : error.code, message: error === null || error === void 0 ? void 0 : error.message }, ((error === null || error === void 0 ? void 0 : error.limite) !== undefined
    ? {
        limite: error.limite,
        dinheiro_em_caixa: error.dinheiro_em_caixa,
        excedente: error.excedente,
    }
    : {})));
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
                // Etiquetas PT-MZ das categorias (o frontend não as duplica)
                categoryLabels: CashMovementModel_1.CASH_CATEGORY_LABELS,
                // Tipos OFICIAIS de tesouraria (entrega ao cofre, reforço, depósito,
                // diferença de caixa) — sem "sangria"/"suprimento".
                treasuryCategories: CashMovementModel_1.CASH_TREASURY_CATEGORIES,
                // Denominações do metical para a contagem de numerário (notas + moedas)
                denominations: mznDenominations_1.MZN_DENOMINATIONS,
                // Tipos de fecho e a conta usada no Livro Caixa
                closingTypes: CashRegisterModel_1.CASH_CLOSING_TYPES,
                closingTypeLabels: CashRegisterModel_1.CASH_CLOSING_TYPE_LABELS,
                cashDifferenceAccount: "58 — Quebras de Caixa",
                // LIMITE DE NUMERÁRIO EM CAIXA (circular do BM)
                cashLimit: Object.assign(Object.assign({}, (0, cashRegisterService_1.buildLimitInfo)(register || {})), { limite_configurado: (0, cashLimit_1.getCashLimitMzn)() }),
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
        const body = req.body || {};
        // Contagem por denominação do fundo de troco (preferida) OU valor informado.
        const denominations = (_f = (_e = body.denominations) !== null && _e !== void 0 ? _e : body.denominacoes) !== null && _f !== void 0 ? _f : body.contagem_denominacoes;
        const rawBalance = (_g = body.opening_balance) !== null && _g !== void 0 ? _g : body.openingBalance;
        const hasDenominations = denominations && typeof denominations === "object" && Object.keys(denominations).length > 0;
        if (!hasDenominations && (rawBalance === undefined || rawBalance === null || rawBalance === "")) {
            return res.status(400).json({
                success: false,
                message: "Informe a contagem do fundo de troco por denominação (notas e moedas) ou o saldo inicial (opening_balance).",
            });
        }
        const register = yield (0, cashRegisterService_1.openRegister)({
            userId,
            companyId,
            openingBalance: Number(rawBalance),
            denominations: hasDenominations ? denominations : undefined,
        });
        return res.status(201).json({ success: true, result: register });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
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
    var _h, _j, _k, _l, _m;
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const body = req.body || {};
        // CONTAGEM CEGA: o operador envia a contagem por denominação; o total é
        // calculado no backend. `closing_balance_informed` continua aceite apenas
        // para clientes antigos (sem contagem).
        const denominations = (_j = (_h = body.denominations) !== null && _h !== void 0 ? _h : body.denominacoes) !== null && _j !== void 0 ? _j : body.contagem_denominacoes;
        const raw = (_k = body.closing_balance_informed) !== null && _k !== void 0 ? _k : body.closingBalanceInformed;
        const hasDenominations = denominations && typeof denominations === "object" && Object.keys(denominations).length > 0;
        if (!hasDenominations && (raw === undefined || raw === null || raw === "")) {
            return res.status(400).json({
                success: false,
                message: "Informe a contagem do numerário por denominação (notas e moedas) para fechar o caixa.",
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
            denominations: hasDenominations ? denominations : undefined,
            closingBalanceInformed: raw === undefined || raw === null || raw === "" ? null : Number(raw),
            tipoFechamento: (_m = (_l = body.tipo_fechamento) !== null && _l !== void 0 ? _l : body.tipoFechamento) !== null && _m !== void 0 ? _m : null,
            notes: body.notes,
        });
        return res.status(200).json({ success: true, result: register });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
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
        // DIFERENCA_CAIXA é um AUTO DE OCORRÊNCIA: nasce no fecho do caixa (contagem
        // por denominação) e é justificada pelo Admin — nunca lançada à mão, senão
        // deixaria de ser um controlo.
        if (String(category) === "DIFERENCA_CAIXA") {
            return res.status(400).json({
                success: false,
                error: "AUTOMATIC_ONLY",
                message: "A diferença de caixa é apurada automaticamente no fecho (auto de ocorrência) e justificada pelo Admin na conta 58x — não pode ser lançada manualmente.",
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
            // errorBody inclui limite/dinheiro_em_caixa/excedente quando aplicável
            // (ex.: CASH_LIMIT_EXCEEDED — circular do BM).
            return res.status(errorStatus(error)).json(errorBody(error));
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
// ─────────────────────────────────────────────────────────────────────────────
// DIFERENÇAS DE CAIXA (QUEBRAS / SOBRAS) — ADMIN
// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/cash-registers/differences?status=PENDENTE
 * Diferenças de caixa apuradas nos fechos, para o Admin justificar e lançar no
 * Livro Caixa (conta 58x — Quebras de Caixa). Sem `status` devolve todas.
 */
const getDifferences = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const { status, limit } = req.query;
        let limitNum = 100;
        if (limit !== undefined) {
            const parsed = parseInt(String(limit), 10);
            if (Number.isNaN(parsed) || parsed <= 0 || parsed > 500) {
                return res.status(400).json({ success: false, message: "limit inválido (1-500)." });
            }
            limitNum = parsed;
        }
        const differences = yield (0, cashRegisterService_1.listCashDifferences)(Number(companyId), status ? String(status) : undefined, limitNum);
        const pendentes = differences.filter((d) => d.status === "PENDENTE");
        return res.status(200).json({
            success: true,
            result: differences,
            summary: {
                total: differences.length,
                pendentes: pendentes.length,
                valor_pendente: Math.round(pendentes.reduce((sum, d) => sum + (Number(d.valor) || 0), 0) * 100) / 100,
                conta_contabilistica: "58 — Quebras de Caixa",
            },
        });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-registers/differences] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao listar as diferenças de caixa." });
    }
});
exports.getDifferences = getDifferences;
/**
 * POST /api/cash-registers/differences/:id/justify
 * Body: { justificacao, conta_contabilistica? }
 * Só o Admin: regista o auto de ocorrência e o lançamento no Livro Caixa
 * (conta 58x — Quebras de Caixa), passando a pendência a JUSTIFICADA.
 */
const justifyDifference = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _o, _p, _q;
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const id = parseInt(String(req.params.id), 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ success: false, message: "id inválido." });
        }
        const body = req.body || {};
        const justificacao = (_o = body.justificacao) !== null && _o !== void 0 ? _o : body.justification;
        const diferenca = yield (0, cashRegisterService_1.justifyCashDifference)({
            id,
            companyId,
            userId,
            justificacao: String(justificacao !== null && justificacao !== void 0 ? justificacao : ""),
            contaContabilistica: (_q = (_p = body.conta_contabilistica) !== null && _p !== void 0 ? _p : body.contaContabilistica) !== null && _q !== void 0 ? _q : null,
        });
        return res.status(200).json({
            success: true,
            message: "Diferença justificada e lançada na conta 58 — Quebras de Caixa.",
            result: diferenca,
        });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-registers/differences/justify] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao justificar a diferença de caixa." });
    }
});
exports.justifyDifference = justifyDifference;
/**
 * POST /api/cash-registers/differences/:id/observacao
 * Body: { observacao }
 * OBSERVAÇÃO / JUSTIFICAÇÃO DO OPERADOR no auto de ocorrência — preenchida no
 * modal "Auto de Ocorrência - Diferença de Caixa" logo após o fecho cego.
 * Não exige Admin: o próprio operador do caixa documenta a quebra/sobra;
 * o Admin continua a justificar e lançar via /justify.
 */
const observeDifference = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _r, _s, _t, _u;
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const id = parseInt(String(req.params.id), 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ success: false, message: "id inválido." });
        }
        const body = req.body || {};
        const observacao = (_s = (_r = body.observacao) !== null && _r !== void 0 ? _r : body.justificacao) !== null && _s !== void 0 ? _s : body.observacao_operador;
        // Admin (userRole 0/1) pode documentar qualquer auto da empresa.
        const user = yield UserModel_1.UserModel.findByPk(userId, { attributes: ["userRole"] });
        const role = Number((_u = (_t = user === null || user === void 0 ? void 0 : user.getDataValue) === null || _t === void 0 ? void 0 : _t.call(user, "userRole")) !== null && _u !== void 0 ? _u : user === null || user === void 0 ? void 0 : user.userRole);
        const diferenca = yield (0, cashRegisterService_1.annotateCashDifference)({
            id,
            companyId,
            userId,
            observacao: String(observacao !== null && observacao !== void 0 ? observacao : ""),
            isAdmin: [0, 1].includes(role),
        });
        return res.status(200).json({
            success: true,
            message: "Observação do operador registada no auto de ocorrência.",
            result: diferenca,
        });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-registers/differences/observacao] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao registar a observação da diferença." });
    }
});
exports.observeDifference = observeDifference;
// ─────────────────────────────────────────────────────────────────────────────
// COMPROVATIVO DE ENTREGA DE VALORES AO COFRE CENTRAL (PDF + QR DE VALIDAÇÃO)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/cash-movements/:movementId/comprovativo
 * PDF próprio (A4) do movimento ENTREGA_COFRE — selo electrónico (hash
 * SHA-256) + QR de validação + assinaturas do Operador e do Tesoureiro.
 */
const getComprovativoEntrega = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const movementId = parseInt(String(req.params.movementId), 10);
        if (Number.isNaN(movementId)) {
            return res.status(400).json({ success: false, message: "movementId inválido." });
        }
        const { generateComprovativoPdf } = yield Promise.resolve().then(() => __importStar(require("../services/cashDeliveryService")));
        const { buffer, numero, hash } = yield generateComprovativoPdf(movementId, Number(companyId));
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="comprovativo-entrega-cofre-${numero}.pdf"`);
        res.setHeader("X-Comprovativo-Numero", numero);
        res.setHeader("X-Comprovativo-Hash", hash);
        return res.status(200).send(buffer);
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-movements/comprovativo] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao gerar o comprovativo de entrega." });
    }
});
exports.getComprovativoEntrega = getComprovativoEntrega;
/**
 * GET /api/cash-deliveries/validate?numero=CE-<ano>-<id>&hash=<sha256>
 * Validação PÚBLICA do QR Code (sem autenticação) — recompõe o hash a partir
 * do movimento gravado e confirma a autenticidade do comprovativo.
 */
const validateComprovativoEntrega = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { numero, hash, id } = req.query;
        const { validateComprovativo } = yield Promise.resolve().then(() => __importStar(require("../services/cashDeliveryService")));
        const result = yield validateComprovativo({
            numero: numero ? String(numero) : undefined,
            hash: hash ? String(hash) : undefined,
            movementId: id ? Number(id) : undefined,
        });
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-deliveries/validate] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao validar o comprovativo." });
    }
});
exports.validateComprovativoEntrega = validateComprovativoEntrega;
/**
 * GET /api/cash-registers/treasury-panel
 * PAINEL DE TESOURARIA (Admin): excedentes do limite de numerário em caixa e
 * diferenças de caixa pendentes, ambos agrupados POR OPERADOR.
 */
const getTreasuryPanelView = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const { getTreasuryPanel } = yield Promise.resolve().then(() => __importStar(require("../services/cashRegisterService")));
        const result = yield getTreasuryPanel(Number(companyId));
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-registers/treasury-panel] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao carregar o painel de tesouraria." });
    }
});
exports.getTreasuryPanelView = getTreasuryPanelView;
/**
 * GET /api/cash-register/mode
 * Modo de caixa da empresa: PHYSICAL (contagem de numerário) ou ELECTRONIC
 * (reconciliação manual por conta bancária já existente).
 */
const getCashMode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const { getCashRegisterMode } = yield Promise.resolve().then(() => __importStar(require("../services/cashModeService")));
        const mode = yield getCashRegisterMode(Number(companyId));
        return res.status(200).json({ success: true, result: { mode } });
    }
    catch (error) {
        console.error("[cash-register/mode] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao obter o modo de caixa." });
    }
});
exports.getCashMode = getCashMode;
/**
 * PUT /api/cash-register/mode  Body: { mode: "PHYSICAL" | "ELECTRONIC" }
 * Exclusivo do Admin da empresa (validado na rota).
 */
const updateCashMode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _v;
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const mode = (_v = req.body) === null || _v === void 0 ? void 0 : _v.mode;
        const { setCashRegisterMode } = yield Promise.resolve().then(() => __importStar(require("../services/cashModeService")));
        const updated = yield setCashRegisterMode(Number(companyId), String(mode || ""));
        return res.status(200).json({ success: true, result: { mode: updated } });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-register/mode] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao alterar o modo de caixa." });
    }
});
exports.updateCashMode = updateCashMode;
/**
 * GET /api/cash-register/electronic/today?date=YYYY-MM-DD
 * Estado do dia electrónico: conta escolhida, movimentos automáticos do sistema
 * (bank_transactions da conta) e saldo teórico.
 */
const getElectronicToday = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _w, _x, _y;
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const { buildElectronicDayView } = yield Promise.resolve().then(() => __importStar(require("../services/electronicCashService")));
        const { getCashRegisterMode } = yield Promise.resolve().then(() => __importStar(require("../services/cashModeService")));
        const result = yield buildElectronicDayView({
            companyId: Number(companyId),
            userId: Number(userId),
            day: (_w = req.query) === null || _w === void 0 ? void 0 : _w.date,
            bankAccountId: (_y = (_x = req.query) === null || _x === void 0 ? void 0 : _x.account_id) !== null && _y !== void 0 ? _y : null,
        });
        return res.status(200).json({
            success: true,
            result: Object.assign(Object.assign({}, result), { mode: yield getCashRegisterMode(Number(companyId)) }),
        });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-register/electronic/today] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao obter o dia electrónico." });
    }
});
exports.getElectronicToday = getElectronicToday;
/**
 * GET /api/cash-register/electronic/report?date=YYYY-MM-DD
 * Reconciliação bancária do dia POR CONTA: saldo inicial, entradas, saídas,
 * saldo teórico, saldo real e diferença (Admin).
 */
const getElectronicReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _z;
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const { buildElectronicReconciliationReport } = yield Promise.resolve().then(() => __importStar(require("../services/electronicCashService")));
        const result = yield buildElectronicReconciliationReport(Number(companyId), (_z = req.query) === null || _z === void 0 ? void 0 : _z.date);
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-register/electronic/report] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao gerar o relatório de reconciliação." });
    }
});
exports.getElectronicReport = getElectronicReport;
/**
 * POST /api/cash-register/electronic/open-day
 * Body: { bank_account_id, manual_balance_start, date? }
 */
const openElectronicDayHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _0, _1;
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const body = req.body || {};
        const { openElectronicDay } = yield Promise.resolve().then(() => __importStar(require("../services/electronicCashService")));
        const result = yield openElectronicDay({
            companyId: Number(companyId),
            userId: Number(userId),
            bankAccountId: (_0 = body.bank_account_id) !== null && _0 !== void 0 ? _0 : body.bankAccountId,
            manualBalanceStart: (_1 = body.manual_balance_start) !== null && _1 !== void 0 ? _1 : body.manualBalanceStart,
            day: body.date,
        });
        return res.status(201).json({ success: true, result });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-register/electronic/open-day] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao abrir o dia electrónico." });
    }
});
exports.openElectronicDayHandler = openElectronicDayHandler;
/**
 * POST /api/cash-register/electronic/reconcile
 * Body: { bank_account_id, manual_balance_end, observations?, date? }
 * Calcula o teórico (inicial + entradas − saídas da conta no dia) e a
 * diferença contra o saldo real lido no banco.
 */
const reconcileElectronicHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _2, _3, _4, _5;
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const body = req.body || {};
        const { reconcileElectronic } = yield Promise.resolve().then(() => __importStar(require("../services/electronicCashService")));
        const result = yield reconcileElectronic({
            companyId: Number(companyId),
            userId: Number(userId),
            bankAccountId: (_3 = (_2 = body.bank_account_id) !== null && _2 !== void 0 ? _2 : body.bankAccountId) !== null && _3 !== void 0 ? _3 : null,
            manualBalanceEnd: (_4 = body.manual_balance_end) !== null && _4 !== void 0 ? _4 : body.manualBalanceEnd,
            observations: (_5 = body.observations) !== null && _5 !== void 0 ? _5 : null,
            day: body.date,
        });
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.code) {
            return res.status(errorStatus(error)).json(errorBody(error));
        }
        console.error("[cash-register/electronic/reconcile] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao reconciliar o dia electrónico." });
    }
});
exports.reconcileElectronicHandler = reconcileElectronicHandler;
const hasOpenRegister = (userId, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    return !!(yield (0, cashRegisterService_1.getOpenRegister)(userId, companyId));
});
exports.hasOpenRegister = hasOpenRegister;
