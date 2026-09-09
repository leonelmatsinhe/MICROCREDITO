import { api } from '@/boot/axios'

/**
 * Pede ao backend a geração de um Excel (estilos reais, padrão do relatório BM)
 * e força o download no browser. O token de autenticação é enviado pelo
 * interceptor do axios, por isso funciona com as rotas protegidas.
 *
 * @param {string} endpoint  — ex.: '/api/export/loans/excel'
 * @param {object} payload   — corpo POST (rows + metadados, ex.: segmentLabel)
 * @param {string} fallbackName — nome do ficheiro se o header não trouxer
 */
export async function downloadExcelFromBackend(endpoint, payload, fallbackName) {
  const resp = await api.post(endpoint, payload, { responseType: 'blob' })
  const cd = resp.headers?.['content-disposition'] || ''
  const match = cd.match(/filename="?([^";]+)"?/)
  const fileName = match?.[1] || fallbackName
  const blob = new Blob([resp.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
