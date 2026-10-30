<template>
  <q-dialog v-model="show" persistent>
    <q-card style="border-radius: 16px; width: 100%; max-width: 480px; min-width: 0">
      <q-card-section class="row items-center bg-primary text-white q-py-sm">
        <q-icon name="calculate" size="24px" class="q-mr-sm" />
        <div class="text-subtitle1 text-weight-bold">Simulador de Crédito</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="show = false" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- Montante Pretendido -->
        <div class="q-mb-md">
          <div class="row items-center justify-between q-mb-xs">
            <span class="text-subtitle2 text-weight-bold">Montante Pretendido</span>
            <span class="text-h6 text-weight-bold text-primary">{{ formatMoney(amount) }}</span>
          </div>
          <q-slider
            v-model="amount"
            :min="1000"
            :max="100000"
            :step="500"
            color="primary"
            class="q-my-xs"
          />
          <div class="row items-center justify-between text-caption text-grey-6">
            <span>1.000 MZN</span>
            <span>50.000 MZN</span>
            <span>100.000 MZN</span>
          </div>
        </div>

        <!-- Nº de Prestações e Periodicidade -->
        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-6">
            <div class="text-caption text-weight-bold q-mb-xs">Nº de Prestações</div>
            <q-select
              v-model="installments"
              :options="installmentOptions"
              dense
              outlined
              emit-value
              map-options
            />
          </div>
          <div class="col-6">
            <div class="text-caption text-weight-bold q-mb-xs">Periodicidade</div>
            <q-select
              v-model="periodicity"
              :options="periodicityOptions"
              dense
              outlined
              emit-value
              map-options
            />
          </div>
        </div>

        <!-- Taxa de Juro Mensal Referencial -->
        <div class="row items-center justify-between text-caption text-grey-7 q-mb-md bg-grey-1 q-pa-sm rounded-borders">
          <span>Taxa de Juro Mensal (Ref.):</span>
          <span class="text-weight-bold">{{ (interestRate * 100).toFixed(1) }}% / mês</span>
        </div>

        <!-- Resultados da Simulação -->
        <q-card flat bordered class="q-pa-md q-mb-sm" style="border-radius: 12px; background: #fdfdfd">
          <div class="row items-center justify-between q-mb-sm">
            <span class="text-caption text-grey-7">Valor da Prestação Estimada:</span>
            <span class="text-h6 text-weight-bold text-positive">{{ formatMoney(simulatedInstallment) }}</span>
          </div>
          <div class="row items-center justify-between q-mb-xs">
            <span class="text-caption text-grey-6">Total de Juros Estimados:</span>
            <span class="text-weight-bold text-grey-8">{{ formatMoney(totalInterest) }}</span>
          </div>
          <div class="row items-center justify-between q-mb-xs">
            <span class="text-caption text-grey-6">Montante Total a Reembolsar:</span>
            <span class="text-weight-bold text-primary">{{ formatMoney(totalPayable) }}</span>
          </div>
          <q-separator class="q-my-sm" />
          <div class="text-caption text-grey-6" style="font-size: 11px">
            * Cálculo indicativo baseado no sistema Price (prestações constantes). Os valores finais são aprovados pela instituição.
          </div>
        </q-card>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md bg-grey-1">
        <q-btn flat label="Fechar" color="grey-7" no-caps @click="show = false" />
        <q-btn
          unelevated
          label="Solicitar com este Plano"
          icon="check_circle"
          color="primary"
          no-caps
          class="btn-native"
          @click="applySimulation"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'apply'])

const show = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const amount = ref(15000)
const installments = ref(4)
const periodicity = ref('mensal')
const interestRate = ref(0.15) // 15% taxa mensal de referência padrão

const installmentOptions = [
  { label: '1 Prestação', value: 1 },
  { label: '2 Prestações', value: 2 },
  { label: '3 Prestações', value: 3 },
  { label: '4 Prestações', value: 4 },
  { label: '5 Prestações', value: 5 },
  { label: '6 Prestações', value: 6 },
  { label: '12 Prestações', value: 12 },
]

const periodicityOptions = [
  { label: 'Mensal', value: 'mensal' },
  { label: 'Quinzenal', value: 'quinzenal' },
  { label: 'Semanal', value: 'semanal' },
]

// Fórmula de amortização Price
const simulatedInstallment = computed(() => {
  const p = Number(amount.value) || 0
  const n = Number(installments.value) || 1
  let i = Number(interestRate.value) || 0

  if (periodicity.value === 'quinzenal') i = i / 2
  if (periodicity.value === 'semanal') i = i / 4

  if (i === 0) return Math.round((p / n) * 100) / 100

  const factor = Math.pow(1 + i, n)
  const pmt = (p * i * factor) / (factor - 1)
  return Math.round(pmt * 100) / 100
})

const totalPayable = computed(() => {
  return Math.round(simulatedInstallment.value * installments.value * 100) / 100
})

const totalInterest = computed(() => {
  return Math.max(0, Math.round((totalPayable.value - amount.value) * 100) / 100)
})

function formatMoney(val) {
  return Number(val || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MZN'
}

function applySimulation() {
  emit('apply', {
    amount: amount.value,
    installments: installments.value,
    periodicity: periodicity.value,
    installmentValue: simulatedInstallment.value
  })
  show.value = false
}
</script>

<style lang="scss" scoped>
.btn-native {
  min-height: 42px;
  border-radius: 10px;
  font-weight: 600;
}
</style>
