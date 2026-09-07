# Modelo de dados

## Regras canônicas

- `companies.id` é o tenant da aplicação.
- `accounts` representa exclusivamente contas bancárias da empresa para recebimento/reembolso de prestações. Não representa a conta do mutuário.
- `accountNumber` é um identificador de negócio legado do mutuário e permanece apenas para compatibilidade e apresentação.
- As relações do domínio do mutuário usam `customerId -> customers.id`.
- Créditos, prestações, transações, documentos, dívidas e mensagens devem carregar `customerId` quando pertencem a um mutuário.
- `companyId` deve ser validado em toda operação para impedir acesso entre empresas.

## Relações principais

```text
provinces <- districts <- companies
companies -> customers
companies -> accounts              (contas bancárias empresariais)
companies -> users
companies -> interest_rates
customers -> customer_loans
customers -> amortization_loans
customer_loans -> amortization_loans
amortization_loans -> tranzactions
customer_loans -> loan_guarantees
customer_loans -> debts
customers -> customer_documents
customers -> sms_queue / whatsapp_messages
users / customers -> notifications
```

## Constraints aplicadas

As migrations criam FKs para empresas, geografia, utilizadores, clientes, créditos, prestações, transações, dívidas e garantias. A tabela `accounts` possui FK somente para `companies` e índice único em `(companyId, accountNumber)`.

## Compatibilidade

Os campos `accountNumber`, `recipientId` e referências semelhantes ainda existem para compatibilidade com APIs e telas antigas. Eles não devem ser usados como FK. Novos fluxos devem preferir IDs técnicos (`customerId`, `loanId`, `amortizationLoanId`, `transactionId`).

## Dados monetários

Valores financeiros usam `DECIMAL`, evitando erros de arredondamento de `FLOAT`. Datas textuais antigas permanecem temporariamente para compatibilidade; novas alterações devem preferir `DATE` ou `DATETIME`.
