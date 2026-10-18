import fs from "fs";
import path from "path";
import bcryptjs from "bcryptjs";
import { Transaction } from "sequelize";
import { db } from "../database/db";
import { AuditLogModel } from "../database/models/paymentsV2Models";
import { LogsModel } from "../database/models/LogsModel";
import { isBcryptHash } from "../utils/password";

/**
 * RESET GERAL DE DADOS OPERACIONAIS — "começar do zero" em produção.
 * ================================================================
 * Apaga TODOS os dados operacionais (mutuários, créditos, prestações,
 * pagamentos, recibos, caixas, cobrança, mensagens e auditoria) mantendo a
 * estrutura base da instituição: utilizadores, empresas, contas bancárias
 * (com saldo zerado), carteiras de financiamento (saldos zerados), taxas,
 * regras de aprovação e templates.
 *
 * GARANTIAS FISCAIS (AT Moçambique):
 *  - `recibos` é esvaziada e o AUTO_INCREMENT volta a 1;
 *  - `recibos_sequencia` (contador por empresa/ano, fonte do nº do recibo em
 *    src/services/reciboService.ts) volta a 0 → o próximo recibo é o nº 1.
 *
 * SEGURANÇA:
 *  - tudo corre dentro de UMA transação MySQL (BEGIN … COMMIT | ROLLBACK);
 *  - ANTES de qualquer apagão é gerado um backup SQL em <raiz>/backups/;
 *  - a operação é registada em audit_log (quando, quem, de onde) e em
 *    user_logs (visível na página de Logs).
 *
 * NOTA SOBRE DDL: em MySQL, TRUNCATE e ALTER TABLE fazem COMMIT implícito e
 * quebrariam o ROLLBACK. Por isso usa-se DELETE (DML, reversível) dentro da
 * transação e o `ALTER TABLE … AUTO_INCREMENT = 1` corre DEPOIS do COMMIT.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TABELAS OPERACIONAIS — ordem filho→pai (respeita as FKs reais da BD):
//   payment_allocations/late_accruals → tranzactions → amortization_loans →
//   customer_loans → customers; notifications antes de customers; etc.
// ─────────────────────────────────────────────────────────────────────────────
export const RESET_TABLES: { table: string; label: string }[] = [
  { table: "payment_allocations", label: "Alocações de pagamento (PENALTY/JUROS/CAPITAL)" },
  { table: "late_accruals", label: "Mora accrescida dia a dia" },
  { table: "idempotency_keys", label: "Chaves de idempotência de pagamentos" },
  { table: "tranzactions", label: "Pagamentos (tranzactions)" },
  { table: "recibos", label: "Recibos fiscais (AT)" },
  { table: "debts", label: "Dívidas" },
  { table: "amortization_loans", label: "Prestações / planos de amortização" },
  { table: "loan_approvals", label: "Fluxo de aprovação de créditos" },
  { table: "concession_packages", label: "Pacotes de concessão (documentos do crédito)" },
  { table: "loan_guarantees", label: "Garantias patrimoniais e avaliações" },
  { table: "customer_documents", label: "Documentos (BI, NUIT, …)" },
  { table: "notifications", label: "Notificações" },
  { table: "customer_credits", label: "Saldos a favor de clientes (troco)" },
  { table: "collection_activities", label: "Cobrança (visitas, ligações, promessas)" },
  { table: "customer_loans", label: "Créditos (customer_loans)" },
  { table: "customers", label: "Mutuários (customers)" },
  { table: "cash_movements", label: "Movimentos de caixa" },
  { table: "cash_differences", label: "Diferenças de caixa (quebras/sobras)" },
  { table: "cash_registers", label: "Caixas diários" },
  { table: "bank_transactions", label: "Movimentos das contas bancárias / M-Pesa" },
  { table: "audit_log", label: "Trilha de auditoria" },
  { table: "user_logs", label: "Registo de actividades (Logs)" },
  { table: "sms", label: "SMS enviados" },
  { table: "sms_queue", label: "Fila de SMS" },
  { table: "sms_gateway_inbox", label: "Caixa de entrada do gateway SMS" },
  { table: "whatsapp_messages", label: "Mensagens de WhatsApp" },
  // Módulo isolado de microcrédito (mesmos dados de teste sob outro esquema)
  { table: "microcredit_payment_events", label: "Eventos de pagamento (microcrédito)" },
  { table: "pagamentos_credito", label: "Pagamentos (microcrédito)" },
  { table: "movimentos_financeiros_operador", label: "Movimentos financeiros (microcrédito)" },
  { table: "creditos", label: "Créditos (microcrédito)" },
  { table: "clientes_microcredito", label: "Clientes (microcrédito)" },
];

/** Tabelas que NÃO são apagadas mas ficam com saldos a zero. */
export const ZEROED_TABLES: { table: string; label: string }[] = [
  { table: "accounts", label: "Contas bancárias / M-Pesa (saldo → 0.00)" },
  { table: "financing_wallets", label: "Carteiras de financiamento (saldos → 0)" },
  { table: "recibos_sequencia", label: "Contador fiscal de recibos (→ 1/2026)" },
];

