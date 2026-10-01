"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLateAccrualJob = exports.getAccruedLateInterest = exports.dailyAccrualAmount = exports.effectiveLateDays = exports.getPenaltyRule = void 0;
const moment_1 = __importDefault(require("moment"));
const sequelize_1 = require("sequelize");
const db_1 = require("../database/db");
const money_1 = require("../utils/money");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
/** Lê a regra de mora da empresa; fallback = companies.forfeit (legado). */
const getPenaltyRule = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const [rows] = yield db_1.db.query("SELECT forfeit_percent, grace_days, cap_percent, base, business_days_only FROM company_penalty_rules WHERE company_id = ? LIMIT 1", { replacements: [companyId] });
        const rule = rows[0];
        if (rule) {
            return {
                forfeit_percent: (0, money_1.num)(rule.forfeit_percent),
                grace_days: Math.max(0, Number(rule.grace_days) || 0),
                cap_percent: (0, money_1.num)(rule.cap_percent) || 100,
                base: String(rule.base) === "OUTSTANDING_BALANCE" ? "OUTSTANDING_BALANCE" : "INSTALLMENT",
                business_days_only: !!Number(rule.business_days_only),
            };
        }
    }
    catch ( /* tabela ainda não migrada → segue legado */_b) { /* tabela ainda não migrada → segue legado */ }
    // Legado: companies.forfeit (percentagem/dia sobre a prestação integral)
    const [companyRows] = yield db_1.db.query("SELECT forfeit FROM companies WHERE id = ? LIMIT 1", { replacements: [companyId] });
    return {
        forfeit_percent: (0, money_1.num)((_a = companyRows[0]) === null || _a === void 0 ? void 0 : _a.forfeit) || 0,
        grace_days: 0,
        cap_percent: 100,
        base: "INSTALLMENT",
        business_days_only: false,
    };
});
exports.getPenaltyRule = getPenaltyRule;
/**
 * Dias de atraso efectivos (desconta carência; opcionalmente só dias úteis).
 * Business days: conta seg-sex entre dueDate e a data de referência.
 */
const effectiveLateDays = (dueDate, referenceDate, rule) => {
    const due = (0, moment_1.default)(String(dueDate).slice(0, 10), "YYYY-MM-DD");
    const ref = (0, moment_1.default)(String(referenceDate).slice(0, 10), "YYYY-MM-DD");
    if (!due.isValid() || !ref.isValid() || ref.diff(due, "days") <= 0)
        return 0;
    if (!rule.business_days_only) {
        return Math.max(0, ref.diff(due, "days") - rule.grace_days);
    }
    // Dias úteis: conta dias seg-sex estritamente após a carência
    let businessDays = 0;
    let cursor = due.clone().add(1, "day");
    let counted = 0;
    while (cursor.isBefore(ref) || cursor.isSame(ref, "day")) {
        const dow = cursor.day(); // 0 dom, 6 sáb
        if (dow !== 0 && dow !== 6) {
            counted += 1;
            if (counted > rule.grace_days)
                businessDays += 1;
        }
        cursor.add(1, "day");
    }
    return businessDays;
};
exports.effectiveLateDays = effectiveLateDays;
/**
 * Mora diária do dia D para uma prestação (usada pelo job de accrual).
 * Respeita a base configurada: prestação integral OU saldo em falta.
 */
const dailyAccrualAmount = (params) => {
    const { installmentValue, outstandingBalance, dueDate, accrualDate, rule } = params;
    const days = (0, exports.effectiveLateDays)(dueDate, accrualDate, rule);
    if (days <= 0)
        return { days: 0, baseAmount: 0, amount: 0 };
    const baseAmount = rule.base === "OUTSTANDING_BALANCE"
        ? (0, money_1.round2)(Math.max(0, outstandingBalance))
        : (0, money_1.round2)(Math.max(0, installmentValue));
    if (baseAmount <= 0)
        return { days: 0, baseAmount: 0, amount: 0 };
    // Mora acumulada até ao dia anterior (para respeitar o cap)
    const daily = (0, money_1.round2)(baseAmount * (rule.forfeit_percent / 100));
    return { days: 1, baseAmount, amount: daily };
};
exports.dailyAccrualAmount = dailyAccrualAmount;
/**
 * Total de mora ACCRUED (não cobrada) de uma prestação até uma data.
 * Se existirem accruals, devolve a soma; se não, calcula pela fórmula
 * (compatibilidade com prestações antigas sem accrual diário).
 */
