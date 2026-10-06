import { Request, Response } from "express";
import moment from "moment";
import { db } from "../database/db";
import { Op, Transaction, fn, col } from "sequelize";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { NotificationModel } from "../database/models/NotificationModel";
import { UserModel } from "../database/models/UserModel";
import { ReciboModel } from "../database/models/ReciboModel";
import { enqueuePaymentSms } from "../services/SmsGatewayService";
import { CompanyModel } from "../database/models/CompanyModel";
import { round2, num, moneyGte, subMoney } from "../utils/money";
import {
  AuditLogModel,
  IdempotencyKeyModel,
  PaymentAllocationModel,
  CustomerCreditModel,
} from "../database/models/paymentsV2Models";
import { getAccruedLateInterest } from "../services/lateInterestService";
import {
  validateReembolsoAccount,
  getFirstCashAccount,
} from "../services/bankAccountResolver";
import { installmentPanification } from "../utils/calculateLateAmount";
import { methodToTreasury } from "../utils/paymentMethodMap";
import * as jwt from "jsonwebtoken";

// ─────────────────────────────────────────────────────────────────────────────
// IDENTIDADE (JWT) + AUDITORIA APPEND-ONLY
// ─────────────────────────────────────────────────────────────────────────────

type DecodedJwt = { id?: number; companyId?: number; userRole?: number };

const decodeJwt = (req: Request): DecodedJwt => {
  try {
    const [, token] = (req.headers.authorization || "").split(" ");
    return (jwt.verify(token, process.env.APP_SECRET + "") as any) || {};
  } catch {
    return {};
  }
};

const clientIpOf = (req: Request): string | null => {
  const fwd = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd) || req.ip || "";
  const str = String(ip).split(",")[0].trim();
  return str ? str.slice(0, 60) : null;
};

/** Grava 1 linha no audit_log (append-only). Falha de auditoria nunca quebra o fluxo. */
const writeAudit = async (
  req: Request,
  action: string,
  entity: string,
  entityId: number | null,
  beforeData: any,
  afterData: any,
  transaction?: Transaction | null
): Promise<void> => {
  try {
    const decoded = decodeJwt(req);
    await AuditLogModel.create(
      {
        user_id: decoded.id || null,
        company_id: decoded.companyId || null,
        ip: clientIpOf(req),
        action,
        entity,
        entity_id: entityId,
        before_data: beforeData ?? null,
        after_data: afterData ?? null,
      },
      transaction ? { transaction } : undefined
    );
  } catch (auditErr: any) {
    console.error("[audit_log] Falha ao gravar auditoria:", auditErr?.message || auditErr);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LEITURAS (GET) — legado mantido
// ─────────────────────────────────────────────────────────────────────────────

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

    // Totais do conjunto filtrado em SQL (COALESCE para NULL→0)
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

const getLoanLateInterest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const loan: any = await LoanModel.findByPk(id, { attributes: ["id", "companyId", "status"] });
  if (!loan) return res.status(404).json({ success: false, message: "Crédito não encontrado." });

  const transactions: any[] = await TranzactionModel.findAll({
    where: { loanId: id, status: "CONFIRMED" },
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
      totalLateInterest: round2(totalLateInterest),
      chargedLateInterest: round2(chargedLateInterest),
      source: Number(loan.status) === 1 ? "pending" : "charged",
    },
  });
};

/**
 * GET /api/tranzaction/loan/reference-check?companyId&paymentMethod&reference
 * Validação async do frontend: referência já usada neste método/empresa?
 */
const checkReference = async (req: Request, res: Response) => {
  try {
    const { companyId, paymentMethod, reference } = req.query as any;
    if (!companyId || !paymentMethod || !reference) {
      return res.status(400).json({ success: false, message: "companyId, paymentMethod e reference são obrigatórios." });
    }
    const existing: any = await TranzactionModel.findOne({
      where: {
        companyId: Number(companyId),
        paymentMethod: Number(paymentMethod),
        tranzactionReference: String(reference).trim(),
        status: "CONFIRMED",
      },
      attributes: ["id"],
    });
    return res.status(200).json({ success: true, result: { exists: !!existing, tranzactionId: existing ? Number(existing.getDataValue("id")) : null } });
  } catch (error: any) {
    console.error("[reference-check] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao validar a referência." });
  }
};

/** Soma a mora JÁ COBRADA em transacções CONFIRMED da prestação. */
const sumChargedLateInterest = async (
  amortizationLoanId: number,
  transaction?: Transaction
): Promise<number> => {
  const rows: any[] = await TranzactionModel.findAll({
    where: { amortizationLoanId, status: "CONFIRMED" },
    attributes: ["latePaymentInterest"],
    raw: true,
    ...(transaction ? { transaction } : {}),
  });
  return round2(rows.reduce((s, t: any) => s + num(t.latePaymentInterest), 0));
};

/**
 * GET /api/installments/:id/quote?payDate=YYYY-MM-DD — QUOTE OFICIAL do servidor.
 * Fonte única da verdade: o frontend deixa de calcular mora em JS.
 * Motor V2 (accruals + company_penalty_rules) com fallback de fórmula legada.
 */
