# DOCUMENTO TÉCNICO OFICIAL — PLATAFORMA DE MICROCREDITO MBR

> **Versão:** 1.0 · **Data:** Outubro de 2026 · **Classificação:** Confidencial
> **Âmbito:** Plataforma single-tenant "Mais Mola / MBRM" — instituições de microcrédito em Moçambique.
> **Destinatários:** Clientes, investidores e novos desenvolvedores (onboarding técnico).

---

## Sumário executivo

A plataforma MBR é um sistema de gestão de microcrédito **aprovado para gerar relatórios do Banco de Moçambique**, desenhado para a realidade moçambicana (dinheiro móvel M-Pesa/e-Mola, múltiplas contas bancárias, alertas por SMS). Opera em arquitectura **single-tenant**: cada instituição (tenant) corre o **mesmo código** mas numa **pasta e base de dados próprias**, garantindo isolamento total dos dados.

| Componente | Tecnologia |
|---|---|
| Backend | Node.js 18 · Express 4 · TypeScript (compilado para `build/`) |
| Frontend | **Vue 3 · Quasar · Vite · Pinia** (SPA servida de `public-v2/`) |
| Base de dados | MySQL 8 / MariaDB ( Sequelize 6 · `mysql2` ) |
| Servidor | VPS Ubuntu 22.04 · PM2 (fork, 1 instância/app) · Nginx reverse proxy · Certbot SSL |
| Modelo | Single-tenant por base de dados (`TENANT_MODE=single`) |

> **Nota de precisão (v1.0):** o enunciado inicial referia "React + Vite" e "210+ migrações". Verificou-se no código que o frontend é **Vue 3 + Quasar** (`src/app.ts`: *"Frontend: servir de public-v2 (Quasar/Vue 3)"*) e que as migrações são **260+ operações idempotentes consolidadas num único ficheiro** (`src/migrations/index.ts`). Este documento reflecte o estado real do repositório.

---

# 1. VISÃO GERAL DA PLATAFORMA

## 1.1 Objetivo

Centralizar o **ciclo completo do crédito** de uma instituição de microcrédito — do pedido de mutuário à liquidação — com controlo de carteira, cálculo de mora, caixa diário reconciliado, alertas automáticos (SMS/WhatsApp) e **relatórios regulatórios do Banco de Moçambique (BM)** exportáveis em PDF/Excel. Reduzir a mora, eliminar a dupla digitação e fechar o mapa do BM em minutos em vez de dias.

## 1.2 Arquitectura single-tenant

Cada instituição cliente é um **tenant**: uma instalação dedicada que serve **uma só empresa**. Na VPS de produção convivem duas instâncias do mesmo código:

| Tenant | Pasta | App PM2 | Porta | Base de dados | Domínio | Ambiente |
|---|---|---|---|---|---|---|
| **A — Produção** | `/opt/microcredito/tenant-a` | `microcredito-a` | **4000** | `microcredito_a` | `a.tuaempresa.co.mz` | Prod |
| **B — Demonstração** | `/opt/microcredito/tenant-b` | `microcredito-demo` | **4001** | `microcredito_b` | `demo.tuaempresa.co.mz` | Demo |

## 1.3 Por que o mesmo código em pastas diferentes?

- **Isolamento físico vs. lógico:** em vez de partilhar uma BD e separar por coluna, cada tenant tem a **sua própria base de dados**. Um bug, um reset ou uma consulta lenta num ambiente nunca afecta o outro.
- **Configuração independente:** cada pasta tem o seu `.env` (porta, BD, segredos SMS/M-Pesa). O `ecosystem.config.cjs` e o `deploy.sh` leem sempre o `.env` **do tenant em que estão a correr** — o runtime e as migrações nunca divergem.
- **Deploy desacoplado:** o deploy percorre os tenants por ordem (prod primeiro). Uma falha no demo **não derruba o prod**.
- **Segurança por segregação:** segredos (`APP_SECRET`, `RECIBO_HASH_SECRET`) são distintos por tenant. Um token emitido por um ambiente é inútil no outro.

## 1.4 Isolamento de dados por base de dados

O isolamento é reforçado em três camadas:

1. **Camada de dados:** cada tenant liga-se a um `DATABASE_NAME` próprio (`microcredito_a` vs `microcredito_b`), com utilizadores MySQL dedicados e `GRANT ALL` restrito a cada schema.
2. **Camada de aplicação — `tenantGuard`:** o **primeiro middleware** registado em `src/app.ts` (`app.use(tenantGuard)`). Com `TENANT_MODE=single`, o `companyId` vindo do cliente (query, body ou params) é **sempre substituído** por `SINGLE_TENANT_COMPANY_ID`. Qualquer tentativa de forjar outro tenant gera um WARNING de segurança e a resposta continua a ser a da empresa única. As três propriedades do request ficam "seladas" com acessores próprios, para que reatribuições futuras (body-parser, router) continuem corrigidas.
3. **Camada de sessão:** o `companyId` usado nas consultas vem **sempre do token JWT autenticado**, nunca de parâmetros do pedido.

## 1.5 Vantagens vs. multi-tenant por coluna (`companyId`)

| Critério | Single-tenant por BD (adoptado) | Multi-tenant por coluna `companyId` |
|---|---|---|
| **Isolamento de dados** | Físico — impossível cruzar tenants por query | Lógico — um `WHERE` esquecido vaza dados |
| **Risco de auditoria/regulatória** | Baixo — dados segregados por instituição | Elevado — depende da disciplina de código |
| **Backup / restore por tenant** | Simples — `mysqldump` de um schema | Complexo — exportar subconjunto lógico |
| **Reset / demo de um cliente** | Sem risco para os restantes | Operação transversal arriscada |
| **Performance** | Índices e caches pequenos por BD | Tabelas partilhadas, crescimento global |
| **Segredos por cliente** | Naturais (`.env` dedicado) | Partilhados ou por tenant em runtime |
| **Escalabilidade horizontal** | Cada tenant escala à parte | Um só pool partilhado |
| **Custo de operação** | Mais VMs / mais cópias do código | Menos instâncias |

O trade-off (mais instâncias a correr) é assumido deliberadamente: para instituições financeiras reguladas, o **isolamento físico e a auditabilidade** superam a economia de instâncias.

---

# 2. PERFIS E FUNCIONALIDADES

O sistema tem **cinco papéis** (`users.userRole`), verificados pelos middlewares de `src/middlewares/roles.ts`:

