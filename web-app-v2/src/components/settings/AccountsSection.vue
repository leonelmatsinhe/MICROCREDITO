<template>
  <div>
    <!-- ═══════ CABEÇALHO ═══════ -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Contas Bancárias</div>
        <div class="text-caption text-grey-5">
          Carteira real da empresa — as mesmas contas do Caixa Central (saldos geridos pela tesouraria)
        </div>
      </div>
      <div class="col-auto q-gutter-xs no-wrap">
        <q-btn color="primary" icon="add" label="Nova Conta" unelevated no-caps rounded size="sm" @click="openCreate" />
        <q-btn flat round dense icon="refresh" color="primary" :loading="loading" @click="load">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ═══════ KPIs ═══════ -->
    <div class="row q-col-gutter-md q-mb-md">
      <div v-for="tile in kpis" :key="tile.label" class="col-6 col-md-3">
        <q-card flat class="glass-tile q-pa-md">
          <div class="row items-center no-wrap">
            <div class="tile-icon q-mr-sm" :style="{ background: tile.bg }">
              <q-icon :name="tile.icon" size="18px" :color="tile.color" />
            </div>
            <div style="min-width: 0">
              <div class="text-caption text-grey-6">{{ tile.label }}</div>
              <div class="text-subtitle2 text-weight-bold" :class="tile.class">
                {{ tile.raw ? tile.value : formatMoney(tile.value) }}
              </div>
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- ═══════ PESQUISA / FILTRO ═══════ -->
    <q-card flat class="glass-tile q-mb-md">
      <q-card-section class="row items-center q-col-gutter-sm q-py-sm">
        <div class="col-12 col-sm-6">
          <q-input v-model="search" dense outlined clearable placeholder="Pesquisar banco, número ou titular" input-style="font-size: 13px">
            <template v-slot:prepend><q-icon name="search" size="16px" color="grey-5" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-select v-model="purposeFilter" :options="purposeFilterOptions" dense outlined emit-value map-options label="Finalidade" input-style="font-size: 13px" />
        </div>
        <q-space />
        <div class="text-caption text-grey-6">{{ filteredAccounts.length }} conta(s)</div>
      </q-card-section>
    </q-card>

    <div v-if="loading && accounts.length === 0" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <q-card v-else-if="filteredAccounts.length === 0" flat class="glass-tile text-center q-pa-xl">
      <q-icon name="account_balance" size="48px" color="grey-4" />
      <div class="text-subtitle1 text-grey-6 q-mt-sm">Nenhuma conta encontrada</div>
      <q-btn color="primary" label="Adicionar conta" unelevated no-caps rounded size="sm" class="q-mt-md" @click="openCreate" />
    </q-card>

    <!-- ═══════ CARTOES ═══════ -->
    <div v-else class="row q-col-gutter-md">
      <div v-for="account in filteredAccounts" :key="account.id" class="col-12 col-lg-6">
        <q-card flat class="account-card" :class="{ 'account-inactive': !Number(account.is_active) }">
          <div class="account-head" :class="`head-${purposeTone(account.purpose)}`">
            <div class="row items-center no-wrap">
              <div class="account-icon">
                <q-icon :name="typeIcon(account.type)" size="20px" color="white" />
              </div>
              <div class="col q-ml-sm" style="min-width: 0">
                <div class="text-weight-bold ellipsis" style="font-size: 14px">
                  {{ account.bank_name || account.accountDescription || 'Conta' }}
                </div>
                <div class="text-caption account-head-sub ellipsis">
                  <q-icon name="tag" size="11px" class="q-mr-xs" />{{ account.accountNumber || 'Sem número' }}
                </div>
              </div>
              <q-btn flat round dense icon="more_vert" size="sm" class="account-menu">
                <q-menu anchor="bottom right" self="top right">
                  <q-list style="min-width: 190px">
                    <q-item clickable v-close-popup @click="openStatement(account)">
                      <q-item-section avatar><q-icon name="receipt_long" size="16px" /></q-item-section>
                      <q-item-section style="font-size: 13px">Ver extrato</q-item-section>
                    </q-item>
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

            <div class="row items-center q-gutter-xs q-mt-sm">
              <q-badge :color="purposeColor(account.purpose)" :label="account.purpose" style="font-size: 9px" />
              <q-badge outline color="white" :label="typeLabel(account.type)" style="font-size: 9px" />
              <q-badge v-if="Number(account.is_default_desembolso)" color="orange-8" label="Default desembolso" style="font-size: 9px" />
              <q-badge v-if="Number(account.is_default_reembolso)" color="green-7" label="Default reembolso" style="font-size: 9px" />
              <q-badge v-if="!Number(account.is_active)" color="grey-8" label="Inactiva" style="font-size: 9px" />
            </div>
          </div>

          <q-card-section class="q-pa-md">
            <div class="row items-end">
              <div class="col">
                <div class="kpi-label">Saldo actual</div>
                <div class="text-h6 text-weight-bold" :class="balanceClass(account.balance)">
                  <q-icon :name="Number(account.balance) < 0 ? 'trending_down' : 'trending_up'" size="18px" class="q-mr-xs" />
                  {{ formatMoney(account.balance) }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-caption text-grey-6">{{ typeLabel(account.type) }} · {{ account.purpose }}</div>
                <div class="text-caption text-grey-5" v-if="account.accountHolder">
                  <q-icon name="person" size="11px" class="q-mr-xs" />{{ account.accountHolder }}
                </div>
              </div>
            </div>
          </q-card-section>

          <q-separator />
          <q-card-actions class="q-px-md q-py-xs">
            <q-btn flat dense no-caps size="sm" color="primary" icon="receipt_long" label="Ver extrato" @click="openStatement(account)" />
            <q-btn flat dense no-caps size="sm" color="grey-8" icon="edit" label="Editar" @click="openEdit(account)" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- ═══════ DIALOG: FORMULÁRIO ═══════ -->
    <q-dialog v-model="showForm" persistent>
      <q-card class="dialog-md">
        <q-card-section class="row items-center dialog-head">
          <q-icon :name="editingAccount ? 'edit' : 'add'" size="20px" class="q-mr-sm" />
          <div class="text-h6">{{ editingAccount ? 'Editar Conta' : 'Nova Conta' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeForm" />
        </q-card-section>
        <q-card-section class="q-gutter-y-md scroll" style="max-height: 70vh">
          <q-select v-model="form.type" :options="typeOptions" dense outlined emit-value map-options label="Tipo de carteira *" :rules="[(v) => !!v || 'Obrigatório']" input-style="font-size: 13px" />
          <q-input v-model="form.bank_name" dense outlined label="Banco / Operador *" hint="Ex.: FNB, BCI, BIM, Moza, M-Pesa, e-Mola" :rules="[(v) => !!(v && v.trim()) || 'Obrigatório']" input-style="font-size: 13px" />
          <q-input v-model="form.accountNumber" dense outlined label="Nº Conta / IBAN / Telefone *" :rules="[(v) => !!v || 'Obrigatório']" input-style="font-size: 13px">
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
            dense outlined emit-value map-options
            label="Finalidade *"
            hint="Filtra as opções nos desembolsos (DESEMBOLSO) e pagamentos (REEMBOLSO)"
            :rules="[(v) => !!v || 'Obrigatório']"
            input-style="font-size: 13px"
          />
          <div class="row q-gutter-sm">
            <q-toggle v-model="form.is_default_reembolso" label="Default reembolsos" dense />
            <q-toggle v-model="form.is_default_desembolso" label="Default desembolsos" dense />
            <q-toggle v-model="form.is_active" label="Activa" dense />
          </div>
          <div class="row justify-end q-gutter-sm q-mt-md">
            <q-btn flat label="Cancelar" color="grey" @click="closeForm" no-caps />
            <q-btn unelevated rounded :label="editingAccount ? 'Salvar' : 'Criar'" color="primary" :loading="saving" @click="saveAccount" no-caps />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: ELIMINAR ═══════ -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card class="dialog-sm">
        <q-card-section class="text-center q-pa-lg">
          <q-avatar icon="warning" color="negative" text-color="white" size="48px" />
          <div class="text-h6 q-mt-md">Eliminar Conta</div>
          <div class="text-body2 text-grey-6 q-mt-sm">
            A conta será <strong>desactivada</strong> — o histórico financeiro (movimentos da tesouraria) é preservado.
          </div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup no-caps />
          <q-btn unelevated rounded label="Eliminar" color="negative" :loading="saving" @click="deleteAccountConfirmed" v-close-popup no-caps />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: EXTRATO ═══════ -->
    <q-dialog v-model="statementDialog">
      <q-card class="dialog-lg">
        <q-card-section class="row items-center dialog-head">
          <q-icon name="receipt_long" size="20px" class="q-mr-sm" />
          <div class="text-h6 ellipsis">{{ statementAccount?.bank_name }} · {{ statementAccount?.accountNumber }}</div>
          <q-space />
          <div class="text-weight-bold q-mr-md">Saldo: {{ formatMoney(statementAccount?.balance) }}</div>
          <q-btn flat round dense icon="close" @click="statementDialog = false" />
        </q-card-section>
        <q-separator />
        <q-card-section style="max-height: 65vh" class="scroll">
          <q-table
            :rows="statementRows"
            :columns="statementColumns"
            row-key="id"
            flat bordered dense separator="horizontal"
            :rows-per-page-options="[15, 30, 50]"
          >
            <template v-slot:no-data>
              <div class="full-width text-center q-pa-lg text-grey-6">
                <q-icon name="inbox" size="40px" color="grey-4" />
                <div class="q-mt-sm">Sem movimentos nesta conta.</div>
              </div>
            </template>
            <template v-slot:body-cell-createdAt="props">
              <q-td :props="props" class="text-center text-caption">{{ formatDateTime(props.row.createdAt) }}</q-td>
            </template>
            <template v-slot:body-cell-category="props">
              <q-td :props="props" class="text-center">
                <q-chip dense outline color="blue-grey" style="font-size: 10px">{{ props.row.category }}</q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-amount="props">
              <q-td :props="props" class="text-right">
                <span class="text-weight-bold" :class="props.row.type === 'ENTRADA' ? 'text-positive' : 'text-negative'">
                  {{ props.row.type === 'ENTRADA' ? '+' : '−' }} {{ formatMoney(props.row.amount) }}
                </span>
              </q-td>
            </template>
            <template v-slot:body-cell-balanceAfter="props">
              <q-td :props="props" class="text-right text-caption">{{ formatMoney(props.row.balanceAfter) }}</q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { formatMoney } from '@/utils/formatters'
import { logUpdateAccount } from '@/utils/logger'

/**
 * CONTAS BANCÁRIAS (Configurações) — mesma fonte de verdade do Caixa Central.
 * Ambos leem/escrevem em /api/bank-accounts (tabela `accounts` com saldo real).
 * O visual aqui é o mesmo das restantes páginas: KPIs no topo, cartões com
 * cabeçalho em gradiente por finalidade e extrato da conta num clique.
 */
const $q = useQuasar()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const loading = computed(() => settingsStore.loadingAccounts)
const saving = computed(() => settingsStore.saving)
const accounts = computed(() => settingsStore.accounts)

const search = ref('')
const purposeFilter = ref('todos')

const showForm = ref(false)
const showDeleteConfirm = ref(false)
const editingAccount = ref(null)
const deletingAccount = ref(null)

const PURPOSES_DESEMBOLSO = ['DESEMBOLSO', 'MISTO']

const activeAccounts = computed(() => accounts.value.filter((account) => Number(account.is_active) === 1))
const totalBank = computed(() =>
  round2(activeAccounts.value.filter((a) => a.type === 'BANCO').reduce((sum, a) => sum + (Number(a.balance) || 0), 0))
)
const totalMobile = computed(() =>
  round2(
    activeAccounts.value
      .filter((a) => ['MOBILE_MONEY', 'EWALLET'].includes(a.type))
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
  )
)
const totalDesembolso = computed(() =>
  round2(
    activeAccounts.value
      .filter((a) => PURPOSES_DESEMBOLSO.includes(String(a.purpose)))
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
  )
)

const kpis = computed(() => [
  { label: 'Total em bancos', value: totalBank.value, icon: 'account_balance', color: 'blue-7', bg: 'rgba(37,99,235,0.12)' },
  { label: 'Mobile money / e-wallet', value: totalMobile.value, icon: 'smartphone', color: 'green-7', bg: 'rgba(5,150,105,0.12)' },
  { label: 'Disponível para desembolsos', value: totalDesembolso.value, icon: 'payments', color: 'deep-orange', bg: 'rgba(234,88,12,0.12)' },
  { label: 'Contas activas', value: activeAccounts.value.length, icon: 'checklist', color: 'deep-purple', bg: 'rgba(124,58,237,0.12)', raw: true }
])

const purposeFilterOptions = [
  { label: 'Todas as finalidades', value: 'todos' },
  { label: 'Desembolso', value: 'DESEMBOLSO' },
  { label: 'Reembolso', value: 'REEMBOLSO' },
  { label: 'Reserva', value: 'RESERVA' },
  { label: 'Misto', value: 'MISTO' },
  { label: 'Taxas', value: 'TAXAS' }
]

const filteredAccounts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return accounts.value.filter((account) => {
    if (purposeFilter.value !== 'todos' && String(account.purpose) !== purposeFilter.value) return false
    if (!term) return true
    return [account.bank_name, account.accountNumber, account.accountHolder, account.accountDescription]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
})

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm')
  } catch { return '—' }
}

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

const typeLabel = (type) => typeOptions.find((option) => option.value === type)?.label || type || '—'
const typeIcon = (type) => ({
  BANCO: 'account_balance',
  CAIXA_FISICO: 'point_of_sale',
  MOBILE_MONEY: 'smartphone',
  EWALLET: 'wallet'
}[type] || 'account_balance')

function purposeColor(purpose) {
  const colors = { DESEMBOLSO: 'orange-8', REEMBOLSO: 'blue-7', RESERVA: 'blue-grey-6', MISTO: 'deep-purple', TAXAS: 'teal' }
  return colors[purpose] || 'grey-6'
}
function purposeTone(purpose) {
  const tones = { DESEMBOLSO: 'orange', REEMBOLSO: 'blue', RESERVA: 'grey', MISTO: 'purple', TAXAS: 'teal' }
  return tones[purpose] || 'blue'
}
function balanceClass(balance) {
  const value = Number(balance) || 0
  if (value < 0) return 'text-negative'
  if (value === 0) return 'text-grey-7'
  return 'text-primary'
}

function load() {
  return settingsStore.fetchAccounts(authStore.companyId)
}

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
      $q.notify({ type: 'positive', message: 'Conta actualizada', position: 'top' })
    } else {
      await settingsStore.createAccount(payload)
      logUpdateAccount(form.value.accountDescription || form.value.bank_name)
      $q.notify({ type: 'positive', message: 'Conta criada', position: 'top' })
    }
    closeForm()
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro', position: 'top' })
  }
}

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
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao alterar estado', position: 'top' })
  }
}

