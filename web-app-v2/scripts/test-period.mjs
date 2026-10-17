import assert from 'node:assert/strict'
import {
  describePeriod,
  displayToIso,
  filterToQuery,
  monthsInRange,
  presetRange,
  resolveFilterFromQuery,
  sameFilter
} from '../src/utils/period.js'

const TODAY = new Date(2026, 9, 17) // 17/10/2026
const NEXT_MONTH = new Date(2026, 10, 5) // 05/11/2026

// 1. Presets recalculados a partir de hoje
assert.deepEqual(presetRange('month', TODAY), { from: '2026-10-01', to: '2026-10-31' })
assert.deepEqual(presetRange('year', TODAY), { from: '2026-01-01', to: '2026-12-31' })
assert.deepEqual(presetRange('today', TODAY), { from: '2026-10-17', to: '2026-10-17' })

// 2. Refresh mantém o filtro — e o preset avança de mês sem ficar "congelado"
const monthQuery = resolveFilterFromQuery({ period: 'month' }, TODAY)
assert.deepEqual(monthQuery, { period: 'month', from: '2026-10-01', to: '2026-10-31' })
const afterRefresh = resolveFilterFromQuery(filterToQuery(monthQuery), NEXT_MONTH)
assert.deepEqual(afterRefresh, { period: 'month', from: '2026-11-01', to: '2026-11-30' })

// 3. Período personalizado sobrevive ao refresh tal e qual
const custom = { period: 'custom', from: '2026-01-01', to: '2026-03-31' }
assert.deepEqual(resolveFilterFromQuery(filterToQuery(custom), NEXT_MONTH), custom)

// 4. Query inválida cai no mês corrente (nunca em datas vazias)
assert.deepEqual(resolveFilterFromQuery({ period: 'custom', from: '31/02/2026', to: '' }, TODAY), {
  period: 'month',
  from: '2026-10-01',
  to: '2026-10-31'
})
assert.deepEqual(resolveFilterFromQuery({ period: 'custom', from: '2026-12-01', to: '2026-01-01' }, TODAY), {
  period: 'month',
  from: '2026-10-01',
  to: '2026-10-31'
})

// 5. Datas digitadas
assert.equal(displayToIso('01/01/2026'), '2026-01-01')
assert.equal(displayToIso('31/02/2026'), null)
assert.equal(displayToIso('1/1/2026'), null)

// 6. Janela do gráfico coerente com o período
assert.equal(monthsInRange({ period: 'today', from: '2026-10-17', to: '2026-10-17' }), 3)
assert.equal(monthsInRange(custom), 3)
assert.equal(monthsInRange({ period: 'custom', from: '2025-01-01', to: '2026-12-31' }), 24)
assert.equal(monthsInRange({ period: 'all', from: '', to: '' }), 12)

// 7. Texto e igualdade
assert.equal(describePeriod({ period: 'month', from: '2026-10-01', to: '2026-10-31' }, TODAY), 'Outubro de 2026')
assert.equal(describePeriod({ period: 'all', from: '', to: '' }), 'Todo o histórico')
assert.equal(describePeriod(custom, TODAY), '01/01/2026 – 31/03/2026')
assert.equal(sameFilter(monthQuery, { ...monthQuery }), true)
assert.equal(sameFilter(monthQuery, custom), false)

console.log('OK — período: presets, refresh, personalizado, validação e janela do gráfico')
