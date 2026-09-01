<template>
  <div class="reports-page">
    <!-- HEADER -->
    <div class="reports-header">
      <div class="reports-header-content">
        <div class="row items-center">
          <q-icon name="assessment" size="28px" color="white" class="q-mr-sm" />
          <div>
            <div class="text-h6 text-weight-bold text-white">Relatórios e Analytics</div>
            <div class="text-caption text-white-7">Dashboard de cobranças e indicadores</div>
          </div>
        </div>
        <div class="row q-gutter-sm">
          <q-btn outline color="white" icon="download" label="Exportar PDF" no-caps rounded @click="exportFullReport" />
          <q-btn unelevated color="white" text-color="primary" icon="refresh" label="Actualizar" no-caps rounded @click="fetchData" />
        </div>
      </div>
    </div>

    <div class="reports-body q-pa-md">
      <!-- FILTERS -->
      <div class="filter-bar q-mb-md">
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-sm-3">
            <q-input v-model="filters.from" dense outlined label="Data início" type="date" input-style="font-size: 13px" />
          </div>
          <div class="col-12 col-sm-3">
            <q-input v-model="filters.to" dense outlined label="Data fim" type="date" input-style="font-size: 13px" />
          </div>
          <div class="col-12 col-sm-3">
            <q-select v-model="filters.period" dense outlined :options="periodOptions" label="Período rápido" emit-value map-options input-style="font-size: 13px" @update:model-value="applyQuickPeriod" />
          </div>
          <div class="col-12 col-sm-3">
            <q-btn unelevated color="primary" icon="search" label="Filtrar" no-caps rounded class="full-width" @click="fetchData" />
          </div>
        </div>
      </div>

      <!-- LOADING -->
      <div v-if="loading" class="text-center q-pa-xl">
        <q-spinner-dots size="40px" color="primary" />
        <div class="text-caption q-mt-sm">Carregando dados...</div>
      </div>

      <template v-else>
        <!-- KPIs ROW 1 -->
        <div class="kpi-grid q-mb-lg">
          <div class="kpi-card">
            <div class="kpi-icon" style="background: rgba(59,130,246,0.1); color: #3b82f6">
              <q-icon name="account_balance_wallet" size="22px" />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Total Desembolsado</div>
              <div class="kpi-value text-blue">{{ formatMoney(kpis.totalDisbursed) }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: rgba(16,185,129,0.1); color: #10b981">
              <q-icon name="payments" size="22px" />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Capital Recuperado</div>
              <div class="kpi-value text-positive">{{ formatMoney(kpis.capitalRecovered) }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b">
              <q-icon name="pending" size="22px" />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Total Pendente</div>
              <div class="kpi-value text-orange">{{ formatMoney(kpis.totalPending) }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: rgba(239,68,68,0.1); color: #ef4444">
              <q-icon name="warning" size="22px" />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Em Atraso</div>
              <div class="kpi-value text-negative">{{ formatMoney(kpis.totalOverdue) }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: rgba(99,102,241,0.1); color: #6366f1">
              <q-icon name="account_balance" size="22px" />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Total Créditos</div>
              <div class="kpi-value">{{ kpis.totalLoans }}</div>
            </div>
          </div>
        </div>

        <!-- KPIs ROW 2 -->
        <div class="kpi-grid q-mb-lg">
          <div class="kpi-card">
            <div class="kpi-icon" style="background: rgba(34,197,94,0.1); color: #22c55e">
              <q-icon name="check_circle" size="22px" />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Créditos Activos</div>
              <div class="kpi-value">{{ kpis.activeLoans }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: rgba(168,85,247,0.1); color: #a855f7">
              <q-icon name="people" size="22px" />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Mutuários</div>
              <div class="kpi-value">{{ kpis.totalCustomers }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: rgba(236,72,153,0.1); color: #ec4899">
              <q-icon name="trending_up" size="22px" />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Juros Recebidos</div>
              <div class="kpi-value">{{ formatMoney(kpis.totalInterestReceived) }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: rgba(20,184,166,0.1); color: #14b8a6">
              <q-icon name="percent" size="22px" />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Taxa Inadimplência</div>
              <div class="kpi-value" :class="kpis.defaultRate > 10 ? 'text-negative' : 'text-positive'">{{ kpis.defaultRate.toFixed(1) }}%</div>
            </div>
          </div>
        </div>

        <!-- CHARTS ROW -->
        <div class="row q-col-gutter-md q-mb-lg">
          <!-- Bar Chart - Monthly Collections -->
          <div class="col-12 col-md-8">
            <q-card flat bordered class="chart-card">
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-sm">
                  <q-icon name="bar_chart" class="q-mr-sm text-blue" />
                  Recebimentos Mensais
                </div>
                <div class="chart-container" style="height: 280px">
                  <Bar v-if="barChartData.labels.length > 0 && hasBarData" :data="barChartData" :options="barChartOptions" />
                  <div v-else class="empty-chart">
                    <q-icon name="bar_chart" size="48px" color="grey-4" />
                    <div class="text-caption text-grey-5 q-mt-sm">Sem dados de recebimentos para este período</div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Donut Chart - Loan Status -->
          <div class="col-12 col-md-4">
            <q-card flat bordered class="chart-card">
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-sm">
                  <q-icon name="donut_large" class="q-mr-sm text-purple" />
                  Estado dos Créditos
                </div>
                <div class="chart-container" style="height: 280px">
                  <Doughnut v-if="donutChartData.labels.length > 0 && hasDonutData" :data="donutChartData" :options="donutChartOptions" />
                  <div v-else class="empty-chart">
                    <q-icon name="donut_large" size="48px" color="grey-4" />
                    <div class="text-caption text-grey-5 q-mt-sm">Sem créditos registados</div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- LINE CHART - Evolution -->
        <q-card flat bordered class="chart-card q-mb-lg">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-sm">
              <q-icon name="show_chart" class="q-mr-sm text-teal" />
              Evolução de Receitas vs Juros
            </div>
            <div class="chart-container" style="height: 250px">
              <Line v-if="lineChartData.labels.length > 0 && hasLineData" :data="lineChartData" :options="lineChartOptions" />
              <div v-else class="empty-chart">
                <q-icon name="show_chart" size="48px" color="grey-4" />
                <div class="text-caption text-grey-5 q-mt-sm">Sem dados de evolução para este período</div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- TABLES ROW -->
        <div class="row q-col-gutter-md q-mb-lg">
          <!-- Overdue Installments -->
          <div class="col-12 col-md-6">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-sm">
                  <q-icon name="schedule" class="q-mr-sm text-negative" />
                  Prestações em Atraso ({{ overdueInstallments.length }})
                </div>
                <div v-if="overdueInstallments.length === 0" class="text-center text-grey-5 q-pa-md">
                  <q-icon name="check_circle" size="32px" color="positive" />
                  <div class="text-caption q-mt-sm">Nenhuma prestação em atraso</div>
                </div>
                <q-table v-else :rows="overdueInstallments.slice(0, 10)" :columns="overdueColumns" row-key="id" flat dense hide-bottom :rows-per-page-options="[0]" style="font-size: 12px">
                  <template v-slot:body-cell-customerName="props">
                    <q-td :props="props">
                      <div class="text-weight-medium">{{ props.row.customerName || '-' }}</div>
                    </q-td>
                  </template>
                  <template v-slot:body-cell-installment="props">
                    <q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td>
                  </template>
                  <template v-slot:body-cell-lateDays="props">
                    <q-td :props="props" class="text-center">
                      <q-badge :color="props.row.lateDays > 30 ? 'negative' : props.row.lateDays > 15 ? 'orange' : 'yellow-7'" rounded>{{ props.row.lateDays }}d</q-badge>
                    </q-td>
                  </template>
                  <template v-slot:body-cell-latePaymentInterest="props">
                    <q-td :props="props" class="text-right text-negative">{{ formatMoney(props.row.latePaymentInterest) }}</q-td>
                  </template>
                </q-table>
              </q-card-section>
            </q-card>
          </div>

          <!-- Recent Payments -->
          <div class="col-12 col-md-6">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-sm">
                  <q-icon name="paid" class="q-mr-sm text-positive" />
                  Últimos Pagamentos ({{ recentPayments.length }})
                </div>
                <div v-if="recentPayments.length === 0" class="text-center text-grey-5 q-pa-md">
                  <q-icon name="receipt_long" size="32px" color="grey-4" />
                  <div class="text-caption q-mt-sm">Nenhum pagamento registado</div>
                </div>
                <q-table v-else :rows="recentPayments.slice(0, 10)" :columns="paymentColumns" row-key="id" flat dense hide-bottom :rows-per-page-options="[0]" style="font-size: 12px">
                  <template v-slot:body-cell-customerName="props">
                    <q-td :props="props">
                      <div class="text-weight-medium">{{ props.row.customerName || '-' }}</div>
                    </q-td>
                  </template>
                  <template v-slot:body-cell-amount="props">
                    <q-td :props="props" class="text-right text-weight-bold text-positive">{{ formatMoney(props.row.amount) }}</q-td>
                  </template>
                  <template v-slot:body-cell-paymentDate="props">
                    <q-td :props="props">{{ formatDate(props.row.paymentDate) }}</q-td>
                  </template>
                </q-table>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- LOAN PORTFOLIO TABLE -->
        <q-card flat bordered class="q-mb-lg">
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1 text-weight-bold">
                <q-icon name="work" class="q-mr-sm text-blue" />
                Portfólio de Créditos
              </div>
              <q-space />
              <q-btn outline color="primary" icon="download" label="Exportar" no-caps rounded size="sm" @click="exportLoanPortfolio" />
            </div>
            <div v-if="loanPortfolio.length === 0" class="text-center text-grey-5 q-pa-md">
              <q-icon name="work" size="32px" color="grey-4" />
              <div class="text-caption q-mt-sm">Nenhum crédito registado</div>
            </div>
            <q-table v-else :rows="loanPortfolio" :columns="portfolioColumns" row-key="id" flat dense :rows-per-page-options="[10, 25, 50]" style="font-size: 12px" :filter="portfolioFilter">
              <template v-slot:top-right>
                <q-input v-model="portfolioFilter" dense outlined placeholder="Pesquisar..." input-style="font-size: 12px" class="q-ml-md" style="width: 200px">
                  <template v-slot:append><q-icon name="search" size="16px" /></template>
                </q-input>
              </template>
              <template v-slot:body-cell-customerName="props">
                <q-td :props="props">
                  <div class="row items-center">
                    <q-avatar size="22px" :color="getStatusColor(props.row.status)" text-color="white" class="q-mr-xs">
                      {{ (props.row.customerName || '?').charAt(0) }}
                    </q-avatar>
                    <span class="text-weight-medium">{{ props.row.customerName || '-' }}</span>
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-amount="props">
                <q-td :props="props" class="text-right">{{ formatMoney(props.row.amount) }}</q-td>
              </template>
              <template v-slot:body-cell-interestRate="props">
                <q-td :props="props">{{ ((props.row.interestRate || 0) * 100).toFixed(1) }}%</q-td>
              </template>
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge :color="getStatusColor(props.row.status)" rounded>{{ getStatusText(props.row.status) }}</q-badge>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(false)
const portfolioFilter = ref('')

const filters = ref({
  from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  to: new Date().toISOString().split('T')[0],
  period: 'month'
})

const periodOptions = [
  { label: 'Este mês', value: 'month' },
  { label: 'Este trimestre', value: 'quarter' },
  { label: 'Este ano', value: 'year' },
  { label: 'Últimos 12 meses', value: 'last12' },
  { label: 'Personalizado', value: 'custom' }
]

// Data
const kpis = ref({
  capitalRecovered: 0,
  totalDisbursed: 0,
  totalPending: 0,
  totalOverdue: 0,
  totalLoans: 0,
  activeLoans: 0,
  totalCustomers: 0,
  totalInterestReceived: 0,
  defaultRate: 0
})

const monthlyData = ref([])
const overdueInstallments = ref([])
const recentPayments = ref([])
const loanPortfolio = ref([])

// Check if charts have real data
const hasBarData = computed(() => monthlyData.value.some(d => d.received > 0 || d.pending > 0))
const hasDonutData = computed(() => loanPortfolio.value.length > 0)
const hasLineData = computed(() => monthlyData.value.some(d => d.received > 0))

// Chart Data
const barChartData = computed(() => ({
  labels: monthlyData.value.map(d => d.month),
  datasets: [
    {
      label: 'Capital Recuperado',
      data: monthlyData.value.map(d => d.received),
      backgroundColor: 'rgba(34,197,94,0.8)',
      borderColor: '#22c55e',
      borderWidth: 1,
      borderRadius: 6
    },
    {
      label: 'Pendente',
      data: monthlyData.value.map(d => d.pending),
      backgroundColor: 'rgba(245,158,11,0.8)',
      borderColor: '#f59e0b',
      borderWidth: 1,
      borderRadius: 6
    }
  ]
}))

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true } }
}

const donutChartData = computed(() => {
  const active = loanPortfolio.value.filter(l => Number(l.status) === 1).length
  const pending = loanPortfolio.value.filter(l => Number(l.status) === 0).length
  const rejected = loanPortfolio.value.filter(l => Number(l.status) === -1).length
  const finished = loanPortfolio.value.filter(l => Number(l.status) === 3).length
  return {
    labels: ['Activo', 'Pendente', 'Rejeitado', 'Terminado'],
    datasets: [{
      data: [active, pending, rejected, finished],
      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#94a3b8'],
      borderWidth: 0
    }]
  }
})

const donutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } } },
  cutout: '65%'
}

