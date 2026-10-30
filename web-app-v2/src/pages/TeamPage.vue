<template>
  <q-page class="team-page q-pa-md">
    <!-- ═══════ CABEÇALHO EXECUTIVO + CONTADORES ═══════ -->
    <q-card flat bordered class="header-card q-mb-md" data-tour="team-header">
      <q-card-section class="q-py-sm">
        <div class="row items-center justify-between q-col-gutter-sm">
          <div class="col-12 col-md">
            <div class="row items-center no-wrap">
              <div class="page-icon q-mr-sm">
                <q-icon name="groups" size="22px" color="primary" />
              </div>
              <div>
                <div class="text-subtitle1 text-weight-bold text-slate-900">Equipa e Parceiros Financiadores</div>
                <div class="text-caption text-grey-7">
                  Gestão integrada de utilizadores internos (Operadores, Gestores, Admins) e parceiros de capital.
                </div>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-auto q-gutter-xs no-wrap">
            <q-btn
              color="primary"
              unelevated
              no-caps
              rounded
              size="sm"
              icon="person_add"
              :label="tab === 'parceiros' ? 'Novo Parceiro Financiador' : 'Novo Membro da Equipa'"
              class="q-px-sm"
              data-tour="team-novo"
              @click="openCreate()"
            />
            <q-btn flat round dense icon="refresh" color="grey-7" size="sm" :loading="loading" @click="load">
              <q-tooltip>Actualizar</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="row q-col-gutter-sm q-py-sm">
        <div v-for="counter in counters" :key="counter.label" class="col-6 col-md-3">
          <div class="counter-tile row items-center no-wrap q-pa-xs">
            <div class="tile-icon q-mr-sm" :style="{ background: counter.bg }">
              <q-icon :name="counter.icon" size="18px" :color="counter.color" />
            </div>
            <div>
              <div class="text-subtitle1 text-weight-bold font-mono text-slate-900">{{ counter.value }}</div>
              <div class="text-caption text-grey-6">{{ counter.label }}</div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════ ABAS & GESTÃO DE ACESSOS ═══════ -->
    <q-card flat bordered class="main-card">
      <q-card-section class="q-py-xs bg-slate-50 border-b">
        <q-tabs
          v-model="tab"
          data-tour="team-tabs"
          dense
          no-caps
          align="left"
          active-color="primary"
          indicator-color="primary"
          class="team-tabs"
        >
          <q-tab name="equipa" icon="badge" :label="`Equipa Interna (${staffUsers.length})`" />
          <q-tab name="parceiros" icon="handshake" :label="`Parceiros Financiadores (${partners.length})`" />
        </q-tabs>
      </q-card-section>

      <!-- Barra de Pesquisa e Filtros -->
      <q-card-section class="row items-center q-col-gutter-sm q-py-sm border-b">
        <div class="col-12 col-sm-5">
          <q-input
            v-model="search"
            dense
            outlined
            clearable
            placeholder="Pesquisar por nome, e-mail ou telefone..."
            input-style="font-size: 12px"
          >
            <template v-slot:prepend><q-icon name="search" size="16px" color="grey-6" /></template>
          </q-input>
        </div>

        <div v-if="tab === 'equipa'" class="col-12 col-sm-4">
          <q-select
            v-model="roleFilter"
            :options="roleFilterOptions"
            dense
            outlined
            emit-value
            map-options
            label="Filtrar por Perfil"
            input-style="font-size: 12px"
          />
        </div>

        <q-space />

        <div class="text-caption text-grey-6">
          Apresentando <strong>{{ filteredRows.length }}</strong> {{ tab === 'parceiros' ? 'parceiro(s)' : 'membro(s)' }}
        </div>
      </q-card-section>

      <!-- Lista de Membros / Parceiros -->
      <q-card-section class="q-pa-md" data-tour="team-list">
        <div v-if="loading" class="text-center q-pa-xl">
          <q-spinner-dots size="40px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-sm">A carregar registos...</div>
        </div>

        <div v-else-if="filteredRows.length === 0" class="text-center q-pa-xl">
          <q-icon name="person_search" size="48px" color="grey-4" />
          <div class="text-subtitle1 text-grey-7 text-weight-medium q-mt-sm">Nenhum registo encontrado</div>
          <div class="text-caption text-grey-5">
            {{ isFiltering ? 'Ajuste os filtros de pesquisa para encontrar utilizadores.' : 'Clique no botão acima para adicionar novo registo.' }}
          </div>
        </div>

        <div v-else class="q-gutter-y-xs">
          <!-- CARD DE UTILIZADOR OU PARCEIRO -->
          <div
            v-for="user in filteredRows"
            :key="`${user.__kind}-${user.id}`"
            class="member-row row items-center justify-between q-pa-sm"
          >
            <!-- Lado Esquerdo: Avatar & Informações Pessoais / Institucionais -->
            <div class="row items-center no-wrap col-12 col-md" style="min-width: 0">
              <q-avatar
                :color="user.__kind === 'partner' ? 'deep-purple-1' : roleBgColor(user)"
                :text-color="user.__kind === 'partner' ? 'deep-purple-9' : roleTextColor(user)"
                size="40px"
                class="q-mr-sm text-weight-bold"
                style="border: 1px solid rgba(0,0,0,0.08)"
              >
                <q-icon v-if="user.__kind === 'partner'" name="handshake" size="20px" />
                <span v-else>{{ getInitials(user.name) }}</span>
              </q-avatar>

              <div class="col" style="min-width: 0">
                <div class="row items-center q-gutter-x-xs no-wrap">
                  <span class="text-weight-bold text-slate-900 ellipsis" style="font-size: 13px">{{ user.name }}</span>
                  <q-chip
                    dense
                    size="10px"
                    class="q-ma-none text-weight-medium"
                    :color="roleBgColor(user)"
                    :text-color="roleTextColor(user)"
                    style="border: 1px solid rgba(0,0,0,0.06)"
                  >
                    {{ roleLabel(user) }}
                  </q-chip>
                </div>

                <div class="text-caption text-grey-6 ellipsis" style="font-size: 11px">
                  <span>{{ user.email }}</span>
                  <span v-if="user.phone" class="q-ml-sm">
                    <q-icon name="phone" size="10px" class="q-mr-xs" />{{ user.phone }}
                  </span>
                </div>

                <!-- Detalhes do Parceiro Financiador (Carteira, Acesso) -->
                <div v-if="user.__kind === 'partner'" class="row items-center q-gutter-x-xs q-mt-xs">
                  <span v-if="user.carteira" class="code-badge font-mono">{{ user.carteira.codigo }}</span>
                  <span v-if="user.carteira" class="text-caption text-grey-7 ellipsis font-weight-medium">
                    {{ user.carteira.nome }}
                  </span>
                  <span v-else class="text-caption text-negative">
                    ⚠️ Sem carteira vinculada
                  </span>

                  <q-badge
                    v-if="user.carteira && Number(user.carteira.portal_ativo)"
                    color="teal-1"
                    text-color="teal-9"
                    label="Portal Activo"
                    style="font-size: 9px; border: 1px solid #b2dfdb"
                  />
                  <q-badge
                    v-else
                    color="grey-2"
                    text-color="grey-7"
                    label="Portal Inactivo"
                    style="font-size: 9px"
                  />
                </div>
              </div>
            </div>

            <!-- Lado Direito: Controlos & Acções -->
            <div class="row items-center q-gutter-x-xs col-12 col-md-auto q-mt-xs q-mt-md-none justify-end">
              <!-- Toggle Estado Activo/Inactivo -->
              <div class="row items-center q-mr-sm">
                <q-toggle
                  :model-value="isActive(user)"
                  dense
                  color="positive"
                  size="sm"
                  @update:model-value="toggleActive(user, $event)"
                >
                  <q-tooltip>{{ isActive(user) ? 'Acesso activo. Clique para desactivar.' : 'Acesso desactivado. Clique para activar.' }}</q-tooltip>
                </q-toggle>
                <span class="text-caption text-grey-6 q-ml-xs" style="font-size: 11px">
                  {{ isActive(user) ? 'Activo' : 'Inactivo' }}
                </span>
              </div>

              <!-- Acções para Staff Interno -->
              <template v-if="user.__kind === 'staff'">
                <q-btn flat round dense size="sm" icon="lock_reset" color="amber-9" @click="resetPassword(user)">
                  <q-tooltip>Repor Senha (123456)</q-tooltip>
                </q-btn>
                <q-btn flat round dense size="sm" icon="send" color="primary" @click="openCredentials(user)">
                  <q-tooltip>Enviar Credenciais de Acesso</q-tooltip>
                </q-btn>
              </template>

              <!-- Acções Comuns -->
              <q-btn flat round dense size="sm" icon="edit" color="grey-7" @click="openEdit(user)">
                <q-tooltip>Editar Registo</q-tooltip>
              </q-btn>
              <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDelete(user)">
                <q-tooltip>Eliminar Acesso</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Formulário único (utilizadores + parceiros) -->
    <UserFormModal
      v-model="formOpen"
      :user="editingUser"
      :default-role="tab === 'parceiros' ? 4 : 3"
      @saved="load"
    />

    <!-- Credenciais (SMS/WhatsApp) — apenas equipa MBRM -->
    <UserCredentialsModal
      v-model="credentialsOpen"
      :user="credentialsUser"
      @sent="load"
    />

    <!-- Confirmação de eliminação -->
    <q-dialog v-model="deleteOpen" persistent>
      <q-card class="dialog-sm">
        <q-card-section class="text-center q-pa-lg">
          <q-avatar icon="warning" color="negative" text-color="white" size="48px" />
          <div class="text-h6 q-mt-md text-weight-bold">Eliminar {{ deleting?.__kind === 'partner' ? 'Parceiro Financiador' : 'Membro da Equipa' }}</div>
          <div class="text-body2 text-grey-7 q-mt-sm">
            Tem a certeza que deseja eliminar <strong>{{ deleting?.name }}</strong>?
          </div>
          <div class="text-caption text-grey-5 q-mt-xs">
            {{ deleting?.__kind === 'partner' ? 'O acesso ao portal do financiador deixará de funcionar imediatamente.' : 'Esta acção removerá as credenciais de autenticação no sistema.' }}
          </div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-md">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
          <q-btn unelevated color="negative" label="Eliminar Definitivamente" :loading="saving" @click="deleteConfirmed" no-caps />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useWalletsStore } from '@/stores/wallets'
