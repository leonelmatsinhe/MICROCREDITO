import moment from "moment";
import { Op } from "sequelize";
import { db } from "../database/db";
import { LoanModel } from "../database/models/LoanModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { installmentPanification } from "../utils/calculateLateAmount";
import { getWalletWithAnalytics, WalletWithAnalytics } from "./financingWalletService";

/**
 * PORTAL DO PARCEIRO FINANCIADOR (userRole 4)
 * ------------------------------------------
 * TODAS as funções deste serviço recebem obrigatoriamente o `walletId` do
 * parceiro autenticado e filtram por ele. Não existe, em nenhuma função,
 * forma de o parceiro ver dados de outra carteira: a carteira vem sempre do
 * utilizador (middleware isPartner), nunca de um parâmetro do pedido.
 */

const round2 = (value: number): number => Math.round((Number(value) || 0) * 100) / 100;
const num = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type PartnerScope = { companyId: number; walletId: number };

export const getPartnerWallet = async (scope: PartnerScope): Promise<WalletWithAnalytics | null> =>
  getWalletWithAnalytics(scope.companyId, scope.walletId);

export const getPartnerCompany = async (companyId: number) =>
  (await CompanyModel.findByPk(companyId, { raw: true })) as any;

/** Nomes dos clientes por accountNumber/customerId (evita N+1). */
const attachCustomers = async (companyId: number, rows: any[]): Promise<Map<string, any>> => {
  const accounts = Array.from(
    new Set(rows.map((row) => (row.accountNumber === null || row.accountNumber === undefined ? null : String(row.accountNumber))).filter(Boolean))
  ) as string[];
  if (accounts.length === 0) return new Map();

  const customers: any[] = (await CustomerModel.findAll({
    where: { companyId, accountNumber: { [Op.in]: accounts } },
    attributes: ["id", "accountNumber", "customerName", "customerNuit", "customerPhone", "customerType"],
    raw: true,
  })) as any[];

  const map = new Map<string, any>();
  customers.forEach((customer) => map.set(String(customer.accountNumber), customer));
  return map;
};

const customerFor = (map: Map<string, any>, row: any) => {
  if (row.customerId !== null && row.customerId !== undefined) {
    for (const customer of map.values()) {
      if (Number(customer.id) === Number(row.customerId)) return customer;
    }
  }
  return map.get(String(row.accountNumber)) || null;
};

/** Mora por empréstimo (calculada com a mesma regra do relatório oficial). */
const loadMoraByLoan = async (scope: PartnerScope) => {
  const loans: any[] = (await LoanModel.findAll({
    where: { companyId: scope.companyId, walletId: scope.walletId, status: { [Op.in]: [1, 3] } },
    attributes: ["id"],
    raw: true,
  })) as any[];
  if (loans.length === 0) return { byLoan: new Map<number, any>(), byInstallment: new Map<number, number>() };

  const forfeitRow: any = (await CompanyModel.findByPk(scope.companyId, { attributes: ["forfeit"], raw: true })) as any;
  const forfeit = num(forfeitRow?.forfeit);

  const installments: any[] = (await AmorizationLoanModel.findAll({
    where: { loanId: { [Op.in]: loans.map((loan) => Number(loan.id)) } },
    order: [["dueDate", "ASC"], ["id", "ASC"]],
    raw: true,
  })) as any[];

  const byInstallment = new Map<number, number>();
  const byLoan = new Map<number, any>();
  const grouped = new Map<number, any[]>();
  installments.forEach((item) => {
    const loanId = Number(item.loanId);
    if (!grouped.has(loanId)) grouped.set(loanId, []);
    grouped.get(loanId)!.push(item);
  });

  grouped.forEach((list, loanId) => {
    const calculated = installmentPanification(list, forfeit);
    let generated = 0;
    let overdueCount = 0;
    let maxDays = 0;
    const now = moment();
    calculated.forEach((item: any) => {
      const dueDate = moment(item.dueDate);
      const mora = num(item.latePaymentInterest);
      if (mora > 0) {
        byInstallment.set(Number(item.id), mora);
      }
      if ([0, -1].includes(Number(item.status)) && dueDate.isBefore(now, "day")) {
        overdueCount += 1;
        generated += mora;
        maxDays = Math.max(maxDays, now.diff(dueDate, "days"));
      }
    });
    byLoan.set(loanId, { mora_gerada: round2(generated), prestacoes_atraso: overdueCount, dias_atraso_max: maxDays });
  });

  return { byLoan, byInstallment };
};

