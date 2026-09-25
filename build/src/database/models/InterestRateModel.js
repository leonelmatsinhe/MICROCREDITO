"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterestRateModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.InterestRateModel = db_1.db.define("interest_rates", {
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
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    tax: {
        type: sequelize_1.DataTypes.DECIMAL(8, 4),
        allowNull: false,
    },
    administrativeFee: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    walletId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "Carteira de financiamento (FINANCIAMENTO) associada a esta taxa",
    },
    // Alternativa à carteira analítica: ligar a taxa a uma conta de desembolso
    // (dinheiro REAL). walletId e accountId são mutuamente exclusivos.
    accountId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "Conta de desembolso (accounts.purpose DESEMBOLSO/MISTO) da taxa",
    },
});
