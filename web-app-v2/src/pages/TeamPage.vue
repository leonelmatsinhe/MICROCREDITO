<template>
  <q-page class="team-page q-pa-md">
    <!-- ═══════ CABEÇALHO + CONTADORES ═══════ -->
    <q-card flat class="glass-card q-mb-md">
      <q-card-section class="q-py-sm">
        <div class="row items-center q-col-gutter-sm">
          <div class="col-12 col-md">
            <div class="row items-center no-wrap">
              <div class="page-icon q-mr-sm"><q-icon name="groups" size="20px" color="white" /></div>
              <div>
                <div class="text-subtitle1 text-weight-bold">Equipa e Parceiros</div>
                <div class="text-caption text-grey-6">
                  Utilizadores MBRM (Admin, Gestor, Operador) e parceiros financiadores num só lugar.
                </div>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-auto q-gutter-xs no-wrap">
            <q-btn color="primary" unelevated no-caps rounded icon="person_add" label="Novo Membro" @click="openCreate()" />
            <q-btn flat round icon="refresh" color="primary" :loading="loading" @click="load">
              <q-tooltip>Actualizar</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="row q-col-gutter-md q-py-md">
        <div v-for="counter in counters" :key="counter.label" class="col-6 col-md-3">
          <div class="row items-center no-wrap">
            <div class="tile-icon q-mr-sm" :style="{ background: counter.bg }">
              <q-icon :name="counter.icon" size="18px" :color="counter.color" />
            </div>
            <div>
              <div class="text-subtitle1 text-weight-bold">{{ counter.value }}</div>
              <div class="text-caption text-grey-6">{{ counter.label }}</div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════ ABAS ═══════ -->
    <q-card flat class="glass-card">
      <q-card-section class="q-py-none">
        <q-tabs
          v-model="tab"
          dense
          no-caps
          align="left"
          active-color="primary"
          indicator-color="primary"
          class="team-tabs"
        >
          <q-tab name="equipa" icon="badge" :label="`Equipa MBRM (${staffUsers.length})`" />
          <q-tab name="parceiros" icon="handshake" :label="`Parceiros Financiadores (${partners.length})`" />
        </q-tabs>
      </q-card-section>
      <q-separator />

      <!-- Pesquisa + filtro -->
      <q-card-section class="row items-center q-col-gutter-sm q-py-sm">
        <div class="col-12 col-sm-5">
          <q-input v-model="search" dense outlined clearable placeholder="Pesquisar por nome, e-mail ou telefone" input-style="font-size: 13px">
            <template v-slot:prepend><q-icon name="search" size="16px" color="grey-5" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-select
            v-model="roleFilter"
            :options="roleFilterOptions"
            dense outlined emit-value map-options
            label="Perfil"
            input-style="font-size: 13px"
          />
        </div>
        <q-space />
        <div class="text-caption text-grey-6">{{ filteredRows.length }} membro(s)</div>
      </q-card-section>

      <!-- Lista -->
      <q-card-section class="q-pt-none">
        <div v-if="loading" class="text-center q-pa-xl">
          <q-spinner-dots size="40px" color="primary" />
        </div>

        <div v-else-if="filteredRows.length === 0" class="text-center q-pa-xl">
          <q-icon name="person_search" size="48px" color="grey-4" />
          <div class="text-subtitle1 text-grey-6 q-mt-sm">Nenhum membro encontrado</div>
          <div class="text-caption text-grey-5">Ajuste a pesquisa/filtro ou crie um novo membro.</div>
        </div>

        <div v-else class="q-gutter-sm">
          <q-card v-for="user in filteredRows" :key="`${user.__kind}-${user.id}`" flat bordered class="member-card">
            <q-card-section class="q-py-sm">
              <div class="row items-center no-wrap">
                <q-avatar :color="roleColor(user)" text-color="white" size="42px" class="q-mr-md">
                  {{ getInitials(user.name) }}
                </q-avatar>

                <div class="col" style="min-width: 0">
                  <div class="text-weight-medium ellipsis" style="font-size: 14px">{{ user.name }}</div>
                  <div class="text-caption text-grey-6 ellipsis" style="font-size: 12px">
                    {{ user.email }}
                    <span v-if="user.phone" class="q-ml-sm">
                      <q-icon name="phone" size="10px" class="q-mr-xs" />{{ user.phone }}
                    </span>
                  </div>
                  <div v-if="user.__kind === 'partner'" class="row items-center q-gutter-xs q-mt-xs">
                    <q-badge v-if="user.carteira" :color="user.carteira.cor_badge || 'blue'" :label="user.carteira.codigo" />
                    <span v-if="user.carteira" class="text-caption text-grey-6 ellipsis">{{ user.carteira.nome }}</span>
                    <span v-else class="text-caption text-negative">Sem carteira — corrija o acesso</span>
                  </div>
                </div>

                <q-chip :color="roleColor(user)" text-color="white" size="sm" dense class="q-mr-sm">
                  {{ roleLabel(user) }}
                </q-chip>

                <q-chip
                  v-if="user.__kind === 'partner'"
                  :color="user.carteira && Number(user.carteira.portal_ativo) ? 'green' : 'grey'"
                  text-color="white" dense size="sm" class="q-mr-sm"
                >
                  {{ user.carteira && Number(user.carteira.portal_ativo) ? 'Portal activo' : 'Portal inactivo' }}
                </q-chip>

                <q-toggle
                  :model-value="isActive(user)"
                  dense color="positive"
                  class="q-mr-sm"
                  @update:model-value="toggleActive(user, $event)"
                >
                  <q-tooltip>{{ isActive(user) ? 'Desactivar acesso' : 'Activar acesso' }}</q-tooltip>
                </q-toggle>

                <q-btn v-if="user.__kind === 'staff'" flat round dense size="sm" icon="lock_reset" color="warning" @click="resetPassword(user)">
                  <q-tooltip>Repor senha (123456)</q-tooltip>
                </q-btn>
                <q-btn v-if="user.__kind === 'staff'" flat round dense size="sm" icon="lock_open" color="primary" @click="openCredentials(user)">
                  <q-tooltip>Enviar credenciais</q-tooltip>
                </q-btn>
                <q-btn flat round dense size="sm" icon="edit" color="grey-7" @click="openEdit(user)">
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
                <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDelete(user)">
                  <q-tooltip>Eliminar</q-tooltip>
                </q-btn>
              </div>
            </q-card-section>
          </q-card>
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
          <div class="text-h6 q-mt-md">Eliminar {{ deleting?.__kind === 'partner' ? 'Parceiro' : 'Utilizador' }}</div>
          <div class="text-body2 text-grey-6 q-mt-sm">
            Tem a certeza que deseja eliminar <strong>{{ deleting?.name }}</strong>?
          </div>
          <div class="text-caption text-grey-5 q-mt-xs">
            {{ deleting?.__kind === 'partner' ? 'O acesso ao portal do financiador deixa de funcionar.' : 'Esta acção não pode ser desfeita.' }}
          </div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup no-caps />
          <q-btn unelevated rounded label="Eliminar" color="negative" :loading="saving" @click="deleteConfirmed" no-caps />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useWalletsStore } from '@/stores/wallets'
