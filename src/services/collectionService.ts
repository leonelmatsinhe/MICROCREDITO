import { Op } from "sequelize";
import { db } from "../database/db";
import { CustomerModel } from "../database/models/CustomerModel";
import { CollectionActivityModel } from "../database/models/CollectionActivityModel";
import { LoanModel } from "../database/models/LoanModel";
import { UserModel } from "../database/models/UserModel";
import { RequestActor, isGestor } from "../utils/requestActor";

/**
 * COBRANÇA DE CAMPO + CARTEIRA POR GESTOR (SPRINT 6)
 *
 * Cada cliente e cada crédito pertencem a um Gestor (`creditManager`). O
 * Gestor só vê e opera a SUA carteira; o Admin vê tudo e o ranking por gestor.
 *
 * Atividades de cobrança (tabela `collection_activities`):
 *   VISITA_DOMICILIAR · LIGACAO_TELEFONICA · PROMESSA_PAGAMENTO · RECUSA
 * A promessa de pagamento guarda data prometida, valor prometido, observação e
 * localização GPS (quando o dispositivo a disponibiliza).
 */

export class CollectionError extends Error {
  http: number;
  code: string;
  constructor(http: number, code: string, message: string) {
    super(message);
    this.http = http;
    this.code = code;
  }
}

export const ACTIVITY_TYPES = [
  "VISITA_DOMICILIAR",
  "LIGACAO_TELEFONICA",
  "PROMESSA_PAGAMENTO",
  "RECUSA",
] as const;

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  VISITA_DOMICILIAR: "Visita domiciliária",
  LIGACAO_TELEFONICA: "Ligação telefónica",
  PROMESSA_PAGAMENTO: "Promessa de pagamento",
  RECUSA: "Recusa",
};

const toNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const today = (): string => new Date().toISOString().slice(0, 10);

// ── Escopo de carteira ─────────────────────────────────────────────────────
// A carteira do Gestor de Crédito é feita de três coisas:
//   1. os clientes atribuídos a ele (`customers.creditManager`);
//   2. os créditos atribuídos a ele (`customer_loans.creditManager`);
//   3. os clientes DISPONÍVEIS — sem gestor válido, ou seja, `creditManager`
//      nulo ou a apontar para um utilizador que já não é Gestor de Crédito da
//      empresa (um gestor apagado, um Administrador antigo).
// Sem o ponto 3 a carteira nascia vazia sempre que o histórico viesse de um
// utilizador apagado. Com ele, esses clientes aparecem como **disponíveis** na
// página «A Minha Carteira» e podem ser assumidos com `claimClient`.

/** Sub-select dos Gestores de Crédito da empresa do próprio registo. */
const gestoresDaEmpresa = (alias: string) =>
  `(SELECT u.id FROM users u WHERE u.companyId = ${alias}.companyId AND u.userRole = 3)`;

/** Sem dono válido: nulo ou de um utilizador que já não é Gestor de Crédito. */
const semGestorValido = (alias: string) =>
  `(${alias}.creditManager IS NULL OR ${alias}.creditManager NOT IN ${gestoresDaEmpresa(alias)})`;

/**
 * Cliente na carteira do gestor: é dele, tem crédito dele, ou está disponível.
 * O id é um número já validado (não vem do pedido), por isso é inlined.
 */
const clienteNaCarteiraSql = (actor: RequestActor) => {
  const id = Number(actor.id);
  return `AND (
        c.creditManager = ${id}
        OR ${semGestorValido("c")}
        OR EXISTS (SELECT 1 FROM customer_loans lc WHERE lc.customerId = c.id AND lc.creditManager = ${id})
      )`;
};

/**
 * Crédito na carteira do gestor: é dele, ou não tem gestor válido e o cliente
 * é dele (ou também está disponível). O crédito de outro gestor activo nunca
 * entra — evita contar o mesmo dinheiro em duas carteiras.
 */
const creditoNaCarteiraSql = (
  actor: RequestActor,
  loanAlias = "l",
  customerAlias = "c"
) => {
  const id = Number(actor.id);
  return `AND (
        ${loanAlias}.creditManager = ${id}
        OR (${semGestorValido(loanAlias)}
            AND (${customerAlias}.creditManager = ${id} OR ${semGestorValido(customerAlias)}))
      )`;
};

