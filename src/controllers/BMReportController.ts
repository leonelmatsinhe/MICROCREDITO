import { Request, Response } from "express";
import { Op } from "sequelize";
import moment from "moment";
import ExcelJS from "exceljs";
import { CompanyModel } from "../database/models/CompanyModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { LoanModel } from "../database/models/LoanModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { installmentPanification } from "../utils/calculateLateAmount";

function formatDateBR(date: any): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * GET /api/reports/banco-mocambique/:companyId
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
 * 
 * Gera dados para o relatório obrigatório do Banco de Moçambique
 */
const getBMReport = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { from, to } = req.query;
    const companyIdNum = parseInt(String(companyId), 10);

    if (Number.isNaN(companyIdNum) || companyIdNum <= 0) {
      return res.status(400).json({ success: false, message: "companyId inválido." });
    }

    // 1. Buscar dados da empresa
    const company = await CompanyModel.findByPk(companyIdNum);
    if (!company) {
      return res.status(404).json({ success: false, message: "Empresa não encontrada." });
    }

    const companyData = company.toJSON() as any;

    // 2. Buscar província
    let provinceName = "";
    try {
      const { ProvinceModel } = await import("../database/models/ProvinceModel");
      const province = await ProvinceModel.findByPk(companyData.provinceId);
      if (province) {
        provinceName = (province.toJSON() as any).name || "";
      }
    } catch {}

    // 3. Buscar créditos do período — desembolsados (status 1) e terminados (status 3)
    const loanWhere: any = {
      companyId: companyIdNum,
      status: { [Op.in]: [1, 3] },
      [Op.and]: [
        { disbursementDate: { [Op.not]: null } },
        { disbursementDate: { [Op.ne]: "" } },
      ],
    };
    
    // Filtrar exclusivamente pelo campo real de desembolso do crédito.
    if (from && to) {
      loanWhere[Op.and].push({ disbursementDate: {
        [Op.between]: [String(from), String(to)],
      } });
    } else if (from) {
      loanWhere[Op.and].push({ disbursementDate: { [Op.gte]: String(from) } });
    } else if (to) {
      loanWhere[Op.and].push({ disbursementDate: { [Op.lte]: String(to) } });
    }

    const loans = await LoanModel.findAll({
      where: loanWhere,
      order: [["id", "ASC"]],
    });

    // 4. Para cada crédito, buscar cliente, amortizações e transações
    const reportData = [];

    for (const loan of loans) {
      const loanData = loan.toJSON() as any;

      // Buscar cliente
      const customer = await CustomerModel.findOne({
        where: {
          companyId: companyIdNum,
          accountNumber: loanData.accountNumber,
        },
      });
      const customerData = customer ? (customer.toJSON() as any) : null;

      // Buscar amortizações do crédito (ordem cronológica por vencimento)
      const amortizations = await AmorizationLoanModel.findAll({
        where: {
          companyId: companyIdNum,
          loanId: loanData.id,
        },
        order: [["dueDate", "ASC"], ["id", "ASC"]],
      });

      const amortList = amortizations.map((a) => a.toJSON() as any);
      const company = await CompanyModel.findByPk(companyIdNum, { attributes: ["forfeit"] });
      const calculatedAmortizations = installmentPanification(
        amortList,
        Number(company?.getDataValue("forfeit") || 0)
      );

      // Buscar transações reais do crédito
      const transactions = await TranzactionModel.findAll({
        where: {
          companyId: companyIdNum,
          loanId: loanData.id,
        },
      });
      const txList = transactions.map((t) => t.toJSON() as any);

      // Primeira prestação (para valor da prestação)
      const firstInstallment = amortList[0];

      // Última prestação (para prazo de reembolso)
      const lastInstallment = amortList[amortList.length - 1];

      // Prestações em atraso (status = 0 e data vencida)
      const now = moment();
      const overdueInstallments = calculatedAmortizations.filter((a: any) => {
        if (![0, -1].includes(Number(a.status))) return false;
        const dueDate = moment(a.dueDate);
        return dueDate.isBefore(now, "day");
      });

      // Crédito em Atraso (11): soma das prestações vencidas + juros de mora
      const overdueAmount = overdueInstallments.reduce(
        (sum: number, a: any) => sum + Math.max(0, (Number(a.installment) || 0) - (Number(a.paidAmount) || 0)) + (Number(a.latePaymentInterest) || 0),
        0
      );

      // Máximo dias em atraso
      const maxDaysOverdue = overdueInstallments.reduce((max: number, a: any) => {
        const days = now.diff(moment(a.dueDate), "days");
        return days > max ? days : max;
      }, 0);

      // =====================================================
      // CRÉDITO EM DÍVIDA (10):
      // Total (capital + juros) - valor total já liquidado
      // =====================================================

      // Total do crédito = soma de todas as prestações (capital + juros)
      const totalLoanWithInterest = amortList.reduce(
        (sum: number, a: any) => sum + (Number(a.installment) || 0), 0
      );

      // Total já pago = soma dos valores das transações (amount = valor efectivamente pago)
      const totalPaid = txList.reduce(
        (sum: number, t: any) => sum + (Number(t.amount) || 0), 0
      );

      // Crédito em dívida = Total - Pago
      const creditInDebt = Math.max(0, Math.round((totalLoanWithInterest - totalPaid) * 100) / 100);

      reportData.push({
        // (1) N° da Operação
        operationNumber: loanData.id,
        // (2) Nome do Cliente
        customerName: customerData?.customerName || "-",
        // (3) Data Desembolso
        disbursementDate: formatDateBR(loanData.disbursementDate),
        // (4) Montante do Desembolso
        disbursementAmount: Number(loanData.amount) || 0,
        // (5) Finalidade do Crédito — usar borrowerInfo.finalidade se disponível, senão loanDescription
        creditPurpose: (() => { try { const bi = loanData.borrowerInfo ? (typeof loanData.borrowerInfo === 'string' ? JSON.parse(loanData.borrowerInfo) : loanData.borrowerInfo) : null; return bi?.finalidade || loanData.loanDescription || '-'; } catch { return loanData.loanDescription || '-'; } })(),
        // (6) Valor da Prestação
        installmentValue: firstInstallment ? Number(firstInstallment.installment) || 0 : 0,
        // (7) Periodicidade dos Pagamentos
        paymentFrequency: "Mensal",
        // (8) Prazo de Reembolso
        repaymentDate: lastInstallment ? formatDateBR(lastInstallment.dueDate) : "-",
        // (9) Taxa de Juro
        interestRate: Number(loanData.interestRate) * 100,
        // (10) Crédito em Dívida = Total (capital+juros) - Total pago
        creditInDebt: creditInDebt,
        // (11) Crédito em Atraso
        creditOverdue: Math.round(overdueAmount * 100) / 100,
        // (12) Dias em Atraso
        daysOverdue: maxDaysOverdue,
        // (13) PPEs
        ppe: customerData?.customerPPE === 1 ? "Sim" : "Não",
        // Extras para display
        status: loanData.status,
      });
    }

    // 5. Calcular totais
    const totals = {
      disbursementAmount: reportData.reduce((sum, r) => sum + r.disbursementAmount, 0),
      installmentValue: reportData.reduce((sum, r) => sum + r.installmentValue, 0),
      creditInDebt: reportData.reduce((sum, r) => sum + r.creditInDebt, 0),
      creditOverdue: reportData.reduce((sum, r) => sum + r.creditOverdue, 0),
    };

    return res.status(200).json({
      success: true,
      company: {
        name: companyData.companyName || "",
        address: companyData.companyAddress || "",
        province: provinceName,
        phone: companyData.companyPhone || "",
        email: companyData.companyEmail || "",
        nuit: companyData.companyNuit || "",
        manager: companyData.companyManager || "",
      },
      reportData,
      totals,
      period: {
        from: from ? String(from) : null,
        to: to ? String(to) : null,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar relatório BM:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro interno ao gerar relatório.",
    });
  }
};

