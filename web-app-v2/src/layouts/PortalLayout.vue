<template>
  <q-layout view="hHh lpr fFf" class="portal-layout">
    <!-- Header mobile 56px -->
    <q-header class="portal-header" height-hint="56px">
      <q-toolbar class="portal-toolbar">
        <q-avatar square size="30px" class="portal-logo q-mr-sm">
          <img :src="companyStore.companyLogo" alt="Logo" />
        </q-avatar>
        <q-toolbar-title class="portal-company-name text-white">
          {{ companyStore.companyName }}
        </q-toolbar-title>
        <q-btn flat round dense :icon="isDark ? 'light_mode' : 'dark_mode'" @click="uiStore.toggleDark()">
          <q-tooltip>{{ isDark ? 'Modo Claro' : 'Modo Escuro' }}</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="notifications" to="/portal/pagamentos" aria-label="Notificações">
          <q-tooltip>Pagamentos e avisos</q-tooltip>
        </q-btn>
        <q-btn flat round dense to="/portal/perfil" aria-label="Perfil">
          <q-avatar size="28px" color="white" text-color="primary" style="font-size: 12px; font-weight: 700">
            {{ getInitials(customer?.name) }}
          </q-avatar>
          <q-tooltip>Meu perfil</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition name="portal-fade">
          <component :is="Component" :key="$route.path" />
        </transition>
      </router-view>
    </q-page-container>

    <!-- Navegação inferior estilo app nativo -->
    <q-footer class="portal-footer" height-hint="58px">
      <q-tabs v-model="activeTab" class="portal-tabs" active-color="primary" indicator-color="transparent" no-caps dense>
        <q-tab name="dashboard" icon="dashboard" label="Painel" :ripple="true" @click="$router.push('/portal')" />
        <q-tab name="loans" icon="payments" label="Créditos" :ripple="true" @click="$router.push('/portal/creditos')" />
        <q-tab name="installments" icon="receipt_long" label="Prestações" :ripple="true" @click="$router.push('/portal/prestacoes')" />
        <q-tab name="payments" icon="account_balance_wallet" label="Pagamentos" :ripple="true" @click="$router.push('/portal/pagamentos')" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { computed, watch, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useCompanyStore } from '@/stores/company'
import { usePortalData } from '@/composables/usePortalData'

const route = useRoute()
const uiStore = useUiStore()
const companyStore = useCompanyStore()
const isDark = computed(() => uiStore.isDark)
const { customer, getInitials, loadData, ensureCompanyLoaded } = usePortalData()

const TAB_BY_PATH = {
  '/portal': 'dashboard',
  '/portal/creditos': 'loans',
  '/portal/prestacoes': 'installments',
  '/portal/pagamentos': 'payments'
}
const activeTab = ref(TAB_BY_PATH[route.path] || 'dashboard')
watch(() => route.path, p => { activeTab.value = TAB_BY_PATH[p] || '' })

onMounted(() => {
  loadData()
  ensureCompanyLoaded()
})
</script>

<style lang="scss" scoped>
.portal-layout {
  background: #f4f4f4;
}

.portal-header {
  height: 56px;

  .portal-toolbar {
    height: 56px;
    min-height: 56px;
    padding: 0 8px;
  }
}

.portal-logo {
  background: #ffffff;
  border-radius: 8px;
  padding: 2px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.portal-company-name {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.portal-footer {
  background: #ffffff;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);

  .portal-tabs {
    min-height: 58px;
    color: #5f6b7a;

    :deep(.q-tab) {
      min-height: 58px;
      font-size: 11px;
      color: #5f6b7a;
    }

    :deep(.q-tab--active) {
      color: var(--q-primary, #0f7a3d);
    }

    :deep(.q-tab__icon) {
      font-size: 22px;
      margin-bottom: 2px;
    }
  }
}

/* Transição suave entre tabs */
.portal-fade-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.portal-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

body.body--dark {
  .portal-layout {
    background: $dark-page;
  }
  .portal-footer {
    background: $gray-800;
    border-top-color: rgba(255, 255, 255, 0.08);

    .portal-tabs,
    .portal-tabs :deep(.q-tab) {
      color: #9ca3af;
    }
    .portal-tabs :deep(.q-tab--active) {
      color: var(--q-primary, #16a34a);
    }
  }
}
</style>
