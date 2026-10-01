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
exports.walletBelongsToCompany = exports.getPartnerStatement = exports.getPartnerMora = exports.getPartnerTransactions = exports.getPartnerInstallments = exports.getPartnerLoans = exports.getPartnerDashboard = exports.getPartnerCompany = exports.getPartnerWallet = void 0;
const moment_1 = __importDefault(require("moment"));
const sequelize_1 = require("sequelize");
const db_1 = require("../database/db");
const LoanModel_1 = require("../database/models/LoanModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const CompanyModel_1 = require("../database/models/CompanyModel");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
const financingWalletService_1 = require("./financingWalletService");
/**
 * PORTAL DO PARCEIRO FINANCIADOR (userRole 4)
 * ------------------------------------------
 * TODAS as funções deste serviço recebem obrigatoriamente o `walletId` do
 * parceiro autenticado e filtram por ele. Não existe, em nenhuma função,
 * forma de o parceiro ver dados de outra carteira: a carteira vem sempre do
 * utilizador (middleware isPartner), nunca de um parâmetro do pedido.
 */
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const num = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
const getPartnerWallet = (scope) => __awaiter(void 0, void 0, void 0, function* () { return (0, financingWalletService_1.getWalletWithAnalytics)(scope.companyId, scope.walletId); });
exports.getPartnerWallet = getPartnerWallet;
const getPartnerCompany = (companyId) => __awaiter(void 0, void 0, void 0, function* () { return (yield CompanyModel_1.CompanyModel.findByPk(companyId, { raw: true })); });
exports.getPartnerCompany = getPartnerCompany;
/** Nomes dos clientes por accountNumber/customerId (evita N+1). */
const attachCustomers = (companyId, rows) => __awaiter(void 0, void 0, void 0, function* () {
    const accounts = Array.from(new Set(rows.map((row) => (row.accountNumber === null || row.accountNumber === undefined ? null : String(row.accountNumber))).filter(Boolean)));
    if (accounts.length === 0)
        return new Map();
    const customers = (yield CustomerModel_1.CustomerModel.findAll({
        where: { companyId, accountNumber: { [sequelize_1.Op.in]: accounts } },
        attributes: ["id", "accountNumber", "customerName", "customerNuit", "customerPhone", "customerType"],
        raw: true,
    }));
    const map = new Map();
    customers.forEach((customer) => map.set(String(customer.accountNumber), customer));
    return map;
});
const customerFor = (map, row) => {
    if (row.customerId !== null && row.customerId !== undefined) {
        for (const customer of map.values()) {
            if (Number(customer.id) === Number(row.customerId))
                return customer;
        }
    }
    return map.get(String(row.accountNumber)) || null;
};
/** Mora por empréstimo (calculada com a mesma regra do relatório oficial). */
const loadMoraByLoan = (scope) => __awaiter(void 0, void 0, void 0, function* () {
    const loans = (yield LoanModel_1.LoanModel.findAll({
        where: { companyId: scope.companyId, walletId: scope.walletId, status: { [sequelize_1.Op.in]: [1, 3] } },
        attributes: ["id"],
        raw: true,
    }));
    if (loans.length === 0)
        return { byLoan: new Map(), byInstallment: new Map() };
    const forfeitRow = (yield CompanyModel_1.CompanyModel.findByPk(scope.companyId, { attributes: ["forfeit"], raw: true }));
    const forfeit = num(forfeitRow === null || forfeitRow === void 0 ? void 0 : forfeitRow.forfeit);
    const installments = (yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: { loanId: { [sequelize_1.Op.in]: loans.map((loan) => Number(loan.id)) } },
        order: [["dueDate", "ASC"], ["id", "ASC"]],
        raw: true,
    }));
    const byInstallment = new Map();
    const byLoan = new Map();
    const grouped = new Map();
    installments.forEach((item) => {
        const loanId = Number(item.loanId);
        if (!grouped.has(loanId))
            grouped.set(loanId, []);
        grouped.get(loanId).push(item);
    });
    grouped.forEach((list, loanId) => {
        const calculated = (0, calculateLateAmount_1.installmentPanification)(list, forfeit);
        let generated = 0;
        let overdueCount = 0;
        let maxDays = 0;
        const now = (0, moment_1.default)();
        calculated.forEach((item) => {
            const dueDate = (0, moment_1.default)(item.dueDate);
            const mora = num(item.latePaymentInterest);
            if (mora > 0) {
                byInstallment.set(Number(item.id), mora);
            }
            if ([0, -1].includes(Number(item.status)) && dueDate.isBefore(now, "day")) {
                overdueCount += 1;
                generated += mora;
                maxDays = Math.max(maxDays, now.diff(dueDate, "days"));
            }
        });
        byLoan.set(loanId, { mora_gerada: round2(generated), prestacoes_atraso: overdueCount, dias_atraso_max: maxDays });
    });
    return { byLoan, byInstallment };
});
/** Mora efectivamente recebida por prestação. */
const loadMoraReceived = (scope) => __awaiter(void 0, void 0, void 0, function* () {
    const rows = (yield db_1.db.query(`SELECT amortizationLoanId,
            SUM(COALESCE(NULLIF(mora_amount, 0), latePaymentInterest, 0)) AS mora
       FROM tranzactions
      WHERE companyId = ? AND walletId = ?
      GROUP BY amortizationLoanId`, { replacements: [scope.companyId, scope.walletId] }))[0];
    const map = new Map();
    rows.forEach((row) => {
        if (row.amortizationLoanId === null || row.amortizationLoanId === undefined)
            return;
        map.set(Number(row.amortizationLoanId), round2(num(row.mora)));
    });
    return map;
});
/** KPIs do painel do parceiro (só da carteira dele). */
const getPartnerDashboard = (scope, period = {}) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const wallet = yield (0, exports.getPartnerWallet)(scope);
    const { byLoan, byInstallment } = yield loadMoraByLoan(scope);
    const moraGerada = round2(Array.from(byLoan.values()).reduce((total, item) => total + num(item.mora_gerada), 0));
    const prestacoesAtraso = Array.from(byLoan.values()).reduce((total, item) => total + num(item.prestacoes_atraso), 0);
    // Série mensal (12 meses) de desembolsos e recebimentos da carteira.
    const [disbursements] = yield db_1.db.query(`SELECT DATE_FORMAT(disbursementDate, '%Y-%m') AS mes, SUM(amount) AS total, COUNT(*) AS n
       FROM customer_loans
      WHERE companyId = ? AND walletId = ? AND status IN (1, 3)
        AND disbursementDate IS NOT NULL AND disbursementDate <> ''
      GROUP BY mes
      ORDER BY mes ASC`, { replacements: [scope.companyId, scope.walletId] });
    const [receipts] = yield db_1.db.query(`SELECT DATE_FORMAT(paymentDate, '%Y-%m') AS mes, SUM(amount) AS total, COUNT(*) AS n
       FROM tranzactions
      WHERE companyId = ? AND walletId = ?
        AND paymentDate IS NOT NULL AND paymentDate <> ''
      GROUP BY mes
      ORDER BY mes ASC`, { replacements: [scope.companyId, scope.walletId] });
    const months = new Map();
    disbursements.forEach((row) => {
        const key = String(row.mes);
        if (!months.has(key))
            months.set(key, { mes: key, desembolsado: 0, recebido: 0, creditos: 0 });
        const entry = months.get(key);
        entry.desembolsado = round2(num(row.total));
        entry.creditos = num(row.n);
    });
    receipts.forEach((row) => {
        const key = String(row.mes);
        if (!months.has(key))
            months.set(key, { mes: key, desembolsado: 0, recebido: 0, creditos: 0 });
        months.get(key).recebido = round2(num(row.total));
    });
    // Recebimentos no período pedido (opcional).
    let recebidoPeriodo = null;
    let desembolsadoPeriodo = null;
    if (period.from || period.to) {
        const loanWhere = { companyId: scope.companyId, walletId: scope.walletId, status: { [sequelize_1.Op.in]: [1, 3] } };
        const txWhere = { companyId: scope.companyId, walletId: scope.walletId };
        if (period.from && period.to) {
            loanWhere.disbursementDate = { [sequelize_1.Op.between]: [period.from, period.to] };
            txWhere.paymentDate = { [sequelize_1.Op.between]: [period.from, period.to] };
        }
        else if (period.from) {
            loanWhere.disbursementDate = { [sequelize_1.Op.gte]: period.from };
            txWhere.paymentDate = { [sequelize_1.Op.gte]: period.from };
        }
        else if (period.to) {
            loanWhere.disbursementDate = { [sequelize_1.Op.lte]: period.to };
            txWhere.paymentDate = { [sequelize_1.Op.lte]: period.to };
        }
        desembolsadoPeriodo = round2(num((yield LoanModel_1.LoanModel.sum("amount", { where: loanWhere }))));
        recebidoPeriodo = round2(num((yield TranzactionModel_1.TranzactionModel.sum("amount", { where: txWhere }))));
    }
    return {
        carteira: wallet,
        kpis: {
            capital_alocado: (_a = wallet === null || wallet === void 0 ? void 0 : wallet.allocated_amount) !== null && _a !== void 0 ? _a : null,
            desembolsado: (_b = wallet === null || wallet === void 0 ? void 0 : wallet.disbursed) !== null && _b !== void 0 ? _b : 0,
            saldo_analitico: (_c = wallet === null || wallet === void 0 ? void 0 : wallet.saldo_analitico) !== null && _c !== void 0 ? _c : null,
            utilizacao: (_d = wallet === null || wallet === void 0 ? void 0 : wallet.utilizacao) !== null && _d !== void 0 ? _d : 0,
            recebimentos: (_e = wallet === null || wallet === void 0 ? void 0 : wallet.total_recebimentos) !== null && _e !== void 0 ? _e : 0,
            capital_recebido: (_f = wallet === null || wallet === void 0 ? void 0 : wallet.total_capital_recebido) !== null && _f !== void 0 ? _f : 0,
            juros_recebidos: (_g = wallet === null || wallet === void 0 ? void 0 : wallet.total_juros_recebidos) !== null && _g !== void 0 ? _g : 0,
            juros_pendentes: (_h = wallet === null || wallet === void 0 ? void 0 : wallet.previsao_lucro) !== null && _h !== void 0 ? _h : 0,
            mora_gerada: moraGerada,
            mora_recebida: (_j = wallet === null || wallet === void 0 ? void 0 : wallet.total_mora_recebida) !== null && _j !== void 0 ? _j : 0,
            mora_pendente: round2(Math.max(0, moraGerada - num(wallet === null || wallet === void 0 ? void 0 : wallet.total_mora_recebida))),
            num_creditos: (_k = wallet === null || wallet === void 0 ? void 0 : wallet.num_creditos) !== null && _k !== void 0 ? _k : 0,
            num_clientes: (_l = wallet === null || wallet === void 0 ? void 0 : wallet.num_clientes) !== null && _l !== void 0 ? _l : 0,
            prestacoes_total: (_m = wallet === null || wallet === void 0 ? void 0 : wallet.prestacoes_total) !== null && _m !== void 0 ? _m : 0,
            prestacoes_pagas: (_o = wallet === null || wallet === void 0 ? void 0 : wallet.prestacoes_pagas) !== null && _o !== void 0 ? _o : 0,
            prestacoes_pendentes: (_p = wallet === null || wallet === void 0 ? void 0 : wallet.prestacoes_pendentes) !== null && _p !== void 0 ? _p : 0,
            prestacoes_atraso: prestacoesAtraso,
            saldo_a_receber: (_q = wallet === null || wallet === void 0 ? void 0 : wallet.saldo_a_receber) !== null && _q !== void 0 ? _q : 0,
            desembolsado_periodo: desembolsadoPeriodo,
            recebido_periodo: recebidoPeriodo,
        },
        serie_mensal: Array.from(months.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
        mora_por_prestacao: Array.from(byInstallment.entries()).map(([id, mora]) => ({ amortizationLoanId: id, mora })),
    };
});
exports.getPartnerDashboard = getPartnerDashboard;
/** Créditos desembolsados na carteira do parceiro. */
const getPartnerLoans = (scope, filters = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const where = { companyId: scope.companyId, walletId: scope.walletId };
    if (filters.status !== undefined && filters.status !== null && !Number.isNaN(Number(filters.status))) {
        where.status = Number(filters.status);
    }
    else {
        where.status = { [sequelize_1.Op.in]: [1, 3] };
    }
    if (filters.from && filters.to)
        where.disbursementDate = { [sequelize_1.Op.between]: [filters.from, filters.to] };
    else if (filters.from)
        where.disbursementDate = { [sequelize_1.Op.gte]: filters.from };
    else if (filters.to)
        where.disbursementDate = { [sequelize_1.Op.lte]: filters.to };
    const loans = (yield LoanModel_1.LoanModel.findAll({ where, order: [["id", "DESC"]], raw: true }));
    const customerMap = yield attachCustomers(scope.companyId, loans);
    const { byLoan } = yield loadMoraByLoan(scope);
    // Saldo devedor por crédito (prestações abertas).
    const loanIds = loans.map((loan) => Number(loan.id));
    const pendingByLoan = new Map();
    if (loanIds.length > 0) {
        const rows = (yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: { [sequelize_1.Op.in]: loanIds }, status: { [sequelize_1.Op.in]: [0, -1] } },
            attributes: ["loanId", "installment", "paidAmount", "dueDate", "status"],
            raw: true,
        }));
        const today = (0, moment_1.default)();
        rows.forEach((row) => {
            const loanId = Number(row.loanId);
            if (!pendingByLoan.has(loanId))
                pendingByLoan.set(loanId, { saldo: 0, pendentes: 0, atraso: 0 });
            const entry = pendingByLoan.get(loanId);
            entry.saldo = round2(entry.saldo + Math.max(0, num(row.installment) - num(row.paidAmount)));
            entry.pendentes += 1;
            if ((0, moment_1.default)(row.dueDate).isBefore(today, "day"))
                entry.atraso += 1;
        });
    }
    const search = (filters.search || "").trim().toLowerCase();
    return loans
        .map((loan) => {
        var _a, _b, _c, _d;
        const customer = customerFor(customerMap, loan);
        return {
            id: Number(loan.id),
            accountNumber: loan.accountNumber,
            customerId: loan.customerId,
            customerName: (customer === null || customer === void 0 ? void 0 : customer.customerName) || "—",
            customerPhone: (customer === null || customer === void 0 ? void 0 : customer.customerPhone) || null,
            amount: round2(num(loan.amount)),
            interestRate: num(loan.interestRate),
            numberOfInstallments: num(loan.numberOfInstallments),
            disbursementDate: loan.disbursementDate || null,
            status: num(loan.status),
            loanDescription: loan.loanDescription || null,
            saldo_devedor: ((_a = pendingByLoan.get(Number(loan.id))) === null || _a === void 0 ? void 0 : _a.saldo) || 0,
            prestacoes_pendentes: ((_b = pendingByLoan.get(Number(loan.id))) === null || _b === void 0 ? void 0 : _b.pendentes) || 0,
            prestacoes_atraso: ((_c = pendingByLoan.get(Number(loan.id))) === null || _c === void 0 ? void 0 : _c.atraso) || 0,
            mora_gerada: ((_d = byLoan.get(Number(loan.id))) === null || _d === void 0 ? void 0 : _d.mora_gerada) || 0,
        };
    })
        .filter((loan) => {
        if (!search)
            return true;
        return (String(loan.customerName).toLowerCase().includes(search) ||
            String(loan.accountNumber || "").toLowerCase().includes(search) ||
            String(loan.id).includes(search));
    });
});
exports.getPartnerLoans = getPartnerLoans;
/** Prestações (pagas / pendentes / em atraso) da carteira do parceiro. */
const getPartnerInstallments = (scope, filters = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const loanWhere = { companyId: scope.companyId, walletId: scope.walletId };
    if (filters.loanId)
        loanWhere.id = Number(filters.loanId);
    const loans = (yield LoanModel_1.LoanModel.findAll({ where: loanWhere, raw: true }));
    if (loans.length === 0)
        return [];
    const loanById = new Map();
    loans.forEach((loan) => loanById.set(Number(loan.id), loan));
    const customerMap = yield attachCustomers(scope.companyId, loans);
    const installWhere = { loanId: { [sequelize_1.Op.in]: Array.from(loanById.keys()) } };
    const view = filters.scope || "todas";
    const today = (0, moment_1.default)().format("YYYY-MM-DD");
    if (view === "pagas")
        installWhere.status = 1;
    else if (view === "pendentes") {
        installWhere.status = { [sequelize_1.Op.in]: [0, -1] };
        installWhere.dueDate = { [sequelize_1.Op.gte]: today };
    }
    else if (view === "atraso") {
        installWhere.status = { [sequelize_1.Op.in]: [0, -1] };
        installWhere.dueDate = { [sequelize_1.Op.lt]: today };
    }
    if (filters.from && filters.to)
        installWhere.dueDate = Object.assign(Object.assign({}, (installWhere.dueDate || {})), { [sequelize_1.Op.between]: [filters.from, filters.to] });
    const installments = (yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: installWhere,
        order: [["dueDate", "ASC"], ["id", "ASC"]],
        raw: true,
    }));
    const { byInstallment } = yield loadMoraByLoan(scope);
    const moraReceived = yield loadMoraReceived(scope);
    const now = (0, moment_1.default)();
    const payments = new Map();
    if (installments.length > 0) {
        const rows = (yield TranzactionModel_1.TranzactionModel.findAll({
            where: { companyId: scope.companyId, walletId: scope.walletId, amortizationLoanId: { [sequelize_1.Op.in]: installments.map((i) => Number(i.id)) } },
            order: [["id", "ASC"]],
            raw: true,
        }));
        rows.forEach((row) => payments.set(Number(row.amortizationLoanId), row));
    }
    return installments.map((item) => {
        const loan = loanById.get(Number(item.loanId)) || {};
        const customer = customerFor(customerMap, loan);
        const payment = payments.get(Number(item.id));
        const due = (0, moment_1.default)(item.dueDate);
        const daysOverdue = due.isBefore(now, "day") && [0, -1].includes(num(item.status)) ? now.diff(due, "days") : 0;
        const moraGerada = byInstallment.get(Number(item.id)) || 0;
        return {
            id: Number(item.id),
            loanId: Number(item.loanId),
            installmentOrder: item.installmentOrder,
            accountNumber: item.accountNumber,
            customerName: (customer === null || customer === void 0 ? void 0 : customer.customerName) || "—",
            dueDate: item.dueDate,
            status: num(item.status),
            installment: round2(num(item.installment)),
            capital: round2(num(item.amortization)),
            juros: round2(num(item.rateAmount)),
            paidAmount: round2(num(item.paidAmount)),
            remaining: round2(Math.max(0, num(item.installment) - num(item.paidAmount))),
            paymentDate: (payment === null || payment === void 0 ? void 0 : payment.paymentDate) || null,
            paymentAmount: payment ? round2(num(payment.amount)) : 0,
            mora_gerada: moraGerada,
            mora_recebida: moraReceived.get(Number(item.id)) || 0,
            mora_pendente: round2(Math.max(0, moraGerada - (moraReceived.get(Number(item.id)) || 0))),
            dias_atraso: daysOverdue,
            recebido: Number(item.status) === 1,
        };
    });
});
exports.getPartnerInstallments = getPartnerInstallments;
/** Recebimentos (pagamentos) da carteira, com o recibo associado. */
const getPartnerTransactions = (scope, filters = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const where = { companyId: scope.companyId, walletId: scope.walletId };
    if (filters.loanId)
        where.loanId = Number(filters.loanId);
    if (filters.from && filters.to)
        where.paymentDate = { [sequelize_1.Op.between]: [filters.from, filters.to] };
    else if (filters.from)
        where.paymentDate = { [sequelize_1.Op.gte]: filters.from };
    else if (filters.to)
        where.paymentDate = { [sequelize_1.Op.lte]: filters.to };
    const transactions = (yield TranzactionModel_1.TranzactionModel.findAll({
        where,
        order: [["id", "DESC"]],
        limit: filters.limit && filters.limit > 0 ? Number(filters.limit) : undefined,
        raw: true,
    }));
    if (transactions.length === 0)
        return [];
    const loans = (yield LoanModel_1.LoanModel.findAll({
        where: { id: { [sequelize_1.Op.in]: Array.from(new Set(transactions.map((t) => Number(t.loanId)).filter(Boolean))) } },
        raw: true,
    }));
    const customerMap = yield attachCustomers(scope.companyId, loans);
    const receipts = (yield db_1.db.query("SELECT id, tranzactionId, numero, pdf_url FROM recibos WHERE companyId = ? AND tranzactionId IS NOT NULL", { replacements: [scope.companyId] }))[0];
    const receiptByTx = new Map();
    receipts.forEach((row) => receiptByTx.set(Number(row.tranzactionId), row));
    return transactions.map((tx) => {
        const loan = loans.find((item) => Number(item.id) === Number(tx.loanId)) || {};
        const customer = customerFor(customerMap, loan);
        const receipt = receiptByTx.get(Number(tx.id));
        return {
            id: Number(tx.id),
            loanId: tx.loanId ? Number(tx.loanId) : null,
            accountNumber: tx.accountNumber,
            customerName: (customer === null || customer === void 0 ? void 0 : customer.customerName) || "—",
            paymentDate: tx.paymentDate,
            amount: round2(num(tx.amount)),
            juros: round2(num(tx.interestRateAmount)),
            capital: round2(Math.max(0, num(tx.amount) - num(tx.interestRateAmount))),
            mora: round2(num(tx.mora_amount) || num(tx.latePaymentInterest)),
            desconto: round2(num(tx.discountAmount)),
            paymentMethod: tx.paymentMethod,
            reference: tx.tranzactionReference,
            description: tx.description,
            staffName: tx.staffName,
            recibo_numero: (receipt === null || receipt === void 0 ? void 0 : receipt.numero) || null,
            recibo_pdf: (receipt === null || receipt === void 0 ? void 0 : receipt.pdf_url) || null,
            recibo_id: (receipt === null || receipt === void 0 ? void 0 : receipt.id) || null,
        };
    });
});
exports.getPartnerTransactions = getPartnerTransactions;
/** Mora da carteira: por prestação em atraso + evolução mensal. */
const getPartnerMora = (scope) => __awaiter(void 0, void 0, void 0, function* () {
    const overdue = yield (0, exports.getPartnerInstallments)(scope, { scope: "atraso" });
    const { byInstallment } = yield loadMoraByLoan(scope);
    const moraReceived = yield loadMoraReceived(scope);
    const rows = overdue.map((item) => (Object.assign(Object.assign({}, item), { mora_gerada: byInstallment.get(Number(item.id)) || item.mora_gerada })));
    const monthly = new Map();
    rows.forEach((item) => {
        const key = (0, moment_1.default)(item.dueDate).format("YYYY-MM");
        if (!monthly.has(key))
            monthly.set(key, { mes: key, mora_gerada: 0, mora_recebida: 0 });
        const entry = monthly.get(key);
        entry.mora_gerada = round2(entry.mora_gerada + num(item.mora_gerada));
        entry.mora_recebida = round2(entry.mora_recebida + num(moraReceived.get(Number(item.id))));
    });
    return {
        prestacoes: rows,
        total_mora_gerada: round2(rows.reduce((total, item) => total + num(item.mora_gerada), 0)),
        total_mora_recebida: round2(rows.reduce((total, item) => total + num(moraReceived.get(Number(item.id))), 0)),
        total_mora_pendente: round2(rows.reduce((total, item) => total + Math.max(0, num(item.mora_gerada) - num(moraReceived.get(Number(item.id)))), 0)),
        serie_mensal: Array.from(monthly.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
    };
});
exports.getPartnerMora = getPartnerMora;
/** Extrato completo da carteira (resumo + desembolsos + recebimentos). */
const getPartnerStatement = (scope, period = {}) => __awaiter(void 0, void 0, void 0, function* () {
    var _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
    const wallet = yield (0, exports.getPartnerWallet)(scope);
    const loans = yield (0, exports.getPartnerLoans)(scope, { from: period.from, to: period.to });
    const transactions = yield (0, exports.getPartnerTransactions)(scope, { from: period.from, to: period.to });
    const desembolsadoPeriodo = round2(loans.reduce((total, loan) => total + num(loan.amount), 0));
    const recebidoPeriodo = round2(transactions.reduce((total, tx) => total + num(tx.amount), 0));
    const jurosPeriodo = round2(transactions.reduce((total, tx) => total + num(tx.juros), 0));
    const moraPeriodo = round2(transactions.reduce((total, tx) => total + num(tx.mora), 0));
    const descontoPeriodo = round2(transactions.reduce((total, tx) => total + num(tx.desconto), 0));
    // ── Série mensal do período (gráfico do relatório) ──
    const monthKey = (value) => (value ? String(value).slice(0, 7) : "");
    const meses = [];
    const desembolsosPorMes = {};
    const recebimentosPorMes = {};
    const jurosPorMes = {};
    const ensureMonth = (key) => {
        if (!key)
            return;
        if (!meses.includes(key))
            meses.push(key);
        desembolsosPorMes[key] = desembolsosPorMes[key] || 0;
        recebimentosPorMes[key] = recebimentosPorMes[key] || 0;
        jurosPorMes[key] = jurosPorMes[key] || 0;
    };
    loans.forEach((loan) => {
        const key = monthKey(loan.disbursementDate);
        ensureMonth(key);
        if (key)
            desembolsosPorMes[key] = round2(desembolsosPorMes[key] + num(loan.amount));
    });
    transactions.forEach((tx) => {
        const key = monthKey(tx.paymentDate);
        ensureMonth(key);
        if (key) {
            recebimentosPorMes[key] = round2(recebimentosPorMes[key] + num(tx.amount));
            jurosPorMes[key] = round2(jurosPorMes[key] + num(tx.juros));
        }
    });
    const mesesOrdenados = [...meses].sort();
    return {
        carteira: wallet,
        periodo: { from: period.from || null, to: period.to || null },
        resumo: {
            capital_alocado: (_r = wallet === null || wallet === void 0 ? void 0 : wallet.allocated_amount) !== null && _r !== void 0 ? _r : null,
            desembolsado_total: (_s = wallet === null || wallet === void 0 ? void 0 : wallet.disbursed) !== null && _s !== void 0 ? _s : 0,
            desembolsado_periodo: desembolsadoPeriodo,
            recebido_total: (_t = wallet === null || wallet === void 0 ? void 0 : wallet.total_recebimentos) !== null && _t !== void 0 ? _t : 0,
            recebido_periodo: recebidoPeriodo,
            capital_recebido_periodo: round2(recebidoPeriodo - jurosPeriodo),
            juros_periodo: jurosPeriodo,
            mora_periodo: moraPeriodo,
            desconto_periodo: descontoPeriodo,
            saldo_a_receber: (_u = wallet === null || wallet === void 0 ? void 0 : wallet.saldo_a_receber) !== null && _u !== void 0 ? _u : 0,
            saldo_analitico: (_v = wallet === null || wallet === void 0 ? void 0 : wallet.saldo_analitico) !== null && _v !== void 0 ? _v : null,
            num_creditos: loans.length,
            num_recebimentos: transactions.length,
            // Indicadores de acompanhamento da carteira (KPIs do relatório)
            taxa_media: (_w = wallet === null || wallet === void 0 ? void 0 : wallet.taxa_media) !== null && _w !== void 0 ? _w : null,
            juros_gerados: (_x = wallet === null || wallet === void 0 ? void 0 : wallet.juros_gerados) !== null && _x !== void 0 ? _x : 0,
            previsao_lucro: (_y = wallet === null || wallet === void 0 ? void 0 : wallet.previsao_lucro) !== null && _y !== void 0 ? _y : 0,
            prestacoes_total: (_z = wallet === null || wallet === void 0 ? void 0 : wallet.prestacoes_total) !== null && _z !== void 0 ? _z : 0,
            prestacoes_pagas: (_0 = wallet === null || wallet === void 0 ? void 0 : wallet.prestacoes_pagas) !== null && _0 !== void 0 ? _0 : 0,
            prestacoes_pendentes: (_1 = wallet === null || wallet === void 0 ? void 0 : wallet.prestacoes_pendentes) !== null && _1 !== void 0 ? _1 : 0,
            prestacoes_atraso: (_2 = wallet === null || wallet === void 0 ? void 0 : wallet.prestacoes_atraso) !== null && _2 !== void 0 ? _2 : 0,
            mora_gerada: (_3 = wallet === null || wallet === void 0 ? void 0 : wallet.mora_gerada) !== null && _3 !== void 0 ? _3 : 0,
            utilizacao: (_4 = wallet === null || wallet === void 0 ? void 0 : wallet.utilizacao) !== null && _4 !== void 0 ? _4 : 0,
            num_desembolsos_periodo: loans.length,
        },
        // Gráficos: barra por mês + distribuição dos recebimentos.
        serie_mensal: {
            meses: mesesOrdenados,
            desembolsos: mesesOrdenados.map((key) => desembolsosPorMes[key] || 0),
            recebimentos: mesesOrdenados.map((key) => recebimentosPorMes[key] || 0),
            juros: mesesOrdenados.map((key) => jurosPorMes[key] || 0),
        },
        distribuicao_recebimentos: {
            capital: round2(recebidoPeriodo - jurosPeriodo - moraPeriodo),
            juros: jurosPeriodo,
            mora: moraPeriodo,
            desconto: descontoPeriodo,
        },
        desembolsos: loans,
        recebimentos: transactions,
    };
});
exports.getPartnerStatement = getPartnerStatement;
/** Verifica que a carteira pertence à empresa do parceiro (defesa extra). */
const walletBelongsToCompany = (companyId, walletId) => __awaiter(void 0, void 0, void 0, function* () {
    const rows = (yield db_1.db.query("SELECT id FROM financing_wallets WHERE id = ? AND companyId = ? LIMIT 1", { replacements: [walletId, companyId] }))[0];
    return rows.length > 0;
});
exports.walletBelongsToCompany = walletBelongsToCompany;
