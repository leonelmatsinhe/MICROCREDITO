import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * Categorias do extrato bancário real (bank_transactions).
 * Cada movimento não-CASH do caixa gera aqui a contrapartida por conta.
 */
export const BANK_TX_CATEGORIES = [
  "REEMBOLSO_BANCO",
  "DESEMBOLSO_BANCO",
  "DEPOSITO_CAIXA",
  "LEVANTAMENTO_BANCO",
  "TAXA_BANCARIA",
  "ESTORNO",
  "OUTROS",
] as const;

export type BankTxCategory = typeof BANK_TX_CATEGORIES[number];

/**
 * TESOURARIA — extrato real de cada conta bancária.
 * Cada linha guarda balance_after: o saldo da conta APÓS a operação,
 * permitindo reconstruir o extrato exacto como no banco.
 */
export const BankTransactionModel = db.define("bank_transactions", {
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
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Conta bancária (accounts) movimentada",
  },
  cashRegisterId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Caixa do dia que originou o movimento (null para ajustes)",
  },
  type: {
    type: DataTypes.ENUM("ENTRADA", "SAIDA"),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(...BANK_TX_CATEGORIES),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: "Valor da operação (sempre positivo)",
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Saldo da conta após esta operação",
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  referenceType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: "Tabela de origem (ex.: customer_loans, amortization_loans)",
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: "bank_transactions",
  freezeTableName: true,
});