import { getInitials } from '@/utils/formatters'
import { logDeleteUser, logResetPassword } from '@/utils/logger'
import UserFormModal from '@/components/team/UserFormModal.vue'
import UserCredentialsModal from '@/components/modals/UserCredentialsModal.vue'

/**
 * EQUIPA E PARCEIROS — página única (substitui Configurações > Utilizadores e
 * a página separada de Parceiros Financiadores). O formulário é o mesmo para
 * todos os perfis; escolher "Parceiro Financiador" revela a carteira.
 */
const $q = useQuasar()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const walletsStore = useWalletsStore()

const tab = ref('equipa')
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

// Parceiros financiadores (perfil 4) — lista própria do endpoint de carteiras.
const partners = ref([])

const staffUsers = computed(() =>
  (settingsStore.users || [])
    .filter((user) => Number(user.userRole) !== 4)
    .map((user) => ({ ...user, __kind: 'staff' }))
)

const partnerRows = computed(() => partners.value.map((user) => ({ ...user, __kind: 'partner' })))

const counters = computed(() => [
  {
    label: 'Admins',
    value: (settingsStore.users || []).filter((user) => [0, 1].includes(Number(user.userRole))).length,
    icon: 'shield', color: 'negative', bg: 'rgba(239,68,68,0.12)'
  },
  {
    label: 'Gestores',
    value: (settingsStore.users || []).filter((user) => Number(user.userRole) === 3).length,
    icon: 'support_agent', color: 'teal', bg: 'rgba(13,148,136,0.12)'
  },
  {
    label: 'Operadores',
    value: (settingsStore.users || []).filter((user) => Number(user.userRole) === 2).length,
    icon: 'badge', color: 'blue', bg: 'rgba(37,99,235,0.12)'
  },
  {
    label: 'Parceiros financiadores',
    value: partners.value.length,
    icon: 'handshake', color: 'deep-purple', bg: 'rgba(124,58,237,0.12)'
  }
])

