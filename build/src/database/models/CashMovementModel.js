"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashMovementModel = exports.CASH_PAYMENT_METHODS = exports.CASH_CATEGORIES = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
/**
 * Categorias de movimento do Caixa Central.
 *  - Automáticas: DESEMBOLSO (saída), REEMBOLSO / JUROS_MORA / TAXA_ADMIN (entradas).
 *  - Bancárias: DEPOSITO_BANCO / LEVANTAMENTO_BANCO / TRANSFERENCIA.
 *  - Manuais: despesas correntes do escritório.
 */
exports.CASH_CATEGORIES = [
    "DESEMBOLSO",
    "REEMBOLSO",
    "JUROS_MORA",
    "TAXA_ADMIN",
    "DEPOSITO_BANCO",
    "LEVANTAMENTO_BANCO",
    "TRANSFERENCIA",
    "INTERNET",
    "LUZ",
    "AGUA",
    "COMBUSTIVEL",
    "RENTABILIDADE",
    "SALARIOS",
    "SALARIO",
    "REUNIAO",
    "TRANSPORTE",
    "MATERIAL",
    "OUTROS",
];
/**
 * Métodos de pagamento suportados. MPESA/EMOLA movem contas do tipo
 * MOBILE_MONEY e são tratados como "electrónico" (totais bank_*).
 */
exports.CASH_PAYMENT_METHODS = ["CASH", "BANK", "MPESA", "EMOLA"];
/**
 * CAIXA CENTRAL — movimentos do dia (entradas e saídas).
 * CASH = dinheiro físico da gaveta; BANK/MPESA/EMOLA = dinheiro electrónico
 * (geram também a contrapartida em bank_transactions + saldo da conta).
 */
exports.CashMovementModel = db_1.db.define("cash_movements", {
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
    cashRegisterId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "Caixa ao qual o movimento pertence",
    },
    bankAccountId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "Obrigatório quando paymentMethod ≠ CASH — conta movimentada",
    },
    type: {
        type: sequelize_1.DataTypes.ENUM("ENTRADA", "SAIDA"),
        allowNull: false,
    },
    paymentMethod: {
        type: sequelize_1.DataTypes.ENUM(...exports.CASH_PAYMENT_METHODS),
        allowNull: false,
        defaultValue: "CASH",
    },
    category: {
        type: sequelize_1.DataTypes.ENUM(...exports.CASH_CATEGORIES),
        allowNull: false,
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: "Valor do movimento (sempre positivo)",
    },
    description: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        comment: "Descrição obrigatória (ex.: conta 1024 — 3ª prestação)",
    },
    // Rastreabilidade de movimentos automáticos (nulos nos manuais)
    loanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    amortizationLoanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    tranzactionId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    customerId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    referenceType: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        comment: "Tabela de origem (ex.: customer_loans)",
    },
    referenceId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "id na tabela de origem",
    },
    isAutomatic: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "true = criado pelo sistema; false = manual",
    },
    createdBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: "cash_movements",
    freezeTableName: true,
});
