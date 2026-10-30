<template>
  <div class="q-pa-md installments-page">
    <!-- ═══════════ CABEÇALHO EXECUTIVO ═══════════ -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center no-wrap">
          <q-icon name="receipt_long" class="q-mr-sm text-primary" size="26px" />
          <h1 class="text-h6 text-weight-bold text-slate-800 q-my-none">
            Controlo de Prestações e Cobrança
          </h1>
          <q-chip color="primary" text-color="white" size="sm" dense class="q-ml-sm font-mono">
            Agenda Financeira
          </q-chip>
        </div>
        <div class="text-caption text-grey-7 q-mt-xs">
          Acompanhamento de vencimentos, apuramento de mora e emissão de alertas aos mutuários
        </div>
      </div>

      <div class="row items-center q-gutter-xs">
        <q-btn
          outline
          color="grey-8"
          icon="picture_as_pdf"
          label="PDF"
          no-caps
          rounded
          size="sm"
          :disable="filteredInstallments.length === 0"
          @click="downloadPDF"
        />
        <q-btn
          outline
          color="green-8"
          icon="table_view"
          label="Excel"
          no-caps
          rounded
          size="sm"
          :disable="filteredInstallments.length === 0"
          @click="downloadExcel"
        />
        <q-btn
          outline
          color="primary"
          icon="refresh"
          label="Actualizar"
          no-caps
          rounded
          size="sm"
          :loading="loading"
          @click="loadData"
        />
      </div>
    </div>

    <!-- ═══════════ KPI EXECUTIVE STRIP ═══════════ -->
    <div class="row q-col-gutter-sm q-mb-md" data-tour="installments-kpis">
      <!-- Em Atraso -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card" :class="{ 'kpi-alert': stats.overdue > 0 }">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Prestações em Atraso</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold" :class="stats.overdue > 0 ? 'text-negative' : 'text-slate-800'">
                {{ stats.overdue }}
              </span>
              <span class="text-caption text-negative font-mono text-weight-bold">
                {{ formatMoney(stats.overdueRiskAmount) }}
              </span>
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Capital + mora em risco</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- A Vencer nos Próximos 30 Dias -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">A Vencer (30 Dias)</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-warning">{{ stats.upcomingCount }}</span>
              <span class="text-caption text-slate-800 font-mono text-weight-bold">
                {{ formatMoney(stats.upcomingAmount) }}
              </span>
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Previsão de cobrança regular</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Mora Total Acumulada -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Juros de Mora Gerados</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold font-mono text-negative">
                {{ formatMoney(stats.totalLateFee) }}
              </span>
              <q-badge color="negative" outline size="sm">Calculada</q-badge>
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Penalizações acumuladas</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Prestações Liquidadas -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Liquidadas / Pagas</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-positive">{{ stats.paid }}</span>
              <span class="text-caption text-positive font-mono text-weight-bold">
                {{ formatMoney(stats.paidAmount) }}
              </span>
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Montante total amortizado</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ═══════════ BARRA DE FILTROS & PRESETS ═══════════ -->
    <q-card flat bordered class="q-mb-md filters-card" data-tour="installments-body">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <!-- Pesquisa de Texto -->
          <div class="col-12 col-sm-4 col-md-3">
            <q-input
              v-model="filter.search"
              dense
              outlined
              clearable
              placeholder="Pesquisar mutuário, telefone ou conta..."
              input-style="font-size: 12px"
            >
              <template v-slot:prepend><q-icon name="search" size="16px" /></template>
            </q-input>
          </div>

          <!-- Filtro de Estado -->
          <div class="col-12 col-sm-3 col-md-2">
            <q-select
              v-model="filter.status"
              :options="statusOptions"
              dense
              outlined
              clearable
              emit-value
              map-options
              label="Estado"
              options-dense
              input-style="font-size: 12px"
            />
          </div>

          <!-- Atalhos Rápidos por Situação -->
          <div class="col-12 col-md-auto q-gutter-xs">
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activePreset === 'default' ? 'primary' : 'grey-2'"
              :text-color="activePreset === 'default' ? 'white' : 'grey-8'"
              label="Vencidas & 30 Dias"
              @click="applyPreset('default')"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activePreset === 'overdue' ? 'negative' : 'grey-2'"
              :text-color="activePreset === 'overdue' ? 'white' : 'grey-8'"
              label="Em Atraso"
              @click="applyPreset('overdue')"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activePreset === 'today' ? 'warning' : 'grey-2'"
              :text-color="activePreset === 'today' ? 'white' : 'grey-8'"
              label="Vencem Hoje"
              @click="applyPreset('today')"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activePreset === 'paid' ? 'positive' : 'grey-2'"
              :text-color="activePreset === 'paid' ? 'white' : 'grey-8'"
              label="Liquidadas"
              @click="applyPreset('paid')"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activePreset === 'all' ? 'primary' : 'grey-2'"
              :text-color="activePreset === 'all' ? 'white' : 'grey-8'"
              label="Todas"
              @click="applyPreset('all')"
            />
          </div>

          <!-- Datas De / Até -->
          <div class="col-6 col-sm-3 col-md-1">
            <q-input v-model="filter.from" dense outlined label="De" type="date" stack-label input-style="font-size: 12px" />
          </div>
          <div class="col-6 col-sm-3 col-md-1">
            <q-input v-model="filter.to" dense outlined label="Até" type="date" stack-label input-style="font-size: 12px" />
          </div>

          <div class="col-auto">
            <q-btn
              v-if="isFiltering"
              flat
              dense
              color="grey-7"
              icon="filter_alt_off"
              label="Limpar"
              size="sm"
              @click="clearFilter"
            />
          </div>

          <q-space />

          <div class="col-auto text-caption text-grey-6">
            Apresentando <strong>{{ filteredInstallments.length }}</strong> de {{ installments.length }}
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════════ CARREGAMENTO ═══════════ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-6 q-mt-sm">A carregar agenda de prestações...</div>
    </div>

    <!-- ═══════════ ESTADO VAZIO ═══════════ -->
    <q-card v-else-if="filteredInstallments.length === 0" flat bordered class="empty-card text-center q-pa-xl">
      <q-card-section>
        <q-icon name="event_available" size="56px" color="primary" />
        <div class="text-subtitle1 text-weight-bold text-slate-800 q-mt-md">Nenhuma prestação encontrada</div>
        <div class="text-caption text-grey-6 q-mt-xs">
          {{ isFiltering ? 'Nenhum registo corresponde aos filtros de pesquisa.' : 'Não há prestações pendentes para o período seleccionado.' }}
        </div>
        <q-btn
          v-if="isFiltering"
          outline
          color="primary"
          no-caps
          rounded
          size="sm"
          icon="filter_alt_off"
          label="Limpar Filtros"
          class="q-mt-md"
          @click="clearFilter"
        />
      </q-card-section>
    </q-card>

    <!-- ═══════════ TABELA DE PRESTAÇÕES ═══════════ -->
    <q-card v-else flat bordered class="table-card">
      <q-table
        data-tour="installments-table"
        :rows="filteredInstallments"
        :columns="columns"
        row-key="id"
        flat
        v-model:pagination="pagination"
        :rows-per-page-options="[15, 25, 50, 100]"
        class="installments-table"
      >
        <!-- Mutuário -->
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="text-weight-bold text-slate-800" style="font-size: 13px">
              {{ displayCustomerName(props.row) }}
            </div>
            <div class="row items-center no-wrap text-caption text-grey-6">
              <span>Conta {{ props.row.accountNumber || '—' }}</span>
              <span v-if="props.row.customerPhone" class="q-ml-xs font-mono">· {{ props.row.customerPhone }}</span>
            </div>
            <q-badge v-if="!props.row.hasCustomer" color="warning" text-color="dark" rounded class="q-mt-xs">
              <q-icon name="person_off" size="10px" class="q-mr-xs" />Sem cadastro
            </q-badge>
          </q-td>
        </template>

        <!-- Prestação -->
        <template v-slot:body-cell-installment="props">
          <q-td :props="props">
            <div class="font-mono text-weight-bold text-slate-800" style="font-size: 13px">
              {{ formatMoney(props.row.installment) }}
            </div>
            <div class="text-caption text-grey-6">
              {{ props.row.installmentOrder ? `Prestação ${props.row.installmentOrder}` : 'Amortização' }}
            </div>
          </q-td>
        </template>

        <!-- Vencimento -->
        <template v-slot:body-cell-dueDate="props">
          <q-td :props="props">
            <div class="font-mono text-weight-bold" style="font-size: 12.5px">
              {{ formatDate(props.row.dueDate) }}
            </div>
          </q-td>
        </template>

        <!-- Situação / Observações (Português de Moçambique profissional) -->
        <template v-slot:body-cell-observations="props">
          <q-td :props="props">
            <q-chip v-if="props.row.status === 1" color="positive" text-color="white" size="xs" dense>
              <q-icon name="check_circle" size="12px" class="q-mr-xs" />Liquidado
            </q-chip>
            <q-chip v-else-if="props.row.daysOverdue > 0" color="negative" text-color="white" size="xs" dense>
              <q-icon name="warning" size="12px" class="q-mr-xs" />{{ props.row.daysOverdue }} dias em atraso
            </q-chip>
            <q-chip v-else-if="props.row.daysUntilDue === 0" color="amber-9" text-color="white" size="xs" dense>
              <q-icon name="alarm" size="12px" class="q-mr-xs" />Vence hoje
            </q-chip>
            <q-chip v-else color="teal-7" text-color="white" size="xs" dense>
              <q-icon name="schedule" size="12px" class="q-mr-xs" />{{ props.row.daysUntilDue }} dias para vencer
            </q-chip>
          </q-td>
        </template>

        <!-- Juros de Mora -->
        <template v-slot:body-cell-lateFee="props">
          <q-td :props="props">
            <span
              class="font-mono"
              :class="props.row.lateFee > 0 ? 'text-negative text-weight-bold' : 'text-grey-6'"
              style="font-size: 12.5px"
            >
              {{ formatMoney(props.row.lateFee) }}
            </span>
          </q-td>
        </template>

        <!-- Total a Pagar -->
        <template v-slot:body-cell-totalToPay="props">
          <q-td :props="props">
            <span
              class="font-mono text-weight-bold"
              :class="props.row.status === 1 ? 'text-positive' : (props.row.daysOverdue > 0 ? 'text-negative' : 'text-slate-800')"
              style="font-size: 13px"
            >
              {{ formatMoney(props.row.totalToPay) }}
            </span>
          </q-td>
        </template>

        <!-- Acções Rápidas -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" data-tour="installments-actions">
            <div class="row no-wrap items-center justify-center q-gutter-xs">
              <!-- Botão Alerta SMS -->
              <q-btn
                flat
                round
                dense
                icon="sms"
                size="sm"
                color="primary"
                @click="openSendMessageModal(props.row, 'sms')"
              >
                <q-tooltip>Enviar Alerta SMS</q-tooltip>
              </q-btn>

              <!-- Botão WhatsApp Directo -->
              <q-btn
                flat
                round
                dense
                icon="chat"
                size="sm"
                color="positive"
                @click="openSendMessageModal(props.row, 'whatsapp')"
              >
                <q-tooltip>Enviar via WhatsApp Directo</q-tooltip>
              </q-btn>

              <!-- Detalhes do Mutuário / Ficha -->
              <q-btn
                flat
                round
                dense
                icon="visibility"
                size="sm"
                color="grey-7"
                @click="openCustomerPage(props.row)"
              >
                <q-tooltip>Abrir ficha do mutuário</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- ═══════════ MODAL PROFISSIONAL DE ENVIO DE ALERTAS ═══════════ -->
    <SendMessageModal
      v-model="showMessageModal"
      :phone="messagePhone"
      :account-number="messageAccountNumber"
      :customer-name="messageCustomerName"
      :channel="messageChannel"
      :installment-data="messageInstallmentData"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'
