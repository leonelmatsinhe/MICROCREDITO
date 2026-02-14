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
exports.createReport = void 0;
const googleapis_1 = require("googleapis");
function getAuthSheets() {
    return __awaiter(this, void 0, void 0, function* () {
        const auth = new googleapis_1.google.auth.GoogleAuth({
            keyFile: "../utils/credentials.json",
            scopes: "https://www.googleapis.com/auth/spreadsheets"
        });
        const client = yield auth.getClient();
        const googleSheets = googleapis_1.google.sheets({
            version: "v4",
            auth: client
        });
        const spreadsheetId = "1CNDqVLrXBIRp_P2oZgorEh-90tbIzQLD4uXqVCE6Yec";
        return {
            auth,
            client,
            googleSheets,
            spreadsheetId
        };
    });
}
const createReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { accountHolder, accountDescription, accountNumber, createdBy, companyId } = req.body;
});
exports.createReport = createReport;
