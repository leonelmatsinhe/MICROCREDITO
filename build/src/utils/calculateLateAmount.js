"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalsOfInstallments = exports.installmentPanification = void 0;
const moment_1 = __importDefault(require("moment"));
const calculatePendingDays = (installment, referenceDate) => {
    const today = referenceDate ? (0, moment_1.default)(referenceDate).startOf("day") : (0, moment_1.default)().startOf("day");
    const diffDays = (0, moment_1.default)(today).diff((0, moment_1.default)(installment.dueDate), "days");
    // Retorna apenas dias positivos (atraso), caso contrário retorna 0
    return diffDays > 0 ? diffDays : 0;
};
/**
 * Calcula os juros de mora diários de uma prestação em atraso.
 * Fórmula: Mora = Prestação × (forfeit / 100) × Dias em atraso
 *
 * O forfeit vem como percentagem (ex: 2 = 2% por dia).
 * Divide-se por 100 para converter em taxa decimal antes de aplicar.
 *
 * @param installment - Objecto da prestação (com installment, dueDate, status)
 * @param fine - Taxa diária de mora em percentagem (ex: 2 para 2%/dia)
 * @returns Valor total dos juros de mora acumulados
 */
const latePaymentInterest = (installment, fine, referenceDate) => {
    const today = referenceDate ? (0, moment_1.default)(referenceDate).startOf("day") : (0, moment_1.default)().startOf("day");
    const diffDays = (0, moment_1.default)(today).diff((0, moment_1.default)(installment.dueDate), "days");
    // Calcula juros de mora se atrasada (dias positivos)
    // Status 1 = totalmente pago (sem juros)
    // Status 0 = pendente (com juros)
    // Status -1 = parcialmente pago (com juros sobre o que falta)
    if (diffDays <= 0 || installment.status === 1) {
        return 0;
    }
    // Converte a percentagem para taxa decimal: ex: 2 → 0.02
    const dailyRate = Number(fine || 0) / 100;
    // A mora incide sobre o valor integral da prestação vencida.
    // O pagamento parcial reduz o saldo da prestação, mas não retroage
    // o valor da mora já acumulada até à data do pagamento.
    const installmentAmount = Math.max(0, parseFloat(installment.installment) || 0);
    const dailyPenalty = installmentAmount * dailyRate;
    return Math.round(dailyPenalty * diffDays * 100) / 100;
};
const installmentPanification = (installments, forfeit, referenceDate) => {
    const installmentPlan = [];
    // ── BASE DO SALDO = CAPITAL (Σ amortização), NÃO Σ prestações ──
    // BUG antigo: totalLoanAmount somava as PRESTAÇÕES (capital + juros),
    // logo o saldo da última linha ficava "600" (8100 − 7500) em vez de 0,00.
    // Σ amortização é o capital exacto (o gerador Price fecha ao cêntimo).
    // Fallback: planos sem amortization → capital estimado = prestações − juros.
    const sumOf = (pick) => installments.reduce((sum, el) => sum + (pick(el) || 0), 0);
    let totalCapitalAmount = sumOf((el) => parseFloat(el.amortization));
    if (totalCapitalAmount <= 0) {
        totalCapitalAmount = Math.round((sumOf((el) => parseFloat(el.installment)) - sumOf((el) => parseFloat(el.rateAmount))) * 100) / 100;
    }
    // Track cumulative amortization to calculate remaining balance dynamically
    let cumulativeAmortization = 0;
    installments.forEach((element, index) => {
        const amortizationAmount = parseFloat(element.amortization) || 0;
        // Remaining balance = Capital total - soma das amortizações até esta linha
        const calculatedRemainingBalance = totalCapitalAmount - cumulativeAmortization - amortizationAmount;
        cumulativeAmortization += amortizationAmount;
        // Última linha fecha SEMPRE em 0,00 — absorve o cêntimo de
        // arredondamento que possa ter sobrado no plano.
        const isLast = index === installments.length - 1;
        const installment = {
            id: element.id,
            loanId: element.loanId,
            installmentOrder: element.installmentOrder,
            accountNumber: element.accountNumber,
            // Garante que os valores numéricos sejam convertidos corretamente
            amortization: amortizationAmount,
            rateAmount: parseFloat(element.rateAmount) || 0,
            installment: parseFloat(element.installment) || 0,
            paidAmount: parseFloat(element.paidAmount) || 0,
            // Saldo devedor calculado dinamicamente (Sistema Francês);
            // a última linha é forçada a 0,00.
            remainingBalance: isLast ? 0 : Math.max(0, Math.round(calculatedRemainingBalance * 100) / 100),
            lateDays: calculatePendingDays(element, referenceDate),
            latePaymentInterest: latePaymentInterest(element, forfeit, referenceDate),
            dueDate: element.dueDate,
            status: element.status,
            createdAt: element.createdAt,
            updatedAt: element.updatedAt,
        };
        installmentPlan.push(installment);
    });
    return installmentPlan;
};
exports.installmentPanification = installmentPanification;
const totalsOfInstallments = (bills) => {
    const pendingInstallment = bills.filter((bill) => {
        return bill.status == 0;
    });
    const totalOfCapital = pendingInstallment.reduce((sum, p) => sum + p.installment, 0);
    const totalOfOverDue = bills.reduce((sum, p) => sum + p.latePaymentInterest, 0);
    const accumulatedAmount = totalOfCapital + totalOfOverDue;
    return { totalOfCapital, totalOfOverDue, accumulatedAmount };
};
exports.totalsOfInstallments = totalsOfInstallments;
