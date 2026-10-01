"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyLoans = exports.classificationProposals = exports.unclassifiedLoans = exports.listPartnerUsers = exports.listRatesWithWallet = exports.options = exports.testCandidates = exports.purgeTest = exports.dependencies = exports.deactivate = exports.destroy = exports.update = exports.create = exports.findOne = exports.dashboard = exports.findAll = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../database/db");
const FinancingWalletModel_1 = require("../database/models/FinancingWalletModel");
const InterestRateModel_1 = require("../database/models/InterestRateModel");
const UserModel_1 = require("../database/models/UserModel");
const AccountModel_1 = require("../database/models/AccountModel");
const financingWalletService_1 = require("../services/financingWalletService");
const roles_1 = require("../middlewares/roles");
/**
 * CARTEIRAS DE FINANCIAMENTO (dinheiro ANALÍTICO)
 * ----------------------------------------------
 * CRUD + KPIs. As carteiras servem para separar a origem do capital (parceria
 * KMAD, fundos PME/Comunidades/Interno) e isolam o relatório de cada parceiro
 * financiador. Não guardam dinheiro real: o dinheiro físico continua nas
 * contas de tesouraria (accounts purpose DESEMBOLSO/REEMBOLSO).
 */
const num = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
const serializeWallet = (wallet) => (Object.assign(Object.assign({}, wallet), { allocated_amount: wallet.allocated_amount, saldo_analitico: wallet.saldo_analitico, ilimitado: wallet.allocated_amount === null, taxa_percentual: wallet.taxa_juro === null ? null : wallet.taxa_juro }));
/** GET /api/wallets/:companyId — todas as carteiras com KPIs. */
const findAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        if (!Number.isFinite(companyId) || companyId <= 0) {
            return res.status(400).json({ success: false, message: "companyId inválido." });
        }
        const onlyActive = String(req.query.onlyActive || "") === "true";
        const wallets = yield (0, financingWalletService_1.getWalletsWithAnalytics)(companyId, { onlyActive });
        const summary = yield (0, financingWalletService_1.getWalletTotalsSummary)(companyId);
        const real = yield (0, financingWalletService_1.getRealDisbursementBalance)(companyId);
        return res.status(200).json({
            success: true,
            result: wallets.map(serializeWallet),
            summary: Object.assign(Object.assign({}, summary), { saldo_real_disponivel: real.available, contas_desembolso: real.accounts.length }),
            saldo_real: real,
        });
    }
    catch (error) {
        console.error("[Carteiras] Erro ao listar:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao listar carteiras de financiamento." });
    }
});
exports.findAll = findAll;
/** GET /api/wallets/:companyId/dashboard — consolidado para os KPIs do painel. */
const dashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        const wallets = yield (0, financingWalletService_1.getWalletsWithAnalytics)(companyId, { onlyActive: true });
        const summary = yield (0, financingWalletService_1.getWalletTotalsSummary)(companyId);
        const real = yield (0, financingWalletService_1.getRealDisbursementBalance)(companyId);
        // Séries mensais por carteira (gráficos do painel). Falha em silêncio: os
        // KPIs continuam a ser devolvidos mesmo que as séries não estejam disponíveis.
        let graficos = { meses: [], porCarteira: [] };
        try {
            const months = Math.min(24, Math.max(3, Number(req.query.months) || 12));
            graficos = yield (0, financingWalletService_1.getWalletsMonthlySeries)(companyId, months);
        }
        catch (seriesError) {
            console.error("[Carteiras] Séries mensais indisponíveis:", (seriesError === null || seriesError === void 0 ? void 0 : seriesError.message) || seriesError);
        }
        return res.status(200).json({
            success: true,
            // Consolidado (sem discriminar carteiras) — base dos KPIs gerais.
            summary: Object.assign(Object.assign({}, summary), { saldo_real_disponivel: real.available, contas_desembolso: real.accounts.length }),
            // Discriminado por carteira — usado só no painel interno/relatório de financiador.
            carteiras: wallets.map(serializeWallet),
            graficos,
            saldo_real: real,
        });
    }
    catch (error) {
        console.error("[Carteiras] Erro no dashboard:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao carregar KPIs das carteiras." });
    }
});
exports.dashboard = dashboard;
/** GET /api/wallets/:companyId/:id */
const findOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        const id = Number(req.params.id);
        const wallet = yield (0, financingWalletService_1.getWalletWithAnalytics)(companyId, id);
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Carteira não encontrada." });
        }
        return res.status(200).json({ success: true, result: serializeWallet(wallet) });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Erro ao carregar a carteira." });
    }
});
exports.findOne = findOne;
const buildPayload = (body) => {
    var _a, _b, _c;
    const alocadoRaw = (_a = body.allocated_amount) !== null && _a !== void 0 ? _a : body.alocado_amount;
    const alocado = alocadoRaw === null || alocadoRaw === undefined || String(alocadoRaw).trim() === ""
        ? null
        : num(alocadoRaw);
    return {
        codigo: String(body.codigo || "").trim().toUpperCase().replace(/\s+/g, "_").slice(0, 20),
        nome: String(body.nome || "").trim(),
        descricao: body.descricao ? String(body.descricao) : null,
        tipo: "FINANCIAMENTO",
        parceiro_nome: body.parceiro_nome ? String(body.parceiro_nome).trim() : null,
        is_parceiro_externo: body.is_parceiro_externo ? 1 : 0,
        parceiro_email: body.parceiro_email ? String(body.parceiro_email).trim() : null,
        parceiro_nuit: body.parceiro_nuit ? String(body.parceiro_nuit).trim() : null,
        parceiro_contacto: body.parceiro_contacto ? String(body.parceiro_contacto).trim() : null,
        allocated_amount: alocado,
        initial_disbursed_amount: num((_c = (_b = body.initial_disbursed_amount) !== null && _b !== void 0 ? _b : body.desembolsado_inicial) !== null && _c !== void 0 ? _c : 0),
        taxa_juro: body.taxa_juro === null || body.taxa_juro === undefined || String(body.taxa_juro).trim() === ""
            ? null
            : num(body.taxa_juro),
        cor_badge: body.cor_badge ? String(body.cor_badge) : "blue",
        is_ativa: body.is_ativa === undefined ? 1 : body.is_ativa ? 1 : 0,
        tem_portal: body.tem_portal ? 1 : 0,
        portal_ativo: body.portal_ativo === undefined ? 1 : body.portal_ativo ? 1 : 0,
    };
};
/** POST /api/wallets — criar carteira (apenas Admin). */
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const duplicated = yield FinancingWalletModel_1.FinancingWalletModel.findOne({
            where: { companyId, codigo: payload.codigo },
            raw: true,
        });
        if (duplicated) {
            return res.status(409).json({ success: false, message: `Já existe uma carteira com o código ${payload.codigo}.` });
        }
        const user = (0, roles_1.getCurrentUser)(req);
        const wallet = yield FinancingWalletModel_1.FinancingWalletModel.create(Object.assign(Object.assign({}, payload), { companyId, created_by: (user === null || user === void 0 ? void 0 : user.id) || null }));
        return res.status(201).json({
            success: true,
            message: "Carteira de financiamento criada com sucesso.",
            result: wallet,
        });
    }
    catch (error) {
        console.error("[Carteiras] Erro ao criar:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao criar a carteira de financiamento." });
    }
});
exports.create = create;
/** PUT /api/wallets/:id — editar carteira (apenas Admin). */
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const wallet = yield FinancingWalletModel_1.FinancingWalletModel.findByPk(id);
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Carteira não encontrada." });
        }
        const companyId = Number(wallet.getDataValue("companyId"));
        const payload = buildPayload(Object.assign(Object.assign({}, wallet.toJSON()), req.body));
        if (!payload.codigo || !payload.nome) {
            return res.status(400).json({ success: false, message: "Código e nome da carteira são obrigatórios." });
        }
        const duplicated = yield FinancingWalletModel_1.FinancingWalletModel.findOne({
            where: { companyId, codigo: payload.codigo, id: { [sequelize_1.Op.ne]: id } },
            raw: true,
        });
        if (duplicated) {
            return res.status(409).json({ success: false, message: `Já existe outra carteira com o código ${payload.codigo}.` });
        }
        yield FinancingWalletModel_1.FinancingWalletModel.update(payload, { where: { id } });
        const updated = yield (0, financingWalletService_1.getWalletWithAnalytics)(companyId, id);
        return res.status(200).json({
            success: true,
            message: "Carteira de financiamento actualizada.",
            result: updated ? serializeWallet(updated) : null,
        });
    }
    catch (error) {
        console.error("[Carteiras] Erro ao actualizar:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao actualizar a carteira." });
    }
});
exports.update = update;
/**
 * Dependências de uma carteira: quantos registos apontam para ela. É a base
 * das regras de apagar (só carteiras sem movimento podem desaparecer) e do
 * diálogo de confirmação no frontend.
 */
