<template>
  <q-drawer
    v-model="drawerOpen"
    show-if-above
    :width="240"
    :mini-width="68"
    :mini="miniMode"
    :breakpoint="768"
    bordered
    class="sidebar-drawer"
  >
    <!-- Logo + Empresa -->
    <div class="sidebar-brand" :class="{ 'sidebar-brand-mini': miniMode }">
      <div class="logo-container" :class="{ 'logo-mini': miniMode }">
        <img 
          :src="logoSrc" 
          alt="Logo" 
          class="logo-img"
          @error="handleLogoError"
        />
        <!-- Fallback icon if logo fails -->
        <q-icon v-if="logoError" name="business" size="20px" color="green-8" class="logo-fallback" />
      </div>
      <transition name="fade">
        <div v-if="!miniMode" class="sidebar-brand-text q-ml-sm">
          <div class="sidebar-company-name" style="font-size: 13px; line-height: 1.2">
            {{ companyName }}
          </div>
          <div class="sidebar-role-label" style="font-size: 10px; opacity: 0.7">
            {{ userRoleLabel }}
          </div>
        </div>
      </transition>
    </div>

    <q-separator style="opacity: 0.15" />

    <!-- Menu Items -->
    <q-list class="q-py-sm sidebar-list">
      <!-- Menu Principal -->
      <q-item-label v-if="!miniMode" header class="q-pb-xs q-pt-sm text-white-5" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em">
        Menu Principal
      </q-item-label>

      <q-item
        v-for="item in menuItems"
        :key="item.to"
        :to="item.to"
        clickable
        v-ripple
        active-class="sidebar-item-active"
        class="sidebar-item"
        :class="{ 'sidebar-item-mini': miniMode }"
        dense
      >
        <q-item-section avatar class="item-avatar-section">
          <q-icon :name="item.icon" :size="miniMode ? '20px' : '18px'" />
        </q-item-section>
        <q-item-section v-if="!miniMode" style="font-size: 13px; white-space: nowrap">
          {{ item.label }}
        </q-item-section>
        <q-item-section v-if="item.badge && !miniMode" side>
          <q-badge :color="item.badgeColor || 'negative'" :label="item.badge" />
        </q-item-section>
        <q-tooltip v-if="miniMode" anchor="center right" self="center left">
          {{ item.label }}
        </q-tooltip>
      </q-item>



      <!-- Spacer -->
      <div style="flex: 1"></div>

      <!-- Configurações no fundo -->
      <q-separator class="q-my-sm q-mx-md" />

      <q-item
        clickable
        v-ripple
        class="sidebar-item"
        :class="{ 'sidebar-item-mini': miniMode }"
        dense
        to="/settings"
      >
        <q-item-section avatar class="item-avatar-section">
          <q-icon name="settings" :size="miniMode ? '20px' : '18px'" />
        </q-item-section>
        <q-item-section v-if="!miniMode" style="font-size: 13px; white-space: nowrap">
          Configurações
        </q-item-section>
        <q-tooltip v-if="miniMode" anchor="center right" self="center left">
          Configurações
        </q-tooltip>
      </q-item>

      <q-item
        clickable
        v-ripple
        class="sidebar-item"
        :class="{ 'sidebar-item-mini': miniMode }"
        dense
        to="/logs"
      >
        <q-item-section avatar class="item-avatar-section">
          <q-icon name="history" :size="miniMode ? '20px' : '18px'" />
        </q-item-section>
        <q-item-section v-if="!miniMode" style="font-size: 13px; white-space: nowrap">
          Histórico
        </q-item-section>
        <q-tooltip v-if="miniMode" anchor="center right" self="center left">
          Histórico do Sistema
        </q-tooltip>
      </q-item>
    </q-list>
  </q-drawer>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'

const props = defineProps({
  modelValue: { type: Boolean, default: true },
  miniMode: { type: Boolean, default: false },
  pendingCount: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'new-loan', 'new-payment', 'toggle-mini'])

const authStore = useAuthStore()
const companyStore = useCompanyStore()

const logoError = ref(false)

const drawerOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const companyName = computed(() => {
  const name = companyStore.companyName
  return name && name.trim() ? name : 'MBR Microcrédito'
})

