import { GuarateeAssessmentModel } from "../database/models/GuarateeAssessmentModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { simulator } from "../utils/loanAmortization";

/**
 * COBERTURA DE GARANTIAS — valor do crédito + juros.
 *
 * Regra de negócio: o cadastro de garantias é a BASE INICIAL DE ANÁLISE. Um
 * crédito NÃO pode ser aprovado/desembolsado sem pelo menos UMA garantia
 * registada (loan_guarantees) e enquanto o valor dessas garantias
 * (purchaseAmount) não cobrir o TOTAL A PAGAR do crédito (capital + juros do
 * plano de amortização). Sem plano nem valores, falha fechado.
 *
 * O total exigido é sempre o mais fiável disponível:
 *   1. se já existe plano de amortização gravado → Σ das prestações (a dívida
 *      real que o mutuário vai assumir);
 *   2. caso contrário → o mesmo `simulator` (Price) que createAmortizationLoan
 *      usa para gerar o plano, com os valores do corpo/pedido — ou seja, o
 *      total exigido é exactamente o total que será gerado na aprovação.
 *
 * Ponto de aplicação (autoridade = backend):
 *   - POST /api/createInstallmentsLoan/  → createAmortizationLoan (aprova+desembolsa);
 *   - PUT  /api/loan/:id                 → updateLoan quando status → 1;
 *   - POST /api/loan/:id/approve         → approveLoan (alçadas);
 *   - POST /api/loan/:id/prepare-disbursement → prepareLoanDisbursement;
 *   - DELETE /api/deleteGuarantee/:id    → impede baixar a cobertura abaixo do
 *                                           total a pagar de um crédito activo;
 *   - GET  /api/loan/:id/guarantee-coverage → UI (aviso/bloqueio antes de aprovar).
 */

const round2 = (value: number): number => {
    const r = Math.round((value + Number.EPSILON) * 100) / 100;
    return Object.is(r, -0) ? 0 : r;
};

