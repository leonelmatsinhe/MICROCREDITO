"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountModel = exports.ACCOUNT_TYPES = exports.ACCOUNT_PURPOSES = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
/**
 * Finalidades da conta bancária — usadas para filtrar as opções nos forms
 * (REEMBOLSO para pagamentos, DESEMBOLSO para desembolsos, MISTO para ambos).
 */
exports.ACCOUNT_PURPOSES = ["REEMBOLSO", "DESEMBOLSO", "MISTO", "TAXAS", "RESERVA"];
/**
 * Tipos de carteira: banco tradicional, gaveta de dinheiro físico,
 * mobile money (M-Pesa/e-Mola) e carteiras electrónicas.
 */
exports.ACCOUNT_TYPES = ["BANCO", "CAIXA_FISICO", "MOBILE_MONEY", "EWALLET"];
/**
 * CARTEIRA REAL DA EMPRESA — contas bancárias (FNB, BCI, BIM, Moza, ...),
 * mobile money e caixa físico, cada uma com SALDO REAL.
 *
 * Refactor (migration ALTER, sem DROP): as colunas originais
 * (accountNumber/accountDescription/accountHolder) continuam a servir os
 * contratos; as novas colunas gerem a tesouraria:
 *  - balance: saldo real actual, alterado APENAS pelo treasuryService;
 *  - purpose/type/is_active/is_default_*: selecção nos forms e regras;
 *  - bank_name/bank_code/currency: identificação do banco.
 */
exports.AccountModel = db_1.db.define("accounts", {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    companyId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    accountNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        comment: "Número da conta / IBAN / número do telefone (mobile money)",
    },
    accountDescription: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    accountHolder: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    // ── Colunas novas do Caixa Central (ver migration) ──
    bank_name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "",
        comment: "Nome do banco (FNB, BCI, BIM, Moza, ...) ou operador (M-Pesa, e-Mola)",
    },
    bank_code: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        comment: "Código SWIFT/ABI do banco",
    },
    balance: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Saldo real actual — gerido pelo treasuryService",
    },
    initial_balance: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
        comment: "Saldo de partida quando a conta foi registada",
    },
    purpose: {
        type: sequelize_1.DataTypes.ENUM(...exports.ACCOUNT_PURPOSES),
        allowNull: false,
        defaultValue: "MISTO",
    },
    type: {
        type: sequelize_1.DataTypes.ENUM(...exports.ACCOUNT_TYPES),
        allowNull: false,
        defaultValue: "BANCO",
    },
    is_default_reembolso: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Conta pré-seleccionada para receber reembolsos (pagamentos)",
    },
    is_default_desembolso: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Conta pré-seleccionada para desembolsos",
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    currency: {
        type: sequelize_1.DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "MZN",
    },
    // ── Auditoria ──
    createdBy: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    updatedBy: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: "accounts",
    freezeTableName: true,
});
