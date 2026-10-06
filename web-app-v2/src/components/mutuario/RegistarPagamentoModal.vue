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
              <template v-if="selectedBankAccount">
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
        <q-form ref="formRef" greedy class="row q-col-gutter-sm" @submit.prevent>
          <div class="col-12 col-sm-6">
            <q-input
              :model-value="formatDateShort(form.paymentDate)" dense outlined readonly label="Data de pagamento"
              :rules="[() => !!form.paymentDate || 'Obrigatório']"
            >
              <template v-slot:append>
                <q-icon name="event" class="cursor-pointer">
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
              :options="paymentMethodOptions" :rules="[v => !!v || 'Obrigatório']"
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
          <div class="col-12">
            <q-select
              v-model="selectedBankAccount" dense outlined use-input hide-selected fill-input
              input-debounce="0" :options="filteredAccounts"
              option-value="id" :option-label="accountOptionLabel"
              label="Conta Destino * (Reembolso/Misto/Caixa)"
              placeholder="Pesquisar conta…" :loading="bankStore.reembolsoLoading"
              :rules="[() => !!selectedBankAccount || 'Obrigatório — indique para onde vai o dinheiro']"
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
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.paymentReference" dense outlined label="Referência *"
              :counter="Number(form.paymentMethod) !== 1" :maxlength="40"
              placeholder="ID da transação M-Pesa"
              :rules="referenceRules"
            >
              <template v-slot:prepend><q-icon name="tag" size="18px" /></template>
            </q-input>
          </div>
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
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.phoneNumber" dense outlined label="Telefone do cliente"
              mask="############" hint="+258 — 12 dígitos" clearable
            >
              <template v-slot:prepend><q-icon name="phone" size="18px" /></template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="form.staffName" dense outlined disable label="Funcionário responsável">
              <template v-slot:prepend><q-icon name="badge" size="18px" /></template>
            </q-input>
          </div>

          <!-- Desconto (apenas modo "Pagar com desconto") -->
          <template v-if="mode === 'discount'">
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

          <div class="col-12">
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
        <q-btn
          unelevated label="Confirmar Pagamento" icon="check_circle" no-caps
          color="primary" class="pm-confirm-btn"
          :loading="paying || store.quoteLoading"
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useAuthStore } from '@/stores/auth'
import { useBankStore } from '@/stores/bank'
import { formatMoney, formatDateShort } from '@/utils/formatters'
import { api } from '@/boot/axios'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  installment: { type: Object, default: null },
  loan: { type: Object, default: null },
  customer: { type: Object, default: null },
  mode: { type: String, default: 'full' } // full | partial | discount
})
const emit = defineEmits(['update:modelValue', 'pagamento-realizado'])

const $q = useQuasar()
const store = useMutuarioStore()
const authStore = useAuthStore()
const bankStore = useBankStore()

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const paying = ref(false)
const formRef = ref(null)
const todayDate = new Date().toISOString().slice(0, 10)
const form = ref(defaultForm())

function defaultForm() {
  return {
    paymentDate: todayDate,
    paymentMethod: null,
    paymentReference: '',
    amountReceived: 0,
    phoneNumber: String(props.customer?.customerPhone || ''),
    staffName: authStore.userName || '',
    bank_account_id: null,
    discountType: 'percentage',
    discountPercentage: props.mode === 'discount' ? 10 : 0,
    discountFixed: 0,
    receiptFile: null
  }
}

// ── MÉTODOS DE PAGAMENTO (códigos legados do sistema/recebos) ──
const paymentMethodOptions = [
  { label: 'M-Pesa', value: 7, icon: 'smartphone' },
  { label: 'E-Mola', value: 6, icon: 'smartphone' },
  { label: 'Transferência Bancária', value: 3, icon: 'account_balance' },
  { label: 'Numerário', value: 1, icon: 'payments' },
  { label: 'Cheque', value: 2, icon: 'receipt_long' }
]
const discountOptions = [
  { label: 'Percentual (%)', value: 'percentage' },
  { label: 'Valor Fixo (MZN)', value: 'fixed' }
]

// ── RESUMO (quote oficial do servidor; fallback local enquanto chega) ──
const ordem = computed(() => props.installment?.installmentOrder ?? '—')
const customerName = computed(() => props.customer?.customerName || '')
const title = computed(() => ({
  full: 'Registar Pagamento',
  partial: 'Pagamento Parcial',
  discount: 'Pagamento com Desconto'
}[props.mode] || 'Registar Pagamento'))

