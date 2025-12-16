"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmorizationLoanModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.AmorizationLoanModel = db_1.db.define("amortization_loan", {
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
    loanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    installmentOrder: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    accountNumber: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    amortization: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    installment: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    interestRate: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    loanBalance: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    dueDate: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
});
