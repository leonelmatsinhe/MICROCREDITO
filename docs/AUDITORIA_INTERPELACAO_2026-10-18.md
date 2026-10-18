# Auditoria funcional — Interpelação OutBox / MBR

**Data:** 18/10/2026 · **Âmbito:** 4 campos de desembolso, relatórios regulatórios, recibos, autonomia/acessos, SMS e M-Pesa
**Método:** leitura do código em `MICROCREDITO/src`, consultas **só de leitura** à base de dados configurada no `.env`, recálculo dos planos de amortização com a função de produção (`simulator`) e prova isolada do middleware de tenant. **Não foi criado, alterado ou apagado nenhum registo.**

---

## 1. Veredicto curto

| Alegação da interpelação | Veredicto |
|---|---|
| 4 campos criados mas com erros graves de cálculo, alinhamento e parametrização | **Parcialmente procedente.** Os 5 campos existem e o Price está correcto. A parametrização está incompleta (só o KMAD tem taxas ligadas), há um bug real de alinhamento para desembolsos a 29–31, e 2 planos antigos não fecham ao cêntimo. |
| Relatório consolidado do BM com os 4 campos não existe | **Procedente.** Não existe em nenhum formato. O Excel oficial tem 13 colunas e nenhuma coluna de carteira; há um comentário no código a dizer que a desagregação «nunca entra no relatório oficial». |
| Relatório isolado do parceiro KMAD não existe | **Improcedente.** Existe: portal do parceiro + Excel + envio por e-mail, tudo filtrado por `walletId`. Ressalva: uma falha de configuração do tenant pode devolver 404 nessas rotas. |
| Recibos não são automáticos | **Parcialmente procedente.** O recibo é emitido automaticamente dentro da transacção do pagamento (hash SHA-256, QR, código de validação, PDF, numeração). **O envio ao cliente é manual** e o SMS de pagamento não leva o recibo. |
| Dependência total da OutBox / falta de autonomia | **Parcialmente procedente.** O Admin tem todas as operações. Mas há 3 pontos com o SMTP/link da OutBox fixos no código, e o `.env` actual tem uma variável em falta que força `companyId=1` (empresa inexistente) em todas as rotas que o recebem por parâmetro. |
| SMS e M-Pesa apenas à espera de credenciais | **SMS: sim** (`BULKSMS_API_KEY` ausente; o resto está implementado). **M-Pesa: não é só credencial** — só existe iniciação B2C/C2B; não há callback/webhook nem conciliação automática de pagamentos. |

---

## 2. Tabela mestra

