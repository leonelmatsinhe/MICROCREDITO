import { db } from "../database/db";
import { CashRegisterModel } from "../database/models/CashRegisterModel";
import { CashMovementModel, CASH_CATEGORIES } from "../database/models/CashMovementModel";
import { Op } from "sequelize";

/**
 * CAIXA DIÁRIO — serviço central.
 *
 * Regras de negócio aplicadas aqui:
 *  1. Um utilizador só pode ter 1 caixa ABERTO por companyId e por dia
 *     (índice único + verificação prévia).
 *  2. Ao abrir exige opening_balance; ao fechar exige closing_balance_informed.
 *  3. closing_balance_calculated = opening_balance + total_in - total_out
 *     (sempre calculado no backend); difference = informado − calculado.
 *  4. Caixa FECHADO é imutável — nenhum movimento é aceite para ele.
 *  5. Movimentos automáticos são criados dentro de transacção MySQL
 *     (START TRANSACTION / COMMIT / ROLLBACK).
 *
 * NOTA: módulo isolado — não lê nem escreve na tabela `accounts`
 * (que continua a ser apenas a conta bancária impressa nos contratos).
 */

export type CashType = "ENTRADA" | "SAIDA";
export type CashCategory = typeof CASH_CATEGORIES[number];

// Arredonda para 2 casas decimais (dinheiro).
const round2 = (value: number) => Math.round(value * 100) / 100;

// Dia actual no fuso do servidor, formato YYYY-MM-DD (igual ao resto do sistema).
export const todayKey = (): string => new Date().toISOString().slice(0, 10);

const registerPlain = (register: any) => ({
  ...register.toJSON(),
  opening_balance: Number(register.getDataValue("opening_balance")) || 0,
  total_in: Number(register.getDataValue("total_in")) || 0,
  total_out: Number(register.getDataValue("total_out")) || 0,
  total_cash_in: Number(register.getDataValue("total_cash_in")) || 0,
  total_cash_out: Number(register.getDataValue("total_cash_out")) || 0,
  total_bank_in: Number(register.getDataValue("total_bank_in")) || 0,
  total_bank_out: Number(register.getDataValue("total_bank_out")) || 0,
  closing_balance_informed: register.getDataValue("closing_balance_informed") != null
    ? Number(register.getDataValue("closing_balance_informed"))
    : null,
  closing_balance_calculated: register.getDataValue("closing_balance_calculated") != null
    ? Number(register.getDataValue("closing_balance_calculated"))
    : null,
  difference: register.getDataValue("difference") != null
    ? Number(register.getDataValue("difference"))
    : null,
});

const movementPlain = (movement: any) => ({
  ...movement.toJSON(),
  amount: Number(movement.getDataValue("amount")) || 0,
});

/**
 * Busca o caixa ABERTO do utilizador para hoje (por empresa).
 * Devolve null se não houver caixa aberto.
 */
export const getOpenRegister = async (
  userId: number,
  companyId: number
): Promise<any | null> => {
  const register: any = await CashRegisterModel.findOne({
    where: {
      userId,
      companyId,
      status: "ABERTO",
      // ABERTO só interessa para o dia corrente; caixas esquecidos de dias
      // anteriores não bloqueiam nem recebem movimentos.
      opening_date: todayKey(),
    },
    order: [["id", "DESC"]],
  });
  return register ? registerPlain(register) : null;
};

/**
 * Abre o caixa do dia. Exige opening_balance >= 0.
 * Falha com { code: "ALREADY_OPEN" } se já existir caixa aberto hoje.
 */
