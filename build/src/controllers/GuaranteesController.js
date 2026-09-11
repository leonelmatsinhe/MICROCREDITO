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
const getAllLoanGuarantees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const guarantees = yield GuarateeAssessmentModel_1.GuarateeAssessmentModel.findAll({
        where: {
            loanId: id,
        },
        order: [["id", "DESC"]],
    });
    return guarantees.length > 0
        ? res.status(200).send({ success: true, result: guarantees })
        : res
            .status(200)
            .send({ success: false, message: "No guarantees registered so far." });
});
exports.getAllLoanGuarantees = getAllLoanGuarantees;
const createGuarantee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { loanId, purchaseAmount, guaranteeDescription, guaranteeFileUrl, status } = req.body;
    const newGuarantee = yield GuarateeAssessmentModel_1.GuarateeAssessmentModel.create({
        loanId,
        purchaseAmount,
        guaranteeDescription,
        guaranteeFileUrl,
        status
    });
    newGuarantee != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "A garantia foi gravada com sucesso.",
        }))
        : res.status(500).send(JSON.stringify({
            success: false,
            message: "There was an error saving the guarantee.",
        }));
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
