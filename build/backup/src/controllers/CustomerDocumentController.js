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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.updateDocument = exports.createDocument = exports.getCustomerDocuments = exports.findAllDocuments = void 0;
const CustomerDocumentsModel_1 = require("../database/models/CustomerDocumentsModel");
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
    let { companyId, accountNumber, documentName, documentFileUrl, uploadedBy } = req.body;
    const document = yield CustomerDocumentsModel_1.CustomerDocumentsModel.create({
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
});
exports.createDocument = createDocument;
const updateDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const document = yield CustomerDocumentsModel_1.CustomerDocumentsModel.update(req.body, {
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
});
exports.updateDocument = updateDocument;
const deleteDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const deleteDocument = yield CustomerDocumentsModel_1.CustomerDocumentsModel.destroy({
        where: { id: id },
    });
    return deleteDocument != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "User deleted successfully.",
        }))
        : res.status(400).send(JSON.stringify({
            success: false,
            message: "There was an error deleting this user.",
        }));
});
exports.deleteDocument = deleteDocument;
