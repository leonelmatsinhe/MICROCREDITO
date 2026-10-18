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
exports.runLateAccrualJob = exports.getAccruedLateInterest = exports.dailyAccrualAmount = exports.effectiveLateDays = exports.getLegacyPenaltyParams = exports.getPenaltyRule = exports.lateInterestOnOutstanding = exports.cappedDays = void 0;
const moment_1 = __importDefault(require("moment"));
const sequelize_1 = require("sequelize");
const db_1 = require("../database/db");
const money_1 = require("../utils/money");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
/**
 * Base de cálculo da mora = SALDO DEVEDOR da prestação (nunca o valor
 * integral quando há pagamento parcial).
 */
const outstandingBase = (installmentValue, paidAmount) => (0, money_1.round2)(Math.max(0, (0, money_1.round2)((0, money_1.num)(installmentValue)) - (0, money_1.round2)((0, money_1.num)(paidAmount))));
/** Limita os dias de atraso ao máximo configurado (0/NULL = ilimitado). */
const cappedDays = (days, rule) => rule.max_late_days > 0 ? Math.min(days, rule.max_late_days) : days;
exports.cappedDays = cappedDays;
/**
 * Mora devida hoje com base no SALDO DEVEDOR ACTUAL da prestação.
 *
 * É a ÚNICA fórmula usada para decidir quanto o cliente deve de mora:
 * tanto o caminho de accruals como o caminho de fórmula passam por aqui,
 * pelo que um pagamento parcial reduz imediatamente a base (e o total
 * exigível) — nunca se cobra sobre o valor integral da prestação.
 *
 * forfeit_percent = 0 → mora inválida (0); cap_percent limita a mora ao
 * saldo devedor, não ao valor original da prestação.
 */
const lateInterestOnOutstanding = (params) => {
    const { installmentValue, paidAmount, daysLate, rule } = params;
    if (Number(daysLate) <= 0 || rule.forfeit_percent <= 0)
        return 0;
    const baseAmount = outstandingBase(installmentValue, paidAmount);
    if (baseAmount <= 0)
        return 0;
    const raw = (0, money_1.round2)(baseAmount * (rule.forfeit_percent / 100) * Number(daysLate));
    const cap = (0, money_1.round2)(baseAmount * (rule.cap_percent / 100));
    return Math.min(raw, cap);
};
exports.lateInterestOnOutstanding = lateInterestOnOutstanding;
/** Lê a regra de mora da empresa; fallback = companies.forfeit (legado). */
const getPenaltyRule = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const [rows] = yield db_1.db.query("SELECT forfeit_percent, grace_days, cap_percent, base, business_days_only, max_late_days FROM company_penalty_rules WHERE company_id = ? LIMIT 1", { replacements: [companyId] });
        const rule = rows[0];
        if (rule) {
            return {
                forfeit_percent: (0, money_1.num)(rule.forfeit_percent),
                grace_days: Math.max(0, Number(rule.grace_days) || 0),
                cap_percent: (0, money_1.num)(rule.cap_percent) || 100,
                base: String(rule.base) === "OUTSTANDING_BALANCE" ? "OUTSTANDING_BALANCE" : "INSTALLMENT",
                business_days_only: !!Number(rule.business_days_only),
                max_late_days: Math.max(0, Number(rule.max_late_days) || 0),
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
        max_late_days: 0,
    };
});
exports.getPenaltyRule = getPenaltyRule;
/**
 * Parâmetros prontos para a fórmula legada (installmentPanification):
 * substitui companies.forfeit e propaga os limites de invalidação/limitação
 * (dias máximos + cap) para todos os cálculos legados.
 */
const getLegacyPenaltyParams = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const rule = yield (0, exports.getPenaltyRule)(companyId);
    return {
        forfeit: rule.forfeit_percent,
        maxLateDays: rule.max_late_days,
        capPercent: rule.cap_percent,
    };
});
exports.getLegacyPenaltyParams = getLegacyPenaltyParams;
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
 * Base = SALDO DEVEDOR (installment − paidAmount), nunca o valor integral.
 */