/** O id pertence a um Gestor de Crédito desta empresa? */
const isGestorValido = async (companyId: number, userId: number | null): Promise<boolean> => {
  if (!userId) return false;
  const row: any = await UserModel.findOne({
    where: { id: userId, companyId, userRole: 3 },
    attributes: ["id"],
    raw: true,
  });
  return !!row;
};

/**
 * Garante que o actor pode operar sobre o cliente: o Gestor opera a SUA
 * carteira e os clientes disponíveis (sem gestor válido) — é assim que a
 * cobrança funciona logo, sem esperar por uma atribuição.
 */
const assertCustomerInPortfolio = async (actor: RequestActor, customer: any) => {
  if (!isGestor(actor)) return;
  const customerGestor = Number(customer.getDataValue("creditManager")) || null;
  const loan: any = await LoanModel.findOne({
    where: { customerId: Number(customer.getDataValue("id")) },
    order: [["id", "DESC"]],
    attributes: ["creditManager"],
    raw: true,
  });
  const loanGestor = Number(loan?.creditManager) || null;
  const mine = customerGestor === Number(actor.id) || loanGestor === Number(actor.id);
  if (mine) return;
  const available = !(await isGestorValido(actor.companyId, customerGestor));
  if (available) return;
  throw new CollectionError(
    403,
    "OUT_OF_PORTFOLIO",
    "Este cliente pertence a outro Gestor de Crédito. Assuma a carteira ou peça a transferência ao Administrador."
  );
};

// ── Registo de atividade ───────────────────────────────────────────────────
export const registerActivity = async (params: {
  actor: RequestActor;
  accountNumber: any;
  activityType: string;
  loanId?: any;
  promisedDate?: any;
  promisedAmount?: any;
  notes?: any;
  latitude?: any;
  longitude?: any;
  gpsAccuracy?: any;
}) => {
  const { actor } = params;
  const activityType = String(params.activityType || "").trim().toUpperCase();
  if (!(ACTIVITY_TYPES as readonly string[]).includes(activityType)) {
    throw new CollectionError(
      400,
      "INVALID_ACTIVITY_TYPE",
      `Tipo de atividade inválido. Use: ${ACTIVITY_TYPES.join(" · ")}.`
    );
  }

  const accountNumber = Number(params.accountNumber) || 0;
  if (!accountNumber) {
    throw new CollectionError(400, "INVALID_ACCOUNT", "Indique a conta do mutuário.");
  }

  const customer: any = await CustomerModel.findOne({
    where: { companyId: Number(actor.companyId), accountNumber },
  });
  if (!customer) {
    throw new CollectionError(404, "CUSTOMER_NOT_FOUND", "Mutuário não encontrado.");
  }
  await assertCustomerInPortfolio(actor, customer);

  // Promessa de pagamento: data prometida + valor prometido são obrigatórios.
  let promisedDate: string | null = null;
  let promisedAmount: number | null = null;
  if (activityType === "PROMESSA_PAGAMENTO") {
    const rawDate = String(params.promisedDate || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      throw new CollectionError(
        400,
        "INVALID_PROMISE_DATE",
        "A promessa de pagamento exige a data prometida (YYYY-MM-DD)."
      );
    }
    const amount = toNumber(params.promisedAmount);
    if (amount <= 0) {
      throw new CollectionError(
        400,
        "INVALID_PROMISE_AMOUNT",
        "A promessa de pagamento exige o valor prometido (maior que zero)."
      );
    }
    promisedDate = rawDate;
    promisedAmount = round2(amount);
  }

  // GPS opcional ("se possível localização GPS").
  const latitude = params.latitude === undefined || params.latitude === null || params.latitude === ""
    ? null
    : toNumber(params.latitude);
  const longitude = params.longitude === undefined || params.longitude === null || params.longitude === ""
    ? null
    : toNumber(params.longitude);
  const gpsAccuracy =
    params.gpsAccuracy === undefined || params.gpsAccuracy === null || params.gpsAccuracy === ""
      ? null
      : toNumber(params.gpsAccuracy);

  const notes = typeof params.notes === "string" && params.notes.trim() ? params.notes.trim() : null;

  const activity = await CollectionActivityModel.create({
    companyId: Number(actor.companyId),
    customerId: Number(customer.getDataValue("id")),
    accountNumber,
    loanId: params.loanId ? Number(params.loanId) : null,
    activityType,
    activityDate: new Date(),
    promisedDate,
    promisedAmount,
    notes,
    latitude,
    longitude,
    gpsAccuracy,
    status: activityType === "PROMESSA_PAGAMENTO" ? "PENDENTE" : "REGISTADO",
    createdBy: actor.id,
    createdByName: actor.name,
  });

  return {
    id: Number(activity.getDataValue("id")),
    activityType,
    activityLabel: ACTIVITY_TYPE_LABELS[activityType],
    promisedDate,
    promisedAmount,
  };
};

