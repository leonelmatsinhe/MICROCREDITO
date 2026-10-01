import { api } from '@/boot/axios'

/**
 * EXPORTAÇÃO TABELAR DE PDF — GERADO NO BACKEND
 * ---------------------------------------------------------------------------
 * REGRA: documento PDF nunca é gerado no browser (recibo é fiscal; relatórios
 * ficam consistentes com a mesma stack). Este utilitário envia os dados ao
 * envia { title, columns, rows, orientation, totalsRow } para
 * POST /api/reports/table-pdf (pdfkit no servidor) e guarda/abre o blob.
 */

/**
 * Gera o PDF no backend e faz o download do ficheiro.
 * @param {Object} payload { title, subtitle?, meta?, columns, rows, totalsRow?, orientation?, filename? }
 * @param {string} [saveAs] nome do ficheiro a guardar
 */
export async function downloadTablePdf(payload, saveAs) {
  const response = await api.post('/api/reports/table-pdf', payload, { responseType: 'blob' })
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = saveAs || `${payload?.filename || 'relatorio'}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => window.URL.revokeObjectURL(url), 30000)
  return response
}

/**
 * Gera o PDF no backend e abre numa nova aba (visualização).
 */
export async function openTablePdf(payload) {
  const response = await api.post('/api/reports/table-pdf', payload, { responseType: 'blob' })
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  return response
}

/**
 * Lê mensagens de erro do backend quando a resposta vem como Blob.
 */
export async function tablePdfError(e, fallback = 'Erro ao gerar PDF') {
  try {
    if (e.response?.data instanceof Blob) {
      const text = await e.response.data.text()
      const parsed = JSON.parse(text)
      return parsed?.message || fallback
    }
  } catch { /* resposta não-JSON */ }
  return e.response?.data?.message || e.message || fallback
}
