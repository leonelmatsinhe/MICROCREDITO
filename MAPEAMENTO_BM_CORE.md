# Mapeamento BM ↔ core Clack

## Âmbito e segurança da auditoria

Foi feita auditoria **read-only** à base de dados configurada neste checkout: `SHOW TABLES`, `SHOW COLUMNS` em cada tabela e contagens agregadas por empresa/estado. Não foram executados `INSERT`, `UPDATE`, migrations, seeds ou alterações de dados. A empresa usada em qualquer relatório vem exclusivamente de `req.currentUser.companyId`; parâmetros do cliente nunca escolhem o tenant.

A base auditada não é necessariamente a base do endereço que aparece na captura de ecrã. Nela constam as empresas `MBR Microcrédito`, `MicroMz` e `+Mola, Lda`; atividade core observada apenas na primeira (14 clientes, 14 créditos, 4 pagamentos confirmados, 99 prestações). “Clack Microcrédito, EI”/“Cantinho dos Petiscos” não constam nessa listagem local. Portanto, os totais auditados não validam os dados do deployment da captura.

## Tabelas observadas por `SHOW TABLES`

`accounts`, `amortization_loans`, `audit_log`, `bank_transactions`, `cash_movements`, `cash_registers`, `companies`, `company_penalty_rules`, `concession_packages`, `contract_templates`, `customer_credits`, `customer_documents`, `customer_loans`, `customers`, `debts`, `districts`, `financing_wallets`, `idempotency_keys`, `interest_rates`, `late_accruals`, `loan_guarantees`, `login_attempts`, `notifications`, `payment_allocations`, `provinces`, `recibos`, `recibos_sequencia`, `sms`, `sms_gateway_inbox`, `sms_queue`, `subscription_plans`, `tranzactions`, `user_logs`, `users`, `whatsapp_messages`.

Não existem `clients`, `loans`, `repayments`, `ledger`, `contas_recebimento` nem tabelas BM na base auditada. Os equivalentes core são `customers`, `customer_loans`, `tranzactions`, `payment_allocations`, `accounts` e `bank_transactions`. As tabelas customizadas do módulo (`clientes_microcredito`, `creditos`, `pagamentos_credito`, `microcredit_payment_events`, `fontes_financiamento`, `movimentos_financeiros_operador`, `config_microcredito`) não apareceram no `SHOW TABLES` executado; são uma fonte paralela definida pelo código e não devem alimentar o reporte core.

## Sidebar observado

- **Geral (1):** Painel.
- **Microcrédito (1):** Painel Microcrédito BM. Dentro da página: Painel, Clientes, Créditos, Pagamentos, Financiamentos, Reportes BM.
- **Gestão de Crédito (3):** Mutuários, Créditos, Controle Prestações.
- **Financeiro (5):** Pagamentos, Caixa Central, Contas Bancárias, Caixa, Histórico Caixa.
- **Financiamento (3):** Carteiras e Taxas, Parceiros Financiadores, Relatório Financiadores.
- **Relatórios (1):** Relatório BM.
- **Sistema (até 4, dependente do perfil):** Equipa e Parceiros, Configurações, Mensagens (SMS, perfis elegíveis), Histórico (perfis elegíveis).

Fonte do menu: `web-app-v2/src/components/layout/AppSidebar.vue`.

## APIs core encontradas

- Crédito: `POST /api/loan`, `GET /api/loans/overview/:companyId`, `POST /api/createInstallmentsLoan/`, `GET /api/loan/amortization/:id`, `GET /api/installments/control/:companyId`.
- Mutuários: `GET/POST /api/customers/:id`, `POST /api/customer`, `PUT/DELETE /api/customer/:id`.
- Pagamentos: `POST /api/tranzaction`, `/api/tranzaction/bulk`, `GET /api/payments/:companyId/all`, `/api/installments/:id/quote`, `POST /api/tranzaction/:id/reverse`.
- Tesouraria: sub-rotas `cashRoutes` e `bankAccountRoutes`; contas `/api/accounts/:id`, `/api/account/:id`; Caixa Central escreve `cash_movements`, `cash_registers`, `bank_transactions` e atualiza `accounts.balance` através de `treasuryService`.
- Carteiras de financiamento analíticas: `/api/wallets/:companyId`, dashboard e operações CRUD de `financing_wallets`; relatórios de parceiros `/api/reports/financiadores/...`.
- BM existente (relatório mensal distinto, não alterado): `/api/reports/banco-mocambique/:companyId[ /excel]`.
- Painel BM trimestral: `/api/microcredito/dashboard`, `/api/microcredito/reportes/preview`, `/api/microcredito/reportes/gerar`.

