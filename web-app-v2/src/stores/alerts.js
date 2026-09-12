import { defineStore } from 'pinia'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'

/**
 * Chave estável de um alerta do portal (id do caixa + mais recente movimento).
 * Serve para o utilizador "Ignorar" sem que o alerta reapareça no próximo
 * poll enquanto nada de novo chegar.
 */
function portalAlertKey(p) {
  return `${p.registerId}:${p.latestAt || ''}:${p.count}`
}

/** Formatação MZN compacta para mensagens de alerta (11.021,74 MZN). */
function formatMzn(v) {
  return `${(Number(v) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`
}

/**
 * ALERTAS DO SISTEMA — estado central partilhado.
 *
 * Reúne os alertas operacionais (actualmente o serviço de SMS: saldo BulkSMM
 * e fila de envio) num único sítio para que o sino do navbar e qualquer
 * widget da aplicação mostrem a MESMA informação, sem chamadas duplicadas.
 *
 *  - fetchAll(): uma só chamada à API alimenta todos os alertas;
 *  - polling automático a cada 60 s enquanto há sessão activa;
 *  - hasCritical/totalAlerts alimentam o badge do sino no navbar.
 */
export const useAlertsStore = defineStore('alerts', {
  state: () => ({
    // ── SMS: carteira BulkSMM ──
    smsWallet: {
      configured: false,
      balance: null,
      currency: null,
      lowBalance: false,
      error: null
    },
    // ── SMS: fila de envio ──
    smsQueue: {
      smsEnabled: true,
      queued: 0,
      processing: 0,
      failed: 0,
      sent: 0,
      pending: 0,
      pendingByType: {}
    },
    // ── Portal: pagamentos recebidos fora de expediente (Caixa do Sistema) ──
    portalAlert: {
      // null = nada a notificar; objecto = pagamentos ainda não vistos
      data: null,
      // IDs de alertas do portal dispensados nesta sessão (não voltam a
      // aparecer enquanto o sino estiver montado — o marker real de "visto"
      // é o fecho do caixa no backend)
      _dismissedKey: null
    },
    fetching: false,
    fetchedAt: null,
    _timer: null
  }),

  getters: {
    /**
     * Lista normalizada de alertas activos — fonte única para o modal.
     * Cada alerta: { id, severity, icon, title, message, actions[] }
     * actions: [{ key, label, icon }] — o modal interpreta as chaves.
     */
    alerts(state) {
      const list = []
      const w = state.smsWallet
      const q = state.smsQueue

      // 1) SMS não configurado (credenciais ausentes)
      if (!w.configured) {
        list.push({
          id: 'sms-not-configured',
          severity: 'warning',
          icon: 'key_off',
          title: 'Serviço SMS não configurado',
          message: 'As credenciais de integração do serviço de SMS (BULKSMS_API_KEY e BULKSMS_SENDER_ID) não estão configuradas. O envio de SMS encontra-se indisponível até o Administrador configurar as credenciais no ficheiro .env do servidor.',
          actions: [{ key: 'refresh', label: 'Verificar', icon: 'refresh' }]
        })
      } else if (w.error) {
        // 2) Erro ao consultar o saldo
        list.push({
          id: 'sms-wallet-error',
          severity: 'warning',
          icon: 'cloud_off',
          title: 'Saldo BulkSMM indisponível',
          message: String(w.error),
          actions: [{ key: 'refresh', label: 'Tentar novamente', icon: 'refresh' }]
        })
      } else if (w.lowBalance) {
        // 3) Saldo a acabar
        list.push({
          id: 'sms-low-balance',
          severity: 'critical',
          icon: 'warning_amber',
          title: 'Saldo BulkSMM a acabar',
          message: `Restam ${w.balance ?? '—'} ${w.currency || ''} — compre mais unidades no BulkSMM para não interromper os envios.`,
          actions: [{ key: 'refresh', label: 'Actualizar', icon: 'refresh' }]
        })
      }

      // 4) Envio de SMS desactivado nas configurações
      if (!q.smsEnabled) {
        list.push({
          id: 'sms-disabled',
          severity: 'warning',
          icon: 'sms_failed',
          title: 'Envio de SMS desactivado',
          message: (q.pending > 0 ? `${q.pending} mensagem(ns) em espera na fila. ` : '') + 'Active nas Configurações → Dados da Empresa para os envios saírem.',
          actions: [
            { key: 'go-queue', label: 'Ver fila', icon: 'list' },
            { key: 'go-settings', label: 'Configurações', icon: 'settings' }
          ]
        })
      } else if (q.pending > 0) {
        // 5) Mensagens à espera na fila
        list.push({
          id: 'sms-queue-pending',
          severity: q.failed > 0 ? 'critical' : 'warning',
          icon: 'mark_email_unread',
          title: `${q.pending} SMS na fila`,
          message: 'À espera de saldo BulkSMM — enviadas automaticamente quando houver saldo.',
          actions: [
            { key: 'process', label: 'Processar agora', icon: 'send' },
            { key: 'go-queue', label: 'Ver fila', icon: 'list' }
          ]
        })
      }

      // 6) Pagamentos do portal fora de expediente (Caixa do Sistema).
      // Severidade "info" (roxo): não é um problema — é dinheiro que entrou
      // fora de horas e merece reconhecimento/reconciliação no Caixa Central.
      const p = state.portalAlert.data
      if (p && state.portalAlert._dismissedKey !== portalAlertKey(p)) {
        const methodLabels = { MPESA: 'M-Pesa', BANK: 'transferência', EMOLA: 'e-Mola', CASH: 'dinheiro' }
        const methodSummary = Object.entries(p.byMethod || {})
          .map(([m, v]) => `${methodLabels[m] || m}: ${formatMzn(v)}`)
          .join(' · ')
        list.push({
          id: 'portal-payment',
          severity: 'info',
          icon: 'nightlight',
          title: `Portal: ${p.count} pagamento(s) fora de expediente`,
          message:
            `Entrada(s) de ${formatMzn(p.totalIn)} recebida(s) no portal fora do expediente` +
            (methodSummary ? ` — ${methodSummary}.` : '.') +
            ' Abra/reconcilie no Caixa Central.',
          meta: p,
          actions: [
            { key: 'go-caixa', label: 'Abrir Caixa Central', icon: 'account_balance_wallet' },
            { key: 'dismiss-portal', label: 'Ignorar', icon: 'close' }
          ]
        })
      }

      return list
    },

    /** Nº de alertas activos — alimenta o badge do sino. */
    totalAlerts() {
      return this.alerts.length
    },

    /** Existe pelo menos um alerta crítico (badge vermelho piscante). */
    hasCritical() {
      return this.alerts.some(a => a.severity === 'critical')
    },

    /** Pagamentos do portal fora de expediente à espera de reconhecimento. */
    hasPortalAlert() {
      return this.alerts.some(a => a.id === 'portal-payment')
    }
  },

  actions: {
    /**
     * Busca o resumo de SMS (uma chamada alimenta carteira + fila).
     * Silenciosa: falhas não quebram a UI — mantêm o último estado.
     */
    async fetchAll() {
      const authStore = useAuthStore()
      const companyId = authStore.companyId
      if (!companyId) return
      this.fetching = true
      try {
        const { data } = await api.get('/api/sms-gateway/summary', { params: { companyId } })
        if (data?.success && data.result) {
          if (data.result.wallet) this.smsWallet = data.result.wallet
          const r = data.result
          this.smsQueue = {
            smsEnabled: r.smsEnabled ?? this.smsQueue.smsEnabled,
            queued: r.queued ?? 0,
            processing: r.processing ?? 0,
            failed: r.failed ?? 0,
            sent: r.sent ?? 0,
            pending: r.pending ?? 0,
            pendingByType: r.pendingByType ?? {}
          }
        }

        // ── Portal fora de expediente (2ª chamada, independente da SMS) ──
        // Falha aqui NÃO afecta os alertas de SMS — cada bloco é independente.
        try {
          const resp = await api.get('/api/cash-registers/portal-alert')
          const payload = resp?.data?.result || null
          this.portalAlert.data = payload
          if (!payload) this.portalAlert._dismissedKey = null
        } catch {
          // silencioso — sem caixa/portal configurado, mantém o último estado
        }

        this.fetchedAt = new Date()
      } catch (e) {
        // silencioso — mantém último estado conhecido
      } finally {
        this.fetching = false
      }
    },

    /** Processa a fila de SMS agora (acção do modal/widgets). */
    async processQueue() {
      const authStore = useAuthStore()
      const companyId = authStore.companyId
      const { data } = await api.post('/api/sms-gateway/process', { companyId })
      await this.fetchAll()
      return data?.result || data?.summary || {}
    },

    /**
     * Ignorar o alerta actual do portal (acção do sino). O alerta deixa de
     * aparecer nesta sessão; reaparece só se chegar mais um pagamento novo.
     * O "visto" definitivo é o fecho do caixa no Caixa Central.
     */
    dismissPortalAlert() {
      if (this.portalAlert.data) {
        this.portalAlert._dismissedKey = portalAlertKey(this.portalAlert.data)
      }
    },

    /** Polling automático a cada 60 s. Idempotente — inicia uma só vez. */
    startPolling() {
      if (this._timer) return
      this.fetchAll()
      this._timer = setInterval(() => this.fetchAll(), 60000)
    },

    stopPolling() {
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
    }
  }
})
