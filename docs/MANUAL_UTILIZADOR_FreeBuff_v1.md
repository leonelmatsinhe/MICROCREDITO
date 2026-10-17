# MANUAL DO UTILIZADOR - FreeBuff Microcrédito
Versão 1.1 - Instalação **single-tenant** (uma instituição por instalação);
actualizado com o **Painel de Financiadores e as suas carteiras** (secção 3.14).

> **Como este manual foi feito:** este documento foi escrito a partir da leitura
> integral do código-fonte do sistema (rotas da API, controladores, modelos,
> migrações, regras de negócio e ecrãs do frontend). Só está descrito aqui o que
> **já existe e está funcional**. Onde a funcionalidade existe apenas em parte,
> está marcado **[Em desenvolvimento]**. No fim do manual (secção 5) está a lista
> honesta do que o sistema **ainda não faz**.
>
> Âmbito: dois perfis — **GESTOR DE CRÉDITO** e **ADMIN DA MICROCRÉDITO**.

---

## 1. Introdução

### 1.1 O que é o sistema e para que serve

O **FreeBuff Microcrédito** (na instalação do cliente aparece com o nome
comercial **Mais Mola**) é uma plataforma web que gere **todo o ciclo do
microcrédito** numa instituição de microfinanças em Moçambique:

1. **Cadastro do mutuário** (pessoa física ou empresa) com documentos de KYC;
2. **Simulação** do plano de pagamento (prestação, juros, total a pagar);
3. **Pedido de crédito** e análise de **capacidade de pagamento**;
4. **Aprovação e desembolso** com origem do capital identificada
   (carteira de financiamento + conta real de onde o dinheiro sai);
5. **Registo de garantias** (as garantias têm de cobrir o valor do crédito + juros);
6. **Plano de amortização** (sistema francês / Price) gerado automaticamente;
7. **Registo de pagamentos** (total, parcial ou com desconto), **recebimentos
   por conta** (banco, mobile money, caixa) e **liquidação total** de uma só vez;
8. **Cálculo automático de mora** (juros de atraso) por dia de atraso;
9. **Recibos legais** com numeração sequencial por ano (formato `REC-AAAA-00001`),
   com hash de segurança e página pública de validação por QR Code;
10. **Controlo de caixa diário** (abertura, movimentos, fecho do dia);
11. **Relatórios**: relatório para o **Banco de Moçambique**, relatórios por
    **carteira de financiamento/parceiro**, exportações em PDF e Excel;
12. **Portal do Mutuário** (o próprio cliente consulta créditos, prestações e
    registra pedidos de pagamento) e **Portal do Parceiro Financiador**.

> **Instalação single-tenant — uma instituição por instalação.** Cada cópia do
> sistema pertence a **uma única instituição** (a "empresa" do sistema = a sua
> microcrédito). Todos os dados — mutuários, créditos, pagamentos, caixa,
> carteiras, relatórios — são dessa instituição e de mais nenhuma. O código
> mantém o isolamento de dados por empresa como defesa extra (herança do
> desenho original), mas numa instalação single-tenant existe **exactamente uma
> empresa**, já activa: não há selecção de empresa, nem troca de contexto, nem
> dados de outra instituição em qualquer ecrã deste manual.

### 1.2 Perfis de acesso

O sistema usa perfis numerados internamente. Os dois perfis deste manual são:

| Perfil (código) | Nome no sistema | Em uma frase |
|---|---|---|
| **1** | **Administrador (ADMIN)** | Tem acesso a tudo dentro da empresa: configurações, utilizadores, caixa, taxas, carteiras, relatórios e auditoria. |
| **3** | **Gestor de Crédito** | Trabalha a carteira de crédito: cadastra e acompanha mutuários, cria documentos KYC, simula, submete pedidos, analisa e aprova/rejeita créditos, acompanha prestações, mora e garantias. **Não tem acesso ao módulo Financeiro** (Caixa, Caixa Central, Histórico de Caixa) — exclusivo do Administrador, também no backend. |

Existem ainda outros perfis que **não** são tratados neste manual:
**0 = Super Admin** (administra a plataforma e aprova novas empresas),
**2 = Operador** (perfil intermédio, acesso parecido com o do Gestor, sem
poderes de administração) e **4 = Parceiro Financiador** (entra no *Portal do
Financiador* e só vê a sua própria carteira — ver 3.14).

> **Nota single-tenant:** numa instalação single-tenant existe apenas uma
> empresa (a sua) e não há aprovação de novas empresas nem troca de
> instituição. O perfil Super Admin mantém-se apenas como perfil técnico de
> manutenção da plataforma (ver 3.15).

### 1.3 Como acessar

**Endereço (URL)**
- Instalação local/servidor da instituição: `http://<endereço-do-servidor>:4000`
  (a porta por defeito é **4000**).
- Instalação alojada: o endereço público da instituição
  (por exemplo `https://maismola.co.mz`). O endereço público é configurado na
  instalação, na variável `PUBLIC_BASE_URL`.
- A página inicial do endereço **é o ecrã de Login**.

**Login do pessoal (ADMIN e GESTOR)**
1. Abra o endereço do sistema no navegador (Chrome, Edge ou Firefox actualizados).
2. No cartão **"Bem-vindo — Aceda com as suas credenciais de equipa"**, preencha:
   - **E-mail ou nº de telemóvel** — o e-mail (ou telefone) com que o ADMIN criou a sua conta;
   - **Senha**.
3. Clique em **Entrar**.
4. O sistema encaminha-o automaticamente para o painel do seu perfil:
   - ADMIN → **Painel** (`/dashboard`);
   - GESTOR → **Painel do Gestor** (`/gestor`).

[SCREENSHOT: Ecrã de login com o cartão "Bem-vindo", campos E-mail/telefone e Senha, e o botão Entrar]

**Notas importantes sobre o login**
- A senha é **sensível a maiúsculas e minúsculas**; os espaços antes e depois
  são removidos automaticamente.
- Quando o ADMIN cria um membro da equipa **sem indicar senha**, a senha inicial
  é **`123456`**. O sistema **não obriga** à troca no primeiro acesso — por
  isso, recomendamos que cada pessoa mude a senha no primeiro dia (ver 1.4).
- Se a mensagem for *"Credenciais inválidas"*, confirme o e-mail/telefone e a
  senha com o ADMIN da sua instituição.

### 1.4 Recuperar / alterar a senha

