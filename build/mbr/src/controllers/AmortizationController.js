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
const DebtModel_1 = require("../database/models/DebtModel");
const CustomerDocumentsModel_1 = require("../database/models/CustomerDocumentsModel");
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
        const MIN_DOCUMENTS_FOR_APPROVAL = 3;
        const customerDocuments = yield CustomerDocumentsModel_1.CustomerDocumentsModel.findAll({
            where: { accountNumber }
        });
        if (!customerDocuments || customerDocuments.length < MIN_DOCUMENTS_FOR_APPROVAL) {
            return res.status(400).json({
                success: false,
                message: `O mutuário deve ter pelo menos ${MIN_DOCUMENTS_FOR_APPROVAL} documentos submetidos para aprovação do crédito. Actualmente possui ${customerDocuments ? customerDocuments.length : 0} documento(s).`,
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
