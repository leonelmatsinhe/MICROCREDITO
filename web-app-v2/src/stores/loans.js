import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useLoansStore = defineStore('loans', {
  state: () => ({
    loans: [],
    currentLoan: null,
    amortization: [],
    amortizationTotals: null,
    loading: false,
    saving: false,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 15,
      hasNextPage: false,
      hasPrevPage: false
    }
  }),

  getters: {
    hasLoans: (state) => state.loans.length > 0,
    loansByStatus: (state) => (status) => state.loans.filter(l => l.status === status),
    pendingLoans: (state) => state.loans.filter(l => l.status === 0),
    activeLoans: (state) => state.loans.filter(l => l.status === 1),
    rejectedLoans: (state) => state.loans.filter(l => l.status === -1),
    completedLoans: (state) => state.loans.filter(l => l.status === 3)
  },

  actions: {
    // Fetch all loans for a company (non-paginated)
    async fetchLoans(companyId, params = {}) {
      this.loading = true
      try {
        const { data } = await api.get(`/api/loan/findAllLoans/all/${companyId}`, {
          params: {
            status: params.status,
            search: params.search
          }
        })
        if (data.success) {
          this.loans = data.result || []
        }
      } catch (error) {
        console.error('Erro ao buscar créditos:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // Fetch loans with pagination
    async fetchLoansPaginated(companyId, params = {}) {
      this.loading = true
      try {
        const { data } = await api.get(`/api/companyLoans/${companyId}/paginated`, {
          params: {
            page: params.page || 1,
            limit: params.limit || 15,
            status: params.status,
            search: params.search,
            creditManager: params.creditManager
          }
        })
        if (data.success) {
          this.loans = data.result || []
          if (data.pagination) {
            this.pagination = data.pagination
          }
        }
      } catch (error) {
        console.error('Erro ao buscar créditos:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // Fetch single loan by ID
    // NOTE: /api/loan/:id searches by accountNumber (legacy endpoint)
    // So we fetch all company loans and filter by ID
    async fetchLoan(loanId, companyId) {
      this.loading = true
      try {
        // First check if loan is already in the store
        const existing = this.loans.find(l => String(l.id) === String(loanId))
        if (existing) {
          this.currentLoan = existing
          return this.currentLoan
        }

        // Otherwise fetch all loans and find it
        if (companyId) {
          const { data } = await api.get(`/api/loan/findAllLoans/all/${companyId}`)
          if (data.success && data.result) {
            const found = data.result.find(l => String(l.id) === String(loanId))
            if (found) {
              this.currentLoan = found
              this.loans = data.result
              return this.currentLoan
            }
          }
        }
        return null
      } catch (error) {
        console.error('Erro ao buscar crédito:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // Fetch loan amortization plan
    async fetchAmortization(loanId, forfeit = 0) {
      this.loading = true
      try {
        const url = forfeit 
          ? `/api/loan/amortization/${loanId}/${forfeit}`
          : `/api/loan/amortization/${loanId}`
        const { data } = await api.get(url)
        if (data.success) {
          this.amortization = data.result || []
          this.amortizationTotals = data.totals || null
          return { installments: this.amortization, totals: this.amortizationTotals }
        }
        return { installments: [], totals: null }
      } catch (error) {
        console.error('Erro ao buscar amortização:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // Create new loan
    async createLoan(loanData) {
      this.saving = true
      try {
        const { data } = await api.post('/api/loan', loanData)
        return data
      } catch (error) {
        console.error('Erro ao criar crédito:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    // Update loan
    async updateLoan(id, loanData) {
      this.saving = true
      try {
        const { data } = await api.put(`/api/loan/${id}`, loanData)
        return data
      } catch (error) {
        console.error('Erro ao atualizar crédito:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    // Delete loan
    async deleteLoan(id) {
      this.saving = true
      try {
        const { data } = await api.delete(`/api/loan/${id}`)
        return data
      } catch (error) {
        console.error('Erro ao eliminar crédito:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    // Create amortization installments for a loan
    // payload must include: companyId, loanId, accountNumber, interestRate, numberOfInstallments, amount, dueDate
    async createAmortization(payload) {
      this.saving = true
      try {
        const { data } = await api.post('/api/createInstallmentsLoan/', payload)
        return data
      } catch (error) {
        console.error('Erro ao criar amortização:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    // Get loan guarantees
    async fetchGuarantees(loanId) {
      try {
        const { data } = await api.get(`/api/getLoanGuarantees/${loanId}`)
        if (data.success) {
          return data.result || []
        }
        return []
      } catch (error) {
        console.error('Erro ao buscar garantias:', error)
        return []
      }
    },

    // Actualizar loan
    async updateLoan(loanId, payload) {
      try {
        const { data } = await api.put(`/api/loan/${loanId}`, payload)
        return data
      } catch (error) {
        console.error('Erro ao actualizar loan:', error)
        throw error
      }
    },

    // Actualizar datas das prestações com base na nova data de desembolso
    async updateInstallmentDates(loanId, newDisbursementDate) {
      try {
        const { data } = await api.put(`/api/loan/${loanId}/update-dates`, {
          disbursementDate: newDisbursementDate
        })
        return data
      } catch (error) {
        console.error('Erro ao actualizar datas:', error)
        throw error
      }
    },

    clearCurrentLoan() {
      this.currentLoan = null
      this.amortization = []
      this.amortizationTotals = null
    },

    clearData() {
      this.loans = []
      this.currentLoan = null
      this.amortization = []
      this.amortizationTotals = null
      this.pagination = {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 15,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  }
})
