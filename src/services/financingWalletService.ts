import { Op } from "sequelize";
import { db } from "../database/db";
import { FinancingWalletModel } from "../database/models/FinancingWalletModel";
import { AccountModel } from "../database/models/AccountModel";
import { InterestRateModel } from "../database/models/InterestRateModel";

/** Arredonda a 2 casas (meticais) — valores financeiros nunca com float sujo. */
const round2 = (value: number): number => Math.round((Number(value) || 0) * 100) / 100;

/**
 * CARTEIRAS DE FINANCIAMENTO (DINHEIRO ANALÍTICO) — REGRAS
 * -------------------------------------------------------
 * · `financing_wallets` é uma camada ANALÍTICA: não tem dinheiro físico. Os
 *   valores base servem para acompanhar o capital de cada fundo/parceiro e
 *   para separar relatórios (BM consolidado vs. financiador isolado).
 * · O dinheiro REAL está em `accounts` com purpose DESEMBOLSO/MISTO — é dessa
 *   conta que sai o valor entregue ao cliente.
 * · Um desembolso num crédito é classificado com walletId e validado nas duas
 *   camadas:
 *     1. ANALÍTICA — se a carteira tem capital alocado, o saldo analítico não
 *        pode ficar negativo (bloqueia);
 *     2. REAL — se existirem contas de desembolso configuradas, o saldo real
 *        somado tem de cobrir o valor (bloqueia).
 */

export type WalletAnalytics = {
  walletId: number;
  // analítico
  allocated_amount: number | null;
  initial_disbursed_amount: number;
  disbursed: number;
  saldo_analitico: number | null; // null = ilimitado (sem capital alocado)
  utilizacao: number; // 0..1 (quando há capital alocado)
  // créditos
  num_creditos: number;
  num_clientes: number;
  taxa_media: number | null;
  // recebimentos
  total_recebimentos: number;
  total_capital_recebido: number;
  total_juros_recebidos: number;
  total_mora_recebida: number;
  num_pagamentos: number;
  // mora / prestações
  mora_gerada: number;
  mora_pendente: number;
  prestacoes_total: number;
  prestacoes_pagas: number;
  prestacoes_pendentes: number;
  prestacoes_atraso: number;
  saldo_a_receber: number;
  ultimo_desembolso: string | null;
  // juros (previstos vs. recebidos) — base da "previsão de lucros" da carteira
  juros_gerados: number;
  previsao_lucro: number;
};

export type WalletWithAnalytics = WalletAnalytics & {
  id: number;
  companyId: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  parceiro_nome: string | null;
  is_parceiro_externo: boolean;
  parceiro_email: string | null;
  parceiro_nuit: string | null;
  parceiro_contacto: string | null;
  taxa_juro: number | null;
  cor_badge: string | null;
  is_ativa: boolean;
  tem_portal: boolean;
  portal_ativo: boolean;
  utilizadores: number;
};

type Aggregations = {
  loans: Map<number, any>;
  transactions: Map<number, any>;
  installments: Map<number, any>;
  users: Map<number, number>;
};

const num = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMap = (rows: any[]): Map<number, any> => {
  const map = new Map<number, any>();
  rows.forEach((row) => {
    if (row.walletId === null || row.walletId === undefined) return;
    map.set(Number(row.walletId), row);
  });
  return map;
};

/**
 * Agrega, numa única passagem por tabela, todos os indicadores de todas as
 * carteiras da empresa (evita N+1 por carteira).
 */