| # | Módulo | O que foi contratado (interpelação) | O que o sistema faz hoje | Status | Prova |
|---|---|---|---|---|---|
| 1 | 4 campos — carteiras | KMAD 2.195.000 MT; PME's 12%; Comunidades 9%; Interno 8% e 10% | 5 carteiras na empresa 36: `KMAD` (alocado 2.195.000), `PME_12`, `COM_9`, `INT_8`, `INT_10`. Só o KMAD tem capital alocado; os outros 4 códigos estão sem tecto (`allocated_amount = NULL`). | **OK** (estrutura) | `financing_wallets` (consulta); `FinancingWalletModel.ts:82` |
| 2 | 4 campos — juros | Juros por campo (12/9/8/10) | Taxa guardada na BD (`financing_wallets.taxa_juro` e `interest_rates.walletId`), não hardcoded. **Mas** só 2 taxas estão ligadas a uma carteira e ambas apontam para o KMAD: «Larde e Moma - Comunidades» (2%) e «Larde e Moma - PMEs» (9%) → `walletId = 11 (KMAD)`. PME_12, COM_9, INT_8 e INT_10 não têm nenhuma taxa ligada, logo nunca são derivadas automaticamente. | **Parcial** | `InterestRateModel.ts`; `financingWalletService.ts:628` |
| 3 | 4 campos — trava taxa↔carteira | Cada campo com a sua taxa | Não existe validação que obrigue `crédito.interestRate == carteira.taxa_juro`. Um crédito KMAD pode ser desembolsado a 12% e um PME a 8% sem aviso. | **Falha** | `financingWalletService.ts:522` (não recebe a taxa); `LoanController.ts:340` |
| 4 | 4 campos — cálculo Price | Plano correcto | O gerador actual está correcto: PMT = PV·i(1+i)ⁿ/((1+i)ⁿ−1), prestação única, Σ capital = capital, última linha a 0. Validado nas 5 taxas. | **OK** | `loanAmortization.ts:58`; ver §3.2 |
| 5 | 4 campos — alinhamento de datas | Prestações mensais certas | **Bug real:** `setMonth(+n)` a partir da data-base. Desembolso a 31/01 produz 1ª em 03/03, 2ª em 31/03 (duas no mesmo mês) e salta meses. Nenhum crédito actual é afectado (todos desembolsados ao dia 3). | **Falha** | `loanAmortization.ts:108`; ver §3.3 |
| 6 | 4 campos — planos já gravados | Sem erros | 2 de 11 planos não fecham ao cêntimo (diferenças de 0,03 e 0,01 MT); 7 de 99 linhas têm amortização+juro ≠ prestação. São planos de 03/09/2026, anteriores ao gerador actual; não há job de regeneração. | **Falha** | `tools-tmp/audit_drift.ts`; ver §3.4 |
| 7 | 4 campos — selecção da carteira | Escolha no desembolso | Obrigatória no desembolso: vem do corpo, ou é derivada da taxa, ou o Admin escolhe. UI + backend validam saldo analítico e saldo real. | **OK** | `AmortizationController.ts:231-262`; `LoanApprovalModal.vue` |
| 8 | Relatório BM consolidado | Excel com 4 colunas/campos | **Não existe.** O relatório mensal tem 13 colunas e nenhuma de carteira; o trimestral segue o modelo oficial do BM e também não segrega. Só há uma desagregação interna em JSON, sem Excel e sem ligação à UI. | **Falha** | `BMReportController.ts:171,466`; `FinancierReportController.ts:352` |
| 9 | Relatório KMAD isolado | Relatório só da carteira KMAD | Existe: portal do parceiro (role 4 preso a `walletId`), `GET /api/reports/financiadores/:companyId/:walletId`, `/excel` e `/email`. Excel com 2 abas (Desembolsos, Recebimentos). | **OK** | `PartnerPortalController.ts:26`; `partnerPortalService.ts:66,179`; `FinancierReportController.ts:43` |
| 10 | Formatos | Excel/PDF | Excel (ExcelJS) no BM mensal, BM trimestral e extrato do parceiro. PDF apenas para recibos, contratos e documentos de concessão. Não há PDF do relatório BM nem do parceiro. | **Parcial** | `BMReportController.ts:466`; `FinancierReportController.ts:43` |
| 11 | Recibo na emissão | Recibo gerado no pagamento | Emitido **dentro da mesma transacção SQL** do pagamento: numeração com `SELECT … FOR UPDATE`, SHA-256, código de validação, PNG do QR, PDF e log de auditoria. Se o PDF falhar, o pagamento faz rollback. | **OK** | `TranzactionController.ts:1079`; `reciboService.ts:572` |
| 12 | Recibo — envio automático | Envio automático ao cliente | **Não.** O envio por e-mail é um endpoint manual (`POST /api/recibos/:id/enviar`) com botão na UI. O SMS pós-pagamento diz «pagamento confirmado», sem número nem link do recibo. | **Falha** | `ReciboController.ts:275`; `SmsGatewayService.ts:161` |
| 13 | Recibo — selo visível | SHA-256 + QR no documento | Hash, QR e código estão gravados em 230/230 recibos e o PDF é gerado, mas `AT_CERTIFICADO_ENABLED=false` **esconde o selo no PDF**. O cliente recebe um recibo sem QR nem hash. | **Parcial** | `reciboService.ts:838`; `.env` |
| 14 | Recibo — numeração | Sequência sem saltos | No estado actual falta o nº `REC-2026-00099` (61..291, 231 números, 230 recibos). 50 recibos estão `ANULADO` sem ligação a um recibo de estorno. | **Falha** | `tools-tmp/audit_recibos.ts` |
| 15 | Recibo — integridade | 1 recibo por pagamento | **225 dos 230 recibos apontam para pagamentos que já não existem**; a tabela `tranzactions` só tem 5 linhas. O código actual não apaga pagamentos, logo a limpeza foi externa/legada. | **Falha (dados)** | `tools-tmp/audit_recibos.ts` |
| 16 | Acessos — utilizadores | MBR cria equipa sozinha | Admin cria utilizador, altera papel, repõe senha para `123456`, elimina. Tudo pela UI (`Equipa`, `Configurações → Utilizadores`). | **OK** | `UserController.ts:55,245,308`; `UsersSection.vue:260` |
| 17 | Acessos — operação diária | Caixa, taxas, carteiras, empresa | Admin abre/fecha caixa, gere taxas, carteiras, dados da empresa e Reset Geral. Não há ecrã que exija a OutBox. | **OK** | `CashRegisterController.ts`; `InterestRateController.ts`; `FinancingWalletController.ts` |
| 18 | Autonomia — hardcodes OutBox | Sem dependência | Dependência **activa**: o e-mail de credenciais usa SMTP e link fixos da OutBox e ignora `EMAIL_HOST`. Fallbacks no recibo, relatório do financiador e QR só actuam se `EMAIL_HOST`/`PUBLIC_BASE_URL` faltarem — hoje estão definidos, logo estão inertes. | **Parcial** | `UserCredentials.ts:7,23`; `ReciboController.ts:301`; `reciboService.ts:214` |
| 19 | Autorização dos acessos | Só o Admin administra | `/api/users` (POST/PUT/DELETE) está atrás de `auth` mas **não** de `isAdmin` nem de filtro por empresa. Qualquer utilizador autenticado pode criar/alterar/apagar utilizadores e repor senhas, inclusive de outra empresa. `/api/userCredentials` é público. | **Falha** | `routes.ts:477,481,482,331`; `UserController.ts:55,245,308` |
| 20 | Configuração single-tenant | Instalação dedicada à MBR | `TENANT_MODE=single` **sem** `SINGLE_TENANT_COMPANY_ID`. O guard força `companyId=1` em query/body/params; a empresa 1 não existe (as empresas são 2, 36 e 37). Todas as rotas que recebem `:companyId` passam a devolver vazio/404. | **Falha** | `tenantGuard.ts:31,129`; prova em §6.3 |
| 21 | SMS | Bulk SMS | Código completo (envio, saldo, histórico, fila a cada 60 s, alertas de vencimento/mora/atraso, SMS de desembolso e pagamento). `BULKSMS_API_KEY` **não está definida**; sem ela a fila não sai. | **Pendente credenciais** | `BulkSmsProvider.ts:48,59`; `app.ts:120,150` |
| 22 | M-Pesa | Pagamentos M-Pesa | Só iniciação `initiate_b2c` / `initiate_c2b` com `mpesa-node-api`. **Não há callback/webhook, nem conciliação, nem registo automático do pagamento na prestação.** As chaves M-Pesa estão presentes no `.env`. | **Parcial + Pendente** | `MpesaPaymentController.ts:5,20`; `routes.ts:369-370` |
| 23 | Ambiente local | — | O processo em `:4000` responde **404 a todas as rotas testadas** (build antigo). Auditoria feita sobre `src/`, não sobre o binário em execução. | **Falha operacional** | §8 |

