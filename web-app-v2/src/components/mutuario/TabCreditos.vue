<template>
  <div class="q-pa-md">
    <!-- ===================== SIMULAÇÃO ===================== -->
    <q-card flat bordered style="border-radius: 12px">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="col">
            <div class="text-subtitle1 text-weight-bold">
              <q-icon name="calculate" size="18px" class="q-mr-xs" />Simulação de Crédito
            </div>
            <div class="text-caption text-grey-5">Defina valor, prazo e taxa. O cálculo Price é feito no backend (paridade garantida com o desembolso).</div>
          </div>
          <q-btn color="primary" icon="play_arrow" label="Simular" unelevated no-caps rounded size="sm" :loading="simulating" @click="simulateLoan" />
        </div>
        <q-form ref="simForm" class="row q-col-gutter-sm" @submit.prevent>
          <div class="col-12 col-sm-4">
            <q-input v-model.number="form.capital" dense outlined label="Montante (MZN)" type="number" min="0" :rules="[val => val > 0 || 'Informe o montante']">
              <template v-slot:prepend><q-icon name="attach_money" size="14px" color="grey-5" /></template>
            </q-input>
          </div>
          <div class="col-6 col-sm-4">
            <q-select v-model="form.prestacoes" dense outlined :options="numeroPrestacoes" label="Nº de prestações" emit-value map-options :rules="[val => !!val || 'Escolha o prazo']" />
          </div>
          <div class="col-6 col-sm-4">
            <q-select v-model="form.juros" dense outlined :options="rateOptions" label="Taxa de juros" emit-value map-options :rules="[val => !!val || 'Escolha a taxa']">
              <template v-slot:selected-item="scope">
                {{ scope.opt.label }}
              </template>
            </q-select>
          </div>
        </q-form>

        <!-- Capacidade com barra colorida: verde <60%, amarelo 60-90%, vermelho >100% -->
        <div class="row q-col-gutter-sm q-mt-md items-center" v-if="capacityRatio > 0">
          <div class="col-12">
            <div class="row items-center q-mb-xs">
              <div class="text-caption text-grey-6">
                Capacidade: prestação <strong>{{ formatMoney(estimatedInstallment) }}</strong>
                / limite {{ formatMoney(store.maxCapacity) }} (1/3 de {{ formatMoney(store.customer?.customerMonthlySalary || 0) }})
              </div>
              <q-space />
              <q-badge :color="capacityColor" :label="`${Math.round(capacityRatio * 100)}% da capacidade`" />
            </div>
            <q-linear-progress :value="Math.min(1, capacityRatio)" rounded size="12px" :color="capacityColor" track-color="grey-3" />
          </div>
        </div>
        <div class="row q-col-gutter-sm q-mt-sm" v-else>
          <div class="col-4">
            <div class="text-caption text-grey-5" style="font-size: 10px">Capacidade (1/3)</div>
            <div class="text-weight-bold text-positive">{{ formatMoney(store.maxCapacity) }}</div>
          </div>
          <div class="col-4">
            <div class="text-caption text-grey-5" style="font-size: 10px">Prestação</div>
            <div class="text-weight-bold">—</div>
          </div>
          <div class="col-4">
            <div class="text-caption text-grey-5" style="font-size: 10px">Margem</div>
            <div class="text-weight-bold">—</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ===================== HISTÓRICO / SUBMISSÃO ===================== -->
    <q-card flat bordered class="q-mt-md" style="border-radius: 12px">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="text-subtitle1 text-weight-bold"><q-icon name="history" size="18px" class="q-mr-xs" />Histórico de Empréstimos</div>
          <q-space />
          <q-badge color="grey-6" rounded>{{ store.loans.length }} registo(s)</q-badge>
        </div>

        <!-- BLOQUEIO KYC -->
        <q-banner v-if="!store.isKycComplete" class="bg-warning text-white q-mb-md" rounded>
          <template v-slot:avatar><q-icon name="gpp_maybe" size="28px" /></template>
          <div class="text-weight-bold">Desembolso bloqueado — checklist KYC incompleta</div>
          <div class="text-caption">
            Documentos em falta: <strong>{{ store.kycMissing.join(', ') || '—' }}</strong>.
            Carregue-os na aba <strong>Documentos &amp; KYC</strong> para habilitar a submissão de créditos.
          </div>
          <template v-slot:action>
            <q-btn flat color="white" label="Ir para Documentos" no-caps @click="$emit('go-to-tab', 'docs')" />
          </template>
        </q-banner>

        <div v-if="store.loans.length === 0" class="text-center q-pa-lg text-grey-5">
          <q-icon name="receipt_long" size="40px" />
          <div class="text-caption q-mt-sm">Ainda não há créditos registados.</div>
        </div>
        <div v-else class="row q-col-gutter-md">
          <div class="col-12 col-sm-6 col-md-4" v-for="loan in store.loans" :key="loan.id">
            <q-card flat bordered class="full-height">
              <q-card-section class="text-center bg-grey-2" style="border-radius: 12px 12px 0 0">
                <div class="text-h6 text-weight-bold">{{ formatMoney(loan.amount) }}</div>
                <q-badge :color="loanStatus(loan.status).color" :label="loanStatus(loan.status).label" rounded />
              </q-card-section>
              <q-card-section>
                <div class="row justify-between text-caption">
                  <div>
                    <div class="text-grey-5">Total da dívida</div>
                    <div class="text-weight-bold text-negative">
                      {{ formatMoney((store.loanMetrics[Number(loan.id)]?.contractTotal || loan.amount)) }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-grey-5">Desembolso</div>
                    <div class="text-weight-bold">{{ formatDate(loan.disbursementDate || loan.dateCreated) }}</div>
                  </div>
                </div>
              </q-card-section>
              <q-card-actions align="around">
                <!-- Aprovar/Desembolsar (só pendentes) -->
                <q-btn v-if="Number(loan.status) === 0" flat round dense icon="check_circle" color="positive" size="sm" @click="emit('approve-loan', loan)">
                  <q-tooltip>Aprovar / Desembolsar</q-tooltip>
                </q-btn>
                <q-btn flat round dense icon="table_chart" color="teal" size="sm" :disable="![1, 3].includes(Number(loan.status))" @click="$emit('view-plan', loan)">
                  <q-tooltip>Plano de Amortização</q-tooltip>
                </q-btn>
                <q-btn flat round dense icon="security" color="orange" size="sm" @click="$emit('view-guarantees', loan)">
                  <q-tooltip>Garantias</q-tooltip>
                </q-btn>
                <q-btn flat round dense icon="info" color="teal" size="sm" :disable="![1, 3].includes(Number(loan.status))" @click="$emit('loan-info', loan)">
                  <q-tooltip>Info. Mutuário (Contrato)</q-tooltip>
                </q-btn>
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ===================== DIALOG: PLANO SIMULADO + SUBMISSÃO ===================== -->
    <q-dialog v-model="showSimModal" persistent maximized>
      <q-card style="border-radius: 16px">
        <q-card-section class="row items-center q-pb-none bg-primary text-white">
          <q-icon name="table_chart" size="24px" class="q-mr-sm" />
          <div class="text-h6">Plano de Amortização — Simulação</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showSimModal = false" />
        </q-card-section>
        <q-card-section>
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6 col-sm-3" v-for="item in simSummary" :key="item.label">
              <div class="summary-card">
                <div class="text-caption text-grey-5" style="font-size: 10px">{{ item.label }}</div>
                <div class="text-weight-bold" :class="item.class">{{ item.value }}</div>
              </div>
            </div>
          </div>
          <q-banner class="q-mb-md" rounded :class="capacityExceeded ? 'bg-orange-1 text-orange-10' : 'bg-green-1 text-green-10'">
            <template v-slot:avatar>
              <q-icon :name="capacityExceeded ? 'warning' : 'check_circle'" :color="capacityExceeded ? 'orange' : 'positive'" size="20px" />
            </template>
            <div class="text-weight-medium" style="font-size: 13px">
              {{ capacityExceeded ? 'Prestação acima da capacidade' : 'Dentro da capacidade' }}
            </div>
            <div class="text-caption">
              Prestação: {{ formatMoney(estimatedInstallment) }} | Limite: {{ formatMoney(store.maxCapacity) }}
            </div>
          </q-banner>
          <q-table :rows="simRows" :columns="simColumns" row-key="installmentOrder" flat dense hide-bottom :rows-per-page-options="[0]" class="q-mb-md" style="font-size: 12px">
            <template v-slot:body-cell-amortization="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.amortization) }}</q-td></template>
            <template v-slot:body-cell-rateAmount="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.rateAmount) }}</q-td></template>
            <template v-slot:body-cell-installment="props"><q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td></template>
            <template v-slot:body-cell-remainingBalance="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.remainingBalance) }}</q-td></template>
            <template v-slot:body-cell-dueDate="props"><q-td :props="props" class="text-right">{{ formatDateShort(props.row.dueDate) }}</q-td></template>
          </q-table>

          <q-separator class="q-mb-md" />
          <div class="text-subtitle1 text-weight-bold q-mb-md"><q-icon name="send" size="18px" class="q-mr-xs" />Submissão do Crédito</div>
          <q-form ref="submitFormRef" class="row q-col-gutter-md" @submit.prevent>
            <div class="col-12 col-sm-6">
              <q-select v-model="form.loanDescription" dense outlined use-input fill-input hide-selected input-debounce="0" label="Finalidade do crédito *" :options="filteredPurposeOptions" @filter="filterPurposeOptions" :rules="[val => !!val || 'Informe a finalidade']" />
            </div>
            <div class="col-6 col-sm-3">
              <q-input v-model="form.dateCreated" dense outlined label="Data *" type="date" :max="todayDate" :rules="[val => !!val || 'Informe a data']" />
            </div>
            <div class="col-6 col-sm-3">
              <q-select v-model="form.creditManager" dense outlined :options="managerOptions" label="Gestor *" emit-value map-options :rules="[val => !!val || 'Escolha o gestor']" />
            </div>
          </q-form>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showSimModal = false" />
          <q-btn
            unelevated
            label="Submeter Crédito"
            color="positive"
            icon="send"
            no-caps
            rounded
            :loading="store.submitting"
            :disable="!canSubmit || !store.isKycComplete"
            @click="onSubmitClick"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== DIALOG: PARECER DE EXCESSO DE CAPACIDADE ===================== -->
    <q-dialog v-model="showCapacityDialog" persistent>
      <q-card style="border-radius: 16px; min-width: 480px; max-width: 95vw">
        <q-card-section class="row items-center bg-negative text-white">
          <q-icon name="report" size="24px" class="q-mr-sm" />
          <div class="text-h6">Excesso de Capacidade — Parecer Obrigatório</div>
        </q-card-section>
        <q-card-section>
          <q-banner class="bg-orange-1 text-orange-10 q-mb-md" rounded dense>
            A prestação de <strong>{{ formatMoney(estimatedInstallment) }}</strong> excede o limite de
            <strong>{{ formatMoney(store.maxCapacity) }}</strong> (1/3 do rendimento). Justifique com parecer válido.
          </q-banner>
          <q-form ref="capacityFormRef" class="q-gutter-md" @submit.prevent>
            <q-select
              v-model="capacityForm.reason"
              dense outlined
              label="Motivo do excesso *"
              :options="capacityReasons"
              :rules="[val => !!val || 'Seleccione o motivo']"
            />
            <q-input
              v-model="capacityForm.observation"
              dense outlined
              type="textarea"
              rows="4"
              label="Parecer / justificativa (mínimo 50 caracteres) *"
              :rules="[val => (String(val || '').trim().length >= 50) || 'O parecer deve ter no mínimo 50 caracteres']"
              counter
              maxlength="1000"
            />
            <div class="text-caption text-grey-6">{{ String(capacityForm.observation || '').trim().length }}/50 caracteres mínimos</div>
            <q-file
              v-model="capacityForm.parecerFile"
              dense outlined
              label="Parecer em PDF (obrigatório)"
              accept=".pdf"
              :rules="[val => !!val || 'Anexe o parecer em PDF']"
            >
              <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
            </q-file>
          </q-form>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showCapacityDialog = false" />
          <q-btn
            unelevated
            label="Confirmar e Submeter"
            color="negative"
            icon="send"
            no-caps
            rounded
            :loading="store.submitting"
            :disable="!capacityFormValid"
            @click="confirmExcessSubmit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { formatMoney, formatDateShort } from '@/utils/formatters'

const $q = useQuasar()
const store = useMutuarioStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const emit = defineEmits(['go-to-tab', 'view-plan', 'view-guarantees', 'loan-info', 'approve-loan'])

const simulating = ref(false)
const showSimModal = ref(false)
const showCapacityDialog = ref(false)
const estimatedInstallment = ref(0)
const simRows = ref([])
const submitFormRef = ref(null)
const capacityFormRef = ref(null)

const form = ref({
  capital: 0, prestacoes: null, juros: null, creditManager: null,
  loanDescription: '', capacityExcessObservation: '',
  dateCreated: new Date().toISOString().split('T')[0]
})

const capacityForm = ref({ reason: null, observation: '', parecerFile: null })
const capacityReasons = [
  'Rendimento comprovado adicional (extratos/outras fontes)',
  'Comerciante com fluxo de caixa sazonal',
  'Histórico de crédito anterior sem incumprimento',
  'Garantia adicional apresentada pelo mutuário',
  'Outro (justificado no parecer)'
]

const todayDate = new Date().toISOString().split('T')[0]
const numeroPrestacoes = Array.from({ length: 18 }, (_, i) => ({ label: `${i + 1} prestação${i > 0 ? 's' : ''}`, value: i + 1 }))
const rateOptions = ref([{ label: 'Taxa de juros', value: null }])
const managerOptions = ref([{ label: 'Selecionar Gestor', value: null }])

const purposeOptions = ['Comércio', 'Criação de animais', 'Educação', 'Habitação', 'Negócio', 'Saúde', 'Transporte', 'Outro']
const filteredPurposeOptions = ref([...purposeOptions])
function filterPurposeOptions(value, update) {
  update(() => {
    const needle = String(value || '').toLowerCase()
    filteredPurposeOptions.value = needle
      ? purposeOptions.filter(p => p.toLowerCase().includes(needle))
      : [...purposeOptions]
  })
}

const selectedRate = computed(() => {
  const rate = settingsStore.rates.find(r => r.id === form.value.juros)
  return rate ? Number(rate.tax) : 0
})

// Rótulo SEMPRE com % a.m. e % a.a. (taxa mensal × 12)
const rateLabel = (tax) => `${(tax * 100).toFixed(1)}% a.m. (${(tax * 12 * 100).toFixed(0)}% a.a.)`

const capacityRatio = computed(() =>
  store.maxCapacity > 0 && estimatedInstallment.value > 0
    ? estimatedInstallment.value / store.maxCapacity
    : 0
)
const capacityColor = computed(() =>
  capacityRatio.value > 1 ? 'negative' : capacityRatio.value >= 0.6 ? 'warning' : 'positive'
)
const capacityExceeded = computed(() => capacityRatio.value > 1)

const capacityFormValid = computed(() =>
  !!capacityForm.value.reason &&
  String(capacityForm.value.observation || '').trim().length >= 50 &&
  !!capacityForm.value.parecerFile
)

const canSubmit = computed(() =>
  Number(form.value.capital) > 0 &&
  !!form.value.prestacoes &&
  !!form.value.juros &&
  !!form.value.creditManager &&
  !!String(form.value.loanDescription || '').trim() &&
  !!form.value.dateCreated
)

const simSummary = computed(() => [
  { label: 'Capital', value: formatMoney(form.value.capital), class: 'text-primary' },
  { label: 'Taxa', value: rateLabel(selectedRate.value), class: '' },
  { label: 'Prestações', value: `${form.value.prestacoes}x`, class: '' },
  { label: 'Total a pagar', value: formatMoney(store.simulation?.totalToPay || 0), class: 'text-positive' }
])

const simColumns = [
  { name: 'installmentOrder', label: 'Ordem', field: 'installmentOrder', align: 'center' },
  { name: 'amortization', label: 'Amortização', field: 'amortization', align: 'right' },
  { name: 'rateAmount', label: 'Juros', field: 'rateAmount', align: 'right' },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right' },
  { name: 'remainingBalance', label: 'Saldo', field: 'remainingBalance', align: 'right' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'right' }
]

function loanStatus(status) {
  const s = Number(status)
  return { 0: { color: 'orange', label: 'Pendente' }, 1: { color: 'positive', label: 'Activo' }, '-1': { color: 'negative', label: 'Rejeitado' }, 3: { color: 'positive', label: 'Terminado' } }[s] || { color: 'grey', label: 'Desconhecido' }
}
function formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleDateString('pt-MZ') : '—' }

