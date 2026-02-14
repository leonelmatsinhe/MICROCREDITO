import { Request, Response } from "express";
import { InterestRateModel } from "../database/models/InterestRateModel";

const findAllInterestRates = async (req: Request, res: Response) => {
  const rates = await InterestRateModel.findAll();
  return rates.length != null
    ? res.status(200).send({ success: true, result: rates })
    : res.status(204).send({
        success: false,
        message: "No rates registered so far.",
      });
};

const findInterestRateByCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  const interest = await InterestRateModel.findAll({
    where: {
      companyId: id,
    },
    order: [["id", "DESC"]],
  });
  return interest != null
    ? res.status(200).send({ success: true, result: interest })
    : res.status(204).send({
        success: false,
        result: "No rates found with the ID provided",
      });
};

const createRate = async (req: Request, res: Response) => {
  let { name, tax, administrativeFee, companyId } = req.body;

  const rates = await InterestRateModel.create({
    companyId,
    name,
    tax,
    administrativeFee,
  });
  return rates != null
    ? res
        .status(200)
        .send({ success: true, result: "Interest rate created successfully." })
    : res.status(204).send({
        success: false,
        result: "There was an error creating the rate.",
      });
};

const updateRate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const rate = await InterestRateModel.update(req.body, {
    where: {
      id,
    },
  });
  return rate != null
    ? res
        .status(200)
        .json({ success: true, message: "Rate updated successfully" })
    : res.status(204).json({
        success: true,
        message: "There was an error updating the rate.",
      });
};

const destroyRate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleteRate = await InterestRateModel.destroy({ where: { id: id } });

  return deleteRate != null
    ? res.status(201).send(
        JSON.stringify({
          success: true,
          message: "Interest rate deleted successfully.",
        })
      )
    : res.status(204).send(
        JSON.stringify({
          success: false,
          message: "There was an error deleting this rate.",
        })
      );
};

export {
  findAllInterestRates,
  findInterestRateByCompany,
  createRate,
  updateRate,
  destroyRate,
};
