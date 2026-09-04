# 🚀 Plano de Migração — Mais Mola

## Vue 2 + BootstrapVue → Quasar Framework + Vue 3 + Pinia

---

## 📋 Inventário do Sistema Actual

### Stack Actual
| Tecnologia | Versão | Estado |
|---|---|---|
| Vue | 2.x | ⚠️ Descontinuado |
| BootstrapVue | 2.x | ⚠️ Sem updates desde 2021 |
| Vuex | 3.x | ⚠️ Deprecated (usar Pinia) |
| Bootstrap | 4.x | ⚠️ Descontinuado |
| SCSS | - | ✅ Manter |

### Novo Stack
| Tecnologia | Versão | Benefício |
|---|---|---|
| Vue | 3.x | Performance, Composition API |
| Quasar | 2.x | UI components, build system |
| Pinia | 2.x | State management moderno |
| Vite | 5.x | Build mais rápido |
| Vue Router | 4.x | TypeScript, navigation guards |

---

## 🗺️ Mapa de Funcionalidades

### 1. Autenticação (3 fluxos)
- [x] Login Staff (Admin/Gestor)
- [x] Login Mutuário
- [x] Logout + limpeza de sessão

### 2. Dashboard Admin (HomeView)
- [x] KPIs: Mutuários, Desembolsado, Pendente, Rejeitado
- [x] KPIs: Recebido, Lucro, Taxa Inadimplência, Risco
- [x] Filtros por período (data início/fim)
- [x] Gráfico comparativo (desembolsado vs recebido)
- [x] Tabela de prestações vencidas
- [x] Modal créditos liquidados
- [x] Serviço SMS

### 3. Gestão de Mutuários (CustomerView)
- [x] Listagem com paginação
- [x] Pesquisa (nome, telefone, NUIT)
- [x] Filtro por bairro
- [x] Importação Excel
- [x] Exportação PDF/Excel
- [x] CRUD completo

### 4. Perfil do Mutuário (BorrowerView)
- [x] Dados pessoais
- [x] Lista de créditos
- [x] Simulador de crédito
- [x] Documentos
- [x] Histórico de transações

### 5. Créditos (LoansItems, AmortizationPlan)
- [x] Criar crédito
- [x] Plano de amortização
- [x] Estado do crédito
- [x] Garantias

### 6. Pagamentos (PaymentsView)
- [x] Registo de pagamentos
- [x] Filtros avançados
- [x] Paginação
- [x] Exportação

### 7. Prestações (UpcomingInstallmentsView)
- [x] Prestações vencidas
- [x] Prestações próximas
- [x] Accões de cobrança

### 8. Relatórios (ReportsView)
- [x] Relatório BM
- [x] Relatório de pagamentos
- [x] Exportação PDF/Excel

### 9. Configurações (SettingsView)
- [x] Gestão de utilizadores
- [x] Contas bancárias
- [x] Taxas de juro
- [x] Dados da instituição

### 10. Portal do Mutuário (CustomerDashboardView)
- [x] Dashboard pessoal
- [x] Meus créditos
- [x] Pagamentos
- [x] Notificações

### 11. Gestor (GestorDashboardView)
- [x] Dashboard do gestor
- [x] Mutuários atribuídos
- [x] Prestações
- [x] Pagamentos

### 12. Infraestrutura
- [x] Dark/Light mode
- [x] Notificações em tempo real
- [x] Logs de sistema
- [x] Sistema de notificações

---

## 📅 Fases de Migração

### FASE 0 — Preparação (Semana 1)
**Objetivo:** Setup do novo projecto e infraestrutura base

```
Entregáveis:
├── Criar projecto Quasar (quasar create)
├── Configurar Pinia (stores模版)
├── Configurar Vue Router 4
├── Configurar Axios interceptor
├── Criar estrutura de pastas
├── Configurar ESLint + Prettier
├── Configurar temas (light/dark)
└── Criar ficheiro de variáveis CSS
```

