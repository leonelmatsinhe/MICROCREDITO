"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.CompanyModel = db_1.db.define("company", {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    companyName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    companyEmail: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    companyWebsite: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    companyManager: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    smsSender: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    companyNuit: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    companyPhone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    districtId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    provinceId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    companyAddress: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    companyLogo: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        defaultValue: '',
    },
    forfeit: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    companyStatus: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    paymentMethods: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        defaultValue: '1:Numerário,2:Cheque,3:Transferência Bancária,4:Depósito Bancário,7:M-Pesa',
        comment: 'Meios de pagamento separados por vírgula: id:nome,id:nome',
    },
    smsEnabled: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Autorização de envio de SMS (1 = activado, 0 = desactivado). Apenas o Admin altera.',
    },
});
