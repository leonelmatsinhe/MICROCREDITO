import { Request, Response } from "express";
import { ProvinceModel } from "../database/models/ProvinceModel";
import { DistrictModel } from "../database/models/DistrictModel";

const findAllProvinces = async (req: Request, res: Response) => {
  const provinces = await ProvinceModel.findAll({
    order: [["id", "ASC"]],
  });
  return provinces.length > 0
    ? res.status(200).send({ success: true, result: provinces })
    : res.status(204).send({
        success: false,
        message: "No provinces registered so far.",
      });
};

const findAllDistricts = async (req: Request, res: Response) => {
  // Suporta ?provinceId=N para autopopular distritos ao seleccionar uma província
  const { provinceId } = req.query;
  const where = provinceId ? { provinceId: Number(provinceId) } : {};
  const districts = await DistrictModel.findAll({
    where,
    order: [["name", "ASC"]],
  });
  return districts
    ? res.status(200).send({ success: true, result: districts })
    : res.status(204).send({
        success: false,
        result: "No districts found with the ID provided",
      });
};

export { findAllProvinces, findAllDistricts };
