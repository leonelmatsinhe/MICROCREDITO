"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsGatewayInboxModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.SmsGatewayInboxModel = db_1.db.define("sms_gateway_inbox", {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    deviceId: {
        type: sequelize_1.DataTypes.STRING(120),
        allowNull: false,
    },
    senderPhone: {
        type: sequelize_1.DataTypes.STRING(30),
        allowNull: true,
    },
    receiverPhone: {
        type: sequelize_1.DataTypes.STRING(30),
        allowNull: true,
    },
    messageBody: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    receivedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    contentHash: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: false,
        unique: true,
    },
}, {
    tableName: "sms_gateway_inbox",
    freezeTableName: true,
});
