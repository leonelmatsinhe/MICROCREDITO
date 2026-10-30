import { Request, Response } from "express";
import moment from "moment";
import { Op } from "sequelize";
import { LoanModel } from "../database/models/LoanModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { DebtModel } from "../database/models/DebtModel";
import { UserModel } from "../database/models/UserModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { installmentPanification } from "../utils/calculateLateAmount";
import { getLegacyPenaltyParams } from "../services/lateInterestService";
import { getRealDisbursementBalance, getWalletTotalsSummary, getWalletsWithAnalytics } from "../services/financingWalletService";
import { getWalletTotals } from "../services/treasuryService";

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

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (value: any): number => Math.round(toNumber(value) * 100) / 100;

const isValidDateInput = (value: any) => {
  if (value === undefined || value === null || value === "") return true;
  return moment(String(value), "YYYY-MM-DD", true).isValid();
};

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { from, to, creditManager, status } = req.query;
    const companyIdNum = parseInt(String(companyId), 10);

    if (Number.isNaN(companyIdNum) || companyIdNum <= 0) {
      return res.status(400).json({ success: false, message: "companyId inválido." });
    }
    if (!isValidDateInput(from) || !isValidDateInput(to)) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros de data inválidos. Use o formato YYYY-MM-DD.",
      });
    }

    const now = moment();
    // Período filtrado para métricas de FLUXO (desembolsos e cobranças)
    const fromMoment = from ? moment(String(from)).startOf("day") : moment().startOf("month");
    const toMoment = to ? moment(String(to)).endOf("day") : moment().endOf("month");
    const fromStr = fromMoment.format("YYYY-MM-DD");
    const toStr = toMoment.format("YYYY-MM-DD");

    // 1. Buscar TODOS os créditos da empresa para compor métricas de STOCK e PIPELINE
    const allLoansWhere: any = { companyId: companyIdNum };
    if (creditManager && creditManager !== "all") {
      allLoansWhere.creditManager = parseInt(String(creditManager), 10);
    }
    if (status !== undefined && status !== "" && status !== "all") {
      allLoansWhere.status = parseInt(String(status), 10);
    }

    const allLoans: any[] = await LoanModel.findAll({
      where: allLoansWhere,
      attributes: [
        "id",
        "companyId",
        "accountNumber",
        "creditManager",
        "amount",
        "interestRate",
        "numberOfInstallments",
        "dateCreated",
        "disbursementDate",
        "status",
        "approvalState",
        "walletId",
      ],
      order: [["id", "DESC"]],
    });

    const loanIds = allLoans.map((l: any) => l.id);
    const loanMap: Record<number, any> = {};
    allLoans.forEach((l: any) => { loanMap[l.id] = l; });

    // 2. Clientes (Nomes e Telefones para atalhos de cobrança)
    const accountNumbers = [...new Set(allLoans.map((l: any) => l.accountNumber).filter(Boolean))];
    const customerMap: Record<string, { name: string; phone: string }> = {};
    if (accountNumbers.length > 0) {
      const customers = await CustomerModel.findAll({
        where: { companyId: companyIdNum, accountNumber: { [Op.in]: accountNumbers } },
        attributes: ["accountNumber", "customerName", "customerPhone"],
      });
      customers.forEach((c: any) => {
        customerMap[c.accountNumber] = {
          name: c.customerName || `Conta ${c.accountNumber}`,
          phone: c.customerPhone || "",
        };
      });
    }

    // 3. Gestores
    const managers = await UserModel.findAll({
      where: { companyId: companyIdNum },
      attributes: ["id", "name", "userRole"],
    });
    const managerNameMap: Record<number, string> = {};
    managers.forEach((m: any) => { managerNameMap[m.id] = m.name; });

    // 4. Prestações de todos os créditos (para Carteira Activa, Atrasos e PAR)
    let amortizations: any[] = [];
    if (loanIds.length > 0) {
      amortizations = await AmorizationLoanModel.findAll({
        where: { companyId: companyIdNum, loanId: { [Op.in]: loanIds } },
        attributes: [
          "id",
          "loanId",
          "accountNumber",
          "dueDate",
          "status",
          "installment",
          "paidAmount",
          "amortization",
          "rateAmount",
        ],
        order: [["dueDate", "ASC"], ["id", "ASC"]],
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

    const installmentExposure = (a: any) => {
      const remaining = Math.max(0, toNumber(a.installment) - toNumber(a.paidAmount));
      if (Number(a.status) === -1) {
        return toNumber(debtMap[a.id] ?? remaining);
      }
      return remaining;
    };

    // Parâmetros de penalização de mora da empresa
    const { forfeit, maxLateDays, capPercent } = await getLegacyPenaltyParams(companyIdNum);

    // Prestações em aberto (0 = pendente, -1 = parcial)
    const openInstallments = amortizations.filter((a: any) => [0, -1].includes(Number(a.status)));
    const calculatedInstallments = installmentPanification(
      openInstallments,
      forfeit,
      undefined,
      { maxLateDays, capPercent }
    );

    // Identificar atrasos e escalões de mora (Aging)
    const overdueRows = calculatedInstallments
      .map((a: any) => {
        const due = parseDateSafe(a.dueDate);
        const daysOverdue = due ? now.diff(due, "days") : 0;
        return {
          ...a,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          amountDue: installmentExposure(a) + toNumber(a.latePaymentInterest),
        };
      })
      .filter((a: any) => a.daysOverdue > 0);

    // =========================================================================
    // 1. CARTEIRA ACTIVA BRUTA (Gross Loan Portfolio - GLP) & RISCO (PAR30)
    // =========================================================================
    const activeLoansList = allLoans.filter((l: any) => Number(l.status) === 1);
    const pendingLoansList = allLoans.filter((l: any) => Number(l.status) === 0);
    const liquidatedLoansList = allLoans.filter((l: any) => Number(l.status) === 3);

    // Saldo Devedor Total da Carteira Activa (Stock)
    const outstandingPortfolio = round2(
      calculatedInstallments.reduce((sum: number, a: any) => sum + installmentExposure(a), 0)
    );

    const totalContractedWithInterest = round2(
      amortizations.reduce((sum: number, a: any) => sum + toNumber(a.installment), 0)
    );

    const totalPaidSoFar = round2(
      amortizations.reduce((sum: number, a: any) => sum + toNumber(a.paidAmount), 0)
    );

    // Total de crédito em atraso (parcelas vencidas + mora acumulada)
    const overdueAmount = round2(
      overdueRows.reduce((sum: number, a: any) => sum + toNumber(a.amountDue), 0)
    );

    const overdueRate = outstandingPortfolio > 0
      ? round2((overdueAmount / outstandingPortfolio) * 100)
      : 0;

    // Padrão Internacional CGAP para PAR30:
    // Saldo Devedor INTEGRAL dos créditos com pelo menos uma parcela em atraso > 30 dias
    const par30LoansSet = new Set<number>();
    const par60LoansSet = new Set<number>();
    const par90LoansSet = new Set<number>();

    overdueRows.forEach((a: any) => {
      if (a.daysOverdue > 30) par30LoansSet.add(Number(a.loanId));
      if (a.daysOverdue > 60) par60LoansSet.add(Number(a.loanId));
      if (a.daysOverdue > 90) par90LoansSet.add(Number(a.loanId));
    });

    const calcParPortfolio = (loanSet: Set<number>) => {
      const parAmorts = calculatedInstallments.filter((a: any) => loanSet.has(Number(a.loanId)));
      return round2(parAmorts.reduce((sum: number, a: any) => sum + installmentExposure(a), 0));
    };

    const par30Portfolio = calcParPortfolio(par30LoansSet);
    const par60Portfolio = calcParPortfolio(par60LoansSet);
    const par90Portfolio = calcParPortfolio(par90LoansSet);

    const par30Rate = outstandingPortfolio > 0 ? round2((par30Portfolio / outstandingPortfolio) * 100) : 0;
    const par60Rate = outstandingPortfolio > 0 ? round2((par60Portfolio / outstandingPortfolio) * 100) : 0;
    const par90Rate = outstandingPortfolio > 0 ? round2((par90Portfolio / outstandingPortfolio) * 100) : 0;

    // Matriz de Envelhecimento da Carteira (Aging)
    const currentAmort = calculatedInstallments.filter((a: any) => {
      const due = parseDateSafe(a.dueDate);
      return due && !now.isAfter(due, "day");
    });
    const currentAmount = round2(currentAmort.reduce((sum: number, a: any) => sum + installmentExposure(a), 0));

    const calcAgingAmount = (minDays: number, maxDays: number) => {
      return round2(
        overdueRows
          .filter((a: any) => a.daysOverdue >= minDays && (maxDays ? a.daysOverdue <= maxDays : true))
          .reduce((sum: number, a: any) => sum + toNumber(a.amountDue), 0)
      );
    };

    const aging1to30 = calcAgingAmount(1, 30);
    const aging31to60 = calcAgingAmount(31, 60);
    const aging61to90 = calcAgingAmount(61, 90);
    const agingOver90 = calcAgingAmount(91, 0);

    const totalAgingBase = Math.max(1, currentAmount + aging1to30 + aging31to60 + aging61to90 + agingOver90);

    // =========================================================================
    // 2. FLUXO DO PERÍODO SELECCIONADO (Desembolsos & Cobranças)
    // =========================================================================
    // Desembolsos no período
    const periodDisbursedLoans = allLoans.filter((l: any) => {
      if (![1, 3].includes(Number(l.status))) return false;
      const disbDate = l.disbursementDate || l.dateCreated;
      if (!disbDate) return false;
      return disbDate >= fromStr && disbDate <= toStr;
    });

    const periodDisbursedAmount = round2(
      periodDisbursedLoans.reduce((sum: number, l: any) => sum + toNumber(l.amount), 0)
    );
    const periodDisbursedCount = periodDisbursedLoans.length;

    // Transações no período (pagamentos recebidos)
    const txWhere: any = {
      companyId: companyIdNum,
      createdAt: {
        [Op.between]: [fromMoment.toDate(), toMoment.toDate()],
      },
    };
    if (loanIds.length > 0) {
      txWhere.loanId = { [Op.in]: loanIds };
    }

    const periodTransactions = await TranzactionModel.findAll({
      where: txWhere,
      attributes: [
        "id",
        "loanId",
        "amount",
        "latePaymentInterest",
        "interestRateAmount",
        "discountAmount",
        "createdAt",
      ],
    });

    const periodCollectedTotal = round2(
      periodTransactions.reduce((sum: number, t: any) => sum + toNumber(t.amount), 0)
    );
    const periodPrincipalCollected = round2(
      periodTransactions.reduce(
        (sum: number, t: any) => sum + Math.max(0, toNumber(t.amount) - toNumber(t.interestRateAmount)),
        0
      )
    );
    const periodInterestCollected = round2(
      periodTransactions.reduce((sum: number, t: any) => sum + toNumber(t.interestRateAmount), 0)
    );
    const periodMoraCollected = round2(
      periodTransactions.reduce((sum: number, t: any) => sum + toNumber(t.latePaymentInterest), 0)
    );

    // Prestações que venceram no período seleccionado (para calcular Taxa de Eficácia de Cobrança)
    const dueInPeriodAmorts = amortizations.filter((a: any) => {
      const d = parseDateSafe(a.dueDate);
      if (!d) return false;
      const dStr = d.format("YYYY-MM-DD");
      return dStr >= fromStr && dStr <= toStr;
    });

    const dueInPeriodExpectedAmount = round2(
      dueInPeriodAmorts.reduce((sum: number, a: any) => sum + toNumber(a.installment), 0)
    );

    const collectionEfficiencyRate = dueInPeriodExpectedAmount > 0
      ? round2(Math.min(100, (periodCollectedTotal / dueInPeriodExpectedAmount) * 100))
      : 100;

    // =========================================================================
    // 3. LIQUIDEZ REAL & TESOURARIA
    // =========================================================================
    let realLiquidity = { available: 0, accounts: [] as any[] };
    try {
      realLiquidity = await getRealDisbursementBalance(companyIdNum);
    } catch {}

    let treasuryTotals = { total: 0, bank: 0, mobile: 0, cash: 0 };
    try {
      treasuryTotals = await getWalletTotals(companyIdNum);
    } catch {}

    // =========================================================================
    // 4. FUNIL OPERACIONAL (Pipeline de Concessão)
    // =========================================================================
    const sevenDaysFromNow = moment().add(7, "days").format("YYYY-MM-DD");
    const todayStr = moment().format("YYYY-MM-DD");

    const dueThisWeekAmorts = amortizations.filter((a: any) => {
      if (![0, -1].includes(Number(a.status))) return false;
      const d = parseDateSafe(a.dueDate);
      if (!d) return false;
      const dStr = d.format("YYYY-MM-DD");
      return dStr >= todayStr && dStr <= sevenDaysFromNow;
    });

    const pipeline = {
      pendingRequestsCount: pendingLoansList.length,
      pendingRequestsAmount: round2(
        pendingLoansList.reduce((s: number, l: any) => s + toNumber(l.amount), 0)
      ),
      approvedWaitingDisbursementCount: allLoans.filter(
        (l: any) => String(l.approvalState).toUpperCase() === "APPROVED" && Number(l.status) === 0
      ).length,
      approvedWaitingDisbursementAmount: round2(
        allLoans
          .filter((l: any) => String(l.approvalState).toUpperCase() === "APPROVED" && Number(l.status) === 0)
          .reduce((s: number, l: any) => s + toNumber(l.amount), 0)
      ),
      dueThisWeekCount: dueThisWeekAmorts.length,
      dueThisWeekAmount: round2(
        dueThisWeekAmorts.reduce((s: number, a: any) => s + installmentExposure(a), 0)
      ),
      criticalOverdueCount: par30LoansSet.size,
      criticalOverdueAmount: par30Portfolio,
    };

    // =========================================================================
    // 5. DESEMPENHO E RISCO POR GESTOR DE CRÉDITO
    // =========================================================================
    const managerStatsMap: Record<number, any> = {};
    allLoans.forEach((l: any) => {
      const managerId = Number(l.creditManager) || 0;
      if (!managerStatsMap[managerId]) {
        managerStatsMap[managerId] = {
          managerId,
          managerName: managerNameMap[managerId] || `Gestor #${managerId}`,
          loansCount: 0,
          activeLoansCount: 0,
          portfolioAmount: 0,
          collectedInPeriod: 0,
          overdueExposure: 0,
          par30LoansCount: 0,
        };
      }
      managerStatsMap[managerId].loansCount += 1;
      if (Number(l.status) === 1) {
        managerStatsMap[managerId].activeLoansCount += 1;
      }
    });

    calculatedInstallments.forEach((a: any) => {
      const loan = loanMap[toNumber(a.loanId)];
      if (!loan) return;
      const managerId = Number(loan.creditManager) || 0;
      if (!managerStatsMap[managerId]) return;
      managerStatsMap[managerId].portfolioAmount += installmentExposure(a);
    });

    periodTransactions.forEach((t: any) => {
      const loan = loanMap[toNumber(t.loanId)];
      if (!loan) return;
      const managerId = Number(loan.creditManager) || 0;
      if (!managerStatsMap[managerId]) return;
      managerStatsMap[managerId].collectedInPeriod += toNumber(t.amount);
    });

    overdueRows.forEach((a: any) => {
      const loan = loanMap[toNumber(a.loanId)];
      if (!loan) return;
      const managerId = Number(loan.creditManager) || 0;
      if (!managerStatsMap[managerId]) return;
      managerStatsMap[managerId].overdueExposure += toNumber(a.amountDue);
      if (a.daysOverdue > 30) {
        managerStatsMap[managerId].par30LoansCount += 1;
      }
    });

    const riskByManager = Object.values(managerStatsMap)
      .map((m: any) => ({
        managerId: m.managerId,
        managerName: m.managerName,
        loansCount: m.loansCount,
        activeLoansCount: m.activeLoansCount,
        portfolioAmount: round2(m.portfolioAmount),
        collectedInPeriod: round2(m.collectedInPeriod),
        overdueExposure: round2(m.overdueExposure),
        overdueRate: m.portfolioAmount > 0 ? round2((m.overdueExposure / m.portfolioAmount) * 100) : 0,
        par30LoansCount: m.par30LoansCount,
      }))
      .sort((a, b) => b.portfolioAmount - a.portfolioAmount);

    // =========================================================================
    // 6. ALERTAS URGENTES DE COBRANÇA
    // =========================================================================
    const alerts = overdueRows
      .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue)
      .slice(0, 10)
      .map((a: any) => {
        const loan = loanMap[toNumber(a.loanId)];
        const managerId = loan ? Number(loan.creditManager) : 0;
        const cust = customerMap[a.accountNumber] || { name: `Conta ${a.accountNumber}`, phone: "" };
        return {
          loanId: a.loanId,
          accountNumber: a.accountNumber,
          customerName: cust.name,
          customerPhone: cust.phone,
          dueDate: a.dueDate,
          daysOverdue: a.daysOverdue,
          latePaymentInterest: round2(a.latePaymentInterest),
          amountDue: round2(a.amountDue),
          managerName: managerNameMap[managerId] || `Gestor #${managerId}`,
        };
      });

    // =========================================================================
    // 7. PRÓXIMAS PRESTAÇÕES A VENCER (0 a 30 dias)
    // =========================================================================
    const thirtyDaysFromNow = moment().add(30, "days").toDate();
    const upcomingInstallments = amortizations
      .filter((a: any) => {
        if (![0, -1].includes(Number(a.status))) return false;
        const d = parseDateSafe(a.dueDate);
        if (!d) return false;
        return d.toDate() >= now.toDate() && d.toDate() <= thirtyDaysFromNow;
      })
      .sort((a: any, b: any) => {
        const dA = parseDateSafe(a.dueDate)?.unix() || 0;
        const dB = parseDateSafe(b.dueDate)?.unix() || 0;
        return dA - dB;
      })
      .slice(0, 10)
      .map((a: any) => {
        const loan = loanMap[toNumber(a.loanId)];
        const managerId = loan ? Number(loan.creditManager) : 0;
        const cust = customerMap[a.accountNumber] || { name: `Conta ${a.accountNumber}`, phone: "" };
        const due = parseDateSafe(a.dueDate);
        const daysUntilDue = due ? Math.max(0, Math.ceil(due.diff(now, "days", true))) : 0;
        return {
          id: a.id,
          loanId: a.loanId,
          accountNumber: a.accountNumber,
          customerName: cust.name,
          customerPhone: cust.phone,
          amount: round2(a.installment),
          dueDate: a.dueDate,
          daysUntilDue,
          status: Number(a.status),
          managerName: managerNameMap[managerId] || `Gestor #${managerId}`,
        };
      });

    // =========================================================================
    // 8. GRÁFICO HISTÓRICO COMPARATIVO (Últimos 6 meses)
    // =========================================================================
    const chartLabels: string[] = [];
    const chartDisbursed: number[] = [];
    const chartPayments: number[] = [];
    const ptMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (let i = 5; i >= 0; i--) {
      const m = moment().subtract(i, "months");
      const mLabel = `${ptMonths[m.month()]}/${m.format("YY")}`;
      chartLabels.push(mLabel);
      const mStart = m.clone().startOf("month").format("YYYY-MM-DD");
      const mEnd = m.clone().endOf("month").format("YYYY-MM-DD");

      const monthDisb = allLoans
        .filter((l: any) => [1, 3].includes(Number(l.status)) && (l.disbursementDate || l.dateCreated) >= mStart && (l.disbursementDate || l.dateCreated) <= mEnd)
        .reduce((sum: number, l: any) => sum + toNumber(l.amount), 0);
      chartDisbursed.push(round2(monthDisb));

      // As transações do mês são buscadas sob procura
      const mStartDate = m.clone().startOf("month").toDate();
      const mEndDate = m.clone().endOf("month").toDate();
      const monthTx = await TranzactionModel.sum("amount", {
        where: {
          companyId: companyIdNum,
          createdAt: { [Op.between]: [mStartDate, mEndDate] },
        },
      });
      chartPayments.push(round2(monthTx || 0));
    }

    // =========================================================================
    // 9. RESUMO COMPACTO DAS CARTEIRAS DE FINANCIADORES
    // =========================================================================
    let walletsSummary: any = null;
    try {
      const ws = await getWalletsWithAnalytics(companyIdNum, { onlyActive: true });
      const wSum = await getWalletTotalsSummary(companyIdNum);
      walletsSummary = {
        summary: wSum,
        items: ws.map((w: any) => ({
          id: w.id,
          codigo: w.codigo,
          nome: w.nome,
          parceiro_nome: w.parceiro_nome,
          allocated_amount: w.allocated_amount,
          disbursed: w.disbursed,
          saldo_analitico: w.saldo_analitico,
          utilizacao: w.utilizacao,
          num_creditos: w.num_creditos,
          taxa_juro: w.taxa_juro,
          cor_badge: w.cor_badge,
        })),
      };
    } catch {}

    // Resposta final completa e compatível com microcrédito bancário
    return res.status(200).json({
      success: true,
      period: {
        from: fromStr,
        to: toStr,
        label: `${fromMoment.format("DD/MM/YYYY")} a ${toMoment.format("DD/MM/YYYY")}`,
      },
      kpis: {
        portfolio: {
          activeLoansCount: activeLoansList.length,
          outstandingPortfolio,
          totalContractedWithInterest,
          totalPaidSoFar,
          activeBorrowersCount: new Set(activeLoansList.map((l: any) => l.accountNumber)).size,
        },
        delinquency: {
          overdueAmount,
          overdueRate,
          par30Amount: par30Portfolio,
          par30Rate,
          par60Amount: par60Portfolio,
          par60Rate,
          par90Amount: par90Portfolio,
          par90Rate,
          overdueLoansCount: overdueRows.length > 0 ? new Set(overdueRows.map((r: any) => r.loanId)).size : 0,
          overdueInstallmentsCount: overdueRows.length,
          aging: {
            current: currentAmount,
            currentRate: round2((currentAmount / totalAgingBase) * 100),
            days1to30: aging1to30,
            days1to30Rate: round2((aging1to30 / totalAgingBase) * 100),
            days31to60: aging31to60,
            days31to60Rate: round2((aging31to60 / totalAgingBase) * 100),
            days61to90: aging61to90,
            days61to90Rate: round2((aging61to90 / totalAgingBase) * 100),
            daysOver90: agingOver90,
            daysOver90Rate: round2((agingOver90 / totalAgingBase) * 100),
          },
        },
        movement: {
          disbursedAmount: periodDisbursedAmount,
          disbursedCount: periodDisbursedCount,
          collectedAmount: periodCollectedTotal,
          principalCollected: periodPrincipalCollected,
          interestCollected: periodInterestCollected,
          moraCollected: periodMoraCollected,
          paymentsCount: periodTransactions.length,
          expectedDueAmount: dueInPeriodExpectedAmount,
          collectionEfficiencyRate,
        },
        liquidity: {
          availableForDisbursement: round2(realLiquidity.available),
          disbursementAccountsCount: realLiquidity.accounts?.length || 0,
          totalBankBalance: round2(treasuryTotals.bank),
          totalCashBalance: round2(treasuryTotals.cash),
          totalTreasury: round2(treasuryTotals.total),
        },
        pipeline,
      },
      riskByManager,
      alerts,
      upcomingInstallments,
      chartData: {
        labels: chartLabels,
        disbursed: chartDisbursed,
        payments: chartPayments,
      },
      walletsSummary,
    });
  } catch (error: any) {
    console.error("Erro ao obter visão do dashboard:", error);
    return res.status(500).json({ success: false, message: error.message || "Erro interno no dashboard." });
  }
};
