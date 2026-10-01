"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
/**
 * Verificação manual do layout do recibo (sem tocar na BD).
 * Uso: npx ts-node --transpile-only src/scripts/verificaRecibo.ts [reciboId]
 * Gera PDF inspeccionável (compress=false) em uploads/docs/verificacao-*.pdf.
 */
const reciboService_1 = require("../services/reciboService");
const certificacao_1 = require("../config/certificacao");
const db_1 = require("../database/db");
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const reciboId = Number(process.argv[2] || 71);
    console.log(`[Verifica] AT_CERTIFICADO_ENABLED = ${certificacao_1.AT_CERTIFICADO_ENABLED}`);
    const detalhe = yield (0, reciboService_1.getReciboDetalhe)(reciboId);
    if (!detalhe) {
        console.error(`[Verifica] Recibo ${reciboId} não encontrado.`);
        process.exit(1);
    }
    const { recibo } = detalhe;
    console.log(`[Verifica] Recibo ${recibo.numero} · ${recibo.customer_name} · ${recibo.valor_pago} MZN`);
    console.log(`[Verifica] Selo na BD: hash_at=${recibo.hash_at ? "PRESENTE" : "ausente"} · qr_code_url=${recibo.qr_code_url ? "PRESENTE" : "ausente"} · at_validation_code=${recibo.at_validation_code || "—"}`);
    const pdfUrl = yield (0, reciboService_1.renderReciboPdf)(reciboId, { compress: false });
    if (!pdfUrl) {
        console.error("[Verifica] Falha ao gerar o PDF de verificação.");
        process.exit(1);
    }
    const fs = yield Promise.resolve().then(() => __importStar(require("fs")));
    const path = yield Promise.resolve().then(() => __importStar(require("path")));
    const abs = path.join(process.cwd(), "uploads", "docs", path.basename(String(pdfUrl)));
    const raw = fs.readFileSync(abs);
    // pdfkit escreve o texto em operações TJ com strings HEX (<4d4252…) ou
    // literais (…), com kerning a repartir os pedaços. Decodifica-se tudo e
    // normaliza para alfanuméricos: detecção fiável do conteúdo impresso.
    const texto = raw.toString("latin1");
    const paginas = (texto.match(/\/Type\s*\/Page[^s]/g) || []).length;
    const normaliza = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const decodifica = (s) => {
        let out = "";
        const re = /<([0-9A-Fa-f]+)>|\(([^)]*)\)/g;
        let m;
        while ((m = re.exec(s)) !== null) {
            if (m[1]) {
                const hex = m[1];
                for (let i = 0; i + 1 < hex.length; i += 2) {
                    out += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
                }
            }
            else if (m[2] !== undefined) {
                out += m[2];
            }
        }
        return out;
    };
    const textoNorm = normaliza(decodifica(texto));
    const menciona = (agulha) => textoNorm.includes(normaliza(agulha));
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
    const ok = certificacao_1.AT_CERTIFICADO_ENABLED
        ? paginas >= 1 && paginas <= 2 && menciona("HASH AT")
        : paginas >= 1 && paginas <= 2 && !menciona("HASH AT") && !menciona("22/2023") && !menciona("validar?rec");
    console.log(`[Verifica] RESULTADO: ${ok ? "OK ✓" : "FALHOU ✗"}`);
    process.exit(ok ? 0 : 2);
});
main()
    .catch((error) => {
    console.error("[Verifica] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
    process.exit(1);
})
    .finally(() => db_1.db.close().catch(() => { }));
