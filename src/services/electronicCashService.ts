import { Op } from "sequelize";
import { CashRegisterModel } from "../database/models/CashRegisterModel";
import { AccountModel } from "../database/models/AccountModel";
import { BankTransactionModel } from "../database/models/BankTransactionModel";
import { isElectronicCashMode } from "./cashModeService";

/**
 * CAIXA ELECTRÓNICO MANUAL — reconciliação por conta bancária existente.
 *
 * Não cria tabela de contas: usa `accounts` (a mesma carteira real que alimenta
 * o Caixa Central, os desembolsos e os pagamentos). O "fecho do dia" continua a
 * ser uma linha de `cash_registers` (com mode = ELECTRONIC), agora com:
 *
 *   manual_balance_start  → saldo que o operador vê na conta hoje de manhã;
 *   manual_balance_end    → saldo real que o operador vê no banco no fecho;
 *   difference            → saldo real − teórico;
 *   observations          → nota livre da reconciliação.
 *
 * Teórico = saldo inicial + entradas − saídas do dia NESSA conta, lidas do
 * extrato real (`bank_transactions`), que a tesouraria alimenta em cada
 * desembolso/reembolso electrónico.
 */

const round2 = (value: any) => Math.round((Number(value) || 0) * 100) / 100;

const isValidDay = (value: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const dayKey = (value: any): string => (isValidDay(value) ? String(value) : todayKey());

const registerPlain = (register: any) => {
  const plain = register.toJSON ? register.toJSON() : { ...register };
  return {
    ...plain,
    mode: String(plain.mode || "PHYSICAL").toUpperCase(),
    manual_balance_start:
      plain.manual_balance_start != null ? round2(plain.manual_balance_start) : null,
    manual_balance_end:
      plain.manual_balance_end != null ? round2(plain.manual_balance_end) : null,
    difference: plain.difference != null ? round2(plain.difference) : null,
    closing_balance_calculated:
      plain.closing_balance_calculated != null
        ? round2(plain.closing_balance_calculated)
        : null,
  };
};

const accountPlain = (account: any) => {
  const plain = account.toJSON ? account.toJSON() : { ...account };
  return {
    ...plain,
    balance: round2(plain.balance),
    is_active: Number(plain.is_active) ? 1 : 0,
  };
};

/** Conta bancária da empresa (a MESMA tabela `accounts` já cadastrada). */
const findAccount = async (companyId: number, bankAccountId: number) => {
  const id = Number(bankAccountId);
  if (!Number.isFinite(id) || id <= 0) {
    throw { code: "BANK_ACCOUNT_REQUIRED", message: "Escolha a conta bancária do dia." };
  }
  const account: any = await AccountModel.findOne({ where: { id, companyId } });
  if (!account) {
    throw { code: "ACCOUNT_NOT_FOUND", message: "Conta bancária não encontrada nesta empresa." };
  }
  return account;
};

/**
 * Movimento automático do dia para uma conta: entradas, saídas e as linhas do
 * extrato (bank_transactions), tudo dentro do dia escolhido.
 */
export const getAccountDayFlows = async (
  companyId: number,
  accountId: number,
  day: string
) => {
  const startOfDay = `${day} 00:00:00`;
  const endOfDay = `${day} 23:59:59`;

  const rows: any[] = (await BankTransactionModel.findAll({
    where: {
      companyId,
      accountId,
      createdAt: { [Op.between]: [startOfDay, endOfDay] },
    },
    order: [["id", "ASC"]],
  })) as any[];

  let entradas = 0;
  let saidas = 0;
  const movements = rows.map((row: any) => {
    const plain = row.toJSON ? row.toJSON() : { ...row };
    const amount = round2(plain.amount);
    if (String(plain.type) === "ENTRADA") entradas += amount;
    else saidas += amount;
    return {
      id: plain.id,
      type: plain.type,
      category: plain.category,
      amount,
      balanceAfter: round2(plain.balanceAfter),
      description: plain.description,
      createdAt: plain.createdAt,
    };
  });

  return {
    entradas: round2(entradas),
    saidas: round2(saidas),
    liquido: round2(entradas - saidas),
    movements,
  };
};

const findDayRegister = async (companyId: number, userId: number, day: string) =>
  (await CashRegisterModel.findOne({
    where: { companyId, userId, opening_date: day, mode: "ELECTRONIC" },
    order: [["id", "DESC"]],
  })) as any;

/** Vista do dia electrónico: registo + conta + movimentos + saldo teórico. */
export const buildElectronicDayView = async (params: {
  companyId: number;
  userId: number;
  day?: string;
  /** Conta pré-seleccionada no formulário, antes de o dia ser aberto. */
  bankAccountId?: number | string | null;
}): Promise<any> => {
  const day = dayKey(params.day);
  const register = await findDayRegister(params.companyId, params.userId, day);
  if (!register) {
    const selectedId = Number(params.bankAccountId) || 0;
    const selected: any = selectedId
      ? await AccountModel.findOne({ where: { id: selectedId, companyId: params.companyId } })
      : null;
    const flows = selected
      ? await getAccountDayFlows(params.companyId, selectedId, day)
      : { entradas: 0, saidas: 0, liquido: 0, movements: [] as any[] };
    return {
      day,
      register: null,
      isOpen: false,
      account: selected ? accountPlain(selected) : null,
      theoretical: {
        saldo_inicial: 0,
        entradas: flows.entradas,
        saidas: flows.saidas,
        teorico: round2(flows.entradas - flows.saidas),
      },
      movements: flows.movements,
    };
  }

  const plain = registerPlain(register);
  const account: any = plain.bank_account_id
    ? await AccountModel.findOne({ where: { id: Number(plain.bank_account_id), companyId: params.companyId } })
    : null;

  const flows = account
    ? await getAccountDayFlows(params.companyId, Number(account.getDataValue("id")), day)
    : { entradas: 0, saidas: 0, liquido: 0, movements: [] as any[] };

  const saldoInicial = round2(plain.manual_balance_start || 0);
  const calculatedAtClose =
    plain.status === "FECHADO" && plain.closing_balance_calculated != null
      ? round2(plain.closing_balance_calculated)
      : null;
  const teorico = calculatedAtClose != null ? calculatedAtClose : round2(saldoInicial + flows.entradas - flows.saidas);

  return {
    day,
    register: plain,
    isOpen: String(plain.status) === "ABERTO",
    account: account ? accountPlain(account) : null,
    theoretical: {
      saldo_inicial: saldoInicial,
      entradas: flows.entradas,
      saidas: flows.saidas,
      teorico,
    },
    movements: flows.movements,
  };
};

/**
 * RELATÓRIO DO DIA — RECONCILIAÇÃO BANCÁRIA (por conta).
 *
 * Uma linha por conta bancária com actividade no dia (movimentos automáticos
 * do sistema ou dia aberto/reconciliado): saldo inicial introduzido à mão,
 * entradas, saídas, saldo teórico, saldo real lido no banco e diferença.
 * Contas sem movimento nem dia aberto ficam de fora (o relatório é do dia).
 *
 * Devolve dados puros — o PDF é gerado no backend por /api/reports/table-pdf,
 * como todos os restantes documentos do sistema.
 */
export const buildElectronicReconciliationReport = async (companyId: number, day?: string) => {
  const reportDay = dayKey(day);

  const accounts: any[] = (await AccountModel.findAll({
    where: { companyId },
    order: [["is_active", "DESC"], ["bank_name", "ASC"], ["id", "ASC"]],
  })) as any[];

  // Um registo por conta (o mais recente do dia — o reconciliado, se existir).
  const registers: any[] = (await CashRegisterModel.findAll({
    where: { companyId, opening_date: reportDay, mode: "ELECTRONIC" },
    order: [["id", "DESC"]],
  })) as any[];
  const registerByAccount = new Map<number, any>();
  registers.forEach((register: any) => {
    const accountId = Number(register.getDataValue("bank_account_id"));
    if (accountId && !registerByAccount.has(accountId)) {
      registerByAccount.set(accountId, registerPlain(register));
    }
  });

  const lines: any[] = [];
  for (const account of accounts) {
    const accountId = Number(account.getDataValue("id"));
    const register = registerByAccount.get(accountId) || null;
    const flows = await getAccountDayFlows(companyId, accountId, reportDay);
    const hasActivity = !!register || flows.movements.length > 0;
    if (!hasActivity) continue;

    const saldoInicial = register ? round2(register.manual_balance_start || 0) : 0;
    const teorico =
      register && register.status === "FECHADO" && register.closing_balance_calculated != null
        ? round2(register.closing_balance_calculated)
        : round2(saldoInicial + flows.entradas - flows.saidas);
    const saldoReal = register && register.manual_balance_end != null ? round2(register.manual_balance_end) : null;
    const diferenca = saldoReal != null ? round2(saldoReal - teorico) : null;

    lines.push({
      accountId,
      conta: `${String(account.getDataValue("bank_name") || "Conta").trim()} ${String(
        account.getDataValue("accountNumber") || ""
      ).trim()}`.trim(),
      bank_name: account.getDataValue("bank_name") || "",
      accountNumber: account.getDataValue("accountNumber") || "",
      type: account.getDataValue("type") || "",
      is_active: Number(account.getDataValue("is_active")) ? 1 : 0,
      estado:
        !register
          ? "SEM DIA ABERTO"
          : register.status === "ABERTO"
            ? "ABERTO"
            : saldoReal == null
              ? "FECHADO"
              : Math.abs(diferenca || 0) < 0.01
                ? "CONFORME"
                : (diferenca || 0) > 0
                  ? "SOBRA"
                  : "QUEBRA",
      saldo_inicial: saldoInicial,
      entradas: flows.entradas,
      saidas: flows.saidas,
      movimentos: flows.movements.length,
      saldo_teorico: teorico,
      saldo_real: saldoReal,
      diferenca,
      registerId: register?.id ?? null,
      observations: register?.observations ?? null,
    });
  }

  const totals = lines.reduce(
    (acc, line) => {
      acc.saldo_inicial = round2(acc.saldo_inicial + line.saldo_inicial);
      acc.entradas = round2(acc.entradas + line.entradas);
      acc.saidas = round2(acc.saidas + line.saidas);
      acc.saldo_teorico = round2(acc.saldo_teorico + line.saldo_teorico);
      if (line.saldo_real != null) {
        acc.saldo_real = round2((acc.saldo_real || 0) + line.saldo_real);
        acc.contas_reconciliadas += 1;
      }
      if (line.diferenca != null) acc.diferenca = round2((acc.diferenca || 0) + line.diferenca);
      return acc;
    },
    { saldo_inicial: 0, entradas: 0, saidas: 0, saldo_teorico: 0, saldo_real: 0, diferenca: 0, contas_reconciliadas: 0 }
  );

  return {
    day: reportDay,
    accounts: lines,
    totals: {
      ...totals,
      contas: lines.length,
      // Diferença total só faz sentido entre contas já reconciliadas: sem
      // nenhuma reconciliada, fica sem valor (não é zero).
      diferenca: totals.contas_reconciliadas > 0 ? totals.diferenca : null,
      saldo_real: totals.contas_reconciliadas > 0 ? totals.saldo_real : null,
    },
  };
};

/**
 * POST /api/cash-register/electronic/open-day
 * Abre o dia electrónico contra uma conta bancária já existente.
 */
export const openElectronicDay = async (params: {
  companyId: number;
  userId: number;
  bankAccountId: number | string;
  manualBalanceStart: number | string;
  day?: string;
}): Promise<any> => {
  if (!(await isElectronicCashMode(params.companyId))) {
    throw {
      code: "INVALID_MODE",
      message:
        "A empresa está em modo FÍSICO. Altere o modo de caixa nas Configurações para usar o caixa electrónico.",
    };
  }

  const account = await findAccount(params.companyId, Number(params.bankAccountId));
  if (!Number(account.getDataValue("is_active"))) {
    throw { code: "ACCOUNT_INACTIVE", message: "A conta bancária escolhida está inactiva." };
  }

  const saldoInicial = Number(params.manualBalanceStart);
  if (!Number.isFinite(saldoInicial)) {
    throw {
      code: "INVALID_BALANCE",
      message: "Informe o saldo inicial da conta hoje de manhã (MT).",
    };
  }

  const day = dayKey(params.day);
  const existing = await findDayRegister(params.companyId, params.userId, day);
  if (existing) {
    const status = String(existing.getDataValue("status"));
    throw status === "ABERTO"
      ? { code: "ALREADY_OPEN", message: "Já existe um dia electrónico aberto para esta conta hoje." }
      : {
          code: "ALREADY_CLOSED",
          message: "O dia electrónico de hoje já foi reconciliado. O fecho é imutável.",
        };
  }

  try {
    await CashRegisterModel.create({
      companyId: params.companyId,
      userId: params.userId,
      opening_date: day,
      opening_time: new Date(),
      mode: "ELECTRONIC",
      bank_account_id: Number(account.getDataValue("id")),
      manual_balance_start: round2(saldoInicial),
      // O saldo disponível do caixa físico não se aplica ao modo electrónico.
      opening_balance: 0,
      total_in: 0,
      total_out: 0,
      total_cash_in: 0,
      total_cash_out: 0,
      total_bank_in: 0,
      total_bank_out: 0,
      status: "ABERTO",
      notes: `Caixa electrónico manual — conta ${account.getDataValue("bank_name") || ""} ${
        account.getDataValue("accountNumber") || ""
      }`.trim(),
    });
    return buildElectronicDayView({ companyId: params.companyId, userId: params.userId, day });
  } catch (error: any) {
    if (String(error?.name).includes("UniqueConstraint")) {
      throw {
        code: "ALREADY_OPEN",
        message:
          "Já existe um caixa aberto hoje para este utilizador (feche o caixa físico antes de usar o modo electrónico).",
      };
    }
    throw error;
  }
};

/**
 * POST /api/cash-register/electronic/reconcile
 * Fecha o dia comparando o saldo real do banco com o teórico do sistema.
 */
export const reconcileElectronic = async (params: {
  companyId: number;
  userId: number;
  bankAccountId?: number | string | null;
  manualBalanceEnd: number | string;
  observations?: string | null;
  day?: string;
}): Promise<any> => {
  if (!(await isElectronicCashMode(params.companyId))) {
    throw {
      code: "INVALID_MODE",
      message:
        "A empresa está em modo FÍSICO. Altere o modo de caixa nas Configurações para reconciliar o caixa electrónico.",
    };
  }

  const saldoFinal = Number(params.manualBalanceEnd);
  if (!Number.isFinite(saldoFinal)) {
    throw {
      code: "INVALID_BALANCE",
      message: "Informe o saldo final real que vê no banco agora (MT).",
    };
  }

  const day = dayKey(params.day);
  const register: any = await findDayRegister(params.companyId, params.userId, day);
  if (!register) {
    throw { code: "NOT_FOUND", message: "Não existe dia electrónico aberto para reconciliar." };
  }
  if (String(register.getDataValue("status")) === "FECHADO") {
    throw { code: "ALREADY_CLOSED", message: "Este dia já foi reconciliado e é imutável." };
  }

  const registerAccountId = Number(register.getDataValue("bank_account_id"));
  const requestedAccountId = params.bankAccountId != null ? Number(params.bankAccountId) : registerAccountId;
  if (requestedAccountId !== registerAccountId) {
    throw {
      code: "INVALID_ACCOUNT",
      message: "A conta indicada não é a conta escolhida na abertura do dia.",
    };
  }

  const account = await findAccount(params.companyId, registerAccountId);
  const flows = await getAccountDayFlows(params.companyId, registerAccountId, day);
  const saldoInicial = round2(register.getDataValue("manual_balance_start") || 0);
  const teorico = round2(saldoInicial + flows.entradas - flows.saidas);
  const diferenca = round2(saldoFinal - teorico);

  const observations =
    params.observations != null && String(params.observations).trim() !== ""
      ? String(params.observations).trim()
      : null;

  await register.update({
    status: "FECHADO",
    manual_balance_end: round2(saldoFinal),
    closing_balance_informed: round2(saldoFinal),
    closing_balance_calculated: teorico,
    difference: diferenca,
    observations,
    tipo_fechamento: Math.abs(diferenca) < 0.01 ? "NORMAL" : "DIVERGENCIA",
    total_bank_in: flows.entradas,
    total_bank_out: flows.saidas,
    total_in: flows.entradas,
    total_out: flows.saidas,
    closing_time: new Date(),
    closed_at: new Date(),
    closedBy: params.userId,
  });

  const view = await buildElectronicDayView({ companyId: params.companyId, userId: params.userId, day });
  return {
    ...view,
    account: accountPlain(account),
    reconciliacao: {
      conta: `${account.getDataValue("bank_name") || ""} ${account.getDataValue("accountNumber") || ""}`.trim(),
      saldo_inicial: saldoInicial,
      entradas: flows.entradas,
      saidas: flows.saidas,
      saldo_teorico: teorico,
      saldo_real: round2(saldoFinal),
      diferenca,
      estado: Math.abs(diferenca) < 0.01 ? "CONFORME" : diferenca > 0 ? "SOBRA" : "QUEBRA",
      observations,
    },
  };
};
