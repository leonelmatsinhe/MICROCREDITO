import { computed, ref } from 'vue'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'
import { tourSteps, useAppTour } from '@/composables/useAppTour'

/**
 * CHECKLIST DE ONBOARDING — TAREFAS DO PRIMEIRO DIA
 * ─────────────────────────────────────────────────
 * Complementa o tour guiado: em vez de um percurso linear, é uma lista de
 * tarefas essenciais do arranque (abrir caixa, registar o primeiro mutuário,
 * conceder o primeiro crédito, ...) com progresso guardado por utilizador.
 *
 * Cada tarefa tem:
 *   - keys  → chaves da biblioteca de passos do tour (mini-percurso «Mostrar-me»)
 *   - steps → passos literais (quando a página não tem alvos na biblioteca)
 *   - route → página onde a tarefa se executa (o mini-percurso navega até lá)
 *
 * O progresso é do UTILIZADOR, não do dispositivo:
 *   - fonte de verdade: `onboarding_progress` (GET/PUT /api/onboarding/me),
 *     o que permite ao Admin ver o que falta a cada colega e ao utilizador
 *     manter o progresso entre computadores;
 *   - cache/fallback offline: localStorage sob `mbr_onboarding_v1`, indexado
 *     pela chave do utilizador (id da conta, com o perfil como fallback), para
 *     dois utilizadores no mesmo dispositivo não misturarem as suas listas e
 *     para o checklist continuar a funcionar sem rede.
 *
 * O estado é um singleton de módulo: a navbar, o botão de ajuda «?» e o painel
 * partilham a mesma lista e o mesmo progresso.
 */

const STORAGE_KEY = 'mbr_onboarding_v1'

/** Passo genérico do portal do financiador (menu lateral das vistas). */
const PARTNER_MENU_STEP = {
  el: '[data-tour="partner-menu"]',
  title: 'As suas vistas',
  text: 'Use este menu para alternar entre as vistas da sua carteira: créditos, prestações, mora, recebimentos, extrato e recibos.',
  side: 'right'
}

/** Corpo de cada página do portal do parceiro. */
function partnerPage(title, text) {
  return { el: '[data-tour="partner-content"]', title, text, side: 'bottom' }
}

