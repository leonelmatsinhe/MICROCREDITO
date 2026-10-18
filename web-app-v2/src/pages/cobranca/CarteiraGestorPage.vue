<template>
  <q-page class="q-pa-md">
    <!-- Cabeçalho -->
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">{{ isAdmin ? 'Carteira por Gestor' : 'A Minha Carteira' }}</div>
        <div class="text-caption text-grey-6">
          Clientes da carteira, cobrança e indicadores
          <span v-if="!isAdmin"> · {{ authStore.userName || 'Gestor de Crédito' }}</span>
          <span v-else> · visão global + ranking por gestor</span>
        </div>
      </div>
      <q-space />
      <q-btn outline no-caps icon="refresh" label="Actualizar" :loading="loading" @click="fetchAll" />
    </div>

    <!-- Indicadores principais -->
    <div class="row q-col-gutter-sm q-mb-md" data-tour="carteira-kpis">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-md bg-blue-1">
          <div class="text-caption text-blue-9">Total da carteira</div>
          <div class="text-h5 text-weight-bold text-blue-10">{{ formatMoney(dash.totalCarteira) }}</div>
          <div class="text-caption text-blue-8">MZN em dívida · {{ dash.activeLoans || 0 }} crédito(s) activo(s)</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-md bg-red-1">
          <div class="text-caption text-red-9">PAR 30</div>
          <div class="text-h5 text-weight-bold text-red-10">{{ formatMoney(dash.par30) }}</div>
          <div class="text-caption text-red-8">MZN em risco (atrasos &gt; 30 dias)</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-md bg-green-1">
          <div class="text-caption text-green-9">A receber hoje</div>
          <div class="text-h5 text-weight-bold text-green-10">{{ formatMoney(dash.aReceberHoje) }}</div>
          <div class="text-caption text-green-8">MZN · {{ dash.prestacoesHoje || 0 }} prestação(ões) a vencer</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-md bg-orange-1">
          <div class="text-caption text-orange-9">Promessas do dia</div>
          <div class="text-h5 text-weight-bold text-orange-10">{{ dash.promessasDoDia || 0 }}</div>
          <div class="text-caption text-orange-8">{{ formatMoney(dash.valorPrometidoHoje) }} MZN prometidos</div>
        </q-card>
      </div>
    </div>

    <!-- Composição da carteira + atividade do mês -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-md-5">
        <q-card flat bordered class="fit" data-tour="carteira-composicao">
          <q-card-section class="q-pb-xs">
            <div class="text-subtitle1 text-weight-bold">Composição da carteira</div>
            <div class="text-caption text-grey-6">Clientes atribuídos e clientes disponíveis</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="row q-col-gutter-sm">
              <div class="col-4">
                <div class="cursor-pointer" @click="setTab('todos')">
                  <div class="text-h6 text-weight-bold">{{ totals.clientes || 0 }}</div>
                  <div class="text-caption text-grey-7">Clientes na lista</div>
                </div>
              </div>
              <div class="col-4">
                <div class="cursor-pointer" @click="setTab('atraso')">
                  <div class="text-h6 text-weight-bold text-negative">{{ totals.comAtraso || 0 }}</div>
                  <div class="text-caption text-grey-7">Em atraso</div>
                </div>
              </div>
              <div class="col-4">
                <div class="cursor-pointer" @click="setTab('disponiveis')">
                  <div class="text-h6 text-weight-bold text-orange-9">{{ totals.disponiveis || 0 }}</div>
                  <div class="text-caption text-grey-7">Disponíveis</div>
                </div>
              </div>
            </div>
            <q-separator class="q-my-sm" />
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="text-caption text-grey-7">Em dívida (lista)</div>
                <div class="text-weight-medium">{{ formatMoney(totals.credito) }} MZN</div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-7">Em atraso (lista)</div>
                <div class="text-weight-medium text-negative">{{ formatMoney(totals.emAtraso) }} MZN</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-7">
        <q-card flat bordered class="fit">
          <q-card-section class="q-pb-xs">
            <div class="text-subtitle1 text-weight-bold">Atividade de cobrança do mês</div>
            <div class="text-caption text-grey-6">
              {{ dash.clientes || 0 }} cliente(s) na carteira · {{ dash.atividadesMes?.total || 0 }} registo(s) este mês
              · {{ totals.promessasPendentes || 0 }} promessa(s) pendente(s)
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="row q-col-gutter-sm">
              <div class="col-6 col-sm-3">
                <q-card flat class="q-pa-sm bg-teal-1 text-center">
                  <q-icon name="home" size="24px" color="teal-8" />
                  <div class="text-h6 text-weight-bold text-teal-10">{{ dash.atividadesMes?.visitas || 0 }}</div>
                  <div class="text-caption text-teal-9">Visitas</div>
                </q-card>
              </div>
              <div class="col-6 col-sm-3">
                <q-card flat class="q-pa-sm bg-blue-1 text-center">
                  <q-icon name="call" size="24px" color="blue-8" />
                  <div class="text-h6 text-weight-bold text-blue-10">{{ dash.atividadesMes?.chamadas || 0 }}</div>
                  <div class="text-caption text-blue-9">Chamadas</div>
                </q-card>
              </div>
              <div class="col-6 col-sm-3">
                <q-card flat class="q-pa-sm bg-green-1 text-center">
                  <q-icon name="handshake" size="24px" color="green-8" />
                  <div class="text-h6 text-weight-bold text-green-10">{{ dash.atividadesMes?.promessas || 0 }}</div>
                  <div class="text-caption text-green-9">Promessas</div>
                </q-card>
              </div>
              <div class="col-6 col-sm-3">
                <q-card flat class="q-pa-sm bg-red-1 text-center">
                  <q-icon name="block" size="24px" color="red-8" />
                  <div class="text-h6 text-weight-bold text-red-10">{{ dash.atividadesMes?.recusas || 0 }}</div>
                  <div class="text-caption text-red-9">Recusas</div>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ── Clientes da carteira: cobrança pronta ─────────────────────────── -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="q-pb-xs">
        <div class="row items-center">
          <div>
            <div class="text-subtitle1 text-weight-bold">Clientes da carteira</div>
            <div class="text-caption text-grey-6">
              Cobrança pronta: visita, ligação, promessa, recusa e histórico — com prova de quem registou.
            </div>
          </div>
          <q-space />
          <q-toggle v-model="onlyOverdue" dense color="negative" label="Só em atraso" left-label @update:model-value="fetchPortfolio" />
        </div>
      </q-card-section>
      <q-separator />
      <q-tabs
        v-model="tab"
        dense
        align="left"
        active-color="primary"
        indicator-color="primary"
        class="q-px-sm"
      >
        <q-tab name="todos" no-caps icon="people">
          Todos
          <q-badge class="q-ml-xs" rounded :color="tab === 'todos' ? 'primary' : 'grey-5'" :label="totals.clientes || 0" />
        </q-tab>
        <q-tab name="atraso" no-caps icon="warning">
          Em atraso
          <q-badge class="q-ml-xs" rounded :color="tab === 'atraso' ? 'primary' : 'grey-5'" :label="totals.comAtraso || 0" />
        </q-tab>
        <q-tab name="disponiveis" no-caps icon="person_add">
          Disponíveis
          <q-badge class="q-ml-xs" rounded :color="tab === 'disponiveis' ? 'primary' : 'grey-5'" :label="totals.disponiveis || 0" />
        </q-tab>
        <q-space />
        <q-input
          v-model="search"
          dense
          outlined
          clearable
          debounce="400"
          placeholder="Nome, conta ou telefone…"
          style="max-width: 280px"
          class="q-ma-xs"
          @update:model-value="fetchPortfolio"
        >
          <template v-slot:prepend><q-icon name="search" /></template>
        </q-input>
      </q-tabs>
      <q-separator />

      <q-table
        :rows="visibleRows"
        :columns="columns"
        row-key="accountNumber"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 15 }"
        :rows-per-page-options="[10, 15, 25, 50]"
      >
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.customerName }}</div>
            <div class="text-caption text-grey-6">
              Conta {{ props.row.accountNumber }}
              <span v-if="props.row.customerBairro"> · {{ props.row.customerBairro }}</span>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-owner="props">
          <q-td :props="props" class="text-center">
            <q-badge
              v-if="props.row.available"
              color="orange-8"
              text-color="white"
              rounded
              label="Disponível"
            />
            <div v-else class="text-body2">{{ props.row.ownerName }}</div>
            <q-btn
              v-if="props.row.available && !isAdmin"
              flat
              dense
              no-caps
              size="sm"
              color="primary"
              icon="person_add"
              label="Assumir"
              :loading="claiming === props.row.accountNumber"
              @click.stop="claim(props.row)"
            />
          </q-td>
        </template>

        <template v-slot:body-cell-outstanding="props">
          <q-td :props="props" class="text-right">
            <div class="text-weight-medium">{{ formatMoney(props.row.totalOutstanding) }}</div>
            <div class="text-caption text-grey-6">{{ props.row.activeLoans }} crédito(s)</div>
          </q-td>
        </template>

        <template v-slot:body-cell-days="props">
          <q-td :props="props" class="text-center">
            <q-badge v-if="props.row.overdueCount > 0" :color="daysColor(props.row.maxDaysLate)" text-color="white" rounded>
              {{ props.row.maxDaysLate }} dia(s)
            </q-badge>
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <template v-slot:body-cell-nextDue="props">
          <q-td :props="props" class="text-center">
            <span v-if="props.row.nextDueDate">{{ formatDate(props.row.nextDueDate) }}</span>
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <template v-slot:body-cell-lastActivity="props">
          <q-td :props="props">
            <template v-if="props.row.pendingPromise">
              <div class="text-body2 text-green-9">
                Prometeu {{ formatMoney(props.row.pendingPromise.promisedAmount) }} MZN
              </div>
              <div class="text-caption text-grey-6">até {{ formatDate(props.row.pendingPromise.promisedDate) }}</div>
            </template>
            <template v-else-if="props.row.lastActivity">
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

        <template v-slot:no-data>
          <div class="full-width row flex-center q-pa-lg text-grey-6">
            <q-icon name="person_search" size="32px" class="q-mr-sm" />
            <span v-if="tab === 'disponiveis'">Nenhum cliente disponível — todos têm Gestor de Crédito.</span>
            <span v-else-if="tab === 'atraso'">Nenhum cliente em atraso nesta carteira.</span>
            <span v-else>Nenhum cliente encontrado na carteira.</span>
          </div>
        </template>

        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>
      </q-table>
    </q-card>

    <!-- Ranking por gestor (Admin) -->
    <q-card v-if="isAdmin" flat bordered data-tour="carteira-ranking">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold">Ranking por gestor</div>
        <div class="text-caption text-grey-6">Carteira, risco e atividade de cobrança de cada Gestor de Crédito</div>
      </q-card-section>
      <q-separator />
      <q-table
        :rows="ranking"
        :columns="rankingColumns"
        row-key="gestorId"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:body-cell-carteira="props">
          <q-td :props="props" class="text-right text-weight-medium">{{ formatMoney(props.row.carteira) }}</q-td>
        </template>
        <template v-slot:body-cell-par30="props">
          <q-td :props="props" class="text-right" :class="Number(props.row.par30) > 0 ? 'text-negative text-weight-medium' : ''">
            {{ formatMoney(props.row.par30) }}
          </q-td>
        </template>
        <template v-slot:body-cell-visitas="props">
          <q-td :props="props" class="text-center">
            <q-badge color="teal-7" text-color="white" rounded>{{ props.row.visitasMes }}</q-badge>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Registo de atividade de cobrança (visita / ligação / promessa / recusa) -->
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
const isAdmin = computed(() => [0, 1].includes(Number(authStore.userRole)))

