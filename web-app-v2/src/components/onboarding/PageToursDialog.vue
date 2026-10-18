<template>
  <!-- Painel «Primeiro dia»: todos os tours de página, com o estado de cada um. -->
  <q-dialog v-model="pageToursOpen">
    <q-card class="page-tours-card" style="width: 620px; max-width: 94vw">
      <q-card-section class="row items-center no-wrap">
        <q-avatar color="teal-8" text-color="white" icon="map" size="42px" />
        <div class="q-ml-md col" style="min-width: 0">
          <div class="text-h6" style="line-height: 1.25">Primeiro dia — tours das páginas</div>
          <div class="text-caption text-grey-7">
            Cada página do menu tem 3 a 5 dicas: onde clicar, o que significa cada número e o erro a evitar.
          </div>
        </div>
        <q-btn flat round dense icon="close" color="grey-7" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-none q-pb-sm">
        <div class="row items-center q-mb-xs">
          <div class="col text-caption text-grey-7">
            {{ completedPages }} de {{ pageTourTotal }} páginas concluídas
          </div>
          <div class="col-auto text-caption text-weight-bold text-teal-9">{{ pageTourProgress }}%</div>
        </div>
        <q-linear-progress
          :value="pageTourProgress / 100"
          rounded
          size="8px"
          color="teal-8"
          track-color="grey-3"
        />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-py-xs tours-scroll">
        <template v-for="section in pageToursBySection" :key="section.id">
          <div class="tours-section-label">{{ section.label }}</div>
          <q-item
            v-for="page in section.pages"
            :key="page.id"
            clickable
            class="tours-page-row"
            @click="openPage(page)"
          >
            <q-item-section avatar>
              <q-icon
                :name="page.seen ? 'check_circle' : 'radio_button_unchecked'"
                :color="page.seen ? 'positive' : 'grey-5'"
                size="20px"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label style="font-size: 13px">{{ page.label }}</q-item-label>
              <q-item-label caption style="font-size: 11px">
                {{ page.steps.length }} passos{{ page.seen ? ' · já visto' : '' }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                :color="page.seen ? 'grey-7' : 'primary'"
                :icon="page.seen ? 'replay' : 'play_arrow'"
                :label="page.seen ? 'Rever' : 'Ver tour'"
              />
            </q-item-section>
          </q-item>
        </template>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat no-caps color="grey-8" icon="restart_alt" label="Repetir todos" @click="repeatAll" />
        <q-btn flat no-caps color="primary" label="Fechar" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAppTour } from '@/composables/useAppTour'

/**
 * PAINEL «PRIMEIRO DIA»
 * Lista os tours de todas as páginas do menu lateral com o estado de cada um.
 * Abrir um tour navega para a página e arranca os passos dessa página.
 */
const router = useRouter()
const $q = useQuasar()
const {
  pageToursOpen,
  pageToursBySection,
  pageTourTotal,
  completedPages,
  pageTourProgress,
  closePageTours,
  startPageTour,
  resetPageTours
} = useAppTour({ router })

async function openPage(page) {
  closePageTours()

  if (page.path && router.currentRoute.value.path !== page.path) {
    try {
      await router.push(page.path)
    } catch (error) {
      console.warn('[tour] não foi possível abrir', page.path, error)
    }
    // deixa a página (lazy) montar antes de procurar os alvos
    await new Promise((resolve) => window.setTimeout(resolve, 320))
  }

  const started = startPageTour()
  if (!started) {
    $q.notify({ type: 'info', message: 'Esta página ainda não tem passos de tour.', position: 'top' })
  }
}

function repeatAll() {
  $q.dialog({
    title: 'Repetir os tours?',
    message:
      'O progresso do primeiro dia volta a 0 e os tours aparecem outra vez na primeira visita a cada página.',
    cancel: true,
    persistent: true,
    ok: { label: 'Repetir', color: 'primary', flat: true }
  }).onOk(() => {
    resetPageTours()
    $q.notify({ type: 'info', message: 'Tours das páginas reiniciados.', position: 'top' })
  })
}
</script>

<style lang="scss" scoped>
.page-tours-card {
  border-radius: 16px;
}

.tours-scroll {
  max-height: 56vh;
  overflow-y: auto;
}

.tours-section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  padding: 10px 8px 2px;
}

.tours-page-row {
  border-radius: 10px;
  min-height: 44px;
  padding-left: 8px;
  padding-right: 8px;

  &:hover {
    background-color: rgba(15, 81, 50, 0.06);
  }
}

body.body--dark .tours-page-row:hover {
  background-color: rgba(255, 255, 255, 0.06);
}
</style>
