#!/bin/bash
# ==============================================================================
# SCRIPT DE SINCRONIZAÇÃO DE UPLOADS PARA VPS (DOKPLOY)
# Transfere ficheiros existentes (logotipos, contratos, garantias, recibos)
# para o volume persistente no VPS sem sobrescrever ficheiros mais recentes.
#
# Uso:
#   ./scripts/sync-uploads-to-vps.sh utilizador@ip-do-vps /var/lib/docker/volumes/microcredito_uploads/_data
# ==============================================================================

VPS_TARGET=$1
VPS_PATH=${2:-"/etc/dokploy/volumes/microcredito-uploads"}

if [ -z "$VPS_TARGET" ]; then
  echo "Erro: Informe o destino SSH do VPS."
  echo "Exemplo: ./scripts/sync-uploads-to-vps.sh root@167.172.x.x /etc/dokploy/volumes/microcredito-uploads"
  exit 1
fi

echo "==> A iniciar sincronização segura de uploads..."
rsync -avz --ignore-existing ./uploads/ "$VPS_TARGET:$VPS_PATH/"
echo "==> Sincronização concluída com sucesso! Os ficheiros estão preservados no volume persistente."
