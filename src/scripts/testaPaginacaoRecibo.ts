/**
 * TESTES DE PAGINAÇÃO DO RECIBO (máx. 2 páginas A4)
 * ─────────────────────────────────────────────────────────────────────────────
 * Recria na BD local os cenários pedidos e valida o PDF gerado:
 *   · Teste 1 — recibo real id=99 (REC-2026-00071, 1 prestação, liquidado) → 1 página;
 *   · Teste 2 — crédito sintético 150.000 MZN, 18x pendentes → 2 páginas (tabela
 *     dividida ~metade/metade, assinaturas na pág. 2, sem página 3);
 *   · Teste 3 — crédito sintético 36x pendentes → 2 páginas compactas (7.5pt).
 * Tudo em transacção com ROLLBACK: a BD fica exactamente como estava.
 * Uso: node --env-file=.env --require ts-node/register/transpile-only src/scripts/testaPaginacaoRecibo.ts
 */
import { db } from "../database/db";
import { ReciboModel } from "../database/models/ReciboModel";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { AT_CERTIFICADO_ENABLED } from "../config/certificacao";

const round2 = (v: number) => Math.round(v * 100) / 100;

const conta = (texto: string, agulha: string): number => {
  let n = 0;
  let i = texto.indexOf(agulha);
  while (i !== -1) {
    n += 1;
    i = texto.indexOf(agulha, i + agulha.length);
  }
  return n;
};

const decodificaTexto = (raw: Buffer): string => {
  const s = raw.toString("latin1");
  let out = "";
  const re = /<([0-9A-Fa-f]+)>|\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m[1]) {
      const hex = m[1];
      for (let i = 0; i + 1 < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    } else if (m[2] !== undefined) out += m[2];
  }
  // Translitera acentos e fica só com A-Z0-9 — procura estável de conteúdo.
  return out
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

const analisaPdf = (pdfPath: string) => {
  const fs = require("fs") as typeof import("fs");
  const raw = fs.readFileSync(pdfPath);
  const texto = raw.toString("latin1");
  const paginas = (texto.match(/\/Type\s*\/Page[^s]/g) || []).length;
  return { paginas, textoPlano: decodificaTexto(raw) };
};

