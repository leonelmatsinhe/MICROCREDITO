import { db } from "../database/db";
import { Op } from "sequelize";
import { AccountModel, ACCOUNT_PURPOSES, ACCOUNT_TYPES } from "../database/models/AccountModel";
import { CashRegisterModel } from "../database/models/CashRegisterModel";
import { CashMovementModel } from "../database/models/CashMovementModel";
import { BankTransactionModel } from "../database/models/BankTransactionModel";

/**
 * TESOURARIA — SERVIÇO CENTRAL (único ponto que altera saldos reais).
 *
 * Todas as operações de dinheiro passam por registerMovement(), que dentro de
 * UMA transacção MySQL:
 *  1. valida o caixa ABERTO do dia (obrigatório mesmo para movimentos BANK —
 *     o caixa é o diário de auditoria);
 *  2. valida método/conta (BANK exige bankAccountId de conta activa);
 *  3. insere em cash_movements;
 *  4. se electrónico: insere em bank_transactions e actualiza accounts.balance
 *     (com bloqueio da linha SELECT ... FOR UPDATE para evitar corridas);
 *  5. recalcula os totais cash/bank do cash_register;
 *  6. COMMIT / ROLLBACK.
 *
 * Regra adicional: contas BANCO activas nunca ficam com saldo negativo.
 */

export type MovementInput = {
  companyId: number;
  userId?: number | null;
  type: "ENTRADA" | "SAIDA";
  category: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "MPESA" | "EMOLA";
  bankAccountId?: number | null;
  description: string;
  reference?: { type?: string | null; id?: number | null };
  loanId?: number | null;
  amortizationLoanId?: number | null;
  tranzactionId?: number | null;
  customerId?: number | null;
  automatic?: boolean;
  /**
   * Portal do mutuário: o pagamento do cliente TEM de ser aceite mesmo fora
   * do expediente. Com esta flag, se não houver caixa ABERTO do dia, o
   * movimento cai no "Caixa do Sistema" (criado automaticamente) e fica
   * marcado para reconciliação quando um operador abrir o caixa real.
   */
  allowWithoutOpenRegister?: boolean;
};

// Métodos que movem dinheiro electrónico (totais bank_* do caixa).
export const isElectronic = (method: string): boolean =>
  method === "BANK" || method === "MPESA" || method === "EMOLA";

// Arredonda para 2 casas (dinheiro).
const round2 = (value: number) => Math.round(value * 100) / 100;

// Dia actual (YYYY-MM-DD) — igual ao resto do sistema.
export const todayKey = (): string => new Date().toISOString().slice(0, 10);

const sign = (type: string, amount: number): number =>
  type === "ENTRADA" ? round2(amount) : -round2(amount);

/**
 * CAIXA DO SISTEMA — caixa técnico para movimentos que chegam FORA do
 * expediente (pagamentos do portal do mutuário em M-Pesa/transferência).
 *
 * Características:
 *  - userId = 0 (não é de nenhum operador — não conta no índice único deles);
 *  - opening_balance = 0 e opening_date = hoje;
 *  - status ABERTO até ser reconciliado: quando um operador abrir o caixa
 *    real do dia, o admin pode fechar este no Histórico (o valor contado
 *    bate com o calculado porque só tem dinheiro electrónico).
 * Idempotente: se já existir um Caixa do Sistema hoje, reutiliza-o.
 */
