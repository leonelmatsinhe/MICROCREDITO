<template>
  <q-dialog v-model="show" persistent>
    <q-card style="border-radius: 16px; width: 100%; max-width: 480px; min-width: 0">
      <q-card-section class="row items-center bg-primary text-white q-py-sm">
        <q-icon name="assignment" size="22px" class="q-mr-sm" />
        <div class="text-subtitle1 text-weight-bold">Solicitação de Crédito</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="show = false" />
      </q-card-section>

      <!-- Stepper / Tabs -->
      <q-tabs v-model="tab" dense class="text-primary" active-color="primary" indicator-color="primary" align="justify">
        <q-tab name="plano" icon="payments" label="1. Plano" no-caps />
        <q-tab name="kyc" icon="badge" label="2. KYC / Docs" no-caps />
        <q-tab name="garantia" icon="security" label="3. Garantias" no-caps />
      </q-tabs>
      <q-separator />

      <q-card-section class="q-pa-md" style="max-height: 60vh; overflow-y: auto">
        <!-- TAB 1: PLANO E MONTANTE -->
        <div v-show="tab === 'plano'">
          <div class="text-caption text-grey-6 q-mb-sm">
            Indique o montante pretendido e o número de prestações pretendido.
          </div>

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

          <q-select
            v-model="loanRequest.numberOfInstallments"
            :options="installmentOptions"
            label="Nº de prestações"
            dense
            outlined
            emit-value
            map-options
            class="q-mb-sm"
            :rules="[v => !!v || 'Obrigatório']"
          />

          <q-input
            v-model="loanRequest.loanDescription"
            label="Finalidade do crédito (ex.: capital de giro, obras, emergência)"
            dense
            outlined
            type="textarea"
            rows="2"
            class="q-mb-sm"
          />

          <q-card flat bordered class="q-pa-sm bg-blue-1 text-blue-10 rounded-borders">
            <div class="text-caption">
              Capacidade indicativa (1/3 do rendimento declarado):
              <strong>{{ formatMoney(loanRequestCapacity) }}</strong>
            </div>
          </q-card>
        </div>

        <!-- TAB 2: DOCUMENTOS E KYC -->
        <div v-show="tab === 'kyc'">
          <div class="text-caption text-grey-6 q-mb-sm">
            Para acelerar a aprovação, anexe os seus documentos digitais ou fotos nítidas.
          </div>

          <div class="q-gutter-y-sm">
            <!-- Documento de Identificação -->
            <q-card flat bordered class="q-pa-sm">
              <div class="row items-center justify-between no-wrap">
                <div>
                  <div class="text-weight-bold" style="font-size: 13px">Bilhete de Identidade (BI) / DIRE</div>
                  <div class="text-caption text-grey-6">Frente e verso do documento</div>
                </div>
                <q-file
                  v-model="docs.bi"
                  dense
                  outlined
                  label="Anexar"
                  accept=".jpg,.jpeg,.png,.pdf"
                  style="max-width: 130px"
                >
                  <template v-slot:prepend><q-icon name="attach_file" size="16px" /></template>
                </q-file>
              </div>
            </q-card>

            <!-- Comprovativo de Rendimentos -->
            <q-card flat bordered class="q-pa-sm">
              <div class="row items-center justify-between no-wrap">
                <div>
                  <div class="text-weight-bold" style="font-size: 13px">Comprovativo de Rendimentos</div>
                  <div class="text-caption text-grey-6">Extracto bancário ou recibo de vencimento</div>
                </div>
                <q-file
                  v-model="docs.rendimento"
                  dense
                  outlined
                  label="Anexar"
                  accept=".jpg,.jpeg,.png,.pdf"
                  style="max-width: 130px"
                >
                  <template v-slot:prepend><q-icon name="attach_file" size="16px" /></template>
                </q-file>
              </div>
            </q-card>

            <!-- Comprovativo de Residência -->
            <q-card flat bordered class="q-pa-sm">
              <div class="row items-center justify-between no-wrap">
                <div>
                  <div class="text-weight-bold" style="font-size: 13px">Comprovativo de Residência</div>
                  <div class="text-caption text-grey-6">Declaração de bairro ou factura EDM/FIPAG</div>
                </div>
                <q-file
                  v-model="docs.residencia"
                  dense
                  outlined
                  label="Anexar"
                  accept=".jpg,.jpeg,.png,.pdf"
                  style="max-width: 130px"
                >
                  <template v-slot:prepend><q-icon name="attach_file" size="16px" /></template>
                </q-file>
              </div>
            </q-card>
          </div>
        </div>

        <!-- TAB 3: GARANTIAS OFERECIDAS -->
        <div v-show="tab === 'garantia'">
          <div class="text-caption text-grey-6 q-mb-sm">
            Bens oferecidos em penhor/garantia para cobrir o crédito.
          </div>

          <q-input
            v-model="guarantee.description"
            label="Descrição do Bem (ex.: Viatura Toyota Ractis 2012, Televisor 55')"
            dense
            outlined
            class="q-mb-sm"
          />

          <q-input
            v-model.number="guarantee.estimatedValue"
            label="Valor Estimado de Mercado (MZN)"
            dense
            outlined
            type="number"
            class="q-mb-sm"
          />

          <q-file
            v-model="guarantee.photo"
            dense
            outlined
            label="Foto do Bem / Garantia"
            accept=".jpg,.jpeg,.png"
            class="q-mb-sm"
          >
            <template v-slot:prepend><q-icon name="add_a_photo" size="18px" /></template>
          </q-file>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="between" class="q-pa-md bg-grey-1">
        <q-btn
          v-if="tab !== 'plano'"
          flat
          label="Voltar"
          color="grey-8"
          no-caps
          @click="tab = tab === 'garantia' ? 'kyc' : 'plano'"
        />
        <q-btn v-else flat label="Cancelar" color="grey-7" no-caps @click="show = false" />

        <q-btn
          v-if="tab !== 'garantia'"
          unelevated
          label="Avançar"
          color="primary"
          no-caps
          class="btn-native"
          @click="tab = tab === 'plano' ? 'kyc' : 'garantia'"
        />
        <q-btn
          v-else
          unelevated
          label="Enviar Pedido"
          icon="send"
          color="positive"
          no-caps
          class="btn-native"
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
  modelValue: { type: Boolean, default: false },
  preset: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'submitted'])

