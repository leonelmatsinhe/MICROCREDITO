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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMissingPackages = exports.buildConcessionZip = exports.readConcessionDoc = exports.findConcessionPackage = exports.generateConcessionPackage = exports.PackageAlreadyIssuedError = exports.DOCS_DO_PACOTE = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../database/db");
const legalDocsService_1 = require("./legalDocsService");
const paymentsV2Models_1 = require("../database/models/paymentsV2Models");
const qrcode_1 = __importDefault(require("qrcode"));
const reciboService_1 = require("./reciboService");
/**
 * PACOTE DE CONCESSÃO — documentos legais IMUTÁVEIS do crédito
 * ---------------------------------------------------------------------------
 * FLUXO 1 (imutável): gerado UMA única vez, automaticamente, após o
 * desembolso. Contém: termo | garantias | contrato | plano (PDFs).
 *  · cada PDF é gravado em uploads/concessao/<companyId>/<loanId>/;
 *  · package_hash = SHA-256 do conteúdo concatenado dos PDFs — grava na
 *    tabela concession_packages e é impresso no rodapé de cada documento;
 *  · um QR por crédito aponta para a validação pública (rec=PLANO-<loanId>);
 *  · nova tentativa de geração → 409 PACKAGE_ALREADY_ISSUED (só "invalidar
 *    desembolso" apaga o pacote, porque reverte o próprio desembolso);
 *  · downloads ficam no audit_log (ação CONCESSION_DOWNLOAD).
 *
 * FLUXO 2 (extrato dinâmico) NÃO passa aqui — é gerado on-demand em memória
 * pelo LegalDocsController (renderLegalDoc) e nunca persiste.
 */
exports.DOCS_DO_PACOTE = [
    { key: "termo", label: "Termo de Compromisso", file: "termo-compromisso" },
    { key: "garantias", label: "Declaração de Garantias", file: "declaracao-garantias" },
    { key: "contrato", label: "Contrato de Concessão", file: "contrato-concessao" },
    { key: "plano", label: "Plano Inicial de Amortização", file: "plano-inicial" },
];
class PackageAlreadyIssuedError extends Error {
    constructor(packageId, createdAt) {
        super("PACKAGE_ALREADY_ISSUED");
        this.packageId = packageId;
        this.createdAt = createdAt;
    }
}
exports.PackageAlreadyIssuedError = PackageAlreadyIssuedError;
const pacoteDir = (companyId, loanId) => path_1.default.join(process.cwd(), "uploads", "concessao", String(companyId), String(loanId));
const qrPathFor = (companyId, loanId) => path_1.default.join(process.cwd(), "uploads", "recibos", String(companyId), String(loanId), "QR-PACOTE.png");
const hashOf = (buffers) => crypto_1.default.createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
/**
 * Gera (uma única vez) o pacote completo de um crédito desembolsado.
 * Idempotente-bloqueante: se já existe, lança PackageAlreadyIssuedError.
 */
