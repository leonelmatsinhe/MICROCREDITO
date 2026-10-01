"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.divideMoney = exports.clampMoney = exports.moneyGt = exports.moneyGte = exports.moneyEquals = exports.subMoney = exports.sumMoney = exports.round2 = exports.num = void 0;
/** Converte qualquer valor vindo da BD/form para number finito (0 se inválido). */
const num = (value) => {
    const parsed = typeof value === "number" ? value : parseFloat(String(value !== null && value !== void 0 ? value : "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
};
exports.num = num;
/** Arredonda para centavos — ÚNICA forma de arredondar dinheiro no sistema. */
const round2 = (value) => Math.round((0, exports.num)(value) * 100) / 100;
exports.round2 = round2;
/** Soma N valores monetários já arredondada a centavos. */
const sumMoney = (...values) => (0, exports.round2)(values.reduce((acc, v) => acc + (0, exports.num)(v), 0));
exports.sumMoney = sumMoney;
/** Diferença arredondada a centavos. */
const subMoney = (a, b) => (0, exports.round2)((0, exports.num)(a) - (0, exports.num)(b));
exports.subMoney = subMoney;
/**
 * Igualdade monetária com tolerância de 1 centavo
 * (evita falhas de float como 0.1 + 0.2 !== 0.3).
 */
const moneyEquals = (a, b) => Math.abs((0, exports.num)(a) - (0, exports.num)(b)) < 0.005;
exports.moneyEquals = moneyEquals;
/** a >= b com tolerância de 1 centavo. */
const moneyGte = (a, b) => (0, exports.num)(a) >= (0, exports.num)(b) - 0.005;
exports.moneyGte = moneyGte;
/** a > b com tolerância (falso quando iguais a 1 centavo). */
const moneyGt = (a, b) => (0, exports.num)(a) > (0, exports.num)(b) + 0.005;
exports.moneyGt = moneyGt;
/**
 * Limita `value` a [min, max] arredondado.
 * Usado no motor de alocação para não ultrapassar a fatia disponível.
 */
const clampMoney = (value, min, max) => (0, exports.round2)(Math.min(Math.max((0, exports.num)(value), (0, exports.num)(min)), (0, exports.num)(max)));
exports.clampMoney = clampMoney;
/**
 * Divide `total` em `parts` fatias a centavos, sem perder cêntimos
 * (a diferença de arredondamento fica na última fatia).
 * Ex.: divideMoney(100, 3) → [33.33, 33.33, 33.34]
 */
const divideMoney = (total, parts) => {
    const n = Math.max(1, Math.floor(parts));
    const totalCents = Math.round((0, exports.num)(total) * 100);
    const base = Math.floor(totalCents / n);
    const remainder = totalCents - base * n;
    return Array.from({ length: n }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
};
exports.divideMoney = divideMoney;
