import { Request, Response } from "express";
import { GuarateeAssessmentModel } from "../database/models/GuarateeAssessmentModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { LoanModel } from "../database/models/LoanModel";
import { getGuaranteeCoverage } from "../services/guaranteeCoverageService";

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const getAllLoanGuarantees = async (req: Request, res: Response) => {
    const { id } = req.params;
    const guarantees = await GuarateeAssessmentModel.findAll({
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
};

const createGuarantee = async (req: Request, res: Response) => {
    let { loanId, purchaseAmount, guaranteeDescription, guaranteeFileUrl, status } = req.body;

    const newGuarantee = await GuarateeAssessmentModel.create({
        loanId,
        purchaseAmount,
        guaranteeDescription,
        guaranteeFileUrl,
        status
    });

    newGuarantee != null
        ? res.status(201).send(
            JSON.stringify({
                success: true,
                message: "A garantia foi gravada com sucesso.",
            })
        )
        : res.status(500).send(
            JSON.stringify({
                success: false,
                message: "There was an error saving the guarantee.",
            })
        );
};

const deleteGuarantee = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const guarantee: any = await GuarateeAssessmentModel.findByPk(id);
        if (!guarantee) {
            return res.status(404).json({ success: false, message: "Garantia não encontrada." });
        }

        // Verificar se existe algum pagamento/transacção associado ao crédito
        // ao qual esta garantia pertence.
        const loanId = guarantee.getDataValue("loanId");
        if (loanId) {
            const transactionCount = await TranzactionModel.count({
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
            const loan: any = await LoanModel.findByPk(loanId);
            if (loan && Number(loan.getDataValue("status")) === 1) {
                const coverage = await getGuaranteeCoverage({ loan });
                const guaranteeAmount = Number(guarantee.getDataValue("purchaseAmount")) || 0;
                const remainingTotal = round2(coverage.guaranteesTotal - guaranteeAmount);
                if (remainingTotal + 0.005 < coverage.requiredTotal) {
                    const fmt = (v: number) =>
                        v.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    return res.status(409).json({
                        success: false,
                        error: "GARANTIAS_INSUFICIENTES",
                        message: `Não é possível eliminar esta garantia: as garantias restantes (${fmt(remainingTotal)} MZN) ficariam abaixo do total a pagar do crédito (${fmt(coverage.requiredTotal)} MZN). Registe outra garantia antes de eliminar esta.`,
                    });
                }
            }
        }

        const deleted = await GuarateeAssessmentModel.destroy({ where: { id: id } });

        return deleted != null
            ? res.status(200).json({
                success: true,
                message: "Garantia eliminada com sucesso.",
            })
            : res.status(500).json({
                success: false,
                message: "Não foi possível eliminar a garantia.",
            });
    } catch (error: any) {
        console.error("Erro ao eliminar garantia:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro ao eliminar a garantia.",
        });
    }
};

export {
    getAllLoanGuarantees,
    createGuarantee,
    deleteGuarantee,
};