const toNumber = (value: any): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (value: number): string =>
    Number(value || 0).toLocaleString("pt-MZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export type CoverageSource = "plan" | "simulated" | "amount";

/**
 * Porque é que a cobertura NÃO permite aprovar:
 *  · NO_GUARANTEES     — nenhuma garantia registada (cadastro obrigatório);
 *  · INSUFFICIENT       — garantias registadas, mas abaixo do total a pagar;
 *  · INVALID_REQUIRED   — não foi possível apurar o total a pagar (nunca aprova);
 *  · null               — coberto.
 */
export type CoverageReason = "NO_GUARANTEES" | "INSUFFICIENT" | "INVALID_REQUIRED" | null;

export interface GuaranteeCoverage {
    loanId: number;
    /** Nº de garantias registadas para o crédito. */
    guaranteeCount: number;
    /** Σ purchaseAmount das garantias (MZN). */
    guaranteesTotal: number;
    /** Total a pagar exigido: capital + juros (MZN). */
    requiredTotal: number;
    /** Quanto falta para cobrir o total (0 quando coberto). */
    shortfall: number;
    /** true só quando HÁ garantias registadas e cobrem o total a pagar. */
    covered: boolean;
    /** true quando existe pelo menos uma garantia registada. */
    registered: boolean;
    /** Garantias / total exigido × 100 (0 quando não há dívida). */
    coveragePct: number;
    /** De onde veio o total exigido: plano gravado, simulação Price ou capital. */
    source: CoverageSource;
    /** Motivo do bloqueio (null quando coberto). */
    reason: CoverageReason;
}

/**
 * DECISÃO DE COBERTURA (função pura — sem base de dados).
 *
 * Regra de negócio: o cadastro de garantias é a BASE INICIAL DE ANÁLISE — um
 * crédito não pode ser aprovado/desembolsado sem, no mínimo, UMA garantia
 * registada, e o valor dessas garantias tem de cobrir o total a pagar
 * (capital + juros).
 *
 * Fail-closed: se o total a pagar for desconhecido (≤ 0), NÃO aprova.
 */
export const evaluateGuaranteeCoverage = (params: {
    guaranteeCount: any;
    guaranteesTotal: any;
    requiredTotal: any;
}): Pick<GuaranteeCoverage, "guaranteeCount" | "guaranteesTotal" | "requiredTotal" | "shortfall" | "covered" | "registered" | "coveragePct" | "reason"> => {
    const guaranteeCount = Math.max(0, Math.trunc(toNumber(params.guaranteeCount)));
    const guaranteesTotal = round2(Math.max(0, toNumber(params.guaranteesTotal)));
    const requiredTotal = round2(toNumber(params.requiredTotal));

    const shortfall = round2(Math.max(0, requiredTotal - guaranteesTotal));
    const registered = guaranteeCount > 0;

    let reason: CoverageReason = null;
    if (requiredTotal <= 0) {
        reason = "INVALID_REQUIRED";
    } else if (!registered) {
        reason = "NO_GUARANTEES";
    } else if (guaranteesTotal + 0.005 < requiredTotal) {
        reason = "INSUFFICIENT";
    }

    const coveragePct =
        requiredTotal > 0
            ? Math.round((guaranteesTotal / requiredTotal) * 1000) / 10
            : 0;

    return {
        guaranteeCount,
        guaranteesTotal,
        requiredTotal,
        shortfall,
        covered: reason === null,
        registered,
        coveragePct,
        reason,
    };
};

export interface CoverageInput {
    /** Registo do crédito ( LoanModel instance ou POJO com id/amount/... ). */
    loan: any;
    /** Valores do corpo do pedido — só usados quando ainda NÃO existe plano. */
    amount?: any;
    interestRate?: any;
    numberOfInstallments?: any;
    dueDate?: any;
}

/**
 * Calcula a cobertura de garantias de um crédito.
 * Lança apenas se o crédito não for encontrabilável (id inválido).
 */
export const getGuaranteeCoverage = async (
    input: CoverageInput
): Promise<GuaranteeCoverage> => {
    const { loan } = input;
    if (!loan) {
        throw new Error("Crédito não encontrado para avaliar garantias.");
    }
    const loanId = Number(loan.getDataValue ? loan.getDataValue("id") : loan.id);

    // ── 1. Garantias registadas ──
    const guaranteeCountRaw = await GuarateeAssessmentModel.count({
        where: { loanId },
    });
    const guaranteesSum = await GuarateeAssessmentModel.sum("purchaseAmount", {
        where: { loanId },
    });
    const guaranteeCount = Number(guaranteeCountRaw) || 0;
    const guaranteesTotal = round2(toNumber(guaranteesSum));

    // ── 2. Total exigido: capital + juros ──
    // Plano gravado = verdade de dívida (usa-se SEMPRE que exista).
    const planSum = await AmorizationLoanModel.sum("installment", {
        where: { loanId },
    });
    let requiredTotal = 0;
    let source: CoverageSource = "amount";

    if (toNumber(planSum) > 0) {
        requiredTotal = round2(toNumber(planSum));
        source = "plan";
    } else {
        const amount = toNumber(
            input.amount !== undefined && input.amount !== null
                ? input.amount
                : loan.getDataValue
                    ? loan.getDataValue("amount")
                    : loan.amount
        );
        const interestRate = toNumber(
            input.interestRate !== undefined && input.interestRate !== null
                ? input.interestRate
                : loan.getDataValue
                    ? loan.getDataValue("interestRate")
                    : loan.interestRate
        );
        const numberOfInstallments = parseInt(
            String(
                input.numberOfInstallments !== undefined && input.numberOfInstallments !== null
                    ? input.numberOfInstallments
                    : loan.getDataValue
                        ? loan.getDataValue("numberOfInstallments")
                        : loan.numberOfInstallments
            ),
            10
        );
        const dueDateRaw =
            input.dueDate ||
            (loan.getDataValue ? loan.getDataValue("disbursementDate") : loan.disbursementDate) ||
            (loan.getDataValue ? loan.getDataValue("dateCreated") : loan.dateCreated) ||
            new Date().toISOString().slice(0, 10);
        const dueDate = String(dueDateRaw).slice(0, 10);

        if (amount > 0 && numberOfInstallments > 0 && interestRate >= 0) {
            try {
                // Mesmo gerador Price usado no desembolso → paridade exacta.
                const plan = simulator({
                    amount,
                    numberOfInstallments,
                    interestRate,
                    dueDate,
                    loanId,
                    accountNumber: loan.getDataValue
                        ? loan.getDataValue("accountNumber")
                        : loan.accountNumber,
                    companyId: loan.getDataValue
                        ? loan.getDataValue("companyId")
                        : loan.companyId,
                    status: 0,
                } as any);
                const total = plan.reduce(
                    (sum: number, row: any) => sum + toNumber(row.installment),
                    0
                );
                if (total > 0) {
                    requiredTotal = round2(total);
                    source = "simulated";
                } else if (amount > 0) {
                    requiredTotal = round2(amount);
                    source = "amount";
                }
            } catch {
                // Valores inválidos para simular → exigir pelo menos o capital.
                requiredTotal = round2(amount);
                source = "amount";
            }
        } else if (amount > 0) {
            requiredTotal = round2(amount);
            source = "amount";
        }
    }

    return {
        loanId,
        ...evaluateGuaranteeCoverage({ guaranteeCount, guaranteesTotal, requiredTotal }),
        source,
    };
};

/** Mensagem de bloqueio (PT) usada nos erros 400/409 da API. */
export const guaranteeCoverageMessage = (coverage: GuaranteeCoverage): string => {
    if (coverage.reason === "NO_GUARANTEES") {
        return (
            `Nenhuma garantia registada neste crédito. O cadastro de garantias é obrigatório ` +
            `antes da aprovação (é a base inicial de análise): registe pelo menos uma garantia ` +
            `com valor avaliado de ${fmtMoney(coverage.requiredTotal)} MZN — total a pagar ` +
            `(capital + juros) — no detalhe do mutuário, aba «Garantias & Recibos».`
        );
    }
    if (coverage.reason === "INVALID_REQUIRED") {
        return (
            `Não foi possível apurar o total a pagar deste crédito (capital + juros): ` +
            `verifique o montante, a taxa de juro e o número de prestações antes de aprovar.`
        );
    }
    const guaranteeLabel =
        coverage.guaranteeCount === 1 ? "1 garantia" : `${coverage.guaranteeCount} garantias`;
    return (
        `Garantias insuficientes: ${guaranteeLabel} registadas no valor de ${fmtMoney(
            coverage.guaranteesTotal
        )} MZN, mas o total a pagar deste crédito (capital + juros) é de ${fmtMoney(
            coverage.requiredTotal
        )} MZN. Faltam ${fmtMoney(coverage.shortfall)} MZN. ` +
        `Registe garantias que cubram o total antes de aprovar o crédito.`
    );
};

/** Resposta 400/409 padrão para os controllers. */
export const guaranteeCoverageError = (coverage: GuaranteeCoverage) => ({
    success: false,
    error: coverage.reason === "NO_GUARANTEES" ? "GARANTIAS_AUSENTES" : "GARANTIAS_INSUFICIENTES",
    reason: coverage.reason,
    message: guaranteeCoverageMessage(coverage),
    details: coverage,
});
