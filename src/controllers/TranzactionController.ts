import { Request, Response } from "express";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { NotificationModel } from "../database/models/NotificationModel";
import { UserModel } from "../database/models/UserModel";
import { Op, fn, col } from "sequelize";

const findAlltranzactions = async (req: Request, res: Response) => {
  const { from, to, companyId } = req.query;
  if (!companyId) {
    return res.status(400).send({
      success: false,
      message: "companyId is required.",
    });
  }

  const whereClause: any = {
    companyId,
  };
  if (from && to) {
    whereClause.createdAt = {
      [Op.between]: [
        new Date(`${from}T00:00:00`),
        new Date(`${to}T23:59:59`),
      ],
    };
  } else if (from) {
    whereClause.createdAt = {
      [Op.gte]: new Date(`${from}T00:00:00`),
    };
  } else if (to) {
    whereClause.createdAt = {
      [Op.lte]: new Date(`${to}T23:59:59`),
    };
  }

  const tranzactions = await TranzactionModel.findAll({
    where: whereClause,
    order: [["id", "DESC"]],
  });
  return res.status(200).send({ success: true, result: tranzactions || [] });
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
      creditManager,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = { companyId: id };

    // Filtrar por gestor de crédito (buscar loanIds do gestor)
    if (creditManager) {
      const managerLoans = await LoanModel.findAll({
        where: {
          companyId: id,
          creditManager: parseInt(creditManager as string),
        },
        attributes: ["id"],
      });
      const managerLoanIds = managerLoans.map((l: any) => l.id);
      if (managerLoanIds.length === 0) {
        return res.status(200).json({
          success: true,
          result: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limitNum,
            hasNextPage: false,
            hasPrevPage: false,
          },
          totals: { totalAmount: 0, totalLateInterest: 0, totalInterestRate: 0 },
        });
      }
      whereClause.loanId = { [Op.in]: managerLoanIds };
    }

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

    // Calculate totals for the filtered dataset directly in SQL
    const totalsResult: any = await TranzactionModel.findOne({
      where: whereClause,
      attributes: [
        [fn("COALESCE", fn("SUM", col("amount")), 0), "totalAmount"],
        [fn("COALESCE", fn("SUM", col("latePaymentInterest")), 0), "totalLateInterest"],
        [fn("COALESCE", fn("SUM", col("interestRateAmount")), 0), "totalInterestRate"],
      ],
      raw: true,
    });

    const totals = {
      totalAmount: Number(totalsResult?.totalAmount || 0),
      totalLateInterest: Number(totalsResult?.totalLateInterest || 0),
      totalInterestRate: Number(totalsResult?.totalInterestRate || 0),
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

    // ── Verificar se o crédito foi totalmente liquidado ──
    try {
      let effectiveLoanId = loanId;
      if (!effectiveLoanId && amortizationLoanId) {
        const amort: any = await AmorizationLoanModel.findByPk(amortizationLoanId);
        if (amort) effectiveLoanId = amort.loanId;
      }
      if (effectiveLoanId) {
        await checkAndLiquidateLoan(effectiveLoanId, companyId, accountNumber);
      }
    } catch (err) {
      console.error("Erro ao verificar liquidação do crédito:", err);
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

/**
 * Verifica se todas as prestações de um crédito foram pagas (status = 1).
 * Se sim, actualiza o status do crédito para 3 (Liquidado) e notifica
 * o cliente, os admins e o gestor de crédito.
 */
const checkAndLiquidateLoan = async (
  loanId: number,
  companyId: number,
  accountNumber: number
) => {
  const allInstallments = await AmorizationLoanModel.findAll({
    where: { loanId },
  });

  if (allInstallments.length === 0) return;

  const allPaid = allInstallments.every((inst: any) => Number(inst.status) === 1);
  if (!allPaid) return;

  // Verificar se o crédito já não está liquidado
  const loan: any = await LoanModel.findByPk(loanId);
  if (!loan || Number(loan.status) === 3) return;

  // Actualizar status do crédito para Liquidado (3)
  await LoanModel.update({ status: 3 }, { where: { id: loanId } });

  const loanAmount = Number(loan.amount).toLocaleString("pt-MZ");

  // Notificar o cliente
  try {
    const customer: any = await CustomerModel.findOne({
      where: { accountNumber },
    });
    if (customer) {
      await NotificationModel.create({
        companyId,
        recipientType: "customer",
        recipientId: customer.id,
        title: "Crédito liquidado",
        message: `Parabéns! O seu crédito de ${loanAmount} MZN foi totalmente liquidado. Todas as prestações foram pagas com sucesso.`,
        type: "loan_approved",
        referenceId: loanId,
        isRead: false,
      });
    }
  } catch (err) {
    console.error("Erro ao notificar cliente sobre liquidação:", err);
  }

  // Notificar admins
  try {
    const admins = await UserModel.findAll({
      where: { companyId, userRole: 0 },
    });
    const bulkNotifs: any[] = [];
    for (const admin of admins) {
      bulkNotifs.push({
        companyId,
        recipientType: "admin",
        recipientId: (admin as any).id,
        title: "Crédito liquidado",
        message: `O crédito de ${loanAmount} MZN (conta ${accountNumber}) foi totalmente liquidado.`,
        type: "payment_received",
        referenceId: loanId,
        isRead: false,
      });
    }
    if (bulkNotifs.length > 0) {
      await NotificationModel.bulkCreate(bulkNotifs);
    }
  } catch (err) {
    console.error("Erro ao notificar admins sobre liquidação:", err);
  }

  // Notificar o gestor de crédito
  try {
    if (loan.creditManager) {
      await NotificationModel.create({
        companyId,
        recipientType: "gestor",
        recipientId: loan.creditManager,
        title: "Crédito liquidado",
        message: `O crédito de ${loanAmount} MZN (conta ${accountNumber}) foi totalmente liquidado.`,
        type: "payment_received",
        referenceId: loanId,
        isRead: false,
      });
    }
  } catch (err) {
    console.error("Erro ao notificar gestor sobre liquidação:", err);
  }
};

export {
  findAlltranzactions,
  findTransactionsByCompany,
  findPaginatedTransactions,
  getCustomerTranzactions,
  addTranzaction,
  updateTranzaction,
  checkAndLiquidateLoan,
};
