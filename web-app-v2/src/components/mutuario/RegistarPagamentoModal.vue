<template>
  <q-dialog v-model="show" persistent transition-show="scale" transition-hide="fade">
    <q-card class="pm-card">
      <!-- ── HEADER ESCURO ── -->
      <q-card-section class="pm-header row items-center q-py-md q-px-lg">
        <q-avatar size="36px" class="pm-header-avatar">
          <q-icon name="credit_card" size="20px" />
        </q-avatar>
        <div class="q-ml-sm col">
          <div class="text-subtitle1 text-weight-bold text-white" style="line-height: 1.2">
            {{ title }} — {{ ordem }}ª Prestação
          </div>
          <div class="text-caption pm-header-sub">
            Vence a {{ formatDateShort(installment?.dueDate) }} · {{ customerName }}
          </div>
        </div>
        <q-badge class="pm-badge q-mr-sm" :label="formatMoney(totalDevido)" />
        <q-btn flat round dense icon="close" class="text-white" @click="close" />
      </q-card-section>

      <q-card-section class="q-px-lg q-py-md scroll" style="max-height: calc(92vh - 150px)">
        <!-- ── SECÇÃO 1: RESUMO FINANCEIRO ── -->
        <div class="pm-section-title">
          <q-icon name="insights" size="15px" class="q-mr-xs" /> Resumo Financeiro
        </div>
        <div class="row q-col-gutter-sm q-mb-xs">
          <div class="col-6 col-sm-3">
            <div class="pm-kpi">
              <q-icon name="request_quote" size="17px" class="pm-kpi-icon text-positive" />
              <div class="text-caption pm-kpi-label">Prestação</div>
              <div class="text-weight-bold text-positive" style="font-size: 14px">{{ formatMoney(installment?.installment || 0) }}</div>
            </div>
          </div>
          <div class="col-6 col-sm-3">
            <div class="pm-kpi">
              <q-icon name="hourglass_top" size="17px" class="pm-kpi-icon text-grey-7" />
              <div class="text-caption pm-kpi-label">Em falta</div>
              <div class="text-weight-bold" style="font-size: 14px">{{ formatMoney(saldoEmFalta) }}</div>
            </div>
          </div>
          <div class="col-6 col-sm-3">
            <div class="pm-kpi">
              <q-icon name="trending_up" size="17px" class="pm-kpi-icon text-negative" />
              <div class="text-caption pm-kpi-label">Mora</div>
              <div class="text-weight-bold" :class="quoteLate > 0 ? 'text-negative' : 'text-grey-7'" style="font-size: 14px">
                {{ formatMoney(quoteLate) }}
              </div>
            </div>
          </div>
          <div class="col-6 col-sm-3">
            <div class="pm-kpi pm-kpi-total">
              <q-icon name="account_balance_wallet" size="17px" class="pm-kpi-icon text-negative" />
              <div class="text-caption pm-kpi-label">Total a pagar</div>
              <div class="text-weight-bold text-negative" style="font-size: 14px">{{ formatMoney(totalDevido) }}</div>
            </div>
          </div>
          <div class="col-12">
            <div class="text-caption text-grey-6" style="font-size: 11px">
              Capital: <strong>{{ formatMoney(quoteCapital) }}</strong>
              · Juros: <strong>{{ formatMoney(quoteJuros) }}</strong>
              · Mora: <strong class="text-negative">{{ formatMoney(quoteLate) }}</strong>
              <span v-if="quoteLate > 0 && store.quote?.lateSource" class="text-grey-5">(mora: {{ store.quote.lateSource === 'accruals' ? 'registo diário' : 'fórmula' }})</span>
              <template v-if="Number(store.quote?.customerCredit) > 0">
                · Crédito a favor: <strong class="text-positive">−{{ formatMoney(store.quote.customerCredit) }}</strong>
              </template>
              <template v-if="selectedBankAccount && !isGestor">
                · Destino: <strong>{{ selectedBankAccount.name }}</strong> ({{ selectedBankAccount.purpose }})
              </template>
            </div>
          </div>
        </div>

        <q-separator class="q-my-sm" />

        <!-- ── SECÇÃO 2: DADOS DO PAGAMENTO ── -->
        <div class="pm-section-title">
          <q-icon name="edit_note" size="15px" class="q-mr-xs" /> Dados do Pagamento
        </div>

        <!-- ── BANNER DE BLINDAGEM DE PAGAMENTOS (GESTOR DE CRÉDITO) ── -->
        <div class="q-mb-sm" v-if="isGestor">
          <q-banner dense rounded class="bg-green-1 text-green-10" style="border: 1px solid #bbf7d0; border-radius: 8px;">
            <template v-slot:avatar><q-icon name="verified_user" color="positive" size="22px" /></template>
            <div class="text-caption text-weight-medium">
              <strong>Blindagem de Pagamentos (Alçada: Gestor de Crédito):</strong>
              <br/>
              Autorizado a iniciar cobranças exclusivamente através do <strong>M-Pesa API</strong>. O sistema envia a notificação STK Push diretamente para o telemóvel do cliente. Pagamentos manuais em numerário ou banco são restritos à Administração.
            </div>
          </q-banner>
        </div>

        <q-form ref="formRef" greedy class="row q-col-gutter-sm" @submit.prevent>
          <div class="col-12 col-sm-6">
            <q-input
              :model-value="formatDateShort(form.paymentDate)" dense outlined readonly label="Data de pagamento"
              :rules="[() => !!form.paymentDate || 'Obrigatório']"
            >
              <template v-slot:append>
                <q-icon name="event" class="cursor-pointer" v-if="!isGestor">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="form.paymentDate" mask="YYYY-MM-DD" :options="dateOptions" @update:model-value="onDateChange" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>

          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.paymentMethod" dense outlined emit-value map-options
              label="Meio de pagamento *" placeholder="Seleccionar método"
              :options="paymentMethodOptions" :disable="isGestor"
              :rules="[v => !!v || 'Obrigatório']"
            >
              <template v-slot:prepend><q-icon name="payments" size="18px" /></template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar><q-icon :name="scope.opt.icon" size="18px" /></q-item-section>
                  <q-item-section>{{ scope.opt.label }}</q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <!-- Valor a pagar -->
          <div class="col-12 col-sm-6">
            <q-input
              v-model.number="form.amountReceived" dense outlined type="number" min="0"
              label="Valor a pagar *" prefix="MZN"
              :rules="amountRules"
            >
              <template v-slot:prepend><q-icon name="sell" size="18px" /></template>
            </q-input>
            <q-slider
              v-if="mode === 'partial' && maxPayable > 0"
              v-model="form.amountReceived" :min="1" :max="maxPayable" :step="1"
              label label-always :label-value="formatMoney(form.amountReceived)" color="primary"
              class="q-mt-xs q-mb-none"
            />
          </div>

          <!-- M-PESA: PROMPT C2B VODACOM (UNIFICADO COM QUICKPAYMENT) -->
          <div class="col-12" v-if="isGestor || isMpesa">
            <div class="q-pa-sm bg-green-0 rounded-borders border-green">
              <div class="row items-center q-col-gutter-sm">
                <div class="col-12 col-sm-7">
                  <q-input
                    v-model="form.phoneNumber" dense outlined
                    label="Telemóvel Vodacom (84/85) *"
                    placeholder="84xxxxxxx ou 85xxxxxxx"
                    prefix="+258"
                    mask="## ### ####"
                    unmasked-value
                    clearable
                    :rules="[v => !!v || 'Obrigatório para o pagamento M-Pesa', phoneRules]"
                  >
                    <template v-slot:prepend><q-icon name="smartphone" size="18px" color="positive" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-5">
                  <div class="text-caption text-grey-7" style="font-size: 11px; line-height: 1.3">
                    <q-icon name="info" color="positive" size="16px" class="q-mr-xs" />
                    O telemóvel do cliente receberá imediatamente o pedido oficial de PIN da Vodacom M-Pesa.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Conta Destino: Apenas para Admin em modos manuais -->
          <div class="col-12" v-if="!isGestor && !isMpesa">
            <q-select
              v-model="selectedBankAccount" dense outlined use-input hide-selected fill-input
              input-debounce="0" :options="filteredAccounts"
              option-value="id" :option-label="accountOptionLabel"
              label="Conta Destino * (Reembolso/Misto/Caixa)"
              placeholder="Pesquisar conta…" :loading="bankStore.reembolsoLoading"
              :rules="[() => (isMpesa ? true : !!selectedBankAccount) || 'Obrigatório — indique para onde vai o dinheiro']"
              @filter="onAccountFilter"
            >
              <template v-slot:prepend><q-icon name="account_balance" size="18px" /></template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.name }} — {{ formatMoney(scope.opt.balance) }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.bank_name }} · {{ scope.opt.purpose }} · {{ scope.opt.type }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
              <template v-slot:no-option>
                <q-item><q-item-section class="text-grey">Sem contas de destino — cadastre em Carteira Real</q-item-section></q-item>
              </template>
            </q-select>
          </div>

          <!-- Referência: Apenas para Admin em pagamentos manuais -->
          <div class="col-12 col-sm-6" v-if="!isGestor && !isMpesa">
            <q-input
              v-model="form.paymentReference" dense outlined label="Referência *"
              :counter="Number(form.paymentMethod) !== 1" :maxlength="40"
              placeholder="ID da transação / Talão"
              :rules="referenceRules"
            >
              <template v-slot:prepend><q-icon name="tag" size="18px" /></template>
            </q-input>
          </div>

          <div class="col-12 col-sm-6">
            <q-input v-model="form.staffName" dense outlined disable label="Funcionário responsável">
              <template v-slot:prepend><q-icon name="badge" size="18px" /></template>
            </q-input>
          </div>

          <!-- Desconto (apenas modo "Pagar com desconto" e para Admin) -->
          <template v-if="mode === 'discount' && !isGestor && !isMpesa">
            <div class="col-12 col-sm-4">
              <q-select v-model="form.discountType" dense outlined :options="discountOptions" label="Tipo de desconto" emit-value map-options />
            </div>
            <div class="col-12 col-sm-4" v-if="form.discountType === 'percentage'">
              <q-input v-model.number="form.discountPercentage" dense outlined type="number" min="0" max="100" label="Desconto (%)" :rules="[v => (v > 0 && v < 100) || 'Desconto inválido']" />
            </div>
            <div class="col-12 col-sm-4" v-if="form.discountType === 'fixed'">
              <q-input v-model.number="form.discountFixed" dense outlined type="number" min="0" label="Desconto (MZN)" :rules="[v => v > 0 || 'Desconto inválido']" />
            </div>
          </template>

          <!-- Comprovativo: Apenas para Admin em pagamentos manuais -->
          <div class="col-12" v-if="!isGestor && !isMpesa">
            <q-file
              v-model="form.receiptFile" dense outlined use-chips clearable
              label="Comprovativo de pagamento" accept=".pdf,.jpg,.jpeg,.png"
              :max-files="1" hint="PDF, JPG ou PNG · máx. 5 MB"
            >
              <template v-slot:prepend><q-icon name="attach_file" size="18px" /></template>
            </q-file>
          </div>

          <div class="col-12" v-if="mode === 'partial'">
            <q-banner class="pm-banner-warning" rounded dense>
              <template v-slot:avatar><q-icon name="warning" color="orange-8" /></template>
              Pagamento parcial: ficará um saldo devedor de
              <strong>{{ formatMoney(Math.max(0, saldoEmFalta + quoteLate - (Number(form.amountReceived) || 0))) }}</strong>
            </q-banner>
          </div>

          <div class="col-12" v-if="belowInstallmentAlert">
            <q-banner class="pm-banner-warning" rounded dense>
              <template v-slot:avatar><q-icon name="warning" color="orange-8" /></template>
              Valor abaixo da prestação (<strong>{{ formatMoney(installment?.installment || 0) }}</strong>) — ficará saldo devedor.
            </q-banner>
          </div>

          <div class="col-12" v-if="overpayPreview > 0">
            <q-banner class="pm-banner-info" rounded dense>
              <template v-slot:avatar><q-icon name="info" color="primary" /></template>
              Excesso de <strong>{{ formatMoney(overpayPreview) }}</strong> será usado para abater a prestação seguinte
              — ou, se não houver mais prestações em aberto, creditado à conta do mutuário.
            </q-banner>
          </div>
        </q-form>
      </q-card-section>

      <!-- ── FOOTER ── -->
      <q-separator />
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancelar" color="grey-7" no-caps @click="close" />
        
        <!-- BOTAO PARA GESTOR OU ADMIN COM M-PESA SELECCIONADO -->
        <q-btn
          v-if="isGestor || isMpesa"
          unelevated label="Cobrar via M-Pesa (Pedir PIN)" icon="send" no-caps
          color="positive" class="pm-confirm-btn"
          :loading="paying || store.quoteLoading"
          @click="submitMpesaC2B"
        />

        <!-- BOTAO PARA ADMIN EM MEIOS MANUAIS -->
        <q-btn
          v-else
          unelevated label="Confirmar Pagamento" icon="check_circle" no-caps
          color="primary" class="pm-confirm-btn"
          :loading="paying || store.quoteLoading"
          @click="submit"
        />
      </q-card-actions>
    </q-card>

    <!-- ── MODAL DE ESPERA DO PIN M-PESA (STK PUSH) ── -->
    <q-dialog v-model="showMpesaWaiting" persistent transition-show="scale" transition-hide="fade">
      <q-card style="width: 440px; max-width: 95vw; border-radius: 16px;">
        <q-card-section class="text-center q-pa-lg">
          <q-avatar size="64px" color="green-1" text-color="positive" class="q-mb-md">
            <q-icon name="smartphone" size="36px" />
          </q-avatar>
          <div class="text-h6 text-weight-bold text-slate-800 q-mb-xs">
            A aguardar PIN M-Pesa no telemóvel...
          </div>
          <div class="text-body2 text-grey-8 q-mb-sm">
            Foi enviado o pedido de pagamento de <strong>{{ formatMoney(form.amountReceived) }}</strong> para:
            <br />
            <span class="text-weight-bold font-mono text-positive text-subtitle1">+258 {{ normalizedPhoneForDisplay }}</span>
          </div>
          <q-banner rounded dense class="bg-blue-1 text-blue-10 q-mb-md text-caption text-left">
            <template v-slot:avatar><q-icon name="info" color="primary" /></template>
            Solicite ao cliente que consulte o ecrã do telemóvel e digite o seu <strong>PIN secreto do M-Pesa</strong> para autorizar a transação.
          </q-banner>
          <div class="row items-center justify-center q-gutter-sm q-mb-md">
            <q-spinner-dots size="32px" color="positive" />
            <span class="text-caption font-mono text-weight-bold text-grey-7">{{ mpesaCountdown }}s restantes</span>
          </div>
          <q-btn flat dense rounded color="negative" label="Cancelar aguardo" no-caps @click="cancelMpesaWait" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useAuthStore } from '@/stores/auth'
