import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { getPartner, PartnerContext } from "../middlewares/roles";
import { ReciboModel } from "../database/models/ReciboModel";
import {
  getPartnerCompany,
  getPartnerDashboard,
  getPartnerInstallments,
  getPartnerLoans,
  getPartnerMora,
  getPartnerStatement,
  getPartnerTransactions,
} from "../services/partnerPortalService";
import { listRecibosByWallet } from "../services/reciboService";
import { buildWorkbook } from "./FinancierReportController";
import { getWalletWithAnalytics } from "../services/financingWalletService";

/**
 * PORTAL DO PARCEIRO FINANCIADOR — todas as rotas são SÓ DE LEITURA e todos os
 * filtros usam `partner.walletId` (lido da base de dados no middleware).
 * Nenhum endpoint aceita walletId/companyId do pedido: o parceiro nunca vê
 * dados de outra carteira, nem do relatório do Banco de Moçambique.
 */

const period = (req: Request) => ({
  from: req.query.from ? String(req.query.from).slice(0, 10) : undefined,
  to: req.query.to ? String(req.query.to).slice(0, 10) : undefined,
});

const withScope = (partner: PartnerContext) => ({
  companyId: partner.companyId,
  walletId: partner.walletId,
});

/** GET /api/partner/profile */
const profile = async (req: Request, res: Response) => {
  const partner = getPartner(req);
  const company = await getPartnerCompany(partner.companyId);
  const wallet = await getWalletWithAnalytics(partner.companyId, partner.walletId);

  return res.status(200).json({
    success: true,
    result: {
      user: {
        id: partner.userId,
        name: partner.userName,
        email: partner.email,
        userRole: 4,
        walletId: partner.walletId,
      },
      carteira: wallet,
      empresa: company
        ? {
            name: company.companyName || "",
            nuit: company.companyNuit || "",
            phone: company.companyPhone || "",
            email: company.companyEmail || "",
            address: company.companyAddress || "",
          }
        : null,
    },
  });
};

/** GET /api/partner/dashboard */
const dashboard = async (req: Request, res: Response) => {
  try {
    const partner = getPartner(req);
    const data = await getPartnerDashboard(withScope(partner), period(req));
    return res.status(200).json({ success: true, result: data });
  } catch (error: any) {
    console.error("[Portal Parceiro] dashboard:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao carregar o painel do parceiro." });
  }
};

/** GET /api/partner/loans */
const loans = async (req: Request, res: Response) => {
  try {
    const partner = getPartner(req);
    const result = await getPartnerLoans(withScope(partner), {
      ...period(req),
      search: req.query.search ? String(req.query.search) : undefined,
      status: req.query.status !== undefined ? Number(req.query.status) : undefined,
    });
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("[Portal Parceiro] loans:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao carregar os créditos da carteira." });
  }
};

/** GET /api/partner/installments?scope=pagas|pendentes|atraso|todas */
const installments = async (req: Request, res: Response) => {
  try {
    const partner = getPartner(req);
    const scope = String(req.query.scope || "todas") as "pagas" | "pendentes" | "atraso" | "todas";
    const result = await getPartnerInstallments(withScope(partner), {
      scope,
      loanId: req.query.loanId ? Number(req.query.loanId) : undefined,
      ...period(req),
    });
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("[Portal Parceiro] installments:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao carregar as prestações." });
  }
};

/** GET /api/partner/mora */
const mora = async (req: Request, res: Response) => {
  try {
    const partner = getPartner(req);
    const result = await getPartnerMora(withScope(partner));
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("[Portal Parceiro] mora:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao carregar os juros de mora." });
  }
};

/** GET /api/partner/transactions */
const transactions = async (req: Request, res: Response) => {
  try {
    const partner = getPartner(req);
    const result = await getPartnerTransactions(withScope(partner), {
      ...period(req),
      loanId: req.query.loanId ? Number(req.query.loanId) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("[Portal Parceiro] transactions:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao carregar os recebimentos." });
  }
};

/** GET /api/partner/statement */
const statement = async (req: Request, res: Response) => {
  try {
    const partner = getPartner(req);
    const result = await getPartnerStatement(withScope(partner), period(req));
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("[Portal Parceiro] statement:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao carregar o extrato." });
  }
};

/** GET /api/partner/statement/excel — extrato em Excel (só leitura/export). */
const statementExcel = async (req: Request, res: Response) => {
  try {
    const partner = getPartner(req);
    const scope = withScope(partner);
    const p = period(req);
    const detail = await getPartnerStatement(scope, p);
    const wallet = await getWalletWithAnalytics(scope.companyId, scope.walletId);
    const company = await getPartnerCompany(scope.companyId);

    const wb = await buildWorkbook({
      company,
      wallet,
      statement: { resumo: detail.resumo, desembolsos: detail.desembolsos, recebimentos: detail.recebimentos },
      period: p,
    });

    const label = String(wallet?.codigo || "carteira").replace(/[^A-Za-z0-9_-]/g, "");
    const fileName = `Extrato_${label}_${p.from || "inicio"}_${p.to || "hoje"}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    await wb.xlsx.write(res);
    return res.end();
  } catch (error: any) {
    console.error("[Portal Parceiro] excel:", error?.message || error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "Erro ao gerar o extrato em Excel." });
    }
  }
};

/** GET /api/partner/recibos — recibos dos pagamentos da carteira. */
const recibos = async (req: Request, res: Response) => {
  try {
    const partner = getPartner(req);
    const result = await listRecibosByWallet(partner.companyId, partner.walletId);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("[Portal Parceiro] recibos:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao carregar os recibos." });
  }
};

/** GET /api/partner/recibos/:id/pdf — PDF do recibo (só da carteira do parceiro). */
const reciboPdf = async (req: Request, res: Response) => {
  try {
    const partner = getPartner(req);
    const id = Number(req.params.id);
    const recibo: any = (await ReciboModel.findByPk(id, { raw: true })) as any;
    if (!recibo || Number(recibo.companyId) !== partner.companyId || Number(recibo.walletId) !== partner.walletId) {
      return res.status(404).json({ success: false, message: "Recibo não encontrado nesta carteira." });
    }
    if (!recibo.pdf_url) {
      return res.status(404).json({ success: false, message: "PDF do recibo indisponível." });
    }
    const fileName = path.basename(String(recibo.pdf_url));
    const filePath = path.join(process.cwd(), "uploads", "docs", fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Ficheiro do recibo não encontrado no servidor." });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    return res.sendFile(filePath);
  } catch (error: any) {
    console.error("[Portal Parceiro] recibo pdf:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao obter o recibo." });
  }
};

export {
  profile,
  dashboard,
  loans,
  installments,
  mora,
  transactions,
  statement,
  statementExcel,
  recibos,
  reciboPdf,
};
