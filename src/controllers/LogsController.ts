import { Request, Response } from "express";
import { Op } from "sequelize";
import { LogsModel } from "../database/models/LogsModel";

const findAllLogs = async (req: Request, res: Response) => {
  try {
    const { from, to, companyId, limit } = req.query;
    const whereClause: any = {};

    if (companyId) {
      whereClause.companyId = companyId;
    }

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

    const queryOptions: any = {
      where: whereClause,
      order: [["createdAt", "DESC"]],
    };

    if (limit) {
      const parsedLimit = parseInt(limit as string, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        queryOptions.limit = parsedLimit;
      }
    }

    const logs = await LogsModel.findAll(queryOptions);
    return res.status(200).send({ success: true, result: logs || [] });
  } catch (error: any) {
    return res.status(500).send({
      success: false,
      message: error.message || "Erro ao buscar logs.",
    });
  }
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
  let { userId, companyId, description, userName, action, userRole, module, ipAddress } = req.body;

  const logs = await LogsModel.create({
    companyId,
    userId,
    description,
    userName,
    action,
    userRole,
    module,
    ipAddress,
  });
  return logs != null
    ? res.status(200).send({ success: true, result: "Log added successfully." })
    : res.status(204).send({
        success: false,
        result: "There was an error adding the log.",
      });
};

/**
 * Eliminar logs (apenas Admin)
 * Aceita: { ids: [1,2,3] } ou { companyId: 1, olderThan: "2024-01-01" }
 */
const deleteLogs = async (req: Request, res: Response) => {
  try {
    const { ids, companyId, olderThan } = req.body;
    let deletedCount = 0;

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Eliminar logs específicos por IDs
      const result = await LogsModel.destroy({
        where: {
          id: { [Op.in]: ids }
        }
      });
      deletedCount = result;
    } else if (companyId && olderThan) {
      // Eliminar logs anteriores a uma data
      const result = await LogsModel.destroy({
        where: {
          companyId,
          createdAt: {
            [Op.lt]: new Date(olderThan)
          }
        }
      });
      deletedCount = result;
    } else if (companyId) {
      // Eliminar todos os logs de uma empresa
      const result = await LogsModel.destroy({
        where: { companyId }
      });
      deletedCount = result;
    } else {
      return res.status(400).send({
        success: false,
        message: "Parâmetros inválidos. Envie 'ids', 'companyId' ou 'companyId' + 'olderThan'."
      });
    }

    return res.status(200).send({
      success: true,
      message: `${deletedCount} logs eliminados com sucesso.`,
      deletedCount
    });
  } catch (error: any) {
    return res.status(500).send({
      success: false,
      message: error.message || "Erro ao eliminar logs.",
    });
  }
};

export { findAllLogs, findLogsByCompany, createLog, deleteLogs };