| `userRole` | Perfil | Middleware associado | Âmbito |
|---|---|---|---|
| **0** | **Super Admin** (Super Admin da plataforma) | `isCompanyAdmin` / `isLoanAdmin` | Governança global, reset de sistema |
| **1** | **Admin** (Administrador da Instituição) | `isAdmin` / `isCompanyAdmin` / `isLoanAdmin` | Gestão total da empresa, finanças, desembolso |
| **2** | **Operador / Caixa** | `isAdmin`, `isStaff` | Operações do dia, caixa, lançamentos |
| **3** | **Gestor de Crédito** | `isStaff` | Carteira própria de clientes e cobrança |
| **4** | **Parceiro Financiador** | `isPartner` | Portal de leitura, só a sua carteira |

> O desembolso (`isLoanAdmin`) e as funcionalidades financeiras de caixa (`isCompanyAdmin`) são **exclusivas dos roles 0 e 1** — o Gestor de Crédito (3) apenas lança e valida a instrução; quem aprova e desembolsa é o Admin. Este é o modelo de **alçadas** (aprovar ≠ desembolsar).

## 2.1 ADMIN (Super Admin / Administrador da Instituição)

Responsável pela configuração, governança e operação financeira. Tabelas: `companies`, `users`, `subscription_plans`, `logs`, `accounts`, `financing_wallets`, `interest_rates`.

| Funcionalidade | Endpoint(s) | Tabela MySQL | Regra de negócio |
|---|---|---|---|
| **Gestão de empresas/tenants** | `GET/POST /api/company`, `GET/PUT /api/company/:id` | `companies` | Em modo single-tenant a empresa vem da sessão; o `tenantGuard` selou o `companyId`. |
| **Gestão de utilizadores** | `POST /api/users`, `GET /api/usersAll/:id`, `GET/PUT/DELETE /api/users/:id` | `users` | Senhas com `bcrypt` (`src/utils/password.ts`). Admin cria utilizadores da sua empresa. |
| **Credenciais por e-mail** | `POST /api/userCredentials` | `users` | Envia credenciais iniciais via SMTP (`nodemailer`). |
| **Contas de parceiro financiador** | `POST/PUT /api/users/parceiros[/:id]` | `users` + `financing_wallets` | Só Admin. Conta sempre ligada a **UMA** carteira com portal activo. |
| **Permissões / papéis** | (configuração por `userRole`) | `users.userRole` | 0–4 conforme tabela acima; verificação nos middlewares. |
| **Planos de subscrição** | `GET /api/subscription-plans` (público) | `subscription_plans` | Starter / Crescimento / Profissional (ver secção 2.1.1). |
| **Auditoria / logs** | `GET/POST/DELETE /api/logs` | `logs` | Toda a accão crítica é registada (quem, quê, quando, IP). `deleteLogs` só Admin. |
| **Config. global SMS** | `GET /api/sms-gateway/*`, `POST /api/sms-gateway/enqueue` | `sms_queue` | Fila persistente; sem API key a fila mantém-se intacta. |
| **Config. global M-Pesa** | `PUT /api/mpesa/receive`, `POST /api/mpesa/send` | (integração) | `mpesa-node-api`; credenciais no `.env`. |
| **Carteiras de financiamento** | `GET/POST/PUT/DELETE /api/wallets[...]` | `financing_wallets` | Dinheiro **analítico**; o dinheiro real fica nas contas de tesouraria. DELETE recusa (409) se houver movimento. |
| **Taxas de juro** | `GET/POST/PUT/DELETE /api/rate[/:id]` | `interest_rates` | Base do simulador e da classificação em carteiras. |
| **Relatório de financiador** | `GET /api/reports/financiadores/:companyId/:walletId[/excel]` | `financing_wallets`, `customer_loans`, `tranzacoes` | Isolado por carteira; o relatório BM consolidado não é alterado. |
| **Reset geral (Zona de Perigo)** | `GET /api/admin/system/reset-status`, `POST /api/admin/system/reset-operational-data` | (múltiplas) | Exige modo single-tenant + role 1 + palavra "RESETAR" + senha bcrypt. Preview do que será apagado. |
| **Backups** | (operacional — `mysqldump` diário, secção 7) | todas | Um dump por tenant, cron diário. |

### 2.1.1 Planos de subscrição

| Plano | Preço (MZN/mês) | Limite de clientes | Destaque |
|---|---|---|---|
| **Starter** | 2.500 | até 100 | Relatórios BM, suporte WhatsApp |
| **Crescimento** | 4.500 | até 500 | + Caixa multi-contas, alertas SMS *(popular)* |
| **Profissional** | 8.500 | ilimitados | + API completa, suporte prioritário |

Semeados por migração (`src/migrations/index.ts`). Em instalações single-tenant dedicadas o registo público de empresas está **desactivado** (ver `src/routes.ts`).

## 2.2 GESTOR (Manager da Instituição)

Gestor de Crédito (role 3) e Operador/Caixa (role 2) operam o dia-a-dia. Tabelas: `customers`, `customer_loans`, `amortization_loans`, `tranzacoes`, `customer_documents`, `debts`, `recibos`, `cash_registers`, `cash_movements`, `collection_activities`.

