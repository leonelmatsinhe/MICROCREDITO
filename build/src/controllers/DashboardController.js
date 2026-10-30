"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardOverview = void 0;
const moment_1 = __importDefault(require("moment"));
const sequelize_1 = require("sequelize");
const LoanModel_1 = require("../database/models/LoanModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const DebtModel_1 = require("../database/models/DebtModel");
const UserModel_1 = require("../database/models/UserModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
const lateInterestService_1 = require("../services/lateInterestService");
const financingWalletService_1 = require("../services/financingWalletService");
const treasuryService_1 = require("../services/treasuryService");
const parseDateSafe = (value) => {
    if (!value)
        return null;
    if (value instanceof Date)
        return (0, moment_1.default)(value);
    const formats = [
        "YYYY-MM-DD",
        "YYYY-MM-DD HH:mm:ss",
        "YYYY/MM/DD",
        "DD/MM/YYYY",
        "DD-MM-YYYY",
        moment_1.default.ISO_8601,
    ];
    for (const f of formats) {
        const parsed = (0, moment_1.default)(value, f, true);
        if (parsed.isValid())
            return parsed;
    }
    const fallback = (0, moment_1.default)(value);
    return fallback.isValid() ? fallback : null;
};
const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};
const round2 = (value) => Math.round(toNumber(value) * 100) / 100;
const isValidDateInput = (value) => {
    if (value === undefined || value === null || value === "")
        return true;
    return (0, moment_1.default)(String(value), "YYYY-MM-DD", true).isValid();
};
const getDashboardOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
        const now = (0, moment_1.default)();
        // Período filtrado para métricas de FLUXO (desembolsos e cobranças)
        const fromMoment = from ? (0, moment_1.default)(String(from)).startOf("day") : (0, moment_1.default)().startOf("month");
        const toMoment = to ? (0, moment_1.default)(String(to)).endOf("day") : (0, moment_1.default)().endOf("month");
        const fromStr = fromMoment.format("YYYY-MM-DD");
        const toStr = toMoment.format("YYYY-MM-DD");
        // 1. Buscar TODOS os créditos da empresa para compor métricas de STOCK e PIPELINE
        const allLoansWhere = { companyId: companyIdNum };
        if (creditManager && creditManager !== "all") {
            allLoansWhere.creditManager = parseInt(String(creditManager), 10);
        }
        if (status !== undefined && status !== "" && status !== "all") {
            allLoansWhere.status = parseInt(String(status), 10);
        }
        const allLoans = yield LoanModel_1.LoanModel.findAll({
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
        const loanIds = allLoans.map((l) => l.id);
        const loanMap = {};
        allLoans.forEach((l) => { loanMap[l.id] = l; });
        // 2. Clientes (Nomes e Telefones para atalhos de cobrança)
        const accountNumbers = [...new Set(allLoans.map((l) => l.accountNumber).filter(Boolean))];
        const customerMap = {};
        if (accountNumbers.length > 0) {
            const customers = yield CustomerModel_1.CustomerModel.findAll({
                where: { companyId: companyIdNum, accountNumber: { [sequelize_1.Op.in]: accountNumbers } },
                attributes: ["accountNumber", "customerName", "customerPhone"],
            });
            customers.forEach((c) => {
                customerMap[c.accountNumber] = {
                    name: c.customerName || `Conta ${c.accountNumber}`,
                    phone: c.customerPhone || "",
                };
            });
        }
        // 3. Gestores
        const managers = yield UserModel_1.UserModel.findAll({
            where: { companyId: companyIdNum },
            attributes: ["id", "name", "userRole"],
        });
        const managerNameMap = {};
        managers.forEach((m) => { managerNameMap[m.id] = m.name; });
        // 4. Prestações de todos os créditos (para Carteira Activa, Atrasos e PAR)
        let amortizations = [];
        if (loanIds.length > 0) {
            amortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
                where: { companyId: companyIdNum, loanId: { [sequelize_1.Op.in]: loanIds } },
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
            .filter((a) => Number(a.status) === -1)
            .map((a) => a.id);
        const debtMap = {};
        if (partialInstallments.length > 0) {
            const debts = yield DebtModel_1.DebtModel.findAll({
                where: { amortisationId: { [sequelize_1.Op.in]: partialInstallments } },
                attributes: ["amortisationId", "debtAmount"],
            });
            debts.forEach((d) => {
                debtMap[d.amortisationId] = toNumber(d.debtAmount);
            });
        }
        const installmentExposure = (a) => {
            var _a;
            const remaining = Math.max(0, toNumber(a.installment) - toNumber(a.paidAmount));
            if (Number(a.status) === -1) {
                return toNumber((_a = debtMap[a.id]) !== null && _a !== void 0 ? _a : remaining);
            }
            return remaining;
        };
        // Parâmetros de penalização de mora da empresa
        const { forfeit, maxLateDays, capPercent } = yield (0, lateInterestService_1.getLegacyPenaltyParams)(companyIdNum);
        // Prestações em aberto (0 = pendente, -1 = parcial)
        const openInstallments = amortizations.filter((a) => [0, -1].includes(Number(a.status)));
        const calculatedInstallments = (0, calculateLateAmount_1.installmentPanification)(openInstallments, forfeit, undefined, { maxLateDays, capPercent });
        // Identificar atrasos e escalões de mora (Aging)
        const overdueRows = calculatedInstallments
            .map((a) => {
            const due = parseDateSafe(a.dueDate);
            const daysOverdue = due ? now.diff(due, "days") : 0;
            return Object.assign(Object.assign({}, a), { daysOverdue: daysOverdue > 0 ? daysOverdue : 0, amountDue: installmentExposure(a) + toNumber(a.latePaymentInterest) });
        })
            .filter((a) => a.daysOverdue > 0);
        // =========================================================================
        // 1. CARTEIRA ACTIVA BRUTA (Gross Loan Portfolio - GLP) & RISCO (PAR30)
        // =========================================================================
        const activeLoansList = allLoans.filter((l) => Number(l.status) === 1);
        const pendingLoansList = allLoans.filter((l) => Number(l.status) === 0);
        const liquidatedLoansList = allLoans.filter((l) => Number(l.status) === 3);
        // Saldo Devedor Total da Carteira Activa (Stock)
        const outstandingPortfolio = round2(calculatedInstallments.reduce((sum, a) => sum + installmentExposure(a), 0));
        const totalContractedWithInterest = round2(amortizations.reduce((sum, a) => sum + toNumber(a.installment), 0));
        const totalPaidSoFar = round2(amortizations.reduce((sum, a) => sum + toNumber(a.paidAmount), 0));
        // Total de crédito em atraso (parcelas vencidas + mora acumulada)
        const overdueAmount = round2(overdueRows.reduce((sum, a) => sum + toNumber(a.amountDue), 0));
        const overdueRate = outstandingPortfolio > 0
            ? round2((overdueAmount / outstandingPortfolio) * 100)
            : 0;
        // Padrão Internacional CGAP para PAR30:
        // Saldo Devedor INTEGRAL dos créditos com pelo menos uma parcela em atraso > 30 dias
        const par30LoansSet = new Set();
        const par60LoansSet = new Set();
        const par90LoansSet = new Set();
        overdueRows.forEach((a) => {
            if (a.daysOverdue > 30)
                par30LoansSet.add(Number(a.loanId));
            if (a.daysOverdue > 60)
                par60LoansSet.add(Number(a.loanId));
            if (a.daysOverdue > 90)
                par90LoansSet.add(Number(a.loanId));
        });
        const calcParPortfolio = (loanSet) => {
            const parAmorts = calculatedInstallments.filter((a) => loanSet.has(Number(a.loanId)));
            return round2(parAmorts.reduce((sum, a) => sum + installmentExposure(a), 0));
        };
        const par30Portfolio = calcParPortfolio(par30LoansSet);
        const par60Portfolio = calcParPortfolio(par60LoansSet);
        const par90Portfolio = calcParPortfolio(par90LoansSet);
        const par30Rate = outstandingPortfolio > 0 ? round2((par30Portfolio / outstandingPortfolio) * 100) : 0;
        const par60Rate = outstandingPortfolio > 0 ? round2((par60Portfolio / outstandingPortfolio) * 100) : 0;
        const par90Rate = outstandingPortfolio > 0 ? round2((par90Portfolio / outstandingPortfolio) * 100) : 0;
        // Matriz de Envelhecimento da Carteira (Aging)
        const currentAmort = calculatedInstallments.filter((a) => {
            const due = parseDateSafe(a.dueDate);
            return due && !now.isAfter(due, "day");
        });
        const currentAmount = round2(currentAmort.reduce((sum, a) => sum + installmentExposure(a), 0));
        const calcAgingAmount = (minDays, maxDays) => {
            return round2(overdueRows
                .filter((a) => a.daysOverdue >= minDays && (maxDays ? a.daysOverdue <= maxDays : true))
                .reduce((sum, a) => sum + toNumber(a.amountDue), 0));
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
        const periodDisbursedLoans = allLoans.filter((l) => {
            if (![1, 3].includes(Number(l.status)))
                return false;
            const disbDate = l.disbursementDate || l.dateCreated;
            if (!disbDate)
                return false;
            return disbDate >= fromStr && disbDate <= toStr;
        });
        const periodDisbursedAmount = round2(periodDisbursedLoans.reduce((sum, l) => sum + toNumber(l.amount), 0));
        const periodDisbursedCount = periodDisbursedLoans.length;
        // Transações no período (pagamentos recebidos)
        const txWhere = {
            companyId: companyIdNum,
            createdAt: {
                [sequelize_1.Op.between]: [fromMoment.toDate(), toMoment.toDate()],
            },
        };
        if (loanIds.length > 0) {
            txWhere.loanId = { [sequelize_1.Op.in]: loanIds };
        }
        const periodTransactions = yield TranzactionModel_1.TranzactionModel.findAll({
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
        const periodCollectedTotal = round2(periodTransactions.reduce((sum, t) => sum + toNumber(t.amount), 0));
        const periodPrincipalCollected = round2(periodTransactions.reduce((sum, t) => sum + Math.max(0, toNumber(t.amount) - toNumber(t.interestRateAmount)), 0));
        const periodInterestCollected = round2(periodTransactions.reduce((sum, t) => sum + toNumber(t.interestRateAmount), 0));
        const periodMoraCollected = round2(periodTransactions.reduce((sum, t) => sum + toNumber(t.latePaymentInterest), 0));
        // Prestações que venceram no período seleccionado (para calcular Taxa de Eficácia de Cobrança)
        const dueInPeriodAmorts = amortizations.filter((a) => {
            const d = parseDateSafe(a.dueDate);
            if (!d)
                return false;
            const dStr = d.format("YYYY-MM-DD");
            return dStr >= fromStr && dStr <= toStr;
        });
        const dueInPeriodExpectedAmount = round2(dueInPeriodAmorts.reduce((sum, a) => sum + toNumber(a.installment), 0));
        const collectionEfficiencyRate = dueInPeriodExpectedAmount > 0
            ? round2(Math.min(100, (periodCollectedTotal / dueInPeriodExpectedAmount) * 100))
            : 100;
        // =========================================================================
        // 3. LIQUIDEZ REAL & TESOURARIA
        // =========================================================================
        let realLiquidity = { available: 0, accounts: [] };
        try {
            realLiquidity = yield (0, financingWalletService_1.getRealDisbursementBalance)(companyIdNum);
        }
        catch (_b) { }
        let treasuryTotals = { total: 0, bank: 0, mobile: 0, cash: 0 };
        try {
            treasuryTotals = yield (0, treasuryService_1.getWalletTotals)(companyIdNum);
        }
        catch (_c) { }
        // =========================================================================
        // 4. FUNIL OPERACIONAL (Pipeline de Concessão)
        // =========================================================================
        const sevenDaysFromNow = (0, moment_1.default)().add(7, "days").format("YYYY-MM-DD");
        const todayStr = (0, moment_1.default)().format("YYYY-MM-DD");
        const dueThisWeekAmorts = amortizations.filter((a) => {
            if (![0, -1].includes(Number(a.status)))
                return false;
            const d = parseDateSafe(a.dueDate);
            if (!d)
                return false;
            const dStr = d.format("YYYY-MM-DD");
            return dStr >= todayStr && dStr <= sevenDaysFromNow;
        });
        const pipeline = {
            pendingRequestsCount: pendingLoansList.length,
            pendingRequestsAmount: round2(pendingLoansList.reduce((s, l) => s + toNumber(l.amount), 0)),
            approvedWaitingDisbursementCount: allLoans.filter((l) => String(l.approvalState).toUpperCase() === "APPROVED" && Number(l.status) === 0).length,
            approvedWaitingDisbursementAmount: round2(allLoans
                .filter((l) => String(l.approvalState).toUpperCase() === "APPROVED" && Number(l.status) === 0)
                .reduce((s, l) => s + toNumber(l.amount), 0)),
            dueThisWeekCount: dueThisWeekAmorts.length,
            dueThisWeekAmount: round2(dueThisWeekAmorts.reduce((s, a) => s + installmentExposure(a), 0)),
            criticalOverdueCount: par30LoansSet.size,
            criticalOverdueAmount: par30Portfolio,
        };
        // =========================================================================
        // 5. DESEMPENHO E RISCO POR GESTOR DE CRÉDITO
        // =========================================================================
        const managerStatsMap = {};
        allLoans.forEach((l) => {
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
        calculatedInstallments.forEach((a) => {
            const loan = loanMap[toNumber(a.loanId)];
            if (!loan)
                return;
            const managerId = Number(loan.creditManager) || 0;
            if (!managerStatsMap[managerId])
                return;
            managerStatsMap[managerId].portfolioAmount += installmentExposure(a);
        });
        periodTransactions.forEach((t) => {
            const loan = loanMap[toNumber(t.loanId)];
            if (!loan)
                return;
            const managerId = Number(loan.creditManager) || 0;
            if (!managerStatsMap[managerId])
                return;
            managerStatsMap[managerId].collectedInPeriod += toNumber(t.amount);
        });
        overdueRows.forEach((a) => {
            const loan = loanMap[toNumber(a.loanId)];
            if (!loan)
                return;
            const managerId = Number(loan.creditManager) || 0;
            if (!managerStatsMap[managerId])
                return;
            managerStatsMap[managerId].overdueExposure += toNumber(a.amountDue);
            if (a.daysOverdue > 30) {
                managerStatsMap[managerId].par30LoansCount += 1;
            }
        });
        const riskByManager = Object.values(managerStatsMap)
            .map((m) => ({
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
            .sort((a, b) => b.daysOverdue - a.daysOverdue)
            .slice(0, 10)
            .map((a) => {
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
        const thirtyDaysFromNow = (0, moment_1.default)().add(30, "days").toDate();
        const upcomingInstallments = amortizations
            .filter((a) => {
            if (![0, -1].includes(Number(a.status)))
                return false;
            const d = parseDateSafe(a.dueDate);
            if (!d)
                return false;
            return d.toDate() >= now.toDate() && d.toDate() <= thirtyDaysFromNow;
        })
            .sort((a, b) => {
            var _a, _b;
            const dA = ((_a = parseDateSafe(a.dueDate)) === null || _a === void 0 ? void 0 : _a.unix()) || 0;
            const dB = ((_b = parseDateSafe(b.dueDate)) === null || _b === void 0 ? void 0 : _b.unix()) || 0;
            return dA - dB;
        })
            .slice(0, 10)
            .map((a) => {
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
        const chartLabels = [];
        const chartDisbursed = [];
        const chartPayments = [];
        const ptMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        for (let i = 5; i >= 0; i--) {
            const m = (0, moment_1.default)().subtract(i, "months");
            const mLabel = `${ptMonths[m.month()]}/${m.format("YY")}`;
            chartLabels.push(mLabel);
            const mStart = m.clone().startOf("month").format("YYYY-MM-DD");
            const mEnd = m.clone().endOf("month").format("YYYY-MM-DD");
            const monthDisb = allLoans
                .filter((l) => [1, 3].includes(Number(l.status)) && (l.disbursementDate || l.dateCreated) >= mStart && (l.disbursementDate || l.dateCreated) <= mEnd)
                .reduce((sum, l) => sum + toNumber(l.amount), 0);
            chartDisbursed.push(round2(monthDisb));
            // As transações do mês são buscadas sob procura
            const mStartDate = m.clone().startOf("month").toDate();
            const mEndDate = m.clone().endOf("month").toDate();
            const monthTx = yield TranzactionModel_1.TranzactionModel.sum("amount", {
                where: {
                    companyId: companyIdNum,
                    createdAt: { [sequelize_1.Op.between]: [mStartDate, mEndDate] },
                },
            });
            chartPayments.push(round2(monthTx || 0));
        }
        // =========================================================================
        // 9. RESUMO COMPACTO DAS CARTEIRAS DE FINANCIADORES
        // =========================================================================
        let walletsSummary = null;
        try {
            const ws = yield (0, financingWalletService_1.getWalletsWithAnalytics)(companyIdNum, { onlyActive: true });
            const wSum = yield (0, financingWalletService_1.getWalletTotalsSummary)(companyIdNum);
            walletsSummary = {
                summary: wSum,
                items: ws.map((w) => ({
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
        }
        catch (_d) { }
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
                    activeBorrowersCount: new Set(activeLoansList.map((l) => l.accountNumber)).size,
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
                    overdueLoansCount: overdueRows.length > 0 ? new Set(overdueRows.map((r) => r.loanId)).size : 0,
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
                    disbursementAccountsCount: ((_a = realLiquidity.accounts) === null || _a === void 0 ? void 0 : _a.length) || 0,
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
    }
    catch (error) {
        console.error("Erro ao obter visão do dashboard:", error);
        return res.status(500).json({ success: false, message: error.message || "Erro interno no dashboard." });
    }
});
exports.getDashboardOverview = getDashboardOverview;