const loading = ref(false)
const dash = ref({
  totalCarteira: 0,
  activeLoans: 0,
  clientes: 0,
  par30: 0,
  aReceberHoje: 0,
  prestacoesHoje: 0,
  promessasDoDia: 0,
  valorPrometidoHoje: 0,
  atividadesMes: { visitas: 0, chamadas: 0, promessas: 0, recusas: 0, total: 0 }
})
const ranking = ref([])

// ── Clientes da carteira ────────────────────────────────────────────────────
const rows = ref([])
const totals = ref({ clientes: 0, disponiveis: 0, comAtraso: 0, credito: 0, emAtraso: 0, promessasPendentes: 0 })
const tab = ref('todos')
const search = ref('')
const onlyOverdue = ref(false)
const claiming = ref(null)

const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'phone', label: 'Telefone', field: 'customerPhone', align: 'center' },
  { name: 'owner', label: 'Gestor', field: 'ownerName', align: 'center' },
  { name: 'outstanding', label: 'Em dívida (MZN)', field: 'totalOutstanding', align: 'right', sortable: true },
  { name: 'days', label: 'Atraso', field: 'maxDaysLate', align: 'center', sortable: true },
  { name: 'nextDue', label: 'Próx. vencimento', field: 'nextDueDate', align: 'center', sortable: true },
  { name: 'lastActivity', label: 'Última cobrança / promessa', field: 'lastActivity', align: 'left' },
  { name: 'actions', label: 'Cobrança', field: 'actions', align: 'center' }
]

