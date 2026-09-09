import { Request, Response } from "express";
import { sendWorkbook, ExcelColumn } from "../utils/excelExport";

/**
 * Exportação de grelhas para Excel com estilos reais (bordas, fonte Calibri,
 * cabeçalho cinzento, linha TOTAL) — mesmo padrão visual do relatório do BM.
 *
 * O frontend envia as linhas da VISTA ACTUAL (já filtradas/ordenadas), o que
 * garante que o Excel reflecte exactamente o que o utilizador vê no ecrã,
 * sem duplicar lógica de filtragem no backend.
 */

const dateStamp = () => new Date().toISOString().slice(0, 10);

function buildHandler(opts: {
  title: string | ((body: any) => string);
  sheetName: string;
  filePrefix: string;
  columns: ExcelColumn[];
  totalLabel?: (rows: any[]) => string;
}) {
  return async (req: Request, res: Response) => {
    try {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      const title = typeof opts.title === "function" ? opts.title(req.body || {}) : opts.title;
      await sendWorkbook(res, {
        title,
        sheetName: opts.sheetName,
        columns: opts.columns,
        rows,
        totalLabel: opts.totalLabel ? opts.totalLabel(rows) : "TOTAL",
        fileName: `${opts.filePrefix}-${dateStamp()}.xlsx`,
      });
    } catch (error: any) {
      console.error("Erro ao exportar Excel:", error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: error.message || "Erro ao exportar Excel." });
      }
    }
  };
}

// ---------- Mutuários ----------
const exportCustomersExcel = buildHandler({
  title: "Mutuários",
  sheetName: "Mutuários",
  filePrefix: "mutuarios",
  columns: [
    { header: "Mutuário", key: "customerName", width: 30, align: "left" },
    { header: "Telefone", key: "customerPhone", width: 16, align: "center" },
    { header: "Pessoa de Contacto", key: "customerEmergencyPerson", width: 28, align: "left" },
    { header: "Emergência", key: "customerEmergencyContact", width: 18, align: "center" },
    { header: "Bairro", key: "customerBairro", width: 22, align: "left" },
    { header: "Estado", key: "status", width: 12, align: "center" },
  ],
});

// ---------- Créditos (Pendentes / Desembolsados / Terminados / Rejeitados) ----------
const exportLoansExcel = buildHandler({
  title: (body) => `Créditos — ${body.segmentLabel || "Lista"}`,
  sheetName: "Créditos",
  filePrefix: "creditos",
  columns: [
    { header: "Mutuário", key: "customerName", width: 30, align: "left" },
    { header: "Conta", key: "accountNumber", width: 10, align: "center" },
    { header: "Telefone", key: "phone", width: 16, align: "center" },
    { header: "Data", key: "date", width: 12, align: "center" },
    { header: "Valor (MZN)", key: "amount", width: 16, align: "right", money: true },
    { header: "Taxa de juro", key: "rate", width: 12, align: "center" },
    { header: "Período / Prestações", key: "period", width: 16, align: "center" },
    { header: "Desembolso", key: "disbursement", width: 14, align: "center" },
    { header: "Vencimento", key: "finalDue", width: 14, align: "center" },
    { header: "Juros de mora (MZN)", key: "lateInterest", width: 18, align: "right", money: true },
    { header: "Total pago (MZN)", key: "totalPaid", width: 16, align: "right", money: true },
    { header: "Descontos (MZN)", key: "discount", width: 16, align: "right", money: true },
    { header: "Estado", key: "status", width: 12, align: "center" },
  ],
});

// ---------- Pagamentos ----------
const exportPaymentsExcel = buildHandler({
  title: "Pagamentos de Prestações",
  sheetName: "Pagamentos",
  filePrefix: "pagamentos",
  columns: [
    { header: "Mutuário", key: "customerName", width: 30, align: "left" },
    { header: "Conta", key: "accountNumber", width: 10, align: "center" },
    { header: "Telefone", key: "phone", width: 16, align: "center" },
    { header: "Prestação", key: "installment", width: 10, align: "center" },
    { header: "Venc. prestação", key: "installmentDue", width: 14, align: "center" },
    { header: "Montante (MZN)", key: "amount", width: 15, align: "right", money: true },
    { header: "Saldo devedor (MZN)", key: "balance", width: 17, align: "right", money: true },
    { header: "Método", key: "method", width: 14, align: "center" },
    { header: "Operador", key: "staff", width: 16, align: "left" },
    { header: "Referência", key: "reference", width: 16, align: "center" },
    { header: "Data e hora", key: "date", width: 18, align: "center" },
  ],
});

// ---------- Controle de Prestações ----------
const exportInstallmentsExcel = buildHandler({
  title: "Controle de Prestações por Vencimento",
  sheetName: "Prestações",
  filePrefix: "prestacoes",
  totalLabel: (rows) => `TOTAL (${rows.length} prestações)`,
  columns: [
    { header: "Mutuário", key: "customerName", width: 32, align: "left" },
    { header: "Prestação (MZN)", key: "installment", width: 15, align: "right", money: true },
    { header: "Vencimento", key: "dueDate", width: 13, align: "center" },
    { header: "Observações", key: "observations", width: 20, align: "left" },
    { header: "Mora (MZN)", key: "lateFee", width: 14, align: "right", money: true },
    { header: "Total a Pagar (MZN)", key: "totalToPay", width: 17, align: "right", money: true },
  ],
});

export { exportCustomersExcel, exportLoansExcel, exportPaymentsExcel, exportInstallmentsExcel };
