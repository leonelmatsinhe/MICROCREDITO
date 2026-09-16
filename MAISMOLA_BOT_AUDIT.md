# MAISMOLA MICROCRÉDITO — AUDITORIA FASE 1 (Preparação do Bot de IA)

Data: 16/09/2026 · Stack: Node.js + Express + Sequelize + MySQL + Vue.js/Quasar
Âmbito: varredura de schema, rotas, autenticação e fechamento de caixa. **Nenhum código do bot foi criado.**

---

## 1. VARREDURA TOTAL

### 1.1 Tabelas MySQL (fontes: `database/microcredito.sql` + `src/migrations/index.ts` + modelos Sequelize)

**Núcleo de microcrédito**

| Tabela | Papel | Colunas-chave |
|---|---|---|
| `companies` | Empresa/filial (isolamento multitenant) | id, companyName, districtId, provinceId, approval_status, plan |
| `users` | Staff interno | id, companyId, name, email, phone, userRole, is_active |
| `customers` | Mutuários | id, companyId, accountNumber, customerName, customerPhone, customerNuit, customerStatus, interestRateId, customerType (PF/PJ) |
| `accounts` | Conta do contrato **E** carteira real (bancos, caixa físico, M-Pesa) | id, companyId, accountNumber, bank_name, type (BANCO/CAIXA_FISICO/MOBILE_MONEY/EWALLET), purpose, balance, is_default_reembolso/desembolso |
| `customer_loans` | Créditos | id, companyId, customerId, accountNumber, amount, numberOfInstallments, interestRate, administrativeFee, disbursementDate, status |
| `amortization_loans` | Prestações (parcelas) | id, companyId, loanId, customerId, installmentOrder, amortization, rateAmount, installment, remainingBalance, paidAmount, dueDate, status |
| `tranzactions` | Pagamentos | id, companyId, loanId, amortizationLoanId, customerId, amount, totalAmount, latePaymentInterest, paymentDate, paymentMethod, discountAmount, staffName |
| `debts` | Dívidas/moras pendentes | id, companyId, customerId, loanId, amortisationId, debtAmount |
| `interest_rates` | Tabela de juros por empresa | companyId, tax, administrativeFee |
| `loan_guarantees` | Garantias | loanId, purchaseAmount, ... |

**Caixa e tesouraria**

| Tabela | Papel | Colunas-chave |
|---|---|---|
| `cash_registers` | Caixa do dia por utilizador | companyId, userId, opening_date, opening_balance, total_in, total_out, total_cash_in/out, total_bank_in/out, status (ABERTO/FECHADO), closing_balance_informed, closing_balance_calculated, difference, notes, closedBy |
| `cash_movements` | Movimentos do caixa | companyId, cashRegisterId, type (ENTRADA/SAIDA), paymentMethod (CASH/BANK/MPESA/EMOLA), category (DESEMBOLSO, REEMBOLSO, JUROS_MORA, TAXA_ADMIN, DESPESAS...), amount, description, loanId, tranzactionId, isAutomatic, createdBy |
| `bank_transactions` | Extrato de contas bancárias | accountId, cashRegisterId, type, category, amount, balanceAfter |

**Apoio:** `customer_documents`, `notifications`, `sms`, `sms_queue`, `sms_gateway_inbox`, `whatsapp_messages`, `user_logs`, `provinces`, `districts`, `subscription_plans`.

### 1.2 Rotas / controllers — o que o sistema já faz

28 controllers. Principais capacidades já existentes:

- **Clientes:** CRUD, busca, stats, bulk, portal do cliente (login, dashboard, pedido de crédito, pagamento via portal).
- **Créditos:** criar (com plano de amortização em `createAmortizationLoan` — desembolso), invalidar desembolso, atualizar datas, controle consolidado de prestações (`/api/installments/control/:companyId`).
- **Pagamentos:** `POST /api/tranzaction` (pagamento de prestação), overview paginado, juros de mora por crédito, M-Pesa C2B/B2C.
- **Caixa diário:** abrir/fechar caixa, movimentos manuais, histórico, resumo diário, "caixa do sistema" e alerta de pagamentos do portal fora de expediente.
- **Carteira real:** contas bancárias com saldo, depósitos, levantamentos, transferências.
- **Dashboards/relatórios:** `/api/dashboard/:companyId` (KPIs, PAR, risco), relatório Banco de Moçambique + Excel, exportações de clientes/créditos/pagamentos/prestações.
- **SMS/WhatsApp:** fila de SMS (gateway), alertas de mora e vencimentos.
- **Subscrição SaaS:** registo público, aprovação pelo Super Admin, planos.

