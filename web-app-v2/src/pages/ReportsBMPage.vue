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

        <!-- PAGAMENTOS POR CANAL (Portal vs Balcão) — do caixa do período -->
        <q-card v-if="treasuryPayments" flat bordered class="q-mb-md bm-surface-card">
          <q-card-section class="bm-table-header">
            <div class="row items-center">
              <div class="bm-table-title">
                <q-icon name="call_split" class="q-mr-sm" />
                3. PAGAMENTOS POR CANAL — Portal vs Balcão (Valores em Metical)
              </div>
              <q-space />
              <q-badge color="purple" rounded class="q-pa-sm">Portal · {{ treasuryPayments.portal?.registerCount || 0 }} caixa(s)</q-badge>
              <q-badge color="primary" rounded class="q-pa-sm q-ml-sm">Balcão · {{ treasuryPayments.inPerson?.registerCount || 0 }} caixa(s)</q-badge>
            </div>
          </q-card-section>
          <q-card-section>
            <q-markup-table flat dense separator="cell" class="bm-report-table" style="font-size: 11px">
              <thead>
                <tr class="text-weight-bold">
                  <th style="width: 22%">Canal</th>
                  <th style="width: 16%">Método</th>
                  <th class="text-right">Entradas</th>
                  <th class="text-right">Saídas</th>
                  <th class="text-right">Líquido</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(row, idx) in paymentsRows" :key="idx">
                  <tr>
                    <td :class="row.channel === 'Portal (fora de expediente)' ? 'text-purple text-weight-medium' : 'text-primary text-weight-medium'" :style="row.isFirst ? '' : 'border-top: none'">{{ row.isFirst ? row.channel : '' }}</td>
                    <td>{{ row.method }}</td>
                    <td class="text-right text-positive text-weight-medium">{{ formatMoney(row.in) }}</td>
                    <td class="text-right text-negative text-weight-medium">{{ formatMoney(row.out) }}</td>
                    <td class="text-right text-weight-bold">{{ formatMoney(row.net) }}</td>
                  </tr>
                </template>
                <tr class="text-weight-bold bm-total-row">
                  <td>TOTAL</td>
                  <td></td>
                  <td class="text-right">{{ formatMoney(paymentsTotals.in) }}</td>
                  <td class="text-right">{{ formatMoney(paymentsTotals.out) }}</td>
                  <td class="text-right">{{ formatMoney(paymentsTotals.net) }}</td>
                </tr>
              </tbody>
            </q-markup-table>
            <div class="text-caption text-grey-6 q-mt-sm">
              Portal = pagamentos recebidos automaticamente no portal do cliente fora do expediente (Caixa do Sistema). Balcão = cobranças presenciais registadas pelos operadores.
            </div>
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
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'

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
// Pagamentos por canal (portal vs presencial) — vem de cash_movements do período
const treasuryPayments = ref(null)
const METHOD_LABELS = { MPESA: 'M-Pesa', BANK: 'Transferência bancária', EMOLA: 'e-Mola', CASH: 'Dinheiro físico' }

// Linhas achatadas [canal, método, entradas, saídas, líquido] para o quadro
const paymentsRows = computed(() => {
  const tp = treasuryPayments.value
  if (!tp) return []
  const channels = [
    { label: 'Portal (fora de expediente)', ch: tp.portal },
    { label: 'Balcão (presencial)', ch: tp.inPerson }
  ]
  const rows = []
  channels.forEach(({ label, ch }) => {
    const methods = ['MPESA', 'BANK', 'EMOLA', 'CASH']
    methods.forEach((m, i) => {
      const cell = ch?.[m] || { in: 0, out: 0 }
      rows.push({
        channel: label,
        isFirst: i === 0,
        method: METHOD_LABELS[m],
        in: cell.in,
        out: cell.out,
        net: Math.round(((cell.in || 0) - (cell.out || 0)) * 100) / 100
      })
    })
  })
  return rows
})