const roleFilterOptions = computed(() => {
  const base = [
    { label: 'Todos os perfis', value: 'todos' },
    { label: 'Administradores', value: 1 },
    { label: 'Gestores de crédito', value: 3 },
    { label: 'Operadores', value: 2 },
    { label: 'Parceiros financiadores', value: 4 }
  ]
  if (Number(authStore.userRole) === 0) base.splice(1, 0, { label: 'Super Admins', value: 0 })
  return base
})

const filteredRows = computed(() => {
  const rows = tab.value === 'parceiros' ? partnerRows.value : staffUsers.value
  const term = search.value.trim().toLowerCase()
  return rows.filter((user) => {
    if (roleFilter.value !== 'todos' && Number(user.userRole) !== Number(roleFilter.value)) return false
    if (!term) return true
    return [user.name, user.email, user.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
})

function roleLabel(user) {
  const labels = { 0: 'Super Admin', 1: 'Admin', 2: 'Operador', 3: 'Gestor', 4: 'Parceiro Financiador' }
  return labels[Number(user.userRole)] || 'Operador'
}

function roleColor(user) {
  if (user.__kind === 'partner') {
    const cor = user.carteira?.cor_badge
    return cor || 'deep-purple'
  }
  return { 0: 'grey-9', 1: 'negative', 2: 'blue', 3: 'teal' }[Number(user.userRole)] || 'grey'
}

const isActive = (user) => Number(user.__kind === 'partner' ? user.is_active : user.status) !== 0

async function load() {
  loading.value = true
  try {
    await settingsStore.fetchUsers(authStore.companyId)
    partners.value = await walletsStore.fetchPartnerUsers(authStore.companyId)
    if (walletsStore.wallets.length === 0) await walletsStore.fetchWallets(authStore.companyId)
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao carregar a equipa', position: 'top' })
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
    $q.notify({ type: 'positive', message: 'Acesso eliminado', position: 'top' })
    deleteOpen.value = false
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao eliminar', position: 'top' })
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
      $q.notify({ type: 'positive', message: value ? 'Acesso activado' : 'Acesso desactivado', position: 'top', timeout: 1500 })
      return
    }
    await settingsStore.updateUser(user.id, { status: value ? 1 : 0 })
    user.status = value ? 1 : 0
    $q.notify({ type: 'positive', message: value ? 'Conta activada' : 'Conta desactivada', position: 'top', timeout: 1500 })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao alterar o acesso', position: 'top' })
    await load()
  }
}

function resetPassword(user) {
  $q.dialog({
    title: 'Repor Senha',
    message: `Repor a senha de ${user.name} para "123456"?`,
    cancel: true,
    persistent: true,
    ok: { label: 'Repor', color: 'warning' }
  }).onOk(async () => {
    try {
      await settingsStore.updateUser(user.id, { password: '123456' })
      logResetPassword(user.name)
      $q.notify({ type: 'positive', message: 'Senha reposta para 123456', position: 'top' })
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

.glass-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.page-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $primary, #16a34a);
  box-shadow: 0 6px 16px rgba($primary, 0.25);
}

.tile-icon {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.team-tabs {
  background: transparent;
}

.member-card {
  border-radius: 14px;
  transition: box-shadow 0.18s ease;

  &:hover {
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  }
}

.dialog-sm { width: 400px; max-width: 95vw; border-radius: 18px; }

body.body--dark {
  .team-page { background: #1a1a2e; }
  .glass-card { background: rgba(30, 41, 59, 0.72); border-color: rgba(255, 255, 255, 0.06); }
}
</style>
