<template>
  <q-dialog
    v-model="show"
    persistent
    :maximized="isMaximized"
    transition-show="scale"
    transition-hide="scale"
  >
    <q-card class="renovar-modal" :class="{ 'renovar-modal--maximized': isMaximized }">
      <!-- ── HEADER ── -->
      <q-card-section class="rm-header row items-center no-wrap">
        <div class="rm-header__icon">
          <q-icon name="autorenew" size="26px" />
        </div>
        <div class="col q-ml-md">
          <div class="rm-header__title">
            Renovação de Contrato por Liquidação de Juros
          </div>
          <div class="rm-header__sub">
            {{ customerDisplayName }} · Crédito #{{ effectiveLoan?.id }} · {{ quote?.renewalNumber || 1 }}ª Renovação (Exclusivo 1 Prestação)
          </div>
        </div>
        <div class="row items-center q-gutter-xs">
          <q-btn
            :icon="isMaximized ? 'fullscreen_exit' : 'fullscreen'"
            flat
            round
            dense
            color="white"
            @click="isMaximized = !isMaximized"
          >
            <q-tooltip>{{ isMaximized ? 'Restaurar tamanho normal' : 'Expandir para ecrã inteiro (Full Screen)' }}</q-tooltip>
          </q-btn>
          <q-btn icon="close" flat round dense color="white" @click="close" />
        </div>
      </q-card-section>

      <!-- ── CORPO COM 2 COLUNAS DE ALTO RESPIRO ── -->
      <q-card-section class="rm-body">
        <!-- Alerta se o crédito não for elegível -->
        <q-banner
          v-if="quote && !quote.eligible"
          rounded
          class="bg-red-1 text-red-10 q-mb-md"
        >
          <template v-slot:avatar>
            <q-icon name="block" color="negative" size="28px" />
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
            O cliente já liquidou os juros devidos desta prestação. Ao anexar o documento assinado e confirmar, a {{ quote.installmentOrder }}ª prestação será formalizada como concluída e o capital de <strong>{{ formatMoney(quote.principalAmount) }}</strong> transitará para a {{ quote.nextInstallmentOrder }}ª prestação sem nova cobrança de juros retroactivos.
          </div>
        </q-banner>

        <div class="row q-col-gutter-lg">
          <!-- ════════ COLUNA 1: DIAGNÓSTICO FINANCEIRO & NOVO CICLO ════════ -->
          <div class="col-12 col-md-6 column q-gutter-y-md">
            <!-- 1. QUADRO RESUMO FINANCEIRO DA RENOVAÇÃO -->
            <div class="rm-card rm-card--summary">
              <div class="rm-card__header row items-center justify-between">
                <div class="row items-center">
                  <q-icon name="calculate" size="20px" color="primary" class="q-mr-xs" />
                  <span class="text-weight-bold text-subtitle2">Resumo Financeiro da Operação</span>
                </div>
                <q-badge color="deep-purple" rounded :label="`${quote?.renewalNumber || 1}ª Renovação`" />
              </div>

              <div class="rm-summary__content q-mt-sm">
                <div class="rm-summary__row">
                  <span>Capital Mantido (Transita para o Próximo Mês)</span>
                  <strong class="text-primary text-weight-bold">{{ formatMoney(quote?.principalAmount || 0) }}</strong>
                </div>

                <div class="rm-summary__row">
                  <span>Juros do Período Actual ({{ quote?.installmentOrder || '1' }}ª Prestação)</span>
                  <strong>
                    {{ formatMoney(quote?.interestAmount || 0) }}
                    <q-badge v-if="quote?.isInterestAlreadyPaid" color="positive" class="q-ml-xs" label="JÁ LIQUIDADO" />
                  </strong>
                </div>

                <div class="rm-summary__row" v-if="(quote?.alreadyPaid || 0) > 0 && !quote?.isInterestAlreadyPaid">
                  <span>Valor Já Pago Parcialmente</span>
                  <strong class="text-positive">- {{ formatMoney(quote.alreadyPaid) }}</strong>
                </div>

                <div class="rm-summary__row" v-if="!quote?.isInterestAlreadyPaid">
                  <span>Juros em Falta para Liquidar</span>
                  <strong class="text-orange-9 text-weight-bold">{{ formatMoney(quote?.interestRemainingToPay || 0) }}</strong>
                </div>

                <div class="rm-summary__row" v-if="(quote?.moraCalculated || 0) > 0">
                  <span>Juros de Mora Apurados ({{ quote.moraDays }} dias)</span>
                  <strong class="text-negative">{{ formatMoney(quote.moraCalculated) }}</strong>
                </div>

                <div class="rm-summary__row" v-if="(quote?.moraWaived || 0) > 0">
                  <span>Mora Isentada / Perdoada</span>
                  <strong class="text-positive">- {{ formatMoney(quote.moraWaived) }}</strong>
                </div>

                <q-separator class="q-my-sm" />

                <div class="rm-summary__total row items-center justify-between">
                  <div class="column">
                    <span class="text-caption text-grey-7 text-uppercase text-weight-bold">Total a Cobrar Agora</span>
                    <span class="text-caption text-grey-6">Liquidação de juros e mora</span>
                  </div>
                  <div class="text-h6 text-weight-bolder text-deep-purple-9">
                    {{ formatMoney(quote?.totalToPayNow || 0) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. TRATAMENTO DE JUROS DE MORA (SE HOUVER MORA) -->
            <div v-if="(quote?.moraCalculated || 0) > 0" class="rm-card rm-card--mora">
              <div class="rm-card__header row items-center">
                <q-icon name="gavel" size="20px" color="deep-orange" class="q-mr-xs" />
                <span class="text-weight-bold text-subtitle2">Opções de Juros de Mora ({{ formatMoney(quote.moraCalculated) }})</span>
              </div>

              <div class="q-mt-sm">
                <q-btn-toggle
                  v-model="form.moraMode"
                  spread
                  no-caps
                  unelevated
                  toggle-color="deep-purple"
                  color="grey-2"
                  text-color="grey-9"
                  :options="[
                    { label: 'Cobrar Integral', value: 'charge', icon: 'payments' },
                    { label: 'Isentar / Perdoar 100%', value: 'waive', icon: 'volunteer_activism' },
                    { label: 'Perdão Parcial', value: 'discount', icon: 'percent' }
                  ]"
                  @update:model-value="refreshQuote"
                />

                <div v-if="form.moraMode === 'discount'" class="row q-col-gutter-sm q-mt-xs items-center">
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model.number="form.moraCustomAmount"
                      type="number"
                      dense
                      outlined
                      min="0"
                      :max="quote.moraCalculated"
                      step="0.01"
                      label="Valor de Mora a Cobrar"
                      suffix="MZN"
                      @update:model-value="refreshQuote"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <div class="text-caption text-positive text-weight-bold q-pa-xs">
                      Mora Perdoada: {{ formatMoney(Math.max(0, (quote?.moraCalculated || 0) - (Number(form.moraCustomAmount) || 0))) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. PROJECÇÃO DA NOVA PRESTAÇÃO GERADA -->
            <div class="rm-card rm-card--cycle">
              <div class="rm-card__header row items-center justify-between">
                <div class="row items-center">
                  <q-icon name="event_repeat" size="20px" color="deep-purple" class="q-mr-xs" />
                  <span class="text-weight-bold text-subtitle2 text-deep-purple-9">
                    Nova Prestação Gerada ({{ quote?.nextInstallmentOrder || '2' }}ª Prestação)
                  </span>
                </div>
                <q-badge color="deep-purple-1" text-color="deep-purple-10" label="Próximo Vencimento" />
              </div>

              <div class="q-mt-sm row items-center justify-between">
                <div>
                  <div class="text-caption text-grey-7">Composição do Próximo Ciclo:</div>
                  <div class="text-body2 text-grey-9 q-mt-xs">
                    Capital Transitado: <strong>{{ formatMoney(quote?.principalAmount || 0) }}</strong><br />
                    Novos Juros do Período: <strong>{{ formatMoney(quote?.newInterestAmount || 0) }}</strong><br />
                    Vencimento: <strong class="text-deep-purple-9">{{ formatDateShort(form.newDueDate) }}</strong>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-caption text-grey-7">Total a Vencer</div>
                  <div class="text-h6 text-weight-bolder text-deep-purple-9">
                    {{ formatMoney(quote?.newInstallmentAmount || 0) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ════════ COLUNA 2: PRAZOS, RECEBIMENTO & FORMALIZAÇÃO ════════ -->
          <div class="col-12 col-md-6 column q-gutter-y-md">
            <!-- 1. PRAZOS E DATAS -->
            <div class="rm-card">
              <div class="rm-card__header row items-center">
                <q-icon name="today" size="20px" color="primary" class="q-mr-xs" />
                <span class="text-weight-bold text-subtitle2">Prazos da Renovação</span>
              </div>
              <div class="row q-col-gutter-sm q-mt-xs">
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="form.payDate"
                    dense
                    outlined
                    type="date"
                    label="Data de Efectivação *"
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
                    label="Novo Vencimento (+1 Mês) *"
                    :rules="[v => (!!v && v > form.payDate) || 'Deve ser posterior à data da renovação']"
                    @update:model-value="refreshQuote"
                  >
                    <template v-slot:prepend><q-icon name="event_repeat" size="18px" color="deep-purple" /></template>
                  </q-input>
                </div>
              </div>
            </div>

            <!-- 2. DADOS DE RECEBIMENTO (SE HOUVER VALOR A COBRAR AGORA) -->
            <div v-if="(quote?.totalToPayNow || 0) > 0.009" class="rm-card rm-card--payment">
              <div class="rm-card__header row items-center justify-between">
                <div class="row items-center">
                  <q-icon name="account_balance_wallet" size="20px" color="teal-9" class="q-mr-xs" />
                  <span class="text-weight-bold text-subtitle2">
                    Recebimento de Juros / Mora ({{ formatMoney(quote.totalToPayNow) }})
                  </span>
                </div>
                <q-badge color="teal" label="Pagamento Necessário" />
              </div>

              <div class="row q-col-gutter-sm q-mt-xs">
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
              </div>
            </div>

            <!-- 3. FORMALIZAÇÃO CONTRATUAL OBRIGATÓRIA (DOWNLOAD + UPLOAD) -->
            <div class="rm-card rm-doc-box">
              <div class="row items-center justify-between q-col-gutter-sm q-mb-sm">
                <div class="col-12 col-sm-7">
                  <div class="text-subtitle2 text-weight-bold text-deep-purple-10">
                    <q-icon name="assignment" color="deep-purple" size="20px" class="q-mr-xs" />
                    Formalização Contratual Obrigatória
                  </div>
                  <div class="text-caption text-grey-8 q-mt-xs">
                    <strong>Passo 1:</strong> Imprima o Termo de Renovação para o cliente assinar.<br />
                    <strong>Passo 2:</strong> Faça o upload do documento assinado (PDF ou Foto).
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
                label="2. Anexar Termo de Renovação Assinado (Obrigatório) *"
                hint="Formatos aceites: PDF, JPG ou PNG (máx. 5 MB)"
                :rules="[v => !!v || 'O upload do documento de compromisso assinado é obrigatório']"
              >
                <template v-slot:prepend>
                  <q-icon name="upload_file" color="deep-purple" />
                </template>
              </q-file>
            </div>

            <!-- 4. OBSERVAÇÕES -->
            <div class="rm-card">
              <q-input
                v-model="form.notes"
                dense
                outlined
                type="textarea"
                rows="2"
                label="Observações da Renovação (opcional)"
                placeholder="Ex.: Acordo acordado em balcão para transição de capital..."
              />
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- ── FOOTER ── -->
      <q-separator />
      <q-card-actions align="right" class="q-pa-md rm-footer">
        <q-btn flat label="Cancelar" color="grey-7" no-caps @click="close" class="q-px-md" />
        <q-btn
          unelevated
          color="deep-purple"
          icon="autorenew"
          label="Confirmar Renovação do Contrato"
          no-caps
          class="rm-confirm-btn q-px-lg"
          size="md"
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

const isMaximized = ref(false)

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
    // Telefone do cliente para assegurar conformidade do registo na BD
    const custPhone =
      effectiveCustomer.value?.customerPhone ||
      effectiveCustomer.value?.phone ||
      props.customer?.customerPhone ||
      props.customer?.phone ||
      ''
    if (custPhone) {
      fd.append('phoneNumber', custPhone)
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
  width: 1040px;
  max-width: 95vw;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease-in-out;
}

.renovar-modal--maximized {
  width: 100vw !important;
  max-width: 100vw !important;
  height: 100vh !important;
  max-height: 100vh !important;
  border-radius: 0 !important;
}

.rm-header {
  background: linear-gradient(135deg, #4527a0 0%, #283593 100%);
  color: #fff;
  padding: 16px 24px;
}

.rm-header__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rm-header__title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.rm-header__sub {
  font-size: 13px;
  opacity: 0.88;
}

.rm-body {
  max-height: 80vh;
  overflow-y: auto;
  padding: 24px;
  background: #fafbfd;
}

.renovar-modal--maximized .rm-body {
  max-height: calc(100vh - 140px);
}

.rm-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.rm-card--summary {
  background: #ffffff;
  border-left: 4px solid #5e35b1;
}

.rm-card--mora {
  background: #fffaf0;
  border: 1px solid #fed7aa;
}

.rm-card--cycle {
  background: #fbf9ff;
  border: 1px solid #d1c4e9;
  border-left: 4px solid #7e57c2;
}

.rm-card--payment {
  background: #f8fdfc;
  border: 1px solid #99f6e4;
  border-left: 4px solid #0d9488;
}

.rm-card__header {
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.rm-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  font-size: 13.5px;
  color: #475569;
}

.rm-summary__total {
  padding-top: 8px;
}

.rm-doc-box {
  background: #f8f6ff;
  border: 1.5px dashed #7c3aed;
  border-radius: 14px;
  padding: 16px 18px;
}

.border-green {
  border: 1px solid #86efac;
}

.rm-footer {
  background: #ffffff;
}

.rm-confirm-btn {
  font-weight: 700;
  border-radius: 10px;
}
</style>
