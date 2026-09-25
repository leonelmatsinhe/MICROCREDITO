import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * RECIBO — comprovativo de pagamento do cliente, com numeração sequencial
 * legal (Autoridade Tributária de Moçambique): série + ano + sequência sem
 * saltos, por empresa. A sequência vive em `recibos_sequencia` e é reservada
 * dentro de uma transacção com SELECT ... FOR UPDATE (ver reciboService).
 */
export const ReciboModel = db.define(
  "recibo",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    numero: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "Número legal completo do recibo (ex.: REC-2026-00001)",
    },
    serie: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "REC",
    },
    sequencia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Sequência dentro da empresa/ano — sem saltos",
    },
    ano: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tranzactionId: { type: DataTypes.INTEGER, allowNull: true },
    loanId: { type: DataTypes.INTEGER, allowNull: true },
    customerId: { type: DataTypes.INTEGER, allowNull: true },
    walletId: { type: DataTypes.INTEGER, allowNull: true },
    // Dados congelados no momento da emissão (o recibo não pode "mudar" depois).
    customer_name: { type: DataTypes.STRING(255), allowNull: true },
    customer_nuit: { type: DataTypes.STRING(30), allowNull: true },
    customer_account: { type: DataTypes.STRING(60), allowNull: true },
    wallet_nome: { type: DataTypes.STRING(100), allowNull: true },
    metodo_pagamento: { type: DataTypes.STRING(30), allowNull: true },
    referencia: { type: DataTypes.STRING(100), allowNull: true },
    valor_pago: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    valor_capital: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    valor_juros: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    valor_mora: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    valor_desconto: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    saldo_restante: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    pdf_url: { type: DataTypes.STRING(255), allowNull: true },
    // ── Selo electrónico (compliance AT Moçambique) ──
    hash_at: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: "Hash SHA-256 do recibo (validação/autenticidade AT)",
    },
    qr_code_url: { type: DataTypes.STRING(255), allowNull: true, comment: "Caminho público do PNG do QR Code" },
    qr_content: { type: DataTypes.TEXT, allowNull: true, comment: "Conteúdo codificado no QR Code" },
    at_validation_code: { type: DataTypes.STRING(50), allowNull: true, comment: "Código de validação legível (AT-AAAA-00001)" },
    software_certification: { type: DataTypes.STRING(100), allowNull: true },
    metodo_pagamento_desc: { type: DataTypes.STRING(100), allowNull: true, comment: "Método legível (ex.: Numerário — Caixa Central)" },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "recibos",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { unique: true, fields: ["companyId", "ano", "sequencia"] },
      { unique: true, fields: ["numero"] },
    ],
  }
);

/**
 * CONTADOR DE SEQUÊNCIA DOS RECIBOS — uma linha por empresa/ano.
 * Reservado com SELECT ... FOR UPDATE para garantir numeração sem saltos.
 */
export const ReciboSequenciaModel = db.define(
  "recibos_sequencia",
  {
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    ano: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    ultima_sequencia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "recibos_sequencia",
    timestamps: false,
  }
);
