import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import {
  getOpenRegister,
  getTodayRegister,
  openRegister,
  closeRegister,
  createMovement,
  listMovements,
  listRegisters,
  suggestOpeningBalance,
  getDailySummary as getDailySummaryService,
  getSystemRegisterToday,
  todayKey,
} from "../services/cashRegisterService";
import { CashRegisterModel } from "../database/models/CashRegisterModel";
import { Op } from "sequelize";
import { CASH_CATEGORIES } from "../database/models/CashMovementModel";
import { UserModel } from "../database/models/UserModel";

// Tipagem mínima (o sistema não popula req.user — extraímos do JWT).
interface AuthedRequest extends Request {
  userId?: number;
  companyId?: number;
  cashRegister?: any;
}

/**
 * Resolve userId + companyId do pedido. Prioridade:
 *  1. middleware checkCashRegisterOpen (req.userId / req.companyId);
 *  2. payload do JWT (o token do sistema guarda apenas { id }).
 */
const resolveIdentity = async (req: Request): Promise<{ userId: number; companyId: number }> => {
  const authed = req as AuthedRequest;
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

  if (userId && !companyId) {
    const user: any = await UserModel.findByPk(userId, { attributes: ["id", "companyId"] });
    companyId = Number(user?.getDataValue?.("companyId") ?? user?.companyId) || 0;
  }

  return { userId, companyId };
};

const errorStatus = (error: any): number => {
  switch (error?.code) {
    case "NOT_FOUND": return 404;
    case "ALREADY_OPEN":
    case "ALREADY_CLOSED":
    case "INVALID_BALANCE":
    case "INVALID_AMOUNT":
    case "INVALID_TYPE":
    case "INVALID_CATEGORY":
    case "INVALID_DESCRIPTION": return 400;
    case "FORBIDDEN": return 403;
    default: return 500;
  }
};

/**
 * GET /api/cash-registers/today
 * Estado do caixa de hoje do utilizador: { register, isOpen, categories }.
 * register = null → frontend mostra banner "Nenhum caixa aberto hoje".
 */
export const getToday = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = await resolveIdentity(req);
    if (!userId || !companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    const register = await getTodayRegister(userId, companyId);
    return res.status(200).json({
      success: true,
      result: {
        register,
        isOpen: !!register && register.status === "ABERTO",
        today: todayKey(),
        categories: CASH_CATEGORIES,
      },
    });
  } catch (error: any) {
    console.error("[cash-registers/today] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao obter o caixa de hoje." });
  }
};

/**
 * GET /api/cash-registers/opening-balance-suggestion
 * Sugere o saldo inicial do caixa de hoje: valor CONTADO em dinheiro no
 * último fecho do utilizador (fallback: último fecho da empresa / 0 no
 * primeiro dia). O frontend pré-preenche o dialog "Abrir Caixa do Dia".
 */
export const getOpeningBalanceSuggestion = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = await resolveIdentity(req);
    if (!userId || !companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const suggestion = await suggestOpeningBalance(Number(userId), Number(companyId));
    return res.status(200).json({ success: true, result: suggestion });
  } catch (error: any) {
    console.error("[cash-registers/opening-balance-suggestion] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao sugerir o saldo inicial." });
  }
};

/**
 * POST /api/cash-registers/open
 * Body: { opening_balance }. Cria o caixa ABERTO de hoje.
 */
export const openToday = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = await resolveIdentity(req);
    if (!userId || !companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    // Aceita opening_balance (camelCase) ou opening_balance (snake_case).
    const rawBalance = (req.body as any)?.opening_balance ?? (req.body as any)?.openingBalance;
    const openingBalance = Number(rawBalance);

    if (rawBalance === undefined || rawBalance === null || rawBalance === "") {
      return res.status(400).json({
        success: false,
        message: "O saldo inicial (opening_balance) é obrigatório para abrir o caixa.",
      });
    }

    const register = await openRegister({ userId, companyId, openingBalance });
    return res.status(201).json({ success: true, result: register });
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json({ success: false, message: error.message });
    }
    console.error("[cash-registers/open] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao abrir o caixa." });
  }
};

/**
 * POST /api/cash-registers/:id/close
 * Body: { closing_balance_informed }. Calcula saldo final e divergência no backend.
 */
