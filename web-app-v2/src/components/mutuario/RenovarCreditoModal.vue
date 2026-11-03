<template>
  <q-dialog v-model="show" persistent>
    <q-card class="renovar-modal">
      <!-- ── HEADER ── -->
      <q-card-section class="rm-header row items-center no-wrap">
        <div class="rm-header__icon">
          <q-icon name="autorenew" size="24px" />
        </div>
        <div class="col q-ml-md">
          <div class="rm-header__title">
            Renovação de Contrato por Liquidação de Juros
          </div>
          <div class="rm-header__sub">
            {{ customerDisplayName }} · Crédito #{{ effectiveLoan?.id }} · {{ quote?.renewalNumber || 1 }}ª Renovação (Exclusivo 1 Prestação)
          </div>
        </div>
        <q-btn icon="close" flat round dense color="white" @click="close" />
      </q-card-section>

      <q-card-section class="q-pt-md q-pb-sm rm-body">
        <!-- Alerta se o crédito não for elegível -->
        <q-banner
          v-if="quote && !quote.eligible"
          rounded
          class="bg-red-1 text-red-10 q-mb-md"
        >
          <template v-slot:avatar>
            <q-icon name="block" color="negative" />
          </template>
          <div class="text-weight-bold">Crédito Não Elegível para Renovação</div>
          <div class="text-caption">{{ quote.ineligibleReason }}</div>
        </q-banner>

        <!-- Banner informativo quando os juros já foram pagos como Pago Parcial -->
        <q-banner
          v-if="quote?.isInterestAlreadyPaid"
          rounded
          class="bg-green-1 text-green-10 q-mb-md border-green"
        >
          <template v-slot:avatar>
            <q-icon name="verified" color="positive" size="28px" />
          </template>
          <div class="text-weight-bold">
            Juros do Período Já Recebidos ({{ formatMoney(quote.alreadyPaid) }})
          </div>
          <div class="text-caption">
            O cliente já efectuou o pagamento correspondente aos juros desta prestação. Ao anexar o documento assinado e confirmar, a {{ quote.installmentOrder }}ª prestação será dada como liquidada pelos juros e o capital de <strong>{{ formatMoney(quote.principalAmount) }}</strong> transitará para a {{ quote.nextInstallmentOrder }}ª prestação.
          </div>
        </q-banner>

        <!-- ── QUADRO RESUMO FINANCEIRO DA RENOVAÇÃO ── -->
        <div class="rm-summary q-mb-md">
          <div class="rm-summary__row">
            <span>Capital Mantido (Transita para o Novo Mês)</span>
            <strong class="text-primary">{{ formatMoney(quote?.principalAmount || 0) }}</strong>
          </div>
          <div class="rm-summary__row">
            <span>Juros do Período Actual ({{ quote?.installmentOrder || '1' }}ª Prestação)</span>
            <strong>
              {{ formatMoney(quote?.interestAmount || 0) }}
              <q-badge v-if="quote?.isInterestAlreadyPaid" color="positive" class="q-ml-xs" label="JÁ PAGO" />
            </strong>
          </div>
          <div class="rm-summary__row" v-if="(quote?.alreadyPaid || 0) > 0 && !quote?.isInterestAlreadyPaid">
            <span>Valor Já Pago Parcialmente</span>
            <strong class="text-positive">- {{ formatMoney(quote.alreadyPaid) }}</strong>
          </div>
          <div class="rm-summary__row" v-if="!quote?.isInterestAlreadyPaid">
            <span>Juros em Falta para Liquidar Agora</span>
            <strong class="text-orange-9">{{ formatMoney(quote?.interestRemainingToPay || 0) }}</strong>
          </div>
          <div class="rm-summary__row" v-if="(quote?.moraCalculated || 0) > 0">
            <span>Juros de Mora Apurados ({{ quote.moraDays }} dias de atraso)</span>
            <strong class="text-negative">{{ formatMoney(quote.moraCalculated) }}</strong>
          </div>
          <div class="rm-summary__row" v-if="(quote?.moraWaived || 0) > 0">
            <span>Mora Isentada / Perdoada</span>
            <strong class="text-positive">- {{ formatMoney(quote.moraWaived) }}</strong>
          </div>
          <q-separator class="q-my-xs" />
          <div class="rm-summary__total">
            <span>Total a Cobrar Agora na Renovação</span>
            <strong>{{ formatMoney(quote?.totalToPayNow || 0) }}</strong>
          </div>
        </div>

        <!-- ── TRATAMENTO DE JUROS DE MORA (SE HOUVER MORA) ── -->
        <div v-if="(quote?.moraCalculated || 0) > 0" class="rm-section q-mb-md">
          <div class="rm-section__title">
            <q-icon name="gavel" size="18px" color="deep-orange" class="q-mr-xs" />
            Opções de Juros de Mora na Renovação ({{ formatMoney(quote.moraCalculated) }})
          </div>
          <div class="row q-col-gutter-sm q-mt-xs">
            <div class="col-12">
              <q-btn-toggle
                v-model="form.moraMode"
                spread
                no-caps
                unelevated
                toggle-color="deep-purple"
                color="grey-2"
                text-color="grey-9"
                :options="[
                  { label: 'Cobrar Mora Integral', value: 'charge', icon: 'payments' },
                  { label: 'Isentar / Perdoar 100%', value: 'waive', icon: 'volunteer_activism' },
                  { label: 'Perdoar Parcialmente', value: 'discount', icon: 'percent' }
                ]"
                @update:model-value="refreshQuote"
              />
            </div>
            <div v-if="form.moraMode === 'discount'" class="col-12 col-sm-6 q-mt-xs">
              <q-input
                v-model.number="form.moraCustomAmount"
                type="number"
                dense
                outlined
                min="0"
                :max="quote.moraCalculated"
                step="0.01"
                label="Valor de Mora a Cobrar (MZN)"
                suffix="MZN"
                @update:model-value="refreshQuote"
              />
            </div>
            <div v-if="form.moraMode === 'discount'" class="col-12 col-sm-6 q-mt-xs flex items-center">
              <div class="text-caption text-positive text-weight-bold">
                Mora Perdoada: {{ formatMoney(Math.max(0, (quote?.moraCalculated || 0) - (Number(form.moraCustomAmount) || 0))) }}
              </div>
            </div>
          </div>
        </div>

        <!-- ── DATAS E NOVO CICLO RENOVADO ── -->
        <q-form ref="formRef" class="row q-col-gutter-sm" @submit.prevent="submitRenewal">
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.payDate"
              dense
              outlined
              type="date"
              label="Data de Efectivação da Renovação *"
              @update:model-value="refreshQuote"
            >
              <template v-slot:prepend><q-icon name="event" size="18px" /></template>
            </q-input>
          </div>

          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.newDueDate"
              dense
              outlined
              type="date"
              label="Nova Data de Vencimento (+1 Mês) *"
              :rules="[v => (!!v && v > form.payDate) || 'Deve ser posterior à data da renovação']"
              @update:model-value="refreshQuote"
            >
              <template v-slot:prepend><q-icon name="event_repeat" size="18px" color="deep-purple" /></template>
            </q-input>
          </div>

          <!-- Resumo da Nova Prestação que será gerada -->
          <div class="col-12">
            <div class="rm-next-cycle">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-caption text-deep-purple-9 text-weight-bold text-uppercase">
                    Nova Prestação Gerada ({{ quote?.nextInstallmentOrder || '2' }}ª Prestação)
                  </div>
                  <div class="text-body2 text-grey-9">
                    Capital: <strong>{{ formatMoney(quote?.principalAmount || 0) }}</strong> +
                    Novos Juros: <strong>{{ formatMoney(quote?.newInterestAmount || 0) }}</strong>
                    · Vencimento: <strong>{{ formatDateShort(form.newDueDate) }}</strong>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-caption text-grey-7">Total no Novo Vencimento</div>
                  <div class="text-subtitle1 text-weight-bolder text-deep-purple-9">
                    {{ formatMoney(quote?.newInstallmentAmount || 0) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── DADOS DE RECEBIMENTO (APENAS QUANDO HÁ VALOR A PAGAR AGORA) ── -->
          <template v-if="(quote?.totalToPayNow || 0) > 0.009">
            <div class="col-12 q-mt-xs">
              <div class="rm-section__title">
                <q-icon name="account_balance_wallet" size="18px" color="primary" class="q-mr-xs" />
                Recebimento de Juros / Mora ({{ formatMoney(quote.totalToPayNow) }})
              </div>
            </div>

            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.paymentMethod"
                dense
                outlined
                :options="paymentMethodOptions"
                label="Método de pagamento *"
                emit-value
                map-options
              >
                <template v-slot:prepend><q-icon name="payments" size="18px" /></template>
              </q-select>
            </div>

            <div class="col-12 col-sm-6">
              <q-select
                v-model="selectedBankAccount"
                dense
                outlined
                :options="filteredAccounts"
                :option-label="accountOptionLabel"
                option-value="id"
                label="Conta de destino (carteira real) *"
              >
                <template v-slot:prepend><q-icon name="account_balance" size="18px" color="primary" /></template>
              </q-select>
            </div>

            <div class="col-12" v-if="Number(form.paymentMethod) !== 1">
              <q-input
                v-model="form.tranzactionReference"
                dense
                outlined
                label="Referência do comprovativo (M-Pesa / e-Mola / Talão) *"
                :rules="[v => !!(v && String(v).trim()) || 'Referência obrigatória para pagamentos digitais/bancários']"
              >
                <template v-slot:prepend><q-icon name="tag" size="18px" /></template>
              </q-input>
            </div>
          </template>

          <!-- ── PASSO 1 & PASSO 2: TERMO DE RENOVAÇÃO E UPLOAD OBRIGATÓRIO ── -->
          <div class="col-12 q-mt-sm">
            <div class="rm-doc-box">
              <div class="row items-center justify-between q-col-gutter-sm q-mb-sm">
                <div class="col-12 col-sm-7">
                  <div class="text-subtitle2 text-weight-bold text-slate-900">
                    <q-icon name="assignment_Late" color="deep-purple" size="18px" class="q-mr-xs" />
                    Formalização Contratual Obrigatória
                  </div>
                  <div class="text-caption text-grey-8">
                    1º Imprima o Termo de Renovação e Confissão de Dívida para assinatura do cliente.<br />
                    2º Faça o upload obrigatório do documento assinado (PDF ou Foto).
                  </div>
                </div>
                <div class="col-12 col-sm-5 text-right">
                  <q-btn
                    outline
                    color="deep-purple"
                    icon="print"
                    label="1. Baixar Termo (PDF)"
                    no-caps
                    dense
                    class="q-px-md full-width"
                    :loading="downloadingMinuta"
                    @click="downloadMinutaPdf"
                  />
                </div>
              </div>

              <q-file
                v-model="form.signedDocument"
                dense
                outlined
                use-chips
                clearable
                bg-color="white"
                accept=".pdf,.jpg,.jpeg,.png"
                :max-files="1"
                label="2. Anexar Termo de Renovação Assinado pelo Cliente (Obrigatório) *"
                hint="Formatos aceites: PDF, JPG ou PNG (máx. 5 MB)"
                :rules="[v => !!v || 'O upload do documento de compromisso assinado é obrigatório']"
              >
                <template v-slot:prepend>
                  <q-icon name="upload_file" color="deep-purple" />
                </template>
              </q-file>
            </div>
          </div>

          <div class="col-12">
            <q-input
              v-model="form.notes"
              dense
              outlined
              type="textarea"
              rows="2"
              label="Observações da Renovação (opcional)"
            />
          </div>
        </q-form>
      </q-card-section>

      <!-- ── FOOTER ── -->
      <q-separator />
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancelar" color="grey-7" no-caps @click="close" />
        <q-btn
          unelevated
          color="deep-purple"
          icon="autorenew"
          label="Confirmar Renovação do Contrato"
          no-caps
          class="rm-confirm-btn"
          :loading="submitting || store.renewalQuoteLoading"
          :disable="!form.signedDocument || (quote && !quote.eligible)"
          @click="submitRenewal"
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
  customer: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'renewed'])

