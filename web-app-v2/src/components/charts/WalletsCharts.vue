<template>
  <div class="row q-col-gutter-md">
    <!-- 1. Desembolsado vs Recebido por carteira -->
    <div class="col-12 col-lg-6">
      <q-card flat class="chart-card">
        <q-card-section class="q-pb-none">
          <div class="row items-center">
            <div class="col">
              <div class="text-subtitle2 text-weight-bold">Desembolsado vs Recebido por carteira</div>
              <div class="text-caption text-grey-6">Fundos/parceiros — período analisado + base histórica</div>
            </div>
            <div class="row items-center q-gutter-sm" style="font-size: 11px">
              <span class="legend-dot" style="background: #2563eb" /> <span class="text-grey-6">Desembolsado</span>
              <span class="legend-dot" style="background: #16a34a" /> <span class="text-grey-6">Recebido</span>
              <template v-if="temHistorico">
                <span class="legend-dot" style="background: #94a3b8" /> <span class="text-grey-6">Histórico</span>
              </template>
            </div>
          </div>
        </q-card-section>
        <q-card-section>
          <div class="chart-box"><Bar :data="barsData" :options="barsOptions" /></div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 2. Evolução mensal por carteira -->
    <div class="col-12 col-lg-6">
      <q-card flat class="chart-card">
        <q-card-section class="q-pb-none">
          <div class="row items-center">
            <div class="col">
              <div class="text-subtitle2 text-weight-bold">Evolução mensal por carteira</div>
              <div class="text-caption text-grey-6">Últimos {{ meses.length }} meses</div>
            </div>
            <q-btn-toggle
              v-model="seriesMode"
              dense
              no-caps
              rounded
              toggle-color="primary"
              :options="[
                { label: 'Desembolsos', value: 'desembolsos' },
                { label: 'Recebimentos', value: 'recebimentos' }
              ]"
            />
          </div>
        </q-card-section>
        <q-card-section>
          <div class="chart-box"><Line :data="linesData" :options="linesOptions" /></div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 3. Peso de cada carteira nos desembolsos -->
    <div class="col-12 col-lg-5">
      <q-card flat class="chart-card">
        <q-card-section class="q-pb-none">
          <div class="text-subtitle2 text-weight-bold">Peso de cada carteira</div>
          <div class="text-caption text-grey-6">% do total desembolsado (acumulado)</div>
        </q-card-section>
        <q-card-section>
          <div class="chart-box chart-box-doughnut">
            <Doughnut :data="doughnutData" :options="doughnutOptions" />
          </div>
          <div class="q-mt-sm">
            <div v-for="item in doughnutLegend" :key="item.codigo" class="row items-center q-mb-xs">
              <span class="legend-dot q-mr-sm" :style="{ background: item.color }" />
              <div class="col text-caption">{{ item.codigo }}</div>
              <div class="text-caption text-weight-bold">{{ item.percent }}%</div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Ranking rápido -->
    <div class="col-12 col-lg-7">
      <q-card flat class="chart-card">
        <q-card-section class="q-pb-none">
          <div class="text-subtitle2 text-weight-bold">Resumo por carteira</div>
          <div class="text-caption text-grey-6">Capital analítico, movimento e lucro previsto</div>
        </q-card-section>
        <q-card-section class="q-pt-sm">
          <div v-if="porCarteira.length === 0" class="text-center text-grey-6 q-pa-lg">
            <q-icon name="insights" size="38px" color="grey-4" />
            <div class="q-mt-sm">Sem carteiras de financiamento activas</div>
          </div>
          <div v-else class="q-gutter-y-sm">
            <div v-for="row in ranking" :key="row.codigo" class="rank-row">
              <q-badge :color="row.corBadge" :label="row.codigo" />
              <div class="col q-mx-sm" style="min-width: 0">
                <div class="text-caption ellipsis">{{ row.nome }}</div>
                <q-linear-progress
                  :value="row.percent / 100"
                  size="5px" rounded
                  :color="row.corBadge"
                  track-color="grey-3"
                  class="q-mt-xs"
                />
              </div>
              <div class="text-right" style="min-width: 120px">
                <div class="text-caption text-weight-bold">{{ money(row.desembolsado) }}</div>
                <div class="text-caption text-grey-6">{{ row.percent }}% do total</div>
              </div>
              <div class="text-right q-ml-md" style="min-width: 110px">
                <div class="text-caption text-weight-bold text-positive">{{ money(row.recebido) }}</div>
                <div class="text-caption text-grey-6">recebido</div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Bar, Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
)

/**
 * GRÁFICOS DO PAINEL — sempre por CARTEIRA de financiamento.
 *  1. barras agrupadas (desembolsado vs recebido por carteira);
 *  2. linhas mensais (desembolsos ou recebimentos, uma série por carteira);
 *  3. doughnut com o peso de cada carteira no total desembolsado.
 */
const props = defineProps({
  meses: { type: Array, default: () => [] },
  porCarteira: { type: Array, default: () => [] }
})

const seriesMode = ref('desembolsos')

const BADGE_COLORS = {
  blue: '#2563eb',
  orange: '#f97316',
  'deep-orange': '#ea580c',
  green: '#16a34a',
  grey: '#64748b',
  purple: '#7c3aed',
  teal: '#0d9488',
  brown: '#92400e',
  pink: '#db2777',
  cyan: '#0891b2'
}

