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
exports.ACCOUNT_TYPES = exports.ACCOUNT_PURPOSES = exports.getDefaultCollectAccount = exports.getStatementGroupedByAccount = exports.deactivate = exports.adjustBalance = exports.upsert = exports.getStatement = exports.getBalance = exports.getOne = exports.getAll = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../database/db");
const AccountModel_1 = require("../database/models/AccountModel");
Object.defineProperty(exports, "ACCOUNT_PURPOSES", { enumerable: true, get: function () { return AccountModel_1.ACCOUNT_PURPOSES; } });
Object.defineProperty(exports, "ACCOUNT_TYPES", { enumerable: true, get: function () { return AccountModel_1.ACCOUNT_TYPES; } });
const BankTransactionModel_1 = require("../database/models/BankTransactionModel");
/**
 * CARTEIRA REAL — serviço de contas bancárias (CRUD + consulta de saldos).
 *
 * A tabela `accounts` agora serve dois propósitos:
 *  - dados ilustrativos dos contratos (campos antigos, mantidos);
 *  - carteira real com saldo (colunas novas geridas pelo treasuryService).
 * Este serviço apenas consulta/gerestraria dados cadastrais — NUNCA altera
 * `balance` directamente (isso é exclusivo do treasuryService).
 */
const round2 = (value) => Math.round(value * 100) / 100;
const accountPlain = (account) => {
    const plain = account.toJSON ? account.toJSON() : Object.assign({}, account);
    plain.balance = Number(plain.balance) || 0;
    plain.initial_balance = Number(plain.initial_balance) || 0;
    plain.is_active = Number(plain.is_active) ? 1 : 0;
    plain.is_default_reembolso = Number(plain.is_default_reembolso) ? 1 : 0;
    plain.is_default_desembolso = Number(plain.is_default_desembolso) ? 1 : 0;
    return plain;
};
/**
 * Lista contas da empresa com filtros opcionais (usada pela página de gestão
 * e pelos q-select dos forms de desembolso/pagamento).
 */
const getAll = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const where = { companyId: params.companyId };
    if (params.purpose && AccountModel_1.ACCOUNT_PURPOSES.includes(params.purpose)) {
        // REEMBOLSO aceita contas REEMBOLSO + MISTO; DESEMBOLSO idem.
        if (params.purpose === "REEMBOLSO" || params.purpose === "DESEMBOLSO") {
            where.purpose = { [sequelize_1.Op.in]: [params.purpose, "MISTO"] };
        }
        else {
            where.purpose = params.purpose;
        }
    }
    if (params.isActive !== undefined)
        where.is_active = params.isActive ? 1 : 0;
    const accounts = (yield AccountModel_1.AccountModel.findAll({
        where,
        order: [["is_active", "DESC"], ["bank_name", "ASC"]],
    }));
    return accounts.map(accountPlain);
});
exports.getAll = getAll;
/**
 * Obtém uma conta pelo id (com validação de empresa).
 */
const getOne = (companyId, id) => __awaiter(void 0, void 0, void 0, function* () {
    const account = yield AccountModel_1.AccountModel.findOne({ where: { id, companyId } });
    return account ? accountPlain(account) : null;
});
exports.getOne = getOne;
/**
 * Saldo actual da conta.
 */
const getBalance = (companyId, id) => __awaiter(void 0, void 0, void 0, function* () {
    const account = yield AccountModel_1.AccountModel.findOne({
        where: { id, companyId },
        attributes: ["balance"],
        raw: true,
    });
    if (!account)
        throw { code: "NOT_FOUND", message: "Conta não encontrada." };
    return round2(Number(account.balance) || 0);
});
exports.getBalance = getBalance;
/**
 * Extrato da conta (bank_transactions), mais recentes primeiro.
 */
const getStatement = (companyId, accountId, limit = 200) => __awaiter(void 0, void 0, void 0, function* () {
    const rows = (yield BankTransactionModel_1.BankTransactionModel.findAll({
        where: { companyId, accountId },
        order: [["id", "DESC"]],
        limit,
    }));
    return rows.map((row) => {
        const plain = row.toJSON ? row.toJSON() : Object.assign({}, row);
        plain.amount = Number(plain.amount) || 0;
        plain.balanceAfter = Number(plain.balanceAfter) || 0;
        return plain;
    });
});
exports.getStatement = getStatement;
/**
 * Cria/atualiza conta bancária (dados cadastrais — saldo inicial apenas na
 * criação; depois do registo, o saldo só muda por movimentos da tesouraria).
 */
