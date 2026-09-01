"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.LogsModel = db_1.db.define("user_logs", {
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
    description: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    userName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    userRole: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    action: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    module: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    ipAddress: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
});
