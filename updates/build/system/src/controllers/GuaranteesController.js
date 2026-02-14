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
exports.deleteGuarantee = exports.createGuarantee = exports.getAllLoanGuarantees = void 0;
const GuarateeAssessmentModel_1 = require("../database/models/GuarateeAssessmentModel");
const getAllLoanGuarantees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const guarantees = yield GuarateeAssessmentModel_1.GuarateeAssessmentModel.findAll({
        where: {
            loanId: id,
        },
        order: [["id", "DESC"]],
    });
    return guarantees.length > 0
        ? res.status(200).send({ success: true, result: guarantees })
        : res
            .status(200)
            .send({ success: false, message: "No guarantees registered so far." });
});
exports.getAllLoanGuarantees = getAllLoanGuarantees;
const createGuarantee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { loanId, purchaseAmount, guaranteeDescription, guaranteeFileUrl, status } = req.body;
    const newGuarantee = yield GuarateeAssessmentModel_1.GuarateeAssessmentModel.create({
        loanId,
        purchaseAmount,
        guaranteeDescription,
        guaranteeFileUrl,
        status
    });
    newGuarantee != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "A garantia foi gravada com sucesso.",
        }))
        : res.status(500).send(JSON.stringify({
            success: false,
            message: "There was an error saving the guarantee.",
        }));
});
exports.createGuarantee = createGuarantee;
const deleteGuarantee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const deleteGuarantee = yield GuarateeAssessmentModel_1.GuarateeAssessmentModel.destroy({ where: { id: id } });
    return deleteGuarantee != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "Guarantee deleted successfully.",
        }))
        : res.status(500).send(JSON.stringify({
            success: false,
            message: "There was an error deleting this guarantee.",
        }));
});
exports.deleteGuarantee = deleteGuarantee;