const getAccruedLateInterest = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { amortizationLoanId, installmentValue, paidAmount, dueDate, companyId, referenceDate } = params;
    const ref = String(referenceDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const rule = yield (0, exports.getPenaltyRule)(companyId);
    // 1) Tenta pela tabela de accruals (fonte oficial do V2)
    try {
        const [rows] = yield db_1.db.query(`SELECT SUM(amount) AS total, MAX(days) AS max_days, COUNT(*) AS n
         FROM late_accruals WHERE amortization_loan_id = ? AND status = 'ACCRUED'`, { replacements: [amortizationLoanId] });
        const row = rows[0] || {};
        const nAccruals = Number(row.n) || 0;
        if (nAccruals > 0) {
            let total = (0, money_1.num)(row.total);
            // Accruals ainda não cobrem a data de referência? completa por fórmula
            // proporcional ao número de dias em falta (job corre 1×/dia).
            const maxDays = Number(row.max_days) || 0;
            const daysLate = (0, exports.effectiveLateDays)(dueDate, ref, rule);
            if (daysLate > maxDays) {
                const baseAmount = rule.base === "OUTSTANDING_BALANCE"
                    ? (0, money_1.round2)(Math.max(0, installmentValue - paidAmount))
                    : (0, money_1.round2)(Math.max(0, installmentValue));
                const daily = (0, money_1.round2)(baseAmount * (rule.forfeit_percent / 100));
                total = (0, money_1.round2)(total + daily * (daysLate - maxDays));
            }
            // Aplica o cap
            const baseCap = rule.base === "OUTSTANDING_BALANCE"
                ? (0, money_1.round2)(Math.max(0, installmentValue - paidAmount))
                : (0, money_1.round2)(Math.max(0, installmentValue));
            const cap = (0, money_1.round2)(baseCap * (rule.cap_percent / 100));
            return { amount: Math.min((0, money_1.round2)(total), cap), daysLate: Math.max(maxDays, (0, exports.effectiveLateDays)(dueDate, ref, rule)), source: "accruals" };
        }
    }
    catch ( /* tabela ausente → fórmula */_c) { /* tabela ausente → fórmula */ }
    // 2) Fórmula ao vivo (legado compatível)
    const daysLate = (0, exports.effectiveLateDays)(dueDate, ref, rule);
    if (daysLate <= 0)
        return { amount: 0, daysLate: 0, source: "formula" };
    const baseAmount = rule.base === "OUTSTANDING_BALANCE"
        ? (0, money_1.round2)(Math.max(0, installmentValue - paidAmount))
        : (0, money_1.round2)(Math.max(0, installmentValue));
    const raw = (0, money_1.round2)(baseAmount * (rule.forfeit_percent / 100) * daysLate);
    const cap = (0, money_1.round2)(baseAmount * (rule.cap_percent / 100));
    return { amount: Math.min(raw, cap), daysLate, source: "formula" };
});
exports.getAccruedLateInterest = getAccruedLateInterest;
/**
 * JOB DE ACCRUAL — corre todo dia às 00:05.
 * Para cada prestação em atraso (status != 1, dueDate < hoje), insere o
 * accrual do dia (idempotente por UNIQUE(amortization_loan_id, accrual_date)).
 * Devolve resumo para log.
 */
const runLateAccrualJob = () => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    const today = new Date().toISOString().slice(0, 10);
    let processed = 0, created = 0, skipped = 0, errors = 0;
    try {
        const installments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { status: { [sequelize_1.Op.ne]: 1 } },
            raw: true,
        });
        for (const inst of installments) {
            processed += 1;
            try {
                const dueDate = String(inst.dueDate || "").slice(0, 10);
                if (!dueDate || dueDate >= today) {
                    skipped += 1;
                    continue;
                }
                const rule = yield (0, exports.getPenaltyRule)(Number(inst.companyId));
                const days = (0, exports.effectiveLateDays)(dueDate, today, rule);
                if (days <= 0) {
                    skipped += 1;
                    continue;
                }
                const baseAmount = rule.base === "OUTSTANDING_BALANCE"
                    ? (0, money_1.round2)(Math.max(0, (0, money_1.num)(inst.installment) - (0, money_1.num)(inst.paidAmount)))
                    : (0, money_1.round2)(Math.max(0, (0, money_1.num)(inst.installment)));
                if (baseAmount <= 0) {
                    skipped += 1;
                    continue;
                }
                // Cap: não accrue além do cap acumulado
                const [sumRows] = yield db_1.db.query(`SELECT COALESCE(SUM(amount),0) AS total FROM late_accruals
            WHERE amortization_loan_id = ? AND status='ACCRUED'`, { replacements: [Number(inst.id)] });
                const accrued = (0, money_1.num)((_d = sumRows[0]) === null || _d === void 0 ? void 0 : _d.total);
                const cap = (0, money_1.round2)(baseAmount * (rule.cap_percent / 100));
                if (accrued >= cap) {
                    skipped += 1;
                    continue;
                }
                const daily = (0, money_1.round2)(baseAmount * (rule.forfeit_percent / 100));
                const amount = (0, money_1.round2)(Math.min(daily, (0, money_1.round2)(cap - accrued)));
                const [result] = yield db_1.db.query(`INSERT IGNORE INTO late_accruals
             (amortization_loan_id, accrual_date, days, base_amount, rate, amount, status, created_at)
           VALUES (?, ?, 1, ?, ?, ?, 'ACCRUED', NOW())`, { replacements: [Number(inst.id), today, baseAmount, rule.forfeit_percent, amount] });
                if (Number(result === null || result === void 0 ? void 0 : result.affectedRows) > 0)
                    created += 1;
                else
                    skipped += 1;
            }
            catch (_e) {
                errors += 1;
            }
        }
    }
    catch (_f) {
        errors += 1;
    }
    return { processed, created, skipped, errors };
});
exports.runLateAccrualJob = runLateAccrualJob;
