<template>
  <div class="portal-container">
    <!-- Header -->
    <q-header class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat round dense icon="menu" @click="drawer = !drawer" />
        <q-toolbar-title>
          <div class="row items-center">
            <q-icon name="account_balance" size="20px" class="q-mr-sm" />
            <span>Meu Painel</span>
          </div>
        </q-toolbar-title>
        <q-btn flat round dense icon="logout" @click="handleLogout">
          <q-tooltip>Sair</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Drawer -->
    <q-drawer v-model="drawer" show-if-above bordered :width="220" class="bg-white">
      <q-list>
        <q-item-label header class="text-grey-8">
          <div class="row items-center">
            <q-avatar size="32px" color="primary" text-color="white" class="q-mr-sm">
              {{ getInitials(customer?.name) }}
            </q-avatar>
            <div>
              <div class="text-weight-bold" style="font-size: 13px">{{ customer?.name }}</div>
              <div class="text-caption text-grey-5">Conta {{ customer?.accountNumber }}</div>
            </div>
          </div>
        </q-item-label>

        <q-separator />

        <q-item clickable v-ripple :active="tab === 'dashboard'" @click="tab = 'dashboard'">
          <q-item-section avatar><q-icon name="dashboard" /></q-item-section>
          <q-item-section>Painel</q-item-section>
        </q-item>

        <q-item clickable v-ripple :active="tab === 'loans'" @click="tab = 'loans'">
          <q-item-section avatar><q-icon name="payments" /></q-item-section>
          <q-item-section>Meus Créditos</q-item-section>
        </q-item>

        <q-item clickable v-ripple :active="tab === 'installments'" @click="tab = 'installments'">
          <q-item-section avatar><q-icon name="receipt_long" /></q-item-section>
          <q-item-section>Prestações</q-item-section>
        </q-item>

        <q-item clickable v-ripple :active="tab === 'payments'" @click="tab = 'payments'">
          <q-item-section avatar><q-icon name="account_balance_wallet" /></q-item-section>
          <q-item-section>Pagamentos</q-item-section>
        </q-item>

        <q-separator />

        <q-item clickable v-ripple @click="handleLogout">
          <q-item-section avatar><q-icon name="logout" color="negative" /></q-item-section>
          <q-item-section class="text-negative">Sair</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Main Content -->
    <q-page-container>
      <q-page class="q-pa-md">

        <!-- Loading -->
        <div v-if="loading" class="text-center q-pa-xl">
          <q-spinner-dots size="40px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-sm">A carregar dados...</div>
        </div>

        <!-- Dashboard Tab -->
        <template v-else-if="tab === 'dashboard'">
          <!-- KPIs -->
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-4">
              <q-card flat bordered class="kpi-card">
                <q-card-section class="row items-center">
                  <q-avatar size="45px" color="blue" text-color="white" class="q-mr-sm">
                    <q-icon name="payments" size="22px" />
                  </q-avatar>
                  <div>
                    <div class="text-h5 text-weight-bold">{{ summary.activeLoans }}</div>
                    <div class="text-caption text-grey-6">Créditos Activos</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-4">
              <q-card flat bordered class="kpi-card">
                <q-card-section class="row items-center">
                  <q-avatar size="45px" color="positive" text-color="white" class="q-mr-sm">
                    <q-icon name="check_circle" size="22px" />
                  </q-avatar>
                  <div>
                    <div class="text-h5 text-weight-bold text-positive">{{ formatMoney(summary.totalPaid) }}</div>
                    <div class="text-caption text-grey-6">Total Pago</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-4">
              <q-card flat bordered class="kpi-card">
                <q-card-section class="row items-center">
                  <q-avatar size="45px" color="warning" text-color="white" class="q-mr-sm">
                    <q-icon name="savings" size="22px" />
                  </q-avatar>
                  <div>
                    <div class="text-h5 text-weight-bold text-orange">{{ formatMoney(summary.totalDebt) }}</div>
                    <div class="text-caption text-grey-6">Saldo Devedor</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Próximas Prestações -->
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section class="bg-grey-1">
              <div class="row items-center">
                <q-icon name="event" size="20px" color="primary" class="q-mr-sm" />
                <div class="text-subtitle1 text-weight-bold">Próximas Prestações</div>
              </div>
            </q-card-section>
            <q-card-section>
              <div v-if="upcomingInstallments.length === 0" class="text-center text-grey-5 q-pa-md">
                Nenhuma prestação pendente
              </div>
              <q-list v-else separator>
                <q-item v-for="inst in upcomingInstallments" :key="inst.id">
                  <q-item-section avatar>
                    <q-avatar :color="inst.daysUntilDue <= 7 ? 'negative' : 'orange'" text-color="white" size="36px">
                      {{ inst.installmentOrder }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ formatMoney(inst.installment) }}</q-item-label>
                    <q-item-label caption>Vence: {{ formatDate(inst.dueDate) }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge :color="inst.daysUntilDue <= 7 ? 'negative' : 'orange'" rounded>
                      {{ inst.daysUntilDue }} dias
                    </q-badge>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn flat round dense icon="payment" color="positive" @click="openPaymentModal(inst)">
                      <q-tooltip>Pagar</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </template>

        <!-- Loans Tab -->
        <template v-else-if="tab === 'loans'">
          <div v-if="loans.length === 0" class="text-center q-pa-xl">
            <q-icon name="info" size="48px" color="grey-4" />
            <div class="text-h6 text-grey-6 q-mt-md">Nenhum crédito encontrado</div>
          </div>

          <div v-for="loan in loans" :key="loan.id" class="q-mb-md">
            <q-card flat bordered style="border-radius: 12px">
              <q-card-section>
                <div class="row items-center q-mb-sm">
                  <q-chip :color="getLoanStatusColor(loan.status)" text-color="white" size="sm" dense>
                    {{ getLoanStatusText(loan.status) }}
                  </q-chip>
                  <q-space />
                  <div class="text-caption text-grey-5">Conta {{ customer.accountNumber }}</div>
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Valor do Crédito</div>
                    <div class="text-h6 text-weight-bold text-primary">{{ formatMoney(loan.amount) }}</div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Taxa de Juro</div>
                    <div class="text-h6">{{ (loan.interestRate * 100).toFixed(1) }}%</div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Total Pago</div>
                    <div class="text-h6 text-positive">{{ formatMoney(loan.totalPaid) }}</div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Saldo Devedor</div>
                    <div class="text-h6 text-orange">{{ formatMoney(loan.totalDebt) }}</div>
                  </div>
                </div>

                <!-- Progresso -->
                <q-linear-progress
                  :value="loan.paidCount / loan.numberOfInstallments"
                  color="positive"
                  size="8px"
                  rounded
                  class="q-mt-md"
                />
                <div class="text-caption text-grey-5 q-mt-xs">
                  {{ loan.paidCount }}/{{ loan.numberOfInstallments }} prestações pagas
                </div>

                <!-- Juros de Mora -->
                <div v-if="loan.totalLateFee > 0" class="bg-red-1 q-pa-sm q-mt-sm" style="border-radius: 8px">
                  <div class="text-caption text-negative">
                    <q-icon name="warning" size="14px" class="q-mr-xs" />
                    Juros de mora: {{ formatMoney(loan.totalLateFee) }}
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>

        <!-- Installments Tab -->
        <template v-else-if="tab === 'installments'">
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section class="bg-grey-1">
              <div class="row items-center">
                <q-icon name="receipt_long" size="20px" color="primary" class="q-mr-sm" />
                <div class="text-subtitle1 text-weight-bold">Todas as Prestações</div>
                <q-space />
                <q-badge color="primary" rounded>{{ allInstallments.length }} registos</q-badge>
              </div>
            </q-card-section>
            <q-table
              :rows="allInstallments"
              :columns="installmentColumns"
              row-key="id"
              flat
              dense
              :rows-per-page-options="[10, 25, 50]"
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge :color="props.row.status === 1 ? 'positive' : props.row.status === -1 ? 'warning' : 'orange'" rounded>
                    {{ props.row.status === 1 ? 'Pago' : props.row.status === -1 ? 'Parcial' : 'Pendente' }}
                  </q-badge>
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    v-if="props.row.status !== 1"
                    flat
                    round
                    dense
                    icon="payment"
                    size="sm"
                    color="positive"
                    @click="openPaymentModal(props.row)"
                  />
                </q-td>
              </template>
            </q-table>
          </q-card>
        </template>

        <!-- Payments Tab -->
        <template v-else-if="tab === 'payments'">
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section class="bg-grey-1">
              <div class="row items-center">
                <q-icon name="account_balance_wallet" size="20px" color="primary" class="q-mr-sm" />
                <div class="text-subtitle1 text-weight-bold">Histórico de Pagamentos</div>
              </div>
            </q-card-section>
            <q-card-section>
              <div v-if="allPayments.length === 0" class="text-center text-grey-5 q-pa-md">
                Nenhum pagamento registado
              </div>
              <q-list v-else separator>
                <q-item v-for="payment in allPayments" :key="payment.id">
                  <q-item-section avatar>
                    <q-avatar :color="payment.status === 'completed' ? 'positive' : 'warning'" text-color="white" size="36px">
                      <q-icon :name="payment.status === 'completed' ? 'check' : 'schedule'" size="18px" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ formatMoney(payment.amount) }}</q-item-label>
                    <q-item-label caption>Ref: {{ payment.reference || 'N/A' }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <div class="text-caption text-grey-5">{{ formatDate(payment.createdAt) }}</div>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </template>
      </q-page>
    </q-page-container>

    <!-- Payment Modal -->
    <q-dialog v-model="showPaymentModal" persistent>
      <q-card style="border-radius: 16px; min-width: 380px; max-width: 95vw">
        <q-card-section class="row items-center bg-positive text-white">
          <q-icon name="payment" size="24px" class="q-mr-sm" />
          <div class="text-h6">Pagamento M-Pesa</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showPaymentModal = false" />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="text-body2 text-grey-6 q-mb-md">
            Efetue o pagamento da prestação via M-Pesa
          </div>

          <!-- Resumo -->
          <q-card flat bordered class="q-mb-md" style="border-radius: 8px">
            <q-card-section>
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <div class="text-caption text-grey-5">Prestação</div>
                  <div class="text-h6 text-weight-bold text-primary">
                    {{ formatMoney(selectedInstallment?.installment) }}
                  </div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Vencimento</div>
                  <div class="text-h6">{{ formatDate(selectedInstallment?.dueDate) }}</div>
                </div>
                <div class="col-12" v-if="selectedInstallment?.lateFee > 0">
                  <div class="text-caption text-negative">
                    + Juros de mora: {{ formatMoney(selectedInstallment?.lateFee) }}
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Telefone M-Pesa -->
          <q-input
            v-model="paymentPhone"
            label="Telefone M-Pesa"
            dense
            outlined
            prefix="+258"
            class="q-mb-md"
            :rules="[v => !!v || 'Obrigatório']"
          >
            <template v-slot:prepend>
              <q-icon name="phone" size="18px" />
            </template>
          </q-input>

          <!-- Valor -->
          <q-input
            v-model.number="paymentAmount"
            label="Valor (MZN)"
            dense
            outlined
            type="number"
            class="q-mb-md"
            :rules="[v => v > 0 || 'Valor deve ser maior que 0']"
          >
            <template v-slot:prepend>
              <q-icon name="attach_money" size="18px" />
            </template>
          </q-input>

          <!-- Método de pagamento -->
          <div class="text-subtitle2 text-grey-6 q-mb-sm">Método de Pagamento</div>
          <q-btn-toggle
            v-model="paymentMethod"
            :options="[
              { label: 'M-Pesa', value: 'mpesa', icon: 'phone_android' },
              { label: 'Transferência', value: 'transfer', icon: 'account_balance' },
              { label: 'Numerário', value: 'cash', icon: 'payments' }
            ]"
            push
            glossy
            no-caps
            class="q-mb-md full-width"
            toggle-color="positive"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showPaymentModal = false" />
          <q-btn
            unelevated
            label="Pagar"
            color="positive"
            icon="payment"
            no-caps
            rounded
            :loading="paying"
            :disable="!paymentPhone || !paymentAmount"
            @click="processPayment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()

