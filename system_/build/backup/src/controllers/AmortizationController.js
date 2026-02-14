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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPastAmortizations = exports.getUpcomingAmortizations = void 0;
const moment_1 = __importDefault(require("moment"));
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const sequelize_1 = require("sequelize");
const endOfMonth = (0, moment_1.default)().format("YYYY-MM-") + (0, moment_1.default)().daysInMonth();
// 2022-10-28 17:41:11
const today = (0, moment_1.default)().format("YYYY-MM-DD HH:mm:ss");
const thirtyDaysBefore = (0, moment_1.default)().subtract(30, "days").toDate();
console.log("DATA_CONFIG", today);
const getUpcomingAmortizations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const loans = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: {
            dueDate: {
                [sequelize_1.Op.between]: [today, endOfMonth],
            },
            companyId: id,
        },
    });
    return loans != null
        ? res.status(200).send({ success: true, result: loans })
        : res.status(204).send({
            success: false,
            result: "No loan found with the account number you provided",
        });
});
exports.getUpcomingAmortizations = getUpcomingAmortizations;
const getPastAmortizations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const pastAmortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
        where: {
            dueDate: {
                [sequelize_1.Op.lt]: today,
                // [Op.gt]: thirtyDaysBefore,
            },
            companyId: id,
        },
    });
    return pastAmortizations != null
        ? res.status(200).send({ success: true, result: pastAmortizations })
        : res.status(204).send({
            success: false,
            result: "No loan found with the account number you provided",
        });
});
exports.getPastAmortizations = getPastAmortizations;
