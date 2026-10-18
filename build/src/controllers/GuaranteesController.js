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
exports.deleteGuarantee = exports.createGuarantee = exports.getAllLoanGuarantees = void 0;
const GuarateeAssessmentModel_1 = require("../database/models/GuarateeAssessmentModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const LoanModel_1 = require("../database/models/LoanModel");
const guaranteeCoverageService_1 = require("../services/guaranteeCoverageService");
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const getAllLoanGuarantees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const guarantees = yield GuarateeAssessmentModel_1.GuarateeAssessmentModel.findAll({
        where: {
            loanId: id,
        },
        order: [["id", "DESC"]],
    });
    // Lista vazia é um estado legítimo (crédito ainda sem garantias) — não é
    // erro. A UI usa `result: []` para mostrar o aviso de cadastro obrigatório.
    return res.status(200).send({ success: true, result: guarantees });
});
exports.getAllLoanGuarantees = getAllLoanGuarantees;
/**
 * CADASTRO DE GARANTIAS — BASE INICIAL DE ANÁLISE.
 *
 * Uma garantia sem valor avaliado não serve para a análise e fazia o crédito
 * parecer "com garantias" continuando sem cobertura. Por isso o valor (> 0) e
 * a descrição passam a ser OBRIGATÓRIOS, e o crédito tem de existir.
 * A resposta devolve a cobertura já recalculada (a UI actualiza o aviso).
 */
const createGuarantee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const loanId = Number((_a = req.body) === null || _a === void 0 ? void 0 : _a.loanId);
        if (!Number.isFinite(loanId) || loanId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Indique o crédito a que a garantia pertence.",
            });
        }
        // Aceita "150 000,00" (formato português) e 150000.00.
        const rawAmount = (_b = req.body) === null || _b === void 0 ? void 0 : _b.purchaseAmount;
        const normalizado = typeof rawAmount === "string"
            ? rawAmount.replace(/\s/g, "").replace(",", ".")
            : rawAmount;
        const purchaseAmount = Number(normalizado);
        if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "O valor avaliado da garantia é obrigatório e tem de ser maior que zero " +
                    "(é a base da análise de cobertura do crédito).",
            });
        }
        const guaranteeDescription = String(((_c = req.body) === null || _c === void 0 ? void 0 : _c.guaranteeDescription) || "").trim();
        if (!guaranteeDescription) {
            return res.status(400).json({
                success: false,
                message: "Descreva a garantia (ex.: viatura, imóvel, aval).",
            });
        }
        const loan = yield LoanModel_1.LoanModel.findByPk(loanId);
        if (!loan) {
            return res.status(404).json({
                success: false,
                message: "Crédito não encontrado para associar a garantia.",
            });
        }
        const statusRaw = Number((_d = req.body) === null || _d === void 0 ? void 0 : _d.status);
        const newGuarantee = yield GuarateeAssessmentModel_1.GuarateeAssessmentModel.create({
            loanId,
            purchaseAmount: round2(purchaseAmount),
            guaranteeDescription,
            guaranteeFileUrl: ((_e = req.body) === null || _e === void 0 ? void 0 : _e.guaranteeFileUrl) || null,
            status: statusRaw === 1 ? 1 : 0,
        });
        const coverage = yield (0, guaranteeCoverageService_1.getGuaranteeCoverage)({ loan });
        return res.status(201).json({
            success: true,
            message: "A garantia foi gravada com sucesso.",
            result: newGuarantee,
            coverage,
        });
    }
    catch (error) {
        console.error("Erro ao gravar garantia:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({
            success: false,
            message: "Não foi possível gravar a garantia.",
        });
    }
});
exports.createGuarantee = createGuarantee;
const deleteGuarantee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const guarantee = yield GuarateeAssessmentModel_1.GuarateeAssessmentModel.findByPk(id);
        if (!guarantee) {
            return res.status(404).json({ success: false, message: "Garantia não encontrada." });
        }
        // Verificar se existe algum pagamento/transacção associado ao crédito
        // ao qual esta garantia pertence.
        const loanId = guarantee.getDataValue("loanId");
        if (loanId) {
            const transactionCount = yield TranzactionModel_1.TranzactionModel.count({
                where: { loanId },
            });
            if (transactionCount > 0) {
                return res.status(409).json({
                    success: false,
                    message: `Não é possível eliminar esta garantia porque o crédito associado tem ${transactionCount} pagamento(s)/transacção(ões). Remova primeiro os pagamentos.`,
                });
            }
            // ── COBERTURA MÍNIMA: crédito activo (status 1) não pode ficar
            // com garantias abaixo do total a pagar (capital + juros) ──
            const loan = yield LoanModel_1.LoanModel.findByPk(loanId);
            if (loan && Number(loan.getDataValue("status")) === 1) {
                const coverage = yield (0, guaranteeCoverageService_1.getGuaranteeCoverage)({ loan });
                const guaranteeAmount = Number(guarantee.getDataValue("purchaseAmount")) || 0;
                const remainingTotal = round2(coverage.guaranteesTotal - guaranteeAmount);
                if (remainingTotal + 0.005 < coverage.requiredTotal) {
                    const fmt = (v) => v.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    return res.status(409).json({
                        success: false,
                        error: "GARANTIAS_INSUFICIENTES",
                        message: `Não é possível eliminar esta garantia: as garantias restantes (${fmt(remainingTotal)} MZN) ficariam abaixo do total a pagar do crédito (${fmt(coverage.requiredTotal)} MZN). Registe outra garantia antes de eliminar esta.`,
                    });
                }
            }
        }
        const deleted = yield GuarateeAssessmentModel_1.GuarateeAssessmentModel.destroy({ where: { id: id } });
        return deleted != null
            ? res.status(200).json({
                success: true,
                message: "Garantia eliminada com sucesso.",
            })
            : res.status(500).json({
                success: false,
                message: "Não foi possível eliminar a garantia.",
            });
    }
    catch (error) {
        console.error("Erro ao eliminar garantia:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro ao eliminar a garantia.",
        });
    }
});
exports.deleteGuarantee = deleteGuarantee;
