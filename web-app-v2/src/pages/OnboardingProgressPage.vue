<template>
  <div class="q-pa-md onboarding-page">
    <!-- ═══════════ CABEÇALHO ═══════════ -->
    <div class="row items-center q-col-gutter-sm q-mb-md">
      <div class="col-12 col-md">
        <div class="row items-center no-wrap">
          <div class="page-icon q-mr-sm"><q-icon name="checklist" size="20px" color="white" /></div>
          <div>
            <div class="text-h6 text-weight-bold">Onboarding da Equipa</div>
            <div class="text-caption text-grey-6">
              Checklist do primeiro dia, por utilizador. O progresso é da conta — segue a pessoa entre dispositivos.
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-auto q-gutter-xs no-wrap">
        <q-btn flat round icon="refresh" color="primary" :loading="loading" @click="load">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ═══════════ KPIs ═══════════ -->
    <div class="row q-col-gutter-md q-mb-md">
      <div v-for="kpi in kpis" :key="kpi.label" class="col-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="row items-center no-wrap">
            <div class="tile-icon q-mr-sm" :style="{ background: kpi.bg }">
              <q-icon :name="kpi.icon" size="18px" :color="kpi.color" />
            </div>
            <div>
              <div class="text-subtitle1 text-weight-bold" :class="kpi.textClass">{{ kpi.value }}</div>
              <div class="text-caption text-grey-6">{{ kpi.label }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ═══════════ FILTROS ═══════════ -->
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-12 col-md-4">
            <q-input
              v-model="search"
              dense
              outlined
              clearable
              placeholder="Pesquisar por nome, e-mail ou telefone"
              input-style="font-size: 13px"
            >
              <template v-slot:prepend><q-icon name="search" size="16px" color="grey-5" /></template>
            </q-input>
          </div>
          <div class="col-6 col-md-3">
            <q-select
              v-model="roleFilter"
              :options="roleOptions"
              dense
              outlined
              emit-value
              map-options
              label="Perfil"
              input-style="font-size: 13px"
            />
          </div>
          <div class="col-6 col-md-3">
            <q-select
              v-model="stateFilter"
              :options="stateOptions"
              dense
              outlined
              emit-value
              map-options
              label="Estado"
              input-style="font-size: 13px"
            />
          </div>
          <div class="col-12 col-md-2">
            <q-toggle v-model="showInactive" dense label="Incluir inactivos" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════════ ESTADOS ═══════════ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar o progresso da equipa...</div>
    </div>

    <q-banner v-else-if="error" rounded class="bg-red-1 text-negative q-mb-md">
      <template v-slot:avatar><q-icon name="error_outline" color="negative" /></template>
      {{ error }}
      <template v-slot:action>
        <q-btn flat no-caps color="negative" label="Tentar de novo" @click="load" />
      </template>
    </q-banner>

    <!-- ═══════════ TABELA ═══════════ -->
    <q-table
      v-else
      :rows="rows"
      :columns="columns"
      row-key="userId"
      flat
      bordered
      style="border-radius: 12px"
      :rows-per-page-options="[10, 25, 50, 0]"
      :pagination="{ rowsPerPage: 25 }"
    >
      <template v-slot:top-left>
        <div class="text-caption text-grey-6">
          {{ rows.length }} de {{ rowsTotal.length }} utilizador(es)
        </div>
      </template>

      <template v-slot:body-cell-user="props">
        <q-td :props="props">
          <div class="row items-center no-wrap">
            <q-avatar :color="roleColor(props.row.role)" text-color="white" size="34px" class="q-mr-sm">
              <span style="font-size: 12px">{{ initials(props.row.name) }}</span>
            </q-avatar>
            <div style="min-width: 0">
              <div class="text-weight-medium ellipsis" style="font-size: 13.5px">{{ props.row.name }}</div>
              <div class="text-caption text-grey-6 ellipsis" style="font-size: 11.5px">{{ props.row.email }}</div>
            </div>
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-role="props">
        <q-td :props="props">
          <q-chip :color="roleColor(props.row.role)" text-color="white" size="sm" dense>
            {{ props.row.roleLabel }}
          </q-chip>
          <q-badge v-if="!props.row.active" color="grey-6" class="q-ml-xs" label="inactivo" />
        </q-td>
      </template>

      <template v-slot:body-cell-progress="props">
        <q-td :props="props" style="min-width: 180px">
          <div class="row items-center no-wrap q-mb-xs">
            <span class="text-caption text-weight-medium q-mr-xs">{{ props.row.doneCount }}/{{ props.row.taskCount }}</span>
            <span class="text-caption" :class="stateClass(props.row.state)">{{ props.row.percent }}%</span>
          </div>
          <q-linear-progress
            :value="props.row.percent / 100"
            size="7px"
            rounded
            :color="stateColor(props.row.state)"
            track-color="grey-3"
          />
        </q-td>
      </template>

      <template v-slot:body-cell-next="props">
        <q-td :props="props">
          <div v-if="props.row.next" class="row items-center no-wrap">
            <q-icon name="arrow_forward" size="14px" color="grey-6" class="q-mr-xs" />
            <span style="font-size: 12.5px">{{ props.row.next.title }}</span>
          </div>
          <span v-else class="text-caption text-positive">
            <q-icon name="task_alt" size="14px" class="q-mr-xs" />primeiro dia completo
          </span>
        </q-td>
      </template>

      <template v-slot:body-cell-last="props">
        <q-td :props="props">
          <div v-if="props.row.lastCompletedAt" style="font-size: 12px">
            <div>{{ formatDate(props.row.lastCompletedAt) }}</div>
            <div class="text-caption text-grey-5">{{ formatAgo(props.row.lastCompletedAt) }}</div>
          </div>
          <span v-else class="text-caption text-grey-5">—</span>
        </q-td>
      </template>

      <template v-slot:body-cell-state="props">
        <q-td :props="props">
          <q-chip :color="stateColor(props.row.state)" text-color="white" size="sm" dense :icon="stateIcon(props.row.state)">
            {{ stateLabel(props.row.state) }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn flat round dense size="sm" icon="visibility" color="grey-7" @click="openDetail(props.row)">
            <q-tooltip>Ver as tarefas deste utilizador</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <!-- ═══════════ TAREFAS ONDE A EQUIPA PÁRA ═══════════ -->
    <q-card v-if="!loading && !error && taskAdoption.length > 0" flat bordered class="q-mt-md" style="border-radius: 12px">
      <q-card-section class="q-py-sm">
        <div class="text-subtitle2 text-weight-bold">
          <q-icon name="priority_high" size="16px" color="warning" class="q-mr-xs" />
          Tarefas onde a equipa para
        </div>
        <div class="text-caption text-grey-6">
          Tarefas por concluir em mais contas — é por aqui que o acompanhamento começa.
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-gutter-sm">
        <div v-for="task in taskAdoption.slice(0, 6)" :key="task.id" class="row items-center no-wrap">
          <div class="col ellipsis" style="font-size: 13px">{{ task.title }}</div>
          <div class="col-auto q-mr-sm text-caption text-grey-6">{{ task.done }}/{{ task.applicable }}</div>
          <div style="width: 140px">
            <q-linear-progress
              :value="task.applicable ? task.done / task.applicable : 0"
              size="7px"
              rounded
              color="teal"
              track-color="grey-3"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════════ DETALHE DE UM UTILIZADOR ═══════════ -->
    <q-dialog v-model="detailOpen" position="right" full-height>
      <q-card style="width: 420px; max-width: 92vw; border-radius: 12px 0 0 12px">
        <q-card-section class="bg-primary text-white row items-center">
          <q-icon name="checklist" size="20px" class="q-mr-sm" />
          <div class="col">
            <div class="text-h6">Checklist de {{ selected?.name }}</div>
            <div class="text-caption" style="opacity: 0.85">
              {{ selected?.roleLabel }} · {{ selected?.doneCount }} de {{ selected?.taskCount }} tarefas
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="detailOpen = false" />
        </q-card-section>

        <q-card-section v-if="selected">
          <q-linear-progress
            :value="selected.percent / 100"
            size="8px"
            rounded
            :color="stateColor(selected.state)"
            track-color="grey-3"
            class="q-mb-md"
          />
          <q-list separator>
            <q-item v-for="task in selected.tasks" :key="task.id">
              <q-item-section side top>
                <q-icon
                  :name="selected.doneIds.has(task.id) ? 'task_alt' : 'radio_button_unchecked'"
                  :color="selected.doneIds.has(task.id) ? 'positive' : 'grey-5'"
                  size="20px"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label :class="selected.doneIds.has(task.id) ? 'text-grey-6' : 'text-weight-medium'">
                  {{ task.title }}
                </q-item-label>
                <q-item-label caption style="font-size: 11.5px">{{ task.text }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <div v-if="selected.lastCompletedAt" class="text-caption text-grey-6 q-mt-md">
            <q-icon name="schedule" size="14px" class="q-mr-xs" />
            Última tarefa concluída em {{ formatDateTime(selected.lastCompletedAt) }}
          </div>
          <div v-else class="text-caption text-grey-6 q-mt-md">
            <q-icon name="info" size="14px" class="q-mr-xs" />
            Ainda não concluiu nenhuma tarefa.
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { CHECKLIST_TASKS } from '@/composables/useOnboardingChecklist'
import { getInitials } from '@/utils/formatters'

/**
 * ONBOARDING DA EQUIPA (Admin)
 * ───────────────────────────
 * Cada linha cruza o progresso guardado no servidor (GET /api/onboarding/team)
 * com o catálogo de tarefas do perfil — o catálogo vive no frontend, por isso é
 * aqui que se calculam o total, a percentagem e a próxima tarefa em falta. Se a
 * lista de tarefas de um perfil mudar, o progresso antigo continua válido: só as
 * tarefas que existem no catálogo contam.
 */
const $q = useQuasar()

const loading = ref(false)
const error = ref('')
const team = ref([])
const search = ref('')
const roleFilter = ref('todos')
const stateFilter = ref('todos')
const showInactive = ref(false)
const detailOpen = ref(false)
const selected = ref(null)

const ROLE_LABELS = { 0: 'Super Admin', 1: 'Admin', 2: 'Operador', 3: 'Gestor', 4: 'Parceiro Financiador' }
const ROLE_COLORS = { 0: 'grey-9', 1: 'negative', 2: 'blue', 3: 'teal', 4: 'deep-purple' }

const roleColor = (role) => ROLE_COLORS[Number(role)] || 'grey'

/** Junta o progresso do servidor ao catálogo de tarefas do perfil. */
const rowsTotal = computed(() =>
  (team.value || []).map((user) => {
    const catalogue = CHECKLIST_TASKS[Number(user.role)] || null
    const tasks = catalogue?.tasks || []
    const doneIds = new Set((user.taskIds || []).map(String))
    const done = tasks.filter((task) => doneIds.has(task.id))
    const pending = tasks.filter((task) => !doneIds.has(task.id))
    const taskCount = tasks.length
    const doneCount = done.length
    const percent = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0

    return {
      ...user,
      roleLabel: catalogue?.label || ROLE_LABELS[Number(user.role)] || 'Sem checklist',
      tasks,
      doneIds,
      taskCount,
      doneCount,
      percent,
      next: pending[0] || null,
      state: doneCount === 0 ? 'por-comecar' : doneCount >= taskCount && taskCount > 0 ? 'concluido' : 'a-meio'
    }
  })
)

/**
 * População em análise: esconde contas inactivas e aplica o filtro de perfil.
 * Os KPIs e a adopção por tarefa falam desta população; os filtros de estado e
 * a pesquisa só estreitam a lista.
 */
const scopeRows = computed(() => {
  let result = rowsTotal.value
  if (!showInactive.value) result = result.filter((row) => row.active !== false)
  if (roleFilter.value !== 'todos') result = result.filter((row) => Number(row.role) === Number(roleFilter.value))
  return result
})

const kpis = computed(() => {
  const rows = scopeRows.value
  const withChecklist = rows.filter((row) => row.taskCount > 0)
  const concluded = withChecklist.filter((row) => row.state === 'concluido').length
  const started = withChecklist.filter((row) => row.state === 'a-meio').length
  const notStarted = withChecklist.filter((row) => row.state === 'por-comecar').length
  const average = withChecklist.length
    ? Math.round(withChecklist.reduce((sum, row) => sum + row.percent, 0) / withChecklist.length)
    : 0
  const tasksDone = withChecklist.reduce((sum, row) => sum + row.doneCount, 0)
  const tasksTotal = withChecklist.reduce((sum, row) => sum + row.taskCount, 0)

  return [
    { label: 'Utilizadores com checklist', value: withChecklist.length, icon: 'groups', color: 'primary', bg: 'rgba(13,124,61,0.12)' },
    { label: 'Primeiro dia concluído', value: concluded, icon: 'verified', color: 'positive', bg: 'rgba(5,150,105,0.12)', textClass: 'text-positive' },
    { label: 'A meio', value: started, icon: 'pending', color: 'blue', bg: 'rgba(37,99,235,0.12)', textClass: 'text-blue' },
    { label: `Média (${tasksDone}/${tasksTotal} tarefas)`, value: `${average}%`, icon: 'insights', color: 'teal', bg: 'rgba(8,145,178,0.12)', textClass: 'text-teal' },
    { label: 'Por começar', value: notStarted, icon: 'hourglass_empty', color: 'warning', bg: 'rgba(217,119,6,0.12)', textClass: 'text-warning' }
  ]
})

const roleOptions = computed(() => {
  const present = [...new Set(rowsTotal.value.map((row) => Number(row.role)))].sort((a, b) => a - b)
  return [
    { label: 'Todos os perfis', value: 'todos' },
    ...present.map((role) => ({ label: ROLE_LABELS[role] || `Perfil ${role}`, value: role }))
  ]
})

const stateOptions = [
  { label: 'Todos os estados', value: 'todos' },
  { label: 'Concluídos', value: 'concluido' },
  { label: 'A meio', value: 'a-meio' },
  { label: 'Por começar', value: 'por-comecar' }
]

const rows = computed(() => {
  let result = scopeRows.value
  if (stateFilter.value !== 'todos') result = result.filter((row) => row.state === stateFilter.value)
  const term = search.value.trim().toLowerCase()
  if (term) {
    result = result.filter((row) =>
      [row.name, row.email, row.phone].filter(Boolean).some((value) => String(value).toLowerCase().includes(term))
    )
  }
  // Quem está mais atrás aparece primeiro — é o que o Admin precisa de ver.
  return [...result].sort((a, b) => a.percent - b.percent)
})

/** Adopção por tarefa: quantas contas já a concluíram (as menos cumpridas primeiro). */
const taskAdoption = computed(() => {
  const map = new Map()
  for (const row of scopeRows.value) {
    if (row.taskCount === 0) continue
    for (const task of row.tasks) {
      if (!map.has(task.id)) {
        map.set(task.id, { id: task.id, title: task.title, done: 0, applicable: 0 })
      }
      const entry = map.get(task.id)
      entry.applicable += 1
      if (row.doneIds.has(task.id)) entry.done += 1
    }
  }
  return [...map.values()].sort((a, b) => a.done / a.applicable - b.done / b.applicable)
})

const columns = [
  { name: 'user', label: 'Utilizador', field: 'name', align: 'left', sortable: true },
  { name: 'role', label: 'Perfil', field: 'roleLabel', align: 'left', sortable: true },
  { name: 'progress', label: 'Progresso', field: 'percent', align: 'left', sortable: true },
  { name: 'next', label: 'Próximo passo', field: 'next', align: 'left' },
  { name: 'last', label: 'Última conclusão', field: 'lastCompletedAt', align: 'left', sortable: true },
  { name: 'state', label: 'Estado', field: 'state', align: 'left', sortable: true },
  { name: 'actions', label: '', field: 'userId', align: 'center' }
]

const stateLabel = (state) =>
  ({ concluido: 'Concluído', 'a-meio': 'A meio', 'por-comecar': 'Por começar' }[state] || '—')
const stateIcon = (state) => ({ concluido: 'task_alt', 'a-meio': 'pending', 'por-comecar': 'hourglass_empty' }[state] || 'info')
const stateColor = (state) => ({ concluido: 'positive', 'a-meio': 'blue', 'por-comecar': 'warning' }[state] || 'grey')
const stateClass = (state) => ({ concluido: 'text-positive', 'a-meio': 'text-blue', 'por-comecar': 'text-warning' }[state] || 'text-grey-6')

const initials = (name) => getInitials(name || '')

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('pt-MZ') : '—')
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('pt-MZ') : '—')

/** «há 3 dias» — mostra a idade da última conclusão sem obrigar a fazer contas. */
const formatAgo = (value) => {
  if (!value) return ''
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  return months === 1 ? 'há 1 mês' : `há ${months} meses`
}

function openDetail(row) {
  selected.value = row
  detailOpen.value = true
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/api/onboarding/team')
    team.value = data?.result?.users || []
  } catch (requestError) {
    error.value =
      requestError.response?.data?.message || 'Não foi possível carregar o progresso da equipa.'
    $q.notify({ type: 'negative', message: error.value, position: 'top' })
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.page-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f512e 0%, #16a34a 100%);
}

.kpi-card {
  border-radius: 12px;
}

.tile-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
</style>
