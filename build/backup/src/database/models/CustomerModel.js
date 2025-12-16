"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.CustomerModel = db_1.db.define("customers", {
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
    },
    customerName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerEmail: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerNuit: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerPhone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerNationalId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerDateOfBirth: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerMonthlySalary: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerAddress: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerProfession: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerLocalOfWork: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    maritalStatus: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerSpouseName: {
        type: sequelize_1.DataTypes.STRING,
    },
    customerSpouseContact: {
        type: sequelize_1.DataTypes.STRING,
    },
    customerEmergencyPerson: {
        type: sequelize_1.DataTypes.STRING,
    },
    customerEmergencyContact: {
        type: sequelize_1.DataTypes.STRING,
    },
    interestRateId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    customerStatus: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
});
