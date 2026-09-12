import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { getOpenRegister } from "../services/cashRegisterService";

// Tipagem mínima para não alterar a declaração global do Express.
interface AuthedRequest extends Request {
  userId?: number;
  companyId?: number;
  user?: any;
}

/**
 * MIDDLEWARE CAIXA DIÁRIO — verifica se o utilizador autenticado tem um caixa
 * ABERTO hoje (na sua empresa). Se não tiver, bloqueia a operação com 403:
 *
 *   { error: "CAIXA_FECHADO", message: "Abra o caixa do dia para continuar" }
 *
 * Aplicar em rotas que movimentam dinheiro físico:
 *   - POST /api/createInstallmentsLoan (desembolso do crédito)
 *   - POST /api/tranzaction            (pagamento de prestação)
 * O token já foi validado por `auth` — aqui extraímos o payload do JWT para
 * obter userId e companyId (o sistema não popula req.user no middleware auth).
 */
export const checkCashRegisterOpen = async (
  req: Request,
  res: Response,
  next: any
) => {
  try {
    const authed = req as AuthedRequest;

    // Se um middleware anterior já colocou user/companyId, respeitar.
    let userId = Number(authed.userId ?? authed.user?.id ?? 0);
    let companyId = Number(authed.companyId ?? authed.user?.companyId ?? 0);

    // Caso contrário, decodificar o JWT do header Authorization.
    if (!userId || !companyId) {
      const authHeader = req.headers.authorization || "";
      const [, token] = authHeader.split(" ");
      if (!token) {
        return res.status(401).json({ success: false, message: "Token is required!" });
      }
      const decoded: any = jwt.verify(token, process.env.APP_SECRET + "");
      userId = Number(decoded?.id) || 0;
      if (!companyId && decoded?.companyId) companyId = Number(decoded.companyId);
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    // O JWT do sistema só carrega o id do utilizador — buscar a empresa no DB.
    if (!companyId) {
      const { UserModel } = await import("../database/models/UserModel");
      const user: any = await UserModel.findByPk(userId, { attributes: ["id", "companyId"] });
      companyId = Number(user?.getDataValue?.("companyId") ?? user?.companyId) || 0;
    }

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    const openRegister = await getOpenRegister(userId, companyId);
    if (!openRegister) {
      return res.status(403).json({
        error: "CAIXA_FECHADO",
        message: "Abra o caixa do dia para continuar",
      });
    }

    // Disponibiliza o caixa aberto aos handlers seguintes (evita re-consultas).
    (req as any).cashRegister = openRegister;
    (req as any).userId = userId;
    (req as any).companyId = companyId;

    return next();
  } catch (error: any) {
    // Token inválido/expirado cai aqui — tratar como 401.
    console.error("[checkCashRegisterOpen] Erro:", error?.message || error);
    return res.status(401).json({ success: false, message: "Token invalid" });
  }
};
