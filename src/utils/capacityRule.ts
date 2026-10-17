import { CustomerModel } from "../database/models/CustomerModel";
import { calculateFrenchAmortizationInstallment } from "./loanAmortization";

/**
 * REGRA DE CAPACIDADE DE PAGAMENTO (1/3 do rendimento mensal)
 *
 * Extraída do LoanController para poder ser aplicada também no motor de
 * alçadas (loanApprovalService) com a precedência correcta: alçada →
 * capacidade → garantias. Comportamento idêntico ao original.
 */

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateInstallmentValue = (
  amount: any,
  interestRate: any,
  numberOfInstallments: any
) => {
  const principal = toNumber(amount);
  const rate = toNumber(interestRate);
  const installments = Math.max(1, parseInt(String(numberOfInstallments || 1), 10));

  if (principal <= 0) return 0;
  if (rate <= 0) return principal / installments;

  return calculateFrenchAmortizationInstallment(principal, rate, installments);
};

const normalizeCapacityObservation = (value: any) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

export const validateCapacityRule = async (params: {
  accountNumber: any;
  companyId: any;
  amount: any;
  interestRate: any;
  numberOfInstallments: any;
  capacityExcessObservation?: any;
}) => {
  const customer: any = await CustomerModel.findOne({
    where: {
      accountNumber: params.accountNumber,
      companyId: params.companyId,
    },
    attributes: ["accountNumber", "customerMonthlySalary"],
  });

  if (!customer) {
    return {
      valid: false,
      statusCode: 404,
      message: "Mutuário não encontrado para validar capacidade de pagamento.",
    };
  }

  const monthlySalary = toNumber(customer.customerMonthlySalary);
  const maxCapacity = monthlySalary / 3;
  const estimatedInstallment = calculateInstallmentValue(
    params.amount,
    params.interestRate,
    params.numberOfInstallments
  );
  const isExceeded = estimatedInstallment > maxCapacity;
  const observation = normalizeCapacityObservation(params.capacityExcessObservation);

  if (isExceeded && observation.length < 10) {
    return {
      valid: false,
      statusCode: 400,
      message:
        "A prestação excede 1/3 do rendimento mensal. Informe um parecer/observação com no mínimo 10 caracteres.",
      details: {
        maxCapacity,
        estimatedInstallment,
      },
    };
  }

  return {
    valid: true,
    maxCapacity,
    estimatedInstallment,
    isExceeded,
    normalizedObservation: observation || null,
  };
};
