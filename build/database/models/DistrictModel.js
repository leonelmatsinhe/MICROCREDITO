"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistrictModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.DistrictModel = db_1.db.define("districts", {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    provinceId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
});
