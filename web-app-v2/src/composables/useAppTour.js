import { computed, ref } from 'vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { PAGE_TOURS, findPageTour, pageToursForRole } from '@/data/pageTours'

/**
 * TOUR GUIADO / ONBOARDING
 * ────────────────────────
 * Percursos passo-a-passo (driver.js) que apontam para elementos reais da
 * aplicação através de atributos `data-tour` nos componentes. O tour atravessa
 * páginas: quando um passo vive noutra rota, a navegação é feita pelo router e o
 * overlay é reaberto sobre o alvo — o utilizador nunca precisa de navegar sozinho.
 *
 * O estado é um singleton de módulo: a sidebar, a navbar, os layouts e o botão de
 * ajuda partilham exactamente o mesmo tour em execução.
 */

/** localStorage: { "<role>": <timestamp> } — um pedido de tour por perfil/dispositivo. */
const SEEN_KEY = 'mbr_tour_seen_v1'

/**
 * localStorage dos tours de página já vistos:
 *   { "u12": { "caixa": 1730000000000, "mutuarios": ... } }
 * Indexado pelo utilizador (id da conta, com o perfil como fallback) para dois
 * colegas no mesmo computador não partilharem o progresso, e pela página (id
 * estável) para o alerta azul «ainda não tem passos» nunca voltar a aparecer.
 */
const PAGE_SEEN_KEY = 'mbr_page_tours_v1'

/** Passos que se repetem em todos os perfis de staff (menu + navbar). */
const LAYOUT_STEPS = {
  brand: {
    el: '[data-tour="brand"]',
    title: 'A sua empresa',
    text: 'Aqui vê o logótipo, o nome da empresa e o seu perfil de acesso. O botão ⇤ colapsa o menu para o modo ícone (mais espaço no ecrã).',
    side: 'right',
    align: 'start'
  },
  menuSearch: {
    el: '[data-tour="menu-search"]',
    title: 'Buscar no menu',
    text: 'Com muitas secções, escreva aqui o que procura — o menu filtra em tempo real. Atalho: <strong>Ctrl + K</strong> (⌘ + K no Mac).',
    side: 'right'
  },
  menuGroups: {
    el: '[data-tour="menu-groups"]',
    title: 'Menu agrupado por área',
    text: 'O menu está dividido por áreas de negócio (Geral, Gestão de Crédito, Financeiro, Financiamento, Relatórios, Sistema). A estrela ☆ em cada item guarda-o em <strong>Favoritos</strong>, no topo.',
    side: 'right'
  },
  navbarTitle: {
    el: '[data-tour="navbar-title"]',
    title: 'Onde estou',
    text: 'O título e as migalhas mostram sempre a página actual — útil quando salta de um mutuário para os créditos ou para a caixa.',
    side: 'bottom'
  },
  navbarAlerts: {
    el: '[data-tour="navbar-alerts"]',
    title: 'Alertas do sistema',
    text: 'O sino concentra avisos operacionais: prestações vencidas, caixa por abrir, credenciais SMS pendentes e outros bloqueios do dia.',
    side: 'bottom'
  },
  navbarUser: {
    el: '[data-tour="navbar-user"]',
    title: 'Perfil, tema e saída',
    text: 'Aqui muda o tema claro/escuro, abre o seu perfil e termina a sessão. As notificações ficam no sino ao lado.',
    side: 'bottom',
    align: 'end'
  },
  tourButton: {
    el: '[data-tour="tour-button"]',
    title: 'Precisa de rever?',
    text: 'Este botão <strong>?</strong> reabre o tour guiado, o tour rápido ou apenas os passos desta página — sempre que quiser.',
    side: 'left'
  }
}

