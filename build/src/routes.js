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
// LIQUIDAÇÃO TOTAL ATÓMICA — todas as prestações numa única sequelize.transaction
const TranzactionBulkController_1 = require("./controllers/TranzactionBulkController");
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
const LegalDocsController_1 = require("./controllers/LegalDocsController");
const OperatorLoanController_1 = require("./controllers/OperatorLoanController");
// FLUXO DE SUBSCRIÇÃO — cadastro público + painel Super Admin
const SuperAdminController_1 = require("./controllers/SuperAdminController");
// CAIXA DIÁRIO — rotas do módulo isolado de fluxo de caixa
const cashRoutes_1 = require("./routes/cashRoutes");
// CARTEIRA REAL — rotas das contas bancárias com saldo (FNB, BCI, BIM, ...)
const bankAccountRoutes_1 = require("./routes/bankAccountRoutes");
// AI BOT MAISMOLA — assistente read-only (Groq tool-calling)
const aiBotRoutes_1 = require("./routes/aiBotRoutes");
const NotificationController_1 = require("./controllers/NotificationController");
const DashboardController_1 = require("./controllers/DashboardController");
const checkCashRegisterOpen_1 = require("./middlewares/checkCashRegisterOpen");
const BMReportController_1 = require("./controllers/BMReportController");
// CARTEIRAS DE FINANCIAMENTO (dinheiro analítico) — CRUD + KPIs
const FinancingWalletController_1 = require("./controllers/FinancingWalletController");
// PORTAL DO PARCEIRO FINANCIADOR (userRole 4) — só leitura, só a sua carteira
const PartnerPortalController_1 = require("./controllers/PartnerPortalController");
// RELATÓRIOS DE FINANCIADOR + desagregação interna das carteiras
const FinancierReportController_1 = require("./controllers/FinancierReportController");
// RECIBOS com numeração sequencial legal (AT Moçambique)
const ReciboController_1 = require("./controllers/ReciboController");
const roles_1 = require("./middlewares/roles");
const ExcelExportController_1 = require("./controllers/ExcelExportController");
const routes = express_1.default.Router();
exports.routes = routes;
// CAIXA DIÁRIO — sub-router isolado (tabelas cash_registers / cash_movements)
routes.use(cashRoutes_1.cashRoutes);
// CARTEIRA REAL — sub-router das contas bancárias (accounts + bank_transactions)
routes.use(bankAccountRoutes_1.bankAccountRoutes);
// AI BOT — sub-router do assistente de IA (só leitura; identidade via JWT)
routes.use(aiBotRoutes_1.aiBotRoutes);
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
// Auto-cadastro público do mutuário (Login → criar conta)
routes.post("/api/customer/register", CustomerController_1.registerCustomer);
routes.post("/api/customer/changePassword", CustomerController_1.changeCustomerPassword);
// Customer Portal routes
routes.get("/api/portal/:companyId/:customerId/dashboard", CustomerPortalController_1.getCustomerDashboard);
routes.get("/api/portal/:companyId/:customerId/loan/:loanId", CustomerPortalController_1.getCustomerLoanDetail);
routes.post("/api/portal/:companyId/:customerId/payments", CustomerPortalController_1.registerPortalPayment);
// Comprovativo (recibo) de um pagamento — mesmo recibo legal usado pelo Admin.
// Emitido sob procura, para que TODOS os pagamentos tenham comprovativo.
routes.get("/api/portal/:companyId/:customerId/payments/:tranzactionId/recibo/pdf", CustomerPortalController_1.getCustomerPaymentReciboPdf);
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
// FLUXO DE SUBSCRIÇÃO — cadastro público (antes do middleware auth)
routes.post("/api/companies/register", SuperAdminController_1.registerCompany);
// Planos de subscrição — público (landing + registo de empresa)
routes.get("/api/subscription-plans", SuperAdminController_1.listPlans);
// Províncias e distritos públicos (usados no cadastro público da empresa)
routes.get("/api/provinces", ProvinceController_1.findAllProvinces);
routes.get("/api/districts", ProvinceController_1.findAllDistricts);
// TEMPORÁRIO: debug de empresas sem auth (remover em produção)
routes.get("/api/debug/companies", SuperAdminController_1.debugCompanies);
// VALIDAÇÃO PÚBLICA DO RECIBO — é o destino do QR Code impresso no documento,
// por isso não pode exigir sessão (tem de vir antes do middleware auth).
routes.get("/api/recibos/validar", ReciboController_1.validar);
// Middleware de autenticação — aplica-se apenas a rotas /api protegidas
routes.use("/api", auth_1.auth);
// SUPER ADMIN — aprovação de empresas (apenas userRole = 0)
routes.use("/api/super-admin", SuperAdminController_1.isSuperAdmin);
routes.get("/api/super-admin/companies", SuperAdminController_1.listCompanies);
routes.post("/api/super-admin/companies/:id/approve", SuperAdminController_1.approveCompany);
routes.post("/api/super-admin/companies/:id/reject", SuperAdminController_1.rejectCompany);
routes.post("/api/super-admin/companies/:id/suspend", SuperAdminController_1.suspendCompany);
routes.get("/api/super-admin/users", SuperAdminController_1.listSuperAdmins);
routes.post("/api/super-admin/users", SuperAdminController_1.createSuperAdmin);
routes.delete("/api/super-admin/users/:id", SuperAdminController_1.deleteSuperAdmin);
routes.get("/api/super-admin/plans", SuperAdminController_1.listPlans);
routes.post("/api/super-admin/plans", SuperAdminController_1.createPlan);
routes.put("/api/super-admin/plans/:id", SuperAdminController_1.updatePlan);
routes.delete("/api/super-admin/plans/:id", SuperAdminController_1.deactivatePlan);
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
// SIMULAÇÃO NO BACKEND — plano Price com a mesma função do desembolso
// (paridade garantida entre o simulador do frontend e o plano gravado).
routes.post("/api/loan/simulate", LoanController_1.simulateLoan);
routes.get("/api/loan/:id", LoanController_1.findLoanByCustomer);
// DOSSIÊ DO CRÉDITO (página de detalhe: pagamentos + recibos + prestações)
// DOCUMENTOS LEGAIS DO CRÉDITO (pdfkit no backend, layout do PDF oficial):
// contrato | termo | garantias | extracto
routes.get("/api/loans/:loanId/documents/:tipo/pdf", LegalDocsController_1.downloadLegalDoc);
routes.get("/api/loan/:id/detail", roles_1.isStaff, LoanController_1.loanDetail);
routes.get("/api/loan/amortization/:id", LoanController_1.getLoanAmortization);
routes.get("/api/loan/amortization/:id/:forfeit", LoanController_1.getLoanAmortization);
routes.get("/api/loan/findAllLoans/:id/:companyId", LoanController_1.findAllLoans);
routes.get("/api/loans/overview/:companyId", LoanController_1.findAllLoansOverview);
routes.put("/api/loan/:id/invalidate-disbursement", LoanController_1.invalidateDisbursedLoan);
routes.put("/api/loan/:id", LoanController_1.updateLoan);
routes.put("/api/loan/:id/update-dates", LoanController_1.updateLoanInstallmentDates);
routes.delete("/api/loan/:id", LoanController_1.destroyLoan);
routes.post("/api/loan", LoanController_1.createLoan);
// Documents Route
// CHECKLIST KYC — antes de /api/document/:id (mesmo nº de segmentos)
routes.get("/api/document/checklist/:accountNumber", CustomerDocumentController_1.getDocumentChecklist);
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
routes.get("/api/customers/:id/stats", CustomerController_1.getCustomersStats);
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
routes.get("/api/tranzaction/loan/:id/late-interest", TranzactionController_1.getLoanLateInterest);
routes.get("/api/tranzaction/:id", TranzactionController_1.getCustomerTranzactions);
routes.get("/api/monthllyTransactions/:id", TranzactionController_1.findTransactionsByCompany);
routes.get("/api/payments/:id/paginated", TranzactionController_1.findPaginatedTransactions);
routes.get("/api/payments/:companyId/all", TranzactionController_1.findAllPaymentsOverview);
routes.put("/api/tranzaction/:id", TranzactionController_1.updateTranzaction);
// Pagamento de prestação: exige caixa ABERTO hoje — movimentos ENTRADA
// (REEMBOLSO / JUROS_MORA / TAXA_ADMIN) são criados no controller.
routes.post("/api/tranzaction", checkCashRegisterOpen_1.checkCashRegisterOpen, TranzactionController_1.addTranzaction);
// LIQUIDAÇÃO TOTAL ATÓMICA — todas as prestações pendentes numa única
// transacção SQL; falha a uma → rollback de todas. Também exige caixa aberto.
routes.post("/api/tranzaction/bulk", checkCashRegisterOpen_1.checkCashRegisterOpen, TranzactionBulkController_1.addTranzactionBulk);
// Installments Routes
// POST createInstallmentsLoan = desembolso do crédito (cria plano + activa).
// Exige caixa ABERTO hoje — o movimento SAIDA/DESEMBOLSO é criado no controller.
routes.post("/api/createInstallmentsLoan/", checkCashRegisterOpen_1.checkCashRegisterOpen, AmortizationController_1.createAmortizationLoan);
routes.get("/api/getpastInstallments/:id", AmortizationController_1.getPastAmortizations);
routes.get("/api/getUpcomingInstallments/:id", AmortizationController_1.getUpcomingAmortizations);
// Controle de Prestações consolidado (nomes resolvidos no servidor, sem N+1)
routes.get("/api/installments/control/:companyId", AmortizationController_1.getInstallmentsControl);
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
// Download do Excel com bordas/fontes reais (cópia fiel do modelo)
routes.get("/api/reports/banco-mocambique/:companyId/excel", BMReportController_1.getBMReportExcel);
// Exportação de grelhas para Excel (estilos reais — mesmo padrão do relatório BM)
routes.post("/api/export/customers/excel", ExcelExportController_1.exportCustomersExcel);
routes.post("/api/export/loans/excel", ExcelExportController_1.exportLoansExcel);
routes.post("/api/export/payments/excel", ExcelExportController_1.exportPaymentsExcel);
routes.post("/api/export/installments/excel", ExcelExportController_1.exportInstallmentsExcel);
// ==================== CARTEIRAS DE FINANCIAMENTO (ANALÍTICAS) ====================
// Dinheiro ANALÍTICO (valores base + separação de relatórios por parceiro).
// O dinheiro REAL continua nas contas de tesouraria (accounts DESEMBOLSO/MISTO).
// Rotas específicas ANTES de /:id (evita "options"/"dashboard" como id).
routes.get("/api/wallets/:companyId/dashboard", FinancingWalletController_1.dashboard);
routes.get("/api/wallets/:companyId/options", FinancingWalletController_1.options);
routes.get("/api/wallets/:companyId/rates", FinancingWalletController_1.listRatesWithWallet);
routes.get("/api/wallets/:companyId/partner-users", roles_1.isAdmin, FinancingWalletController_1.listPartnerUsers);
// Créditos ainda sem carteira (antes de /:companyId/:id).
routes.get("/api/wallets/:companyId/unclassified-loans", roles_1.isAdmin, FinancingWalletController_1.unclassifiedLoans);
// Propostas de classificação automática (taxa de juro → carteira). Só propõe.
routes.get("/api/wallets/:companyId/classification-proposals", roles_1.isAdmin, FinancingWalletController_1.classificationProposals);
// Carteiras sem movimento que podem ser limpas (TESTE_* ou criadas há <7 dias).
routes.get("/api/wallets/:companyId/test-candidates", roles_1.isAdmin, FinancingWalletController_1.testCandidates);
// Dependências de UMA carteira — antes de /:companyId/:id (mesmo nº de segmentos).
routes.get("/api/wallets/:id/dependencies", roles_1.isAdmin, FinancingWalletController_1.dependencies);
routes.get("/api/wallets/:companyId/:id", FinancingWalletController_1.findOne);
routes.get("/api/wallets/:companyId", FinancingWalletController_1.findAll);
routes.post("/api/wallets", roles_1.isAdmin, FinancingWalletController_1.create);
// Limpar em lote as carteiras de teste (só Admin).
routes.post("/api/wallets/purge-test", roles_1.isAdmin, FinancingWalletController_1.purgeTest);
// Classificação retroativa de créditos antigos numa carteira de financiamento.
routes.post("/api/wallets/classify-loans", roles_1.isAdmin, FinancingWalletController_1.classifyLoans);
routes.post("/api/wallets/:id/deactivate", roles_1.isAdmin, FinancingWalletController_1.deactivate);
routes.put("/api/wallets/:id", roles_1.isAdmin, FinancingWalletController_1.update);
// DELETE apaga de facto — o controller recusa (409) se a carteira tiver movimento.
routes.delete("/api/wallets/:id", roles_1.isAdmin, FinancingWalletController_1.destroy);
// ==================== PARCEIROS FINANCIADORES (userRole 4) ====================
// Apenas o Admin da empresa cria/edita contas de parceiro, sempre ligadas a
// UMA carteira de financiamento com portal activo.
routes.post("/api/users/parceiros", roles_1.isAdmin, UserController_1.createPartner);
routes.put("/api/users/parceiros/:id", roles_1.isAdmin, UserController_1.updatePartner);
// ==================== RECIBOS (NUMERAÇÃO SEQUENCIAL LEGAL — AT) ====================
routes.post("/api/recibos/gerar/:tranzactionId", roles_1.isStaff, ReciboController_1.gerar);
routes.get("/api/recibos/loan/:loanId", roles_1.isStaff, ReciboController_1.byLoan);
routes.get("/api/recibos/customer/:customerId", roles_1.isStaff, ReciboController_1.byCustomer);
// A rota pública de validação (/api/recibos/validar) está registada antes do
// middleware de autenticação — ver bloco "VALIDAÇÃO PÚBLICA DO RECIBO".
routes.post("/api/recibos/lookup", roles_1.isStaff, ReciboController_1.lookup);
routes.post("/api/recibos/:id/enviar", roles_1.isStaff, ReciboController_1.enviar);
routes.get("/api/recibos/:id/pdf", roles_1.isStaff, ReciboController_1.pdf);
routes.get("/api/recibos/:id", roles_1.isStaff, ReciboController_1.findOne);
// ==================== RELATÓRIO DE FINANCIADOR (Admin) ====================
// Relatório isolado por carteira (desembolsos + recebimentos) com Excel e
// envio por e-mail ao parceiro. O relatório oficial do BM NÃO é alterado:
// continua consolidado, sem discriminar carteiras.
routes.get("/api/reports/financiadores/:companyId/:walletId/excel", FinancierReportController_1.getFinancierReportExcel);
routes.get("/api/reports/financiadores/:companyId/:walletId", FinancierReportController_1.getFinancierReport);
routes.post("/api/reports/financiadores/:companyId/:walletId/email", FinancierReportController_1.sendFinancierReportEmail);
// Desagregação por carteira — apenas para análise interna.
routes.get("/api/reports/wallets-breakdown/:companyId", FinancierReportController_1.getWalletsBreakdown);
// ==================== PORTAL DO PARCEIRO FINANCIADOR (userRole 4) ====================
// Todas as rotas exigem userRole 4 + carteira associada; a carteira é lida da
// base de dados (users.walletId) — o parceiro nunca escolhe a carteira.
routes.use("/api/partner", roles_1.isPartner);
routes.get("/api/partner/profile", PartnerPortalController_1.profile);
routes.get("/api/partner/dashboard", PartnerPortalController_1.dashboard);
routes.get("/api/partner/loans", PartnerPortalController_1.loans);
routes.get("/api/partner/installments", PartnerPortalController_1.installments);
routes.get("/api/partner/mora", PartnerPortalController_1.mora);
routes.get("/api/partner/transactions", PartnerPortalController_1.transactions);
routes.get("/api/partner/statement/excel", PartnerPortalController_1.statementExcel);
routes.get("/api/partner/statement", PartnerPortalController_1.statement);
routes.get("/api/partner/recibos/:id/pdf", PartnerPortalController_1.reciboPdf);
routes.get("/api/partner/recibos", PartnerPortalController_1.recibos);
