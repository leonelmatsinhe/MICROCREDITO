import moment from "moment";
import { Installments, } from "../interfaces/Simulator";

const today = moment().format("YYYY-MM-DD")

const calculatePendingDays = (installment: any) => {
    const diffDays = moment(today).diff(
        moment(installment.dueDate),
        "days"
    );
    // Retorna apenas dias positivos (atraso), caso contrário retorna 0
    return diffDays > 0 ? diffDays : 0;
}

const latePaymentInterest = (installment: any, fine: number) => {
    const diffDays = moment(today).diff(
        moment(installment.dueDate),
        "days"
    );

    // Só calcula juros de mora se a prestação estiver atrasada (dias positivos) e não paga
    if (diffDays <= 0 || installment.status === 1) {
        return 0;
    }

    const forfeit = parseFloat(installment.installment) * fine / 100;
    return forfeit * diffDays;
}

const installmentPanification = (installments: any, forfeit: number) => {

    const installmentPlan: any[] = [];

    installments.forEach((element: any) => {
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
