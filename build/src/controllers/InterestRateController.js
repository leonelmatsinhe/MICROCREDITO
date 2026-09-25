"use strict";
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
exports.destroyRate = exports.updateRate = exports.createRate = exports.findInterestRateByCompany = exports.findAllInterestRates = void 0;
const InterestRateModel_1 = require("../database/models/InterestRateModel");
const FinancingWalletModel_1 = require("../database/models/FinancingWalletModel");
const AccountModel_1 = require("../database/models/AccountModel");
/**
 * TAXAS DE JURO ↔ ORIGEM DO CAPITAL
 * ---------------------------------
 * Cada taxa tem de estar vinculada a UMA origem de capital (mutuamente
 * exclusivas):
 *  · CARTEIRA — carteira de financiamento analítica (KMAD, PME_12, COM_9, ...);
 *  · CONTA    — conta de desembolso real (accounts purpose DESEMBOLSO/MISTO);
 *  · NENHUMA  — taxa genérica/legada ainda sem vinculação (pode ser vinculada
 *               depois pelo botão "Vincular" na listagem).
 */
const PURPOSES_DESEMBOLSO = ["DESEMBOLSO", "MISTO"];
const findAllInterestRates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const rates = yield InterestRateModel_1.InterestRateModel.findAll();
    return rates.length != null
        ? res.status(200).send({ success: true, result: rates })
        : res.status(204).send({
            success: false,
            message: "No rates registered so far.",
        });
});
exports.findAllInterestRates = findAllInterestRates;
/** Resolve a carteira/conta de cada taxa numa só passagem (sem N+1). */
const enrichRates = (rates) => __awaiter(void 0, void 0, void 0, function* () {
    const walletIds = [...new Set(rates.map((r) => Number(r.walletId)).filter(Boolean))];
    const accountIds = [...new Set(rates.map((r) => Number(r.accountId)).filter(Boolean))];
    const wallets = walletIds.length
        ? (yield FinancingWalletModel_1.FinancingWalletModel.findAll({ where: { id: walletIds }, raw: true }))
        : [];
    const accounts = accountIds.length
        ? (yield AccountModel_1.AccountModel.findAll({ where: { id: accountIds }, raw: true }))
        : [];
    const walletById = new Map(wallets.map((w) => [Number(w.id), w]));
    const accountById = new Map(accounts.map((a) => [Number(a.id), a]));
    return rates.map((rate) => {
        const wallet = rate.walletId ? walletById.get(Number(rate.walletId)) || null : null;
        const account = rate.accountId ? accountById.get(Number(rate.accountId)) || null : null;
        return Object.assign(Object.assign({}, rate), { carteira: wallet, conta: account, vinculacao: wallet ? "CARTEIRA" : account ? "CONTA" : "NENHUMA" });
    });
});
const findInterestRateByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const interest = (yield InterestRateModel_1.InterestRateModel.findAll({
        where: {
            companyId: id,
        },
        order: [["id", "DESC"]],
        raw: true,
    }));
    if (interest == null) {
        return res.status(204).send({
            success: false,
            result: "No rates found with the ID provided",
        });
    }
    return res.status(200).send({ success: true, result: yield enrichRates(interest) });
});
exports.findInterestRateByCompany = findInterestRateByCompany;
/**
 * Vinculação da taxa: exactamente uma origem de capital.
 * `vinculacao` (opcional) força a intenção do formulário; caso não venha,
 * deduz-se dos ids enviados. Devolve sempre { walletId, accountId }.
 */
