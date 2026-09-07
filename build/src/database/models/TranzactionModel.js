"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranzactionModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.TranzactionModel = db_1.db.define("tranzactions", {
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
    amortizationLoanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    loanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    accountNumber: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    customerId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    totalAmount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: "Valor total recebido: base + juros de mora - desconto",
    },
    latePaymentInterest: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    interestRateAmount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    phoneNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    paymentDate: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    tranzactionReference: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    paymentMethod: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    receiptUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    staffName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    discountApplied: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    },
    discountAmount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
    },
});
