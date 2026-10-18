#!/usr/bin/env bash
#
# deploy.sh — MBR Microcrédito (Ubuntu / PM2 / Nginx)
#
# DOIS MODOS, o mesmo script:
#
#   deploy (omissão — também aceita uma branch como 1.º argumento)
#     · Layout SINGLE (o projecto é 1 clone, como sempre foi)
#         → builda e recarrega o app "microcredito".
#     · Layout MULTI-TENANT ($TENANTS_DIR/tenant-a E tenant-b existem)
#         → percorre os 2 tenants por ordem: PROD primeiro (tenant-a /
#           microcredito-a), DEMO a seguir (tenant-b / microcredito-demo).
#         → Cada tenant é ATÓMICO e ISOLADO: git pull + deps + tsc + vite +
#           migrate e SÓ DEPOIS `pm2 ... --only <app>`. Se o demo falhar em
#           QUALQUER passo, o prod já foi recarregado e continua online — e
#           se o prod falhar, o demo nem é tentado a ser recarregado.
#
#   init-tenants
#     · Cria a estrutura /opt/microcredito/{tenant-a,tenant-b} (clone do
#       repo, .env de exemplo, esqueleto de uploads) e sincroniza o
#       ecosystem.config.cjs. Idempotente — pode correr sempre.
#
# NÃO usa `pm2 delete all` nem `fuser -k` (mata outros projectos da VPS
# e punha o serviço em baixo durante o build).
#
# Uso:
#   ./scripts/deploy.sh                  # main
#   ./scripts/deploy.sh feature/xyz      # branch específica (nos 2 tenants)
#   ./scripts/deploy.sh init-tenants     # criar estrutura multi-tenant (1.ª vez)
#
# Variáveis opcionais:
#   MICROCREDITO_TENANTS_DIR  pasta base dos tenants  (omissão /opt/microcredito)
#   REPO_URL                  URL do repo p/ clones   (omissão leonelmatsinhe/MICROCREDITO)
#   TENANT_B_BRANCH           branch do tenant demo   (omissão main)
#   STRICT_DEPLOY=1           exit 1 se QUALQUER tenant falhar (omissão: só prod)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TENANTS_DIR="${MICROCREDITO_TENANTS_DIR:-/opt/microcredito}"
REPO_URL="${REPO_URL:-git@github.com:leonelmatsinhe/MICROCREDITO.git}"
BRANCH="${BRANCH:-main}"
TENANT_B_BRANCH="${TENANT_B_BRANCH:-main}"
ECOSYSTEM_SRC="$PROJECT_ROOT/ecosystem.config.cjs"

banner() { echo; echo "=========================================="; echo "  $1"; echo "=========================================="; }

# Dependências reproducíveis a partir do package-lock.
# --include=dev: o servidor precisa de typescript (tsc) e vite (build).
install_deps() {
  npm ci --include=dev
  (cd web-app-v2 && npm ci --include=dev)
}

# Compilação + migrações. O `npm run migrate` usa o .env DO TENANT em que
# está a correr (o env.ts carrega o .env da raiz do seu clone) — logo cada
# tenant migra a SUA base de dados, isolado dos restantes.
build_and_migrate() {
  npx tsc
  (cd web-app-v2 && npx vite build)
  npm run migrate
}

# uploads/ nunca vem do git; o guard garante que fica ignorado para o
# pull jamais tocar nos documentos (recibos, fotos, logotipos).
ensure_uploads() {
  mkdir -p uploads/{concessao,docs,documents,recibos}
  if [ -f .gitignore ] && ! grep -qE '^/?uploads/?$' .gitignore; then
    echo "uploads/" >> .gitignore
    echo "  -> AVISO: 'uploads/' faltava no .gitignore; adicionado."
  fi
}

