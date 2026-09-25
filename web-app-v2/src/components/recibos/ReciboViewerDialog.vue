<template>
  <q-dialog v-model="open" maximized transition-show="fade" transition-hide="fade">
    <q-card class="viewer-card column no-wrap">
      <!-- ═══════ BARRA DE FERRAMENTAS ═══════ -->
      <q-card-section class="viewer-toolbar row items-center q-py-sm q-px-md no-wrap">
        <div class="toolbar-icon q-mr-sm"><q-icon name="receipt_long" size="18px" color="white" /></div>
        <div class="col" style="min-width: 0">
          <div class="text-subtitle2 text-weight-bold ellipsis">
            Recibo {{ recibo?.numero || '' }}
          </div>
          <div class="text-caption text-grey-6 ellipsis">
            {{ recibo?.customer_name || 'Mutuário' }} ·
            {{ money(recibo?.valor_pago) }} ·
            {{ recibo?.wallet_nome || 'sem carteira atribuída' }}
          </div>
        </div>

        <q-btn dense flat no-caps icon="download" label="Descarregar" class="q-mr-xs" @click="download" />
        <q-btn dense flat no-caps icon="print" label="Imprimir" class="q-mr-xs" @click="print" />
        <q-btn dense flat no-caps icon="autorenew" label="Re-imprimir" class="q-mr-xs" :loading="reprinting" @click="reimprimir">
          <q-tooltip>
            Volta a gerar o PDF com o layout actual — mantém o número, o hash e a
            sequência legal do recibo
          </q-tooltip>
        </q-btn>
        <q-btn dense flat no-caps icon="mail" label="E-mail" class="q-mr-xs" :loading="sending" @click="emailDialog = true" />
        <q-btn dense flat no-caps icon="chat" label="WhatsApp" class="q-mr-xs" @click="whatsapp" />
        <q-btn
          dense
          no-caps
          unelevated
          rounded
          color="primary"
          icon="verified"
          label="Validar QR"
          @click="validate"
        >
          <q-tooltip>Confirma o hash e o código de validação do recibo</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="close" color="grey-7" class="q-ml-sm" @click="open = false" />
      </q-card-section>

      <!-- ═══════ FAIXA DO SELO ELECTRÓNICO ═══════ -->
      <q-card-section class="seal-bar row items-center q-py-xs q-px-md no-wrap">
        <q-icon name="verified_user" size="14px" color="primary" class="q-mr-xs" />
        <div class="text-caption text-grey-8 ellipsis" style="font-family: monospace">
          Hash AT: {{ recibo?.hash_at ? `${recibo.hash_at.slice(0, 40)}…` : 'a gerar…' }}
        </div>
        <q-space />
        <div class="text-caption text-grey-8 q-mr-md" style="font-family: monospace">
          {{ recibo?.at_validation_code || '' }}
        </div>
        <q-badge outline color="primary" :label="recibo?.software_certification || 'MBRM v2.0 Cert AT 2026/001'" />
      </q-card-section>

      <!-- ═══════ VISUALIZADOR PDF ═══════ -->
      <q-separator />
      <q-card-section class="col q-pa-none viewer-body">
        <iframe
          v-if="previewUrl"
          :src="previewUrl"
          class="viewer-frame"
          title="Recibo em PDF"
        />
        <div v-else class="full-height row flex-center">
          <q-spinner-dots size="42px" color="primary" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>

  <!-- ═══════ DIALOG: ENVIAR POR E-MAIL ═══════ -->
  <q-dialog v-model="emailDialog" persistent>
    <q-card style="width: 420px; max-width: 95vw; border-radius: 18px">
      <q-card-section class="row items-center">
        <q-icon name="mail" size="20px" class="q-mr-sm" color="primary" />
        <div class="text-h6">Enviar recibo por e-mail</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="emailDialog = false" />
      </q-card-section>
      <q-card-section>
        <q-input
          v-model="emailTo"
          dense
          outlined
          label="E-mail destinatário *"
          type="email"
          :rules="[(v) => /.+@.+\..+/.test(v) || 'E-mail inválido']"
        >
          <template v-slot:prepend><q-icon name="alternate_email" size="16px" /></template>
        </q-input>
        <div class="text-caption text-grey-6 q-mt-sm">
          O PDF segue em anexo, com o link de validação do hash.
        </div>
      </q-card-section>
      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat no-caps label="Cancelar" color="grey" @click="emailDialog = false" />
        <q-btn unelevated no-caps rounded color="primary" label="Enviar" :loading="sending" @click="sendEmail" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'

