import { LoanModel } from "../database/models/LoanModel";
import { ApprovalRuleModel } from "../database/models/ApprovalRuleModel";
import { LoanApprovalModel } from "../database/models/LoanApprovalModel";
import { NotificationModel } from "../database/models/NotificationModel";
import { CustomerModel } from "../database/models/CustomerModel";
import {
  getGuaranteeCoverage,
  guaranteeCoverageMessage,
} from "./guaranteeCoverageService";
import { validateCapacityRule } from "../utils/capacityRule";

/**
 * ALÇADAS DE APROVAÇÃO (SPRINT 5)
 *
 * Hoje um único Admin podia aprovar e desembolsar sozinho qualquer valor.
 * Este serviço separa as duas acções e impõe as alçadas da tabela
 * `approval_rules` (configurável por empresa). Modelo actual:
 *
 *   Admin (único)     → aprovação e desembolso, qualquer valor (1 aprovação)
 *   Gestor de Crédito → SEM alçada: apenas lança e valida a instrução do
 *                       processo (submissão) para posterior aprovação do Admin
 *
 * NOTA: a tabela `approval_rules` continua a suportar faixas e Comitê de
 * Crédito (N aprovações de aprovadores distintos) — basta criar as regras
 * correspondentes para reactivar esses controlos.
 *
 * Máquina de estados do crédito (`customer_loans.approvalState`):
 *
 *   RASCUNHO → AGUARDANDO_APROVACAO → APROVADO_PARCIALMENTE → APROVADO
 *       ↓              ↓                       ↓                  ↓
 *   REPROVADO ←────────┴───────────────────────┘        AGUARDANDO_DESEMBOLSO
 *                                                              ↓
 *                                                        DESEMBOLSADO
 *
 * APROVAR é uma decisão (não toca no caixa); DESEMBOLSAR movimenta o caixa e
 * só é permitido a partir de APROVADO / AGUARDANDO_DESEMBOLSO.
 */

// ── Estados ────────────────────────────────────────────────────────────────
export const LOAN_APPROVAL_STATES = {
  RASCUNHO: "RASCUNHO",
  AGUARDANDO_APROVACAO: "AGUARDANDO_APROVACAO",
  APROVADO_PARCIALMENTE: "APROVADO_PARCIALMENTE",
  APROVADO: "APROVADO",
  REPROVADO: "REPROVADO",
  AGUARDANDO_DESEMBOLSO: "AGUARDANDO_DESEMBOLSO",
  DESEMBOLSADO: "DESEMBOLSADO",
} as const;

export type LoanApprovalState =
  (typeof LOAN_APPROVAL_STATES)[keyof typeof LOAN_APPROVAL_STATES];

export const APPROVAL_STATE_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_APROVACAO: "Aguardando Aprovação",
  APROVADO_PARCIALMENTE: "Aprovado Parcialmente",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  AGUARDANDO_DESEMBOLSO: "Aguardando Desembolso",
  DESEMBOLSADO: "Desembolsado",
};

export const approvalStateLabel = (state: any): string =>
  APPROVAL_STATE_LABELS[String(state || "")] || "—";

// Estados a partir dos quais o crédito pode ser desembolsado (o dinheiro sai).
export const DISBURSABLE_STATES: string[] = [
  LOAN_APPROVAL_STATES.APROVADO,
  LOAN_APPROVAL_STATES.AGUARDANDO_DESEMBOLSO,
];

// ── Eventos da linha do tempo ──────────────────────────────────────────────
export const APPROVAL_EVENTS = {
  CRIACAO: "CRIACAO",
  SUBMISSAO: "SUBMISSAO",
  APROVACAO: "APROVACAO",
  REPROVACAO: "REPROVACAO",
  REABERTURA: "REABERTURA",
  PREPARACAO_DESEMBOLSO: "PREPARACAO_DESEMBOLSO",
  DESEMBOLSO: "DESEMBOLSO",
  INVALIDACAO_DESEMBOLSO: "INVALIDACAO_DESEMBOLSO",
} as const;

export const APPROVAL_EVENT_LABELS: Record<string, string> = {
  CRIACAO: "Crédito criado (rascunho)",
  SUBMISSAO: "Submetido para aprovação",
  APROVACAO: "Aprovação registada",
  REPROVACAO: "Reprovado",
  REABERTURA: "Pedido reaberto",
  PREPARACAO_DESEMBOLSO: "Desembolso preparado",
  DESEMBOLSO: "Desembolso executado",
  INVALIDACAO_DESEMBOLSO: "Desembolso invalidado",
};

