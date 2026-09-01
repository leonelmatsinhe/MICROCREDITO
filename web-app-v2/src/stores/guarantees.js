import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useGuaranteesStore = defineStore('guarantees', {
  state: () => ({
    guarantees: [],
    loading: false,
    saving: false
  }),

  getters: {
    hasGuarantees: (state) => state.guarantees.length > 0,
    guaranteeCount: (state) => state.guarantees.length,
    totalGuaranteeValue: (state) => state.guarantees.reduce((sum, g) => sum + (g.purchaseAmount || 0), 0)
  },

  actions: {
    async fetchGuarantees(loanId) {
      this.loading = true
      try {
        const { data } = await api.get(`/api/getLoanGuarantees/${loanId}`)
        if (data.success) {
          this.guarantees = Array.isArray(data.result) ? data.result : []
        } else {
          this.guarantees = []
        }
      } catch (error) {
        console.error('Erro ao buscar garantias:', error)
        this.guarantees = []
      } finally {
        this.loading = false
      }
    },

    async createGuarantee(guaranteeData) {
      this.saving = true
      try {
        const { data } = await api.post('/api/createGuarantee', guaranteeData)
        return data
      } catch (error) {
        console.error('Erro ao criar garantia:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async deleteGuarantee(id) {
      this.saving = true
      try {
        const { data } = await api.delete(`/api/deleteGuarantee/${id}`)
        return data
      } catch (error) {
        console.error('Erro ao eliminar garantia:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async uploadFile(file) {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return data
    },

    clearGuarantees() {
      this.guarantees = []
    }
  }
})
