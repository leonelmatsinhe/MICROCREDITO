<template>
  <div class="q-pa-md bank-accounts-page">
    <!-- ═══════════ CABEÇALHO ═══════════ -->
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="row items-center q-py-md">
        <q-icon name="account_balance" size="28px" color="primary" class="q-mr-sm" />
        <div class="col">
          <div class="text-subtitle1 text-weight-bold">Contas Bancárias — Carteira Real</div>
          <div class="text-caption text-grey-6">
            Saldos geridos pela tesouraria (desembolsos, reembolsos e transferências).
          </div>
        </div>
        <div class="text-caption q-mr-md">
          Total em bancos: <strong class="text-primary">{{ formatMZN(totalBank) }}</strong>
          <span class="q-ml-sm">Mobile: <strong>{{ formatMZN(totalMobile) }}</strong></span>
        </div>
        <q-btn color="primary" unelevated no-caps icon="add" label="Nova Conta" @click="openFormDialog()" />
      </q-card-section>
    </q-card>

    <!-- ═══════════ TABELA DE CONTAS ═══════════ -->
    <q-card flat bordered style="border-radius: 12px; overflow: hidden">
      <q-table
        :rows="accounts"
        :columns="columns"
        row-key="id"
        flat
        bordered
        dense
        separator="horizontal"
        :rows-per-page-options="[10, 25]"
        :loading="loading"
        no-data-label="Nenhuma conta registada. Clique em 'Nova Conta'."
      >
        <!-- Banco + número -->
        <template v-slot:body-cell-bank="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.bank_name || '—' }}</div>
            <div class="text-caption text-grey-6">{{ props.row.accountNumber }}</div>
          </q-td>
        </template>

        <!-- Finalidade (chip) -->
        <template v-slot:body-cell-purpose="props">
          <q-td :props="props" class="text-center">
            <q-chip outline dense color="primary" style="font-size: 10px">{{ props.row.purpose }}</q-chip>
          </q-td>
        </template>

        <!-- Saldo -->
        <template v-slot:body-cell-balance="props">
          <q-td :props="props" class="text-right text-weight-bold">{{ formatMZN(props.row.balance) }}</q-td>
        </template>

        <!-- Defaults -->
        <template v-slot:body-cell-defaults="props">
          <q-td :props="props" class="text-center">
            <q-badge v-if="Number(props.row.is_default_reembolso)" color="green" label="Reembolso" style="margin-right: 4px" />
            <q-badge v-if="Number(props.row.is_default_desembolso)" color="orange" label="Desembolso" />
            <span v-if="!Number(props.row.is_default_reembolso) && !Number(props.row.is_default_desembolso)">—</span>
          </q-td>
        </template>

        <!-- Estado + acções -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn flat round dense size="sm" icon="visibility" color="primary" @click="openStatement(props.row)">
              <q-tooltip>Ver extrato</q-tooltip>
            </q-btn>
            <q-btn flat round dense size="sm" icon="edit" color="primary" @click="openFormDialog(props.row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-toggle
              :model-value="Number(props.row.is_active) === 1"
              @update:model-value="toggleActive(props.row, $event)"
              dense
              color="positive"
              class="q-ml-xs"
            >
              <q-tooltip>{{ Number(props.row.is_active) ? 'Inactivar conta' : 'Activar conta' }}</q-tooltip>
            </q-toggle>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- ═══════════ DIALOG: FORMULÁRIO DE CONTA ═══════════ -->
    <q-dialog v-model="formDialog" persistent>
      <q-card style="min-width: 480px; max-width: 95vw; border-radius: 12px">
        <q-card-section class="text-h6">
          {{ form.id ? 'Editar Conta' : 'Nova Conta Bancária' }}
        </q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-none">
          <q-select
            v-model="form.type"
            :options="typeOptions"
            outlined
            dense
            emit-value
            map-options
            label="Tipo *"
            :rules="[v => !!v || 'Seleccione o tipo']"
          />
          <q-input v-model="form.bank_name" outlined dense label="Banco / Operador *" hint="Ex.: FNB, BCI, BIM, Moza, M-Pesa, e-Mola" :rules="[v => !!(v && v.trim()) || 'Informe o banco']" />
          <q-input v-model="form.bank_code" outlined dense label="Código do banco (SWIFT/ABI)" />
          <q-input v-model="form.accountNumber" outlined dense label="Número da conta / telefone *" :rules="[v => !!(v && v.trim()) || 'Informe o número']" />
          <q-input v-model="form.accountDescription" outlined dense label="Descrição" />
          <q-input v-model="form.accountHolder" outlined dense label="Titular" />
          <q-select
            v-model="form.purpose"
            :options="purposeOptions"
            outlined
            dense
            emit-value
            map-options
            label="Finalidade *"
            hint="Filtros usados nos forms de desembolso/pagamento"
            :rules="[v => !!v || 'Seleccione a finalidade']"
          />
          <q-select
            v-model="form.currency"
            :options="['MZN', 'USD', 'ZAR']"
            outlined
            dense
            label="Moeda"
          />
          <q-input
            v-if="!form.id"
            v-model.number="form.initial_balance"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Saldo de partida (referência)"
            hint="O saldo operacional começa em 0; movimentos reais elevam o saldo."
          />
          <div class="row q-gutter-sm">
            <q-toggle v-model="form.is_default_reembolso" label="Default para Reembolsos" dense />
            <q-toggle v-model="form.is_default_desembolso" label="Default para Desembolsos" dense />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn unelevated no-caps color="primary" :label="form.id ? 'Guardar' : 'Criar Conta'" :loading="saving" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: EXTRATO DA CONTA ═══════════ -->
    <q-dialog v-model="statementDialog" persistent maximized="sm">
      <q-card style="min-width: 760px; max-width: 95vw; border-radius: 12px">
        <q-card-section class="row items-center">
          <div class="text-h6">
            Extrato — {{ statementAccount?.bank_name }} {{ statementAccount?.accountNumber }}
          </div>
          <q-space />
          <div class="text-weight-bold text-primary q-mr-md">
            Saldo: {{ formatMZN(statementAccount?.balance) }}
          </div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section style="max-height: 65vh" class="scroll">
          <q-table
            :rows="statementRows"
            :columns="statementColumns"
            row-key="id"
            flat
            bordered
            dense
            separator="horizontal"
            :rows-per-page-options="[15, 30, 50]"
            no-data-label="Sem movimentos nesta conta."
          >
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
        <q-card-actions align="right">
          <q-btn flat no-caps label="Fechar" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { format } from 'date-fns'