| Funcionalidade | Endpoint(s) | Tabela MySQL | Regra de negócio |
|---|---|---|---|
| **Dashboard** | `GET /api/dashboard/:companyId`, `GET /api/microcredito/dashboard` | (agregado) | KPIs, PAR, risco e alertas agregados. |
| **Clientes (CRUD)** | `GET/POST/PUT/DELETE /api/customer[...]`, `POST /api/customer/bulk` | `customers` | Importação em lote do Excel. `companyId` forçado pelo tenantGuard. |
| **KYC / documentos** | `GET/POST/PUT/DELETE /api/document[...]`, `GET /api/document/checklist/:accountNumber` | `customer_documents` | Checklist KYC por número de conta; upload via `multer`. |
| **Representante / licença** | (campos em `customers` — `companyRepresentative`, `companyLicense`) | `customers` | Dados da empresa mutuária para due diligence. |
| **Simulação de crédito** | `POST /api/loan/simulate` | — | Plano Price com a **mesma função** do desembolso — paridade garantida simulador/gravado. |
| **Criação de pedido** | `POST /api/loan` | `customer_loans` | Sem exigência de caixa aberto. |
| **Alçadas de aprovação** | `GET /api/loan/approval-rules`, `POST /api/loan/:id/{submit,approve,reject,prepare-disbursement}` | `customer_loans` | **Aprovar ≠ desembolsar.** Aprovação é decisão (não mexe no caixa). |
| **Desembolso** | `POST /api/createInstallmentsLoan/` | `amortization_loans`, `cash_movements`, `accounts` | `isLoanAdmin` (role 0/1) + `checkCashRegisterOpen`. Cria plano imutável e movimento SAIDA/DESEMBOLSO. |
| **Amortização / prestações** | `GET /api/loan/amortization/:id[/:forfeit]`, `GET /api/getpastInstallments/:id`, `GET /api/getUpcomingInstallments/:id` | `amortization_loans` | Plano cronológico por data de vencimento. |
| **Controlo de prestações** | `GET /api/installments/control/:companyId` | `amortization_loans` | Nomes resolvidos no servidor, sem N+1. |
| **Cobranças / carteira por gestor** | `GET/POST /api/collection/{activities,overdue,portfolio,claim,dashboard,ranking,meta}` | `collection_activities`, `customers` | Gestor só vê/opera a **sua** carteira; Admin vê tudo e o ranking. |
| **Transacções (pagamentos)** | `POST /api/tranzaction`, `GET /api/tranzaction[...]` | `tranzacoes` | Exige **caixa aberto** (`checkCashRegisterOpen`). Mora calculada no servidor. |
| **Liquidação total atómica** | `POST /api/tranzaction/bulk` | `tranzacoes`, `amortization_loans` | Todas as prestações pendentes numa **única** transacção SQL; falha → rollback total. |
| **Estorno formal** | `POST /api/tranzaction/:id/reverse` | `tranzacoes` | Só Admin; motivo obrigatório; transacção atómica. |
| **Quote oficial de mora** | `GET /api/installments/:id/quote` | `amortization_loans`, `late_accruals` | O frontend **deixa de calcular mora** — quote server-side. |
| **Recibos (numeração legal AT)** | `POST /api/recibos/gerar/:tranzactionId`, `GET /api/recibos/:id/pdf`, `GET /api/recibos/loan/:loanId` | `recibos` | Numeração sequencial legal (AT Moçambique), hash + QR. PDF gerado no backend (`pdfkit`). |
| **Validação pública do recibo** | `GET /api/recibos/validar`, `GET /api/validar-recibo` | `recibos` | **Pública** (destino do QR impresso) — registada antes do middleware `auth`. |
| **Contas / tesouraria** | `GET/POST/PUT/DELETE /api/account[...]` | `accounts`, `bank_transactions` | Contas reais (FNB, BCI, BIM, M-Pesa, e-Mola). |
| **Caixa diário** | `cashRoutes` (`/api/cash/*`) | `cash_registers`, `cash_movements` | Abrir/fechar caixa; pagamentos exigem caixa aberto. |
| **Débitos** | `GET/POST/DELETE /api/debt` | `debts` | Dívidas registadas. |
| **Alertas automáticos** | (jobs — ver secção 3.3) | `sms_queue`, `notifications` | Prestações a vencer (3 dias) + juros de mora; 30s após arranque e de 6 em 6h. |
| **Jobs de mora** | (job diário 00:05) | `late_accruals` | Accrual de mora com `INSERT IGNORE` (idempotente). |
| **Relatórios (BM)** | `GET /api/reports/banco-mocambique/:companyId[/excel]` | (agregado) | Mapa formatado conforme exigência do Banco de Moçambique. |
| **Exportação de grelhas** | `POST /api/export/{customers,loans,payments,installments}/excel` | (agregado) | Excel com estilos reais (padrão do relatório BM). |
| **Importação** | `POST /api/customer/bulk` | `customers` | Migração inicial do Excel. |
| **Garantias** | `GET/POST/DELETE /api/{getLoanGuarantees,createGuarantee,deleteGuarantee}` | `guarantees` | Cobertura vs. total a pagar (capital+juros) — aviso/bloqueio de aprovação. |
| **Pacote de concessão** | `GET/POST /api/loans/:loanId/concession[...]` | (documentos imutáveis) | Pacote imutável gerado 1× pós-desembolso, com hash + QR. |
| **Onboarding** | `GET/PUT /api/onboarding/me`, `GET /api/onboarding/team` | (progresso) | Checklist do primeiro dia; empresa vem sempre da sessão. |

## 2.3 PARCEIRO / AGENTE (Parceiro Financiador — role 4)

Portal de **leitura** para parceiros financiadores (e agentes com carteira atribuída). **Só a sua carteira**, nunca a de terceiros.

| Funcionalidade | Endpoint(s) | Tabela MySQL | Regra de negócio |
|---|---|---|---|
| **Perfil** | `GET /api/partner/profile` | `users`, `financing_wallets` | `isPartner` valida `userRole=4` + carteira + portal activo. |
| **Dashboard** | `GET /api/partner/dashboard` | (agregado) | Visão da **sua** carteira. |
| **Consulta de clientes / carteira** | `GET /api/partner/loans` | `customer_loans` | Só créditos da carteira do parceiro. |
| **Acompanhamento de prestações** | `GET /api/partner/installments` | `amortization_loans` | Estado das prestações da carteira. |
| **Mora** | `GET /api/partner/mora` | `late_accruals` | Atrasos da carteira. |
| **Transacções** | `GET /api/partner/transactions` | `tranzacoes` | Movimentos da carteira. |
| **Extracto** | `GET /api/partner/statement[/excel]` | (agregado) | Extracto exportável. |
| **Recibos** | `GET /api/partner/recibos[/:id/pdf]` | `recibos` | Comprovativos dos pagamentos da carteira. |
| **Criação de clientes** | (via staff com carteira) | `customers` | Agente cadastra mutuários da sua carteira. |
| **Submissão de empréstimos** | `POST /api/loan` (via fluxo de pedido) | `customer_loans` | Submete para aprovação; **não** desembolsa. |
| **Consulta de comissões** | (relatório de financiador) | `financing_wallets` | Resultado da carteira. |

**Segurança crítica:** a carteira do parceiro é lida **sempre da base de dados** (`users.walletId`), nunca do pedido — o parceiro não consegue apontar para a carteira de outro financiador alterando parâmetros.

---

# 3. ARQUITETURA TÉCNICA

## 3.1 Diagrama de pastas (tenant-a / tenant-b)

