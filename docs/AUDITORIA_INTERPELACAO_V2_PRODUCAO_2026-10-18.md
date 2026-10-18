# Auditoria funcional v2 — Interpelação OutBox / MBR (base de produção importada)

**Data:** 18/10/2026 · **Âmbito:** 4 campos de desembolso, relatórios regulatórios, recibos, autonomia/acessos, SMS e M-Pesa
**Método:** leitura do código em `src/`, consultas **só de leitura** à base `mbr_microcredito` (dados de produção importados em 18/10), prova isolada do middleware de tenant. **Não foi criado, alterado ou apagado nenhum registo.**

> **Nota metodológica.** A auditoria v1 (manhã) correu sobre a base local de desenvolvimento, que continha dados de teste (230 recibos e 5 pagamentos fictícios). Este relatório substitui os números da v1 pelos da **base de produção importada**. As diferenças estão assinaladas na §9.

---

## 1. Veredicto curto

| Alegação da interpelação | Veredicto (base de produção) |
|---|---|
| 4 campos criados mas com erros graves de cálculo, alinhamento e parametrização | **Parcialmente procedente.** As 6 carteiras existem e o Price está correcto, **mas** 3 dos 9 planos desembolsados não fecham ao cêntimo (16 de 94 linhas erradas), só 2 das 8 taxas estão ligadas a carteira, e o KMAD está **comprometido acima do capital alocado** (2.210.000 vs 2.195.000). |
| Relatório consolidado do BM com os 4 campos | **Procedente — não existe.** 13 colunas fixas, nenhuma de carteira, nenhum total por campo. |
| Relatório isolado do parceiro KMAD | **Improcedente — existe** (portal + Excel + e-mail, filtrado por `walletId`). Ressalva: o bug de tenant (abaixo) impede o seu funcionamento até corrigir o `.env`. |
| Recibos não são automáticos | **Não avaliável em produção: nunca houve um único pagamento registado na produção** (`tranzactions` = 0, `recibos` = 0). O código de emissão automática existe e está correcto; o envio é manual e o SMTP não está configurado (`EMAIL_USER`/`EMAIL_SECRET` vazios). |
| Dependência total da OutBox / falta de autonomia | **Parcialmente procedente.** O Admin opera tudo sem a OutBox, mas o e-mail de credenciais tem SMTP e link da OutBox fixos no código, e **falta `SINGLE_TENANT_COMPANY_ID` no `.env`**, o que força `companyId=1` (empresa inexistente) em todas as rotas com `:companyId`. |
| SMS e M-Pesa implementados, à espera de credenciais | **SMS: confirmado** — código completo, `BULKSMS_API_KEY` vazia. **M-Pesa: código implementado** (iniciação B2C/C2B + rotas), mas as chaves no `.env` apontam ao **sandbox** da Vodacom e **não existe webhook/conciliação** — ver §7. |

---

## 2. Tabela mestra

