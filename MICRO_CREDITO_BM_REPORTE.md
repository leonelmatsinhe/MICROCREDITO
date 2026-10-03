# Módulo de Microcrédito e reporte trimestral BM

## Isolamento por tenant

O sistema existente identifica a organização autenticada como `companies.id` (`UserModel.companyId`), não possui uma tabela `tenants`. O módulo mantém a API/coluna `tenant_id`, mas guarda nela esse `companyId`, obtido do utilizador validado pelo middleware `isStaff`. Nenhum endpoint usa um `tenant_id` recebido no body, query ou rota. As consultas e escritas do módulo filtram sempre por `tenant_id`; associações entre clientes, créditos, prestações e pagamentos verificam a mesma chave.

O cabeçalho do XLSX vem da linha correspondente em `companies` e `provinces`. A contagem de trabalhadores usa `users` do mesmo `companyId`, `userRole IN (1,2,3)`, `status=1` e `is_active=1`. O nome do operador é o `UserModel.name` obtido do token validado. Não existem valores institucionais hardcoded.

## Tabelas

A migração idempotente cria `clientes_microcredito`, `creditos`, `pagamentos_credito`, `microcredit_payment_events` (razão append-only dos pagamentos para totalizar períodos históricos), `fontes_financiamento`, `movimentos_financeiros_operador` e `config_microcredito`. Valores monetários usam DECIMAL. Os eventos têm a empresa, crédito e prestação e permitem auditar parcelas parciais e somar por data de recebimento. A aplicação não executa seeds automáticos.

## Regras de cálculo do reporte

O endpoint `GET /api/microcredito/reportes/preview?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD` devolve o resumo usado no ecrã. `POST /api/microcredito/reportes/gerar` recebe as mesmas datas em JSON e devolve um XLSX binário derivado do template original. O intervalo é validado e inclusivo.

| Secção BM | Fórmula / origem |
| --- | --- |
| 2.1.1 Concedidos (1) | Soma de `montante_capital` e `juros_total` dos créditos com `data_concessao` no intervalo. Juros totais são a soma dos juros previstos da tabela Price criada na concessão. |
| 2.1.1 Reembolsados (2) | Soma de `capital_pago` e `juro_pago` nos eventos (`data_pagamento` inclusiva). |
| 2.1.1 Abatidos (4) | Soma de `capital_abatido`/`juro_abatido` dos créditos cujo abatimento foi datado no período. |
| 2.1.1 Activa (5) | Saldo de capital e juro das prestações não liquidadas até ao fim do período, em todos os créditos concedidos até essa data, excluindo abatidos. |
| 2.1.1 Em risco (6) | Parte da carteira activa associada a pelo menos uma prestação vencida e não paga na data final; discrimina os saldos de capital e juro. |
| 2.1.2 Número de créditos | Contagem de concessões no período; “reembolsados” conta créditos integralmente liquidados no intervalo. |
| 2.1.3 Sector (9) | Soma do capital original dos créditos concedidos no intervalo, agrupada por `sector_finalidade`; lista os sete sectores definidos pelo formulário. |
| 2.1.4 Clientes (10) | Clientes distintos com saldo activo na data final, desagregados por sexo; o total é distinct e cada pessoa conta uma vez. |
| 2.1.5 Risco (11–13) | Saldo de prestações em atraso por maior antiguidade vencida: I=1–30, II=31–90, III=91–365, IV=>365 dias. Capital e juro restantes são mostrados separadamente. |
| 2.2 Taxas/prazos | Mínimo e máximo entre créditos com saldo positivo na data de referência. A taxa é percentagem mensal. |
| 2.3 Fontes | Soma histórica das fontes por `Proprio`, `Alheio_Nacional` e `Alheio_Estrangeiro`; total é a soma das três origens. |
| 2.4 Financiamentos | Soma de entradas no período classificadas como empréstimo, donativo ou aumento de capital próprio. Sem categoria explícita, fonte alheia é considerada empréstimo; fonte própria não é classificada automaticamente. |
| 2.5 Capital | `capital_inicial` e `capital_actual` em `config_microcredito`. |
| 3. Situação financeira | Soma dos movimentos por activo e mês civil contido no intervalo. Os três meses são derivados da data de início. Registe movimentos usando datas reais para estes saldos. |

### Créditos, prestações e risco

O crédito gera prestações mensais Price: `prestação = P*r/(1-(1+r)^-n)`, com `r = taxa_juro_mensal/100`. A taxa zero gera parcelas lineares. Juros e amortizações são arredondados a 2 casas decimais; a última prestação corrige o resíduo do capital. Pagamentos são aplicados por ordem de vencimento, primeiro aos juros e depois ao capital; pagamentos parciais geram um evento por prestação afectada. Estado, saldo, atraso e classe actualizam-se no registo do pagamento e ao consultar o dashboard.

A classe usa os dias decorridos desde a prestação vencida mais antiga com saldo: 1–30 I, 31–90 II, 91–365 III, acima de 365 IV. O atraso de uma prestação paga fica no histórico; a classe corrente do crédito é calculada apenas sobre parcelas com saldo em atraso.

## Modelo XLSX

O template entregue é preservado em `templates/MODELO_DE_REPORTE_TRIMESTRAL_2025_III.xlsx`. ExcelJS carrega-o sem reconstruir folha, imagens, estilos ou mesclagens. A folha `FICHA DE REPORTER TRIMESTRAL` recebe valores nos endereços:

- Cabeçalho: B8; A12–A19 (células mescladas, com texto original substituído pelos dados dinâmicos).
- Carteira: C:E nas linhas 26–30; E34:E35; E41:E48; E54:E57; C:E nas linhas 62–66.
- Taxas/prazos: D:E71:D:E72.
- Financiamento/capital: C76, C78:C80, C84:C87, C91:C92.
- Activos: C:E97:C:E99 e meses em C96:E96.

O nome descarregado contém slug da empresa e ano/trimestre inferidos da data final. A resposta inclui `Cache-Control: no-store` e expiração zero.

## Segurança, operação e validação

- Todos endpoints do módulo usam `isStaff`; IDs de edição/apagamento também são acompanhados de `tenant_id` no SQL.
- O XLSX pode ser gerado para qualquer período escolhido; “automático” significa geração dos cálculos ao pedir pré-visualização/exportação, não um job que envia o formulário ao regulador.
- A migração roda no arranque como as outras migrações. Em produção, faça backup e valide o schema antes do primeiro arranque com esta versão.
- A geração de Excel e PDF usa template original para XLSX e jspdf já presente no frontend para PDF.
- Não foi instalado um seed de 13 clientes nem criado dado empresarial. Faça a validação MBR/Cantinho em base de teste dedicada e use tenant(s) preparados, não em produção.
- Cenário esperado: criar um crédito de 50.000 MZN a 5% a.m., 6 meses, em Outubro 2025 gera `2.1.1 concedidos capital=50.000`, sector Comércio=50.000, inclui o cliente activo no sexo correcto, e mostra a taxa e prazo na faixa mínima/máxima se for o único crédito activo. Dois pagamentos em Outubro–Dezembro totalizam na coluna de reembolsos pelo valor real aplicado a capital e juros.

## Limitações que exigem dados operacionais

A estrutura inicial enviada não especificava categoria entre os três itens 2.4, abatimentos capital/juros/data nem movimentos de pagamento separados da prestação. Essas colunas de suporte foram incluídas para tornar os totais auditáveis. O formulário financeiro é um movimento registado manualmente; saldos devem ser lançados mensalmente pela equipa.
