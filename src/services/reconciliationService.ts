import { db } from "../database/db";
import { round2, num } from "../utils/money";

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

export const reconcileDay = async (
  companyId: number,
  date: string
): Promise<{
  date: string;
  tranzactions: { count: number; total: number; byMethod: Record<string, number> };
  movements: { count: number; total: number };
  recibos: { count: number; total: number };
  byAccount: Array<{
    bank_account_id: number;
    name: string;
    purpose: string;
    tranzactionsToday: number;
    balanceNow: number;
  }>;
  differences: { movementsVsTranzactions: number; recibosVsTranzactions: number };
  ok: boolean;
}> => {
  const dayStart = `${date} 00:00:00`;
  const dayEnd = `${date} 23:59:59`;

  // 1) Transacções CONFIRMED do dia (por paymentDate — data efectiva do pagamento)
  const [txRows]: any = await db.query(
    `SELECT paymentMethod, COALESCE(SUM(totalAmount),0) AS total, COUNT(*) AS n
       FROM tranzactions
      WHERE companyId = ? AND status = 'CONFIRMED'
        AND paymentDate = ?
      GROUP BY paymentMethod`,
    { replacements: [companyId, date] }
  );
  const byMethod: Record<string, number> = {};
  let txCount = 0;
  let txTotal = 0;
  for (const row of txRows as any[]) {
    const method = String(row.paymentMethod);
    const total = round2(num(row.total));
    byMethod[method] = round2((byMethod[method] || 0) + total);
    txTotal = round2(txTotal + total);
    txCount += Number(row.n) || 0;
  }

  // 2) Movimentos de caixa ENTRADA do dia ligados a pagamentos
  // (cash_movements usa camelCase: createdAt)
  const [mvRows]: any = await db.query(
    `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS n
       FROM cash_movements
      WHERE companyId = ? AND type = 'ENTRADA'
        AND createdAt BETWEEN ? AND ?
        AND (category IN ('REEMBOLSO','JUROS_MORA','TAXA_ADMIN') OR referenceType LIKE 'payment%')`,
    { replacements: [companyId, dayStart, dayEnd] }
  );
  const mvCount = Number((mvRows as any[])[0]?.n) || 0;
  const mvTotal = round2(num((mvRows as any[])[0]?.total));

  // 3) Recibos dos PAGAMENTOS do dia (não anulados) — por tranzactionId das
  // transacções confirmadas do dia. Não conta recibos de outras origens
  // (ex.: recibos gerados retroactivamente ou de operações não-pagamento).
  const [recRows]: any = await db.query(
    `SELECT COALESCE(SUM(r.valor_pago),0) AS total, COUNT(*) AS n
       FROM recibos r
      WHERE r.companyId = ?
        AND (r.status = 'EMITIDO' OR r.status IS NULL)
        AND r.tranzactionId IN (
          SELECT id FROM tranzactions
           WHERE companyId = ? AND status = 'CONFIRMED' AND paymentDate = ?
        )`,
    { replacements: [companyId, companyId, date] }
  );
  const recCount = Number((recRows as any[])[0]?.n) || 0;
  const recTotal = round2(num((recRows as any[])[0]?.total));

  const diffMov = round2(mvTotal - txTotal);
  const diffRec = round2(recTotal - txTotal);

  // ── POR CONTA DE DESTINO (bank_account_id → accounts) ──
  // Para cada conta REEMBOLSO/MISTO/caixa da empresa: soma das transacções
  // do dia vs saldo actual da conta. (O saldo reflecte TODO o histórico —
  // inclui pagamentos de dias anteriores — por isso a divergência por conta
  // é informativa/diagnóstica; o bloqueio do fecho usa as diferenças do dia.)
  const byAccount: Array<{
    bank_account_id: number;
    name: string;
    purpose: string;
    tranzactionsToday: number;
    balanceNow: number;
  }> = [];
  try {
    const [accounts]: any = await db.query(
      `SELECT id, bank_name, accountDescription, purpose, balance
         FROM accounts
        WHERE companyId = ? AND is_active = 1
          AND purpose IN ('REEMBOLSO', 'MISTO')
        ORDER BY id`,
      { replacements: [companyId] }
    );
    for (const acc of accounts as any[]) {
      const [sumRows]: any = await db.query(
        `SELECT COALESCE(SUM(totalAmount),0) AS total FROM tranzactions
          WHERE companyId = ? AND status = 'CONFIRMED'
            AND bank_account_id = ? AND paymentDate = ?`,
        { replacements: [companyId, Number(acc.id), date] }
      );
      const txTotalAcc = round2(num((sumRows as any[])[0]?.total));
      // Só lista contas com movimento no dia (relatório enxuto)
      if (txTotalAcc === 0) continue;
      byAccount.push({
        bank_account_id: Number(acc.id),
        name: String(acc.accountDescription || acc.bank_name || `Conta ${acc.id}`),
        purpose: String(acc.purpose || ""),
        tranzactionsToday: txTotalAcc,
        balanceNow: round2(num(acc.balance)),
      });
    }
  } catch { /* accounts indisponível → secção omitida */ }

  return {
    date,
    tranzactions: { count: txCount, total: txTotal, byMethod },
    movements: { count: mvCount, total: mvTotal },
    recibos: { count: recCount, total: recTotal },
    byAccount,
    differences: { movementsVsTranzactions: diffMov, recibosVsTranzactions: diffRec },
    ok: Math.abs(diffMov) <= 0.01 && Math.abs(diffRec) <= 0.01,
  };
};
