import express, { request } from "express";
import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

// Determina a raiz do projecto (mesma lógica de app.ts)
const isCompiled = __dirname.includes(path.sep + "build" + path.sep) || __dirname.endsWith(path.sep + "build");
const projectRoot = isCompiled
  ? path.join(__dirname, "..", "..")
  : path.join(__dirname, "..");

import {
  create,
  createPartner,
  updatePartner,
  findAll,
  findOne,
  destroy,
  update,
  loginUser,
  changeUserPassword,
  refreshToken,
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
  bulkCreateCustomers,
  updateCustomer,
  deleteCustomer,
  loginCustomer,
  changeCustomerPassword,
  getAllCustomerNames,
  setCustomerPassword,
  registerCustomer,
  getCustomersStats,
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
  findAllPaymentsOverview,
  getCustomerTranzactions,
  getLoanLateInterest,
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
  getDocumentChecklist,
  createDocument,
  updateDocument,
  deleteDocument,
} from "./controllers/CustomerDocumentController";

import {
  findAllLogs,
  findLogsByCompany,
  createLog,
  deleteLogs,
} from "./controllers/LogsController";

import {
  findAllLoans,
  findAllLoansOverview,
  createLoan,
  destroyLoan,
  findLoanByCustomer,
  getLoanAmortization,
  loanDetail,
  invalidateDisbursedLoan,
  updateLoan,
  updateLoanInstallmentDates,
  simulateLoan,
} from "./controllers/LoanController";

// LIQUIDAÇÃO TOTAL ATÓMICA — todas as prestações numa única sequelize.transaction
import { addTranzactionBulk } from "./controllers/TranzactionBulkController";

import { getAllLoanGuarantees, createGuarantee, deleteGuarantee } from "./controllers/GuaranteesController"

import { b2Customer, c2Business } from "./controllers/MpesaPaymentController";

import { multerConfig } from "./config/multer";
import { auth } from "./middlewares/auth";
import {
  getPastAmortizations,
  getUpcomingAmortizations,
  createAmortizationLoan,
  getInstallmentsControl
} from "./controllers/AmortizationController";

import {
  findAllDistricts,
  findAllProvinces,
} from "./controllers/ProvinceController";
import { sendUserCredentials } from "./controllers/UserCredentials";

import { sendSms, findAllSms, findSmsByCustomer } from "./controllers/SmsController";
import {
  enqueueLateInterestAlerts,
  enqueueSmsAnnouncement,
  deleteQueuedSms,
  enqueueSmsManually,
  enqueueUpcomingAlerts,
  getPendingSmsGateway,
  getPendingCredentialsSms,
  getSmsQueueSummary,
  getSmsQueueHistory,
  processSmsQueueHandler,
  requeueCredentialSms,
  syncSmsInbox,
  updateGatewaySmsStatus,
} from "./controllers/SmsGatewayController";
import { sendWhatsApp, listWhatsApp } from "./controllers/WhatsAppController";
import {
  getCustomerDashboard,
  getCustomerLoanDetail,
  registerPortalPayment,
  getCustomerPaymentReciboPdf,
  sendCustomerCredentials,
  requestCustomerLoan,
} from "./controllers/CustomerPortalController";

import { customerContract } from "./controllers/PdfController";
import { downloadLegalDoc } from "./controllers/LegalDocsController";
import { companyLoans, companyLoansPaginated } from "./controllers/OperatorLoanController";

// FLUXO DE SUBSCRIÇÃO — cadastro público + painel Super Admin
import {
  registerCompany,
  listCompanies,
  approveCompany,
  rejectCompany,
  suspendCompany,
  isSuperAdmin,
  debugCompanies,
  listSuperAdmins,
  createSuperAdmin,
  deleteSuperAdmin,
  listPlans,
  createPlan,
  updatePlan,
  deactivatePlan,
} from "./controllers/SuperAdminController";

