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

    // Lista vazia é um estado legítimo (crédito ainda sem garantias) — não é
    // erro. A UI usa `result: []` para mostrar o aviso de cadastro obrigatório.
    return res.status(200).send({ success: true, result: guarantees });
};

/**
 * CADASTRO DE GARANTIAS — BASE INICIAL DE ANÁLISE.
 *
 * Uma garantia sem valor avaliado não serve para a análise e fazia o crédito
 * parecer "com garantias" continuando sem cobertura. Por isso o valor (> 0) e
 * a descrição passam a ser OBRIGATÓRIOS, e o crédito tem de existir.
 * A resposta devolve a cobertura já recalculada (a UI actualiza o aviso).
 */
const createGuarantee = async (req: Request, res: Response) => {
    try {
        const loanId = Number((req.body as any)?.loanId);
        if (!Number.isFinite(loanId) || loanId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Indique o crédito a que a garantia pertence.",
            });
        }

        // Aceita "150 000,00" (formato português) e 150000.00.
        const rawAmount = (req.body as any)?.purchaseAmount;
        const normalizado = typeof rawAmount === "string"
            ? rawAmount.replace(/\s/g, "").replace(",", ".")
            : rawAmount;
        const purchaseAmount = Number(normalizado);
        if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
            return res.status(400).json({
                success: false,
                message:
                    "O valor avaliado da garantia é obrigatório e tem de ser maior que zero " +
                    "(é a base da análise de cobertura do crédito).",
            });
        }

        const guaranteeDescription = String((req.body as any)?.guaranteeDescription || "").trim();
        if (!guaranteeDescription) {
            return res.status(400).json({
                success: false,
                message: "Descreva a garantia (ex.: viatura, imóvel, aval).",
            });
        }

        const loan: any = await LoanModel.findByPk(loanId);
        if (!loan) {
            return res.status(404).json({
                success: false,
                message: "Crédito não encontrado para associar a garantia.",
            });
        }

        const statusRaw = Number((req.body as any)?.status);
        const newGuarantee = await GuarateeAssessmentModel.create({
            loanId,
            purchaseAmount: round2(purchaseAmount),
            guaranteeDescription,
            guaranteeFileUrl: (req.body as any)?.guaranteeFileUrl || null,
            status: statusRaw === 1 ? 1 : 0,
        });

        const coverage = await getGuaranteeCoverage({ loan });

        return res.status(201).json({
            success: true,
            message: "A garantia foi gravada com sucesso.",
            result: newGuarantee,
            coverage,
        });
    } catch (error: any) {
        console.error("Erro ao gravar garantia:", error?.message || error);
        return res.status(500).json({
            success: false,
            message: "Não foi possível gravar a garantia.",
        });
    }
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
