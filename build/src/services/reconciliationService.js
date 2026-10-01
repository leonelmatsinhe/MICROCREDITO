"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileDay = void 0;
const db_1 = require("../database/db");
const money_1 = require("../utils/money");
/**
 * RECONCILIAÇÃO DO CAIXA DIÁRIO — compliance/core bancário.
 *
 * Compara 3 fontes para o mesmo dia/empresa:
 *   1. tranzactions (pagamentos registados, CONFIRMED, pelo paymentDate)
 *   2. cash_movements (movimentos ENTRADA automáticos + manuais de pagamento)
 *   3. recibos (documentos legais emitidos)
 *
 * Divergência > 0,01 MZN → o fecho do caixa é BLOQUEADO (ver closeRegister).
 * Devolve também o detalhe por método para diagnóstico rápido.
 */
const reconcileDay = (companyId, date) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const dayStart = `${date} 00:00:00`;
    const dayEnd = `${date} 23:59:59`;
    // 1) Transacções CONFIRMED do dia (por paymentDate — data efectiva do pagamento)
    const [txRows] = yield db_1.db.query(`SELECT paymentMethod, COALESCE(SUM(totalAmount),0) AS total, COUNT(*) AS n
       FROM tranzactions
      WHERE companyId = ? AND status = 'CONFIRMED'
        AND paymentDate = ?
      GROUP BY paymentMethod`, { replacements: [companyId, date] });
    const byMethod = {};
    let txCount = 0;
    let txTotal = 0;
    for (const row of txRows) {
        const method = String(row.paymentMethod);
        const total = (0, money_1.round2)((0, money_1.num)(row.total));
        byMethod[method] = (0, money_1.round2)((byMethod[method] || 0) + total);
        txTotal = (0, money_1.round2)(txTotal + total);
        txCount += Number(row.n) || 0;
    }
    // 2) Movimentos de caixa ENTRADA do dia ligados a pagamentos
    // (cash_movements usa camelCase: createdAt)
    const [mvRows] = yield db_1.db.query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS n
       FROM cash_movements
      WHERE companyId = ? AND type = 'ENTRADA'
        AND createdAt BETWEEN ? AND ?
        AND (category IN ('REEMBOLSO','JUROS_MORA','TAXA_ADMIN') OR referenceType LIKE 'payment%')`, { replacements: [companyId, dayStart, dayEnd] });
    const mvCount = Number((_a = mvRows[0]) === null || _a === void 0 ? void 0 : _a.n) || 0;
    const mvTotal = (0, money_1.round2)((0, money_1.num)((_b = mvRows[0]) === null || _b === void 0 ? void 0 : _b.total));
    // 3) Recibos dos PAGAMENTOS do dia (não anulados) — por tranzactionId das
    // transacções confirmadas do dia. Não conta recibos de outras origens
    // (ex.: recibos gerados retroactivamente ou de operações não-pagamento).
    const [recRows] = yield db_1.db.query(`SELECT COALESCE(SUM(r.valor_pago),0) AS total, COUNT(*) AS n
       FROM recibos r
      WHERE r.companyId = ?
        AND (r.status = 'EMITIDO' OR r.status IS NULL)
        AND r.tranzactionId IN (
          SELECT id FROM tranzactions
           WHERE companyId = ? AND status = 'CONFIRMED' AND paymentDate = ?
        )`, { replacements: [companyId, companyId, date] });
    const recCount = Number((_c = recRows[0]) === null || _c === void 0 ? void 0 : _c.n) || 0;
    const recTotal = (0, money_1.round2)((0, money_1.num)((_d = recRows[0]) === null || _d === void 0 ? void 0 : _d.total));
    const diffMov = (0, money_1.round2)(mvTotal - txTotal);
    const diffRec = (0, money_1.round2)(recTotal - txTotal);
    // ── POR CONTA DE DESTINO (bank_account_id → accounts) ──
    // Para cada conta REEMBOLSO/MISTO/caixa da empresa: soma das transacções
    // do dia vs saldo actual da conta. (O saldo reflecte TODO o histórico —
    // inclui pagamentos de dias anteriores — por isso a divergência por conta
    // é informativa/diagnóstica; o bloqueio do fecho usa as diferenças do dia.)
    const byAccount = [];
    try {
        const [accounts] = yield db_1.db.query(`SELECT id, bank_name, accountDescription, purpose, balance
         FROM accounts
        WHERE companyId = ? AND is_active = 1
          AND purpose IN ('REEMBOLSO', 'MISTO')
        ORDER BY id`, { replacements: [companyId] });
        for (const acc of accounts) {
            const [sumRows] = yield db_1.db.query(`SELECT COALESCE(SUM(totalAmount),0) AS total FROM tranzactions
          WHERE companyId = ? AND status = 'CONFIRMED'
            AND bank_account_id = ? AND paymentDate = ?`, { replacements: [companyId, Number(acc.id), date] });
            const txTotalAcc = (0, money_1.round2)((0, money_1.num)((_e = sumRows[0]) === null || _e === void 0 ? void 0 : _e.total));
            // Só lista contas com movimento no dia (relatório enxuto)
            if (txTotalAcc === 0)
                continue;
            byAccount.push({
                bank_account_id: Number(acc.id),
                name: String(acc.accountDescription || acc.bank_name || `Conta ${acc.id}`),
                purpose: String(acc.purpose || ""),
                tranzactionsToday: txTotalAcc,
                balanceNow: (0, money_1.round2)((0, money_1.num)(acc.balance)),
            });
        }
    }
    catch ( /* accounts indisponível → secção omitida */_f) { /* accounts indisponível → secção omitida */ }
    return {
        date,
        tranzactions: { count: txCount, total: txTotal, byMethod },
        movements: { count: mvCount, total: mvTotal },
        recibos: { count: recCount, total: recTotal },
        byAccount,
        differences: { movementsVsTranzactions: diffMov, recibosVsTranzactions: diffRec },
        ok: Math.abs(diffMov) <= 0.01 && Math.abs(diffRec) <= 0.01,
    };
});
exports.reconcileDay = reconcileDay;
