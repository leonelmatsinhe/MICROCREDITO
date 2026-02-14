import { Request, Response } from "express";
import { CustomerDocumentsModel } from "../database/models/CustomerDocumentsModel";

const findAllDocuments = async (req: Request, res: Response) => {
  const documents = await CustomerDocumentsModel.findAll();
  return documents.length > 0
    ? res.status(200).send({ success: true, result: documents })
    : res.status(204).send({
        success: false,
        message: "No documents uploaded so far.",
      });
};

const getCustomerDocuments = async (req: Request, res: Response) => {
  const { id } = req.params;
  const document = await CustomerDocumentsModel.findAll({
    where: {
      accountNumber: id,
    },
  });
  return document
    ? res.status(200).send({ success: true, result: document })
    : res.status(500).send({
        success: false,
        result: "No documents found with the account number provided",
      });
};

const createDocument = async (req: Request, res: Response) => {
  let { companyId, accountNumber, documentName, documentFileUrl, uploadedBy } = req.body;

  const document = await CustomerDocumentsModel.create({
    companyId,
    accountNumber,
    documentName,
    documentFileUrl,
    uploadedBy,
  });

  return document != null
    ? res
        .status(201)
        .send({ success: true, message: "Document created successfully." })
    : res.status(500).send({
        success: false,
        message: "There was an error updating the document.",
      });
};

const updateDocument = async (req: Request, res: Response) => {
  const { id } = req.params;
  const document = await CustomerDocumentsModel.update(req.body, {
    where: {
      accountNumber: id,
    },
  });
  return document != null
    ? res
        .status(200)
        .json({ success: true, message: "Document updated successfully." })
    : res.status(500).json({
        success: true,
        message: "There was an error updating the document.",
      });
};

const deleteDocument = async (req: Request, res: Response) => {
  const { id } = req.params;

  const deleteDocument = await CustomerDocumentsModel.destroy({
    where: { id: id },
  });

  return deleteDocument != null
    ? res.status(201).send(
        JSON.stringify({
          success: true,
          message: "User deleted successfully.",
        })
      )
    : res.status(400).send(
        JSON.stringify({
          success: false,
          message: "There was an error deleting this user.",
        })
      );
};

export {
  findAllDocuments,
  getCustomerDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
};
