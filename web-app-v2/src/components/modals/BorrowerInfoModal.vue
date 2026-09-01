<template>
  <q-dialog v-model="show" persistent maximized>
    <q-card style="border-radius: 16px; max-width: 900px; margin: auto">
      <q-card-section class="row items-center bg-primary text-white">
        <q-icon name="info" size="24px" class="q-mr-sm" />
        <div class="text-h6">Tabela de Prestação de Informação do Mutuário</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="text-caption text-grey-6 q-mb-md">
          Preencha as informações abaixo para incluir no contrato de concessão de crédito.
        </div>

        <q-form @submit="save" class="q-gutter-md">
          <!-- Dados do Mutuário -->
          <q-card flat bordered class="section-card">
            <q-card-section class="section-header">
              <div class="text-subtitle2 text-weight-bold">
                <q-icon name="person" size="16px" class="q-mr-xs" />
                Dados do Mutuário
              </div>
            </q-card-section>
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.mutuario" dense outlined label="Mutuário" disable input-style="font-size: 13px" />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.valorCredito" dense outlined label="Valor do crédito" disable input-style="font-size: 13px" />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.prazo" dense outlined label="Prazo (meses)" disable input-style="font-size: 13px" />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.taxa" dense outlined label="Taxa" disable input-style="font-size: 13px" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Dados do Crédito -->
          <q-card flat bordered class="section-card">
            <q-card-section class="section-header">
              <div class="text-subtitle2 text-weight-bold">
                <q-icon name="credit_card" size="16px" class="q-mr-xs" />
                Detalhes do Crédito
              </div>
            </q-card-section>
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.finalidade" dense outlined label="Finalidade" placeholder="Actividade de:" input-style="font-size: 13px" />
                </div>
                <div class="col-12">
                  <q-input v-model="form.garantia" dense outlined label="Garantia (descrição e valor avaliado)" type="textarea" rows="2" input-style="font-size: 13px" />
                </div>
                <div class="col-12 col-sm-6">
                  <q-select v-model="form.seguroVida" dense outlined :options="simNaoOptions" label="Seguro de vida/crédito" emit-value map-options input-style="font-size: 13px" />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.capitalSeguro" dense outlined label="Capital seguro" disable input-style="font-size: 13px" />
                </div>
                <div class="col-12 col-sm-6">
                  <q-select v-model="form.seguroBem" dense outlined :options="simNaoOptions" label="Seguro do bem" emit-value map-options input-style="font-size: 13px" />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input v-model="form.beneficiario" dense outlined label="Beneficiário" disable input-style="font-size: 13px" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Dados de Pagamento -->
          <q-card flat bordered class="section-card">
            <q-card-section class="section-header">
              <div class="text-subtitle2 text-weight-bold">
                <q-icon name="payments" size="16px" class="q-mr-xs" />
                Dados de Pagamento
              </div>
            </q-card-section>
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-4">
                  <q-input v-model="form.prestacaoMensal" dense outlined label="Prestação mensal" disable input-style="font-size: 13px" />
                </div>
                <div class="col-12 col-sm-4">
                  <q-input v-model="form.dataDesembolso" dense outlined label="Data do desembolso" type="date" input-style="font-size: 13px" @update:model-value="onDesembolsoChange" />
                </div>
                <div class="col-12 col-sm-4">
                  <q-input v-model="form.dataVencimento" dense outlined label="Data vencimento (última)" disable input-style="font-size: 13px" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Botões -->
          <div class="row justify-end q-gutter-sm q-mt-md">
            <q-btn flat label="Cancelar" color="grey" no-caps @click="close" />
            <q-btn unelevated label="Guardar" color="primary" icon="save" no-caps rounded type="submit" :loading="saving" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useCompanyStore } from '@/stores/company'
import { useLoansStore } from '@/stores/loans'
import { formatMoney, formatDateShort } from '@/utils/formatters'
import { api } from '@/boot/axios'

const $q = useQuasar()
const companyStore = useCompanyStore()
const loansStore = useLoansStore()

const props = defineProps({
  modelValue: Boolean,
  loan: Object,
  customer: Object
})

const emit = defineEmits(['update:modelValue', 'saved'])

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const companyName = computed(() => companyStore.company?.companyName || 'MBR Microcrédito')

const saving = ref(false)
const guarantees = ref([])
const installments = ref([])

const simNaoOptions = [
  { label: 'Sim', value: 'Sim' },
  { label: 'Não', value: 'Não' }
]

const form = ref({
  mutuario: '',
  valorCredito: '',
  prazo: '',
  taxa: '',
  finalidade: '',
  garantia: '',
  seguroVida: 'Não',
  capitalSeguro: '',
  seguroBem: 'Não',
  beneficiario: '',
  prestacaoMensal: '',
  dataDesembolso: '',
  dataVencimento: ''
})

// Buscar garantias do crédito
async function fetchGuarantees() {
  if (!props.loan?.id) return
  try {
    const { data } = await api.get(`/api/getLoanGuarantees/${props.loan.id}`)
    if (data.success && data.result) {
      guarantees.value = data.result
      // Auto-popular campo garantia
      if (guarantees.value.length > 0) {
        const garantiaText = guarantees.value.map(g => {
          const desc = g.guaranteeDescription || g.description || 'Sem descrição'
          const valor = formatMoney(g.purchaseAmount || 0)
          return `${desc} (${valor})`
        }).join(', ')
        form.value.garantia = garantiaText
      }
    }
  } catch {
    guarantees.value = []
  }
}

