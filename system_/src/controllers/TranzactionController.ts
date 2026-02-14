import { Request, Response } from "express";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { Op } from "sequelize";

const findAlltranzactions = async (req: Request, res: Response) => {
  const { from, companyId } = req.query;

  const tranzactions = await TranzactionModel.findAll({
    where: {
      companyId
    },
  });
  return tranzactions.length > 0
    ? res.status(200).send({ success: true, result: tranzactions })
    : res.status(204).send({
      success: false,
      message: "No transactions registered so far.",
    });
};

const getCustomerTranzactions = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tranzaction = await TranzactionModel.findAll({
    where: {
      accountNumber: id,
    },
  });
  return tranzaction
    ? res.status(200).send({ success: true, result: tranzaction })
    : res.status(204).send({
      success: false,
      result: "No transactions found with the ID provided",
    });
};

const addTranzaction = async (req: Request, res: Response) => {
  let {
    companyId,
    accountNumber,
    amortizationLoanId,
    amount,
    latePaymentInterest,
    interestRateAmount,
    phoneNumber,
    tranzactionReference,
    paymentMethod,
    description,
    receiptUrl,
    staffName,
    loanId,
    paymentDate,
  } = req.body;

  const tranzaction = await TranzactionModel.create({
    companyId,
    accountNumber,
    amortizationLoanId,
    amount,
    latePaymentInterest,
    interestRateAmount,
    phoneNumber,
    tranzactionReference,
    paymentMethod,
    description,
    receiptUrl,
    staffName,
    loanId,
    paymentDate,
  });
  if (tranzaction != null) {
    const updateAmortizationLoan = await AmorizationLoanModel.update(
      {
        status: 1,
      },
      {
        where: {
          id: amortizationLoanId,
        },
      }
    );
    return updateAmortizationLoan != null
      ? res
        .status(201)
        .send({ success: true, message: "Payment updated successfully." })
      : res.status(500).send({
        success: false,
        message: "There was an error in the payment.",
      });
  } else {
    return res
      .status(500)
      .send({ success: false, message: "There was an error in the payment." });
  }
};

const updateTranzaction = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tranzaction = await TranzactionModel.update(req.body, {
    where: {
      id,
    },
  });
  return tranzaction != null
    ? res
      .status(201)
      .send({ success: true, message: "Payment updated successfully." })
    : res.status(500).send({ success: false, message: "Not found" });
};

export {
  findAlltranzactions,
  getCustomerTranzactions,
  addTranzaction,
  updateTranzaction,
};
