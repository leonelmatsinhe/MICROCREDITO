import { Request, Response } from "express";
import {
  loadLegalDocsData,
  renderLegalDoc,
} from "../services/legalDocsService";
import {
  generateConcessionPackage,
  findConcessionPackage,
  readConcessionDoc,
  buildConcessionZip,
  PackageAlreadyIssuedError,
} from "../services/concessionPackageService";
import { AuditLogModel } from "../database/models/paymentsV2Models";
import { getCurrentUser } from "../middlewares/roles";

/**
 * DOCUMENTOS LEGAIS DO CRÉDITO — DOIS FLUXOS SEPARADOS (pdfkit no backend):
 *
 * FLUXO 1 — PACOTE DE CONCESSÃO (IMUTÁVEL): gerado UMA vez após o desembolso,
 * gravado em storage com hash SHA-256 + QR; regeneração bloqueada (409).
 *   GET  /api/loans/:loanId/concession           → metadados (existe? hash? docs?)
 *   POST /api/loans/:loanId/concession/generate  → gera o pacote (409 se existe)
 *   GET  /api/loans/:loanId/concession/:key/pdf  → termo|garantias|contrato|plano
 *   GET  /api/loans/:loanId/concession/zip       → pacote completo em ZIP
 *
 * FLUXO 2 — EXTRACTO DO CRÉDITO (DINÂMICO): on-demand, sempre actualizado
 * (pagamentos reais, mora, TAEG, estado por prestação), em memória, com audit
 * de quem baixou. NUNCA persiste nem se mistura com o pacote.
 *   GET /api/loans/:loanId/documents/extracto/pdf (mantido — usados pelo
 *       TabAmortizacao e portal; compatível com a rota anterior)
 *
 *Compatibilidade: /api/loans/:loanId/documents/:tipo/pdf continua a servir os
 * documentos do pacote (contrato/termo/garantias) lendo do STORAGE quando o
 * pacote existe — os ficheiros antigos gerados on-the-fly mantêm-se válidos.
 */

const DOC_LABELS: Record<string, string> = {
  contrato: "contrato-concessao",
  termo: "termo-compromisso",
  garantias: "declaracao-garantias",
  extracto: "extracto-credito",
};

const ensureCompanyAccess = (req: Request, res: Response, companyId: number): boolean => {
  const user = getCurrentUser(req);
  if (!user) return true;
  const userCompany = Number(user.companyId);
  if (userCompany && userCompany !== Number(companyId)) {
    res.status(403).json({ success: false, message: "Não tem acesso a dados desta empresa." });
    return false;
  }
  return true;
};

const auditDownload = async (req: Request, entity: string, entityId: number, after: any) => {
  try {
    const user = getCurrentUser(req);
    await AuditLogModel.create({
      user_id: user?.id ?? null,
      company_id: Number(user?.companyId) || null,
      ip: req.ip || null,
      action: entity === "concession_packages" ? "CONCESSION_DOWNLOAD" : "EXTRACTO_DOWNLOAD",
      entity,
      entity_id: entityId,
      before_data: null,
      after_data: after,
    } as any);
  } catch { /* audit best-effort */ }
};

// ───────────────────────── FLUXO 1 — CONCESSÃO ─────────────────────────────