export const openRegister = async (params: {
  userId: number;
  companyId: number;
  openingBalance: number;
}): Promise<any> => {
  const { userId, companyId, openingBalance } = params;

  if (!Number.isFinite(openingBalance) || openingBalance < 0) {
    throw { code: "INVALID_BALANCE", message: "Informe um saldo inicial válido (>= 0)." };
  }

  const existing = await getOpenRegister(userId, companyId);
  if (existing) {
    throw { code: "ALREADY_OPEN", message: "Já existe um caixa aberto hoje para este utilizador." };
  }

  // Segunda barreira: o índice único (userId, opening_date, companyId, status)
  // rejeita corridas concorrentes mesmo se a verificação acima passar.
  try {
    const register: any = await CashRegisterModel.create({
      companyId,
      userId,
      opening_date: todayKey(),
      opening_time: new Date(),
      opening_balance: round2(openingBalance),
      total_in: 0,
      total_out: 0,
      total_cash_in: 0,
      total_cash_out: 0,
      total_bank_in: 0,
      total_bank_out: 0,
      status: "ABERTO",
    });
    return registerPlain(register);
  } catch (error: any) {
    if (String(error?.name).includes("UniqueConstraint")) {
      throw { code: "ALREADY_OPEN", message: "Já existe um caixa aberto hoje para este utilizador." };
    }
    throw error;
  }
};

/**
 * Recalcula os 6 totais do caixa a partir dos movimentos persistidos
 * (fonte de verdade): globais + separação CASH vs BANK. Implementação
 * delegada ao treasuryService (único dono da lógica de dinheiro).
 */
export const recalculateTotals = async (
  registerId: number,
  transaction?: any
): Promise<{ totalIn: number; totalOut: number; totalCashIn: number; totalCashOut: number; totalBankIn: number; totalBankOut: number }> => {
  const { recalculateRegisterTotals } = await import("./treasuryService");
  return recalculateRegisterTotals(registerId, transaction);
};

/**
 * Fecha o caixa. Exige closing_balance_informed (valor CONTADO EM DINHEIRO
 * FÍSICO); calcula closing_balance_calculated (cash) e difference no backend.
 * Os totais bancários ficam separados (total_bank_in/out) — o fecho do caixa
 * de dinheiro físico não é afectado por transferências electrónicas.
 */
export const closeRegister = async (params: {
  registerId: number;
  userId: number;
  companyId: number;
  closingBalanceInformed: number;
  notes?: string | null;
}): Promise<any> => {
  const { registerId, userId, companyId, closingBalanceInformed } = params;

  if (!Number.isFinite(closingBalanceInformed) || closingBalanceInformed < 0) {
    throw { code: "INVALID_BALANCE", message: "Informe um valor contado válido (>= 0)." };
  }

  const register: any = await CashRegisterModel.findOne({
    where: { id: registerId, companyId },
  });
  if (!register) {
    throw { code: "NOT_FOUND", message: "Caixa não encontrado." };
  }
  if (register.getDataValue("status") === "FECHADO") {
    throw { code: "ALREADY_CLOSED", message: "Este caixa já foi fechado e é imutável." };
  }
  // CAIXA DO SISTEMA (userId = 0): qualquer utilizador autenticado da empresa
  // pode reconciliá-lo — os movimentos pertencem ao portal, não a um operador.
  const registerUserId = Number(register.getDataValue("userId"));
  if (registerUserId !== 0 && registerUserId !== Number(userId)) {
    throw { code: "FORBIDDEN", message: "Só o responsável pelo caixa o pode fechar." };
  }

  // Recalcular a partir dos movimentos persistidos antes do fecho.
  const totals = await recalculateTotals(registerId);

  const openingBalance = Number(register.getDataValue("opening_balance")) || 0;
  // Fecho em dinheiro físico: inicial + entradas cash − saídas cash.
  const closingCalculated = round2(openingBalance + totals.totalCashIn - totals.totalCashOut);
  const difference = round2(closingBalanceInformed - closingCalculated);

  await register.update({
    status: "FECHADO",
    closing_balance_informed: round2(closingBalanceInformed),
    closing_balance_calculated: closingCalculated,
    difference,
    closing_time: new Date(),
    closed_at: new Date(),
    closedBy: userId,
    notes: params.notes ?? register.getDataValue("notes"),
    total_in: totals.totalIn,
    total_out: totals.totalOut,
    total_cash_in: totals.totalCashIn,
    total_cash_out: totals.totalCashOut,
    total_bank_in: totals.totalBankIn,
    total_bank_out: totals.totalBankOut,
  });

  return registerPlain(register);
};

