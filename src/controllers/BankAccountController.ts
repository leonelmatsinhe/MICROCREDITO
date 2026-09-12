import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import {
  getAll,
  getOne,
  getBalance,
  getStatement,
  upsert,
  deactivate,
} from "../services/bankAccountService";
import {
  transferBetweenAccounts,
  transferCashToBank,
  transferBankToCash,
  getWalletTotals,
} from "../services/treasuryService";

/**
 * CONTAS BANCÁRIAS / CARTEIRA REAL — controlador.
 *
 * Todas as operações protegidas por auth. Operações de dinheiro (transferências
 * e depósitos) exigem caixa ABERTO — validado pelo treasuryService.
 */

// Resolve userId + companyId do pedido (JWT ou middlewares anteriores).
const resolveIdentity = async (req: Request): Promise<{ userId: number; companyId: number; userName: string }> => {
  const authed = req as any;
  let userId = Number(authed.userId ?? 0);
  let companyId = Number(authed.companyId ?? 0);

  if (!userId || !companyId) {
    const authHeader = req.headers.authorization || "";
    const [, token] = authHeader.split(" ");
    if (token) {
      const decoded: any = jwt.verify(token, process.env.APP_SECRET + "");
      userId = Number(decoded?.id) || userId;
      if (decoded?.companyId) companyId = Number(decoded.companyId);
    }
  }

  let userName = "sistema";
  if (userId && !companyId) {
    // NOTA: o modelo de utilizadores só tem `name` (não existe coluna `username`).
    const { UserModel } = await import("../database/models/UserModel");
    const user: any = await UserModel.findByPk(userId, { attributes: ["id", "companyId", "name"] });
    companyId = Number(user?.getDataValue?.("companyId") ?? user?.companyId) || 0;
    userName = String(user?.getDataValue?.("name") ?? "sistema");
  }

  return { userId, companyId, userName };
};

const errorStatus = (error: any): number => {
  switch (error?.code) {
    case "NOT_FOUND": return 404;
    case "CAIXA_FECHADO": return 403;
    case "INSUFFICIENT_FUNDS":
    case "INVALID_TRANSFER":
    case "INVALID_AMOUNT":
    case "INVALID_PURPOSE":
    case "INVALID_TYPE":
    case "INVALID_ACCOUNT":
    case "BANK_ACCOUNT_REQUIRED":
    case "ACCOUNT_NOT_FOUND":
    case "ACCOUNT_INACTIVE": return 400;
    default: return 500;
  }
};

const sendError = (res: Response, error: any, fallback: string) => {
  if (error?.code) {
    return res.status(errorStatus(error)).json({ success: false, error: error.code, message: error.message });
  }
  console.error(fallback, error?.message || error);
  return res.status(500).json({ success: false, message: fallback });
};

/**
 * GET /api/bank-accounts?purpose=REEMBOLSO&is_active=1
 * Lista contas da carteira (para a página de gestão e para os q-select dos
 * forms de desembolso/pagamento).
 */
export const index = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    const { purpose, is_active } = req.query as any;
    const accounts = await getAll({
      companyId: Number(companyId),
      purpose: purpose ? String(purpose) : undefined,
      isActive: is_active !== undefined ? String(is_active) === "1" : undefined,
    });
    return res.status(200).json({ success: true, result: accounts });
  } catch (error: any) {
    return sendError(res, error, "Erro ao listar contas bancárias.");
  }
};

/**
 * GET /api/bank-accounts/wallet-totals — saldos agregados por tipo
 * (para o card "Saldo em Bancos" do dashboard).
 */
export const walletTotals = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const totals = await getWalletTotals(Number(companyId));
    return res.status(200).json({ success: true, result: totals });
  } catch (error: any) {
    return sendError(res, error, "Erro ao calcular saldos da carteira.");
  }
};

/**
 * GET /api/bank-accounts/:id/balance
 */
export const balance = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "id inválido." });
    }
    const current = await getBalance(Number(companyId), id);
    return res.status(200).json({ success: true, result: { accountId: id, balance: current } });
  } catch (error: any) {
    return sendError(res, error, "Erro ao obter o saldo.");
  }
};