# ── init-tenants: cria /opt/microcredito/{tenant-a,tenant-b} ─────────────
init_tenants() {
  banner "INIT — estrutura multi-tenant em $TENANTS_DIR"
  mkdir -p "$TENANTS_DIR"

  local t
  for t in tenant-a tenant-b; do
    echo ""
    echo "-- $t --"
    if [ -d "$TENANTS_DIR/$t/.git" ]; then
      echo "  -> clone já existe (não tocado)."
    else
      git clone "$REPO_URL" "$TENANTS_DIR/$t"
      if [ "$t" = "tenant-b" ] && [ "$TENANT_B_BRANCH" != "main" ]; then
        git -C "$TENANTS_DIR/$t" checkout "$TENANT_B_BRANCH"
      fi
    fi

    local env_file="$TENANTS_DIR/$t/.env"
    if [ ! -f "$env_file" ]; then
      cp "$TENANTS_DIR/$t/docs/deploy/multi-tenant/env.$t.example" "$env_file"
      chmod 600 "$env_file"
      echo "  -> .env criado a partir do exemplo. EDITE as senhas (DATABASE_PASS, APP_SECRET, RECIBO_HASH_SECRET)."
    else
      echo "  -> .env já existe (não tocado)."
    fi

    (cd "$TENANTS_DIR/$t" && mkdir -p uploads/{concessao,docs,documents,recibos})
  done

  cp -f "$ECOSYSTEM_SRC" "$TENANTS_DIR/ecosystem.config.cjs"
  echo ""
  echo "  -> ecosystem.config.cjs sincronizado para $TENANTS_DIR"

  banner "BASES DE DADOS — criar (ou correr o mysql abaixo)"
  cat <<'SQL'
CREATE DATABASE IF NOT EXISTS microcredito_a CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS microcredito_b CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'microcredito_a'@'localhost' IDENTIFIED BY 'SENHA_Forte_A';
GRANT ALL PRIVILEGES ON microcredito_a.* TO 'microcredito_a'@'localhost';
CREATE USER IF NOT EXISTS 'microcredito_b'@'localhost' IDENTIFIED BY 'SENHA_Forte_B';
GRANT ALL PRIVILEGES ON microcredito_b.* TO 'microcredito_b'@'localhost';
FLUSH PRIVILEGES;
SQL

  if command -v mysql >/dev/null 2>&1; then
    echo "  -> Melhor esforço: a criar as 2 bases via mysql local..."
    mysql -e "CREATE DATABASE IF NOT EXISTS microcredito_a CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" &&
      mysql -e "CREATE DATABASE IF NOT EXISTS microcredito_b CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" &&
      echo "  -> Bases de dados prontas (utilizadores: use o SQL acima, se ainda não existirem)."
  fi

  banner "PROXIMO PASSO"
  echo "  1) Edite $TENANTS_DIR/tenant-a/.env  (prod) e $TENANTS_DIR/tenant-b/.env (demo)"
  echo "  2) ATENÇÃO: as BDs criadas ficam VAZIAS — as migrações são incrementais e"
  echo "     não criam o esquema base. Copie o esquema/dados do prod para a demo:"
  echo "       $0 seed-demo          (ou: mysqldump <prod> | mysql <demo>)"
  echo "  3) Corra: $0            (deploy dos 2 tenants)"
  echo "  4) Nginx + SSL: docs/deploy/multi-tenant/README.md"
}

# ── deploy de UM tenant: atómico (ou tudo, ou nada) ──────────────────────
deploy_tenant() {
  local dir="$1" app="$2" branch="$3"
  banner "TENANT: $app — $dir (branch $branch)"
  {
    cd "$dir" &&
      ensure_uploads &&
      git fetch origin &&
      git checkout "$branch" &&
      (git stash 2>/dev/null || true) &&
      git pull origin "$branch" &&
      install_deps &&
      build_and_migrate &&
      # Recarrega SÓ este app — o serviço do outro tenant não é tocado.
      pm2 startOrReload "$TENANTS_DIR/ecosystem.config.cjs" --only "$app" --update-env
  } || {
    echo "  -> FALHOU o deploy de $app (o serviço já em execução mantém-se de pé)."
    return 1
  }
  echo "  -> $app actualizado e online."
}

# ── modo multi-tenant: loop com isolamento ───────────────────────────────
multi_deploy() {
  banner "DEPLOY MULTI-TENANT — $TENANTS_DIR"

  cp -f "$ECOSYSTEM_SRC" "$TENANTS_DIR/ecosystem.config.cjs"
  echo "  -> ecosystem.config.cjs sincronizado."

  local failed=()
  local prod_ok=1

  # PROD primeiro: mesmo que o demo falhe depois, o prod já está de pé.
  deploy_tenant "$TENANTS_DIR/tenant-a" "microcredito-a" "$BRANCH" ||
    { prod_ok=0; failed+=("microcredito-a"); }

  deploy_tenant "$TENANTS_DIR/tenant-b" "microcredito-demo" "$TENANT_B_BRANCH" ||
    failed+=("microcredito-demo")

  pm2 save || true

  banner "RESUMO"
  pm2 list

  if [ "${#failed[@]}" -gt 0 ]; then
    echo ""
    echo "  -> AVISO: falharam: ${failed[*]} — os restantes serviços continuam online."
    if [ "$prod_ok" -eq 0 ]; then
      echo "  -> O PROD falhou: exit 1."
      exit 1
    fi
    if [ "${STRICT_DEPLOY:-0}" = "1" ]; then
      echo "  -> STRICT_DEPLOY=1: exit 1."
      exit 1
    fi
    echo "  -> Prod online; falha só no demo (exit 0). Use STRICT_DEPLOY=1 para tratar como erro."
  else
    echo ""
    echo "  -> Todos os tenants online."
  fi
}