```
/opt/microcredito/                      ← raiz dos tenants (TENANTS_DIR)
├── tenant-a/                           ← PROD  (app: microcredito-a,  PORT 4000, BD microcredito_a)
│   ├── .env                            ← segredos e portas DESTE tenant (chmod 600)
│   ├── build/src/app.js                ← backend compilado (entrypoint PM2)
│   ├── public-v2/                      ← frontend Vue3/Quasar buildado (SPA)
│   ├── uploads/                        ← docs, recibos, concessao (nunca vem do git)
│   │   ├── concessao/ docs/ documents/ recibos/
│   ├── src/  web-app-v2/               ← cópia do repo (mesmo código)
│   └── ecosystem.config.cjs
├── tenant-b/                           ← DEMO  (app: microcredito-demo, PORT 4001, BD microcredito_b)
│   └── … (estrutura idêntica)
└── ecosystem.config.cjs                ← cópia sincronizada pelo deploy.sh

/home/mbr/MICROCREDITO/                 ← repositório git de trabalho (o "repo")
├── src/               ← backend TypeScript (app.ts, controllers, services, migrations)
├── web-app-v2/        ← frontend Vue 3 + Quasar + Vite + Pinia (fonte)
├── public-v2/         ← frontend buildado (versionado)
├── scripts/deploy.sh  ← orquestrador de deploy multi-tenant
└── docs/deploy/multi-tenant/           ← exemplos de .env e configs Nginx
```

## 3.2 Fluxo de um pedido

```
Navegador (https://a.tuaempresa.co.mz)
        │  HTTPS (Certbot/Let's Encrypt)
        ▼
┌──────────────────┐
│  NGINX (reverse  │  server_name → 127.0.0.1:4000 (tenant-a)
│  proxy)          │  client_max_body_size 25M · headers WebSocket · X-Forwarded-*
└────────┬─────────┘
         ▼
┌──────────────────┐
│  PM2 (fork, 1    │  microcredito-a → build/src/app.js · cwd = tenant-a
│  instância)      │  lê .env do próprio tenant (PORT, DATABASE_NAME)
└────────┬─────────┘
         ▼
┌──────────────────────────────────────────────────────────┐
│  EXPRESS (src/app.ts)                                    │
│   1. tenantGuard      ← força companyId (single-tenant)  │
│   2. bodyParser / static(uploads, public-v2) / cors      │
│   3. morgan (log)                                       │
│   4. routes.use("/api", auth)  ← JWT verificado         │
│   5. controllers → services → Sequelize                  │
│   6. SPA catch-all → index.html                          │
└────────┬─────────────────────────────────────────────────┘
         ▼
┌──────────────────┐
│  MySQL 8         │  microcredito_a (schema exclusivo do tenant)
│  (Sequelize)     │
└──────────────────┘
```

As migrações correm **antes** de aceitar pedidos, em todos os arranques (`bootstrap()` em `src/app.ts`).

## 3.3 Migrações — padrão e reconciliação

**Localização:** `src/migrations/index.ts` (1796 linhas), executado por `npm run migrate` **e** no arranque do servidor.

**Modelo:** não são ficheiros numerados, mas **260+ operações idempotentes** consolidadas. Cada operação verifica o estado real da BD antes de agir, através de helpers:

| Helper | Função |
|---|---|
| `hasColumn` / `hasTable` / `hasIndex` / `hasForeignKey` | Verifica existência (SHOW COLUMNS / SHOW TABLES / SHOW INDEX / INFORMATION_SCHEMA) |
| `addColumnIfMissing` | `ALTER TABLE … ADD COLUMN` só se faltar |
| `modifyColumnType` | Só altera se o tipo actual divergir (ex.: `DECIMAL(15,2)`) |
| `createTableIfMissing` | `CREATE TABLE IF NOT EXISTS` |
| `addUniqueIndexIfMissing` / `addIndexIfMissing` | Índices únicos/simples condicionais |
| `addForeignKeyIfMissing` / `dropForeignKeyIfExists` / `dropColumnIfExists` | Gestão de integridade/remoção segura |

**Propriedades:**
- **Idempotente:** correr N vezes tem o mesmo efeito que correr 1 vez.
- **Independente:** se uma operação falhar, as restantes continuam; o erro fica no resultado (`MigrationResult { applied, skipped, errors }`).
- **Auto-reconciliadora:** sincroniza contadores (ex.: contador de recibos avança para o maior sequencial já emitido) e faz *backfill* de colunas derivadas.

**Padrão de reconciliação de `customerId` (exemplo real):** as colunas `customerId` são *reconciliadas* (adicionadas e populadas) em `customer_loans`, `amortization_loans`, `tranzacoes`, `customer_documents` e `debts` — ligando prestações, pagamentos e documentos ao mutuário correcto, e `userId`/`customerId` em `notifications`. Isto permite reconstruir a relação cliente→crédito→pagamento mesmo em dados legados.

**Esquema base:** as migrações são **incrementais e não criam o esquema inicial**. Uma BD nova só funciona depois de receber o esquema — por isso o `deploy.sh` tem o subcomando `seed-demo` (copiar esquema+dados do prod via `mysqldump`).

## 3.4 Tabelas nucleares

`customers` · `customer_loans` · `amortization_loans` · `tranzacoes` · `customer_documents` · `debts` · `recibos` · `companies` · `users` · `accounts` · `bank_transactions` · `cash_registers` · `cash_movements` · `financing_wallets` · `interest_rates` · `subscription_plans` · `late_accruals` · `collection_activities` · `notifications` · `logs` · `guarantees` · `sms_queue` · `provinces` · `districts`.

## 3.5 Jobs agendados

| Job | Frequência | Ficheiro | Idempotência / notas |
|---|---|---|---|
| **Fila de SMS (BulkSMM)** | **Cada 60s** | `src/app.ts` → `processSmsQueue({limit:100})` | Sem `BULKSMS_API_KEY` a fila permanece intacta (sem efeitos). |
| **Alertas automáticos** | **30s após arranque + de 6 em 6h** | `src/app.ts` → `enqueueUpcomingInstallmentAlerts` + `enqueueOutstandingLateInterestAlerts` | Prestações a vencer (3 dias) + juros de mora em atraso. Evita duplicados (mesma prestação/dívida só entra 1×). Corre para todas as empresas. |
| **SMS de cobrança por atraso** | **Diário às 07:00** + catch-up 60s após arranque | `overdueCollectionSmsService` | Ranking de atrasos; **1 SMS por cliente/dia** (verificação na fila antes de criar). |
| **Late accrual de mora** | **Janela 00:05** (tick horário, catch-up) | `src/jobs/accrueLateJob.ts` → `lateInterestService.runLateAccrualJob` | `late_accruals` com `UNIQUE(amortization_loan_id, accrual_date)` + `INSERT IGNORE` — correr 2×/dia não duplica mora. |
| **Migração de recibos antigos** | 1× por arranque | `src/jobs/regenerateOldReceipts` | Recibos pré-backend sem `pdf_path` ganham PDF gerado (pdfkit). |
| **Backfill pacote de concessão** | 40s após arranque | `concessionPackageService.generateMissingPackages` | Créditos desembolsados sem pacote ganham o pacote imutável. |

