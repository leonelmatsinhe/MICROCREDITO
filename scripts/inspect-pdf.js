/** Inspeciona o PDF gerado: extrai strings de texto dos streams Flate. */
const fs = require("fs");
const zlib = require("zlib");

const file = process.argv[2] || "uploads/docs/smoke/smoke-extracto.pdf";
const buf = fs.readFileSync(file);
const texts = [];
const re = /stream\r?\n([\s\S]*?)endstream/g;
let m;
while ((m = re.exec(buf.toString("latin1")))) {
  try {
    const out = zlib.inflateSync(Buffer.from(m[1], "latin1"));
    const s = out.toString("latin1");
    // pdfkit 0.17: texto em hex strings <...> dentro de TJ/Tj
    const hexes = s.match(/<[0-9a-fA-F\s]+>/g) || [];
    for (const h of hexes) {
      const clean = h.slice(1, -1).replace(/\s+/g, "");
      let txt = "";
      try { txt = Buffer.from(clean, "hex").toString("latin1"); } catch {}
      if (txt) texts.push(txt);
    }
  } catch {}
}
const full = texts.join("");
const probes = [
  "EXTRACTO DO CRÉDITO", "DADOS DO CLIENTE", "RESUMO DO CRÉDITO", "SITUAÇÃO ACTUAL",
  "PLANO DE AMORTIZAÇÃO", "TOTAIS", "Amortização", "Prestação", "Saldo", "Vencimento",
  "300 000,00 MZN", "2,0%", "10 279,11", "182 844,87", "03/10/2026",
  "Documento processado por computador", "Pág. 1/", "Marcelino", "105", "120261347",
];
for (const p of probes) console.log(p.padEnd(18), full.includes(p) ? "OK" : "FALTA");
console.log("--- amostra ---");
console.log(texts.slice(0, 40).join(" | "));
