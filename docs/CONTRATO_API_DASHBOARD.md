# Contrato da API de Dashboard

Endpoint:

- `GET /api/dashboard/:companyId`

Parametros opcionais:

- `from` (formato `YYYY-MM-DD`)
- `to` (formato `YYYY-MM-DD`)
- `creditManager` (numero inteiro > 0 ou `all`)
- `status` (numero inteiro ou `all`)

Regras de validacao:

- `companyId` deve ser inteiro positivo.
- Datas devem usar formato `YYYY-MM-DD`.
- `from` nao pode ser maior que `to`.
- `creditManager` (quando informado e diferente de `all`) deve ser inteiro positivo.
- `status` (quando informado e diferente de `all`) deve ser inteiro.

Resposta de sucesso (estrutura):

```json
{
  "success": true,
  "filters": {
    "companyId": 1,
    "from": "2026-03-01",
    "to": "2026-03-31",
    "creditManager": null,
    "status": null
  },
  "kpis": {
    "loans": {
      "total": 0,
      "pending": 0,
      "active": 0,
      "rejected": 0,
      "liquidated": 0
    },
    "financial": {
      "totalDisbursed": 0,
      "totalCollected": 0,
      "totalInterestCollected": 0,
      "totalLateInterest": 0,
      "avgTicket": 0,
      "roiPct": 0
    },
    "delinquency": {
      "outstandingPortfolio": 0,
      "overdueAmount": 0,
      "overdueRate": 0,
      "par30Amount": 0,
      "par60Amount": 0,
      "par90Amount": 0,
      "par30Rate": 0,
      "par60Rate": 0,
      "par90Rate": 0,
      "overdueInstallmentsCount": 0
    }
  },
  "riskByManager": [],
  "alerts": []
}
```

Erros esperados:

- `400` para parametros invalidos.
- `500` para erro interno.

## Smoke test automatico

Com a API em execucao local, rode:

- `npm run smoke:dashboard`

Opcionalmente, execute o script com parametros:

- `powershell -ExecutionPolicy Bypass -File scripts/smoke-dashboard-contract.ps1 -BaseUrl "http://localhost:3333" -CompanyId 1`

