import { Request, Response } from "express";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { NotificationModel } from "../database/models/NotificationModel";
import { UserModel } from "../database/models/UserModel";
import { Op, fn, col } from "sequelize";
import { enqueuePaymentSms } from "../services/SmsGatewayService";
import { CompanyModel } from "../database/models/CompanyModel";
import { installmentPanification } from "../utils/calculateLateAmount";

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
  const { from, to, limit } = req.query;

  const whereClause: any = {
    companyId: id,
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

  const queryOptions: any = {
    where: whereClause,
    order: [["id", "DESC"]],
  };
  if (limit) {
    const parsedLimit = parseInt(limit as string, 10);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      queryOptions.limit = parsedLimit;
    }
  }

  const tranzactions = await TranzactionModel.findAll({
    ...queryOptions,
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

/**
 * Todos os pagamentos de prestações da empresa, enriquecidos com o nome/telefone
 * do mutuário e com a prestação (nº e vencimento) a que cada pagamento se refere.
 * Usado pela página dedicada "Pagamentos" (apresentação + exportação PDF/Excel).
 */
const findAllPaymentsOverview = async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(String(req.params.companyId), 10);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, message: "companyId inválido." });
    }

    const tranzactions: any[] = (await TranzactionModel.findAll({
      where: { companyId },
      order: [["paymentDate", "DESC"], ["id", "DESC"]],
      raw: true,
    })) as any[];

    if (tranzactions.length === 0) {
      return res.status(200).json({ success: true, result: [] });
    }

    // Mutuários — nome e telefone por conta
    const accountNumbers = [...new Set(tranzactions.map((t: any) => t.accountNumber))];
    const customers: any[] = (await CustomerModel.findAll({
      where: { companyId, accountNumber: { [Op.in]: accountNumbers } },
      attributes: ["accountNumber", "customerName", "customerPhone"],
      raw: true,
    })) as any[];
    const customerByAccount: Record<string, any> = {};
    customers.forEach((c: any) => {
      customerByAccount[String(c.accountNumber)] = c;
    });

    // Prestações — nº de ordem e vencimento a que o pagamento se refere
    const amortIds = [...new Set(
      tranzactions.map((t: any) => t.amortizationLoanId).filter((v: any) => v != null)
    )];
    const amortById: Record<number, any> = {};
    if (amortIds.length > 0) {
      const amortizations: any[] = (await AmorizationLoanModel.findAll({
        where: { id: { [Op.in]: amortIds } },
        attributes: ["id", "installmentOrder", "dueDate", "installment", "paidAmount", "status"],
        raw: true,
      })) as any[];
      amortizations.forEach((a: any) => {
        amortById[Number(a.id)] = a;
      });
    }

    const displayedLateByPaymentGroup: Record<string, boolean> = {};
    const result = tranzactions.map((t: any) => {
      const customer = customerByAccount[String(t.accountNumber)] || null;
      const amort = amortById[Number(t.amortizationLoanId)] || null;
      const paymentDate = String(t.paymentDate || t.createdAt || '').slice(0, 10);
      const paymentGroup = `${Number(t.amortizationLoanId) || 0}:${paymentDate}`;
      const rawLateInterest = Number(t.latePaymentInterest) || 0;
      // Registos antigos podem repetir a mesma mora em pagamentos parciais
      // da mesma prestação no mesmo dia. Apresentar a mora uma só vez.
      const displayedLateInterest = rawLateInterest > 0 && !displayedLateByPaymentGroup[paymentGroup]
        ? rawLateInterest
        : 0;
      if (displayedLateInterest > 0) displayedLateByPaymentGroup[paymentGroup] = true;
      const discountAmount = Number(t.discountAmount) || 0;
      const totalAmount = Number(t.totalAmount) || (Number(t.amount) || 0) + displayedLateInterest - discountAmount;
      return {
        ...t,
        latePaymentInterest: displayedLateInterest,
        displayedLatePaymentInterest: displayedLateInterest,
        totalAmount: Math.round(totalAmount * 100) / 100,
        customerName: customer?.customerName || `Conta ${t.accountNumber}`,
        customerPhone: customer?.customerPhone || "",
        installmentOrder: amort?.installmentOrder ?? null,
        installmentDueDate: amort?.dueDate ? String(amort.dueDate).slice(0, 10) : null,
        installmentValue: amort?.installment ?? null,
        installmentPaidAmount: amort?.paidAmount ?? null,
        installmentStatus: amort?.status ?? null,
      };
    });

    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("findAllPaymentsOverview:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao listar pagamentos." });
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

