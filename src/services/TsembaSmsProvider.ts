import axios from "axios";

// ============================================================
// Tsemba — Bulk SMS (Moçambique)
// Docs: https://tsembasms.com/docs/api
//   POST /sms/send
//   Header: x-api-key: YOUR_API_KEY
//   Body:   { "to": "+258841234567", "message": "...", "sender_id": "MINHAEMPRESA" }
// O campo sender_id é opcional — se omitido, a Tsemba usa 1480 por defeito.
// ============================================================

const TSEMBA_API_URL =
  process.env.TSEMBA_API_URL ||
  "https://hdxqelinqivwgmggolhs.supabase.co/functions/v1/api-gateway/sms/send";
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
  gatewayMessageId?: string | null;
  error?: string | null;
  raw?: any;
};

export const isTsembaConfigured = (): boolean => Boolean(TSEMBA_API_KEY);

/**
 * Envia um SMS através da API da Tsemba.
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
  const body: Record<string, string> = {
    to,
    message: String(params.message || "").trim(),
  };
  if (senderId) body.sender_id = senderId;

  try {
    const response = await axios.post(TSEMBA_API_URL, body, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TSEMBA_API_KEY,
      },
      timeout: 20000,
    });

    const data = response.data || {};
    if (data.success) {
      return {
        success: true,
        gatewayMessageId:
          data.data?.message_id || data.data?.id || data.data?.messageId || null,
        raw: data,
      };
    }
    return {
      success: false,
      error:
        data.error ||
        data.message ||
        `Resposta inesperada da Tsemba (HTTP ${response.status})`,
      raw: data,
    };
  } catch (error: any) {
    const data = error?.response?.data;
    return {
      success: false,
      error:
        data?.error ||
        data?.message ||
        error?.message ||
        "Erro de comunicação com a API Tsemba",
      raw: data || null,
    };
  }
};