/** Tarefas do primeiro dia, por perfil. */
export const CHECKLIST_TASKS = {
  1: {
    label: 'Administrador',
    tasks: [
      {
        id: 'empresa',
        title: 'Confirmar os dados da empresa',
        text: 'Nome, NUIT, contactos e documentos legais — saem impressos em cada contrato, recibo e relatório.',
        route: '/settings',
        cta: 'Abrir Configurações',
        keys: ['settingsNav']
      },
      {
        id: 'equipa',
        title: 'Criar os utilizadores da equipa',
        text: 'Cada pessoa entra com o seu próprio login; o perfil (Admin, Gestor, Operador) define o que vê e pode fazer.',
        route: '/equipe',
        cta: 'Abrir Equipa',
        keys: ['teamHeader']
      },
      {
        id: 'abrir-caixa',
        title: 'Abrir o caixa do dia',
        text: 'O caixa é obrigatório para operar: sem caixa aberto não há desembolsos, reembolsos nem despesas.',
        route: '/caixa',
        cta: 'Abrir Caixa',
        keys: ['caixaBody']
      },
      {
        id: 'primeiro-mutuario',
        title: 'Registar o primeiro mutuário',
        text: 'Ficha completa do cliente — dados, documentos (KYC) e garantias. É a base de qualquer crédito.',
        route: '/mutuarios',
        cta: 'Abrir Mutuários',
        keys: ['customersKpis', 'customersFilters']
      },
      {
        id: 'primeiro-credito',
        title: 'Conceder o primeiro crédito',
        text: 'Simule capital, prazo, taxa e garantias, escolha a carteira de financiamento e submeta à aprovação.',
        route: '/loans',
        cta: 'Abrir Créditos',
        keys: ['loansHeader']
      },
      {
        id: 'receber-pagamento',
        title: 'Registar um pagamento',
        text: 'Entrada de pagamento com método, conta e alocação às prestações — o recibo é emitido de seguida.',
        route: '/pagamentos',
        cta: 'Abrir Pagamentos',
        keys: ['paymentsFilters']
      },
      {
        id: 'cobranca-dia',
        title: 'Planear a cobrança do dia',
        text: 'Quem está em atraso, o que prometeu pagar e o registo da visita, ligação ou promessa de pagamento.',
        route: '/cobranca',
        cta: 'Abrir Cobrança',
        keys: ['cobrancaFilters']
      },
      {
        id: 'tesouraria',
        title: 'Ligar o dinheiro real: contas e tesouraria',
        text: 'Saldo de cada conta bancária e o Caixa Central, com transferências entre contas e reconciliação.',
        route: '/caixa-central',
        cta: 'Abrir Caixa Central',
        keys: ['caixaCentral', 'bankHeader']
      }
    ]
  },
  2: {
    label: 'Operador',
    tasks: [
      {
        id: 'abrir-caixa',
        title: 'Abrir o caixa do dia',
        text: 'Comece aqui: o caixa aberto é o diário de auditoria dos desembolsos e pagamentos que vai registar.',
        route: '/caixa',
        cta: 'Abrir Caixa',
        keys: ['caixaBody']
      },
      {
        id: 'registar-mutuario',
        title: 'Registar um mutuário',
        text: 'Pesquise por nome, conta ou telefone e crie a ficha do cliente (dados, KYC e garantias).',
        route: '/mutuarios',
        cta: 'Abrir Mutuários',
        keys: ['customersFilters']
      },
      {
        id: 'acompanhar-creditos',
        title: 'Acompanhar os créditos',
        text: 'Estado de cada crédito: pendente de aprovação, desembolsado, terminado ou rejeitado.',
        route: '/loans',
        cta: 'Abrir Créditos',
        keys: ['loansHeader']
      },
      {
        id: 'cobranca-campo',
        title: 'Registar a cobrança de campo',
        text: 'Visitas domiciliárias, ligações e promessas de pagamento com localização GPS opcional.',
        route: '/cobranca',
        cta: 'Abrir Cobrança',
        keys: ['cobrancaFilters']
      },
      {
        id: 'receber-pagamento',
        title: 'Dar entrada de um pagamento',
        text: 'Método, conta de destino e alocação às prestações — o valor em dívida actualiza de imediato.',
        route: '/pagamentos',
        cta: 'Abrir Pagamentos',
        keys: ['paymentsFilters']
      }
    ]
  },
  3: {
    label: 'Gestor de Crédito',
    tasks: [
      {
        id: 'painel-dia',
        title: 'Começar pelo painel do dia',
        text: 'A sua agenda de cobrança em números: prestações do dia, pagas, em atraso e o que falta receber.',
        route: '/gestor',
        cta: 'Abrir Painel',
        keys: ['gestorKpis', 'gestorFilters']
      },
      {
        id: 'abrir-caixa',
        title: 'Abrir o caixa do dia',
        text: 'O caixa é obrigatório para operar — é o diário de auditoria do dinheiro que passa pelas suas mãos.',
        route: '/caixa',
        cta: 'Abrir Caixa',
        keys: ['caixaBody']
      },
      {
        id: 'mutuarios',
        title: 'Conhecer a sua carteira de clientes',
        text: 'Fichas dos seus mutuários: créditos activos, prestações, documentos KYC e histórico de cobrança.',
        route: '/mutuarios',
        cta: 'Abrir Mutuários',
        keys: ['customersKpis', 'customersFilters']
      },
      {
        id: 'cobranca-campo',
        title: 'Planear a cobrança de campo',
        text: 'Priorize por dias de atraso e registe cada contacto — o histórico fica na ficha do mutuário.',
        route: '/cobranca',
        cta: 'Abrir Cobrança',
        keys: ['cobrancaFilters']
      },
      {
        id: 'carteira-risco',
        title: 'Vigiar o risco da carteira',
        text: 'Total em dívida, PAR 30, a receber hoje e as promessas de pagamento do dia.',
        route: '/carteira',
        cta: 'Abrir Carteira',
        keys: ['carteiraKpis']
      },
      {
        id: 'prestacoes',
        title: 'Controlar o plano de prestações',
        text: 'Todas as prestações num só ecrã: estado, datas, atrasos e valores — o acompanhamento diário.',
        route: '/admin/installments',
        cta: 'Abrir Prestações',
        keys: ['installmentsBody']
      }
    ]
  },
  0: {
    label: 'Super Admin',
    tasks: [
      {
        id: 'empresas',
        title: 'Rever as empresas subscritoras',
        text: 'Estado de cada empresa, plano contratado e utilizadores — tudo o que existe na plataforma.',
        route: '/company',
        cta: 'Abrir Empresas',
        keys: ['companyBody']
      },
      {
        id: 'planos',
        title: 'Configurar planos e parâmetros globais',
        text: 'Planos de subscrição e as configurações que valem para toda a plataforma.',
        route: '/configuracoes',
        cta: 'Abrir Configurações',
        keys: ['superAdminBody']
      },
      {
        id: 'auditoria',
        title: 'Saber ler o histórico do sistema',
        text: 'Auditoria: quem fez o quê e quando (logins, créditos, pagamentos, alterações de configuração).',
        route: '/logs',
        cta: 'Abrir Histórico',
        keys: ['logsFilters']
      }
    ]
  },
  4: {
    label: 'Parceiro Financiador',
    tasks: [
      {
        id: 'carteira',
        title: 'Situar a sua carteira',
        text: 'Capital alocado, desembolsado e disponível, com o retorno da carteira no período.',
        route: '/parceiro/dashboard',
        cta: 'Abrir Painel',
        keys: ['partnerWallet', 'partnerBody']
      },
      {
        id: 'desembolsos',
        title: 'Ver os créditos desembolsados',
        text: 'Todos os créditos financiados com o capital da sua carteira, com cliente, valor e estado.',
        route: '/parceiro/creditos',
        cta: 'Abrir Créditos',
        steps: [
          PARTNER_MENU_STEP,
          partnerPage(
            'Créditos desembolsados',
            'Cada linha é um crédito pago com o capital da sua carteira. Abra a linha para ver o plano de prestações e o que já foi recebido.'
          )
        ]
      },
      {
        id: 'recebimentos',
        title: 'Acompanhar os recebimentos',
        text: 'Preenchimentos das prestações pagas pelos clientes financiados pela sua carteira.',
        route: '/parceiro/recebimentos',
        cta: 'Abrir Recebimentos',
        steps: [
          PARTNER_MENU_STEP,
          partnerPage(
            'Recebimentos da carteira',
            'Filtre por data para conciliar o que entrou no período. Os recibos emitidos pela MBRM ficam na vista «Recibos».'
          )
        ]
      },
      {
        id: 'extrato',
        title: 'Fechar o mês com o extrato',
        text: 'Extrato da carteira e juros de mora: o que foi desembolsado, recebido e o que está em atraso.',
        route: '/parceiro/extrato',
        cta: 'Abrir Extrato',
        steps: [
          PARTNER_MENU_STEP,
          partnerPage(
            'Extrato da carteira',
            'Resumo do capital, dos desembolsos e dos recebimentos do fundo — é o documento que fecha o mês com a MBRM.'
          )
        ]
      }
    ]
  }
}