**Não existe recuperação automática de senha** (não há link "Esqueci-me da
senha", nem envio de e-mail de reposição). Na prática, há **dois caminhos**:

**Caminho A — o próprio utilizador altera a senha (recomendado)**
1. Depois de entrar, clique no seu **avatar/nome** no canto superior direito → **Perfil**.
2. No cartão **"Alterar Senha"**, preencha: **Senha Actual**, **Nova Senha** e **Confirmar Senha**.
3. Clique em **Alterar Senha**.

[SCREENSHOT: Página de Perfil com o cartão Alterar Senha (Senha Actual, Nova Senha, Confirmar Senha)]

**Caminho B — o ADMIN repõe a senha**
1. ADMIN: menu **Sistema → Equipa e Parceiros**.
2. No cartão do utilizador, clique no ícone **Repor senha** (chave com seta) →
   confirmar **Repor**.
3. A senha fica novamente **`123456`** e o utilizador muda-a em seguida (Caminho A).

**Ainda existe uma terceira via, por SMS:** o ADMIN pode clicar em **Enviar
credenciais** no cartão do utilizador e o sistema envia por SMS/WhatsApp um
acesso ao utilizador (depende do serviço de SMS estar autorizado — ver 3.10).

### 1.5 Regras gerais que valem para os dois perfis

Estas regras são aplicadas pelo próprio sistema (não podem ser contornadas):

| Regra | O que significa na prática |
|---|---|
| **KYC obrigatório** | Nenhum crédito é criado nem desembolsado sem os **3 documentos base**: BI/Passaporte, NUIT e Comprovativo de rendimentos. |
| **Capacidade de pagamento (regra de 1/3)** | A prestação mensal não deve exceder **1/3 do rendimento mensal** declarado do mutuário. Se exceder, o sistema exige um **parecer escrito**. |
| **Garantias cobrem o crédito** | O valor total das garantias tem de ser **igual ou superior ao total a pagar do crédito (capital + juros)**. Sem isso, a aprovação é bloqueada. |
| **Caixa do dia aberto** | Toda operação que movimenta dinheiro (desembolso, pagamento, liquidação) exige que **o utilizador que a executa** tenha o **caixa do dia aberto**. Este ponto é crítico para o Gestor — ver 2.8 e 5.1. |
| **Mora diária** | A mora é calculada por dia de atraso sobre o **saldo em falta da prestação** e é sempre recalculada no servidor. |
| **Sem duplicar pagamentos** | Cada pagamento tem uma **referência única** por método/empresa; referências repetidas são recusadas. |
| **Rasto do sistema** | As ações relevantes ficam registadas no **Histórico** (auditoria) com utilizador, data/hora e IP. |

**Consegues fazer isto sozinho? (secção 1)**
- [ ] Sei o endereço do sistema e consigo chegar ao ecrã de login.
- [ ] Consigo entrar com o meu e-mail/telefone e a minha senha.
- [ ] Sei onde alterar a minha senha (avatar → Perfil → Alterar Senha).
- [ ] Sei que, se me esquecer da senha, tenho de pedir ao ADMIN a reposição.
- [ ] Entendo as 5 regras de ouro da tabela acima.

---

## 2. Perfil GESTOR DE CRÉDITO - Guia completo sem formação

### 2.0 O que vejo no menu lateral

Depois de entrar, o Gestor encontra o menu lateral organizado em dois grupos —
sem secção Microcrédito e **sem módulo Financeiro** (Caixa, Caixa Central e
Histórico de Caixa são exclusivos do Administrador, inclusive as consultas):

| Grupo | Item | Para onde leva |
|---|---|---|
| **Geral** | Painel | Painel do Gestor (`/gestor`) — o seu ecrã de trabalho diário |
| **Gestão de Crédito** | Mutuários | Lista e ficha dos mutuários |
| **Gestão de Crédito** | Créditos | Lista de créditos: Pendentes, Desembolsados, Terminados, Rejeitados |
| **Gestão de Crédito** | Controle Prestações | **[Em desenvolvimento para o Gestor]** — este item redirecciona para o Painel do Gestor, porque o ecrã completo de "Controle Prestações" está reservado ao Administrador. Use o Painel do Gestor (2.1), que apresenta exactamente a mesma grelha de prestações. |

Dicas de navegação:
- No topo do menu há uma **caixa "Buscar menu…"** — escreva parte do nome do
  ecrã (ex.: `mutu`) para filtrar os itens. Atalho: **Ctrl + K** (ou **⌘ + K**).
- Cada item tem uma **estrela**; carregue na estrela para o guardar em
  **Favoritos** (aparece no topo do menu).
- O botão **menu_open** no cimo do menu alterna entre o menu completo e o modo
  só ícones.

[SCREENSHOT: Menu lateral do Gestor de Crédito com os grupos Geral e Gestão de Crédito]

---

### 2.1 Painel do Gestor — o seu ecrã principal

**Objetivo da tela.** Dar-lhe, num só ecrã: os números-chave das prestações, a
lista dos **pedidos de crédito por aprovar** e a **grelha completa de prestações**
de todos os créditos da empresa (com mora, estado e alertas).

[SCREENSHOT: Painel do Gestor com os 4 cartões KPI, o cartão "Pedidos de Crédito por Aprovar" e a tabela de Prestações]

**Passo-a-passo**

1. No menu lateral, clique em **Geral → Painel**.
2. Leia os **4 cartões KPI** no topo:
   - **Total Prestações** — quantas prestações existem (créditos activos e terminados);
   - **Pagas** — prestações já liquidadas;
   - **Pendentes** — prestações por pagar;
   - **Em Atraso** — prestações cuja data de vencimento já passou e ainda não estão pagas.
3. Se houver pedidos por analisar, aparece o cartão laranja
   **"Pedidos de Crédito por Aprovar"** com a lista (mutuário, conta, valor,
   meses e data). **Clique numa linha** para abrir a ficha do mutuário, onde
   aprova ou rejeita (ver 2.7).
4. Use a **grelha de Prestações** para o acompanhamento diário. Colunas:
   - **Mutuário** (nome + nº de conta);
   - **Prestação** (valor da prestação);
   - **Vencimento** (data);
   - **Observações** — mostra `Liquidado`, `N dias vencido`, `N dias pra vencer` ou `Vence hoje`;
   - **Mora** (juros de atraso a pagar);
   - **Total a Pagar** (prestação + mora).
5. Para cada linha, os três botões à direita são:
   - **SMS** — **[Em desenvolvimento]** (mostra a mensagem "Enviado SMS… Em desenvolvimento");
   - **WhatsApp** — **[Em desenvolvimento]**;
   - **olho (Ver detalhes)** — abre o painel lateral de detalhes da prestação
     (prestação, pago, vencimento, estado, mora, total) com os mesmos botões de SMS/WhatsApp.

> **Como enviar mensagens ao mutuário hoje:** use o **sino de alertas** no topo
> (navbar) ou, no fluxo de pedido, os botões **Solicitar documentos** /
> **Rejeitar** que abrem o envio de SMS pelo sistema. Os botões SMS/WhatsApp
> desta grelha estão preparados mas ainda não ligados ao envio real.

**Filtros e exportação**
1. **Estado**: Pendente / Pago / Pago Parcial.
2. **Pesquisar mutuário**: nome ou número de conta.
3. **De / Até**: intervalo de datas de vencimento.
4. **Sincronizar** (ícone circular): recarrega os dados do servidor.
5. **Limpar filtros** (ícone borracha): volta a mostrar tudo.
6. **Baixar PDF**: gera um **relatório PDF de prestações por vencimento**,
   agrupado por mês, com totais de mora e total a pagar no fim. Se não houver
   linhas, o botão fica desactivado.

**O que acontece depois de clicar em Baixar PDF.** O ficheiro é gerado no
servidor e descarregado pelo navegador (nome do ficheiro:
`prestacoes-por-vencimento`).

**Erros comuns e como resolver**
- *"Erro ao carregar prestações"* → carregue em **Sincronizar**; se persistir,
  verifique se tem ligação à rede e comunique ao ADMIN.
- *"Sem dados para exportar"* → tem filtros activos que não devolvem linhas;
  clique em **Limpar filtros**.
- Grelha vazia → pode não haver créditos desembolsados na empresa (normal em
  instalações novas).

**Dica prática.** Antes de começar o dia, ordene a tabela por **Vencimento**
(carregue no título da coluna) e ordene por **Mora** descendente para atacar
primeiro os casos com atraso mais caro.

**Consegues fazer isto sozinho?**
- [ ] Sei abrir o Painel do Gestor pelo menu.
- [ ] Sei ler os 4 KPIs e o que cada um significa.
- [ ] Sei identificar um pedido pendente e abrir a ficha do mutuário a partir dele.
- [ ] Sei filtrar prestações por estado e por datas.
- [ ] Sei gerar e guardar o PDF de prestações por vencimento.
- [ ] Sei que os botões SMS/WhatsApp desta grelha ainda não enviam mensagens.

---

### 2.2 Mutuários — lista e cadastro (KYC)

**Objetivo da tela.** Registar novos mutuários (pessoa física ou empresa) e
encontrar rapidamente qualquer mutuário existente.

[SCREENSHOT: Página Mutuários com a barra de pesquisa, os botões Exportar PDF/Excel/Novo mutuário e a lista de cartões]

**Passo-a-passo — encontrar um mutuário**
1. Menu lateral → **Gestão de Crédito → Mutuários**.
2. Escreva na **caixa de pesquisa** (nome, telefone ou nº de conta) e clique no
   ícone de **pesquisa** (ou prima Enter).
3. Para limpar, clique no **X** da caixa.
4. Em cada cartão/linha tem três acções:
   - **olho** → abrir a ficha completa do mutuário;
   - **lápis (Editar)** → abrir o formulário para corrigir dados;
   - **caixote (Eliminar)** → apagar o mutuário (confirmação obrigatória).

> **Atenção:** o botão **Eliminar** está bloqueado para o perfil Gestor por
> defeito. Se precisar realmente de eliminar um mutuário, peça ao ADMIN.

**Passo-a-passo — criar um Novo Mutuário (Pessoa Física, "PF")**
1. Clique em **Novo mutuário** (canto superior direito).
2. Escolha o **Tipo de Mutuário**: **Pessoa Física**.
3. **Dados Pessoais**:
   - **Nome Completo** — *obrigatório*;
   - **Género**, **Estado Civil** — opcionais (a lista de estados civis inclui
     solteiro/casado/união de facto; se escolher casado ou união de facto
     aparecem automaticamente os campos do cônjuge);
   - **NUIT** — opcional, mas se preencher tem de ter **exactamente 9 dígitos**;
   - **Bilhete de Identidade** — opcional e **sem validação de formato**: o
     sistema aceita o número tal como está no documento, sem exigir um número
     fixo de dígitos ou de caracteres (BI novo, BI antigo, passaporte, carta de
     condução ou documento estrangeiro). Escreva-o exactamente como aparece no
     documento — a conferência é feita depois, sobre o ficheiro carregado (2.4),
     e não pelo formato do número;
   - **Data de Emissão** — não pode ser futura;
   - **Local de Emissão**;
   - **Data de Nascimento** — o mutuário tem de ter **pelo menos 18 anos** e a
     data não pode ser futura;
   - **Local de Nascimento**.
4. **Contacto**:
   - **Telefone** — *obrigatório* (é por aqui que o mutuário entra no Portal do
     Mutuário e recebe SMS);
   - **Email** — opcional, mas se preencher tem de ser único.
5. **Profissão e Rendimento**:
   - **Profissão**, **Local de Trabalho**;
   - **Rendimento Mensal** — **preencha sempre**: é este valor que determina a
     capacidade de pagamento (1/3). Sem rendimento preenchido, o sistema não
     consegue validar o limite de 1/3.
6. **Morada**: **Endereço** e **Bairro**.
7. **Cônjuge** (se casado/união de facto): Nome e Contacto.
8. **Contacto de Emergência**: Pessoa de Referência e Contacto de Emergência.
9. No fim do formulário tem dois interruptores:
   - **Pessoa Politicamente Exposta** — ligue se o cliente for PPE (obrigação de
     controlo reforçado);
   - **Mutuário Activo** — deixa o mutuário activo (por defeito ligado).
10. Clique em **Criar Mutuário**.

**Passo-a-passo — criar um Novo Mutuário (Empresa, "PJ")**
1. Clique em **Novo mutuário** → escolha **Empresa**.
2. Preencha (campos obrigatórios assinalados com `*`):
   - **Nome da Empresa** **;
   - **NUIT da Empresa** ** (9 dígitos);
   - **Nº do Alvará** **;
   - **Actividade Principal** **;
   - **Rendimentos Mensais (MZN)** **;
   - **Endereço** **;
   - **Telefone** ** (e-mail opcional);
   - **Representante Legal** **, **BI/Passaporte do Representante** **,
     **Data Validade BI** **, Local de Emissão.
3. Ajuste os interruptores **Pessoa Politicamente Exposta** e **Mutuário Activo**
   se necessário.
4. Clique em **Criar Mutuário**.

**O que acontece depois de clicar em Guardar**
- O sistema **cria o mutuário** e atribui-lhe automaticamente um **número de
  conta sequencial** (a numeração começa em `100` e segue `101`, `102`…, dentro
  da sua empresa). Anote esse número — é a chave de tudo no sistema.
- É gerada uma **senha temporária aleatória** para o Portal do Mutuário. A senha
  é mostrada **uma única vez**, ao funcionário que fez o cadastro, para entrega
  ao cliente (por SMS, WhatsApp ou em mão). Mais tarde pode sempre enviar novas
  credenciais pela ficha do mutuário (ver 2.4).
- O mutuário fica **Activo**.

**Erros comuns e como resolver**
| Mensagem | Causa | Solução |
|---|---|---|
| *"Já existe um mutuário com este telefone, email, NUIT ou BI."* | Duplicação de identificação | Pesquise o mutuário na lista; se não o encontrar, corrija o campo repetido (ex.: outro telefone). |
| *"NUIT inválido: deve conter exactamente 9 dígitos numéricos."* | NUIT com letras/espaços ou menos de 9 dígitos | Escreva só os 9 dígitos. |

> **Nota sobre o BI/passaporte:** não existe mensagem de *"BI inválido"*. O
> número do documento de identificação **não é validado** quanto ao número de
> dígitos ou de caracteres — o sistema aceita-o tal como o escrever. A
> responsabilidade de conferir o número é da instituição, sobre o documento
> carregado em **2.4**.
| *"O mutuário deve ter pelo menos 18 anos."* | Data de nascimento demasiado recente | Verifique a data de nascimento. |
| *"A data de emissão não pode ser futura."* | Data de emissão errada | Corrija a data. |
| *"Nome é obrigatório"* / *"Telefone é obrigatório"* | Campos vazios | Preencha os campos com `*`. |

**Dica prática.** Cadastre **sempre o Rendimento Mensal** e **NUIT** logo no
primeiro cadastro. Evita voltar atrás e, acima de tudo, evita bloqueios na
simulação e na aprovação do crédito. Aproveite também para carregar os
documentos KYC no mesmo momento (2.4).

**Exportar a lista**
- **Exportar PDF** e **Exportar Excel** geram o ficheiro com as colunas visíveis
  (na lista filtrada). Para o Gestor, estas exportações de grelha estão
  disponíveis na página de Mutuários.

**Consegues fazer isto sozinho?**
- [ ] Sei pesquisar um mutuário por nome, telefone ou conta.
- [ ] Sei cadastrar uma Pessoa Física com todos os campos obrigatórios.
- [ ] Sei cadastrar uma Empresa (PJ) com alvará e representante legal.
- [ ] Entendo que o nº de conta é gerado pelo sistema e sei onde o ver.
- [ ] Sei explicar ao cliente como vai receber a senha do Portal.
- [ ] Sei resolver os erros de duplicação e de NUIT (o BI não tem formato
      validado — qualquer número é aceite).

---

### 2.3 Ficha do Mutuário (visão geral e acções rápidas)

**Objetivo da tela.** Ser o centro de trabalho do mutuário: cabeçalho com os
números essenciais e seis abas de trabalho.

[SCREENSHOT: Ficha do Mutuário com o cabeçalho verde (nome, conta, telefone, KPIs) e as seis abas]

1. Abra a ficha por **Mutuários → olho**, ou a partir do Painel do Gestor.
2. No cabeçalho, além do nome, conta e telefone, tem quatro indicadores:
   - **Rendimento** — rendimento mensal declarado;
   - **Total Dívida** — quanto o mutuário deve neste momento;
   - **Capacidade Disp.** — quanto ainda cabe na regra de 1/3 do rendimento;
   - **KYC** — **Completo** (verde) ou **Incompleto** (vermelho).
3. Botões do cabeçalho:
   - **Editar** (lápis) → abre o mesmo formulário do cadastro (2.2);
   - **Enviar Credenciais** (cadeado) → gera uma nova senha e envia ao cliente
     por **SMS** ou **WhatsApp** (escolha o canal no diálogo). O envio por SMS
     só funciona se o serviço de SMS estiver autorizado pela empresa; caso
     contrário aparece o aviso *"SMS indisponível"*.
4. As seis abas são: **Visão Geral**, **Créditos**, **Plano de Amortização**,
   **Documentos & KYC**, **Documentos Legais** e **Garantias & Recibos**.
   A aba **Documentos & KYC** mostra um ponto de exclamação vermelho enquanto a
   checklist KYC estiver incompleta.

**Erros comuns**
- *"Mutuário não encontrado"* → o número de conta do link não existe; volte à
  lista (**Voltar à lista**).
- *"O mutuário não tem telefone registado"* → não é possível enviar credenciais;
  edite o mutuário e acrescente o telefone.

**Dica prática.** Comece sempre pela aba **Visão Geral** e depois vá a
**Documentos & KYC**. É ali que decide se pode avançar com um crédito.

**Consegues fazer isto sozinho?**
- [ ] Sei abrir a ficha de um mutuário e ler os 4 indicadores do cabeçalho.
- [ ] Sei editar os dados de um mutuário.
- [ ] Sei enviar credenciais de acesso ao cliente por SMS ou WhatsApp.
- [ ] Sei navegar pelas seis abas e sei para que serve cada uma.

---

### 2.4 Documentos & KYC — a checklist obrigatória

**Objetivo da tela.** Reunir e verificar os documentos do mutuário. **Sem os
três documentos base o sistema não deixa criar nem desembolsar crédito.**

[SCREENSHOT: Aba Documentos & KYC com a faixa de estado, os 6 cartões da checklist e o formulário de carregamento]

**A checklist tem 6 tipos de documento:**

| Documento | Tipo | Bloqueia o crédito? |
|---|---|---|
| **BI / Passaporte / Carta de condução** | Base | **Sim** |
| **NUIT** | Base | **Sim** |
| **Comprovativo de rendimentos** | Base | **Sim** |
| Declaração do bairro | Extra | Não (recomendado) |
| Foto tipo passe | Extra | Não (recomendado) |
| Contrato autenticado | Extra | Não |

**Passo-a-passo — carregar um documento**
1. Abra a ficha do mutuário → aba **Documentos & KYC**.
2. Na faixa do topo leia o estado: *"KYC completo — desembolso habilitado"* ou
   *"KYC incompleto — desembolso bloqueado"*, com a lista dos documentos em falta.
3. No cartão **"Carregar documento"**:
   - **Tipo de documento *** — escolha um dos 6 tipos da lista;
   - **Ficheiro *** — escolha o ficheiro (**PDF, JPG ou PNG**, **máximo 5 MB**);
4. Clique em **Enviar**.
5. O documento aparece imediatamente na lista **"Documentos enviados"** e o
   cartão correspondente da checklist passa a verde. O aviso do topo actualiza
   automaticamente.

**Acções em cada documento já enviado**
- **Abrir** (seta) — abre o ficheiro numa nova janela.
- **Eliminar** (caixote) — apaga o documento, com confirmação
  (*"Isto pode tornar o KYC incompleto"*).

**Erros comuns e como resolver**
| Mensagem | Causa | Solução |
|---|---|---|
| *"Ficheiro excede 5MB"* | Ficheiro demasiado grande | Comprima a imagem ou peça uma digitalização de menor qualidade. |
| *"Escolha o tipo"* / *"Escolha o ficheiro"* | Campos vazios | Escolha o tipo **e** o ficheiro. |
| O crédito não avança e aparece *"Checklist KYC incompleta"* | Falta um dos 3 base | Carregue exactamente os 3 documentos base (nomes iguais aos da lista). |
| *"Erro ao salvar documento"* | Formato não aceite | Confirme que é PDF, JPG ou PNG. |

**Dica prática.** Peça ao cliente, logo no balcão, os três base juntos
(BI, NUIT e comprovativo de rendimentos). São **3 minutos de trabalho** que
poupam **3 dias de bloqueio** na altura do desembolso.

**Consegues fazer isto sozinho?**
- [ ] Sei quais são os 3 documentos que bloqueiam o crédito.
- [ ] Sei carregar um documento com o tipo correcto e ficheiro válido.
- [ ] Sei ver/abrir e eliminar um documento carregado por engano.
- [ ] Sei confirmar que o KYC ficou "Completo" antes de avançar.

---

### 2.5 Simulação de Crédito

**Objetivo da tela.** Calcular, **antes do pedido**, qual será a prestação
mensal, os juros totais e o total a pagar, e verificar se a prestação cabe na
capacidade de pagamento do mutuário.

[SCREENSHOT: Cartão "Simulação de Crédito" com Montante, Nº de prestações, Taxa de juros e o botão Simular]

**Passo-a-passo**
1. Abra a ficha do mutuário → aba **Créditos**.
2. No cartão **Simulação de Crédito**, preencha:
   - **Montante (MZN)** — *obrigatório*, maior que zero;
   - **Nº de prestações** — *obrigatório*, de **1 a 18** na lista (o motor do
     sistema aceita até 60, mas o ecrã oferece 1 a 18);
   - **Taxa de juros** — *obrigatória*; a lista mostra as **taxas/planos
     configurados para a empresa** com o formato `X,X% a.m. (Y% a.a.)`.
3. Clique em **Simular**.
4. Abre-se a janela **"Plano de Amortização — Simulação"** com:
   - quatro resumos: **Capital**, **Taxa**, **Prestações (nº)** e **Total a pagar**;
   - uma faixa verde **"Dentro da capacidade"** ou laranja **"Prestação acima da capacidade"**, com o valor da prestação e o limite (1/3 do rendimento);
   - a **tabela completa** do plano: Ordem, Amortização, Juros, Prestação, Saldo e Vencimento.
5. Se a barra colorida acima da tabela aparecer, leia-a: verde (abaixo de 60% da
   capacidade), amarela (entre 60% e 100%) ou vermelha (acima de 100%).

**O que acontece depois de clicar em Simular.** Nada é gravado no crédito do
cliente: a simulação é apenas um cálculo. Só o **Pedido de Crédito** (2.6)
regista algo.

**Erros comuns e como resolver**
| Mensagem | Causa | Solução |
|---|---|---|
| *"Preencha montante, prazo e taxa"* | Falta um dos três campos ou a taxa é 0 | Preencha os três campos com valores válidos. |
| *"O número de prestações deve estar entre 1 e 60"* | Prazo fora do intervalo | Escolha entre 1 e 60 meses. |
| *"Erro ao simular"* | Problema de ligação ao servidor | Tente novamente; se persistir, comunique ao ADMIN. |
| Lista de taxas vazia | A empresa não tem taxas configuradas | Peça ao ADMIN para criar taxas em **Financiamento → Taxas de Juro**. |

**Dica prática.** Na simulação, teste **dois cenários** (por exemplo 6 e 12
meses) e mostre ao cliente o **Total a pagar** dos dois. O cliente entende
rapidamente o custo do prazo maior.

**Consegues fazer isto sozinho?**
- [ ] Sei onde está a simulação (ficha do mutuário → Créditos).
- [ ] Sei preencher montante, prazo e taxa e clicar em Simular.
- [ ] Sei interpretar as cores da barra de capacidade.
- [ ] Sei ler o plano simulado e explicá-lo ao cliente.

---

### 2.6 Pedido de Crédito (submissão)

**Objetivo da tela.** Transformar a simulação num **pedido formal** que entra na
fila de aprovação com o valor, prazo, taxa, finalidade, data e gestor
responsável.

Dentro da janela da simulação (2.5), desça até à secção **"Submissão do Crédito"**.

**Campos obrigatórios**
| Campo | Como preencher |
|---|---|
| **Finalidade do crédito *** | Escolha na lista (Comércio, Criação de animais, Educação, Habitação, Negócio, Saúde, Transporte, Outro) ou escreva. O sistema exige mínimo de 1 carácter. |
| **Data *** | Data do pedido/crédito; **não pode ser futura**. Por defeito vem a data de hoje. |
| **Gestor *** | Gestor responsável pelo crédito. A lista mostra Admins e Gestores; vem pré-seleccionado você próprio. |

Os valores **Montante**, **Nº de prestações** e **Taxa** vêm da simulação feita
acima.

**Passo-a-passo**
1. Preencha os três campos obrigatórios.
2. Clique em **Submeter Crédito** (fica verde quando os dados estiverem completos
   e o KYC estiver completo).
3. Confirme a mensagem verde **"Crédito submetido com sucesso"**.
4. O pedido nasce no estado **Pendente** e passa a aparecer no **Painel do
   Gestor** (cartão "Pedidos de Crédito por Aprovar") e na página **Créditos →
   aba Pendentes**.
5. O ADMIN recebe automaticamente uma **notificação** de nova solicitação de crédito.

**Caso especial — prestação acima de 1/3 do rendimento**
1. Se a prestação exceder o limite de 1/3, ao clicar em **Submeter Crédito**
   abre automaticamente o diálogo vermelho **"Excesso de Capacidade — Parecer
   Obrigatório"**.
2. Preencha obrigatoriamente:
   - **Motivo do excesso *** — lista de motivos (Rendimento comprovado
     adicional; Comerciante com fluxo de caixa sazonal; Histórico de crédito
     anterior sem incumprimento; Garantia adicional apresentada; Outro);
   - **Parecer / justificativa *** — **mínimo 50 caracteres** (o contador no
     ecrã indica quantos faltam);
   - **Parecer em PDF *** — anexe o documento (obrigatório).
3. Clique em **Confirmar e Submeter**.
4. O sistema envia o pedido com o parecer anexado. O pedido aparece em Pendentes
   com o parecer registado no crédito e a justificação é enviada aos
   administradores e ao gestor responsável.

**Erros comuns e como resolver**
| Mensagem | Causa | Solução |
|---|---|---|
| Botão *Submeter* cinzento | Falta finalidade, data, gestor, ou o KYC está incompleto | Complete os campos obrigatórios e resolva o KYC (2.4). |
| *"Desembolso bloqueado — checklist KYC incompleta. Documentos em falta: …"* | Faltam documentos base | Carregue os documentos indicados na mensagem. |
| *"A prestação excede 1/3 do rendimento mensal. Informe um parecer/observação com no mínimo 10 caracteres."* | Excesso de capacidade sem parecer | Reabra o diálogo de parecer com motivo, justificação (≥50 caracteres) e PDF. |
| *"O gestor de crédito é obrigatório."* | Campo Gestor vazio | Escolha o gestor responsável. |
| *"A finalidade/descrição do crédito é obrigatória."* | Campo Finalidade vazio | Escreva ou escolha a finalidade. |
| *"A data do crédito é obrigatória."* | Data vazia ou em formato inválido | Escolha a data no calendário. |

**O que acontece depois de submeter (resumo técnico do que o sistema faz)**
- É criado o registo do crédito com **estado 0 (Pendente)**;
- O **KYC é verificado outra vez** no servidor (defesa dupla);
- A **regra de 1/3** é recalculada no servidor;
- O **gestor** e os **administradores** recebem notificação.

**Dica prática.** Registe sempre a **finalidade real** do crédito. É este texto
que alimenta os relatórios por sector usados no relatório do Banco de
Moçambique — se escrever "Outro" a toda a hora, os relatórios perdem valor.

**Consegues fazer isto sozinho?**
- [ ] Sei abrir a simulação e submeter um pedido de crédito.
- [ ] Sei preencher finalidade, data e gestor.
- [ ] Sei pedir e anexar um parecer quando a prestação excede 1/3 do rendimento.
- [ ] Sei localizar o pedido submetido em Pendentes.

---

### 2.7 Análise, Aprovação e Desembolso do Crédito

**Objetivo da tela.** Analisar o pedido (documentos e capacidade de pagamento) e
**aprovar com desembolso** ou **rejeitar com parecer**.

#### 2.7.1 Revisão do pedido

[SCREENSHOT: Diálogo "Revisão de Documentos" com foto tipo passe, lista de documentos, resumo do pedido e capacidade de pagamento]

**Passo-a-passo**
1. Menu lateral → **Gestão de Crédito → Créditos**.
2. Clique na aba **Pendentes**.
3. Em cada linha, clique no ícone **fact_check (Revisar documentos e aprovar)**.
4. Analise a janela **"Revisão de Documentos"**:
   - **Fotografia tipo passe** (se o mutuário carregou);
   - **Documentos submetidos** — clique em **ver documento** para abrir cada um. Se não houver nenhum, aparece o aviso laranja *"O mutuário ainda não submeteu documentos"*. O crédito **pode** ser aprovado, mas o KYC no servidor continua a bloquear a criação/desembolso;
   - **Pedido de crédito**: montante solicitado, prazo, finalidade;
   - **Capacidade de pagamento**: rendimento mensal, capacidade (1/3), prestação estimada — com mensagem verde *"Dentro da capacidade de pagamento"* ou vermelha *"A prestação estimada excede 1/3 do rendimento — registe um parecer na aprovação ou rejeite"*.
5. Escolha uma das três acções:
   - **Solicitar documentos** — abre o envio de SMS com uma mensagem já escrita
     a pedir BI/Passaporte, NUIT e Declaração de Bairro;
   - **Rejeitar** — abre o diálogo de rejeição (ver 2.7.4);
   - **Aprovar Crédito** — abre a janela de aprovação (2.7.2).

#### 2.7.2 Janela "Aprovar Crédito" — o passo mais importante

**Atenção:** neste sistema, **aprovar é o mesmo que desembolsar**. A janela gera
o plano de prestações e marca o crédito como **desembolsado (estado 1)** — o
dinheiro sai da conta de origem nesse momento, e o sistema cria os movimentos de
tesouraria e de caixa correspondentes.

[SCREENSHOT: Janela "Aprovar Crédito" com data de desembolso, forma de desembolso, conta de origem, carteira de financiamento, taxa de juro, simulação e taxa administrativa]

**Campos e ordem de preenchimento**

| # | Campo | Obrigatório? | Notas |
|---|---|---|---|
| 1 | **Data de desembolso** | **Sim** | Vem com a data de hoje. É a base do plano: a **1.ª prestação vence 1 mês depois** desta data. |
| 2 | **Forma de desembolso** | **Sim** | `Dinheiro físico (CASH)`, `Transferência bancária`, `M-Pesa` ou `e-Mola`. |
| 3 | **Conta de origem** | **Sim** se a forma **não** for CASH | Só aparecem contas **activas** com finalidade `DESEMBOLSO` ou `MISTO`, com o saldo actual visível. A conta marcada como *default de desembolso* vem pré-selecionada. Com CASH o campo fica bloqueado com "Caixa físico (gaveta)". |
| 4 | **Carteira de financiamento** | **Sim** | Escolha a origem do capital (parceria/fundo). A faixa mostra **Alocado / Desembolsado / Disponível**. Se o valor do crédito exceder o disponível, o desembolso é **bloqueado**. A escolha da taxa sugere automaticamente a carteira ligada a essa taxa. |
| 5 | **Taxa de juro aplicável** | **Sim** | Lista das taxas/planos da empresa. |
| 6 | **Taxa de preparos administrativos** | Condicional | Calculada automaticamente a partir da taxa escolhida, sobre o montante. Pode marcar **"Isento de taxa administrativa"**. Se **não** for isento e o valor for maior que zero, é **obrigatório** indicar a **Conta de entrada da taxa**. |
| 7 | **Parecer / Observações** | Não | Fica registado no crédito. Se o parecer de excesso de capacidade ainda não tiver sido recolhido, é aqui que deve ser escrito. |

Abaixo dos campos, o sistema mostra automaticamente a **simulação com a taxa
escolhida**: **Prestação mensal**, **Juros totais** e **Total a pagar**.

**Passo-a-passo**
1. Confirme a **Data de desembolso**.
2. Escolha a **Forma de desembolso** e, se aplicável, a **Conta de origem**.
3. Escolha a **Carteira de financiamento** e confirme o **Disponível** (faixa verde).
4. Escolha a **Taxa de juro aplicável**. Confira a prestação, os juros totais e o
   total a pagar.
5. Se cobrar taxa administrativa, indique a **Conta de entrada da taxa**.
   Se for isentar, marque **Isento de taxa administrativa**.
6. Escreva o **Parecer / Observações** (recomendado sempre).
7. Clique em **Aprovar Crédito**.
8. Confirme a mensagem verde: *"Crédito aprovado com taxa de X% e plano gerado com
   sucesso"*.
9. O crédito passa da aba **Pendentes** para a aba **Desembolsados**. O plano de
   prestações fica disponível na aba **Plano de Amortização** da ficha do mutuário.

**O que o sistema faz nos bastidores (para entender o que pode falhar)**
- Grava a taxa de juro e a taxa administrativa no crédito;
- Gera o **plano de amortização** (sistema francês/Price) com **uma prestação por mês**;
- Marca o crédito como **desembolsado** e grava a data de desembolso;
- Regista a **saída de dinheiro** (movimento `SAIDA / DESEMBOLSO`) no **caixa do dia**;
- Regista a **entrada da taxa administrativa** na conta escolhida (movimento `ENTRADA / TAXA_ADMIN`);
- Emite o **pacote de documentos legais** (contrato, termo, garantias, plano) com hash e QR Code;
- Coloca um **SMS de desembolso** na fila de envio para o mutuário;
- Cria **notificação** para o cliente ("Crédito aprovado").

**Erros comuns e como resolver**
| Mensagem | Causa | Solução |
|---|---|---|
| *"Abra o caixa do dia para continuar"* (código `CAIXA_FECHADO`) | O **seu** caixa do dia não está aberto | Ver **2.8 — Ponto crítico sobre o caixa**. Na prática, é o ADMIN quem abre o caixa. |
| *"Desembolso bloqueado: checklist KYC incompleta. Documentos em falta: …"* | Falta documento base | Complete o KYC (2.4) e volte a aprovar. |
| *"Indique a conta de entrada da taxa administrativa"* | Taxa cobrada sem conta de destino | Escolha a conta **ou** marque "Isento". |
| *"Saldo insuficiente na conta seleccionada (disponível: … ; necessário: …)"* | A conta de desembolso não tem dinheiro | Transfira fundos para essa conta (Banco) ou escolha outra conta. |
| *"O valor do crédito (…) excede o disponível desta carteira. Desembolso bloqueado"* | Carteira sem saldo analítico | Escolha outra carteira ou aumente o capital alocado (ADMIN). |
| Erro sobre **cobertura de garantias** (valor insuficiente) | As garantias não cobrem capital + juros | Registe mais garantias (2.9) ou ajuste valor/prazo. |
| *"Seleccione uma taxa de juro válida"* / taxa a zero | Escolha de taxa inválida | Escolha uma taxa com valor maior que 0. |
| *"Não existem taxas de juro configuradas para a empresa."* | Sem taxas | Peça ao ADMIN para criar taxas (3.7). |
| *"Sem carteiras configuradas — crie uma em Carteiras Financiamento."* | Sem carteiras de financiamento | Peça ao ADMIN para criar uma carteira (3.6). |

#### 2.7.3 Aprovar directamente no Painel do Gestor

O mesmo fluxo pode começar no **Painel do Gestor**: clique numa linha do cartão
**"Pedidos de Crédito por Aprovar"** → abre a ficha do mutuário → aba **Créditos**
→ ícone verde (**Aprovar / Desembolsar**) no cartão do crédito pendente.
A janela de aprovação é exactamente a mesma descrita em 2.7.2.

#### 2.7.4 Rejeitar um pedido (com parecer)

1. Na aba **Pendentes**, abra **Revisão de Documentos** (ícone `fact_check`).
2. Clique em **Rejeitar**.
3. Escreva o **Parecer / Motivo da rejeição** (até 500 caracteres) — recomendamos
   **nunca** deixar em branco: fica registado no pedido e no histórico.
4. Clique em **Rejeitar Crédito**.
5. O pedido sai de Pendentes e passa para a aba **Rejeitados**. O cliente recebe
   notificação "Crédito rejeitado".

#### 2.7.5 Reabrir um pedido rejeitado

Útil quando o cliente contesta ou aceita um valor/prazo diferente.

1. Vá à aba **Rejeitados**.
2. Clique no ícone **restart_alt (Reabrir pedido)** na linha.
3. No diálogo, edite se necessário:
   - **Valor solicitado (MZN) *** — obrigatório, maior que zero;
   - **Prazo (meses) *** — obrigatório, número inteiro ≥ 1;
   - **Plano / taxa de juro *** — obrigatório; se o pedido anterior já tinha
     taxa, o plano correspondente vem pré-selecionado.
4. Se a prestação estimada **exceder 1/3 do rendimento**, aparece o campo
   **Parecer / observação *** (mínimo **10 caracteres**) — sem ele o botão
   **Reabrir pedido** fica bloqueado.
5. Clique em **Reabrir pedido**.
6. O crédito volta a **Pendentes** com os novos valores, e os administradores e
   o gestor recebem notificação *"Pedido de crédito reaberto"*.

**Erros comuns:** *"Indique o valor solicitado do crédito"*, *"Indique o prazo em
meses"*, *"Seleccione o plano / taxa de juro a aplicar"*, *"Registe um parecer
(mín. 10 caracteres) para reabrir fora da regra de 1/3"* — todos se resolvem
preenchendo o campo indicado. Se não houver planos na lista, o aviso diz
*"Não existem planos de taxa configurados para a empresa"* → pedir ao ADMIN.

#### 2.7.6 Invalidar um desembolso (corrigir um erro)

Serve para **voltar um crédito desembolsado a Pendentes** quando houve um erro
(ex.: dados errados). **Só funciona se ainda não houver nenhum pagamento.**

1. Aba **Desembolsados** → ícone **undo (Invalidar desembolso e voltar a Pendentes)**.
2. Leia o diálogo e confirme em **Invalidar**.
3. O crédito volta a **Pendentes** e o plano de prestações é removido.

- O botão fica **cinzento** quando já há pagamentos: *"Não é possível invalidar —
  existem pagamentos associados a este crédito."*

#### 2.7.7 Eliminar um pedido / crédito

1. Na linha, clique no **caixote**.
2. Confirme em **Eliminar**.
3. O sistema **apaga definitivamente** o crédito, as prestações, as dívidas e as
   garantias associadas.

- Está **bloqueado** sempre que existir algum pagamento registado.

#### 2.7.8 Ponto crítico sobre o caixa (leia com atenção)

O desembolso **exige que o caixa do dia esteja aberto para o utilizador que
aprova**. O ecrã de abertura de caixa (**Caixa**, **Caixa Central**) está
reservado ao perfil **Administrador** — e o Gestor também não *consulta* o
caixa: o histórico de caixa e as demais leituras do caixa estão bloqueadas no
backend (resposta 403), não só escondidas no menu.

**Consequência prática:** na configuração actual, **um Gestor de Crédito não
consegue concluir o desembolso** — recebe sempre *"Abra o caixa do dia para
continuar"*. Duas saídas possíveis:

1. **Solução recomendada:** o ADMIN abre o **Caixa do Dia** e faz ele o
   desembolso (ou um perfil de Operador com o caixa aberto).
2. **Alternativa técnica:** o ADMIN abre o caixa e regista o desembolso em nome
   do processo.

> Este comportamento é uma **limitação conhecida** do sistema actual e está
> listado na secção 5. Foi mantido no manual para que a equipa não perca tempo a
> procurar um botão que não existe.

**Consegues fazer isto sozinho?**
- [ ] Sei abrir a revisão de documentos de um pedido pendente.
- [ ] Sei ler a análise de capacidade de pagamento e decidir.
- [ ] Sei preencher a janela de aprovação pela ordem correcta.
- [ ] Sei rejeitar um pedido com parecer escrito.
- [ ] Sei reabrir um pedido rejeitado, editando valor, prazo e taxa.
- [ ] Sei invalidar um desembolso feito por erro (quando não há pagamentos).
- [ ] Sei que o desembolso precisa de caixa do dia aberto e sei quem deve abri-lo.

---

### 2.8 Acompanhamento de Créditos (a página "Créditos")

**Objetivo da tela.** Ver todos os créditos da empresa organizados em quatro
segmentos, com filtros, resumo por segmento e exportações.

[SCREENSHOT: Página Créditos com os separadores Pendentes/Desembolsados/Terminados/Rejeitados, filtros e botões PDF/Excel/Conceder Crédito]

**Passo-a-passo básico**
1. Menu lateral → **Gestão de Crédito → Créditos**.
2. Escolha o separador (cada um mostra o número de registos):
   - **Pendentes** — aguardam análise/aprovação;
   - **Desembolsados** — créditos em curso;
   - **Terminados** — créditos totalmente liquidados;
   - **Rejeitados** — pedidos rejeitados.
3. Os cartões de **resumo do segmento** mudam conforme o separador:
   - Pendentes: nº créditos pendentes, valor solicitado, média de prestações, quantos já têm taxa definida;
   - Desembolsados: créditos em curso, valor de crédito, **total em dívida**, taxa média;
   - Terminados: créditos terminados, total pago, juros de mora pagos, descontos concedidos.
4. Nas colunas: **Mutuário** (com selo **Auto-cadastro** quando o cliente se
   registou sozinho pelo portal), **Valor**, **Taxa**, **Período/Prestações**,
   **Data de desembolso**, **Vencimento** (última prestação, com selo vermelho
   `N em atraso` quando aplicável).

**Filtros**
- **Pesquisar** por nome, conta, telefone ou finalidade;
- **Data início / Data fim** (data de solicitação);
- **Gestor de crédito** — filtra pelos créditos de um gestor específico;
- **Limpar filtros** (ícone) e **Actualizar**.

**Acções disponíveis em cada linha (mudam conforme o segmento)**
| Segmento | Acções |
|---|---|
| **Pendentes** | **Revisar e aprovar** (`fact_check`), **Abrir painel do mutuário**, **Eliminar pedido** |
| **Rejeitados** | **Reabrir pedido**, **Abrir painel do mutuário**, **Eliminar pedido** |
| **Desembolsados** | **Invalidar desembolso** (só sem pagamentos), **Abrir painel do mutuário**, **Eliminar crédito** (só sem pagamentos) |
| **Terminados** | **Abrir painel do mutuário**, **Eliminar crédito** (só sem pagamentos) |

**Exportações**
- **PDF** — gera o PDF do segmento actual com os totais no fim.
- **Excel** — gera o ficheiro Excel do segmento actual (uma folha por segmento:
  Pendentes/Rejeitados/Desembolsados/Terminados).
- O botão **Conceder Crédito** leva-o à lista de Mutuários (o crédito começa
  sempre pela ficha do mutuário).

**Erros comuns**
- *"Nenhum crédito pendente"* + *"Não existem créditos pendentes para esta
  empresa."* → ainda não há pedidos; é normal.
- Filtros activos sem resultados → **Limpar filtros**.

**Dica prática.** Use o filtro **Gestor de crédito** no fim do mês para analisar
a sua própria carteira e preparar o acompanhamento.

**Consegues fazer isto sozinho?**
- [ ] Sei distinguir os quatro segmentos e o que cada um contém.
- [ ] Sei filtrar por gestor e por datas.
- [ ] Sei usar as acções correctas de cada segmento.
- [ ] Sei exportar o segmento em PDF e Excel.

---

### 2.9 Garantias

**Objetivo da tela.** Registar as garantias do crédito. **Regra do sistema: o
valor total das garantias tem de cobrir o total a pagar do crédito (capital +
juros), senão a aprovação é recusada.**

[SCREENSHOT: Aba "Garantias & Recibos" com o seletor de crédito, o botão Adicionar e a lista de garantias]

**Passo-a-passo — registar uma garantia**
1. Abra a ficha do mutuário → aba **Garantias & Recibos**.
2. Se o mutuário tiver mais de um crédito, escolha o **Crédito** na lista.
3. Clique em **Adicionar**.
4. Preencha:
   - **Descrição da garantia *** — (ex.: "Congelador vertical", "Viatura Toyota", "Aval do Sr. X");
   - **Valor estimado (MZN) *** — o valor da garantia;
   - **Fotografia** — opcional, mas muito recomendada (prova documental);
   - **Estado** — Activa / Pendente.
5. Clique em **Adicionar** para guardar.

**Como saber se as garantias já chegam**
- Ao aprovar, o sistema compara **o total das garantias** com **o total a pagar
  (capital + juros)**. Se não chegar, a aprovação é recusada com uma mensagem a
  indicar quanto falta. Também não é possível **eliminar** uma garantia de um
  crédito activo se isso fizer descer a cobertura abaixo do total a pagar.

**Erros comuns e como resolver**
| Mensagem | Causa | Solução |
|---|---|---|
| *"Descrição da garantia é obrigatória"* | Campo vazio | Descreva a garantia. |
| *"Valor estimado é obrigatório"* | Valor ausente ou 0 | Indique o valor em MZN. |
| Aprovação recusada por garantias | Cobertura insuficiente | Registre garantias adicionais até cobrir capital + juros. |
| Não consigo eliminar uma garantia | O crédito está activo e passaria a estar descoberto | Registe outra garantia antes de remover, ou liquide o crédito. |

**Dica prática.** Tire a fotografia da garantia **no momento da visita** e
descreva-a com detalhe (marca, modelo, número de série, localização). Se um dia
houver incumprimento, é este registo que protege a instituição.

**Consegues fazer isto sozinho?**
- [ ] Sei adicionar uma garantia com descrição, valor e fotografia.
- [ ] Sei verificar se as garantias já cobrem capital + juros.
- [ ] Sei por que motivo não posso eliminar uma garantia de um crédito activo.

---

### 2.10 Plano de Amortização, Pagamentos e Recibos

**Objetivo da tela.** Ver a carteira de prestações do crédito e **registar
pagamentos** — total, parcial, com desconto, ou a **liquidação total** de uma só vez.

#### 2.10.1 Ver o plano

1. Ficha do mutuário → aba **Plano de Amortização**.

> **Nota:** o atalho `receipt_long` que abria a página de detalhe do crédito
> (`/loans/:id`) a partir da lista de **Créditos** foi **retirado** — essa página
> repetia a informação da ficha do mutuário. O caminho para ver o plano,
> registar pagamentos e consultar recibos é sempre a **ficha do mutuário**.
2. Escolha o **Crédito** quando o mutuário tiver mais de um.
3. A tabela mostra cada prestação: ordem, **Amortização** (capital), **Juros**,
   **Prestação**, **Saldo**, **Vencimento** e **estado**.

Botões do topo:
- **Liquidar Dívida Total** — abre a liquidação total (2.10.5);
- **Baixar Extracto Atualizado (PDF)** — extracto do crédito sempre actualizado;
- **Documentos Legais** — salta para a aba de documentos legais (2.11).

#### 2.10.2 Registar um pagamento (modo completo)

[SCREENSHOT: Janela "Registar Pagamento — Nª Prestação" com o resumo financeiro e os dados do pagamento]

1. Na linha da prestação, clique em **Pagar**.
2. Confirme no topo o **Resumo Financeiro**: **Prestação**, **Em falta**, **Mora**
   e **Total a pagar** (com a decomposição Capital / Juros / Mora; se o cliente
   tiver crédito a favor, aparece a dedução).
3. **Dados do Pagamento** — campos:
   | Campo | Obrigatório | Notas |
   |---|---|---|
   | **Data de pagamento** | Sim | Não pode ser uma data futura. |
   | **Meio de pagamento *** | Sim | M-Pesa, E-Mola, Transferência Bancária, Numerário, Cheque. |
   | **Conta Destino *** | Sim | Onde o dinheiro entra: banco, mobile money ou caixa. Sem conta não é possível registar. |
   | **Referência *** | Sim | Nº/ID da transacção. Para **Numerário**, o sistema cria automaticamente uma referência se deixar vazio. A referência tem de ser **única por método** (referências repetidas são recusadas). |
   | **Valor a pagar *** | Sim | Vem preenchido com o total a pagar. |
   | **Telefone do cliente** | Não | Preenchido com o telefone do mutuário. |
   | **Funcionário responsável** | — | Fica bloqueado com o seu nome (registo automático de quem recebeu). |
   | **Comprovativo de pagamento** | Não | PDF/JPG/PNG até 5 MB. |
4. Clique em **Confirmar Pagamento**.
5. Aparece a confirmação de sucesso, com botões **Ver Recibo** e **Baixar Recibo**.

#### 2.10.3 Pagamento Parcial

1. Clique em **Parcial**.
2. Preencha os mesmos campos; o **Valor a pagar** vem com metade do valor em falta
   e há um **cursor (slider)** para ajustar.
3. Se pagar abaixo do valor da prestação, aparece o aviso laranja a indicar o
   **saldo devedor que ficará**. A prestação passa a **Pago Parcial**.
4. Confirme.

#### 2.10.4 Pagamento com Desconto

1. Clique em **Desconto**.
2. Escolha o **Tipo de desconto**: **Percentual (%)** (por defeito 10%) ou
   **Valor Fixo (MZN)**.
3. Indique o valor/percentagem e o **Valor a pagar**.
4. Confirme. A prestação fica marcada como paga e o **desconto fica registado**
   no pagamento e nos relatórios (coluna "Descontos").

#### 2.10.5 Liquidar Dívida Total

[SCREENSHOT: Janela "Liquidar Dívida Total" com a lista de prestações a liquidar e o total]

1. No plano, clique em **Liquidar Dívida Total**.
2. O sistema apresenta **todas as prestações pendentes** que vão ser liquidadas e
   o total.
3. Na secção **Desconto**, ligue (se aplicável) **"Aplicar desconto por
   liquidação antecipada"**. Nesse caso aparecem:
   - **Tipo de desconto** (percentual ou valor fixo) e o respectivo valor;
   - **Justificativa do desconto *** — **obrigatória** (sem ela não é possível
     confirmar);
   - o resumo **Total com desconto** e a **poupança do cliente**.
4. Preencha os dados de pagamento: **Data**, **Meio de pagamento ***,
   **Conta Destino *** (Reembolso/Misto/Caixa), **Referência ***,
   **Telefone do cliente** e a **Nota/Parecer** (obrigatória quando há desconto).
5. Clique em **Confirmar Liquidação**.

**O que acontece:** todas as prestações são liquidadas **numa única operação
atómica** — ou fica tudo pago, ou nada é alterado (não há risco de ficar um
crédito "meio pago"). Quando a última prestação é liquidada, o sistema marca o
crédito como **Terminado** e avisa o cliente ("Crédito liquidado").

#### 2.10.6 Pagamentos a mais (excesso)

- Se o valor pago for **superior ao total devido**, o sistema **abate
  automaticamente o excesso nas prestações seguintes** (por ordem) e avisa
  *"Excesso abatido na(s) prestação(ões) X"*.
- Se **não houver mais prestações em aberto**, o excesso fica como **crédito a
  favor do mutuário** e é usado para abater nos pagamentos seguintes — aviso
  *"Excesso de … creditado ao mutuário"*.

#### 2.10.7 Ver e imprimir o Recibo

1. Numa prestação **paga**, clique em **Recibo**.
2. O recibo legal (PDF) abre no visualizador, com opção de **Baixar**.
3. O recibo tem **numeração sequencial por ano** (`REC-AAAA-00001`), o valor
   discriminado (capital, juros, mora, desconto), o método de pagamento e o
   extracto das prestações pendentes. A numeração **não tem saltos**.
4. O recibo pode ser validado publicamente: qualquer pessoa pode abrir a página
   **`/validar`** e introduzir o número do recibo e o hash — o sistema confirma se
   é autêntico.

> **Nota de certificação:** a lógica do selo electrónico (hash SHA-256, código de
> validação e QR Code) está activa e os dados são gravados, mas a **impressão no
> PDF** desses elementos depende da licença da Autoridade Tributária
> (`AT_CERTIFICADO_ENABLED`), que na configuração actual está **desligada**.
> Na prática, o recibo sai com numeração sequencial legal, mas **sem** o QR/hash
> impressos. Isto é uma configuração, não um erro.

**Erros comuns e como resolver**
| Mensagem | Causa | Solução |
|---|---|---|
| *"Seleccione a conta de destino do pagamento"* | Conta Destino vazia | Escolha a conta para onde o dinheiro entra. |
| *"A referência "X" já foi usada neste método de pagamento."* | Referência duplicada | Confirme se o pagamento já foi registado; se não, use outra referência. |
| *"A data de pagamento não pode ser futura."* | Data no futuro | Corrija a data. |
| *"Valor acima do devido (total a pagar X MZN)…"* | Valor superior ao devido sem confirmação | Aceite o excesso (o sistema propõe o abatimento) ou corrija o valor. |
| *"Abra o caixa do dia para continuar"* | Caixa do dia não aberto | Ver 2.7.8 — o ADMIN abre o caixa. |
| *"Conta de destino inválida."* | A conta escolhida não serve para receber reembolsos | Escolha uma conta de Reembolso/Misto/Caixa. |

**Dica prática.** Registe o pagamento **sempre no dia em que o dinheiro entra**.
A mora é calculada **por dia** — registar tarde faz aparecer mora que o cliente
já pagou, e depois é preciso explicar.

**Consegues fazer isto sozinho?**
- [ ] Sei encontrar o plano de amortização de um crédito.
- [ ] Sei registar um pagamento completo com data, meio, conta, referência e valor.
- [ ] Sei registar um pagamento parcial e explicar o saldo devedor ao cliente.
- [ ] Sei aplicar um desconto (percentual ou valor fixo).
- [ ] Sei liquidar a dívida total de uma só vez, com ou sem perdão.
- [ ] Sei ver, validar e baixar o recibo legal.

---

### 2.11 Documentos Legais do Crédito

**Objetivo da tela.** Emitir e consultar o **pacote de concessão** do crédito:
contrato, termo de responsabilidade, plano de amortização e declaração de
garantias — com **hash de segurança e QR Code**.

[SCREENSHOT: Aba "Documentos Legais" com o estado do pacote e a lista dos documentos disponíveis]

**Passo-a-passo**
1. Ficha do mutuário → aba **Documentos Legais** (ou no detalhe do crédito,
   botão **Documentos Legais**).
2. O sistema mostra o estado do pacote:
   - **Emitido no desembolso** — para créditos já desembolsados, o pacote é
     criado automaticamente no momento do desembolso (é imutável: não muda depois);
   - **Ainda não emitido** — para créditos pendentes, os documentos podem ser
     gerados sob procura.
3. Abra/descarregue cada documento:
   - **Contrato de Concessão**;
   - **Termo de Responsabilidade**;
   - **Plano de Amortização**;
   - **Declaração de Garantias**;
   - **Extracto** — sempre actualizado, gerado na hora (não faz parte do pacote
     imutável).
4. Para obter tudo de uma vez, use a opção **ZIP** do pacote.

**Nota de configuração:** o ADMIN pode **ocultar a cláusula de seguro (VIGÉSIMA
PRIMEIRA)** do contrato em **Configurações → Empresa**. Se essa opção estiver
ligada, o contrato sai sem essa cláusula.

**Erros comuns**
- *"Pacote já emitido"* — o pacote é imutável; para um contrato novo é preciso
  invalidar o desembolso (o que não é possível com pagamentos registados).
- Documento em branco/sem dados da empresa → peça ao ADMIN para completar o
  **NUIT, nome, endereço e logotipo** em Configurações → Empresa.

**Consegues fazer isto sozinho?**
- [ ] Sei abrir a aba de Documentos Legais de um crédito.
- [ ] Sei distinguir o pacote imutável (do desembolso) do extracto actualizado.
- [ ] Sei descarregar contrato, termo, plano e declaração de garantias.
- [ ] Sei que o contrato pode sair sem a cláusula de seguro, por configuração.

---

### 2.12 Acompanhamento de Atrasos e Mora

**Objetivo.** Identificar rapidamente quem está em atraso e quanto está a pagar
de mora, e actuar.

**Onde ver**
1. **Painel do Gestor** (2.1) — coluna **Mora** e coluna **Observações**
   (`N dias vencido`). Ordene por **Mora** descendente para priorizar.
2. **Créditos → Desembolsados** — coluna **Vencimento** mostra o selo vermelho
   `N em atraso` e, nos Terminados, os **Juros de mora pagos**.
3. **Ficha do mutuário → Plano de Amortização** — a mora aparece linha a linha
   no total a pagar de cada prestação vencida.

**Como a mora funciona (explicação simples)**
- A mora é uma **percentagem por dia de atraso**, definida pela instituição
  (campo **Multa (%)** em Configurações → Empresa).
- É calculada sobre o **saldo ainda em falta da prestação** — se o cliente já
  pagou parte, a mora continua a ser calculada apenas sobre o que falta.
- O sistema **recalcula sempre a mora no servidor** no momento do pagamento;
  nunca aceita o valor calculado pelo navegador.
- A mora **já cobrada** não é cobrada duas vezes: o sistema desconta o que já foi
  cobrado na mesma prestação.
- Quando o pagamento entra, a mora é **cobrada antes** dos juros e do capital
  (ordem: Morra → Juros → Capital).

**Passo-a-passo — actuar num atraso**
1. Localize o caso (Painel do Gestor ordenado por Mora).
2. Abra a ficha do mutuário → **Plano de Amortização**.
3. Contacte o mutuário (telefone) e combine o pagamento.
4. Quando o pagamento chegar, registe-o (2.10). Pode usar **Parcial** se o
   cliente não puder pagar tudo, ou **Desconto** se a instituição decidir perdoar
   parte (o desconto fica registado e auditado).
5. Se o cliente tiver garantias, avalie accioná-las junto do ADMIN.

> **SMS automáticos de atraso:** o sistema possui rotinas de fila de mensagens
> para avisos de prestações a vencer e de juros de mora. O **disparo/gestão
> dessas filas é feito pelo ADMIN**; no ecrã do Gestor, as mensagens aparecem na
> área **Mensagens** (ver 2.13).

**Dica prática.** Crie uma rotina semanal: segunda-feira de manhã, ordene o
Painel por Mora descendente e trate os 10 piores casos por telefone. Um aviso
amigável antes do vencimento evita 80% dos atrasos.

**Consegues fazer isto sozinho?**
- [ ] Sei encontrar as prestações em atraso e quanto valem de mora.
- [ ] Sei explicar ao cliente como a mora é calculada.
- [ ] Sei registar um pagamento parcial para reduzir o atraso.
- [ ] Sei aplicar um desconto de forma justificada e registada.

---

### 2.13 Mensagens (fila de SMS)

**Objetivo da tela.** Ver as mensagens relacionadas com credenciais de acesso e
alertas, e reenviar as que falharam.

> **Nota de acesso:** o ecrã **/sms/pendentes** está autorizado ao Gestor, mas
> **não aparece no menu lateral** do perfil Gestor. Para lá chegar, escreva o
> endereço `.../sms/pendentes` na barra de endereços do navegador.

[SCREENSHOT: Página Mensagens com filtros (Assunto, Estado), botões PDF/Excel e a lista de mensagens]

1. Filtre por **Assunto** (tipo de mensagem) e **Estado**.
2. Pesquise por mutuário, telefone ou assunto.
3. Em cada linha pode:
   - **Reenviar SMS** — volta a colocar a mensagem na fila de envio;
   - **Eliminar** — remove a mensagem da fila.
4. Exporte a lista em **PDF** ou **Excel**.

**Aviso importante:** se o ADMIN tiver **desactivado o envio de SMS** na
empresa, aparece uma faixa cinzenta: *"O envio de SMS está desactivado nas
configurações da empresa…"* — nesse caso as mensagens ficam em fila e **não
saem** até o ADMIN reactivar.

**Consegues fazer isto sozinho?**
- [ ] Sei chegar ao ecrã de Mensagens e filtrar por assunto/estado.
- [ ] Sei reenviar uma mensagem que falhou.
- [ ] Sei que nada é enviado enquanto o ADMIN tiver os SMS desactivados.

---

### 2.14 Microcrédito BM (módulo de consulta e reporte)

**Objetivo.** Consultar indicadores de microcrédito e preparar o **reporte
trimestral ao Banco de Moçambique**.

> **Importante:** este módulo é de **consulta**. Criar/alterar clientes,
> créditos, financiamentos ou pagamentos **aqui está desactivado** de propósito
> (o sistema responde "Escrita desactivada para impedir dados paralelos. Use o
> módulo core correspondente."). Tudo se cria nos ecrãs normais (Mutuários,
> Créditos, Pagamentos).

[SCREENSHOT: Módulo Microcrédito com as abas Painel, Clientes, Créditos, Pagamentos, Financiamentos e Reportes BM]

**Abas disponíveis (Painel Microcrédito BM — fora do menu; aceder por URL directa)**
1. **Painel** — Carteira activa, Em risco (valor e percentagem), Clientes
   activos, Créditos em curso; gráficos de **carteira por sector** e
   **classes de risco (I a IV)**; tabela de **créditos em atraso** (código,
   cliente, dias de atraso, classe de risco, total em dívida).
2. **Clientes** — lista dos mutuários (nome, sexo, sector, telefone, estado).
3. **Créditos** — código, cliente, capital, taxa mensal, prazo, data de
   concessão, estado e total em dívida.
4. **Pagamentos** — data, crédito, cliente, nº da prestação, capital pago, juro
   pago e forma de pagamento.
5. **Financiamentos** — carteiras analíticas de financiamento, taxas e prazos
   derivados do crédito core, e **Caixa Central (registos reais)**.
6. **Reportes BM** — o reporte trimestral:
   1. Escolha **Data início** e **Data fim** do período;
   2. Clique em **Pré-visualizar** para ver no ecrã os quadros do modelo BM:
      **2.1 Carteira de crédito** (capital, juro, total; créditos concedidos,
      reembolsados, clientes activos), **carteira por sector**, **carteira em
      risco por classe (I-IV)** e **2.2–3 Situação financeira** (taxas, prazos,
      capital inicial e actual, activos: caixa, bancos, outros activos por mês);
   3. Clique em **Gerar Excel BM** para descarregar o ficheiro do modelo oficial
      (o nome inclui o nome da empresa, o ano e o trimestre, ex.:
      `BM_Reporte_empresa_2026-T1.xlsx`);
   4. Clique em **Exportar PDF** para gerar uma versão PDF do mesmo conteúdo;
   5. Se o cabeçalho mostrar **"Campos BM sem fonte core validada ou que exigem
      revisão"**, leia a lista: são campos do modelo que precisam de ser
      confirmados manualmente antes de entregar ao Banco.

**Erros comuns**
- *"Falha ao carregar módulo de microcrédito"* → confirme que tem empresa
  associada ao seu utilizador (fale com o ADMIN).
- *"Falha ao gerar Excel"* → confirme o período (Datas início/fim) e tente outra vez.
- *"Configuração inválida"* (ao guardar configuração) → valores fora dos limites
  permitidos.

**Dica prática.** Antes de gerar o reporte, confirme com o ADMIN que os dados da
empresa (nome, NUIT, endereço, província, nº de trabalhadores, data de início de
actividade) estão completos — é isso que preenche o cabeçalho do modelo BM.

**Consegues fazer isto sozinho?**
- [ ] Sei abrir o Painel do Microcrédito e ler os indicadores.
- [ ] Sei consultar clientes, créditos e pagamentos neste módulo.
- [ ] Sei pré-visualizar e gerar o Excel do reporte BM de um trimestre.
- [ ] Sei interpretar o aviso de campos BM que precisam de confirmação.
- [ ] Entendo que não devo tentar criar registos neste módulo.

---

### 2.15 Alertas (sino no topo)

O sino no canto superior direito mostra os alertas do sistema (por exemplo
pagamentos recebidos pelo Portal do Mutuário **fora do horário de expediente**,
que ainda não foram conferidos). Cada alerta traz botões de acção — quando
aplicável, um deles leva-o ao ecrã **Caixa Central** (reservado ao ADMIN).

> A página **Notificações** (`/notifications`) existe no menu mas está **em
> construção** — é apenas um aviso. **Use o sino** para ver os alertas.

**Consegues fazer isto sozinho?**
- [ ] Sei onde ver os alertas e como os marcar como lidos.
- [ ] Sei que a página "Notificações" ainda está por implementar.

---

## 3. Perfil ADMIN - Guia completo sem formação

### 3.0 O que o ADMIN tem a mais do que o Gestor

| Área | Gestor | ADMIN |
|---|---|---|
| Painel geral (`/dashboard`) | — (redirecciona para o Painel do Gestor) | ✅ |
| Caixa do Dia / Caixa Central / Histórico de Caixa | ❌ | ✅ |
| Contas Bancárias |❌| ✅ |
| Pagamentos (lista global) | ❌ | ✅ |
| Controle de Prestações | ❌ | ✅ |
| Relatório Banco de Moçambique | ❌ | ✅ |
| Configurações da Empresa | ❌ | ✅ |
| Equipa e Parceiros (utilizadores) | ❌ | ✅ |
| Financiamento (Carteiras e Taxas) | ❌ | ✅ |
| Relatório de Financiadores | ❌ | ✅ |
| Histórico / Auditoria | ❌ | ✅ |
| Mensagens (SMS) | ✅ (por URL) | ✅ (no menu) |
| Mutuários / Créditos | ✅ | ✅ |

Menu lateral do ADMIN: **Geral** (Painel), **Gestão de Crédito** (Mutuários,
Créditos, Controle Prestações), **Financeiro** (Pagamentos, Caixa Central,
Contas Bancárias, Caixa, Histórico Caixa), **Financiamento** (Carteiras e
Taxas, Parceiros Financiadores, Relatório Financiadores), **Relatórios**
(Relatório BM) e **Sistema** (Equipa e Parceiros, Configurações, Mensagens,
Histórico). A secção **Microcrédito** saiu dos menus dos dois perfis (os
módulos 2.14 e 3.13 mantêm-se, acessíveis por URL directa).

[SCREENSHOT: Menu lateral do Administrador com todos os grupos expandidos]

**Consegues fazer isto sozinho?**
- [ ] Sei identificar as áreas exclusivas do meu perfil.
- [ ] Sei que sou eu (ADMIN) quem abre o caixa do dia para a equipa operar.

---

### 3.1 Painel (Dashboard) — KPIs por carteira de financiamento

**Objetivo.** Visão executiva do negócio, organizada por **carteiras de
financiamento** (fundos/parceiros) e saldo real disponível.

[SCREENSHOT: Painel com os 4 cartões de KPI, os cartões de carteiras de financiamento, os gráficos e a tabela de próximas prestações]

**Passo-a-passo**
1. Menu **Geral → Painel**.
2. Aplique os filtros no topo (FiltrosBar): intervalo/período e **Sincronizar**.
3. Leia os 4 KPI no topo:
   - **Capital alocado (analítico)** — quanto capital foi atribuído às carteiras (com o número de carteiras com limite definido e a variação face ao mês anterior);
   - **Desembolsado (todas as carteiras)** — total emprestado, com nº de créditos e de clientes;
   - **Reembolsado (todas as carteiras)** — total recebido, com juros e mora recebidos;
   - **Saldo real para desembolsos** — dinheiro efectivamente disponível nas contas `DESEMBOLSO`/`MISTO`.
4. Na secção **Carteiras de Financiamento**, cada cartão mostra: **Alocado**,
   **Desembolsado**, **Disponível**, barra de utilização (verde < 85%, laranja
   ≥ 85%, vermelho ≥ 100%), **Créditos**, **Reembolsados** (prestações pagas/total),
   **Taxa média**, **Juros gerados**, **Juros recebidos**, **Previsão de lucro** e
   **Saldo a receber**.
5. Botão **Gerir carteiras** → abre **Financiamento** (3.5).
6. Abaixo, os **gráficos por carteira** (desembolsos e recebimentos por mês) e a
   tabela de **próximas prestações a vencer**.

**Dica prática.** A diferença entre **Desembolsado** e **Saldo real para
desembolsos** é a informação mais importante do painel: diz-lhe se pode ou não
aprovar novos créditos hoje.

**Consegues fazer isto sozinho?**
- [ ] Sei ler os 4 KPIs e o que cada um representa.
- [ ] Sei identificar uma carteira com risco de esgotar o capital (barra laranja/vermelha).
- [ ] Sei onde clicar para gerir carteiras.

---

### 3.2 Caixa do Dia e Caixa Central (a operação mais importante)

**Porquê:** sem caixa do dia aberto **para o seu utilizador**, o sistema
**recusa** desembolsos, pagamentos e liquidações. É o primeiro ecrã a abrir de
manhã.

[SCREENSHOT: Caixa Central com o botão "Abrir Caixa do Dia" e o saldo inicial]

**Passo-a-passo — abrir o caixa**
1. Menu **Financeiro → Caixa Central** (ou **Caixa**).
2. Clique em **Abrir Caixa do Dia**.
3. No diálogo **"Abrir Caixa do Dia"**, conte o **Fundo de Maneio** — o
   numerário físico que existe na gaveta — nota a nota e moeda a moeda (o
   total é calculado pelo sistema). **Não há sugestão nem saldo arrastado:**
   o valor do fecho anterior não é herdado.
4. Clique em **Abrir Caixa**.

**Regras que o sistema aplica**
- **O caixa abre sempre com saldo ZERO disponível.** O valor contado na
  abertura é o **Fundo de Maneio — memorando físico**: não é saldo, não fica
  disponível, não arrasta para o dia seguinte e não dá direito a valor a
  ninguém (não gera sobras nem quebras no fecho). Serve apenas para a gaveta
  bater certo com a contagem do fecho e para o Mapa de Caixa (Modelo BM),
  onde aparece como *"Saldo Inicial (Fundo de Maneio)"*.
- **Um caixa aberto por utilizador e por dia** (a instalação tem uma única
  empresa). Se já tiver um
  caixa aberto hoje, aparece *"Já existe um caixa aberto hoje para este
  utilizador."*
- Caixas esquecidos de dias anteriores **não bloqueiam** o dia de hoje.

**Passo-a-passo — movimentos do dia**
Na Caixa Central, com o caixa aberto:
1. **Aba Movimentos do Dia** — lista de tudo o que entrou e saiu hoje, com
   distinção de método (numerário/banco/mobile money) e com selo **"auto"** nos
   movimentos gerados pelo sistema (desembolsos, reembolsos, taxas).
2. **Nova Entrada** — registe uma entrada manual: **Método***, **Categoria***,
   **Valor***, **Descrição*** (e a conta bancária quando o método é electrónico).
3. **Nova Saída** — idem, para saídas.
4. **Depositar no Banco** — transfere numerário da gaveta para uma conta bancária.
5. **Levantar do Banco** — transfere do banco para a gaveta.
6. **Aba Contas Bancárias** — saldos actuais das contas ligadas ao caixa.
7. **PDF** — exporta os movimentos do dia. **Histórico** — abre o histórico de caixas.

**Passo-a-passo — fechar o caixa (fim do dia)**
1. Clique em **Fechar Caixa**.
2. Conte o dinheiro da gaveta e indique o **valor contado**.
3. Confirme. O sistema calcula o **saldo final** (fundo de maneio + entradas −
   saídas) e a **diferença** entre o valor contado e o calculado — se houver
   diferença, fica registada para auditoria. O fundo de maneio contado na
   abertura é levado em conta e por isso **não gera sobras nem quebras
   fantasma**.
4. Um caixa **fechado é imutável**: já não aceita mais movimentos.

**Erros comuns e como resolver**
| Mensagem | Causa | Solução |
|---|---|---|
| *"Já existe um caixa aberto hoje para este utilizador."* | Já abriu o caixa hoje | Use o caixa existente; não precisa abrir outro. |
| *"Informe um saldo inicial válido (>= 0)."* | Valor vazio, negativo ou com letras | Indique o valor contado. |
| *"Abra o caixa do dia para continuar."* (nos pagamentos) | Caixa do dia não aberto | Abra o caixa (este ecrã) e repita a operação. |
| Diferença no fecho | Erro na contagem ou movimento não registado | Reveja os movimentos do dia; registe o que faltar e explique a diferença. |

**Dica prática.** Abra o caixa antes de o primeiro cliente chegar e feche-o
sempre no fim do dia. Se deixar o caixa aberto de um dia para o outro, o
histórico ficará com um dia sem fecho — isso dificulta a reconciliação.

**Consegues fazer isto sozinho?**
- [ ] Sei abrir o caixa do dia (saldo zero) e registar o fundo de maneio contado.
- [ ] Sei registar uma entrada e uma saída manual.
- [ ] Sei depositar/levantar dinheiro do banco pelo sistema.
- [ ] Sei fechar o caixa e ler a diferença apurada.
- [ ] Entendo que sem caixa aberto ninguém consegue desembolsar nem receber.

---

### 3.3 Contas Bancárias (Carteira Real)

**Objetivo.** Manter as contas reais por onde entra e sai o dinheiro: bancos
(FNB, BCI, BIM, Moza…), mobile money (M-Pesa, e-Mola) e caixa físico.

[SCREENSHOT: Página Contas Bancárias com os cartões de conta, finalidades, saldos e os botões Nova Conta/Transferir]

**Passo-a-passo — criar uma conta**
1. Menu **Financeiro → Contas Bancárias**.
2. Clique em **Nova Conta**.
3. Preencha:
   - **Tipo *** — Banco / Mobile Money / Caixa Físico;
   - **Banco / Operador *** — (ex.: FNB, BCI, BIM, M-Pesa, e-Mola);
   - **Código do banco (SWIFT/ABI)** — opcional;
   - **Número da conta / telefone ***;
   - **Descrição**, **Titular**;
   - **Finalidade *** — a mais importante:
     - **DESEMBOLSO** — de onde sai o dinheiro dos créditos;
     - **REEMBOLSO** — onde entram os pagamentos dos clientes;
     - **MISTO** — serve para as duas coisas;
     - outras finalidades disponíveis na lista;
   - **Moeda** — MZN / USD / ZAR;
   - **Saldo de partida (referência)** — o saldo actual da conta no momento do cadastro;
   - **Default para Reembolsos** / **Default para Desembolsos** — marque para
     pré-seleccionar automaticamente nas operações;
   - **Conta activa**.
4. Clique em **Criar Conta**.

> **Sem pelo menos uma conta com finalidade DESEMBOLSO/MISTO, ninguém consegue
> aprovar créditos por via electrónica.** É um passo de instalação obrigatório.

**Acções por conta**
- **Extrato** — movimentos da conta, com possibilidade de guardar.
- **Editar** — alterar dados; ao alterar o **saldo real da conta** fica
  registado o ajuste.
- **Transferir** (botão no topo) — transferência entre duas contas suas.

**Erros comuns**
- *"Informe o banco"*, *"Informe o número"*, *"Selecione o tipo"*, *"Selecione a
  finalidade"* → preencha os campos com `*`.
- *"Saldo insuficiente…"* ao desembolsar → o saldo real da conta não cobre o valor.

**Dica prática.** Marque **uma** conta como *Default de Desembolso* e **uma**
como *Default de Reembolso*. Poupa duas escolhas em cada operação e evita erros.

**Consegues fazer isto sozinho?**
- [ ] Sei criar uma conta bancária com finalidade DESEMBOLSO/REEMBOLSO/MISTO.
- [ ] Sei definir as contas por defeito.
- [ ] Sei consultar o extrato de uma conta.
- [ ] Sei transferir entre contas.

---

### 3.4 Pagamentos (lista global)

**Objetivo.** Ver e auditar **todos** os pagamentos da empresa (o Gestor não tem
este ecrã) e reimprimir recibos.

[SCREENSHOT: Página Pagamentos com filtros, botões PDF/Excel e a lista de pagamentos com o botão Recibo]

1. Menu **Financeiro → Pagamentos**.
2. Filtre por **Data início / Data fim** e por **Meio de pagamento**.
3. Cada linha mostra: data, mutuário, valor, juros, mora, desconto, meio de
   pagamento, referência e o **funcionário que recebeu**.
4. Clique em **Recibo** na linha para abrir o recibo legal daquele pagamento.
5. **PDF** e **Excel** exportam a lista filtrada.

**Regra de apresentação importante:** quando um mesmo pagamento foi composto por
vários movimentos no mesmo dia, o sistema mostra a mora **uma única vez**, para
não inflacionar os totais.

**Consegues fazer isto sozinho?**
- [ ] Sei filtrar pagamentos por período e meio.
- [ ] Sei abrir o recibo de um pagamento antigo.
- [ ] Sei exportar a lista de pagamentos.

---

### 3.5 Controle de Prestações (visão global)

**Objetivo.** Ver todas as prestações de créditos **activos e terminados** da
empresa, com mora e estado, e agir.

[SCREENSHOT: Página Controle Prestações com filtros e a grelha completa de prestações]

1. Menu **Gestão de Crédito → Controle Prestações**.
2. Filtre por **Estado** (Pendente / Pago / Pago Parcial), **Pesquisar mutuário**,
   **De / Até** (vencimento).
3. Exporte em PDF (relatório agrupado por mês, com totais).
4. Em cada linha, **Ver detalhes** mostra prestação, pago, vencimento, estado,
   mora e total, com envio de **SMS**.

**Notas técnicas úteis na operação**
- As prestações de créditos sem mutuário correspondente **não são escondidas**:
  aparecem com selo, para que nenhum dado financeiro desapareça.

**Consegues fazer isto sozinho?**
- [ ] Sei abrir o Controle de Prestações e filtrar por estado/datas.
- [ ] Sei exportar o relatório de prestações.
- [ ] Sei abrir o detalhe de uma prestação e enviar SMS.

---

### 3.6 Financiamento: Carteiras de financiamento

**Objetivo.** Criar e gerir as **carteiras** que classificam a origem do capital
(fundo próprio, parceria, financiador externo). **Sem carteira não se desembolsa**
— é um passo obrigatório de instalação.

[SCREENSHOT: Página Financiamento, aba Carteiras, com os cartões de carteira e o botão "Nova Carteira"]

**Passo-a-passo — criar uma carteira**
1. Menu **Financiamento → Carteiras e Taxas** → aba **Carteiras**.
2. Clique em **Nova Carteira**.
3. Preencha:
   - **Código *** — (ex.: `KMAD`, `PME_12`);
   - **Nome da carteira ***;
   - **Descrição / finalidade**;
   - **Capital alocado (analítico)** — o limite desta carteira. **Deixe vazio
     para um fundo sem limite**;
   - **Desembolsado anterior (base)** — histórico já desembolsado antes desta carteira (para importações);
   - **Taxa de juro esperada (%)** — (ex.: 12 para 12% ao mês);
   - **Cor do badge**;
   - **Esta carteira pertence a um parceiro externo** → se marcar, aparece
     **Nome do parceiro ***, **E-mail (relatórios)**, **NUIT do parceiro**, **Contacto**;
   - **Dar acesso ao portal do financiador** → se marcar, aparece **Portal activo**
     (necessário para criar o utilizador do parceiro — ver 3.9 e 3.14);
   - **Carteira activa**.
4. Clique em **Criar carteira**.

**Acções e ferramentas disponíveis**
- **Ver detalhes** em cada carteira (alocado, desembolsado, disponível, créditos, juros).
- **Classificar créditos antigos (N)** — atribui em lote uma carteira a créditos
  importados que ainda não têm carteira.
- **Limpar carteiras de teste** — apaga carteiras sem movimento criadas para
  teste (`TESTE_*` ou criadas há menos de 7 dias).
- **Desactivar** (recomendado) ou **Apagar definitivamente** — o sistema recusa
  apagar uma carteira que já tenha movimento (usar "Desactivar em vez disso").

**Erros comuns**
| Mensagem | Causa | Solução |
|---|---|---|
| *"Obrigatório"* no código/nome | Campos vazios | Preencha código e nome. |
| *"Obrigatório"* no nome do parceiro | Marcou "parceiro externo" sem nome | Indique o nome do parceiro. |
| Não consigo apagar a carteira | Tem movimento | Use **Desactivar** ou escreva o código para confirmar a eliminação apenas quando não houver movimento. |

**Dica prática.** Crie **uma carteira por fonte de capital real** (fundos
próprios, cada parceiro, cada linha de crédito bancária). É isso que permite
depois entregar a cada financiador um relatório isolado e correcto.

**Consegues fazer isto sozinho?**
- [ ] Sei criar uma carteira com código, nome e capital alocado.
- [ ] Sei marcar uma carteira de parceiro externo e activar o portal.
- [ ] Sei classificar créditos antigos numa carteira.
- [ ] Sei desactivar uma carteira em vez de a apagar.

---

### 3.7 Produtos de crédito: Taxas de Juro

**Objetivo.** Definir os **planos de crédito** (nome, taxa de juro mensal, taxa
administrativa) e vinculá-los à origem do capital. É daqui que saem as opções que
o Gestor vê na simulação e na aprovação.

[SCREENSHOT: Aba Taxas de Juro com a lista de taxas vinculadas a carteiras/contas e o botão "Nova Taxa"]

**Passo-a-passo — criar uma taxa**
1. Menu **Financiamento → Carteiras e Taxas** → aba **Taxas de Juro**.
2. Clique em **Nova Taxa**.
3. Preencha:
   - **Nome / Descrição *** — (ex.: "KMAD 6 meses", "PME 12 meses");
   - **Taxa de Juro (%) *** — taxa **mensal** (o sistema mostra-a como % a.m. e % a.a.);
   - **Taxa Administrativa (%)** — a comissão de preparos, cobrada uma única vez
     no desembolso. Pode ser 0.
4. Escolha **Vincular a *** — uma das três opções:
   - **CARTEIRA** — aparece o campo **Carteira de Financiamento *** (dinheiro
     analítico/parceria). O crédito herda a carteira da taxa;
   - **CONTA** — aparece o campo **Conta de Desembolso Principal *** (dinheiro
     real, contas com finalidade DESEMBOLSO/MISTO, com o saldo visível);
   - **NENHUMA** — taxa genérica, sem origem de capital definida (pode ser
     vinculada mais tarde, sem perder histórico).
5. Clique em **Criar taxa**.

> **Regra de vinculação:** cada taxa fica ligada a **uma e só uma** origem de
> capital (carteira **ou** conta). Taxas antigas sem vinculação aparecem
> marcadas como tal e podem ser vinculadas depois pelo botão **Vincular**.

**Acções**
- **Vincular / Editar** — alterar dados e a vinculação;
- **Eliminar** (com confirmação).

**Erros comuns**
- *"Obrigatório"* no nome ou na taxa → preencha.
- A taxa não aparece para o Gestor → confirme que ficou guardada na empresa certa.
- *"Não existem taxas de juro configuradas para a empresa."* no ecrã do Gestor →
  criar pelo menos uma taxa activa.

**Dica prática.** Nomeie as taxas com o **produto e o prazo** ("Comércio 6m",
"Agro 12m"). Ao aprovar, o Gestor escolhe pelo nome e não pelo número — reduz
erros de taxa.

**Consegues fazer isto sozinho?**
- [ ] Sei criar um produto/taxa com taxa mensal e taxa administrativa.
- [ ] Sei vincular a taxa a uma carteira de financiamento ou a uma conta de desembolso.
- [ ] Sei editar e eliminar uma taxa.

---

### 3.8 Taxas e Multas (mora) - configuração

**Onde se configura hoje**
- **Configurações → Empresa → campo "Multa (%)"** — a **percentagem de mora por
  dia** de atraso. É este o valor usado no cálculo da mora de toda a empresa.

**Como a mora se comporta**
- Calculada **por dia** sobre o **saldo em falta** da prestação;
- Recalculada no servidor no momento do pagamento;
- A mora já cobrada não é cobrada novamente;
- Ordem de cobrança: **Mora → Juros → Capital**.

> **[Em desenvolvimento]** O motor de mora suporta regras mais finas por empresa
> — dias de carência, limite máximo de dias de mora, tecto da mora em percentagem
> e cálculo por dias úteis — mas **não existe ecrã** para as configurar. Quando
> não estão definidas na base de dados, o sistema usa apenas o campo **Multa (%)**
> (sem carência e sem limite de dias). Qualquer configuração avançada tem de ser
> feita por técnico.

**Dica prática.** Antes de alterar a **Multa (%)**, avise a equipa: o novo valor
passa a aplicar-se aos cálculos de mora em curso de toda a empresa.

**Consegues fazer isto sozinho?**
- [ ] Sei onde está o campo Multa (%) e o que ele faz.
- [ ] Entendo que a mora é diária e calculada sobre o saldo em falta.
- [ ] Sei que configurações avançadas de mora ainda não têm ecrã.

---

### 3.9 Gestão de Utilizadores (Equipa e Parceiros)

**Objetivo.** Criar, editar, activar/desactivar e eliminar utilizadores da
instituição (Administrador, Gestor de Crédito, Operador) e criar **parceiros
financiadores** (portal do financiador).

[SCREENSHOT: Página Equipa e Parceiros com os contadores (Admins, Gestores, Operadores, Parceiros) e a lista de membros]

**Passo-a-passo — criar um membro da equipa**
1. Menu **Sistema → Equipa e Parceiros** (aba **Equipa MBRM**).
2. Clique em **Novo Membro**.
3. **Identificação**:
   - **Nome completo ***;
   - **E-mail *** (é o utilizador de acesso; **não é alterável depois** de criado);
   - **Telefone**;
   - **Senha *** — a senha inicial. Use **Gerar senha** se quiser uma senha forte
     (o sistema cria uma senha de 10 caracteres e mostra-a — copie-a antes de guardar).
4. **Perfil e acesso ***:
   - **Administrador** — acesso total à empresa;
   - **Gestor de Crédito** — acompanha créditos e mutuários;
   - **Operador** — operação diária;
   - **Parceiro Financiador** — portal do financiador (só a carteira dele).
5. **Conta activa** (liga/desliga o acesso).
6. Clique em **Criar membro**.
7. Se deixar a senha em branco, a senha inicial é **`123456`** — avise o
   utilizador para a alterar no primeiro acesso.

**Passo-a-passo — criar um Parceiro Financiador**
1. Aba **Parceiros Financiadores** → **Novo Membro**.
2. **Perfil de acesso** = **Parceiro Financiador**.
3. Escolha a **Carteira de financiamento *** — só aparecem carteiras de parceiro
   externo **com portal activo**.
4. Preencha **NUIT do parceiro** e **Contacto da empresa parceira** (opcionais).
5. Crie o membro. O parceiro entra com o e-mail/senha e é encaminhado
   directamente para o **Portal do Financiador**, onde **só vê** a carteira
   seleccionada (créditos, prestações, mora, recebimentos e recibos) e **não
   edita nada** nem acede ao painel da instituição.

**Outras acções por membro**
| Ícone | Acção |
|---|---|
| **Interruptor** (toggle) | Activar / desactivar o acesso |
| **Repor senha** | Repõe a senha para `123456` (staff) |
| **Enviar credenciais** | Envia as credenciais por SMS/WhatsApp (staff) |
| **Editar** | Alterar nome, telefone, perfil, senha |
| **Eliminar** | Remover o acesso (com confirmação) |

**Erros comuns**
| Mensagem | Causa | Solução |
|---|---|---|
| *"Indique o nome do membro"* | Nome vazio | Preencha o nome. |
| *"Indique o e-mail de acesso"* | E-mail vazio no momento da criação | Preencha o e-mail. |
| *"Defina a senha inicial"* | Senha vazia na criação | Defina ou gere a senha. |
| *"Selecione a carteira de financiamento do parceiro"* | Parceiro sem carteira | Escolha a carteira (tem de ter portal activo). |
| *"A carteira X não tem portal activo…"* | Portal desligado | Active o portal na carteira (3.6). |
| *"Já existe um utilizador com este e-mail nesta empresa."* | E-mail duplicado | Use outro e-mail. |

**Consegues fazer isto sozinho?**
- [ ] Sei criar um utilizador com nome, e-mail, senha e perfil.
- [ ] Sei repor a senha de um utilizador e enviar-lhe credenciais.
- [ ] Sei activar/desactivar um acesso sem eliminar o utilizador.
- [ ] Sei criar um parceiro financiador ligado a uma carteira com portal activo.

---

### 3.10 Configurações: Empresa, Contas, Permissões, Aparência

**Objetivo.** Configurar os dados da instituição, o branding, os serviços e as
políticas que o sistema aplica.

Menu **Sistema → Configurações** — tem quatro secções no painel lateral:

#### 3.10.1 Empresa

[SCREENSHOT: Configurações → Empresa com o logotipo, dados gerais, contacto, contrato de concessão e serviço de SMS]

1. **Logotipo** — **Carregar Logo** (PNG/JPG/SVG, **máx. 2 MB**). O logo aparece
   no menu lateral e nos relatórios/recibos. Pode **Remover**.
2. **Dados Gerais**: **Nome da Empresa ***, **Remetente SMS**, **NUIT**, **Website**.
3. **Contacto**: **Email**, **Telefone**, **Endereço**, **Gestor / Responsável**,
   **Multa (%)** (a percentagem diária de mora — ver 3.8).
4. **Contrato de Concessão** — interruptor **"Ocultar cláusula de seguro
   (VIGÉSIMA PRIMEIRA)"**. Quando ligado, o contrato gerado deixa de incluir essa
   cláusula. **Só o Administrador pode alterar.**
5. **Serviço de SMS** — interruptor **"Autorizar envio de SMS"**. Quando
   **desactivado, nenhum SMS é enviado**: credenciais de acesso, avisos de
   aprovação, confirmações de pagamento, alertas e anúncios ficam **em fila**
   até voltar a activar. **Só o Administrador pode alterar.**
6. Clique em **Salvar Alterações**.

**Erros comuns:** *"Obrigatório"* no Nome da Empresa → preencha. *"Ficheiro muito
grande. Máximo 2MB."* → comprima a imagem.

#### 3.10.2 Contas Bancárias (Configurações)

Duplicação simplificada da gestão de contas (ver 3.3).

#### 3.10.3 Permissões

[SCREENSHOT: Configurações → Permissões com os interruptores do perfil Gestor de Crédito e a tabela-resumo]

Mostra os interruptores de permissões do **Gestor de Crédito** (ver mutuários,
cadastrar, editar, desactivar, ver créditos, submeter documentos, submeter
garantias, simular) e, **bloqueados para alteração**, os itens **Aprovar Crédito**,
**Registar Pagamento** e **Ver Relatórios**. Há um botão **Guardar Permissões**.

> **Aviso honesto:** **[Em desenvolvimento]** — esta página guarda as escolhas
> apenas no **navegador** (memória local) e **não altera as permissões reais do
> servidor**. Serve hoje como documentação visual da matriz de permissões.
> As permissões efectivas são decididas pelo **perfil** do utilizador
> (Administrador / Gestor / Operador) e pelas regras do sistema descritas neste
> manual. Não conte com esta página para restringir acessos.

#### 3.10.4 Aparência

Tema e cores da interface (claro/escuro e estilo de menu).

**Consegues fazer isto sozinho?**
- [ ] Sei carregar o logotipo da empresa e guardar os dados gerais.
- [ ] Sei onde se desliga/liga o serviço de SMS e o que isso implica.
- [ ] Sei onde está a percentagem de mora (Multa %).
- [ ] Entendo que a página Permissões ainda não controla acessos a sério.

---

### 3.11 Auditoria / Histórico (Logs)

**Objetivo.** Ver quem fez o quê, quando e de que endereço IP.

[SCREENSHOT: Página Histórico com os filtros (Tipo de Acção, Módulo, Pesquisar) e a tabela de registos]

1. Menu **Sistema → Histórico**.
2. Filtre por **Tipo de Acção** (LOGIN, LOGOUT, CRIAR, EDITAR, ELIMINAR,
   APROVAR, REJEITAR, PAGAR, PAGAMENTO PARCIAL, EXPORTAR, CONFIGURAR, ACTIVAR,
   DESACTIVAR), por **Módulo** (Autenticação, Mutuários, Créditos, Pagamentos,
   Relatórios, Configurações, Utilizadores, Documentos, Garantias, Taxas de
   Juro, Contas Bancárias, SMS) ou **Pesquise** por texto.
3. Clique no **olho** de um registo para ver os detalhes: data/hora, utilizador
   (e perfil), acção, módulo, descrição e **IP**.
4. **Eliminar** um registo individual ou **Eliminar Selecionados** (selecção
   múltipla) — com confirmação. Esta operação é irreversível e reforça a
   necessidade de prudência.
5. **Exportar** — **[Em desenvolvimento]** (mostra a mensagem "Exportação em
   desenvolvimento"). Para levar o histórico para fora do sistema, use uma
   captura de ecrã ou peça apoio técnico.

**Dica prática.** Consulte o Histórico quando houver divergência de dinheiro:
comece pelos filtros **Acção = PAGAR** e **Módulo = Pagamentos** do dia em causa.

**Consegues fazer isto sozinho?**
- [ ] Sei filtrar o histórico por acção, módulo ou texto.
- [ ] Sei ver os detalhes de um registo, incluindo o IP.
- [ ] Sei que a exportação do histórico ainda não funciona.

---

### 3.12 Relatórios Globais

#### 3.12.1 Relatório Banco de Moçambique (BM)

**Objetivo.** Produzir o reporte institucional para o Banco de Moçambique a
partir dos dados do sistema.

[SCREENSHOT: Página Relatório BM com filtros de datas, botões PDF/Excel, Dados da Instituição e Notas]

1. Menu **Relatórios → Relatório BM**.
2. Escolha **Data Início** e **Data Fim**.
3. Consulte no ecrã os quadros do modelo (carteira de crédito, carteira em risco,
   situação financeira, notas explicativas).
4. **Dados da Instituição** — botão que abre um formulário para completar os
   campos que não vêm automaticamente do sistema: **Bairro**, **Cidade**,
   **Estado**, **Telemóvel**, **Nº de Trabalhadores**, **Data de Início das
   Actividades**, **Instituição(ões) Representada(s)**. Preencha e **Fechar** —
   estes dados alimentam o cabeçalho do relatório.
5. **Notas** — abre as notas explicativas que acompanham o relatório.
6. **PDF** — gera o relatório em PDF (o relatório tabelar + as notas
   explicativas). O botão fica desactivado sem dados.
7. **Excel** — descarrega o ficheiro Excel do modelo BM, com o aspecto
   original (bordas, fontes e formatação do modelo).

**Dica prática.** Faça o fecho do mês **antes** de gerar o relatório: garanta que
todos os pagamentos do período estão registados, que os desembolsos estão
classificados numa carteira e que os dados da instituição estão preenchidos.
Um relatório com dados incompletos é mais difícil de corrigir depois de entregue.

#### 3.12.2 Relatório de Financiadores (por carteira)

**Objetivo.** Gerar o relatório isolado de uma carteira/parceiro (desembolsos e
recebimentos) e enviá-lo por e-mail ao financiador.

[SCREENSHOT: Página Relatório de Financiadores com o seletor de carteira, datas, e-mail do destinatário e os botões Excel/Imprimir]

1. Menu **Financiamento → Relatório Financiadores**.
2. Escolha a **Carteira / Fundo ***.
3. Defina o período (**De / Até**) ou use os atalhos **Hoje**, **7 dias**,
   **Este mês**, **Este ano**; clique em **Aplicar**.
4. Analise os quadros: créditos da carteira, prestações, mora e recebimentos.
5. **Exportar Excel (2 abas)** — descarrega o ficheiro com duas folhas.
6. **Imprimir / PDF** — abre a vista de impressão.
7. **Enviar por e-mail** — abra o diálogo, indique os **E-mail(s)
   destinatário(s) ***, o **Assunto *** e a **Mensagem**, e clique em **Enviar**.

> **Nota:** o relatório oficial do **Banco de Moçambique** continua
> **consolidado** (não discrimina carteiras). O relatório de financiador é
> adicional e serve para prestar contas a cada parceiro.

#### 3.12.3 Exportações de grelhas

Em várias listas (Mutuários, Créditos, Pagamentos, Prestações) existem botões
**PDF** e **Excel** que exportam exactamente o que está no ecrã (com filtros
aplicados) e com totais.

**Consegues fazer isto sozinho?**
- [ ] Sei gerar o relatório BM em PDF e em Excel.
- [ ] Sei preencher os "Dados da Instituição" do relatório BM.
- [ ] Sei gerar o relatório de um financiador e enviá-lo por e-mail.
- [ ] Sei exportar qualquer grelha para PDF e Excel.

---

### 3.13 Microcrédito BM (módulo) — visão do ADMIN

O módulo descrito em **2.14** está acessível ao ADMIN no mesmo formato
(consulta + reporte trimestral BM). Para além disso, o ADMIN vê aqui a ligação
entre o **crédito core** e os quadros do modelo BM: capital, juro, risco por
classe (I a IV), situação financeira trimestral e advertências sobre campos que
precisam de validação manual.

> **Reforço:** neste módulo **não se criam** clientes, créditos, financiamentos
> nem pagamentos (a escrita está desactivada por desenho, para não gerar dados
> duplicados). Use sempre Mutuários, Créditos, Pagamentos e Caixa.

**Consegues fazer isto sozinho?**
- [ ] Sei gerar o reporte trimestral BM e o respectivo Excel.
- [ ] Sei ler as advertências de campos a revisar.
- [ ] Entendo que este módulo é só de consulta.

---

### 3.14 Painel de Financiadores e as suas Carteiras

**Objetivo.** Dar a cada financiador (parceiro externo, fundo ou linha de
crédito bancário) um **painel próprio, de leitura**, com os números da **sua
carteira**: capital, desembolsos, recebimentos, prestações, mora, extrato e
recibos. Este painel é o **Portal do Financiador** (`/parceiro`); o ADMIN gere-o
do lado de cá — preparando a **carteira** (3.6) e criando o **acesso**.

> **Nota single-tenant:** o painel é sempre **por carteira**. Numa instalação
> single-tenant existe uma só empresa (a sua), mas continua a fazer sentido
> **uma carteira por fonte de capital** (fundo próprio, cada parceiro, cada
> linha bancária) — é isso que permite dar a cada financiador um painel e um
> relatório isolados, sem lhe mostrar as restantes carteiras da instituição.

**Pré-requisitos (nesta ordem)**
1. A **carteira** existe, está **activa**, tem **"Esta carteira pertence a um
   parceiro externo"** marcado e **"Dar acesso ao portal do financiador" +
   "Portal activo"** ligados (3.6).
2. A **conta real** de desembolso/reembolso existe (3.3).
3. As **taxas** estão vinculadas à carteira ou à conta (3.7).

**Criar o acesso (ADMIN)**
1. **Sistema → Equipa e Parceiros → aba Parceiros Financiadores → Novo Membro**.
2. Perfil **Parceiro Financiador**; escolha a **carteira**; preencha nome,
   e-mail e senha.
3. Crie. O financiador entra com este e-mail/senha na **mesma página de login**
   do sistema e cai directamente no seu painel (`/parceiro/dashboard`).

[SCREENSHOT: Portal do Financiador — cabeçalho verde "Portal do Financiador" com o nome da instituição, o selo da carteira (código · parceiro) e o menu lateral "A minha carteira"]

#### 3.14.1 Anatomia do portal (o que o financiador vê sempre)

- **Cabeçalho** — "Portal do Financiador", nome da instituição, e o **selo da
  carteira** (código + nome do parceiro). Tem também o interruptor de modo
  escuro/claro e o botão **Sair**.
- **Menu lateral "A minha carteira"** — 8 itens: **Painel**, **Créditos
  desembolsados**, **Prestações pagas**, **Prestações pendentes**, **Juros de
  mora**, **Recebimentos**, **Extrato da carteira** e **Recibos**.
- **Cartão-resumo da carteira** (no fundo do menu) — **Capital alocado** com
  barra de utilização, **Desembolsado** e **Disponível**. Se a carteira não tem
  limite definido, mostra "sem limite".

#### 3.14.2 Painel (`/parceiro/dashboard`)

**Objetivo.** Visão completa da carteira com filtros de período.

[SCREENSHOT: Painel da carteira com o cartão de capital (Alocado/Desembolsado/Disponível e barra de utilização), os 9 cartões KPI e o gráfico de desembolsos vs. recebimentos]

1. No topo, o **título "Painel da carteira"** com o **selo/código** e o nome da
   carteira, e os filtros **De** e **Até** (datas aplicam-se automaticamente ao
   mudar) com os botões **Limpar período** e **Actualizar**.
2. O cartão de **capital** mostra:
   - **Capital alocado pelo financiador**;
   - **Total desembolsado**;
   - **Saldo analítico disponível**;
   - **Barra de utilização do capital** (verde; **laranja** a partir de 85%;
     **vermelha** quando esgotado) e a percentagem de utilização.
3. Os **9 cartões KPI**: **Recebimentos (total)** com o capital recebido por
   baixo, **Juros recebidos** com os pendentes, **Mora gerada** com a já
   recebida, **Mora pendente** com o nº de prestações em atraso, **Créditos
   desembolsados**, **Clientes financiados**, **Prestações pagas** (com o total),
   **Prestações pendentes** (com as em atraso) e **Saldo a receber dos clientes**
   (capital + juros por receber).
4. Se definir um período (**De/Até**) aparecem ainda **Desembolsado no
   período** e **Recebido no período**.
5. O gráfico **"Desembolsos vs. recebimentos (mensal)"** mostra a evolução
   mês a mês. Sem movimentos, aparece o aviso *"Ainda não existem desembolsos
   nem recebimentos nesta carteira"* (normal enquanto a instituição não
   classificar créditos nesta carteira — ver 3.6, **Classificar créditos**).

#### 3.14.3 Créditos desembolsados (`/parceiro/creditos`)

**Objetivo.** Lista dos créditos financiados por esta carteira.
- Filtros **De / Até** e botão **Actualizar**.
- Cada linha mostra o mutuário, os valores do crédito e um **selo vermelho
  "N em atraso"** quando existem prestações vencidas.
- **Expandir a linha** abre as **prestações desse crédito** (ordem, valor,
  vencimento e estado) no mesmo ecrã.
- Sem registos: *"Sem créditos desembolsados nesta carteira."*

#### 3.14.4 Prestações pagas e Prestações pendentes (`/parceiro/prestacoes-pagas` e `/parceiro/prestacoes-pendentes`)

**Objetivo.** Acompanhar o cumprimento do plano pela carteira.
- Filtros **De / Até** e botão **Actualizar**.
- 3 cartões KPI: **Prestações listadas**, **Valor pendente (vista)** e, consoante
  o ecrã, **Valor pago (vista)** ou **Mora gerada (vista)**.
- Tabela das prestações com o cliente, valor, vencimento e estado.

#### 3.14.5 Juros de mora (`/parceiro/mora`)

**Objetivo.** Ver o custo do atraso gerado por esta carteira.
- 3 KPIs: **Mora gerada (em atraso)**, **Mora já recebida** e **Mora por
  receber** (com o nº de prestações em atraso).
- Gráfico **"Mora gerada vs. recebida por mês"**.
- Tabela das prestações em atraso. Sem atrasos: *"Não existem prestações em
  atraso nesta carteira."* (neste caso o financiador costuma perguntar — é
  sinal bom, pode responder com o próprio painel).

