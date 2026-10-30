<template>
  <div class="q-pa-md logs-page">
    <!-- ═══════════ CABEÇALHO EXECUTIVO ═══════════ -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center no-wrap">
          <q-icon name="history_edu" class="q-mr-sm text-primary" size="26px" />
          <h1 class="text-h6 text-weight-bold text-slate-800 q-my-none">
            Histórico do Sistema e Auditoria
          </h1>
          <q-chip color="primary" text-color="white" size="sm" dense class="q-ml-sm font-mono">
            Trilho de Auditoria
          </q-chip>
        </div>
        <div class="text-caption text-grey-7 q-mt-xs">
          Registo cronológico e imutável de autenticações, concessões, amortizações e alterações operacionais
        </div>
      </div>

      <div class="row items-center q-gutter-xs">
        <q-btn
          outline
          color="grey-8"
          icon="picture_as_pdf"
          label="PDF"
          no-caps
          rounded
          size="sm"
          data-tour="logs-export"
          @click="exportPDF"
        />
        <q-btn
          outline
          color="green-8"
          icon="table_view"
          label="Excel"
          no-caps
          rounded
          size="sm"
          @click="exportExcel"
        />
        <q-btn
          v-if="isAdmin"
          outline
          color="negative"
          icon="auto_delete"
          label="Expurgar Registos Antigos"
          no-caps
          rounded
          size="sm"
          data-tour="logs-expurgo"
          @click="openPurgeDialog"
        >
          <q-tooltip>Expurgo controlado de registos antigos (Apenas Administrador)</q-tooltip>
        </q-btn>
        <q-btn
          outline
          color="primary"
          icon="refresh"
          label="Actualizar"
          no-caps
          rounded
          size="sm"
          :loading="loading"
          @click="fetchLogs"
        />
      </div>
    </div>

    <!-- ═══════════ KPI EXECUTIVE STRIP ═══════════ -->
    <div class="row q-col-gutter-sm q-mb-md" data-tour="logs-kpis">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Total de Registos</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-slate-900">{{ logs.length }}</span>
              <span class="text-caption text-grey-6">Auditáveis</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Autenticações / Sessões</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-primary">{{ authLogsCount }}</span>
              <span class="text-caption text-grey-6">{{ loginsTodayCount }} hoje</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Operações Financeiras</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-positive">{{ financialLogsCount }}</span>
              <span class="text-caption text-grey-6">Créditos e pagamentos</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Utilizadores Activos</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-slate-900">{{ distinctUsersCount }}</span>
              <span class="text-caption text-grey-6">Operadores e gestores</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ═══════════ BARRA DE FILTROS & PRESETS ═══════════ -->
    <q-card flat bordered class="q-mb-md filters-card" data-tour="logs-filters">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <!-- Pesquisa de texto livre -->
          <div class="col-12 col-sm-4 col-md-3">
            <q-input
              v-model="filter.search"
              dense
              outlined
              clearable
              placeholder="Pesquisar utilizador, acção, IP ou descrição..."
              input-style="font-size: 12px"
            >
              <template v-slot:prepend><q-icon name="search" size="16px" /></template>
            </q-input>
          </div>

          <!-- Filtro de Tipo de Acção -->
          <div class="col-12 col-sm-3 col-md-2">
            <q-select
              v-model="filter.action"
              :options="actionOptions"
              dense
              outlined
              clearable
              emit-value
              map-options
              label="Tipo de Acção"
              options-dense
              input-style="font-size: 12px"
            />
          </div>

          <!-- Filtro de Módulo -->
          <div class="col-12 col-sm-3 col-md-2">
            <q-select
              v-model="filter.module"
              :options="moduleOptions"
              dense
              outlined
              clearable
              emit-value
              map-options
              label="Módulo"
              options-dense
              input-style="font-size: 12px"
            />
          </div>

          <!-- Atalhos Rápidos por Categoria -->
          <div class="col-12 col-md-auto q-gutter-xs">
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="!filter.action && !filter.module ? 'primary' : 'grey-2'"
              :text-color="!filter.action && !filter.module ? 'white' : 'grey-8'"
              label="Todos"
              @click="clearFilters"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="filter.module === 'Autenticação' ? 'primary' : 'grey-2'"
              :text-color="filter.module === 'Autenticação' ? 'white' : 'grey-8'"
              label="Logins"
              @click="filter.module = 'Autenticação'; filter.action = null"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="filter.module === 'Créditos' ? 'primary' : 'grey-2'"
              :text-color="filter.module === 'Créditos' ? 'white' : 'grey-8'"
              label="Créditos"
              @click="filter.module = 'Créditos'; filter.action = null"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="filter.module === 'Pagamentos' ? 'primary' : 'grey-2'"
              :text-color="filter.module === 'Pagamentos' ? 'white' : 'grey-8'"
              label="Pagamentos"
              @click="filter.module = 'Pagamentos'; filter.action = null"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="filter.action === 'ELIMINAR' ? 'negative' : 'grey-2'"
              :text-color="filter.action === 'ELIMINAR' ? 'white' : 'grey-8'"
              label="Eliminações"
              @click="filter.action = 'ELIMINAR'; filter.module = null"
            />
          </div>

          <div class="col-auto">
            <q-btn
              v-if="isFiltering"
              flat
              dense
              color="grey-7"
              icon="filter_alt_off"
              label="Limpar"
              size="sm"
              @click="clearFilters"
            />
          </div>

          <q-space />

          <div class="col-auto text-caption text-grey-6">
            Apresentando <strong>{{ filteredLogs.length }}</strong> de {{ logs.length }}
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════════ LOADING ═══════════ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-6 q-mt-sm">A carregar trilho de auditoria...</div>
    </div>

    <!-- ═══════════ ESTADO VAZIO ═══════════ -->
    <q-card v-else-if="filteredLogs.length === 0" flat bordered class="empty-card text-center q-pa-xl">
      <q-card-section>
        <q-icon name="verified_user" size="56px" color="primary" />
        <div class="text-subtitle1 text-weight-bold text-slate-800 q-mt-md">Nenhum registo de auditoria encontrado</div>
        <div class="text-caption text-grey-6 q-mt-xs">
          {{ isFiltering ? 'Nenhum evento corresponde aos filtros seleccionados.' : 'Ainda não foram registadas actividades no sistema.' }}
        </div>
        <q-btn
          v-if="isFiltering"
          outline
          color="primary"
          no-caps
          rounded
          size="sm"
          icon="filter_alt_off"
          label="Limpar Filtros"
          class="q-mt-md"
          @click="clearFilters"
        />
        <q-btn
          v-else
          outline
          color="primary"
          no-caps
          rounded
          size="sm"
          icon="refresh"
          label="Actualizar"
          class="q-mt-md"
          @click="fetchLogs"
        />
      </q-card-section>
    </q-card>

    <!-- ═══════════ TABELA DE AUDITORIA ═══════════ -->
    <q-card v-else flat bordered class="table-card">
      <q-table
        data-tour="logs-table"
        :rows="filteredLogs"
        :columns="columns"
        row-key="id"
        flat
        :rows-per-page-options="[15, 25, 50, 100]"
        :pagination="pagination"
      >
        <!-- Data / Hora -->
        <template v-slot:body-cell-datetime="props">
          <q-td :props="props">
            <div class="text-weight-bold text-slate-800 font-mono" style="font-size: 12px">
              {{ formatDate(props.row.createdAt) }}
            </div>
            <div class="text-caption text-grey-6 font-mono">
              {{ formatTime(props.row.createdAt) }}
            </div>
          </q-td>
        </template>

        <!-- Utilizador & Perfil -->
        <template v-slot:body-cell-user="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <span class="text-weight-bold text-slate-800 q-mr-xs" style="font-size: 13px">
                {{ props.row.userName || 'Sistema' }}
              </span>
              <q-badge
                :color="getRoleBadgeColor(props.row.userRole)"
                outline
                size="xs"
              >
                {{ getRoleLabel(props.row.userRole) }}
              </q-badge>
            </div>
            <div v-if="props.row.ipAddress" class="text-caption text-grey-5 font-mono">
              IP: {{ props.row.ipAddress }}
            </div>
          </q-td>
        </template>

        <!-- Módulo -->
        <template v-slot:body-cell-module="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-icon
                :name="getModuleIcon(props.row.module)"
                size="15px"
                class="q-mr-xs"
                :color="getModuleColor(props.row.module)"
              />
              <span class="text-weight-medium" style="font-size: 12px">
                {{ props.row.module || 'Geral' }}
              </span>
            </div>
          </q-td>
        </template>

        <!-- Acção -->
        <template v-slot:body-cell-action="props">
          <q-td :props="props">
            <q-chip
              :color="getActionColor(props.row.action)"
              text-color="white"
              size="xs"
              dense
              class="text-weight-bold"
            >
              {{ props.row.action }}
            </q-chip>
          </q-td>
        </template>

        <!-- Descrição / Detalhe -->
        <template v-slot:body-cell-description="props">
          <q-td :props="props">
            <div class="ellipsis text-slate-700" style="max-width: 380px" :title="props.row.description">
              {{ props.row.description || 'Sem descrição registada' }}
            </div>
          </q-td>
        </template>

        <!-- Acções / Detalhes -->
        <template v-slot:body-cell-details="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              dense
              icon="visibility"
              size="sm"
              color="primary"
              @click="viewDetails(props.row)"
            >
              <q-tooltip>Ver detalhes completos do evento</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- ═══════════ MODAL DE DETALHES DO REGISTO ═══════════ -->
    <q-dialog v-model="showDetails">
      <q-card style="border-radius: 12px; min-width: 500px; max-width: 90vw">
        <q-card-section class="bg-primary text-white row items-center q-py-sm" style="border-radius: 12px 12px 0 0">
          <q-icon name="verified_user" size="20px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Registo de Auditoria #{{ selectedLog?.id }}</div>
          <q-space />
          <q-btn flat round dense icon="close" color="white" @click="showDetails = false" />
        </q-card-section>

        <q-card-section v-if="selectedLog" class="q-pa-md">
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <div class="text-caption text-grey-6 text-uppercase">Data e Hora Completa</div>
              <div class="text-weight-bold text-slate-800 font-mono" style="font-size: 13px">
                {{ formatDateTime(selectedLog.createdAt) }}
              </div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6 text-uppercase">Utilizador Responsável</div>
              <div class="text-weight-bold text-slate-800" style="font-size: 13px">
                {{ selectedLog.userName || 'Sistema' }}
                <span class="text-grey-6 text-caption">({{ getRoleLabel(selectedLog.userRole) }})</span>
              </div>
            </div>

            <div class="col-6">
              <div class="text-caption text-grey-6 text-uppercase">Módulo do Sistema</div>
              <div class="row items-center no-wrap q-mt-xs">
                <q-icon :name="getModuleIcon(selectedLog.module)" size="16px" class="q-mr-xs" :color="getModuleColor(selectedLog.module)" />
                <span class="text-weight-bold text-slate-800" style="font-size: 13px">{{ selectedLog.module }}</span>
              </div>
            </div>

            <div class="col-6">
              <div class="text-caption text-grey-6 text-uppercase">Tipo de Acção</div>
              <div class="q-mt-xs">
                <q-chip :color="getActionColor(selectedLog.action)" text-color="white" size="xs" dense class="text-weight-bold">
                  {{ selectedLog.action }}
                </q-chip>
              </div>
            </div>

            <div class="col-12" v-if="selectedLog.ipAddress">
              <div class="text-caption text-grey-6 text-uppercase">Endereço IP de Origem</div>
              <div class="font-mono text-weight-medium text-slate-800" style="font-size: 13px">
                {{ selectedLog.ipAddress }}
              </div>
            </div>

            <div class="col-12">
              <div class="text-caption text-grey-6 text-uppercase">Descrição da Actividade</div>
              <div class="q-pa-sm bg-grey-1 rounded-borders text-slate-800 q-mt-xs" style="font-size: 13px; line-height: 1.5; white-space: pre-wrap">
                {{ selectedLog.description || 'Sem descrição registada.' }}
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Fechar" color="grey-8" @click="showDetails = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ MODAL DE EXPURGO REGULAMENTAR (ADMIN) ═══════════ -->
    <q-dialog v-model="showPurgeDialog" persistent>
      <q-card style="border-radius: 12px; min-width: 440px; max-width: 90vw">
        <q-card-section class="bg-red-8 text-white row items-center q-py-sm">
          <q-icon name="warning" size="22px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Expurgo Controlado de Registos</div>
          <q-space />
          <q-btn flat round dense icon="close" color="white" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="text-caption text-grey-8" style="line-height: 1.5">
            O expurgo permanente de registos de auditoria deve obedecer às directrizes de retenção documental do <strong>Banco de Moçambique</strong> e às políticas de compliance da instituição.
          </div>

          <div class="q-mt-md">
            <div class="text-caption text-grey-7 text-weight-bold text-uppercase q-mb-xs">
              Critério de Expurgo
            </div>
            <q-select
              v-model="purgeRetentionDays"
              :options="purgeOptions"
              dense
              outlined
              emit-value
              map-options
              options-dense
            />
          </div>

          <q-banner class="bg-amber-1 text-amber-10 rounded-borders q-mt-md border-amber">
            <template v-slot:avatar><q-icon name="info" color="amber-9" /></template>
            Apenas serão eliminados registos com data anterior a <strong>{{ calculatedPurgeDateLabel }}</strong>. Esta acção é irreversível.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancelar" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            no-caps
            rounded
            label="Confirmar Expurgo"
            color="negative"
            :loading="purging"
            @click="confirmPurge"
          />
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

