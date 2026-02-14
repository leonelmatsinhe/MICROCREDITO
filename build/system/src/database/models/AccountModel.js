"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
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
    },
    accountDescription: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    accountHolder: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    createdBy: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    updatedBy: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
});
