import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy load das páginas
const LoginPage = () => import('@/pages/auth/LoginPage.vue')
const DashboardPage = () => import('@/pages/DashboardPage.vue')
const GestorPage = () => import('@/pages/GestorPage.vue')
const CompanyPage = () => import('@/pages/CompanyPage.vue')
const CustomerListPage = () => import('@/pages/customers/CustomerListPage.vue')
const CustomerDetailPage = () => import('@/pages/customers/CustomerDetailPage.vue')
const LoanListPage = () => import('@/pages/loans/LoanListPage.vue')

const LoanDetailPage = () => import('@/pages/loans/LoanDetailPage.vue')
const AmortizationPage = () => import('@/pages/loans/AmortizationPage.vue')
// Páginas removidas: PaymentsPage, InstallmentsPage, ReportsPage
// Funcionalidades integradas nos Mutuários
const SettingsPage = () => import('@/pages/SettingsPage.vue')
const ProfilePage = () => import('@/pages/ProfilePage.vue')
const NotificationsPage = () => import('@/pages/NotificationsPage.vue')
const CustomerPortalPage = () => import('@/pages/CustomerPortalPage.vue')
const ContractDocumentsPage = () => import('@/pages/loans/ContractDocumentsPage.vue')
const ReportsBMPage = () => import('@/pages/ReportsBMPage.vue')
const InstallmentsControlPage = () => import('@/pages/InstallmentsControlPage.vue')
const LogsPage = () => import('@/pages/LogsPage.vue')

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true, allowedRoles: [1, 2] }
  },
  // Gestor usa o próprio painel com grelha de prestações
  {
    path: '/gestor',
    name: 'Gestor',
    component: GestorPage,
    meta: { requiresAuth: true, allowedRoles: [3] }
  },
  {
    path: '/company',
    name: 'Company',
    component: CompanyPage,
    meta: { requiresAuth: true, allowedRoles: [0] }
  },
  {
    path: '/mutuarios',
    name: 'CustomerList',
    component: CustomerListPage,
    meta: { requiresAuth: true, allowedRoles: [1, 2, 3] }
  },
  {
    path: '/mutuarios/:accountNumber',
    name: 'CustomerDetail',
    component: CustomerDetailPage,
    meta: { requiresAuth: true, allowedRoles: [1, 2, 3] }
  },
  {
    path: '/loans',
    name: 'LoanList',
    component: LoanListPage,
    meta: { requiresAuth: true, allowedRoles: [1, 2, 3] }
  },

  {
    path: '/loans/:id',
    name: 'LoanDetail',
    component: LoanDetailPage,
    meta: { requiresAuth: true, allowedRoles: [1, 2, 3] }
  },
  {
    path: '/loans/:id/amortization',
    name: 'LoanAmortization',
    component: AmortizationPage,
    meta: { requiresAuth: true, allowedRoles: [1, 2, 3] }
  },
  {
    path: '/loans/:id/documents',
    name: 'LoanDocuments',
    component: ContractDocumentsPage,
    meta: { requiresAuth: true, allowedRoles: [1, 2, 3] }
  },

  {
    path: '/admin/installments',
    name: 'InstallmentsControl',
    component: InstallmentsControlPage,
    meta: { requiresAuth: true, allowedRoles: [1] }
  },
  {
    path: '/reports/banco-mocambique',
    name: 'ReportsBM',
    component: ReportsBMPage,
    meta: { requiresAuth: true, allowedRoles: [1] }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsPage,
    meta: { requiresAuth: true, allowedRoles: [1] }
  },
  {
    path: '/logs',
    name: 'Logs',
    component: LogsPage,
    meta: { requiresAuth: true, allowedRoles: [1] }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: NotificationsPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/portal',
    name: 'CustomerPortal',
    component: CustomerPortalPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
let redirectCount = 0
const MAX_REDIRECTS = 5

router.beforeEach((to, from, next) => {
  // Proteger contra loops de redirect
  redirectCount++
  if (redirectCount > MAX_REDIRECTS) {
    redirectCount = 0
    console.error('Too many redirects, stopping navigation')
    next(false)
    return
  }

  const authStore = useAuthStore()
  
  // Restaurar sessão se necessário
  if (!authStore.isLoggedIn) {
    const hasToken = localStorage.getItem('applicationMicroToken')
    const hasPiniaToken = localStorage.getItem('auth')
    if (hasToken || hasPiniaToken) {
      authStore.restoreSession()
    }
  }
  
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isLoggedIn = authStore.isLoggedIn
  const userRole = authStore.userRole
  
  // Rota requer autenticação
  if (requiresAuth) {
    if (!isLoggedIn) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
    
    // Verificar se tem permissão para a rota
    const allowedRoles = to.meta.allowedRoles
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      const redirect = authStore.defaultRoute
      // Evitar redirect para a mesma rota
      if (redirect !== to.fullPath) {
        next(redirect)
      } else {
        next()
      }
      return
    }
  }
  
  // Está logado e tenta aceder ao login
  if (to.name === 'Login' && isLoggedIn) {
    next(authStore.defaultRoute)
    return
  }
  
  // Reset counter em navigations normais
  redirectCount = 0
  next()
})

export default router
