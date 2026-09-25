import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { Op } from "sequelize";
import { ReciboModel } from "../database/models/ReciboModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { LoanModel } from "../database/models/LoanModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { getCurrentUser } from "../middlewares/roles";
import {
  ensureReciboSeal,
  findReciboForValidation,
  generateReciboForTranzaction,
  getReciboDetalhe,
  listRecibosByCustomer,
  listRecibosByLoan,
  renderReciboPdf,
  SOFTWARE_CERTIFICATION,
  validationUrl,
} from "../services/reciboService";

/**
 * RECIBOS DE PAGAMENTO — numeração sequencial legal (AT Moçambique).
 * O recibo é por PAGAMENTO INDIVIDUAL e inclui o extrato do crédito com as
 * prestações pendentes (ver services/reciboService.ts).
 */

const ensureCompanyAccess = (req: Request, res: Response, companyId: number): boolean => {
  const user = getCurrentUser(req);
  if (!user) return true; // já validado pelo middleware de auth
  const userCompany = Number(user.companyId);
  if (userCompany && userCompany !== Number(companyId)) {
    res.status(403).json({ success: false, message: "Não tem acesso a dados desta empresa." });
    return false;
  }
  return true;
};

/**
 * POST /api/recibos/gerar/:tranzactionId
 * Gera (ou devolve, se já existir) o recibo de um pagamento.
 */
const gerar = async (req: Request, res: Response) => {
  try {
    const tranzactionId = Number(req.params.tranzactionId);
    const tranzaction: any = (await TranzactionModel.findByPk(tranzactionId, { raw: true })) as any;
    if (!tranzaction) {
      return res.status(404).json({ success: false, message: "Pagamento não encontrado." });
    }

    const companyId = Number(req.body?.companyId || tranzaction.companyId);
    if (!ensureCompanyAccess(req, res, companyId)) return;

    const user = getCurrentUser(req);
    const recibo: any = await generateReciboForTranzaction({
      tranzactionId,
      companyId,
      createdBy: user?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: `Recibo ${recibo.numero} emitido com sucesso.`,
      result: recibo,
      pdf_url: recibo.pdf_url || null,
    });
  } catch (error: any) {
    console.error("[Recibo] Erro ao gerar:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Erro ao emitir o recibo.",
    });
  }
};

/** GET /api/recibos/loan/:loanId?companyId= — recibos de um crédito. */
const byLoan = async (req: Request, res: Response) => {
  try {
    const loanId = Number(req.params.loanId);
    const loan: any = (await LoanModel.findByPk(loanId, { raw: true })) as any;
    if (!loan) return res.status(404).json({ success: false, message: "Crédito não encontrado." });
    const companyId = Number(req.query.companyId || loan.companyId);
    if (!ensureCompanyAccess(req, res, companyId)) return;

    const result = await listRecibosByLoan(companyId, loanId);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao listar os recibos do crédito." });
  }
};

/** GET /api/recibos/customer/:customerId?companyId= — recibos de um cliente. */
const byCustomer = async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.params.customerId);
    const companyId = Number(req.query.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, message: "companyId é obrigatório." });
    }
    if (!ensureCompanyAccess(req, res, companyId)) return;

    const result = await listRecibosByCustomer(companyId, customerId);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao listar os recibos do cliente." });
  }
};

/** GET /api/recibos/:id — recibo com extrato do crédito. */
const findOne = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const detalhe = await getReciboDetalhe(id);
    if (!detalhe) return res.status(404).json({ success: false, message: "Recibo não encontrado." });
    if (!ensureCompanyAccess(req, res, Number(detalhe.recibo.companyId))) return;

    return res.status(200).json({
      success: true,
      result: detalhe.recibo,
      cliente: detalhe.cliente || null,
      credito: detalhe.credito || null,
      prestacoes_pendentes: detalhe.prestacoesPendentes,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao carregar o recibo." });
  }
};

