import { Request, Response } from "express";
import { AccountModel } from "../database/models/AccountModel";

const findAllaccounts = async (req: Request, res: Response) => {
  const { id } = req.params;
  const accounts = await AccountModel.findAll({
    where: {
      companyId: id,
    },
    order: [["id", "DESC"]],
  });

  // Retorna sempre 200 com array (vazio ou preenchido) para evitar problemas com status 204
  return res.status(200).json({ success: true, result: accounts || [] });
};

const findOneAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const account = await AccountModel.findOne({
    where: {
      id,
    },
  });
  return account != null
    ? res.status(200).send({ success: true, result: account })
    : res.status(204).send({
      success: false,
      result: "No account found with the ID provided",
    });
};

const createAccount = async (req: Request, res: Response) => {
  let { accountHolder, accountDescription, accountNumber, createdBy, companyId } = req.body;

  const newAccount = await AccountModel.create({
    companyId,
    accountHolder,
    accountDescription,
    accountNumber,
    createdBy,
  });

  newAccount != null
    ? res.send(
      JSON.stringify({
        success: true,
        message: "Account created successfully.",
      })
    )
    : res.status(400).send(
      JSON.stringify({
        success: false,
        message: "There was an error creating the account.",
      })
    );
};

const updateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;

  const update = await AccountModel.update(req.body, {
    where: {
      id,
    },
  });

  if (update != null) {
    res.json({
      success: true,
      message: "Account number updated successfully",
    })
  } else {
    return res.status(500).send(
      JSON.stringify({
        success: false,
        message: "There was an error updating the account.",
      })
    );
  }
};

const deleteAccount = async (req: Request, res: Response) => {
  const { id } = req.params;

  const deleteAccount = await AccountModel.destroy({ where: { id } });

  return deleteAccount != null
    ? res.status(201).send(
      JSON.stringify({
        success: true,
        message: "Account deleted successfully.",
      })
    )
    : res.status(500).send(
      JSON.stringify({
        success: false,
        message: "There was an error deleting this account.",
      })
    );
};

export {
  findAllaccounts,
  findOneAccount,
  createAccount,
  updateAccount,
  deleteAccount,
};
