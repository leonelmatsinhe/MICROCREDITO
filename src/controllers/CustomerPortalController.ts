import { Request, Response } from "express";
import { Op } from "sequelize";
import { db } from "../database/db";
import { CustomerModel } from "../database/models/CustomerModel";
import { LoanModel } from "../database/models/LoanModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { TranzactionModel } from "../database/models/TranzactionModel";
import { DebtModel } from "../database/models/DebtModel";

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

      // Buscar prestações
      const installments = await AmorizationLoanModel.findAll({
        where: { companyId: companyIdNum, loanId: loanData.id },
        order: [["installmentOrder", "ASC"]],
      });

      const installmentList = installments.map((a: any) => a.toJSON());
      const paidInstallments = installmentList.filter((a: any) => Number(a.status) === 1);
      const pendingInstallments = installmentList.filter((a: any) => Number(a.status) !== 1);

      // Calcular totais
      const loanTotal = installmentList.reduce((sum: number, a: any) => sum + (Number(a.installment) || 0), 0);
      const loanPaid = installmentList
        .filter((a: any) => Number(a.status) === 1)
        .reduce((sum: number, a: any) => sum + (Number(a.paidAmount) || Number(a.installment) || 0), 0);

      // Calcular juros de mora pendentes
      const now = new Date();
      let totalLateFee = 0;
      pendingInstallments.forEach((a: any) => {
        const dueDate = new Date(a.dueDate);
        if (dueDate < now) {
          const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          const lateFee = Math.round((Number(a.installment) || 0) * 0.005 * daysOverdue * 100) / 100;
          totalLateFee += lateFee;
        }
      });

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
        })),
      });
    }

    return res.status(200).json({
      success: true,
      customer: {
        id: customerData.id,
        name: customerData.customerName,
        phone: customerData.customerPhone,
        accountNumber: customerData.accountNumber,
      },
      summary: {
        totalLoans: loans.length,
        activeLoans: loanList.filter((l) => l.status === 1).length,
        totalDisbursed,
        totalPaid,
        totalDebt,
      },
      loans: loanList,
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

    // Buscar prestações
    const installments = await AmorizationLoanModel.findAll({
      where: { companyId: loanData.companyId, loanId: loanIdNum },
      order: [["installmentOrder", "ASC"]],
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

// Registar pagamento via M-Pesa
export const initiateMpesaPayment = async (req: Request, res: Response) => {
  try {
    const { customerId, loanId, installmentId, amount, phone } = req.body;

    if (!customerId || !loanId || !amount || !phone) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios: customerId, loanId, amount, phone.",
      });
    }

    // Verificar cliente
    const customer = await CustomerModel.findByPk(customerId) as any;
    if (!customer) {
      return res.status(404).json({ success: false, message: "Cliente não encontrado." });
    }

    const customerData = customer.toJSON();

    // Verificar préstamo
    const loan = await LoanModel.findByPk(loanId) as any;
    if (!loan) {
      return res.status(404).json({ success: false, message: "Empréstimo não encontrado." });
    }

    // Gerar referência única
    const reference = `LOAN${loanId}-INST${installmentId || 0}-${Date.now()}`;

    // Registrar transação pendente
    const transaction = await TranzactionModel.create({
      companyId: customerData.companyId,
      loanId,
      accountNumber: customerData.accountNumber,
      amount: Number(amount),
      interestRateAmount: 0,
      latePaymentInterest: 0,
      discountAmount: 0,
      paymentMethod: "M-Pesa",
      reference,
      status: "pending",
    });

    const transactionData = (transaction as any).toJSON();

    // TODO: Integrar com M-Pesa Open API real
    // Por agora, simulamos o envio
    console.log(`[M-Pesa] Pagamento iniciado: ${amount} MZN de ${phone} ref: ${reference}`);

    return res.status(200).json({
      success: true,
      message: "Pagamento M-Pesa iniciado. Aguarde confirmação.",
      transactionId: transactionData.id,
      reference,
    });
  } catch (error: any) {
    console.error("Erro ao iniciar pagamento M-Pesa:", error);
    return res.status(500).json({ success: false, message: error.message || "Erro interno." });
  }
};

// Confirmar pagamento M-Pesa (webhook/callback)
export const confirmMpesaPayment = async (req: Request, res: Response) => {
  try {
    const { transactionId, status, mpesaReceipt } = req.body;

    if (!transactionId || !status) {
      return res.status(400).json({ success: false, message: "transactionId e status são obrigatórios." });
    }

    const transaction = await TranzactionModel.findByPk(transactionId) as any;
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transação não encontrada." });
    }

    // Actualizar estado
    await transaction.update({
      status: status === "completed" ? "completed" : "failed",
      mpesaReceipt: mpesaReceipt || null,
    });

    // Se confirmado, actualizar prestação
    if (status === "completed") {
      const txData = transaction.toJSON();
      const installment = await AmorizationLoanModel.findOne({
        where: {
          companyId: txData.companyId,
          loanId: txData.loanId,
          status: { [Op.in]: [0, -1] },
        },
        order: [["installmentOrder", "ASC"]],
      });

      if (installment) {
        const instData = installment.toJSON() as any;
        const installmentAmount = Number(instData.installment) || 0;
        const paidAmount = Number(txData.amount) || 0;

        if (paidAmount >= installmentAmount) {
          await installment.update({ status: 1, paidAmount });
        } else {
          await installment.update({ status: -1, paidAmount });
        }
      }
    }

    return res.status(200).json({ success: true, message: "Pagamento actualizado." });
  } catch (error: any) {
    console.error("Confirmação M-Pesa:", error);
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

    // Se já foi enviado, notificar
    if (alreadySent) {
      return res.status(200).json({
        success: true,
        alreadySent: true,
        message: `As credenciais já foram enviadas anteriormente em ${sentAt || 'data desconhecida'}.`,
        password: customerData.password,
      });
    }

    // Gerar nova senha se não foi fornecida
    const password = newPassword || generateSixDigitCode();

    // Actualizar senha
    await customer.update({ password: password });

    // Tentar actualizar estado de envio (pode falhar se colunas não existirem)
    try {
      await db.query(`UPDATE customers SET credentialsSent = 1, credentialsSentAt = '${new Date().toISOString()}' WHERE id = ${customerId}`);
    } catch (e) { /* coluna pode não existir ainda */ }

    // Tentar enviar via canal escolhido (SMS/WhatsApp)
    let channelMessage = '';
    try {
      if (channel === "whatsapp") {
        const { sendPasswordResetWhatsApp } = await import("../services/WhatsAppService");
        await sendPasswordResetWhatsApp({
          companyId: customerData.companyId,
          accountNumber: customerData.accountNumber,
          newPassword: password,
        });
        channelMessage = 'via WhatsApp';
      } else {
        const { enqueuePasswordResetSms } = await import("../services/SmsGatewayService");
        await enqueuePasswordResetSms({
          companyId: customerData.companyId,
          accountNumber: customerData.accountNumber,
          newPassword: password,
        });
        channelMessage = 'via SMS';
      }
    } catch (e) {
      // SMS/WhatsApp pode não estar configurado
      channelMessage = '(envio pendente - configure SMS/WhatsApp)';
    }

    return res.status(200).json({
      success: true,
      alreadySent: false,
      password: password,
      message: `Credenciais actualizadas ${channelMessage}.`,
    });
  } catch (error: any) {
    console.error("Envio de credenciais:", error);
    return res.status(500).json({ success: false, message: error.message || "Erro interno." });
  }
};
