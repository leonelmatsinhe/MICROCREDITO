import { Request, Response } from "express";
import { Op } from "sequelize";
import moment from "moment";
import { CompanyModel } from "../database/models/CompanyModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { LoanModel } from "../database/models/LoanModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { TranzactionModel } from "../database/models/TranzactionModel";

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

    // 3. Buscar créditos do período — apenas desembolsados (status 1)
    const loanWhere: any = { companyId: companyIdNum, status: 1 };
    
    // Filtrar por período se especificado (data de desembolso)
    if (from && to) {
      loanWhere.dateCreated = {
        [Op.between]: [String(from), String(to)],
      };
    } else if (from) {
      loanWhere.dateCreated = { [Op.gte]: String(from) };
    } else if (to) {
      loanWhere.dateCreated = { [Op.lte]: String(to) };
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

      // Buscar amortizações do crédito
      const amortizations = await AmorizationLoanModel.findAll({
        where: {
          companyId: companyIdNum,
          loanId: loanData.id,
        },
        order: [["installmentOrder", "ASC"]],
      });

      const amortList = amortizations.map((a) => a.toJSON() as any);

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
      const overdueInstallments = amortList.filter((a: any) => {
        if (Number(a.status) !== 0) return false;
        const dueDate = moment(a.dueDate);
        return dueDate.isBefore(now, "day");
      });

      // Crédito em Atraso (11): soma das prestações vencidas + juros de mora
      const overdueAmount = overdueInstallments.reduce(
        (sum: number, a: any) => sum + (Number(a.installment) || 0) + (Number(a.latePaymentInterest) || 0),
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
        disbursementDate: formatDateBR(loanData.dateCreated),
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

export { getBMReport };