---

# 4. CONFIGURAÇÃO DE SERVIDOR - PRODUÇÃO vs DEMO

## 4.1 Requisitos da VPS

| Recurso | Mínimo recomendado |
|---|---|
| CPU | 2 vCPU |
| RAM | 4 GB |
| Armazenamento | 50 GB SSD |
| Sistema | Ubuntu 22.04 LTS |
| Serviços | Node.js 18 · PM2 · Nginx · Certbot · MySQL 8 / MariaDB |

## 4.2 Estrutura de pastas

```
/opt/microcredito/tenant-a   → PROD   (PORT 4000, microcredito_a)
/opt/microcredito/tenant-b   → DEMO   (PORT 4001, microcredito_b)
/home/mbr/MICROCREDITO       → repositório git de trabalho (repo)
/etc/nginx/sites-available/  → microcredito-a.conf, microcredito-demo.conf
/root/.pm2/logs/             → logs dos processos PM2
```

## 4.3 PM2 — `ecosystem.config.cjs`

Configuração dinâmica que exporta **apenas os apps cujas pastas existem**:

| App | Pasta | `exec_mode` | `instances` | `autorestart` | `max_memory_restart` | Env fixo |
|---|---|---|---|---|---|---|
| `microcredito-a` | `tenant-a` | **fork** | 1 | true | **500M** | `NODE_ENV=production` |
| `microcredito-demo` | `tenant-b` | **fork** | 1 | true | **500M** | `NODE_ENV=production` |

`PORT` e `DATABASE_NAME` (e todos os restantes segredos) vêm do **`.env` de cada tenant** — a mesma fonte que o `npm run migrate` lê, para runtime e migrações nunca divergirem. Se um tenant for removido, o ficheiro passa a exportar só os apps restantes **sem editar nada**. Fallback: se não existir nenhum tenant, exporta um único app `microcredito`.

**Comandos essenciais:**
```bash
pm2 list                                        # estado
pm2 logs microcredito-a                         # logs do prod
pm2 logs microcredito-demo                      # logs do demo
pm2 startOrReload ecosystem.config.cjs --update-env       # cria/recarrega
pm2 startOrReload ecosystem.config.cjs --only microcredito-a
pm2 delete microcredito-demo                    # remover SÓ o demo
pm2 save                                        # persiste para resurrect no boot
```

## 4.4 Nginx — dois server blocks

| Ficheiro | `server_name` | `proxy_pass` | Notas |
|---|---|---|---|
| `microcredito-a.conf` | `a.tuaempresa.co.mz` | `http://127.0.0.1:4000` | Produção |
| `microcredito-demo.conf` | `demo.tuaempresa.co.mz` | `http://127.0.0.1:4001` | **`X-Robots-Tag: noindex, nofollow, nosnippet`** (bloquear indexação) |

**Definições comuns a ambos:**
- `client_max_body_size 25M;` — uploads (fotos de garantias, logotipos, recibos PDF).
- Headers WebSocket/Proxy: `proxy_http_version 1.1`, `Upgrade`, `Connection 'upgrade'`, `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `proxy_cache_bypass`, `proxy_read_timeout 120s`.

Activar: `sudo ln -s /etc/nginx/sites-available/<ficheiro> /etc/nginx/sites-enabled/`

## 4.5 SSL (Certbot)

```bash
sudo certbot --nginx -d a.tuaempresa.co.mz -d demo.tuaempresa.co.mz
```
O certbot insere automaticamente os blocos `https` e as redirecções. Renovação automática via cron do certbot.

## 4.6 Variáveis `.env` (26 reais)

Cada tenant tem o seu `.env` na raiz da sua pasta (`chmod 600`). As **26 variáveis reais**:

| # | Variável | Descrição | Prod (tenant-a) | Demo (tenant-b) |
|---|---|---|---|---|
| 1 | `PORT` | Porta de escuta | `4000` | `4001` |
| 2 | `TZ` | Fuso horário | `Africa/Maputo` | `Africa/Maputo` |
| 3 | `PUBLIC_BASE_URL` | URL pública (recibos/QR) | `https://a.tuaempresa.co.mz` | `https://demo.tuaempresa.co.mz` |
| 4 | `APP_SECRET` | **Segredo JWT — ÚNICO por tenant** | *(openssl rand -hex 32)* | *(outro openssl rand)* |
| 5 | `RECIBO_HASH_SECRET` | **Segredo de hash de recibos — ÚNICO por tenant** | *(openssl rand -hex 32)* | *(outro openssl rand)* |
| 6 | `DATABASE_HOST` | Host MySQL | `localhost` | `localhost` |
| 7 | `DATABASE_PORT` | Porta MySQL | `3306` | `3306` |
| 8 | `DATABASE_NAME` | Schema exclusivo | `microcredito_a` | `microcredito_b` |
| 9 | `DATABASE_USER` | Utilizador MySQL | `microcredito_a` | `microcredito_b` |
| 10 | `DATABASE_PASS` | Senha MySQL | *(forte, dedicada)* | *(forte, dedicada)* |
| 11 | `TENANT_MODE` | Activa o tenantGuard | `single` | `single` |
| 12 | `COMPANY_DEFAULT_ID` | Empresa por omissão | `1` | `1` |
| 13 | `SINGLE_TENANT_COMPANY_ID` | `companyId` forçado | `1` | `1` |
| 14 | `MPESA_PUBLIC_KEY` | Chave pública M-Pesa | `[PENDENTE]` | `[PENDENTE]` |
| 15 | `MPESA_API_HOST` | Host API M-Pesa | `[PENDENTE]` | `[PENDENTE]` |
| 16 | `MPESA_API_KEY` | Chave API M-Pesa | `[PENDENTE]` | `[PENDENTE]` |
| 17 | `MPESA_ORIGIN` | Origem M-Pesa | `[PENDENTE]` | `[PENDENTE]` |
| 18 | `MPESA_SERVICE_PROVIDER_CODE` | Código de prestador | `[PENDENTE]` | `[PENDENTE]` |
| 19 | `EMAIL_HOST` | Servidor SMTP | `[PENDENTE]` | `[PENDENTE]` |
| 20 | `EMAIL_PORT` | Porta SMTP | `587` | `587` |
| 21 | `EMAIL_USER` | Utilizador SMTP | `[PENDENTE]` | `[PENDENTE]` |
| 22 | `EMAIL_SECRET` | Senha SMTP | `[PENDENTE]` | `[PENDENTE]` |
| 23 | `BULKSMS_API_KEY` | Chave API SMS (BulkSMM) | `[PENDENTE]` | *(pode ficar vazio)* |
| 24 | `BULKSMS_API_URL` | Endpoint SMS | (default do provider) | (default) |
| 25 | `BULKSMS_SENDER_ID` | Sender ID SMS | `[PENDENTE]` | *(pode ficar vazio)* |
| 26 | `AT_CERTIFICADO_ENABLED` | Certificação AT | `0` | `0` |