/**
 * VISUALIZADOR DE RECIBO — pré-visualização do PDF com acções de partilha.
 * As acções dependem do recibo já emitido (id + hash + número); o PDF é
 * servido pelo backend, por isso não há ficheiros locais a gerir.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  recibo: { type: Object, default: null },
  // Permite reutilizar o visualizador noutros contextos (ex.: portal do
  // financiador) onde o endpoint do PDF é diferente.
  pdfUrl: { type: String, default: '' },
  emailEndpoint: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const emailDialog = ref(false)
const emailTo = ref('')
const sending = ref(false)
const reprinting = ref(false)
// Quando ligado, todos os pedidos do PDF levam `?regenerate=1` — o recibo é
// re-impresso com o layout actual, sem consumir nova numeração sequencial.
const reimpresso = ref(false)
const previewUrl = ref('')

const money = (value) =>
  `${(Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`

const pdfEndpoint = () => {
  const base = props.pdfUrl || (props.recibo?.id ? `/api/recibos/${props.recibo.id}/pdf` : '')
  if (!base || !reimpresso.value) return base
  return base.includes('?') ? `${base}&regenerate=1` : `${base}?regenerate=1`
}

/**
 * Pré-visualização em blob: o pedido do PDF passa pelo axios (leva o token de
 * sessão), ao contrário de um <iframe src="/api/...">, que iria sem cabeçalho.
 */
async function loadPreview() {
  const endpoint = pdfEndpoint()
  if (!endpoint) return
  try {
    const blob = await fetchPdfBlob()
    if (previewUrl.value) window.URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = window.URL.createObjectURL(blob)
  } catch {
    previewUrl.value = ''
    $q.notify({ type: 'negative', message: 'Não foi possível abrir o recibo', position: 'top' })
  }
}

// Watch separado por campo (e não um array): um array devolvido pelo getter
// tem sempre identidade nova, o que repetia o pedido do PDF a cada render.
watch(() => props.modelValue, (aberto) => aberto && preparar())
watch(
  () => props.recibo?.id,
  (id) => {
    if (id && props.modelValue) preparar()
  }
)

function preparar() {
  if (!props.recibo?.id) return
  // Cada recibo abre no seu estado original (sem re-impressão pendente).
  reimpresso.value = false
  emailTo.value = props.recibo?.customer_email || props.recibo?.email || ''
  loadPreview()
}

onMounted(() => {
  if (props.modelValue) preparar()
})

async function fetchPdfBlob() {
  const response = await api.get(pdfEndpoint(), { responseType: 'blob' })
  return new Blob([response.data], { type: 'application/pdf' })
}

/**
 * Re-impressão: pede ao backend o PDF gerado com o layout actual. O recibo
 * mantém o número, o hash e a sequência AT — só o documento é reescrito.
 */
async function reimprimir() {
  if (!props.recibo?.id) return
  reprinting.value = true
  try {
    reimpresso.value = true
    await loadPreview()
    $q.notify({
      type: 'positive',
      message: `Recibo ${props.recibo.numero || ''} re-impresso com o layout actual`.trim(),
      position: 'top'
    })
  } finally {
    reprinting.value = false
  }
}

async function download() {
  if (!props.recibo?.id) return
  try {
    const blob = await fetchPdfBlob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Recibo-${props.recibo.numero}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 30000)
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível descarregar o recibo', position: 'top' })
  }
}

/** Impressão via Blob (o iframe de PDF não é controlável por JS). */
async function print() {
  try {
    const blob = await fetchPdfBlob()
    const url = window.URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    setTimeout(() => {
      try { win?.focus(); win?.print() } catch { /* o utilizador imprime manualmente */ }
    }, 900)
    setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível imprimir o recibo', position: 'top' })
  }
}

async function sendEmail() {
  if (!props.recibo?.id) return
  if (!/.+@.+\..+/.test(emailTo.value)) {
    $q.notify({ type: 'warning', message: 'Indique um e-mail válido', position: 'top' })
    return
  }
  sending.value = true
  try {
    const endpoint = props.emailEndpoint || `/api/recibos/${props.recibo.id}/enviar`
    const { data } = await api.post(endpoint, { email: emailTo.value })
    $q.notify({
      type: data?.success === false ? 'negative' : 'positive',
      message: data?.message || 'Recibo enviado',
      position: 'top'
    })
    if (data?.success !== false) emailDialog.value = false
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao enviar o recibo por e-mail',
      position: 'top'
    })
  } finally {
    sending.value = false
  }
}

/** WhatsApp: envia o link de validação (o PDF segue pelo e-mail/junto). */
function whatsapp() {
  const numero = String(props.recibo?.customer_phone || '').replace(/\D/g, '')
  const link = validationLink.value
  const texto = `Recibo ${props.recibo?.numero} — ${money(props.recibo?.valor_pago)}. Valide a autenticidade em ${link}`
  const base = numero ? `https://wa.me/${numero}` : 'https://wa.me/'
  window.open(`${base}?text=${encodeURIComponent(texto)}`, '_blank')
}

const validationLink = computed(() => {
  const numero = props.recibo?.numero || ''
  const hash = props.recibo?.hash_at || ''
  if (!numero) return ''
  return `${window.location.origin}/validar?rec=${encodeURIComponent(numero)}&hash=${encodeURIComponent(hash)}`
})

function validate() {
  window.open(validationLink.value, '_blank')
}
</script>

<style lang="scss" scoped>
.viewer-card {
  background: #f1f5f9;
  border-radius: 0;
}

.viewer-toolbar {
  background: #ffffff;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.toolbar-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $primary, #16a34a);
  flex-shrink: 0;
}

.seal-bar {
  background: rgba(15, 107, 47, 0.06);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.viewer-body {
  overflow: hidden;
}

.viewer-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.full-height {
  height: 100%;
  min-height: 320px;
}
</style>