/** Blocos reutilizáveis pelos percursos (por página). */
const PAGE_STEPS = {
  dashFilters: {
    el: '[data-tour="dash-filters"]',
    route: '/dashboard',
    title: 'Filtros do painel',
    text: 'Escolha o período, a carteira de financiamento e o gestor. Todos os KPIs, gráficos e o ranking abaixo passam a reflectir esse filtro.',
    side: 'bottom'
  },
  dashKpis: {
    el: '[data-tour="dash-kpis"]',
    route: '/dashboard',
    title: 'Indicadores da carteira',
    text: 'Resumo executivo: capital em dívida, desembolsado no período, recebido, mora, PAR e tendência face ao mês anterior.',
    side: 'bottom'
  },
  customersKpis: {
    el: '[data-tour="customers-kpis"]',
    route: '/mutuarios',
    title: 'Mutuários',
    text: 'Toda a carteira de clientes: activos, inactivos, empresas e particulares. Cada ficha tem créditos, prestações, documentos (KYC), garantias e o histórico de cobrança.',
    side: 'bottom'
  },
  customersFilters: {
    el: '[data-tour="customers-filters"]',
    route: '/mutuarios',
    title: 'Pesquisar e criar mutuário',
    text: 'Pesquise por nome, conta ou telefone e use <strong>Novo Mutuário</strong> para registar o cliente (dados, KYC e garantias) antes de conceder crédito.',
    side: 'bottom'
  },
  loansHeader: {
    el: '[data-tour="loans-header"]',
    route: '/loans',
    title: 'Créditos',
    text: 'Aqui vive o ciclo completo do crédito: pendentes de aprovação, desembolsados, terminados e rejeitados. <strong>Conceder Crédito</strong> abre a simulação (capital, prazo, taxa e garantias) e exporta PDF/Excel.',
    side: 'bottom'
  },
  cobrancaFilters: {
    el: '[data-tour="cobranca-filters"]',
    route: '/cobranca',
    title: 'Cobrança de campo',
    text: 'Filtre por dias de atraso e pesquise. Em cada linha registra <strong>visita domiciliária</strong>, ligação ou promessa de pagamento (com localização GPS opcional) — o histórico fica no mutuário.',
    side: 'bottom'
  },
  carteiraKpis: {
    el: '[data-tour="carteira-kpis"]',
    route: '/carteira',
    title: 'Carteira e risco',
    text: 'Total em dívida, PAR 30 (atrasos superiores a 30 dias), a receber hoje e promessas do dia. No Admin há também o ranking por gestor.',
    side: 'bottom'
  },
  installmentsBody: {
    el: '[data-tour="installments-body"]',
    route: '/admin/installments',
    title: 'Controle de prestações',
    text: 'Todas as prestações da empresa num só ecrã: estado, datas, atrasos e valores. É a ferramenta de acompanhamento diário do plano de pagamentos.',
    side: 'bottom'
  },
  paymentsFilters: {
    el: '[data-tour="payments-filters"]',
    route: '/pagamentos',
    title: 'Pagamentos',
    text: 'Todos os pagamentos recebidos, por data, método e operador. Abra a linha para ver o recibo e a alocação às prestações.',
    side: 'bottom'
  },
  caixaBody: {
    el: '[data-tour="caixa-body"]',
    route: '/caixa',
    title: 'Caixa do dia',
    text: 'O caixa é obrigatório para operar: abre o dia com o fundo inicial e fecha com a contagem. Desembolsos, reembolsos e despesas passam por aqui — é o diário de auditoria.',
    side: 'bottom'
  },
  caixaCentral: {
    el: '[data-tour="caixa-central"]',
    route: '/caixa-central',
    title: 'Caixa Central (tesouraria)',
    text: 'Visão de tesouraria: dinheiro em caixa + contas bancárias, transferências entre contas e reconciliação. É a ponte entre o caixa operacional e o banco.',
    side: 'bottom'
  },
  bankHeader: {
    el: '[data-tour="bank-header"]',
    route: '/bank-accounts',
    title: 'Contas bancárias (dinheiro real)',
    text: 'Cada conta tem saldo real. Desembolsos e reembolsos debitam/creditam estas contas — os saldos das carteiras de financiamento são analíticos e vivem em Financiamento.',
    side: 'bottom'
  },
  financingTabs: {
    el: '[data-tour="financing-tabs"]',
    route: '/financiamento',
    title: 'Carteiras e Taxas',
    text: 'Origem do capital (fundos MBRM e parceiros financiadores) e as taxas de juro de cada carteira. Define também a que relatório cada carteira pertence (BM ou financiador).',
    side: 'bottom'
  },
  teamHeader: {
    el: '[data-tour="team-header"]',
    route: '/equipe',
    title: 'Equipa e parceiros',
    text: 'Utilizadores MBRM (Admin, Gestor, Operador) e parceiros financiadores na mesma página. O parceiro tem portal próprio e só vê a sua carteira.',
    side: 'bottom'
  },
  bmForm: {
    el: '[data-tour="bm-form"]',
    route: '/reports/banco-mocambique',
    title: 'Relatório do Banco de Moçambique',
    text: 'Escolha o período e gere o relatório: produção, carteira, PAR e mora no formato do BM, com exportação para PDF e Excel.',
    side: 'bottom'
  },
  logsFilters: {
    el: '[data-tour="logs-filters"]',
    route: '/logs',
    title: 'Histórico do sistema',
    text: 'Auditoria: quem fez o quê e quando (logins, créditos, pagamentos, alterações de configuração). Filtre por utilizador, módulo e data.',
    side: 'bottom'
  },
  settingsNav: {
    el: '[data-tour="settings-nav"]',
    route: '/settings',
    title: 'Configurações',
    text: 'Dados da empresa, contas e planos, permissões por perfil, parâmetros de crédito (juros de mora, prazos), documentos legais e modelos de mensagens.',
    side: 'right'
  },
  smsFilters: {
    el: '[data-tour="sms-filters"]',
    route: '/sms/pendentes',
    title: 'Mensagens',
    text: 'Credenciais de acesso e avisos enviados por SMS/WhatsApp, com o estado de cada envio (pendente, enviado, falhado).',
    side: 'bottom'
  },
  companyBody: {
    el: '[data-tour="company-body"]',
    route: '/company',
    title: 'Painel da Empresa',
    text: 'Como Super Admin gere aqui todas as empresas subscritoras, o seu estado e os planos contratados.',
    side: 'bottom'
  },
  superAdminBody: {
    el: '[data-tour="superadmin-body"]',
    route: '/configuracoes',
    title: 'Configurações globais',
    text: 'Super Admins, planos de subscrição e parâmetros globais da plataforma.',
    side: 'bottom'
  },
  gestorFilters: {
    el: '[data-tour="gestor-filters"]',
    route: '/gestor',
    title: 'Filtros do painel',
    text: 'Filtre por estado, mutuário e período. Os contadores e a grelha de prestações abaixo seguem o filtro; o botão PDF exporta a grade.',
    side: 'bottom'
  },
  gestorKpis: {
    el: '[data-tour="gestor-kpis"]',
    route: '/gestor',
    title: 'Resumo do dia',
    text: 'Total de prestações, pagas, em atraso e valores do período — a sua agenda de cobrança em números.',
    side: 'bottom'
  },
  mutuarioBody: {
    el: '[data-tour="mutuario-body"]',
    route: null,
    // vive em qualquer ficha de mutuário (/mutuarios/<conta>)
    pagePath: /^\/mutuarios\/[^/]+$/,
    title: 'Ficha do mutuário',
    text: 'Perfil 360º: créditos activos, prestações, pagamentos, documentos KYC, garantias e histórico de cobrança (visitas, ligações e promessas).',
    side: 'bottom'
  },
  partnerMenu: {
    el: '[data-tour="partner-menu"]',
    title: 'As suas vistas',
    text: 'Do lado do financiador: créditos desembolsados, prestações pagas e pendentes, juros de mora, recebimentos, extrato da carteira e recibos.',
    side: 'right'
  },
  partnerWallet: {
    el: '[data-tour="partner-wallet"]',
    title: 'A sua carteira',
    text: 'Capital alocado, desembolsado e disponível. Todos os números são da sua carteira — o sistema nunca mostra dados de outros financiadores.',
    side: 'right'
  },
  partnerBody: {
    el: '[data-tour="partner-body"]',
    route: '/parceiro/dashboard',
    title: 'Painel do financiador',
    text: 'Indicadores de retorno da sua carteira: capital em risco, recebido no período, prestações em atraso e evolução.',
    side: 'bottom'
  }
}

