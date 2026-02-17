import express, { request } from "express";
import { Request, Response } from "express";
import path from "path";
// import multer from "multer";

// Determina a raiz do projecto (mesma lógica de app.ts)
const isCompiled = __dirname.includes(path.sep + "build" + path.sep) || __dirname.endsWith(path.sep + "build");
const projectRoot = isCompiled
  ? path.join(__dirname, "..", "..")
  : path.join(__dirname, "..");

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
  findPaginatedTransactions,
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
import { companyLoans, companyLoansPaginated } from "./controllers/OperatorLoanController";

import {
  getNotifications,
  getUnreadCount,
  getCustomerNotifications,
  getCustomerUnreadCount,
  createNotification,
  createBulkNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "./controllers/NotificationController";

const routes = express.Router();

routes.get("/logo/:image", (req: Request, res: Response) =>
  res.sendFile(path.join(projectRoot, "uploads", "img", req.params.image))
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

// Notification Routes (públicas para o portal do cliente)
routes.get("/api/notifications/customer/:companyId/:customerId", getCustomerNotifications);
routes.get("/api/notifications/customer/unread/:companyId/:customerId", getCustomerUnreadCount);
routes.put("/api/notifications/read/:id", markAsRead);
routes.put("/api/notifications/customer/markAllRead/:companyId/:customerId", markAllAsRead);

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
    ? res.sendFile(path.join(projectRoot, "uploads", fileName))
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
routes.get("/api/payments/:id/paginated", findPaginatedTransactions);
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
routes.get("/api/companyLoans/:companyId/paginated", companyLoansPaginated)

// Notification Routes (protegidas para admin/gestor)
routes.get("/api/notifications/:companyId", getNotifications);
routes.get("/api/notifications/unread/:companyId", getUnreadCount);
routes.post("/api/notifications", createNotification);
routes.post("/api/notifications/bulk", createBulkNotifications);
routes.put("/api/notifications/markAllRead/:companyId", markAllAsRead);
routes.delete("/api/notifications/:id", deleteNotification);

export { routes };