## Mapeamento campo a campo

| Campo BM | Origem no core (tabela.campo/método) | Transformação | Estado |
|---|---|---|---|
| Empresa, B12 | `companies.companyName` | Consulta da empresa pelo `companyId` autenticado | Mapeado |
| Endereço, província, telefone, email, NUIT, início | `companies.companyAddress`, `provinces.name`, `companyPhone`, `companyEmail`, `companyNuit`, `createdAt` | Join da província e fallback para campos antigos quando existentes | Mapeado |
| Nº trabalhadores, B17 | `users.companyId`, `userRole`, `status`, `is_active` | COUNT de membros internos ativos (`userRole IN (1,2,3)`); exclui parceiros (role 4) | Mapeado |
| 2.1.1 (1) concedidos no período | `customer_loans.amount`, `disbursementDate`, `status`; `amortization_loans.dueDate` | Créditos desembolsados (`status 1/3`), pela data real de desembolso; para histórico sem data, 1 mês antes da primeira prestação. Juros do contrato vêm de `amortization_loans.rateAmount` | Mapeado com fallback histórico |
| 2.1.1 (2) reembolsados no período | `tranzactions.paymentDate`, `status`, `amount`, `interestRateAmount`; `payment_allocations.component/amount` | Apenas `CONFIRMED`, nunca `REVERSED`; período pela data do pagamento. Alocação `CAPITAL` e `INTEREST` preferida; fallback para valores legados da transação | Mapeado |
| 2.1.1 (4) abatidos | Sem campo/tabela de abate no core auditado | Não confundir com créditos liquidados (`status=3`) ou dívida vencida. Reporta zero e emite aviso de dado não suportado | Não mapeado (limitação explícita) |
| 2.1.1 (5) carteira vigente | `customer_loans.status`, `amortization_loans.amortization/rateAmount/paidAmount`, pagamentos confirmados | Capital e juros do plano menos alocações pagas até ao fecho do trimestre; pedido pendente não é crédito concedido | Mapeado |
| 2.1.1 (6) carteira em risco | `amortization_loans.dueDate/status`, `payment_allocations`, `tranzactions.paymentDate` | Prestações com saldo por pagar e vencimento anterior à data de referência; capital e juros em aberto agregados por classe de atraso | Mapeado |
| 2.1.2 créditos concedidos/reembolsados | `customer_loans.id`; `tranzactions` confirmadas | COUNT de créditos desembolsados no trimestre; reembolsados = créditos que passaram de saldo >0 no início a saldo zero no fim e tiveram pagamento confirmado no período | Mapeado |
| 2.1.3 sectores BM | `customers.customerProfession`, `customers.companyMainActivity`; `customer_loans.loanDescription` | Conversão determinística de actividade/finalidade: comércio, agricultura, pecuária, indústria, serviços, consumo; desconhecido/ausente vai para Outros e fica avisado. Sector soma capital em carteira ao fecho | Derivado; exige revisão quando cai em Outros |
| 2.1.4 homens/mulheres/outros | `customers.sex`, `customer_loans.customerId` | COUNT DISTINCT de clientes com saldo vigente no fecho; normalização de valores conhecidos, desconhecido em Outros | Mapeado, sem migration (campo já existe) |
| 2.1.5 risco Classes I–IV | `amortization_loans.dueDate/status`, `paidAmount`, `payment_allocations`; `installmentPanification` em `src/utils/calculateLateAmount.ts` para dias de atraso | Dias entre vencimento e data de referência, respeitando saldo remanescente; I 1–30, II 31–90, III 91–365, IV >365. Exposição desagregada em capital e juros | Mapeado/calculado; não precisa coluna persistida |
| 2.2 taxa mensal min/max | `customer_loans.interestRate` | Armazenada como fracção (p.ex. 0,05); converter a percentagem multiplicando por 100. Considera créditos com saldo no fecho | Mapeado |
| 2.2 prazo mínimo/máximo | `customer_loans.numberOfInstallments` | Min/max em créditos com saldo no fecho | Mapeado |
| 2.3 capitais próprios/nacionais/estrangeiros | `financing_wallets.is_parceiro_externo`, `parceiro_nome`, `parceiro_nuit`, `initial_disbursed_amount` | Carteira é explicitamente **analítica**, não movimento de dinheiro; não contém classificação nacional/estrangeiro nem entrada efetiva de capital. Não inferir origem por NUIT/nome | Não mapeado (não somar como contribuição) |
| 2.4 empréstimo/donativo/aumento capital | Não existe evento core de captação/contribuição identificado | Movimentos de conta não provam natureza da captação; não classificar depósitos/transferências automaticamente como financiamento | Não mapeado |
| 2.5 capital inicial/actual | Não existe capital social/inicial da entidade em `companies` ou ledger contabilístico identificado | `accounts.balance` representa caixa/banco, não capital próprio; não reutilizar como capital social | Não mapeado |
| 3 Caixa / bancos / outros activos por mês | `cash_registers`, `cash_movements`, `accounts.initial_balance`, `bank_transactions.balanceAfter` | Caixa e banco: saldos reconstruídos no último dia de cada mês a partir do último fecho/movimento rastreado. Contas físicas para Caixa, tipo BANCO para Bancos. Outros activos não têm ledger classificável | Caixa/banco mapeados com ressalva de histórico-base; outros não mapeados |
| Auditoria de exportação | `audit_log` | Regista user, empresa, IP, período e ficheiro/ação antes de responder com Excel | Mapeado |

