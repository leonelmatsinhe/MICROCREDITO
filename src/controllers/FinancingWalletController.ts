import { Request, Response } from "express";
import { Op } from "sequelize";
import { db } from "../database/db";
import { FinancingWalletModel } from "../database/models/FinancingWalletModel";
import { InterestRateModel } from "../database/models/InterestRateModel";
import { UserModel } from "../database/models/UserModel";
import { AccountModel } from "../database/models/AccountModel";
import {
  getWalletTotalsSummary,
  getWalletWithAnalytics,
  getWalletsMonthlySeries,
  getWalletsWithAnalytics,
  getRealDisbursementBalance,
  WalletWithAnalytics,
} from "../services/financingWalletService";
import { getCurrentUser } from "../middlewares/roles";

/**
 * CARTEIRAS DE FINANCIAMENTO (dinheiro ANALÍTICO)
 * ----------------------------------------------
 * CRUD + KPIs. As carteiras servem para separar a origem do capital (parceria
 * KMAD, fundos PME/Comunidades/Interno) e isolam o relatório de cada parceiro
 * financiador. Não guardam dinheiro real: o dinheiro físico continua nas
 * contas de tesouraria (accounts purpose DESEMBOLSO/REEMBOLSO).
 */

const num = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const serializeWallet = (wallet: WalletWithAnalytics) => ({
  ...wallet,
  allocated_amount: wallet.allocated_amount,
  saldo_analitico: wallet.saldo_analitico,
  ilimitado: wallet.allocated_amount === null,
  taxa_percentual: wallet.taxa_juro === null ? null : wallet.taxa_juro,
});

/** GET /api/wallets/:companyId — todas as carteiras com KPIs. */
const findAll = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, message: "companyId inválido." });
    }

    const onlyActive = String(req.query.onlyActive || "") === "true";
    const wallets = await getWalletsWithAnalytics(companyId, { onlyActive });
    const summary = await getWalletTotalsSummary(companyId);
    const real = await getRealDisbursementBalance(companyId);

    return res.status(200).json({
      success: true,
      result: wallets.map(serializeWallet),
      summary: { ...summary, saldo_real_disponivel: real.available, contas_desembolso: real.accounts.length },
      saldo_real: real,
    });
  } catch (error: any) {
    console.error("[Carteiras] Erro ao listar:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao listar carteiras de financiamento." });
  }
};

/** GET /api/wallets/:companyId/dashboard — consolidado para os KPIs do painel. */
const dashboard = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    const wallets = await getWalletsWithAnalytics(companyId, { onlyActive: true });
    const summary = await getWalletTotalsSummary(companyId);
    const real = await getRealDisbursementBalance(companyId);

    // Séries mensais por carteira (gráficos do painel). Falha em silêncio: os
    // KPIs continuam a ser devolvidos mesmo que as séries não estejam disponíveis.
    let graficos: any = { meses: [], porCarteira: [] };
    try {
      const months = Math.min(24, Math.max(3, Number(req.query.months) || 12));
      graficos = await getWalletsMonthlySeries(companyId, months);
    } catch (seriesError: any) {
      console.error("[Carteiras] Séries mensais indisponíveis:", seriesError?.message || seriesError);
    }

    return res.status(200).json({
      success: true,
      // Consolidado (sem discriminar carteiras) — base dos KPIs gerais.
      summary: {
        ...summary,
        saldo_real_disponivel: real.available,
        contas_desembolso: real.accounts.length,
      },
      // Discriminado por carteira — usado só no painel interno/relatório de financiador.
      carteiras: wallets.map(serializeWallet),
      graficos,
      saldo_real: real,
    });
  } catch (error: any) {
    console.error("[Carteiras] Erro no dashboard:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao carregar KPIs das carteiras." });
  }
};

/** GET /api/wallets/:companyId/:id */
const findOne = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    const id = Number(req.params.id);
    const wallet = await getWalletWithAnalytics(companyId, id);
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Carteira não encontrada." });
    }
    return res.status(200).json({ success: true, result: serializeWallet(wallet) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao carregar a carteira." });
  }
};

