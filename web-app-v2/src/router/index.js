import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy load das páginas
const LandingPage = () => import('@/pages/LandingPage.vue')
const LoginPage = () => import('@/pages/auth/LoginPage.vue')
const RegisterCompanyPage = () => import('@/pages/RegisterCompanyPage.vue')
const DashboardPage = () => import('@/pages/DashboardPage.vue')
const GestorPage = () => import('@/pages/GestorPage.vue')
const CompanyPage = () => import('@/pages/CompanyPage.vue')
const SuperAdminSettingsPage = () => import('@/pages/SuperAdminSettingsPage.vue')
const CustomerListPage = () => import('@/pages/customers/CustomerListPage.vue')
const CustomerDetailPage = () => import('@/pages/customers/CustomerDetailPage.vue')
const LoanListPage = () => import('@/pages/loans/LoanListPage.vue')
// Páginas removidas: LoanDetailPage, AmortizationPage, PaymentsPage, InstallmentsPage, ReportsPage
// Funcionalidades integradas nos Mutuários (painel do mutuário) e na página de Créditos
const SettingsPage = () => import('@/pages/SettingsPage.vue')
const ProfilePage = () => import('@/pages/ProfilePage.vue')
const NotificationsPage = () => import('@/pages/NotificationsPage.vue')
const PortalLayout = () => import('@/layouts/PortalLayout.vue')
const PortalDashboardPage = () => import('@/pages/portal/PortalDashboardPage.vue')
const PortalLoansPage = () => import('@/pages/portal/PortalLoansPage.vue')
const PortalInstallmentsPage = () => import('@/pages/portal/PortalInstallmentsPage.vue')
const PortalPaymentsPage = () => import('@/pages/portal/PortalPaymentsPage.vue')
const PortalProfilePage = () => import('@/pages/portal/PortalProfilePage.vue')
const ContractDocumentsPage = () => import('@/pages/loans/ContractDocumentsPage.vue')
const ReportsBMPage = () => import('@/pages/ReportsBMPage.vue')
const InstallmentsControlPage = () => import('@/pages/InstallmentsControlPage.vue')
const PaymentsPage = () => import('@/pages/PaymentsPage.vue')
const CaixaPage = () => import('@/pages/CaixaPage.vue')
const CaixaCentralPage = () => import('@/pages/CaixaCentralPage.vue')
const BankAccountsPage = () => import('@/pages/BankAccountsPage.vue')
const CaixaHistoricoPage = () => import('@/pages/CaixaHistoricoPage.vue')
const LogsPage = () => import('@/pages/LogsPage.vue')
const SmsPendingCredentialsPage = () => import('@/pages/SmsPendingCredentialsPage.vue')

const routes = [
  // LOGIN — página inicial do sistema
  {
    path: '/',
    name: 'Login',
    component: LoginPage,
    meta: { requiresAuth: false }
  },
  // COMPATIBILIDADE — /login aponta para a página inicial (login)
  {
    path: '/login',
    redirect: '/'
  },
  // WEBSITE OFICIAL — landing de vendas isolada em /landing
  {
    path: '/landing',
    name: 'Landing',
    component: LandingPage,
    meta: { requiresAuth: false }
  },
  // CADASTRO PÚBLICO DE EMPRESA — fluxo de subscrição (landing → aprovação Super Admin)
  {
    path: '/registar-empresa',
    name: 'RegisterCompany',
    component: RegisterCompanyPage,
    meta: { requiresAuth: false }
  },
  // PORTAL DO MUTUÁRIO
  {
    path: '/portal-mutuario',
    redirect: '/portal'
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
  // CONFIGURAÇÕES SUPER ADMIN — Super Admins + Planos de Subscrição
  {
    path: '/configuracoes',
    name: 'SuperAdminSettings',
    component: SuperAdminSettingsPage,
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
    path: '/pagamentos',
    name: 'Payments',
    component: PaymentsPage,
    meta: { requiresAuth: true, allowedRoles: [1] }
  },
  {
    path: '/caixa',
    name: 'Caixa',
    component: CaixaPage,
    meta: { requiresAuth: true, allowedRoles: [1] }
  },
  // CAIXA CENTRAL — tesouraria com carteira real (cash + contas bancárias)
  {
    path: '/caixa-central',
    name: 'CaixaCentral',
    component: CaixaCentralPage,
    meta: { requiresAuth: true, allowedRoles: [1] }
  },
  // CARTEIRA REAL — CRUD de contas bancárias com saldo
  {
    path: '/bank-accounts',
    name: 'BankAccounts',
    component: BankAccountsPage,
    meta: { requiresAuth: true, allowedRoles: [1] }
  },
  {
    path: '/caixa/historico',
    name: 'CaixaHistorico',
    component: CaixaHistoricoPage,
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
    path: '/sms/pendentes',
    name: 'SmsPendingCredentials',
    component: SmsPendingCredentialsPage,
    meta: { requiresAuth: true, allowedRoles: [1, 3] }
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
  // Portal do mutuário — layout mobile-first (sem sidebar)
  {
    path: '/portal',
    component: PortalLayout,
    children: [
      { path: '', name: 'CustomerPortal', component: PortalDashboardPage, meta: { requiresAuth: true } },
      { path: 'creditos', name: 'PortalCreditos', component: PortalLoansPage, meta: { requiresAuth: true } },
      { path: 'prestacoes', name: 'PortalPrestacoes', component: PortalInstallmentsPage, meta: { requiresAuth: true } },
      { path: 'pagamentos', name: 'PortalPagamentos', component: PortalPaymentsPage, meta: { requiresAuth: true } },
      { path: 'perfil', name: 'PortalPerfil', component: PortalProfilePage, meta: { requiresAuth: true } }
    ]
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
  
  // Está logado e tenta aceder ao login — volta ao sistema
  if (to.name === 'Login' && isLoggedIn) {
    next(authStore.defaultRoute)
    return
  }

  // Logado pode ver a landing (/' ) sem redirect — só não pode ser expulso dela
  
  // Reset counter em navigations normais
  redirectCount = 0
  next()
})

export default router