/**
 * Percursos por perfil.
 *  - full  → onboarding completo (menu, fluxos e páginas principais)
 *  - quick → o essencial em poucos passos
 */
/** Biblioteca de passos reutilizáveis: o tour percorre-os completos e os itens do
 *  checklist de onboarding compõem mini-percursos a partir das mesmas chaves. */
export const TOUR_STEP_LIBRARY = { ...LAYOUT_STEPS, ...PAGE_STEPS }

/** Resolve chaves da biblioteca (aceita também passos literais) numa lista de passos. */
export function tourSteps(keys = []) {
  return keys.map((key) => (typeof key === 'string' ? TOUR_STEP_LIBRARY[key] : key)).filter(Boolean)
}

const TOURS = {
  1: {
    label: 'Administrador',
    full: [
      {
        title: 'Bem-vindo ao Mais Mola 👋',
        text: 'Vamos dar uma volta guiada pela plataforma: menu, painel, mutuários, créditos, cobrança, caixa, financiamento e configurações. Pode avançar com <strong>Seguinte</strong> ou sair com ✕ a qualquer momento.',
        el: null,
        side: 'bottom'
      },
      LAYOUT_STEPS.brand,
      LAYOUT_STEPS.menuSearch,
      LAYOUT_STEPS.menuGroups,
      { ...LAYOUT_STEPS.navbarTitle, route: '/dashboard' },
      LAYOUT_STEPS.navbarAlerts,
      LAYOUT_STEPS.navbarUser,
      PAGE_STEPS.dashFilters,
      PAGE_STEPS.dashKpis,
      PAGE_STEPS.customersKpis,
      PAGE_STEPS.customersFilters,
      PAGE_STEPS.loansHeader,
      PAGE_STEPS.cobrancaFilters,
      PAGE_STEPS.carteiraKpis,
      PAGE_STEPS.installmentsBody,
      PAGE_STEPS.paymentsFilters,
      PAGE_STEPS.caixaBody,
      PAGE_STEPS.caixaCentral,
      PAGE_STEPS.bankHeader,
      PAGE_STEPS.financingTabs,
      PAGE_STEPS.teamHeader,
      PAGE_STEPS.bmForm,
      PAGE_STEPS.logsFilters,
      PAGE_STEPS.settingsNav,
      PAGE_STEPS.smsFilters,
      LAYOUT_STEPS.tourButton,
      {
        title: 'Tour concluído ✅',
        text: 'Já conhece o essencial. Reabra este tour (ou o tour rápido) no botão <strong>?</strong> e consulte o manual do utilizador sempre que precisar de detalhe.',
        el: null,
        side: 'bottom'
      }
    ],
    quick: [
      { title: 'Tour rápido — Administrador', text: 'Cinco pontos que fazem a diferença no dia-a-dia.', el: null, side: 'bottom' },
      LAYOUT_STEPS.menuGroups,
      PAGE_STEPS.dashKpis,
      PAGE_STEPS.cobrancaFilters,
      PAGE_STEPS.caixaBody,
      LAYOUT_STEPS.tourButton
    ]
  },
  2: {
    label: 'Operador',
    full: [
      {
        title: 'Bem-vindo ao Mais Mola 👋',
        text: 'Um percurso pelas tarefas do dia: registar mutuários, acompanhar créditos, cobrar e dar entrada de pagamentos.',
        el: null,
        side: 'bottom'
      },
      LAYOUT_STEPS.brand,
      LAYOUT_STEPS.menuSearch,
      PAGE_STEPS.dashFilters,
      PAGE_STEPS.dashKpis,
      PAGE_STEPS.customersKpis,
      PAGE_STEPS.customersFilters,
      PAGE_STEPS.loansHeader,
      PAGE_STEPS.cobrancaFilters,
      LAYOUT_STEPS.navbarUser,
      LAYOUT_STEPS.tourButton,
      { title: 'Pronto ✅', text: 'Volte ao botão <strong>?</strong> sempre que precisar de rever estes passos.', el: null, side: 'bottom' }
    ],
    quick: [
      { title: 'Tour rápido — Operador', text: 'O essencial das suas tarefas diárias.', el: null, side: 'bottom' },
      PAGE_STEPS.customersFilters,
      PAGE_STEPS.loansHeader,
      PAGE_STEPS.cobrancaFilters,
      LAYOUT_STEPS.tourButton
    ]
  },
  3: {
    label: 'Gestor de Crédito',
    full: [
      {
        title: 'Bem-vindo à sua carteira 👋',
        text: 'Este tour mostra o painel do gestor, os seus mutuários, os créditos, a cobrança de campo e a sua carteira — tudo filtrado por si.',
        el: null,
        side: 'bottom'
      },
      LAYOUT_STEPS.brand,
      LAYOUT_STEPS.menuSearch,
      PAGE_STEPS.gestorFilters,
      PAGE_STEPS.gestorKpis,
      PAGE_STEPS.customersKpis,
      PAGE_STEPS.customersFilters,
      PAGE_STEPS.loansHeader,
      PAGE_STEPS.cobrancaFilters,
      PAGE_STEPS.carteiraKpis,
      PAGE_STEPS.installmentsBody,
      LAYOUT_STEPS.navbarAlerts,
      LAYOUT_STEPS.navbarUser,
      LAYOUT_STEPS.tourButton,
      { title: 'Tour concluído ✅', text: 'Reabra o tour no botão <strong>?</strong>. Bons negócios!', el: null, side: 'bottom' }
    ],
    quick: [
      { title: 'Tour rápido — Gestor', text: 'O essencial da sua carteira.', el: null, side: 'bottom' },
      PAGE_STEPS.gestorKpis,
      PAGE_STEPS.cobrancaFilters,
      PAGE_STEPS.carteiraKpis,
      LAYOUT_STEPS.tourButton
    ]
  },
  0: {
    label: 'Super Admin',
    full: [
      {
        title: 'Bem-vindo, Super Admin 👋',
        text: 'Vamos ver como gerir empresas, planos e as configurações globais da plataforma.',
        el: null,
        side: 'bottom'
      },
      LAYOUT_STEPS.brand,
      LAYOUT_STEPS.menuSearch,
      LAYOUT_STEPS.menuGroups,
      LAYOUT_STEPS.navbarTitle,
      PAGE_STEPS.companyBody,
      PAGE_STEPS.superAdminBody,
      LAYOUT_STEPS.navbarUser,
      LAYOUT_STEPS.tourButton,
      { title: 'Tour concluído ✅', text: 'Reabra o tour no botão <strong>?</strong> sempre que precisar.', el: null, side: 'bottom' }
    ],
    quick: [
      { title: 'Tour rápido — Super Admin', text: 'O essencial da gestão da plataforma.', el: null, side: 'bottom' },
      PAGE_STEPS.companyBody,
      PAGE_STEPS.superAdminBody,
      LAYOUT_STEPS.tourButton
    ]
  },
  4: {
    label: 'Parceiro Financiador',
    full: [
      {
        title: 'Bem-vindo ao Portal do Financiador 👋',
        text: 'Este portal é só seu: mostra exclusivamente a sua carteira e o que ela produziu. Vamos ver cada vista.',
        el: null,
        side: 'bottom'
      },
      PAGE_STEPS.partnerMenu,
      PAGE_STEPS.partnerWallet,
      PAGE_STEPS.partnerBody,
      {
        title: 'Só leitura, sempre actualizado',
        text: 'Os dados são actualizados pela equipa MBRM. Se notar algo que não bate certo, fale com o gestor da sua carteira.',
        el: null,
        side: 'bottom'
      }
    ],
    quick: [
      { title: 'Tour rápido — Financiador', text: 'O essencial da sua carteira.', el: null, side: 'bottom' },
      PAGE_STEPS.partnerWallet,
      PAGE_STEPS.partnerBody
    ]
  }
}

