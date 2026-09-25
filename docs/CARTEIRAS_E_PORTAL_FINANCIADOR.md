# Carteiras de Financiamento, Portal do Financiador e Recibos

Documento de referência da implementação pedida pela Direcção (e-mail da Iracema Mahuai, 21/09/2026).

---

## 1. Os dois tipos de dinheiro (não confundir)

| | **REAL (físico)** | **ANALÍTICO (novo)** |
|---|---|---|
| Onde vive | tabela `accounts` (`purpose = DESEMBOLSO` / `MISTO`) | tabela `financing_wallets` |
| O que é | dinheiro que existe no banco/cofre/mobile money | valores base de cada fundo/parceiro, para análise |
| Para que serve | é de onde SAI o dinheiro entregue ao cliente | separar relatórios por financiador e controlar o capital de cada fundo |
| Quem altera | `treasuryService` (movimentos, transferências, extratos) | Admin, nas *Carteiras de Financiamento* |
| Saldo | `accounts.balance` (saldo bancário real) | `alocado − desembolsado` (calculado, não guardado) |

> **Regra**: as carteiras de financiamento **não** têm dinheiro. Servem para etiquetar cada desembolso com a origem do capital. Um desembolso é validado **nas duas camadas**.

---

## 2. Modelo de dados

### Tabelas novas
- **`financing_wallets`** — uma linha por fundo/parceiro: `codigo`, `nome`, `descricao`, `tipo` (`FINANCIAMENTO` apenas), dados do parceiro (`parceiro_nome/email/nuit/contacto`, `is_parceiro_externo`), `allocated_amount` (capital alocado, `NULL` = sem limite), `initial_disbursed_amount` (base histórica, ex.: 660.000 da KMAD), `taxa_juro`, `cor_badge`, `is_ativa`, `tem_portal`, `portal_ativo`. Único por `(companyId, codigo)`.
- **`recibos`** — comprovativo de cada pagamento, com `numero` (`REC-AAAA-00001`), `serie`, `sequencia`, `ano`, ligações a `tranzactions`/`customer_loans`/`customers`/`financing_wallets`, decomposição (`valor_pago`, `valor_capital`, `valor_juros`, `valor_mora`, `valor_desconto`, `saldo_restante`) e `pdf_url`. Únicos: `numero` e `(companyId, ano, sequencia)`.
- **`recibos_sequencia`** — contador por `(companyId, ano)`; reservado com `SELECT … FOR UPDATE`.

### Colunas novas em tabelas existentes
- `users.walletId`, `users.is_parceiro`
- `interest_rates.walletId` (carteira a que a taxa pertence) e `interest_rates.accountId` (conta de desembolso, quando a taxa é do dinheiro real) — mutuamente exclusivos
- `customer_loans.walletId` (classificação analítica do crédito)
- `tranzactions.walletId`, `tranzactions.mora_amount`
- `amortization_loans.walletId`, `amortization_loans.mora_amount`, `amortization_loans.mora_days`

Todas as migrações são idempotentes e correm no arranque do servidor (`src/migrations/index.ts`) — nunca apagam dados.

### Seed automático
Para **cada** empresa são criadas 5 carteiras:

| Código | Nome | Capital alocado | Taxa | Parceiro / Portal |
|---|---|---|---|---|
| `KMAD` | Desembolso no âmbito da parceria com a KMAD | 2.195.000 MT (660.000 já desembolsados) | — | Sim / Sim |
| `PME_12` | Desembolso no âmbito das PME's – MBR / 12% | sem limite | 12% | Não |
| `COM_9` | Desembolso no âmbito das Comunidades – MBR – 9% | sem limite | 9% | Não |
| `INT_8` | Desembolsos no âmbito Interno – 8% | sem limite | 8% | Não |
| `INT_10` | Desembolsos no âmbito Interno – 10% | sem limite | 10% | Não |

