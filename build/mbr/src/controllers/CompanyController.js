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
exports.updateCompany = exports.createCompany = exports.findOneCompany = exports.findAllCompanies = void 0;
const CompanyModel_1 = require("../database/models/CompanyModel");
const findAllCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const companies = yield CompanyModel_1.CompanyModel.findAll({
        order: [["companyName", "DESC"]],
    });
    return companies.length > 0
        ? res.status(200).send(JSON.stringify({ success: true, result: companies }))
        : res.status(204).send(JSON.stringify({
            success: false,
            message: "No companies registered so far.",
        }));
});
exports.findAllCompanies = findAllCompanies;
const findOneCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const company = yield CompanyModel_1.CompanyModel.findOne({
        where: {
            id,
        },
    });
    return company
        ? res.status(200).send(JSON.stringify({ success: true, result: company }))
        : res.status(204).send(JSON.stringify({
            success: false,
            message: "No company found with the ID provided",
        }));
});
exports.findOneCompany = findOneCompany;
const createCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { companyName, companyEmail, companyWebsite, companyManager, smsSender, companyNuit, companyPhone, districtId, provinceId, companyLogo, forfeit, companyAddress, companyStatus, } = req.body;
    const company = yield CompanyModel_1.CompanyModel.create({
        companyName,
        companyEmail,
        companyWebsite,
        companyManager,
        smsSender,
        companyNuit,
        companyPhone,
        districtId,
        provinceId,
        companyLogo,
        forfeit,
        companyAddress,
        companyStatus,
    });
    return company != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "Company created successfully.",
        }))
        : res.status(500).json({
            success: false,
            message: "Company was not created successfully",
        });
});
exports.createCompany = createCompany;
const updateCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const company = yield CompanyModel_1.CompanyModel.update(req.body, {
        where: {
            id,
        },
    });
    return company != null
        ? res.status(200).json({
            success: true,
            message: "Company updated successfully",
        })
        : res.status(400).json({
            success: false,
            message: "There was an error updating the company.",
        });
});
exports.updateCompany = updateCompany;