// Buscar prestações do crédito
async function fetchInstallments() {
  if (!props.loan?.id) return
  try {
    const forfeit = companyStore.company?.forfeit || 0.1
    const result = await loansStore.fetchAmortization(props.loan.id, forfeit)
    installments.value = result?.installments || []
  } catch {
    installments.value = []
  }
}

// Preencher dados quando modal abre
watch(() => props.modelValue, async (val) => {
  if (val && props.loan && props.customer) {
    // Buscar dados
    await Promise.all([fetchGuarantees(), fetchInstallments()])

    const l = props.loan
    const cu = props.customer
    const inst = installments.value

    form.value.mutuario = cu.customerName || ''
    form.value.valorCredito = formatMoney(l.amount)
    form.value.prazo = `${l.numberOfInstallments} meses`
    form.value.taxa = `${(l.interestRate * 100).toFixed(1)}% ao mês`
    form.value.dataDesembolso = l.dateCreated ? new Date(l.dateCreated).toISOString().split('T')[0] : ''
    form.value.capitalSeguro = formatMoney(l.amount)
    form.value.beneficiario = `${companyName.value} até ao saldo devedor`

    // Prestação mensal e data vencimento (última prestação)
    if (inst.length > 0) {
      const firstInst = inst[0]
      const lastInst = inst[inst.length - 1]
      form.value.prestacaoMensal = formatMoney(firstInst.installment)
      form.value.dataVencimento = formatDateShort(lastInst.dueDate)
    } else {
      // Calcular manualmente se não há dados no banco
      const rate = l.interestRate || 0
      const periods = l.numberOfInstallments || 12
      const principal = l.amount || 0
      if (rate > 0 && principal > 0) {
        const num = rate * Math.pow(1 + rate, periods)
        const den = Math.pow(1 + rate, periods) - 1
        const pmt = principal * (num / den)
        form.value.prestacaoMensal = formatMoney(pmt)
      }
      // Data de vencimento = desembolso + N meses
      const disbursement = new Date(l.dateCreated)
      disbursement.setMonth(disbursement.getMonth() + periods)
      form.value.dataVencimento = formatDateShort(disbursement)
    }

    // Carregar dados guardados
    if (l.borrowerInfo) {
      try {
        const info = typeof l.borrowerInfo === 'string' ? JSON.parse(l.borrowerInfo) : l.borrowerInfo
        form.value.finalidade = info.finalidade || ''
        if (info.garantia) form.value.garantia = info.garantia
        form.value.seguroVida = info.seguroVida || 'Não'
        if (info.capitalSeguro) form.value.capitalSeguro = info.capitalSeguro
        form.value.seguroBem = info.seguroBem || 'Não'
        if (info.beneficiario) form.value.beneficiario = info.beneficiario
      } catch {}
    }
  }
})

// Actualizar data de vencimento quando data de desembolso muda
function onDesembolsoChange(newDate) {
  if (newDate && props.loan) {
    const disbursement = new Date(newDate)
    const numInstallments = props.loan.numberOfInstallments || 12
    disbursement.setMonth(disbursement.getMonth() + numInstallments)
    form.value.dataVencimento = formatDateShort(disbursement)
  }
}

async function save() {
  saving.value = true
  try {
    const borrowerInfo = {
      finalidade: form.value.finalidade,
      garantia: form.value.garantia,
      seguroVida: form.value.seguroVida,
      capitalSeguro: form.value.capitalSeguro,
      seguroBem: form.value.seguroBem,
      beneficiario: form.value.beneficiario
    }

    // Actualizar datas se desembolso mudou
    if (form.value.dataDesembolso && props.loan) {
      const originalDate = props.loan.dateCreated ? new Date(props.loan.dateCreated).toISOString().split('T')[0] : ''
      if (form.value.dataDesembolso !== originalDate) {
        await loansStore.updateInstallmentDates(props.loan.id, form.value.dataDesembolso)
        $q.notify({ type: 'positive', message: 'Datas das prestações actualizadas', position: 'top' })
      }
    }

    await loansStore.updateLoan(props.loan.id, { borrowerInfo: JSON.stringify(borrowerInfo) })
    $q.notify({ type: 'positive', message: 'Informação guardada com sucesso', position: 'top' })
    emit('saved', borrowerInfo)
    close()
  } catch (e) {
    console.error('Erro ao guardar:', e)
    $q.notify({ type: 'negative', message: 'Erro ao guardar informação', position: 'top' })
  } finally {
    saving.value = false
  }
}

function close() {
  show.value = false
}
</script>

<style lang="scss" scoped>
.section-card {
  border-radius: 10px;
}

.section-header {
  padding: 8px 16px;
  font-weight: 600;
}

:body--light {
  .section-header {
    background-color: #f5f5f5;
    color: #333;
    border-bottom: 1px solid #e0e0e0;
  }
  .section-card {
    border-color: #e0e0e0;
  }
}

:body--dark {
  .section-header {
    background-color: #1e2a38 !important;
    color: rgba(255, 255, 255, 0.87) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }
  .section-card {
    background-color: #1a2332;
    border-color: rgba(255, 255, 255, 0.12);
  }
}
</style>
