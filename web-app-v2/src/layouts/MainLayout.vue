<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Navbar -->
    <AppNavbar
      :notifications="notifications"
      :unread-count="unreadCount"
      :sidebar-mini="sidebarMini"
      @toggle-sidebar="toggleSidebar"
    />

    <!-- Sidebar -->
    <AppSidebar
      v-model="sidebarOpen"
      :mini-mode="sidebarMini"
      :pending-count="pendingCount"
      @new-loan="openNewLoan"
      @new-payment="openNewPayment"
      @toggle-mini="sidebarMini = !sidebarMini"
    />

    <!-- Content -->
    <q-page-container>
      <q-page class="page-content" data-tour="page-content">
        <!-- Page Content via Slot (breadcrumbs vivem no header) -->
        <slot />
      </q-page>
    </q-page-container>

    <!-- Ajuda / tour guiado (botão flutuante «?») -->
    <HelpTourButton />

    <!-- Checklist do primeiro dia (tarefas persistentes por utilizador) -->
    <OnboardingChecklistDialog />
  </q-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import HelpTourButton from '@/components/HelpTourButton.vue'
import OnboardingChecklistDialog from '@/components/onboarding/OnboardingChecklistDialog.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useAppTour } from '@/composables/useAppTour'
import { useOnboardingChecklist } from '@/composables/useOnboardingChecklist'

const router = useRouter()
const $q = useQuasar()
const uiStore = useUiStore()
const authStore = useAuthStore()
const {
  isActive: tourActive,
  shouldPromptOnboarding,
  startTour,
  markSeen
} = useAppTour({ router })

const {
  openPanel: openChecklist,
  shouldAutoOpen: shouldAutoOpenChecklist,
  markAutoOpened: markChecklistAutoOpened,
  loadFromServer: loadChecklistFromServer
} = useOnboardingChecklist({ router })

// State
const sidebarOpen = ref(true)
const sidebarMini = computed(() => uiStore.sidebarStyle === 'mini')
const notifications = ref([])
const unreadCount = ref(0)
const pendingCount = ref(0)

// Methods
function toggleSidebar() {
  uiStore.setSidebarStyle(uiStore.sidebarStyle === 'mini' ? 'expanded' : 'mini')
}

function openNewLoan() {
  console.log('Abrir modal de novo crédito')
}

function openNewPayment() {
  console.log('Abrir modal de novo pagamento')
}

// ── Tour guiado: o menu precisa de estar aberto (os alvos vivem na sidebar) ──
let sidebarStyleBeforeTour = null
watch(tourActive, (active) => {
  if (active) {
    sidebarOpen.value = true
    if (uiStore.sidebarStyle === 'mini') {
      sidebarStyleBeforeTour = 'mini'
      uiStore.setSidebarStyle('expanded')
    }
    return
  }
  if (sidebarStyleBeforeTour) {
    uiStore.setSidebarStyle(sidebarStyleBeforeTour)
    sidebarStyleBeforeTour = null
  }
})

// Primeiro acesso com este perfil: sugere o onboarding uma única vez.
onMounted(() => {
  // Progresso do checklist vive no servidor (segue o utilizador entre
  // dispositivos) — o localStorage fica como cache/fallback offline.
  loadChecklistFromServer()

  // Checklist do primeiro dia: abre-se sozinho uma única vez por utilizador,
  // desde que não esteja um tour a correr (nesse caso não interrompe).
  window.setTimeout(() => {
    if (tourActive.value || !shouldAutoOpenChecklist()) return
    markChecklistAutoOpened()
    openChecklist()
  }, 6000)

  const role = authStore.userRole
  if (!shouldPromptOnboarding(role)) return
  markSeen(role)
  window.setTimeout(() => {
    $q.notify({
      type: 'positive',
      message: 'Quer um tour guiado pela plataforma?',
      caption: 'Mostramos onde está cada funcionalidade. Pode sair quando quiser.',
      position: 'top',
      timeout: 12000,
      multiLine: true,
      actions: [
        { label: 'Tour rápido', color: 'white', handler: () => startTour('quick', role) },
        { label: 'Tour completo', color: 'white', handler: () => startTour('full', role) },
        { label: 'Agora não', color: 'white' }
      ]
    })
  }, 1400)
})
</script>

<style lang="scss" scoped>
.page-content {
  background-color: $gray-50;
  min-height: calc(100vh - 50px);
}

body.body--dark .page-content {
  background-color: $dark-page;
}
</style>
