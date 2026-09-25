<template>
  <div class="q-pa-md">
    <!-- Selector do crédito -->
    <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="account_balance_wallet" size="20px" color="primary" />
        <div class="text-subtitle1 text-weight-bold">Plano de Amortização</div>
        <q-space />
        <q-select
          v-model="selectedLoanId"
          dense outlined
          :options="loanOptions"
          label="Crédito"
          emit-value map-options
          style="min-width: 220px"
          :disable="loanOptions.length <= 1"
        />
      </q-card-section>
    </q-card>

    <q-skeleton v-if="store.contextLoanLoading && contextInstallments.length === 0" type="rect" height="260px" style="border-radius: 12px" />

    <template v-else-if="contextLoan && contextInstallments.length > 0">
      <!-- KPIs do plano -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-6 col-sm-3" v-for="kpi in planKpis" :key="kpi.label">
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section class="q-py-sm">
              <div class="text-caption text-grey-5" style="font-size: 10px">{{ kpi.label }}</div>
              <div class="text-weight-bold" :class="kpi.class">{{ kpi.value }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Acções -->
      <div class="row q-gutter-sm q-mb-md justify-end">
        <q-btn
          v-if="canRegisterPayment(authStore.userRole)"
          unelevated color="positive" icon="paid"
          label="Liquidar Dívida Total" no-caps rounded
          :disable="store.pendingInstallments.length === 0"
          @click="showLiquidateDialog = true"
        />
        <q-btn outline color="grey-7" icon="download" label="Extracto do Crédito" no-caps rounded :disable="contextInstallments.length === 0" @click="printCreditExtract" />
      </div>

      <!-- Tabela pendentes -->
      <div v-if="store.pendingInstallments.length > 0" class="q-mb-lg">
        <div class="text-subtitle2 text-orange q-mb-xs">
          <q-icon name="schedule" size="16px" class="q-mr-xs" />Prestações pendentes ({{ store.pendingInstallments.length }})
        </div>
        <!-- Desktop: QTable | Mobile xs: QCards -->
        <q-table
          class="gt-xs amort-table"
          :rows="store.pendingInstallments" :columns="pendingColumns"
          row-key="id" flat dense hide-bottom :rows-per-page-options="[0]"
        >
          <template v-slot:body-cell-amortization="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.amortization) }}</q-td></template>
          <template v-slot:body-cell-rateAmount="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.rateAmount) }}</q-td></template>
          <template v-slot:body-cell-installment="props"><q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td></template>
          <template v-slot:body-cell-paidAmount="props">
            <q-td :props="props" class="text-right">
              <span v-if="props.row.paidAmount > 0" class="text-positive text-weight-bold">{{ formatMoney(props.row.paidAmount) }}</span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>
          <template v-slot:body-cell-status="props">
            <q-td :props="props" class="text-center">
              <q-badge v-if="Number(props.row.status) === -1" color="warning" text-color="white" rounded>Pago Parcial</q-badge>
              <q-badge v-else color="grey-4" text-color="grey-7" rounded>Pendente</q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-latePaymentInterest="props">
            <q-td :props="props" class="text-right" :class="props.row.latePaymentInterest > 0 ? 'text-negative text-weight-bold' : ''">{{ formatMoney(props.row.latePaymentInterest || 0) }}</q-td>
          </template>
          <template v-slot:body-cell-totalToPay="props"><q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(installmentTotalDue(props.row)) }}</q-td></template>
          <template v-slot:body-cell-dueDate="props"><q-td :props="props" class="text-right">{{ formatDateShort(props.row.dueDate) }}</q-td></template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn v-if="canRegisterPayment(authStore.userRole)" dense flat round icon="credit_card" size="sm" color="orange" @click="openPayment(props.row, 'full')">
                <q-tooltip>Pagar prestação</q-tooltip>
              </q-btn>
              <q-btn v-if="canRegisterPayment(authStore.userRole)" dense flat round icon="content_cut" size="sm" color="teal" @click="openPayment(props.row, 'partial')">
                <q-tooltip>Pagamento parcial</q-tooltip>
              </q-btn>
              <q-btn v-if="canRegisterPayment(authStore.userRole)" dense flat round icon="sell" size="sm" color="primary" @click="openPayment(props.row, 'discount')">
                <q-tooltip>Pagar com desconto</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <!-- Mobile (xs): cartões -->
        <div class="lt-sm">
          <q-card v-for="row in store.pendingInstallments" :key="row.id" flat bordered class="q-mb-sm" style="border-radius: 12px">
            <q-card-section>
              <div class="row items-center">
                <div class="text-weight-bold">{{ row.installmentOrder }}</div>
                <q-space />
                <q-badge :color="Number(row.status) === -1 ? 'warning' : 'grey-6'" rounded>
                  {{ Number(row.status) === -1 ? 'Pago Parcial' : 'Pendente' }}
                </q-badge>
              </div>
              <div class="text-caption q-mt-xs">
                Prestação: <strong>{{ formatMoney(row.installment) }}</strong> · Vence: {{ formatDateShort(row.dueDate) }}
              </div>
              <div class="text-caption" v-if="Number(row.latePaymentInterest) > 0">
                Mora: <span class="text-negative text-weight-bold">{{ formatMoney(row.latePaymentInterest) }}</span>
              </div>
              <div class="text-caption">Total a pagar: <strong class="text-negative">{{ formatMoney(installmentTotalDue(row)) }}</strong></div>
            </q-card-section>
            <q-card-actions align="right" v-if="canRegisterPayment(authStore.userRole)">
              <q-btn dense outline color="orange" label="Pagar" no-caps @click="openPayment(row, 'full')" />
              <q-btn dense outline color="teal" label="Parcial" no-caps @click="openPayment(row, 'partial')" />
              <q-btn dense outline color="primary" label="Desconto" no-caps @click="openPayment(row, 'discount')" />
            </q-card-actions>
          </q-card>
        </div>
      </div>

      <!-- Tabela pagas -->
      <div v-if="store.paidInstallments.length > 0">
        <div class="text-subtitle2 text-positive q-mb-xs">
          <q-icon name="check_circle" size="16px" class="q-mr-xs" />Prestações pagas ({{ store.paidInstallments.length }})
        </div>
        <q-table
          class="gt-xs amort-table"
          :rows="store.paidInstallments" :columns="paidColumns"
          row-key="id" flat dense hide-bottom :rows-per-page-options="[0]"
        >
          <template v-slot:body-cell-amortization="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.amortization) }}</q-td></template>
          <template v-slot:body-cell-rateAmount="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.rateAmount) }}</q-td></template>
          <template v-slot:body-cell-installment="props"><q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td></template>
          <template v-slot:body-cell-paidAmount="props"><q-td :props="props" class="text-right text-positive text-weight-bold">{{ formatMoney(props.row.paidAmount || props.row.installment) }}</q-td></template>
          <template v-slot:body-cell-chargedLatePaymentInterest="props">
            <q-td :props="props" class="text-right">
              <span :class="props.row.chargedLatePaymentInterest > 0 ? 'text-negative text-weight-bold' : 'text-grey-5'">{{ formatMoney(props.row.chargedLatePaymentInterest || 0) }}</span>
            </q-td>
          </template>
          <template v-slot:body-cell-dueDate="props"><q-td :props="props" class="text-right">{{ formatDateShort(props.row.dueDate) }}</q-td></template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn flat round dense icon="receipt" size="xs" color="positive" @click="$emit('print-receipt', props.row)">
                <q-tooltip>Recibo</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
        <div class="lt-sm">
          <q-card v-for="row in store.paidInstallments" :key="row.id" flat bordered class="q-mb-sm" style="border-radius: 12px">
            <q-card-section>
              <div class="row items-center">
                <div class="text-weight-bold">{{ row.installmentOrder }}</div>
                <q-space />
                <q-badge color="positive" rounded>Pago</q-badge>
              </div>
              <div class="text-caption q-mt-xs">Pago: <strong class="text-positive">{{ formatMoney(row.paidAmount || row.installment) }}</strong> · {{ formatDateShort(row.dueDate) }}</div>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn dense outline color="positive" icon="receipt" label="Recibo" no-caps @click="$emit('print-receipt', row)" />
            </q-card-actions>
          </q-card>
        </div>
      </div>

      <div v-if="store.pendingInstallments.length === 0 && store.paidInstallments.length === 0" class="text-center q-pa-lg text-grey-5">
        <q-icon name="info" size="40px" />
        <div class="text-caption q-mt-sm">Sem prestações registadas.</div>
      </div>
    </template>

    <q-card v-else flat bordered style="border-radius: 12px">
      <q-card-section class="text-center q-pa-xl text-grey-5">
        <q-icon name="account_balance_wallet" size="48px" />
        <div class="text-caption q-mt-sm">Sem crédito activo com plano de amortização.</div>
      </q-card-section>
    </q-card>

    <!-- ===================== DIALOG: LIQUIDAR DÍVIDA TOTAL ===================== -->
    <q-dialog v-model="showLiquidateDialog" persistent>
      <q-card style="border-radius: 16px; min-width: 560px; max-width: 95vw">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="paid" size="24px" color="positive" class="q-mr-sm" />
          <div class="text-h6">Liquidar Dívida Total</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showLiquidateDialog = false" />
        </q-card-section>
        <q-card-section>
          <!-- Lista de prestações a liquidar -->
          <q-markup-table flat dense bordered class="q-mb-md">
            <thead>
              <tr class="bg-grey-2">
                <th class="text-left">Prestação</th>
                <th class="text-right">Saldo</th>
                <th class="text-right">Mora</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in store.pendingInstallments" :key="row.id">
                <td>{{ row.installmentOrder }} <span class="text-grey-5 text-caption">({{ formatDateShort(row.dueDate) }})</span></td>
                <td class="text-right">{{ formatMoney(installmentRemaining(row)) }}</td>
                <td class="text-right" :class="installmentLateInterest(row) > 0 ? 'text-negative' : ''">{{ formatMoney(installmentLateInterest(row)) }}</td>
                <td class="text-right text-weight-bold">{{ formatMoney(installmentTotalDue(row)) }}</td>
              </tr>
              <tr class="bg-green-1">
                <td class="text-weight-bold">Total</td>
                <td></td>
                <td></td>
                <td class="text-right text-weight-bold text-positive">{{ formatMoney(totalPendingAmount) }}</td>
              </tr>
            </tbody>
          </q-markup-table>

          <!-- Desconto -->
          <q-toggle v-model="liquidateForm.applyDiscount" label="Aplicar desconto por liquidação antecipada" color="positive" />
          <div class="row q-col-gutter-md q-mt-xs" v-if="liquidateForm.applyDiscount">
            <div class="col-6">
              <q-select v-model="liquidateForm.discountType" dense outlined :options="discountOptions" label="Tipo de desconto" emit-value map-options />
            </div>
            <div class="col-6" v-if="liquidateForm.discountType === 'percentage'">
              <q-input v-model.number="liquidateForm.discountPercentage" dense outlined label="Desconto (%)" type="number" min="0" max="100" />
            </div>
            <div class="col-6" v-if="liquidateForm.discountType === 'fixed'">
              <q-input v-model.number="liquidateForm.discountFixed" dense outlined label="Desconto (MZN)" type="number" min="0" />
            </div>
            <div class="col-12" v-if="totalWithDiscount > 0">
              <div class="text-caption text-grey-6">Valor com desconto:
                <strong class="text-positive">{{ formatMoney(totalWithDiscount) }}</strong>
                (poupança de {{ formatMoney(totalPendingAmount - totalWithDiscount) }})
              </div>
            </div>
          </div>

          <q-separator class="q-my-md" />
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input v-model="liquidateForm.paymentDate" dense outlined label="Data de pagamento" type="date" :max="todayDate" />
            </div>
            <div class="col-6">
              <q-select v-model="liquidateForm.paymentMethod" dense outlined :options="paymentMethods" label="Meio de pagamento *" emit-value map-options />
            </div>
            <div class="col-6">
              <q-input v-model="liquidateForm.paymentReference" dense outlined label="Referência *" />
            </div>
            <div class="col-6">
              <q-input v-model="liquidateForm.phoneNumber" dense outlined label="Telefone do cliente" />
            </div>
            <div class="col-12">
              <q-input v-model="liquidateForm.observation" dense outlined type="textarea" rows="2"
                :label="liquidateForm.applyDiscount ? 'Nota/Parecer (obrigatório com desconto) *' : 'Nota/Parecer'"
                :rules="liquidateForm.applyDiscount ? [val => !!val || 'Obrigatório quando há desconto'] : []" />
            </div>
          </div>
          <q-banner class="bg-blue-1 text-blue-10 q-mt-sm" rounded dense>
            <template v-slot:avatar><q-icon name="lock" /></template>
            A liquidação é <strong>atómica</strong>: todas as prestações são registadas numa única transação SQL. Se algo falhar, nada é gravado.
          </q-banner>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showLiquidateDialog = false" />
          <q-btn
            unelevated label="Confirmar Liquidação" color="positive" icon="check_circle" no-caps rounded
            :loading="store.liquidating"
            :disable="!liquidateFormValid"
            @click="confirmLiquidation"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===================== DIALOG: PAGAMENTO INDIVIDUAL ===================== -->
    <q-dialog v-model="showPaymentModal" persistent>
      <q-card style="border-radius: 16px; min-width: 480px; max-width: 95vw">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="payment" size="24px" color="positive" class="q-mr-sm" />
          <div class="text-h6">
            {{ paymentMode === 'discount' ? 'Pagamento com Desconto' : paymentMode === 'partial' ? 'Pagamento Parcial' : 'Registar Pagamento' }}
            — {{ currentInstallment?.installmentOrder }}
          </div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showPaymentModal = false" />
        </q-card-section>
        <q-card-section>
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6 col-sm-3">
              <div class="summary-card"><div class="text-caption text-grey-5" style="font-size:10px">Prestação</div><div class="text-weight-bold text-primary">{{ formatMoney(currentInstallment?.installment || 0) }}</div></div>
            </div>
            <div class="col-6 col-sm-3">
              <div class="summary-card"><div class="text-caption text-grey-5" style="font-size:10px">Em falta</div><div class="text-weight-bold">{{ formatMoney(installmentRemaining(currentInstallment)) }}</div></div>
            </div>
            <div class="col-6 col-sm-3">
              <div class="summary-card"><div class="text-caption text-grey-5" style="font-size:10px">Mora</div><div class="text-weight-bold text-negative">{{ formatMoney(paymentLateInterest) }}</div></div>
            </div>
            <div class="col-6 col-sm-3">
              <div class="summary-card"><div class="text-caption text-grey-5" style="font-size:10px">Total a pagar</div><div class="text-weight-bold text-negative">{{ formatMoney(paymentTotalDue) }}</div></div>
            </div>
          </div>
          <q-form ref="paymentFormRef" class="row q-col-gutter-md" @submit.prevent>
            <div class="col-6">
              <q-input v-model="paymentForm.paymentDate" dense outlined label="Data de pagamento" type="date" :max="todayDate" :rules="[val => !!val || 'Obrigatório']" />
            </div>
            <div class="col-6">
              <q-select v-model="paymentForm.paymentMethod" dense outlined :options="paymentMethods" label="Meio de pagamento *" emit-value map-options :rules="[val => !!val || 'Obrigatório']" />
            </div>
            <div class="col-6">
              <q-input v-model="paymentForm.paymentReference" dense outlined label="Referência *" :rules="[val => !!val || 'Obrigatório']" />
            </div>
            <div class="col-6">
              <q-input v-model.number="paymentForm.amountReceived" dense outlined label="Valor a pagar *" type="number" min="0" :rules="[val => val > 0 || 'Valor inválido']" />
            </div>
            <div class="col-6">
              <q-input v-model="paymentForm.phoneNumber" dense outlined label="Telefone do cliente" />
            </div>
            <div class="col-6">
              <q-input v-model="paymentForm.staffName" dense outlined disable label="Funcionário responsável" />
            </div>
            <div class="col-6" v-if="paymentMode === 'discount'">
              <q-select v-model="paymentForm.discountType" dense outlined :options="discountOptions" label="Tipo de desconto" emit-value map-options />
            </div>
            <div class="col-6" v-if="paymentMode === 'discount' && paymentForm.discountType === 'percentage'">
              <q-input v-model.number="paymentForm.discountPercentage" dense outlined label="Desconto (%)" type="number" min="0" max="100" :rules="paymentMode === 'discount' ? [val => (val > 0 && val < 100) || 'Desconto inválido'] : []" />
            </div>
            <div class="col-6" v-if="paymentMode === 'discount' && paymentForm.discountType === 'fixed'">
              <q-input v-model.number="paymentForm.discountFixed" dense outlined label="Desconto (MZN)" type="number" min="0" :rules="paymentMode === 'discount' ? [val => val > 0 || 'Desconto inválido'] : []" />
            </div>
            <div class="col-12">
              <q-file v-model="paymentForm.receiptFile" dense outlined label="Comprovativo de pagamento" accept=".pdf,.jpg,.jpeg,.png">
                <template v-slot:prepend><q-icon name="attach_file" size="16px" /></template>
              </q-file>
            </div>
            <div class="col-12" v-if="paymentMode === 'partial'">
              <q-banner class="bg-warning text-white" rounded dense>
                <template v-slot:avatar><q-icon name="warning" /></template>
                Pagamento parcial: ficará um saldo devedor de {{ formatMoney(Math.max(0, installmentTotalDue(currentInstallment) - paymentForm.amountReceived)) }}
              </q-banner>
            </div>
          </q-form>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showPaymentModal = false" />
          <q-btn unelevated label="Confirmar Pagamento" color="positive" icon="check_circle" no-caps rounded :loading="paying" :disable="!paymentFormValid" @click="submitPayment" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useSettingsStore } from '@/stores/settings'
