"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulator = void 0;
const moment_1 = __importDefault(require("moment"));
const simulator = (loan) => {
    let loanAmount = loan.amount;
    const months = loan.numberOfInstallments;
    const rate = loan.interestRate;
    let monthlyPayment;
    monthlyPayment =
        (loanAmount * rate * Math.pow(1 + rate, months)) /
            (Math.pow(1 + rate, months) - 1);
    let currentBalance = loanAmount;
    let paymentCounter = 1;
    let totalInterest = 0;
    let towardsInterest = 0;
    let towardsBalance = 0;
    let dueDate;
    let addMonth = 0;
    const amortizationPlan = [];
    while (currentBalance >= 0) {
        towardsInterest = rate * currentBalance;
        towardsBalance = parseFloat(monthlyPayment) - towardsInterest;
        totalInterest = totalInterest + towardsInterest;
        currentBalance = currentBalance - towardsBalance;
        dueDate = (0, moment_1.default)().add(addMonth + 1, "M");
        console.log(currentBalance, "ª prestacao");
        if (currentBalance >= 0) {
            amortizationPlan.push({
                loanId: loan.loanId,
                accountNumber: loan.accountNumber,
                installmentOrder: paymentCounter + "ª prestação",
                interestRate: towardsInterest,
                installment: monthlyPayment,
                amortization: towardsBalance,
                loanBalance: parseFloat(currentBalance).toFixed(2),
                dueDate: dueDate.toDate(),
            });
            paymentCounter++;
            addMonth++;
        }
    }
    return amortizationPlan;
};
exports.simulator = simulator;
