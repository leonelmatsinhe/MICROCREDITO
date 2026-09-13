import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useSuperAdminStore = defineStore('superAdmin', {
  state: () => ({
    companies: [],
    superAdmins: [],
    loading: false,
    error: null
  }),

  getters: {
    pending: (state) => state.companies.filter(c => c.approval_status === 'PENDENTE'),
    approved: (state) => state.companies.filter(c => c.approval_status === 'APROVADA'),
    rejected: (state) => state.companies.filter(c => c.approval_status === 'REJEITADA'),
    suspended: (state) => state.companies.filter(c => c.approval_status === 'SUSPENSA'),
    totalCompanies: (state) => state.companies.length,
    // Receita mensal estimada (soma dos planos, via plan_id ou plano por nome)
    monthlyRevenue: (state) => {
      const pricesByName = { STARTER: 2500, CRESCIMENTO: 4500, PROFISSIONAL: 8500 }
      return state.companies
        .filter(c => c.approval_status === 'APROVADA')
        .reduce((sum, c) => sum + (pricesByName[c.plan] || 0), 0)
    }
  },

  actions: {
    /**
     * Carrega TODAS as empresas (sem filtro default). Na primeira carga a
     * aba "Todas" deve mostrar tudo, incluindo registos antigos (36, 37...).
     * Filtro opcional: fetchCompanies('PENDENTE')
     */
    async fetchCompanies(status = null) {
      this.loading = true
      this.error = null
      try {
        const response = await api.get('/api/super-admin/companies', {
          params: status ? { status } : {}
        })
        const data = response.data
        console.log('[superAdmin] fetchCompanies response:', data)

        // Servidor antigo / rota inexistente devolve HTML do SPA em vez de JSON.
        if (typeof data !== 'object' || data === null || typeof data.success === 'undefined') {
          console.error('[superAdmin] Backend não tem a rota /api/super-admin/companies — rebuild do servidor necessário.')
          this.error = 'Backend desactualizado: reinicie o servidor Node para activar as rotas do Super Admin.'
          this.companies = []
          return { success: false, message: this.error }
        }

        if (data.success) {
          this.companies = data.result || []
        } else {
          this.error = data.message
        }
        return data
      } catch (error) {
        this.error = error.response?.data?.message || error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /** Aprova com plano atribuído (Super Admin pode trocar o plano escolhido) */
    async approveCompany(companyId, planId = null) {
      const { data } = await api.post(`/api/super-admin/companies/${companyId}/approve`, {
        planId: planId || null
      })
      if (data.success) {
        await this.fetchCompanies()
      }
      return data
    },

    async rejectCompany(companyId, reason) {
      const { data } = await api.post(`/api/super-admin/companies/${companyId}/reject`, { reason })
      if (data.success) {
        await this.fetchCompanies()
      }
      return data
    },

    /** Lista Super Admins (role 0) — Configurações > Super Admins */
    async fetchSuperAdmins() {
      const { data } = await api.get('/api/super-admin/users')
      if (data.success) {
        this.superAdmins = data.result || []
      }
      return data
    },

    async createSuperAdmin(payload) {
      const { data } = await api.post('/api/super-admin/users', payload)
      if (data.success) {
        await this.fetchSuperAdmins()
      }
      return data
    },

    async deleteSuperAdmin(id) {
      const { data } = await api.delete(`/api/super-admin/users/${id}`)
      if (data.success) {
        await this.fetchSuperAdmins()
      }
      return data
    },

    async suspendCompany(companyId) {
      const { data } = await api.post(`/api/super-admin/companies/${companyId}/suspend`)
      if (data.success) {
        await this.fetchCompanies()
      }
      return data
    },

    clearCompanies() {
      this.companies = []
      this.error = null
    }
  }
})
