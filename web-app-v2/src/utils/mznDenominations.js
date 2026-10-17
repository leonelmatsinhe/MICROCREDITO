/**
 * DENOMINAÇÕES DO METICAL (MZN) — CONTAGEM DE NUMERÁRIO
 * ----------------------------------------------------
 * Espelho do backend (src/utils/mznDenominations.ts) — os valores faciais têm
 * de ser EXACTAMENTE os mesmos dos dois lados. Serve a contagem cega do
 * operador no fecho do caixa (Mapa de Caixa — Modelo BM).
 *
 * Notas em circulação: 1000, 500, 200, 100, 50, 20 MT.
 * Moedas em circulação: 10, 5, 2, 1 MT e 50 centavos (0,50 MT).
 */

/** Valores faciais aceites, do maior para o menor. */
export const MZN_DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5]

/** Metadados para apresentação (nota vs moeda). */
export const MZN_DENOMINATION_META = MZN_DENOMINATIONS.map((value) => ({
  value,
  key: String(value),
  tipo: value >= 20 ? 'NOTA' : 'MOEDA',
  label: value >= 1
    ? `${value.toLocaleString('pt-MZ')} MT`
    : `${(value * 100).toLocaleString('pt-MZ')} centavos`
}))

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100

/** Total em meticais da contagem { "1000": 3, "500": 2 }. */
export function sumDenominations(counts) {
  if (!counts) return 0
  return round2(
    MZN_DENOMINATIONS.reduce(
      (total, faceValue) => total + faceValue * (Number(counts[String(faceValue)]) || 0),
      0
    )
  )
}

/** Quantas notas/moedas foram contadas no total. */
export function countDenominationUnits(counts) {
  if (!counts) return 0
  return MZN_DENOMINATIONS.reduce(
    (units, faceValue) => units + (Number(counts[String(faceValue)]) || 0),
    0
  )
}

/** True quando não há nenhuma denominação com quantidade > 0. */
export function isEmptyDenominations(counts) {
  return countDenominationUnits(counts) === 0
}

/** Contagem vazia (todas as denominações a zero) para iniciar o formulário. */
export function emptyDenominationCount() {
  return MZN_DENOMINATIONS.reduce((acc, faceValue) => {
    acc[String(faceValue)] = 0
    return acc
  }, {})
}

/** Formata um valor em MZN no formato pt-MZ usado em todo o sistema. */
export function formatMZN(value) {
  return (
    (Number(value) || 0).toLocaleString('pt-MZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' MZN'
  )
}
