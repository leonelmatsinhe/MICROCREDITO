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

const findPaginatedTransactions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      page = "1",
      limit = "15",
      fromDate,
      toDate,
      search,
      paymentMethod,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = { companyId: id };

    if (fromDate && toDate) {
      whereClause.createdAt = {
        [Op.between]: [
          new Date(`${fromDate}T00:00:00`),
          new Date(`${toDate}T23:59:59`),
        ],
      };
    } else if (fromDate) {
      whereClause.createdAt = {
        [Op.gte]: new Date(`${fromDate}T00:00:00`),
      };
    } else if (toDate) {
      whereClause.createdAt = {
        [Op.lte]: new Date(`${toDate}T23:59:59`),
      };
    }

    if (paymentMethod && paymentMethod !== "0") {
      whereClause.paymentMethod = parseInt(paymentMethod as string);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      whereClause[Op.or] = [
        { accountNumber: { [Op.like]: searchTerm } },
        { tranzactionReference: { [Op.like]: searchTerm } },
        { staffName: { [Op.like]: searchTerm } },
        { description: { [Op.like]: searchTerm } },
      ];
    }

    const { count, rows } = await TranzactionModel.findAndCountAll({
      where: whereClause,
      order: [["id", "DESC"]],
      limit: limitNum,
      offset,
    });

    const totalPages = Math.ceil(count / limitNum);

    // Calculate totals for the filtered dataset (all pages)
    const allFiltered = await TranzactionModel.findAll({
      where: whereClause,
      attributes: ["amount", "latePaymentInterest", "interestRateAmount"],
    });

    const totals = {
      totalAmount: allFiltered.reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
      totalLateInterest: allFiltered.reduce((sum: number, t: any) => sum + (t.latePaymentInterest || 0), 0),
      totalInterestRate: allFiltered.reduce((sum: number, t: any) => sum + (t.interestRateAmount || 0), 0),
    };

    return res.status(200).json({
      success: true,
      result: rows,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: count,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      totals,
    });
  } catch (error: any) {
    console.error("Erro ao buscar transacções paginadas:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro interno ao buscar transacções.",
    });
  }
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
  findPaginatedTransactions,
  getCustomerTranzactions,
  addTranzaction,
  updateTranzaction,
};