// Eventos que invalidam aprovações anteriores (o crédito volta a precisar de
// aprovações novas — ex.: depois de reprovar e reabrir com outros valores).
const INVALIDATING_EVENTS: string[] = [
  APPROVAL_EVENTS.REPROVACAO,
  APPROVAL_EVENTS.REABERTURA,
];

// ── Papéis ─────────────────────────────────────────────────────────────────
export const ROLE_LABELS: Record<number, string> = {
  0: "Super Admin",
  1: "Administrador",
  2: "Operador",
  3: "Gestor de Crédito",
  4: "Parceiro Financiador",
};

export const roleLabel = (role: any): string =>
  ROLE_LABELS[Number(role)] || `Papel ${role}`;

/** Família de alçada do papel: ADMIN (0/1) · GESTOR (3) · null = sem alçada. */
export const roleFamily = (userRole: any): "ADMIN" | "GESTOR" | null => {
  const role = Number(userRole);
  if (role === 0 || role === 1) return "ADMIN";
  if (role === 3) return "GESTOR";
  return null;
};

// ── Erros de negócio ───────────────────────────────────────────────────────
export class ApprovalError extends Error {
  http: number;
  code: string;
  constructor(http: number, code: string, message: string) {
    super(message);
    this.http = http;
    this.code = code;
  }
}

/** Decisões e desembolso são exclusivos do Admin (papéis 0/1). */
const assertAdmin = (actor: ApprovalActor, action: string) => {
  if (roleFamily(actor.role) !== "ADMIN") {
    throw new ApprovalError(
      403,
      "FORBIDDEN",
      `Apenas o Administrador pode ${action}. O Gestor de Crédito lança e valida a instrução do processo.`
    );
  }
};

const fmtMoney = (value: any): string =>
  Number(value || 0).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export interface ApprovalActor {
  id: number | null;
  name: string | null;
  role: number | null;
  companyId: number;
}

export interface ApprovalRuleRow {
  id?: number;
  companyId?: number | null;
  role: string;
  minAmount: number;
  maxAmount: number | null;
  requiredApprovals: number;
  distinctApprovers: boolean;
  description?: string | null;
}

/**
 * Regras de aprovação aplicáveis: as da empresa quando existem, caso contrário
 * as globais (companyId NULL).
 */
export const getApprovalRules = async (companyId: number): Promise<ApprovalRuleRow[]> => {
  const rows: any[] = await ApprovalRuleModel.findAll({
    where: { companyId: Number(companyId), active: true },
    order: [["minAmount", "ASC"]],
    raw: true,
  });
  if (rows.length > 0) return rows as ApprovalRuleRow[];

  const globals: any[] = await ApprovalRuleModel.findAll({
    where: { companyId: null as any, active: true },
    order: [["minAmount", "ASC"]],
    raw: true,
  });
  return globals as ApprovalRuleRow[];
};

const toNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface AuthorityEvaluation {
  allowed: boolean;
  rule: ApprovalRuleRow | null;
  requiredApprovals: number;
  distinctApprovers: boolean;
  isCommittee: boolean;
  /** Limite máximo da alçada do papel (para a mensagem de insuficiência). */
  limit: number | null;
  message?: string;
}

/**
 * Avalia a alçada de um papel para aprovar um crédito de `amount` MZN.
 * Sem correspondência → `allowed: false` com a mensagem de alçada insuficiente.
 */
