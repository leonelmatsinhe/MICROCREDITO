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
exports.updateLoanInstallmentDates = exports.destroyLoan = exports.updateLoan = exports.createLoan = exports.getLoanAmortization = exports.findLoanByCustomer = exports.findAllLoansOverview = exports.findAllLoans = void 0;
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const LoanModel_1 = require("../database/models/LoanModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const NotificationModel_1 = require("../database/models/NotificationModel");
const UserModel_1 = require("../database/models/UserModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const sequelize_1 = require("sequelize");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
const loanAmortization_1 = require("../utils/loanAmortization");
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
                attributes: ["accountNumber", "customerName", "customerPhone", "customerMonthlySalary"],
            }));
            customers.forEach((c) => {
                customerMap[String(c.accountNumber)] = c.toJSON ? c.toJSON() : c;
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
        const todayStr = new Date().toISOString().slice(0, 10);
        const result = loans.map((loan) => {
            var _a;
            const plain = loan.toJSON ? loan.toJSON() : loan;
            const customer = customerMap[String(loan.accountNumber)] || null;
            const txs = txByLoan[Number(loan.id)] || [];
            const amorts = amortByLoan[Number(loan.id)] || [];
            const sum = (rows, field) => rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
            const totalPaid = Math.round(sum(txs, "amount") * 100) / 100;
            const totalInterestPaid = Math.round(sum(txs, "interestRateAmount") * 100) / 100;
            const totalLateInterestPaid = Math.round(sum(txs, "latePaymentInterest") * 100) / 100;
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
            amorts.forEach((a) => {
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
                amountInDebt += remaining;
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
            return Object.assign(Object.assign({}, plain), { customerName: (customer === null || customer === void 0 ? void 0 : customer.customerName) || `Conta ${plain.accountNumber}`, customerPhone: (customer === null || customer === void 0 ? void 0 : customer.customerPhone) || "", customerMonthlySalary: (_a = customer === null || customer === void 0 ? void 0 : customer.customerMonthlySalary) !== null && _a !== void 0 ? _a : null, contractTotal,
                totalPaid,
                totalInterestPaid,
                totalLateInterestPaid,
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