/* ───────────────────────── estado (singleton) ───────────────────────── */

const isActive = ref(false)
const flow = ref('full')
const role = ref(null)
const tourLabel = ref('')
const stepIndex = ref(0)
const stepCount = ref(0)

/** Páginas já vistas: { "<utilizador>": { "<id-página>": ts } } (reactivo). */
const pageSeenState = ref(readPageSeenState())
/** Utilizador actual (muda no login/logout). */
const userKey = ref(storageUserKey())
/** Painel com a lista de tours de todas as páginas. */
const pageToursOpen = ref(false)
/** Até quando o tour automático está suspenso (aviso de onboarding do 1.º login). */
let suppressAutoUntil = 0
/** Página do tour em execução — marcada como vista no fecho do overlay. */
let currentPageTour = null

/** Enquanto o tour corre, a sidebar abre todos os grupos (os alvos têm de existir no DOM). */
const menuExpanded = ref(false)

let steps = []
let driverObj = null
let routerRef = null
let keyHandler = null
let navigating = false
/** Uma transição de passo em curso (impede goTo concorrentes). */
let transitioning = false
// Sessão em curso: `sessionFinish` é chamado uma única vez, com o motivo do fim
// ('done' quando o tour chegou ao último passo, 'close' em qualquer outro fecho).
let sessionFinish = null
let finishNotified = true

