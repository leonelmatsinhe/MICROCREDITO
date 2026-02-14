import express, { request } from "express";
import { Request, Response } from "express";
import path from "path";
// import multer from "multer";

import {
  create,
  findAll,
  findOne,
  destroy,
  update,
  loginUser,
  changeUserPassword,
} from "./controllers/UserController";

import {
  findAllCompanies,
  findOneCompany,
  createCompany,
  updateCompany,
} from "./controllers/CompanyController";

import {
  findAllCustomers,
  searchCustomers,
  findOneCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  loginCustomer,
  changeCustomerPassword,
} from "./controllers/CustomerController";

import {
  findAllaccounts,
  findOneAccount,
  createAccount,
  updateAccount,
  deleteAccount,
} from "./controllers/AccountController";

import {
  findAllDebts,
  createDebt,
  updateDebt,
  deleteDebtp,
} from "./controllers/DebtController";

import {
  findAlltranzactions,
  findTransactionsByCompany,
  getCustomerTranzactions,
  addTranzaction,
  updateTranzaction,
} from "./controllers/TranzactionController";

import {
  findAllInterestRates,
  findInterestRateByCompany,
  createRate,
  updateRate,
  destroyRate,
} from "./controllers/InterestRateController";

import {
  findAllDocuments,
  getCustomerDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from "./controllers/CustomerDocumentController";

import {
  findAllLogs,
  findLogsByCompany,
  createLog,
} from "./controllers/LogsController";

import {
  findAllLoans,
  createLoan,
  destroyLoan,
  findLoanByCustomer,
  getLoanAmortization,
  updateLoan,
} from "./controllers/LoanController";

import { getAllLoanGuarantees, createGuarantee, deleteGuarantee } from "./controllers/GuaranteesController"

import { b2Customer, c2Business } from "./controllers/MpesaPaymentController";

// import { multerConfig } from "./config/multer";
import { auth } from "./middlewares/auth";
import {
  getPastAmortizations,
  getUpcomingAmortizations,
  createAmortizationLoan
} from "./controllers/AmortizationController";

import {
  findAllDistricts,
  findAllProvinces,
} from "./controllers/ProvinceController";
import { sendUserCredentials } from "./controllers/UserCredentials";

import { sendSms, findAllSms, findSmsByCustomer } from "./controllers/SmsController";

import { customerContract } from "./controllers/PdfController";
import { companyLoans } from "./controllers/OperatorLoanController";

const routes = express.Router();

// Front End Entry point
routes.get("/", (req: Request, res: Response) =>
  res.sendFile(path.join(__dirname, "..", "..", "public", "index.html"))
);

routes.get("/logo/:image", (req: Request, res: Response) =>
  res.sendFile(path.join(__dirname, "..", "..", "uploads", "img", req.params.image))
);

routes.post("/api/userCredentials", sendUserCredentials);
// Login Routes
routes.post("/api/login", loginUser);
routes.post("/api/customer/login", loginCustomer);
routes.post("/api/customer/changePassword", changeCustomerPassword);

// Customer Contrats
routes.get("/contract/:companyId/:accountNumber/:loanId", customerContract)

routes.get("/api/findAllSms", findAllSms);
routes.get("/api/findSmsByCustomer/:id", findSmsByCustomer);
routes.post("/api/sendSms", sendSms);

routes.get("/api/debt", findAllDebts);
routes.get("/api/debt/:id", findAllDebts);
routes.post("/api/debt", createDebt);
routes.delete("/api/debt", deleteDebtp);

routes.put("/api/mpesa/receive", c2Business);
routes.post("/api/mpesa/send", b2Customer);

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

routes.get("/api/download/:id", (req: Request, res: Response) => {
  const fileName = req.params.id;

  return fileName != null
    ? res.sendFile(path.join(__dirname, "..", "..", "uploads", fileName))
    : res.json({
      success: false,
      message: "Arquivo não encontrado.",
    });
});

// User Routes
routes.use(auth);
routes.post("/api/users", create);
routes.post("/api/updatePassword", changeUserPassword);
routes.get("/api/usersAll/:id", findAll);
routes.get("/api/users/:id", findOne);
routes.put("/api/users/:id", update);
routes.delete("/api/users/:id", destroy);

// Loans Route
routes.get("/api/loan/:id", findLoanByCustomer);
routes.get("/api/loan/amortization/:id", getLoanAmortization);
routes.get("/api/loan/amortization/:id/:forfeit", getLoanAmortization);
routes.get("/api/loan/findAllLoans/:id/:companyId", findAllLoans);
routes.put("/api/loan/:id", updateLoan);
routes.delete("/api/loan/:id", destroyLoan);
routes.post("/api/loan", createLoan);

// Documents Route
routes.get("/api/document", findAllDocuments);
routes.get("/api/document/:id", getCustomerDocuments);
routes.put("/api/document/:id", updateDocument);
routes.delete("/api/document/:id", deleteDocument);
routes.post("/api/document", createDocument);

// Logs Routes
routes.get("/api/logs", findAllLogs);
routes.get("/api/logs/:id", findLogsByCompany);
routes.post("/api/logs", createLog);

// Company Routes
routes.get("/api/company", findAllCompanies);
routes.get("/api/company/:id", findOneCompany);
routes.put("/api/company/:id", updateCompany);
routes.post("/api/company", createCompany);

// InterestRates Routes
routes.get("/api/rate", findAllInterestRates);
routes.get("/api/rate/:id", findInterestRateByCompany);
routes.put("/api/rate/:id", updateRate);
routes.delete("/api/rate/:id", destroyRate);
routes.post("/api/rate", createRate);

// Customer Routes
routes.get("/api/customers/:id", findAllCustomers);
routes.get("/api/customer/:id", findOneCustomer);
routes.get("/api/searchCustomers/:search", searchCustomers);
routes.put("/api/customer/:id", updateCustomer);
routes.delete("/api/customer/:id", deleteCustomer);
routes.post("/api/customer", createCustomer);

// Account Routes
routes.get("/api/accounts/:id", findAllaccounts);
routes.get("/api/account/:id", findOneAccount);
routes.put("/api/account/:id", updateAccount);
routes.delete("/api/account/:id", deleteAccount);
routes.post("/api/account", createAccount);

// Tranzaction Routes
routes.get("/api/tranzaction", findAlltranzactions);
routes.get("/api/tranzaction/:id", getCustomerTranzactions);
routes.get("/api/monthllyTransactions/:id", findTransactionsByCompany);
routes.put("/api/tranzaction/:id", updateTranzaction);
routes.post("/api/tranzaction", addTranzaction);

// Installments Routes
routes.get("/api/getpastInstallments/:id", getPastAmortizations);
routes.get("/api/getUpcomingInstallments/:id", getUpcomingAmortizations);
routes.post("/api/createInstallmentsLoan/", createAmortizationLoan);

// Amortization Routes
routes.get("/api/provinces", findAllProvinces);
routes.get("/api/districts", findAllDistricts);

// Guarantees Routes
routes.get("/api/getLoanGuarantees/:id", getAllLoanGuarantees);
routes.post("/api/createGuarantee", createGuarantee);
routes.delete("/api/deleteGuarantee/:id", deleteGuarantee);
// Company Loans Router
routes.get("/api/companyLoans/:companyId", companyLoans)

export { routes };
