"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReciboSequenciaModel = exports.ReciboModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
/**
 * RECIBO — comprovativo de pagamento do cliente, com numeração sequencial
 * legal (Autoridade Tributária de Moçambique): série + ano + sequência sem
 * saltos, por empresa. A sequência vive em `recibos_sequencia` e é reservada
 * dentro de uma transacção com SELECT ... FOR UPDATE (ver reciboService).
 */
exports.ReciboModel = db_1.db.define("recibo", {
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
    numero: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        comment: "Número legal completo do recibo (ex.: REC-2026-00001)",
    },
    serie: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "REC",
    },
    sequencia: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "Sequência dentro da empresa/ano — sem saltos",
    },
    ano: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    tranzactionId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    loanId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    customerId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    walletId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    // Dados congelados no momento da emissão (o recibo não pode "mudar" depois).
    customer_name: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    customer_nuit: { type: sequelize_1.DataTypes.STRING(30), allowNull: true },
    customer_account: { type: sequelize_1.DataTypes.STRING(60), allowNull: true },
    wallet_nome: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    metodo_pagamento: { type: sequelize_1.DataTypes.STRING(30), allowNull: true },
    referencia: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    valor_pago: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    valor_capital: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    valor_juros: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    valor_mora: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    valor_desconto: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    saldo_restante: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    pdf_url: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    // Ciclo de vida legal: EMITIDO (default BD) → ANULADO (no estorno do
    // pagamento). O recibo nunca é apagado — mantém-se para trilha de auditoria.
    status: { type: sequelize_1.DataTypes.STRING(20), allowNull: false, defaultValue: "EMITIDO" },
    annulled_by_recibo_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    annulment_reason: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    // ── Selo electrónico (compliance AT Moçambique) ──
    hash_at: {
        type: sequelize_1.DataTypes.STRING(128),
        allowNull: true,
        comment: "Hash SHA-256 do recibo (validação/autenticidade AT)",
    },
    qr_code_url: { type: sequelize_1.DataTypes.STRING(255), allowNull: true, comment: "Caminho público do PNG do QR Code" },
    qr_content: { type: sequelize_1.DataTypes.TEXT, allowNull: true, comment: "Conteúdo codificado no QR Code" },
    at_validation_code: { type: sequelize_1.DataTypes.STRING(50), allowNull: true, comment: "Código de validação legível (AT-AAAA-00001)" },
    software_certification: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    metodo_pagamento_desc: { type: sequelize_1.DataTypes.STRING(100), allowNull: true, comment: "Método legível (ex.: Numerário — Caixa Central)" },
    created_by: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
}, {
    tableName: "recibos",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { unique: true, fields: ["companyId", "ano", "sequencia"] },
        { unique: true, fields: ["numero"] },
    ],
});
/**
 * CONTADOR DE SEQUÊNCIA DOS RECIBOS — uma linha por empresa/ano.
 * Reservado com SELECT ... FOR UPDATE para garantir numeração sem saltos.
 */
exports.ReciboSequenciaModel = db_1.db.define("recibos_sequencia", {
    companyId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    ano: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    ultima_sequencia: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: "recibos_sequencia",
    timestamps: false,
});
