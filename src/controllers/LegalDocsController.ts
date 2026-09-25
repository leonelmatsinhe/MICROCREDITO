import { Request, Response } from "express";
import { loadLegalDocsData, renderLegalDoc } from "../services/legalDocsService";

/**
 * Documentos legais do crédito (pdfkit no backend, layout idêntico ao frontend):
 *   GET /api/loans/:loanId/documents/contrato/pdf   → Contrato de Concessão
 *   GET /api/loans/:loanId/documents/termo/pdf      → Termo de Compromisso
 *   GET /api/loans/:loanId/documents/garantias/pdf  → Declaração de Garantias
 *   GET /api/loans/:loanId/documents/extracto/pdf   → Extracto do Crédito (landscape)
 */

const DOC_LABELS: Record<string, string> = {
  contrato: "contrato-concessao",
  termo: "termo-compromisso",
  garantias: "declaracao-garantias",
  extracto: "extracto-credito",
};

const downloadLegalDoc = async (req: Request, res: Response) => {
  const { loanId, tipo } = req.params;

  if (!DOC_LABELS[tipo]) {
    return res.status(400).json({
      success: false,
      message: "Tipo de documento inválido. Use: contrato, termo, garantias ou extracto.",
    });
  }

  try {
    const data = await loadLegalDocsData(Number(loanId));
    if (!data || !data.loan) {
      return res.status(404).json({ success: false, message: "Crédito não encontrado." });
    }

    const pdf = await renderLegalDoc(tipo, data);
    const fileName = `${DOC_LABELS[tipo]}-${data.loan.getDataValue("accountNumber") || "0"}-${loanId}.pdf`;

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

export { downloadLegalDoc };