const colorOf = (row) => BADGE_COLORS[row?.cor] || BADGE_COLORS.blue

// Desembolso ACUMULADO da carteira: base analítica histórica + créditos do
// período em análise. É o valor que aparece nos cartões e no KPI do painel.
const desembolsadoDe = (row) => (Number(row?.total_desembolsado) || 0) + (Number(row?.historico) || 0)
const recebidoDe = (row) => Number(row?.total_recebido) || 0
const temHistorico = computed(() => props.porCarteira.some((row) => (Number(row.historico) || 0) > 0))

const monthLabels = computed(() =>
  props.meses.map((mes) => {
    const [ano, mesNumero] = String(mes).split('-')
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${nomes[Number(mesNumero) - 1] || mesNumero}/${String(ano).slice(2)}`
  })
)

const formatMZN = (value) =>
  `${(Number(value) || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`
const money = (value) => formatMZN(value)

const barsData = computed(() => ({
  labels: props.porCarteira.map((row) => row.codigo),
  datasets: [
    {
      label: 'Desembolsado',
      data: props.porCarteira.map((row) => Number(row.total_desembolsado) || 0),
      backgroundColor: '#2563eb',
      borderRadius: 6,
      barPercentage: 0.7,
      categoryPercentage: 0.7
    },
    {
      label: 'Recebido',
      data: props.porCarteira.map((row) => recebidoDe(row)),
      backgroundColor: '#16a34a',
      borderRadius: 6,
      barPercentage: 0.7,
      categoryPercentage: 0.7
    },
    {
      label: 'Histórico (anterior ao sistema)',
      data: props.porCarteira.map((row) => Number(row.historico) || 0),
      backgroundColor: '#94a3b8',
      borderRadius: 6,
      barPercentage: 0.7,
      categoryPercentage: 0.7
    }
  ]
}))

const linesData = computed(() => ({
  labels: monthLabels.value,
  datasets: props.porCarteira.map((row) => ({
    label: row.codigo,
    data: (seriesMode.value === 'juros' ? row.juros : row[seriesMode.value]) || [],
    borderColor: colorOf(row),
    backgroundColor: `${colorOf(row)}22`,
    pointBackgroundColor: colorOf(row),
    pointRadius: 3,
    borderWidth: 2,
    tension: 0.35,
    fill: false
  }))
}))

const doughnutLegend = computed(() => {
  const total = props.porCarteira.reduce((sum, row) => sum + desembolsadoDe(row), 0)
  return props.porCarteira.map((row) => ({
    codigo: row.codigo,
    color: colorOf(row),
    percent: total > 0 ? Math.round((desembolsadoDe(row) / total) * 1000) / 10 : 0
  }))
})

const doughnutData = computed(() => ({
  labels: props.porCarteira.map((row) => row.codigo),
  datasets: [
    {
      data: props.porCarteira.map((row) => desembolsadoDe(row)),
      backgroundColor: props.porCarteira.map((row) => colorOf(row)),
      borderWidth: 0,
      hoverOffset: 6
    }
  ]
}))

const coinTooltip = {
  backgroundColor: '#0f172a',
  titleFont: { size: 12 },
  bodyFont: { size: 11 },
  padding: 10,
  cornerRadius: 10,
  callbacks: {
    label: (ctx) => `${ctx.dataset.label || ctx.label}: ${formatMZN(ctx.parsed.y ?? ctx.parsed)}`
  }
}

const barsOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: coinTooltip },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b' } },
    y: {
      grid: { color: '#f1f5f9' },
      ticks: {
        font: { size: 11 },
        color: '#64748b',
        callback: (value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value)
      }
    }
  }
}

const linesOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, usePointStyle: true } },
    tooltip: coinTooltip
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b' } },
    y: {
      grid: { color: '#f1f5f9' },
      ticks: {
        font: { size: 11 },
        color: '#64748b',
        callback: (value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value)
      }
    }
  }
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: { display: false },
    tooltip: {
      ...coinTooltip,
      callbacks: {
        label: (ctx) => `${ctx.label}: ${formatMZN(ctx.parsed)}`
      }
    }
  }
}

const ranking = computed(() => {
  const total = props.porCarteira.reduce((sum, row) => sum + desembolsadoDe(row), 0)
  return [...props.porCarteira]
    .sort((a, b) => desembolsadoDe(b) - desembolsadoDe(a))
    .map((row) => ({
      ...row,
      desembolsado: desembolsadoDe(row),
      recebido: recebidoDe(row),
      corBadge: row.cor || 'blue',
      percent: total > 0 ? Math.round((desembolsadoDe(row) / total) * 1000) / 10 : 0
    }))
})
</script>

<style lang="scss" scoped>
.chart-card {
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  height: 100%;
}

.chart-box {
  height: 250px;
  position: relative;
}

.chart-box-doughnut {
  height: 210px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.rank-row {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.02);
}

body.body--dark {
  .chart-card { background: $gray-800; border-color: $gray-700; }
  .rank-row { background: rgba(255, 255, 255, 0.04); }
}
</style>