// CAIXA DIÁRIO — rotas do módulo isolado de fluxo de caixa
import { cashRoutes } from "./routes/cashRoutes";
// CARTEIRA REAL — rotas das contas bancárias com saldo (FNB, BCI, BIM, ...)
import { bankAccountRoutes } from "./routes/bankAccountRoutes";
// AI BOT MAISMOLA — assistente read-only (Groq tool-calling)
import { aiBotRoutes } from "./routes/aiBotRoutes";

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
import { getDashboardOverview } from "./controllers/DashboardController";
import { checkCashRegisterOpen } from "./middlewares/checkCashRegisterOpen";
import { getBMReport, getBMReportExcel } from "./controllers/BMReportController";

// CARTEIRAS DE FINANCIAMENTO (dinheiro analítico) — CRUD + KPIs
import {
  findAll as findAllWallets,
  dashboard as walletsDashboard,
  findOne as findOneWallet,
  create as createWallet,
  update as updateWallet,
  destroy as destroyWallet,
  deactivate as deactivateWallet,
  dependencies as walletDependencies,
  unclassifiedLoans as walletUnclassifiedLoans,
  classificationProposals as walletClassificationProposals,
  classifyLoans as walletClassifyLoans,
  purgeTest as purgeTestWallets,
  testCandidates as walletTestCandidates,
  options as walletOptions,
  listRatesWithWallet,
  listPartnerUsers,
} from "./controllers/FinancingWalletController";

// PORTAL DO PARCEIRO FINANCIADOR (userRole 4) — só leitura, só a sua carteira
import {
  profile as partnerProfile,
  dashboard as partnerDashboard,
  loans as partnerLoans,
  installments as partnerInstallments,
  mora as partnerMora,
  transactions as partnerTransactions,
  statement as partnerStatement,
  statementExcel as partnerStatementExcel,
  recibos as partnerRecibos,
  reciboPdf as partnerReciboPdf,
} from "./controllers/PartnerPortalController";

// RELATÓRIOS DE FINANCIADOR + desagregação interna das carteiras
import {
  getFinancierReport,
  getFinancierReportExcel,
  sendFinancierReportEmail,
  getWalletsBreakdown,
} from "./controllers/FinancierReportController";

// RECIBOS com numeração sequencial legal (AT Moçambique)
import {
  gerar as gerarRecibo,
  byLoan as recibosByLoan,
  byCustomer as recibosByCustomer,
  findOne as findRecibo,
  pdf as reciboPdf,
  validar as validarRecibo,
  enviar as enviarRecibo,
  lookup as lookupRecibos,
} from "./controllers/ReciboController";

import { isAdmin, isPartner, isStaff } from "./middlewares/roles";
import { exportCustomersExcel, exportLoansExcel, exportPaymentsExcel, exportInstallmentsExcel } from "./controllers/ExcelExportController";


const routes = express.Router();

// CAIXA DIÁRIO — sub-router isolado (tabelas cash_registers / cash_movements)
routes.use(cashRoutes);
// CARTEIRA REAL — sub-router das contas bancárias (accounts + bank_transactions)
routes.use(bankAccountRoutes);
// AI BOT — sub-router do assistente de IA (só leitura; identidade via JWT)
routes.use(aiBotRoutes);
const documentUpload = multer(multerConfig).single("file");

routes.get("/logo/:image", (req: Request, res: Response) => {
  // Suporta tanto "filename" como "/documents/filename"
  const raw = req.params.image || '';
  const fileName = path.basename(raw);
  // Primeiro tenta uploads/img, depois uploads/documents
  const imgPath = path.join(projectRoot, 'uploads', 'img', fileName);
  const docPath = path.join(projectRoot, 'uploads', 'documents', fileName);
  if (fs.existsSync(imgPath)) return res.sendFile(imgPath);
  if (fs.existsSync(docPath)) return res.sendFile(docPath);
  return res.status(404).json({ success: false, message: 'Logo não encontrado.' });
});

// Rota para servir documentos (fotos de garantias, logotipos, etc.)
routes.get("/documents/:fileName", (req: Request, res: Response) => {
  const safeFileName = path.basename(req.params.fileName);
  const filePath = path.join(projectRoot, 'uploads', 'documents', safeFileName);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  return res.status(404).json({ success: false, message: 'Ficheiro não encontrado.' });
});

