<template>
  <div class="auth-fullpage">
    <slot />
    
    <!-- Theme Toggle -->
    <q-btn
      round
      :icon="isDark ? 'light_mode' : 'dark_mode'"
      :color="isDark ? 'grey-8' : 'grey-7'"
      text-color="white"
      size="sm"
      class="theme-toggle-fixed"
      @click="uiStore.toggleDark()"
    >
      <q-tooltip>{{ isDark ? 'Modo Claro' : 'Modo Escuro' }}</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const isDark = computed(() => uiStore.isDark)
</script>

<style>
.auth-fullpage {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
}

body.body--dark .auth-fullpage {
  background: linear-gradient(135deg, #111827 0%, #1F2937 100%);
}

.theme-toggle-fixed {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
}
</style>