### 1.3 Auth middleware — estado real (⚠ achados)

- `src/middlewares/auth.ts`: **só valida JWT** (`jwt.verify`). **NÃO popula `req.user`**. Cada controller refaz `jwt.verify` no header ou consulta a tabela `users` (função `resolveIdentity` duplicada em `CashRegisterController`, `BankAccountController`, `checkCashRegisterOpen`).
- Payload do JWT: **apenas `{ id }`** (`UserController.loginUser`). Sem companyId, sem role no token.
- **Não existe `req.user.id / filial / caixa_id / role`** como pedido. Realidade:
  - `id` → do JWT; `companyId` → busca em DB por controller; `role` → `users.userRole` (0 = Super Admin, 1 = Admin/gerente, 2/3 = operações — convenção inconsistente entre controllers; só `isSuperAdmin` e `checkCashRegisterOpen` enforcement real).
  - **`filial_id` não existe** — o isolamento multitenant é por `companyId` (cada empresa = "filial").
  - **`caixa_id` não vem do token** — obtido em runtime via `getOpenRegister(userId, companyId)` (tabela `cash_registers`, índice único `userId + opening_date + companyId + status`).
- Middleware `checkCashRegisterOpen` existe e é aplicado apenas em: `POST /api/tranzaction` e `POST /api/createInstallmentsLoan/`.

**Implicação para o bot:** o bot deve fazer o mesmo `resolveIdentity` (JWT → userId → companyId) e **nunca aceitar companyId do prompt do utilizador**.

### 1.4 Fechamento de caixa (`cash_registers`) — como funciona

- Abertura: `POST /api/cash-registers/open` com `opening_balance` (fundo de troco físico). Regra: **1 caixa ABERTO por utilizador/dia/empresa**.
- Movimentos (automáticos do desembolso/pagamento + manuais) atualizam totais via `cash_movements` (fonte de verdade; havia bug de persistência camelCase já reparado por migration idempotente).
- Fecho: `closing_balance_informed` = valor **contado** fisicamente;
  - `closing_balance_calculated = opening_balance + total_cash_in − total_cash_out` (só CASH);
  - `difference = closing_balance_informed − closing_balance_calculated` — calculado **no backend**, caixa FECHADO é imutável.
- Totais separados CASH vs BANK/MPESA/EMOLA (`total_cash_in/out`, `total_bank_in/out`).

---

## 2. MAPA DE CAPACIDADES PARA O BOT

**Princípio geral de segurança:** toda query do bot recebe `companyId` resolvido do JWT no servidor (nunca do texto do utilizador). Bot = **modo READ-ONLY estruturado** (perguntas pré-mapeadas → queries parametrizadas), não SQL livre.

### LISTA A — VERDE (100% seguro, só leitura, 1-2 tabelas, filtro obrigatório companyId)

1. Saldo devedor do cliente (prestação + mora)
2. Próxima prestação do cliente (valor + data)
3. Parcelas em atraso do cliente
4. Estado do caixa de hoje do utilizador (aberto/fechado, saldo calculado)
5. Total de entradas/saídas do caixa de hoje
6. Créditos ativos do cliente
7. Histórico de pagamentos do cliente
8. Dados de contacto do cliente (para cobrança)
9. Quantos clientes ativos na empresa
10. Se o caixa de hoje tem divergência registrada
11. Lista de créditos vencendo hoje
12. Dívidas (moras) pendentes de um cliente
13. Saldo de uma conta bancária/carteira (accounts.balance)
14. Detalhe de um caixa fechado (opening/informed/calculated/difference)
15. Taxa de juro aplicada a um cliente

### LISTA B — AMARELO (precisa JOIN/agregação/view ou interpretar status numérico)

