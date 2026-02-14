import { Request, Response } from "express";
import { GuarateeAssessmentModel } from "../database/models/GuarateeAssessmentModel";

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
    const { id } = req.params;

    const deleteGuarantee = await GuarateeAssessmentModel.destroy({ where: { id: id } });

    return deleteGuarantee != null
        ? res.status(201).send(
            JSON.stringify({
                success: true,
                message: "Guarantee deleted successfully.",
            })
        )
        : res.status(500).send(
            JSON.stringify({
                success: false,
                message: "There was an error deleting this guarantee.",
            })
        );
};

export {
    getAllLoanGuarantees,
    createGuarantee,
    deleteGuarantee,
};