routes.post("/api/userCredentials", sendUserCredentials);
// Login Routes
routes.post("/api/login", loginUser);
routes.post("/api/auth/refresh", refreshToken);
routes.post("/api/customer/login", loginCustomer);
// Auto-cadastro público do mutuário (Login → criar conta)
routes.post("/api/customer/register", registerCustomer);
routes.post("/api/customer/changePassword", changeCustomerPassword);

// Customer Portal routes
routes.get("/api/portal/:companyId/:customerId/dashboard", getCustomerDashboard);
routes.get("/api/portal/:companyId/:customerId/loan/:loanId", getCustomerLoanDetail);
routes.post("/api/portal/:companyId/:customerId/payments", registerPortalPayment);
// Comprovativo (recibo) de um pagamento — mesmo recibo legal usado pelo Admin.
// Emitido sob procura, para que TODOS os pagamentos tenham comprovativo.
routes.get(
  "/api/portal/:companyId/:customerId/payments/:tranzactionId/recibo/pdf",
  getCustomerPaymentReciboPdf
);
routes.post("/api/portal/send-credentials", sendCustomerCredentials);
routes.post("/api/portal/:companyId/:customerId/loans/request", requestCustomerLoan);

// Customer Contrats
routes.get("/contract/:companyId/:accountNumber/:loanId", customerContract)

routes.get("/api/findAllSms", findAllSms);
routes.get("/api/findSmsByCustomer/:id", findSmsByCustomer);
routes.post("/api/sendSms", sendSms);

// WhatsApp routes
routes.post("/api/whatsapp/send", sendWhatsApp);
routes.get("/api/whatsapp/messages", listWhatsApp);

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
routes.post("/api/upload", documentUpload, (req: Request, res: Response) => {
  const fileName = req.file?.filename;

  return fileName != null
    ? res.status(201).json({
        success: true,
        imageUrl: fileName, // compatibilidade com frontend legado
        fileName,
        documentFileUrl: `/documents/${fileName}`,
      })
    : res.status(400).json({
        success: false,
        message: "Houve um erro no envio do arquivo.",
      });
});

routes.get("/api/download/:id", (req: Request, res: Response) => {
  const fileName = req.params.id;

  return fileName != null
    ? res.sendFile(path.join(projectRoot, "uploads", fileName))
    : res.json({
      success: false,
      message: "Arquivo não encontrado.",
    });
});

// Documento público para abertura em nova aba sem header Authorization
routes.get("/api/document/file/:fileName", (req: Request, res: Response) => {
  const safeFileName = path.basename(req.params.fileName);
  return res.sendFile(path.join(projectRoot, "uploads", "documents", safeFileName));
});

// FLUXO DE SUBSCRIÇÃO — cadastro público (antes do middleware auth)
routes.post("/api/companies/register", registerCompany);
// Planos de subscrição — público (landing + registo de empresa)
routes.get("/api/subscription-plans", listPlans);
// Províncias e distritos públicos (usados no cadastro público da empresa)
routes.get("/api/provinces", findAllProvinces);
routes.get("/api/districts", findAllDistricts);
// TEMPORÁRIO: debug de empresas sem auth (remover em produção)
routes.get("/api/debug/companies", debugCompanies);
// VALIDAÇÃO PÚBLICA DO RECIBO — é o destino do QR Code impresso no documento,
// por isso não pode exigir sessão (tem de vir antes do middleware auth).
routes.get("/api/recibos/validar", validarRecibo);

// Middleware de autenticação — aplica-se apenas a rotas /api protegidas
routes.use("/api", auth);

