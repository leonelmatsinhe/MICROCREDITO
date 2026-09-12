import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * CAIXA CENTRAL DO DIA — registo de abertura/fecho por utilizador.
 *
 * Regras:
 *  - 1 caixa ABERTO por utilizador/dia/empresa (índice único na migration);
 *  - separa totais CASH (dinheiro físico) e BANK (electrónico/bancário);
 *  - FECHADO é imutável; ao fechar calcula closing_balance_calculated e
 *    difference no backend (o frontend nunca decide divergência).
 */
export const CashRegisterModel = db.define("cash_registers", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Empresa a que o caixa pertence",
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Utilizador responsável pelo caixa (quem abriu)",
  },
  opening_date: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: "Dia do caixa (YYYY-MM-DD) — base do índice único por dia",
  },
  opening_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Momento exacto da abertura",
  },
  closing_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Momento exacto do fecho",
  },
  opening_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Fundo de troco em dinheiro físico na abertura",
  },
  total_in: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Soma de TODAS as entradas (cash + bank)",
  },
  total_out: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Soma de TODAS as saídas (cash + bank)",
  },
  total_cash_in: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Entradas com payment_method = CASH",
  },
  total_cash_out: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Saídas com payment_method = CASH",
  },
  total_bank_in: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Entradas electrónicas (BANK/MPESA/EMOLA)",
  },
  total_bank_out: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Saídas electrónicas (BANK/MPESA/EMOLA)",
  },
  status: {
    type: DataTypes.ENUM("ABERTO", "FECHADO"),
    allowNull: false,
    defaultValue: "ABERTO",
  },
  closing_balance_informed: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: "Valor contado em dinheiro físico no fecho",
  },
  closing_balance_calculated: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: "opening_balance + total_cash_in − total_cash_out (cash apenas)",
  },
  difference: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: "closing_balance_informed − closing_balance_calculated",
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Observações do fecho (explicar divergência, etc.)",
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  closedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: "cash_registers",
  freezeTableName: true,
});
