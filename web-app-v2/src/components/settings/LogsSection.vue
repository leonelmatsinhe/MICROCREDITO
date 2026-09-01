<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Histórico do Sistema</div>
        <div class="text-caption text-grey-5">Registo de acções e movimentos do sistema</div>
      </div>
      <div class="col-auto">
        <q-btn color="negative" icon="delete_sweep" label="Eliminar Selecionados" unelevated no-caps rounded size="sm" @click="deleteSelected" :disable="selected.length === 0 || !isAdmin" class="q-mr-sm" />
        <q-btn color="primary" icon="download" label="Exportar" unelevated no-caps rounded size="sm" @click="exportLogs" />
      </div>
    </div>

    <!-- Filters -->
    <q-card flat bordered class="q-mb-md" style="border-radius: 10px">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-12 col-sm-3">
            <q-select v-model="filter.action" :options="actionOptions" label="Tipo de Acção" dense outlined clearable emit-value map-options input-style="font-size: 12px" />
          </div>
          <div class="col-12 col-sm-3">
            <q-select v-model="filter.module" :options="moduleOptions" label="Módulo" dense outlined clearable emit-value map-options input-style="font-size: 12px" />
          </div>
          <div class="col-12 col-sm-3">
            <q-input v-model="filter.search" label="Pesquisar" dense outlined clearable input-style="font-size: 12px">
              <template v-slot:prepend><q-icon name="search" size="14px" /></template>
            </q-input>
          </div>
          <div class="col-12 col-sm-3">
            <q-btn flat color="grey" icon="clear_all" label="Limpar" no-caps size="sm" @click="clearFilters" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <!-- Logs Table -->
    <q-table
      v-else
      :rows="filteredLogs"
      :columns="columns"
      row-key="id"
      flat
      bordered
      style="border-radius: 10px"
      :rows-per-page-options="[10, 15, 25, 50]"
      :pagination="pagination"
      :selected="selected"
      @update:selected="onSelectionUpdate"
      selection="multiple"
    >
      <template v-slot:top-left>
        <div class="text-caption text-grey-5">
          {{ selected.length > 0 ? `${selected.length} selecionado(s)` : `${filteredLogs.length} registo(s)` }}
        </div>
      </template>

      <template v-slot:body-cell-action="props">
        <q-td :props="props">
          <q-chip :color="getActionColor(props.row.action)" text-color="white" size="xs" dense>
            {{ props.row.action }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-module="props">
        <q-td :props="props">
          <div class="row items-center no-wrap">
            <q-icon :name="getModuleIcon(props.row.module)" size="14px" class="q-mr-xs" :color="getModuleColor(props.row.module)" />
            {{ props.row.module }}
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-user="props">
        <q-td :props="props">
          <div class="row items-center no-wrap">
            <q-avatar size="20px" :color="getRoleColor(props.row.userRole)" text-color="white" class="q-mr-xs">
              <span style="font-size: 9px">{{ getInitials(props.row.userName) }}</span>
            </q-avatar>
            {{ props.row.userName }}
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-date="props">
        <q-td :props="props">
          <div style="font-size: 12px">
            {{ formatDate(props.row.createdAt) }}
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-details="props">
        <q-td :props="props">
          <div class="row items-center no-wrap">
            <q-btn flat round dense icon="visibility" size="xs" color="grey-7" @click="viewDetails(props.row)">
              <q-tooltip>Ver detalhes</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" size="xs" color="negative" @click="deleteSingle(props.row)" v-if="isAdmin">
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </q-table>

    <!-- Details Dialog -->
    <q-dialog v-model="showDetails" position="right" full-height>
      <q-card style="width: 400px; max-width: 90vw; border-radius: 12px 0 0 12px">
        <q-card-section class="bg-primary text-white row items-center" style="border-radius: 12px 0 0 0">
          <q-icon name="info" size="20px" class="q-mr-sm" />
          <div class="text-h6">Detalhes do Registo</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showDetails = false" />
        </q-card-section>

        <q-card-section v-if="selectedLog">
          <q-list separator>
            <q-item>
              <q-item-section avatar><q-icon name="tag" color="primary" /></q-item-section>
              <q-item-section>
                <q-item-label caption>ID</q-item-label>
                <q-item-label>{{ selectedLog.id }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="event" color="blue" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Data/Hora</q-item-label>
                <q-item-label>{{ formatDateTime(selectedLog.createdAt) }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="person" color="teal" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Utilizador</q-item-label>
                <q-item-label>{{ selectedLog.userName }} ({{ getRoleLabel(selectedLog.userRole) }})</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="flash_on" color="orange" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Acção</q-item-label>
                <q-item-label>{{ selectedLog.action }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="category" color="purple" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Módulo</q-item-label>
                <q-item-label>{{ selectedLog.module }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="selectedLog.description">
              <q-item-section avatar><q-icon name="description" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Descrição</q-item-label>
                <q-item-label>{{ selectedLog.description }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="selectedLog.ipAddress">
              <q-item-section avatar><q-icon name="wifi" color="indigo" /></q-item-section>
              <q-item-section>
                <q-item-label caption>IP</q-item-label>
                <q-item-label>{{ selectedLog.ipAddress }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="border-radius: 12px; min-width: 320px">
        <q-card-section class="text-center q-pa-lg">
          <q-avatar icon="warning" color="negative" text-color="white" size="48px" />
          <div class="text-h6 q-mt-md">Eliminar Logs</div>
          <div class="text-body2 text-grey-6 q-mt-sm">
            Tem certeza que deseja eliminar <strong>{{ deleteCount }}</strong> registo(s)?
          </div>
          <div class="text-caption text-grey-5 q-mt-xs">Esta acção não pode ser desfeita.</div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup no-caps />
          <q-btn unelevated label="Eliminar" color="negative" :loading="deleting" @click="confirmDelete" v-close-popup no-caps rounded />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import { getInitials } from '@/utils/formatters'

const $q = useQuasar()
const authStore = useAuthStore()

const loading = ref(false)
const deleting = ref(false)
const logs = ref([])
const showDetails = ref(false)
const selectedLog = ref(null)
const selected = ref([])
const showDeleteConfirm = ref(false)
const deleteCount = ref(0)
const idsToDelete = ref([])

const isAdmin = computed(() => authStore.userRole === 1)

const filter = ref({ action: null, module: null, search: '' })

const pagination = ref({ rowsPerPage: 15 })

const columns = [
  { name: 'date', label: 'Data', field: 'createdAt', align: 'left', sortable: true },
  { name: 'user', label: 'Utilizador', field: 'userName', align: 'left', sortable: true },
  { name: 'action', label: 'Acção', field: 'action', align: 'center', sortable: true },
  { name: 'module', label: 'Módulo', field: 'module', align: 'left', sortable: true },
  { name: 'details', label: '', field: 'id', align: 'center' }
]

const actionOptions = [
  { label: 'LOGIN', value: 'LOGIN' },
  { label: 'LOGOUT', value: 'LOGOUT' },
  { label: 'CRIAR', value: 'CRIAR' },
  { label: 'EDITAR', value: 'EDITAR' },
  { label: 'ELIMINAR', value: 'ELIMINAR' },
  { label: 'APROVAR', value: 'APROVAR' },
  { label: 'REJEITAR', value: 'REJEITAR' },
  { label: 'PAGAR', value: 'PAGAR' },
  { label: 'PAGAMENTO PARCIAL', value: 'PAGAMENTO PARCIAL' },
  { label: 'EXPORTAR', value: 'EXPORTAR' },
  { label: 'CONFIGURAR', value: 'CONFIGURAR' },
  { label: 'ACTIVAR', value: 'ACTIVAR' },
  { label: 'DESACTIVAR', value: 'DESACTIVAR' }
]

const moduleOptions = [
  { label: 'Autenticação', value: 'Autenticação' },
  { label: 'Mutuários', value: 'Mutuários' },
  { label: 'Créditos', value: 'Créditos' },
  { label: 'Pagamentos', value: 'Pagamentos' },
  { label: 'Relatórios', value: 'Relatórios' },
  { label: 'Configurações', value: 'Configurações' },
  { label: 'Utilizadores', value: 'Utilizadores' },
  { label: 'Documentos', value: 'Documentos' },
  { label: 'Garantias', value: 'Garantias' },
  { label: 'Taxas de Juro', value: 'Taxas de Juro' },
  { label: 'Contas Bancárias', value: 'Contas Bancárias' },
  { label: 'SMS', value: 'SMS' }
]

const filteredLogs = computed(() => {
  let result = [...logs.value]
  if (filter.value.action) {
    result = result.filter(l => l.action === filter.value.action)
  }
  if (filter.value.module) {
    result = result.filter(l => l.module === filter.value.module)
  }
  if (filter.value.search) {
    const s = filter.value.search.toLowerCase()
    result = result.filter(l =>
      (l.userName || '').toLowerCase().includes(s) ||
      (l.description || '').toLowerCase().includes(s) ||
      (l.action || '').toLowerCase().includes(s) ||
      (l.module || '').toLowerCase().includes(s)
    )
  }
  return result
})

function getActionColor(action) {
  const colors = {
    LOGIN: 'positive', LOGOUT: 'grey', CRIAR: 'blue', EDITAR: 'orange',
    ELIMINAR: 'negative', APROVAR: 'teal', REJEITAR: 'red', PAGAR: 'green',
    'PAGAMENTO PARCIAL': 'amber', EXPORTAR: 'purple', CONFIGURAR: 'cyan',
    ACTIVAR: 'positive', DESACTIVAR: 'warning'
  }
  return colors[action] || 'grey'
}

function getModuleIcon(module) {
  const icons = {
    'Autenticação': 'login', 'Mutuários': 'people', 'Créditos': 'account_balance',
    'Pagamentos': 'payments', 'Relatórios': 'assessment', 'Configurações': 'settings',
    'Utilizadores': 'person', 'Documentos': 'description', 'Garantias': 'security',
    'Taxas de Juro': 'percent', 'Contas Bancárias': 'account_balance_wallet', 'Sms': 'sms'
  }
  return icons[module] || 'article'
}

function getModuleColor(module) {
  const colors = {
    'Autenticação': 'positive', 'Mutuários': 'blue', 'Créditos': 'orange',
    'Pagamentos': 'green', 'Relatórios': 'purple', 'Configurações': 'grey',
    'Utilizadores': 'teal', 'Documentos': 'indigo', 'Garantias': 'amber',
    'Taxas de Juro': 'cyan', 'Contas Bancárias': 'brown', 'Sms': 'light-green'
  }
  return colors[module] || 'grey'
}

function getRoleColor(role) {
  return { 1: 'negative', 3: 'teal' }[role] || 'grey'
}

function getRoleLabel(role) {
  return { 1: 'Admin', 3: 'Gestor' }[role] || 'Utilizador'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('pt-MZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function clearFilters() {
  filter.value = { action: null, module: null, search: '' }
}

function viewDetails(log) {
  selectedLog.value = log
  showDetails.value = true
}

function onSelectionUpdate(newSelection) {
  selected.value = newSelection
}

function deleteSingle(log) {
  idsToDelete.value = [log.id]
  deleteCount.value = 1
  showDeleteConfirm.value = true
}

function deleteSelected() {
  idsToDelete.value = selected.value.map(l => l.id)
  deleteCount.value = selected.value.length
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  deleting.value = true
  try {
    await api.delete('/api/logs', { data: { ids: idsToDelete.value } })
    $q.notify({ type: 'positive', message: `${deleteCount.value} logs eliminados`, position: 'top' })
    selected.value = []
    showDeleteConfirm.value = false
    fetchLogs()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao eliminar logs', position: 'top' })
  } finally {
    deleting.value = false
  }
}

function exportLogs() {
  $q.notify({ type: 'info', message: 'Exportação em desenvolvimento', position: 'top' })
}

async function fetchLogs() {
  loading.value = true
  try {
    const companyId = authStore.companyId
    const { data } = await api.get(`/api/logs/${companyId}`)
    logs.value = data.result || data.logs || []
  } catch (error) {
    console.error('Erro ao carregar logs:', error)
    logs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLogs()
})
</script>

<style lang="scss" scoped>
.q-table {
  font-size: 12px;
}
</style>
