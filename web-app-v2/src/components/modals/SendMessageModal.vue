<template>
  <q-dialog v-model="show" persistent>
    <q-card class="send-message-card" style="border-radius: 14px; min-width: 520px; max-width: 95vw">
      <!-- ═══════════ CABEÇALHO MODAL ═══════════ -->
      <q-card-section class="row items-center modal-header text-white q-py-sm">
        <q-icon name="send_to_mobile" size="22px" class="q-mr-sm" />
        <div>
          <div class="text-subtitle1 text-weight-bold">Enviar Alerta de Cobrança</div>
          <div class="text-caption opacity-80" style="font-size: 11px">
            {{ customerName || 'Mutuário' }} · Conta {{ accountNumber || '—' }}
          </div>
        </div>
        <q-space />
        <q-btn flat round dense icon="close" color="white" @click="close" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- ═══════════ SELECÇÃO DO CANAL ═══════════ -->
        <div class="text-caption text-weight-bold text-grey-7 text-uppercase q-mb-xs">Canal de Envio</div>
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-6">
            <q-btn
              unelevated
              no-caps
              class="full-width channel-btn"
              :class="{ 'channel-active': channel === 'sms' }"
              @click="channel = 'sms'"
            >
              <q-icon name="sms" size="18px" class="q-mr-xs" />
              <span>SMS Gateway</span>
              <q-badge v-if="smsBlocked" color="amber-9" floating size="xs">Desactivado</q-badge>
            </q-btn>
          </div>
          <div class="col-6">
            <q-btn
              unelevated
              no-caps
              class="full-width channel-btn"
              :class="{ 'channel-active-wa': channel === 'whatsapp' }"
              @click="channel = 'whatsapp'"
            >
              <q-icon name="chat" size="18px" class="q-mr-xs text-positive" />
              <span>WhatsApp Directo</span>
            </q-btn>
          </div>
        </div>

        <!-- Alerta Informativo do Canal WhatsApp -->
        <q-banner v-if="channel === 'whatsapp'" class="bg-green-1 text-green-10 q-mb-md rounded-borders border-green" dense>
          <template v-slot:avatar>
            <q-icon name="chat" size="18px" color="positive" />
          </template>
          <div class="text-caption" style="line-height: 1.3">
            O sistema abrirá a conversa oficial no WhatsApp com a mensagem e os valores já preenchidos para envio imediato.
          </div>
        </q-banner>

        <!-- Alerta de SMS Desactivado nas Configurações -->
        <q-banner v-else-if="smsBlocked" class="bg-amber-1 text-amber-10 q-mb-md rounded-borders border-amber" dense>
          <template v-slot:avatar>
            <q-icon name="phonelink_erase" size="20px" color="amber-9" />
          </template>
          <div class="text-weight-bold" style="font-size: 12px">Gateway SMS desactivado na empresa</div>
          <div class="text-caption q-mt-xs" style="line-height: 1.3">
            O envio automático de SMS está desligado nas configurações. Pode utilizar o <strong>WhatsApp Directo</strong> acima ou contactar o Administrador.
          </div>
        </q-banner>

        <!-- ═══════════ TEMPLATES PROFISSIONAIS DE COBRANÇA ═══════════ -->
        <div class="text-caption text-weight-bold text-grey-7 text-uppercase q-mb-xs">Modelo de Alerta (Template)</div>
        <q-select
          v-model="selectedTemplate"
          :options="templateOptions"
          dense
          outlined
          emit-value
          map-options
          options-dense
          class="q-mb-md"
          input-style="font-size: 13px"
          @update:model-value="onTemplateChange"
        >
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps" class="q-py-xs">
              <q-item-section avatar style="min-width: 32px">
                <q-icon :name="scope.opt.icon" :color="scope.opt.color" size="18px" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium" style="font-size: 13px">{{ scope.opt.label }}</q-item-label>
                <q-item-label caption style="font-size: 11px">{{ scope.opt.desc }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <!-- ═══════════ DESTINATÁRIO TELEFÓNICO ═══════════ -->
        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-12">
            <q-input
              v-model="form.phone"
              label="Contacto Telefónico"
              dense
              outlined
              mask="################"
              input-style="font-size: 13px"
              :rules="[v => !!v || 'Contacto obrigatório']"
            >
              <template v-slot:prepend>
                <q-icon name="phone" size="18px" color="primary" />
              </template>
              <template v-slot:append>
                <span class="text-caption text-grey-5 font-mono">MZ (+258)</span>
              </template>
            </q-input>
          </div>
        </div>

        <!-- ═══════════ MENSAGEM / TEXTAREA ═══════════ -->
        <div class="text-caption text-weight-bold text-grey-7 text-uppercase q-mb-xs flex justify-between items-center">
          <span>Texto da Comunicação</span>
          <span class="font-mono" :class="charCountClass" style="font-size: 11px">
            {{ form.message.length }} carateres ({{ smsParts }} SMS)
          </span>
        </div>
        <q-input
          v-model="form.message"
          type="textarea"
          dense
          outlined
          rows="4"
          class="q-mb-sm"
          input-style="font-size: 12.5px; line-height: 1.4"
          placeholder="Escreva a mensagem de cobrança..."
          :rules="[v => !!v || 'Mensagem não pode ficar vazia']"
        />

        <!-- ═══════════ PRÉ-VISUALIZAÇÃO EM TEMPO REAL ═══════════ -->
        <div class="text-caption text-weight-bold text-grey-6 text-uppercase q-mb-xs">Pré-visualização do Destinatário</div>
        <q-card flat bordered class="preview-box q-pa-sm">
          <div class="row items-center no-wrap q-mb-xs">
            <q-icon :name="channel === 'whatsapp' ? 'chat' : 'sms'" size="14px" :color="channel === 'whatsapp' ? 'positive' : 'primary'" class="q-mr-xs" />
            <span class="text-caption text-weight-bold" style="font-size: 11px">
              {{ channel === 'whatsapp' ? 'WhatsApp Oficial' : (companyName || 'MBR Microcrédito') }}
            </span>
            <q-space />
            <span class="text-caption text-grey-5" style="font-size: 10px">Agora</span>
          </div>
          <div class="preview-text">{{ form.message || 'Sem conteúdo preenchido.' }}</div>
        </q-card>
      </q-card-section>

      <!-- ═══════════ ACÇÕES DO MODAL ═══════════ -->
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancelar" color="grey-7" no-caps @click="close" />

        <!-- Botão de Envio WhatsApp -->
        <q-btn
          v-if="channel === 'whatsapp'"
          unelevated
          color="positive"
          icon="open_in_new"
          label="Abrir no WhatsApp"
          no-caps
          rounded
          :disable="!form.phone || !form.message"
          @click="openWhatsAppDirect"
        />

        <!-- Botão de Envio SMS Gateway -->
        <q-btn
          v-else
          unelevated
          color="primary"
          icon="send"
          label="Enviar SMS"
          no-caps
          rounded
          :loading="sending"
          :disable="!form.phone || !form.message || smsBlocked"
          @click="sendSms"
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
import { formatMznPlain } from '@/utils/formatters'

const props = defineProps({
  modelValue: Boolean,
  phone: { type: String, default: '' },
  accountNumber: { type: [String, Number], default: '' },
  customerName: { type: String, default: '' },
  installmentData: { type: Object, default: () => ({}) },
  initialMessage: { type: String, default: '' },
  channel: { type: String, default: 'sms' }
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
const selectedTemplate = ref('overdue_1')
const sending = ref(false)

const form = ref({
  phone: '',
  message: ''
})

const smsDisabled = computed(() => Number(companyStore.company?.smsEnabled ?? 1) !== 1)
const smsBlocked = computed(() => channel.value === 'sms' && smsDisabled.value)
const companyName = computed(() => companyStore.company?.companyName || 'MBR Microcrédito')

// Contagem de partes SMS (padrão GSM 160 caracteres / multipart 153)
const charCountClass = computed(() => {
  const len = form.value.message.length
  if (len > 320) return 'text-negative text-weight-bold'
  if (len > 160) return 'text-warning text-weight-bold'
  return 'text-grey-6'
})

const smsParts = computed(() => {
  const len = form.value.message.length
  if (len === 0) return 1
  if (len <= 160) return 1
  return Math.ceil(len / 153)
})

// ==================== CATÁLOGO PROFISSIONAL DE TEMPLATES ====================
const templates = {
  preventive: {
    label: 'Lembrete Preventivo (3 a 5 dias antes)',
    icon: 'schedule',
    color: 'teal',
    desc: 'Alerta cordial pré-vencimento para incentivar pontualidade',
    template: 'Estimado(a) {nome}, a prestação nº {prestacao} de {valor} MZN vence em {data} ({dias} dias). Agradecemos a sua pontualidade para manter o seu bom histórico. {empresa}.'
  },
  due_today: {
    label: 'Vencimento Hoje (Dia D)',
    icon: 'event_available',
    color: 'orange-9',
    desc: 'Lembrete do dia de vencimento para liquidação imediata',
    template: 'Estimado(a) {nome}, a sua prestação nº {prestacao} de {valor} MZN vence hoje ({data}). Efectue o pagamento até ao final do dia para evitar juros de mora. {empresa}.'
  },
  overdue_1: {
    label: '1º Aviso de Atraso (1 a 15 dias)',
    icon: 'warning_amber',
    color: 'amber-9',
    desc: 'Cobrança amigável com demonstração de mora acumulada',
    template: 'Estimado(a) {nome}, a sua prestação nº {prestacao} de {valor} MZN venceu em {data} ({dias} dias de atraso). Mora: {mora} MZN. Total a regularizar: {total} MZN. {empresa}.'
  },
  overdue_2: {
    label: 'Notificação Formal de Incumprimento (16 a 30 dias)',
    icon: 'priority_high',
    color: 'deep-orange',
    desc: 'Tom formal de cobrança antes de atingir PAR30',
    template: 'NOTIFICAÇÃO FORMAL: Estimado(a) {nome}, o seu crédito regista {dias} dias de incumprimento. Valor em dívida: {total} MZN (inclui {mora} MZN de mora). Regularize com urgência. {empresa}.'
  },
  overdue_3: {
    label: 'Alerta Pré-Contencioso / Execução (+30 dias)',
    icon: 'gavel',
    color: 'negative',
    desc: 'Aviso urgente de risco de execução de bens e reporte regulamentar',
    template: 'AVISO PRÉ-CONTENCIOSO: Estimado(a) {nome}, atraso grave de {dias} dias (Total: {total} MZN). Evite o accionamento de garantias e o registo legal regularizando a situação em 24h. {empresa}.'
  },
  promise: {
    label: 'Confirmação de Promessa / Acordo de Liquidação',
    icon: 'handshake',
    color: 'indigo',
    desc: 'Confirmação formal da data acordada para pagamento',
    template: 'Estimado(a) {nome}, confirmamos o acordo de pagamento no valor de {total} MZN acordado para {data}. Contamos com o seu cumprimento. {empresa}.'
  },
  receipt: {
    label: 'Recibo / Confirmação de Amortização Recebida',
    icon: 'task_alt',
    color: 'positive',
    desc: 'Mensagem de confirmação após quitação da prestação',
    template: 'Estimado(a) {nome}, confirmamos com sucesso a amortização de {valor} MZN. A sua prestação encontra-se liquidada. Obrigado pela preferência. {empresa}.'
  },
  custom: {
    label: 'Mensagem Livre / Personalizada',
    icon: 'edit_note',
    color: 'grey-7',
    desc: 'Redigir livremente o texto da comunicação',
    template: ''
  }
}

const templateOptions = computed(() => {
  return Object.entries(templates).map(([key, t]) => ({
    value: key,
    label: t.label,
    icon: t.icon,
    color: t.color,
    desc: t.desc
  }))
})

// Normalização monetária segura (pt-MZ)
function moneyText(val) {
  const num = Number(val) || 0
  return formatMznPlain(num).replace(/ MZN$/, '')
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

/**
 * Interpola dinamicamente as variáveis de prestação no template escolhido
 */
function interpolateTemplate(rawTemplate) {
  if (!rawTemplate) return ''
  const inst = props.installmentData || {}
  const rawName = props.customerName || inst.customerName || 'Cliente'
  // Usa o primeiro nome ou até 2 palavras para não esgotar SMS
  const nomeCurto = rawName.split(' ').slice(0, 2).join(' ')

  const parcela = inst.installmentOrder ? String(inst.installmentOrder).replace(/[ºª]/g, '') : '1'
  const valor = moneyText(inst.installment)
  const data = formatDate(inst.dueDate)
  const mora = moneyText(inst.lateFee || 0)
  const total = moneyText(inst.totalToPay || (Number(inst.installment || 0) + Number(inst.lateFee || 0)))
  const dias = String(inst.daysOverdue > 0 ? inst.daysOverdue : (inst.daysUntilDue > 0 ? inst.daysUntilDue : 0))
  const empresa = companyName.value

  return rawTemplate
    .replace(/\{nome\}/g, nomeCurto)
    .replace(/\{prestacao\}/g, parcela)
    .replace(/\{parcela\}/g, parcela)
    .replace(/\{valor\}/g, valor)
    .replace(/\{data\}/g, data)
    .replace(/\{mora\}/g, mora)
    .replace(/\{total\}/g, total)
    .replace(/\{dias\}/g, dias)
    .replace(/\{empresa\}/g, empresa)
}

function onTemplateChange(key) {
  if (key === 'custom') {
    return
  }
  const tmpl = templates[key]
  if (tmpl) {
    form.value.message = interpolateTemplate(tmpl.template)
  }
}

// Determina automaticamente o melhor template consoante a situação da parcela
function pickBestTemplate(inst) {
  if (!inst) return 'overdue_1'
  if (inst.status === 1) return 'receipt'
  if (inst.daysOverdue > 30) return 'overdue_3'
  if (inst.daysOverdue > 15) return 'overdue_2'
  if (inst.daysOverdue > 0) return 'overdue_1'
  if (inst.daysUntilDue === 0) return 'due_today'
  return 'preventive'
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    channel.value = props.channel || 'sms'
    form.value.phone = props.phone || ''

    if (props.initialMessage) {
      selectedTemplate.value = 'custom'
      form.value.message = props.initialMessage
    } else {
      const best = pickBestTemplate(props.installmentData)
      selectedTemplate.value = best
      onTemplateChange(best)
    }
  },
  { immediate: true }
)

function close() {
  show.value = false
  form.value = { phone: '', message: '' }
  selectedTemplate.value = 'overdue_1'
}

/**
 * Envio directo via WhatsApp Web/App (abre URL wa.me com mensagem preenchida)
 */
function openWhatsAppDirect() {
  const digits = String(form.value.phone || '').replace(/\D/g, '')
  if (!digits) {
    $q.notify({ type: 'warning', message: 'Indique um número de telefone válido.', position: 'top' })
    return
  }
  const fullPhone = digits.startsWith('258') ? digits : `258${digits}`
  const encodedText = encodeURIComponent(form.value.message)
  const url = `https://wa.me/${fullPhone}?text=${encodedText}`
  window.open(url, '_blank')
  emit('sent', { channel: 'whatsapp', phone: fullPhone })
  close()
}

/**
 * Envio através do Gateway BulkSMS da instituição
 */
async function sendSms() {
  if (!form.value.phone || !form.value.message) {
    $q.notify({ type: 'warning', message: 'Preencha o número de telefone e o texto do SMS.', position: 'top' })
    return
  }

  if (smsBlocked.value) {
    $q.notify({
      type: 'warning',
      message: 'O envio de SMS está desactivado nas configurações da empresa.',
      position: 'top'
    })
    return
  }

  sending.value = true
  try {
    const companyId = authStore.companyId
    const digits = String(form.value.phone).replace(/\D/g, '')
    const normalizedPhone = digits.startsWith('258') ? `+${digits}` : `+258${digits}`

    const payload = {
      companyId,
      receipient: normalizedPhone,
      accountNumber: props.accountNumber || null,
      smsBody: form.value.message,
      sender: companyName.value
    }

    const { data } = await api.post('/api/sendSms', payload)
    if (data.success) {
      $q.notify({
        type: 'positive',
        message: 'SMS enfileirado com sucesso para envio ao mutuário',
        position: 'top'
      })
      emit('sent', { channel: 'sms', phone: normalizedPhone })
      close()
    } else {
      throw new Error(data.message || 'Falha ao processar envio')
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || err.message || 'Erro ao enviar SMS',
      position: 'top'
    })
  } finally {
    sending.value = false
  }
}
</script>

<style lang="scss" scoped>
.send-message-card {
  background: #ffffff;
}

.modal-header {
  background: #0f5132;
  border-radius: 14px 14px 0 0;
}

.channel-btn {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;

  &.channel-active {
    background: #0f5132;
    color: #ffffff;
    border-color: #0f5132;
  }

  &.channel-active-wa {
    background: #15803d;
    color: #ffffff;
    border-color: #15803d;
  }
}

.preview-box {
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.preview-text {
  font-size: 12.5px;
  line-height: 1.45;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.border-green {
  border: 1px solid #86efac;
}

.border-amber {
  border: 1px solid #fcd34d;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

body.body--dark {
  .send-message-card {
    background: #162032;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .modal-header {
    background: #0b1329;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .channel-btn {
    background: #1e293b;
    color: #94a3b8;
    border-color: #334155;

    &.channel-active {
      background: #047857;
      color: #ffffff;
      border-color: #059669;
    }

    &.channel-active-wa {
      background: #15803d;
      color: #ffffff;
      border-color: #16a34a;
    }
  }

  .preview-box {
    background: #0f172a;
    border-color: #334155;
  }

  .preview-text {
    color: #f1f5f9;
  }
}
</style>
