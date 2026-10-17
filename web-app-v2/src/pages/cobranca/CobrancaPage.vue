<template>
  <q-page class="q-pa-md">
    <!-- Cabeçalho -->
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">Cobrança</div>
        <div class="text-caption text-grey-6">
          Clientes com prestações vencidas
          <span v-if="isGestor"> · A minha carteira</span>
          <span v-else> · Toda a empresa</span>
        </div>
      </div>
      <q-space />
      <q-btn outline no-caps icon="refresh" label="Actualizar" :loading="loading" @click="fetchOverdue" />
    </div>

    <!-- Filtros -->
    <q-card flat bordered class="q-pa-sm q-mb-md" data-tour="cobranca-filters">
      <div class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-3">
          <q-select
            v-model="daysFilter"
            :options="daysOptions"
            emit-value
            map-options
            outlined
            dense
            label="Dias de atraso"
            @update:model-value="fetchOverdue"
          />
        </div>
        <div class="col-12 col-sm-4">
          <q-input
            v-model="search"
            outlined
            dense
            clearable
            label="Pesquisar por nome ou conta"
            debounce="400"
            @update:model-value="fetchOverdue"
          >
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-5">
          <div class="row q-gutter-sm justify-end">
            <q-chip dense color="red-1" text-color="red-9" icon="warning">
              {{ rows.length }} cliente(s) em atraso
            </q-chip>
            <q-chip dense color="orange-1" text-color="orange-9" icon="payments">
              {{ formatMoney(totalOverdue) }} MZN em risco
            </q-chip>
          </div>
        </div>
      </div>
    </q-card>

    <!-- Tabela de cobrança -->
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="accountNumber"
      :loading="loading"
      flat
      bordered
      :pagination="{ rowsPerPage: 15 }"
    >
      <template v-slot:body-cell-customer="props">
        <q-td :props="props">
          <div class="text-weight-medium">{{ props.row.customerName }}</div>
          <div class="text-caption text-grey-6">Conta {{ props.row.accountNumber }}</div>
        </q-td>
      </template>

      <template v-slot:body-cell-days="props">
        <q-td :props="props" class="text-center">
          <q-badge :color="daysColor(props.row.maxDaysLate)" text-color="white" rounded>
            {{ props.row.maxDaysLate }} dia(s)
          </q-badge>
        </q-td>
      </template>

      <template v-slot:body-cell-lastActivity="props">
        <q-td :props="props">
          <template v-if="props.row.lastActivity">
            <div class="text-body2">{{ props.row.lastActivity.activityLabel }}</div>
            <div class="text-caption text-grey-6">
              {{ formatDateTime(props.row.lastActivity.activityDate) }} · {{ props.row.lastActivity.createdByName }}
            </div>
          </template>
          <span v-else class="text-grey-5">Sem registos</span>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <div class="row items-center no-wrap justify-center" style="gap: 2px">
            <q-btn flat round dense icon="home" color="teal" size="xs" @click.stop="openActivity(props.row, 'VISITA_DOMICILIAR')">
              <q-tooltip>Registar visita domiciliária</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="call" color="blue-8" size="xs" @click.stop="openActivity(props.row, 'LIGACAO_TELEFONICA')">
              <q-tooltip>Registar ligação telefónica</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="handshake" color="positive" size="xs" @click.stop="openActivity(props.row, 'PROMESSA_PAGAMENTO')">
              <q-tooltip>Registar promessa de pagamento</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="block" color="negative" size="xs" @click.stop="openActivity(props.row, 'RECUSA')">
              <q-tooltip>Registar recusa</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="history" color="primary" size="xs" @click.stop="openHistory(props.row)">
              <q-tooltip>Histórico de cobrança</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>

      <template v-slot:loading>
        <q-inner-loading showing color="primary" />
      </template>

      <template v-slot:no-data>
        <div class="full-width row flex-center q-pa-lg text-grey-6">
          <q-icon name="task_alt" size="32px" class="q-mr-sm" />
          Nenhum cliente com prestações vencidas neste filtro.
        </div>
      </template>
    </q-table>

    <!-- Registo de atividade (visita / ligação / promessa / recusa) -->
    <CollectionActivityModal
      v-model="showActivity"
      :customer="activityCustomer"
      :initial-type="activityType"
      @saved="onActivitySaved"
    />

    <!-- Histórico de cobrança do cliente -->
    <CollectionHistoryDialog v-model="showHistory" :customer="historyCustomer" />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'
import CollectionActivityModal from '@/components/modals/CollectionActivityModal.vue'
import CollectionHistoryDialog from '@/components/modals/CollectionHistoryDialog.vue'

const $q = useQuasar()
const authStore = useAuthStore()
const isGestor = computed(() => Number(authStore.userRole) === 3)

const loading = ref(false)
const rows = ref([])
const search = ref('')
const daysFilter = ref(null)

const daysOptions = [
  { label: 'Todos os atrasos', value: null },
  { label: '1 a 7 dias', value: '1-7' },
  { label: '8 a 30 dias', value: '8-30' },
  { label: '31 a 60 dias', value: '31-60' },
  { label: 'Mais de 60 dias', value: '61-9999' }
]

const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'phone', label: 'Telefone', field: 'customerPhone', align: 'center' },
  { name: 'overdueCount', label: 'Prestações vencidas', field: 'overdueCount', align: 'center', sortable: true },
  { name: 'days', label: 'Atraso máximo', field: 'maxDaysLate', align: 'center', sortable: true },
  { name: 'totalOverdue', label: 'Valor em atraso', field: 'totalOverdue', align: 'right', sortable: true },
  { name: 'lastActivity', label: 'Última cobrança', field: 'lastActivity', align: 'left' },
  { name: 'actions', label: 'Registar', field: 'actions', align: 'center' }
]

const totalOverdue = computed(() =>
  rows.value.reduce((sum, row) => sum + (Number(row.totalOverdue) || 0), 0)
)

function daysColor(days) {
  const n = Number(days) || 0
  if (n > 60) return 'red-9'
  if (n > 30) return 'red-7'
  if (n > 7) return 'orange-8'
  return 'amber-8'
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return String(value)
  }
}

async function fetchOverdue() {
  loading.value = true
  try {
    const params = {}
    if (daysFilter.value) {
      const [min, max] = String(daysFilter.value).split('-')
      params.minDays = min
      params.maxDays = max
    }
    if (search.value && search.value.trim()) params.search = search.value.trim()
    const { data } = await api.get('/api/collection/overdue', { params })
    rows.value = Array.isArray(data?.result) ? data.result : []
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar as cobranças', position: 'top' })
    rows.value = []
  } finally {
    loading.value = false
  }
}

// ── Registo de atividade ───────────────────────────────────────────────────
const showActivity = ref(false)
const activityCustomer = ref(null)
const activityType = ref('VISITA_DOMICILIAR')

function openActivity(row, type) {
  activityCustomer.value = row
  activityType.value = type
  showActivity.value = true
}

function onActivitySaved() {
  fetchOverdue()
}

// ── Histórico (diálogo partilhado com «A Minha Carteira») ───────────────────
const showHistory = ref(false)
const historyCustomer = ref(null)

function openHistory(row) {
  historyCustomer.value = row
  showHistory.value = true
}

onMounted(fetchOverdue)
</script>
