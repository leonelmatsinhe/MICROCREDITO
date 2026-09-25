import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

/**
 * Store do Mutuário (página /mutuarios/:accountNumber)
 * Agrega customer + créditos + checklist KYC + prestações do crédito activo.
 * A aba Documentos & KYC alimenta `isKycComplete`, que desabilita o botão de
 * submissão/desembolso na aba Créditos enquanto faltarem documentos base.
 */
export const useMutuarioStore = defineStore('mutuario', {
  state: () => ({
    customer: null,
    loans: [],
    loanMetrics: {},
    checklist: null,          // { complete, missing, documents, checklist: [...] }
    activeLoan: null,          // crédito activo (status 1) mais recente — KPIs do header
    contextLoan: null,         // crédito em CONTEXTO da aba (selector) — pode diferir do activo
    contextInstallments: [],   // plano do contextLoan
    contextLoanLoading: false,
    installments: [],          // plano de amortização do activeLoan (compatibilidade)
    installmentsTotals: null,
    loading: false,
    loansLoading: false,
    kycLoading: false,
    amortLoading: false,
    submitting: false,
    liquidating: false,
    simulation: null           // resultado do POST /api/loan/simulate
  }),

  getters: {
    // ── KYC ──
    // Regra crítica: BI + NUIT + Comprovativo de rendimentos (3 documentos base).
    isKycComplete: (state) => !!(state.checklist && state.checklist.complete === true),
    kycMissing: (state) => (state.checklist?.missing || []),
    kycChecklist: (state) => (state.checklist?.checklist || []),
    kycDocuments: (state) => (state.checklist?.documents || []),

    // ── KPIs agregados do mutuário ──
    totalFinanciado: (state) =>
      state.loans
        .filter(l => Number(l.status) === 1 || Number(l.status) === 3)
        .reduce((sum, l) => sum + (Number(l.amount) || 0), 0),
    totalPago() {
      return this.loans
        .filter(l => Number(l.status) === 1 || Number(l.status) === 3)
        .reduce((sum, l) => sum + (Number(this.loanMetrics[Number(l.id)]?.totalPaid) || 0), 0)
    },
    saldoRemanescente() {
      return this.loans
        .filter(l => Number(l.status) === 1)
        .reduce((sum, l) => sum + (Number(this.loanMetrics[Number(l.id)]?.amountInDebt) || 0), 0)
    },
    totalDivida() {
      const active = this.loans.filter(l => Number(l.status) === 1)
      return active.reduce((sum, l) => sum + (Number(this.loanMetrics[Number(l.id)]?.contractTotal) || 0), 0)
    },
    // Capacidade de pagamento (1/3 do rendimento mensal)
    maxCapacity() {
      return (Number(this.customer?.customerMonthlySalary) || 0) / 3
    },
    // Próximo vencimento entre os créditos activos
    proximoVencimento() {
      let next = null
      for (const loan of this.loans) {
        if (Number(loan.status) !== 1) continue
        const due = this.loanMetrics[Number(loan.id)]?.nextDueDate
        if (due && (!next || String(due) < String(next))) next = due
      }
      return next
    },
    // Progresso do financiamento activo (0..1) — prestações pagas / total
    activeLoanProgress() {
      const metrics = this.loanMetrics[Number(this.activeLoan?.id)]
      if (!metrics || !Number(metrics.installmentsCount)) return 0
      return Math.min(1, (Number(metrics.paidInstallments) || 0) / Number(metrics.installmentsCount))
    },

    // Prestações pendentes/pagas do crédito em CONTEXTO (para liquidação total)
    pendingInstallments: (state) =>
      state.contextInstallments.filter(i => Number(i.status) === 0 || Number(i.status) === -1),
    paidInstallments: (state) => state.contextInstallments.filter(i => Number(i.status) === 1),

    // Histórico unificado para a timeline (créditos + documentos recentes)
    timelineEvents(state) {
      const events = []
      for (const loan of state.loans) {
        events.push({
          id: `loan-${loan.id}`,
          icon: 'payments',
          color: Number(loan.status) === 1 ? 'positive' : Number(loan.status) === 3 ? 'teal' : Number(loan.status) === 0 ? 'orange' : 'negative',
          title: `Crédito de ${Number(loan.amount).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN`,
          subtitle: `${Number(loan.numberOfInstallments)}x prestações — ${Number(loan.status) === 1 ? 'Activo' : Number(loan.status) === 3 ? 'Liquidado' : Number(loan.status) === 0 ? 'Pendente' : 'Rejeitado'}`,
          date: loan.disbursementDate || loan.dateCreated || loan.createdAt
        })
      }
      return events.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    }
  },

  actions: {
    // ── Carga principal da página ──
    async fetchAll(accountNumber) {
      this.loading = true
      try {
        const { data } = await api.get(`/api/customer/${accountNumber}`)
        if (data.success) {
          this.customer = data.result
        }
        await Promise.all([
          this.fetchLoans(),
          this.fetchChecklist(accountNumber)
        ])
      } finally {
        this.loading = false
      }
    },

    async fetchLoans() {
      if (!this.customer?.companyId) return
      this.loansLoading = true
      try {
        const companyId = this.customer.companyId
        const { data } = await api.get(`/api/loan/findAllLoans/all/${companyId}`)
        if (data.success) {
          this.loans = (data.result || []).filter(l => String(l.accountNumber) === String(this.customer.accountNumber))
          // Métricas agregadas (contrato, pago, dívida, vencimentos)
          try {
            const ov = await api.get(`/api/loans/overview/${companyId}`)
            if (ov.data?.success && Array.isArray(ov.data.result)) {
              const map = {}
              ov.data.result.forEach(m => { map[Number(m.id)] = m })
              this.loanMetrics = map
            }
          } catch { /* métricas opcionais */ }
        }
        // Crédito activo em foco (status 1 mais recente) — usado pelas abas
        // Amortização e Garantias & Recibos
        const active = this.loans
          .filter(l => Number(l.status) === 1)
          .sort((a, b) => Number(b.id) - Number(a.id))[0] || null
        this.activeLoan = active
      } finally {
        this.loansLoading = false
      }
    },

    async fetchChecklist(accountNumber) {
      this.kycLoading = true
      try {
        const { data } = await api.get(`/api/document/checklist/${accountNumber}`, {
          params: this.customer?.companyId ? { companyId: this.customer.companyId } : {}
        })
        if (data.success) {
          this.checklist = data.result
        }
      } catch {
        this.checklist = null
      } finally {
        this.kycLoading = false
      }
    },

    // ── CRÉDITO EM CONTEXTO (por aba) ──
    // Carrega o plano de um crédito ESPECÍFICO sem tocar no activeLoan
    // (KPIs do header) nem no plano de outro crédito. Cada ab acção passa
    // loanId explícito — nunca há mistura entre créditos do mesmo mutuário.
    async fetchPlanFor(loanId, forfeit = 0.1) {
      if (!loanId) {
        this.contextInstallments = []
        this.contextLoan = null
        return
      }
      this.contextLoanLoading = true
      try {
        const { data } = await api.get(`/api/loan/amortization/${loanId}/${forfeit}`)
        if (data.success) {
          // Guarda de consistência: se o utilizador trocar de crédito enquanto
          // a resposta está em voo, descarta o payload obsoleto.
          if (Number(this.contextLoan?.id) !== Number(loanId)) {
            this.contextLoan = this.loans.find(l => Number(l.id) === Number(loanId)) || this.contextLoan
          }
          this.contextInstallments = data.result || []
          this.contextLoan = this.loans.find(l => Number(l.id) === Number(loanId)) || this.contextLoan
        }
      } finally {
        this.contextLoanLoading = false
      }
    },

    // ── Plano de amortização do crédito activo (compatibilidade) ──
    async fetchAmortization(forfeit = 0.1) {
      if (!this.activeLoan?.id) {
        this.installments = []
        return
      }
      this.amortLoading = true
      try {
        const { data } = await api.get(`/api/loan/amortization/${this.activeLoan.id}/${forfeit}`)
        if (data.success) {
          this.installments = data.result || []
          this.installmentsTotals = data.totals || null
        }
      } finally {
        this.amortLoading = false
      }
    },

    // ── Simulação no BACKEND (paridade garantida com o desembolso) ──
    async simulate({ amount, installments, monthlyRate, dateCreated }) {
      const { data } = await api.post('/api/loan/simulate', {
        amount,
        installments,
        monthlyRate,
        dateCreated
      })
      if (data.success) {
        this.simulation = data.result
        return data.result
      }
      throw new Error(data.message || 'Erro na simulação')
    },

    // ── Submeter crédito (POST /api/loan) — backend valida KYC de novo ──
    async submitLoan(payload) {
      this.submitting = true
      try {
        const { data } = await api.post('/api/loan', payload)
        return data
      } finally {
        this.submitting = false
      }
    },

    // ── Upload de documento KYC (multipart → POST /api/document) ──
    async uploadDocument({ file, documentName, uploadedBy }) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentName', documentName)
      formData.append('accountNumber', this.customer.accountNumber)
      formData.append('companyId', this.customer.companyId)
      formData.append('uploadedBy', uploadedBy || '')
      const { data } = await api.post('/api/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (!data.success) throw new Error(data.message || 'Erro ao salvar documento')
      // Refrescar checklist: isKycComplete actualiza em tempo real
      await this.fetchChecklist(this.customer.accountNumber)
      return data
    },

    async deleteDocument(docId) {
      const { data } = await api.delete(`/api/document/${docId}`)
      await this.fetchChecklist(this.customer.accountNumber)
      return data
    },

    // ── Liquidação total ATÓMICA (POST /api/tranzaction/bulk) ──
    async liquidateAll(payload) {
      const loanId = payload?.loanId || this.contextLoan?.id
      if (!loanId) throw new Error('Sem crédito em contexto para liquidar')
      this.liquidating = true
      try {
        const { data } = await api.post('/api/tranzaction/bulk', {
          companyId: this.customer.companyId,
          accountNumber: this.customer.accountNumber,
          loanId,
          ...payload
        })
        if (!data.success) throw new Error(data.message || 'Erro na liquidação')
        // Refrescar o plano do crédito liquidado + métricas globais
        await Promise.all([this.fetchPlanFor(loanId), this.fetchLoans()])
        return data
      } finally {
        this.liquidating = false
      }
    },

    // ── Pagamento individual (POST /api/tranzaction) ──
    async payInstallment(payload) {
      const { data } = await api.post('/api/tranzaction', payload)
      if (!data.success) throw new Error(data.message || 'Erro no pagamento')
      // Refresca o plano do crédito pago (payload.loanId é sempre explícito)
      if (payload?.loanId) {
        await Promise.all([this.fetchPlanFor(payload.loanId), this.fetchLoans()])
      }
      return data
    },

    clear() {
      this.customer = null
      this.loans = []
      this.loanMetrics = {}
      this.checklist = null
      this.activeLoan = null
      this.contextLoan = null
      this.contextInstallments = []
      this.installments = []
      this.installmentsTotals = null
      this.simulation = null
    }
  }
})