const getLoanLateInterest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const loan: any = await LoanModel.findByPk(id, { attributes: ["id", "companyId", "status"] });
  if (!loan) return res.status(404).json({ success: false, message: "Crédito não encontrado." });

  const transactions: any[] = await TranzactionModel.findAll({
    where: { loanId: id },
    attributes: ["latePaymentInterest", "paymentDate"],
    raw: true,
  });
  const lateInterestByDate: Record<string, number> = {};
  transactions.forEach((transaction: any) => {
    const date = String(transaction.paymentDate || "").slice(0, 10);
    lateInterestByDate[date] = Math.max(
      lateInterestByDate[date] || 0,
      Number(transaction.latePaymentInterest) || 0
    );
  });
  const chargedLateInterest = Object.values(lateInterestByDate).reduce(
    (sum: number, interest: number) => sum + interest,
    0
  );

  let totalLateInterest = chargedLateInterest;
  if (Number(loan.status) === 1) {
    const company = await CompanyModel.findByPk(loan.companyId, { attributes: ["forfeit"] });
    const pendingInstallments = await AmorizationLoanModel.findAll({
      where: { loanId: id, status: { [Op.ne]: 1 } },
    });
    const calculated = installmentPanification(
      pendingInstallments,
      Number(company?.getDataValue("forfeit") || 0)
    );
    totalLateInterest = calculated.reduce(
      (sum: number, installment: any) => sum + (Number(installment.latePaymentInterest) || 0),
      0
    );
  }

  return res.status(200).json({
    success: true,
    result: {
      totalLateInterest: Math.round(totalLateInterest * 100) / 100,
      chargedLateInterest: Math.round(chargedLateInterest * 100) / 100,
      source: Number(loan.status) === 1 ? "pending" : "charged",
    },
  });
};

