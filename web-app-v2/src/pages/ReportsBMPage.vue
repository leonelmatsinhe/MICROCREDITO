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
          <div class="col-12 col-sm-auto">
            <q-btn unelevated color="primary" icon="search" round @click="fetchData" :loading="loading">
              <q-tooltip>Gerar Relatório</q-tooltip>
            </q-btn>
          </div>
          <div class="col-auto">
            <q-btn outline color="primary" icon="picture_as_pdf" label="PDF" no-caps rounded @click="generatePDF" :disable="reportData.length === 0" />
          </div>
          <div class="col-auto">
            <q-btn outline color="primary" icon="table_chart" label="Excel" no-caps rounded @click="generateExcel" :disable="reportData.length === 0" />
          </div>
          <div class="col-auto">
            <q-btn outline color="secondary" icon="business" label="Dados da Instituição" no-caps rounded @click="showInstitution = true" />
          </div>
          <div class="col-auto">
            <q-btn outline color="grey-8" icon="info" label="Notas" no-caps rounded class="no-wrap" @click="showNotes = true" />
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
        <q-card flat bordered class="q-mb-md bm-surface-card">
          <q-card-section class="bm-table-header">
            <div class="row items-center">
              <div class="bm-table-title">
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
            <q-table v-else class="bm-report-table" :rows="reportData" :columns="tableColumns" row-key="operationNumber" flat dense :rows-per-page-options="[0]" hide-bottom style="font-size: 11px">
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
                  <span v-if="props.row.daysOverdue > 0" class="text-negative">{{ props.row.daysOverdue }}</span>
                  <span v-else class="text-dark">0</span>
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

      </template>
    </div>

    <q-dialog v-model="showNotes">
      <q-card class="notes-dialog">
          <q-card-section class="row items-center notes-header">
          <q-icon name="info" color="primary" size="22px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold notes-title">Notas Explicativas</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showNotes = false" />
        </q-card-section>
        <q-card-section class="notes-content">
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
    </q-dialog>

    <!-- Dados complementares da identificação da instituição (cabeçalho do relatório BM) -->
    <q-dialog v-model="showInstitution">
      <q-card style="min-width: 420px; max-width: 560px">
        <q-card-section class="row items-center">
          <q-icon name="business" color="secondary" size="22px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Dados da Instituição</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showInstitution = false" />
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <div class="text-caption text-grey-6">Campos do cabeçalho do relatório que não vêm do cadastro da empresa.</div>
          <q-input v-model="manualData.neighborhood" dense outlined label="Bairro" />
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model="manualData.city" dense outlined label="Cidade" /></div>
            <div class="col-6"><q-input v-model="manualData.state" dense outlined label="Estado" /></div>
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model="manualData.mobile" dense outlined label="Telemóvel" /></div>
            <div class="col-6"><q-input v-model="manualData.numberOfEmployees" dense outlined label="Nº de Trabalhadores" type="number" /></div>
          </div>
          <q-input v-model="manualData.activityStartDate" dense outlined label="Data de Início das Actividades" placeholder="DD/MM/AAAA" mask="##/##/####" />
          <q-input v-model="manualData.represented" dense outlined label="Instituição(ões) Representada(s)" placeholder="Por defeito: responsável da gestão" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fechar" no-caps color="primary" @click="showInstitution = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>
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
const showNotes = ref(false)
const showInstitution = ref(false)

function localDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)

const filters = ref({
  from: localDateString(currentMonthStart),
  to: localDateString(currentMonthEnd)
})