const $q = useQuasar()
const authStore = useAuthStore()

const loading = ref(false)
const purging = ref(false)
const logs = ref([])
const showDetails = ref(false)
const selectedLog = ref(null)

const showPurgeDialog = ref(false)
const purgeRetentionDays = ref(180)

const isAdmin = computed(() => authStore.userRole === 1)

const filter = ref({ action: null, module: null, search: '' })
const pagination = ref({ sortBy: 'createdAt', descending: true, rowsPerPage: 15 })

const columns = [
  { name: 'datetime', label: 'Data / Hora', field: 'createdAt', align: 'left', sortable: true },
  { name: 'user', label: 'Utilizador & Perfil', field: 'userName', align: 'left', sortable: true },
  { name: 'module', label: 'Módulo', field: 'module', align: 'left', sortable: true },
  { name: 'action', label: 'Acção', field: 'action', align: 'center', sortable: true },
  { name: 'description', label: 'Descrição da Operação', field: 'description', align: 'left', sortable: false },
  { name: 'details', label: 'Detalhes', field: 'id', align: 'center', sortable: false }
]

const purgeOptions = [
  { label: 'Manter últimos 90 dias (eliminar anteriores)', value: 90 },
  { label: 'Manter últimos 180 dias (recomendado)', value: 180 },
  { label: 'Manter últimos 365 dias (1 ano)', value: 365 }
]

const calculatedPurgeDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - Number(purgeRetentionDays.value))
  return d
})

const calculatedPurgeDateLabel = computed(() => {
  return formatDate(calculatedPurgeDate.value)
})

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
  { label: 'Caixa / Tesouraria', value: 'Caixa' },
  { label: 'Relatórios', value: 'Relatórios' },
  { label: 'Configurações', value: 'Configurações' },
  { label: 'Utilizadores', value: 'Utilizadores' },
  { label: 'Documentos', value: 'Documentos' },
  { label: 'Garantias', value: 'Garantias' },
  { label: 'Taxas de Juro', value: 'Taxas de Juro' },
  { label: 'Contas Bancárias', value: 'Contas Bancárias' },
  { label: 'SMS', value: 'SMS' }
]

// KPIs
const authLogsCount = computed(() => {
  return logs.value.filter(l => l.module === 'Autenticação' || l.action === 'LOGIN' || l.action === 'LOGOUT').length
})

const loginsTodayCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return logs.value.filter(l => l.action === 'LOGIN' && String(l.createdAt || '').startsWith(today)).length
})

const financialLogsCount = computed(() => {
  return logs.value.filter(l => ['Créditos', 'Pagamentos', 'Caixa'].includes(l.module) || ['PAGAR', 'APROVAR', 'CRIAR'].includes(l.action)).length
})