import { formatMoney, formatDateShort } from '@/utils/formatters'
import { canRegisterPayment } from '@/utils/permissions'

const $q = useQuasar()
const store = useMutuarioStore()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const settingsStore = useSettingsStore()

defineEmits(['print-receipt'])

const todayDate = new Date().toISOString().split('T')[0]
const showLiquidateDialog = ref(false)
const showPaymentModal = ref(false)
const paying = ref(false)
const paymentMode = ref('full') // full | partial | discount
const currentInstallment = ref(null)
const selectedLoanId = ref(null)
const paymentFormRef = ref(null)

const liquidateForm = ref({
  applyDiscount: false,
  discountType: 'percentage',
  discountPercentage: 0,
  discountFixed: 0,
  paymentDate: todayDate,
  paymentMethod: null,
  paymentReference: '',
  phoneNumber: '',
  observation: ''
})

const paymentForm = ref({
  paymentDate: todayDate,
  paymentMethod: null,
  paymentReference: '',
  amountReceived: 0,
  phoneNumber: '',
  staffName: authStore.userName || '',
  discountType: 'percentage',
  discountPercentage: 0,
  discountFixed: 0,
  receiptFile: null
})

const discountOptions = [
  { label: 'Percentual (%)', value: 'percentage' },
  { label: 'Valor Fixo (MZN)', value: 'fixed' }
]

