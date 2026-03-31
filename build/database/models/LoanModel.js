"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.LoanModel = db_1.db.define("customer_loans", {
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
    creditManager: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    accountNumber: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    amount: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    numberOfInstallments: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    interestRate: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    loanDescription: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    capacityExcessObservation: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    dateCreated: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
});
