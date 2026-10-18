<template>
  <q-layout view="hHh Lpr lFf" class="partner-layout">
    <!-- ═══════════ CABEÇALHO ═══════════ -->
    <q-header class="partner-header" elevated>
      <q-toolbar>
        <q-btn flat round dense icon="menu" @click="drawer = !drawer" class="gt-sm" />
        <q-avatar square size="28px" class="bg-white q-mr-sm" style="border-radius: 6px; padding: 2px">
          <img :src="logoSrc" alt="Logo" @error="onLogoError" />
        </q-avatar>
        <q-toolbar-title class="partner-title">
          <div class="text-subtitle2 text-weight-bold">Portal do Financiador</div>
          <div class="text-caption partner-company">{{ companyName }}</div>
        </q-toolbar-title>

        <q-badge
          v-if="wallet"
          :color="wallet.cor_badge || 'blue'"
          class="q-mr-sm partner-wallet-badge"
          :label="`${wallet.codigo} · ${wallet.parceiro_nome || 'Fundo MBRM'}`"
        />

        <q-btn flat round dense :icon="isDark ? 'light_mode' : 'dark_mode'" @click="uiStore.toggleDark()">
          <q-tooltip>{{ isDark ? 'Modo claro' : 'Modo escuro' }}</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="logout" @click="logout">
          <q-tooltip>Sair</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- ═══════════ MENU DO PARCEIRO ═══════════ -->
    <q-drawer v-model="drawer" show-if-above bordered :width="248" class="partner-drawer" data-tour="partner-menu">
      <q-list class="q-py-sm">
        <q-item-label header class="partner-menu-header">
          A minha carteira
        </q-item-label>
        <q-item
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          clickable
          v-ripple
          active-class="partner-item-active"
          class="partner-item"
        >
          <q-item-section avatar><q-icon :name="item.icon" size="18px" /></q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>

      <!-- Resumo rápido da carteira -->
      <div v-if="wallet" class="partner-wallet-card" data-tour="partner-wallet">
        <div class="text-caption text-grey-4">Capital alocado</div>
        <div class="text-subtitle2 text-white">{{ formatMoney(wallet.allocated_amount, 'Ilimitado') }}</div>
        <q-linear-progress
          v-if="wallet.allocated_amount !== null"
          :value="Number(wallet.utilizacao) || 0"
          color="white"
          track-color="green-9"
          rounded
          size="6px"
          class="q-mt-xs"
        />
        <div class="text-caption text-grey-4 q-mt-sm">Desembolsado</div>
        <div class="text-body2 text-white">{{ formatMoney(wallet.disbursed) }}</div>
        <div class="text-caption text-grey-4 q-mt-sm">Disponível</div>
        <div class="text-body2 text-white">{{ formatMoney(wallet.saldo_analitico, 'Sem limite') }}</div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Ajuda / tour guiado (botão flutuante «?») -->
    <HelpTourButton />

    <!-- Checklist do primeiro dia (tarefas persistentes por utilizador) -->
    <OnboardingChecklistDialog />
  </q-layout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useWalletsStore } from '@/stores/wallets'
import HelpTourButton from '@/components/HelpTourButton.vue'
import OnboardingChecklistDialog from '@/components/onboarding/OnboardingChecklistDialog.vue'
import { useAppTour } from '@/composables/useAppTour'
import { useOnboardingChecklist } from '@/composables/useOnboardingChecklist'

/**
 * LAYOUT DO PORTAL DO PARCEIRO FINANCIADOR (userRole 4).
 * O parceiro vê apenas a sua carteira: o backend filtra tudo por
 * users.walletId — nenhum endpoint deste portal aceita carteira como parâmetro.
 */
const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()
const walletsStore = useWalletsStore()
const { shouldPromptOnboarding, startTour, markSeen, isActive: tourActive } = useAppTour({ router })

const {
  openPanel: openChecklist,
  shouldAutoOpen: shouldAutoOpenChecklist,
  markAutoOpened: markChecklistAutoOpened,
  loadFromServer: loadChecklistFromServer
} = useOnboardingChecklist({ router })

// Em ecrãs largos o drawer fica sempre visível (show-if-above); em telemóvel
// começa fechado e abre pelo botão do menu.
const drawer = ref(false)
const isDark = computed(() => uiStore.isDark)