// ── Histórico de atividades (prova de cobrança) ────────────────────────────
export const listActivities = async (params: {
  actor: RequestActor;
  accountNumber?: any;
  customerId?: any;
  activityType?: any;
  createdBy?: any;
  dateFrom?: any;
  dateTo?: any;
  limit?: any;
}) => {
  const where: any = { companyId: Number(params.actor.companyId) };
  if (params.accountNumber) where.accountNumber = Number(params.accountNumber);
  if (params.customerId) where.customerId = Number(params.customerId);
  if (params.activityType) where.activityType = String(params.activityType).toUpperCase();
  if (params.dateFrom || params.dateTo) {
    where.activityDate = {
      ...(params.dateFrom ? { [Op.gte]: new Date(`${String(params.dateFrom).slice(0, 10)}T00:00:00`) } : {}),
      ...(params.dateTo ? { [Op.lte]: new Date(`${String(params.dateTo).slice(0, 10)}T23:59:59`) } : {}),
    };
  }

  // Escopo: o Gestor vê as atividades DA SUA CARTEIRA (as que ele registou e
  // as registadas por colegas sobre clientes seus); o Admin filtra por gestor.
  if (isGestor(params.actor)) {
    where[Op.or] = [
      { createdBy: Number(params.actor.id) },
      { accountNumber: { [Op.in]: await portfolioAccountNumbers(params.actor) } },
    ];
  } else if (params.createdBy) {
    where.createdBy = Number(params.createdBy);
  }

  const limit = Math.min(500, Math.max(1, toNumber(params.limit) || 100));
  const rows: any[] = await CollectionActivityModel.findAll({
    where,
    order: [["activityDate", "DESC"], ["id", "DESC"]],
    limit,
    raw: true,
  });

  return rows.map((row: any) => ({
    ...row,
    activityLabel: ACTIVITY_TYPE_LABELS[String(row.activityType)] || row.activityType,
    promisedAmount: row.promisedAmount === null ? null : toNumber(row.promisedAmount),
  }));
};

/** Contas (accountNumber) na carteira do gestor — mesmos três vínculos. */
const portfolioAccountNumbers = async (actor: RequestActor): Promise<number[]> => {
  if (!isGestor(actor) || !actor.id) return [];
  const id = Number(actor.id);
  const [rows]: any = await db.query(
    `SELECT DISTINCT c.accountNumber AS accountNumber
       FROM customers c
      WHERE c.companyId = ?
        AND (
          c.creditManager = ${id}
          OR ${semGestorValido("c")}
          OR EXISTS (SELECT 1 FROM customer_loans lc WHERE lc.customerId = c.id AND lc.creditManager = ${id})
        )`,
    { replacements: [Number(actor.companyId)] }
  );
  return (rows as any[]).map((row: any) => Number(row.accountNumber)).filter((n) => n > 0);
};

