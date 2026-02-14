import moment from "moment";
import { Request, Response } from "express";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { Op } from "sequelize";
import { simulator } from "../utils/loanAmortization";
import { LoanModel } from "../database/models/LoanModel";

const endOfMonth = moment().format("YYYY-MM-") + moment().daysInMonth();
// 2022-10-28 17:41:11
const today = moment().format("YYYY-MM-DD HH:mm:ss");
const thirtyDaysBefore = moment().subtract(30, "days").toDate();

const getUpcomingAmortizations = async (req: Request, res: Response) => {
  const { id } = req.params;
  const loans = await AmorizationLoanModel.findAll({
    where: {
      dueDate: {
        [Op.between]: [today, endOfMonth],
      },
      companyId: id,
    },
  });

  return loans != null
    ? res.status(200).send({ success: true, result: loans })
    : res.status(204).send({
      success: false,
      result: "No loan found with the account number you provided",
    });
};

const getPastAmortizations = async (req: Request, res: Response) => {
  const { id } = req.params;
  const pastAmortizations = await AmorizationLoanModel.findAll({
    where: {
      dueDate: {
        [Op.lt]: today,
        // [Op.gt]: thirtyDaysBefore,
      },
      companyId: id,
    },
  });

  return pastAmortizations != null
    ? res.status(200).send({ success: true, result: pastAmortizations })
    : res.status(204).send({
      success: false,
      result: "No loan found with the account number you provided",
    });
};

const createAmortizationLoan = async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      loanId,
      accountNumber,
      interestRate,
      numberOfInstallments,
      amount,
      dueDate,
      status
    } = req.body;

    // Validações de entrada
    if (!companyId || !loanId || !accountNumber || !interestRate || !numberOfInstallments || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios faltando. Verifique: companyId, loanId, accountNumber, interestRate, numberOfInstallments, amount, dueDate",
      });
    }

    const loanAmount = parseFloat(amount);
    const rate = parseFloat(interestRate);
    const installments = parseInt(numberOfInstallments);

    if (isNaN(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "O valor do empréstimo deve ser maior que zero.",
      });
    }

    if (isNaN(rate) || rate < 0) {
      return res.status(400).json({
        success: false,
        message: "A taxa de juros deve ser um número positivo ou zero.",
      });
    }

    if (isNaN(installments) || installments <= 0) {
      return res.status(400).json({
        success: false,
        message: "O número de prestações deve ser maior que zero.",
      });
    }

    // Verifica se já existe um plano de amortização para este empréstimo
    const existingAmortization = await AmorizationLoanModel.findOne({
      where: { loanId }
    });

    if (existingAmortization) {
      return res.status(409).json({
        success: false,
        message: "Já existe um plano de amortização para este empréstimo.",
      });
    }

    // Gera o plano de amortização usando o sistema francês
    const customerAmortizationPlan = simulator({
      companyId,
      loanId,
      accountNumber,
      interestRate,
      numberOfInstallments,
      amount,
      dueDate,
      status
    });

    // Insere o plano de amortização no banco de dados
    const bulckInsert = await AmorizationLoanModel.bulkCreate(
      customerAmortizationPlan
    );

    // Atualiza o status do empréstimo
    await LoanModel.update(
      { status: 1 },
      {
        where: {
          id: loanId
        }
      }
    );

    return bulckInsert != null && bulckInsert.length > 0
      ? res.status(200).json({
        success: true,
        message: "Plano de amortização criado com sucesso",
        installmentsCount: bulckInsert.length
      })
      : res.status(500).json({
        success: false,
        message: "Erro ao criar o plano de amortização.",
      });
  } catch (error: any) {
    console.error("Erro ao criar plano de amortização:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro interno ao processar o plano de amortização.",
    });
  }
};

export { getUpcomingAmortizations, getPastAmortizations, createAmortizationLoan };
