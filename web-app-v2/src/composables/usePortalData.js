import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'

// Estado partilhado entre as páginas do portal (mesma instância durante a sessão)
const customer = ref(null)
const summary = ref({ totalLoans: 0, activeLoans: 0, activeLoanAmount: 0, pendingLoans: 0, pendingAmount: 0, totalDisbursed: 0, totalPaid: 0, totalDebt: 0 })
const loans = ref([])
const allPayments = ref([])
const collectAccount = ref(null)
const loading = ref(true)
const loaded = ref(false)

export function usePortalData() {
  const $q = useQuasar()
  const authStore = useAuthStore()
  const companyStore = useCompanyStore()

  // ---- Créditos / dívida ----
  const hasActiveLoan = computed(() => Number(summary.value.activeLoans || 0) > 0)
  const hasPendingRequest = computed(() => Number(summary.value.pendingLoans || 0) > 0)
  const hasOutstandingDebt = computed(() => Number(summary.value.totalDebt || 0) > 0)
  const canRequestCredit = computed(() => !hasPendingRequest.value && !hasOutstandingDebt.value)
  const loanRequestCapacity = computed(() => (Number(customer.value?.monthlySalary) || 0) / 3)

  // ---- Próximas prestações (30 dias) ----
  const upcomingInstallments = computed(() => {
    const result = []
    const now = new Date()
    loans.value.forEach(loan => {
      if (Number(loan.status) !== 1) return
      loan.installments.forEach(inst => {
        if (inst.status !== 1) {
          const dueDate = new Date(inst.dueDate)
          const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
          if (diffDays > 0 && diffDays <= 30) {
            result.push({ ...inst, loanId: loan.id, totalInstallments: loan.numberOfInstallments, daysUntilDue: diffDays, lateFee: 0 })
          }
        }
      })
    })
    return result.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5)
  })

  // ---- Todas as prestações ----
  const allInstallments = computed(() => {
    const result = []
    loans.value.forEach(loan => {
      loan.installments.forEach(inst => {
        const installmentValue = Number(inst.installment) || 0
        const latePaymentInterest = Number(inst.latePaymentInterest) || 0
        const lateFee = latePaymentInterest > 0 ? latePaymentInterest : Number(inst.lateFee) || 0
        result.push({
          ...inst,
          loanId: loan.id,
          daysOverdue: Number(inst.lateDays) || 0,
          lateFee,
          totalToPay: Math.round((installmentValue + latePaymentInterest) * 100) / 100
        })
      })
    })
    return result.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  })

  function installmentPayments(inst) {
    return allPayments.value.filter(p => Number(p.amortizationLoanId) === Number(inst.id))
  }
  function installmentPaidLateFee(inst) {
    return installmentPayments(inst).reduce((s, p) => s + (Number(p.latePaymentInterest) || 0), 0)
  }
  function installmentPaidDate(inst) {
    const list = installmentPayments(inst)
    if (!list.length) return '—'
    return formatDate(list[0].paymentDate || list[0].createdAt)
  }
  function installmentReference(inst) {
    const list = installmentPayments(inst)
    if (!list.length) return '—'
    return list[0].reference || '—'
  }

  // ---- Helpers ----
  function formatMoney(val) {
    // Formato MZN em pt-MZ sem dependência do ICU do browser: 90 000,00 MZN
    const n = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val) || 0)
    return `${n} MZN`
  }
  function formatDate(dateStr) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }
  function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }
  function getLoanStatusColor(status) {
    const s = Number(status)
    return ({ 0: 'orange', 1: 'positive', 2: 'negative', '-1': 'negative', 3: 'grey' })[s] || 'grey'
  }
  function getLoanStatusText(status) {
    const s = Number(status)
    return ({ 0: 'Pendente', 1: 'Activo', 2: 'Rejeitado', '-1': 'Rejeitado', 3: 'Liquidado' })[s] || 'Desconhecido'
  }
  function getInstallmentStatusText(status) {
    const s = Number(status)
    return s === 1 ? 'Pago' : s === -1 ? 'Parcial' : 'Pendente'
  }
  function installmentAvatarColor(inst) {
    const s = Number(inst.status)
    if (s === 1) return 'positive'
    if (s === -1) return 'warning'
    return Number(inst.lateDays) > 0 ? 'negative' : 'orange'
  }
  function installmentCardClass(inst) {
    const s = Number(inst.status)
    if (s === 1) return 'is-paid'
    if (Number(inst.lateDays) > 0) return 'is-overdue'
    return ''
  }
  function ordinalNumber(order) {
    return String(order == null ? '' : order).replace(/[^0-9]/g, '')
  }
  function ordinalBadge(order) {
    const num = ordinalNumber(order)
    return num ? `${num}ª` : String(order == null ? '' : order)
  }
  function paymentMethodLabel(m) {
    const map = { 1: 'Numerário', 2: 'Cheque', 3: 'Transferência', 4: 'Depósito', 6: 'M-Pesa USSD', 7: 'M-Pesa' }
    return map[Number(m)] || ''
  }
  function normalizeMpesaPhone(raw) {
    let digits = String(raw || '').replace(/\D/g, '')
    if (digits.startsWith('00')) digits = digits.slice(2)
    if (digits.startsWith('258')) digits = digits.slice(3)
    if (/^(84|85)/.test(digits)) digits = '258' + digits
    return digits
  }

  // ---- Comprovativo (recibo) de um pagamento ----
  // O backend emite o recibo legal na primeira abertura, pelo que TODOS os
  // pagamentos têm comprovativo — mesmo os anteriores à numeração sequencial.
  async function downloadPaymentRecibo(paymentId, numero) {
    const user = authStore.user
    if (!user?.companyId || !user?.id || !paymentId) {
      $q.notify({ type: 'negative', message: 'Sessão inválida. Volte a entrar.', position: 'top' })
      return false
    }
    try {
      const response = await api.get(
        `/api/portal/${user.companyId}/${user.id}/payments/${paymentId}/recibo/pdf`,
        { params: { download: 1 }, responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Recibo-${numero || paymentId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => window.URL.revokeObjectURL(url), 30000)
      $q.notify({ type: 'positive', message: numero ? `Recibo ${numero}` : 'Comprovativo gerado', position: 'top' })
      return true
    } catch (e) {
      console.error('Erro ao obter o recibo do pagamento:', e)
      let message = 'Erro ao obter o comprovativo do pagamento'
      // Com responseType 'blob' o erro também chega como Blob — lê-se o JSON.
      const payload = e?.response?.data
      if (payload instanceof Blob) {
        try {
          const parsed = JSON.parse(await payload.text())
          if (parsed?.message) message = parsed.message
        } catch { /* resposta não-JSON */ }
      } else if (payload?.message) {
        message = payload.message
      }
      $q.notify({ type: 'negative', message, position: 'top' })
      return false
    }
  }

  // ---- Carregamento (API igual ao original) ----
  async function loadData(force = false) {
    if (loaded.value && !force) { loading.value = false; return }
    loading.value = true
    try {
      const user = authStore.user
      if (!user) return
      const { data } = await api.get(`/api/portal/${user.companyId}/${user.id}/dashboard`)
      if (data.success) {
        customer.value = data.customer
        summary.value = data.summary
        loans.value = data.loans || []
        allPayments.value = data.payments || []
        collectAccount.value = data.collectAccount || null
        loaded.value = true
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e)
      $q.notify({ type: 'negative', message: 'Erro ao carregar dados do portal', position: 'top' })
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    loaded.value = false
    await loadData()
  }

  function ensureCompanyLoaded() {
    const user = authStore.user
    if (user?.companyId) companyStore.fetchCompany(user.companyId)
  }

  return {
    // estado
    customer, summary, loans, allPayments, collectAccount, loading,
    // computed
    hasActiveLoan, hasPendingRequest, hasOutstandingDebt, canRequestCredit, loanRequestCapacity,
    upcomingInstallments, allInstallments,
    // acções
    loadData, refresh, ensureCompanyLoaded, downloadPaymentRecibo,
    // helpers
    installmentPayments, installmentPaidLateFee, installmentPaidDate, installmentReference,
    formatMoney, formatDate, getInitials, getLoanStatusColor, getLoanStatusText,
    getInstallmentStatusText, installmentAvatarColor, installmentCardClass,
    ordinalNumber, ordinalBadge, paymentMethodLabel, normalizeMpesaPhone
  }
}
