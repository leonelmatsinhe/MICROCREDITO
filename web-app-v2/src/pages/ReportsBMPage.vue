<template>
  <div class="reports-bm-page">
    <div class="reports-body q-pa-md">
      <!-- FORMULÁRIO -->
      <div class="form-card q-mb-md">
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-sm-2">
            <q-input v-model="filters.from" dense outlined label="Data Início" type="date" input-style="font-size: 13px" />
          </div>
          <div class="col-12 col-sm-2">
            <q-input v-model="filters.to" dense outlined label="Data Fim" type="date" input-style="font-size: 13px" />
          </div>
          <div class="col-12 col-sm-2">
            <q-btn unelevated color="primary" icon="search" label="Gerar Relatório" no-caps rounded class="full-width" @click="fetchData" :loading="loading" />
          </div>
          <div class="col-auto">
            <q-btn outline color="primary" icon="picture_as_pdf" label="Gerar PDF" no-caps rounded @click="generatePDF" :disable="reportData.length === 0" />
          </div>
          <div class="col-auto">
            <q-btn outline color="primary" icon="table_chart" label="Gerar Excel" no-caps rounded @click="generateExcel" :disable="reportData.length === 0" />
          </div>
        </div>
      </div>

      <!-- LOADING -->
      <div v-if="loading" class="text-center q-pa-xl">
        <q-spinner-dots size="40px" color="primary" />
        <div class="text-caption q-mt-sm">Carregando dados do relatório...</div>
      </div>

      <template v-else>
        <!-- TABELA PRINCIPAL -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="bg-grey-1">
            <div class="row items-center">
              <div class="text-subtitle1 text-weight-bold text-grey-8">
                <q-icon name="table_chart" class="q-mr-sm" />
                2. OPERAÇÕES DE CRÉDITO (Valores em Metical)
              </div>
              <q-space />
              <q-badge color="primary" rounded class="q-pa-sm">{{ reportData.length }} operações</q-badge>
            </div>
          </q-card-section>
          <q-card-section>
            <div v-if="reportData.length === 0" class="text-center text-grey-5 q-pa-xl">
              <q-icon name="info" size="48px" color="grey-4" />
              <div class="text-caption q-mt-sm">Nenhuma operação de crédito encontrada para o período seleccionado</div>
            </div>
            <q-table v-else :rows="reportData" :columns="tableColumns" row-key="operationNumber" flat dense :rows-per-page-options="[0]" hide-bottom style="font-size: 11px">
              <template v-slot:body-cell-operationNumber="props">
                <q-td :props="props" class="text-center text-weight-bold">{{ props.row.operationNumber }}</q-td>
              </template>
              <template v-slot:body-cell-disbursementAmount="props">
                <q-td :props="props" class="text-right">{{ formatMoney(props.row.disbursementAmount) }}</q-td>
              </template>
              <template v-slot:body-cell-installmentValue="props">
                <q-td :props="props" class="text-right">{{ formatMoney(props.row.installmentValue) }}</q-td>
              </template>
              <template v-slot:body-cell-interestRate="props">
                <q-td :props="props" class="text-center">{{ props.row.interestRate.toFixed(1) }}%</q-td>
              </template>
              <template v-slot:body-cell-creditInDebt="props">
                <q-td :props="props" class="text-right text-weight-medium">{{ formatMoney(props.row.creditInDebt) }}</q-td>
              </template>
              <template v-slot:body-cell-creditOverdue="props">
                <q-td :props="props" class="text-right">
                  <span :class="props.row.creditOverdue > 0 ? 'text-negative text-weight-bold' : ''">{{ formatMoney(props.row.creditOverdue) }}</span>
                </q-td>
              </template>
              <template v-slot:body-cell-daysOverdue="props">
                <q-td :props="props" class="text-center">
                  <q-badge v-if="props.row.daysOverdue > 0" :color="props.row.daysOverdue > 30 ? 'negative' : props.row.daysOverdue > 15 ? 'orange' : 'yellow-7'" rounded>{{ props.row.daysOverdue }}</q-badge>
                  <span v-else class="text-grey-5">0</span>
                </q-td>
              </template>
              <template v-slot:body-cell-ppe="props">
                <q-td :props="props" class="text-center">{{ props.row.ppe }}</q-td>
              </template>

              <!-- TOTAL ROW -->
              <template v-slot:bottom-row>
                <q-tr class="text-weight-bold bm-total-row">
                  <q-td class="text-center">TOTAL</q-td>
                  <q-td></q-td>
                  <q-td></q-td>
                  <q-td class="text-right">{{ formatMoney(totals.disbursementAmount) }}</q-td>
                  <q-td></q-td>
                  <q-td class="text-right">{{ formatMoney(totals.installmentValue) }}</q-td>
                  <q-td></q-td>
                  <q-td></q-td>
                  <q-td></q-td>
                  <q-td class="text-right">{{ formatMoney(totals.creditInDebt) }}</q-td>
                  <q-td class="text-right">{{ formatMoney(totals.creditOverdue) }}</q-td>
                  <q-td></q-td>
                  <q-td></q-td>
                </q-tr>
              </template>
            </q-table>
          </q-card-section>
        </q-card>

        <!-- NOTAS EXPLICATIVAS -->
        <q-card flat bordered>
          <q-card-section class="bg-grey-1">
            <div class="text-subtitle1 text-weight-bold text-grey-8">
              <q-icon name="info" class="q-mr-sm" />
              Notas Explicativas
            </div>
          </q-card-section>
          <q-card-section style="font-size: 12px; line-height: 1.8">
            <div>1- Número da operação de crédito</div>
            <div>2- Nome do cliente</div>
            <div>3- Data de desembolso inicial</div>
            <div>4- Valor do crédito concedido</div>
            <div>5- Finalidade de crédito desembolsado, designadamente para empresas, consumo ou habitação</div>
            <div>6- Montante da prestação periódica para amortizar o crédito</div>
            <div>7- Periodicidade dos pagamentos, indica se são diária, semanal, mensal ou anual</div>
            <div>8- Data de vencimento do crédito desembolsado</div>
            <div>9- Percentagem da taxa de juro aplicada ao crédito</div>
            <div>10- Montante do crédito desembolsado que falta pagar, excluindo prestações em atraso</div>
            <div>11- Montante das prestações em atraso incluindo capital e juros</div>
            <div>12- Dias em atraso do pagamento das prestações</div>
            <div>13- Crédito concedido pessoas politicamente expostas</div>
          </q-card-section>
        </q-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(false)

