# Sistema de Gestão de Microcrédito

## Documento Técnico e Funcional

---

## 1. Visão Geral

O **Sistema de Gestão de Microcrédito** é uma plataforma web completa, desenvolvida para instituições de microfinanças, cooperativas de crédito e operadores financeiros que necessitam de uma solução robusta para gerir todo o ciclo de vida do crédito — desde a concessão até ao reembolso final.

A plataforma opera em regime **multi-empresa (multi-tenant)**, permitindo que várias instituições utilizem o mesmo sistema com total isolamento de dados, configurações e identidade visual próprias.

### Principais Destaques

| Característica | Descrição |
|---|---|
| **Arquitectura** | Aplicação web responsiva (desktop e mobile) |
| **Multi-empresa** | Cada instituição opera com dados isolados e configurações independentes |
| **Amortização** | Sistema Francês (Tabela Price) com prestações fixas |
| **Integração M-Pesa** | Recebimento e desembolso via M-Pesa Open API |
| **Notificações** | Sistema em tempo real para todos os perfis de utilizador |
| **SMS** | Envio de SMS automáticos e manuais aos mutuários |
| **Exportação** | Relatórios em PDF e Excel (incluindo formato Banco de Moçambique) |
| **Portal do Cliente** | Área de auto-atendimento para mutuários |

---

## 2. Perfis de Acesso

O sistema define **três perfis de acesso** distintos, cada um com permissões e funcionalidades específicas:

```
┌─────────────────────────────────────────────────────┐
│                    ADMINISTRADOR                     │
│         Gestão total do sistema e empresa            │
├─────────────────────────────────────────────────────┤
│                      GESTOR                          │
│       Gestão operacional de créditos e clientes      │
├─────────────────────────────────────────────────────┤
│                     MUTUÁRIO                         │
│       Portal de auto-atendimento do cliente          │
└─────────────────────────────────────────────────────┘
```

---

## 3. Perfil: Administrador

O Administrador possui acesso total ao sistema e é responsável pela supervisão geral da instituição.

### 3.1 Painel Principal (Dashboard)

- Indicadores-chave (KPIs): total de mutuários, créditos activos, créditos pendentes, desembolsos realizados
- Visão consolidada de toda a carteira de crédito da instituição
- Prestações vencidas e próximas do vencimento

### 3.2 Gestão de Utilizadores

- Criar, editar e desactivar contas de utilizadores (administradores e gestores)
- Atribuir perfis de acesso (Administrador ou Gestor)
- Redefinir palavras-passe de utilizadores
- Envio de credenciais de acesso por e-mail

### 3.3 Gestão de Mutuários

- Cadastro completo do mutuário: dados pessoais, documento de identificação, profissão, rendimento mensal, contacto de emergência, cônjuge
- Pesquisa avançada por nome, telefone, NUIT ou número de conta
- Paginação e listagem com filtros
- Activar/desactivar mutuários
- Gestão de documentos do mutuário (upload e consulta)

### 3.4 Aprovação e Gestão de Créditos

- **Aprovar** ou **rejeitar** pedidos de crédito submetidos pelos gestores
- Criar plano de amortização para créditos aprovados (geração automática pelo Sistema Francês)
- Consultar o historial completo de créditos por mutuário
- Alterar o estado dos créditos (Pendente → Activo → Terminado)
- Registar desembolsos
- Visualizar tabela de amortização detalhada de cada crédito

### 3.5 Pagamentos de Prestações

- Registar pagamentos de prestações (manual ou via integração M-Pesa)
- Listagem paginada de todos os pagamentos da instituição
- Filtros por intervalo de datas, meio de pagamento e pesquisa livre
- Cálculo automático de juros de mora por atraso
- Meios de pagamento suportados:
  - Boca de Caixa (numerário)
  - Depósito Bancário
  - Transferência Bancária
  - POS
  - Cheque
  - SISTAFE
  - M-Pesa (USSD e Open API)
  - E-Mola