const addTranzaction = async (req: Request, res: Response) => {
  let {
    companyId,
    accountNumber,
    amortizationLoanId,
    amount,
    totalAmount,
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
    discountApplied,
    notes,
  } = req.body;

  const todayDate = new Date().toISOString().slice(0, 10);
  if (paymentDate && String(paymentDate).slice(0, 10) > todayDate) {
    return res.status(400).send({ success: false, message: "A data de pagamento não pode ser futura." });
  }

  // ── Buscar a prestação para comparar valores ──
  const installment: any = await AmorizationLoanModel.findByPk(amortizationLoanId);
  if (!installment) {
    return res.status(404).send({ success: false, message: "Prestação não encontrada." });
  }
  const loan = await LoanModel.findByPk(installment.loanId, { attributes: ["companyId"] });
  const company = loan
    ? await CompanyModel.findByPk(loan.getDataValue("companyId"), { attributes: ["forfeit"] })
    : null;
  const paymentReferenceDate = paymentDate || new Date().toISOString().slice(0, 10);
  const calculatedInstallment = installmentPanification(
    [installment],
    Number(company?.getDataValue("forfeit") || 0),
    paymentReferenceDate
  )[0];
  const previousLateInterest = await TranzactionModel.findAll({
    where: { amortizationLoanId },
    attributes: ["latePaymentInterest"],
    raw: true,
  });
  const alreadyChargedLate = previousLateInterest.reduce(
    (sum: number, transaction: any) => sum + (Number(transaction.latePaymentInterest) || 0),
    0
  );
  latePaymentInterest = Math.max(0, Number(calculatedInstallment?.latePaymentInterest || 0) - alreadyChargedLate);
  totalAmount = Math.max(0, Number(amount || 0) + latePaymentInterest - Number(req.body.discountAmount || 0));

  // ═══════════════════════════════════════════════════════════════
  // LÓGICA DE PAGAMENTO:
  // - amount = valor que o cliente PAGA efectivamente (vai para a prestação)
  // - latePaymentInterest = penalidade por atraso (NÃO entra no paidAmount)
  // - paidAmount = soma de todos os pagamentos efectivos nesta prestação
  // - isFullPayment = paidAmount total >= valor da prestação
  // ═══════════════════════════════════════════════════════════════
  const installmentValue = Number(installment.installment) || 0;
  const currentPayment = Number(amount) || 0; // Valor efectivo pago pelo cliente
  const previousPaid = Number(installment.paidAmount) || 0; // Já pago anteriormente
  const newTotalPaid = previousPaid + currentPayment; // APENAS pagamentos efectivos

  // Determinar se é pagamento total ou parcial
  // Se houver desconto aplicado, considerar como pagamento total
  const isFullPayment = discountApplied ? true : (newTotalPaid >= installmentValue - 0.01);
  const newStatus = isFullPayment ? 1 : -1; // 1=pago, -1=parcial
  // Nunca exceder o valor da prestação
  const finalPaidAmount = Math.min(newTotalPaid, installmentValue);

  // Se pagamento parcial, calcular saldo restante
  const debtAmount = isFullPayment ? 0 : Math.max(0, installmentValue - finalPaidAmount);

  // Calcular valor do desconto se aplicado
  let discountAmount = 0;
  if (discountApplied && installmentValue > 0 && currentPayment < installmentValue) {
    discountAmount = Math.round((installmentValue - currentPayment) * 100) / 100;
  }

  const tranzaction = await TranzactionModel.create({
    companyId,
    accountNumber,
    customerId: installment.getDataValue("customerId"),
    amortizationLoanId,
    amount,
    totalAmount,
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
    notes: notes || null,
    discountApplied: discountApplied || false,
    discountAmount,
  });
  if (tranzaction != null) {
    // Actualizar status da prestação: 1=pago, -1=parcial, 0=pendente
    const updateAmortizationLoan = await AmorizationLoanModel.update(
      {
        status: newStatus,
        paidAmount: finalPaidAmount,
        remainingBalance: isFullPayment ? 0 : debtAmount,
      },
      {
        where: {
          id: amortizationLoanId,
        },
      }
    );

    // Se pagamento parcial, registar/regenerar dívida
    if (!isFullPayment) {
      try {
        const { DebtModel } = await import("../database/models/DebtModel");
        const existingDebt = await DebtModel.findOne({
          where: { amortisationId: amortizationLoanId }
        });
        if (existingDebt) {
          await DebtModel.update({ debtAmount }, { where: { id: (existingDebt as any).id } });
        } else {
          await DebtModel.create({
            companyId,
            customerId: installment.customerId,
            accountNumber: String(accountNumber),
            loanId: loanId || installment.loanId,
            amortisationId: amortizationLoanId,
            debtAmount,
            updatedBy: staffName || '',
            dateInserted: paymentDate || new Date().toISOString().split('T')[0],
          });
        }
      } catch (debtErr) {
        console.error("Erro ao registar dívida parcial:", debtErr);
      }
    } else {
      // Pagamento total — remover registo de dívida se existir
      try {
        const { DebtModel } = await import("../database/models/DebtModel");
        await DebtModel.destroy({ where: { amortisationId: amortizationLoanId } });
      } catch {}
    }

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

    try {
      await enqueuePaymentSms({
        companyId: Number(companyId),
        transactionId: Number((tranzaction as any).id),
        loanId: loanId ? Number(loanId) : null,
        amortizationLoanId: amortizationLoanId ? Number(amortizationLoanId) : null,
        accountNumber,
        paidAmount: Number(amount),
        latePaymentInterest: Number(latePaymentInterest || 0),
        paymentDate,
        reference: tranzactionReference,
      });
    } catch (smsError) {
      console.error("Erro ao enfileirar SMS de pagamento:", smsError);
    }

    // ── CAIXA DIÁRIO: movimentos automáticos de ENTRADA ──
    // REEMBOLSO (valor pago) + JUROS_MORA (se houver) + TAXA_ADMIN (se houver).
    // Best-effort: falha NÃO desfaz o pagamento (apenas regista o erro).
    try {
      const { recordPayment } = await import("../services/cashRegisterService");
      const openRegister = (req as any).cashRegister;
      if (openRegister) {
        const jwt = await import("jsonwebtoken");
        const decoded: any = jwt.verify(
          (req.headers.authorization || "").split(" ")[1] || "",
          process.env.APP_SECRET + ""
        );
        // Juros de mora já vieram recalculados do início do handler
        // (latePaymentInterest = mora do dia − mora já cobrada antes).
        const effectiveLateInterest = Number(latePaymentInterest) > 0
          ? Number(latePaymentInterest)
          : 0;
        await recordPayment({
          companyId: Number(companyId),
          userId: Number(decoded?.id) || undefined,
          loanId: loanId ? Number(loanId) : Number(installment.loanId),
          amortizationLoanId: amortizationLoanId ? Number(amortizationLoanId) : null,
          tranzactionId: Number((tranzaction as any).id),
          customerId: installment.getDataValue("customerId"),
          amount: Number(amount),
          lateInterest: effectiveLateInterest,
          adminFee: 0, // taxa administrativa é cobrada na concessão, não no pagamento
          accountNumber,
          // Método/conta vindos do form do Quasar (CASH por defeito nos antigos).
          paymentMethod: String((req.body as any)?.payment_method || "CASH"),
          bankAccountId: (req.body as any)?.bank_account_id
            ? Number((req.body as any).bank_account_id)
            : null,
        });
      }
    } catch (cashError: any) {
      console.error("[CAIXA] Falha ao registar pagamento no caixa (pagamento mantido):", cashError?.message || cashError);
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
  findAllPaymentsOverview,
  getCustomerTranzactions,
  getLoanLateInterest,
  addTranzaction,
  updateTranzaction,
  checkAndLiquidateLoan,
};