const buildPayload = (body: any) => {
  const alocadoRaw = body.allocated_amount ?? body.alocado_amount;
  const alocado = alocadoRaw === null || alocadoRaw === undefined || String(alocadoRaw).trim() === ""
    ? null
    : num(alocadoRaw);

  return {
    codigo: String(body.codigo || "").trim().toUpperCase().replace(/\s+/g, "_").slice(0, 20),
    nome: String(body.nome || "").trim(),
    descricao: body.descricao ? String(body.descricao) : null,
    tipo: "FINANCIAMENTO" as const, // carteiras analíticas são SEMPRE de financiamento
    parceiro_nome: body.parceiro_nome ? String(body.parceiro_nome).trim() : null,
    is_parceiro_externo: body.is_parceiro_externo ? 1 : 0,
    parceiro_email: body.parceiro_email ? String(body.parceiro_email).trim() : null,
    parceiro_nuit: body.parceiro_nuit ? String(body.parceiro_nuit).trim() : null,
    parceiro_contacto: body.parceiro_contacto ? String(body.parceiro_contacto).trim() : null,
    allocated_amount: alocado,
    initial_disbursed_amount: num(body.initial_disbursed_amount ?? body.desembolsado_inicial ?? 0),
    taxa_juro:
      body.taxa_juro === null || body.taxa_juro === undefined || String(body.taxa_juro).trim() === ""
        ? null
        : num(body.taxa_juro),
    cor_badge: body.cor_badge ? String(body.cor_badge) : "blue",
    is_ativa: body.is_ativa === undefined ? 1 : body.is_ativa ? 1 : 0,
    tem_portal: body.tem_portal ? 1 : 0,
    portal_ativo: body.portal_ativo === undefined ? 1 : body.portal_ativo ? 1 : 0,
  };
};

/** POST /api/wallets — criar carteira (apenas Admin). */
const create = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.body.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, message: "companyId é obrigatório." });
    }

    const payload = buildPayload(req.body);
    if (!payload.codigo || !payload.nome) {
      return res.status(400).json({ success: false, message: "Código e nome da carteira são obrigatórios." });
    }
    if (payload.is_parceiro_externo && !payload.parceiro_nome) {
      return res.status(400).json({ success: false, message: "Indique o nome do parceiro financiador externo." });
    }

    const duplicated: any = await FinancingWalletModel.findOne({
      where: { companyId, codigo: payload.codigo },
      raw: true,
    });
    if (duplicated) {
      return res.status(409).json({ success: false, message: `Já existe uma carteira com o código ${payload.codigo}.` });
    }

    const user = getCurrentUser(req);
    const wallet: any = await FinancingWalletModel.create({
      ...payload,
      companyId,
      created_by: user?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Carteira de financiamento criada com sucesso.",
      result: wallet,
    });
  } catch (error: any) {
    console.error("[Carteiras] Erro ao criar:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao criar a carteira de financiamento." });
  }
};

/** PUT /api/wallets/:id — editar carteira (apenas Admin). */
const update = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const wallet: any = await FinancingWalletModel.findByPk(id);
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Carteira não encontrada." });
    }
    const companyId = Number(wallet.getDataValue("companyId"));

    const payload = buildPayload({ ...wallet.toJSON(), ...req.body });
    if (!payload.codigo || !payload.nome) {
      return res.status(400).json({ success: false, message: "Código e nome da carteira são obrigatórios." });
    }

    const duplicated: any = await FinancingWalletModel.findOne({
      where: { companyId, codigo: payload.codigo, id: { [Op.ne]: id } },
      raw: true,
    });
    if (duplicated) {
      return res.status(409).json({ success: false, message: `Já existe outra carteira com o código ${payload.codigo}.` });
    }

    await FinancingWalletModel.update(payload, { where: { id } });
    const updated = await getWalletWithAnalytics(companyId, id);

    return res.status(200).json({
      success: true,
      message: "Carteira de financiamento actualizada.",
      result: updated ? serializeWallet(updated) : null,
    });
  } catch (error: any) {
    console.error("[Carteiras] Erro ao actualizar:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao actualizar a carteira." });
  }
};

/**
 * Dependências de uma carteira: quantos registos apontam para ela. É a base
 * das regras de apagar (só carteiras sem movimento podem desaparecer) e do
 * diálogo de confirmação no frontend.
 */
