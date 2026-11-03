import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { db } from "../database/db";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerDocumentsModel } from "../database/models/CustomerDocumentsModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { DebtModel } from "../database/models/DebtModel";
import { LoanRenewalModel } from "../database/models/LoanRenewalModel";
import { AuditLogModel, PaymentAllocationModel } from "../database/models/paymentsV2Models";
import { creditAccountInTransaction } from "../services/treasuryService";
import { emitReciboInTransaction } from "../services/reciboService";
import {
  validateReembolsoAccount,
  getFirstCashAccount,
  ReembolsoAccount,
} from "../services/bankAccountResolver";
import { getOpenRegister, recordPayment } from "../services/cashRegisterService";
import { isElectronicCashMode } from "../services/cashModeService";
import { recordRepaymentLedger } from "../services/generalLedgerService";
import { methodToTreasury } from "../utils/paymentMethodMap";
import { actorFromRequest } from "../utils/requestActor";
import { round2 } from "../utils/money";
import {
  calculateRenewalQuote,
  generateLoanRenewalPdfBuffer,
  MoraMode,
} from "../services/loanRenewalService";

const removeUploadedFileSafely = (file?: Express.Multer.File | null) => {
  if (!file || !file.path) return;
  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  } catch {
    // ignore cleanup error
  }
};

/**
 * GET /api/installments/:id/renewal-quote
 * Calcula os valores oficiais para renovação de um crédito de 1 prestação:
 * - capital transitado, juros do período, juros de mora (com modo: charge | waive | discount),
 *   data do novo vencimento (+1 mês por defeito) e valor da nova prestação.
 */
export const getInstallmentRenewalQuote = async (req: Request, res: Response) => {
  try {
    const installmentId = Number(req.params.id);
    if (!Number.isInteger(installmentId) || installmentId <= 0) {
      return res.status(400).json({ success: false, message: "ID da prestação inválido." });
    }

    const payDate = req.query.payDate ? String(req.query.payDate).slice(0, 10) : undefined;
    const newDueDate = req.query.newDueDate ? String(req.query.newDueDate).slice(0, 10) : undefined;
    const moraMode = (req.query.moraMode as MoraMode) || "charge";
    const moraCustomAmount =
      req.query.moraCustomAmount !== undefined ? Number(req.query.moraCustomAmount) : undefined;

    const quote = await calculateRenewalQuote({
      installmentId,
      payDate,
      newDueDate,
      moraMode,
      moraCustomAmount,
    });

    return res.status(200).json({
      success: true,
      result: quote,
    });
  } catch (err: any) {
    const status = Number(err?.status) || 500;
    return res.status(status).json({
      success: false,
      message: err?.message || "Erro ao calcular cotação de renovação.",
    });
  }
};

/**
 * GET /api/installments/:id/renewal-minuta/pdf
 * Gera e devolve o PDF da Minuta do Termo de Renovação e Confissão de Dívida
 * para impressão e assinatura pelo mutuário antes do upload obrigatório.
 */
