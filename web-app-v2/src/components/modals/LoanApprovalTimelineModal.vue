<template>
  <q-dialog v-model="show">
    <q-card style="min-width: 520px; max-width: 720px; border-radius: 16px">
      <q-card-section class="bg-primary text-white row items-center" style="border-radius: 16px 16px 0 0">
        <div>
          <div class="text-h6">Linha do Tempo de Aprovação</div>
          <div class="text-caption">
            Crédito #{{ loan?.id }} · {{ formatMoney(loan?.amount) }} MZN
            <span v-if="stateLabel"> · {{ stateLabel }}</span>
          </div>
        </div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pa-md" style="max-height: 65vh; overflow-y: auto">
        <div v-if="loading" class="text-center q-pa-lg">
          <q-spinner-dots color="primary" size="40px" />
        </div>

        <div v-else-if="events.length === 0" class="text-center q-pa-lg text-grey-6">
          <q-icon name="history" size="40px" class="q-mb-sm" />
          <div>Sem eventos registados para este crédito.</div>
        </div>

        <q-timeline v-else color="primary" style="padding: 0 8px">
          <q-timeline-entry
            v-for="event in events"
            :key="event.id"
            :title="eventTitle(event)"
            :subtitle="eventSubtitle(event)"
            :icon="eventIcon(event.event)"
            :color="eventColor(event.event)"
            :side="eventSide(event)"
          >
            <div v-if="event.notes" class="text-body2 text-grey-8">
              <q-icon name="format_quote" size="16px" class="q-mr-xs" />{{ event.notes }}
            </div>
            <div v-if="event.amount != null" class="text-caption text-grey-6">
              Montante do crédito: {{ formatMoney(event.amount) }} MZN
            </div>
          </q-timeline-entry>
        </q-timeline>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Fechar" color="primary" no-caps v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '@/boot/axios'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  loan: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue'])

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const events = ref([])
const stateLabel = ref('')

const EVENT_COLORS = {
  CRIACAO: 'grey-7',
  SUBMISSAO: 'blue-8',
  APROVACAO: 'green-8',
  REPROVACAO: 'red-8',
  REABERTURA: 'orange-8',
  PREPARACAO_DESEMBOLSO: 'indigo-6',
  DESEMBOLSO: 'teal-7',
  INVALIDACAO_DESEMBOLSO: 'red-8'
}

const EVENT_ICONS = {
  CRIACAO: 'note_add',
  SUBMISSAO: 'send',
  APROVACAO: 'how_to_vote',
  REPROVACAO: 'block',
  REABERTURA: 'restart_alt',
  PREPARACAO_DESEMBOLSO: 'event_available',
  DESEMBOLSO: 'payments',
  INVALIDACAO_DESEMBOLSO: 'undo'
}

const eventColor = (type) => EVENT_COLORS[type] || 'grey-7'
const eventIcon = (type) => EVENT_ICONS[type] || 'circle'

function eventTitle(event) {
  if (event.event === 'APROVACAO' && event.approvalsCount && event.requiredApprovals) {
    return `${event.eventLabel} — ${event.approvalsCount} de ${event.requiredApprovals}`
  }
  return event.eventLabel || event.event
}

function eventSubtitle(event) {
  const who = event.actorName || 'Sistema'
  const role = event.actorRole ? ` · ${event.actorRole}` : ''
  const when = event.createdAt ? formatDateTime(event.createdAt) : ''
  return `${who}${role} · ${when}`
}

function eventSide(event) {
  return event.event === 'APROVACAO' ? 'left' : 'right'
}

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return String(value)
  }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function fetchTimeline() {
  if (!props.loan?.id) return
  loading.value = true
  try {
    const { data } = await api.get(`/api/loan/${props.loan.id}/approval-timeline`)
    events.value = Array.isArray(data?.result) ? data.result : []
    stateLabel.value = data?.approvalStateLabel || ''
  } catch (e) {
    console.error('Erro ao carregar linha do tempo:', e)
    events.value = []
  } finally {
    loading.value = false
  }
}

watch(show, (val) => {
  if (val) fetchTimeline()
})
</script>