/**
 * MOVIMENTO MANUAL — delega no treasuryService (fonte única de verdade).
 * Mantém a assinatura antiga para os controladores existentes.
 */
export const createMovement = async (params: {
  cashRegisterId: number;
  companyId: number;
  type: CashType;
  category: CashCategory;
  amount: number;
  description: string;
  userId?: number;
  loanId?: number | null;
  amortizationLoanId?: number | null;
  tranzactionId?: number | null;
  customerId?: number | null;
  automatic?: boolean;
}): Promise<any> => {
  const { registerMovement } = await import("./treasuryService");

  // Validações de entrada (mantidas aqui para erros específicos do caixa)
  if (params.type !== "ENTRADA" && params.type !== "SAIDA") {
    throw { code: "INVALID_TYPE", message: "Tipo de movimento inválido (ENTRADA ou SAIDA)." };
  }
  if (!(CASH_CATEGORIES as readonly string[]).includes(params.category)) {
    throw { code: "INVALID_CATEGORY", message: `Categoria inválida: ${params.category}` };
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw { code: "INVALID_AMOUNT", message: "O valor do movimento deve ser maior que zero." };
  }
  if (!params.description || String(params.description).trim().length === 0) {
    throw { code: "INVALID_DESCRIPTION", message: "A descrição é obrigatória." };
  }

  // O caixa indicado tem de existir, estar ABERTO e ser de hoje.
  const register: any = await CashRegisterModel.findOne({
    where: { id: params.cashRegisterId, companyId: params.companyId },
  });
  if (!register) {
    throw { code: "NOT_FOUND", message: "Caixa não encontrado." };
  }
  if (register.getDataValue("status") !== "ABERTO") {
    throw { code: "REGISTER_CLOSED", message: "Caixa fechado é imutável — não aceita movimentos." };
  }
  if (String(register.getDataValue("opening_date")) !== todayKey()) {
    throw { code: "REGISTER_NOT_TODAY", message: "Só o caixa aberto hoje aceita movimentos." };
  }

  // Movimentos manuais são sempre CASH (BANK é para desembolso/pagamento real);
  // o treasuryService insere, recalcula e devolve o movimento persistido.
  return registerMovement({
    companyId: params.companyId,
    userId: params.userId ?? null,
    type: params.type,
    category: params.category,
    amount: params.amount,
    paymentMethod: "CASH",
    description: params.description,
    loanId: params.loanId ?? null,
    amortizationLoanId: params.amortizationLoanId ?? null,
    tranzactionId: params.tranzactionId ?? null,
    customerId: params.customerId ?? null,
    automatic: params.automatic ?? false,
  });
};

/**
 * Movimentos automáticos de DESMBOLSO/PAGAMENTO — delegam no treasuryService
 * com o método de pagamento e a conta bancária escolhidos no frontend.
 */
export const recordDisbursement = async (params: {
  companyId: number;
  userId?: number;
  loanId: number;
  customerId?: number | null;
  amount: number;
  accountNumber?: number | string | null;
  paymentMethod?: string;
  bankAccountId?: number | null;
}): Promise<void> => {
  const { registerMovement, isElectronic } = await import("./treasuryService");
  const method = (params.paymentMethod || "CASH").toUpperCase();
  const electronic = isElectronic(method);

  // O caixa ABERTO do utilizador — sem ele, nenhum movimento é aceite.
  const open = await getOpenRegister(params.userId ?? 0, params.companyId);
  if (!open) {
    throw { code: "CAIXA_FECHADO", message: "Abra o caixa do dia para continuar" };
  }

  await registerMovement({
    companyId: params.companyId,
    userId: params.userId ?? null,
    type: "SAIDA",
    category: "DESEMBOLSO",
    amount: params.amount,
    paymentMethod: (electronic ? method : "CASH") as any,
    bankAccountId: electronic ? Number(params.bankAccountId) : null,
    description: `Desembolso de crédito — conta ${params.accountNumber ?? params.loanId}`,
    loanId: params.loanId,
    customerId: params.customerId ?? null,
    reference: { type: "customer_loans", id: params.loanId },
    automatic: true,
  });
};

