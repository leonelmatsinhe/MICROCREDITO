/**
 * LIMITE DE NUMERÁRIO EM CAIXA (circular do Banco de Moçambique)
 * -------------------------------------------------------------
 * O saldo de dinheiro físico na gaveta de um operador não pode exceder este
 * valor. Ao ultrapassar, o sistema obriga a uma ENTREGA_COFRE (entrega do
 * excedente ao Cofre/Tesoureiro, com comprovativo assinado) ou a um
 * DEPOSITO_BANCARIO (guia de depósito do excedente no banco) antes de o
 * operador continuar a operar.
 *
 * Configurável por instalação: CASH_LIMIT_MZN. Omissão: 75.000 MT.
 */

/** Limite por omissão (MZN) — circular do BM usada como referência. */
export const DEFAULT_CASH_LIMIT_MZN = 75000;

/** Limite de numerário em caixa em vigor para esta instalação. */
export const getCashLimitMzn = (): number => {
  const raw = String(process.env.CASH_LIMIT_MZN ?? "").trim();
  if (!raw) return DEFAULT_CASH_LIMIT_MZN;
  const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
  // Limite <= 0 desactiva a verificação (instalações sem regra definida).
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CASH_LIMIT_MZN;
};

/** True quando o limite está activo (valor > 0). */
export const isCashLimitEnabled = (): boolean => getCashLimitMzn() > 0;