// ── Clientes com prestações vencidas (página Cobrança) ─────────────────────
export const listOverdue = async (params: {
  actor: RequestActor;
  minDays?: any;
  maxDays?: any;
  search?: any;
  limit?: any;
}) => {
  const minDays = Math.max(1, toNumber(params.minDays) || 1);
  const maxDaysParam = toNumber(params.maxDays);
  const maxDays = maxDaysParam > 0 ? Math.max(minDays, maxDaysParam) : 3650;

  // Ordem dos placeholders: companyId · minDays · maxDays · [search ×2]
  // (o id do gestor vai inlined no escopo, já validado)
  const scoped = isGestor(params.actor) && !!params.actor.id;
  const replacements: any[] = [Number(params.actor.companyId), minDays, maxDays];
  const scopeSql = scoped ? clienteNaCarteiraSql(params.actor) : "";

  const limit = Math.min(500, Math.max(1, toNumber(params.limit) || 200));
  const searchSql = params.search ? "AND (c.customerName LIKE ? OR c.accountNumber = ?)" : "";
  if (params.search) {
    replacements.push(`%${params.search}%`, Number(params.search) || 0);
  }

  const [rows]: any = await db.query(
    `SELECT c.id AS customerId,
            c.accountNumber,
            c.customerName,
            c.customerPhone,
            c.creditManager AS customerGestor,
            l.creditManager AS loanGestor,
            COUNT(a.id) AS overdueCount,
            MAX(DATEDIFF(CURDATE(), a.dueDate)) AS maxDaysLate,
            MIN(a.dueDate) AS oldestDueDate,
            SUM(GREATEST(a.installment - IFNULL(a.paidAmount, 0), 0)) AS totalOverdue
       FROM amortization_loans a
       JOIN customer_loans l ON l.id = a.loanId
       JOIN customers c ON c.id = l.customerId
      WHERE a.companyId = ?
        AND l.status = 1
        AND a.dueDate < CURDATE()
        AND IFNULL(a.paidAmount, 0) < a.installment
        AND DATEDIFF(CURDATE(), a.dueDate) BETWEEN ? AND ?
        ${scopeSql}
        ${searchSql}
      GROUP BY c.id, c.accountNumber, c.customerName, c.customerPhone, c.creditManager, l.creditManager
      ORDER BY maxDaysLate DESC
      LIMIT ${limit}`,
    { replacements }
  );

  // Última atividade de cobrança por conta (prova do que já foi feito).
  const accounts = (rows as any[]).map((row: any) => Number(row.accountNumber));
  const lastByAccount = new Map<number, any>();
  if (accounts.length > 0) {
    const [activities]: any = await db.query(
      `SELECT accountNumber, activityType, activityDate, createdByName
         FROM collection_activities
        WHERE companyId = ? AND accountNumber IN (${accounts.map(() => "?").join(",")})
        ORDER BY activityDate DESC`,
      { replacements: [Number(params.actor.companyId), ...accounts] }
    );
    for (const activity of activities as any[]) {
      const key = Number(activity.accountNumber);
      if (!lastByAccount.has(key)) lastByAccount.set(key, activity);
    }
  }

  return (rows as any[]).map((row: any) => {
    const last = lastByAccount.get(Number(row.accountNumber)) || null;
    return {
      customerId: Number(row.customerId),
      accountNumber: Number(row.accountNumber),
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      overdueCount: Number(row.overdueCount),
      maxDaysLate: Number(row.maxDaysLate),
      oldestDueDate: row.oldestDueDate,
      totalOverdue: round2(toNumber(row.totalOverdue)),
      lastActivity: last
        ? {
            activityType: String(last.activityType),
            activityLabel: ACTIVITY_TYPE_LABELS[String(last.activityType)] || last.activityType,
            activityDate: last.activityDate,
            createdByName: last.createdByName,
          }
        : null,
    };
  });
};

// ── Dashboard do Gestor ────────────────────────────────────────────────────
/**
 * Indicadores da carteira do gestor:
 *   - total da carteira (capital em dívida dos créditos activos);
 *   - PAR 30 (dívida dos créditos com prestações vencidas > 30 dias);
 *   - valor a receber hoje (prestações que vencem hoje e ainda não pagas);
 *   - promessas do dia (prometidas para hoje) + contadores de atividade
 *     (visitas/chamadas/promessas/recusas do mês — prova de cobrança).
 */