const upsert = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const allowed = [
        "accountNumber", "accountDescription", "accountHolder", "bank_name", "bank_code",
        "initial_balance", "purpose", "type", "is_default_reembolso", "is_default_desembolso",
        "is_active", "currency",
    ];
    const payload = {};
    allowed.forEach((field) => {
        if (params.data[field] !== undefined)
            payload[field] = params.data[field];
    });
    // Validações de domínio.
    if (payload.purpose && !AccountModel_1.ACCOUNT_PURPOSES.includes(payload.purpose)) {
        throw { code: "INVALID_PURPOSE", message: `Finalidade inválida (${AccountModel_1.ACCOUNT_PURPOSES.join(", ")}).` };
    }
    if (payload.type && !AccountModel_1.ACCOUNT_TYPES.includes(payload.type)) {
        throw { code: "INVALID_TYPE", message: `Tipo inválido (${AccountModel_1.ACCOUNT_TYPES.join(", ")}).` };
    }
    if (!payload.accountNumber) {
        throw { code: "INVALID_ACCOUNT", message: "O número da conta é obrigatório." };
    }
    // Se esta conta for marcada como default de reembolso/desembolso, limpar a
    // marca das restantes (só pode existir UMA default por finalidade/empresa).
    for (const flag of ["is_default_reembolso", "is_default_desembolso"]) {
        if (Number(payload[flag]) === 1) {
            yield AccountModel_1.AccountModel.update({ [flag]: 0 }, { where: { companyId: params.companyId, [flag]: 1 } });
        }
    }
    if (params.id) {
        const account = yield AccountModel_1.AccountModel.findOne({ where: { id: params.id, companyId: params.companyId } });
        if (!account)
            throw { code: "NOT_FOUND", message: "Conta não encontrada." };
        yield account.update(Object.assign(Object.assign({}, payload), { updatedBy: params.userName }));
        return accountPlain(account);
    }
    const account = yield AccountModel_1.AccountModel.create(Object.assign(Object.assign({}, payload), { companyId: params.companyId, balance: 0, createdBy: params.userName, updatedBy: params.userName }));
    return accountPlain(account);
});
exports.upsert = upsert;
/**
 * AJUSTE MANUAL DE SALDO — introduzir o saldo real de uma conta
 * BANCO / MOBILE_MONEY / EWALLET (ex.: saldo do extrato do banco).
 *
 * Define `balance` para o valor informado e registra a DIFERENÇA em
 * bank_transactions (categoria ESTORNO) para o extrato continuar a bater.
 * Uso administrativo — sincroniza a carteira com a realidade bancária.
 */
const adjustBalance = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const account = yield AccountModel_1.AccountModel.findOne({
        where: { id: params.accountId, companyId: params.companyId },
    });
    if (!account)
        throw { code: "NOT_FOUND", message: "Conta não encontrada." };
    const type = String(account.getDataValue("type") || "").toUpperCase();
    if (type === "CAIXA_FISICO") {
        throw { code: "INVALID_ACCOUNT", message: "O saldo do caixa físico gere-se pelo Caixa Diário, não por ajuste directo." };
    }
    if (!Number.isFinite(params.newBalance) || params.newBalance < 0) {
        throw { code: "INVALID_AMOUNT", message: "Informe um saldo válido (>= 0)." };
    }
    const transaction = yield db_1.db.transaction();
    try {
        const locked = yield AccountModel_1.AccountModel.findOne({
            where: { id: params.accountId },
            transaction,
            lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
        });
        const current = Number(locked.getDataValue("balance")) || 0;
        const target = Math.round(params.newBalance * 100) / 100;
        const delta = Math.round((target - current) * 100) / 100;
        yield locked.update({ balance: target }, { transaction });
        // Diferença registrada no extrato (ESTORNO) — zero quando igual.
        if (delta !== 0) {
            yield BankTransactionModel_1.BankTransactionModel.create({
                companyId: params.companyId,
                accountId: params.accountId,
                cashRegisterId: null,
                type: delta > 0 ? "ENTRADA" : "SAIDA",
                category: "ESTORNO",
                amount: Math.abs(delta),
                balanceAfter: target,
                description: ((_a = params.description) === null || _a === void 0 ? void 0 : _a.trim()) || `Ajuste manual de saldo (${current.toFixed(2)} → ${target.toFixed(2)} MZN)`,
                referenceType: "accounts",
                referenceId: params.accountId,
                createdBy: (_b = params.userId) !== null && _b !== void 0 ? _b : null,
            }, { transaction });
        }
        yield transaction.commit();
        return accountPlain(locked);
    }
    catch (error) {
        yield transaction.rollback();
        throw error;
    }
});
exports.adjustBalance = adjustBalance;
const deactivate = (companyId, id) => __awaiter(void 0, void 0, void 0, function* () {
    const account = yield AccountModel_1.AccountModel.findOne({ where: { id, companyId } });
    if (!account)
        throw { code: "NOT_FOUND", message: "Conta não encontrada." };
    yield account.update({ is_active: 0, updatedBy: "sistema" });
    return accountPlain(account);
});
exports.deactivate = deactivate;
/**
 * Extrato do dia agrupado por conta — para o relatório BM / fecho do caixa
 * (separação CASH vs BANK por conta).
 */