const distinctUsersCount = computed(() => {
  const s = new Set()
  logs.value.forEach(l => {
    if (l.userName) s.add(l.userName)
  })
  return s.size
})

const isFiltering = computed(() => {
  return !!filter.value.action || !!filter.value.module || !!filter.value.search
})

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
      (l.module || '').toLowerCase().includes(s) ||
      (l.ipAddress || '').toLowerCase().includes(s)
    )
  }
  return result
})

function getActionColor(action) {
  const colors = {
    LOGIN: 'teal-7',
    LOGOUT: 'grey-7',
    CRIAR: 'positive',
    APROVAR: 'positive',
    PAGAR: 'positive',
    'PAGAMENTO PARCIAL': 'green-8',
    EDITAR: 'amber-9',
    CONFIGURAR: 'cyan-8',
    ACTIVAR: 'positive',
    DESACTIVAR: 'warning',
    ELIMINAR: 'negative',
    REJEITAR: 'red-9',
    EXPORTAR: 'purple-8'
  }
  return colors[action] || 'grey-7'
}

function getModuleIcon(module) {
  const icons = {
    'Autenticação': 'lock_open',
    'Mutuários': 'people',
    'Créditos': 'account_balance',
    'Pagamentos': 'payments',
    'Caixa': 'point_of_sale',
    'Relatórios': 'assessment',
    'Configurações': 'tune',
    'Utilizadores': 'badge',
    'Documentos': 'description',
    'Garantias': 'security',
    'Taxas de Juro': 'percent',
    'Contas Bancárias': 'account_balance_wallet',
    'SMS': 'forum'
  }
  return icons[module] || 'folder_open'
}