/**
 * Movimentos automáticos de PAGAMENTO de prestação:
 *  - ENTRADA / REEMBOLSO  → capital + juros normais;
 *  - ENTRADA / JUROS_MORA → juros de mora, se houver (> 0);
 *  - ENTRADA / TAXA_ADMIN → taxa administrativa, se houver (> 0).
 * Todos com o mesmo paymentMethod/bankAccountId (escolhidos no frontend).
 */
export const recordPayment = async (params: {
  companyId: number;
  userId?: number;
  loanId?: number | null;
  amortizationLoanId?: number | null;
  tranzactionId?: number | null;
  customerId?: number | null;
  amount: number;
  lateInterest?: number;
  adminFee?: number;
  accountNumber?: number | string | null;
  paymentMethod?: string;
  bankAccountId?: number | null;
}): Promise<void> => {
  const { registerMovement, isElectronic } = await import("./treasuryService");
  const method = (params.paymentMethod || "CASH").toUpperCase();
  const electronic = isElectronic(method);

  const open = await getOpenRegister(params.userId ?? 0, params.companyId);
  if (!open) {
    throw { code: "CAIXA_FECHADO", message: "Abra o caixa do dia para continuar" };
  }

  const base = {
    companyId: params.companyId,
    userId: params.userId ?? null,
    type: "ENTRADA" as const,
    paymentMethod: (electronic ? method : "CASH") as any,
    bankAccountId: electronic ? Number(params.bankAccountId) : null,
    loanId: params.loanId ?? null,
    amortizationLoanId: params.amortizationLoanId ?? null,
    tranzactionId: params.tranzactionId ?? null,
    customerId: params.customerId ?? null,
    reference: { type: "amortization_loans", id: params.amortizationLoanId ?? null },
  };

  const accountLabel = params.accountNumber ?? params.loanId ?? "-";

  await registerMovement({
    ...base,
    category: "REEMBOLSO",
    amount: params.amount,
    description: `Reembolso de prestação — conta ${accountLabel}`,
    automatic: true,
  });

  if (Number(params.lateInterest) > 0) {
    await registerMovement({
      ...base,
      category: "JUROS_MORA",
      amount: Number(params.lateInterest),
      description: `Juros de mora — conta ${accountLabel}`,
      automatic: true,
    });
  }

  if (Number(params.adminFee) > 0) {
    await registerMovement({
      ...base,
      category: "TAXA_ADMIN",
      amount: Number(params.adminFee),
      description: `Taxa administrativa — conta ${accountLabel}`,
      automatic: true,
    });
  }
};

/**
 * Lista os movimentos de um caixa (mais recentes primeiro).
 */
export const listMovements = async (
  registerId: number,
  companyId: number
): Promise<any[]> => {
  const register: any = await CashRegisterModel.findOne({
    where: { id: registerId, companyId },
  });
  if (!register) throw { code: "NOT_FOUND", message: "Caixa não encontrado." };

  const movements: any[] = (await CashMovementModel.findAll({
    where: { cashRegisterId: registerId },
    order: [["id", "DESC"]],
  })) as any[];

  return movements.map(movementPlain);
};

/**
 * Histórico de caixas da empresa — para auditoria.
 *
 * Filtros opcionais:
 *  - from/to (YYYY-MM-DD): intervalo por opening_date;
 *  - limit: máximo de registos (default 60).
 * Enriquecido com o nome do utilizador responsável e o total de movimentos
 * de cada caixa, para exibição directa na página de histórico.
 */