const loadAggregations = async (companyId: number, walletIds: number[]): Promise<Aggregations> => {
  const empty: Aggregations = {
    loans: new Map(),
    transactions: new Map(),
    installments: new Map(),
    users: new Map(),
  };
  if (walletIds.length === 0) return empty;

  const today = new Date().toISOString().slice(0, 10);
  const replacements = [companyId];

  const loansQuery = `
    SELECT walletId,
           COUNT(*) AS num_creditos,
           COUNT(DISTINCT customerId) AS num_clientes,
           SUM(amount) AS disbursed,
           AVG(interestRate) AS taxa_media,
           MAX(disbursementDate) AS ultimo_desembolso
      FROM customer_loans
     WHERE companyId = ? AND walletId IS NOT NULL AND status IN (1, 3)
     GROUP BY walletId`;

  const txQuery = `
    SELECT walletId,
           COUNT(*) AS num_pagamentos,
           SUM(amount) AS recebimentos,
           SUM(interestRateAmount) AS juros_recebidos,
           SUM(mora_amount) AS mora_recebida
      FROM tranzactions
     WHERE companyId = ? AND walletId IS NOT NULL
     GROUP BY walletId`;

  const installmentsQuery = `
    SELECT walletId,
           COUNT(*) AS prestacoes_total,
           SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS prestacoes_pagas,
           SUM(CASE WHEN status IN (0, -1) THEN 1 ELSE 0 END) AS prestacoes_pendentes,
           SUM(CASE WHEN status IN (0, -1) AND dueDate < ? THEN 1 ELSE 0 END) AS prestacoes_atraso,
           SUM(CASE WHEN status IN (0, -1) THEN GREATEST(installment - IFNULL(paidAmount, 0), 0) ELSE 0 END) AS saldo_a_receber,
           SUM(IFNULL(rateAmount, 0)) AS juros_gerados,
           SUM(mora_amount) AS mora_gerada
      FROM amortization_loans
     WHERE companyId = ? AND walletId IS NOT NULL
     GROUP BY walletId`;

  const usersQuery = `
    SELECT walletId, COUNT(*) AS total
      FROM users
     WHERE companyId = ? AND walletId IS NOT NULL
     GROUP BY walletId`;

  try {
    const [loans]: any = await db.query(loansQuery, { replacements });
    const [transactions]: any = await db.query(txQuery, { replacements });
    const [installments]: any = await db.query(installmentsQuery, {
      replacements: [today, companyId],
    });
    const [users]: any = await db.query(usersQuery, { replacements });

    const usersMap = new Map<number, number>();
    (users as any[]).forEach((row) => {
      if (row.walletId === null || row.walletId === undefined) return;
      usersMap.set(Number(row.walletId), num(row.total));
    });

    return {
      loans: toMap(loans as any[]),
      transactions: toMap(transactions as any[]),
      installments: toMap(installments as any[]),
      users: usersMap,
    };
  } catch (error: any) {
    console.error("[Carteiras] Erro ao agregar indicadores:", error?.message || error);
    return empty;
  }
};

const buildAnalytics = (walletId: number, wallet: any, agg: Aggregations): WalletAnalytics => {
  const loans = agg.loans.get(walletId) || {};
  const txs = agg.transactions.get(walletId) || {};
  const installments = agg.installments.get(walletId) || {};

  const allocated = wallet.allocated_amount === null || wallet.allocated_amount === undefined
    ? null
    : num(wallet.allocated_amount);
  const initial = num(wallet.initial_disbursed_amount);
  const disbursed = round2(initial + num(loans.disbursed));
  const saldo = allocated === null ? null : round2(allocated - disbursed);
  const moraGerada = round2(num(installments.mora_gerada));
  const moraRecebida = round2(num(txs.mora_recebida));

  return {
    walletId,
    allocated_amount: allocated,
    initial_disbursed_amount: initial,
    disbursed,
    saldo_analitico: saldo,
    utilizacao: allocated && allocated > 0 ? Math.min(1, disbursed / allocated) : 0,
    num_creditos: num(loans.num_creditos),
    num_clientes: num(loans.num_clientes),
    taxa_media: loans.taxa_media === null || loans.taxa_media === undefined ? null : num(loans.taxa_media),
    total_recebimentos: round2(num(txs.recebimentos)),
    total_capital_recebido: round2(num(txs.recebimentos) - num(txs.juros_recebidos)),
    total_juros_recebidos: round2(num(txs.juros_recebidos)),
    total_mora_recebida: moraRecebida,
    num_pagamentos: num(txs.num_pagamentos),
    mora_gerada: moraGerada,
    mora_pendente: round2(Math.max(0, moraGerada - moraRecebida)),
    prestacoes_total: num(installments.prestacoes_total),
    prestacoes_pagas: num(installments.prestacoes_pagas),
    prestacoes_pendentes: num(installments.prestacoes_pendentes),
    prestacoes_atraso: num(installments.prestacoes_atraso),
    saldo_a_receber: round2(num(installments.saldo_a_receber)),
    ultimo_desembolso: loans.ultimo_desembolso ? String(loans.ultimo_desembolso) : null,
    // Juros previstos (todo o plano de amortização da carteira) vs. já recebidos.
    juros_gerados: round2(num(installments.juros_gerados)),
    previsao_lucro: round2(Math.max(0, num(installments.juros_gerados) - num(txs.juros_recebidos))),
  };
};