export const evaluateAuthority = (params: {
  userRole: any;
  amount: any;
  rules: ApprovalRuleRow[];
}): AuthorityEvaluation => {
  const { userRole, rules } = params;
  const amount = toNumber(params.amount);
  const family = roleFamily(userRole);

  const familyRules = rules.filter((r) => r.role === family);
  const limit = familyRules.reduce(
    (max, r) => (r.maxAmount === null ? null : Math.max(max === null ? -Infinity : max, toNumber(r.maxAmount))),
    null as number | null
  );

  if (!family) {
    return {
      allowed: false,
      rule: null,
      requiredApprovals: 0,
      distinctApprovers: false,
      isCommittee: false,
      limit: 0,
      message: `Sem alçada de aprovação: o papel ${roleLabel(userRole)} não pode aprovar créditos. Requer aprovação da Administração.`,
    };
  }

  // Família sem regras (ex.: Gestor de Crédito — alçada retirada): sem
  // autoridade de aprovação nenhuma.
  if (familyRules.length === 0) {
    return {
      allowed: false,
      rule: null,
      requiredApprovals: 0,
      distinctApprovers: false,
      isCommittee: false,
      limit: 0,
      message: `Alçada insuficiente: ${roleLabel(userRole)} não tem alçada de aprovação — a aprovação e o desembolso de créditos são exclusivos do Administrador. O Gestor de Crédito lança e valida a instrução do processo.`,
    };
  }

  const rule = familyRules.find(
    (r) =>
      amount >= toNumber(r.minAmount) &&
      (r.maxAmount === null || r.maxAmount === undefined || amount <= toNumber(r.maxAmount))
  );

  if (!rule) {
    const limitLabel = limit === null ? "valor ilimitado" : `${fmtMoney(limit)} MZN`;
    const higher =
      family === "GESTOR"
        ? "Requer aprovação da Administração (alçada até 100.000,00 MZN; acima disso, Comitê de Crédito)."
        : "Requer mais aprovações da Administração (Comitê de Crédito).";
    return {
      allowed: false,
      rule: null,
      requiredApprovals: 0,
      distinctApprovers: false,
      isCommittee: false,
      limit: limit === null ? null : limit,
      message: `Alçada insuficiente: ${roleLabel(userRole)} pode aprovar até ${limitLabel} e este crédito é de ${fmtMoney(amount)} MZN. ${higher}`,
    };
  }

  const requiredApprovals = Math.max(1, toNumber(rule.requiredApprovals) || 1);
  return {
    allowed: true,
    rule,
    requiredApprovals,
    distinctApprovers: !!rule.distinctApprovers,
    isCommittee: requiredApprovals >= 2,
    limit: rule.maxAmount === null || rule.maxAmount === undefined ? null : toNumber(rule.maxAmount),
  };
};

// ── Estado do crédito ──────────────────────────────────────────────────────
/** Estado de workflow do crédito — deriva do status legado se a coluna for nula. */
export const normalizeApprovalState = (loan: any): LoanApprovalState => {
  const raw = String(loan?.getDataValue?.("approvalState") ?? loan?.approvalState ?? "").trim();
  if (raw && APPROVAL_STATE_LABELS[raw]) return raw as LoanApprovalState;

  const status = Number(loan?.getDataValue?.("status") ?? loan?.status ?? 0);
  if (status === 1 || status === 3) return LOAN_APPROVAL_STATES.DESEMBOLSADO;
  if (status === 2 || status === -1) return LOAN_APPROVAL_STATES.REPROVADO;
  return LOAN_APPROVAL_STATES.AGUARDANDO_APROVACAO;
};

/** Status legado compatível com o estado de workflow (dashboards/relatórios). */
const legacyStatusFor = (state: LoanApprovalState): number => {
  if (state === LOAN_APPROVAL_STATES.REPROVADO) return -1;
  if (state === LOAN_APPROVAL_STATES.DESEMBOLSADO) return 1;
  return 0;
};

// ── Linha do tempo ─────────────────────────────────────────────────────────
const recordEvent = async (params: {
  loan: any;
  event: string;
  actor: ApprovalActor | null;
  notes?: string | null;
  approvalsCount?: number | null;
  requiredApprovals?: number | null;
}) => {
  const { loan, event, actor } = params;
  await LoanApprovalModel.create({
    loanId: Number(loan.getDataValue?.("id") ?? loan.id),
    companyId: Number(loan.getDataValue?.("companyId") ?? loan.companyId),
    event,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    actorRole: actor ? roleLabel(actor.role) : "Sistema",
    amount: toNumber(loan.getDataValue?.("amount") ?? loan.amount),
    approvalsCount: params.approvalsCount ?? null,
    requiredApprovals: params.requiredApprovals ?? null,
    notes: params.notes?.trim() ? params.notes.trim() : null,
  });
};

/**
 * Snapshot das aprovações VÁLIDAS do crédito: só contam as aprovações
 * posteriores ao último evento invalidante (reprovação/reabertura).
 */