import { useBankStore } from '@/stores/bank'
import { formatMoney, formatDateShort } from '@/utils/formatters'
import { api } from '@/boot/axios'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  installment: { type: Object, default: null },
  loan: { type: [Object, Number, String], default: null },
  loanId: { type: [Number, String], default: null },
  customer: { type: Object, default: null },
  customerName: { type: String, default: '' },
  mode: { type: String, default: 'full' } // full | partial | discount
})
const emit = defineEmits(['update:modelValue', 'pagamento-realizado', 'paid'])

const $q = useQuasar()
const store = useMutuarioStore()
const authStore = useAuthStore()
const bankStore = useBankStore()

// ── RESOLUÇÃO RESILIENTE DE DADOS (Props com fallback à Store) ──
const effectiveCustomer = computed(() => {
  return props.customer || store.customer || {}
})

const effectiveLoan = computed(() => {
  if (props.loan && typeof props.loan === 'object' && props.loan.id) return props.loan
  const lId = props.loanId || (typeof props.loan === 'number' || typeof props.loan === 'string' ? props.loan : null) || props.installment?.loanId
  if (lId) {
    const fromList = store.loans?.find(l => Number(l.id) === Number(lId))
    if (fromList) return fromList
    if (store.activeLoan && Number(store.activeLoan.id) === Number(lId)) return store.activeLoan
    if (store.contextLoan && Number(store.contextLoan.id) === Number(lId)) return store.contextLoan
    return { id: Number(lId) }
  }
  return store.activeLoan || store.contextLoan || (store.loans && store.loans[0]) || {}
})