16. Clientes com maior atraso (ranking) — JOIN amortization_loans + customers + cálculo de dias
17. Total desembolsado hoje — JOIN cash_movements × cash_registers por data
18. Total recebido hoje (por método: cash/MPesa/banco) — agregação em tranzactions
19. PAR (carteira em risco) — como `/api/dashboard`, mas em linguagem natural
20. Clientes sem pagamento há X dias — JOIN tranzactions/amortization + interpretação de status INTEGER (0/1/2 sem documentação central)
21. Projeção de recebimentos da semana (prestações a vencer)
22. Comissões/movimentos por cobrador — JOIN por userId/staffName
23. Comparativo mês atual vs anterior — agregações com datas STRING (⚠ datas estão em `VARCHAR`, ex. `dueDate`, `paymentDate` — comparação por CAST)

### LISTA C — VERMELHO (🚫 BLOQUEADO por compliance — o bot NUNCA executa)

| Ação | Rota envolvida | Motivo do bloqueio |
|---|---|---|
| Desembolsar crédito | POST /api/createInstallmentsLoan | Move dinheiro físico (SAIDA/DESEMBOLSO) |
| Lançar pagamento | POST /api/tranzaction | Entrada de caixa, afeta saldo do cliente |
| Estornar pagamento / invalidar desembolso | PUT /api/tranzaction/:id, PUT /api/loan/:id/invalidate-disbursement | Altera histórico financeiro |
| Apagar/editar movimento de caixa | (movimentos manuais) | Quebra trilha de auditoria |
| Fechar caixa | POST /api/cash-registers/:id/close | Diferença de caixa é responsabilidade humana |
| Abrir caixa | POST /api/cash-registers/open | Fundo de troco real |
| Alterar taxa de juro / taxa admin | POST/PUT /api/rate | Decisão de precificação |
| Editar/apagar crédito ou cliente | PUT/DELETE loan, customer | Integridade cadastral |
| Transferências/depósitos bancários | bankAccountRoutes | Movimenta carteira real |
| Perdão de dívida / desconto | discountAmount | Decisão de gestor, precisa alçada |
| Alterar utilizadores/roles | PUT /api/users/:id | Escalação de privilégio |
| Aprovar empresas (Super Admin) | /api/super-admin/* | Governança da plataforma |

---

## 3. PERGUNTAS VERDE — ESPECIFICAÇÃO

> Padrão: `companyId` SEMPRE do JWT no backend; identificadores do cliente via `accountNumber` ou telefone, parametrizados. Nenhuma query abaixo faz UPDATE/INSERT/DELETE.

### V1. "Quanto o cliente 108 deve?"
- Tabelas: `amortization_loans` (installment, remainingBalance, paidAmount, status) + `debts` (debtAmount)
```sql
SELECT SUM(al.installment - IFNULL(al.paidAmount,0)) AS saldo_prestacoes,
       (SELECT IFNULL(SUM(d.debtAmount),0) FROM debts d
         WHERE d.companyId = ? AND d.customerId = c.id) AS mora
FROM customers c
JOIN amortization_loans al ON al.customerId = c.id AND al.status IN (?)  -- status de pendente
WHERE c.companyId = ? AND c.accountNumber = ?;
-- params: [companyId, statusPendentes, companyId, accountNumber]
```
- **Saldo calculado** (derivado de prestação − pago + dívidas), não informado.

### V2. "Quando é a próxima prestação do cliente 108?"
- Tabela: `amortization_loans`
```sql
SELECT al.installmentOrder, al.installment, al.dueDate
FROM amortization_loans al
JOIN customers c ON c.id = al.customerId
WHERE c.companyId = ? AND c.accountNumber = ? AND al.status IN (?)
ORDER BY al.dueDate ASC LIMIT 1;
```
- Calculado (próxima pendente por data).

### V3. "Quais parcelas estão em atraso do cliente 108?"
- Tabela: `amortization_loans` (comparação `dueDate < hoje AND status pendente`)
```sql
SELECT al.installmentOrder, al.installment, al.dueDate, al.remainingBalance
FROM amortization_loans al
JOIN customers c ON c.id = al.customerId
WHERE c.companyId = ? AND c.accountNumber = ?
  AND al.status IN (?) AND CAST(al.dueDate AS DATE) < CURDATE();
```
- ⚠ `dueDate` é VARCHAR — usar CAST e criar índice funcional ou migrar para DATE.

### V4. "Caixa de hoje abriu com quanto?" / "Caixa fechou com quanto?"
- Tabela: `cash_registers` (userId do JWT)
```sql
SELECT opening_balance, status, closing_balance_informed,
       closing_balance_calculated, difference
FROM cash_registers
WHERE companyId = ? AND userId = ? AND opening_date = ?;
-- params: [companyId, userId, todayKey()]  (opening_date = 'YYYY-MM-DD')
```
- **Informe o que existe:** `closing_balance_calculated` é calculado no fecho; `opening_balance` é informado. Reportar `difference` quando FECHADO.

### V5. "Quanto entrou e saiu hoje no meu caixa?"
- Tabelas: `cash_registers` (totais) ou agregado de `cash_movements`
```sql
SELECT total_cash_in, total_cash_out, total_bank_in, total_bank_out, total_in, total_out
FROM cash_registers
WHERE companyId = ? AND userId = ? AND opening_date = ? AND status = 'ABERTO';
```
- Informado (mantido pelo sistema a partir de cash_movements — fonte de verdade).

### V6. "O caixa de hoje tem diferença?" / "Fechou com quanto de diferença?"
- Tabela: `cash_registers`
```sql
SELECT difference, closing_balance_informed, closing_balance_calculated, notes
FROM cash_registers
WHERE companyId = ? AND userId = ? AND status = 'FECHADO'
ORDER BY closed_at DESC LIMIT 1;
```

### V7. "Que créditos o cliente 108 tem?"
- Tabela: `customer_loans`
```sql
SELECT id, amount, numberOfInstallments, interestRate, disbursementDate, status
FROM customer_loans
WHERE companyId = ? AND accountNumber = ?;
```

### V8. "O cliente 108 pagou o quê e quando?"
- Tabela: `tranzactions`
```sql
SELECT paymentDate, amount, totalAmount, latePaymentInterest, paymentMethod, tranzactionReference
FROM tranzactions
WHERE companyId = ? AND customerId = ?
ORDER BY paymentDate DESC LIMIT 10;
```
- `customerId` resolvido via JOIN a `customers.accountNumber` (subquery parametrizada).

### V9. "Qual o telefone/Nuit do cliente 108?"
- Tabela: `customers`
```sql
SELECT customerName, customerPhone, customerNuit, customerAddress
FROM customers WHERE companyId = ? AND accountNumber = ? LIMIT 1;
```

### V10. "Quanto tem na conta do BIM/M-Pesa?"
- Tabela: `accounts` (carteira real)
```sql
SELECT accountDescription, bank_name, type, balance, currency
FROM accounts
WHERE companyId = ? AND is_active = 1 AND bank_name LIKE ?;
```
- **Informado** (`balance` gerido exclusivamente pelo treasuryService — só leitura no bot).

### V11. "Quantos clientes temos?"
- Tabela: `customers` — `SELECT COUNT(*) FROM customers WHERE companyId = ? AND customerStatus = ?`

### V12. "Que créditos vencem hoje?"
- Tabela: `amortization_loans` JOIN `customers`
```sql
SELECT c.accountNumber, c.customerName, al.installment, al.dueDate
FROM amortization_loans al
JOIN customers c ON c.id = al.customerId
WHERE al.companyId = ? AND al.status IN (?) AND CAST(al.dueDate AS DATE) = CURDATE();
```

### V13. "Quais os créditos activos do cliente X e o saldo de cada?"
- Combinação V7 + SUM de amortization por loanId (ainda Verde: 2 tabelas, filtro companyId).

### V14. "Que taxas de juro usamos?"
- Tabela: `interest_rates` — `SELECT * FROM interest_rates WHERE companyId = ?` (leitura; alteração é VERMELHA).

### V15. "Movimentos do caixa de hoje?"
- Tabela: `cash_movements`
```sql
SELECT type, paymentMethod, category, amount, description, createdAt
FROM cash_movements
WHERE companyId = ? AND cashRegisterId = ?
ORDER BY createdAt ASC;
```
- `cashRegisterId` obtido do caixa ABERTO do userId (JWT) — nunca aceito do prompt.

---

## 4. TABELA DE 25 PERGUNTAS (VERDE / AMARELO / VERMELHO)

| # | Pergunta (pt-MZ) | Tabelas | Status |
|---|---|---|---|
| 1 | Quanto o cliente 108 deve? | amortization_loans, debts, customers | 🟢 Verde |
| 2 | Quando é a próxima prestação do 108? | amortization_loans | 🟢 Verde |
| 3 | Parcelas em atraso do 108? | amortization_loans | 🟢 Verde |
| 4 | Caixa de hoje abriu com quanto? | cash_registers | 🟢 Verde |
| 5 | Caixa fechou com quanto / diferença? | cash_registers | 🟢 Verde |
| 6 | Quanto entrou/saiu hoje no caixa? | cash_registers / cash_movements | 🟢 Verde |
| 7 | Créditos do cliente 108? | customer_loans | 🟢 Verde |
| 8 | Pagamentos do cliente 108? | tranzactions | 🟢 Verde |
| 9 | Telefone/NUIT do cliente 108? | customers | 🟢 Verde |
| 10 | Saldo da conta do BIM/M-Pesa? | accounts | 🟢 Verde |
| 11 | Quantos clientes activos? | customers | 🟢 Verde |
| 12 | Créditos que vencem hoje? | amortization_loans, customers | 🟢 Verde |
| 13 | Saldo por crédito do cliente? | customer_loans, amortization_loans | 🟢 Verde |
| 14 | Taxa de juro em vigor? | interest_rates | 🟢 Verde |
| 15 | Movimentos do caixa de hoje? | cash_movements | 🟢 Verde |
| 16 | Clientes com maior atraso (ranking)? | amortization_loans, customers (JOIN + dias) | 🟡 Amarelo |
| 17 | Total desembolsado hoje? | cash_movements, cash_registers (agregação/data) | 🟡 Amarelo |
| 18 | Total recebido hoje por método? | tranzactions (agregação) | 🟡 Amarelo |
| 19 | PAR / carteira em risco? | 4+ tabelas (mesma lógica do Dashboard) | 🟡 Amarelo |
| 20 | Clientes sem pagar há X dias? | tranzactions, amortization_loans (JOIN) | 🟡 Amarelo |
| 21 | Recebimentos previstos da semana? | amortization_loans (agregação) | 🟡 Amarelo |
| 22 | Movimentos por cobrador? | cash_movements, users (JOIN) | 🟡 Amarelo |
| 23 | Desembolsar crédito | createInstallmentsLoan | 🔴 Vermelho |
| 24 | Lançar / estornar pagamento; alterar taxa; apagar movimento | tranzaction, rate, cash_movements | 🔴 Vermelho |
| 25 | Fechar/abrir caixa; perdão de dívida; alterar utilizadores | cash_registers, debts, users | 🔴 Vermelho |

---

## 5. TOP 5 PARA O MVP DO BOT NO PAINEL DO CAIXA

1. **Estado do caixa de hoje** (V4+V5+V6): aberto/fechado, entradas/saídas cash vs electrónico, diferença no fecho. — 1 query, máxima utilidade diária.
2. **Consulta de cliente por conta/telefone** (V1+V2+V3): "quanto deve, quando vence, o que está atrasado". — resolve 80% das perguntas no balcão.
3. **Vencimentos de hoje** (V12): lista para cobrança do dia.
4. **Saldo das carteiras** (V10): bancos + M-Pesa.
5. **Movimentos do caixa de hoje** (V15): conferência rápida sem abrir ecrãs.

Racional: todas são Verde, usam 1-2 tabelas, `companyId` do JWT e responderam ao dia-a-dia do caixa/cobrador sem expor cálculos de risco.

---

## 6. ÍNDICES RECOMENDADOS (MySQL)

Já existentes (via migrations): `idx_cash_registers_company_status`, `uq_cash_registers_user_day_company`, `idx_cash_movements_register`, `idx_bank_transactions_account`, `idx_company_purpose_active`, FKs nas tabelas núcleo.

**A criar:**

```sql
-- Consulta de cliente por conta/telefone (V1, V2, V3, V7, V9)
ALTER TABLE customers ADD INDEX idx_customers_company_account (companyId, accountNumber);
ALTER TABLE customers ADD INDEX idx_customers_company_phone   (companyId, customerPhone);
ALTER TABLE customers ADD INDEX idx_customers_company_status  (companyId, customerStatus);

-- Prestações: atrasos e vencimentos (V3, V12, V16, V21)
ALTER TABLE amortization_loans ADD INDEX idx_amort_company_status_due (companyId, status, dueDate(10));
ALTER TABLE amortization_loans ADD INDEX idx_amort_customer_status    (customerId, status);
-- (dueDate é VARCHAR; prefixo(10) cobre 'YYYY-MM-DD'. Ideal: migrar coluna para DATE.)

-- Pagamentos (V8, V18, V20)
ALTER TABLE tranzactions ADD INDEX idx_tranz_company_customer_date (companyId, customerId, paymentDate);
ALTER TABLE tranzactions ADD INDEX idx_tranz_company_date          (companyId, paymentDate);
ALTER TABLE tranzactions ADD INDEX idx_tranz_loan                  (loanId);

-- Créditos (V7, V13)
ALTER TABLE customer_loans ADD INDEX idx_loans_company_account  (companyId, accountNumber);
ALTER TABLE customer_loans ADD INDEX idx_loans_company_customer (companyId, customerId);

-- Dívidas / moras (V1, V16)
ALTER TABLE debts ADD INDEX idx_debts_company_customer (companyId, customerId);

-- Caixa: resumo por data da empresa (V17) e por categoria
ALTER TABLE cash_movements ADD INDEX idx_cashmov_company_created (companyId, createdAt);
ALTER TABLE cash_movements ADD INDEX idx_cashmov_customer        (customerId);

-- Otimismo: movimentos automáticos ligados a transações
ALTER TABLE cash_movements ADD INDEX idx_cashmov_tranzaction (tranzactionId); -- já existe; confirmar
```

Recomendação estrutural (não bloqueia MVP): migrar `dueDate`, `paymentDate` e `disbursementDate` de VARCHAR para DATE e criar a view `vw_bot_overdue` (cliente × prestação × dias de atraso) para as perguntas Amarelas 16/20.

---

## 7. REGRAS DE COMPLIANCE (o bot NUNCA...)

1. **NUNCA executa UPDATE, INSERT ou DELETE** em qualquer tabela financeira (`cash_movements`, `cash_registers`, `tranzactions`, `customer_loans`, `amortization_loans`, `debts`, `accounts`, `bank_transactions`, `interest_rates`).
2. **Só SELECT pré-aprovados**: o bot não recebe SQL livre nem gera SQL a partir do texto do utilizador; cada intenção mapeia a uma query auditável.
3. **companyId e userId vêm SEMPRE do JWT** resolvido no servidor — nunca do prompt. Pergunta sobre outra empresa/filial = recusa.
4. **Sem dados sensíveis agregados fora do escopo**: respostas limitadas ao cliente/caixa perguntado; nada de dumps de listas completas sem limite (LIMIT obrigatório).
5. **Ações de dinheiro são humanas**: desembolso, pagamento, estorno, fecho/abertura de caixa, taxa de juro, perdão de dívida e transferências passam SEMPRE pelas rotas existentes com `checkCashRegisterOpen` — o bot apenas informa "não posso fazer isso; use o ecrã X" e pode navegar o utilizador.
6. **Log de auditoria**: cada pergunta do bot grava em `user_logs` (userId, companyId, pergunta, intenção, tables acedidas) — reutilizar o módulo de logs existente.
7. **Sem dados de terceiros**: o bot não responde sobre clientes de outra empresa nem expõe documentos (BI, garantias) — só campos operacionais (nome, telefone, saldo, datas).
8. **Rate limiting e timeout** nas queries do bot para evitar varredura de dados via perguntas em série.
9. **Discrepâncias de caixa nunca são "corrigidas" pelo bot**: se `difference ≠ 0`, o bot apenas reporta e aponta para o responsável humano.

---

## 8. ACHADOS TÉCNICOS QUE O BOT PRECISA CONHECER (resumo)

- `req.user` não existe; duplicar o padrão `resolveIdentity` (JWT → id → companyId) ou criar um middleware único para o bot.
- Não há conceito de `filial_id` nem `caixa_id` no token — a unidade de isolamento é `companyId`; o caixa do utilizador resolve-se pela tabela `cash_registers` do dia.
- `userRole` é INTEGER com convenção inconsistente entre controllers (0 = Super Admin, 1 = Admin; papéis de caixa/cobrador não formalizados no backend) — para o bot MVP, bastam `companyId` + posse do caixa; papéis finos podem ficar para Fase 2.
- Datas financeiras em VARCHAR (dueDate, paymentDate, disbursementDate) — comparar com CAST ou migrar.
- `status` de prestações/créditos é INTEGER sem enum documentado centralmente — o bot precisa de um dicionário de status validado antes das perguntas Amarelas.
