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
exports.loginCustomer = exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.findOneCustomer = exports.findAllCustomers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const CustomerModel_1 = require("../database/models/CustomerModel");
const findAllCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const customers = yield CustomerModel_1.CustomerModel.findAll({
        where: {
            companyId: id
        },
        order: [["customerName", "ASC"]],
    });
    return customers.length > 0
        ? res.status(200).send({ success: true, result: customers })
        : res
            .status(204)
            .send({ success: false, message: "No customers registered so far." });
});
exports.findAllCustomers = findAllCustomers;
const findOneCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const customer = yield CustomerModel_1.CustomerModel.findOne({
        where: {
            id: id,
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
    let { customerName, companyId, customerEmail, customerNuit, customerPhone, customerNationalId, customerDateOfBirth, customerLocalOfBirth, customerProfession, customerMonthlySalary, customerLocalOfWork, customerAddress, maritalStatus, customerSpouseName, customerSpouseContact, customerEmergencyPerson, customerEmergencyContact, customerStatus, interestRateId, } = req.body;
    const customer = yield CustomerModel_1.CustomerModel.create({
        customerName,
        companyId,
        customerEmail,
        customerNuit,
        customerPhone,
        customerNationalId,
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
        : res.status(204).send({
            success: false,
            message: "There was an error registering the customer.",
        });
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
    const customer = yield CustomerModel_1.CustomerModel.findOne({
        where: {
            phone,
        },
    });
    if ((customer === null || customer === void 0 ? void 0 : customer.getDataValue.length) === 1) {
        if (yield bcryptjs_1.default.compare(password + "", customer.getDataValue("password"))) {
            const token = jwt.sign({ id: customer.getDataValue("id") }, process.env.APP_SECRET + "", {
                expiresIn: "1d",
            });
            const data = [
                {
                    id: customer.getDataValue("id"),
                    customerName: customer.getDataValue("customerName"),
                    customerEmail: customer.getDataValue("customerEmail"),
                    customerPhone: customer.getDataValue("customerPhone"),
                    status: customer.getDataValue("status"),
                    token: token,
                    createdAt: customer.getDataValue("createdAt"),
                    updatedAt: customer.getDataValue("updatedAt"),
                },
            ];
            return res.send(JSON.stringify({ success: true, result: data }));
        }
        else {
            return res
                .status(204)
                .send(JSON.stringify({ success: false, message: "Wrong password" }));
        }
    }
    else {
        return res
            .status(204)
            .json({ success: false, message: "Customer not found" });
    }
});
exports.loginCustomer = loginCustomer;
