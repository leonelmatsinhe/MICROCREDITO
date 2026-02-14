import { Request, Response } from "express";
import { LoanModel } from "../database/models/LoanModel";

const companyLoans = async (req: Request, res: Response) => {
    const { companyId } = req.params;

    const loans = await LoanModel.findAll({ where: { companyId }, });

    if (loans) {
        res.status(200).send({
            success: true,
            result: loans,
        });
    } else {
        res.status(204).send({
            success: false,
            message: "There was an error on the server",
        });
    }
};

export { companyLoans };
