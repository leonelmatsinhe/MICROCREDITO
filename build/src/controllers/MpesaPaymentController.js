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
exports.c2Business = exports.b2Customer = exports.queryVodacomStatus = exports.getTransactionStatus = exports.mpesaCallbackWebhook = exports.initiateC2B = void 0;
const MpesaOpenApiService_1 = require("../services/MpesaOpenApiService");
const MpesaTransactionModel_1 = require("../database/models/MpesaTransactionModel");
/**
 * Iniciar Pagamento C2B (Single Stage)
 * POST /api/mpesa/c2b/initiate
 */
const initiateC2B = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, customerId, loanId, amortizationLoanId, amount, phone } = req.body;
        if (!companyId || !customerId || !loanId || !amortizationLoanId || !amount || !phone) {
            return res.status(400).json({
                success: false,
                message: "Todos os parâmetros são obrigatórios (companyId, customerId, loanId, amortizationLoanId, amount, phone).",
            });
        }
        const result = yield (0, MpesaOpenApiService_1.initiateC2BPayment)({
            companyId: Number(companyId),
            customerId: Number(customerId),
            loanId: Number(loanId),
            amortizationLoanId: Number(amortizationLoanId),
            amount: Number(amount),
            phone: String(phone),
        });
        return res.status(200).json(result);
    }
    catch (error) {
        console.error("[M-Pesa Controller] Erro ao iniciar C2B:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(400).json({
            success: false,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Erro ao comunicar com a Vodacom M-Pesa.",
        });
    }
});
exports.initiateC2B = initiateC2B;
/**
 * Webhook Oficial de Callback da Vodacom
 * POST /api/mpesa/c2b/callback
 */
const mpesaCallbackWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payload = req.body || {};
        console.log("[M-Pesa Webhook] Callback recebido da Vodacom:", JSON.stringify(payload));
        const result = yield (0, MpesaOpenApiService_1.handleMpesaCallback)(payload);
        // Vodacom espera HTTP 200 para confirmar a receção do callback
        return res.status(200).json(result);
    }
    catch (error) {
        console.error("[M-Pesa Webhook] Erro ao processar callback:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(200).json({ success: false, error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.mpesaCallbackWebhook = mpesaCallbackWebhook;
/**
 * Polling de Status da Transação para o Frontend
 * GET /api/mpesa/c2b/status/:id
 */
const getTransactionStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mpesaTxId = parseInt(req.params.id, 10);
        if (!Number.isFinite(mpesaTxId)) {
            return res.status(400).json({ success: false, message: "ID de transação inválido." });
        }
        const tx = yield MpesaTransactionModel_1.MpesaTransactionModel.findByPk(mpesaTxId);
        if (!tx) {
            return res.status(404).json({ success: false, message: "Transação não encontrada." });
        }
        // Se já foi concluída com sucesso, busca dados do recibo para o frontend descarregar
        let reciboData = null;
        if (tx.reciboId) {
            const { ReciboModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/ReciboModel")));
            reciboData = yield ReciboModel.findByPk(tx.reciboId, { raw: true });
        }
        return res.status(200).json({
            success: true,
            status: tx.status,
            mpesaReceipt: tx.mpesaReceipt,
            responseCode: tx.responseCode,
            responseDescription: tx.responseDescription,
            tranzactionId: tx.tranzactionId,
            recibo: reciboData
                ? { id: reciboData.id, numero: reciboData.numero, pdf_url: reciboData.pdf_url }
                : null,
        });
    }
    catch (error) {
        console.error("[M-Pesa Controller] Erro ao verificar status:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: "Erro interno ao obter status." });
    }
});
exports.getTransactionStatus = getTransactionStatus;
/**
 * Consulta ativa à Vodacom (Query Transaction Status)
 * POST /api/mpesa/c2b/query/:id
 */
const queryVodacomStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mpesaTxId = parseInt(req.params.id, 10);
        if (!Number.isFinite(mpesaTxId)) {
            return res.status(400).json({ success: false, message: "ID de transação inválido." });
        }
        const result = yield (0, MpesaOpenApiService_1.queryMpesaTransactionStatus)(mpesaTxId);
        return res.status(200).json(result);
    }
    catch (error) {
        console.error("[M-Pesa Controller] Erro na consulta ativa:", (error === null || error === void 0 ? void 0 : error.message) || error);
        return res.status(500).json({ success: false, message: (error === null || error === void 0 ? void 0 : error.message) || "Erro na consulta à Vodacom." });
    }
});
exports.queryVodacomStatus = queryVodacomStatus;
// Compatibilidade legado com rotas antigas
const b2Customer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.status(501).json({ success: false, message: "Desembolso B2C sob solicitação direta." });
});
exports.b2Customer = b2Customer;
exports.c2Business = exports.initiateC2B;
