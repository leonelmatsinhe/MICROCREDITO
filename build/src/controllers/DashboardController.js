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
const calculateTotalWithInterest = (loan) => {
    const principal = toNumber(loan === null || loan === void 0 ? void 0 : loan.amount);
    const rate = toNumber(loan === null || loan === void 0 ? void 0 : loan.interestRate);
    const installments = Math.max(1, parseInt(String((loan === null || loan === void 0 ? void 0 : loan.numberOfInstallments) || 1), 10));
    if (principal <= 0)
        return 0;
    if (rate <= 0)
        return principal;
    // Fórmula Price: PMT = P * i / (1 - (1 + i)^-n)
    const denominator = 1 - Math.pow(1 + rate, -installments);
    if (denominator <= 0)
        return principal;
    const pmt = (principal * rate) / denominator;
    return pmt * installments;
};
const isValidDateInput = (value) => {
    if (value === undefined || value === null || value === "")
        return true;
    return (0, moment_1.default)(String(value), "YYYY-MM-DD", true).isValid();
};
const getDashboardOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const { from, to, creditManager, status } = req.query;
        const companyIdNum = parseInt(String(companyId), 10);
        if (Number.isNaN(companyIdNum) || companyIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: "companyId inválido.",
            });
        }
        if (!isValidDateInput(from) || !isValidDateInput(to)) {
            return res.status(400).json({
                success: false,
                message: "Parâmetros de data inválidos. Use o formato YYYY-MM-DD.",
            });
        }
        if (from && to && (0, moment_1.default)(String(from)).isAfter((0, moment_1.default)(String(to)))) {
            return res.status(400).json({
                success: false,
                message: "Intervalo de datas inválido: 'from' não pode ser maior que 'to'.",
            });
        }
        if (creditManager !== undefined && creditManager !== "all") {
            const managerNum = parseInt(String(creditManager), 10);
            if (Number.isNaN(managerNum) || managerNum <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "creditManager inválido.",
                });
            }
        }
        if (status !== undefined && status !== "" && status !== "all") {
            const statusNum = parseInt(String(status), 10);
            if (Number.isNaN(statusNum)) {
                return res.status(400).json({
                    success: false,
                    message: "status inválido.",
                });
            }
        }
        const loanWhere = { companyId: companyIdNum };
        if (creditManager && creditManager !== "all") {
            loanWhere.creditManager = parseInt(String(creditManager), 10);
        }
        if (status !== undefined && status !== "" && status !== "all") {
            loanWhere.status = parseInt(String(status), 10);
        }
        // dateCreated é string (YYYY-MM-DD). Filtrar no SQL para reduzir custo.
        if (from && to) {
            loanWhere.dateCreated = {
                [sequelize_1.Op.between]: [String(from), String(to)],
            };
        }
        else if (from) {
            loanWhere.dateCreated = {
                [sequelize_1.Op.gte]: String(from),
            };
        }
        else if (to) {
            loanWhere.dateCreated = {
                [sequelize_1.Op.lte]: String(to),
            };
        }
        const loans = yield LoanModel_1.LoanModel.findAll({
            where: loanWhere,
            attributes: [
                "id",
                "companyId",
                "accountNumber",
                "creditManager",
                "amount",
                "interestRate",
                "numberOfInstallments",
                "dateCreated",
                "status",
            ],
            order: [["id", "DESC"]],
        });
        const fromMoment = from ? (0, moment_1.default)(String(from)).startOf("day") : null;
        const toMoment = to ? (0, moment_1.default)(String(to)).endOf("day") : null;
        const loanIds = loans.map((l) => l.id);
        const loanIdSet = new Set(loanIds);
        let transactions = [];
        if (loanIds.length > 0) {
            const txWhere = {
                companyId: companyIdNum,
                loanId: { [sequelize_1.Op.in]: loanIds },
            };
            if (fromMoment && toMoment) {
                txWhere.createdAt = {
                    [sequelize_1.Op.between]: [fromMoment.toDate(), toMoment.toDate()],
                };
            }
            else if (fromMoment) {
                txWhere.createdAt = { [sequelize_1.Op.gte]: fromMoment.toDate() };
            }
            else if (toMoment) {
                txWhere.createdAt = { [sequelize_1.Op.lte]: toMoment.toDate() };
            }
            transactions = yield TranzactionModel_1.TranzactionModel.findAll({
                where: txWhere,
                attributes: [
                    "loanId",
                    "amount",
                    "latePaymentInterest",
                    "interestRateAmount",
                    "discountAmount",
                    "createdAt",
                ],
            });
        }
        let amortizations = [];
        if (loanIds.length > 0) {
            amortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
                where: {
                    companyId: companyIdNum,
                    loanId: { [sequelize_1.Op.in]: loanIds },
                },
                attributes: ["id", "loanId", "accountNumber", "dueDate", "status", "installment"],
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
        const managers = yield UserModel_1.UserModel.findAll({
            where: { companyId: companyIdNum },
            attributes: ["id", "name", "userRole"],
        });
        const managerNameMap = {};
        managers.forEach((m) => {
            managerNameMap[m.id] = m.name;
        });
        const loanMap = {};
        loans.forEach((l) => {
            loanMap[l.id] = l;
        });
        // Fetch customer names for upcoming installments
        const accountNumbers = [...new Set(loans.map((l) => l.accountNumber).filter(Boolean))];
        const customerNameMap = {};
        if (accountNumbers.length > 0) {
            const customers = yield CustomerModel_1.CustomerModel.findAll({
                where: {
                    companyId: companyIdNum,
                    accountNumber: { [sequelize_1.Op.in]: accountNumbers },
                },
                attributes: ['accountNumber', 'customerName'],
            });
            customers.forEach((c) => {
                customerNameMap[c.accountNumber] = c.customerName;
            });
        }
        const now = (0, moment_1.default)();
        const openInstallments = amortizations.filter((a) => [0, -1].includes(Number(a.status)));
        const installmentExposure = (a) => {
            var _a;
            if (Number(a.status) === -1) {
                return toNumber((_a = debtMap[a.id]) !== null && _a !== void 0 ? _a : a.installment);
            }
            return toNumber(a.installment);
        };
        const overdueRows = openInstallments
            .map((a) => {
            const due = parseDateSafe(a.dueDate);
            const daysOverdue = due ? now.diff(due, "days") : 0;
            return Object.assign(Object.assign({}, a), { daysOverdue: daysOverdue > 0 ? daysOverdue : 0, amountDue: installmentExposure(a) });
        })
            .filter((a) => a.daysOverdue > 0);
        const outstandingPortfolio = openInstallments.reduce((sum, a) => sum + installmentExposure(a), 0);
        const overdueAmount = overdueRows.reduce((sum, a) => sum + toNumber(a.amountDue), 0);
        const par30Amount = overdueRows
            .filter((a) => a.daysOverdue > 30)
            .reduce((sum, a) => sum + toNumber(a.amountDue), 0);
        const par60Amount = overdueRows
            .filter((a) => a.daysOverdue > 60)
            .reduce((sum, a) => sum + toNumber(a.amountDue), 0);
        const par90Amount = overdueRows
            .filter((a) => a.daysOverdue > 90)
            .reduce((sum, a) => sum + toNumber(a.amountDue), 0);
        const activeLoansList = loans.filter((l) => Number(l.status) === 1);
        const pendingLoansList = loans.filter((l) => Number(l.status) === 0);
        const liquidatedLoansList = loans.filter((l) => Number(l.status) === 3);
        const rejectedLoansList = loans.filter((l) => [2, -1].includes(Number(l.status)));
        // "Desembolsado" corresponde ao montante total de créditos efectivamente desembolsados (activos + liquidados).
        const disbursedLoansList = loans.filter((l) => [1, 3].includes(Number(l.status)));
        const totalDisbursed = disbursedLoansList.reduce((sum, l) => sum + toNumber(l.amount), 0);
        const pendingAmount = pendingLoansList.reduce((sum, l) => sum + toNumber(l.amount), 0);
        const liquidatedAmount = liquidatedLoansList.reduce((sum, l) => sum + toNumber(l.amount), 0);
        const rejectedAmount = rejectedLoansList.reduce((sum, l) => sum + toNumber(l.amount), 0);
        // Capital recuperado: soma do capital das prestações pagas (valor pago - juros normais - juros de mora)
        const totalCollected = transactions.reduce((sum, t) => sum + toNumber(t.amount), 0);
        const capitalRecovered = transactions.reduce((sum, t) => sum + (toNumber(t.amount) - toNumber(t.interestRateAmount) - toNumber(t.latePaymentInterest)), 0);
        const totalLateInterest = transactions.reduce((sum, t) => sum + toNumber(t.latePaymentInterest), 0);
        const totalInterestCollected = transactions.reduce((sum, t) => sum + toNumber(t.interestRateAmount), 0);
        // Total de descontos aplicados (pagamento antecipado)
        const totalDiscount = transactions.reduce((sum, t) => sum + toNumber(t.discountAmount), 0);
        // Juros recebidos: juros normais + juros de mora - descontos
        const totalInterestReceived = totalInterestCollected + totalLateInterest - totalDiscount;
        const totalRecoveryCollected = totalCollected + totalLateInterest;
        // Base da recuperação: créditos efetivamente desembolsados (ativos + liquidados).
        const disbursedRecoveryLoans = loans.filter((l) => [1, 3].includes(Number(l.status)));
        const recoveryBaseAmount = disbursedRecoveryLoans.reduce((sum, l) => sum + calculateTotalWithInterest(l), 0);
        const recoveryRatePct = recoveryBaseAmount > 0
            ? Number(((totalRecoveryCollected / recoveryBaseAmount) * 100).toFixed(2))
            : 0;
        const totalLoans = loans.length;
        const statusCount = {
            pending: pendingLoansList.length,
            active: activeLoansList.length,
            rejected: rejectedLoansList.length,
            liquidated: liquidatedLoansList.length,
        };
        const riskByManagerMap = {};
        loans.forEach((l) => {
            const managerId = Number(l.creditManager) || 0;
            if (!riskByManagerMap[managerId]) {
                riskByManagerMap[managerId] = {
                    managerId,
                    managerName: managerNameMap[managerId] || `Gestor #${managerId}`,
                    loansCount: 0,
                    principal: 0,
                    collected: 0,
                    overdueExposure: 0,
                    overdueLoansSet: new Set(),
                };
            }
            riskByManagerMap[managerId].loansCount += 1;
            riskByManagerMap[managerId].principal += toNumber(l.amount);
        });
        transactions.forEach((t) => {
            const loan = loanMap[toNumber(t.loanId)];
            if (!loan)
                return;
            const managerId = Number(loan.creditManager) || 0;
            if (!riskByManagerMap[managerId])
                return;
            riskByManagerMap[managerId].collected += toNumber(t.amount);
        });
        overdueRows.forEach((a) => {
            const loan = loanMap[toNumber(a.loanId)];
            if (!loan)
                return;
            const managerId = Number(loan.creditManager) || 0;
            if (!riskByManagerMap[managerId])
                return;
            riskByManagerMap[managerId].overdueExposure += toNumber(a.amountDue);
            riskByManagerMap[managerId].overdueLoansSet.add(Number(a.loanId));
        });
        const riskByManager = Object.values(riskByManagerMap)
            .map((m) => ({
            managerId: m.managerId,
            managerName: m.managerName,
            loansCount: m.loansCount,
            overdueLoans: m.overdueLoansSet.size,
            principal: Number(m.principal.toFixed(2)),
            collected: Number(m.collected.toFixed(2)),
            overdueExposure: Number(m.overdueExposure.toFixed(2)),
            overdueRate: m.principal > 0
                ? Number(((m.overdueExposure / m.principal) * 100).toFixed(2))
                : 0,
        }))
            .sort((a, b) => b.overdueExposure - a.overdueExposure);
        const alerts = overdueRows
            .sort((a, b) => b.daysOverdue - a.daysOverdue)
            .slice(0, 10)
            .map((a) => {
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
                loans: Object.assign({ total: totalLoans }, statusCount),
                financial: {
                    totalDisbursed: Number(totalDisbursed.toFixed(2)),
                    pendingAmount: Number(pendingAmount.toFixed(2)),
                    liquidatedAmount: Number(liquidatedAmount.toFixed(2)),
                    rejectedAmount: Number(rejectedAmount.toFixed(2)),
                    totalCollected: Number(totalCollected.toFixed(2)),
                    // Capital recuperado: soma do capital das prestações pagas (valor pago - juros)
                    capitalRecovered: Number(capitalRecovered.toFixed(2)),
                    // Total com Juros: crédito desembolsado com seus juros (base de recuperação)
                    totalWithInterest: Number(recoveryBaseAmount.toFixed(2)),
                    totalInterestCollected: Number(totalInterestCollected.toFixed(2)),
                    // Total de descontos aplicados (pagamento antecipado)
                    totalDiscount: Number(totalDiscount.toFixed(2)),
                    // Total de juros recebidos: juros normais + juros de mora - descontos aplicados
                    totalInterestReceived: Number(totalInterestReceived.toFixed(2)),
                    // Total Reembolsado: total do dinheiro reembolsado no período
                    totalReimbursed: Number(totalCollected.toFixed(2)),
                    totalLateInterest: Number(totalLateInterest.toFixed(2)),
                    recoveryBaseAmount: Number(recoveryBaseAmount.toFixed(2)),
                    recoveryCollectedAmount: Number(totalRecoveryCollected.toFixed(2)),
                    recoveryRatePct,
                    avgTicket: disbursedLoansList.length > 0
                        ? Number((totalDisbursed / disbursedLoansList.length).toFixed(2))
                        : 0,
                    roiPct: totalDisbursed > 0
                        ? Number((((totalInterestCollected + totalLateInterest) / totalDisbursed) * 100).toFixed(2))
                        : 0,
                },
                delinquency: {
                    outstandingPortfolio: Number(outstandingPortfolio.toFixed(2)),
                    overdueAmount: Number(overdueAmount.toFixed(2)),
                    overdueRate: outstandingPortfolio > 0
                        ? Number(((overdueAmount / outstandingPortfolio) * 100).toFixed(2))
                        : 0,
                    par30Amount: Number(par30Amount.toFixed(2)),
                    par60Amount: Number(par60Amount.toFixed(2)),
                    par90Amount: Number(par90Amount.toFixed(2)),
                    par30Rate: outstandingPortfolio > 0
                        ? Number(((par30Amount / outstandingPortfolio) * 100).toFixed(2))
                        : 0,
                    par60Rate: outstandingPortfolio > 0
                        ? Number(((par60Amount / outstandingPortfolio) * 100).toFixed(2))
                        : 0,
                    par90Rate: outstandingPortfolio > 0
                        ? Number(((par90Amount / outstandingPortfolio) * 100).toFixed(2))
                        : 0,
                    overdueInstallmentsCount: overdueRows.length,
                },
            },
            riskByManager,
            alerts,
            // Chart data: monthly breakdown of disbursements and payments
            chartData: generateChartData(loans.filter((l) => [1, 3].includes(Number(l.status))), transactions),
            // Upcoming installments (next 30 days)
            upcomingInstallments: generateUpcomingInstallments(amortizations, loanMap, managerNameMap, customerNameMap),
        });
    }
    catch (error) {
        console.error("Erro ao obter visão agregada do dashboard:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao obter dashboard.",
        });
    }
});
exports.getDashboardOverview = getDashboardOverview;
function generateChartData(loans, transactions) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    // Find the earliest month with data in the current year
    let earliestMonth = currentMonth; // default: current month
    loans.forEach((loan) => {
        const date = new Date(loan.dateCreated);
        if (date.getFullYear() === currentYear) {
            const m = date.getMonth();
            if (m < earliestMonth)
                earliestMonth = m;
        }
    });
    transactions.forEach((tx) => {
        const date = new Date(tx.createdAt);
        if (date.getFullYear() === currentYear) {
            const m = date.getMonth();
            if (m < earliestMonth)
                earliestMonth = m;
        }
    });
    // Build arrays only from earliest month to current month
    const monthCount = currentMonth - earliestMonth + 1;
    const disbursed = new Array(monthCount).fill(0);
    const payments = new Array(monthCount).fill(0);
    const labels = months.slice(earliestMonth, currentMonth + 1);
    // Aggregate disbursements by month
    loans.forEach((loan) => {
        const date = new Date(loan.dateCreated);
        if (date.getFullYear() === currentYear) {
            const month = date.getMonth();
            if (month >= earliestMonth && month <= currentMonth) {
                disbursed[month - earliestMonth] += toNumber(loan.amount);
            }
        }
    });
    // Aggregate payments by month
    transactions.forEach((tx) => {
        const date = new Date(tx.createdAt);
        if (date.getFullYear() === currentYear) {
            const month = date.getMonth();
            if (month >= earliestMonth && month <= currentMonth) {
                payments[month - earliestMonth] += toNumber(tx.amount);
            }
        }
    });
    return {
        labels,
        disbursed: disbursed.map(v => Math.round(v * 100) / 100),
        payments: payments.map(v => Math.round(v * 100) / 100)
    };
}
function generateUpcomingInstallments(amortizations, loanMap, managerNameMap, customerNameMap) {
    const now = (0, moment_1.default)();
    const thirtyDaysFromNow = (0, moment_1.default)().add(30, 'days');
    return amortizations
        .filter((a) => {
        const status = Number(a.status);
        // Only pending (0) or partial (-1)
        if (status !== 0 && status !== -1)
            return false;
        const due = parseDateSafe(a.dueDate);
        if (!due)
            return false;
        // Due date is between now and 30 days from now
        return due.isAfter(now) && due.isBefore(thirtyDaysFromNow);
    })
        .sort((a, b) => {
        const dateA = parseDateSafe(a.dueDate);
        const dateB = parseDateSafe(b.dueDate);
        return ((dateA === null || dateA === void 0 ? void 0 : dateA.unix()) || 0) - ((dateB === null || dateB === void 0 ? void 0 : dateB.unix()) || 0);
    })
        .slice(0, 10)
        .map((a) => {
        const loan = loanMap[toNumber(a.loanId)];
        const managerId = loan ? Number(loan.creditManager) : 0;
        const due = parseDateSafe(a.dueDate);
        const daysUntilDue = due ? Math.ceil(due.diff(now, 'milliseconds') / (1000 * 60 * 60 * 24)) : 0;
        return {
            id: a.id,
            loanId: a.loanId,
            accountNumber: a.accountNumber,
            customerName: customerNameMap[a.accountNumber] || `Conta ${a.accountNumber}`,
            amount: toNumber(a.installment),
            dueDate: a.dueDate,
            daysUntilDue,
            status: Number(a.status),
            managerName: managerNameMap[managerId] || `Gestor #${managerId}`
        };
    });
}
