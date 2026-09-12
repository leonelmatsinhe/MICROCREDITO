import moment from "moment";
import { Request, Response } from "express";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { Op } from "sequelize";
import { simulator } from "../utils/loanAmortization";
import { LoanModel } from "../database/models/LoanModel";
import { DebtModel } from "../database/models/DebtModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { installmentPanification } from "../utils/calculateLateAmount";
import { enqueueDisbursementSms } from "../services/SmsGatewayService";

const getUpcomingAmortizations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // dueDate é string (YYYY-MM-DD); comparar por string evita cast em memória.
    const now = moment().format("YYYY-MM-DD");

    const loans = await AmorizationLoanModel.findAll({
      where: {
        dueDate: {
          [Op.gte]: now,
        },
        companyId: id,
        status: { [Op.in]: [0, -1] },
      },
      order: [["dueDate", "ASC"]],
    });

    const partialIds = loans
      .filter((l: any) => l.status === -1)
      .map((l: any) => l.id);

    let debtsMap: Record<number, any> = {};
    if (partialIds.length > 0) {
      const debts = await DebtModel.findAll({
        where: { amortisationId: { [Op.in]: partialIds } },
      });
      debts.forEach((d: any) => {
        debtsMap[d.amortisationId] = {
          debtAmount: d.debtAmount,
          debtDate: d.updatedAt || d.dateInserted,
        };
      });
    }

    const result = loans.map((loan: any) => {
      const plain = loan.toJSON ? loan.toJSON() : { ...loan };
      if (plain.status === -1 && debtsMap[plain.id]) {
        plain.debtAmount = debtsMap[plain.id].debtAmount;
        plain.debtDate = debtsMap[plain.id].debtDate;
      }
      return plain;
    });

    return res.status(200).send({ success: true, result });
  } catch (error: any) {
    return res.status(500).send({
      success: false,
      message: error.message || "Erro ao buscar prestações próximas.",
    });
  }
};