---

## 3. Detalhe — 4 campos de desembolso

### 3.1 Carteiras realmente existentes (empresa 36)

| Código | Nome | Capital alocado | Desembolsado (status 1/3) | Saldo analítico | Taxa da carteira |
|---|---|---:|---:|---:|---|
| `KMAD` | Parceria KMAD | 2.195.000,00 | 660.000,00 | **1.535.000,00** | `NULL` (tem 2% e 9% em `interest_rates`) |
| `PME_12` | PME's — MBR / 12% | — (ilimitado) | 0,00 | — | 12% |
| `COM_9` | Comunidades — MBR — 9% | — (ilimitado) | 0,00 | — | 9% |
| `INT_8` | Interno — 8% | — (ilimitado) | 15.000,00 | — | 8% |
| `INT_10` | Interno — 10% | — (ilimitado) | 0,00 | — | 10% |

Existem ainda `FORN_SER_10`, `TRA_INT_8`, `MAP_PMES_12` e `MOA_COM_9` na mesma empresa. Créditos por carteira: KMAD 8 (6 a 2%, 2 a 9%), TRA_INT_8 4, INT_8 1, FORN_SER_10 1. **PME_12, COM_9 e INT_10 não têm um único crédito.**

⚠️ **Parametrização cruzada:** as duas únicas taxas ligadas a carteira chamam-se «Larde e Moma - Comunidades» (2%) e «Larde e Moma - PMEs» (9%), mas apontam ambas para o **KMAD**. É por isso que não há créditos em `COM_9` nem em `PME_12`, e todos os créditos KMAD são a 2% ou 9%. Confirmar com a MBR se a afectação pretendida era KMAD ou Comunidades/PME — este é o ponto mais provável por trás da queixa de «parametrização errada».

