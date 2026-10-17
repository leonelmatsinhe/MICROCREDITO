import { Request, Response } from "express";
import {
  getTeamProgress,
  getUserProgress,
  saveUserProgress,
  OnboardingError,
} from "../services/onboardingService";
import { getCurrentUser } from "../middlewares/roles";

/**
 * ONBOARDING — PROGRESSO DO CHECKLIST DO PRIMEIRO DIA
 *
 * GET  /api/onboarding/me    → progresso do próprio utilizador (qualquer sessão)
 * PUT  /api/onboarding/me    → guarda o conjunto completo de tarefas concluídas
 * GET  /api/onboarding/team  → progresso de toda a equipa da empresa (Admin)
 *
 * O userId/companyId vêm sempre do utilizador autenticado — nenhum endpoint
 * aceita empresa ou utilizador como parâmetro.
 */

const errorResponse = (res: Response, error: any) =>
  res.status(error?.http || 500).json({
    success: false,
    error: error?.code || "ONBOARDING_ERROR",
    message: error?.message || "Não foi possível processar o progresso de onboarding.",
  });

const scopeFromRequest = (req: Request) => {
  const user = getCurrentUser(req);
  if (!user?.id) {
    throw new OnboardingError("Sessão inválida. Volte a iniciar sessão.", "NO_SESSION", 401);
  }
  return {
    userId: Number(user.id),
    companyId: Number(user.companyId),
    role: user.userRole === null || user.userRole === undefined ? null : Number(user.userRole),
  };
};

/** GET /api/onboarding/me — o que já concluí. */
const getMyOnboarding = async (req: Request, res: Response) => {
  try {
    const scope = scopeFromRequest(req);
    const result = await getUserProgress(scope.userId);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return errorResponse(res, error);
  }
};

/**
 * PUT /api/onboarding/me — grava o conjunto completo de tarefas concluídas.
 *
 * `taskIds` é obrigatório e tem de ser uma lista: o guardar é um «substituir
 * tudo», logo um corpo malformado não pode ser interpretado como «desmarcar
 * tudo» (apagaria o progresso por engano).
 */
const saveMyOnboarding = async (req: Request, res: Response) => {
  try {
    const scope = scopeFromRequest(req);
    const taskIds = (req.body as any)?.taskIds;
    if (!Array.isArray(taskIds)) {
      throw new OnboardingError(
        "Corpo inválido: `taskIds` tem de ser uma lista de identificadores de tarefa.",
        "INVALID_PAYLOAD",
        400
      );
    }
    const result = await saveUserProgress(scope, taskIds);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return errorResponse(res, error);
  }
};

/** GET /api/onboarding/team — progresso por colega (Admin da empresa). */
const getTeamOnboarding = async (req: Request, res: Response) => {
  try {
    const scope = scopeFromRequest(req);
    const result = await getTeamProgress(scope.companyId);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return errorResponse(res, error);
  }
};

export { getMyOnboarding, saveMyOnboarding, getTeamOnboarding };
