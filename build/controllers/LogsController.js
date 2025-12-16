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
exports.createLog = exports.findLogsByCompany = exports.findAllLogs = void 0;
const sequelize_1 = require("sequelize");
const LogsModel_1 = require("../database/models/LogsModel");
const findAllLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, companyId } = req.query;
    console.log(from, to, companyId);
    const logs = yield LogsModel_1.LogsModel.findAll({
        where: {
            createdAt: {
                [sequelize_1.Op.between]: [from, to],
            },
            companyId: companyId,
        },
    });
    return logs.length != null
        ? res.status(200).send({ success: true, result: logs })
        : res.status(204).send({
            success: false,
            message: "No logs registered so far.",
        });
});
exports.findAllLogs = findAllLogs;
const findLogsByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const lgos = yield LogsModel_1.LogsModel.findAll({
        where: {
            companyId: id,
        },
    });
    return lgos != null
        ? res.status(200).send({ success: true, result: lgos })
        : res.status(204).send({
            success: false,
            result: "No logs found with the userId provided",
        });
});
exports.findLogsByCompany = findLogsByCompany;
const createLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { userId, companyId, description, userName, action } = req.body;
    const logs = yield LogsModel_1.LogsModel.create({
        companyId,
        userId,
        description,
        userName,
        action,
    });
    return logs != null
        ? res.status(200).send({ success: true, result: "Log added successfully." })
        : res.status(204).send({
            success: false,
            result: "There was an error adding the log.",
        });
});
exports.createLog = createLog;
