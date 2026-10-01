"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancingWalletModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
/**
 * CARTEIRA DE FINANCIAMENTO (dinheiro ANALÍTICO).
 *
 * Duas camadas de dinheiro convivem no sistema:
 *  - REAL (físico): tabela `accounts` (purpose DESEMBOLSO/REEMBOLSO) — é de lá
 *    que sai o dinheiro efectivamente entregue ao cliente.
 *  - ANALÍTICO: esta tabela — valores base para análise e para separar o
 *    relatório de cada parceiro financiador (ex.: KMAD). NÃO guarda dinheiro
 *    real: serve apenas para acompanhar o capital alocado/desembolsado por
 *    fundo e para isolar a informação que cada financiador pode ver.
 *
 * Regra: apenas carteiras do tipo FINANCIAMENTO. Carteiras de reembolso não
 * existem aqui (o reembolso é a tesouraria real em `accounts`).
 */
exports.FinancingWalletModel = db_1.db.define("financing_wallet", {
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
    codigo: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        comment: "Código curto da carteira (KMAD, PME_12, COM_9, INT_8, INT_10)",
    },
    nome: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    descricao: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    tipo: {
        type: sequelize_1.DataTypes.ENUM("FINANCIAMENTO"),
        allowNull: false,
        defaultValue: "FINANCIAMENTO",
    },
    parceiro_nome: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
        comment: "Nome do parceiro financiador externo (ex.: KMAD). NULL = fundo interno",
    },
    is_parceiro_externo: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    parceiro_email: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    parceiro_nuit: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
    },
    parceiro_contacto: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
    },
    allocated_amount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: "Capital alocado (analítico) ao fundo. NULL = sem limite definido",
    },
    initial_disbursed_amount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Desembolsado anterior à criação da carteira (base histórica analítica, ex.: 660.000 KMAD)",
    },
    taxa_juro: {
        type: sequelize_1.DataTypes.DECIMAL(8, 4),
        allowNull: true,
        comment: "Taxa de juro esperada desta carteira (ex.: 0.12 = 12%)",
    },
    cor_badge: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "blue",
    },
    is_ativa: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    tem_portal: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Se true, o parceiro externo pode ter acesso ao portal do financiador",
    },
    portal_ativo: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    created_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: "financing_wallets",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ unique: true, fields: ["companyId", "codigo"] }],
});
