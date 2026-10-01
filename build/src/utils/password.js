"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPasswordIfNeeded = exports.isBcryptHash = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Detecta se o valor já é um hash bcrypt (ex.: veio da BD, não de um formulário).
// Impede o "double-hash": encriptar uma senha que já foi encriptada torna o
// login impossível, porque o bcrypt compara sempre contra o hash original.
const isBcryptHash = (value) => {
    const str = String(value !== null && value !== void 0 ? value : "");
    // bcrypt: $2a$/$2b$/$2y$ + custo (2 dígitos) + $ + 53 caracteres base64 = 60
    return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
};
exports.isBcryptHash = isBcryptHash;
// Devolve o valor pronto a guardar na coluna password:
// - se já for hash bcrypt → tal qual (nunca voltar a encriptar);
// - senha em texto simples → hashSync.
const hashPasswordIfNeeded = (password) => {
    const value = String(password !== null && password !== void 0 ? password : "");
    if (!value)
        return value;
    return (0, exports.isBcryptHash)(value) ? value : bcryptjs_1.default.hashSync(value, 10);
};
exports.hashPasswordIfNeeded = hashPasswordIfNeeded;
