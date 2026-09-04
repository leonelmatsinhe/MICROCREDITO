<template>
  <q-dialog v-model="show" persistent>
    <q-card style="width: 520px; max-width: 95vw; border-radius: 16px">
      <q-card-section class="bg-primary text-white row items-center" style="border-radius: 16px 16px 0 0">
        <q-icon name="check_circle" size="24px" class="q-mr-sm" />
        <div class="text-h6">Aprovar Crédito</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="text-body2 text-grey-6 q-mb-md">
          Defina a taxa de juro aplicável a este crédito. O plano de amortização será gerado automaticamente com a taxa escolhida.
        </div>

        <!-- Resumo do pedido -->
        <q-card flat bordered class="q-mb-md" style="border-radius: 8px">
          <q-card-section class="q-py-sm">
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="text-caption text-grey-5">Montante solicitado</div>
                <div class="text-weight-bold text-primary" style="font-size: 15px">{{ formatMoney(loan?.amount) }}</div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-5">Prazo</div>
                <div class="text-weight-bold" style="font-size: 15px">
                  {{ loan?.numberOfInstallments }} {{ loan?.numberOfInstallments === 1 ? 'mês' : 'meses' }}
                </div>
              </div>
              <div class="col-12" v-if="loan?.loanDescription">
                <div class="text-caption text-grey-5">Finalidade</div>
                <div class="text-body2">{{ loan.loanDescription }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Data de desembolso (base do plano de amortização) -->
        <q-input
          v-model="disbursementDate"
          label="Data de desembolso *"
          type="date"
          dense
          outlined
          class="q-mb-md"
          :rules="[v => !!v || 'Indique a data de desembolso']"
        >
          <template v-slot:prepend>
            <q-icon name="event" size="18px" />
          </template>
        </q-input>

        <!-- Taxa de juro -->
        <q-select
          v-model="rateId"
          :options="rateOptions"
          label="Taxa de juro aplicável *"
          dense
          outlined
          emit-value
          map-options
          :loading="loadingRates"
          class="q-mb-md"
          :rules="[v => !!v || 'Seleccione a taxa de juro']"
        >
          <template v-slot:prepend>
            <q-icon name="percent" size="18px" />
          </template>
          <template v-slot:no-option>
            <q-item>
              <q-item-section class="text-grey-5">Sem taxas de juro configuradas</q-item-section>
            </q-item>
          </template>
        </q-select>

        <q-banner v-if="!loadingRates && rateOptions.length === 0" class="bg-orange-1 text-orange-9 q-mb-md" rounded>
          <template v-slot:avatar>
            <q-icon name="warning" color="orange" />
          </template>
          Não existem taxas de juro configuradas para a empresa. Registe uma taxa em Configurações antes de aprovar o crédito.
        </q-banner>

        <!-- Simulação com a taxa escolhida -->
        <q-card flat bordered class="q-mb-md" style="border-radius: 8px">
          <q-card-section class="q-py-sm">
            <div class="row q-col-gutter-sm">
              <div class="col-4">
                <div class="text-caption text-grey-5" style="font-size: 10px">Prestação mensal</div>
                <div class="text-weight-bold text-primary" style="font-size: 14px">
                  {{ previewInstallment > 0 ? formatMoney(previewInstallment) : '—' }}
                </div>
              </div>
              <div class="col-4">
                <div class="text-caption text-grey-5" style="font-size: 10px">Juros totais</div>
                <div class="text-weight-bold text-orange" style="font-size: 14px">
                  {{ previewInterest > 0 ? formatMoney(previewInterest) : '—' }}
                </div>
              </div>
              <div class="col-4">
                <div class="text-caption text-grey-5" style="font-size: 10px">Total a pagar</div>
                <div class="text-weight-bold text-positive" style="font-size: 14px">
                  {{ previewTotal > 0 ? formatMoney(previewTotal) : '—' }}
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Taxa de preparos administrativos (dinâmica da taxa escolhida) -->
        <q-card v-if="rateId" flat bordered class="q-mb-md" style="border-radius: 8px">
          <q-card-section class="q-py-sm">
            <div class="row items-center">
              <div class="col">
                <div class="text-caption text-grey-5" style="font-size: 10px">Taxa de preparos administrativos</div>
                <div class="text-weight-bold" :class="adminFeeExempt ? 'text-grey-6' : 'text-negative'" style="font-size: 14px">
                  {{ adminFeeExempt ? 'Isento' : `${adminFeePctLabel} (${formatMoney(adminFeeValue)})` }}
                </div>
                <div v-if="!adminFeeExempt && adminFeeValue > 0" class="text-caption text-grey-6">
                  Cobrada uma única vez na data do desembolso.
                </div>
              </div>
              <div class="col-auto">
                <q-checkbox v-model="adminFeeExempt" label="Isento de taxa administrativa" color="negative" dense />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-input
          v-model="observation"
          label="Parecer / Observações"
          dense
          outlined
          type="textarea"
          rows="2"
          class="q-mb-sm"
          :maxlength="500"
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancelar" color="grey" no-caps @click="close" />
        <q-btn
          unelevated
          label="Aprovar Crédito"
          color="positive"
          icon="check_circle"
          no-caps
          rounded
          :loading="submitting"
          :disable="!rateId"
          @click="confirmApproval"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useLoansStore } from '@/stores/loans'
import { api } from '@/boot/axios'
import { formatMoney } from '@/utils/formatters'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  loan: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'approved'])

const $q = useQuasar()
const authStore = useAuthStore()
const loansStore = useLoansStore()

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const rateList = ref([])
const loadingRates = ref(false)
const rateId = ref(null)
const adminFeeExempt = ref(false)
const observation = ref('')
const submitting = ref(false)
// Data real de desembolso — base do plano; por defeito é hoje, mas pode ser corrigida
const disbursementDate = ref(new Date().toISOString().split('T')[0])

