import { Request, Response } from "express";
import { Op } from "sequelize";
import { LogsModel } from "../database/models/LogsModel";

const findAllLogs = async (req: Request, res: Response) => {
  const { from, to, companyId } = req.query;
  console.log(from, to, companyId)

  const logs = await LogsModel.findAll({
    where: {
      createdAt: {
        [Op.between]: [from, to],
      },
      companyId: companyId,
    },
  });

  return logs.length != null
    ? res.status(200).send({ success: true, result: logs })
    : res.status(204).send({
        success: false,
        message: "No logs registered so far.",
      });
};

const findLogsByCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const whereClause: any = { companyId: id };

    if (from && to) {
      whereClause.createdAt = {
        [Op.between]: [
          new Date(from as string),
          new Date((to as string) + "T23:59:59"),
        ],
      };
    } else if (from) {
      whereClause.createdAt = {
        [Op.gte]: new Date(from as string),
      };
    } else if (to) {
      whereClause.createdAt = {
        [Op.lte]: new Date((to as string) + "T23:59:59"),
      };
    }

    const logs = await LogsModel.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).send({ success: true, result: logs });
  } catch (error: any) {
    return res.status(500).send({
      success: false,
      message: error.message || "Erro ao buscar logs.",
    });
  }
};

const createLog = async (req: Request, res: Response) => {
  let { userId, companyId, description, userName, action } = req.body;

  const logs = await LogsModel.create({
    companyId,
    userId,
    description,
    userName,
    action,
  });
  return logs != null
    ? res.status(200).send({ success: true, result: "Log added successfully." })
    : res.status(204).send({
        success: false,
        result: "There was an error adding the log.",
      });
};

export { findAllLogs, findLogsByCompany, createLog };
