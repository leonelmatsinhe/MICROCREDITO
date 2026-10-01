/**
 * REGENERAÇÃO ADMINISTRATIVA de um pacote de concessão já emitido.
 *
 * Excepção à imutabilidade: destinada a corrigir documentos gerados com
 * cálculos antigos/errados (ex.: coluna Saldo do plano com a fórmula da
 * dívida total). Re-renderiza os 4 PDFs com o código ACTUAL, substitui os
 * ficheiros no storage, recalcula o package_hash (mesma fórmula: SHA-256 de
 * loanId + conteúdo dos PDFs) e registra a operação no audit_log.
 *
 * Uso: node --env-file=.env --require ts-node/register/transpile-only src/scripts/regeneraPacoteConcessao.ts <loanId> [...]
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../database/db";
import { loadLegalDocsData, renderLegalDoc } from "../services/legalDocsService";
import { DOCS_DO_PACOTE } from "../services/concessionPackageService";
import { AuditLogModel } from "../database/models/paymentsV2Models";

const main = async () => {
  const loanIds = process.argv.slice(2).map(Number).filter(Boolean);
  if (loanIds.length === 0) {
    console.error("Uso: node --env-file=.env --require ts-node/register/transpile-only src/scripts/regeneraPacoteConcessao.ts <loanId> [...]");
    process.exit(1);
  }

  for (const loanId of loanIds) {
    const [rows]: any = await db.query(
      "SELECT * FROM concession_packages WHERE loanId = ? LIMIT 1",
      { replacements: [loanId] }
    );
    const pacote: any = (rows as any[])[0];
    if (!pacote) {
      console.log(`[Pacote] Crédito #${loanId}: sem pacote emitido — nada a fazer.`);
      continue;
    }

    const data = await loadLegalDocsData(loanId);
    if (!data || !data.loan) {
      console.log(`[Pacote] Crédito #${loanId}: crédito não encontrado.`);
      continue;
    }

    const dirAbs = path.join(process.cwd(), String(pacote.storage_dir || ""));
    if (!fs.existsSync(dirAbs)) {
      console.log(`[Pacote] Crédito #${loanId}: storage não encontrado (${dirAbs}).`);
      continue;
    }

    const docsAntigos = typeof pacote.docs === "string" ? JSON.parse(pacote.docs) : pacote.docs || {};
    const docs: Record<string, { file: string; bytes: number; hash: string }> = {};
    const buffers: Buffer[] = [];

    for (const docDef of DOCS_DO_PACOTE) {
      const pdf: Buffer = await renderLegalDoc(docDef.key, data, {
        emitidoEm: pacote.created_at ? new Date(pacote.created_at) : new Date(),
      });
      const fileName = String(docsAntigos[docDef.key]?.file || `${docDef.file}-conta-${data.loan.getDataValue("accountNumber")}-${loanId}.pdf`);
      fs.writeFileSync(path.join(dirAbs, fileName), pdf);
      docs[docDef.key] = {
        file: fileName,
        bytes: pdf.length,
        hash: crypto.createHash("sha256").update(pdf).digest("hex"),
      };
      buffers.push(pdf);
      console.log(`[Pacote] Crédito #${loanId}: ${docDef.label} → ${fileName} (${pdf.length} bytes)`);
    }

    // Mesma fórmula do generateConcessionPackage: SHA-256 de loanId + PDFs.
    const packageHash = crypto
      .createHash("sha256")
      .update(Buffer.concat([Buffer.from(String(loanId)), ...buffers]))
      .digest("hex");

    await db.query(
      "UPDATE concession_packages SET docs = ?, package_hash = ? WHERE id = ?",
      { replacements: [JSON.stringify(docs), packageHash, Number(pacote.id)] }
    );

    try {
      await AuditLogModel.create({
        user_id: null,
        company_id: Number(data.loan.getDataValue("companyId")) || null,
        ip: null,
        action: "CONCESSION_REGENERADO",
        entity: "concession_packages",
        entity_id: Number(pacote.id),
        before_data: { package_hash: String(pacote.package_hash || "") },
        after_data: { loanId, package_hash: packageHash, docs: Object.keys(docs) },
      } as any);
    } catch { /* audit best-effort */ }

    console.log(`[Pacote] Crédito #${loanId}: regenerado ✓ · novo package_hash ${packageHash.slice(0, 24)}…`);
  }

  process.exit(0);
};

main()
  .catch((error) => {
    console.error("[Pacote] Erro:", error?.message || error);
    process.exit(1);
  })
  .finally(() => db.close().catch(() => {}));
