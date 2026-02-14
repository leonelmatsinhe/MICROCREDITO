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
exports.destroyRate = exports.updateRate = exports.createRate = exports.findInterestRateByCompany = exports.findAllInterestRates = void 0;
const InterestRateModel_1 = require("../database/models/InterestRateModel");
const findAllInterestRates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const rates = yield InterestRateModel_1.InterestRateModel.findAll();
    return rates.length != null
        ? res.status(200).send({ success: true, result: rates })
        : res.status(204).send({
            success: false,
            message: "No rates registered so far.",
        });
});
exports.findAllInterestRates = findAllInterestRates;
const findInterestRateByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const interest = yield InterestRateModel_1.InterestRateModel.findAll({
        where: {
            companyId: id,
        },
        order: [["id", "DESC"]],
    });
    return interest != null
        ? res.status(200).send({ success: true, result: interest })
        : res.status(204).send({
            success: false,
            result: "No rates found with the ID provided",
        });
});
exports.findInterestRateByCompany = findInterestRateByCompany;
const createRate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { name, tax, administrativeFee, companyId } = req.body;
    const rates = yield InterestRateModel_1.InterestRateModel.create({
        companyId,
        name,
        tax,
        administrativeFee,
    });
    return rates != null
        ? res
            .status(200)
            .send({ success: true, result: "Interest rate created successfully." })
        : res.status(204).send({
            success: false,
            result: "There was an error creating the rate.",
        });
});
exports.createRate = createRate;
const updateRate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const rate = yield InterestRateModel_1.InterestRateModel.update(req.body, {
        where: {
            id,
        },
    });
    return rate != null
        ? res
            .status(200)
            .json({ success: true, message: "Rate updated successfully" })
        : res.status(204).json({
            success: true,
            message: "There was an error updating the rate.",
        });
});
exports.updateRate = updateRate;
const destroyRate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const deleteRate = yield InterestRateModel_1.InterestRateModel.destroy({ where: { id: id } });
    return deleteRate != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "Interest rate deleted successfully.",
        }))
        : res.status(204).send(JSON.stringify({
            success: false,
            message: "There was an error deleting this rate.",
        }));
});
exports.destroyRate = destroyRate;