export const gestorDashboard = async (params: { actor: RequestActor; gestorId?: any }) => {
  const actor = params.actor;
  const gestorId = isGestor(actor)
    ? Number(actor.id)
    : params.gestorId
      ? Number(params.gestorId)
      : 0;

  if (isGestor(actor) && !gestorId) {
    throw new CollectionError(400, "INVALID_GESTOR", "Gestor não identificado.");
  }

  // Mesma fronteira do ecrã «A Minha Carteira»: os meus créditos + os que não
  // têm gestor válido (os clientes disponíveis). Sem isto, a carteira de um
  // gestor novo, ou que herde clientes de um utilizador apagado, ficava a zero.
  const scopeLoans = gestorId ? creditoNaCarteiraSql({ ...actor, id: gestorId }) : "";
  const loanReplacements = [Number(actor.companyId)];
  const joinCustomers = gestorId ? "JOIN customers c ON c.id = l.customerId" : "";

  // Carteira: créditos activos e o capital em dívida (prestações por pagar).
  const [carteiraRows]: any = await db.query(
    `SELECT COUNT(DISTINCT l.id) AS activeLoans,
            IFNULL(SUM(GREATEST(a.installment - IFNULL(a.paidAmount, 0), 0)), 0) AS totalOutstanding
       FROM customer_loans l
       ${joinCustomers}
       LEFT JOIN amortization_loans a ON a.loanId = l.id
      WHERE l.companyId = ? AND l.status = 1 ${scopeLoans}`,
    { replacements: loanReplacements }
  );
  const carteira = (carteiraRows as any[])[0] || {};

  // PAR 30: dívida TOTAL dos créditos com ≥1 prestação vencida > 30 dias.
  const scopePar = gestorId ? creditoNaCarteiraSql({ ...actor, id: gestorId }, "l2", "c") : "";
  const [parRows]: any = await db.query(
    `SELECT IFNULL(SUM(GREATEST(a2.installment - IFNULL(a2.paidAmount, 0), 0)), 0) AS par30
       FROM customer_loans l2
       ${gestorId ? "JOIN customers c ON c.id = l2.customerId" : ""}
       JOIN (
         SELECT DISTINCT a.loanId
           FROM amortization_loans a
          WHERE a.companyId = ?
            AND a.dueDate < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND IFNULL(a.paidAmount, 0) < a.installment
       ) AS risco ON risco.loanId = l2.id
       JOIN amortization_loans a2 ON a2.loanId = l2.id
      WHERE l2.companyId = ? AND l2.status = 1 ${scopePar}`,
    { replacements: [Number(actor.companyId), Number(actor.companyId)] }
  );

  // A receber hoje: prestações que vencem hoje e ainda não foram pagas.
  const [hojeRows]: any = await db.query(
    `SELECT IFNULL(SUM(GREATEST(a.installment - IFNULL(a.paidAmount, 0), 0)), 0) AS aReceberHoje,
            COUNT(a.id) AS prestacoesHoje
       FROM customer_loans l
       ${joinCustomers}
       JOIN amortization_loans a ON a.loanId = l.id
      WHERE l.companyId = ? AND l.status = 1
        AND a.dueDate = CURDATE()
        AND IFNULL(a.paidAmount, 0) < a.installment
        ${scopeLoans}`,
    { replacements: loanReplacements }
  );

  // Promessas do dia (prometidas para hoje) + contadores do mês corrente.
  const activityScope = gestorId ? "AND createdBy = ?" : "";
  const activityReplacements = gestorId
    ? [Number(actor.companyId), gestorId]
    : [Number(actor.companyId)];
  const [promessasRows]: any = await db.query(
    `SELECT COUNT(*) AS promessasHoje,
            IFNULL(SUM(promisedAmount), 0) AS valorPrometidoHoje
       FROM collection_activities
      WHERE companyId = ?
        AND activityType = 'PROMESSA_PAGAMENTO'
        AND promisedDate = CURDATE()
        AND status != 'QUEBRADA'
        ${activityScope}`,
    { replacements: activityReplacements }
  );

  const [countersRows]: any = await db.query(
    `SELECT activityType, COUNT(*) AS n
       FROM collection_activities
      WHERE companyId = ?
        AND activityDate >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        ${activityScope}
      GROUP BY activityType`,
    { replacements: activityReplacements }
  );
  const counters: Record<string, number> = {
    VISITA_DOMICILIAR: 0,
    LIGACAO_TELEFONICA: 0,
    PROMESSA_PAGAMENTO: 0,
    RECUSA: 0,
  };
  for (const row of countersRows as any[]) {
    counters[String(row.activityType)] = Number(row.n);
  }

  const [clientesRows]: any = await db.query(
    `SELECT COUNT(*) AS clientes
       FROM customers c
      WHERE c.companyId = ? ${gestorId ? clienteNaCarteiraSql({ ...actor, id: gestorId }) : ""}`,
    { replacements: [Number(actor.companyId)] }
  );

  // Clientes disponíveis (sem gestor válido) — a parte da carteira que ainda
  // pode ser assumida por quem está a ver o ecrã.
  const [disponiveisRows]: any = await db.query(
    `SELECT COUNT(*) AS disponiveis
       FROM customers c
      WHERE c.companyId = ? ${gestorId ? `AND ${semGestorValido("c")}` : ""}`,
    { replacements: [Number(actor.companyId)] }
  );

  const promessas = (promessasRows as any[])[0] || {};
  return {
    gestorId: gestorId || null,
    totalCarteira: round2(toNumber(carteira.totalOutstanding)),
    activeLoans: Number(carteira.activeLoans) || 0,
    clientes: Number((clientesRows as any[])[0]?.clientes) || 0,
    clientesDisponiveis: Number((disponiveisRows as any[])[0]?.disponiveis) || 0,
    par30: round2(toNumber((parRows as any[])[0]?.par30)),
    aReceberHoje: round2(toNumber((hojeRows as any[])[0]?.aReceberHoje)),
    prestacoesHoje: Number((hojeRows as any[])[0]?.prestacoesHoje) || 0,
    promessasDoDia: Number(promessas.promessasHoje) || 0,
    valorPrometidoHoje: round2(toNumber(promessas.valorPrometidoHoje)),
    atividadesMes: {
      visitas: counters.VISITA_DOMICILIAR,
      chamadas: counters.LIGACAO_TELEFONICA,
      promessas: counters.PROMESSA_PAGAMENTO,
      recusas: counters.RECUSA,
      total: Object.values(counters).reduce((sum, n) => sum + n, 0),
    },
  };
};