const rankingColumns = [
  { name: 'gestor', label: 'Gestor', field: 'gestorName', align: 'left', sortable: true },
  { name: 'clientes', label: 'Clientes', field: 'clientes', align: 'center', sortable: true },
  { name: 'creditos', label: 'Créditos activos', field: 'creditosActivos', align: 'center', sortable: true },
  { name: 'carteira', label: 'Carteira (MZN)', field: 'carteira', align: 'right', sortable: true },
  { name: 'par30', label: 'PAR 30 (MZN)', field: 'par30', align: 'right', sortable: true },
  { name: 'visitas', label: 'Visitas (mês)', field: 'visitasMes', align: 'center', sortable: true },
  { name: 'chamadas', label: 'Chamadas (mês)', field: 'chamadasMes', align: 'center', sortable: true },
  { name: 'promessas', label: 'Promessas (mês)', field: 'promessasMes', align: 'center', sortable: true }
]

// Filtro local das abas: a lista já vem com os clientes do gestor + os
// disponíveis (sem gestor válido), e é aqui que se separa o que é urgente.
const visibleRows = computed(() => {
  if (tab.value === 'atraso') return rows.value.filter((row) => Number(row.overdueCount) > 0)
  if (tab.value === 'disponiveis') return rows.value.filter((row) => row.available)
  return rows.value
})