**Segredos por tenant:** `APP_SECRET` e `RECIBO_HASH_SECRET` **devem ser únicos por tenant** e gerados com:
```bash
openssl rand -hex 32
```
Nunca partilhar entre prod e demo — a segregação de tokens e a validação de recibos dependem disso.

> **Variáveis opcionais adicionais** suportadas pelo código (não obrigatórias): `PUBLIC_VALIDATION_URL`, `CASH_LIMIT_MZN`, `PUBLIC_DIR`, `UPLOADS_DIR`, `GROQ_API_KEY`, `GROQ_MODEL`, `LEGAL_DOCS_DEBUG`, `MICROCREDIT_SEED_COMPANY_ID`.

## 4.7 Procedimento `init-tenants`

`./scripts/deploy.sh init-tenants` (idempotente — pode correr sempre):

1. **Cria a estrutura** `/opt/microcredito/{tenant-a,tenant-b}`.
2. **Clona o repo** em cada tenant (`git clone`); no demo pode fazer checkout de `TENANT_B_BRANCH`.
3. **Cria o `.env`** a partir de `docs/deploy/multi-tenant/env.<tenant>.example` (se ainda não existir) e aplica **`chmod 600`**. Imprime aviso para editar senhas (`DATABASE_PASS`, `APP_SECRET`, `RECIBO_HASH_SECRET`).
4. **Cria o esqueleto de uploads**: `uploads/{concessao,docs,documents,recibos}`.
5. **Sincroniza** o `ecosystem.config.cjs` para `$TENANTS_DIR`.
6. **Cria as bases de dados e permissões (GRANT)** — melhor esforço via `mysql` local, ou imprime o SQL para correr manualmente:
```sql
CREATE DATABASE IF NOT EXISTS microcredito_a CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS microcredito_b CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'microcredito_a'@'localhost' IDENTIFIED BY 'SENHA_Forte_A';
GRANT ALL PRIVILEGES ON microcredito_a.* TO 'microcredito_a'@'localhost';
CREATE USER IF NOT EXISTS 'microcredito_b'@'localhost' IDENTIFIED BY 'SENHA_Forte_B';
GRANT ALL PRIVILEGES ON microcredito_b.* TO 'microcredito_b'@'localhost';
FLUSH PRIVILEGES;
```
7. **Aviso:** as BDs criadas ficam **vazias** — as migrações são incrementais e não criam o esquema base. Copiar o esquema/dados: `./scripts/deploy.sh seed-demo`.

**Após `init-tenants`:** editar os `.env`, correr `seed-demo`, correr o deploy, configurar Nginx + SSL (secções 4.4/4.5).

## 4.8 Como remover o demo sem afectar o prod

Sequência segura — em **nenhum momento** o `microcredito-a` (prod) é tocado:

```bash
# 1. Parar e remover SÓ o app do demo do PM2
pm2 delete microcredito-demo
pm2 save

# 2. Remover a pasta do tenant demo
rm -rf /opt/microcredito/tenant-b

# 3. Remover a base de dados do demo (irreversível — confirmar!)
mysql -e "DROP DATABASE microcredito_b;"

# 4. Remover o bloco Nginx do demo
sudo rm /etc/nginx/sites-enabled/microcredito-demo.conf
sudo rm /etc/nginx/sites-available/microcredito-demo.conf
sudo nginx -t && sudo systemctl reload nginx

# 5. Remover o certificado SSL do domínio demo (opcional)
sudo certbot delete --cert-name demo.tuaempresa.co.mz
```

O `ecosystem.config.cjs` passa automaticamente a exportar só o `microcredito-a` (detecta que `tenant-b` já não existe). O prod continua online durante todo o processo.

---

# 5. DEPLOY E CI/CD

## 5.1 Fluxo Git

```
feature/xyz  →  main  →  deploy (scripts/deploy.sh)
```

1. Trabalho numa **feature branch**.
2. **PR para `main`** (após revisão).
3. No servidor: `./scripts/deploy.sh` (usa `main` por omissão; aceita branch como 1.º argumento).

**Boas práticas obrigatórias:**
- **Não commitar `public-v2/` ou `assets` gerados desnecessariamente.** O `git pull` falharia com *"Your local changes to the following files would be overwritten by merge"* se houver ficheiros *untracked* conflituosos. Antes de um pull no servidor, usar **`git clean -fd`** para limpar ficheiros não rastreados do build.
- O `uploads/` **nunca vem do git** (o `deploy.sh` garante que fica no `.gitignore` para o pull jamais tocar nos documentos: recibos, fotos, logotipos).

## 5.2 `deploy.sh` — orquestrador multi-tenant

**Subcomandos e comportamento:**

| Comando | Efeito |
|---|---|
| `./scripts/deploy.sh` | Deploy (main) — detecta layout single vs multi |
| `./scripts/deploy.sh feature/xyz` | Deploy da branch específica (nos 2 tenants) |
| `./scripts/deploy.sh init-tenants` | Cria estrutura multi-tenant (1.ª vez) — idempotente |
| `./scripts/deploy.sh seed-demo` | Copia esquema+dados do PROD → DEMO (`--force` para substituir) |

**Modo multi-tenant — loop prod→demo, atómico:**

1. Sincroniza o `ecosystem.config.cjs` para `$TENANTS_DIR`.
2. **PROD primeiro** (`tenant-a` / `microcredito-a`): cada tenant é **atómico e isolado** — `git pull` + deps (`npm ci`) + `tsc` + `vite build` + `migrate`, e **só depois** `pm2 startOrReload … --only <app>`.
3. **DEMO a seguir** (`tenant-b` / `microcredito-demo`).

