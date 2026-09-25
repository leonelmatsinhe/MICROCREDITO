<template>
  <div class="q-pa-md">
    <!-- SKELETONS -->
    <template v-if="store.loading && !store.customer">
      <q-skeleton type="rect" height="90px" class="q-mb-md" style="border-radius: 12px" />
      <div class="row q-gutter-md">
        <q-skeleton v-for="i in 4" :key="i" type="rect" height="110px" class="col" style="border-radius: 12px" />
      </div>
      <q-skeleton type="rect" height="220px" class="q-mt-md" style="border-radius: 12px" />
    </template>

    <template v-else-if="store.customer">
      <!-- KPIs -->
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6 col-md-3" v-for="kpi in kpis" :key="kpi.label">
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section>
              <div class="row items-center no-wrap">
                <q-avatar :style="{ background: kpi.bg, color: kpi.color }" size="40px" class="q-mr-sm">
                  <q-icon :name="kpi.icon" size="20px" />
                </q-avatar>
                <div>
                  <div class="text-caption text-grey-5" style="font-size: 10px">{{ kpi.label }}</div>
                  <div class="text-weight-bold" :style="{ color: kpi.color, fontSize: '15px' }">{{ kpi.value }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Progresso do financiamento activo -->
      <q-card flat bordered class="q-mt-md" style="border-radius: 12px" v-if="store.activeLoan">
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle2 text-weight-bold">
              <q-icon name="timeline" size="16px" class="q-mr-xs" />
              Progresso do financiamento #{{ store.activeLoan.id }}
            </div>
            <q-space />
            <div class="text-caption text-grey-6">
              {{ store.paidInstallments.length }} de {{ store.installments.length }} prestações
            </div>
          </div>
          <q-linear-progress
            :value="store.activeLoanProgress"
            rounded
            size="14px"
            :color="store.activeLoanProgress >= 1 ? 'positive' : 'primary'"
            track-color="grey-3"
          >
            <div class="absolute-full flex flex-center">
              <q-badge color="white" text-color="primary" :label="`${Math.round(store.activeLoanProgress * 100)}%`" />
            </div>
          </q-linear-progress>
        </q-card-section>
      </q-card>

      <!-- Timeline do histórico -->
      <q-card flat bordered class="q-mt-md" style="border-radius: 12px">
        <q-card-section>
          <div class="text-subtitle2 text-weight-bold q-mb-md">
            <q-icon name="history" size="16px" class="q-mr-xs" />
            Histórico do mutuário
          </div>
          <q-timeline v-if="store.timelineEvents.length > 0" color="primary" layout="dense" side="right">
            <q-timeline-entry
              v-for="event in store.timelineEvents.slice(0, 10)"
              :key="event.id"
              :title="event.title"
              :subtitle="event.subtitle"
              :icon="event.icon"
              :color="event.color"
            >
              <div class="text-caption text-grey-6">{{ formatDate(event.date) }}</div>
            </q-timeline-entry>
          </q-timeline>
          <div v-else class="text-center q-pa-lg text-grey-5">
            <q-icon name="hourglass_empty" size="40px" />
            <div class="text-caption q-mt-sm">Sem histórico registado.</div>
          </div>
        </q-card-section>
      </q-card>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMutuarioStore } from '@/stores/mutuario'
import { formatMoney, formatDateShort } from '@/utils/formatters'

const store = useMutuarioStore()

const kpis = computed(() => [
  { label: 'Total Financiado', value: formatMoney(store.totalFinanciado), icon: 'account_balance_wallet', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
  { label: 'Total Pago', value: formatMoney(store.totalPago), icon: 'check_circle', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { label: 'Saldo Remanescente', value: formatMoney(store.saldoRemanescente), icon: 'savings', color: store.saldoRemanescente > 0 ? '#ef4444' : '#10b981', bg: store.saldoRemanescente > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' },
  { label: 'Próximo Vencimento', value: store.proximoVencimento ? formatDateShort(store.proximoVencimento) : '—', icon: 'event', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
])

function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString('pt-MZ') : ''
}
</script>
