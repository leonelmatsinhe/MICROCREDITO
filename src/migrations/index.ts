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

  return results;
};