/** Mora efectivamente recebida por prestação. */
const loadMoraReceived = async (scope: PartnerScope): Promise<Map<number, number>> => {
  const rows: any[] = (await db.query(
    `SELECT amortizationLoanId,
            SUM(COALESCE(NULLIF(mora_amount, 0), latePaymentInterest, 0)) AS mora
       FROM tranzactions
      WHERE companyId = ? AND walletId = ?
      GROUP BY amortizationLoanId`,
    { replacements: [scope.companyId, scope.walletId] }
  ))[0] as any[];

  const map = new Map<number, number>();
  rows.forEach((row) => {
    if (row.amortizationLoanId === null || row.amortizationLoanId === undefined) return;
    map.set(Number(row.amortizationLoanId), round2(num(row.mora)));
  });
  return map;
};

/** KPIs do painel do parceiro (só da carteira dele). */
export const getPartnerDashboard = async (scope: PartnerScope, period: { from?: string; to?: string } = {}) => {
  const wallet = await getPartnerWallet(scope);
  const { byLoan, byInstallment } = await loadMoraByLoan(scope);

  const moraGerada = round2(Array.from(byLoan.values()).reduce((total, item: any) => total + num(item.mora_gerada), 0));
  const prestacoesAtraso = Array.from(byLoan.values()).reduce((total, item: any) => total + num(item.prestacoes_atraso), 0);

  // Série mensal (12 meses) de desembolsos e recebimentos da carteira.
  const [disbursements]: any = await db.query(
    `SELECT DATE_FORMAT(disbursementDate, '%Y-%m') AS mes, SUM(amount) AS total, COUNT(*) AS n
       FROM customer_loans
      WHERE companyId = ? AND walletId = ? AND status IN (1, 3)
        AND disbursementDate IS NOT NULL AND disbursementDate <> ''
      GROUP BY mes
      ORDER BY mes ASC`,
    { replacements: [scope.companyId, scope.walletId] }
  );
  const [receipts]: any = await db.query(
    `SELECT DATE_FORMAT(paymentDate, '%Y-%m') AS mes, SUM(amount) AS total, COUNT(*) AS n
       FROM tranzactions
      WHERE companyId = ? AND walletId = ?
        AND paymentDate IS NOT NULL AND paymentDate <> ''
      GROUP BY mes
      ORDER BY mes ASC`,
    { replacements: [scope.companyId, scope.walletId] }
  );

  const months = new Map<string, { mes: string; desembolsado: number; recebido: number; creditos: number }>();
  (disbursements as any[]).forEach((row) => {
    const key = String(row.mes);
    if (!months.has(key)) months.set(key, { mes: key, desembolsado: 0, recebido: 0, creditos: 0 });
    const entry = months.get(key)!;
    entry.desembolsado = round2(num(row.total));
    entry.creditos = num(row.n);
  });
  (receipts as any[]).forEach((row) => {
    const key = String(row.mes);
    if (!months.has(key)) months.set(key, { mes: key, desembolsado: 0, recebido: 0, creditos: 0 });
    months.get(key)!.recebido = round2(num(row.total));
  });

  // Recebimentos no período pedido (opcional).
  let recebidoPeriodo: number | null = null;
  let desembolsadoPeriodo: number | null = null;
  if (period.from || period.to) {
    const loanWhere: any = { companyId: scope.companyId, walletId: scope.walletId, status: { [Op.in]: [1, 3] } };
    const txWhere: any = { companyId: scope.companyId, walletId: scope.walletId };
    if (period.from && period.to) {
      loanWhere.disbursementDate = { [Op.between]: [period.from, period.to] };
      txWhere.paymentDate = { [Op.between]: [period.from, period.to] };
    } else if (period.from) {
      loanWhere.disbursementDate = { [Op.gte]: period.from };
      txWhere.paymentDate = { [Op.gte]: period.from };
    } else if (period.to) {
      loanWhere.disbursementDate = { [Op.lte]: period.to };
      txWhere.paymentDate = { [Op.lte]: period.to };
    }
    desembolsadoPeriodo = round2(num((await LoanModel.sum("amount", { where: loanWhere })) as any));
    recebidoPeriodo = round2(num((await TranzactionModel.sum("amount", { where: txWhere })) as any));
  }

  return {
    carteira: wallet,
    kpis: {
      capital_alocado: wallet?.allocated_amount ?? null,
      desembolsado: wallet?.disbursed ?? 0,
      saldo_analitico: wallet?.saldo_analitico ?? null,
      utilizacao: wallet?.utilizacao ?? 0,
      recebimentos: wallet?.total_recebimentos ?? 0,
      capital_recebido: wallet?.total_capital_recebido ?? 0,
      juros_recebidos: wallet?.total_juros_recebidos ?? 0,
      juros_pendentes: wallet?.previsao_lucro ?? 0,
      mora_gerada: moraGerada,
      mora_recebida: wallet?.total_mora_recebida ?? 0,
      mora_pendente: round2(Math.max(0, moraGerada - num(wallet?.total_mora_recebida))),
      num_creditos: wallet?.num_creditos ?? 0,
      num_clientes: wallet?.num_clientes ?? 0,
      prestacoes_total: wallet?.prestacoes_total ?? 0,
      prestacoes_pagas: wallet?.prestacoes_pagas ?? 0,
      prestacoes_pendentes: wallet?.prestacoes_pendentes ?? 0,
      prestacoes_atraso: prestacoesAtraso,
      saldo_a_receber: wallet?.saldo_a_receber ?? 0,
      desembolsado_periodo: desembolsadoPeriodo,
      recebido_periodo: recebidoPeriodo,
    },
    serie_mensal: Array.from(months.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
    mora_por_prestacao: Array.from(byInstallment.entries()).map(([id, mora]) => ({ amortizationLoanId: id, mora })),
  };
};

/** Créditos desembolsados na carteira do parceiro. */
export const getPartnerLoans = async (
  scope: PartnerScope,
  filters: { from?: string; to?: string; search?: string; status?: number } = {}
) => {
  const where: any = { companyId: scope.companyId, walletId: scope.walletId };
  if (filters.status !== undefined && filters.status !== null && !Number.isNaN(Number(filters.status))) {
    where.status = Number(filters.status);
  } else {
    where.status = { [Op.in]: [1, 3] };
  }
  if (filters.from && filters.to) where.disbursementDate = { [Op.between]: [filters.from, filters.to] };
  else if (filters.from) where.disbursementDate = { [Op.gte]: filters.from };
  else if (filters.to) where.disbursementDate = { [Op.lte]: filters.to };

  const loans: any[] = (await LoanModel.findAll({ where, order: [["id", "DESC"]], raw: true })) as any[];

  const customerMap = await attachCustomers(scope.companyId, loans);
  const { byLoan } = await loadMoraByLoan(scope);

  // Saldo devedor por crédito (prestações abertas).
  const loanIds = loans.map((loan) => Number(loan.id));
  const pendingByLoan = new Map<number, { saldo: number; pendentes: number; atraso: number }>();
  if (loanIds.length > 0) {
    const rows: any[] = (await AmorizationLoanModel.findAll({
      where: { loanId: { [Op.in]: loanIds }, status: { [Op.in]: [0, -1] } },
      attributes: ["loanId", "installment", "paidAmount", "dueDate", "status"],
      raw: true,
    })) as any[];
    const today = moment();
    rows.forEach((row) => {
      const loanId = Number(row.loanId);
      if (!pendingByLoan.has(loanId)) pendingByLoan.set(loanId, { saldo: 0, pendentes: 0, atraso: 0 });
      const entry = pendingByLoan.get(loanId)!;
      entry.saldo = round2(entry.saldo + Math.max(0, num(row.installment) - num(row.paidAmount)));
      entry.pendentes += 1;
      if (moment(row.dueDate).isBefore(today, "day")) entry.atraso += 1;
    });
  }

  const search = (filters.search || "").trim().toLowerCase();
  return loans
    .map((loan) => {
      const customer = customerFor(customerMap, loan);
      return {
        id: Number(loan.id),
        accountNumber: loan.accountNumber,
        customerId: loan.customerId,
        customerName: customer?.customerName || "—",
        customerPhone: customer?.customerPhone || null,
        amount: round2(num(loan.amount)),
        interestRate: num(loan.interestRate),
        numberOfInstallments: num(loan.numberOfInstallments),
        disbursementDate: loan.disbursementDate || null,
        status: num(loan.status),
        loanDescription: loan.loanDescription || null,
        saldo_devedor: pendingByLoan.get(Number(loan.id))?.saldo || 0,
        prestacoes_pendentes: pendingByLoan.get(Number(loan.id))?.pendentes || 0,
        prestacoes_atraso: pendingByLoan.get(Number(loan.id))?.atraso || 0,
        mora_gerada: byLoan.get(Number(loan.id))?.mora_gerada || 0,
      };
    })
    .filter((loan) => {
      if (!search) return true;
      return (
        String(loan.customerName).toLowerCase().includes(search) ||
        String(loan.accountNumber || "").toLowerCase().includes(search) ||
        String(loan.id).includes(search)
      );
    });
};

/** Prestações (pagas / pendentes / em atraso) da carteira do parceiro. */
export const getPartnerInstallments = async (
  scope: PartnerScope,
  filters: { scope?: "pagas" | "pendentes" | "atraso" | "todas"; loanId?: number; from?: string; to?: string } = {}
) => {
  const loanWhere: any = { companyId: scope.companyId, walletId: scope.walletId };
  if (filters.loanId) loanWhere.id = Number(filters.loanId);

  const loans: any[] = (await LoanModel.findAll({ where: loanWhere, raw: true })) as any[];
  if (loans.length === 0) return [];

  const loanById = new Map<number, any>();
  loans.forEach((loan) => loanById.set(Number(loan.id), loan));
  const customerMap = await attachCustomers(scope.companyId, loans);

  const installWhere: any = { loanId: { [Op.in]: Array.from(loanById.keys()) } };
  const view = filters.scope || "todas";
  const today = moment().format("YYYY-MM-DD");
  if (view === "pagas") installWhere.status = 1;
  else if (view === "pendentes") {
    installWhere.status = { [Op.in]: [0, -1] };
    installWhere.dueDate = { [Op.gte]: today };
  } else if (view === "atraso") {
    installWhere.status = { [Op.in]: [0, -1] };
    installWhere.dueDate = { [Op.lt]: today };
  }
  if (filters.from && filters.to) installWhere.dueDate = { ...(installWhere.dueDate || {}), [Op.between]: [filters.from, filters.to] };

  const installments: any[] = (await AmorizationLoanModel.findAll({
    where: installWhere,
    order: [["dueDate", "ASC"], ["id", "ASC"]],
    raw: true,
  })) as any[];

  const { byInstallment } = await loadMoraByLoan(scope);
  const moraReceived = await loadMoraReceived(scope);
  const now = moment();

  const payments = new Map<number, any>();
  if (installments.length > 0) {
    const rows: any[] = (await TranzactionModel.findAll({
      where: { companyId: scope.companyId, walletId: scope.walletId, amortizationLoanId: { [Op.in]: installments.map((i) => Number(i.id)) } },
      order: [["id", "ASC"]],
      raw: true,
    })) as any[];
    rows.forEach((row) => payments.set(Number(row.amortizationLoanId), row));
  }

  return installments.map((item) => {
    const loan = loanById.get(Number(item.loanId)) || {};
    const customer = customerFor(customerMap, loan);
    const payment = payments.get(Number(item.id));
    const due = moment(item.dueDate);
    const daysOverdue = due.isBefore(now, "day") && [0, -1].includes(num(item.status)) ? now.diff(due, "days") : 0;
    const moraGerada = byInstallment.get(Number(item.id)) || 0;
    return {
      id: Number(item.id),
      loanId: Number(item.loanId),
      installmentOrder: item.installmentOrder,
      accountNumber: item.accountNumber,
      customerName: customer?.customerName || "—",
      dueDate: item.dueDate,
      status: num(item.status),
      installment: round2(num(item.installment)),
      capital: round2(num(item.amortization)),
      juros: round2(num(item.rateAmount)),
      paidAmount: round2(num(item.paidAmount)),
      remaining: round2(Math.max(0, num(item.installment) - num(item.paidAmount))),
      paymentDate: payment?.paymentDate || null,
      paymentAmount: payment ? round2(num(payment.amount)) : 0,
      mora_gerada: moraGerada,
      mora_recebida: moraReceived.get(Number(item.id)) || 0,
      mora_pendente: round2(Math.max(0, moraGerada - (moraReceived.get(Number(item.id)) || 0))),
      dias_atraso: daysOverdue,
      recebido: Number(item.status) === 1,
    };
  });
};

/** Recebimentos (pagamentos) da carteira, com o recibo associado. */
export const getPartnerTransactions = async (
  scope: PartnerScope,
  filters: { from?: string; to?: string; loanId?: number; limit?: number } = {}
) => {
  const where: any = { companyId: scope.companyId, walletId: scope.walletId };
  if (filters.loanId) where.loanId = Number(filters.loanId);
  if (filters.from && filters.to) where.paymentDate = { [Op.between]: [filters.from, filters.to] };
  else if (filters.from) where.paymentDate = { [Op.gte]: filters.from };
  else if (filters.to) where.paymentDate = { [Op.lte]: filters.to };

  const transactions: any[] = (await TranzactionModel.findAll({
    where,
    order: [["id", "DESC"]],
    limit: filters.limit && filters.limit > 0 ? Number(filters.limit) : undefined,
    raw: true,
  })) as any[];
  if (transactions.length === 0) return [];

  const loans: any[] = (await LoanModel.findAll({
    where: { id: { [Op.in]: Array.from(new Set(transactions.map((t) => Number(t.loanId)).filter(Boolean))) } },
    raw: true,
  })) as any[];
  const customerMap = await attachCustomers(scope.companyId, loans);

  const receipts: any[] = (await db.query(
    "SELECT id, tranzactionId, numero, pdf_url FROM recibos WHERE companyId = ? AND tranzactionId IS NOT NULL",
    { replacements: [scope.companyId] }
  ))[0] as any[];
  const receiptByTx = new Map<number, any>();
  receipts.forEach((row) => receiptByTx.set(Number(row.tranzactionId), row));

  return transactions.map((tx) => {
    const loan = loans.find((item) => Number(item.id) === Number(tx.loanId)) || {};
    const customer = customerFor(customerMap, loan);
    const receipt = receiptByTx.get(Number(tx.id));
    return {
      id: Number(tx.id),
      loanId: tx.loanId ? Number(tx.loanId) : null,
      accountNumber: tx.accountNumber,
      customerName: customer?.customerName || "—",
      paymentDate: tx.paymentDate,
      amount: round2(num(tx.amount)),
      juros: round2(num(tx.interestRateAmount)),
      capital: round2(Math.max(0, num(tx.amount) - num(tx.interestRateAmount))),
      mora: round2(num(tx.mora_amount) || num(tx.latePaymentInterest)),
      desconto: round2(num(tx.discountAmount)),
      paymentMethod: tx.paymentMethod,
      reference: tx.tranzactionReference,
      description: tx.description,
      staffName: tx.staffName,
      recibo_numero: receipt?.numero || null,
      recibo_pdf: receipt?.pdf_url || null,
      recibo_id: receipt?.id || null,
    };
  });
};

/** Mora da carteira: por prestação em atraso + evolução mensal. */
export const getPartnerMora = async (scope: PartnerScope) => {
  const overdue = await getPartnerInstallments(scope, { scope: "atraso" });
  const { byInstallment } = await loadMoraByLoan(scope);
  const moraReceived = await loadMoraReceived(scope);

  const rows = overdue.map((item) => ({
    ...item,
    mora_gerada: byInstallment.get(Number(item.id)) || item.mora_gerada,
  }));

  const monthly = new Map<string, { mes: string; mora_gerada: number; mora_recebida: number }>();
  rows.forEach((item) => {
    const key = moment(item.dueDate).format("YYYY-MM");
    if (!monthly.has(key)) monthly.set(key, { mes: key, mora_gerada: 0, mora_recebida: 0 });
    const entry = monthly.get(key)!;
    entry.mora_gerada = round2(entry.mora_gerada + num(item.mora_gerada));
    entry.mora_recebida = round2(entry.mora_recebida + num(moraReceived.get(Number(item.id))));
  });

  return {
    prestacoes: rows,
    total_mora_gerada: round2(rows.reduce((total, item) => total + num(item.mora_gerada), 0)),
    total_mora_recebida: round2(rows.reduce((total, item) => total + num(moraReceived.get(Number(item.id))), 0)),
    total_mora_pendente: round2(
      rows.reduce((total, item) => total + Math.max(0, num(item.mora_gerada) - num(moraReceived.get(Number(item.id)))), 0)
    ),
    serie_mensal: Array.from(monthly.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
  };
};

/** Extrato completo da carteira (resumo + desembolsos + recebimentos). */
export const getPartnerStatement = async (scope: PartnerScope, period: { from?: string; to?: string } = {}) => {
  const wallet = await getPartnerWallet(scope);
  const loans = await getPartnerLoans(scope, { from: period.from, to: period.to });
  const transactions = await getPartnerTransactions(scope, { from: period.from, to: period.to });

  const desembolsadoPeriodo = round2(loans.reduce((total, loan) => total + num(loan.amount), 0));
  const recebidoPeriodo = round2(transactions.reduce((total, tx) => total + num(tx.amount), 0));
  const jurosPeriodo = round2(transactions.reduce((total, tx) => total + num(tx.juros), 0));
  const moraPeriodo = round2(transactions.reduce((total, tx) => total + num(tx.mora), 0));
  const descontoPeriodo = round2(transactions.reduce((total, tx) => total + num(tx.desconto), 0));

  // ── Série mensal do período (gráfico do relatório) ──
  const monthKey = (value: any) => (value ? String(value).slice(0, 7) : "");
  const meses: string[] = [];
  const desembolsosPorMes: Record<string, number> = {};
  const recebimentosPorMes: Record<string, number> = {};
  const jurosPorMes: Record<string, number> = {};
  const ensureMonth = (key: string) => {
    if (!key) return;
    if (!meses.includes(key)) meses.push(key);
    desembolsosPorMes[key] = desembolsosPorMes[key] || 0;
    recebimentosPorMes[key] = recebimentosPorMes[key] || 0;
    jurosPorMes[key] = jurosPorMes[key] || 0;
  };
  loans.forEach((loan: any) => {
    const key = monthKey(loan.disbursementDate);
    ensureMonth(key);
    if (key) desembolsosPorMes[key] = round2(desembolsosPorMes[key] + num(loan.amount));
  });
  transactions.forEach((tx: any) => {
    const key = monthKey(tx.paymentDate);
    ensureMonth(key);
    if (key) {
      recebimentosPorMes[key] = round2(recebimentosPorMes[key] + num(tx.amount));
      jurosPorMes[key] = round2(jurosPorMes[key] + num(tx.juros));
    }
  });
  const mesesOrdenados = [...meses].sort();

  return {
    carteira: wallet,
    periodo: { from: period.from || null, to: period.to || null },
    resumo: {
      capital_alocado: wallet?.allocated_amount ?? null,
      desembolsado_total: wallet?.disbursed ?? 0,
      desembolsado_periodo: desembolsadoPeriodo,
      recebido_total: wallet?.total_recebimentos ?? 0,
      recebido_periodo: recebidoPeriodo,
      capital_recebido_periodo: round2(recebidoPeriodo - jurosPeriodo),
      juros_periodo: jurosPeriodo,
      mora_periodo: moraPeriodo,
      desconto_periodo: descontoPeriodo,
      saldo_a_receber: wallet?.saldo_a_receber ?? 0,
      saldo_analitico: wallet?.saldo_analitico ?? null,
      num_creditos: loans.length,
      num_recebimentos: transactions.length,
      // Indicadores de acompanhamento da carteira (KPIs do relatório)
      taxa_media: wallet?.taxa_media ?? null,
      juros_gerados: wallet?.juros_gerados ?? 0,
      previsao_lucro: wallet?.previsao_lucro ?? 0,
      prestacoes_total: wallet?.prestacoes_total ?? 0,
      prestacoes_pagas: wallet?.prestacoes_pagas ?? 0,
      prestacoes_pendentes: wallet?.prestacoes_pendentes ?? 0,
      prestacoes_atraso: wallet?.prestacoes_atraso ?? 0,
      mora_gerada: wallet?.mora_gerada ?? 0,
      utilizacao: wallet?.utilizacao ?? 0,
      num_desembolsos_periodo: loans.length,
    },
    // Gráficos: barra por mês + distribuição dos recebimentos.
    serie_mensal: {
      meses: mesesOrdenados,
      desembolsos: mesesOrdenados.map((key) => desembolsosPorMes[key] || 0),
      recebimentos: mesesOrdenados.map((key) => recebimentosPorMes[key] || 0),
      juros: mesesOrdenados.map((key) => jurosPorMes[key] || 0),
    },
    distribuicao_recebimentos: {
      capital: round2(recebidoPeriodo - jurosPeriodo - moraPeriodo),
      juros: jurosPeriodo,
      mora: moraPeriodo,
      desconto: descontoPeriodo,
    },
    desembolsos: loans,
    recebimentos: transactions,
  };
};

/** Verifica que a carteira pertence à empresa do parceiro (defesa extra). */
export const walletBelongsToCompany = async (companyId: number, walletId: number): Promise<boolean> => {
  const rows: any[] = (await db.query(
    "SELECT id FROM financing_wallets WHERE id = ? AND companyId = ? LIMIT 1",
    { replacements: [walletId, companyId] }
  ))[0] as any[];
  return (rows as any[]).length > 0;
};