const effectiveCompanyId = computed(() => {
  return effectiveCustomer.value?.companyId || authStore.companyId || effectiveLoan.value?.companyId || 1
})

const customerDisplayName = computed(() => {
  return props.customerName || effectiveCustomer.value?.customerName || ''
})

// ── BLINDAGEM DE ALÇADA ──
const isGestor = computed(() => Number(authStore.userRole) === 3)

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const paying = ref(false)
const formRef = ref(null)
const localToday = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const form = ref(defaultForm())

function defaultForm() {
  const isG = Number(authStore.userRole) === 3
  const cPhone = String(effectiveCustomer.value?.customerPhone || props.customer?.customerPhone || '').replace(/\D/g, '')
  const initialPhone = cPhone.length >= 9 ? cPhone.slice(-9) : cPhone
  return {
    paymentDate: localToday(),
    paymentMethod: isG ? 7 : null, // Gestor inicia fixo em M-Pesa API (7)
    paymentReference: '',
    amountReceived: 0,
    phoneNumber: initialPhone || '',
    staffName: authStore.userName || '',
    bank_account_id: null,
    discountType: 'percentage',
    discountPercentage: props.mode === 'discount' ? 10 : 0,
    discountFixed: 0,
    receiptFile: null
  }
}

// ── MÉTODOS DE PAGAMENTO (BLINDADO POR ALÇADA) ──
const isMpesa = computed(() => Number(form.value.paymentMethod) === 7)