/**
 * Série mensal por carteira (últimos `months` meses) — alimenta os gráficos do
 * painel: desembolsos (customer_loans.disbursementDate), recebimentos e juros
 * (tranzactions.paymentDate). Sem N+1: duas agregações para todas as carteiras.
 */
export type WalletMonthlySeries = {
  meses: string[]; // rótulos "AAAA-MM"
  porCarteira: Array<{
    walletId: number;
    codigo: string;
    nome: string;
    cor: string;
    desembolsos: number[];
    recebimentos: number[];
    juros: number[];
    total_desembolsado: number;
    total_recebido: number;
    // Base analítica já desembolsada antes do sistema (sem créditos
    // classificados) — KMAD entra no gráfico como segmento próprio, para que
    // o total das barras reconcilie com o KPI "Desembolsado" do painel.
    historico: number;
  }>;
};

export const getWalletsMonthlySeries = async (
  companyId: number,
  months = 12
): Promise<WalletMonthlySeries> => {
  const labels: string[] = [];
  const now = new Date();
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    labels.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  const first = `${labels[0]}-01`;

  const wallets = await getWalletsWithAnalytics(companyId, { onlyActive: true });
  const empty: WalletMonthlySeries = { meses: labels, porCarteira: [] };
  if (wallets.length === 0) return empty;

  const emptyRow = () => new Array(labels.length).fill(0);
  const buckets = new Map<number, { desembolsos: number[]; recebimentos: number[]; juros: number[] }>();
  wallets.forEach((wallet) => {
    buckets.set(Number(wallet.id), { desembolsos: emptyRow(), recebimentos: emptyRow(), juros: emptyRow() });
  });

  const indexOfMonth = (value: any): number => {
    if (!value) return -1;
    const key = String(value).slice(0, 7);
    return labels.indexOf(key);
  };

  try {
    const [disbursements]: any = await db.query(
      `SELECT walletId, DATE_FORMAT(disbursementDate, '%Y-%m') AS mes, SUM(amount) AS total
         FROM customer_loans
        WHERE companyId = ? AND walletId IS NOT NULL AND status IN (1, 3)
          AND disbursementDate IS NOT NULL AND disbursementDate >= ?
        GROUP BY walletId, mes`,
      { replacements: [companyId, first] }
    );
    const [receipts]: any = await db.query(
      `SELECT walletId, DATE_FORMAT(paymentDate, '%Y-%m') AS mes,
              SUM(amount) AS total, SUM(IFNULL(interestRateAmount, 0)) AS juros
         FROM tranzactions
        WHERE companyId = ? AND walletId IS NOT NULL
          AND paymentDate IS NOT NULL AND paymentDate >= ?
        GROUP BY walletId, mes`,
      { replacements: [companyId, first] }
    );

    (disbursements as any[]).forEach((row) => {
      const bucket = buckets.get(Number(row.walletId));
      const index = indexOfMonth(row.mes);
      if (!bucket || index < 0) return;
      bucket.desembolsos[index] = round2(num(bucket.desembolsos[index]) + num(row.total));
    });
    (receipts as any[]).forEach((row) => {
      const bucket = buckets.get(Number(row.walletId));
      const index = indexOfMonth(row.mes);
      if (!bucket || index < 0) return;
      bucket.recebimentos[index] = round2(num(bucket.recebimentos[index]) + num(row.total));
      bucket.juros[index] = round2(num(bucket.juros[index]) + num(row.juros));
    });

    return {
      meses: labels,
      porCarteira: wallets.map((wallet) => {
        const bucket = buckets.get(Number(wallet.id)) || { desembolsos: emptyRow(), recebimentos: emptyRow(), juros: emptyRow() };
        return {
          walletId: Number(wallet.id),
          codigo: wallet.codigo,
          nome: wallet.nome,
          cor: wallet.cor_badge || "blue",
          desembolsos: bucket.desembolsos,
          recebimentos: bucket.recebimentos,
          juros: bucket.juros,
          total_desembolsado: round2(bucket.desembolsos.reduce((sum, value) => sum + num(value), 0)),
          total_recebido: round2(bucket.recebimentos.reduce((sum, value) => sum + num(value), 0)),
          historico: round2(num(wallet.initial_disbursed_amount)),
        };
      }),
    };
  } catch (error: any) {
    console.error("[Carteiras] Erro na série mensal por carteira:", error?.message || error);
    return empty;
  }
};

