"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerCreditModel = exports.LateAccrualModel = exports.CompanyPenaltyRuleModel = exports.PaymentAllocationModel = exports.AuditLogModel = exports.IdempotencyKeyModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
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
exports.IdempotencyKeyModel = db_1.db.define("idempotency_keys", {
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    idem_key: { type: sequelize_1.DataTypes.STRING(80), allowNull: false, unique: true },
    company_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    user_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    endpoint: { type: sequelize_1.DataTypes.STRING(120), allowNull: false },
    response_status: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    response_body: { type: sequelize_1.DataTypes.JSON, allowNull: true },
}, { tableName: "idempotency_keys", timestamps: true, createdAt: "created_at", updatedAt: false });
/**
 * AUDIT_LOG — trilha append-only (nunca UPDATE/DELETE por convenção).
 * Grava quem (user_id), de onde (ip), o quê (action/entity) e o antes/depois.
 */
exports.AuditLogModel = db_1.db.define("audit_log", {
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    user_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    company_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    ip: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
    action: { type: sequelize_1.DataTypes.STRING(60), allowNull: false },
    entity: { type: sequelize_1.DataTypes.STRING(60), allowNull: false },
    entity_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    before_data: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    after_data: { type: sequelize_1.DataTypes.JSON, allowNull: true },
}, { tableName: "audit_log", timestamps: true, createdAt: "created_at", updatedAt: false });
/**
 * PAYMENT_ALLOCATIONS — para onde foi cada cêntimo de um pagamento.
 * Ordem fixa de alocação: PENALTY → LATE_INTEREST → INTEREST → CAPITAL.
 */
exports.PaymentAllocationModel = db_1.db.define("payment_allocations", {
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    payment_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    amortization_loan_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    component: {
        type: sequelize_1.DataTypes.ENUM("PENALTY", "LATE_INTEREST", "INTEREST", "CAPITAL"),
        allowNull: false,
    },
    amount: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
}, { tableName: "payment_allocations", timestamps: true, createdAt: "created_at", updatedAt: false });
/**
 * COMPANY_PENALTY_RULES — motor de mora configurável por empresa.
 * Substitui o uso directo de companies.forfeit (que continua a existir como
 * fallback legado). grace_days = carência antes de contar mora.
 */
exports.CompanyPenaltyRuleModel = db_1.db.define("company_penalty_rules", {
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    company_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, unique: true },
    forfeit_percent: { type: sequelize_1.DataTypes.DECIMAL(5, 4), allowNull: false, defaultValue: 1.0 },
    grace_days: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    cap_percent: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 100.0 },
    base: {
        type: sequelize_1.DataTypes.ENUM("INSTALLMENT", "OUTSTANDING_BALANCE"),
        allowNull: false,
        defaultValue: "INSTALLMENT",
    },
    business_days_only: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: "company_penalty_rules", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" });
/**
 * LATE_ACCRUALS — mora registada dia a dia (job às 00:05), não re-calculada
 * "ao vivo". A quote e o pagamento somam esta tabela; o job é a fonte.
 */
exports.LateAccrualModel = db_1.db.define("late_accruals", {
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    amortization_loan_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    accrual_date: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false },
    days: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    base_amount: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    rate: { type: sequelize_1.DataTypes.DECIMAL(6, 4), allowNull: false, defaultValue: 0 },
    amount: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    status: {
        type: sequelize_1.DataTypes.ENUM("ACCRUED", "CHARGED", "WAIVED"),
        allowNull: false,
        defaultValue: "ACCRUED",
    },
}, {
    tableName: "late_accruals",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ unique: true, fields: ["amortization_loan_id", "accrual_date"] }],
});
/**
 * CUSTOMER_CREDITS — saldo a favor do cliente (excesso de pagamento).
 * Nunca se descarta troco: o excesso fica aqui e é abatido automaticamente
 * nas próximas prestações (ou por uso manual na quote).
 */
exports.CustomerCreditModel = db_1.db.define("customer_credits", {
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, allowNull: false, primaryKey: true },
    company_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    customer_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    account_number: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    amount: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false },
    remaining_amount: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false },
    source_payment_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    status: {
        type: sequelize_1.DataTypes.ENUM("ACTIVE", "APPLIED", "CANCELLED"),
        allowNull: false,
        defaultValue: "ACTIVE",
    },
}, { tableName: "customer_credits", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" });
