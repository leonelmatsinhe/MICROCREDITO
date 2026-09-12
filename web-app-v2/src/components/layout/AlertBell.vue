<template>
  <!-- Sino de alertas operacionais (navbar) — dropdown como o menu de notificações -->
  <q-btn flat round dense size="sm" text-color="white" :icon="bellIcon">
    <q-badge v-if="alertsStore.totalAlerts > 0" color="negative" floating dot :class="{ 'pulse-badge': alertsStore.hasCritical }" />
    <q-badge
      v-if="alertsStore.totalAlerts > 0"
      color="negative"
      floating
      style="top: 2px; right: 0px; font-size: 9px"
    >
      {{ alertsStore.totalAlerts > 9 ? '9+' : alertsStore.totalAlerts }}
    </q-badge>
    <q-tooltip>{{ tooltipLabel }}</q-tooltip>

    <!-- ═══════════ DROPDOWN DE ALERTAS ═══════════ -->
    <q-menu fit anchor="bottom left" self="top middle" style="max-width: 95vw">
      <q-list style="min-width: 380px; max-width: 440px; max-height: 480px">
        <!-- Cabeçalho -->
        <q-item-label header class="row items-center">
          <q-icon :name="bellIcon" size="20px" :class="headerIconClass" class="q-mr-xs" />
          <span class="text-weight-bold">Alertas do Sistema</span>
          <q-space />
          <q-btn
            flat
            dense
            round
            size="sm"
            icon="refresh"
            color="grey-7"
            :loading="alertsStore.fetching"
            @click="alertsStore.fetchAll()"
          >
            <q-tooltip>Actualizar</q-tooltip>
          </q-btn>
        </q-item-label>
        <q-item-label caption class="q-px-md q-pb-xs" style="font-size: 10px; margin-top: -6px">
          Situações operacionais que exigem atenção · verificação a cada minuto
          <span v-if="alertsStore.fetchedAt"> · {{ formatTime(alertsStore.fetchedAt) }}</span>
        </q-item-label>
        <q-separator />

        <!-- Sem alertas: tudo verde -->
        <div v-if="alertsStore.totalAlerts === 0" class="text-center q-pa-lg">
          <q-icon name="verified" size="44px" color="positive" />
          <div class="text-subtitle2 text-weight-bold q-mt-sm">Tudo em ordem</div>
          <div class="text-caption text-grey-5">Nenhum alerta operacional activo.</div>
        </div>

        <!-- Cartões de alerta (itens da lista) -->
        <q-item
          v-for="alert in alertsStore.alerts"
          :key="alert.id"
          class="alert-item q-py-sm"
          :class="alertItemClass(alert)"
          tag="div"
        >
          <q-item-section avatar>
            <q-avatar size="34px" :color="severityColor(alert.severity)" text-color="white">
              <q-icon :name="alert.icon" size="18px" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="row items-center no-wrap">
              <span class="text-weight-medium" style="font-size: 13px">{{ alert.title }}</span>
              <q-chip v-if="alert.severity === 'critical'" size="xs" dense color="negative" text-color="white" class="q-ml-xs">
                urgente
              </q-chip>
            </q-item-label>
            <q-item-label caption style="font-size: 11px; line-height: 1.45; white-space: normal">
              {{ alert.message }}
            </q-item-label>

            <!-- Acções do alerta -->
            <q-item-label class="q-mt-xs">
              <q-btn
                v-for="action in alert.actions"
                :key="action.key"
                size="xs"
                no-caps
                unelevated
                class="q-mr-xs q-mt-xs"
                :outline="action.key === 'refresh'"
                :color="actionColor(action.key)"
                :icon="action.icon"
                :label="action.label"
                :loading="action.key === 'process' && processing"
                @click.stop="runAction(action.key)"
              />
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAlertsStore } from '@/stores/alerts'
import { format } from 'date-fns'

