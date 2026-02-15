import { Request, Response } from "express";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { NotificationModel } from "../database/models/NotificationModel";
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

const findTransactionsByCompany = async (req: Request, res: Response) => {
  const { id } = req.params;

  const tranzactions = await TranzactionModel.findAll({
    where: {
      companyId: id
    },
    order: [["id", "DESC"]],
  });

  return tranzactions.length > 0
    ? res.status(200).send({ success: true, result: tranzactions })
    : res.status(200).send({
      success: true,
      result: [],
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

    // Notificar o cliente sobre o pagamento recebido
    try {
      const customer: any = await CustomerModel.findOne({
        where: { accountNumber },
      });
      if (customer && companyId) {
        await NotificationModel.create({
          companyId,
          recipientType: "customer",
          recipientId: customer.id,
          title: "Pagamento confirmado",
          message: `O seu pagamento de ${Number(amount).toLocaleString("pt-MZ")} MZN foi registado com sucesso.`,
          type: "payment_received",
          referenceId: (tranzaction as any).id,
          isRead: false,
        });
      }
    } catch (err) {
      console.error("Erro ao criar notificação de pagamento:", err);
    }

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
  findTransactionsByCompany,
  getCustomerTranzactions,
  addTranzaction,
  updateTranzaction,
};
