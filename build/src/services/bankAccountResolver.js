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
exports.getAccountBalance = exports.getFirstCashAccount = exports.validateReembolsoAccount = exports.getReembolsoAccounts = exports.REEMBOLSO_PURPOSES = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../database/db");
const AccountModel_1 = require("../database/models/AccountModel");
const money_1 = require("../utils/money");
/**
 * RESOLVER DE CONTAS DE DESTINO DE PAGAMENTO (V2).
 *
 * Tabela REAL: `accounts` (a "carteira real" da empresa — FNB, Moza, M-Pesa,
 * caixa físico...). A coluna de tipo/finalidade é `purpose` ENUM:
 *   REEMBOLSO | DESEMBOLSO | MISTO | TAXAS | RESERVA
 * e `type` separa a natureza: BANCO | CAIXA_FISICO | MOBILE_MONEY | EWALLET.
 *
 * Regras do modal "Registar Pagamento":
 *   - CASH (dinheiro)         → CAIXA_FISICO primeiro, depois MISTO
 *   - BANK/TRANSFERÊNCIA      → REEMBOLSO primeiro, depois MISTO
 *   - MPESA/EMOLA (mobile)    → MOBILE_MONEY (MISTO com "mpesa/emola" no nome) primeiro
 *   - MISTO entra sempre (aceita ambos os fluxos)
 * Contas DESEMBOLSO/TAXAS/RESERVA NUNCA aparecem (não são destino de pagamento).
 */
exports.REEMBOLSO_PURPOSES = ["REEMBOLSO", "MISTO"];
const plainAccount = (a) => ({
    id: Number(a.id),
    name: String(a.accountDescription || a.bank_name || `Conta ${a.id}`),
    bank_name: String(a.bank_name || ""),
    account_number: String(a.accountNumber || ""),
    purpose: String(a.purpose || ""),
    type: String(a.type || ""),
    balance: (0, money_1.round2)((0, money_1.num)(a.balance)),
    is_default_reembolso: !!Number(a.is_default_reembolso),
});
/**
 * Contas válidas como DESTINO de pagamento para a empresa.
 * Ordenação (prioridade) por método de pagamento:
 *   - default: is_default_reembolso → MISTO → REEMBOLSO → restantes
 *   - CASH:    CAIXA_FISICO primeiro
 *   - MPESA/EMOLA: MOBILE_MONEY primeiro (e nomes com mpesa/e-mola sobem)
 *   - BANK:    BANCO REEMBOLSO primeiro
 */
const getReembolsoAccounts = (companyId, paymentMethod) => __awaiter(void 0, void 0, void 0, function* () {
    const accounts = yield AccountModel_1.AccountModel.findAll({
        where: {
            companyId: Number(companyId),
            is_active: 1,
            purpose: { [sequelize_1.Op.in]: ["REEMBOLSO", "MISTO"] },
        },
        order: [["id", "ASC"]],
        raw: true,
    });
    const method = String(paymentMethod !== null && paymentMethod !== void 0 ? paymentMethod : "").toUpperCase();
    // Códigos legados: 1=Numerário, 3=Transferência, 7=M-Pesa (form do Quasar)
    const isCash = method === "CASH" || method === "1";
    const isMobile = method === "MPESA" || method === "EMOLA" || method === "7" || method === "6";
    const isBank = method === "BANK" || method === "3" || method === "4" || method === "5";
    const score = (a) => {
        let s = 0;
        const purpose = String(a.purpose || "");
        const type = String(a.type || "");
        const name = String(a.accountDescription || a.bank_name || "").toLowerCase();
        if (Number(a.is_default_reembolso))
            s -= 100;
        if (purpose === "MISTO")
            s -= 20;
        if (isCash && type === "CAIXA_FISICO")
            s -= 50;
        if (isMobile && type === "MOBILE_MONEY")
            s -= 60;
        if (isMobile && (name.includes("mpesa") || name.includes("m-pesa")))
            s -= 30;
        if (isMobile && name.includes("e-mola"))
            s -= 25;
        if (isBank && type === "BANCO" && purpose === "REEMBOLSO")
            s -= 40;
        return s;
    };
    return accounts
        .map(plainAccount)
        .sort((a, b) => score(a) - score(b) || a.id - b.id);
});
exports.getReembolsoAccounts = getReembolsoAccounts;
/**
 * Valida 1 conta como destino de pagamento:
 * mesma empresa, activa e purpose REEMBOLSO/MISTO.
 * (Contas DESPESA/DESEMBOLSO/TAXAS/RESERVA → 400 INVALID_BANK_ACCOUNT.)
 */
const validateReembolsoAccount = (bankAccountId, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const account = yield AccountModel_1.AccountModel.findOne({
        where: {
            id: Number(bankAccountId),
            companyId: Number(companyId),
            is_active: 1,
            purpose: { [sequelize_1.Op.in]: ["REEMBOLSO", "MISTO"] },
        },
    });
    if (!account) {
        throw { http: 400, payload: { success: false, code: "INVALID_BANK_ACCOUNT", message: "Conta de destino inválida (exige REEMBOLSO ou MISTO activa desta empresa)." } };
    }
    return plainAccount(account);
});
exports.validateReembolsoAccount = validateReembolsoAccount;
/**
 * Fallback: conta de destino quando nem o pedido nem o caixa aberto indicam
 * a conta. Prioriza CAIXA_FISICO (dinheiro vivo); se a empresa não tiver
 * caixa físico registado (caso real: empresa 36), cai para a primeira conta
 * REEMBOLSO/MISTO activa (preferindo a default de reembolso).
 */
const getFirstCashAccount = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const cash = yield AccountModel_1.AccountModel.findOne({
        where: { companyId: Number(companyId), is_active: 1, type: "CAIXA_FISICO" },
        order: [["id", "ASC"]],
    });
    if (cash)
        return plainAccount(cash);
    // Sem CAIXA_FISICO: qualquer REEMBOLSO/MISTO activa serve de destino
    // (default de reembolso primeiro, depois MISTO, depois id).
    const anyDest = yield AccountModel_1.AccountModel.findOne({
        where: { companyId: Number(companyId), is_active: 1, purpose: { [sequelize_1.Op.in]: ["REEMBOLSO", "MISTO"] } },
        order: [["is_default_reembolso", "DESC"], ["id", "ASC"]],
    });
    return anyDest ? plainAccount(anyDest) : null;
});
exports.getFirstCashAccount = getFirstCashAccount;
/**
 * Lê o saldo ACTUAL de uma conta (pós-pagamento) — para testes e UI.
 */
const getAccountBalance = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const [rows] = yield db_1.db.query("SELECT balance FROM accounts WHERE id = ?", {
        replacements: [Number(accountId)],
    });
    return (0, money_1.round2)((0, money_1.num)((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.balance));
});
exports.getAccountBalance = getAccountBalance;
