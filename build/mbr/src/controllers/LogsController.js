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
    try {
        const { from, to, companyId, limit } = req.query;
        const whereClause = {};
        if (companyId) {
            whereClause.companyId = companyId;
        }
        if (from && to) {
            whereClause.createdAt = {
                [sequelize_1.Op.between]: [
                    new Date(from),
                    new Date(to + "T23:59:59"),
                ],
            };
        }
        else if (from) {
            whereClause.createdAt = {
                [sequelize_1.Op.gte]: new Date(from),
            };
        }
        else if (to) {
            whereClause.createdAt = {
                [sequelize_1.Op.lte]: new Date(to + "T23:59:59"),
            };
        }
        const queryOptions = {
            where: whereClause,
            order: [["createdAt", "DESC"]],
        };
        if (limit) {
            const parsedLimit = parseInt(limit, 10);
            if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
                queryOptions.limit = parsedLimit;
            }
        }
        const logs = yield LogsModel_1.LogsModel.findAll(queryOptions);
        return res.status(200).send({ success: true, result: logs || [] });
    }
    catch (error) {
        return res.status(500).send({
            success: false,
            message: error.message || "Erro ao buscar logs.",
        });
    }
});
exports.findAllLogs = findAllLogs;
const findLogsByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { from, to } = req.query;
        const whereClause = { companyId: id };
        if (from && to) {
            whereClause.createdAt = {
                [sequelize_1.Op.between]: [
                    new Date(from),
                    new Date(to + "T23:59:59"),
                ],
            };
        }
        else if (from) {
            whereClause.createdAt = {
                [sequelize_1.Op.gte]: new Date(from),
            };
        }
        else if (to) {
            whereClause.createdAt = {
                [sequelize_1.Op.lte]: new Date(to + "T23:59:59"),
            };
        }
        const logs = yield LogsModel_1.LogsModel.findAll({
            where: whereClause,
            order: [["createdAt", "DESC"]],
        });
        return res.status(200).send({ success: true, result: logs });
    }
    catch (error) {
        return res.status(500).send({
            success: false,
            message: error.message || "Erro ao buscar logs.",
        });
    }
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
