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
exports.destroyInstallment = exports.getInstallmentsControl = exports.createAmortizationLoan = exports.getPastAmortizations = exports.getUpcomingAmortizations = void 0;
const moment_1 = __importDefault(require("moment"));
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const sequelize_1 = require("sequelize");
const loanAmortization_1 = require("../utils/loanAmortization");
const LoanModel_1 = require("../database/models/LoanModel");
const DebtModel_1 = require("../database/models/DebtModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const CompanyModel_1 = require("../database/models/CompanyModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
const SmsGatewayService_1 = require("../services/SmsGatewayService");
const getUpcomingAmortizations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // dueDate é string (YYYY-MM-DD); comparar por string evita cast em memória.
        const now = (0, moment_1.default)().format("YYYY-MM-DD");
        const loans = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: {
                dueDate: {
                    [sequelize_1.Op.gte]: now,
                },
                companyId: id,
                status: { [sequelize_1.Op.in]: [0, -1] },
            },
            order: [["dueDate", "ASC"]],
        });
        const partialIds = loans
            .filter((l) => l.status === -1)
            .map((l) => l.id);
        let debtsMap = {};
        if (partialIds.length > 0) {
            const debts = yield DebtModel_1.DebtModel.findAll({
                where: { amortisationId: { [sequelize_1.Op.in]: partialIds } },
            });
            debts.forEach((d) => {
                debtsMap[d.amortisationId] = {
                    debtAmount: d.debtAmount,
                    debtDate: d.updatedAt || d.dateInserted,
                };
            });
        }
        const result = loans.map((loan) => {
            const plain = loan.toJSON ? loan.toJSON() : Object.assign({}, loan);
            if (plain.status === -1 && debtsMap[plain.id]) {
                plain.debtAmount = debtsMap[plain.id].debtAmount;
                plain.debtDate = debtsMap[plain.id].debtDate;
            }
            return plain;
        });
        return res.status(200).send({ success: true, result });
    }
    catch (error) {
        return res.status(500).send({
            success: false,
            message: error.message || "Erro ao buscar prestações próximas.",
        });
    }
});
exports.getUpcomingAmortizations = getUpcomingAmortizations;
const getPastAmortizations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const now = (0, moment_1.default)().format("YYYY-MM-DD");
        const pastAmortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: {
                dueDate: {
                    [sequelize_1.Op.lt]: now,
                },
                companyId: id,
            },
            order: [["dueDate", "DESC"]],
        });
        return res.status(200).send({ success: true, result: pastAmortizations || [] });
    }
    catch (error) {
        return res.status(500).send({
            success: false,
            message: error.message || "Erro ao buscar prestações vencidas.",
        });
    }
});
exports.getPastAmortizations = getPastAmortizations;
const createAmortizationLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { companyId, loanId, accountNumber, interestRate, numberOfInstallments, amount, dueDate, status } = req.body;
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
        const existingAmortization = yield AmortizationLoanModel_1.AmorizationLoanModel.findOne({
            where: { loanId }
        });
        if (existingAmortization) {
            return res.status(409).json({
                success: false,
                message: "Já existe um plano de amortização para este empréstimo.",
            });
        }
        const loan = yield LoanModel_1.LoanModel.findByPk(loanId);
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
        const customerAmortizationPlan = (0, loanAmortization_1.simulator)({
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
        const bulckInsert = yield AmortizationLoanModel_1.AmorizationLoanModel.bulkCreate(customerAmortizationPlan.map((installment) => (Object.assign(Object.assign({}, installment), { customerId }))));
        // Atualiza o status do empréstimo e guarda a data real de desembolso:
        // o dueDate enviado é a base do plano (a 1ª prestação vence 1 mês depois).
        yield LoanModel_1.LoanModel.update({ status: 1, disbursementDate: String(dueDate || "").slice(0, 10) || null }, {
            where: {
                id: loanId
            }
        });
        try {
            yield (0, SmsGatewayService_1.enqueueDisbursementSms)({
                companyId: Number(companyId),
                loanId: Number(loanId),
                accountNumber,
                amount: Number(amount),
                installments: Number(numberOfInstallments),
                firstDueDate: ((_a = customerAmortizationPlan[0]) === null || _a === void 0 ? void 0 : _a.dueDate)
                    ? String(customerAmortizationPlan[0].dueDate)
                    : null,
            });
        }
        catch (smsError) {
            console.error("Erro ao enfileirar SMS de desembolso:", smsError);
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
    }
    catch (error) {
        console.error("Erro ao criar plano de amortização:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao processar o plano de amortização.",
        });
    }
});
exports.createAmortizationLoan = createAmortizationLoan;
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
const getInstallmentsControl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const { companyId } = req.params;
        const companyIdNum = Number(companyId);
        if (!Number.isFinite(companyIdNum) || companyIdNum <= 0) {
            return res.status(400).json({ success: false, message: "companyId inválido." });
        }
        const company = yield CompanyModel_1.CompanyModel.findByPk(companyIdNum, { attributes: ["id", "forfeit"] });
        if (!company) {
            return res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
        const forfeit = Number(company.getDataValue("forfeit") || 0);
        // 1. Créditos activos (1) ou liquidados (3)
        const loans = yield LoanModel_1.LoanModel.findAll({
            where: { companyId: companyIdNum, status: { [sequelize_1.Op.in]: [1, 3] } },
            attributes: ["id", "accountNumber", "customerId", "status"],
            order: [["id", "DESC"]],
            raw: true,
        });
        if (loans.length === 0) {
            return res.status(200).json({ success: true, result: [] });
        }
        const loanIds = loans.map((l) => Number(l.id));
        // 2. Lista COMPLETA de mutuários da empresa (sem paginação), indexada por conta e por id
        const customers = yield CustomerModel_1.CustomerModel.findAll({
            where: { companyId: companyIdNum },
            attributes: ["id", "accountNumber", "customerName", "customerPhone"],
            raw: true,
        });
        const customerByAccount = {};
        const customerById = {};
        customers.forEach((c) => {
            customerByAccount[String(c.accountNumber)] = c;
            customerById[Number(c.id)] = c;
        });
        // 3. Todas as prestações desses créditos numa única query
        const amortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: { [sequelize_1.Op.in]: loanIds } },
            order: [["dueDate", "ASC"], ["id", "ASC"]],
            raw: true,
        });
        // 4. Mora real cobrada nas prestações pagas (de-duplicada por dia de pagamento)
        const paidAmortIds = amortizations
            .filter((a) => Number(a.status) === 1)
            .map((a) => Number(a.id));
        const realLateByAmortId = {};
        if (paidAmortIds.length > 0) {
            const transactions = yield TranzactionModel_1.TranzactionModel.findAll({
                where: { amortizationLoanId: { [sequelize_1.Op.in]: paidAmortIds } },
                attributes: ["amortizationLoanId", "latePaymentInterest", "paymentDate"],
                raw: true,
            });
            const maxLateByAmortAndDate = {};
            transactions.forEach((tx) => {
                const key = `${Number(tx.amortizationLoanId)}:${String(tx.paymentDate || "").slice(0, 10)}`;
                maxLateByAmortAndDate[key] = Math.max(maxLateByAmortAndDate[key] || 0, Number(tx.latePaymentInterest) || 0);
            });
            Object.entries(maxLateByAmortAndDate).forEach(([key, value]) => {
                const amortId = Number(key.split(":")[0]);
                realLateByAmortId[amortId] = Math.round(((realLateByAmortId[amortId] || 0) + value) * 100) / 100;
            });
        }
        // 5. Panificação por crédito (mora diária e saldo são calculados por empréstimo)
        const amortByLoan = {};
        amortizations.forEach((a) => {
            var _a;
            (amortByLoan[_a = Number(a.loanId)] || (amortByLoan[_a] = [])).push(a);
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result = [];
        for (const loan of loans) {
            const plan = (0, calculateLateAmount_1.installmentPanification)(amortByLoan[Number(loan.id)] || [], forfeit);
            // Mesma ordem de resolução usada historicamente no frontend: conta → id
            const customer = customerByAccount[String(loan.accountNumber)] ||
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
                    amortizationId: Number(a.id) || null,
                    loanId: Number(loan.id),
                    accountNumber: loan.accountNumber,
                    customerId: loan.customerId,
                    customerName: (customer === null || customer === void 0 ? void 0 : customer.customerName) || null,
                    customerPhone: (customer === null || customer === void 0 ? void 0 : customer.customerPhone) || "",
                    hasCustomer: !!customer,
                    installmentOrder: (_b = a.installmentOrder) !== null && _b !== void 0 ? _b : "",
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
    }
    catch (error) {
        console.error("Erro no controle de prestações:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro ao carregar o controle de prestações.",
        });
    }
});
exports.getInstallmentsControl = getInstallmentsControl;
const destroyInstallment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const installmentId = Number(id);
        if (!Number.isFinite(installmentId) || installmentId <= 0) {
            return res.status(400).json({ success: false, message: "ID de prestação inválido." });
        }
        const installment = yield AmortizationLoanModel_1.AmorizationLoanModel.findByPk(installmentId);
        if (!installment) {
            return res.status(404).json({ success: false, message: "Prestação não encontrada." });
        }
        // Verificar se existem transações/pagamentos para esta prestação
        const transactionCount = yield TranzactionModel_1.TranzactionModel.count({
            where: { amortizationLoanId: installmentId },
        });
        if (transactionCount > 0) {
            return res.status(409).json({
                success: false,
                message: `Não é possível eliminar esta prestação porque existem ${transactionCount} pagamento(s)/transacção(ões) associada(s). Remova primeiro os pagamentos antes de eliminar a prestação.`,
            });
        }
        // Eliminar dívida associada, se existir
        yield DebtModel_1.DebtModel.destroy({ where: { amortisationId: installmentId } });
        // Eliminar a prestação
        yield AmortizationLoanModel_1.AmorizationLoanModel.destroy({ where: { id: installmentId } });
        return res.status(200).json({
            success: true,
            message: "Prestação eliminada com sucesso.",
        });
    }
    catch (error) {
        console.error("Erro ao eliminar prestação:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro ao eliminar a prestação.",
        });
    }
});
exports.destroyInstallment = destroyInstallment;
