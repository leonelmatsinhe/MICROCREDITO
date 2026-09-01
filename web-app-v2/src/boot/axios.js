import axios from 'axios'

// Criar instância do Axios com configuração base
const api = axios.create({
  baseURL: '/',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('applicationMicroToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Flag para evitar loop de redirecionamento
let isRedirecting = false

// Response interceptor - tratar erros globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Erro 401 - Não autorizado (token expirado/inválido)
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true

      // Limpar TODOS os dados de autenticação (localStorage + Pinia)
      localStorage.removeItem('applicationMicroToken')
      localStorage.removeItem('user')
      localStorage.removeItem('customer')
      localStorage.removeItem('isCustomerSession')
      // Limpar pinia persisted state
      localStorage.removeItem('auth')

      // Limpar header do axios
      delete api.defaults.headers.common['Authorization']

      // Redirecionar para login apenas se não estiver já lá
      const currentPath = window.location.pathname
      if (currentPath !== '/' && currentPath !== '') {
        window.location.href = '/'
      }

      // Reset flag após um tick
      setTimeout(() => { isRedirecting = false }, 1000)
    }

    // Erro de timeout
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.message)
    }

    // Erro de rede
    if (!error.response) {
      console.error('Network error:', error.message)
    }

    return Promise.reject(error)
  }
)

export { api }
export default api
