"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
const express_1 = __importDefault(require("express"));
// import multer from "multer";
const UserController_1 = require("./controllers/UserController");
const CompanyController_1 = require("./controllers/CompanyController");
const CustomerController_1 = require("./controllers/CustomerController");
const AccountController_1 = require("./controllers/AccountController");
const DebtController_1 = require("./controllers/DebtController");
const TranzactionController_1 = require("./controllers/TranzactionController");
const InterestRateController_1 = require("./controllers/InterestRateController");
const CustomerDocumentController_1 = require("./controllers/CustomerDocumentController");
const LogsController_1 = require("./controllers/LogsController");
const LoanController_1 = require("./controllers/LoanController");
const GuaranteesController_1 = require("./controllers/GuaranteesController");
const MpesaPaymentController_1 = require("./controllers/MpesaPaymentController");
// import { multerConfig } from "./config/multer";
const auth_1 = require("./middlewares/auth");
const AmortizationController_1 = require("./controllers/AmortizationController");
const ProvinceController_1 = require("./controllers/ProvinceController");
const UserCredentials_1 = require("./controllers/UserCredentials");
const SmsController_1 = require("./controllers/SmsController");
const PdfController_1 = require("./controllers/PdfController");
const OperatorLoanController_1 = require("./controllers/OperatorLoanController");
const routes = express_1.default.Router();
exports.routes = routes;
// Front End Entry point
routes.get("/", (req, res) => res.sendFile(__dirname + "../../public/index.html"));
routes.get("/logo/:image", (req, res) => res.sendFile(__dirname + `../../uploads/img/${req.params.image}`));
routes.post("/api/userCredentials", UserCredentials_1.sendUserCredentials);
// Login Routes
routes.post("/api/login", UserController_1.loginUser);
routes.post("/api/customer/login", CustomerController_1.loginCustomer);
// Customer Contrats
routes.get("/contract/:companyId/:accountNumber/:loanId", PdfController_1.customerContract);
routes.get("/api/findAllSms", SmsController_1.findAllSms);
routes.get("/api/findSmsByCustomer/:id", SmsController_1.findSmsByCustomer);
routes.post("/api/sendSms", SmsController_1.sendSms);
routes.get("/api/debt", DebtController_1.findAllDebts);
routes.get("/api/debt/:id", DebtController_1.findAllDebts);
routes.post("/api/debt", DebtController_1.createDebt);
routes.delete("/api/debt", DebtController_1.deleteDebtp);
routes.put("/api/mpesa/receive", MpesaPaymentController_1.c2Business);
routes.post("/api/mpesa/send", MpesaPaymentController_1.b2Customer);
// routes.post(
//   "/api/upload",
//   multer(multerConfig).single("file"),
//   (req: Request, res: Response) => {
//     const fileName = req.file?.filename;
//     return fileName != null
//       ? res.json({ success: true, imageUrl: fileName })
//       : res.json({
//           success: false,
//           message: "Houve um erro no envio da imagem.",
//         });
//   }
// );
routes.get("/api/download/:id", (req, res) => {
    const fileName = req.params.id;
    return fileName != null
        ? res.sendFile(__dirname + `/uploads/${fileName}`)
        : res.json({
            success: false,
            message: "Arquivo não encontrado.",
        });
});
// User Routes
routes.use(auth_1.auth);
routes.post("/api/users", UserController_1.create);
routes.post("/api/updatePassword", UserController_1.changeUserPassword);
routes.get("/api/usersAll/:id", UserController_1.findAll);
routes.get("/api/users/:id", UserController_1.findOne);
routes.put("/api/users/:id", UserController_1.update);
routes.delete("/api/users/:id", UserController_1.destroy);
// Loans Route
routes.get("/api/loan/:id", LoanController_1.findLoanByCustomer);
routes.get("/api/loan/amortization/:id/:forfeit", LoanController_1.getLoanAmortization);
routes.get("/api/loan/findAllLoans/:id/:companyId", LoanController_1.findAllLoans);
routes.put("/api/loan/:id", LoanController_1.updateLoan);
routes.delete("/api/loan/:id", LoanController_1.destroyLoan);
routes.post("/api/loan", LoanController_1.createLoan);
// Documents Route
routes.get("/api/document", CustomerDocumentController_1.findAllDocuments);
routes.get("/api/document/:id", CustomerDocumentController_1.getCustomerDocuments);
routes.put("/api/document/:id", CustomerDocumentController_1.updateDocument);
routes.delete("/api/document/:id", CustomerDocumentController_1.deleteDocument);
routes.post("/api/document", CustomerDocumentController_1.createDocument);
// Logs Routes
routes.get("/api/logs", LogsController_1.findAllLogs);
routes.get("/api/logs/:id", LogsController_1.findLogsByCompany);
routes.post("/api/logs", LogsController_1.createLog);
// Company Routes
routes.get("/api/company", CompanyController_1.findAllCompanies);
routes.get("/api/company/:id", CompanyController_1.findOneCompany);
routes.put("/api/company/:id", CompanyController_1.updateCompany);
routes.post("/api/company", CompanyController_1.createCompany);
// InterestRates Routes
routes.get("/api/rate", InterestRateController_1.findAllInterestRates);
routes.get("/api/rate/:id", InterestRateController_1.findInterestRateByCompany);
routes.put("/api/rate/:id", InterestRateController_1.updateRate);
routes.delete("/api/rate/:id", InterestRateController_1.destroyRate);
routes.post("/api/rate", InterestRateController_1.createRate);
// Customer Routes
routes.get("/api/customers/:id", CustomerController_1.findAllCustomers);
routes.get("/api/customer/:id", CustomerController_1.findOneCustomer);
routes.get("/api/searchCustomers/:search", CustomerController_1.searchCustomers);
routes.put("/api/customer/:id", CustomerController_1.updateCustomer);
routes.delete("/api/customer/:id", CustomerController_1.deleteCustomer);
routes.post("/api/customer", CustomerController_1.createCustomer);
// Account Routes
routes.get("/api/accounts/:id", AccountController_1.findAllaccounts);
routes.get("/api/account/:id", AccountController_1.findOneAccount);
routes.put("/api/account/:id", AccountController_1.updateAccount);
routes.delete("/api/account/:id", AccountController_1.deleteAccount);
routes.post("/api/account", AccountController_1.createAccount);
// Tranzaction Routes
routes.get("/api/tranzaction", TranzactionController_1.findAlltranzactions);
routes.get("/api/tranzaction/:id", TranzactionController_1.getCustomerTranzactions);
routes.put("/api/tranzaction/:id", TranzactionController_1.updateTranzaction);
routes.post("/api/tranzaction", TranzactionController_1.addTranzaction);
// Installments Routes
routes.get("/api/getpastInstallments/:id", AmortizationController_1.getPastAmortizations);
routes.get("/api/getUpcomingInstallments/:id", AmortizationController_1.getUpcomingAmortizations);
routes.post("/api/createInstallmentsLoan/", AmortizationController_1.createAmortizationLoan);
// Amortization Routes
routes.get("/api/provinces", ProvinceController_1.findAllProvinces);
routes.get("/api/districts", ProvinceController_1.findAllDistricts);
// Guarantees Routes
routes.get("/api/getLoanGuarantees/:id", GuaranteesController_1.getAllLoanGuarantees);
routes.post("/api/createGuarantee", GuaranteesController_1.createGuarantee);
routes.delete("/api/deleteGuarantee/:id", GuaranteesController_1.deleteGuarantee);
// Company Loans Router
routes.get("/api/companyLoans/:companyId", OperatorLoanController_1.companyLoans);
