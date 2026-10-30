import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { UserModel } from "../database/models/UserModel";
import { getTrialBalance, getIncomeStatement } from "../services/generalLedgerService";

const resolveCompanyId = async (req: Request): Promise<number> => {
  const authed = req as any;
  let companyId = Number(authed.companyId ?? authed.user?.companyId ?? 0);
  let userId = Number(authed.userId ?? authed.user?.id ?? 0);

  if (!companyId) {
    const authHeader = req.headers.authorization || "";
    const [, token] = authHeader.split(" ");
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.APP_SECRET + "");
        userId = Number(decoded?.id) || userId;
        if (decoded?.companyId) companyId = Number(decoded.companyId);
      } catch {}
    }
  }

  if (userId && !companyId) {
    const user: any = await UserModel.findByPk(userId, { attributes: ["id", "companyId"] });
    companyId = Number(user?.getDataValue?.("companyId") ?? user?.companyId) || 0;
  }

  return companyId;
};

/**
 * GET /api/financeiro/balancete — Balancete de Verificação (PGC-Microfinanças)
 */
export const getBalancete = async (req: Request, res: Response) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Utilizador não autenticado." });
    }

    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const now = new Date();
    const start = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const report = await getTrialBalance(companyId, start, end);
    return res.status(200).json({ success: true, result: report });
  } catch (error: any) {
    console.error("[FinancialReports] Erro ao gerar Balancete:", error?.message || error);
    return res.status(500).json({ success: false, message: error?.message || "Erro ao gerar Balancete." });
  }
};

/**
 * GET /api/financeiro/dre — Demonstração de Resultados do Exercício
 */
export const getDRE = async (req: Request, res: Response) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Utilizador não autenticado." });
    }

    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const now = new Date();
    const start = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const report = await getIncomeStatement(companyId, start, end);
    return res.status(200).json({ success: true, result: report });
  } catch (error: any) {
    console.error("[FinancialReports] Erro ao gerar DRE:", error?.message || error);
    return res.status(500).json({ success: false, message: error?.message || "Erro ao gerar DRE." });
  }
};
