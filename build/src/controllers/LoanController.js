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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLoanInstallmentDates = exports.destroyLoan = exports.updateLoan = exports.createLoan = exports.getLoanAmortization = exports.findLoanByCustomer = exports.findAllLoans = void 0;
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const LoanModel_1 = require("../database/models/LoanModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const NotificationModel_1 = require("../database/models/NotificationModel");
const UserModel_1 = require("../database/models/UserModel");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
const loanAmortization_1 = require("../utils/loanAmortization");
const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
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
    const { id, forfeit } = req.params;
    const loans = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: {
            loanId: id,
        },
        order: [
            ['dueDate', 'ASC'],
            ['id', 'ASC'] // Ordena por ID como critério secundário
        ],
    });
    const installments = (0, calculateLateAmount_1.installmentPanification)(loans, parseFloat(forfeit));
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
    let { accountNumber, companyId, amount, numberOfInstallments, interestRate, administrativeFee, creditManager, loanDescription, capacityExcessObservation, dateCreated, status, } = req.body;
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
    const loan = yield LoanModel_1.LoanModel.create({
        accountNumber,
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
    var _a, _b, _c, _d;
    const { id } = req.params;
    // Buscar o empréstimo antes de atualizar para verificar mudança de status
    const previousLoan = yield LoanModel_1.LoanModel.findByPk(id);
    if (previousLoan && Number(req.body.status) === 1) {
        const capacityValidation = yield validateCapacityRule({
            accountNumber: previousLoan.accountNumber,
            companyId: previousLoan.companyId,
            amount: (_a = req.body.amount) !== null && _a !== void 0 ? _a : previousLoan.amount,
            interestRate: (_b = req.body.interestRate) !== null && _b !== void 0 ? _b : previousLoan.interestRate,
            numberOfInstallments: (_c = req.body.numberOfInstallments) !== null && _c !== void 0 ? _c : previousLoan.numberOfInstallments,
            capacityExcessObservation: (_d = req.body.capacityExcessObservation) !== null && _d !== void 0 ? _d : previousLoan.capacityExcessObservation,
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
    const deleteLoan = yield LoanModel_1.LoanModel.destroy({ where: { id: id } });
    return deleteLoan != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "Loan deleted successfully.",
        }))
        : res.status(204).send(JSON.stringify({
            success: false,
            message: "There was an error deleting the loan.",
        }));
});
exports.destroyLoan = destroyLoan;
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