### 3.2 Price — verificado nas 5 taxas (100.000 MT / 12 meses)

| Carteira | Taxa | Prestação | Σ capital | Σ juros | Linhas que não fecham | Saldo final |
|---|---:|---:|---:|---:|---:|---:|
| KMAD | 2% | 9.455,96 | 100.000,00 | 13.471,52 | 0 | 0 |
| KMAD/COM_9 | 9% | 13.965,07 | 100.000,00 | 67.580,84 | 0 | 0 |
| PME_12 | 12% | 16.143,68 | 100.000,00 | 93.724,16 | 0 | 0 |
| INT_8 | 8% | 13.269,50 | 100.000,00 | 59.234,00 | 0 | 0 |
| INT_10 | 10% | 14.676,33 | 100.000,00 | 76.115,96 | 0 | 0 |

**Conclusão:** a fórmula Price está correcta e fecha ao cêntimo.

### 3.3 O bug de alinhamento (reproduzido)

Desembolso em `2026-01-31`, 12 prestações:

```
1ª 2026-03-03     2ª 2026-03-31     3ª 2026-05-01     4ª 2026-05-31
5ª 2026-07-01     6ª 2026-07-31     7ª 2026-08-31     8ª 2026-10-01
```

Duas prestações em Março, nenhuma em Fevereiro/Abril/Junho/Setembro/Novembro. Causa: `dueDate.setMonth(getMonth() + n)` sobre a data-base (31/01 → 31/02 não existe → 03/03), em vez de somar `n` meses com fixação do dia ou usar o último dia do mês.

### 3.4 Planos já gravados (base real)

| Crédito | Data | Taxa | n | Capital do plano vs crédito | Linhas erradas |
|---|---|---:|---:|---|---:|
| 61 | 2026-09-03 | 2% | 18 | 100.000,00 = 100.000,00 | 0 |
| 62 | 2026-09-03 | 9% | 18 | **90.000,03 vs 90.000,00** | **5** |
| 63 | 2026-09-03 | 2% | 18 | **19.999,99 vs 20.000,00** | **1** |
| 66 | — | 2% | 18 | 300.000,00 = 300.000,00 | 1 |
| 67 | — | 2% | 18 | 150.000,00 = 150.000,00 | 0 |
| 126 | — | 8% | 4 | 15.000,00 = 15.000,00 | 0 |

Total: **2 de 11 planos não fecham** (pior diferença 0,03 MT) e **7 de 99 linhas** têm amortização + juro ≠ prestação. O simulador actual, corrido com os mesmos parâmetros, fecha correctamente — logo o defeito está nos planos gravados, não no gerador. Não existe rotina de regeneração.