| # | Módulo | O que foi contratado (interpelação) | O que o sistema faz hoje (produção) | Status | Prova |
|---|---|---|---|---|---|
| 1 | 4 campos — carteiras | KMAD 2.195.000 MT; PME's 12%; Comunidades 9%; Interno 8% e 10% | 6 carteiras activas na empresa 36: `KMAD` (2.195.000 alocados ✓), `MAP_PMES_12` (30M, 12%), `MOA_COM_9` (26,34M, 9%), `TRA_INT_8` (15M, 8%), `FORN_SER_10` (10M, 10%) e uma **extra não contratada**: `PRT_CAX` «Proteção do Caixa» (18,66M, 0%). | **OK** (com 1 carteira extra) | consulta `financing_wallets` (16 linhas, 6 da empresa 36) |
| 2 | 4 campos — juros parametrizados | 12/9/8/10% por campo | Taxa na BD, não hardcoded. **Mas só 2 das 8 taxas têm `walletId`:** «Larde e Moma - Comunidades» (2%) e «Larde e Moma - PMEs» (9%), **ambas apontando ao KMAD (wallet 11)**. As taxas de 8% («Trabalhador»), 9% («Moamba - Comunidades»), 10% («Fornecedores») e 12% («Maputo PMEs 2») estão **sem carteira**. | **Falha** | `interest_rates` (empresa 36); `financingWalletService.ts:628` |
| 3 | 4 campos — trava taxa↔carteira | Campo com a sua taxa | Não existe validação de compatibilidade. Os créditos 61/63/66/67 foram desembolsados a 2% pela taxa «Comunidades» que aponta ao KMAD; os créditos 75-78 (8%) foram para `TRA_INT_8` mesmo sem taxa ligada — a carteira veio do pedido, não da taxa. | **Falha** | `LoanController.ts:340-348`; `AmortizationController.ts:231-262` |
| 4 | 4 campos — cálculo Price | Plano correcto | Fórmula PMT correcta, validada nas 5 taxas (100.000/12x fecha ao cêntimo). | **OK** | `loanAmortization.ts:58` |
| 5 | 4 campos — alinhamento de datas | Prestações mensais certas | **Bug latente:** `setMonth(+n)` sobre a data-base. Desembolso a 31/01 produz duas prestações em Março e salta meses. **Nenhum crédito de produção é afectado** (desembolsos a dia 3/11/14 — ex.: crédito 61, prestações sempre ao dia 3). | **Parcial** | `loanAmortization.ts:108`; plano do crédito 61 |
| 6 | 4 campos — planos gravados | Sem erros | **3 dos 9 planos desembolsados não fecham:** crédito 62 (9%, dif 0,03 MT, 5 linhas erradas), 63 (2%, 0,01 MT, 1 linha), 67 (2%, 0,01 MT, **9 linhas erradas**). Total: **16 de 94 linhas** com amortização+juro ≠ prestação. Os 4 créditos internos (75-78) têm planos de **1 única prestação**. Não há rotina de regeneração. | **Falha** | `tools-tmp/audit_prod.ts` |
| 7 | 4 campos — saldo KMAD | Capital controlado | **Estouro projectado:** alocado 2.195.000 · desembolsado 660.000 · **pendente de aprovação 1.550.000** (créditos 68, 69, 74 a 2% e 79 a 9%). Se todos forem aprovados, o KMAD fica **15.000 MT acima do capital alocado**. O sistema valida saldo analítico no desembolso, mas os pedidos pendentes não consomem reserva. | **Parcial** | consulta `customer_loans` por `walletId=11` |
| 8 | 4 campos — selecção da carteira | Escolha no desembolso | Obrigatória: vem do corpo, é derivada da taxa, ou o Admin escolhe. UI + backend validam saldos. | **OK** | `AmortizationController.ts:231-262` |
| 9 | Relatório BM consolidado | Excel com os 4 campos | **Não existe.** `GET /api/reports/banco-mocambique/:companyId/excel` gera 13 colunas fixas (`BMReportController.ts:466`) sem qualquer coluna de carteira; o trimestral segue o modelo oficial e também não segrega. Desagregação interna existe só em JSON, sem Excel e sem UI. | **Falha** | `BMReportController.ts:466`; `FinancierReportController.ts:352` |
| 10 | Relatório KMAD isolado | Relatório só KMAD | Existe: portal do parceiro (role 4 preso ao `walletId` da carteira), `GET /api/reports/financiadores/:companyId/:walletId` (+ `/excel` com 2 abas, + `/email`). Utilizador de parceiro `parceiro@kmad.co.mz` criado. | **OK** | `PartnerPortalController.ts:26`; `partnerPortalService.ts:66,179` |
| 11 | Recibo — emissão | Recibo automático no pagamento | O código emite o recibo **dentro da transacção do pagamento**: numeração `FOR UPDATE`, SHA-256, código de validação, QR, PDF (falha ⇒ rollback) e auditoria. **Em produção nunca correu: 0 pagamentos, 0 recibos.** | **OK (código) / nunca executado** | `TranzactionController.ts:1079`; `reciboService.ts:572`; contagens da §5 |
| 12 | Recibo — envio | Automático ao cliente | **Não.** Envio por e-mail é endpoint manual com botão; o SMS pós-pagamento não leva número nem link do recibo. Além disso **`EMAIL_USER` e `EMAIL_SECRET` estão vazios** — nem o envio manual funciona hoje. | **Falha** | `ReciboController.ts:275`; `.env` |
| 13 | Recibo — selo AT | SHA-256 + QR visíveis | `AT_CERTIFICADO_ENABLED=false` → o PDF não imprime selo (a lógica e a validação pública estão activas). | **Parcial** | `.env`; `config/certificacao.ts` |
| 14 | Acessos — utilizadores | MBR cria equipa sozinha | 4 utilizadores na produção: 1 super-admin (empresa 2), **Eliana Munguambe (admin, empresa 36)**, Iracema (role 3) e o parceiro KMAD (role 4). Criação/edição/repasse de senha (`123456`) pela UI, sem depender de ninguém. | **OK** | `users` (produção); `UserController.ts` |
| 15 | Autorização dos acessos | Só o Admin administra | `POST/PUT/DELETE /api/users` está atrás de `auth` mas **sem `isAdmin`** — qualquer utilizador autenticado gere utilizadores. `POST /api/userCredentials` está **antes do auth** (público) e envia a senha do corpo para qualquer e-mail. | **Falha** | `routes.ts:331,446,477-482` |
| 16 | Configuração single-tenant | Instalação dedicada à MBR | `TENANT_MODE=single` + `COMPANY_DEFAULT_ID=36` definidos, **mas o guard lê `SINGLE_TENANT_COMPANY_ID`, que está VAZIA** → força `companyId=1` em query/body/params; a empresa 1 não existe (empresas: 2, 36, 37). Prova isolada reproduzida hoje. **Todas as rotas com `:companyId` devolvem vazio/404 até corrigir.** | **Falha (P0)** | `tenantGuard.ts:31,35`; `tools-tmp/tenant_guard_check.ts` |
| 17 | Autonomia — hardcodes OutBox | Sem dependência | E-mail de credenciais com `mail.outboxsolutions.co.mz` e link `maismola.outboxsolutions.co.mz` fixos no código, ignorando `EMAIL_HOST`. Os restantes fallbacks (recibo, relatório, QR) estão inertes porque `EMAIL_HOST`/`PUBLIC_BASE_URL` estão definidos. | **Parcial** | `UserCredentials.ts:7,23` |
| 18 | SMS | Bulk SMS | **Código completo:** provider, fila processada de 60 em 60 s, alertas automáticos (vencimento, mora, atraso), SMS de desembolso e pagamento, histórico e painel de reenvio. **`BULKSMS_API_KEY`, `BULKSMS_API_URL` e `BULKSMS_SENDER_ID` vazias** → a fila acumula mas nada sai. | **Pendente credenciais** | `BulkSmsProvider.ts`; `app.ts:120,150` |
| 19 | M-Pesa | Pagamentos por M-Pesa | **Código implementado:** iniciação B2C (envio) e C2B (recebimento) com rotas `POST /api/mpesa/send` e `PUT /api/mpesa/receive`. **Pendências:** (a) as chaves no `.env` apontam ao sandbox (`api.sandbox.vm.co.mz`) — falta a credencial de produção; (b) **não existe callback/webhook nem conciliação**, pelo que o pagamento recebido não baixa a prestação nem gera recibo automaticamente. | **Pendente credenciais + webhook** | `MpesaPaymentController.ts:5,20`; `routes.ts:369-370`; `.env` |
| 20 | Integridade operacional | — | **4 caixas simultaneamente `ABERTO`** (ids 3, 4, 6, 8) — viola o invariante de caixa único. Tabela `bank_accounts` **inexistente** na base importada (as migrações criam-na no arranque). `loan_approvals` vazia apesar de 4 créditos pendentes. | **Falha (dados)** | `cash_registers`; `information_schema` |