const lineChartData = computed(() => ({
  labels: monthlyData.value.map(d => d.month),
  datasets: [
    {
      label: 'Receitas',
      data: monthlyData.value.map(d => d.received),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,0.1)',
      fill: true,
      tension: 0.4
    },
    {
      label: 'Juros',
      data: monthlyData.value.map(d => d.interest),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.4
    }
  ]
}))

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true } }
}

// Table Columns
const overdueColumns = [
  { name: 'customerName', label: 'Mutuário', field: 'customerName', align: 'left' },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right' },
  { name: 'lateDays', label: 'Dias', field: 'lateDays', align: 'center' },
  { name: 'latePaymentInterest', label: 'Juros Mora', field: 'latePaymentInterest', align: 'right' }
]

const paymentColumns = [
  { name: 'customerName', label: 'Mutuário', field: 'customerName', align: 'left' },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right' },
  { name: 'paymentDate', label: 'Data', field: 'paymentDate', align: 'left' }
]

const portfolioColumns = [
  { name: 'customerName', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'amount', label: 'Montante', field: 'amount', align: 'right', sortable: true },
  { name: 'numberOfInstallments', label: 'Prestações', field: 'numberOfInstallments', align: 'center' },
  { name: 'interestRate', label: 'Taxa', field: 'interestRate', align: 'center' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center', sortable: true },
  { name: 'dateCreated', label: 'Data', field: 'dateCreated', align: 'left', sortable: true }
]

// Functions
function formatMoney(val) {
  return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(val || 0)
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('pt-MZ') : '-'
}

function getStatusColor(s) {
  const n = Number(s)
  return { 0: 'orange', 1: 'positive', '-1': 'negative', 3: 'grey' }[n] || 'grey'
}

function getStatusText(s) {
  const n = Number(s)
  return { 0: 'Pendente', 1: 'Activo', '-1': 'Rejeitado', 3: 'Terminado' }[n] || '?'
}

function applyQuickPeriod(val) {
  const now = new Date()
  if (val === 'month') {
    filters.value.from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    filters.value.to = now.toISOString().split('T')[0]
  } else if (val === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    filters.value.from = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0]
    filters.value.to = now.toISOString().split('T')[0]
  } else if (val === 'year') {
    filters.value.from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    filters.value.to = now.toISOString().split('T')[0]
  } else if (val === 'last12') {
    filters.value.from = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0]
    filters.value.to = now.toISOString().split('T')[0]
  }
}

