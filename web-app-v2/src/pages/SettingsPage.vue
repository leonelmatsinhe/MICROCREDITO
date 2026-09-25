<template>
  <div class="q-pa-md">
    <div class="settings-layout row no-wrap q-col-gutter-md">
      <!-- Sidebar de Navegação -->
      <div class="col-auto settings-nav">
        <q-card flat class="nav-card">
          <q-list>
            <q-item-label header class="text-grey-5 q-pb-xs" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em">
              Configurações
            </q-item-label>

            <q-item
              v-for="section in sections"
              :key="section.id"
              clickable
              v-ripple
              :active="activeSection === section.id"
              active-class="settings-nav-active"
              @click="activeSection = section.id"
              class="settings-nav-item"
            >
              <q-item-section avatar>
                <q-icon :name="section.icon" :color="activeSection === section.id ? 'primary' : 'grey-6'" size="20px" />
              </q-item-section>
              <q-item-section>
                <q-item-label style="font-size: 13px">{{ section.label }}</q-item-label>
                <q-item-label caption style="font-size: 10px">{{ section.description }}</q-item-label>
              </q-item-section>
            </q-item>

            <!-- Atalhos para as páginas dedicadas (saíram de Configurações) -->
            <q-separator class="q-my-sm" />
            <q-item-label header class="text-grey-5 q-pb-xs" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em">
              Páginas dedicadas
            </q-item-label>
            <q-item clickable v-ripple class="settings-nav-item" to="/equipe">
              <q-item-section avatar><q-icon name="groups" color="grey-6" size="20px" /></q-item-section>
              <q-item-section>
                <q-item-label style="font-size: 13px">Equipa e Parceiros</q-item-label>
                <q-item-label caption style="font-size: 10px">Utilizadores e parceiros financiadores</q-item-label>
              </q-item-section>
              <q-item-section side><q-icon name="chevron_right" size="18px" color="grey-5" /></q-item-section>
            </q-item>
            <q-item clickable v-ripple class="settings-nav-item" to="/financiamento?tab=taxas">
              <q-item-section avatar><q-icon name="percent" color="grey-6" size="20px" /></q-item-section>
              <q-item-section>
                <q-item-label style="font-size: 13px">Taxas de Juro</q-item-label>
                <q-item-label caption style="font-size: 10px">Vinculadas às carteiras de financiamento</q-item-label>
              </q-item-section>
              <q-item-section side><q-icon name="chevron_right" size="18px" color="grey-5" /></q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Conteúdo -->
      <div class="col settings-content">
        <transition name="fade" mode="out-in">
          <CompanySection v-if="activeSection === 'company'" key="company" />
          <AccountsSection v-else-if="activeSection === 'accounts'" key="accounts" />
          <RolesSection v-else-if="activeSection === 'roles'" key="roles" />
          <AppearanceSection v-else-if="activeSection === 'appearance'" key="appearance" />
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CompanySection from '@/components/settings/CompanySection.vue'
import AccountsSection from '@/components/settings/AccountsSection.vue'
import RolesSection from '@/components/settings/RolesSection.vue'
import AppearanceSection from '@/components/settings/AppearanceSection.vue'

/**
 * CONFIGURAÇÕES — apenas o que é do sistema/empresa.
 * Utilizadores e Taxas de Juro saíram daqui: utilizadores vivem em
 * "Equipa e Parceiros" (/equipe) e as taxas em "Financiamento" (/financiamento),
 * onde ficam vinculadas à origem do capital (carteira ou conta de desembolso).
 */
const activeSection = ref('company')

const sections = [
  { id: 'company', icon: 'business', label: 'Empresa', description: 'Dados gerais' },
  { id: 'accounts', icon: 'account_balance', label: 'Contas Bancárias', description: 'Dados bancários' },
  { id: 'roles', icon: 'admin_panel_settings', label: 'Permissões', description: 'Roles e acessos' },
  { id: 'appearance', icon: 'palette', label: 'Aparência', description: 'Tema e cores' }
]
</script>

<style lang="scss" scoped>
.settings-layout {
  min-height: calc(100vh - 120px);
}

.nav-card {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.settings-nav {
  width: 250px;
  min-width: 250px;
  flex-shrink: 0;
}

.settings-content {
  min-width: 0;
}

.settings-nav-item {
  margin: 0 8px;
  border-radius: 8px;

  &:hover {
    background-color: $grey-2;
  }
}

body.body--dark .settings-nav-item {
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.settings-nav-active {
  background-color: rgba($primary, 0.08) !important;
  color: $primary !important;
  font-weight: 600;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 768px) {
  .settings-nav {
    width: 100%;
    min-width: 100%;
  }

  .settings-layout {
    flex-direction: column !important;
  }
}
</style>