**Comandos:**
```bash
# Criar novo projecto
npm init quasar

# Estrutura sugerida
src/
├── assets/
│   └── styles/
│       ├── _variables.scss
│       ├── _mixins.scss
│       └── app.scss
├── boot/
│   ├── axios.js
│   └── i18n.js
├── components/
│   ├── layout/
│   │   ├── AppNavbar.vue
│   │   ├── AppSidebar.vue
│   │   └── AppBreadcrumb.vue
│   ├── ui/
│   │   ├── KpiCard.vue
│   │   ├── DataTable.vue
│   │   ├── FilterBar.vue
│   │   ├── SkeletonLoader.vue
│   │   ├── EmptyState.vue
│   │   └── StatusBadge.vue
│   ├── charts/
│   │   ├── BarChart.vue
│   │   ├── LineChart.vue
│   │   └── DonutChart.vue
│   └── modals/
│       ├── LoanDetailsModal.vue
│       └── PaymentModal.vue
├── composables/
│   ├── useAuth.js
│   ├── useApi.js
│   ├── usePagination.js
│   └── useNotifications.js
├── layouts/
│   ├── MainLayout.vue
│   ├── AuthLayout.vue
│   └── CustomerLayout.vue
├── pages/
│   ├── auth/
│   │   └── LoginPage.vue
│   ├── dashboard/
│   │   ├── DashboardPage.vue
│   │   ├── KpiSection.vue
│   │   └── ChartsSection.vue
│   ├── customers/
│   │   ├── CustomerListPage.vue
│   │   └── CustomerDetailPage.vue
│   ├── loans/
│   │   ├── LoanListPage.vue
│   │   ├── LoanCreatePage.vue
│   │   └── AmortizationPage.vue
│   ├── payments/
│   │   └── PaymentsPage.vue
│   ├── installments/
│   │   └── InstallmentsPage.vue
│   ├── reports/
│   │   └── ReportsPage.vue
│   ├── settings/
│   │   ├── UsersPage.vue
│   │   ├── AccountsPage.vue
│   │   ├── RatesPage.vue
│   │   └── CompanyPage.vue
│   └── customer-portal/
│       ├── PortalDashboardPage.vue
│       ├── PortalLoansPage.vue
│       └── PortalPaymentsPage.vue
├── router/
│   └── index.js
├── stores/
│   ├── auth.js
│   ├── customers.js
│   ├── loans.js
│   ├── payments.js
│   ├── dashboard.js
│   ├── settings.js
│   └── notifications.js
├── utils/
│   ├── formatters.js
│   ├── validators.js
│   └── constants.js
└── App.vue
```

---

### FASE 1 — Autenticação (Semana 2)
**Objetivo:** Login/Logout funcional

```
Componentes:
├── LoginPage.vue (novo)
│   ├── Formulário email/senha
│   ├── Toggle "Mostrar senha"
│   ├── Botão "Entrar como Mutuário"
│   ├── Validação client-side
│   └── Animações de entrada
├── stores/auth.js (novo)
│   ├── actionDoLogin()
│   ├── actionDoLogout()
│   └── getters: user, token, isLoggedIn
├── composables/useAuth.js
│   ├── login()
│   ├── logout()
│   └── checkAuth()
└── router/guards.js
    └── beforeEach (verificar token)
```

**Substitui:**
- `LoginView.vue` (248 linhas)
- Login no `store/index.js`

**Tempo estimado:** 3-4 dias

---

### FASE 2 — Layout Base (Semana 2-3)
**Objetivo:** Layout responsivo com navbar e sidebar

```
Componentes:
├── MainLayout.vue (novo)
│   ├── AppNavbar.vue
│   │   ├── Logo + nome empresa
│   │   ├── Menu principal
│   │   ├── Notificações (sino)
│   │   ├── Toggle dark/light
│   │   └── Perfil do utilizador
│   └── AppSidebar.vue (opcional)
│       ├── Menu colapsável
│       └── Ícones + labels
├── AuthLayout.vue (novo)
│   └── Layout limpo para login
└── AppBreadcrumb.vue (novo)
```

**Substitui:**
- `NavBar.vue` (455 linhas)
- `CompanyNavBar.vue`
- Navbars inline no GestorDashboard e CustomerDashboard

**Tempo estimado:** 4-5 dias

---

### FASE 3 — Dashboard Admin (Semana 3-4)
**Objetivo:** Dashboard principal com KPIs e gráficos

```
Componentes:
├── DashboardPage.vue (novo)
│   ├── KpiSection.vue
│   │   ├── KpiCard.vue (reutilizável)
│   │   │   ├── Ícone
│   │   │   ├── Valor
│   │   │   ├── Label
│   │   │   └── Trend arrow (↑↓)
│   │   └── Grid de 8 KPIs
│   ├── ChartsSection.vue
│   │   ├── BarChart.vue (Chart.js)
│   │   ├── LineChart.vue
│   │   └── DonutChart.vue
│   ├── FiltersBar.vue
│   │   ├── Quick filters (Hoje, Semana, Mês)
│   │   ├── Date pickers
│   │   └── Botão aplicar
│   ├── OverdueTable.vue
│   │   └── Tabela com sticky header
│   └── CompletedLoansModal.vue
├── stores/dashboard.js (novo)
│   ├── getOverview()
│   ├── getKpis()
│   └── getCharts()
└── composables/useDashboard.js
```

