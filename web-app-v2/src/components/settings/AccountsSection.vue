<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Contas Bancárias</div>
        <div class="text-caption text-grey-5">
          Carteira real da empresa — as mesmas contas usadas no Caixa Central (saldos geridos pela tesouraria)
        </div>
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
        <q-card flat bordered style="border-radius: 12px" class="account-card" :class="{ 'account-inactive': !Number(account.is_active) }">
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="account-icon">
                <q-icon :name="typeIcon(account.type)" size="22px" color="blue" />
              </div>
              <q-space />
              <!-- Defaults -->
              <q-badge v-if="Number(account.is_default_reembolso)" color="green" class="q-mr-xs" style="font-size: 9px">
                Reembolso
              </q-badge>
              <q-badge v-if="Number(account.is_default_desembolso)" color="orange" class="q-mr-xs" style="font-size: 9px">
                Desembolso
              </q-badge>
              <q-badge v-if="!Number(account.is_active)" color="grey-6" style="font-size: 9px">
                Inactiva
              </q-badge>
              <q-btn flat round dense icon="more_vert" size="sm">
                <q-menu>
                  <q-list style="min-width: 170px">
                    <q-item clickable v-close-popup @click="openEdit(account)">
                      <q-item-section avatar><q-icon name="edit" size="16px" color="grey-7" /></q-item-section>
                      <q-item-section style="font-size: 13px">Editar</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="toggleActive(account)">
                      <q-item-section avatar>
                        <q-icon :name="Number(account.is_active) ? 'visibility_off' : 'check_circle'" size="16px" color="grey-7" />
                      </q-item-section>
                      <q-item-section style="font-size: 13px">
                        {{ Number(account.is_active) ? 'Desactivar' : 'Activar' }}
                      </q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="confirmDelete(account)">
                      <q-item-section avatar><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                      <q-item-section class="text-negative" style="font-size: 13px">Eliminar</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>

            <div class="text-weight-bold" style="font-size: 15px">
              {{ account.bank_name || account.accountDescription || 'Conta' }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">
              <q-icon name="credit_card" size="12px" class="q-mr-xs" />
              {{ account.accountNumber || 'Sem número' }}
            </div>
            <div class="text-caption text-grey-5" v-if="account.accountHolder">
              <q-icon name="person" size="12px" class="q-mr-xs" />
              {{ account.accountHolder }}
            </div>

            <!-- Saldo real + finalidade -->
            <div class="row items-center q-mt-sm">
              <div class="col">
                <div class="text-caption text-grey-5" style="font-size: 10px">Saldo actual</div>
                <div class="text-weight-bold text-primary" style="font-size: 14px">{{ formatMoney(account.balance) }}</div>
              </div>
              <div class="col-auto">
                <q-chip outline dense color="blue-grey" style="font-size: 10px">
                  {{ typeLabel(account.type) }} · {{ account.purpose }}
                </q-chip>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Form Dialog -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="width: 460px; max-width: 95vw; border-radius: 12px">
        <q-card-section class="bg-primary text-white row items-center" style="border-radius: 12px 12px 0 0">
          <q-icon :name="editingAccount ? 'edit' : 'add'" size="20px" class="q-mr-sm" />
          <div class="text-h6">{{ editingAccount ? 'Editar Conta' : 'Nova Conta' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeForm" />
        </q-card-section>
        <q-card-section>
          <q-form @submit="saveAccount" class="q-gutter-md">
            <q-select
              v-model="form.type"
              :options="typeOptions"
              dense
              outlined
              emit-value
              map-options
              label="Tipo de carteira *"
              :rules="[val => !!val || 'Obrigatório']"
              input-style="font-size: 13px"
            />
            <q-input v-model="form.bank_name" dense outlined label="Banco / Operador *" hint="Ex.: FNB, BCI, BIM, Moza, M-Pesa, e-Mola" :rules="[val => !!(val && val.trim()) || 'Obrigatório']" input-style="font-size: 13px" />
            <q-input v-model="form.accountNumber" dense outlined label="Nº Conta / IBAN / Telefone *" :rules="[val => !!val || 'Obrigatório']" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="credit_card" size="16px" color="grey-5" /></template>
            </q-input>
            <q-input v-model="form.accountDescription" dense outlined label="Descrição" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="label" size="16px" color="grey-5" /></template>
            </q-input>
            <q-input v-model="form.accountHolder" dense outlined label="Titular da Conta" input-style="font-size: 13px">
              <template v-slot:prepend><q-icon name="person" size="16px" color="grey-5" /></template>
            </q-input>
            <q-select
              v-model="form.purpose"
              :options="purposeOptions"
              dense
              outlined
              emit-value
              map-options
              label="Finalidade *"
              hint="Filtra as opções nos desembolsos (DESEMBOLSO) e pagamentos (REEMBOLSO)"
              :rules="[val => !!val || 'Obrigatório']"
              input-style="font-size: 13px"
            />
            <div class="row q-gutter-sm">
              <q-toggle v-model="form.is_default_reembolso" label="Default reembolsos" dense />
              <q-toggle v-model="form.is_default_desembolso" label="Default desembolsos" dense />
              <q-toggle v-model="form.is_active" label="Activa" dense />
            </div>
            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Cancelar" color="grey" @click="closeForm" no-caps />
              <q-btn type="submit" unelevated :label="editingAccount ? 'Salvar' : 'Criar'" color="primary" :loading="saving" no-caps rounded />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="border-radius: 12px; min-width: 320px">
        <q-card-section class="text-center q-pa-lg">
          <q-avatar icon="warning" color="negative" text-color="white" size="48px" />
          <div class="text-h6 q-mt-md">Eliminar Conta</div>
          <div class="text-body2 text-grey-6 q-mt-sm">
            A conta será <strong>desactivada</strong> — o histórico financeiro (movimentos da tesouraria) é preservado.
          </div>
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
import { formatMoney } from '@/utils/formatters'
import { logUpdateAccount } from '@/utils/logger'

/**
 * CONTAS BANCÁRIAS (Configurações) — mesma fonte de verdade do Caixa Central.
 * Ambos os ecrãs leem/escrevem em /api/bank-accounts (tabela `accounts` com
 * saldo real). Alterações aqui reflectem-se imediatamente no Caixa Central e
 * nos selects de desembolso/pagamento.
 */
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
const emptyForm = () => ({
  accountNumber: '',
  accountDescription: '',
  accountHolder: '',
  bank_name: '',
  type: 'BANCO',
  purpose: 'MISTO',
  currency: 'MZN',
  is_default_reembolso: false,
  is_default_desembolso: false,
  is_active: true
})
const form = ref(emptyForm())

// ─── Metadados de tipo/finalidade (iguais aos do BankAccountsPage) ───
const typeOptions = [
  { label: 'Banco', value: 'BANCO' },
  { label: 'Caixa Físico', value: 'CAIXA_FISICO' },
  { label: 'Mobile Money', value: 'MOBILE_MONEY' },
  { label: 'e-Wallet', value: 'EWALLET' }
]
const purposeOptions = [
  { label: 'Reembolso (recebe pagamentos)', value: 'REEMBOLSO' },
  { label: 'Desembolso (paga créditos)', value: 'DESEMBOLSO' },
  { label: 'Misto (ambos)', value: 'MISTO' },
  { label: 'Taxas', value: 'TAXAS' },
  { label: 'Reserva', value: 'RESERVA' }
]
const typeLabel = (type) => typeOptions.find(t => t.value === type)?.label || type || '—'
const typeIcon = (type) => ({
  BANCO: 'account_balance',
  CAIXA_FISICO: 'inbox',
  MOBILE_MONEY: 'smartphone',
  EWALLET: 'wallet'
}[type] || 'account_balance')

function openCreate() {
  editingAccount.value = null
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(account) {
  editingAccount.value = account
  form.value = {
    accountNumber: account.accountNumber || '',
    accountDescription: account.accountDescription || '',
    accountHolder: account.accountHolder || '',
    bank_name: account.bank_name || '',
    type: account.type || 'BANCO',
    purpose: account.purpose || 'MISTO',
    currency: account.currency || 'MZN',
    is_default_reembolso: Number(account.is_default_reembolso) === 1,
    is_default_desembolso: Number(account.is_default_desembolso) === 1,
    is_active: Number(account.is_active) === 1
  }
  showForm.value = true
}

function closeForm() { showForm.value = false; editingAccount.value = null }
function confirmDelete(account) { deletingAccount.value = account; showDeleteConfirm.value = true }

// Toggles → 0/1 para a API
const toPayload = () => ({
  ...form.value,
  is_default_reembolso: form.value.is_default_reembolso ? 1 : 0,
  is_default_desembolso: form.value.is_default_desembolso ? 1 : 0,
  is_active: form.value.is_active ? 1 : 0
})

async function saveAccount() {
  try {
    const payload = { ...toPayload(), companyId: authStore.companyId, createdBy: authStore.userName }
    if (editingAccount.value) {
      await settingsStore.updateAccount(editingAccount.value.id, payload)
      logUpdateAccount(form.value.accountDescription || form.value.bank_name)
      $q.notify({ type: 'positive', message: 'Conta atualizada', position: 'top' })
    } else {
      await settingsStore.createAccount(payload)
      logUpdateAccount(form.value.accountDescription || form.value.bank_name)
      $q.notify({ type: 'positive', message: 'Conta criada', position: 'top' })
    }
    closeForm()
    settingsStore.fetchAccounts(authStore.companyId)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro', position: 'top' })
  }
}

// Activar/desactivar sem abrir o form (menu ⋮)
async function toggleActive(account) {
  try {
    const next = Number(account.is_active) ? 0 : 1
    await settingsStore.updateAccount(account.id, { is_active: next })
    $q.notify({
      type: 'positive',
      message: next ? 'Conta activada' : 'Conta desactivada',
      position: 'top',
      timeout: 1500
    })
    settingsStore.fetchAccounts(authStore.companyId)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao alterar estado', position: 'top' })
  }
}

async function deleteAccountConfirmed() {
  try {
    await settingsStore.deleteAccount(deletingAccount.value.id)
    $q.notify({ type: 'positive', message: 'Conta desactivada — histórico preservado', position: 'top' })
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

  &.account-inactive {
    opacity: 0.65;
    background: $grey-1;
  }
}
</style>