// =====================================================================
// GET /api/reports/banco-mocambique/:companyId/excel
// Download do .xlsx com bordas/fontes REAIS (exceljs), cópia fiel do
// modelo Reporte_BM_Mensal_*.xlsx (CARTEIRA DE CRÉDITO MENSAL).
// Query: from, to (YYYY-MM-DD) + campos manuais opcionais do cabeçalho.
// =====================================================================
const getBMReportExcel = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const q = req.query as any;
    const companyIdNum = parseInt(String(companyId), 10);
    if (Number.isNaN(companyIdNum) || companyIdNum <= 0) {
      return res.status(400).json({ success: false, message: "companyId inválido." });
    }

    // --- dados da empresa (cabeçalho) ---
    const company = await CompanyModel.findByPk(companyIdNum);
    if (!company) return res.status(404).json({ success: false, message: "Empresa não encontrada." });
    const c = company.toJSON() as any;
    let provinceName = "";
    try {
      const { ProvinceModel } = await import("../database/models/ProvinceModel");
      const p = await ProvinceModel.findByPk(c.provinceId);
      if (p) provinceName = (p.toJSON() as any).name || "";
    } catch {}

    const esc = (v: any) => (v === undefined || v === null ? "" : String(v));
    const hdr = {
      denominacao: esc(c.companyName),
      endereco: esc(c.companyAddress),
      bairro: esc(q.neighborhood),
      cidade: esc(q.city),
      estado: esc(q.state),
      provincia: provinceName,
      telefone: esc(c.companyPhone),
      telemovel: esc(q.mobile),
      email: esc(c.companyEmail),
      trabalhadores: esc(q.numberOfEmployees),
      inicio: esc(q.activityStartDate),
      responsavel: esc(c.companyManager),
      representadas: esc(q.represented) || esc(c.companyManager),
    };

    // --- créditos do período (mesma lógica do relatório JSON) ---
    const from = q.from ? String(q.from) : null;
    const to = q.to ? String(q.to) : null;
    const loanWhere: any = {
      companyId: companyIdNum,
      status: { [Op.in]: [1, 3] },
      [Op.and]: [{ disbursementDate: { [Op.not]: null } }, { disbursementDate: { [Op.ne]: "" } }],
    };
    if (from && to) loanWhere[Op.and].push({ disbursementDate: { [Op.between]: [from, to] } });
    else if (from) loanWhere[Op.and].push({ disbursementDate: { [Op.gte]: from } });
    else if (to) loanWhere[Op.and].push({ disbursementDate: { [Op.lte]: to } });

    const loans = await LoanModel.findAll({ where: loanWhere, order: [["id", "ASC"]] });
    const companyRow = await CompanyModel.findByPk(companyIdNum, { attributes: ["forfeit"] });
    const forfeit = Number(companyRow?.getDataValue("forfeit") || 0);
    const now = moment();

    const rows: any[] = [];
    for (const loan of loans) {
      const l = loan.toJSON() as any;
      const customer = await CustomerModel.findOne({ where: { companyId: companyIdNum, accountNumber: l.accountNumber } });
      const cd = customer ? (customer.toJSON() as any) : null;
      const amortizations = await AmorizationLoanModel.findAll({
        where: { companyId: companyIdNum, loanId: l.id },
        order: [["dueDate", "ASC"], ["id", "ASC"]],
      });
      const amortList = amortizations.map((a) => a.toJSON() as any);
      const calculated = installmentPanification(amortList, forfeit);
      const transactions = await TranzactionModel.findAll({ where: { companyId: companyIdNum, loanId: l.id } });
      const txList = transactions.map((t) => t.toJSON() as any);
      const first = amortList[0];
      const last = amortList[amortList.length - 1];
      const overdue = calculated.filter((a: any) => [0, -1].includes(Number(a.status)) && moment(a.dueDate).isBefore(now, "day"));
      const overdueAmount = overdue.reduce((s: number, a: any) => s + Math.max(0, (Number(a.installment) || 0) - (Number(a.paidAmount) || 0)) + (Number(a.latePaymentInterest) || 0), 0);
      const maxDays = overdue.reduce((m: number, a: any) => Math.max(m, now.diff(moment(a.dueDate), "days")), 0);
      const totalWithInterest = amortList.reduce((s: number, a: any) => s + (Number(a.installment) || 0), 0);
      const totalPaid = txList.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
      const creditInDebt = Math.max(0, Math.round((totalWithInterest - totalPaid) * 100) / 100);
      const purpose = (() => { try { const bi = l.borrowerInfo ? (typeof l.borrowerInfo === "string" ? JSON.parse(l.borrowerInfo) : l.borrowerInfo) : null; return bi?.finalidade || l.loanDescription || "-"; } catch { return l.loanDescription || "-"; } })();
      rows.push({
        op: String(l.id), name: cd?.customerName || "-", disbDate: formatDateBR(l.disbursementDate),
        disbAmount: Number(l.amount) || 0, purpose, installment: first ? Number(first.installment) || 0 : 0,
        frequency: "Mensal", repayDate: last ? formatDateBR(last.dueDate) : "-",
        rate: Number(l.interestRate) * 100, creditInDebt, creditOverdue: Math.round(overdueAmount * 100) / 100,
        days: maxDays, ppe: cd?.customerPPE === 1 ? "Sim" : "Não",
      });
    }
    const totalDisb = rows.reduce((s, r) => s + r.disbAmount, 0);

    // --- construir workbook ---
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("CARTEIRA DE CRÉDITO MENSAL", { views: [{ showGridLines: false }] });
    const FONT = "Calibri";
    const NCOLS = 13;
    const widths = [15, 28, 17, 20, 18, 17, 22, 17, 12, 18, 18, 13, 9];
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    const thin = { style: "thin", color: { argb: "FF000000" } } as const;
    const allBorders = { top: thin, bottom: thin, left: thin, right: thin };

    const put = (r: number, cIdx: number, value: any, opt: any = {}) => {
      const cell = ws.getCell(r, cIdx);
      cell.value = value;
      cell.font = { name: FONT, size: opt.size ?? 9, bold: !!opt.bold, italic: !!opt.italic };
      cell.alignment = { horizontal: opt.align ?? "left", vertical: "middle", wrapText: !!opt.wrap };
      if (opt.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opt.fill } };
      if (opt.border) cell.border = allBorders;
      if (opt.numFmt) cell.numFmt = opt.numFmt;
    };
    const mergeRow = (r: number, text: string, opt: any = {}) => {
      ws.mergeCells(r, 1, r, 12);
      put(r, 1, text, opt);
    };

    // Cabeçalho institucional
    let r = 2;
    mergeRow(r++, "BANCO DE MOÇAMBIQUE", { bold: true, size: 14 });
    mergeRow(r++, "DEPARTAMENTO DE SUPERVISÃO PRUDENCIAL", { bold: true, size: 11 });
    mergeRow(r++, "REPORTE PERIÓDICO DE INFORMAÇÕES DE MICROFINANÇAS", { bold: true, size: 11 });
    mergeRow(r++, "INSTITUIÇÕES SUJEITAS À MONITORIZAÇÃO", { bold: true, size: 11 });
    r = 9;
    const pf = (from || "").split("-").reverse().join("/");
    const pt = (to || "").split("-").reverse().join("/");
    mergeRow(r++, `PERÍODO DE REPORTE: ${pf} a ${pt}`, { bold: true, size: 10 });
    mergeRow(r++, `DATA: ${formatDateBR(new Date())} (DD/MM/AAAA)`, { bold: true, size: 10 });
    r = 13;
    mergeRow(r++, "1. IDENTIFICAÇÃO DA INSTITUIÇÃO", { bold: true, size: 11, fill: "FFD9D9D9" });
    mergeRow(r++, `Denominação: ${hdr.denominacao}`, { size: 10 });
    mergeRow(r++, `Endereço: ${hdr.endereco}${hdr.bairro ? "  Bairro: " + hdr.bairro : ""}${hdr.cidade ? "  Cidade: " + hdr.cidade : ""}${hdr.estado ? "  Estado: " + hdr.estado : ""}`, { size: 10 });
    mergeRow(r++, `Província: ${hdr.provincia}`, { size: 10 });
    mergeRow(r++, `Telefone: ${hdr.telefone}${hdr.telemovel ? "   Telemóvel: " + hdr.telemovel : ""}`, { size: 10 });
    mergeRow(r++, `E-mail: ${hdr.email}`, { size: 10 });
    mergeRow(r++, `Nº de Trabalhadores: ${hdr.trabalhadores}`, { size: 10 });
    mergeRow(r++, `Data de Início das Actividades: ${hdr.inicio}`, { size: 10 });
    mergeRow(r++, `Nome do Responsável pela Gestão da Instituição: ${hdr.responsavel}`, { size: 10 });
    mergeRow(r++, `Instituição(ões) Representada(s): ${hdr.representadas}`, { size: 10 });
    r = 27;
    put(r, 9, "(Valores em Meticais)", { size: 9, italic: true });
    r++;
    // Cabeçalho da grelha (linha 28)
    const headers = ["Nº da Operação (1)", "Nome do Cliente (2)", "Data de Desembolso (3)", "Montante do Desembolso (4)", "Finalidade do Crédito (5)", "Valor da Prestação (6)", "Periodicidade dos Pagamentos (7)", "Prazo de Reembolso (8)", "Taxa de Juro (9)", "Crédito em Dívida (10)", "Crédito em Em Atraso (11)", "Dias em Atraso (12)", "PPEs (13)"];
    headers.forEach((h, i) => put(r, i + 1, h, { bold: true, size: 9, align: "center", wrap: true, fill: "FFBFBFBF", border: true }));
    ws.getRow(r).height = 42;
    r++;
    // Linhas de dados
    rows.forEach((d) => {
      put(r, 1, d.op, { align: "center", border: true });
      put(r, 2, d.name, { align: "left", border: true });
      put(r, 3, d.disbDate, { align: "center", border: true });
      put(r, 4, d.disbAmount, { align: "right", border: true, numFmt: "#,##0.00" });
      put(r, 5, d.purpose, { align: "left", border: true });
      put(r, 6, d.installment, { align: "right", border: true, numFmt: "#,##0.00" });
      put(r, 7, d.frequency, { align: "center", border: true });
      put(r, 8, d.repayDate, { align: "center", border: true });
      put(r, 9, `${d.rate.toFixed(2)}%`, { align: "center", border: true });
      put(r, 10, d.creditInDebt, { align: "right", border: true, numFmt: "#,##0.00" });
      put(r, 11, d.creditOverdue, { align: "right", border: true, numFmt: "#,##0.00" });
      put(r, 12, d.days, { align: "center", border: true });
      put(r, 13, d.ppe, { align: "center", border: true });
      r++;
    });
    // TOTAL DO DESEMBOLSO
    put(r, 3, "TOTAL DO DESEMBOLSO =", { bold: true, size: 10, align: "right", fill: "FFD9D9D9", border: true });
    put(r, 4, totalDisb, { bold: true, size: 10, align: "right", fill: "FFD9D9D9", border: true, numFmt: "#,##0.00" });
    for (let i = 1; i <= NCOLS; i++) { if (i !== 3 && i !== 4) put(r, i, "", { fill: "FFD9D9D9", border: true }); }
    r += 2;
    // Notas explicativas
    put(r++, 1, "Notas Explicativas", { bold: true, size: 10 });
    const notes = [
      "1- Número da operação de crédito", "2- Nome do cliente", "3- Data de desembolso inicial",
      "4- Valor do crédito concedido", "5- Finalidade de crédito desembolsado, designadamente para empresas, consumo ou habitação",
      "6- Montante da prestação periódica para amortizar o crédito", "7- Periodicidade dos pagamentos, indica se são diária, semanal, mensal ou anual",
      "8- Data de vencimento do crédito desembolsado", "9- Percentagem da taxa de juro aplicada ao crédito",
      "10- Montante do crédito desembolsado que falta pagar, excluindo prestações em atraso",
      "11- Montante das prestações em atraso incluindo capital e juros", "12- Dias em atraso do pagamento das prestações",
      "13- Crédito concedido a pessoas politicamente expostas",
    ];
    notes.forEach((n) => put(r++, 1, n, { size: 9 }));

    // --- enviar como download ---
    const fileName = `Reporte_BM_Mensal_${pf.replace(/\//g, "-")}_a_${pt.replace(/\//g, "-")}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("Erro ao gerar Excel BM:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message || "Erro ao gerar Excel." });
    }
  }
};

export { getBMReport, getBMReportExcel };
