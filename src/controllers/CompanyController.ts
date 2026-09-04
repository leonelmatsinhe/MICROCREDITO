import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { CompanyModel } from "../database/models/CompanyModel";
import { UserModel } from "../database/models/UserModel";

// A autorização de envio de SMS (smsEnabled) só pode ser alterada pelo Admin.
const isAdminFromToken = async (req: Request): Promise<boolean> => {
  const token = String(req.headers.authorization || "").split(" ")[1] || "";
  try {
    const decoded: any = jwt.verify(token, process.env.APP_SECRET + "");
    const user: any = await UserModel.findByPk(decoded?.id, {
      attributes: ["id", "userRole"],
    });
    return Number(user?.getDataValue?.("userRole")) === 1;
  } catch (error) {
    return false;
  }
};

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

  // smsEnabled (autorizar/desactivar envio de SMS) — operação exclusiva do Admin
  if (Object.prototype.hasOwnProperty.call(req.body, "smsEnabled")) {
    const isAdmin = await isAdminFromToken(req);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Apenas o Administrador pode alterar a autorização de envio de SMS.",
      });
    }
  }

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
