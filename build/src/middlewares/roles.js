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
exports.getCurrentUser = exports.getPartner = exports.isPartner = exports.isStaff = exports.isAdmin = exports.FINANCING_PARTNER_ROLE = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const UserModel_1 = require("../database/models/UserModel");
const FinancingWalletModel_1 = require("../database/models/FinancingWalletModel");
/**
 * PERMISSÕES POR PAPEL
 * --------------------
 * userRole: 0=Super Admin · 1=Admin · 2=Operador · 3=Gestor de Crédito
 *           4=Parceiro Financiador (portal do financiador, só a SUA carteira)
 *
 * Nota de segurança: a carteira do parceiro é lida SEMPRE da base de dados
 * (users.walletId), nunca do pedido — assim o parceiro não consegue apontar
 * para a carteira de outro financiador alterando parâmetros.
 */
exports.FINANCING_PARTNER_ROLE = 4;
const decodeUserId = (req) => {
    try {
        const header = req.headers.authorization || "";
        const [, token] = header.split(" ");
        if (!token)
            return null;
        const decoded = jwt.verify(token, process.env.APP_SECRET + "");
        const id = Number(decoded === null || decoded === void 0 ? void 0 : decoded.id);
        return Number.isFinite(id) ? id : null;
    }
    catch (_a) {
        return null;
    }
};
const loadUser = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = decodeUserId(req);
    if (!userId)
        return null;
    return (yield UserModel_1.UserModel.findByPk(userId, { raw: true }));
});
const loadUserOrRaise = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield loadUser(req);
    if (!user) {
        res.status(401).json({ success: false, message: "Sessão inválida. Volte a iniciar sessão." });
        return null;
    }
    return user;
});
/**
 * Apenas Admin da empresa (userRole 1 ou 2). Usado para criar carteiras de
 * financiamento e contas de parceiros (userRole 4).
 */
const isAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield loadUserOrRaise(req, res);
    if (!user)
        return;
    const role = Number(user.userRole);
    if (![1, 2].includes(role)) {
        return res.status(403).json({
            success: false,
            message: "Apenas o Administrador da empresa pode executar esta operação.",
        });
    }
    req.currentUser = user;
    next();
});
exports.isAdmin = isAdmin;
/**
 * Apenas Admin ou Caixa/Gestor (operações de crédito e recibos).
 * O portal do parceiro (userRole 4) fica de fora: é só leitura.
 */
const isStaff = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield loadUserOrRaise(req, res);
    if (!user)
        return;
    const role = Number(user.userRole);
    if (![0, 1, 2, 3].includes(role)) {
        return res.status(403).json({
            success: false,
            message: "Operação restrita ao pessoal da empresa.",
        });
    }
    req.currentUser = user;
    next();
});
exports.isStaff = isStaff;
/**
 * Parceiro financiador (userRole 4) — portal do financiador.
 * Exige carteira associada e portal activo; injecta `req.partner`.
 */
const isPartner = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield loadUserOrRaise(req, res);
    if (!user)
        return;
    if (Number(user.userRole) !== exports.FINANCING_PARTNER_ROLE || !user.walletId) {
        return res.status(403).json({
            success: false,
            message: "Acesso reservado a parceiros financiadores com carteira associada.",
        });
    }
    const wallet = (yield FinancingWalletModel_1.FinancingWalletModel.findByPk(Number(user.walletId), { raw: true }));
    if (!wallet || Number(wallet.companyId) !== Number(user.companyId)) {
        return res.status(403).json({ success: false, message: "Carteira de financiamento não encontrada." });
    }
    if (!wallet.tem_portal || !wallet.portal_ativo) {
        return res.status(403).json({
            success: false,
            message: "O acesso ao portal desta carteira está desactivado. Contacte o Administrador da MBRM.",
        });
    }
    const partner = {
        userId: Number(user.id),
        companyId: Number(user.companyId),
        walletId: Number(user.walletId),
        wallet,
        userName: String(user.name || ""),
        email: String(user.email || ""),
    };
    req.partner = partner;
    next();
});
exports.isPartner = isPartner;
/** Leitura do contexto do parceiro já validado (tipagem para os controladores). */
const getPartner = (req) => {
    const partner = req.partner;
    if (!partner) {
        throw new Error("Contexto de parceiro ausente — rota sem middleware isPartner.");
    }
    return partner;
};
exports.getPartner = getPartner;
const getCurrentUser = (req) => req.currentUser || null;
exports.getCurrentUser = getCurrentUser;
