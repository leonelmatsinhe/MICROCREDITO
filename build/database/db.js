"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const sequelize_1 = require("sequelize");
exports.db = new sequelize_1.Sequelize(process.env.DATABASE_NAME + '', process.env.DATABASE_USER + '', process.env.DATABASE_PASS, {
    dialect: "mysql",
    host: process.env.DATABASE_HOST,
    port: 3306,
    logging: false,
});