#### 3.14.6 Recebimentos (`/parceiro/recebimentos`)

**Objetivo.** Histórico dos pagamentos recebidos pelos créditos desta carteira.
- Filtros **De / Até** e botão **Actualizar**.
- 3 KPIs: **Total recebido (vista)** com o nº de pagamentos, **Juros recebidos
  (vista)** e **Mora recebida (vista)**.
- Tabela com data, cliente, crédito, valores e o **nº do recibo** (clicável para
  abrir o recibo, ver 3.14.8).

#### 3.14.7 Extrato da carteira (`/parceiro/extrato`)

**Objetivo.** O extrato oficial da carteira para prestar contas ao financiador.
- Filtros **De / Até** e botão **Actualizar**.
- Quadro-resumo (valores de capital, juros e mora) e as duas tabelas:
  **Desembolsos** e **Recebimentos** do período.
- Botões **Excel** (descarrega o extrato) e **Imprimir** (vista de impressão /
  PDF pelo navegador).

#### 3.14.8 Recibos (`/parceiro/recibos`)

**Objetivo.** Consultar e descarregar os recibos fiscais dos pagamentos da
carteira.
- Lista com o nº do recibo, o valor, a data e o botão **Abrir recibo em PDF**.
- Sem registos: *"Sem recibos emitidos para esta carteira."*
- Os recibos são os mesmos emitidos pelo sistema no momento do pagamento (3.10)
  — o portal apenas os apresenta, já emitidos, sem possibilidade de os alterar.