const paymentMethodOptions = computed(() => {
  if (isGestor.value) {
    return [
      { label: 'M-Pesa API (Prompt PIN)', value: 7, icon: 'smartphone' }
    ]
  }
  return [
    { label: 'M-Pesa API (Prompt PIN)', value: 7, icon: 'smartphone' },
    { label: 'Numerário', value: 1, icon: 'payments' },
    { label: 'Transferência Bancária', value: 3, icon: 'account_balance' },
    { label: 'E-Mola', value: 6, icon: 'smartphone' },
    { label: 'Cheque', value: 2, icon: 'receipt_long' }
  ]
})

const discountOptions = [
  { label: 'Percentual (%)', value: 'percentage' },
  { label: 'Valor Fixo (MZN)', value: 'fixed' }
]

// ── RESUMO (quote oficial do servidor; fallback local enquanto chega) ──
const ordem = computed(() => props.installment?.installmentOrder ?? '—')
const customerName = computed(() => customerDisplayName.value)
const title = computed(() => ({
  full: 'Registar Pagamento',
  partial: 'Pagamento Parcial',
  discount: 'Pagamento com Desconto'
}[props.mode] || 'Registar Pagamento'))

const installmentRemaining = (inst) => Math.max(0, Number(inst?.installment || 0) - Number(inst?.paidAmount || 0))
const saldoEmFalta = computed(() => installmentRemaining(props.installment))
const quoteLate = computed(() => Number(store.quote?.lateDue ?? 0))
const quoteCapital = computed(() =>
  Math.max(0, Number(props.installment?.installment || 0) - Number(props.installment?.rateAmount || 0)))
