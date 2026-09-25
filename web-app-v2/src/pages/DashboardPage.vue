<template>
  <q-page class="dashboard-page q-pa-md">
    <!-- ═══════ FILTROS ═══════ -->
    <div class="glass-wrap q-mb-md">
      <FiltersBar @filter="onFilter" @clear="onClear" @sync="onSync" />
    </div>

    <!-- ═══════ CARREGAMENTO ═══════ -->
    <div v-if="loading && !summary" class="text-center q-pa-xl">
      <q-spinner-dots size="42px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar KPIs das carteiras...</div>
    </div>

    <template v-else>
      <!-- ═══════ SECÇÃO 0: RESUMO GERAL DAS CARTEIRAS ═══════ -->
      <div class="row q-col-gutter-md q-mb-md">
        <div v-for="kpi in generalKpis" :key="kpi.label" class="col-12 col-sm-6 col-lg-3">
          <q-card flat rounded-borders-xl class="kpi-card kpi-hover" :class="`kpi-${kpi.tone}`">
            <q-card-section class="q-pa-md q-pb-sm">
              <div class="row items-start no-wrap">
                <div class="kpi-icon q-mr-md"><q-icon :name="kpi.icon" size="22px" color="white" /></div>
                <div class="col" style="min-width: 0">
                  <div class="row items-center no-wrap q-mb-xs">
                    <div class="kpi-title col-grow">{{ kpi.label }}</div>
                    <q-chip
                      v-if="kpi.trend !== null && kpi.trend !== undefined"
                      dense
                      :color="kpi.trend >= 0 ? 'green-2' : 'red-2'"
                      :text-color="kpi.trend >= 0 ? 'green-10' : 'red-8'"
                      class="kpi-trend"
                    >
                      {{ kpi.trend >= 0 ? '↑' : '↓' }} {{ Math.abs(kpi.trend).toFixed(1) }}% vs mês anterior
                    </q-chip>
                  </div>
                  <div class="kpi-amount">{{ money(kpi.value) }}</div>
                  <div class="kpi-sub">{{ kpi.sub }}</div>
                </div>
              </div>
            </q-card-section>
            <q-linear-progress
              :value="kpi.progress"
              rounded
              size="3px"
              color="white"
              track-color="transparent"
              class="kpi-progress"
            />
          </q-card>
        </div>
      </div>

      <!-- ═══════ SECÇÃO 1: CARTEIRAS DE FINANCIAMENTO ═══════ -->
      <q-card flat class="section-card q-mb-md">
        <q-card-section class="row items-center q-py-sm">
          <q-icon name="savings" size="22px" color="primary" class="q-mr-sm" />
          <div class="col">
            <div class="text-subtitle2 text-weight-bold">Carteiras de Financiamento</div>
            <div class="text-caption text-grey-6">
              Valores analíticos por fundo/parceiro. O dinheiro real está na conta de desembolso
              (<strong>{{ money(saldoRealDisponivel) }}</strong> disponível).
            </div>
          </div>
          <q-btn unelevated dense no-caps color="green-9" icon="tune" label="Gerir carteiras" to="/financiamento" rounded class="q-px-md" />
        </q-card-section>
        <q-separator />

        <q-card-section class="q-py-md">
          <div v-if="wallets.length === 0" class="text-center text-grey-6 q-pa-lg">
            <q-icon name="savings" size="42px" color="grey-4" />
            <div class="q-mt-sm">Nenhuma carteira de financiamento activa.</div>
            <q-btn flat dense no-caps color="primary" label="Criar carteira" to="/financiamento" class="q-mt-sm" />
          </div>

          <div v-else class="row q-col-gutter-md">
            <div v-for="w in wallets" :key="w.id" class="col-12 col-md-6">
              <div class="wallet-tile" :style="{ borderLeft: `4px solid ${walletColor(w)}` }">
                <div class="row items-center no-wrap q-mb-sm">
                  <q-badge :color="w.cor_badge || 'blue'" :label="w.codigo" class="q-mr-sm" />
                  <div class="col ellipsis text-caption text-weight-bold">{{ w.parceiro_nome || w.nome }}</div>
                  <q-badge
                    v-if="w.taxa_juro !== null"
                    outline color="deep-purple"
                    :label="`${(Number(w.taxa_juro) * 100).toFixed(1)}%`"
                    style="font-size: 9px"
                  />
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-4">
                    <div class="kpi-label">Alocado</div>
                    <div class="kpi-mini">{{ w.allocated_amount === null ? 'Sem limite' : money(w.allocated_amount) }}</div>
                  </div>
                  <div class="col-4">
                    <div class="kpi-label">Desembolsado</div>
                    <div class="kpi-mini text-primary">{{ money(w.disbursed) }}</div>
                  </div>
                  <div class="col-4">
                    <div class="kpi-label">Disponível</div>
                    <div class="kpi-mini" :class="Number(w.saldo_analitico) > 0 ? 'text-positive' : 'text-grey-7'">
                      {{ w.saldo_analitico === null ? 'Sem limite' : money(w.saldo_analitico) }}
                    </div>
                  </div>
                </div>

                <q-linear-progress
                  v-if="w.allocated_amount !== null"
                  :value="Number(w.utilizacao) || 0"
                  rounded size="6px" class="q-mt-sm"
                  :color="barColor(w)" track-color="grey-3"
                />

                <div class="row q-col-gutter-sm q-mt-sm">
                  <div class="col-4">
                    <div class="kpi-label">Créditos</div>
                    <div class="kpi-mini">{{ Number(w.num_creditos) || 0 }}</div>
                  </div>
                  <div class="col-4">
                    <div class="kpi-label">Reembolsados</div>
                    <div class="kpi-mini">{{ Number(w.prestacoes_pagas) || 0 }}/{{ Number(w.prestacoes_total) || 0 }}</div>
                  </div>
                  <div class="col-4">
                    <div class="kpi-label">Taxa média</div>
                    <div class="kpi-mini">{{ w.taxa_media === null ? '—' : `${(Number(w.taxa_media) * 100).toFixed(1)}%` }}</div>
                  </div>
                  <div class="col-6 col-sm-3">
                    <div class="kpi-label">Juros gerados</div>
                    <div class="kpi-mini">{{ money(w.juros_gerados) }}</div>
                  </div>
                  <div class="col-6 col-sm-3">
                    <div class="kpi-label">Juros recebidos</div>
                    <div class="kpi-mini text-positive">{{ money(w.total_juros_recebidos) }}</div>
                  </div>
                  <div class="col-6 col-sm-3">
                    <div class="kpi-label">Previsão de lucro</div>
                    <div class="kpi-mini text-deep-purple">{{ money(w.previsao_lucro) }}</div>
                  </div>
                  <div class="col-6 col-sm-3">
                    <div class="kpi-label">Saldo a receber</div>
                    <div class="kpi-mini text-deep-orange">{{ money(w.saldo_a_receber) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- ═══════ SECÇÃO 2: GRÁFICOS POR CARTEIRA ═══════ -->
      <div class="q-mb-md">
        <WalletsCharts :meses="seriesMeses" :por-carteira="seriesCarteiras" />
      </div>

      <!-- ═══════ SECÇÃO 3: PRÓXIMAS PRESTAÇÕES ═══════ -->
      <UpcomingTable :items="upcomingInstallments" />
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { useWalletsStore } from '@/stores/wallets'
import FiltersBar from '@/components/ui/FiltersBar.vue'
import WalletsCharts from '@/components/charts/WalletsCharts.vue'
import UpcomingTable from '@/components/ui/UpcomingTable.vue'

/**
 * PAINEL DE CONTROLO — 100% orientado às CARTEIRAS DE FINANCIAMENTO.
 * Os KPIs legados (créditos processados, total desembolsado mês-caixa,
 * pendente/rejeitado, total com juros, total reembolsado mês-caixa, saldo em
 * bancos real) foram removidos: agora tudo vive dentro das carteiras e o
 * consolidado aparece apenas como resumo das carteiras.
 */
const $q = useQuasar()
const authStore = useAuthStore()
const dashboardStore = useDashboardStore()
const walletsStore = useWalletsStore()

const loading = computed(() => walletsStore.loading)
const wallets = computed(() => walletsStore.wallets)
const summary = computed(() => walletsStore.walletDashboard?.summary || walletsStore.summary || null)
const saldoRealDisponivel = computed(() => Number(walletsStore.saldoReal?.available) || 0)
const seriesMeses = computed(() => walletsStore.series?.meses || [])
const seriesCarteiras = computed(() => walletsStore.series?.porCarteira || [])
const upcomingInstallments = computed(() => dashboardStore.upcomingInstallments)

const money = (value) =>
  `${(Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`

// Cor real da carteira (cor_badge é um nome de cor Quasar — resolver para hex)
const quasarColors = {
    blue: '#1976d2', indigo: '#3f51b5', 'deep-purple': '#673ab7', teal: '#009688',  green: '#21ba45', lime: '#cddc39', amber: '#f2c037', orange: '#f37b26',
    red: '#c10015', pink: '#e91e63', cyan: '#00bcd4', brown: '#795548',
    grey: '#9e9e9e', 'blue-grey': '#546e7a', purple: '#9c27b0', primary: '#0f7a4d'
}

const walletColor = (w) => quasarColors[w.cor_badge] || '#1976d2'

const barColor = (wallet) => {
  const used = Number(wallet.utilizacao) || 0
  if (used >= 1) return 'negative'
  if (used >= 0.85) return 'orange'
  return 'positive'
}

/**
 * Trend (%) do último mês completo vs anterior, a partir da série mensal
 * (desembolsos + recebimentos). Sem inventar dados: se não houver 2 meses
 * com valor, devolve null (chip não é mostrado).
 */
const kpiTrend = computed(() => {
  const rows = seriesCarteiras.value || []
  const labels = seriesMeses.value || []
  if (!labels.length || rows.length === 0) return null
  const lastIdx = labels.length - 1
  const sumAt = (key, idx) => rows.reduce((acc, r) => acc + (Number(r?.[key]?.[idx]) || 0), 0)
  const current = sumAt('desembolsos', lastIdx) + sumAt('recebimentos', lastIdx)
  const previous = sumAt('desembolsos', lastIdx - 1) + sumAt('recebimentos', lastIdx - 1)
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
})

const generalKpis = computed(() => {
  const s = summary.value || {}
  const alocado = Number(s.capital_alocado) || 0
  const desembolsado = Number(s.total_desembolsado) || 0
  const recebido = Number(s.total_recebimentos) || 0
  const saldo = saldoRealDisponivel.value
  const maxBase = Math.max(alocado, desembolsado, recebido, saldo, 1)
  const trend = kpiTrend.value
  return [
    {
      label: 'Capital alocado (analítico)',
      value: s.capital_alocado,
      sub: `${Number(s.com_capital_alocado) || 0} carteira(s) com limite definido`,
      icon: 'account_balance',
      tone: 'blue',
      progress: Math.min(alocado / maxBase, 1),
      trend: trend === null ? null : Number(trend.toFixed(1))
    },
    {
      label: 'Desembolsado (todas as carteiras)',
      value: s.total_desembolsado,
      sub: `${Number(s.num_creditos) || 0} crédito(s) · ${Number(s.num_clientes) || 0} cliente(s)`,
      icon: 'arrow_upward',
      tone: 'indigo',
      progress: Math.min(desembolsado / maxBase, 1),
      trend: trend === null ? null : Number(trend.toFixed(1))
    },
    {
      label: 'Reembolsado (todas as carteiras)',
      value: s.total_recebimentos,
      sub: `Juros ${money(s.total_juros_recebidos)} · mora ${money(s.total_mora_recebida)}`,
      icon: 'arrow_downward',
      tone: 'green',
      progress: Math.min(recebido / maxBase, 1),
      trend: null
    },
    {
      label: 'Saldo real para desembolsos',
      value: saldoRealDisponivel.value,
      sub: `${Number(s.contas_desembolso) || 0} conta(s) DESEMBOLSO/MISTO`,
      icon: 'account_balance_wallet',
      tone: 'amber',
      progress: Math.min(saldo / maxBase, 1),
      trend: null
    }
  ]
})

async function loadDashboard(filters = {}) {
  const companyId = authStore.companyId
  if (!companyId) return
  const months = monthsForFilter(filters)
  // KPIs/charts por carteira (fonte principal do painel)
  await walletsStore.fetchWalletDashboard(companyId, months)
  // Prestações a vencer (agenda) — mantém-se do endpoint de dashboard
  await dashboardStore.fetchDashboard(companyId, filters)
}

/** Janela de meses do gráfico conforme o filtro rápido escolhido. */
function monthsForFilter(filters) {
  if (filters.quickFilter === 'today') return 3
  if (filters.quickFilter === 'week') return 3
  if (filters.quickFilter === 'year') return 12
  return 12
}

function onFilter(filters) {
  loadDashboard(filters)
}

function onClear() {
  loadDashboard()
}

function onSync() {
  loadDashboard()
  $q.notify({ type: 'info', message: 'Dados sincronizados', position: 'top' })
}

onMounted(() => {
  loadDashboard()
  if (authStore.companyId) {
    walletsStore.fetchWallets(authStore.companyId).catch(() => {})
  }
})
</script>

<style lang="scss" scoped>
.dashboard-page {
  background: #f6f8fb;
  min-height: calc(100vh - 100px);
}

.glass-wrap {
  :deep(.filter-card) {
    border-radius: 18px !important;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(15, 23, 42, 0.06) !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    margin-bottom: 0 !important;
  }
}

/* ── KPI cards com gradiente ── */
.kpi-card {
  border-radius: 18px;
  color: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  border: none;
  overflow: hidden;
  position: relative;
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &.kpi-blue { background: linear-gradient(135deg, #1d4ed8, #3b82f6); }
  &.kpi-indigo { background: linear-gradient(135deg, #4338ca, #6366f1); }
  &.kpi-green { background: linear-gradient(135deg, #15803d, #22c55e); }
  &.kpi-amber { background: linear-gradient(135deg, #b45309, #f59e0b); }

  &.kpi-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.22);
  }

  &::after {
    content: '';
    position: absolute;
    right: -30px;
    top: -30px;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
  }
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.85;
}

.kpi-amount {
  font-size: 21px;
  font-weight: 800;
  line-height: 1.2;
}

.kpi-sub {
  font-size: 11px;
  opacity: 0.82;
}

.kpi-trend {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  flex-shrink: 0;
}

.kpi-progress {
  display: block;
}

/* ── Secção carteiras ── */
.section-card {
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.wallet-tile {
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.02);
  border: 1px solid rgba(15, 23, 42, 0.05);
  height: 100%;
  transition: box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  }
}

.kpi-label {
  font-size: 10px;
  color: $grey-6;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.kpi-mini {
  font-size: 12px;
  font-weight: 700;
}

body.body--dark {
  .dashboard-page { background: #141a24; }
  .glass-wrap :deep(.filter-card) { background: rgba(30, 41, 59, 0.7); border-color: rgba(255, 255, 255, 0.06) !important; }
  .section-card { background: $gray-800; border-color: $gray-700; }
  .wallet-tile { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
}
</style>