const filters = ref({
  from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  to: new Date().toISOString().split('T')[0]
})

const manualData = ref({
  numberOfEmployees: '',
  activityStartDate: '',
  creditPurpose: 'Consumo'
})

const purposeOptions = [
  { label: 'Consumo', value: 'Consumo' },
  { label: 'Empresa', value: 'Empresa' },
  { label: 'Habitação', value: 'Habitação' },
  { label: 'Agricultura', value: 'Agricultura' },
  { label: 'Comércio', value: 'Comércio' }
]

const company = ref({
  name: '',
  address: '',
  province: '',
  phone: '',
  email: '',
  nuit: '',
  manager: ''
})

const reportData = ref([])
const totals = ref({
  disbursementAmount: 0,
  installmentValue: 0,
  creditInDebt: 0,
  creditOverdue: 0
})

const tableColumns = [
  { name: 'operationNumber', label: 'N° Operação (1)', field: 'operationNumber', align: 'center', style: 'width: 70px' },
  { name: 'customerName', label: 'Nome Cliente (2)', field: 'customerName', align: 'left' },
  { name: 'disbursementDate', label: 'Data Desembolso (3)', field: 'disbursementDate', align: 'center' },
  { name: 'disbursementAmount', label: 'Montante Desembolso (4)', field: 'disbursementAmount', align: 'right' },
  { name: 'creditPurpose', label: 'Finalidade (5)', field: 'creditPurpose', align: 'left' },
  { name: 'installmentValue', label: 'Valor Prestação (6)', field: 'installmentValue', align: 'right' },
  { name: 'paymentFrequency', label: 'Periodicidade (7)', field: 'paymentFrequency', align: 'center' },
  { name: 'repaymentDate', label: 'Prazo Reembolso (8)', field: 'repaymentDate', align: 'center' },
  { name: 'interestRate', label: 'Taxa Juro (9)', field: 'interestRate', align: 'center' },
  { name: 'creditInDebt', label: 'Crédito Dívida (10)', field: 'creditInDebt', align: 'right' },
  { name: 'creditOverdue', label: 'Crédito Atraso (11)', field: 'creditOverdue', align: 'right' },
  { name: 'daysOverdue', label: 'Dias Atraso (12)', field: 'daysOverdue', align: 'center' },
  { name: 'ppe', label: 'PPEs (13)', field: 'ppe', align: 'center' }
]

