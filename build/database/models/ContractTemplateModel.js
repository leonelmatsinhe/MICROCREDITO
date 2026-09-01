"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractTemplateModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.ContractTemplateModel = db_1.db.define("contract_templates", {
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
    type: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        // "contract" | "commitment_term" | "guarantee_declaration"
    },
    subject: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        // Assunto do documento (ex: "CONTRATO DE CONCESSÃO DE EMPRÉSTIMO")
    },
    content: {
        type: sequelize_1.DataTypes.TEXT("long"),
        allowNull: false,
        // Conteúdo HTML do template com variáveis {{variavel}}
    },
    variables: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        // JSON com lista de variáveis disponíveis ex: ["customerName","loanAmount",...]
    },
    isDefault: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        // 0 = template personalizado, 1 = template padrão do sistema
    },
    status: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        // 1 = activo, 0 = inactivo
    },
});
