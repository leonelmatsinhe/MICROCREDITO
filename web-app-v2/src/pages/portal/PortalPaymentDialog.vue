<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="v => $emit('update:modelValue', v)"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-layout view="hHh lpr fFf" class="payment-sheet">
      <!-- Topo -->
      <q-header class="bg-positive text-white payment-sheet-header">
        <q-toolbar>
          <q-icon name="payment" size="24px" class="q-mr-sm" />
          <q-toolbar-title class="text-h6">Pagamento de Prestação</q-toolbar-title>
          <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
        </q-toolbar>
      </q-header>

      <q-page-container>
        <q-page class="q-pa-sm" style="padding-bottom: 84px">
          <!-- Resumo da prestação -->
          <q-card flat bordered class="q-mb-sm" style="border-radius: 12px">
            <q-card-section class="q-pa-sm">
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <div class="text-caption text-grey-5">Prestação</div>
                  <div class="text-h6 text-weight-bold text-primary">{{ formatMoney(inst?.installment) }}</div>
                  <div class="text-caption text-grey-6" v-if="ordinalNumber(inst?.installmentOrder)">
                    Prestação {{ ordinalNumber(inst.installmentOrder) }}<template v-if="paymentTotalInstallments"> de {{ paymentTotalInstallments }}</template>
                  </div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Vencimento</div>
                  <div class="text-h6">{{ formatDate(inst?.dueDate) }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Já pago</div>
                  <div class="text-weight-bold text-positive">{{ formatMoney(paymentAlreadyPaid) }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Saldo em falta</div>
                  <div class="text-weight-bold text-orange">{{ formatMoney(paymentRemaining) }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Método -->
          <div class="text-subtitle2 text-grey-6 q-mb-sm q-px-xs">Método de Pagamento</div>
          <q-btn-toggle
            v-model="paymentMethod"
            :options="[
              { label: 'M-Pesa', value: 'mpesa', icon: 'phone_android' },
              { label: 'Transferência', value: 'transfer', icon: 'account_balance' }
            ]"
            push
            glossy
            no-caps
            class="q-mb-md full-width method-toggle"
            toggle-color="positive"
          />

          <!-- M-Pesa -->
          <template v-if="paymentMethod === 'mpesa'">
            <q-input
              v-model="paymentPhone"
              label="Número M-Pesa (12 dígitos)"
              outlined
              maxlength="12"
              inputmode="numeric"
              class="q-mb-sm"
              :error="paymentPhone.length > 0 && !isValidMpesaPhone"
              error-message="Número inválido — deve ter 12 dígitos e começar por 25884 ou 25885"
              @update:model-value="sanitizePhoneInput"
            >
              <template v-slot:prepend>
                <q-icon name="phone_android" size="18px" />
              </template>
            </q-input>
            <div class="text-caption text-grey-6 q-mb-sm q-px-xs">
              Ex.: 258 84 000 000 · Números M-Pesa começam por 84 ou 85.
            </div>
            <div class="text-caption text-grey-6 q-mb-sm q-px-xs">
              <q-icon name="phone_android" size="13px" class="q-mr-xs" />Pressione <strong>Pagar</strong> e aguarde <strong>10 segundos</strong> para digitar o seu PIN M-Pesa.
            </div>
            <q-card v-if="collectAccount" flat bordered class="q-mb-sm" style="border-radius: 12px; background: rgba(46, 125, 50, 0.06)">
              <q-card-section class="q-py-sm row items-center no-wrap">
                <q-icon name="storefront" size="20px" color="positive" class="q-mr-sm" />
                <div class="col" style="min-width: 0">
                  <div class="text-caption text-grey-5">Pagamento recebido na conta</div>
                  <div class="text-weight-bold" style="font-size: 13px">
                    {{ collectAccount.bank_name }} · {{ collectAccount.accountNumber }}
                  </div>
                  <div class="text-caption text-grey-6" v-if="collectAccount.accountHolder">{{ collectAccount.accountHolder }}</div>
                </div>
                <q-btn flat round dense icon="content_copy" size="sm" color="grey-6" @click="copyAccountNumber(collectAccount)">
                  <q-tooltip>Copiar número</q-tooltip>
                </q-btn>
              </q-card-section>
            </q-card>

            <q-input
              v-model.number="paymentAmount"
              label="Valor a pagar (MZN)"
              outlined
              type="number"
              :min="paymentMinAmount || 0"
              :max="paymentAllowedMax || 0"
              step="0.01"
              class="q-mb-sm"
              :error="amountError && Number(paymentAmount) > 0"
              :error-message="`O valor deve estar entre ${formatMoney(paymentMinAmount)} e ${formatMoney(paymentMaxAmount)}`"
            >
              <template v-slot:prepend>
                <q-icon name="attach_money" size="18px" />
              </template>
            </q-input>
            <div class="text-caption text-grey-6 q-px-xs">
              Pode pagar entre <strong>15%</strong> da prestação ({{ formatMoney(paymentMinAmount) }}) e {{ formatMoney(paymentAllowedMax) }} MZN.
            </div>
            <q-banner v-if="paymentExcessAmount > 0" class="bg-info text-white q-mt-sm" rounded>
              <template v-slot:avatar><q-icon name="forward" size="24px" /></template>
              O valor excede esta prestação em {{ formatMoney(paymentExcessAmount) }}.
              <span v-if="nextPaymentInstallment"> O excedente será aplicado à prestação seguinte.</span>
              <span v-else> Não existe prestação seguinte para receber o troco.</span>
            </q-banner>
          </template>

          <!-- Transferência (informativa) -->
          <template v-else>
            <q-card flat bordered class="q-mb-sm" style="border-radius: 12px; background: rgba(255, 152, 0, 0.08)">
              <q-card-section class="q-py-sm row items-center no-wrap">
                <q-icon name="info_outline" size="20px" color="orange" class="q-mr-sm" />
                <div class="text-caption" style="line-height: 1.5">
                  Pagamento <strong>offline</strong>: transfira <strong>{{ formatMoney(paymentRemaining) }}</strong> para a conta da empresa indicada e conserve o comprovativo. O registo será feito pela instituição após confirmação.
                </div>
              </q-card-section>
            </q-card>
            <q-btn
              outline
              color="primary"
              icon="account_balance"
              label="Ver contas bancárias"
              no-caps
              class="q-mb-sm full-width btn-native"
              @click="openAccounts"
            />
            <q-card v-if="selectedAccount" flat bordered class="q-mb-sm" style="border-radius: 12px">
              <q-card-section class="q-py-sm row items-center no-wrap">
                <q-icon name="check_circle" color="positive" size="20px" class="q-mr-sm" />
                <div class="col" style="min-width: 0">
                  <div class="text-caption text-grey-5">{{ selectedAccount.accountDescription || 'Conta bancária' }}</div>
                  <div class="text-weight-bold" style="font-size: 13px">{{ selectedAccount.accountNumber }}</div>
                  <div class="text-caption text-grey-6" v-if="selectedAccount.accountHolder">{{ selectedAccount.accountHolder }}</div>
                </div>
                <q-btn flat round dense icon="edit" size="sm" color="grey-6" @click="openAccounts">
                  <q-tooltip>Alterar conta</q-tooltip>
                </q-btn>
              </q-card-section>
            </q-card>
            <div v-else class="text-caption text-orange">Escolha a conta da empresa para onde vai efectuar a transferência.</div>
          </template>
        </q-page>
      </q-page-container>

      <!-- Rodapé fixo -->
      <q-footer class="payment-footer bg-white">
        <div class="row q-gutter-sm q-px-sm q-py-sm" style="padding-bottom: calc(8px + env(safe-area-inset-bottom))">
          <q-btn flat label="Cancelar" color="grey" no-caps class="col btn-native" @click="$emit('update:modelValue', false)" />
          <q-btn
            v-if="paymentMethod === 'mpesa'"
            unelevated
            label="Pagar via M-Pesa"
            icon="phone_android"
            color="positive"
            no-caps
            class="col-8 btn-native"
            :loading="paying"
            :disable="!canSubmitPayment"
            @click="processPayment"
          />
          <q-btn
            v-else
            unelevated
            label="Concluir"
            icon="check"
            color="positive"
            no-caps
            class="col-8 btn-native"
            @click="finishTransferInfo"
          />
        </div>
      </q-footer>
    </q-layout>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import { usePortalData } from '@/composables/usePortalData'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  installment: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'paid'])

