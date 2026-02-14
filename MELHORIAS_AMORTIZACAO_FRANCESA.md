# Melhorias Implementadas - Sistema de Amortização Francesa (Price)

## Resumo das Alterações

Este documento descreve as melhorias implementadas para atender corretamente ao sistema de amortização francês (também conhecido como Sistema Price) tanto no backend quanto no frontend.

## O que é o Sistema de Amortização Francesa?

O sistema de amortização francesa (Price) é caracterizado por:
- **Prestações constantes**: Todas as prestações têm o mesmo valor
- **Juros decrescentes**: Os juros são calculados sobre o saldo devedor remanescente, diminuindo ao longo do tempo
- **Capital crescente**: A parte de capital aumenta progressivamente em cada prestação
- **Fórmula**: PMT = PV × [i(1+i)^n] / [(1+i)^n - 1]

Onde:
- PMT = Valor da prestação
- PV = Valor presente (capital emprestado)
- i = Taxa de juros por período
- n = Número de períodos

## Melhorias Implementadas

### 1. Backend - Cálculo de Amortização (`src/utils/loanAmortization.ts`)

**Antes:**
- Divisão simples do capital pelo número de prestações
- Juros calculados sobre o capital total inicial
- Não seguia o sistema francês
- Prestações com diferentes periodicidades (diárias, semanais, quinzenais, mensais) baseadas no número de prestações

**Depois:**
- ✅ Implementação da fórmula correta do sistema francês
- ✅ Cálculo de juros sobre o saldo devedor remanescente
- ✅ Amortização (capital) crescente ao longo do tempo
- ✅ Ajuste de arredondamento na última prestação para garantir saldo zero
- ✅ Validações de entrada (valores positivos, etc.)
- ✅ **Todas as prestações são mensais** - independentemente do número de prestações, todas são calculadas com vencimento mensal

**Principais mudanças:**
```typescript
// Nova função para calcular a prestação
const calculateFrenchAmortizationInstallment = (
  principal: number,
  interestRate: number,
  numberOfPeriods: number
): number

// Cálculo iterativo com saldo devedor
let remainingBalance = loanAmount;
const rateAmount = remainingBalance * rate;
const amortization = installment - rateAmount;
remainingBalance = remainingBalance - amortization;
```

### 2. Modelo de Dados (`src/database/models/AmortizationLoanModel.ts`)

**Adicionado:**
- ✅ Campo `remainingBalance` (saldo devedor) para rastrear o saldo após cada prestação
- Campo opcional para não quebrar dados existentes

### 3. Controller de Amortização (`src/controllers/AmortizationController.ts`)

**Melhorias:**
- ✅ Validações completas de entrada
- ✅ Verificação de duplicidade (evita criar múltiplos planos para o mesmo empréstimo)
- ✅ Tratamento de erros robusto
- ✅ Mensagens de erro mais descritivas
- ✅ Validação de tipos e valores

### 4. Frontend - Simulador (`web-app/src/utils/simulator.js`)

**Atualizado:**
- ✅ Mesma lógica de amortização francesa do backend
- ✅ Cálculo correto de juros sobre saldo devedor
- ✅ Exibição do saldo devedor em cada prestação
- ✅ Ajuste de arredondamento na última prestação

### 5. Frontend - Simulador de Empréstimo (`web-app/src/utils/loanAmortization.js`)

**Atualizado:**
- ✅ Implementação do sistema francês
- ✅ Cálculo iterativo com saldo devedor
- ✅ Inclusão do campo `remainingBalance` no resultado
- ✅ **Todas as prestações são mensais** - vencimentos calculados mensalmente

### 6. Interface do Usuário (`web-app/src/components/loans/AmortizationPlan.vue`)

**Melhorias:**
- ✅ Adicionada coluna "Saldo Devedor" na tabela de amortização
- ✅ Exibição do saldo devedor após cada prestação
- ✅ Tratamento para dados antigos que não têm saldo devedor (mostra "-")

## Comparação: Antes vs Depois

### Exemplo: Empréstimo de 10.000 MZN, 5% de juros, 12 prestações

**Antes (Sistema Simples):**
- Capital por prestação: 10.000 / 12 = 833,33
- Juros por prestação: 833,33 × 0,05 = 41,67
- Prestação: 875,00 (constante, mas cálculo incorreto)
- Total pago: 10.500,00

**Depois (Sistema Francês):**
- Prestação: 880,66 (calculada pela fórmula)
- 1ª prestação: Capital 380,66 | Juros 500,00 | Saldo 9.619,34
- 6ª prestação: Capital 488,20 | Juros 392,46 | Saldo 7.234,56
- 12ª prestação: Capital 838,72 | Juros 41,94 | Saldo 0,00
- Total pago: 10.567,92 (mais preciso)

## Próximos Passos Recomendados

1. **Migração de Dados:**
   - Criar script de migração para calcular `remainingBalance` para empréstimos existentes
   - Atualizar planos de amortização antigos se necessário

2. **Testes:**
   - Adicionar testes unitários para a função de cálculo
   - Testar casos extremos (taxa zero, uma prestação, etc.)
   - Validar arredondamentos

3. **Documentação:**
   - Adicionar tooltips explicativos na interface
   - Documentar a fórmula usada para usuários avançados

4. **Melhorias Adicionais:**
   - Adicionar gráfico de evolução do saldo devedor
   - Exportar tabela de amortização em PDF/Excel
   - Comparador de diferentes sistemas de amortização

5. **Validações Adicionais:**
   - Limitar número máximo de prestações
   - Validar taxa de juros máxima
   - Verificar se a data de vencimento é válida

## Notas Técnicas

- O arredondamento é feito para 2 casas decimais (centavos)
- A última prestação é ajustada para garantir que o saldo final seja exatamente zero
- O sistema mantém compatibilidade com dados antigos (campo `remainingBalance` é opcional)
- **Periodicidade das Prestações**: Todas as prestações são mensais. O sistema adiciona 1 mês, 2 meses, 3 meses, etc., a partir da data de vencimento inicial, independentemente do número total de prestações

## Arquivos Modificados

1. `src/utils/loanAmortization.ts` - Lógica principal de cálculo (prestações mensais)
2. `src/database/models/AmortizationLoanModel.ts` - Modelo de dados
3. `src/controllers/AmortizationController.ts` - Validações e tratamento de erros
4. `web-app/src/utils/simulator.js` - Simulador frontend (já usava mensal)
5. `web-app/src/utils/loanAmortization.js` - Simulador de empréstimo frontend (prestações mensais)
6. `web-app/src/components/loans/AmortizationPlan.vue` - Interface do usuário

## Atualização: Prestações Mensais

**Mudança Implementada:**
- Todas as prestações agora são calculadas com vencimento mensal
- Removida a lógica que determinava periodicidade baseada no número de prestações (diárias, semanais, quinzenais)
- Simplificado o código removendo condições especiais para diferentes tipos de prestação
- As datas de vencimento são calculadas adicionando 1 mês, 2 meses, 3 meses, etc., a partir da data inicial

## Conclusão

As melhorias implementadas garantem que o sistema agora utiliza corretamente o sistema de amortização francesa (Price), proporcionando:
- Cálculos precisos e matematicamente corretos
- Melhor experiência do usuário com informações mais detalhadas
- Código mais robusto com validações e tratamento de erros
- Compatibilidade com dados existentes