E, na empresa operacional, a conta de teste do parceiro KMAD:
**`parceiro@kmad.co.mz` / `Mbrm@2025`** (perfil *Parceiro Financiador*, ligada à carteira `KMAD`).

---

## 3. Fluxo do Admin (MBRM)

### 3.1 Criar / editar / apagar carteira
Menu lateral → **Financiamento → Carteiras e Taxas** (`/financiamento`, aba *Carteiras*).
- Cartões por carteira: capital alocado, desembolsado, disponível analítico (com barra de utilização), recebimentos, créditos/reembolsados, taxa média, juros gerados/recebidos, mora gerada, previsão de lucro e saldo a receber.
- Cabeçalho: consolidado (sem discriminar) + **saldo real para desembolsos** (contas `DESEMBOLSO`/`MISTO`).
- *Nova Carteira* / menu ⋮ → *Editar*, *Apagar*, *(Des)activar*.

**Regras de eliminação** (menu ⋮ → *Apagar*): a carteira só pode ser apagada quando **não tem** créditos, recebimentos, prestações, recibos, utilizadores ligados nem base histórica de capital desembolsado. Com qualquer um destes, o sistema devolve a lista exacta do que a bloqueia e sugere **desactivar**. Ao apagar, as taxas de juro que apontavam para a carteira ficam sem vinculação (não são eliminadas).
Para carteiras de teste existe o botão **Limpar carteiras de teste** (Admin), que lista as carteiras sem movimento com código `TESTE…` ou criadas nos últimos 7 dias e permite apagá-las em lote.

### 3.2 Equipa e Parceiros (perfil 4 no mesmo formulário)
Menu → **Equipa e Parceiros** (`/equipe`).
- Aba *Equipa MBRM* (Admin, Gestor, Operador) e aba *Parceiros Financiadores*, com contadores por perfil e filtro de perfil.
- *Novo Membro* usa **um único formulário** para todos os perfis: nome, e-mail, senha, telefone, **perfil** e conta activa. Ao escolher *Parceiro Financiador* aparecem os campos extra: **carteira de financiamento** (só carteiras de parceiro externo com portal activo) + aviso de que o acesso vai para o Portal do Financiador.
- O sistema cria o utilizador com o perfil *Parceiro Financiador*, ligado a essa carteira. Ao mudar a carteira, muda-se o que o parceiro vê. Só o Admin acede a esta página.

### 3.2.1 Classificação automática dos créditos sem carteira (pré-visualização)

Os créditos concedidos antes das carteiras ficaram sem origem de capital. Em *Carteiras de Financiamento* → **Classificar créditos antigos**, o sistema **propõe** uma carteira a cada crédito e mostra o que vai ser gravado **antes** de gravar:

- **Regra principal — a taxa de juro do crédito**: a carteira é derivada de `interest_rates.walletId` da taxa do crédito (ex.: 8% → `INT_8`, 12% → `MBR_12`, 2% → `KMAD`).
  - **Sugerida (ALTA)**: a taxa aponta para **uma só** carteira → a linha aparece pré-preenchida e marcada.
  - **Ambígua**: a mesma taxa está ligada a várias carteiras (hoje 9% existe em `KMAD` e em `MBR_09`) → a linha **não** é pré-preenchida, mostra o aviso e exige escolha manual.
  - **Sem taxa correspondente**: nenhuma taxa do sistema bate com a do crédito, ou as taxas equivalentes estão ligadas a uma **conta de desembolso** (6% e 7%) em vez de uma carteira → fica manual.
- **Data de desembolso**: os créditos são listados cronologicamente (sem data no fim) para se rever o período de cada fundo; é também critério de desempate quando só uma das carteiras candidatas tem **«desembolso anterior»** declarado (`financing_wallets.initial_disbursed_amount`).
- **Impacto antes de gravar**: para cada carteira o diálogo mostra nº de créditos, valor, intervalo de datas e a percentagem do capital alocado (a vermelho quando o valor sugerido **excede** o alocado).
- Se o Admin corrigir uma linha, o campo fica assinalado a laranja (deixou de ser a sugestão da taxa).
- Botão **Sugerir pela taxa** volta a aplicar as sugestões; **Limpar** esvazia tudo. Nada é gravado até **Guardar classificação**, que usa `POST /api/wallets/classify-loans`.

