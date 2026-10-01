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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reciboByTranzaction = exports.lookup = exports.enviar = exports.validar = exports.pdf = exports.findOne = exports.byCustomer = exports.byLoan = exports.gerar = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const sequelize_1 = require("sequelize");
const ReciboModel_1 = require("../database/models/ReciboModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const LoanModel_1 = require("../database/models/LoanModel");
const CompanyModel_1 = require("../database/models/CompanyModel");
const roles_1 = require("../middlewares/roles");
const reciboService_1 = require("../services/reciboService");
/**
 * RECIBOS DE PAGAMENTO — numeração sequencial legal (AT Moçambique).
 * O recibo é por PAGAMENTO INDIVIDUAL e inclui o extrato do crédito com as
 * prestações pendentes (ver services/reciboService.ts).
 */
const ensureCompanyAccess = (req, res, companyId) => {
    const user = (0, roles_1.getCurrentUser)(req);
    if (!user)
        return true; // já validado pelo middleware de auth
    const userCompany = Number(user.companyId);
    if (userCompany && userCompany !== Number(companyId)) {
        res.status(403).json({ success: false, message: "Não tem acesso a dados desta empresa." });
        return false;
    }
    return true;
};
/**
 * POST /api/recibos/gerar/:tranzactionId
 * Gera (ou devolve, se já existir) o recibo de um pagamento.
 */
const gerar = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const tranzactionId = Number(req.params.tranzactionId);
        const tranzaction = (yield TranzactionModel_1.TranzactionModel.findByPk(tranzactionId, { raw: true }));
        if (!tranzaction) {
            return res.status(404).json({ success: false, message: "Pagamento não encontrado." });
        }
        const companyId = Number(((_a = req.body) === null || _a === void 0 ? void 0 : _a.companyId) || tranzaction.companyId);
        if (!ensureCompanyAccess(req, res, companyId))
            return;
        const user = (0, roles_1.getCurrentUser)(req);
        const recibo = yield (0, reciboService_1.generateReciboForTranzaction)({
            tranzactionId,
            companyId,
            createdBy: (user === null || user === void 0 ? void 0 : user.id) || null,
        });
        return res.status(201).json({
            success: true,
            message: `Recibo ${recibo.numero} emitido com sucesso.`,
            result: recibo,
            pdf_url: recibo.pdf_url || null,
        });
    }
    catch (error) {
        console.error("[Recibo] Erro ao gerar:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({
            success: false,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Erro ao emitir o recibo.",
        });
    }
});
exports.gerar = gerar;
/** GET /api/recibos/loan/:loanId?companyId= — recibos de um crédito. */
const byLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const loanId = Number(req.params.loanId);
        const loan = (yield LoanModel_1.LoanModel.findByPk(loanId, { raw: true }));
        if (!loan)
            return res.status(404).json({ success: false, message: "Crédito não encontrado." });
        const companyId = Number(req.query.companyId || loan.companyId);
        if (!ensureCompanyAccess(req, res, companyId))
            return;
        const result = yield (0, reciboService_1.listRecibosByLoan)(companyId, loanId);
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Erro ao listar os recibos do crédito." });
    }
});
exports.byLoan = byLoan;
/** GET /api/recibos/customer/:customerId?companyId= — recibos de um cliente. */
const byCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customerId = Number(req.params.customerId);
        const companyId = Number(req.query.companyId);
        if (!Number.isFinite(companyId) || companyId <= 0) {
            return res.status(400).json({ success: false, message: "companyId é obrigatório." });
        }
        if (!ensureCompanyAccess(req, res, companyId))
            return;
        const result = yield (0, reciboService_1.listRecibosByCustomer)(companyId, customerId);
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Erro ao listar os recibos do cliente." });
    }
});
exports.byCustomer = byCustomer;
/** GET /api/recibos/:id — recibo com extrato do crédito. */
const findOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const detalhe = yield (0, reciboService_1.getReciboDetalhe)(id);
        if (!detalhe)
            return res.status(404).json({ success: false, message: "Recibo não encontrado." });
        if (!ensureCompanyAccess(req, res, Number(detalhe.recibo.companyId)))
            return;
        return res.status(200).json({
            success: true,
            result: detalhe.recibo,
            cliente: detalhe.cliente || null,
            credito: detalhe.credito || null,
            prestacoes_pendentes: detalhe.prestacoesPendentes,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Erro ao carregar o recibo." });
    }
});
exports.findOne = findOne;
/** GET /api/recibos/:id/pdf — PDF (gera na primeira chamada, se necessário). */
const pdf = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const detalhe = yield (0, reciboService_1.getReciboDetalhe)(id);
        if (!detalhe)
            return res.status(404).json({ success: false, message: "Recibo não encontrado." });
        if (!ensureCompanyAccess(req, res, Number(detalhe.recibo.companyId)))
            return;
        let pdfUrl = detalhe.recibo.pdf_url;
        let filePath = pdfUrl ? path_1.default.join(process.cwd(), "uploads", "docs", path_1.default.basename(String(pdfUrl))) : "";
        // Recibos emitidos antes do selo electrónico são regenerados com o layout
        // actual (hash + QR Code + método de pagamento legível), para não servirem
        // um documento desactualizado.
        const precisaSelo = !detalhe.recibo.hash_at
            || !detalhe.recibo.qr_code_url
            || (!detalhe.recibo.metodo_pagamento_desc && !!detalhe.recibo.tranzactionId);
        // `?regenerate=1` força a re-impressão (útil quando o layout do recibo é
        // melhorado: o número, o hash e a sequência AT mantêm-se os mesmos).
        const regenerar = ["1", "true", "sim"].includes(String(req.query.regenerate || req.query.regenerar || "").toLowerCase());
        if (!pdfUrl || !fs_1.default.existsSync(filePath) || precisaSelo || regenerar) {
            if (precisaSelo)
                yield (0, reciboService_1.ensureReciboSeal)(id);
            pdfUrl = yield (0, reciboService_1.renderReciboPdf)(id);
            filePath = pdfUrl ? path_1.default.join(process.cwd(), "uploads", "docs", path_1.default.basename(String(pdfUrl))) : "";
            if (pdfUrl) {
                const { ReciboModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/ReciboModel")));
                yield ReciboModel.update({ pdf_url: pdfUrl }, { where: { id } });
            }
        }
        if (!filePath || !fs_1.default.existsSync(filePath)) {
            return res.status(500).json({ success: false, message: "Não foi possível gerar o PDF do recibo." });
        }
        const download = String(req.query.download || "") === "1";
        // ETag = hash AT do recibo: se o selo não mudou, o PDF não mudou —
        // browsers evitam re-baixar (304) e o QR continua a validar o mesmo ficheiro.
        const etag = `"${String(detalhe.recibo.hash_at || detalhe.recibo.numero).slice(0, 40)}"`;
        res.setHeader("ETag", etag);
        if (req.headers["if-none-match"] === etag)
            return res.status(304).end();
        res.setHeader("Content-Type", "application/pdf");
        // Nome amigável: Recibo_REC-2026-00061.pdf
        const friendly = `Recibo_${String(detalhe.recibo.numero).replace(/[^A-Za-z0-9-]/g, "_")}.pdf`;
        res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${friendly}"`);
        return res.sendFile(filePath);
    }
    catch (error) {
        console.error("[Recibo] Erro no PDF:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao obter o PDF do recibo." });
    }
});
exports.pdf = pdf;
/**
 * GET /api/recibos/validar?hash=…&rec=REC-AAAA-XXXXX
 * VALIDAÇÃO PÚBLICA (sem autenticação) — é esta a página que o QR Code do
 * recibo abre. Confirma o selo SHA-256 e devolve o resumo do documento.
 */