**Garantias de resiliência:**
- Se o **demo falhar** em qualquer passo, o **prod já foi recarregado e continua online**.
- Se o **prod falhar**, o **demo nem é tentado** a ser recarregado.
- **NÃO** usa `pm2 delete all` nem `fuser -k` (mataria outros projectos da VPS e punha o serviço em baixo durante o build).
- Variáveis: `STRICT_DEPLOY=1` faz `exit 1` se **qualquer** tenant falhar (omissão: só prod).

**Health-check (`single_deploy`):** após `pm2 save`, verifica `"status": "online"` via `pm2 jlist` e faz `curl -sf http://localhost:${PORT}/` para confirmar que a API responde.

---

# 6. INTEGRAÇÕES PENDENTES

## 6.1 SMS (BulkSMSM)

**Estado: `PENDENTE` — Aguardando credenciais da operadora.**

O módulo está **completo e funcional**; só faltam as credenciais no `.env`. Enquanto `BULKSMS_API_KEY` estiver vazia, a fila permanece intacta e **nada é enviado** (sem efeitos secundários).

**Placeholders a preencher no `.env` de cada tenant:**

| Variável | Valor |
|---|---|
| `BULKSMS_API_KEY` | `[PENDENTE]` |
| `BULKSMS_API_URL` | `[PENDENTE]` (default do provider) |
| `BULKSMS_SENDER_ID` | `[PENDENTE]` |

**Ficheiro:** `src/services/BulkSmsProvider.ts`. Endpoints do provider: `POST /sms/send` (envio), `GET /wallet` (saldo), `GET /messages` (histórico). Envio com header `X-API-Key`. Números normalizados para `+258XXXXXXXXX`.

**Jobs de fila e alertas associados:**
- **Fila de SMS:** processada **a cada 60s** (`processSmsQueue({limit:100})`).
- **Alertas automáticos:** enfileirados **30s após arranque e de 6 em 6h** — prestações a vencer (3 dias) + juros de mora em atraso, para todas as empresas.
- **SMS de cobrança:** job **diário às 07:00** (ranking de atrasos), 1 SMS por cliente/dia.

**Gestão via API:** `/api/sms-gateway/{pending,enqueue,process,announcements,alerts/*,history,summary,pending-credentials,inbox/sync}`.

## 6.2 M-Pesa / e-Mola

**Estado: `PENDENTE` — Aguardando credenciais da Vodacom.**

Integração via biblioteca `mpesa-node-api`. Dois fluxos activos nas rotas `PUT /api/mpesa/receive` (C2B — cliente→empresa) e `POST /api/mpesa/send` (B2C—empresa→cliente).

**Placeholders a preencher no `.env` de cada tenant:**

| Variável | Valor |
|---|---|
| `MPESA_API_KEY` | `[PENDENTE]` |
| `MPESA_PUBLIC_KEY` | `[PENDENTE]` |
| `MPESA_SERVICE_PROVIDER_CODE` | `[PENDENTE]` |
| `MPESA_API_HOST` | `[PENDENTE]` (endpoint Moçambique) |
| `MPESA_ORIGIN` | `[PENDENTE]` |

**Callback URL (para configurar junto da Vodacom):**
```
https://a.tuaempresa.co.mz/api/payments/mpesa/callback
```

**Fluxo de pagamento de parcelas (objectivo):**
1. Mutuário inicia pagamento de uma prestação via M-Pesa.
2. A Vodacom chama o **callback** com o resultado da transacção.
3. O backend valida e regista o pagamento em `tranzacoes`, actualiza `amortization_loans`, movimenta o caixa (`cash_movements`) e gera o **recibo legal** (numeração AT + QR).
4. Envia comprovativo (SMS/e-mail) ao mutuário.

> **Nota:** o módulo de pagamentos V2 (mora, estorno, quote server-side) já suporta pagamentos registados manualmente; a integração M-Pesa automática fica activa assim que as credenciais forem fornecidas.

---

# 7. SEGURANÇA E BOAS PRÁTICAS

| Área | Prática implementada |
|---|---|
| **Isolamento de tenants por BD** | Cada tenant num `DATABASE_NAME` exclusivo + `tenantGuard` que força o `companyId` (TENANT_MODE=single). Tentativas de forja cross-tenant geram WARNING. |
| **Segredos diferentes por tenant** | `APP_SECRET` e `RECIBO_HASH_SECRET` únicos por tenant (`openssl rand -hex 32`). Um token de um ambiente é inútil no outro. |
| **`.env` protegidos** | `chmod 600` aplicado pelo `init-tenants`. Nunca versionados. |
| **PM2 sem `delete all`** | Deploy usa `pm2 startOrReload --only <app>` — nunca `pm2 delete all` nem `fuser -k`. Só o app alvo é recarregado; o outro ambiente não é afectado. |
| **Backup `mysqldump` diário por tenant** | Um dump por schema (`microcredito_a`, `microcredito_b`), cron diário. Restore pontual por tenant. |
| **Logs em `/root/.pm2/logs/`** | Saída dos processos PM2 isolada por app. |
| **Autenticação JWT** | `APP_SECRET` para assinar/verificar tokens; refresh token (`/api/auth/refresh`). |
| **Senhas com bcrypt** | `src/utils/password.ts` — hash robusto, nunca texto plano. |
| **Auditoria completa** | Tabela `logs`: quem, quê, quando, IP, módulo. Endpoints críticos registam accões. |
| **Autorização por alçada** | Middlewares `isAdmin`/`isStaff`/`isLoanAdmin`/`isCompanyAdmin`/`isPartner`. Desembolso e finanças restritos a roles 0/1. |
| **Portal de parceiros read-only** | Carteira lida da BD (`users.walletId`), nunca do pedido — impossível espiar outra carteira. |
| **Validação pública de recibos** | Endpoint sem sessão (destino do QR), mas limitado a leitura de validação. |
| **Expressoes de erro contidas** | Handlers `unhandledRejection`/`uncaughtException` em `src/app.ts` — um erro numa rota **não derruba** o processo; fica registado e o servidor mantém-se vivo. |
| **Protecção de dados no seed** | `seed-demo` aborta se a BD do demo já tiver tabelas (evita destruir dados com o `DROP TABLE` do dump), a não ser `--force`. |
| **Demo não indexável** | `X-Robots-Tag: noindex, nofollow, nosnippet` no bloco Nginx do demo. |
| **Uploads segregados** | `uploads/` fora do git; `multer` com limites; `path.basename` para prevenir *path traversal*. |
| **Rate/limite de body** | `bodyParser` com `limit: 10mb` + `client_max_body_size 25M` no Nginx. |