// SUPER ADMIN — aprovação de empresas (apenas userRole = 0)
routes.use("/api/super-admin", isSuperAdmin);
routes.get("/api/super-admin/companies", listCompanies);
routes.post("/api/super-admin/companies/:id/approve", approveCompany);
routes.post("/api/super-admin/companies/:id/reject", rejectCompany);
routes.post("/api/super-admin/companies/:id/suspend", suspendCompany);
routes.get("/api/super-admin/users", listSuperAdmins);
routes.post("/api/super-admin/users", createSuperAdmin);
routes.delete("/api/super-admin/users/:id", deleteSuperAdmin);
routes.get("/api/super-admin/plans", listPlans);
routes.post("/api/super-admin/plans", createPlan);
routes.put("/api/super-admin/plans/:id", updatePlan);
routes.delete("/api/super-admin/plans/:id", deactivatePlan);
routes.get("/api/sms-gateway/pending", getPendingSmsGateway);
routes.patch("/api/sms-gateway/:id/status", updateGatewaySmsStatus);
routes.post("/api/sms-gateway/enqueue", enqueueSmsManually);
routes.post("/api/sms-gateway/process", processSmsQueueHandler);
routes.post("/api/sms-gateway/announcements", enqueueSmsAnnouncement);
routes.post("/api/sms-gateway/alerts/upcoming", enqueueUpcomingAlerts);
routes.post("/api/sms-gateway/alerts/late-interest", enqueueLateInterestAlerts);
routes.post("/api/sms-gateway/inbox/sync", syncSmsInbox);
routes.get("/api/sms-gateway/history", getSmsQueueHistory);
routes.get("/api/sms-gateway/summary", getSmsQueueSummary);
routes.get("/api/sms-gateway/pending-credentials", getPendingCredentialsSms);  routes.post("/api/sms-gateway/pending-credentials/:id/requeue", requeueCredentialSms);
  routes.delete("/api/sms-gateway/:id", deleteQueuedSms);
routes.post("/api/users", create);
routes.post("/api/updatePassword", changeUserPassword);
routes.get("/api/usersAll/:id", findAll);
routes.get("/api/users/:id", findOne);
routes.put("/api/users/:id", update);
routes.delete("/api/users/:id", destroy);

// Loans Route
// SIMULAÇÃO NO BACKEND — plano Price com a mesma função do desembolso
// (paridade garantida entre o simulador do frontend e o plano gravado).
routes.post("/api/loan/simulate", simulateLoan);
routes.get("/api/loan/:id", findLoanByCustomer);
// DOSSIÊ DO CRÉDITO (página de detalhe: pagamentos + recibos + prestações)
// DOCUMENTOS LEGAIS DO CRÉDITO (pdfkit no backend, layout do PDF oficial):
// contrato | termo | garantias | extracto
routes.get("/api/loans/:loanId/documents/:tipo/pdf", downloadLegalDoc);
routes.get("/api/loan/:id/detail", isStaff, loanDetail);
routes.get("/api/loan/amortization/:id", getLoanAmortization);
routes.get("/api/loan/amortization/:id/:forfeit", getLoanAmortization);
routes.get("/api/loan/findAllLoans/:id/:companyId", findAllLoans);
routes.get("/api/loans/overview/:companyId", findAllLoansOverview);
routes.put("/api/loan/:id/invalidate-disbursement", invalidateDisbursedLoan);
routes.put("/api/loan/:id", updateLoan);
routes.put("/api/loan/:id/update-dates", updateLoanInstallmentDates);
routes.delete("/api/loan/:id", destroyLoan);
routes.post("/api/loan", createLoan);

