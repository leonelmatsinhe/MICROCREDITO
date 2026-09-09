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

const modifyColumnType = async (
  table: string,
  column: string,
  definition: string,
  results: MigrationResult
) => {
  try {
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

  // Ocultar cláusula de seguro (VIGÉSIMA PRIMEIRA) no contrato de concessão
  await addColumnIfMissing("companies", "contractHideInsuranceClause", "INTEGER NOT NULL DEFAULT 0", results);

  // Fotografia tipo passe do mutuário (auto-cadastro público no portal)
  await addColumnIfMissing("customers", "passportPhotoUrl", "VARCHAR(255)", results);

  // Conta criada pelo próprio mutuário no portal (selo "Auto-cadastro" nas grelhas)
  await addColumnIfMissing("customers", "isSelfRegistered", "INTEGER NOT NULL DEFAULT 0", results);

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

  return results;
};