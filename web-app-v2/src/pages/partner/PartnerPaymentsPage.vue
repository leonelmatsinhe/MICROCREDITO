<template>
  <div class="q-pa-md partner-page">
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="row q-col-gutter-sm items-center q-py-sm">
        <div class="col-12 col-md-4">
          <div class="text-subtitle2 text-weight-bold">Recebimentos da carteira</div>
          <div class="text-caption text-grey-6">Prestações pagas pelos clientes financiados por {{ wallet?.codigo || 'esta carteira' }}.</div>
        </div>
        <div class="col-6 col-md-2">
          <q-input v-model="filters.from" dense outlined type="date" label="De" @update:model-value="load" />
        </div>
        <div class="col-6 col-md-2">
          <q-input v-model="filters.to" dense outlined type="date" label="Até" @update:model-value="load" />
        </div>
        <div class="col-auto">
          <q-btn flat round dense icon="refresh" color="primary" :loading="loading" @click="load">
            <q-tooltip>Actualizar</q-tooltip>
          </q-btn>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-4">
        <KpiCard label="Total recebido (vista)" :value="totals.recebido" icon="payments" avatarColor="green" format="money" valueColor="text-positive" :secondary-text="`${rows.length} pagamento(s)`" />
      </div>
      <div class="col-12 col-sm-4">
        <KpiCard label="Juros recebidos (vista)" :value="totals.juros" icon="percent" avatarColor="teal" format="money" />
      </div>
      <div class="col-12 col-sm-4">
        <KpiCard label="Mora recebida (vista)" :value="totals.mora" icon="warning_amber" avatarColor="orange" format="money" />
      </div>
    </div>

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
        no-data-label="Sem recebimentos nesta carteira."
      >
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.customerName }}</div>
            <div class="text-caption text-grey-6">Crédito n.º {{ props.row.loanId || '—' }}</div>
          </q-td>
        </template>
        <template v-slot:body-cell-paymentDate="props">
          <q-td :props="props" class="text-center">{{ fmtDate(props.row.paymentDate) }}</q-td>
        </template>
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" class="text-right text-weight-bold text-positive">{{ money(props.row.amount) }}</q-td>
        </template>
        <template v-slot:body-cell-capital="props">
          <q-td :props="props" class="text-right">{{ money(props.row.capital) }}</q-td>
        </template>
        <template v-slot:body-cell-juros="props">
          <q-td :props="props" class="text-right">{{ money(props.row.juros) }}</q-td>
        </template>
        <template v-slot:body-cell-mora="props">
          <q-td :props="props" class="text-right" :class="Number(props.row.mora) > 0 ? 'text-warning' : ''">{{ money(props.row.mora) }}</q-td>
        </template>
        <template v-slot:body-cell-method="props">
          <q-td :props="props" class="text-center">
            <q-chip dense outline color="blue-grey" style="font-size: 10px">{{ methodLabel(props.row.paymentMethod) }}</q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-recibo="props">
          <q-td :props="props" class="text-center">
            <q-btn
              v-if="props.row.recibo_id"
              flat
              dense
              no-caps
              size="sm"
              color="primary"
              icon="picture_as_pdf"
              :label="props.row.recibo_numero"
              @click="openRecibo(props.row)"
            />
            <span v-else class="text-caption text-grey-5">—</span>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import KpiCard from '@/components/ui/KpiCard.vue'
import { useWalletsStore } from '@/stores/wallets'

const $q = useQuasar()
const walletsStore = useWalletsStore()

const filters = ref({ from: '', to: '' })
const loading = computed(() => walletsStore.loadingPartner)
const rows = computed(() => walletsStore.partnerTransactions)
const wallet = computed(() => walletsStore.partnerProfile?.carteira || null)

const totals = computed(() => ({
  recebido: round(rows.value.reduce((s, r) => s + (Number(r.amount) || 0), 0)),
  juros: round(rows.value.reduce((s, r) => s + (Number(r.juros) || 0), 0)),
  mora: round(rows.value.reduce((s, r) => s + (Number(r.mora) || 0), 0))
}))

const columns = [
  { name: 'paymentDate', label: 'Data', field: 'paymentDate', align: 'center', sortable: true },
  { name: 'customer', label: 'Cliente', field: 'customerName', align: 'left', sortable: true },
  { name: 'amount', label: 'Valor recebido', field: 'amount', align: 'right', sortable: true },
  { name: 'capital', label: 'Capital', field: 'capital', align: 'right' },
  { name: 'juros', label: 'Juros', field: 'juros', align: 'right' },
  { name: 'mora', label: 'Mora', field: 'mora', align: 'right' },
  { name: 'method', label: 'Método', field: 'paymentMethod', align: 'center' },
  { name: 'recibo', label: 'Recibo', field: 'recibo_numero', align: 'center' }
]

const round = (v) => Math.round((Number(v) || 0) * 100) / 100
const money = (v) => `${(Number(v) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
function fmtDate(value) {
  if (!value) return '—'
  try { return format(new Date(String(value).slice(0, 10)), 'dd/MM/yyyy') } catch { return String(value) }
}
const METHODS = { 0: 'Dinheiro', 1: 'Transferência', 2: 'M-Pesa', 3: 'e-Mola', CASH: 'Dinheiro', BANK: 'Banco', MPESA: 'M-Pesa', EMOLA: 'e-Mola' }
const methodLabel = (m) => METHODS[m] || (m === null || m === undefined ? '—' : String(m))

async function openRecibo(row) {
  try {
    await walletsStore.openPdf(`/api/partner/recibos/${row.recibo_id}/pdf`)
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Não foi possível abrir o recibo', position: 'top' })
  }
}

async function load() {
  try {
    await walletsStore.fetchPartnerTransactions({
      from: filters.value.from || undefined,
      to: filters.value.to || undefined
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar recebimentos', position: 'top' })
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
