# SMS Gateway App (Android)

Aplicativo Android nativo (Kotlin) para atuar como gateway de SMS do sistema de microcrédito.

## Stack

- Kotlin + Android Native
- MVVM
- Retrofit
- Room Database
- WorkManager
- SmsManager
- Material Design 3

## Fluxo principal

1. Login via `/api/auth/login`
2. Worker em background busca SMS pendentes em `/api/sms-gateway/pending`
3. Envia SMS pelo SIM do telefone
4. Atualiza status no backend via `/api/sms-gateway/{id}/status`
5. Registra logs locais de envio/falha/retry

### Tipos de SMS suportados

- `loan_disbursement`: aviso de desembolso de crédito
- `installment_payment`: confirmação de pagamento de prestação
- `upcoming_installment_alert`: lembrete de prestação prestes a vencer
- `late_interest_notice`: aviso de juros de mora

### Regras de número de telefone

- O app valida o número para **9 dígitos** antes de enviar.
- Se chegar com **12 dígitos**, remove automaticamente os **3 primeiros** (prefixo de país).
- Fora desses formatos, o envio falha e a mensagem é marcada como erro.

### Confirmação de envio/entrega

- A app registra callbacks de:
  - envio para operadora (`SENT_MODEM` / `SENT_FAILED`)
  - entrega no destino (`DELIVERED` / `DELIVERY_FAILED`)
- Esses eventos ficam nos logs locais para auditoria.

## Estrutura

- `ui/` fragments + viewmodels
- `domain/` models + use cases
- `repository/` contratos
- `data/` implementações
- `network/` retrofit + interceptor + token store
- `database/` Room (logs + configurações)
- `workers/` sincronização em background
- `sms/` envio real com SmsManager

## Configuração

1. Abra `mobile-android` no Android Studio.
2. Execute Sync Gradle.
3. Conceda permissões de SMS/telefone ao abrir o app.
4. Faça login e ajuste configurações (URL API, intervalo, SIM).

## Permissões usadas

- `SEND_SMS`
- `READ_PHONE_STATE`
- `RECEIVE_SMS`
- `INTERNET`
