import { Op } from "sequelize";
import { OnboardingProgressModel } from "../database/models/OnboardingProgressModel";
import { UserModel } from "../database/models/UserModel";

/**
 * ONBOARDING — PROGRESSO DO CHECKLIST DO PRIMEIRO DIA
 *
 * O catálogo das tarefas (títulos, páginas e mini-percursos do tour) vive no
 * frontend; aqui guarda-se e devolve-se o PROGRESSO: quem concluiu o quê e
 * quando. Esta divisão evita duas listas de tarefas a divergir — o backend
 * nunca valida a existência da tarefa, apenas a forma do identificador.
 *
 * Escopo multi-empresa: o userId/companyId vêm SEMPRE do JWT (via middleware),
 * nunca do pedido. O Admin só vê os utilizadores da sua própria empresa.
 */

/** Identificador de tarefa: kebab-case curto (ex.: abrir-caixa, primeiro-credito). */
const TASK_ID_PATTERN = /^[a-z][a-z0-9-]{1,59}$/;

/** Tecto de segurança: o checklist de um perfil tem menos de uma dúzia de tarefas. */
export const MAX_TASKS_PER_USER = 40;

export class OnboardingError extends Error {
  code: string;
  http: number;

  constructor(message: string, code = "ONBOARDING_ERROR", http = 400) {
    super(message);
    this.name = "OnboardingError";
    this.code = code;
    this.http = http;
  }
}

export interface OnboardingScope {
  userId: number;
  companyId: number;
  role: number | null;
}

export interface OnboardingProgress {
  userId: number;
  taskIds: string[];
  total: number;
  firstCompletedAt: string | null;
  lastCompletedAt: string | null;
}

export interface TeamProgressRow {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  role: number | null;
  active: boolean;
  walletId: number | null;
  taskIds: string[];
  total: number;
  firstCompletedAt: string | null;
  lastCompletedAt: string | null;
}

/**
 * Normaliza o conjunto de tarefas recebido do cliente: apenas identificadores
 * válidos, sem repetições e dentro do tecto. Campo ausente = conjunto vazio
 * (o utilizador desmarcou tudo), o que mantém o guardar idempotente.
 */
export const normaliseTaskIds = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = String(item ?? "").trim().toLowerCase();
    if (!TASK_ID_PATTERN.test(id)) continue;
    seen.add(id);
    if (seen.size >= MAX_TASKS_PER_USER) break;
  }
  return [...seen];
};

const toIso = (value: any): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Progresso de um utilizador (conjunto completo de tarefas concluídas). */
export const getUserProgress = async (userId: number): Promise<OnboardingProgress> => {
  const rows = (await OnboardingProgressModel.findAll({
    where: { userId: Number(userId) },
    raw: true,
    order: [["completedAt", "ASC"]],
  })) as any[];

  const taskIds = rows.map((row) => String(row.taskId));
  return {
    userId: Number(userId),
    taskIds,
    total: taskIds.length,
    firstCompletedAt: toIso(rows[0]?.completedAt),
    lastCompletedAt: toIso(rows[rows.length - 1]?.completedAt),
  };
};

/**
 * Guarda o conjunto completo de tarefas concluídas do utilizador: acrescenta as
 * novas, remove as desmarcadas e nunca duplica (chave única userId+taskId).
 */
export const saveUserProgress = async (
  scope: OnboardingScope,
  rawTaskIds: unknown
): Promise<OnboardingProgress> => {
  const taskIds = normaliseTaskIds(rawTaskIds);
  const userId = Number(scope.userId);
  const companyId = Number(scope.companyId);
  if (!userId || !companyId) {
    throw new OnboardingError("Sessão inválida: não foi possível identificar o utilizador.", "NO_SESSION", 401);
  }

  const existing = (await OnboardingProgressModel.findAll({
    where: { userId },
    raw: true,
    attributes: ["taskId"],
  })) as any[];
  const current = new Set(existing.map((row) => String(row.taskId)));

  const toAdd = taskIds.filter((taskId) => !current.has(taskId));
  const toRemove = [...current].filter((taskId) => !taskIds.includes(taskId));

  if (toAdd.length > 0) {
    await OnboardingProgressModel.bulkCreate(
      toAdd.map((taskId) => ({
        companyId,
        userId,
        taskId,
        roleId: scope.role === null || scope.role === undefined ? null : Number(scope.role),
        completedAt: new Date(),
      })),
      { ignoreDuplicates: true }
    );
  }

  if (toRemove.length > 0) {
    await OnboardingProgressModel.destroy({ where: { userId, taskId: { [Op.in]: toRemove } } });
  }

  return getUserProgress(userId);
};

/**
 * Progresso de TODOS os utilizadores da empresa (staff e parceiros
 * financiadores) — a vista do Admin. Utilizadores sem progresso aparecem com o
 * conjunto vazio, para se ver quem ainda não começou.
 */
export const getTeamProgress = async (
  companyId: number
): Promise<{ generatedAt: string; totalUsers: number; users: TeamProgressRow[] }> => {
  const users = (await UserModel.findAll({
    where: { companyId: Number(companyId) },
    raw: true,
    attributes: ["id", "name", "email", "phone", "userRole", "status", "is_active", "walletId"],
    order: [["name", "ASC"]],
  })) as any[];

  const userIds = users.map((user) => Number(user.id)).filter((id) => !!id);
  const rows = userIds.length
    ? ((await OnboardingProgressModel.findAll({
        where: { userId: { [Op.in]: userIds } },
        raw: true,
        order: [["completedAt", "ASC"]],
      })) as any[])
    : [];

  const byUser = new Map<number, any[]>();
  for (const row of rows) {
    const key = Number(row.userId);
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push(row);
  }

  const team: TeamProgressRow[] = users.map((user) => {
    const userRows = byUser.get(Number(user.id)) || [];
    const taskIds = userRows.map((row) => String(row.taskId));
    return {
      userId: Number(user.id),
      name: String(user.name || ""),
      email: String(user.email || ""),
      phone: user.phone ? String(user.phone) : null,
      role: user.userRole === null || user.userRole === undefined ? null : Number(user.userRole),
      active: Number(user.status) === 1 && user.is_active !== false && user.is_active !== 0,
      walletId: user.walletId ? Number(user.walletId) : null,
      taskIds,
      total: taskIds.length,
      firstCompletedAt: toIso(userRows[0]?.completedAt),
      lastCompletedAt: toIso(userRows[userRows.length - 1]?.completedAt),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totalUsers: team.length,
    users: team,
  };
};
