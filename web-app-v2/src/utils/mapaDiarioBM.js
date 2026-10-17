/**
 * MAPA DIÁRIO DE CAIXA — MODELO BM
 * ---------------------------------------------------------------------------
 * Constrói o payload do documento oficial de conferência de numerário
 * (contabilidade moçambicana) enviado a POST /api/reports/table-pdf.
 *
 * O Mapa (A4) contém: Data, Operador, Saldo Inicial (Fundo de Maneio),
 * Total Entradas (Prestações), Total Saídas (Desembolsos), Reforço de Caixa,
 * Total Entregas ao Cofre (Entrega de Valores ao Cofre Central), Depósitos
 * Bancários, Saldo Final Contado, Diferença, a Folha de Contagem por
 * denominação e espaço para Assinatura do Operador e do Tesoureiro.
 *
 * Módulo PURO (sem axios/Quasar) para poder ser verificado em Node.
 * TERMINOLOGIA: nunca usar termos brasileiros ("sangria"/"suprimento").
 */
import { MZN_DENOMINATION_META, sumDenominations } from './mznDenominations.js'

/** Cabeçalho oficial do documento. */
export const MAPA_DIARIO_TITULO = 'Mapa Diário de Caixa - Modelo BM'

/** Rótulo da primeira coluna (Modelo BM — usado também no histórico). */
export const MAPA_BM_COLUNA = 'Mapa de Caixa - Modelo BM'

/** Título do bloco de contagem obrigatório no impresso. */
export const FOLHA_CONTAGEM_TITULO = 'Folha de Contagem de Caixa (MT)'

const money = (value) =>
  `${(Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} MZN`

/**
 * Linhas da FOLHA DE CONTAGEM: Denominação | Quantidade | Subtotal.
 * @param {Object} denominations contagem { "1000": 3, "500": 2, ... }
 */
export function folhaContagemRows(denominations) {
  const rows = [
    [`${FOLHA_CONTAGEM_TITULO} — Denominação | Quantidade | Subtotal`, '']
  ]
  for (const d of MZN_DENOMINATION_META) {
    const qty = Number(denominations?.[d.key]) || 0
    rows.push([
      `${d.label} — Quantidade: ${qty.toLocaleString('pt-MZ')}`,
      `Subtotal: ${money(d.value * qty)}`
    ])
  }
  rows.push(['Total Contado', money(sumDenominations(denominations))])
  return rows
}

/**
 * Payload completo do MAPA DIÁRIO DE CAIXA — MODELO BM.
 *
 * @param {Object} params
 * @param {Object} params.register    registo do dia (usa mapa_bm, limites, …)
 * @param {Array}  [params.movements] movimentos do dia (para o Reforço de Caixa)
 * @param {string} params.userName    operador responsável pelo caixa
 * @param {string} params.dayLabel    dia formatado (dd/MM/yyyy)
 * @param {Object} [params.denominations] contagem por denominação do fecho/abertura
 * @param {Array}  [params.extraRows]    linhas adicionais (ex.: Portal vs Balcão)
 * @param {string} [params.filename]  nome-base do ficheiro
 */
export function buildMapaDiarioPayload({
  register,
  movements = [],
  userName = '—',
  dayLabel = '',
  denominations = null,
  extraRows = [],
  filename
}) {
  const mapa = register?.mapa_bm || {}
  const diferenca = Number(mapa.diferenca ?? register?.difference ?? 0)
  const semDivergencia = Math.abs(diferenca) < 0.01

  // Reforço de Caixa = fundo de maneio recebido do Cofre (ENTRADA/REFORCO_CAIXA)
  const reforcoCaixa = movements
    .filter((m) => m.category === 'REFORCO_CAIXA' && m.type === 'ENTRADA')
    .reduce((acc, m) => acc + (Number(m.amount) || 0), 0)

  const rows = [
    ['Data', dayLabel],
    ['Operador', userName],
    ['', ''],
    ['Saldo Inicial (Fundo de Maneio)', money(mapa.saldo_inicial ?? register?.opening_balance)],
    ['Total Entradas (Prestações)', money(mapa.entradas ?? register?.total_in)],
    ['Total Saídas (Desembolsos)', money(mapa.saidas ?? register?.total_out)],
    ['Reforço de Caixa', money(reforcoCaixa)],
    [
      'Total Entregas ao Cofre (Entrega de Valores ao Cofre Central)',
      money(mapa.entregas_cofre ?? 0)
    ],
    ['Depósitos Bancários (Guia de Depósito Bancário)', money(mapa.depositos_bancarios ?? 0)],
    ['Saldo Final Contado', money(mapa.saldo_final ?? register?.closing_balance_informed)],
    [
      'Diferença',
      money(diferenca) +
        (semDivergencia ? ' — caixa certo' : diferenca < 0 ? ' — quebra' : ' — sobra')
    ],
    ['', ''],
    ['Tipo de fecho', mapa.tipo_fechamento_label || register?.tipo_fechamento || '—'],
    ...extraRows.map(([a, b]) => [String(a ?? ''), String(b ?? '')]),
    ...folhaContagemRows(denominations),
    ['', ''],
    ['Assinatura do Operador: ________________________', 'Data: ____ / ____ / ________'],
    ['Assinatura do Tesoureiro: _______________________', 'Data: ____ / ____ / ________']
  ]

  return {
    title: MAPA_DIARIO_TITULO,
    meta: [
      `Data: ${dayLabel}`,
      `Operador: ${userName}`,
      `${MAPA_BM_COLUNA} — documento oficial de conferência de numerário`
    ],
    columns: [
      { label: MAPA_BM_COLUNA, width: 300 },
      { label: 'Valor (MZN)', align: 'right' }
    ],
    rows,
    filename: filename || `mapa-diario-caixa-${register?.opening_date || 'modelo-bm'}`
  }
}