const progress = computed(() =>
  stepCount.value > 0 ? `${Math.min(stepIndex.value + 1, stepCount.value)}/${stepCount.value}` : ''
)

/** Metadados do percurso do perfil activo — usados pelo botão de ajuda. */
const activeTour = computed(() => TOURS[Number(role.value)] || null)
const tourRoleLabel = computed(() => activeTour.value?.label || '')
const fullStepCount = computed(() => activeTour.value?.full?.length || 0)
const quickStepCount = computed(() => activeTour.value?.quick?.length || 0)
/* ───────────────── tours por página (estado persistido) ───────────────── */

/** Chave do utilizador da sessão: `u12` (conta), `r3` (perfil) ou `anon`. */
function storageUserKey() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user && typeof user === 'object') {
      const id = user.id ?? user.userId
      if (id !== undefined && id !== null && id !== '') return `u${id}`
      if (user.userRole !== undefined && user.userRole !== null) return `r${Number(user.userRole)}`
    }
  } catch {
    /* sem sessão legível: cai no anónimo */
  }
  return 'anon'
}

/** Recalcula a chave do utilizador (login/logout) antes de ler/escrever progresso. */
function refreshUserKey() {
  userKey.value = storageUserKey()
}

function readPageSeenState() {
  try {
    const raw = JSON.parse(localStorage.getItem(PAGE_SEEN_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

function writePageSeenState(data) {
  try {
    localStorage.setItem(PAGE_SEEN_KEY, JSON.stringify(data))
  } catch {
    /* localStorage indisponível: o tour de página reaparece */
  }
}

/** Páginas já vistas pelo utilizador actual. */
const pageSeenForUser = computed(() => {
  const entry = pageSeenState.value[userKey.value]
  return entry && typeof entry === 'object' ? entry : {}
})

/** Tour da página actualmente aberta (null quando ainda não tem passos). */
const pageTourOnView = computed(() => findPageTour(currentPath(), role.value))

/** Passos do tour da página aberta (o botão «?» mostra este número). */
const pageStepCount = computed(() => pageTourOnView.value?.steps.length || 0)

/**
 * Páginas com tour disponíveis para o perfil activo.
 * As páginas contextuais (ficha de mutuário, por padrão de URL) não entram no
 * contador porque não se navega para elas a partir da lista.
 */
const pagesForCurrentRole = computed(() =>
  pageToursForRole(role.value).filter((page) => !!page.path)
)

/** Quantas dessas páginas o utilizador já concluiu («Primeiro dia X/Y»). */
const completedPages = computed(() => {
  const seen = pageSeenForUser.value
  return pagesForCurrentRole.value.filter((page) => !!seen[page.id]).length
})

const pageTourTotal = computed(() => pagesForCurrentRole.value.length)
const pageTourProgress = computed(() =>
  pageTourTotal.value > 0 ? Math.round((completedPages.value / pageTourTotal.value) * 100) : 0
)

/** Lista agrupada por área do menu, com o estado de cada página (painel «?»). */
const pageToursBySection = computed(() => {
  const allowed = new Set(pagesForCurrentRole.value.map((page) => page.id))
  const seen = pageSeenForUser.value
  return PAGE_TOURS.map((section) => ({
    ...section,
    pages: section.pages
      .filter((page) => allowed.has(page.id))
      .map((page) => ({ ...page, seen: !!seen[page.id] }))
  })).filter((section) => section.pages.length > 0)
})

/** A página indicada já tem o tour visto por este utilizador? */
function pageTourSeen(pageOrPath) {
  const page = typeof pageOrPath === 'string' ? findPageTour(pageOrPath, role.value) : pageOrPath
  if (!page) return false
  return !!pageSeenForUser.value[page.id]
}

/** Marca a página como vista (concluída ou saltada) para este utilizador. */
function markPageTourSeen(page) {
  if (!page?.id) return false
  const key = userKey.value
  const next = { ...pageSeenState.value }
  const entry = { ...(next[key] || {}) }
  entry[page.id] = Date.now()
  next[key] = entry
  pageSeenState.value = next
  writePageSeenState(next)
  return true
}

/** Repõe todos os tours de página deste utilizador (o aviso volta a aparecer). */
function resetPageTours() {
  const key = userKey.value
  const next = { ...pageSeenState.value }
  delete next[key]
  pageSeenState.value = next
  writePageSeenState(next)
}

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

function writeSeen(data) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(data))
  } catch {
    /* localStorage indisponível (modo privado): o tour simplesmente reaparece */
  }
}

/** O tour completo só está disponível a quem tem elementos data-tour no layout (perfis com sessão). */
function hasTour(roleValue = role.value) {
  return !!TOURS[Number(roleValue)]
}

function hasSeenTour(roleValue = role.value) {
  const seen = readSeen()
  return !!seen[String(Number(roleValue))]
}

function markSeen(roleValue = role.value) {
  if (!hasTour(roleValue)) return
  const seen = readSeen()
  seen[String(Number(roleValue))] = Date.now()
  writeSeen(seen)
}

function resetSeen(roleValue = role.value) {
  const seen = readSeen()
  delete seen[String(Number(roleValue))]
  writeSeen(seen)
}

/* ───────────────────────── internos do driver ───────────────────────── */

function currentPath() {
  return routerRef?.currentRoute?.value?.path || window.location.pathname
}

/** O alvo existe e é realmente visível (ignora restos de páginas já desmontadas). */
function queryVisible(selector) {
  if (!selector) return true
  const el = document.querySelector(selector)
  if (!el) return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 || rect.height > 0
}

function waitForElement(selector, timeout = 7000) {
  if (!selector) return Promise.resolve(true)
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      if (!isActive.value) return resolve(false)
      if (queryVisible(selector)) return resolve(true)
      if (Date.now() - started > timeout) return resolve(false)
      window.setTimeout(tick, 120)
    }
    tick()
  })
}

