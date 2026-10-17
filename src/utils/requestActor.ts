import { Request } from "express";
import * as jwt from "jsonwebtoken";
import { UserModel } from "../database/models/UserModel";

/**
 * ACTOR AUTENTICADO + ESCOPO POR GESTOR (SPRINT 6)
 *
 * O JWT do sistema só carrega o id do utilizador; aqui resolve-se o actor
 * completo (nome, papel, empresa) para auditoria e para o escopo de carteira:
 * o Gestor de Crédito (userRole 3) só vê e opera a SUA carteira.
 */

export interface RequestActor {
  id: number | null;
  name: string | null;
  role: number | null;
  companyId: number;
}

export const actorFromRequest = async (req: Request): Promise<RequestActor> => {
  let userId = 0;
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    const decoded: any = jwt.verify(token, process.env.APP_SECRET + "");
    userId = Number(decoded?.id) || 0;
  } catch {
    /* sem token válido — actor sem identificação */
  }
  const user: any = userId ? await UserModel.findByPk(userId, { raw: true }) : null;
  return {
    id: userId || null,
    name: user?.name ? String(user.name) : null,
    role: user ? Number(user.userRole) : null,
    companyId: Number(user?.companyId) || 0,
  };
};

/** Gestor de Crédito (userRole 3) — carteira individual. */
export const isGestor = (actor: RequestActor | null | undefined): boolean =>
  Number(actor?.role) === 3;

/**
 * Campo `creditManager` que restringe a carteira quando o actor é Gestor.
 * Devolve `{}` para Admin/Operador/Super Admin (vêem tudo).
 */
export const gestorScopeWhere = (actor: RequestActor): Record<string, number> =>
  isGestor(actor) && actor.id ? { creditManager: Number(actor.id) } : {};
