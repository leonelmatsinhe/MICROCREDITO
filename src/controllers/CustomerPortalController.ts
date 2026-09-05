import { Request, Response } from "express";
import { Op } from "sequelize";
import { db } from "../database/db";
import { hashPasswordIfNeeded } from "../utils/password";
import { CustomerModel } from "../database/models/CustomerModel";
import { LoanModel } from "../database/models/LoanModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { DebtModel } from "../database/models/DebtModel";
import { UserModel } from "../database/models/UserModel";
import { NotificationModel } from "../database/models/NotificationModel";
import { checkAndLiquidateLoan } from "./TranzactionController";
import mpesa from "mpesa-node-api";
import { MpesaResponse } from "../interfaces/Simulator";
import { installmentPanification } from "../utils/calculateLateAmount";
import { CompanyModel } from "../database/models/CompanyModel";

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Dashboard do mutuário — créditos, prestações, resumo
export const getCustomerDashboard = async (req: Request, res: Response) => {
  try {
    const { customerId, companyId } = req.params;
    const customerIdNum = parseInt(String(customerId), 10);
    const companyIdNum = parseInt(String(companyId), 10);

    if (Number.isNaN(customerIdNum) || Number.isNaN(companyIdNum)) {
      return res.status(400).json({ success: false, message: "IDs inválidos." });
    }

    // Buscar cliente
    const customer = await CustomerModel.findOne({
      where: { id: customerIdNum, companyId: companyIdNum },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Cliente não encontrado." });
    }

    const customerData = customer.toJSON() as any;

    // Taxa diária de mora da empresa (percentagem, ex.: 0.1 = 0,1%/dia) — mesma
    // fonte usada pelo Admin/Gestor em /api/loan/amortization (installmentPanification)
    const company = await CompanyModel.findByPk(companyIdNum);
    const forfeit = toNumber((company as any)?.forfeit);

    // Buscar créditos do cliente
    const loans = await LoanModel.findAll({
      where: { companyId: companyIdNum, accountNumber: customerData.accountNumber },
      order: [["id", "DESC"]],
    });

    const loanList = [];
    let totalDisbursed = 0;
    let totalPaid = 0;
    let totalDebt = 0;

    for (const loan of loans) {
      const loanData = loan.toJSON() as any;
      const status = Number(loanData.status);
      loanData.status = status;

      // Buscar prestações — a ordem cronológica é sempre pela data de vencimento
      const installments = await AmorizationLoanModel.findAll({
        where: { companyId: companyIdNum, loanId: loanData.id },
        order: [["dueDate", "ASC"], ["id", "ASC"]],
      });

      // MESMA FONTE DE VERDADE do Admin/Gestor (/api/loan/amortization): enriquece
      // cada prestação com paidAmount, remainingBalance, lateDays e latePaymentInterest
      // (mora = prestação × (forfeit/100) × dias em atraso).
      const installmentList = installmentPanification(installments, forfeit);
      const paidInstallments = installmentList.filter((a: any) => Number(a.status) === 1);
      const pendingInstallments = installmentList.filter((a: any) => Number(a.status) !== 1);

      // Calcular totais
      const loanTotal = installmentList.reduce((sum: number, a: any) => sum + (Number(a.installment) || 0), 0);
      const loanPaid = installmentList
        .filter((a: any) => Number(a.status) === 1)
        .reduce((sum: number, a: any) => sum + (Number(a.paidAmount) || Number(a.installment) || 0), 0);

      // Juros de mora pendentes — soma da mora calculada pela fonte de verdade
      const totalLateFee = installmentList.reduce(
        (sum: number, a: any) => sum + (Number(a.latePaymentInterest) || 0),
        0
      );

      const loanDebt = loanTotal - loanPaid;

      if (status === 1 || status === 3) {
        totalDisbursed += Number(loanData.amount) || 0;
      }
      totalPaid += loanPaid;
      totalDebt += Math.max(0, loanDebt);

      loanList.push({
        id: loanData.id,
        amount: loanData.amount,
        interestRate: loanData.interestRate,
        numberOfInstallments: loanData.numberOfInstallments,
        status: loanData.status,
        dateCreated: loanData.dateCreated,
        loanDescription: loanData.loanDescription,
        totalPaid: loanPaid,
        totalDebt: Math.max(0, loanDebt),
        totalLateFee,
        paidCount: paidInstallments.length,
        pendingCount: pendingInstallments.length,
        installments: installmentList.map((a: any) => ({
          id: a.id,
          installmentOrder: a.installmentOrder,
          installment: a.installment,
          dueDate: a.dueDate,
          status: Number(a.status),
          paidAmount: Number(a.paidAmount) || 0,
          amortization: Number(a.amortization) || 0,
          rateAmount: Number(a.rateAmount) || 0,
          remainingBalance: Number(a.remainingBalance) || 0,
          lateDays: Number(a.lateDays) || 0,
          latePaymentInterest: Number(a.latePaymentInterest) || 0,
          totalToPay: Math.round((Number(a.installment) + Number(a.latePaymentInterest)) * 100) / 100,
        })),
      });
    }

    // Mapa prestação (amortizationLoanId) → número de ordem, para o histórico
    const installmentOrderById: Record<number, any> = {};
    loanList.forEach((loan: any) => {
      (loan.installments || []).forEach((inst: any) => {
        installmentOrderById[Number(inst.id)] = inst.installmentOrder;
      });
    });

    // Histórico de pagamentos (todas as transações da conta)
    const transactions = await TranzactionModel.findAll({
      where: { companyId: companyIdNum, accountNumber: customerData.accountNumber },
      order: [["createdAt", "DESC"]],
    });
    const payments = transactions.map((t: any) => {
      const tx = t.toJSON();
      return {
        id: tx.id,
        amount: toNumber(tx.amount),
        // As transacções registadas no portal já se encontram concluídas
        status: "completed",
        reference: tx.tranzactionReference || null,
        paymentMethod: tx.paymentMethod || null,
        // Dados da prestação liquidada (para o histórico do portal)
        amortizationLoanId: tx.amortizationLoanId || null,
        installmentOrder: installmentOrderById[Number(tx.amortizationLoanId)] || null,
        paymentDate: tx.paymentDate || null,
        latePaymentInterest: toNumber(tx.latePaymentInterest),
        createdAt: tx.createdAt,
      };
    });

    const activeLoansList = loanList.filter((l) => Number(l.status) === 1);
    const pendingLoansList = loanList.filter((l) => Number(l.status) === 0);

    return res.status(200).json({
      success: true,
      customer: {
        id: customerData.id,
        name: customerData.customerName,
        phone: customerData.customerPhone,
        email: customerData.customerEmail || null,
        accountNumber: customerData.accountNumber,
        isSelfRegistered: customerData.isSelfRegistered || 0,
        registrationDate: customerData.createdAt || customerData.dateCreated || null,
        monthlySalary: customerData.customerMonthlySalary
          ? Number(customerData.customerMonthlySalary)
          : 0,
      },
      summary: {
        totalLoans: loans.length,
        // Nº de créditos activos (status 1)
        activeLoans: activeLoansList.length,
        // Valor do crédito activo (soma dos montantes dos créditos activos)
        activeLoanAmount: Number(
          activeLoansList
            .reduce((sum: number, l: any) => sum + toNumber(l.amount), 0)
            .toFixed(2)
        ),
        // Pedidos pendentes (status 0) — usados pelo portal para avisar o mutuário
        pendingLoans: pendingLoansList.length,
        pendingAmount: Number(
          pendingLoansList
            .reduce((sum: number, l: any) => sum + toNumber(l.amount), 0)
            .toFixed(2)
        ),
        totalDisbursed,
        totalPaid,
        totalDebt,
      },
      loans: loanList,
      payments,
    });
  } catch (error: any) {
    console.error("Erro no portal do mutuário:", error);
    return res.status(500).json({ success: false, message: error.message || "Erro interno." });
  }
};

// Detalhes de um préstamo específico
export const getCustomerLoanDetail = async (req: Request, res: Response) => {
  try {
    const { customerId, loanId } = req.params;
    const customerIdNum = parseInt(String(customerId), 10);
    const loanIdNum = parseInt(String(loanId), 10);

    const loan = await LoanModel.findByPk(loanIdNum) as any;
    if (!loan) {
      return res.status(404).json({ success: false, message: "Empréstimo não encontrado." });
    }

    const loanData = loan.toJSON();

    // Verificar se pertence ao cliente
    const customer = await CustomerModel.findOne({
      where: { id: customerIdNum, accountNumber: loanData.accountNumber },
    });

    if (!customer) {
      return res.status(403).json({ success: false, message: "Acesso negado." });
    }

    // Buscar prestações — ordem cronológica pela data de vencimento
    const installments = await AmorizationLoanModel.findAll({
      where: { companyId: loanData.companyId, loanId: loanIdNum },
      order: [["dueDate", "ASC"], ["id", "ASC"]],
    });

    // Buscar pagamentos
    const payments = await TranzactionModel.findAll({
      where: { companyId: loanData.companyId, loanId: loanIdNum },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      loan: loanData,
      installments: installments.map((a: any) => a.toJSON()),
      payments: payments.map((p: any) => p.toJSON()),
    });
  } catch (error: any) {
    console.error("Erro ao buscar detalhes:", error);
    return res.status(500).json({ success: false, message: error.message || "Erro interno." });
  }
};

// ============================================================
// Pagamento de prestação a partir do portal do mutuário.
// Métodos: M-Pesa (paymentMethod 7) e Transferência bancária (3).
// Regras:
//  - M-Pesa: telemóvel com exactamente 12 dígitos iniciados por 25884/25885;
//  - Valor entre 15% e 100% da prestação (ou do saldo em falta, se menor).
// Regista a transacção concluída e actualiza a prestação (total ou parcial),
// com a mesma semântica usada no registo interno de pagamentos.
// ============================================================

const MPESA_PHONE_REGEX = /^258(84|85)\d{7}$/;

const round2 = (value: number) => Math.round(value * 100) / 100;

export const registerPortalPayment = async (req: Request, res: Response) => {
  try {
    const { companyId, customerId } = req.params;
    const {
      installmentId,
      loanId,
      amount,
      method, // 'mpesa' | 'transfer'
      phone, // obrigatório p/ M-Pesa
      account, // conta bancária da empresa (transferência)
      reference, // referência opcional
    } = req.body;

    const companyIdNum = parseInt(String(companyId), 10);
    const customerIdNum = parseInt(String(customerId), 10);
    const loanIdNum = parseInt(String(loanId), 10);
    const installmentIdNum = parseInt(String(installmentId), 10);

    if (
      Number.isNaN(companyIdNum) ||
      Number.isNaN(customerIdNum) ||
      Number.isNaN(loanIdNum) ||
      Number.isNaN(installmentIdNum)
    ) {
      return res.status(400).json({ success: false, message: "Parâmetros inválidos." });
    }

    const paymentAmount = round2(toNumber(amount));
    const payMethod = String(method || "").toLowerCase();

    if (!(paymentAmount > 0)) {
      return res.status(400).json({ success: false, message: "Indique um valor de pagamento maior que 0." });
    }
    if (payMethod !== "mpesa" && payMethod !== "transfer") {
      return res.status(400).json({ success: false, message: "Método de pagamento inválido." });
    }

    // Cliente
    const customer = await CustomerModel.findOne({
      where: { id: customerIdNum, companyId: companyIdNum },
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Cliente não encontrado." });
    }
    const customerData = customer.toJSON() as any;

    // Crédito do cliente
    const loan = await LoanModel.findOne({
      where: {
        id: loanIdNum,
        companyId: companyIdNum,
        accountNumber: customerData.accountNumber,
      },
    });
    if (!loan) {
      return res.status(404).json({ success: false, message: "Crédito não encontrado." });
    }

    // Prestação
    const installment = await AmorizationLoanModel.findOne({
      where: { id: installmentIdNum, loanId: loanIdNum },
    });
    if (!installment) {
      return res.status(404).json({ success: false, message: "Prestação não encontrada." });
    }
    const installmentData = installment.toJSON() as any;
    if (Number(installmentData.status) === 1) {
      return res.status(400).json({ success: false, message: "Esta prestação já se encontra paga." });
    }

    const installmentValue = round2(toNumber(installmentData.installment));
    const alreadyPaid = round2(toNumber(installmentData.paidAmount));
    const remaining = round2(Math.max(0, installmentValue - alreadyPaid));

    if (remaining <= 0) {
      return res.status(400).json({ success: false, message: "Não existe saldo em falta nesta prestação." });
    }

    // Valor entre 15% e 100% da prestação (saldo em falta como limite)
    const minAllowed = Math.min(remaining, round2(installmentValue * 0.15));
    if (paymentAmount < minAllowed - 0.001 || paymentAmount > remaining + 0.001) {
      return res.status(400).json({
        success: false,
        message: `O valor a pagar deve estar entre ${minAllowed.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })} e ${remaining.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })} MZN.`,
      });
    }

    // Número M-Pesa (25884/25885 + 7 dígitos)
    let payerPhone = String(customerData.customerPhone || "").replace(/\D/g, "");
    let bankAccount = "";
    if (payMethod === "mpesa") {
      const normalizedPhone = String(phone || "").replace(/\D/g, "");
      if (!MPESA_PHONE_REGEX.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "Número M-Pesa inválido. Deve ter exactamente 12 dígitos e começar por 25884 ou 25885 (ex.: 258840000000).",
        });
      }
      payerPhone = normalizedPhone;
    } else {
      bankAccount = String(account || "").trim();
      if (!bankAccount) {
        return res.status(400).json({ success: false, message: "Seleccione a conta bancária da empresa para a transferência." });
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const suffix = Date.now().toString().slice(-8);

    // M-Pesa: iniciar o pagamento no servidor M-Pesa (Open API) ANTES de registar
    // na base de dados — mesmo fluxo do sistema legado (PUT /api/mpesa/receive →
    // só depois POST /api/tranzaction com o output_TransactionID como referência).
    let mpesaReceipt: string | null = null;
    if (payMethod === "mpesa") {
      const mpesaAmount = String(paymentAmount);
      const mpesaTransactionRef = `PY${loanIdNum}${installmentIdNum}${suffix}`;
      const mpesaThirdPartyRef = String(customerData.accountNumber);
      let result: MpesaResponse;
      try {
        result = await mpesa.initiate_c2b(
          mpesaAmount,
          payerPhone,
          mpesaTransactionRef,
          mpesaThirdPartyRef
        );
      } catch (err: any) {
        const apiErr = err && err.output_ResponseDesc ? err : null;
        return res.status(502).json({
          success: false,
          message: apiErr
            ? `Pagamento não concluído no servidor M-Pesa: ${apiErr.output_ResponseDesc}`
            : "Não foi possível comunicar com o servidor M-Pesa. Tente novamente mais tarde.",
          details: apiErr
            ? {
                output_ResponseCode: apiErr.output_ResponseCode,
                output_ResponseDesc: apiErr.output_ResponseDesc,
              }
            : undefined,
        });
      }

      const respCode = String((result as any)?.output_ResponseCode || "");
      const respDesc = String((result as any)?.output_ResponseDesc || "");
      const processed =
        respCode === "INS-000000" || respDesc === "Request processed successfully";
      if (!processed) {
        return res.status(400).json({
          success: false,
          message:
            respDesc === "Duplicate Transaction"
              ? "Transacção duplicada no M-Pesa. Tente novamente com outra referência."
              : `Pagamento não concluído no servidor M-Pesa: ${respDesc || "resposta desconhecida"}`,
          details: { output_ResponseCode: respCode, output_ResponseDesc: respDesc },
        });
      }
      mpesaReceipt = String((result as any)?.output_TransactionID || "").toUpperCase();
    }

    const txReference =
      payMethod === "mpesa"
        ? mpesaReceipt || `MPESA-${loanIdNum}-${installmentIdNum}-${suffix}`
        : `TRF-${loanIdNum}-${installmentIdNum}-${suffix}`;
    const paymentMethodNum = payMethod === "mpesa" ? 7 : 3;

    const description =
      payMethod === "mpesa"
        ? `Pagamento via M-Pesa (${payerPhone}) — Prestação ${installmentData.installmentOrder || installmentIdNum} do crédito ${loanIdNum}${mpesaReceipt ? ` (referência M-Pesa: ${mpesaReceipt})` : ""}`
        : `Transferência bancária para a conta ${bankAccount} — Prestação ${installmentData.installmentOrder || installmentIdNum} do crédito ${loanIdNum}${reference ? ` (referência: ${reference})` : ""}`;

    const newTotalPaid = round2(alreadyPaid + paymentAmount);
    const isFullPayment = newTotalPaid >= installmentValue - 0.01;
    const newStatus = isFullPayment ? 1 : -1;
    const finalPaidAmount = Math.min(newTotalPaid, installmentValue);
    const debtAmount = isFullPayment ? 0 : round2(Math.max(0, installmentValue - finalPaidAmount));

    const tranzaction = await TranzactionModel.create({
      companyId: companyIdNum,
      amortizationLoanId: installmentIdNum,
      loanId: loanIdNum,
      accountNumber: customerData.accountNumber,
      amount: paymentAmount,
      latePaymentInterest: 0,
      interestRateAmount: 0,
      phoneNumber: payerPhone,
      paymentDate: todayStr,
      tranzactionReference: txReference,
      paymentMethod: paymentMethodNum,
      description,
      receiptUrl: null,
      staffName: "Portal do Mutuário",
      notes: reference ? String(reference) : null,
      discountApplied: false,
      discountAmount: 0,
    });

    // Actualizar a prestação (status: 1=pago, -1=parcial)
    await AmorizationLoanModel.update(
      {
        status: newStatus,
        paidAmount: finalPaidAmount,
        remainingBalance: isFullPayment ? 0 : debtAmount,
      },
      { where: { id: installmentIdNum } }
    );

    // Pagamento parcial — registar/actualizar dívida da prestação
    if (!isFullPayment) {
      try {
        const existingDebt = await DebtModel.findOne({
          where: { amortisationId: installmentIdNum },
        });
        if (existingDebt) {
          await DebtModel.update(
            { debtAmount },
            { where: { id: (existingDebt as any).id } }
          );
        } else {
          await DebtModel.create({
            companyId: companyIdNum,
            accountNumber: String(customerData.accountNumber),
            loanId: loanIdNum,
            amortisationId: installmentIdNum,
            debtAmount,
            updatedBy: "Portal do Mutuário",
            dateInserted: todayStr,
          });
        }
      } catch (debtErr) {
        console.error("Erro ao registar dívida parcial (portal):", debtErr);
      }
    } else {
      try {
        await DebtModel.destroy({ where: { amortisationId: installmentIdNum } });
      } catch { /* sem dívida */ }
    }

    // Notificar o cliente
    try {
      await NotificationModel.create({
        companyId: companyIdNum,
        recipientType: "customer",
        recipientId: customerData.id,
        title: isFullPayment ? "Prestação paga" : "Pagamento parcial registado",
        message: `O seu pagamento de ${paymentAmount.toLocaleString("pt-MZ")} MZN (${payMethod === "mpesa" ? "M-Pesa" : "transferência bancária"}) foi registado.${isFullPayment ? "" : ` Saldo em falta: ${debtAmount.toLocaleString("pt-MZ")} MZN.`}`,
        type: "payment_received",
        referenceId: (tranzaction as any).id,
        isRead: false,
      });
    } catch (err) {
      console.error("Erro ao notificar pagamento do portal:", err);
    }

    // Se o crédito ficou totalmente liquidado, marcar como Liquidado (3)
    try {
      await checkAndLiquidateLoan(loanIdNum, companyIdNum, customerData.accountNumber);
    } catch (err) {
      console.error("Erro ao verificar liquidação do crédito:", err);
    }

    return res.status(201).json({
      success: true,
      message: isFullPayment
        ? `Pagamento de ${paymentAmount.toLocaleString("pt-MZ")} MZN registado. Prestação liquidada.`
        : `Pagamento parcial de ${paymentAmount.toLocaleString("pt-MZ")} MZN registado. Saldo em falta: ${debtAmount.toLocaleString("pt-MZ")} MZN.`,
      reference: txReference,
      isPartial: !isFullPayment,
    });
  } catch (error: any) {
    console.error("Erro ao registar pagamento do portal:", error);
    return res.status(500).json({ success: false, message: error.message || "Erro interno." });
  }
};

// Solicitar um novo empréstimo a partir do portal do mutuário.
// O pedido é registado como crédito pendente (status 0) e notifica os
// administradores/gestores da empresa para análise e aprovação.
export const requestCustomerLoan = async (req: Request, res: Response) => {
  try {
    const { companyId, customerId } = req.params;
    const {
      amount,
      numberOfInstallments,
      loanDescription,
      capacityExcessObservation,
    } = req.body;

    const companyIdNum = parseInt(String(companyId), 10);
    const customerIdNum = parseInt(String(customerId), 10);

    if (Number.isNaN(companyIdNum) || Number.isNaN(customerIdNum)) {
      return res.status(400).json({ success: false, message: "IDs inválidos." });
    }

    const loanAmount = toNumber(amount);
    const installments = parseInt(String(numberOfInstallments), 10);

    if (!(loanAmount > 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Indique o montante pretendido (maior que 0)." });
    }
    if (Number.isNaN(installments) || installments < 1 || installments > 18) {
      return res.status(400).json({
        success: false,
        message: "Número de prestações inválido (entre 1 e 18 meses).",
      });
    }

    const customer = await CustomerModel.findOne({
      where: { id: customerIdNum, companyId: companyIdNum },
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Cliente não encontrado." });
    }
    const customerData = customer.toJSON() as any;

    // O mutuário só pode solicitar novo crédito quando toda a dívida estiver liquidada
    const outstandingLoans = await LoanModel.findAll({
      where: {
        companyId: companyIdNum,
        accountNumber: customerData.accountNumber,
        status: { [Op.in]: [1, 3] },
      },
    });
    let outstandingDebt = 0;
    for (const outstandingLoan of outstandingLoans) {
      const loanIdNum = toNumber((outstandingLoan as any).id);
      if (!loanIdNum) continue;
      const installmentRows = await AmorizationLoanModel.findAll({
        where: { loanId: loanIdNum },
      });
      installmentRows.forEach((row: any) => {
        const data = row.toJSON();
        if (Number(data.status) === 1) return;
        const remaining =
          (toNumber(data.installment) || 0) - (toNumber(data.paidAmount) || 0);
        if (remaining > 0) outstandingDebt += remaining;
      });
    }
    if (outstandingDebt > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível solicitar novo crédito com dívida por liquidar (${outstandingDebt.toLocaleString("pt-MZ")} MZN). Solicite apenas quando toda a dívida estiver liquidada.`,
      });
    }

    // Evitar pedidos duplicados enquanto existir um em análise
    const existingPending = await LoanModel.findOne({
      where: {
        companyId: companyIdNum,
        accountNumber: customerData.accountNumber,
        status: 0,
      },
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "Já existe um pedido de crédito em análise. Aguarde a resposta da instituição.",
      });
    }

    // Atribuir gestor: mantém o do último crédito ou usa o primeiro gestor da empresa
    const lastLoan = await LoanModel.findOne({
      where: { companyId: companyIdNum, accountNumber: customerData.accountNumber },
      order: [["id", "DESC"]],
    });
    let creditManager = lastLoan ? toNumber((lastLoan as any).creditManager) : 0;
    if (!creditManager || creditManager < 1) {
      const firstManager = await UserModel.findOne({
        where: {
          companyId: companyIdNum,
          userRole: { [Op.in]: [1, 3] },
        },
        order: [["id", "ASC"]],
      });
      creditManager = firstManager ? toNumber((firstManager as any).id) : 0;
    }

    const observation = String(capacityExcessObservation || "").trim();

    const loan = await LoanModel.create({
      companyId: companyIdNum,
      accountNumber: customerData.accountNumber,
      amount: loanAmount,
      numberOfInstallments: installments,
      // A taxa de juro é definida pelo Admin/Gestor na aprovação (0 até lá)
      interestRate: 0,
      creditManager,
      loanDescription:
        String(loanDescription || "").trim() || "Pedido de novo crédito efectuado no portal do mutuário",
      capacityExcessObservation: observation || null,
      dateCreated: new Date().toISOString().slice(0, 10),
      status: 0,
    });

    // Notificar administradores/gestores da empresa
    try {
      const staffWhere: any[] = [{ companyId: companyIdNum, userRole: { [Op.in]: [0, 1] } }];
      if (creditManager > 0) {
        staffWhere.push({ companyId: companyIdNum, id: creditManager });
      }
      const staff = await UserModel.findAll({
        where: { [Op.or]: staffWhere },
      });
      const recipients: any[] = [];
      const seen = new Set<number>();
      for (const user of staff) {
        const userId = toNumber((user as any).id);
        if (!userId || seen.has(userId)) continue;
        seen.add(userId);
        recipients.push({
          companyId: companyIdNum,
          recipientType: "admin",
          recipientId: userId,
          title: "Nova solicitação de crédito",
          message: `Conta ${customerData.accountNumber} solicitou um crédito de ${loanAmount.toLocaleString("pt-MZ")} MZN.`,
          type: "loan_request",
          referenceId: (loan as any).id,
          isRead: false,
        });
      }
      if (recipients.length > 0) {
        await NotificationModel.bulkCreate(recipients);
      }
    } catch (err) {
      console.error("Erro ao notificar nova solicitação de crédito:", err);
    }

    return res.status(201).json({
      success: true,
      message:
        "Pedido enviado com sucesso. A instituição definirá a taxa de juro e responderá em breve.",
      loanId: (loan as any).id,
    });
  } catch (error: any) {
    console.error("Erro ao solicitar novo crédito:", error);
    return res.status(500).json({ success: false, message: error.message || "Erro interno." });
  }
};

// Gerar código de 6 dígitos
const generateSixDigitCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Enviar credenciais ao mutuário
export const sendCustomerCredentials = async (req: Request, res: Response) => {
  try {
    const { customerId, channel, newPassword } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, message: "customerId é obrigatório." });
    }

    const customer = await CustomerModel.findByPk(customerId) as any;
    if (!customer) {
      return res.status(404).json({ success: false, message: "Cliente não encontrado." });
    }

    const customerData = customer.toJSON();
    const phone = customerData.customerPhone;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Cliente não possui telefone." });
    }

    // Verificar se já foi enviado (via raw query)
    let alreadySent = false;
    let sentAt = '';
    try {
      const [rows] = await db.query(`SELECT credentialsSent, credentialsSentAt FROM customers WHERE id = ${customerId}`) as any[];
      if (rows && rows.length > 0) {
        alreadySent = rows[0].credentialsSent === 1;
        sentAt = rows[0].credentialsSentAt || '';
      }
    } catch (e) { /* coluna pode não existir ainda */ }

    // Gerar nova senha se não foi fornecida
    const password = newPassword || generateSixDigitCode();

    // Se já foi enviado e NÃO vem uma senha nova explícita, não há nada para
    // gravar nem reenviar — apenas notificar. (Se o modal gerou um código novo,
    // `newPassword` está presente e o reenvio prossegue normalmente abaixo.)
    if (alreadySent && !newPassword) {
      return res.status(200).json({
        success: true,
        alreadySent: true,
        message: `As credenciais já foram enviadas anteriormente em ${sentAt || 'data desconhecida'}.`,
        password: '',
      });
    }

    // Actualizar senha com hash bcrypt — mas NUNCA voltar a encriptar um valor
    // que já seja hash (double-hash tornaria o login impossível).
    await customer.update({ password: hashPasswordIfNeeded(password) });

    // Tentar enviar via canal escolhido (SMS/WhatsApp)
    let channelMessage = '';
    let enqueued = false;
    try {
      if (channel === "whatsapp") {
        const { sendPasswordResetWhatsApp } = await import("../services/WhatsAppService");
        await sendPasswordResetWhatsApp({
          companyId: customerData.companyId,
          accountNumber: customerData.accountNumber,
          newPassword: password,
        });
        channelMessage = 'via WhatsApp';
        enqueued = true;
      } else {
        const { enqueuePasswordResetSms } = await import("../services/SmsGatewayService");
        const result = await enqueuePasswordResetSms({
          companyId: customerData.companyId,
          accountNumber: customerData.accountNumber,
          newPassword: password,
        });
        if ((result as any)?.created) {
          channelMessage = 'via SMS';
          enqueued = true;
        } else if ((result as any)?.reason === 'sms_disabled') {
          channelMessage = '(SMS desactivado nas configurações da empresa - contacte o Administrador)';
        } else {
          channelMessage = '(não enviado - telefone inválido ou em falta)';
        }
      }
    } catch (e) {
      // SMS/WhatsApp pode não estar configurado
      channelMessage = '(envio pendente - configure SMS/WhatsApp)';
    }

    // Só marcar credenciais como enviadas quando o SMS/WhatsApp foi
    // realmente enfileirado — senão o mutuário fica sem acesso e a UI
    // diz que já foram enviadas.
    if (enqueued) {
      try {
        await db.query(`UPDATE customers SET credentialsSent = 1, credentialsSentAt = '${new Date().toISOString()}' WHERE id = ${customerId}`);
      } catch (e) { /* coluna pode não existir ainda */ }
    }

    return res.status(200).json({
      success: true,
      alreadySent: false,
      resent: alreadySent,
      enqueued,
      password: password,
      message: alreadySent
        ? `Credenciais reenviadas ${channelMessage}.`
        : `Credenciais actualizadas ${channelMessage}.`,
    });
  } catch (error: any) {
    console.error("Envio de credenciais:", error);
    return res.status(500).json({ success: false, message: error.message || "Erro interno." });
  }
};