const installmentRemaining = (inst) => Math.max(0, Number(inst?.installment || 0) - Number(inst?.paidAmount || 0))
const saldoEmFalta = computed(() => installmentRemaining(props.installment))
const quoteLate = computed(() => Number(store.quote?.lateDue ?? 0))
// Capital PURO da prestação (prestação − juros) — a quote devolve capitalDue =
// saldo total em falta (inclui juros por pagar), não o capital da linha.
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
// Colapsado mostra nome + saldo actual (ex.: "Colecta M-Pesa (portal) — 0,00 MZN")
const accountOptionLabel = (a) => `${a.name} — ${formatMoney(a.balance)}`
const fetchAccounts = async () => {
  try {
    await bankStore.fetchReembolsoAccounts(props.customer?.companyId, form.value.paymentMethod)
    const valid = bankStore.byMethod(form.value.paymentMethod)
      .some(a => Number(a.id) === Number(selectedBankAccount.value?.id))
    if (!valid && bankStore.reembolsoAccounts.length > 0) {
      selectedBankAccount.value = bankStore.byMethod(form.value.paymentMethod)[0]
    }
  } catch { /* falha de rede → usuário escolhe manualmente */ }
}
watch(() => form.value.paymentMethod, () => {
  // Re-ordena pela prioridade do novo método e auto-selecciona o 1.º
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
// q-date entrega a data ao "options" sempre em "YYYY/MM/DD" (independente da mask),
// por isso convertemos para "YYYY-MM-DD" antes de comparar com todayDate.
const dateOptions = (date) => date.replaceAll('/', '-') <= todayDate

// ── VALIDAÇÕES ──
const checkReferenceDuplicate = async (val) => {
  const ref = String(val || '').trim()
  if (!ref || !form.value.paymentMethod) return false
  try {
    const { data } = await api.get('/api/tranzaction/loan/reference-check', {
      params: { companyId: props.customer?.companyId, paymentMethod: form.value.paymentMethod, reference: ref }
    })
    return !!data?.result?.exists
  } catch { return false }
}
const referenceRules = computed(() => {
  // Numerário pode não ter referência externa (auto-gerada no submit).
  // Só exigida quando já há um meio seleccionado — sem meio, o erro deve
  // apontar ao campo "Meio de pagamento", não a este.
  const required = !!form.value.paymentMethod && Number(form.value.paymentMethod) !== 1
  return [
    v => (!required || !!String(v || '').trim()) || 'Obrigatório',
    async v => !String(v || '').trim() || !(await checkReferenceDuplicate(v)) || 'Esta referência já existe neste método'
  ]
})
const amountRules = computed(() => [
  v => Number(v) > 0 || 'Valor inválido'
  // Excesso é permitido: é automaticamente abatido na prestação seguinte
  // (ou creditado ao mutuário se não houver mais prestações em aberto).
])
// Excesso face ao total devido desta prestação (capital + juros + mora).
const overpayPreview = computed(() => {
  if (props.mode === 'discount') return 0
  return Math.max(0, Math.round(((Number(form.value.amountReceived) || 0) - (maxPayable.value || 0)) * 100) / 100)
})
// ── AUTO-PREENCHIMENTO DO VALOR (modo "full") ──
// Ao abrir e sempre que a quote for recalculada (ex.: mora actualizada pelo
// servidor), o campo "Valor a pagar" segue o total devido (capital + juros +
// mora), desde que o utilizador não o tenha alterado manualmente.
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

// ── ALERTA SIMPLES: valor digitado abaixo da prestação ──
const belowInstallmentAlert = computed(() => {
  if (props.mode !== 'full') return false // parcial/desconto já têm o seu próprio aviso
  const installmentValue = Number(props.installment?.installment || 0)
  const amount = Number(form.value.amountReceived) || 0
  return installmentValue > 0 && amount > 0 && amount < installmentValue
})

// ── COMPROVATIVO (máx. 5 MB) ──
watch(() => form.value.receiptFile, (file) => {
  if (file && file.size > 5 * 1024 * 1024) {
    $q.notify({ type: 'negative', message: 'Comprovativo excede 5 MB', position: 'top' })
    form.value.receiptFile = null
  }
})

// ── ABERTURA / FECHO ──
const idempotencyKey = ref('')
const openReset = () => {
  form.value = defaultForm()
  selectedBankAccount.value = null
  // Limpa a quote anterior ANTES de calcular o valor inicial — evita herdar
  // a mora/total da prestação previamente aberta no modal.
  store.quote = null
  const autoAmount = props.mode === 'full'
    ? totalDevido.value
    : props.mode === 'discount' ? saldoEmFalta.value : Math.round(saldoEmFalta.value / 2 * 100) / 100
  form.value.amountReceived = autoAmount
  lastAutoAmount.value = autoAmount
  fetchAccounts()
  // Idempotency-Key POR TENTATIVA: o servidor devolve a resposta original em
  // retries com a mesma chave — duplo clique nunca duplica o pagamento.
  idempotencyKey.value = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  fetchQuote()
}
watch(show, (v) => { if (v) openReset() })

const close = () => { emit('update:modelValue', false) }

// ── SUBMISSÃO ──
const submit = async () => {
  if (!props.installment || !props.loan) return
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
    // Numerário sem referência externa → auto-gerada (backend exige referência)
    if (Number(form.value.paymentMethod) === 1 && !String(form.value.paymentReference || '').trim()) {
      form.value.paymentReference = `NUM-${props.customer?.accountNumber || 'X'}-${Date.now().toString().slice(-8)}`
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
    // Fora do desconto, o valor pode exceder o total devido (maxPayable):
    // o excesso é automaticamente abatido na prestação seguinte pelo servidor,
    // ou creditado ao mutuário se não houver mais prestações em aberto.
    const acceptOverpay = props.mode !== 'discount' && amount > (maxPayable.value || saldoEmFalta.value) + 0.005

    const resposta = await store.payInstallment({
      companyId: props.customer.companyId,
      accountNumber: props.customer.accountNumber,
      amortizationLoanId: props.installment.id,
      loanId: props.loan.id,
      amount,
      latePaymentInterest: quoteLate.value, // @deprecated no servidor (recalculada)
      idempotencyKey: idempotencyKey.value,
      bank_account_id: selectedBankAccount.value.id,
      interestRateAmount: props.installment.rateAmount || 0,
      phoneNumber: form.value.phoneNumber || props.customer?.customerPhone || '',
      tranzactionReference: form.value.paymentReference,
      paymentMethod: form.value.paymentMethod,
      description: `Pagamento prestação ${props.installment.installmentOrder}${discountApplied ? ' (com desconto)' : ''}`,
      receiptUrl,
      staffName: form.value.staffName || '',
      paymentDate: form.value.paymentDate,
      discountApplied,
      discountAmount,
      acceptOverpay
    })

    close()
    emit('pagamento-realizado', resposta)
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
</style>