# ── modo single: o fluxo de sempre, corrigido ────────────────────────────
single_deploy() {
  banner "DEPLOY — $BRANCH (modo single)"
  cd "$PROJECT_ROOT"
  ensure_uploads

  git fetch origin
  git checkout "$BRANCH"
  git stash 2>/dev/null || true
  git pull origin "$BRANCH"

  install_deps
  build_and_migrate

  # Antes: `pm2 delete all` + `fuser -k` (mata outros projectos e põe tudo
  # em baixo durante o build) seguido de `pm2 start` (falha se já corre).
  # Agora: recarrega no sítio, sem downtime desnecessário.
  pm2 startOrReload ecosystem.config.cjs --update-env
  pm2 save

  sleep 2
  if pm2 jlist | grep -q '"status": *"online"'; then
    echo "  -> Servidor ONLINE."
  else
    echo "  -> AVISO: servidor pode não estar a correr. Veja: pm2 logs microcredito"
  fi
  curl -sf "http://localhost:${PORT:-4000}/" >/dev/null &&
    echo "  -> API responde em :${PORT:-4000}." ||
    echo "  -> AVISO: API não respondeu ao health check."

  pm2 list
}

# ── seed-demo: copia esquema + dados do PROD para a BD do DEMO ─────────
# As migrações são incrementais (não criam o esquema base): uma BD nova só
# funciona depois de receber o esquema — aqui copia-se do prod real.
read_env_var() { # $1 = ficheiro .env, $2 = chave
  grep -E "^$2=" "$1" 2>/dev/null | head -n 1 | cut -d= -f2- | tr -d '\r' | xargs || true
}

seed_demo() {
  banner "SEED DEMO — copiar PROD => DEMO"
  local env_a="$TENANTS_DIR/tenant-a/.env" env_b="$TENANTS_DIR/tenant-b/.env"
  if [ ! -f "$env_a" ] || [ ! -f "$env_b" ]; then
    echo "  -> Faltam .env dos tenants. Corra antes: $0 init-tenants"
    exit 1
  fi
  local db_a db_b user pass
  db_a="$(read_env_var "$env_a" DATABASE_NAME)"
  db_b="$(read_env_var "$env_b" DATABASE_NAME)"
  user="$(read_env_var "$env_a" DATABASE_USER)"
  pass="$(read_env_var "$env_a" DATABASE_PASS)"
  if [ -z "$db_a" ] || [ -z "$db_b" ]; then
    echo "  -> DATABASE_NAME em falta em $env_a ou $env_b."
    exit 1
  fi
  if [ "$db_a" = "$db_b" ]; then
    echo "  -> AVISO CRÍTICO: as 2 BDs são a MESMA ($db_a) — aborto para não auto-copiar."
    exit 1
  fi
  local opts=()
  [ -n "$user" ] && opts+=("-u$user")

  # PROTECÇÃO DE DADOS: o mysqldump inclui DROP TABLE — importar por cima
  # de uma BD da demo que JÁ TEM tabelas destruiria os dados existentes.
  local tables
  tables="$(MYSQL_PWD="$pass" mysql "${opts[@]}" -N -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$db_b'")"
  if [ "${tables:-0}" -gt 0 ] && [ "${1:-}" != "--force" ]; then
    echo "  -> A BD da DEMO ($db_b) já tem $tables tabela(s) — ABORTO para não destruir dados."
    echo "     • Quer manter os dados actuais? Não faça nada — a demo já tem esquema."
    echo "     • Quer mesmo substituir pelos do prod?  $0 seed-demo --force"
    exit 1
  fi

  echo "  -> $db_a  =>  $db_b   (mysqldump completo: esquema + dados)"
  MYSQL_PWD="$pass" mysqldump "${opts[@]}" "$db_a" |
    MYSQL_PWD="$pass" mysql "${opts[@]}" "$db_b"
  echo "  -> Demo semeada. NOTA: contém dados reais do prod — reveja/anonimise antes de expor publicamente."
}

# ── ponto de entrada ─────────────────────────────────────────────────────
main() {
  if [ "${1:-}" = "init-tenants" ]; then
    init_tenants
    return
  fi
  if [ "${1:-}" = "seed-demo" ]; then
    seed_demo "${@:2}"
    return
  fi
  if [ $# -gt 0 ]; then
    BRANCH="$1"
  fi

  if [ -d "$TENANTS_DIR/tenant-a" ] && [ -d "$TENANTS_DIR/tenant-b" ]; then
    multi_deploy
  else
    single_deploy
  fi

  banner "DEPLOY CONCLUIDO"
}

main "$@"
