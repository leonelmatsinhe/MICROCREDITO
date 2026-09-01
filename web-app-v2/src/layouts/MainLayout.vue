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
      <q-page class="page-content">
        <!-- Breadcrumb -->
        <div class="q-px-md q-pt-sm q-pb-xs bg-grey-1">
          <AppBreadcrumb />
        </div>

        <!-- Page Content via Slot -->
        <slot />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()

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
