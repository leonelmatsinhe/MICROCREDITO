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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = void 0;
const db_1 = require("../database/db");
const hasColumn = (table, column) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield db_1.db.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
        return rows.length > 0;
    }
    catch (_a) {
        return false;
    }
});
const hasTable = (table) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield db_1.db.query(`SHOW TABLES LIKE '${table}'`);
        return rows.length > 0;
    }
    catch (_b) {
        return false;
    }
});
const hasForeignKey = (table, constraint) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.db.query(`SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`, { replacements: [table, constraint] });
    return rows.length > 0;
});
const addForeignKeyIfMissing = (table, constraint, column, referencedTable, referencedColumn, onDelete, results) => __awaiter(void 0, void 0, void 0, function* () {
    if (yield hasForeignKey(table, constraint)) {
        results.skipped += 1;
        return;
    }
    try {
        yield db_1.db.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraint}\`
       FOREIGN KEY (\`${column}\`) REFERENCES \`${referencedTable}\` (\`${referencedColumn}\`)
       ON UPDATE CASCADE ON DELETE ${onDelete}`);
        results.applied += 1;
        console.log(`[Migration] FK ${table}.${column} -> ${referencedTable}.${referencedColumn} adicionada`);
    }
    catch (error) {
        results.errors.push(`FK ${constraint}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error(`[Migration] Erro na FK ${constraint}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
});
const dropForeignKeyIfExists = (table, constraint, results) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(yield hasForeignKey(table, constraint)))
        return;
    try {
        yield db_1.db.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${constraint}\``);
        results.applied += 1;
        console.log(`[Migration] FK ${constraint} removida`);
    }
    catch (error) {
        results.errors.push(`DROP FK ${constraint}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
});
const dropColumnIfExists = (table, column, results) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(yield hasColumn(table, column)))
        return;
    try {
        yield db_1.db.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
        results.applied += 1;
        console.log(`[Migration] Coluna ${table}.${column} removida`);
    }
    catch (error) {
        results.errors.push(`DROP ${table}.${column}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
});
const hasIndex = (table, indexName) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.db.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, {
        replacements: [indexName],
    });
    return rows.length > 0;
});
const addUniqueIndexIfMissing = (table, indexName, columns, results) => __awaiter(void 0, void 0, void 0, function* () {
    if (yield hasIndex(table, indexName)) {
        results.skipped += 1;
        return;
    }
    try {
        yield db_1.db.query(`ALTER TABLE \`${table}\` ADD UNIQUE KEY \`${indexName}\` (${columns.map((column) => `\`${column}\``).join(", ")})`);
        results.applied += 1;
        console.log(`[Migration] Índice único ${table}.${indexName} adicionado`);
    }
    catch (error) {
        results.errors.push(`INDEX ${table}.${indexName}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error(`[Migration] Erro no índice ${table}.${indexName}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
});
// Índice simples (não único) — ex.: idx_company_purpose_active em accounts.
const addIndexIfMissing = (table, indexName, columns, results) => __awaiter(void 0, void 0, void 0, function* () {
    if (yield hasIndex(table, indexName)) {
        results.skipped += 1;
        return;
    }
    try {
        yield db_1.db.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns.map((column) => `\`${column}\``).join(", ")})`);
        results.applied += 1;
        console.log(`[Migration] Índice ${table}.${indexName} adicionado`);
    }
    catch (error) {
        results.errors.push(`INDEX ${table}.${indexName}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error(`[Migration] Erro no índice ${table}.${indexName}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
});
const addColumnIfMissing = (table, column, definition, results) => __awaiter(void 0, void 0, void 0, function* () {
    if (yield hasColumn(table, column)) {
        results.skipped += 1;
        return;
    }
    try {
        yield db_1.db.query(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
        results.applied += 1;
        console.log(`[Migration] Coluna ${table}.${column} adicionada`);
    }
    catch (error) {
        results.errors.push(`ALTER ${table}.${column}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error(`[Migration] Erro em ${table}.${column}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
});
const columnType = (table, column) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const [rows] = yield db_1.db.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
        return ((_c = rows[0]) === null || _c === void 0 ? void 0 : _c.Type) || null;
    }
    catch (_d) {
        return null;
    }
});
/**
 * MODIFY COLUMN apenas quando o tipo actual difere do desejado.
 * Antes isto corria em TODOS os arranques — cada MODIFY reconstrói a tabela
 * inteira (customer_loans pode ser grande) e várias instâncias arrancando em
 * paralelo enfileiravam ALTERs durante horas, bloqueando o servidor.
 */
const modifyColumnType = (table, column, definition, results) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const current = (yield columnType(table, column)) || "";
        const wantedType = definition.split(" ")[0].toUpperCase(); // ex.: DECIMAL(15,2)
        const currentUpper = current.toUpperCase();
        if (currentUpper.startsWith(wantedType)) {
            results.skipped += 1;
            return;
        }
        yield db_1.db.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`);
        results.applied += 1;
        console.log(`[Migration] Tipo ${table}.${column} ajustado para ${definition}`);
    }
    catch (error) {
        results.errors.push(`MODIFY ${table}.${column}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error(`[Migration] Erro ao ajustar ${table}.${column}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
});
const createTableIfMissing = (table, ddl, results) => __awaiter(void 0, void 0, void 0, function* () {
    if (yield hasTable(table)) {
        results.skipped += 1;
        return;
    }
    try {
        yield db_1.db.query(ddl);
        results.applied += 1;
        console.log(`[Migration] Tabela ${table} criada`);
    }
    catch (error) {
        results.errors.push(`CREATE ${table}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error(`[Migration] Erro ao criar ${table}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
});
/**
 * Aplica todas as migrações (idempotente). Não lança excepções — devolve
 * um resumo com o número de migrações aplicadas, já existentes e erros.
 */
const runMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const results = { applied: 0, skipped: 0, errors: [] };
    // ==================== COLUNAS ====================
    // Chave técnica da conta. Mantida nullable nesta fase para permitir a
    // reconciliação dos dados históricos antes de criar as FKs.
    yield addColumnIfMissing("customer_loans", "customerId", "INTEGER NULL", results);
    yield addColumnIfMissing("amortization_loans", "customerId", "INTEGER NULL", results);
    yield addColumnIfMissing("tranzactions", "customerId", "INTEGER NULL", results);
    yield addColumnIfMissing("customer_documents", "customerId", "INTEGER NULL", results);
    yield addColumnIfMissing("debts", "customerId", "INTEGER NULL", results);
    yield addColumnIfMissing("notifications", "userId", "INTEGER NULL", results);
    yield addColumnIfMissing("notifications", "customerId", "INTEGER NULL", results);
    // Valores financeiros devem usar decimal para evitar erros de arredondamento
    // binário típicos de FLOAT.
    yield modifyColumnType("customer_loans", "amount", "DECIMAL(15,2) NOT NULL", results);
    yield modifyColumnType("customer_loans", "interestRate", "DECIMAL(8,4) NOT NULL", results);
    yield modifyColumnType("customer_loans", "administrativeFee", "DECIMAL(15,6) NOT NULL DEFAULT 0", results);
    yield modifyColumnType("amortization_loans", "amortization", "DECIMAL(15,2) NOT NULL", results);
    yield modifyColumnType("amortization_loans", "rateAmount", "DECIMAL(15,2) NOT NULL", results);
    yield modifyColumnType("amortization_loans", "installment", "DECIMAL(15,2) NOT NULL", results);
    yield modifyColumnType("amortization_loans", "remainingBalance", "DECIMAL(15,2) NULL", results);
    yield modifyColumnType("amortization_loans", "paidAmount", "DECIMAL(15,2) NULL DEFAULT 0", results);
    yield modifyColumnType("tranzactions", "amount", "DECIMAL(15,2) NOT NULL", results);
    yield addColumnIfMissing("tranzactions", "totalAmount", "DECIMAL(15,2) NULL", results);
    yield modifyColumnType("tranzactions", "latePaymentInterest", "DECIMAL(15,2) NOT NULL", results);
    yield modifyColumnType("tranzactions", "interestRateAmount", "DECIMAL(15,2) NOT NULL", results);
    yield modifyColumnType("tranzactions", "discountAmount", "DECIMAL(15,2) NULL DEFAULT 0", results);
    yield modifyColumnType("debts", "debtAmount", "DECIMAL(15,2) NOT NULL", results);
    yield modifyColumnType("interest_rates", "tax", "DECIMAL(8,4) NOT NULL", results);
    yield modifyColumnType("interest_rates", "administrativeFee", "DECIMAL(15,6) NOT NULL", results);
    yield modifyColumnType("loan_guarantees", "purchaseAmount", "DECIMAL(15,2) NULL", results);
    // Credenciais enviadas (clientes) — enviar credenciais de acesso ao portal
    yield addColumnIfMissing("customers", "credentialsSent", "INTEGER DEFAULT 0", results);
    yield addColumnIfMissing("customers", "interestRateId", "INTEGER NULL", results);
    yield addColumnIfMissing("customers", "credentialsSentAt", "VARCHAR(255)", results);
    // Credenciais enviadas (utilizadores internos)
    yield addColumnIfMissing("users", "credentialsSent", "INTEGER DEFAULT 0", results);
    yield addColumnIfMissing("users", "credentialsSentAt", "VARCHAR(255)", results);
    // Taxa administrativa do crédito (fluxo dinâmico até ao contrato)
    yield addColumnIfMissing("customer_loans", "administrativeFee", "FLOAT NOT NULL DEFAULT 0", results);
    // Data real de desembolso do crédito (base do plano de amortização)
    yield addColumnIfMissing("customer_loans", "disbursementDate", "VARCHAR(255)", results);
    // Autorização de envio de SMS (só o Admin altera)
    yield addColumnIfMissing("companies", "smsEnabled", "INTEGER NOT NULL DEFAULT 1", results);
    // ==================== FLUXO DE SUBSCRIÇÃO (cadastro público de empresas) ====================
    // companies: ciclo de aprovação pelo Super Admin + dados do cadastro da landing.
    yield addColumnIfMissing("companies", "approval_status", "ENUM('PENDENTE','APROVADA','REJEITADA','SUSPENSA') NOT NULL DEFAULT 'PENDENTE'", results);
    yield addColumnIfMissing("companies", "nuit", "VARCHAR(20) NULL", results);
    yield addColumnIfMissing("companies", "phone", "VARCHAR(20) NULL", results);
    yield addColumnIfMissing("companies", "email", "VARCHAR(100) NULL", results);
    yield addColumnIfMissing("companies", "license_number", "VARCHAR(100) NULL", results);
    yield addColumnIfMissing("companies", "plan", "ENUM('STARTER','CRESCIMENTO','PROFISSIONAL') NOT NULL DEFAULT 'CRESCIMENTO'", results);
    yield addColumnIfMissing("companies", "requested_at", "DATETIME NULL DEFAULT CURRENT_TIMESTAMP", results);
    yield addColumnIfMissing("companies", "approved_at", "DATETIME NULL", results);
    yield addColumnIfMissing("companies", "approved_by", "INTEGER NULL", results);
    yield addColumnIfMissing("companies", "rejection_reason", "TEXT NULL", results);
    // Empresas já existentes na plataforma são consideradas aprovadas.
    try {
        yield db_1.db.query("UPDATE companies SET approval_status = 'APROVADA', approved_at = COALESCE(approved_at, NOW()) WHERE approval_status IS NULL OR approval_status = 'PENDENTE' AND created_at < NOW() - INTERVAL 1 DAY");
    }
    catch ( /* coluna created_at pode não existir — ignora */_r) { /* coluna created_at pode não existir — ignora */ }
    // users: is_active (conta de admin da empresa criada inactiva até aprovação)
    yield addColumnIfMissing("users", "is_active", "TINYINT(1) NOT NULL DEFAULT 1", results);
    // Chave para o plano de subscrição escolhido (FK lógica subscription_plans)
    yield addColumnIfMissing("companies", "plan_id", "INTEGER NULL", results);
    // ==================== TABELA: PLANOS DE SUBSCRIÇÃO ====================
    yield createTableIfMissing("subscription_plans", `CREATE TABLE IF NOT EXISTS subscription_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      slug VARCHAR(50) UNIQUE,
      price_mzn DECIMAL(10,2) NOT NULL,
      max_clients INT NOT NULL,
      features JSON,
      is_popular BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT NOW()
    )`, results);
    // Seed one-time dos 3 planos base (só insere quando a tabela está vazia)
    try {
        const [planCount] = yield db_1.db.query("SELECT COUNT(*) AS total FROM subscription_plans");
        if (Number((_e = planCount[0]) === null || _e === void 0 ? void 0 : _e.total) === 0) {
            yield db_1.db.query(`INSERT INTO subscription_plans (name, slug, price_mzn, max_clients, features, is_popular, is_active, created_at) VALUES
         ('Starter', 'starter', 2500, 100, '["Até 100 clientes","Relatórios BM","Suporte WhatsApp"]', 0, 1, NOW()),
         ('Crescimento', 'crescimento', 4500, 500, '["Até 500 clientes","Tudo do Starter","Caixa Multi-contas","Alertas SMS"]', 1, 1, NOW()),
         ('Profissional', 'profissional', 8500, 999999, '["Clientes ilimitados","Tudo do Crescimento","API Completa","Suporte Prioritário"]', 0, 1, NOW())`);
            results.applied += 1;
            console.log("[Migration] Planos de subscrição base criados (Starter, Crescimento, Profissional)");
        }
        else {
            results.skipped += 1;
        }
    }
    catch (error) {
        results.errors.push(`SEED subscription_plans: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    // Ocultar cláusula de seguro (VIGÉSIMA PRIMEIRA) no contrato de concessão
    yield addColumnIfMissing("companies", "contractHideInsuranceClause", "INTEGER NOT NULL DEFAULT 0", results);
    // Fotografia tipo passe do mutuário (auto-cadastro público no portal)
    yield addColumnIfMissing("customers", "passportPhotoUrl", "VARCHAR(255)", results);
    // Conta criada pelo próprio mutuário no portal (selo "Auto-cadastro" nas grelhas)
    yield addColumnIfMissing("customers", "isSelfRegistered", "INTEGER NOT NULL DEFAULT 0", results);
    // ==================== MUTUÁRIOS PF/PJ ====================
    // Tipo de mutuário: PF = pessoa física (padrão histórico), PJ = empresa.
    // Registos antigos ficam como PF; os campos de pessoa física passam a ser
    // opcionais porque as empresas não os têm.
    yield addColumnIfMissing("customers", "customerType", "ENUM('PF','PJ') NOT NULL DEFAULT 'PF'", results);
    // Dados da empresa (só preenchidos quando customerType = 'PJ')
    yield addColumnIfMissing("customers", "companyLegalRepresentative", "VARCHAR(255)", results);
    yield addColumnIfMissing("customers", "companyRepresentativeIdNumber", "VARCHAR(255)", results);
    yield addColumnIfMissing("customers", "companyRepresentativeIdExpiry", "VARCHAR(255)", results);
    yield addColumnIfMissing("customers", "companyRepresentativeIdIssuer", "VARCHAR(255)", results);
    yield addColumnIfMissing("customers", "companyLicenseNumber", "VARCHAR(255)", results);
    yield addColumnIfMissing("customers", "companyMainActivity", "VARCHAR(255)", results);
    // Género, estado civil e data de nascimento tornam-se opcionais para
    // acomodar mutuários do tipo Empresa (PJ).
    yield modifyColumnType("customers", "sex", "VARCHAR(255) NULL DEFAULT NULL", results);
    yield modifyColumnType("customers", "maritalStatus", "VARCHAR(255) NULL DEFAULT NULL", results);
    yield modifyColumnType("customers", "customerDateOfBirth", "VARCHAR(255) NULL DEFAULT NULL", results);
    // ==================== TABELAS ====================
    // Mensagens de WhatsApp (password reset / notificações)
    yield createTableIfMissing("whatsapp_messages", `CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      companyId INTEGER NOT NULL,
      phone VARCHAR(50) NOT NULL,
      accountNumber VARCHAR(50),
      customerId INTEGER NULL,
      customerName VARCHAR(255),
      messageType VARCHAR(100) NOT NULL,
      messageBody TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'queued',
      direction VARCHAR(50) DEFAULT 'outbound',
      payloadJson TEXT,
      createdAt DATETIME,
      updatedAt DATETIME
    )`, results);
    // Fila de SMS (gateway BulkSMM) — essencial para o serviço de SMS
    yield createTableIfMissing("sms_queue", `CREATE TABLE IF NOT EXISTS sms_queue (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      companyId INTEGER NOT NULL,
      accountNumber VARCHAR(255),
      customerId INTEGER NULL,
      loanId INTEGER,
      amortizationLoanId INTEGER,
      transactionId INTEGER,
      debtId INTEGER,
      customerName VARCHAR(255),
      phone VARCHAR(20) NOT NULL,
      messageType VARCHAR(60) NOT NULL,
      messageBody TEXT NOT NULL,
      payloadJson LONGTEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'queued',
      retries INTEGER NOT NULL DEFAULT 0,
      gatewayMessageId VARCHAR(255),
      errorMessage VARCHAR(255),
      sentAt DATETIME,
      lastAttemptAt DATETIME,
      createdAt DATETIME,
      updatedAt DATETIME
    )`, results);
    // Caixa de entrada do gateway SMS (respostas recebidas)
    yield createTableIfMissing("sms_gateway_inbox", `CREATE TABLE IF NOT EXISTS sms_gateway_inbox (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      deviceId VARCHAR(120) NOT NULL,
      senderPhone VARCHAR(30),
      receiverPhone VARCHAR(30),
      messageBody TEXT NOT NULL,
      receivedAt DATETIME NOT NULL,
      contentHash VARCHAR(64) NOT NULL UNIQUE,
      createdAt DATETIME,
      updatedAt DATETIME
    )`, results);
    yield addColumnIfMissing("whatsapp_messages", "customerId", "INTEGER NULL", results);
    yield addColumnIfMissing("sms_queue", "customerId", "INTEGER NULL", results);
    // ==================== RECONCILIAÇÃO ====================
    // Preenche a nova chave usando a relação legada apenas quando existe uma
    // correspondência inequívoca dentro da mesma empresa.
    const backfillCustomerIds = (table) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield db_1.db.query(`
        UPDATE \`${table}\` target
        INNER JOIN customers customer
          ON customer.companyId = target.companyId
         AND CAST(customer.accountNumber AS CHAR) = CAST(target.accountNumber AS CHAR)
        SET target.customerId = customer.id
        WHERE target.customerId IS NULL
      `);
            console.log(`[Migration] customerId reconciliado em ${table}`);
        }
        catch (error) {
            results.errors.push(`BACKFILL ${table}.customerId: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            console.error(`[Migration] Erro ao reconciliar ${table}.customerId:`, (error === null || error === void 0 ? void 0 : error.message) || error);
        }
    });
    yield backfillCustomerIds("customer_loans");
    yield backfillCustomerIds("amortization_loans");
    yield backfillCustomerIds("tranzactions");
    yield backfillCustomerIds("customer_documents");
    yield backfillCustomerIds("debts");
    yield backfillCustomerIds("whatsapp_messages");
    yield backfillCustomerIds("sms_queue");
    // ==================== CONSTRAINTS ====================
    yield dropForeignKeyIfExists("accounts", "fk_accounts_customer", results);
    yield dropForeignKeyIfExists("customer_loans", "fk_loans_account", results);
    yield dropForeignKeyIfExists("amortization_loans", "fk_amortization_account", results);
    yield dropForeignKeyIfExists("tranzactions", "fk_transactions_account", results);
    yield dropForeignKeyIfExists("customer_documents", "fk_documents_account", results);
    yield dropColumnIfExists("accounts", "customerId", results);
    yield dropColumnIfExists("customer_loans", "accountId", results);
    yield dropColumnIfExists("amortization_loans", "accountId", results);
    yield dropColumnIfExists("tranzactions", "accountId", results);
    yield dropColumnIfExists("customer_documents", "accountId", results);
    yield dropColumnIfExists("whatsapp_messages", "accountId", results);
    yield dropColumnIfExists("sms_queue", "accountId", results);
    yield addUniqueIndexIfMissing("accounts", "uq_accounts_company_number", ["companyId", "accountNumber"], results);
    yield addForeignKeyIfMissing("accounts", "fk_accounts_company", "companyId", "companies", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("customer_loans", "fk_loans_company", "companyId", "companies", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("customer_loans", "fk_loans_customer", "customerId", "customers", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("amortization_loans", "fk_amortization_loan", "loanId", "customer_loans", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("amortization_loans", "fk_amortization_customer", "customerId", "customers", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("tranzactions", "fk_transactions_installment", "amortizationLoanId", "amortization_loans", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("tranzactions", "fk_transactions_loan", "loanId", "customer_loans", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("tranzactions", "fk_transactions_customer", "customerId", "customers", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("customer_documents", "fk_documents_customer", "customerId", "customers", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("debts", "fk_debts_company", "companyId", "companies", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("debts", "fk_debts_customer", "customerId", "customers", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("debts", "fk_debts_loan", "loanId", "customer_loans", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("debts", "fk_debts_installment", "amortisationId", "amortization_loans", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("loan_guarantees", "fk_guarantees_loan", "loanId", "customer_loans", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("notifications", "fk_notifications_user", "userId", "users", "id", "SET NULL", results);
    yield addForeignKeyIfMissing("notifications", "fk_notifications_customer", "customerId", "customers", "id", "SET NULL", results);
    yield addForeignKeyIfMissing("districts", "fk_districts_province", "provinceId", "provinces", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("companies", "fk_companies_district", "districtId", "districts", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("companies", "fk_companies_province", "provinceId", "provinces", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("interest_rates", "fk_interest_rates_company", "companyId", "companies", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("customers", "fk_customers_interest_rate", "interestRateId", "interest_rates", "id", "SET NULL", results);
    yield addForeignKeyIfMissing("users", "fk_users_company", "companyId", "companies", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("user_logs", "fk_user_logs_company", "companyId", "companies", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("user_logs", "fk_user_logs_user", "userId", "users", "id", "RESTRICT", results);
    // ==================== CAIXA DIÁRIO (módulo isolado) ====================
    // Tabelas novas — não alteram nenhuma tabela existente. A tabela `accounts`
    // continua a ser apenas a conta bancária dos contratos (bankAccount), sem
    // ligação com o fluxo de caixa.
    yield createTableIfMissing("cash_registers", `CREATE TABLE IF NOT EXISTS cash_registers (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      companyId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      opening_date VARCHAR(10) NOT NULL,
      opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_in DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_out DECIMAL(15,2) NOT NULL DEFAULT 0,
      status ENUM('ABERTO','FECHADO') NOT NULL DEFAULT 'ABERTO',
      closing_balance_informed DECIMAL(15,2) NULL,
      closing_balance_calculated DECIMAL(15,2) NULL,
      difference DECIMAL(15,2) NULL,
      closed_at DATETIME NULL,
      closedBy INTEGER NULL,
      createdAt DATETIME,
      updatedAt DATETIME,
      INDEX idx_cash_registers_company_status (companyId, status)
    )`, results);
    yield createTableIfMissing("cash_movements", `CREATE TABLE IF NOT EXISTS cash_movements (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      companyId INTEGER NOT NULL,
      cashRegisterId INTEGER NOT NULL,
      type ENUM('ENTRADA','SAIDA') NOT NULL,
      category ENUM('DESEMBOLSO','REEMBOLSO','JUROS_MORA','TAXA_ADMIN','INTERNET','LUZ','AGUA','COMBUSTIVEL','RENTABILIDADE','SALARIOS','REUNIAO','TRANSPORTE','OUTROS') NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      description VARCHAR(255) NOT NULL,
      loanId INTEGER NULL,
      amortizationLoanId INTEGER NULL,
      tranzactionId INTEGER NULL,
      customerId INTEGER NULL,
      isAutomatic BOOLEAN NOT NULL DEFAULT 0,
      createdBy INTEGER NULL,
      createdAt DATETIME,
      updatedAt DATETIME,
      INDEX idx_cash_movements_register (cashRegisterId),
      INDEX idx_cash_movements_tranzaction (tranzactionId)
    )`, results);
    // Regra de negócio: 1 caixa ABERTO por utilizador, por dia e por empresa.
    // O índice único inclui o status para permitir histórico de vários dias
    // (reabrir caixa noutro dia continua permitido).
    yield addUniqueIndexIfMissing("cash_registers", "uq_cash_registers_user_day_company", ["userId", "opening_date", "companyId", "status"], results);
    // ==================== CAIXA CENTRAL / TESOURARIA ====================
    // A tabela `accounts` passa a ser CARTEIRA REAL (saldo por banco) mantendo
    // a sua função anterior nos contratos. Migration é ALTER (nunca DROP) —
    // nenhum dado existente é apagado.
    // --- accounts: novas colunas de carteira real ---
    yield addColumnIfMissing("accounts", "bank_name", "VARCHAR(100) NOT NULL DEFAULT '' AFTER accountDescription", results);
    yield addColumnIfMissing("accounts", "bank_code", "VARCHAR(20) NULL AFTER bank_name", results);
    // Saldo real actual — gerido EXCLUSIVAMENTE pelo treasuryService.
    yield addColumnIfMissing("accounts", "balance", "DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER bank_code", results);
    yield addColumnIfMissing("accounts", "initial_balance", "DECIMAL(15,2) NULL DEFAULT 0.00 AFTER balance", results);
    yield addColumnIfMissing("accounts", "purpose", "ENUM('REEMBOLSO','DESEMBOLSO','MISTO','TAXAS','RESERVA') NOT NULL DEFAULT 'MISTO' AFTER initial_balance", results);
    yield addColumnIfMissing("accounts", "type", "ENUM('BANCO','CAIXA_FISICO','MOBILE_MONEY','EWALLET') NOT NULL DEFAULT 'BANCO' AFTER purpose", results);
    yield addColumnIfMissing("accounts", "is_default_reembolso", "TINYINT(1) NOT NULL DEFAULT 0 AFTER type", results);
    yield addColumnIfMissing("accounts", "is_default_desembolso", "TINYINT(1) NOT NULL DEFAULT 0 AFTER is_default_reembolso", results);
    yield addColumnIfMissing("accounts", "is_active", "TINYINT(1) NOT NULL DEFAULT 1 AFTER is_default_desembolso", results);
    yield addColumnIfMissing("accounts", "currency", "VARCHAR(3) NOT NULL DEFAULT 'MZN' AFTER is_active", results);
    yield addIndexIfMissing("accounts", "idx_company_purpose_active", ["companyId", "purpose", "is_active"], results);
    // Seed one-time do registo id=1 (FNB): corre apenas enquanto bank_name estiver
    // vazio — restarts seguintes NUNCA reescrevem o saldo já movimentado.
    try {
        if (yield hasColumn("accounts", "bank_name")) {
            const [seeded] = yield db_1.db.query("SELECT id FROM `accounts` WHERE id = 1 AND (bank_name IS NULL OR bank_name = '')");
            if (seeded.length > 0) {
                yield db_1.db.query("UPDATE `accounts` SET bank_name = 'FNB', purpose = 'MISTO', is_default_reembolso = 1, is_default_desembolso = 1, balance = 0, is_active = 1 WHERE id = 1");
                results.applied += 1;
                console.log("[Migration] accounts id=1 actualizado (FNB, MISTO, defaults)");
            }
        }
    }
    catch (error) {
        results.errors.push(`SEED accounts#1: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    // --- cash_registers: colunas do Caixa Central (CASH vs BANK) ---
    yield addColumnIfMissing("cash_registers", "opening_time", "DATETIME NULL", results);
    yield addColumnIfMissing("cash_registers", "closing_time", "DATETIME NULL", results);
    yield addColumnIfMissing("cash_registers", "total_cash_in", "DECIMAL(15,2) NOT NULL DEFAULT 0", results);
    yield addColumnIfMissing("cash_registers", "total_cash_out", "DECIMAL(15,2) NOT NULL DEFAULT 0", results);
    yield addColumnIfMissing("cash_registers", "total_bank_in", "DECIMAL(15,2) NOT NULL DEFAULT 0", results);
    yield addColumnIfMissing("cash_registers", "total_bank_out", "DECIMAL(15,2) NOT NULL DEFAULT 0", results);
    yield addColumnIfMissing("cash_registers", "notes", "TEXT NULL", results);
    // --- cash_movements: método de pagamento + conta bancária + referência ---
    yield addColumnIfMissing("cash_movements", "bankAccountId", "INTEGER NULL", results);
    yield addColumnIfMissing("cash_movements", "paymentMethod", "ENUM('CASH','BANK','MPESA','EMOLA') NOT NULL DEFAULT 'CASH'", results);
    yield addColumnIfMissing("cash_movements", "referenceType", "VARCHAR(50) NULL", results);
    yield addColumnIfMissing("cash_movements", "referenceId", "INTEGER NULL", results);
    // O ENUM de categorias passa a incluir movimentos bancários (superset —
    // mantém todos os valores antigos para não quebrar dados existentes).
    yield modifyColumnType("cash_movements", "category", "ENUM('DESEMBOLSO','REEMBOLSO','JUROS_MORA','TAXA_ADMIN','DEPOSITO_BANCO','LEVANTAMENTO_BANCO','TRANSFERENCIA','INTERNET','LUZ','AGUA','COMBUSTIVEL','RENTABILIDADE','SALARIOS','SALARIO','REUNIAO','TRANSPORTE','MATERIAL','OUTROS') NOT NULL", results);
    // --- bank_transactions: extrato real de cada conta bancária ---
    yield createTableIfMissing("bank_transactions", `CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      companyId INTEGER NOT NULL,
      accountId INTEGER NOT NULL,
      cashRegisterId INTEGER NULL,
      type ENUM('ENTRADA','SAIDA') NOT NULL,
      category ENUM('REEMBOLSO_BANCO','DESEMBOLSO_BANCO','DEPOSITO_CAIXA','LEVANTAMENTO_BANCO','TAXA_BANCARIA','ESTORNO','OUTROS') NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      balanceAfter DECIMAL(15,2) NOT NULL DEFAULT 0,
      description VARCHAR(255) NOT NULL,
      referenceType VARCHAR(50) NULL,
      referenceId INTEGER NULL,
      createdBy INTEGER NULL,
      createdAt DATETIME,
      updatedAt DATETIME,
      INDEX idx_bank_transactions_account (accountId, createdAt),
      INDEX idx_bank_transactions_register (cashRegisterId)
    )`, results);
    // ==================== CONTA DE COLECTA M-PESA (portal do mutuário) ====================
    // Toda empresa precisa de uma conta MOBILE_MONEY para receber os pagamentos
    // iniciados no portal do cliente. Se não tiver nenhuma, cria uma por defeito
    // (número placeholder editável nas Configurações → Contas Bancárias).
    try {
        if (yield hasColumn("accounts", "type")) {
            const companies = (yield db_1.db.query("SELECT id FROM companies"))[0];
            for (const company of companies) {
                const companyId = Number(company.id);
                const [existing] = yield db_1.db.query("SELECT id FROM `accounts` WHERE companyId = ? AND type = 'MOBILE_MONEY' LIMIT 1", { replacements: [companyId] });
                if (existing.length > 0)
                    continue;
                // Nome da empresa para a descrição (best-effort)
                let companyName = `Empresa ${companyId}`;
                try {
                    const [cRows] = yield db_1.db.query("SELECT companyName FROM companies WHERE id = ?", { replacements: [companyId] });
                    const cName = ((_f = cRows[0]) === null || _f === void 0 ? void 0 : _f.companyName) || ((_g = cRows[0]) === null || _g === void 0 ? void 0 : _g.companyName1);
                    if (cName)
                        companyName = String(cName);
                }
                catch ( /* usa o fallback */_s) { /* usa o fallback */ }
                yield db_1.db.query(`INSERT INTO accounts
             (companyId, accountNumber, accountDescription, accountHolder, bank_name, bank_code,
              balance, initial_balance, purpose, type, is_default_reembolso, is_default_desembolso,
              is_active, currency, createdBy, updatedBy, createdAt, updatedAt)
           VALUES
             (?, '258840000000', 'Colecta M-Pesa (portal)', ?, 'M-Pesa', NULL,
              0, 0, 'REEMBOLSO', 'MOBILE_MONEY', 1, 0,
              1, 'MZN', 'sistema', 'sistema', NOW(), NOW())`, { replacements: [companyId, companyName] });
                results.applied += 1;
                console.log(`[Migration] Conta de colecta M-Pesa criada para a empresa ${companyId} (${companyName})`);
            }
        }
    }
    catch (error) {
        results.errors.push(`SEED conta M-Pesa: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error("[Migration] Erro ao criar conta de colecta M-Pesa:", (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    // ==================== REPARAÇÃO: TOTAIS DOS CAIXAS (bug de persistência) ====================
    // Bug histórico: recalculateRegisterTotals gravava chaves camelCase (totalIn,
    // totalCashIn, ...) num modelo com colunas snake_case (total_in, total_cash_in,
    // ...) — o update estático do Sequelize descartava as chaves desconhecidas e
    // os totais NUNCA eram persistidos (ficavam a 0 mesmo com movimentos).
    // Reparação one-time idempotente: recalcula os 6 totais de TODOS os caixas a
    // partir de cash_movements (fonte de verdade) e corrige fechos concluídos.
    try {
        if ((yield hasTable("cash_registers")) && (yield hasColumn("cash_registers", "total_cash_in"))) {
            const [fixed] = yield db_1.db.query(`UPDATE cash_registers cr
         LEFT JOIN (
           SELECT
             cashRegisterId,
             SUM(CASE WHEN type = 'ENTRADA' THEN amount ELSE 0 END) AS tin,
             SUM(CASE WHEN type = 'SAIDA'  THEN amount ELSE 0 END) AS tout,
             SUM(CASE WHEN type = 'ENTRADA' AND paymentMethod = 'CASH' THEN amount ELSE 0 END) AS cin,
             SUM(CASE WHEN type = 'SAIDA'  AND paymentMethod = 'CASH' THEN amount ELSE 0 END) AS cout,
             SUM(CASE WHEN type = 'ENTRADA' AND paymentMethod <> 'CASH' THEN amount ELSE 0 END) AS bin,
             SUM(CASE WHEN type = 'SAIDA'  AND paymentMethod <> 'CASH' THEN amount ELSE 0 END) AS bout
           FROM cash_movements
           GROUP BY cashRegisterId
         ) m ON m.cashRegisterId = cr.id
         SET
           cr.total_in      = ROUND(IFNULL(m.tin, 0), 2),
           cr.total_out     = ROUND(IFNULL(m.tout, 0), 2),
           cr.total_cash_in  = ROUND(IFNULL(m.cin, 0), 2),
           cr.total_cash_out = ROUND(IFNULL(m.cout, 0), 2),
           cr.total_bank_in  = ROUND(IFNULL(m.bin, 0), 2),
           cr.total_bank_out = ROUND(IFNULL(m.bout, 0), 2),
           cr.closing_balance_calculated = IF(cr.status = 'FECHADO',
             ROUND(IFNULL(cr.opening_balance, 0) + IFNULL(m.cin, 0) - IFNULL(m.cout, 0), 2),
             cr.closing_balance_calculated),
           cr.difference = IF(cr.status = 'FECHADO' AND cr.closing_balance_informed IS NOT NULL,
             ROUND(cr.closing_balance_informed - (IFNULL(cr.opening_balance, 0) + IFNULL(m.cin, 0) - IFNULL(m.cout, 0)), 2),
             cr.difference)`);
            const affected = Number(fixed === null || fixed === void 0 ? void 0 : fixed.affectedRows) || 0;
            if (affected > 0) {
                results.applied += 1;
                console.log(`[Migration] Totais de ${affected} caixa(s) recalculados a partir de cash_movements (reparação do bug de persistência)`);
            }
        }
    }
    catch (error) {
        results.errors.push(`REPARAÇÃO totais caixa: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error("[Migration] Erro ao reparar totais dos caixas:", (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    // ==================== CARTEIRAS DE FINANCIAMENTO (DINHEIRO ANALÍTICO) ====================
    // Duas camadas de dinheiro: REAL (accounts purpose DESEMBOLSO/REEMBOLSO) e
    // ANALÍTICO (financing_wallets). Esta tabela NÃO guarda dinheiro físico —
    // serve de base de análise e para separar o relatório de cada financiador.
    //
    // SEED OPT-IN — o ARRANQUE (app.ts/PM2/Docker) NUNCA povoa carteiras:
    // na produção as carteiras já foram migradas na base de dados e são geridas
    // pelo Admin. Só corre o seed quando alguém pede explicitamente, uma vez,
    // num servidor novo e vazio:
    //   WALLET_MIGRATION=1 npm run migrate
    // SKIP_WALLET_MIGRATION=1 mantém-se aceite (compatibilidade com deploy.sh).
    const walletMigrationDisabled = String(process.env.SKIP_WALLET_MIGRATION || "").trim() === "1"
        || !["1", "true"].includes(String(process.env.WALLET_MIGRATION || "").trim().toLowerCase());
    yield createTableIfMissing("financing_wallets", `CREATE TABLE IF NOT EXISTS financing_wallets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      companyId INT NOT NULL,
      codigo VARCHAR(20) NOT NULL,
      nome VARCHAR(100) NOT NULL,
      descricao TEXT NULL,
      tipo ENUM('FINANCIAMENTO') NOT NULL DEFAULT 'FINANCIAMENTO',
      parceiro_nome VARCHAR(100) NULL,
      is_parceiro_externo TINYINT(1) NOT NULL DEFAULT 0,
      parceiro_email VARCHAR(100) NULL,
      parceiro_nuit VARCHAR(20) NULL,
      parceiro_contacto VARCHAR(20) NULL,
      allocated_amount DECIMAL(15,2) NULL,
      initial_disbursed_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      taxa_juro DECIMAL(8,4) NULL,
      cor_badge VARCHAR(20) NULL DEFAULT 'blue',
      is_ativa TINYINT(1) NOT NULL DEFAULT 1,
      tem_portal TINYINT(1) NOT NULL DEFAULT 0,
      portal_ativo TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT NULL,
      created_at DATETIME NULL,
      updated_at DATETIME NULL,
      UNIQUE KEY unique_codigo_company (companyId, codigo),
      INDEX idx_financing_wallets_company_active (companyId, is_ativa)
    )`, results);
    // ==================== RECIBOS (NUMERAÇÃO SEQUENCIAL LEGAL — AT MOÇAMBIQUE) ====================
    yield createTableIfMissing("recibos", `CREATE TABLE IF NOT EXISTS recibos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      companyId INT NOT NULL,
      numero VARCHAR(50) NOT NULL,
      serie VARCHAR(20) NOT NULL DEFAULT 'REC',
      sequencia INT NOT NULL,
      ano INT NOT NULL,
      tranzactionId INT NULL,
      loanId INT NULL,
      customerId INT NULL,
      walletId INT NULL,
      customer_name VARCHAR(255) NULL,
      customer_nuit VARCHAR(30) NULL,
      customer_account VARCHAR(60) NULL,
      wallet_nome VARCHAR(100) NULL,
      metodo_pagamento VARCHAR(30) NULL,
      referencia VARCHAR(100) NULL,
      valor_pago DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      valor_capital DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      valor_juros DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      valor_mora DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      valor_desconto DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      saldo_restante DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      pdf_url VARCHAR(255) NULL,
      created_by INT NULL,
      created_at DATETIME NULL,
      updated_at DATETIME NULL,
      UNIQUE KEY unique_numero (numero),
      UNIQUE KEY unique_numero_company_ano (companyId, ano, sequencia),
      INDEX idx_recibos_loan (loanId),
      INDEX idx_recibos_wallet (walletId),
      INDEX idx_recibos_tranzaction (tranzactionId)
    )`, results);
    // Contador por empresa/ano — reservado com SELECT ... FOR UPDATE para que a
    // numeração legal nunca tenha saltos (ver services/reciboService.ts).
    yield createTableIfMissing("recibos_sequencia", `CREATE TABLE IF NOT EXISTS recibos_sequencia (
      companyId INT NOT NULL,
      ano INT NOT NULL,
      ultima_sequencia INT NOT NULL DEFAULT 0,
      PRIMARY KEY (companyId, ano)
    )`, results);
    // BACKFILL do contador: num servidor com recibos já emitidos mas SEM linha
    // na tabela de sequência (ex.: migração de base de dados antiga), o contador
    // a zero reiniciaria a numeração em REC-YYYY-00001 e DUPLICARIA números.
    // Sincroniza o contador com o maior sequencia REAL por empresa/ano — só
    // actua quando o contador está abaixo do máximo emitido (nunca recua).
    try {
        if (yield hasTable("recibos")) {
            const [recalcs] = yield db_1.db.query(`UPDATE recibos_sequencia s
           JOIN (
             SELECT companyId, ano, MAX(sequencia) AS max_seq
             FROM recibos
             GROUP BY companyId, ano
           ) r ON r.companyId = s.companyId AND r.ano = s.ano
           SET s.ultima_sequencia = r.max_seq
           WHERE s.ultima_sequencia < r.max_seq`);
            const n = Number((_h = recalcs === null || recalcs === void 0 ? void 0 : recalcs.affectedRows) !== null && _h !== void 0 ? _h : 0);
            if (n > 0)
                console.log(`[Migration] Contador de recibos sincronizado: ${n} contador(es) avançado(s) para o máximo já emitido.`);
            // Contador em falta para pares empresa/ano que JÁ têm recibos emitidos
            // (tabela acabada de criar neste arranque): cria já no máximo real.
            const [inserted] = yield db_1.db.query(`INSERT IGNORE INTO recibos_sequencia (companyId, ano, ultima_sequencia)
         SELECT companyId, ano, MAX(sequencia) FROM recibos GROUP BY companyId, ano`);
            const n2 = Number((_j = inserted === null || inserted === void 0 ? void 0 : inserted.affectedRows) !== null && _j !== void 0 ? _j : 0);
            if (n2 > 0)
                console.log(`[Migration] ${n2} contador(es) de recibos criado(s) já sincronizados com os recibos existentes.`);
        }
    }
    catch (error) {
        const msg = `[Migration] Backfill do contador de recibos falhou: ${(error === null || error === void 0 ? void 0 : error.message) || error}`;
        results.errors.push(msg);
        console.error(msg);
    }
    // --- colunas das carteiras analíticas nas entidades existentes ---
    yield addColumnIfMissing("users", "walletId", "INTEGER NULL", results);
    yield addColumnIfMissing("users", "is_parceiro", "TINYINT(1) NOT NULL DEFAULT 0", results);
    yield addColumnIfMissing("interest_rates", "walletId", "INTEGER NULL", results);
    // A taxa pode estar ligada a uma CONTA DE DESEMBOLSO (dinheiro real) em vez
    // de uma carteira analítica — nunca às duas ao mesmo tempo.
    yield addColumnIfMissing("interest_rates", "accountId", "INTEGER NULL", results);
    yield addColumnIfMissing("customer_loans", "walletId", "INTEGER NULL", results);
    yield addColumnIfMissing("tranzactions", "walletId", "INTEGER NULL", results);
    yield addColumnIfMissing("tranzactions", "mora_amount", "DECIMAL(15,2) NOT NULL DEFAULT 0.00", results);
    yield addColumnIfMissing("amortization_loans", "walletId", "INTEGER NULL", results);
    yield addColumnIfMissing("amortization_loans", "mora_amount", "DECIMAL(15,2) NOT NULL DEFAULT 0.00", results);
    yield addColumnIfMissing("amortization_loans", "mora_days", "INTEGER NOT NULL DEFAULT 0", results);
    // --- SELO ELECTRÓNICO DO RECIBO (hash AT + QR Code) ---
    yield addColumnIfMissing("recibos", "hash_at", "VARCHAR(128) NULL", results);
    yield addColumnIfMissing("recibos", "qr_code_url", "VARCHAR(255) NULL", results);
    yield addColumnIfMissing("recibos", "qr_content", "TEXT NULL", results);
    yield addColumnIfMissing("recibos", "at_validation_code", "VARCHAR(50) NULL", results);
    yield addColumnIfMissing("recibos", "software_certification", "VARCHAR(100) NULL", results);
    yield addColumnIfMissing("recibos", "metodo_pagamento_desc", "VARCHAR(100) NULL", results);
    yield addIndexIfMissing("recibos", "idx_recibos_hash_at", ["hash_at"], results);
    yield addIndexIfMissing("users", "idx_users_walletId", ["walletId"], results);
    yield addIndexIfMissing("interest_rates", "idx_interest_rates_walletId", ["walletId"], results);
    yield addIndexIfMissing("interest_rates", "idx_interest_rates_accountId", ["accountId"], results);
    yield addIndexIfMissing("customer_loans", "idx_customer_loans_walletId", ["walletId"], results);
    yield addIndexIfMissing("tranzactions", "idx_tranzactions_walletId", ["walletId"], results);
    yield addIndexIfMissing("amortization_loans", "idx_amortization_walletId", ["walletId"], results);
    yield addForeignKeyIfMissing("financing_wallets", "fk_financing_wallets_company", "companyId", "companies", "id", "RESTRICT", results);
    yield addForeignKeyIfMissing("users", "fk_users_wallet", "walletId", "financing_wallets", "id", "SET NULL", results);
    yield addForeignKeyIfMissing("interest_rates", "fk_interest_rates_wallet", "walletId", "financing_wallets", "id", "SET NULL", results);
    yield addForeignKeyIfMissing("interest_rates", "fk_interest_rates_account", "accountId", "accounts", "id", "SET NULL", results);
    yield addForeignKeyIfMissing("customer_loans", "fk_loans_wallet", "walletId", "financing_wallets", "id", "SET NULL", results);
    yield addForeignKeyIfMissing("tranzactions", "fk_transactions_wallet", "walletId", "financing_wallets", "id", "SET NULL", results);
    yield addForeignKeyIfMissing("amortization_loans", "fk_amortization_wallet", "walletId", "financing_wallets", "id", "SET NULL", results);
    yield addForeignKeyIfMissing("recibos", "fk_recibos_company", "companyId", "companies", "id", "RESTRICT", results);
    // --- SEED: 5 carteiras analíticas para cada empresa (idempotente) ---
    // KMAD é a única carteira de parceiro externo com portal; as restantes são
    // fundos próprios MBRM (PME 12%, Comunidades 9%, Interno 8% e 10%).
    const WALLET_SEED = [
        [
            "KMAD",
            "Desembolso no âmbito da parceria com a KMAD",
            "Clientes financiados em parceria com a KMAD. Capital inicial 2.195.000 MT, dos quais 660.000 MT já desembolsados. Refere-se aos clientes financiados em parceria com a KMAD.",
            "KMAD",
            1,
            "relatorios@kmad.co.mz",
            2195000,
            660000,
            "blue",
            1,
        ],
        ["PME_12", "Desembolso no âmbito das PME's - MBR / 12%", "Fundo próprio MBRM para PME's - Taxa 12%", null, 0, null, null, 0, "orange", 0],
        ["COM_9", "Desembolso no âmbito das Comunidades - MBR - 9%", "Fundo social (taxa bonificada) para comunidades - Taxa 9%", null, 0, null, null, 0, "green", 0],
        ["INT_8", "Desembolsos no âmbito Interno - 8%", "Fundo interno taxa 8% - funcionários/colaboradores", null, 0, null, null, 0, "grey", 0],
        ["INT_10", "Desembolsos no âmbito Interno - 10%", "Fundo interno taxa 10% - geral", null, 0, null, null, 0, "grey", 0],
    ];
    // Taxa esperada por código de carteira (usada também para pré-seleccionar
    // taxas de juro no formulário de crédito).
    const WALLET_TAX = {
        KMAD: null,
        PME_12: 0.12,
        COM_9: 0.09,
        INT_8: 0.08,
        INT_10: 0.1,
    };
    try {
        if (!walletMigrationDisabled && (yield hasTable("financing_wallets"))) {
            const companies = (yield db_1.db.query("SELECT id FROM companies"))[0];
            // Só povoa empresas que AINDA NÃO têm NENHUMA carteira — a carteira de
            // uma empresa já configurada pelo Admin (ex.: produção) fica intacta
            // mesmo sem SKIP_WALLET_MIGRATION.
            const empresasSemCarteiras = new Set((yield db_1.db.query(`SELECT c.id FROM companies c
            WHERE NOT EXISTS (SELECT 1 FROM financing_wallets f WHERE f.companyId = c.id)`))[0].map((row) => Number(row.id)));
            let seededWallets = 0;
            for (const company of companies) {
                const companyId = Number(company.id);
                if (!empresasSemCarteiras.has(companyId))
                    continue;
                for (const [codigo, nome, descricao, parceiro, isParceiro, email, alocado, inicial, cor, portal] of WALLET_SEED) {
                    const [existing] = yield db_1.db.query("SELECT id FROM financing_wallets WHERE companyId = ? AND codigo = ? LIMIT 1", { replacements: [companyId, codigo] });
                    if (existing.length > 0)
                        continue;
                    yield db_1.db.query(`INSERT INTO financing_wallets
               (companyId, codigo, nome, descricao, tipo, parceiro_nome, is_parceiro_externo,
                parceiro_email, allocated_amount, initial_disbursed_amount, taxa_juro,
                cor_badge, is_ativa, tem_portal, portal_ativo, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'FINANCIAMENTO', ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW(), NOW())`, {
                        replacements: [
                            companyId, codigo, nome, descricao, parceiro, isParceiro,
                            email, alocado, inicial, WALLET_TAX[codigo], cor, portal, portal,
                        ],
                    });
                    seededWallets += 1;
                }
            }
            if (seededWallets > 0) {
                results.applied += 1;
                console.log(`[Migration] ${seededWallets} carteira(s) de financiamento criadas (KMAD, PME_12, COM_9, INT_8, INT_10)`);
            }
            else {
                results.skipped += 1;
            }
            // --- SEED: utilizador parceiro financiador (userRole 4) para a KMAD ---
            // Apenas na empresa operacional (a que tem créditos); as restantes
            // empresas criam o seu parceiro pelo Admin.
            let partnerCompanyId = null;
            try {
                const [byLoans] = yield db_1.db.query("SELECT companyId, COUNT(*) AS total FROM customer_loans GROUP BY companyId ORDER BY total DESC LIMIT 1");
                partnerCompanyId = Number((_k = byLoans[0]) === null || _k === void 0 ? void 0 : _k.companyId) || null;
            }
            catch ( /* tabela pode não existir */_t) { /* tabela pode não existir */ }
            if (!partnerCompanyId) {
                const [byName] = yield db_1.db.query("SELECT id FROM companies WHERE companyName LIKE '%Mola%' ORDER BY id ASC LIMIT 1");
                partnerCompanyId = Number((_l = byName[0]) === null || _l === void 0 ? void 0 : _l.id) || Number((_m = companies[0]) === null || _m === void 0 ? void 0 : _m.id) || null;
            }
            if (partnerCompanyId && !walletMigrationDisabled) {
                const [walletRows] = yield db_1.db.query("SELECT id, tem_portal FROM financing_wallets WHERE companyId = ? AND codigo = 'KMAD' LIMIT 1", { replacements: [partnerCompanyId] });
                const kmadWalletId = Number((_o = walletRows[0]) === null || _o === void 0 ? void 0 : _o.id) || null;
                if (kmadWalletId) {
                    const [partnerUser] = yield db_1.db.query("SELECT id FROM users WHERE email = 'parceiro@kmad.co.mz' AND companyId = ? LIMIT 1", { replacements: [partnerCompanyId] });
                    if (partnerUser.length === 0) {
                        const bcryptjs = require("bcryptjs");
                        const hash = bcryptjs.hashSync("Mbrm@2025", 10);
                        yield db_1.db.query(`INSERT INTO users
                 (name, email, password, updatedPassword, phone, companyId, status, userRole,
                  walletId, is_parceiro, is_active, credentialsSent, createdAt, updatedAt)
               VALUES
                 ('Parceiro KMAD', 'parceiro@kmad.co.mz', ?, 0, '+258840000000', ?, 1, 4,
                  ?, 1, 1, 0, NOW(), NOW())`, { replacements: [hash, partnerCompanyId, kmadWalletId] });
                        results.applied += 1;
                        console.log(`[Migration] Parceiro financiador KMAD criado (parceiro@kmad.co.mz, userRole 4) na empresa ${partnerCompanyId}`);
                    }
                    else {
                        // Garante que uma conta já existente tem a carteira e o papel correctos.
                        yield db_1.db.query(`UPDATE users SET userRole = 4, walletId = ?, is_parceiro = 1
               WHERE email = 'parceiro@kmad.co.mz' AND companyId = ?`, { replacements: [kmadWalletId, partnerCompanyId] });
                        results.skipped += 1;
                    }
                }
            }
        }
    }
    catch (error) {
        results.errors.push(`SEED carteiras financiamento: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error("[Migration] Erro ao criar carteiras de financiamento:", (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    // --- NORMALIZAÇÃO DE CHARSET (legado latin1 → utf8mb4) ---
    // As tabelas criadas no início do projecto ficaram em latin1_swedish_ci. Com
    // a conexão em utf8mb4, gravar texto acentuado falha com
    // "Conversion from collation utf8mb4_unicode_ci into latin1_swedish_ci
    // impossible for parameter" — era isto que impedia guardar a vinculação de
    // uma taxa de juro com nome acentuado (ex.: "Habitação"). A conversão
    // latin1 → utf8mb4 preserva os dados (cada byte latin1 é um code point).
    try {
        const [tabelasLatin1] = yield db_1.db.query(`SELECT TABLE_NAME FROM information_schema.tables
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_COLLATION NOT LIKE 'utf8mb4%'
          AND TABLE_TYPE = 'BASE TABLE'`);
        let convertidas = 0;
        for (const row of tabelasLatin1) {
            const tabela = String(row.TABLE_NAME || "");
            if (!/^[A-Za-z0-9_]+$/.test(tabela))
                continue;
            try {
                yield db_1.db.query(`ALTER TABLE \`${tabela}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
                convertidas += 1;
            }
            catch (tableError) {
                results.errors.push(`CHARSET ${tabela}: ${(tableError === null || tableError === void 0 ? void 0 : tableError.message) || tableError}`);
            }
        }
        if (convertidas > 0) {
            results.applied += 1;
            console.log(`[Migration] ${convertidas} tabela(s) convertidas para utf8mb4 (texto acentuado passa a gravar)`);
        }
        else {
            results.skipped += 1;
        }
    }
    catch (error) {
        results.errors.push(`CHARSET: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error("[Migration] Erro ao normalizar o charset:", (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    // --- BACKFILL: origem do capital das taxas de juro legadas ---
    // As taxas criadas antes das carteiras analíticas ficaram sem origem. Aqui
    // ligam-se por palavra-chave do nome a uma carteira de financiamento e, em
    // último recurso, à conta de desembolso principal da empresa. Corre apenas
    // uma vez por empresa: assim que existir uma taxa vinculada não volta a
    // mexer, para respeitar a escolha do Admin no formulário de taxas.
    try {
        // Backfill de taxas → carteiras: também respeita SKIP_WALLET_MIGRATION
        // (deploy não altera a vinculação existente em produção).
        if (!walletMigrationDisabled && (yield hasTable("financing_wallets")) && (yield hasTable("interest_rates"))) {
            const [jaVinculadas] = yield db_1.db.query("SELECT DISTINCT companyId FROM interest_rates WHERE walletId IS NOT NULL OR accountId IS NOT NULL");
            const empresasTratadas = new Set(jaVinculadas.map((row) => Number(row.companyId)));
            const [pendentes] = yield db_1.db.query(`SELECT ir.id, ir.companyId, ir.name
           FROM interest_rates ir
          WHERE ir.walletId IS NULL AND ir.accountId IS NULL
          ORDER BY ir.companyId, ir.id`);
            // Carteira analítica sugerida pelo nome da taxa (ordem importa).
            const REGRAS_CARTEIRA = [
                [/comunidade/i, "COM_9"],
                [/pme|empres[aá]rio/i, "PME_12"],
                [/fornecedor/i, "INT_10"],
                [/intern|trabalhador|autom[oó]vel|colaborador/i, "INT_8"],
            ];
            const carteirasPorEmpresa = new Map();
            const contasDesembolso = new Map();
            let vinculadas = 0;
            for (const taxa of pendentes) {
                const companyId = Number(taxa.companyId);
                if (empresasTratadas.has(companyId))
                    continue;
                let walletId = null;
                const nome = String(taxa.name || "");
                const regra = REGRAS_CARTEIRA.find(([pattern]) => pattern.test(nome));
                if (regra) {
                    if (!carteirasPorEmpresa.has(companyId)) {
                        const [rows] = yield db_1.db.query("SELECT id, codigo FROM financing_wallets WHERE companyId = ? AND is_ativa = 1", { replacements: [companyId] });
                        const mapa = new Map();
                        rows.forEach((row) => mapa.set(String(row.codigo), Number(row.id)));
                        carteirasPorEmpresa.set(companyId, mapa);
                    }
                    walletId = ((_p = carteirasPorEmpresa.get(companyId)) === null || _p === void 0 ? void 0 : _p.get(regra[1])) || null;
                }
                let accountId = null;
                if (!walletId) {
                    if (!contasDesembolso.has(companyId)) {
                        const [rows] = yield db_1.db.query(`SELECT id FROM accounts
                WHERE companyId = ? AND purpose IN ('DESEMBOLSO', 'MISTO')
                ORDER BY is_default_desembolso DESC, id ASC LIMIT 1`, { replacements: [companyId] });
                        contasDesembolso.set(companyId, Number((_q = rows[0]) === null || _q === void 0 ? void 0 : _q.id) || 0);
                    }
                    accountId = contasDesembolso.get(companyId) || null;
                }
                if (!walletId && !accountId)
                    continue;
                yield db_1.db.query("UPDATE interest_rates SET walletId = ?, accountId = ? WHERE id = ?", {
                    replacements: [walletId, accountId, Number(taxa.id)],
                });
                vinculadas += 1;
            }
            if (vinculadas > 0) {
                results.applied += 1;
                console.log(`[Migration] ${vinculadas} taxa(s) de juro ligadas à origem do capital (carteira ou conta de desembolso)`);
            }
            else {
                results.skipped += 1;
            }
        }
    }
    catch (error) {
        results.errors.push(`BACKFILL taxas de juro: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        console.error("[Migration] Erro ao vincular taxas de juro:", (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    // ==================== PAGAMENTOS V2 — CORE BANCÁRIO ====================
    // Idempotência, auditoria append-only, alocação de pagamentos, motor de
    // mora (regras por empresa + accrual diário) e crédito a favor do cliente.
    yield migratePaymentsV2(results);
    return results;
});
exports.runMigrations = runMigrations;
/**
 * PAGAMENTOS V2 — todas as estruturas novas do módulo de pagamentos.
 * Idempotente: cada bloco verifica a existência antes de criar.
 */
const migratePaymentsV2 = (results) => __awaiter(void 0, void 0, void 0, function* () {
    var _u;
    // ── 1. IDEMPOTÊNCIA — header Idempotency-Key no POST de pagamento ──
    yield createTableIfMissing("idempotency_keys", `CREATE TABLE IF NOT EXISTS idempotency_keys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      idem_key VARCHAR(80) NOT NULL,
      company_id INT NOT NULL,
      user_id INT NULL,
      endpoint VARCHAR(120) NOT NULL,
      response_status INT NULL,
      response_body JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_idem_key (idem_key),
      INDEX idx_idem_created (created_at)
    )`, results);
    // ── 2. AUDITORIA APPEND-ONLY (sem UPDATE/DELETE por convenção do código) ──
    yield createTableIfMissing("audit_log", `CREATE TABLE IF NOT EXISTS audit_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      company_id INT NULL,
      ip VARCHAR(64) NULL,
      action VARCHAR(60) NOT NULL,
      entity VARCHAR(60) NOT NULL,
      entity_id INT NULL,
      before_data JSON NULL,
      after_data JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_entity (entity, entity_id),
      INDEX idx_audit_user (user_id),
      INDEX idx_audit_created (created_at)
    )`, results);
    // ── 3. Colunas novas em tranzactions (quem recebeu, estorno, origem) ──
    yield addColumnIfMissing("tranzactions", "received_by", "INT NULL", results);
    yield addColumnIfMissing("tranzactions", "received_ip", "VARCHAR(64) NULL", results);
    yield addColumnIfMissing("tranzactions", "idem_key", "VARCHAR(80) NULL", results);
    yield addColumnIfMissing("tranzactions", "status", "VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'", results);
    yield addColumnIfMissing("tranzactions", "reversed_by", "INT NULL", results);
    yield addColumnIfMissing("tranzactions", "reversal_reason", "VARCHAR(255) NULL", results);
    yield addColumnIfMissing("tranzactions", "reversed_tranzaction_id", "INT NULL", results);
    yield addIndexIfMissing("tranzactions", "idx_tranz_idem", ["idem_key"], results);
    yield addIndexIfMissing("tranzactions", "idx_tranz_status", ["status"], results);
    // ── 4. Unicidade de referência por empresa + método (anti duplo-registo) ──
    // NOTA: MySQL não suporta índice parcial (WHERE reference IS NOT NULL);
    // strings vazias são convertidas para NULL na normalização e o índice UNIQUE
    // do MySQL ignora linhas com NULL na coluna indexada.
    try {
        yield db_1.db.query("UPDATE tranzactions SET tranzactionReference = NULL WHERE tranzactionReference = ''");
    }
    catch ( /* tabela pode não existir em BD nova */_v) { /* tabela pode não existir em BD nova */ }
    yield addUniqueIndexIfMissing("tranzactions", "uq_tranz_ref", ["companyId", "paymentMethod", "tranzactionReference"], results);
    // ── 5. ALOCAÇÃO DE PAGAMENTOS — para onde foi cada cêntimo ──
    yield createTableIfMissing("payment_allocations", `CREATE TABLE IF NOT EXISTS payment_allocations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      payment_id INT NOT NULL,
      amortization_loan_id INT NOT NULL,
      component ENUM('PENALTY','LATE_INTEREST','INTEREST','CAPITAL') NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_alloc_payment (payment_id),
      INDEX idx_alloc_amort (amortization_loan_id)
    )`, results);
    // ── 6. REGRAS DE MORA POR EMPRESA (motor configurável) ──
    yield createTableIfMissing("company_penalty_rules", `CREATE TABLE IF NOT EXISTS company_penalty_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      forfeit_percent DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
      grace_days INT NOT NULL DEFAULT 0,
      cap_percent DECIMAL(5,2) NOT NULL DEFAULT 100.00,
      base ENUM('INSTALLMENT','OUTSTANDING_BALANCE') NOT NULL DEFAULT 'INSTALLMENT',
      business_days_only TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL,
      UNIQUE KEY uq_penalty_company (company_id)
    )`, results);
    // Seed: 1 regra por empresa, herdando companies.forfeit; grace 0 = comportamento actual.
    try {
        if ((yield hasTable("company_penalty_rules")) && (yield hasTable("companies"))) {
            const [empresasSemRegra] = yield db_1.db.query(`SELECT c.id, c.forfeit FROM companies c
          WHERE NOT EXISTS (SELECT 1 FROM company_penalty_rules r WHERE r.company_id = c.id)`);
            let seeds = 0;
            for (const e of empresasSemRegra) {
                yield db_1.db.query(`INSERT INTO company_penalty_rules
             (company_id, forfeit_percent, grace_days, cap_percent, base, business_days_only, created_at)
           VALUES (?, ?, 0, 100.00, 'INSTALLMENT', 0, NOW())`, { replacements: [Number(e.id), Math.max(0, Math.min(10, Number(e.forfeit) || 0))] });
                seeds += 1;
            }
            if (seeds > 0) {
                results.applied += 1;
                console.log(`[Migration] ${seeds} regra(s) de mora criadas em company_penalty_rules (herdadas de companies.forfeit, grace 0)`);
            }
        }
    }
    catch (error) {
        results.errors.push(`SEED company_penalty_rules: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    // ── 7. ACCRUAL DIÁRIO DE MORA — mora registada, não re-calculada ao vivo ──
    yield createTableIfMissing("late_accruals", `CREATE TABLE IF NOT EXISTS late_accruals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      amortization_loan_id INT NOT NULL,
      accrual_date DATE NOT NULL,
      days INT NOT NULL DEFAULT 1,
      base_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      rate DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      status ENUM('ACCRUED','CHARGED','WAIVED') NOT NULL DEFAULT 'ACCRUED',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_accrual_day (amortization_loan_id, accrual_date),
      INDEX idx_accrual_status (status)
    )`, results);
    // ── 8. CRÉDITO A FAVOR DO CLIENTE (excesso de pagamento nunca é descartado) ──
    yield createTableIfMissing("customer_credits", `CREATE TABLE IF NOT EXISTS customer_credits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      customer_id INT NOT NULL,
      account_number INT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      remaining_amount DECIMAL(15,2) NOT NULL,
      source_payment_id INT NULL,
      status ENUM('ACTIVE','APPLIED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL,
      INDEX idx_credit_customer (company_id, account_number, status)
    )`, results);
    // ── 9. Estorno/risco: recibo ganha estado (EMITIDO/ANULADO) + link ao estorno ──
    yield addColumnIfMissing("recibos", "status", "VARCHAR(20) NOT NULL DEFAULT 'EMITIDO'", results);
    yield addColumnIfMissing("recibos", "annulled_by_recibo_id", "INT NULL", results);
    yield addColumnIfMissing("recibos", "annulment_reason", "VARCHAR(255) NULL", results);
    // ── 10. DATAS REAIS (DATE) — fim das strings 'YYYY-MM-DD HH:MM:SS' ──
    // MySQL converte 'YYYY-MM-DD HH:MM:SS' e 'YYYY-MM-DD' para DATE truncando a
    // hora. Os models passam a DataTypes.DATEONLY (leitura sempre 'YYYY-MM-DD'),
    // eliminando bugs de fuso (GMT+2 Maputo) nos cálculos de mora.
    try {
        yield db_1.db.query("ALTER TABLE `amortization_loans` MODIFY COLUMN `dueDate` DATE NOT NULL");
        results.applied += 1;
        console.log("[Migration] amortization_loans.dueDate convertido para DATE");
    }
    catch (error) {
        if (!String(error === null || error === void 0 ? void 0 : error.message).includes("Unknown column")) {
            results.errors.push(`DATE dueDate: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            console.error("[Migration] dueDate → DATE:", (error === null || error === void 0 ? void 0 : error.message) || error);
        }
    }
    try {
        yield db_1.db.query("ALTER TABLE `tranzactions` MODIFY COLUMN `paymentDate` DATE NOT NULL");
        results.applied += 1;
        console.log("[Migration] tranzactions.paymentDate convertido para DATE");
    }
    catch (error) {
        if (!String(error === null || error === void 0 ? void 0 : error.message).includes("Unknown column")) {
            results.errors.push(`DATE paymentDate: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            console.error("[Migration] paymentDate → DATE:", (error === null || error === void 0 ? void 0 : error.message) || error);
        }
    }
    // ── 11. CONTA DE DESTINO DO PAGAMENTO (bank_account_id → accounts.id) ──
    // NULLABLE: caixas/pagamentos antigos continuam a funcionar (legado).
    yield addColumnIfMissing("cash_registers", "bank_account_id", "INT NULL", results);
    yield addColumnIfMissing("tranzactions", "bank_account_id", "INT NULL", results);
    yield addIndexIfMissing("tranzactions", "idx_tranz_bank_account", ["bank_account_id"], results);
    // Backfill: pagamentos sem conta herdam a conta do caixa do dia (mesma
    // empresa). Uma linha por corrida — corre só enquanto existirem NULL.
    try {
        const [faltam] = yield db_1.db.query(`SELECT COUNT(*) AS n FROM tranzactions
        WHERE bank_account_id IS NULL
          AND EXISTS (SELECT 1 FROM cash_registers WHERE cash_registers.companyId = tranzactions.companyId)`);
        if (Number((_u = faltam[0]) === null || _u === void 0 ? void 0 : _u.n) > 0) {
            yield db_1.db.query(`UPDATE tranzactions t
           LEFT JOIN cash_registers cr
             ON cr.companyId = t.companyId
            AND cr.opening_date = t.paymentDate
         SET t.bank_account_id = cr.bank_account_id
         WHERE t.bank_account_id IS NULL`);
            results.applied += 1;
            console.log("[Migration] tranzactions.bank_account_id preenchido a partir do caixa do dia (onde existia)");
        }
    }
    catch (error) {
        results.errors.push(`BACKFILL bank_account_id: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    // ── 12. PACOTE DE CONCESSÃO (documentos legais imutáveis) ──
    // Gerado UMA vez após o desembolso (Termo, Garantias, Contrato, Plano).
    // IMUTÁVEL: os PDFs ficam em storage + hash SHA-256 do conteúdo; nova
    // tentativa de geração é bloqueada (409). Regeneração só via invalidar
    // desembolso (que apaga a linha — o crédito volta a Pendentes).
    if (!(yield hasTable("concession_packages"))) {
        try {
            yield db_1.db.query(`
        CREATE TABLE IF NOT EXISTS concession_packages (
          id INT NOT NULL AUTO_INCREMENT,
          companyId INT NOT NULL,
          loanId INT NOT NULL,
          accountNumber VARCHAR(255) NULL,
          customerId INT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'EMITIDO',
          package_hash CHAR(64) NULL,
          storage_dir VARCHAR(500) NULL,
          docs JSON NULL,
          created_by INT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_concession_loan (loanId),
          KEY idx_concession_company (companyId, accountNumber)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
            results.applied += 1;
            console.log("[Migration] tabela concession_packages criada (pacote de concessão imutável)");
        }
        catch (error) {
            results.errors.push(`concession_packages: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            console.error("[Migration] Erro ao criar concession_packages:", (error === null || error === void 0 ? void 0 : error.message) || error);
        }
    }
    else {
        results.skipped += 1;
    }
});