const quoteJuros = computed(() => Number(store.quote?.interestDue ?? Number(props.installment?.rateAmount || 0)))
const totalDevido = computed(() =>
  Number(store.quote?.netTotal ?? Math.round((saldoEmFalta.value + quoteLate.value) * 100) / 100)
)
const maxPayable = computed(() => Number(store.quote?.total ?? totalDevido.value) || 0)

// ── CONTA DESTINO ──
const selectedBankAccount = ref(null)
const accountFilterQuery = ref('')
const filteredAccounts = computed(() => {
  const list = bankStore.byMethod(form.value.paymentMethod)
  const q = accountFilterQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(a => `${a.name} ${a.bank_name} ${a.purpose} ${a.type}`.toLowerCase().includes(q))
})
const onAccountFilter = (val, update) => {
  update(() => { accountFilterQuery.value = val })
}
const accountOptionLabel = (a) => `${a.name} — ${formatMoney(a.balance)}`
const fetchAccounts = async () => {
  try {
    await bankStore.fetchReembolsoAccounts(effectiveCompanyId.value, form.value.paymentMethod)
    const valid = bankStore.byMethod(form.value.paymentMethod)
      .some(a => Number(a.id) === Number(selectedBankAccount.value?.id))
    if (!valid && bankStore.reembolsoAccounts.length > 0) {
      selectedBankAccount.value = bankStore.byMethod(form.value.paymentMethod)[0]
    }
  } catch { /* falha de rede */ }
}
watch(() => form.value.paymentMethod, () => {
  const first = bankStore.byMethod(form.value.paymentMethod)[0]
  if (first) selectedBankAccount.value = first
})

// ── QUOTE OFICIAL (recalculada ao abrir e ao mudar a data) ──
const fetchQuote = async () => {
  if (!props.installment?.id) return
  try { await store.fetchQuote(props.installment.id, form.value.paymentDate) } catch { /* fallback local */ }
}
const onDateChange = () => {
  const due = String(props.installment?.dueDate || '').slice(0, 10)
  if (due && form.value.paymentDate && form.value.paymentDate < due) {
    $q.notify({ type: 'warning', message: 'Data anterior ao vencimento — a mora será recalculada pelo servidor para essa data', position: 'top' })
  }
  fetchQuote()
}
const dateOptions = (date) => {
  const [year, month, day] = date.split('/').map(Number)
  const [todayYear, todayMonth, todayDay] = localToday().split('-').map(Number)
  return year < todayYear || (year === todayYear && (
    month < todayMonth || (month === todayMonth && day <= todayDay)
  ))
}