const dailyAccrualAmount = (params) => {
    const { installmentValue, paidAmount, dueDate, accrualDate, rule } = params;
    const rawDays = (0, exports.effectiveLateDays)(dueDate, accrualDate, rule);
    if (rawDays <= 0)
        return { days: 0, baseAmount: 0, amount: 0 };
    // Base = SALDO DEVEDOR (pagamento parcial reduz a mora futura)
    const baseAmount = outstandingBase(installmentValue, paidAmount);
    if (baseAmount <= 0)
        return { days: 0, baseAmount: 0, amount: 0 };
    // Dias de atraso ao alcance do limite + mora diária
    const days = 1;
    const daily = (0, money_1.round2)(baseAmount * (rule.forfeit_percent / 100));
    return { days, baseAmount, amount: daily };
};
exports.dailyAccrualAmount = dailyAccrualAmount;
/**
 * Total de mora ACCRUED (não cobrada) de uma prestação até uma data.
 *
 * Se existirem accruals até à data de referência, devolve a soma completada
 * com os dias em falta — mas SEMPRE limitada à fórmula sobre o saldo devedor
 * actual (installment − paidAmount). Se não existirem, calcula pela fórmula
 * (compatibilidade com prestações antigas sem accrual diário).
 */
const getAccruedLateInterest = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { amortizationLoanId, installmentValue, paidAmount, dueDate, companyId, referenceDate } = params;
    const ref = String(referenceDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const rule = yield (0, exports.getPenaltyRule)(companyId);
    // 1) Tenta pela tabela de accruals (fonte oficial do V2)
    try {
        const [rows] = yield db_1.db.query(`SELECT SUM(amount) AS total, COUNT(*) AS n
         FROM late_accruals
        WHERE amortization_loan_id = ? AND status = 'ACCRUED'
          AND accrual_date <= ?`, { replacements: [amortizationLoanId, ref] });
        const row = rows[0] || {};
        const nAccruals = Number(row.n) || 0;
        if (nAccruals > 0) {
            let total = (0, money_1.num)(row.total);
            // Cada linha de late_accruals representa UM dia (coluna days = 1).
            // O n.º de dias já cobertos é portanto COUNT(*), nunca MAX(days) — ler
            // MAX(days) dava sempre 1 e voltava a completar todos os dias por
            // fórmula, duplicando a mora cobrada.
            const maxDays = nAccruals;
            const daysLate = (0, exports.cappedDays)((0, exports.effectiveLateDays)(dueDate, ref, rule), rule);
            if (daysLate > maxDays) {
                const baseAmount = outstandingBase(installmentValue, paidAmount);
                const daily = (0, money_1.round2)(baseAmount * (rule.forfeit_percent / 100));
                total = (0, money_1.round2)(total + daily * (daysLate - maxDays));
            }
            // REGRA DO SALDO DEVEDOR: o acumulado histórico nunca pode exceder a
            // mora calculada sobre o saldo devedor ACTUAL da prestação. Assim que o
            // cliente paga parte da prestação, a base (e a mora exigível) desce —
            // mesmo que os accruals antigos tenham sido gerados sobre um valor maior.
            const maxAllowed = (0, exports.lateInterestOnOutstanding)({
                installmentValue,
                paidAmount,
                daysLate,
                rule,
            });
            return {
                amount: Math.min((0, money_1.round2)(total), maxAllowed),
                daysLate,
                source: "accruals",
            };
        }
    }
    catch ( /* tabela ausente → fórmula */_c) { /* tabela ausente → fórmula */ }
    // 2) Fórmula ao vivo (legado compatível)
    const rawDays = (0, exports.effectiveLateDays)(dueDate, ref, rule);
    const daysLate = (0, exports.cappedDays)(rawDays, rule);
    if (daysLate <= 0)
        return { amount: 0, daysLate: 0, source: "formula" };
    // Base = SALDO DEVEDOR (nunca a prestação integral com pagamento parcial)
    const amount = (0, exports.lateInterestOnOutstanding)({ installmentValue, paidAmount, daysLate, rule });
    return { amount, daysLate, source: "formula" };
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
                const days = (0, exports.cappedDays)((0, exports.effectiveLateDays)(dueDate, today, rule), rule);
                if (days <= 0) {
                    skipped += 1;
                    continue;
                }
                // Base = SALDO DEVEDOR (pagamento parcial reduz a mora futura)
                const baseAmount = outstandingBase((0, money_1.num)(inst.installment), (0, money_1.num)(inst.paidAmount));
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
