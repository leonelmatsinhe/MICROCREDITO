<template>
  <q-dialog v-model="panelOpen" :maximized="$q.screen.lt.sm" transition-show="scale" transition-hide="scale">
    <q-card class="checklist-card" style="width: 560px; max-width: 96vw">
      <!-- ═══════════ CABEÇALHO ═══════════ -->
      <q-card-section class="row items-center no-wrap checklist-header">
        <q-avatar size="38px" color="white" text-color="green-9" icon="checklist" class="q-mr-sm" />
        <div class="col">
          <div class="text-subtitle1 text-weight-bold">Primeiro dia<span v-if="roleLabel"> · {{ roleLabel }}</span></div>
          <div class="text-caption">
            As tarefas essenciais do arranque. O progresso fica guardado na sua conta.
          </div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Fechar o checklist" v-close-popup />
      </q-card-section>

      <!-- ═══════════ PROGRESSO ═══════════ -->
      <q-card-section class="q-py-sm">
        <div class="row items-center no-wrap q-mb-xs">
          <div class="col text-caption text-weight-medium">
            {{ doneCount }} de {{ total }} tarefas concluídas
          </div>
          <div class="col-auto text-caption" :class="isComplete ? 'text-positive text-weight-bold' : 'text-grey-6'">
            <q-icon v-if="isComplete" name="verified" size="14px" class="q-mr-xs" />{{ percent }}%
          </div>
        </div>
        <q-linear-progress
          :value="percent / 100"
          size="8px"
          rounded
          :color="isComplete ? 'positive' : 'primary'"
          track-color="grey-3"
        />
        <div v-if="isComplete" class="text-caption text-positive q-mt-sm">
          Primeiro dia completo ✅ Quer ver o tour guiado de tudo o que a plataforma faz?
        </div>
      </q-card-section>

      <!-- ═══════════ SEM CHECKLIST (portal do mutuário) ═══════════ -->
      <q-card-section v-if="!hasChecklist" class="text-center q-pa-lg text-grey-7">
        <q-icon name="info" size="32px" color="grey-5" />
        <div class="text-body2 q-mt-sm">Não há checklist de primeiro dia para este perfil.</div>
      </q-card-section>

      <!-- ═══════════ TAREFAS ═══════════ -->
      <q-card-section v-else class="q-py-none checklist-list">
        <q-list separator>
          <q-item v-for="task in tasks" :key="task.id" class="checklist-item">
            <q-item-section side top>
              <q-checkbox
                :model-value="task.done"
                color="positive"
                :aria-label="`Marcar «${task.title}» como concluída`"
                @update:model-value="() => toggleTask(task.id)"
              />
            </q-item-section>

            <q-item-section>
              <q-item-label :class="task.done ? 'text-grey-6 text-strike' : 'text-weight-medium'">
                {{ task.title }}
              </q-item-label>
              <q-item-label caption class="checklist-text">{{ task.text }}</q-item-label>
              <div class="row items-center q-gutter-xs q-mt-sm">
                <q-btn
                  dense
                  no-caps
                  rounded
                  unelevated
                  size="sm"
                  color="primary"
                  icon="play_circle"
                  label="Mostrar-me"
                  @click="startTask(task)"
                />
                <q-btn
                  v-if="task.route"
                  dense
                  no-caps
                  rounded
                  outline
                  size="sm"
                  color="grey-8"
                  icon="open_in_new"
                  :label="task.cta || 'Abrir página'"
                  @click="openTaskPage(task)"
                />
                <span v-if="task.done" class="text-caption text-positive q-ml-sm">
                  <q-icon name="task_alt" size="14px" /> concluída
                </span>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <!-- ═══════════ RODAPÉ ═══════════ -->
      <q-separator />
      <q-card-actions class="q-px-md q-py-sm" align="between">
        <div class="row q-gutter-xs">
          <q-btn
            flat
            dense
            no-caps
            color="grey-7"
            icon="restart_alt"
            label="Reiniciar o meu progresso"
            :disable="doneCount === 0"
            @click="confirmReset"
          />
        </div>
        <div class="row q-gutter-xs">
          <q-btn flat dense no-caps color="teal-8" icon="explore" label="Tour guiado" @click="startGuidedTour" />
          <q-btn unelevated dense no-caps rounded color="primary" label="Fechar" v-close-popup />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAppTour } from '@/composables/useAppTour'
import { useOnboardingChecklist } from '@/composables/useOnboardingChecklist'

/**
 * CHECKLIST DO PRIMEIRO DIA
 * Painel persistente com as tarefas de arranque do perfil activo. Cada tarefa
 * pode ser dada como concluída à mão (checkbox) ou abrindo o mini-percurso
 * «Mostrar-me» até ao fim — o progresso é guardado por utilizador.
 */
const $q = useQuasar()
const router = useRouter()

const {
  panelOpen,
  role,
  roleLabel,
  hasChecklist,
  tasks,
  total,
  doneCount,
  percent,
  isComplete,
  toggleTask,
  resetProgress,
  startTask: runTask,
  openTaskPage: goToTask
} = useOnboardingChecklist({ router })

const { startTour } = useAppTour({ router })

function startTask(task) {
  const started = runTask(task.id)
  if (started === false) {
    $q.notify({ type: 'info', message: 'Esta tarefa ainda não tem passos guiados.', position: 'top' })
  }
}

function openTaskPage(task) {
  goToTask(task.id)
}

function startGuidedTour() {
  const started = startTour('full', role.value)
  if (!started) {
    $q.notify({ type: 'info', message: 'Não há tour disponível para o seu perfil.', position: 'top' })
  }
}

function confirmReset() {
  $q.dialog({
    title: 'Reiniciar o checklist',
    message: 'As tarefas voltam todas a ficar por concluir. O progresso dos outros utilizadores deste dispositivo não é afectado.',
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Reiniciar', color: 'negative', noCaps: true, unelevated: true }
  }).onOk(() => {
    resetProgress()
    $q.notify({ type: 'info', message: 'Checklist reiniciado.', position: 'top' })
  })
}
</script>

<style lang="scss" scoped>
.checklist-card {
  border-radius: 14px;
}

.checklist-header {
  background: linear-gradient(90deg, #0f512e 0%, #16a34a 100%);
  color: #fff;

  .text-caption {
    color: rgba(255, 255, 255, 0.85);
  }
}

.checklist-list {
  max-height: 56vh;
  overflow-y: auto;
}

.checklist-item {
  align-items: flex-start;
}

.checklist-text {
  font-size: 12px;
  line-height: 1.45;
  color: #64748b;
}
</style>
