import { DataTypes } from "sequelize";
import { db } from "../db";

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
export const FinancingWalletModel = db.define(
  "financing_wallet",
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
    codigo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "Código curto da carteira (KMAD, PME_12, COM_9, INT_8, INT_10)",
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tipo: {
      type: DataTypes.ENUM("FINANCIAMENTO"),
      allowNull: false,
      defaultValue: "FINANCIAMENTO",
    },
    parceiro_nome: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Nome do parceiro financiador externo (ex.: KMAD). NULL = fundo interno",
    },
    is_parceiro_externo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    parceiro_email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    parceiro_nuit: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    parceiro_contacto: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    allocated_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Capital alocado (analítico) ao fundo. NULL = sem limite definido",
    },
    initial_disbursed_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Desembolsado anterior à criação da carteira (base histórica analítica, ex.: 660.000 KMAD)",
    },
    taxa_juro: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: true,
      comment: "Taxa de juro esperada desta carteira (ex.: 0.12 = 12%)",
    },
    cor_badge: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "blue",
    },
    is_ativa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    tem_portal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Se true, o parceiro externo pode ter acesso ao portal do financiador",
    },
    portal_ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "financing_wallets",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ unique: true, fields: ["companyId", "codigo"] }],
  }
);
