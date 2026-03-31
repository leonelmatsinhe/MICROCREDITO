import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { CustomerDocumentsModel } from "../database/models/CustomerDocumentsModel";

const isCompiled =
  __dirname.includes(path.sep + "build" + path.sep) ||
  __dirname.endsWith(path.sep + "build");
const projectRoot = isCompiled
  ? path.join(__dirname, "..", "..", "..")
  : path.join(__dirname, "..", "..");
const documentStorageDir = path.join(projectRoot, "uploads", "documents");

const buildStoredDocumentUrl = (fileName: string) => `/documents/${fileName}`;
const isLocalDocumentUrl = (fileUrl: string | null | undefined) =>
  typeof fileUrl === "string" && fileUrl.startsWith("/documents/");

const extractLocalDocumentFileName = (fileUrl: string | null | undefined) => {
  if (!fileUrl || typeof fileUrl !== "string") return null;
  if (!fileUrl.startsWith("/documents/")) return null;
  return path.basename(fileUrl);
};

const deleteLocalDocumentFile = (fileUrl: string | null | undefined) => {
  const fileName = extractLocalDocumentFileName(fileUrl);
  if (!fileName) return;
  const filePath = path.join(documentStorageDir, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

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
  try {
    const { companyId, accountNumber, documentName, uploadedBy } = req.body;
    const uploadedFileName = req.file?.filename;
    if (!uploadedFileName) {
      return res.status(400).json({
        success: false,
        message:
          "Upload obrigatório: envie o ficheiro diretamente no campo 'file' (multipart/form-data).",
      });
    }
    const documentFileUrl = buildStoredDocumentUrl(uploadedFileName);

    if (!companyId || !accountNumber || !documentName || !uploadedBy || !documentFileUrl) {
      return res.status(400).send({
        success: false,
        message: "Campos obrigatórios: companyId, accountNumber, documentName, uploadedBy e ficheiro.",
      });
    }
    if (!isLocalDocumentUrl(String(documentFileUrl))) {
      return res.status(400).json({
        success: false,
        message:
          "documentFileUrl inválido. Apenas referências locais '/documents/<ficheiro>' são permitidas.",
      });
    }

    const document = await CustomerDocumentsModel.create({
      companyId: Number(companyId),
      accountNumber: Number(accountNumber),
      documentName: String(documentName),
      documentFileUrl: String(documentFileUrl),
      uploadedBy: String(uploadedBy),
    });

    return document != null
      ? res.status(201).send({
          success: true,
          message: "Documento criado com sucesso.",
          result: document,
        })
      : res.status(500).send({
          success: false,
          message: "Houve um erro ao guardar o documento.",
        });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Erro interno ao criar documento.",
    });
  }
};

const updateDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const previousDocument = await CustomerDocumentsModel.findByPk(id);
    if (!previousDocument) {
      return res.status(404).json({
        success: false,
        message: "Documento não encontrado.",
      });
    }

    const updatePayload: any = { ...req.body };
    if (req.file?.filename) {
      updatePayload.documentFileUrl = buildStoredDocumentUrl(req.file.filename);
    }
    if (
      updatePayload.documentFileUrl !== undefined &&
      !isLocalDocumentUrl(String(updatePayload.documentFileUrl))
    ) {
      return res.status(400).json({
        success: false,
        message:
          "documentFileUrl inválido. Apenas referências locais '/documents/<ficheiro>' são permitidas.",
      });
    }

    const [affectedRows] = await CustomerDocumentsModel.update(updatePayload, {
      where: { id },
    });

    if (affectedRows > 0 && req.file?.filename) {
      deleteLocalDocumentFile(
        (previousDocument as any).documentFileUrl as string | undefined
      );
    }

    return affectedRows > 0
      ? res.status(200).json({
          success: true,
          message: "Documento atualizado com sucesso.",
        })
      : res.status(500).json({
          success: false,
          message: "Houve um erro ao atualizar o documento.",
        });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Erro interno ao atualizar documento.",
    });
  }
};

const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingDocument: any = await CustomerDocumentsModel.findByPk(id);
    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        message: "Documento não encontrado.",
      });
    }

    const deletedRows = await CustomerDocumentsModel.destroy({
      where: { id },
    });

    if (deletedRows > 0) {
      deleteLocalDocumentFile(existingDocument.documentFileUrl);
      return res.status(200).json({
        success: true,
        message: "Documento removido com sucesso.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Houve um erro ao remover o documento.",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Erro interno ao remover documento.",
    });
  }
};

export {
  findAllDocuments,
  getCustomerDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
};
