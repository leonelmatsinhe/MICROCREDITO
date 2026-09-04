#!/usr/bin/env bash
#
# deploy.sh - Script de deploy para o SERVIDOR (Ubuntu)
#
# Flujo: git pull -> instalar deps -> compilar backend -> reiniciar PM2
# (O build do frontend e feito manualmente e fica na pasta public/)
#
# Uso:
#   ./scripts/deploy.sh              # pull da branch main
#   ./scripts/deploy.sh feature/xyz  # pull de branch especifica
#
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

BRANCH="${1:-main}"
PORT="${PORT:-3000}"

echo "=========================================="
echo "  DEPLOY - MBR Microcredito"
echo "  Branch: $BRANCH"
echo "=========================================="

# 0. Matar processos na porta antes de tudo
echo ""
echo "[0/5] A limpar porta $PORT..."
pm2 delete all 2>/dev/null || true
fuser -k "$PORT/tcp" 2>/dev/null || true
sleep 1
echo "  -> Porta $PORT livre."

# 1. Preservar uploads (ficheiros sensíveis)
echo ""
echo "[1/6] A preservar pasta uploads..."
if [ -d "uploads" ]; then
  cp -r uploads /tmp/uploads_backup_$(date +%s) 2>/dev/null || true
  echo "  -> Backup de uploads criado em /tmp/"
fi

# 2. Pull do GitHub
echo ""
echo "[2/6] A obter alteracoes do GitHub..."
git fetch origin
git checkout "$BRANCH"
git stash 2>/dev/null || true
git pull origin "$BRANCH"

# Restaurar uploads após pull
if [ -d "/tmp/uploads_backup_"* ]; then
  LATEST_BACKUP=$(ls -dt /tmp/uploads_backup_* | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    cp -rn "$LATEST_BACKUP"/* uploads/ 2>/dev/null || true
    rm -rf "$LATEST_BACKUP"
    echo "  -> Uploads restaurados."
  fi
fi
echo "  -> Codigo atualizado."

# 3. Instalar dependencias (caso haja novas)
echo ""
echo "[3/8] A verificar dependencias..."
npm install --production=false
echo "  -> Dependencias atualizadas."

# 3.1 Instalar dependencias do frontend
echo ""
echo "[3.1/8] A instalar dependencias do frontend..."
cd web-app-v2
npm install
echo "  -> Dependencias do frontend atualizadas."

# 4. Compilar backend (TypeScript -> build/)
echo ""
echo "[4/8] A compilar o backend (tsc)..."
cd "$PROJECT_ROOT/src"
npx tsc
cd "$PROJECT_ROOT"
echo "  -> Backend compilado."

# 4.1 Aplicar migracoes de base de dados (idempotentes; tambem correm no arranque do servidor)
echo ""
echo "[4.1/8] A aplicar migracoes de base de dados..."
npm run migrate
echo "  -> Migracoes aplicadas."

# 5. Compilar frontend (Vite -> public-v2/)
echo ""
echo "[5/8] A compilar o frontend (Vite)..."
cd web-app-v2
npx vite build
cd "$PROJECT_ROOT"
echo "  -> Frontend compilado."

# 6. Reiniciar PM2
echo ""
echo "[6/8] A reiniciar o servidor via PM2..."
pm2 start ecosystem.config.cjs --update-env
pm2 save
echo "  -> PM2 iniciado."

# 7. Verificar se esta a correr
echo ""
echo "[7/8] A verificar estado do servidor..."
sleep 2
if pm2 list | grep -q "online"; then
  echo "  -> Servidor ONLINE!"
else
  echo "  -> AVISO: Servidor pode nao estar a correr. Verifique: pm2 logs"
fi

# 8. Limpar backups antigos
echo ""
echo "[8/8] A limpar backups antigos..."
rm -rf /tmp/uploads_backup_* 2>/dev/null || true
echo "  -> Backups limpos."

echo ""
echo "=========================================="
echo "  DEPLOY CONCLUIDO COM SUCESSO!"
echo "=========================================="
echo ""
pm2 list