// Build monthly data from transactions
function buildMonthlyData(transactions) {
  const monthMap = {}

  // Initialize last 6 months
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap[key] = {
      month: d.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' }),
      received: 0,
      pending: 0,
      interest: 0
    }
  }

  // Aggregate transactions by month
  transactions.forEach(t => {
    const date = t.paymentDate || t.createdAt
    if (!date) return
    const d = new Date(date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthMap[key]) {
      monthMap[key].received += Number(t.amount) || 0
      monthMap[key].interest += Number(t.interestRateAmount) || 0
    }
  })

  return Object.values(monthMap)
}

async function fetchData() {
  loading.value = true
  try {
    const api = (await import('@/boot/axios')).default
    const companyId = authStore.companyId

    // 1. Fetch dashboard data for KPIs
    const params = new URLSearchParams()
    if (filters.value.from) params.append('from', filters.value.from)
    if (filters.value.to) params.append('to', filters.value.to)

    try {
      const resp = await api.get(`/api/dashboard/${companyId}?${params.toString()}`)
      const data = resp?.data
      if (data && typeof data === 'object' && data.success && data.kpis) {
        const k = data.kpis
        kpis.value = {
          capitalRecovered: k.financial?.capitalRecovered || k.financial?.totalCollected || 0,
          totalDisbursed: k.financial?.totalDisbursed || 0,
          totalPending: k.financial?.pendingAmount || 0,
          totalOverdue: k.delinquency?.overdueAmount || 0,
          totalLoans: k.loans?.total || 0,
          activeLoans: k.loans?.active || 0,
          totalCustomers: 0,
          totalInterestReceived: k.financial?.totalInterestReceived || 0,
          defaultRate: k.delinquency?.overdueRate || 0
        }
        overdueInstallments.value = (data.alerts || []).map(a => ({
          ...a,
          lateDays: a.daysOverdue || 0,
          latePaymentInterest: (a.amountDue || 0) * 0.02 * (a.daysOverdue || 0)
        }))
      } else {
        console.warn('Dashboard API: resposta inválida', data)
      }
    } catch (e) {
      console.warn('Dashboard API error:', e)
    }

    // 2. Fetch customers count
    try {
      const custResp = await api.get(`/api/customer/company/${companyId}`)
      const custData = custResp?.data
      if (custData && typeof custData === 'object' && custData.success) {
        kpis.value.totalCustomers = (custData.result || []).length
      }
    } catch {}

    // 3. Fetch transactions for charts
    try {
      const txResp = await api.get(`/api/tranzaction?companyId=${companyId}`)
      const txData = txResp?.data
      if (txData && typeof txData === 'object' && txData.success) {
        const transactions = txData.result || []
        monthlyData.value = buildMonthlyData(transactions)

        // Recent payments
        recentPayments.value = transactions
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 20)
          .map(p => ({
            ...p,
            customerName: p.customerName || '-'
          }))
      }
    } catch (e) {
      console.warn('Transactions API error:', e)
      monthlyData.value = []
    }

    // 4. Fetch loans for portfolio
    try {
      const loansResp = await api.get(`/api/loan/${companyId}`)
      const loansData = loansResp?.data
      if (loansData && typeof loansData === 'object' && loansData.success) {
        const loans = loansData.result || []
        // Enrich with customer names
        for (const loan of loans) {
          if (!loan.customerName && loan.accountNumber) {
            try {
              const custRes = await api.get(`/api/customer/${loan.accountNumber}`)
              if (custRes.data.success) loan.customerName = custRes.data.result?.customerName
            } catch {}
          }
        }
        loanPortfolio.value = loans
      }
    } catch {}

  } catch (e) {
    console.error('Erro ao carregar relatórios:', e)
  } finally {
    loading.value = false
  }
}

