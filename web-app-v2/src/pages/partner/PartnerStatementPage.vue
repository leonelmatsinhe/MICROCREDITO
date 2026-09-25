<template>
  <div class="q-pa-md partner-page">
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="row q-col-gutter-sm items-center q-py-sm">
        <div class="col-12 col-md-4">
          <div class="text-subtitle2 text-weight-bold">Extrato da carteira</div>
          <div class="text-caption text-grey-6">Resumo do capital, desembolsos e recebimentos do seu fundo.</div>
        </div>
        <div class="col-6 col-md-2">
          <q-input v-model="filters.from" dense outlined type="date" label="De" @update:model-value="load" />
        </div>
        <div class="col-6 col-md-2">
          <q-input v-model="filters.to" dense outlined type="date" label="Até" @update:model-value="load" />
        </div>
        <div class="col-auto q-gutter-sm no-wrap">
          <q-btn flat round dense icon="refresh" color="primary" :loading="loading" @click="load">
            <q-tooltip>Actualizar</q-tooltip>
          </q-btn>
          <q-btn outline color="teal" icon="table_chart" label="Excel" no-caps rounded size="sm" @click="exportExcel" />
          <q-btn outline color="primary" icon="print" label="Imprimir" no-caps rounded size="sm" @click="printView" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Resumo -->
    <q-card v-if="resumo" flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div v-for="item in resumoItems" :key="item.label" class="col-12 col-sm-6 col-md-3">
            <div class="text-caption text-grey-6">{{ item.label }}</div>
            <div class="text-subtitle1 text-weight-bold" :class="item.class">{{ item.value }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md">
      <!-- Desembolsos -->
      <div class="col-12 col-lg-6">
        <q-card flat bordered style="border-radius: 12px; overflow: hidden">
          <q-card-section class="q-py-sm bg-green-1">
            <div class="text-subtitle2 text-weight-bold">Desembolsos ({{ desembolsos.length }})</div>
          </q-card-section>
          <q-table
            :rows="desembolsos"
            :columns="loanColumns"
            row-key="id"
            flat
            dense
            separator="horizontal"
            :rows-per-page-options="[10, 25]"
            no-data-label="Sem desembolsos no período."
          >
            <template v-slot:body-cell-amount="props">
              <q-td :props="props" class="text-right">{{ money(props.row.amount) }}</q-td>
            </template>
            <template v-slot:body-cell-disbursementDate="props">
              <q-td :props="props" class="text-center">{{ props.row.disbursementDate || '—' }}</q-td>
            </template>
          </q-table>
        </q-card>
      </div>

      <!-- Recebimentos -->
      <div class="col-12 col-lg-6">
        <q-card flat bordered style="border-radius: 12px; overflow: hidden">
          <q-card-section class="q-py-sm bg-blue-1">
            <div class="text-subtitle2 text-weight-bold">Recebimentos ({{ recebimentos.length }})</div>
          </q-card-section>
          <q-table
            :rows="recebimentos"
            :columns="txColumns"
            row-key="id"
            flat
            dense
            separator="horizontal"
            :rows-per-page-options="[10, 25]"
            no-data-label="Sem recebimentos no período."
          >
            <template v-slot:body-cell-amount="props">
              <q-td :props="props" class="text-right text-positive">{{ money(props.row.amount) }}</q-td>
            </template>
            <template v-slot:body-cell-paymentDate="props">
              <q-td :props="props" class="text-center">{{ props.row.paymentDate || '—' }}</q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useWalletsStore } from '@/stores/wallets'

const $q = useQuasar()
const walletsStore = useWalletsStore()

const filters = ref({ from: '', to: '' })
const loading = computed(() => walletsStore.loadingPartner)
const statement = computed(() => walletsStore.partnerStatement)
const resumo = computed(() => statement.value?.resumo || null)
const desembolsos = computed(() => statement.value?.desembolsos || [])
const recebimentos = computed(() => statement.value?.recebimentos || [])

const money = (v) => `${(Number(v) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`

const resumoItems = computed(() => {
  const r = resumo.value
  if (!r) return []
  return [
    { label: 'Capital alocado', value: r.capital_alocado === null ? 'Sem limite' : money(r.capital_alocado) },
    { label: 'Desembolsado (total)', value: money(r.desembolsado_total) },
    { label: 'Desembolsado no período', value: money(r.desembolsado_periodo) },
    { label: 'Disponível (analítico)', value: r.saldo_analitico === null ? 'Sem limite' : money(r.saldo_analitico), class: 'text-primary' },
    { label: 'Recebido (total)', value: money(r.recebido_total), class: 'text-positive' },
    { label: 'Recebido no período', value: money(r.recebido_periodo), class: 'text-positive' },
    { label: 'Juros recebidos no período', value: money(r.juros_periodo) },
    { label: 'Mora recebida no período', value: money(r.mora_periodo) },
    { label: 'Saldo a receber dos clientes', value: money(r.saldo_a_receber), class: 'text-warning' },
    { label: 'Nº de créditos no período', value: String(r.num_creditos || 0) },
    { label: 'Nº de recebimentos no período', value: String(r.num_recebimentos || 0) }
  ]
})

const loanColumns = [
  { name: 'id', label: 'Crédito', field: 'id', align: 'center' },
  { name: 'customerName', label: 'Cliente', field: 'customerName', align: 'left' },
  { name: 'disbursementDate', label: 'Data', field: 'disbursementDate', align: 'center' },
  { name: 'amount', label: 'Montante', field: 'amount', align: 'right' }
]
const txColumns = [
  { name: 'paymentDate', label: 'Data', field: 'paymentDate', align: 'center' },
  { name: 'customerName', label: 'Cliente', field: 'customerName', align: 'left' },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right' },
  { name: 'recibo_numero', label: 'Recibo', field: 'recibo_numero', align: 'center' }
]

async function load() {
  try {
    await walletsStore.fetchPartnerStatement({
      from: filters.value.from || undefined,
      to: filters.value.to || undefined
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar o extrato', position: 'top' })
  }
}

async function exportExcel() {
  try {
    const query = new URLSearchParams()
    if (filters.value.from) query.set('from', filters.value.from)
    if (filters.value.to) query.set('to', filters.value.to)
    const code = walletsStore.partnerProfile?.carteira?.codigo || 'carteira'
    await walletsStore.downloadFile(`/api/partner/statement/excel?${query.toString()}`, `Extrato_${code}.xlsx`)
    $q.notify({ type: 'positive', message: 'Extrato exportado', position: 'top' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Erro ao exportar o extrato', position: 'top' })
  }
}

function printView() {
  window.print()
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