const $q = useQuasar()
const store = useMutuarioStore()
const authStore = useAuthStore()
const bankStore = useBankStore()

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const effectiveCustomer = computed(() => props.customer || store.customer || {})
const effectiveLoan = computed(() => props.loan || store.contextLoan || store.activeLoan || {})
const effectiveCompanyId = computed(() => effectiveCustomer.value?.companyId || authStore.companyId || effectiveLoan.value?.companyId || 1)
const customerDisplayName = computed(() => effectiveCustomer.value?.customerName || 'Mutuário')

const localToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const formRef = ref(null)
const submitting = ref(false)
const downloadingMinuta = ref(false)
const selectedBankAccount = ref(null)

const form = ref({
  payDate: localToday(),
  newDueDate: '',
  moraMode: 'charge',
  moraCustomAmount: 0,
  paymentMethod: 1,
  tranzactionReference: '',
  signedDocument: null,
  notes: ''
})

const quote = computed(() => store.renewalQuote)

const paymentMethodOptions = [
  { label: 'Numerário (Caixa)', value: 1 },
  { label: 'Transferência / Depósito Bancário', value: 3 },
  { label: 'E-Mola', value: 6 },
  { label: 'M-Pesa', value: 7 }
]

const filteredAccounts = computed(() => bankStore.byMethod(form.value.paymentMethod))
const accountOptionLabel = (a) => `${a.name} — ${formatMoney(a.balance)}`