async function deleteAccountConfirmed() {
  try {
    await settingsStore.deleteAccount(deletingAccount.value.id)
    $q.notify({ type: 'positive', message: 'Conta desactivada — histórico preservado', position: 'top' })
    await load()
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao eliminar', position: 'top' })
  }
}

/* ── Extrato da conta (mesma API do Caixa Central) ── */
const statementDialog = ref(false)
const statementAccount = ref(null)
const statementRows = ref([])
const statementColumns = [
  { name: 'createdAt', label: 'Data', field: 'createdAt', align: 'center' },
  { name: 'category', label: 'Categoria', field: 'category', align: 'center' },
  { name: 'description', label: 'Descrição', field: 'description', align: 'left' },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right' },
  { name: 'balanceAfter', label: 'Saldo após', field: 'balanceAfter', align: 'right' }
]

async function openStatement(account) {
  statementAccount.value = account
  statementRows.value = []
  statementDialog.value = true
  try {
    const { data } = await api.get(`/api/bank-accounts/${account.id}/transactions`)
    if (data.success) statementRows.value = data.result?.transactions || []
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao carregar extrato', position: 'top' })
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.glass-tile {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(15, 23, 42, 0.06);
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

.account-card {
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.07);
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.09);
  }
}

.account-inactive { opacity: 0.62; }