export const close = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = await resolveIdentity(req);
    if (!userId || !companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    const body: any = req.body || {};
    const raw = body.closing_balance_informed ?? body.closingBalanceInformed;
    if (raw === undefined || raw === null || raw === "") {
      return res.status(400).json({
        success: false,
        message: "O valor contado em caixa (closing_balance_informed) é obrigatório.",
      });
    }

    const registerId = parseInt(String(req.params.id), 10);
    if (Number.isNaN(registerId)) {
      return res.status(400).json({ success: false, message: "id inválido." });
    }

    const register = await closeRegister({
      registerId,
      userId,
      companyId,
      closingBalanceInformed: Number(raw),
    });
    return res.status(200).json({ success: true, result: register });
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json({ success: false, message: error.message });
    }
    console.error("[cash-registers/close] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao fechar o caixa." });
  }
};

/**
 * GET /api/cash-registers/:id — detalhe do caixa (histórico/auditoria).
 */
export const findOne = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const registers = await listRegisters(Number(companyId), 1000);
    const register = registers.find((r: any) => r.id === parseInt(String(req.params.id), 10));
    if (!register) {
      return res.status(404).json({ success: false, message: "Caixa não encontrado." });
    }
    // Detalhe inclui os movimentos do caixa.
    register.movements = await listMovements(register.id, Number(companyId));
    return res.status(200).json({ success: true, result: register });
  } catch (error: any) {
    console.error("[cash-registers/:id] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao obter o caixa." });
  }
};

/**
 * GET /api/cash-registers/:id/movements — movimentos do caixa.
 */
export const getMovements = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const registerId = parseInt(String(req.params.id), 10);
    if (Number.isNaN(registerId)) {
      return res.status(400).json({ success: false, message: "id inválido." });
    }
    const movements = await listMovements(registerId, Number(companyId));
    return res.status(200).json({ success: true, result: movements });
  } catch (error: any) {
    if (error?.code === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error("[cash-registers/movements] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao listar movimentos." });
  }
};

/**
 * POST /api/cash-registers/:id/movements
 * Body: { type, category, amount, description, payment_method?, bank_account_id? }
 * Movimento MANUAL. Por defeito é CASH (gaveta); se payment_method = BANK/
 * MPESA/EMOLA, exige bank_account_id e o treasuryService actualiza o saldo
 * da conta + cria a contrapartida no extrato bancário — tudo numa transacção.
 */
export const createManualMovement = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = await resolveIdentity(req);
    if (!userId || !companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    // Categorias automáticas não podem ser criadas manualmente.
    const AUTOMATIC_ONLY = ["DESEMBOLSO", "REEMBOLSO", "JUROS_MORA", "TAXA_ADMIN"];
    const { type, category, amount, description, payment_method, bank_account_id } = (req.body as any) || {};
    if (AUTOMATIC_ONLY.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `A categoria ${category} é criada automaticamente pelo sistema (desembolsos/pagamentos).`,
      });
    }

    const method = String(payment_method || "CASH").toUpperCase();
    const { registerMovement, isElectronic } = await import("../services/treasuryService");
    if (!isElectronic(method) && method !== "CASH") {
      return res.status(400).json({ success: false, message: `Método de pagamento inválido: ${method}` });
    }

    // O treasuryService localiza o caixa ABERTO de hoje deste utilizador,
 // valida a conta bancária e os saldos, insere o movimento e recalcula
 // os totais — tudo dentro de UMA transacção MySQL.
    const movement = await registerMovement({
      companyId: Number(companyId),
      userId,
      type,
      category,
      amount: Number(amount),
      paymentMethod: method as any,
      bankAccountId: bank_account_id ? Number(bank_account_id) : null,
      description,
      automatic: false,
    });

    return res.status(201).json({ success: true, result: movement });
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json({ success: false, error: error.code, message: error.message });
    }
    console.error("[cash-registers/movements/create] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao registar o movimento." });
  }
};