export const downloadInstallmentRenewalMinutaPdf = async (req: Request, res: Response) => {
  try {
    const installmentId = Number(req.params.id);
    if (!Number.isInteger(installmentId) || installmentId <= 0) {
      return res.status(400).json({ success: false, message: "ID da prestação inválido." });
    }

    const payDate = req.query.payDate ? String(req.query.payDate).slice(0, 10) : undefined;
    const newDueDate = req.query.newDueDate ? String(req.query.newDueDate).slice(0, 10) : undefined;
    const moraMode = (req.query.moraMode as MoraMode) || "charge";
    const moraCustomAmount =
      req.query.moraCustomAmount !== undefined ? Number(req.query.moraCustomAmount) : undefined;
    const notes = req.query.notes ? String(req.query.notes) : null;

    const quote = await calculateRenewalQuote({
      installmentId,
      payDate,
      newDueDate,
      moraMode,
      moraCustomAmount,
    });

    if (!quote.eligible) {
      return res.status(400).json({
        success: false,
        message: quote.ineligibleReason || "Este crédito não é elegível para renovação.",
      });
    }

    const pdfBuffer = await generateLoanRenewalPdfBuffer(quote, notes);
    const filename = `Termo_Renovacao_Credito_${quote.loanId}_${quote.renewalNumber}a_Renovacao.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", String(pdfBuffer.length));
    return res.status(200).send(pdfBuffer);
  } catch (err: any) {
    console.error("[RenewalMinutaPDF] Erro:", err?.message || err);
    const status = Number(err?.status) || 500;
    return res.status(status).json({
      success: false,
      message: err?.message || "Erro ao gerar PDF do termo de renovação.",
    });
  }
};

/**
 * POST /api/installments/:id/renew
 * Executa a renovação atómica de um crédito de 1 prestação mediante:
 * 1. Upload OBRIGATÓRIO do documento assinado pelo mutuário (`signedDocument`).
 * 2. Liquidação dos juros do período actual (+ mora, salvo isenção/perdão parcial ou total).
 *    - Se os juros já tiverem sido pagos como pagamento parcial (ex.: Pago Parcial = valor dos juros),
 *      converte e formaliza a renovação sem duplicar cobrança.
 *    - Se houver valor a cobrar agora (`totalToPayNow > 0`), regista a transacção financeira,
 *      alocações, crédito na conta destino, recibo oficial, movimento de caixa e livro razão.
 * 3. Fecho da prestação actual apenas pelos juros (`amortization = 0`, `status = 1`) e criação
 *    da prestação do novo período (`amortization = principalAmount`, `rateAmount = newInterestAmount`,
 *    `installment = principalAmount + newInterestAmount`, `dueDate = newDueDate`, `status = 0`).
 */
export const renewSingleInstallmentLoan = async (req: Request, res: Response) => {
  const uploadedFile = (req as any).file as Express.Multer.File | undefined;

  try {
    const installmentId = Number(req.params.id);
    if (!Number.isInteger(installmentId) || installmentId <= 0) {
      removeUploadedFileSafely(uploadedFile);
      return res.status(400).json({ success: false, message: "ID da prestação inválido." });
    }

    // REGRA 1: Upload do documento assinado é estritamente obrigatório
    if (!uploadedFile || !uploadedFile.filename) {
      return res.status(400).json({
        success: false,
        error: "SIGNED_DOCUMENT_REQUIRED",
        message:
          "O upload do Termo de Renovação assinado pelo mutuário é obrigatório para renovar o contrato.",
      });
    }

    const actor = await actorFromRequest(req);
    const body = req.body || {};
    const actorUserId = Number((actor as any)?.userId || (actor as any)?.id) || null;
    const staffName = String(body.staffName || (actor as any)?.name || "Operador");
    const payDate = body.payDate
      ? String(body.payDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const newDueDate = body.newDueDate ? String(body.newDueDate).slice(0, 10) : undefined;
    const moraMode: MoraMode =
      body.moraMode === "waive" || body.moraMode === "discount" || body.moraMode === "charge"
        ? body.moraMode
        : "charge";
    const moraCustomAmount =
      body.moraCustomAmount !== undefined ? Number(body.moraCustomAmount) : undefined;
    const notes = body.notes ? String(body.notes).trim() : null;

    const quote = await calculateRenewalQuote({
      installmentId,
      payDate,
      newDueDate,
      moraMode,
      moraCustomAmount,
    });

    // REGRA 2: Apenas créditos de prestação única (1 prestação)
    if (!quote.eligible) {
      removeUploadedFileSafely(uploadedFile);
      return res.status(400).json({
        success: false,
        error: "LOAN_NOT_ELIGIBLE_FOR_RENEWAL",
        message:
          quote.ineligibleReason ||
          "A renovação por pagamento de juros não pode ser aplicada a créditos com várias prestações.",
      });
    }

    if (quote.newDueDate <= quote.payDate) {
      removeUploadedFileSafely(uploadedFile);
      return res.status(400).json({
        success: false,
        message: "A nova data de vencimento deve ser posterior à data da renovação.",
      });
    }

    const needsPaymentNow = quote.totalToPayNow > 0.009;
    let resolvedAccountId = 0;
    let resolvedAccount: ReembolsoAccount | null = null;
    let cleanReference = String(body.tranzactionReference || "").trim();
    let openRegister: any = null;

    if (needsPaymentNow) {
      // Verificar se o caixa do dia está aberto para receber o pagamento dos juros/mora
      const isElectronic = await isElectronicCashMode(quote.companyId);
      if (isElectronic) {
        openRegister = { mode: "ELECTRONIC", id: null, bank_account_id: null };
      } else {
        openRegister = await getOpenRegister(actorUserId || 0, quote.companyId);
        if (!openRegister) {
          removeUploadedFileSafely(uploadedFile);
          return res.status(403).json({
            success: false,
            code: "CASH_REGISTER_CLOSED",
            error: "Caixa fechado. Abra o caixa do dia antes de registar o pagamento da renovação.",
            message: "Caixa fechado. Abra o caixa do dia antes de registar o pagamento da renovação.",
          });
        }
      }

      const candidateAccountId =
        Number(body.bank_account_id) ||
        Number(body.bankAccountId) ||
        Number(body.paymentMethod) ||
        Number(openRegister?.getDataValue?.("bank_account_id") ?? openRegister?.bank_account_id) ||
        0;

      if (candidateAccountId > 0) {
        try {
          resolvedAccount = await validateReembolsoAccount(candidateAccountId, quote.companyId);
          resolvedAccountId = resolvedAccount.id;
        } catch (accErr: any) {
          removeUploadedFileSafely(uploadedFile);
          return res.status(accErr?.http || 400).json(
            accErr?.payload || {
              success: false,
              message: "Conta de destino inválida para recebimento.",
            }
          );
        }
      } else {
        const cashAcc = await getFirstCashAccount(quote.companyId);
        if (!cashAcc) {
          removeUploadedFileSafely(uploadedFile);
          return res.status(400).json({
            success: false,
            message: "Selecione a conta de recebimento para liquidar os juros da renovação.",
          });
        }
        resolvedAccount = cashAcc;
        resolvedAccountId = cashAcc.id;
      }

      const isCashAccount =
        String(resolvedAccount?.type || "").toUpperCase() === "CAIXA_FISICO" ||
        String(resolvedAccount?.name || "")
          .toLowerCase()
          .includes("caixa");

      if (!isCashAccount && !cleanReference) {
        removeUploadedFileSafely(uploadedFile);
        return res.status(400).json({
          success: false,
          message:
            "A referência do comprovativo (M-Pesa, e-Mola ou Talão Bancário) é obrigatória para recebimentos fora de caixa físico.",
        });
      }

      if (cleanReference) {
        const dup = await TranzactionModel.findOne({
          where: {
            companyId: quote.companyId,
            tranzactionReference: cleanReference,
          },
        });
        if (dup) {
          removeUploadedFileSafely(uploadedFile);
          return res.status(409).json({
            success: false,
            error: "DUPLICATE_REFERENCE",
            message: `Já existe um pagamento registado com a referência "${cleanReference}".`,
          });
        }
      } else {
        cleanReference = `REN-${quote.loanId}-${quote.renewalNumber}-${Date.now().toString().slice(-5)}`;
      }
    }

    // Gerar o PDF oficial do Termo de Renovação e guardá-lo em uploads/documents
    const pdfBuffer = await generateLoanRenewalPdfBuffer(quote, notes);
    const generatedDocFile = `termo_renovacao_loan_${quote.loanId}_r${quote.renewalNumber}_${Date.now()}.pdf`;
    const docsDir = path.resolve(process.cwd(), "uploads", "documents");
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(docsDir, generatedDocFile), pdfBuffer);

    let createdTxId: number | null = null;
    let emittedRecibo: any = null;
    let renewalRecord: any = null;
    let newInstallmentRecord: any = null;

    await db.transaction(async (t) => {
      const lockedInst: any = await AmorizationLoanModel.findOne({
        where: { id: installmentId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      const lockedLoan: any = await LoanModel.findOne({
        where: { id: quote.loanId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!lockedInst || !lockedLoan) {
        throw new Error("Prestação ou contrato de crédito não encontrado.");
      }
      if (Number(lockedInst.getDataValue("status")) === 1) {
        throw new Error("Esta prestação já foi liquidada ou renovada.");
      }

      const walletId = Number(lockedLoan.getDataValue("walletId")) || null;

      // Se os juros já tinham sido pagos anteriormente como pagamento parcial,
      // procurar a última transacção desta prestação para vincular à renovação
      if (!needsPaymentNow) {
        const prevTx: any = await TranzactionModel.findOne({
          where: { amortizationLoanId: installmentId },
          order: [["id", "DESC"]],
          transaction: t,
        });
        if (prevTx) {
          createdTxId = Number(prevTx.getDataValue("id"));
        }
      } else {
        const createdTx: any = await TranzactionModel.create(
          {
            companyId: quote.companyId,
            loanId: quote.loanId,
            amortizationLoanId: installmentId,
            accountNumber: quote.accountNumber,
            customerId: quote.customerId,
            tranzactionReference: cleanReference,
            amount: quote.totalToPayNow,
            totalAmount: quote.totalToPayNow,
            interestRateAmount: quote.interestRemainingToPay,
            latePaymentInterest: quote.moraCharged,
            mora_amount: quote.moraCharged,
            discountApplied: quote.moraWaived > 0,
            discountAmount: quote.moraWaived,
            paymentDate: quote.payDate,
            paymentMethod: Number(body.paymentMethod) || resolvedAccountId,
            bank_account_id: resolvedAccountId,
            description: `${quote.renewalNumber}ª Renovação de Contrato — Liquidação de Juros (${quote.installmentOrder}ª Prestação)`,
            staffName,
            received_by: actorUserId,
            received_ip: req.ip || null,
            status: "CONFIRMED",
            walletId,
            notes:
              notes ||
              `${quote.renewalNumber}ª Renovação de Contrato (Liquidação exclusiva de juros — Capital transitado: ${quote.principalAmount} MZN)`,
          } as any,
          { transaction: t }
        );

        createdTxId = Number(createdTx.getDataValue("id"));

        // Alocações analíticas do pagamento (LATE_INTEREST + INTEREST; CAPITAL = 0)
        const allocRows: any[] = [];
        if (quote.moraCharged > 0) {
          allocRows.push({
            payment_id: createdTxId,
            amortization_loan_id: installmentId,
            component: "LATE_INTEREST",
            amount: quote.moraCharged,
          });
        }
        if (quote.interestRemainingToPay > 0) {
          allocRows.push({
            payment_id: createdTxId,
            amortization_loan_id: installmentId,
            component: "INTEREST",
            amount: quote.interestRemainingToPay,
          });
        }
        if (allocRows.length > 0) {
          await PaymentAllocationModel.bulkCreate(allocRows, { transaction: t });
        }

        // Creditar conta bancária / caixa físico dentro da transacção
        await creditAccountInTransaction({
          companyId: quote.companyId,
          accountId: resolvedAccountId,
          amount: quote.totalToPayNow,
          description: `Renovação de crédito #${quote.loanId} (Juros) — conta ${quote.accountNumber}`,
          userId: actorUserId,
          cashRegisterId: Number(openRegister?.getDataValue?.("id") ?? openRegister?.id) || null,
          referenceType: "tranzactions",
          referenceId: createdTxId,
          transaction: t,
        });

        // Emitir recibo legal
        emittedRecibo = await emitReciboInTransaction({
          tranzactionId: createdTxId,
          companyId: quote.companyId,
          createdBy: actorUserId,
          ip: req.ip || null,
          transaction: t,
        });
      }

      // 1. Fechar a prestação actual apenas pelos juros pagos (amortization = 0 para
      //    que o capital transite integralmente para a nova prestação sem inflacionar SUM(amortization))
      const settledInterest = round2(Math.max(quote.interestAmount, quote.alreadyPaid));
      await lockedInst.update(
        {
          amortization: 0,
          rateAmount: settledInterest,
          installment: settledInterest,
          paidAmount: settledInterest,
          remainingBalance: quote.principalAmount,
          mora_amount: quote.moraCharged,
          mora_days: quote.moraDays,
          status: 1,
        },
        { transaction: t }
      );

      // Remover registo de dívida em atraso (debts) da prestação anterior, se existir
      await DebtModel.destroy({
        where: { amortisationId: installmentId },
        transaction: t,
      });

      // 2. Criar a nova prestação para o próximo período com o capital transitado + novos juros
      newInstallmentRecord = await AmorizationLoanModel.create(
        {
          companyId: quote.companyId,
          loanId: quote.loanId,
          installmentOrder: quote.nextInstallmentOrder,
          accountNumber: quote.accountNumber,
          customerId: quote.customerId,
          amortization: quote.principalAmount,
          rateAmount: quote.newInterestAmount,
          installment: quote.newInstallmentAmount,
          remainingBalance: 0,
          dueDate: quote.newDueDate,
          status: 0,
          paidAmount: 0,
          walletId,
          mora_amount: 0,
          mora_days: 0,
        } as any,
        { transaction: t }
      );

      const newInstallmentId = Number(newInstallmentRecord.getDataValue("id"));

      // 3. Incrementar contador de renovações no contrato (mantendo numberOfInstallments = 1)
      await lockedLoan.update(
        {
          renewalCount: quote.renewalNumber,
          status: 1,
        } as any,
        { transaction: t }
      );

      // 4. Registar na tabela loan_renewals
      renewalRecord = await LoanRenewalModel.create(
        {
          companyId: quote.companyId,
          loanId: quote.loanId,
          customerId: quote.customerId,
          accountNumber: quote.accountNumber,
          fromInstallmentId: installmentId,
          toInstallmentId: newInstallmentId,
          tranzactionId: createdTxId,
          renewalNumber: quote.renewalNumber,
          principalAmount: quote.principalAmount,
          interestPaid: settledInterest,
          moraCalculated: quote.moraCalculated,
          moraCharged: quote.moraCharged,
          moraWaived: quote.moraWaived,
          newInterestAmount: quote.newInterestAmount,
          newInstallmentAmount: quote.newInstallmentAmount,
          previousDueDate: quote.previousDueDate,
          newDueDate: quote.newDueDate,
          renewalDate: quote.payDate,
          generatedDocFile,
          signedDocFile: uploadedFile.filename,
          notes,
          createdBy: actorUserId,
          createdByName: staffName,
        } as any,
        { transaction: t }
      );

      // 5. Registar o documento assinado também no dossier documental do cliente
      await CustomerDocumentsModel.create(
        {
          companyId: quote.companyId,
          accountNumber: quote.accountNumber,
          customerId: quote.customerId,
          documentName: `Termo de Renovação Assinado (${quote.renewalNumber}ª Renovação - Crédito #${quote.loanId})`,
          documentFileUrl: uploadedFile.filename,
          uploadedBy: staffName,
        } as any,
        { transaction: t }
      );

      // 6. Registo de Auditoria
      await AuditLogModel.create(
        {
          user_id: actorUserId,
          company_id: quote.companyId,
          ip: req.ip || null,
          action: "LOAN_RENEWED_BY_INTEREST",
          entity: "customer_loans",
          entity_id: quote.loanId,
          before_data: {
            fromInstallmentId: installmentId,
            previousDueDate: quote.previousDueDate,
            alreadyPaid: quote.alreadyPaid,
            moraCalculated: quote.moraCalculated,
          },
          after_data: {
            renewalId: Number(renewalRecord.getDataValue("id")),
            renewalNumber: quote.renewalNumber,
            toInstallmentId: newInstallmentId,
            newDueDate: quote.newDueDate,
            principalAmount: quote.principalAmount,
            interestPaid: settledInterest,
            moraCharged: quote.moraCharged,
            moraWaived: quote.moraWaived,
            newInstallmentAmount: quote.newInstallmentAmount,
            signedDocFile: uploadedFile.filename,
          },
        } as any,
        { transaction: t }
      );
    });

    // Registos pós-commit no caixa diário e contabilidade geral (quando há pagamento novo)
    if (needsPaymentNow && createdTxId) {
      try {
        await recordPayment({
          companyId: quote.companyId,
          userId: actorUserId || undefined,
          loanId: quote.loanId,
          amortizationLoanId: installmentId,
          tranzactionId: createdTxId,
          customerId: quote.customerId || null,
          amount: quote.totalToPayNow,
          lateInterest: 0,
          adminFee: 0,
          accountNumber: quote.accountNumber,
          paymentMethod: methodToTreasury(body.paymentMethod || resolvedAccountId),
          bankAccountId: resolvedAccountId,
          skipAccountLedger: true,
        });
      } catch (cashErr: any) {
        console.error("[RenewLoan] Aviso ao registar movimento de caixa:", cashErr?.message || cashErr);
      }

      try {
        await recordRepaymentLedger({
          companyId: quote.companyId,
          tranzactionId: createdTxId,
          loanId: quote.loanId,
          capital: 0,
          interest: quote.interestRemainingToPay,
          lateInterest: quote.moraCharged,
          paymentMethod: methodToTreasury(body.paymentMethod || resolvedAccountId),
          bankAccountId: resolvedAccountId,
          userId: actorUserId || undefined,
        });
      } catch (ledgerErr: any) {
        console.error("[RenewLoan] Aviso ao registar livro razão:", ledgerErr?.message || ledgerErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${quote.renewalNumber}ª Renovação do Crédito #${quote.loanId} concluída com sucesso! Novo vencimento: ${quote.newDueDate}.`,
      result: {
        renewal: renewalRecord,
        newInstallment: newInstallmentRecord,
        tranzactionId: createdTxId,
        recibo: emittedRecibo,
        quote,
      },
    });
  } catch (err: any) {
    removeUploadedFileSafely(uploadedFile);
    console.error("[RenewLoan] Erro ao processar renovação:", err?.message || err);
    const status = Number(err?.status || err?.http) || 500;
    return res.status(status).json({
      success: false,
      message: err?.payload?.message || err?.message || "Erro interno ao processar a renovação do crédito.",
    });
  }
};