- Exportação da listagem em **Excel** e **PDF**

### 3.6 Relatórios

- **Relatório de Créditos Desembolsados**: listagem detalhada com capital, taxa de juro, valor da prestação, total com juros, datas de início e fim
- **Relatório Mensal para o Banco de Moçambique**: formato oficial com 13 colunas regulamentares (Nº operação, nome, data de desembolso, montante, finalidade, prestação, periodicidade, prazo, taxa, crédito em dívida, crédito em atraso, dias em atraso, PPEs)
- **Relatório de Pagamentos**: todas as transacções filtradas por período
- Indicadores resumidos (KPIs): total desembolsado, total com juros, número de créditos, total de prestações
- Exportação em **Excel** (múltiplas folhas com notas explicativas) e **PDF** (formato paisagem com logótipo BM)

### 3.7 Configurações da Empresa

- Dados da empresa: nome, e-mail, website, endereço, telefone, NUIT, responsável
- Logótipo personalizado (exibido na interface e nos documentos)
- **Taxa de juros de mora (forfeit)**: percentagem diária aplicada a prestações em atraso
- Gestão de taxas de juro: criar, editar e eliminar taxas disponíveis para simulação
- Gestão de contas de pagamento (contas bancárias, números M-Pesa para recebimento)
- Configuração do remetente de SMS

### 3.8 Notificações

- Notificações em tempo real no sino da barra de navegação
- Tipos de notificação: novo pedido de crédito, pagamento recebido, prestação vencida, prestação em atraso
- Contagem de notificações não lidas (actualização automática a cada 30 segundos)
- Marcar como lida (individual ou todas)

### 3.9 Registos do Sistema (Logs)

- Historial completo de acções realizadas no sistema
- Registo de autenticações (login/logout)
- Rastreabilidade de operações por utilizador, data e acção

### 3.10 SMS

- Envio de SMS aos mutuários (lembretes de pagamento, notificações)
- Historial de SMS enviados (filtrável por data e mutuário)
- Remetente personalizado por empresa

---

## 4. Perfil: Gestor (Técnico de Crédito)

O Gestor é o operador de campo responsável pela relação directa com os mutuários e pela instrução dos processos de crédito.

### 4.1 Painel do Gestor

- KPIs personalizados: total de mutuários, desembolsos próprios, créditos pendentes, créditos activos
- Visão filtrada — o gestor vê apenas os créditos que instruiu pessoalmente

### 4.2 Gestão de Mutuários

- Cadastro completo de novos mutuários
- Pesquisa e consulta de mutuários existentes
- Edição de dados cadastrais
- Upload de documentos do mutuário

### 4.3 Simulação e Pedido de Crédito

- **Simulação de crédito** com o Sistema Francês (Tabela Price):
  - Inserir capital, taxa de juro, número de prestações e data de início
  - Visualização da tabela de amortização completa antes da submissão
  - Cada linha mostra: prestação, amortização do capital, juros, saldo devedor
- **Verificação de elegibilidade**: o sistema valida automaticamente que a prestação mensal não excede 1/3 do rendimento mensal declarado pelo mutuário
- **Submissão do pedido**: o gestor submete o pedido com parecer técnico (descrição/opinião)
- Estado inicial: **Pendente** (aguarda aprovação do Administrador)

### 4.4 Acompanhamento de Créditos

- Consulta dos créditos submetidos e respectivo estado (pendente, activo, rejeitado, terminado)
- Visualização da tabela de amortização e pagamentos de cada crédito
- Registo de pagamentos de prestações
- Cálculo automático de juros de mora

### 4.5 Pagamentos

- Acesso à listagem completa de pagamentos da instituição
- Filtros por datas, meio de pagamento e pesquisa
- Exportação em Excel e PDF

### 4.6 Notificações

- Recepção de notificações sobre alterações de estado dos créditos
- Contagem de não lidas com actualização automática

### 4.7 Limitações do Perfil Gestor