---

## 3. Detalhe — 4 campos de desembolso

### 3.1 Carteiras reais (empresa 36, base de produção)

| Código | Nome | Capital alocado | Desembolsado | Pendente | Taxa da carteira |
|---|---|---:|---:|---:|---|
| `KMAD` | Parceria KMAD | 2.195.000,00 | 660.000,00 | **1.550.000,00** | NULL (2% e 9% vêm de `interest_rates`) |
| `MAP_PMES_12` | Maputo PMEs / 12% | 30.000.000,00 | 0,00 | 0,00 | 12% |
| `MOA_COM_9` | Moamba Comunidades — 9% | 26.340.000,00 | 0,00 | 0,00 | 9% |
| `TRA_INT_8` | Trabalhador Interno — 8% | 15.000.000,00 | 104.150,00 | 0,00 | 8% |
| `FORN_SER_10` | Fornecedores de serviços — 10% | 10.000.000,00 | 0,00 | 0,00 | 10% |
| `PRT_CAX` | Proteção do Caixa (**não contratada**) | 18.660.000,00 | 0,00 | 0,00 | 0% |

**Compromisso total do KMAD: 660.000 + 1.550.000 = 2.210.000 MT > 2.195.000 alocados.** Os créditos 68 (350.000), 69 (350.000), 74 (650.000) e 79 (200.000) estão pendentes; se todos forem desembolsados, o saldo analítico fica negativo em 15.000 MT. O sistema valida saldo no momento do desembolso, mas **não reserva capital na aprovação** — é uma falha de controlo, não de cálculo.

