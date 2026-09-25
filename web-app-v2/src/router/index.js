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
const LoanDetailPage = () => import('@/pages/loans/LoanDetailPage.vue')
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

// CARTEIRAS DE FINANCIAMENTO (dinheiro analítico) + PARCEIROS FINANCIADORES
// FINANCIAMENTO (carteiras + taxas) e EQUIPA E PARCEIROS — páginas unificadas
const FinancingPage = () => import('@/pages/FinancingPage.vue')
const TeamPage = () => import('@/pages/TeamPage.vue')
const FinancierReportsPage = () => import('@/pages/FinancierReportsPage.vue')
// VALIDAÇÃO PÚBLICA DO RECIBO — destino do QR Code impresso (sem sessão)
const ValidarReciboPage = () => import('@/pages/ValidarReciboPage.vue')

// PORTAL DO PARCEIRO FINANCIADOR (userRole 4) — só a carteira do parceiro
const PartnerLayout = () => import('@/layouts/PartnerLayout.vue')
const PartnerDashboardPage = () => import('@/pages/partner/PartnerDashboardPage.vue')
const PartnerLoansPage = () => import('@/pages/partner/PartnerLoansPage.vue')
const PartnerInstallmentsPage = () => import('@/pages/partner/PartnerInstallmentsPage.vue')
const PartnerMoraPage = () => import('@/pages/partner/PartnerMoraPage.vue')
const PartnerPaymentsPage = () => import('@/pages/partner/PartnerPaymentsPage.vue')
const PartnerStatementPage = () => import('@/pages/partner/PartnerStatementPage.vue')
const PartnerRecibosPage = () => import('@/pages/partner/PartnerRecibosPage.vue')

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
  // VALIDAÇÃO PÚBLICA DO RECIBO — aberta pelo QR Code (hash SHA-256)
  {
    path: '/validar',
    name: 'ValidarRecibo',
    component: ValidarReciboPage,
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

  // DETALHE DO CRÉDITO — pagamentos e recibos + prestações
  {
    path: '/loans/:id',
    name: 'LoanDetail',
    component: LoanDetailPage,
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
  // FINANCIAMENTO — Carteiras de financiamento + Taxas de juro (página única)
  {
    path: '/financiamento',
    name: 'Financing',
    component: FinancingPage,
    meta: { requiresAuth: true, allowedRoles: [1, 2] }
  },
  // Rotas antigas continuam a funcionar (marcadores/links guardados)
  { path: '/carteiras-financiamento', redirect: { name: 'Financing' } },
  // EQUIPA E PARCEIROS — utilizadores MBRM + parceiros financiadores (userRole 4)
  {
    path: '/equipe',
    name: 'Team',
    component: TeamPage,
    meta: { requiresAuth: true, allowedRoles: [1, 2] }
  },
  { path: '/parceiros-financiadores', redirect: { name: 'Team', query: { tab: 'parceiros' } } },
  // RELATÓRIO DE FINANCIADOR (isolado por carteira) — Admin
  {
    path: '/reports/financiadores',
    name: 'FinancierReports',
    component: FinancierReportsPage,
    meta: { requiresAuth: true, allowedRoles: [1, 2] }
  },
  // PORTAL DO PARCEIRO FINANCIADOR (userRole 4) — layout próprio, só leitura
  {
    path: '/parceiro',
    component: PartnerLayout,
    meta: { requiresAuth: true, allowedRoles: [4] },
    children: [
      { path: '', redirect: '/parceiro/dashboard' },
      { path: 'dashboard', name: 'PartnerDashboard', component: PartnerDashboardPage },
      { path: 'creditos', name: 'PartnerCreditos', component: PartnerLoansPage },
      { path: 'prestacoes-pagas', name: 'PartnerPrestacoesPagas', component: PartnerInstallmentsPage, props: { scope: 'pagas' } },
      { path: 'prestacoes-pendentes', name: 'PartnerPrestacoesPendentes', component: PartnerInstallmentsPage, props: { scope: 'pendentes' } },
      { path: 'mora', name: 'PartnerMora', component: PartnerMoraPage },
      { path: 'recebimentos', name: 'PartnerRecebimentos', component: PartnerPaymentsPage },
      { path: 'extrato', name: 'PartnerExtrato', component: PartnerStatementPage },
      { path: 'recibos', name: 'PartnerRecibos', component: PartnerRecibosPage }
    ]
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage,
    meta: { requiresAuth: true, allowedRoles: [0, 1, 2, 3] }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: NotificationsPage,
    meta: { requiresAuth: true, allowedRoles: [0, 1, 2, 3] }
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