### 3.5 Onde está a lógica de selecção da carteira

| Camada | Ficheiro |
|---|---|
| Criação do crédito (carteira do corpo ou derivada da taxa) | `src/controllers/LoanController.ts:340-348` |
| Derivação taxa → carteira | `src/services/financingWalletService.ts:628` |
| Desembolso (escolha + ambiguidade + validação) | `src/controllers/AmortizationController.ts:231-262` |
| Validação analítica + saldo real | `src/services/financingWalletService.ts:522` |
| CRUD e classificação de carteiras | `src/controllers/FinancingWalletController.ts` |
| Ligação taxa ↔ carteira | `src/controllers/InterestRateController.ts` |
| UI de desembolso | `web-app-v2/src/components/modals/LoanApprovalModal.vue:105-158` |

---

## 4. Detalhe — relatórios

### 4.1 BM mensal (o que existe)

`GET /api/reports/banco-mocambique/:companyId` → JSON; `/excel` → `.xlsx` com 13 colunas fixas:

`Nº da Operação · Nome do Cliente · Data de Desembolso · Montante · Finalidade · Valor da Prestação · Periodicidade · Prazo · Taxa de Juro · Crédito em Dívida · Crédito em Atraso · Dias em Atraso · PPEs`

Não há coluna de carteira, nem totais por campo, nem aba por campo.

### 4.2 BM trimestral (modelo oficial)

`POST /api/microcredito/reportes/gerar` preenche o template `MODELO_DE_REPORTE_TRIMESTRAL_2025_III.xlsx` (volume, nº de créditos, sectores, clientes, risco, taxas, fontes de financiamento). Também não segrega os 4 campos.

### 4.3 O comentário que encerra a discussão

```ts
// src/controllers/FinancierReportController.ts:352
/**
 * Desagregação por carteira — uso INTERNO (análise). Nunca entra no relatório
 * oficial do BM, que continua a somar todos os desembolsos sem discriminar.
 */
```

Existe `GET /api/reports/wallets-breakdown/:companyId` (JSON, sem Excel e sem chamada na UI). É análise interna, não é o relatório exigido.

### 4.4 KMAD

- `GET /api/partner/*` — todas as funções recebem `{ companyId, walletId }` do middleware; nenhum endpoint aceita `walletId` do pedido (`PartnerPortalController.ts:26`).
- `getPartnerLoans`, `getPartnerInstallments`, `getPartnerTransactions`, `getPartnerStatement`, `getPartnerMora` filtram por `walletId` (`partnerPortalService.ts:66,120,145,179`).
- Excel: `GET /api/reports/financiadores/:companyId/:walletId/excel` — 2 abas, cabeçalho com carteira e saldo analítico (`FinancierReportController.ts:43`).
- E-mail: `POST …/email` com o Excel em anexo.
- Existe utilizador de parceiro: `parceiro@kmad.co.mz` (role 4, carteira KMAD).

---

## 5. Detalhe — recibos

### 5.1 O que é automático (e está bem)

`addTranzaction` → passo 15 → `emitReciboInTransaction` na mesma transacção:

1. reserva da sequência com `SELECT … FOR UPDATE` (`reciboService.ts:356`);
2. `INSERT` do recibo com dados congelados do cliente/carteira;
3. SHA-256 sobre NUIT + empresa + número + ano + sequência + crédito + cliente + pagamento + valor + data + segredo (`reciboService.ts:196`);
4. código de validação `AT-AAAA-00001` (gerado localmente, não emitido pela AT) e PNG do QR com URL pública de validação;
5. PDF (pdfkit) na mesma transacção — falha ⇒ rollback do pagamento;
6. `audit_log` da emissão.

Estado da base: **230 recibos, 230 com hash, 230 com QR, 230 com PDF**.

### 5.2 O que não é automático

