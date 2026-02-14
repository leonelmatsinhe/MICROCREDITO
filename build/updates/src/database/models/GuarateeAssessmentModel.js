"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuarateeAssessmentModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.GuarateeAssessmentModel = db_1.db.define("loan_guarantees", {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    loanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    guaranteeDescription: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    guaranteeFileUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    purchaseAmount: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
});
