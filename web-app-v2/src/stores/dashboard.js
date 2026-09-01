import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    kpis: {
      totalCustomers: 0,
      totalDisbursed: 0,
      pendingAmount: 0,
      rejectedAmount: 0,
      capitalRecovered: 0,
      totalWithInterest: 0,
      totalInterestReceived: 0,
      totalReimbursed: 0
    },
    chartData: {
      labels: [],
      disbursed: [],
      payments: []
    },
    overdueInstallments: [],
    upcomingInstallments: [],
    recentActivity: [],
    riskByManager: [],
    loading: false,
    error: null,
    rawKpis: null
  }),

  getters: {
    hasData: (state) => state.kpis.totalDisbursed > 0 || state.kpis.totalCustomers > 0
  },

  actions: {
    async fetchDashboard(companyId, filters = {}) {
      this.loading = true
      this.error = null

      try {
        const params = {}
        if (filters.from) params.from = filters.from
        if (filters.to) params.to = filters.to

        const { data } = await api.get(`/api/dashboard/${companyId}`, { params })

        if (data && data.success) {
          // Store raw KPIs for reference
          this.rawKpis = data.kpis

          // Map KPIs from API response structure
          const loans = data.kpis?.loans || {}
          const financial = data.kpis?.financial || {}

          this.kpis = {
            totalCustomers: loans.active || 0,
            totalDisbursed: financial.totalDisbursed || 0,
            pendingAmount: financial.pendingAmount || 0,
            rejectedAmount: financial.rejectedAmount || 0,
            // Capital recuperado: soma dos pagamentos efectivos
            capitalRecovered: financial.capitalRecovered || financial.totalCollected || 0,
            // Total com Juros: crédito desembolsado com seus juros
            totalWithInterest: financial.totalWithInterest || 0,
            // Juros recebidos: juros normais + juros de mora (inclui descontos de pagamento antecipado)
            totalInterestReceived: financial.totalInterestReceived || 0,
            // Total Reembolsado: total do dinheiro reembolsado no período
            totalReimbursed: financial.totalReimbursed || financial.totalCollected || 0
          }

          // Map alerts to overdue installments
          if (data.alerts && Array.isArray(data.alerts)) {
            this.overdueInstallments = data.alerts.map(alert => ({
              id: alert.loanId,
              loanId: alert.loanId,
              accountNumber: alert.accountNumber,
              customerName: alert.customerName || `Conta ${alert.accountNumber}`,
              amount: alert.amountDue || 0,
              daysOverdue: alert.daysOverdue || 0,
              dueDate: alert.dueDate,
              managerName: alert.managerName
            }))
          }

          // Risk by manager
          if (data.riskByManager && Array.isArray(data.riskByManager)) {
            this.riskByManager = data.riskByManager
          }

          // Map chart data from API
          if (data.chartData) {
            this.chartData = data.chartData
          } else if (!this.chartData.labels.length) {
            this.generateDefaultChartData()
          }

          // Map upcoming installments
          if (data.upcomingInstallments && Array.isArray(data.upcomingInstallments)) {
            this.upcomingInstallments = data.upcomingInstallments
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    generateDefaultChartData() {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      const now = new Date()
      const currentMonth = now.getMonth()
      
      this.chartData = {
        labels: months.slice(0, currentMonth + 1),
        disbursed: new Array(currentMonth + 1).fill(0),
        payments: new Array(currentMonth + 1).fill(0)
      }
    },

    clearData() {
      this.kpis = {
        totalCustomers: 0,
        totalDisbursed: 0,
        pendingAmount: 0,
        rejectedAmount: 0,
        capitalRecovered: 0,
        totalWithInterest: 0,
        totalInterestReceived: 0,
        totalReimbursed: 0
      }
      this.chartData = { labels: [], disbursed: [], payments: [] }
      this.overdueInstallments = []
      this.upcomingInstallments = []
      this.riskByManager = []
      this.rawKpis = null
    }
  }
})