/**
 * Texto do passo. Pode ser uma função: nesse caso é avaliada na altura em que o
 * passo aparece, para citar os números reais que a página leu do servidor.
 */
function resolveStepText(step) {
  try {
    const value = typeof step.text === 'function' ? step.text() : step.text
    return value == null ? '' : String(value)
  } catch (error) {
    console.warn('[tour] falha ao construir o texto do passo:', error)
    return ''
  }
}

function buildDriver() {
  return driver({
    animate: true,
    duration: 260,
    smoothScroll: true,
    allowClose: true,
    // O ecrã dimmed não fecha o tour: só o ✕, o Esc ou o botão final.
    // (evita perder o onboarding com um clique acidental)
    overlayClickBehavior: 'none',
    overlayColor: '#0b2e1d',
    overlayOpacity: 0.7,
    stagePadding: 6,
    stageRadius: 10,
    showProgress: true,
    progressText: 'Passo {{current}} de {{total}}',
    nextBtnText: 'Seguinte',
    prevBtnText: 'Anterior',
    doneBtnText: 'Concluir',
    // Num tour de página o utilizador pode sair sem cerimónia: «Pular tour».
    closeBtnLabel: flow.value === 'page' ? 'Pular tour' : 'Fechar o tour',
    // Navegação entre páginas exige controlo manual das teclas.
    allowKeyboardControl: false,
    popoverClass: 'mbr-tour-popover',
    // Passos com texto dinâmico (números reais do servidor) são reescritos aqui:
    // o driver reescreve a descrição em cada render, por isso este gancho é o
    // único ponto em que o texto sai já com as contagens actualizadas.
    onPopoverRender: (popover, { index }) => {
      const step = index === undefined ? null : steps[index]
      if (step && typeof step.text === 'function') {
        popover.description.innerHTML = resolveStepText(step)
      }
    },
    steps: steps.map((step, index) => ({
      element: step.el || undefined,
      popover: {
        title: step.title,
        description: resolveStepText(step),
        side: step.side || 'bottom',
        align: step.align || 'start',
        // o texto do botão é explícito passo a passo (o último conclui)
        nextBtnText: index === steps.length - 1 ? 'Concluir' : 'Seguinte',
        onNextClick: () => goTo(index + 1),
        onDoneClick: () => finish('done'),
        onPrevClick: () => goTo(index - 1),
        onCloseClick: () => finish('close')
      }
    })),
    onDestroyed: () => {
      // Esconder o overlay para navegar não termina o tour; qualquer outro
      // fecho (✕, Esc, overlay) sim — mesmo quando o driver o faz internamente.
      driverObj = null
      if (!navigating) endSession('close')
    }
  })
}

function showStep(index) {
  stepIndex.value = index
  if (!driverObj) driverObj = buildDriver()
  driverObj.drive(index)
}