/** Todas as carteiras de financiamento da empresa (activas + inactivas). */
export const getWalletsWithAnalytics = async (
  companyId: number,
  options: { onlyActive?: boolean; onlyPortal?: boolean; onlyExternal?: boolean } = {}
): Promise<WalletWithAnalytics[]> => {
  const where: any = { companyId };
  if (options.onlyActive) where.is_ativa = true;
  if (options.onlyPortal) {
    where.tem_portal = true;
    where.is_parceiro_externo = true;
  }
  if (options.onlyExternal) where.is_parceiro_externo = true;

  const wallets: any[] = (await FinancingWalletModel.findAll({
    where,
    order: [["id", "ASC"]],
    raw: true,
  })) as any[];

  const walletIds = wallets.map((w) => Number(w.id));
  const agg = await loadAggregations(companyId, walletIds);

  return wallets.map((wallet) => {
    const walletId = Number(wallet.id);
    return {
      ...wallet,
      id: walletId,
      is_parceiro_externo: !!wallet.is_parceiro_externo,
      is_ativa: !!wallet.is_ativa,
      tem_portal: !!wallet.tem_portal,
      portal_ativo: !!wallet.portal_ativo,
      taxa_juro: wallet.taxa_juro === null || wallet.taxa_juro === undefined ? null : num(wallet.taxa_juro),
      utilizadores: agg.users.get(walletId) || 0,
      ...buildAnalytics(walletId, wallet, agg),
    };
  });
};

/** Uma carteira concreta, com os respectivos indicadores. */
export const getWalletWithAnalytics = async (
  companyId: number,
  walletId: number
): Promise<WalletWithAnalytics | null> => {
  const all = await getWalletsWithAnalytics(companyId);
  return all.find((wallet) => Number(wallet.id) === Number(walletId)) || null;
};

/**
 * Consolidado de todas as carteiras (usado nos KPIs do Dashboard). Não
 * discrimina carteiras — é o mesmo espírito do relatório oficial do BM.
 */
