<template>
  <q-card flat bordered class="chart-card">
    <q-card-section>
      <div class="row items-center q-mb-sm">
        <div class="text-subtitle1 text-weight-bold">{{ title }}</div>
        <q-space />
        <div class="row items-center q-gutter-sm" style="font-size: 11px">
          <div class="row items-center">
            <span style="width: 10px; height: 10px; border-radius: 2px; background: #3B82F6; display: inline-block; margin-right: 4px"></span>
            <span class="text-grey-6">Desembolsado</span>
          </div>
          <div class="row items-center">
            <span style="width: 10px; height: 10px; border-radius: 2px; background: #059669; display: inline-block; margin-right: 4px"></span>
            <span class="text-grey-6">Recebido</span>
          </div>
        </div>
      </div>
      <div class="chart-container">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  title: { type: String, default: 'Comparativo Mensal' },
  labels: {
    type: Array,
    default: () => ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  },
  disbursed: { type: Array, default: () => [] },
  payments: { type: Array, default: () => [] }
})

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: 'Desembolsado',
      data: props.disbursed,
      backgroundColor: '#3B82F6',
      borderRadius: 4,
      barPercentage: 0.6,
      categoryPercentage: 0.8
    },
    {
      label: 'Recebido',
      data: props.payments,
      backgroundColor: '#059669',
      borderRadius: 4,
      barPercentage: 0.6,
      categoryPercentage: 0.8
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1F2937',
      titleFont: { size: 12 },
      bodyFont: { size: 11 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('pt-MZ')} MT`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 }, color: '#6B7280' }
    },
    y: {
      grid: { color: '#F3F4F6' },
      ticks: {
        font: { size: 11 },
        color: '#6B7280',
        callback: (val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.chart-card {
  border-radius: 12px;
  border: 1px solid $gray-200;
}

.chart-container {
  height: 220px;
  position: relative;
}

body.body--dark .chart-card {
  background-color: $gray-800;
  border-color: $gray-700;
}
</style>