export const getOrCreateSystemRegister = async (companyId: number, transaction?: any): Promise<any> => {
  const existing: any = await CashRegisterModel.findOne({
    where: { companyId, userId: 0, status: "ABERTO", opening_date: todayKey() },
    order: [["id", "DESC"]],
    ...(transaction ? { transaction, lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined } : {}),
  });
  if (existing) return existing;

  try {
    const created: any = await CashRegisterModel.create(
      {
        companyId,
        userId: 0,
        opening_date: todayKey(),
        opening_time: new Date(),
        opening_balance: 0,
        total_in: 0,
        total_out: 0,
        total_cash_in: 0,
        total_cash_out: 0,
        total_bank_in: 0,
        total_bank_out: 0,
        status: "ABERTO",
        notes: "Caixa técnico do portal — pagamentos recebidos fora do expediente. Reconciliar no fecho do caixa real.",
      },
      ...(transaction ? [{ transaction }] : [])
    );
    console.log(`[TESOURARIA] Caixa do Sistema aberto automaticamente (empresa ${companyId}) — movimento fora de expediente`);
    return created;
  } catch (error: any) {
    // Corrida concorrente: outro processo criou entretanto — buscar e reutilizar.
    if (String(error?.name).includes("UniqueConstraint")) {
      const retry: any = await CashRegisterModel.findOne({
        where: { companyId, userId: 0, status: "ABERTO", opening_date: todayKey() },
        ...(transaction ? { transaction } : {}),
      });
      if (retry) return retry;
    }
    throw error;
  }
};

/**
 * REGISTO CENTRAL DE MOVIMENTOS — toda a lógica de dinheiro num só lugar.
 * Lança { code, message } em caso de regra violada (transacção revertida).
 */
