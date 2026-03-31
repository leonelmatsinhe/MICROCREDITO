import { Request, Response } from "express";
import { DebtModel } from "../database/models/DebtModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { enqueueLateInterestSms } from "../services/SmsGatewayService";

const findAllDebts = async (req: Request, res: Response) => {
    const { id } = req.params;
    const debt = await DebtModel.findAll({
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
};

const createDebt = async (req: Request, res: Response) => {
    let { loanId, amortisationId, accountNumber, updatedBy, companyId, debtAmount, dateInserted } = req.body;

    const newDebt = await DebtModel.create({
        companyId,
        loanId,
        amortisationId,
        accountNumber,
        updatedBy,
        debtAmount,
        dateInserted
    });

    if (newDebt != null) {
        const updateAmortizationLoan = await AmorizationLoanModel.update(
            {
                status: -1,
            },
            {
                where: {
                    id: amortisationId,
                },
            }
        );

        try {
            const amortization: any = amortisationId
                ? await AmorizationLoanModel.findByPk(amortisationId, {
                    attributes: ["id", "dueDate"],
                })
                : null;

            await enqueueLateInterestSms({
                companyId: Number(companyId),
                debtId: Number((newDebt as any).id),
                loanId: loanId ? Number(loanId) : null,
                amortizationLoanId: amortisationId ? Number(amortisationId) : null,
                accountNumber,
                debtAmount: Number(debtAmount || 0),
                dueDate: amortization?.dueDate || null,
            });
        } catch (smsError) {
            console.error("Erro ao enfileirar SMS de juros de mora:", smsError);
        }

        return updateAmortizationLoan != null
            ? res
                .status(201)
                .send({ success: true, message: "Payment updated successfully." })
            : res.status(500).send({
                success: false,
                message: "There was an error in the payment.",
            });
    };
}

const updateDebt = async (req: Request, res: Response) => {
    const { id } = req.params;

    const update = await DebtModel.update(req.body, {
        where: {
            id,
        },
    });

    if (update != null) {
        res.json({
            success: true,
            message: "Debt updated successfully",
        })
    } else {
        return res.status(500).send(
            JSON.stringify({
                success: false,
                message: "There was an error updating the account.",
            })
        );
    }
};

const deleteDebtp = async (req: Request, res: Response) => {
    const { id } = req.params;

    const deleteDebt = await DebtModel.destroy({ where: { id } });

    return deleteDebt != null
        ? res.status(201).send(
            JSON.stringify({
                success: true,
                message: "Debt deleted successfully.",
            })
        )
        : res.status(500).send(
            JSON.stringify({
                success: false,
                message: "There was an error deleting this Debt.",
            })
        );
};

export {
    findAllDebts,
    createDebt,
    updateDebt,
    deleteDebtp,
};
