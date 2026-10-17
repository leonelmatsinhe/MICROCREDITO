/**
 * DENOMINAÇÕES DO METICAL (MZN) — CONTAGEM DE NUMERÁRIO
 * ----------------------------------------------------
 * Fonte única de verdade (backend) da contagem de dinheiro físico na gaveta.
 * O frontend tem um espelho em web-app-v2/src/utils/mznDenominations.js —
 * os dois têm de listar exactamente os mesmos valores faciais.
 *
 * Notas em circulação: 1000, 500, 200, 100, 50, 20 MT.
 * Moedas em circulação: 10, 5, 2, 1 MT e 50 centavos (0,50 MT).
 */

/** Valores faciais aceites na contagem, do maior para o menor. */
export const MZN_DENOMINATIONS: number[] = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];

/** Quantidade de notas/moedas de cada valor facial. */
export type DenominationCount = Record<string, number>;

/** Duas casas decimais (dinheiro). */
const round2 = (value: number) => Math.round(value * 100) / 100;

const isKnownDenomination = (faceValue: number) => MZN_DENOMINATIONS.includes(faceValue);

/**
 * Normaliza a contagem vinda do cliente: só valores faciais conhecidos,
 * quantidades inteiras >= 0 e sem chaves a zero. Devolve um
 * { "1000": 3, "500": 2 } ordenado do maior para o menor.
 * Lança INVALID_DENOMINATIONS se vier um valor facial desconhecido ou uma
 * quantidade inválida — melhor recusar do que contar dinheiro errado.
 */
export const normalizeDenominations = (input: any): DenominationCount => {
  const counts: DenominationCount = {};
  if (input === undefined || input === null) return counts;

  if (typeof input !== "object" || Array.isArray(input)) {
    throw { code: "INVALID_DENOMINATIONS", message: "A contagem por denominação tem de ser um objecto { \"1000\": 3, ... }." };
  }

  for (const [rawKey, rawQty] of Object.entries(input)) {
    const faceValue = Number(String(rawKey).replace(",", "."));
    if (!Number.isFinite(faceValue) || !isKnownDenomination(faceValue)) {
      throw {
        code: "INVALID_DENOMINATIONS",
        message: `Valor facial inválido: ${rawKey}. Valores aceites: ${MZN_DENOMINATIONS.join(", ")} MZN.`,
      };
    }
    if (rawQty === null || rawQty === undefined || rawQty === "") continue;
    const quantity = Number(rawQty);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw {
        code: "INVALID_DENOMINATIONS",
        message: `Quantidade inválida para a denominação ${rawKey}: ${rawQty}. Use inteiros >= 0.`,
      };
    }
    if (quantity > 0) counts[String(faceValue)] = quantity;
  }

  // Ordena do maior para o menor (estável para leitura e para o PDF).
  return MZN_DENOMINATIONS.reduce<DenominationCount>((acc, faceValue) => {
    const key = String(faceValue);
    if (counts[key]) acc[key] = counts[key];
    return acc;
  }, {});
};

/**
 * Normaliza a contagem mantendo TODOS os valores faciais (zeros incluídos) —
 * é esta a forma gravada em `denominations_open` / `denominations_close`, para
 * o auto de ocorrência e o Mapa de Caixa mostrarem a grelha completa contada.
 */
export const normalizeDenominationsFull = (input: any): DenominationCount => {
  const compact = normalizeDenominations(input);
  return MZN_DENOMINATIONS.reduce<DenominationCount>((acc, faceValue) => {
    const key = String(faceValue);
    acc[key] = compact[key] || 0;
    return acc;
  }, {});
};

/** Total em meticais da contagem por denominação. */
export const sumDenominations = (counts: DenominationCount | null | undefined): number => {
  if (!counts) return 0;
  const total = MZN_DENOMINATIONS.reduce(
    (sum, faceValue) => sum + faceValue * (Number(counts[String(faceValue)]) || 0),
    0
  );
  return round2(total);
};

/** Quantas unidades (notas + moedas) foram contadas. */
export const countDenominationUnits = (counts: DenominationCount | null | undefined): number => {
  if (!counts) return 0;
  return MZN_DENOMINATIONS.reduce(
    (units, faceValue) => units + (Number(counts[String(faceValue)]) || 0),
    0
  );
};

/** True quando a contagem não tem nenhuma denominação com quantidade > 0. */
export const isEmptyDenominations = (counts: DenominationCount | null | undefined): boolean =>
  countDenominationUnits(counts) === 0;