const drawer = ref(false)
const tab = ref('dashboard')
const loading = ref(true)

const customer = ref(null)
const summary = ref({ totalLoans: 0, activeLoans: 0, totalDisbursed: 0, totalPaid: 0, totalDebt: 0 })
const loans = ref([])
const allPayments = ref([])

// Payment modal
const showPaymentModal = ref(false)
const selectedInstallment = ref(null)
const paymentPhone = ref('')
const paymentAmount = ref(0)
const paymentMethod = ref('mpesa')
const paying = ref(false)

const installmentColumns = [
  { name: 'order', label: 'Nº', field: 'installmentOrder', align: 'center', sortable: true },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right', sortable: true },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'center', sortable: true },
  { name: 'status', label: 'Estado', field: 'status', align: 'center', sortable: true },
  { name: 'paidAmount', label: 'Pago', field: 'paidAmount', align: 'right', sortable: true },
  { name: 'actions', label: '', field: 'actions', align: 'center' }
]

const upcomingInstallments = computed(() => {
  const result = []
  const now = new Date()

  loans.value.forEach(loan => {
    if (Number(loan.status) !== 1) return
    loan.installments.forEach(inst => {
      if (inst.status !== 1) {
        const dueDate = new Date(inst.dueDate)
        const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
        if (diffDays > 0 && diffDays <= 30) {
          result.push({
            ...inst,
            loanId: loan.id,
            daysUntilDue: diffDays,
            lateFee: 0
          })
        }
      }
    })
  })

  return result.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5)
})

