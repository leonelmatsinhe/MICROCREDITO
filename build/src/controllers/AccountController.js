"use strict";
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
exports.ACCOUNT_TYPES = exports.ACCOUNT_PURPOSES = exports.deleteAccount = exports.updateAccount = exports.createAccount = exports.findOneAccount = exports.findAllaccounts = void 0;
const AccountModel_1 = require("../database/models/AccountModel");
const sequelize_1 = require("sequelize");
const AccountModel_2 = require("../database/models/AccountModel");
Object.defineProperty(exports, "ACCOUNT_PURPOSES", { enumerable: true, get: function () { return AccountModel_2.ACCOUNT_PURPOSES; } });
Object.defineProperty(exports, "ACCOUNT_TYPES", { enumerable: true, get: function () { return AccountModel_2.ACCOUNT_TYPES; } });
/**
 * CONTAS BANCÁRIAS — controlador legado das Configurações.
 *
 * FONTE ÚNICA DE VERDADE: a MESMA tabela `accounts` usada pelo módulo do
 * Caixa Central (`/api/bank-accounts`). Este controlador mantém os endpoints
 * antigos (/api/accounts, /api/account) mas já lê/grava as colunas novas da
 * carteira real (bank_name, type, purpose, defaults, is_active), para que
 * Configurações e Caixa Central mostrem sempre as MESMAS contas.
 *
 * O saldo (balance) NUNCA é alterado aqui — é exclusivo do treasuryService.
 */
// Campos permitidos em create/update (o saldo fica de fora de propósito).
const EDITABLE_FIELDS = [
    "accountNumber", "accountDescription", "accountHolder", "bank_name", "bank_code",
    "initial_balance", "purpose", "type", "is_default_reembolso", "is_default_desembolso",
    "is_active", "currency",
];
const pickEditable = (body) => {
    const payload = {};
    EDITABLE_FIELDS.forEach((field) => {
        if ((body === null || body === void 0 ? void 0 : body[field]) !== undefined)
            payload[field] = body[field];
    });
    return payload;
};
/**
 * Se a conta for marcada como default de reembolso/desembolso, limpa a marca
 * das restantes contas da empresa (uma só default por finalidade).
 */
const enforceSingleDefault = (companyId, payload, excludeId) => __awaiter(void 0, void 0, void 0, function* () {
    for (const flag of ["is_default_reembolso", "is_default_desembolso"]) {
        if (Number(payload[flag]) === 1) {
            const where = { companyId, [flag]: 1 };
            if (excludeId)
                where.id = { [sequelize_1.Op.ne]: excludeId };
            yield AccountModel_1.AccountModel.update({ [flag]: 0 }, { where });
        }
    }
});
// Deriva o tipo de carteira a partir da descrição (M-Pesa → MOBILE_MONEY, etc.)
// quando o frontend não envia `type` — mantém compatibilidade com forms antigos.
const inferType = (description) => {
    const text = String(description || "").toLowerCase();
    if (text.includes("m-pesa") || text.includes("mpesa"))
        return "MOBILE_MONEY";
    if (text.includes("e-mola") || text.includes("emola"))
        return "MOBILE_MONEY";
    if (text.includes("caixa"))
        return "CAIXA_FISICO";
    return "BANCO";
};
const findAllaccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const accounts = yield AccountModel_1.AccountModel.findAll({
            where: { companyId: id },
            // Activas primeiro; dentro delas, as defaults no topo.
            order: [
                ["is_active", "DESC"],
                ["is_default_reembolso", "DESC"],
                ["is_default_desembolso", "DESC"],
                ["id", "DESC"],
            ],
        });
        // Retorna sempre 200 com array (vazio ou preenchido) para evitar problemas com status 204
        return res.status(200).json({ success: true, result: accounts || [] });
    }
    catch (error) {
        console.error("[accounts] Erro ao listar:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao listar contas." });
    }
});
exports.findAllaccounts = findAllaccounts;
const findOneAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const account = yield AccountModel_1.AccountModel.findOne({
        where: { id },
    });
    return account != null
        ? res.status(200).send({ success: true, result: account })
        : res.status(204).send({
            success: false,
            result: "No account found with the ID provided",
        });
});
exports.findOneAccount = findOneAccount;
const createAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { accountHolder, accountDescription, accountNumber, createdBy, companyId } = req.body;
        if (!accountNumber || !companyId) {
            return res.status(400).json({
                success: false,
                message: "Número da conta e empresa são obrigatórios.",
            });
        }
        const payload = pickEditable(req.body);
        // Defaults sensatos quando o form antigo não envia as colunas novas:
        // banco derivado da descrição (M-Pesa/e-Mola/Caixa) e finalidade MISTO.
        if (!payload.type)
            payload.type = inferType(accountDescription);
        if (!payload.purpose)
            payload.purpose = "MISTO";
        if (payload.is_active === undefined)
            payload.is_active = 1;
        yield enforceSingleDefault(Number(companyId), payload);
        const newAccount = yield AccountModel_1.AccountModel.create(Object.assign({ companyId,
            accountHolder,
            accountDescription,
            accountNumber, createdBy: String(createdBy !== null && createdBy !== void 0 ? createdBy : "sistema"), bank_name: (_b = (_a = payload.bank_name) !== null && _a !== void 0 ? _a : accountDescription) !== null && _b !== void 0 ? _b : "" }, payload));
        return newAccount != null
            ? res.status(201).json({ success: true, message: "Account created successfully.", result: newAccount })
            : res.status(400).json({ success: false, message: "There was an error creating the account." });
    }
    catch (error) {
        console.error("[accounts] Erro ao criar:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao criar a conta." });
    }
});
exports.createAccount = createAccount;
const updateAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const account = yield AccountModel_1.AccountModel.findOne({ where: { id } });
        if (!account) {
            return res.status(404).json({ success: false, message: "Conta não encontrada." });
        }
        const payload = pickEditable(req.body);
        // Nunca permitir gravar saldo por este caminho (exclusivo do treasury).
        delete payload.balance;
        yield enforceSingleDefault(Number(account.getDataValue("companyId")), payload, Number(id));
        if (Object.keys(payload).length > 0) {
            yield account.update(payload);
        }
        return res.json({ success: true, message: "Account updated successfully", result: account });
    }
    catch (error) {
        console.error("[accounts] Erro ao actualizar:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao actualizar a conta." });
    }
});
exports.updateAccount = updateAccount;
/**
 * ELIMINAR = DESACTIVAR (soft delete).
 * Contas podem ter movimentos em bank_transactions/cash_movements — apagar a
 * linha quebraria o histórico da tesouraria. Passa a is_active=0 e deixa de
 * aparecer nos selects, mantendo o histórico intacto.
 */
const deleteAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const account = yield AccountModel_1.AccountModel.findOne({ where: { id } });
        if (!account) {
            return res.status(404).json({ success: false, message: "Conta não encontrada." });
        }
        yield account.update({ is_active: 0, is_default_reembolso: 0, is_default_desembolso: 0 });
        return res.status(200).json({
            success: true,
            message: "Conta desactivada (o histórico financeiro foi preservado).",
        });
    }
    catch (error) {
        console.error("[accounts] Erro ao desactivar:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao desactivar a conta." });
    }
});
exports.deleteAccount = deleteAccount;
