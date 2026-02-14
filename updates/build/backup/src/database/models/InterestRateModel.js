"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterestRateModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.InterestRateModel = db_1.db.define("interest_rates", {
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
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    tax: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
    administrativeFee: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
    },
});
