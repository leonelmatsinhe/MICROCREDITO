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
exports.getBulkSmsMessages = exports.getBulkSmsWalletBalance = exports.sendBulkSms = exports.isBulkSmsConfigured = exports.bulkSmsToInternational = void 0;
const axios_1 = __importDefault(require("axios"));
// ============================================================
// BulkSMM — Bulk SMS (Moçambique)
// Endpoints (novo provedor — substitui a integração Tsemba):
//   POST /sms/send      → envio de SMS
//       Headers: X-API-Key: <API key>, Content-Type: application/json
//       Body:    { "to": ["+258841234567"], "body": "...", "sender": "MINHALOJA" }
//   GET  /wallet        → saldo de unidades
//   GET  /messages      → mensagens enviadas recentemente
// O campo sender é opcional — se omitido, é usado o sender por defeito da conta.
// ============================================================
// https://iiywyqfapgqkggvxyvfd.supabase.co/functions/v1/api
const BULKSMS_API_BASE_URL = process.env.BULKSMS_API_URL ||
    "https://iiywyqfapgqkggvxyvfd.supabase.co/functions/v1/api";
const BULKSMS_API_KEY = process.env.BULKSMS_API_KEY || "";
const BULKSMS_SENDER_ID = process.env.BULKSMS_SENDER_ID || "";
/**
 * Converte um número para o formato internacional exigido pelo gateway (+258XXXXXXXXX).
 * Aceita 9 dígitos locais (841234567) ou 12 dígitos já com o indicativo (258841234567).
 */
const bulkSmsToInternational = (phone) => {
    if (!phone)
        return null;
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("258"))
        return `+${digits}`;
    if (digits.length === 9)
        return `+258${digits}`;
    return null;
};
exports.bulkSmsToInternational = bulkSmsToInternational;
const isBulkSmsConfigured = () => Boolean(BULKSMS_API_KEY);
exports.isBulkSmsConfigured = isBulkSmsConfigured;
/**
 * Envia um SMS através da API do BulkSMM (mesma mensagem; `to` aceita array).
 * `to` pode ser 9 dígitos locais ou +258XXXXXXXXX.
 */
