/**
 * Config PM2 — MBR Microcrédito
 *
 * O MESMO ficheiro serve dois layouts:
 *
 *  1. SINGLE (omissão) — o projecto é um só clone (Windows dev, VPS antigo).
 *     → 1 app "microcredito", cwd = pasta deste ficheiro (comportamento de sempre).
 *
 *  2. MULTI-TENANT — quando existem $TENANTS_DIR/tenant-a e/ou tenant-b
 *     (omissão: /opt/microcredito). Cada tenant é uma cópia do MESMO repo,
 *     com porta e base de dados próprias (arquitectura single-tenant).
 *       · microcredito-a     → tenant-a · PORT 4000 · BD microcredito_a (PROD)
 *       · microcredito-demo  → tenant-b · PORT 4001 · BD microcredito_b (DEMO)
 *     Se um dos tenants for removido (ex.: demo desligado), este ficheiro
 *     passa a exportar só os apps cujas pastas existem — sem editar nada.
 *
 * Precedência de variáveis: os blocos `env` abaixo VENCEM o .env de cada
 * tenant (o dotenv do projecto não sobrescreve variáveis já definidas).
 * As restantes variáveis (M-Pesa, SMS, e-mail, segredos) vêm do .env de
 * cada tenant — que também é o que `npm run migrate` lê ao correr dentro
 * da pasta do tenant.
 *
 * Uso:
 *   pm2 startOrReload ecosystem.config.cjs --update-env   # cria/recarrega
 *   pm2 startOrReload ecosystem.config.cjs --only microcredito-a
 *   pm2 save                                              # persiste p/ resurrect
 *   pm2 logs microcredito-a | pm2 logs microcredito-demo
 */
const fs = require("fs");
const path = require("path");

const TENANTS_DIR = process.env.MICROCREDITO_TENANTS_DIR || "/opt/microcredito";

const tenantDir = (name) => path.join(TENANTS_DIR, name);
const hasTenant = (name) => fs.existsSync(tenantDir(name));

const base = {
  instances: 1,
  exec_mode: "fork",
  autorestart: true,
  watch: false,
  max_memory_restart: "500M",
  env: { NODE_ENV: "production" },
};

const apps = [];

// ── TENANT A — PROD ─────────────────────────────────────────────
if (hasTenant("tenant-a")) {
  apps.push({
    ...base,
    name: "microcredito-a",
    script: path.join(tenantDir("tenant-a"), "build", "src", "app.js"),
    cwd: tenantDir("tenant-a"),
    env: {
      ...base.env,
      PORT: "4000",
      DATABASE_NAME: "microcredito_a",
    },
  });
}

// ── TENANT B — DEMO ─────────────────────────────────────────────
if (hasTenant("tenant-b")) {
  apps.push({
    ...base,
    name: "microcredito-demo",
    script: path.join(tenantDir("tenant-b"), "build", "src", "app.js"),
    cwd: tenantDir("tenant-b"),
    env: {
      ...base.env,
      PORT: "4001",
      DATABASE_NAME: "microcredito_b",
    },
  });
}

// ── MODO SINGLE (fallback: nenhum tenant encontrado) ────────────
if (apps.length === 0) {
  apps.push({
    ...base,
    name: "microcredito",
    script: path.join(__dirname, "build", "src", "app.js"),
    cwd: __dirname,
  });
}

module.exports = { apps };