const resolveVinculacao = (companyId, body, res) => __awaiter(void 0, void 0, void 0, function* () {
    const company = Number(companyId);
    if (!Number.isFinite(company) || company <= 0) {
        res.status(400).json({ success: false, message: "Empresa inválida para a taxa de juro." });
        return null;
    }
    const rawWallet = body.walletId === undefined ? null : body.walletId;
    const rawAccount = body.accountId === undefined ? null : body.accountId;
    const hasWallet = rawWallet !== null && rawWallet !== undefined && String(rawWallet).trim() !== "";
    const hasAccount = rawAccount !== null && rawAccount !== undefined && String(rawAccount).trim() !== "";
    if (hasWallet && hasAccount) {
        res.status(400).json({
            success: false,
            message: "A taxa só pode estar vinculada a uma carteira de financiamento OU a uma conta de desembolso, não às duas.",
        });
        return null;
    }
    // Taxa genérica/legada: só é aceite quando o formulário o assume claramente.
    if (!hasWallet && !hasAccount) {
        const semVinculacao = String(body.vinculacao || "").toUpperCase() === "NENHUMA" || body.sem_vinculacao === true;
        if (!semVinculacao) {
            res.status(400).json({
                success: false,
                message: "Vincule a taxa a uma carteira de financiamento ou a uma conta de desembolso principal.",
            });
            return null;
        }
        return { walletId: null, accountId: null };
    }
    if (hasWallet) {
        const walletId = Number(rawWallet);
        const wallet = yield FinancingWalletModel_1.FinancingWalletModel.findOne({ where: { id: walletId, companyId: company }, raw: true });
        if (!wallet) {
            res.status(400).json({ success: false, message: "Carteira de financiamento não encontrada nesta empresa." });
            return null;
        }
        if (String(wallet.tipo) !== "FINANCIAMENTO") {
            res.status(400).json({
                success: false,
                message: "Só carteiras do tipo FINANCIAMENTO podem ser associadas a taxas de juro.",
            });
            return null;
        }
        return { walletId: Number(wallet.id), accountId: null };
    }
    const accountId = Number(rawAccount);
    const account = yield AccountModel_1.AccountModel.findOne({ where: { id: accountId, companyId: company }, raw: true });
    if (!account) {
        res.status(400).json({ success: false, message: "Conta bancária não encontrada nesta empresa." });
        return null;
    }
    if (!PURPOSES_DESEMBOLSO.includes(String(account.purpose))) {
        res.status(400).json({
            success: false,
            message: `A conta ${account.bank_name || account.accountNumber} tem finalidade ${account.purpose}. Só contas DESEMBOLSO ou MISTO podem ser a origem do capital de uma taxa.`,
        });
        return null;
    }
    return { walletId: null, accountId: Number(account.id) };
});
const createRate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, tax, administrativeFee, companyId } = req.body;
        const vinculacao = yield resolveVinculacao(companyId, req.body, res);
        if (!vinculacao)
            return;
        const rates = yield InterestRateModel_1.InterestRateModel.create(Object.assign({ companyId,
            name,
            tax,
            administrativeFee }, vinculacao));
        return rates != null
            ? res
                .status(200)
                .send({ success: true, result: "Interest rate created successfully." })
            : res.status(204).send({
                success: false,
                result: "There was an error creating the rate.",
            });
    }
    catch (error) {
        console.error("[Taxas] Erro ao criar:", detalheDoErro(error));
        return res.status(500).json({
            success: false,
            message: "Não foi possível criar a taxa de juro. Tente novamente.",
        });
    }
});
exports.createRate = createRate;
const updateRate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const payload = Object.assign({}, req.body);
        // Qualquer mudança de vinculação (carteira/conta/nenhuma) é validada contra a
        // empresa da taxa — a taxa nunca aponta para uma origem de outra empresa.
        const touchesVinculacao = payload.walletId !== undefined || payload.accountId !== undefined || payload.vinculacao !== undefined;
        if (touchesVinculacao) {
            const current = yield InterestRateModel_1.InterestRateModel.findByPk(id, { raw: true });
            if (!current) {
                return res.status(404).json({ success: false, message: "Taxa de juro não encontrada." });
            }
            const effective = {
                walletId: payload.walletId !== undefined ? payload.walletId : current.walletId,
                accountId: payload.accountId !== undefined ? payload.accountId : current.accountId,
                vinculacao: payload.vinculacao,
                sem_vinculacao: payload.sem_vinculacao,
            };
            const vinculacao = yield resolveVinculacao(current.companyId, effective, res);
            if (!vinculacao)
                return;
            payload.walletId = vinculacao.walletId;
            payload.accountId = vinculacao.accountId;
            delete payload.vinculacao;
            delete payload.sem_vinculacao;
        }
        // Só campos editáveis da taxa seguem para o UPDATE: um campo extra no corpo
        // do pedido (ex.: carteira/conta completas) nunca chega à base de dados.
        const editavel = {};
        ["name", "tax", "administrativeFee", "walletId", "accountId"].forEach((campo) => {
            if (payload[campo] !== undefined)
                editavel[campo] = payload[campo];
        });
        const rate = yield InterestRateModel_1.InterestRateModel.update(editavel, { where: { id } });
        const actualizado = yield InterestRateModel_1.InterestRateModel.findByPk(id, { raw: true });
        return res.status(200).json({
            success: true,
            message: "Rate updated successfully",
            result: actualizado,
            afectadas: Array.isArray(rate) ? Number(rate[0]) : null,
        });
    }
    catch (error) {
        console.error("[Taxas] Erro ao actualizar:", detalheDoErro(error));
        return res.status(500).json({
            success: false,
            message: "Não foi possível guardar a vinculação da taxa. Tente novamente.",
        });
    }
});
exports.updateRate = updateRate;
const destroyRate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const deleteRate = yield InterestRateModel_1.InterestRateModel.destroy({ where: { id: id } });
    return deleteRate != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "Interest rate deleted successfully.",
        }))
        : res.status(204).send(JSON.stringify({
            success: false,
            message: "There was an error deleting this rate.",
        }));
});
exports.destroyRate = destroyRate;
/** Detalhe legível do erro (Sequelize esconde a mensagem do driver). */
const detalheDoErro = (error) => {
    const original = error === null || error === void 0 ? void 0 : error.original;
    if (original === null || original === void 0 ? void 0 : original.sqlMessage)
        return `${(error === null || error === void 0 ? void 0 : error.name) || "Error"}: ${original.sqlMessage}`;
    if (original === null || original === void 0 ? void 0 : original.message)
        return `${(error === null || error === void 0 ? void 0 : error.name) || "Error"}: ${original.message}`;
    return `${(error === null || error === void 0 ? void 0 : error.name) || "Error"}${(error === null || error === void 0 ? void 0 : error.message) ? `: ${error.message}` : " (sem mensagem)"}`;
};
