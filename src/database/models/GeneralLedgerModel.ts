import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * PLANO GERAL DE CONTAS PARA MICROFINANÇAS (PGC-Microfinanças / Moçambique)
 * -----------------------------------------------------------------------
 * Classe 1: Meios Financeiros Líquidos (Caixa, Cofre, Bancos, Carteiras Móveis)
 * Classe 2: Créditos Concedidos a Clientes (Capital Corrente, Vencido)
 * Classe 3: Capital Próprio e Reservas
 * Classe 4/5: Financiamentos Obtidos e Regularizações (Quebras/Sobras 58)
 * Classe 6: Custos e Perdas (FSE, Salários, Quebras)
 * Classe 7: Proveitos e Ganhos (Juros de Crédito, Comissões/Taxas, Mora)
 */
export const PGC_ACCOUNTS: Record<string, { code: string; name: string; classType: "ACTIVO" | "PASSIVO" | "CAPITAL" | "CUSTO" | "PROVEITO" }> = {
  "11.0": { code: "11.0", name: "Caixa de Balcão (Guichê)", classType: "ACTIVO" },
  "11.1": { code: "11.1", name: "Cofre Central (Tesouraria)", classType: "ACTIVO" },
  "12.1": { code: "12.1", name: "Bancos — Depósitos à Ordem", classType: "ACTIVO" },
  "13.1": { code: "13.1", name: "Carteiras Móveis (M-Pesa / e-Mola)", classType: "ACTIVO" },
  "21.1": { code: "21.1", name: "Créditos Concedidos — Carteira Corrente", classType: "ACTIVO" },
  "21.2": { code: "21.2", name: "Créditos Concedidos — Carteira Vencida (PAR)", classType: "ACTIVO" },
  "29.1": { code: "29.1", name: "Provisões Acumuladas para Crédito Malparado", classType: "ACTIVO" },
  "31.1": { code: "31.1", name: "Capital Social / Fundo Próprio Inicial", classType: "CAPITAL" },
  "41.1": { code: "41.1", name: "Linhas de Financiamento de Parceiros", classType: "PASSIVO" },
  "58.1": { code: "58.1", name: "Regularizações de Caixa (Quebras e Sobras)", classType: "CUSTO" },
  "62.1": { code: "62.1", name: "Fornecimentos e Serviços (Água, Luz, Internet)", classType: "CUSTO" },
  "62.2": { code: "62.2", name: "Combustível e Transporte", classType: "CUSTO" },
  "62.3": { code: "62.3", name: "Material de Escritório e Consumíveis", classType: "CUSTO" },
  "63.1": { code: "63.1", name: "Gastos com Pessoal — Salários", classType: "CUSTO" },
  "68.1": { code: "68.1", name: "Outros Custos Operacionais (Quebras de Caixa)", classType: "CUSTO" },
  "71.1": { code: "71.1", name: "Proveitos de Juros de Empréstimos", classType: "PROVEITO" },
  "72.1": { code: "72.1", name: "Comissões e Taxas Administrativas", classType: "PROVEITO" },
  "73.1": { code: "73.1", name: "Juros de Mora e Penalizações", classType: "PROVEITO" },
  "78.1": { code: "78.1", name: "Outros Proveitos Operacionais (Sobras de Caixa)", classType: "PROVEITO" },
};

/** Cabeçalho do Lançamento no Diário Contabilístico */
export const GeneralLedgerEntryModel = db.define("general_ledger_entries", {
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
  entry_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: "Número sequencial anual do lançamento (ex: LAN-2026-00001)",
  },
  entry_date: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: "Data do lançamento (YYYY-MM-DD)",
  },
  event_type: {
    type: DataTypes.ENUM(
      "DESEMBOLSO",
      "REEMBOLSO",
      "TAXA_ADMIN",
      "DESPESA",
      "TRANSFERENCIA",
      "REFORCO",
      "ENTREGA_COFRE",
      "QUEBRA_CAIXA",
      "SOBRA_CAIXA",
      "AJUSTE"
    ),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  reference_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: "general_ledger_entries",
  freezeTableName: true,
  timestamps: true,
});

/** Linhas de Débito e Crédito do Lançamento */
export const GeneralLedgerLineModel = db.define("general_ledger_lines", {
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
  entry_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  account_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  account_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  debit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  credit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: "general_ledger_lines",
  freezeTableName: true,
  timestamps: true,
});

GeneralLedgerEntryModel.hasMany(GeneralLedgerLineModel, { foreignKey: "entry_id", as: "lines" });
GeneralLedgerLineModel.belongsTo(GeneralLedgerEntryModel, { foreignKey: "entry_id", as: "entry" });