A mesma regra é aplicada **sem intervenção** ao criar um crédito e no desembolso: sem carteira no pedido, a carteira é derivada da taxa escolhida; se a taxa for ambígua, o desembolso é bloqueado com o pedido para escolher a carteira.

### 3.3 Taxas de juro ↔ origem do capital
Aba **Taxas de Juro** da mesma página `/financiamento` (Configurações → *Taxas de Juro* abre a mesma aba).
- Ao criar/editar uma taxa, o campo **Vincular a** é obrigatório e tem três opções: **Carteira de Financiamento** (dinheiro analítico), **Conta de Desembolso Principal** (dinheiro real — contas `DESEMBOLSO`/`MISTO`) ou *Sem vinculação*. Nunca fica com carteira **e** conta ao mesmo tempo.
- Cada cartão mostra o badge da carteira (com parceiro e capital alocado) ou o banco/conta de desembolso com o saldo, e um botão **Vincular** quando ainda não tem origem.
- Ao escolher a taxa no desembolso, a carteira associada é pré-selecionada.
- As taxas antigas foram ligadas automaticamente por palavra-chave do nome (Comunidades → `COM_9`, PMEs → `PME_12`, Interno/Trabalhador/Automóvel → `INT_8`, Fornecedores → `INT_10`, restantes → conta de desembolso principal). O backfill corre **uma vez por empresa**: bastará uma taxa vinculada para nunca mais mexer no que o Admin ajustar.
- **Se guardar a vinculação falhar**: verifique se `interest_rates` já está em `utf8mb4`. A tabela nasceu em `latin1_swedish_ci` e, com a conexão em utf8mb4, gravar nomes acentuados ("Habitação", "Automóvel") falhava com *Conversion from collation utf8mb4_unicode_ci into latin1_swedish_ci impossible for parameter* — e a vinculação ia junto. A migração de charset (`ALTER TABLE … CONVERT TO CHARACTER SET utf8mb4`) resolve; corre uma vez por base e é idempotente.

### 3.4 Desembolso de crédito (validação dupla)
Em *Créditos* → aprovar/desembolsar (modal *Aprovar Crédito*):
1. **Carteira de financiamento** (obrigatória) com resumo *alocado / desembolsado / disponível*.
2. Se o valor exceder o **saldo analítico** da carteira → bloqueio com a mensagem do calculado (Alocado, Desembolsado, Disponível).
3. Se o valor exceder o **saldo real** somado das contas de desembolso → bloqueio ("as carteiras são analíticas — transfira fundos para a conta de desembolso").
4. Ao confirmar: `customer_loans.walletId` e todas as prestações ficam etiquetadas; o movimento de caixa/tesouraria continua a sair da conta real.

### 3.5 Relatórios
- **Banco de Moçambique** (`/reports/banco-mocambique`): **inalterado** — todos os desembolsos, **sem discriminar carteiras**.
- **Desagregação interna** (opcional, só para análise): `GET /api/reports/wallets-breakdown/:companyId` — devolve por carteira, com aviso de que o relatório oficial continua consolidado.
- **Relatório Financiadores** (`/reports/financiadores`): escolher carteira + período (atalhos *Hoje*, *7 dias*, *Este mês*, *Este ano*, com datas em `dd/mm/aaaa`) → desembolsos e recebimentos **apenas daquela carteira**, com:
  - KPIs da carteira (alocado, desembolsado/recebido/juros/mora no período, saldo analítico, saldo a receber, taxa média, previsão de lucro, prestações pagas/em atraso);
  - gráficos do período (desembolsado vs recebido por mês e composição dos recebimentos);
  - tabelas com pesquisa, ordenação, paginação e totalizadores, e estados vazios que explicam o período procurado;
  - *Exportar Excel* — 2 abas (Desembolsos + Recebimentos) com cabeçalho da empresa e da carteira;
  - *Enviar por e-mail* — para o e-mail do parceiro (ou outro indicado), com o Excel em anexo;
  - *Imprimir / PDF*.
