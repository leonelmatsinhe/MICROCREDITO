/**
 * Verificação manual do layout do recibo (sem tocar na BD).
 * Uso: npx ts-node --transpile-only src/scripts/verificaRecibo.ts [reciboId]
 * Gera PDF inspeccionável (compress=false) em uploads/docs/verificacao-*.pdf.
 */
import { getReciboDetalhe, renderReciboPdf } from "../services/reciboService";
import { AT_CERTIFICADO_ENABLED } from "../config/certificacao";
import { db } from "../database/db";

const main = async () => {
  const reciboId = Number(process.argv[2] || 71);
  console.log(`[Verifica] AT_CERTIFICADO_ENABLED = ${AT_CERTIFICADO_ENABLED}`);

  const detalhe = await getReciboDetalhe(reciboId);
  if (!detalhe) {
    console.error(`[Verifica] Recibo ${reciboId} não encontrado.`);
    process.exit(1);
  }

  const { recibo } = detalhe;
  console.log(`[Verifica] Recibo ${recibo.numero} · ${recibo.customer_name} · ${recibo.valor_pago} MZN`);
  console.log(`[Verifica] Selo na BD: hash_at=${recibo.hash_at ? "PRESENTE" : "ausente"} · qr_code_url=${recibo.qr_code_url ? "PRESENTE" : "ausente"} · at_validation_code=${recibo.at_validation_code || "—"}`);

  const pdfUrl = await renderReciboPdf(reciboId, { compress: false });
  if (!pdfUrl) {
    console.error("[Verifica] Falha ao gerar o PDF de verificação.");
    process.exit(1);
  }

  const fs = await import("fs");
  const path = await import("path");
  const abs = path.join(process.cwd(), "uploads", "docs", path.basename(String(pdfUrl)));
  const raw = fs.readFileSync(abs);
  // pdfkit escreve o texto em operações TJ com strings HEX (<4d4252…) ou
  // literais (…), com kerning a repartir os pedaços. Decodifica-se tudo e
  // normaliza para alfanuméricos: detecção fiável do conteúdo impresso.
  const texto = raw.toString("latin1");
  const paginas = (texto.match(/\/Type\s*\/Page[^s]/g) || []).length;
  const normaliza = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const decodifica = (s: string): string => {
    let out = "";
    const re = /<([0-9A-Fa-f]+)>|\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      if (m[1]) {
        const hex = m[1];
        for (let i = 0; i + 1 < hex.length; i += 2) {
          out += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
      } else if (m[2] !== undefined) {
        out += m[2];
      }
    }
    return out;
  };
  const textoNorm = normaliza(decodifica(texto));
  const menciona = (agulha: string) => textoNorm.includes(normaliza(agulha));

  console.log(`[Verifica] PDF gerado: ${abs}`);
  console.log(`[Verifica] Páginas: ${paginas}`);
  console.log(`[Verifica] Hash (primeiros 24 chars) no PDF: ${recibo.hash_at ? menciona(recibo.hash_at.slice(0, 24)) : "sem hash na BD"}`);
  console.log(`[Verifica] Código validação no PDF: ${recibo.at_validation_code ? menciona(String(recibo.at_validation_code)) : "sem código na BD"}`);
  console.log(`[Verifica] "HASH AT" no PDF: ${menciona("HASH AT")}`);
  console.log(`[Verifica] Decreto 22/2023 no PDF: ${menciona("22/2023")}`);
  console.log(`[Verifica] "maismola.co.mz/validar" no PDF: ${menciona("validar?rec")}`);

  // Esperado com flag=false: 1–2 páginas (o extrato de prestações pode partir
  // para a página 2 quando há >6 pendentes), sem hash/código/decreto/validar.
  // Esperado com flag=true: pode ter 2 páginas, com selo impresso.
  const ok = AT_CERTIFICADO_ENABLED
    ? paginas >= 1 && paginas <= 2 && menciona("HASH AT")
    : paginas >= 1 && paginas <= 2 && !menciona("HASH AT") && !menciona("22/2023") && !menciona("validar?rec");
  console.log(`[Verifica] RESULTADO: ${ok ? "OK ✓" : "FALHOU ✗"}`);
  process.exit(ok ? 0 : 2);
};

main()
  .catch((error) => {
    console.error("[Verifica] Erro:", error?.message || error);
    process.exit(1);
  })
  .finally(() => db.close().catch(() => {}));