---

# 8. ANEXOS

## Anexo A — `ecosystem.config.cjs` (exemplo final)

```javascript
/** Config PM2 — MBR Microcrédito (single vs multi-tenant dinâmico). */
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

// TENANT A — PROD
if (hasTenant("tenant-a")) {
  apps.push({
    ...base,
    name: "microcredito-a",
    script: path.join(tenantDir("tenant-a"), "build", "src", "app.js"),
    cwd: tenantDir("tenant-a"),
    // PORT=4000 e DATABASE_NAME vêm do .env do tenant
  });
}

// TENANT B — DEMO
if (hasTenant("tenant-b")) {
  apps.push({
    ...base,
    name: "microcredito-demo",
    script: path.join(tenantDir("tenant-b"), "build", "src", "app.js"),
    cwd: tenantDir("tenant-b"),
    // PORT=4001 e DATABASE_NAME=microcredito_b vêm do .env do tenant
  });
}

// MODO SINGLE (fallback: nenhum tenant encontrado)
if (apps.length === 0) {
  apps.push({
    ...base,
    name: "microcredito",
    script: path.join(__dirname, "build", "src", "app.js"),
    cwd: __dirname,
  });
}

module.exports = { apps };
```

## Anexo B — `deploy.sh` (estrutura final)

O ficheiro completo está em `scripts/deploy.sh`. Estrutura resumida:

```bash
#!/usr/bin/env bash
# deploy.sh — MBR Microcrédito (Ubuntu / PM2 / Nginx)
#   deploy [branch]   → layout single ou multi (loop prod→demo atómico)
#   init-tenants      → cria /opt/microcredito/{tenant-a,tenant-b} (idempotente)
#   seed-demo         → copia esquema+dados PROD → DEMO (--force p/ substituir)
set -euo pipefail

TENANTS_DIR="${MICROCREDITO_TENANTS_DIR:-/opt/microcredito}"
REPO_URL="${REPO_URL:-git@github.com:leonelmatsinhe/MICROCREDITO.git}"
BRANCH="${BRANCH:-main}"

install_deps()      { npm ci --include=dev; (cd web-app-v2 && npm ci --include=dev); }
build_and_migrate() { npx tsc; (cd web-app-v2 && npx vite build); npm run migrate; }
ensure_uploads()    { mkdir -p uploads/{concessao,docs,documents,recibos}; /* garante .gitignore */ }

init_tenants()  { /* clone, .env (chmod 600), uploads, ecosystem, GRANTs das BDs */ }
deploy_tenant() { /* git pull + deps + build + migrate + pm2 startOrReload --only <app> */ }
multi_deploy()  { /* PROD primeiro, DEMO a seguir; falha no demo não derruba prod */ }
single_deploy() { /* pm2 startOrReload + save + health-check curl */ }
seed_demo()     { /* mysqldump prod | mysql demo, com protecção anti-destruição */ }

main "$@"
```

## Anexo C — `.env` exemplos

Os ficheiros completos estão em:
- `docs/deploy/multi-tenant/env.tenant-a.example` (PROD)
- `docs/deploy/multi-tenant/env.tenant-b.example` (DEMO)

**`env.tenant-a.example` (PROD):**
```ini
# ── Servidor ──
PORT=4000
TZ=Africa/Maputo
PUBLIC_BASE_URL=https://a.tuaempresa.co.mz

# ── Segredos (100% únicos por tenant — gere com openssl rand -hex 32) ──
APP_SECRET=
RECIBO_HASH_SECRET=

# ── Base de dados (UMA POR TENANT) ──
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=microcredito_a
DATABASE_USER=microcredito_a
DATABASE_PASS=

# ── Single-tenant ──
TENANT_MODE=single
COMPANY_DEFAULT_ID=1
SINGLE_TENANT_COMPANY_ID=1

# ── M-Pesa ──
MPESA_PUBLIC_KEY=
MPESA_API_HOST=
MPESA_API_KEY=
MPESA_ORIGIN=
MPESA_SERVICE_PROVIDER_CODE=

# ── E-mail (opcional) ──
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_SECRET=

# ── SMS (BulkSMS) ──
BULKSMS_API_KEY=
BULKSMS_API_URL=
BULKSMS_SENDER_ID=

# ── Documentos legais / AT ──
AT_CERTIFICADO_ENABLED=0
```

**`env.tenant-b.example` (DEMO):** idêntico, excepto:
```ini
PORT=4001
PUBLIC_BASE_URL=https://demo.tuaempresa.co.mz
DATABASE_NAME=microcredito_b
DATABASE_USER=microcredito_b
# APP_SECRET e RECIBO_HASH_SECRET diferentes do prod
# M-Pesa/SMS podem ficar vazios (nada é enfileirado)
```

## Anexo D — Configurações Nginx

Os ficheiros completos estão em `docs/deploy/multi-tenant/nginx-a.conf` e `nginx-demo.conf`.

**`nginx-a.conf` (PROD):**
```nginx
# /etc/nginx/sites-available/microcredito-a.conf
# PROD — a.tuaempresa.co.mz → app microcredito-a (localhost:4000)
server {
    listen 80;
    listen [::]:80;
    server_name a.tuaempresa.co.mz;

    client_max_body_size 25M;   # Uploads (garantias, logotipos, recibos PDF)

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

**`nginx-demo.conf` (DEMO):**
```nginx
# /etc/nginx/sites-available/microcredito-demo.conf
# DEMO — demo.tuaempresa.co.mz → app microcredito-demo (localhost:4001)
server {
    listen 80;
    listen [::]:80;
    server_name demo.tuaempresa.co.mz;

    add_header X-Robots-Tag "noindex, nofollow, nosnippet" always;  # bloquear indexação

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

> **SSL:** activar com `sudo certbot --nginx -d a.tuaempresa.co.mz -d demo.tuaempresa.co.mz` — o certbot insere os blocos `https` e as redirecções automaticamente.

---

*Fim do documento técnico. Para onboarding de um novo desenvolvedor, recomenda-se começar pela leitura de `src/app.ts` (arranque + jobs), `src/middlewares/tenantGuard.ts` (isolamento) e `scripts/deploy.sh` (operacional).*
