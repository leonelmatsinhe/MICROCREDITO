"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulator = void 0;
const moment_1 = __importDefault(require("moment"));
const simulator = (loan) => {
    let loanAmount = parseFloat(loan.amount);
    const numberOfInstallments = loan.numberOfInstallments;
    const rate = loan.interestRate;
    const amortizationPlan = [];
    const getInstallmentType = () => {
        if (numberOfInstallments == 30) {
            return "d";
        }
        else if (numberOfInstallments == 4) {
            return "w";
        }
        else if (numberOfInstallments == 2) {
            return "days";
        }
        else if (numberOfInstallments == 1) {
            return "M";
        }
    };
    let dueDate;
    let paymentCounter = 1;
    let paymentCounterFifteen = 1;
    let addFifteenDays = 15;
    let totalAmount = rate * loanAmount + loanAmount;
    let installment = totalAmount / numberOfInstallments;
    let capitalPerInstall = loanAmount / numberOfInstallments;
    for (let index = 0; index < numberOfInstallments; index++) {
        if (numberOfInstallments == 2) {
            paymentCounter = paymentCounterFifteen;
            dueDate = (0, moment_1.default)(loan.dueDate).add(addFifteenDays, getInstallmentType());
        }
        else {
            dueDate = (0, moment_1.default)(loan.dueDate).add(paymentCounter, getInstallmentType());
        }
        amortizationPlan.push({
            loanId: loan.loanId,
            accountNumber: loan.accountNumber,
            companyId: loan.companyId,
            status: loan.status,
            installmentOrder: paymentCounter + "ª prestação",
            amortization: capitalPerInstall,
            rateAmount: capitalPerInstall * rate,
            installment,
            dueDate: dueDate.toDate(),
        });
        if (numberOfInstallments == 2) {
            paymentCounterFifteen++;
            addFifteenDays = 30;
            console.log(addFifteenDays);
        }
        else {
            paymentCounter++;
        }
    }
    return amortizationPlan;
};
exports.simulator = simulator;