/** Esconde o overlay sem terminar a sessão (usado antes de mudar de página). */
function hideOverlay() {
  if (!driverObj) return
  navigating = true
  try {
    driverObj.destroy()
  } finally {
    driverObj = null
    navigating = false
  }
}

async function goTo(index) {
  if (!isActive.value) return
  // Chegar ao fim da lista = percurso concluído.
  if (index >= steps.length) return finish('done')
  if (index < 0) index = 0
  // Ignora cliques repetidos durante a transição (evita dois goTo em paralelo).
  if (transitioning) return
  transitioning = true

  const step = steps[index]
  stepIndex.value = index

  if (step.route && currentPath() !== step.route) {
    hideOverlay()
    try {
      await routerRef.push(step.route)
    } catch (error) {
      console.warn('[tour] não foi possível navegar para', step.route, error)
    }
    // deixa a página (lazy) montar antes de procurar o alvo
    await new Promise((resolve) => window.setTimeout(resolve, 200))
  }

  if (!isActive.value) {
    transitioning = false
    return
  }

  // Passos que citam números do servidor declaram `ready` e esperam por eles
  // (ex.: contagens reais do preview do Reset Geral), para nunca mostrarem
  // uma frase vazia ou contagens de uma visita anterior.
  if (typeof step.ready === 'function') {
    const deadline = Date.now() + (step.readyTimeout || 4000)
    while (!step.ready() && Date.now() < deadline && isActive.value) {
      await new Promise((resolve) => window.setTimeout(resolve, 120))
    }
  }

  if (!isActive.value) {
    transitioning = false
    return
  }

  // Num tour de página a página já está montada: não vale a pena esperar 7 s
  // por um alvo que não existe naquele estado (ex.: caixa em modo electrónico).
  const timeout = step.wait || (flow.value === 'page' ? 1500 : 7000)
  const ready = await waitForElement(step.el, timeout)
  transitioning = false
  if (!ready) {
    // Alvo indisponível (sem dados, permissões, estado da página): salta sem
    // bloquear o tour.
    console.warn(`[tour] passo ignorado (alvo ausente): ${step.el || step.title}`)
    return goTo(index + 1)
  }

  showStep(index)
}

