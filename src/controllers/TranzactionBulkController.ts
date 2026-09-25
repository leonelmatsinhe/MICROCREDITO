import { Request, Response } from "express";
import moment from "moment";
import { db } from "../database/db";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { LoanModel } from "../database/models/LoanModel";
import { CompanyModel } from "../database/models/CompanyModel";
import { Op } from "sequelize";
import { installmentPanification } from "../utils/calculateLateAmount";

/**
 * POST /api/tranzaction/bulk — Liquidação Total ATÓMICA.
 *
 * O frontend chamava POST /api/tranzaction em loop: se a 3ª prestação
 * falhasse, ficava um crédito meio pago e sem forma de desfazer.
 * Aqui todas as prestações pendentes são liquidadas DENTRO de uma
 * sequelize.transaction — qualquer falha faz rollback de tudo.
 *
 * Body: {
 *   companyId, accountNumber, loanId,
 *   paymentMethod, tranzactionReference, phoneNumber, staffName,
 *   paymentDate, notes?,
 *   discountApplied?: boolean, discountType?: 'percentage'|'fixed',
 *   discountPercentage?: number, discountFixed?: number
 * }
 */
const addTranzactionBulk = async (req: Request, res: Response) => {
  const {
    companyId,
    accountNumber,
    loanId,
    phoneNumber,
    tranzactionReference,
    paymentMethod,
    description,
    staffName,
    paymentDate,
    notes,
    discountApplied,
    discountType,
    discountPercentage,
    discountFixed,
  } = req.body || {};

  // ── Validações de entrada ──
  if (!companyId || !accountNumber || !loanId) {
    return res.status(400).send({ success: false, message: "companyId, accountNumber e loanId são obrigatórios." });
  }
  if (!paymentMethod || !tranzactionReference || !staffName) {
    return res.status(400).send({ success: false, message: "Meio de pagamento, referência e funcionário são obrigatórios." });
  }
  const todayDate = new Date().toISOString().slice(0, 10);
  const payDate = paymentDate ? String(paymentDate).slice(0, 10) : todayDate;
  if (payDate > todayDate) {
    return res.status(400).send({ success: false, message: "A data de pagamento não pode ser futura." });
  }

  try {
    // ── Snapshot FORA da transacção: valida e calcula valores ──
    const loan: any = await LoanModel.findByPk(Number(loanId));
    if (!loan) {
      return res.status(404).send({ success: false, message: "Crédito não encontrado." });
    }

    const installments: any[] = await AmorizationLoanModel.findAll({
      where: { loanId: Number(loanId), status: { [Op.ne]: 1 } },
      order: [["dueDate", "ASC"], ["id", "ASC"]],
    });
    if (installments.length === 0) {
      return res.status(409).send({ success: false, message: "Este crédito já está totalmente liquidado." });
    }

    const company = await CompanyModel.findByPk(loan.getDataValue("companyId"), { attributes: ["forfeit"] });
    const forfeit = Number(company?.getDataValue("forfeit") || 0);

    // Planeamento idêntico ao addTranzaction individual: mora do dia menos a
    // mora já cobrada em transacções anteriores da mesma prestação.
    const planned: any[] = [];
    for (const installment of installments) {
      const amortizationLoanId = Number(installment.getDataValue("id"));
      const calculatedInstallment = installmentPanification(
        [installment],
        forfeit,
        payDate
      )[0];
      const previousLateInterest = await TranzactionModel.findAll({
        where: { amortizationLoanId },
        attributes: ["latePaymentInterest"],
        raw: true,
      });
      const alreadyChargedLate = previousLateInterest.reduce(
        (sum: number, t: any) => sum + (Number(t.latePaymentInterest) || 0),
        0
      );
      const effectiveLateInterest = Math.max(
        0,
        Number(calculatedInstallment?.latePaymentInterest || 0) - alreadyChargedLate
      );

      const installmentValue = Number(installment.getDataValue("installment")) || 0;
      const alreadyPaid = Number(installment.getDataValue("paidAmount")) || 0;
      const remaining = Math.max(0, Math.round((installmentValue - alreadyPaid) * 100) / 100);

      // Desconto de liquidação antecipada proporcional ao peso desta
      // prestação no total pendente (percentual) ou rateio do valor fixo.
      let discountAmount = 0;
      if (discountApplied) {
        if (String(discountType) === "fixed") {
          const pendingTotal = installments.reduce(
            (sum: number, i: any) =>
              sum + Math.max(0, (Number(i.getDataValue("installment")) || 0) - (Number(i.getDataValue("paidAmount")) || 0)),
            0
          );
          const share = pendingTotal > 0 ? remaining / pendingTotal : 0;
          discountAmount = Math.min(remaining, Math.round((Number(discountFixed) || 0) * share * 100) / 100);
        } else {
          discountAmount = Math.min(remaining, Math.round(remaining * ((Number(discountPercentage) || 0) / 100) * 100) / 100);
        }
      }

      // amount = saldo da prestação menos o desconto (o cliente não paga a
      // parte descontada); totalAmount = amount + mora (recibo/legal).
      const amount = Math.max(0, Math.round((remaining - discountAmount) * 100) / 100);
      const totalAmount = Math.round((amount + effectiveLateInterest) * 100) / 100;

      planned.push({
        amortizationLoanId,
        amount,
        totalAmount,
        latePaymentInterest: effectiveLateInterest,
        discountAmount,
        rateAmount: Number(installment.getDataValue("rateAmount")) || 0,
        installmentOrder: String(installment.getDataValue("installmentOrder") || ""),
        dueDate: installment.getDataValue("dueDate"),
      });
    }

    // ── Transacção atómica: tudo ou nada ──
    const transaction = await db.transaction();
    try {
      const createdTransactions: any[] = [];
      for (const item of planned) {
        const tranzaction = await TranzactionModel.create(
          {
            companyId,
            accountNumber,
            customerId: loan.getDataValue("customerId"),
            amortizationLoanId: item.amortizationLoanId,
            amount: item.amount,
            totalAmount: item.totalAmount,
            latePaymentInterest: item.latePaymentInterest,
            interestRateAmount: item.rateAmount,
            phoneNumber,
            tranzactionReference,
            paymentMethod,
            description:
              description ||
              `Liquidação total - Prestação ${item.installmentOrder}${discountApplied ? " (com desconto)" : ""}`,
            receiptUrl: "",
            staffName,
            loanId: Number(loanId),
            paymentDate: payDate,
            notes: notes || null,
            discountApplied: !!discountApplied,
            discountAmount: item.discountAmount,
            walletId: loan.getDataValue("walletId") || null,
            mora_amount: item.latePaymentInterest,
          },
          { transaction }
        );
        createdTransactions.push(tranzaction);

        await AmorizationLoanModel.update(
          {
            status: 1,
            paidAmount: Math.min(
              Number(installments.find((i: any) => Number(i.getDataValue("id")) === item.amortizationLoanId)
                ?.getDataValue("installment")) || 0,
              Number(
                installments.find((i: any) => Number(i.getDataValue("id")) === item.amortizationLoanId)
                  ?.getDataValue("paidAmount") || 0
              ) + item.amount
            ),
            remainingBalance: 0,
            ...(item.latePaymentInterest > 0
              ? {
                  mora_amount: Math.round(
                    ((Number(
                      installments.find((i: any) => Number(i.getDataValue("id")) === item.amortizationLoanId)
                        ?.getDataValue("mora_amount")
                    ) || 0) +
                      item.latePaymentInterest) *
                      100
                  ) / 100,
                  mora_days: Math.max(
                    0,
                    moment(payDate).diff(moment(item.dueDate), "days")
                  ),
                }
              : {}),
          },
          { where: { id: item.amortizationLoanId }, transaction }
        );
      }

      await transaction.commit();

      // ── Pós-commit (best-effort, fora da transacção) ──
      try {
        const { recordPayment } = await import("../services/cashRegisterService");
        const openRegister = (req as any).cashRegister;
        if (openRegister) {
          const jwt = await import("jsonwebtoken");
          const decoded: any = jwt.verify(
            (req.headers.authorization || "").split(" ")[1] || "",
            process.env.APP_SECRET + ""
          );
          for (const item of planned) {
            await recordPayment({
              companyId: Number(companyId),
              userId: Number(decoded?.id) || undefined,
              loanId: Number(loanId),
              amortizationLoanId: item.amortizationLoanId,
              tranzactionId: Number(createdTransactions.find((t: any) => Number(t.getDataValue("amortizationLoanId")) === item.amortizationLoanId)?.getDataValue("id")),
              customerId: Number(loan.getDataValue("customerId")),
              amount: item.amount,
              lateInterest: item.latePaymentInterest,
              adminFee: 0,
              accountNumber,
              paymentMethod: String((req.body as any)?.payment_method || "CASH"),
              bankAccountId: (req.body as any)?.bank_account_id ? Number((req.body as any).bank_account_id) : null,
            });
          }
        }
      } catch (cashError: any) {
        console.error("[CAIXA] Falha ao registar liquidação no caixa (pagamentos mantidos):", cashError?.message || cashError);
      }

      // Recibos individuais (numeração sequencial legal) — best-effort.
      const recibos: any[] = [];
      try {
        const { generateReciboForTranzaction } = await import("../services/reciboService");
        for (const t of createdTransactions) {
          try {
            const recibo = await generateReciboForTranzaction({
              tranzactionId: Number(t.getDataValue("id")),
              companyId: Number(companyId),
              createdBy: null,
            });
            if (recibo) {
              recibos.push({ id: recibo.id, numero: recibo.numero, pdf_url: recibo.pdf_url || null });
            }
          } catch (reciboError: any) {
            console.error("[Recibo] Falha ao emitir recibo da liquidação:", reciboError?.message || reciboError);
          }
        }
      } catch (reciboServiceError: any) {
        console.error("[Recibo] Serviço indisponível:", reciboServiceError?.message || reciboServiceError);
      }

      // Liquidação do crédito + notificações (mesma lógica do pagamento único).
      try {
        const { checkAndLiquidateLoan } = await import("./TranzactionController");
        await checkAndLiquidateLoan(Number(loanId), Number(companyId), Number(accountNumber));
      } catch (liquidateError: any) {
        console.error("Erro ao verificar liquidação do crédito:", liquidateError);
      }

      try {
        const { enqueuePaymentSms } = await import("../services/SmsGatewayService");
        await enqueuePaymentSms({
          companyId: Number(companyId),
          transactionId: Number(createdTransactions[0]?.getDataValue("id")),
          loanId: Number(loanId),
          amortizationLoanId: Number(planned[0]?.amortizationLoanId),
          accountNumber,
          paidAmount: Number(planned.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2)),
          latePaymentInterest: Number(planned.reduce((sum: number, p: any) => sum + p.latePaymentInterest, 0).toFixed(2)),
          paymentDate: payDate,
          reference: tranzactionReference,
        });
      } catch (smsError) {
        console.error("Erro ao enfileirar SMS de liquidação:", smsError);
      }

      return res.status(201).send({
        success: true,
        message: `Liquidação de ${planned.length} prestação(ões) registada com sucesso.`,
        result: {
          transactions: createdTransactions.map((t: any) => Number(t.getDataValue("id"))),
          totalPaid: Number(planned.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2)),
          totalLateInterest: Number(planned.reduce((sum: number, p: any) => sum + p.latePaymentInterest, 0).toFixed(2)),
          totalDiscount: Number(planned.reduce((sum: number, p: any) => sum + p.discountAmount, 0).toFixed(2)),
          installmentsCleared: planned.length,
        },
        recibos,
      });
    } catch (txError: any) {
      await transaction.rollback();
      console.error("[BULK] Rollback da liquidação total:", txError);
      return res.status(500).send({
        success: false,
        message: "Falha na liquidação total — todas as prestações foram revertidas. Tente novamente.",
        error: txError?.message,
      });
    }
  } catch (error: any) {
    console.error("Erro no bulk de transacções:", error);
    return res.status(500).send({
      success: false,
      message: error?.message || "Erro interno na liquidação total.",
    });
  }
};

export { addTranzactionBulk };
