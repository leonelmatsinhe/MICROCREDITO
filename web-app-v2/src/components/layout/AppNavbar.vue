<template>
  <q-header elevated class="navbar-header">
    <q-toolbar class="q-px-md" style="min-height: 50px">
      <!-- Sidebar Toggle -->
      <q-btn
        flat
        dense
        round
        :icon="sidebarMini ? 'menu' : 'menu_open'"
        @click="$emit('toggle-sidebar')"
        class="q-mr-sm"
        size="sm"
      />

      <!-- Route Title -->
      <div class="row items-center">
        <q-icon :name="routeIcon" size="20px" class="q-mr-sm text-white" style="opacity: 0.85" />
        <span class="text-white text-weight-bold" style="font-size: 15px">
          {{ routeTitle }}
        </span>
      </div>

      <q-space />

      <!-- Actions -->
      <div class="row items-center q-gutter-xs">
        <!-- Theme Toggle -->
        <q-btn
          flat
          round
          dense
          :icon="isDark ? 'light_mode' : 'dark_mode'"
          text-color="white"
          size="sm"
          @click="uiStore.toggleDark()"
        >
          <q-tooltip>{{ isDark ? 'Modo Claro' : 'Modo Escuro' }}</q-tooltip>
        </q-btn>

        <!-- Notifications -->
        <q-btn flat round dense icon="notifications" text-color="white" size="sm">
          <q-badge color="negative" floating v-if="unreadCount > 0">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </q-badge>
          <q-menu>
            <q-list style="min-width: 320px; max-height: 400px">
              <q-item-label header class="row items-center">
                <span class="text-weight-bold">Notificações</span>
                <q-space />
                <q-btn
                  v-if="unreadCount > 0"
                  flat
                  dense
                  no-caps
                  size="sm"
                  color="positive"
                  @click="markAllRead"
                >
                  Marcar todas como lidas
                </q-btn>
              </q-item-label>
              <q-separator />

              <div v-if="notifications.length === 0" class="text-center q-pa-lg">
                <q-icon name="notifications_off" size="40px" color="grey-4" />
                <div class="text-caption text-grey-5 q-mt-sm">Sem notificações</div>
              </div>

              <q-item
                v-for="notif in notifications"
                :key="notif.id"
                clickable
                v-ripple
                :class="{ 'bg-blue-1': !notif.read }"
              >
                <q-item-section avatar>
                  <q-avatar :color="getNotifColor(notif.type)" text-color="white" size="32px">
                    <q-icon :name="getNotifIcon(notif.type)" size="16px" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium" style="font-size: 13px">
                    {{ notif.title }}
                  </q-item-label>
                  <q-item-label caption style="font-size: 11px">
                    {{ notif.message }}
                  </q-item-label>
                  <q-item-label caption style="font-size: 10px" class="text-grey-5">
                    {{ timeAgo(notif.createdAt) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side v-if="!notif.read">
                  <q-badge color="positive" rounded />
                </q-item-section>
              </q-item>

              <q-separator v-if="notifications.length > 0" />
              <q-item to="/notifications" clickable v-ripple>
                <q-item-section class="text-center text-positive text-weight-medium" style="font-size: 12px">
                  Ver todas as notificações
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <!-- User Profile -->
        <q-btn flat round dense no-caps>
          <q-avatar color="positive" text-color="white" size="32px">
            <span style="font-size: 13px">{{ userInitials }}</span>
          </q-avatar>
          <q-menu>
            <q-list style="min-width: 220px">
              <q-item-label header>
                <div class="text-weight-bold" style="font-size: 14px">{{ authStore.userName }}</div>
                <div class="text-caption text-grey-5" style="font-size: 11px">{{ userRoleLabel }}</div>
              </q-item-label>
              <q-separator />
              <q-item clickable v-close-popup to="/profile">
                <q-item-section avatar>
                  <q-icon name="person" size="18px" />
                </q-item-section>
                <q-item-section style="font-size: 13px">Meu Perfil</q-item-section>
              </q-item>
              <q-item v-if="authStore.userRole === 1" clickable v-close-popup to="/settings">
                <q-item-section avatar>
                  <q-icon name="settings" size="18px" />
                </q-item-section>
                <q-item-section style="font-size: 13px">Configurações</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-ripple @click="handleLogout">
                <q-item-section avatar>
                  <q-icon name="logout" size="18px" color="negative" />
                </q-item-section>
                <q-item-section class="text-negative" style="font-size: 13px">Sair</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </q-toolbar>
  </q-header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useCustomerStore } from '@/stores/customers'
import { useLoansStore } from '@/stores/loans'
import { getInitials, timeAgo } from '@/utils/formatters'

const emit = defineEmits(['toggle-sidebar'])

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const authStore = useAuthStore()
const uiStore = useUiStore()
const customerStore = useCustomerStore()
const loansStore = useLoansStore()

const props = defineProps({
  notifications: { type: Array, default: () => [] },
  unreadCount: { type: Number, default: 0 },
  sidebarMini: { type: Boolean, default: false }
})

const isDark = computed(() => uiStore.isDark)
const userInitials = computed(() => getInitials(authStore.userName))
const userRoleLabel = computed(() => {
  const roles = { 0: 'Operador', 1: 'Administrador', 2: 'Operador', 3: 'Gestor de Crédito' }
  return roles[authStore.userRole] || 'Utilizador'
})

// Route title and icon
const routeTitle = computed(() => {
  // Dynamic titles for detail pages
  if (route.name === 'CustomerDetail' && customerStore.currentCustomer) {
    return customerStore.currentCustomer.customerName || 'Detalhe do Mutuário'
  }
  if (route.name === 'LoanDetail' && loansStore.currentLoan) {
    return `Crédito #${loansStore.currentLoan.id}`
  }
  if (route.name === 'Amortization' && loansStore.currentLoan) {
    return `Amortização #${loansStore.currentLoan.id}`
  }

  const titles = {
    Dashboard: 'Painel de Controlo',
    Gestor: 'Painel do Gestor',
    Company: 'Painel da Empresa',
    CustomerList: 'Mutuários',
    CustomerDetail: 'Detalhe do Mutuário',
    LoanDetail: 'Detalhe do Crédito',
    Amortization: 'Plano de Amortização',
    ReportsBM: 'Relatório Banco de Moçambique',
    Settings: 'Configurações',
    Profile: 'Meu Perfil',
    Notifications: 'Notificações',
    CustomerPortal: 'Meu Painel'
  }
  return titles[route.name] || 'Painel de Controlo'
})

const routeIcon = computed(() => {
  const icons = {
    Dashboard: 'dashboard',
    Gestor: 'dashboard',
    Company: 'dashboard',
    CustomerList: 'people',
    CustomerDetail: 'person',
    LoanDetail: 'receipt',
    Amortization: 'receipt_long',
    ReportsBM: 'description',
    Settings: 'settings',
    Profile: 'person',
    Notifications: 'notifications',
    CustomerPortal: 'person'
  }
  return icons[route.name] || 'dashboard'
})

function getNotifIcon(type) {
  const icons = {
    loan: 'attach_money',
    payment: 'payments',
    alert: 'warning',
    info: 'info',
    success: 'check_circle'
  }
  return icons[type] || 'notifications'
}

function getNotifColor(type) {
  const colors = {
    loan: 'blue',
    payment: 'green',
    alert: 'orange',
    info: 'grey',
    success: 'positive'
  }
  return colors[type] || 'grey'
}

function markAllRead() {
  // TODO: implementar API
}

function handleLogout() {
  $q.dialog({
    title: 'Sair',
    message: 'Tem certeza que deseja sair?',
    cancel: 'Não',
    ok: { label: 'Sim, sair', color: 'negative' },
    persistent: true
  }).onOk(() => {
    authStore.logout()
    router.push('/')
  })
}
</script>

<style lang="scss" scoped>
.navbar-header {
  background: linear-gradient(135deg, $green-600 0%, $green-500 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

body.body--dark .navbar-header {
  background: linear-gradient(135deg, $gray-800 0%, $gray-700 100%);
  border-bottom-color: $gray-600;
}
</style>
