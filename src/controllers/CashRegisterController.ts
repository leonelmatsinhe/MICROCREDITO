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
  listCashDifferences,
  justifyCashDifference,
  annotateCashDifference,
  buildLimitInfo,
  todayKey,
} from "../services/cashRegisterService";
import {
  CashRegisterModel,
  CASH_CLOSING_TYPES,
  CASH_CLOSING_TYPE_LABELS,
} from "../database/models/CashRegisterModel";
import {
  CASH_CATEGORIES,
  CASH_CATEGORY_LABELS,
  CASH_TREASURY_CATEGORIES,
} from "../database/models/CashMovementModel";
import { MZN_DENOMINATIONS } from "../utils/mznDenominations";
import { getCashLimitMzn } from "../utils/cashLimit";
import { Op } from "sequelize";
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
    case "INVALID_DESCRIPTION":
    case "INVALID_JUSTIFICATION":
    case "INVALID_OBSERVATION":
    case "INVALID_HASH":
    case "INVALID_DENOMINATIONS":
    case "INVALID_STATUS":
    case "INVALID_CLOSING_TYPE":
    case "INVALID_JUSTIFICATION_ACCOUNT":
    case "AUTOMATIC_ONLY":
    case "BANK_ACCOUNT_REQUIRED":
    case "ACCOUNT_INACTIVE":
    case "REGISTER_NOT_TODAY":
    case "INVALID_TRANSFER": return 400;
    case "ACCOUNT_NOT_FOUND": return 404;
    // Circular do BM: precisa de ENTREGA_COFRE ou DEPOSITO_BANCARIO primeiro.
    case "CASH_LIMIT_EXCEEDED": return 409;
    case "DELIVERY_REQUIRED": return 409;
    case "ALREADY_JUSTIFIED": return 409;
    case "REGISTER_CLOSED":
    case "CAIXA_FECHADO":
    case "INSUFFICIENT_FUNDS": return 409;
    case "FORBIDDEN": return 403;
    default: return 500;
  }
};

