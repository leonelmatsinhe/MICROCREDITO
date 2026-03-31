import { Request, Response } from "express";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { NotificationModel } from "../database/models/NotificationModel";
import { UserModel } from "../database/models/UserModel";
import { Op } from "sequelize";
import { installmentPanification, totalsOfInstallments } from "../utils/calculateLateAmount";
import { calculateFrenchAmortizationInstallment } from "../utils/loanAmortization";

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

const validateCapacityRule = async (params: {
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

const findLoanByCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const loans = await LoanModel.findAll({
    where: {
      accountNumber: id,
    },
    order: [["id", "DESC"]],
  });

  return loans != null
    ? res.status(200).send({ success: true, result: loans })
    : res.status(204).send({
      success: false,
      result: "No loan found with the account number you provided",
    });
};

const findAllLoans = async (req: Request, res: Response) => {
  const { id, companyId } = req.params;
  const whereClause: any = { companyId };

  // Compatibilidade com o contrato existente:
  // `id` pode vir como data (YYYY-MM-DD). Se vier "all", não filtra por data.
  if (id && id !== "all") {
    whereClause.dateCreated = id;
  }

  const credits = await LoanModel.findAll({
    where: whereClause,
    order: [["id", "DESC"]],
  });

  return res.status(200).send({ success: true, result: credits || [] });
};

const getLoanAmortization = async (req: Request, res: Response) => {
  const { id, forfeit } = req.params;
  const loans = await AmorizationLoanModel.findAll({
    where: {
      loanId: id,
    },
    order: [
      ['dueDate', 'ASC'], // Ordena por data de vencimento para garantir ordem cronológica
      ['id', 'ASC'] // Ordena por ID como critério secundário
    ],
  });

  const installments = installmentPanification(loans, parseFloat(forfeit));
  const totals = totalsOfInstallments(installments)

  return loans != null && loans.length > 0
    ? res.status(200).send({ success: true, result: installments, totals })
    : res.status(204).send({
      success: false,
      result: "No loan found with the account number you provided",
    });
};

const createLoan = async (req: Request, res: Response) => {
  let {
    accountNumber,
    companyId,
    amount,
    numberOfInstallments,
    interestRate,
    creditManager,
    loanDescription,
    capacityExcessObservation,
    dateCreated,
    status,
  } = req.body;

  const capacityValidation = await validateCapacityRule({
    accountNumber,
    companyId,
    amount,
    interestRate,
    numberOfInstallments,
    capacityExcessObservation,
  });

  if (!capacityValidation.valid) {
    return res.status(capacityValidation.statusCode || 400).json({
      success: false,
      message: capacityValidation.message,
      details: capacityValidation.details,
    });
  }

  const loan = await LoanModel.create({
    accountNumber,
    companyId,
    amount,
    numberOfInstallments,
    interestRate,
    creditManager,
    loanDescription,
    capacityExcessObservation: capacityValidation.normalizedObservation,
    dateCreated,
    status,
  });

  // Criar notificação para admin/gestor sobre nova solicitação
  if (loan) {
    try {
      // Notificar todos os admins (userRole = 0) da empresa
      const admins = await UserModel.findAll({
        where: { companyId, userRole: 0 },
      });
      const bulkNotifs: any[] = [];
      for (const admin of admins) {
        bulkNotifs.push({
          companyId,
          recipientType: "admin",
          recipientId: (admin as any).id,
          title: "Nova solicitação de crédito",
          message: `Conta ${accountNumber} solicitou um crédito de ${Number(amount).toLocaleString("pt-MZ")} MZN.`,
          type: "loan_request",
          referenceId: (loan as any).id,
          isRead: false,
        });
      }
      if (bulkNotifs.length > 0) {
        await NotificationModel.bulkCreate(bulkNotifs);
      }
    } catch (err) {
      console.error("Erro ao criar notificações de novo crédito:", err);
    }
  }

  return loan != null
    ? res
      .status(200)
      .json({ success: true, message: "Loan created successfully" })
    : res.status(204).json({
      success: false,
      message: "There was an error adding the amortization plan.",
    });
};

const updateLoan = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Buscar o empréstimo antes de atualizar para verificar mudança de status
  const previousLoan: any = await LoanModel.findByPk(id);

  if (previousLoan && Number(req.body.status) === 1) {
    const capacityValidation = await validateCapacityRule({
      accountNumber: previousLoan.accountNumber,
      companyId: previousLoan.companyId,
      amount: req.body.amount ?? previousLoan.amount,
      interestRate: req.body.interestRate ?? previousLoan.interestRate,
      numberOfInstallments:
        req.body.numberOfInstallments ?? previousLoan.numberOfInstallments,
      capacityExcessObservation:
        req.body.capacityExcessObservation ??
        previousLoan.capacityExcessObservation,
    });

    if (!capacityValidation.valid) {
      return res.status(capacityValidation.statusCode || 400).json({
        success: false,
        message: capacityValidation.message,
        details: capacityValidation.details,
      });
    }

    req.body.capacityExcessObservation = capacityValidation.normalizedObservation;
  }

  const loan = await LoanModel.update(req.body, {
    where: {
      id,
    },
  });

  // Criar notificação para o cliente quando o status muda
  if (loan && previousLoan && req.body.status !== undefined) {
    const newStatus = Number(req.body.status);
    const oldStatus = Number(previousLoan.status);

    if (newStatus !== oldStatus) {
      try {
        // Buscar cliente associado ao empréstimo
        const customer: any = await CustomerModel.findOne({
          where: { accountNumber: previousLoan.accountNumber },
        });

        if (customer) {
          let title = "";
          let message = "";
          let type = "";

          if (newStatus === 1) {
            // Aprovado
            title = "Crédito aprovado";
            message = `O seu crédito de ${Number(previousLoan.amount).toLocaleString("pt-MZ")} MZN foi aprovado.`;
            type = "loan_approved";
          } else if (newStatus === 2) {
            // Rejeitado
            title = "Crédito rejeitado";
            message = `O seu pedido de crédito de ${Number(previousLoan.amount).toLocaleString("pt-MZ")} MZN não foi aprovado.`;
            type = "loan_rejected";
          } else if (newStatus === 3) {
            // Liquidado
            title = "Crédito liquidado";
            message = `O seu crédito de ${Number(previousLoan.amount).toLocaleString("pt-MZ")} MZN foi totalmente liquidado.`;
            type = "loan_approved";
          }

          if (title) {
            await NotificationModel.create({
              companyId: previousLoan.companyId,
              recipientType: "customer",
              recipientId: customer.id,
              title,
              message,
              type,
              referenceId: Number(id),
              isRead: false,
            });
          }
        }
      } catch (err) {
        console.error("Erro ao criar notificação de atualização de crédito:", err);
      }
    }
  }

  return loan != null
    ? res
      .status(200)
      .json({ success: true, message: "Loan updated successfully" })
    : res.status(204).json({
      success: true,
      message: "There was an error updating the loan.",
    });
};

const destroyLoan = async (req: Request, res: Response) => {
  const { id } = req.params;

  const deleteLoan = await LoanModel.destroy({ where: { id: id } });

  return deleteLoan != null
    ? res.status(201).send(
      JSON.stringify({
        success: true,
        message: "Loan deleted successfully.",
      })
    )
    : res.status(204).send(
      JSON.stringify({
        success: false,
        message: "There was an error deleting the loan.",
      })
    );
};

export {
  findAllLoans,
  findLoanByCustomer,
  getLoanAmortization,
  createLoan,
  updateLoan,
  destroyLoan,
};