function getModuleColor(module) {
  const colors = {
    'Autenticação': 'teal-8',
    'Mutuários': 'indigo',
    'Créditos': 'primary',
    'Pagamentos': 'green-8',
    'Caixa': 'amber-9',
    'Relatórios': 'purple',
    'Configurações': 'grey-8',
    'Utilizadores': 'cyan-9',
    'Documentos': 'blue-grey',
    'Garantias': 'orange-8',
    'Taxas de Juro': 'teal',
    'Contas Bancárias': 'brown',
    'SMS': 'green'
  }
  return colors[module] || 'grey-7'
}

function getRoleBadgeColor(role) {
  return { 1: 'negative', 2: 'indigo', 3: 'teal' }[role] || 'grey-7'
}

function getRoleLabel(role) {
  return { 1: 'Administrador', 2: 'Director', 3: 'Gestor' }[role] || 'Operador'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-MZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function clearFilters() {
  filter.value = { action: null, module: null, search: '' }
}

function viewDetails(log) {
  selectedLog.value = log
  showDetails.value = true
}

function openPurgeDialog() {
  showPurgeDialog.value = true
}

async function confirmPurge() {
  purging.value = true
  try {
    const companyId = authStore.companyId
    const olderThan = calculatedPurgeDate.value.toISOString()
    const { data } = await api.delete('/api/logs', { data: { companyId, olderThan } })
    $q.notify({
      type: 'positive',
      message: data.message || `${data.deletedCount || 0} registos expurgados com sucesso.`,
      position: 'top'
    })
    showPurgeDialog.value = false
    await fetchLogs()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao expurgar registos de auditoria',
      position: 'top'
    })
  } finally {
    purging.value = false
  }
}

