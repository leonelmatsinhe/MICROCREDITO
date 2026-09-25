"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.UserModel = db_1.db.define("user", {
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
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    updatedPassword: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    phone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    userRole: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "0=Super Admin, 1=Admin, 2=Operador, 3=Gestor de Crédito, 4=Parceiro Financiador",
    },
    walletId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "Carteira de financiamento do parceiro (obrigatório quando userRole = 4)",
    },
    is_parceiro: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Parceiro financiador externo com acesso ao portal do financiador",
    },
    credentialsSent: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
    },
    credentialsSentAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
});
