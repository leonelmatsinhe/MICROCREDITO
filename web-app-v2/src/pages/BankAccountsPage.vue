<template>
  <q-page class="bank-accounts-page q-pa-md">
    <!-- ═══════ CABEÇALHO ═══════ -->
    <div class="row items-center q-col-gutter-sm q-mb-md">
      <div class="col-12 col-md">
        <div class="row items-center no-wrap">
          <div class="page-icon q-mr-sm"><q-icon name="account_balance" size="20px" color="white" /></div>
          <div>
            <div class="text-subtitle1 text-weight-bold">Contas Bancárias — Carteira Real</div>
            <div class="text-caption text-grey-6">
              Saldos geridos pela tesouraria (desembolsos, reembolsos e transferências).
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-auto q-gutter-xs no-wrap">
        <q-btn color="primary" unelevated no-caps rounded icon="add" label="Nova Conta" @click="openFormDialog()" />
        <q-btn outline color="primary" no-caps rounded icon="swap_horiz" label="Transferir" @click="openTransferDialog()" />
        <q-btn flat round icon="refresh" color="primary" :loading="loading" @click="fetchAccounts">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ═══════ KPIs ═══════ -->
    <div class="row q-col-gutter-md q-mb-md">
      <div v-for="tile in kpis" :key="tile.label" class="col-6 col-lg-3">
        <q-card flat class="glass-tile q-pa-md">
          <div class="row items-center no-wrap">
            <div class="tile-icon q-mr-sm" :style="{ background: tile.bg }">
              <q-icon :name="tile.icon" size="18px" :color="tile.color" />
            </div>
            <div style="min-width: 0">
              <div class="text-caption text-grey-6">{{ tile.label }}</div>
              <div class="text-subtitle1 text-weight-bold" :class="tile.class">{{ formatMZN(tile.value) }}</div>
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- ═══════ PESQUISA / FILTRO ═══════ -->
    <q-card flat class="glass-tile q-mb-md">
      <q-card-section class="row items-center q-col-gutter-sm q-py-sm">
        <div class="col-12 col-sm-5">
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

    <!-- ═══════ CARREGAMENTO / VAZIO ═══════ -->
    <div v-if="loading && accounts.length === 0" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>
    <q-card v-else-if="filteredAccounts.length === 0" flat class="glass-tile text-center q-pa-xl">
      <q-icon name="account_balance" size="52px" color="grey-4" />
      <div class="text-subtitle1 text-grey-6 q-mt-sm">Nenhuma conta encontrada</div>
      <div class="text-caption text-grey-5">Ajuste a pesquisa ou crie uma nova conta.</div>
      <q-btn color="primary" rounded unelevated no-caps label="Nova conta" class="q-mt-md" @click="openFormDialog()" />
    </q-card>

    <!-- ═══════ CARTOES ═══════ -->
    <div v-else class="row q-col-gutter-md">
      <div v-for="account in filteredAccounts" :key="account.id" class="col-12 col-md-6 col-xl-4">
        <q-card flat class="account-card" :class="{ 'account-inactive': Number(account.is_active) !== 1 }">
          <div class="account-head" :class="`head-${purposeTone(account.purpose)}`">
            <div class="row items-center no-wrap">
              <div class="account-icon">
                <q-icon :name="typeIcon(account.type)" size="20px" color="white" />
              </div>
              <div class="col q-ml-sm" style="min-width: 0">
                <div class="text-weight-bold ellipsis" style="font-size: 14px">{{ account.bank_name || account.accountDescription || 'Conta' }}</div>
                <div class="text-caption account-head-sub ellipsis">
                  <q-icon name="tag" size="11px" class="q-mr-xs" />{{ account.accountNumber || 'Sem número' }}
                </div>
              </div>
              <q-btn flat round dense size="sm" icon="more_vert" class="account-menu">
                <q-menu anchor="bottom right" self="top right">
                  <q-list style="min-width: 200px">
                    <q-item clickable v-close-popup @click="openStatement(account)">
                      <q-item-section avatar><q-icon name="receipt_long" size="16px" /></q-item-section>
                      <q-item-section style="font-size: 13px">Ver extrato</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openFormDialog(account)">
                      <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
                      <q-item-section style="font-size: 13px">Editar conta</q-item-section>
                    </q-item>
                    <q-item
                      v-if="Number(account.is_active) === 1 && account.type !== 'CAIXA_FISICO'"
                      clickable v-close-popup @click="openAdjustDialog(account)"
                    >
                      <q-item-section avatar><q-icon name="savings" size="16px" /></q-item-section>
                      <q-item-section style="font-size: 13px">Introduzir saldo real</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="toggleActive(account, Number(account.is_active) !== 1)">
                      <q-item-section avatar>
                        <q-icon :name="Number(account.is_active) ? 'visibility_off' : 'check_circle'" size="16px" />
                      </q-item-section>
                      <q-item-section style="font-size: 13px">{{ Number(account.is_active) ? 'Inactivar conta' : 'Activar conta' }}</q-item-section>
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
              <q-badge v-if="Number(account.is_active) !== 1" color="grey-8" label="Inactiva" style="font-size: 9px" />
            </div>
          </div>

          <q-card-section class="q-pa-md">
            <div class="row items-end">
              <div class="col">
                <div class="kpi-label">Saldo actual</div>
                <div class="text-h6 text-weight-bold" :class="balanceClass(account.balance)">
                  <q-icon :name="Number(account.balance) < 0 ? 'trending_down' : 'trending_up'" size="18px" class="q-mr-xs" />
                  {{ formatMZN(account.balance) }}
                </div>
              </div>
              <div class="text-caption text-grey-6 text-right">
                {{ account.accountHolder || 'Sem titular' }}
              </div>
            </div>

            <div v-if="Number(account.is_active) === 1" class="text-caption text-grey-6 q-mt-sm">
              <q-icon name="info" size="12px" class="q-mr-xs" />
              {{ purposeHint(account.purpose) }}
            </div>
          </q-card-section>

          <q-separator />
          <q-card-actions class="q-px-md q-py-xs">
            <q-btn flat dense no-caps size="sm" color="primary" icon="receipt_long" label="Extrato" @click="openStatement(account)" />
            <q-btn flat dense no-caps size="sm" color="grey-8" icon="edit" label="Editar" @click="openFormDialog(account)" />
            <q-space />
            <q-toggle
              :model-value="Number(account.is_active) === 1"
              @update:model-value="toggleActive(account, $event)"
              dense color="positive"
            >
              <q-tooltip>{{ Number(account.is_active) ? 'Inactivar conta' : 'Activar conta' }}</q-tooltip>
            </q-toggle>
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- ═══════ DIALOG: FORMULÁRIO ═══════ -->
    <q-dialog v-model="formDialog" persistent>
      <q-card class="dialog-md">
        <q-card-section class="row items-center dialog-head">
          <q-icon :name="form.id ? 'edit' : 'add'" size="20px" class="q-mr-sm" />
          <div class="text-h6">{{ form.id ? 'Editar Conta' : 'Nova Conta Bancária' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="formDialog = false" />
        </q-card-section>
        <q-card-section class="q-gutter-y-md scroll" style="max-height: 70vh">
          <q-select v-model="form.type" :options="typeOptions" outlined dense emit-value map-options label="Tipo *" :rules="[(v) => !!v || 'Selecione o tipo']" />
          <q-input v-model="form.bank_name" outlined dense label="Banco / Operador *" hint="Ex.: FNB, BCI, BIM, Moza, M-Pesa, e-Mola" :rules="[(v) => !!(v && v.trim()) || 'Informe o banco']" />
          <q-input v-model="form.bank_code" outlined dense label="Código do banco (SWIFT/ABI)" />
          <q-input v-model="form.accountNumber" outlined dense label="Número da conta / telefone *" :rules="[(v) => !!(v && v.trim()) || 'Informe o número']" />
          <q-input v-model="form.accountDescription" outlined dense label="Descrição" />
          <q-input v-model="form.accountHolder" outlined dense label="Titular" />
          <q-select
            v-model="form.purpose"
            :options="purposeOptions"
            outlined dense emit-value map-options
            label="Finalidade *"
            hint="Filtra as opções nos desembolsos (DESEMBOLSO) e pagamentos (REEMBOLSO)"
            :rules="[(v) => !!v || 'Selecione a finalidade']"
          />
          <q-select v-model="form.currency" :options="['MZN', 'USD', 'ZAR']" outlined dense label="Moeda" />
          <q-input
            v-if="!form.id"
            v-model.number="form.initial_balance"
            type="number" outlined dense prefix="MZN"
            label="Saldo de partida (referência)"
            hint="O saldo operacional começa em 0; movimentos reais elevam o saldo."
          />
          <div class="row q-gutter-sm">
            <q-toggle v-model="form.is_default_reembolso" label="Default para Reembolsos" dense />
            <q-toggle v-model="form.is_default_desembolso" label="Default para Desembolsos" dense />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancelar" :disable="saving" @click="formDialog = false" />
          <q-btn unelevated rounded no-caps color="primary" :label="form.id ? 'Guardar' : 'Criar Conta'" :loading="saving" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: AJUSTE DE SALDO ═══════ -->
    <q-dialog v-model="adjustDialog" persistent>
      <q-card class="dialog-md">
        <q-card-section class="row items-center dialog-head">
          <q-icon name="savings" size="20px" class="q-mr-sm" />
          <div class="text-h6">Introduzir Saldo Real</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="adjustDialog = false" />
        </q-card-section>
        <q-card-section class="q-gutter-y-md">
          <div class="text-caption">{{ adjustAccount?.bank_name }} · {{ adjustAccount?.accountNumber }}</div>
          <q-banner dense rounded class="bg-blue-1 text-blue-10">
            Use o valor do <b>extrato bancário</b> (ou do aplicativo M-Pesa). A diferença para o saldo actual
            fica registada no extrato da conta como ajuste.
          </q-banner>
          <div class="text-caption">Saldo actual no sistema: <strong>{{ formatMZN(adjustAccount?.balance) }}</strong></div>
          <q-input
            v-model.number="adjustForm.new_balance"
            type="number" outlined dense prefix="MZN"
            label="Saldo real da conta *"
            :rules="[(v) => (v !== null && v !== undefined && v >= 0) || 'Informe o saldo real (>= 0)']"
          />
          <q-input v-model="adjustForm.description" outlined dense label="Motivo / observação (opcional)" />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancelar" :disable="saving" @click="adjustDialog = false" />
          <q-btn unelevated rounded no-caps color="deep-purple" label="Confirmar Saldo" :loading="saving" @click="submitAdjust" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: TRANSFERÊNCIA ═══════ -->
    <q-dialog v-model="transferDialog" persistent>
      <q-card class="dialog-md">
        <q-card-section class="row items-center dialog-head">
          <q-icon name="swap_horiz" size="20px" class="q-mr-sm" />
          <div class="text-h6">Transferir entre Contas</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="transferDialog = false" />
        </q-card-section>
        <q-card-section class="q-gutter-y-md">
          <q-select
            v-model="transferForm.from_account_id"
            :options="transferAccountOptions"
            outlined dense emit-value map-options
            label="Conta de origem *"
            hint="Contas activas Banco / Mobile Money / e-Wallet"
            :rules="[(v) => !!v || 'Selecione a origem']"
          />
          <q-select
            v-model="transferForm.to_account_id"
            :options="transferAccountOptions.filter((option) => option.value !== transferForm.from_account_id)"
            outlined dense emit-value map-options
            label="Conta de destino *"
            :rules="[(v) => !!v || 'Selecione o destino']"
          />
          <div v-if="transferForm.from_account_id" class="text-caption">
            Saldo na origem: <strong>{{ formatMZN(selectedFromBalance) }}</strong>
            <span v-if="transferAmountInsuficiente" class="text-negative q-ml-sm">⚠ Valor excede o saldo disponível</span>
          </div>
          <q-input
            v-model.number="transferForm.amount"
            type="number" outlined dense prefix="MZN"
            label="Valor *"
            :rules="[(v) => (v > 0) || 'Valor deve ser maior que zero']"
          />
          <q-input v-model="transferForm.description" outlined dense label="Descrição (opcional)" />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancelar" :disable="transferring" @click="transferDialog = false" />
          <q-btn unelevated rounded no-caps color="primary" label="Transferir" :loading="transferring" @click="submitTransfer" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════ DIALOG: EXTRATO ═══════ -->
    <q-dialog v-model="statementDialog">
      <q-card class="dialog-xl">
        <q-card-section class="row items-center dialog-head">
          <q-icon name="receipt_long" size="20px" class="q-mr-sm" />
          <div class="text-h6 ellipsis">{{ statementAccount?.bank_name }} · {{ statementAccount?.accountNumber }}</div>
          <q-space />
          <div class="text-weight-bold q-mr-md">Saldo: {{ formatMZN(statementAccount?.balance) }}</div>
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
                  {{ props.row.type === 'ENTRADA' ? '+' : '−' }} {{ formatMZN(props.row.amount) }}
                </span>
              </q-td>
            </template>
            <template v-slot:body-cell-balanceAfter="props">
              <q-td :props="props" class="text-right text-caption">{{ formatMZN(props.row.balanceAfter) }}</q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { format } from 'date-fns'

/**
 * CONTAS BANCÁRIAS — carteira REAL da empresa (FNB, BCI, BIM, Moza, M-Pesa...).
 * CRUD, toggle is_active, defaults de reembolso/desembolso, ajuste de saldo,
 * transferências entre contas e extrato por conta. Os KPIs do topo separam
 * dinheiro em bancos, mobile money e o que está disponível para desembolsos.
 */
const $q = useQuasar()

const loading = ref(false)
const saving = ref(false)
const accounts = ref([])
const search = ref('')
const purposeFilter = ref('todos')

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100

function formatMZN(value) {
  return `${(Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} MZN`
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm')
  } catch { return '—' }
}

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
const totalGeral = computed(() => round2(activeAccounts.value.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)))

