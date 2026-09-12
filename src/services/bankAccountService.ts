import { Op } from "sequelize";
import { AccountModel, ACCOUNT_PURPOSES, ACCOUNT_TYPES } from "../database/models/AccountModel";
import { BankTransactionModel } from "../database/models/BankTransactionModel";

/**
 * CARTEIRA REAL — serviço de contas bancárias (CRUD + consulta de saldos).
 *
 * A tabela `accounts` agora serve dois propósitos:
 *  - dados ilustrativos dos contratos (campos antigos, mantidos);
 *  - carteira real com saldo (colunas novas geridas pelo treasuryService).
 * Este serviço apenas consulta/gerestraria dados cadastrais — NUNCA altera
 * `balance` directamente (isso é exclusivo do treasuryService).
 */

const round2 = (value: number) => Math.round(value * 100) / 100;

const accountPlain = (account: any) => {
  const plain = account.toJSON ? account.toJSON() : { ...account };
  plain.balance = Number(plain.balance) || 0;
  plain.initial_balance = Number(plain.initial_balance) || 0;
  plain.is_active = Number(plain.is_active) ? 1 : 0;
  plain.is_default_reembolso = Number(plain.is_default_reembolso) ? 1 : 0;
  plain.is_default_desembolso = Number(plain.is_default_desembolso) ? 1 : 0;
  return plain;
};

/**
 * Lista contas da empresa com filtros opcionais (usada pela página de gestão
 * e pelos q-select dos forms de desembolso/pagamento).
 */
export const getAll = async (params: {
  companyId: number;
  purpose?: string;
  isActive?: boolean;
}): Promise<any[]> => {
  const where: any = { companyId: params.companyId };
  if (params.purpose && (ACCOUNT_PURPOSES as readonly string[]).includes(params.purpose)) {
    // REEMBOLSO aceita contas REEMBOLSO + MISTO; DESEMBOLSO idem.
    if (params.purpose === "REEMBOLSO" || params.purpose === "DESEMBOLSO") {
      where.purpose = { [Op.in]: [params.purpose, "MISTO"] };
    } else {
      where.purpose = params.purpose;
    }
  }
  if (params.isActive !== undefined) where.is_active = params.isActive ? 1 : 0;

  const accounts: any[] = (await AccountModel.findAll({
    where,
    order: [["is_active", "DESC"], ["bank_name", "ASC"]],
  })) as any[];

  return accounts.map(accountPlain);
};

/**
 * Obtém uma conta pelo id (com validação de empresa).
 */
export const getOne = async (companyId: number, id: number): Promise<any | null> => {
  const account: any = await AccountModel.findOne({ where: { id, companyId } });
  return account ? accountPlain(account) : null;
};

/**
 * Saldo actual da conta.
 */
export const getBalance = async (companyId: number, id: number): Promise<number> => {
  const account: any = await AccountModel.findOne({
    where: { id, companyId },
    attributes: ["balance"],
    raw: true,
  });
  if (!account) throw { code: "NOT_FOUND", message: "Conta não encontrada." };
  return round2(Number(account.balance) || 0);
};

/**
 * Extrato da conta (bank_transactions), mais recentes primeiro.
 */
export const getStatement = async (
  companyId: number,
  accountId: number,
  limit = 200
): Promise<any[]> => {
  const rows: any[] = (await BankTransactionModel.findAll({
    where: { companyId, accountId },
    order: [["id", "DESC"]],
    limit,
  })) as any[];
  return rows.map((row) => {
    const plain = row.toJSON ? row.toJSON() : { ...row };
    plain.amount = Number(plain.amount) || 0;
    plain.balanceAfter = Number(plain.balanceAfter) || 0;
    return plain;
  });
};

/**
 * Cria/atualiza conta bancária (dados cadastrais — saldo inicial apenas na
 * criação; depois do registo, o saldo só muda por movimentos da tesouraria).
 */