const logoSrc = computed(() => {
  if (logoError.value) return '/logo.png'
  return companyStore.companyLogo
})

function handleLogoError() {
  logoError.value = true
}

const userRoleLabel = computed(() => {
  const roles = { 0: 'Operador', 1: 'Administrador', 2: 'Operador', 3: 'Gestor de Crédito' }
  return roles[authStore.userRole] || 'Utilizador'
})

const menuItems = computed(() => {
  const role = authStore.userRole
  const items = []

  if (role === 1) {
    // Admin: acesso total
    items.push(
      { to: '/dashboard', icon: 'dashboard', label: 'Painel' },
      { to: '/mutuarios', icon: 'people', label: 'Mutuários' },
      { to: '/admin/installments', icon: 'event', label: 'Controle Prestações' },
      { to: '/reports/banco-mocambique', icon: 'description', label: 'Relatório BM' }
    )
  } else if (role === 3) {
    // Gestor: dashboard + mutuários (sem aprovar crédito)
    items.push(
      { to: '/dashboard', icon: 'dashboard', label: 'Painel' },
      { to: '/mutuarios', icon: 'people', label: 'Mutuários' }
    )
  } else {
    // Outros: acesso básico
    items.push(
      { to: '/dashboard', icon: 'dashboard', label: 'Painel' },
      { to: '/mutuarios', icon: 'people', label: 'Mutuários' }
    )
  }

  return items
})

onMounted(() => {
  // Fetch company details if we have companyId but no company data
  const companyId = authStore.companyId
  if (companyId && !companyStore.hasCompany) {
    companyStore.fetchCompany(companyId)
  }
})

import { useRouter } from 'vue-router'

const router = useRouter()

function openNewLoan() {
  router.push('/loans/new')
}

function openNewPayment() {
  emit('new-payment')
}
</script>

<style lang="scss">
/* NON-SCOPED: must penetrate q-drawer internals */
.sidebar-drawer {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #1b5e20 0%, #2e7d32 100%) !important;
  border-color: rgba(255,255,255,0.1) !important;
}

body.body--dark .sidebar-drawer {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%) !important;
  border-color: rgba(255,255,255,0.06) !important;
}

.sidebar-list {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  min-height: 64px;
}

.sidebar-brand-mini {
  justify-content: center;
  padding: 14px 0;
}

.sidebar-brand-text {
  overflow: hidden;
  white-space: nowrap;
}

.sidebar-company-name {
  font-weight: 700;
  color: #fff;
}

.sidebar-role-label {
  color: rgba(255,255,255,0.65);
}

.sidebar-drawer .q-separator {
  background-color: rgba(255,255,255,0.15) !important;
}

body.body--dark .sidebar-drawer .q-separator {
  background-color: rgba(255,255,255,0.08) !important;
}

.sidebar-drawer .q-item__label--header {
  color: rgba(255,255,255,0.45) !important;
}

.logo-container {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  overflow: hidden;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.logo-mini {
  width: 36px;
  height: 36px;
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-fallback {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.sidebar-item {
  color: rgba(255,255,255,0.8) !important;
  font-weight: 500;
  transition: all 0.15s ease;
  min-height: 38px;
  padding: 0 12px;
  margin: 1px 6px;
  border-radius: 8px;
}

.sidebar-item:hover {
  background-color: rgba(255,255,255,0.1) !important;
  color: #fff !important;
}

.sidebar-item-mini {
  justify-content: center;
  padding: 0;
  min-height: 42px;
  margin: 1px 4px;
}

.item-avatar-section {
  min-width: 32px;
}

.sidebar-item-active {
  background-color: rgba(255,255,255,0.2) !important;
  color: #fff !important;
  font-weight: 600;
}

.sidebar-item-active:hover {
  background-color: rgba(255,255,255,0.25) !important;
  color: #fff !important;
}

body.body--dark .sidebar-item {
  color: rgba(255,255,255,0.7) !important;
}

body.body--dark .sidebar-item:hover {
  background-color: rgba(255,255,255,0.08) !important;
  color: #fff !important;
}

body.body--dark .sidebar-item-active {
  background-color: rgba(255,255,255,0.12) !important;
  color: #fff !important;
}

body.body--dark .sidebar-item-active:hover {
  background-color: rgba(255,255,255,0.18) !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
