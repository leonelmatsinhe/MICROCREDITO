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
exports.customerContract = void 0;
const CompanyModel_1 = require("../database/models/CompanyModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const generatePDF_1 = require("../utils/generatePDF");
const customerContract = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, accountNumber, loanId } = req.params;
    const company = yield CompanyModel_1.CompanyModel.findOne({ where: { id: companyId, }, });
    const customer = yield CustomerModel_1.CustomerModel.findOne({ where: { accountNumber } });
    const amortization = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({ where: { loanId } });
    if (company != null && customer != null && amortization != null) {
        const firm = {
            companyLogo: company.getDataValue("companyLogo"),
            companyName: company.getDataValue("companyName"),
            companyAddress: company.getDataValue("companyAddress"),
            companyPhone: company.getDataValue("companyPhone"),
            companyNuit: company.getDataValue("companyNuit"),
            companyEmail: company.getDataValue("companyEmail"),
            companyManager: company.getDataValue("companyManager"),
        };
        const cliente = {
            accountNumber: customer.getDataValue("accountNumber"),
            customerName: customer.getDataValue("customerName"),
            customerAddress: customer.getDataValue("customerAddress"),
            customerPhone: customer.getDataValue("customerPhone"),
            customerNuit: customer.getDataValue("customerNuit"),
            customerProfession: customer.getDataValue("customerProfession"),
            customerLocalOfWork: customer.getDataValue("customerLocalOfWork"),
            customerEmergencyPerson: customer.getDataValue("customerEmergencyPerson"),
            customerEmergencyContact: customer.getDataValue("customerEmergencyContact"),
            createdAt: customer.getDataValue("createdAt"),
        };
        new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const generating = yield (0, generatePDF_1.generateContrat)(firm, cliente, amortization);
                console.log(generating);
                res.send(JSON.stringify({
                    success: true,
                    message: "Contrato gerado com sucesso.",
                }));
                resolve(generating);
            }
            catch (err) {
                console.log(err);
                res.send(JSON.stringify({
                    success: false,
                    message: "Houve um erro na geração do contrato.",
                }));
                reject(err);
            }
        }));
    }
    else {
        res.status(204).send({
            success: false,
            message: "There was an error on the server",
        });
    }
});
exports.customerContract = customerContract;
