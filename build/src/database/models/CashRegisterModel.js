"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashRegisterModel = exports.CASH_CLOSING_TYPE_LABELS = exports.CASH_CLOSING_TYPES = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
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
exports.CASH_CLOSING_TYPES = [
    "NORMAL",
    "ENTREGA_COFRE",
    "DEPOSITO_BANCARIO",
    "DIVERGENCIA",
];
exports.CASH_CLOSING_TYPE_LABELS = {
    NORMAL: "Fecho normal (sem divergência)",
    ENTREGA_COFRE: "Fecho com entrega do excedente ao Cofre",
    DEPOSITO_BANCARIO: "Fecho com depósito do excedente no banco",
    DIVERGENCIA: "Fecho com divergência — auto de ocorrência (conta 58)",
};
exports.CashRegisterModel = db_1.db.define("cash_registers", {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    companyId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "Empresa a que o caixa pertence",
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "Utilizador responsável pelo caixa (quem abriu)",
    },
    opening_date: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: false,
        comment: "Dia do caixa (YYYY-MM-DD) — base do índice único por dia",
    },
    opening_time: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: "Momento exacto da abertura",
    },
    closing_time: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: "Momento exacto do fecho",
    },
    opening_balance: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Saldo inicial do caixa — sempre 0 (o caixa abre com saldo zero disponível)",
    },
    counted_open: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: "Fundo de maneio contado na abertura (memorando físico — não é saldo disponível)",
    },
    total_in: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Soma de TODAS as entradas (cash + bank)",
    },
    total_out: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Soma de TODAS as saídas (cash + bank)",
    },
    total_cash_in: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Entradas com payment_method = CASH",
    },
    total_cash_out: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Saídas com payment_method = CASH",
    },
    total_bank_in: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Entradas electrónicas (BANK/MPESA/EMOLA)",
    },
    total_bank_out: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Saídas electrónicas (BANK/MPESA/EMOLA)",
    },
    status: {
        type: sequelize_1.DataTypes.ENUM("ABERTO", "FECHADO"),
        allowNull: false,
        defaultValue: "ABERTO",
    },
    closing_balance_informed: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: "Valor contado em dinheiro físico no fecho",
    },
    closing_balance_calculated: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: "fundo de maneio (counted_open) + total_cash_in − total_cash_out (cash apenas)",
    },
    difference: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: "closing_balance_informed − closing_balance_calculated",
    },
    denominations_open: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        comment: 'Contagem por denominação na abertura: { "1000": 3, "500": 2, ... } (notas e moedas em MZN)',
    },
    denominations_close: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        comment: 'Contagem por denominação no fecho (dinheiro físico contado pelo operador)',
    },
    tipo_fechamento: {
        type: sequelize_1.DataTypes.ENUM(...exports.CASH_CLOSING_TYPES),
        allowNull: true,
        comment: "Tipo de fecho: NORMAL, ENTREGA_COFRE, DEPOSITO_BANCARIO ou DIVERGENCIA",
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        comment: "Observações do fecho (explicar divergência, etc.)",
    },
    bank_account_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: "Conta de destino por defeito dos pagamentos deste caixa (accounts.id)",
    },
    closed_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    closedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: "cash_registers",
    freezeTableName: true,
});
