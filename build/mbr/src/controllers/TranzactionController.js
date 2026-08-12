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
exports.checkAndLiquidateLoan = exports.updateTranzaction = exports.addTranzaction = exports.getCustomerTranzactions = exports.findPaginatedTransactions = exports.findTransactionsByCompany = exports.findAlltranzactions = void 0;
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const LoanModel_1 = require("../database/models/LoanModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const NotificationModel_1 = require("../database/models/NotificationModel");
const UserModel_1 = require("../database/models/UserModel");
const sequelize_1 = require("sequelize");
const SmsGatewayService_1 = require("../services/SmsGatewayService");
const findAlltranzactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, companyId } = req.query;
    if (!companyId) {
        return res.status(400).send({
            success: false,
            message: "companyId is required.",
        });
    }
    const whereClause = {
        companyId,
    };
    if (from && to) {
        whereClause.createdAt = {
            [sequelize_1.Op.between]: [
                new Date(`${from}T00:00:00`),
                new Date(`${to}T23:59:59`),
            ],
        };
    }
    else if (from) {
        whereClause.createdAt = {
            [sequelize_1.Op.gte]: new Date(`${from}T00:00:00`),
        };
    }
    else if (to) {
        whereClause.createdAt = {
            [sequelize_1.Op.lte]: new Date(`${to}T23:59:59`),
        };
    }
    const tranzactions = yield TranzactionModel_1.TranzactionModel.findAll({
        where: whereClause,
        order: [["id", "DESC"]],
    });
    return res.status(200).send({ success: true, result: tranzactions || [] });
});
exports.findAlltranzactions = findAlltranzactions;
const findTransactionsByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { from, to, limit } = req.query;
    const whereClause = {
        companyId: id,
    };
    if (from && to) {
        whereClause.createdAt = {
            [sequelize_1.Op.between]: [
                new Date(`${from}T00:00:00`),
                new Date(`${to}T23:59:59`),
            ],
        };
    }
    else if (from) {
        whereClause.createdAt = {
            [sequelize_1.Op.gte]: new Date(`${from}T00:00:00`),
        };
    }
    else if (to) {
        whereClause.createdAt = {
            [sequelize_1.Op.lte]: new Date(`${to}T23:59:59`),
        };
    }
    const queryOptions = {
        where: whereClause,
        order: [["id", "DESC"]],
    };
    if (limit) {
        const parsedLimit = parseInt(limit, 10);
        if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
            queryOptions.limit = parsedLimit;
        }
    }
    const tranzactions = yield TranzactionModel_1.TranzactionModel.findAll(Object.assign({}, queryOptions));
    return tranzactions.length > 0
        ? res.status(200).send({ success: true, result: tranzactions })
        : res.status(200).send({
            success: true,
            result: [],
        });
});
exports.findTransactionsByCompany = findTransactionsByCompany;
const findPaginatedTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { page = "1", limit = "15", fromDate, toDate, search, paymentMethod, creditManager, } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;
        const whereClause = { companyId: id };
        // Filtrar por gestor de crédito (buscar loanIds do gestor)
        if (creditManager) {
            const managerLoans = yield LoanModel_1.LoanModel.findAll({
                where: {
                    companyId: id,
                    creditManager: parseInt(creditManager),
                },
                attributes: ["id"],
            });
            const managerLoanIds = managerLoans.map((l) => l.id);
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
            whereClause.loanId = { [sequelize_1.Op.in]: managerLoanIds };
        }
        if (fromDate && toDate) {
            whereClause.createdAt = {
                [sequelize_1.Op.between]: [
                    new Date(`${fromDate}T00:00:00`),
                    new Date(`${toDate}T23:59:59`),
                ],
            };
        }
        else if (fromDate) {
            whereClause.createdAt = {
                [sequelize_1.Op.gte]: new Date(`${fromDate}T00:00:00`),
            };
        }
        else if (toDate) {
            whereClause.createdAt = {
                [sequelize_1.Op.lte]: new Date(`${toDate}T23:59:59`),
            };
        }
        if (paymentMethod && paymentMethod !== "0") {
            whereClause.paymentMethod = parseInt(paymentMethod);
        }
        if (search) {
            const searchTerm = `%${search}%`;
            whereClause[sequelize_1.Op.or] = [
                { accountNumber: { [sequelize_1.Op.like]: searchTerm } },
                { tranzactionReference: { [sequelize_1.Op.like]: searchTerm } },
                { staffName: { [sequelize_1.Op.like]: searchTerm } },
                { description: { [sequelize_1.Op.like]: searchTerm } },
            ];
        }
        const { count, rows } = yield TranzactionModel_1.TranzactionModel.findAndCountAll({
            where: whereClause,
            order: [["id", "DESC"]],
            limit: limitNum,
            offset,
        });
        const totalPages = Math.ceil(count / limitNum);
        // Calculate totals for the filtered dataset directly in SQL
        const totalsResult = yield TranzactionModel_1.TranzactionModel.findOne({
            where: whereClause,
            attributes: [
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), 0), "totalAmount"],
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("latePaymentInterest")), 0), "totalLateInterest"],
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("interestRateAmount")), 0), "totalInterestRate"],
            ],
            raw: true,
        });
        const totals = {
            totalAmount: Number((totalsResult === null || totalsResult === void 0 ? void 0 : totalsResult.totalAmount) || 0),
            totalLateInterest: Number((totalsResult === null || totalsResult === void 0 ? void 0 : totalsResult.totalLateInterest) || 0),
            totalInterestRate: Number((totalsResult === null || totalsResult === void 0 ? void 0 : totalsResult.totalInterestRate) || 0),
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
    }
    catch (error) {
        console.error("Erro ao buscar transacções paginadas:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao buscar transacções.",
        });
    }
});
exports.findPaginatedTransactions = findPaginatedTransactions;
const getCustomerTranzactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const tranzaction = yield TranzactionModel_1.TranzactionModel.findAll({
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
});
exports.getCustomerTranzactions = getCustomerTranzactions;
const addTranzaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { companyId, accountNumber, amortizationLoanId, amount, latePaymentInterest, interestRateAmount, phoneNumber, tranzactionReference, paymentMethod, description, receiptUrl, staffName, loanId, paymentDate, } = req.body;
    const tranzaction = yield TranzactionModel_1.TranzactionModel.create({
        companyId,
        accountNumber,
        amortizationLoanId,
        amount,
        latePaymentInterest,
        interestRateAmount,
        phoneNumber,
        tranzactionReference,
        paymentMethod,
        description,
        receiptUrl,
        staffName,
        loanId,
        paymentDate,
    });
    if (tranzaction != null) {
        const updateAmortizationLoan = yield AmortizationLoanModel_1.AmorizationLoanModel.update({
            status: 1,
        }, {
            where: {
                id: amortizationLoanId,
            },
        });
        // Notificar o cliente sobre o pagamento recebido
        try {
            const customer = yield CustomerModel_1.CustomerModel.findOne({
                where: { accountNumber },
            });
            if (customer && companyId) {
                yield NotificationModel_1.NotificationModel.create({
                    companyId,
                    recipientType: "customer",
                    recipientId: customer.id,
                    title: "Pagamento confirmado",
                    message: `O seu pagamento de ${Number(amount).toLocaleString("pt-MZ")} MZN foi registado com sucesso.`,
                    type: "payment_received",
                    referenceId: tranzaction.id,
                    isRead: false,
                });
            }
        }
        catch (err) {
            console.error("Erro ao criar notificação de pagamento:", err);
        }
        // ── Verificar se o crédito foi totalmente liquidado ──
        try {
            let effectiveLoanId = loanId;
            if (!effectiveLoanId && amortizationLoanId) {
                const amort = yield AmortizationLoanModel_1.AmorizationLoanModel.findByPk(amortizationLoanId);
                if (amort)
                    effectiveLoanId = amort.loanId;
            }
            if (effectiveLoanId) {
                yield checkAndLiquidateLoan(effectiveLoanId, companyId, accountNumber);
            }
        }
        catch (err) {
            console.error("Erro ao verificar liquidação do crédito:", err);
        }
        try {
            yield (0, SmsGatewayService_1.enqueuePaymentSms)({
                companyId: Number(companyId),
                transactionId: Number(tranzaction.id),
                loanId: loanId ? Number(loanId) : null,
                amortizationLoanId: amortizationLoanId ? Number(amortizationLoanId) : null,
                accountNumber,
                paidAmount: Number(amount),
                latePaymentInterest: Number(latePaymentInterest || 0),
                paymentDate,
                reference: tranzactionReference,
            });
        }
        catch (smsError) {
            console.error("Erro ao enfileirar SMS de pagamento:", smsError);
        }
        return updateAmortizationLoan != null
            ? res
                .status(201)
                .send({ success: true, message: "Payment updated successfully." })
            : res.status(500).send({
                success: false,
                message: "There was an error in the payment.",
            });
    }
    else {
        return res
            .status(500)
            .send({ success: false, message: "There was an error in the payment." });
    }
});
exports.addTranzaction = addTranzaction;
const updateTranzaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const tranzaction = yield TranzactionModel_1.TranzactionModel.update(req.body, {
        where: {
            id,
        },
    });
    return tranzaction != null
        ? res
            .status(201)
            .send({ success: true, message: "Payment updated successfully." })
        : res.status(500).send({ success: false, message: "Not found" });
});
exports.updateTranzaction = updateTranzaction;
/**
 * Verifica se todas as prestações de um crédito foram pagas (status = 1).
 * Se sim, actualiza o status do crédito para 3 (Liquidado) e notifica
 * o cliente, os admins e o gestor de crédito.
 */
