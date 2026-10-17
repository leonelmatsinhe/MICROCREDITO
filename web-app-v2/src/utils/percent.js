/**
 * Percentagens — leitura e escrita sem perder precisão.
 *
 * O sistema guarda as percentagens como FRACÇÃO (0.0001 = 0,01%; 0.12 = 12%).
 * Estes helpers existem para que:
 *   · "0,01" (vírgula portuguesa) seja lido como 0.01 e não como NaN/0;
 *   · 0,01% sobreviva ao ciclo editar → guardar → reabrir (nunca vira 0);
 *   · a apresentação use até 4 casas decimais (0,0001% continua visível).
 */

export const PERCENT_DECIMALS = 6

const FACTOR = 10 ** PERCENT_DECIMALS

export function roundPercent(value, decimals = PERCENT_DECIMALS) {
  const f = 10 ** decimals
  return Math.round((Number(value) + Number.EPSILON) * f) / f
}

/** Aceita número ou texto ("0,01", "0.01", "0,01%", " 12,5 ") → número|null. */
export function parseLooseNumber(raw) {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw !== 'string') return null
  const cleaned = raw.trim().replace(/\s|%/g, '').replace(',', '.')
  if (cleaned === '') return null
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

/** 0,01 (%) → 0.0001 (fracção guardada na base de dados). */
export function percentToFraction(percent) {
  const parsed = parseLooseNumber(percent)
  if (parsed === null) return null
  return Math.round((parsed / 100) * FACTOR) / FACTOR
}

/** 0.0001 (fracção) → 0,01 (%). */
export function fractionToPercent(fraction) {
  const parsed = parseLooseNumber(fraction)
  if (parsed === null) return 0
  return roundPercent(parsed * 100)
}

/** Percentagem legível (até 4 casas), sem colapsar valores pequenos em 0. */
export function formatPercentFromFraction(fraction, maxDecimals = 4) {
  const pct = fractionToPercent(fraction)
  if (pct <= 0) return '0'
  return String(Number(pct.toFixed(maxDecimals))).replace('.', ',')
}
