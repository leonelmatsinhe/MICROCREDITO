import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    // 1. CARTEIRA ACTIVA BRUTA (Gross Loan Portfolio - Stock)
    portfolio: {
      activeLoansCount: 0,
      outstandingPortfolio: 0,
      totalContractedWithInterest: 0,
      totalPaidSoFar: 0,
      activeBorrowersCount: 0
    },
    // 2. RISCO E INCUMPRIMENTO (PAR - CGAP Standard)
    delinquency: {
      overdueAmount: 0,
      overdueRate: 0,
      par30Amount: 0,
      par30Rate: 0,
      par60Amount: 0,
      par60Rate: 0,
      par90Amount: 0,
      par90Rate: 0,
      overdueLoansCount: 0,
      overdueInstallmentsCount: 0,
      aging: {
        current: 0,
        currentRate: 100,
        days1to30: 0,
        days1to30Rate: 0,
        days31to60: 0,
        days31to60Rate: 0,
        days61to90: 0,
        days61to90Rate: 0,
        daysOver90: 0,
        daysOver90Rate: 0
      }
    },
    // 3. FLUXO DO PERÍODO FILTRADO (Desembolsos & Cobranças)
    movement: {
      disbursedAmount: 0,
      disbursedCount: 0,
      collectedAmount: 0,
      principalCollected: 0,
      interestCollected: 0,
      moraCollected: 0,
      paymentsCount: 0,
      expectedDueAmount: 0,
      collectionEfficiencyRate: 100
    },
    // 4. LIQUIDEZ E TESOURARIA
    liquidity: {
      availableForDisbursement: 0,
      disbursementAccountsCount: 0,
      totalBankBalance: 0,
      totalCashBalance: 0,
      totalTreasury: 0
    },
    // 5. FUNIL OPERACIONAL (Pipeline de Concessão)
    pipeline: {
      pendingRequestsCount: 0,
      pendingRequestsAmount: 0,
      approvedWaitingDisbursementCount: 0,
      approvedWaitingDisbursementAmount: 0,
      dueThisWeekCount: 0,
      dueThisWeekAmount: 0,
      criticalOverdueCount: 0,
      criticalOverdueAmount: 0
    },
    // Risco e produtividade por gestor
    riskByManager: [],
    // Alertas de atraso (com telefone e dados de cobrança)
    alerts: [],
    // Próximas parcelas a vencer
    upcomingInstallments: [],
    // Gráficos comparativos (últimos 6 meses)
    chartData: {
      labels: [],
      disbursed: [],
      payments: []
    },
    // Resumo compacto de carteiras de financiadores
    walletsSummary: null,
    // Período
    period: null,
    loading: false,
    error: null,
    rawKpis: null
  }),

  getters: {
    hasData: (state) =>
      Number(state.portfolio?.outstandingPortfolio || 0) > 0 ||
      Number(state.movement?.disbursedAmount || 0) > 0 ||
      Number(state.movement?.collectedAmount || 0) > 0
  },

  actions: {
    async fetchDashboard(companyId, filters = {}) {
      this.loading = true
      this.error = null

      try {
        const params = {}
        if (filters.from) params.from = filters.from
        if (filters.to) params.to = filters.to
        if (filters.creditManager) params.creditManager = filters.creditManager
        if (filters.status) params.status = filters.status

        const { data } = await api.get(`/api/dashboard/${companyId}`, { params })

        if (data && data.success) {
          this.rawKpis = data.kpis
          this.period = data.period || null

          // 1. Portfolio
          this.portfolio = data.kpis?.portfolio || {
            activeLoansCount: 0,
            outstandingPortfolio: 0,
            totalContractedWithInterest: 0,
            totalPaidSoFar: 0,
            activeBorrowersCount: 0
          }

          // 2. Delinquency (PAR & Aging)
          this.delinquency = data.kpis?.delinquency || {
            overdueAmount: 0,
            overdueRate: 0,
            par30Amount: 0,
            par30Rate: 0,
            par60Amount: 0,
            par60Rate: 0,
            par90Amount: 0,
            par90Rate: 0,
            overdueLoansCount: 0,
            overdueInstallmentsCount: 0,
            aging: {
              current: 0,
              currentRate: 100,
              days1to30: 0,
              days1to30Rate: 0,
              days31to60: 0,
              days31to60Rate: 0,
              days61to90: 0,
              days61to90Rate: 0,
              daysOver90: 0,
              daysOver90Rate: 0
            }
          }

          // 3. Movement
          this.movement = data.kpis?.movement || {
            disbursedAmount: 0,
            disbursedCount: 0,
            collectedAmount: 0,
            principalCollected: 0,
            interestCollected: 0,
            moraCollected: 0,
            paymentsCount: 0,
            expectedDueAmount: 0,
            collectionEfficiencyRate: 100
          }

          // 4. Liquidity
          this.liquidity = data.kpis?.liquidity || {
            availableForDisbursement: 0,
            disbursementAccountsCount: 0,
            totalBankBalance: 0,
            totalCashBalance: 0,
            totalTreasury: 0
          }

          // 5. Pipeline
          this.pipeline = data.kpis?.pipeline || {
            pendingRequestsCount: 0,
            pendingRequestsAmount: 0,
            approvedWaitingDisbursementCount: 0,
            approvedWaitingDisbursementAmount: 0,
            dueThisWeekCount: 0,
            dueThisWeekAmount: 0,
            criticalOverdueCount: 0,
            criticalOverdueAmount: 0
          }

          // Gestores
          this.riskByManager = data.riskByManager || []

          // Alertas
          this.alerts = data.alerts || []

          // Próximas prestações
          this.upcomingInstallments = data.upcomingInstallments || []

          // Gráfico
          this.chartData = data.chartData || { labels: [], disbursed: [], payments: [] }

          // Carteiras
          this.walletsSummary = data.walletsSummary || null
        }
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error)
        this.error = error.response?.data?.message || error.message || 'Erro ao carregar dashboard'
      } finally {
        this.loading = false
      }
    },

    clearData() {
      this.portfolio = { activeLoansCount: 0, outstandingPortfolio: 0, totalContractedWithInterest: 0, totalPaidSoFar: 0, activeBorrowersCount: 0 }
      this.delinquency = { overdueAmount: 0, overdueRate: 0, par30Amount: 0, par30Rate: 0, par60Amount: 0, par60Rate: 0, par90Amount: 0, par90Rate: 0, overdueLoansCount: 0, overdueInstallmentsCount: 0, aging: { current: 0, currentRate: 100, days1to30: 0, days1to30Rate: 0, days31to60: 0, days31to60Rate: 0, days61to90: 0, days61to90Rate: 0, daysOver90: 0, daysOver90Rate: 0 } }
      this.movement = { disbursedAmount: 0, disbursedCount: 0, collectedAmount: 0, principalCollected: 0, interestCollected: 0, moraCollected: 0, paymentsCount: 0, expectedDueAmount: 0, collectionEfficiencyRate: 100 }
      this.liquidity = { availableForDisbursement: 0, disbursementAccountsCount: 0, totalBankBalance: 0, totalCashBalance: 0, totalTreasury: 0 }
      this.pipeline = { pendingRequestsCount: 0, pendingRequestsAmount: 0, approvedWaitingDisbursementCount: 0, approvedWaitingDisbursementAmount: 0, dueThisWeekCount: 0, dueThisWeekAmount: 0, criticalOverdueCount: 0, criticalOverdueAmount: 0 }
      this.riskByManager = []
      this.alerts = []
      this.upcomingInstallments = []
      this.chartData = { labels: [], disbursed: [], payments: [] }
      this.walletsSummary = null
      this.period = null
    }
  }
})
