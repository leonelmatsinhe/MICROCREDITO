/**
 * PERÍODO DO PAINEL — presets, validação e descrição.
 *
 * Problema que isto resolve: o filtro vivia apenas em estado local do
 * componente. Ao actualizar a página (F5), voltava ao mês corrente e as datas
 * escolhidas desapareciam; além disso, um preset "congelado" ficava com datas
 * velhas (ex.: "Mês" mostrando o mês anterior depois da viragem do mês).
 *
 * Regras:
 *  · presets são SEMPRE recalculados a partir de "hoje" (nunca de datas
 *    guardadas), pelo que um refresh no dia seguinte alinha as datas;
 *  · o período personalizado é o único que usa datas explícitas (ISO);
 *  · "Tudo" (all) = sem filtro de datas (histórico completo).
 */
import {
  addMonths,
  differenceInCalendarMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek
} from 'date-fns'

export const PERIOD_PRESETS = [
  { label: 'Hoje', value: 'today' },
  { label: 'Semana', value: 'week' },
  { label: 'Mês', value: 'month' },
  { label: 'Ano', value: 'year' }
]

const PRESET_VALUES = PERIOD_PRESETS.map((p) => p.value)

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export const toIso = (date) => format(date, 'yyyy-MM-dd')

export const isIsoDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return false
  // Rejeita 2026-02-31 (o Date "corrige" para Março).
  return toIso(parsed) === value
}

/** Intervalo ISO de um preset, calculado a partir de `today`. */
export function presetRange(preset, today = new Date()) {
  switch (preset) {
    case 'today':
      return { from: toIso(today), to: toIso(today) }
    case 'week':
      return {
        from: toIso(startOfWeek(today, { weekStartsOn: 1 })),
        to: toIso(endOfWeek(today, { weekStartsOn: 1 }))
      }
    case 'year':
      return { from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` }
    case 'month':
    default:
      return { from: toIso(startOfMonth(today)), to: toIso(endOfMonth(today)) }
  }
}

/**
 * Estado do filtro a partir da query string (URL).
 *  · `period` reconhecido → recalcula as datas a partir de hoje;
 *  · `from`/`to` válidos (sem preset) → período personalizado;
 *  · nada válido → mês corrente.
 */
export function resolveFilterFromQuery(query = {}, today = new Date()) {
  const period = String(query.period || '')
  if (PRESET_VALUES.includes(period)) {
    return { period, ...presetRange(period, today) }
  }
  if (period === 'all') {
    return { period: 'all', from: '', to: '' }
  }

  const from = typeof query.from === 'string' ? query.from : ''
  const to = typeof query.to === 'string' ? query.to : ''
  if (isIsoDate(from) && isIsoDate(to) && from <= to) {
    return { period: 'custom', from, to }
  }

  return { period: 'month', ...presetRange('month', today) }
}

/** Query string limpa (sem chaves vazias) para guardar o filtro na URL. */
export function filterToQuery(filter) {
  if (!filter) return {}
  if (filter.period === 'custom') {
    return { period: 'custom', from: filter.from, to: filter.to }
  }
  if (filter.period === 'all') return { period: 'all' }
  return { period: filter.period || 'month' }
}

export function sameFilter(a, b) {
  if (!a || !b) return false
  return a.period === b.period && (a.from || '') === (b.from || '') && (a.to || '') === (b.to || '')
}

/** DD/MM/YYYY → ISO (null quando inválido). */
export function displayToIso(text) {
  const parts = String(text || '').trim().split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null
  const iso = `${year}-${month}-${day}`
  return isIsoDate(iso) ? iso : null
}

export function isoToDisplay(iso) {
  if (!isIsoDate(iso)) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

/** Texto legível do período (usado na barra e na faixa de movimento). */
export function describePeriod(filter, today = new Date()) {
  if (!filter) return ''
  const current = presetRange('month', today)
  switch (filter.period) {
    case 'today':
      return `Hoje · ${isoToDisplay(current.from)}`
    case 'week': {
      const week = presetRange('week', today)
      return `Semana ${isoToDisplay(week.from)} – ${isoToDisplay(week.to)}`
    }
    case 'year':
      return `Ano ${today.getFullYear()}`
    case 'all':
      return 'Todo o histórico'
    case 'custom': {
      const from = isoToDisplay(filter.from)
      const to = isoToDisplay(filter.to)
      if (!from || !to) return 'Período personalizado'
      return from === to ? from : `${from} – ${to}`
    }
    default:
      return `${MONTHS_PT[today.getMonth()]} de ${today.getFullYear()}`
  }
}

/** Nº de meses do intervalo (para a janela do gráfico), limitado a [min, max]. */
export function monthsInRange(filter, { min = 3, max = 24, fallback = 12 } = {}) {
  if (!filter || filter.period === 'all' || !isIsoDate(filter.from) || !isIsoDate(filter.to)) {
    return fallback
  }
  const start = new Date(`${filter.from}T00:00:00`)
  const end = new Date(`${filter.to}T00:00:00`)
  const months = differenceInCalendarMonths(end, start) + 1
  if (!Number.isFinite(months) || months < 1) return fallback
  return Math.min(max, Math.max(min, months))
}

/** Data-limite do calendário no formato do Quasar (AAAA/MM). */
export function calendarBounds(today = new Date()) {
  return {
    min: `${today.getFullYear() - 10}/01`,
    max: `${today.getFullYear() + 1}/12`
  }
}

export { addMonths }