// ── Clientes da carteira (ecrã «A Minha Carteira») ─────────────────────────
/**
 * Lista os clientes da carteira com o que é preciso para cobrar: dívida,
 * atraso, última cobrança e promessa pendente. O Gestor vê os seus clientes e
 * os disponíveis (sem gestor válido); o Admin vê todos os da empresa.
 */
export const listPortfolio = async (params: {
  actor: RequestActor;
  search?: any;
  onlyOverdue?: any;
  limit?: any;
}) => {
  const actor = params.actor;
  const scoped = isGestor(actor) && !!actor.id;
  const replacements: any[] = [Number(actor.companyId)];
  const scopeSql = scoped ? clienteNaCarteiraSql(actor) : "";

  const search = typeof params.search === "string" ? params.search.trim() : "";
  const searchSql = search
    ? "AND (c.customerName LIKE ? OR c.accountNumber = ? OR c.customerPhone LIKE ?)"
    : "";
  if (search) {
    replacements.push(`%${search}%`, Number(search) || 0, `%${search}%`);
  }

  const onlyOverdue = params.onlyOverdue === true || params.onlyOverdue === "1" || params.onlyOverdue === "true";
  const overdueHaving = onlyOverdue
    ? "HAVING overdueCount > 0"
    : "";

  const limit = Math.min(500, Math.max(1, toNumber(params.limit) || 300));

  const [rows]: any = await db.query(
    `SELECT c.id AS customerId,
            c.accountNumber,
            c.customerName,
            c.customerPhone,
            c.customerBairro,
            c.customerStatus,
            g.name AS ownerName,
            COUNT(DISTINCT l.id) AS activeLoans,
            IFNULL(SUM(GREATEST(a.installment - IFNULL(a.paidAmount, 0), 0)), 0) AS totalOutstanding,
            COUNT(DISTINCT CASE WHEN a.dueDate < CURDATE() AND IFNULL(a.paidAmount, 0) < a.installment THEN a.id END) AS overdueCount,
            IFNULL(MAX(CASE WHEN a.dueDate < CURDATE() AND IFNULL(a.paidAmount, 0) < a.installment THEN DATEDIFF(CURDATE(), a.dueDate) END), 0) AS maxDaysLate,
            DATE_FORMAT(MIN(CASE WHEN a.dueDate >= CURDATE() AND IFNULL(a.paidAmount, 0) < a.installment THEN a.dueDate END), '%Y-%m-%d') AS nextDueDate,
            IFNULL(SUM(CASE WHEN a.dueDate < CURDATE() AND IFNULL(a.paidAmount, 0) < a.installment
                            THEN GREATEST(a.installment - IFNULL(a.paidAmount, 0), 0) ELSE 0 END), 0) AS totalOverdue
       FROM customers c
       LEFT JOIN users g ON g.id = c.creditManager AND g.userRole = 3
       LEFT JOIN customer_loans l ON l.customerId = c.id AND l.status = 1
       LEFT JOIN amortization_loans a ON a.loanId = l.id
      WHERE c.companyId = ?
        ${scopeSql}
        ${searchSql}
      GROUP BY c.id, c.accountNumber, c.customerName, c.customerPhone, c.customerBairro, c.customerStatus, g.name
      ${overdueHaving}
      ORDER BY maxDaysLate DESC, totalOverdue DESC, c.customerName ASC
      LIMIT ${limit}`,
    { replacements }
  );

  // Última cobrança e promessa pendente de cada cliente (prova do que já foi feito).
  const accounts = (rows as any[]).map((row: any) => Number(row.accountNumber));
  const lastByAccount = new Map<number, any>();
  const promiseByAccount = new Map<number, any>();
  if (accounts.length > 0) {
    const placeholders = accounts.map(() => "?").join(",");
    const [activities]: any = await db.query(
      `SELECT accountNumber, activityType, activityDate, createdByName, notes,
              promisedDate, promisedAmount, status
         FROM collection_activities
        WHERE companyId = ? AND accountNumber IN (${placeholders})
        ORDER BY activityDate DESC, id DESC`,
      { replacements: [Number(actor.companyId), ...accounts] }
    );
    for (const activity of activities as any[]) {
      const key = Number(activity.accountNumber);
      if (!lastByAccount.has(key)) lastByAccount.set(key, activity);
      if (
        String(activity.activityType) === "PROMESSA_PAGAMENTO" &&
        String(activity.status) === "PENDENTE" &&
        !promiseByAccount.has(key)
      ) {
        promiseByAccount.set(key, activity);
      }
    }
  }

  const list = (rows as any[]).map((row: any) => {
    const last = lastByAccount.get(Number(row.accountNumber)) || null;
    const promise = promiseByAccount.get(Number(row.accountNumber)) || null;
    return {
      customerId: Number(row.customerId),
      accountNumber: Number(row.accountNumber),
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerBairro: row.customerBairro,
      customerStatus: Number(row.customerStatus) || 0,
      ownerName: row.ownerName || null,
      // «disponível» = sem gestor válido: pode ser assumido por este gestor
      available: !row.ownerName,
      activeLoans: Number(row.activeLoans) || 0,
      totalOutstanding: round2(toNumber(row.totalOutstanding)),
      overdueCount: Number(row.overdueCount) || 0,
      maxDaysLate: Number(row.maxDaysLate) || 0,
      totalOverdue: round2(toNumber(row.totalOverdue)),
      nextDueDate: row.nextDueDate || null,
      lastActivity: last
        ? {
            activityType: String(last.activityType),
            activityLabel: ACTIVITY_TYPE_LABELS[String(last.activityType)] || last.activityType,
            activityDate: last.activityDate,
            createdByName: last.createdByName,
          }
        : null,
      pendingPromise: promise
        ? {
            promisedDate: promise.promisedDate,
            promisedAmount: round2(toNumber(promise.promisedAmount)),
            createdByName: promise.createdByName,
          }
        : null,
    };
  });

  return {
    rows: list,
    totals: {
      clientes: list.length,
      disponiveis: list.filter((row) => row.available).length,
      comAtraso: list.filter((row) => row.overdueCount > 0).length,
      credito: round2(list.reduce((sum, row) => sum + row.totalOutstanding, 0)),
      emAtraso: round2(list.reduce((sum, row) => sum + row.totalOverdue, 0)),
      promessasPendentes: list.filter((row) => row.pendingPromise).length,
    },
  };
};