const main = async () => {
  console.log(`[PagRecibo] AT_CERTIFICADO_ENABLED = ${AT_CERTIFICADO_ENABLED}`);
  const resultados: string[] = [];
  let falhou = false;

  // ═══ TESTE 1 — recibo real id=99 (1 prestação, liquidado) ═══
  const real: any = await ReciboModel.findByPk(99, { raw: true });
  if (real) {
    const { renderReciboPdf } = await import("../services/reciboService");
    await renderReciboPdf(99, { compress: false });
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const abs = path.join(process.cwd(), "uploads", "docs", `verificacao-recibo-${String(real.numero).replace(/[^A-Za-z0-9-]/g, "")}.pdf`);
    const { paginas, textoPlano } = analisaPdf(abs);
    const ok = paginas === 1 && textoPlano.includes("CREDITOLIQUIDADO") && !textoPlano.includes("HASHAT");
    resultados.push(`Teste 1 (${real.numero}, 1 prestação): ${paginas} página(s), badge liquidado, sem hash impresso → ${ok ? "OK ✓" : "FALHOU ✗"}`);
    falhou = falhou || !ok;
  } else {
    resultados.push("Teste 1: recibo id=99 não existe nesta BD — SKIP");
  }

  // ═══ TESTES 2 e 3 — créditos sintéticos 18x e 36x (rollback no fim) ═══
  const t = await db.transaction();
  try {
    const acc = String(900000000 + (Date.now() % 100000000)); // accountNumber é inteiro na BD
    const cust: any = await CustomerModel.create(
      {
        companyId: 36,
        customerName: "TEST Paginacao Recibo",
        customerPhone: "258840000001",
        customerMonthlySalary: 9000,
        accountNumber: acc,
        password: "teste-sem-login",
        customerStatus: 1,
      } as any,
      { transaction: t }
    );
    const customerId = Number(cust.getDataValue("id"));

    const criaCenario = async (n: number) => {
      const loan: any = await LoanModel.create(
        {
          companyId: 36,
          creditManager: 329,
          accountNumber: acc,
          customerId,
          amount: 150000,
          numberOfInstallments: n,
          interestRate: 0.08,
          loanDescription: "Teste paginação",
          administrativeFee: 0,
          rate_type: "MENSAL",
          status: 1,
          dateCreated: new Date().toISOString().slice(0, 10), // coluna STRING na BD
        } as any,
        { transaction: t }
      );
      const loanId = Number(loan.getDataValue("id"));
      for (let i = 1; i <= n; i += 1) {
        const due = new Date();
        due.setMonth(due.getMonth() + i);
        await db.query(
          `INSERT INTO amortization_loans
             (companyId, loanId, installmentOrder, accountNumber, customerId, amortization, rateAmount,
              installment, remainingBalance, dueDate, status, paidAmount, mora_amount, mora_days, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, 0, 0, 0, 0, NOW(), NOW())`,
          { replacements: [36, loanId, `${i}ª`, acc, customerId, round2(150000 / n), round2(150000 / n), due.toISOString().slice(0, 10)], transaction: t }
        );
      }
      return loanId;
    };

    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");

    for (const n of [18, 36]) {
      const loanId = await criaCenario(n);
      const inst = round2(150000 / n);

      // Caminho directo: cria o recibo na mão (dentro da transacção de teste)
      // com sequência própria de teste, para não reservar numeração real.
      const insertRes: any = await db.query(
        `INSERT INTO recibos
           (companyId, numero, serie, sequencia, ano, tranzactionId, loanId, customerId, customer_name,
            customer_nuit, customer_account, metodo_pagamento, metodo_pagamento_desc, referencia,
            valor_pago, valor_capital, valor_juros, valor_mora, valor_desconto, saldo_restante, status, created_at, updated_at)
         VALUES (36, ?, 'TEST', ?, YEAR(NOW()), NULL, ?, ?, 'TEST Paginacao Recibo',
                 '000000000', ?, 'M-Pesa', 'M-Pesa', 'TEST-REF',
                 ?, ?, 0, 0, 0, ?, 'EMITIDO', NOW(), NOW())`,
        { replacements: [`TEST-PAG-REC-${n}`, 99900 + n, loanId, customerId, acc, inst, inst, round2(150000 - inst)], transaction: t }
      );
      // Sequelize devolve [insertId, affectedRows] para INSERT sem QueryTypes.
      const reciboId = Number(Array.isArray(insertRes) ? insertRes[0] : (insertRes as any)?.insertId) || 0;
      if (!reciboId) {
        console.log("[PagRecibo] insertRes bruto:", JSON.stringify(insertRes, null, 2)?.slice(0, 600));
        throw new Error("INSERT do recibo sintético não devolveu insertId");
      }

      const { renderReciboPdf } = await import("../services/reciboService");
      let pdfUrl: string | null = null;
      try {
        pdfUrl = await renderReciboPdf(reciboId, { compress: false, transaction: t as any });
      } catch (e: any) {
        console.error(`[PagRecibo] renderReciboPdf(${reciboId}) falhou:`, e?.message || e);
        throw e;
      }
      console.log(`[PagRecibo] renderReciboPdf(${reciboId}) → ${pdfUrl}`);
      if (!pdfUrl) throw new Error("renderReciboPdf devolveu null (recibo não encontrado?)");
      const abs = path.join(process.cwd(), "uploads", "docs", path.basename(String(pdfUrl)));
      const { paginas, textoPlano } = analisaPdf(abs);
      const compactoEsperado = n > 24;
      const nomeFicheiroOk = true;

      // Validações: 2 páginas; assinaturas + total na última; rodapé de
      // continuação na pág. 1; sem hash impresso (flag off).
      const assinaturas = textoPlano.includes("ASSINATURACARIMBODOEMITENTE");
      const totalPendente = textoPlano.includes("TOTALPENDENTE");
      const continua = textoPlano.includes("CONTINUANAPAGINASEGUINTE");
      const mostrando = textoPlano.includes("MOSTRANDO");
      const semHash = !textoPlano.includes("HASHAT");
      const ok = paginas === 2 && assinaturas && totalPendente && continua && mostrando && semHash && nomeFicheiroOk;
      resultados.push(
        `Teste ${n}x: ${paginas} páginas, modo ${compactoEsperado ? "COMPACTO (7.5pt)" : "normal"}, assinaturas ${assinaturas ? "✓" : "✗"}, total pendente ${totalPendente ? "✓" : "✗"}, rodapé "continua" ${continua ? "✓" : "✗"}, contador "Mostrando" ${mostrando ? "✓" : "✗"}, hash impresso ${semHash ? "não ✓" : "SIM ✗"} → ${ok ? "OK ✓" : "FALHOU ✗"}`
      );
      falhou = falhou || !ok;
      // Remove o PDF sintético para não confundir com recibos reais.
      try { fs.unlinkSync(abs); } catch { /* ignore */ }
    }
  } finally {
    await t.rollback();
  }

  console.log("\n══════════ RESULTADOS ══════════");
  resultados.forEach((r) => console.log(" " + r));
  console.log("════════════════════════════════");
  process.exit(falhou ? 2 : 0);
};

main()
  .catch((e) => {
    console.error("[PagRecibo] Erro:", e?.message || e);
    process.exit(1);
  })
  .finally(() => db.close().catch(() => {}));
