<template>
  <q-dialog v-model="show" persistent @show="onOpen">
    <q-card style="border-radius: 16px; min-width: 380px; max-width: 95vw">
      <q-card-section class="row items-center bg-primary text-white">
        <q-icon name="lock_open" size="24px" class="q-mr-sm" />
        <div class="text-h6">Enviar Credenciais</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- Aviso se já enviado -->
        <q-banner v-if="alreadySent" class="bg-warning text-white q-mb-md" rounded>
          <template v-slot:avatar>
            <q-icon name="warning" size="24px" />
          </template>
          <div class="text-weight-bold">Credenciais já enviadas</div>
          <div class="text-caption">Enviadas em {{ sentAt ? new Date(sentAt).toLocaleString('pt-MZ') : 'data desconhecida' }}. Enviar novamente?</div>
        </q-banner>

        <div v-else class="text-body2 text-grey-6 q-mb-md">
          Envie as credenciais de acesso ao sistema para o utilizador.
        </div>

        <!-- Dados do Utilizador -->
        <q-card flat bordered class="q-mb-md credentials-card" style="border-radius: 8px">
          <q-card-section>
            <div class="row q-col-gutter-sm">
              <div class="col-12">
                <div class="text-caption credentials-label">Utilizador</div>
                <div class="text-weight-bold credentials-value">{{ user.name }}</div>
              </div>
              <div class="col-6">
                <div class="text-caption credentials-label">Telefone</div>
                <div class="text-weight-bold credentials-value">{{ user.phone || 'Não informado' }}</div>
              </div>
              <div class="col-6">
                <div class="text-caption credentials-label">Email</div>
                <div class="text-weight-bold credentials-value">{{ user.email || 'Não informado' }}</div>
              </div>
              <div class="col-12">
                <div class="text-caption credentials-label">Nova Senha</div>
                <div class="text-weight-bold text-primary" style="font-size: 18px; letter-spacing: 2px">{{ generatedPassword }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Canal de Envio -->
        <div class="text-subtitle2 credentials-label q-mb-sm">Canal de Envio</div>
        <q-btn-toggle
          v-model="channel"
          :options="[
            { label: 'SMS', value: 'sms', icon: 'sms' },
            { label: 'WhatsApp', value: 'whatsapp', icon: 'chat' },
            { label: 'Email', value: 'email', icon: 'email' }
          ]"
          push
          glossy
          no-caps
          class="q-mb-md full-width"
          toggle-color="primary"
        />

        <!-- Preview da Mensagem -->
        <q-card flat bordered class="q-mb-md credentials-card" style="border-radius: 8px">
          <q-card-section class="q-py-sm">
            <div class="text-caption credentials-label">Preview da Mensagem</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="credentials-message" style="white-space: pre-wrap; font-size: 13px">
Ola {{ user.name }}. Sua senha de acesso ao sistema da {{ companyName }} e: {{ generatedPassword }}. Telefone: {{ user.phone }}. Altere apos o primeiro acesso.</div>
          </q-card-section>
        </q-card>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancelar" color="grey" no-caps @click="close" />
        <q-btn
          unelevated
          :label="channel === 'sms' ? 'Enviar SMS' : channel === 'whatsapp' ? 'Enviar WhatsApp' : 'Enviar Email'"
          :color="channel === 'sms' ? 'primary' : channel === 'whatsapp' ? 'positive' : 'orange'"
          :icon="channel === 'sms' ? 'sms' : channel === 'whatsapp' ? 'chat' : 'email'"
          no-caps
          rounded
          :loading="sending"
          :disable="!user.phone && channel !== 'email'"
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
import { useCompanyStore } from '@/stores/company'
import { generateSixDigitCode } from '@/utils/codeGenerator'

const props = defineProps({
  modelValue: Boolean,
  user: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'sent'])

const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const channel = ref('sms')
const sending = ref(false)
const generatedPassword = ref('')
const alreadySent = ref(false)
const sentAt = ref('')

const companyName = computed(() => companyStore.companyName || 'MBR Microcrédito')

function onOpen() {
  if (props.user.credentialsSent === 1) {
    alreadySent.value = true
    sentAt.value = props.user.credentialsSentAt || ''
    generatedPassword.value = props.user.password || ''
  } else {
    alreadySent.value = false
    generatedPassword.value = generateSixDigitCode()
  }
}

function close() {
  show.value = false
  alreadySent.value = false
  generatedPassword.value = ''
}

async function send() {
  sending.value = true
  try {
    // Actualizar senha do utilizador
    await api.put(`/api/user/${props.user.id}`, {
      password: generatedPassword.value,
      credentialsSent: 1,
      credentialsSentAt: new Date().toISOString(),
    })

    // Enviar via canal
    let endpoint = ''
    let payload = {}

    if (channel.value === 'sms') {
      endpoint = '/api/sendSms'
      payload = {
        companyId: authStore.companyId,
        receipient: props.user.phone,
        accountNumber: props.user.id,
        smsBody: `Ola ${props.user.name}. Sua senha de acesso ao sistema da ${companyName.value} e: ${generatedPassword.value}. Telefone: ${props.user.phone}. Altere apos o primeiro acesso.`,
      }
    } else if (channel.value === 'whatsapp') {
      endpoint = '/api/whatsapp/send'
      payload = {
        companyId: authStore.companyId,
        phone: props.user.phone,
        accountNumber: props.user.id,
        messageType: 'password_reset',
        messageBody: `Ola ${props.user.name}. Sua senha de acesso ao sistema da ${companyName.value} e: ${generatedPassword.value}. Telefone: ${props.user.phone}. Altere apos o primeiro acesso.`,
      }
    } else {
      // Email - TODO: implementar envio de email
      $q.notify({ type: 'info', message: 'Envio por email ainda não implementado', position: 'top' })
      return
    }

    const { data } = await api.post(endpoint, payload)

    if (data.success) {
      $q.notify({
        type: alreadySent.value ? 'warning' : 'positive',
        message: alreadySent.value
          ? `Credenciais reenviadas via ${channel.value === 'sms' ? 'SMS' : 'WhatsApp'}`
          : `Credenciais enviadas via ${channel.value === 'sms' ? 'SMS' : 'WhatsApp'}`,
        position: 'top'
      })
      emit('sent')
      close()
    }
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Erro ao enviar credenciais',
      position: 'top'
    })
  } finally {
    sending.value = false
  }
}
</script>

<style lang="scss" scoped>
.credentials-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}

.credentials-label {
  color: #6c757d;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.credentials-value {
  color: #212529;
  font-size: 14px;
}

.credentials-message {
  background: #e8f5e9;
  border-radius: 8px;
  padding: 12px;
  color: #2e7d32;
  font-family: monospace;
}

body.body--dark {
  .credentials-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .credentials-label {
    color: rgba(255, 255, 255, 0.6);
  }
  .credentials-value {
    color: rgba(255, 255, 255, 0.87);
  }
  .credentials-message {
    background: rgba(76, 175, 80, 0.15);
    color: #81c784;
  }
}
</style>