/* ───────────────────────── estado (singleton) ───────────────────────── */

/** Painel aberto ou fechado (partilhado pelo botão de ajuda e pelas páginas). */
const panelOpen = ref(false)

/** Cópia reactiva do mapa de progresso: { "<chave-utilizador>": { done: { id: ts } } } */
const progressMap = ref(readAll())

/** Store de autenticação, capturada no primeiro `useOnboardingChecklist()`. */
let authRef = null
/** Instância do vue-router, capturada via `useAppTour({ router })`. */
let routerRef = null

/**
 * Estado da sincronização com o servidor:
 *   'local'   → ainda não sincronizou (ou não há sessão: só localStorage)
 *   'syncing' → a ler o progresso do servidor
 *   'online'  → servidor é a fonte de verdade
 *   'error'   → falhou a rede: o checklist continua a funcionar localmente
 */
const syncState = ref('local')
/** Uma leitura ao servidor por carregamento de página (não a cada componente). */
let serverLoaded = false

function readAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* localStorage indisponível: o progresso simplesmente não persiste */
  }
}

/** Utilizador da sessão (da store ou, em fallback, do localStorage). */
function currentUser() {
  let user = authRef?.user || null
  if (!user) {
    try {
      user = JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      user = null
    }
  }
  return user
}

/**
 * Chave de progresso do utilizador: id da conta quando existe (`u12`), senão o
 * perfil (`r3`) e, sem sessão, `anon`. O id de outra conta nunca é reutilizado,
 * logo dois utilizadores no mesmo dispositivo não partilham progresso.
 */
export function onboardingUserKey() {
  const user = currentUser()
  if (!user) return 'anon'
  const id = user.id ?? user.userId
  if (id !== undefined && id !== null && id !== '') return `u${id}`
  if (user.userRole !== undefined && user.userRole !== null) return `r${Number(user.userRole)}`
  return 'anon'
}