import { getInitials } from '@/utils/formatters'
import { logDeleteUser, logResetPassword } from '@/utils/logger'
import UserFormModal from '@/components/team/UserFormModal.vue'
import UserCredentialsModal from '@/components/modals/UserCredentialsModal.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const walletsStore = useWalletsStore()

// Sincronização da aba com URL query: ?tab=parceiros ou ?tab=equipa
const tab = ref(route.query.tab === 'parceiros' ? 'parceiros' : 'equipa')

watch(tab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } }).catch(() => {})
})

watch(() => route.query.tab, (val) => {
  const next = val === 'parceiros' ? 'parceiros' : 'equipa'
  if (next !== tab.value) tab.value = next
})

const search = ref('')
const roleFilter = ref('todos')
const formOpen = ref(false)
const editingUser = ref(null)
const deleteOpen = ref(false)
const deleting = ref(null)
const credentialsOpen = ref(false)
const credentialsUser = ref({})
const loading = ref(false)
const saving = ref(false)

const partners = ref([])

const staffUsers = computed(() =>
  (settingsStore.users || [])
    .filter((user) => Number(user.userRole) !== 4)
    .map((user) => ({ ...user, __kind: 'staff' }))
)

const partnerRows = computed(() => partners.value.map((user) => ({ ...user, __kind: 'partner' })))