/** Erros com código de negócio recebem o código no corpo (o frontend reage). */
const errorBody = (error: any) => ({
  success: false,
  error: error?.code,
  message: error?.message,
  ...(error?.limite !== undefined
    ? {
        limite: error.limite,
        dinheiro_em_caixa: error.dinheiro_em_caixa,
        excedente: error.excedente,
      }
    : {}),
});

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
        // Etiquetas PT-MZ das categorias (o frontend não as duplica)
        categoryLabels: CASH_CATEGORY_LABELS,
        // Tipos OFICIAIS de tesouraria (entrega ao cofre, reforço, depósito,
        // diferença de caixa) — sem "sangria"/"suprimento".
        treasuryCategories: CASH_TREASURY_CATEGORIES,
        // Denominações do metical para a contagem de numerário (notas + moedas)
        denominations: MZN_DENOMINATIONS,
        // Tipos de fecho e a conta usada no Livro Caixa
        closingTypes: CASH_CLOSING_TYPES,
        closingTypeLabels: CASH_CLOSING_TYPE_LABELS,
        cashDifferenceAccount: "58 — Quebras de Caixa",
        // LIMITE DE NUMERÁRIO EM CAIXA (circular do BM)
        cashLimit: {
          ...buildLimitInfo(register || {}),
          limite_configurado: getCashLimitMzn(),
        },
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

    const body: any = req.body || {};

    // Contagem por denominação do fundo de troco (preferida) OU valor informado.
    const denominations = body.denominations ?? body.denominacoes ?? body.contagem_denominacoes;
    const rawBalance = body.opening_balance ?? body.openingBalance;

    const hasDenominations =
      denominations && typeof denominations === "object" && Object.keys(denominations).length > 0;

    if (!hasDenominations && (rawBalance === undefined || rawBalance === null || rawBalance === "")) {
      return res.status(400).json({
        success: false,
        message:
          "Informe a contagem do fundo de troco por denominação (notas e moedas) ou o saldo inicial (opening_balance).",
      });
    }

    const register = await openRegister({
      userId,
      companyId,
      openingBalance: Number(rawBalance),
      denominations: hasDenominations ? denominations : undefined,
    });
    return res.status(201).json({ success: true, result: register });
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json(errorBody(error));
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

    // CONTAGEM CEGA: o operador envia a contagem por denominação; o total é
    // calculado no backend. `closing_balance_informed` continua aceite apenas
    // para clientes antigos (sem contagem).
    const denominations = body.denominations ?? body.denominacoes ?? body.contagem_denominacoes;
    const raw = body.closing_balance_informed ?? body.closingBalanceInformed;
    const hasDenominations =
      denominations && typeof denominations === "object" && Object.keys(denominations).length > 0;

    if (!hasDenominations && (raw === undefined || raw === null || raw === "")) {
      return res.status(400).json({
        success: false,
        message:
          "Informe a contagem do numerário por denominação (notas e moedas) para fechar o caixa.",
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
      denominations: hasDenominations ? denominations : undefined,
      closingBalanceInformed: raw === undefined || raw === null || raw === "" ? null : Number(raw),
      tipoFechamento: body.tipo_fechamento ?? body.tipoFechamento ?? null,
      notes: body.notes,
    });
    return res.status(200).json({ success: true, result: register });
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json(errorBody(error));
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
    // DIFERENCA_CAIXA é um AUTO DE OCORRÊNCIA: nasce no fecho do caixa (contagem
    // por denominação) e é justificada pelo Admin — nunca lançada à mão, senão
    // deixaria de ser um controlo.
    if (String(category) === "DIFERENCA_CAIXA") {
      return res.status(400).json({
        success: false,
        error: "AUTOMATIC_ONLY",
        message:
          "A diferença de caixa é apurada automaticamente no fecho (auto de ocorrência) e justificada pelo Admin na conta 58x — não pode ser lançada manualmente.",
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
      // errorBody inclui limite/dinheiro_em_caixa/excedente quando aplicável
      // (ex.: CASH_LIMIT_EXCEEDED — circular do BM).
      return res.status(errorStatus(error)).json(errorBody(error));
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
/**
 * GET /api/cash-registers/reconciliation?date=YYYY-MM-DD
 * RECONCILIAÇÃO DO DIA — tranzactions vs movimentos de caixa vs recibos.
 * O fecho diário usa a mesma função para bloquear divergências > 0,01 MZN.
 */
export const getReconciliation = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const { date } = req.query as any;
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))
      ? String(date)
      : todayKey();
    const { reconcileDay } = await import("../services/reconciliationService");
    const result = await reconcileDay(Number(companyId), day);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("[reconciliation] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao reconciliar o dia." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DIFERENÇAS DE CAIXA (QUEBRAS / SOBRAS) — ADMIN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/cash-registers/differences?status=PENDENTE
 * Diferenças de caixa apuradas nos fechos, para o Admin justificar e lançar no
 * Livro Caixa (conta 58x — Quebras de Caixa). Sem `status` devolve todas.
 */
export const getDifferences = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const { status, limit } = req.query as any;
    let limitNum = 100;
    if (limit !== undefined) {
      const parsed = parseInt(String(limit), 10);
      if (Number.isNaN(parsed) || parsed <= 0 || parsed > 500) {
        return res.status(400).json({ success: false, message: "limit inválido (1-500)." });
      }
      limitNum = parsed;
    }
    const differences = await listCashDifferences(
      Number(companyId),
      status ? String(status) : undefined,
      limitNum
    );
    const pendentes = differences.filter((d: any) => d.status === "PENDENTE");
    return res.status(200).json({
      success: true,
      result: differences,
      summary: {
        total: differences.length,
        pendentes: pendentes.length,
        valor_pendente: Math.round(
          pendentes.reduce((sum: number, d: any) => sum + (Number(d.valor) || 0), 0) * 100
        ) / 100,
        conta_contabilistica: "58 — Quebras de Caixa",
      },
    });
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json(errorBody(error));
    }
    console.error("[cash-registers/differences] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao listar as diferenças de caixa." });
  }
};

/**
 * POST /api/cash-registers/differences/:id/justify
 * Body: { justificacao, conta_contabilistica? }
 * Só o Admin: regista o auto de ocorrência e o lançamento no Livro Caixa
 * (conta 58x — Quebras de Caixa), passando a pendência a JUSTIFICADA.
 */
export const justifyDifference = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = await resolveIdentity(req);
    if (!userId || !companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "id inválido." });
    }
    const body: any = req.body || {};
    const justificacao = body.justificacao ?? body.justification;
    const diferenca = await justifyCashDifference({
      id,
      companyId,
      userId,
      justificacao: String(justificacao ?? ""),
      contaContabilistica: body.conta_contabilistica ?? body.contaContabilistica ?? null,
    });
    return res.status(200).json({
      success: true,
      message: "Diferença justificada e lançada na conta 58 — Quebras de Caixa.",
      result: diferenca,
    });
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json(errorBody(error));
    }
    console.error("[cash-registers/differences/justify] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao justificar a diferença de caixa." });
  }
};

