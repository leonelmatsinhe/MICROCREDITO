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
exports.deposit = exports.transfer = exports.adjustBalanceEndpoint = exports.remove = exports.update = exports.create = exports.transactions = exports.balance = exports.walletTotals = exports.index = exports.reembolsoAccounts = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const bankAccountService_1 = require("../services/bankAccountService");
const treasuryService_1 = require("../services/treasuryService");
/**
 * CONTAS BANCÁRIAS / CARTEIRA REAL — controlador.
 *
 * Todas as operações protegidas por auth. Operações de dinheiro (transferências
 * e depósitos) exigem caixa ABERTO — validado pelo treasuryService.
 */
// Resolve userId + companyId do pedido (JWT ou middlewares anteriores).
const resolveIdentity = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
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
    let userName = "sistema";
    if (userId && !companyId) {
        // NOTA: o modelo de utilizadores só tem `name` (não existe coluna `username`).
        const { UserModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/UserModel")));
        const user = yield UserModel.findByPk(userId, { attributes: ["id", "companyId", "name"] });
        companyId = Number((_d = (_c = user === null || user === void 0 ? void 0 : user.getDataValue) === null || _c === void 0 ? void 0 : _c.call(user, "companyId")) !== null && _d !== void 0 ? _d : user === null || user === void 0 ? void 0 : user.companyId) || 0;
        userName = String((_f = (_e = user === null || user === void 0 ? void 0 : user.getDataValue) === null || _e === void 0 ? void 0 : _e.call(user, "name")) !== null && _f !== void 0 ? _f : "sistema");
    }
    return { userId, companyId, userName };
});
const errorStatus = (error) => {
    switch (error === null || error === void 0 ? void 0 : error.code) {
        case "NOT_FOUND": return 404;
        case "CAIXA_FECHADO": return 403;
        case "INSUFFICIENT_FUNDS":
        case "INVALID_TRANSFER":
        case "INVALID_AMOUNT":
        case "INVALID_PURPOSE":
        case "INVALID_TYPE":
        case "INVALID_ACCOUNT":
        case "BANK_ACCOUNT_REQUIRED":
        case "ACCOUNT_NOT_FOUND":
        case "ACCOUNT_INACTIVE": return 400;
        default: return 500;
    }
};
const sendError = (res, error, fallback) => {
    if (error === null || error === void 0 ? void 0 : error.code) {
        return res.status(errorStatus(error)).json({ success: false, error: error.code, message: error.message });
    }
    console.error(fallback, (error === null || error === void 0 ? void 0 : error.message) || error);
    return res.status(500).json({ success: false, message: fallback });
};
/**
 * GET /api/bank-accounts?purpose=REEMBOLSO&is_active=1
 * Lista contas da carteira (para a página de gestão e para os q-select dos
 * forms de desembolso/pagamento).
 */
/**
 * GET /api/bank-accounts/reembolso?paymentMethod=CASH|BANK|MPESA
 * Contas válidas como DESTINO de pagamento (REEMBOLSO/MISTO/caixa físico),
 * ordenadas por prioridade do método. Usado pelo modal "Registar Pagamento".
 * NÃO devolve contas de DESEMBOLSO/TAXAS/RESERVA (contas de despesa/operação).
 */
const reembolsoAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h;
    try {
        const decoded = jwt.verify((req.headers.authorization || "").split(" ")[1] || "", process.env.APP_SECRET + "");
        let companyId = Number(decoded === null || decoded === void 0 ? void 0 : decoded.companyId) || 0;
        if (!companyId && (decoded === null || decoded === void 0 ? void 0 : decoded.id)) {
            const { UserModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/UserModel")));
            const user = yield UserModel.findByPk(decoded.id, { attributes: ["companyId"] });
            companyId = Number((_h = (_g = user === null || user === void 0 ? void 0 : user.getDataValue) === null || _g === void 0 ? void 0 : _g.call(user, "companyId")) !== null && _h !== void 0 ? _h : user === null || user === void 0 ? void 0 : user.companyId) || 0;
        }
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const { getReembolsoAccounts } = yield Promise.resolve().then(() => __importStar(require("../services/bankAccountResolver")));
        const accounts = yield getReembolsoAccounts(companyId, String(req.query.paymentMethod || ""));
        return res.status(200).json({ success: true, result: accounts });
    }
    catch (error) {
        console.error("[bank-accounts/reembolso] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao listar contas de destino." });
    }
});
exports.reembolsoAccounts = reembolsoAccounts;
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const { purpose, is_active } = req.query;
        const accounts = yield (0, bankAccountService_1.getAll)({
            companyId: Number(companyId),
            purpose: purpose ? String(purpose) : undefined,
            isActive: is_active !== undefined ? String(is_active) === "1" : undefined,
        });
        return res.status(200).json({ success: true, result: accounts });
    }
    catch (error) {
        return sendError(res, error, "Erro ao listar contas bancárias.");
    }
});
exports.index = index;
/**
 * GET /api/bank-accounts/wallet-totals — saldos agregados por tipo
 * (para o card "Saldo em Bancos" do dashboard).
 */
const walletTotals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const totals = yield (0, treasuryService_1.getWalletTotals)(Number(companyId));
        return res.status(200).json({ success: true, result: totals });
    }
    catch (error) {
        return sendError(res, error, "Erro ao calcular saldos da carteira.");
    }
});
exports.walletTotals = walletTotals;
/**
 * GET /api/bank-accounts/:id/balance
 */
const balance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const id = parseInt(String(req.params.id), 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ success: false, message: "id inválido." });
        }
        const current = yield (0, bankAccountService_1.getBalance)(Number(companyId), id);
        return res.status(200).json({ success: true, result: { accountId: id, balance: current } });
    }
    catch (error) {
        return sendError(res, error, "Erro ao obter o saldo.");
    }
});
exports.balance = balance;
/**
 * GET /api/bank-accounts/:id/transactions — extrato da conta.
 */
const transactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const id = parseInt(String(req.params.id), 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ success: false, message: "id inválido." });
        }
        const account = yield (0, bankAccountService_1.getOne)(Number(companyId), id);
        if (!account) {
            return res.status(404).json({ success: false, message: "Conta não encontrada." });
        }
        const rows = yield (0, bankAccountService_1.getStatement)(Number(companyId), id);
        return res.status(200).json({ success: true, result: { account, transactions: rows } });
    }
    catch (error) {
        return sendError(res, error, "Erro ao obter o extrato.");
    }
});
exports.transactions = transactions;
/**
 * POST /api/bank-accounts — criar conta (cadastral; saldo inicia em 0).
 */
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, userName } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const account = yield (0, bankAccountService_1.upsert)({ companyId: Number(companyId), userName, data: req.body });
        return res.status(201).json({ success: true, result: account });
    }
    catch (error) {
        return sendError(res, error, "Erro ao criar a conta bancária.");
    }
});
exports.create = create;
/**
 * PUT /api/bank-accounts/:id — actualizar dados cadastrais.
 */
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, userName } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const id = parseInt(String(req.params.id), 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ success: false, message: "id inválido." });
        }
        const account = yield (0, bankAccountService_1.upsert)({ id, companyId: Number(companyId), userName, data: req.body });
        return res.status(200).json({ success: true, result: account });
    }
    catch (error) {
        return sendError(res, error, "Erro ao actualizar a conta bancária.");
    }
});
exports.update = update;
/**
 * DELETE /api/bank-accounts/:id — desactivar (nunca apaga histórico).
 */
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const id = parseInt(String(req.params.id), 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ success: false, message: "id inválido." });
        }
        const account = yield (0, bankAccountService_1.deactivate)(Number(companyId), id);
        return res.status(200).json({ success: true, result: account });
    }
    catch (error) {
        return sendError(res, error, "Erro ao desactivar a conta bancária.");
    }
});
exports.remove = remove;
/**
 * POST /api/bank-accounts/:id/adjust-balance
 * Body: { new_balance, description? } — introduzir o saldo real da conta
 * (BANCO / MOBILE_MONEY / EWALLET). A diferença fica registrada como ESTORNO
 * no extrato. Uso administrativo.
 */
const adjustBalanceEndpoint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _j, _k;
    try {
        const { userId, companyId, userName } = yield resolveIdentity(req);
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const id = parseInt(String(req.params.id), 10);
        const newBalance = Number((_j = req.body) === null || _j === void 0 ? void 0 : _j.new_balance);
        if (Number.isNaN(id) || !Number.isFinite(newBalance)) {
            return res.status(400).json({ success: false, message: "Informe id e new_balance válidos." });
        }
        const account = yield (0, bankAccountService_1.adjustBalance)({
            companyId: Number(companyId),
            accountId: id,
            newBalance,
            userName,
            userId: Number(userId) || undefined,
            description: (_k = req.body) === null || _k === void 0 ? void 0 : _k.description,
        });
        return res.status(200).json({ success: true, result: account });
    }
    catch (error) {
        return sendError(res, error, "Erro ao ajustar o saldo da conta.");
    }
});
exports.adjustBalanceEndpoint = adjustBalanceEndpoint;
/**
 * POST /api/bank-accounts/transfer
 * Body: { from_account_id, to_account_id | to_cash_register_id, amount, description }
 *  - conta → conta: transferência bancária (BANK↔BANK);
 *  - conta → caixa: levantamento em dinheiro (BANK→CASH);
 *  - (depósito de caixa usa /api/bank-accounts/deposit).
 */
const transfer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const body = req.body || {};
        const fromAccountId = Number(body.from_account_id);
        const toAccountId = body.to_account_id ? Number(body.to_account_id) : null;
        const toCashRegister = body.to_cash_register_id ? Number(body.to_cash_register_id) : null;
        const amount = Number(body.amount);
        if (!fromAccountId || !Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Informe origem, destino e valor válidos." });
        }
        let result;
        if (toAccountId) {
            result = yield (0, treasuryService_1.transferBetweenAccounts)({
                companyId: Number(companyId),
                userId,
                fromAccountId,
                toAccountId,
                amount,
                description: body.description,
            });
        }
        else if (toCashRegister) {
            result = yield (0, treasuryService_1.transferBankToCash)({
                companyId: Number(companyId),
                userId,
                fromAccountId,
                amount,
                description: body.description,
            });
        }
        else {
            return res.status(400).json({ success: false, message: "Informe to_account_id ou to_cash_register_id." });
        }
        return res.status(201).json({ success: true, result });
    }
    catch (error) {
        return sendError(res, error, "Erro na transferência.");
    }
});
exports.transfer = transfer;
/**
 * POST /api/bank-accounts/deposit — depósito de dinheiro físico no banco.
 * Body: { to_account_id, amount, description }
 */
const deposit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, companyId } = yield resolveIdentity(req);
        if (!userId || !companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const body = req.body || {};
        const toAccountId = Number(body.to_account_id);
        const amount = Number(body.amount);
        if (!toAccountId || !Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Informe conta de destino e valor válidos." });
        }
        const result = yield (0, treasuryService_1.transferCashToBank)({
            companyId: Number(companyId),
            userId,
            toAccountId,
            amount,
            description: body.description,
        });
        return res.status(201).json({ success: true, result });
    }
    catch (error) {
        return sendError(res, error, "Erro no depósito.");
    }
});
exports.deposit = deposit;
