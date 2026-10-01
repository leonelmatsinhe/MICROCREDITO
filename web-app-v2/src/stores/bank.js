import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

/**
 * CARTEIRA REAL (accounts) — subconjunto usado pelo modal de pagamento.
 * getReembolsoAccounts devolve apenas contas de DESTINO de pagamento
 * (purpose REEMBOLSO/MISTO + caixa físico), priorizadas pelo método escolhido.
 */
export const useBankStore = defineStore('bank', {
  state: () => ({
    reembolsoAccounts: [],
    reembolsoLoading: false,
    fetchedCompanyId: null
  }),

  getters: {
    byMethod: (state) => (paymentMethod) => {
      // A ordenação fina já vem do servidor (prioridade por método); aqui
      // apenas re-ordena localmente quando o usuário troca de método sem
      // refazer o fetch (resposta instantânea).
      const method = String(paymentMethod || '').toUpperCase()
      const isCash = method === 'CASH' || method === '1'
      const isMobile = ['MPESA', 'EMOLA', '7', '6'].includes(method)
      const isBank = ['BANK', '3', '4', '5'].includes(method)
      const score = (a) => {
        let s = 0
        if (a.is_default_reembolso) s -= 100
        if (a.purpose === 'MISTO') s -= 20
        if (isCash && a.type === 'CAIXA_FISICO') s -= 50
        if (isMobile && a.type === 'MOBILE_MONEY') s -= 60
        if (isMobile && String(a.bank_name || '').toLowerCase().includes('mpesa')) s -= 30
        if (isBank && a.type === 'BANCO' && a.purpose === 'REEMBOLSO') s -= 40
        return s
      }
      return [...state.reembolsoAccounts].sort((a, b) => score(a) - score(b) || a.id - b.id)
    }
  },

  actions: {
    async fetchReembolsoAccounts(companyId, paymentMethod) {
      this.reembolsoLoading = true
      try {
        const { data } = await api.get('/api/bank-accounts/reembolso', {
          params: {
            ...(companyId ? { companyId } : {}),
            ...(paymentMethod ? { paymentMethod } : {})
          }
        })
        if (data.success) {
          this.reembolsoAccounts = data.result || []
          this.fetchedCompanyId = companyId || null
        }
        return this.reembolsoAccounts
      } finally {
        this.reembolsoLoading = false
      }
    }
  }
})