- **Painel de Controlo** (`/dashboard`): só KPIs de carteiras — capital alocado, desembolsado, reembolsado e saldo real, cartões por carteira (créditos, reembolsados, taxa média, juros gerados/recebidos, mora, previsão de lucro, saldo a receber), três gráficos por carteira (barras desembolsado vs recebido, evolução mensal, peso de cada carteira no total acumulado) e as próximas prestações. As barras incluem a **base histórica** como série própria (ex.: os 660.000 MT da KMAD), para reconciliação com os cartões.

### 3.6 Navegação (sidebar)
O menu principal está agrupado por secções, com busca, favoritos e destaque da secção activa: *Geral* (Painel) · *Gestão de Crédito* (Mutuários, Créditos, Controle Prestações) · *Tesouraria* (Pagamentos, Caixa Central, Contas Bancárias, Caixa, Histórico Caixa) · *Financiamento* (Carteiras e Taxas, Parceiros Financiadores) · *Relatórios* (Relatório BM, Relatório Financiadores) · *Sistema* (Equipa e Parceiros, Configurações, Centro de Mensagens, Histórico).

---

## 4. Portal do Parceiro Financiador (perfil 4)

Login normal (`parceiro@kmad.co.mz` / `Mbrm@2025`) → o sistema encaminha para **`/parceiro/dashboard`** (layout próprio, sem a sidebar da MBRM).

Páginas (todas filtradas à carteira do parceiro):
| Rota | Conteúdo |
|---|---|
| `/parceiro/dashboard` | Capital alocado, desembolsado, disponível + barra de utilização, recebimentos, juros recebidos/pendentes, mora gerada/recebida/pendente, créditos, clientes, prestações pagas/pendentes/em atraso e evolução mensal |
| `/parceiro/creditos` | Créditos desembolsados (cliente, valor, taxa, saldo devedor, atraso, mora) + detalhe das prestações |
| `/parceiro/prestacoes-pagas` | Prestações liquidadas (capital, juros, valor pago, data) |
| `/parceiro/prestacoes-pendentes` | A vencer / em atraso / todas, com dias de atraso e mora |
| `/parceiro/mora` | Mora por prestação (gerada / recebida / pendente) e série mensal |
| `/parceiro/recebimentos` | Pagamentos recebidos, com link para o recibo |
| `/parceiro/extrato` | Resumo do período + desembolsos + recebimentos, exportável em Excel |
| `/parceiro/recibos` | Recibos emitidos para a carteira (PDF) |

**Limites de acesso (implementados no servidor, não só na interface):**
- todas as rotas `/api/partner/*` exigem `userRole = 4` e carteira associada (`users.walletId`), lida da base de dados — o parceiro **não** envia `walletId`/`companyId` no pedido;
- o parceiro tem acesso **só de leitura + exportação**: não cria, edita ou elimina nada;
- não acede ao painel MBRM, ao relatório do BM, a outras carteiras nem a contas de staff (`/api/wallets`, `/api/recibos/gerar`, etc. devolvem 403);
- se o portal da carteira for desactivado, o acesso é negado ("Contacte o Administrador da MBRM").

---

## 5. Recibos — numeração sequencial legal (AT)

