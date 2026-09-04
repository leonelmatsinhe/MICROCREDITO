"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const jwt = __importStar(require("jsonwebtoken"));
const CompanyModel_1 = require("../database/models/CompanyModel");
const UserModel_1 = require("../database/models/UserModel");
// A autorização de envio de SMS (smsEnabled) só pode ser alterada pelo Admin.
const isAdminFromToken = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = String(req.headers.authorization || "").split(" ")[1] || "";
    try {
        const decoded = jwt.verify(token, process.env.APP_SECRET + "");
        const user = yield UserModel_1.UserModel.findByPk(decoded === null || decoded === void 0 ? void 0 : decoded.id, {
            attributes: ["id", "userRole"],
        });
        return Number((_a = user === null || user === void 0 ? void 0 : user.getDataValue) === null || _a === void 0 ? void 0 : _a.call(user, "userRole")) === 1;
    }
    catch (error) {
        return false;
    }
});
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
    // smsEnabled (autorizar/desactivar envio de SMS) — operação exclusiva do Admin
    if (Object.prototype.hasOwnProperty.call(req.body, "smsEnabled")) {
        const isAdmin = yield isAdminFromToken(req);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Apenas o Administrador pode alterar a autorização de envio de SMS.",
            });
        }
    }
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