| Funcionalidade | Gestor |
|---|---|
| Aprovar/rejeitar créditos | Não |
| Gerir utilizadores | Não |
| Configurar empresa | Não |
| Eliminar créditos | Não |
| Ver créditos de outros gestores | Não |

---

## 5. Perfil: Mutuário (Portal do Cliente)

O portal do cliente oferece uma experiência de auto-atendimento, permitindo que os mutuários acompanhem os seus créditos de forma autónoma.

### 5.1 Autenticação

- Login com número de telefone e palavra-passe
- Possibilidade de alterar a palavra-passe

### 5.2 Painel Principal

- KPIs pessoais: créditos activos, dívida total, próxima prestação, total pago
- Alerta de prestações vencidas com cálculo de juros de mora
- Resumo dos créditos activos com barras de progresso

### 5.3 Os Meus Créditos

- Listagem de todos os créditos (activos, pendentes, rejeitados, concluídos)
- Detalhes de cada crédito: montante, taxa de juro, número de prestações, estado
- **Tabela de amortização expansível** para cada crédito:
  - Ordem da prestação, data de vencimento, valor da prestação, juros de mora, total a pagar, estado (Paga/Pendente)
- Download do extracto em formato imprimível
- Progresso de pagamento (ex: "3/12 prestações pagas")

### 5.4 Os Meus Pagamentos

- Historial completo de pagamentos efectuados
- Filtros por data e meio de pagamento
- Detalhes: data, montante, juros de mora, método, referência, descrição

### 5.5 Pagamento via M-Pesa

