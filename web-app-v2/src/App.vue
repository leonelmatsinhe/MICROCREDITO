<template>
  <LandingLayout v-if="isAuthPage">
    <router-view />
  </LandingLayout>
  <!-- Portal do mutuário e portal do financiador têm layout próprio (sem sidebar MBRM) -->
  <router-view v-else-if="isPortalRoute || isPartnerRoute" />
  <MainLayout v-else-if="isLoggedIn">
    <router-view />
  </MainLayout>
  <router-view v-else />
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useCompanyStore } from '@/stores/company'
import LandingLayout from '@/layouts/LandingLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { activityTracker } from '@/utils/activityTracker'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const uiStore = useUiStore()
const companyStore = useCompanyStore()

const isAuthPage = computed(() => route.name === 'Login')
const isLoggedIn = computed(() => authStore.isLoggedIn)
const isPortalRoute = computed(() => route.path === '/portal' || route.path.startsWith('/portal/'))
// Portal do parceiro financiador (userRole 4): layout dedicado, sem sidebar do staff
const isPartnerRoute = computed(() => route.path === '/parceiro' || route.path.startsWith('/parceiro/'))

// Aplicar tema ao iniciar
$q.dark.set(uiStore.isDark)

// Aplicar cor primária guardada
if (uiStore.primaryColor) {
  document.documentElement.style.setProperty('--q-primary', uiStore.primaryColor)
}

// Reagir a mudanças de tema
watch(
  () => uiStore.isDark,
  (dark) => {
    $q.dark.set(dark)
  }
)

// Activity tracker - iniciar/parar consoante login
let warningDismissed = false

function startActivityTracker() {
  activityTracker.start({
    onLogout: () => {
      authStore.logout()
      router.push('/')
      $q.notify({
        type: 'warning',
        message: 'Sessão expirada por inactividade. Faça login novamente.',
        position: 'top',
        timeout: 5000
      })
    },
    onWarning: (minutesRemaining) => {
      if (!warningDismissed) {
        $q.notify({
          type: 'info',
          message: `Sessão expira em ${minutesRemaining} minuto(s). Mova o mouse para continuar.`,
          position: 'top',
          timeout: 8000,
          actions: [{ label: 'Entendido', color: 'white', handler: () => { warningDismissed = true } }]
        })
      }
    },
    onTokenRefreshed: (newToken) => {
      // Token renovado silenciosamente
    }
  })
}

function stopActivityTracker() {
  activityTracker.stop()
}

// Buscar dados da empresa e iniciar tracker quando logged in
onMounted(() => {
  if (isLoggedIn.value && authStore.companyId) {
    companyStore.fetchCompany(authStore.companyId)
    startActivityTracker()
  }
})

onUnmounted(() => {
  stopActivityTracker()
})

// Reagir a mudanças de login
watch(
  () => authStore.companyId,
  (companyId) => {
    if (companyId) {
      companyStore.fetchCompany(companyId)
      warningDismissed = false
      startActivityTracker()
    } else {
      companyStore.clearCompany()
      stopActivityTracker()
    }
  }
)
</script>