/**
 * GET /api/cash-registers/history — histórico de caixas da empresa (auditoria).
 */export const getHistory = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    // Filtros opcionais de data (YYYY-MM-DD) — validados antes de consultar.
    const { from, to, limit } = req.query as any;
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if ((from && !dateRe.test(String(from))) || (to && !dateRe.test(String(to)))) {
      return res.status(400).json({
        success: false,
        message: "Datas inválidas. Use o formato YYYY-MM-DD.",
      });
    }
    if (from && to && String(from) > String(to)) {
      return res.status(400).json({
        success: false,
        message: "Intervalo inválido: 'from' não pode ser maior que 'to'.",
      });
    }
    let limitNum = 60;
    if (limit !== undefined) {
      const parsed = parseInt(String(limit), 10);
      if (Number.isNaN(parsed) || parsed <= 0 || parsed > 365) {
        return res.status(400).json({ success: false, message: "limit inválido (1-365)." });
      }
      limitNum = parsed;
    }

    const registers = await listRegisters(Number(companyId), limitNum, from, to);
    return res.status(200).json({ success: true, result: registers });
  } catch (error: any) {
    console.error("[cash-registers/history] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao listar histórico de caixas." });
  }
};

/**
 * GET /api/cash-registers/portal-alert
 * Alerta do sino (navbar): pagamentos do portal recebidos FORA de expediente
 * ainda não vistos. "Não vistos" = chegados DEPOIS do último fecho de um caixa
 * presencial da empresa (o fecho funciona como marcador de "já vi o portal").
 *
 * Resposta: { success, result: null | { registerId, status, count, totalIn,
 *             byMethod, latestAt, movements[] } }
 * `null` quando não há nada para notificar — o sino não mostra alerta.
 */
export const getPortalAlert = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    // Marcador de "já visto": último fecho de um caixa real (userId != 0).
    // Sem fecho hoje → conta tudo do Caixa do Sistema do dia.
    const lastClose: any = await CashRegisterModel.findOne({
      where: {
        companyId: Number(companyId),
        status: "FECHADO",
        userId: { [Op.ne]: 0 },
        closing_time: { [Op.ne]: null },
      },
      order: [["closing_time", "DESC"]],
      attributes: ["closing_time"],
      raw: true,
    });
    const portalSince = lastClose?.closing_time || null;

    const register = await getSystemRegisterToday(Number(companyId), portalSince);
    if (!register) return res.status(200).json({ success: true, result: null });

    const fresh = register.newSince;
    if (!fresh || fresh.count === 0) {
      // Caixa do Sistema existe, mas nada novo desde o último fecho.
      return res.status(200).json({ success: true, result: null });
    }

    return res.status(200).json({
      success: true,
      result: {
        registerId: register.id,
        status: register.status,
        count: fresh.count,
        totalIn: fresh.totalIn,
        byMethod: fresh.byMethod,
        latestAt:
          register.movements.length > 0
            ? register.movements[register.movements.length - 1].createdAt
            : null,
        movements: register.movements.slice(-10).map((m: any) => ({
          id: m.id,
          type: m.type,
          paymentMethod: m.paymentMethod,
          amount: m.amount,
          description: m.description,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("[cash-registers/portal-alert] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao obter o alerta do portal." });
  }
};

/**
 * GET /api/cash-registers/system-register
 * Caixa do Sistema de hoje (portal, fora de expediente) com movimentos.
 * Devolve null nos dias sem pagamentos fora de hora — o frontend esconde o card.
 */
export const getSystemRegister = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const register = await getSystemRegisterToday(Number(companyId));
    return res.status(200).json({ success: true, result: register });
  } catch (error: any) {
    console.error("[cash-registers/system-register] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao obter o Caixa do Sistema." });
  }
};

/**
 * GET /api/cash-registers/daily-summary?date=YYYY-MM-DD
 * Resumo consolidado do dia (todas as caixas da empresa): totais CASH/BANK +
 * extrato bancário agrupado por conta. Base para o relatório BM/fecho.
 */
export const getDailySummary = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const { date } = req.query as any;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ success: false, message: "Data inválida. Use o formato YYYY-MM-DD." });
    }
    const summary = await getDailySummaryService(Number(companyId), date ? String(date) : undefined);
    return res.status(200).json({ success: true, result: summary });
  } catch (error: any) {
    console.error("[cash-registers/daily-summary] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao gerar o resumo diário." });
  }
};

// Verificação de caixa aberto usada pelo middleware (export auxiliar p/ testes).
export const hasOpenRegister = async (userId: number, companyId: number) => {
  return !!(await getOpenRegister(userId, companyId));
};
