<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 460px; max-width: 620px; border-radius: 16px">
      <q-card-section class="bg-primary text-white row items-center" style="border-radius: 16px 16px 0 0">
        <div>
          <div class="text-h6">{{ typeLabel }}</div>
          <div class="text-caption">{{ customer?.customerName }} · Conta {{ customer?.accountNumber }}</div>
        </div>
        <q-space />
        <q-btn flat round dense icon="close" :disable="submitting" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- Tipo de atividade -->
        <q-select
          v-model="activityType"
          :options="typeOptions"
          emit-value
          map-options
          outlined
          dense
          label="Tipo de atividade"
          class="q-mb-md"
          :disable="submitting"
        />

        <!-- PROMESSA DE PAGAMENTO: data prometida + valor prometido -->
        <template v-if="activityType === 'PROMESSA_PAGAMENTO'">
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6">
              <q-input
                v-model="promisedDate"
                type="date"
                outlined
                dense
                label="Data prometida *"
                :rules="[v => !!v || 'Indique a data prometida']"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="promisedAmount"
                type="number"
                outlined
                dense
                label="Valor prometido (MZN) *"
                :rules="[v => Number(v) > 0 || 'Indique o valor prometido']"
              />
            </div>
          </div>
        </template>

        <!-- Observação -->
        <q-input
          v-model="notes"
          type="textarea"
          outlined
          dense
          autogrow
          label="Observação"
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Cancelar" color="grey" no-caps :disable="submitting" v-close-popup />
        <q-btn
          unelevated
          :label="`Registar ${typeLabel.toLowerCase()}`"
          color="primary"
          icon="save"
          no-caps
          rounded
          :loading="submitting"
          @click="confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  customer: { type: Object, default: null },
  initialType: { type: String, default: 'VISITA_DOMICILIAR' }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const typeOptions = [
  { label: 'Visita domiciliária', value: 'VISITA_DOMICILIAR', icon: 'home' },
  { label: 'Ligação telefónica', value: 'LIGACAO_TELEFONICA', icon: 'call' },
  { label: 'Promessa de pagamento', value: 'PROMESSA_PAGAMENTO', icon: 'handshake' },
  { label: 'Recusa', value: 'RECUSA', icon: 'block' }
]

const activityType = ref('VISITA_DOMICILIAR')
const promisedDate = ref('')
const promisedAmount = ref(null)
const notes = ref('')
const submitting = ref(false)

const typeLabel = computed(
  () => typeOptions.find((t) => t.value === activityType.value)?.label || 'Atividade'
)

watch(show, (val) => {
  if (val) {
    activityType.value = props.initialType || 'VISITA_DOMICILIAR'
    promisedDate.value = new Date().toISOString().slice(0, 10)
    promisedAmount.value = null
    notes.value = ''
  }
})

async function confirm() {
  if (!props.customer?.accountNumber) return
  if (activityType.value === 'PROMESSA_PAGAMENTO') {
    if (!promisedDate.value || !(Number(promisedAmount.value) > 0)) {
      $q.notify({ type: 'warning', message: 'A promessa exige data prometida e valor prometido.', position: 'top' })
      return
    }
  }
  submitting.value = true
  try {
    const payload = {
      accountNumber: props.customer.accountNumber,
      activityType: activityType.value,
      notes: notes.value && notes.value.trim() ? notes.value.trim() : null
    }
    if (activityType.value === 'PROMESSA_PAGAMENTO') {
      payload.promisedDate = promisedDate.value
      payload.promisedAmount = Number(promisedAmount.value)
    }
    const { data } = await api.post('/api/collection/activities', payload)
    $q.notify({ type: 'positive', message: data?.message || 'Atividade registada.', position: 'top' })
    show.value = false
    emit('saved', data?.result)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao registar a atividade',
      position: 'top'
    })
  } finally {
    submitting.value = false
  }
}
</script>
