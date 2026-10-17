/**
 * VERIFICAÇÃO DO CRITÉRIO DE ACEITE — MAPA DIÁRIO DE CAIXA (MODELO BM)
 * ---------------------------------------------------------------------------
 * O "print do Mapa" é o payload enviado a POST /api/reports/table-pdf
 * (title/meta/columns/rows). Este script constrói o payload através do util
 * partilhado (web-app-v2/src/utils/mapaDiarioBM.js) com dados de exemplo e
 * valida as strings obrigatórias/proibidas:
 *
 *   OBRIGATÓRIAS: "Mapa Diário de Caixa", "Mapa de Caixa - Modelo BM",
 *     "Entrega de Valores ao Cofre Central", "Reforço de Caixa",
 *     "Folha de Contagem", "Saldo Inicial", "Entradas", "Saídas",
 *     "Entregas ao Cofre", "Saldo Final", "Data", "Operador",
 *     "Assinatura do Operador", "Assinatura do Tesoureiro"
 *   PROIBIDAS: "sangria", "suprimento" (termos brasileiros)
 *
 * Uso: node scripts/check-mapa-diario.mjs  (exit 0 = conformidade OK)
 */
import { buildMapaDiarioPayload } from '../web-app-v2/src/utils/mapaDiarioBM.js'

// ── Dados de exemplo (mesma forma dos dados reais do /today) ──
const register = {
  opening_date: '2026-10-16',
  opening_balance: 2100,
  total_in: 70500,
  total_out: 0,
  closing_balance_informed: 31500,
  difference: -100,
  tipo_fechamento: 'DIVERGENCIA',
  mapa_bm: {
    saldo_inicial: 2100,
    entradas: 70500,
    saidas: 0,
    entregas_cofre: 40000,
    depositos_bancarios: 1000,
    saldo_final: 31500,
    diferenca: -100,
    tipo_fechamento_label: 'Fecho com divergência — auto de ocorrência (conta 58)'
  }
}
const movements = [
  { category: 'REFORCO_CAIXA', type: 'ENTRADA', amount: 5000 },
  { category: 'ENTREGA_COFRE', type: 'SAIDA', amount: 40000 }
]
const denominations = { '1000': 30, '500': 2, '100': 3, '50': 10, '20': 25, '10': 20, '5': 20, '2': 25, '1': 35, '0.5': 30 }

const payload = buildMapaDiarioPayload({
  register,
  movements,
  userName: 'Operador de Teste',
  dayLabel: '16/10/2026',
  denominations
})

// Todo o texto impresso (título, meta, colunas e linhas).
const textoImpresso = [
  payload.title,
  payload.subtitle || '',
  ...(payload.meta || []),
  ...(payload.columns || []).map((c) => c.label || ''),
  ...payload.rows.flat().map((c) => String(c ?? ''))
].join('\n')

const obrigatorias = [
  'Mapa Diário de Caixa',
  'Mapa de Caixa - Modelo BM',
  'Entrega de Valores ao Cofre Central',
  'Reforço de Caixa',
  'Folha de Contagem',
  'Saldo Inicial',
  'Entradas',
  'Saídas',
  'Entregas ao Cofre',
  'Saldo Final',
  'Data',
  'Operador',
  'Assinatura do Operador',
  'Assinatura do Tesoureiro'
]
const proibidas = ['sangria', 'suprimento']

let falhas = 0
for (const s of obrigatorias) {
  const ok = textoImpresso.includes(s)
  console.log(`  ${ok ? '✓' : '✗'} obrigatória: "${s}"`)
  if (!ok) falhas++
}
for (const s of proibidas) {
  const ausente = !textoImpresso.toLowerCase().includes(s.toLowerCase())
  console.log(`  ${ausente ? '✓' : '✗'} proibida ausente: "${s}"`)
  if (!ausente) falhas++
}

if (falhas > 0) {
  console.error(`\nMAPA DIÁRIO: ${falhas} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nMAPA DIÁRIO DE CAIXA — CRITÉRIO DE ACEITE OK')
