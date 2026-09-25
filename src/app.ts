import "./config/env";
import express, { json } from "express";
import path from "path";
import fs from "fs";
import { routes } from "./routes";
import { runMigrations } from "./migrations";
import { CompanyModel } from "./database/models/CompanyModel";
import "./database/associations";
import {
  processSmsQueue,
  enqueueUpcomingInstallmentAlerts,
  enqueueOutstandingLateInterestAlerts,
  flushSmsQueue,
} from "./services/SmsGatewayService";
import { runDailyOverdueCollectionSms } from "./services/overdueCollectionSmsService";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";

// Express 4 não captura erros de handlers async — um erro não tratado numa rota
// derrubava o processo inteiro em silêncio (sem log útil). Estes handlers
// registam o erro e mantêm o servidor vivo.
process.on("unhandledRejection", (reason: any) => {
  console.error(
    "[UNHANDLED_REJECTION] Erro não tratado numa rota:",
    reason instanceof Error ? reason.stack || reason.message : reason
  );
});
process.on("uncaughtException", (error: any) => {
  console.error("[UNCAUGHT_EXCEPTION]", error?.stack || error);
});

const app = express();

const isCompiled = __dirname.includes(path.sep + "build" + path.sep) || __dirname.endsWith(path.sep + "build");
const projectRoot = isCompiled
  ? path.join(__dirname, "..", "..")
  : path.join(__dirname, "..");

// Frontend: servir de public-v2 (Quasar/Vue 3)
const publicDir = process.env.PUBLIC_DIR
  || path.join(projectRoot, "public-v2");

// Uploads
const uploadsDir = process.env.UPLOADS_DIR
  || path.join(projectRoot, "uploads");

app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.static(uploadsDir));
app.use(express.static(publicDir));
app.use(cors());
app.use(morgan("dev"));
app.use(routes);

// SPA catch-all: serve index.html for any non-API route
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Number() em vez de comparação directa: env vars são strings, e "0" é truthy —
// num Windows com PORT=0 no ambiente do sistema, o servidor ficava à escuta na
// porta 0 (porta aleatória do SO) e o frontend deixava de o encontrar.
const PORT = Number(process.env.PORT) || 4000;

const bootstrap = async () => {
  // Migrações de schema: aplicadas ANTES de aceitar pedidos, em todos os
  // arranques (local, PM2, Ubuntu). Idempotentes — ver src/migrations.
  try {
    const migrationResult = await runMigrations();
    console.log(
      `[Migration] ${migrationResult.applied} aplicadas, ${migrationResult.skipped} já existentes, ${migrationResult.errors.length} erros.`
    );
    if (migrationResult.errors.length > 0) {
      console.error("[Migration] Erros (o servidor arranca na mesma):", migrationResult.errors);
    }
  } catch (error: any) {
    console.error("[Migration] Falha ao aplicar migrações:", error?.message || error);
  }

  app.listen(PORT, () => {
    console.log(`MBR Server is running on PORT ${PORT}`);

    // Fila de SMS (BulkSMM): processar mensagens pendentes a cada 60s.
    // Sem BULKSMS_API_KEY no .env, a fila permanece intacta (sem efeitos).
    setInterval(() => {
      processSmsQueue({ limit: 100 }).catch((error: any) => {
        console.error("[SMS] Erro ao processar a fila:", error?.message || error);
      });
    }, 60000);
    console.log("[SMS] Fila de SMS activa (BulkSMM) — a cada 60s");

    // Alertas automáticos: prestações a vencer (3 dias) + juros de mora em atraso,
    // para todas as empresas. Enfileira 30s após o arranque e depois de 6 em 6 horas.
    // As funções já evitam duplicados (mesma prestação/dívida só entra uma vez).
    const runAutomaticSmsAlerts = async () => {
      try {
        const companies: any[] = (await CompanyModel.findAll({
          attributes: ["id"],
        })) as any[];
        for (const company of companies) {
          const companyId = Number(company.id);
          await enqueueUpcomingInstallmentAlerts({ companyId, daysAhead: 3 });
          await enqueueOutstandingLateInterestAlerts({ companyId, limit: 200 });
        }
        flushSmsQueue(200);
        console.log(
          `[SMS] Alertas automáticos enfileirados para ${companies.length} empresa(s)`
        );
      } catch (error: any) {
        console.error("[SMS] Erro nos alertas automáticos:", error?.message || error);
      }
    };

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
      if (next <= now) next.setDate(next.getDate() + 1);
      setTimeout(async () => {
        await runOverdueCollectionJob();
        scheduleNextOverdueRun(); // reagenda para o dia seguinte
      }, next.getTime() - now.getTime());
    };
    const runOverdueCollectionJob = async () => {
      try {
        const companies: any[] = (await CompanyModel.findAll({ attributes: ["id"] })) as any[];
        await runDailyOverdueCollectionSms(companies.map((c: any) => Number(c.id)));
        flushSmsQueue(200);
      } catch (error: any) {
        console.error("[SMS Cobranca] Erro no job diário:", error?.message || error);
      }
    };
    setTimeout(runOverdueCollectionJob, 60 * 1000);
    scheduleNextOverdueRun();
    console.log("[SMS Cobranca] Job diário activo — 07:00 e catch-up no arranque");
  });
};

bootstrap();
