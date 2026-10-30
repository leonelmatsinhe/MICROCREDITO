<template>
  <q-page class="dashboard-page q-pa-md">
    <!-- ═══════ BARRA DE FILTROS ═══════ -->
    <div class="glass-wrap q-mb-md" data-tour="dash-filters">
      <FiltersBar
        v-model="filter"
        :loading="loading"
        @apply="onApplyFilter"
        @refresh="onSync"
      />
    </div>

    <!-- ═══════ CARREGAMENTO ═══════ -->
    <div v-if="loading && !dashboardStore.hasData" class="text-center q-pa-xl">
      <q-spinner-dots size="48px" color="primary" />
      <div class="text-caption text-grey-6 q-mt-sm">A carregar métricas consolidadas da carteira...</div>
    </div>

    <template v-else>
      <!-- ═══════ ZONA 1: 5 KPIS MESTRES OPERACIONAIS (PADRÃO BANCÁRIO) ═══════ -->
      <div class="row q-col-gutter-sm q-mb-md" data-tour="dash-kpis">
        <!-- KPI 1: CARTEIRA ACTIVA BRUTA (GLP) -->
        <div class="col-12 col-sm-6 col-lg">
          <q-card flat class="kpi-box kpi-box-blue">
            <q-card-section class="q-pa-sm">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="kpi-tag">Carteira Activa Bruta (GLP)</span>
                <q-avatar size="28px" class="bg-blue-1 text-blue-9" icon="account_balance_wallet" />
              </div>
              <div class="kpi-main-val text-blue-10">{{ money(portfolio.outstandingPortfolio) }}</div>
              <div class="kpi-sub-text">
                <q-icon name="check_circle" size="13px" color="blue-7" class="q-mr-xs" />
                <span>{{ portfolio.activeLoansCount }} créditos · {{ portfolio.activeBorrowersCount }} mutuários</span>
              </div>
              <q-separator class="q-my-xs opacity-50" />
              <div class="kpi-footer-text">
                Contratado: {{ money(portfolio.totalContractedWithInterest) }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- KPI 2: PORTFÓLIO EM RISCO (PAR30) -->
        <div class="col-12 col-sm-6 col-lg">
          <q-card flat class="kpi-box" :class="parBoxClass">
            <q-card-section class="q-pa-sm">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="kpi-tag">Portfólio em Risco (PAR30)</span>
                <q-avatar size="28px" :class="parAvatarClass" icon="gpp_bad" />
              </div>
              <div class="row items-baseline no-wrap">
                <div class="kpi-main-val" :class="parTextClass">{{ delinquency.par30Rate.toFixed(1) }}%</div>
                <q-badge :color="parBadgeColor" rounded class="q-ml-xs text-bold" style="font-size: 10px">
                  {{ parBadgeLabel }}
                </q-badge>
              </div>
              <div class="kpi-sub-text">
                <q-icon name="warning" size="13px" color="orange-8" class="q-mr-xs" />
                <span>Atraso global: {{ delinquency.overdueRate.toFixed(1) }}% ({{ money(delinquency.overdueAmount) }})</span>
              </div>
              <q-separator class="q-my-xs opacity-50" />
              <div class="kpi-footer-text">
                Créditos c/ atraso: {{ delinquency.overdueLoansCount }} de {{ portfolio.activeLoansCount }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- KPI 3: DESEMBOLSOS DO PERÍODO -->
        <div class="col-12 col-sm-6 col-lg">
          <q-card flat class="kpi-box kpi-box-purple">
            <q-card-section class="q-pa-sm">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="kpi-tag">Desembolsos do Período</span>
                <q-avatar size="28px" class="bg-purple-1 text-purple-9" icon="payments" />
              </div>
              <div class="kpi-main-val text-purple-10">{{ money(movement.disbursedAmount) }}</div>
              <div class="kpi-sub-text">
                <q-icon name="handshake" size="13px" color="purple-7" class="q-mr-xs" />
                <span>{{ movement.disbursedCount }} crédito(s) concedido(s)</span>
              </div>
              <q-separator class="q-my-xs opacity-50" />
              <div class="kpi-footer-text ellipsis">
                {{ periodLabel }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- KPI 4: REEMBOLSOS & COBRANÇA -->
        <div class="col-12 col-sm-6 col-lg">
          <q-card flat class="kpi-box kpi-box-green">
            <q-card-section class="q-pa-sm">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="kpi-tag">Reembolsos & Cobrança</span>
                <q-avatar size="28px" class="bg-green-1 text-green-9" icon="savings" />
              </div>
              <div class="kpi-main-val text-green-10">{{ money(movement.collectedAmount) }}</div>
              <div class="kpi-sub-text">
                <q-icon name="receipt_long" size="13px" color="green-7" class="q-mr-xs" />
                <span>{{ movement.paymentsCount }} pagamentos · Mora: {{ money(movement.moraCollected) }}</span>
              </div>
              <q-separator class="q-my-xs opacity-50" />
              <div class="kpi-footer-text">
                Eficácia de Cobrança: <strong>{{ movement.collectionEfficiencyRate.toFixed(1) }}%</strong>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- KPI 5: LIQUIDEZ REAL PARA DESEMBOLSOS -->
        <div class="col-12 col-sm-6 col-lg">
          <q-card flat class="kpi-box kpi-box-amber">
            <q-card-section class="q-pa-sm">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="kpi-tag">Liquidez para Desembolso</span>
                <q-avatar size="28px" class="bg-amber-1 text-amber-9" icon="account_balance" />
              </div>
              <div class="kpi-main-val text-amber-10">{{ money(liquidity.availableForDisbursement) }}</div>
              <div class="kpi-sub-text">
                <q-icon name="assured_workload" size="13px" color="amber-8" class="q-mr-xs" />
                <span>{{ liquidity.disbursementAccountsCount }} conta(s) autorizada(s)</span>
              </div>
              <q-separator class="q-my-xs opacity-50" />
              <div class="kpi-footer-text">
                Tesouraria total: {{ money(liquidity.totalTreasury) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- ═══════ ZONA 2: FUNIL OPERACIONAL & PIPELINE DE CRÉDITO ═══════ -->
      <div class="row q-col-gutter-sm q-mb-md" data-tour="dash-pipeline">
        <!-- 1. Pedidos Pendentes -->
        <div class="col-6 col-md-3">
          <q-card flat class="pipeline-card pipeline-pending cursor-pointer" @click="$router.push('/creditos?status=0')">
            <div class="row items-center no-wrap">
              <div class="pipeline-num">{{ pipeline.pendingRequestsCount }}</div>
              <div class="col q-ml-sm" style="min-width: 0">
                <div class="pipeline-title">Pedidos em Análise</div>
                <div class="pipeline-val">{{ money(pipeline.pendingRequestsAmount) }}</div>
              </div>
              <q-btn flat round dense size="sm" icon="chevron_right" color="blue-8" />
            </div>
          </q-card>
        </div>

        <!-- 2. Aprovados a Aguardar Desembolso -->
        <div class="col-6 col-md-3">
          <q-card flat class="pipeline-card pipeline-approved cursor-pointer" @click="$router.push('/creditos')">
            <div class="row items-center no-wrap">
              <div class="pipeline-num">{{ pipeline.approvedWaitingDisbursementCount }}</div>
              <div class="col q-ml-sm" style="min-width: 0">
                <div class="pipeline-title">Aguardam Desembolso</div>
                <div class="pipeline-val">{{ money(pipeline.approvedWaitingDisbursementAmount) }}</div>
              </div>
              <q-btn flat round dense size="sm" icon="chevron_right" color="purple-8" />
            </div>
          </q-card>
        </div>

        <!-- 3. Cobrança Preventiva (7 dias) -->
        <div class="col-6 col-md-3">
          <q-card flat class="pipeline-card pipeline-week cursor-pointer" @click="$router.push('/controle-prestacoes')">
            <div class="row items-center no-wrap">
              <div class="pipeline-num">{{ pipeline.dueThisWeekCount }}</div>
              <div class="col q-ml-sm" style="min-width: 0">
                <div class="pipeline-title">A Vencer esta Semana</div>
                <div class="pipeline-val">{{ money(pipeline.dueThisWeekAmount) }}</div>
              </div>
              <q-btn flat round dense size="sm" icon="chevron_right" color="amber-9" />
            </div>
          </q-card>
        </div>

        <!-- 4. Incumprimento Activo -->
        <div class="col-6 col-md-3">
          <q-card flat class="pipeline-card pipeline-overdue cursor-pointer" @click="$router.push('/cobranca')">
            <div class="row items-center no-wrap">
              <div class="pipeline-num">{{ delinquency.overdueInstallmentsCount }}</div>
              <div class="col q-ml-sm" style="min-width: 0">
                <div class="pipeline-title">Prestações em Incumprimento</div>
                <div class="pipeline-val text-negative">{{ money(delinquency.overdueAmount) }}</div>
              </div>
              <q-btn flat round dense size="sm" icon="chevron_right" color="negative" />
            </div>
          </q-card>
        </div>
      </div>

      <!-- ═══════ ZONA 3: MATRIZ DE RISCO (AGING) & HISTÓRICO DE DESEMBOLSOS VS COBRANÇA ═══════ -->
      <div class="row q-col-gutter-sm q-mb-md" data-tour="dash-matrix">
        <!-- Coluna Esquerda: Gráfico Histórico -->
        <div class="col-12 col-lg-7">
          <BarChart
            title="Evolução da Carteira — Desembolsos vs Cobranças (6 Meses)"
            :labels="chartData.labels"
            :disbursed="chartData.disbursed"
            :payments="chartData.payments"
          />
        </div>

        <!-- Coluna Direita: Matriz de Envelhecimento da Carteira (Aging) -->
        <div class="col-12 col-lg-5">
          <q-card flat bordered class="aging-card">
            <q-card-section class="q-py-xs q-px-sm">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <div class="row items-center">
                  <q-icon name="speed" color="primary" size="18px" class="q-mr-xs" />
                  <span class="text-subtitle2 text-weight-bold">Matriz de Risco (Aging da Carteira)</span>
                </div>
                <span class="text-caption text-grey-6">{{ money(portfolio.outstandingPortfolio) }}</span>
              </div>
              <div class="text-caption text-grey-6 q-mb-xs" style="font-size: 11px">
                Distribuição temporal da exposição da dívida em aberto por escalões de atraso:
              </div>

              <!-- Escalões de Mora -->
              <div class="aging-rows q-gutter-y-xs">
                <!-- 1. Em Dia -->
                <div class="aging-item">
                  <div class="row justify-between text-caption items-center">
                    <span class="text-weight-bold text-positive row items-center">
                      <span class="dot-indicator bg-positive q-mr-xs"></span> Em Dia (0 dias)
                    </span>
                    <span><strong>{{ money(delinquency.aging.current) }}</strong> ({{ delinquency.aging.currentRate.toFixed(1) }}%)</span>
                  </div>
                  <q-linear-progress :value="delinquency.aging.currentRate / 100" color="positive" rounded size="6px" class="q-mt-xs" />
                </div>

                <!-- 2. 1 a 30 dias -->
                <div class="aging-item">
                  <div class="row justify-between text-caption items-center">
                    <span class="text-weight-bold text-warning row items-center">
                      <span class="dot-indicator bg-warning q-mr-xs"></span> 1 a 30 dias de atraso
                    </span>
                    <span><strong>{{ money(delinquency.aging.days1to30) }}</strong> ({{ delinquency.aging.days1to30Rate.toFixed(1) }}%)</span>
                  </div>
                  <q-linear-progress :value="delinquency.aging.days1to30Rate / 100" color="warning" rounded size="6px" class="q-mt-xs" />
                </div>

                <!-- 3. 31 a 60 dias (PAR30) -->
                <div class="aging-item">
                  <div class="row justify-between text-caption items-center">
                    <span class="text-weight-bold text-orange-9 row items-center">
                      <span class="dot-indicator bg-orange-9 q-mr-xs"></span> 31 a 60 dias (PAR30)
                    </span>
                    <span><strong>{{ money(delinquency.aging.days31to60) }}</strong> ({{ delinquency.aging.days31to60Rate.toFixed(1) }}%)</span>
                  </div>
                  <q-linear-progress :value="delinquency.aging.days31to60Rate / 100" color="orange-9" rounded size="6px" class="q-mt-xs" />
                </div>

                <!-- 4. 61 a 90 dias (PAR60) -->
                <div class="aging-item">
                  <div class="row justify-between text-caption items-center">
                    <span class="text-weight-bold text-negative row items-center">
                      <span class="dot-indicator bg-negative q-mr-xs"></span> 61 a 90 dias (PAR60)
                    </span>
                    <span><strong>{{ money(delinquency.aging.days61to90) }}</strong> ({{ delinquency.aging.days61to90Rate.toFixed(1) }}%)</span>
                  </div>
                  <q-linear-progress :value="delinquency.aging.days61to90Rate / 100" color="negative" rounded size="6px" class="q-mt-xs" />
                </div>

                <!-- 5. > 90 dias (PAR90) -->
                <div class="aging-item">
                  <div class="row justify-between text-caption items-center">
                    <span class="text-weight-bold text-purple-10 row items-center">
                      <span class="dot-indicator bg-purple-10 q-mr-xs"></span> Acima de 90 dias (Crítico)
                    </span>
                    <span><strong>{{ money(delinquency.aging.daysOver90) }}</strong> ({{ delinquency.aging.daysOver90Rate.toFixed(1) }}%)</span>
                  </div>
                  <q-linear-progress :value="delinquency.aging.daysOver90Rate / 100" color="purple-10" rounded size="6px" class="q-mt-xs" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- ═══════ ZONA 4: DESEMPENHO E RISCO POR GESTOR DE CRÉDITO ═══════ -->
      <q-card flat bordered class="q-mb-md modern-section-card" data-tour="dash-managers">
        <q-card-section class="q-py-xs q-px-sm row items-center justify-between">
          <div class="row items-center">
            <q-icon name="badge" size="20px" color="primary" class="q-mr-xs" />
            <span class="text-subtitle2 text-weight-bold">Produtividade & Desempenho por Gestor de Crédito</span>
          </div>
          <q-btn flat dense no-caps color="primary" label="Ver todos os gestores" to="/carteira-gestor" size="sm" icon="chevron_right" />
        </q-card-section>
        <q-separator />

        <div v-if="riskByManager.length === 0" class="text-center text-grey-6 q-pa-md">
          Nenhum gestor com créditos atribuídos no momento.
        </div>
        <q-table
          v-else
          :rows="riskByManager"
          :columns="managerColumns"
          row-key="managerId"
          flat
          dense
          hide-bottom
          :pagination="{ rowsPerPage: 0 }"
          class="manager-table"
        >
          <template v-slot:body-cell-managerName="props">
            <q-td :props="props">
              <div class="row items-center no-wrap">
                <q-avatar size="24px" color="primary" text-color="white" class="q-mr-xs text-weight-bold" style="font-size: 11px">
                  {{ props.row.managerName?.substring(0, 2).toUpperCase() }}
                </q-avatar>
                <span class="text-weight-bold">{{ props.row.managerName }}</span>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-portfolioAmount="props">
            <q-td :props="props">
              <span class="text-weight-bold text-dark">{{ money(props.row.portfolioAmount) }}</span>
            </q-td>
          </template>

          <template v-slot:body-cell-collectedInPeriod="props">
            <q-td :props="props">
              <span class="text-weight-bold text-positive">{{ money(props.row.collectedInPeriod) }}</span>
            </q-td>
          </template>

          <template v-slot:body-cell-overdueExposure="props">
            <q-td :props="props">
              <span :class="Number(props.row.overdueExposure) > 0 ? 'text-negative text-weight-bold' : 'text-grey-6'">
                {{ money(props.row.overdueExposure) }}
              </span>
            </q-td>
          </template>

          <template v-slot:body-cell-overdueRate="props">
            <q-td :props="props">
              <div class="row items-center justify-end no-wrap">
                <span class="q-mr-xs text-caption">{{ props.row.overdueRate.toFixed(1) }}%</span>
                <q-badge
                  :color="props.row.overdueRate === 0 ? 'positive' : props.row.overdueRate <= 10 ? 'warning' : 'negative'"
                  rounded
                  style="width: 8px; height: 8px; padding: 0"
                />
              </div>
            </q-td>
          </template>
        </q-table>
      </q-card>

      <!-- ═══════ ZONA 5: ALERTAS URGENTES DE COBRANÇA & PRÓXIMAS PRESTAÇÕES ═══════ -->
      <div class="row q-col-gutter-sm q-mb-md" data-tour="dash-alerts">
        <!-- Alertas de Incumprimento -->
        <div class="col-12 col-lg-6">
          <q-card flat bordered class="modern-section-card full-height">
            <q-card-section class="q-py-xs q-px-sm row items-center justify-between bg-red-0">
              <div class="row items-center">
                <q-icon name="notification_important" size="18px" color="negative" class="q-mr-xs" />
                <span class="text-subtitle2 text-weight-bold text-negative">Alertas de Incumprimento Imediato</span>
                <q-badge color="negative" rounded class="q-ml-xs text-bold" :label="alerts.length" />
              </div>
              <q-btn flat dense no-caps color="negative" label="Ir p/ Cobrança" to="/cobranca" size="sm" icon="chevron_right" />
            </q-card-section>
            <q-separator />

            <div v-if="alerts.length === 0" class="text-center text-grey-5 q-pa-md">
              <q-icon name="task_alt" size="32px" color="positive" />
              <div class="q-mt-xs text-caption">Nenhum alerta crítico de cobrança pendente.</div>
            </div>

            <q-list v-else separator dense>
              <q-item v-for="alt in alerts.slice(0, 6)" :key="alt.loanId" class="q-py-xs">
                <q-item-section avatar top>
                  <q-avatar size="32px" color="red-1" text-color="negative" icon="priority_high" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold text-dark" style="font-size: 13px">
                    {{ alt.customerName }} <span class="text-caption text-grey-6">(Conta {{ alt.accountNumber }})</span>
                  </q-item-label>
                  <q-item-label caption class="text-grey-7">
                    Venceu a {{ formatDate(alt.dueDate) }} · <strong>{{ alt.daysOverdue }} dias de atraso</strong> · Gestor: {{ alt.managerName }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <div class="text-weight-bold text-negative" style="font-size: 13px">{{ money(alt.amountDue) }}</div>
                  <div class="text-caption text-orange-9" style="font-size: 10px" v-if="Number(alt.latePaymentInterest) > 0">
                    Mora: {{ money(alt.latePaymentInterest) }}
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </div>

        <!-- Próximas Prestações a Vencer -->
        <div class="col-12 col-lg-6">
          <UpcomingTable :items="upcomingInstallments" />
        </div>
      </div>

      <!-- ═══════ ZONA 6: CARTEIRAS DE FINANCIADORES (COMPACTADA & ELEGANTE) ═══════ -->
      <q-card flat bordered class="modern-section-card q-mb-lg" data-tour="dash-wallets">
        <q-card-section class="q-py-xs q-px-sm row items-center justify-between">
          <div class="row items-center">
            <q-icon name="savings" size="20px" color="primary" class="q-mr-xs" />
            <div>
              <span class="text-subtitle2 text-weight-bold">Origem de Capital & Carteiras de Financiadores</span>
              <span class="text-caption text-grey-6 q-ml-sm">
                (Liquidez real em conta: <strong>{{ money(liquidity.availableForDisbursement) }}</strong>)
              </span>
            </div>
          </div>
          <q-btn unelevated dense no-caps color="primary" icon="tune" label="Gerir carteiras" to="/financiamento" rounded size="sm" padding="4px 12px" />
        </q-card-section>
        <q-separator />

        <!-- Grelha compacta de fundos -->
        <q-card-section class="q-pa-xs">
          <div v-if="!walletsList.length" class="text-center text-grey-6 q-pa-sm">
            Nenhuma carteira de financiamento activa.
          </div>
          <div v-else class="row q-col-gutter-xs">
            <div v-for="w in walletsList" :key="w.id" class="col-12 col-sm-6 col-md-4">
              <div class="wallet-compact-card">
                <div class="row items-center justify-between no-wrap q-mb-xs">
                  <div class="row items-center no-wrap ellipsis">
                    <q-badge :color="w.cor_badge || 'blue'" :label="w.codigo" class="q-mr-xs" style="font-size: 10px" />
                    <span class="text-weight-bold ellipsis" style="font-size: 12px">{{ w.parceiro_nome || w.nome }}</span>
                  </div>
                  <q-badge v-if="w.taxa_juro" outline color="deep-purple" :label="`${(Number(w.taxa_juro) * 100).toFixed(1)}%`" style="font-size: 9px" />
                </div>

                <div class="row justify-between text-caption text-grey-7 q-mb-xs" style="font-size: 11px">
                  <span>Alocado: <strong>{{ w.allocated_amount === null ? 'Sem limite' : money(w.allocated_amount) }}</strong></span>
                  <span>Disponível: <strong class="text-positive">{{ w.saldo_analitico === null ? 'Livre' : money(w.saldo_analitico) }}</strong></span>
                </div>

                <q-linear-progress
                  v-if="w.allocated_amount !== null"
                  :value="Number(w.utilizacao) || 0"
                  rounded
                  size="4px"
                  :color="barColor(w)"
                  track-color="grey-3"
                />
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import {
  describePeriod,
  filterToQuery,
  resolveFilterFromQuery
} from '@/utils/period'
import FiltersBar from '@/components/ui/FiltersBar.vue'
import BarChart from '@/components/charts/BarChart.vue'
import UpcomingTable from '@/components/ui/UpcomingTable.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const dashboardStore = useDashboardStore()

const filter = ref(resolveFilterFromQuery(route.query))
const periodLabel = computed(() => describePeriod(filter.value))
const loading = computed(() => dashboardStore.loading)

// Reactive Store Getters
const portfolio = computed(() => dashboardStore.portfolio)
const delinquency = computed(() => dashboardStore.delinquency)
const movement = computed(() => dashboardStore.movement)
const liquidity = computed(() => dashboardStore.liquidity)
const pipeline = computed(() => dashboardStore.pipeline)
const riskByManager = computed(() => dashboardStore.riskByManager)
const alerts = computed(() => dashboardStore.alerts)
const upcomingInstallments = computed(() => dashboardStore.upcomingInstallments)
const chartData = computed(() => dashboardStore.chartData)
const walletsList = computed(() => dashboardStore.walletsSummary?.items || [])

// Formatação Monetária
const money = (val) =>
  `${(Number(val) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// Estilos dinâmicos do PAR30
const parBoxClass = computed(() => {
  const rate = Number(delinquency.value.par30Rate) || 0
  if (rate <= 5) return 'kpi-box-green-subtle'
  if (rate <= 10) return 'kpi-box-orange'
  return 'kpi-box-red'
})

const parAvatarClass = computed(() => {
  const rate = Number(delinquency.value.par30Rate) || 0
  if (rate <= 5) return 'bg-green-1 text-green-9'
  if (rate <= 10) return 'bg-orange-1 text-orange-9'
  return 'bg-red-1 text-negative'
})

const parTextClass = computed(() => {
  const rate = Number(delinquency.value.par30Rate) || 0
  if (rate <= 5) return 'text-green-10'
  if (rate <= 10) return 'text-orange-10'
  return 'text-negative'
})

const parBadgeColor = computed(() => {
  const rate = Number(delinquency.value.par30Rate) || 0
  if (rate <= 5) return 'positive'
  if (rate <= 10) return 'warning'
  return 'negative'
})

const parBadgeLabel = computed(() => {
  const rate = Number(delinquency.value.par30Rate) || 0
  if (rate <= 5) return 'Sob Controlo'
  if (rate <= 10) return 'Atenção'
  return 'Crítico'
})

function barColor(wallet) {
  const used = Number(wallet.utilizacao) || 0
  if (used >= 1) return 'negative'
  if (used >= 0.85) return 'orange'
  return 'positive'
}

// Colunas da tabela de gestores
const managerColumns = [
  { name: 'managerName', label: 'Gestor de Crédito', align: 'left', field: 'managerName' },
  { name: 'activeLoansCount', label: 'Créditos Activos', align: 'center', field: 'activeLoansCount' },
  { name: 'portfolioAmount', label: 'Carteira Sob Gestão', align: 'right', field: 'portfolioAmount' },
  { name: 'collectedInPeriod', label: 'Cobrado no Mês', align: 'right', field: 'collectedInPeriod' },
  { name: 'overdueExposure', label: 'Atraso em Risco', align: 'right', field: 'overdueExposure' },
  { name: 'overdueRate', label: 'Taxa de Atraso', align: 'right', field: 'overdueRate' }
]

async function loadData() {
  const companyId = authStore.companyId
  if (!companyId) return
  await dashboardStore.fetchDashboard(companyId, filter.value)
}

function onApplyFilter(newFilter) {
  filter.value = newFilter
  router.replace({ query: filterToQuery(newFilter) })
  loadData()
}

function onSync() {
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.dashboard-page {
  background-color: #f8fafc;
  min-height: calc(100vh - 50px);
}

.kpi-box {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
}

.kpi-box-blue { border-top: 3px solid #2563eb; }
.kpi-box-green { border-top: 3px solid #16a34a; }
.kpi-box-green-subtle { border-top: 3px solid #22c55e; }
.kpi-box-purple { border-top: 3px solid #7c3aed; }
.kpi-box-amber { border-top: 3px solid #d97706; }
.kpi-box-orange { border-top: 3px solid #ea580c; }
.kpi-box-red { border-top: 3px solid #dc2626; }

.kpi-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.03em;
}

.kpi-main-val {
  font-size: 19px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.kpi-sub-text {
  font-size: 11px;
  color: #64748b;
  margin-top: 3px;
  display: flex;
  align-items: center;
}

.kpi-footer-text {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 500;
}

/* Funil de Crédito / Pipeline Cards */
.pipeline-card {
  border-radius: 10px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  transition: all 0.15s ease;

  &:hover {
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    border-color: #cbd5e1;
  }
}

.pipeline-pending { border-left: 3px solid #3b82f6; }
.pipeline-approved { border-left: 3px solid #8b5cf6; }
.pipeline-week { border-left: 3px solid #f59e0b; }
.pipeline-overdue { border-left: 3px solid #ef4444; }

.pipeline-num {
  font-size: 20px;
  font-weight: 900;
  color: #1e293b;
  min-width: 24px;
}

.pipeline-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
}

.pipeline-val {
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
}

/* Aging Card */
.aging-card {
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  height: 100%;
}

.dot-indicator {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.modern-section-card {
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.wallet-compact-card {
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 6px 10px;
  background: #f8fafc;
}

body.body--dark {
  .dashboard-page {
    background-color: #0b1329;
  }

  .kpi-box {
    background: #162032;
    border-color: rgba(255, 255, 255, 0.08);

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  }

  .kpi-tag {
    color: #94a3b8;
  }

  .kpi-main-val {
    color: #f8fafc;
  }

  .kpi-sub-text {
    color: #94a3b8;
  }

  .pipeline-card {
    background: #162032;
    border-color: rgba(255, 255, 255, 0.08);

    &:hover {
      border-color: rgba(255, 255, 255, 0.2);
    }
  }

  .pipeline-num {
    color: #f8fafc;
  }

  .pipeline-title {
    color: #94a3b8;
  }

  .pipeline-val {
    color: #f1f5f9;
  }

  .aging-card,
  .modern-section-card {
    background: #162032;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .wallet-compact-card {
    background: #0f172a;
    border-color: rgba(255, 255, 255, 0.06);
  }
}
</style>
