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
exports.createAmortizationLoan = exports.getPastAmortizations = exports.getUpcomingAmortizations = void 0;
const moment_1 = __importDefault(require("moment"));
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const sequelize_1 = require("sequelize");
const loanAmortization_1 = require("../utils/loanAmortization");
const LoanModel_1 = require("../database/models/LoanModel");
const endOfMonth = (0, moment_1.default)().format("YYYY-MM-") + (0, moment_1.default)().daysInMonth();
// 2022-10-28 17:41:11
const today = (0, moment_1.default)().format("YYYY-MM-DD HH:mm:ss");
const thirtyDaysBefore = (0, moment_1.default)().subtract(30, "days").toDate();
const getUpcomingAmortizations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const loans = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: {
            dueDate: {
                [sequelize_1.Op.between]: [today, endOfMonth],
            },
            companyId: id,
        },
    });
    return loans != null
        ? res.status(200).send({ success: true, result: loans })
        : res.status(204).send({
            success: false,
            result: "No loan found with the account number you provided",
        });
});
exports.getUpcomingAmortizations = getUpcomingAmortizations;
const getPastAmortizations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const pastAmortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: {
            dueDate: {
                [sequelize_1.Op.lt]: today,
                // [Op.gt]: thirtyDaysBefore,
            },
            companyId: id,
        },
    });
    return pastAmortizations != null
        ? res.status(200).send({ success: true, result: pastAmortizations })
        : res.status(204).send({
            success: false,
            result: "No loan found with the account number you provided",
        });
});
exports.getPastAmortizations = getPastAmortizations;
const createAmortizationLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const bulckInsert = yield AmortizationLoanModel_1.AmorizationLoanModel.bulkCreate(customerAmortizationPlan);
        // Atualiza o status do empréstimo
        yield LoanModel_1.LoanModel.update({ status: 1 }, {
            where: {
                id: loanId
            }
        });
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