const countDependencies = (walletId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const [loans] = yield db_1.db.query("SELECT COUNT(*) AS total, IFNULL(SUM(amount), 0) AS desembolsado FROM customer_loans WHERE walletId = ?", { replacements: [walletId] });
    const [transactions] = yield db_1.db.query("SELECT COUNT(*) AS total FROM tranzactions WHERE walletId = ?", {
        replacements: [walletId],
    });
    const [installments] = yield db_1.db.query("SELECT COUNT(*) AS total FROM amortization_loans WHERE walletId = ?", {
        replacements: [walletId],
    });
    const [users] = yield db_1.db.query("SELECT COUNT(*) AS total FROM users WHERE walletId = ?", {
        replacements: [walletId],
    });
    const [rates] = yield db_1.db.query("SELECT COUNT(*) AS total FROM interest_rates WHERE walletId = ?", {
        replacements: [walletId],
    });
    const [recibos] = yield db_1.db.query("SELECT COUNT(*) AS total FROM recibos WHERE walletId = ?", {
        replacements: [walletId],
    });
    const num = (rows) => { var _a; return Number((_a = rows === null || rows === void 0 ? void 0 : rows[0]) === null || _a === void 0 ? void 0 : _a.total) || 0; };
    return {
        creditos: num(loans),
        desembolsado: Number((_a = loans === null || loans === void 0 ? void 0 : loans[0]) === null || _a === void 0 ? void 0 : _a.desembolsado) || 0,
        recebimentos: num(transactions),
        prestacoes: num(installments),
        utilizadores: num(users),
        taxas: num(rates),
        recibos: num(recibos),
    };
});
/**
 * Lista, em português corrente, os motivos que impedem apagar a carteira.
 * Só aparecem os motivos reais — sem zeros a poluir a mensagem.
 */