// ── VALIDAÇÕES ──
const checkReferenceDuplicate = async (val) => {
  const ref = String(val || '').trim()
  if (!ref || !form.value.paymentMethod) return false
  try {
    const { data } = await api.get('/api/tranzaction/loan/reference-check', {
      params: { companyId: effectiveCompanyId.value, paymentMethod: form.value.paymentMethod, reference: ref }
    })
    return !!data?.result?.exists
  } catch { return false }
}
const referenceRules = computed(() => {
  const isCash = Number(form.value.paymentMethod) === 1
  const isMpesaMethod = Number(form.value.paymentMethod) === 7
  const required = !!form.value.paymentMethod && !isCash && !isMpesaMethod
  return [
    v => (!required || !!String(v || '').trim()) || 'Obrigatório',
    async v => !String(v || '').trim() || !(await checkReferenceDuplicate(v)) || 'Esta referência já existe neste método'
  ]
})
const amountRules = computed(() => [
  v => Number(v) > 0 || 'Valor inválido'
])
const overpayPreview = computed(() => {
  if (props.mode === 'discount') return 0
  return Math.max(0, Math.round(((Number(form.value.amountReceived) || 0) - (maxPayable.value || 0)) * 100) / 100)
})

const lastAutoAmount = ref(0)
const syncAutoAmount = () => {
  if (props.mode !== 'full') return
  const amt = totalDevido.value
  if (Number(form.value.amountReceived) === lastAutoAmount.value) {
    form.value.amountReceived = amt
  }
  lastAutoAmount.value = amt
}
watch(totalDevido, syncAutoAmount)

const belowInstallmentAlert = computed(() => {
  if (props.mode !== 'full') return false
  const installmentValue = Number(props.installment?.installment || 0)
  const amount = Number(form.value.amountReceived) || 0
  return installmentValue > 0 && amount > 0 && amount < installmentValue
})

watch(() => form.value.receiptFile, (file) => {
  if (file && file.size > 5 * 1024 * 1024) {
    $q.notify({ type: 'negative', message: 'Comprovativo excede 5 MB', position: 'top' })
    form.value.receiptFile = null
  }
})

// ── M-PESA OPEN API TELEFONE & POLLING ──
const showMpesaWaiting = ref(false)
const mpesaCountdown = ref(60)
const currentMpesaTxId = ref(null)
let mpesaTimerInterval = null
let mpesaPollInterval = null

const clearMpesaTimers = () => {
  if (mpesaTimerInterval) { clearInterval(mpesaTimerInterval); mpesaTimerInterval = null }
  if (mpesaPollInterval) { clearInterval(mpesaPollInterval); mpesaPollInterval = null }
}

onUnmounted(() => {
  clearMpesaTimers()
})

const normalizedPhone = computed(() => {
  let p = String(form.value.phoneNumber || effectiveCustomer.value?.customerPhone || props.customer?.customerPhone || '').replace(/\D/g, '')
  const raw9 = p.length > 9 ? p.slice(-9) : p
  return '258' + raw9
})

const normalizedPhoneForDisplay = computed(() => {
  const p = normalizedPhone.value
  return p.startsWith('258') ? p.slice(3) : p
})

const phoneRules = (val) => {
  const p = String(val || '').replace(/\D/g, '')
  const raw9 = p.length > 9 ? p.slice(-9) : p
  if (raw9.length === 9 && (raw9.startsWith('84') || raw9.startsWith('85'))) return true
  return 'Número M-Pesa deve ser rede Vodacom (84 ou 85 + 7 dígitos)'
}

const cancelMpesaWait = () => {
  clearMpesaTimers()
  showMpesaWaiting.value = false
  $q.notify({ type: 'info', message: 'Aguarde cancelado.', position: 'top' })
}

const checkMpesaStatusOnce = async (isTimeout = false) => {
  if (!currentMpesaTxId.value) return
  try {
    const { data } = await api.get(`/api/mpesa/c2b/status/${currentMpesaTxId.value}`)
    if (data.status === 'SUCCESS') {
      clearMpesaTimers()
      showMpesaWaiting.value = false
      $q.notify({
        type: 'positive',
        message: data.message || 'Pagamento M-Pesa confirmado e liquidado com sucesso!',
        position: 'top',
        timeout: 4000
      })
      close()
      emit('pagamento-realizado', data)
      emit('paid', data)
    } else if (data.status === 'FAILED') {
      clearMpesaTimers()
      showMpesaWaiting.value = false
      $q.notify({
        type: 'negative',
        message: data.responseDescription || data.message || 'Transação M-Pesa recusada ou cancelada pelo cliente.',
        position: 'top'
      })
    } else if (isTimeout) {
      clearMpesaTimers()
      showMpesaWaiting.value = false
      $q.notify({
        type: 'warning',
        message: 'Tempo limite excedido (60s). Se o cliente introduziu o PIN, o sistema processará a confirmação em segundo plano.',
        position: 'top'
      })
    }
  } catch { /* polling silencioso */ }
}

