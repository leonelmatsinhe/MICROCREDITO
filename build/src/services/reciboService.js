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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderReciboPdf = exports.listRecibosByCustomer = exports.listRecibosByWallet = exports.listRecibosByLoan = exports.emitReciboInTransaction = exports.generateReciboForTranzaction = exports.getReciboDetalhe = exports.findReciboForValidation = exports.ensureReciboSeal = exports.buildQrContent = exports.validationUrl = exports.buildReciboHash = exports.resolvePaymentMethod = exports.SOFTWARE_CERTIFICATION = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const qrcode_1 = __importDefault(require("qrcode"));
const moment_1 = __importDefault(require("moment"));
const sequelize_1 = require("sequelize");
const db_1 = require("../database/db");
const certificacao_1 = require("../config/certificacao");
const ReciboModel_1 = require("../database/models/ReciboModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const LoanModel_1 = require("../database/models/LoanModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const CompanyModel_1 = require("../database/models/CompanyModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const FinancingWalletModel_1 = require("../database/models/FinancingWalletModel");
const AccountModel_1 = require("../database/models/AccountModel");
const paymentsV2Models_1 = require("../database/models/paymentsV2Models");
/**
 * RECIBOS — NUMERAÇÃO SEQUENCIAL LEGAL (AUTORIDADE TRIBUTÁRIA DE MOÇAMBIQUE)
 * ------------------------------------------------------------------------
 * Requisitos implementados:
 *  · uma série por empresa/ano (formato `REC-AAAA-00001`);
 *  · sequência SEM SALTOS: o contador é reservado dentro de uma transacção com
 *    `SELECT ... FOR UPDATE` e só é incrementado se o recibo for realmente
 *    gravado (ROLLBACK devolve o número — não abre buraco na numeração legal);
 *  · SELO ELECTRÓNICO: hash SHA-256 dos dados do recibo + código de validação +
 *    QR Code que abre a página pública de validação (`/validar`) — calculados e
 *    gravados na BD SEMPRE; a APRESENTAÇÃO no PDF depende da feature flag
 *    AT_CERTIFICADO_ENABLED (config/certificacao.ts — TODO AT: ativar quando
 *    tiver Certificado AT 2026/001);
 *  · um recibo por pagamento individual, com capital, juros, mora e desconto
 *    discriminados;
 *  · PDF moderno com identificação do emitente (logotipo + NUIT), dados do
 *    cliente, carteira de financiamento, decomposição do pagamento, extrato das
 *    prestações pendentes e rodapé legal. Os elementos do selo AT (QR, hash,
 *    código, link de validação, texto do Decreto n.º 22/2023) só são impressos
 *    com AT_CERTIFICADO_ENABLED=true — ver config/certificacao.ts.
 */
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const fmtMoney = (value) => `${Number(value || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
const fmtNumber = (value) => Number(value || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** moment seguro: aceita Date (vindo do Sequelize) ou string ISO. */
const toMoment = (value) => (value instanceof Date ? (0, moment_1.default)(value) : (0, moment_1.default)(String(value)));
const fmtDate = (value) => {
    if (!value)
        return "—";
    const parsed = toMoment(value);
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : String(value);
};
/**
 * Data/hora de emissão no fuso de Moçambique, com o fuso explícito no documento
 * (UTC+2 fixo — não depende do fuso configurado no servidor).
 */
const MAPUTO_UTC_OFFSET_MIN = 120;
const fmtDateTimeMaputo = (value) => {
    if (!value)
        return "—";
    const parsed = value instanceof Date ? moment_1.default.utc(value) : moment_1.default.utc(String(value));
    if (!parsed.isValid())
        return String(value);
    return `${parsed.utcOffset(MAPUTO_UTC_OFFSET_MIN).format("DD/MM/YYYY HH:mm")} (África/Maputo)`;
};
/**
 * Telefone moçambicano legível: `25884562587` → `+258 84 562 587`.
 * Os dados legados têm comprimentos irregulares (com/sem indicativo, com 8 a 11
 * dígitos) — o agrupamento 2-3-3 é aplicado ao que existir, sem inventar dígitos.
 */
const fmtPhone = (value) => {
    const digits = String(value !== null && value !== void 0 ? value : "").replace(/\D/g, "");
    if (!digits)
        return "—";
    const local = digits.startsWith("258") ? digits.slice(3) : digits;
    if (local.length < 8)
        return `+258 ${local}`;
    return `+258 ${[local.slice(0, 2), local.slice(2, 5), local.slice(5)].filter(Boolean).join(" ")}`;
};
/** Data de emissão congelada no momento em que o recibo é criado. */
const diaDaEmissao = (recibo) => (0, moment_1.default)((recibo === null || recibo === void 0 ? void 0 : recibo.created_at) || (recibo === null || recibo === void 0 ? void 0 : recibo.createdAt) || undefined).isValid()
    ? (0, moment_1.default)((recibo === null || recibo === void 0 ? void 0 : recibo.created_at) || (recibo === null || recibo === void 0 ? void 0 : recibo.createdAt)).format("DD/MM/YYYY")
    : (0, moment_1.default)().format("DD/MM/YYYY");
const docsDir = () => path_1.default.join(process.cwd(), "uploads", "docs");
const qrDir = (companyId, ano) => path_1.default.join(process.cwd(), "uploads", "recibos", String(companyId), String(ano));
/** Software certificado gravado em cada recibo (referência da certificação AT). */
exports.SOFTWARE_CERTIFICATION = "MBRM v2.0 Cert AT 2026/001";
/**
 * Métodos de pagamento gravados pelo sistema em dois formatos: o código legado
 * (1..8) e o código da tesouraria (CASH/BANK/MPESA/EMOLA). Alguns ecrãs gravam
 * o **id da conta** (accounts.id) — por isso o rótulo é resolvido primeiro na
 * tabela de contas e só depois nos códigos legados.
 */
const LEGACY_METHOD_LABELS = {
    "1": "Numerário",
    "2": "Cheque",
    "3": "Transferência bancária",
    "4": "Depósito bancário",
    "5": "TPA",
    "6": "e-Mola",
    "7": "M-Pesa",
    "8": "e-Mola",
    CASH: "Numerário",
    BANK: "Transferência bancária",
    MPESA: "M-Pesa",
    EMOLA: "e-Mola",
};
const PURPOSE_LABELS = {
    DESEMBOLSO: "conta de desembolso",
    REEMBOLSO: "conta de reembolso",
    RESERVA: "conta de reserva",
    MISTO: "conta mista",
};
/**
 * Devolve o rótulo legível e a descrição completa do método de pagamento.
 * Ex.: código `10` (conta Moza Banco) → "Moza Banco · conta de reembolso".
 */
/**
 * Traduz o código/número de método de pagamento para texto legível (conta
 * bancária com finalidade, códigos legados da tesouraria). Exportado para que a
 * página de detalhe do crédito mostre o mesmo rótulo que sai no recibo.
 */
const resolvePaymentMethod = (value, companyId) => __awaiter(void 0, void 0, void 0, function* () {
    if (value === null || value === undefined || value === "") {
        return { label: "—", description: "Não indicado" };
    }
    const raw = String(value).trim();
    // 1) Pode ser o id de uma conta (é assim que alguns ecrãs gravam o método).
    const asId = Number(raw);
    if (Number.isFinite(asId) && asId > 0) {
        try {
            const account = (yield AccountModel_1.AccountModel.findOne({
                where: { id: asId, companyId },
                raw: true,
            }));
            if (account) {
                const banco = String(account.bank_name || account.accountDescription || `Conta ${asId}`);
                const tipo = PURPOSE_LABELS[String(account.purpose)] || String(account.purpose || "").toLowerCase();
                const numero = account.accountNumber ? ` · ${account.accountNumber}` : "";
                return {
                    label: banco,
                    description: `${banco}${numero}${tipo ? ` · ${tipo}` : ""}`,
                };
            }
        }
        catch (_a) {
            /* tabela de contas indisponível — segue para os códigos legados */
        }
    }
    // 2) Códigos legados / da tesouraria.
    const legacy = LEGACY_METHOD_LABELS[raw.toUpperCase()];
    if (legacy)
        return { label: legacy, description: legacy };
    // 3) Contas pelo nome (ex.: "MPESA", "BANK" já tratados acima).
    return { label: raw, description: raw };
});
exports.resolvePaymentMethod = resolvePaymentMethod;
// ─────────────────────────────────────────────────────────────────────────────
// SELO ELECTRÓNICO (HASH + QR CODE)
// ─────────────────────────────────────────────────────────────────────────────
/** Chave privada da empresa usada no hash — nunca vai para o documento. */
const hashSecret = () => String(process.env.RECIBO_HASH_SECRET || process.env.APP_SECRET || "MBRM-RECIBO-AT-2026");
/** SHA-256 dos dados do recibo + segredo da empresa (não reversível). */
const buildReciboHash = (input) => {
    var _a, _b, _c;
    const payload = [
        String(input.companyNuit || ""),
        String(input.companyId),
        input.numero,
        String(input.ano),
        String(input.sequencia),
        String((_a = input.loanId) !== null && _a !== void 0 ? _a : ""),
        String((_b = input.customerId) !== null && _b !== void 0 ? _b : ""),
        String((_c = input.tranzactionId) !== null && _c !== void 0 ? _c : ""),
        Number(input.valorPago || 0).toFixed(2),
        input.dataISO,
        hashSecret(),
    ].join("|");
    return crypto_1.default.createHash("sha256").update(payload, "utf8").digest("hex");
};
exports.buildReciboHash = buildReciboHash;
/** URL pública de validação (a mesma que o QR Code abre). */
const validationUrl = (params) => {
    const base = process.env.PUBLIC_VALIDATION_URL
        || process.env.PUBLIC_BASE_URL
        || "https://maismola.co.mz";
    const clean = String(base).replace(/\/+$/, "");
    return `${clean}/validar?rec=${encodeURIComponent(params.numero)}&hash=${encodeURIComponent(params.hash)}`;
};
exports.validationUrl = validationUrl;
/** Conteúdo do QR Code: identificação legível + URL de validação. */
const buildQrContent = (params) => [
    "MBRM",
    params.nuit,
    params.numero,
    params.data,
    fmtNumber(params.valor),
    params.hash,
    params.url,
].join("*");
exports.buildQrContent = buildQrContent;
/**
 * Garante que o recibo tem o selo electrónico (hash, código de validação,
 * conteúdo e PNG do QR Code). Idempotente: se já tiver hash, devolve como está
 * — o selo é calculado uma única vez, no momento da emissão.
 *
 * NOTA (feature flag AT): o selo é calculado e gravado na BD SEMPRE — mesmo
 * com AT_CERTIFICADO_ENABLED=false. A flag controla apenas se os elementos
 * aparecem no PDF (ver renderReciboPdf) — quando a licença chegar, os recibos
 * passam a mostrá-los sem regenerar nada no banco de dados.
 */
const ensureReciboSeal = (reciboId, force = false, transaction) => __awaiter(void 0, void 0, void 0, function* () {
    const recibo = (yield ReciboModel_1.ReciboModel.findByPk(reciboId, Object.assign({ raw: true }, (transaction ? { transaction } : {}))));
    if (!recibo)
        return null;
    const faltaSelo = !recibo.hash_at || !recibo.qr_code_url;
    const faltaMetodo = !recibo.metodo_pagamento_desc && !!recibo.tranzactionId;
    if (!force && !faltaSelo && !faltaMetodo)
        return recibo;
    const companyId = Number(recibo.companyId);
    const empresa = (yield CompanyModel_1.CompanyModel.findByPk(companyId, { raw: true })) || {};
    const dataEmissao = recibo.created_at || recibo.createdAt || new Date();
    const momentoEmissao = toMoment(dataEmissao);
    const dataEmissaoIso = momentoEmissao.isValid() ? momentoEmissao.toISOString() : new Date().toISOString();
    const hash = (0, exports.buildReciboHash)({
        companyId,
        companyNuit: empresa.companyNuit,
        numero: String(recibo.numero),
        ano: Number(recibo.ano),
        sequencia: Number(recibo.sequencia),
        loanId: recibo.loanId,
        customerId: recibo.customerId,
        tranzactionId: recibo.tranzactionId,
        valorPago: Number(recibo.valor_pago),
        dataISO: dataEmissaoIso,
    });
    // Recibos antigos guardaram o método como código/id de conta (ex.: "10"):
    // resolve-se agora para texto legível, uma única vez.
    let metodoLabel = null;
    let metodoDesc = null;
    if (!recibo.metodo_pagamento_desc && recibo.tranzactionId) {
        try {
            const tx = (yield TranzactionModel_1.TranzactionModel.findByPk(Number(recibo.tranzactionId), { raw: true }));
            if (tx) {
                const metodo = yield (0, exports.resolvePaymentMethod)(tx.paymentMethod, companyId);
                metodoLabel = metodo.label;
                metodoDesc = metodo.description;
            }
        }
        catch ( /* pagamento removido — mantém-se o valor gravado */_b) { /* pagamento removido — mantém-se o valor gravado */ }
    }
    const atCode = `AT-${recibo.ano}-${String(recibo.sequencia).padStart(5, "0")}`;
    const url = (0, exports.validationUrl)({ numero: String(recibo.numero), hash });
    const qrContent = (0, exports.buildQrContent)({
        nuit: String(empresa.companyNuit || ""),
        numero: String(recibo.numero),
        data: momentoEmissao.isValid() ? momentoEmissao.format("DD/MM/YYYY") : fmtDate(dataEmissao),
        valor: Number(recibo.valor_pago),
        hash,
        url,
    });
    // PNG do QR Code — guardado por empresa/ano (o PDF apenas o embute).
    let qrPublicUrl = null;
    try {
        const dir = qrDir(companyId, Number(recibo.ano));
        yield fs_1.default.promises.mkdir(dir, { recursive: true });
        const fileName = `QR-${String(recibo.numero).replace(/[^A-Za-z0-9-]/g, "")}.png`;
        const filePath = path_1.default.join(dir, fileName);
        yield qrcode_1.default.toFile(filePath, qrContent, { width: 600, margin: 1, errorCorrectionLevel: "M" });
        qrPublicUrl = `/recibos/${companyId}/${recibo.ano}/${fileName}`;
    }
    catch (error) {
        console.error("[Recibo] Falha ao gerar o QR Code:", (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    yield ReciboModel_1.ReciboModel.update(Object.assign(Object.assign({ hash_at: hash, qr_content: qrContent, qr_code_url: qrPublicUrl, at_validation_code: atCode, software_certification: exports.SOFTWARE_CERTIFICATION }, (metodoLabel ? { metodo_pagamento: metodoLabel } : {})), (metodoDesc ? { metodo_pagamento_desc: metodoDesc } : {})), Object.assign({ where: { id: reciboId } }, (transaction ? { transaction } : {})));
    return (yield ReciboModel_1.ReciboModel.findByPk(reciboId, Object.assign({ raw: true }, (transaction ? { transaction } : {}))));
});
exports.ensureReciboSeal = ensureReciboSeal;
/** Recibo pelo hash ou pelo número (utilizado pela validação pública do QR). */
const findReciboForValidation = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const where = {};
    if (params.hash)
        where.hash_at = String(params.hash).trim().toLowerCase();
    if (params.numero)
        where.numero = String(params.numero).trim();
    if (Object.keys(where).length === 0)
        return null;
    return (yield ReciboModel_1.ReciboModel.findOne({ where, raw: true }));
});
exports.findReciboForValidation = findReciboForValidation;
/** GETTER tolerante a instâncias Sequelize e a objectos simples. */
const pick = (row, key) => {
    if (!row)
        return undefined;
    return typeof row.getDataValue === "function" ? row.getDataValue(key) : row[key];
};
/**
 * Reserva o próximo número da série, dentro de uma transacção.
 * Se a transacção fizer rollback, o incremento desaparece com ela — a
 * numeração legal mantém-se contínua.
 */
const reserveSequence = (transaction, companyId, ano, serie = "REC") => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d;
    const [rows] = yield db_1.db.query("SELECT ultima_sequencia FROM recibos_sequencia WHERE companyId = ? AND ano = ? FOR UPDATE", { replacements: [companyId, ano], transaction });
    let ultima = Number((_c = rows[0]) === null || _c === void 0 ? void 0 : _c.ultima_sequencia);
    if (!Number.isFinite(ultima)) {
        // Primeira vez neste ano: cria o contador a zero de forma atómica.
        try {
            yield db_1.db.query("INSERT INTO recibos_sequencia (companyId, ano, ultima_sequencia) VALUES (?, ?, 0)", { replacements: [companyId, ano], transaction });
            ultima = 0;
        }
        catch (error) {
            // Corrida entre dois pedidos: relê o valor já criado pelo outro.
            const [again] = yield db_1.db.query("SELECT ultima_sequencia FROM recibos_sequencia WHERE companyId = ? AND ano = ? FOR UPDATE", { replacements: [companyId, ano], transaction });
            ultima = Number((_d = again[0]) === null || _d === void 0 ? void 0 : _d.ultima_sequencia);
            if (!Number.isFinite(ultima))
                throw error;
        }
    }
    const sequencia = ultima + 1;
    yield db_1.db.query("UPDATE recibos_sequencia SET ultima_sequencia = ? WHERE companyId = ? AND ano = ?", { replacements: [sequencia, companyId, ano], transaction });
    return {
        sequencia,
        numero: `${serie}-${ano}-${String(sequencia).padStart(5, "0")}`,
    };
});
/** Lê um recibo com todo o contexto necessário para o PDF/extrato. */
const getReciboDetalhe = (id, transaction) => __awaiter(void 0, void 0, void 0, function* () {
    const recibo = yield ReciboModel_1.ReciboModel.findByPk(id, Object.assign({ raw: true }, (transaction ? { transaction } : {})));
    if (!recibo)
        return null;
    const companyId = Number(recibo.companyId);
    const empresa = (yield CompanyModel_1.CompanyModel.findByPk(companyId, Object.assign({ raw: true }, (transaction ? { transaction } : {})))) || {};
    const cliente = recibo.customerId
        ? (yield CustomerModel_1.CustomerModel.findByPk(Number(recibo.customerId), Object.assign({ raw: true }, (transaction ? { transaction } : {})))) || {}
        : {};
    const credito = recibo.loanId
        ? (yield LoanModel_1.LoanModel.findByPk(Number(recibo.loanId), Object.assign({ raw: true }, (transaction ? { transaction } : {})))) || {}
        : {};
    const carteira = recibo.walletId
        ? (yield FinancingWalletModel_1.FinancingWalletModel.findByPk(Number(recibo.walletId), Object.assign({ raw: true }, (transaction ? { transaction } : {})))) || {}
        : {};
    let prestacoesPendentes = [];
    if (recibo.loanId) {
        prestacoesPendentes = (yield AmortizationLoanModel_1.AmorizationLoanModel.findAll(Object.assign({ where: { loanId: Number(recibo.loanId), status: { [sequelize_1.Op.in]: [0, -1] } }, order: [["dueDate", "ASC"], ["id", "ASC"]], raw: true }, (transaction ? { transaction } : {}))));
    }
    return { recibo, empresa, cliente, credito, carteira, prestacoesPendentes };
});
exports.getReciboDetalhe = getReciboDetalhe;
/**
 * Gera o recibo de um pagamento (idempotente: um recibo por tranzaction).
 * Devolve o registo criado/reutilizado, já com o selo electrónico.
 */
const generateReciboForTranzaction = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { tranzactionId, companyId } = params;
    const existing = yield ReciboModel_1.ReciboModel.findOne({
        where: { tranzactionId, companyId },
        raw: true,
    });
    if (existing)
        return (0, exports.ensureReciboSeal)(Number(existing.id)) || existing;
    const tranzaction = yield TranzactionModel_1.TranzactionModel.findByPk(tranzactionId, { raw: true });
    if (!tranzaction)
        throw new Error("Pagamento não encontrado para emissão do recibo.");
    if (Number(tranzaction.companyId) !== Number(companyId)) {
        throw new Error("Pagamento não pertence a esta empresa.");
    }
    const loan = tranzaction.loanId
        ? (yield LoanModel_1.LoanModel.findByPk(Number(tranzaction.loanId), { raw: true })) || {}
        : {};
    const customer = tranzaction.customerId
        ? (yield CustomerModel_1.CustomerModel.findByPk(Number(tranzaction.customerId), { raw: true })) || {}
        : {};
    // A carteira vem do pagamento (tranzactions.walletId); só se este não a tiver
    // é que se usa a do crédito. Assim o recibo nunca perde a origem do capital.
    const effectiveWalletId = Number(tranzaction.walletId) || Number(loan.walletId) || null;
    const wallet = effectiveWalletId
        ? (yield FinancingWalletModel_1.FinancingWalletModel.findByPk(Number(effectiveWalletId), { raw: true })) || {}
        : {};
    // Decomposição do pagamento: capital vs. juros vs. mora.
    const valorPago = round2(Number(tranzaction.amount) || 0);
    const valorJuros = round2(Number(tranzaction.interestRateAmount) || 0);
    const valorMora = round2(Number(tranzaction.mora_amount) || Number(tranzaction.latePaymentInterest) || 0);
    const valorDesconto = round2(Number(tranzaction.discountAmount) || 0);
    const valorCapital = round2(Math.max(0, valorPago - valorJuros));
    // Saldo devedor do crédito após este pagamento (todas as prestações abertas).
    let saldoRestante = 0;
    if (tranzaction.loanId) {
        const pendentes = (yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: Number(tranzaction.loanId), status: { [sequelize_1.Op.in]: [0, -1] } },
            attributes: ["installment", "paidAmount"],
            raw: true,
        }));
        saldoRestante = round2(pendentes.reduce((total, item) => total + Math.max(0, Number(item.installment) - Number(item.paidAmount || 0)), 0));
    }
    // Método de pagamento legível (resolve contas/hidden ids e códigos legados).
    const metodo = yield (0, exports.resolvePaymentMethod)(tranzaction.paymentMethod, Number(companyId));
    const ano = Number((0, moment_1.default)(tranzaction.paymentDate || undefined).year()) || new Date().getFullYear();
    const serie = "REC";
    const recibo = yield db_1.db.transaction((transaction) => __awaiter(void 0, void 0, void 0, function* () {
        var _e;
        const { sequencia, numero } = yield reserveSequence(transaction, Number(companyId), ano, serie);
        const created = yield ReciboModel_1.ReciboModel.create({
            companyId: Number(companyId),
            numero,
            serie,
            sequencia,
            ano,
            tranzactionId: Number(tranzactionId),
            loanId: tranzaction.loanId ? Number(tranzaction.loanId) : null,
            customerId: tranzaction.customerId ? Number(tranzaction.customerId) : null,
            walletId: effectiveWalletId,
            customer_name: customer.customerName || null,
            customer_nuit: customer.customerNuit || null,
            customer_account: tranzaction.accountNumber ? String(tranzaction.accountNumber) : null,
            wallet_nome: wallet.nome || null,
            metodo_pagamento: metodo.label,
            metodo_pagamento_desc: metodo.description,
            referencia: tranzaction.tranzactionReference || null,
            valor_pago: valorPago,
            valor_capital: valorCapital,
            valor_juros: valorJuros,
            valor_mora: valorMora,
            valor_desconto: valorDesconto,
            saldo_restante: saldoRestante,
            created_by: (_e = params.createdBy) !== null && _e !== void 0 ? _e : null,
        }, { transaction });
        return created;
    }));
    // Selo + PDF: gerados fora da transacção (o número já está reservado e gravado).
    const reciboId = Number(pick(recibo, "id"));
    try {
        yield (0, exports.ensureReciboSeal)(reciboId);
        const pdfUrl = yield (0, exports.renderReciboPdf)(reciboId);
        if (pdfUrl) {
            yield ReciboModel_1.ReciboModel.update({ pdf_url: pdfUrl }, { where: { id: reciboId } });
        }
    }
    catch (error) {
        console.error("[Recibo] Falha ao gerar o selo/PDF:", (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    return (yield ReciboModel_1.ReciboModel.findByPk(reciboId, { raw: true })) || recibo;
});
exports.generateReciboForTranzaction = generateReciboForTranzaction;
/**
 * Emite o recibo legal do pagamento DENTRO da transaction indicada.
 * Chamado por addTranzaction com a transaction `t` do pagamento.
 * Lança em qualquer falha → rollback total do pagamento.
 */
const emitReciboInTransaction = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _f, _g;
    const { tranzactionId, companyId, transaction } = params;
    // Idempotência: um recibo por tranzaction (mesmo dentro da transaction).
    const existing = yield ReciboModel_1.ReciboModel.findOne({
        where: { tranzactionId, companyId },
        transaction,
    });
    if (existing) {
        const selado = yield (0, exports.ensureReciboSeal)(Number(existing.getDataValue("id")), false, transaction);
        return {
            id: Number(existing.getDataValue("id")),
            numero: String(existing.getDataValue("numero")),
            hash: String((selado === null || selado === void 0 ? void 0 : selado.hash_at) || existing.getDataValue("hash_at") || ""),
            pdf_url: String(existing.getDataValue("pdf_url") || ""),
            qr_url: existing.getDataValue("qr_code_url") || null,
            at_validation_code: existing.getDataValue("at_validation_code") || null,
        };
    }
    // A tranzaction foi criada NA MESMA transaction do pagamento — a leitura
    // tem de usar essa conexão (sem isto, findByPk noutra conexão devolveria
    // null para a linha ainda não committada).
    const tranzaction = yield TranzactionModel_1.TranzactionModel.findByPk(tranzactionId, { raw: true, transaction });
    if (!tranzaction)
        throw new Error("Pagamento não encontrado para emissão do recibo.");
    if (Number(tranzaction.companyId) !== Number(companyId)) {
        throw new Error("Pagamento não pertence a esta empresa.");
    }
    const loan = tranzaction.loanId
        ? (yield LoanModel_1.LoanModel.findByPk(Number(tranzaction.loanId), { raw: true })) || {}
        : {};
    const customer = tranzaction.customerId
        ? (yield CustomerModel_1.CustomerModel.findByPk(Number(tranzaction.customerId), { raw: true })) || {}
        : {};
    const effectiveWalletId = Number(tranzaction.walletId) || Number(loan.walletId) || null;
    const wallet = effectiveWalletId
        ? (yield FinancingWalletModel_1.FinancingWalletModel.findByPk(Number(effectiveWalletId), { raw: true })) || {}
        : {};
    const valorPago = round2(Number(tranzaction.amount) || 0);
    const valorJuros = round2(Number(tranzaction.interestRateAmount) || 0);
    const valorMora = round2(Number(tranzaction.mora_amount) || Number(tranzaction.latePaymentInterest) || 0);
    const valorDesconto = round2(Number(tranzaction.discountAmount) || 0);
    const valorCapital = round2(Math.max(0, valorPago - valorJuros));
    let saldoRestante = 0;
    if (tranzaction.loanId) {
        const pendentes = (yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: Number(tranzaction.loanId), status: { [sequelize_1.Op.in]: [0, -1] } },
            attributes: ["installment", "paidAmount"],
            raw: true,
            transaction,
        }));
        saldoRestante = round2(pendentes.reduce((total, item) => total + Math.max(0, Number(item.installment) - Number(item.paidAmount || 0)), 0));
    }
    const metodo = yield (0, exports.resolvePaymentMethod)(tranzaction.paymentMethod, Number(companyId));
    const ano = Number((0, moment_1.default)(tranzaction.paymentDate || undefined).year()) || new Date().getFullYear();
    const serie = "REC";
    // 1) Número sequencial legal — FOR UPDATE dentro da MESMA transaction.
    const { sequencia, numero } = yield reserveSequence(transaction, Number(companyId), ano, serie);
    // 2) Registo do recibo (ainda sem hash/pdf — entram em seguida).
    const created = yield ReciboModel_1.ReciboModel.create({
        companyId: Number(companyId),
        numero,
        serie,
        sequencia,
        ano,
        tranzactionId: Number(tranzactionId),
        loanId: tranzaction.loanId ? Number(tranzaction.loanId) : null,
        customerId: tranzaction.customerId ? Number(tranzaction.customerId) : null,
        walletId: effectiveWalletId,
        customer_name: customer.customerName || null,
        customer_nuit: customer.customerNuit || null,
        customer_account: tranzaction.accountNumber ? String(tranzaction.accountNumber) : null,
        wallet_nome: wallet.nome || null,
        metodo_pagamento: metodo.label,
        metodo_pagamento_desc: metodo.description,
        referencia: tranzaction.tranzactionReference || null,
        valor_pago: valorPago,
        valor_capital: valorCapital,
        valor_juros: valorJuros,
        valor_mora: valorMora,
        valor_desconto: valorDesconto,
        saldo_restante: saldoRestante,
        created_by: (_f = params.createdBy) !== null && _f !== void 0 ? _f : null,
        status: "EMITIDO",
    }, { transaction });
    const reciboId = Number(created.getDataValue("id"));
    // 3) Selo electrónico (hash + QR + código AT) — na mesma transaction.
    const selado = yield (0, exports.ensureReciboSeal)(reciboId, false, transaction);
    // 4) PDF (pdfkit) — na mesma transaction. Falha → rollback do pagamento.
    const pdfUrl = yield (0, exports.renderReciboPdf)(reciboId, { transaction });
    if (!pdfUrl)
        throw new Error("Falha ao gerar o PDF do recibo.");
    yield ReciboModel_1.ReciboModel.update({ pdf_url: pdfUrl }, { where: { id: reciboId }, transaction });
    // 5) Auditoria da emissão (userId + ip do pedido) — mesma transaction.
    try {
        yield paymentsV2Models_1.AuditLogModel.create({
            user_id: (_g = params.createdBy) !== null && _g !== void 0 ? _g : null,
            company_id: Number(companyId),
            ip: params.ip || null,
            action: "RECIBO_EMIT",
            entity: "recibos",
            entity_id: reciboId,
            before_data: null,
            after_data: {
                numero,
                tranzactionId,
                valor: valorPago,
                hash: String((selado === null || selado === void 0 ? void 0 : selado.hash_at) || ""),
                pdf_url: pdfUrl,
            },
        }, { transaction });
    }
    catch ( /* audit nunca bloqueia o recibo */_h) { /* audit nunca bloqueia o recibo */ }
    return {
        id: reciboId,
        numero,
        hash: String((selado === null || selado === void 0 ? void 0 : selado.hash_at) || ""),
        pdf_url: pdfUrl,
        qr_url: (selado === null || selado === void 0 ? void 0 : selado.qr_code_url) || null,
        at_validation_code: (selado === null || selado === void 0 ? void 0 : selado.at_validation_code) || null,
    };
});
exports.emitReciboInTransaction = emitReciboInTransaction;
/** Recibos de um crédito (mais recentes primeiro). */
const listRecibosByLoan = (companyId, loanId) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield ReciboModel_1.ReciboModel.findAll({
        where: { companyId, loanId },
        order: [["id", "DESC"]],
        raw: true,
    }));
});
exports.listRecibosByLoan = listRecibosByLoan;
/** Recibos de uma carteira analítica (portal do financiador). */
const listRecibosByWallet = (companyId, walletId) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield ReciboModel_1.ReciboModel.findAll({
        where: { companyId, walletId },
        order: [["id", "DESC"]],
        raw: true,
    }));
});
exports.listRecibosByWallet = listRecibosByWallet;
/** Recibos de um cliente. */
const listRecibosByCustomer = (companyId, customerId) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield ReciboModel_1.ReciboModel.findAll({
        where: { companyId, customerId },
        order: [["id", "DESC"]],
        raw: true,
    }));
});
exports.listRecibosByCustomer = listRecibosByCustomer;
// ─────────────────────────────────────────────────────────────────────────────
// PDF — LAYOUT MODERNO (COMPLIANCE AT)
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = {
    primary: "#0f6b2f",
    primaryDark: "#1a3c2a",
    light: "#eef6f0",
    lime: "#f1f8e9",
    border: "#e0e0e0",
    orange: "#ef6c00",
    red: "#c62828",
    amber: "#b45309",
    grey: "#757575",
    dark: "#1f2937",
    zebra: "#f7faf8",
};
/** Cor da badge de cada carteira de financiamento. */
const WALLET_COLORS = {
    blue: "#2563eb",
    orange: "#f97316",
    "deep-orange": "#ea580c",
    green: "#16a34a",
    grey: "#64748b",
    purple: "#7c3aed",
    teal: "#0d9488",
    brown: "#92400e",
    pink: "#db2777",
    cyan: "#0891b2",
};
/** Iniciais do mutuário para o avatar do recibo (ex.: "Kanyacudie Ozias Uau" → "KO"). */
const initialsOf = (name) => String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => { var _a; return ((_a = part[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || ""; })
    .join("") || "MB";
/** Caminho local do logotipo da empresa (companies.companyLogo → uploads/...). */
const companyLogoPath = (logo) => {
    if (!logo)
        return null;
    const fileName = path_1.default.basename(String(logo));
    const candidates = [
        path_1.default.join(process.cwd(), "uploads", "img", fileName),
        path_1.default.join(process.cwd(), "uploads", "documents", fileName),
        path_1.default.join(process.cwd(), "uploads", fileName),
    ];
    return candidates.find((candidate) => fs_1.default.existsSync(candidate)) || null;
};
/**
 * Desenha o PDF do recibo (pdfkit) e devolve o caminho público do ficheiro.
 * Layout moderno: cabeçalho com logotipo + QR Code, faixa de identificação,
 * três cartões (mutuário, crédito/carteira, pagamento), extrato das prestações
 * pendentes e rodapé legal com hash e assinaturas.
 */
const renderReciboPdf = (reciboId, 
// `compress: false` gera um PDF inspeccionável (usado na verificação do
// layout); em produção o PDF vai comprimido, como até aqui.
// `transaction` quando o PDF é gerado DENTRO da transacção do pagamento —
// o recibo ainda não foi committado, por isso as leituras têm de usar a
// MESMA conexão (senão findByPk noutra conexão devolveria null).
options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const tx = options.transaction || null;
    const selado = yield (0, exports.ensureReciboSeal)(reciboId, false, tx);
    const detalhe = yield (0, exports.getReciboDetalhe)(reciboId, tx);
    if (!detalhe)
        return null;
    const { recibo, empresa, cliente, credito, carteira, prestacoesPendentes } = detalhe;
    if (!recibo)
        return null;
    const companyId = Number(recibo.companyId);
    const outDir = docsDir();
    yield fs_1.default.promises.mkdir(outDir, { recursive: true });
    // Sufixo de revisão do layout (`-r2`): ao mudar o desenho do recibo, os
    // pdf_url gravados na BD deixam de apontar para ficheiros existentes — assim
    // TODOS os recibos já emitidos são regenerados UMA vez com o layout actual
    // (na primeira descarga ou no job de arranque), sem consumir numeração.
    const fileName = options.compress === false
        ? `verificacao-recibo-${String(recibo.numero).replace(/[^A-Za-z0-9-]/g, "")}.pdf`
        : `recibo-${String(recibo.numero).replace(/[^A-Za-z0-9-]/g, "")}-r2.pdf`;
    const outPath = path_1.default.join(outDir, fileName);
    const doc = new pdfkit_1.default({
        margin: 40,
        size: "A4",
        bufferPages: true,
        compress: options.compress !== false,
    });
    const stream = fs_1.default.createWriteStream(outPath);
    doc.pipe(stream);
    const left = doc.page.margins.left;
    const pageWidth = doc.page.width - left - doc.page.margins.right;
    const right = left + pageWidth;
    const hash = String((selado === null || selado === void 0 ? void 0 : selado.hash_at) || recibo.hash_at || "");
    const atCode = String((selado === null || selado === void 0 ? void 0 : selado.at_validation_code) || recibo.at_validation_code || "—");
    const cert = String((selado === null || selado === void 0 ? void 0 : selado.software_certification) || recibo.software_certification || exports.SOFTWARE_CERTIFICATION);
    const url = hash ? (0, exports.validationUrl)({ numero: String(recibo.numero), hash }) : "";
    // TODO AT: Ativar quando tiver Certificado AT 2026/001
    // O selo (hash, código, QR, link) é SEMPRE calculado e gravado na BD — a flag
    // controla apenas se APARECE no PDF apresentado ao mutuário.
    const mostrarSelo = certificacao_1.AT_CERTIFICADO_ENABLED;
    /** Marca de água diagonal — repetida em cada página (bem clara, não estorva a leitura). */
    const marcaDeAgua = () => {
        doc.save();
        doc.opacity(0.03).fillColor(COLORS.primary).fontSize(70).font("Helvetica-Bold");
        doc.rotate(-32, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.text(String(empresa.companyName || "Mais Mola").toUpperCase(), 60, doc.page.height / 2 - 40, {
            width: doc.page.width - 120,
            align: "center",
            lineBreak: false,
        });
        doc.restore();
    };
    const emissao = recibo.created_at || recibo.createdAt;
    const nomeCliente = String(recibo.customer_name || cliente.customerName || "—");
    // Geometria de página: a tabela de prestações nunca passa por cima do rodapé
    // — quando o espaço acaba abre-se página nova (ver paginação mais abaixo).
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    // O pdfkit abre uma página nova quando a linha SEGUINTE já não cabe, mesmo
    // depois de a última linha ter sido escrita — por isso o rodapé fica afastado
    // do limite (senão o recibo ganhava páginas em branco no fim).
    const contentBottom = pageBottom - 38; // reserva da faixa de rodapé fixa (2 linhas)
    const footerY = pageBottom - 22;
    /**
     * Nova página do recibo. Nas páginas de continuação repete-se a identificação
     * legal (mini logo + número do recibo + mutuário) — a página 2 nunca é
     * "órfã": identifica o documento mesmo destacada do resto.
     */
    const newPage = (continuacao) => {
        doc.addPage();
        marcaDeAgua();
        if (continuacao) {
            let miniX = left;
            const miniLogo = logoPath;
            if (miniLogo) {
                try {
                    doc.image(miniLogo, left, 40, { fit: [26, 26] });
                    miniX = left + 32;
                }
                catch ( /* logotipo inválido — segue sem imagem */_a) { /* logotipo inválido — segue sem imagem */ }
            }
            doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(9).text(`RECIBO DE PAGAMENTO N.º ${recibo.numero} — continuação`, miniX, 40, { width: pageWidth - (miniX - left), lineBreak: false });
            doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7.5).text(`${nomeCliente} · NUIT ${recibo.customer_nuit || cliente.customerNuit || "—"}`, miniX, 53, { width: pageWidth - (miniX - left), lineBreak: false });
            y = 70;
        }
        else {
            y = 56;
        }
    };
    // ── Cabeçalho: emitente (+ QR Code quando há selo AT) ──
    // Sem selo AT o cabeçalho é mais compacto (110pt em vez de 128) — ganha-se
    // espaço para a tabela do extrato na página 1.
    const headerH = mostrarSelo ? 128 : 110;
    marcaDeAgua();
    doc.roundedRect(left, 40, pageWidth, headerH, 10).fill(COLORS.lime);
    const logoPath = companyLogoPath(empresa.companyLogo);
    let textLeft = left + 14;
    if (logoPath) {
        try {
            doc.image(logoPath, textLeft, 56, { fit: [70, 58] });
            textLeft += 80;
        }
        catch ( /* logotipo inválido — segue sem imagem */_j) { /* logotipo inválido — segue sem imagem */ }
    }
    // TODO AT: Com o selo activo, um ficheiro nomeado "qr" em uploads/img é
    // embutido no PDF. Sem selo AT, um PNG transparente "mbr-mark.png" nessa
    // pasta aparece como marca d'água leve no canto superior direito (sem QR).
    // Sem selo AT, o texto do cabeçalho ocupa toda a largura (não há QR à direita).
    const textWidth = pageWidth - (textLeft - left) - (mostrarSelo ? 132 : 14);
    doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(15);
    doc.text(String(empresa.companyName || "Instituição de Microcrédito"), textLeft, 62, { width: textWidth });
    doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.dark);
    doc.text(`NUIT: ${empresa.companyNuit || "—"}`, textLeft, 84, { width: textWidth });
    doc.fillColor(COLORS.grey);
    doc.text(String(empresa.companyAddress || ""), textLeft, 96, { width: textWidth });
    doc.text(`Tel.: ${empresa.companyPhone || "—"}  ·  E-mail: ${empresa.companyEmail || "—"}`, textLeft, 108, { width: textWidth });
    doc.text(String(empresa.companyWebsite || "").replace(/^https?:\/\//, ""), textLeft, 120, { width: textWidth });
    // Marca d'água leve no canto superior direito (substitui o QR quando a
    // certificação AT está desligada).
    if (!mostrarSelo) {
        const markPath = path_1.default.join(process.cwd(), "uploads", "img", "mbr-mark.png");
        if (fs_1.default.existsSync(markPath)) {
            try {
                doc.opacity(0.1).image(markPath, right - 78, 48, { width: 66, height: 66 });
                doc.opacity(1);
            }
            catch ( /* marca opcional — segue sem ela */_k) { /* marca opcional — segue sem ela */ }
        }
    }
    // ── QR Code de validação ──
    // TODO AT: Ativar quando tiver Certificado AT 2026/001 — o QR é gerado e
    // gravado em uploads/recibos sempre, mas só é impresso com a flag AT activa.
    if (mostrarSelo) {
        // QR maior, com moldura branca para leitura fiável em papel.
        const qrSize = 110;
        const qrX = right - qrSize - 12;
        const qrY = 46;
        const qrPath = (selado === null || selado === void 0 ? void 0 : selado.qr_code_url)
            ? path_1.default.join(process.cwd(), "uploads", String(selado.qr_code_url).replace(/^\//, ""))
            : null;
        doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10).fill("#ffffff");
        if (qrPath && fs_1.default.existsSync(qrPath)) {
            try {
                doc.image(qrPath, qrX, qrY, { width: qrSize, height: qrSize });
            }
            catch ( /* segue sem QR */_l) { /* segue sem QR */ }
        }
        else {
            doc.rect(qrX, qrY, qrSize, qrSize).fill(COLORS.border);
            doc.fillColor(COLORS.grey).fontSize(7).text("QR indisponível", qrX, qrY + qrSize / 2 - 4, {
                width: qrSize,
                align: "center",
            });
        }
        doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text("Valide por QR Code", qrX - 8, qrY + qrSize + 3, {
            width: qrSize + 16,
            align: "center",
            lineBreak: false,
        });
    }
    // ── Faixa de título ──
    const titleY = mostrarSelo ? 176 : 158;
    doc.roundedRect(left, titleY, pageWidth, 46, 8).fill(COLORS.primary);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(15);
    doc.text("RECIBO DE PAGAMENTO", left + 14, titleY + 9, { width: pageWidth * 0.5, lineBreak: false });
    doc.fontSize(12).text(`N.º ${recibo.numero}`, left, titleY + 9, {
        width: pageWidth - 14,
        align: "right",
        lineBreak: false,
    });
    doc.font("Helvetica").fontSize(8.5);
    doc.text(`Data de emissão: ${fmtDateTimeMaputo(emissao)}`, left + 14, titleY + 28, {
        width: pageWidth * 0.7,
        lineBreak: false,
    });
    // ── Faixa do selo electrónico ──
    // TODO AT: Ativar quando tiver Certificado AT 2026/001 — hash, código de
    // validação e link de validação ficam gravados na BD mas só são impressos
    // quando AT_CERTIFICADO_ENABLED=true.
    let sealY = titleY + 54;
    if (mostrarSelo) {
        // A hash SHA-256 tem 64 caracteres: é impressa em DUAS linhas de 32, com a
        // etiqueta alinhada ao bloco — assim nunca é cortada nem empurra as restantes
        // linhas da faixa (era o defeito do layout anterior).
        const sealH = 54;
        doc.roundedRect(left, sealY, pageWidth, sealH, 8).fillAndStroke(COLORS.light, "#c8e6c9");
        doc.strokeColor("#c8e6c9").lineWidth(0.7);
        const labelX = left + 12;
        const labelW = 116;
        const sealValueX = left + 134;
        const sealValueW = pageWidth - 146;
        const hashParts = (hash || "—").match(/.{1,32}/g) || ["—"];
        doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(6.8);
        doc.text("HASH AT (SHA-256)", labelX, sealY + 8, { width: labelW, lineBreak: false });
        doc.fillColor(COLORS.dark).font("Courier-Bold").fontSize(6.6);
        hashParts.slice(0, 2).forEach((part, index) => {
            doc.text(part, sealValueX, sealY + 7 + index * 8, { width: sealValueW, lineBreak: false });
        });
        doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(6.8);
        doc.text("CÓDIGO DE VALIDAÇÃO", labelX, sealY + 26, { width: labelW, lineBreak: false });
        doc.fillColor(COLORS.dark).font("Courier").fontSize(6.8);
        doc.text(`${atCode}  ·  ${cert}`, sealValueX, sealY + 25, { width: sealValueW, lineBreak: false });
        doc.fillColor(COLORS.grey).font("Helvetica").fontSize(6.4);
        doc.text(url ? `Valide em ${url}` : "Validação por QR Code", labelX, sealY + 40, {
            width: pageWidth - 24,
            lineBreak: false,
        });
        sealY += sealH;
    }
    // ── Cartões de dados ──
    let y = sealY + 2;
    const card = (height, options = {}) => {
        doc.roundedRect(left, y, pageWidth, height, 8)
            .fillAndStroke(options.fill || "#ffffff", options.stroke || COLORS.border);
        doc.strokeColor(COLORS.border).lineWidth(0.7);
    };
    const cardTitle = (title) => {
        doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(8.5).text(title.toUpperCase(), left + 12, y + 9, {
            width: pageWidth - 24,
        });
        doc.moveTo(left + 12, y + 21).lineTo(right - 12, y + 21).strokeColor(COLORS.border).lineWidth(0.6).stroke();
    };
    const field = (label, value, x, fy, width, bold = false) => {
        doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text(label, x, fy, { width });
        doc.fillColor(COLORS.dark).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).text(value, x, fy + 9, { width });
    };
    // Cartão 1 — Mutuário (com avatar de iniciais)
    card(76);
    cardTitle("Mutuário");
    field("Nome", nomeCliente, left + 12, y + 30, pageWidth * 0.55, true);
    field("NUIT", String(recibo.customer_nuit || cliente.customerNuit || "—"), left + 12, y + 52, 120);
    field("Conta", String(recibo.customer_account || cliente.accountNumber || "—"), left + 150, y + 52, 120);
    field("Telefone", fmtPhone(cliente.customerPhone || cliente.phoneNumber || cliente.phone), left + 290, y + 52, 150);
    // Avatar
    const avatarX = right - 46;
    doc.circle(avatarX, y + 40, 18).fill(COLORS.light);
    doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(12).text(initialsOf(nomeCliente), avatarX - 18, y + 34, {
        width: 36,
        align: "center",
    });
    y += 84;
    // Cartão 2 — Crédito e carteira de financiamento
    card(76);
    cardTitle("Crédito e carteira de financiamento");
    // Isenção de IVA (operações de microcrédito) — no canto direito do título.
    doc.fillColor(COLORS.grey).font("Helvetica").fontSize(6.8)
        .text("Isento de IVA — art. 9.º do CIVA (código do IVA: 4)", left, y + 10, {
        width: pageWidth - 12,
        align: "right",
        lineBreak: false,
    });
    field("Crédito n.º", String(pick(credito, "id") || recibo.loanId || "—"), left + 12, y + 30, 100);
    field("Montante do crédito", fmtMoney(pick(credito, "amount")), left + 122, y + 30, 150, true);
    const taxaCredito = Number(pick(credito, "interestRate")) || 0;
    // A taxa gravada é a taxa do PERÍODO do plano (prestações mensais — sistema
    // francês), por isso o recibo identifica-a como "a.m." e não como "%" solto.
    const taxaTexto = taxaCredito ? `${(taxaCredito * 100).toFixed(2).replace(".", ",")}% a.m.` : "—";
    field("Taxa de juro", taxaTexto, left + 282, y + 30, 90);
    field("Data de desembolso", fmtDate(pick(credito, "disbursementDate")), left + 382, y + 30, 130);
    // Carteira de financiamento — badge colorida (ou estado honesto quando o
    // crédito é anterior às carteiras e ainda não foi classificado).
    doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text("Carteira de financiamento", left + 12, y + 52, {
        width: 220,
    });
    const badgeY = y + 61;
    if (carteira && carteira.codigo) {
        const badgeColor = WALLET_COLORS[String(carteira.cor_badge)] || WALLET_COLORS.blue;
        const badgeLabel = String(carteira.codigo);
        doc.font("Helvetica-Bold").fontSize(8);
        const badgeWidth = doc.widthOfString(badgeLabel) + 16;
        doc.roundedRect(left + 12, badgeY, badgeWidth, 14, 7).fill(badgeColor);
        doc.fillColor("#ffffff").text(badgeLabel, left + 12, badgeY + 4, { width: badgeWidth, align: "center" });
        doc.fillColor(COLORS.dark).font("Helvetica").fontSize(8);
        doc.text(String(carteira.nome || recibo.wallet_nome || ""), left + 20 + badgeWidth, badgeY + 3, {
            width: pageWidth - badgeWidth - 40,
        });
    }
    else {
        // Crédito anterior às carteiras: não é um erro do sistema — é o fundo
        // geral da instituição, identificado como LEGADO (badge cinza, sem o azul
        // "A CLASSIFICAR" que parecia uma falha e confundia o mutuário e a AT).
        const aviso = recibo.wallet_nome
            ? String(recibo.wallet_nome)
            : "Geral MBRM — crédito anterior às carteiras de financiamento";
        const legadoLabel = "LEGADO";
        doc.font("Helvetica-Bold").fontSize(7.5);
        const legadoW = doc.widthOfString(legadoLabel) + 16;
        doc.roundedRect(left + 12, badgeY, legadoW, 14, 7).fill("#e2e8f0");
        doc.fillColor("#475569").text(legadoLabel, left + 12, badgeY + 4, {
            width: legadoW,
            align: "center",
            lineBreak: false,
        });
        doc.fillColor(COLORS.grey).font("Helvetica").fontSize(8).text(aviso, left + 20 + legadoW, badgeY + 3, {
            width: pageWidth - legadoW - 44,
            lineBreak: false,
        });
    }
    y += 84;
    // Cartão 3 — Pagamento recebido (destacado). Valor pago em tipo grande
    // (#1a3c2a), breakdown à direita — hierarquia visual em vez de verde claro.
    card(106, { fill: mostrarSelo ? COLORS.lime : "#f4f9f5", stroke: mostrarSelo ? "#a5d6a7" : "#cfe3d5" });
    cardTitle("Pagamento recebido");
    doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text("Valor pago", left + 12, y + 22, { width: 200 });
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(32).text(fmtMoney(recibo.valor_pago), left + 12, y + 31, {
        width: 260,
    });
    field("Capital", fmtMoney(recibo.valor_capital), left + 280, y + 26, 110);
    field("Juros", fmtMoney(recibo.valor_juros), left + 395, y + 26, 110);
    field("Juros de mora", fmtMoney(recibo.valor_mora), left + 280, y + 50, 110);
    if (Number(recibo.valor_desconto) > 0) {
        field("Desconto", `- ${fmtMoney(recibo.valor_desconto)}`, left + 395, y + 50, 110);
    }
    else {
        field("Referência", String(recibo.referencia || "—"), left + 395, y + 50, 110);
    }
    const metodoDesc = String(recibo.metodo_pagamento_desc || recibo.metodo_pagamento || "—");
    field("Método de pagamento", metodoDesc, left + 12, y + 74, 265);
    doc.fillColor(COLORS.orange).font("Helvetica").fontSize(7).text("Saldo devedor após este pagamento", left + 285, y + 74, {
        width: 200,
    });
    doc.fillColor(Number(recibo.saldo_restante) > 0 ? COLORS.orange : COLORS.primaryDark)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(fmtMoney(recibo.saldo_restante), left + 285, y + 84, {
        width: 200,
    });
    y += 114;
    // ── Extrato do crédito — prestações pendentes ──
    // PAGINAÇÃO INTELIGENTE — MÁXIMO 2 PÁGINAS:
    //   · ≤6 prestações → tudo na página 1 (com fecho);
    //   · 7..24 → página 1 com início do extrato, página 2 com o resto + fecho;
    //   · >24 (ex.: 36x) → modo COMPACTO (fonte 7.5, linhas de 11pt) para caber
    //     sempre em 2 páginas. Nunca há 3ª página nem página órfã de assinaturas.
    const totalPrestacoes = prestacoesPendentes.length;
    const compacto = totalPrestacoes > 24;
    const LINE = compacto ? 11 : 14; // altura de linha da tabela
    const fonteTabela = compacto ? 7.5 : 8;
    doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(9).text(totalPrestacoes > 0
        ? `EXTRATO DO CRÉDITO — PRESTAÇÕES PENDENTES (${totalPrestacoes} prestações)`
        : "EXTRATO DO CRÉDITO — PRESTAÇÕES PENDENTES", left, y, { width: pageWidth });
    y += 15;
    const colX = [left + 6, left + 60, left + 150, left + 245, left + 330, left + 415];
    const colW = [54, 90, 95, 85, 85, 100];
    // Altura reservada ao fecho (total pendente + assinaturas; + texto legal AT).
    const FECHO_H = mostrarSelo ? 150 : 95;
    const drawTableHeader = () => {
        doc.roundedRect(left, y, pageWidth, 16, 4).fill(COLORS.primary);
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
        doc.text("Prestação", colX[0], y + 5, { width: colW[0], lineBreak: false });
        doc.text("Vencimento", colX[1], y + 5, { width: colW[1], lineBreak: false });
        doc.text("Valor (MZN)", colX[2], y + 5, { width: colW[2], align: "right", lineBreak: false });
        doc.text("Pago (MZN)", colX[3], y + 5, { width: colW[3], align: "right", lineBreak: false });
        doc.text("Pendente (MZN)", colX[4], y + 5, { width: colW[4], align: "right", lineBreak: false });
        doc.text("Estado", colX[5], y + 5, { width: colW[5], align: "center", lineBreak: false });
        y += 16;
    };
    // Capacidades por página (linhas): página 1 deve deixar FECHO_H se a tabela
    // couber toda; senão DIVIDE ao meio (ex.: 18 prestações → ~9 + 9) garantindo
    // que o resto cabe na página 2 com espaço para o fecho — nunca há 3ª página.
    const CAP_P1_COM_FECHO = Math.max(1, Math.floor((contentBottom - y - FECHO_H) / LINE));
    const CAP_P1 = Math.max(1, Math.floor((contentBottom - y) / LINE));
    // Página 2: mini-cabeçalho + header da tabela + linha "Mostrando…" + fecho.
    const CAP_P2 = Math.max(1, Math.floor((contentBottom - (mostrarSelo ? 150 : 86)) / LINE));
    const metade = Math.ceil(totalPrestacoes / 2);
    let capPrimeira;
    if (totalPrestacoes <= CAP_P1_COM_FECHO) {
        capPrimeira = CAP_P1_COM_FECHO;
    }
    else {
        // Divide balanceado; garante resto ≤ CAP_P2 e ≥1 linha em cada página.
        capPrimeira = Math.min(CAP_P1, metade);
        capPrimeira = Math.max(capPrimeira, Math.min(totalPrestacoes - 1, totalPrestacoes - CAP_P2));
        capPrimeira = Math.min(capPrimeira, totalPrestacoes - 1);
    }
    drawTableHeader();
    if (totalPrestacoes === 0) {
        // Badge de crédito liquidado — em vez de texto solto em tabela vazia.
        const liquidado = "Crédito liquidado — sem prestações pendentes";
        const badgeW = doc.font("Helvetica-Bold").fontSize(8).widthOfString(liquidado) + 30;
        doc.roundedRect(left + 6, y + 2, badgeW, 18, 9).fill("#e3f2e8");
        doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(8)
            .text(liquidado, left + 6, y + 7, { width: badgeW, align: "center", lineBreak: false });
        y += 26;
    }
    else {
        const hoje = (0, moment_1.default)().startOf("day");
        let capacidade = capPrimeira;
        let nestaPagina = 0;
        let imprimidas = 0;
        prestacoesPendentes.forEach((item, index) => {
            if (nestaPagina >= capacidade) {
                // Quebra para a página 2 com mini-cabeçalho MBR (nunca página órfã).
                newPage(true);
                y = 72;
                drawTableHeader();
                capacidade = CAP_P2;
                nestaPagina = 0;
                // Contador de progresso do extrato (ex.: "Mostrando 1-12 de 18").
                doc.fillColor(COLORS.grey).font("Helvetica").fontSize(6.8)
                    .text(`Mostrando 1–${imprimidas} de ${totalPrestacoes} — continuação na página 2`, left, y + 1, {
                    width: pageWidth,
                    align: "right",
                    lineBreak: false,
                });
                y += 10;
            }
            const pendente = Math.max(0, Number(item.installment) - Number(item.paidAmount || 0));
            const vencimento = (0, moment_1.default)(String(item.dueDate));
            const atraso = vencimento.isValid() && vencimento.isBefore(hoje);
            if (index % 2 === 1)
                doc.rect(left, y, pageWidth, LINE).fill(COLORS.zebra);
            doc.fillColor(COLORS.dark).font("Helvetica").fontSize(fonteTabela);
            // `installmentOrder` vem da base já formatado ("2ª"); se vier um número,
            // acrescenta-se o ordinal — nunca deixar sair "NaNª" no recibo.
            const ordemBruta = item.installmentOrder;
            const ordem = typeof ordemBruta === "string" && ordemBruta.trim() !== ""
                ? ordemBruta
                : `${Number(ordemBruta) || index + 1}ª`;
            doc.text(ordem, colX[0], y + 3, { width: colW[0], lineBreak: false });
            doc.text(fmtDate(item.dueDate), colX[1], y + 3, { width: colW[1], lineBreak: false });
            doc.text(fmtNumber(item.installment), colX[2], y + 3, { width: colW[2], align: "right", lineBreak: false });
            doc.text(fmtNumber(item.paidAmount), colX[3], y + 3, { width: colW[3], align: "right", lineBreak: false });
            doc
                .font("Helvetica-Bold")
                .text(fmtNumber(pendente), colX[4], y + 3, { width: colW[4], align: "right", lineBreak: false });
            const estado = atraso ? "Em atraso" : "Pendente";
            const cor = atraso ? COLORS.red : COLORS.amber;
            const w = doc.font("Helvetica-Bold").fontSize(6.8).widthOfString(estado) + 12;
            const badgeX = colX[5] + (colW[5] - w) / 2;
            doc.roundedRect(badgeX, y + 2.4, w, 9, 4.5).fill(atraso ? "#fdecea" : "#fef3c7");
            doc.fillColor(cor).text(estado, badgeX, y + 4.4, { width: w, align: "center", lineBreak: false });
            y += LINE;
            nestaPagina += 1;
            imprimidas += 1;
        });
        // Rodapé do extrato na página onde a tabela termina ("Mostrando 1–X de Y").
        doc.fillColor(COLORS.grey).font("Helvetica").fontSize(6.8)
            .text(`Mostrando 1–${imprimidas} de ${totalPrestacoes}`, left, y + 3, {
            width: pageWidth,
            align: "right",
            lineBreak: false,
        });
        y += 14;
    }
    // ── Fecho: total pendente + (texto legal AT) + assinaturas ──
    // O fecho vai SEMPRE na página onde a tabela termina se couber; senão abre-se
    // a página 2 (máximo absoluto do documento — a capacidade CAP_P2 da tabela
    // já reserva espaço para este bloco). Sem 3ª página, sem página órfã.
    if (y + FECHO_H > contentBottom + 8) {
        if (doc.bufferedPageRange().count === 1) {
            newPage(false);
            y = 56;
        }
        else {
            y = Math.min(y, contentBottom - 40); // 2 páginas é o limite — encaixa
        }
    }
    y += 10;
    doc.roundedRect(left + pageWidth / 2, y, pageWidth / 2, 20, 6).fill(COLORS.light);
    doc.fillColor(COLORS.primaryDark).font("Helvetica-Bold").fontSize(11).text(`Total pendente: ${fmtMoney(recibo.saldo_restante)}`, left + pageWidth / 2 + 10, y + 5, { width: pageWidth / 2 - 20, align: "right", lineBreak: false });
    y += 34;
    // TODO AT: Ativar quando tiver Certificado AT 2026/001 — o texto legal do
    // Decreto n.º 22/2023, a hash e o link de validação só entram no documento
    // quando a instituição tiver o certificado AT.
    let sigY;
    if (mostrarSelo) {
        doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text("Recibo emitido electronicamente com numeração sequencial por empresa e ano, nos termos da legislação fiscal em vigor em " +
            "Moçambique (Autoridade Tributária de Moçambique — Regulamento de Facturação, Decreto n.º 22/2023 de 12 de Maio). " +
            "Este documento serve de comprovativo do pagamento identificado acima e não substitui a factura. " +
            `Hash de validação: ${hash || "—"}. Processado por computador. Software certificado: ${cert}.` +
            (url ? ` Valide este recibo em ${url} ou escaneie o QR Code.` : ""), left, y, { width: pageWidth, align: "justify", lineGap: 1.2 });
        sigY = Math.min(doc.y + 22, contentBottom - 30);
    }
    else {
        sigY = y + 14;
    }
    doc.moveTo(left, sigY).lineTo(left + 190, sigY).strokeColor(COLORS.grey).lineWidth(0.6).stroke();
    doc.fillColor(COLORS.grey).font("Helvetica").fontSize(7).text(`Assinatura / carimbo do emitente\n${fmtDateTimeMaputo(emissao)}`, left, sigY + 3, { width: 200 });
    doc.moveTo(right - 190, sigY).lineTo(right, sigY).stroke();
    doc.text("Assinatura do mutuário\nData: ____ / ____ / ________", right - 190, sigY + 3, { width: 195 });
    // ── Faixa de rodapé fixa em TODAS as páginas (com Página X de Y) ──
    // A última página fecha o documento ("Documento processado por computador…");
    // as anteriores indicam continuação ("Continua na página seguinte").
    const range = doc.bufferedPageRange();
    const footerLines = (pagina) => {
        const ultima = pagina === range.count;
        const continuidade = ultima ? "Documento processado por computador" : "Continua na página seguinte";
        if (mostrarSelo) {
            return [
                `${empresa.companyName || "MBRM"} · NUIT ${empresa.companyNuit || "—"} · Documento válido com QR Code e Hash AT · Sistema v2.0.9`,
                `${recibo.numero} · Hash: ${hash ? `${hash.slice(0, 24)}…` : "—"} · Emitido em ${fmtDateTimeMaputo(emissao)} · ${continuidade} · Página ${pagina}/${range.count}`,
            ];
        }
        return [
            `${empresa.companyName || "MBRM"} · NUIT ${empresa.companyNuit || "—"} · ${continuidade} — MBR Microcrédito — Sistema v2.0.9 · Página ${pagina}/${range.count}`,
            `${recibo.numero} · Emitido em ${fmtDateTimeMaputo(emissao)}`,
        ];
    };
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.moveTo(left, footerY - 10).lineTo(right, footerY - 10).strokeColor(COLORS.border).lineWidth(0.5).stroke();
        doc.fillColor("#9e9e9e").font("Helvetica").fontSize(6);
        footerLines(i - range.start + 1).forEach((linha, index) => {
            doc.text(linha, left, footerY - 8 + index * 9, {
                width: pageWidth,
                align: "center",
                lineBreak: false,
            });
        });
    }
    doc.end();
    yield new Promise((resolve, reject) => {
        stream.on("finish", () => resolve());
        stream.on("error", reject);
    });
    return `/docs/${fileName}`;
});
exports.renderReciboPdf = renderReciboPdf;
