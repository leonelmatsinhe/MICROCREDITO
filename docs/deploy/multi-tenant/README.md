# Multi-tenant (single-tenant por instalação) — PROD + DEMO na mesma VPS

Mesmo código, duas pastas, duas bases de dados, duas portas. Cada tenant é
uma **cópia clonada do repo** com `.env` próprio — arquitectura
single-tenant: o `tenantGuard` (`TENANT_MODE=single`) força sempre o
`companyId` do respectivo `.env`, independentemente do que o cliente mande.

## Estrutura

```
/opt/microcredito/
├── ecosystem.config.cjs      # espelho do da raiz do repo (sincronizado pelo deploy)
├── tenant-a/                 # PROD   → PORT 4000 · BD actual do prod (ex.: mbr_microcredito)
│   ├── .env                  #   (não versionado, chmod 600)
│   ├── uploads/              #   documentos PROD (nunca partilhados)
│   └── …clone do repo…
└── tenant-b/                 # DEMO   → PORT 4001 · BD microcredito_b
    ├── .env
    ├── uploads/
    └── …clone do repo…
```

## Primeira instalação (uma vez)

```bash
cd /opt/microcredito/tenant-a   # ou de qualquer clone do repo
./scripts/deploy.sh init-tenants        # cria tenant-a, tenant-b, .env de exemplo, BDs

# 1) editar os .env (senhas! segredos gerados à parte):
nano /opt/microcredito/tenant-a/.env    # PORT=4000 DATABASE_NAME=microcredito_a …
nano /opt/microcredito/tenant-b/.env    # PORT=4001 DATABASE_NAME=microcredito_b …

# 2) se o mysql local não criou as BDs e utilizadores, correr o SQL do init;
# 3) primeiro deploy dos 2 tenants:
./scripts/deploy.sh

# 4) Nginx + SSL (blocos em docs/deploy/multi-tenant/nginx-*.conf):
sudo ln -s /etc/nginx/sites-available/microcredito-a.conf      /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/microcredito-demo.conf  /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d a.tuaempresa.co.mz
sudo certbot --nginx -d demo.tuaempresa.co.mz
```

## Migrar um PROD já a correr (VPS existente, 1 app)

O app antigo (`microcredito`) ocupa a porta 4000, portanto a troca tem de ser
feita por esta ordem — a janela de downtime é o build da primeira corrida:

```bash
cd /home/mbr/MICROCREDITO          # (ou o caminho do clone actual)
./scripts/deploy.sh init-tenants  # 1) cria tenant-a, tenant-b, .env de exemplo e a BD demo

nano /opt/microcredito/tenant-a/.env   # 2) PROD: manter a BD ACTUAL (ex.: mbr_microcredito),
                                       #    PORT=4000, credenciais reais, segredos
nano /opt/microcredito/tenant-b/.env   # 3) DEMO: DATABASE_NAME=microcredito_b, PORT=4001,
                                       #    segredos NOVOS (nunca copiar os do prod)
# (a BD microcredito_b: o init tentou criá-la; senão, correr o SQL que imprimiu)

pm2 stop microcredito                  # 4) janela de troca: parar o app antigo (":4000")
./scripts/deploy.sh                    #    modo multi: builda e sobe os 2 tenants

pm2 status                            # 5) confirmar microcredito-a + microcredito-demo online
pm2 delete microcredito && pm2 save   #    limpar a entrada antiga

# 6) SÓ se a BD do tenant (microcredito_a) estiver VAZIA (foi criada pelo init):
#    mysql -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='microcredito_a'"
#    → 0  =>  pode apagar: mysql -e "DROP DATABASE microcredito_a;"
#    → >0 => NÃO APAGAR (tem dados)
```

Se o deploy automático (webhook/CI) aponta para o clone antigo
(`/home/mbr/MICROCREDITO/scripts/deploy.sh`), continua a funcionar depois da
migração: esse script detecta os tenants em `/opt/microcredito` e passa a
fazer o loop. Mais tarde pode apontar o webhook directamente para
`/opt/microcredito/tenant-a/scripts/deploy.sh` e arquivar o clone antigo.

## Semear a DEMO (obrigatório — as migrações não criam o esquema)

As migrações deste projecto são **incrementais**: criam só tabelas auxiliares
novas; o esquema base (customers, users, tranzactions, recibos…) vem de um
dump. Uma BD nova (ex.: `microcredito_b`) fica vazia e a app rebenta com
`Table … doesn't exist`. Copia-se do prod:

```bash
cd /opt/microcredito/tenant-a   # (ou qualquer clone, para correr o script)
./scripts/deploy.sh seed-demo  # lê DATABASE_NAME/USER/PASS dos .env dos tenants
# equivalente manual:
mysqldump mbr_microcredito | mysql microcredito_b
```

**Protecção de dados:** se a BD da demo **já tem tabelas/dados**, o
`seed-demo` **aborta** (o mysqldump inclui `DROP TABLE` — importar por cima
destruiria os dados). Só passa a barreira explícita `seed-demo --force`.
Aviso: forçar deixa a demo com dados reais do prod (inclui PII de
mutuários) — anonimise ou use dump parcial se for expor publicamente.

## Regras single-tenant

| Regra | Como funciona |
|---|---|
| **Uma BD por tenant** | Cada `.env` define a SUA `DATABASE_NAME` (ex.: `mbr_microcredito` no prod existente, `microcredito_b` no demo). O ecosystem **não** sobrescreve — migrate e runtime partilham sempre o mesmo `.env`. |
| **Migrações isoladas** | O deploy corre `npm run migrate` **dentro de cada tenant**, logo cada BD recebe as suas migrações, na sua ordem. Nunca correr migrate de um tenant dentro da pasta do outro. |
| **Uploads isolados** | Cada tenant tem o seu `uploads/` (recibos, fotos, logotipos). O `gitignore` é garantido pelo deploy. |
| **Logs separados** | `pm2 logs microcredito-a` · `pm2 logs microcredito-demo`. |
| **Portas** | PROD 4000, DEMO 4001 — só o Nginx é exposto ao exterior. |
| **Segredos** | `APP_SECRET` e `RECIBO_HASH_SECRET` **diferentes** por tenant (gere dois: `openssl rand -hex 32`). Tokens/URLs de recibos do demo não validam no prod. |
| **Deploy atómico e isolado** | `deploy.sh` faz build+migrate e só depois `pm2 startOrReload … --only <app>`. Falha num tenant não toca ao outro; o prod é sempre processado primeiro. |

## Ordem PM2 correta

```bash
pm2 startOrReload /opt/microcredito/ecosystem.config.cjs --update-env          # ambos
pm2 startOrReload /opt/microcredito/ecosystem.config.cjs --only microcredito-a # só prod
pm2 save                                                   # persiste no resurrect
pm2 list                                                   # estado
```

O `ecosystem.config.cjs` é dinâmico: exporta um app por pasta existente
(`tenant-a` → `microcredito-a`, `tenant-b` → `microcredito-demo`); se
existirem ambos os tenants e nenhum outro caminho, o modo single (1 app)
é o fallback para clones avulsos (dev Windows, VPS antiga).

## Remover o DEMO sem afectar o PROD

```bash
# 1) parar e desregistrar só o demo
pm2 delete microcredito-demo
pm2 save

# 2) remover a pasta do tenant demo
rm -rf /opt/microcredito/tenant-b

# 3) base de dados do demo (irreversível — certificar!)
mysql -e "DROP DATABASE IF EXISTS microcredito_b;
          DROP USER IF EXISTS 'microcredito_b'@'localhost';"

# 4) Nginx + SSL do demo
sudo rm -f /etc/nginx/sites-enabled/microcredito-demo.conf \
           /etc/nginx/sites-available/microcredito-demo.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot delete --cert-name demo.tuaempresa.co.mz

# 5) sincronizar ecosystem (passa a exportar só o app prod)
cp /opt/microcredito/tenant-a/ecosystem.config.cjs /opt/microcredito/ecosystem.config.cjs
pm2 startOrReload /opt/microcredito/ecosystem.config.cjs --update-env && pm2 save
```

O prod não é reiniciado em nenhum passo acima além do `startOrReload` final
do passo 5 (que só re-carrega `microcredito-a`; para zero toque, basta
`pm2 save` — o resurrect de boot é que usará a lista nova).

## Rollback de um tenant

```bash
git -C /opt/microcredito/tenant-a log --oneline -5     # escolher sha
git -C /opt/microcredito/tenant-a reset --hard <sha>
cd /opt/microcredito/tenant-a && npx tsc && (cd web-app-v2 && npx vite build)
pm2 restart microcredito-a --update-env
```