import { formatMoney as formatMoneyValue, formatMznPlain } from '@/utils/formatters'
import SendMessageModal from '@/components/modals/SendMessageModal.vue'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(false)
const installments = ref([])
const showMessageModal = ref(false)
const messageChannel = ref('sms')
const messagePhone = ref('')
const messageAccountNumber = ref('')
const messageCustomerName = ref('')
const messageInstallmentData = ref({})

const activePreset = ref('default')
const filter = ref({ status: null, search: '', from: '', to: '' })
const DEFAULT_UPCOMING_DAYS = 30

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
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayISO() {
  return addDaysISO(0)
}

const statusOptions = [
  { label: 'Pendente', value: 0 },
  { label: 'Pago / Liquidado', value: 1 },
  { label: 'Pago Parcial', value: -1 }
]

const pagination = ref({ rowsPerPage: 15, sortBy: null, descending: false })

const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right', sortable: true },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'center', sortable: true },
  { name: 'observations', label: 'Situação / Observações', field: 'observations', align: 'left', sortable: false },
  { name: 'lateFee', label: 'Mora Calculada', field: 'lateFee', align: 'right', sortable: true },
  { name: 'totalToPay', label: 'Total a Pagar', field: 'totalToPay', align: 'right', sortable: true },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

// ==================== KPIS EXECUTIVOS ====================
const stats = computed(() => {
  const all = installments.value
  const paid = all.filter(i => i.status === 1)
  const pending = all.filter(i => i.status === 0)
  const overdue = all.filter(i => i.status !== 1 && i.daysOverdue > 0)

  const overdueRiskAmount = overdue.reduce((sum, i) => sum + (Number(i.totalToPay) || (Number(i.installment || 0) + Number(i.lateFee || 0))), 0)
  const upcomingAmount = pending.filter(i => i.daysUntilDue <= 30 && i.daysOverdue <= 0).reduce((sum, i) => sum + (Number(i.installment) || 0), 0)
  const paidAmount = paid.reduce((sum, i) => sum + (Number(i.paidAmount) || Number(i.installment) || 0), 0)
  const totalLateFee = all.reduce((sum, i) => sum + (Number(i.lateFee) || 0), 0)

  return {
    total: all.length,
    paid: paid.length,
    paidAmount,
    pending: pending.length,
    upcomingCount: pending.filter(i => i.daysUntilDue <= 30 && i.daysOverdue <= 0).length,
    upcomingAmount,
    overdue: overdue.length,
    overdueRiskAmount,
    totalLateFee
  }
})