function entryFor(key) {
  const entry = progressMap.value[key]
  return entry && typeof entry === 'object' ? entry : {}
}

function doneMap() {
  const entry = entryFor(onboardingUserKey())
  return entry.done && typeof entry.done === 'object' ? entry.done : {}
}

function updateEntry(mutate) {
  const key = onboardingUserKey()
  const next = { ...progressMap.value }
  const entry = { ...entryFor(key) }
  mutate(entry)
  next[key] = entry
  progressMap.value = next
  writeAll(next)
}

/** Há sessão autenticada? (o portal do mutuário não tem checklist) */
function hasSession() {
  const user = currentUser()
  if (!user) return false
  try {
    return !!localStorage.getItem('applicationMicroToken')
  } catch {
    return false
  }
}

/* ───────────────────────── API pública ───────────────────────── */

/**
 * @param {object} [options]
 * @param {*} [options.router] instância do vue-router (para navegar/mini-percursos)
 */
export function useOnboardingChecklist(options = {}) {
  authRef = useAuthStore()
  const tour = useAppTour(options.router ? { router: options.router } : {})
  if (options.router) routerRef = options.router

  /** Perfil da sessão (o checklist nunca mostra tarefas de outro perfil). */
  const role = computed(() => {
    const user = currentUser()
    return user?.userRole === undefined || user?.userRole === null ? null : Number(user.userRole)
  })

  const definition = computed(() => {
    const roleValue = role.value
    return roleValue === null ? null : CHECKLIST_TASKS[roleValue] || null
  })

  const roleLabel = computed(() => definition.value?.label || '')

  const done = computed(() => doneMap())
  const total = computed(() => definition.value?.tasks.length || 0)

  /** Tarefas do perfil activo, com o estado de conclusão de cada uma. */
  const tasks = computed(() =>
    (definition.value?.tasks || []).map((task) => {
      const doneAt = done.value[task.id] || null
      return { ...task, done: !!doneAt, doneAt }
    })
  )

  const doneCount = computed(() => tasks.value.filter((task) => task.done).length)
  const percent = computed(() => (total.value > 0 ? Math.round((doneCount.value / total.value) * 100) : 0))
  const isComplete = computed(() => total.value > 0 && doneCount.value === total.value)

  /** O perfil tem checklist? (o portal do mutuário não tem) */
  function hasChecklist(roleOverride) {
    const roleValue = roleOverride === undefined ? role.value : Number(roleOverride)
    return !!CHECKLIST_TASKS[roleValue]
  }

  function isDone(taskId) {
    return !!done.value[taskId]
  }

  function markDone(taskId) {
    if (!taskId || isDone(taskId)) return false
    updateEntry((entry) => {
      entry.done = { ...(entry.done || {}), [taskId]: Date.now() }
    })
    pushToServer()
    return true
  }

  function markUndone(taskId) {
    if (!isDone(taskId)) return false
    updateEntry((entry) => {
      const next = { ...(entry.done || {}) }
      delete next[taskId]
      entry.done = next
    })
    pushToServer()
    return true
  }

  function toggleTask(taskId) {
    return isDone(taskId) ? markUndone(taskId) : markDone(taskId)
  }

  /** Apaga o progresso apenas deste utilizador (o dos colegas no dispositivo fica). */
  function resetProgress() {
    updateEntry((entry) => {
      entry.done = {}
    })
    pushToServer()
  }

  /* ── Sincronização com o servidor (o progresso segue o utilizador) ── */

  /**
   * Envia o conjunto actual de tarefas concluídas. Optimista: a interface já
   * reflectiu a mudança; se a rede falhar, o localStorage mantém-na e o
   * próximo carregamento volta a tentar.
   */
  async function pushToServer(ids) {
    if (!hasSession()) return false
    const taskIds = Array.isArray(ids) ? ids : Object.keys(doneMap())
    try {
      const { data } = await api.put('/api/onboarding/me', { taskIds })
      const saved = data?.result?.taskIds
      if (Array.isArray(saved)) {
        updateEntry((entry) => {
          const next = { ...(entry.done || {}) }
          for (const taskId of saved) {
            if (!next[taskId]) next[taskId] = Date.now()
          }
          entry.done = next
        })
      }
      syncState.value = 'online'
      return true
    } catch (error) {
      syncState.value = 'error'
      console.warn('[checklist] progresso guardado apenas neste dispositivo:', error?.message || error)
      return false
    }
  }

  /**
   * Lê o progresso do servidor e junta-o ao local (a união cobre quem concluiu
   * tarefas antes de existir servidor ou sem rede); o resultado é enviado de
   * volta se tiver trazido algo que só existia localmente.
   */
  async function loadFromServer() {
    if (!hasSession() || serverLoaded) return false
    serverLoaded = true
    syncState.value = 'syncing'
    try {
      const { data } = await api.get('/api/onboarding/me')
      const remote = Array.isArray(data?.result?.taskIds) ? data.result.taskIds.map(String) : []
      const stamp = data?.result?.lastCompletedAt ? Date.parse(data.result.lastCompletedAt) : Date.now()
      const local = Object.keys(doneMap())
      const merged = [...new Set([...remote, ...local])]

      updateEntry((entry) => {
        const next = { ...(entry.done || {}) }
        for (const taskId of merged) {
          if (!next[taskId]) next[taskId] = Number.isFinite(stamp) ? stamp : Date.now()
        }
        entry.done = next
      })

      syncState.value = 'online'
      // Havia progresso só local (offline ou anterior ao servidor): sobe-o.
      if (merged.length > remote.length) await pushToServer(merged)
      return true
    } catch (error) {
      syncState.value = 'error'
      console.warn('[checklist] a usar o progresso local:', error?.message || error)
      return false
    }
  }

  /**
   * O painel deve abrir-se sozinho? Uma única vez por utilizador, enquanto
   * houver tarefas por concluir — depois disso nunca mais interrompe.
   */
  function shouldAutoOpen() {
    if (!hasChecklist()) return false
    if (isComplete.value) return false
    return !entryFor(onboardingUserKey()).autoOpenAt
  }

  /** Regista que o painel se abriu sozinho (não volta a acontecer). */
  function markAutoOpened() {
    updateEntry((entry) => {
      entry.autoOpenAt = Date.now()
    })
  }

  function findTask(taskId) {
    return (definition.value?.tasks || []).find((task) => task.id === taskId) || null
  }

  /** Passos do mini-percurso da tarefa (chaves da biblioteca ou passos literais). */
  function stepsForTask(task) {
    if (!task) return []
    if (Array.isArray(task.steps) && task.steps.length > 0) return task.steps.filter(Boolean)
    return tourSteps(task.keys || [])
  }

  function openPanel() {
    panelOpen.value = true
  }

  function closePanel() {
    panelOpen.value = false
  }

  /** Abre a página da tarefa sem abrir o mini-percurso. */
  async function openTaskPage(taskId) {
    const task = typeof taskId === 'string' ? findTask(taskId) : taskId
    if (!task?.route || !routerRef) return false
    closePanel()
    try {
      await routerRef.push(task.route)
      return true
    } catch (error) {
      console.warn('[checklist] não foi possível abrir', task.route, error)
      return false
    }
  }

  /**
   * Corre o mini-percurso da tarefa e marca-a como concluída quando o último
   * passo é concluído (fechar a meio não conta).
   */
  async function startTask(taskId) {
    const task = typeof taskId === 'string' ? findTask(taskId) : taskId
    if (!task) return false

    closePanel()

    if (task.route && routerRef && routerRef.currentRoute?.value?.path !== task.route) {
      try {
        await routerRef.push(task.route)
      } catch (error) {
        console.warn('[checklist] não foi possível navegar para', task.route, error)
      }
      // deixa a página (lazy) montar antes de procurar os alvos
      await new Promise((resolve) => window.setTimeout(resolve, 260))
    }

    const started = tour.startSteps(stepsForTask(task), {
      label: `Primeiro dia · ${task.title}`,
      role: role.value,
      onFinish: (reason) => {
        if (reason === 'done') markDone(task.id)
      }
    })
    if (!started) {
      // Tarefa sem passos de tour: fica marcada como vista ao abrir a página.
      console.warn('[checklist] tarefa sem passos de tour:', task.id)
    }
    return started
  }

  return {
    // estado do painel
    panelOpen,
    openPanel,
    closePanel,
    // metadados
    role,
    roleLabel,
    hasChecklist,
    // tarefas e progresso
    tasks,
    total,
    doneCount,
    percent,
    isComplete,
    isDone,
    shouldAutoOpen,
    markAutoOpened,
    // sincronização com o servidor
    syncState,
    loadFromServer,
    // comandos
    markDone,
    markUndone,
    toggleTask,
    resetProgress,
    startTask,
    openTaskPage
  }
}

export default useOnboardingChecklist
