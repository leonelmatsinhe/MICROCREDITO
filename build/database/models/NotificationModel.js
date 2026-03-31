"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.NotificationModel = db_1.db.define("notifications", {
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
    recipientType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        // "admin" | "gestor" | "customer"
    },
    recipientId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        // "loan_request" | "loan_approved" | "loan_rejected" | "payment_received" |
        // "installment_due" | "installment_overdue" | "loan_disbursed" | "general"
    },
    referenceId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    isRead: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
});