const $q = useQuasar()
const authStore = useAuthStore()
const {
  customer, loans, allInstallments, collectAccount,
  formatMoney, formatDate, ordinalNumber, normalizeMpesaPhone, downloadPaymentRecibo
} = usePortalData()

const inst = computed(() => props.installment)

const paymentPhone = ref('')
const paymentAmount = ref(0)
const paymentMethod = ref('mpesa')
const paying = ref(false)

const showAccountsModal = ref(false)
const loadingAccounts = ref(false)
const companyAccounts = ref([])
const selectedAccount = ref(null)

// ---- Cálculos (idênticos aos originais) ----
const paymentInstallmentValue = computed(() => Number(inst.value?.installment) || 0)
const paymentAlreadyPaid = computed(() => Number(inst.value?.paidAmount) || 0)
const paymentRemaining = computed(() =>
  Math.max(0, Math.round((paymentInstallmentValue.value - paymentAlreadyPaid.value) * 100) / 100)
)
const paymentLateInterest = computed(() => Number(inst.value?.latePaymentInterest) || 0)
const paymentTotalDue = computed(() => Math.round((paymentRemaining.value + paymentLateInterest.value) * 100) / 100)
const paymentMinAmount = computed(() => {
  if (paymentRemaining.value <= 0) return 0
  const min15 = Math.round(paymentInstallmentValue.value * 0.15 * 100) / 100
  return Math.min(paymentRemaining.value, min15)
})
const paymentMaxAmount = computed(() => paymentRemaining.value)
const nextPaymentInstallment = computed(() => {
  const current = inst.value
  if (!current) return null
  const index = allInstallments.value.findIndex(item => Number(item.id) === Number(current.id))
  return allInstallments.value.slice(index + 1).find(item => Number(item.status) !== 1) || null
})
const nextPaymentRemaining = computed(() => nextPaymentInstallment.value
  ? Math.max(0, Number(nextPaymentInstallment.value.installment || 0) - Number(nextPaymentInstallment.value.paidAmount || 0))
  : 0
)
const paymentAllowedMax = computed(() => Math.round((paymentTotalDue.value + nextPaymentRemaining.value) * 100) / 100)
const paymentExcessAmount = computed(() => Math.max(0, Math.round((Number(paymentAmount.value) - paymentTotalDue.value) * 100) / 100))
const isValidMpesaPhone = computed(() => /^258(84|85)\d{7}$/.test(paymentPhone.value))
const amountError = computed(() => {
  const v = Number(paymentAmount.value)
  if (!(v > 0) || paymentMaxAmount.value <= 0) return false
  return v < paymentMinAmount.value - 0.001 || v > paymentAllowedMax.value + 0.001
})
const canSubmitPayment = computed(() => {
  const v = Number(paymentAmount.value)
  if (!(v > 0) || amountError.value) return false
  return isValidMpesaPhone.value
})
const paymentTotalInstallments = computed(() => {
  const loan = loans.value.find(l => Number(l.id) === Number(inst.value?.loanId))
  return loan ? Number(loan.numberOfInstallments) || null : null
})

