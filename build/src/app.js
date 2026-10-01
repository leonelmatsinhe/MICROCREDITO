"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
require("./config/env");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const routes_1 = require("./routes");
const migrations_1 = require("./migrations");
const CompanyModel_1 = require("./database/models/CompanyModel");
require("./database/associations");
const SmsGatewayService_1 = require("./services/SmsGatewayService");
const overdueCollectionSmsService_1 = require("./services/overdueCollectionSmsService");
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const body_parser_1 = __importDefault(require("body-parser"));
// Express 4 não captura erros de handlers async — um erro não tratado numa rota
// derrubava o processo inteiro em silêncio (sem log útil). Estes handlers
// registam o erro e mantêm o servidor vivo.
process.on("unhandledRejection", (reason) => {
    console.error("[UNHANDLED_REJECTION] Erro não tratado numa rota:", reason instanceof Error ? reason.stack || reason.message : reason);
});
process.on("uncaughtException", (error) => {
    console.error("[UNCAUGHT_EXCEPTION]", (error === null || error === void 0 ? void 0 : error.stack) || error);
});
const app = (0, express_1.default)();
const isCompiled = __dirname.includes(path_1.default.sep + "build" + path_1.default.sep) || __dirname.endsWith(path_1.default.sep + "build");
const projectRoot = isCompiled
    ? path_1.default.join(__dirname, "..", "..")
    : path_1.default.join(__dirname, "..");
// Frontend: servir de public-v2 (Quasar/Vue 3)
const publicDir = process.env.PUBLIC_DIR
    || path_1.default.join(projectRoot, "public-v2");
// Uploads
const uploadsDir = process.env.UPLOADS_DIR
    || path_1.default.join(projectRoot, "uploads");
