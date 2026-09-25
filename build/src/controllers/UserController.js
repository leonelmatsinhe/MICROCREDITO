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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.changeUserPassword = exports.loginUser = exports.update = exports.destroy = exports.updatePartner = exports.createPartner = exports.create = exports.findOne = exports.findAll = void 0;
const UserModel_1 = require("../database/models/UserModel");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const password_1 = require("../utils/password");
const db_1 = require("../database/db");
const FinancingWalletModel_1 = require("../database/models/FinancingWalletModel");
const roles_1 = require("../middlewares/roles");
// Remove o hash da senha antes de devolver o utilizador ao frontend — a BD é a
// única fonte de verdade para login e nenhum hash deve voltar a ser reenviado.
const stripPassword = (user) => {
    const plain = (user === null || user === void 0 ? void 0 : user.toJSON) ? user.toJSON() : user;
    if (!plain)
        return plain;
    delete plain.password;
    return plain;
};
const findAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const users = yield UserModel_1.UserModel.findAll({
            where: {
                companyId: id,
            },
            order: [["name", "DESC"]],
        });
        const safeUsers = users.map(stripPassword);
        return safeUsers.length > 0
            ? res.status(200).json({ success: true, result: safeUsers })
            : res.status(204).json({ success: false, message: "Users not found." });
    }
    catch (err) {
        console.error("Erro ao buscar utilizadores:", err.message);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.findAll = findAll;
const findOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield UserModel_1.UserModel.findOne({
            where: {
                id: id,
            },
        });
        return user
            ? res.status(200).json({ success: true, result: stripPassword(user) })
            : res.status(204).json({ success: false, message: "User not found." });
    }
    catch (err) {
        console.error("Erro ao buscar utilizador:", err.message);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.findOne = findOne;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { name, email, password, phone, status, companyId, userRole, walletId } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Campos obrigatórios: name, email e password.",
            });
        }
        // PARCEIRO FINANCIADOR (userRole 4): só o Admin da empresa pode criar e a
        // conta TEM de ficar ligada a uma carteira de financiamento com portal
        // activo — é essa a única carteira que o parceiro verá.
        let isParceiro = false;
        let parceiroWalletId = null;
        if (Number(userRole) === roles_1.FINANCING_PARTNER_ROLE) {
            const currentUser = (0, roles_1.getCurrentUser)(req);
            const effectiveCompany = Number(companyId || (currentUser === null || currentUser === void 0 ? void 0 : currentUser.companyId));
            if (!currentUser || ![0, 1].includes(Number(currentUser.userRole))) {
                return res.status(403).json({
                    success: false,
                    message: "Apenas o Administrador da empresa pode criar acessos de parceiro financiador.",
                });
            }
            if (!walletId) {
                return res.status(400).json({
                    success: false,
                    message: "Selecione a carteira de financiamento do parceiro (perfil Parceiro Financiador).",
                });
            }
            const wallet = yield validatePartnerWallet(effectiveCompany, Number(walletId), res);
            if (!wallet)
                return;
            parceiroWalletId = Number(wallet.id);
            isParceiro = true;
            companyId = effectiveCompany;
        }
        // Hash bcrypt — mas nunca voltar a encriptar um valor que já seja hash
        const storedPassword = (0, password_1.hashPasswordIfNeeded)(password);
        const user = yield UserModel_1.UserModel.create(Object.assign({ name,
            email, password: storedPassword, updatedPassword: 0, phone,
            status,
            companyId,
            userRole }, (isParceiro
            ? { walletId: parceiroWalletId, is_parceiro: 1, is_active: 1, credentialsSent: 0 }
            : {})));
        return user != null
            ? res.status(201).send(JSON.stringify({
                success: true,
                message: "User created successfully.",
            }))
            : res.status(204).send(JSON.stringify({
                success: false,
                message: "There was an error registring this user.",
            }));
    }
    catch (err) {
        console.error("Erro ao criar utilizador:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.create = create;
/**
 * PARCEIRO FINANCIADOR (userRole 4) — só o Admin da empresa cria/edita.
 * A conta fica obrigatoriamente ligada a UMA carteira de financiamento
 * (financing_wallets) com portal activo: é essa a única carteira que o
 * parceiro verá no portal do financiador.
 */
const validatePartnerWallet = (companyId, walletId, res) => __awaiter(void 0, void 0, void 0, function* () {
    const wallet = yield FinancingWalletModel_1.FinancingWalletModel.findOne({
        where: { id: walletId, companyId },
        raw: true,
    });
    if (!wallet) {
        res.status(400).json({
            success: false,
            message: "Carteira de financiamento não encontrada nesta empresa.",
        });
        return null;
    }
    if (!wallet.tem_portal || !wallet.portal_ativo) {
        res.status(400).json({
            success: false,
            message: `A carteira ${wallet.codigo} não tem portal activo. Active o portal na carteira antes de criar o acesso.`,
        });
        return null;
    }
    return wallet;
});
const createPartner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = (0, roles_1.getCurrentUser)(req);
        const companyId = Number(req.body.companyId || (currentUser === null || currentUser === void 0 ? void 0 : currentUser.companyId));
        const { name, email, password, phone, walletId, nuit } = req.body;
        if (!companyId || !name || !email || !password || !walletId) {
            return res.status(400).json({
                success: false,
                message: "Campos obrigatórios: name, email, password e walletId (carteira de financiamento).",
            });
        }
        const wallet = yield validatePartnerWallet(companyId, Number(walletId), res);
        if (!wallet)
            return;
        const existing = yield UserModel_1.UserModel.findOne({
            where: { email: String(email).trim(), companyId },
            raw: true,
        });
        if (existing) {
            return res.status(409).json({ success: false, message: "Já existe um utilizador com este e-mail nesta empresa." });
        }
        const user = yield UserModel_1.UserModel.create({
            name: String(name).trim(),
            email: String(email).trim(),
            password: (0, password_1.hashPasswordIfNeeded)(String(password)),
            updatedPassword: 0,
            phone: phone ? String(phone) : null,
            status: 1,
            companyId,
            userRole: roles_1.FINANCING_PARTNER_ROLE,
            walletId: Number(walletId),
            is_parceiro: true,
            is_active: true,
            credentialsSent: 0,
        });
        return res.status(201).json({
            success: true,
            message: `Parceiro financiador criado e associado à carteira ${wallet.codigo}.`,
            result: stripPassword(user),
            carteira: { id: Number(wallet.id), codigo: wallet.codigo, nome: wallet.nome },
            nuit: nuit || null,
        });
    }
    catch (err) {
        console.error("Erro ao criar parceiro financiador:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro ao criar o parceiro financiador." });
    }
});
exports.createPartner = createPartner;
const updatePartner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = (0, roles_1.getCurrentUser)(req);
        const id = Number(req.params.id);
        const partner = yield UserModel_1.UserModel.findByPk(id);
        if (!partner) {
            return res.status(404).json({ success: false, message: "Parceiro não encontrado." });
        }
        if (Number(partner.getDataValue("userRole")) !== roles_1.FINANCING_PARTNER_ROLE) {
            return res.status(400).json({ success: false, message: "Este utilizador não é um parceiro financiador." });
        }
        const companyId = Number(partner.getDataValue("companyId"));
        const userCompany = Number(currentUser === null || currentUser === void 0 ? void 0 : currentUser.companyId);
        if (userCompany && userCompany !== companyId) {
            return res.status(403).json({ success: false, message: "Não tem acesso a utilizadores desta empresa." });
        }
        const data = {};
        if (req.body.name)
            data.name = String(req.body.name).trim();
        if (req.body.phone !== undefined)
            data.phone = req.body.phone ? String(req.body.phone) : null;
        if (req.body.is_active !== undefined)
            data.is_active = req.body.is_active ? true : false;
        if (req.body.password)
            data.password = (0, password_1.hashPasswordIfNeeded)(String(req.body.password));
        if (req.body.walletId) {
            const wallet = yield validatePartnerWallet(companyId, Number(req.body.walletId), res);
            if (!wallet)
                return;
            data.walletId = Number(req.body.walletId);
        }
        yield UserModel_1.UserModel.update(data, { where: { id } });
        const updated = stripPassword(yield UserModel_1.UserModel.findByPk(id));
        return res.status(200).json({ success: true, message: "Parceiro financiador actualizado.", result: updated });
    }
    catch (err) {
        console.error("Erro ao actualizar parceiro financiador:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro ao actualizar o parceiro financiador." });
    }
});
exports.updatePartner = updatePartner;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const _a = req.body, { password } = _a, rest = __rest(_a, ["password"]);
        // Nunca guardar a senha em texto simples: hashear sempre que vier no body —
        // mas nunca voltar a encriptar um valor que já seja hash (double-hash
        // tornaria o login impossível).
        const data = Object.assign({}, rest);
        if (password) {
            data.password = (0, password_1.hashPasswordIfNeeded)(password);
        }
        // Promover/rebaixar um utilizador para Parceiro Financiador (ou trocar-lhe a
        // carteira) exige sempre uma carteira com portal activo na mesma empresa.
        const current = yield UserModel_1.UserModel.findByPk(id, { raw: true });
        if (!current) {
            return res.status(404).json({ success: false, message: "Utilizador não encontrado." });
        }
        const targetRole = data.userRole === undefined ? Number(current.userRole) : Number(data.userRole);
        const targetWalletId = data.walletId === undefined ? Number(current.walletId) || null : Number(data.walletId) || null;
        if (targetRole === roles_1.FINANCING_PARTNER_ROLE) {
            if (!targetWalletId) {
                return res.status(400).json({
                    success: false,
                    message: "Selecione a carteira de financiamento do parceiro (perfil Parceiro Financiador).",
                });
            }
            const wallet = yield validatePartnerWallet(Number(current.companyId), targetWalletId, res);
            if (!wallet)
                return;
            data.walletId = Number(wallet.id);
            data.is_parceiro = 1;
        }
        else if (data.userRole !== undefined && Number(data.userRole) !== roles_1.FINANCING_PARTNER_ROLE) {
            // Deixou de ser parceiro: limpa a ligação à carteira.
            data.walletId = null;
            data.is_parceiro = 0;
        }
        const userUpdation = yield UserModel_1.UserModel.update(data, {
            where: {
                id: id,
            },
        });
        return userUpdation != null
            ? res.status(201).send(JSON.stringify({
                success: true,
                message: "User successfully updated.",
            }))
            : res.status(204).send(JSON.stringify({
                success: false,
                message: "There was an error updating this user.",
            }));
    }
    catch (err) {
        console.error("Erro ao atualizar utilizador:", err.message);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.update = update;
const destroy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deleteUser = yield UserModel_1.UserModel.destroy({ where: { id: id } });
        return deleteUser != null
            ? res.status(201).send(JSON.stringify({
                success: true,
                message: "User deleted successfully.",
            }))
            : res.status(204).send(JSON.stringify({
                success: false,
                message: "There was an error deleting this user.",
            }));
    }
    catch (err) {
        console.error("Erro ao eliminar utilizador:", err.message);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.destroy = destroy;
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "E-mail e senha são obrigatórios.",
            });
        }
        const user = yield UserModel_1.UserModel.findOne({
            where: {
                email,
                status: 1,
            },
        });
        if (!user) {
            return res.status(200).json({ success: false, message: "Utilizador não encontrado." });
        }
        const storedPassword = user.getDataValue("password");
        const isPasswordValid = yield bcryptjs_1.default.compare(password + "", storedPassword);
        if (!isPasswordValid) {
            return res
                .status(200)
                .send(JSON.stringify({ success: false, message: "Senha incorreta." }));
        }
        // is_active = 0 significa conta criada por cadastro público ainda não aprovada
        const userAny = user;
        if (userAny.getDataValue("is_active") === 0) {
            return res.status(200).json({
                success: false,
                message: "Sua empresa está aguardando aprovação do Super Admin. Contacto: +258 870740202",
            });
        }
        // Verificar estado de aprovação da empresa (Super Admin tem companyId NULL e nunca é bloqueado)
        let companyStatus = null;
        const userRole = Number(user.getDataValue("userRole"));
        const companyId = user.getDataValue("companyId");
        if (companyId && userRole !== 0) {
            try {
                const [rows] = yield db_1.db.query("SELECT approval_status FROM companies WHERE id = ?", { replacements: [companyId] });
                companyStatus = ((_b = rows[0]) === null || _b === void 0 ? void 0 : _b.approval_status) || null;
            }
            catch ( /* coluna pode não existir ainda */_c) { /* coluna pode não existir ainda */ }
            if (companyStatus && companyStatus !== "APROVADA") {
                return res.status(200).json({
                    success: false,
                    message: "Sua empresa está aguardando aprovação do Super Admin. Contacto: +258 870740202",
                });
            }
        }
        // Token com expiração longa (24h) - a expiração por inactividade é controlada pelo frontend
        // O payload leva userRole/companyId/walletId para o frontend encaminhar o
        // parceiro financiador (userRole 4) para o portal do financiador. As rotas
        // do portal revalidam sempre estes dados na base de dados.
        const token = jwt.sign({
            id: user.getDataValue("id"),
            companyId: user.getDataValue("companyId"),
            userRole: userRole,
            walletId: user.getDataValue("walletId") || null,
        }, process.env.APP_SECRET + "", {
            expiresIn: "24h",
        });
        const data = [
            {
                id: user.getDataValue("id"),
                companyId: user.getDataValue("companyId"),
                name: user.getDataValue("name"),
                email: user.getDataValue("email"),
                phone: user.getDataValue("phone"),
                userRole: user.getDataValue("userRole"),
                walletId: user.getDataValue("walletId") || null,
                isParceiro: !!user.getDataValue("is_parceiro"),
                updatedPassword: user.getDataValue("updatedPassword"),
                status: user.getDataValue("status"),
                is_active: user.getDataValue("is_active"),
                companyStatus: companyStatus,
                token: token,
                createdAt: user.getDataValue("createdAt"),
                updatedAt: user.getDataValue("updatedAt"),
            },
        ];
        return res.send(JSON.stringify({ success: true, result: data }));
    }
    catch (err) {
        console.error("Erro no login:", err.message);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.loginUser = loginUser;
const changeUserPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, newPassword, updatedPassword } = req.body;
        if (!email || !password || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "E-mail, senha actual e nova senha são obrigatórios.",
            });
        }
        const user = yield UserModel_1.UserModel.findOne({
            where: {
                email,
            },
        });
        if (!user) {
            return res.send(JSON.stringify({ success: false, message: "Utilizador não encontrado." }));
        }
        const storedPassword = user.getDataValue("password");
        const isPasswordValid = yield bcryptjs_1.default.compare(password + "", storedPassword);
        if (!isPasswordValid) {
            return res.send(JSON.stringify({
                success: false,
                message: "Senha incorreta. Tente novamente.",
            }));
        }
        // Hash bcrypt — nunca voltar a encriptar um valor que já seja hash
        const hash = (0, password_1.hashPasswordIfNeeded)(newPassword + "");
        const userUpdation = yield UserModel_1.UserModel.update({ password: hash, updatedPassword: updatedPassword }, {
            where: {
                id: user.getDataValue("id"),
            },
        });
        return userUpdation != null
            ? res.status(201).send(JSON.stringify({
                success: true,
                message: "Senha atualizada com sucesso.",
            }))
            : res.send(JSON.stringify({
                success: false,
                message: "Erro ao atualizar a senha.",
            }));
    }
    catch (err) {
        console.error("Erro ao alterar senha:", err.message);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.changeUserPassword = changeUserPassword;
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: "Token required" });
        }
        const [, token] = authHeader.split(" ");
        try {
            const decoded = jwt.verify(token, process.env.APP_SECRET + "");
            // Gerar novo token com 24h de validade
            const newToken = jwt.sign({ id: decoded.id }, process.env.APP_SECRET + "", { expiresIn: "24h" });
            return res.json({ success: true, token: newToken });
        }
        catch (error) {
            return res.status(401).json({ success: false, message: "Token invalid or expired" });
        }
    }
    catch (err) {
        console.error("Erro ao renovar token:", err.message);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.refreshToken = refreshToken;
