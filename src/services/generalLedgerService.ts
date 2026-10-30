import { db } from "../database/db";
import {
  GeneralLedgerEntryModel,
  GeneralLedgerLineModel,
  PGC_ACCOUNTS,
} from "../database/models/GeneralLedgerModel";
import { AccountModel } from "../database/models/AccountModel";
import { Op } from "sequelize";

const round2 = (val: any) => Math.round((Number(val) || 0) * 100) / 100;

export interface JournalLineInput {
  accountCode: string;
  accountName?: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntryInput {
  companyId: number;
  date?: string;
  eventType:
    | "DESEMBOLSO"
    | "REEMBOLSO"
    | "TAXA_ADMIN"
    | "DESPESA"
    | "TRANSFERENCIA"
    | "REFORCO"
    | "ENTREGA_COFRE"
    | "QUEBRA_CAIXA"
    | "SOBRA_CAIXA"
    | "AJUSTE";
  description: string;
  referenceType?: string;
  referenceId?: number;
  createdBy?: number;
  lines: JournalLineInput[];
}

/**
 * Garante que as tabelas de razão contabilístico existem no banco de dados.
 */
export const ensureLedgerTables = async (): Promise<void> => {
  await GeneralLedgerEntryModel.sync({ alter: false });
  await GeneralLedgerLineModel.sync({ alter: false });
};

/**
 * Regista um lançamento no diário de partidas dobradas com validação matemática:
 * soma dos débitos deve ser igual à soma dos créditos.
 */
export const recordJournalEntry = async (
  input: JournalEntryInput,
  externalTransaction?: any
): Promise<any> => {
  const {
    companyId,
    date = new Date().toISOString().slice(0, 10),
    eventType,
    description,
    referenceType = null,
    referenceId = null,
    createdBy = null,
    lines,
  } = input;

  if (!lines || lines.length < 2) {
    throw new Error("Um lançamento contabilístico requer pelo menos duas linhas (partidas dobradas).");
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    totalDebit = round2(totalDebit + round2(line.debit));
    totalCredit = round2(totalCredit + round2(line.credit));
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Lançamento desbalanceado: Débitos (${totalDebit.toFixed(2)}) ≠ Créditos (${totalCredit.toFixed(2)}).`
    );
  }

  const runner = async (transaction: any) => {
    await ensureLedgerTables();

    const countToday = await GeneralLedgerEntryModel.count({
      where: { companyId, entry_date: date },
      transaction,
    });
    const year = date.slice(0, 4);
    const entryNumber = `LAN-${year}-${String(countToday + 1).padStart(5, "0")}`;

    const entry: any = await GeneralLedgerEntryModel.create(
      {
        companyId,
        entry_number: entryNumber,
        entry_date: date,
        event_type: eventType,
        description,
        reference_type: referenceType,
        reference_id: referenceId,
        created_by: createdBy,
      },
      { transaction }
    );

    const lineRecords = lines.map((l) => {
      const pgc = PGC_ACCOUNTS[l.accountCode];
      return {
        companyId,
        entry_id: entry.id,
        account_code: l.accountCode,
        account_name: l.accountName || pgc?.name || `Conta ${l.accountCode}`,
        debit: round2(l.debit),
        credit: round2(l.credit),
        description: l.description || description,
      };
    });

    await GeneralLedgerLineModel.bulkCreate(lineRecords, { transaction });
    return entry;
  };

  if (externalTransaction) {
    return runner(externalTransaction);
  }
  return db.transaction(runner);
};

/**
 * Resolve o código de conta PGC da tesouraria com base no método de pagamento ou conta bancária.
 */
export const resolveLiquidityAccountCode = async (
  paymentMethod: string,
  bankAccountId?: number | null
): Promise<{ code: string; name: string }> => {
  const method = String(paymentMethod || "CASH").toUpperCase();
  if (method === "CASH") {
    return { code: "11.0", name: "Caixa de Balcão (Guichê)" };
  }
  if (bankAccountId) {
    const acc: any = await AccountModel.findByPk(bankAccountId);
    if (acc) {
      const type = String(acc.type || "BANCO").toUpperCase();
      if (type === "MOBILE_MONEY" || type === "EWALLET") {
        return { code: "13.1", name: `Carteira Móvel (${acc.bank_name || "M-Pesa"})` };
      }
      if (type === "CAIXA_FISICO") {
        return { code: "11.1", name: `Cofre Físico (${acc.bank_name || "Cofre Central"})` };
      }
      return { code: "12.1", name: `Banco (${acc.bank_name || "Depósito à Ordem"})` };
    }
  }
  if (method === "MPESA" || method === "EMOLA") {
    return { code: "13.1", name: `Carteira Móvel (${method})` };
  }
  return { code: "12.1", name: "Bancos — Depósitos à Ordem" };
};

/**
 * Lançamento Contabilístico Automático: DESEMBOLSO DE CRÉDITO
 */
export const recordDisbursementLedger = async (params: {
  companyId: number;
  loanId: number;
  amount: number;
  paymentMethod: string;
  bankAccountId?: number | null;
  adminFee?: number;
  adminFeeAccountId?: number | null;
  userId?: number;
}): Promise<void> => {
  try {
    const { companyId, loanId, amount, paymentMethod, bankAccountId, adminFee = 0, adminFeeAccountId, userId } = params;
    const liquidity = await resolveLiquidityAccountCode(paymentMethod, bankAccountId);
    const lines: JournalLineInput[] = [
      {
        accountCode: "21.1",
        accountName: "Créditos Concedidos — Carteira Corrente",
        debit: round2(amount),
        credit: 0,
        description: `Concessão de capital — crédito #${loanId}`,
      },
      {
        accountCode: liquidity.code,
        accountName: liquidity.name,
        debit: 0,
        credit: round2(amount),
        description: `Saída de fundos para desembolso — crédito #${loanId}`,
      },
    ];

