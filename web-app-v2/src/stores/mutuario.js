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
    transactions: [],          // histórico de pagamentos/recibos deste mutuário
    collectionActivities: [],  // histórico de actividades/visitas/promessas de cobrança
    guarantees: [],            // garantias do crédito activo
    guaranteeCoverage: null,   // rácio de cobertura de garantias (ICR)
    loading: false,
    loansLoading: false,
    kycLoading: false,
    amortLoading: false,
    submitting: false,
    liquidating: false,
    simulation: null,          // resultado do POST /api/loan/simulate
    quote: null,               // quote oficial da prestação (GET /api/installments/:id/quote)
    quoteLoading: false,
    renewalQuote: null,        // quote oficial de renovação (GET /api/installments/:id/renewal-quote)
    renewalQuoteLoading: false,
    renewals: [],              // histórico de renovações do crédito em contexto
    renewalsLoading: false
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
    // Prestação mensal contratual do crédito activo
    currentInstallmentAmount() {
      const list = this.contextInstallments.length > 0 ? this.contextInstallments : this.installments
      if (list.length > 0) {
        const currentPending = list.find(i => Number(i.status) !== 1) || list[list.length - 1]
        return Number(currentPending?.installment) || 0
      }
      if (this.activeLoan) {
        const rate = Number(this.activeLoan.interestRate) || 0
        const n = Number(this.activeLoan.numberOfInstallments) || 1
        const principal = Number(this.activeLoan.amount) || 0
        if (principal <= 0 || rate <= 0) return principal / n
        const factor = Math.pow(1 + rate, n)
        return principal * (rate * factor) / (factor - 1)
      }
      return 0
    },
    // Taxa de Esforço (DTI - Debt-to-Income): Prestação / Salário Mensal (%)
    dtiRatio() {
      const salary = Number(this.customer?.customerMonthlySalary) || 0
      if (salary <= 0) return 0
      return (this.currentInstallmentAmount / salary) * 100
    },
    // Classificação de risco por DTI (Banco de Moçambique & CGAP)
    dtiStatus() {
      const ratio = this.dtiRatio
      if (ratio <= 0) return { ratio: 0, percentStr: '0%', label: 'Sem Encargos', color: 'positive', level: 'baixo' }
      if (ratio <= 33) return { ratio, percentStr: `${Math.round(ratio)}%`, label: 'Saudável', color: 'positive', level: 'baixo' }
      if (ratio <= 50) return { ratio, percentStr: `${Math.round(ratio)}%`, label: 'Moderado', color: 'warning', level: 'medio' }
      return { ratio, percentStr: `${Math.round(ratio)}%`, label: 'Sobre-endividado', color: 'negative', level: 'critico' }
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
      const list = this.contextInstallments.length > 0 ? this.contextInstallments : this.installments
      if (list.length > 0) {
        const paid = list.filter(i => Number(i.status) === 1).length
        return paid / list.length
      }
      const metrics = this.loanMetrics[Number(this.activeLoan?.id)]
      if (!metrics || !Number(metrics.installmentsCount)) return 0
      return Math.min(1, (Number(metrics.paidInstallments) || 0) / Number(metrics.installmentsCount))
    },
    activeLoanPaidCount() {
      const list = this.contextInstallments.length > 0 ? this.contextInstallments : this.installments
      if (list.length > 0) {
        return list.filter(i => Number(i.status) === 1).length
      }
      const metrics = this.loanMetrics[Number(this.activeLoan?.id)]
      return Number(metrics?.paidInstallments) || 0
    },
    activeLoanTotalCount() {
      const list = this.contextInstallments.length > 0 ? this.contextInstallments : this.installments
      if (list.length > 0) {
        return list.length
      }
      return Number(this.activeLoan?.numberOfInstallments) || 0
    },
    // Próxima prestação detalhada (dias restantes, mora, total a pagar)
    activeLoanNextInstallment() {
      const list = this.contextInstallments.length > 0 ? this.contextInstallments : this.installments
      const pending = list.filter(i => Number(i.status) === 0 || Number(i.status) === -1)
      if (pending.length === 0) return null
      const sorted = [...pending].sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
      const next = sorted[0]
      const today = new Date().toISOString().split('T')[0]
      const dueDate = next.dueDate ? String(next.dueDate).split('T')[0] : ''
      const isOverdue = !!(dueDate && dueDate < today)
      const diffDays = dueDate
        ? Math.round((new Date(dueDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
        : 0
      return {
        ...next,
        isOverdue,
        daysOverdue: isOverdue ? Math.abs(diffDays) : 0,
        daysLeft: !isOverdue ? diffDays : 0,
        totalDue: (Number(next.installment) || 0) + (Number(next.latePaymentInterest) || 0) - (Number(next.paidAmount) || 0)
      }
    },

    // Prestações pendentes/pagas do crédito em CONTEXTO (para liquidação total)
    pendingInstallments: (state) =>
      state.contextInstallments.filter(i => Number(i.status) === 0 || Number(i.status) === -1),
    paidInstallments: (state) => state.contextInstallments.filter(i => Number(i.status) === 1),

    // Histórico unificado para a timeline (créditos + pagamentos + actividades de cobrança + documentos)
    timelineEvents(state) {
      const events = []
      // 1. Empréstimos
      for (const loan of state.loans) {
        events.push({
          id: `loan-${loan.id}`,
          type: 'loan',
          icon: 'payments',
          color: Number(loan.status) === 1 ? 'positive' : Number(loan.status) === 3 ? 'teal' : Number(loan.status) === 0 ? 'orange' : 'negative',
          title: `Crédito #${loan.id} de ${Number(loan.amount).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN`,
          subtitle: `${Number(loan.numberOfInstallments)}x prestações — ${Number(loan.status) === 1 ? 'Activo' : Number(loan.status) === 3 ? 'Liquidado' : Number(loan.status) === 0 ? 'Pendente' : 'Rejeitado'}`,
          date: loan.disbursementDate || loan.dateCreated || loan.createdAt
        })
      }
      // 2. Transações / Pagamentos
      for (const t of state.transactions) {
        const method = t.paymentMethod ? String(t.paymentMethod).toUpperCase() : 'NUMERÁRIO'
        events.push({
          id: `tranz-${t.id}`,
          type: 'payment',
          icon: 'receipt_long',
          color: 'teal-7',
          title: `Amortização de ${Number(t.amount).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN`,
          subtitle: `Canal: ${method}${t.reference ? ` · Ref: ${t.reference}` : ''}${t.receiptNumber ? ` · Recibo #${t.receiptNumber}` : ''}`,
          date: t.dateCreated || t.createdAt
        })
      }
      // 3. Actividades de Cobrança (Visitas, Contactos, Promessas)
      for (const c of state.collectionActivities) {
        const typeLabels = {
          call: 'Chamada Telefónica',
          visit: 'Visita no Terreno',
          promise: 'Promessa de Pagamento',
          formal_notice: 'Notificação Formal',
          warning: 'Aviso de Cobrança'
        }
        events.push({
          id: `col-${c.id}`,
          type: 'collection',
          icon: c.activityType === 'visit' ? 'place' : c.activityType === 'promise' ? 'handshake' : 'call',
          color: c.activityType === 'promise' ? 'purple' : 'deep-orange',
          title: typeLabels[c.activityType] || 'Registo de Cobrança',
          subtitle: `${c.notes || c.details || 'Registo efetuado'}${c.createdByName ? ` · Por: ${c.createdByName}` : ''}`,
          date: c.activityDate || c.dateCreated || c.createdAt
        })
      }
      // 4. Documentos KYC
      for (const doc of (state.checklist?.documents || [])) {
        events.push({
          id: `doc-${doc.id}`,
          type: 'document',
          icon: 'description',
          color: 'blue-grey',
          title: `Documento: ${doc.documentName}`,
          subtitle: 'Anexado ao dossier KYC do mutuário',
          date: doc.dateCreated || doc.createdAt
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
          this.fetchChecklist(accountNumber),
          this.fetchTransactions(accountNumber),
          this.fetchCollectionActivities(accountNumber)
        ])
        if (this.activeLoan?.id) {
          await Promise.all([
            this.fetchPlanFor(this.activeLoan.id),
            this.fetchAmortization(),
            this.fetchGuaranteeCoverage(this.activeLoan.id)
          ])
        }
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

    async fetchTransactions(accountNumber) {
      if (!accountNumber) return
      try {
        const { data } = await api.get(`/api/tranzaction/${accountNumber}`)
        if (data && data.success && Array.isArray(data.result)) {
          this.transactions = data.result
        } else {
          this.transactions = []
        }
      } catch {
        this.transactions = []
      }
    },

    async fetchCollectionActivities(accountNumber) {
      if (!accountNumber) return
      try {
        const { data } = await api.get('/api/collection/activities', {
          params: { accountNumber }
        })
        if (data && data.success && Array.isArray(data.result)) {
          this.collectionActivities = data.result
        } else {
          this.collectionActivities = []
        }
      } catch {
        this.collectionActivities = []
      }
    },

    async fetchGuaranteeCoverage(loanId) {
      if (!loanId) return
      try {
        const { data } = await api.get(`/api/loan/${loanId}/guarantee-coverage`)
        if (data && data.success) {
          this.guaranteeCoverage = data.result
        }
      } catch {
        this.guaranteeCoverage = null
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
      const acc = this.customer?.accountNumber
      if (acc) formData.append('accountNumber', acc)
      const compId = this.customer?.companyId
      if (compId) formData.append('companyId', compId)
      formData.append('uploadedBy', uploadedBy || '')
      const { data } = await api.post('/api/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (!data.success) throw new Error(data.message || 'Erro ao guardar documento')
      // Refrescar checklist: isKycComplete actualiza em tempo real
      if (acc) await this.fetchChecklist(acc)
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

    // ── Pagamento individual (POST /api/tranzaction) — V2 com idempotência ──
    async payInstallment(payload) {
      // Idempotency-Key: gerada POR TENTATIVA de submissão (regenerada em cada
      // abertura do modal pelo componente). Retry da MESMA tentativa reenvia a
      // mesma chave → o servidor devolve a resposta original sem duplicar.
      const headers = payload?.idempotencyKey
        ? { 'Idempotency-Key': String(payload.idempotencyKey) }
        : {}
      const body = { ...(payload || {}) }
      delete body.idempotencyKey
      const { data } = await api.post('/api/tranzaction', body, { headers })
      if (!data.success) throw new Error(data.message || 'Erro no pagamento')
      // Refresca o plano do crédito pago (payload.loanId é sempre explícito)
      if (payload?.loanId) {
        await Promise.all([this.fetchPlanFor(payload.loanId), this.fetchLoans()])
      }
      return data
    },

    // ── RENOVAÇÃO DE CRÉDITO POR PAGAMENTO DE JUROS (exclusivo 1 prestação) ──
    async fetchRenewalQuote(installmentId, params = {}) {
      this.renewalQuoteLoading = true
      try {
        const { data } = await api.get(`/api/installments/${installmentId}/renewal-quote`, {
          params
        })
        if (data.success) {
          this.renewalQuote = data.result
          return data.result
        }
        throw new Error(data.message || 'Erro ao calcular cotação de renovação')
      } finally {
        this.renewalQuoteLoading = false
      }
    },

    async fetchLoanRenewals(loanId) {
      if (!loanId) {
        this.renewals = []
        return []
      }
      this.renewalsLoading = true
      try {
        const { data } = await api.get(`/api/loans/${loanId}/renewals`)
        if (data && data.success && Array.isArray(data.result)) {
          this.renewals = data.result
          return data.result
        }
        this.renewals = []
        return []
      } catch {
        this.renewals = []
        return []
      } finally {
        this.renewalsLoading = false
      }
    },

    async renewInstallment(installmentId, formData, loanId) {
      const { data } = await api.post(`/api/installments/${installmentId}/renew`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (!data.success) throw new Error(data.message || 'Erro ao renovar contrato de crédito')
      const targetLoanId = loanId || this.contextLoan?.id || this.activeLoan?.id
      const acc = this.customer?.accountNumber
      await Promise.all([
        targetLoanId ? this.fetchPlanFor(targetLoanId) : Promise.resolve(),
        targetLoanId ? this.fetchLoanRenewals(targetLoanId) : Promise.resolve(),
        this.fetchLoans(),
        this.fetchAmortization(),
        acc ? this.fetchChecklist(acc) : Promise.resolve(),
        acc ? this.fetchTransactions(acc) : Promise.resolve()
      ])
      return data
    },

    // ── QUOTE OFICIAL server-side (V2) — mora vem do backend, não do JS ──
    async fetchQuote(installmentId, payDate) {
      this.quoteLoading = true
      try {
        const { data } = await api.get(`/api/installments/${installmentId}/quote`, {
          params: payDate ? { payDate } : {}
        })
        if (data.success) {
          this.quote = data.result
          return data.result
        }
        throw new Error(data.message || 'Erro ao calcular a quote')
      } finally {
        this.quoteLoading = false
      }
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
      this.transactions = []
      this.collectionActivities = []
      this.guarantees = []
      this.guaranteeCoverage = null
      this.simulation = null
    }
  }
})
