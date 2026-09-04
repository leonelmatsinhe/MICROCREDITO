import moment from "moment";
import { Request, Response } from "express";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { Op } from "sequelize";
import { simulator } from "../utils/loanAmortization";
import { LoanModel } from "../database/models/LoanModel";
import { DebtModel } from "../database/models/DebtModel";
import { CustomerDocumentsModel } from "../database/models/CustomerDocumentsModel";
import { enqueueDisbursementSms } from "../services/SmsGatewayService";

const getUpcomingAmortizations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // dueDate é string (YYYY-MM-DD); comparar por string evita cast em memória.
    const now = moment().format("YYYY-MM-DD");

    const loans = await AmorizationLoanModel.findAll({
      where: {
        dueDate: {
          [Op.gte]: now,
        },
        companyId: id,
        status: { [Op.in]: [0, -1] },
      },
      order: [["dueDate", "ASC"]],
    });

    const partialIds = loans
      .filter((l: any) => l.status === -1)
      .map((l: any) => l.id);

    let debtsMap: Record<number, any> = {};
    if (partialIds.length > 0) {
      const debts = await DebtModel.findAll({
        where: { amortisationId: { [Op.in]: partialIds } },
      });
      debts.forEach((d: any) => {
        debtsMap[d.amortisationId] = {
          debtAmount: d.debtAmount,
          debtDate: d.updatedAt || d.dateInserted,
        };
      });
    }

    const result = loans.map((loan: any) => {
      const plain = loan.toJSON ? loan.toJSON() : { ...loan };
      if (plain.status === -1 && debtsMap[plain.id]) {
        plain.debtAmount = debtsMap[plain.id].debtAmount;
        plain.debtDate = debtsMap[plain.id].debtDate;
      }
      return plain;
    });

    return res.status(200).send({ success: true, result });
  } catch (error: any) {
    return res.status(500).send({
      success: false,
      message: error.message || "Erro ao buscar prestações próximas.",
    });
  }
};

const getPastAmortizations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const now = moment().format("YYYY-MM-DD");

    const pastAmortizations = await AmorizationLoanModel.findAll({
      where: {
        dueDate: {
          [Op.lt]: now,
        },
        companyId: id,
      },
      order: [["dueDate", "DESC"]],
    });

    return res.status(200).send({ success: true, result: pastAmortizations || [] });
  } catch (error: any) {
    return res.status(500).send({
      success: false,
      message: error.message || "Erro ao buscar prestações vencidas.",
    });
  }
};

const createAmortizationLoan = async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      loanId,
      accountNumber,
      interestRate,
      numberOfInstallments,
      amount,
      dueDate,
      status
    } = req.body;

    // Validações de entrada
    if (!companyId || !loanId || !accountNumber || !interestRate || !numberOfInstallments || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios faltando. Verifique: companyId, loanId, accountNumber, interestRate, numberOfInstallments, amount, dueDate",
      });
    }

    const loanAmount = parseFloat(amount);
    const rate = parseFloat(interestRate);
    const installments = parseInt(numberOfInstallments);

    if (isNaN(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "O valor do empréstimo deve ser maior que zero.",
      });
    }

    if (isNaN(rate) || rate < 0) {
      return res.status(400).json({
        success: false,
        message: "A taxa de juros deve ser um número positivo ou zero.",
      });
    }

    if (isNaN(installments) || installments <= 0) {
      return res.status(400).json({
        success: false,
        message: "O número de prestações deve ser maior que zero.",
      });
    }

    const MIN_DOCUMENTS_FOR_APPROVAL = 3;
    const customerDocuments = await CustomerDocumentsModel.findAll({
      where: { accountNumber }
    });

    if (!customerDocuments || customerDocuments.length < MIN_DOCUMENTS_FOR_APPROVAL) {
      return res.status(400).json({
        success: false,
        message: `O mutuário deve ter pelo menos ${MIN_DOCUMENTS_FOR_APPROVAL} documentos submetidos para aprovação do crédito. Actualmente possui ${customerDocuments ? customerDocuments.length : 0} documento(s).`,
      });
    }

    // Verifica se já existe um plano de amortização para este empréstimo
    const existingAmortization = await AmorizationLoanModel.findOne({
      where: { loanId }
    });

    if (existingAmortization) {
      return res.status(409).json({
        success: false,
        message: "Já existe um plano de amortização para este empréstimo.",
      });
    }

    // Gera o plano de amortização usando o sistema francês
    const customerAmortizationPlan = simulator({
      companyId,
      loanId,
      accountNumber,
      interestRate,
      numberOfInstallments,
      amount,
      dueDate,
      status
    });

    // Insere o plano de amortização no banco de dados
    const bulckInsert = await AmorizationLoanModel.bulkCreate(
      customerAmortizationPlan
    );

    // Atualiza o status do empréstimo e guarda a data real de desembolso:
    // o dueDate enviado é a base do plano (a 1ª prestação vence 1 mês depois).
    await LoanModel.update(
      { status: 1, disbursementDate: String(dueDate || "").slice(0, 10) || null },
      {
        where: {
          id: loanId
        }
      }
    );

    try {
      await enqueueDisbursementSms({
        companyId: Number(companyId),
        loanId: Number(loanId),
        accountNumber,
        amount: Number(amount),
        installments: Number(numberOfInstallments),
        firstDueDate: customerAmortizationPlan[0]?.dueDate
          ? String(customerAmortizationPlan[0].dueDate)
          : null,
      });
    } catch (smsError) {
      console.error("Erro ao enfileirar SMS de desembolso:", smsError);
    }

    return bulckInsert != null && bulckInsert.length > 0
      ? res.status(200).json({
        success: true,
        message: "Plano de amortização criado com sucesso",
        installmentsCount: bulckInsert.length
      })
      : res.status(500).json({
        success: false,
        message: "Erro ao criar o plano de amortização.",
      });
  } catch (error: any) {
    console.error("Erro ao criar plano de amortização:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro interno ao processar o plano de amortização.",
    });
  }
};

export { getUpcomingAmortizations, getPastAmortizations, createAmortizationLoan };