    if (adminFee > 0) {
      const feeLiquidity = await resolveLiquidityAccountCode(paymentMethod, adminFeeAccountId);
      lines.push(
        {
          accountCode: feeLiquidity.code,
          accountName: feeLiquidity.name,
          debit: round2(adminFee),
          credit: 0,
          description: `Entrada da taxa administrativa — crédito #${loanId}`,
        },
        {
          accountCode: "72.1",
          accountName: "Comissões e Taxas Administrativas",
          debit: 0,
          credit: round2(adminFee),
          description: `Proveito da taxa administrativa — crédito #${loanId}`,
        }
      );
    }

    await recordJournalEntry({
      companyId,
      eventType: "DESEMBOLSO",
      description: `Desembolso de crédito #${loanId}`,
      referenceType: "customer_loans",
      referenceId: loanId,
      createdBy: userId,
      lines,
    });
  } catch (err: any) {
    console.error("[GeneralLedger] Falha ao registar lançamento de desembolso:", err?.message || err);
  }
};

/**
 * Lançamento Contabilístico Automático: REEMBOLSO / COBRANÇA DE PRESTAÇÃO
 */
export const recordRepaymentLedger = async (params: {
  companyId: number;
  tranzactionId: number;
  loanId: number;
  capital: number;
  interest: number;
  lateInterest?: number;
  paymentMethod: string;
  bankAccountId?: number | null;
  userId?: number;
}): Promise<void> => {
  try {
    const { companyId, tranzactionId, loanId, capital, interest, lateInterest = 0, paymentMethod, bankAccountId, userId } = params;
    const totalReceived = round2(capital + interest + lateInterest);
    if (totalReceived <= 0) return;

    const liquidity = await resolveLiquidityAccountCode(paymentMethod, bankAccountId);
    const lines: JournalLineInput[] = [
      {
        accountCode: liquidity.code,
        accountName: liquidity.name,
        debit: round2(totalReceived),
        credit: 0,
        description: `Recebimento de prestação — crédito #${loanId}`,
      },
    ];

    if (capital > 0) {
      lines.push({
        accountCode: "21.1",
        accountName: "Créditos Concedidos — Carteira Corrente",
        debit: 0,
        credit: round2(capital),
        description: `Amortização de capital — crédito #${loanId}`,
      });
    }

    if (interest > 0) {
      lines.push({
        accountCode: "71.1",
        accountName: "Proveitos de Juros de Empréstimos",
        debit: 0,
        credit: round2(interest),
        description: `Juros remuneratórios — crédito #${loanId}`,
      });
    }

    if (lateInterest > 0) {
      lines.push({
        accountCode: "73.1",
        accountName: "Juros de Mora e Penalizações",
        debit: 0,
        credit: round2(lateInterest),
        description: `Juros de mora por atraso — crédito #${loanId}`,
      });
    }

    await recordJournalEntry({
      companyId,
      eventType: "REEMBOLSO",
      description: `Reembolso de prestação — crédito #${loanId} (transacção #${tranzactionId})`,
      referenceType: "tranzactions",
      referenceId: tranzactionId,
      createdBy: userId,
      lines,
    });
  } catch (err: any) {
    console.error("[GeneralLedger] Falha ao registar lançamento de reembolso:", err?.message || err);
  }
};

/**
 * Lançamento Contabilístico Automático: DESPESA ADMINISTRATIVA (OPEX)
 */
