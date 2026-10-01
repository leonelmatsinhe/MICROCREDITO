import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * MODELS DO MÓDULO DE PAGAMENTOS V2 (core bancário).
 * Migrações correspondentes: migratePaymentsV2 em src/migrations/index.ts.
 */

/**
 * IDEMPOTENCY_KEYS — garantia "no duplicate" no POST de pagamento.
 * O cliente envia o header `Idempotency-Key` (UUID gerado ao abrir o modal).
 * Se a chave já existir, o servidor devolve a resposta guardada em vez de
 * executar o pagamento outra vez (duplo clique / retry de rede).
 */
export const IdempotencyKeyModel = db.define(
  "idempotency_keys",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    idem_key: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    endpoint: { type: DataTypes.STRING(120), allowNull: false },
    response_status: { type: DataTypes.INTEGER, allowNull: true },
    response_body: { type: DataTypes.JSON, allowNull: true },
  },
  { tableName: "idempotency_keys", timestamps: true, createdAt: "created_at", updatedAt: false }
);

/**
 * AUDIT_LOG — trilha append-only (nunca UPDATE/DELETE por convenção).
 * Grava quem (user_id), de onde (ip), o quê (action/entity) e o antes/depois.
 */
export const AuditLogModel = db.define(
  "audit_log",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    company_id: { type: DataTypes.INTEGER, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    action: { type: DataTypes.STRING(60), allowNull: false },
    entity: { type: DataTypes.STRING(60), allowNull: false },
    entity_id: { type: DataTypes.INTEGER, allowNull: true },
    before_data: { type: DataTypes.JSON, allowNull: true },
    after_data: { type: DataTypes.JSON, allowNull: true },
  },
  { tableName: "audit_log", timestamps: true, createdAt: "created_at", updatedAt: false }
);

/**
 * PAYMENT_ALLOCATIONS — para onde foi cada cêntimo de um pagamento.
 * Ordem fixa de alocação: PENALTY → LATE_INTEREST → INTEREST → CAPITAL.
 */
export const PaymentAllocationModel = db.define(
  "payment_allocations",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    payment_id: { type: DataTypes.INTEGER, allowNull: false },
    amortization_loan_id: { type: DataTypes.INTEGER, allowNull: false },
    component: {
      type: DataTypes.ENUM("PENALTY", "LATE_INTEREST", "INTEREST", "CAPITAL"),
      allowNull: false,
    },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  },
  { tableName: "payment_allocations", timestamps: true, createdAt: "created_at", updatedAt: false }
);

/**
 * COMPANY_PENALTY_RULES — motor de mora configurável por empresa.
 * Substitui o uso directo de companies.forfeit (que continua a existir como
 * fallback legado). grace_days = carência antes de contar mora.
 */
export const CompanyPenaltyRuleModel = db.define(
  "company_penalty_rules",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    forfeit_percent: { type: DataTypes.DECIMAL(5, 4), allowNull: false, defaultValue: 1.0 },
    grace_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    cap_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 100.0 },
    base: {
      type: DataTypes.ENUM("INSTALLMENT", "OUTSTANDING_BALANCE"),
      allowNull: false,
      defaultValue: "INSTALLMENT",
    },
    business_days_only: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: "company_penalty_rules", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" }
);

/**
 * LATE_ACCRUALS — mora registada dia a dia (job às 00:05), não re-calculada
 * "ao vivo". A quote e o pagamento somam esta tabela; o job é a fonte.
 */
export const LateAccrualModel = db.define(
  "late_accruals",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    amortization_loan_id: { type: DataTypes.INTEGER, allowNull: false },
    accrual_date: { type: DataTypes.DATEONLY, allowNull: false },
    days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    base_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    rate: { type: DataTypes.DECIMAL(6, 4), allowNull: false, defaultValue: 0 },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM("ACCRUED", "CHARGED", "WAIVED"),
      allowNull: false,
      defaultValue: "ACCRUED",
    },
  },
  {
    tableName: "late_accruals",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ unique: true, fields: ["amortization_loan_id", "accrual_date"] }],
  }
);

/**
 * CUSTOMER_CREDITS — saldo a favor do cliente (excesso de pagamento).
 * Nunca se descarta troco: o excesso fica aqui e é abatido automaticamente
 * nas próximas prestações (ou por uso manual na quote).
 */
export const CustomerCreditModel = db.define(
  "customer_credits",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    account_number: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    remaining_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    source_payment_id: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.ENUM("ACTIVE", "APPLIED", "CANCELLED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
  },
  { tableName: "customer_credits", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" }
);
