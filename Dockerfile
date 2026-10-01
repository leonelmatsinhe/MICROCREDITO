# ─────────────────────────────────────────────────────────────────────────────
# MBR Microcrédito — imagem de produção (Dokploy / qualquer Docker)
#
# Multi-stage: frontend (Quasar/Vite → public-v2) + backend (tsc → build/) e
# runtime enxuto só com dependências de produção.
#
# Volumes obrigatórios em produção (persistência entre rebuilds):
#   /app/uploads  → documentos, PDFs de recibos e pacotes de concessão
#
# A base de dados é MySQL externo (variáveis DATABASE_*); nada de DB dentro da
# imagem. As migrações correm no arranque do servidor (src/app.ts) e são
# idempotentes — nunca tocam nas carteiras existentes se SKIP_WALLET_MIGRATION=1.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build do frontend ──────────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app
COPY web-app-v2/package.json web-app-v2/package-lock.json ./web-app-v2/
RUN cd web-app-v2 && npm ci
COPY web-app-v2/ web-app-v2/
# Saída: /app/public-v2 (outDir ../public-v2 do vite)
RUN cd web-app-v2 && npm run build

# ── Stage 2: build do backend (TypeScript) ──────────────────────────────────
FROM node:20-alpine AS backend
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src/ src/
RUN npx tsc

# ── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Fuso horário dos documentos legais (recibos, extractos, pacotes)
ENV TZ=Africa/Maputo
RUN apk add --no-cache tzdata

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=backend /app/build ./build
COPY --from=frontend /app/public-v2 ./public-v2

# Pasta de ficheiros persistidos (montar como volume em produção)
RUN mkdir -p uploads

EXPOSE 4000
CMD ["node", "build/src/app.js"]