const getInstallmentQuote = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "id inválido." });
    }
    const payDate = String(req.query.payDate || new Date().toISOString().slice(0, 10)).slice(0, 10);

    const installment: any = await AmorizationLoanModel.findByPk(id);
    if (!installment) {
      return res.status(404).json({ success: false, message: "Prestação não encontrada." });
    }
    const loan: any = await LoanModel.findByPk(installment.getDataValue("loanId"), {
      attributes: ["companyId", "status"],
    });
    if (!loan) {
      return res.status(404).json({ success: false, message: "Crédito não encontrado." });
    }
    const companyId = Number(loan.getDataValue("companyId"));

    const installmentValue = round2(num(installment.getDataValue("installment")));
    const paidAmount = round2(num(installment.getDataValue("paidAmount")));
    const dueDate = String(installment.getDataValue("dueDate") || "").slice(0, 10);
    const status = Number(installment.getDataValue("status"));
    const capitalDue = round2(Math.max(0, installmentValue - paidAmount));
    const interestDue = round2(num(installment.getDataValue("rateAmount")));

    // Mora pelo motor V2 (accruals → regra → fórmula legada)
    const late = await getAccruedLateInterest({
      amortizationLoanId: id,
      installmentValue,
      paidAmount,
      dueDate,
      companyId,
      referenceDate: payDate,
    });

    // Crédito a favor do cliente (overpays anteriores) — abate o total
    let customerCredit = 0;
    try {
      const [creditRows]: any = await db.query(
        `SELECT COALESCE(SUM(remaining_amount),0) AS total FROM customer_credits
          WHERE company_id = ? AND account_number = ? AND status = 'ACTIVE'`,
        { replacements: [companyId, Number(installment.getDataValue("accountNumber"))] }
      );
      customerCredit = round2(num((creditRows as any[])[0]?.total));
    } catch { /* tabela ainda não migrada */ }

    const alreadyCharged = await sumChargedLateInterest(id);
    const lateDue = round2(Math.max(0, late.amount - alreadyCharged));
    const total = round2(status === 1 ? 0 : capitalDue + lateDue);
    const netTotal = round2(Math.max(0, total - customerCredit));

    return res.status(200).json({
      success: true,
      result: {
        installmentId: id,
        loanId: Number(installment.getDataValue("loanId")),
        installmentOrder: installment.getDataValue("installmentOrder"),
        dueDate,
        payDate,
        status,
        paid: paidAmount,
        installmentValue,
        capitalDue,
        interestDue,
        daysLate: late.daysLate,
        lateDue,
        lateSource: late.source,
        customerCredit,
        total,
        netTotal,
        payableUntil: dueDate,
      },
    });
  } catch (error: any) {
    console.error("[quote] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao calcular a quote." });
  }
};