/** GET /api/recibos/:id/pdf — PDF (gera na primeira chamada, se necessário). */
const pdf = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const detalhe = await getReciboDetalhe(id);
    if (!detalhe) return res.status(404).json({ success: false, message: "Recibo não encontrado." });
    if (!ensureCompanyAccess(req, res, Number(detalhe.recibo.companyId))) return;

    let pdfUrl = detalhe.recibo.pdf_url;
    let filePath = pdfUrl ? path.join(process.cwd(), "uploads", "docs", path.basename(String(pdfUrl))) : "";
    // Recibos emitidos antes do selo electrónico são regenerados com o layout
    // actual (hash + QR Code + método de pagamento legível), para não servirem
    // um documento desactualizado.
    const precisaSelo =
      !detalhe.recibo.hash_at
      || !detalhe.recibo.qr_code_url
      || (!detalhe.recibo.metodo_pagamento_desc && !!detalhe.recibo.tranzactionId);
    // `?regenerate=1` força a re-impressão (útil quando o layout do recibo é
    // melhorado: o número, o hash e a sequência AT mantêm-se os mesmos).
    const regenerar = ["1", "true", "sim"].includes(
      String(req.query.regenerate || req.query.regenerar || "").toLowerCase()
    );
    if (!pdfUrl || !fs.existsSync(filePath) || precisaSelo || regenerar) {
      if (precisaSelo) await ensureReciboSeal(id);
      pdfUrl = await renderReciboPdf(id);
      filePath = pdfUrl ? path.join(process.cwd(), "uploads", "docs", path.basename(String(pdfUrl))) : "";
      if (pdfUrl) {
        const { ReciboModel } = await import("../database/models/ReciboModel");
        await ReciboModel.update({ pdf_url: pdfUrl }, { where: { id } });
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(500).json({ success: false, message: "Não foi possível gerar o PDF do recibo." });
    }

    const download = String(req.query.download || "") === "1";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${path.basename(filePath)}"`
    );
    return res.sendFile(filePath);
  } catch (error: any) {
    console.error("[Recibo] Erro no PDF:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao obter o PDF do recibo." });
  }
};

/**
 * GET /api/recibos/validar?hash=…&rec=REC-AAAA-XXXXX
 * VALIDAÇÃO PÚBLICA (sem autenticação) — é esta a página que o QR Code do
 * recibo abre. Confirma o selo SHA-256 e devolve o resumo do documento.
 */
const validar = async (req: Request, res: Response) => {
  try {
    const hash = String(req.query.hash || req.query.h || "").trim().toLowerCase();
    const numero = String(req.query.rec || req.query.numero || "").trim();
    if (!hash && !numero) {
      return res.status(400).json({
        success: false,
        valido: false,
        message: "Indique o número do recibo (rec) e/ou o hash para validação.",
      });
    }

    const reciboByNumero = numero ? await findReciboForValidation({ numero }) : null;
    const reciboByHash = hash ? await findReciboForValidation({ hash }) : null;
    const recibo: any = reciboByNumero || reciboByHash;

    if (!recibo) {
      return res.status(404).json({
        success: false,
        valido: false,
        message: "Recibo não encontrado. Confirme o número ou o hash indicado.",
      });
    }

    // Selo pode faltar em recibos emitidos antes desta versão: calcula-se agora.
    const selado = recibo.hash_at ? recibo : await ensureReciboSeal(Number(recibo.id));
    const hashRecibo = String(selado?.hash_at || "").toLowerCase();
    const hashBate = hash ? hash === hashRecibo : Boolean(numero) && Boolean(hashRecibo);

    // Hash e número têm de apontar para o MESMO recibo.
    if (hash && numero && reciboByHash && Number(reciboByHash.id) !== Number(reciboByNumero?.id)) {
      return res.status(409).json({
        success: false,
        valido: false,
        message: "O hash não corresponde ao número de recibo indicado.",
      });
    }

    const empresa: any = (await CompanyModel.findByPk(Number(recibo.companyId), { raw: true })) || {};

    return res.status(200).json({
      success: true,
      valido: hashBate,
      message: hashBate
        ? "Recibo válido — emitido electronicamente pela MBRM."
        : "Hash não corresponde ao recibo indicado.",
      software_certification: selado?.software_certification || SOFTWARE_CERTIFICATION,
      result: {
        numero: recibo.numero,
        serie: recibo.serie,
        ano: recibo.ano,
        sequencia: recibo.sequencia,
        at_validation_code: selado?.at_validation_code || null,
        hash_at: hashRecibo,
        emitido_em: recibo.created_at,
        emitente: {
          nome: empresa.companyName || null,
          nuit: empresa.companyNuit || null,
          endereco: empresa.companyAddress || null,
        },
        cliente: recibo.customer_name,
        cliente_nuit: recibo.customer_nuit,
        credito: recibo.loanId,
        carteira: recibo.wallet_nome,
        metodo_pagamento: recibo.metodo_pagamento_desc || recibo.metodo_pagamento,
        referencia: recibo.referencia,
        valor_pago: Number(recibo.valor_pago),
        valor_capital: Number(recibo.valor_capital),
        valor_juros: Number(recibo.valor_juros),
        valor_mora: Number(recibo.valor_mora),
        saldo_restante: Number(recibo.saldo_restante),
      },
      url_validacao: validationUrl({ numero: String(recibo.numero), hash: hashRecibo }),
    });
  } catch (error: any) {
    console.error("[Recibo] Erro na validação:", error?.message || error);
    return res.status(500).json({ success: false, valido: false, message: "Erro ao validar o recibo." });
  }
};

