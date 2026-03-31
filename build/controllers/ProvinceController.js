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
exports.findAllDistricts = exports.findAllProvinces = void 0;
const ProvinceModel_1 = require("../database/models/ProvinceModel");
const DistrictModel_1 = require("../database/models/DistrictModel");
const findAllProvinces = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const provinces = yield ProvinceModel_1.ProvinceModel.findAll({
        order: [["id", "ASC"]],
    });
    return provinces.length > 0
        ? res.status(200).send({ success: true, result: provinces })
        : res.status(204).send({
            success: false,
            message: "No provinces registered so far.",
        });
});
exports.findAllProvinces = findAllProvinces;
const findAllDistricts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const districts = yield DistrictModel_1.DistrictModel.findAll({
        order: [["name", "ASC"]],
    });
    return districts
        ? res.status(200).send({ success: true, result: districts })
        : res.status(204).send({
            success: false,
            result: "No districts found with the ID provided",
        });
});
exports.findAllDistricts = findAllDistricts;
