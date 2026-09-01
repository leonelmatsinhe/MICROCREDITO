<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Utilizadores</div>
        <div class="text-caption text-grey-5">Gerir a equipa e permissões de acesso</div>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="person_add" label="Novo Utilizador" unelevated no-caps rounded size="sm" @click="openCreate" />
      </div>
    </div>

    <!-- Stats -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col">
        <q-card flat bordered style="border-radius: 10px">
          <q-card-section class="q-py-sm q-px-md row items-center">
            <q-avatar color="negative" text-color="white" size="32px" class="q-mr-sm">
              <q-icon name="shield" size="16px" />
            </q-avatar>
            <div>
              <div class="text-weight-bold" style="font-size: 18px">{{ adminCount }}</div>
              <div class="text-caption text-grey-5" style="font-size: 10px">Admins</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col">
        <q-card flat bordered style="border-radius: 10px">
          <q-card-section class="q-py-sm q-px-md row items-center">
            <q-avatar color="teal" text-color="white" size="32px" class="q-mr-sm">
              <q-icon name="support_agent" size="16px" />
            </q-avatar>
            <div>
              <div class="text-weight-bold" style="font-size: 18px">{{ gestorCount }}</div>
              <div class="text-caption text-grey-5" style="font-size: 10px">Gestores</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <!-- Users List -->
    <div v-else class="q-gutter-sm">
      <q-card
        v-for="user in users"
        :key="user.id"
        flat
        bordered
        style="border-radius: 10px"
        class="user-card"
      >
        <q-card-section class="q-py-sm">
          <div class="row items-center">
            <q-avatar :color="getRoleColor(user.userRole)" text-color="white" size="40px" class="q-mr-md">
              {{ getInitials(user.name) }}
            </q-avatar>

            <div class="col">
              <div class="text-weight-medium" style="font-size: 14px">{{ user.name }}</div>
              <div class="text-caption text-grey-5" style="font-size: 12px">
                {{ user.email }}
                <span v-if="user.phone" class="q-ml-sm">
                  <q-icon name="phone" size="10px" class="q-mr-xs" />
                  {{ user.phone }}
                </span>
              </div>
            </div>

            <q-chip
              :color="getRoleColor(user.userRole)"
              text-color="white"
              size="sm"
              dense
              class="q-mr-sm"
            >
              {{ getRoleLabel(user.userRole) }}
            </q-chip>

            <q-badge :color="user.status === 0 ? 'grey' : 'positive'" :label="user.status === 0 ? 'Inactivo' : 'Activo'" class="q-mr-sm" />

            <q-btn flat round dense icon="lock_reset" size="sm" color="warning" @click="resetPassword(user)" v-if="isAdmin">
              <q-tooltip>Resetar Senha</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="edit" size="sm" color="grey-7" @click="openEdit(user)" v-if="isAdmin">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" size="sm" color="negative" @click="confirmDelete(user)" v-if="isAdmin">
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </div>
        </q-card-section>
      </q-card>

      <!-- Empty State -->
      <div v-if="users.length === 0" class="text-center q-pa-xl">
        <q-icon name="people_outline" size="48px" color="grey-4" />
        <div class="text-subtitle1 text-grey-6 q-mt-sm">Nenhum utilizador registado</div>
      </div>
    </div>

    <!-- Form Dialog -->
    <q-dialog v-model="showForm" persistent position="right" full-height>
      <q-card style="width: 420px; max-width: 90vw; border-radius: 12px 0 0 12px">
        <q-card-section class="bg-primary text-white row items-center" style="border-radius: 12px 0 0 0">
          <q-icon :name="editingUser ? 'edit' : 'person_add'" size="20px" class="q-mr-sm" />
          <div class="text-h6">{{ editingUser ? 'Editar Utilizador' : 'Novo Utilizador' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeForm" />
        </q-card-section>

        <q-card-section style="max-height: calc(100vh - 140px); overflow-y: auto">
          <q-form @submit="saveUser" class="q-gutter-md">
            <q-input v-model="form.name" dense outlined label="Nome completo *" :rules="[val => !!val || 'Obrigatório']" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="person" size="16px" color="grey-5" /></template>
            </q-input>

            <q-input v-model="form.email" dense outlined :label="editingUser ? 'Email (não alterável)' : 'Email *'" type="email" :disable="!!editingUser" :rules="editingUser ? [] : [val => !!val || 'Obrigatório']" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="email" size="16px" color="grey-5" /></template>
            </q-input>

            <q-input v-model="form.phone" dense outlined label="Telefone" mask="#############" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="phone" size="16px" color="grey-5" /></template>
            </q-input>

            <q-select v-model="form.userRole" dense outlined label="Perfil de acesso *" :options="roleOptions" emit-value map-options :rules="[val => val !== null || 'Obrigatório']" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="admin_panel_settings" size="16px" color="grey-5" /></template>
            </q-select>

            <q-input v-if="!editingUser" v-model="form.password" dense outlined label="Senha inicial *" :type="showPassword ? 'text' : 'password'" :rules="[val => !!val || 'Obrigatório']" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="lock" size="16px" color="grey-5" /></template>
              <template v-slot:append>
                <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPassword = !showPassword" />
              </template>
            </q-input>

            <q-toggle v-model="form.status" :true-value="1" :false-value="0" label="Conta activa" color="positive" />

            <div class="text-caption text-grey-5" v-if="!editingUser" style="font-size: 11px">
              <q-icon name="info" size="12px" class="q-mr-xs" />
              A senha inicial é "123456". O utilizador deve alterá-la no primeiro login.
            </div>

            <div class="row justify-end q-gutter-sm q-mt-lg">
              <q-btn flat label="Cancelar" color="grey" @click="closeForm" no-caps />
              <q-btn type="submit" unelevated :label="editingUser ? 'Salvar' : 'Criar Utilizador'" color="primary" :loading="saving" no-caps rounded />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="border-radius: 12px; min-width: 320px">
        <q-card-section class="text-center q-pa-lg">
          <q-avatar icon="warning" color="negative" text-color="white" size="48px" />
          <div class="text-h6 q-mt-md">Eliminar Utilizador</div>
          <div class="text-body2 text-grey-6 q-mt-sm">
            Tem certeza que deseja eliminar <strong>{{ deletingUser?.name }}</strong>?
          </div>
          <div class="text-caption text-grey-5 q-mt-xs">Esta acção não pode ser desfeita.</div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup no-caps />
          <q-btn unelevated label="Eliminar" color="negative" :loading="saving" @click="deleteUserConfirmed" v-close-popup no-caps rounded />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { getInitials } from '@/utils/formatters'
import { logCreateUser, logEditUser, logDeleteUser, logResetPassword } from '@/utils/logger'

const $q = useQuasar()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const loading = computed(() => settingsStore.loadingUsers)
const saving = computed(() => settingsStore.saving)
const users = computed(() => settingsStore.users)
const adminCount = computed(() => settingsStore.adminCount)
const gestorCount = computed(() => settingsStore.gestorCount)
const isAdmin = computed(() => authStore.userRole === 1)

const showForm = ref(false)
const showDeleteConfirm = ref(false)
const showPassword = ref(false)
const editingUser = ref(null)
const deletingUser = ref(null)

const form = ref({ name: '', email: '', phone: '', userRole: 3, password: '', status: 1 })

const roleOptions = [
  { label: 'Administrador', value: 1 },
  { label: 'Gestor de Crédito', value: 3 }
]

function getRoleColor(role) {
  return { 1: 'negative', 2: 'blue', 3: 'teal' }[role] || 'grey'
}

function getRoleLabel(role) {
  return { 1: 'Admin', 3: 'Gestor' }[role] || 'Operador'
}

function openCreate() {
  editingUser.value = null
  form.value = { name: '', email: '', phone: '', userRole: 2, password: '', status: 1 }
  showPassword.value = false
  showForm.value = true
}

function openEdit(user) {
  editingUser.value = user
  form.value = { name: user.name, email: user.email, phone: user.phone || '', userRole: user.userRole, password: '', status: user.status }
  showPassword.value = false
  showForm.value = true
}

function closeForm() { showForm.value = false; editingUser.value = null }
function confirmDelete(user) { deletingUser.value = user; showDeleteConfirm.value = true }

async function resetPassword(user) {
  $q.dialog({
    title: 'Resetar Senha',
    message: `Resetar a senha de ${user.name} para "123456"?`,
    cancel: true,
    persistent: true,
    ok: { label: 'Resetar', color: 'warning' }
  }).onOk(async () => {
    try {
      await settingsStore.updateUser(user.id, { password: '123456' })
      logResetPassword(user.name)
      $q.notify({ type: 'positive', message: 'Senha resetada para 123456', position: 'top' })
    } catch {
      $q.notify({ type: 'negative', message: 'Erro ao resetar senha', position: 'top' })
    }
  })
}

async function saveUser() {
  try {
    if (editingUser.value) {
      const payload = { ...form.value }; delete payload.password
      await settingsStore.updateUser(editingUser.value.id, payload)
      logEditUser(form.value.name)
      $q.notify({ type: 'positive', message: 'Utilizador atualizado', position: 'top' })
    } else {
      await settingsStore.createUser({ ...form.value, companyId: authStore.companyId })
      logCreateUser(form.value.name)
      $q.notify({ type: 'positive', message: 'Utilizador criado', position: 'top' })
    }
    closeForm()
    settingsStore.fetchUsers(authStore.companyId)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao guardar', position: 'top' })
  }
}

async function deleteUserConfirmed() {
  try {
    await settingsStore.deleteUser(deletingUser.value.id)
    logDeleteUser(deletingUser.value.name)
    $q.notify({ type: 'positive', message: 'Utilizador eliminado', position: 'top' })
    settingsStore.fetchUsers(authStore.companyId)
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao eliminar', position: 'top' })
  }
}

onMounted(() => { settingsStore.fetchUsers(authStore.companyId) })
</script>

<style lang="scss" scoped>
.user-card {
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}
</style>