export const getApprovalSnapshot = async (loanId: number) => {
  const events: any[] = await LoanApprovalModel.findAll({
    where: { loanId: Number(loanId) },
    order: [["id", "ASC"]],
    raw: true,
  });

  let lastInvalidationId = 0;
  for (const event of events) {
    if (INVALIDATING_EVENTS.includes(String(event.event))) {
      lastInvalidationId = Math.max(lastInvalidationId, Number(event.id));
    }
  }

  const approvals = events.filter(
    (e) => String(e.event) === APPROVAL_EVENTS.APROVACAO && Number(e.id) > lastInvalidationId
  );

  return {
    events,
    approvals,
    approvalsCount: approvals.length,
    approverIds: approvals.map((a) => Number(a.actorId)).filter((id) => id > 0),
  };
};

/** Linha do tempo completa do crédito (para o frontend). */
export const getApprovalTimeline = async (loanId: number) => {
  const snapshot = await getApprovalSnapshot(loanId);
  return snapshot.events.map((event: any) => ({
    id: Number(event.id),
    event: String(event.event),
    eventLabel: APPROVAL_EVENT_LABELS[String(event.event)] || String(event.event),
    actorId: event.actorId ? Number(event.actorId) : null,
    actorName: event.actorName || null,
    actorRole: event.actorRole || null,
    amount: event.amount === null ? null : toNumber(event.amount),
    approvalsCount: event.approvalsCount === null ? null : Number(event.approvalsCount),
    requiredApprovals: event.requiredApprovals === null ? null : Number(event.requiredApprovals),
    notes: event.notes || null,
    createdAt: event.createdAt,
  }));
};

// ── Notificações ao mutuário (mesmo padrão do updateLoan) ─────────────────
const notifyCustomer = async (params: {
  loan: any;
  title: string;
  message: string;
  type: string;
}) => {
  try {
    const accountNumber = params.loan.getDataValue?.("accountNumber") ?? params.loan.accountNumber;
    const companyId = params.loan.getDataValue?.("companyId") ?? params.loan.companyId;
    const customer: any = await CustomerModel.findOne({
      where: { accountNumber, companyId },
      attributes: ["id"],
    });
    if (!customer) return;
    await NotificationModel.create({
      companyId,
      recipientType: "customer",
      recipientId: Number(customer.getDataValue?.("id") ?? customer.id),
      title: params.title,
      message: params.message,
      type: params.type,
      referenceId: Number(params.loan.getDataValue?.("id") ?? params.loan.id),
      isRead: false,
    });
  } catch (error: any) {
    console.error("[Alçadas] Falha ao notificar mutuário:", error?.message || error);
  }
};

const loanAmountLabel = (loan: any): string =>
  fmtMoney(loan.getDataValue?.("amount") ?? loan.amount);

// ── Acções do ciclo ────────────────────────────────────────────────────────

const loadLoan = async (loanId: number, actor?: ApprovalActor): Promise<any> => {
  const loan: any = await LoanModel.findByPk(Number(loanId));
  if (!loan) {
    throw new ApprovalError(404, "NOT_FOUND", "Crédito não encontrado.");
  }
  const companyId = Number(loan.getDataValue("companyId"));
  if (actor?.companyId && companyId !== Number(actor.companyId)) {
    throw new ApprovalError(404, "NOT_FOUND", "Crédito não encontrado.");
  }
  return loan;
};

const setState = async (loan: any, state: LoanApprovalState) => {
  await loan.update({ approvalState: state, status: legacyStatusFor(state) });
};

/** RASCUNHO → AGUARDANDO_APROVACAO (submissão para decisão). */
export const submitLoanForApproval = async (params: {
  loanId: number;
  actor: ApprovalActor;
  notes?: string | null;
}) => {
  // Validação da instrução = submissão para aprovação. Gestor e Admin.
  if (!roleFamily(params.actor.role)) {
    throw new ApprovalError(
      403,
      "FORBIDDEN",
      "Apenas o Gestor de Crédito ou o Administrador podem validar e submeter instruções de crédito."
    );
  }
  const loan = await loadLoan(params.loanId, params.actor);
  const state = normalizeApprovalState(loan);
  if (state !== LOAN_APPROVAL_STATES.RASCUNHO) {
    throw new ApprovalError(
      409,
      "INVALID_STATE",
      `Só um rascunho pode ser submetido para aprovação (estado actual: ${approvalStateLabel(state)}).`
    );
  }
  await setState(loan, LOAN_APPROVAL_STATES.AGUARDANDO_APROVACAO);
  await recordEvent({
    loan,
    event: APPROVAL_EVENTS.SUBMISSAO,
    actor: params.actor,
    notes: params.notes,
  });
  return { state: LOAN_APPROVAL_STATES.AGUARDANDO_APROVACAO };
};

