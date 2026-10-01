"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankTransactionModel = exports.BANK_TX_CATEGORIES = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
/**
 * Categorias do extrato bancário real (bank_transactions).
 * Cada movimento não-CASH do caixa gera aqui a contrapartida por conta.
 */
exports.BANK_TX_CATEGORIES = [
    "REEMBOLSO_BANCO",
    "DESEMBOLSO_BANCO",
    "DEPOSITO_CAIXA",
    "LEVANTAMENTO_BANCO",
    "TAXA_BANCARIA",
    "ESTORNO",
    "OUTROS",
];
/**
 * TESOURARIA — extrato real de cada conta bancária.
 * Cada linha guarda balance_after: o saldo da conta APÓS a operação,
 * permitindo reconstruir o extrato exacto como no banco.
 */
exports.BankTransactionModel = db_1.db.define("bank_transactions", {
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
    accountId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "Conta bancária (accounts) movimentada",
    },
    cashRegisterId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "Caixa do dia que originou o movimento (null para ajustes)",
    },
    type: {
        type: sequelize_1.DataTypes.ENUM("ENTRADA", "SAIDA"),
        allowNull: false,
    },
    category: {
        type: sequelize_1.DataTypes.ENUM(...exports.BANK_TX_CATEGORIES),
        allowNull: false,
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: "Valor da operação (sempre positivo)",
    },
    balanceAfter: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Saldo da conta após esta operação",
    },
    description: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    referenceType: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        comment: "Tabela de origem (ex.: customer_loans, amortization_loans)",
    },
    referenceId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    createdBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: "bank_transactions",
    freezeTableName: true,
});
