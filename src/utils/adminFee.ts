/**
 * TAXA ADMINISTRATIVA ("taxa de preparos")
 * ----------------------------------------
 * A taxa é uma FRACÇÃO do capital, guardada em DECIMAL(15,6)
 * (`interest_rates.administrativeFee` e `customer_loans.administrativeFee`).
 *
 *   0.0001  → 0,01% do capital   (mínimo operacional: 150.000 × 0,01% = 15,00 MZN)
 *   0.001   → 0,1%
 *   0.01    → 1%
 *   0       → isento
 *
 * Com DECIMAL(15,2) um 0,01% (0.0001) era arredondado a ZERO ao gravar — daí a
 * taxa "voltar a zero" depois de um deploy que recriasse a coluna. A migração
 * já garante DECIMAL(15,6); este módulo garante que nenhuma camada (API, UI,
 * Sequelize) volta a colapsar o valor em 0 nem aceita uma percentagem
 * ambígua.
 */

export const ADMIN_FEE_DECIMALS = 6;
/** 0.000001 = 0,0001% — abaixo disto o valor não é representável. */
export const ADMIN_FEE_MIN_FRACTION = 0.000001;
/** 1 = 100% do capital. */
export const ADMIN_FEE_MAX_FRACTION = 1;
/** Campo oficial (fracção) e aliases de percentagem aceites pela API. */
export const ADMIN_FEE_PERCENT_FIELDS = [
  "administrativeFeePercent",
  "adminFeePercent",
] as const;

const DECIMAL_FACTOR = 10 ** ADMIN_FEE_DECIMALS;

/** Arredonda uma fracção para as 6 casas decimais que o MySQL guarda. */
export const roundAdminFeeFraction = (value: number): number =>
  Math.round((Number(value) + Number.EPSILON) * DECIMAL_FACTOR) / DECIMAL_FACTOR;

/**
 * Aceita número ou texto e devolve o número, tolerando o formato português:
 * "0,01" · "0.01" · "0,01%" · " 0.01 % " · "1 000" (não aceita).
 * Devolve `null` quando não é um número reconhecível.
 */
export const parseLooseNumber = (raw: any): number | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;

  const cleaned = raw.trim().replace(/\s|%/g, "").replace(",", ".");
  if (cleaned === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

/** 0,01 (%) → 0.0001 (fracção guardada na base de dados). */
export const adminFeePercentToFraction = (percent: any): number | null => {
  const parsed = parseLooseNumber(percent);
  if (parsed === null) return null;
  return roundAdminFeeFraction(parsed / 100);
};

/** 0.0001 (fracção) → 0,01 (%). */
export const adminFeeFractionToPercent = (fraction: any): number => {
  const parsed = parseLooseNumber(fraction);
  if (parsed === null) return 0;
  return roundAdminFeeFraction(parsed * 100);
};

export type AdminFeeParse =
  | { ok: true; fraction: number; source: "FRACTION" | "PERCENT" | "ABSENT" }
  | { ok: false; message: string };

/**
 * Fonte única de leitura do payload: aceita `administrativeFee` (fracção) ou
 * `administrativeFeePercent` / `adminFeePercent` (percentagem).
 *
 * Regras:
 *  · ausente / vazio → 0 (isento);
 *  · negativo ou > 100% → erro (nunca grava lixo);
 *  · percentagem > 0 que arredondaria a 0 (ex.: 0,00001%) → ERRO, para que a
 *    taxa nunca "desapareça" silenciosamente.
 */
export const parseAdminFeePayload = (body: any): AdminFeeParse => {
  if (!body || typeof body !== "object") return { ok: true, fraction: 0, source: "ABSENT" };

  const percentField = ADMIN_FEE_PERCENT_FIELDS.find(
    (field) => body[field] !== undefined && body[field] !== null && body[field] !== ""
  );

  if (percentField) {
    const percent = parseLooseNumber(body[percentField]);
    if (percent === null) {
      return { ok: false, message: "Taxa administrativa inválida: indique uma percentagem (ex.: 0,01 para 0,01%)." };
    }
    if (percent < 0) {
      return { ok: false, message: "A taxa administrativa não pode ser negativa." };
    }
    if (percent > 100) {
      return { ok: false, message: "A taxa administrativa não pode exceder 100% do capital." };
    }
    const fraction = adminFeePercentToFraction(percent);
    if (percent > 0 && (!fraction || fraction < ADMIN_FEE_MIN_FRACTION)) {
      return {
        ok: false,
        message: `A taxa administrativa é demasiado pequena: ${percent}% não é representável (mínimo 0,0001%).`,
      };
    }
    return { ok: true, fraction: fraction as number, source: "PERCENT" };
  }

  const raw = body.administrativeFee;
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, fraction: 0, source: "ABSENT" };
  }

  // Um texto com "%" é percentagem (ex.: "0,01%"), mesmo no campo da fracção.
  const looksLikePercent = typeof raw === "string" && raw.includes("%");
  const parsed = parseLooseNumber(raw);
  if (parsed === null) {
    return { ok: false, message: "Taxa administrativa inválida: indique uma fracção (0.0001 = 0,01%)." };
  }

  const fraction = looksLikePercent ? adminFeePercentToFraction(parsed) : roundAdminFeeFraction(parsed);
  if (fraction === null || fraction < 0) {
    return { ok: false, message: "A taxa administrativa não pode ser negativa." };
  }
  if (fraction > ADMIN_FEE_MAX_FRACTION) {
    return {
      ok: false,
      message: "A taxa administrativa não pode exceder 100% do capital (indique a fracção: 0.0001 = 0,01%).",
    };
  }
  if (parsed > 0 && fraction < ADMIN_FEE_MIN_FRACTION) {
    return {
      ok: false,
      message: `A taxa administrativa é demasiado pequena: ${parsed}${looksLikePercent ? "%" : ""} não é representável (mínimo 0,0001%).`,
    };
  }
  return { ok: true, fraction, source: looksLikePercent ? "PERCENT" : "FRACTION" };
};

/** Normaliza um valor já guardado (leitura) — NULL/strings → fracção válida. */
export const normalizeStoredAdminFee = (value: any): number => {
  const parsed = parseLooseNumber(value);
  if (parsed === null || parsed <= 0) return 0;
  return roundAdminFeeFraction(parsed);
};

/** Valor monetário da taxa sobre o capital, arredondado ao cêntimo. */
export const adminFeeAmountOnPrincipal = (principal: any, fraction: any): number => {
  const capital = parseLooseNumber(principal) ?? 0;
  const fee = normalizeStoredAdminFee(fraction);
  if (capital <= 0 || fee <= 0) return 0;
  return Math.round((capital * fee + Number.EPSILON) * 100) / 100;
};

/**
 * Formata a fracção como percentagem legível: 0.0001 → "0,01",
 * 0.001 → "0,1", 0.01 → "1". Sem zeros à direita e sem colapsar valores
 * pequenos (usa no máximo 4 casas decimais na percentagem).
 */
export const formatAdminFeePercent = (fraction: any, maxDecimals = 4): string => {
  const percent = adminFeeFractionToPercent(fraction);
  if (percent <= 0) return "0";
  const fixed = Number(percent.toFixed(maxDecimals));
  return String(fixed).replace(".", ",");
};