/**
 * APROVAR — decisão com alçada. NÃO mexe no caixa.
 * Uma aprovação por aprovador; quando a regra exige N aprovações
 * (Comitê de Crédito), o estado intermédio é APROVADO_PARCIALMENTE.
 */
export const approveLoan = async (params: {
  loanId: number;
  actor: ApprovalActor;
  notes?: string | null;
}) => {
  const loan = await loadLoan(params.loanId, params.actor);
  const state = normalizeApprovalState(loan);
  const amount = toNumber(loan.getDataValue("amount"));

  if (
    state !== LOAN_APPROVAL_STATES.AGUARDANDO_APROVACAO &&
    state !== LOAN_APPROVAL_STATES.APROVADO_PARCIALMENTE
  ) {
    throw new ApprovalError(
      409,
      "INVALID_STATE",
      `O crédito não está em aprovação (estado actual: ${approvalStateLabel(state)}).`
    );
  }

  // ── ALÇADA ──
  const rules = await getApprovalRules(Number(loan.getDataValue("companyId")));
  const authority = evaluateAuthority({
    userRole: params.actor.role,
    amount,
    rules,
  });
  if (!authority.allowed) {
    throw new ApprovalError(403, "INSUFFICIENT_AUTHORITY", authority.message || "Alçada insuficiente.");
  }

  // ── CAPACIDADE DE PAGAMENTO (regra existente: 1/3 do rendimento) ──
  // Dentro da regra ou com parecer registado (mín. 10 caracteres).
  const capacity = await validateCapacityRule({
    accountNumber: loan.getDataValue("accountNumber"),
    companyId: loan.getDataValue("companyId"),
    amount,
    interestRate: loan.getDataValue("interestRate"),
    numberOfInstallments: loan.getDataValue("numberOfInstallments"),
    capacityExcessObservation: params.notes,
  });
  if (!capacity.valid) {
    throw new ApprovalError(
      capacity.statusCode || 400,
      "CAPACITY_EXCEEDED",
      capacity.message || "A prestação excede 1/3 do rendimento mensal."
    );
  }
  const notes = capacity.normalizedObservation || params.notes || null;

  // ── GARANTIAS: cobertura mínima também para APROVAR (regra existente) ──
  const coverage = await getGuaranteeCoverage({ loan });
  if (!coverage.covered) {
    throw new ApprovalError(
      400,
      "GUARANTEE_COVERAGE",
      guaranteeCoverageMessage(coverage) ||
        "Garantias insuficientes para aprovar o crédito."
    );
  }

  // ── APROVADORES DISTINTOS (Comitê de Crédito) ──
  const snapshot = await getApprovalSnapshot(Number(loan.getDataValue("id")));
  if (params.actor.id && snapshot.approverIds.includes(Number(params.actor.id))) {
    throw new ApprovalError(
      409,
      "DUPLICATE_APPROVER",
      `Aprovação repetida: ${params.actor.name || "este utilizador"} já aprovou este crédito e o Comitê de Crédito exige aprovações de Admins diferentes.`
    );
  }

  const required = authority.requiredApprovals;
  const count = snapshot.approvalsCount + 1;
  const nextState: LoanApprovalState =
    count >= required
      ? LOAN_APPROVAL_STATES.APROVADO
      : LOAN_APPROVAL_STATES.APROVADO_PARCIALMENTE;

  await recordEvent({
    loan,
    event: APPROVAL_EVENTS.APROVACAO,
    actor: params.actor,
    notes,
    approvalsCount: count,
    requiredApprovals: required,
  });
  await setState(loan, nextState);

  if (nextState === LOAN_APPROVAL_STATES.APROVADO) {
    await notifyCustomer({
      loan,
      title: "Crédito aprovado",
      message: `O seu crédito de ${loanAmountLabel(loan)} MZN foi aprovado. O desembolso será processado em breve.`,
      type: "loan_approved",
    });
  }

  return {
    state: nextState,
    approvalsCount: count,
    requiredApprovals: required,
    isCommittee: authority.isCommittee,
    ruleDescription: authority.rule?.description || null,
  };
};

