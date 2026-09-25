<template>
  <div class="q-pa-md partner-page">
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="row items-center q-py-sm">
        <div class="col">
          <div class="text-subtitle2 text-weight-bold">Recibos dos pagamentos</div>
          <div class="text-caption text-grey-6">
            Comprovativos emitidos pela MBRM para os pagamentos recebidos com o capital desta carteira.
          </div>
        </div>
        <q-btn flat round dense icon="refresh" color="primary" :loading="loading" @click="load">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </q-card-section>
    </q-card>

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
        no-data-label="Sem recibos emitidos para esta carteira."
      >
        <template v-slot:body-cell-numero="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.numero }}</div>
            <div class="text-caption text-grey-6">Série {{ props.row.serie }} · {{ props.row.ano }}</div>
          </q-td>
        </template>
        <template v-slot:body-cell-customer_name="props">
          <q-td :props="props">
            <div>{{ props.row.customer_name || '—' }}</div>
            <div class="text-caption text-grey-6">Crédito n.º {{ props.row.loanId || '—' }}</div>
          </q-td>
        </template>
        <template v-slot:body-cell-valor_pago="props">
          <q-td :props="props" class="text-right text-weight-bold">{{ money(props.row.valor_pago) }}</q-td>
        </template>
        <template v-slot:body-cell-valor_juros="props">
          <q-td :props="props" class="text-right">{{ money(props.row.valor_juros) }}</q-td>
        </template>
        <template v-slot:body-cell-valor_mora="props">
          <q-td :props="props" class="text-right" :class="Number(props.row.valor_mora) > 0 ? 'text-warning' : ''">
            {{ money(props.row.valor_mora) }}
          </q-td>
        </template>
        <template v-slot:body-cell-saldo_restante="props">
          <q-td :props="props" class="text-right">{{ money(props.row.saldo_restante) }}</q-td>
        </template>
        <template v-slot:body-cell-created_at="props">
          <q-td :props="props" class="text-center">{{ fmtDate(props.row.created_at) }}</q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn flat round dense icon="picture_as_pdf" color="primary" @click="openPdf(props.row)">
              <q-tooltip>Abrir recibo em PDF</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import { useWalletsStore } from '@/stores/wallets'

const $q = useQuasar()
const walletsStore = useWalletsStore()

const loading = computed(() => walletsStore.loadingPartner)
const rows = computed(() => walletsStore.partnerRecibos)

const columns = [
  { name: 'numero', label: 'Recibo', field: 'numero', align: 'left', sortable: true },
  { name: 'customer_name', label: 'Cliente', field: 'customer_name', align: 'left' },
  { name: 'valor_pago', label: 'Valor pago', field: 'valor_pago', align: 'right', sortable: true },
  { name: 'valor_juros', label: 'Juros', field: 'valor_juros', align: 'right' },
  { name: 'valor_mora', label: 'Mora', field: 'valor_mora', align: 'right' },
  { name: 'saldo_restante', label: 'Saldo devedor', field: 'saldo_restante', align: 'right' },
  { name: 'created_at', label: 'Emissão', field: 'created_at', align: 'center', sortable: true },
  { name: 'actions', label: '', field: 'id', align: 'center' }
]

const money = (v) => `${(Number(v) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
function fmtDate(value) {
  if (!value) return '—'
  try { return format(new Date(value), 'dd/MM/yyyy') } catch { return String(value) }
}

async function openPdf(row) {
  try {
    await walletsStore.openPdf(`/api/partner/recibos/${row.id}/pdf`)
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Não foi possível abrir o recibo', position: 'top' })
  }
}

async function load() {
  try {
    await walletsStore.fetchPartnerRecibos()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar os recibos', position: 'top' })
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.partner-page {
  background: #f8fafc;
  min-height: calc(100vh - 60px);
}
</style>