function exportFullReport() {
  const doc = new jsPDF('p', 'mm', 'a4')
  const comp = companyStore.company || {}
  const w = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text('RELATÓRIO DE COBRANÇAS', w / 2, 20, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text(`${comp.companyName || ''} | Período: ${filters.value.from} a ${filters.value.to}`, w / 2, 27, { align: 'center' })
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-MZ')}`, w / 2, 32, { align: 'center' })

  // KPIs
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.text('1. Resumo Financeiro', 15, 42)

  doc.autoTable({
    startY: 45,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total Desembolsado', formatMoney(kpis.value.totalDisbursed)],
      ['Capital Recuperado', formatMoney(kpis.value.capitalRecovered)],
      ['Total Pendente', formatMoney(kpis.value.totalPending)],
      ['Em Atraso', formatMoney(kpis.value.totalOverdue)],
      ['Total Créditos', String(kpis.value.totalLoans)],
      ['Créditos Activos', String(kpis.value.activeLoans)],
      ['Mutuários', String(kpis.value.totalCustomers)],
      ['Juros Recebidos', formatMoney(kpis.value.totalInterestReceived)],
      ['Taxa Inadimplência', `${kpis.value.defaultRate.toFixed(1)}%`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8 }
  })

  // Overdue
  if (overdueInstallments.value.length > 0) {
    const y = doc.lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('2. Prestações em Atraso', 15, y)

    doc.autoTable({
      startY: y + 3,
      head: [['Mutuário', 'Prestação', 'Dias', 'Juros Mora']],
      body: overdueInstallments.value.slice(0, 30).map(i => [
        i.customerName || '-',
        formatMoney(i.installment),
        String(i.lateDays),
        formatMoney(i.latePaymentInterest)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 7 }
    })
  }

  doc.save(`relatorio-cobrancias-${filters.value.from}-${filters.value.to}.pdf`)
}

function exportLoanPortfolio() {
  const doc = new jsPDF('l', 'mm', 'a4')
  const w = doc.internal.pageSize.getWidth()

  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text('PORTFÓLIO DE CRÉDITOS', w / 2, 15, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-MZ')}`, w / 2, 21, { align: 'center' })

  doc.autoTable({
    startY: 25,
    head: [['Mutuário', 'Conta', 'Montante', 'Prestações', 'Taxa', 'Estado', 'Data']],
    body: loanPortfolio.value.map(l => [
      l.customerName || '-',
      String(l.accountNumber),
      formatMoney(l.amount),
      String(l.numberOfInstallments),
      `${((l.interestRate || 0) * 100).toFixed(1)}%`,
      getStatusText(l.status),
      l.dateCreated ? new Date(l.dateCreated).toLocaleDateString('pt-MZ') : '-'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 7 }
  })

  doc.save(`portfolio-creditos-${new Date().toISOString().split('T')[0]}.pdf`)
}

onMounted(fetchData)
</script>

<style lang="scss" scoped>
.reports-header {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  padding: 20px 24px;
}
.reports-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.reports-body {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}
body.body--dark .reports-body { background: #1a1a2e; }

.filter-bar {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
body.body--dark .filter-bar { background: #252540; border-color: rgba(255,255,255,0.06); }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
@media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

.kpi-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: all 0.2s ease;
  &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
}
body.body--dark .kpi-card { background: #252540; border-color: rgba(255,255,255,0.06); }

.kpi-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.kpi-info { flex: 1; min-width: 0; }
.kpi-label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 2px; }
.kpi-value { font-size: 1rem; font-weight: 700; color: #1e293b; }
body.body--dark .kpi-value { color: #e2e8f0; }

.chart-card {
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.04);
}
body.body--dark .chart-card { border-color: rgba(255,255,255,0.06); }

.empty-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
}
</style>