const countDependencies = async (walletId: number) => {
  const [loans]: any = await db.query(
    "SELECT COUNT(*) AS total, IFNULL(SUM(amount), 0) AS desembolsado FROM customer_loans WHERE walletId = ?",
    { replacements: [walletId] }
  );
  const [transactions]: any = await db.query("SELECT COUNT(*) AS total FROM tranzactions WHERE walletId = ?", {
    replacements: [walletId],
  });
  const [installments]: any = await db.query("SELECT COUNT(*) AS total FROM amortization_loans WHERE walletId = ?", {
    replacements: [walletId],
  });
  const [users]: any = await db.query("SELECT COUNT(*) AS total FROM users WHERE walletId = ?", {
    replacements: [walletId],
  });
  const [rates]: any = await db.query("SELECT COUNT(*) AS total FROM interest_rates WHERE walletId = ?", {
    replacements: [walletId],
  });
  const [recibos]: any = await db.query("SELECT COUNT(*) AS total FROM recibos WHERE walletId = ?", {
    replacements: [walletId],
  });

  const num = (rows: any) => Number((rows as any[])?.[0]?.total) || 0;
  return {
    creditos: num(loans),
    desembolsado: Number((loans as any[])?.[0]?.desembolsado) || 0,
    recebimentos: num(transactions),
    prestacoes: num(installments),
    utilizadores: num(users),
    taxas: num(rates),
    recibos: num(recibos),
  };
};

/**
 * Lista, em português corrente, os motivos que impedem apagar a carteira.
 * Só aparecem os motivos reais — sem zeros a poluir a mensagem.
 */
const motivosDeBloqueio = (wallet: any, counts: any): string[] => {
  const motivos: string[] = [];
  if (counts.creditos > 0) motivos.push(`${counts.creditos} crédito(s) desembolsado(s)`);
  if (counts.recebimentos > 0) motivos.push(`${counts.recebimentos} recebimento(s)`);
  if (counts.prestacoes > 0) motivos.push(`${counts.prestacoes} prestação(ões)`);
  if (counts.recibos > 0) motivos.push(`${counts.recibos} recibo(s)`);
  if (counts.utilizadores > 0) motivos.push(`${counts.utilizadores} utilizador(es) ligado(s)`);
  if (Number(wallet.initial_disbursed_amount) > 0) {
    motivos.push(`${Number(wallet.initial_disbursed_amount).toFixed(2)} MT de capital já desembolsado (base histórica)`);
  }
  return motivos;
};

/** GET /api/wallets/:id/dependencies — pode esta carteira ser apagada? */
const dependencies = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const wallet: any = await FinancingWalletModel.findByPk(id, { raw: true });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Carteira não encontrada." });
    }
    const counts = await countDependencies(id);
    const temMovimento =
      counts.creditos > 0 ||
      counts.recebimentos > 0 ||
      counts.prestacoes > 0 ||
      counts.utilizadores > 0 ||
      Number(wallet.initial_disbursed_amount) > 0;

    return res.status(200).json({
      success: true,
      result: {
        carteira: { id: Number(wallet.id), codigo: wallet.codigo, nome: wallet.nome },
        ...counts,
        pode_apagar: !temMovimento,
        motivo: temMovimento
          ? `A carteira ${wallet.codigo} não pode ser apagada: tem ${motivosDeBloqueio(wallet, counts).join(", ")}. Só pode ser desactivada.`
          : null,
      },
    });
  } catch (error: any) {
    console.error("[Carteiras] Erro ao verificar dependências:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao verificar a carteira." });
  }
};

/**
 * DELETE /api/wallets/:id — APAGA a carteira, mas só quando não tem qualquer
 * movimento (créditos, prestações, recebimentos, utilizadores ou capital já
 * desembolsado). Com movimento, devolve 409 e pede para a desactivar.
 */
