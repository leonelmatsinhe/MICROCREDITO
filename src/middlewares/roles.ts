import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { UserModel } from "../database/models/UserModel";
import { FinancingWalletModel } from "../database/models/FinancingWalletModel";

/**
 * PERMISSÕES POR PAPEL
 * --------------------
 * userRole: 0=Super Admin · 1=Admin · 2=Operador · 3=Gestor de Crédito
 *           4=Parceiro Financiador (portal do financiador, só a SUA carteira)
 *
 * Nota de segurança: a carteira do parceiro é lida SEMPRE da base de dados
 * (users.walletId), nunca do pedido — assim o parceiro não consegue apontar
 * para a carteira de outro financiador alterando parâmetros.
 */

export const FINANCING_PARTNER_ROLE = 4;

export type PartnerContext = {
  userId: number;
  companyId: number;
  walletId: number;
  wallet: any;
  userName: string;
  email: string;
};

const decodeUserId = (req: Request): number | null => {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) return null;
    const decoded: any = jwt.verify(token, process.env.APP_SECRET + "");
    const id = Number(decoded?.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
};

const loadUser = async (req: Request): Promise<any | null> => {
  const userId = decodeUserId(req);
  if (!userId) return null;
  return (await UserModel.findByPk(userId, { raw: true })) as any;
};

const loadUserOrRaise = async (req: Request, res: Response): Promise<any | null> => {
  const user = await loadUser(req);
  if (!user) {
    res.status(401).json({ success: false, message: "Sessão inválida. Volte a iniciar sessão." });
    return null;
  }
  return user;
};

/**
 * Apenas Admin da empresa (userRole 1 ou 2). Usado para criar carteiras de
 * financiamento e contas de parceiros (userRole 4).
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const user = await loadUserOrRaise(req, res);
  if (!user) return;
  const role = Number(user.userRole);
  if (![1, 2].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Apenas o Administrador da empresa pode executar esta operação.",
    });
  }
  (req as any).currentUser = user;
  next();
};

/**
 * Apenas Admin ou Caixa/Gestor (operações de crédito e recibos).
 * O portal do parceiro (userRole 4) fica de fora: é só leitura.
 */
export const isStaff = async (req: Request, res: Response, next: NextFunction) => {
  const user = await loadUserOrRaise(req, res);
  if (!user) return;
  const role = Number(user.userRole);
  if (![0, 1, 2, 3].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Operação restrita ao pessoal da empresa.",
    });
  }
  (req as any).currentUser = user;
  next();
};

/**
 * Parceiro financiador (userRole 4) — portal do financiador.
 * Exige carteira associada e portal activo; injecta `req.partner`.
 */
export const isPartner = async (req: Request, res: Response, next: NextFunction) => {
  const user = await loadUserOrRaise(req, res);
  if (!user) return;

  if (Number(user.userRole) !== FINANCING_PARTNER_ROLE || !user.walletId) {
    return res.status(403).json({
      success: false,
      message: "Acesso reservado a parceiros financiadores com carteira associada.",
    });
  }

  const wallet: any = (await FinancingWalletModel.findByPk(Number(user.walletId), { raw: true })) as any;
  if (!wallet || Number(wallet.companyId) !== Number(user.companyId)) {
    return res.status(403).json({ success: false, message: "Carteira de financiamento não encontrada." });
  }
  if (!wallet.tem_portal || !wallet.portal_ativo) {
    return res.status(403).json({
      success: false,
      message: "O acesso ao portal desta carteira está desactivado. Contacte o Administrador da MBRM.",
    });
  }

  const partner: PartnerContext = {
    userId: Number(user.id),
    companyId: Number(user.companyId),
    walletId: Number(user.walletId),
    wallet,
    userName: String(user.name || ""),
    email: String(user.email || ""),
  };
  (req as any).partner = partner;
  next();
};

/** Leitura do contexto do parceiro já validado (tipagem para os controladores). */
export const getPartner = (req: Request): PartnerContext => {
  const partner = (req as any).partner as PartnerContext | undefined;
  if (!partner) {
    throw new Error("Contexto de parceiro ausente — rota sem middleware isPartner.");
  }
  return partner;
};

export const getCurrentUser = (req: Request): any => (req as any).currentUser || null;
