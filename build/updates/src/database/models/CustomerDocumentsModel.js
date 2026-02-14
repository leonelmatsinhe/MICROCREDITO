"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerDocumentsModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.CustomerDocumentsModel = db_1.db.define("customer_documents", {
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
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    documentName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    documentFileUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    uploadedBy: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
});
