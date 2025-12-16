import { Request, Response } from "express";
import { CompanyModel } from "../database/models/CompanyModel";

const findAllCompanies = async (req: Request, res: Response) => {
  const companies = await CompanyModel.findAll({
    order: [["companyName", "DESC"]],
  });
  return companies.length > 0
    ? res.status(200).send(JSON.stringify({ success: true, result: companies }))
    : res.status(204).send(
        JSON.stringify({
          success: false,
          message: "No companies registered so far.",
        })
      );
};

const findOneCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  const company = await CompanyModel.findOne({
    where: {
      id,
    },
  });
  return company
    ? res.status(200).send(JSON.stringify({ success: true, result: company }))
    : res.status(204).send(
        JSON.stringify({
          success: false,
          message: "No company found with the ID provided",
        })
      );
};

const createCompany = async (req: Request, res: Response) => {
  let {
    companyName,
    companyEmail,
    companyWebsite,
    companyManager,
    smsSender,
    companyNuit,
    companyPhone,
    districtId,
    provinceId,
    companyLogo,
    forfeit,
    companyAddress,
    companyStatus,
  } = req.body;

  const company = await CompanyModel.create({
    companyName,
    companyEmail,
    companyWebsite,
    companyManager,
    smsSender,
    companyNuit,
    companyPhone,
    districtId,
    provinceId,
    companyLogo,
    forfeit,
    companyAddress,
    companyStatus,
  });
  return company != null
    ? res.status(201).send(
        JSON.stringify({
          success: true,
          message: "Company created successfully.",
        })
      )
    : res.status(500).json({
        success: false,
        message: "Company was not created successfully",
      });
};

const updateCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  const company = await CompanyModel.update(req.body, {
    where: {
      id,
    },
  });
  return company != null
    ? res.status(200).json({
        success: true,
        message: "Company updated successfully",
      })
    : res.status(400).json({
        success: false,
        message: "There was an error updating the company.",
      });
};

export { findAllCompanies, findOneCompany, createCompany, updateCompany };
