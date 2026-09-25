<template>
  <div class="q-pa-md partner-page">
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="row q-col-gutter-sm items-center q-py-sm">
        <div class="col-12 col-md-4">
          <div class="text-subtitle2 text-weight-bold">Créditos desembolsados pela carteira</div>
          <div class="text-caption text-grey-6">
            Apenas créditos financiados com o capital do parceiro ({{ wallet?.codigo || '—' }}).
          </div>
        </div>
        <div class="col-12 col-md-3">
          <q-input v-model="filters.search" dense outlined clearable placeholder="Pesquisar cliente, conta ou n.º" @keyup.enter="load">
            <template v-slot:prepend><q-icon name="search" size="18px" /></template>
          </q-input>
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

    <q-card flat bordered style="border-radius: 12px; overflow: hidden">
      <q-table
        :rows="loans"
        :columns="columns"
        row-key="id"
        flat
        bordered
        dense
        separator="horizontal"
        :loading="loading"
        :rows-per-page-options="[10, 25, 50]"
        no-data-label="Sem créditos desembolsados nesta carteira."
      >
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.customerName }}</div>
            <div class="text-caption text-grey-6">Conta {{ props.row.accountNumber || '—' }}</div>
          </q-td>
        </template>
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" class="text-right text-weight-bold">{{ money(props.row.amount) }}</q-td>
        </template>
        <template v-slot:body-cell-rate="props">
          <q-td :props="props" class="text-center">{{ (Number(props.row.interestRate) * 100).toFixed(2) }}%</q-td>
        </template>
        <template v-slot:body-cell-balance="props">
          <q-td :props="props" class="text-right">{{ money(props.row.saldo_devedor) }}</q-td>
        </template>
        <template v-slot:body-cell-overdue="props">
          <q-td :props="props" class="text-center">
            <q-badge v-if="Number(props.row.prestacoes_atraso) > 0" color="negative" :label="`${props.row.prestacoes_atraso} em atraso`" />
            <span v-else class="text-grey-6">—</span>
          </q-td>
        </template>
        <template v-slot:body-cell-mora="props">
          <q-td :props="props" class="text-right" :class="Number(props.row.mora_gerada) > 0 ? 'text-warning' : ''">
            {{ money(props.row.mora_gerada) }}
          </q-td>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-chip dense :color="Number(props.row.status) === 3 ? 'green' : 'blue'" text-color="white" style="font-size: 10px">
              {{ Number(props.row.status) === 3 ? 'Liquidado' : 'Activo' }}
            </q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn flat round dense icon="visibility" color="primary" @click="openDetail(props.row)">
              <q-tooltip>Ver prestações deste crédito</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Detalhe: prestações do crédito -->
    <q-dialog v-model="detailDialog" maximized-sm>
      <q-card style="min-width: 760px; max-width: 95vw; border-radius: 12px">
        <q-card-section class="row items-center">
          <div>
            <div class="text-h6">{{ detail?.customerName }}</div>
            <div class="text-caption text-grey-6">Crédito n.º {{ detail?.id }} · {{ money(detail?.amount) }} · {{ (Number(detail?.interestRate) * 100).toFixed(2) }}%</div>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section style="max-height: 65vh" class="scroll">
          <q-table
            :rows="detailInstallments"
            :columns="installmentColumns"
            row-key="id"
            flat
            bordered
            dense
            separator="horizontal"
            :loading="loadingDetail"
            no-data-label="Sem prestações."
          >
            <template v-slot:body-cell-installment="props">
              <q-td :props="props" class="text-right">{{ money(props.row.installment) }}</q-td>
            </template>
            <template v-slot:body-cell-paidAmount="props">
              <q-td :props="props" class="text-right">{{ money(props.row.paidAmount) }}</q-td>
            </template>
            <template v-slot:body-cell-remaining="props">
              <q-td :props="props" class="text-right text-weight-bold">{{ money(props.row.remaining) }}</q-td>
            </template>
            <template v-slot:body-cell-mora="props">
              <q-td :props="props" class="text-right">{{ money(props.row.mora_gerada) }}</q-td>
            </template>
            <template v-slot:body-cell-status="props">
              <q-td :props="props" class="text-center">
                <q-chip dense style="font-size: 10px" :color="props.row.status === 1 ? 'green' : props.row.dias_atraso > 0 ? 'negative' : 'grey-6'" text-color="white">
                  {{ props.row.status === 1 ? 'Paga' : props.row.dias_atraso > 0 ? `Atraso ${props.row.dias_atraso}d` : 'Pendente' }}
                </q-chip>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import { useWalletsStore } from '@/stores/wallets'

const $q = useQuasar()
const walletsStore = useWalletsStore()

const filters = ref({ search: '', from: '', to: '' })
const detailDialog = ref(false)
const detail = ref(null)
const detailInstallments = ref([])
const loadingDetail = ref(false)

const loading = computed(() => walletsStore.loadingPartner)
const loans = computed(() => walletsStore.partnerLoans)
const wallet = computed(() => walletsStore.partnerProfile?.carteira || null)

const columns = [
  { name: 'id', label: 'N.º', field: 'id', align: 'center', sortable: true },
  { name: 'customer', label: 'Cliente', field: 'customerName', align: 'left', sortable: true },
  { name: 'disbursementDate', label: 'Desembolso', field: 'disbursementDate', align: 'center', format: (v) => fmtDate(v) },
  { name: 'amount', label: 'Montante', field: 'amount', align: 'right', sortable: true },
  { name: 'rate', label: 'Taxa', field: 'interestRate', align: 'center' },
  { name: 'installments', label: 'Prestações', field: 'numberOfInstallments', align: 'center' },
  { name: 'balance', label: 'Saldo devedor', field: 'saldo_devedor', align: 'right', sortable: true },
  { name: 'overdue', label: 'Atraso', field: 'prestacoes_atraso', align: 'center' },
  { name: 'mora', label: 'Mora gerada', field: 'mora_gerada', align: 'right' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'actions', label: '', field: 'id', align: 'center' }
]

const installmentColumns = [
  { name: 'installmentOrder', label: 'Prestação', field: 'installmentOrder', align: 'center' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'center', format: (v) => fmtDate(v) },
  { name: 'installment', label: 'Valor', field: 'installment', align: 'right' },
  { name: 'paidAmount', label: 'Pago', field: 'paidAmount', align: 'right' },
  { name: 'remaining', label: 'Pendente', field: 'remaining', align: 'right' },
  { name: 'mora', label: 'Mora gerada', field: 'mora_gerada', align: 'right' },
  { name: 'paymentDate', label: 'Data pagamento', field: 'paymentDate', align: 'center', format: (v) => fmtDate(v) },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' }
]

function money(value) {
  return `${(Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
}

function fmtDate(value) {
  if (!value) return '—'
  try { return format(new Date(String(value).slice(0, 10)), 'dd/MM/yyyy') } catch { return String(value) }
}

async function load() {
  try {
    await walletsStore.fetchPartnerLoans({
      search: filters.value.search || undefined,
      from: filters.value.from || undefined,
      to: filters.value.to || undefined
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar créditos', position: 'top' })
  }
}

async function openDetail(loan) {
  detail.value = loan
  detailInstallments.value = []
  detailDialog.value = true
  loadingDetail.value = true
  try {
    const { data } = await (await import('@/boot/axios')).api.get('/api/partner/installments', { params: { loanId: loan.id } })
    detailInstallments.value = data.success ? data.result || [] : []
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar prestações', position: 'top' })
  } finally {
    loadingDetail.value = false
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