**Substitui:**
- `HomeView.vue` (2.267 linhas → ~300 linhas divididas)

**Dependências:**
```bash
npm install chart.js vue-chartjs
```

**Tempo estimado:** 5-7 dias

---

### FASE 4 — Gestão de Mutuários (Semana 4-5)
**Objetivo:** CRUD completo de mutuários

```
Componentes:
├── CustomerListPage.vue (novo)
│   ├── SearchBar.vue
│   │   ├── Pesquisa geral
│   │   ├── Filtro por bairro
│   │   └── Botões exportação
│   ├── DataTable.vue (reutilizável)
│   │   ├── Sorting visual
│   │   ├── Paginação
│   │   ├── Sticky header
│   │   └── Empty state
│   ├── CustomerRow.vue
│   │   ├── Avatar
│   │   ├── Nome + telefone
│   │   ├── Estado
│   │   └── Accões
│   └── CustomerFormModal.vue
│       ├── Dados pessoais
│       ├── Morada
│       ├── Documentos
│       └── Validação
├── CustomerDetailPage.vue (novo)
│   ├── CustomerHeader.vue
│   ├── LoansSection.vue
│   ├── DocumentsSection.vue
│   └── HistorySection.vue
├── stores/customers.js (novo)
│   ├── getAll()
│   ├── getById()
│   ├── create()
│   ├── update()
│   ├── delete()
│   ├── search()
│   └── importExcel()
└── composables/useCustomers.js
```

**Substitui:**
- `CustomerView.vue` (1.241 linhas)
- `BorrowerView.vue` (1.271 linhas)

**Tempo estimado:** 6-8 dias

---

### FASE 5 — Créditos (Semana 5-6)
**Objetivo:** Gestão de créditos e amortização

```
Componentes:
├── LoanListPage.vue (novo)
├── LoanCreatePage.vue (novo)
│   ├── Simulator.vue
│   │   ├── Input valor
│   │   ├── Input prazo
│   │   ├── Input taxa
│   │   └── Resultado simulado
│   ├── LoanForm.vue
│   └── GuaranteesForm.vue
├── AmortizationPage.vue (novo)
│   ├── AmortizationTable.vue
│   ├── PaymentButton.vue
│   └── PrintPlan.vue
├── stores/loans.js (novo)
│   ├── getAll()
│   ├── getById()
│   ├── create()
│   ├── getAmortization()
│   └── makePayment()
└── composables/useLoans.js
```

**Substitui:**
- `LoansItems.vue` (2.143 linhas)
- `AmortizationPlan.vue` (1.912 linhas)
- `ItemLoans.vue` (694 linhas)

**Tempo estimado:** 5-7 dias

---

### FASE 6 — Pagamentos e Prestações (Semana 6-7)
**Objetivo:** Registo e acompanhamento de pagamentos

```
Componentes:
├── PaymentsPage.vue (novo)
│   ├── FilterBar.vue
│   ├── PaymentTable.vue
│   ├── PaymentFormModal.vue
│   └── ExportButtons.vue
├── InstallmentsPage.vue (novo)
│   ├── OverdueSection.vue
│   ├── UpcomingSection.vue
│   └── ActionButtons.vue
├── stores/payments.js (novo)
│   ├── getAll()
│   ├── create()
│   ├── getDue()
│   └── getUpcoming()
└── composables/usePayments.js
```

**Substitui:**
- `PaymentsView.vue` (916 linhas)
- `UpcomingInstallmentsView.vue` (837 linhas)

**Tempo estimado:** 4-5 dias

---

### FASE 7 — Relatórios (Semana 7-8)
**Objetivo:** Geração de relatórios e exportações

```
Componentes:
├── ReportsPage.vue (novo)
│   ├── DateRangeFilter.vue
│   ├── ReportTypeSelector.vue
│   ├── ReportPreview.vue
│   └── ExportButtons.vue
├── stores/reports.js (novo)
│   ├── getBMReport()
│   ├── getPaymentReport()
│   └── exportPDF()
└── composables/useReports.js
```

**Substitui:**
- `ReportsView.vue` (1.028 linhas)

**Tempo estimado:** 3-4 dias

---

### FASE 8 — Configurações (Semana 8-9)
**Objetivo:** Painel de administração

