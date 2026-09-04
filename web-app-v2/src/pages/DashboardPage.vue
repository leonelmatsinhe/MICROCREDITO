<template>
  <div class="q-pa-md">
    <!-- Filters -->
    <FiltersBar @filter="onFilter" @clear="onClear" @sync="onSync" />

    <!-- SMS pendentes na fila (saldo Tsemba) -->
    <SmsQueueIndicator />

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar dados...</div>
    </div>

    <!-- KPI Cards -->
    <div v-else class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-4">
        <KpiCard
          label="Mutuários"
          :value="kpis.totalCustomers"
          icon="people"
          avatarColor="blue"
          valueColor="text-dark"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <KpiCard
          label="Total Desembolsado"
          :value="kpis.totalDisbursed"
          icon="attach_money"
          avatarColor="positive"
          valueColor="text-positive"
          format="money"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <KpiCard
          label="Pendente"
          :value="kpis.pendingAmount"
          icon="schedule"
          avatarColor="orange"
          valueColor="text-warning"
          format="money"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <KpiCard
          label="Rejeitado"
          :value="kpis.rejectedAmount"
          icon="block"
          avatarColor="red"
          valueColor="text-negative"
          format="money"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <KpiCard
          label="Total com Juros"
          :value="kpis.totalWithInterest"
          icon="savings"
          avatarColor="teal"
          valueColor="text-positive"
          format="money"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <KpiCard
          label="Total Reembolsado"
          :value="kpis.totalReimbursed"
          icon="trending_up"
          avatarColor="green"
          valueColor="text-positive"
          format="money"
        />
      </div>
    </div>

    <!-- Charts - Full Width -->
    <div v-if="!loading" class="q-mb-md">
      <BarChart
        title="Comparativo Mensal"
        :labels="chartData.labels"
        :disbursed="chartData.disbursed"
        :payments="chartData.payments"
      />
    </div>

    <!-- Upcoming Installments -->
    <UpcomingTable
      v-if="!loading"
      :items="upcomingInstallments"
    />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import KpiCard from '@/components/ui/KpiCard.vue'
import SmsQueueIndicator from '@/components/ui/SmsQueueIndicator.vue'
import FiltersBar from '@/components/ui/FiltersBar.vue'
import BarChart from '@/components/charts/BarChart.vue'
import UpcomingTable from '@/components/ui/UpcomingTable.vue'

const $q = useQuasar()
const authStore = useAuthStore()
const dashboardStore = useDashboardStore()

const loading = computed(() => dashboardStore.loading)
const kpis = computed(() => dashboardStore.kpis)
const chartData = computed(() => dashboardStore.chartData)
const upcomingInstallments = computed(() => dashboardStore.upcomingInstallments)

async function loadDashboard(filters = {}) {
  const companyId = authStore.companyId
  if (!companyId) {
    loadMockData()
    return
  }
  await dashboardStore.fetchDashboard(companyId, filters)
}

function loadMockData() {
  dashboardStore.kpis = {
    totalCustomers: 156,
    totalDisbursed: 2500000,
    pendingAmount: 850000,
    rejectedAmount: 120000,
    capitalRecovered: 1800000,
    totalInterestReceived: 450000
  }

  dashboardStore.chartData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    disbursed: [180000, 220000, 195000, 240000, 210000, 280000, 250000, 300000, 270000, 320000, 290000, 350000],
    payments: [120000, 150000, 140000, 170000, 160000, 190000, 180000, 210000, 200000, 230000, 220000, 260000]
  }

  dashboardStore.overdueInstallments = [
    { id: 1, customerName: 'Ana Silva', accountNumber: 'ACC-001', amount: 15000, daysOverdue: 45 },
    { id: 2, customerName: 'Carlos Santos', accountNumber: 'ACC-002', amount: 8500, daysOverdue: 22 },
    { id: 3, customerName: 'Maria Fernandes', accountNumber: 'ACC-003', amount: 12000, daysOverdue: 60 },
    { id: 4, customerName: 'Pedro Nhaca', accountNumber: 'ACC-004', amount: 6000, daysOverdue: 15 }
  ]
}

function onFilter(filters) {
  loadDashboard(filters)
}

function onClear() {
  loadDashboard()
}

function onSync() {
  loadDashboard()
  $q.notify({ type: 'info', message: 'Dados sincronizados', position: 'top' })
}

function onCall(row) {
  $q.notify({ type: 'info', message: `A ligar para ${row.customerName}...`, position: 'top' })
}

function onSms(row) {
  $q.notify({ type: 'info', message: `A enviar SMS para ${row.customerName}...`, position: 'top' })
}

onMounted(() => {
  loadDashboard()
})
</script>