#### 3.14.9 O que o financiador NÃO pode fazer (fronteira do portal)

- **Não edita** nada: sem criação/alteração de créditos, pagamentos ou
  documentos;
- **Não vê** o painel da instituição, os restantes ecrãs (caixa, equipa,
  configurações) nem o **relatório do Banco de Moçambique**;
- **Não escolhe carteiras**: o portal é **limitado à carteira da sua conta** —
  o backend filtra tudo pela carteira do utilizador e **nenhum pedido do portal
  aceita outra carteira como parâmetro**, mesmo que se altere o endereço no
  navegador.

#### 3.14.10 Do lado do ADMIN — acompanhar e prestar contas

- **Relatório de Financiadores** (**Financiamento → Relatório Financiadores**,
  ver 3.12.2) — gera o mesmo tipo de números do portal em **Excel (2 abas)** ou
  **PDF** e envia-os **por e-mail** ao financiador, com o anexo já fechado;
- **Carteiras** (3.6) — é ali que se cria a carteira, se marca como de parceiro
  externo, se activa o portal e se **classificam os créditos** que passam a
  aparecer no painel do financiador;
- **Equipa e Parceiros** (3.9) — criar/editar/retirar o acesso do parceiro.

**Erros comuns**
| Mensagem | Causa | Solução |
|---|---|---|
| *"O acesso ao portal desta carteira está desactivado. Contacte o Administrador da MBRM."* | Portal da carteira desligado | Activar **Portal activo** na carteira (3.6). |
| *"Carteira de financiamento não encontrada."* | A carteira do acesso não existe/está inactiva | Corrija a carteira do utilizador em Equipa e Parceiros (3.9). |
| **Sem carteira — corrija o acesso** (na lista de equipa) | O parceiro ficou sem carteira associada | Edite o membro e seleccione a carteira. |
| Painel do financiador sem movimentos | Os créditos ainda não estão classificados nesta carteira | Classifique os créditos na página Financiamento (3.6). |
| O financiador vê valores diferentes do esperado | Filtro de período activo no painel | Peça-lhe para limpar o período (**Limpar período**) e rever o total. |