## Fonte da verdade, cálculo de atraso e isolamento

O core guarda empréstimos em `customer_loans`, plano/saldos por prestação em `amortization_loans`, pagamentos em `tranzactions` e alocações precisas em `payment_allocations`. O estado de transação é `CONFIRMED` ou `REVERSED`. A função `installmentPanification` já calcula dias de atraso; o mapper usa a mesma convenção (data de referência explícita) ao calcular o reporte histórico. Não há `classe_risco` persistida no core; calcular dinamicamente evita estado duplicado e permite reproduzir o trimestre.

Todas as queries do mapper filtram pelo `companyId` fornecido pelo controller autenticado, proveniente de `req.currentUser.companyId`. Não aceitam `tenant_id` ou `companyId` de query/body. Não são necessárias migrations para sexo, sector, classe de risco ou dados de relatório: sexo existe, sector é conversível a partir dos campos de actividade/finalidade já existentes, e risco é calculado.

## Limitações que não devem ser ocultadas

1. Abates contabilísticos, eventos de captação (empréstimos/donativos/aumento de capital) e capital próprio não estão representados em tabelas core observadas. O Excel exibe zero nessas linhas acompanhado de aviso no preview; zero significa **sem registo suportado**, não confirmação de inexistência financeira.
2. `financing_wallets` não é ledger: a própria documentação do modelo define-o como alocação analítica. O seu valor não pode substituir fonte de financiamento ou caixa recebido.
3. Saldo histórico bancário só é reconstruível quando há `bank_transactions.balanceAfter` ou saldo inicial registado. Saldos de caixa dependem dos registos/fechos existentes. O preview assinala estas ressalvas; “Outros Activos” fica sem fonte core.
4. `customerProfession`/`companyMainActivity` descrevem actividade, mas não são enum BM. A conversão conservadora e os valores remetidos a Outros devem ser revistos por quem valida o reporte.
5. Nenhuma migration/seed foi aplicada durante a integração. Os dados da empresa mostrada no screenshot precisam ser validados no deployment conectado à respetiva base.

## Resultado esperado após integração

O painel, preview e Excel trimestral lêem os mesmos créditos, prestações, pagamentos, clientes, empresa e ledger core em tempo real. A geração do Excel continua a preencher o modelo `templates/MODELO_DE_REPORTE_TRIMESTRAL_2025_III.xlsx`; o PDF existente é produzido no browser a partir do preview. Registos antigos do módulo paralelo não são apagados nem copiados para o core.
