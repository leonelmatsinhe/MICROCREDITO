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
exports.changeUserPassword = exports.loginUser = exports.update = exports.destroy = exports.create = exports.findOne = exports.findAll = void 0;
const UserModel_1 = require("../database/models/UserModel");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const findAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const users = yield UserModel_1.UserModel.findAll({
        where: {
            companyId: id,
        },
        order: [["name", "DESC"]],
    });
    return users.length > 0
        ? res.status(200).json({ success: true, result: users })
        : res.status(204).json({ success: false, message: "Users not found." });
});
exports.findAll = findAll;
const findOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user = yield UserModel_1.UserModel.findOne({
        where: {
            id: id,
        },
    });
    return user
        ? res.status(200).json({ success: true, result: user })
        : res.status(204).json({ success: false, message: "User not found." });
});
exports.findOne = findOne;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { name, email, password, phone, status, companyId, userRole } = req.body;
    bcryptjs_1.default.hash(password + "", 10, (hashError, hash) => __awaiter(void 0, void 0, void 0, function* () {
        if (hashError) {
            return res.status(500).json({
                success: false,
                message: hashError,
            });
        }
        const user = yield UserModel_1.UserModel.create({
            name,
            email,
            password: hash,
            updatedPassword: 0,
            phone,
            status,
            companyId,
            userRole,
        });
        return user != null
            ? res.status(201).send(JSON.stringify({
                success: true,
                message: "User created successfully.",
            }))
            : res.status(204).send(JSON.stringify({
                success: false,
                message: "There was an error registring this user.",
            }));
    }));
});
exports.create = create;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userUpdation = yield UserModel_1.UserModel.update(req.body, {
        where: {
            id: id,
        },
    });
    return userUpdation != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "User successfully updated.",
        }))
        : res.status(204).send(JSON.stringify({
            success: false,
            message: "There was an error updating this user.",
        }));
});
exports.update = update;
const destroy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const deleteUser = yield UserModel_1.UserModel.destroy({ where: { id: id } });
    return deleteUser != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "User deleted successfully.",
        }))
        : res.status(204).send(JSON.stringify({
            success: false,
            message: "There was an error deleting this user.",
        }));
});
exports.destroy = destroy;
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    console.log(email, password);
    const user = yield UserModel_1.UserModel.findOne({
        where: {
            email,
            status: 1,
        },
    });
    if ((user === null || user === void 0 ? void 0 : user.getDataValue.length) == 1) {
        if (yield bcryptjs_1.default.compare(password, user.getDataValue("password"))) {
            const token = jwt.sign({ id: user.getDataValue("id") }, process.env.APP_SECRET + "", {
                expiresIn: "1h",
            });
            const data = [
                {
                    id: user.getDataValue("id"),
                    companyId: user.getDataValue("companyId"),
                    name: user.getDataValue("name"),
                    email: user.getDataValue("email"),
                    phone: user.getDataValue("phone"),
                    userRole: user.getDataValue("userRole"),
                    updatedPassword: user.getDataValue("updatedPassword"),
                    status: user.getDataValue("status"),
                    token: token,
                    createdAt: user.getDataValue("createdAt"),
                    updatedAt: user.getDataValue("updatedAt"),
                },
            ];
            return res.send(JSON.stringify({ success: true, result: data }));
        }
        else {
            return res
                .status(200)
                .send(JSON.stringify({ success: false, message: "Wrong password" }));
        }
    }
    else {
        return res.status(200).json({ success: false, message: "User not found" });
    }
});
exports.loginUser = loginUser;
const changeUserPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, newPassword, updatedPassword } = req.body;
    const user = yield UserModel_1.UserModel.findOne({
        where: {
            email,
        },
    });
    if ((user === null || user === void 0 ? void 0 : user.getDataValue.length) === 1) {
        if (yield bcryptjs_1.default.compare(password + "", user.getDataValue("password"))) {
            bcryptjs_1.default.hash(newPassword + "", 10, (hashError, hash) => __awaiter(void 0, void 0, void 0, function* () {
                if (hashError) {
                    return res.status(500).json({
                        success: false,
                        message: hashError,
                    });
                }
                else {
                    const userUpdation = yield UserModel_1.UserModel.update({ password: hash, updatedPassword: updatedPassword }, {
                        where: {
                            id: user.getDataValue("id"),
                        },
                    });
                    return userUpdation != null
                        ? res.status(201).send(JSON.stringify({
                            success: true,
                            message: "Password successfully updated.",
                        }))
                        : res.send(JSON.stringify({
                            success: false,
                            message: "There was an error updating the user password.",
                        }));
                }
            }));
        }
        else {
            return res.send(JSON.stringify({
                success: false,
                message: "There was an error updating your password. Please try again later.",
            }));
        }
    }
    else {
        return res.send(JSON.stringify({ success: false, message: "User not found" }));
    }
});
exports.changeUserPassword = changeUserPassword;
