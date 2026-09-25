import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

/**
 * CARTEIRAS DE FINANCIAMENTO + PORTAL DO PARCEIRO FINANCIADOR
 * ----------------------------------------------------------
 * Estado partilhado entre:
 *  · páginas de Admin (carteiras, parceiros, relatório de financiador);
 *  · formulários (taxa de juro, desembolso de crédito);
 *  · portal do parceiro (userRole 4 — só lê a SUA carteira).
 *
 * Nota: o parceiro nunca envia walletId/companyId — o backend resolve a
 * carteira a partir do utilizador autenticado (users.walletId).
 */
export const useWalletsStore = defineStore('wallets', {
  state: () => ({
    wallets: [],
    summary: null,
    saldoReal: { available: 0, accounts: [] },
    // KPIs consolidados + séries mensais por carteira (painel)
    walletDashboard: null,
    series: { meses: [], porCarteira: [] },
    testCandidates: [],
    partnerProfile: null,
    partnerDashboard: null,
    partnerLoans: [],
    partnerInstallments: [],
    partnerMora: null,
    partnerTransactions: [],
    partnerStatement: null,
    partnerRecibos: [],
    loading: false,
    loadingPartner: false,
    saving: false,
    error: null
  }),

  getters: {
    // Opções para selects (carteiras activas, com saldo analítico calculado).
    walletOptions: (state) =>
      state.wallets
        .filter((w) => Number(w.is_ativa))
        .map((w) => ({
          label: `${w.codigo} · ${w.nome}`,
          value: w.id,
          codigo: w.codigo,
          nome: w.nome,
          cor: w.cor_badge || 'blue',
          parceiro: w.parceiro_nome,
          allocated: w.allocated_amount,
          disbursed: w.disbursed,
          saldo: w.saldo_analitico,
          ilimitado: w.allocated_amount === null,
          taxa: w.taxa_juro
        })),
    // Carteiras de parceiro externo com portal (elegíveis para criar acesso).
    portalWalletOptions: (state) =>
      state.wallets
        .filter((w) => Number(w.is_ativa) && Number(w.tem_portal) && Number(w.is_parceiro_externo))
        .map((w) => ({ label: `${w.codigo} · ${w.nome}`, value: w.id, codigo: w.codigo, cor: w.cor_badge })),
    // Todas as carteiras (inclui inactivas) para o formulário de taxas.
    allWalletOptions: (state) =>
      state.wallets.map((w) => ({
        label: `${w.codigo} · ${w.nome}`,
        value: w.id,
        codigo: w.codigo,
        cor: w.cor_badge || 'blue',
        nome: w.nome,
        parceiro: w.parceiro_nome,
        inactiva: !Number(w.is_ativa)
      })),
    walletById: (state) => (id) => state.wallets.find((w) => Number(w.id) === Number(id)) || null
  },

  actions: {
    // ─── ADMIN ───
    async fetchWallets(companyId, { onlyActive = false } = {}) {
      if (!companyId) return
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get(`/api/wallets/${companyId}`, {
          params: onlyActive ? { onlyActive: true } : {}
        })
        if (data.success) {
          this.wallets = data.result || []
          this.summary = data.summary || null
          this.saldoReal = data.saldo_real || { available: 0, accounts: [] }
        }
        return this.wallets
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao carregar carteiras de financiamento'
        return []
      } finally {
        this.loading = false
      }
    },

    async createWallet(payload) {
      this.saving = true
      try {
        const { data } = await api.post('/api/wallets', payload)
        return data
      } finally {
        this.saving = false
      }
    },

    async updateWallet(id, payload) {
      this.saving = true
      try {
        const { data } = await api.put(`/api/wallets/${id}`, payload)
        return data
      } finally {
        this.saving = false
      }
    },

    /**
     * Activar/desactivar uma carteira (mantém sempre o histórico e os
     * créditos já classificados).
     */
    async deactivateWallet(id, isActive = false) {
      this.saving = true
      try {
        const { data } = await api.post(`/api/wallets/${id}/deactivate`, { is_ativa: isActive })
        return data
      } finally {
        this.saving = false
      }
    },

    /** APAGA a carteira — o backend recusa (409) se tiver movimento. */
    async deleteWallet(id) {
      this.saving = true
      try {
        const { data } = await api.delete(`/api/wallets/${id}`)
        return data
      } finally {
        this.saving = false
      }
    },

    /** Quantos registos apontam para a carteira (regras de apagar). */
    async fetchWalletDependencies(id) {
      const { data } = await api.get(`/api/wallets/${id}/dependencies`)
      return data.success ? data.result : null
    },

    /** Carteiras sem movimento que podem ser limpas (TESTE_* / criadas há <7 dias). */
    async fetchTestCandidates(companyId) {
      const { data } = await api.get(`/api/wallets/${companyId}/test-candidates`)
      this.testCandidates = data.success ? data.result || [] : []
      return this.testCandidates
    },

    /** Limpa em lote as carteiras de teste selecionadas. */
    async purgeTestWallets(companyId, ids) {
      this.saving = true
      try {
        const { data } = await api.post('/api/wallets/purge-test', { companyId, ids })
        return data
      } finally {
        this.saving = false
      }
    },

    /** KPIs consolidados + séries mensais por carteira (painel moderno). */
    async fetchWalletDashboard(companyId, months = 12) {
      if (!companyId) return null
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get(`/api/wallets/${companyId}/dashboard`, { params: { months } })
        if (data.success) {
          this.walletDashboard = {
            summary: data.summary || null,
            carteiras: data.carteiras || [],
            saldo_real: data.saldo_real || { available: 0, accounts: [] }
          }
          this.series = data.graficos || { meses: [], porCarteira: [] }
          // Mantém a listagem completa alinhada (badges/selects noutras páginas).
          if (!this.wallets.length) this.wallets = data.carteiras || []
          this.summary = data.summary || this.summary
          this.saldoReal = data.saldo_real || this.saldoReal
        }
        return this.walletDashboard
      } catch (error) {
        this.error = error.response?.data?.message || 'Erro ao carregar os KPIs das carteiras'
        return null
      } finally {
        this.loading = false
      }
    },

    // Taxas de juro com a carteira associada
    async fetchRatesWithWallet(companyId) {
      const { data } = await api.get(`/api/wallets/${companyId}/rates`)
      return data.success ? data.result || [] : []
    },

    // Créditos ainda sem carteira de financiamento (portfolio antigo).
    async fetchUnclassifiedLoans(companyId) {
      const { data } = await api.get(`/api/wallets/${companyId}/unclassified-loans`)
      return data.success ? data.result || [] : []
    },

    // Propostas de classificação automática: a carteira é derivada da taxa de
    // juro do crédito (interest_rates.walletId) e apresentada para o Admin rever
    // antes de gravar (nada é alterado por esta chamada).
    async fetchClassificationProposals(companyId) {
      const { data } = await api.get(`/api/wallets/${companyId}/classification-proposals`)
      return {
        propostas: data.success ? data.result || [] : [],
        resumo: data.summary || null
      }
    },

    // Classificação retroativa: propaga a carteira a crédito, prestações,
    // pagamentos e recibos antigos (é o que faz o recibo mostrar o badge).
    async classifyLoans(companyId, assignments) {
      this.saving = true
      try {
        const { data } = await api.post('/api/wallets/classify-loans', { companyId, assignments })
        return data
      } finally {
        this.saving = false
      }
    },

    // Contas de parceiro financiador (userRole 4)
    async fetchPartnerUsers(companyId) {
      const { data } = await api.get(`/api/wallets/${companyId}/partner-users`)
      return data.success ? data.result || [] : []
    },

    async createPartner(payload) {
      this.saving = true
      try {
        const { data } = await api.post('/api/users/parceiros', payload)
        return data
      } finally {
        this.saving = false
      }
    },

    async updatePartner(id, payload) {
      this.saving = true
      try {
        const { data } = await api.put(`/api/users/parceiros/${id}`, payload)
        return data
      } finally {
        this.saving = false
      }
    },

    // ─── PORTAL DO PARCEIRO (userRole 4) ───
    async fetchPartnerProfile() {
      const { data } = await api.get('/api/partner/profile')
      if (data.success) this.partnerProfile = data.result
      return this.partnerProfile
    },

    async fetchPartnerDashboard(params = {}) {
      this.loadingPartner = true
      try {
        const { data } = await api.get('/api/partner/dashboard', { params })
        if (data.success) this.partnerDashboard = data.result
        return this.partnerDashboard
      } finally {
        this.loadingPartner = false
      }
    },

    async fetchPartnerLoans(params = {}) {
      this.loadingPartner = true
      try {
        const { data } = await api.get('/api/partner/loans', { params })
        this.partnerLoans = data.success ? data.result || [] : []
        return this.partnerLoans
      } finally {
        this.loadingPartner = false
      }
    },

    async fetchPartnerInstallments(params = {}) {
      this.loadingPartner = true
      try {
        const { data } = await api.get('/api/partner/installments', { params })
        this.partnerInstallments = data.success ? data.result || [] : []
        return this.partnerInstallments
      } finally {
        this.loadingPartner = false
      }
    },

    async fetchPartnerMora() {
      this.loadingPartner = true
      try {
        const { data } = await api.get('/api/partner/mora')
        if (data.success) this.partnerMora = data.result
        return this.partnerMora
      } finally {
        this.loadingPartner = false
      }
    },

    async fetchPartnerTransactions(params = {}) {
      this.loadingPartner = true
      try {
        const { data } = await api.get('/api/partner/transactions', { params })
        this.partnerTransactions = data.success ? data.result || [] : []
        return this.partnerTransactions
      } finally {
        this.loadingPartner = false
      }
    },

    async fetchPartnerStatement(params = {}) {
      this.loadingPartner = true
      try {
        const { data } = await api.get('/api/partner/statement', { params })
        if (data.success) this.partnerStatement = data.result
        return this.partnerStatement
      } finally {
        this.loadingPartner = false
      }
    },

    async fetchPartnerRecibos() {
      this.loadingPartner = true
      try {
        const { data } = await api.get('/api/partner/recibos')
        this.partnerRecibos = data.success ? data.result || [] : []
        return this.partnerRecibos
      } finally {
        this.loadingPartner = false
      }
    },

    /** Descarrega um ficheiro autenticado (Excel/PDF) do backend. */
    async downloadFile(path, fileName) {
      const response = await api.get(path, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName || 'ficheiro')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },

    /** Abre um PDF autenticado numa nova aba. */
    async openPdf(path) {
      const response = await api.get(path, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 60000)
    }
  }
})
