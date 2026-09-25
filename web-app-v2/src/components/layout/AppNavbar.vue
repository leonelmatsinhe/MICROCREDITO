<template>
  <q-header class="navbar-header">
    <q-toolbar class="q-px-md" style="min-height: 62px">
      <!-- Sidebar Toggle -->
      <q-btn
        flat
        dense
        round
        :icon="sidebarMini ? 'menu' : 'menu_open'"
        @click="$emit('toggle-sidebar')"
        class="q-mr-sm text-grey-8"
        size="sm"
      />

      <!-- Route Title + Breadcrumbs (Home / Painel) -->
      <div class="row items-center no-wrap">
        <q-icon :name="routeIcon" size="22px" class="q-mr-sm text-green-10" />
        <div>
          <div class="text-grey-9 text-weight-bold" style="font-size: 15px; line-height: 1.2">
            {{ routeTitle }}
          </div>
          <AppBreadcrumb class="navbar-breadcrumb" />
        </div>
      </div>

      <q-space />

      <!-- Actions -->
      <div class="row items-center q-gutter-xs">
        <!-- SYNC/REFRESH — páginas de gestão (Painel da Empresa, Configurações Super Admin) -->
        <q-btn
          v-if="canRefresh"
          flat
          round
          dense
          icon="sync"
          text-color="grey-8"
          size="sm"
          :loading="superAdminStore.loading || planStore.loading"
          @click="refreshAdminData"
        >
          <q-tooltip>Actualizar dados</q-tooltip>
        </q-btn>

        <!-- Theme Toggle -->
        <q-btn
          flat
          round
          dense
          :icon="isDark ? 'light_mode' : 'dark_mode'"
          text-color="grey-8"
          size="sm"
          @click="uiStore.toggleDark()"
        >
          <q-tooltip>{{ isDark ? 'Modo Claro' : 'Modo Escuro' }}</q-tooltip>
        </q-btn>

        <!-- Idioma — QSelect com bandeira -->
        <q-select
          v-model="locale"
          :options="localeOptions"
          dense
          borderless
          emit-value
          map-options
          class="locale-select q-mx-xs"
        >
          <template v-slot:selected-item="scope">
            <span class="text-caption text-weight-bold text-grey-8">{{ scope.opt.short }}</span>
          </template>
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar>{{ scope.opt.flag }}</q-item-section>
              <q-item-section>{{ scope.opt.label }}</q-item-section>
            </q-item>
          </template>
          <q-tooltip>Idioma</q-tooltip>
        </q-select>

        <!-- ALERTAS DO SISTEMA — sino com badge vermelho + modal -->
        <AlertBell />

        <!-- Notifications -->
        <q-btn flat round dense icon="notifications" text-color="grey-8" size="sm">
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

    <!-- AI BOT MAISMOLA — botão flutuante + dialog (read-only) -->
    <AiBotMaisMola />
  </q-header>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useCustomerStore } from '@/stores/customers'
import { useSuperAdminStore } from '@/stores/superAdmin'
import { usePlanStore } from '@/stores/plan'
import AlertBell from './AlertBell.vue'
import AiBotMaisMola from '../AiBotMaisMola.vue'
import AppBreadcrumb from './AppBreadcrumb.vue'
import { getInitials, timeAgo } from '@/utils/formatters'

const emit = defineEmits(['toggle-sidebar'])

// Idioma (só UI — sem i18n backend): PT padrão, EN opcional
const locale = ref('pt')
const localeOptions = [
  { label: 'Português (Moçambique)', short: 'PT', flag: '🇲🇿', value: 'pt' },
  { label: 'English', short: 'EM', flag: '🇬🇧', value: 'en' }
]

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const authStore = useAuthStore()
const uiStore = useUiStore()
const customerStore = useCustomerStore()
const superAdminStore = useSuperAdminStore()
const planStore = usePlanStore()

// Páginas que têm o botão sync na navbar
const canRefresh = computed(() => ['Company', 'SuperAdminSettings'].includes(route.name))

function refreshAdminData() {
  superAdminStore.fetchCompanies()
  planStore.fetchPlans({ all: true })
}

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

  const titles = {
    Dashboard: 'Painel de Controlo',
    Gestor: 'Painel do Gestor',
    Company: 'Painel da Empresa',
    CustomerList: 'Mutuários',
    CustomerDetail: 'Detalhe do Mutuário',
    LoanList: 'Créditos',
    Payments: 'Pagamentos',
    ReportsBM: 'Relatório Banco de Moçambique',
    SmsPendingCredentials: 'Centro de Mensagens',
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
    LoanList: 'account_balance_wallet',
    Payments: 'payments',
    ReportsBM: 'description',
    SmsPendingCredentials: 'sms',
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
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  color: #1f2937;
}

.navbar-breadcrumb {
  font-size: 10.5px;
  opacity: 0.8;
}

.locale-select {
  min-width: 52px;
  .q-field__control { min-height: 34px; padding: 0 6px; }
}

body.body--dark .navbar-header {
  background: rgba(17, 24, 39, 0.82);
  border-bottom-color: rgba(255, 255, 255, 0.08);
  color: #f3f4f6;
}
</style>
