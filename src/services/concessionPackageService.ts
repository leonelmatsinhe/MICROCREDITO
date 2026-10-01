import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../database/db";
import { loadLegalDocsData, renderLegalDoc } from "./legalDocsService";
import { AuditLogModel } from "../database/models/paymentsV2Models";
import QRCode from "qrcode";
import { validationUrl } from "./reciboService";

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

export const DOCS_DO_PACOTE: Array<{ key: string; label: string; file: string }> = [
  { key: "termo", label: "Termo de Compromisso", file: "termo-compromisso" },
  { key: "garantias", label: "Declaração de Garantias", file: "declaracao-garantias" },
  { key: "contrato", label: "Contrato de Concessão", file: "contrato-concessao" },
  { key: "plano", label: "Plano Inicial de Amortização", file: "plano-inicial" },
];

export class PackageAlreadyIssuedError extends Error {
  constructor(public packageId: number, public createdAt: any) {
    super("PACKAGE_ALREADY_ISSUED");
  }
}

const pacoteDir = (companyId: number, loanId: number) =>
  path.join(process.cwd(), "uploads", "concessao", String(companyId), String(loanId));

const qrPathFor = (companyId: number, loanId: number) =>
  path.join(process.cwd(), "uploads", "recibos", String(companyId), String(loanId), "QR-PACOTE.png");

const hashOf = (buffers: Buffer[]): string =>
  crypto.createHash("sha256").update(Buffer.concat(buffers)).digest("hex");

/**
 * Gera (uma única vez) o pacote completo de um crédito desembolsado.
 * Idempotente-bloqueante: se já existe, lança PackageAlreadyIssuedError.
 */
export const generateConcessionPackage = async (params: {
  loanId: number;
  companyId: number;
  createdBy?: number | null;
  ip?: string | null;
}): Promise<{ id: number; docs: any; package_hash: string; storage_dir: string }> => {
  const { loanId, companyId } = params;

  const existing: any = await db.query(
    "SELECT id, created_at FROM concession_packages WHERE loanId = ? LIMIT 1",
    { replacements: [loanId] }
  ).then(([rows]: any) => (rows as any[])[0]);
  if (existing) throw new PackageAlreadyIssuedError(Number(existing.id), existing.created_at);

  const data = await loadLegalDocsData(loanId);
  if (!data || !data.loan) throw new Error("Crédito não encontrado para o pacote de concessão.");

  const loanStatus = Number(data.loan.getDataValue("status"));
  if (loanStatus !== 1 && loanStatus !== 3) {
    throw new Error("Só créditos desembolsados (status 1/3) têm pacote de concessão.");
  }

  const dir = pacoteDir(companyId, loanId);
  await fs.promises.mkdir(dir, { recursive: true });

  // QR de validação do pacote (um por crédito, embutido nos 4 rodapés)
  let qrPath: string | null = null;
  try {
    const qp = qrPathFor(companyId, loanId);
    await fs.promises.mkdir(path.dirname(qp), { recursive: true });
    await QRCode.toFile(
      qp,
      validationUrl({ numero: `PLANO-${loanId}`, hash: "CONCESSAO" }),
      { width: 300, margin: 1 }
    );
    qrPath = qp;
  } catch (e: any) {
    console.error("[Concessao] QR do pacote falhou (segue sem QR):", e?.message);
  }

  const emitidoEm = new Date();
  const docs: Record<string, { file: string; bytes: number; hash: string }> = {};
  const buffers: Buffer[] = [];

  for (const docDef of DOCS_DO_PACOTE) {
    const pdf: Buffer = await renderLegalDoc(docDef.key, data, {
      // Rodapé dos PDFs é agora TEXTO SIMPLES (sem QR nem hash sobreposto):
      // a imutabilidade vive no registo concession_packages, no hash SHA-256
      // dos 4 PDFs e no QR-PACOTE.png distribuído no ZIP.
      emitidoEm,
    });
    const fileName = `${docDef.file}-conta-${data.loan.getDataValue("accountNumber")}-${loanId}.pdf`;
    await fs.promises.writeFile(path.join(dir, fileName), pdf);
    buffers.push(pdf);
    docs[docDef.key] = {
      file: fileName,
      bytes: pdf.length,
      hash: crypto.createHash("sha256").update(pdf).digest("hex"),
    };
  }

  // Hash do pacote: SHA-256 dos 4 PDFs concatenados + loanId (estável).
  const packageHash = hashOf([Buffer.from(String(loanId)), ...buffers]);

  const [result]: any = await db.query(
    `INSERT INTO concession_packages
       (companyId, loanId, accountNumber, customerId, status, package_hash, storage_dir, docs, created_by)
     VALUES (?, ?, ?, ?, 'EMITIDO', ?, ?, ?, ?)`,
    {
      replacements: [
        companyId,
        loanId,
        String(data.loan.getDataValue("accountNumber") || ""),
        data.loan.getDataValue("customerId") || null,
        packageHash,
        path.relative(process.cwd(), dir),
        JSON.stringify(docs),
        params.createdBy ?? null,
      ],
    }
  );
  const pacoteId = Number(result?.insertId || result || 0);

  try {
    await AuditLogModel.create({
      user_id: params.createdBy ?? null,
      company_id: companyId,
      ip: params.ip || null,
      action: "CONCESSION_EMIT",
      entity: "concession_packages",
      entity_id: pacoteId,
      before_data: null,
      after_data: { loanId, package_hash: packageHash, docs: Object.keys(docs) },
    } as any);
  } catch { /* audit best-effort */ }

  return { id: pacoteId, docs, package_hash: packageHash, storage_dir: path.relative(process.cwd(), dir) };
};

