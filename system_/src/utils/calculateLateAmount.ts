import moment from "moment";
import { Installments, } from "../interfaces/Simulator";

const today = moment().format("YYYY-MM-DD")

const calculatePendingDays = (installment: any) => {
    return moment(today).diff(
        installment.dueDate,
        "days"
    );
}

const latePaymentInterest = (installment: any, fine: number) => {
    const diffDays = moment(today).diff(
        installment.dueDate,
        "days"
    );

    const forfeit = installment.status === 0 ? parseFloat(installment.installment) * fine / 100 : 0
    return forfeit * diffDays;
}

const installmentPanification = (installments: any, forfeit: number) => {

    const installmentPlan: { id: any; loanId: any; installmentOrder: any; accountNumber: any; amortization: any; rateAmount: any; installment: any; dueDate: any; status: any; createdAt: any; updatedAt: any; }[] = [];

    installments.forEach((element: { id: any; loanId: any; installmentOrder: any; accountNumber: any; amortization: any; rateAmount: any; installment: any; dueDate: any; status: any; createdAt: any; updatedAt: any; }) => {
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
        }
        installmentPlan.push(installment)
    });

    return installmentPlan;
};

const totalsOfInstallments = (bills: any) => {
    const pendingInstallment = bills.filter((bill: { status: number; }) => {
        return bill.status == 0;
    });
    const totalOfCapital = pendingInstallment.reduce((sum: any, p: {
        installment: number;
    }) => sum + p.installment, 0);

    const totalOfOverDue = bills.reduce((sum: any, p: {
        latePaymentInterest: number;
    }) => sum + p.latePaymentInterest, 0);

    const accumulatedAmount = totalOfCapital + totalOfOverDue

    return { totalOfCapital, totalOfOverDue, accumulatedAmount };
}

export { installmentPanification, totalsOfInstallments };