const isFiltering = computed(() => {
  return activePreset.value !== 'default' || !!filter.value.search || filter.value.status !== null || !!filter.value.from || !!filter.value.to
})

const filteredInstallments = computed(() => {
  let result = [...installments.value]

  // Filtro por preset rápido
  if (activePreset.value === 'overdue') {
    result = result.filter(i => i.status !== 1 && i.daysOverdue > 0)
  } else if (activePreset.value === 'today') {
    result = result.filter(i => i.status !== 1 && i.daysUntilDue === 0)
  } else if (activePreset.value === 'paid') {
    result = result.filter(i => i.status === 1)
  } else if (activePreset.value === 'default') {
    // Vencidas + próximas 30 dias (exclui liquidadas a menos que haja filtro explícito)
    const limit = addDaysISO(DEFAULT_UPCOMING_DAYS)
    result = result.filter(i => i.status !== 1 && i.dueDate && i.dueDate <= limit)
  }

  // Filtro explícito de estado
  if (filter.value.status !== null) {
    result = result.filter(i => i.status === filter.value.status)
  }

  // Pesquisa de texto livre
  if (filter.value.search) {
    const s = filter.value.search.toLowerCase()
    result = result.filter(i =>
      displayCustomerName(i).toLowerCase().includes(s) ||
      String(i.accountNumber || '').includes(s) ||
      String(i.customerPhone || '').includes(s)
    )
  }

  // Filtro por intervalo de datas
  const from = normDate(filter.value.from)
  const to = normDate(filter.value.to)
  if (from) result = result.filter(i => i.dueDate && normDate(i.dueDate) >= from)
  if (to) result = result.filter(i => i.dueDate && normDate(i.dueDate) <= to)

  return sortInstallments(result)
})