**Consegues fazer isto sozinho?**
- [ ] Sei preparar a carteira (parceiro externo + portal activo) antes de criar o acesso.
- [ ] Sei criar o utilizador do parceiro ligado à carteira certa.
- [ ] Sei explicar ao financiador o que ele vê em cada um dos 8 ecrãs do portal.
- [ ] Sei dizer o que o financiador **não** pode fazer (só leitura, só a sua carteira).
- [ ] Sei gerar e enviar o relatório da carteira por e-mail (3.12.2).

---

### 3.15 Super Admin (só para conhecimento)

O perfil **0 = Super Admin** administra a **plataforma** (não a instituição):
tem os ecrãs **Painel da Empresa** (`/company`) e **Configurações** (gestão de
Super Admins e **planos de subscrição**), e é quem **aprova, rejeita ou suspende
novas empresas** que se registam publicamente. Está fora do âmbito deste manual.

Existe ainda um **registo público de empresa** na página inicial
(`/registar-empresa`), com escolha de plano de subscrição. A empresa só passa a
funcionar depois da aprovação do Super Admin.

> **Numa instalação single-tenant estes ecrãs não fazem parte da operação:**
> existe uma única empresa (a sua), já activa, e não há registo público de
> novas empresas nem aprovações a fazer. O perfil Super Admin fica apenas como
> perfil técnico de manutenção da plataforma.

