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
exports.updateTranzaction = exports.addTranzaction = exports.getCustomerTranzactions = exports.findTransactionsByCompany = exports.findAlltranzactions = void 0;
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const NotificationModel_1 = require("../database/models/NotificationModel");
const findAlltranzactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, companyId } = req.query;
    const tranzactions = yield TranzactionModel_1.TranzactionModel.findAll({
        where: {
            companyId
        },
    });
    return tranzactions.length > 0
        ? res.status(200).send({ success: true, result: tranzactions })
        : res.status(204).send({
            success: false,
            message: "No transactions registered so far.",
        });
});
exports.findAlltranzactions = findAlltranzactions;
const findTransactionsByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const tranzactions = yield TranzactionModel_1.TranzactionModel.findAll({
        where: {
            companyId: id
        },
        order: [["id", "DESC"]],
    });
    return tranzactions.length > 0
        ? res.status(200).send({ success: true, result: tranzactions })
        : res.status(200).send({
            success: true,
            result: [],
        });
});
exports.findTransactionsByCompany = findTransactionsByCompany;
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
        } catch (err) {
            console.error("Erro ao criar notificação de pagamento:", err);
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
