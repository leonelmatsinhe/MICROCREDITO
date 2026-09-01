"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.SmsModel = db_1.db.define("sms", {
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
    receipient: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    accountNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    smsBody: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
});