---

## 4. Glossário e FAQ

### 4.1 Glossário

| Termo | O que significa no sistema |
|---|---|
| **Mutuário** | O cliente do crédito. Pessoa física (**PF**) ou empresa (**PJ**). |
| **Conta (nº de conta)** | O número que identifica o mutuário na instituição (começa em 100). É a chave usada em créditos, pagamentos e documentos. |
| **KYC** | *Know Your Customer*. No sistema, a checklist de documentos do cliente. Os 3 base (**BI/Passaporte, NUIT, Comprovativo de rendimentos**) bloqueiam qualquer crédito. |
| **Capacidade de pagamento (1/3)** | Regra que limita a prestação mensal a **um terço do rendimento mensal** declarado. Exceder exige **parecer** escrito. |
| **Simulação** | Cálculo do plano (prestação, juros, total) antes de submeter o pedido. Não grava nada. |
| **Pedido / Solicitação de crédito** | O pedido do cliente, em estado **Pendente** até ser aprovado ou rejeitado. |
| **Aprovação** | Emissão do crédito. **No sistema, aprovar = desembolsar**: gera o plano, marca o crédito como desembolsado e movimenta o dinheiro. |
| **Desembolso** | O momento em que o dinheiro sai para o cliente. Regista a saída no caixa e na conta de origem. |
| **Plano de amortização** | A tabela das prestações: capital + juros de cada mês (sistema francês/Price). |
| **Prestação** | A parcela mensal. Estados: **Pendente**, **Pago Parcial**, **Pago**. |
| **Mora** | Juros de atraso. Percentagem **por dia** sobre o **saldo em falta** da prestação. |
| **Forfeit / Multa (%)** | O valor configurado em Configurações → Empresa que define a percentagem diária de mora. |
| **Reestruturação** | **Não existe** como função no sistema (ver secção 5). O que existe é: **reabrir** um pedido rejeitado (editar valor/prazo/taxa) e **invalidar** um desembolso sem pagamentos. |
| **Carteira (de financiamento)** | Classificação **analítica** da origem do capital (fundo, parceria, financiador). Serve para medir limites e relatórios por parceiro. **Não é conta bancária.** |
| **Conta real / Carteira Real** | Onde o dinheiro efectivamente está: conta bancária, mobile money ou caixa físico. |
| **Saldo analítico vs. saldo real** | Analítico = limite de uma carteira de financiamento. Real = dinheiro disponível na conta. Ambos têm de cobrir o crédito. |
| **Alocado / Desembolsado / Disponível** | Na carteira: o limite atribuído, o já emprestado, e o que ainda resta. |
| **Portal do Financiador** | Painel de **leitura** do parceiro financiador (perfil 4), limitado à carteira da sua conta: capital, créditos, prestações, mora, recebimentos, extrato e recibos (ver 3.14). |
| **Taxa administrativa** | Comissão de preparos, cobrada **uma única vez** no desembolso (percentagem do montante). |
| **Recibo** | Documento legal do pagamento, com numeração sequencial anual (`REC-AAAA-00001`). |
| **Liquidação total** | Pagamento de todas as prestações em aberto numa única operação atómica (tudo ou nada). |
| **Crédito a favor do mutuário** | Valor pago a mais que fica registado e abate nos pagamentos seguintes. |
| **Caixa do dia** | Registo diário de abertura, movimentos e fecho de dinheiro, **por utilizador**. Obrigatório para movimentar dinheiro. |
| **Carteira activa / Em risco** | Total de capital emprestado e ainda por receber / parte desse capital em atraso. |
| **Classes de risco (I–IV)** | Escalões de risco usados no reporte BM, atribuídos pelo atraso. |
| **Parecer** | Justificação escrita obrigatória quando a prestação excede 1/3 do rendimento (ou quando se perdoa dívida). |
| **Concessão (pacote)** | Conjunto de documentos legais do crédito (contrato, termo, plano, garantias) emitido no desembolso, com hash e QR Code — imutável. |
| **Idempotência** | Mecanismo que impede que um duplo clique registe o mesmo pagamento duas vezes. |
| **Empresa (tenant)** | A instituição dona da instalação. Numa instalação **single-tenant** existe **uma única empresa** — todos os dados do sistema pertencem a ela. |

