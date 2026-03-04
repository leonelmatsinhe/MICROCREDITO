# Checklist de Regressao - Dashboard

Use esta lista antes de publicar alteracoes do dashboard em producao.

## 1) Endpoint agregado

- [ ] `GET /api/dashboard/:companyId` responde `200` com `success=true`.
- [ ] `GET /api/dashboard/:companyId?from=YYYY-MM-DD&to=YYYY-MM-DD` responde `200`.
- [ ] `from > to` responde `400`.
- [ ] Data em formato invalido responde `400`.
- [ ] `companyId` invalido responde `400`.
- [ ] `creditManager` invalido responde `400`.
- [ ] `status` invalido responde `400`.

## 2) Contrato da resposta

- [ ] Campo `filters` existe com `companyId/from/to/creditManager/status`.
- [ ] Campo `kpis.loans` existe com `total/pending/active/rejected/liquidated`.
- [ ] Campo `kpis.financial` existe com `totalDisbursed/totalCollected/totalInterestCollected/totalLateInterest/avgTicket/roiPct`.
- [ ] Campo `kpis.delinquency` existe com `outstandingPortfolio/overdueAmount/overdueRate/par30Amount/par60Amount/par90Amount/par30Rate/par60Rate/par90Rate/overdueInstallmentsCount`.
- [ ] Campo `riskByManager` existe e e um array.
- [ ] Campo `alerts` existe e e um array.

## 3) Dashboard Admin (HomeView)

- [ ] Filtro por periodo atualiza KPIs.
- [ ] Filtro por periodo atualiza lista de prestacoes vencidas.
- [ ] Filtro por periodo atualiza badge de proximas prestacoes.
- [ ] Indicador visual "Filtro ativo" aparece quando houver periodo.
- [ ] Cards de risco mostram Taxa de Atraso, PAR30, PAR60, PAR90.
- [ ] Tooltips de risco aparecem ao passar o mouse.

## 4) Dashboard Gestor

- [ ] Filtro por periodo atualiza KPIs agregados do gestor.
- [ ] Filtro por periodo atualiza tabela "Meus Creditos".
- [ ] Indicador visual "Filtro ativo" aparece quando houver periodo.
- [ ] Cards de risco mostram Taxa de Atraso, PAR30, PAR60, PAR90.
- [ ] Tooltips de risco aparecem ao passar o mouse.

## 5) Relatorios e Pagamentos

- [ ] Reports busca creditos filtrados no backend (`/api/companyLoans/:companyId`).
- [ ] Reports busca transacoes filtradas no backend (`/api/tranzaction` com `from/to`).
- [ ] Pagamentos paginados continuam a retornar totais corretos.

## 6) Performance basica

- [ ] Com periodo curto (7 dias), tempo de resposta do dashboard reduz comparado ao sem filtro.
- [ ] Nenhum endpoint retorna erro 500 em filtros comuns.
- [ ] Sem filtros, resposta continua funcional e consistente.

