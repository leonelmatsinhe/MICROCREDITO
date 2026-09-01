<template>
  <div>
    <div class="text-h6 text-weight-bold q-mb-md">Aparência</div>

    <!-- Dark/Light Mode -->
    <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-md">
          <q-icon name="dark_mode" size="16px" class="q-mr-xs" />
          Tema
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-6 col-sm-4">
            <div
              class="theme-card"
              :class="{ 'theme-card-active': !isDark }"
              @click="setTheme(false)"
            >
              <div class="theme-preview light-preview">
                <div class="preview-header" style="background: #16a34a"></div>
                <div class="preview-sidebar" style="background: white"></div>
                <div class="preview-content" style="background: #f9fafb"></div>
              </div>
              <div class="text-center q-mt-sm">
                <q-icon name="light_mode" size="18px" :color="!isDark ? 'primary' : 'grey-5'" />
                <div class="text-caption q-mt-xs" :class="!isDark ? 'text-primary text-weight-bold' : 'text-grey-5'" style="font-size: 12px">Claro</div>
              </div>
            </div>
          </div>

          <div class="col-6 col-sm-4">
            <div
              class="theme-card"
              :class="{ 'theme-card-active': isDark }"
              @click="setTheme(true)"
            >
              <div class="theme-preview dark-preview">
                <div class="preview-header" style="background: #374151"></div>
                <div class="preview-sidebar" style="background: #1f2937"></div>
                <div class="preview-content" style="background: #111827"></div>
              </div>
              <div class="text-center q-mt-sm">
                <q-icon name="dark_mode" size="18px" :color="isDark ? 'primary' : 'grey-5'" />
                <div class="text-caption q-mt-xs" :class="isDark ? 'text-primary text-weight-bold' : 'text-grey-5'" style="font-size: 12px">Escuro</div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Sidebar Style -->
    <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-md">
          <q-icon name="view_sidebar" size="16px" class="q-mr-xs" />
          Sidebar
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-item tag="label" clickable v-ripple class="settings-option" style="border-radius: 10px; border: 1px solid $grey-3">
              <q-item-section avatar>
                <q-radio v-model="sidebarStyle" val="expanded" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label style="font-size: 13px">Sempre expandida</q-item-label>
                <q-item-label caption style="font-size: 11px">Sidebar mostra texto e ícones</q-item-label>
              </q-item-section>
            </q-item>
          </div>
          <div class="col-12 col-sm-6">
            <q-item tag="label" clickable v-ripple class="settings-option" style="border-radius: 10px; border: 1px solid $grey-3">
              <q-item-section avatar>
                <q-radio v-model="sidebarStyle" val="mini" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label style="font-size: 13px">Modo compacto</q-item-label>
                <q-item-label caption style="font-size: 11px">Sidebar mostra apenas ícones</q-item-label>
              </q-item-section>
            </q-item>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Company Branding -->
    <q-card flat bordered style="border-radius: 12px">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-md">
          <q-icon name="palette" size="16px" class="q-mr-xs" />
          Cores da Marca
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <div class="text-caption text-grey-6 q-mb-xs" style="font-size: 11px">Cor Principal</div>
            <div class="row q-gutter-sm">
              <div
                v-for="color in primaryColors"
                :key="color.value"
                class="color-dot"
                :class="{ 'color-dot-active': primaryColor === color.value }"
                :style="{ background: color.value }"
                @click="primaryColor = color.value"
              >
                <q-icon v-if="primaryColor === color.value" name="check" size="14px" color="white" />
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()

const isDark = computed(() => uiStore.isDark)
const sidebarStyle = ref(uiStore.sidebarStyle || 'expanded')
const primaryColor = ref(uiStore.primaryColor || '#16a34a')

watch(sidebarStyle, (val) => {
  uiStore.setSidebarStyle(val)
})

watch(primaryColor, (val) => {
  uiStore.setPrimaryColor(val)
  document.documentElement.style.setProperty('--q-primary', val)
})

const primaryColors = [
  { value: '#16a34a', label: 'Verde' },
  { value: '#2563eb', label: 'Azul' },
  { value: '#7c3aed', label: 'Roxo' },
  { value: '#dc2626', label: 'Vermelho' },
  { value: '#ea580c', label: 'Laranja' },
  { value: '#0891b2', label: 'Ciano' }
]

function setTheme(dark) {
  uiStore.setDark(dark)
}
</script>

<style lang="scss" scoped>
.theme-card {
  border: 2px solid $grey-3;
  border-radius: 12px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $grey-5;
  }
}

.theme-card-active {
  border-color: $primary;
  background: rgba($primary, 0.04);
}

.theme-preview {
  border-radius: 8px;
  overflow: hidden;
  height: 80px;
  position: relative;
  display: flex;
}

.light-preview {
  background: #f9fafb;
}

.dark-preview {
  background: #111827;
}

.preview-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 16px;
}

.preview-sidebar {
  position: absolute;
  top: 16px;
  left: 0;
  width: 30%;
  bottom: 0;
}

.preview-content {
  position: absolute;
  top: 16px;
  left: 30%;
  right: 0;
  bottom: 0;
}

.color-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.1);
  }
}

.color-dot-active {
  border-color: $grey-8;
  box-shadow: 0 0 0 2px white, 0 0 0 4px currentColor;
}

body.body--dark {
  .theme-card {
    border-color: $grey-7;

    &:hover {
      border-color: $grey-5;
    }
  }

  .settings-option {
    border-color: $grey-7 !important;
  }
}
</style>
