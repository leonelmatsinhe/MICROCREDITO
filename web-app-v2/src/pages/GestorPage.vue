<template>
  <div class="q-pa-md">
    <!-- Filtros + Acções -->
    <q-card flat bordered class="q-mb-md filter-card">
      <q-card-section class="row q-col-gutter-xs items-center no-wrap">
        <div class="col">
          <q-select v-model="filter.status" :options="statusOptions" label="Estado" dense outlined emit-value map-options clearable />
        </div>
        <div class="col">
          <q-input v-model="filter.search" label="Pesquisar mutuário" dense outlined clearable>
            <template v-slot:prepend><q-icon name="search" size="16px" /></template>
          </q-input>
        </div>
        <div class="col">
          <q-input v-model="filter.from" dense outlined label="De" type="date" />
        </div>
        <div class="col">
          <q-input v-model="filter.to" dense outlined label="Até" type="date" />
        </div>
        <div class="col-auto row q-gutter-xs no-wrap">
          <q-btn outline color="primary" icon="refresh" no-caps rounded dense @click="loadData" :loading="loading">
            <q-tooltip>Sincronizar</q-tooltip>
          </q-btn>
          <q-btn outline color="primary" icon="clear_all" no-caps rounded dense @click="clearFilter">
            <q-tooltip>Limpar filtros</q-tooltip>
          </q-btn>
          <q-btn outline color="primary" icon="picture_as_pdf" no-caps rounded dense @click="downloadPDF" :disable="filteredInstallments.length === 0">
            <q-tooltip>Baixar PDF</q-tooltip>
          </q-btn>
        </div>
      </q-card-section>
    </q-card>

    <!-- KPIs -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="row items-center">
            <q-avatar size="40px" color="blue" text-color="white" class="q-mr-sm">
              <q-icon name="event" size="20px" />
            </q-avatar>
            <div>
              <div class="text-h5 text-weight-bold">{{ stats.total }}</div>
              <div class="text-caption text-grey-6">Total Prestações</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="row items-center">
            <q-avatar size="40px" color="positive" text-color="white" class="q-mr-sm">
              <q-icon name="check_circle" size="20px" />
            </q-avatar>
            <div>
              <div class="text-h5 text-weight-bold text-positive">{{ stats.paid }}</div>
              <div class="text-caption text-grey-6">Pagas</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="row items-center">
            <q-avatar size="40px" color="orange" text-color="white" class="q-mr-sm">
              <q-icon name="schedule" size="20px" />
            </q-avatar>
            <div>
              <div class="text-h5 text-weight-bold text-warning">{{ stats.pending }}</div>
              <div class="text-caption text-grey-6">Pendentes</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="row items-center">
            <q-avatar size="40px" color="negative" text-color="white" class="q-mr-sm">
              <q-icon name="warning" size="20px" />
            </q-avatar>
            <div>
              <div class="text-h5 text-weight-bold text-negative">{{ stats.overdue }}</div>
              <div class="text-caption text-grey-6">Em Atraso</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Solicitações de crédito pendentes (aprovadas/rejeitadas com taxa de juro) -->
    <q-card v-if="!loading && pendingLoans.length > 0" flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="bg-grey-1">
        <div class="row items-center">
          <q-icon name="hourglass_top" size="20px" color="orange" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Pedidos de Crédito por Aprovar</div>
          <q-space />
          <q-badge color="orange" rounded>{{ pendingLoans.length }} pendente(s)</q-badge>
        </div>
      </q-card-section>
      <q-card-section>
        <q-list separator>
          <q-item v-for="req in pendingLoans" :key="req.id" clickable v-ripple @click="router.push(`/loans/${req.id}`)">
            <q-item-section avatar>
              <q-avatar color="orange" text-color="white" size="36px">
                <q-icon name="hourglass_top" size="18px" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ req.customerName }}</q-item-label>
              <q-item-label caption>
                Conta {{ req.accountNumber }} | {{ formatMoney(req.amount) }} | {{ req.numberOfInstallments }} meses | {{ req.dateCreated }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge color="primary" outline rounded class="q-mr-sm">Definir taxa e aprovar</q-badge>
              <q-icon name="chevron_right" color="grey-5" />
            </q-item-section>
          </q-item>
        </q-list>
        <div class="text-caption text-grey-6 q-mt-sm">
          <q-icon name="info" size="14px" class="q-mr-xs" />
          Clique num pedido para aprovar (escolhendo a taxa de juro) ou rejeitar.
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar prestações...</div>
    </div>

    <!-- Tabela de Prestações -->
    <q-card v-else flat bordered>
      <q-card-section class="bg-grey-1">
        <div class="row items-center">
          <q-icon name="table_chart" size="20px" color="primary" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Prestações</div>
          <q-space />
          <q-badge color="primary" rounded>{{ filteredInstallments.length }} registos</q-badge>
        </div>
      </q-card-section>

      <q-table
        :rows="filteredInstallments"
        :columns="columns"
        row-key="id"
        flat
        dense
        v-model:pagination="pagination"
        :rows-per-page-options="[10, 15, 25, 50]"
        class="installments-table"
      >
        <!-- Mutuário -->
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="28px" :color="getAvatarColor(props.row)" text-color="white" class="q-mr-sm">
                <span style="font-size: 10px">{{ getInitials(props.row.customerName) }}</span>
              </q-avatar>
              <div>
                <div class="text-weight-medium" style="font-size: 12px">{{ props.row.customerName }}</div>
                <div class="text-grey-5" style="font-size: 10px">Conta {{ props.row.accountNumber }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Prestação -->
        <template v-slot:body-cell-installment="props">
          <q-td :props="props">
            <span class="text-weight-bold" style="font-size: 12px">{{ formatMoney(props.row.installment) }}</span>
          </q-td>
        </template>

        <!-- Vencimento -->
        <template v-slot:body-cell-dueDate="props">
          <q-td :props="props">
            <div style="font-size: 12px">{{ formatDate(props.row.dueDate) }}</div>
          </q-td>
        </template>

        <!-- Observações -->
        <template v-slot:body-cell-observations="props">
          <q-td :props="props">
            <q-badge v-if="props.row.status === 1" color="positive" rounded>
              <q-icon name="check" size="10px" class="q-mr-xs" />Liquidado
            </q-badge>
            <div v-else-if="props.row.daysOverdue > 0" class="text-negative">
              <q-icon name="warning" size="12px" class="q-mr-xs" />
              {{ props.row.daysOverdue }} dias vencido
            </div>
            <div v-else-if="props.row.daysUntilDue > 0" class="text-orange">
              <q-icon name="schedule" size="12px" class="q-mr-xs" />
              {{ props.row.daysUntilDue }} dias pra vencer
            </div>
            <div v-else class="text-grey-5">Vence hoje</div>
          </q-td>
        </template>

        <!-- Mora -->
        <template v-slot:body-cell-lateFee="props">
          <q-td :props="props">
            <span :class="props.row.lateFee > 0 ? 'text-negative text-weight-bold' : 'text-grey-5'" style="font-size: 12px">
              {{ formatMoney(props.row.lateFee) }}
            </span>
          </q-td>
        </template>

        <!-- Total a Pagar -->
        <template v-slot:body-cell-totalToPay="props">
          <q-td :props="props">
            <span class="text-weight-bold" :class="props.row.status === 1 ? 'text-positive' : 'text-primary'" style="font-size: 12px">
              {{ formatMoney(props.row.totalToPay) }}
            </span>
          </q-td>
        </template>

        <!-- Acções -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <div class="row no-wrap q-gutter-xs">
              <q-btn flat round dense icon="sms" size="sm" color="blue" @click="sendSMS(props.row)">
                <q-tooltip>Enviar SMS</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="chat" size="sm" color="positive" @click="sendWhatsApp(props.row)">
                <q-tooltip>Enviar WhatsApp</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="visibility" size="sm" color="grey-7" @click="viewDetails(props.row)">
                <q-tooltip>Ver detalhes</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width text-center q-pa-lg text-grey-5">
            <q-icon name="info" size="40px" />
            <div class="q-mt-sm">Nenhuma prestação encontrada</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog de Detalhes -->
    <q-dialog v-model="showDetails" position="right" full-height>
      <q-card v-if="selectedInstallment" style="width: 400px; max-width: 90vw; border-radius: 12px 0 0 12px">
        <q-card-section class="bg-primary text-white row items-center" style="border-radius: 12px 0 0 0">
          <q-icon name="receipt" size="20px" class="q-mr-sm" />
          <div class="text-h6">Detalhes da Prestação</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showDetails = false" />
        </q-card-section>

        <q-card-section>
          <div class="q-mb-md">
            <div class="text-caption text-grey-5">Mutuário</div>
            <div class="text-weight-bold">{{ selectedInstallment.customerName }}</div>
            <div class="text-caption text-grey-6">Conta {{ selectedInstallment.accountNumber }}</div>
          </div>

          <q-separator class="q-mb-md" />

          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6">
              <div class="text-caption text-grey-5">Prestação</div>
              <div class="text-weight-bold text-primary">{{ formatMoney(selectedInstallment.installment) }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Pago</div>
              <div class="text-weight-bold text-positive">{{ formatMoney(selectedInstallment.paidAmount || 0) }}</div>
            </div>
          </div>

          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6">
              <div class="text-caption text-grey-5">Vencimento</div>
              <div>{{ formatDate(selectedInstallment.dueDate) }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Estado</div>
              <q-badge :color="getStatusColor(selectedInstallment.status)">
                {{ getStatusLabel(selectedInstallment.status) }}
              </q-badge>
            </div>
          </div>

          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6">
              <div class="text-caption text-grey-5">Juros de Mora</div>
              <div class="text-weight-bold text-negative">{{ formatMoney(selectedInstallment.lateFee) }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-5">Total a Pagar</div>
              <div class="text-weight-bold text-primary">{{ formatMoney(selectedInstallment.totalToPay) }}</div>
            </div>
          </div>

          <q-separator class="q-mb-md" />

          <div class="text-subtitle2 text-primary q-mb-sm">
            <q-icon name="send" size="16px" class="q-mr-xs" />
            Enviar Alerta
          </div>

          <div class="row q-gutter-sm">
            <q-btn outline color="blue" icon="sms" label="SMS" no-caps rounded class="col" @click="sendSMS(selectedInstallment)" />
            <q-btn outline color="positive" icon="chat" label="WhatsApp" no-caps rounded class="col" @click="sendWhatsApp(selectedInstallment)" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'
import { getInitials } from '@/utils/formatters'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(false)
const installments = ref([])
const pendingLoans = ref([])
const showDetails = ref(false)
const selectedInstallment = ref(null)

const filter = ref({
  status: null,
  search: '',
  from: '',
  to: ''
})

const statusOptions = [
  { label: 'Pendente', value: 0 },
  { label: 'Pago', value: 1 },
  { label: 'Pago Parcial', value: -1 }
]

const pagination = ref({
  rowsPerPage: 10,
  sortBy: 'dueDate',
  descending: false
})

const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right', sortable: true },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'center', sortable: true },
  { name: 'observations', label: 'Observações', field: 'observations', align: 'left', sortable: false },
  { name: 'lateFee', label: 'Mora', field: 'lateFee', align: 'right', sortable: true },
  { name: 'totalToPay', label: 'Total a Pagar', field: 'totalToPay', align: 'right', sortable: true },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

const stats = computed(() => {
  const total = installments.value.length
  const paid = installments.value.filter(i => i.status === 1).length
  const pending = installments.value.filter(i => i.status === 0).length
  const overdue = installments.value.filter(i => i.status !== 1 && i.daysOverdue > 0).length
  return { total, paid, pending, overdue }
})

const filteredInstallments = computed(() => {
  let result = [...installments.value]

  if (filter.value.status !== null) {
    result = result.filter(i => i.status === filter.value.status)
  }

  if (filter.value.search) {
    const search = filter.value.search.toLowerCase()
    result = result.filter(i =>
      i.customerName?.toLowerCase().includes(search) ||
      i.accountNumber?.toString().includes(search)
    )
  }

  if (filter.value.from) {
    result = result.filter(i => i.dueDate >= filter.value.from)
  }

  if (filter.value.to) {
    result = result.filter(i => i.dueDate <= filter.value.to)
  }

  return result
})

function clearFilter() {
  filter.value = { status: null, search: '', from: '', to: '' }
}

function formatMoney(val) {
  return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(val || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function getAvatarColor(row) {
  const colors = ['primary', 'secondary', 'teal', 'orange', 'purple', 'blue']
  const index = row.customerName ? row.customerName.charCodeAt(0) % colors.length : 0
  return colors[index]
}

function getStatusColor(status) {
  return { 1: 'positive', 0: 'orange', '-1': 'warning' }[status] || 'grey'
}

function getStatusLabel(status) {
  return { 1: 'Pago', 0: 'Pendente', '-1': 'Parcial' }[status] || 'Desconhecido'
}

function sendSMS(row) {
  $q.notify({ type: 'info', message: `SMS para ${row.customerName} — Em desenvolvimento`, position: 'top' })
}

function sendWhatsApp(row) {
  $q.notify({ type: 'info', message: `WhatsApp para ${row.customerName} — Em desenvolvimento`, position: 'top' })
}

function viewDetails(row) {
  selectedInstallment.value = row
  showDetails.value = true
}

// ==================== GERAÇÃO PDF ====================
async function downloadPDF() {
  if (filteredInstallments.value.length === 0) {
    $q.notify({ type: 'warning', message: 'Sem dados para exportar', position: 'top' })
    return
  }

  try {
    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    let companyLogo = null
    const company = companyStore.company
    const logo = company?.companyLogo
    if (logo && logo !== '/logo.png') {
      try {
        const token = localStorage.getItem('applicationMicroToken')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const resp = await fetch(logo, { headers })
        const contentType = resp.headers.get('content-type') || ''
        if (resp.ok && contentType.includes('image/')) {
          const blob = await resp.blob()
          companyLogo = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          })
        }
      } catch {}
    }

    const comp = company || {}
    const now = new Date()
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    const headerImage = companyLogo ? [{ image: companyLogo, width: 50, margin: [0, 0, 15, 0] }] : []

    // Agrupar por data de vencimento (recente → antigo)
    const sorted = [...filteredInstallments.value].sort((a, b) => {
      const dateA = new Date(a.dueDate)
      const dateB = new Date(b.dueDate)
      return dateA - dateB // Crescente (mais próximo primeiro)
    })

    // Agrupar por mês/ano
    const groups = {}
    sorted.forEach(row => {
      const d = new Date(row.dueDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' })
      if (!groups[key]) groups[key] = { label, rows: [] }
      groups[key].rows.push(row)
    })

    // Construir conteúdo do PDF agrupado
    const pdfContent = [
      {
        columns: [
          ...headerImage,
          {
            width: '*',
            stack: [
              { text: comp.companyName || 'Empresa', style: 'headerTitle', margin: [0, 0, 0, 2] },
              { text: `NUIT: ${comp.companyNuit || '-'}`, style: 'headerSub' },
              { text: `${comp.companyAddress || ''} | Tel: ${comp.companyPhone || ''}`, style: 'headerSub' }
            ]
          },
          {
            width: 150,
            stack: [
              { text: 'DATA:', style: 'labelText', margin: [0, 0, 0, 2] },
              { text: dateStr, style: 'valueText' },
              { text: `Registos: ${filteredInstallments.value.length}`, style: 'labelText', margin: [8, 4, 0, 0] }
            ]
          }
        ],
        margin: [0, 0, 0, 15]
      },
      { text: 'RELATÓRIO DE PRESTAÇÕES POR VENCIMENTO', style: 'sectionTitle', margin: [0, 0, 0, 10] }
    ]

    const tableHeader = [
      { text: 'Mutuário', style: 'tableHeader' },
      { text: 'Prestação', style: 'tableHeader' },
      { text: 'Vencimento', style: 'tableHeader' },
      { text: 'Observações', style: 'tableHeader' },
      { text: 'Mora', style: 'tableHeader' },
      { text: 'Total a Pagar', style: 'tableHeader' }
    ]

    // Adicionar cada grupo ao conteúdo
    Object.values(groups).forEach(group => {
      pdfContent.push({
        text: group.label.toUpperCase(),
        style: 'groupTitle',
        margin: [0, 10, 0, 5]
      })

      const groupRows = group.rows.map(row => {
        let observations = ''
        if (row.status === 1) observations = 'Liquidado'
        else if (row.daysOverdue > 0) observations = `${row.daysOverdue} dias vencido`
        else if (row.daysUntilDue > 0) observations = `${row.daysUntilDue} dias pra vencer`
        else observations = 'Vence hoje'

        return [
          { text: row.customerName || '-', style: 'cellText' },
          { text: formatMoneyRaw(row.installment), style: 'cellRight' },
          { text: formatDate(row.dueDate), style: 'cellCenter' },
          { text: observations, style: 'cellText' },
          { text: formatMoneyRaw(row.lateFee), style: 'cellRight' },
          { text: formatMoneyRaw(row.totalToPay), style: 'cellRightBold' }
        ]
      })

      // Subtotal do grupo
      const groupMora = group.rows.reduce((sum, r) => sum + (r.lateFee || 0), 0)
      const groupTotal = group.rows.reduce((sum, r) => sum + (r.totalToPay || 0), 0)
      groupRows.push([
        { text: `Subtotal (${group.rows.length})`, style: 'totalCell' },
        { text: '', style: 'totalCell' },
        { text: '', style: 'totalCell' },
        { text: '', style: 'totalCell' },
        { text: formatMoneyRaw(groupMora), style: 'totalCellRight' },
        { text: formatMoneyRaw(groupTotal), style: 'totalCellRight' }
      ])

      pdfContent.push({
        table: {
          headerRows: 1,
          widths: ['*', 70, 65, 90, 60, 80],
          body: [tableHeader, ...groupRows]
        },
        layout: 'grid',
        margin: [0, 0, 0, 10]
      })
    })

    // Total geral
    const totalMora = filteredInstallments.value.reduce((sum, r) => sum + (r.lateFee || 0), 0)
    const totalGeral = filteredInstallments.value.reduce((sum, r) => sum + (r.totalToPay || 0), 0)

    pdfContent.push({
      text: 'TOTAL GERAL',
      style: 'sectionTitle',
      margin: [0, 15, 0, 5]
    })

    pdfContent.push({
      table: {
        widths: ['*', 70, 65, 90, 60, 80],
        body: [[
          { text: `TOTAL (${filteredInstallments.value.length} prestações)`, style: 'totalCell' },
          { text: '', style: 'totalCell' },
          { text: '', style: 'totalCell' },
          { text: '', style: 'totalCell' },
          { text: formatMoneyRaw(totalMora), style: 'totalCellRight' },
          { text: formatMoneyRaw(totalGeral), style: 'totalCellRight' }
        ]]
      },
      layout: 'grid'
    })

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [20, 20, 20, 30],
      content: pdfContent,
      styles: {
        headerTitle: { fontSize: 14, bold: true, color: '#1b5e20' },
        headerSub: { fontSize: 8, color: '#37474f' },
        sectionTitle: { fontSize: 11, bold: true },
        labelText: { fontSize: 8, bold: true },
        valueText: { fontSize: 8 },
        tableHeader: { fontSize: 7, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
        cellText: { fontSize: 7 },
        cellCenter: { fontSize: 7, alignment: 'center' },
        cellRight: { fontSize: 7, alignment: 'right' },
        cellRightBold: { fontSize: 7, alignment: 'right', bold: true },
        totalCell: { fontSize: 7, bold: true, alignment: 'center', fillColor: '#e0e0e0' },
        totalCellRight: { fontSize: 7, bold: true, alignment: 'right', fillColor: '#e0e0e0' },
        groupTitle: { fontSize: 9, bold: true, color: '#1b5e20', margin: [0, 8, 0, 4] }
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

// ==================== LOAD DATA ====================
async function loadData() {
  loading.value = true
  try {
    const companyId = authStore.companyId
    if (!companyId) return

    // 1. Buscar todos os clientes
    const { data: customersData } = await api.get(`/api/customers/${companyId}`)
    const customers = customersData?.result || []
    const customerMap = {}
    customers.forEach(c => {
      customerMap[String(c.accountNumber)] = c.customerName
    })

    // 2. Buscar todos os créditos da empresa
    const { data: loansData } = await api.get(`/api/loan/findAllLoans/all/${companyId}`)
    const loans = loansData?.result || []
    console.log('[Gestor] Loans encontrados:', loans.length)

    // Pedidos de crédito pendentes (aguardam aprovação/rejeição com taxa de juro)
    pendingLoans.value = loans
      .filter(l => Number(l.status) === 0)
      .sort((a, b) => String(b.dateCreated || '').localeCompare(String(a.dateCreated || '')))
      .map(loan => ({
        id: loan.id,
        accountNumber: loan.accountNumber,
        customerName: customerMap[String(loan.accountNumber)] || `Conta ${loan.accountNumber}`,
        amount: Number(loan.amount) || 0,
        numberOfInstallments: loan.numberOfInstallments,
        dateCreated: loan.dateCreated || ''
      }))

    const allInstallments = []

    // 3. Buscar prestações de cada crédito (status activo=1 ou liquidado=3)
    for (const loan of loans) {
      const loanStatus = Number(loan.status)
      if (loanStatus !== 1 && loanStatus !== 3) continue

      const customerName = customerMap[String(loan.accountNumber)] || `Conta ${loan.accountNumber}`

      try {
        const { data: amortData } = await api.get(`/api/loan/amortization/${loan.id}`)
        console.log(`[Gestor] Loan ${loan.id}: success=${amortData?.success}, result count=${amortData?.result?.length}`)

        const amortizations = amortData?.result || []

        if (Array.isArray(amortizations)) {
          amortizations.forEach(a => {
            const dueDate = new Date(a.dueDate)
            const now = new Date()
            const diffTime = dueDate - now
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            const daysOverdue = diffDays < 0 && a.status !== 1 ? Math.abs(diffDays) : 0
            const daysUntilDue = diffDays > 0 && a.status !== 1 ? diffDays : 0

            const lateFee = daysOverdue > 0 ? Math.round(a.installment * 0.005 * daysOverdue * 100) / 100 : 0
            const totalToPay = Number(a.installment || 0) + lateFee

            allInstallments.push({
              id: `${loan.id}-${a.id || a.installmentOrder}`,
              loanId: loan.id,
              customerName,
              accountNumber: loan.accountNumber,
              installment: Number(a.installment) || 0,
              paidAmount: Number(a.paidAmount) || 0,
              status: Number(a.status),
              dueDate: a.dueDate,
              daysOverdue,
              daysUntilDue,
              lateFee,
              totalToPay,
              amortization: Number(a.amortization) || 0,
              rateAmount: Number(a.rateAmount) || 0
            })
          })
        }
      } catch (e) {
        console.warn(`[Gestor] Erro ao buscar amortizações do loan ${loan.id}:`, e.message)
      }
    }

    console.log('[Gestor] Total prestações carregadas:', allInstallments.length)
    installments.value = allInstallments
  } catch (error) {
    console.error('Erro ao carregar prestações:', error)
    $q.notify({ type: 'negative', message: 'Erro ao carregar prestações', position: 'top' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const companyId = authStore.companyId
  if (companyId && !companyStore.hasCompany) {
    companyStore.fetchCompany(companyId)
  }
  loadData()
})
</script>

<style lang="scss" scoped>
.kpi-card {
  border-radius: 12px;
  transition: transform 0.2s;
  &:hover { transform: translateY(-2px); }
}

.filter-card {
  border-radius: 12px;
}

.installments-table {
  th {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: #6B7280;
  }
  td {
    font-size: 12px;
    padding: 8px 12px;
  }
}

body.body--dark .kpi-card {
  background-color: $dark-page;
}
</style>