/**
 * ALERT BELL — sino de alertas operacionais no navbar.
 *  - Ícone warning_amber quando há alertas (badge vermelho com contagem);
 *  - dropdown (q-menu) no estilo do menu de notificações — não é modal;
 *  - cada alerta é um item com avatar colorido, severidade e acções directas
 *    (processar fila, ir à fila, configurações, actualizar).
 */
const router = useRouter()
const $q = useQuasar()
const alertsStore = useAlertsStore()

const processing = ref(false)

const bellIcon = computed(() => {
  if (alertsStore.totalAlerts === 0) return 'notifications_none'
  // Só alertas informativos (ex.: portal fora de expediente) → lua em vez de aviso
  const onlyInfo = alertsStore.alerts.every(a => a.severity === 'info')
  return onlyInfo ? 'nightlight' : 'warning_amber'
})

const tooltipLabel = computed(() =>
  alertsStore.totalAlerts === 0
    ? 'Alertas do sistema — tudo em ordem'
    : `${alertsStore.totalAlerts} alerta(s) operacional(is) activo(s)`
)

// Cor do ícone no cabeçalho do dropdown conforme a severidade dominante
const headerIconClass = computed(() => {
  if (alertsStore.hasCritical) return 'text-negative'
  if (alertsStore.hasPortalAlert) return 'text-purple'
  return 'text-orange'
})

function formatTime(value) {
  try {
    return format(new Date(value), 'HH:mm:ss')
  } catch { return '—' }
}

// Cores por severidade (critical=vermelho, warning=laranja, info=roxo)
function severityColor(severity) {
  switch (severity) {
    case 'critical': return 'negative'
    case 'info': return 'purple'
    default: return 'orange'
  }
}

function alertItemClass(alert) {
  switch (alert.severity) {
    case 'critical': return 'bg-red-1'
    case 'info': return 'bg-purple-1'
    default: return 'bg-orange-1'
  }
}

function actionColor(key) {
  switch (key) {
    case 'process': return 'primary'
    case 'go-queue': return 'blue-grey'
    case 'go-settings': return 'blue-grey'
    case 'go-caixa': return 'purple'
    default: return 'grey-7'
  }
}

/**
 * Acções do dropdown:
 *  - refresh: re-consulta o resumo;
 *  - process: processa a fila de SMS imediatamente;
 *  - go-queue / go-settings: navegação (fecha o menu implicitamente).
 */
async function runAction(key) {
  switch (key) {
    case 'refresh':
      await alertsStore.fetchAll()
      break
    case 'process':
      processing.value = true
      try {
        const result = await alertsStore.processQueue()
        $q.notify({
          type: 'positive',
          message: `Fila processada: ${result.sent || 0} enviada(s), ${result.deferred || 0} aguardando saldo.`,
          position: 'top'
        })
      } catch (e) {
        $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao processar a fila', position: 'top' })
      } finally {
        processing.value = false
      }
      break
    case 'go-queue':
      router.push('/sms/pendentes')
      break
    case 'go-settings':
      router.push('/settings')
      break
    case 'go-caixa':
      // Portal fora de expediente → reconciliar no Caixa Central
      router.push('/caixa-central')
      break
    case 'dismiss-portal':
      // Ignorar nesta sessão — reaparece só se chegar novo pagamento
      alertsStore.dismissPortalAlert()
      break
  }
}

onMounted(() => {
  // Sino respeita o polling central da store (60 s), evitando chamadas duplicadas.
  alertsStore.startPolling()
})

onBeforeUnmount(() => {
  // O layout só desmonta no logout — parar o polling aqui evita chamadas
  // com token expirado depois de sair.
  alertsStore.stopPolling()
})
</script>

<style lang="scss" scoped>
/* Badge piscante quando existe alerta crítico */
.pulse-badge {
  animation: pulse-red 1.6s ease-in-out infinite;
}
@keyframes pulse-red {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(1.25); }
}

/* Mensagem com quebra de linha normal (captions truncam por defeito no q-item) */
.alert-item .q-item__label--caption {
  white-space: normal;
}
</style>