/** REPROVAR — decisão negativa com parecer. NÃO mexe no caixa. */
export const rejectLoan = async (params: {
  loanId: number;
  actor: ApprovalActor;
  reason?: string | null;
}) => {
  assertAdmin(params.actor, "reprovar créditos");
  const loan = await loadLoan(params.loanId, params.actor);
  const state = normalizeApprovalState(loan);

  if (state === LOAN_APPROVAL_STATES.DESEMBOLSADO) {
    throw new ApprovalError(
      409,
      "INVALID_STATE",
      "Um crédito já desembolsado não pode ser reprovado — use a invalidação de desembolso."
    );
  }
  if (state === LOAN_APPROVAL_STATES.REPROVADO) {
    throw new ApprovalError(409, "INVALID_STATE", "O crédito já está reprovado.");
  }

  await recordEvent({
    loan,
    event: APPROVAL_EVENTS.REPROVACAO,
    actor: params.actor,
    notes: params.reason,
  });
  await setState(loan, LOAN_APPROVAL_STATES.REPROVADO);

  await notifyCustomer({
    loan,
    title: "Crédito não aprovado",
    message: `O seu pedido de crédito de ${loanAmountLabel(loan)} MZN não foi aprovado.`,
    type: "loan_rejected",
  });

  return { state: LOAN_APPROVAL_STATES.REPROVADO };
};

/** REABRIR (reprovação → nova análise). Invalida aprovações anteriores. */
export const reopenLoanForApproval = async (params: {
  loanId: number;
  actor: ApprovalActor;
  notes?: string | null;
}) => {
  const loan = await loadLoan(params.loanId, params.actor);
  const state = normalizeApprovalState(loan);
  if (state !== LOAN_APPROVAL_STATES.REPROVADO) {
    throw new ApprovalError(
      409,
      "INVALID_STATE",
      `Só um crédito reprovado pode ser reaberto (estado actual: ${approvalStateLabel(state)}).`
    );
  }
  await recordEvent({
    loan,
    event: APPROVAL_EVENTS.REABERTURA,
    actor: params.actor,
    notes: params.notes,
  });
  await setState(loan, LOAN_APPROVAL_STATES.AGUARDANDO_APROVACAO);
  return { state: LOAN_APPROVAL_STATES.AGUARDANDO_APROVACAO };
};

/**
 * PREPARAR DESEMBOLSO — APROVADO → AGUARDANDO_DESEMBOLSO.
 * Marca o crédito como pronto/na fila de desembolso. NÃO mexe no caixa.
 */
export const prepareLoanDisbursement = async (params: {
  loanId: number;
  actor: ApprovalActor;
  notes?: string | null;
}) => {
  assertAdmin(params.actor, "preparar o desembolso");
  const loan = await loadLoan(params.loanId, params.actor);
  const state = normalizeApprovalState(loan);
  if (state !== LOAN_APPROVAL_STATES.APROVADO) {
    throw new ApprovalError(
      409,
      "INVALID_STATE",
      `Só um crédito aprovado pode ser preparado para desembolso (estado actual: ${approvalStateLabel(state)}).`
    );
  }

  // ── GARANTIAS: a fila de desembolso só recebe créditos com garantias ──
  // Revalidado aqui (e não só na aprovação) porque as garantias podem ser
  // eliminadas depois de aprovadas — o desembolso não pode acontecer sem a
  // base de análise registada.
  const coverage = await getGuaranteeCoverage({ loan });
  if (!coverage.covered) {
    throw new ApprovalError(
      400,
      coverage.reason === "NO_GUARANTEES" ? "GARANTIAS_AUSENTES" : "GUARANTEE_COVERAGE",
      guaranteeCoverageMessage(coverage)
    );
  }

  await recordEvent({
    loan,
    event: APPROVAL_EVENTS.PREPARACAO_DESEMBOLSO,
    actor: params.actor,
    notes: params.notes,
  });
  await setState(loan, LOAN_APPROVAL_STATES.AGUARDANDO_DESEMBOLSO);
  return { state: LOAN_APPROVAL_STATES.AGUARDANDO_DESEMBOLSO };
};

