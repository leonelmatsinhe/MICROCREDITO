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

  const { companyId,
    loanId,
    accountNumber,
    interestRate,
    numberOfInstallments,
    amount, dueDate, status } = req.body

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

  console.log(customerAmortizationPlan)

  const bulckInsert = await AmorizationLoanModel.bulkCreate(
    customerAmortizationPlan
  );
  await LoanModel.update({ status: 1 }, {
    where: {
      id: loanId
    }
  })
  return bulckInsert != null
    ? res
      .status(200)
      .json({ success: true, message: "Loan created successfully" })
    : res.status(204).json({
      success: true,
      message: "There was an error adding the amortization plan.",
    });
};

export { getUpcomingAmortizations, getPastAmortizations, createAmortizationLoan };