export const getWalletTotalsSummary = async (companyId: number) => {
  const wallets = await getWalletsWithAnalytics(companyId);
  const active = wallets.filter((wallet) => wallet.is_ativa);
  const sum = (key: keyof WalletAnalytics) =>
    round2(active.reduce((total, wallet) => total + num((wallet as any)[key]), 0));

  const allocated = active.filter((wallet) => wallet.allocated_amount !== null);
  return {
    total_carteiras: active.length,
    com_capital_alocado: allocated.length,
    capital_alocado: round2(allocated.reduce((total, wallet) => total + num(wallet.allocated_amount), 0)),
    total_desembolsado: sum("disbursed"),
    total_recebimentos: sum("total_recebimentos"),
    total_juros_recebidos: sum("total_juros_recebidos"),
    total_mora_recebida: sum("total_mora_recebida"),
    total_mora_gerada: sum("mora_gerada"),
    saldo_a_receber: sum("saldo_a_receber"),
    total_juros_gerados: sum("juros_gerados"),
    previsao_lucro: sum("previsao_lucro"),
    num_creditos: sum("num_creditos"),
    num_clientes: sum("num_clientes"),
    prestacoes_pendentes: sum("prestacoes_pendentes"),
    prestacoes_atraso: sum("prestacoes_atraso"),
  };
};

/**
 * Saldo REAL disponível para desembolsos: soma das contas activas com purpose
 * DESEMBOLSO ou MISTO (é de lá que sai o dinheiro entregue ao cliente).
 */
export const getRealDisbursementBalance = async (
  companyId: number
): Promise<{ available: number; accounts: any[] }> => {
  const accounts: any[] = (await AccountModel.findAll({
    where: {
      companyId,
      is_active: 1,
      purpose: { [Op.in]: ["DESEMBOLSO", "MISTO"] },
    },
    attributes: ["id", "bank_name", "accountNumber", "purpose", "type", "balance"],
    raw: true,
  })) as any[];

  return {
    available: round2(accounts.reduce((total, account) => total + num(account.balance), 0)),
    accounts,
  };
};

export type DisbursementValidation = {
  ok: boolean;
  message?: string;
  warning?: string;
  wallet?: WalletWithAnalytics | null;
  analytic_available: number | null;
  real_available: number;
};

/**
 * Valida um desembolso nas duas camadas (analítica + real).
 * Usado pelo LoanController/AmortizationController antes de criar o crédito.
 */
export const validateDisbursement = async (params: {
  companyId: number;
  walletId?: number | null;
  amount: number;
  requireWallet?: boolean;
}): Promise<DisbursementValidation> => {
  const { companyId, amount } = params;
  const walletId = params.walletId ? Number(params.walletId) : null;
  const { available: real_available, accounts: realAccounts } = await getRealDisbursementBalance(companyId);

  if (!walletId) {
    if (params.requireWallet) {
      return {
        ok: false,
        message: "Seleccione a carteira de financiamento (parceria/fundo) que suporta este desembolso.",
        analytic_available: null,
        real_available,
      };
    }
    return { ok: true, analytic_available: null, real_available };
  }

  const wallet = await getWalletWithAnalytics(companyId, walletId);
  if (!wallet) {
    return {
      ok: false,
      message: "Carteira de financiamento não encontrada para esta empresa.",
      analytic_available: null,
      real_available,
    };
  }
  if (!wallet.is_ativa) {
    return {
      ok: false,
      message: `A carteira ${wallet.nome} está inactiva. Active-a nas Carteiras de Financiamento ou escolha outra.`,
      wallet,
      analytic_available: wallet.saldo_analitico,
      real_available,
    };
  }

  // ── 1. Camada ANALÍTICA: capital alocado não pode ser excedido ──
  if (wallet.saldo_analitico !== null && wallet.saldo_analitico < amount - 0.01) {
    const verba = `${wallet.parceiro_nome || wallet.nome} (${wallet.codigo})`;
    return {
      ok: false,
      message:
        `Carteira ${verba} atingiu o limite analítico. ` +
        `Alocado: ${num(wallet.allocated_amount).toFixed(2)} MT · ` +
        `Desembolsado: ${wallet.disbursed.toFixed(2)} MT · ` +
        `Disponível analítico: ${wallet.saldo_analitico.toFixed(2)} MT. Desembolso bloqueado.`,
      wallet,
      analytic_available: wallet.saldo_analitico,
      real_available,
    };
  }

  // ── 2. Camada REAL: o dinheiro tem de existir na conta de desembolso ──
  const hasDisbursementAccounts = realAccounts.length > 0;
  if (hasDisbursementAccounts && real_available < amount - 0.01) {
    return {
      ok: false,
      message:
        `Saldo real insuficiente na conta de desembolso da empresa ` +
        `(disponível: ${real_available.toFixed(2)} MT; necessário: ${amount.toFixed(2)} MT). ` +
        `As carteiras de financiamento são analíticas — transfira fundos para a conta de desembolso.`,
      wallet,
      analytic_available: wallet.saldo_analitico,
      real_available,
    };
  }

  return {
    ok: true,
    wallet,
    analytic_available: wallet.saldo_analitico,
    real_available,
    warning: hasDisbursementAccounts
      ? undefined
      : "Sem contas de desembolso configuradas (accounts purpose DESEMBOLSO/MISTO): a validação de saldo real foi ignorada.",
  };
};

