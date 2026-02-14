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
exports.destroyLoan = exports.updateLoan = exports.createLoan = exports.getLoanAmortization = exports.findLoanByCustomer = exports.findAllLoans = void 0;
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const LoanModel_1 = require("../database/models/LoanModel");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
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
    const credits = yield LoanModel_1.LoanModel.findAll({
        where: {
            companyId: {
                companyId
            },
            dateCreated: {
                id
            }
        },
        order: [["id", "DESC"]],
    });
    return credits != null
        ? res.status(200).send({ success: true, result: credits })
        : res.status(204).send({
            success: false,
            message: "No loans registered so far.",
        });
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
    let { accountNumber, companyId, amount, numberOfInstallments, interestRate, creditManager, loanDescription, dateCreated, status, } = req.body;
    const loan = yield LoanModel_1.LoanModel.create({
        accountNumber,
        companyId,
        amount,
        numberOfInstallments,
        interestRate,
        creditManager,
        loanDescription,
        dateCreated,
        status,
    });
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
    const { id } = req.params;
    const loan = yield LoanModel_1.LoanModel.update(req.body, {
        where: {
            id,
        },
    });
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