### 3.2 Créditos por carteira (13 no total, 9 desembolsados)

| Carteira | Créditos | Desembolsados | Taxas usadas |
|---|---|---|---|
| KMAD (11) | 9 | 5 (61, 62, 63, 66, 67) | 2% ×4, 9% ×1 |
| TRA_INT_8 (14) | 4 | 4 (75, 76, 77, 78) | 8% ×4 |
| PME / Comunidades / 10% | **0** | 0 | — |

### 3.3 Planos gravados — drift medido na produção

| Crédito | Carteira | Taxa | n | Diferença de capital | Linhas erradas |
|---|---|---:|---:|---:|---:|
| 61 | KMAD | 2% | 18 | 0,00 | 0 |
| 62 | KMAD | 9% | 18 | **0,03 MT** | **5** |
| 63 | KMAD | 2% | 18 | **0,01 MT** | **1** |
| 66 | KMAD | 2% | 18 | 0,00 | **1** |
| 67 | KMAD | 2% | 18 | **0,01 MT** | **9** |
| 75–78 | TRA_INT_8 | 8% | **1 cada** | 0,00 | 0 |

**3 dos 9 planos não fecham ao cêntimo; 16 das 94 linhas têm amortização + juro ≠ prestação.** O gerador actual (reexecutado com os mesmos parâmetros) fecha correctamente — o defeito é dos planos gravados, gerados por uma versão anterior. Não existe rotina de regeneração.

Datas: o crédito 61 (desembolso 2026-09-03) tem as 18 prestações sempre no dia 3 — **o bug de fim-de-mês (§2 linha 5) não afecta nenhum crédito actual**, mas activa no primeiro desembolso a 29/30/31.

---

## 4. Detalhe — relatórios regulatórios

**BM mensal** (`/api/reports/banco-mocambique/:companyId/excel`): 13 colunas fixas — `Nº da Operação · Nome do Cliente · Data de Desembolso · Montante · Finalidade · Valor da Prestação · Periodicidade · Prazo · Taxa de Juro · Crédito em Dívida · Crédito em Em Atraso · Dias em Atraso · PPEs`. **Sem coluna de carteira, sem totais por campo, sem aba por campo.** O relatório consolidado com os 4 campos exigido pelo BM **não existe em nenhum formato**.

**BM trimestral** (`POST /api/microcredito/reportes/gerar`): preenche o template oficial do BM. Também não segrega.

**KMAD isolado**: existe e está completo — portal do parceiro com empréstimos/prestações/movimentos/mora sempre filtrados por `walletId` (`partnerPortalService.ts:66,120,145,179`), Excel de 2 abas com cabeçalho da carteira e saldo analítico (`FinancierReportController.ts:43`), envio por e-mail com anexo. **Ressalva crítica:** todas as rotas `/api/reports/.../:companyId` estão inoperantes até repor `SINGLE_TENANT_COMPANY_ID=36` (§6), incluindo a do parceiro.

