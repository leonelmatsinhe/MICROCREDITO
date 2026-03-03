import "./config/env";
import express, { json } from "express";
import path from "path";
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

app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.static(path.join(projectRoot, "uploads")));
app.use(express.static(path.join(projectRoot, "public")));
app.use(cors());
app.use(morgan("dev"));
app.use(routes);

// SPA catch-all: serve index.html for any non-API route
app.get("*", (req, res) => {
  res.sendFile(path.join(projectRoot, "public", "index.html"));
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