const submitMpesaC2B = async () => {
  const inst = props.installment
  const loanObj = effectiveLoan.value
  const custObj = effectiveCustomer.value
  const compId = effectiveCompanyId.value

  if (!inst?.id) {
    $q.notify({ type: 'warning', message: 'Selecione a prestação a liquidar.', position: 'top' })
    return
  }
  if (!loanObj?.id) {
    $q.notify({ type: 'warning', message: 'Identificador do empréstimo não encontrado.', position: 'top' })
    return
  }
  if (!custObj?.id && !custObj?.accountNumber) {
    $q.notify({ type: 'warning', message: 'Identificador do mutuário não encontrado.', position: 'top' })
    return
  }
  if (!compId) {
    $q.notify({ type: 'warning', message: 'Empresa do utilizador não identificada.', position: 'top' })
    return
  }

  // Validação dos campos do formulário
  if (formRef.value) {
    const valid = await formRef.value.validate()
    if (!valid) {
      $q.notify({ type: 'warning', message: 'Por favor preencha os campos obrigatórios corretamente.', position: 'top' })
      return
    }
  }

  const p = normalizedPhone.value
  if (!/^258(84|85)\d{7}$/.test(p)) {
    $q.notify({
      type: 'negative',
      message: 'Indique um número M-Pesa válido (84 ou 85 + 7 dígitos). Ex: 848353816',
      position: 'top'
    })
    return
  }

  const amount = Number(form.value.amountReceived) || 0
  if (amount <= 0) {
    $q.notify({ type: 'negative', message: 'Indique um valor válido para o pagamento.', position: 'top' })
    return
  }

  paying.value = true
  try {
    const { data } = await api.post('/api/mpesa/c2b/initiate', {
      companyId: Number(compId),
      customerId: Number(custObj.id || props.customer?.id),
      loanId: Number(loanObj.id),
      amortizationLoanId: Number(inst.id),
      amount: Number(amount),
      phone: p
    })

    if (data.status === 'SUCCESS' && data.success) {
      $q.notify({
        type: 'positive',
        message: data.message || 'Pagamento M-Pesa liquidado com sucesso!',
        position: 'top',
        timeout: 4000
      })
      close()
      emit('pagamento-realizado', data)
      emit('paid', data)
    } else if (data.status === 'PENDING_PIN' || data.success) {
      currentMpesaTxId.value = data.mpesaTxId
      showMpesaWaiting.value = true
      clearMpesaTimers()
      mpesaCountdown.value = 60
      mpesaTimerInterval = setInterval(() => {
        mpesaCountdown.value--
        if (mpesaCountdown.value <= 0) {
          clearMpesaTimers()
          checkMpesaStatusOnce(true)
        }
      }, 1000)
      mpesaPollInterval = setInterval(async () => {
        await checkMpesaStatusOnce(false)
      }, 2500)
    } else {
      $q.notify({
        type: 'negative',
        message: data.message || 'M-Pesa recusou o pedido de pagamento.',
        position: 'top'
      })
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || err.message || 'Erro ao conectar à API M-Pesa da Vodacom.',
      position: 'top'
    })
  } finally {
    paying.value = false
  }
}

// ── ABERTURA / FECHO ──
const idempotencyKey = ref('')
const openReset = () => {
  form.value = defaultForm()
  if (isGestor.value) {
    form.value.paymentMethod = 7
  }
  const cPhone = String(effectiveCustomer.value?.customerPhone || props.customer?.customerPhone || '').replace(/\D/g, '')
  if (cPhone) {
    form.value.phoneNumber = cPhone.length >= 9 ? cPhone.slice(-9) : cPhone
  }
  selectedBankAccount.value = null
  store.quote = null
  const autoAmount = props.mode === 'full'
    ? totalDevido.value
    : props.mode === 'discount' ? saldoEmFalta.value : Math.round(saldoEmFalta.value / 2 * 100) / 100
  form.value.amountReceived = autoAmount
  lastAutoAmount.value = autoAmount
  fetchAccounts()
  idempotencyKey.value = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  fetchQuote()
}
watch(show, (v) => { if (v) openReset() })

const close = () => {
  clearMpesaTimers()
  showMpesaWaiting.value = false
  emit('update:modelValue', false)
}