- **Formato**: `REC-AAAA-00001` — série `REC`, sequência de 5 dígitos por empresa e ano.
- **Sem saltos**: o contador (`recibos_sequencia`) é reservado dentro de uma transacção com `SELECT … FOR UPDATE`; se a gravação falhar, o rollback devolve o número.
- **Um recibo por pagamento individual** (idempotente: reemitir devolve o mesmo número).
- **Conteúdo**: identificação do emitente (nome, NUIT, endereço, contactos), dados do cliente (nome, NUIT, conta), crédito, **carteira de financiamento**, decomposição (capital, juros, mora, desconto), método de pagamento, saldo devedor após o pagamento e **extrato do crédito com as prestações pendentes**. Rodapé legal + espaços de assinatura/carimbo.
- **Como emitir**: *Pagamentos* → botão **Recibo** na linha do pagamento (emite e abre o PDF). O pagamento registado no sistema gera o recibo automaticamente (best-effort); se falhar, pode ser emitido depois.
- **Ficheiros**: `uploads/docs/recibo-REC-AAAA-XXXXX.pdf`.
- **Selo electrónico**: cada recibo guarda `hash_at` (SHA-256), `qr_code_url` (PNG do QR em `uploads/recibos/<empresa>/<ano>/`), `at_validation_code`, `software_certification` e a descrição legível do método de pagamento. O QR aponta para `/validar?rec=…&hash=…` (página pública, sem sessão) que responde **RECIBO VÁLIDO**/**NÃO CONFIRMADO** e devolve o resumo em `GET /api/recibos/validar`.
- **Re-impressão**: `GET /api/recibos/:id/pdf?regenerate=1` volta a gerar o PDF com o layout actual, mantendo número, hash e sequência AT.
- **Layout (v2 — correcções)**:
  - **Extrato completo com paginação**: o extrato lista **todas** as prestações pendentes. Quando o espaço da página acaba abre-se a página seguinte, com o cabeçalho da tabela repetido e o número do recibo no topo (`… — continuação`). O fecho (total pendente + texto legal + assinaturas) passa para página nova se não couber, em vez de se sobrepor ao texto legal. O recibo de um crédito com 17 pendentes sai em **2 páginas**.
  - **Crédito legado** (sem carteira): badge cinza **LEGADO** e o texto *Geral MBRM — crédito anterior às carteiras de financiamento*; classifique o crédito para o badge colorido da carteira aparecer (secção 5.1).
  - **Selo electrónico**: a hash SHA-256 (64 caracteres) é impressa em duas linhas de 32, com a etiqueta alinhada — nunca é cortada; ficam visíveis o código de validação, o software certificado e o URL de validação.
  - **Dados**: taxa identificada como **% a.m.** (a taxa gravada é a do período mensal do plano francês), telefone do mutuário com máscara `+258 …`, data/hora de emissão com o fuso `(África/Maputo)`, método de pagamento legível (conta + finalidade) e rodapé fixo em todas as páginas com `Página X de Y`.
  - As páginas **A4** mantêm margens de 40pt; a faixa de rodapé fica reservada em todas as páginas (o pdfkit abre página nova quando a linha seguinte não cabe, por isso o rodapé nunca encosta ao limite inferior).

### 5.1 Recibos no detalhe do crédito (`/loans/:id`)

Abrir pelo ícone **Recibos** (📄) nas acções de qualquer linha de *Créditos* — não é preciso passar pela página global de Pagamentos.

- **Cabeçalho**: mutuário (avatar + contacto), estado do crédito, montante, taxa, data de desembolso e badge da **carteira de financiamento** (ou **LEGADO — Geral MBRM** quando o crédito é anterior às carteiras). Atalhos para **Documentos** do crédito.
- **Classificar carteira**: no cabeçalho de um crédito legado, **Classificar agora** abre um diálogo com as carteiras activas (código, parceiro e disponível analítico) e grava a escolha via `POST /api/wallets/classify-loans` — a carteira passa a constar no crédito, nas prestações, nos pagamentos e nos recibos já emitidos, sem alterar valores pagos.
- A classificação em lote (todas as linhas de uma vez) está em *Carteiras de Financiamento* → **Classificar créditos antigos**, com propostas derivadas da taxa de juro (secção 3.2.1).
- **KPIs**: total recebido, capital recebido (com juros), mora recebida (com mora gerada) e saldo devedor (com próximo vencimento).
- **Aba Pagamentos e Recibos**: um registo por pagamento com data/operador, valor, capital, juros, mora, desconto, método legível e referência. Na coluna **Recibo** aparece o número legal com o hash; as acções são **Ver** (visualizador com pré-visualização do PDF, descarregar, imprimir, re-imprimir, e-mail, WhatsApp e validar QR) e **Re-imprimir**; quando ainda não há recibo, aparece **Emitir** e um aviso no topo permite **Emitir em falta** todos de uma vez.
- **Aba Prestações**: plano completo (nº, vencimento, valor, pago, pendente, mora, estado Paga/Pendente/Em atraso) e o total em dívida.
- **Backend**: `GET /api/loan/:id/detail` (staff) devolve crédito + mutuário + carteira + pagamentos com o recibo de cada um + recibos + totais; as prestações continuam a vir de `GET /api/loan/amortization/:id`.

### 5.2 Recebido pelo cliente (portal do mutuário)

- O **Histórico de Pagamentos** do portal do mutuário (`/portal/pagamentos`) mostra, em **cada pagamento**, o botão **Recibo** e o número já emitido (ex.: `REC-2026-00001`).
- O download é feito por `GET /api/portal/:companyId/:customerId/payments/:tranzactionId/recibo/pdf?download=1` — **emite o recibo sob procura** se ele ainda não existir, pelo que pagamentos anteriores à numeração de recibos também passam a ter comprovativo (uma vez por pagamento, sempre com o mesmo número).
- A rota valida que o pagamento pertence ao cliente e à empresa do caminho (cliente/empresa errados → `404`); o recibo devolvido nunca é de terceiros.- Ao pagar pelo portal (M-Pesa), o backend devolve o recibo emitido e o portal apresenta um aviso com a acção **Recibo**, para o cliente descarregar imediatamente.




---

## 6. API (resumo)

| Método | Rota | Perfil |
|---|---|---|
| GET | `/api/wallets/:companyId` · `/dashboard` · `/options` · `/:id` | autenticado |
| GET | `/api/wallets/:companyId/rates` · `/partner-users` | Admin (partner-users) |
| POST/PUT/DELETE | `/api/wallets` · `/api/wallets/:id` | Admin |
| GET | `/api/wallets/:id/dependencies` · `/api/wallets/:companyId/test-candidates` | Admin |
| GET | `/api/wallets/:companyId/classification-proposals` | Admin (propostas: taxa de juro → carteira, sem gravar) |
| POST | `/api/wallets/:id/deactivate` · `/api/wallets/purge-test` | Admin |
| POST | `/api/users/parceiros` · PUT `/api/users/parceiros/:id` | Admin |
| GET/POST | `/api/reports/financiadores/:companyId/:walletId[/excel]` · `/email` | autenticado |
| GET | `/api/reports/wallets-breakdown/:companyId` | autenticado (interno) |
| GET | `/api/loan/:id/detail` | staff (dossiê do crédito: pagamentos + recibos + totais) |
| POST | `/api/recibos/gerar/:tranzactionId` | staff |
| GET | `/api/recibos/:id` · `/:id/pdf` (`?regenerate=1` re-imprime) · `/loan/:loanId` · `/customer/:customerId` | staff |
| GET | `/api/recibos/validar?rec=…&hash=…` | público (QR Code) |
| GET | `/api/partner/profile` · `/dashboard` · `/loans` · `/installments` · `/mora` · `/transactions` · `/statement[/excel]` · `/recibos[/:id/pdf]` | Parceiro (perfil 4) |
| GET | `/api/portal/:companyId/:customerId/payments/:tranzactionId/recibo/pdf` | portal do mutuário (valida o pagamento do cliente) |

---

## 7. Notas e pendências

### Base de dados de trabalho — sincronização com os dados reais (25/09/2026)

A aplicação corre sobre `mbr_microcredito`, que foi **sincronizada com os dados reais de `microcredito`** (a base real foi apenas lida):

- **Recarregado** (clientes, créditos, prestações, pagamentos, caixa, banco, documentos, garantias, registos): `scripts/sync-real-data.js` — corre primeiro em modo de ensaio e só aplica com `--executar`.
- **Preservado**: carteiras de financiamento, taxas de juro, utilizadores (inclui o parceiro KMAD do portal), empresas e contas bancárias. As contas mantêm os registos da app mas passaram a usar os **saldos reais**.
- **Empresa 36** passa a ter a identidade real: *MBR Microcrédito* · microcreditombr@gmail.com · mbr.co.mz. O logotipo antigo ficou (o ficheiro do logotipo real não existe neste servidor).
- **Recibos**: o recibo de teste e o seu PDF/QR foram apagados e a **sequência AT foi reposta em 0** — a série `REC-2026` começa em `00001` com o primeiro recibo real.
- **Backup**: `scripts/backup-db.js` (estrutura + dados, sem depender do `mysqldump`); o estado anterior está em `database/backups/`.
- **Atenção — ficheiros**: os 24 documentos de cliente e as garantias vieram da base real mas os respectivos ficheiros de `uploads/documents/` **não existem neste servidor** (é preciso copiar a pasta `uploads` da máquina que corre a base real, senão os links abrem em vazio).
- Os créditos entraram todos **sem carteira** (`walletId` NULL) — **11 de 12 já foram classificados** pela regra taxa → carteira (*Carteiras de Financiamento → Classificar créditos antigos*, secção 3.2.1): **KMAD 7 créditos · 1 920 000,00 MT** e **INT_8 4 créditos · 104 150,00 MT**. Restou o **crédito 62** (90 000 MT, taxa 9% — ambígua entre MBR_09 *Moamba - Comunidades* e KMAD *Larde e Moma - PMEs*): fica sem carteira até decisão manual no mesmo diálogo.
- **Portal do parceiro (correcção 25/09)**: o KPI `juros pendentes` do `/api/partner/dashboard` passou a mostrar a **previsão de lucro** (juros previstos − juros recebidos; 114 363,55 MT na carteira KMAD), em vez do saldo devedor total; `saldo a receber` continua a somar capital + juros. Os ecrãs multiplicam `utilizacao` por 100 (fracção → %).

- **Taxas antigas**: ligadas automaticamente à origem do capital mais provável (ver 3.3) e sempre editáveis. Uma taxa deliberadamente deixada como *Sem vinculação* nunca volta a ser ligada automaticamente (o backfill só corre em empresas sem qualquer taxa vinculada).
- **`interest_rates.accountId`**: uma taxa pode pertencer a uma carteira analítica (`walletId`) **ou** a uma conta de desembolso real (`accountId`) — nunca às duas; a validação é do controlador.
- **Contas Bancárias** (`/bank-accounts`): página modernizada com totais (bancos, mobile money, disponível para desembolsos, total real), pesquisa e filtro por finalidade, cartões com badge da finalidade, saldo com indicador de tendência e acções *Extrato*/*Editar*.
- **E-mail de relatórios** usa o SMTP já existente (`EMAIL_USER` / `EMAIL_SECRET` no `.env`), como o envio de credenciais. Sem essas variáveis o envio devolve erro de configuração.
- Os PDFs em `uploads/docs` são servidos pela pasta estática de uploads (mesmo comportamento dos contratos já existentes) — se for necessário, pode passar a servir-se só com autenticação.
- KPIs de "mora" usam a mesma regra de cálculo dos juros de mora do relatório oficial (`installmentPanification`), com o `forfeit` da empresa.
- O portal do mutuário segue o padrão já existente das suas rotas (`/api/portal/*` identificadas por empresa/cliente): a rota do recibo valida que o pagamento pertence ao cliente e à empresa do caminho. Se quiser, pode passar a exigir token de mutuário em todas as rotas do portal.