/**
 * POST /api/cash-registers/differences/:id/observacao
 * Body: { observacao }
 * OBSERVAÇÃO / JUSTIFICAÇÃO DO OPERADOR no auto de ocorrência — preenchida no
 * modal "Auto de Ocorrência - Diferença de Caixa" logo após o fecho cego.
 * Não exige Admin: o próprio operador do caixa documenta a quebra/sobra;
 * o Admin continua a justificar e lançar via /justify.
 */
export const observeDifference = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = await resolveIdentity(req);
    if (!userId || !companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "id inválido." });
    }
    const body: any = req.body || {};
    const observacao = body.observacao ?? body.justificacao ?? body.observacao_operador;

    // Admin (userRole 0/1) pode documentar qualquer auto da empresa.
    const user: any = await UserModel.findByPk(userId, { attributes: ["userRole"] });
    const role = Number(user?.getDataValue?.("userRole") ?? user?.userRole);

    const diferenca = await annotateCashDifference({
      id,
      companyId,
      userId,
      observacao: String(observacao ?? ""),
      isAdmin: [0, 1].includes(role),
    });
    return res.status(200).json({
      success: true,
      message: "Observação do operador registada no auto de ocorrência.",
      result: diferenca,
    });
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json(errorBody(error));
    }
    console.error("[cash-registers/differences/observacao] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao registar a observação da diferença." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPROVATIVO DE ENTREGA DE VALORES AO COFRE CENTRAL (PDF + QR DE VALIDAÇÃO)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/cash-movements/:movementId/comprovativo
 * PDF próprio (A4) do movimento ENTREGA_COFRE — selo electrónico (hash
 * SHA-256) + QR de validação + assinaturas do Operador e do Tesoureiro.
 */
export const getComprovativoEntrega = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const movementId = parseInt(String(req.params.movementId), 10);
    if (Number.isNaN(movementId)) {
      return res.status(400).json({ success: false, message: "movementId inválido." });
    }
    const { generateComprovativoPdf } = await import("../services/cashDeliveryService");
    const { buffer, numero, hash } = await generateComprovativoPdf(movementId, Number(companyId));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="comprovativo-entrega-cofre-${numero}.pdf"`);
    res.setHeader("X-Comprovativo-Numero", numero);
    res.setHeader("X-Comprovativo-Hash", hash);
    return res.status(200).send(buffer);
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json(errorBody(error));
    }
    console.error("[cash-movements/comprovativo] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao gerar o comprovativo de entrega." });
  }
};

/**
 * GET /api/cash-deliveries/validate?numero=CE-<ano>-<id>&hash=<sha256>
 * Validação PÚBLICA do QR Code (sem autenticação) — recompõe o hash a partir
 * do movimento gravado e confirma a autenticidade do comprovativo.
 */
export const validateComprovativoEntrega = async (req: Request, res: Response) => {
  try {
    const { numero, hash, id } = req.query as any;
    const { validateComprovativo } = await import("../services/cashDeliveryService");
    const result = await validateComprovativo({
      numero: numero ? String(numero) : undefined,
      hash: hash ? String(hash) : undefined,
      movementId: id ? Number(id) : undefined,
    });
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json(errorBody(error));
    }
    console.error("[cash-deliveries/validate] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao validar o comprovativo." });
  }
};

/**
 * GET /api/cash-registers/treasury-panel
 * PAINEL DE TESOURARIA (Admin): excedentes do limite de numerário em caixa e
 * diferenças de caixa pendentes, ambos agrupados POR OPERADOR.
 */
export const getTreasuryPanelView = async (req: Request, res: Response) => {
  try {
    const { companyId } = await resolveIdentity(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }
    const { getTreasuryPanel } = await import("../services/cashRegisterService");
    const result = await getTreasuryPanel(Number(companyId));
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    if (error?.code) {
      return res.status(errorStatus(error)).json(errorBody(error));
    }
    console.error("[cash-registers/treasury-panel] Erro:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao carregar o painel de tesouraria." });
  }
};

export const hasOpenRegister = async (userId: number, companyId: number) => {
  return !!(await getOpenRegister(userId, companyId));
};
