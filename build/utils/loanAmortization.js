"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFrenchAmortizationInstallment = exports.simulator = void 0;
/**
 * Calcula a prestação usando a fórmula do sistema de amortização francês (Price)
 * PMT = PV * [i(1+i)^n] / [(1+i)^n - 1]
 * onde:
 * PMT = Valor da prestação
 * PV = Valor presente (capital emprestado)
 * i = Taxa de juros por período
 * n = Número de períodos
 */
const calculateFrenchAmortizationInstallment = (principal, interestRate, numberOfPeriods) => {
    if (interestRate === 0) {
        return principal / numberOfPeriods;
    }
    const rate = interestRate;
    const numerator = rate * Math.pow(1 + rate, numberOfPeriods);
    const denominator = Math.pow(1 + rate, numberOfPeriods) - 1;
    const installment = principal * (numerator / denominator);
    return installment;
};
exports.calculateFrenchAmortizationInstallment = calculateFrenchAmortizationInstallment;
/**
 * Gera o plano de amortização usando o sistema francês (Price)
 * No sistema francês:
 * - Cada prestação tem o mesmo valor
 * - Os juros são calculados sobre o saldo devedor remanescente
 * - A parte de capital aumenta ao longo do tempo
 * - A parte de juros diminui ao longo do tempo
 */
const simulator = (loan) => {
    const loanAmount = parseFloat(loan.amount);
    const numberOfInstallments = parseInt(loan.numberOfInstallments);
    const rate = parseFloat(loan.interestRate);
    if (loanAmount <= 0 || numberOfInstallments <= 0 || rate < 0) {
        throw new Error("Valores inválidos para cálculo de amortização");
    }
    const amortizationPlan = [];
    // Calcula o valor da prestação usando a fórmula do sistema francês
    const installment = calculateFrenchAmortizationInstallment(loanAmount, rate, numberOfInstallments);
    let remainingBalance = loanAmount; // Saldo devedor inicial
    for (let index = 0; index < numberOfInstallments; index++) {
        // Todas as prestações são mensais
        // Adiciona 1 mês à data de desembolso para cada prestação
        // Usa Date nativo para consistência com o frontend
        const baseDate = new Date(loan.dueDate);
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + (index + 1));
        // Calcula os juros sobre o saldo devedor atual
        const rateAmount = remainingBalance * rate;
        // Calcula a amortização (capital) da prestação
        const amortization = installment - rateAmount;
        // Atualiza o saldo devedor
        remainingBalance = remainingBalance - amortization;
        // Garante que o saldo final seja zero (ajuste de arredondamento)
        if (index === numberOfInstallments - 1) {
            const adjustment = remainingBalance;
            remainingBalance = 0;
            // Ajusta a última prestação se necessário
            const adjustedInstallment = installment + adjustment;
            const adjustedAmortization = amortization + adjustment;
            amortizationPlan.push({
                loanId: loan.loanId,
                accountNumber: loan.accountNumber,
                companyId: loan.companyId,
                status: loan.status,
                installmentOrder: (index + 1) + "ª",
                amortization: Math.round(adjustedAmortization * 100) / 100,
                rateAmount: Math.round(rateAmount * 100) / 100,
                installment: Math.round(adjustedInstallment * 100) / 100,
                remainingBalance: 0,
                dueDate: dueDate,
            });
        }
        else {
            amortizationPlan.push({
                loanId: loan.loanId,
                accountNumber: loan.accountNumber,
                companyId: loan.companyId,
                status: loan.status,
                installmentOrder: (index + 1) + "ª",
                amortization: Math.round(amortization * 100) / 100,
                rateAmount: Math.round(rateAmount * 100) / 100,
                installment: Math.round(installment * 100) / 100,
                remainingBalance: Math.round(remainingBalance * 100) / 100,
                dueDate: dueDate,
            });
        }
    }
    return amortizationPlan;
};
exports.simulator = simulator;
