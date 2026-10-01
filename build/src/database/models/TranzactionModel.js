"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranzactionModel = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.TranzactionModel = db_1.db.define("tranzactions", {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    companyId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    amortizationLoanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    loanId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    accountNumber: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    customerId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    totalAmount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: "Valor total recebido: base + juros de mora - desconto",
    },
    latePaymentInterest: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    interestRateAmount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    phoneNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    paymentDate: {
        // V2: DATE real na BD (migração convertida de VARCHAR) — leitura normalizada
        // como 'YYYY-MM-DD' (ver migração de datas em migrations/index.ts).
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        get() {
            const raw = this.getDataValue("paymentDate");
            return raw ? String(raw).slice(0, 10) : raw;
        },
    },
    tranzactionReference: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    paymentMethod: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    receiptUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    staffName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    discountApplied: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    },
    discountAmount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
    },
    walletId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "Carteira de financiamento do crédito (copiada do customer_loans no pagamento)",
    },
    mora_amount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Juros de mora efectivamente recebidos neste pagamento",
    },
    // ── PAGAMENTOS V2 (migração migratePaymentsV2) — sem estas definições o
    // Sequelize IGNORA os campos nos create/update (silencioso!) ──
    status: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "CONFIRMED",
        comment: "CONFIRMED | REVERSED (estorno formal)",
    },
    received_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "userId do JWT — quem registou o pagamento (auditoria)",
    },
    received_ip: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: true,
        comment: "IP de origem do registo (auditoria)",
    },
    idem_key: {
        type: sequelize_1.DataTypes.STRING(80),
        allowNull: true,
        comment: "Idempotency-Key do pedido (anti-duplicação)",
    },
    reversed_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "Admin que anulou o pagamento",
    },
    reversal_reason: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: "Motivo obrigatório do estorno",
    },
    reversed_tranzaction_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "Link à transacção de estorno (futuro)",
    },
    bank_account_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "Conta de destino do pagamento (accounts.id — REEMBOLSO/MISTO/caixa)",
    },
});
