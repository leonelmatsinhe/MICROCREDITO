"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateLoan = exports.updateLoanInstallmentDates = exports.invalidateDisbursedLoan = exports.destroyLoan = exports.updateLoan = exports.createLoan = exports.loanDetail = exports.getLoanAmortization = exports.findLoanByCustomer = exports.findAllLoansOverview = exports.findAllLoans = void 0;
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const LoanModel_1 = require("../database/models/LoanModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const CompanyModel_1 = require("../database/models/CompanyModel");
const CustomerDocumentsModel_1 = require("../database/models/CustomerDocumentsModel");
const NotificationModel_1 = require("../database/models/NotificationModel");
const UserModel_1 = require("../database/models/UserModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const sequelize_1 = require("sequelize");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
const loanAmortization_1 = require("../utils/loanAmortization");
const db_1 = require("../database/db");
const DebtModel_1 = require("../database/models/DebtModel");
const GuarateeAssessmentModel_1 = require("../database/models/GuarateeAssessmentModel");
const FinancingWalletModel_1 = require("../database/models/FinancingWalletModel");
const ReciboModel_1 = require("../database/models/ReciboModel");
const reciboService_1 = require("../services/reciboService");
const kycDocuments_1 = require("../utils/kycDocuments");
const loanAmortization_2 = require("../utils/loanAmortization");
const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
// Subtrai meses de uma data "YYYY-MM-DD" (sem conversões de fuso horário).
// Útil para derivar a data de desembolso: o plano é mensal e a 1ª prestação
// vence 1 mês após o desembolso (ver simulator em utils/loanAmortization).
const subtractMonths = (dateStr, months) => {
    const match = String(dateStr || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match)
        return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    date.setMonth(date.getMonth() - months);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${mm}-${dd}`;
};
const calculateInstallmentValue = (amount, interestRate, numberOfInstallments) => {
    const principal = toNumber(amount);
    const rate = toNumber(interestRate);
    const installments = Math.max(1, parseInt(String(numberOfInstallments || 1), 10));
    if (principal <= 0)
        return 0;
    if (rate <= 0)
        return principal / installments;
    return (0, loanAmortization_1.calculateFrenchAmortizationInstallment)(principal, rate, installments);
};
const normalizeCapacityObservation = (value) => {
    if (typeof value !== "string")
        return "";
    return value.trim();
};
const validateCapacityRule = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const customer = yield CustomerModel_1.CustomerModel.findOne({
        where: {
            accountNumber: params.accountNumber,
            companyId: params.companyId,
        },
        attributes: ["accountNumber", "customerMonthlySalary"],
    });
    if (!customer) {
        return {
            valid: false,
            statusCode: 404,
            message: "Mutuário não encontrado para validar capacidade de pagamento.",
        };
    }
    const monthlySalary = toNumber(customer.customerMonthlySalary);
    const maxCapacity = monthlySalary / 3;
    const estimatedInstallment = calculateInstallmentValue(params.amount, params.interestRate, params.numberOfInstallments);
    const isExceeded = estimatedInstallment > maxCapacity;
    const observation = normalizeCapacityObservation(params.capacityExcessObservation);
    if (isExceeded && observation.length < 10) {
        return {
            valid: false,
            statusCode: 400,
            message: "A prestação excede 1/3 do rendimento mensal. Informe um parecer/observação com no mínimo 10 caracteres.",
            details: {
                maxCapacity,
                estimatedInstallment,
            },
        };
    }
    return {
        valid: true,
        maxCapacity,
        estimatedInstallment,
        isExceeded,
        normalizedObservation: observation || null,
    };
});
/**
 * Verifica a checklist KYC do mutuário antes de criar/desembolsar crédito.
 * Regra: nenhum crédito avança sem os 3 documentos base (BI, NUIT,
 * Comprovativo de rendimentos).
 */
const validateKycForLoan = (accountNumber, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const documents = yield CustomerDocumentsModel_1.CustomerDocumentsModel.findAll({
        where: {
            accountNumber: Number(accountNumber),
            companyId: Number(companyId),
        },
        raw: true,
    });
    return (0, kycDocuments_1.evaluateKyc)(documents);
});
/**
 * POST /api/loan/simulate — plano Price calculado no BACKEND.
 * Garante paridade total entre o simulador do frontend e o plano gravado no
 * desembolso (mesma função `simulator` usada por createInstallmentsLoan).
 * Body: { amount, installments, monthlyRate, dateCreated? }
 */
const simulateLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, installments, monthlyRate, dateCreated } = req.body || {};
        const principal = Number(amount);
        const periods = parseInt(String(installments), 10);
        const rate = Number(monthlyRate);
        if (!Number.isFinite(principal) || principal <= 0) {
            return res.status(400).json({ success: false, message: "O montante deve ser maior que zero." });
        }
        if (!Number.isInteger(periods) || periods < 1 || periods > 60) {
            return res.status(400).json({ success: false, message: "O número de prestações deve estar entre 1 e 60." });
        }
        if (!Number.isFinite(rate) || rate < 0) {
            return res.status(400).json({ success: false, message: "A taxa mensal deve ser um número positivo (ex: 0.10 = 10% a.m.)." });
        }
        const dueDate = dateCreated ? String(dateCreated).slice(0, 10) : new Date().toISOString().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
            return res.status(400).json({ success: false, message: "Data inválida (formato YYYY-MM-DD)." });
        }
        const plan = (0, loanAmortization_2.simulator)({
            amount: String(principal),
            numberOfInstallments: String(periods),
            interestRate: String(rate),
            dueDate,
            loanId: 0,
            accountNumber: 0,
            companyId: 0,
            status: 0,
        });
        const installmentValue = plan.length > 0 ? Number(plan[0].installment) : 0;
        const totalToPay = plan.reduce((sum, row) => sum + Number(row.installment || 0), 0);
        return res.status(200).json({
            success: true,
            result: {
                plan,
                installment: Math.round(installmentValue * 100) / 100,
                totalToPay: Math.round(totalToPay * 100) / 100,
                totalInterest: Math.round((totalToPay - principal) * 100) / 100,
                monthlyRate: rate,
                annualRate: Math.round(rate * 12 * 10000) / 10000,
            },
        });
    }
    catch (error) {
        console.error("Erro na simulação de crédito:", error);
        return res.status(500).json({
            success: false,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Erro interno ao simular crédito.",
        });
    }
});
exports.simulateLoan = simulateLoan;
const findLoanByCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const loans = yield LoanModel_1.LoanModel.findAll({
        where: {
            accountNumber: id,
        },
        order: [["id", "DESC"]],
    });
    return loans != null
        ? res.status(200).send({ success: true, result: loans })
        : res.status(204).send({
            success: false,
            result: "No loan found with the account number you provided",
        });
});
exports.findLoanByCustomer = findLoanByCustomer;
const findAllLoans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, companyId } = req.params;
    const whereClause = { companyId };
    // Compatibilidade com o contrato existente:
    // `id` pode vir como data (YYYY-MM-DD). Se vier "all", não filtra por data.
    if (id && id !== "all") {
        whereClause.dateCreated = id;
    }
    const credits = yield LoanModel_1.LoanModel.findAll({
        where: whereClause,
        order: [["id", "DESC"]],
    });
    return res.status(200).send({ success: true, result: credits || [] });
});
exports.findAllLoans = findAllLoans;
const getLoanAmortization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const loans = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: {
            loanId: id,
        },
        order: [
            ['dueDate', 'ASC'],
            ['id', 'ASC'] // Ordena por ID como critério secundário
        ],
    });
    const loan = yield LoanModel_1.LoanModel.findByPk(id, { attributes: ["companyId"] });
    if (!loan) {
        return res.status(404).json({ success: false, message: "Crédito não encontrado." });
    }
    const company = yield CompanyModel_1.CompanyModel.findByPk(loan.getDataValue("companyId"), {
        attributes: ["forfeit"],
    });
    const installments = (0, calculateLateAmount_1.installmentPanification)(loans, Number((company === null || company === void 0 ? void 0 : company.getDataValue("forfeit")) || 0));
    const installmentIds = loans.map((item) => item.id);
    const paidLateInterest = installmentIds.length > 0
        ? yield TranzactionModel_1.TranzactionModel.findAll({
            where: { amortizationLoanId: { [sequelize_1.Op.in]: installmentIds } },
            attributes: ["id", "amortizationLoanId", "amount", "latePaymentInterest", "paymentDate"],
            order: [["id", "ASC"]],
            raw: true,
        })
        : [];
    const transactionsByInstallment = {};
    paidLateInterest.forEach((item) => {
        const key = Number(item.amortizationLoanId);
        (transactionsByInstallment[key] || (transactionsByInstallment[key] = [])).push(item);
    });
    installments.forEach((item) => {
        const key = Number(item.id);
        const transactions = transactionsByInstallment[key] || [];
        let cumulativePaid = 0;
        let completionPayment = null;
        transactions.forEach((transaction) => {
            cumulativePaid += Number(transaction.amount) || 0;
            if (!completionPayment && cumulativePaid >= (Number(item.installment) || 0) - 0.01) {
                completionPayment = transaction;
            }
        });
        const paidDate = (completionPayment === null || completionPayment === void 0 ? void 0 : completionPayment.paymentDate)
            ? String(completionPayment.paymentDate).slice(0, 10)
            : null;
        const lateByDate = {};
        transactions.forEach((transaction) => {
            const date = String(transaction.paymentDate || '').slice(0, 10);
            lateByDate[date] = Math.max(lateByDate[date] || 0, Number(transaction.latePaymentInterest) || 0);
        });
        item.chargedLatePaymentInterest = Math.round(Object.values(lateByDate).reduce((sum, value) => sum + value, 0) * 100) / 100;
        const dueDate = String(item.dueDate || '').slice(0, 10);
        item.chargedLateDays = paidDate && dueDate
            ? Math.max(0, Math.floor((new Date(`${paidDate}T00:00:00`).getTime() - new Date(`${dueDate}T00:00:00`).getTime()) / 86400000))
            : 0;
        item.chargedLateDate = paidDate || null;
    });
    const totals = (0, calculateLateAmount_1.totalsOfInstallments)(installments);
    return loans != null && loans.length > 0
        ? res.status(200).send({ success: true, result: installments, totals })
        : res.status(204).send({
            success: false,
            result: "No loan found with the account number you provided",
        });
});
exports.getLoanAmortization = getLoanAmortization;
const createLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let { accountNumber, companyId, amount, numberOfInstallments, interestRate, administrativeFee, creditManager, loanDescription, capacityExcessObservation, dateCreated, status, } = req.body;
    // ── Validações de entrada (sem Joi — inline) ──
    if (!loanDescription || !String(loanDescription).trim()) {
        return res.status(400).json({ success: false, message: "A finalidade/descrição do crédito é obrigatória." });
    }
    if (!dateCreated || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateCreated).slice(0, 10))) {
        return res.status(400).json({ success: false, message: "A data do crédito é obrigatória (YYYY-MM-DD)." });
    }
    if (!creditManager) {
        return res.status(400).json({ success: false, message: "O gestor de crédito é obrigatório." });
    }
    const capacityValidation = yield validateCapacityRule({
        accountNumber,
        companyId,
        amount,
        interestRate,
        numberOfInstallments,
        capacityExcessObservation,
    });
    if (!capacityValidation.valid) {
        return res.status(capacityValidation.statusCode || 400).json({
            success: false,
            message: capacityValidation.message,
            details: capacityValidation.details,
        });
    }
    const customer = yield CustomerModel_1.CustomerModel.findOne({
        where: { companyId, accountNumber },
        attributes: ["id"],
    });
    if (!customer) {
        return res.status(404).json({ success: false, message: "Mutuário não encontrado." });
    }
    // ── KYC BLOQUEANTE: sem os 3 documentos base, nenhum crédito é criado ──
    const kyc = yield validateKycForLoan(accountNumber, companyId);
    if (!kyc.complete) {
        return res.status(400).json({
            success: false,
            error: "KYC_INCOMPLETE",
            message: `Checklist KYC incompleta. Documentos em falta: ${kyc.missing.join(", ")}.`,
            missing: kyc.missing,
        });
    }
    // Carteira de financiamento (analítica): a que veio no pedido ou, se não veio,
    // a derivada da taxa de juro escolhida (`interest_rates.walletId`). É sempre
    // confirmada/alterada no desembolso, onde o saldo analítico e real são validados.
    let walletId = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.walletId) ? Number(req.body.walletId) : null;
    if (!walletId) {
        try {
            const { resolveWalletFromRate } = yield Promise.resolve().then(() => __importStar(require("../services/financingWalletService")));
            const derivada = yield resolveWalletFromRate(Number(companyId), interestRate);
            if (derivada === null || derivada === void 0 ? void 0 : derivada.walletId)
                walletId = Number(derivada.walletId);
        }
        catch (deriveError) {
            console.error("[Carteiras] Falha ao derivar a carteira da taxa:", (deriveError === null || deriveError === void 0 ? void 0 : deriveError.message) || deriveError);
        }
    }
    const loan = yield LoanModel_1.LoanModel.create({
        accountNumber,
        customerId: customer.getDataValue("id"),
        companyId,
        amount,
        numberOfInstallments,
        interestRate,
        administrativeFee: administrativeFee !== undefined ? Number(administrativeFee) || 0 : 0,
        creditManager,
        loanDescription,
        capacityExcessObservation: capacityValidation.normalizedObservation,
        dateCreated,
        status,
        walletId,
    });
    // Criar notificação para admin/gestor sobre nova solicitação
    if (loan) {
        try {
            // Notificar todos os admins (userRole = 0) da empresa
            const admins = yield UserModel_1.UserModel.findAll({
                where: { companyId, userRole: 0 },
            });
            const bulkNotifs = [];
            for (const admin of admins) {
                bulkNotifs.push({
                    companyId,
                    recipientType: "admin",
                    recipientId: admin.id,
                    title: "Nova solicitação de crédito",
                    message: `Conta ${accountNumber} solicitou um crédito de ${Number(amount).toLocaleString("pt-MZ")} MZN.`,
                    type: "loan_request",
                    referenceId: loan.id,
                    isRead: false,
                });
            }
            if (bulkNotifs.length > 0) {
                yield NotificationModel_1.NotificationModel.bulkCreate(bulkNotifs);
            }
        }
        catch (err) {
            console.error("Erro ao criar notificações de novo crédito:", err);
        }
    }
    return loan != null
        ? res
            .status(200)
            .json({ success: true, message: "Loan created successfully" })
        : res.status(204).json({
            success: false,
            message: "There was an error adding the amortization plan.",
        });
});
exports.createLoan = createLoan;
const updateLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e;
    const { id } = req.params;
    // Buscar o empréstimo antes de atualizar para verificar mudança de status
    const previousLoan = yield LoanModel_1.LoanModel.findByPk(id);
    if (previousLoan && Number(previousLoan.status) === 1 && Number(req.body.status) === 0) {
        return res.status(400).json({
            success: false,
            message: "Use a acção de invalidar desembolso para voltar este crédito a Pendentes.",
        });
    }
    // Valida a capacidade de pagamento (1/3 do rendimento) também ao REABRIR um
    // pedido rejeitado (2/-1 → 0): o pedido só volta a Pendentes dentro da regra
    // ou com parecer/observação registada (mín. 10 caracteres).
    const reopeningRejected = !!previousLoan &&
        Number(req.body.status) === 0 &&
        [2, -1].includes(Number(previousLoan.status));
    if (previousLoan && (Number(req.body.status) === 1 || reopeningRejected)) {
        const capacityValidation = yield validateCapacityRule({
            accountNumber: previousLoan.accountNumber,
            companyId: previousLoan.companyId,
            amount: (_b = req.body.amount) !== null && _b !== void 0 ? _b : previousLoan.amount,
            interestRate: (_c = req.body.interestRate) !== null && _c !== void 0 ? _c : previousLoan.interestRate,
            numberOfInstallments: (_d = req.body.numberOfInstallments) !== null && _d !== void 0 ? _d : previousLoan.numberOfInstallments,
            capacityExcessObservation: (_e = req.body.capacityExcessObservation) !== null && _e !== void 0 ? _e : previousLoan.capacityExcessObservation,
        });
        if (!capacityValidation.valid) {
            return res.status(capacityValidation.statusCode || 400).json({
                success: false,
                message: capacityValidation.message,
                details: capacityValidation.details,
            });
        }
        req.body.capacityExcessObservation = capacityValidation.normalizedObservation;
    }
    const loan = yield LoanModel_1.LoanModel.update(req.body, {
        where: {
            id,
        },
    });
    // Criar notificação para o cliente quando o status muda
    if (loan && previousLoan && req.body.status !== undefined) {
        const newStatus = Number(req.body.status);
        const oldStatus = Number(previousLoan.status);
        if (newStatus !== oldStatus) {
            try {
                // Buscar cliente associado ao empréstimo
                const customer = yield CustomerModel_1.CustomerModel.findOne({
                    where: { accountNumber: previousLoan.accountNumber },
                });
                if (customer) {
                    let title = "";
                    let message = "";
                    let type = "";
                    if (newStatus === 1) {
                        // Aprovado
                        title = "Crédito aprovado";
                        message = `O seu crédito de ${Number(previousLoan.amount).toLocaleString("pt-MZ")} MZN foi aprovado.`;
                        type = "loan_approved";
                    }
                    else if (newStatus === 2) {
                        // Rejeitado
                        title = "Crédito rejeitado";
                        message = `O seu pedido de crédito de ${Number(previousLoan.amount).toLocaleString("pt-MZ")} MZN não foi aprovado.`;
                        type = "loan_rejected";
                    }
                    else if (newStatus === 3) {
                        // Liquidado
                        title = "Crédito liquidado";
                        message = `O seu crédito de ${Number(previousLoan.amount).toLocaleString("pt-MZ")} MZN foi totalmente liquidado.`;
                        type = "loan_approved";
                    }
                    if (title) {
                        yield NotificationModel_1.NotificationModel.create({
                            companyId: previousLoan.companyId,
                            recipientType: "customer",
                            recipientId: customer.id,
                            title,
                            message,
                            type,
                            referenceId: Number(id),
                            isRead: false,
                        });
                    }
                }
                // Pedido rejeitado reaberto (status 2/-1 → 0) → notificar admins e gestor.
                // Admins = Administradores (role 1) + super admin/proprietário (role 0).
                if (newStatus === 0 && [2, -1].includes(oldStatus)) {
                    // Usar os valores re-submetidos (podem ter sido editados antes de reabrir)
                    const resubAmount = req.body.amount !== undefined && req.body.amount !== null && Number(req.body.amount) > 0
                        ? Number(req.body.amount)
                        : Number(previousLoan.amount);
                    const amountLabel = resubAmount.toLocaleString("pt-MZ");
                    const admins = yield UserModel_1.UserModel.findAll({
                        where: { companyId: previousLoan.companyId, userRole: { [sequelize_1.Op.in]: [0, 1] } },
                    });
                    const bulkNotifs = [];
                    for (const admin of admins) {
                        bulkNotifs.push({
                            companyId: previousLoan.companyId,
                            recipientType: "admin",
                            recipientId: admin.id,
                            title: "Pedido de crédito reaberto",
                            message: `A conta ${previousLoan.accountNumber} reabriu o pedido de crédito de ${amountLabel} MZN. Está novamente em Pendentes para nova análise.`,
                            type: "loan_request",
                            referenceId: Number(id),
                            isRead: false,
                        });
                    }
                    if (bulkNotifs.length > 0) {
                        yield NotificationModel_1.NotificationModel.bulkCreate(bulkNotifs);
                    }
                    if (previousLoan.creditManager) {
                        yield NotificationModel_1.NotificationModel.create({
                            companyId: previousLoan.companyId,
                            recipientType: "gestor",
                            recipientId: previousLoan.creditManager,
                            title: "Pedido de crédito reaberto",
                            message: `A conta ${previousLoan.accountNumber} reabriu o pedido de crédito de ${amountLabel} MZN. Está novamente em Pendentes para nova análise.`,
                            type: "loan_request",
                            referenceId: Number(id),
                            isRead: false,
                        });
                    }
                }
            }
            catch (err) {
                console.error("Erro ao criar notificação de atualização de crédito:", err);
            }
        }
    }
    return loan != null
        ? res
            .status(200)
            .json({ success: true, message: "Loan updated successfully" })
        : res.status(204).json({
            success: true,
            message: "There was an error updating the loan.",
        });
});
exports.updateLoan = updateLoan;
const destroyLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const transaction = yield db_1.db.transaction();
    try {
        const loan = yield LoanModel_1.LoanModel.findByPk(id, { transaction });
        if (!loan) {
            yield transaction.rollback();
            return res.status(404).json({ success: false, message: "Crédito não encontrado." });
        }
        // Verificar se existem transações/pagamentos associados ao crédito.
        // Se existir qualquer pagamento, NÃO permitir a eliminação.
        const transactionCount = yield TranzactionModel_1.TranzactionModel.count({
            where: { loanId: id },
            transaction,
        });
        if (transactionCount > 0) {
            yield transaction.rollback();
            return res.status(409).json({
                success: false,
                message: `Não é possível eliminar este crédito porque existem ${transactionCount} pagamento(s)/transacção(ões) associada(s). Remova primeiro os pagamentos antes de eliminar o crédito.`,
            });
        }
        const installments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: id },
            attributes: ["id"],
            transaction,
        });
        const installmentIds = installments.map((installment) => installment.id);
        if (installmentIds.length > 0) {
            yield DebtModel_1.DebtModel.destroy({ where: { amortisationId: { [sequelize_1.Op.in]: installmentIds } }, transaction });
            yield AmortizationLoanModel_1.AmorizationLoanModel.destroy({ where: { loanId: id }, transaction });
        }
        yield GuarateeAssessmentModel_1.GuarateeAssessmentModel.destroy({ where: { loanId: id }, transaction });
        yield LoanModel_1.LoanModel.destroy({ where: { id }, transaction });
        yield transaction.commit();
        return res.status(200).json({
            success: true,
            message: "Crédito e todos os registos associados foram eliminados.",
        });
    }
    catch (error) {
        yield transaction.rollback();
        console.error("Erro ao eliminar crédito e dependências:", error);
        return res.status(500).json({ success: false, message: "Não foi possível eliminar o crédito." });
    }
});
exports.destroyLoan = destroyLoan;
const invalidateDisbursedLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const transaction = yield db_1.db.transaction();
    try {
        const loan = yield LoanModel_1.LoanModel.findByPk(id, { transaction });
        if (!loan) {
            yield transaction.rollback();
            return res.status(404).json({ success: false, message: "Crédito não encontrado." });
        }
        if (Number(loan.status) !== 1) {
            yield transaction.rollback();
            return res.status(400).json({
                success: false,
                message: "Apenas créditos desembolsados podem ser invalidados para Pendentes.",
            });
        }
        const installments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: id },
            attributes: ["id", "paidAmount", "status"],
            transaction,
            raw: true,
        });
        const installmentIds = installments.map((installment) => Number(installment.id));
        const paidInstallmentCount = installments.filter((installment) => Number(installment.paidAmount) > 0 || [1, -1].includes(Number(installment.status))).length;
        if (paidInstallmentCount > 0) {
            yield transaction.rollback();
            return res.status(409).json({
                success: false,
                message: `Não é possível invalidar o desembolso porque existem ${paidInstallmentCount} prestação(ões) com pagamento registado.`,
            });
        }
        const paymentWhere = installmentIds.length > 0
            ? {
                [sequelize_1.Op.or]: [
                    { loanId: id },
                    { amortizationLoanId: { [sequelize_1.Op.in]: installmentIds } },
                ],
            }
            : { loanId: id };
        const paymentCount = yield TranzactionModel_1.TranzactionModel.count({
            where: paymentWhere,
            transaction,
        });
        if (paymentCount > 0) {
            yield transaction.rollback();
            return res.status(409).json({
                success: false,
                message: `Não é possível invalidar o desembolso porque existem ${paymentCount} pagamento(s) associado(s) a este crédito.`,
            });
        }
        if (installmentIds.length > 0) {
            yield DebtModel_1.DebtModel.destroy({
                where: {
                    [sequelize_1.Op.or]: [
                        { loanId: id },
                        { amortisationId: { [sequelize_1.Op.in]: installmentIds } },
                    ],
                },
                transaction,
            });
            yield AmortizationLoanModel_1.AmorizationLoanModel.destroy({ where: { loanId: id }, transaction });
        }
        else {
            yield DebtModel_1.DebtModel.destroy({ where: { loanId: id }, transaction });
        }
        yield LoanModel_1.LoanModel.update({ status: 0, disbursementDate: null }, { where: { id }, transaction });
        yield transaction.commit();
        return res.status(200).json({
            success: true,
            message: "Desembolso invalidado. O crédito voltou a Pendentes e o plano de prestações foi removido.",
            removedInstallments: installmentIds.length,
        });
    }
    catch (error) {
        yield transaction.rollback();
        console.error("Erro ao invalidar desembolso:", error);
        return res.status(500).json({
            success: false,
            message: "Não foi possível invalidar o desembolso.",
        });
    }
});
exports.invalidateDisbursedLoan = invalidateDisbursedLoan;
/**
 * Lista de créditos da empresa com métricas agregadas por crédito, para a
 * página de Créditos (Pendentes / Desembolsados / Terminados):
 * - nome/telefone do mutuário;
 * - total pago (soma dos pagamentos efectivos);
 * - juros de mora pagos;
 * - descontos aplicados;
 * - total em dívida (prestações ainda por liquidar);
 * - nº de prestações pagas/total, próximo vencimento e atrasos.
 */
const findAllLoansOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const companyIdNum = parseInt(String(companyId), 10);
        if (Number.isNaN(companyIdNum) || companyIdNum <= 0) {
            return res.status(400).json({ success: false, message: "companyId inválido." });
        }
        const loans = (yield LoanModel_1.LoanModel.findAll({
            where: { companyId: companyIdNum },
            order: [["id", "DESC"]],
        }));
        if (loans.length === 0) {
            return res.status(200).json({ success: true, result: [] });
        }
        const loanIds = loans.map((l) => l.id);
        // Mutuários — nome e telefone para exibição e alertas SMS/WhatsApp
        const accountNumbers = [...new Set(loans.map((l) => l.accountNumber))];
        const customerMap = {};
        if (accountNumbers.length > 0) {
            const customers = (yield CustomerModel_1.CustomerModel.findAll({
                where: {
                    companyId: companyIdNum,
                    accountNumber: { [sequelize_1.Op.in]: accountNumbers },
                },
                attributes: [
                    "accountNumber",
                    "customerName",
                    "customerPhone",
                    "customerMonthlySalary",
                    "passportPhotoUrl",
                    "isSelfRegistered",
                ],
            }));
            customers.forEach((c) => {
                customerMap[String(c.accountNumber)] = c.toJSON ? c.toJSON() : c;
            });
        }
        // Documentos do mutuário (BI/passaporte, NUIT, declaração de bairro, ...)
        // — usados no painel de revisão da tab Pendentes, sem abrir o mutuário.
        const docByAccount = {};
        if (accountNumbers.length > 0) {
            const documents = (yield CustomerDocumentsModel_1.CustomerDocumentsModel.findAll({
                where: {
                    companyId: companyIdNum,
                    accountNumber: { [sequelize_1.Op.in]: accountNumbers },
                },
                attributes: ["accountNumber", "documentName", "documentFileUrl"],
                order: [["id", "ASC"]],
                raw: true,
            }));
            documents.forEach((d) => {
                (docByAccount[String(d.accountNumber)] =
                    docByAccount[String(d.accountNumber)] || []).push(d);
            });
        }
        // Pagamentos (transacções) por crédito
        const transactions = (yield TranzactionModel_1.TranzactionModel.findAll({
            where: { loanId: { [sequelize_1.Op.in]: loanIds } },
            attributes: [
                "loanId",
                "amount",
                "interestRateAmount",
                "latePaymentInterest",
                "discountAmount",
                "discountApplied",
            ],
            raw: true,
        }));
        const txByLoan = {};
        transactions.forEach((t) => {
            (txByLoan[Number(t.loanId)] = txByLoan[Number(t.loanId)] || []).push(t);
        });
        // Prestações por crédito (para dívida restante, progresso e vencimentos).
        // Nota: remainingBalance na tabela é o saldo devedor ACUMULADO (principal),
        // não o valor em falta da prestação — por isso a dívida é calculada a partir
        // do valor de cada prestação em aberto (status 0/-1), deduzindo o pago.
        const amortizations = (yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: { [sequelize_1.Op.in]: loanIds } },
            attributes: ["loanId", "installment", "paidAmount", "status", "dueDate"],
            raw: true,
        }));
        const amortByLoan = {};
        amortizations.forEach((a) => {
            (amortByLoan[Number(a.loanId)] = amortByLoan[Number(a.loanId)] || []).push(a);
        });
        const company = yield CompanyModel_1.CompanyModel.findByPk(companyId, { attributes: ["forfeit"] });
        const forfeit = Number((company === null || company === void 0 ? void 0 : company.getDataValue("forfeit")) || 0);
        const todayStr = new Date().toISOString().slice(0, 10);
        const result = loans.map((loan) => {
            var _a, _b;
            const plain = loan.toJSON ? loan.toJSON() : loan;
            const customer = customerMap[String(loan.accountNumber)] || null;
            const txs = txByLoan[Number(loan.id)] || [];
            const amorts = amortByLoan[Number(loan.id)] || [];
            const calculatedAmorts = (0, calculateLateAmount_1.installmentPanification)(amorts, forfeit);
            const sum = (rows, field) => rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
            const totalPaid = Math.round(sum(txs, "amount") * 100) / 100;
            const totalInterestPaid = Math.round(sum(txs, "interestRateAmount") * 100) / 100;
            const totalLateInterestPaid = Math.round(sum(txs, "latePaymentInterest") * 100) / 100;
            const totalLateInterest = Math.round(sum(calculatedAmorts, "latePaymentInterest") * 100) / 100;
            const totalDiscount = Math.round(sum(txs, "discountAmount") * 100) / 100;
            // Datas do plano: 1ª e última prestação (vencimento final do crédito)
            let firstDueDate = null;
            let finalDueDate = null;
            for (const a of amorts) {
                const d = String(a.dueDate || "").slice(0, 10);
                if (!d)
                    continue;
                if (!firstDueDate || d < firstDueDate)
                    firstDueDate = d;
                if (!finalDueDate || d > finalDueDate)
                    finalDueDate = d;
            }
            // Desembolso: usa a data guardada na coluna própria. Para registos antigos
            // (sem data), deriva da 1ª prestação − 1 mês (cadência mensal do plano Price).
            const disbursementDate = plain.disbursementDate
                ? String(plain.disbursementDate).slice(0, 10)
                : firstDueDate
                    ? subtractMonths(firstDueDate, 1)
                    : null;
            // Dívida = soma do valor ainda por pagar de cada prestação não liquidada
            let amountInDebt = 0;
            let paidInstallments = 0;
            let overdueCount = 0;
            let overdueAmount = 0;
            let nextDueDate = null;
            const contractTotal = Math.round(sum(amorts, "installment") * 100) / 100;
            calculatedAmorts.forEach((a) => {
                const status = Number(a.status);
                const installmentValue = Number(a.installment) || 0;
                const paidValue = Number(a.paidAmount) || 0;
                // dueDate pode vir "YYYY-MM-DD" ou "YYYY-MM-DD HH:mm:ss"
                const due = String(a.dueDate || "").slice(0, 10);
                if (status === 1) {
                    paidInstallments += 1;
                    return;
                }
                // Em aberto (0) ou parcial (-1): o que falta pagar desta prestação
                const remaining = Math.max(0, installmentValue - paidValue);
                amountInDebt += remaining + (Number(a.latePaymentInterest) || 0);
                if (due) {
                    if (due < todayStr) {
                        overdueCount += 1;
                        overdueAmount += remaining;
                    }
                    else if (!nextDueDate || due < nextDueDate) {
                        nextDueDate = due;
                    }
                }
            });
            amountInDebt = Math.round(amountInDebt * 100) / 100;
            overdueAmount = Math.round(overdueAmount * 100) / 100;
            return Object.assign(Object.assign({}, plain), { customerName: (customer === null || customer === void 0 ? void 0 : customer.customerName) || `Conta ${plain.accountNumber}`, customerPhone: (customer === null || customer === void 0 ? void 0 : customer.customerPhone) || "", customerMonthlySalary: (_a = customer === null || customer === void 0 ? void 0 : customer.customerMonthlySalary) !== null && _a !== void 0 ? _a : null, customerPassportPhoto: (customer === null || customer === void 0 ? void 0 : customer.passportPhotoUrl) || null, customerDocuments: docByAccount[String(plain.accountNumber)] || [], isSelfRegistered: (_b = customer === null || customer === void 0 ? void 0 : customer.isSelfRegistered) !== null && _b !== void 0 ? _b : 0, contractTotal,
                totalPaid,
                totalInterestPaid,
                totalLateInterestPaid,
                totalLateInterest,
                totalDiscount,
                amountInDebt, installmentsCount: amorts.length, paidInstallments,
                overdueCount,
                overdueAmount, hasOverdue: overdueCount > 0, nextDueDate,
                firstDueDate,
                finalDueDate,
                disbursementDate });
        });
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("findAllLoansOverview:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao listar créditos com métricas." });
    }
});
exports.findAllLoansOverview = findAllLoansOverview;
// Actualizar datas das prestações com base na nova data de desembolso
const updateLoanInstallmentDates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { disbursementDate } = req.body;
        if (!disbursementDate) {
            return res.status(400).json({
                success: false,
                message: "Data de desembolso é obrigatória.",
            });
        }
        // Buscar o loan para obter informações
        const loan = yield LoanModel_1.LoanModel.findByPk(id);
        if (!loan) {
            return res.status(404).json({
                success: false,
                message: "Empréstimo não encontrado.",
            });
        }
        // Buscar todas as prestações — ordem cronológica (data de vencimento)
        const installments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: id },
            order: [["dueDate", "ASC"], ["id", "ASC"]],
        });
        if (!installments || installments.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Nenhuma prestação encontrada para este empréstimo.",
            });
        }
        // Calcular novas datas com base na data de desembolso
        const baseDate = new Date(disbursementDate);
        const updates = [];
        for (let i = 0; i < installments.length; i++) {
            const newDueDate = new Date(baseDate);
            newDueDate.setMonth(newDueDate.getMonth() + (i + 1));
            // Converter para string YYYY-MM-DD (formato esperado pelo model)
            const dueDateStr = newDueDate.toISOString().split('T')[0];
            const installment = installments[i];
            updates.push(AmortizationLoanModel_1.AmorizationLoanModel.update({ dueDate: dueDateStr }, { where: { id: installment.id } }));
        }
        yield Promise.all(updates);
        // Persistir a data de desembolso que serviu de base ao novo plano
        yield loan.update({ disbursementDate: String(disbursementDate).slice(0, 10) });
        return res.status(200).json({
            success: true,
            message: `Datas de ${installments.length} prestações actualizadas com sucesso.`,
        });
    }
    catch (error) {
        console.error("Erro ao actualizar datas:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro ao actualizar datas das prestações.",
        });
    }
});
exports.updateLoanInstallmentDates = updateLoanInstallmentDates;
/**
 * GET /api/loan/:id/detail
 * DOSSIÊ DO CRÉDITO — alimenta a página de detalhe (`/loans/:id`):
 * crédito + mutuário + carteira de financiamento, pagamentos com o recibo de
 * cada um (ou sem recibo, para permitir emiti-lo), recibos emitidos e totais.
 *
 * As instalações (prestações) ficam em `GET /api/loan/amortization/:id`, que já
 * calcula mora e plano completo — aqui só se resume o essencial.
 */
const loanDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Crédito inválido." });
        }
        const loan = (yield LoanModel_1.LoanModel.findByPk(id, { raw: true }));
        if (!loan) {
            return res.status(404).json({ success: false, message: "Crédito não encontrado." });
        }
        const companyId = Number(loan.companyId);
        const [cliente, carteira, pagamentos, recibos, prestacoes] = yield Promise.all([
            loan.customerId
                ? CustomerModel_1.CustomerModel.findByPk(Number(loan.customerId), { raw: true })
                : Promise.resolve(null),
            loan.walletId
                ? FinancingWalletModel_1.FinancingWalletModel.findByPk(Number(loan.walletId), { raw: true })
                : Promise.resolve(null),
            TranzactionModel_1.TranzactionModel.findAll({ where: { loanId: id }, order: [["id", "DESC"]], raw: true }),
            ReciboModel_1.ReciboModel.findAll({ where: { loanId: id }, order: [["id", "DESC"]], raw: true }),
            AmortizationLoanModel_1.AmorizationLoanModel.findAll({ where: { loanId: id }, raw: true }),
        ]);
        const reciboByTranzaction = new Map();
        (recibos || []).forEach((r) => reciboByTranzaction.set(Number(r.tranzactionId), r));
        const round2 = (value) => Math.round(value * 100) / 100;
        const metodoCache = new Map();
        const metodoLegivel = (value) => __awaiter(void 0, void 0, void 0, function* () {
            const chave = String(value !== null && value !== void 0 ? value : "");
            if (!metodoCache.has(chave)) {
                const { description } = yield (0, reciboService_1.resolvePaymentMethod)(value, companyId);
                metodoCache.set(chave, description);
            }
            return metodoCache.get(chave) || "—";
        });
        let totalPago = 0;
        let totalCapital = 0;
        let totalJuros = 0;
        let totalMora = 0;
        let totalDesconto = 0;
        const listaPagamentos = [];
        for (const tx of pagamentos || []) {
            const valor = round2(toNumber(tx.amount));
            const juros = round2(toNumber(tx.interestRateAmount));
            const mora = round2(toNumber(tx.mora_amount) || toNumber(tx.latePaymentInterest));
            const desconto = round2(toNumber(tx.discountAmount));
            const capital = round2(Math.max(0, valor - juros));
            const recibo = reciboByTranzaction.get(Number(tx.id));
            totalPago += valor;
            totalCapital += capital;
            totalJuros += juros;
            totalMora += mora;
            totalDesconto += desconto;
            listaPagamentos.push({
                id: Number(tx.id),
                amortizationLoanId: Number(tx.amortizationLoanId) || null,
                paymentDate: tx.paymentDate || null,
                amount: valor,
                capitalAmount: capital,
                interestAmount: juros,
                lateInterestAmount: mora,
                discountAmount: desconto,
                totalAmount: round2(valor + mora - desconto),
                reference: tx.tranzactionReference || "",
                paymentMethod: tx.paymentMethod,
                paymentMethodLabel: yield metodoLegivel(tx.paymentMethod),
                staffName: tx.staffName || "",
                notes: tx.notes || null,
                receiptUrl: tx.receiptUrl || null,
                walletId: Number(tx.walletId) || null,
                recibo: recibo
                    ? {
                        id: Number(recibo.id),
                        numero: recibo.numero,
                        sequencia: Number(recibo.sequencia),
                        ano: Number(recibo.ano),
                        valor_pago: round2(toNumber(recibo.valor_pago)),
                        hash_at: recibo.hash_at || null,
                        at_validation_code: recibo.at_validation_code || null,
                        pdf_url: recibo.pdf_url || null,
                        emitido_em: recibo.created_at || recibo.createdAt || null,
                    }
                    : null,
            });
        }
        // Prestações: valor em falta = valor da prestação - já pago (a tabela guarda
        // o saldo devedor acumulado em `remainingBalance`, que não serve para isto).
        const hoje = new Date();
        let saldoDevedor = 0;
        let pagas = 0;
        let pendentes = 0;
        let emAtraso = 0;
        let moraGerada = 0;
        let proximoVencimento = null;
        (prestacoes || []).forEach((item) => {
            const falta = Math.max(0, toNumber(item.installment) - toNumber(item.paidAmount));
            const status = Number(item.status);
            const vencimento = item.dueDate ? new Date(String(item.dueDate).slice(0, 10)) : null;
            const vencida = vencimento instanceof Date && !Number.isNaN(vencimento.getTime()) && vencimento < hoje;
            if (status === 1) {
                pagas += 1;
                return;
            }
            saldoDevedor += falta;
            pendentes += 1;
            moraGerada += toNumber(item.mora_amount);
            if (vencida)
                emAtraso += 1;
            if (vencimento && !vencida) {
                const iso = String(item.dueDate).slice(0, 10);
                if (!proximoVencimento || iso < proximoVencimento)
                    proximoVencimento = iso;
            }
        });
        const ultimoPagamento = listaPagamentos.length
            ? listaPagamentos
                .map((p) => String(p.paymentDate || ""))
                .filter(Boolean)
                .sort()
                .pop() || null
            : null;
        return res.status(200).json({
            success: true,
            result: {
                credito: {
                    id: Number(loan.id),
                    companyId,
                    accountNumber: loan.accountNumber,
                    amount: round2(toNumber(loan.amount)),
                    interestRate: toNumber(loan.interestRate),
                    administrativeFee: toNumber(loan.administrativeFee),
                    numberOfInstallments: Number(loan.numberOfInstallments) || 0,
                    status: Number(loan.status),
                    dateCreated: loan.dateCreated || null,
                    disbursementDate: loan.disbursementDate || null,
                    finalDueDate: loan.finalDueDate || null,
                    creditManager: loan.creditManager || null,
                    walletId: Number(loan.walletId) || null,
                },
                cliente: cliente
                    ? {
                        id: Number(cliente.id),
                        accountNumber: cliente.accountNumber,
                        name: cliente.customerName || cliente.name || "",
                        nuit: cliente.customerNuit || null,
                        phone: cliente.customerPhone || null,
                        email: cliente.customerEmail || null,
                        photoUrl: cliente.passportPhotoUrl || null,
                    }
                    : null,
                carteira: carteira
                    ? {
                        id: Number(carteira.id),
                        codigo: carteira.codigo,
                        nome: carteira.nome,
                        cor_badge: carteira.cor_badge || "blue",
                        parceiro_nome: carteira.parceiro_nome || null,
                        allocated_amount: carteira.allocated_amount === null || carteira.allocated_amount === undefined
                            ? null
                            : round2(toNumber(carteira.allocated_amount)),
                    }
                    : null,
                resumo: {
                    total_pago: round2(totalPago),
                    total_capital: round2(totalCapital),
                    total_juros: round2(totalJuros),
                    total_mora: round2(totalMora),
                    total_desconto: round2(totalDesconto),
                    saldo_devedor: round2(saldoDevedor),
                    mora_gerada: round2(moraGerada),
                    prestacoes_pagas: pagas,
                    prestacoes_pendentes: pendentes,
                    prestacoes_atraso: emAtraso,
                    num_pagamentos: listaPagamentos.length,
                    pagamentos_sem_recibo: listaPagamentos.filter((p) => !p.recibo).length,
                    ultimo_pagamento: ultimoPagamento,
                    proximo_vencimento: proximoVencimento,
                },
                pagamentos: listaPagamentos,
                recibos: (recibos || []).map((r) => ({
                    id: Number(r.id),
                    numero: r.numero,
                    sequencia: Number(r.sequencia),
                    ano: Number(r.ano),
                    tranzactionId: Number(r.tranzactionId) || null,
                    valor_pago: round2(toNumber(r.valor_pago)),
                    valor_capital: round2(toNumber(r.valor_capital)),
                    valor_juros: round2(toNumber(r.valor_juros)),
                    valor_mora: round2(toNumber(r.valor_mora)),
                    metodo_pagamento_desc: r.metodo_pagamento_desc || null,
                    hash_at: r.hash_at || null,
                    at_validation_code: r.at_validation_code || null,
                    pdf_url: r.pdf_url || null,
                    emitido_em: r.created_at || r.createdAt || null,
                })),
            },
        });
    }
    catch (error) {
        console.error("[Crédito] Erro no dossiê:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({
            success: false,
            message: "Não foi possível carregar os dados do crédito.",
        });
    }
});
exports.loanDetail = loanDetail;
