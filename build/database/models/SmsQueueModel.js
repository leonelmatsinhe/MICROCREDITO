"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsQueueModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.SmsQueueModel = db_1.db.define("sms_queue", {
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
        allowNull: true,
    },
    loanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    amortizationLoanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    transactionId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    debtId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    customerName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    phone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
    },
    messageType: {
        type: sequelize_1.DataTypes.STRING(60),
        allowNull: false,
    },
    messageBody: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    payloadJson: {
        type: sequelize_1.DataTypes.TEXT("long"),
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "queued",
    },
    retries: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    gatewayMessageId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    errorMessage: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    sentAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    lastAttemptAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: "sms_queue",
    freezeTableName: true,
});
