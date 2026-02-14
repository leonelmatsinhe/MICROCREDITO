"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalsOfInstallments = exports.installmentPanification = void 0;
const moment_1 = __importDefault(require("moment"));
const today = (0, moment_1.default)().format("YYYY-MM-DD");
const calculatePendingDays = (installment) => {
    return (0, moment_1.default)(today).diff(installment.dueDate, "days");
};
const latePaymentInterest = (installment, fine) => {
    const diffDays = (0, moment_1.default)(today).diff(installment.dueDate, "days");
    const forfeit = installment.status === 0 ? parseFloat(installment.installment) * fine / 100 : 0;
    return forfeit * diffDays;
};
const installmentPanification = (installments, forfeit) => {
    const installmentPlan = [];
    installments.forEach((element) => {
        const installment = {
            id: element.id,
            loanId: element.loanId,
            installmentOrder: element.installmentOrder,
            accountNumber: element.accountNumber,
            amortization: element.amortization,
            rateAmount: element.rateAmount,
            installment: element.installment,
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