const $q = useQuasar()
const authStore = useAuthStore()
const { customer, formatMoney } = usePortalData()

const show = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const tab = ref('plano')
const submittingRequest = ref(false)

const loanRequest = ref({
  amount: 15000,
  numberOfInstallments: 4,
  loanDescription: ''
})

const docs = ref({
  bi: null,
  rendimento: null,
  residencia: null
})

const guarantee = ref({
  description: '',
  estimatedValue: null,
  photo: null
})

const installmentOptions = [
  { label: '1 Prestação', value: 1 },
  { label: '2 Prestações', value: 2 },
  { label: '3 Prestações', value: 3 },
  { label: '4 Prestações', value: 4 },
  { label: '5 Prestações', value: 5 },
  { label: '6 Prestações', value: 6 },
  { label: '12 Prestações', value: 12 },
  { label: '18 Prestações', value: 18 }
]

const loanRequestCapacity = computed(() => {
  const salary = Number(customer.value?.customerMonthlySalary) || 0
  return Math.round((salary / 3) * 100) / 100
})

const canSubmitLoanRequest = computed(() => {
  return Number(loanRequest.value.amount) > 0 && Number(loanRequest.value.numberOfInstallments) > 0
})

watch(() => props.preset, val => {
  if (val) {
    if (val.amount) loanRequest.value.amount = val.amount
    if (val.installments) loanRequest.value.numberOfInstallments = val.installments
  }
}, { immediate: true })

async function submitLoanRequest() {
  const user = authStore.user
  if (!user?.companyId || !user?.id) return

  submittingRequest.value = true

  try {
    const { data } = await api.post(`/api/portal/${user.companyId}/${user.id}/loans/request`, {
      amount: Number(loanRequest.value.amount),
      numberOfInstallments: Number(loanRequest.value.numberOfInstallments),
      loanDescription: loanRequest.value.loanDescription,
      guarantee: guarantee.value.description ? {
        description: guarantee.value.description,
        value: guarantee.value.estimatedValue
      } : null
    })

    if (data.success) {
      $q.notify({
        type: 'positive',
        message: 'Pedido de empréstimo submetido com sucesso! O seu gestor foi notificado.',
        position: 'top',
        timeout: 5000
      })
      show.value = false
      emit('submitted')
    } else {
      $q.notify({ type: 'negative', message: data.message || 'Erro ao submeter pedido.', position: 'top' })
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro de comunicação.', position: 'top' })
  } finally {
    submittingRequest.value = false
  }
}
</script>

<style lang="scss" scoped>
.btn-native {
  min-height: 40px;
  border-radius: 10px;
  font-weight: 600;
}
</style>
