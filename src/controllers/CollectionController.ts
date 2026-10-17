import { Request, Response } from "express";
import {
  registerActivity,
  listActivities,
  listOverdue,
  listPortfolio,
  claimClient,
  gestorDashboard,
  managerRanking,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  CollectionError,
} from "../services/collectionService";
import { actorFromRequest } from "../utils/requestActor";

/**
 * COBRANÇA DE CAMPO + CARTEIRA POR GESTOR (SPRINT 6)
 *
 * O Gestor de Crédito só vê e opera a SUA carteira; o Admin vê tudo e o
 * ranking por gestor. Todas as rotas resolvem o actor pelo JWT.
 */

const errorResponse = (res: Response, error: any) =>
  res.status(error?.http || 500).json({
    success: false,
    error: error?.code || "COLLECTION_ERROR",
    message: error?.message || "Não foi possível processar o registo de cobrança.",
  });

/** POST /api/collection/activities — visita, ligação, promessa ou recusa. */
const registerCollectionActivity = async (req: Request, res: Response) => {
  try {
    const actor = await actorFromRequest(req);
    const body = req.body as any;
    const result = await registerActivity({
      actor,
      accountNumber: body?.accountNumber,
      activityType: body?.activityType,
      loanId: body?.loanId,
      promisedDate: body?.promisedDate,
      promisedAmount: body?.promisedAmount,
      notes: body?.notes,
      latitude: body?.latitude,
      longitude: body?.longitude,
      gpsAccuracy: body?.gpsAccuracy,
    });
    return res.status(201).json({
      success: true,
      result,
      message: `${result.activityLabel} registada com sucesso.`,
    });
  } catch (error: any) {
    return errorResponse(res, error);
  }
};

/** GET /api/collection/activities — histórico (prova de cobrança). */
const listCollectionActivities = async (req: Request, res: Response) => {
  try {
    const actor = await actorFromRequest(req);
    const query = req.query as any;
    const result = await listActivities({
      actor,
      accountNumber: query.accountNumber,
      customerId: query.customerId,
      activityType: query.activityType,
      createdBy: query.createdBy,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: query.limit,
    });
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return errorResponse(res, error);
  }
};

/** GET /api/collection/overdue — clientes com prestações vencidas (Cobrança). */
const listOverdueCustomers = async (req: Request, res: Response) => {
  try {
    const actor = await actorFromRequest(req);
    const query = req.query as any;
    const result = await listOverdue({
      actor,
      minDays: query.minDays,
      maxDays: query.maxDays,
      search: query.search,
      limit: query.limit,
    });
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return errorResponse(res, error);
  }
};

/** GET /api/collection/dashboard — indicadores da carteira do gestor. */
const getGestorDashboard = async (req: Request, res: Response) => {
  try {
    const actor = await actorFromRequest(req);
    const query = req.query as any;
    const result = await gestorDashboard({ actor, gestorId: query.gestorId });
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return errorResponse(res, error);
  }
};

/** GET /api/collection/ranking — ranking por gestor (Admin). */
const getCollectionRanking = async (req: Request, res: Response) => {
  try {
    const actor = await actorFromRequest(req);
    const result = await managerRanking(actor);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return errorResponse(res, error);
  }
};

/**
 * GET /api/collection/portfolio — clientes da carteira (ecrã «A Minha
 * Carteira»): os do gestor + os disponíveis (sem gestor válido), com dívida,
 * atraso, última cobrança e promessa pendente.
 */
const getCollectionPortfolio = async (req: Request, res: Response) => {
  try {
    const actor = await actorFromRequest(req);
    const query = req.query as any;
    const result = await listPortfolio({
      actor,
      search: query.search,
      onlyOverdue: query.onlyOverdue,
      limit: query.limit,
    });
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return errorResponse(res, error);
  }
};

/** POST /api/collection/claim — o gestor assume a carteira de um cliente disponível. */
const claimCollectionClient = async (req: Request, res: Response) => {
  try {
    const actor = await actorFromRequest(req);
    const body = req.body as any;
    const result = await claimClient({ actor, accountNumber: body?.accountNumber });
    return res.status(200).json({
      success: true,
      result,
      message: `${result.customerName} passou a ser da sua carteira.`,
    });
  } catch (error: any) {
    return errorResponse(res, error);
  }
};

/** GET /api/collection/meta — tipos de atividade (para a UI). */
const getCollectionMeta = async (_req: Request, res: Response) =>
  res.status(200).json({
    success: true,
    result: {
      activityTypes: ACTIVITY_TYPES.map((type) => ({ value: type, label: ACTIVITY_TYPE_LABELS[type] })),
    },
  });

export {
  registerCollectionActivity,
  listCollectionActivities,
  listOverdueCustomers,
  getCollectionPortfolio,
  claimCollectionClient,
  getGestorDashboard,
  getCollectionRanking,
  getCollectionMeta,
};