/**
 * Assume a carteira de um cliente disponível: grava o gestor no cliente e nos
 * créditos que também não têm gestor válido. Um cliente de outro Gestor de
 * Crédito activo nunca é roubado (409 — pedir transferência ao Administrador).
 */
export const claimClient = async (params: { actor: RequestActor; accountNumber: any }) => {
  const actor = params.actor;
  if (!isGestor(actor) || !actor.id) {
    throw new CollectionError(
      403,
      "FORBIDDEN",
      "Apenas o Gestor de Crédito assume a carteira de um cliente."
    );
  }
  const accountNumber = Number(params.accountNumber) || 0;
  if (!accountNumber) {
    throw new CollectionError(400, "INVALID_ACCOUNT", "Indique a conta do mutuário.");
  }

  const customer: any = await CustomerModel.findOne({
    where: { companyId: Number(actor.companyId), accountNumber },
  });
  if (!customer) {
    throw new CollectionError(404, "CUSTOMER_NOT_FOUND", "Mutuário não encontrado.");
  }

  const customerId = Number(customer.getDataValue("id"));
  const customerGestor = Number(customer.getDataValue("creditManager")) || null;
  if (customerGestor && customerGestor !== Number(actor.id)) {
    const isGestorActivo = await isGestorValido(actor.companyId, customerGestor);
    if (isGestorActivo) {
      const owner: any = await UserModel.findByPk(customerGestor, { attributes: ["name"], raw: true });
      throw new CollectionError(
        409,
        "ALREADY_ASSIGNED",
        `Este cliente pertence à carteira de ${owner?.name || "outro Gestor de Crédito"}. Peça a transferência ao Administrador.`
      );
    }
  }

  await CustomerModel.update({ creditManager: Number(actor.id) }, { where: { id: customerId } });

  // Créditos do cliente sem gestor válido passam também para este gestor; os
  // créditos de outro gestor activo ficam intocados.
  const [loansResult]: any = await db.query(
    `UPDATE customer_loans l
        SET l.creditManager = ?, l.updatedAt = NOW()
      WHERE l.customerId = ?
        AND (l.creditManager IS NULL
             OR l.creditManager NOT IN (SELECT u.id FROM users u WHERE u.companyId = l.companyId AND u.userRole = 3))`,
    { replacements: [Number(actor.id), customerId] }
  );
  const loansAffected = Number(loansResult?.affectedRows ?? 0);

  return {
    accountNumber,
    customerName: customer.getDataValue("customerName"),
    customerId,
    loansAffected,
    claimedByName: actor.name,
  };
};

