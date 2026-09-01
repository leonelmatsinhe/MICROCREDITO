import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const usePaymentsStore = defineStore('payments', {
  state: () => ({
    payments: [],
    loading: false,
    saving: false,
    totals: {
      totalAmount: 0,
      totalLateInterest: 0,
      totalInterestRate: 0
    }
  }),

  getters: {
    hasPayments: (state) => state.payments.length > 0,
    paymentCount: (state) => state.payments.length,
    totalPaid: (state) => state.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  },

  actions: {
    async fetchCustomerPayments(accountNumber) {
      this.loading = true
      try {
        const { data } = await api.get(`/api/tranzaction/${accountNumber}`)
        if (data.success) {
          this.payments = Array.isArray(data.result) ? data.result : []
        } else {
          this.payments = []
        }
      } catch (error) {
        console.error('Erro ao buscar pagamentos:', error)
        this.payments = []
      } finally {
        this.loading = false
      }
    },

    async createPayment(paymentData) {
      this.saving = true
      try {
        const { data } = await api.post('/api/tranzaction', paymentData)
        return data
      } catch (error) {
        console.error('Erro ao registar pagamento:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    clearPayments() {
      this.payments = []
      this.totals = { totalAmount: 0, totalLateInterest: 0, totalInterestRate: 0 }
    }
  }
})