function formatMoney(val) {
  return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(val || 0)
}

async function fetchData() {
  loading.value = true
  try {
    const api = (await import('@/boot/axios')).default
    const companyId = authStore.companyId

    const params = new URLSearchParams()
    if (filters.value.from) params.append('from', filters.value.from)
    if (filters.value.to) params.append('to', filters.value.to)

    const resp = await api.get(`/api/reports/banco-mocambique/${companyId}?${params.toString()}`)
    const data = resp?.data

    if (data && typeof data === 'object' && data.success) {
      company.value = data.company || {}
      reportData.value = data.reportData || []
      totals.value = data.totals || {}
    } else {
      console.warn('BM Report: resposta inválida', data)
      $q.notify({ type: 'warning', message: 'Resposta inválida da API', position: 'top' })
    }
  } catch (e) {
    console.error('Erro ao buscar relatório BM:', e)
    $q.notify({ type: 'negative', message: 'Erro ao carregar dados do relatório', position: 'top' })
  } finally {
    loading.value = false
  }
}

// ==================== GERAÇÃO PDF ====================
async function generatePDF() {
  if (reportData.value.length === 0) {
    $q.notify({ type: 'warning', message: 'Gere o relatório primeiro', position: 'top' })
    return
  }

  try {
    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    // Buscar logotipo do BM
    let bmLogo = null
    try {
      const resp = await fetch('/BMLogo.png')
      if (resp.ok) {
        const blob = await resp.blob()
        bmLogo = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })
      }
    } catch {}

    const comp = company.value
    const now = new Date()
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    // Header image
    const headerImage = bmLogo ? [{ image: bmLogo, width: 60, margin: [0, 0, 20, 0] }] : []

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [20, 20, 20, 30],
      content: [
        // HEADER
        {
          columns: [
            ...headerImage,
            {
              width: '*',
              stack: [
                { text: 'BANCO DE MOÇAMBIQUE', style: 'headerTitle', margin: [0, 0, 0, 2] },
                { text: 'ENTIDADE DE SUPERVISÃO PRUDENCIAL', style: 'headerSub' },
                { text: 'MONITORIA DE INFORMAÇÕES DE MICROFINANÇAS', style: 'headerSub' }
              ]
            },
            {
              width: 200,
              stack: [
                { text: 'PERÍODO DE REPORTE:', style: 'labelText', margin: [0, 0, 0, 2] },
                { text: `DATA: ${dateStr} (DDMMAAAA)`, style: 'valueText' }
              ]
            }
          ],
          margin: [0, 0, 0, 15]
        },

        { text: '1. IDENTIFICAÇÃO DA INSTITUIÇÃO', style: 'sectionTitle', margin: [0, 0, 0, 5] },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: `Denominação: ${comp.name || '-'}`, style: 'cellText' },
                { text: `N° de Trabalhadores: ${manualData.value.numberOfEmployees || '-'}`, style: 'cellText' },
                { text: `NUIT: ${comp.nuit || '-'}`, style: 'cellText' }
              ],
              [
                { text: `Endereço: ${comp.address || '-'}`, style: 'cellText' },
                { text: `Data de Início: ${manualData.value.activityStartDate || '-'}`, style: 'cellText' },
                { text: `Província: ${comp.province || '-'}`, style: 'cellText' }
              ],
              [
                { text: `Telefone: ${comp.phone || '-'}`, style: 'cellText' },
                { text: `E-mail: ${comp.email || '-'}`, style: 'cellText' },
                { text: `Responsável: ${comp.manager || '-'}`, style: 'cellText' }
              ]
            ]
          },
          layout: 'grid',
          margin: [0, 0, 0, 15]
        },

        { text: '(Valores em Metical)', style: 'labelText', alignment: 'right', margin: [0, 0, 0, 5] },

        // TABLE
        {
          table: {
            headerRows: 1,
            widths: [45, 80, 55, 65, 65, 60, 50, 55, 40, 65, 65, 35, 30],
            body: [
              // Header
              [
                { text: 'N° Operação\n(1)', style: 'tableHeader' },
                { text: 'Nome do\nCliente (2)', style: 'tableHeader' },
                { text: 'Data\nDesembolso (3)', style: 'tableHeader' },
                { text: 'Montante do\nDesembolso (4)', style: 'tableHeader' },
                { text: 'Finalidade\ndo Crédito (5)', style: 'tableHeader' },
                { text: 'Valor da\nPrestação (6)', style: 'tableHeader' },
                { text: 'Periodicidade\n(7)', style: 'tableHeader' },
                { text: 'Prazo\nReembolso (8)', style: 'tableHeader' },
                { text: 'Taxa\nJuro (9)', style: 'tableHeader' },
                { text: 'Crédito em\nDívida (10)', style: 'tableHeader' },
                { text: 'Crédito em\nAtraso (11)', style: 'tableHeader' },
                { text: 'Dias\nAtraso (12)', style: 'tableHeader' },
                { text: 'PPEs\n(13)', style: 'tableHeader' }
              ],
              // Data rows
              ...reportData.value.map(row => [
                { text: String(row.operationNumber), style: 'cellCenter' },
                { text: row.customerName || '-', style: 'cellText' },
                { text: row.disbursementDate || '-', style: 'cellCenter' },
                { text: formatMoneyRaw(row.disbursementAmount), style: 'cellRight' },
                { text: row.creditPurpose || '-', style: 'cellText' },
                { text: formatMoneyRaw(row.installmentValue), style: 'cellRight' },
                { text: row.paymentFrequency || 'Mensal', style: 'cellCenter' },
                { text: row.repaymentDate || '-', style: 'cellCenter' },
                { text: `${row.interestRate.toFixed(1)}%`, style: 'cellCenter' },
                { text: formatMoneyRaw(row.creditInDebt), style: 'cellRight' },
                { text: formatMoneyRaw(row.creditOverdue), style: 'cellRight' },
                { text: String(row.daysOverdue), style: 'cellCenter' },
                { text: row.ppe || 'Não', style: 'cellCenter' }
              ]),
              // TOTAL row
              [
                { text: 'TOTAL', style: 'totalCell' },
                { text: '', style: 'totalCell' },
                { text: '', style: 'totalCell' },
                { text: formatMoneyRaw(totals.value.disbursementAmount), style: 'totalCellRight' },
                { text: '', style: 'totalCell' },
                { text: formatMoneyRaw(totals.value.installmentValue), style: 'totalCellRight' },
                { text: '', style: 'totalCell' },
                { text: '', style: 'totalCell' },
                { text: '', style: 'totalCell' },
                { text: formatMoneyRaw(totals.value.creditInDebt), style: 'totalCellRight' },
                { text: formatMoneyRaw(totals.value.creditOverdue), style: 'totalCellRight' },
                { text: '', style: 'totalCell' },
                { text: '', style: 'totalCell' }
              ]
            ]
          },
          layout: 'grid',
          margin: [0, 0, 0, 15]
        },

        // NOTAS
        { text: 'Notas Explicativas', style: 'sectionTitle', margin: [0, 10, 0, 5] },
        {
          ol: [
            '1- Número da operação de crédito',
            '2- Nome do cliente',
            '3- Data de desembolso inicial',
            '4- Valor do crédito concedido',
            '5- Finalidade de crédito desembolsado, designadamente para empresas, consumo ou habitação',
            '6- Montante da prestação periódica para amortizar o crédito',
            '7- Periodicidade dos pagamentos, indica se são diária, semanal, mensal ou anual',
            '8- Data de vencimento do crédito desembolsado',
            '9- Percentagem da taxa de juro aplicada ao crédito',
            '10- Montante do crédito desembolsado que falta pagar, excluindo prestações em atraso',
            '11- Montante das prestações em atraso incluindo capital e juros',
            '12- Dias em atraso do pagamento das prestações',
            '13- Crédito concedido pessoas politicamente expostas'
          ],
          style: 'notesText'
        }
      ],
      styles: {
        headerTitle: { fontSize: 14, bold: true, color: '#1a237e' },
        headerSub: { fontSize: 8, bold: true, color: '#37474f' },
        sectionTitle: { fontSize: 10, bold: true, margin: [0, 0, 0, 3] },
        labelText: { fontSize: 8, bold: true },
        valueText: { fontSize: 8 },
        cellText: { fontSize: 7 },
        cellCenter: { fontSize: 7, alignment: 'center' },
        cellRight: { fontSize: 7, alignment: 'right' },
        tableHeader: { fontSize: 6.5, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
        totalCell: { fontSize: 7, bold: true, alignment: 'center', fillColor: '#e0e0e0' },
        totalCellRight: { fontSize: 7, bold: true, alignment: 'right', fillColor: '#e0e0e0' },
        notesText: { fontSize: 7, margin: [0, 2, 0, 0] }
      }
    }

    pdfMake.createPdf(docDefinition).open()
    $q.notify({ type: 'positive', message: 'PDF gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar PDF:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF', position: 'top' })
  }
}

