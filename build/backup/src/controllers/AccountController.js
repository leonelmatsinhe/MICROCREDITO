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
exports.deleteAccount = exports.updateAccount = exports.createAccount = exports.findOneAccount = exports.findAllaccounts = void 0;
const AccountModel_1 = require("../database/models/AccountModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const findAllaccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const accounts = yield AccountModel_1.AccountModel.findAll({
        where: {
            companyId: id,
        },
        order: [["id", "DESC"]],
    });
    return accounts.length > 0
        ? res.status(200).send({ success: true, result: accounts })
        : res
            .status(204)
            .send({ success: false, message: "No accounts registered so far." });
});
exports.findAllaccounts = findAllaccounts;
const findOneAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const account = yield AccountModel_1.AccountModel.findOne({
        where: {
            id,
        },
    });
    return account != null
        ? res.status(200).send({ success: true, result: account })
        : res.status(204).send({
            success: false,
            result: "No account found with the ID provided",
        });
});
exports.findOneAccount = findOneAccount;
const createAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { createdBy, companyId } = req.body;
    let accountStatus = 0;
    let accountNumber;
    const account = yield AccountModel_1.AccountModel.findAll({
        order: [["id", "DESC"]],
    });
    if (account.length === 0) {
        accountNumber = 202200000;
    }
    else {
        const conta = account.at(0);
        const incrementAccount = conta === null || conta === void 0 ? void 0 : conta.getDataValue("accountNumber");
        accountNumber = parseInt(incrementAccount) + 1;
    }
    const newAccount = yield AccountModel_1.AccountModel.create({
        companyId,
        accountNumber,
        createdBy,
        accountStatus,
    });
    newAccount != null
        ? res.send(JSON.stringify({
            success: true,
            message: "Account generated successfully.",
        }))
        : res.status(400).send(JSON.stringify({
            success: false,
            message: "There was an error creating the account.",
        }));
});
exports.createAccount = createAccount;
const updateAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { customerId } = req.body;
    const update = yield AccountModel_1.AccountModel.update(req.body, {
        where: {
            accountNumber: id,
        },
    });
    if (update != null) {
        const customerUpdation = yield CustomerModel_1.CustomerModel.update(req.body, {
            where: { id: customerId },
        });
        return customerUpdation != null
            ? res.json({
                success: true,
                message: "Account number allocated successfully",
            })
            : res.status(500).send(JSON.stringify({
                success: false,
                message: "There was an error allocating the account.",
            }));
    }
    else {
        return res.status(500).send(JSON.stringify({
            success: false,
            message: "There was an error allocating the account.",
        }));
    }
});
exports.updateAccount = updateAccount;
const deleteAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const deleteAccount = yield AccountModel_1.AccountModel.destroy({ where: { id: id } });
    return deleteAccount != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "Account deleted successfully.",
        }))
        : res.status(500).send(JSON.stringify({
            success: false,
            message: "There was an error deleting this account.",
        }));
});
exports.deleteAccount = deleteAccount;
