import { Request, Response } from "express";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { LoanModel } from "../database/models/LoanModel";
import { Op } from "sequelize";
import { installmentPanification, totalsOfInstallments } from "../utils/calculateLateAmount";

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

  const credits = await LoanModel.findAll({
    where: {
      companyId: {
        companyId
      },
      dateCreated: {
        id
      }
    },
    order: [["id", "DESC"]],
  });

  return credits != null
    ? res.status(200).send({ success: true, result: credits })
    : res.status(204).send({
      success: false,
      message: "No loans registered so far.",
    });
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
    dateCreated,
    status,
  } = req.body;

  const loan = await LoanModel.create({
    accountNumber,
    companyId,
    amount,
    numberOfInstallments,
    interestRate,
    creditManager,
    loanDescription,
    dateCreated,
    status,
  });

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

  const loan = await LoanModel.update(req.body, {
    where: {
      id,
    },
  });

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
