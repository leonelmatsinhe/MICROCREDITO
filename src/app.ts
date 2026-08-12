import "./config/env";
import express, { json } from "express";
import path from "path";
import fs from "fs";
import { db } from "./database/db";
import { routes } from "./routes";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";

const app = express();

// Determina a raiz do projecto:
//   Dev (ts-node):  __dirname = .../src/        → subir 1 nível
//   Prod (compiled): __dirname = .../build/src/ → subir 2 níveis
const isCompiled = __dirname.includes(path.sep + "build" + path.sep) || __dirname.endsWith(path.sep + "build");
const projectRoot = isCompiled
  ? path.join(__dirname, "..", "..")
  : path.join(__dirname, "..");
const resolveDir = (envKey: string, subdir: "public" | "uploads") => {
  const envDir = process.env[envKey];
  const candidates = [
    envDir,
    path.join(projectRoot, subdir),
    path.join(process.cwd(), subdir),
    path.join(__dirname, "..", "..", subdir),
    path.join(__dirname, "..", subdir),
  ].filter(Boolean) as string[];

  const found = candidates.find((dir) => fs.existsSync(dir));
  return found || candidates[0];
};
const publicDir = resolveDir("PUBLIC_DIR", "public");
const uploadsDir = resolveDir("UPLOADS_DIR", "uploads");

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  // await db.sync();
  const qi = db.getQueryInterface();

  const runSafe = async (label: string, fn: () => Promise<any>) => {
    try {
      await fn();
      console.log(`${label} aplicado com sucesso.`);
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      const ignorable =
        msg.includes("already exists") ||
        msg.includes("Duplicate key name") ||
        msg.includes("Duplicate") ||
        msg.includes("exists");
      if (!ignorable) {
        console.warn(`Aviso ${label}:`, msg);
      }
    }
  };

  await runSafe("migração dateCreated(customer_loans)", async () => {
    await qi.changeColumn("customer_loans", "dateCreated", {
      type: "VARCHAR(20)",
      allowNull: false,
    });
  });

  await runSafe("migração password(customers)", async () => {
    await qi.changeColumn("customers", "password", {
      type: "VARCHAR(255)",
      allowNull: false,
    });
  });

  await runSafe("migração customerBairro(customers)", async () => {
    await qi.addColumn("customers", "customerBairro", {
      type: "VARCHAR(255)",
      allowNull: true,
    });
  });

  await runSafe("migração capacityExcessObservation(customer_loans)", async () => {
    await qi.addColumn("customer_loans", "capacityExcessObservation", {
      type: "TEXT",
      allowNull: true,
    });
  });

  await runSafe("migração tabela sms_queue", async () => {
    await qi.createTable("sms_queue", {
      id: {
        type: "INT",
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      companyId: {
        type: "INT",
        allowNull: false,
      },
      accountNumber: {
        type: "VARCHAR(60)",
        allowNull: true,
      },
      loanId: {
        type: "INT",
        allowNull: true,
      },
      amortizationLoanId: {
        type: "INT",
        allowNull: true,
      },
      transactionId: {
        type: "INT",
        allowNull: true,
      },
      debtId: {
        type: "INT",
        allowNull: true,
      },
      customerName: {
        type: "VARCHAR(255)",
        allowNull: true,
      },
      phone: {
        type: "VARCHAR(20)",
        allowNull: false,
      },
      messageType: {
        type: "VARCHAR(60)",
        allowNull: false,
      },
      messageBody: {
        type: "TEXT",
        allowNull: false,
      },
      payloadJson: {
        type: "LONGTEXT",
        allowNull: true,
      },
      status: {
        type: "VARCHAR(20)",
        allowNull: false,
        defaultValue: "queued",
      },
      retries: {
        type: "INT",
        allowNull: false,
        defaultValue: 0,
      },
      gatewayMessageId: {
        type: "VARCHAR(255)",
        allowNull: true,
      },
      errorMessage: {
        type: "VARCHAR(255)",
        allowNull: true,
      },
      sentAt: {
        type: "DATETIME",
        allowNull: true,
      },
      lastAttemptAt: {
        type: "DATETIME",
        allowNull: true,
      },
      createdAt: {
        type: "DATETIME",
        allowNull: false,
        defaultValue: db.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: "DATETIME",
        allowNull: false,
        defaultValue: db.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });
  });

  await runSafe("migração tabela sms_gateway_inbox", async () => {
    await qi.createTable("sms_gateway_inbox", {
      id: {
        type: "INT",
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      deviceId: {
        type: "VARCHAR(120)",
        allowNull: false,
      },
      senderPhone: {
        type: "VARCHAR(30)",
        allowNull: true,
      },
      receiverPhone: {
        type: "VARCHAR(30)",
        allowNull: true,
      },
      messageBody: {
        type: "TEXT",
        allowNull: false,
      },
      receivedAt: {
        type: "DATETIME",
        allowNull: false,
      },
      contentHash: {
        type: "VARCHAR(64)",
        allowNull: false,
        unique: true,
      },
      createdAt: {
        type: "DATETIME",
        allowNull: false,
        defaultValue: db.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: "DATETIME",
        allowNull: false,
        defaultValue: db.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });
  });

  // Índices para acelerar dashboard, relatórios e pagamentos
  await runSafe("índice idx_tranzactions_company_createdAt", async () => {
    await qi.addIndex("tranzactions", ["companyId", "createdAt"], {
      name: "idx_tranzactions_company_createdAt",
    });
  });
  await runSafe("índice idx_tranzactions_company_loan", async () => {
    await qi.addIndex("tranzactions", ["companyId", "loanId"], {
      name: "idx_tranzactions_company_loan",
    });
  });
  await runSafe("índice idx_tranzactions_accountNumber", async () => {
    await qi.addIndex("tranzactions", ["accountNumber"], {
      name: "idx_tranzactions_accountNumber",
    });
  });
  await runSafe("índice idx_tranzactions_paymentMethod", async () => {
    await qi.addIndex("tranzactions", ["paymentMethod"], {
      name: "idx_tranzactions_paymentMethod",
    });
  });

  await runSafe("índice idx_customer_loans_company_status_date", async () => {
    await qi.addIndex("customer_loans", ["companyId", "status", "dateCreated"], {
      name: "idx_customer_loans_company_status_date",
    });
  });
  await runSafe("índice idx_customer_loans_company_manager_status", async () => {
    await qi.addIndex("customer_loans", ["companyId", "creditManager", "status"], {
      name: "idx_customer_loans_company_manager_status",
    });
  });
  await runSafe("índice idx_customer_loans_accountNumber", async () => {
    await qi.addIndex("customer_loans", ["accountNumber"], {
      name: "idx_customer_loans_accountNumber",
    });
  });

  await runSafe("índice idx_amortization_loan_company_due_status", async () => {
    await qi.addIndex("amortization_loan", ["companyId", "dueDate", "status"], {
      name: "idx_amortization_loan_company_due_status",
    });
  });
  await runSafe("índice idx_amortization_loan_loan_installmentOrder", async () => {
    await qi.addIndex("amortization_loan", ["loanId", "installmentOrder"], {
      name: "idx_amortization_loan_loan_installmentOrder",
    });
  });

  await runSafe("índice idx_sms_queue_status_created", async () => {
    await qi.addIndex("sms_queue", ["status", "createdAt"], {
      name: "idx_sms_queue_status_created",
    });
  });
  await runSafe("índice idx_sms_queue_company_status", async () => {
    await qi.addIndex("sms_queue", ["companyId", "status"], {
      name: "idx_sms_queue_company_status",
    });
  });
  await runSafe("índice idx_sms_queue_company_type_ref", async () => {
    await qi.addIndex("sms_queue", ["companyId", "messageType", "amortizationLoanId"], {
      name: "idx_sms_queue_company_type_ref",
    });
  });
  await runSafe("índice idx_sms_gateway_inbox_device_received", async () => {
    await qi.addIndex("sms_gateway_inbox", ["deviceId", "receivedAt"], {
      name: "idx_sms_gateway_inbox_device_received",
    });
  });

  await runSafe("índice idx_customers_company_account", async () => {
    await qi.addIndex("customers", ["companyId", "accountNumber"], {
      unique: true,
      name: "idx_customers_company_account",
    });
  });
  await runSafe("índice idx_customers_company_phone", async () => {
    await qi.addIndex("customers", ["companyId", "customerPhone"], {
      name: "idx_customers_company_phone",
    });
  });

  console.log(`MBR Server is running on PORT ${PORT}`);
});
