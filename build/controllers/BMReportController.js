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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBMReport = void 0;
const sequelize_1 = require("sequelize");
const moment_1 = __importDefault(require("moment"));
const CompanyModel_1 = require("../database/models/CompanyModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const LoanModel_1 = require("../database/models/LoanModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
function formatDateBR(date) {
    if (!date)
        return "-";
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}
/**
 * GET /api/reports/banco-mocambique/:companyId
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
 *
 * Gera dados para o relatório obrigatório do Banco de Moçambique
 */
const getBMReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const { from, to } = req.query;
        const companyIdNum = parseInt(String(companyId), 10);
        if (Number.isNaN(companyIdNum) || companyIdNum <= 0) {
            return res.status(400).json({ success: false, message: "companyId inválido." });
        }
        // 1. Buscar dados da empresa
        const company = yield CompanyModel_1.CompanyModel.findByPk(companyIdNum);
        if (!company) {
            return res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
        const companyData = company.toJSON();
        // 2. Buscar província
        let provinceName = "";
        try {
            const { ProvinceModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/ProvinceModel")));
            const province = yield ProvinceModel.findByPk(companyData.provinceId);
            if (province) {
                provinceName = province.toJSON().name || "";
            }
        }
        catch (_a) { }
        // 3. Buscar créditos do período
        const loanWhere = { companyId: companyIdNum };
        // Filtrar por período se especificado (data de desembolso)
        if (from && to) {
            loanWhere.dateCreated = {
                [sequelize_1.Op.between]: [String(from), String(to)],
            };
        }
        else if (from) {
            loanWhere.dateCreated = { [sequelize_1.Op.gte]: String(from) };
        }
        else if (to) {
            loanWhere.dateCreated = { [sequelize_1.Op.lte]: String(to) };
        }
        const loans = yield LoanModel_1.LoanModel.findAll({
            where: loanWhere,
            order: [["id", "ASC"]],
        });
        // 4. Para cada crédito, buscar cliente, amortizações e transações
        const reportData = [];
        for (const loan of loans) {
            const loanData = loan.toJSON();
            // Buscar cliente
            const customer = yield CustomerModel_1.CustomerModel.findOne({
                where: {
                    companyId: companyIdNum,
                    accountNumber: loanData.accountNumber,
                },
            });
            const customerData = customer ? customer.toJSON() : null;
            // Buscar amortizações do crédito
            const amortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
                where: {
                    companyId: companyIdNum,
                    loanId: loanData.id,
                },
                order: [["installmentOrder", "ASC"]],
            });
            const amortList = amortizations.map((a) => a.toJSON());
            // Buscar transações reais do crédito
            const transactions = yield TranzactionModel_1.TranzactionModel.findAll({
                where: {
                    companyId: companyIdNum,
                    loanId: loanData.id,
                },
            });
            const txList = transactions.map((t) => t.toJSON());
            // Primeira prestação (para valor da prestação)
            const firstInstallment = amortList[0];
            // Última prestação (para prazo de reembolso)
            const lastInstallment = amortList[amortList.length - 1];
            // Prestações em atraso (status = 0 e data vencida)
            const now = (0, moment_1.default)();
            const overdueInstallments = amortList.filter((a) => {
                if (Number(a.status) !== 0)
                    return false;
                const dueDate = (0, moment_1.default)(a.dueDate);
                return dueDate.isBefore(now, "day");
            });
            // Crédito em Atraso (11): soma das prestações vencidas + juros de mora
            const overdueAmount = overdueInstallments.reduce((sum, a) => sum + (Number(a.installment) || 0) + (Number(a.latePaymentInterest) || 0), 0);
            // Máximo dias em atraso
            const maxDaysOverdue = overdueInstallments.reduce((max, a) => {
                const days = now.diff((0, moment_1.default)(a.dueDate), "days");
                return days > max ? days : max;
            }, 0);
            // =====================================================
            // CRÉDITO EM DÍVIDA (10):
            // Total (capital + juros) - valor total já liquidado
            // =====================================================
            // Total do crédito = soma de todas as prestações (capital + juros)
            const totalLoanWithInterest = amortList.reduce((sum, a) => sum + (Number(a.installment) || 0), 0);
            // Total já pago = soma dos valores das transações (amount = valor efectivamente pago)
            const totalPaid = txList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            // Crédito em dívida = Total - Pago
            const creditInDebt = Math.max(0, Math.round((totalLoanWithInterest - totalPaid) * 100) / 100);
            reportData.push({
                // (1) N° da Operação
                operationNumber: loanData.id,
                // (2) Nome do Cliente
                customerName: (customerData === null || customerData === void 0 ? void 0 : customerData.customerName) || "-",
                // (3) Data Desembolso
                disbursementDate: formatDateBR(loanData.dateCreated),
                // (4) Montante do Desembolso
                disbursementAmount: Number(loanData.amount) || 0,
                // (5) Finalidade do Crédito
                creditPurpose: loanData.loanDescription || "-",
                // (6) Valor da Prestação
                installmentValue: firstInstallment ? Number(firstInstallment.installment) || 0 : 0,
                // (7) Periodicidade dos Pagamentos
                paymentFrequency: "Mensal",
                // (8) Prazo de Reembolso
                repaymentDate: lastInstallment ? formatDateBR(lastInstallment.dueDate) : "-",
                // (9) Taxa de Juro
                interestRate: Number(loanData.interestRate) * 100,
                // (10) Crédito em Dívida = Total (capital+juros) - Total pago
                creditInDebt: creditInDebt,
                // (11) Crédito em Atraso
                creditOverdue: Math.round(overdueAmount * 100) / 100,
                // (12) Dias em Atraso
                daysOverdue: maxDaysOverdue,
                // (13) PPEs
                ppe: (customerData === null || customerData === void 0 ? void 0 : customerData.customerPPE) === 1 ? "Sim" : "Não",
                // Extras para display
                status: loanData.status,
            });
        }
        // 5. Calcular totais
        const totals = {
            disbursementAmount: reportData.reduce((sum, r) => sum + r.disbursementAmount, 0),
            installmentValue: reportData.reduce((sum, r) => sum + r.installmentValue, 0),
            creditInDebt: reportData.reduce((sum, r) => sum + r.creditInDebt, 0),
            creditOverdue: reportData.reduce((sum, r) => sum + r.creditOverdue, 0),
        };
        return res.status(200).json({
            success: true,
            company: {
                name: companyData.companyName || "",
                address: companyData.companyAddress || "",
                province: provinceName,
                phone: companyData.companyPhone || "",
                email: companyData.companyEmail || "",
                nuit: companyData.companyNuit || "",
                manager: companyData.companyManager || "",
            },
            reportData,
            totals,
            period: {
                from: from ? String(from) : null,
                to: to ? String(to) : null,
            },
        });
    }
    catch (error) {
        console.error("Erro ao gerar relatório BM:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao gerar relatório.",
        });
    }
});
exports.getBMReport = getBMReport;