function sortInstallments(rows) {
  const today = todayISO()
  const groupRank = (row) => {
    const d = normDate(row.dueDate)
    if (!d) return 3
    if (d < today) return 0   // vencidas primeiro
    if (d === today) return 1 // vence hoje
    return 2                  // futuras
  }
  return [...rows].sort((a, b) => {
    const g = groupRank(a) - groupRank(b)
    if (g !== 0) return g
    return normDate(a.dueDate).localeCompare(normDate(b.dueDate))
  })
}

watch(filteredInstallments, () => {
  pagination.value.page = 1
})

function applyPreset(preset) {
  activePreset.value = preset
  if (preset === 'paid') {
    filter.value.status = 1
  } else if (filter.value.status === 1) {
    filter.value.status = null
  }
}

function clearFilter() {
  activePreset.value = 'default'
  filter.value = { status: null, search: '', from: '', to: '' }
}

function formatMoney(val) {
  return formatMoneyValue(val)
}

function formatMoneyRaw(val) {
  return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)
}

function displayCustomerName(row) {
  return row.customerName || `Conta ${row.accountNumber}`
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function openSendMessageModal(row, channelType = 'sms') {
  messageChannel.value = channelType
  messagePhone.value = row.customerPhone || ''
  messageAccountNumber.value = row.accountNumber || ''
  messageCustomerName.value = displayCustomerName(row)
  messageInstallmentData.value = row
  showMessageModal.value = true
}

function openCustomerPage(row) {
  if (!row?.accountNumber) {
    $q.notify({ type: 'warning', message: 'Esta prestação não tem conta de mutuário associada.', position: 'top' })
    return
  }
  router.push(`/mutuarios/${row.accountNumber}`)
}

// ==================== EXPORTAÇÕES EXCEL & PDF ====================
async function downloadExcel() {
  if (filteredInstallments.value.length === 0) return
  try {
    $q.loading.show({ message: 'A gerar folha de cálculo Excel...' })
    const { downloadExcelFromBackend } = await import('@/utils/excelDownload')
    const rows = filteredInstallments.value.map(row => {
      const obs = row.status === 1
        ? 'Liquidado'
        : row.daysOverdue > 0
          ? `${row.daysOverdue} dias em atraso`
          : row.daysUntilDue > 0
            ? `${row.daysUntilDue} dias para vencer`
            : 'Vence hoje'
      return {
        customerName: displayCustomerName(row),
        accountNumber: row.accountNumber || '—',
        phone: row.customerPhone || '—',
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

async function downloadPDF() {
  if (filteredInstallments.value.length === 0) return
  try {
    const { openTablePdf } = await import('@/utils/tablePdf')
    const sorted = sortInstallments(filteredInstallments.value)
    const dateStr = formatDate(new Date().toISOString())

    const rows = sorted.map(row => {
      const obs = row.status === 1
        ? 'Liquidado'
        : row.daysOverdue > 0
          ? `${row.daysOverdue} dias em atraso`
          : row.daysUntilDue > 0
            ? `${row.daysUntilDue} dias para vencer`
            : 'Vence hoje'
      return [
        displayCustomerName(row),
        formatMoneyRaw(row.installment),
        formatDate(row.dueDate),
        obs,
        formatMoneyRaw(row.lateFee),
        formatMoneyRaw(row.totalToPay)
      ]
    })

    const tMora = sorted.reduce((s, r) => s + (Number(r.lateFee) || 0), 0)
    const tTotal = sorted.reduce((s, r) => s + (Number(r.totalToPay) || 0), 0)

    await openTablePdf({
      title: 'CONTROLO DE PRESTAÇÕES E COBRANÇA',
      meta: [`DATA: ${dateStr}`, `Registos: ${filteredInstallments.value.length}`],
      orientation: 'landscape',
      filename: `controle-prestacoes-${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { label: 'Mutuário' },
        { label: 'Prestação', width: 70, align: 'right' },
        { label: 'Vencimento', width: 65, align: 'center' },
        { label: 'Situação / Observações', width: 95 },
        { label: 'Mora', width: 60, align: 'right' },
        { label: 'Total a Pagar', width: 75, align: 'right' }
      ],
      rows,
      totalsRow: [`TOTAL (${sorted.length} prestações)`, '', '', '', formatMoneyRaw(tMora), formatMoneyRaw(tTotal)]
    })
    $q.notify({ type: 'positive', message: 'PDF gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar PDF:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF', position: 'top' })
  }
}

async function loadData() {
  loading.value = true
  try {
    const companyId = authStore.companyId
    if (!companyId) return
    const { data } = await api.get(`/api/installments/control/${companyId}`)
    installments.value = Array.isArray(data?.result) ? data.result : []
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
.installments-page {
  max-width: 1400px;
  margin: 0 auto;
}

.kpi-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  transition: all 0.2s ease;

  &.kpi-alert {
    border-color: #fca5a5;
    background: #fef2f2;
  }
}

.filters-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.table-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

body.body--dark {
  .kpi-card {
    background: #1e293b;
    border-color: #334155;

    &.kpi-alert {
      background: #450a0a;
      border-color: #7f1d1d;
    }
  }

  .filters-card {
    background: #1e293b;
    border-color: #334155;
  }

  .table-card {
    background: #1e293b;
    border-color: #334155;
  }
}
</style>