const paymentMethods = computed(() => {
  const accounts = (settingsStore.accounts || []).map(acc => ({
    label: acc.accountDescription || acc.accountNumber || `Conta ${acc.id}`,
    value: acc.id
  }))
  if (accounts.length > 0) return [{ label: 'Seleccionar método', value: null }, ...accounts]
  return [
    { label: 'Seleccionar método', value: null },
    { label: 'Numerário', value: 1 },
    { label: 'Cheque', value: 2 },
    { label: 'Transferência Bancária', value: 3 },
    { label: 'Depósito Bancário', value: 4 },
    { label: 'M-Pesa', value: 7 }
  ]
})

const loanOptions = computed(() => {
  const options = store.loans
    .filter(l => [1, 3].includes(Number(l.status)))
    .map(l => ({ label: `#${l.id} — ${formatMoney(l.amount)} (${Number(l.status) === 1 ? 'Activo' : 'Terminado'})`, value: l.id }))
  return options.length > 0 ? options : [{ label: 'Sem créditos com plano', value: null }]
})

watch(loanOptions, (opts) => {
  if (opts.length > 0 && !selectedLoanId.value) {
    selectedLoanId.value = opts[0].value
  }
}, { immediate: true })

// Crédito EM CONTEXTO desta aba — nunca muta store.activeLoan (que alimenta
// os KPIs do header). Todas as acções abaixo usam contextLoan.id explícito.
const contextLoan = computed(() =>
  store.loans.find(l => Number(l.id) === Number(selectedLoanId.value)) || null
)
const contextInstallments = computed(() =>
  Number(store.contextLoan?.id) === Number(selectedLoanId.value)
    ? store.contextInstallments
    : []
)

