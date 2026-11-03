# Mais Mola - Sistema Completo de Gestão para Instituições de Microcrédito
**PROPOSTA COMERCIAL E ESPECIFICAÇÃO TÉCNICA DA SOLUÇÃO**

---

## 1. VISÃO GERAL DA SOLUÇÃO

O **Mais Mola** é uma plataforma integrada de gestão operacional, financeira e prudencial desenvolvida especialmente para otimizar a concessão de crédito, o controlo de cobranças, a tesouraria diária e a governação de instituições de microcrédito, operadores de microfinanças e fundos de financiamento.

A solução conecta todos os pontos da operação em tempo real: do cadastro documental (KYC), simulação prudencial e acompanhamento da carteira pelo **Gestor de Crédito**, passando pela aprovação, desembolso, controlo de caixa e reporte regulatório pelo **Administrador**, até à prestação de contas transparente no **Portal de Parceiros e Financiadores**.

### Benefícios Principais
- **Rigor Prudencial e Redução de Incumprimento:** Validação obrigatória de KYC, teste automático do limite de esforço de 1/3 do rendimento e cobertura de garantias reais (capital + juros).
- **Controlo Financeiro e Tesouraria Auditável:** Abertura e fecho de caixa diário cego, validação dupla de desembolso (carteira analítica vs. saldo real) e conciliação multi-conta.
- **Transparência para Parceiros Financiadores:** Portal dedicado (*read-only*) por carteira de investimento para consulta em tempo real do capital alocado, lucros, prestações, mora e recibos.
- **Conformidade Legal e Regulatória (BM & AT):** Emissão automática de contratos e recibos sequenciais com QR Code, além do reporte oficial mensal e trimestral no modelo do Banco de Moçambique.

---

## 2. FLUXO OPERACIONAL DO CRÉDITO

```
             [ Cadastro do Mutuário (PF/PJ) + Validação Obrigatória da Checklist KYC (BI, NUIT, Rendimentos) ]
                                                             ▼
         [ Simulação do Plano (Tabela Price) + Teste de Capacidade (Regra de 1/3) + Registo de Garantias Reais ]
                                                             ▼
      [ Submissão do Pedido pelo Gestor ➔ Validação Dupla de Capital (Carteira de Financiamento + Conta Real) ]
                                                             ▼
            [ Aprovação e Desembolso Seguro (M-Pesa / e-Mola / Transferência Bancária / Caixa Físico) ]
                                                             ▼
        [ Geração Automática do Pacote Legal Imutável (Contrato, Termo, Garantias e Plano) com Hash & QR Code ]
                                                             ▼
           [ Gestão de Prestações: Em Curso ➔ Alertas de Vencimento / Cálculo de Mora Diária ➔ Amortização ]
                                                             ▼
  ┌────────────────────────────────────────┬────────────────────────────────────────┬────────────────────────────────────────┐
  │            ( Administrador )           │          ( Gestor de Crédito )         │     ( Portal de Financiadores )        │
  │  Controlo de Caixa, Contas Bancárias,  │   Acompanhamento da Carteira, Gestão   │   Monitorização em Tempo Real do       │
  │    Recibos Legais e Reportes ao BM     │   de Cobranças, Mora e Garantias (ICR) │   Capital Alocado, Retorno e Extratos  │
  └────────────────────────────────────────┴────────────────────────────────────────┴────────────────────────────────────────┘
                                                             ▼
       [ Emissão de Recibo Sequencial Legal (REC-AAAA-00001) + Fecho Diário de Caixa e Relatórios Oficiais ]
```

---

## 3. PERFIS E PAPÉIS DE UTILIZADORES

O **Mais Mola** oferece segregação estrita de funções e permissões desenhadas para proteger o capital da instituição e assegurar total transparência operacional:

| Perfil | Descrição das Responsabilidades e Acessos |
| :--- | :--- |
| **Administrador (Admin)** | Acesso irrestrito à governação da instituição: abertura e fecho do caixa diário, gestão de tesouraria e contas bancárias/carteiras móveis, criação de carteiras de financiamento e taxas de juro, aprovação e desembolso de créditos, registo global de pagamentos, configuração de multas/SMS, gestão de equipa/parceiros, auditoria de sistema (*logs* com IP) e emissão dos relatórios do Banco de Moçambique (BM) e de financiadores. |
| **Gestor de Crédito** | Gestão ativa da carteira comercial e análise de risco: cadastro de mutuários (PF e Empresas), carregamento e validação da checklist documental (KYC), simulação de planos de amortização (Price), submissão de propostas (com parecer obrigatório caso exceda 1/3 do rendimento), registo fotográfico e avaliação de garantias, análise de pedidos, acompanhamento diário de prestações a vencer ou em mora e emissão do pacote de documentos legais. |
| **Portal de Parceiros / Financiadores** | Ambiente exclusivo e isolado (*read-only*) para investidores e fundos externos acompanharem a sua própria carteira de capital: visualização de KPIs (capital alocado, desembolsado, disponível, juros gerados/recebidos, previsão de lucro e mora), consulta de créditos concedidos, prestações pagas e pendentes, evolução mensal, exportação de extratos em Excel e download de recibos fiscais em PDF. |

