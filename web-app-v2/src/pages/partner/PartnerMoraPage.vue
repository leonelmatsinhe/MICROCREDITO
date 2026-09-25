<template>
  <div class="q-pa-md partner-page">
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="row items-center q-py-sm">
        <div class="col">
          <div class="text-subtitle2 text-weight-bold">Juros de mora da carteira</div>
          <div class="text-caption text-grey-6">
            Mora gerada pelas prestações em atraso dos créditos financiados por {{ wallet?.codigo || 'esta carteira' }}.
          </div>
        </div>
        <q-btn flat round dense icon="refresh" color="primary" :loading="loading" @click="load">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-4">
        <KpiCard label="Mora gerada (em atraso)" :value="totals.gerada" icon="warning_amber" avatarColor="orange" format="money" valueColor="text-warning" />
      </div>
      <div class="col-12 col-sm-4">
        <KpiCard label="Mora já recebida" :value="totals.recebida" icon="task_alt" avatarColor="green" format="money" valueColor="text-positive" />
      </div>
      <div class="col-12 col-sm-4">
        <KpiCard label="Mora por receber" :value="totals.pendente" icon="report_problem" avatarColor="red" format="money" valueColor="text-negative" :secondary-text="`${rows.length} prestação(ões) em atraso`" />
      </div>
    </div>

    <BarChart
      v-if="series.labels.length > 0"
      title="Mora gerada vs. recebida por mês"
      :labels="series.labels"
      :disbursed="series.gerada"
      :payments="series.recebida"
      class="q-mb-md"
    />

    <q-card flat bordered style="border-radius: 12px; overflow: hidden">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        flat
        bordered
        dense
        separator="horizontal"
        :loading="loading"
        :rows-per-page-options="[10, 25, 50]"
        no-data-label="Não existem prestações em atraso nesta carteira."
      >
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.customerName }}</div>
            <div class="text-caption text-grey-6">Crédito n.º {{ props.row.loanId }} · conta {{ props.row.accountNumber || '—' }}</div>
          </q-td>
        </template>
        <template v-slot:body-cell-dueDate="props">
          <q-td :props="props" class="text-center">
            {{ fmtDate(props.row.dueDate) }}
            <div class="text-caption text-negative">{{ props.row.dias_atraso }} dias</div>
          </q-td>
        </template>
        <template v-slot:body-cell-installment="props">
          <q-td :props="props" class="text-right">{{ money(props.row.installment) }}</q-td>
        </template>
        <template v-slot:body-cell-remaining="props">
          <q-td :props="props" class="text-right">{{ money(props.row.remaining) }}</q-td>
        </template>
        <template v-slot:body-cell-moraGerada="props">
          <q-td :props="props" class="text-right text-warning text-weight-bold">{{ money(props.row.mora_gerada) }}</q-td>
        </template>
        <template v-slot:body-cell-moraRecebida="props">
          <q-td :props="props" class="text-right text-positive">{{ money(props.row.mora_recebida) }}</q-td>
        </template>
        <template v-slot:body-cell-moraPendente="props">
          <q-td :props="props" class="text-right text-negative">{{ money(props.row.mora_pendente) }}</q-td>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import KpiCard from '@/components/ui/KpiCard.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { useWalletsStore } from '@/stores/wallets'

const $q = useQuasar()
const walletsStore = useWalletsStore()

const loading = computed(() => walletsStore.loadingPartner)
const data = computed(() => walletsStore.partnerMora)
const rows = computed(() => data.value?.prestacoes || [])
const wallet = computed(() => walletsStore.partnerProfile?.carteira || null)

const totals = computed(() => ({
  gerada: Number(data.value?.total_mora_gerada) || 0,
  recebida: Number(data.value?.total_mora_recebida) || 0,
  pendente: Number(data.value?.total_mora_pendente) || 0
}))

const series = computed(() => {
  const list = data.value?.serie_mensal || []
  return {
    labels: list.map((r) => monthLabel(r.mes)),
    gerada: list.map((r) => Number(r.mora_gerada) || 0),
    recebida: list.map((r) => Number(r.mora_recebida) || 0)
  }
})

const columns = [
  { name: 'customer', label: 'Cliente', field: 'customerName', align: 'left', sortable: true },
  { name: 'installmentOrder', label: 'Prestação', field: 'installmentOrder', align: 'center' },
  { name: 'dueDate', label: 'Vencimento / atraso', field: 'dueDate', align: 'center' },
  { name: 'installment', label: 'Valor prestação', field: 'installment', align: 'right' },
  { name: 'remaining', label: 'Pendente', field: 'remaining', align: 'right' },
  { name: 'moraGerada', label: 'Mora gerada', field: 'mora_gerada', align: 'right', sortable: true },
  { name: 'moraRecebida', label: 'Mora recebida', field: 'mora_recebida', align: 'right' },
  { name: 'moraPendente', label: 'Mora pendente', field: 'mora_pendente', align: 'right', sortable: true }
]

function monthLabel(mes) {
  const [year, month] = String(mes).split('-')
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${names[Number(month) - 1] || month}/${String(year).slice(2)}`
}

const money = (v) => `${(Number(v) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
function fmtDate(value) {
  if (!value) return '—'
  try { return format(new Date(String(value).slice(0, 10)), 'dd/MM/yyyy') } catch { return String(value) }
}

async function load() {
  try {
    await walletsStore.fetchPartnerMora()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar a mora', position: 'top' })
  }
}

onMounted(async () => {
  if (!walletsStore.partnerProfile) await walletsStore.fetchPartnerProfile()
  await load()
})
</script>

<style lang="scss" scoped>
.partner-page {
  background: #f8fafc;
  min-height: calc(100vh - 60px);
}
</style>
