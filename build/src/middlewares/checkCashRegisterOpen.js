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
exports.checkCashRegisterOpen = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const cashRegisterService_1 = require("../services/cashRegisterService");
/**
 * MIDDLEWARE CAIXA DIÁRIO — verifica se o utilizador autenticado tem um caixa
 * ABERTO hoje (na sua empresa). Se não tiver, bloqueia a operação com 403:
 *
 *   { error: "CAIXA_FECHADO", message: "Abra o caixa do dia para continuar" }
 *
 * Aplicar em rotas que movimentam dinheiro físico:
 *   - POST /api/createInstallmentsLoan (desembolso do crédito)
 *   - POST /api/tranzaction            (pagamento de prestação)
 * O token já foi validado por `auth` — aqui extraímos o payload do JWT para
 * obter userId e companyId (o sistema não popula req.user no middleware auth).
 */
const checkCashRegisterOpen = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const authed = req;
        // Se um middleware anterior já colocou user/companyId, respeitar.
        let userId = Number((_c = (_a = authed.userId) !== null && _a !== void 0 ? _a : (_b = authed.user) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : 0);
        let companyId = Number((_f = (_d = authed.companyId) !== null && _d !== void 0 ? _d : (_e = authed.user) === null || _e === void 0 ? void 0 : _e.companyId) !== null && _f !== void 0 ? _f : 0);
        // Caso contrário, decodificar o JWT do header Authorization.
        if (!userId || !companyId) {
            const authHeader = req.headers.authorization || "";
            const [, token] = authHeader.split(" ");
            if (!token) {
                return res.status(401).json({ success: false, message: "Token is required!" });
            }
            const decoded = jwt.verify(token, process.env.APP_SECRET + "");
            userId = Number(decoded === null || decoded === void 0 ? void 0 : decoded.id) || 0;
            if (!companyId && (decoded === null || decoded === void 0 ? void 0 : decoded.companyId))
                companyId = Number(decoded.companyId);
        }
        if (!userId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        // O JWT do sistema só carrega o id do utilizador — buscar a empresa no DB.
        if (!companyId) {
            const { UserModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/UserModel")));
            const user = yield UserModel.findByPk(userId, { attributes: ["id", "companyId"] });
            companyId = Number((_h = (_g = user === null || user === void 0 ? void 0 : user.getDataValue) === null || _g === void 0 ? void 0 : _g.call(user, "companyId")) !== null && _h !== void 0 ? _h : user === null || user === void 0 ? void 0 : user.companyId) || 0;
        }
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Token invalid" });
        }
        const openRegister = yield (0, cashRegisterService_1.getOpenRegister)(userId, companyId);
        if (!openRegister) {
            return res.status(403).json({
                error: "CAIXA_FECHADO",
                message: "Abra o caixa do dia para continuar",
            });
        }
        // Disponibiliza o caixa aberto aos handlers seguintes (evita re-consultas).
        req.cashRegister = openRegister;
        req.userId = userId;
        req.companyId = companyId;
        return next();
    }
    catch (error) {
        // Token inválido/expirado cai aqui — tratar como 401.
        console.error("[checkCashRegisterOpen] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(401).json({ success: false, message: "Token invalid" });
    }
});
exports.checkCashRegisterOpen = checkCashRegisterOpen;