function formatMoneyRaw(val) {
  return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)
}

// ==================== GERAÇÃO EXCEL ====================
async function generateExcel() {
  if (reportData.value.length === 0) {
    $q.notify({ type: 'warning', message: 'Gere o relatório primeiro', position: 'top' })
    return
  }

  try {
    const XLSX = await import('xlsx')

    const comp = company.value
    const now = new Date()
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    // Build worksheet data
    const wsData = [
      // Header
      ['BANCO DE MOÇAMBIQUE'],
      ['ENTIDADE DE SUPERVISÃO PRUDENCIAL'],
      ['MONITORIA DE INFORMAÇÕES DE MICROFINANÇAS'],
      [],
      ['PERÍODO DE REPORTE:'],
      [`DATA: ${dateStr} (DDMMAAAA)`],
      [],
      ['1. IDENTIFICAÇÃO DA INSTITUIÇÃO'],
      [`Denominação: ${comp.name || ''}`, `N° de Trabalhadores: ${manualData.value.numberOfEmployees || ''}`, `NUIT: ${comp.nuit || ''}`],
      [`Endereço: ${comp.address || ''}`, `Data de Início: ${manualData.value.activityStartDate || ''}`, `Província: ${comp.province || ''}`],
      [`Telefone: ${comp.phone || ''}`, `E-mail: ${comp.email || ''}`, `Responsável: ${comp.manager || ''}`],
      [],
      ['(Valores em Metical)'],
      [],
      // Table header
      ['N° Operação (1)', 'Nome Cliente (2)', 'Data Desembolso (3)', 'Montante Desembolso (4)', 'Finalidade Crédito (5)', 'Valor Prestação (6)', 'Periodicidade (7)', 'Prazo Reembolso (8)', 'Taxa Juro (9)', 'Crédito Dívida (10)', 'Crédito Atraso (11)', 'Dias Atraso (12)', 'PPEs (13)'],
      // Data rows
      ...reportData.value.map(row => [
        row.operationNumber,
        row.customerName || '-',
        row.disbursementDate || '-',
        row.disbursementAmount,
        row.creditPurpose || '-',
        row.installmentValue,
        row.paymentFrequency || 'Mensal',
        row.repaymentDate || '-',
        `${row.interestRate.toFixed(1)}%`,
        row.creditInDebt,
        row.creditOverdue,
        row.daysOverdue,
        row.ppe || 'Não'
      ]),
      // Total
      ['TOTAL', '', '', totals.value.disbursementAmount, '', totals.value.installmentValue, '', '', '', totals.value.creditInDebt, totals.value.creditOverdue, '', ''],
      [],
      [],
      ['Notas Explicativas'],
      ['1- Número da operação de crédito'],
      ['2- Nome do cliente'],
      ['3- Data de desembolso inicial'],
      ['4- Valor do crédito concedido'],
      ['5- Finalidade de crédito desembolsado, designadamente para empresas, consumo ou habitação'],
      ['6- Montante da prestação periódica para amortizar o crédito'],
      ['7- Periodicidade dos pagamentos, indica se são diária, semanal, mensal ou anual'],
      ['8- Data de vencimento do crédito desembolsado'],
      ['9- Percentagem da taxa de juro aplicada ao crédito'],
      ['10- Montante do crédito desembolsado que falta pagar, excluindo prestações em atraso'],
      ['11- Montante das prestações em atraso incluindo capital e juros'],
      ['12- Dias em atraso do pagamento das prestações'],
      ['13- Crédito concedido pessoas politicamente expostas']
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Column widths
    ws['!cols'] = [
      { wch: 12 }, // N° Operação
      { wch: 25 }, // Nome Cliente
      { wch: 14 }, // Data Desembolso
      { wch: 18 }, // Montante
      { wch: 15 }, // Finalidade
      { wch: 16 }, // Valor Prestação
      { wch: 14 }, // Periodicidade
      { wch: 14 }, // Prazo Reembolso
      { wch: 10 }, // Taxa Juro
      { wch: 18 }, // Crédito Dívida
      { wch: 18 }, // Crédito Atraso
      { wch: 10 }, // Dias Atraso
      { wch: 8 }   // PPEs
    ]

    // Merge header cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 2 } }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório BM')

    const fileName = `relatorio-bm-${filters.value.from}-${filters.value.to}.xlsx`
    XLSX.writeFile(wb, fileName)

    $q.notify({ type: 'positive', message: 'Excel gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar Excel:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar Excel', position: 'top' })
  }
}

onMounted(async () => {
  // Fetch company data
  const companyId = authStore.companyId
  if (companyId && !companyStore.hasCompany) {
    await companyStore.fetchCompany(companyId)
  }
  // Pre-fill company from store
  if (companyStore.company) {
    company.value = {
      name: companyStore.companyName || '',
      address: companyStore.company?.companyAddress || '',
      province: companyStore.company?.provinceId || '',
      phone: companyStore.company?.companyPhone || '',
      email: companyStore.company?.companyEmail || '',
      nuit: companyStore.company?.companyNuit || '',
      manager: companyStore.company?.companyManager || ''
    }
  }
  // Auto-load report data
  await fetchData()
})
</script>

<style lang="scss" scoped>

.reports-body {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}
body.body--dark .reports-body { background: #1a1a2e; }

.form-card {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
body.body--dark .form-card { background: #252540; border-color: rgba(255,255,255,0.06); }

.bm-total-row {
  background: #e8eaf6;
}
body.body--dark .bm-total-row {
  background: rgba(79, 70, 229, 0.2);
  color: rgba(255, 255, 255, 0.9);
}
</style>