const sendBulkSms = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    if (!BULKSMS_API_KEY) {
        return { success: false, error: "BULKSMS_API_KEY não configurada no .env" };
    }
    const to = (0, exports.bulkSmsToInternational)(params.to);
    if (!to) {
        return {
            success: false,
            error: `Número de telefone inválido: ${params.to}. Use +258XXXXXXXXX.`,
        };
    }
    const senderId = params.senderId || BULKSMS_SENDER_ID;
    const body = {
        to: [to],
        body: String(params.message || "").trim(),
    };
    if (senderId)
        body.sender = senderId;
    try {
        const response = yield axios_1.default.post(`${BULKSMS_API_BASE_URL}/sms/send`, body, {
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": BULKSMS_API_KEY,
            },
            timeout: 20000,
        });
        const data = response.data || {};
        // Sucesso: 2xx sem sinalizador explícito de erro
        const explicitError = data.error === "validation_failed" ||
            data.status === "validation_failed" ||
            (data.status && String(data.status).toLowerCase() === "error");
        if (!explicitError) {
            const messageIds = Array.isArray(data.message_ids)
                ? data.message_ids
                : data.message_id
                    ? [data.message_id]
                    : [];
            return {
                success: true,
                campaignId: data.campaign_id || null,
                gatewayMessageId: messageIds[0] || data.message_id || data.id || null,
                recipients: data.recipients ||
                    data.recipients_count ||
                    (Array.isArray(data.to) ? data.to.length : 1),
                successCount: (_b = (_a = data.success_count) !== null && _a !== void 0 ? _a : data.recipients) !== null && _b !== void 0 ? _b : 1,
                creditsUsed: (_e = (_d = (_c = data.credits_used) !== null && _c !== void 0 ? _c : data.credits) !== null && _d !== void 0 ? _d : data.cost) !== null && _e !== void 0 ? _e : null,
                messageIds,
                raw: data,
            };
        }
        // Resposta de validação (status 400)
        return {
            success: false,
            error: data.message || "Falha na validação do payload",
            errorCode: data.error || null,
            hint: data.hint || null,
            details: data.details || null,
            raw: data,
        };
    }
    catch (error) {
        const data = (_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.data;
        // Erros de validação (400)
        if ((data === null || data === void 0 ? void 0 : data.error) === "validation_failed") {
            return {
                success: false,
                error: data.message || "Falha na validação do payload",
                errorCode: data.error,
                hint: data.hint || null,
                details: data.details || null,
                raw: data,
            };
        }
        // Erros de autenticação (401)
        if (((_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.status) === 401) {
            return {
                success: false,
                error: "Chave de API inválida ou revogada",
                errorCode: "invalid_api_key",
                raw: data,
            };
        }
        // Saldo insuficiente (402)
        if (((_h = error === null || error === void 0 ? void 0 : error.response) === null || _h === void 0 ? void 0 : _h.status) === 402) {
            return {
                success: false,
                error: "Saldo insuficiente na carteira",
                errorCode: "insufficient_balance",
                raw: data,
            };
        }
        // IP não permitido (403)
        if (((_j = error === null || error === void 0 ? void 0 : error.response) === null || _j === void 0 ? void 0 : _j.status) === 403) {
            return {
                success: false,
                error: "IP fora da allowlist da API key",
                errorCode: "ip_not_allowed",
                raw: data,
            };
        }
        // Rate limited (429)
        if (((_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.status) === 429) {
            return {
                success: false,
                error: "Limite de taxa excedido",
                errorCode: "rate_limited",
                raw: data,
            };
        }
        return {
            success: false,
            error: (data === null || data === void 0 ? void 0 : data.error) ||
                (data === null || data === void 0 ? void 0 : data.message) ||
                (error === null || error === void 0 ? void 0 : error.message) ||
                "Erro de comunicação com a API BulkSMM",
            errorCode: (data === null || data === void 0 ? void 0 : data.error) || null,
            raw: data || null,
        };
    }
});
exports.sendBulkSms = sendBulkSms;
/**
 * Consulta o saldo de unidades da carteira.
 * GET /wallet
 */
const getBulkSmsWalletBalance = () => __awaiter(void 0, void 0, void 0, function* () {
    var _l, _m, _o, _p, _q, _r;
    if (!BULKSMS_API_KEY) {
        return { success: false, error: "BULKSMS_API_KEY não configurada no .env" };
    }
    try {
        const response = yield axios_1.default.get(`${BULKSMS_API_BASE_URL}/wallet`, {
            headers: {
                "X-API-Key": BULKSMS_API_KEY,
            },
            timeout: 10000,
        });
        const data = response.data || {};
        const balance = (_p = (_o = (_m = (_l = data.balance_credits) !== null && _l !== void 0 ? _l : data.balance_units) !== null && _m !== void 0 ? _m : data.balance) !== null && _o !== void 0 ? _o : data.credits) !== null && _p !== void 0 ? _p : 0;
        return {
            success: true,
            balance: Number(balance) || 0,
            currency: data.currency || "MZN",
        };
    }
    catch (error) {
        return {
            success: false,
            error: ((_r = (_q = error === null || error === void 0 ? void 0 : error.response) === null || _q === void 0 ? void 0 : _q.data) === null || _r === void 0 ? void 0 : _r.message) || (error === null || error === void 0 ? void 0 : error.message) || "Erro ao consultar saldo",
        };
    }
});
exports.getBulkSmsWalletBalance = getBulkSmsWalletBalance;
/**
 * Lista as mensagens enviadas recentemente.
 * GET /messages?limit=N (máx 100)
 */
const getBulkSmsMessages = (limit = 50) => __awaiter(void 0, void 0, void 0, function* () {
    var _s, _t;
    if (!BULKSMS_API_KEY) {
        return { success: false, error: "BULKSMS_API_KEY não configurada no .env" };
    }
    try {
        const response = yield axios_1.default.get(`${BULKSMS_API_BASE_URL}/messages`, {
            headers: {
                "X-API-Key": BULKSMS_API_KEY,
            },
            params: { limit: Math.min(100, Math.max(1, limit)) },
            timeout: 10000,
        });
        const data = response.data || {};
        return {
            success: true,
            messages: data.messages || data.result || [],
        };
    }
    catch (error) {
        return {
            success: false,
            error: ((_t = (_s = error === null || error === void 0 ? void 0 : error.response) === null || _s === void 0 ? void 0 : _s.data) === null || _t === void 0 ? void 0 : _t.message) || (error === null || error === void 0 ? void 0 : error.message) || "Erro ao listar mensagens",
        };
    }
});
exports.getBulkSmsMessages = getBulkSmsMessages;
