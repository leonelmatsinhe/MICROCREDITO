import { db } from "../database/db";

/**
 * Migrações de schema — executadas em TODOS os arranques do servidor
 * (local, PM2, Ubuntu) e também via `npm run migrate`.
 *
 * Cada migração é idempotente (verifica se a coluna/tabela já existe antes de
 * aplicar) e independente: se uma falhar, as restantes continuam e o erro fica
 * registado no resultado. Assim, um restart no servidor Ubuntu aplica sempre
 * tudo o que foi feito na base de dados local.
 */

type MigrationResult = {
  applied: number;
  skipped: number;
  errors: string[];
};

const hasColumn = async (table: string, column: string): Promise<boolean> => {
  try {
    const [rows] = await db.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
    return (rows as any[]).length > 0;
  } catch {
    return false;
  }
};

const hasTable = async (table: string): Promise<boolean> => {
  try {
    const [rows] = await db.query(`SHOW TABLES LIKE '${table}'`);
    return (rows as any[]).length > 0;
  } catch {
    return false;
  }
};

const hasForeignKey = async (table: string, constraint: string): Promise<boolean> => {
  const [rows] = await db.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    { replacements: [table, constraint] }
  );
  return (rows as unknown as any[]).length > 0;
};

const addForeignKeyIfMissing = async (
  table: string,
  constraint: string,
  column: string,
  referencedTable: string,
  referencedColumn: string,
  onDelete: "RESTRICT" | "SET NULL",
  results: MigrationResult
) => {
  if (await hasForeignKey(table, constraint)) {
    results.skipped += 1;
    return;
  }
  try {
    await db.query(
      `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraint}\`
       FOREIGN KEY (\`${column}\`) REFERENCES \`${referencedTable}\` (\`${referencedColumn}\`)
       ON UPDATE CASCADE ON DELETE ${onDelete}`
    );
    results.applied += 1;
    console.log(`[Migration] FK ${table}.${column} -> ${referencedTable}.${referencedColumn} adicionada`);
  } catch (error: any) {
    results.errors.push(`FK ${constraint}: ${error?.message || error}`);
    console.error(`[Migration] Erro na FK ${constraint}:`, error?.message || error);
  }
};

const dropForeignKeyIfExists = async (table: string, constraint: string, results: MigrationResult) => {
  if (!(await hasForeignKey(table, constraint))) return;
  try {
    await db.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${constraint}\``);
    results.applied += 1;
    console.log(`[Migration] FK ${constraint} removida`);
  } catch (error: any) {
    results.errors.push(`DROP FK ${constraint}: ${error?.message || error}`);
  }
};

const dropColumnIfExists = async (table: string, column: string, results: MigrationResult) => {
  if (!(await hasColumn(table, column))) return;
  try {
    await db.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
    results.applied += 1;
    console.log(`[Migration] Coluna ${table}.${column} removida`);
  } catch (error: any) {
    results.errors.push(`DROP ${table}.${column}: ${error?.message || error}`);
  }
};

const hasIndex = async (table: string, indexName: string): Promise<boolean> => {
  const [rows] = await db.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, {
    replacements: [indexName],
  });
  return (rows as unknown as any[]).length > 0;
};

const addUniqueIndexIfMissing = async (
  table: string,
  indexName: string,
  columns: string[],
  results: MigrationResult
) => {
  if (await hasIndex(table, indexName)) {
    results.skipped += 1;
    return;
  }
  try {
    await db.query(
      `ALTER TABLE \`${table}\` ADD UNIQUE KEY \`${indexName}\` (${columns.map((column) => `\`${column}\``).join(", ")})`
    );
    results.applied += 1;
    console.log(`[Migration] Índice único ${table}.${indexName} adicionado`);
  } catch (error: any) {
    results.errors.push(`INDEX ${table}.${indexName}: ${error?.message || error}`);
    console.error(`[Migration] Erro no índice ${table}.${indexName}:`, error?.message || error);
  }
};

// Índice simples (não único) — ex.: idx_company_purpose_active em accounts.
const addIndexIfMissing = async (
  table: string,
  indexName: string,
  columns: string[],
  results: MigrationResult
) => {
  if (await hasIndex(table, indexName)) {
    results.skipped += 1;
    return;
  }
  try {
    await db.query(
      `ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns.map((column) => `\`${column}\``).join(", ")})`
    );
    results.applied += 1;
    console.log(`[Migration] Índice ${table}.${indexName} adicionado`);
  } catch (error: any) {
    results.errors.push(`INDEX ${table}.${indexName}: ${error?.message || error}`);
    console.error(`[Migration] Erro no índice ${table}.${indexName}:`, error?.message || error);
  }
};

const addColumnIfMissing = async (
  table: string,
  column: string,
  definition: string,
  results: MigrationResult
) => {
  if (await hasColumn(table, column)) {
    results.skipped += 1;
    return;
  }
  try {
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
    results.applied += 1;
    console.log(`[Migration] Coluna ${table}.${column} adicionada`);
  } catch (error: any) {
    results.errors.push(`ALTER ${table}.${column}: ${error?.message || error}`);
    console.error(`[Migration] Erro em ${table}.${column}:`, error?.message || error);
  }
};

const columnType = async (table: string, column: string): Promise<string | null> => {
  try {
    const [rows] = await db.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
    return ((rows as any[])[0]?.Type as string) || null;
  } catch {
    return null;
  }
};

/**
 * MODIFY COLUMN apenas quando o tipo actual difere do desejado.
 * Antes isto corria em TODOS os arranques — cada MODIFY reconstrói a tabela
 * inteira (customer_loans pode ser grande) e várias instâncias arrancando em
 * paralelo enfileiravam ALTERs durante horas, bloqueando o servidor.
 */
const modifyColumnType = async (
  table: string,
  column: string,
  definition: string,
  results: MigrationResult
) => {
  try {
    const current = (await columnType(table, column)) || "";
    const wantedType = definition.split(" ")[0].toUpperCase(); // ex.: DECIMAL(15,2)
    const currentUpper = current.toUpperCase();
    if (currentUpper.startsWith(wantedType)) {
      results.skipped += 1;
      return;
    }
    await db.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`);
    results.applied += 1;
    console.log(`[Migration] Tipo ${table}.${column} ajustado para ${definition}`);
  } catch (error: any) {
    results.errors.push(`MODIFY ${table}.${column}: ${error?.message || error}`);
    console.error(`[Migration] Erro ao ajustar ${table}.${column}:`, error?.message || error);
  }
};

