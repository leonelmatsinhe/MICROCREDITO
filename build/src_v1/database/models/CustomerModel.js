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
        allowNull: false,
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    sex: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    customerEmail: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerNuit: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerPhone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerNationalId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    issuedAt: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    localOfIssue: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerDateOfBirth: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerMonthlySalary: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerAddress: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerBairro: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerProfession: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerLocalOfWork: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
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
    passportPhotoUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    customerStatus: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
});
