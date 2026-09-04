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
exports.refreshToken = exports.changeUserPassword = exports.loginUser = exports.update = exports.destroy = exports.create = exports.findOne = exports.findAll = void 0;
const UserModel_1 = require("../database/models/UserModel");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const password_1 = require("../utils/password");
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
        let { name, email, password, phone, status, companyId, userRole } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Campos obrigatórios: name, email e password.",
            });
        }
        // Hash bcrypt — mas nunca voltar a encriptar um valor que já seja hash
        const storedPassword = (0, password_1.hashPasswordIfNeeded)(password);
        const user = yield UserModel_1.UserModel.create({
            name,
            email,
            password: storedPassword,
            updatedPassword: 0,
            phone,
            status,
            companyId,
            userRole,
        });
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
        // Token com expiração longa (24h) - a expiração por inactividade é controlada pelo frontend
        const token = jwt.sign({ id: user.getDataValue("id") }, process.env.APP_SECRET + "", {
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
                updatedPassword: user.getDataValue("updatedPassword"),
                status: user.getDataValue("status"),
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
