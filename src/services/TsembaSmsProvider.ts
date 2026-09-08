import axios from "axios";

// ============================================================
// Tsemba — Bulk SMS (Moçambique)
// Docs: https://tsembasms.com/docs/api
//   POST /sms/send
//   Header: X-API-Key: YOUR_API_KEY
//   Body:   { "to": ["+258841234567"], "body": "...", "sender": "MINHAEMPRESA" }
// O campo sender é opcional — se omitido, a Tsemba usa 1480 por defeito.
//
// Modos de envio:
//   Modo 1: Mesma mensagem para todos os destinatários
//   Modo 2: Mesmo template, variáveis por destinatário
//   Modo 3: Mensagem completamente diferente por destinatário
// ============================================================

const TSEMBA_API_BASE_URL =
  process.env.TSEMBA_API_URL ||
  "https://iiywyqfapqkggvxyvfd.supabase.co/functions/v1/api";
const TSEMBA_API_KEY = process.env.TSEMBA_API_KEY || "";
const TSEMBA_SENDER_ID = process.env.TSEMBA_SENDER_ID || "";

/**
 * Converte um número para o formato internacional exigido pela Tsemba (+258XXXXXXXXX).
 * Aceita 9 dígitos locais (841234567) ou 12 dígitos já com o indicativo (258841234567).
 */
export const tsembaToInternational = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("258")) return `+${digits}`;
  if (digits.length === 9) return `+258${digits}`;
  return null;
};

export type TsembaSmsResult = {
  success: boolean;
  campaignId?: string | null;
  gatewayMessageId?: string | null;
  recipients?: number;
  successCount?: number;
  creditsUsed?: number;
  messageIds?: string[];
  error?: string | null;
  errorCode?: string | null;
  hint?: string | null;
  details?: any;
  raw?: any;
};

export const isTsembaConfigured = (): boolean => Boolean(TSEMBA_API_KEY);

/**
 * Envia um SMS através da API da Tsemba (Modo 1 — mesma mensagem para todos).
 * `to` pode ser 9 dígitos locais ou +258XXXXXXXXX.
 */
export const sendTsembaSms = async (params: {
  to: string;
  message: string;
  senderId?: string | null;
}): Promise<TsembaSmsResult> => {
  if (!TSEMBA_API_KEY) {
    return { success: false, error: "TSEMBA_API_KEY não configurada no .env" };
  }

  const to = tsembaToInternational(params.to);
  if (!to) {
    return {
      success: false,
      error: `Número de telefone inválido: ${params.to}. Use +258XXXXXXXXX.`,
    };
  }

  const senderId = params.senderId || TSEMBA_SENDER_ID;
  const body: Record<string, any> = {
    to: [to],
    body: String(params.message || "").trim(),
  };
  if (senderId) body.sender = senderId;

  try {
    const response = await axios.post(
      `${TSEMBA_API_BASE_URL}/sms/send`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": TSEMBA_API_KEY,
        },
        timeout: 20000,
      }
    );

    const data = response.data || {};
    
    // Resposta de sucesso (status 200)
    if (data.status === "accepted" || data.status === "success") {
      return {
        success: true,
        campaignId: data.campaign_id || null,
        gatewayMessageId: data.message_ids?.[0] || null,
        recipients: data.recipients || 0,
        successCount: data.success_count || 0,
        creditsUsed: data.credits_used || 0,
        messageIds: data.message_ids || [],
        raw: data,
      };
    }

    // Resposta de validação (status 400)
    if (data.error === "validation_failed") {
      return {
        success: false,
        error: data.message || "Falha na validação do payload",
        errorCode: data.error,
        hint: data.hint || null,
        details: data.details || null,
        raw: data,
      };
    }

    // Outros erros
    return {
      success: false,
      error:
        data.error ||
        data.message ||
        `Resposta inesperada da Tsemba (HTTP ${response.status})`,
      errorCode: data.error || null,
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
        "Erro de comunicação com a API Tsemba",
      errorCode: data?.error || null,
      raw: data || null,
    };
  }
};

/**
 * Consulta o saldo de créditos da carteira principal.
 * GET /wallet
 */
export const getTsembaWalletBalance = async (): Promise<{
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string | null;
}> => {
  if (!TSEMBA_API_KEY) {
    return { success: false, error: "TSEMBA_API_KEY não configurada no .env" };
  }

  try {
    const response = await axios.get(`${TSEMBA_API_BASE_URL}/wallet`, {
      headers: {
        "X-API-Key": TSEMBA_API_KEY,
      },
      timeout: 10000,
    });

    const data = response.data || {};
    return {
      success: true,
      balance: data.balance_credits || 0,
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
export const getTsembaMessages = async (limit: number = 50): Promise<{
  success: boolean;
  messages?: any[];
  error?: string | null;
}> => {
  if (!TSEMBA_API_KEY) {
    return { success: false, error: "TSEMBA_API_KEY não configurada no .env" };
  }

  try {
    const response = await axios.get(`${TSEMBA_API_BASE_URL}/messages`, {
      headers: {
        "X-API-Key": TSEMBA_API_KEY,
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
