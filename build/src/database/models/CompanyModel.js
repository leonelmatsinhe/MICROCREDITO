"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.CompanyModel = db_1.db.define("companies", {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
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
    contractHideInsuranceClause: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Oculta a cláusula VIGÉSIMA PRIMEIRA (seguro/garantias) no contrato de concessão (1 = ocultar, 0 = mostrar).',
    },
    // ── Fluxo de subscrição (cadastro público + aprovação do Super Admin) ──
    approval_status: {
        type: sequelize_1.DataTypes.ENUM('PENDENTE', 'APROVADA', 'REJEITADA', 'SUSPENSA'),
        allowNull: false,
        defaultValue: 'PENDENTE',
    },
    nuit: { type: sequelize_1.DataTypes.STRING(20), allowNull: true },
    phone: { type: sequelize_1.DataTypes.STRING(20), allowNull: true },
    email: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    license_number: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    plan: {
        type: sequelize_1.DataTypes.ENUM('STARTER', 'CRESCIMENTO', 'PROFISSIONAL'),
        allowNull: false,
        defaultValue: 'CRESCIMENTO',
    },
    plan_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    requested_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    approved_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    approved_by: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    rejection_reason: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
}, {
    tableName: "companies",
    freezeTableName: true,
});
