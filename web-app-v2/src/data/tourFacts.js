import { reactive } from 'vue'

/**
 * NÚMEROS REAIS CITADOS PELO TOUR
 * ───────────────────────────────
 * O tour nunca deve falar de exemplos («apaga 100 registos») quando a página já
 * tem os números à vista. Cada página publica aqui o que o servidor devolveu e
 * os textos do tour lêem estes valores <em>no momento em que o passo aparece</em>
 * — se o servidor responder depois de o tour arrancar, o passo é reescrito com
 * as contagens verdadeiras.
 *
 * Este módulo não depende de nenhum store nem de axios: é só um recipiente
 * reactivo partilhado entre a página e o motor do tour.
 */

const emptyReset = () => ({
  /** O preview do Reset já foi lido do servidor? */
  loaded: false,
  /** O Reset está disponível nesta instalação (single-tenant + Admin)? */
  available: false,
  /** Bloqueado por regra do servidor (403) e não por falha de rede. */
  blocked: false,
  /** Motivo quando não está disponível. */
  reason: '',
  /** Total de registos que serão apagados. */
  totalRecords: 0,
  /** [{ table, label, rows }] — o que desaparece. */
  deleted: [],
  /** [{ table, label }] — o que fica, com saldos a zero. */
  zeroed: [],
  /** [{ table, label }] — o que continua exactamente igual. */
  kept: [],
  /** Momento (ms) em que os números foram lidos. */
  loadedAt: 0
})

export const tourFacts = reactive({
  reset: emptyReset()
})

/** Marca que o preview do Reset está a ser lido (o tour espera por ele). */
export function resetFactsLoading() {
  Object.assign(tourFacts.reset, emptyReset())
}

/** Publica o preview real devolvido por GET /api/admin/system/reset-status. */
export function setResetFacts(preview) {
  const result = preview || {}
  Object.assign(tourFacts.reset, {
    loaded: true,
    available: true,
    reason: '',
    totalRecords: Number(result.totalRecords || 0),
    deleted: Array.isArray(result.deleted) ? result.deleted : [],
    zeroed: Array.isArray(result.zeroed) ? result.zeroed : [],
    kept: Array.isArray(result.kept) ? result.kept : [],
    loadedAt: Date.now()
  })
}

/**
 * O Reset não está disponível (403 / multi-tenant) ou o preview falhou.
 * @param {string} reason mensagem mostrada ao utilizador
 * @param {{ blocked?: boolean }} [options] `blocked` = recusa do servidor (403)
 */
export function setResetFactsUnavailable(reason, options = {}) {
  Object.assign(tourFacts.reset, {
    ...emptyReset(),
    loaded: true,
    available: false,
    blocked: Boolean(options.blocked),
    reason: String(reason || ''),
    loadedAt: Date.now()
  })
}

/** Esquece os números ao sair da página — nunca citar contagens antigas. */
export function clearResetFacts() {
  Object.assign(tourFacts.reset, emptyReset())
}

/** 1234 → «1.234»: separador de milhares usado em Moçambique. */
export function formatCount(value) {
  const n = Math.round(Number(value) || 0)
  const digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return n < 0 ? `-${digits}` : digits
}

/**
 * Linhas de uma tabela concreta do preview.
 * @param {string} table nome da tabela
 * @param {'deleted'|'zeroed'|'kept'} [group] lista onde procurar
 */
export function resetRowsOf(table, group = 'deleted') {
  const list = tourFacts.reset[group] || []
  const entry = list.find((t) => t.table === table)
  return Number(entry?.rows || 0)
}