const destroy = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const wallet: any = await FinancingWalletModel.findByPk(id, { raw: true });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Carteira não encontrada." });
    }

    const counts = await countDependencies(id);
    const bloqueado =
      counts.creditos > 0 ||
      counts.recebimentos > 0 ||
      counts.prestacoes > 0 ||
      counts.utilizadores > 0 ||
      Number(wallet.initial_disbursed_amount) > 0;

    if (bloqueado) {
      const motivos = motivosDeBloqueio(wallet, counts);
      return res.status(409).json({
        success: false,
        message:
          `A carteira ${wallet.codigo} não pode ser apagada: tem ${motivos.join(", ")}. ` +
          `Só pode ser desactivada.`,
        dependencies: counts,
      });
    }

    // Sem movimento: limpa as taxas que apontavam para esta carteira (passam a
    // "sem vinculação", para o Admin poder vincular à origem correcta).
    await InterestRateModel.update({ walletId: null }, { where: { walletId: id } });
    await FinancingWalletModel.destroy({ where: { id } });

    return res.status(200).json({
      success: true,
      message: `Carteira ${wallet.codigo} apagada.`,
      taxas_desvinculadas: counts.taxas,
    });
  } catch (error: any) {
    console.error("[Carteiras] Erro ao apagar:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao apagar a carteira." });
  }
};

/** POST /api/wallets/:id/deactivate — desactivar (mantém o histórico). */
const deactivate = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const wallet: any = await FinancingWalletModel.findByPk(id);
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Carteira não encontrada." });
    }
    const inactive = req.body?.is_ativa === false || req.body?.is_ativa === 0 || req.body?.is_ativa === "false";
    await FinancingWalletModel.update(
      { is_ativa: inactive ? 0 : 1, ...(inactive ? { portal_ativo: 0 } : {}) },
      { where: { id } }
    );
    return res.status(200).json({
      success: true,
      message: inactive
        ? "Carteira desactivada. Os créditos já classificados mantêm o histórico."
        : "Carteira activada.",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao alterar o estado da carteira." });
  }
};

/**
 * GET /api/wallets/:companyId/test-candidates — carteiras sem movimento que
 * podem ser limpas (código TESTE_* ou criadas nos últimos 7 dias).
 */
const testCandidates = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    const wallets = await getWalletsWithAnalytics(companyId);
    const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const candidatos = [];
    for (const wallet of wallets) {
      const counts = await countDependencies(Number(wallet.id));
      const semMovimento =
        counts.creditos === 0 &&
        counts.recebimentos === 0 &&
        counts.prestacoes === 0 &&
        counts.utilizadores === 0 &&
        Number(wallet.initial_disbursed_amount) === 0;
      if (!semMovimento) continue;

      const recente = new Date(String((wallet as any).created_at || 0)).getTime() >= seteDiasAtras;
      const isTeste = String(wallet.codigo || "").toUpperCase().startsWith("TESTE");
      if (!isTeste && !recente) continue;

      candidatos.push({
        id: Number(wallet.id),
        codigo: wallet.codigo,
        nome: wallet.nome,
        cor_badge: wallet.cor_badge,
        created_at: (wallet as any).created_at || null,
        is_teste: isTeste,
        taxas: counts.taxas,
      });
    }

    return res.status(200).json({ success: true, result: candidatos });
  } catch (error: any) {
    console.error("[Carteiras] Erro ao listar carteiras de teste:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao listar carteiras de teste." });
  }
};

/** POST /api/wallets/purge-test — apaga em lote as carteiras sem movimento. */
const purgeTest = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.body?.companyId);
    const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map((id: any) => Number(id)).filter(Boolean) : [];
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, message: "companyId é obrigatório." });
    }
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: "Seleccione as carteiras a apagar." });
    }

    const apagadas: string[] = [];
    const bloqueadas: Array<{ id: number; motivo: string }> = [];

    for (const id of ids) {
      const wallet: any = await FinancingWalletModel.findOne({ where: { id, companyId }, raw: true });
      if (!wallet) continue;
      const counts = await countDependencies(id);
      const temMovimento =
        counts.creditos > 0 ||
        counts.recebimentos > 0 ||
        counts.prestacoes > 0 ||
        counts.utilizadores > 0 ||
        Number(wallet.initial_disbursed_amount) > 0;
      if (temMovimento) {
        bloqueadas.push({ id, motivo: `Carteira ${wallet.codigo} tem movimento — só pode ser desactivada.` });
        continue;
      }
      await InterestRateModel.update({ walletId: null }, { where: { walletId: id } });
      await FinancingWalletModel.destroy({ where: { id } });
      apagadas.push(wallet.codigo);
    }

    return res.status(200).json({
      success: true,
      message: `${apagadas.length} carteira(s) de teste apagada(s)${bloqueadas.length ? `, ${bloqueadas.length} bloqueada(s) por movimento` : ""}.`,
      apagadas,
      bloqueadas,
    });
  } catch (error: any) {
    console.error("[Carteiras] Erro ao limpar carteiras de teste:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao limpar as carteiras de teste." });
  }
};