const validar = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hash = String(req.query.hash || req.query.h || "").trim().toLowerCase();
        const numero = String(req.query.rec || req.query.numero || "").trim();
        if (!hash && !numero) {
            return res.status(400).json({
                success: false,
                valido: false,
                message: "Indique o número do recibo (rec) e/ou o hash para validação.",
            });
        }
        const reciboByNumero = numero ? yield (0, reciboService_1.findReciboForValidation)({ numero }) : null;
        const reciboByHash = hash ? yield (0, reciboService_1.findReciboForValidation)({ hash }) : null;
        const recibo = reciboByNumero || reciboByHash;
        if (!recibo) {
            return res.status(404).json({
                success: false,
                valido: false,
                message: "Recibo não encontrado. Confirme o número ou o hash indicado.",
            });
        }
        // Selo pode faltar em recibos emitidos antes desta versão: calcula-se agora.
        const selado = recibo.hash_at ? recibo : yield (0, reciboService_1.ensureReciboSeal)(Number(recibo.id));
        const hashRecibo = String((selado === null || selado === void 0 ? void 0 : selado.hash_at) || "").toLowerCase();
        const hashBate = hash ? hash === hashRecibo : Boolean(numero) && Boolean(hashRecibo);
        // Hash e número têm de apontar para o MESMO recibo.
        if (hash && numero && reciboByHash && Number(reciboByHash.id) !== Number(reciboByNumero === null || reciboByNumero === void 0 ? void 0 : reciboByNumero.id)) {
            return res.status(409).json({
                success: false,
                valido: false,
                message: "O hash não corresponde ao número de recibo indicado.",
            });
        }
        const empresa = (yield CompanyModel_1.CompanyModel.findByPk(Number(recibo.companyId), { raw: true })) || {};
        return res.status(200).json({
            success: true,
            valido: hashBate,
            message: hashBate
                ? "Recibo válido — emitido electronicamente pela MBRM."
                : "Hash não corresponde ao recibo indicado.",
            software_certification: (selado === null || selado === void 0 ? void 0 : selado.software_certification) || reciboService_1.SOFTWARE_CERTIFICATION,
            result: {
                numero: recibo.numero,
                serie: recibo.serie,
                ano: recibo.ano,
                sequencia: recibo.sequencia,
                at_validation_code: (selado === null || selado === void 0 ? void 0 : selado.at_validation_code) || null,
                hash_at: hashRecibo,
                emitido_em: recibo.created_at,
                emitente: {
                    nome: empresa.companyName || null,
                    nuit: empresa.companyNuit || null,
                    endereco: empresa.companyAddress || null,
                },
                cliente: recibo.customer_name,
                cliente_nuit: recibo.customer_nuit,
                credito: recibo.loanId,
                carteira: recibo.wallet_nome,
                metodo_pagamento: recibo.metodo_pagamento_desc || recibo.metodo_pagamento,
                referencia: recibo.referencia,
                valor_pago: Number(recibo.valor_pago),
                valor_capital: Number(recibo.valor_capital),
                valor_juros: Number(recibo.valor_juros),
                valor_mora: Number(recibo.valor_mora),
                saldo_restante: Number(recibo.saldo_restante),
            },
            url_validacao: (0, reciboService_1.validationUrl)({ numero: String(recibo.numero), hash: hashRecibo }),
        });
    }
    catch (error) {
        console.error("[Recibo] Erro na validação:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, valido: false, message: "Erro ao validar o recibo." });
    }
});
exports.validar = validar;
/**
 * POST /api/recibos/:id/enviar — envia o recibo (PDF + link de validação) por
 * e-mail, reutilizando o SMTP já configurado para as credenciais.
 */
