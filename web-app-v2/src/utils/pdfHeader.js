/**
 * Cabeçalho comum para documentos PDF da empresa
 * Formato exacto conforme solicitado:
 * - Logo à esquerda
 * - Nome da empresa em azul/negrito
 * - Endereço, NUIT, Tel/Email, Website
 * - Linha separadora azul
 * - Título do documento
 */

/**
 * Formatar data para DD/MM/AAAA
 */
function formatDateBR(date) {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/**
 * Formatar valor em MZN
 */
export function formatMoney(value) {
  return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value || 0)
}

/**
 * Gerar cabeçalho da empresa para PDF
 * @param {Object} company - Dados da empresa
 * @param {string} logoBase64 - Logo em base64 (opcional)
 * @param {string} title - Título do documento
 * @returns {Array} Array de elementos pdfmake
 */
export function buildCompanyHeader(company, logoBase64, title) {
  const comp = company || {}

  const header = [
    // Cabeçalho: Dados da empresa à esquerda + Logo à direita
    {
      columns: [
        // Dados da empresa à esquerda
        {
          width: '*',
          stack: [
            { text: comp.companyName || 'Empresa', fontSize: 14, bold: true, color: '#1565c0', margin: [0, 0, 0, 3] },
            { text: comp.companyAddress || '', fontSize: 8, color: '#444', margin: [0, 0, 0, 2] },
            { text: `NUIT: ${comp.companyNuit || ''}`, fontSize: 8, color: '#444', margin: [0, 0, 0, 2] },
            { text: `Tel: ${comp.companyPhone || ''} | Email: ${comp.companyEmail || ''}`, fontSize: 8, color: '#444', margin: [0, 0, 0, 2] },
            comp.companyWebsite ? { text: `Website: ${comp.companyWebsite}`, fontSize: 8, color: '#444' } : null
          ].filter(Boolean)
        },
        // Logo à direita
        logoBase64
          ? { image: logoBase64, width: 80, height: 80, margin: [15, 0, 0, 0] }
          : { text: '', width: 95 }
      ],
      margin: [30, 15, 30, 10]
    },
    // Linha separadora azul (largura completa)
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 2, lineColor: '#1565c0' }], margin: [30, 0, 30, 10] },
    // Título do documento
    { text: title.toUpperCase(), fontSize: 13, bold: true, alignment: 'center', color: '#000000', margin: [0, 5, 0, 10] }
  ]

  return header
}

/**
 * Rodapé comum para documentos PDF
 * @returns {Object} Elemento pdfmake para footer
 */
export function buildCompanyFooter(company) {
  const comp = company || {}
  return {
    columns: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 0.5, lineColor: '#e0e0e0' }], margin: [0, 5, 0, 8] },
    ],
    margin: [30, 0, 30, 5]
  }
}

/**
 * Rodapé completo com assinatura
 */
export function buildFooterWithSignature(company) {
  const comp = company || {}
  return [
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 0.5, lineColor: '#e0e0e0' }], margin: [30, 10, 30, 8] },
    {
      columns: [
        { text: 'Documento processado por computador', fontSize: 6, color: '#bbb' },
        { text: 'Assinatura: ___________________', fontSize: 6, color: '#bbb', alignment: 'right' }
      ]
    },
    {
      text: `${comp.companyName || ''} | ${comp.companyAddress || ''} | Tel: ${comp.companyPhone || ''}`,
      fontSize: 5, color: '#ddd', alignment: 'center', margin: [0, 8, 0, 0]
    }
  ]
}

/**
 * Estilos comuns para documentos PDF
 */
export const commonStyles = {
  headerTitle: { fontSize: 14, bold: true, color: '#1a237e' },
  headerSub: { fontSize: 8, color: '#37474f' },
  sectionTitle: { fontSize: 10, bold: true, color: '#1a237e', margin: [0, 0, 0, 5] },
  labelText: { fontSize: 8, bold: true },
  valueText: { fontSize: 8 },
  cellText: { fontSize: 7 },
  cellCenter: { fontSize: 7, alignment: 'center' },
  cellRight: { fontSize: 7, alignment: 'right' },
  cellRightBold: { fontSize: 7, alignment: 'right', bold: true },
  tableHeader: { fontSize: 7, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
  totalCell: { fontSize: 7, bold: true, alignment: 'center', fillColor: '#e0e0e0' },
  totalCellRight: { fontSize: 7, bold: true, alignment: 'right', fillColor: '#e0e0e0' }
}

/**
 * Layout de tabela com bordas suaves
 */
export const tableLayout = {
  hLineWidth: (i, node) => i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
  vLineWidth: () => 0.5,
  hLineColor: (i) => i <= 1 ? '#1a237e' : '#e0e0e0',
  vLineColor: () => '#e0e0e0',
  paddingTop: () => 4,
  paddingBottom: () => 4,
  paddingLeft: () => 5,
  paddingRight: () => 5,
  fillColor: (i, node) => i > 1 && i % 2 === 0 ? '#f5f5f5' : null
}

/**
 * Layout de tabela para dados do cliente
 */
export const infoTableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#e0e0e0',
  vLineColor: () => '#e0e0e0',
  paddingTop: () => 5,
  paddingBottom: () => 5,
  paddingLeft: () => 6,
  paddingRight: () => 6
}