/** GET /api/wallets/:companyId/rates — taxas de juro com a carteira associada. */
const listRatesWithWallet = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    const rates: any[] = (await InterestRateModel.findAll({
      where: { companyId },
      order: [["id", "DESC"]],
      raw: true,
    })) as any[];
    const wallets = await getWalletsWithAnalytics(companyId);
    const byId = new Map(wallets.map((wallet) => [Number(wallet.id), wallet]));

    const accountIds = [...new Set(rates.map((rate) => Number(rate.accountId)).filter(Boolean))];
    const accounts: any[] = accountIds.length
      ? ((await AccountModel.findAll({ where: { id: accountIds }, raw: true })) as any[])
      : [];
    const accountById = new Map(accounts.map((account) => [Number(account.id), account]));

    return res.status(200).json({
      success: true,
      result: rates.map((rate) => ({
        ...rate,
        carteira: rate.walletId ? byId.get(Number(rate.walletId)) || null : null,
        conta: rate.accountId ? accountById.get(Number(rate.accountId)) || null : null,
        vinculacao: rate.walletId ? "CARTEIRA" : rate.accountId ? "CONTA" : "NENHUMA",
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao listar taxas de juro." });
  }
};

/** GET /api/wallets/:companyId/options — opções leves para selects (sem KPIs). */
const options = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    const wallets: any[] = (await FinancingWalletModel.findAll({
      where: { companyId },
      order: [["id", "ASC"]],
      raw: true,
    })) as any[];

    const analytics = await getWalletsWithAnalytics(companyId);
    const byId = new Map(analytics.map((wallet) => [Number(wallet.id), wallet]));

    return res.status(200).json({
      success: true,
      result: wallets.map((wallet) => {
        const enriched = byId.get(Number(wallet.id));
        return {
          id: Number(wallet.id),
          codigo: wallet.codigo,
          nome: wallet.nome,
          tipo: wallet.tipo,
          parceiro_nome: wallet.parceiro_nome,
          is_parceiro_externo: !!wallet.is_parceiro_externo,
          tem_portal: !!wallet.tem_portal,
          cor_badge: wallet.cor_badge,
          is_ativa: !!wallet.is_ativa,
          taxa_juro: wallet.taxa_juro === null || wallet.taxa_juro === undefined ? null : num(wallet.taxa_juro),
          allocated_amount: enriched?.allocated_amount ?? null,
          disbursed: enriched?.disbursed ?? 0,
          saldo_analitico: enriched?.saldo_analitico ?? null,
          utilizacao: enriched?.utilizacao ?? 0,
        };
      }),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao listar carteiras." });
  }
};

/** GET /api/wallets/:companyId/partner-users — contas role 4 da empresa. */
const listPartnerUsers = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    const users: any[] = (await UserModel.findAll({
      where: { companyId, userRole: 4 },
      order: [["id", "DESC"]],
      raw: true,
    })) as any[];
    const wallets = await getWalletsWithAnalytics(companyId);
    const byId = new Map(wallets.map((wallet) => [Number(wallet.id), wallet]));

    return res.status(200).json({
      success: true,
      result: users.map((user) => {
        delete user.password;
        return {
          ...user,
          carteira: user.walletId ? byId.get(Number(user.walletId)) || null : null,
        };
      }),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao listar parceiros financiadores." });
  }
};

/**
 * GET /api/wallets/:companyId/unclassified-loans
 * Créditos ainda SEM carteira de financiamento (carteira criada depois do
 * crédito). Alimenta a classificação retroativa no frontend — enquanto um
 * crédito não estiver classificado, o recibo não consegue mostrar o fundo.
 */
const unclassifiedLoans = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, message: "companyId inválido." });
    }

    const [rows]: any = await db.query(
      `SELECT cl.id, cl.accountNumber, cl.amount, cl.interestRate, cl.disbursementDate,
              cl.status, cl.customerId, c.customerName
         FROM customer_loans cl
         LEFT JOIN customers c ON c.id = cl.customerId
        WHERE cl.companyId = ? AND cl.walletId IS NULL
        ORDER BY cl.disbursementDate ASC, cl.id ASC`,
      { replacements: [companyId] }
    );

    return res.status(200).json({ success: true, result: rows });
  } catch (error: any) {
    console.error("[Carteiras] Erro ao listar créditos sem carteira:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao listar os créditos sem carteira." });
  }
};

