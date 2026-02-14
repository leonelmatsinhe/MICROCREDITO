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
exports.updateTranzaction = exports.addTranzaction = exports.getCustomerTranzactions = exports.findAlltranzactions = void 0;
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const sequelize_1 = require("sequelize");
const findAlltranzactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, companyId } = req.query;
    const tranzactions = yield TranzactionModel_1.TranzactionModel.findAll({
        where: {
            createdAt: {
                [sequelize_1.Op.between]: [from, to],
            },
            companyId: companyId,
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
    let { companyId, accountNumber, amortizationLoanId, amount, phoneNumber, tranzactionReference, paymentMethod, description, staffName, } = req.body;
    const tranzaction = yield TranzactionModel_1.TranzactionModel.create({
        companyId,
        accountNumber,
        amortizationLoanId,
        amount,
        phoneNumber,
        tranzactionReference,
        paymentMethod,
        description,
        staffName,
    });
    if (tranzaction != null) {
        const updateAmortizationLoan = yield AmortizationLoanModel_1.AmorizationLoanModel.update({
            status: 1,
        }, {
            where: {
                id: amortizationLoanId,
            },
        });
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