export const registerMovement = async (input: MovementInput): Promise<any> => {
  const {
    companyId,
    userId = null,
    type,
    category,
    amount,
    paymentMethod,
    bankAccountId = null,
    description,
    reference,
    loanId = null,
    amortizationLoanId = null,
    tranzactionId = null,
    customerId = null,
    automatic = false,
    allowWithoutOpenRegister = false,
  } = input;

  // ── Validações de entrada ──
  if (type !== "ENTRADA" && type !== "SAIDA") {
    throw { code: "INVALID_TYPE", message: "Tipo inválido (ENTRADA ou SAIDA)." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw { code: "INVALID_AMOUNT", message: "O valor deve ser maior que zero." };
  }
  if (!description || !String(description).trim()) {
    throw { code: "INVALID_DESCRIPTION", message: "A descrição é obrigatória." };
  }

  const transaction = await db.transaction();
  try {
    // ── Passo 1: caixa ABERTO do dia é obrigatório (diário de auditoria) ──
    let register: any = await CashRegisterModel.findOne({
      where: {
        companyId,
        status: "ABERTO",
        opening_date: todayKey(),
        // Movimentos automáticos podem chegar sem userId definido; nesse caso
        // aceita qualquer caixa aberto de hoje da empresa (o primeiro).
        ...(userId ? { userId } : {}),
      },
      order: [["id", "DESC"]],
      lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
      transaction,
    });

    // ── PORTAL DO MUTUÁRIO: pagamento nunca é rejeitado por caixa fechado ──
    // O dinheiro electrónico (M-Pesa/transferência) entrou na conta bancária
    // independentemente do expediente. O movimento cai no "Caixa do Sistema"
    // do dia (aberto automaticamente) e aparece marcado para reconciliação.
    let usedSystemRegister = false;
    if (!register && allowWithoutOpenRegister) {
      register = await getOrCreateSystemRegister(companyId, transaction);
      usedSystemRegister = true;
    }

    if (!register) {
      throw { code: "CAIXA_FECHADO", message: "Abra o caixa do dia para continuar" };
    }

    // ── Passo 2: validações de método/conta ──
    let account: any = null;
    if (isElectronic(paymentMethod)) {
      if (!bankAccountId) {
        throw { code: "BANK_ACCOUNT_REQUIRED", message: "Conta bancária obrigatória para pagamentos electrónicos." };
      }
      account = await AccountModel.findOne({
        where: { id: bankAccountId, companyId },
        transaction,
        lock: transaction.LOCK ? transaction.LOCK.UPDATE : undefined,
      });
      if (!account) {
        throw { code: "ACCOUNT_NOT_FOUND", message: "Conta bancária não encontrada." };
      }
      if (!Number(account.getDataValue("is_active"))) {
        throw { code: "ACCOUNT_INACTIVE", message: "A conta bancária está inactiva." };
      }
    }

    // ── Passo 3: inserir em cash_movements ──
    // Movimentos do Caixa do Sistema ganham a etiqueta no início da descrição
    // (visível na tabela e no PDF) — nunca se misturam com o dinheiro da gaveta.
    const finalDescription = usedSystemRegister
      ? `[Portal — fora de expediente] ${String(description).trim()}`
      : String(description).trim();

    const movement: any = await CashMovementModel.create(
      {
        companyId,
        cashRegisterId: register.getDataValue("id"),
        bankAccountId: account ? bankAccountId : null,
        type,
        paymentMethod,
        category,
        amount: round2(amount),
        description: finalDescription,
        loanId,
        amortizationLoanId,
        tranzactionId,
        customerId,
        referenceType: reference?.type ?? null,
        referenceId: reference?.id ?? null,
        isAutomatic: automatic,
        createdBy: userId,
      },
      { transaction }
    );

    // ── Passo 4: dinheiro electrónico → bank_transactions + saldo real ──
    if (account) {
      const current = Number(account.getDataValue("balance")) || 0;
      const delta = sign(type, amount);
      const newBalance = round2(current + delta);

      // Contas BANCO activas nunca ficam negativas.
      if (newBalance < 0 && String(account.getDataValue("type")) === "BANCO" && Number(account.getDataValue("is_active"))) {
        throw {
          code: "INSUFFICIENT_FUNDS",
          message: `Saldo insuficiente em ${account.getDataValue("bank_name")} ${account.getDataValue("accountNumber")} (disponível: ${current.toFixed(2)} MZN).`,
        };
      }

      await account.update({ balance: newBalance }, { transaction });

      await BankTransactionModel.create(
        {
          companyId,
          accountId: bankAccountId,
          cashRegisterId: register.getDataValue("id"),
          type,
          // Mapeia a categoria do caixa para a categoria do extrato bancário.
          category: mapToBankCategory(category),
          amount: round2(amount),
          balanceAfter: newBalance,
          description: finalDescription,
          referenceType: reference?.type ?? null,
          referenceId: reference?.id ?? null,
          createdBy: userId,
        },
        { transaction }
      );
    }

    // ── Passo 5: recalcular totais CASH/BANK do caixa (fonte de verdade) ──
    await recalculateRegisterTotals(register.getDataValue("id"), transaction);

    await transaction.commit();

    if (automatic) {
      console.log(
        `[TESOURARIA] ${type}/${category}/${paymentMethod} ${round2(amount)} MZN — caixa #${register.getDataValue("id")}${usedSystemRegister ? " (SISTEMA/portal)" : ""}` +
        (account ? ` · conta #${bankAccountId}` : "")
      );
    }
    return movement;
  } catch (error: any) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Mapeia a categoria do caixa para a categoria do extrato bancário.
 * Categorias manuais em conta bancária são registadas como OUTROS no extrato.
 */
const mapToBankCategory = (category: string): string => {
  switch (category) {
    case "DESEMBOLSO": return "DESEMBOLSO_BANCO";
    case "REEMBOLSO":
    case "JUROS_MORA":
    case "TAXA_ADMIN": return "REEMBOLSO_BANCO";
    case "DEPOSITO_BANCO": return "DEPOSITO_CAIXA";
    case "LEVANTAMENTO_BANCO": return "LEVANTAMENTO_BANCO";
    default: return "OUTROS";
  }
};

/**
 * Recalcula os 4 totais do caixa a partir dos movimentos persistidos
 * (total_in/out globais + total_cash_in/out + total_bank_in/out).
 * Exportado também para o cashRegisterService (fecho do caixa).
 */
export const recalculateRegisterTotals = async (registerId: number, transaction?: any): Promise<{
  totalIn: number; totalOut: number; totalCashIn: number; totalCashOut: number; totalBankIn: number; totalBankOut: number;
}> => {
  const rows: any[] = (await CashMovementModel.findAll({
    where: { cashRegisterId: registerId },
    attributes: ["type", "paymentMethod", "amount"],
    raw: true,
    ...(transaction ? { transaction } : {}),
  })) as any[];

  let totalIn = 0, totalOut = 0, totalCashIn = 0, totalCashOut = 0, totalBankIn = 0, totalBankOut = 0;
  rows.forEach((row) => {
    const amount = Number(row.amount) || 0;
    const electronic = isElectronic(String(row.paymentMethod));
    if (row.type === "ENTRADA") {
      totalIn += amount;
      if (electronic) totalBankIn += amount; else totalCashIn += amount;
    } else {
      totalOut += amount;
      if (electronic) totalBankOut += amount; else totalCashOut += amount;
    }
  });

  const totals = {
    totalIn: round2(totalIn),
    totalOut: round2(totalOut),
    totalCashIn: round2(totalCashIn),
    totalCashOut: round2(totalCashOut),
    totalBankIn: round2(totalBankIn),
    totalBankOut: round2(totalBankOut),
  };

  // IMPORTANTE: as colunas da tabela são snake_case (total_in, total_cash_in,
  // ...). O update estático do Sequelize INTERSECTA as chaves com os atributos
  // do modelo e descarta silenciosamente as desconhecidas — usar as chaves
  // camelCase aqui fazia o update correr sem gravar NADA (bug dos totais a 0).
  await CashRegisterModel.update(
    {
      total_in: totals.totalIn,
      total_out: totals.totalOut,
      total_cash_in: totals.totalCashIn,
      total_cash_out: totals.totalCashOut,
      total_bank_in: totals.totalBankIn,
      total_bank_out: totals.totalBankOut,
    },
    {
      where: { id: registerId },
      ...(transaction ? { transaction } : {}),
    }
  );
  return totals;
};

/**
 * TRANSFERÊNCIA entre duas contas da carteira (ex.: FNB → BCI).
 * Cria SAIDA na origem + ENTRADA no destino, ambas categoria TRANSFERENCIA,
 * na mesma transacção. Respeita saldo não-negativo na origem.
 */
export const transferBetweenAccounts = async (params: {
  companyId: number;
  userId?: number | null;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description?: string;
}): Promise<any> => {
  const { companyId, userId = null, fromAccountId, toAccountId, amount } = params;
  if (fromAccountId === toAccountId) {
    throw { code: "INVALID_TRANSFER", message: "Origem e destino têm de ser contas diferentes." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw { code: "INVALID_AMOUNT", message: "O valor da transferência deve ser maior que zero." };
  }

  // Origem: SAIDA / TRANSFERENCIA (valida saldo dentro do registerMovement).
  const out = await registerMovement({
    companyId,
    userId,
    type: "SAIDA",
    category: "TRANSFERENCIA",
    amount,
    paymentMethod: "BANK",
    bankAccountId: fromAccountId,
    description: params.description?.trim() || `Transferência para conta #${toAccountId}`,
    reference: { type: "accounts", id: toAccountId },
    automatic: true,
  });

  // Destino: ENTRADA / TRANSFERENCIA.
  await registerMovement({
    companyId,
    userId,
    type: "ENTRADA",
    category: "TRANSFERENCIA",
    amount,
    paymentMethod: "BANK",
    bankAccountId: toAccountId,
    description: params.description?.trim() || `Transferência recebida da conta #${fromAccountId}`,
    reference: { type: "accounts", id: fromAccountId },
    automatic: true,
  });

  return out;
};

/**
 * DEPÓSITO de dinheiro físico no banco (casa de moeda CASH→BANK).
 * Cria SAIDA/CASH (DEPOSITO_BANCO) + ENTRADA/BANK (DEPOSITO_CAIXA) na mesma
 * transacção lógica. O caixa ABERTO é validado pelas duas chamadas.
 */
export const transferCashToBank = async (params: {
  companyId: number;
  userId?: number | null;
  toAccountId: number;
  amount: number;
  description?: string;
}): Promise<any> => {
  const { companyId, userId = null, toAccountId, amount } = params;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw { code: "INVALID_AMOUNT", message: "O valor do depósito deve ser maior que zero." };
  }

  // Passo 1 — sai dinheiro físico da gaveta.
  const out = await registerMovement({
    companyId,
    userId,
    type: "SAIDA",
    category: "DEPOSITO_BANCO",
    amount,
    paymentMethod: "CASH",
    description: params.description?.trim() || `Depósito no banco (conta #${toAccountId})`,
    reference: { type: "accounts", id: toAccountId },
    automatic: true,
  });

  // Passo 2 — entra dinheiro electrónico na conta.
  await registerMovement({
    companyId,
    userId,
    type: "ENTRADA",
    category: "DEPOSITO_BANCO",
    amount,
    paymentMethod: "BANK",
    bankAccountId: toAccountId,
    description: params.description?.trim() || `Depósito em dinheiro (do caixa do dia)`,
    reference: { type: "cash_movements", id: Number(out?.getDataValue?.("id")) || null },
    automatic: true,
  });

  return out;
};

/**
 * LEVANTAMENTO de dinheiro físico no banco (BANK→CASH).
 * SAIDA/BANK na conta + ENTRADA/CASH no caixa.
 */
export const transferBankToCash = async (params: {
  companyId: number;
  userId?: number | null;
  fromAccountId: number;
  amount: number;
  description?: string;
}): Promise<any> => {
  const { companyId, userId = null, fromAccountId, amount } = params;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw { code: "INVALID_AMOUNT", message: "O valor do levantamento deve ser maior que zero." };
  }

  // Passo 1 — sai dinheiro electrónico da conta (valida saldo).
  const out = await registerMovement({
    companyId,
    userId,
    type: "SAIDA",
    category: "LEVANTAMENTO_BANCO",
    amount,
    paymentMethod: "BANK",
    bankAccountId: fromAccountId,
    description: params.description?.trim() || `Levantamento em dinheiro (conta #${fromAccountId})`,
    reference: { type: "accounts", id: fromAccountId },
    automatic: true,
  });

  // Passo 2 — entra dinheiro físico na gaveta.
  await registerMovement({
    companyId,
    userId,
    type: "ENTRADA",
    category: "LEVANTAMENTO_BANCO",
    amount,
    paymentMethod: "CASH",
    description: params.description?.trim() || `Levantamento em dinheiro recebido`,
    reference: { type: "bank_movements", id: Number(out?.getDataValue?.("id")) || null },
    automatic: true,
  });

  return out;
};

/**
 * Saldo agregado da carteira (para o card "Saldo em Bancos" do dashboard):
 * soma accounts.balance por tipo, opcionalmente só activas.
 */
export const getWalletTotals = async (companyId: number): Promise<{
  bank: number; cash: number; mobile: number; ewallet: number; total: number;
}> => {
  const accounts: any[] = (await AccountModel.findAll({
    where: { companyId, is_active: 1 },
    attributes: ["type", "balance"],
    raw: true,
  })) as any[];

  const totals = { bank: 0, cash: 0, mobile: 0, ewallet: 0, total: 0 };
  accounts.forEach((a) => {
    const balance = Number(a.balance) || 0;
    const type = String(a.type);
    if (type === "BANCO") totals.bank += balance;
    else if (type === "CAIXA_FISICO") totals.cash += balance;
    else if (type === "MOBILE_MONEY") totals.mobile += balance;
    else totals.ewallet += balance;
    totals.total += balance;
  });

  return {
    bank: round2(totals.bank),
    cash: round2(totals.cash),
    mobile: round2(totals.mobile),
    ewallet: round2(totals.ewallet),
    total: round2(totals.total),
  };
};

// Re-exportações para os controladores não importarem múltiplos módulos.
export { ACCOUNT_PURPOSES, ACCOUNT_TYPES };