watch(() => form.value.paymentMethod, () => {
  const first = bankStore.byMethod(form.value.paymentMethod)[0]
  if (first) selectedBankAccount.value = first
})

const refreshQuote = async () => {
  if (!props.installment?.id) return
  try {
    const q = await store.fetchRenewalQuote(props.installment.id, {
      payDate: form.value.payDate,
      newDueDate: form.value.newDueDate || undefined,
      moraMode: form.value.moraMode,
      moraCustomAmount: form.value.moraMode === 'discount' ? form.value.moraCustomAmount : undefined
    })
    if (q && !form.value.newDueDate) {
      form.value.newDueDate = q.defaultNewDueDate
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message || err?.message || 'Erro ao calcular dados da renovação.'
    })
  }
}

watch(
  () => [props.modelValue, props.installment?.id],
  async ([open, instId]) => {
    if (!open || !instId) return
    form.value = {
      payDate: localToday(),
      newDueDate: '',
      moraMode: 'charge',
      moraCustomAmount: 0,
      paymentMethod: 1,
      tranzactionReference: '',
      signedDocument: null,
      notes: ''
    }
    await Promise.all([
      refreshQuote(),
      bankStore.fetchReembolsoAccounts(effectiveCompanyId.value, form.value.paymentMethod).catch(() => {})
    ])
    const first = bankStore.byMethod(form.value.paymentMethod)[0]
    if (first) selectedBankAccount.value = first
  },
  { immediate: true }
)

