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
exports.c2Business = exports.b2Customer = void 0;
const mpesa_node_api_1 = __importDefault(require("mpesa-node-api"));
const b2Customer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { to, transaction, amount, reference } = req.body;
    mpesa_node_api_1.default
        .initiate_b2c(amount, to, transaction, reference)
        .then(function (response) {
        console.log(response);
        return res.send(JSON.stringify({ success: true, result: response }));
    })
        .catch(function (error) {
        console.log(error);
        return res.send(JSON.stringify({ success: false, result: error }));
    });
});
exports.b2Customer = b2Customer;
const c2Business = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { from, transaction, amount, reference } = req.body;
    mpesa_node_api_1.default
        .initiate_c2b(amount, from, transaction, reference)
        .then(function (response) {
        console.log(response);
        return res.send(JSON.stringify({ success: true, result: response }));
    })
        .catch(function (error) {
        console.log(error);
        return res.send(JSON.stringify({ success: false, result: error }));
    });
});
exports.c2Business = c2Business;
