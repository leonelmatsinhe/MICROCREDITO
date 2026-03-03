import { Request, Response } from "express";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { NotificationModel } from "../database/models/NotificationModel";
import { UserModel } from "../database/models/UserModel";
import { Op } from "sequelize";
import { installmentPanification, totalsOfInstallments } from "../utils/calculateLateAmount";

const findLoanByCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const loans = await LoanModel.findAll({
    where: {
      accountNumber: id,
    },
    order: [["id", "DESC"]],
  });

  return loans != null
    ? res.status(200).send({ success: true, result: loans })
    : res.status(204).send({
      success: false,
      result: "No loan found with the account number you provided",
    });
};

const findAllLoans = async (req: Request, res: Response) => {
  const { id, companyId } = req.params;
  const whereClause: any = { companyId };

  // Compatibilidade com o contrato existente:
  // `id` pode vir como data (YYYY-MM-DD). Se vier "all", não filtra por data.
  if (id && id !== "all") {
    whereClause.dateCreated = id;
  }

  const credits = await LoanModel.findAll({
    where: whereClause,
    order: [["id", "DESC"]],
  });

  return res.status(200).send({ success: true, result: credits || [] });
};

const getLoanAmortization = async (req: Request, res: Response) => {
  const { id, forfeit } = req.params;
  const loans = await AmorizationLoanModel.findAll({
    where: {
      loanId: id,
    },
    order: [
      ['dueDate', 'ASC'], // Ordena por data de vencimento para garantir ordem cronológica
      ['id', 'ASC'] // Ordena por ID como critério secundário
    ],
  });

  const installments = installmentPanification(loans, parseFloat(forfeit));
  const totals = totalsOfInstallments(installments)

  return loans != null && loans.length > 0
    ? res.status(200).send({ success: true, result: installments, totals })
    : res.status(204).send({
      success: false,
      result: "No loan found with the account number you provided",
    });
};

const createLoan = async (req: Request, res: Response) => {
  let {
    accountNumber,
    companyId,
    amount,
    numberOfInstallments,
    interestRate,
    creditManager,
    loanDescription,
    dateCreated,
    status,
  } = req.body;

  const loan = await LoanModel.create({
    accountNumber,
    companyId,
    amount,
    numberOfInstallments,
    interestRate,
    creditManager,
    loanDescription,
    dateCreated,
    status,
  });

  // Criar notificação para admin/gestor sobre nova solicitação
  if (loan) {
    try {
      // Notificar todos os admins (userRole = 0) da empresa
      const admins = await UserModel.findAll({
        where: { companyId, userRole: 0 },
      });
      const bulkNotifs: any[] = [];
      for (const admin of admins) {
        bulkNotifs.push({
          companyId,
          recipientType: "admin",
          recipientId: (admin as any).id,
          title: "Nova solicitação de crédito",
          message: `Conta ${accountNumber} solicitou um crédito de ${Number(amount).toLocaleString("pt-MZ")} MZN.`,
          type: "loan_request",
          referenceId: (loan as any).id,
          isRead: false,
        });
      }
      if (bulkNotifs.length > 0) {
        await NotificationModel.bulkCreate(bulkNotifs);
      }
    } catch (err) {
      console.error("Erro ao criar notificações de novo crédito:", err);
    }
  }

  return loan != null
    ? res
      .status(200)
      .json({ success: true, message: "Loan created successfully" })
    : res.status(204).json({
      success: false,
      message: "There was an error adding the amortization plan.",
    });
};

const updateLoan = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Buscar o empréstimo antes de atualizar para verificar mudança de status
  const previousLoan: any = await LoanModel.findByPk(id);

  const loan = await LoanModel.update(req.body, {
    where: {
      id,
    },
  });

  // Criar notificação para o cliente quando o status muda
  if (loan && previousLoan && req.body.status !== undefined) {
    const newStatus = Number(req.body.status);
    const oldStatus = Number(previousLoan.status);

    if (newStatus !== oldStatus) {
      try {
        // Buscar cliente associado ao empréstimo
        const customer: any = await CustomerModel.findOne({
          where: { accountNumber: previousLoan.accountNumber },
        });

        if (customer) {
          let title = "";
          let message = "";
          let type = "";

          if (newStatus === 1) {
            // Aprovado
            title = "Crédito aprovado";
            message = `O seu crédito de ${Number(previousLoan.amount).toLocaleString("pt-MZ")} MZN foi aprovado.`;
            type = "loan_approved";
          } else if (newStatus === 2) {
            // Rejeitado
            title = "Crédito rejeitado";
            message = `O seu pedido de crédito de ${Number(previousLoan.amount).toLocaleString("pt-MZ")} MZN não foi aprovado.`;
            type = "loan_rejected";
          } else if (newStatus === 3) {
            // Liquidado
            title = "Crédito liquidado";
            message = `O seu crédito de ${Number(previousLoan.amount).toLocaleString("pt-MZ")} MZN foi totalmente liquidado.`;
            type = "loan_approved";
          }

          if (title) {
            await NotificationModel.create({
              companyId: previousLoan.companyId,
              recipientType: "customer",
              recipientId: customer.id,
              title,
              message,
              type,
              referenceId: Number(id),
              isRead: false,
            });
          }
        }
      } catch (err) {
        console.error("Erro ao criar notificação de atualização de crédito:", err);
      }
    }
  }

  return loan != null
    ? res
      .status(200)
      .json({ success: true, message: "Loan updated successfully" })
    : res.status(204).json({
      success: true,
      message: "There was an error updating the loan.",
    });
};

const destroyLoan = async (req: Request, res: Response) => {
  const { id } = req.params;

  const deleteLoan = await LoanModel.destroy({ where: { id: id } });

  return deleteLoan != null
    ? res.status(201).send(
      JSON.stringify({
        success: true,
        message: "Loan deleted successfully.",
      })
    )
    : res.status(204).send(
      JSON.stringify({
        success: false,
        message: "There was an error deleting the loan.",
      })
    );
};

export {
  findAllLoans,
  findLoanByCustomer,
  getLoanAmortization,
  createLoan,
  updateLoan,
  destroyLoan,
};
