import { Request, Response } from "express";
import moment from "moment";
import { Op } from "sequelize";
import { LoanModel } from "../database/models/LoanModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { DebtModel } from "../database/models/DebtModel";
import { UserModel } from "../database/models/UserModel";

const parseDateSafe = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return moment(value);
  const formats = [
    "YYYY-MM-DD",
    "YYYY-MM-DD HH:mm:ss",
    "YYYY/MM/DD",
    "DD/MM/YYYY",
    "DD-MM-YYYY",
    moment.ISO_8601,
  ];
  for (const f of formats) {
    const parsed = moment(value, f as any, true);
    if (parsed.isValid()) return parsed;
  }
  const fallback = moment(value);
  return fallback.isValid() ? fallback : null;
};

const toNumber = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { from, to, creditManager, status } = req.query;

    const loanWhere: any = { companyId };
    if (creditManager && creditManager !== "all") {
      loanWhere.creditManager = parseInt(String(creditManager), 10);
    }
    if (status !== undefined && status !== "" && status !== "all") {
      loanWhere.status = parseInt(String(status), 10);
    }

    let loans: any[] = await LoanModel.findAll({
      where: loanWhere,
      attributes: [
        "id",
        "companyId",
        "accountNumber",
        "creditManager",
        "amount",
        "dateCreated",
        "status",
      ],
      order: [["id", "DESC"]],
    });

    const fromMoment = from ? moment(String(from)).startOf("day") : null;
    const toMoment = to ? moment(String(to)).endOf("day") : null;
    if (fromMoment || toMoment) {
      loans = loans.filter((l: any) => {
        const d = parseDateSafe(l.dateCreated);
        if (!d) return false;
        if (fromMoment && d.isBefore(fromMoment)) return false;
        if (toMoment && d.isAfter(toMoment)) return false;
        return true;
      });
    }

    const loanIds = loans.map((l: any) => l.id);
    const loanIdSet = new Set<number>(loanIds);

    let transactions: any[] = [];
    if (loanIds.length > 0) {
      const txWhere: any = {
        companyId,
        loanId: { [Op.in]: loanIds },
      };
      if (fromMoment && toMoment) {
        txWhere.createdAt = {
          [Op.between]: [fromMoment.toDate(), toMoment.toDate()],
        };
      } else if (fromMoment) {
        txWhere.createdAt = { [Op.gte]: fromMoment.toDate() };
      } else if (toMoment) {
        txWhere.createdAt = { [Op.lte]: toMoment.toDate() };
      }
      transactions = await TranzactionModel.findAll({
        where: txWhere,
        attributes: [
          "loanId",
          "amount",
          "latePaymentInterest",
          "interestRateAmount",
          "createdAt",
        ],
      });
    }

    let amortizations: any[] = [];
    if (loanIds.length > 0) {
      amortizations = await AmorizationLoanModel.findAll({
        where: {
          companyId,
          loanId: { [Op.in]: loanIds },
        },
        attributes: ["id", "loanId", "accountNumber", "dueDate", "status", "installment"],
      });
    }

    const partialInstallments = amortizations
      .filter((a: any) => Number(a.status) === -1)
      .map((a: any) => a.id);

    const debtMap: Record<number, number> = {};
    if (partialInstallments.length > 0) {
      const debts: any[] = await DebtModel.findAll({
        where: { amortisationId: { [Op.in]: partialInstallments } },
        attributes: ["amortisationId", "debtAmount"],
      });
      debts.forEach((d: any) => {
        debtMap[d.amortisationId] = toNumber(d.debtAmount);
      });
    }

    const managers = await UserModel.findAll({
      where: { companyId },
      attributes: ["id", "name", "userRole"],
    });
    const managerNameMap: Record<number, string> = {};
    managers.forEach((m: any) => {
      managerNameMap[m.id] = m.name;
    });

    const loanMap: Record<number, any> = {};
    loans.forEach((l: any) => {
      loanMap[l.id] = l;
    });

    const now = moment();
    const openInstallments = amortizations.filter((a: any) =>
      [0, -1].includes(Number(a.status))
    );

    const installmentExposure = (a: any) => {
      if (Number(a.status) === -1) {
        return toNumber(debtMap[a.id] ?? a.installment);
      }
      return toNumber(a.installment);
    };

    const overdueRows = openInstallments
      .map((a: any) => {
        const due = parseDateSafe(a.dueDate);
        const daysOverdue = due ? now.diff(due, "days") : 0;
        return {
          ...a,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          amountDue: installmentExposure(a),
        };
      })
      .filter((a: any) => a.daysOverdue > 0);

    const outstandingPortfolio = openInstallments.reduce(
      (sum: number, a: any) => sum + installmentExposure(a),
      0
    );
    const overdueAmount = overdueRows.reduce(
      (sum: number, a: any) => sum + toNumber(a.amountDue),
      0
    );

    const par30Amount = overdueRows
      .filter((a: any) => a.daysOverdue > 30)
      .reduce((sum: number, a: any) => sum + toNumber(a.amountDue), 0);
    const par60Amount = overdueRows
      .filter((a: any) => a.daysOverdue > 60)
      .reduce((sum: number, a: any) => sum + toNumber(a.amountDue), 0);
    const par90Amount = overdueRows
      .filter((a: any) => a.daysOverdue > 90)
      .reduce((sum: number, a: any) => sum + toNumber(a.amountDue), 0);

    const totalDisbursed = loans.reduce(
      (sum: number, l: any) => sum + toNumber(l.amount),
      0
    );
    const totalCollected = transactions.reduce(
      (sum: number, t: any) => sum + toNumber(t.amount),
      0
    );
    const totalLateInterest = transactions.reduce(
      (sum: number, t: any) => sum + toNumber(t.latePaymentInterest),
      0
    );
    const totalInterestCollected = transactions.reduce(
      (sum: number, t: any) => sum + toNumber(t.interestRateAmount),
      0
    );

    const totalLoans = loans.length;
    const statusCount = {
      pending: loans.filter((l: any) => Number(l.status) === 0).length,
      active: loans.filter((l: any) => Number(l.status) === 1).length,
      rejected: loans.filter((l: any) => [2, -1].includes(Number(l.status))).length,
      liquidated: loans.filter((l: any) => Number(l.status) === 3).length,
    };

    const riskByManagerMap: Record<number, any> = {};
    loans.forEach((l: any) => {
      const managerId = Number(l.creditManager) || 0;
      if (!riskByManagerMap[managerId]) {
        riskByManagerMap[managerId] = {
          managerId,
          managerName: managerNameMap[managerId] || `Gestor #${managerId}`,
          loansCount: 0,
          principal: 0,
          collected: 0,
          overdueExposure: 0,
          overdueLoansSet: new Set<number>(),
        };
      }
      riskByManagerMap[managerId].loansCount += 1;
      riskByManagerMap[managerId].principal += toNumber(l.amount);
    });

    transactions.forEach((t: any) => {
      const loan = loanMap[toNumber(t.loanId)];
      if (!loan) return;
      const managerId = Number(loan.creditManager) || 0;
      if (!riskByManagerMap[managerId]) return;
      riskByManagerMap[managerId].collected += toNumber(t.amount);
    });

    overdueRows.forEach((a: any) => {
      const loan = loanMap[toNumber(a.loanId)];
      if (!loan) return;
      const managerId = Number(loan.creditManager) || 0;
      if (!riskByManagerMap[managerId]) return;
      riskByManagerMap[managerId].overdueExposure += toNumber(a.amountDue);
      riskByManagerMap[managerId].overdueLoansSet.add(Number(a.loanId));
    });

    const riskByManager = Object.values(riskByManagerMap)
      .map((m: any) => ({
        managerId: m.managerId,
        managerName: m.managerName,
        loansCount: m.loansCount,
        overdueLoans: m.overdueLoansSet.size,
        principal: Number(m.principal.toFixed(2)),
        collected: Number(m.collected.toFixed(2)),
        overdueExposure: Number(m.overdueExposure.toFixed(2)),
        overdueRate:
          m.principal > 0
            ? Number(((m.overdueExposure / m.principal) * 100).toFixed(2))
            : 0,
      }))
      .sort((a: any, b: any) => b.overdueExposure - a.overdueExposure);

    const alerts = overdueRows
      .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue)
      .slice(0, 10)
      .map((a: any) => {
        const loan = loanMap[toNumber(a.loanId)];
        const managerId = loan ? Number(loan.creditManager) : 0;
        return {
          loanId: a.loanId,
          accountNumber: a.accountNumber,
          dueDate: a.dueDate,
          daysOverdue: a.daysOverdue,
          amountDue: Number(toNumber(a.amountDue).toFixed(2)),
          managerId,
          managerName: managerNameMap[managerId] || `Gestor #${managerId}`,
        };
      });

    return res.status(200).json({
      success: true,
      filters: {
        companyId: Number(companyId),
        from: from ? String(from) : null,
        to: to ? String(to) : null,
        creditManager: creditManager ? Number(creditManager) : null,
        status: status !== undefined && status !== "" ? Number(status) : null,
      },
      kpis: {
        loans: {
          total: totalLoans,
          ...statusCount,
        },
        financial: {
          totalDisbursed: Number(totalDisbursed.toFixed(2)),
          totalCollected: Number(totalCollected.toFixed(2)),
          totalInterestCollected: Number(totalInterestCollected.toFixed(2)),
          totalLateInterest: Number(totalLateInterest.toFixed(2)),
          avgTicket: totalLoans > 0 ? Number((totalDisbursed / totalLoans).toFixed(2)) : 0,
          roiPct:
            totalDisbursed > 0
              ? Number(
                (((totalInterestCollected + totalLateInterest) / totalDisbursed) * 100).toFixed(2)
              )
              : 0,
        },
        delinquency: {
          outstandingPortfolio: Number(outstandingPortfolio.toFixed(2)),
          overdueAmount: Number(overdueAmount.toFixed(2)),
          overdueRate:
            outstandingPortfolio > 0
              ? Number(((overdueAmount / outstandingPortfolio) * 100).toFixed(2))
              : 0,
          par30Amount: Number(par30Amount.toFixed(2)),
          par60Amount: Number(par60Amount.toFixed(2)),
          par90Amount: Number(par90Amount.toFixed(2)),
          par30Rate:
            outstandingPortfolio > 0
              ? Number(((par30Amount / outstandingPortfolio) * 100).toFixed(2))
              : 0,
          par60Rate:
            outstandingPortfolio > 0
              ? Number(((par60Amount / outstandingPortfolio) * 100).toFixed(2))
              : 0,
          par90Rate:
            outstandingPortfolio > 0
              ? Number(((par90Amount / outstandingPortfolio) * 100).toFixed(2))
              : 0,
          overdueInstallmentsCount: overdueRows.length,
        },
      },
      riskByManager,
      alerts,
    });
  } catch (error: any) {
    console.error("Erro ao obter visão agregada do dashboard:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro interno ao obter dashboard.",
    });
  }
};

export { getDashboardOverview };