### 4.2 Perguntas frequentes

**1. Não consigo aprovar um crédito e a mensagem fala de caixa. O que faço?**
O desembolso exige o **caixa do dia aberto para o seu utilizador**. Como o ecrã
de caixa está reservado ao ADMIN, peça ao ADMIN para abrir o **Caixa do Dia** e
fazer o desembolso (ou criar-lhe acesso adequado). Ver 2.7.8.

**2. Porque é que o sistema não me deixa criar o crédito?**
Quase sempre é **KYC incompleto**. Verifique a aba **Documentos & KYC**: faltam
BI/Passaporte, NUIT ou Comprovativo de rendimentos.

**3. Aparece "a prestação excede 1/3 do rendimento". O que é preciso?**
Recolher um **parecer**: motivo, justificação com **pelo menos 50 caracteres** e
o **PDF do parecer**. O sistema aceita excepções, mas quer o registo escrito.

**4. Posso aprovar sem garantias registadas?**
Não. As garantias têm de cobrir **capital + juros**. Registe as garantias na aba
**Garantias & Recibos** antes de aprovar.

**5. Esqueci-me da senha. Como recupero?**
Não existe recuperação automática. Peça ao ADMIN para **Repor senha** (volta a
`123456`) ou envie credenciais por SMS/WhatsApp. Depois altere em **Perfil**.