const kpis = computed(() => [
  { label: 'Total em bancos', value: totalBank.value, icon: 'account_balance', color: 'blue-7', bg: 'rgba(37,99,235,0.12)' },
  { label: 'Mobile money / e-wallet', value: totalMobile.value, icon: 'smartphone', color: 'green-7', bg: 'rgba(5,150,105,0.12)' },
  { label: 'Disponível para desembolsos', value: totalDesembolso.value, icon: 'payments', color: 'deep-orange', bg: 'rgba(234,88,12,0.12)' },
  { label: 'Total real (todas as contas)', value: totalGeral.value, icon: 'savings', color: 'deep-purple', bg: 'rgba(124,58,237,0.12)', class: 'text-primary' }
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

function typeLabel(type) {
  const labels = { BANCO: 'Banco', CAIXA_FISICO: 'Caixa', MOBILE_MONEY: 'Mobile Money', EWALLET: 'e-Wallet' }
  return labels[type] || type
}
function typeIcon(type) {
  const icons = { BANCO: 'account_balance', CAIXA_FISICO: 'point_of_sale', MOBILE_MONEY: 'smartphone', EWALLET: 'wallet' }
  return icons[type] || 'account_balance'
}
function purposeColor(purpose) {
  const colors = { DESEMBOLSO: 'orange-8', REEMBOLSO: 'blue-7', RESERVA: 'blue-grey-6', MISTO: 'deep-purple', TAXAS: 'teal' }
  return colors[purpose] || 'grey-6'
}
function purposeTone(purpose) {
  const tones = { DESEMBOLSO: 'orange', REEMBOLSO: 'blue', RESERVA: 'grey', MISTO: 'purple', TAXAS: 'teal' }
  return tones[purpose] || 'blue'
}
function purposeHint(purpose) {
  const hints = {
    DESEMBOLSO: 'Usada nos desembolsos de crédito (dinheiro que sai para o cliente).',
    REEMBOLSO: 'Recebe os pagamentos dos mutuários.',
    MISTO: 'Serve desembolsos e reembolsos.',
    RESERVA: 'Conta de reserva — não entra nos fluxos automáticos.',
    TAXAS: 'Recebe taxas e comissões.'
  }
  return hints[purpose] || ''
}
function balanceClass(balance) {
  const value = Number(balance) || 0
  if (value < 0) return 'text-negative'
  if (value === 0) return 'text-grey-7'
  return 'text-primary'
}

async function fetchAccounts() {
  loading.value = true
  try {
    const { data } = await api.get('/api/bank-accounts')
    if (data.success) accounts.value = data.result || []
  } catch (error) {
    console.error('Erro ao carregar contas:', error)
    $q.notify({ type: 'negative', message: 'Erro ao carregar contas', position: 'top' })
  } finally {
    loading.value = false
  }
}

/* ── Formulário ── */
const formDialog = ref(false)
const emptyForm = () => ({
  id: null,
  type: 'BANCO',
  bank_name: '',
  bank_code: '',
  accountNumber: '',
  accountDescription: '',
  accountHolder: '',
  purpose: 'MISTO',
  currency: 'MZN',
  initial_balance: 0,
  is_default_reembolso: false,
  is_default_desembolso: false
})
const form = ref(emptyForm())

function openFormDialog(account = null) {
  form.value = account
    ? {
        id: account.id,
        type: account.type || 'BANCO',
        bank_name: account.bank_name || '',
        bank_code: account.bank_code || '',
        accountNumber: account.accountNumber || '',
        accountDescription: account.accountDescription || '',
        accountHolder: account.accountHolder || '',
        purpose: account.purpose || 'MISTO',
        currency: account.currency || 'MZN',
        initial_balance: Number(account.initial_balance) || 0,
        is_default_reembolso: Number(account.is_default_reembolso) === 1,
        is_default_desembolso: Number(account.is_default_desembolso) === 1
      }
    : emptyForm()
  formDialog.value = true
}

async function submitForm() {
  const f = form.value
  if (!f.bank_name?.trim() || !f.accountNumber?.trim()) {
    $q.notify({ type: 'warning', message: 'Preencha banco e número da conta', position: 'top' })
    return
  }
  saving.value = true
  try {
    const payload = {
      ...f,
      is_default_reembolso: f.is_default_reembolso ? 1 : 0,
      is_default_desembolso: f.is_default_desembolso ? 1 : 0
    }
    if (f.id) {
      await api.put(`/api/bank-accounts/${f.id}`, payload)
      $q.notify({ type: 'positive', message: 'Conta actualizada!', position: 'top' })
    } else {
      await api.post('/api/bank-accounts', payload)
      $q.notify({ type: 'positive', message: 'Conta criada com sucesso!', position: 'top' })
    }
    formDialog.value = false
    await fetchAccounts()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao guardar conta', position: 'top' })
  } finally {
    saving.value = false
  }
}

async function toggleActive(account, value) {
  try {
    await api.put(`/api/bank-accounts/${account.id}`, { is_active: value ? 1 : 0 })
    account.is_active = value ? 1 : 0
    $q.notify({ type: 'positive', message: value ? 'Conta activada' : 'Conta inactivada', position: 'top', timeout: 1500 })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao alterar estado', position: 'top' })
    await fetchAccounts()
  }
}

/* ── Extrato ── */
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

/* ── Ajuste de saldo real ── */
const adjustDialog = ref(false)
const adjustAccount = ref(null)
const adjustForm = ref({ new_balance: null, description: '' })

function openAdjustDialog(account) {
  adjustAccount.value = account
  adjustForm.value = { new_balance: Number(account.balance) || 0, description: '' }
  adjustDialog.value = true
}

async function submitAdjust() {
  const value = adjustForm.value.new_balance
  if (value === null || value === undefined || value < 0) {
    $q.notify({ type: 'warning', message: 'Informe o saldo real (>= 0)', position: 'top' })
    return
  }
  saving.value = true
  try {
    await api.post(`/api/bank-accounts/${adjustAccount.value.id}/adjust-balance`, {
      new_balance: value,
      description: adjustForm.value.description
    })
    $q.notify({ type: 'positive', message: 'Saldo actualizado com sucesso!', position: 'top' })
    adjustDialog.value = false
    await fetchAccounts()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao ajustar saldo', position: 'top' })
  } finally {
    saving.value = false
  }
}

/* ── Transferências ── */
const transferDialog = ref(false)
const transferring = ref(false)
const transferForm = ref({ from_account_id: null, to_account_id: null, amount: null, description: '' })

const transferAccountOptions = computed(() =>
  activeAccounts.value
    .filter((account) => account.type !== 'CAIXA_FISICO')
    .map((account) => ({
      label: `${account.bank_name || 'Conta'} - ${account.accountNumber} - Saldo: ${formatMZN(account.balance)}`,
      value: account.id
    }))
)

const selectedFromBalance = computed(() => {
  const account = accounts.value.find((item) => item.id === transferForm.value.from_account_id)
  return account ? Number(account.balance) || 0 : 0
})
const transferAmountInsuficiente = computed(() =>
  transferForm.value.from_account_id &&
  Number(transferForm.value.amount) > 0 &&
  Number(transferForm.value.amount) > selectedFromBalance.value
)

function openTransferDialog() {
  transferForm.value = { from_account_id: null, to_account_id: null, amount: null, description: '' }
  transferDialog.value = true
}

async function submitTransfer() {
  const transfer = transferForm.value
  if (!transfer.from_account_id || !transfer.to_account_id || !transfer.amount || Number(transfer.amount) <= 0) {
    $q.notify({ type: 'warning', message: 'Preencha origem, destino e valor', position: 'top' })
    return
  }
  if (transferAmountInsuficiente.value) {
    $q.notify({ type: 'negative', message: 'Saldo insuficiente na conta de origem', position: 'top' })
    return
  }
  transferring.value = true
  try {
    await api.post('/api/bank-accounts/transfer', {
      from_account_id: transfer.from_account_id,
      to_account_id: transfer.to_account_id,
      amount: Number(transfer.amount),
      description: transfer.description || undefined
    })
    $q.notify({ type: 'positive', message: 'Transferência registada com sucesso!', position: 'top' })
    transferDialog.value = false
    await fetchAccounts()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro na transferência', position: 'top' })
  } finally {
    transferring.value = false
  }
}

onMounted(fetchAccounts)
</script>

<style lang="scss" scoped>
.bank-accounts-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
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
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
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
.dialog-xl { width: 900px; max-width: 95vw; border-radius: 18px; }

.dialog-head {
  background: linear-gradient(135deg, $primary, #16a34a);
  color: #fff;
}

body.body--dark {
  .bank-accounts-page { background: #1a1a2e; }
  .account-card { background: $gray-800; border-color: $gray-700; }
  .glass-tile { background: rgba(30, 41, 59, 0.7); border-color: rgba(255, 255, 255, 0.06); }
}
</style>