export const recordExpenseLedger = async (params: {
  companyId: number;
  cashMovementId: number;
  category: string;
  amount: number;
  paymentMethod: string;
  bankAccountId?: number | null;
  description: string;
  userId?: number;
}): Promise<void> => {
  try {
    const { companyId, cashMovementId, category, amount, paymentMethod, bankAccountId, description, userId } = params;
    const liquidity = await resolveLiquidityAccountCode(paymentMethod, bankAccountId);

    let expenseCode = "62.1";
    let expenseName = "Fornecimentos e Serviços (Água, Luz, Internet)";
    const catUpper = String(category).toUpperCase();

    if (catUpper.includes("SALARIO") || catUpper.includes("SALARIOS")) {
      expenseCode = "63.1";
      expenseName = "Gastos com Pessoal — Salários";
    } else if (catUpper.includes("COMBUSTIVEL") || catUpper.includes("TRANSPORTE")) {
      expenseCode = "62.2";
      expenseName = "Combustível e Deslocações";
    } else if (catUpper.includes("MATERIAL")) {
      expenseCode = "62.3";
      expenseName = "Material de Escritório";
    } else if (catUpper.includes("DIFERENCA")) {
      expenseCode = "68.1";
      expenseName = "Quebras de Caixa (Conta 58)";
    }

    const lines: JournalLineInput[] = [
      {
        accountCode: expenseCode,
        accountName: expenseName,
        debit: round2(amount),
        credit: 0,
        description: description || `Despesa operacional (${category})`,
      },
      {
        accountCode: liquidity.code,
        accountName: liquidity.name,
        debit: 0,
        credit: round2(amount),
        description: `Saída de fundos para pagamento de despesa`,
      },
    ];

    await recordJournalEntry({
      companyId,
      eventType: "DESPESA",
      description: `Despesa: ${description || category}`,
      referenceType: "cash_movements",
      referenceId: cashMovementId,
      createdBy: userId,
      lines,
    });
  } catch (err: any) {
    console.error("[GeneralLedger] Falha ao registar lançamento de despesa:", err?.message || err);
  }
};

/**
 * BALANCETE DE VERIFICAÇÃO (Trial Balance)
 */
export const getTrialBalance = async (
  companyId: number,
  startDate: string,
  endDate: string
): Promise<any> => {
  await ensureLedgerTables();

  const [rows]: any = await db.query(
    `SELECT l.account_code, l.account_name,
            COALESCE(SUM(l.debit), 0) AS total_debit,
            COALESCE(SUM(l.credit), 0) AS total_credit
       FROM general_ledger_lines l
       JOIN general_ledger_entries e ON e.id = l.entry_id
      WHERE l.companyId = ?
        AND e.entry_date BETWEEN ? AND ?
      GROUP BY l.account_code, l.account_name
      ORDER BY l.account_code ASC`,
    { replacements: [companyId, startDate, endDate] }
  );

  let grandDebit = 0;
  let grandCredit = 0;

  const accounts = (rows as any[]).map((r) => {
    const debit = round2(r.total_debit);
    const credit = round2(r.total_credit);
    grandDebit = round2(grandDebit + debit);
    grandCredit = round2(grandCredit + credit);
    const pgc = PGC_ACCOUNTS[r.account_code];
    const isActivoOrCusto = pgc?.classType === "ACTIVO" || pgc?.classType === "CUSTO";
    const balance = isActivoOrCusto ? round2(debit - credit) : round2(credit - debit);

    return {
      code: r.account_code,
      name: r.account_name,
      classType: pgc?.classType || "OUTRO",
      totalDebit: debit,
      totalCredit: credit,
      balance,
    };
  });

  return {
    period: { start: startDate, end: endDate },
    accounts,
    totals: {
      totalDebit: grandDebit,
      totalCredit: grandCredit,
      isBalanced: Math.abs(grandDebit - grandCredit) < 0.01,
    },
  };
};

/**
 * DEMONSTRAÇÃO DE RESULTADOS DO EXERCÍCIO (DRE)
 */
export const getIncomeStatement = async (
  companyId: number,
  startDate: string,
  endDate: string
): Promise<any> => {
  const trial = await getTrialBalance(companyId, startDate, endDate);
  const revenues = trial.accounts.filter((a: any) => a.classType === "PROVEITO");
  const expenses = trial.accounts.filter((a: any) => a.classType === "CUSTO");

  const totalRevenues = round2(revenues.reduce((s: number, a: any) => s + a.balance, 0));
  const totalExpenses = round2(expenses.reduce((s: number, a: any) => s + a.balance, 0));
  const netIncome = round2(totalRevenues - totalExpenses);

  return {
    period: { start: startDate, end: endDate },
    revenues,
    expenses,
    totals: {
      totalRevenues,
      totalExpenses,
      netIncome,
    },
  };
};
