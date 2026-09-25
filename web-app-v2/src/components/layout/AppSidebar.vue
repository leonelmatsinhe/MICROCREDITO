<template>
  <q-drawer
    v-model="drawerOpen"
    show-if-above
    :width="262"
    :mini-width="76"
    :mini="miniMode"
    :breakpoint="1024"
    class="sidebar-drawer"
  >
    <!-- ═══════ MARCA ═══════ -->
    <div class="brand" :class="{ 'brand-mini': miniMode }">
      <div class="logo-box" :class="{ 'logo-box-mini': miniMode }">
        <img :src="logoSrc" alt="Logo" class="logo-img" @error="handleLogoError" />
        <q-icon v-if="logoError" name="business" size="20px" color="green-8" class="logo-fallback" />
      </div>
      <transition name="fade">
        <div v-if="!miniMode" class="brand-text">
          <div class="brand-name ellipsis">{{ companyName }}</div>
          <div class="brand-role ellipsis">{{ userRoleLabel }}</div>
        </div>
      </transition>
      <q-btn
        v-if="!miniMode"
        flat round dense
        icon="menu_open"
        size="sm"
        class="brand-toggle"
        @click="toggleMini"
      >
        <q-tooltip>Modo ícone</q-tooltip>
      </q-btn>
      <q-btn v-else flat round dense icon="menu" size="sm" class="brand-toggle" @click="toggleMini">
        <q-tooltip>Expandir menu</q-tooltip>
      </q-btn>
    </div>

    <!-- ═══════ BUSCA ═══════ -->
    <div v-if="!miniMode" class="search-wrap">
      <q-input
        v-model="search"
        dense
        dark
        borderless
        placeholder="Buscar menu..."
        class="search-input"
        input-style="font-size: 12.5px"
      >
        <template v-slot:prepend><q-icon name="search" size="16px" /></template>
        <template v-slot:append v-if="search">
          <q-icon name="close" size="14px" class="cursor-pointer" @click="search = ''" />
        </template>
      </q-input>
    </div>

    <!-- ═══════ MENU ═══════ -->
    <q-scroll-area class="menu-scroll">
      <q-list v-if="miniMode" class="q-py-sm">
        <q-item
          v-for="item in flatItems"
          :key="item.to + item.label"
          :to="item.to"
          clickable v-ripple
          class="nav-item nav-item-mini"
          active-class="nav-item-active"
        >
          <q-item-section avatar class="nav-avatar">
            <q-icon :name="item.icon" size="20px" />
            <q-badge v-if="item.badge" floating :color="item.badgeColor || 'negative'" :label="item.badge" />
          </q-item-section>
          <q-tooltip anchor="center right" self="center left">{{ item.label }}</q-tooltip>
        </q-item>
      </q-list>

      <template v-else>
        <!-- Favoritos -->
        <template v-if="favoriteItems.length > 0">
          <div class="group-label">Favoritos</div>
          <q-item
            v-for="item in favoriteItems"
            :key="`fav-${item.to}`"
            :to="item.to"
            clickable v-ripple
            class="nav-item"
            active-class="nav-item-active"
          >
            <q-item-section avatar class="nav-avatar"><q-icon :name="item.icon" size="19px" /></q-item-section>
            <q-item-section class="nav-label">{{ item.label }}</q-item-section>
            <q-item-section side>
              <q-icon name="star" size="15px" color="amber-6" class="cursor-pointer" @click.prevent.stop="toggleFavorite(item)" />
            </q-item-section>
          </q-item>
          <q-separator class="group-sep" />
        </template>

        <template v-for="(group, gi) in visibleGroups" :key="group.id">
          <q-separator v-if="gi > 0" class="group-sep" />
          <q-expansion-item
            v-model="expanded[group.id]"
            class="nav-group"
            header-class="nav-group-header"
            expand-icon-class="nav-group-caret"
          >
            <template v-slot:header>
              <q-item-section avatar class="nav-avatar group-avatar">
                <q-icon :name="group.icon" size="18px" />
              </q-item-section>
              <q-item-section class="group-label-inline">{{ group.label }}</q-item-section>
              <q-item-section side>
                <q-badge outline color="white" :label="group.items.length" class="group-count" />
              </q-item-section>
            </template>

            <q-item
              v-for="item in group.items"
              :key="item.to + item.label"
              :to="item.to"
              clickable v-ripple
              class="nav-item nav-item-sub"
              active-class="nav-item-active"
            >
              <q-item-section avatar class="nav-avatar">
                <q-icon :name="item.icon" size="18px" />
                <q-badge v-if="item.badge" floating :color="item.badgeColor || 'negative'" :label="item.badge" />
              </q-item-section>
              <q-item-section class="nav-label">{{ item.label }}</q-item-section>
              <q-item-section side>
                <q-icon
                  :name="isFavorite(item) ? 'star' : 'star_border'"
                  size="15px"
                  :color="isFavorite(item) ? 'amber-6' : 'grey-5'"
                  class="cursor-pointer fav-icon"
                  @click.prevent.stop="toggleFavorite(item)"
                />
              </q-item-section>
            </q-item>
          </q-expansion-item>
        </template>

        <div v-if="visibleGroups.length === 0" class="text-center q-pa-lg text-grey-5" style="font-size: 12px">
          Nada encontrado para "{{ search }}"
        </div>
      </template>
    </q-scroll-area>

    <!-- ═══════ RODAPÉ ═══════ -->
    <div class="drawer-footer">
      <q-separator class="footer-sep" />
      <div v-if="!miniMode" class="version-line">Mais Mola v2026.9 • UUIDv7 Secure</div>
    </div>
  </q-drawer>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useUiStore } from '@/stores/ui'

