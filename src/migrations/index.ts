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
  // Credenciais enviadas (clientes) — enviar credenciais de acesso ao portal
  await addColumnIfMissing("customers", "credentialsSent", "INTEGER DEFAULT 0", results);
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

  // Fila de SMS (gateway Tsemba) — essencial para o serviço de SMS
  await createTableIfMissing(
    "sms_queue",
    `CREATE TABLE IF NOT EXISTS sms_queue (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      companyId INTEGER NOT NULL,
      accountNumber VARCHAR(255),
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

  return results;
};