---

## 5. Detalhe — recibos (a correcção importante da v1)

Contagens na **base de produção importada**:

| Tabela | Registos |
|---|---:|
| `tranzactions` (pagamentos) | **0** |
| `recibos` | **0** |
| `customer_loans` | 13 (9 desembolsados) |
| `amortization_loans` | 94 (nenhuma com `paidAmount > 0`) |
| `audit_log` | 13 |

**A MBR nunca registou um pagamento no sistema em produção.** Consequências:

1. A alegação «o sistema falha na geração automática de recibos» **não pode ser confirmada nem refutada com dados de produção** — o módulo nunca correu. O código de emissão (§2 linha 11) está correcto e testado localmente.
2. Os problemas de integridade da v1 (225 recibos órfãos, número `REC-2026-00099` em falta) **eram da base local de desenvolvimento e não se aplicam à produção**. A produção pode começar a numeração AT limpa.
3. O envio automático continua em falta (falha contratual mantida): sem job/trigger/fila de envio, SMS sem número/link, e **SMTP não configurado** (`EMAIL_USER`/`EMAIL_SECRET` vazios) — hoje nem o envio manual por e-mail funciona.

---

## 6. Autonomia e acessos

**O que a MBR faz sozinha (sem a OutBox):** criar/editar/eliminar utilizadores, repor senhas, abrir/fechar caixa (4 caixas abertas — ver §2 linha 20), movimentos de tesouraria, taxas, carteiras, dados da empresa, logs, Reset Geral.

**O que ainda prende à OutBox:** o e-mail de credenciais usa `mail.outboxsolutions.co.mz` e o link `maismola.outboxsolutions.co.mz` fixos no código (`UserCredentials.ts:7,23`), ignorando `EMAIL_HOST`. O utilizador é criado na mesma; só o e-mail depende do servidor da OutBox.

**Falha de configuração que quebra a operação (P0):** `.env` com `TENANT_MODE=single` e `COMPANY_DEFAULT_ID=36`, mas **`SINGLE_TENANT_COMPANY_ID` vazia** — o guard lê esta última e força `companyId=1`. Empresa 1 não existe. Prova isolada reproduzida hoje:

```
SEM SINGLE_TENANT_COMPANY_ID  => /api/reports/banco-mocambique/36 → companyId "1"
COM SINGLE_TENANT_COMPANY_ID=36 → companyId "36"
```

**Correcção:** `SINGLE_TENANT_COMPANY_ID=36` no `.env` do servidor + reinício. Rotas afectadas: todos os `/api/reports/...`, `/api/wallets/:companyId`, `/api/dashboard/:companyId`, `/api/installments/control/:companyId`, `/api/payments/:companyId/all`, `/api/loan/findAllLoans/:id/:companyId`.

**Segurança dos acessos:** `POST/PUT/DELETE /api/users` sem `isAdmin` (escalada entre utilizadores); `POST /api/userCredentials` público e envia a senha do corpo para qualquer e-mail; senha padrão `123456`.

---

## 7. SMS e M-Pesa — estado fiel do código

| Componente | Estado verificado |
|---|---|
| BulkSMS — provider, fila (60 s), alertas automáticos (6 h), histórico, painel | **Implementado** |
| `BULKSMS_API_KEY` / `BULKSMS_API_URL` / `BULKSMS_SENDER_ID` | **Vazias no `.env`** → nada sai; a fila fica intacta e retoma quando a chave entrar |
| M-Pesa — iniciação B2C (envio) e C2B (recebimento) | **Implementado** — `MpesaPaymentController.ts`, rotas `/api/mpesa/send` e `/api/mpesa/receive` |
| M-Pesa — credenciais no `.env` | **Presentes**, mas `MPESA_API_HOST=api.sandbox.vm.co.mz` → **sandbox da Vodacom, não produção** |
| M-Pesa — callback/webhook de confirmação | **Não existe** |
| M-Pesa — conciliação automática (baixa da prestação + recibo) | **Não existe** |

