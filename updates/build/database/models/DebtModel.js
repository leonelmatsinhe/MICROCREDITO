"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebtModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.DebtModel = db_1.db.define("debts", {
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
    },
    loanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    amortisationId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    debtAmount: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    updatedBy: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    dateInserted: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
});
