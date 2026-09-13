import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

/**
 * PLANOS DE SUBSCRIÇÃO — usados na landing, no registo de empresa
 * e nas Configurações do Super Admin.
 */
export const usePlanStore = defineStore('plan', {
  state: () => ({
    plans: [],
    loading: false,
    error: null
  }),

  getters: {
    activePlans: (state) => state.plans.filter(p => Number(p.is_active) === 1),
    popularPlan: (state) => state.plans.find(p => Number(p.is_popular) === 1 && Number(p.is_active) === 1) || null
  },

  actions: {
    /**
     * Carrega planos. Por defeito só os activos (is_active=1).
     * Uso: fetchPlans() | fetchPlans({ all: true }) para gestão.
     */
    async fetchPlans({ all = false } = {}) {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/api/subscription-plans', {
          params: all ? {} : { is_active: 1 }
        })
        if (data.success) {
          this.plans = data.result || []
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

    /**
     * Cria/edita plano (gestão — Super Admin). O endpoint
     * /api/super-admin/plans exige role 0.
     */
    async savePlan(planData, planId = null) {
      if (planId) {
        const { data } = await api.put(`/api/super-admin/plans/${planId}`, planData)
        return data
      }
      const { data } = await api.post('/api/super-admin/plans', planData)
      return data
    },

    async deactivatePlan(planId) {
      const { data } = await api.delete(`/api/super-admin/plans/${planId}`)
      return data
    },

    clearPlans() {
      this.plans = []
      this.error = null
    }
  }
})