const createTableIfMissing = async (
  table: string,
  ddl: string,
  results: MigrationResult
) => {
  if (await hasTable(table)) {
    results.skipped += 1;
    return;
  }
  try {
    await db.query(ddl);
    results.applied += 1;
    console.log(`[Migration] Tabela ${table} criada`);
  } catch (error: any) {
    results.errors.push(`CREATE ${table}: ${error?.message || error}`);
    console.error(`[Migration] Erro ao criar ${table}:`, error?.message || error);
  }
};

/**
 * Aplica todas as migrações (idempotente). Não lança excepções — devolve
 * um resumo com o número de migrações aplicadas, já existentes e erros.
 */
export const runMigrations = async (): Promise<MigrationResult> => {
  const results: MigrationResult = { applied: 0, skipped: 0, errors: [] };

  // ==================== COLUNAS ====================
  // Chave técnica da conta. Mantida nullable nesta fase para permitir a
  // reconciliação dos dados históricos antes de criar as FKs.
  await addColumnIfMissing("customer_loans", "customerId", "INTEGER NULL", results);
  await addColumnIfMissing("amortization_loans", "customerId", "INTEGER NULL", results);
  await addColumnIfMissing("tranzactions", "customerId", "INTEGER NULL", results);
  await addColumnIfMissing("customer_documents", "customerId", "INTEGER NULL", results);
  await addColumnIfMissing("debts", "customerId", "INTEGER NULL", results);
  await addColumnIfMissing("notifications", "userId", "INTEGER NULL", results);
  await addColumnIfMissing("notifications", "customerId", "INTEGER NULL", results);

  // Valores financeiros devem usar decimal para evitar erros de arredondamento
  // binário típicos de FLOAT.
  await modifyColumnType("customer_loans", "amount", "DECIMAL(15,2) NOT NULL", results);
  await modifyColumnType("customer_loans", "interestRate", "DECIMAL(8,4) NOT NULL", results);
  await modifyColumnType("customer_loans", "administrativeFee", "DECIMAL(15,2) NOT NULL DEFAULT 0", results);
  await modifyColumnType("amortization_loans", "amortization", "DECIMAL(15,2) NOT NULL", results);
  await modifyColumnType("amortization_loans", "rateAmount", "DECIMAL(15,2) NOT NULL", results);
  await modifyColumnType("amortization_loans", "installment", "DECIMAL(15,2) NOT NULL", results);
  await modifyColumnType("amortization_loans", "remainingBalance", "DECIMAL(15,2) NULL", results);
  await modifyColumnType("amortization_loans", "paidAmount", "DECIMAL(15,2) NULL DEFAULT 0", results);
  await modifyColumnType("tranzactions", "amount", "DECIMAL(15,2) NOT NULL", results);
  await addColumnIfMissing("tranzactions", "totalAmount", "DECIMAL(15,2) NULL", results);
  await modifyColumnType("tranzactions", "latePaymentInterest", "DECIMAL(15,2) NOT NULL", results);
  await modifyColumnType("tranzactions", "interestRateAmount", "DECIMAL(15,2) NOT NULL", results);
  await modifyColumnType("tranzactions", "discountAmount", "DECIMAL(15,2) NULL DEFAULT 0", results);
  await modifyColumnType("debts", "debtAmount", "DECIMAL(15,2) NOT NULL", results);
  await modifyColumnType("interest_rates", "tax", "DECIMAL(8,4) NOT NULL", results);
  await modifyColumnType("interest_rates", "administrativeFee", "DECIMAL(15,2) NOT NULL", results);
  await modifyColumnType("loan_guarantees", "purchaseAmount", "DECIMAL(15,2) NULL", results);

  // Credenciais enviadas (clientes) — enviar credenciais de acesso ao portal
  await addColumnIfMissing("customers", "credentialsSent", "INTEGER DEFAULT 0", results);
  await addColumnIfMissing("customers", "interestRateId", "INTEGER NULL", results);
  await addColumnIfMissing("customers", "credentialsSentAt", "VARCHAR(255)", results);

  // Credenciais enviadas (utilizadores internos)
  await addColumnIfMissing("users", "credentialsSent", "INTEGER DEFAULT 0", results);
  await addColumnIfMissing("users", "credentialsSentAt", "VARCHAR(255)", results);

  // Taxa administrativa do crédito (fluxo dinâmico até ao contrato)
  await addColumnIfMissing("customer_loans", "administrativeFee", "FLOAT NOT NULL DEFAULT 0", results);

  // Data real de desembolso do crédito (base do plano de amortização)
  await addColumnIfMissing("customer_loans", "disbursementDate", "VARCHAR(255)", results);

  // Autorização de envio de SMS (só o Admin altera)
  await addColumnIfMissing("companies", "smsEnabled", "INTEGER NOT NULL DEFAULT 1", results);

  // ==================== FLUXO DE SUBSCRIÇÃO (cadastro público de empresas) ====================
  // companies: ciclo de aprovação pelo Super Admin + dados do cadastro da landing.
  await addColumnIfMissing(
    "companies",
    "approval_status",
    "ENUM('PENDENTE','APROVADA','REJEITADA','SUSPENSA') NOT NULL DEFAULT 'PENDENTE'",
    results
  );
  await addColumnIfMissing("companies", "nuit", "VARCHAR(20) NULL", results);
  await addColumnIfMissing("companies", "phone", "VARCHAR(20) NULL", results);
  await addColumnIfMissing("companies", "email", "VARCHAR(100) NULL", results);
  await addColumnIfMissing("companies", "license_number", "VARCHAR(100) NULL", results);
  await addColumnIfMissing(
    "companies",
    "plan",
    "ENUM('STARTER','CRESCIMENTO','PROFISSIONAL') NOT NULL DEFAULT 'CRESCIMENTO'",
    results
  );
  await addColumnIfMissing("companies", "requested_at", "DATETIME NULL DEFAULT CURRENT_TIMESTAMP", results);
  await addColumnIfMissing("companies", "approved_at", "DATETIME NULL", results);
  await addColumnIfMissing("companies", "approved_by", "INTEGER NULL", results);
  await addColumnIfMissing("companies", "rejection_reason", "TEXT NULL", results);
  // Empresas já existentes na plataforma são consideradas aprovadas.
  try {
    await db.query(
      "UPDATE companies SET approval_status = 'APROVADA', approved_at = COALESCE(approved_at, NOW()) WHERE approval_status IS NULL OR approval_status = 'PENDENTE' AND created_at < NOW() - INTERVAL 1 DAY"
    );
  } catch { /* coluna created_at pode não existir — ignora */ }

  // users: is_active (conta de admin da empresa criada inactiva até aprovação)
  await addColumnIfMissing("users", "is_active", "TINYINT(1) NOT NULL DEFAULT 1", results);

  // Chave para o plano de subscrição escolhido (FK lógica subscription_plans)
  await addColumnIfMissing("companies", "plan_id", "INTEGER NULL", results);

  // ==================== TABELA: PLANOS DE SUBSCRIÇÃO ====================
  await createTableIfMissing(
    "subscription_plans",
    `CREATE TABLE IF NOT EXISTS subscription_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      slug VARCHAR(50) UNIQUE,
      price_mzn DECIMAL(10,2) NOT NULL,
      max_clients INT NOT NULL,
      features JSON,
      is_popular BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT NOW()
    )`,
    results
  );

  // Seed one-time dos 3 planos base (só insere quando a tabela está vazia)
  try {
    const [planCount]: any = await db.query("SELECT COUNT(*) AS total FROM subscription_plans");
    if (Number((planCount as any[])[0]?.total) === 0) {
      await db.query(
        `INSERT INTO subscription_plans (name, slug, price_mzn, max_clients, features, is_popular, is_active, created_at) VALUES
         ('Starter', 'starter', 2500, 100, '["Até 100 clientes","Relatórios BM","Suporte WhatsApp"]', 0, 1, NOW()),
         ('Crescimento', 'crescimento', 4500, 500, '["Até 500 clientes","Tudo do Starter","Caixa Multi-contas","Alertas SMS"]', 1, 1, NOW()),
         ('Profissional', 'profissional', 8500, 999999, '["Clientes ilimitados","Tudo do Crescimento","API Completa","Suporte Prioritário"]', 0, 1, NOW())`
      );
      results.applied += 1;
      console.log("[Migration] Planos de subscrição base criados (Starter, Crescimento, Profissional)");
    } else {
      results.skipped += 1;
    }
  } catch (error: any) {
    results.errors.push(`SEED subscription_plans: ${error?.message || error}`);
  }

  // Ocultar cláusula de seguro (VIGÉSIMA PRIMEIRA) no contrato de concessão
  await addColumnIfMissing("companies", "contractHideInsuranceClause", "INTEGER NOT NULL DEFAULT 0", results);

  // Fotografia tipo passe do mutuário (auto-cadastro público no portal)
  await addColumnIfMissing("customers", "passportPhotoUrl", "VARCHAR(255)", results);

  // Conta criada pelo próprio mutuário no portal (selo "Auto-cadastro" nas grelhas)
  await addColumnIfMissing("customers", "isSelfRegistered", "INTEGER NOT NULL DEFAULT 0", results);

  // ==================== MUTUÁRIOS PF/PJ ====================
  // Tipo de mutuário: PF = pessoa física (padrão histórico), PJ = empresa.
  // Registos antigos ficam como PF; os campos de pessoa física passam a ser
  // opcionais porque as empresas não os têm.
  await addColumnIfMissing("customers", "customerType", "ENUM('PF','PJ') NOT NULL DEFAULT 'PF'", results);

  // Dados da empresa (só preenchidos quando customerType = 'PJ')
  await addColumnIfMissing("customers", "companyLegalRepresentative", "VARCHAR(255)", results);
  await addColumnIfMissing("customers", "companyRepresentativeIdNumber", "VARCHAR(255)", results);
  await addColumnIfMissing("customers", "companyRepresentativeIdExpiry", "VARCHAR(255)", results);
  await addColumnIfMissing("customers", "companyRepresentativeIdIssuer", "VARCHAR(255)", results);
  await addColumnIfMissing("customers", "companyLicenseNumber", "VARCHAR(255)", results);
  await addColumnIfMissing("customers", "companyMainActivity", "VARCHAR(255)", results);

  // Género, estado civil e data de nascimento tornam-se opcionais para
  // acomodar mutuários do tipo Empresa (PJ).
  await modifyColumnType("customers", "sex", "VARCHAR(255) NULL DEFAULT NULL", results);
  await modifyColumnType("customers", "maritalStatus", "VARCHAR(255) NULL DEFAULT NULL", results);
  await modifyColumnType("customers", "customerDateOfBirth", "VARCHAR(255) NULL DEFAULT NULL", results);

  // ==================== TABELAS ====================
  // Mensagens de WhatsApp (password reset / notificações)
  await createTableIfMissing(
    "whatsapp_messages",
    `CREATE TABLE IF NOT EXISTS whatsapp_messages (
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
    )`,
    results
  );

  // Fila de SMS (gateway BulkSMM) — essencial para o serviço de SMS
  await createTableIfMissing(
    "sms_queue",
    `CREATE TABLE IF NOT EXISTS sms_queue (
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
    )`,
    results
  );

  // Caixa de entrada do gateway SMS (respostas recebidas)
  await createTableIfMissing(
    "sms_gateway_inbox",
    `CREATE TABLE IF NOT EXISTS sms_gateway_inbox (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      deviceId VARCHAR(120) NOT NULL,
      senderPhone VARCHAR(30),
      receiverPhone VARCHAR(30),
      messageBody TEXT NOT NULL,
      receivedAt DATETIME NOT NULL,
      contentHash VARCHAR(64) NOT NULL UNIQUE,
      createdAt DATETIME,
      updatedAt DATETIME
    )`,
    results
  );

  await addColumnIfMissing("whatsapp_messages", "customerId", "INTEGER NULL", results);
  await addColumnIfMissing("sms_queue", "customerId", "INTEGER NULL", results);

  // ==================== RECONCILIAÇÃO ====================
  // Preenche a nova chave usando a relação legada apenas quando existe uma
  // correspondência inequívoca dentro da mesma empresa.
  const backfillCustomerIds = async (table: string) => {
    try {
      await db.query(`
        UPDATE \`${table}\` target
        INNER JOIN customers customer
          ON customer.companyId = target.companyId
         AND CAST(customer.accountNumber AS CHAR) = CAST(target.accountNumber AS CHAR)
        SET target.customerId = customer.id
        WHERE target.customerId IS NULL
      `);
      console.log(`[Migration] customerId reconciliado em ${table}`);
    } catch (error: any) {
      results.errors.push(`BACKFILL ${table}.customerId: ${error?.message || error}`);
      console.error(`[Migration] Erro ao reconciliar ${table}.customerId:`, error?.message || error);
    }
  };

  await backfillCustomerIds("customer_loans");
  await backfillCustomerIds("amortization_loans");
  await backfillCustomerIds("tranzactions");
  await backfillCustomerIds("customer_documents");
  await backfillCustomerIds("debts");
  await backfillCustomerIds("whatsapp_messages");
  await backfillCustomerIds("sms_queue");

  // ==================== CONSTRAINTS ====================
  await dropForeignKeyIfExists("accounts", "fk_accounts_customer", results);
  await dropForeignKeyIfExists("customer_loans", "fk_loans_account", results);
  await dropForeignKeyIfExists("amortization_loans", "fk_amortization_account", results);
  await dropForeignKeyIfExists("tranzactions", "fk_transactions_account", results);
  await dropForeignKeyIfExists("customer_documents", "fk_documents_account", results);

  await dropColumnIfExists("accounts", "customerId", results);
  await dropColumnIfExists("customer_loans", "accountId", results);
  await dropColumnIfExists("amortization_loans", "accountId", results);
  await dropColumnIfExists("tranzactions", "accountId", results);
  await dropColumnIfExists("customer_documents", "accountId", results);
  await dropColumnIfExists("whatsapp_messages", "accountId", results);
  await dropColumnIfExists("sms_queue", "accountId", results);

  await addUniqueIndexIfMissing("accounts", "uq_accounts_company_number", ["companyId", "accountNumber"], results);
  await addForeignKeyIfMissing("accounts", "fk_accounts_company", "companyId", "companies", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("customer_loans", "fk_loans_company", "companyId", "companies", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("customer_loans", "fk_loans_customer", "customerId", "customers", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("amortization_loans", "fk_amortization_loan", "loanId", "customer_loans", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("amortization_loans", "fk_amortization_customer", "customerId", "customers", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("tranzactions", "fk_transactions_installment", "amortizationLoanId", "amortization_loans", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("tranzactions", "fk_transactions_loan", "loanId", "customer_loans", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("tranzactions", "fk_transactions_customer", "customerId", "customers", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("customer_documents", "fk_documents_customer", "customerId", "customers", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("debts", "fk_debts_company", "companyId", "companies", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("debts", "fk_debts_customer", "customerId", "customers", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("debts", "fk_debts_loan", "loanId", "customer_loans", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("debts", "fk_debts_installment", "amortisationId", "amortization_loans", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("loan_guarantees", "fk_guarantees_loan", "loanId", "customer_loans", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("notifications", "fk_notifications_user", "userId", "users", "id", "SET NULL", results);
  await addForeignKeyIfMissing("notifications", "fk_notifications_customer", "customerId", "customers", "id", "SET NULL", results);
  await addForeignKeyIfMissing("districts", "fk_districts_province", "provinceId", "provinces", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("companies", "fk_companies_district", "districtId", "districts", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("companies", "fk_companies_province", "provinceId", "provinces", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("interest_rates", "fk_interest_rates_company", "companyId", "companies", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("customers", "fk_customers_interest_rate", "interestRateId", "interest_rates", "id", "SET NULL", results);
  await addForeignKeyIfMissing("users", "fk_users_company", "companyId", "companies", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("user_logs", "fk_user_logs_company", "companyId", "companies", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("user_logs", "fk_user_logs_user", "userId", "users", "id", "RESTRICT", results);

  // ==================== CAIXA DIÁRIO (módulo isolado) ====================
  // Tabelas novas — não alteram nenhuma tabela existente. A tabela `accounts`
  // continua a ser apenas a conta bancária dos contratos (bankAccount), sem
  // ligação com o fluxo de caixa.
  await createTableIfMissing(
    "cash_registers",
    `CREATE TABLE IF NOT EXISTS cash_registers (
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
    )`,
    results
  );

  await createTableIfMissing(
    "cash_movements",
    `CREATE TABLE IF NOT EXISTS cash_movements (
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
    )`,
    results
  );

  // Regra de negócio: 1 caixa ABERTO por utilizador, por dia e por empresa.
  // O índice único inclui o status para permitir histórico de vários dias
  // (reabrir caixa noutro dia continua permitido).
  await addUniqueIndexIfMissing(
    "cash_registers",
    "uq_cash_registers_user_day_company",
    ["userId", "opening_date", "companyId", "status"],
    results
  );

  // ==================== CAIXA CENTRAL / TESOURARIA ====================
  // A tabela `accounts` passa a ser CARTEIRA REAL (saldo por banco) mantendo
  // a sua função anterior nos contratos. Migration é ALTER (nunca DROP) —
  // nenhum dado existente é apagado.

  // --- accounts: novas colunas de carteira real ---
  await addColumnIfMissing("accounts", "bank_name", "VARCHAR(100) NOT NULL DEFAULT '' AFTER accountDescription", results);
  await addColumnIfMissing("accounts", "bank_code", "VARCHAR(20) NULL AFTER bank_name", results);
  // Saldo real actual — gerido EXCLUSIVAMENTE pelo treasuryService.
  await addColumnIfMissing("accounts", "balance", "DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER bank_code", results);
  await addColumnIfMissing("accounts", "initial_balance", "DECIMAL(15,2) NULL DEFAULT 0.00 AFTER balance", results);
  await addColumnIfMissing("accounts", "purpose", "ENUM('REEMBOLSO','DESEMBOLSO','MISTO','TAXAS','RESERVA') NOT NULL DEFAULT 'MISTO' AFTER initial_balance", results);
  await addColumnIfMissing("accounts", "type", "ENUM('BANCO','CAIXA_FISICO','MOBILE_MONEY','EWALLET') NOT NULL DEFAULT 'BANCO' AFTER purpose", results);
  await addColumnIfMissing("accounts", "is_default_reembolso", "TINYINT(1) NOT NULL DEFAULT 0 AFTER type", results);
  await addColumnIfMissing("accounts", "is_default_desembolso", "TINYINT(1) NOT NULL DEFAULT 0 AFTER is_default_reembolso", results);
  await addColumnIfMissing("accounts", "is_active", "TINYINT(1) NOT NULL DEFAULT 1 AFTER is_default_desembolso", results);
  await addColumnIfMissing("accounts", "currency", "VARCHAR(3) NOT NULL DEFAULT 'MZN' AFTER is_active", results);
  await addIndexIfMissing("accounts", "idx_company_purpose_active", ["companyId", "purpose", "is_active"], results);

  // Seed one-time do registo id=1 (FNB): corre apenas enquanto bank_name estiver
  // vazio — restarts seguintes NUNCA reescrevem o saldo já movimentado.
  try {
    if (await hasColumn("accounts", "bank_name")) {
      const [seeded]: any = await db.query(
        "SELECT id FROM `accounts` WHERE id = 1 AND (bank_name IS NULL OR bank_name = '')"
      );
      if ((seeded as any[]).length > 0) {
        await db.query(
          "UPDATE `accounts` SET bank_name = 'FNB', purpose = 'MISTO', is_default_reembolso = 1, is_default_desembolso = 1, balance = 0, is_active = 1 WHERE id = 1"
        );
        results.applied += 1;
        console.log("[Migration] accounts id=1 actualizado (FNB, MISTO, defaults)");
      }
    }
  } catch (error: any) {
    results.errors.push(`SEED accounts#1: ${error?.message || error}`);
  }

  // --- cash_registers: colunas do Caixa Central (CASH vs BANK) ---
  await addColumnIfMissing("cash_registers", "opening_time", "DATETIME NULL", results);
  await addColumnIfMissing("cash_registers", "closing_time", "DATETIME NULL", results);
  await addColumnIfMissing("cash_registers", "total_cash_in", "DECIMAL(15,2) NOT NULL DEFAULT 0", results);
  await addColumnIfMissing("cash_registers", "total_cash_out", "DECIMAL(15,2) NOT NULL DEFAULT 0", results);
  await addColumnIfMissing("cash_registers", "total_bank_in", "DECIMAL(15,2) NOT NULL DEFAULT 0", results);
  await addColumnIfMissing("cash_registers", "total_bank_out", "DECIMAL(15,2) NOT NULL DEFAULT 0", results);
  await addColumnIfMissing("cash_registers", "notes", "TEXT NULL", results);

  // --- cash_movements: método de pagamento + conta bancária + referência ---
  await addColumnIfMissing("cash_movements", "bankAccountId", "INTEGER NULL", results);
  await addColumnIfMissing("cash_movements", "paymentMethod", "ENUM('CASH','BANK','MPESA','EMOLA') NOT NULL DEFAULT 'CASH'", results);
  await addColumnIfMissing("cash_movements", "referenceType", "VARCHAR(50) NULL", results);
  await addColumnIfMissing("cash_movements", "referenceId", "INTEGER NULL", results);

  // O ENUM de categorias passa a incluir movimentos bancários (superset —
  // mantém todos os valores antigos para não quebrar dados existentes).
  await modifyColumnType(
    "cash_movements",
    "category",
    "ENUM('DESEMBOLSO','REEMBOLSO','JUROS_MORA','TAXA_ADMIN','DEPOSITO_BANCO','LEVANTAMENTO_BANCO','TRANSFERENCIA','INTERNET','LUZ','AGUA','COMBUSTIVEL','RENTABILIDADE','SALARIOS','SALARIO','REUNIAO','TRANSPORTE','MATERIAL','OUTROS') NOT NULL",
    results
  );

  // --- bank_transactions: extrato real de cada conta bancária ---
  await createTableIfMissing(
    "bank_transactions",
    `CREATE TABLE IF NOT EXISTS bank_transactions (
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
    )`,
    results
  );

  // ==================== CONTA DE COLECTA M-PESA (portal do mutuário) ====================
  // Toda empresa precisa de uma conta MOBILE_MONEY para receber os pagamentos
  // iniciados no portal do cliente. Se não tiver nenhuma, cria uma por defeito
  // (número placeholder editável nas Configurações → Contas Bancárias).
  try {
    if (await hasColumn("accounts", "type")) {
      const companies: any[] = (await db.query("SELECT id FROM companies"))[0] as any[];
      for (const company of companies as any[]) {
        const companyId = Number(company.id);
        const [existing]: any = await db.query(
          "SELECT id FROM `accounts` WHERE companyId = ? AND type = 'MOBILE_MONEY' LIMIT 1",
          { replacements: [companyId] }
        );
        if ((existing as any[]).length > 0) continue;

        // Nome da empresa para a descrição (best-effort)
        let companyName = `Empresa ${companyId}`;
        try {
          const [cRows]: any = await db.query("SELECT companyName FROM companies WHERE id = ?", { replacements: [companyId] });
          const cName = (cRows as any[])[0]?.companyName || (cRows as any[])[0]?.companyName1;
          if (cName) companyName = String(cName);
        } catch { /* usa o fallback */ }

        await db.query(
          `INSERT INTO accounts
             (companyId, accountNumber, accountDescription, accountHolder, bank_name, bank_code,
              balance, initial_balance, purpose, type, is_default_reembolso, is_default_desembolso,
              is_active, currency, createdBy, updatedBy, createdAt, updatedAt)
           VALUES
             (?, '258840000000', 'Colecta M-Pesa (portal)', ?, 'M-Pesa', NULL,
              0, 0, 'REEMBOLSO', 'MOBILE_MONEY', 1, 0,
              1, 'MZN', 'sistema', 'sistema', NOW(), NOW())`,
          { replacements: [companyId, companyName] }
        );
        results.applied += 1;
        console.log(`[Migration] Conta de colecta M-Pesa criada para a empresa ${companyId} (${companyName})`);
      }
    }
  } catch (error: any) {
    results.errors.push(`SEED conta M-Pesa: ${error?.message || error}`);
    console.error("[Migration] Erro ao criar conta de colecta M-Pesa:", error?.message || error);
  }

  // ==================== REPARAÇÃO: TOTAIS DOS CAIXAS (bug de persistência) ====================
  // Bug histórico: recalculateRegisterTotals gravava chaves camelCase (totalIn,
  // totalCashIn, ...) num modelo com colunas snake_case (total_in, total_cash_in,
  // ...) — o update estático do Sequelize descartava as chaves desconhecidas e
  // os totais NUNCA eram persistidos (ficavam a 0 mesmo com movimentos).
  // Reparação one-time idempotente: recalcula os 6 totais de TODOS os caixas a
  // partir de cash_movements (fonte de verdade) e corrige fechos concluídos.
  try {
    if (await hasTable("cash_registers") && (await hasColumn("cash_registers", "total_cash_in"))) {
      const [fixed]: any = await db.query(
        `UPDATE cash_registers cr
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
             cr.difference)`
      );
      const affected = Number((fixed as any)?.affectedRows) || 0;
      if (affected > 0) {
        results.applied += 1;
        console.log(`[Migration] Totais de ${affected} caixa(s) recalculados a partir de cash_movements (reparação do bug de persistência)`);
      }
    }
  } catch (error: any) {
    results.errors.push(`REPARAÇÃO totais caixa: ${error?.message || error}`);
    console.error("[Migration] Erro ao reparar totais dos caixas:", error?.message || error);
  }

  // ==================== CARTEIRAS DE FINANCIAMENTO (DINHEIRO ANALÍTICO) ====================
  // Duas camadas de dinheiro: REAL (accounts purpose DESEMBOLSO/REEMBOLSO) e
  // ANALÍTICO (financing_wallets). Esta tabela NÃO guarda dinheiro físico —
  // serve de base de análise e para separar o relatório de cada financiador.
  await createTableIfMissing(
    "financing_wallets",
    `CREATE TABLE IF NOT EXISTS financing_wallets (
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
    )`,
    results
  );

  // ==================== RECIBOS (NUMERAÇÃO SEQUENCIAL LEGAL — AT MOÇAMBIQUE) ====================
  await createTableIfMissing(
    "recibos",
    `CREATE TABLE IF NOT EXISTS recibos (
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
    )`,
    results
  );

  // Contador por empresa/ano — reservado com SELECT ... FOR UPDATE para que a
  // numeração legal nunca tenha saltos (ver services/reciboService.ts).
  await createTableIfMissing(
    "recibos_sequencia",
    `CREATE TABLE IF NOT EXISTS recibos_sequencia (
      companyId INT NOT NULL,
      ano INT NOT NULL,
      ultima_sequencia INT NOT NULL DEFAULT 0,
      PRIMARY KEY (companyId, ano)
    )`,
    results
  );

  // --- colunas das carteiras analíticas nas entidades existentes ---
  await addColumnIfMissing("users", "walletId", "INTEGER NULL", results);
  await addColumnIfMissing("users", "is_parceiro", "TINYINT(1) NOT NULL DEFAULT 0", results);
  await addColumnIfMissing("interest_rates", "walletId", "INTEGER NULL", results);
  // A taxa pode estar ligada a uma CONTA DE DESEMBOLSO (dinheiro real) em vez
  // de uma carteira analítica — nunca às duas ao mesmo tempo.
  await addColumnIfMissing("interest_rates", "accountId", "INTEGER NULL", results);
  await addColumnIfMissing("customer_loans", "walletId", "INTEGER NULL", results);
  await addColumnIfMissing("tranzactions", "walletId", "INTEGER NULL", results);
  await addColumnIfMissing("tranzactions", "mora_amount", "DECIMAL(15,2) NOT NULL DEFAULT 0.00", results);
  await addColumnIfMissing("amortization_loans", "walletId", "INTEGER NULL", results);
  await addColumnIfMissing("amortization_loans", "mora_amount", "DECIMAL(15,2) NOT NULL DEFAULT 0.00", results);
  await addColumnIfMissing("amortization_loans", "mora_days", "INTEGER NOT NULL DEFAULT 0", results);

  // --- SELO ELECTRÓNICO DO RECIBO (hash AT + QR Code) ---
  await addColumnIfMissing("recibos", "hash_at", "VARCHAR(128) NULL", results);
  await addColumnIfMissing("recibos", "qr_code_url", "VARCHAR(255) NULL", results);
  await addColumnIfMissing("recibos", "qr_content", "TEXT NULL", results);
  await addColumnIfMissing("recibos", "at_validation_code", "VARCHAR(50) NULL", results);
  await addColumnIfMissing("recibos", "software_certification", "VARCHAR(100) NULL", results);
  await addColumnIfMissing("recibos", "metodo_pagamento_desc", "VARCHAR(100) NULL", results);
  await addIndexIfMissing("recibos", "idx_recibos_hash_at", ["hash_at"], results);

  await addIndexIfMissing("users", "idx_users_walletId", ["walletId"], results);
  await addIndexIfMissing("interest_rates", "idx_interest_rates_walletId", ["walletId"], results);
  await addIndexIfMissing("interest_rates", "idx_interest_rates_accountId", ["accountId"], results);
  await addIndexIfMissing("customer_loans", "idx_customer_loans_walletId", ["walletId"], results);
  await addIndexIfMissing("tranzactions", "idx_tranzactions_walletId", ["walletId"], results);
  await addIndexIfMissing("amortization_loans", "idx_amortization_walletId", ["walletId"], results);

  await addForeignKeyIfMissing("financing_wallets", "fk_financing_wallets_company", "companyId", "companies", "id", "RESTRICT", results);
  await addForeignKeyIfMissing("users", "fk_users_wallet", "walletId", "financing_wallets", "id", "SET NULL", results);
  await addForeignKeyIfMissing("interest_rates", "fk_interest_rates_wallet", "walletId", "financing_wallets", "id", "SET NULL", results);
  await addForeignKeyIfMissing("interest_rates", "fk_interest_rates_account", "accountId", "accounts", "id", "SET NULL", results);
  await addForeignKeyIfMissing("customer_loans", "fk_loans_wallet", "walletId", "financing_wallets", "id", "SET NULL", results);
  await addForeignKeyIfMissing("tranzactions", "fk_transactions_wallet", "walletId", "financing_wallets", "id", "SET NULL", results);
  await addForeignKeyIfMissing("amortization_loans", "fk_amortization_wallet", "walletId", "financing_wallets", "id", "SET NULL", results);
  await addForeignKeyIfMissing("recibos", "fk_recibos_company", "companyId", "companies", "id", "RESTRICT", results);

  // --- SEED: 5 carteiras analíticas para cada empresa (idempotente) ---
  // KMAD é a única carteira de parceiro externo com portal; as restantes são
  // fundos próprios MBRM (PME 12%, Comunidades 9%, Interno 8% e 10%).
  const WALLET_SEED: Array<[string, string, string, string | null, number, string | null, number | null, number, string, number]> = [
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
  const WALLET_TAX: Record<string, number | null> = {
    KMAD: null,
    PME_12: 0.12,
    COM_9: 0.09,
    INT_8: 0.08,
    INT_10: 0.1,
  };
  try {
    if (await hasTable("financing_wallets")) {
      const companies: any[] = (await db.query("SELECT id FROM companies"))[0] as any[];
      let seededWallets = 0;
      for (const company of companies as any[]) {
        const companyId = Number(company.id);
        for (const [codigo, nome, descricao, parceiro, isParceiro, email, alocado, inicial, cor, portal] of WALLET_SEED) {
          const [existing]: any = await db.query(
            "SELECT id FROM financing_wallets WHERE companyId = ? AND codigo = ? LIMIT 1",
            { replacements: [companyId, codigo] }
          );
          if ((existing as any[]).length > 0) continue;
          await db.query(
            `INSERT INTO financing_wallets
               (companyId, codigo, nome, descricao, tipo, parceiro_nome, is_parceiro_externo,
                parceiro_email, allocated_amount, initial_disbursed_amount, taxa_juro,
                cor_badge, is_ativa, tem_portal, portal_ativo, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'FINANCIAMENTO', ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW(), NOW())`,
            {
              replacements: [
                companyId, codigo, nome, descricao, parceiro, isParceiro,
                email, alocado, inicial, WALLET_TAX[codigo], cor, portal, portal,
              ],
            }
          );
          seededWallets += 1;
        }
      }
      if (seededWallets > 0) {
        results.applied += 1;
        console.log(`[Migration] ${seededWallets} carteira(s) de financiamento criadas (KMAD, PME_12, COM_9, INT_8, INT_10)`);
      } else {
        results.skipped += 1;
      }

      // --- SEED: utilizador parceiro financiador (userRole 4) para a KMAD ---
      // Apenas na empresa operacional (a que tem créditos); as restantes
      // empresas criam o seu parceiro pelo Admin.
      let partnerCompanyId: number | null = null;
      try {
        const [byLoans]: any = await db.query(
          "SELECT companyId, COUNT(*) AS total FROM customer_loans GROUP BY companyId ORDER BY total DESC LIMIT 1"
        );
        partnerCompanyId = Number((byLoans as any[])[0]?.companyId) || null;
      } catch { /* tabela pode não existir */ }
      if (!partnerCompanyId) {
        const [byName]: any = await db.query(
          "SELECT id FROM companies WHERE companyName LIKE '%Mola%' ORDER BY id ASC LIMIT 1"
        );
        partnerCompanyId = Number((byName as any[])[0]?.id) || Number((companies as any[])[0]?.id) || null;
      }

      if (partnerCompanyId) {
        const [walletRows]: any = await db.query(
          "SELECT id, tem_portal FROM financing_wallets WHERE companyId = ? AND codigo = 'KMAD' LIMIT 1",
          { replacements: [partnerCompanyId] }
        );
        const kmadWalletId = Number((walletRows as any[])[0]?.id) || null;
        if (kmadWalletId) {
          const [partnerUser]: any = await db.query(
            "SELECT id FROM users WHERE email = 'parceiro@kmad.co.mz' AND companyId = ? LIMIT 1",
            { replacements: [partnerCompanyId] }
          );
          if ((partnerUser as any[]).length === 0) {
            const bcryptjs = require("bcryptjs");
            const hash = bcryptjs.hashSync("Mbrm@2025", 10);
            await db.query(
              `INSERT INTO users
                 (name, email, password, updatedPassword, phone, companyId, status, userRole,
                  walletId, is_parceiro, is_active, credentialsSent, createdAt, updatedAt)
               VALUES
                 ('Parceiro KMAD', 'parceiro@kmad.co.mz', ?, 0, '+258840000000', ?, 1, 4,
                  ?, 1, 1, 0, NOW(), NOW())`,
              { replacements: [hash, partnerCompanyId, kmadWalletId] }
            );
            results.applied += 1;
            console.log(`[Migration] Parceiro financiador KMAD criado (parceiro@kmad.co.mz, userRole 4) na empresa ${partnerCompanyId}`);
          } else {
            // Garante que uma conta já existente tem a carteira e o papel correctos.
            await db.query(
              `UPDATE users SET userRole = 4, walletId = ?, is_parceiro = 1
               WHERE email = 'parceiro@kmad.co.mz' AND companyId = ?`,
              { replacements: [kmadWalletId, partnerCompanyId] }
            );
            results.skipped += 1;
          }
        }
      }
    }
  } catch (error: any) {
    results.errors.push(`SEED carteiras financiamento: ${error?.message || error}`);
    console.error("[Migration] Erro ao criar carteiras de financiamento:", error?.message || error);
  }

  // --- NORMALIZAÇÃO DE CHARSET (legado latin1 → utf8mb4) ---
  // As tabelas criadas no início do projecto ficaram em latin1_swedish_ci. Com
  // a conexão em utf8mb4, gravar texto acentuado falha com
  // "Conversion from collation utf8mb4_unicode_ci into latin1_swedish_ci
  // impossible for parameter" — era isto que impedia guardar a vinculação de
  // uma taxa de juro com nome acentuado (ex.: "Habitação"). A conversão
  // latin1 → utf8mb4 preserva os dados (cada byte latin1 é um code point).
  try {
    const [tabelasLatin1]: any = await db.query(
      `SELECT TABLE_NAME FROM information_schema.tables
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_COLLATION NOT LIKE 'utf8mb4%'
          AND TABLE_TYPE = 'BASE TABLE'`
    );
    let convertidas = 0;
    for (const row of tabelasLatin1 as any[]) {
      const tabela = String(row.TABLE_NAME || "");
      if (!/^[A-Za-z0-9_]+$/.test(tabela)) continue;
      try {
        await db.query(
          `ALTER TABLE \`${tabela}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        convertidas += 1;
      } catch (tableError: any) {
        results.errors.push(`CHARSET ${tabela}: ${tableError?.message || tableError}`);
      }
    }
    if (convertidas > 0) {
      results.applied += 1;
      console.log(`[Migration] ${convertidas} tabela(s) convertidas para utf8mb4 (texto acentuado passa a gravar)`);
    } else {
      results.skipped += 1;
    }
  } catch (error: any) {
    results.errors.push(`CHARSET: ${error?.message || error}`);
    console.error("[Migration] Erro ao normalizar o charset:", error?.message || error);
  }

  // --- BACKFILL: origem do capital das taxas de juro legadas ---
  // As taxas criadas antes das carteiras analíticas ficaram sem origem. Aqui
  // ligam-se por palavra-chave do nome a uma carteira de financiamento e, em
  // último recurso, à conta de desembolso principal da empresa. Corre apenas
  // uma vez por empresa: assim que existir uma taxa vinculada não volta a
  // mexer, para respeitar a escolha do Admin no formulário de taxas.
  try {
    if (await hasTable("financing_wallets") && await hasTable("interest_rates")) {
      const [jaVinculadas]: any = await db.query(
        "SELECT DISTINCT companyId FROM interest_rates WHERE walletId IS NOT NULL OR accountId IS NOT NULL"
      );
      const empresasTratadas = new Set((jaVinculadas as any[]).map((row: any) => Number(row.companyId)));

      const [pendentes]: any = await db.query(
        `SELECT ir.id, ir.companyId, ir.name
           FROM interest_rates ir
          WHERE ir.walletId IS NULL AND ir.accountId IS NULL
          ORDER BY ir.companyId, ir.id`
      );

      // Carteira analítica sugerida pelo nome da taxa (ordem importa).
      const REGRAS_CARTEIRA: Array<[RegExp, string]> = [
        [/comunidade/i, "COM_9"],
        [/pme|empres[aá]rio/i, "PME_12"],
        [/fornecedor/i, "INT_10"],
        [/intern|trabalhador|autom[oó]vel|colaborador/i, "INT_8"],
      ];
      const carteirasPorEmpresa = new Map<number, Map<string, number>>();
      const contasDesembolso = new Map<number, number>();
      let vinculadas = 0;

      for (const taxa of pendentes as any[]) {
        const companyId = Number(taxa.companyId);
        if (empresasTratadas.has(companyId)) continue;

        let walletId: number | null = null;
        const nome = String(taxa.name || "");
        const regra = REGRAS_CARTEIRA.find(([pattern]) => pattern.test(nome));
        if (regra) {
          if (!carteirasPorEmpresa.has(companyId)) {
            const [rows]: any = await db.query(
              "SELECT id, codigo FROM financing_wallets WHERE companyId = ? AND is_ativa = 1",
              { replacements: [companyId] }
            );
            const mapa = new Map<string, number>();
            (rows as any[]).forEach((row: any) => mapa.set(String(row.codigo), Number(row.id)));
            carteirasPorEmpresa.set(companyId, mapa);
          }
          walletId = carteirasPorEmpresa.get(companyId)?.get(regra[1]) || null;
        }

        let accountId: number | null = null;
        if (!walletId) {
          if (!contasDesembolso.has(companyId)) {
            const [rows]: any = await db.query(
              `SELECT id FROM accounts
                WHERE companyId = ? AND purpose IN ('DESEMBOLSO', 'MISTO')
                ORDER BY is_default_desembolso DESC, id ASC LIMIT 1`,
              { replacements: [companyId] }
            );
            contasDesembolso.set(companyId, Number((rows as any[])[0]?.id) || 0);
          }
          accountId = contasDesembolso.get(companyId) || null;
        }

        if (!walletId && !accountId) continue;
        await db.query("UPDATE interest_rates SET walletId = ?, accountId = ? WHERE id = ?", {
          replacements: [walletId, accountId, Number(taxa.id)],
        });
        vinculadas += 1;
      }

      if (vinculadas > 0) {
        results.applied += 1;
        console.log(`[Migration] ${vinculadas} taxa(s) de juro ligadas à origem do capital (carteira ou conta de desembolso)`);
      } else {
        results.skipped += 1;
      }
    }
  } catch (error: any) {
    results.errors.push(`BACKFILL taxas de juro: ${error?.message || error}`);
    console.error("[Migration] Erro ao vincular taxas de juro:", error?.message || error);
  }

  return results;
};