/**
 * GET /api/bank-accounts/:id/transactions — extrato da conta.
 */
export const transactions = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "id inválido." });
    }
    const account = await getOne(Number(companyId), id);
    if (!account) {
      return res.status(404).json({ success: false, message: "Conta não encontrada." });
    }
    const rows = await getStatement(Number(companyId), id);
    return res.status(200).json({ success: true, result: { account, transactions: rows } });
  } catch (error: any) {
    return sendError(res, error, "Erro ao obter o extrato.");
  }
};

/**
 * POST /api/bank-accounts — criar conta (cadastral; saldo inicia em 0).
 */
export const create = async (req: Request, res: Response) => {
  try {
    const { companyId, userName } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const account = await upsert({ companyId: Number(companyId), userName, data: req.body as any });
    return res.status(201).json({ success: true, result: account });
  } catch (error: any) {
    return sendError(res, error, "Erro ao criar a conta bancária.");
  }
};

/**
 * PUT /api/bank-accounts/:id — actualizar dados cadastrais.
 */
export const update = async (req: Request, res: Response) => {
  try {
    const { companyId, userName } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "id inválido." });
    }
    const account = await upsert({ id, companyId: Number(companyId), userName, data: req.body as any });
    return res.status(200).json({ success: true, result: account });
  } catch (error: any) {
    return sendError(res, error, "Erro ao actualizar a conta bancária.");
  }
};

/**
 * DELETE /api/bank-accounts/:id — desactivar (nunca apaga histórico).
 */
export const remove = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "id inválido." });
    }
    const account = await deactivate(Number(companyId), id);
    return res.status(200).json({ success: true, result: account });
  } catch (error: any) {
    return sendError(res, error, "Erro ao desactivar a conta bancária.");
  }
};

/**
 * POST /api/bank-accounts/transfer
 * Body: { from_account_id, to_account_id | to_cash_register_id, amount, description }
 *  - conta → conta: transferência bancária (BANK↔BANK);
 *  - conta → caixa: levantamento em dinheiro (BANK→CASH);
 *  - (depósito de caixa usa /api/bank-accounts/deposit).
 */
export const transfer = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = await resolveIdentity(req);
    if (!userId || !companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    const body: any = req.body || {};
    const fromAccountId = Number(body.from_account_id);
    const toAccountId = body.to_account_id ? Number(body.to_account_id) : null;
    const toCashRegister = body.to_cash_register_id ? Number(body.to_cash_register_id) : null;
    const amount = Number(body.amount);

    if (!fromAccountId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Informe origem, destino e valor válidos." });
    }

    let result: any;
    if (toAccountId) {
      result = await transferBetweenAccounts({
        companyId: Number(companyId),
        userId,
        fromAccountId,
        toAccountId,
        amount,
        description: body.description,
      });
    } else if (toCashRegister) {
      result = await transferBankToCash({
        companyId: Number(companyId),
        userId,
        fromAccountId,
        amount,
        description: body.description,
      });
    } else {
      return res.status(400).json({ success: false, message: "Informe to_account_id ou to_cash_register_id." });
    }

    return res.status(201).json({ success: true, result });
  } catch (error: any) {
    return sendError(res, error, "Erro na transferência.");
  }
};

/**
 * POST /api/bank-accounts/deposit — depósito de dinheiro físico no banco.
 * Body: { to_account_id, amount, description }
 */
export const deposit = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = await resolveIdentity(req);
    if (!userId || !companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    const body: any = req.body || {};
    const toAccountId = Number(body.to_account_id);
    const amount = Number(body.amount);
    if (!toAccountId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Informe conta de destino e valor válidos." });
    }

    const result = await transferCashToBank({
      companyId: Number(companyId),
      userId,
      toAccountId,
      amount,
      description: body.description,
    });
    return res.status(201).json({ success: true, result });
  } catch (error: any) {
    return sendError(res, error, "Erro no depósito.");
  }
};