/**
 * CONTAS BANCÁRIAS — CRUD da carteira real (FNB, BCI, BIM, Moza, M-Pesa...).
 * Toggle is_active, defaults de reembolso/desembolso e extrato por conta.
 */
const $q = useQuasar()

const loading = ref(false)
const saving = ref(false)
const accounts = ref([])

// ─── Formatação ───
function formatMZN(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MZN'
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm')
  } catch { return '—' }
}

// ─── Totais (cards do cabeçalho) ───
const totalBank = computed(() =>
  round2(accounts.value.filter(a => a.type === 'BANCO' && Number(a.is_active)).reduce((sum, a) => sum + (Number(a.balance) || 0), 0))
)
const totalMobile = computed(() =>
  round2(accounts.value.filter(a => (a.type === 'MOBILE_MONEY' || a.type === 'EWALLET') && Number(a.is_active)).reduce((sum, a) => sum + (Number(a.balance) || 0), 0))
)
const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100

// ─── Tabela ───
const columns = [
  { name: 'bank', label: 'Bank / Número', field: 'bank_name', align: 'left' },
  { name: 'type', label: 'Tipo', field: 'type', align: 'center' },
  { name: 'purpose', label: 'Finalidade', field: 'purpose', align: 'center' },
  { name: 'balance', label: 'Saldo Atual', field: 'balance', align: 'right', sortable: true },
  { name: 'defaults', label: 'Defaults', field: 'is_default_reembolso', align: 'center' },
  { name: 'actions', label: 'Acções', field: 'id', align: 'center' }
]

// ─── Opções dos selects ───
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

// ─── API ───
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

// ─── Formulário ───
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
    const payload = { ...f, is_default_reembolso: f.is_default_reembolso ? 1 : 0, is_default_desembolso: f.is_default_desembolso ? 1 : 0 }
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

// ─── Toggle activa/inactiva ───
async function toggleActive(account, value) {
  try {
    await api.put(`/api/bank-accounts/${account.id}`, { is_active: value ? 1 : 0 })
    account.is_active = value ? 1 : 0
    $q.notify({
      type: 'positive',
      message: value ? 'Conta activada' : 'Conta inactivada',
      position: 'top',
      timeout: 1500
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao alterar estado', position: 'top' })
    await fetchAccounts()
  }
}

// ─── Extrato por conta ───
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
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar extrato', position: 'top' })
  }
}

// ─── Mount ───
onMounted(fetchAccounts)
</script>

<style lang="scss" scoped>
.bank-accounts-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}
body.body--dark .bank-accounts-page {
  background: #1a1a2e;
}
</style>