const rateOptions = computed(() =>
  rateList.value.map(r => ({
    label: `${r.name || 'Plano'} — ${formatTaxPct(Number(r.tax))}% a.m.`,
    value: r.id
  }))
)

function formatTaxPct(tax) {
  return Number((tax * 100).toFixed(3)).toLocaleString('pt-MZ', { maximumFractionDigits: 3 })
}

function rateTax(id) {
  const rate = rateList.value.find(r => Number(r.id) === Number(id))
  return rate ? Number(rate.tax) || 0 : 0
}

function rateAdminFee(id) {
  const rate = rateList.value.find(r => Number(r.id) === Number(id))
  return rate ? Number(rate.administrativeFee) || 0 : 0
}

const adminFeePct = computed(() => (adminFeeExempt.value ? 0 : rateAdminFee(rateId.value)))
const adminFeePctLabel = computed(() => {
  const pct = adminFeePct.value * 100
  return pct > 0 ? `${Number(pct.toFixed(3)).toLocaleString('pt-MZ', { maximumFractionDigits: 3 })}%` : '0%'
})
const adminFeeValue = computed(() => Math.round((Number(props.loan?.amount) || 0) * adminFeePct.value * 100) / 100)

const rateTaxDisplay = computed(() => {
  const tax = rateTax(rateId.value)
  return tax > 0 ? formatTaxPct(tax) : null
})

const previewInstallment = computed(() => {
  const principal = Number(props.loan?.amount) || 0
  const periods = Number(props.loan?.numberOfInstallments) || 0
  const tax = rateTax(rateId.value)
  if (principal <= 0 || periods <= 0) return 0
  if (tax <= 0) return principal / periods
  const numerator = tax * Math.pow(1 + tax, periods)
  const denominator = Math.pow(1 + tax, periods) - 1
  return principal * (numerator / denominator)
})

const previewTotal = computed(() => previewInstallment.value * (Number(props.loan?.numberOfInstallments) || 0))
const previewInterest = computed(() => previewTotal.value - (Number(props.loan?.amount) || 0))

async function fetchRates() {
  const companyId = props.loan?.companyId || authStore.companyId
  if (!companyId) return
  loadingRates.value = true
  try {
    const { data } = await api.get(`/api/rate/${companyId}`)
    rateList.value = data.success && Array.isArray(data.result) ? data.result : []
  } catch (e) {
    console.error('Erro ao carregar taxas de juro:', e)
    rateList.value = []
  } finally {
    loadingRates.value = false
  }
}

function presetRateFromLoan() {
  const existing = Number(props.loan?.interestRate) || 0
  if (existing > 0) {
    const match = rateList.value.find(r => Math.abs(Number(r.tax) - existing) < 1e-6)
    rateId.value = match ? match.id : null
  }
}

watch(show, async (val) => {
  if (val) {
    rateId.value = null
    adminFeeExempt.value = false
    observation.value = ''
    disbursementDate.value = new Date().toISOString().split('T')[0]
    if (rateList.value.length === 0) {
      await fetchRates()
    }
    // Para créditos criados pela equipa com taxa já definida, pré-seleccionar o plano correspondente
    presetRateFromLoan()
    // Se o crédito já tiver sido marcado como isento, manter a isenção
    if (Number(props.loan?.administrativeFee) === 0 && Number(props.loan?.interestRate) > 0) {
      adminFeeExempt.value = true
    }
  }
})

function close() {
  if (submitting.value) return
  show.value = false
}

async function confirmApproval() {
  const loan = props.loan
  if (!loan || !rateId.value) return
  const tax = rateTax(rateId.value)
  if (tax <= 0) {
    $q.notify({ type: 'warning', message: 'Seleccione uma taxa de juro válida', position: 'top' })
    return
  }
  const dueDate = disbursementDate.value
  if (!dueDate) {
    $q.notify({ type: 'warning', message: 'Indique a data de desembolso', position: 'top' })
    return
  }

  submitting.value = true
  try {
    const companyId = Number(loan.companyId) || authStore.companyId

    // Persistir a taxa de juro e a taxa de preparos administrativos no registo do crédito
    await loansStore.updateLoan(loan.id, {
      interestRate: tax,
      administrativeFee: adminFeeExempt.value ? 0 : rateAdminFee(rateId.value)
    })

    // Gerar o plano de amortização com a taxa escolhida — o backend activa o crédito (status 1)
    try {
      await loansStore.createAmortization({
        companyId,
        loanId: loan.id,
        accountNumber: loan.accountNumber,
        interestRate: tax,
        numberOfInstallments: Number(loan.numberOfInstallments),
        amount: Number(loan.amount),
        dueDate,
        status: 0
      })
    } catch (err2) {
      // Já existe plano de amortização (409): apenas activar o crédito (e a data de desembolso)
      if (err2?.response?.status !== 409) throw err2
      await loansStore.updateLoan(loan.id, { status: 1, disbursementDate: dueDate })
    }

    if (observation.value && observation.value.trim()) {
      try {
        await loansStore.updateLoan(loan.id, { capacityExcessObservation: observation.value.trim() })
      } catch { /* opcional */ }
    }

    emit('approved', loan)
    show.value = false
    $q.notify({
      type: 'positive',
      message: rateTaxDisplay.value
        ? `Crédito aprovado com taxa de ${rateTaxDisplay.value}% e plano gerado com sucesso`
        : 'Crédito aprovado com sucesso',
      position: 'top'
    })
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Erro ao aprovar crédito',
      position: 'top'
    })
  } finally {
    submitting.value = false
  }
}
</script>
