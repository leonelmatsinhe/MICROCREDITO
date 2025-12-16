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
exports.deleteDebtp = exports.updateDebt = exports.createDebt = exports.findAllDebts = void 0;
const DebtModel_1 = require("../database/models/DebtModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const findAllDebts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const debt = yield DebtModel_1.DebtModel.findAll({
        where: {
            loanId: id,
        },
    });
    return debt != null
        ? res.status(200).send({ success: true, result: debt })
        : res.status(204).send({
            success: false,
            result: "No debt found with the ID provided",
        });
});
exports.findAllDebts = findAllDebts;
const createDebt = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { loanId, amortisationId, accountNumber, updatedBy, companyId, debtAmount, dateInserted } = req.body;
    const newDebt = yield DebtModel_1.DebtModel.create({
        companyId,
        loanId,
        amortisationId,
        accountNumber,
        updatedBy,
        debtAmount,
        dateInserted
    });
    if (newDebt != null) {
        const updateAmortizationLoan = yield AmortizationLoanModel_1.AmorizationLoanModel.update({
            status: -1,
        }, {
            where: {
                id: amortisationId,
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
    ;
});
exports.createDebt = createDebt;
const updateDebt = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const update = yield DebtModel_1.DebtModel.update(req.body, {
        where: {
            id,
        },
    });
    if (update != null) {
        res.json({
            success: true,
            message: "Debt updated successfully",
        });
    }
    else {
        return res.status(500).send(JSON.stringify({
            success: false,
            message: "There was an error updating the account.",
        }));
    }
});
exports.updateDebt = updateDebt;
const deleteDebtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const deleteDebt = yield DebtModel_1.DebtModel.destroy({ where: { id } });
    return deleteDebt != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "Debt deleted successfully.",
        }))
        : res.status(500).send(JSON.stringify({
            success: false,
            message: "There was an error deleting this Debt.",
        }));
});
exports.deleteDebtp = deleteDebtp;
