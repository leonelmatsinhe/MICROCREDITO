<template>
  <q-dialog v-model="show" persistent>
    <q-card style="border-radius: 16px; width: 100%; max-width: 430px; min-width: 0">
      <q-card-section class="row items-center bg-primary text-white">
        <q-icon name="add_circle" size="24px" class="q-mr-sm" />
        <div class="text-h6">Solicitar Novo Empréstimo</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="show = false" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="text-body2 text-grey-6 q-mb-md">
          Preencha os dados pretendidos. O pedido será analisado pela instituição antes da aprovação.
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12">
            <q-input
              v-model.number="loanRequest.amount"
              label="Montante pretendido (MZN)"
              dense
              outlined
              type="number"
              class="q-mb-sm"
              :rules="[v => v > 0 || 'Indique o montante pretendido']"
            >
              <template v-slot:prepend>
                <q-icon name="attach_money" size="18px" />
              </template>
            </q-input>
          </div>
          <div class="col-12">
            <q-select
              v-model="loanRequest.numberOfInstallments"
              :options="installmentOptions"
              label="Nº de prestações (meses)"
              dense
              outlined
              emit-value
              map-options
              class="q-mb-sm"
              :rules="[v => !!v || 'Obrigatório']"
            />
            <div class="text-caption text-grey-6 q-mb-sm">Prazo entre 1 e 18 meses.</div>
          </div>
        </div>

        <q-card flat bordered class="q-mb-md" style="border-radius: 8px">
          <q-card-section class="q-py-sm row items-center no-wrap">
            <q-icon name="info_outline" size="20px" color="primary" class="q-mr-sm" />
            <div class="text-caption" style="line-height: 1.5">
              A <strong>taxa de juro</strong> e o valor da <strong>prestação mensal</strong> serão definidos pela instituição durante a análise do pedido.
              <template v-if="loanRequestCapacity > 0">
                Capacidade indicativa de pagamento (1/3 do rendimento): <strong>{{ formatMoney(loanRequestCapacity) }}</strong>.
              </template>
            </div>
          </q-card-section>
        </q-card>

        <q-input
          v-model="loanRequest.loanDescription"
          label="Finalidade do crédito"
          dense
          outlined
          type="textarea"
          rows="2"
          class="q-mb-sm"
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancelar" color="grey" no-caps @click="show = false" />
        <q-btn
          unelevated
          label="Enviar Pedido"
          color="primary"
          icon="send"
          no-caps
          rounded
          :loading="submittingRequest"
          :disable="!canSubmitLoanRequest"
          @click="submitLoanRequest"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import { usePortalData } from '@/composables/usePortalData'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'submitted'])

const $q = useQuasar()
const authStore = useAuthStore()
const { loanRequestCapacity, formatMoney } = usePortalData()

const show = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const submittingRequest = ref(false)
const loanRequest = ref({ amount: null, numberOfInstallments: null, loanDescription: '' })

const installmentOptions = Array.from({ length: 18 }, (_, i) => ({
  label: `${i + 1} ${i === 0 ? 'mês' : 'meses'}`,
  value: i + 1
}))

const canSubmitLoanRequest = computed(() => {
  const amountOk = Number(loanRequest.value.amount) > 0
  const installments = Number(loanRequest.value.numberOfInstallments)
  const installmentsOk = Number.isInteger(installments) && installments >= 1 && installments <= 18
  return amountOk && installmentsOk
})

watch(show, open => {
  if (open) loanRequest.value = { amount: null, numberOfInstallments: null, loanDescription: '' }
})

async function submitLoanRequest() {
  const user = authStore.user
  if (!user) return
  submittingRequest.value = true
  try {
    const { data } = await api.post(`/api/portal/${user.companyId}/${user.id}/loans/request`, {
      amount: Number(loanRequest.value.amount),
      numberOfInstallments: Number(loanRequest.value.numberOfInstallments),
      loanDescription: loanRequest.value.loanDescription
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: data.message || 'Pedido enviado com sucesso', position: 'top' })
      show.value = false
      emit('submitted')
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao enviar pedido', position: 'top' })
  } finally {
    submittingRequest.value = false
  }
}
</script>