const downloadMinutaPdf = async () => {
  if (!props.installment?.id) return
  downloadingMinuta.value = true
  try {
    const response = await api.get(`/api/installments/${props.installment.id}/renewal-minuta/pdf`, {
      params: {
        payDate: form.value.payDate,
        newDueDate: form.value.newDueDate || undefined,
        moraMode: form.value.moraMode,
        moraCustomAmount: form.value.moraMode === 'discount' ? form.value.moraCustomAmount : undefined,
        notes: form.value.notes || undefined
      },
      responseType: 'blob'
    })
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível gerar a minuta em PDF.'
    })
  } finally {
    downloadingMinuta.value = false
  }
}

const submitRenewal = async () => {
  if (!form.value.signedDocument) {
    $q.notify({
      type: 'negative',
      message: 'O upload do Termo de Renovação assinado pelo cliente é obrigatório.'
    })
    return
  }

  const needsPayment = (quote.value?.totalToPayNow || 0) > 0.009
  if (needsPayment && !selectedBankAccount.value?.id) {
    $q.notify({
      type: 'negative',
      message: 'Selecione a conta de destino para receber o valor dos juros.'
    })
    return
  }

  if (needsPayment && Number(form.value.paymentMethod) !== 1 && !String(form.value.tranzactionReference || '').trim()) {
    $q.notify({
      type: 'negative',
      message: 'Informe a referência do comprovativo de pagamento.'
    })
    return
  }

  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('signedDocument', form.value.signedDocument)
    fd.append('payDate', form.value.payDate)
    fd.append('newDueDate', form.value.newDueDate)
    fd.append('moraMode', form.value.moraMode)
    if (form.value.moraMode === 'discount') {
      fd.append('moraCustomAmount', String(form.value.moraCustomAmount || 0))
    }
    if (needsPayment) {
      fd.append('paymentMethod', String(form.value.paymentMethod))
      fd.append('bank_account_id', String(selectedBankAccount.value.id))
      fd.append('tranzactionReference', String(form.value.tranzactionReference || '').trim())
    }
    fd.append('staffName', authStore.userName || '')
    if (form.value.notes) {
      fd.append('notes', form.value.notes)
    }

    const res = await store.renewInstallment(
      props.installment.id,
      fd,
      effectiveLoan.value?.id
    )

    $q.notify({
      type: 'positive',
      message: res.message || 'Contrato de crédito renovado com sucesso!'
    })
    emit('renewed', res.result)
    close()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message || err?.message || 'Erro ao renovar o crédito.'
    })
  } finally {
    submitting.value = false
  }
}

const close = () => {
  show.value = false
}
</script>

<style scoped>
.renovar-modal {
  width: 640px;
  max-width: 96vw;
  border-radius: 16px;
}

.rm-header {
  background: linear-gradient(135deg, #4527a0 0%, #283593 100%);
  color: #fff;
  padding: 16px 20px;
}

.rm-header__icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rm-header__title {
  font-size: 16px;
  font-weight: 700;
}

.rm-header__sub {
  font-size: 12px;
  opacity: 0.85;
}

.rm-body {
  max-height: 76vh;
  overflow-y: auto;
}

.rm-summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
}

.rm-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 13px;
  color: #475569;
}

.rm-summary__total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 6px;
  font-size: 15px;
  color: #1e293b;
}

.rm-section {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  padding: 10px 14px;
}

.rm-section__title {
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
  display: flex;
  align-items: center;
}

.rm-next-cycle {
  background: #ede7f6;
  border: 1px solid #d1c4e9;
  border-radius: 10px;
  padding: 10px 14px;
}

.rm-doc-box {
  background: #f5f3ff;
  border: 1.5px dashed #7c3aed;
  border-radius: 12px;
  padding: 12px 14px;
}

.border-green {
  border: 1px solid #86efac;
}

.rm-confirm-btn {
  font-weight: 700;
  padding: 6px 18px;
  border-radius: 8px;
}
</style>
