<template>
  <q-dialog v-model="show">
    <q-card style="min-width: 520px; max-width: 720px; border-radius: 16px">
      <q-card-section class="bg-primary text-white row items-center" style="border-radius: 16px 16px 0 0">
        <div>
          <div class="text-h6">Histórico de Cobrança</div>
          <div class="text-caption">{{ customer?.customerName }} · Conta {{ customer?.accountNumber }}</div>
        </div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <q-card-section style="max-height: 60vh; overflow-y: auto">
        <div v-if="loading" class="text-center q-pa-lg"><q-spinner-dots color="primary" size="40px" /></div>
        <div v-else-if="activities.length === 0" class="text-center q-pa-lg text-grey-6">
          Sem atividades registadas para este cliente.
        </div>
        <q-timeline v-else color="primary" style="padding: 0 8px">
          <q-timeline-entry
            v-for="item in activities"
            :key="item.id"
            :title="item.activityLabel"
            :subtitle="`${item.createdByName || '—'} · ${formatDateTime(item.activityDate)}`"
            :icon="activityIcon(item.activityType)"
            :color="activityColor(item.activityType)"
          >
            <div v-if="item.promisedDate" class="text-body2">
              Prometeu pagar <strong>{{ formatMoney(item.promisedAmount) }} MZN</strong> até
              <strong>{{ formatDate(item.promisedDate) }}</strong>
              <q-badge v-if="item.status" class="q-ml-sm" :color="item.status === 'PENDENTE' ? 'orange-8' : 'grey-6'" text-color="white" rounded>
                {{ item.status }}
              </q-badge>
            </div>
            <div v-if="item.notes" class="text-body2 text-grey-8">{{ item.notes }}</div>
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
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'

/**
 * Histórico de cobrança de um cliente (visita, ligação, promessa, recusa) —
 * a prova auditável de quem fez o quê e quando. Usado na página Cobrança e na
 * carteira do gestor.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  customer: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activities = ref([])
const loading = ref(false)

const ACTIVITY_ICONS = {
  VISITA_DOMICILIAR: 'home',
  LIGACAO_TELEFONICA: 'call',
  PROMESSA_PAGAMENTO: 'handshake',
  RECUSA: 'block'
}
const ACTIVITY_COLORS = {
  VISITA_DOMICILIAR: 'teal-7',
  LIGACAO_TELEFONICA: 'blue-8',
  PROMESSA_PAGAMENTO: 'green-8',
  RECUSA: 'red-8'
}
const activityIcon = (type) => ACTIVITY_ICONS[type] || 'circle'
const activityColor = (type) => ACTIVITY_COLORS[type] || 'grey-7'

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return String(value)
  }
}

function formatDate(value) {
  try {
    return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('pt-PT')
  } catch {
    return String(value)
  }
}

async function load() {
  const accountNumber = props.customer?.accountNumber
  if (!accountNumber) return
  loading.value = true
  activities.value = []
  try {
    const { data } = await api.get('/api/collection/activities', { params: { accountNumber } })
    activities.value = Array.isArray(data?.result) ? data.result : []
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar o histórico', position: 'top' })
  } finally {
    loading.value = false
  }
}

watch(show, (val) => {
  if (val) load()
})
</script>