function onKeydown(event) {
  if (!isActive.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    finish('close')
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    goTo(stepIndex.value + 1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goTo(stepIndex.value - 1)
  }
}

/** Avisa a sessão (uma única vez) que o percurso terminou. */
function notifySessionEnd(reason) {
  if (finishNotified) return
  finishNotified = true
  const callback = sessionFinish
  sessionFinish = null
  if (!callback) return
  try {
    callback(reason)
  } catch (error) {
    console.warn('[tour] erro no callback da sessão', error)
  }
}

/** Abre uma sessão de tour com uma lista de passos já preparada. */
function beginSession(list, label, roleValue, onFinish) {
  transitioning = false
  steps = list
  role.value = roleValue
  tourLabel.value = label
  stepCount.value = list.length
  stepIndex.value = 0
  isActive.value = true
  menuExpanded.value = true
  sessionFinish = onFinish || null
  finishNotified = false

  keyHandler = onKeydown
  window.addEventListener('keydown', keyHandler)

  // 120 ms: dá tempo à sidebar de abrir os grupos antes do primeiro alvo.
  window.setTimeout(() => goTo(0), 120)
}

function endSession(reason = 'close', markPage = true) {
  // Página em execução: marcada como vista no fim (concluída ou saltada).
  const pageToMark = flow.value === 'page' ? currentPageTour : null
  // Nenhuma transição pendente pode bloquear o próximo tour.
  transitioning = false
  if (isActive.value) {
    isActive.value = false
    menuExpanded.value = false
    steps = []
  }
  if (keyHandler) {
    window.removeEventListener('keydown', keyHandler)
    keyHandler = null
  }
  if (markPage && pageToMark) markPageTourSeen(pageToMark)
  if (flow.value === 'page') currentPageTour = null
  notifySessionEnd(reason)
}

function finish(reason = 'close') {
  const roleValue = role.value
  const currentFlow = flow.value
  endSession(reason)
  if (driverObj) {
    navigating = true
    try {
      driverObj.destroy()
    } catch {
      /* já destruído */
    }
    navigating = false
    driverObj = null
  }
  // Um mini-percurso do checklist ou um tour de página não substitui o tour
  // completo: só os percursos full/quick marcam o perfil como visto.
  if (currentFlow === 'full' || currentFlow === 'quick') markSeen(roleValue)
}

/* ───────────────────────── API pública ───────────────────────── */

/**
 * @param {object} [options]
 * @param {*} [options.router] instância do vue-router (capturada no setup do componente)
 */
export function useAppTour(options = {}) {
  if (options.router) routerRef = options.router

  /**
   * Inicia um percurso.
   * @param {'full'|'quick'} [which]  percurso pretendido
   * @param {number} [roleOverride] perfil (por omissão o perfil da sessão)
   */
  function startTour(which = 'full', roleOverride) {
    const roleValue = Number(roleOverride ?? role.value)
    const tour = TOURS[roleValue]
    if (!tour) {
      console.warn('[tour] não existe percurso para o perfil', roleValue)
      return false
    }

    if (isActive.value) finish('close')

    flow.value = tour[which] ? which : 'full'
    const subtitle = flow.value === 'quick' ? 'tour rápido' : 'tour completo'
    beginSession(tour[flow.value], `${tour.label} · ${subtitle}`, roleValue)
    return true
  }

  /**
   * Mini-percurso com uma lista de passos já preparada (itens do checklist de
   * onboarding). `onFinish` recebe 'done' quando o último passo é concluído.
   * @param {Array} list passos no formato interno ({ el, title, text, route, ... })
   * @param {{ label?: string, role?: number, onFinish?: (reason: string) => void }} [options]
   */
  function startSteps(list, options = {}) {
    const prepared = (list || []).filter(Boolean)
    if (prepared.length === 0) return false

    if (isActive.value) finish('close')

    flow.value = 'steps'
    beginSession(
      prepared,
      options.label || 'Passo-a-passo',
      Number(options.role ?? role.value),
      options.onFinish
    )
    return true
  }

  /**
   * Abre o tour da página actual (biblioteca `pageTours`). Devolve `false`
   * apenas quando a página realmente não tem passos — só nesse caso o botão de
   * ajuda mostra o aviso «Esta página ainda não tem passos de tour».
   */
  function startPageTour(roleOverride) {
    const roleValue = Number(roleOverride ?? role.value)
    refreshUserKey()
    const page = findPageTour(currentPath(), roleValue)
    if (!page || page.steps.length === 0) return false

    if (isActive.value) finish('close')

    flow.value = 'page'
    currentPageTour = page
    beginSession(
      page.steps.map((step) => ({ ...step, route: null })),
      `${page.label} · tour da página`,
      roleValue
    )
    return true
  }

  /**
   * Arranca o tour da página automaticamente na primeira visita — uma vez por
   * utilizador e página. O utilizador pode sempre saltar com «Pular tour».
   * @param {number} [roleOverride]
   * @param {{ blocked?: boolean }} [options] `blocked` evita interromper um diálogo aberto
   */
  function maybeAutoStartPageTour(roleOverride, options = {}) {
    const roleValue = Number(roleOverride ?? role.value)
    if (isActive.value) return false
    if (Date.now() < suppressAutoUntil) return false
    if (options.blocked) return false
    if (!hasTour(roleValue)) return false

    refreshUserKey()
    const page = findPageTour(currentPath(), roleValue)
    if (!page || pageTourSeen(page)) return false
    return startPageTour(roleValue)
  }

  /** Suspende o tour automático (ex.: enquanto o convite de onboarding está à vista). */
  function suppressAutoTour(ms = 15000) {
    suppressAutoUntil = Date.now() + Math.max(0, Number(ms) || 0)
  }

  /**
   * Fecha o tour sem marcar a página como vista — usado quando o utilizador
   * simplesmente mudou de página a meio (não chegou a ver o tour).
   */
  function abandonTour() {
    if (!isActive.value) return
    if (driverObj) {
      navigating = true
      try {
        driverObj.destroy()
      } catch {
        /* já destruído */
      }
      navigating = false
      driverObj = null
    }
    endSession('close', false)
  }

  /** Abre/fecha o painel com os tours de todas as páginas. */
  function openPageTours() {
    pageToursOpen.value = true
  }

  function closePageTours() {
    pageToursOpen.value = false
  }

  function stopTour() {
    finish('close')
  }

  /**
   * Primeiro login neste dispositivo? Pede (uma única vez, por perfil) se o
   * utilizador quer fazer o tour — em vez de o arrancar à força.
   */
  function shouldPromptOnboarding(roleOverride) {
    const roleValue = roleOverride === undefined ? role.value : Number(roleOverride)
    return hasTour(roleValue) && !hasSeenTour(roleValue)
  }

  return {
    // estado
    isActive,
    flow,
    progress,
    tourLabel,
    role,
    stepIndex,
    stepCount,
    menuExpanded,
    // metadados do percurso
    tourRoleLabel,
    fullStepCount,
    quickStepCount,
    pageStepCount,
    // tours por página
    pageTourOnView,
    pageToursBySection,
    pageToursOpen,
    pageTourTotal,
    completedPages,
    pageTourProgress,
    // consultas
    hasTour,
    hasSeenTour,
    shouldPromptOnboarding,
    pageTourSeen,
    hasPageTour: (path) => !!findPageTour(path ?? currentPath(), role.value),
    // comandos
    startTour,
    startPageTour,
    startSteps,
    stopTour,
    abandonTour,
    maybeAutoStartPageTour,
    suppressAutoTour,
    openPageTours,
    closePageTours,
    markSeen,
    resetSeen,
    markPageTourSeen,
    resetPageTours,
    setRole: (value) => {
      role.value = Number(value)
      refreshUserKey()
    }
  }
}

export default useAppTour