/**
 * POST /api/recibos/:id/enviar — envia o recibo (PDF + link de validação) por
 * e-mail, reutilizando o SMTP já configurado para as credenciais.
 */
const enviar = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const detalhe = await getReciboDetalhe(id);
    if (!detalhe) return res.status(404).json({ success: false, message: "Recibo não encontrado." });
    if (!ensureCompanyAccess(req, res, Number(detalhe.recibo.companyId))) return;

    const selado: any = detalhe.recibo.hash_at ? detalhe.recibo : await ensureReciboSeal(id);
    const destino = String(req.body?.email || detalhe.cliente?.customerEmail || "").trim();
    if (!destino) {
      return res.status(400).json({ success: false, message: "Indique o e-mail de destino." });
    }

    const pdfUrl = await renderReciboPdf(id);
    const filePath = pdfUrl ? path.join(process.cwd(), "uploads", "docs", path.basename(String(pdfUrl))) : "";
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(500).json({ success: false, message: "Não foi possível gerar o PDF do recibo." });
    }

    const empresa: any = (await CompanyModel.findByPk(Number(detalhe.recibo.companyId), { raw: true })) || {};
    const link = validationUrl({
      numero: String(detalhe.recibo.numero),
      hash: String(selado?.hash_at || detalhe.recibo.hash_at || ""),
    });

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "mail.outboxsolutions.co.mz",
      port: Number(process.env.EMAIL_PORT || 587),
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_SECRET },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: destino,
      subject: `Recibo ${detalhe.recibo.numero} — ${empresa.companyName || "MBRM"}`,
      html: `
        <p>Exmo(a). Sr(a). <b>${detalhe.recibo.customer_name || "Mutuário"}</b>,</p>
        <p>Segue em anexo o recibo <b>${detalhe.recibo.numero}</b> referente ao pagamento de
        <b>${Number(detalhe.recibo.valor_pago).toFixed(2)} MT</b>.</p>
        <ul>
          <li>Capital: ${Number(detalhe.recibo.valor_capital).toFixed(2)} MT</li>
          <li>Juros: ${Number(detalhe.recibo.valor_juros).toFixed(2)} MT</li>
          <li>Juros de mora: ${Number(detalhe.recibo.valor_mora).toFixed(2)} MT</li>
          <li>Saldo devedor após o pagamento: ${Number(detalhe.recibo.saldo_restante).toFixed(2)} MT</li>
        </ul>
        <p>Pode confirmar a autenticidade deste documento em <a href="${link}">${link}</a>.</p>
        <p>${empresa.companyName || "MBRM"} · NUIT ${empresa.companyNuit || "—"}</p>
      `,
      attachments: [{ filename: path.basename(filePath), path: filePath }],
    });

    return res.status(200).json({ success: true, message: `Recibo enviado para ${destino}.` });
  } catch (error: any) {
    console.error("[Recibo] Erro ao enviar:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Erro ao enviar o recibo por e-mail. Confirme a configuração SMTP.",
    });
  }
};

/**
 * POST /api/recibos/lookup { companyId, tranzactionIds }
 * Devolve, para uma lista de pagamentos, o número/hash do recibo já emitido.
 * Serve para a grelha de pagamentos mostrar o selo AT sem N pedidos.
 */
const lookup = async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.body?.companyId);
    const ids: number[] = Array.isArray(req.body?.tranzactionIds)
      ? req.body.tranzactionIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
      : [];

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, message: "companyId é obrigatório." });
    }
    if (ids.length === 0) return res.status(200).json({ success: true, result: [] });
    if (ids.length > 500) {
      return res.status(400).json({ success: false, message: "Máximo de 500 pagamentos por consulta." });
    }

    const recibos: any[] = (await ReciboModel.findAll({
      where: { companyId, tranzactionId: { [Op.in]: ids } },
      attributes: ["id", "numero", "hash_at", "tranzactionId", "wallet_nome", "metodo_pagamento_desc"],
      raw: true,
    })) as any[];

    return res.status(200).json({ success: true, result: recibos });
  } catch (error: any) {
    console.error("[Recibo] Erro no lookup:", error?.message || error);
    return res.status(500).json({ success: false, message: "Erro ao consultar os recibos dos pagamentos." });
  }
};

export { gerar, byLoan, byCustomer, findOne, pdf, validar, enviar, lookup };
