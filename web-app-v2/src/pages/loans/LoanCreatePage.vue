<template>
  <div class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Novo Crédito</div>
        <div class="text-caption text-grey-5">Registar um novo crédito para um mutuário</div>
      </div>
      <div class="col-auto">
        <q-btn flat icon="arrow_back" label="Voltar" no-caps @click="router.back()" />
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Form -->
      <div class="col-12 col-md-7">
        <q-card flat bordered style="border-radius: 12px">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">
              <q-icon name="edit" size="18px" class="q-mr-xs" />
              Dados do Crédito
            </div>

            <q-form @submit="submitLoan" class="q-gutter-md">
              <!-- Customer Selection -->
              <q-select
                v-model="form.accountNumber"
                dense
                outlined
                :options="customerOptions"
                label="Mutuário *"
                emit-value
                map-options
                use-input
                input-debounce="300"
                @filter="filterCustomers"
                @update:model-value="onCustomerSelect"
                :rules="[val => !!val || 'Obrigatório']"
                input-style="font-size: 13px"
              >
                <template v-slot:prepend><q-icon name="person" size="16px" color="grey-5" /></template>
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey-5">Nenhum mutuário encontrado</q-item-section>
                  </q-item>
                </template>
              </q-select>

              <!-- Customer Info (when selected) -->
              <div v-if="selectedCustomer" class="customer-info-box">
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Nome</div>
                    <div class="text-weight-medium" style="font-size: 13px">{{ selectedCustomer.customerName }}</div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Rendimento Mensal</div>
                    <div class="text-weight-bold text-primary" style="font-size: 13px">{{ formatMoney(selectedCustomer.customerMonthlySalary || 0) }}</div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Capacidade (1/3 salário)</div>
                    <div class="text-weight-bold text-positive" style="font-size: 13px">{{ formatMoney(maxCapacity) }}</div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-5">Conta</div>
                    <div class="text-weight-medium" style="font-size: 13px">{{ selectedCustomer.accountNumber }}</div>
                  </div>
                </div>
              </div>

              <!-- Amount -->
              <q-input
                v-model.number="form.amount"
                dense
                outlined
                label="Montante (MT) *"
                type="number"
                :rules="[val => !!val && val > 0 || 'Obrigatório']"
                @update:model-value="calculateSimulation"
                input-style="font-size: 13px"
              >
                <template v-slot:prepend><q-icon name="attach_money" size="16px" color="grey-5" /></template>
              </q-input>

              <!-- Installments -->
              <q-input
                v-model.number="form.numberOfInstallments"
                dense
                outlined
                label="Nº de Prestações *"
                type="number"
                :rules="[val => !!val && val > 0 || 'Obrigatório']"
                @update:model-value="calculateSimulation"
                input-style="font-size: 13px"
              >
                <template v-slot:prepend><q-icon name="event" size="16px" color="grey-5" /></template>
              </q-input>

              <!-- Interest Rate -->
              <q-select
                v-model="form.interestRateId"
                dense
                outlined
                :options="rateOptions"
                label="Taxa de Juro *"
                emit-value
                map-options
                :rules="[val => !!val || 'Obrigatório']"
                @update:model-value="onRateSelect"
                input-style="font-size: 13px"
              >
                <template v-slot:prepend><q-icon name="percent" size="16px" color="grey-5" /></template>
              </q-select>

              <!-- Credit Manager -->
              <q-select
                v-model="form.creditManager"
                dense
                outlined
                :options="managerOptions"
                label="Gestor de Crédito *"
                emit-value
                map-options
                :rules="[val => !!val || 'Obrigatório']"
                input-style="font-size: 13px"
              >
                <template v-slot:prepend><q-icon name="support_agent" size="16px" color="grey-5" /></template>
              </q-select>

              <!-- Description -->
              <q-input
                v-model="form.loanDescription"
                dense
                outlined
                label="Descrição / Observações"
                type="textarea"
                rows="2"
                input-style="font-size: 13px"
              >
                <template v-slot:prepend><q-icon name="description" size="16px" color="grey-5" /></template>
              </q-input>

              <!-- Capacity Exceeded Warning -->
              <div v-if="capacityExceeded" class="capacity-warning">
                <q-icon name="warning" color="orange" size="18px" class="q-mr-sm" />
                <div class="col">
                  <div class="text-body2 text-weight-medium">A prestação excede 1/3 do rendimento mensal</div>
                  <div class="text-caption text-grey-6">
                    Prestação estimada: {{ formatMoney(estimatedInstallment) }} |
                    Máximo: {{ formatMoney(maxCapacity) }}
                  </div>
                </div>
              </div>

              <!-- Capacity Excess Observation (required when exceeded) -->
              <q-input
                v-if="capacityExceeded"
                v-model="form.capacityExcessObservation"
                dense
                outlined
                label="Parecer / Observação (mínimo 10 caracteres) *"
                type="textarea"
                rows="2"
                :rules="[val => (!capacityExceeded || (val && val.length >= 10)) || 'Obrigatório quando prestação excede 1/3 do salário']"
                input-style="font-size: 13px"
              >
                <template v-slot:prepend><q-icon name="note_alt" size="16px" color="orange" /></template>
              </q-input>

              <!-- Submit -->
              <div class="row justify-end q-gutter-sm q-mt-md">
                <q-btn flat label="Cancelar" color="grey" @click="router.back()" no-caps />
                <q-btn
                  type="submit"
                  unelevated
                  label="Registar Crédito"
                  color="primary"
                  icon="save"
                  :loading="saving"
                  :disable="!canSubmit"
                  no-caps
                  rounded
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Simulator -->
      <div class="col-12 col-md-5">
        <q-card flat bordered style="border-radius: 12px">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">
              <q-icon name="calculate" size="18px" class="q-mr-xs" />
              Simulador
            </div>

            <div v-if="simulationReady" class="q-gutter-md">
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <div class="text-caption text-grey-5">Capital</div>
                  <div class="text-weight-bold">{{ formatMoney(form.amount) }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Taxa</div>
                  <div class="text-weight-bold">{{ (selectedRate * 100).toFixed(1) }}%</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Prestações</div>
                  <div class="text-weight-bold">{{ form.numberOfInstallments }}x</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Sistema</div>
                  <div class="text-weight-bold">Francês</div>
                </div>
              </div>

              <q-separator />

              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <div class="text-caption text-grey-5">Juros totais</div>
                  <div class="text-weight-bold text-orange">{{ formatMoney(totalInterest) }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Total a pagar</div>
                  <div class="text-weight-bold text-positive">{{ formatMoney(totalToPay) }}</div>
                </div>
                <div class="col-12">
                  <div class="text-caption text-grey-5">Prestação mensal</div>
                  <div class="text-h6 text-weight-bold text-primary">{{ formatMoney(monthlyPayment) }}</div>
                </div>
              </div>

              <!-- Capacity Check -->
              <q-separator />
              <div class="row items-center">
                <q-icon
                  :name="capacityExceeded ? 'warning' : 'check_circle'"
                  :color="capacityExceeded ? 'orange' : 'positive'"
                  size="18px"
                  class="q-mr-sm"
                />
                <div>
                  <div class="text-caption" :class="capacityExceeded ? 'text-orange' : 'text-positive'">
                    {{ capacityExceeded ? 'Prestação acima da capacidade' : 'Dentro da capacidade' }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center q-pa-lg text-grey-5">
              <q-icon name="calculate" size="40px" class="q-mb-sm" />
              <div class="text-caption">Preencha os dados para ver a simulação</div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Info Card -->
        <q-card flat bordered style="border-radius: 12px" class="q-mt-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-sm">
              <q-icon name="info" size="14px" class="q-mr-xs" />
              Regras de negócio
            </div>
            <div class="text-caption text-grey-6 q-gutter-xs">
              <div>• Sistema de amortização francês (Price)</div>
              <div>• Prestação não pode exceder 1/3 do salário</div>
              <div>• Se exceder, é necessário parecer técnico</div>
              <div>• Mínimo de 3 documentos do mutuário</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useLoansStore } from '@/stores/loans'
import { useCustomerStore } from '@/stores/customers'
import { useSettingsStore } from '@/stores/settings'
import { formatMoney } from '@/utils/formatters'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const loansStore = useLoansStore()
const customerStore = useCustomerStore()
const settingsStore = useSettingsStore()

const saving = computed(() => loansStore.saving)

// Form
const form = ref({
  accountNumber: null,
  amount: 0,
  numberOfInstallments: 0,
  interestRateId: null,
  creditManager: null,
  loanDescription: '',
  capacityExcessObservation: ''
})

// State
const selectedCustomer = ref(null)
const selectedRate = ref(0)
const maxCapacity = ref(0)
const estimatedInstallment = ref(0)
const capacityExceeded = computed(() => {
  return estimatedInstallment.value > maxCapacity.value && maxCapacity.value > 0
})

// Options
const customerOptions = ref([])
const allCustomers = ref([])
const rateOptions = ref([])
const managerOptions = ref([])

// Simulation
const simulationReady = computed(() => {
  return form.value.amount > 0 && form.value.numberOfInstallments > 0 && selectedRate.value > 0
})

// French amortization formula: PMT = PV * [i(1+i)^n] / [(1+i)^n - 1]
function calculateInstallment(principal, rate, periods) {
  if (rate === 0) return principal / periods
  const numerator = rate * Math.pow(1 + rate, periods)
  const denominator = Math.pow(1 + rate, periods) - 1
  return principal * (numerator / denominator)
}

const monthlyPayment = computed(() => {
  if (!simulationReady.value) return 0
  return calculateInstallment(form.value.amount, selectedRate.value, form.value.numberOfInstallments)
})

const totalToPay = computed(() => {
  return monthlyPayment.value * form.value.numberOfInstallments
})

const totalInterest = computed(() => {
  return totalToPay.value - form.value.amount
})

// Calculate capacity check
function calculateSimulation() {
  if (selectedCustomer.value && form.value.amount > 0 && form.value.numberOfInstallments > 0 && selectedRate.value > 0) {
    estimatedInstallment.value = calculateInstallment(form.value.amount, selectedRate.value, form.value.numberOfInstallments)
    maxCapacity.value = (selectedCustomer.value.customerMonthlySalary || 0) / 3
  } else {
    estimatedInstallment.value = 0
    maxCapacity.value = 0
  }
}

// Watch for changes
watch(() => [form.value.amount, form.value.numberOfInstallments, selectedRate.value], () => {
  calculateSimulation()
})

// Filter customers for select
function filterCustomers(val, update) {
  update(() => {
    if (val === '') {
      customerOptions.value = allCustomers.value.map(c => ({
        label: `${c.customerName} (${c.accountNumber})`,
        value: c.accountNumber
      }))
    } else {
      const needle = val.toLowerCase()
      customerOptions.value = allCustomers.value
        .filter(c => 
          c.customerName?.toLowerCase().includes(needle) ||
          String(c.accountNumber).includes(needle)
        )
        .map(c => ({
          label: `${c.customerName} (${c.accountNumber})`,
          value: c.accountNumber
        }))
    }
  })
}

// Customer selected
function onCustomerSelect(accountNumber) {
  selectedCustomer.value = allCustomers.value.find(c => c.accountNumber === accountNumber) || null
  calculateSimulation()
}

// Rate selected
function onRateSelect(rateId) {
  const rate = settingsStore.rates.find(r => r.id === rateId)
  selectedRate.value = rate ? rate.tax : 0
  calculateSimulation()
}

// Can submit
const canSubmit = computed(() => {
  if (!form.value.accountNumber || !form.value.amount || !form.value.numberOfInstallments || !form.value.interestRateId || !form.value.creditManager) {
    return false
  }
  if (capacityExceeded.value && (!form.value.capacityExcessObservation || form.value.capacityExcessObservation.length < 10)) {
    return false
  }
  return true
})

// Submit loan
async function submitLoan() {
  try {
    const rate = settingsStore.rates.find(r => r.id === form.value.interestRateId)
    
    const payload = {
      accountNumber: form.value.accountNumber,
      companyId: authStore.companyId,
      amount: form.value.amount,
      numberOfInstallments: form.value.numberOfInstallments,
      interestRate: rate ? rate.tax : 0,
      creditManager: form.value.creditManager,
      loanDescription: form.value.loanDescription || 'Crédito registado via sistema',
      capacityExcessObservation: form.value.capacityExcessObservation || '',
      dateCreated: new Date().toISOString().split('T')[0],
      status: 0 // Pendente
    }

    await loansStore.createLoan(payload)
    $q.notify({ type: 'positive', message: 'Crédito registado com sucesso', position: 'top' })
    router.push('/loans')
  } catch (error) {
    $q.notify({ 
      type: 'negative', 
      message: error.response?.data?.message || 'Erro ao registar crédito', 
      position: 'top' 
    })
  }
}

onMounted(async () => {
  // Load customers
  try {
    await customerStore.fetchCustomers(authStore.companyId, { limit: 500 })
    allCustomers.value = customerStore.customers
    customerOptions.value = allCustomers.value.map(c => ({
      label: `${c.customerName} (${c.accountNumber})`,
      value: c.accountNumber
    }))
  } catch { /* silent */ }

  // Load rates
  try {
    await settingsStore.fetchRates(authStore.companyId)
    rateOptions.value = settingsStore.rates.map(r => ({
      label: `${r.name || 'Taxa'} - ${(r.tax * 100).toFixed(1)}%`,
      value: r.id
    }))
  } catch { /* silent */ }

  // Load users (for credit manager selection)
  try {
    await settingsStore.fetchUsers(authStore.companyId)
    managerOptions.value = settingsStore.users
      .filter(u => u.userRole === 1 || u.userRole === 3)
      .map(u => ({
        label: u.name,
        value: u.id
      }))
  } catch { /* silent */ }
})
</script>

<style lang="scss" scoped>
.customer-info-box {
  background: rgba($primary, 0.05);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba($primary, 0.2);
}

.capacity-warning {
  display: flex;
  align-items: flex-start;
  background: rgba($orange, 0.1);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba($orange, 0.3);
}
</style>