const motivosDeBloqueio = (wallet, counts) => {
    const motivos = [];
    if (counts.creditos > 0)
        motivos.push(`${counts.creditos} crédito(s) desembolsado(s)`);
    if (counts.recebimentos > 0)
        motivos.push(`${counts.recebimentos} recebimento(s)`);
    if (counts.prestacoes > 0)
        motivos.push(`${counts.prestacoes} prestação(ões)`);
    if (counts.recibos > 0)
        motivos.push(`${counts.recibos} recibo(s)`);
    if (counts.utilizadores > 0)
        motivos.push(`${counts.utilizadores} utilizador(es) ligado(s)`);
    if (Number(wallet.initial_disbursed_amount) > 0) {
        motivos.push(`${Number(wallet.initial_disbursed_amount).toFixed(2)} MT de capital já desembolsado (base histórica)`);
    }
    return motivos;
};
/** GET /api/wallets/:id/dependencies — pode esta carteira ser apagada? */
const dependencies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const wallet = yield FinancingWalletModel_1.FinancingWalletModel.findByPk(id, { raw: true });
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Carteira não encontrada." });
        }
        const counts = yield countDependencies(id);
        const temMovimento = counts.creditos > 0 ||
            counts.recebimentos > 0 ||
            counts.prestacoes > 0 ||
            counts.utilizadores > 0 ||
            Number(wallet.initial_disbursed_amount) > 0;
        return res.status(200).json({
            success: true,
            result: Object.assign(Object.assign({ carteira: { id: Number(wallet.id), codigo: wallet.codigo, nome: wallet.nome } }, counts), { pode_apagar: !temMovimento, motivo: temMovimento
                    ? `A carteira ${wallet.codigo} não pode ser apagada: tem ${motivosDeBloqueio(wallet, counts).join(", ")}. Só pode ser desactivada.`
                    : null }),
        });
    }
    catch (error) {
        console.error("[Carteiras] Erro ao verificar dependências:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao verificar a carteira." });
    }
});
exports.dependencies = dependencies;
/**
 * DELETE /api/wallets/:id — APAGA a carteira, mas só quando não tem qualquer
 * movimento (créditos, prestações, recebimentos, utilizadores ou capital já
 * desembolsado). Com movimento, devolve 409 e pede para a desactivar.
 */
