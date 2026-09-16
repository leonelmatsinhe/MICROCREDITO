<template>
  <q-page class="portal-page q-pa-sm">
    <!-- Cabeçalho do perfil -->
    <q-card flat bordered class="profile-card q-mb-sm">
      <q-card-section class="column items-center q-py-lg">
        <q-avatar size="80px" color="primary" text-color="white" class="profile-avatar">
          {{ getInitials(customer?.name) }}
        </q-avatar>
        <div class="text-h6 text-weight-bold q-mt-sm text-center">{{ customer?.name || '—' }}</div>
        <q-badge color="positive" rounded class="q-px-md q-py-xs q-mt-xs" style="font-size: 11px">
          Conta {{ customer?.accountNumber || '—' }}
        </q-badge>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-sm">
        <!-- Telefone clicável -->
        <q-item
          clickable
          v-ripple
          class="profile-row"
          :href="customer?.phone ? `tel:${customer.phone}` : undefined"
        >
          <q-item-section avatar><q-icon name="phone" color="primary" size="20px" /></q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ customer?.phone || '—' }}</q-item-label>
            <q-item-label caption>Telefone (toque para ligar)</q-item-label>
          </q-item-section>
          <q-item-section side v-if="customer?.phone"><q-icon name="open_in_new" size="16px" color="grey-5" /></q-item-section>
        </q-item>

        <!-- Email -->
        <q-item class="profile-row">
          <q-item-section avatar><q-icon name="email" color="grey-6" size="20px" /></q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ customer?.email || '—' }}</q-item-label>
            <q-item-label caption>Email</q-item-label>
          </q-item-section>
        </q-item>

        <!-- Registado em -->
        <q-item class="profile-row">
          <q-item-section avatar><q-icon name="event" color="grey-6" size="20px" /></q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">Registado em {{ formatDate(customer?.registrationDate) }}</q-item-label>
            <q-item-label caption>Data de registo</q-item-label>
          </q-item-section>
        </q-item>
      </q-card-section>
    </q-card>

    <!-- Acções -->
    <q-card flat bordered class="profile-card">
      <q-list>
        <q-item clickable v-ripple @click="openEditData">
          <q-item-section avatar><q-icon name="person" color="primary" /></q-item-section>
          <q-item-section>Meus Dados</q-item-section>
          <q-item-section side><q-icon name="chevron_right" color="grey-5" /></q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable v-ripple @click="openChangePassword">
          <q-item-section avatar><q-icon name="lock" color="primary" /></q-item-section>
          <q-item-section>Alterar Senha</q-item-section>
          <q-item-section side><q-icon name="chevron_right" color="grey-5" /></q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable v-ripple @click="$q.notify({ type: 'info', message: 'Termos e Condições — em breve.', position: 'top' })">
          <q-item-section avatar><q-icon name="description" color="primary" /></q-item-section>
          <q-item-section>Termos e Condições</q-item-section>
          <q-item-section side><q-icon name="chevron_right" color="grey-5" /></q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable v-ripple @click="handleLogout">
          <q-item-section avatar><q-icon name="logout" color="negative" /></q-item-section>
          <q-item-section class="text-negative">Sair</q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Dialog: Meus Dados -->
    <q-dialog v-model="showEditData" persistent>
      <q-card style="border-radius: 16px; width: 100%; max-width: 430px; min-width: 0">
        <q-card-section class="row items-center bg-primary text-white" style="border-radius: 16px 16px 0 0">
          <q-icon name="person" size="22px" class="q-mr-sm" />
          <div class="text-h6">Meus Dados</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showEditData = false" />
        </q-card-section>

        <q-card-section class="q-gutter-sm">
          <q-input v-model="editForm.customerName" label="Nome Completo" outlined dense :disable="savingData" />
          <q-input v-model="editForm.customerPhone" label="Telefone" outlined dense mask="#############" :disable="savingData" />
          <q-input v-model="editForm.customerEmail" label="Email" outlined dense type="email" :disable="savingData" />
          <q-input v-model="editForm.customerAddress" label="Endereço" outlined dense :disable="savingData" />
          <q-input v-model="editForm.customerBairro" label="Bairro" outlined dense :disable="savingData" />
          <q-input v-model="editForm.customerProfession" label="Profissão" outlined dense :disable="savingData" />
          <q-input v-model="editForm.customerMonthlySalary" label="Rendimento Mensal (MZN)" outlined dense type="number" :disable="savingData" />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showEditData = false" />
          <q-btn unelevated label="Guardar" icon="save" color="primary" no-caps :loading="savingData" @click="saveCustomerData" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Alterar Senha -->
    <q-dialog v-model="showChangePassword" persistent>
      <q-card style="border-radius: 16px; width: 100%; max-width: 430px; min-width: 0">
        <q-card-section class="row items-center bg-primary text-white" style="border-radius: 16px 16px 0 0">
          <q-icon name="lock" size="22px" class="q-mr-sm" />
          <div class="text-h6">Alterar Senha</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showChangePassword = false" />
        </q-card-section>

        <q-card-section class="q-gutter-sm">
          <q-input
            v-model="passwordForm.currentPassword"
            label="Senha actual"
            outlined
            dense
            type="password"
            :disable="savingPassword"
          />
          <q-input
            v-model="passwordForm.newPassword"
            label="Nova senha (mín. 6 caracteres)"
            outlined
            dense
            type="password"
            :disable="savingPassword"
            :rules="[v => !v || v.length >= 6 || 'Mínimo de 6 caracteres']"
          />
          <q-input
            v-model="passwordForm.confirmPassword"
            label="Confirmar nova senha"
            outlined
            dense
            type="password"
            :disable="savingPassword"
            :error="!!passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword"
            error-message="As senhas não coincidem"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showChangePassword = false" />
          <q-btn
            unelevated
            label="Alterar Senha"
            icon="lock_reset"
            color="primary"
            no-caps
            :loading="savingPassword"
            :disable="!passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword.length < 6 || passwordForm.confirmPassword !== passwordForm.newPassword"
            @click="submitChangePassword"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import { usePortalData } from '@/composables/usePortalData'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const { customer, getInitials, formatDate, refresh } = usePortalData()