/**
 * SUGESTÃO DE SALDO INICIAL ao abrir o caixa de hoje.
 *
 * Base: o VALOR CONTADO EM DINHEIRO no fecho do último caixa FECHADO do
 * utilizador (não o calculado — o contado é o que estava mesmo na gaveta).
 * No dia seguinte, esse valor vira o fundo de troco inicial.
 *
 * Fallbacks em cascata (cascata de robustez, nunca erro):
 *  1. Valor contado do último fecho com closing_balance_informed definido;
 *  2. Saldo calculado (cash) do último fecho sem contagem registada;
 *  3. 0 — primeiro dia do utilizador ou sem histórico.
 * Nunca sugere a partir do Caixa do Sistema (userId = 0) nem de caixas
 * ABERTOS esquecidos — só de caixas FECHADOS.
 */
export const suggestOpeningBalance = async (
  userId: number,
  companyId: number
): Promise<{ suggested: number; source: string; previousDate: string | null }> => {
  // Só de caixas reais e fechados; o mais recente primeiro.
  const lastClosed: any = await CashRegisterModel.findOne({
    where: {
      companyId,
      status: "FECHADO",
      // Gaveta é por utilizador: só herda a contagem dos PRÓPRIOS fechos.
      userId,
    },
    order: [["id", "DESC"]],
  });

  // Sem fecho próprio (ex.: primeiro dia): usa o último fecho de QUALQUER
  // operador da empresa — o dinheiro é o mesmo no balcão.
  const fallback: any = lastClosed
    ? null
    : await CashRegisterModel.findOne({
        where: { companyId, userId: { [Op.ne]: 0 }, status: "FECHADO" },
        order: [["id", "DESC"]],
      });

  const register: any = lastClosed || fallback;
  if (!register) {
    return { suggested: 0, source: "primeiro-dia", previousDate: null };
  }

  const informed = register.getDataValue("closing_balance_informed");
  const calculated = register.getDataValue("closing_balance_calculated");
  const date = String(register.getDataValue("opening_date") || "");

  if (informed != null) {
    return {
      suggested: round2(Number(informed) || 0),
      source: lastClosed ? "contado-anterior" : "contado-outro-operador",
      previousDate: date,
    };
  }
  // Fecho sem contagem (não deveria acontecer — fecho exige contagem — mas
  // fica à prova de dados antigos): usa o calculado cash.
  return {
    suggested: round2(Number(calculated) || 0),
    source: lastClosed ? "calculado-anterior" : "calculado-outro-operador",
    previousDate: date,
  };
};

export const listRegisters = async (
  companyId: number,
  limit = 60,
  from?: string,
  to?: string
): Promise<any[]> => {
  const where: any = { companyId };
  if (from && to) where.opening_date = { [Op.between]: [String(from), String(to)] };
  else if (from) where.opening_date = { [Op.gte]: String(from) };
  else if (to) where.opening_date = { [Op.lte]: String(to) };

  const registers: any[] = (await CashRegisterModel.findAll({
    where,
    order: [["id", "DESC"]],
    limit,
  })) as any[];

  if (registers.length === 0) return [];

  // Nomes dos utilizadores responsáveis (uma só query para todos os caixas)
  const userIds = [...new Set(registers.map((r: any) => Number(r.getDataValue("userId"))))];
  const { UserModel } = await import("../database/models/UserModel");
  const users: any[] = (await UserModel.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ["id", "name"],
    raw: true,
  })) as any[];
  const nameById: Record<number, string> = {};
  users.forEach((u: any) => { nameById[Number(u.id)] = u.name; });
  // Caixa do Sistema (userId = 0) — movimentos do portal fora de expediente.
  nameById[0] = "Sistema (Portal)";

  // Total de movimentos por caixa (uma só query agrupada)
  const registerIds = registers.map((r: any) => Number(r.getDataValue("id")));
  const counts: any[] = (await CashMovementModel.findAll({
    where: { cashRegisterId: { [Op.in]: registerIds } },
    attributes: ["cashRegisterId", [db.fn("COUNT", db.col("id")), "movementCount"]],
    group: ["cashRegisterId"],
    raw: true,
  })) as any[];
  const countByRegister: Record<number, number> = {};
  counts.forEach((c: any) => {
    countByRegister[Number(c.cashRegisterId)] = Number(c.movementCount) || 0;
  });

  return registers.map((register) => {
    const userId = Number(register.getDataValue("userId"));
    const plain = registerPlain(register);
    // Caixa do Sistema (userId = 0) — identificar claramente na UI de auditoria.
    plain.isSystemRegister = userId === 0;
    plain.userName = userId === 0
      ? "Sistema (Portal)"
      : nameById[userId] || `Utilizador #${userId}`;
    plain.movementCount = countByRegister[Number(register.getDataValue("id"))] || 0;
    return plain;
  });
};

