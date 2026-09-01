/**
 * Activity Tracker - Monitora interacções do usuário
 * 
 * - Renova o token a cada 5 minutos se houver actividade
 * - Fecha sessão após 10 minutos de inactividade
 * - Avisa o usuário aos 8 minutos de inactividade
 */

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutos
const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutos
const WARNING_TIME = 8 * 60 * 1000 // 8 minutos (aviso)

class ActivityTracker {
  constructor() {
    this.lastActivity = Date.now()
    this.lastRefresh = Date.now()
    this.inactivityTimer = null
    this.refreshTimer = null
    this.warningTimer = null
    this.isActive = false
    this.onLogout = null
    this.onWarning = null
    this.onTokenRefreshed = null
    this.events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
  }

  /**
   * Iniciar o tracker
   */
  start({ onLogout, onWarning, onTokenRefreshed }) {
    if (this.isActive) return

    this.onLogout = onLogout
    this.onWarning = onWarning
    this.onTokenRefreshed = onTokenRefreshed
    this.isActive = true
    this.lastActivity = Date.now()
    this.lastRefresh = Date.now()

    // Bind dos eventos de actividade
    this.handleActivity = () => {
      this.lastActivity = Date.now()
    }

    this.events.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true })
    })

    // Timer de refresh automático (a cada 5 min)
    this.refreshTimer = setInterval(() => {
      this.checkAndRefresh()
    }, REFRESH_INTERVAL)

    // Timer de inactividade (verifica a cada 30s)
    this.inactivityTimer = setInterval(() => {
      this.checkInactivity()
    }, 30000)

    console.log('[ActivityTracker] Iniciado')
  }

  /**
   * Parar o tracker
   */
  stop() {
    if (!this.isActive) return

    this.events.forEach(event => {
      document.removeEventListener(event, this.handleActivity)
    })

    if (this.inactivityTimer) clearInterval(this.inactivityTimer)
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    if (this.warningTimer) clearTimeout(this.warningTimer)

    this.isActive = false
    console.log('[ActivityTracker] Parado')
  }

  /**
   * Verificar inactividade e agir
   */
  checkInactivity() {
    const now = Date.now()
    const timeSinceActivity = now - this.lastActivity

    // Se passou o timeout, fazer logout
    if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
      console.log('[ActivityTracker] Sessão expirada por inactividade')
      this.stop()
      if (this.onLogout) this.onLogout()
      return
    }

    // Se está no aviso (8 min) e ainda não avisou
    if (timeSinceActivity >= WARNING_TIME) {
      const remaining = Math.ceil((INACTIVITY_TIMEOUT - timeSinceActivity) / 60000)
      console.log(`[ActivityTracker] Aviso: sessão expira em ${remaining} minuto(s)`)
      if (this.onWarning) this.onWarning(remaining)
    }
  }

  /**
   * Verificar e renovar token se necessário
   */
  async checkAndRefresh() {
    const now = Date.now()
    const timeSinceActivity = now - this.lastActivity

    // Só renovar se houve actividade recente (últimos 5 min)
    if (timeSinceActivity < REFRESH_INTERVAL) {
      await this.refreshToken()
    }
  }

  /**
   * Renovar o token
   */
  async refreshToken() {
    try {
      const token = localStorage.getItem('applicationMicroToken')
      if (!token) return

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.token) {
          localStorage.setItem('applicationMicroToken', data.token)
          this.lastRefresh = Date.now()
          console.log('[ActivityTracker] Token renovado')
          if (this.onTokenRefreshed) this.onTokenRefreshed(data.token)
        }
      }
    } catch (error) {
      console.error('[ActivityTracker] Erro ao renovar token:', error)
    }
  }

  /**
   * Obter tempo restante de sessão (em ms)
   */
  getTimeRemaining() {
    const timeSinceActivity = Date.now() - this.lastActivity
    return Math.max(0, INACTIVITY_TIMEOUT - timeSinceActivity)
  }

  /**
   * Reset manual do timer (ex: após acção importante)
   */
  reset() {
    this.lastActivity = Date.now()
  }
}

// Instância singleton
export const activityTracker = new ActivityTracker()