/**
 * Todos os pagamentos da empresa, enriquecidos com cliente + prestação.
 * (Legado — usado pela página "Pagamentos" e exportações PDF/Excel.)
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

    // Prestações — nº de ordem e vencimento a que cada pagamento se refere
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
      const paymentDate = String(t.paymentDate || t.createdAt || "").slice(0, 10);
      const paymentGroup = `${Number(t.amortizationLoanId) || 0}:${paymentDate}`;
      const rawLateInterest = Number(t.latePaymentInterest) || 0;
      // Registos antigos repetiam a mesma mora em pagamentos parciais do mesmo dia.
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
        totalAmount: round2(totalAmount),
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

// ─────────────────────────────────────────────────────────────────────────────
// PAGAMENTO INDIVIDUAL — V2 TRANSACCIONAL (lock, validações, idempotência)
// ─────────────────────────────────────────────────────────────────────────────

const addTranzaction = async (req: Request, res: Response) => {
  const body: any = req.body || {};
  const {
    companyId,
    accountNumber,
    amortizationLoanId,
    amount,
    interestRateAmount,
    phoneNumber,
    tranzactionReference,
    paymentMethod,
    description,
    receiptUrl,
    loanId: _loanIdIgnored,          // loanId real vem da prestação (evita mismatch)
    paymentDate,
    discountApplied,
    notes,
  } = body;

  // ── 0. IDEMPOTÊNCIA — header Idempotency-Key obrigatório ──
  const idemKey = String(req.headers["idempotency-key"] || "").trim();
  if (!idemKey || idemKey.length < 8) {
    return res.status(400).json({
      success: false,
      code: "IDEMPOTENCY_KEY_REQUIRED",
      message: "Header Idempotency-Key (UUID) é obrigatório.",
    });
  }

  // ── 1. Validações de entrada (baratas, fora da transacção) ──
  if (!companyId || !accountNumber || !amortizationLoanId) {
    return res.status(400).json({
      success: false,
      message: "companyId, accountNumber e amortizationLoanId são obrigatórios.",
    });
  }
  if (!tranzactionReference || !String(tranzactionReference).trim()) {
    return res.status(400).json({
      success: false,
      code: "REFERENCE_REQUIRED",
      message: "A referência do pagamento é obrigatória.",
    });
  }
  const payDate = String(paymentDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (payDate > today) {
    return res.status(400).json({
      success: false,
      code: "FUTURE_DATE",
      message: "A data de pagamento não pode ser futura.",
    });
  }

  // Identidade (JWT) — received_by + auditoria
  const decoded = decodeJwt(req);
  const receivedBy = Number(decoded.id) || null;
  const clientIp = clientIpOf(req);

  // ── 2. Chave de idempotência já usada? Devolve a resposta original ──
  try {
    const previous: any = await IdempotencyKeyModel.findOne({ where: { idem_key: idemKey } });
    if (previous) {
      const saved = previous.getDataValue("response_body");
      if (saved) {
        return res.status(Number(previous.getDataValue("response_status")) || 200).json(saved);
      }
      // Existe sem resposta = pedido em curso noutro request
      return res.status(409).json({
        success: false,
        code: "IDEMPOTENCY_KEY_REUSED",
        message: "Pedido em processamento com a mesma Idempotency-Key — aguarde.",
      });
    }
    await IdempotencyKeyModel.create({
      idem_key: idemKey,
      company_id: Number(companyId),
      user_id: receivedBy,
      endpoint: "POST /api/tranzaction",
    });
  } catch (err: any) {
    // Corrida: outro request criou a chave primeiro → devolve a resposta dele
    if (String(err?.name).includes("UniqueConstraint") || String(err?.original?.code) === "ER_DUP_ENTRY") {
      const previous: any = await IdempotencyKeyModel.findOne({ where: { idem_key: idemKey } });
      const saved = previous?.getDataValue?.("response_body");
      if (saved) {
        return res.status(Number(previous.getDataValue("response_status")) || 200).json(saved);
      }
      return res.status(409).json({
        success: false,
        code: "IDEMPOTENCY_KEY_REUSED",
        message: "Pedido em processamento com a mesma Idempotency-Key — aguarde.",
      });
    }
    // Tabela indisponível → segue o fluxo normal (fallback legado)
    console.error("[idempotency] tabela indisponível, seguindo sem idempotência:", err?.message);
  }

  try {
    const result = await db.transaction(async (t: Transaction) => {
      // ── 3. Prestação COM LOCK (2 caixas, mesma prestação → serializado) ──
      const installment: any = await AmorizationLoanModel.findByPk(Number(amortizationLoanId), {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!installment) {
        throw { http: 404, payload: { success: false, message: "Prestação não encontrada." } };
      }
      if (Number(installment.getDataValue("status")) === 1) {
        throw {
          http: 409,
          payload: {
            success: false,
            code: "ALREADY_PAID",
            message: "Esta prestação já está totalmente paga.",
          },
        };
      }

      const loan: any = await LoanModel.findByPk(installment.getDataValue("loanId"), {
        attributes: ["id", "companyId", "walletId", "status"],
        transaction: t,
      });
      if (!loan) {
        throw { http: 404, payload: { success: false, message: "Crédito não encontrado." } };
      }
      const realLoanId = Number(loan.getDataValue("id"));
      const loanCompanyId = Number(loan.getDataValue("companyId"));
      const walletId = Number(installment.getDataValue("walletId")) || Number(loan.getDataValue("walletId")) || null;

      // ── CONTA DE DESTINO (accounts.id, purpose REEMBOLSO/MISTO/caixa) ──
      // Prioridade: body → caixa aberto do utilizador → 1.ª conta CAIXA_FISICO
      // da empresa (com warning em audit_log). Sem conta válida → 400.
      const { CashRegisterModel } = await import("../database/models/CashRegisterModel");
      let bankAccountId = Number(body.bank_account_id) || Number(body.bankAccountId) || 0;
      if (!bankAccountId) {
        const openRegister: any = await CashRegisterModel.findOne({
          where: { companyId: loanCompanyId, userId: receivedBy || 0, status: "ABERTO" },
          order: [["id", "DESC"]],
          transaction: t,
        });
        bankAccountId = Number(openRegister?.getDataValue("bank_account_id")) || 0;
      }
      if (!bankAccountId) {
        const cashAccount = await getFirstCashAccount(loanCompanyId);
        bankAccountId = Number(cashAccount?.id) || 0;
        if (bankAccountId) {
          console.warn(`[addTranzaction] bank_account_id derivado por FALLBACK (caixa físico #${bankAccountId}) — sem conta no pedido nem no caixa`);
        }
      }
      const destAccount = await validateReembolsoAccount(bankAccountId, loanCompanyId);
      if (!destAccount) {
        throw { http: 400, payload: { success: false, code: "INVALID_BANK_ACCOUNT", message: "Conta de destino inválida." } };
      }

      // ── 4. MORA recalculada NO SERVIDOR (motor V2 → fallback legado) ──
      const installmentValue = round2(num(installment.getDataValue("installment")));
      const previousPaid = round2(num(installment.getDataValue("paidAmount")));
      const dueDate = String(installment.getDataValue("dueDate") || "").slice(0, 10);
      const late = await getAccruedLateInterest({
        amortizationLoanId: Number(amortizationLoanId),
        installmentValue,
        paidAmount: previousPaid,
        dueDate,
        companyId: loanCompanyId,
        referenceDate: payDate,
      });
      const alreadyCharged = await sumChargedLateInterest(Number(amortizationLoanId), t);
      const latePaymentInterest = round2(Math.max(0, late.amount - alreadyCharged));

      // ── 5. VALIDAÇÃO SERVER-SIDE DO VALOR (não confiar no frontend) ──
      const saldoEmFalta = round2(installmentValue - previousPaid);
      const totalDue = round2(saldoEmFalta + latePaymentInterest);
      const payAmount = round2(num(amount));
      if (payAmount <= 0) {
        throw {
          http: 400,
          payload: { success: false, code: "INVALID_AMOUNT", message: "O valor a pagar deve ser maior que zero." },
        };
      }
      const acceptOverpay = !!body.acceptOverpay;
      if (payAmount > totalDue && !acceptOverpay) {
        throw {
          http: 400,
          payload: {
            success: false,
            code: "OVERPAY_NOT_ALLOWED",
            message: `Valor acima do devido (total a pagar ${totalDue.toFixed(2)} MZN). Ajuste o valor ou confirme o excesso.`,
            details: { totalDue, sent: payAmount },
          },
        };
      }
      const overpayAmount = round2(Math.max(0, payAmount - totalDue));
      const appliedAmount = round2(payAmount - overpayAmount);

      // ── 6. Desconto (perdão manual) — marca prestação como paga ──
      const discountAmount = discountApplied
        ? round2(Math.max(0, subMoney(saldoEmFalta, Math.max(0, subMoney(payAmount, latePaymentInterest)))))
        : 0;

      // ── 7. Referência única por empresa+método (409 DUPLICATE_REFERENCE) ──
      const refNormalized = String(tranzactionReference).trim();
      const duplicate: any = await TranzactionModel.findOne({
        where: {
          companyId: loanCompanyId,
          paymentMethod: Number(paymentMethod) || 0,
          tranzactionReference: refNormalized,
          status: "CONFIRMED",
        },
        transaction: t,
      });
      if (duplicate) {
        throw {
          http: 409,
          payload: {
            success: false,
            code: "DUPLICATE_REFERENCE",
            message: `A referência "${refNormalized}" já foi usada neste método de pagamento.`,
          },
        };
      }

      // ── 8. Novo estado da prestação ──
      const paymentTowardsBalance = round2(Math.max(0, subMoney(appliedAmount, latePaymentInterest)));
      const newTotalPaid = round2(previousPaid + paymentTowardsBalance);
      const isFullPayment = discountApplied ? true : moneyGte(newTotalPaid, installmentValue);
      const newStatus = isFullPayment ? 1 : -1;
      const finalPaidAmount = round2(Math.min(newTotalPaid, installmentValue));
      const debtAmount = isFullPayment ? 0 : round2(Math.max(0, installmentValue - finalPaidAmount));

      // ── 9. CRIA A TRANSAÇÃO (dentro da transacção SQL) ──
      const tranzaction: any = await TranzactionModel.create(
        {
          companyId: loanCompanyId,
          accountNumber: Number(accountNumber),
          customerId: installment.getDataValue("customerId"),
          amortizationLoanId: Number(amortizationLoanId),
          amount: appliedAmount,
          totalAmount: appliedAmount,
          latePaymentInterest,
          interestRateAmount: num(interestRateAmount) || round2(num(installment.getDataValue("rateAmount"))),
          phoneNumber: String(phoneNumber || ""),
          tranzactionReference: refNormalized,
          paymentMethod: Number(paymentMethod) || 0,
          description: String(description || `Pagamento prestação ${installment.getDataValue("installmentOrder")}`),
          receiptUrl: String(receiptUrl || ""),
          staffName: String(body.staffName || "—"), // @deprecated — legado; identidade real = received_by
          received_by: receivedBy,
          received_ip: clientIp,
          idem_key: idemKey,
          status: "CONFIRMED",
          bank_account_id: bankAccountId,
          loanId: realLoanId,
          paymentDate: payDate,
          notes: notes || null,
          discountApplied: !!discountApplied,
          discountAmount,
          walletId: walletId || null,
          mora_amount: latePaymentInterest,
        },
        { transaction: t }
      );
      const tranzactionId = Number(tranzaction.getDataValue("id"));

      // ── 10. ALOCAÇÃO (ordem fixa) → payment_allocations ──
      // LATE_INTEREST → INTEREST → CAPITAL (PENALTY fica reservada para multas fixas futuras)
      const allocations: Array<{ component: "PENALTY" | "LATE_INTEREST" | "INTEREST" | "CAPITAL"; amount: number }> = [];
      let pool = appliedAmount;
      const lateSlice = round2(Math.min(pool, latePaymentInterest));
      if (lateSlice > 0) {
        allocations.push({ component: "LATE_INTEREST", amount: lateSlice });
        pool = subMoney(pool, lateSlice);
      }
      const rateAmount = round2(num(installment.getDataValue("rateAmount")));
      const interestSlice = round2(Math.min(pool, rateAmount));
      if (interestSlice > 0) {
        allocations.push({ component: "INTEREST", amount: interestSlice });
        pool = subMoney(pool, interestSlice);
      }
      const capitalSlice = round2(Math.min(pool, saldoEmFalta));
      if (capitalSlice > 0) {
        allocations.push({ component: "CAPITAL", amount: capitalSlice });
        pool = subMoney(pool, capitalSlice);
      }
      // Resíduo por arredondamento — nunca descartar cêntimos
      if (pool > 0.005) {
        allocations.push({ component: "CAPITAL", amount: round2(pool) });
      }
      await PaymentAllocationModel.bulkCreate(
        allocations.map((a) => ({
          payment_id: tranzactionId,
          amortization_loan_id: Number(amortizationLoanId),
          component: a.component,
          amount: a.amount,
        })),
        { transaction: t }
      );

      // ── 10.b SALDO DA CONTA DE DESTINO — DENTRO da transacção ──
      // Bloqueia a linha (FOR UPDATE), incrementa o saldo e cria o lançamento
      // no extrato real (bank_transactions) no MESMO commit do pagamento.
      // O movimento de caixa pós-commit usa skipAccountLedger → sem duplo
      // crédito do mesmo dinheiro.
      const { creditAccountInTransaction } = await import("../services/treasuryService");
      await creditAccountInTransaction({
        companyId: loanCompanyId,
        accountId: bankAccountId,
        amount: appliedAmount,
        description: `Reembolso de prestação — conta ${accountNumber}`,
        userId: receivedBy,
        cashRegisterId: Number((req as any).cashRegister?.id) || null,
        referenceType: "tranzactions",
        referenceId: tranzactionId,
        transaction: t,
      });
      await AuditLogModel.create(
        {
          user_id: receivedBy,
          company_id: loanCompanyId,
          ip: clientIp,
          action: "BANK_ACCOUNT_CREDIT",
          entity: "accounts",
          entity_id: bankAccountId,
          before_data: null,
          after_data: { tranzactionId, amount: appliedAmount },
        },
        { transaction: t }
      );

      // ── 11. EXCESSO → abate a(s) próxima(s) prestação(ões) pendente(s) do
      // mesmo crédito (ordem crescente); só vai para customer_credits o que
      // sobrar depois de esgotar todas as prestações em aberto (troco nunca
      // desaparece, mas prioriza-se a liquidação antecipada do crédito).
      const { DebtModel } = await import("../database/models/DebtModel");
      let remainingOverpay = overpayAmount;
      const overpayAllocations: Array<{ amortizationLoanId: number; installmentOrder: any; amount: number; fullyPaid: boolean }> = [];
      if (remainingOverpay > 0 && acceptOverpay) {
        const pendingInstallments: any[] = await AmorizationLoanModel.findAll({
          where: {
            loanId: installment.getDataValue("loanId"),
            id: { [Op.ne]: Number(amortizationLoanId) },
            status: { [Op.ne]: 1 }, // ainda não totalmente paga
          },
          order: [["installmentOrder", "ASC"]],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        for (const next of pendingInstallments) {
          if (remainingOverpay <= 0) break;
          const nextValue = round2(num(next.getDataValue("installment")));
          const nextPaid = round2(num(next.getDataValue("paidAmount")));
          const nextOwed = round2(Math.max(0, nextValue - nextPaid));
          if (nextOwed <= 0) continue;
          const applyToNext = round2(Math.min(remainingOverpay, nextOwed));
          const newNextPaid = round2(nextPaid + applyToNext);
          const nextFull = moneyGte(newNextPaid, nextValue);
          const nextDebtAmount = round2(Math.max(0, nextValue - newNextPaid));
          await AmorizationLoanModel.update(
            {
              status: nextFull ? 1 : -1,
              paidAmount: newNextPaid,
              remainingBalance: nextFull ? 0 : nextDebtAmount,
            },
            { where: { id: next.getDataValue("id") }, transaction: t }
          );
          // Mesma transacção/recibo original — só regista a alocação na
          // prestação seguinte (sem duplicar o dinheiro já recebido).
          await PaymentAllocationModel.create(
            {
              payment_id: tranzactionId,
              amortization_loan_id: Number(next.getDataValue("id")),
              component: "CAPITAL",
              amount: applyToNext,
            },
            { transaction: t }
          );
          if (nextFull) {
            await DebtModel.destroy({ where: { amortisationId: next.getDataValue("id") }, transaction: t });
          } else {
            const nextDebt: any = await DebtModel.findOne({
              where: { amortisationId: next.getDataValue("id") },
              transaction: t,
            });
            if (nextDebt) {
              await DebtModel.update(
                { debtAmount: nextDebtAmount },
                { where: { id: nextDebt.getDataValue("id") }, transaction: t }
              );
            } else {
              await DebtModel.create(
                {
                  companyId: loanCompanyId,
                  customerId: installment.getDataValue("customerId"),
                  accountNumber: String(accountNumber),
                  loanId: realLoanId,
                  amortisationId: Number(next.getDataValue("id")),
                  debtAmount: nextDebtAmount,
                  updatedBy: String(body.staffName || ""),
                  dateInserted: payDate,
                },
                { transaction: t }
              );
            }
          }
          overpayAllocations.push({
            amortizationLoanId: Number(next.getDataValue("id")),
            installmentOrder: next.getDataValue("installmentOrder"),
            amount: applyToNext,
            fullyPaid: nextFull,
          });
          remainingOverpay = round2(remainingOverpay - applyToNext);
        }
      }
      // Sobra sem prestação seguinte onde abater → crédito a favor do cliente.
      if (remainingOverpay > 0 && acceptOverpay) {
        await CustomerCreditModel.create(
          {
            company_id: loanCompanyId,
            customer_id: Number(installment.getDataValue("customerId")),
            account_number: Number(accountNumber),
            amount: remainingOverpay,
            remaining_amount: remainingOverpay,
            source_payment_id: tranzactionId,
            status: "ACTIVE",
          },
          { transaction: t }
        );
      }

      // ── 12. Actualiza a prestação (mesma transacção) ──
      await AmorizationLoanModel.update(
        {
          status: newStatus,
          paidAmount: finalPaidAmount,
          remainingBalance: isFullPayment ? 0 : debtAmount,
          ...(latePaymentInterest > 0
            ? {
                mora_amount: round2(num(installment.getDataValue("mora_amount")) + latePaymentInterest),
                mora_days: Math.max(0, moment(payDate).diff(moment(dueDate), "days")),
              }
            : {}),
        },
        { where: { id: Number(amortizationLoanId) }, transaction: t }
      );

      // ── 13. Dívida parcial — mesma transacção ──
      if (!isFullPayment) {
        const existingDebt: any = await DebtModel.findOne({
          where: { amortisationId: Number(amortizationLoanId) },
          transaction: t,
        });
        if (existingDebt) {
          await DebtModel.update(
            { debtAmount },
            { where: { id: existingDebt.getDataValue("id") }, transaction: t }
          );
        } else {
          await DebtModel.create(
            {
              companyId: loanCompanyId,
              customerId: installment.getDataValue("customerId"),
              accountNumber: String(accountNumber),
              loanId: realLoanId,
              amortisationId: Number(amortizationLoanId),
              debtAmount,
              updatedBy: String(body.staffName || ""),
              dateInserted: payDate,
            },
            { transaction: t }
          );
        }
      } else {
        await DebtModel.destroy({ where: { amortisationId: Number(amortizationLoanId) }, transaction: t });
      }

      // ── 14. Auditoria (append-only, dentro da transacção) ──
      await AuditLogModel.create(
        {
          user_id: receivedBy,
          company_id: loanCompanyId,
          ip: clientIp,
          action: "PAYMENT_CREATE",
          entity: "tranzactions",
          entity_id: tranzactionId,
          before_data: { paidAmount: previousPaid, status: Number(installment.getDataValue("status")) },
          after_data: {
            paidAmount: finalPaidAmount,
            status: newStatus,
            amount: appliedAmount,
            latePaymentInterest,
            overpayAmount,
            overpayAppliedToNextInstallments: overpayAllocations,
            overpayAsCredit: remainingOverpay,
            reference: refNormalized,
          },
        },
        { transaction: t }
      );

      // ── 15. RECIBO LEGAL — DENTRO da transacção (REGRA DE OURO AT) ──
      // Numeração sequencial (FOR UPDATE), selo SHA-256 + QR e PDF no mesmo
      // commit: se o PDF falhar, o pagamento INTEIRO sofre rollback — nunca
      // existe pagamento sem recibo nem recibo sem pagamento.
      const { emitReciboInTransaction } = await import("../services/reciboService");
      const reciboEmitido = await emitReciboInTransaction({
        tranzactionId,
        companyId: loanCompanyId,
        createdBy: receivedBy,
        ip: clientIp,
        transaction: t,
      });

      return {
        tranzactionId,
        appliedAmount,
        latePaymentInterest,
        overpayAmount,
        overpayAppliedToNextInstallments: overpayAllocations,
        overpayAsCredit: remainingOverpay,
        walletId,
        realLoanId,
        bankAccountId,
        destAccountName: destAccount.name,
        recibo: reciboEmitido,
      };
    });

    // ── PÓS-COMMIT (best-effort — falha NÃO desfaz o pagamento) ──
    // Caixa: abre transacção própria → chamado APÓS o commit principal.
    try {
      const { recordPayment } = await import("../services/cashRegisterService");
      const openRegister = (req as any).cashRegister;
      if (openRegister) {
        await recordPayment({
          companyId: Number(companyId),
          userId: receivedBy || undefined,
          loanId: result.realLoanId,
          amortizationLoanId: Number(amortizationLoanId),
          tranzactionId: result.tranzactionId,
          customerId: null,
          // Movimento único REEMBOLSO com o total recebido. appliedAmount JÁ
          // inclui a mora (a alocação consome LATE_INTEREST primeiro) e é igual
          // a tranzactions.totalAmount — a reconciliação do fecho compara estes
          // dois valores. Separar a mora num movimento JUROS_MORA extra (como
          // antes) inflacionava o caixa exactamente pela mora.
          amount: result.appliedAmount,
          lateInterest: 0,
          adminFee: 0,
          accountNumber,
          // methodToTreasury: código legado (1/3/6/7…) → CASH/BANK/MPESA/EMOLA.
          // Antes lia body.payment_method (inexistente) → caixa via CASH.
          paymentMethod: methodToTreasury(body.paymentMethod),
          bankAccountId: result.bankAccountId,
          // O saldo da conta destino foi creditado no passo 10.b (mesma
          // transacção SQL) — o movimento de caixa não pode creditar de novo.
          skipAccountLedger: true,
        });
      }
    } catch (cashError: any) {
      console.error("[CAIXA] Falha ao registar pagamento no caixa (pagamento mantido):", cashError?.message || cashError);
    }

    // Recibo já foi emitido DENTRO da transacção (passo 15) — aqui é apenas
    // propagado na resposta. (Fallback pós-commit mantido só para recibos
    // legados que porventura não tenham PDF: nunca toca em pagamentos novos.)
    let recibo: any = (result as any).recibo || null;
    if (!recibo?.pdf_url) {
      try {
        const { generateReciboForTranzaction } = await import("../services/reciboService");
        recibo = await generateReciboForTranzaction({
          tranzactionId: result.tranzactionId,
          companyId: Number(companyId),
          createdBy: receivedBy,
        });
      } catch (reciboError: any) {
        console.error("[Recibo] Falha ao completar o recibo do pagamento:", reciboError?.message || reciboError);
      }
    }

    // Notificação ao cliente
    try {
      const customer: any = await CustomerModel.findOne({ where: { accountNumber } });
      if (customer && companyId) {
        await NotificationModel.create({
          companyId,
          recipientType: "customer",
          recipientId: customer.id,
          title: "Pagamento confirmado",
          message: `O seu pagamento de ${Number(result.appliedAmount).toLocaleString("pt-MZ")} MZN foi registado com sucesso.`,
          type: "payment_received",
          referenceId: result.tranzactionId,
          isRead: false,
        });
      }
    } catch (err) {
      console.error("Erro ao criar notificação de pagamento:", err);
    }

    // Liquidação do crédito
    try {
      await checkAndLiquidateLoan(result.realLoanId, Number(companyId), Number(accountNumber));
    } catch (err) {
      console.error("Erro ao verificar liquidação do crédito:", err);
    }

    // SMS
    try {
      await enqueuePaymentSms({
        companyId: Number(companyId),
        transactionId: result.tranzactionId,
        loanId: result.realLoanId,
        amortizationLoanId: Number(amortizationLoanId),
        accountNumber,
        paidAmount: result.appliedAmount,
        latePaymentInterest: result.latePaymentInterest,
        paymentDate: payDate,
        reference: String(tranzactionReference),
      });
    } catch (smsError) {
      console.error("Erro ao enfileirar SMS de pagamento:", smsError);
    }

    const responseBody: any = {
      success: true,
      message: "Payment updated successfully.",
      walletId: result.walletId || null,
      tranzactionId: result.tranzactionId,
      bank_account_id: result.bankAccountId,
      destination: result.destAccountName,
      allocation: {
        applied: result.appliedAmount,
        lateInterest: result.latePaymentInterest,
        overpay: result.overpayAmount,
        overpayAppliedToNextInstallments: result.overpayAppliedToNextInstallments || [],
        overpayAsCredit: result.overpayAsCredit || 0,
      },
      recibo: recibo ? { id: Number(recibo.id), numero: recibo.numero, hash: recibo.hash || null, pdf_url: `/api/recibos/${Number(recibo.id)}/pdf`, pdf_path: recibo.pdf_url || null, qr_url: recibo.qr_url || null } : null,
    };

    // Guarda a resposta para idempotência (retries devolvem isto)
    try {
      await IdempotencyKeyModel.update(
        { response_status: 201, response_body: responseBody },
        { where: { idem_key: idemKey } }
      );
    } catch { /* best-effort */ }

    return res.status(201).send(responseBody);
  } catch (error: any) {
    // Erros de negócio lançados como { http, payload }
    if (error?.http && error?.payload) {
      return res.status(error.http).json(error.payload);
    }
    // Corrida no índice único de referência (2 pedidos simultâneos)
    if (String(error?.name).includes("UniqueConstraint") || String(error?.original?.code) === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_REFERENCE",
        message: "Referência de pagamento duplicada (ou chave de idempotência em uso).",
      });
    }
    console.error("[addTranzaction] Erro:", error?.message || error);
    return res.status(500).send({ success: false, message: "There was an error in the payment." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTORNO FORMAL — só ADMIN (userRole 0); motivo obrigatório; tudo transaccional
// ─────────────────────────────────────────────────────────────────────────────

const reverseTranzaction = async (req: Request, res: Response) => {
  const decoded = decodeJwt(req);
  if (Number(decoded.userRole) !== 0) {
    return res.status(403).json({
      success: false,
      code: "FORBIDDEN",
      message: "Apenas Administradores podem anular pagamentos.",
    });
  }

  const { id } = req.params;
  const reason = String(req.body?.reason || "").trim();
  if (reason.length < 10) {
    return res.status(400).json({
      success: false,
      code: "REASON_REQUIRED",
      message: "Motivo obrigatório (mínimo 10 caracteres).",
    });
  }

  try {
    const result = await db.transaction(async (t: Transaction) => {
      // Transacção com lock
      const tranzaction: any = await TranzactionModel.findByPk(Number(id), {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!tranzaction) {
        throw { http: 404, payload: { success: false, message: "Pagamento não encontrado." } };
      }
      if (String(tranzaction.getDataValue("status")) === "REVERSED") {
        throw {
          http: 409,
          payload: { success: false, code: "ALREADY_REVERSED", message: "Este pagamento já foi anulado." },
        };
      }

      const amortizationLoanId = Number(tranzaction.getDataValue("amortizationLoanId"));
      const amount = round2(num(tranzaction.getDataValue("amount")));
      const lateCharged = round2(num(tranzaction.getDataValue("latePaymentInterest")));

      // Prestação com lock — devolve ao estado anterior ao pagamento
      const installment: any = await AmorizationLoanModel.findByPk(amortizationLoanId, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!installment) {
        throw { http: 404, payload: { success: false, message: "Prestação da transacção não encontrada." } };
      }

      const installmentValue = round2(num(installment.getDataValue("installment")));
      const paidAmount = round2(num(installment.getDataValue("paidAmount")));
      const paidTowardsBalance = round2(Math.max(0, subMoney(amount, lateCharged)));
      const newPaid = round2(Math.max(0, paidAmount - paidTowardsBalance));
      const newStatus = newPaid <= 0 ? 0 : moneyGte(newPaid, installmentValue) ? 1 : -1;

      // Transacção → REVERSED (nunca editar valores; estado por campo status)
      await tranzaction.update(
        {
          status: "REVERSED",
          reversed_by: Number(decoded.id) || null,
          reversal_reason: reason,
        },
        { transaction: t }
      );

      // Recibo original → ANULADO (nunca apagar; o PDF mantém-se para trilha)
      let reciboOriginalId: number | null = null;
      try {
        const reciboOriginal: any = await ReciboModel.findOne({
          where: { tranzactionId: Number(id) },
          transaction: t,
        });
        if (reciboOriginal) {
          reciboOriginalId = Number(reciboOriginal.getDataValue("id"));
          await reciboOriginal.update(
            { status: "ANULADO", annulment_reason: reason },
            { transaction: t }
          );
        }
      } catch { /* tabela recibo indisponível */ }

      // Restaura a prestação
      await installment.update(
        {
          status: newStatus,
          paidAmount: newPaid,
          remainingBalance: newPaid <= 0 ? installmentValue : round2(installmentValue - newPaid),
        },
        { transaction: t }
      );

      // Alocações do pagamento estornadas
      await PaymentAllocationModel.destroy({ where: { payment_id: Number(id) }, transaction: t });

      // Mora: devolve accruals CHARGED cobrados por este pagamento a ACCRUED
      if (lateCharged > 0) {
        await db.query(
          `UPDATE late_accruals
             SET status = 'ACCRUED'
           WHERE amortization_loan_id = ?
             AND status = 'CHARGED'
             AND id IN (
               SELECT sub.id FROM (
                 SELECT id FROM late_accruals
                  WHERE amortization_loan_id = ? AND status = 'CHARGED'
                  ORDER BY id DESC
                  LIMIT 100
               ) AS sub
             )`,
          { replacements: [amortizationLoanId, amortizationLoanId], transaction: t }
        );
      }

      // Crédito a favor gerado por este pagamento (overpay) → anula
      await CustomerCreditModel.update(
        { status: "CANCELLED" },
        { where: { source_payment_id: Number(id), status: "ACTIVE" }, transaction: t }
      );

      // ── SALDO DA CONTA DE DESTINO: decrement no mesmo commit do estorno ──
      // (o dinheiro "sai" da conta onde o pagamento tinha entrado)
      const originalBankAccountId = Number(tranzaction.getDataValue("bank_account_id")) || 0;
      if (originalBankAccountId) {
        const { AccountModel } = await import("../database/models/AccountModel");
        await AccountModel.decrement("balance", {
          by: amount,
          where: { id: originalBankAccountId },
          transaction: t,
        });
        await AuditLogModel.create(
          {
            user_id: Number(decoded.id) || null,
            company_id: tranzaction.getDataValue("companyId"),
            ip: clientIpOf(req),
            action: "BANK_ACCOUNT_DEBIT",
            entity: "accounts",
            entity_id: originalBankAccountId,
            before_data: null,
            after_data: { tranzactionId: Number(id), amount },
          },
          { transaction: t }
        );
      }

      // Dívida parcial (se a prestação voltou a dever)
      const { DebtModel } = await import("../database/models/DebtModel");
      if (newStatus === 1) {
        await DebtModel.destroy({ where: { amortisationId: amortizationLoanId }, transaction: t });
      } else {
        const debtAmount = round2(installmentValue - newPaid);
        const existingDebt: any = await DebtModel.findOne({
          where: { amortisationId: amortizationLoanId },
          transaction: t,
        });
        if (existingDebt) {
          await DebtModel.update(
            { debtAmount },
            { where: { id: existingDebt.getDataValue("id") }, transaction: t }
          );
        } else {
          await DebtModel.create(
            {
              companyId: tranzaction.getDataValue("companyId"),
              customerId: installment.getDataValue("customerId"),
              accountNumber: String(tranzaction.getDataValue("accountNumber")),
              loanId: tranzaction.getDataValue("loanId"),
              amortisationId: amortizationLoanId,
              debtAmount,
              updatedBy: `Estorno por admin #${decoded.id}`,
              dateInserted: new Date().toISOString().slice(0, 10),
            },
            { transaction: t }
          );
        }
      }

      // Auditoria
      await AuditLogModel.create(
        {
          user_id: Number(decoded.id) || null,
          company_id: tranzaction.getDataValue("companyId"),
          ip: clientIpOf(req),
          action: "PAYMENT_REVERSE",
          entity: "tranzactions",
          entity_id: Number(id),
          before_data: { status: "CONFIRMED", paidAmount, installmentStatus: Number(installment.getDataValue("status")) },
          after_data: { status: "REVERSED", reason, newPaid, newStatus },
        },
        { transaction: t }
      );

      return {
        tranzactionId: Number(id),
        newPaid,
        newStatus,
        lateReversed: lateCharged,
        reciboOriginalId,
        bankAccountId: Number(tranzaction.getDataValue("bank_account_id")) || null,
      };
    });

    // ── Pós-commit: movimento de SAÍDA no caixa (best-effort) ──
    try {
      const { registerMovement } = await import("../services/treasuryService");
      const amountReversed = round2(num(req.body?.amount) || 0);
      if (amountReversed > 0) {
        await registerMovement({
          companyId: Number(req.body?.companyId),
          userId: Number(decoded.id) || null,
          type: "SAIDA",
          category: "REEMBOLSO",
          amount: amountReversed,
          paymentMethod: "CASH",
          description: `Estorno do pagamento #${result.tranzactionId} — ${reason}`,
          reference: `REV-${result.tranzactionId}`,
          loanId: null,
          amortizationLoanId: null,
          tranzactionId: result.tranzactionId,
          customerId: null,
          automatic: true,
        } as any);
      }
    } catch (cashError: any) {
      console.error("[CAIXA] Falha ao registar SAÍDA do estorno:", cashError?.message || cashError);
    }

    return res.status(200).json({
      success: true,
      message: "Pagamento anulado (estorno) com sucesso.",
      result,
    });
  } catch (error: any) {
    if (error?.http && error?.payload) return res.status(error.http).json(error.payload);
    console.error("[reverseTranzaction] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao anular o pagamento." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE — COM GUARDAS (recibo emitido → use estorno; REVERSED → imutável)
// ─────────────────────────────────────────────────────────────────────────────

const updateTranzaction = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Guarda 1: recibo emitido → edição proibida (documento legal AT)
  try {
    const recibo: any = await ReciboModel.findOne({ where: { tranzactionId: Number(id) } });
    if (recibo) {
      return res.status(403).json({
        success: false,
        code: "RECEIPT_ALREADY_ISSUED",
        message: "Este pagamento já tem recibo emitido — use o estorno formal (POST /api/tranzaction/:id/reverse).",
      });
    }
  } catch { /* tabela recibo indisponível — segue para as restantes guardas */ }

  // Guarda 2: transacção REVERSED é imutável
  let beforeData: any = null;
  try {
    const tranzaction: any = await TranzactionModel.findByPk(Number(id));
    if (!tranzaction) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    if (String(tranzaction.getDataValue("status")) === "REVERSED") {
      return res.status(403).json({
        success: false,
        code: "REVERSED_IMMUTABLE",
        message: "Transacção anulada — imutável.",
      });
    }
    beforeData = {
      phoneNumber: tranzaction.getDataValue("phoneNumber"),
      description: tranzaction.getDataValue("description"),
      notes: tranzaction.getDataValue("notes"),
    };
  } catch { /* segue */ }

  // Guarda 3: whitelist de campos — valores monetários NUNCA por aqui
  const allowedFields = ["phoneNumber", "description", "notes", "receiptUrl"];
  const patch: any = {};
  for (const field of allowedFields) {
    if (req.body?.[field] !== undefined) patch[field] = req.body[field];
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({
      success: false,
      code: "NO_VALID_FIELDS",
      message: "Nenhum campo editável enviado (valores monetários exigem estorno formal).",
    });
  }

  const tranzaction = await TranzactionModel.update(patch, { where: { id } });

  // Auditoria da edição (best-effort)
  await writeAudit(req, "PAYMENT_UPDATE", "tranzactions", Number(id), beforeData, patch, null);

  return tranzaction != null
    ? res.status(201).send({ success: true, message: "Payment updated successfully." })
    : res.status(500).send({ success: false, message: "Not found" });
};

/**
 * Verifica se todas as prestações de um crédito foram pagas (status = 1).
 * Se sim, actualiza o status do crédito para 3 (Liquidado) e notifica.
 * (Legado mantido — chamado pós-commit.)
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

  const loan: any = await LoanModel.findByPk(loanId);
  if (!loan || Number(loan.status) === 3) return;

  await LoanModel.update({ status: 3 }, { where: { id: loanId } });

  const loanAmount = Number(loan.amount).toLocaleString("pt-MZ");

  try {
    const customer: any = await CustomerModel.findOne({ where: { accountNumber } });
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
  reverseTranzaction,
  getInstallmentQuote,
  checkReference,
  checkAndLiquidateLoan,
};