/**
 * SIDEMENU — navegação agrupada com busca, favoritos e modo ícone.
 * Os grupos colapsam, o grupo da rota actual abre sozinho e a pesquisa filtra
 * os itens em tempo real (sem perder os favoritos).
 */
const props = defineProps({
  modelValue: { type: Boolean, default: true },
  miniMode: { type: Boolean, default: false },
  pendingCount: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'new-loan', 'new-payment', 'toggle-mini'])

const authStore = useAuthStore()
const companyStore = useCompanyStore()
const uiStore = useUiStore()
const route = useRoute()
const router = useRouter()

const logoError = ref(false)
const search = ref('')
const expanded = ref({ geral: true, credito: true, financeiro: false, financiamento: false, relatorios: false, sistema: false })

const FAVORITES_KEY = 'mbr_sidebar_favorites'
const favorites = ref([])
try {
  favorites.value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
} catch { favorites.value = [] }

const drawerOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const companyName = computed(() => {
  const name = companyStore.companyName
  return name && name.trim() ? name : 'Mais Mola'
})

const logoSrc = computed(() => (logoError.value ? '/logo.png' : companyStore.companyLogo))

function handleLogoError() {
  logoError.value = true
}

function toggleMini() {
  uiStore.setSidebarStyle(props.miniMode ? 'expanded' : 'mini')
  emit('toggle-mini')
}

const userRoleLabel = computed(() => {
  const roles = { 0: 'Super Admin', 1: 'Administrador', 2: 'Operador', 3: 'Gestor de Crédito', 4: 'Parceiro Financiador' }
  return roles[authStore.userRole] || 'Utilizador'
})

const isSuperAdmin = computed(() => authStore.userRole === 0)
const canSeeSms = computed(() => [1, 3].includes(Number(authStore.userRole)))

