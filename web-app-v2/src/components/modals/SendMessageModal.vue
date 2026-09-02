<template>
  <q-dialog v-model="show" persistent>
    <q-card style="border-radius: 16px; min-width: 450px; max-width: 95vw">
      <!-- Header -->
      <q-card-section class="row items-center bg-primary text-white">
        <q-icon name="chat" size="24px" class="q-mr-sm" />
        <div class="text-h6">Enviar Mensagem</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- Canal -->
        <div class="text-subtitle2 text-grey-6 q-mb-sm">Canal</div>
        <q-btn-toggle
          v-model="channel"
          :options="channelOptions"
          push
          glossy
          no-caps
          class="q-mb-md full-width"
          toggle-color="primary"
        />

        <!-- Template -->
        <q-select
          v-model="selectedTemplate"
          :options="templateOptions"
          label="Template"
          dense
          outlined
          emit-value
          map-options
          class="q-mb-md"
          @update:model-value="applyTemplate"
        />

        <!-- Destinatário -->
        <q-input
          v-model="form.phone"
          label="Telefone"
          dense
          outlined
          class="q-mb-md"
          :rules="[v => !!v || 'Obrigatório']"
        >
          <template v-slot:prepend>
            <q-icon name="phone" size="18px" />
          </template>
        </q-input>

        <!-- Mensagem -->
        <q-input
          v-model="form.message"
          label="Mensagem"
          type="textarea"
          dense
          outlined
          rows="4"
          class="q-mb-md"
          :rules="[v => !!v || 'Obrigatório']"
        >
          <template v-slot:after>
            <div class="text-caption" :class="form.message.length > 160 ? 'text-negative' : 'text-grey-5'">
              {{ form.message.length }}/160
            </div>
          </template>
        </q-input>

        <!-- Preview -->
        <q-card flat bordered class="q-mb-md" style="border-radius: 8px">
          <q-card-section class="q-py-sm bg-grey-1">
            <div class="text-caption text-grey-6">Preview</div>
          </q-card-section>
          <q-card-section>
            <div style="white-space: pre-wrap; font-size: 13px">{{ form.message || 'Digite uma mensagem...' }}</div>
          </q-card-section>
        </q-card>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancelar" color="grey" no-caps @click="close" />
        <q-btn
          unelevated
          :label="channel === 'sms' ? 'Enviar SMS' : 'Enviar WhatsApp'"
          :color="channel === 'sms' ? 'primary' : 'positive'"
          :icon="channel === 'sms' ? 'sms' : 'chat'"
          no-caps
          rounded
          :loading="sending"
          :disable="!form.phone || !form.message"
          @click="send"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  modelValue: Boolean,
  phone: { type: String, default: '' },
  accountNumber: { type: [String, Number], default: '' },
  customerName: { type: String, default: '' },
  messageType: { type: String, default: 'manual' },
})

const emit = defineEmits(['update:modelValue', 'sent'])

const $q = useQuasar()
const authStore = useAuthStore()

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const channel = ref('sms')
const selectedTemplate = ref('')
const sending = ref(false)

const form = ref({
  phone: '',
  message: '',
})

const channelOptions = [
  { label: 'SMS', value: 'sms', icon: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp', icon: 'chat' }
]

const templates = {
  disbursement: {
    name: 'Credito Desembolsado',
    sms: 'Ola {nome}. Seu credito de {valor} MZN foi desembolsado. Parcelas: {parcelas}. Vence: {vencimento}. Obrigado.',
    whatsapp: `Ola {nome}. Seu credito de {valor} MZN foi desembolsado com sucesso.

Parcelas: {parcelas}
Primeiro vencimento: {vencimento}

Obrigado pela confianca.`
  },
  payment: {
    name: 'Pagamento Confirmado',
    sms: 'Ola {nome}. Pagamento de {valor} MZN confirmado. Ref: {referencia}. Obrigado.',
    whatsapp: `Ola {nome}. Seu pagamento foi confirmado com sucesso.

Valor: {valor} MZN
Referencia: {referencia}

Obrigado.`
  },
  upcoming: {
    name: 'Lembrete de Prestacao',
    sms: 'Ola {nome}. Sua prestacao de {valor} MZN vence em {data}. Evite juros facendo o pagamento.',
    whatsapp: `Ola {nome}. Sua prestacao esta proxima do vencimento.

Valor: {valor} MZN
Vencimento: {data}

Evite juros de mora facendo o pagamento antecipadamente.`
  },
  latePayment: {
    name: 'Prestacao em Atraso',
    sms: 'Ola {nome}. Sua prestacao esta em atraso. Valor: {valor} MZN. Regularize para evitar juros.',
    whatsapp: `Ola {nome}. Identificamos que sua prestacao esta em atraso.

Valor: {valor} MZN

Regularize o mais breve possivel para evitar juros de mora.`
  },
  passwordReset: {
    name: 'Redefinicao de Senha',
    sms: 'Ola {nome}. Sua nova senha: {senha}. Altere apos o primeiro acesso.',
    whatsapp: `Ola {nome}. Sua senha foi redefinida.

Nova senha: {senha}

Por favor, altere apos o primeiro acesso por seguranca.`
  },
  custom: {
    name: 'Mensagem Personalizada',
    sms: '',
    whatsapp: ''
  }
}

const templateOptions = computed(() => {
  return Object.entries(templates).map(([key, t]) => ({
    label: t.name,
    value: key
  }))
})

watch(() => props.phone, (val) => {
  if (val) form.value.phone = val
}, { immediate: true })

watch(() => props.customerName, (val) => {
  if (val && !selectedTemplate.value) {
    selectedTemplate.value = 'custom'
  }
}, { immediate: true })

function applyTemplate(key) {
  if (!key || key === 'custom') {
    form.value.message = ''
    return
  }
  const template = templates[key]
  let msg = channel.value === 'whatsapp' ? template.whatsapp : template.sms

  // Substituir placeholders
  msg = msg.replace('{nome}', props.customerName || 'Cliente')
  msg = msg.replace('{telefone}', form.value.phone || '')

  form.value.message = msg
}

function close() {
  show.value = false
  form.value = { phone: '', message: '' }
  selectedTemplate.value = ''
}

async function send() {
  if (!form.value.phone || !form.value.message) return

  sending.value = true
  try {
    const companyId = authStore.companyId
    const endpoint = channel.value === 'sms' ? '/api/sendSms' : '/api/whatsapp/send'

    const payload = {
      companyId,
      phone: form.value.phone,
      accountNumber: props.accountNumber,
      messageType: selectedTemplate.value || 'manual',
      messageBody: form.value.message,
      receipient: form.value.phone,
      smsBody: form.value.message,
    }

    const { data } = await api.post(endpoint, payload)

    if (data.success) {
      $q.notify({
        type: 'positive',
        message: `${channel.value === 'sms' ? 'SMS' : 'WhatsApp'} enviado com sucesso`,
        position: 'top'
      })
      emit('sent', { channel: channel.value, phone: form.value.phone })
      close()
    }
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Erro ao enviar mensagem',
      position: 'top'
    })
  } finally {
    sending.value = false
  }
}
</script>
