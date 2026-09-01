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
exports.createDefaultTemplates = exports.deleteTemplate = exports.updateTemplate = exports.createTemplate = exports.findTemplateByType = exports.findOneTemplate = exports.findAllTemplates = void 0;
const ContractTemplateModel_1 = require("../database/models/ContractTemplateModel");
const contractTemplate_1 = require("../templates/contractTemplate");
// Listar todos os templates de uma empresa
const findAllTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId } = req.params;
    try {
        const templates = yield ContractTemplateModel_1.ContractTemplateModel.findAll({
            where: { companyId },
            order: [["id", "ASC"]],
        });
        return res.status(200).send({ success: true, result: templates });
    }
    catch (error) {
        return res.status(500).send({ success: false, message: "Erro ao buscar templates." });
    }
});
exports.findAllTemplates = findAllTemplates;
// Buscar um template por ID
const findOneTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const template = yield ContractTemplateModel_1.ContractTemplateModel.findByPk(id);
        if (!template) {
            return res.status(404).send({ success: false, message: "Template não encontrado." });
        }
        return res.status(200).send({ success: true, result: template });
    }
    catch (error) {
        return res.status(500).send({ success: false, message: "Erro ao buscar template." });
    }
});
exports.findOneTemplate = findOneTemplate;
// Buscar template por tipo e empresa
const findTemplateByType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, type } = req.params;
    try {
        const template = yield ContractTemplateModel_1.ContractTemplateModel.findOne({
            where: { companyId, type, status: 1 },
        });
        if (!template) {
            // Buscar template padrão do sistema
            const defaultTemplate = yield ContractTemplateModel_1.ContractTemplateModel.findOne({
                where: { companyId: 0, type, status: 1 },
            });
            return res.status(200).send({
                success: true,
                result: defaultTemplate || null,
            });
        }
        return res.status(200).send({ success: true, result: template });
    }
    catch (error) {
        return res.status(500).send({ success: false, message: "Erro ao buscar template." });
    }
});
exports.findTemplateByType = findTemplateByType;
// Criar template
const createTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, name, type, subject, content, variables, isDefault } = req.body;
    try {
        const newTemplate = yield ContractTemplateModel_1.ContractTemplateModel.create({
            companyId,
            name,
            type,
            subject: subject || "",
            content,
            variables: variables || "[]",
            isDefault: isDefault || 0,
            status: 1,
        });
        return res.status(201).send({
            success: true,
            message: "Template criado com sucesso.",
            result: newTemplate,
        });
    }
    catch (error) {
        return res.status(500).send({ success: false, message: "Erro ao criar template." });
    }
});
exports.createTemplate = createTemplate;
// Actualizar template
const updateTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, type, subject, content, variables, isDefault, status } = req.body;
    try {
        const template = yield ContractTemplateModel_1.ContractTemplateModel.findByPk(id);
        if (!template) {
            return res.status(404).send({ success: false, message: "Template não encontrado." });
        }
        yield template.update({
            name: name !== undefined ? name : template.get("name"),
            type: type !== undefined ? type : template.get("type"),
            subject: subject !== undefined ? subject : template.get("subject"),
            content: content !== undefined ? content : template.get("content"),
            variables: variables !== undefined ? variables : template.get("variables"),
            isDefault: isDefault !== undefined ? isDefault : template.get("isDefault"),
            status: status !== undefined ? status : template.get("status"),
        });
        return res.status(200).send({
            success: true,
            message: "Template actualizado com sucesso.",
            result: template,
        });
    }
    catch (error) {
        return res.status(500).send({ success: false, message: "Erro ao actualizar template." });
    }
});
exports.updateTemplate = updateTemplate;
// Eliminar template
const deleteTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const template = yield ContractTemplateModel_1.ContractTemplateModel.findByPk(id);
        if (!template) {
            return res.status(404).send({ success: false, message: "Template não encontrado." });
        }
        // Não permitir eliminar templates padrão do sistema
        if (template.get("isDefault") === 1) {
            return res.status(400).send({ success: false, message: "Não é possível eliminar templates padrão do sistema." });
        }
        yield template.destroy();
        return res.status(200).send({ success: true, message: "Template eliminado com sucesso." });
    }
    catch (error) {
        return res.status(500).send({ success: false, message: "Erro ao eliminar template." });
    }
});
exports.deleteTemplate = deleteTemplate;
// Criar templates padrão do sistema para uma empresa
const createDefaultTemplates = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const defaultTemplates = [
        {
            companyId,
            name: "Contrato de Concessão de Empréstimo",
            type: "contract",
            subject: "CONTRATO DE CONCESSÃO DE EMPRÉSTIMO",
            content: contractTemplate_1.contractTemplateHTML,
            variables: JSON.stringify([
                "companyName", "companyAddress", "companyRepresentative", "companyRepresentativeBI",
                "customerName", "customerGender", "customerNationalId", "customerNuit", "customerAddress",
                "loanAmountFormatted", "loanAmountWords", "interestRateFormatted", "numberOfInstallments",
                "disbursementDate", "disbursementMethod", "bankName", "bankAccount", "bankIBAN",
                "paymentDueDay", "preparationFeeFormatted", "preparationFeeWords",
                "lateInterestRate", "lateFeeFixed", "guaranteesSection"
            ]),
            isDefault: 1,
            status: 1,
        },
        {
            companyId,
            name: "Termo de Compromisso de Recebimento",
            type: "commitment_term",
            subject: "TERMO DE COMPROMISSO DE RECEBIMENTO DE CRÉDITO",
            content: contractTemplate_1.commitmentTermHTML,
            variables: JSON.stringify([
                "customerName", "customerNationalId", "loanAmountFormatted", "loanAmountWords",
                "companyName", "companyAddress", "companyNuit", "companyRepresentative", "disbursementDate"
            ]),
            isDefault: 1,
            status: 1,
        },
        {
            companyId,
            name: "Declaração de Bens de Garantia",
            type: "guarantee_declaration",
            subject: "LISTA DE BENS DE GARANTIA",
            content: contractTemplate_1.guaranteeDeclarationHTML,
            variables: JSON.stringify([
                "customerGenderLabel", "customerName", "accountNumber", "customerAddress",
                "customerPhone", "customerNuit", "guaranteesTableRows", "totalGuaranteeAmount",
                "loanAmountFormatted", "interestRateFormatted", "numberOfInstallments",
                "loanTotalWithInterest", "companyName", "companyRepresentative", "disbursementDate"
            ]),
            isDefault: 1,
            status: 1,
        },
    ];
    for (const template of defaultTemplates) {
        const exists = yield ContractTemplateModel_1.ContractTemplateModel.findOne({
            where: { companyId: template.companyId, type: template.type },
        });
        if (!exists) {
            yield ContractTemplateModel_1.ContractTemplateModel.create(template);
        }
    }
});
exports.createDefaultTemplates = createDefaultTemplates;