/** Estrutura preservada (nunca tocada). Mostrada ao Admin antes de confirmar. */
export const KEPT_TABLES: { table: string; label: string }[] = [
  { table: "users", label: "Utilizadores (Admin, Gestores, Operadores, Parceiros)" },
  { table: "companies", label: "Dados da empresa (nome, NUIT, morada, logo)" },
  { table: "accounts", label: "Contas bancárias e M-Pesa cadastradas (saldo zerado)" },
  { table: "financing_wallets", label: "Carteiras de financiamento (saldos zerados)" },
  { table: "interest_rates", label: "Taxas de juro" },
  { table: "approval_rules", label: "Regras de aprovação (alçadas)" },
  { table: "company_penalty_rules", label: "Regras de mora da empresa" },
  { table: "contract_templates", label: "Templates de contrato" },
  { table: "subscription_plans", label: "Planos de subscrição" },
  { table: "provinces", label: "Províncias e distritos" },
  { table: "onboarding_progress", label: "Checklist de onboarding da equipa" },
];

const PROJECT_ROOT = (() => {
  const isCompiled =
    __dirname.includes(path.sep + "build" + path.sep) || __dirname.endsWith(path.sep + "build");
  return isCompiled ? path.join(__dirname, "..", "..", "..") : path.join(__dirname, "..", "..");
})();

export const BACKUPS_DIR = path.join(PROJECT_ROOT, "backups");

export class SystemResetError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW — o que vai ser apagado (contagens reais, para o modal de confirmação)
// ─────────────────────────────────────────────────────────────────────────────
const tableExists = async (table: string): Promise<boolean> => {
  const [rows]: any = await db.query(
    "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    { replacements: [table] }
  );
  return Array.isArray(rows) && rows.length > 0;
};

export const countRows = async (table: string): Promise<number> => {
  if (!(await tableExists(table))) return 0;
  const [rows]: any = await db.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
  return Number(rows?.[0]?.total ?? 0);
};

export const previewReset = async () => {
  const deleted: any[] = [];
  for (const entry of RESET_TABLES) {
    deleted.push({ ...entry, rows: await countRows(entry.table) });
  }
  // As tabelas que ficam (zeradas ou intactas) também levam contagem: o Admin —
  // e o tour guiado — só aceitam números reais, nunca exemplos.
  const zeroed: any[] = [];
  for (const entry of ZEROED_TABLES) {
    zeroed.push({ ...entry, rows: await countRows(entry.table) });
  }
  const kept: any[] = [];
  for (const entry of KEPT_TABLES) {
    kept.push({ ...entry, rows: await countRows(entry.table) });
  }
  return {
    deleted,
    zeroed,
    kept,
    totalRecords: deleted.reduce((sum, t) => sum + Number(t.rows || 0), 0),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// BACKUP — dump SQL dos dados que vão ser apagados (INSERTs reexecutáveis)
// ─────────────────────────────────────────────────────────────────────────────
const escapeValue = (value: any): string => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
  const str = String(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
  return `'${str}'`;
};

export const generateBackupSql = async (actorName: string): Promise<string> => {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
    now.getHours()
  )}-${pad(now.getMinutes())}`;
  const fileName = `backup_pre_reset_${stamp}.sql`;
  const filePath = path.join(BACKUPS_DIR, fileName);

  const lines: string[] = [
    "-- BACKUP PRE-RESET — gerado automaticamente pelo FreeBuff",
    `-- Data: ${now.toISOString()}`,
    `-- Executado por: ${actorName}`,
    "-- Conteúdo: dados operacionais que são apagados pelo Reset Geral.",
    "-- Restauro: mysql -u <user> -p <base> < este_ficheiro",
    "SET FOREIGN_KEY_CHECKS=0;",
    "",
  ];

  for (const { table } of RESET_TABLES) {
    if (!(await tableExists(table))) continue;
    const [rows]: any = await db.query(`SELECT * FROM \`${table}\``);
    if (!Array.isArray(rows) || rows.length === 0) continue;

    lines.push(`-- ── ${table} (${rows.length} registo(s)) ──`);
    for (const row of rows) {
      const cols = Object.keys(row);
      const values = cols.map((c) => escapeValue(row[c])).join(", ");
      lines.push(
        `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES (${values});`
      );
    }
    lines.push("");
  }

  // Valores anteriores das tabelas que ficam mas são zeradas (permitem reverter).
  for (const { table } of ZEROED_TABLES) {
    if (!(await tableExists(table))) continue;
    const [rows]: any = await db.query(`SELECT * FROM \`${table}\``);
    if (!Array.isArray(rows) || rows.length === 0) continue;
    lines.push(`-- ── ${table} (valores ANTES do reset, para referência) ──`);
    for (const row of rows) {
      const cols = Object.keys(row);
      const values = cols.map((c) => escapeValue(row[c])).join(", ");
      lines.push(
        `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES (${values});`
      );
    }
    lines.push("");
  }

  lines.push("SET FOREIGN_KEY_CHECKS=1;");
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
  return filePath;
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET — transação única + reset da sequência fiscal
// ─────────────────────────────────────────────────────────────────────────────
export type ResetActor = {
  id: number;
  name: string;
  email?: string;
  companyId: number;
  ip?: string | null;
};