const generateConcessionPackage = (params) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { loanId, companyId } = params;
    const existing = yield db_1.db.query("SELECT id, created_at FROM concession_packages WHERE loanId = ? LIMIT 1", { replacements: [loanId] }).then(([rows]) => rows[0]);
    if (existing)
        throw new PackageAlreadyIssuedError(Number(existing.id), existing.created_at);
    const data = yield (0, legalDocsService_1.loadLegalDocsData)(loanId);
    if (!data || !data.loan)
        throw new Error("Crédito não encontrado para o pacote de concessão.");
    const loanStatus = Number(data.loan.getDataValue("status"));
    if (loanStatus !== 1 && loanStatus !== 3) {
        throw new Error("Só créditos desembolsados (status 1/3) têm pacote de concessão.");
    }
    const dir = pacoteDir(companyId, loanId);
    yield fs_1.default.promises.mkdir(dir, { recursive: true });
    // QR de validação do pacote (um por crédito, embutido nos 4 rodapés)
    let qrPath = null;
    try {
        const qp = qrPathFor(companyId, loanId);
        yield fs_1.default.promises.mkdir(path_1.default.dirname(qp), { recursive: true });
        yield qrcode_1.default.toFile(qp, (0, reciboService_1.validationUrl)({ numero: `PLANO-${loanId}`, hash: "CONCESSAO" }), { width: 300, margin: 1 });
        qrPath = qp;
    }
    catch (e) {
        console.error("[Concessao] QR do pacote falhou (segue sem QR):", e === null || e === void 0 ? void 0 : e.message);
    }
    const emitidoEm = new Date();
    const docs = {};
    const buffers = [];
    for (const docDef of exports.DOCS_DO_PACOTE) {
        const pdf = yield (0, legalDocsService_1.renderLegalDoc)(docDef.key, data, {
            // Rodapé dos PDFs é agora TEXTO SIMPLES (sem QR nem hash sobreposto):
            // a imutabilidade vive no registo concession_packages, no hash SHA-256
            // dos 4 PDFs e no QR-PACOTE.png distribuído no ZIP.
            emitidoEm,
        });
        const fileName = `${docDef.file}-conta-${data.loan.getDataValue("accountNumber")}-${loanId}.pdf`;
        yield fs_1.default.promises.writeFile(path_1.default.join(dir, fileName), pdf);
        buffers.push(pdf);
        docs[docDef.key] = {
            file: fileName,
            bytes: pdf.length,
            hash: crypto_1.default.createHash("sha256").update(pdf).digest("hex"),
        };
    }
    // Hash do pacote: SHA-256 dos 4 PDFs concatenados + loanId (estável).
    const packageHash = hashOf([Buffer.from(String(loanId)), ...buffers]);
    const [result] = yield db_1.db.query(`INSERT INTO concession_packages
       (companyId, loanId, accountNumber, customerId, status, package_hash, storage_dir, docs, created_by)
     VALUES (?, ?, ?, ?, 'EMITIDO', ?, ?, ?, ?)`, {
        replacements: [
            companyId,
            loanId,
            String(data.loan.getDataValue("accountNumber") || ""),
            data.loan.getDataValue("customerId") || null,
            packageHash,
            path_1.default.relative(process.cwd(), dir),
            JSON.stringify(docs),
            (_a = params.createdBy) !== null && _a !== void 0 ? _a : null,
        ],
    });
    const pacoteId = Number((result === null || result === void 0 ? void 0 : result.insertId) || result || 0);
    try {
        yield paymentsV2Models_1.AuditLogModel.create({
            user_id: (_b = params.createdBy) !== null && _b !== void 0 ? _b : null,
            company_id: companyId,
            ip: params.ip || null,
            action: "CONCESSION_EMIT",
            entity: "concession_packages",
            entity_id: pacoteId,
            before_data: null,
            after_data: { loanId, package_hash: packageHash, docs: Object.keys(docs) },
        });
    }
    catch ( /* audit best-effort */_c) { /* audit best-effort */ }
    return { id: pacoteId, docs, package_hash: packageHash, storage_dir: path_1.default.relative(process.cwd(), dir) };
});
exports.generateConcessionPackage = generateConcessionPackage;
/** Metadados do pacote (ou null se ainda não emitido). */
const findConcessionPackage = (loanId) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.db.query("SELECT * FROM concession_packages WHERE loanId = ? LIMIT 1", { replacements: [loanId] });
    return rows[0] || null;
});
exports.findConcessionPackage = findConcessionPackage;
/** Lê um PDF do pacote do disco (docs JSON: termo|garantias|contrato|plano). */
const readConcessionDoc = (loanId, key) => __awaiter(void 0, void 0, void 0, function* () {
    const pacote = yield (0, exports.findConcessionPackage)(loanId);
    if (!pacote)
        return null;
    const docs = typeof pacote.docs === "string" ? JSON.parse(pacote.docs) : pacote.docs || {};
    const entry = docs[key];
    if (!(entry === null || entry === void 0 ? void 0 : entry.file))
        return null;
    const abs = path_1.default.join(process.cwd(), pacote.storage_dir || "", entry.file);
    if (!fs_1.default.existsSync(abs))
        return null;
    return { buffer: yield fs_1.default.promises.readFile(abs), fileName: entry.file };
});
exports.readConcessionDoc = readConcessionDoc;
/**
 * ZIP do pacote completo — implementado sem dependência nova (store method do
 * formato ZIP: entradas sem compressão, CRC32 próprio). Documentos PDF já são
 * comprimidos internamente pelo pdfkit; o ZIP de store mantém o pacote válido.
 */