const manualData = ref({
  numberOfEmployees: '',
  activityStartDate: '',
  creditPurpose: 'Consumo',
  neighborhood: '',
  city: '',
  state: '',
  mobile: '',
  represented: ''
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
  return `${new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)} MZN`
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
      reportData.value = [...(data.reportData || [])].sort((first, second) => {
        return new Date(second.disbursementDate || 0) - new Date(first.disbursementDate || 0)
      })
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

    // Header image — margem direita ampla para não ficar encostado ao texto
    const headerImage = bmLogo ? [{ image: bmLogo, width: 60, margin: [0, 0, 0, 0] }] : []

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [20, 20, 20, 30],
      content: [
        // HEADER
        {
          columns: [
            ...headerImage,
            { width: 30, text: '' }, // espaçamento considerável após o logotipo
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

        // TABLE — larguras ajustadas para caber na largura útil da página (~802pt)
        {
          table: {
            headerRows: 1,
            widths: [38, 78, 50, 62, 60, 58, 48, 52, 38, 62, 62, 32, 28],
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
  return `${new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)} MZN`
}

// ==================== GERAÇÃO EXCEL ====================
// O Excel é gerado no BACKEND (exceljs) com bordas, fontes e preenchimentos
// REAIS — cópia fiel do modelo Reporte_BM_Mensal_*.xlsx. Aqui apenas pedimos o
// ficheiro (com o token de autenticação) e forçamos o download no browser.
async function generateExcel() {
  if (reportData.value.length === 0) {
    $q.notify({ type: 'warning', message: 'Gere o relatório primeiro', position: 'top' })
    return
  }

  try {
    $q.loading.show({ message: 'A gerar Excel...' })
    const api = (await import('@/boot/axios')).default
    const companyId = authStore.companyId

    const params = new URLSearchParams()
    if (filters.value.from) params.append('from', filters.value.from)
    if (filters.value.to) params.append('to', filters.value.to)
    // Campos manuais do cabeçalho (identificação da instituição)
    const man = manualData.value
    if (man.neighborhood) params.append('neighborhood', man.neighborhood)
    if (man.city) params.append('city', man.city)
    if (man.state) params.append('state', man.state)
    if (man.mobile) params.append('mobile', man.mobile)
    if (man.numberOfEmployees) params.append('numberOfEmployees', man.numberOfEmployees)
    if (man.activityStartDate) params.append('activityStartDate', man.activityStartDate)
    if (man.represented) params.append('represented', man.represented)

    const resp = await api.get(`/api/reports/banco-mocambique/${companyId}/excel?${params.toString()}`, {
      responseType: 'blob'
    })

    // Nome do ficheiro a partir do header Content-Disposition (fallback: período)
    const cd = resp.headers?.['content-disposition'] || ''
    const match = cd.match(/filename="?([^";]+)"?/)
    const periodFrom = (filters.value.from || '').split('-').reverse().join('-')
    const periodTo = (filters.value.to || '').split('-').reverse().join('-')
    const fileName = match?.[1] || `Reporte_BM_Mensal_${periodFrom}_a_${periodTo}.xlsx`

    const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    $q.notify({ type: 'positive', message: 'Excel gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar Excel:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar Excel', position: 'top' })
  } finally {
    $q.loading.hide()
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
  background: #f1f3f5;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
body.body--dark .form-card { background: #252540; border-color: rgba(255,255,255,0.06); }
.bm-surface-card { background: #f1f3f5; }
body.body--dark .bm-surface-card { background: #252540; }
.bm-table-header { background: #e5e7eb; }
.bm-table-title { color: #374151; font-weight: 600; }
body.body--dark .bm-table-header { background: #334155; }
body.body--dark .bm-table-title { color: #e2e8f0; }

.notes-dialog { width: 620px; max-width: 92vw; border-radius: 12px; }
.notes-header { background: #e5e7eb; color: #1f2937; }
.notes-title { color: #1f2937; }
.notes-content { background: #f1f3f5; font-size: 12px; line-height: 1.8; }
body.body--dark .notes-header { background: #334155; color: #e5e7eb; }
body.body--dark .notes-title { color: #e5e7eb; }
body.body--dark .notes-content { background: #252540; color: #cbd5e1; font-weight: 400; }

.bm-report-table :deep(.q-table__middle) { overflow-x: auto; }
body.body--dark .bm-report-table :deep(th),
body.body--dark .bm-report-table :deep(td) { color: #cbd5e1; font-weight: 400; }
body.body--dark .bm-report-table :deep(.bm-total-row) { color: #cbd5e1; font-weight: 400; }

.bm-total-row {
  background: #e8eaf6;
}
body.body--dark .bm-total-row {
  background: rgba(79, 70, 229, 0.2);
  color: rgba(255, 255, 255, 0.9);
}
</style>