// ── SUBMISSÃO MANUAL (ADMIN) ──
const submit = async () => {
  if (isGestor.value) {
    return submitMpesaC2B()
  }
  const inst = props.installment
  const loanObj = effectiveLoan.value
  const custObj = effectiveCustomer.value
  const compId = effectiveCompanyId.value

  if (!inst?.id || !loanObj?.id) {
    $q.notify({ type: 'warning', message: 'Dados da prestação ou empréstimo incompletos.', position: 'top' })
    return
  }
  if (formRef.value) {
    const valid = await formRef.value.validate()
    if (!valid) return
  }
  if (!selectedBankAccount.value) {
    $q.notify({ type: 'negative', message: 'Seleccione a conta de destino do pagamento', position: 'top' })
    return
  }
  paying.value = true
  try {
    if (Number(form.value.paymentMethod) === 1 && !String(form.value.paymentReference || '').trim()) {
      form.value.paymentReference = `NUM-${custObj.accountNumber || 'X'}-${Date.now().toString().slice(-8)}`
    }

    let receiptUrl = ''
    if (form.value.receiptFile) {
      const fd = new FormData()
      fd.append('file', form.value.receiptFile)
      const { data: up } = await api.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (up?.success) receiptUrl = up.documentFileUrl || up.imageUrl || ''
    }

    let amount = Number(form.value.amountReceived) || 0
    let discountApplied = false
    let discountAmount = 0
    if (props.mode === 'discount') {
      const remaining = saldoEmFalta.value
      discountAmount = form.value.discountType === 'percentage'
        ? Math.round(remaining * ((Number(form.value.discountPercentage) || 0) / 100) * 100) / 100
        : Math.min(remaining, Number(form.value.discountFixed) || 0)
      amount = Math.min(amount, Math.round((remaining - discountAmount) * 100) / 100)
      discountApplied = discountAmount > 0
    }
    const acceptOverpay = props.mode !== 'discount' && amount > (maxPayable.value || saldoEmFalta.value) + 0.005

    const resposta = await store.payInstallment({
      companyId: Number(compId),
      accountNumber: custObj.accountNumber,
      amortizationLoanId: inst.id,
      loanId: loanObj.id,
      amount,
      latePaymentInterest: quoteLate.value,
      idempotencyKey: idempotencyKey.value,
      bank_account_id: selectedBankAccount.value.id,
      interestRateAmount: inst.rateAmount || 0,
      phoneNumber: form.value.phoneNumber || custObj.customerPhone || '',
      tranzactionReference: form.value.paymentReference,
      paymentMethod: form.value.paymentMethod,
      description: `Pagamento prestação ${inst.installmentOrder}${discountApplied ? ' (com desconto)' : ''}`,
      receiptUrl,
      staffName: form.value.staffName || '',
      paymentDate: form.value.paymentDate,
      discountApplied,
      discountAmount,
      acceptOverpay
    })

    close()
    emit('pagamento-realizado', resposta)
    emit('paid', resposta)
    const applied = resposta?.allocation?.overpayAppliedToNextInstallments || []
    const asCredit = Number(resposta?.allocation?.overpayAsCredit) || 0
    if (applied.length > 0) {
      const ordens = applied.map(a => a.installmentOrder).join(', ')
      $q.notify({ type: 'positive', message: `Excesso abatido na(s) prestação(ões) ${ordens}.`, position: 'top' })
    } else if (asCredit > 0) {
      $q.notify({ type: 'positive', message: `Excesso de ${formatMoney(asCredit)} creditado ao mutuário.`, position: 'top' })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || e.message || 'Erro ao registar pagamento', position: 'top' })
  } finally {
    paying.value = false
  }
}
</script>

<style lang="scss" scoped>
.pm-card {
  width: 900px;
  max-width: 95vw;
  max-height: 95vh;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.pm-header {
  background: #1a3c2a;
  background: linear-gradient(135deg, #1a3c2a 0%, #245740 100%);
}
.pm-header-avatar {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.pm-header-sub {
  color: rgba(255, 255, 255, 0.72);
}
.pm-badge {
  background: #2e7d32;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 8px;
}
.pm-section-title {
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $primary;
  margin-bottom: 8px;
}
.pm-kpi {
  position: relative;
  border: 1px solid #e3e8e4;
  border-left: 3px solid $primary;
  border-radius: 10px;
  padding: 9px 11px 7px;
  background: #fafbfa;
}
.pm-kpi-total {
  border-left-color: $red-500;
  background: #fdf6f6;
}
.pm-kpi-icon {
  position: absolute;
  top: 8px;
  right: 9px;
  opacity: 0.85;
}
.pm-kpi-label {
  font-size: 10px;
  color: $grey-6;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.pm-banner-warning {
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fed7aa;
}
.pm-banner-info {
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}
.pm-confirm-btn {
  background: #2e7d32;
}
.border-green {
  border: 1px solid #86efac;
}
.bg-green-0 {
  background: #f0fdf4;
}
</style>
