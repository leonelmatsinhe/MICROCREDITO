<template>
  <div class="q-pa-md partner-page">
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="row q-col-gutter-sm items-center q-py-sm">
        <div class="col-12 col-md-4">
          <div class="text-subtitle2 text-weight-bold">{{ title }}</div>
          <div class="text-caption text-grey-6">{{ subtitle }}</div>
        </div>
        <div class="col-12 col-md-3">
          <q-btn-toggle
            v-if="scope === 'pendentes'"
            v-model="localScope"
            spread
            no-caps
            dense
            outline
            toggle-color="primary"
            :options="[
              { label: 'A vencer', value: 'pendentes' },
              { label: 'Em atraso', value: 'atraso' },
              { label: 'Todas', value: 'todas' }
            ]"
            @update:model-value="load"
          />
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

    <!-- Totais da vista -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-4">
        <KpiCard label="Prestações listadas" :value="rows.length" icon="list_alt" avatarColor="blue" />
      </div>
      <div class="col-12 col-sm-4">
        <KpiCard label="Valor pendente (vista)" :value="totalPending" icon="schedule" avatarColor="orange" format="money" />
      </div>
      <div class="col-12 col-sm-4">
        <KpiCard :label="scope === 'pagas' ? 'Valor pago (vista)' : 'Mora gerada (vista)'" :value="scope === 'pagas' ? totalPaid : totalMora" :icon="scope === 'pagas' ? 'task_alt' : 'warning_amber'" avatarColor="green" format="money" />
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
        no-data-label="Sem prestações para mostrar."
      >
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.customerName }}</div>
            <div class="text-caption text-grey-6">Crédito n.º {{ props.row.loanId }}</div>
          </q-td>
        </template>
        <template v-slot:body-cell-dueDate="props">
          <q-td :props="props" class="text-center">
            {{ fmtDate(props.row.dueDate) }}
            <div v-if="props.row.dias_atraso > 0" class="text-caption text-negative">{{ props.row.dias_atraso }} dias de atraso</div>
          </q-td>
        </template>
        <template v-slot:body-cell-installment="props">
          <q-td :props="props" class="text-right text-weight-bold">{{ money(props.row.installment) }}</q-td>
        </template>
        <template v-slot:body-cell-paidAmount="props">
          <q-td :props="props" class="text-right">{{ money(props.row.paidAmount) }}</q-td>
        </template>
        <template v-slot:body-cell-remaining="props">
          <q-td :props="props" class="text-right">{{ money(props.row.remaining) }}</q-td>
        </template>
        <template v-slot:body-cell-mora="props">
          <q-td :props="props" class="text-right" :class="Number(props.row.mora_gerada) > 0 ? 'text-warning' : ''">
            {{ money(props.row.mora_gerada) }}
          </q-td>
        </template>
        <template v-slot:body-cell-paymentDate="props">
          <q-td :props="props" class="text-center">{{ props.row.paymentDate ? fmtDate(props.row.paymentDate) : '—' }}</q-td>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-chip
              dense
              style="font-size: 10px"
              text-color="white"
              :color="props.row.status === 1 ? 'green' : props.row.dias_atraso > 0 ? 'negative' : 'grey-6'"
            >
              {{ props.row.status === 1 ? 'Paga' : props.row.dias_atraso > 0 ? 'Em atraso' : 'Pendente' }}
            </q-chip>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import KpiCard from '@/components/ui/KpiCard.vue'
import { useWalletsStore } from '@/stores/wallets'

/**
 * PRESTAÇÕES DA CARTEIRA DO PARCEIRO.
 * `scope` vem da rota: 'pagas' (prestações liquidadas) ou 'pendentes'
 * (a vencer / em atraso). Tudo filtrado pelo walletId do parceiro no backend.
 */
const props = defineProps({
  scope: { type: String, default: 'pendentes' }
})

const $q = useQuasar()
const walletsStore = useWalletsStore()

const filters = ref({ from: '', to: '' })
const localScope = ref(props.scope === 'pagas' ? 'pagas' : 'pendentes')

const title = computed(() => (props.scope === 'pagas' ? 'Prestações pagas' : 'Prestações pendentes'))
const subtitle = computed(() =>
  props.scope === 'pagas'
    ? 'Cada prestação liquidada com o capital financiado por este fundo.'
    : 'Prestações a vencer e em atraso, com os juros de mora gerados.'
)

const loading = computed(() => walletsStore.loadingPartner)
const rows = computed(() => walletsStore.partnerInstallments)
const totalPending = computed(() => round(rows.value.reduce((s, r) => s + (Number(r.remaining) || 0), 0)))
const totalPaid = computed(() => round(rows.value.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0)))
const totalMora = computed(() => round(rows.value.reduce((s, r) => s + (Number(r.mora_gerada) || 0), 0)))

const columns = [
  { name: 'customer', label: 'Cliente', field: 'customerName', align: 'left', sortable: true },
  { name: 'installmentOrder', label: 'Prestação', field: 'installmentOrder', align: 'center' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'center' },
  { name: 'installment', label: 'Valor', field: 'installment', align: 'right', sortable: true },
  { name: 'capital', label: 'Capital', field: 'capital', align: 'right' },
  { name: 'juros', label: 'Juros', field: 'juros', align: 'right' },
  { name: 'paidAmount', label: 'Pago', field: 'paidAmount', align: 'right' },
  { name: 'remaining', label: 'Pendente', field: 'remaining', align: 'right' },
  { name: 'mora', label: 'Mora gerada', field: 'mora_gerada', align: 'right' },
  { name: 'paymentDate', label: 'Data pagamento', field: 'paymentDate', align: 'center' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' }
]

const round = (v) => Math.round((Number(v) || 0) * 100) / 100
const money = (v) => `${(Number(v) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
function fmtDate(value) {
  if (!value) return '—'
  try { return format(new Date(String(value).slice(0, 10)), 'dd/MM/yyyy') } catch { return String(value) }
}

async function load() {
  try {
    await walletsStore.fetchPartnerInstallments({
      scope: localScope.value,
      from: filters.value.from || undefined,
      to: filters.value.to || undefined
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar prestações', position: 'top' })
  }
}

// Ao trocar de rota (pagas <-> pendentes) recarrega a vista correcta.
watch(() => props.scope, (value) => {
  localScope.value = value === 'pagas' ? 'pagas' : 'pendentes'
  load()
})

onMounted(load)
</script>

<style lang="scss" scoped>
.partner-page {
  background: #f8fafc;
  min-height: calc(100vh - 60px);
}
</style>