**Conclusão para a interpelação:** a premissa «SMS e M-Pesa implementados, só falta credencial» é **correcta para o SMS**. Para o M-Pesa, além da credencial de produção, é preciso desenvolver o webhook de confirmação e a conciliação — sem isso, o pagamento pedido não baixa a prestação nem emite recibo. Recomendo declarar à MBR prazos distintos: credencial SMS (dias) vs. webhook M-Pesa (desenvolvimento).

---

## 8. Prioridades

**P0 — desbloqueia a operação hoje**
1. `SINGLE_TENANT_COMPANY_ID=36` no `.env` do servidor + reiniciar (sem isto, relatórios, carteiras, dashboard e controladores devolvem vazio).
2. Configurar `EMAIL_USER`/`EMAIL_SECRET` (ou remover a dependência do SMTP da OutBox em `UserCredentials.ts`).
3. Rever os 4 créditos KMAD pendentes (1.550.000) face ao capital alocado — são 15.000 MT acima.
4. Fechar 3 das 4 caixas abertas (invariante de caixa único).

**P1 — fecha alegações técnicas da interpelação**
5. Corrigir planos com drift (62, 63, 67) e planos de 1 prestação (75-78), com rotina de regeneração.
6. Ligar as taxas 8/9/10/12% às respectivas carteiras e travar desembolso com taxa incompatível.
7. Excel consolidado do BM com coluna/aba por campo (KMAD, PME, Comunidades, Interno 8%, Interno 10%) e totais.
8. Envio automático do recibo (e-mail/SMS) pós-pagamento, com número e link de validação; desbloquear `AT_CERTIFICADO_ENABLED` quando existir certificado.
9. Proteger `/api/users` com `isAdmin` e `/api/userCredentials` com sessão.

**P2 — credenciais e integrações**
10. `BULKSMS_API_KEY` (+ URL e Sender ID) para activar a fila.
11. Credenciais M-Pesa de produção (hoje: sandbox) e desenvolvimento do webhook + conciliação.

---

## 9. O que mudou face à auditoria v1

| Tema | v1 (base local de dev) | v2 (base de produção importada) |
|---|---|---|
| Pagamentos / recibos | 5 pagamentos, 230 recibos, 225 órfãos, nº 99 em falta | **0 pagamentos, 0 recibos** — módulo nunca executado em produção; problemas de órfãos não se aplicam |
| Planos com drift | 2 de 11, 7 linhas de 99 | **3 de 9, 16 linhas de 94** (62, 63, 67) |
| Carteiras empresa 36 | 5 (KMAD, PME_12, COM_9, INT_8, INT_10) | **6** (KMAD, MAP_PMES_12, MOA_COM_9, TRA_INT_8, FORN_SER_10, PRT_CAX) |
| KMAD | 8 créditos, sem compromisso excedido | 9 créditos, **compromisso 15.000 MT acima do alocado** |
| Taxas ligadas | 2 de 8 (ambas ao KMAD) | **Confirmado: 2 de 8, ambas ao KMAD** |
| Tenant | Falha confirmada | **Falha mantida** (o `.env` tem `COMPANY_DEFAULT_ID`, mas o guard lê `SINGLE_TENANT_COMPANY_ID`) |
| Caixas | — | **4 abertas em simultâneo** |
| `bank_accounts` | — | Tabela inexistente na base importada |

---

### Anexo — scripts desta passagem (só leitura, em `tools-tmp/`)

| Script | O que prova |
|---|---|
| `audit_counts.ts` / `audit_counts2.ts` | Contagens da base importada; empresas; carteiras; taxas |
| `audit_prod.ts` | Drift dos 9 planos; datas do crédito 61; caixas; recibos=0 |
| `audit_prod3.ts` | Pagamentos=0; compromisso por carteira; planos de 1 prestação |
| `audit_prod4.ts` | KMAD alocado vs desembolsado vs pendente; taxas ligadas; caixas abertas |
| `tenant_guard_check.ts` | `companyId` forçado para 1 sem `SINGLE_TENANT_COMPANY_ID` |
