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

# 1. Pull do GitHub
echo ""
echo "[1/5] A obter alteracoes do GitHub..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
echo "  -> Codigo atualizado."

# 2. Instalar dependencias (caso haja novas)
echo ""
echo "[2/5] A verificar dependencias..."
npm install --production=false
echo "  -> Dependencias atualizadas."

# 3. Compilar backend (TypeScript -> build/)
echo ""
echo "[3/5] A compilar o backend (tsc)..."
npx tsc
echo "  -> Backend compilado."

# 4. Reiniciar PM2
echo ""
echo "[4/5] A reiniciar o servidor via PM2..."
pm2 start ecosystem.config.cjs --update-env
pm2 save
echo "  -> PM2 iniciado."

# 5. Verificar se esta a correr
echo ""
echo "[5/5] A verificar estado do servidor..."
sleep 2
if pm2 list | grep -q "online"; then
  echo "  -> Servidor ONLINE!"
else
  echo "  -> AVISO: Servidor pode nao estar a correr. Verifique: pm2 logs"
fi

echo ""
echo "=========================================="
echo "  DEPLOY CONCLUIDO COM SUCESSO!"
echo "=========================================="
echo ""
pm2 list
