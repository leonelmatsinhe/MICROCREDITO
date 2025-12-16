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
  const { id } = req.params;
  const lgos = await LogsModel.findAll({
    where: {
      companyId: id,
    },
  });

  return lgos != null
    ? res.status(200).send({ success: true, result: lgos })
    : res.status(204).send({
        success: false,
        result: "No logs found with the userId provided",
      });
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