/**
 * GET /api/loans/:loanId/renewals
 * Lista o histórico de todas as renovações de um contrato de crédito.
 */
export const listLoanRenewals = async (req: Request, res: Response) => {
  try {
    const loanId = Number(req.params.loanId);
    if (!Number.isInteger(loanId) || loanId <= 0) {
      return res.status(400).json({ success: false, message: "ID do crédito inválido." });
    }

    const renewals = await LoanRenewalModel.findAll({
      where: { loanId },
      order: [
        ["renewalNumber", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.status(200).json({
      success: true,
      result: renewals || [],
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Erro ao listar renovações do crédito.",
    });
  }
};

/**
 * GET /api/renewals/:renewalId/document/:kind
 * Devolve o ficheiro da minuta gerada (`kind = 'generated'`) ou o documento
 * assinado carregado no momento da renovação (`kind = 'signed'`).
 */
export const downloadRenewalDocument = async (req: Request, res: Response) => {
  try {
    const renewalId = Number(req.params.renewalId);
    const kind = String(req.params.kind || "signed").toLowerCase();

    const renewal: any = await LoanRenewalModel.findByPk(renewalId, { raw: true });
    if (!renewal) {
      return res.status(404).json({ success: false, message: "Registo de renovação não encontrado." });
    }

    const fileName =
      kind === "generated" ? renewal.generatedDocFile : renewal.signedDocFile;
    if (!fileName) {
      return res.status(404).json({ success: false, message: "Ficheiro não disponível." });
    }

    const safeBase = path.basename(String(fileName));
    const filePath = path.resolve(process.cwd(), "uploads", "documents", safeBase);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Ficheiro não encontrado no servidor." });
    }

    const ext = path.extname(safeBase).toLowerCase();
    const mime =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
          ? "image/png"
          : "image/jpeg";

    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `inline; filename="${safeBase}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Erro ao transferir documento da renovação.",
    });
  }
};