const destroy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const wallet = yield FinancingWalletModel_1.FinancingWalletModel.findByPk(id, { raw: true });
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Carteira não encontrada." });
        }
        const counts = yield countDependencies(id);
        const bloqueado = counts.creditos > 0 ||
            counts.recebimentos > 0 ||
            counts.prestacoes > 0 ||
            counts.utilizadores > 0 ||
            Number(wallet.initial_disbursed_amount) > 0;
        if (bloqueado) {
            const motivos = motivosDeBloqueio(wallet, counts);
            return res.status(409).json({
                success: false,
                message: `A carteira ${wallet.codigo} não pode ser apagada: tem ${motivos.join(", ")}. ` +
                    `Só pode ser desactivada.`,
                dependencies: counts,
            });
        }
        // Sem movimento: limpa as taxas que apontavam para esta carteira (passam a
        // "sem vinculação", para o Admin poder vincular à origem correcta).
        yield InterestRateModel_1.InterestRateModel.update({ walletId: null }, { where: { walletId: id } });
        yield FinancingWalletModel_1.FinancingWalletModel.destroy({ where: { id } });
        return res.status(200).json({
            success: true,
            message: `Carteira ${wallet.codigo} apagada.`,
            taxas_desvinculadas: counts.taxas,
        });
    }
    catch (error) {
        console.error("[Carteiras] Erro ao apagar:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao apagar a carteira." });
    }
});
exports.destroy = destroy;
/** POST /api/wallets/:id/deactivate — desactivar (mantém o histórico). */
const deactivate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d;
    try {
        const id = Number(req.params.id);
        const wallet = yield FinancingWalletModel_1.FinancingWalletModel.findByPk(id);
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Carteira não encontrada." });
        }
        const inactive = ((_b = req.body) === null || _b === void 0 ? void 0 : _b.is_ativa) === false || ((_c = req.body) === null || _c === void 0 ? void 0 : _c.is_ativa) === 0 || ((_d = req.body) === null || _d === void 0 ? void 0 : _d.is_ativa) === "false";
        yield FinancingWalletModel_1.FinancingWalletModel.update(Object.assign({ is_ativa: inactive ? 0 : 1 }, (inactive ? { portal_ativo: 0 } : {})), { where: { id } });
        return res.status(200).json({
            success: true,
            message: inactive
                ? "Carteira desactivada. Os créditos já classificados mantêm o histórico."
                : "Carteira activada.",
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Erro ao alterar o estado da carteira." });
    }
});
exports.deactivate = deactivate;
/**
 * GET /api/wallets/:companyId/test-candidates — carteiras sem movimento que
 * podem ser limpas (código TESTE_* ou criadas nos últimos 7 dias).
 */
const testCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        const wallets = yield (0, financingWalletService_1.getWalletsWithAnalytics)(companyId);
        const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const candidatos = [];
        for (const wallet of wallets) {
            const counts = yield countDependencies(Number(wallet.id));
            const semMovimento = counts.creditos === 0 &&
                counts.recebimentos === 0 &&
                counts.prestacoes === 0 &&
                counts.utilizadores === 0 &&
                Number(wallet.initial_disbursed_amount) === 0;
            if (!semMovimento)
                continue;
            const recente = new Date(String(wallet.created_at || 0)).getTime() >= seteDiasAtras;
            const isTeste = String(wallet.codigo || "").toUpperCase().startsWith("TESTE");
            if (!isTeste && !recente)
                continue;
            candidatos.push({
                id: Number(wallet.id),
                codigo: wallet.codigo,
                nome: wallet.nome,
                cor_badge: wallet.cor_badge,
                created_at: wallet.created_at || null,
                is_teste: isTeste,
                taxas: counts.taxas,
            });
        }
        return res.status(200).json({ success: true, result: candidatos });
    }
    catch (error) {
        console.error("[Carteiras] Erro ao listar carteiras de teste:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao listar carteiras de teste." });
    }
});
exports.testCandidates = testCandidates;
/** POST /api/wallets/purge-test — apaga em lote as carteiras sem movimento. */
const purgeTest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f;
    try {
        const companyId = Number((_e = req.body) === null || _e === void 0 ? void 0 : _e.companyId);
        const ids = Array.isArray((_f = req.body) === null || _f === void 0 ? void 0 : _f.ids) ? req.body.ids.map((id) => Number(id)).filter(Boolean) : [];
        if (!Number.isFinite(companyId) || companyId <= 0) {
            return res.status(400).json({ success: false, message: "companyId é obrigatório." });
        }
        if (ids.length === 0) {
            return res.status(400).json({ success: false, message: "Seleccione as carteiras a apagar." });
        }
        const apagadas = [];
        const bloqueadas = [];
        for (const id of ids) {
            const wallet = yield FinancingWalletModel_1.FinancingWalletModel.findOne({ where: { id, companyId }, raw: true });
            if (!wallet)
                continue;
            const counts = yield countDependencies(id);
            const temMovimento = counts.creditos > 0 ||
                counts.recebimentos > 0 ||
                counts.prestacoes > 0 ||
                counts.utilizadores > 0 ||
                Number(wallet.initial_disbursed_amount) > 0;
            if (temMovimento) {
                bloqueadas.push({ id, motivo: `Carteira ${wallet.codigo} tem movimento — só pode ser desactivada.` });
                continue;
            }
            yield InterestRateModel_1.InterestRateModel.update({ walletId: null }, { where: { walletId: id } });
            yield FinancingWalletModel_1.FinancingWalletModel.destroy({ where: { id } });
            apagadas.push(wallet.codigo);
        }
        return res.status(200).json({
            success: true,
            message: `${apagadas.length} carteira(s) de teste apagada(s)${bloqueadas.length ? `, ${bloqueadas.length} bloqueada(s) por movimento` : ""}.`,
            apagadas,
            bloqueadas,
        });
    }
    catch (error) {
        console.error("[Carteiras] Erro ao limpar carteiras de teste:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao limpar as carteiras de teste." });
    }
});
exports.purgeTest = purgeTest;
/** GET /api/wallets/:companyId/rates — taxas de juro com a carteira associada. */
const listRatesWithWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        const rates = (yield InterestRateModel_1.InterestRateModel.findAll({
            where: { companyId },
            order: [["id", "DESC"]],
            raw: true,
        }));
        const wallets = yield (0, financingWalletService_1.getWalletsWithAnalytics)(companyId);
        const byId = new Map(wallets.map((wallet) => [Number(wallet.id), wallet]));
        const accountIds = [...new Set(rates.map((rate) => Number(rate.accountId)).filter(Boolean))];
        const accounts = accountIds.length
            ? (yield AccountModel_1.AccountModel.findAll({ where: { id: accountIds }, raw: true }))
            : [];
        const accountById = new Map(accounts.map((account) => [Number(account.id), account]));
        return res.status(200).json({
            success: true,
            result: rates.map((rate) => (Object.assign(Object.assign({}, rate), { carteira: rate.walletId ? byId.get(Number(rate.walletId)) || null : null, conta: rate.accountId ? accountById.get(Number(rate.accountId)) || null : null, vinculacao: rate.walletId ? "CARTEIRA" : rate.accountId ? "CONTA" : "NENHUMA" }))),
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Erro ao listar taxas de juro." });
    }
});
exports.listRatesWithWallet = listRatesWithWallet;
/** GET /api/wallets/:companyId/options — opções leves para selects (sem KPIs). */
const options = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        const wallets = (yield FinancingWalletModel_1.FinancingWalletModel.findAll({
            where: { companyId },
            order: [["id", "ASC"]],
            raw: true,
        }));
        const analytics = yield (0, financingWalletService_1.getWalletsWithAnalytics)(companyId);
        const byId = new Map(analytics.map((wallet) => [Number(wallet.id), wallet]));
        return res.status(200).json({
            success: true,
            result: wallets.map((wallet) => {
                var _a, _b, _c, _d;
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
                    allocated_amount: (_a = enriched === null || enriched === void 0 ? void 0 : enriched.allocated_amount) !== null && _a !== void 0 ? _a : null,
                    disbursed: (_b = enriched === null || enriched === void 0 ? void 0 : enriched.disbursed) !== null && _b !== void 0 ? _b : 0,
                    saldo_analitico: (_c = enriched === null || enriched === void 0 ? void 0 : enriched.saldo_analitico) !== null && _c !== void 0 ? _c : null,
                    utilizacao: (_d = enriched === null || enriched === void 0 ? void 0 : enriched.utilizacao) !== null && _d !== void 0 ? _d : 0,
                };
            }),
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Erro ao listar carteiras." });
    }
});
exports.options = options;
/** GET /api/wallets/:companyId/partner-users — contas role 4 da empresa. */
const listPartnerUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        const users = (yield UserModel_1.UserModel.findAll({
            where: { companyId, userRole: 4 },
            order: [["id", "DESC"]],
            raw: true,
        }));
        const wallets = yield (0, financingWalletService_1.getWalletsWithAnalytics)(companyId);
        const byId = new Map(wallets.map((wallet) => [Number(wallet.id), wallet]));
        return res.status(200).json({
            success: true,
            result: users.map((user) => {
                delete user.password;
                return Object.assign(Object.assign({}, user), { carteira: user.walletId ? byId.get(Number(user.walletId)) || null : null });
            }),
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Erro ao listar parceiros financiadores." });
    }
});
exports.listPartnerUsers = listPartnerUsers;
/**
 * GET /api/wallets/:companyId/unclassified-loans
 * Créditos ainda SEM carteira de financiamento (carteira criada depois do
 * crédito). Alimenta a classificação retroativa no frontend — enquanto um
 * crédito não estiver classificado, o recibo não consegue mostrar o fundo.
 */