function sanitizePhoneInput(value) {
  paymentPhone.value = String(value || '').replace(/[^0-9]/g, '').slice(0, 12)
}

// Preencher ao abrir
watch(() => props.modelValue, open => {
  if (open && inst.value) {
    paymentMethod.value = 'mpesa'
    selectedAccount.value = collectAccount.value
    const remaining = Math.max(0, Math.round(((inst.value.installment || 0) - (inst.value.paidAmount || 0)) * 100) / 100)
    paymentAmount.value = remaining > 0 ? remaining : inst.value.installment || 0
    paymentPhone.value = normalizeMpesaPhone(customer.value?.phone)
  }
})

// ---- Contas bancárias ----
async function fetchCompanyAccounts() {
  const user = authStore.user
  if (!user?.companyId) return
  loadingAccounts.value = true
  try {
    const { data } = await api.get(`/api/accounts/${user.companyId}`)
    companyAccounts.value = data.success && Array.isArray(data.result) ? data.result : []
  } catch (e) {
    console.error('Erro ao carregar contas bancárias:', e)
    companyAccounts.value = []
  } finally {
    loadingAccounts.value = false
  }
}
async function openAccounts() {
  if (companyAccounts.value.length === 0) await fetchCompanyAccounts()
  showAccountsModal.value = true
}
function chooseAccount(account) {
  selectedAccount.value = account
  showAccountsModal.value = false
}

async function copyAccountNumber(account) {
  try {
    await navigator.clipboard.writeText(String(account.accountNumber || ''))
    $q.notify({ type: 'positive', message: 'Número de conta copiado', position: 'top' })
  } catch {
    $q.notify({ type: 'warning', message: 'Não foi possível copiar automaticamente', position: 'top' })
  }
}

// ---- Pagamento (API igual ao original) ----
async function processPayment() {
  const user = authStore.user
  if (!user || !inst.value || paymentMethod.value !== 'mpesa') return
  if (paymentExcessAmount.value > 0 && !nextPaymentInstallment.value) {
    $q.notify({ type: 'negative', message: 'Pagamento rejeitado: não existe prestação seguinte para receber o troco.', position: 'top' })
    return
  }
  paying.value = true
  try {
    const { data } = await api.post(`/api/portal/${user.companyId}/${user.id}/payments`, {
      installmentId: inst.value.id,
      loanId: inst.value.loanId,
      amount: Number(paymentAmount.value),
      method: 'mpesa',
      phone: paymentPhone.value
    })
    if (data.success) {
      // Comprovativo emitido pelo backend no acto do pagamento — o mutuário
      // pode descarregá-lo de imediato (ou mais tarde no Histórico).
      const recibo = data.recibo || null
      const paymentId = data.tranzactionId || null
      $q.notify({
        type: 'positive',
        message: data.message || 'Pagamento registado com sucesso',
        position: 'top',
        timeout: recibo && paymentId ? 12000 : undefined,
        actions: recibo && paymentId
          ? [{
              label: 'Recibo',
              color: 'white',
              noDismiss: true,
              handler: () => downloadPaymentRecibo(paymentId, recibo.numero)
            }]
          : []
      })
      emit('update:modelValue', false)
      emit('paid')
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao processar pagamento', position: 'top' })
  } finally {
    paying.value = false
  }
}

function finishTransferInfo() {
  emit('update:modelValue', false)
  $q.notify({ type: 'info', message: 'Efectue a transferência para a conta indicada e conserve o comprovativo.', position: 'top' })
}
</script>

<style lang="scss" scoped>
.payment-sheet {
  background: #f4f4f4;
}

.payment-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.method-toggle {
  height: 48px;

  :deep(.q-btn) {
    height: 48px;
  }
}

.btn-native {
  min-height: 48px;
  border-radius: 12px;
}
</style>