function setTab(name) {
  tab.value = name
}

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

function formatDate(value) {
  try {
    return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('pt-PT')
  } catch {
    return String(value)
  }
}

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return String(value)
  }
}

async function fetchDashboard() {
  const { data } = await api.get('/api/collection/dashboard')
  if (data?.success && data.result) dash.value = data.result
}

async function fetchPortfolio() {
  const params = {}
  if (search.value && search.value.trim()) params.search = search.value.trim()
  if (onlyOverdue.value) params.onlyOverdue = 1
  const { data } = await api.get('/api/collection/portfolio', { params })
  rows.value = Array.isArray(data?.result?.rows) ? data.result.rows : []
  totals.value = data?.result?.totals || { clientes: 0, disponiveis: 0, comAtraso: 0, credito: 0, emAtraso: 0, promessasPendentes: 0 }
}

async function fetchRanking() {
  if (!isAdmin.value) return
  const { data } = await api.get('/api/collection/ranking')
  ranking.value = Array.isArray(data?.result) ? data.result : []
}

async function fetchAll() {
  loading.value = true
  try {
    await Promise.all([fetchDashboard(), fetchPortfolio(), fetchRanking()])
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar a carteira', position: 'top' })
  } finally {
    loading.value = false
  }
}

// ── Assumir carteira (cliente disponível) ───────────────────────────────────
async function claim(row) {
  claiming.value = row.accountNumber
  try {
    const { data } = await api.post('/api/collection/claim', { accountNumber: row.accountNumber })
    $q.notify({
      type: 'positive',
      message: data?.message || `${row.customerName} passou a ser da sua carteira.`,
      position: 'top'
    })
    await fetchAll()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Não foi possível assumir esta carteira',
      position: 'top'
    })
  } finally {
    claiming.value = null
  }
}

// ── Registo de atividade (as quatro operações de cobrança) ─────────────────
const showActivity = ref(false)
const activityCustomer = ref(null)
const activityType = ref('VISITA_DOMICILIAR')

function openActivity(row, type) {
  activityCustomer.value = row
  activityType.value = type
  showActivity.value = true
}

function onActivitySaved() {
  fetchAll()
}

// ── Histórico de cobrança ───────────────────────────────────────────────────
const showHistory = ref(false)
const historyCustomer = ref(null)

function openHistory(row) {
  historyCustomer.value = row
  showHistory.value = true
}

onMounted(fetchAll)
</script>
