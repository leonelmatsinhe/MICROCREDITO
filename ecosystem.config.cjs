/**
 * Configuração PM2 — arranque estável com cwd na raiz do projeto
 * (public/, uploads/ e .env resolvem corretamente).
 *
 * Uso:
 *   npm run deploy:pm2
 *   # ou: pm2 startOrReload ecosystem.config.cjs
 *
 * Arranque automático no Windows (uma vez):
 *   npm run pm2:startup
 */
const path = require("path");

const projectRoot = __dirname;

module.exports = {
  apps: [
    {
      name: "microcredito",
      script: path.join(projectRoot, "build", "src", "app.js"),
      cwd: projectRoot,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