export const upsert = async (params: {
  id?: number | null;
  companyId: number;
  userName: string;
  data: any;
}): Promise<any> => {
  const allowed = [
    "accountNumber", "accountDescription", "accountHolder", "bank_name", "bank_code",
    "initial_balance", "purpose", "type", "is_default_reembolso", "is_default_desembolso",
    "is_active", "currency",
  ];
  const payload: any = {};
  allowed.forEach((field) => {
    if (params.data[field] !== undefined) payload[field] = params.data[field];
  });

  // Validações de domínio.
  if (payload.purpose && !(ACCOUNT_PURPOSES as readonly string[]).includes(payload.purpose)) {
    throw { code: "INVALID_PURPOSE", message: `Finalidade inválida (${ACCOUNT_PURPOSES.join(", ")}).` };
  }
  if (payload.type && !(ACCOUNT_TYPES as readonly string[]).includes(payload.type)) {
    throw { code: "INVALID_TYPE", message: `Tipo inválido (${ACCOUNT_TYPES.join(", ")}).` };
  }
  if (!payload.accountNumber) {
    throw { code: "INVALID_ACCOUNT", message: "O número da conta é obrigatório." };
  }

  // Se esta conta for marcada como default de reembolso/desembolso, limpar a
  // marca das restantes (só pode existir UMA default por finalidade/empresa).
  for (const flag of ["is_default_reembolso", "is_default_desembolso"] as const) {
    if (Number(payload[flag]) === 1) {
      await AccountModel.update({ [flag]: 0 }, { where: { companyId: params.companyId, [flag]: 1 } });
    }
  }

  if (params.id) {
    const account: any = await AccountModel.findOne({ where: { id: params.id, companyId: params.companyId } });
    if (!account) throw { code: "NOT_FOUND", message: "Conta não encontrada." };
    await account.update({ ...payload, updatedBy: params.userName });
    return accountPlain(account);
  }

  const account: any = await AccountModel.create({
    ...payload,
    companyId: params.companyId,
    balance: 0, // saldo real começa em 0; initial_balance é referência
    createdBy: params.userName,
    updatedBy: params.userName,
  });
  return accountPlain(account);
};

/**
 * Remoção lógica (is_active = 0) — contas com histórico nunca são apagadas.
 */
export const deactivate = async (companyId: number, id: number): Promise<any> => {
  const account: any = await AccountModel.findOne({ where: { id, companyId } });
  if (!account) throw { code: "NOT_FOUND", message: "Conta não encontrada." };
  await account.update({ is_active: 0, updatedBy: "sistema" });
  return accountPlain(account);
};

/**
 * Extrato do dia agrupado por conta — para o relatório BM / fecho do caixa
 * (separação CASH vs BANK por conta).
 */
export const getStatementGroupedByAccount = async (
  companyId: number,
  date: string
): Promise<any[]> => {
  const startOfDay = `${date} 00:00:00`;
  const endOfDay = `${date} 23:59:59`;

  const rows: any[] = (await BankTransactionModel.findAll({
    where: {
      companyId,
      createdAt: { [Op.between]: [startOfDay, endOfDay] },
    },
    attributes: [
      "accountId",
      [BankTransactionModel.sequelize!.fn("SUM", BankTransactionModel.sequelize!.literal("CASE WHEN type = 'ENTRADA' THEN amount ELSE 0 END")), "total_in"],
      [BankTransactionModel.sequelize!.fn("SUM", BankTransactionModel.sequelize!.literal("CASE WHEN type = 'SAIDA' THEN amount ELSE 0 END")), "total_out"],
      [BankTransactionModel.sequelize!.fn("COUNT", BankTransactionModel.sequelize!.col("id")), "txCount"],
    ],
    group: ["accountId"],
    raw: true,
  })) as any[];

  // Enriquecer com dados da conta.
  const accountIds = rows.map((r) => Number(r.accountId));
  const accounts: any[] = accountIds.length
    ? (await AccountModel.findAll({ where: { id: { [Op.in]: accountIds } }, raw: true })) as any[]
    : [];
  const byId: Record<number, any> = {};
  accounts.forEach((a) => { byId[Number(a.id)] = a; });

  return rows.map((row) => {
    const account = byId[Number(row.accountId)] || {};
    return {
      accountId: Number(row.accountId),
      bank_name: account.bank_name || "—",
      accountNumber: account.accountNumber || "—",
      total_in: round2(Number(row.total_in) || 0),
      total_out: round2(Number(row.total_out) || 0),
      balance: round2(Number(account.balance) || 0),
      txCount: Number(row.txCount) || 0,
    };
  });
};

/**
 * CONTA DE COLECTA DEFAULT — onde caem os pagamentos automáticos do portal
 * do mutuário (M-Pesa/transferências iniciados pelo cliente).
 *
 * Ordem de preferência:
 *  1. Conta MOBILE_MONEY activa (colecta M-Pesa/e-Mola);
 *  2. Conta marcada is_default_reembolso;
 *  3. Qualquer conta activa MISTO;
 *  4. Qualquer conta activa (último recurso).
 */
export const getDefaultCollectAccount = async (companyId: number): Promise<any | null> => {
  const active = { companyId, is_active: 1 } as any;

  const mobile = await AccountModel.findOne({ where: { ...active, type: "MOBILE_MONEY" }, order: [["id", "ASC"]] });
  if (mobile) return accountPlain(mobile);

  const reembolso = await AccountModel.findOne({ where: { ...active, is_default_reembolso: 1 }, order: [["id", "ASC"]] });
  if (reembolso) return accountPlain(reembolso);

  const misto = await AccountModel.findOne({ where: { ...active, purpose: "MISTO" }, order: [["id", "ASC"]] });
  if (misto) return accountPlain(misto);

  const any = await AccountModel.findOne({ where: active, order: [["id", "ASC"]] });
  return any ? accountPlain(any) : null;
};

export { ACCOUNT_PURPOSES, ACCOUNT_TYPES };