.account-head {
  padding: 14px 16px 12px;
  color: #fff;

  &.head-blue { background: linear-gradient(135deg, #1d4ed8, #3b82f6); }
  &.head-orange { background: linear-gradient(135deg, #c2410c, #fb923c); }
  &.head-grey { background: linear-gradient(135deg, #334155, #64748b); }
  &.head-purple { background: linear-gradient(135deg, #6d28d9, #a78bfa); }
  &.head-teal { background: linear-gradient(135deg, #0f766e, #2dd4bf); }
}

.account-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.account-head-sub { color: rgba(255, 255, 255, 0.8); }
.account-menu { color: rgba(255, 255, 255, 0.85); }

.kpi-label {
  font-size: 10px;
  color: $grey-6;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.dialog-md { width: 520px; max-width: 95vw; border-radius: 18px; }
.dialog-lg { width: 900px; max-width: 95vw; border-radius: 18px; }
.dialog-sm { width: 400px; max-width: 95vw; border-radius: 18px; }

.dialog-head {
  background: linear-gradient(135deg, $primary, #16a34a);
  color: #fff;
}

body.body--dark {
  .account-card { background: $gray-800; border-color: $gray-700; }
  .glass-tile { background: rgba(30, 41, 59, 0.7); border-color: rgba(255, 255, 255, 0.06); }
}
</style>