---

## 4. FUNCIONALIDADES CORE

### 4.1. Gestão de Crédito e Risco (Gestor de Crédito)
- **Dossier KYC com Bloqueio Automático:** Impede a criação ou desembolso de qualquer crédito enquanto os documentos base obrigatórios (BI/Passaporte, NUIT e Comprovativo de Rendimentos) não estiverem validados no sistema.
- **Simulador Price e Regra Prudencial de 1/3:** Cálculo instantâneo de prestações, juros e amortizações com alerta visual de capacidade financeira, exigência de parecer fundamentado em PDF para exceções e validação obrigatória de cobertura de garantias (valor >= capital + juros).
- **Pacote Contratual Imutável e Cobrança:** Emissão imediata do Contrato de Concessão, Termo de Responsabilidade, Declaração de Garantias e Extrato atualizado, aliado ao painel de acompanhamento de vencimentos e cálculo automático de juros de mora ao dia.

### 4.2. Administração, Tesouraria e Governança (Admin)
- **Validação Dupla no Desembolso:** Segurança financeira que cruza o limite analítico disponível na **Carteira de Financiamento** com o saldo físico/real disponível nas **Contas de Desembolso** (Bancos, M-Pesa, e-Mola ou Cofre).
- **Engenharia de Produtos e Carteiras:** Criação de múltiplas fontes de capital (fundos próprios, linhas bancárias ou parceiros externos), vinculação de planos de taxas de juro (% a.m.) e taxas de preparos administrativos.
- **Rastreabilidade e Auditoria Completa:** Histórico detalhado de todas as ações críticas (logins, aprovações, pagamentos, estornos e configurações) com identificação do operador, data/hora e endereço IP.

### 4.3. Portal de Parceiros e Financiadores (Transparência ao Investidor)
- Painel dedicado com isolamento absoluto no servidor (o parceiro visualiza exclusivamente os dados da sua carteira associada, sem acesso às demais operações da microcrédito).
- Monitorização em tempo real do capital alocado, barra de utilização da linha de financiamento, total desembolsado, saldo disponível, juros recebidos, previsão de lucro e mora acumulada.
- Consulta detalhada de créditos ativos, prestações liquidadas e em atraso, emissão de extrato financeiro do período em Excel e acesso direto aos recibos oficiais emitidos em PDF.

---

## 5. CONTROLO FINANCEIRO, TESOURARIA E CONFORMIDADE (BM / AT)

O módulo financeiro e regulatório do **Mais Mola** garante controlo rigoroso sobre a liquidez e conformidade legal da instituição:

- **Controlo de Caixa Diário e Cofre Central:** Abertura obrigatória de caixa com contagem de fundo de maneio por denominações, registo automático de desembolsos/reembolsos, transferências entre cofre e bancos, e fecho de caixa cego com apuramento de quebras ou sobras.
- **Múltiplos Canais e Modalidades de Recebimento:** Suporte a M-Pesa, e-Mola, Transferência Bancária, Cheque e Numerário, permitindo pagamentos integrais, parciais (com recálculo de saldo), com desconto justificado ou liquidação total antecipada numa única operação atómica.
- **Relatórios Gerenciais, Fiscais e Regulatórios:**
  - **Reporte Oficial ao Banco de Moçambique (BM):** Geração automática do Relatório Mensal e da Ficha de Reporte Trimestral em Excel (fiel ao modelo oficial do BM) e PDF, incluindo desagregação por sector de atividade, sexo dos mutuários e Classes de Risco (I a IV / PAR).
  - **Prestação de Contas a Financiadores:** Exportação em Excel (2 abas: Desembolsos e Recebimentos) e envio direto por e-mail para os parceiros de capital.
  - **Recibos Fiscais Sequenciais:** Numeração anual ininterrupta (`REC-AAAA-00001`), decomposição de capital, juros, mora e saldo remanescente, selo eletrónico SHA-256 e validação pública via QR Code.

---

## 6. INFORMAÇÕES DE CONTACTO

Para demonstrações, suporte ou contratação do sistema **Mais Mola**, entre em contacto:

- **Responsável Comercial:** Leonel Matsinhe
- **Telefone / WhatsApp:** 870740202
- **E-mail:** leonelmatsinhe@gmail.com