// Documents Route
// CHECKLIST KYC — antes de /api/document/:id (mesmo nº de segmentos)
routes.get("/api/document/checklist/:accountNumber", getDocumentChecklist);
routes.get("/api/document", findAllDocuments);
routes.get("/api/document/:id", getCustomerDocuments);
routes.put("/api/document/:id", documentUpload, updateDocument);
routes.delete("/api/document/:id", deleteDocument);
routes.post("/api/document", documentUpload, createDocument);
routes.post("/api/document/upload", documentUpload, (req: Request, res: Response) => {
  const fileName = req.file?.filename;
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
routes.get("/api/logs", findAllLogs);
routes.get("/api/logs/:id", findLogsByCompany);
routes.post("/api/logs", createLog);
routes.delete("/api/logs", deleteLogs);

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
routes.get("/api/customers/:id/names", getAllCustomerNames);
routes.get("/api/customers/:id/stats", getCustomersStats);
routes.get("/api/customers/:id", findAllCustomers);
routes.get("/api/customer/:id", findOneCustomer);
routes.get("/api/searchCustomers/:search", searchCustomers);
routes.put("/api/customer/:id", updateCustomer);
routes.delete("/api/customer/:id", deleteCustomer);
routes.post("/api/customer/bulk", bulkCreateCustomers);
routes.post("/api/customer", createCustomer);
routes.post("/api/customer/set-password", setCustomerPassword);

// Account Routes
routes.get("/api/accounts/:id", findAllaccounts);
routes.get("/api/account/:id", findOneAccount);
routes.put("/api/account/:id", updateAccount);
routes.delete("/api/account/:id", deleteAccount);
routes.post("/api/account", createAccount);

// Tranzaction Routes
routes.get("/api/tranzaction", findAlltranzactions);
routes.get("/api/tranzaction/loan/:id/late-interest", getLoanLateInterest);
routes.get("/api/tranzaction/:id", getCustomerTranzactions);
routes.get("/api/monthllyTransactions/:id", findTransactionsByCompany);
routes.get("/api/payments/:id/paginated", findPaginatedTransactions);
routes.get("/api/payments/:companyId/all", findAllPaymentsOverview);
routes.put("/api/tranzaction/:id", updateTranzaction);
// Pagamento de prestação: exige caixa ABERTO hoje — movimentos ENTRADA
// (REEMBOLSO / JUROS_MORA / TAXA_ADMIN) são criados no controller.
routes.post("/api/tranzaction", checkCashRegisterOpen, addTranzaction);
// LIQUIDAÇÃO TOTAL ATÓMICA — todas as prestações pendentes numa única
// transacção SQL; falha a uma → rollback de todas. Também exige caixa aberto.
routes.post("/api/tranzaction/bulk", checkCashRegisterOpen, addTranzactionBulk);

// Installments Routes
// POST createInstallmentsLoan = desembolso do crédito (cria plano + activa).
// Exige caixa ABERTO hoje — o movimento SAIDA/DESEMBOLSO é criado no controller.
routes.post("/api/createInstallmentsLoan/", checkCashRegisterOpen, createAmortizationLoan);
routes.get("/api/getpastInstallments/:id", getPastAmortizations);
routes.get("/api/getUpcomingInstallments/:id", getUpcomingAmortizations);
// Controle de Prestações consolidado (nomes resolvidos no servidor, sem N+1)
routes.get("/api/installments/control/:companyId", getInstallmentsControl);

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

// Dashboard agregado (KPIs, PAR, risco e alertas)
routes.get("/api/dashboard/:companyId", getDashboardOverview);

// Relatório Banco de Moçambique
routes.get("/api/reports/banco-mocambique/:companyId", getBMReport);
// Download do Excel com bordas/fontes reais (cópia fiel do modelo)
routes.get("/api/reports/banco-mocambique/:companyId/excel", getBMReportExcel);

// Exportação de grelhas para Excel (estilos reais — mesmo padrão do relatório BM)
routes.post("/api/export/customers/excel", exportCustomersExcel);
routes.post("/api/export/loans/excel", exportLoansExcel);
routes.post("/api/export/payments/excel", exportPaymentsExcel);
routes.post("/api/export/installments/excel", exportInstallmentsExcel);

// ==================== CARTEIRAS DE FINANCIAMENTO (ANALÍTICAS) ====================
// Dinheiro ANALÍTICO (valores base + separação de relatórios por parceiro).
// O dinheiro REAL continua nas contas de tesouraria (accounts DESEMBOLSO/MISTO).
// Rotas específicas ANTES de /:id (evita "options"/"dashboard" como id).
routes.get("/api/wallets/:companyId/dashboard", walletsDashboard);
routes.get("/api/wallets/:companyId/options", walletOptions);
routes.get("/api/wallets/:companyId/rates", listRatesWithWallet);
routes.get("/api/wallets/:companyId/partner-users", isAdmin, listPartnerUsers);
// Créditos ainda sem carteira (antes de /:companyId/:id).
routes.get("/api/wallets/:companyId/unclassified-loans", isAdmin, walletUnclassifiedLoans);
// Propostas de classificação automática (taxa de juro → carteira). Só propõe.
routes.get("/api/wallets/:companyId/classification-proposals", isAdmin, walletClassificationProposals);
// Carteiras sem movimento que podem ser limpas (TESTE_* ou criadas há <7 dias).
routes.get("/api/wallets/:companyId/test-candidates", isAdmin, walletTestCandidates);
// Dependências de UMA carteira — antes de /:companyId/:id (mesmo nº de segmentos).
routes.get("/api/wallets/:id/dependencies", isAdmin, walletDependencies);
routes.get("/api/wallets/:companyId/:id", findOneWallet);
routes.get("/api/wallets/:companyId", findAllWallets);
routes.post("/api/wallets", isAdmin, createWallet);
// Limpar em lote as carteiras de teste (só Admin).
routes.post("/api/wallets/purge-test", isAdmin, purgeTestWallets);
// Classificação retroativa de créditos antigos numa carteira de financiamento.
routes.post("/api/wallets/classify-loans", isAdmin, walletClassifyLoans);
routes.post("/api/wallets/:id/deactivate", isAdmin, deactivateWallet);
routes.put("/api/wallets/:id", isAdmin, updateWallet);
// DELETE apaga de facto — o controller recusa (409) se a carteira tiver movimento.
routes.delete("/api/wallets/:id", isAdmin, destroyWallet);

// ==================== PARCEIROS FINANCIADORES (userRole 4) ====================
// Apenas o Admin da empresa cria/edita contas de parceiro, sempre ligadas a
// UMA carteira de financiamento com portal activo.
routes.post("/api/users/parceiros", isAdmin, createPartner);
routes.put("/api/users/parceiros/:id", isAdmin, updatePartner);

// ==================== RECIBOS (NUMERAÇÃO SEQUENCIAL LEGAL — AT) ====================
routes.post("/api/recibos/gerar/:tranzactionId", isStaff, gerarRecibo);
routes.get("/api/recibos/loan/:loanId", isStaff, recibosByLoan);
routes.get("/api/recibos/customer/:customerId", isStaff, recibosByCustomer);
// A rota pública de validação (/api/recibos/validar) está registada antes do
// middleware de autenticação — ver bloco "VALIDAÇÃO PÚBLICA DO RECIBO".
routes.post("/api/recibos/lookup", isStaff, lookupRecibos);
routes.post("/api/recibos/:id/enviar", isStaff, enviarRecibo);
routes.get("/api/recibos/:id/pdf", isStaff, reciboPdf);
routes.get("/api/recibos/:id", isStaff, findRecibo);

// ==================== RELATÓRIO DE FINANCIADOR (Admin) ====================
// Relatório isolado por carteira (desembolsos + recebimentos) com Excel e
// envio por e-mail ao parceiro. O relatório oficial do BM NÃO é alterado:
// continua consolidado, sem discriminar carteiras.
routes.get("/api/reports/financiadores/:companyId/:walletId/excel", getFinancierReportExcel);
routes.get("/api/reports/financiadores/:companyId/:walletId", getFinancierReport);
routes.post("/api/reports/financiadores/:companyId/:walletId/email", sendFinancierReportEmail);
// Desagregação por carteira — apenas para análise interna.
routes.get("/api/reports/wallets-breakdown/:companyId", getWalletsBreakdown);

// ==================== PORTAL DO PARCEIRO FINANCIADOR (userRole 4) ====================
// Todas as rotas exigem userRole 4 + carteira associada; a carteira é lida da
// base de dados (users.walletId) — o parceiro nunca escolhe a carteira.
routes.use("/api/partner", isPartner);
routes.get("/api/partner/profile", partnerProfile);
routes.get("/api/partner/dashboard", partnerDashboard);
routes.get("/api/partner/loans", partnerLoans);
routes.get("/api/partner/installments", partnerInstallments);
routes.get("/api/partner/mora", partnerMora);
routes.get("/api/partner/transactions", partnerTransactions);
routes.get("/api/partner/statement/excel", partnerStatementExcel);
routes.get("/api/partner/statement", partnerStatement);
routes.get("/api/partner/recibos/:id/pdf", partnerReciboPdf);
routes.get("/api/partner/recibos", partnerRecibos);



export { routes };
