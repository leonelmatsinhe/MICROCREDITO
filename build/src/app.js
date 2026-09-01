"use strict";
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
const fs_1 = __importDefault(require("fs"));
const db_1 = require("./database/db");
const routes_1 = require("./routes");
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const body_parser_1 = __importDefault(require("body-parser"));
const app = (0, express_1.default)();
const isCompiled = __dirname.includes(path_1.default.sep + "build" + path_1.default.sep) || __dirname.endsWith(path_1.default.sep + "build");
const projectRoot = isCompiled
    ? path_1.default.join(__dirname, "..", "..")
    : path_1.default.join(__dirname, "..");
const resolveDir = (envKey, subdir) => {
    const envDir = process.env[envKey];
    const candidates = [
        envDir,
        path_1.default.join(projectRoot, subdir),
        path_1.default.join(process.cwd(), subdir),
        path_1.default.join(__dirname, "..", "..", subdir),
        path_1.default.join(__dirname, "..", subdir),
    ].filter(Boolean);
    const found = candidates.find((dir) => fs_1.default.existsSync(dir));
    return found || candidates[0];
};
const publicDir = resolveDir("PUBLIC_DIR", "public");
const uploadsDir = resolveDir("UPLOADS_DIR", "uploads");
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
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    // await db.sync();
    const qi = db_1.db.getQueryInterface();
    const runSafe = (label, fn) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield fn();
            console.log(`${label} aplicado com sucesso.`);
        }
        catch (e) {
            const msg = String((e === null || e === void 0 ? void 0 : e.message) || e || "");
            const ignorable = msg.includes("already exists") ||
                msg.includes("Duplicate key name") ||
                msg.includes("Duplicate") ||
                msg.includes("exists");
            if (!ignorable) {
                console.warn(`Aviso ${label}:`, msg);
            }
        }
    });
    yield runSafe("migração dateCreated(customer_loans)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.changeColumn("customer_loans", "dateCreated", {
            type: "VARCHAR(20)",
            allowNull: false,
        });
    }));
    yield runSafe("migração password(customers)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.changeColumn("customers", "password", {
            type: "VARCHAR(255)",
            allowNull: false,
        });
    }));
    yield runSafe("migração customerBairro(customers)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("customers", "customerBairro", {
            type: "VARCHAR(255)",
            allowNull: true,
        });
    }));
    yield runSafe("migração capacityExcessObservation(customer_loans)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("customer_loans", "capacityExcessObservation", {
            type: "TEXT",
            allowNull: true,
        });
    }));
    yield runSafe("migração borrowerInfo(customer_loans)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("customer_loans", "borrowerInfo", {
            type: "TEXT",
            allowNull: true,
        });
    }));
    yield runSafe("migração tabela sms_queue", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.createTable("sms_queue", {
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
                defaultValue: db_1.db.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
                type: "DATETIME",
                allowNull: false,
                defaultValue: db_1.db.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
            },
        });
    }));
    yield runSafe("migração tabela sms_gateway_inbox", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.createTable("sms_gateway_inbox", {
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
                defaultValue: db_1.db.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
                type: "DATETIME",
                allowNull: false,
                defaultValue: db_1.db.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
            },
        });
    }));
    // Índices para acelerar dashboard, relatórios e pagamentos
    yield runSafe("índice idx_tranzactions_company_createdAt", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("tranzactions", ["companyId", "createdAt"], {
            name: "idx_tranzactions_company_createdAt",
        });
    }));
    yield runSafe("índice idx_tranzactions_company_loan", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("tranzactions", ["companyId", "loanId"], {
            name: "idx_tranzactions_company_loan",
        });
    }));
    yield runSafe("índice idx_tranzactions_accountNumber", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("tranzactions", ["accountNumber"], {
            name: "idx_tranzactions_accountNumber",
        });
    }));
    yield runSafe("índice idx_tranzactions_paymentMethod", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("tranzactions", ["paymentMethod"], {
            name: "idx_tranzactions_paymentMethod",
        });
    }));
    yield runSafe("índice idx_customer_loans_company_status_date", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("customer_loans", ["companyId", "status", "dateCreated"], {
            name: "idx_customer_loans_company_status_date",
        });
    }));
    yield runSafe("índice idx_customer_loans_company_manager_status", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("customer_loans", ["companyId", "creditManager", "status"], {
            name: "idx_customer_loans_company_manager_status",
        });
    }));
    yield runSafe("índice idx_customer_loans_accountNumber", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("customer_loans", ["accountNumber"], {
            name: "idx_customer_loans_accountNumber",
        });
    }));
    yield runSafe("índice idx_amortization_loan_company_due_status", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("amortization_loan", ["companyId", "dueDate", "status"], {
            name: "idx_amortization_loan_company_due_status",
        });
    }));
    yield runSafe("índice idx_amortization_loan_loan_installmentOrder", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("amortization_loan", ["loanId", "installmentOrder"], {
            name: "idx_amortization_loan_loan_installmentOrder",
        });
    }));
    yield runSafe("índice idx_sms_queue_status_created", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("sms_queue", ["status", "createdAt"], {
            name: "idx_sms_queue_status_created",
        });
    }));
    yield runSafe("índice idx_sms_queue_company_status", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("sms_queue", ["companyId", "status"], {
            name: "idx_sms_queue_company_status",
        });
    }));
    yield runSafe("índice idx_sms_queue_company_type_ref", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("sms_queue", ["companyId", "messageType", "amortizationLoanId"], {
            name: "idx_sms_queue_company_type_ref",
        });
    }));
    yield runSafe("índice idx_sms_gateway_inbox_device_received", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("sms_gateway_inbox", ["deviceId", "receivedAt"], {
            name: "idx_sms_gateway_inbox_device_received",
        });
    }));
    yield runSafe("índice idx_customers_company_account", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("customers", ["companyId", "accountNumber"], {
            unique: true,
            name: "idx_customers_company_account",
        });
    }));
    yield runSafe("índice idx_customers_company_phone", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addIndex("customers", ["companyId", "customerPhone"], {
            name: "idx_customers_company_phone",
        });
    }));
    // Migration: companyLogo de BLOB para STRING (armazena filename, não binário)
    yield runSafe("migração companyLogo(companies) BLOB→STRING", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.changeColumn("companies", "companyLogo", {
            type: "VARCHAR(500)",
            allowNull: true,
            defaultValue: "",
        });
    }));
    // Migration: adicionar coluna paidAmount em amortization_loans
    yield runSafe("migração paidAmount(amortization_loans)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("amortization_loans", "paidAmount", {
            type: "FLOAT",
            allowNull: true,
            defaultValue: 0,
        });
    }));
    // Migration: backfill paidAmount a partir de transacções existentes
    yield runSafe("backfill paidAmount das transacções", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Buscar todas as prestações pagas (status=1) com paidAmount=0
        const [installments] = yield db_1.db.query(`SELECT al.id, al.installment, al.status, al.paidAmount, al.loanId, al.accountNumber, al.companyId
       FROM amortization_loans al
       WHERE al.status = 1 AND (al.paidAmount IS NULL OR al.paidAmount = 0)`);
        for (const inst of installments) {
            // Somar transacções para esta prestação
            const [txns] = yield db_1.db.query(`SELECT COALESCE(SUM(amount), 0) AS totalPaid
         FROM tranzactions
         WHERE amortizationLoanId = ${inst.id}`);
            const totalPaid = Number((_a = txns[0]) === null || _a === void 0 ? void 0 : _a.totalPaid) || 0;
            const installmentValue = Number(inst.installment) || 0;
            if (totalPaid > 0 && totalPaid < installmentValue - 0.01) {
                // Pagamento parcial — corrigir status para -1
                console.log(`[backfill] Prestação ${inst.id}: parcial ${totalPaid}/${installmentValue}, corrigindo status para -1`);
                yield db_1.db.query(`UPDATE amortization_loans
           SET paidAmount = ${totalPaid}, status = -1, remainingBalance = ${installmentValue - totalPaid}
           WHERE id = ${inst.id}`);
            }
            else if (totalPaid >= installmentValue - 0.01) {
                // Pagamento total — manter status 1
                console.log(`[backfill] Prestação ${inst.id}: total ${totalPaid}/${installmentValue}, actualizando paidAmount`);
                yield db_1.db.query(`UPDATE amortization_loans
           SET paidAmount = ${Math.min(totalPaid, installmentValue)}, remainingBalance = 0
           WHERE id = ${inst.id}`);
            }
        }
    }));
    // Migration: adicionar coluna paymentMethods em companies
    yield runSafe("migração paymentMethods(companies)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("companies", "paymentMethods", {
            type: "TEXT",
            allowNull: true,
            defaultValue: "1:Numerário,2:Cheque,3:Transferência Bancária,4:Depósito Bancário,7:M-Pesa",
        });
    }));
    // Migration: adicionar colunas notes e discountApplied em tranzactions
    yield runSafe("migração notes(tranzactions)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("tranzactions", "notes", {
            type: "TEXT",
            allowNull: true,
        });
    }));
    yield runSafe("migração discountApplied(tranzactions)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("tranzactions", "discountApplied", {
            type: "BOOLEAN",
            allowNull: true,
            defaultValue: false,
        });
    }));
    yield runSafe("migração discountAmount(tranzactions)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("tranzactions", "discountAmount", {
            type: "FLOAT",
            allowNull: true,
            defaultValue: 0,
        });
    }));
    yield runSafe("migração customerPPE(customers)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("customers", "customerPPE", {
            type: "INT",
            allowNull: true,
            defaultValue: 0,
        });
    }));
    // Migration: adicionar colunas userRole, module, ipAddress em user_logs
    yield runSafe("migração userRole(user_logs)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("user_logs", "userRole", {
            type: "INT",
            allowNull: true,
        });
    }));
    yield runSafe("migração module(user_logs)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("user_logs", "module", {
            type: "VARCHAR(100)",
            allowNull: true,
        });
    }));
    yield runSafe("migração ipAddress(user_logs)", () => __awaiter(void 0, void 0, void 0, function* () {
        yield qi.addColumn("user_logs", "ipAddress", {
            type: "VARCHAR(50)",
            allowNull: true,
        });
    }));
    console.log(`MBR Server is running on PORT ${PORT}`);
}));
