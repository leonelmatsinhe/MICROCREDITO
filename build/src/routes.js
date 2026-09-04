"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
// Determina a raiz do projecto (mesma lógica de app.ts)
const isCompiled = __dirname.includes(path_1.default.sep + "build" + path_1.default.sep) || __dirname.endsWith(path_1.default.sep + "build");
const projectRoot = isCompiled
    ? path_1.default.join(__dirname, "..", "..")
    : path_1.default.join(__dirname, "..");
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
const multer_2 = require("./config/multer");
const auth_1 = require("./middlewares/auth");
const AmortizationController_1 = require("./controllers/AmortizationController");
const ProvinceController_1 = require("./controllers/ProvinceController");
const UserCredentials_1 = require("./controllers/UserCredentials");
const SmsController_1 = require("./controllers/SmsController");
const SmsGatewayController_1 = require("./controllers/SmsGatewayController");
const WhatsAppController_1 = require("./controllers/WhatsAppController");
const CustomerPortalController_1 = require("./controllers/CustomerPortalController");
const PdfController_1 = require("./controllers/PdfController");
const OperatorLoanController_1 = require("./controllers/OperatorLoanController");
const NotificationController_1 = require("./controllers/NotificationController");
const DashboardController_1 = require("./controllers/DashboardController");
const BMReportController_1 = require("./controllers/BMReportController");
const routes = express_1.default.Router();
exports.routes = routes;
const documentUpload = (0, multer_1.default)(multer_2.multerConfig).single("file");
routes.get("/logo/:image", (req, res) => {
    // Suporta tanto "filename" como "/documents/filename"
    const raw = req.params.image || '';
    const fileName = path_1.default.basename(raw);
    // Primeiro tenta uploads/img, depois uploads/documents
    const imgPath = path_1.default.join(projectRoot, 'uploads', 'img', fileName);
    const docPath = path_1.default.join(projectRoot, 'uploads', 'documents', fileName);
    if (fs_1.default.existsSync(imgPath))
        return res.sendFile(imgPath);
    if (fs_1.default.existsSync(docPath))
        return res.sendFile(docPath);
    return res.status(404).json({ success: false, message: 'Logo não encontrado.' });
});
// Rota para servir documentos (fotos de garantias, logotipos, etc.)
routes.get("/documents/:fileName", (req, res) => {
    const safeFileName = path_1.default.basename(req.params.fileName);
    const filePath = path_1.default.join(projectRoot, 'uploads', 'documents', safeFileName);
    if (fs_1.default.existsSync(filePath))
        return res.sendFile(filePath);
    return res.status(404).json({ success: false, message: 'Ficheiro não encontrado.' });
});
routes.post("/api/userCredentials", UserCredentials_1.sendUserCredentials);
// Login Routes
routes.post("/api/login", UserController_1.loginUser);
routes.post("/api/auth/refresh", UserController_1.refreshToken);
routes.post("/api/customer/login", CustomerController_1.loginCustomer);
routes.post("/api/customer/changePassword", CustomerController_1.changeCustomerPassword);
// Customer Portal routes
routes.get("/api/portal/:companyId/:customerId/dashboard", CustomerPortalController_1.getCustomerDashboard);
routes.get("/api/portal/:companyId/:customerId/loan/:loanId", CustomerPortalController_1.getCustomerLoanDetail);
routes.post("/api/portal/:companyId/:customerId/payments", CustomerPortalController_1.registerPortalPayment);
routes.post("/api/portal/send-credentials", CustomerPortalController_1.sendCustomerCredentials);
routes.post("/api/portal/:companyId/:customerId/loans/request", CustomerPortalController_1.requestCustomerLoan);
// Customer Contrats
routes.get("/contract/:companyId/:accountNumber/:loanId", PdfController_1.customerContract);
routes.get("/api/findAllSms", SmsController_1.findAllSms);
routes.get("/api/findSmsByCustomer/:id", SmsController_1.findSmsByCustomer);
routes.post("/api/sendSms", SmsController_1.sendSms);
// WhatsApp routes
routes.post("/api/whatsapp/send", WhatsAppController_1.sendWhatsApp);
routes.get("/api/whatsapp/messages", WhatsAppController_1.listWhatsApp);
routes.get("/api/debt", DebtController_1.findAllDebts);
routes.get("/api/debt/:id", DebtController_1.findAllDebts);
routes.post("/api/debt", DebtController_1.createDebt);
routes.delete("/api/debt", DebtController_1.deleteDebtp);
routes.put("/api/mpesa/receive", MpesaPaymentController_1.c2Business);
routes.post("/api/mpesa/send", MpesaPaymentController_1.b2Customer);
// Notification Routes (públicas para o portal do cliente)
routes.get("/api/notifications/customer/:companyId/:customerId", NotificationController_1.getCustomerNotifications);
routes.get("/api/notifications/customer/unread/:companyId/:customerId", NotificationController_1.getCustomerUnreadCount);
routes.put("/api/notifications/read/:id", NotificationController_1.markAsRead);
routes.put("/api/notifications/customer/markAllRead/:companyId/:customerId", NotificationController_1.markAllAsRead);
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
routes.post("/api/upload", documentUpload, (req, res) => {
    var _a;
    const fileName = (_a = req.file) === null || _a === void 0 ? void 0 : _a.filename;
    return fileName != null
        ? res.status(201).json({
            success: true,
            imageUrl: fileName,
            fileName,
            documentFileUrl: `/documents/${fileName}`,
        })
        : res.status(400).json({
            success: false,
            message: "Houve um erro no envio do arquivo.",
        });
});
routes.get("/api/download/:id", (req, res) => {
    const fileName = req.params.id;
    return fileName != null
        ? res.sendFile(path_1.default.join(projectRoot, "uploads", fileName))
        : res.json({
            success: false,
            message: "Arquivo não encontrado.",
        });
});
// Documento público para abertura em nova aba sem header Authorization
routes.get("/api/document/file/:fileName", (req, res) => {
    const safeFileName = path_1.default.basename(req.params.fileName);
    return res.sendFile(path_1.default.join(projectRoot, "uploads", "documents", safeFileName));
});
// Middleware de autenticação — aplica-se apenas a rotas /api protegidas
routes.use("/api", auth_1.auth);
routes.get("/api/sms-gateway/pending", SmsGatewayController_1.getPendingSmsGateway);
routes.patch("/api/sms-gateway/:id/status", SmsGatewayController_1.updateGatewaySmsStatus);
routes.post("/api/sms-gateway/enqueue", SmsGatewayController_1.enqueueSmsManually);
routes.post("/api/sms-gateway/process", SmsGatewayController_1.processSmsQueueHandler);
routes.post("/api/sms-gateway/announcements", SmsGatewayController_1.enqueueSmsAnnouncement);
routes.post("/api/sms-gateway/alerts/upcoming", SmsGatewayController_1.enqueueUpcomingAlerts);
routes.post("/api/sms-gateway/alerts/late-interest", SmsGatewayController_1.enqueueLateInterestAlerts);
routes.post("/api/sms-gateway/inbox/sync", SmsGatewayController_1.syncSmsInbox);
routes.get("/api/sms-gateway/history", SmsGatewayController_1.getSmsQueueHistory);
routes.get("/api/sms-gateway/summary", SmsGatewayController_1.getSmsQueueSummary);
routes.get("/api/sms-gateway/pending-credentials", SmsGatewayController_1.getPendingCredentialsSms);
routes.post("/api/sms-gateway/pending-credentials/:id/requeue", SmsGatewayController_1.requeueCredentialSms);
routes.delete("/api/sms-gateway/:id", SmsGatewayController_1.deleteQueuedSms);
routes.post("/api/users", UserController_1.create);
routes.post("/api/updatePassword", UserController_1.changeUserPassword);
routes.get("/api/usersAll/:id", UserController_1.findAll);
routes.get("/api/users/:id", UserController_1.findOne);
routes.put("/api/users/:id", UserController_1.update);
routes.delete("/api/users/:id", UserController_1.destroy);
// Loans Route
routes.get("/api/loan/:id", LoanController_1.findLoanByCustomer);
routes.get("/api/loan/amortization/:id", LoanController_1.getLoanAmortization);
routes.get("/api/loan/amortization/:id/:forfeit", LoanController_1.getLoanAmortization);
routes.get("/api/loan/findAllLoans/:id/:companyId", LoanController_1.findAllLoans);
routes.get("/api/loans/overview/:companyId", LoanController_1.findAllLoansOverview);
routes.put("/api/loan/:id", LoanController_1.updateLoan);
routes.put("/api/loan/:id/update-dates", LoanController_1.updateLoanInstallmentDates);
routes.delete("/api/loan/:id", LoanController_1.destroyLoan);
routes.post("/api/loan", LoanController_1.createLoan);
// Documents Route
routes.get("/api/document", CustomerDocumentController_1.findAllDocuments);
routes.get("/api/document/:id", CustomerDocumentController_1.getCustomerDocuments);
routes.put("/api/document/:id", documentUpload, CustomerDocumentController_1.updateDocument);
routes.delete("/api/document/:id", CustomerDocumentController_1.deleteDocument);
routes.post("/api/document", documentUpload, CustomerDocumentController_1.createDocument);
routes.post("/api/document/upload", documentUpload, (req, res) => {
    var _a;
    const fileName = (_a = req.file) === null || _a === void 0 ? void 0 : _a.filename;
    if (!fileName) {
        return res.status(400).json({
            success: false,
            message: "Ficheiro não enviado.",
        });
    }
    return res.status(201).json({
        success: true,
        fileName,
        documentFileUrl: `/documents/${fileName}`,
    });
});
// Logs Routes
routes.get("/api/logs", LogsController_1.findAllLogs);
routes.get("/api/logs/:id", LogsController_1.findLogsByCompany);
routes.post("/api/logs", LogsController_1.createLog);
routes.delete("/api/logs", LogsController_1.deleteLogs);
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
routes.get("/api/customers/:id/names", CustomerController_1.getAllCustomerNames);
routes.get("/api/customers/:id", CustomerController_1.findAllCustomers);
routes.get("/api/customer/:id", CustomerController_1.findOneCustomer);
routes.get("/api/searchCustomers/:search", CustomerController_1.searchCustomers);
routes.put("/api/customer/:id", CustomerController_1.updateCustomer);
routes.delete("/api/customer/:id", CustomerController_1.deleteCustomer);
routes.post("/api/customer/bulk", CustomerController_1.bulkCreateCustomers);
routes.post("/api/customer", CustomerController_1.createCustomer);
routes.post("/api/customer/set-password", CustomerController_1.setCustomerPassword);
// Account Routes
routes.get("/api/accounts/:id", AccountController_1.findAllaccounts);
routes.get("/api/account/:id", AccountController_1.findOneAccount);
routes.put("/api/account/:id", AccountController_1.updateAccount);
routes.delete("/api/account/:id", AccountController_1.deleteAccount);
routes.post("/api/account", AccountController_1.createAccount);
// Tranzaction Routes
routes.get("/api/tranzaction", TranzactionController_1.findAlltranzactions);
routes.get("/api/tranzaction/:id", TranzactionController_1.getCustomerTranzactions);
routes.get("/api/monthllyTransactions/:id", TranzactionController_1.findTransactionsByCompany);
routes.get("/api/payments/:id/paginated", TranzactionController_1.findPaginatedTransactions);
routes.get("/api/payments/:companyId/all", TranzactionController_1.findAllPaymentsOverview);
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
routes.get("/api/companyLoans/:companyId/paginated", OperatorLoanController_1.companyLoansPaginated);
// Notification Routes (protegidas para admin/gestor)
routes.get("/api/notifications/:companyId", NotificationController_1.getNotifications);
routes.get("/api/notifications/unread/:companyId", NotificationController_1.getUnreadCount);
routes.post("/api/notifications", NotificationController_1.createNotification);
routes.post("/api/notifications/bulk", NotificationController_1.createBulkNotifications);
routes.put("/api/notifications/markAllRead/:companyId", NotificationController_1.markAllAsRead);
routes.delete("/api/notifications/:id", NotificationController_1.deleteNotification);
// Dashboard agregado (KPIs, PAR, risco e alertas)
routes.get("/api/dashboard/:companyId", DashboardController_1.getDashboardOverview);
// Relatório Banco de Moçambique
routes.get("/api/reports/banco-mocambique/:companyId", BMReportController_1.getBMReport);