```
Componentes:
├── SettingsPage.vue (novo)
│   ├── UsersPage.vue
│   │   ├── UserTable.vue
│   │   └── UserFormModal.vue
│   ├── AccountsPage.vue
│   │   ├── AccountTable.vue
│   │   └── AccountFormModal.vue
│   ├── RatesPage.vue
│   │   ├── RateTable.vue
│   │   └── RateFormModal.vue
│   └── CompanyPage.vue
│       ├── CompanyForm.vue
│       └── LogoUpload.vue
├── stores/settings.js (novo)
│   ├── getUsers()
│   ├── getAccounts()
│   ├── getRates()
│   └── getCompany()
└── composables/useSettings.js
```

**Substitui:**
- `SettingsView.vue`
- `UserComponent.vue`
- `AccountsComponent.vue`
- `InterestRateComponent.vue`
- `CompanyDetailsComponent.vue`

**Tempo estimado:** 5-6 dias

---

### FASE 9 — Portal do Mutuário (Semana 9-10)
**Objetivo:** Portal separado para clientes

```
Componentes:
├── CustomerLayout.vue (novo)
│   ├── CustomerNavbar.vue
│   └── CustomerSidebar.vue
├── PortalDashboardPage.vue (novo)
│   ├── WelcomeCard.vue
│   ├── ActiveLoans.vue
│   └── UpcomingPayments.vue
├── PortalLoansPage.vue (novo)
│   ├── LoanCard.vue
│   └── AmortizationTimeline.vue
├── PortalPaymentsPage.vue (novo)
│   └── PaymentHistory.vue
├── stores/customerPortal.js (novo)
│   ├── getLoans()
│   ├── getPayments()
│   └── getNotifications()
└── composables/useCustomerPortal.js
```

**Substitui:**
- `CustomerDashboardView.vue` (2.456 linhas)

**Tempo estimado:** 5-6 dias

---

### FASE 10 — Gestor (Semana 10-11)
**Objetivo:** Dashboard do gestor de crédito

```
Componentes:
├── GestorLayout.vue (novo)
├── GestorDashboardPage.vue (novo)
│   ├── GestorKpis.vue
│   ├── AssignedCustomers.vue
│   └── GestorCharts.vue
├── stores/gestor.js (novo)
│   ├── getOverview()
│   ├── getAssignedCustomers()
│   └── getInstallments()
└── composables/useGestor.js
```

**Substitui:**
- `GestorDashboardView.vue` (2.881 linhas)

**Tempo estimado:** 5-7 dias

---

### FASE 11 — Notificações e Infraestrutura (Semana 11-12)
**Objetivo:** Funcionalidades transversais

```
Componentes:
├── NotificationBell.vue (novo)
│   ├── Badge counter
│   ├── Dropdown list
│   └── Mark as read
├── NotificationPage.vue (novo)
├── stores/notifications.js (novo)
│   ├── getAll()
│   ├── getUnread()
│   ├── markAsRead()
│   └── markAllRead()
├── composables/useNotifications.js
├── LogsPage.vue (novo)
│   ├── SystemLogsPage.vue
│   └── UserLogsPage.vue
└── stores/logs.js (novo)
```

**Substitui:**
- `NotificationsView.vue`
- `SystemLogsView.vue`
- `LogsView.vue`

**Tempo estimado:** 3-4 dias

---

### FASE 12 — Tema e Polish (Semana 12)
**Objetivo:** Refinamento visual e UX

```
Entregáveis:
├── Dark mode completo
│   ├── Variáveis CSS para dark
│   └── Testes em todas as páginas
├── Animações
│   ├── Page transitions
│   ├── Modal animations
│   └── Loading states
├── Skeleton loaders
│   ├── Dashboard
│   ├── Customer list
│   └── Tables
├── Empty states ilustrados
│   ├── Sem dados
│   ├── Sem resultados
│   └── Erro de rede
├── Mobile optimization
│   ├── Touch gestures
│   ├── Bottom navigation
│   └── Swipe actions
└── Acessibilidade
    ├── ARIA labels
    ├── Keyboard navigation
    └── Focus management
```

**Tempo estimado:** 4-5 dias

---

## 📊 Roadmap Visual