/**
 * RESUMO DIÁRIO CONSOLIDADO (todas as caixas da empresa num dia):
 * totais CASH/BANK somados + movimentos por conta bancária (para o relatório
 * BM e para a tela de fecho).
 */
export const getDailySummary = async (companyId: number, date?: string): Promise<any> => {
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? String(date) : todayKey();

  const registers: any[] = (await CashRegisterModel.findAll({
    where: { companyId, opening_date: day },
    order: [["id", "ASC"]],
  })) as any[];

  const totals = registers.reduce(
    (acc, r: any) => {
      acc.opening_balance += Number(r.getDataValue("opening_balance")) || 0;
      acc.total_cash_in += Number(r.getDataValue("total_cash_in")) || 0;
      acc.total_cash_out += Number(r.getDataValue("total_cash_out")) || 0;
      acc.total_bank_in += Number(r.getDataValue("total_bank_in")) || 0;
      acc.total_bank_out += Number(r.getDataValue("total_bank_out")) || 0;
      acc.total_in += Number(r.getDataValue("total_in")) || 0;
      acc.total_out += Number(r.getDataValue("total_out")) || 0;
      return acc;
    },
    { opening_balance: 0, total_cash_in: 0, total_cash_out: 0, total_bank_in: 0, total_bank_out: 0, total_in: 0, total_out: 0 }
  );

  Object.keys(totals).forEach((key) => {
    totals[key as keyof typeof totals] = round2(totals[key as keyof typeof totals]);
  });

  // ── Separação PORTAL vs PRESENCIAL (relatório BM / PDF do caixa) ──
  // Portal = movimentos do Caixa do Sistema (userId = 0) e/ou descrição com
  // a etiqueta "[Portal — fora de expediente]". In-person = restantes caixas.
  const registerIds = registers.map((r: any) => Number(r.getDataValue("id")));
  const systemRegisterIds = registers
    .filter((r: any) => Number(r.getDataValue("userId")) === 0)
    .map((r: any) => Number(r.getDataValue("id")));

  let portalIn = 0, portalOut = 0, inPersonIn = 0, inPersonOut = 0;
  if (registerIds.length > 0) {
    const dayMovements: any[] = (await CashMovementModel.findAll({
      where: { cashRegisterId: { [Op.in]: registerIds } },
      attributes: ["cashRegisterId", "type", "amount", "description"],
      raw: true,
    })) as any[];
    dayMovements.forEach((m) => {
      const regId = Number(m.cashRegisterId);
      const isPortal =
        systemRegisterIds.includes(regId) ||
        String(m.description || "").includes("[Portal — fora de expediente]");
      const amount = Number(m.amount) || 0;
      if (isPortal) {
        if (m.type === "ENTRADA") portalIn += amount; else portalOut += amount;
      } else {
        if (m.type === "ENTRADA") inPersonIn += amount; else inPersonOut += amount;
      }
    });
  }

  const channelSplit = {
    portal: {
      in: round2(portalIn),
      out: round2(portalOut),
      // Líquido do canal portal (electrónico)
      net: round2(portalIn - portalOut),
      registerCount: systemRegisterIds.length,
    },
    inPerson: {
      in: round2(inPersonIn),
      out: round2(inPersonOut),
      net: round2(inPersonIn - inPersonOut),
      registerCount: registerIds.length - systemRegisterIds.length,
    },
  };

  // Extrato do dia agrupado por conta bancária (dados reais de accounts).
  const { getStatementGroupedByAccount } = await import("./bankAccountService");
  const bankStatement = await getStatementGroupedByAccount(companyId, day);

  return {
    date: day,
    registers: registers.map(registerPlain),
    totals,
    channelSplit,
    bankStatement,
  };
};

