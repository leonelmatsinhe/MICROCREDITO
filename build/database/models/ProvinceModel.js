"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvinceModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.ProvinceModel = db_1.db.define("provinces", {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
});