watch(selectedLoanId, async (id) => {
  if (id) {
    await store.fetchPlanFor(id, companyStore.company?.forfeit || 0.1)
  }
}, { immediate: true })

// ── Helpers das prestações (espelham a semântica do backend) ──
const installmentRemaining = (inst) => Math.max(0, Number(inst?.installment || 0) - Number(inst?.paidAmount || 0))
const installmentLateInterest = (inst) => Number(inst?.latePaymentInterest || 0)
const installmentTotalDue = (inst) => Math.round((installmentRemaining(inst) + installmentLateInterest(inst)) * 100) / 100

const totalPendingAmount = computed(() =>
  store.pendingInstallments.reduce((sum, inst) => sum + installmentTotalDue(inst), 0)
)

const totalWithDiscount = computed(() => {
  const total = totalPendingAmount.value
  if (!liquidateForm.value.applyDiscount) return total
  if (liquidateForm.value.discountType === 'percentage') {
    return total * (1 - (Number(liquidateForm.value.discountPercentage) || 0) / 100)
  }
  return Math.max(0, total - (Number(liquidateForm.value.discountFixed) || 0))
})

const liquidateFormValid = computed(() =>
  !!liquidateForm.value.paymentMethod &&
  !!String(liquidateForm.value.paymentReference || '').trim() &&
  !!liquidateForm.value.paymentDate &&
  (!liquidateForm.value.applyDiscount || !!String(liquidateForm.value.observation || '').trim())
)