/** Grupos por secção — cada item com ícone moderno e badge opcional. */
const groups = computed(() => {
  const role = Number(authStore.userRole)

  if (isSuperAdmin.value) {
    return [
      {
        id: 'geral',
        label: 'Geral',
        icon: 'space_dashboard',
        items: [
          { to: '/dashboard', icon: 'space_dashboard', label: 'Painel' },
          { to: '/company', icon: 'domain', label: 'Painel da Empresa' }
        ]
      },
      {
        id: 'sistema',
        label: 'Sistema',
        icon: 'settings',
        items: [{ to: '/configuracoes', icon: 'settings', label: 'Configurações' }]
      }
    ]
  }

  const all = [
    {
      id: 'geral',
      label: 'Geral',
      icon: 'space_dashboard',
      items: [{ to: '/dashboard', icon: 'space_dashboard', label: 'Painel' }]
    },
    {
      id: 'credito',
      label: 'Gestão de Crédito',
      icon: 'account_balance_wallet',
      items: [
        { to: '/mutuarios', icon: 'groups', label: 'Mutuários' },
        { to: '/loans', icon: 'request_quote', label: 'Créditos' },
        { to: '/admin/installments', icon: 'event_repeat', label: 'Controle Prestações' }
      ]
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: 'payments',
      items: [
        { to: '/pagamentos', icon: 'receipt_long', label: 'Pagamentos' },
        { to: '/caixa-central', icon: 'account_balance_wallet', label: 'Caixa Central' },
        { to: '/bank-accounts', icon: 'account_balance', label: 'Contas Bancárias' },
        { to: '/caixa', icon: 'point_of_sale', label: 'Caixa' },
        { to: '/caixa/historico', icon: 'history_toggle_off', label: 'Histórico Caixa' }
      ]
    },
    {
      id: 'financiamento',
      label: 'Financiamento',
      icon: 'savings',
      items: [
        { to: '/financiamento', icon: 'savings', label: 'Carteiras e Taxas' },
        { to: '/equipe?tab=parceiros', icon: 'handshake', label: 'Parceiros Financiadores' },
        { to: '/reports/financiadores', icon: 'assessment', label: 'Relatório Financiadores' }
      ]
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: 'summarize',
      items: [{ to: '/reports/banco-mocambique', icon: 'description', label: 'Relatório BM' }]
    },
    {
      id: 'sistema',
      label: 'Sistema',
      icon: 'settings',
      items: [
        { to: '/equipe', icon: 'groups', label: 'Equipa e Parceiros' },
        { to: '/settings', icon: 'settings', label: 'Configurações' },
        // Legados movidos do rodapé para SISTEMA (sem duplicação)
        ...(canSeeSms.value ? [{ to: '/sms/pendentes', icon: 'forum', label: 'Mensagens' }] : []),
        ...(role === 1 ? [{ to: '/logs', icon: 'history', label: 'Histórico' }] : [])
      ]
    }
  ]

  if (role === 1) return all

  // Gestor: painel + mutuários + créditos; Operador: painel + mutuários.
  if (role === 3) {
    return all
      .map((group) =>
        ['geral', 'credito'].includes(group.id)
          ? group
          : { ...group, items: group.items.filter((item) => ['/painel'].includes(item.to)) }
      )
      .filter((group) => group.items.length > 0)
  }

  return [
    {
      id: 'geral',
      label: 'Geral',
      icon: 'space_dashboard',
      items: [{ to: '/dashboard', icon: 'space_dashboard', label: 'Painel' }]
    },
    {
      id: 'credito',
      label: 'Gestão de Crédito',
      icon: 'account_balance_wallet',
      items: [{ to: '/mutuarios', icon: 'groups', label: 'Mutuários' }]
    }
  ]
})

/** Aplica a busca e os contadores aos grupos. */
const visibleGroups = computed(() => {
  const term = search.value.trim().toLowerCase()
  return groups.value
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => ({ ...item, badge: badgeFor(item) }))
        .filter((item) => !term || `${item.label} ${group.label}`.toLowerCase().includes(term))
    }))
    .filter((group) => group.items.length > 0)
})

const flatItems = computed(() => visibleGroups.value.flatMap((group) => group.items))

const favoriteItems = computed(() => {
  const map = new Map()
  groups.value.forEach((group) => group.items.forEach((item) => map.set(item.to, { ...item, badge: badgeFor(item) })))
  return favorites.value.map((to) => map.get(to)).filter(Boolean)
})

function badgeFor(item) {
  if (item.to === '/sms/pendentes' || item.label === 'Mensagens') {
    return props.pendingCount > 0 ? props.pendingCount : null
  }
  return item.badge || null
}

const isFavorite = (item) => favorites.value.includes(item.to)

function toggleFavorite(item) {
  favorites.value = isFavorite(item)
    ? favorites.value.filter((to) => to !== item.to)
    : [...favorites.value, item.to]
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value))
}

/** Mantém aberto o grupo da rota actual. */
function openGroupOfCurrentRoute() {
  const path = route.path
  const group = groups.value.find((entry) =>
    entry.items.some((item) => item.to.split('?')[0] === path)
  )
  if (group) expanded.value[group.id] = true
}