const unclassifiedLoans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        if (!Number.isFinite(companyId) || companyId <= 0) {
            return res.status(400).json({ success: false, message: "companyId inválido." });
        }
        const [rows] = yield db_1.db.query(`SELECT cl.id, cl.accountNumber, cl.amount, cl.interestRate, cl.disbursementDate,
              cl.status, cl.customerId, c.customerName
         FROM customer_loans cl
         LEFT JOIN customers c ON c.id = cl.customerId
        WHERE cl.companyId = ? AND cl.walletId IS NULL
        ORDER BY cl.disbursementDate ASC, cl.id ASC`, { replacements: [companyId] });
        return res.status(200).json({ success: true, result: rows });
    }
    catch (error) {
        console.error("[Carteiras] Erro ao listar créditos sem carteira:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao listar os créditos sem carteira." });
    }
});
exports.unclassifiedLoans = unclassifiedLoans;
/**
 * GET /api/wallets/:companyId/classification-proposals
 * Propõe a carteira de cada crédito sem origem de capital, derivando-a da taxa
 * de juro do crédito (`interest_rates.walletId`) e ordenando pela data de
 * desembolso. É só uma PROPOSTA: o Admin revê e confirma.
 */
const classificationProposals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = Number(req.params.companyId);
        if (!Number.isFinite(companyId) || companyId <= 0) {
            return res.status(400).json({ success: false, message: "companyId inválido." });
        }
        const { buildClassificationProposals } = yield Promise.resolve().then(() => __importStar(require("../services/financingWalletService")));
        const propostas = yield buildClassificationProposals(companyId);
        return res.status(200).json(Object.assign({ success: true }, propostas));
    }
    catch (error) {
        console.error("[Carteiras] Erro ao propor a classificação dos créditos:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao calcular as propostas de classificação." });
    }
});
exports.classificationProposals = classificationProposals;
/**
 * POST /api/wallets/classify-loans
 * Classifica créditos antigos numa carteira. Propaga a carteira ao crédito,
 * às prestações, aos pagamentos e aos recibos JÁ emitidos que ainda não
 * tinham fundo atribuído — é isso que faz o recibo passar a mostrar o badge
 * da carteira (KMAD, PME_12, …) e o relatório do financiador a incluí-lo.
 */