// ===== Meus Dados =====
const showEditData = ref(false)
const savingData = ref(false)
const editForm = reactive({
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress: '',
  customerBairro: '',
  customerProfession: '',
  customerMonthlySalary: null
})

function openEditData() {
  const c = customer.value || {}
  editForm.customerName = c.name || c.customerName || ''
  editForm.customerPhone = c.phone || c.customerPhone || ''
  editForm.customerEmail = c.email || c.customerEmail || ''
  editForm.customerAddress = c.customerAddress || ''
  editForm.customerBairro = c.customerBairro || ''
  editForm.customerProfession = c.customerProfession || ''
  editForm.customerMonthlySalary = c.customerMonthlySalary || c.monthlySalary || null
  showEditData.value = true
}

async function saveCustomerData() {
  const user = authStore.user
  if (!user) return
  savingData.value = true
  try {
    const { data } = await api.put(`/api/customer/${user.id}`, {
      customerName: editForm.customerName,
      customerPhone: editForm.customerPhone,
      customerEmail: editForm.customerEmail,
      customerAddress: editForm.customerAddress,
      customerBairro: editForm.customerBairro,
      customerProfession: editForm.customerProfession,
      customerMonthlySalary: editForm.customerMonthlySalary
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: 'Dados actualizados com sucesso!', position: 'top' })
      showEditData.value = false
      // Sincronizar o user em cache com os novos dados
      const updatedUser = { ...user }
      if (updatedUser.isCustomer) {
        updatedUser.customerName = editForm.customerName
        updatedUser.customerPhone = editForm.customerPhone
        updatedUser.customerEmail = editForm.customerEmail
        localStorage.setItem('customer', JSON.stringify(updatedUser))
      }
      await refresh()
    } else {
      $q.notify({ type: 'negative', message: data.message || 'Erro ao actualizar os dados', position: 'top' })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao actualizar os dados', position: 'top' })
  } finally {
    savingData.value = false
  }
}

// ===== Alterar Senha =====
const showChangePassword = ref(false)
const savingPassword = ref(false)
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

function openChangePassword() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  showChangePassword.value = true
}

async function submitChangePassword() {
  const user = authStore.user
  if (!user) return
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    $q.notify({ type: 'negative', message: 'As senhas não coincidem', position: 'top' })
    return
  }
  savingPassword.value = true
  try {
    const { data } = await api.post('/api/customer/changePassword', {
      customerId: user.id,
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: data.message || 'Senha alterada com sucesso!', position: 'top' })
      showChangePassword.value = false
    } else {
      $q.notify({ type: 'negative', message: data.message || 'Erro ao alterar a senha', position: 'top' })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao alterar a senha', position: 'top' })
  } finally {
    savingPassword.value = false
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/')
}
</script>

<style lang="scss" scoped>
.portal-page {
  padding-bottom: 74px;
}

.profile-card {
  border-radius: 16px;
  overflow: hidden;
}

.profile-avatar {
  font-size: 28px;
  font-weight: 700;
}

.profile-row {
  border-radius: 12px;
}
</style>
