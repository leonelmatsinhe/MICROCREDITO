import { DataTypes } from "sequelize";
import { db } from "../db";

const common = { timestamps: false, freezeTableName: true } as const;

export const MicrocreditClientModel = db.define("microcredit_client", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  nome: { type: DataTypes.STRING(255), allowNull: false },
  tipo_doc: { type: DataTypes.STRING(40), allowNull: true },
  numero_doc: { type: DataTypes.STRING(100), allowNull: true },
  data_nascimento: { type: DataTypes.DATEONLY, allowNull: true },
  sexo: { type: DataTypes.ENUM("Homem", "Mulher", "Outro"), allowNull: false, defaultValue: "Outro" },
  telefone: { type: DataTypes.STRING(40), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  endereco: { type: DataTypes.STRING(255), allowNull: true },
  provincia: { type: DataTypes.STRING(100), allowNull: true },
  distrito: { type: DataTypes.STRING(100), allowNull: true },
  bairro: { type: DataTypes.STRING(100), allowNull: true },
  sector_actividade: { type: DataTypes.ENUM("Comércio", "Agricultura", "Pecuária", "Indústria", "Serviços", "Consumo", "Outros"), allowNull: false, defaultValue: "Outros" },
  estado: { type: DataTypes.ENUM("Activo", "Inactivo"), allowNull: false, defaultValue: "Activo" },
  data_registo: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
}, { ...common, tableName: "clientes_microcredito" });

export const MicrocreditLoanModel = db.define("microcredit_loan", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  cliente_id: { type: DataTypes.INTEGER, allowNull: false },
  codigo: { type: DataTypes.STRING(40), allowNull: false },
  montante_capital: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  taxa_juro_mensal: { type: DataTypes.DECIMAL(8, 4), allowNull: false },
  prazo_meses: { type: DataTypes.INTEGER, allowNull: false },
  data_concessao: { type: DataTypes.DATEONLY, allowNull: false },
  data_vencimento: { type: DataTypes.DATEONLY, allowNull: false },
  sector_finalidade: { type: DataTypes.STRING(40), allowNull: false },
  estado: { type: DataTypes.STRING(20), allowNull: false },
  capital_em_divida: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  juro_em_divida: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  total_em_divida: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  juros_total: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  capital_abatido: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  juro_abatido: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  data_abatimento: { type: DataTypes.DATEONLY, allowNull: true },
  dias_atraso: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  classe_risco: { type: DataTypes.ENUM("I", "II", "III", "IV"), allowNull: true },
  data_ultimo_pagamento: { type: DataTypes.DATEONLY, allowNull: true },
  agente_id: { type: DataTypes.INTEGER, allowNull: true },
}, { ...common, tableName: "creditos" });

export const MicrocreditInstallmentModel = db.define("microcredit_installment", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  credito_id: { type: DataTypes.INTEGER, allowNull: false },
  numero_prestacao: { type: DataTypes.INTEGER, allowNull: false },
  data_vencimento: { type: DataTypes.DATEONLY, allowNull: false },
  capital_previsto: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  juro_previsto: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  total_previsto: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  data_pagamento: { type: DataTypes.DATEONLY, allowNull: true },
  capital_pago: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  juro_pago: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  total_pago: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  forma: { type: DataTypes.STRING(20), allowNull: true },
  estado: { type: DataTypes.STRING(20), allowNull: false },
  dias_atraso: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { ...common, tableName: "pagamentos_credito" });

export const MicrocreditPaymentEventModel = db.define("microcredit_payment_event", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  credito_id: { type: DataTypes.INTEGER, allowNull: false },
  prestacao_id: { type: DataTypes.INTEGER, allowNull: false },
  data_pagamento: { type: DataTypes.DATEONLY, allowNull: false },
  capital_pago: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  juro_pago: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  forma: { type: DataTypes.STRING(20), allowNull: false },
  registado_por: { type: DataTypes.INTEGER, allowNull: true },
}, { ...common, tableName: "microcredit_payment_events" });

export const MicrocreditFundingModel = db.define("microcredit_funding", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING(32), allowNull: false },
  descricao: { type: DataTypes.STRING(255), allowNull: false },
  montante: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  data_entrada: { type: DataTypes.DATEONLY, allowNull: false },
  origem: { type: DataTypes.STRING(255), allowNull: true },
  categoria_periodo: { type: DataTypes.STRING(32), allowNull: true },
}, { ...common, tableName: "fontes_financiamento" });

export const MicrocreditMovementModel = db.define("microcredit_movement", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING(32), allowNull: false },
  mes: { type: DataTypes.TINYINT, allowNull: false },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  montante: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
}, { ...common, tableName: "movimentos_financeiros_operador" });

export const MicrocreditConfigModel = db.define("microcredit_config", {
  tenant_id: { type: DataTypes.INTEGER, primaryKey: true },
  taxa_juro_min: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
  taxa_juro_max: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
  prazo_min: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  prazo_max: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 6 },
  capital_inicial: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  capital_actual: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
}, { ...common, tableName: "config_microcredito" });