const counters = computed(() => [
  {
    label: 'Admins & Direcção',
    value: (settingsStore.users || []).filter((user) => [0, 1].includes(Number(user.userRole))).length,
    icon: 'shield',
    color: 'negative',
    bg: '#fef2f2'
  },
  {
    label: 'Gestores de Crédito',
    value: (settingsStore.users || []).filter((user) => Number(user.userRole) === 3).length,
    icon: 'support_agent',
    color: 'teal-8',
    bg: '#f0fdfa'
  },
  {
    label: 'Operadores de Caixa',
    value: (settingsStore.users || []).filter((user) => Number(user.userRole) === 2).length,
    icon: 'badge',
    color: 'primary',
    bg: '#eff6ff'
  },
  {
    label: 'Parceiros Financiadores',
    value: partners.value.length,
    icon: 'handshake',
    color: 'deep-purple-8',
    bg: '#f5f3ff'
  }
])

const roleFilterOptions = computed(() => {
  const base = [
    { label: 'Todos os perfis', value: 'todos' },
    { label: 'Administradores', value: 1 },
    { label: 'Gestores de crédito', value: 3 },
    { label: 'Operadores de balcão', value: 2 }
  ]
  if (Number(authStore.userRole) === 0) base.splice(1, 0, { label: 'Super Admins', value: 0 })
  return base
})

const isFiltering = computed(() => !!search.value || (tab.value === 'equipa' && roleFilter.value !== 'todos'))

