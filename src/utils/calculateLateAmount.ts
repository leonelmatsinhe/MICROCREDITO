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
const latePaymentInterest = (installment: any, fine: number) => {
    const diffDays = moment(today).diff(
        moment(installment.dueDate),
        "days"
    );

    // Calcula juros de mora se atrasada (dias positivos)
    // Status 1 = totalmente pago (sem juros)
    // Status 0 = pendente (com juros)
    // Status -1 = parcialmente pago (com juros sobre o que falta)
    if (diffDays <= 0 || installment.status === 1) {
        return 0;
    }

    // Converte a percentagem para taxa decimal: ex: 2 → 0.02
    const dailyRate = fine / 100;
    const dailyPenalty = parseFloat(installment.installment) * dailyRate;
    return Math.round(dailyPenalty * diffDays * 100) / 100;
}

const installmentPanification = (installments: any, forfeit: number) => {

    const installmentPlan: any[] = [];
    // Calculate total loan amount from all installments
    const totalLoanAmount = installments.reduce((sum: number, el: any) => sum + (parseFloat(el.installment) || 0), 0);
    // Track cumulative amortization to calculate remaining balance dynamically
    let cumulativeAmortization = 0;

    installments.forEach((element: any, index: number) => {
        const amortizationAmount = parseFloat(element.amortization) || 0;
        // Remaining balance = Total loan - sum of amortization portions of all installments up to this one
        const calculatedRemainingBalance = totalLoanAmount - cumulativeAmortization - amortizationAmount;
        cumulativeAmortization += amortizationAmount;

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
            // Saldo devedor calculado dinamicamente (Sistema Francês)
            remainingBalance: Math.max(0, Math.round(calculatedRemainingBalance * 100) / 100),
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