const checkAndLiquidateLoan = (loanId, companyId, accountNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const allInstallments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: { loanId },
    });
    if (allInstallments.length === 0)
        return;
    const allPaid = allInstallments.every((inst) => Number(inst.status) === 1);
    if (!allPaid)
        return;
    // Verificar se o crédito já não está liquidado
    const loan = yield LoanModel_1.LoanModel.findByPk(loanId);
    if (!loan || Number(loan.status) === 3)
        return;
    // Actualizar status do crédito para Liquidado (3)
    yield LoanModel_1.LoanModel.update({ status: 3 }, { where: { id: loanId } });
    const loanAmount = Number(loan.amount).toLocaleString("pt-MZ");
    // Notificar o cliente
    try {
        const customer = yield CustomerModel_1.CustomerModel.findOne({
            where: { accountNumber },
        });
        if (customer) {
            yield NotificationModel_1.NotificationModel.create({
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
    }
    catch (err) {
        console.error("Erro ao notificar cliente sobre liquidação:", err);
    }
    // Notificar admins
    try {
        const admins = yield UserModel_1.UserModel.findAll({
            where: { companyId, userRole: 0 },
        });
        const bulkNotifs = [];
        for (const admin of admins) {
            bulkNotifs.push({
                companyId,
                recipientType: "admin",
                recipientId: admin.id,
                title: "Crédito liquidado",
                message: `O crédito de ${loanAmount} MZN (conta ${accountNumber}) foi totalmente liquidado.`,
                type: "payment_received",
                referenceId: loanId,
                isRead: false,
            });
        }
        if (bulkNotifs.length > 0) {
            yield NotificationModel_1.NotificationModel.bulkCreate(bulkNotifs);
        }
    }
    catch (err) {
        console.error("Erro ao notificar admins sobre liquidação:", err);
    }
    // Notificar o gestor de crédito
    try {
        if (loan.creditManager) {
            yield NotificationModel_1.NotificationModel.create({
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
    }
    catch (err) {
        console.error("Erro ao notificar gestor sobre liquidação:", err);
    }
});
exports.checkAndLiquidateLoan = checkAndLiquidateLoan;
