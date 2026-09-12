import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * Finalidades da conta bancária — usadas para filtrar as opções nos forms
 * (REEMBOLSO para pagamentos, DESEMBOLSO para desembolsos, MISTO para ambos).
 */
export const ACCOUNT_PURPOSES = ["REEMBOLSO", "DESEMBOLSO", "MISTO", "TAXAS", "RESERVA"] as const;

/**
 * Tipos de carteira: banco tradicional, gaveta de dinheiro físico,
 * mobile money (M-Pesa/e-Mola) e carteiras electrónicas.
 */
export const ACCOUNT_TYPES = ["BANCO", "CAIXA_FISICO", "MOBILE_MONEY", "EWALLET"] as const;

/**
 * CARTEIRA REAL DA EMPRESA — contas bancárias (FNB, BCI, BIM, Moza, ...),
 * mobile money e caixa físico, cada uma com SALDO REAL.
 *
 * Refactor (migration ALTER, sem DROP): as colunas originais
 * (accountNumber/accountDescription/accountHolder) continuam a servir os
 * contratos; as novas colunas gerem a tesouraria:
 *  - balance: saldo real actual, alterado APENAS pelo treasuryService;
 *  - purpose/type/is_active/is_default_*: selecção nos forms e regras;
 *  - bank_name/bank_code/currency: identificação do banco.
 */
export const AccountModel = db.define("accounts", {
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
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Número da conta / IBAN / número do telefone (mobile money)",
  },
  accountDescription: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  accountHolder: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // ── Colunas novas do Caixa Central (ver migration) ──
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: "",
    comment: "Nome do banco (FNB, BCI, BIM, Moza, ...) ou operador (M-Pesa, e-Mola)",
  },
  bank_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: "Código SWIFT/ABI do banco",
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Saldo real actual — gerido pelo treasuryService",
  },
  initial_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0,
    comment: "Saldo de partida quando a conta foi registada",
  },
  purpose: {
    type: DataTypes.ENUM(...ACCOUNT_PURPOSES),
    allowNull: false,
    defaultValue: "MISTO",
  },
  type: {
    type: DataTypes.ENUM(...ACCOUNT_TYPES),
    allowNull: false,
    defaultValue: "BANCO",
  },
  is_default_reembolso: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "Conta pré-seleccionada para receber reembolsos (pagamentos)",
  },
  is_default_desembolso: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "Conta pré-seleccionada para desembolsos",
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: "MZN",
  },
  // ── Auditoria ──
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: "accounts",
  freezeTableName: true,
});