// Totais globais do quadro (portal + balcão)
const paymentsTotals = computed(() => {
  return paymentsRows.value.reduce(
    (acc, r) => {
      acc.in += Number(r.in) || 0
      acc.out += Number(r.out) || 0
      acc.net += Number(r.net) || 0
      return acc
    },
    { in: 0, out: 0, net: 0 }
  )
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
      treasuryPayments.value = data.treasuryPayments || null
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
    // PDF GERADO NO BACKEND — POST /api/reports/table-pdf (pdfkit no servidor).
    // O modelo do BM mantém-se: cabeçalho identificado na meta, tabela com as
    // 13 colunas oficiais, linha TOTAL e notas explicativas na 2.ª página.
    const { openTablePdf, tablePdfError } = await import('@/utils/tablePdf')
    const comp = company.value
    const now = new Date()
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    const bmRows = reportData.value.map(row => [
      String(row.operationNumber),
      row.customerName || '-',
      row.disbursementDate || '-',
      formatMoneyRaw(row.disbursementAmount),
      row.creditPurpose || '-',
      formatMoneyRaw(row.installmentValue),
      row.paymentFrequency || 'Mensal',
      row.repaymentDate || '-',
      `${row.interestRate.toFixed(1)}%`,
      formatMoneyRaw(row.creditInDebt),
      formatMoneyRaw(row.creditOverdue),
      String(row.daysOverdue),
      row.ppe || 'Não'
    ])

    await openTablePdf({
      title: 'BANCO DE MOÇAMBIQUE — Monitoria de Informações de Microfinanças',
      meta: [
        'Entidade de Supervisão Prudencial',
        `Denominação: ${comp.name || '-'} · NUIT: ${comp.nuit || '-'} · Província: ${comp.province || '-'}`,
        `Endereço: ${comp.address || '-'} · Tel.: ${comp.phone || '-'} · E-mail: ${comp.email || '-'} · Responsável: ${comp.manager || '-'}`,
        `N° de Trabalhadores: ${manualData.value.numberOfEmployees || '-'} · Data de Início: ${manualData.value.activityStartDate || '-'} · DATA: ${dateStr} (DDMMAAAA)`,
        '(Valores em Metical)'
      ],
      orientation: 'landscape',
      filename: 'reporte-bm-mensal',
      columns: [
        { label: 'N° Operação (1)', width: 40, align: 'center' },
        { label: 'Nome do Cliente (2)', width: 90 },
        { label: 'Data Desembolso (3)', width: 60, align: 'center' },
        { label: 'Montante do Desembolso (4)', width: 70, align: 'right' },
        { label: 'Finalidade do Crédito (5)', width: 80 },
        { label: 'Valor da Prestação (6)', width: 65, align: 'right' },
        { label: 'Periodicidade (7)', width: 55, align: 'center' },
        { label: 'Prazo Reembolso (8)', width: 60, align: 'center' },
        { label: 'Taxa Juro (9)', width: 40, align: 'center' },
        { label: 'Crédito em Dívida (10)', width: 68, align: 'right' },
        { label: 'Crédito em Atraso (11)', width: 68, align: 'right' },
        { label: 'Dias Atraso (12)', width: 38, align: 'center' },
        { label: 'PPEs (13)', width: 36, align: 'center' }
      ],
      rows: bmRows,
      totalsRow: [
        'TOTAL', '', '',
        formatMoneyRaw(totals.value.disbursementAmount), '',
        formatMoneyRaw(totals.value.installmentValue), '', '', '',
        formatMoneyRaw(totals.value.creditInDebt),
        formatMoneyRaw(totals.value.creditOverdue), '', ''
      ]
    })

    // Notas explicativas — 2.º PDF (o endpoint tabelar é tabular puro)
    const notes = [
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
    ]
    await openTablePdf({
      title: 'Notas Explicativas — Reporte BM',
      meta: [`Denominação: ${comp.name || '-'} · ${dateStr}`],
      filename: 'reporte-bm-notas',
      columns: [{ label: 'N°', width: 30, align: 'center' }, { label: 'Nota' }],
      rows: notes.map(n => [n.slice(0, n.indexOf('-')).trim(), n.slice(n.indexOf('-') + 1).trim()])
    })

    // 3. Pagamentos por canal — só quando há dados do caixa
    if (treasuryPayments.value) {
      await openTablePdf({
        title: '3. Pagamentos por Canal — Portal vs Balcão',
        meta: [`Denominação: ${comp.name || '-'} · ${dateStr}`],
        filename: 'reporte-bm-canais',
        columns: [
          { label: 'Canal', width: 120 },
          { label: 'Método', width: 100 },
          { label: 'Entradas', width: 90, align: 'right' },
          { label: 'Saídas', width: 90, align: 'right' },
          { label: 'Líquido', width: 90, align: 'right' }
        ],
        rows: paymentsRows.value.map(r => [
          r.isFirst ? r.channel : '',
          r.method,
          formatMoneyRaw(r.in),
          formatMoneyRaw(r.out),
          formatMoneyRaw(r.net)
        ]),
        totalsRow: ['TOTAL', '', formatMoneyRaw(paymentsTotals.value.in), formatMoneyRaw(paymentsTotals.value.out), formatMoneyRaw(paymentsTotals.value.net)]
      })
    }

    $q.notify({ type: 'positive', message: 'PDF gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar PDF:', e)
    $q.notify({ type: 'negative', message: await (await import('@/utils/tablePdf')).tablePdfError(e, 'Erro ao gerar PDF'), position: 'top' })
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