app.use(body_parser_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use(body_parser_1.default.json({ limit: "10mb" }));
app.use(express_1.default.static(uploadsDir));
app.use(express_1.default.static(publicDir));
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(routes_1.routes);
// SPA catch-all: serve index.html for any non-API route
app.get("*", (req, res) => {
    res.sendFile(path_1.default.join(publicDir, "index.html"));
});
// Number() em vez de comparação directa: env vars são strings, e "0" é truthy —
// num Windows com PORT=0 no ambiente do sistema, o servidor ficava à escuta na
// porta 0 (porta aleatória do SO) e o frontend deixava de o encontrar.
const PORT = Number(process.env.PORT) || 4000;
const bootstrap = () => __awaiter(void 0, void 0, void 0, function* () {
    // Migrações de schema: aplicadas ANTES de aceitar pedidos, em todos os
    // arranques (local, PM2, Ubuntu). Idempotentes — ver src/migrations.
    try {
        const migrationResult = yield (0, migrations_1.runMigrations)();
        console.log(`[Migration] ${migrationResult.applied} aplicadas, ${migrationResult.skipped} já existentes, ${migrationResult.errors.length} erros.`);
        if (migrationResult.errors.length > 0) {
            console.error("[Migration] Erros (o servidor arranca na mesma):", migrationResult.errors);
        }
    }
    catch (error) {
        console.error("[Migration] Falha ao aplicar migrações:", (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    app.listen(PORT, () => {
        console.log(`MBR Server is running on PORT ${PORT}`);
        // JOBS DO MÓDULO DE PAGAMENTOS V2 — accrual diário de mora (late_accruals)
        // na janela 00:05 com catch-up horário idempotente (INSERT IGNORE por dia).
        Promise.resolve().then(() => __importStar(require("./jobs/paymentJobsIndex"))).then(({ startPaymentJobs }) => startPaymentJobs())
            .catch((jobsError) => console.error("[Jobs] Falha ao arrancar jobs de pagamentos:", (jobsError === null || jobsError === void 0 ? void 0 : jobsError.message) || jobsError));
        // MIGRAÇÃO DE RECIBOS — recibos antigos (pré-backend-authoritative) sem
        // pdf_path ganham PDF gerado no servidor (pdfkit), uma vez por arranque.
        Promise.resolve().then(() => __importStar(require("./jobs/regenerateOldReceipts"))).then(({ startReciboMigrationJob }) => startReciboMigrationJob())
            .catch((jobError) => console.error("[Jobs] Falha ao arrancar migração de recibos:", (jobError === null || jobError === void 0 ? void 0 : jobError.message) || jobError));
        // PACOTE DE CONCESSÃO — backfill: créditos desembolsados sem pacote
        // (desembolsados antes da funcionalidade) ganham o pacote imutável.
        Promise.resolve().then(() => __importStar(require("./services/concessionPackageService"))).then(({ generateMissingPackages }) => setTimeout(() => {
            generateMissingPackages(25).then((n) => console.log(`[Concessao] Backfill: ${n} pacote(s) gerado(s)`)).catch((e) => console.error("[Concessao] Backfill falhou:", (e === null || e === void 0 ? void 0 : e.message) || e));
        }, 40 * 1000))
            .catch((jobError) => console.error("[Jobs] Falha ao arrancar backfill de concessão:", (jobError === null || jobError === void 0 ? void 0 : jobError.message) || jobError));
        // Fila de SMS (BulkSMM): processar mensagens pendentes a cada 60s.
        // Sem BULKSMS_API_KEY no .env, a fila permanece intacta (sem efeitos).
        setInterval(() => {
            (0, SmsGatewayService_1.processSmsQueue)({ limit: 100 }).catch((error) => {
                console.error("[SMS] Erro ao processar a fila:", (error === null || error === void 0 ? void 0 : error.message) || error);
            });
        }, 60000);
        console.log("[SMS] Fila de SMS activa (BulkSMM) — a cada 60s");
        // Alertas automáticos: prestações a vencer (3 dias) + juros de mora em atraso,
        // para todas as empresas. Enfileira 30s após o arranque e depois de 6 em 6 horas.
        // As funções já evitam duplicados (mesma prestação/dívida só entra uma vez).
        const runAutomaticSmsAlerts = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const companies = (yield CompanyModel_1.CompanyModel.findAll({
                    attributes: ["id"],
                }));
                for (const company of companies) {
                    const companyId = Number(company.id);
                    yield (0, SmsGatewayService_1.enqueueUpcomingInstallmentAlerts)({ companyId, daysAhead: 3 });
                    yield (0, SmsGatewayService_1.enqueueOutstandingLateInterestAlerts)({ companyId, limit: 200 });
                }
                (0, SmsGatewayService_1.flushSmsQueue)(200);
                console.log(`[SMS] Alertas automáticos enfileirados para ${companies.length} empresa(s)`);
            }
            catch (error) {
                console.error("[SMS] Erro nos alertas automáticos:", (error === null || error === void 0 ? void 0 : error.message) || error);
            }
        });
        setTimeout(runAutomaticSmsAlerts, 30 * 1000);
        setInterval(runAutomaticSmsAlerts, 6 * 60 * 60 * 1000);
        console.log("[SMS] Alertas automáticos activos — 30s após arranque e de 6 em 6h");
        // SMS DE COBRANÇA POR ATRASO — job diário (ranking de atrasos do AI Bot).
        // Corre 1x por dia às 07:00 (fuso do servidor) e 1x 60s após o arranque
        // (catch-up de servidores reiniciados). Anti-duplicação: 1 SMS por
        // cliente/dia — verificação na fila antes de criar.
        const scheduleNextOverdueRun = () => {
            const now = new Date();
            const next = new Date(now);
            next.setHours(7, 0, 0, 0);
            if (next <= now)
                next.setDate(next.getDate() + 1);
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield runOverdueCollectionJob();
                scheduleNextOverdueRun(); // reagenda para o dia seguinte
            }), next.getTime() - now.getTime());
        };
        const runOverdueCollectionJob = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const companies = (yield CompanyModel_1.CompanyModel.findAll({ attributes: ["id"] }));
                yield (0, overdueCollectionSmsService_1.runDailyOverdueCollectionSms)(companies.map((c) => Number(c.id)));
                (0, SmsGatewayService_1.flushSmsQueue)(200);
            }
            catch (error) {
                console.error("[SMS Cobranca] Erro no job diário:", (error === null || error === void 0 ? void 0 : error.message) || error);
            }
        });
        setTimeout(runOverdueCollectionJob, 60 * 1000);
        scheduleNextOverdueRun();
        console.log("[SMS Cobranca] Job diário activo — 07:00 e catch-up no arranque");
    });
});
bootstrap();