/** Verifica a senha do Admin logado (bcrypt; fallback para texto simples em
 *  instalações antigas, mesma convenção de hashPasswordIfNeeded). */
export const verifyAdminPassword = async (user: any, password: string): Promise<boolean> => {
  const stored = String(user?.password ?? "");
  if (!stored || !password) return false;
  if (isBcryptHash(stored)) return bcryptjs.compare(String(password), stored);
  // Senha legada em texto simples (pré-hash) — comparação exacta.
  return String(password) === stored;
};

const deleteTable = async (table: string, transaction: Transaction): Promise<number> => {
  if (!(await tableExists(table))) return 0;
  const [result]: any = await db.query(`DELETE FROM \`${table}\``, { transaction });
  return Number(result?.affectedRows ?? 0);
};

export const runOperationalReset = async (actor: ResetActor) => {
  // 1) BACKUP — ANTES de apagar qualquer coisa (fora da transação: é só leitura
  //    e escrita em ficheiro; se falhar, o reset nem começa).
  const backupPath = await generateBackupSql(actor.name);

  // 2) PURGE em transação — BEGIN … COMMIT; qualquer erro faz ROLLBACK.
  const deleted: Record<string, number> = {};
  await db.transaction(async (transaction) => {
    // Ordem inversa às FKs nunca é suficiente sozinha (há auto-referências em
    // recibos.annulled_by_recibo_id) — desliga as checagens SÓ nesta sessão.
    await db.query("SET FOREIGN_KEY_CHECKS = 0", { transaction });
    try {
      for (const { table } of RESET_TABLES) {
        deleted[table] = await deleteTable(table, transaction);
      }

      // Contas bancárias: mantêm-se cadastradas, saldos a zero.
      await db.query(
        "UPDATE accounts SET balance = 0, initial_balance = 0, updatedAt = NOW()",
        { transaction }
      );
      // Carteiras de financiamento: mantêm-se, todos os saldos a zero.
      await db.query(
        `UPDATE financing_wallets
            SET allocated_amount = 0, initial_disbursed_amount = 0, updated_at = NOW()`,
        { transaction }
      );
      // Contador fiscal: o próximo recibo volta a ser o nº 1 do ano corrente.
      await db.query("UPDATE recibos_sequencia SET ultima_sequencia = 0", { transaction });

      // Caixa: nenhum caixa pode ficar aberto após o reset.
      await db.query(
        `UPDATE cash_registers
            SET opening_balance = 0, total_in = 0, total_out = 0,
                total_cash_in = 0, total_cash_out = 0, total_bank_in = 0, total_bank_out = 0,
                status = 'FECHADO', closed_at = NOW()`,
        { transaction }
      );

      // Trilha do reset — apagou-se o histórico, mas o registo deste apagão
      // fica (é o único evento novo em audit_log/user_logs).
      const summary = JSON.stringify({
        backup: path.basename(backupPath),
        deleted,
        tables: RESET_TABLES.length,
      });
      await AuditLogModel.create(
        {
          user_id: actor.id,
          company_id: actor.companyId,
          ip: actor.ip || null,
          action: "SYSTEM_DATA_RESET",
          entity: "system",
          entity_id: null,
          before_data: { note: "Histórico operacional apagado pelo reset geral" },
          after_data: { summary },
        },
        { transaction }
      );
      await LogsModel.create(
        {
          companyId: actor.companyId,
          description: `Reset geral de dados operacionais executado (${Object.values(
            deleted
          ).reduce((a, b) => a + b, 0)} registo(s) apagado(s); backup: ${path.basename(
            backupPath
          )}). Recibos reiniciam do nº 1.`,
          userId: actor.id,
          userName: actor.name,
          userRole: 0,
          action: "RESET_GERAL",
          module: "Administração do Sistema",
          ipAddress: actor.ip || null,
        },
        { transaction }
      );

      await db.query("SET FOREIGN_KEY_CHECKS = 1", { transaction });
    } catch (error) {
      // Garante que a sessão não fica com FKs desligadas mesmo em ROLLBACK.
      try {
        await db.query("SET FOREIGN_KEY_CHECKS = 1");
      } catch {
        /* a conexão pode já ter sido fechada pelo rollback */
      }
      throw error;
    }
  });

  // 3) DDL DEPOIS do COMMIT — em MySQL o ALTER TABLE faz commit implícito, por
  //    isso só pode correr fora da transação. A tabela `recibos` já está vazia.
  await db.query("ALTER TABLE `recibos` AUTO_INCREMENT = 1");

  const totalDeleted = Object.values(deleted).reduce((a, b) => a + b, 0);
  return { deleted, totalDeleted, backupPath };
};
