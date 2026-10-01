/**
 * MAPA MÉTODO DE PAGAMENTO → TESOURARIA
 * -------------------------------------
 * Os modais gravam o meio de pagamento em `tranzactions.paymentMethod` como
 * código legado (1..8 — ver LEGACY_METHOD_LABELS em reciboService). O caixa
 * central (cash_movements.payment_method) usa outro enum: CASH | BANK | MPESA |
 * EMOLA. Sem este mapa, o caixa recebia sempre "CASH" e os pagamentos por
 * M-Pesa/transferência ficavam classificados como dinheiro da gaveta.
 *
 *  1 = Numerário            → CASH
 *  2 = Cheque               → BANK (compensação bancária)
 *  3 = Transferência        → BANK
 *  4 = Depósito bancário    → BANK
 *  5 = TPA                  → BANK
 *  6 = e-Mola               → EMOLA
 *  7 = M-Pesa               → MPESA
 *  8 = e-Mola               → EMOLA
 *
 * Já aceita também os códigos da tesouraria ("CASH"/"BANK"/"MPESA"/"EMOLA")
 * e devolve sempre um valor válido do enum (default CASH).
 */
export const methodToTreasury = (method: string | number | null | undefined): "CASH" | "BANK" | "MPESA" | "EMOLA" => {
  const raw = String(method ?? "").trim().toUpperCase();
  switch (raw) {
    case "7": case "MPESA": return "MPESA";
    case "6": case "8": case "EMOLA": return "EMOLA";
    case "2": case "3": case "4": case "5": case "BANK": return "BANK";
    case "1": case "CASH": return "CASH";
    default: return "CASH";
  }
};
