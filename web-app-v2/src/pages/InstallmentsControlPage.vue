<template>
  <div class="q-pa-md">
    <!-- Filtros + Acções -->
    <q-card flat bordered class="q-mb-md filter-card">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-6 col-md-2">
          <q-select v-model="filter.status" :options="statusOptions" label="Estado" dense outlined emit-value map-options clearable />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-input v-model="filter.search" label="Pesquisar mutuário" dense outlined clearable>
            <template v-slot:prepend><q-icon name="search" size="16px" /></template>
          </q-input>
        </div>
        <div class="col-6 col-sm-4 col-md-2">
          <q-input v-model="filter.from" dense outlined label="De" type="date" stack-label />
        </div>
        <div class="col-6 col-sm-4 col-md-2">
          <q-input v-model="filter.to" dense outlined label="Até" type="date" stack-label />
        </div>
        <div class="col-12 col-md-3">
          <div class="row q-gutter-xs justify-end no-wrap">
            <q-btn outline color="primary" icon="refresh" no-caps rounded dense @click="loadData" :loading="loading">
              <q-tooltip>Sincronizar</q-tooltip>
            </q-btn>
            <q-btn outline color="primary" icon="clear_all" no-caps rounded dense @click="clearFilter">
              <q-tooltip>Limpar filtros</q-tooltip>
            </q-btn>
            <q-btn outline color="primary" icon="picture_as_pdf" no-caps rounded dense @click="downloadPDF" :disable="filteredInstallments.length === 0">
              <q-tooltip>Baixar PDF</q-tooltip>
            </q-btn>
            <q-btn outline color="primary" icon="table_chart" no-caps rounded dense @click="downloadExcel" :disable="filteredInstallments.length === 0">
              <q-tooltip>Baixar Excel</q-tooltip>
            </q-btn>
          </div>
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

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar prestações...</div>
    </div>

    <!-- Tabela de Prestações -->
    <q-card v-else flat bordered>
      <q-card-section class="installments-header">
        <div class="row items-center q-col-gutter-sm full-width">
          <q-icon name="table_chart" size="20px" color="primary" />
          <div class="col">
            <div class="text-subtitle1 text-weight-bold" style="line-height: 1.2">Prestações</div>
            <div v-if="usingDefaultWindow" class="text-caption text-orange text-weight-medium" style="font-size: 10px; line-height: 1.2">
              <q-icon name="event_upcoming" size="12px" class="q-mr-xs" style="vertical-align: -1px" />Vencidas + próximos {{ DEFAULT_UPCOMING_DAYS }} dias
            </div>
          </div>
          <q-badge color="primary" rounded class="q-px-sm q-py-xs">{{ filteredInstallments.length }} registos</q-badge>
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
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="table-borrower-name" style="font-size: 12px">{{ displayCustomerName(props.row) }}</div>
            <q-badge v-if="!props.row.hasCustomer" color="warning" text-color="dark" rounded class="q-mt-xs">
              <q-icon name="person_off" size="10px" class="q-mr-xs" />Sem cadastro
            </q-badge>
          </q-td>
        </template>

        <template v-slot:body-cell-installment="props">
          <q-td :props="props">
            <span class="text-weight-bold" style="font-size: 12px">{{ formatMoney(props.row.installment) }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-dueDate="props">
          <q-td :props="props">
            <div style="font-size: 12px">{{ formatDate(props.row.dueDate) }}</div>
          </q-td>
        </template>

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
            <div v-else class="text-dark">Vence hoje</div>
          </q-td>
        </template>

        <template v-slot:body-cell-lateFee="props">
          <q-td :props="props">
            <span :class="props.row.lateFee > 0 ? 'text-negative text-weight-bold' : ''" style="font-size: 12px">
              {{ formatMoney(props.row.lateFee) }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-totalToPay="props">
          <q-td :props="props">
            <span class="text-weight-bold" :class="props.row.status === 1 ? 'text-positive' : 'text-primary'" style="font-size: 12px">
              {{ formatMoney(props.row.totalToPay) }}
            </span>
          </q-td>
        </template>

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
            <div class="text-weight-bold">{{ displayCustomerName(selectedInstallment) }}</div>
            <div class="text-caption text-grey-6">Conta {{ selectedInstallment.accountNumber }}</div>
            <q-badge v-if="!selectedInstallment.hasCustomer" color="warning" text-color="dark" rounded class="q-mt-xs">
              <q-icon name="person_off" size="10px" class="q-mr-xs" />Sem cadastro
            </q-badge>
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

    <!-- Modal de envio SMS/WhatsApp com mensagem de aviso/alerta de vencimento pré-preenchida -->
    <SendMessageModal
      v-model="showMessageModal"
      :phone="messagePhone"
      :account-number="messageAccountNumber"
      :customer-name="messageCustomerName"
      :channel="messageChannel"
      :initial-message="messageInitial"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'
import { formatMoney as formatMoneyValue, formatPeriod, getInitials } from '@/utils/formatters'
import SendMessageModal from '@/components/modals/SendMessageModal.vue'

const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(false)
const installments = ref([])
const showDetails = ref(false)
const selectedInstallment = ref(null)
const showMessageModal = ref(false)
const messageChannel = ref('sms')
const messagePhone = ref('')
const messageAccountNumber = ref('')
const messageCustomerName = ref('')
const messageInitial = ref('')

const filter = ref({ status: null, search: '', from: '', to: '' })
// Janela de "prestes a vencer" por padrão (dias a partir de hoje). Vencidas são
// sempre incluídas. O utilizador alarga/recua com os filtros De/Até.
const DEFAULT_UPCOMING_DAYS = 30
// Normaliza para YYYY-MM-DD — aceita ISO, dd/mm/yyyy e Date, para os filtros
// De/Até funcionarem quer o input devolva "2026-09-08" quer "08/09/2026".
function normDate(v) {
  if (!v) return ''
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return m[0]
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const d = new Date(s)
  return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : ''
}
function addDaysISO(days) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function todayISO() { return addDaysISO(0) }
const statusOptions = [
  { label: 'Pendente', value: 0 },
  { label: 'Pago', value: 1 },
  { label: 'Pago Parcial', value: -1 }
]
const pagination = ref({ rowsPerPage: 15, sortBy: null, descending: false })
const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right', sortable: true },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'center', sortable: true },
  { name: 'observations', label: 'Observações', field: 'observations', align: 'left', sortable: false },
  { name: 'lateFee', label: 'Mora', field: 'lateFee', align: 'right', sortable: true },
  { name: 'totalToPay', label: 'Total a Pagar', field: 'totalToPay', align: 'right', sortable: true },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

const stats = computed(() => ({
  total: installments.value.length,
  paid: installments.value.filter(i => i.status === 1).length,
  pending: installments.value.filter(i => i.status === 0).length,
  overdue: installments.value.filter(i => i.status !== 1 && i.daysOverdue > 0).length
}))

// Indica se está activa a janela padrão "prestes a vencer" (sem De/Até definidos)
const usingDefaultWindow = computed(() => !filter.value.from && !filter.value.to)

const filteredInstallments = computed(() => {
  let result = [...installments.value]
  // NOTA: linhas sem cliente correspondente NUNCA são escondidas — este ecrã é
  // de controlo financeiro. Mostram-se com o selo "Sem cadastro" (ver template).
  // Por padrão, excluir pagas (status=1) — só mostrar quando usuário seleciona no filtro
  if (filter.value.status === null) {
    result = result.filter(i => i.status !== 1)
  } else {
    result = result.filter(i => i.status === filter.value.status)
  }
  if (filter.value.search) {
    const s = filter.value.search.toLowerCase()
    result = result.filter(i => displayCustomerName(i).toLowerCase().includes(s) || i.accountNumber?.toString().includes(s))
  }
  // Janela padrão "prestes a vencer": só quando o utilizador NÃO definiu De/Até.
  // Mostra vencidas (e a vencer hoje) + as que vencem nos próximos N dias.
  const usingDefault = !filter.value.from && !filter.value.to
  if (usingDefault) {
    const limit = addDaysISO(DEFAULT_UPCOMING_DAYS)
    result = result.filter(i => i.dueDate && i.dueDate <= limit)
  }
  const from = normDate(filter.value.from)
  const to = normDate(filter.value.to)
  if (from) result = result.filter(i => i.dueDate && normDate(i.dueDate) >= from)
  if (to) result = result.filter(i => i.dueDate && normDate(i.dueDate) <= to)
  return sortInstallments(result)
})

// Ordem: Vencidas → Prestes (a vencer) → Mais distantes, cronológica (mais
// antiga/próxima primeiro) dentro de cada grupo.
function sortInstallments(rows) {
  const today = todayISO()
  const groupRank = (row) => {
    const d = normDate(row.dueDate)
    if (!d) return 3
    if (d < today) return 0   // vencidas
    if (d === today) return 1 // vence hoje (tratada como "prestes")
    return 2                  // futuras
  }
  return [...rows].sort((a, b) => {
    const g = groupRank(a) - groupRank(b)
    if (g !== 0) return g
    return normDate(a.dueDate).localeCompare(normDate(b.dueDate))
  })
}

// Voltar à 1ª página quando o conjunto filtrado muda
watch(filteredInstallments, () => { pagination.value.page = 1 })

function clearFilter() { filter.value = { status: null, search: '', from: '', to: '' } }
function formatMoney(val) { return formatMoneyValue(val) }
// Nome de apresentação: nome real ou placeholder identificável (nunca vazio)
function displayCustomerName(row) { return row.customerName || `Conta ${row.accountNumber}` }
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
function getAvatarColor(row) {
  const colors = ['primary', 'secondary', 'teal', 'orange', 'purple', 'blue']
  return colors[row.customerName ? row.customerName.charCodeAt(0) % colors.length : 0]
}
function getStatusColor(s) { return { 1: 'positive', 0: 'orange', '-1': 'warning' }[s] || 'grey' }
function getStatusLabel(s) { return { 1: 'Pago', 0: 'Pendente', '-1': 'Parcial' }[s] || '?' }
function sendSMS(row) {
  messageChannel.value = 'sms'
  messagePhone.value = row.customerPhone || ''
  messageAccountNumber.value = row.accountNumber || ''
  messageCustomerName.value = displayCustomerName(row)
  messageInitial.value = buildDueAlertMessage(row)
  showMessageModal.value = true
}

function sendWhatsApp(row) {
  messageChannel.value = 'whatsapp'
  messagePhone.value = row.customerPhone || ''
  messageAccountNumber.value = row.accountNumber || ''
  messageCustomerName.value = displayCustomerName(row)
  messageInitial.value = buildDueAlertMessage(row)
  showMessageModal.value = true
}
function viewDetails(row) { selectedInstallment.value = row; showDetails.value = true }
function formatMoneyRaw(val) { return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0) }

// Mensagem genérica de aviso/alerta de vencimento da prestação:
// nome do mutuário + itens da prestação (nº, valor, vencimento) + empresa,
// sem caracteres especiais e sempre <= 160 caracteres.
function buildDueAlertMessage(row) {
  const nome = displayCustomerName(row)
  const n = row.installmentOrder ? String(row.installmentOrder).replace(/[ºª]/g, '') : '?'
  // Intl usa espaço de não-quebra (U+00A0/U+202F) como separador de milhares — trocar por espaço normal
  const valor = formatMoneyRaw(Number(row.installment) || 0).replace(/[\u00A0\u202F]/g, ' ')
  const data = formatDate(row.dueDate)
  const company = (companyStore.company?.companyName || 'MBR Microcredito').replace(/[^a-zA-Z0-9 .,&-]/g, '')
  const base = row.daysOverdue > 0
    ? `Caro/a ${nome}, prestacao N. ${n} de ${valor} MZN esta em atraso desde ${data}. Regularize para evitar juros.`
    : `Caro/a ${nome}, prestacao N. ${n} de ${valor} MZN vence em ${data}. Pague para evitar juros de mora.`
  const suffix = ` ${company}`
  if (base.length + suffix.length <= 160) return base + suffix
  if (base.length >= 160) return `${base.slice(0, 159)}.`
  return `${base} ${company.slice(0, 160 - base.length - 1)}`
}

// ==================== EXCEL ====================
// Gerado no backend (exceljs) com bordas/fontes reais — mesmo padrão do relatório BM.
async function downloadExcel() {
  if (filteredInstallments.value.length === 0) return
  try {
    $q.loading.show({ message: 'A gerar Excel...' })
    const { downloadExcelFromBackend } = await import('@/utils/excelDownload')
    const rows = filteredInstallments.value.map(row => {
      const obs = row.status === 1 ? 'Liquidado' : row.daysOverdue > 0 ? `${row.daysOverdue} dias vencido` : row.daysUntilDue > 0 ? `${row.daysUntilDue} dias pra vencer` : 'Vence hoje'
      return {
        customerName: displayCustomerName(row),
        installment: Number(row.installment) || 0,
        dueDate: formatDate(row.dueDate),
        observations: obs,
        lateFee: Number(row.lateFee) || 0,
        totalToPay: Number(row.totalToPay) || 0
      }
    })
    await downloadExcelFromBackend(
      '/api/export/installments/excel',
      { rows },
      `prestacoes-${new Date().toISOString().slice(0, 10)}.xlsx`
    )
    $q.notify({ type: 'positive', message: 'Excel gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar Excel:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar Excel', position: 'top' })
  } finally {
    $q.loading.hide()
  }
}

// ==================== PDF ====================
async function downloadPDF() {
  if (filteredInstallments.value.length === 0) return
  try {
    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    // Header partilhado — mesma lógica do ContractDocumentsPage
    const { buildCompanyHeader } = await import('@/utils/pdfHeader')
    const company = companyStore.company || {}

    let logoBase64 = null
    const logo = company.companyLogo
    if (logo && logo !== '/logo.png') {
      try {
        const token = localStorage.getItem('applicationMicroToken')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const resp = await fetch(logo, { headers })
        const contentType = resp.headers.get('content-type') || ''
        if (resp.ok && contentType.includes('image/')) {
          const blob = await resp.blob()
          logoBase64 = await new Promise(r => {
            const reader = new FileReader()
            reader.onload = () => r(reader.result)
            reader.readAsDataURL(blob)
          })
        }
      } catch {}
    }

    const header = buildCompanyHeader(company, logoBase64, 'CONTROLE DE PRESTAÇÕES POR VENCIMENTO')

    // Tabela única — ordenar por vencimento (recente → antigo)
    const sorted = sortInstallments(filteredInstallments.value)

    const dateStr = `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`

    const pdfContent = [
      ...header,
      { columns: [{ width: '*', text: '' }, { width: 150, stack: [{ text: 'DATA:', style: 'labelText', margin: [0, 0, 0, 2] }, { text: dateStr, style: 'valueText' }, { text: `Registos: ${filteredInstallments.value.length}`, style: 'labelText', margin: [8, 4, 0, 0] }] }], margin: [0, 0, 0, 10] }
    ]

    const tableHeader = [
      { text: 'Mutuário', style: 'tableHeader' }, { text: 'Prestação', style: 'tableHeader' },
      { text: 'Vencimento', style: 'tableHeader' }, { text: 'Observações', style: 'tableHeader' },
      { text: 'Mora', style: 'tableHeader' }, { text: 'Total a Pagar', style: 'tableHeader' }
    ]

    const tableRows = sorted.map(row => {
      let obs = row.status === 1 ? 'Liquidado' : row.daysOverdue > 0 ? `${row.daysOverdue} dias vencido` : row.daysUntilDue > 0 ? `${row.daysUntilDue} dias pra vencer` : 'Vence hoje'
      return [
        { text: displayCustomerName(row), style: 'cellText' },
        { text: formatMoneyRaw(row.installment), style: 'cellRight' },
        { text: formatDate(row.dueDate), style: 'cellCenter' },
        { text: obs, style: 'cellText' },
        { text: formatMoneyRaw(row.lateFee), style: 'cellRight' },
        { text: formatMoneyRaw(row.totalToPay), style: 'cellRightBold' }
      ]
    })

    const tm = sorted.reduce((s, r) => s + (r.lateFee || 0), 0)
    const tg = sorted.reduce((s, r) => s + (r.totalToPay || 0), 0)
    tableRows.push([
      { text: `TOTAL (${sorted.length} prestações)`, style: 'totalCell' },
      { text: '', style: 'totalCell' },
      { text: '', style: 'totalCell' },
      { text: '', style: 'totalCell' },
      { text: formatMoneyRaw(tm), style: 'totalCellRight' },
      { text: formatMoneyRaw(tg), style: 'totalCellRight' }
    ])

    pdfContent.push({
      table: { headerRows: 1, widths: ['*', 70, 65, 90, 60, 80], body: [tableHeader, ...tableRows] },
      layout: 'grid'
    })

    pdfMake.createPdf({
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [20, 20, 20, 30],
      content: pdfContent,
      styles: {
        headerTitle: { fontSize: 14, bold: true, color: '#1b5e20' },
        headerSub: { fontSize: 8, color: '#37474f' },
        sectionTitle: { fontSize: 12, bold: true },
        labelText: { fontSize: 9, bold: true },
        valueText: { fontSize: 9 },
        tableHeader: { fontSize: 9, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
        cellText: { fontSize: 9 },
        cellCenter: { fontSize: 9, alignment: 'center' },
        cellRight: { fontSize: 9, alignment: 'right' },
        cellRightBold: { fontSize: 9, alignment: 'right', bold: true },
        totalCell: { fontSize: 9, bold: true, alignment: 'center', fillColor: '#e0e0e0' },
        totalCellRight: { fontSize: 9, bold: true, alignment: 'right', fillColor: '#e0e0e0' },
        groupTitle: { fontSize: 10, bold: true, color: '#1b5e20' }
      }
    }).open()
    $q.notify({ type: 'positive', message: 'PDF gerado com sucesso!', position: 'top' })
  } catch (e) { console.error('Erro ao gerar PDF:', e); $q.notify({ type: 'negative', message: 'Erro ao gerar PDF', position: 'top' }) }
}

// ==================== LOAD DATA ====================
async function loadData() {
  loading.value = true
  try {
    const companyId = authStore.companyId
    if (!companyId) return
    // Endpoint consolidado: nomes de mutuários, mora e dias de atraso são
    // resolvidos no servidor (lista completa de clientes, sem paginação, e sem
    // o padrão N+1 de uma chamada /amortization por crédito).
    const { data } = await api.get(`/api/installments/control/${companyId}`)
    installments.value = Array.isArray(data?.result) ? data.result : []
  } catch (error) { console.error('Erro:', error); $q.notify({ type: 'negative', message: 'Erro ao carregar prestações', position: 'top' }) } finally { loading.value = false }
}

onMounted(() => {
  const companyId = authStore.companyId
  if (companyId && !companyStore.hasCompany) companyStore.fetchCompany(companyId)
  loadData()
})
</script>

<style lang="scss" scoped>
.text-dark { color: #f59e0b !important; font-weight: 600; }
body.body--dark .text-dark { color: #fbbf24 !important; }
.kpi-card { border-radius: 12px; transition: transform 0.2s; &:hover { transform: translateY(-2px); } }
.filter-card { border-radius: 12px; }
.installments-header { background-color: $grey-1; border-bottom: 1px solid rgba(0, 0, 0, 0.06); }
.installments-table { th { font-weight: 600; font-size: 11px; text-transform: uppercase; color: #6B7280; letter-spacing: 0.4px; } td { font-size: 12px; padding: 8px 12px; } }
body.body--dark .kpi-card { background-color: $dark-page; }
body.body--dark .installments-header { background-color: #252d42; border-bottom-color: rgba(255, 255, 255, 0.08); }
</style>