- **Envio:** `POST /api/recibos/:id/enviar` (manual, botão «Enviar recibo por e-mail»). Não há job, trigger nem fila que envie o recibo.
- **SMS:** `enqueuePaymentSms` envia «Pagamento de X MZN confirmado… Ref: …», **sem número do recibo nem link**.
- **Selo no PDF:** `modelo` só imprime hash/QR quando `AT_CERTIFICADO_ENABLED=true`; hoje está `false`. O selo existe na BD mas o cliente não o vê.

### 5.3 Problemas de integridade (estado actual)

| Item | Valor |
|---|---|
| Recibos totais | 230 (180 `EMITIDO`, 50 `ANULADO`) |
| Recibos cujo pagamento já não existe | **225** |
| Pagamentos existentes | **5** |
| Números em falta na série 2026 | `REC-2026-00099` |
| Anulados com `annulled_by_recibo_id` | 0 (o campo não é usado; o estorno grava motivo no próprio recibo) |

O código actual não tem endpoint que apague pagamentos; o estorno marca `REVERSED` e anula o recibo. Estes órfãos vieram de limpeza externa/legada (a suite `payment.test.ts` corre contra a base do `.env` e apaga `tranzactions` com referência `TEST-%`). **Qualquer auditoria da AT falha neste ponto enquanto a base não for reconciliada.**

---

## 6. Autonomia e acessos

### 6.1 O que o Admin faz sem a OutBox

Criar/editar/eliminar utilizadores, repor senha (`123456`), criar parceiros financiadores, abrir/fechar caixa, movimentos de tesouraria, taxas, carteiras, dados da empresa, logs, Reset Geral. Nada disto chama serviços externos da OutBox.

### 6.2 Dependências reais da OutBox

| Ponto | Ficheiro |
|---|---|
| SMTP fixo `mail.outboxsolutions.co.mz` no envio de credenciais | `src/controllers/UserCredentials.ts:7` |
| Link `http://maismola.outboxsolutions.co.mz` no e-mail de credenciais | `src/controllers/UserCredentials.ts:23` |
| Fallback de SMTP no recibo e relatório do financiador (inerte: `EMAIL_HOST` está definido) | `ReciboController.ts:301`, `FinancierReportController.ts:311` |
| Fallback do URL de validação do QR (inerte: `PUBLIC_BASE_URL` está definido) | `reciboService.ts:214` |

O `.env` define `EMAIL_HOST`, mas `UserCredentials` ignora-o. Enquanto isso não mudar, **enviar credenciais depende do SMTP da OutBox**: o utilizador é criado, mas se esse servidor ou a credencial mudarem o e-mail de credenciais falha.

### 6.3 Falha de configuração que quebra a operação

`TENANT_MODE=single` e `SINGLE_TENANT_COMPANY_ID` ausente. `tenantGuard` usa o default **1** e reescreve `companyId` em `req.query`, `req.body` e `req.params`. A empresa 1 **não existe**.

Prova isolada (app mínima, sem tocar na base):

```
SEM SINGLE_TENANT_COMPANY_ID  => GET /api/reports/banco-mocambique/36  devolve params.companyId "1"
COM SINGLE_TENANT_COMPANY_ID=36 => devolve "36"
```

Rotas afectadas: `/api/reports/banco-mocambique/:companyId`, `/api/reports/financiadores/:companyId/:walletId`, `/api/wallets/:companyId`, `/api/dashboard/:companyId`, `/api/companyLoans/:companyId`, `/api/installments/control/:companyId`, `/api/payments/:companyId/all`, `/api/loan/findAllLoans/:id/:companyId`.

**Correcção:** `SINGLE_TENANT_COMPANY_ID=36` no `.env` (ou no serviço/PM2) e reiniciar.

### 6.4 Segurança dos acessos

- `POST/PUT/DELETE /api/users` sem `isAdmin` e sem filtro de empresa → escalada de privilégios e alteração de senhas de outra empresa.
- `POST /api/userCredentials` é público (antes do `auth`) e envia a senha recebida no corpo para qualquer e-mail.
- Senha inicial/padrão `123456` em repor senha.

---

## 7. SMS e M-Pesa

