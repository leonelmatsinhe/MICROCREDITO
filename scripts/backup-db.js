/* Backup simples de uma base (estrutura + dados) sem depender de mysqldump.
   Uso: node tools-tmp/backup-db.js [nomeDaBase] */
require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const QUOTE = String.fromCharCode(92) + String.fromCharCode(34); // \"

const esc = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Date) return `"${v.toISOString().slice(0, 19).replace("T", " ")}"`;
  if (typeof v === "number") return String(v);
  if (typeof v === "bigint") return String(v);
  if (Buffer.isBuffer(v)) return `0x${v.toString("hex")}`;
  const texto = String(v)
    .split(String.fromCharCode(92)).join(QUOTE.replace(QUOTE, "") + QUOTE.replace(QUOTE, ""))
    .split(QUOTE).join(QUOTE.replace(QUOTE, "") + QUOTE.replace(QUOTE, ""));
  return `"${texto.split(String.fromCharCode(34)).join(QUOTE).split("\n").join("\\n").split("\r").join("\\r")}"`;
};

(async () => {
  const db = process.argv[2] || process.env.DATABASE_NAME;
  const c = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASS,
    port: Number(process.env.DATABASE_PORT) || 3306,
    multipleStatements: true,
  });
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const outDir = path.join(process.cwd(), "database", "backups");
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${db}_${stamp}.sql`);

  const [tabs] = await c.query(
    "SELECT table_name t FROM information_schema.TABLES WHERE table_schema = ? AND table_type = ? ORDER BY table_name",
    [db, "BASE TABLE"]
  );

  const partes = [
    `-- Backup de ${db} em ${new Date().toISOString()}`,
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS=0;",
  ];
  let total = 0;

  for (const { t } of tabs) {
    const [[ddl]] = await c.query(`SHOW CREATE TABLE \`${db}\`.\`${t}\``);
    partes.push(`\n-- ---------- ${t} ----------`, `DROP TABLE IF EXISTS \`${t}\`;`, ddl["Create Table"] + ";");
    const [rows] = await c.query(`SELECT * FROM \`${db}\`.\`${t}\``);
    if (rows.length) {
      const cols = Object.keys(rows[0]);
      const chunks = rows.map((r) => "(" + cols.map((k) => esc(r[k])).join(",") + ")");
      partes.push(
        `INSERT INTO \`${t}\` (${cols.map((x) => `\`${x}\``).join(",")}) VALUES\n${chunks.join(",\n")};`
      );
    }
    total += rows.length;
    console.log(`  ${t}: ${rows.length}`);
  }

  partes.push("SET FOREIGN_KEY_CHECKS=1;");
  fs.writeFileSync(out, partes.join("\n"), "utf8");
  console.log(`\nBackup: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB · ${total} linhas · ${tabs.length} tabelas)`);
  await c.end();
})();
