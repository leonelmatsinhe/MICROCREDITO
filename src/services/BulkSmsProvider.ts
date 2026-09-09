import axios from "axios";

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

const BULKSMS_API_BASE_URL =
  process.env.BULKSMS_API_URL ||
  "https://iiywyqfapqkggvxyvfd.supabase.co/functions/v1/api";
const BULKSMS_API_KEY = process.env.BULKSMS_API_KEY || "";
const BULKSMS_SENDER_ID = process.env.BULKSMS_SENDER_ID || "";

/**
 * Converte um número para o formato internacional exigido pelo gateway (+258XXXXXXXXX).
 * Aceita 9 dígitos locais (841234567) ou 12 dígitos já com o indicativo (258841234567).
 */
export const bulkSmsToInternational = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("258")) return `+${digits}`;
  if (digits.length === 9) return `+258${digits}`;
  return null;
};

export type BulkSmsResult = {
  success: boolean;
  campaignId?: string | null;
  gatewayMessageId?: string | null;
  recipients?: number;
  successCount?: number;
  creditsUsed?: number | null;
  messageIds?: string[];
  error?: string | null;
  errorCode?: string | null;
  hint?: string | null;
  details?: any;
  raw?: any;
};

export const isBulkSmsConfigured = (): boolean => Boolean(BULKSMS_API_KEY);

/**
 * Envia um SMS através da API do BulkSMM (mesma mensagem; `to` aceita array).
 * `to` pode ser 9 dígitos locais ou +258XXXXXXXXX.
 */
export const sendBulkSms = async (params: {
  to: string;
  message: string;
  senderId?: string | null;
}): Promise<BulkSmsResult> => {
  if (!BULKSMS_API_KEY) {
    return { success: false, error: "BULKSMS_API_KEY não configurada no .env" };
  }

  const to = bulkSmsToInternational(params.to);
  if (!to) {
    return {
      success: false,
      error: `Número de telefone inválido: ${params.to}. Use +258XXXXXXXXX.`,
    };
  }

  const senderId = params.senderId || BULKSMS_SENDER_ID;
  const body: Record<string, any> = {
    to: [to],
    body: String(params.message || "").trim(),
  };
  if (senderId) body.sender = senderId;

  try {
    const response = await axios.post(
      `${BULKSMS_API_BASE_URL}/sms/send`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": BULKSMS_API_KEY,
        },
        timeout: 20000,
      }
    );

    const data = response.data || {};

    // Sucesso: 2xx sem sinalizador explícito de erro
    const explicitError =
      data.error === "validation_failed" ||
      data.status === "validation_failed" ||
      (data.status && String(data.status).toLowerCase() === "error");
    if (!explicitError) {
      const messageIds: string[] = Array.isArray(data.message_ids)
        ? data.message_ids
        : data.message_id
        ? [data.message_id]
        : [];
      return {
        success: true,
        campaignId: data.campaign_id || null,
        gatewayMessageId: messageIds[0] || data.message_id || data.id || null,
        recipients:
          data.recipients ||
          data.recipients_count ||
          (Array.isArray(data.to) ? data.to.length : 1),
        successCount: data.success_count ?? data.recipients ?? 1,
        creditsUsed: data.credits_used ?? data.credits ?? data.cost ?? null,
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
  } catch (error: any) {
    const data = error?.response?.data;

    // Erros de validação (400)
    if (data?.error === "validation_failed") {
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
    if (error?.response?.status === 401) {
      return {
        success: false,
        error: "Chave de API inválida ou revogada",
        errorCode: "invalid_api_key",
        raw: data,
      };
    }

    // Saldo insuficiente (402)
    if (error?.response?.status === 402) {
      return {
        success: false,
        error: "Saldo insuficiente na carteira",
        errorCode: "insufficient_balance",
        raw: data,
      };
    }

    // IP não permitido (403)
    if (error?.response?.status === 403) {
      return {
        success: false,
        error: "IP fora da allowlist da API key",
        errorCode: "ip_not_allowed",
        raw: data,
      };
    }

    // Rate limited (429)
    if (error?.response?.status === 429) {
      return {
        success: false,
        error: "Limite de taxa excedido",
        errorCode: "rate_limited",
        raw: data,
      };
    }

    return {
      success: false,
      error:
        data?.error ||
        data?.message ||
        error?.message ||
        "Erro de comunicação com a API BulkSMM",
      errorCode: data?.error || null,
      raw: data || null,
    };
  }
};

/**
 * Consulta o saldo de unidades da carteira.
 * GET /wallet
 */
export const getBulkSmsWalletBalance = async (): Promise<{
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string | null;
}> => {
  if (!BULKSMS_API_KEY) {
    return { success: false, error: "BULKSMS_API_KEY não configurada no .env" };
  }

  try {
    const response = await axios.get(`${BULKSMS_API_BASE_URL}/wallet`, {
      headers: {
        "X-API-Key": BULKSMS_API_KEY,
      },
      timeout: 10000,
    });

    const data = response.data || {};
    const balance =
      data.balance_credits ??
      data.balance_units ??
      data.balance ??
      data.credits ??
      0;
    return {
      success: true,
      balance: Number(balance) || 0,
      currency: data.currency || "MZN",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message || error?.message || "Erro ao consultar saldo",
    };
  }
};

/**
 * Lista as mensagens enviadas recentemente.
 * GET /messages?limit=N (máx 100)
 */
export const getBulkSmsMessages = async (limit: number = 50): Promise<{
  success: boolean;
  messages?: any[];
  error?: string | null;
}> => {
  if (!BULKSMS_API_KEY) {
    return { success: false, error: "BULKSMS_API_KEY não configurada no .env" };
  }

  try {
    const response = await axios.get(`${BULKSMS_API_BASE_URL}/messages`, {
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
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message || error?.message || "Erro ao listar mensagens",
    };
  }
};