```
Semana  1   2   3   4   5   6   7   8   9  10  11  12
        │   │   │   │   │   │   │   │   │   │   │   │
Fase 0  ████│   │   │   │   │   │   │   │   │   │   │  Setup
Fase 1   │████│   │   │   │   │   │   │   │   │   │   Auth
Fase 2   │  ██████│   │   │   │   │   │   │   │   │   Layout
Fase 3   │   │██████│   │   │   │   │   │   │   │   │  Dashboard
Fase 4   │   │   │██████│   │   │   │   │   │   │   │  Customers
Fase 5   │   │   │   │██████│   │   │   │   │   │   │  Loans
Fase 6   │   │   │   │   │█████│   │   │   │   │   │  Payments
Fase 7   │   │   │   │   │   │████│   │   │   │   │   Reports
Fase 8   │   │   │   │   │   │   │█████│   │   │   │  Settings
Fase 9   │   │   │   │   │   │   │   │█████│   │   │  Portal
Fase 10  │   │   │   │   │   │   │   │   │█████│   │  Gestor
Fase 11  │   │   │   │   │   │   │   │   │   │████│  Notifications
Fase 12  │   │   │   │   │   │   │   │   │   │  ████ Polish
```

---

## 🔄 Estratégia de Migração Paralela

### Abordagem: "Strangler Fig Pattern"

```
┌─────────────────────────────────────────────────────────┐
│                    SERVIDOR (Node.js)                    │
│                    API unchanged                         │
└─────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
    ┌───────────┐  ┌───────────┐  ┌───────────┐
    │  App Nova │  │  App Nova │  │  App Nova │
    │  (Quasar) │  │  (Quasar) │  │  (Quasar) │
    │  Fase 1-3 │  │  Fase 4-6 │  │  Fase 7-9 │
    └───────────┘  └───────────┘  └───────────┘
            │             │             │
            └─────────────┼─────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │  App Antiga     │
                │  (Vue 2)        │
                │  Reduzindo...   │
                └─────────────────┘
```

### Passos Concretos

1. **Manter API inalterada** — Não mexer no backend
2. **Criar novo projecto** em `web-app-v2/`
3. **Migrar funcionalidade a funcionalidade**
4. **Proxy no dev server** para mesma API
5. **Deploy gradual** — Features novas na app nova
6. **Switch gradual** — Redirecionar tráfego

---

## 📦 Dependências do Novo Projecto

```json
{
  "dependencies": {
    "@quasar/extras": "^1.16.0",
    "axios": "^1.6.0",
    "chart.js": "^4.4.0",
    "date-fns": "^3.0.0",
    "pinia": "^2.1.0",
    "pinia-plugin-persistedstate": "^3.2.0",
    "quasar": "^2.14.0",
    "vue": "^3.4.0",
    "vue-chartjs": "^5.3.0",
    "vue-router": "^4.2.0"
  },
  "devDependencies": {
    "@quasar/app-vite": "^1.7.0",
    "sass": "^1.69.0",
    "vite": "^5.0.0"
  }
}
```

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Perda de dados durante migração | Baixa | Alto | API inalterada, testes rigorosos |
| Quebra de funcionalidade | Média | Alto | Migrar uma fase de cada vez |
| Performance degradada | Baixa | Médio | Quasar é mais rápido que BootstrapVue |
| Utilizadores confusos | Média | Baixo | Manter UI consistente |
| Prazo excedido | Média | Médio | Fases independentes, priorizar |

---

## 🎯 Critérios de Sucesso

- [ ] Todas as funcionalidades migradas
- [ ] Testes unitários > 80%
- [ ] Performance Lighthouse > 90
- [ ] Zero bugs críticos
- [ ] Deploy em produção
- [ ] App antiga descontinuada

---

## 📝 Notas de Implementação

### Convenções de Código

```javascript
// ✅ CORRETO — Composition API
<script setup>
import { ref, computed } from 'vue'
import { useCustomerStore } from '@/stores/customers'

const customerStore = useCustomerStore()
const search = ref('')
const customers = computed(() => customerStore.filteredCustomers(search.value))
</script>

// ❌ EVITAR — Options API (manter compatibilidade apenas)
export default {
  data() { return { search: '' } },
  computed: { ... }
}
```

### Estrutura de Store (Pinia)

```javascript
// stores/customers.js
import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useCustomerStore = defineStore('customers', {
  state: () => ({
    customers: [],
    currentCustomer: {},
    loading: false,
    pagination: { page: 1, total: 0 }
  }),

  getters: {
    filteredCustomers: (state) => (search) => {
      return state.customers.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    }
  },

  actions: {
    async fetchCustomers(params) {
      this.loading = true
      try {
        const { data } = await api.get('/customers', { params })
        this.customers = data.result
        this.pagination = data.pagination
      } finally {
        this.loading = false
      }
    }
  },

  persist: true // pinia-plugin-persistedstate
})
```

---

**Última atualização:** 26 de Agosto de 2026
**Autor:** Buffy (Codebuff)
