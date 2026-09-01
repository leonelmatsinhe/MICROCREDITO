<template>
  <q-dialog v-model="show" persistent maximized>
    <q-card style="border-radius: 16px; max-width: 800px; margin: auto">
      <q-card-section class="bg-green text-white row items-center" style="border-radius: 16px 16px 0 0">
        <q-icon name="payments" size="24px" class="q-mr-sm" />
        <div class="text-h6">Pagamentos</div>
        <div class="text-caption q-ml-sm" style="opacity: 0.8">Conta #{{ accountNumber }}</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- Summary Cards -->
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-6 col-sm-3">
            <q-card flat bordered style="border-radius: 10px">
              <q-card-section class="q-py-sm text-center">
                <div class="text-caption text-grey-5" style="font-size: 11px">Total Pago</div>
                <div class="text-weight-bold text-positive" style="font-size: 16px">{{ formatMoney(totalPaid) }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-sm-3">
            <q-card flat bordered style="border-radius: 10px">
              <q-card-section class="q-py-sm text-center">
                <div class="text-caption text-grey-5" style="font-size: 11px">Nº Pagamentos</div>
                <div class="text-weight-bold" style="font-size: 16px">{{ payments.length }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-sm-3">
            <q-card flat bordered style="border-radius: 10px">
              <q-card-section class="q-py-sm text-center">
                <div class="text-caption text-grey-5" style="font-size: 11px">Juros Mora</div>
                <div class="text-weight-bold text-orange" style="font-size: 16px">{{ formatMoney(totalLateInterest) }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-sm-3">
            <q-card flat bordered style="border-radius: 10px">
              <q-card-section class="q-py-sm text-center">
                <div class="text-caption text-grey-5" style="font-size: 11px">Último Pagamento</div>
                <div class="text-weight-bold" style="font-size: 13px">{{ lastPaymentDate }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Register Payment -->
        <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-md">
              <q-icon name="add_circle" size="16px" class="q-mr-xs" />
              Registar Pagamento
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-4">
                <q-select
                  v-model="form.loanId"
                  dense
                  outlined
                  :options="loanOptions"
                  label="Crédito *"
                  emit-value
                  map-options
                  input-style="font-size: 13px"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-select
                  v-model="form.amortizationLoanId"
                  dense
                  outlined
                  :options="installmentOptions"
                  label="Prestação *"
                  emit-value
                  map-options
                  input-style="font-size: 13px"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="form.amount"
                  dense
                  outlined
                  label="Valor (MT) *"
                  type="number"
                  input-style="font-size: 13px"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm q-mt-sm">
              <div class="col-12 col-sm-4">
                <q-select
                  v-model="form.paymentMethod"
                  dense
                  outlined
                  :options="paymentMethods"
                  label="Método de Pagamento"
                  emit-value
                  map-options
                  input-style="font-size: 13px"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model="form.tranzactionReference"
                  dense
                  outlined
                  label="Referência"
                  input-style="font-size: 13px"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model="form.description"
                  dense
                  outlined
                  label="Descrição"
                  input-style="font-size: 13px"
                />
              </div>
            </div>

            <div class="row justify-end q-mt-sm">
              <q-btn
                color="positive"
                icon="save"
                label="Registar"
                unelevated
                rounded
                size="sm"
                no-caps
                :loading="saving"
                :disable="!form.loanId || !form.amortizationLoanId || !form.amount"
                @click="registerPayment"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Payments List -->
        <q-card flat bordered style="border-radius: 12px">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-subtitle2 text-weight-bold">
                <q-icon name="history" size="16px" class="q-mr-xs" />
                Histórico de Pagamentos
              </div>
              <q-space />
              <q-badge color="grey">{{ payments.length }}</q-badge>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="text-center q-pa-md">
              <q-spinner-dots size="30px" color="green" />
            </div>

            <!-- Empty State -->
            <div v-else-if="payments.length === 0" class="text-center q-pa-lg">
              <q-icon name="receipt_long" size="40px" color="grey-4" />
              <div class="text-caption text-grey-5 q-mt-sm">Nenhum pagamento registado</div>
            </div>

            <!-- Payments Table -->
            <q-table
              v-else
              :rows="payments"
              :columns="columns"
              row-key="id"
              flat
              bordered
              dense
              separator="horizontal"
              :rows-per-page-options="[10, 25, 50]"
              class="payments-table"
            >
              <template v-slot:body-cell-amount="props">
                <q-td :props="props">
                  <span class="text-weight-bold text-positive">{{ formatMoney(props.row.amount) }}</span>
                </q-td>
              </template>

              <template v-slot:body-cell-method="props">
                <q-td :props="props">
                  <q-badge
                    :color="getMethodColor(props.row.paymentMethod)"
                    :label="getMethodLabel(props.row.paymentMethod)"
                    rounded
                    style="font-size: 10px"
                  />
                </q-td>
              </template>

              <template v-slot:body-cell-date="props">
                <q-td :props="props">
                  {{ formatDate(props.row.paymentDate || props.row.createdAt) }}
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { usePaymentsStore } from '@/stores/payments'
import { useCompanyStore } from '@/stores/company'
import { useSettingsStore } from '@/stores/settings'
import { useLoansStore } from '@/stores/loans'
import { api } from '@/boot/axios'

const $q = useQuasar()
const authStore = useAuthStore()
const paymentsStore = usePaymentsStore()
const loansStore = useLoansStore()

const props = defineProps({
  modelValue: Boolean,
  accountNumber: [String, Number]
})

const emit = defineEmits(['update:modelValue'])

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = computed(() => paymentsStore.loading)
const saving = computed(() => paymentsStore.saving)
const payments = computed(() => paymentsStore.payments)
const totalPaid = computed(() => paymentsStore.totalPaid)
const totalLateInterest = computed(() => payments.value.reduce((sum, p) => sum + (p.latePaymentInterest || 0), 0))

const lastPaymentDate = computed(() => {
  if (payments.value.length === 0) return '—'
  const sorted = [...payments.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return formatDate(sorted[0].paymentDate || sorted[0].createdAt)
})

const loanOptions = computed(() => {
  return loansStore.loans
    .filter(l => String(l.accountNumber) === String(props.accountNumber))
    .map(l => ({
      label: `#${l.id} - ${formatMoney(l.amount)} (${l.numberOfInstallments}x)`,
      value: l.id
    }))
})

const installmentOptions = ref([])

const form = ref({
  loanId: null,
  amortizationLoanId: null,
  amount: 0,
  paymentMethod: 1,
  tranzactionReference: '',
  description: ''
})

const companyStore = useCompanyStore()
const settingsStore = useSettingsStore()

const paymentMethods = computed(() => {
  // Buscar meios de pagamento da tabela accounts (Contas Bancárias)
  const accounts = settingsStore.accounts || []
  const methods = accounts.map(acc => ({
    label: acc.accountDescription || acc.accountNumber || `Conta ${acc.id}`,
    value: acc.id
  }))
  // Fallback para meios padrão se não houver contas registadas
  if (methods.length === 0) {
    return [
      { label: 'Numerário', value: 1 },
      { label: 'Cheque', value: 2 },
      { label: 'Transferência Bancária', value: 3 },
      { label: 'Depósito Bancário', value: 4 },
      { label: 'M-Pesa', value: 7 }
    ]
  }
  return methods
})

const columns = [
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right', sortable: true },
  { name: 'method', label: 'Método', field: 'paymentMethod', align: 'center', sortable: true },
  { name: 'reference', label: 'Referência', field: 'tranzactionReference', align: 'center', sortable: true },
  { name: 'date', label: 'Data', field: 'paymentDate', align: 'center', sortable: true },
  { name: 'staff', label: 'Registado por', field: 'staffName', align: 'left', sortable: true }
]

watch(show, async (val) => {
  if (val && props.accountNumber) {
    await paymentsStore.fetchCustomerPayments(props.accountNumber)
    // Load loans for this customer
    if (authStore.companyId) {
      await loansStore.fetchLoans(authStore.companyId)
      loansStore.loans = loansStore.loans.filter(l => String(l.accountNumber) === String(props.accountNumber))
    }
  }
})

watch(() => form.value.loanId, async (loanId) => {
  if (loanId) {
    // Fetch installments for this loan
    try {
      const { data } = await api.get(`/api/loan/amortization/${loanId}`)
      if (data.success && data.result) {
        installmentOptions.value = data.result
          .filter(i => i.status === 0 || i.status === 2)
          .map(i => ({
            label: `${i.installmentOrder} - ${formatMoney(i.installment)} (${i.dueDate})`,
            value: i.id
          }))
      }
    } catch {
      installmentOptions.value = []
    }
  } else {
    installmentOptions.value = []
  }
})

function formatMoney(value) {
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0) + ' MT'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-MZ')
}

function getMethodColor(method) {
  const colors = { 1: 'green', 2: 'blue', 3: 'purple', 4: 'orange' }
  return colors[method] || 'grey'
}

function getMethodLabel(method) {
  const labels = { 1: 'Dinheiro', 2: 'M-Pesa', 3: 'Transferência', 4: 'Depósito' }
  return labels[method] || 'Outro'
}

async function registerPayment() {
  try {
    await paymentsStore.createPayment({
      companyId: authStore.companyId,
      accountNumber: props.accountNumber,
      loanId: form.value.loanId,
      amortizationLoanId: form.value.amortizationLoanId,
      amount: form.value.amount,
      paymentMethod: form.value.paymentMethod,
      tranzactionReference: form.value.tranzactionReference,
      description: form.value.description,
      staffName: authStore.userName,
      paymentDate: new Date().toISOString().split('T')[0]
    })
    $q.notify({ type: 'positive', message: 'Pagamento registado com sucesso', position: 'top' })
    form.value = { loanId: null, amortizationLoanId: null, amount: 0, paymentMethod: 1, tranzactionReference: '', description: '' }
    await paymentsStore.fetchCustomerPayments(props.accountNumber)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao registar pagamento', position: 'top' })
  }
}

function close() {
  show.value = false
}
</script>

<style lang="scss" scoped>
.payments-table {
  :deep(.q-table thead th) {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    color: $grey-6;
    background-color: $grey-1;
  }
  :deep(.q-table tbody td) {
    font-size: 12px;
    padding: 6px 10px;
  }
}

body.body--dark .payments-table {
  :deep(.q-table thead th) {
    background-color: $dark-page;
    color: $grey-5;
  }
}
</style>