const enviar = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    try {
        const id = Number(req.params.id);
        const detalhe = yield (0, reciboService_1.getReciboDetalhe)(id);
        if (!detalhe)
            return res.status(404).json({ success: false, message: "Recibo não encontrado." });
        if (!ensureCompanyAccess(req, res, Number(detalhe.recibo.companyId)))
            return;
        const selado = detalhe.recibo.hash_at ? detalhe.recibo : yield (0, reciboService_1.ensureReciboSeal)(id);
        const destino = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.email) || ((_c = detalhe.cliente) === null || _c === void 0 ? void 0 : _c.customerEmail) || "").trim();
        if (!destino) {
            return res.status(400).json({ success: false, message: "Indique o e-mail de destino." });
        }
        const pdfUrl = yield (0, reciboService_1.renderReciboPdf)(id);
        const filePath = pdfUrl ? path_1.default.join(process.cwd(), "uploads", "docs", path_1.default.basename(String(pdfUrl))) : "";
        if (!filePath || !fs_1.default.existsSync(filePath)) {
            return res.status(500).json({ success: false, message: "Não foi possível gerar o PDF do recibo." });
        }
        const empresa = (yield CompanyModel_1.CompanyModel.findByPk(Number(detalhe.recibo.companyId), { raw: true })) || {};
        const link = (0, reciboService_1.validationUrl)({
            numero: String(detalhe.recibo.numero),
            hash: String((selado === null || selado === void 0 ? void 0 : selado.hash_at) || detalhe.recibo.hash_at || ""),
        });
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.EMAIL_HOST || "mail.outboxsolutions.co.mz",
            port: Number(process.env.EMAIL_PORT || 587),
            secure: false,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_SECRET },
            tls: { rejectUnauthorized: false },
        });
        yield transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: destino,
            subject: `Recibo ${detalhe.recibo.numero} — ${empresa.companyName || "MBRM"}`,
            html: `
        <p>Exmo(a). Sr(a). <b>${detalhe.recibo.customer_name || "Mutuário"}</b>,</p>
        <p>Segue em anexo o recibo <b>${detalhe.recibo.numero}</b> referente ao pagamento de
        <b>${Number(detalhe.recibo.valor_pago).toFixed(2)} MT</b>.</p>
        <ul>
          <li>Capital: ${Number(detalhe.recibo.valor_capital).toFixed(2)} MT</li>
          <li>Juros: ${Number(detalhe.recibo.valor_juros).toFixed(2)} MT</li>
          <li>Juros de mora: ${Number(detalhe.recibo.valor_mora).toFixed(2)} MT</li>
          <li>Saldo devedor após o pagamento: ${Number(detalhe.recibo.saldo_restante).toFixed(2)} MT</li>
        </ul>
        <p>Pode confirmar a autenticidade deste documento em <a href="${link}">${link}</a>.</p>
        <p>${empresa.companyName || "MBRM"} · NUIT ${empresa.companyNuit || "—"}</p>
      `,
            attachments: [{ filename: path_1.default.basename(filePath), path: filePath }],
        });
        return res.status(200).json({ success: true, message: `Recibo enviado para ${destino}.` });
    }
    catch (error) {
        console.error("[Recibo] Erro ao enviar:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({
            success: false,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Erro ao enviar o recibo por e-mail. Confirme a configuração SMTP.",
        });
    }
});
exports.enviar = enviar;
/**
 * POST /api/recibos/lookup { companyId, tranzactionIds }
 * Devolve, para uma lista de pagamentos, o número/hash do recibo já emitido.
 * Serve para a grelha de pagamentos mostrar o selo AT sem N pedidos.
 */
