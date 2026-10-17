import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * CAIXA CENTRAL DO DIA — registo de abertura/fecho por utilizador.
 *
 * Regras:
 *  - 1 caixa ABERTO por utilizador/dia/empresa (índice único na migration);
 *  - separa totais CASH (dinheiro físico) e BANK (electrónico/bancário);
 *  - a ABERTURA e o FECHO guardam a CONTAGEM POR DENOMINAÇÃO (notas e moedas)
 *    em `denominations_open` / `denominations_close` (JSON);
 *  - FECHADO é imutável; ao fechar o backend calcula o saldo apurado e a
 *    diferença (closing_balance_calculated nunca é devolvido ao frontend —
 *    a contagem é cega, feita pelo operador denominação a denominação);
 *  - `tipo_fechamento` classifica o fecho: NORMAL, com entrega ao cofre, com
 *    depósito bancário do excedente, ou DIVERGENCIA (quebra/sobra apurada).
 */

/** Tipos de fecho de caixa aceites (contabilidade moçambicana). */
export const CASH_CLOSING_TYPES = [
  "NORMAL",
  "ENTREGA_COFRE",
  "DEPOSITO_BANCARIO",
  "DIVERGENCIA",
] as const;

export type CashClosingType = typeof CASH_CLOSING_TYPES[number];

export const CASH_CLOSING_TYPE_LABELS: Record<string, string> = {
  NORMAL: "Fecho normal (sem divergência)",
  ENTREGA_COFRE: "Fecho com entrega do excedente ao Cofre",
  DEPOSITO_BANCARIO: "Fecho com depósito do excedente no banco",
  DIVERGENCIA: "Fecho com divergência — auto de ocorrência (conta 58)",
};
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
    comment: "Saldo inicial do caixa — sempre 0 (o caixa abre com saldo zero disponível)",
  },
  counted_open: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: "Fundo de maneio contado na abertura (memorando físico — não é saldo disponível)",
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
    comment: "fundo de maneio (counted_open) + total_cash_in − total_cash_out (cash apenas)",
  },
  difference: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: "closing_balance_informed − closing_balance_calculated",
  },
  denominations_open: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Contagem por denominação na abertura: { "1000": 3, "500": 2, ... } (notas e moedas em MZN)',
  },
  denominations_close: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Contagem por denominação no fecho (dinheiro físico contado pelo operador)',
  },
  tipo_fechamento: {
    type: DataTypes.ENUM(...CASH_CLOSING_TYPES),
    allowNull: true,
    comment: "Tipo de fecho: NORMAL, ENTREGA_COFRE, DEPOSITO_BANCARIO ou DIVERGENCIA",
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Observações do fecho (explicar divergência, etc.)",
  },
  bank_account_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Conta de destino por defeito dos pagamentos deste caixa (accounts.id)",
  },
  mode: {
    type: DataTypes.ENUM("PHYSICAL", "ELECTRONIC"),
    allowNull: false,
    defaultValue: "PHYSICAL",
    comment: "Modo do dia: caixa físico (contagem) ou electrónico (reconciliação bancária manual)",
  },
  manual_balance_start: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: "Modo ELECTRONIC: saldo inicial introduzido à mão para a conta bancária do dia",
  },
  manual_balance_end: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: "Modo ELECTRONIC: saldo final real lido no banco no momento da reconciliação",
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Modo ELECTRONIC: observações da reconciliação manual",
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
