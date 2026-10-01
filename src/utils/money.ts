/**
 * MONEY — política única de arredondamento para dinheiro (MZN).
 *
 * REGRA DE OURO: nunca usar float "nu" para dinheiro. Todos os valores
 * monetários passam por `round2` (centavos exatos) e comparações de igualdade
 * monetária usam `moneyEquals` com tolerância de 1 centavo.
 *
 * A BD usa DECIMAL(15,2); o Sequelize devolve strings para DECIMAL — por isso
 * `num()` converte qualquer entrada (string | number | null) para number seguro.
 */

/** Converte qualquer valor vindo da BD/form para number finito (0 se inválido). */
export const num = (value: any): number => {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Arredonda para centavos — ÚNICA forma de arredondar dinheiro no sistema. */
export const round2 = (value: any): number => Math.round(num(value) * 100) / 100;

/** Soma N valores monetários já arredondada a centavos. */
export const sumMoney = (...values: any[]): number =>
  round2(values.reduce((acc, v) => acc + num(v), 0));

/** Diferença arredondada a centavos. */
export const subMoney = (a: any, b: any): number => round2(num(a) - num(b));

/**
 * Igualdade monetária com tolerância de 1 centavo
 * (evita falhas de float como 0.1 + 0.2 !== 0.3).
 */
export const moneyEquals = (a: any, b: any): boolean =>
  Math.abs(num(a) - num(b)) < 0.005;

/** a >= b com tolerância de 1 centavo. */
export const moneyGte = (a: any, b: any): boolean => num(a) >= num(b) - 0.005;

/** a > b com tolerância (falso quando iguais a 1 centavo). */
export const moneyGt = (a: any, b: any): boolean => num(a) > num(b) + 0.005;

/**
 * Limita `value` a [min, max] arredondado.
 * Usado no motor de alocação para não ultrapassar a fatia disponível.
 */
export const clampMoney = (value: any, min: any, max: any): number =>
  round2(Math.min(Math.max(num(value), num(min)), num(max)));

/**
 * Divide `total` em `parts` fatias a centavos, sem perder cêntimos
 * (a diferença de arredondamento fica na última fatia).
 * Ex.: divideMoney(100, 3) → [33.33, 33.33, 33.34]
 */
export const divideMoney = (total: any, parts: number): number[] => {
  const n = Math.max(1, Math.floor(parts));
  const totalCents = Math.round(num(total) * 100);
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
};
