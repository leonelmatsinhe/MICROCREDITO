import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import moment from "moment";

moment.locale("pt-br");

function pick(row: unknown, key: string): unknown {
  if (row && typeof (row as { getDataValue?: (k: string) => unknown }).getDataValue === "function") {
    return (row as { getDataValue: (k: string) => unknown }).getDataValue(key);
  }
  return (row as Record<string, unknown> | null)?.[key];
}

function formatMzn(n: unknown): string {
  const num = typeof n === "number" ? n : parseFloat(String(n));
  if (Number.isNaN(num)) return "—";
  return `${num.toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MZN`;
}

/** Gera PDF de resumo do contrato / plano de amortização (sem Puppeteer). */
const generateContrat = async (
  company: Record<string, unknown>,
  customer: Record<string, unknown>,
  amortization: unknown
): Promise<boolean> => {
  try {
    const outDir = path.join(process.cwd(), "uploads", "docs");
    await fs.promises.mkdir(outDir, { recursive: true });
    const accountNumber = pick(customer, "accountNumber");
    const outPath = path.join(outDir, `${accountNumber}.pdf`);

    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    doc.fontSize(16).text("Microcrédito — Documento resumo", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#555555").text(`Emitido em ${moment().format("LL")}`, {
      align: "center",
    });
    doc.fillColor("#000000");
    doc.moveDown();

    doc.fontSize(11).text("Entidade", { underline: true });
    doc.fontSize(10);
    doc.text(String(company.companyName ?? ""));
    doc.text(`Endereço: ${company.companyAddress ?? "—"}`);
    doc.text(`Tel.: ${company.companyPhone ?? "—"} | NUIT: ${company.companyNuit ?? "—"}`);
    doc.text(`E-mail: ${company.companyEmail ?? "—"}`);
    doc.text(`Responsável: ${company.companyManager ?? "—"}`);
    doc.moveDown();

    doc.fontSize(11).text("Mutuário", { underline: true });
    doc.fontSize(10);
    doc.text(String(customer.customerName ?? ""));
    doc.text(`Conta n.º ${customer.accountNumber ?? "—"}`);
    doc.text(`Morada: ${customer.customerAddress ?? "—"}`);
    doc.text(`Telemóvel: ${customer.customerPhone ?? "—"} | NUIT: ${customer.customerNuit ?? "—"}`);
    doc.text(`Profissão: ${customer.customerProfession ?? "—"}`);
    doc.text(`Local de trabalho: ${customer.customerLocalOfWork ?? "—"}`);
    doc.moveDown();

    const rows = Array.isArray(amortization) ? amortization : [];
    doc.fontSize(11).text("Plano de amortização", { underline: true });
    doc.moveDown(0.3);

    if (rows.length === 0) {
      doc.fontSize(10).text("Sem linhas de prestação registadas.");
    } else {
      doc.fontSize(8).text(
        "Pr. | Vencimento | Prestação | Juros | Saldo devedor | Estado"
      );
      doc.moveDown(0.2);
      for (const row of rows) {
        const ord = pick(row, "installmentOrder");
        const due = pick(row, "dueDate");
        const inst = pick(row, "installment");
        const rate = pick(row, "rateAmount");
        const bal = pick(row, "remainingBalance");
        const st = pick(row, "status");
        const statusLabel =
          st === 0 ? "Pendente" : st === 1 ? "Paga" : String(st ?? "—");
        const balTxt =
          bal != null && bal !== "" ? formatMzn(bal) : "—";
        doc.fontSize(8).text(
          `${ord} | ${due ?? "—"} | ${formatMzn(inst)} | ${formatMzn(rate)} | ${balTxt} | ${statusLabel}`
        );
        if (doc.y > 720) {
          doc.addPage();
        }
      }
    }

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });
    return true;
  } catch (e) {
    console.error("Erro ao gerar PDF do contrato:", e);
    return false;
  }
};

export { generateContrat };
