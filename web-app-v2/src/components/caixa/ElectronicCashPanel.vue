<template>
  <div class="electronic-caixa">
    <!-- ═══════════ CARREGAMENTO ═══════════ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar o caixa electrónico...</div>
    </div>

    <template v-else>
      <!-- ═══════════ CABEÇALHO ═══════════ -->
      <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section class="row items-center q-py-md">
          <q-icon
            :name="isOpen ? 'account_balance' : 'account_balance_wallet'"
            :color="isOpen ? 'positive' : 'grey-6'"
            size="28px"
            class="q-mr-sm"
          />
          <div class="col">
            <div class="text-subtitle1 text-weight-bold">
              Caixa Electrónico Manual · {{ formatDay(day) }}
              <q-badge :color="isOpen ? 'positive' : register ? 'grey' : 'blue-grey'" class="q-ml-sm" align="middle">
                {{ isOpen ? 'ABERTO' : register ? 'RECONCILIADO' : 'SEM DIA ABERTO' }}
              </q-badge>
            </div>
            <div class="text-caption text-grey-6">
              <template v-if="account">
                Conta {{ account.bank_name || '' }} {{ account.accountNumber || '' }}
                <template v-if="register && !isOpen">
                  · Fechado às {{ formatTime(register.closed_at) }}
                </template>
              </template>
              <template v-else>
                Escolha a conta bancária para abrir o dia.
              </template>
            </div>
          </div>
          <q-btn flat no-caps icon="history" label="Histórico" @click="$router.push('/caixa/historico')" />
        </q-card-section>
      </q-card>

      <!-- ═══════════ CONTA BANCÁRIA (contas JÁ cadastradas) ═══════════ -->
      <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section class="row items-center q-col-gutter-md">
          <div class="col-12 col-md-7">
            <q-select
              v-model="selectedAccountId"
              :options="accountOptions"
              option-value="id"
              option-label="label"
              emit-value
              map-options
              outlined
              dense
              label="Conta bancária do dia"
              :disable="!!register"
              :loading="loadingAccounts"
            >
              <template v-slot:prepend><q-icon name="account_balance" size="18px" /></template>
              <template v-slot:no-option>
                <q-item><q-item-section class="text-grey-6">Sem contas bancárias cadastradas</q-item-section></q-item>
              </template>
            </q-select>
          </div>
          <div class="col-12 col-md-5 text-md-right">
            <div class="text-caption text-grey-6">Saldo actual na conta (sistema)</div>
            <div class="text-subtitle1 text-weight-bold" style="font-variant-numeric: tabular-nums">
              {{ selectedAccount ? formatMZN(selectedAccount.balance) : '—' }}
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- ═══════════ ABERTURA DO DIA ═══════════ -->
      <q-card v-if="!register" flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section class="q-pb-none">
          <div class="text-subtitle2 text-weight-bold">
            <q-icon name="wb_sunny" size="18px" class="q-mr-xs" color="orange-7" />
            1. Abertura — saldo que vê no banco hoje de manhã
          </div>
          <div class="text-caption text-grey-6 q-mt-xs">
            Introduza o saldo inicial da conta escolhida. O sistema usa-o como ponto de partida da reconciliação.
          </div>
        </q-card-section>
        <q-card-section class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-5">
            <q-input
              v-model="openForm.manual_balance_start"
              type="number"
              step="0.01"
              outlined
              dense
              prefix="MT"
              label="Saldo Inicial na conta hoje de manhã"
              :disable="!selectedAccountId"
              :rules="[v => v !== '' && v !== null && Number.isFinite(Number(v)) || 'Informe o saldo inicial']"
            />
          </div>
          <div class="col-12 col-md-3">
            <q-input v-model="openForm.date" type="date" outlined dense label="Data" :rules="[v => !!v || 'Indique a data']" />
          </div>
          <div class="col-12 col-md-4">
            <q-btn
              color="primary"
              unelevated
              no-caps
              class="full-width"
              icon="lock_open"
              label="Abrir Dia Electrónico"
              :loading="saving"
              :disable="!selectedAccountId"
              @click="submitOpen"
            />
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-caption text-grey-6">
            <q-icon name="info" size="13px" class="q-mr-xs" />
            Em modo electrónico não é necessário abrir caixa físico: desembolsos e pagamentos continuam a funcionar.
          </div>
        </q-card-section>
      </q-card>

      <!-- ═══════════ MOVIMENTO AUTOMÁTICO DO SISTEMA ═══════════ -->
      <div v-if="account" class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-4">
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section>
              <div class="text-caption text-grey-6">Entradas na conta (hoje)</div>
              <div class="text-h6 text-positive text-weight-bold" style="font-size: 19px">
                {{ formatMZN(view.theoretical.entradas) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section>
              <div class="text-caption text-grey-6">Saídas na conta (hoje)</div>
              <div class="text-h6 text-negative text-weight-bold" style="font-size: 19px">
                {{ formatMZN(view.theoretical.saidas) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section>
              <div class="text-caption text-grey-6">Saldo teórico do sistema</div>
              <div class="text-h6 text-primary text-weight-bold" style="font-size: 19px">
                {{ register ? formatMZN(view.theoretical.teorico) : '—' }}
              </div>
              <div v-if="register" class="text-caption text-grey-5" style="font-size: 10px">
                {{ formatMZN(view.theoretical.saldo_inicial) }} inicial + movimentos
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card v-if="account" flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section class="row items-center q-py-sm">
          <div class="col">
            <div class="text-subtitle2 text-weight-bold">
              <q-icon name="sync_alt" size="18px" class="q-mr-xs" color="primary" />
              2. Movimento Automático do Sistema
            </div>
            <div class="text-caption text-grey-6">
              Entradas e saídas lançadas na conta {{ account.bank_name || '' }} {{ account.accountNumber || '' }} — só leitura.
            </div>
          </div>
          <div class="col-auto">
            <q-btn flat round dense icon="refresh" :loading="loadingView" @click="loadView">
              <q-tooltip>Actualizar movimentos</q-tooltip>
            </q-btn>
          </div>
        </q-card-section>
        <q-separator />
        <div v-if="view.movements.length === 0" class="text-center q-pa-lg text-grey-6">
          <q-icon name="receipt_long" size="34px" color="grey-4" />
          <div class="text-caption q-mt-sm">Sem movimentos automáticos nesta conta hoje.</div>
        </div>
        <q-table
          v-else
          flat
          dense
          :rows="view.movements"
          :columns="movementColumns"
          row-key="id"
          :rows-per-page-options="[0]"
          hide-bottom
        >
          <template v-slot:body-cell-type="props">
            <q-td :props="props">
              <q-badge :color="props.row.type === 'ENTRADA' ? 'positive' : 'negative'">
                {{ props.row.type === 'ENTRADA' ? 'Entrada' : 'Saída' }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-amount="props">
            <q-td :props="props" class="text-weight-medium" style="font-variant-numeric: tabular-nums">
              {{ formatMZN(props.row.amount) }}
            </q-td>
          </template>
          <template v-slot:body-cell-createdAt="props">
            <q-td :props="props">{{ formatTime(props.row.createdAt) }}</q-td>
          </template>
        </q-table>
      </q-card>

      <!-- ═══════════ FECHO / RECONCILIAÇÃO ═══════════ -->
      <q-card v-if="register && isOpen" flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section class="q-pb-none">
          <div class="text-subtitle2 text-weight-bold">
            <q-icon name="fact_check" size="18px" class="q-mr-xs" color="primary" />
            3. Fecho — saldo final real que vê no banco agora
          </div>
          <div class="text-caption text-grey-6 q-mt-xs">
            O sistema compara o saldo real com o teórico e apura a diferença.
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input
            v-model="closeForm.manual_balance_end"
            type="number"
            step="0.01"
            outlined
            dense
            prefix="MT"
            label="Saldo Final Real no banco agora"
            :rules="[v => v !== '' && v !== null && Number.isFinite(Number(v)) || 'Informe o saldo final real']"
          />
          <q-input
            v-model="closeForm.observations"
            outlined
            dense
            type="textarea"
            rows="2"
            label="Observações (opcional)"
            hint="Ex.: transferência ainda em trânsito, comissão bancária, etc."
          />
          <div class="row justify-end">
            <q-btn
              color="negative"
              unelevated
              no-caps
              icon="done_all"
              label="Reconciliar"
              :loading="saving"
              @click="submitReconcile"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- ═══════════ RESULTADO DA RECONCILIAÇÃO ═══════════ -->
      <q-card v-if="register && !isOpen" flat bordered style="border-radius: 12px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon
            :name="Math.abs(Number(register.difference)) < 0.01 ? 'check_circle' : 'warning'"
            :color="Math.abs(Number(register.difference)) < 0.01 ? 'positive' : 'warning'"
            size="24px"
            class="q-mr-sm"
          />
          <div class="text-subtitle2 text-weight-bold">
            Dia reconciliado · diferença
            <strong :class="Math.abs(Number(register.difference)) < 0.01 ? 'text-positive' : 'text-negative'">
              {{ formatMZN(register.difference) }}
            </strong>
          </div>
        </q-card-section>
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey-6">Saldo inicial</div>
              <div class="text-weight-bold">{{ formatMZN(register.manual_balance_start) }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey-6">Saldo teórico</div>
              <div class="text-weight-bold">{{ formatMZN(view.theoretical.teorico) }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey-6">Saldo real no banco</div>
              <div class="text-weight-bold">{{ formatMZN(register.manual_balance_end) }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey-6">Estado</div>
              <q-badge
                :color="Math.abs(Number(register.difference)) < 0.01 ? 'positive' : (Number(register.difference) > 0 ? 'info' : 'negative')"
                :label="Math.abs(Number(register.difference)) < 0.01 ? 'CONFORME' : (Number(register.difference) > 0 ? 'SOBRA' : 'QUEBRA')"
              />
            </div>
          </div>
          <div v-if="register.observations" class="text-caption text-grey-7 q-mt-md">
            <q-icon name="notes" size="13px" class="q-mr-xs" />{{ register.observations }}
          </div>
        </q-card-section>
      </q-card>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { format, parseISO } from 'date-fns'

/**
 * CAIXA ELECTRÓNICO MANUAL (modo ELECTRONIC)
 * Abre o dia com o saldo da conta bancária, mostra os movimentos automáticos
 * do sistema para essa conta e reconcilia com o saldo real lido no banco.
 * Usa exclusivamente as contas já cadastradas (`accounts`).
 */
const $q = useQuasar()

const loading = ref(false)
const loadingView = ref(false)
const loadingAccounts = ref(false)
const saving = ref(false)

const accounts = ref([])
const selectedAccountId = ref(null)
const day = ref(new Date().toISOString().slice(0, 10))
const view = ref({ register: null, account: null, theoretical: { saldo_inicial: 0, entradas: 0, saidas: 0, teorico: 0 }, movements: [] })

const register = computed(() => view.value.register)
const isOpen = computed(() => !!register.value && String(register.value.status) === 'ABERTO')
const account = computed(() => view.value.account)

const selectedAccount = computed(() =>
  accounts.value.find((a) => Number(a.id) === Number(selectedAccountId.value)) || null
)

const accountOptions = computed(() =>
  accounts.value
    .filter((a) => Number(a.is_active))
    .map((a) => ({
      id: a.id,
      label: `${a.bank_name || a.accountDescription || 'Conta'} · ${a.accountNumber || 'sem número'} (${formatMZN(a.balance)})`
    }))
)

const openForm = ref({
  manual_balance_start: '',
  date: new Date().toISOString().slice(0, 10)
})
const closeForm = ref({ manual_balance_end: '', observations: '' })

const movementColumns = [
  { name: 'createdAt', label: 'Hora', field: 'createdAt', align: 'center' },
  { name: 'type', label: 'Tipo', field: 'type', align: 'center' },
  { name: 'category', label: 'Categoria', field: 'category', align: 'left' },
  { name: 'description', label: 'Descrição', field: 'description', align: 'left' },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right' }
]

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100

function formatMZN(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MZN'
}

function formatDay(value) {
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd/MM/yyyy')
  } catch {
    return value
  }
}

function formatTime(value) {
  if (!value) return '—'
  try {
    return format(new Date(value), 'HH:mm')
  } catch {
    return '—'
  }
}

async function loadAccounts() {
  loadingAccounts.value = true
  try {
    const { data } = await api.get('/api/bank-accounts')
    if (data.success) {
      accounts.value = data.result || []
      // Pré-selecciona a conta marcada para reembolsos (ou a primeira activa).
      const preferred =
        accounts.value.find((a) => Number(a.is_active) && Number(a.is_default_reembolso)) ||
        accounts.value.find((a) => Number(a.is_active))
      if (preferred && !selectedAccountId.value) selectedAccountId.value = preferred.id
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao listar contas bancárias', position: 'top' })
  } finally {
    loadingAccounts.value = false
  }
}

async function loadView() {
  loadingView.value = true
  try {
    const params = { date: day.value }
    if (!register.value && selectedAccountId.value) params.account_id = selectedAccountId.value
    const { data } = await api.get('/api/cash-register/electronic/today', { params })
    if (data.success) {
      view.value = data.result
      day.value = data.result.day
      if (data.result.register?.bank_account_id) {
        selectedAccountId.value = data.result.register.bank_account_id
      }
      if (data.result.register) {
        closeForm.value.manual_balance_end = ''
        closeForm.value.observations = data.result.register.observations || ''
      }
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar o dia electrónico', position: 'top' })
  } finally {
    loadingView.value = false
  }
}

async function submitOpen() {
  if (!selectedAccountId.value) {
    $q.notify({ type: 'warning', message: 'Escolha a conta bancária do dia.', position: 'top' })
    return
  }
  const start = Number(openForm.value.manual_balance_start)
  if (!Number.isFinite(start)) {
    $q.notify({ type: 'warning', message: 'Informe o saldo inicial da conta hoje de manhã.', position: 'top' })
    return
  }

  saving.value = true
  try {
    await api.post('/api/cash-register/electronic/open-day', {
      bank_account_id: Number(selectedAccountId.value),
      manual_balance_start: round2(start),
      date: openForm.value.date || day.value
    })
    $q.notify({ type: 'positive', message: 'Dia electrónico aberto.', position: 'top' })
    day.value = openForm.value.date || day.value
    await loadView()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao abrir o dia electrónico', position: 'top' })
  } finally {
    saving.value = false
  }
}

async function submitReconcile() {
  const end = Number(closeForm.value.manual_balance_end)
  if (!Number.isFinite(end)) {
    $q.notify({ type: 'warning', message: 'Informe o saldo final real que vê no banco agora.', position: 'top' })
    return
  }

  saving.value = true
  try {
    const { data } = await api.post('/api/cash-register/electronic/reconcile', {
      bank_account_id: Number(selectedAccountId.value),
      manual_balance_end: round2(end),
      observations: closeForm.value.observations || null,
      date: day.value
    })
    if (data.success) {
      view.value = data.result
      const diff = Number(data.result?.reconciliacao?.diferenca) || 0
      $q.notify({
        type: Math.abs(diff) < 0.01 ? 'positive' : 'warning',
        message:
          Math.abs(diff) < 0.01
            ? 'Dia reconciliado — saldo conforme.'
            : `Dia reconciliado com diferença de ${formatMZN(diff)}.`,
        position: 'top'
      })
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao reconciliar o dia', position: 'top' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await loadAccounts()
    await loadView()
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.electronic-caixa {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}
body.body--dark .electronic-caixa {
  background: #1a1a2e;
}
</style>