const lookup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e;
    try {
        const companyId = Number((_d = req.body) === null || _d === void 0 ? void 0 : _d.companyId);
        const ids = Array.isArray((_e = req.body) === null || _e === void 0 ? void 0 : _e.tranzactionIds)
            ? req.body.tranzactionIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
            : [];
        if (!Number.isFinite(companyId) || companyId <= 0) {
            return res.status(400).json({ success: false, message: "companyId é obrigatório." });
        }
        if (ids.length === 0)
            return res.status(200).json({ success: true, result: [] });
        if (ids.length > 500) {
            return res.status(400).json({ success: false, message: "Máximo de 500 pagamentos por consulta." });
        }
        const recibos = (yield ReciboModel_1.ReciboModel.findAll({
            where: { companyId, tranzactionId: { [sequelize_1.Op.in]: ids } },
            attributes: ["id", "numero", "hash_at", "tranzactionId", "wallet_nome", "metodo_pagamento_desc"],
            raw: true,
        }));
        return res.status(200).json({ success: true, result: recibos });
    }
    catch (error) {
        console.error("[Recibo] Erro no lookup:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao consultar os recibos dos pagamentos." });
    }
});
exports.lookup = lookup;
/**
 * GET /api/tranzactions/:id/recibo — JSON com o recibo de um pagamento.
 * O frontend usa isto para abrir/baixar o PDF do backend (nunca gera PDF).
 */
const reciboByTranzaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tranzactionId = Number(req.params.id);
        const recibo = yield ReciboModel_1.ReciboModel.findOne({
            where: { tranzactionId },
            raw: true,
        });
        if (!recibo) {
            return res.status(404).json({ success: false, message: "Este pagamento não tem recibo emitido." });
        }
        if (!ensureCompanyAccess(req, res, Number(recibo.companyId)))
            return;
        // Garante selo + PDF (recibos antigos podem chegar aqui sem pdf_path).
        const selado = recibo.hash_at ? recibo : yield (0, reciboService_1.ensureReciboSeal)(Number(recibo.id));
        let pdfPath = recibo.pdf_url;
        if (pdfPath) {
            const abs = path_1.default.join(process.cwd(), "uploads", "docs", path_1.default.basename(String(pdfPath)));
            if (!fs_1.default.existsSync(abs))
                pdfPath = yield (0, reciboService_1.renderReciboPdf)(Number(recibo.id));
        }
        else {
            pdfPath = yield (0, reciboService_1.renderReciboPdf)(Number(recibo.id));
        }
        if (pdfPath) {
            const { ReciboModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/ReciboModel")));
            yield ReciboModel.update({ pdf_url: pdfPath }, { where: { id: Number(recibo.id) } });
        }
        // Resposta enriquecida: serve tanto para o botão "Baixar Recibo" (pdf_url)
        // como para o visualizador do frontend (ReciboViewerDialog precisa de
        // numero/customer_name/valor_pago/hash_at sem um segundo pedido).
        const reciboId = Number(recibo.id);
        return res.status(200).json({
            success: true,
            result: Object.assign(Object.assign({}, recibo), { id: reciboId, recibo_id: reciboId, numero: String(recibo.numero), hash: String((selado === null || selado === void 0 ? void 0 : selado.hash_at) || recibo.hash_at || ""), pdf_url: `/api/recibos/${reciboId}/pdf`, qr_url: recibo.qr_code_url || null, status: recibo.status || "EMITIDO" }),
        });
    }
    catch (error) {
        console.error("[Recibo] Erro ao resolver recibo do pagamento:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro ao obter o recibo do pagamento." });
    }
});
exports.reciboByTranzaction = reciboByTranzaction;