/** GET /api/loans/:loanId/concession — metadados do pacote (ou null). */
const concessionMeta = async (req: Request, res: Response) => {
  try {
    const loanId = Number(req.params.loanId);
    const pacote: any = await findConcessionPackage(loanId);
    if (pacote && !ensureCompanyAccess(req, res, Number(pacote.companyId))) return;
    const docs = pacote
      ? (typeof pacote.docs === "string" ? JSON.parse(pacote.docs) : pacote.docs || {})
      : null;
    return res.status(200).json({
      success: true,
      result: pacote
        ? {
            id: Number(pacote.id),
            loanId: Number(pacote.loanId),
            status: pacote.status,
            package_hash: pacote.package_hash,
            created_at: pacote.created_at,
            docs: Object.entries<any>(docs).map(([key, v]) => ({ key, file: v.file, bytes: v.bytes, hash: v.hash })),
            zip_url: `/api/loans/${loanId}/concession/zip`,
          }
        : null,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao carregar o pacote de concessão." });
  }
};

/** POST /api/loans/:loanId/concession/generate — gera UMA vez (409 se existe). */
const concessionGenerate = async (req: Request, res: Response) => {
  try {
    const loanId = Number(req.params.loanId);
    const user = getCurrentUser(req);
    const pacote = await generateConcessionPackage({
      loanId,
      companyId: Number(req.body?.companyId || user?.companyId || 0),
      createdBy: user?.id ?? null,
      ip: req.ip || null,
    });
    return res.status(201).json({
      success: true,
      message: "Pacote de concessão emitido (imutável, com hash).",
      result: pacote,
    });
  } catch (error: any) {
    if (error instanceof PackageAlreadyIssuedError) {
      return res.status(409).json({
        success: false,
        code: "PACKAGE_ALREADY_ISSUED",
        message: `O pacote de concessão já foi emitido em ${new Date(error.createdAt).toLocaleString("pt-MZ")} e é imutável. Para regenerar, invalide o desembolso (reverte o crédito a Pendentes).`,
        package_id: error.packageId,
      });
    }
    console.error("[Concessao] Erro ao gerar o pacote:", error?.message || error);
    return res.status(400).json({ success: false, message: error?.message || "Erro ao gerar o pacote de concessão." });
  }
};

/** GET /api/loans/:loanId/concession/:key/pdf — PDF imutável do storage. */
const concessionDocPdf = async (req: Request, res: Response) => {
  try {
    const loanId = Number(req.params.loanId);
    const key = String(req.params.key || "");
    const pacote: any = await findConcessionPackage(loanId);
    if (!pacote) {
      return res.status(404).json({ success: false, code: "PACKAGE_NOT_ISSUED", message: "O pacote de concessão ainda não foi emitido para este crédito." });
    }
    if (!ensureCompanyAccess(req, res, Number(pacote.companyId))) return;
    const doc = await readConcessionDoc(loanId, key);
    if (!doc) {
      return res.status(404).json({ success: false, message: `Documento "${key}" não existe no pacote.` });
    }
    await auditDownload(req, "concession_packages", Number(pacote.id), { loanId, doc: key, hash: pacote.package_hash });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${doc.fileName}"`);
    res.setHeader("ETag", `"${pacote.package_hash}-${key}"`);
    return res.status(200).send(doc.buffer);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao servir o documento do pacote." });
  }
};

/** GET /api/loans/:loanId/concession/zip — pacote completo. */
const concessionZip = async (req: Request, res: Response) => {
  try {
    const loanId = Number(req.params.loanId);
    const pacote: any = await findConcessionPackage(loanId);
    if (!pacote) {
      return res.status(404).json({ success: false, code: "PACKAGE_NOT_ISSUED", message: "O pacote de concessão ainda não foi emitido para este crédito." });
    }
    if (!ensureCompanyAccess(req, res, Number(pacote.companyId))) return;
    const zip = await buildConcessionZip(loanId);
    if (!zip) {
      return res.status(500).json({ success: false, message: "Ficheiros do pacote não encontrados no storage." });
    }
    await auditDownload(req, "concession_packages", Number(pacote.id), { loanId, doc: "ZIP", hash: pacote.package_hash });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zip.fileName}"`);
    return res.status(200).send(zip.buffer);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao gerar o ZIP do pacote." });
  }
};

// ───────────────────── FLUXO 2 — EXTRACTO DINÂMICO ──────────────────────────

/**
 * GET /api/loans/:loanId/documents/extracto/pdf — gerado ON-DEMAND em memória
 * (nunca persiste). Audit registra quem baixou e quando.
 */
const downloadExtracto = async (req: Request, res: Response) => {
  const { loanId, tipo } = req.params;

  try {
    if (tipo !== "extracto") {
      return res.status(400).json({
        success: false,
        message: "Use os endpoints /concession/... para documentos imutáveis (contrato, termo, garantias, plano).",
      });
    }
    const data = await loadLegalDocsData(Number(loanId));
    if (!data || !data.loan) {
      return res.status(404).json({ success: false, message: "Crédito não encontrado." });
    }
    if (!ensureCompanyAccess(req, res, Number(data.loan.getDataValue("companyId")))) return;

    const pdf = await renderLegalDoc(tipo, data);
    await auditDownload(req, "extracto", Number(loanId), {
      loanId: Number(loanId),
      accountNumber: String(data.loan.getDataValue("accountNumber") || ""),
    });

    const fileName = `extracto-credito-${data.loan.getDataValue("accountNumber") || "0"}-${loanId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(pdf);
  } catch (error: any) {
    console.error("Erro ao gerar extracto:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao gerar o extracto do crédito.",
    });
  }
};

/**
 * GET /api/loans/:loanId/documents/:tipo/pdf (contrato|termo|garantias) —
 * COMPATIBILIDADE: se o pacote existe, serve o PDF IMUTÁVEL do storage;
 * se não existe (créditos antigos), gera on-the-fly como antes.
 */
const downloadLegalDoc = async (req: Request, res: Response) => {
  const { loanId, tipo } = req.params;

  if (!DOC_LABELS[tipo]) {
    return res.status(400).json({
      success: false,
      message: "Tipo de documento inválido. Use: contrato, termo, garantias ou extracto.",
    });
  }

  try {
    // Fluxo 1 com prioridade: pacote imutável quando emitido.
    if (tipo !== "extracto") {
      const fromPackage = await readConcessionDoc(Number(loanId), tipo);
      if (fromPackage) {
        const pacote: any = await findConcessionPackage(Number(loanId));
        if (!ensureCompanyAccess(req, res, Number(pacote?.companyId))) return;
        await auditDownload(req, "concession_packages", Number(pacote.id), { loanId: Number(loanId), doc: tipo, via: "compat" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${fromPackage.fileName}"`);
        res.setHeader("ETag", `"${pacote?.package_hash}-${tipo}"`);
        return res.status(200).send(fromPackage.buffer);
      }
    }

    // Fallback on-the-fly (créditos antigos sem pacote) — extrato e legados.
    const data = await loadLegalDocsData(Number(loanId));
    if (!data || !data.loan) {
      return res.status(404).json({ success: false, message: "Crédito não encontrado." });
    }
    if (!ensureCompanyAccess(req, res, Number(data.loan.getDataValue("companyId")))) return;

    const pdf = await renderLegalDoc(tipo, data);
    const fileName = `${DOC_LABELS[tipo]}-${data.loan.getDataValue("accountNumber") || "0"}-${loanId}.pdf`;
    if (tipo === "extracto") {
      await auditDownload(req, "extracto", Number(loanId), {
        loanId: Number(loanId),
        accountNumber: String(data.loan.getDataValue("accountNumber") || ""),
      });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    return res.status(200).send(pdf);
  } catch (error: any) {
    console.error("Erro ao gerar documento legal:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro ao gerar o documento legal.",
    });
  }
};

export { downloadLegalDoc, downloadExtracto, concessionMeta, concessionGenerate, concessionDocPdf, concessionZip };