const buildConcessionZip = (loanId) => __awaiter(void 0, void 0, void 0, function* () {
    const pacote = yield (0, exports.findConcessionPackage)(loanId);
    if (!pacote)
        return null;
    const docs = typeof pacote.docs === "string" ? JSON.parse(pacote.docs) : pacote.docs || {};
    const dirAbs = path_1.default.join(process.cwd(), pacote.storage_dir || "");
    const crcTable = (() => {
        const t = [];
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++)
                c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c >>> 0;
        }
        return t;
    })();
    const crc32 = (buf) => {
        let c = 0xffffffff;
        for (const b of buf)
            c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
    };
    const entries = [];
    for (const [key, entry] of Object.entries(docs)) {
        const abs = path_1.default.join(dirAbs, entry.file);
        if (!fs_1.default.existsSync(abs))
            continue;
        const data = yield fs_1.default.promises.readFile(abs);
        entries.push({ name: Buffer.from(entry.file, "utf8"), data, crc: crc32(data), size: data.length });
    }
    if (entries.length === 0)
        return null;
    const chunks = [];
    const central = [];
    let offset = 0;
    const dosTime = (() => {
        const d = new Date(pacote.created_at || new Date());
        return ((d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2))) & 0xffff;
    })();
    const dosDate = (() => {
        const d = new Date(pacote.created_at || new Date());
        return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
    })();
    for (const e of entries) {
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4); // versão
        local.writeUInt16LE(0x0800, 6); // UTF-8
        local.writeUInt16LE(0, 8); // store
        local.writeUInt16LE(dosTime, 10);
        local.writeUInt16LE(dosDate, 12);
        local.writeUInt32LE(e.crc, 14);
        local.writeUInt32LE(e.size, 18);
        local.writeUInt32LE(e.size, 22);
        local.writeUInt16LE(e.name.length, 26);
        local.writeUInt16LE(0, 28);
        chunks.push(local, e.name, e.data);
        const cd = Buffer.alloc(46);
        cd.writeUInt32LE(0x02014b50, 0);
        cd.writeUInt16LE(20, 4);
        cd.writeUInt16LE(20, 6);
        cd.writeUInt16LE(0x0800, 8);
        cd.writeUInt16LE(0, 10);
        cd.writeUInt16LE(dosTime, 12);
        cd.writeUInt16LE(dosDate, 14);
        cd.writeUInt32LE(e.crc, 16);
        cd.writeUInt32LE(e.size, 20);
        cd.writeUInt32LE(e.size, 24);
        cd.writeUInt16LE(e.name.length, 28);
        cd.writeUInt32LE(offset, 42);
        central.push(cd, e.name);
        offset += 30 + e.name.length + e.size;
    }
    const centralBuf = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralBuf.length, 12);
    end.writeUInt32LE(offset, 16);
    chunks.push(centralBuf, end);
    return {
        buffer: Buffer.concat(chunks),
        fileName: `concessao-conta-${pacote.accountNumber}-${loanId}.zip`,
    };
});
exports.buildConcessionZip = buildConcessionZip;
/**
 * Gera pacotes em falta (chamado pelo hook pós-desembolso e pelo job de
 * arranque): só toca em créditos status 1/3 sem pacote.
 */
const generateMissingPackages = (limit = 10) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.db.query(`SELECT l.id, l.companyId FROM customer_loans l
      LEFT JOIN concession_packages cp ON cp.loanId = l.id
      WHERE cp.id IS NULL AND l.status IN (1, 3)
      ORDER BY l.id DESC LIMIT ?`, { replacements: [limit] });
    let gerados = 0;
    for (const row of rows) {
        try {
            yield (0, exports.generateConcessionPackage)({ loanId: Number(row.id), companyId: Number(row.companyId), createdBy: null, ip: null });
            gerados += 1;
            console.log(`[Concessao] Pacote gerado para crédito #${row.id} (backfill)`);
        }
        catch (e) {
            if (String(e === null || e === void 0 ? void 0 : e.message) !== "PACKAGE_ALREADY_ISSUED") {
                console.error(`[Concessao] Falha no backfill do crédito #${row.id}:`, (e === null || e === void 0 ? void 0 : e.message) || e);
            }
        }
    }
    return gerados;
});
exports.generateMissingPackages = generateMissingPackages;