/**
 * GET /api/wallets/:companyId/classification-proposals
 * Propõe a carteira de cada crédito sem origem de capital, derivando-a da taxa
 * de juro do crédito (`interest_rates.walletId`) e ordenando pela data de
 * desembolso. É só uma PROPOSTA: o Admin revê e confirma.
 */
const classificationProposals = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.params.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, message: "companyId inválido." });
    }
    const { buildClassificationProposals } = await import("../services/financingWalletService");
    const propostas = await buildClassificationProposals(companyId);
    return res.status(200).json({ success: true, ...propostas });
  } catch (error: any) {
    console.error("[Carteiras] Erro ao propor a classificação dos créditos:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao calcular as propostas de classificação." });
  }
};

/**
 * POST /api/wallets/classify-loans
 * Classifica créditos antigos numa carteira. Propaga a carteira ao crédito,
 * às prestações, aos pagamentos e aos recibos JÁ emitidos que ainda não
 * tinham fundo atribuído — é isso que faz o recibo passar a mostrar o badge
 * da carteira (KMAD, PME_12, …) e o relatório do financiador a incluí-lo.
 */
const classifyLoans = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.body?.companyId);
    const assignments: Array<{ loanId: number; walletId: number }> = Array.isArray(req.body?.assignments)
      ? req.body.assignments
          .map((item: any) => ({ loanId: Number(item?.loanId), walletId: Number(item?.walletId) }))
          .filter((item: any) => Number.isFinite(item.loanId) && item.loanId > 0 && Number.isFinite(item.walletId) && item.walletId > 0)
      : [];

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, message: "companyId é obrigatório." });
    }
    if (assignments.length === 0) {
      return res.status(400).json({ success: false, message: "Selecione os créditos e a carteira a atribuir." });
    }

    const wallets: any[] = (await FinancingWalletModel.findAll({ where: { companyId }, raw: true })) as any[];
    const walletById = new Map(wallets.map((wallet) => [Number(wallet.id), wallet]));

    let classificados = 0;
    const ignorados: number[] = [];

    for (const item of assignments) {
      const wallet = walletById.get(item.walletId);
      if (!wallet) {
        ignorados.push(item.loanId);
        continue;
      }
      const [loans]: any = await db.query(
        "SELECT id FROM customer_loans WHERE id = ? AND companyId = ? LIMIT 1",
        { replacements: [item.loanId, companyId] }
      );
      if ((loans as any[]).length === 0) {
        ignorados.push(item.loanId);
        continue;
      }

      await db.query("UPDATE customer_loans SET walletId = ? WHERE id = ?", {
        replacements: [item.walletId, item.loanId],
      });
      // Prestações e pagamentos do mesmo crédito herdam a carteira (relatórios).
      await db.query("UPDATE amortization_loans SET walletId = ? WHERE loanId = ?", {
        replacements: [item.walletId, item.loanId],
      });
      await db.query("UPDATE tranzactions SET walletId = ? WHERE loanId = ? AND walletId IS NULL", {
        replacements: [item.walletId, item.loanId],
      });
      // Recibos já emitidos sem fundo: passam a mostrar a carteira no badge.
      await db.query(
        "UPDATE recibos SET walletId = ?, wallet_nome = ? WHERE loanId = ? AND walletId IS NULL",
        { replacements: [item.walletId, wallet.nome || wallet.codigo || null, item.loanId] }
      );
      classificados += 1;
    }

    return res.status(200).json({
      success: true,
      message: `${classificados} crédito(s) classificados na carteira.`,
      classificados,
      ignorados,
    });
  } catch (error: any) {
    console.error("[Carteiras] Erro ao classificar créditos:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao classificar os créditos." });
  }
};

export {
  findAll,
  dashboard,
  findOne,
  create,
  update,
  destroy,
  deactivate,
  dependencies,
  purgeTest,
  testCandidates,
  options,
  listRatesWithWallet,
  listPartnerUsers,
  unclassifiedLoans,
  classificationProposals,
  classifyLoans,
};
