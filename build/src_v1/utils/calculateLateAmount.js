"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalsOfInstallments = exports.installmentPanification = void 0;
const moment_1 = __importDefault(require("moment"));
const today = (0, moment_1.default)().format("YYYY-MM-DD");
const calculatePendingDays = (installment) => {
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
const latePaymentInterest = (installment, fine) => {
    const diffDays = (0, moment_1.default)(today).diff((0, moment_1.default)(installment.dueDate), "days");
    // Só calcula juros de mora se a prestação estiver atrasada (dias positivos) e não paga
    if (diffDays <= 0 || installment.status === 1) {
        return 0;
    }
    // Converte a percentagem para taxa decimal: ex: 2 → 0.02
    const dailyRate = fine / 100;
    const dailyPenalty = parseFloat(installment.installment) * dailyRate;
    return Math.round(dailyPenalty * diffDays * 100) / 100;
};
const installmentPanification = (installments, forfeit) => {
    const installmentPlan = [];
    installments.forEach((element) => {
        const installment = {
            id: element.id,
            loanId: element.loanId,
            installmentOrder: element.installmentOrder,
            accountNumber: element.accountNumber,
            // Garante que os valores numéricos sejam convertidos corretamente
            amortization: parseFloat(element.amortization) || 0,
            rateAmount: parseFloat(element.rateAmount) || 0,
            installment: parseFloat(element.installment) || 0,
            // Inclui o saldo devedor se disponível (pode ser null para dados antigos)
            remainingBalance: element.remainingBalance !== null && element.remainingBalance !== undefined
                ? parseFloat(element.remainingBalance)
                : null,
            lateDays: calculatePendingDays(element),
            latePaymentInterest: latePaymentInterest(element, forfeit),
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