// ── SIMULAÇÃO: cálculo no BACKEND via POST /api/loan/simulate ──
async function simulateLoan() {
  const capital = Number(form.value.capital)
  const prestacoes = Number(form.value.prestacoes)
  const rate = Number(selectedRate.value)
  if (!(capital > 0) || !Number.isInteger(prestacoes) || prestacoes < 1 || !(rate > 0)) {
    $q.notify({ type: 'warning', message: 'Preencha montante, prazo e taxa', position: 'top' })
    return
  }
  simulating.value = true
  try {
    const result = await store.simulate({
      amount: capital,
      installments: prestacoes,
      monthlyRate: rate,
      dateCreated: form.value.dateCreated
    })
    simRows.value = result.plan || []
    estimatedInstallment.value = result.installment || 0
    showSimModal.value = true
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro ao simular', position: 'top' })
  } finally {
    simulating.value = false
  }
}

function onSubmitClick() {
  // Excesso de capacidade → QDialog obrigatório com parecer (mín. 50 chars + PDF)
  if (capacityExceeded.value) {
    capacityForm.value = { reason: null, observation: '', parecerFile: null }
    showCapacityDialog.value = true
    return
  }
  submitLoan()
}

async function confirmExcessSubmit() {
  const valid = await capacityFormRef.value.validate()
  if (!valid) return
  // Upload do parecer em PDF (via /api/document/upload) + parecer no crédito
  try {
    let parecerUrl = ''
    if (capacityForm.value.parecerFile) {
      const fd = new FormData()
      fd.append('file', capacityForm.value.parecerFile)
      const { data: up } = await import('@/boot/axios').then(m => m.api.post('/api/document/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }))
      if (up?.success) parecerUrl = up.documentFileUrl || ''
    }
    const fullObservation = `[${capacityForm.value.reason}] ${String(capacityForm.value.observation).trim()}${parecerUrl ? ` (parecer: ${parecerUrl})` : ''}`
    form.value.capacityExcessObservation = fullObservation
    showCapacityDialog.value = false
    await submitLoan(fullObservation)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro ao anexar parecer', position: 'top' })
  }
}

async function submitLoan(observationOverride) {
  const valid = await submitFormRef.value.validate()
  if (!valid) return
  try {
    const data = await store.submitLoan({
      accountNumber: store.customer.accountNumber,
      companyId: store.customer.companyId,
      amount: Number(form.value.capital),
      numberOfInstallments: Number(form.value.prestacoes),
      interestRate: Number(selectedRate.value),
      creditManager: form.value.creditManager,
      loanDescription: String(form.value.loanDescription || '').trim(),
      capacityExcessObservation: observationOverride || form.value.capacityExcessObservation || '',
      dateCreated: form.value.dateCreated,
      status: 0
    })
    if (data.success === false) throw new Error(data.message || 'Erro ao submeter')
    $q.notify({ type: 'positive', message: 'Crédito submetido com sucesso', position: 'top' })
    showSimModal.value = false
    form.value.capital = 0
    form.value.prestacoes = null
    form.value.juros = null
    form.value.loanDescription = ''
    estimatedInstallment.value = 0
    simRows.value = []
    await store.fetchLoans()
  } catch (e) {
    // KYC_INCOMPLETE devolvido pelo backend (defesa em profundidade)
    if (e.response?.data?.error === 'KYC_INCOMPLETE') {
      $q.notify({ type: 'negative', message: `KYC incompleto: ${e.response.data.missing?.join(', ')}`, position: 'top' })
    } else {
      $q.notify({ type: 'negative', message: e.response?.data?.message || e.message || 'Erro ao submeter crédito', position: 'top' })
    }
  }
}

onMounted(async () => {
  try {
    await settingsStore.fetchRates(authStore.companyId)
    // Rótulo sempre em % a.m. e % a.a.
    rateOptions.value = settingsStore.rates.map(r => ({ label: rateLabel(Number(r.tax)), value: r.id }))
  } catch { /* silent */ }
  try {
    await settingsStore.fetchUsers(authStore.companyId)
    managerOptions.value = settingsStore.users
      .filter(u => u.userRole === 1 || u.userRole === 3)
      .map(u => ({ label: u.name, value: u.id }))
    const currentUser = managerOptions.value.find(m => Number(m.value) === Number(authStore.user?.id))
    if (!form.value.creditManager && currentUser) form.value.creditManager = currentUser.value
  } catch { /* silent */ }
})
</script>

<style lang="scss" scoped>
.summary-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fafafa;
}
</style>