- Instruções para pagamento via USSD (*150#)
- Referência de pagamento gerada automaticamente
- Pagamento via M-Pesa Open API directamente no portal
- Modal de confirmação com feedback do estado da transacção
- Geração de comprovativo de pagamento (recibo imprimível)

### 5.6 Solicitar Crédito

- Formulário de pedido de novo crédito
- Indicação do montante, número de prestações e finalidade
- Submissão automática para análise

### 5.7 Perfil

- Consulta de dados pessoais e número de conta
- Alteração de palavra-passe (mínimo 6 caracteres)

### 5.8 Notificações

- Notificações sobre: aprovação/rejeição de crédito, desembolso, confirmação de pagamento
- Actualização automática a cada 30 segundos

---

## 6. Sistema de Amortização

O sistema utiliza o **Sistema Francês (Tabela Price)**, o método mais utilizado em microfinanças:

### Fórmula da Prestação Fixa (PMT)

```
PMT = PV × [ i × (1 + i)^n ] / [ (1 + i)^n − 1 ]
```

Onde:
- **PMT** = Valor da prestação mensal fixa
- **PV** = Capital emprestado (principal)
- **i** = Taxa de juro mensal
- **n** = Número de prestações

### Características

- **Prestação fixa**: o mutuário paga sempre o mesmo valor mensal
- **Composição variável**: nos primeiros meses, maior parte da prestação é juros; nos últimos meses, maior parte é amortização do capital
- **Saldo devedor decrescente**: após cada pagamento, o saldo devedor diminui
- **Ajuste automático**: a última prestação é ajustada para compensar arredondamentos

### Juros de Mora

```
Mora = Prestação × (Taxa de Mora Diária / 100) × Dias em Atraso
```

- A taxa de mora diária é configurável por empresa (campo "forfeit")
- Calculada automaticamente para prestações vencidas e não pagas
- Adicionada ao valor total a pagar pelo mutuário

---

## 7. Integrações

### 7.1 M-Pesa Open API

| Operação | Descrição |
|---|---|
| **C2B (Customer to Business)** | Recebimento de pagamentos de prestações via M-Pesa |
| **B2C (Business to Customer)** | Desembolso de créditos aprovados directamente para o M-Pesa do mutuário |

### 7.2 SMS (TxtLocal API)

- Envio de SMS em massa ou individual
- Remetente personalizado por empresa
- Historial de SMS com filtragem

### 7.3 Exportação de Dados

| Formato | Utilização |
|---|---|
| **PDF** | Contratos, relatórios do BM, comprovativos de pagamento, extractos |
| **Excel (.xlsx)** | Relatórios analíticos, listagens de pagamentos, dados para auditoria |

---

## 8. Segurança

| Mecanismo | Descrição |
|---|---|
| **Autenticação JWT** | Tokens com validade de 1 hora (staff) e 15 dias (mutuários) |
| **Encriptação de Senhas** | Hashing com bcryptjs |
| **Rotas Protegidas** | Middleware de autenticação em todas as rotas da API |
| **Isolamento de Dados** | Cada empresa acede apenas aos seus próprios dados |
| **Registos de Auditoria** | Todas as acções críticas são registadas no sistema de logs |
| **Alteração Obrigatória** | Utilizadores novos devem alterar a palavra-passe no primeiro acesso |

---

## 9. Arquitectura Técnica

| Componente | Tecnologia |
|---|---|
| **Frontend** | Vue.js 2 + BootstrapVue |
| **Backend** | Node.js + Express.js + TypeScript |
| **Base de Dados** | MySQL (via Sequelize ORM) |
| **Autenticação** | JWT (JSON Web Tokens) |
| **Pagamentos** | M-Pesa Open API (mpesa-node-api) |
| **PDF** | pdfmake (frontend) + Puppeteer (backend) |
| **Excel** | SheetJS (xlsx) |
| **SMS** | TxtLocal API |
| **Gestão de Estado** | Vuex |

---

## 10. Fluxo Operacional Resumido

```
1. CADASTRO DO MUTUÁRIO
   Gestor regista o mutuário com dados pessoais e documentos
                          │
                          ▼
2. SIMULAÇÃO DO CRÉDITO
   Gestor simula o crédito (capital, taxa, prestações)
   Sistema verifica elegibilidade (prestação ≤ 1/3 do rendimento)
                          │
                          ▼
3. SUBMISSÃO DO PEDIDO
   Gestor submete pedido com parecer técnico
   Estado: PENDENTE → Notificação enviada ao Administrador
                          │
                          ▼
4. APROVAÇÃO / REJEIÇÃO
   Administrador analisa e aprova ou rejeita
   Estado: ACTIVO ou REJEITADO → Notificação enviada ao mutuário
                          │
                          ▼
5. CRIAÇÃO DO PLANO DE AMORTIZAÇÃO
   Administrador gera o plano automático (Sistema Francês)
   Prestações mensais com datas de vencimento
                          │
                          ▼
6. DESEMBOLSO
   Transferência do capital ao mutuário (manual ou M-Pesa B2C)
                          │
                          ▼
7. REEMBOLSO (MENSAL)
   Mutuário paga prestações via:
   • Boca de caixa  • Depósito bancário  • M-Pesa
   • Transferência   • E-Mola             • POS / Cheque
   Sistema calcula juros de mora se houver atraso
                          │
                          ▼
8. ACOMPANHAMENTO E RELATÓRIOS
   • Relatório mensal para o Banco de Moçambique
   • Relatório de créditos desembolsados
   • Listagem de pagamentos (PDF / Excel)
   • Logs de auditoria
```

---

## 11. Benefícios para a Instituição

- **Redução de erros**: cálculos automáticos de amortização, juros e mora
- **Conformidade regulamentar**: relatórios no formato exigido pelo Banco de Moçambique
- **Eficiência operacional**: fluxos digitalizados desde o pedido até ao reembolso
- **Transparência**: portal do cliente para auto-consulta, reduzindo chamadas e visitas
- **Escalabilidade**: arquitectura multi-empresa permite crescimento sem limites
- **Mobilidade**: plataforma acessível via browser em qualquer dispositivo
- **Rastreabilidade**: logs completos de todas as operações para auditoria
- **Integração financeira**: M-Pesa para recebimentos e desembolsos automáticos

---

*Documento gerado em Fevereiro de 2026*