const getPastAmortizations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const now = moment().format("YYYY-MM-DD");

    const pastAmortizations = await AmorizationLoanModel.findAll({
      where: {
        dueDate: {
          [Op.lt]: now,
        },
        companyId: id,
      },
      order: [["dueDate", "DESC"]],
    });

    return res.status(200).send({ success: true, result: pastAmortizations || [] });
  } catch (error: any) {
    return res.status(500).send({
      success: false,
      message: error.message || "Erro ao buscar prestações vencidas.",
    });
  }
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

    const loan = await LoanModel.findByPk(loanId);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Crédito não encontrado.",
      });
    }
    const customerId = loan.getDataValue("customerId");
    if (!customerId) {
      return res.status(409).json({
        success: false,
        message: "O crédito ainda não está associado a uma conta oficial.",
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
      customerAmortizationPlan.map((installment: any) => ({
        ...installment,
        customerId,
      }))
    );

    // Atualiza o status do empréstimo e guarda a data real de desembolso:
    // o dueDate enviado é a base do plano (a 1ª prestação vence 1 mês depois).
    await LoanModel.update(
      { status: 1, disbursementDate: String(dueDate || "").slice(0, 10) || null },
      {
        where: {
          id: loanId
        }
      }
    );

    try {
      await enqueueDisbursementSms({
        companyId: Number(companyId),
        loanId: Number(loanId),
        accountNumber,
        amount: Number(amount),
        installments: Number(numberOfInstallments),
        firstDueDate: customerAmortizationPlan[0]?.dueDate
          ? String(customerAmortizationPlan[0].dueDate)
          : null,
      });
    } catch (smsError) {
      console.error("Erro ao enfileirar SMS de desembolso:", smsError);
    }

    // ── CAIXA DIÁRIO: movimento automático SAIDA / DESEMBOLSO ──
    // Best-effort: se falhar, NÃO impede o desembolso (apenas regista o erro).
    // O caixa ABERTO já foi validado pelo middleware checkCashRegisterOpen e
    // chega em req.cashRegister.
    try {
      const { recordDisbursement } = await import("../services/cashRegisterService");
      const openRegister = (req as any).cashRegister;
      if (openRegister) {
        const jwt = await import("jsonwebtoken");
        const decoded: any = jwt.verify(
          (req.headers.authorization || "").split(" ")[1] || "",
          process.env.APP_SECRET + ""
        );
        await recordDisbursement({
          companyId: Number(companyId),
          userId: Number(decoded?.id) || undefined,
          loanId: Number(loanId),
          customerId: loan ? Number(loan.getDataValue("customerId")) : null,
          amount: Number(amount),
          accountNumber,
          // Método/conta vindos do form do Quasar (CASH por defeito nos antigos).
          paymentMethod: String((req.body as any)?.payment_method || "CASH"),
          bankAccountId: (req.body as any)?.bank_account_id
            ? Number((req.body as any).bank_account_id)
            : null,
        });
      }
    } catch (cashError: any) {
      console.error("[CAIXA] Falha ao registar desembolso no caixa (desembolso mantido):", cashError?.message || cashError);
    }

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

/**
 * Controle de Prestações (admin) — endpoint consolidado.
 *
 * Resolve no servidor tudo o que a página precisa, numa só chamada:
 *  - créditos activos (1) ou liquidados (3) da empresa;
 *  - TODAS as prestações desses créditos (1 query, sem o padrão N+1 anterior);
 *  - nome/telefone do mutuário via lista COMPLETA de clientes (sem paginação —
 *    a paginação silenciosa de /api/customers/:id fazia desaparecer mutuários
 *    fora da 1.ª página, que caíam no placeholder "Conta X" e eram escondidos);
 *  - mora diária calculada com o forfeit da empresa (installmentPanification);
 *  - mora REAL cobrada nas prestações pagas (transacções, com de-duplicação
 *    por dia, como em getLoanAmortization / findAllPaymentsOverview);
 *  - daysOverdue / daysUntilDue calculados no servidor (data única de referência).
 *
 * Linhas sem cliente correspondente são devolvidas com customerName=null e
 * hasCustomer=false — cabe ao frontend MOSTRÁ-LAS com selo (nunca esconder
 * dados financeiros).
 */
const getInstallmentsControl = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const companyIdNum = Number(companyId);
    if (!Number.isFinite(companyIdNum) || companyIdNum <= 0) {
      return res.status(400).json({ success: false, message: "companyId inválido." });
    }

    const company = await CompanyModel.findByPk(companyIdNum, { attributes: ["id", "forfeit"] });
    if (!company) {
      return res.status(404).json({ success: false, message: "Empresa não encontrada." });
    }
    const forfeit = Number(company.getDataValue("forfeit") || 0);

    // 1. Créditos activos (1) ou liquidados (3)
    const loans: any[] = await LoanModel.findAll({
      where: { companyId: companyIdNum, status: { [Op.in]: [1, 3] } },
      attributes: ["id", "accountNumber", "customerId", "status"],
      order: [["id", "DESC"]],
      raw: true,
    });
    if (loans.length === 0) {
      return res.status(200).json({ success: true, result: [] });
    }
    const loanIds = loans.map((l: any) => Number(l.id));

    // 2. Lista COMPLETA de mutuários da empresa (sem paginação), indexada por conta e por id
    const customers: any[] = await CustomerModel.findAll({
      where: { companyId: companyIdNum },
      attributes: ["id", "accountNumber", "customerName", "customerPhone"],
      raw: true,
    });
    const customerByAccount: Record<string, any> = {};
    const customerById: Record<number, any> = {};
    customers.forEach((c: any) => {
      customerByAccount[String(c.accountNumber)] = c;
      customerById[Number(c.id)] = c;
    });

    // 3. Todas as prestações desses créditos numa única query
    const amortizations: any[] = await AmorizationLoanModel.findAll({
      where: { loanId: { [Op.in]: loanIds } },
      order: [["dueDate", "ASC"], ["id", "ASC"]],
      raw: true,
    });

    // 4. Mora real cobrada nas prestações pagas (de-duplicada por dia de pagamento)
    const paidAmortIds = amortizations
      .filter((a: any) => Number(a.status) === 1)
      .map((a: any) => Number(a.id));
    const realLateByAmortId: Record<number, number> = {};
    if (paidAmortIds.length > 0) {
      const transactions: any[] = await TranzactionModel.findAll({
        where: { amortizationLoanId: { [Op.in]: paidAmortIds } },
        attributes: ["amortizationLoanId", "latePaymentInterest", "paymentDate"],
        raw: true,
      });
      const maxLateByAmortAndDate: Record<string, number> = {};
      transactions.forEach((tx: any) => {
        const key = `${Number(tx.amortizationLoanId)}:${String(tx.paymentDate || "").slice(0, 10)}`;
        maxLateByAmortAndDate[key] = Math.max(
          maxLateByAmortAndDate[key] || 0,
          Number(tx.latePaymentInterest) || 0
        );
      });
      Object.entries(maxLateByAmortAndDate).forEach(([key, value]) => {
        const amortId = Number(key.split(":")[0]);
        realLateByAmortId[amortId] = Math.round(((realLateByAmortId[amortId] || 0) + value) * 100) / 100;
      });
    }

    // 5. Panificação por crédito (mora diária e saldo são calculados por empréstimo)
    const amortByLoan: Record<number, any[]> = {};
    amortizations.forEach((a: any) => {
      (amortByLoan[Number(a.loanId)] ||= []).push(a);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: any[] = [];
    for (const loan of loans) {
      const plan = installmentPanification(amortByLoan[Number(loan.id)] || [], forfeit);
      // Mesma ordem de resolução usada historicamente no frontend: conta → id
      const customer =
        customerByAccount[String(loan.accountNumber)] ||
        customerById[Number(loan.customerId)] ||
        null;
      for (const a of plan) {
        const due = a.dueDate ? new Date(`${String(a.dueDate).slice(0, 10)}T00:00:00`) : null;
        const diffMs = due ? today.getTime() - due.getTime() : 0;
        const daysOverdue = diffMs > 0 ? Math.floor(diffMs / 86400000) : 0;
        const daysUntilDue = diffMs < 0 ? Math.ceil(-diffMs / 86400000) : 0;
        const status = Number(a.status);
        // Pagas: mora real cobrada; por pagar: mora calculada com o forfeit
        const lateFee = status === 1
          ? realLateByAmortId[Number(a.id)] || 0
          : Number(a.latePaymentInterest) || 0;
        result.push({
          id: `${loan.id}-${a.id || a.installmentOrder}`,
          loanId: Number(loan.id),
          accountNumber: loan.accountNumber,
          customerId: loan.customerId,
          customerName: customer?.customerName || null,
          customerPhone: customer?.customerPhone || "",
          hasCustomer: !!customer,
          installmentOrder: a.installmentOrder ?? "",
          installment: Number(a.installment) || 0,
          paidAmount: Number(a.paidAmount) || 0,
          status,
          dueDate: a.dueDate ? String(a.dueDate).slice(0, 10) : null,
          daysOverdue,
          daysUntilDue,
          lateFee,
          totalToPay: Math.round(((Number(a.installment) || 0) + lateFee) * 100) / 100,
          amortization: Number(a.amortization) || 0,
          rateAmount: Number(a.rateAmount) || 0,
        });
      }
    }

    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("Erro no controle de prestações:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao carregar o controle de prestações.",
    });
  }
};

export { getUpcomingAmortizations, getPastAmortizations, createAmortizationLoan, getInstallmentsControl };