// ==================== EXPORTAÇÃO ====================
const exportCfg = {
  headers: ['Data/Hora', 'Utilizador', 'Perfil', 'Módulo', 'Acção', 'Descrição', 'IP'],
  keys: ['datetime', 'user', 'role', 'module', 'action', 'description', 'ip'],
  widths: [110, 100, 80, 85, 80, 220, 90]
}

function exportRows() {
  return filteredLogs.value.map(l => ({
    datetime: formatDateTime(l.createdAt),
    user: l.userName || 'Sistema',
    role: getRoleLabel(l.userRole),
    module: l.module || '—',
    action: l.action || '—',
    description: l.description || '—',
    ip: l.ipAddress || '—'
  }))
}

async function exportPDF() {
  const rows = exportRows()
  if (rows.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há registos de auditoria para exportar', position: 'top' })
    return
  }
  try {
    const { downloadTablePdf } = await import('@/utils/tablePdf')
    const dateStr = new Date().toISOString().slice(0, 10)
    await downloadTablePdf({
      title: 'Histórico do Sistema e Auditoria',
      meta: [`Emitido em ${dateStr}`, rows.length > 1 ? `${rows.length} eventos registados` : '1 evento registado'],
      filename: `historico-auditoria-${dateStr}`,
      columns: exportCfg.headers.map((h, i) => ({
        label: h,
        width: exportCfg.widths[i] ? Math.round(exportCfg.widths[i] * 0.85) : undefined,
        align: 'left'
      })),
      rows: rows.map(row => exportCfg.keys.map(k => String(row[k] ?? '—')))
    }, `historico-auditoria-${dateStr}.pdf`)
    $q.notify({ type: 'positive', message: 'PDF de auditoria gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar PDF:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF de auditoria', position: 'top' })
  }
}

async function exportExcel() {
  const rows = exportRows()
  if (rows.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há registos de auditoria para exportar', position: 'top' })
    return
  }
  try {
    const XLSX = await import('xlsx')
    const wsData = [
      ['Histórico do Sistema e Auditoria'],
      [`Gerado em ${new Date().toLocaleString('pt-MZ')}`],
      [],
      exportCfg.headers,
      ...rows.map(row => exportCfg.keys.map(k => String(row[k] ?? ''))),
      [],
      [`Total de eventos auditados: ${rows.length}`]
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = exportCfg.headers.map((h, i) => ({ wch: exportCfg.widths[i] ? Math.ceil(exportCfg.widths[i] / 6) : 20 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria')

    const fileName = `historico-auditoria-${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
    $q.notify({ type: 'positive', message: 'Excel de auditoria gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar Excel:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar Excel de auditoria', position: 'top' })
  }
}

async function fetchLogs() {
  loading.value = true
  try {
    const companyId = authStore.companyId
    const { data } = await api.get(`/api/logs/${companyId}`)
    logs.value = data.result || data.logs || []
  } catch (error) {
    console.error('Erro ao carregar logs:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao carregar o trilho de auditoria',
      position: 'top'
    })
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
.logs-page {
  max-width: 1400px;
  margin: 0 auto;
}

.kpi-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  transition: all 0.2s ease;
}

.filters-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.table-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.border-amber {
  border: 1px solid #fcd34d;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

body.body--dark {
  .kpi-card {
    background: #1e293b;
    border-color: #334155;
  }

  .filters-card {
    background: #1e293b;
    border-color: #334155;
  }

  .table-card {
    background: #1e293b;
    border-color: #334155;
  }
}
</style>