/**
 * ORIGEM DO CAPITAL A PARTIR DA TAXA DE JURO
 * ------------------------------------------
 * A ligação entre a taxa e a carteira vive em `interest_rates.walletId` (definida
 * no ecrã Carteiras e Taxas). Sempre que um crédito não traz carteira, ela é
 * DERIVADA da taxa do próprio crédito — é a regra que impede um crédito novo de
 * nascer sem origem de capital.
 *
 * Devolve a carteira quando a taxa aponta para UMA só carteira; quando a mesma
 * taxa está ligada a várias carteiras (ex.: 9% em MBR_09 e em KMAD) a resposta
 * vem marcada como ambígua — nesse caso o crédito não é classificado sozinho e
 * o Admin escolhe no diálogo de classificação.
 */
export type WalletFromRate = {
  walletId: number | null;
  wallet: any | null;
  rate: any | null;
  taxa: number | null;
  ambiguo: boolean;
  candidatos: Array<{ walletId: number; codigo: string | null; nome: string | null; cor_badge: string | null }>;
  motivo: string;
};

export const resolveWalletFromRate = async (
  companyId: number,
  interestRate: any
): Promise<WalletFromRate> => {
  const taxa = Number(interestRate);
  const vazio: WalletFromRate = {
    walletId: null,
    wallet: null,
    rate: null,
    taxa: Number.isFinite(taxa) ? round2(taxa * 100) : null,
    ambiguo: false,
    candidatos: [],
    motivo: "",
  };
  if (!Number.isFinite(companyId) || companyId <= 0 || !Number.isFinite(taxa)) {
    vazio.motivo = "Crédito sem taxa de juro definida.";
    return vazio;
  }

  const rates: any[] = (await InterestRateModel.findAll({
    where: { companyId },
    raw: true,
  })) as any[];

  // A taxa é guardada em fracção (0.09 = 9%) nos créditos e nas taxas.
  const correspondentes = rates.filter((rate) => Math.abs(Number(rate.tax) - taxa) < 1e-6);
  const comCarteira = correspondentes.filter((rate) => Number(rate.walletId) > 0);
  const walletIds = [...new Set(comCarteira.map((rate) => Number(rate.walletId)))];

  if (walletIds.length === 0) {
    vazio.motivo = correspondentes.length
      ? `A taxa ${round2(taxa * 100)}% não está ligada a nenhuma carteira de financiamento.`
      : `Nenhuma taxa do sistema corresponde a ${round2(taxa * 100)}%.`;
    return vazio;
  }

  const wallets = (await FinancingWalletModel.findAll({
    where: { companyId, id: { [Op.in]: walletIds } },
    raw: true,
  })) as any[];
  const candidatos = wallets.map((wallet) => ({
    walletId: Number(wallet.id),
    codigo: wallet.codigo || null,
    nome: wallet.nome || null,
    cor_badge: wallet.cor_badge || null,
  }));

  if (walletIds.length > 1) {
    return {
      ...vazio,
      ambiguo: true,
      candidatos,
      motivo: `A taxa ${round2(taxa * 100)}% está ligada a ${walletIds.length} carteiras (${candidatos
        .map((c) => c.codigo)
        .filter(Boolean)
        .join(", ")}) — escolha a carteira.`,
    };
  }

  const rate = comCarteira[0];
  const wallet = wallets[0] || null;
  return {
    walletId: Number(walletIds[0]),
    wallet,
    rate,
    taxa: round2(taxa * 100),
    ambiguo: false,
    candidatos,
    motivo: `Taxa ${round2(taxa * 100)}% → ${rate?.name || "taxa"}`,
  };
};