/** Metadados do pacote (ou null se ainda não emitido). */
export const findConcessionPackage = async (loanId: number): Promise<any | null> => {
  const [rows]: any = await db.query(
    "SELECT * FROM concession_packages WHERE loanId = ? LIMIT 1",
    { replacements: [loanId] }
  );
  return (rows as any[])[0] || null;
};

/** Lê um PDF do pacote do disco (docs JSON: termo|garantias|contrato|plano). */
export const readConcessionDoc = async (loanId: number, key: string): Promise<{ buffer: Buffer; fileName: string } | null> => {
  const pacote: any = await findConcessionPackage(loanId);
  if (!pacote) return null;
  const docs = typeof pacote.docs === "string" ? JSON.parse(pacote.docs) : pacote.docs || {};
  const entry = docs[key];
  if (!entry?.file) return null;
  const abs = path.join(process.cwd(), pacote.storage_dir || "", entry.file);
  if (!fs.existsSync(abs)) return null;
  return { buffer: await fs.promises.readFile(abs), fileName: entry.file };
};

/**
 * ZIP do pacote completo — implementado sem dependência nova (store method do
 * formato ZIP: entradas sem compressão, CRC32 próprio). Documentos PDF já são
 * comprimidos internamente pelo pdfkit; o ZIP de store mantém o pacote válido.
 */
export const buildConcessionZip = async (loanId: number): Promise<{ buffer: Buffer; fileName: string } | null> => {
  const pacote: any = await findConcessionPackage(loanId);
  if (!pacote) return null;
  const docs = typeof pacote.docs === "string" ? JSON.parse(pacote.docs) : pacote.docs || {};
  const dirAbs = path.join(process.cwd(), pacote.storage_dir || "");

  const crcTable = (() => {
    const t: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const entries: Array<{ name: Buffer; data: Buffer; crc: number; size: number }> = [];
  for (const [key, entry] of Object.entries<any>(docs)) {
    const abs = path.join(dirAbs, entry.file);
    if (!fs.existsSync(abs)) continue;
    const data = await fs.promises.readFile(abs);
    entries.push({ name: Buffer.from(entry.file, "utf8"), data, crc: crc32(data), size: data.length });
  }
  if (entries.length === 0) return null;

  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
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
};

/**
 * Gera pacotes em falta (chamado pelo hook pós-desembolso e pelo job de
 * arranque): só toca em créditos status 1/3 sem pacote.
 */
export const generateMissingPackages = async (limit = 10): Promise<number> => {
  const [rows]: any = await db.query(
    `SELECT l.id, l.companyId FROM customer_loans l
      LEFT JOIN concession_packages cp ON cp.loanId = l.id
      WHERE cp.id IS NULL AND l.status IN (1, 3)
      ORDER BY l.id DESC LIMIT ?`,
    { replacements: [limit] }
  );
  let gerados = 0;
  for (const row of rows as any[]) {
    try {
      await generateConcessionPackage({ loanId: Number(row.id), companyId: Number(row.companyId), createdBy: null, ip: null });
      gerados += 1;
      console.log(`[Concessao] Pacote gerado para crédito #${row.id} (backfill)`);
    } catch (e: any) {
      if (String(e?.message) !== "PACKAGE_ALREADY_ISSUED") {
        console.error(`[Concessao] Falha no backfill do crédito #${row.id}:`, e?.message || e);
      }
    }
  }
  return gerados;
};