// ── Ranking por gestor (Admin) ─────────────────────────────────────────────
export const managerRanking = async (actor: RequestActor) => {
  if (isGestor(actor)) {
    throw new CollectionError(
      403,
      "FORBIDDEN",
      "O ranking por gestor está reservado à Administração."
    );
  }

  const [rows]: any = await db.query(
    `SELECT u.id AS gestorId,
            u.name AS gestorName,
            (SELECT COUNT(*) FROM customers c WHERE c.companyId = u.companyId AND c.creditManager = u.id) AS clientes,
            (SELECT COUNT(DISTINCT l.id) FROM customer_loans l WHERE l.companyId = u.companyId AND l.creditManager = u.id AND l.status = 1) AS creditosActivos,
            (SELECT IFNULL(SUM(GREATEST(a.installment - IFNULL(a.paidAmount, 0), 0)), 0)
               FROM customer_loans l
               JOIN amortization_loans a ON a.loanId = l.id
              WHERE l.companyId = u.companyId AND l.creditManager = u.id AND l.status = 1) AS carteira,
            (SELECT IFNULL(SUM(GREATEST(a2.installment - IFNULL(a2.paidAmount, 0), 0)), 0)
               FROM customer_loans l2
               JOIN (SELECT DISTINCT a.loanId FROM amortization_loans a
                      WHERE a.companyId = u.companyId
                        AND a.dueDate < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                        AND IFNULL(a.paidAmount, 0) < a.installment) AS risco ON risco.loanId = l2.id
               JOIN amortization_loans a2 ON a2.loanId = l2.id
              WHERE l2.companyId = u.companyId AND l2.creditManager = u.id AND l2.status = 1) AS par30,
            (SELECT COUNT(*) FROM collection_activities ca
              WHERE ca.companyId = u.companyId AND ca.createdBy = u.id
                AND ca.activityType = 'VISITA_DOMICILIAR'
                AND ca.activityDate >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS visitasMes,
            (SELECT COUNT(*) FROM collection_activities ca
              WHERE ca.companyId = u.companyId AND ca.createdBy = u.id
                AND ca.activityType = 'LIGACAO_TELEFONICA'
                AND ca.activityDate >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS chamadasMes,
            (SELECT COUNT(*) FROM collection_activities ca
              WHERE ca.companyId = u.companyId AND ca.createdBy = u.id
                AND ca.activityType = 'PROMESSA_PAGAMENTO'
                AND ca.activityDate >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS promessasMes
       FROM users u
      WHERE u.companyId = ? AND u.userRole = 3
      ORDER BY carteira DESC`,
    { replacements: [Number(actor.companyId)] }
  );

  return (rows as any[]).map((row: any) => ({
    gestorId: Number(row.gestorId),
    gestorName: row.gestorName,
    clientes: Number(row.clientes) || 0,
    creditosActivos: Number(row.creditosActivos) || 0,
    carteira: round2(toNumber(row.carteira)),
    par30: round2(toNumber(row.par30)),
    visitasMes: Number(row.visitasMes) || 0,
    chamadasMes: Number(row.chamadasMes) || 0,
    promessasMes: Number(row.promessasMes) || 0,
  }));
};