export type ClassificationProposal = {
  id: number;
  accountNumber: string | null;
  customerName: string | null;
  amount: number;
  interestRate: number | null;
  taxaPercent: number | null;
  disbursementDate: string | null;
  status: number;
  sugerida: { walletId: number; codigo: string | null; nome: string | null; cor_badge: string | null } | null;
  confianca: "ALTA" | "AMBIGUA" | "SEM_TAXA";
  motivo: string;
  candidatos: Array<{ walletId: number; codigo: string | null; nome: string | null; cor_badge: string | null }>;
};

/**
 * Propostas de classificação dos créditos sem carteira.
 *
 * Critério (nesta ordem):
 *  1. **taxa de juro do crédito** → carteira ligada a essa taxa (`interest_rates.walletId`);
 *  2. **data de desembolso** → ordena os créditos cronologicamente (é o que permite
 *     rever o período de cada fundo antes de gravar) e desempata carteiras quando
 *     só uma delas tem «desembolso anterior» declarado — isto é, carteiras que
 *     representam portefólio anterior ao sistema de carteiras.
 *
 * O resultado é sempre uma PROPOSTA: nada é gravado até o Admin confirmar.
 */
export const buildClassificationProposals = async (companyId: number) => {
  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Error("companyId inválido.");
  }

  const [loans]: any = await db.query(
    `SELECT cl.id, cl.accountNumber, cl.amount, cl.interestRate, cl.disbursementDate,
            cl.status, cl.customerId, c.customerName
       FROM customer_loans cl
       LEFT JOIN customers c ON c.id = cl.customerId
      WHERE cl.companyId = ? AND cl.walletId IS NULL
      ORDER BY (cl.disbursementDate IS NULL), cl.disbursementDate ASC, cl.id ASC`,
    { replacements: [companyId] }
  );

  const wallets: any[] = (await FinancingWalletModel.findAll({
    where: { companyId },
    raw: true,
  })) as any[];
  const walletById = new Map(wallets.map((wallet) => [Number(wallet.id), wallet]));

  const propostas: ClassificationProposal[] = [];
  for (const loan of loans) {
    const derived = await resolveWalletFromRate(companyId, loan.interestRate);
    let sugerida: ClassificationProposal["sugerida"] = null;
    let confianca: ClassificationProposal["confianca"] = "SEM_TAXA";
    let motivo = derived.motivo;

    if (derived.walletId) {
      const wallet = walletById.get(Number(derived.walletId)) || derived.wallet || {};
      sugerida = {
        walletId: Number(derived.walletId),
        codigo: wallet.codigo || null,
        nome: wallet.nome || null,
        cor_badge: wallet.cor_badge || null,
      };
      confianca = "ALTA";
    } else if (derived.ambiguo) {
      confianca = "AMBIGUA";
      // Desempate por data: se só uma das carteiras tem «desembolso anterior»
      // declarado, é essa que representa o portefólio antigo.
      const comLegado = derived.candidatos.filter(
        (c) => Number(walletById.get(Number(c.walletId))?.initial_disbursed_amount) > 0
      );
      if (comLegado.length === 1) {
        const wallet = walletById.get(Number(comLegado[0].walletId)) || {};
        sugerida = {
          walletId: Number(comLegado[0].walletId),
          codigo: wallet.codigo || null,
          nome: wallet.nome || null,
          cor_badge: wallet.cor_badge || null,
        };
        motivo = `${derived.motivo} Sugerida ${sugerida.codigo} por ser a única com desembolso anterior declarado.`;
      }
    }

    propostas.push({
      id: Number(loan.id),
      accountNumber: loan.accountNumber || null,
      customerName: loan.customerName || null,
      amount: round2(Number(loan.amount) || 0),
      interestRate: Number.isFinite(Number(loan.interestRate)) ? Number(loan.interestRate) : null,
      taxaPercent: Number.isFinite(Number(loan.interestRate)) ? round2(Number(loan.interestRate) * 100) : null,
      disbursementDate: loan.disbursementDate ? String(loan.disbursementDate).slice(0, 10) : null,
      status: Number(loan.status) || 0,
      sugerida,
      confianca,
      motivo,
      candidatos: derived.candidatos,
    });
  }

  // Impacto por carteira: quanto cada sugestão acrescenta ao desembolsado analítico.
  const porCarteira = new Map<number, any>();
  for (const proposta of propostas) {
    if (!proposta.sugerida) continue;
    const walletId = Number(proposta.sugerida.walletId);
    const wallet = walletById.get(walletId) || {};
    const atual = porCarteira.get(walletId) || {
      walletId,
      codigo: proposta.sugerida.codigo,
      nome: proposta.sugerida.nome,
      cor_badge: proposta.sugerida.cor_badge,
      creditos: 0,
      valor: 0,
      allocated_amount: wallet.allocated_amount === null || wallet.allocated_amount === undefined
        ? null
        : round2(Number(wallet.allocated_amount)),
      initial_disbursed_amount: round2(Number(wallet.initial_disbursed_amount) || 0),
      primeira_data: null,
      ultima_data: null,
    };
    atual.creditos += 1;
    atual.valor = round2(atual.valor + proposta.amount);
    if (proposta.disbursementDate) {
      if (!atual.primeira_data || proposta.disbursementDate < atual.primeira_data) atual.primeira_data = proposta.disbursementDate;
      if (!atual.ultima_data || proposta.disbursementDate > atual.ultima_data) atual.ultima_data = proposta.disbursementDate;
    }
    porCarteira.set(walletId, atual);
  }

  const resumoCarteiras = [...porCarteira.values()]
    .map((item) => ({
      ...item,
      percentagem_do_alocado:
        item.allocated_amount && item.allocated_amount > 0
          ? round2((item.valor / item.allocated_amount) * 100)
          : null,
      excede_alocado: Boolean(item.allocated_amount && item.valor > item.allocated_amount + 0.01),
    }))
    .sort((a, b) => b.valor - a.valor);

  return {
    result: propostas,
    summary: {
      total_creditos: propostas.length,
      total_valor: round2(propostas.reduce((total, item) => total + item.amount, 0)),
      sugeridos: propostas.filter((item) => item.confianca === "ALTA").length,
      ambiguos: propostas.filter((item) => item.confianca === "AMBIGUA").length,
      sem_taxa: propostas.filter((item) => item.confianca === "SEM_TAXA").length,
      valor_sugerido: round2(
        propostas.filter((item) => item.sugerida).reduce((total, item) => total + item.amount, 0)
      ),
      por_carteira: resumoCarteiras,
    },
  };
};

/** Carteira por código (ex.: 'KMAD'). */
export const getWalletByCode = async (companyId: number, codigo: string) => {
  const wallet: any = await FinancingWalletModel.findOne({
    where: { companyId, codigo: String(codigo).toUpperCase() },
    raw: true,
  });
  return wallet || null;
};