/** Garante que o crédito pode ser desembolsado (aprovação completa). */
export const assertDisbursable = (loan: any): { ok: boolean; state: LoanApprovalState; message?: string } => {
  const state = normalizeApprovalState(loan);
  if (DISBURSABLE_STATES.includes(state)) return { ok: true, state };
  return {
    ok: false,
    state,
    message:
      `Desembolso bloqueado: o crédito está em "${approvalStateLabel(state)}" e só sai depois de aprovado ` +
      `pelas alçadas aplicáveis (Gestor até 25.000 MZN · Admin até 100.000 MZN · acima, Comitê de Crédito com 2 Admins).`,
  };
};

/**
 * DESEMBOLSADO — chamado DEPOIS do desembolso efectivo (plano criado e caixa
 * movimentado). Idempotente: se já estiver desembolsado, não duplica eventos.
 */
export const markLoanDisbursed = async (params: {
  loanId: number;
  actor: ApprovalActor;
  notes?: string | null;
}) => {
  const loan = await loadLoan(params.loanId, params.actor);
  const state = normalizeApprovalState(loan);
  if (state === LOAN_APPROVAL_STATES.DESEMBOLSADO) {
    return { state, changed: false };
  }
  await recordEvent({
    loan,
    event: APPROVAL_EVENTS.DESEMBOLSO,
    actor: params.actor,
    notes: params.notes,
  });
  await setState(loan, LOAN_APPROVAL_STATES.DESEMBOLSADO);
  return { state: LOAN_APPROVAL_STATES.DESEMBOLSADO, changed: true };
};

/**
 * Evento de desembolso na linha do tempo SEM transição de estado — o estado
 * (DESEMBOLSADO) é definido atomicamente no próprio desembolso.
 */
export const recordLoanDisbursementEvent = async (params: {
  loanId: number;
  actor: ApprovalActor;
  notes?: string | null;
}) => {
  const loan = await loadLoan(params.loanId, params.actor);
  await recordEvent({
    loan,
    event: APPROVAL_EVENTS.DESEMBOLSO,
    actor: params.actor,
    notes: params.notes,
  });
};

/** Desembolso invalidado → o crédito volta a AGUARDANDO_DESEMBOLSO. */
export const invalidateLoanDisbursement = async (params: {
  loanId: number;
  actor: ApprovalActor;
  notes?: string | null;
}) => {
  assertAdmin(params.actor, "invalidar o desembolso");
  const loan = await loadLoan(params.loanId, params.actor);
  await recordEvent({
    loan,
    event: APPROVAL_EVENTS.INVALIDACAO_DESEMBOLSO,
    actor: params.actor,
    notes: params.notes,
  });
  await setState(loan, LOAN_APPROVAL_STATES.AGUARDANDO_DESEMBOLSO);
  return { state: LOAN_APPROVAL_STATES.AGUARDANDO_DESEMBOLSO };
};

/** Criação do crédito: rascunho ou submissão imediata. */
export const recordLoanCreation = async (params: {
  loanId: number;
  actor: ApprovalActor | null;
  asDraft: boolean;
  notes?: string | null;
}) => {
  const loan = await loadLoan(params.loanId, params.actor || undefined);
  const state = params.asDraft
    ? LOAN_APPROVAL_STATES.RASCUNHO
    : LOAN_APPROVAL_STATES.AGUARDANDO_APROVACAO;
  await loan.update({ approvalState: state, status: legacyStatusFor(state) });
  await recordEvent({
    loan,
    event: params.asDraft ? APPROVAL_EVENTS.CRIACAO : APPROVAL_EVENTS.SUBMISSAO,
    actor: params.actor,
    notes: params.notes,
  });
  return { state };
};

/**
 * Resumo da alçada de um papel para um dado valor — para o frontend mostrar
 * (antes da tentativa) quem aprova o quê e quantas aprovações são necessárias.
 */
export const describeAuthority = async (params: {
  companyId: number;
  userRole: any;
  amount: any;
}) => {
  const rules = await getApprovalRules(params.companyId);
  const authority = evaluateAuthority({
    userRole: params.userRole,
    amount: params.amount,
    rules,
  });
  return {
    rules,
    userRole: params.userRole,
    userRoleLabel: roleLabel(params.userRole),
    family: roleFamily(params.userRole),
    amount: toNumber(params.amount),
    allowed: authority.allowed,
    requiredApprovals: authority.requiredApprovals,
    distinctApprovers: authority.distinctApprovers,
    isCommittee: authority.isCommittee,
    limit: authority.limit,
    message: authority.message || null,
  };
};