const wallet = computed(() => walletsStore.partnerProfile?.carteira || null)
const companyName = computed(() => walletsStore.partnerProfile?.empresa?.name || 'MBRM')

// Branding: logotipo da empresa do parceiro (companies.companyLogo, exposto em
// /api/partner/profile). Mesma resolução do store staff: filename → /documents/…,
// caminho absoluto → como está; vazio/URL externa → logo local por omissão.
const logoSrc = ref('/logo.png')

function applyCompanyLogo() {
  const logo = walletsStore.partnerProfile?.empresa?.companyLogo
  if (!logo || typeof logo !== 'string' || logo.startsWith('http')) return
  logoSrc.value = logo.startsWith('/') ? logo : `/documents/${logo}`
}

function onLogoError() {
  if (logoSrc.value !== '/logo.png') logoSrc.value = '/logo.png'
}

const menuItems = [
  { to: '/parceiro/dashboard', icon: 'dashboard', label: 'Painel' },
  { to: '/parceiro/creditos', icon: 'account_balance_wallet', label: 'Créditos desembolsados' },
  { to: '/parceiro/prestacoes-pagas', icon: 'task_alt', label: 'Prestações pagas' },
  { to: '/parceiro/prestacoes-pendentes', icon: 'schedule', label: 'Prestações pendentes' },
  { to: '/parceiro/mora', icon: 'warning_amber', label: 'Juros de mora' },
  { to: '/parceiro/recebimentos', icon: 'payments', label: 'Recebimentos' },
  { to: '/parceiro/extrato', icon: 'receipt_long', label: 'Extrato da carteira' },
  { to: '/parceiro/recibos', icon: 'description', label: 'Recibos' }
]

function formatMoney(value, fallback = '—') {
  if (value === null || value === undefined) return fallback
  return `${(Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
}

function logout() {
  authStore.logout()
  $q.notify({ type: 'info', message: 'Sessão terminada', position: 'top' })
  router.push('/')
}

onMounted(async () => {
  // Progresso do checklist vive no servidor (segue o utilizador) — o
  // localStorage fica como cache/fallback offline.
  loadChecklistFromServer()

  // Checklist do primeiro dia: abre-se sozinho uma única vez por utilizador.
  window.setTimeout(() => {
    if (tourActive.value || !shouldAutoOpenChecklist()) return
    markChecklistAutoOpened()
    openChecklist()
  }, 6000)

  // Primeiro acesso do financiador: sugere o onboarding uma única vez.
  if (shouldPromptOnboarding(4)) {
    markSeen(4)
    window.setTimeout(() => {
      $q.notify({
        type: 'positive',
        message: 'Quer um tour guiado pelo portal?',
        caption: 'Mostramos o que cada vista da sua carteira contém.',
        position: 'top',
        timeout: 12000,
        multiLine: true,
        actions: [
          { label: 'Ver tour', color: 'white', handler: () => startTour('full', 4) },
          { label: 'Agora não', color: 'white' }
        ]
      })
    }, 1400)
  }

  try {
    await walletsStore.fetchPartnerProfile()
    applyCompanyLogo()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Não foi possível carregar a carteira do parceiro',
      position: 'top'
    })
  }
})
</script>

<style lang="scss" scoped>
.partner-header {
  background: linear-gradient(90deg, #1b5e20 0%, #2e7d32 100%);
}

.partner-title {
  line-height: 1.1;
}

.partner-company {
  opacity: 0.85;
}

.partner-wallet-badge {
  font-size: 11px;
  padding: 4px 8px;
}

.partner-wallet-card {
  margin: 16px 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
}
</style>

<!-- NÃO scoped: o fundo do q-drawer tem de vencer os estilos do Quasar
     (mesmo padrão do AppSidebar do staff). -->
<style lang="scss">
.partner-drawer {
  background: linear-gradient(180deg, #1b5e20 0%, #2e7d32 100%) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

.partner-drawer .partner-menu-header {
  color: rgba(255, 255, 255, 0.6) !important;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.partner-drawer .partner-item {
  color: rgba(255, 255, 255, 0.85) !important;
  font-size: 13px;
  border-radius: 8px;
  margin: 1px 6px;
  min-height: 40px;
}

.partner-drawer .partner-item:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #fff !important;
}

.partner-drawer .partner-item-active {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
  font-weight: 600;
}
</style>
