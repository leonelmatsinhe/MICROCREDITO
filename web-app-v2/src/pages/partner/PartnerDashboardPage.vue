<template>
  <div class="q-pa-md partner-page">
    <!-- Filtros de período -->
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="row q-col-gutter-sm items-center q-py-sm">
        <div class="col-12 col-md-3">
          <div class="text-subtitle2 text-weight-bold">
            Painel da carteira
            <q-badge v-if="wallet" :color="wallet.cor_badge || 'blue'" class="q-ml-sm" :label="wallet.codigo" />
          </div>
          <div class="text-caption text-grey-6">{{ wallet?.nome || '—' }}</div>
        </div>
        <div class="col-6 col-md-2">
          <q-input v-model="from" dense outlined type="date" label="De" @update:model-value="load" />
        </div>
        <div class="col-6 col-md-2">
          <q-input v-model="to" dense outlined type="date" label="Até" @update:model-value="load" />
        </div>
        <div class="col-auto q-gutter-xs no-wrap">
          <q-btn flat round dense icon="filter_list_off" color="grey" @click="clearPeriod">
            <q-tooltip>Limpar período</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="refresh" color="primary" :loading="loading" @click="load">
            <q-tooltip>Actualizar</q-tooltip>
          </q-btn>
        </div>
      </q-card-section>
    </q-card>

    <div v-if="loading && !kpis" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-6 q-mt-sm">A carregar a sua carteira...</div>
    </div>

    <template v-else-if="kpis">
      <!-- Capital: alocado / desembolsado / disponível -->
      <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section>
          <div class="row q-col-gutter-md items-center">
            <div class="col-12 col-md-4">
              <div class="text-caption text-grey-6">Capital alocado pelo financiador</div>
              <div class="text-h5 text-weight-bold text-primary">{{ money(kpis.capital_alocado, 'Sem limite definido') }}</div>
            </div>
            <div class="col-12 col-md-4">
              <div class="text-caption text-grey-6">Total desembolsado</div>
              <div class="text-h5 text-weight-bold">{{ money(kpis.desembolsado) }}</div>
            </div>
            <div class="col-12 col-md-4">
              <div class="text-caption text-grey-6">Saldo analítico disponível</div>
              <div class="text-h5 text-weight-bold" :class="Number(kpis.saldo_analitico) > 0 ? 'text-positive' : 'text-grey-7'">
                {{ money(kpis.saldo_analitico, 'Sem limite') }}
              </div>
            </div>
          </div>
          <q-linear-progress
            v-if="kpis.capital_alocado !== null"
            :value="Number(kpis.utilizacao) || 0"
            rounded
            size="10px"
            :color="progressColor"
            track-color="grey-3"
            class="q-mt-md"
          />
          <div v-if="kpis.capital_alocado !== null" class="text-caption text-grey-6 q-mt-xs">
            Utilização do capital: <strong>{{ ((Number(kpis.utilizacao) || 0) * 100).toFixed(1) }}%</strong>
          </div>
        </q-card-section>
      </q-card>

      <!-- KPIs -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-6 col-md-3">
          <KpiCard label="Recebimentos (total)" :value="kpis.recebimentos" icon="payments" avatarColor="positive" format="money" valueColor="text-positive" :secondary-text="`Capital: ${money(kpis.capital_recebido)}`" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <KpiCard label="Juros recebidos" :value="kpis.juros_recebidos" icon="percent" avatarColor="teal" format="money" valueColor="text-positive" :secondary-text="`Pendentes: ${money(kpis.juros_pendentes)}`" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <KpiCard label="Mora gerada" :value="kpis.mora_gerada" icon="warning_amber" avatarColor="orange" format="money" valueColor="text-warning" :secondary-text="`Recebida: ${money(kpis.mora_recebida)}`" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <KpiCard label="Mora pendente" :value="kpis.mora_pendente" icon="report_problem" avatarColor="red" format="money" valueColor="text-negative" :secondary-text="`${kpis.prestacoes_atraso || 0} prestação(ões) em atraso`" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <KpiCard label="Créditos desembolsados" :value="kpis.num_creditos" icon="account_balance_wallet" avatarColor="blue" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <KpiCard label="Clientes financiados" :value="kpis.num_clientes" icon="people" avatarColor="indigo" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <KpiCard label="Prestações pagas" :value="kpis.prestacoes_pagas" icon="task_alt" avatarColor="green" :secondary-text="`Total: ${kpis.prestacoes_total || 0}`" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <KpiCard label="Prestações pendentes" :value="kpis.prestacoes_pendentes" icon="schedule" avatarColor="amber" :secondary-text="`Em atraso: ${kpis.prestacoes_atraso || 0}`" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <KpiCard label="Saldo a receber dos clientes" :value="kpis.saldo_a_receber" icon="request_quote" avatarColor="deep-purple" format="money" valueColor="text-warning" secondary-text="Capital + juros por receber" />
        </div>
      </div>

      <!-- Período pedido -->
      <div v-if="from || to" class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-6">
          <KpiCard label="Desembolsado no período" :value="kpis.desembolsado_periodo || 0" icon="south_west" avatarColor="deep-orange" format="money" />
        </div>
        <div class="col-12 col-sm-6">
          <KpiCard label="Recebido no período" :value="kpis.recebido_periodo || 0" icon="north_east" avatarColor="green" format="money" valueColor="text-positive" />
        </div>
      </div>

      <!-- Evolução mensal -->
      <BarChart
        v-if="series.labels.length > 0"
        title="Desembolsos vs. recebimentos (mensal)"
        :labels="series.labels"
        :disbursed="series.disbursed"
        :payments="series.received"
        class="q-mb-md"
      />
      <q-card v-else flat bordered style="border-radius: 12px">
        <q-card-section class="text-center text-grey-6">
          <q-icon name="insights" size="36px" color="grey-4" />
          <div class="q-mt-sm">Ainda não existem desembolsos nem recebimentos nesta carteira.</div>
          <div class="text-caption">Os valores aparecem aqui assim que a MBRM classificar créditos financiados por este fundo.</div>
        </q-card-section>
      </q-card>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import KpiCard from '@/components/ui/KpiCard.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { useWalletsStore } from '@/stores/wallets'

const $q = useQuasar()
const walletsStore = useWalletsStore()

const from = ref('')
const to = ref('')

const loading = computed(() => walletsStore.loadingPartner)
const data = computed(() => walletsStore.partnerDashboard)
const wallet = computed(() => data.value?.carteira || null)
const kpis = computed(() => data.value?.kpis || null)

const series = computed(() => {
  const rows = data.value?.serie_mensal || []
  return {
    labels: rows.map((r) => monthLabel(r.mes)),
    disbursed: rows.map((r) => Number(r.desembolsado) || 0),
    received: rows.map((r) => Number(r.recebido) || 0)
  }
})

const progressColor = computed(() => {
  const used = Number(kpis.value?.utilizacao) || 0
  if (used >= 1) return 'negative'
  if (used >= 0.85) return 'orange'
  return 'positive'
})

function monthLabel(mes) {
  const [year, month] = String(mes).split('-')
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${names[Number(month) - 1] || month}/${String(year).slice(2)}`
}

function money(value, fallback = '0,00 MT') {
  if (value === null || value === undefined) return fallback
  return `${(Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
}

function clearPeriod() {
  from.value = ''
  to.value = ''
  load()
}

async function load() {
  try {
    await walletsStore.fetchPartnerDashboard({
      from: from.value || undefined,
      to: to.value || undefined
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar o painel', position: 'top' })
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.partner-page {
  background: #f8fafc;
  min-height: calc(100vh - 60px);
}
</style>
