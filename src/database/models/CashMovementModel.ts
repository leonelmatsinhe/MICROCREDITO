import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * Categorias de movimento do Caixa Central.
 *  - Automáticas: DESEMBOLSO (saída), REEMBOLSO / JUROS_MORA / TAXA_ADMIN (entradas).
 *  - Oficiais de tesouraria (contabilidade moçambicana — NÃO usar termos como
 *    "sangria"/"suprimento"):
 *      · ENTREGA_COFRE      — entrega do excedente do operador ao Cofre Central /
 *                             Tesoureiro, com comprovativo assinado (saída da gaveta);
 *      · REFORCO_CAIXA      — requisição de fundo de maneio do Cofre para o guichê
 *                             (entrada de dinheiro físico na gaveta);
 *      · DEPOSITO_BANCARIO  — guia de depósito do excedente no banco
 *                             (M-Pesa/BCI), com o numerário a sair da gaveta;
 *      · DIFERENCA_CAIXA    — auto de ocorrência de quebra (falta) ou sobra de
 *                             caixa apurada no fecho, a justificar pelo Admin e a
 *                             lançar na conta 58x — Quebras de Caixa.
 *  - Bancárias: DEPOSITO_BANCO / LEVANTAMENTO_BANCO / TRANSFERENCIA.
 *  - Manuais: despesas correntes do escritório.
 */
export const CASH_CATEGORIES = [
  "DESEMBOLSO",
  "REEMBOLSO",
  "JUROS_MORA",
  "TAXA_ADMIN",
  "ENTREGA_COFRE",
  "REFORCO_CAIXA",
  "DEPOSITO_BANCARIO",
  "DIFERENCA_CAIXA",
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

/**
 * TIPOS OFICIAIS DE MOVIMENTO DE TESOURARIA — direcção de dinheiro na gaveta.
 *  - ENTREGA_COFRE / DEPOSITO_BANCARIO retiram dinheiro físico da gaveta;
 *  - REFORCO_CAIXA coloca fundo de maneio na gaveta;
 *  - DIFERENCA_CAIXA regulariza a quebra (saída) ou a sobra (entrada) do fecho.
 */
export const CASH_TREASURY_CATEGORIES = [
  "ENTREGA_COFRE",
  "REFORCO_CAIXA",
  "DEPOSITO_BANCARIO",
  "DIFERENCA_CAIXA",
] as const;

/**
 * Categorias que RETIRAM numerário da gaveta — servem para cumprir o limite
 * de numerário em caixa (entrega ao cofre / depósito bancário) e para o
 * mapa diário de caixa (linha "Entregas ao Cofre").
 */
export const CASH_DRAWER_OUT_CATEGORIES = [
  "ENTREGA_COFRE",
  "DEPOSITO_BANCARIO",
  "DEPOSITO_BANCO",
] as const;

/**
 * Categorias ISENTAS do limite de numerário em caixa: são elas próprias a
 * regularização da gaveta (entrega/depósito) ou um auto de ocorrência do
 * fecho — bloquear estas seria impedir o cumprimento da circular do BM.
 */
export const CASH_LIMIT_EXEMPT_CATEGORIES = [
  "ENTREGA_COFRE",
  "REFORCO_CAIXA",
  "DEPOSITO_BANCARIO",
  "DEPOSITO_BANCO",
  "DIFERENCA_CAIXA",
  "TRANSFERENCIA",
] as const;

export type CashType = "ENTRADA" | "SAIDA";
export type CashPaymentMethod = typeof CASH_PAYMENT_METHODS[number];

/**
 * CAIXA CENTRAL — movimentos do dia (entradas e saídas).
 * CASH = dinheiro físico da gaveta; BANK/MPESA/EMOLA = dinheiro electrónico
 * (geram também a contrapartida em bank_transactions + saldo da conta).
 */
/**
 * Etiquetas em português de Moçambique para as categorias oficiais — usadas
 * nos documentos (mapa de caixa, extractos) e nos avisos ao operador.
 */
export const CASH_CATEGORY_LABELS: Record<string, string> = {
  DESEMBOLSO: "Desembolso",
  REEMBOLSO: "Reembolso",
  JUROS_MORA: "Juros de mora",
  TAXA_ADMIN: "Taxa administrativa",
  ENTREGA_COFRE: "Entrega ao Cofre",
  REFORCO_CAIXA: "Reforço de caixa",
  DEPOSITO_BANCARIO: "Depósito bancário",
  DIFERENCA_CAIXA: "Diferença de caixa",
  DEPOSITO_BANCO: "Depósito no banco",
  LEVANTAMENTO_BANCO: "Levantamento no banco",
  TRANSFERENCIA: "Transferência",
  INTERNET: "Internet",
  LUZ: "Luz",
  AGUA: "Água",
  COMBUSTIVEL: "Combustível",
  RENTABILIDADE: "Rentabilidade",
  SALARIOS: "Salários",
  SALARIO: "Salário",
  REUNIAO: "Reunião",
  TRANSPORTE: "Transporte",
  MATERIAL: "Material",
  OUTROS: "Outros",
};

export type CashMovementType = "ENTRADA" | "SAIDA";

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
