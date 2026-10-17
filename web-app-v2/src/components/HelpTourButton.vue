<template>
  <!-- Botão flutuante de ajuda: (re)inicia o tour guiado do perfil activo. -->
  <div class="tour-help">
    <q-chip
      v-if="isActive"
      dense
      color="green-10"
      text-color="white"
      icon="school"
      class="tour-help-chip"
      :label="progress"
    />

    <!-- Checklist do primeiro dia: fica à vista enquanto houver tarefas por fazer -->
    <q-chip
      v-else-if="hasChecklist && !isComplete"
      dense
      clickable
      color="teal-8"
      text-color="white"
      icon="checklist"
      class="tour-help-chip"
      :label="`Primeiro dia ${doneCount}/${total}`"
      @click="openChecklist"
    >
      <q-tooltip anchor="center left" self="center right" :offset="[10, 0]">
        Checklist do primeiro dia — {{ percent }}% concluído
      </q-tooltip>
    </q-chip>

    <q-btn
      round
      unelevated
      color="green-9"
      icon="help_outline"
      class="tour-help-fab"
      data-tour="tour-button"
      aria-label="Ajuda e tour guiado"
    >
      <q-tooltip anchor="center left" self="center right" :offset="[10, 0]">Tour guiado</q-tooltip>

      <q-menu anchor="bottom right" self="bottom right" :offset="[0, 12]">
        <q-list style="min-width: 288px">
          <q-item-label header class="tour-menu-header">
            Tour guiado<span v-if="tourRoleLabel"> · {{ tourRoleLabel }}</span>
          </q-item-label>

          <q-item v-if="isActive" clickable v-close-popup @click="stopTour">
            <q-item-section avatar><q-icon name="stop_circle" color="negative" /></q-item-section>
            <q-item-section>
              <q-item-label>Terminar tour</q-item-label>
              <q-item-label caption>Está no passo {{ progress }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="start('full')">
            <q-item-section avatar><q-icon name="explore" color="primary" /></q-item-section>
            <q-item-section>
              <q-item-label>Tour completo</q-item-label>
              <q-item-label caption>{{ fullStepCount }} passos por todas as áreas</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="start('quick')">
            <q-item-section avatar><q-icon name="bolt" color="amber-8" /></q-item-section>
            <q-item-section>
              <q-item-label>Tour rápido</q-item-label>
              <q-item-label caption>O essencial em {{ quickStepCount }} passos</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="startPageTour">
            <q-item-section avatar><q-icon name="my_location" color="teal" /></q-item-section>
            <q-item-section>
              <q-item-label>Explicar esta página</q-item-label>
              <q-item-label caption>{{ pageStepCount }} passo(s) nesta página</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="hasChecklist" clickable v-close-popup @click="openChecklist">
            <q-item-section avatar><q-icon name="checklist" color="deep-purple" /></q-item-section>
            <q-item-section>
              <q-item-label>Checklist do primeiro dia</q-item-label>
              <q-item-label caption>{{ doneCount }} de {{ total }} tarefas concluídas</q-item-label>
            </q-item-section>
            <q-item-section side>
              <span class="text-caption" :class="isComplete ? 'text-positive' : 'text-grey-6'">{{ percent }}%</span>
            </q-item-section>
          </q-item>

          <q-separator />

          <q-item clickable v-close-popup @click="resetOnboarding">
            <q-item-section avatar><q-icon name="restart_alt" color="grey-7" /></q-item-section>
            <q-item-section>
              <q-item-label>Repetir no próximo login</q-item-label>
              <q-item-label caption>Volta a sugerir o onboarding</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup>
import { onUnmounted, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useAppTour } from '@/composables/useAppTour'
import { useOnboardingChecklist } from '@/composables/useOnboardingChecklist'

/**
 * AJUDA / TOUR GUIADO
 * Botão flutuante «?» presente nos layouts com sessão (staff e parceiro).
 * O percurso disponível depende do perfil — ver `useAppTour`.
 */
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const {
  isActive,
  progress,
  tourRoleLabel,
  fullStepCount,
  quickStepCount,
  pageStepCount,
  startTour,
  startPageTour: startPageSteps,
  stopTour: endTour,
  resetSeen,
  setRole
} = useAppTour({ router })

const {
  hasChecklist,
  doneCount,
  total,
  percent,
  isComplete,
  openPanel: openOnboardingChecklist
} = useOnboardingChecklist({ router })

// O perfil vem sempre da sessão: o tour nunca sugere percursos de outro perfil.
watchEffect(() => setRole(authStore.userRole))

function start(which) {
  const started = startTour(which)
  if (!started) {
    $q.notify({ type: 'info', message: 'Não há tour disponível para o seu perfil.', position: 'top' })
  }
}

function startPageTour() {
  const started = startPageSteps()
  if (!started) {
    $q.notify({ type: 'info', message: 'Esta página ainda não tem passos de tour.', position: 'top' })
  }
}

function openChecklist() {
  endTour()
  openOnboardingChecklist()
}

function stopTour() {
  endTour()
}

function resetOnboarding() {
  resetSeen()
  $q.notify({
    type: 'info',
    message: 'O tour voltará a ser sugerido no próximo login.',
    position: 'top'
  })
}

// Sair da sessão / fechar o layout termina o tour em curso.
onUnmounted(() => endTour())
</script>

<style lang="scss">
/* NÃO-scoped: o overlay e o popover do driver.js são anexados ao <body>. */
.tour-help {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 1400;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tour-help-fab {
  box-shadow: 0 10px 24px rgba(15, 81, 50, 0.32) !important;
}

.tour-menu-header {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

/* ── Popover do tour (driver.js) ── */
.driver-popover.mbr-tour-popover {
  max-width: 360px;
  border-radius: 14px;
  padding: 16px 18px 14px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.28);
}

.driver-popover.mbr-tour-popover .driver-popover-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: #0f512e;
}

.driver-popover.mbr-tour-popover .driver-popover-description {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.55;
  color: #475569;
}

.driver-popover.mbr-tour-popover .driver-popover-description strong {
  color: #0f512e;
}

.driver-popover.mbr-tour-popover .driver-popover-progress-text {
  font-size: 12px;
  color: #94a3b8;
}

.driver-popover.mbr-tour-popover .driver-popover-footer-btn {
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 600;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.driver-popover.mbr-tour-popover .driver-popover-next-btn,
.driver-popover.mbr-tour-popover .driver-popover-done-btn {
  background-color: #16a34a;
  border-color: #16a34a;
  color: #fff;
}

.driver-popover.mbr-tour-popover .driver-popover-next-btn:hover,
.driver-popover.mbr-tour-popover .driver-popover-done-btn:hover {
  background-color: #128040;
  color: #fff;
}

.driver-popover.mbr-tour-popover .driver-popover-prev-btn:hover {
  background-color: #f1f5f9;
}

/* Tema escuro */
body.body--dark .driver-popover.mbr-tour-popover {
  background-color: #1e293b;
}

body.body--dark .driver-popover.mbr-tour-popover .driver-popover-title,
body.body--dark .driver-popover.mbr-tour-popover .driver-popover-description strong {
  color: #6ee7b7;
}

body.body--dark .driver-popover.mbr-tour-popover .driver-popover-description {
  color: #cbd5e1;
}

body.body--dark .driver-popover.mbr-tour-popover .driver-popover-prev-btn,
body.body--dark .driver-popover.mbr-tour-popover .driver-popover-close-btn {
  background-color: #334155;
  border-color: #475569;
  color: #e2e8f0;
}

body.body--dark .driver-popover.mbr-tour-popover .driver-popover-arrow-side-left,
body.body--dark .driver-popover.mbr-tour-popover .driver-popover-arrow-side-right,
body.body--dark .driver-popover.mbr-tour-popover .driver-popover-arrow-side-top,
body.body--dark .driver-popover.mbr-tour-popover .driver-popover-arrow-side-bottom {
  border-color: #1e293b;
}
</style>
