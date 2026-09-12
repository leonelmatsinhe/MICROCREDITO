import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * Categorias de movimento do Caixa Central.
 *  - Automáticas: DESEMBOLSO (saída), REEMBOLSO / JUROS_MORA / TAXA_ADMIN (entradas).
 *  - Bancárias: DEPOSITO_BANCO / LEVANTAMENTO_BANCO / TRANSFERENCIA.
 *  - Manuais: despesas correntes do escritório.
 */
export const CASH_CATEGORIES = [
  "DESEMBOLSO",
  "REEMBOLSO",
  "JUROS_MORA",
  "TAXA_ADMIN",
  "DEPOSITO_BANCO",
  "LEVANTAMENTO_BANCO",
  "TRANSFERENCIA",
  "INTERNET",
  "LUZ",
  "AGUA",
  "COMBUSTIVEL",
  "RENTABILIDADE",
  "SALARIOS",
  "SALARIO",
  "REUNIAO",
  "TRANSPORTE",
  "MATERIAL",
  "OUTROS",
] as const;

/**
 * Métodos de pagamento suportados. MPESA/EMOLA movem contas do tipo
 * MOBILE_MONEY e são tratados como "electrónico" (totais bank_*).
 */
export const CASH_PAYMENT_METHODS = ["CASH", "BANK", "MPESA", "EMOLA"] as const;

export type CashType = "ENTRADA" | "SAIDA";
export type CashPaymentMethod = typeof CASH_PAYMENT_METHODS[number];

/**
 * CAIXA CENTRAL — movimentos do dia (entradas e saídas).
 * CASH = dinheiro físico da gaveta; BANK/MPESA/EMOLA = dinheiro electrónico
 * (geram também a contrapartida em bank_transactions + saldo da conta).
 */
export const CashMovementModel = db.define("cash_movements", {
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
  cashRegisterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Caixa ao qual o movimento pertence",
  },
  bankAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Obrigatório quando paymentMethod ≠ CASH — conta movimentada",
  },
  type: {
    type: DataTypes.ENUM("ENTRADA", "SAIDA"),
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.ENUM(...CASH_PAYMENT_METHODS),
    allowNull: false,
    defaultValue: "CASH",
  },
  category: {
    type: DataTypes.ENUM(...CASH_CATEGORIES),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: "Valor do movimento (sempre positivo)",
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: "Descrição obrigatória (ex.: conta 1024 — 3ª prestação)",
  },
  // Rastreabilidade de movimentos automáticos (nulos nos manuais)
  loanId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  amortizationLoanId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  tranzactionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  referenceType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: "Tabela de origem (ex.: customer_loans)",
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "id na tabela de origem",
  },
  isAutomatic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "true = criado pelo sistema; false = manual",
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: "cash_movements",
  freezeTableName: true,
});
