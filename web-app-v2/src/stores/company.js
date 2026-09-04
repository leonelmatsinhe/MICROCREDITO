import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useCompanyStore = defineStore('company', {
  state: () => ({
    company: null,
    loading: false,
    error: null
  }),

  getters: {
    companyId: (state) => state.company?.id ?? null,
    companyName: (state) => state.company?.companyName || state.company?.smsSender || 'Mais Mola',
    companyLogo: (state) => {
      const logo = state.company?.companyLogo
      if (!logo) return '/logo.png'
      if (typeof logo === 'string') {
        if (logo.startsWith('http')) return logo
        if (logo.startsWith('/')) return logo
        // Filename only — files stored in uploads/documents/
        return `/documents/${logo}`
      }
      return '/logo.png'
    },
    smsSender: (state) => state.company?.smsSender || '',
    hasCompany: (state) => !!state.company
  },

  actions: {
    async fetchCompany(companyId) {
      if (!companyId) return
      this.loading = true
      this.error = null

      try {
        const { data } = await api.get(`/api/company/${companyId}`)
        if (data.success && data.result) {
          // API returns result as object or array
          this.company = Array.isArray(data.result) ? data.result[0] : data.result
        }
      } catch (error) {
        console.error('Erro ao buscar empresa:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async updateCompany(companyId, companyData) {
      this.loading = true
      try {
        const { data } = await api.put(`/api/company/${companyId}`, companyData)
        if (data.success) {
          // Re-fetch to get updated data
          await this.fetchCompany(companyId)
        }
        return data
      } catch (error) {
        console.error('Erro ao atualizar empresa:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    clearCompany() {
      this.company = null
    }
  },

  persist: {
    paths: ['company']
  }
})