const filteredRows = computed(() => {
  const rows = tab.value === 'parceiros' ? partnerRows.value : staffUsers.value
  const term = search.value.trim().toLowerCase()
  return rows.filter((user) => {
    if (tab.value === 'equipa' && roleFilter.value !== 'todos' && Number(user.userRole) !== Number(roleFilter.value)) {
      return false
    }
    if (!term) return true
    return [user.name, user.email, user.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
})

function roleLabel(user) {
  const labels = {
    0: 'Super Admin',
    1: 'Administrador',
    2: 'Operador de Caixa',
    3: 'Gestor de Crédito',
    4: 'Parceiro Financiador'
  }
  return labels[Number(user.userRole)] || 'Operador'
}

function roleBgColor(user) {
  if (user.__kind === 'partner') return 'deep-purple-1'
  switch (Number(user.userRole)) {
    case 0: return 'grey-3'
    case 1: return 'red-1'
    case 2: return 'blue-1'
    case 3: return 'teal-1'
    default: return 'grey-2'
  }
}

function roleTextColor(user) {
  if (user.__kind === 'partner') return 'deep-purple-9'
  switch (Number(user.userRole)) {
    case 0: return 'grey-9'
    case 1: return 'red-9'
    case 2: return 'blue-9'
    case 3: return 'teal-9'
    default: return 'grey-8'
  }
}

const isActive = (user) => Number(user.__kind === 'partner' ? user.is_active : user.status) !== 0

async function load() {
  loading.value = true
  try {
    await settingsStore.fetchUsers(authStore.companyId)
    partners.value = await walletsStore.fetchPartnerUsers(authStore.companyId)
    if (walletsStore.wallets.length === 0) await walletsStore.fetchWallets(authStore.companyId)
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao carregar equipa e parceiros', position: 'top' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingUser.value = null
  formOpen.value = true
}

function openEdit(user) {
  editingUser.value = user
  formOpen.value = true
}

function openCredentials(user) {
  credentialsUser.value = user
  credentialsOpen.value = true
}

function confirmDelete(user) {
  deleting.value = user
  deleteOpen.value = true
}

async function deleteConfirmed() {
  saving.value = true
  try {
    await settingsStore.deleteUser(deleting.value.id)
    logDeleteUser(deleting.value.name)
    $q.notify({ type: 'positive', message: 'Acesso eliminado com sucesso', position: 'top' })
    deleteOpen.value = false
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao eliminar registo', position: 'top' })
  } finally {
    saving.value = false
  }
}

async function toggleActive(user, value) {
  try {
    if (user.__kind === 'partner') {
      const data = await walletsStore.updatePartner(user.id, { is_active: value })
      if (data?.success === false) {
        $q.notify({ type: 'negative', message: data.message, position: 'top' })
        return
      }
      user.is_active = value ? 1 : 0
      $q.notify({ type: 'positive', message: value ? 'Acesso ao portal activado' : 'Acesso ao portal desactivado', position: 'top', timeout: 1500 })
      return
    }
    await settingsStore.updateUser(user.id, { status: value ? 1 : 0 })
    user.status = value ? 1 : 0
    $q.notify({ type: 'positive', message: value ? 'Conta activada' : 'Conta desactivada', position: 'top', timeout: 1500 })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao alterar o estado do acesso', position: 'top' })
    await load()
  }
}

function resetPassword(user) {
  $q.dialog({
    title: 'Repor Senha Padrão',
    message: `Deseja redefinir a palavra-passe de ${user.name} para "123456"?`,
    cancel: true,
    persistent: true,
    ok: { label: 'Repor Senha', color: 'amber-9', unelevated: true }
  }).onOk(async () => {
    try {
      await settingsStore.updateUser(user.id, { password: '123456' })
      logResetPassword(user.name)
      $q.notify({ type: 'positive', message: 'Senha redefinida com sucesso para 123456', position: 'top' })
    } catch {
      $q.notify({ type: 'negative', message: 'Erro ao repor a senha', position: 'top' })
    }
  })
}

onMounted(load)
</script>

<style lang="scss" scoped>
.team-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}

.header-card, .main-card {
  border-radius: 12px;
  background: #ffffff;
  border-color: #e2e8f0;
}

.page-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.tile-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-row {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  transition: all 0.15s ease;
  &:hover {
    background-color: #f8fafc;
    border-color: #cbd5e1;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  }
}

.code-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 6px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #1e293b;
  font-size: 11px;
  font-weight: 700;
}

.border-b {
  border-bottom: 1px solid #e2e8f0;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.text-slate-900 { color: #0f172a; }
.text-slate-800 { color: #1e293b; }

.dialog-sm { width: 420px; max-width: 95vw; border-radius: 14px; }

body.body--dark {
  .team-page { background: #0f172a; }
  .header-card, .main-card, .member-row {
    background: #1e293b;
    border-color: #334155;
  }
  .text-slate-900 { color: #f8fafc; }
  .code-badge {
    background: #334155;
    border-color: #475569;
    color: #f8fafc;
  }
}
</style>
