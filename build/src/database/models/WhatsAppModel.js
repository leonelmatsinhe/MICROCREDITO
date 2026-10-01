"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.WhatsAppModel = db_1.db.define("whatsapp_messages", {
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
    phone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    accountNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    customerName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    messageType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    messageBody: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        defaultValue: "queued",
    },
    direction: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        defaultValue: "outbound",
    },
    payloadJson: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
});