/**
 * Caixa de HOJE do utilizador: aberto (com movimentos) ou o último fechado
 * do dia. Se nenhum existir, devolve null — o frontend mostra o banner
 * "Nenhum caixa aberto hoje".
 */
export const getTodayRegister = async (
  userId: number,
  companyId: number
): Promise<any | null> => {
  const today = todayKey();
  const register: any = await CashRegisterModel.findOne({
    where: {
      userId,
      companyId,
      opening_date: today,
      [Op.or]: [{ status: "ABERTO" }, { status: "FECHADO" }],
    },
    order: [["id", "DESC"]],
  });
  if (!register) return null;

  const plain = registerPlain(register);
  plain.movements = await listMovements(plain.id, companyId);
  return plain;
};

/**
 * CAIXA DO SISTEMA de hoje (userId = 0) — movimentos do portal fora de
 * expediente. NÃO é criado aqui (só nasce quando um pagamento do portal
 * chega de noite); devolve null nos dias sem movimentos fora de hora.
 * Enriquecido com os movimentos para o card do Caixa Central.
 *
 * @param portalSince Data/hora (ISO) de corte opcional — quando fornecida,
 *        apenas os movimentos criados DEPOIS dessa hora são devolvidos em
 *        `movements`, e o resumo `newSince` (qtde + total ENTRADAS) alimenta
 *        o alerta do sino: "pagamentos que chegaram depois do último fecho".
 */
export const getSystemRegisterToday = async (
  companyId: number,
  portalSince?: Date | string | null
): Promise<any | null> => {
  const register: any = await CashRegisterModel.findOne({
    where: {
      companyId,
      userId: 0,
      opening_date: todayKey(),
    },
    order: [["id", "DESC"]],
  });
  if (!register) return null;

  const plain = registerPlain(register);
  plain.isSystemRegister = true;
  plain.userName = "Sistema (Portal)";

  // Todos os movimentos do caixa (card do Caixa Central usa a lista completa).
  const allMovements: any[] = await listMovements(plain.id, companyId);
  plain.movements = allMovements;

  // Corte opcional para o ALERTA: só o que chegou após o último fecho.
  if (portalSince) {
    const since = new Date(portalSince);
    if (!Number.isNaN(since.getTime())) {
      const fresh = allMovements.filter(
        (m: any) => new Date(m.createdAt).getTime() > since.getTime()
      );
      plain.movements = fresh;
      plain.newSince = {
        since: since.toISOString(),
        count: fresh.length,
        totalIn: round2(
          fresh.reduce(
            (s: number, m: any) =>
              s + (String(m.type) === "ENTRADA" ? Number(m.amount) || 0 : 0),
            0
          )
        ),
        byMethod: fresh.reduce((acc: Record<string, number>, m: any) => {
          if (String(m.type) === "ENTRADA") {
            const key = String(m.paymentMethod || "BANK");
            acc[key] = round2((acc[key] || 0) + (Number(m.amount) || 0));
          }
          return acc;
        }, {}),
      };
    }
  }

  return plain;
};
