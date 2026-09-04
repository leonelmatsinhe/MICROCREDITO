<template>
  <q-card
    v-if="showIndicator"
    flat
    bordered
    class="sms-queue-indicator q-mb-md cursor-pointer"
    style="border-radius: 12px"
    @click="goToQueue"
  >
    <!-- SMS desactivado -->
    <q-card-section v-if="!summary.smsEnabled" class="row items-center no-wrap">
      <q-avatar size="36px" color="grey-6" text-color="white">
        <q-icon name="sms_failed" size="20px" />
      </q-avatar>
      <div class="col q-ml-sm">
        <div class="text-subtitle2 text-weight-bold">Envio de SMS desactivado</div>
        <div class="text-caption text-grey-6">
          {{ summary.pending > 0 ? `${summary.pending} mensagem(ns) em espera na fila. ` : '' }}Active nas Configurações → Dados da Empresa para os envios saírem.
        </div>
      </div>
      <q-btn flat round dense icon="chevron_right" color="grey-6" />
    </q-card-section>

    <!-- Com pendentes -->
    <q-card-section v-else class="row items-center no-wrap">
      <q-avatar :color="summary.failed > 0 ? 'negative' : 'orange'" text-color="white">
        <q-icon name="mark_email_unread" size="20px" />
      </q-avatar>
      <div class="col q-ml-sm">
        <div class="row items-center no-wrap">
          <div class="text-subtitle2 text-weight-bold">{{ summary.pending }} SMS na fila</div>
          <q-chip v-if="summary.queued > 0" size="xs" dense color="orange" text-color="white" class="q-ml-xs">
            {{ summary.queued }} a aguardar
          </q-chip>
          <q-chip v-if="summary.failed > 0" size="xs" dense color="negative" text-color="white" class="q-ml-xs">
            {{ summary.failed }} falhada(s)
          </q-chip>
        </div>
        <div class="text-caption text-grey-6">
          À espera de saldo Tsemba — enviadas automaticamente quando houver saldo.
        </div>
      </div>
      <q-btn
        unelevated
        color="primary"
        icon="send"
        label="Processar agora"
        no-caps
        rounded
        size="sm"
        :loading="processing"
        @click.stop="processNow"
        class="q-mr-sm"
      />
      <q-btn flat round dense icon="chevron_right" color="grey-6" />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const summary = ref({ smsEnabled: true, queued: 0, processing: 0, failed: 0, sent: 0, pending: 0, pendingByType: {} })
const processing = ref(false)
let timer = null

const showIndicator = computed(() => {
  return !summary.value.smsEnabled || summary.value.pending > 0
})

function goToQueue() {
  router.push('/sms/pendentes')
}

async function fetchSummary() {
  try {
    const companyId = authStore.companyId
    if (!companyId) return
    const { data } = await api.get('/api/sms-gateway/summary', { params: { companyId } })
    if (data?.success) {
      summary.value = data.result
    }
  } catch (e) {
    // silencioso — o indicador apenas não aparece em caso de erro
  }
}

async function processNow() {
  processing.value = true
  try {
    const companyId = authStore.companyId
    const { data } = await api.post('/api/sms-gateway/process', { companyId })
    const s = data?.result || data?.summary || {}
    $q.notify({
      type: 'positive',
      message: `Fila processada: ${s.sent || 0} enviada(s), ${s.deferred || 0} aguardando saldo.`,
      position: 'top'
    })
    await fetchSummary()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao processar a fila', position: 'top' })
  } finally {
    processing.value = false
  }
}

onMounted(() => {
  fetchSummary()
  timer = setInterval(fetchSummary, 60000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>