| Item | Estado |
|---|---|
| Provider BulkSMS (envio, saldo, histórico) | Implementado — `BulkSmsProvider.ts` |
| Fila e processamento | Implementado — a cada 60 s (`app.ts:120`) |
| Alertas automáticos (3 dias, mora, atraso) | Implementado — 30 s após arranque e de 6 em 6 h (`app.ts:150`) |
| Credencial | **`BULKSMS_API_KEY` ausente** → nada sai; a fila fica intacta |
| M-Pesa — iniciação B2C/C2B | Implementado — `MpesaPaymentController.ts:5,20` |
| M-Pesa — callback/webhook | **Não existe** |
| M-Pesa — conciliação automática | **Não existe** |
| Credenciais M-Pesa | Presentes no `.env` (`MPESA_API_KEY`, `MPESA_API_HOST`, `MPESA_SERVICE_PROVIDER_CODE`, `MPESA_PUBLIC_KEY`) |

Correcção da premissa: **M-Pesa não está «pronto, só falta credencial»**. Com as chaves actuais consegue-se *pedir* um pagamento; o dinheiro recebido não entra sozinho no sistema nem baixa a prestação.

---

## 8. Limitações desta auditoria

1. **Não criei créditos de teste na base real.** Escrever na base de produção durante uma auditoria é inaceitável. Em vez disso, recalculei os 11 planos existentes e simulei os 5 cenários com a função de produção, sem escrita.
2. **O servidor em `:4000` está com um build antigo** e devolve 404 a todas as rotas testadas (`/api/dashboard/36`, `/api/reports/banco-mocambique/36`, `/api/wallets/36`, …). A verificação foi feita sobre `src/`, não sobre o binário em execução.
3. Não tive acesso ao servidor de produção da MBR nem à base de produção; os números vêm da base configurada neste posto.
4. Não validei o conteúdo visual do PDF gerado (apenas a existência e os campos na BD); a flag AT está `false`, logo o PDF actual não mostra o selo.

---

## 9. Prioridades para fechar a interpelação

**P0 — bloqueia operação/regulatório**
1. Definir `SINGLE_TENANT_COMPANY_ID=36` e reiniciar; confirmar as rotas com `:companyId`.
2. Reconciliar os 225 recibos órfãos e o nº 99 em falta (não apagar; documentar e emitir nota de crédito/anulação conforme o caso).
3. Corrigir o envio do recibo: automático por e-mail/SMS no pós-pagamento, com número e link de validação.
4. Ligar as taxas 8/10/12% às respectivas carteiras e bloquear desembolso cuja taxa não pertença à carteira.

**P1 — fecha as alegações técnicas**
5. Corrigir as datas do plano (somar meses com fixação de dia / último dia do mês) e regenerar os planos com drift.
6. Criar o Excel consolidado do BM com uma coluna/aba por carteira (KMAD, PME, Comunidades, Interno 8%, Interno 10%) e totais.
7. Restringir `/api/users` a Admin com escopo de empresa; proteger `/api/userCredentials`.
8. Substituir os 3 hardcodes da OutBox por variáveis de ambiente.

**P2 — credenciais**
9. `BULKSMS_API_KEY` para activar a fila.
10. Callback + conciliação M-Pesa (não é credencial, é desenvolvimento).

---

### Anexo — scripts de verificação (só leitura)

| Script | O que prova |
|---|---|
| `tools-tmp/audit_readonly.ts` | Carteiras, taxas ligadas, créditos por carteira, selo dos recibos |
| `tools-tmp/audit_price.ts` | Price nas 5 taxas + datas 31/01 |
| `tools-tmp/audit_planos.ts` / `audit_plano_cents.ts` / `audit_drift.ts` | Planos reais vs fórmula; drift ao cêntimo |
| `tools-tmp/audit_recibos.ts` / `audit_seq.ts` / `audit_orf.ts` | Órfãos, numeração, status |
| `tools-tmp/tenant_guard_check.ts` | `companyId` forçado para 1 |
| `tools-tmp/audit_live.ts` | Rotas em `:4000` (todas 404 — build antigo) |
