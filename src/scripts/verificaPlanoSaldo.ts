/**
 * Verificação do SALDO (padrão MBR) no Plano Inicial / Extracto do Crédito.
 *
 * Uso: node --env-file=.env --require ts-node/register/transpile-only src/scripts/verificaPlanoSaldo.ts [loanId ...]
 * Sem argumentos testa os créditos de prova: 62 (conta 101, 90k/18x) e 76 (conta 108, 7.5k/1x pago).
 *
 * Gera o extracto em uploads/docs/ e confere no TEXTO do PDF:
 *  1. 1ª linha do saldo = capital financiado − 1ª amortização;
 *  2. última linha do saldo = 0,00 (fecho do plano);
 *  3. TOTAIS do plano com saldo 0,00;
 *  4. Situação Actual: Saldo Remanescente = CAPITAL remanescente (0,00 se tudo pago).
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { loadLegalDocsData, renderLegalDoc } from "../services/legalDocsService";
import { db } from "../database/db";

const round2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

const fmt = (v: number): string =>
  `${round2(v).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;

/** Normaliza para [A-Z0-9] (os PDFs partem o texto em pedaços hex/literais). */
const norm = (s: string): string => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Extrai e decodifica o texto de um PDF pdfkit (streams FlateDecode). */
const extrairTexto = (pdf: Buffer): string => {
  const s = pdf.toString("latin1");
  let conteudo = "";
  const re = /stream\r?\n([\s\S]*?)endstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    let buf = Buffer.from(m[1], "latin1");
    try { buf = zlib.inflateSync(buf); } catch { try { buf = zlib.inflateRawSync(buf); } catch { continue; } }
    conteudo += buf.toString("latin1");
  }
  let texto = "";
  const tre = /<([0-9A-Fa-f]+)>|\(([^)]*)\)/g;
  let tm: RegExpExecArray | null;
  while ((tm = tre.exec(conteudo)) !== null) {
    if (tm[1]) {
      const h = tm[1];
      for (let i = 0; i + 1 < h.length; i += 2) texto += String.fromCharCode(parseInt(h.substr(i, 2), 16));
    } else if (tm[2] !== undefined) texto += tm[2];
  }
  return texto;
};

const main = async () => {
  const ids = process.argv.slice(2).map(Number).filter(Boolean);
  const alvos = ids.length > 0 ? ids : [62, 76];
  let falhas = 0;

  for (const loanId of alvos) {
    const data = await loadLegalDocsData(loanId);
    if (!data || !data.loan) {
      console.log(`[Saldo] Crédito ${loanId}: NÃO ENCONTRADO`);
      falhas += 1;
      continue;
    }

    const conta = String(data.loan.getDataValue("accountNumber") || "");
    const capital = round2(parseFloat(data.loan.getDataValue("amount")) || 0);
    const prest: any[] = data.amortizations;

    // Mesma lógica do PDF: amortizações ajustadas para fechar o capital exacto.
    const amort = prest.map((r) =>
      r.amortization != null
        ? parseFloat(r.amortization) || 0
        : Math.max(0, round2((parseFloat(r.installment) || 0) - (parseFloat(r.rateAmount) || 0)))
    );
    const somaAmort = round2(amort.reduce((s, v) => s + v, 0));
    const diff = round2(capital - somaAmort);
    if (Math.abs(diff) >= 0.01 && amort.length > 0) {
      amort[amort.length - 1] = round2(amort[amort.length - 1] + diff);
    }
    let saldoCorrente = capital;
    const saldoPorLinha: number[] = amort.map((a, idx) => {
      saldoCorrente = Math.max(0, round2(saldoCorrente - a));
      return idx === amort.length - 1 ? 0 : saldoCorrente;
    });

    const totalJuros = round2(prest.reduce((s, r) => s + (parseFloat(r.rateAmount) || 0), 0));
    const totalPrest = round2(prest.reduce((s, r) => s + (parseFloat(r.installment) || 0), 0));
    const totalPago = round2(prest.reduce((s, r) => s + (parseFloat(r.paidAmount) || 0), 0));
    const capitalPago = prest.reduce((s, r, idx) => {
      const juros = parseFloat(r.rateAmount) || 0;
      const pago = parseFloat(r.paidAmount) || 0;
      return s + Math.max(0, Math.min(amort[idx], pago - juros));
    }, 0);
    const saldoRemanescente = round2(Math.max(0, capital - capitalPago));

    const pdf = await renderLegalDoc("extracto", data);
    const destino = path.join(process.cwd(), "uploads", "docs", `verificacao-extracto-conta-${conta}.pdf`);
    fs.writeFileSync(destino, pdf);
    const texto = norm(extrairTexto(pdf));

    const ultima = prest[prest.length - 1];
    // dd/mm/aaaa (formato impresso pelo PDF)
    const ultimaVenc = String(ultima?.dueDate || "").slice(0, 10).split("-").reverse().join("/");

    const check = (nomeCheck: string, ok: boolean, esperado: string) => {
      console.log(`  ${ok ? "OK ✓" : "FALHOU ✗"} — ${nomeCheck} (esperado: ${esperado})`);
      if (!ok) falhas += 1;
    };

    console.log(`\n[Saldo] Crédito #${loanId} · conta ${conta} · ${fmt(capital)} · ${prest.length}x · status ${data.loan.getDataValue("status")}`);
    console.log(`[Saldo] PDF: ${destino}`);
    check("1ª linha do saldo = capital − 1ª amortização", texto.includes(norm(fmt(saldoPorLinha[0] ?? 0))), fmt(saldoPorLinha[0] ?? 0));
    check(
      "última linha do saldo = 0,00 (prestação + saldo 0 + vencimento)",
      texto.includes(norm(`${fmt(parseFloat(ultima?.installment) || 0)}${fmt(0)}${ultimaVenc}`)),
      `${fmt(parseFloat(ultima?.installment) || 0)} · 0,00 MZN · ${ultimaVenc}`
    );
    check("TOTAIS do plano com saldo 0,00", texto.includes(norm(`TOTAIS${fmt(capital)}${fmt(totalJuros)}${fmt(totalPrest)}${fmt(0)}`)), `TOTAIS ${fmt(capital)} ${fmt(totalJuros)} ${fmt(totalPrest)} 0,00 MZN`);
    check(
      "Situação Actual: Saldo Remanescente = capital remanescente",
      texto.includes(norm(`${fmt(totalPago)}${fmt(saldoRemanescente)}${prest.filter((r) => Number(r.status) === 1).length}DE${prest.length}`)),
      `Total Pago ${fmt(totalPago)} · Saldo Remanescente ${fmt(saldoRemanescente)}`
    );
    // Pré-visualização do saldo por linha (1ª, 2ª, penúltima, última)
    const mostra = [0, 1, prest.length - 2, prest.length - 1].filter((i, k, arr) => i >= 0 && arr.indexOf(i) === k);
    console.log(`  saldos: ${mostra.map((i) => `${i + 1}ª ${fmt(saldoPorLinha[i] ?? 0)}`).join(" · ")}`);
  }

  console.log(`\n[Saldo] RESULTADO: ${falhas === 0 ? "OK ✓ (todos os checks passaram)" : `FALHOU ✗ (${falhas} check(s))`}`);
  process.exit(falhas === 0 ? 0 : 2);
};

main()
  .catch((error) => {
    console.error("[Saldo] Erro:", error?.message || error);
    process.exit(1);
  })
  .finally(() => db.close().catch(() => {}));
