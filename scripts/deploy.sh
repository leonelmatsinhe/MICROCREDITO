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

echo "=========================================="
echo "  DEPLOY - MBR Microcredito"
echo "  Branch: $BRANCH"
echo "=========================================="

# 1. Pull do GitHub
echo ""
echo "[1/4] A obter alteracoes do GitHub..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
echo "  -> Codigo atualizado."

# 2. Instalar dependencias (caso haja novas)
echo ""
echo "[2/4] A verificar dependencias..."
npm install --production=false
echo "  -> Dependencias atualizadas."

# 3. Compilar backend (TypeScript -> build/)
echo ""
echo "[3/4] A compilar o backend (tsc)..."
npx tsc
echo "  -> Backend compilado."

# 4. Reiniciar PM2
echo ""
echo "[4/4] A reiniciar o servidor via PM2..."
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
echo "  -> PM2 reiniciado."

echo ""
echo "=========================================="
echo "  DEPLOY CONCLUIDO COM SUCESSO!"
echo "=========================================="
echo ""
pm2 list
