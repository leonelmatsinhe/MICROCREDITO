<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Contas Bancárias</div>
        <div class="text-caption text-grey-5">Contas associadas à empresa para operações</div>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="add" label="Nova Conta" unelevated no-caps rounded size="sm" @click="openCreate" />
      </div>
    </div>

    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <div v-else-if="accounts.length === 0" class="text-center q-pa-xl">
      <q-icon name="account_balance" size="48px" color="grey-4" />
      <div class="text-subtitle1 text-grey-6 q-mt-sm">Nenhuma conta registada</div>
      <q-btn color="primary" label="Adicionar Primeira Conta" unelevated no-caps rounded size="sm" class="q-mt-md" @click="openCreate" />
    </div>

    <div v-else class="row q-col-gutter-md">
      <div v-for="account in accounts" :key="account.id" class="col-12 col-sm-6">
        <q-card flat bordered style="border-radius: 12px" class="account-card">
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="account-icon">
                <q-icon name="account_balance" size="22px" color="blue" />
              </div>
              <q-space />
              <q-btn flat round dense icon="more_vert" size="sm">
                <q-menu>
                  <q-list style="min-width: 140px">
                    <q-item clickable v-close-popup @click="openEdit(account)">
                      <q-item-section avatar><q-icon name="edit" size="16px" color="grey-7" /></q-item-section>
                      <q-item-section style="font-size: 13px">Editar</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="confirmDelete(account)">
                      <q-item-section avatar><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                      <q-item-section class="text-negative" style="font-size: 13px">Eliminar</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>

            <div class="text-weight-bold" style="font-size: 15px">{{ account.accountDescription || 'Conta' }}</div>
            <div class="text-caption text-grey-5 q-mt-xs">
              <q-icon name="credit_card" size="12px" class="q-mr-xs" />
              {{ account.accountNumber || 'Sem número' }}
            </div>
            <div class="text-caption text-grey-5" v-if="account.accountHolder">
              <q-icon name="person" size="12px" class="q-mr-xs" />
              {{ account.accountHolder }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Form Dialog -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="width: 420px; border-radius: 12px">
        <q-card-section class="bg-primary text-white row items-center" style="border-radius: 12px 12px 0 0">
          <q-icon :name="editingAccount ? 'edit' : 'add'" size="20px" class="q-mr-sm" />
          <div class="text-h6">{{ editingAccount ? 'Editar Conta' : 'Nova Conta' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeForm" />
        </q-card-section>
        <q-card-section>
          <q-form @submit="saveAccount" class="q-gutter-md">
            <q-input v-model="form.accountNumber" dense outlined label="Nº Conta / IBAN *" :rules="[val => !!val || 'Obrigatório']" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="credit_card" size="16px" color="grey-5" /></template>
            </q-input>
            <q-input v-model="form.accountDescription" dense outlined label="Descrição / Nome" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="label" size="16px" color="grey-5" /></template>
            </q-input>
            <q-input v-model="form.accountHolder" dense outlined label="Titular da Conta" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="person" size="16px" color="grey-5" /></template>
            </q-input>
            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Cancelar" color="grey" @click="closeForm" no-caps />
              <q-btn type="submit" unelevated :label="editingAccount ? 'Salvar' : 'Criar'" color="primary" :loading="saving" no-caps rounded />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="border-radius: 12px; min-width: 300px">
        <q-card-section class="text-center q-pa-lg">
          <q-avatar icon="warning" color="negative" text-color="white" size="48px" />
          <div class="text-h6 q-mt-md">Eliminar Conta</div>
          <div class="text-body2 text-grey-6 q-mt-sm">Tem certeza?</div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup no-caps />
          <q-btn unelevated label="Eliminar" color="negative" :loading="saving" @click="deleteAccountConfirmed" v-close-popup no-caps rounded />
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
import { logUpdateAccount } from '@/utils/logger'

const $q = useQuasar()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const loading = computed(() => settingsStore.loadingAccounts)
const saving = computed(() => settingsStore.saving)
const accounts = computed(() => settingsStore.accounts)

const showForm = ref(false)
const showDeleteConfirm = ref(false)
const editingAccount = ref(null)
const deletingAccount = ref(null)
const form = ref({ accountNumber: '', accountDescription: '', accountHolder: '' })

function openCreate() {
  editingAccount.value = null
  form.value = { accountNumber: '', accountDescription: '', accountHolder: '' }
  showForm.value = true
}

function openEdit(account) {
  editingAccount.value = account
  form.value = {
    accountNumber: account.accountNumber || '',
    accountDescription: account.accountDescription || '',
    accountHolder: account.accountHolder || ''
  }
  showForm.value = true
}

function closeForm() { showForm.value = false; editingAccount.value = null }
function confirmDelete(account) { deletingAccount.value = account; showDeleteConfirm.value = true }

async function saveAccount() {
  try {
    const payload = { ...form.value, companyId: authStore.companyId, createdBy: authStore.userName }
    if (editingAccount.value) {
      await settingsStore.updateAccount(editingAccount.value.id, payload)
      logUpdateAccount(form.value.accountDescription)
      $q.notify({ type: 'positive', message: 'Conta atualizada', position: 'top' })
    } else {
      await settingsStore.createAccount(payload)
      logUpdateAccount(form.value.accountDescription)
      $q.notify({ type: 'positive', message: 'Conta criada', position: 'top' })
    }
    closeForm()
    settingsStore.fetchAccounts(authStore.companyId)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro', position: 'top' })
  }
}

async function deleteAccountConfirmed() {
  try {
    await settingsStore.deleteAccount(deletingAccount.value.id)
    $q.notify({ type: 'positive', message: 'Conta eliminada', position: 'top' })
    settingsStore.fetchAccounts(authStore.companyId)
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao eliminar', position: 'top' })
  }
}

onMounted(() => { settingsStore.fetchAccounts(authStore.companyId) })
</script>

<style lang="scss" scoped>
.account-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba($blue, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-card {
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}
</style>