const classifyLoans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h;
    try {
        const companyId = Number((_g = req.body) === null || _g === void 0 ? void 0 : _g.companyId);
        const assignments = Array.isArray((_h = req.body) === null || _h === void 0 ? void 0 : _h.assignments)
            ? req.body.assignments
                .map((item) => ({ loanId: Number(item === null || item === void 0 ? void 0 : item.loanId), walletId: Number(item === null || item === void 0 ? void 0 : item.walletId) }))
                .filter((item) => Number.isFinite(item.loanId) && item.loanId > 0 && Number.isFinite(item.walletId) && item.walletId > 0)
            : [];
        if (!Number.isFinite(companyId) || companyId <= 0) {
            return res.status(400).json({ success: false, message: "companyId é obrigatório." });
        }
        if (assignments.length === 0) {
            return res.status(400).json({ success: false, message: "Selecione os créditos e a carteira a atribuir." });
        }
        const wallets = (yield FinancingWalletModel_1.FinancingWalletModel.findAll({ where: { companyId }, raw: true }));
        const walletById = new Map(wallets.map((wallet) => [Number(wallet.id), wallet]));
        let classificados = 0;
        const ignorados = [];
        for (const item of assignments) {
            const wallet = walletById.get(item.walletId);
            if (!wallet) {
                ignorados.push(item.loanId);
                continue;
            }
            const [loans] = yield db_1.db.query("SELECT id FROM customer_loans WHERE id = ? AND companyId = ? LIMIT 1", { replacements: [item.loanId, companyId] });
            if (loans.length === 0) {
                ignorados.push(item.loanId);
                continue;
            }
            yield db_1.db.query("UPDATE customer_loans SET walletId = ? WHERE id = ?", {
                replacements: [item.walletId, item.loanId],
            });
            // Prestações e pagamentos do mesmo crédito herdam a carteira (relatórios).
            yield db_1.db.query("UPDATE amortization_loans SET walletId = ? WHERE loanId = ?", {
                replacements: [item.walletId, item.loanId],
            });
            yield db_1.db.query("UPDATE tranzactions SET walletId = ? WHERE loanId = ? AND walletId IS NULL", {
                replacements: [item.walletId, item.loanId],
            });
            // Recibos já emitidos sem fundo: passam a mostrar a carteira no badge.
            yield db_1.db.query("UPDATE recibos SET walletId = ?, wallet_nome = ? WHERE loanId = ? AND walletId IS NULL", { replacements: [item.walletId, wallet.nome || wallet.codigo || null, item.loanId] });
            classificados += 1;
        }
        return res.status(200).json({
            success: true,
            message: `${classificados} crédito(s) classificados na carteira.`,
            classificados,
            ignorados,
        });
    }
    catch (error) {
        console.error("[Carteiras] Erro ao classificar créditos:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao classificar os créditos." });
    }
});
exports.classifyLoans = classifyLoans;