const getStatementGroupedByAccount = (companyId, date) => __awaiter(void 0, void 0, void 0, function* () {
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;
    const rows = (yield BankTransactionModel_1.BankTransactionModel.findAll({
        where: {
            companyId,
            createdAt: { [sequelize_1.Op.between]: [startOfDay, endOfDay] },
        },
        attributes: [
            "accountId",
            [BankTransactionModel_1.BankTransactionModel.sequelize.fn("SUM", BankTransactionModel_1.BankTransactionModel.sequelize.literal("CASE WHEN type = 'ENTRADA' THEN amount ELSE 0 END")), "total_in"],
            [BankTransactionModel_1.BankTransactionModel.sequelize.fn("SUM", BankTransactionModel_1.BankTransactionModel.sequelize.literal("CASE WHEN type = 'SAIDA' THEN amount ELSE 0 END")), "total_out"],
            [BankTransactionModel_1.BankTransactionModel.sequelize.fn("COUNT", BankTransactionModel_1.BankTransactionModel.sequelize.col("id")), "txCount"],
        ],
        group: ["accountId"],
        raw: true,
    }));
    // Enriquecer com dados da conta.
    const accountIds = rows.map((r) => Number(r.accountId));
    const accounts = accountIds.length
        ? (yield AccountModel_1.AccountModel.findAll({ where: { id: { [sequelize_1.Op.in]: accountIds } }, raw: true }))
        : [];
    const byId = {};
    accounts.forEach((a) => { byId[Number(a.id)] = a; });
    return rows.map((row) => {
        const account = byId[Number(row.accountId)] || {};
        return {
            accountId: Number(row.accountId),
            bank_name: account.bank_name || "—",
            accountNumber: account.accountNumber || "—",
            total_in: round2(Number(row.total_in) || 0),
            total_out: round2(Number(row.total_out) || 0),
            balance: round2(Number(account.balance) || 0),
            txCount: Number(row.txCount) || 0,
        };
    });
});
exports.getStatementGroupedByAccount = getStatementGroupedByAccount;
/**
 * CONTA DE COLECTA DEFAULT — onde caem os pagamentos automáticos do portal
 * do mutuário (M-Pesa/transferências iniciados pelo cliente).
 *
 * Ordem de preferência:
 *  1. Conta MOBILE_MONEY activa (colecta M-Pesa/e-Mola);
 *  2. Conta marcada is_default_reembolso;
 *  3. Qualquer conta activa MISTO;
 *  4. Qualquer conta activa (último recurso).
 */
const getDefaultCollectAccount = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const active = { companyId, is_active: 1 };
    const mobile = yield AccountModel_1.AccountModel.findOne({ where: Object.assign(Object.assign({}, active), { type: "MOBILE_MONEY" }), order: [["id", "ASC"]] });
    if (mobile)
        return accountPlain(mobile);
    const reembolso = yield AccountModel_1.AccountModel.findOne({ where: Object.assign(Object.assign({}, active), { is_default_reembolso: 1 }), order: [["id", "ASC"]] });
    if (reembolso)
        return accountPlain(reembolso);
    const misto = yield AccountModel_1.AccountModel.findOne({ where: Object.assign(Object.assign({}, active), { purpose: "MISTO" }), order: [["id", "ASC"]] });
    if (misto)
        return accountPlain(misto);
    const any = yield AccountModel_1.AccountModel.findOne({ where: active, order: [["id", "ASC"]] });
    return any ? accountPlain(any) : null;
});
exports.getDefaultCollectAccount = getDefaultCollectAccount;
