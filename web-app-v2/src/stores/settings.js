import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // Users
    users: [],
    // Company
    company: null,
    // Interest Rates
    rates: [],
    // Accounts
    accounts: [],
    // Loading states
    loadingUsers: false,
    loadingCompany: false,
    loadingRates: false,
    loadingAccounts: false,
    saving: false
  }),

  getters: {
    activeUsers: (state) => state.users.filter(u => u.status !== 0),
    adminCount: (state) => state.users.filter(u => u.userRole === 1).length,
    gestorCount: (state) => state.users.filter(u => u.userRole === 3).length,
    operatorCount: (state) => state.users.filter(u => u.userRole === 2).length
  },

  actions: {
    // ========== USERS ==========
    async fetchUsers(companyId) {
      this.loadingUsers = true
      try {
        const { data } = await api.get(`/api/usersAll/${companyId}`)
        if (data.success) {
          this.users = data.result
        }
      } catch (error) {
        console.error('Erro ao buscar utilizadores:', error)
        throw error
      } finally {
        this.loadingUsers = false
      }
    },

    async createUser(userData) {
      this.saving = true
      try {
        const { data } = await api.post('/api/users', userData)
        return data
      } catch (error) {
        console.error('Erro ao criar utilizador:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async updateUser(id, userData) {
      this.saving = true
      try {
        const { data } = await api.put(`/api/users/${id}`, userData)
        return data
      } catch (error) {
        console.error('Erro ao atualizar utilizador:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async deleteUser(id) {
      this.saving = true
      try {
        const { data } = await api.delete(`/api/users/${id}`)
        return data
      } catch (error) {
        console.error('Erro ao eliminar utilizador:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async changePassword(passwordData) {
      this.saving = true
      try {
        const { data } = await api.post('/api/updatePassword', passwordData)
        return data
      } catch (error) {
        console.error('Erro ao alterar senha:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    // ========== COMPANY ==========
    async fetchCompany(companyId) {
      this.loadingCompany = true
      try {
        const { data } = await api.get(`/api/company/${companyId}`)
        if (data.success && data.result) {
          // API may return object or array
          this.company = Array.isArray(data.result) ? data.result[0] : data.result
        }
      } catch (error) {
        console.error('Erro ao buscar empresa:', error)
        throw error
      } finally {
        this.loadingCompany = false
      }
    },

    async updateCompany(companyId, companyData) {
      this.saving = true
      try {
        const { data } = await api.put(`/api/company/${companyId}`, companyData)
        if (data.success) {
          // Refresh company data
          await this.fetchCompany(companyId)
        }
        return data
      } catch (error) {
        console.error('Erro ao atualizar empresa:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    // ========== INTEREST RATES ==========
    async fetchRates(companyId) {
      this.loadingRates = true
      try {
        const { data } = await api.get(`/api/rate/${companyId}`)
        if (data.success) {
          // API returns result as array of rates
          this.rates = Array.isArray(data.result) ? data.result : (data.result ? [data.result] : [])
        }
      } catch (error) {
        console.error('Erro ao buscar taxas:', error)
        // Don't throw - show empty state instead
        this.rates = []
      } finally {
        this.loadingRates = false
      }
    },

    async createRate(rateData) {
      this.saving = true
      try {
        const { data } = await api.post('/api/rate', rateData)
        return data
      } catch (error) {
        console.error('Erro ao criar taxa:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async updateRate(id, rateData) {
      this.saving = true
      try {
        const { data } = await api.put(`/api/rate/${id}`, rateData)
        return data
      } catch (error) {
        console.error('Erro ao atualizar taxa:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async deleteRate(id) {
      this.saving = true
      try {
        const { data } = await api.delete(`/api/rate/${id}`)
        return data
      } catch (error) {
        console.error('Erro ao eliminar taxa:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    // ========== ACCOUNTS ==========
    // FONTE ÚNICA DE VERDADE: /api/bank-accounts — a MESMA API usada pelo
    // Caixa Central (carteira real com saldo). A secção de Configurações e o
    // Caixa Central leem/escrevem exactamente as mesmas contas.
    async fetchAccounts(companyId) {
      this.loadingAccounts = true
      try {
        const { data } = await api.get('/api/bank-accounts')
        if (data.success) {
          this.accounts = Array.isArray(data.result) ? data.result : (data.result ? [data.result] : [])
        }
      } catch (error) {
        console.error('Erro ao buscar contas:', error)
        // Don't throw - show empty state instead
        this.accounts = []
      } finally {
        this.loadingAccounts = false
      }
    },

    async createAccount(accountData) {
      this.saving = true
      try {
        const { data } = await api.post('/api/bank-accounts', accountData)
        return data
      } catch (error) {
        console.error('Erro ao criar conta:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async updateAccount(id, accountData) {
      this.saving = true
      try {
        const { data } = await api.put(`/api/bank-accounts/${id}`, accountData)
        return data
      } catch (error) {
        console.error('Erro ao atualizar conta:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async deleteAccount(id) {
      this.saving = true
      try {
        // Soft delete — a API desactiva a conta (is_active=0) preservando o
        // histórico financeiro da tesouraria.
        const { data } = await api.delete(`/api/bank-accounts/${id}`)
        return data
      } catch (error) {
        console.error('Erro ao eliminar conta:', error)
        throw error
      } finally {
        this.saving = false
      }
    }
  }
})
