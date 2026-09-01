import { defineStore } from 'pinia'
import { api } from '@/boot/axios'
import { logLogin, logLogout } from '@/utils/logger'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    loading: false,
    error: null
  }),

  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,
    userRole: (state) => state.user?.userRole ?? null,
    userName: (state) => state.user?.name ?? '',
    companyId: (state) => state.user?.companyId ?? null,
    
    // Verificar se é admin (role 1)
    isAdmin: (state) => state.user?.userRole === 1,
    
    // Verificar se é gestor (role 3)
    isGestor: (state) => state.user?.userRole === 3,
    
    // Rota de redirecionamento baseada no role
    defaultRoute: (state) => {
      // Mutuário (sem userRole)
      if (state.user?.isCustomer) return '/portal'
      const role = state.user?.userRole
      if (role === 3) return '/gestor'
      if (role === 0) return '/company'
      if (role >= 1) return '/dashboard'
      return '/'
    }
  },

  actions: {
    /**
     * Login do staff (Admin/Gestor/Operador)
     */
    async login(email, password) {
      this.loading = true
      this.error = null
      
      try {
        const { data } = await api.post('api/login', {
          email: email.trim(),
          password: password.trim()
        })
        
        if (data.success) {
          const user = data.result[0]
          
          // Guardar no state
          this.user = user
          this.token = user.token
          
          // Guardar no localStorage
          localStorage.setItem('applicationMicroToken', user.token)
          localStorage.setItem('user', JSON.stringify(user))
          
          // Configurar header default do axios
          api.defaults.headers.common['Authorization'] = `Bearer ${user.token}`
          
          // Registar log de login
          logLogin(user)
          
          return { success: true, user }
        } else {
          const message = data.message || 'Credenciais inválidas'
          this.error = message
          return { success: false, message }
        }
      } catch (error) {
        const message = error.response?.data?.message || 
                       error.message || 
                       'Erro ao conectar ao servidor'
        this.error = message
        return { success: false, message }
      } finally {
        this.loading = false
      }
    },

    /**
     * Login do mutuário (customer)
     */
    async loginAsCustomer(phone, password) {
      this.loading = true
      this.error = null
      
      try {
        const { data } = await api.post('/api/customer/login/', {
          phone: phone.trim(),
          password: password.trim()
        })
        
        if (data.success) {
          const customer = data.result[0]
          const token = data.token
          
          // Guardar no state
          this.user = { ...customer, token, isCustomer: true }
          this.token = token
          
          // Guardar no localStorage
          localStorage.setItem('applicationMicroToken', token)
          localStorage.setItem('customer', JSON.stringify(customer))
          localStorage.setItem('isCustomerSession', 'true')
          
          // Configurar header default do axios
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          return { success: true, customer, isCustomer: true }
        } else {
          const message = data.message || 'Credenciais inválidas'
          this.error = message
          return { success: false, message }
        }
      } catch (error) {
        const message = error.response?.data?.message || 
                       error.message || 
                       'Erro ao conectar ao servidor'
        this.error = message
        return { success: false, message }
      } finally {
        this.loading = false
      }
    },

    /**
     * Logout
     */
    logout() {
      // Registar log de logout antes de limpar
      if (this.user) {
        logLogout(this.user)
      }
      
      // Limpar state
      this.user = null
      this.token = null
      this.error = null
      
      // Limpar localStorage
      localStorage.removeItem('applicationMicroToken')
      localStorage.removeItem('user')
      localStorage.removeItem('customer')
      localStorage.removeItem('isCustomerSession')
      
      // Limpar header do axios
      delete api.defaults.headers.common['Authorization']
    },

    /**
     * Restaurar sessão do localStorage
     */
    restoreSession() {
      const token = localStorage.getItem('applicationMicroToken')
      const userStr = localStorage.getItem('user')
      const customerStr = localStorage.getItem('customer')
      const isCustomerSession = localStorage.getItem('isCustomerSession') === 'true'
      
      if (token) {
        this.token = token
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        if (isCustomerSession && customerStr) {
          try {
            const customer = JSON.parse(customerStr)
            this.user = { ...customer, token, isCustomer: true }
          } catch {
            this.logout()
          }
        } else if (userStr) {
          try {
            this.user = JSON.parse(userStr)
          } catch {
            this.logout()
          }
        }
      }
    },

    /**
     * Limpar erro
     */
    clearError() {
      this.error = null
    }
  },

  // Persistir apenas dados essenciais
  persist: {
    paths: ['token', 'user']
  }
})