watch(() => route.path, openGroupOfCurrentRoute)

// Atalho de pesquisa: Ctrl/Cmd+K abre a busca do menu.
function onKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    if (props.miniMode) toggleMini()
    const input = document.querySelector('.search-input input')
    if (input) input.focus()
  }
}

onMounted(() => {
  const companyId = authStore.companyId
  if (companyId && !companyStore.hasCompany) {
    companyStore.fetchCompany(companyId)
  }
  openGroupOfCurrentRoute()
  window.addEventListener('keydown', onKeydown)
})

// Mantém o router referenciado (navegação programática futura sem warning).
void router
</script>

<style lang="scss">
/* NÃO-SCOPED: precisa de penetrar nos componentes internos do q-drawer */
.sidebar-drawer {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0f5132 0%, #14663f 45%, #0b3d26 100%) !important;
  color: #fff;
}

body.body--dark .sidebar-drawer {
  background: linear-gradient(180deg, #0f172a 0%, #16233c 100%) !important;
}

/* ── Marca ── */
.brand {
  display: flex;
  align-items: center;
  padding: 14px 14px 12px;
  min-height: 68px;
  gap: 10px;
}

.brand-mini {
  justify-content: center;
  padding: 14px 0;
}

.logo-box {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
}

.logo-box-mini { width: 38px; height: 38px; }

.logo-img { width: 100%; height: 100%; object-fit: contain; }

.logo-fallback {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.brand-text { overflow: hidden; flex: 1; }
.brand-name { font-size: 13px; font-weight: 700; color: #fff; }
.brand-role { font-size: 10.5px; color: rgba(255, 255, 255, 0.65); }
.brand-toggle { color: rgba(255, 255, 255, 0.75) !important; }

/* ── Busca ── */
.search-wrap { padding: 0 12px 8px; }

.search-input {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: #fff;

  input { color: #fff !important; }
  input::placeholder { color: rgba(255, 255, 255, 0.6) !important; }
  .q-field__prepend, .q-field__append { color: rgba(255, 255, 255, 0.75) !important; }
  .q-field__control { height: 38px; }
}

/* ── Menu ── */
.menu-scroll {
  flex: 1;
  min-height: 0;
}

.group-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: rgba(255, 255, 255, 0.45);
  padding: 12px 18px 6px;
}

.group-sep {
  background: rgba(255, 255, 255, 0.1) !important;
  margin: 6px 14px;
}

.nav-group { margin: 2px 6px 0; }

.nav-group-header {
  border-radius: 12px;
  margin: 2px 0;
  min-height: 40px;
}

.nav-group-caret { color: rgba(255, 255, 255, 0.6) !important; }

.group-label-inline {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.58);
  font-weight: 600;
}

.group-avatar { color: rgba(255, 255, 255, 0.6); }

.group-count {
  font-size: 9px;
  opacity: 0.7;
  border-color: rgba(255, 255, 255, 0.4) !important;
  color: rgba(255, 255, 255, 0.7) !important;
}

.nav-item {
  color: rgba(255, 255, 255, 0.82) !important;
  font-weight: 500;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
  min-height: 38px;
  margin: 2px 8px;
  border-radius: 12px;
  padding: 0 10px;
}

.nav-item-sub { margin-left: 14px; }

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
}

.nav-item-mini {
  justify-content: center;
  padding: 0;
  min-height: 44px;
  margin: 2px 6px;
}

.nav-avatar { min-width: 34px; color: inherit; }

.nav-label { font-size: 13px; white-space: nowrap; }

.fav-icon { opacity: 0; transition: opacity 0.15s ease; }

.nav-item:hover .fav-icon,
.nav-item-active .fav-icon { opacity: 1; }

.nav-item-active {
  background: #fff !important;
  color: #0f5132 !important;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
}

body.body--dark .nav-item-active {
  background: rgba(255, 255, 255, 0.14) !important;
  color: #fff !important;
}

/* ── Rodapé ── */
.drawer-footer { padding-bottom: 6px; }

.footer-sep {
  background: rgba(255, 255, 255, 0.12) !important;
  margin: 0 14px 4px;
}

.version-line {
  text-align: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  padding: 8px 0 4px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