**6. O cliente reclamou que pagou, mas o sistema não registou. O que faço?**
Vá a **Créditos → ícone de pagamentos** do crédito (ou à aba Plano de
Amortização) e **registe o pagamento** com a data e a referência reais. Se já
existir, o sistema recusa a referência duplicada — sinal de que já estava
registado.

**7. O sistema não deixa eliminar um crédito. Porquê?**
Porque já tem **pagamentos registados**. É uma protecção: apagar o crédito
apagaria também o histórico financeiro.

**8. Posso desfazer um desembolso feito por erro?**
Sim, com **Invalidar desembolso** — mas **só enquanto não houver pagamentos**.
O crédito volta a Pendentes e o plano é removido.

**9. Um pagamento ficou a mais. Para onde vai o excesso?**
O sistema **abate automaticamente** nas prestações seguintes. Se não houver mais
nenhuma, fica como **crédito a favor do mutuário**.

**10. O recibo saiu sem QR Code. Está errado?**
Não. A numeração sequencial legal está activa, mas a impressão dos elementos do
selo electrónico da Autoridade Tributária depende de uma **licença/configuração**
(`AT_CERTIFICADO_ENABLED`), actualmente desligada. Os dados (hash e código de
validação) são gravados e a página pública `/validar` funciona.

**11. O cliente registou-se sozinho no site. O que devo fazer?**
Vá a **Créditos → Pendentes**: os pedidos de auto-cadastro aparecem com o selo
**Auto-cadastro**. Use **Revisar documentos** e peça os documentos que faltarem
com o botão **Solicitar documentos**.

**12. Porque é que o menu "Permissões" não muda nada?**
Porque, na versão actual, as permissões são decididas pelo **perfil** do
utilizador. A página Permissões guarda as escolhas apenas no navegador (ver 3.10.3).

**13. O parceiro financiador não consegue entrar. Porquê?**
Verifique, por esta ordem: a carteira tem **portal activo**? O utilizador está
ligado a essa carteira? A conta de parceiro está **activa**?

**14. Os SMS não saem. O que verificar?**
Se o ADMIN tiver **desactivado o envio de SMS** em Configurações → Empresa,
**nada sai** — as mensagens ficam em fila (ver 2.13 e 3.10.1).

**15. Posso trabalhar sem lhe dar o Rendimento Mensal do cliente?**
Pode cadastrar, mas **não** consegue validar a regra de 1/3 nem justificar a
aprovação devidamente. Preencha sempre.

**16. O que exactamente o financiador vê no painel dele?**
Oito ecrãs só de leitura sobre a **carteira dele**: Painel (capital alocado,
desembolsado, disponível, KPIs e gráfico mensal), Créditos desembolsados,
Prestações pagas, Prestações pendentes, Juros de mora, Recebimentos, Extrato
(com Excel e impressão) e Recibos (PDF). Ver 3.14.

**17. O financiador consegue ver outras carteiras ou dados da instituição?**
Não. O portal é limitado **à carteira da conta dele** — nem mesmo alterando o
endereço no navegador ele acede a outra carteira, ao caixa, à equipa, às
configurações ou ao relatório do Banco de Moçambique (ver 3.14.9).

**18. Temos uma só empresa no sistema. Porque é que existem "empresas" e
carteiras?**
A instalação é **single-tenant**: existe uma única empresa (a sua) e não há
selecção de instituição. As **carteiras** continuam a ser úteis mesmo assim:
cada uma representa uma **fonte de capital** (fundo próprio, cada parceiro,
cada linha bancária) e é isso que permite isolar os números e o acesso de cada
financiador (ver 1.1 e 3.14).

### 4.3 Mensagens de erro frequentes (referência rápida)

| Mensagem no ecrã | Tradução | O que fazer |
|---|---|---|
| *"Token is required!"* | Sessão expirada | Volte a entrar. |
| *"Token invalid"* | Sessão inválida | Volte a entrar. |
| *"Abra o caixa do dia para continuar."* | Caixa fechado | ADMIN abre o Caixa do Dia. |
| *"Desembolso bloqueado: checklist KYC incompleta…"* | Faltam documentos | Carregue os documentos em falta. |
| *"A prestação excede 1/3 do rendimento mensal…"* | Fora do limite | Preencha o parecer (≥10 caracteres no servidor, ≥50 no ecrã) + PDF. |
| *"Valor acima do devido (…)"* | Pagou mais | Aceite o excesso ou corrija o valor. |
| *"A referência "X" já foi usada neste método de pagamento."* | Referência duplicada | Use outra referência ou confirme que já está registado. |
| *"Saldo insuficiente na conta seleccionada (…)"* | Conta sem dinheiro | Transfira fundos ou escolha outra conta. |
| *"Saldo analítico da carteira insuficiente para este desembolso"* | Carteira no limite | Escolha outra carteira/aumente o capital alocado. |
| *"Já existe um mutuário com este telefone, email, NUIT ou BI."* | Duplicação | Corrija a identificação ou localize o mutuário existente. |
| *"Não é possível eliminar este crédito porque existem N pagamento(s)…"* | Crédito com histórico | Não elimine; use a aba Terminados. |
| *"Pacote já emitido"* | Contrato imutável | Para novo contrato é preciso invalidar o desembolso. |

**Consegues fazer isto sozinho?**
- [ ] Sei o significado dos termos que uso todos os dias (mora, KYC, carteira, desembolso).
- [ ] Sei onde procurar a resposta a um erro na tabela de referência rápida.
- [ ] Sei a quem pedir ajuda quando o erro não está nesta lista.

---

## 5. O que o sistema AINDA NÃO FAZ (com base no código)

Esta lista é deliberadamente franca. Cada ponto foi verificado no código-fonte da
versão actual. Nada aqui é suposição.

### 5.1 Limitações de permissões e operação

1. **O Gestor de Crédito não consegue concluir desembolsos nem registar
   pagamentos.** Estas operações exigem que **o próprio utilizador** tenha o
   **caixa do dia aberto**, e a abertura de caixa existe apenas nos ecrãs
   **Caixa** e **Caixa Central**, reservados ao perfil **Administrador**.
   Consequência: o Gestor recebe *"Abra o caixa do dia para continuar"* e não
   tem, no menu, forma de resolver. **Solução actual: o ADMIN faz o desembolso e
   o registo de pagamentos.**
2. **Itens do menu que o Gestor vê mas não consegue abrir:**
   - **Painel** (leva a `/dashboard`, reservado a Administrador/Operador) →
     redirecciona para o Painel do Gestor;
   - **Controle Prestações** (`/admin/installments`) → reservado ao
     Administrador; redirecciona para o Painel do Gestor.
3. **O ecrã "Mensagens" (SMS) não aparece no menu do Gestor**, embora o perfil
   tenha autorização para ele: só se chega escrevendo o endereço
   `/sms/pendentes` manualmente.
4. **A página "Permissões" (Configurações → Permissões) não controla acessos.**
   Guarda as escolhas no navegador (memória local) e não as aplica no servidor.
   As permissões reais são definidas pelo perfil do utilizador e pelas regras
   fixas do sistema.
5. **A matriz de permissões apresentada no ecrã diz que o Gestor não aprova nem
   regista pagamentos**, mas o servidor permite que ele tente as duas operações —
   apenas a falta de caixa aberto o impede. Ou seja: o ecrã e o servidor não
   estão alinhados.

### 5.2 Funcionalidades que não existem

6. **Não existe recuperação de senha pelo próprio utilizador** (sem link
   "Esqueci-me da senha" nem e-mail de reposição). Só a reposição pelo ADMIN ou
   o envio de credenciais.
7. **Não existe troca obrigatória de senha no primeiro acesso.** A senha padrão
   `123456` (quando não é definida outra) mantém-se até alguém a mudar
   voluntariamente.
8. **Não existe reestruturação de crédito** (alterar prazo/valor de um crédito
   já desembolsado, criar plano novo, carência). O que existe: **reabrir pedidos
   rejeitados** e **invalidar desembolsos sem pagamentos**.
9. **Não existe renovação/refinanciamento automático** de créditos nem crédito
   "top-up" sobre crédito activo.
10. **Não existe ecrã de configuração avançada de mora** (dias de carência,
    limite máximo de dias, tecto da mora, dias úteis). O sistema suporta estas
    regras internamente, mas apenas o campo **Multa (%)** é editável no interface.
    Configurações avançadas exigem intervenção técnica direta na base de dados.
11. **Não existe envio de SMS/WhatsApp pelo gestor a partir da grelha de
    prestações**: os botões existem, mas mostram "Em desenvolvimento". O envio
    real de SMS existe nos fluxos de **credenciais**, **solicitação de
    documentos**, **alertas de desembolso** e **fila de mensagens**.
12. **A página "Notificações"** (`/notifications`) está **em construção** — é um
    aviso, não um ecrã funcional. As notificações aparecem no **sino** (navbar).
13. **A exportação do Histórico (Logs) não funciona** — mostra "Exportação em
    desenvolvimento".
14. **Não existe módulo de contabilidade formal** (razão, balanço, DRE,
    reconciliação bancária automática). Existem caixa, contas, movimentos e
    extratos, mas não contabilidade.
15. **Não existe gestão de agências/caixas por agência.** O conceito de
    "agência" não está implementado: existe **um caixa por utilizador**, sem
    divisão por agência física.
16. **Não existe assinatura digital do cliente no desembolso** nem captura de
    biometria; a prova é o pacote de concessão gerado (com hash + QR).
17. **O selo electrónico da Autoridade Tributária não é impresso no recibo**
    enquanto `AT_CERTIFICADO_ENABLED` estiver desligado. A numeração sequencial
    legal, o hash e a página pública de validação **funcionam**.
18. **O módulo de IA (assistente "Maismola") está desactivado** — a rota
    `/api/ai-bot` não é registada no sistema.
19. **Não existe multi-moeda na operação diária** (as contas podem ser
    registadas em MZN/USD/ZAR, mas créditos, mora e relatórios trabalham em MZN).
20. **Não existe aplicação móvel nativa.** O sistema é uma aplicação web; o
    **Portal do Mutuário** e o **Portal do Parceiro** são páginas web (funcionam
    no navegador do telefone).

### 5.3 Pontos de atenção (funcionam, mas exigem cuidado)

21. **Aprovar é desembolsar.** Não há um passo separado de "aprovação sem
    desembolso". Isto obriga a ter caixa aberto, conta com saldo, carteira com
    disponível e garantias suficientes **no mesmo momento**.
22. **A data de desembolso define todo o plano.** Se for corrigida mais tarde, as
    datas das prestações têm de ser recalculadas (existe função própria para
    isso) — e a mora já calculada pode mudar de valor.
23. **Os documentos do pacote de concessão são imutáveis.** Corrigir o contrato
    de um crédito já desembolsado exige invalidar o desembolso — o que não é
    possível com pagamentos registados.
24. **O caixa diário está isolado** das contas bancárias: os movimentos de caixa
    não substituem os extratos bancários. A conferência entre caixa, contas e
    recibos é manual.

---

### 5.4 Como manter este manual actualizado

Este manual fica desactualizado sempre que um ecrã muda de nome, muda de perfil
de acesso ou desaparece. Para não depender da memória de ninguém, existe uma
**auditoria automática** que compara este documento com o código real:

```
npm run audit:manual            # relatório completo (código de saída 1 se divergir)
npm run audit:manual -- --quiet # só as divergências
npm run audit:manual -- --json  # para integrar em CI
```

Ela verifica, entre outras coisas: (1) se cada item do menu do Gestor descrito em
**2.0** ainda existe no menu real; (2) se cada ✅/❌/— da tabela de **3.0**
bate certo com as permissões reais de cada ecrã; (3) se cada caminho de URL citado
neste manual existe; (4) se cada funcionalidade marcada como
**em desenvolvimento** continua realmente inacabada; (5) se as regras do caixa
descritas em **2.7.8** e **3.2** continuam válidas.

Também prova que sabe falhar (`npm run audit:manual -- --self-test`): estraga
este manual de propósito num ficheiro temporário e exige detectar o estrago.
Se o auto-teste passar, o relatório verde é de confiança.

**Consegues fazer isto sozinho?**
- [ ] Sei que existe um comando que me diz se este manual ainda corresponde ao sistema.
- [ ] Se a auditoria acusar divergência, sei que o manual (ou o código) tem de ser corrigido antes de formar alguém com ele.

---

## 6. Fim do manual

**Resumo do que podes fazer sozinho, por perfil:**

**GESTOR DE CRÉDITO** — cadastrar mutuários, carregar KYC, simular, submeter
pedidos (com parecer quando necessário), analisar, aprovar/rejeitar, reabrir
pedidos, acompanhar prestações e mora, registar garantias, ver o plano de
amortização, acompanhar créditos por segmento, gerar/consultar documentos legais,
consultar o módulo de microcrédito e gerar o reporte BM. **Depende do ADMIN**
para abrir o caixa (necessário ao desembolso e aos pagamentos) e para criar
taxas, carteiras e contas.

**ADMIN DA MICROCRÉDITO** — tudo o que o Gestor faz, mais: abrir/fechar o caixa
do dia, gerir contas bancárias e transferências, ver e auditar todos os
pagamentos, controlar prestações globalmente, criar carteiras de financiamento e
taxas/produtos, configurar a empresa (logo, SMS, mora, contrato), gerir
utilizadores e parceiros financiadores, consultar a auditoria do sistema e
produzir os relatórios do Banco de Moçambique e dos financiadores.

> **Recomendação final:** antes de pôr equipas a trabalhar, o ADMIN deve, por
> esta ordem: (1) completar os **Dados da Empresa**; (2) criar as **Contas
> Bancárias** com finalidades DESEMBOLSO/REEMBOLSO; (3) criar as **Carteiras de
> Financiamento**; (4) criar as **Taxas de Juro** vinculadas; (5) criar os
> **utilizadores** (Gestores); (6) definir a **Multa (%)**; (7) abrir o **Caixa
> do Dia**. Sem estes sete passos, nenhum crédito pode ser desembolsado.

*Documento gerado a partir da análise do código-fonte. Versão 1.1 (espelhado
para instalação single-tenant; secção 3.14 — Painel de Financiadores e
carteiras — expandida) — Outubro de 2026.*
