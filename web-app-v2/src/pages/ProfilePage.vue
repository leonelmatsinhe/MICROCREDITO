<template>
  <div class="q-pa-md">
    <div class="row q-col-gutter-md">
      <!-- Left: Profile Info -->
      <div class="col-12 col-md-8">
        <!-- Personal Info - Admin only can edit profile -->
        <q-card flat bordered class="profile-card q-mb-md" v-if="isAdmin">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">
              <q-icon name="person" size="18px" class="q-mr-xs" />
              Dados Pessoais
            </div>

            <q-form @submit="saveProfile" class="q-gutter-sm">
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.name" dense outlined label="Nome *" :rules="[val => !!val || 'Obrigatório']" input-style="font-size: 13px" />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.email" dense outlined label="Email *" type="email" disable input-style="font-size: 13px" />
                </div>
              </div>

              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.phone" dense outlined label="Telefone" mask="#############" input-style="font-size: 13px" />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input :model-value="userRoleLabel" dense outlined label="Perfil" disable input-style="font-size: 13px" />
                </div>
              </div>

              <div class="row justify-end q-mt-sm">
                <q-btn unelevated label="Salvar Alterações" color="primary" type="submit" :loading="saving" icon="save" no-caps rounded size="sm" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Gestor: Show info but no edit -->
        <q-card flat bordered class="profile-card q-mb-md" v-else>
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">
              <q-icon name="person" size="18px" class="q-mr-xs" />
              Dados Pessoais
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input :model-value="form.name" dense outlined label="Nome" disable input-style="font-size: 13px" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input :model-value="form.email" dense outlined label="Email" disable input-style="font-size: 13px" />
              </div>
            </div>

            <div class="row q-col-gutter-sm q-mt-xs">
              <div class="col-12 col-sm-6">
                <q-input :model-value="form.phone" dense outlined label="Telefone" disable input-style="font-size: 13px" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input :model-value="userRoleLabel" dense outlined label="Perfil" disable input-style="font-size: 13px" />
              </div>
            </div>

            <div class="text-caption text-grey-5 q-mt-md" style="font-size: 11px">
              <q-icon name="info" size="12px" class="q-mr-xs" />
              Contacte o Administrador para alterar os seus dados pessoais.
            </div>
          </q-card-section>
        </q-card>

        <!-- Password Change -->
        <q-card flat bordered class="profile-card">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">
              <q-icon name="lock" size="18px" class="q-mr-xs" />
              Alterar Senha
            </div>

            <q-form @submit="changePassword" class="q-gutter-sm">
              <q-input
                v-model="passwordForm.currentPassword"
                dense
                outlined
                label="Senha Actual *"
                :type="showCurrent ? 'text' : 'password'"
                :rules="[val => !!val || 'Obrigatório']"
                input-style="font-size: 13px"
              >
                <template v-slot:prepend><q-icon name="lock" size="14px" color="grey-5" /></template>
                <template v-slot:append>
                  <q-icon :name="showCurrent ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showCurrent = !showCurrent" />
                </template>
              </q-input>

              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="passwordForm.newPassword"
                    dense
                    outlined
                    label="Nova Senha *"
                    :type="showNew ? 'text' : 'password'"
                    :rules="[val => !!val || 'Obrigatório', val => val.length >= 6 || 'Mínimo 6 caracteres']"
                    input-style="font-size: 13px"
                  >
                    <template v-slot:prepend><q-icon name="lock_open" size="14px" color="grey-5" /></template>
                    <template v-slot:append>
                      <q-icon :name="showNew ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showNew = !showNew" />
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="passwordForm.confirmPassword"
                    dense
                    outlined
                    label="Confirmar Senha *"
                    :type="showConfirm ? 'text' : 'password'"
                    :rules="[val => !!val || 'Obrigatório', val => val === passwordForm.newPassword || 'As senhas não coincidem']"
                    input-style="font-size: 13px"
                  >
                    <template v-slot:prepend><q-icon name="lock_reset" size="14px" color="grey-5" /></template>
                    <template v-slot:append>
                      <q-icon :name="showConfirm ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showConfirm = !showConfirm" />
                    </template>
                  </q-input>
                </div>
              </div>

              <div class="row justify-end q-mt-sm">
                <q-btn unelevated label="Alterar Senha" color="warning" type="submit" :loading="changingPassword" icon="lock" no-caps rounded size="sm" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Right: Quick Stats -->
      <div class="col-12 col-md-4">
        <q-card flat bordered class="profile-card q-mb-md">
          <q-card-section class="text-center">
            <q-avatar :color="roleColor" text-color="white" size="72px" class="q-mb-md">
              <span style="font-size: 28px">{{ userInitials }}</span>
            </q-avatar>
            <div class="text-h6 text-weight-bold">{{ authStore.userName }}</div>
            <div class="text-caption text-grey-5">{{ form.email }}</div>
            <q-badge :color="roleColor" :label="userRoleLabel" class="q-mt-sm" />
          </q-card-section>
        </q-card>

        <q-card flat bordered class="profile-card">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-sm">Actividade</div>
            <q-list separator>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="login" color="positive" size="18px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label caption style="font-size: 11px">Último login</q-item-label>
                  <q-item-label style="font-size: 13px">Hoje</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="business" color="blue" size="18px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label caption style="font-size: 11px">Empresa ID</q-item-label>
                  <q-item-label style="font-size: 13px">{{ authStore.companyId || '—' }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
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

const saving = ref(false)
const changingPassword = ref(false)
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const isAdmin = computed(() => authStore.userRole === 1)

const userInitials = computed(() => getInitials(authStore.userName))

const userRoleLabel = computed(() => {
  const roles = { 0: 'Operador', 1: 'Administrador', 2: 'Operador', 3: 'Gestor de Crédito' }
  return roles[authStore.userRole] || 'Utilizador'
})

const roleColor = computed(() => {
  const colors = { 1: 'negative', 2: 'blue', 3: 'teal' }
  return colors[authStore.userRole] || 'grey'
})

const form = ref({
  name: '',
  email: '',
  phone: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

async function saveProfile() {
  saving.value = true
  try {
    await api.put(`/api/users/${authStore.user.id}`, {
      name: form.value.name,
      phone: form.value.phone
    })
    authStore.user.name = form.value.name
    localStorage.setItem('user', JSON.stringify(authStore.user))
    $q.notify({ type: 'positive', message: 'Perfil atualizado com sucesso', position: 'top' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao guardar', position: 'top' })
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    $q.notify({ type: 'warning', message: 'As senhas não coincidem', position: 'top' })
    return
  }

  changingPassword.value = true
  try {
    const { data } = await api.post('/api/updatePassword', {
      userId: authStore.user.id,
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: 'Senha alterada com sucesso', position: 'top' })
      passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    } else {
      $q.notify({ type: 'negative', message: data.message || 'Erro ao alterar senha', position: 'top' })
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao alterar senha', position: 'top' })
  } finally {
    changingPassword.value = false
  }
}

onMounted(() => {
  form.value = {
    name: authStore.user?.name || '',
    email: authStore.user?.email || '',
    phone: authStore.user?.phone || ''
  }
})
</script>

<style lang="scss" scoped>
.profile-card {
  border-radius: 12px;
}

body.body--dark .profile-card {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.1);
}
</style>