const allInstallments = computed(() => {
  const result = []
  loans.value.forEach(loan => {
    loan.installments.forEach(inst => {
      const dueDate = new Date(inst.dueDate)
      const now = new Date()
      const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
      const daysOverdue = diffDays < 0 && inst.status !== 1 ? Math.abs(diffDays) : 0
      const lateFee = daysOverdue > 0 ? Math.round((inst.installment || 0) * 0.005 * daysOverdue * 100) / 100 : 0

      result.push({
        ...inst,
        loanId: loan.id,
        daysOverdue,
        lateFee,
        totalToPay: (inst.installment || 0) + lateFee
      })
    })
  })
  return result.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
})

function formatMoney(val) {
  return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(val || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function getLoanStatusColor(status) {
  const colors = { 0: 'orange', 1: 'positive', 2: 'negative', 3: 'grey', '-1': 'red' }
  return colors[status] || 'grey'
}

function getLoanStatusText(status) {
  const texts = { 0: 'Pendente', 1: 'Activo', 2: 'Rejeitado', 3: 'Liquidado', '-1': 'Cancelado' }
  return texts[status] || 'Desconhecido'
}

function openPaymentModal(installment) {
  selectedInstallment.value = installment
  paymentAmount.value = installment.installment || 0
  paymentPhone.value = customer.value?.phone?.replace('+258', '') || ''
  showPaymentModal.value = true
}

async function processPayment() {
  paying.value = true
  try {
    const { data } = await api.post('/api/portal/mpesa/initiate', {
      customerId: customer.value.id,
      loanId: selectedInstallment.value.loanId,
      installmentId: selectedInstallment.value.id,
      amount: paymentAmount.value,
      phone: `258${paymentPhone.value}`,
      method: paymentMethod.value,
    })

    if (data.success) {
      $q.notify({
        type: 'positive',
        message: 'Pagamento iniciado com sucesso. Aguarde confirmação.',
        position: 'top'
      })
      showPaymentModal.value = false
      await loadData()
    }
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Erro ao processar pagamento',
      position: 'top'
    })
  } finally {
    paying.value = false
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/')
}

async function loadData() {
  loading.value = true
  try {
    const user = authStore.user
    if (!user) {
      router.push('/')
      return
    }

    const companyId = user.companyId
    const customerId = user.id

    const { data } = await api.get(`/api/portal/${companyId}/${customerId}/dashboard`)

    if (data.success) {
      customer.value = data.customer
      summary.value = data.summary
      loans.value = data.loans
    }
  } catch (e) {
    console.error('Erro ao carregar dados:', e)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar dados do portal',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.portal-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.kpi-card {
  border-radius: 12px;
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-2px);
  }
}

body.body--dark {
  .portal-container {
    background: $dark-page;
  }
}
</style>
