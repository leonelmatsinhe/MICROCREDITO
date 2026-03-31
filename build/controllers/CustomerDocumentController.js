"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.updateDocument = exports.createDocument = exports.getCustomerDocuments = exports.findAllDocuments = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CustomerDocumentsModel_1 = require("../database/models/CustomerDocumentsModel");
const isCompiled = __dirname.includes(path_1.default.sep + "build" + path_1.default.sep) ||
    __dirname.endsWith(path_1.default.sep + "build");
const projectRoot = isCompiled
    ? path_1.default.join(__dirname, "..", "..", "..")
    : path_1.default.join(__dirname, "..", "..");
const documentStorageDir = path_1.default.join(projectRoot, "uploads", "documents");
const buildStoredDocumentUrl = (fileName) => `/documents/${fileName}`;
const isLocalDocumentUrl = (fileUrl) => typeof fileUrl === "string" && fileUrl.startsWith("/documents/");
const extractLocalDocumentFileName = (fileUrl) => {
    if (!fileUrl || typeof fileUrl !== "string")
        return null;
    if (!fileUrl.startsWith("/documents/"))
        return null;
    return path_1.default.basename(fileUrl);
};
const deleteLocalDocumentFile = (fileUrl) => {
    const fileName = extractLocalDocumentFileName(fileUrl);
    if (!fileName)
        return;
    const filePath = path_1.default.join(documentStorageDir, fileName);
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
};
const findAllDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const documents = yield CustomerDocumentsModel_1.CustomerDocumentsModel.findAll();
    return documents.length > 0
        ? res.status(200).send({ success: true, result: documents })
        : res.status(204).send({
            success: false,
            message: "No documents uploaded so far.",
        });
});
exports.findAllDocuments = findAllDocuments;
const getCustomerDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const document = yield CustomerDocumentsModel_1.CustomerDocumentsModel.findAll({
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
});
exports.getCustomerDocuments = getCustomerDocuments;
const createDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { companyId, accountNumber, documentName, uploadedBy } = req.body;
        const uploadedFileName = (_a = req.file) === null || _a === void 0 ? void 0 : _a.filename;
        if (!uploadedFileName) {
            return res.status(400).json({
                success: false,
                message: "Upload obrigatório: envie o ficheiro diretamente no campo 'file' (multipart/form-data).",
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
                message: "documentFileUrl inválido. Apenas referências locais '/documents/<ficheiro>' são permitidas.",
            });
        }
        const document = yield CustomerDocumentsModel_1.CustomerDocumentsModel.create({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Erro interno ao criar documento.",
        });
    }
});
exports.createDocument = createDocument;
const updateDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    try {
        const { id } = req.params;
        const previousDocument = yield CustomerDocumentsModel_1.CustomerDocumentsModel.findByPk(id);
        if (!previousDocument) {
            return res.status(404).json({
                success: false,
                message: "Documento não encontrado.",
            });
        }
        const updatePayload = Object.assign({}, req.body);
        if ((_b = req.file) === null || _b === void 0 ? void 0 : _b.filename) {
            updatePayload.documentFileUrl = buildStoredDocumentUrl(req.file.filename);
        }
        if (updatePayload.documentFileUrl !== undefined &&
            !isLocalDocumentUrl(String(updatePayload.documentFileUrl))) {
            return res.status(400).json({
                success: false,
                message: "documentFileUrl inválido. Apenas referências locais '/documents/<ficheiro>' são permitidas.",
            });
        }
        const [affectedRows] = yield CustomerDocumentsModel_1.CustomerDocumentsModel.update(updatePayload, {
            where: { id },
        });
        if (affectedRows > 0 && ((_c = req.file) === null || _c === void 0 ? void 0 : _c.filename)) {
            deleteLocalDocumentFile(previousDocument.documentFileUrl);
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Erro interno ao atualizar documento.",
        });
    }
});
exports.updateDocument = updateDocument;
const deleteDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existingDocument = yield CustomerDocumentsModel_1.CustomerDocumentsModel.findByPk(id);
        if (!existingDocument) {
            return res.status(404).json({
                success: false,
                message: "Documento não encontrado.",
            });
        }
        const deletedRows = yield CustomerDocumentsModel_1.CustomerDocumentsModel.destroy({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Erro interno ao remover documento.",
        });
    }
});
exports.deleteDocument = deleteDocument;