// Mora respeita a data efectiva do pagamento (forfeit diário da empresa)
const paymentLateInterest = computed(() => {
  const inst = currentInstallment.value
  if (!inst || Number(inst.status) === 1) return 0
  const dueDate = new Date(inst.dueDate)
  const payDate = new Date(`${paymentForm.value.paymentDate}T00:00:00`)
  if (Number.isNaN(dueDate.getTime()) || Number.isNaN(payDate.getTime())) return 0
  const daysLate = Math.max(0, Math.floor((payDate - dueDate) / 86400000))
  const forfeit = Number(companyStore.company?.forfeit) || 0
  return Math.round((Number(inst.installment || 0) * (forfeit / 100) * daysLate) * 100) / 100
})

const paymentTotalDue = computed(() => {
  if (!currentInstallment.value) return 0
  if (paymentMode.value === 'discount') {
    const remaining = installmentRemaining(currentInstallment.value)
    const discount = paymentForm.value.discountType === 'percentage'
      ? remaining * ((Number(paymentForm.value.discountPercentage) || 0) / 100)
      : Math.min(remaining, Number(paymentForm.value.discountFixed) || 0)
    return Math.round((remaining - discount + paymentLateInterest.value) * 100) / 100
  }
  if (paymentMode.value === 'partial') {
    return Number(paymentForm.value.amountReceived) || 0
  }
  return Math.round((installmentRemaining(currentInstallment.value) + paymentLateInterest.value) * 100) / 100
})

