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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeCustomerPassword = exports.loginCustomer = exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.findOneCustomer = exports.searchCustomers = exports.findAllCustomers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const CustomerModel_1 = require("../database/models/CustomerModel");
const sequelize_1 = require("sequelize");
const findAllCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;
    try {
        // Condição base: filtrar por empresa
        const whereClause = { companyId: id };
        // Se houver pesquisa, adicionar filtro por nome, telefone ou conta
        if (search.trim()) {
            whereClause[sequelize_1.Op.or] = [
                { customerName: { [sequelize_1.Op.like]: `%${search}%` } },
                { customerPhone: { [sequelize_1.Op.like]: `%${search}%` } },
                { accountNumber: { [sequelize_1.Op.like]: `%${search}%` } },
                { customerNuit: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        const { count, rows } = yield CustomerModel_1.CustomerModel.findAndCountAll({
            where: whereClause,
            order: [["customerName", "ASC"]],
            limit,
            offset,
        });
        const totalPages = Math.ceil(count / limit);
        return res.status(200).json({
            success: true,
            result: rows,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    }
    catch (error) {
        console.error("Erro ao buscar mutuários:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao buscar mutuários.",
        });
    }
});
exports.findAllCustomers = findAllCustomers;
// Mantém endpoint legado para compatibilidade com outros componentes
const searchCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { search } = req.params;
    const customers = yield CustomerModel_1.CustomerModel.findAll({
        order: [["customerName", "ASC"]],
        where: {
            [sequelize_1.Op.or]: [
                { customerName: { [sequelize_1.Op.like]: "%" + search + "%" } },
                { customerPhone: { [sequelize_1.Op.like]: "%" + search + "%" } },
                { accountNumber: { [sequelize_1.Op.like]: "%" + search + "%" } },
            ],
        },
    });
    return res.status(200).json({ success: true, result: customers || [] });
});
exports.searchCustomers = searchCustomers;
const findOneCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const customer = yield CustomerModel_1.CustomerModel.findOne({
        where: {
            accountNumber: id,
        },
    });
    return customer
        ? res.status(200).send({ success: true, result: customer })
        : res.status(204).send({
            success: false,
            result: "No customer found with the ID provided",
        });
});
exports.findOneCustomer = findOneCustomer;
const createCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { customerName, sex, companyId, customerEmail, customerNuit, customerPhone, customerNationalId, issuedAt, localOfIssue, customerDateOfBirth, customerLocalOfBirth, customerProfession, customerMonthlySalary, customerLocalOfWork, customerAddress, maritalStatus, customerSpouseName, customerSpouseContact, customerEmergencyPerson, customerEmergencyContact, customerStatus, interestRateId, } = req.body;
    const accNumber = yield CustomerModel_1.CustomerModel.findOne({
        where: {
            companyId
        },
        order: [["id", "DESC"]],
    });
    const accountNumber = accNumber === null ? 100 : parseInt(accNumber === null || accNumber === void 0 ? void 0 : accNumber.getDataValue("accountNumber")) + 1;
    bcryptjs_1.default.hash("123456" + "", 10, (hashError, hash) => __awaiter(void 0, void 0, void 0, function* () {
        if (hashError) {
            return res.status(500).json({
                success: false,
                message: hashError,
            });
        }
        const customer = yield CustomerModel_1.CustomerModel.create({
            customerName,
            sex,
            companyId,
            customerEmail,
            accountNumber,
            password: hash,
            customerNuit,
            customerPhone,
            customerNationalId,
            issuedAt,
            localOfIssue,
            customerDateOfBirth,
            customerLocalOfBirth,
            customerProfession,
            customerMonthlySalary,
            customerLocalOfWork,
            customerAddress,
            maritalStatus,
            customerSpouseName,
            customerSpouseContact,
            customerEmergencyPerson,
            customerEmergencyContact,
            customerStatus,
            interestRateId,
        });
        return customer != null
            ? res
                .status(201)
                .send({ success: true, message: "Customer created successfully." })
            : res.status(200).send({
                success: false,
                message: "There was an error registering the customer.",
            });
    }));
});
exports.createCustomer = createCustomer;
const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield CustomerModel_1.CustomerModel.update(req.body, {
        where: {
            id,
        },
    });
    return res
        .status(200)
        .json({ success: true, message: "Customer updated successfully" });
});
exports.updateCustomer = updateCustomer;
const deleteCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const deleteCustomer = yield CustomerModel_1.CustomerModel.destroy({ where: { id: id } });
    return deleteCustomer != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "Customer deleted successfully.",
        }))
        : res.status(204).send(JSON.stringify({
            success: false,
            message: "There was an error deleting this customer.",
        }));
});
exports.deleteCustomer = deleteCustomer;
const loginCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone, password } = req.body;
    console.log(phone, password);
    const customer = yield CustomerModel_1.CustomerModel.findOne({
        where: {
            customerPhone: phone,
        },
    });
    if ((customer === null || customer === void 0 ? void 0 : customer.getDataValue.length) == 1) {
        if (yield bcryptjs_1.default.compare(password, customer === null || customer === void 0 ? void 0 : customer.getDataValue("password"))) {
            const token = jwt.sign({ id: customer === null || customer === void 0 ? void 0 : customer.getDataValue("id") }, process.env.APP_SECRET + "", {
                expiresIn: "15d",
            });
            const data = [
                {
                    id: customer === null || customer === void 0 ? void 0 : customer.getDataValue("id"),
                    companyId: customer === null || customer === void 0 ? void 0 : customer.getDataValue("companyId"),
                    accountNumber: customer === null || customer === void 0 ? void 0 : customer.getDataValue("accountNumber"),
                    customerName: customer === null || customer === void 0 ? void 0 : customer.getDataValue("customerName"),
                    customerEmail: customer === null || customer === void 0 ? void 0 : customer.getDataValue("customerEmail"),
                    customerPhone: customer === null || customer === void 0 ? void 0 : customer.getDataValue("customerPhone"),
                    customerNuit: customer === null || customer === void 0 ? void 0 : customer.getDataValue("customerNuit"),
                    customerNationalId: customer === null || customer === void 0 ? void 0 : customer.getDataValue("customerNationalId"),
                    issuedAt: customer === null || customer === void 0 ? void 0 : customer.getDataValue("issuedAt"),
                    localOfIssue: customer === null || customer === void 0 ? void 0 : customer.getDataValue("localOfIssue"),
                    customerDateOfBirth: customer === null || customer === void 0 ? void 0 : customer.getDataValue("customerDateOfBirth"),
                    customerProfession: customer === null || customer === void 0 ? void 0 : customer.getDataValue("customerProfession"),
                    customerMonthlySalary: customer === null || customer === void 0 ? void 0 : customer.getDataValue("customerMonthlySalary"),
                    customerLocalOfWork: customer === null || customer === void 0 ? void 0 : customer.getDataValue("customerLocalOfWork"),
                    customerAddress: customer === null || customer === void 0 ? void 0 : customer.getDataValue("customerAddress"),
                    sex: customer === null || customer === void 0 ? void 0 : customer.getDataValue("sex"),
                    maritalStatus: customer === null || customer === void 0 ? void 0 : customer.getDataValue("maritalStatus"),
                    status: customer === null || customer === void 0 ? void 0 : customer.getDataValue("status"),
                    createdAt: customer === null || customer === void 0 ? void 0 : customer.getDataValue("createdAt"),
                    updatedAt: customer === null || customer === void 0 ? void 0 : customer.getDataValue("updatedAt"),
                },
            ];
            return res.send(JSON.stringify({ success: true, result: data, token }));
        }
        else {
            return res
                .status(200)
                .send(JSON.stringify({ success: false, message: "Wrong password" }));
        }
    }
    else {
        return res
            .status(200)
            .json({ success: false, message: "Customer not found" });
    }
});
exports.loginCustomer = loginCustomer;
const changeCustomerPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { customerId, currentPassword, newPassword } = req.body;
    if (!customerId || !currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: "Todos os campos são obrigatórios.",
        });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: "A nova senha deve ter pelo menos 6 caracteres.",
        });
    }
    try {
        const customer = yield CustomerModel_1.CustomerModel.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            return res.status(200).json({
                success: false,
                message: "Cliente não encontrado.",
            });
        }
        const isMatch = yield bcryptjs_1.default.compare(currentPassword + "", customer.getDataValue("password"));
        if (!isMatch) {
            return res.status(200).json({
                success: false,
                message: "A senha actual está incorrecta.",
            });
        }
        bcryptjs_1.default.hash(newPassword + "", 10, (hashError, hash) => __awaiter(void 0, void 0, void 0, function* () {
            if (hashError) {
                return res.status(500).json({
                    success: false,
                    message: "Erro ao processar a nova senha.",
                });
            }
            yield CustomerModel_1.CustomerModel.update({ password: hash }, { where: { id: customerId } });
            return res.status(200).json({
                success: true,
                message: "Senha alterada com sucesso.",
            });
        }));
    }
    catch (error) {
        console.error("Erro ao alterar senha do cliente:", error);
        return res.status(500).json({
            success: false,
            message: "Erro interno ao alterar a senha.",
        });
    }
});
exports.changeCustomerPassword = changeCustomerPassword;
