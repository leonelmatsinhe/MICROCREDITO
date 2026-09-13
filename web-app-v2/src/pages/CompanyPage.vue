<template>
  <div class="super-admin-page">
    <div class="q-pa-md">
      <div class="row justify-between items-center q-mb-md">
        <div class="text-h6 text-weight-bold text-dark">Painel da Empresa</div>
        <q-btn flat round dense icon="refresh" color="dark" :loading="store.loading" @click="store.fetchCompanies()">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </div>

      <!-- Erro de carregamento (ex.: backend sem as rotas novas) -->
      <q-banner v-if="store.error" rounded class="bg-negative text-white q-mb-md">
        <template v-slot:avatar>
          <q-icon name="warning" color="white" />
        </template>
        {{ store.error }}
      </q-banner>

      <!-- Banner boas-vindas -->
      <q-banner rounded class="welcome-banner q-mb-md">
        <template v-slot:avatar>
          <q-icon name="admin_panel_settings" color="white" size="28px" />
        </template>
        <b>Bem-vindo Super Admin</b> — Você gere todas as microcréditos da plataforma.
      </q-banner>

      <!-- 4 cards topo -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat bordered class="stat-card">
            <q-card-section>
              <div class="text-caption text-grey-6">TOTAL EMPRESAS</div>
              <div class="text-h4 text-weight-bold text-dark">{{ store.totalCompanies }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat bordered class="stat-card relative-position">
            <q-card-section>
              <div class="text-caption text-grey-6">PENDENTES</div>
              <div class="text-h4 text-weight-bold text-negative">{{ store.pending.length }}</div>
            </q-card-section>
            <q-badge v-if="store.pending.length > 0" color="red" floating :label="store.pending.length" />
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat bordered class="stat-card">
            <q-card-section>
              <div class="text-caption text-grey-6">APROVADAS</div>
              <div class="text-h4 text-weight-bold text-positive">{{ store.approved.length }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat bordered class="stat-card">
            <q-card-section>
              <div class="text-caption text-grey-6">RECEITA MENSAL ESTIMADA</div>
              <div class="text-h5 text-weight-bold" style="color: #0a3d2e">
                {{ formatMzn(store.monthlyRevenue) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Tabs -->
      <q-card flat bordered>
        <q-tabs
          v-model="tab"
          dense
          no-caps
          align="left"
          active-color="dark"
          indicator-color="green-8"
          class="text-grey-7"
        >
          <q-tab name="pendentes" :label="`Pendentes Aprovação (${store.pending.length})`" />
          <q-tab name="aprovadas" :label="`Aprovadas (${store.approved.length})`" />
          <q-tab name="rejeitadas" :label="`Rejeitadas (${store.rejected.length})`" />
          <q-tab name="todas" label="Todas" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated>
          <!-- ══════════ TAB PENDENTES ══════════ -->
          <q-tab-panel name="pendentes" class="q-pa-none">
            <q-table
              flat
              :rows="store.pending"
              :columns="pendingColumns"
              row-key="id"
              :loading="store.loading"
              :pagination="{ rowsPerPage: 10 }"
              no-data-label="Nenhuma empresa pendente de aprovação."
            >
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="actions-cell">
                  <q-btn dense flat round icon="visibility" color="primary" @click="viewDetails(props.row)">
                    <q-tooltip>Ver Detalhes</q-tooltip>
                  </q-btn>
                  <q-btn dense flat round icon="check_circle" color="positive" @click="confirmApprove(props.row)">
                    <q-tooltip>Aprovar</q-tooltip>
                  </q-btn>
                  <q-btn dense flat round icon="cancel" color="negative" @click="promptReject(props.row)">
                    <q-tooltip>Rejeitar</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <!-- ══════════ TAB APROVADAS ══════════ -->
          <q-tab-panel name="aprovadas" class="q-pa-none">
            <q-table
              flat
              :rows="store.approved"
              :columns="approvedColumns"
              row-key="id"
              :loading="store.loading"
              :pagination="{ rowsPerPage: 10 }"
              no-data-label="Nenhuma empresa aprovada."
            >
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="actions-cell">
                  <q-btn dense flat round icon="pause_circle" color="warning" @click="confirmSuspend(props.row)">
                    <q-tooltip>Suspender</q-tooltip>
                  </q-btn>
                  <q-btn dense flat round icon="dashboard" color="primary" @click="viewCompanyDashboard(props.row)">
                    <q-tooltip>Ver Dashboard da Empresa</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <!-- ══════════ TAB REJEITADAS ══════════ -->
          <q-tab-panel name="rejeitadas" class="q-pa-none">
            <q-table
              flat
              :rows="store.rejected"
              :columns="rejectedColumns"
              row-key="id"
              :loading="store.loading"
              :pagination="{ rowsPerPage: 10 }"
              no-data-label="Nenhuma empresa rejeitada."
            >
              <template v-slot:body-cell-rejection_reason="props">
                <q-td :props="props" style="max-width: 300px">
                  {{ props.row.rejection_reason || '—' }}
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <!-- ══════════ TAB TODAS ══════════ -->
          <q-tab-panel name="todas" class="q-pa-none">
            <q-table
              flat
              :rows="store.companies"
              :columns="allColumns"
              row-key="id"
              :loading="store.loading"
              :pagination="{ rowsPerPage: 10 }"
              no-data-label="Nenhuma empresa registada."
            >
              <template v-slot:body-cell-approval_status="props">
                <q-td :props="props">
                  <q-badge :color="statusColor(props.row.approval_status)">
                    {{ props.row.approval_status }}
                  </q-badge>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>

    <!-- ══════════ DIALOG: DETALHES DA EMPRESA ══════════ -->
    <q-dialog v-model="showDetails">
      <q-card style="min-width: 480px; max-width: 92vw">
        <q-card-section class="row items-center" style="background: #0a3d2e; color: white">
          <q-icon name="domain" size="24px" class="q-mr-sm" />
          <div class="text-h6">{{ selected?.companyName }}</div>
          <q-space />
          <q-btn flat round dense icon="close" text-color="white" v-close-popup />
        </q-card-section>
        <q-card-section v-if="selected">
          <div class="detail-grid">
            <div><small class="text-grey-6">NUIT</small><div>{{ selected.companyNuit || selected.nuit || '—' }}</div></div>
            <div><small class="text-grey-6">Plano</small><div>{{ selected.plan || '—' }}</div></div>
            <div><small class="text-grey-6">Telefone Empresa</small><div>{{ selected.companyPhone || selected.phone || '—' }}</div></div>
            <div><small class="text-grey-6">Email Empresa</small><div>{{ selected.companyEmail || selected.email || '—' }}</div></div>
            <div><small class="text-grey-6">Responsável</small><div>{{ selected.companyManager || '—' }}</div></div>
            <div><small class="text-grey-6">Licença BM</small><div>{{ selected.license_number || '—' }}</div></div>
            <div><small class="text-grey-6">Província / Distrito</small><div>{{ selected.provinceId || '—' }} / {{ selected.districtId || '—' }}</div></div>
            <div><small class="text-grey-6">Endereço</small><div>{{ selected.companyAddress || '—' }}</div></div>
            <div><small class="text-grey-6">Data do Pedido</small><div>{{ formatDate(selected.requested_at || selected.createdAt) }}</div></div>
            <div><small class="text-grey-6">Estado</small><div><q-badge :color="statusColor(selected.approval_status)">{{ selected.approval_status }}</q-badge></div></div>
          </div>
        </q-card-section>
        <q-card-actions align="right" v-if="selected?.approval_status === 'PENDENTE'">
          <q-btn flat label="Rejeitar" color="negative" no-caps @click="showDetails = false; promptReject(selected)" />
          <q-btn unelevated label="Aprovar" color="positive" no-caps @click="showDetails = false; confirmApprove(selected)" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ══════════ DIALOG: CONFIRMAÇÃO DE APROVAÇÃO (com plano atribuído) ══════════ -->
    <q-dialog v-model="showApproveConfirm" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center" style="background: #0a3d2e; color: white">
          <q-icon name="check_circle" size="24px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Confirmar Aprovação</div>
        </q-card-section>
        <q-card-section>
          <div class="text-body2 text-grey-8 q-mb-md">
            Ao aprovar, a empresa <b>{{ selected?.companyName }}</b> terá acesso completo. Deseja continuar?
          </div>
          <q-select
            v-model="approvePlanId"
            outlined
            dense
            label="Plano Atribuído"
            emit-value
            map-options
            :options="planStore.plans.map(p => ({ label: `${p.name} — ${Number(p.price_mzn).toLocaleString('pt-MZ')} MZN/mês`, value: p.id }))"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" no-caps v-close-popup />
          <q-btn unelevated label="Confirmar Aprovação" color="positive" no-caps :loading="saving" @click="doApprove" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useSuperAdminStore } from '@/stores/superAdmin'
import { usePlanStore } from '@/stores/plan'

const $q = useQuasar()
const store = useSuperAdminStore()

const tab = ref('pendentes')
const selected = ref(null)
const showDetails = ref(false)
const showApproveConfirm = ref(false)
const approvePlanId = ref(null)
const saving = ref(false)
const planStore = usePlanStore()

const pendingColumns = [
  { name: 'requested_at', label: 'Data Pedido', field: 'requested_at', format: (v) => formatDate(v), align: 'left' },
  { name: 'companyName', label: 'Nome Empresa', field: 'companyName', align: 'left' },
  { name: 'nuit', label: 'NUIT', field: (r) => r.companyNuit || r.nuit, align: 'left' },
  { name: 'manager', label: 'Responsável', field: 'companyManager', align: 'left' },
  { name: 'phone', label: 'Telefone', field: (r) => r.companyPhone || r.phone, align: 'left' },
  { name: 'plan', label: 'Plano', field: 'plan', align: 'left' },
  { name: 'province', label: 'Província', field: 'provinceId', align: 'left' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

const approvedColumns = [
  { name: 'companyName', label: 'Nome', field: 'companyName', align: 'left' },
  { name: 'nuit', label: 'NUIT', field: (r) => r.companyNuit || r.nuit, align: 'left' },
  { name: 'plan', label: 'Plano', field: 'plan', align: 'left' },
  { name: 'approved_at', label: 'Data Aprovação', field: 'approved_at', format: (v) => formatDate(v), align: 'left' },
  { name: 'userCount', label: 'Nº Utilizadores', field: 'userCount', align: 'center' },
  { name: 'bankBalance', label: 'Saldo Bancário', field: 'bankBalance', format: (v) => formatMzn(Number(v) || 0), align: 'right' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

const rejectedColumns = [
  { name: 'companyName', label: 'Nome Empresa', field: 'companyName', align: 'left' },
  { name: 'nuit', label: 'NUIT', field: (r) => r.companyNuit || r.nuit, align: 'left' },
  { name: 'requested_at', label: 'Data Pedido', field: 'requested_at', format: (v) => formatDate(v), align: 'left' },
  { name: 'rejection_reason', label: 'Motivo da Rejeição', field: 'rejection_reason', align: 'left' }
]

const allColumns = [
  { name: 'companyName', label: 'Nome Empresa', field: 'companyName', align: 'left' },
  { name: 'nuit', label: 'NUIT', field: (r) => r.companyNuit || r.nuit, align: 'left' },
  { name: 'plan', label: 'Plano', field: 'plan', align: 'left' },
  { name: 'approval_status', label: 'Estado', field: 'approval_status', align: 'center' },
  { name: 'requested_at', label: 'Data Pedido', field: 'requested_at', format: (v) => formatDate(v), align: 'left' }
]

function formatMzn(value) {
  return `${Number(value || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusColor(status) {
  return {
    PENDENTE: 'orange',
    APROVADA: 'positive',
    REJEITADA: 'negative',
    SUSPENSA: 'grey'
  }[status] || 'grey'
}

function viewDetails(row) {
  selected.value = row
  showDetails.value = true
}

function confirmApprove(row) {
  selected.value = row
  // Plano atribuído — já vem o escolhido, Super Admin pode trocar
  approvePlanId.value = row.plan_id || null
  showApproveConfirm.value = true
}

async function doApprove() {
  saving.value = true
  try {
    const result = await store.approveCompany(selected.value.id, approvePlanId.value)
    if (result.success) {
      $q.notify({ type: 'positive', message: result.message, position: 'top' })
    } else {
      $q.notify({ type: 'negative', message: result.message, position: 'top' })
    }
    showApproveConfirm.value = false
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao aprovar empresa', position: 'top' })
  } finally {
    saving.value = false
  }
}

function promptReject(row) {
  selected.value = row
  $q.dialog({
    title: 'Rejeitar Empresa',
    message: `Informe o motivo da rejeição de "${row.companyName}":`,
    prompt: {
      model: '',
      type: 'text',
      isValid: (v) => v && v.length > 3
    },
    cancel: true,
    persistent: true
  }).onOk(async (reason) => {
    try {
      const result = await store.rejectCompany(row.id, reason)
      if (result.success) {
        $q.notify({ type: 'positive', message: 'Empresa rejeitada.', position: 'top' })
      }
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao rejeitar empresa', position: 'top' })
    }
  })
}

function confirmSuspend(row) {
  selected.value = row
  $q.dialog({
    title: 'Suspender Empresa',
    message: `Suspender o acesso de "${row.companyName}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const result = await store.suspendCompany(row.id)
      if (result.success) {
        $q.notify({ type: 'positive', message: 'Empresa suspensa.', position: 'top' })
      }
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao suspender empresa', position: 'top' })
    }
  })
}

function viewCompanyDashboard(row) {
  // Impersonate: navega para a página da empresa em modo de consulta.
  $q.notify({
    type: 'info',
    message: `Impersonate de "${row.companyName}" será activado numa próxima fase.`,
    position: 'top'
  })
}

onMounted(() => {
  store.fetchCompanies()
  planStore.fetchPlans({ all: true })
})
</script>

<style scoped>
.sa-settings-page,
.super-admin-page {
  background: #f2f7f4;
  min-height: 100vh;
}

.welcome-banner {
  background: linear-gradient(115deg, #0e5c42, #1b7a45);
  color: white;
}

.stat-card {
  border-left: 4px solid #0a3d2e;
}

.stat-card .text-caption {
  letter-spacing: .06em;
}

/* Acções: ícones com espaçamento (0.5cm entre eles) */
.actions-cell {
  display: flex !important;
  flex-direction: row;
  align-items: center;
  gap: 0.5cm;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}

.detail-grid small {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.detail-grid > div > div:last-child {
  font-weight: 500;
}
</style>
