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
exports.generateContrat = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const moment_1 = __importDefault(require("moment"));
moment_1.default.locale("pt-br");
const compile = function (templateName, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = path_1.default.join(process.cwd(), "templates", `${templateName}.hbs`);
        const html = yield fs_extra_1.default.readFile(filePath, "utf-8");
        return handlebars_1.default.compile(html)(data);
    });
};
handlebars_1.default.registerHelper("dateFormat", function (value, format) {
    console.log("formatting", value, format);
    return (0, moment_1.default)(value).format(format).toUpperCase();
});
const generateContrat = (company, customer, amortization) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const browser = yield puppeteer_1.default.launch({ headless: true });
        const page = yield browser.newPage();
        const content = yield compile("invoice", {
            company,
            customer,
            amortization
        });
        yield page.setContent(content);
        yield page.emulateMediaType("screen");
        yield page.pdf({
            path: `./uploads/docs/${customer.accountNumber}.pdf`,
            format: "A4",
            printBackground: true,
        });
        console.log("Done generating invoice.");
        yield browser.close();
        return true;
    }
    catch (e) {
        console.log("There was an error generating the invoice.", e);
        return false;
    }
});
exports.generateContrat = generateContrat;