const paymentFormValid = computed(() =>
  !!paymentForm.value.paymentMethod &&
  !!String(paymentForm.value.paymentReference || '').trim() &&
  Number(paymentForm.value.amountReceived) > 0 &&
  !!paymentForm.value.paymentDate
)

const planKpis = computed(() => [
  { label: 'Capital Financiado', value: formatMoney(contextLoan.value?.amount || 0), class: 'text-primary' },
  { label: 'Total Pago', value: formatMoney(contextInstallments.value.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0)), class: 'text-positive' },
  { label: 'Saldo Remanescente', value: formatMoney(totalPendingAmount.value), class: totalPendingAmount.value > 0 ? 'text-negative' : 'text-positive' },
  { label: 'Prestações', value: `${store.paidInstallments.length} / ${contextInstallments.value.length}`, class: '' }
])

const pendingColumns = [
  { name: 'installmentOrder', label: 'Ordem', field: 'installmentOrder', align: 'center' },
  { name: 'amortization', label: 'Capital', field: 'amortization', align: 'right' },
  { name: 'rateAmount', label: 'Juros', field: 'rateAmount', align: 'right' },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right' },
  { name: 'paidAmount', label: 'Valor Pago', field: 'paidAmount', align: 'right' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'latePaymentInterest', label: 'Juros de Mora', field: 'latePaymentInterest', align: 'right' },
  { name: 'totalToPay', label: 'Total a Pagar', field: 'totalToPay', align: 'right' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'right' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

const paidColumns = [
  { name: 'installmentOrder', label: 'Ordem', field: 'installmentOrder', align: 'center' },
  { name: 'amortization', label: 'Capital', field: 'amortization', align: 'right' },
  { name: 'rateAmount', label: 'Juros', field: 'rateAmount', align: 'right' },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right' },
  { name: 'paidAmount', label: 'Valor Pago', field: 'paidAmount', align: 'right' },
  { name: 'chargedLatePaymentInterest', label: 'Juros de Mora', field: 'chargedLatePaymentInterest', align: 'right' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'right' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

function openPayment(installment, mode) {
  currentInstallment.value = installment
  paymentMode.value = mode
  const remaining = installmentRemaining(installment)
  const autoAmount = mode === 'full' ? installmentTotalDue(installment) : mode === 'discount' ? remaining : remaining / 2
  paymentForm.value = {
    paymentDate: todayDate,
    paymentMethod: null,
    paymentReference: '',
    amountReceived: Math.round(autoAmount * 100) / 100,
    phoneNumber: store.customer?.customerPhone || '',
    staffName: authStore.userName || '',
    discountType: 'percentage',
    discountPercentage: mode === 'discount' ? 10 : 0,
    discountFixed: 0,
    receiptFile: null
  }
  showPaymentModal.value = true
}

async function submitPayment() {
  if (!currentInstallment.value || !contextLoan.value) return
  const valid = await paymentFormRef.value.validate()
  if (!valid) return
  paying.value = true
  try {
    let receiptUrl = ''
    if (paymentForm.value.receiptFile) {
      const fd = new FormData()
      fd.append('file', paymentForm.value.receiptFile)
      const { data: up } = await (await import('@/boot/axios')).api.post('/api/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (up?.success) receiptUrl = up.documentFileUrl || up.imageUrl || ''
    }

    let amount = Number(paymentForm.value.amountReceived) || 0
    let discountApplied = false
    let discountAmount = 0
    if (paymentMode.value === 'discount') {
      const remaining = installmentRemaining(currentInstallment.value)
      discountAmount = paymentForm.value.discountType === 'percentage'
        ? Math.round(remaining * ((Number(paymentForm.value.discountPercentage) || 0) / 100) * 100) / 100
        : Math.min(remaining, Number(paymentForm.value.discountFixed) || 0)
      // amount = valor efectivo pago (saldo - desconto); o backend valida
      amount = Math.min(amount, Math.round((remaining - discountAmount) * 100) / 100)
      discountApplied = discountAmount > 0
    } else {
      amount = Math.min(amount, installmentRemaining(currentInstallment.value))
    }

    await store.payInstallment({
      companyId: store.customer.companyId,
      accountNumber: store.customer.accountNumber,
      amortizationLoanId: currentInstallment.value.id,
      loanId: contextLoan.value.id,
      amount,
      latePaymentInterest: paymentLateInterest.value,
      interestRateAmount: currentInstallment.value.rateAmount || 0,
      phoneNumber: paymentForm.value.phoneNumber || store.customer?.customerPhone || '',
      tranzactionReference: paymentForm.value.paymentReference,
      paymentMethod: paymentForm.value.paymentMethod,
      description: `Pagamento prestação ${currentInstallment.value.installmentOrder}${discountApplied ? ' (com desconto)' : ''}`,
      receiptUrl,
      staffName: paymentForm.value.staffName || '',
      paymentDate: paymentForm.value.paymentDate,
      discountApplied,
      discountAmount
    })

    $q.notify({ type: 'positive', message: 'Pagamento registado com sucesso', position: 'top' })
    showPaymentModal.value = false
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || e.message || 'Erro ao registar pagamento', position: 'top' })
  } finally {
    paying.value = false
  }
}

async function confirmLiquidation() {
  try {
    const data = await store.liquidateAll({
      loanId: contextLoan.value.id,
      paymentMethod: liquidateForm.value.paymentMethod,
      tranzactionReference: liquidateForm.value.paymentReference,
      phoneNumber: liquidateForm.value.phoneNumber || store.customer?.customerPhone || '',
      staffName: authStore.userName || '',
      paymentDate: liquidateForm.value.paymentDate,
      notes: liquidateForm.value.observation || null,
      discountApplied: liquidateForm.value.applyDiscount,
      discountType: liquidateForm.value.discountType,
      discountPercentage: Number(liquidateForm.value.discountPercentage) || 0,
      discountFixed: Number(liquidateForm.value.discountFixed) || 0
    })
    $q.notify({
      type: 'positive',
      message: `Liquidação atómica concluída: ${data.result?.installmentsCleared || 0} prestação(ões), ${formatMoney(data.result?.totalPaid || 0)} pagos`,
      position: 'top',
      timeout: 5000
    })
    showLiquidateDialog.value = false
  } catch (e) {
    // Erro atómico: nada foi gravado, pode tentar de novo
    $q.notify({ type: 'negative', message: e.response?.data?.message || e.message || 'Falha na liquidação — nada foi gravado', position: 'top', timeout: 6000 })
  }
}

// ── Extracto simples da aba (o extracto oficial completo está na aba Documentos Legais) ──
async function printCreditExtract() {
  try {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake')
    const pdfFonts = await import('pdfmake/build/vfs_fonts')
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs || pdfFonts.default?.vfs || {}

    const loan = contextLoan.value
    const cust = store.customer
    const rows = contextInstallments.value

    const body = rows.map(row => {
      const status = Number(row.status) === 1 ? 'Pago' : Number(row.status) === -1 ? 'Parcial' : 'Pendente'
      const late = Number(row.status) === 1 ? Number(row.chargedLatePaymentInterest || 0) : Number(row.latePaymentInterest || 0)
      return [
        { text: row.installmentOrder || '', fontSize: 7, alignment: 'center' },
        { text: formatDateShort(row.dueDate), fontSize: 7, alignment: 'center' },
        { text: formatMoney(row.installment), fontSize: 7, alignment: 'right' },
        { text: formatMoney(late), fontSize: 7, alignment: 'right', color: late > 0 ? '#c62828' : '#999' },
        { text: formatMoney(Number(row.paidAmount) || 0), fontSize: 7, alignment: 'right', color: '#2e7d32' },
        { text: status, fontSize: 7, bold: true, alignment: 'center', color: status === 'Pago' ? '#2e7d32' : status === 'Parcial' ? '#f57c00' : '#c62828' }
      ]
    })

    const docDefinition = {
      content: [
        { text: cust?.customerName || '', fontSize: 14, bold: true },
        { text: `Conta ${cust?.accountNumber || ''} · Crédito #${loan?.id || ''} · Taxa ${((Number(loan?.interestRate) || 0) * 100).toFixed(1)}% a.m.`, fontSize: 9, color: '#666', margin: [0, 2, 0, 12] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto'],
            body: [
              ['Ordem', 'Vencimento', 'Prestação', 'Mora', 'Pago', 'Estado'].map(h => ({ text: h, bold: true, fontSize: 7, color: '#fff', fillColor: '#1a237e', alignment: 'center' })),
              ...body
            ]
          }
        },
        { text: `Total pago: ${formatMoney(contextInstallments.value.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0))} · Saldo: ${formatMoney(totalPendingAmount.value)}`, fontSize: 9, bold: true, margin: [0, 10, 0, 0] }
      ],
      pageSize: 'A4',
      pageMargins: [25, 15, 25, 15]
    }
    pdfMake.createPdf(docDefinition).open()
  } catch (e) {
    console.error('Erro ao gerar extracto:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar extracto', position: 'top' })
  }
}
</script>

<style lang="scss" scoped>
.amort-table {
  font-size: 11px;
}
.summary-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fafafa;
}
</style>
