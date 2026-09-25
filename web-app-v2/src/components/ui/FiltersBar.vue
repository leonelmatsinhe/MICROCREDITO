<template>
  <q-card flat class="filter-card">
    <q-card-section class="q-py-sm q-px-md">
      <div class="row items-center q-gutter-sm">
        <!-- Quick Filters — QBtnToggle (Hoje/Semana/Mês/Ano) -->
        <div class="col-auto">
          <q-btn-toggle
            v-model="activeFilter"
            :options="quickFilters"
            toggle-color="green-9"
            unelevated
            rounded
            dense
            no-caps
            class="quick-toggle"
            @update:model-value="applyQuickFilter"
          />
        </div>

        <q-separator vertical inset class="q-mx-xs" />

        <!-- Date From — QDate com mask DD/MM/YYYY -->
        <div class="col-auto">
          <q-input
            v-model="dateFrom"
            outlined
            dense
            placeholder="Data início"
            mask="##/##/####"
            style="width: 135px"
            bg-color="white"
          >
            <template v-slot:prepend>
              <q-icon name="event" size="16px" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="dateFrom" mask="DD/MM/YYYY" @update:model-value="onDatePicked" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>

        <!-- Date To — QDate com mask DD/MM/YYYY -->
        <div class="col-auto">
          <q-input
            v-model="dateTo"
            outlined
            dense
            placeholder="Data fim"
            mask="##/##/####"
            style="width: 135px"
            bg-color="white"
          >
            <template v-slot:prepend>
              <q-icon name="event" size="16px" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="dateTo" mask="DD/MM/YYYY" @update:model-value="onDatePicked" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>

        <q-space />

        <!-- Actions -->
        <q-btn flat dense no-caps color="grey-7" label="Limpar" size="sm" @click="clearFilters">
          <q-tooltip>Limpar filtros</q-tooltip>
        </q-btn>
        <q-btn
          unelevated
          dense
          no-caps
          color="green-9"
          icon="search"
          label="Filtrar"
          size="sm"
          @click="applyFilters"
        >
          <q-tooltip>Aplicar filtros</q-tooltip>
        </q-btn>
        <q-btn color="green-9" dense round unelevated icon="sync" size="sm" @click="$emit('sync')">
          <q-tooltip>Sincronizar dados</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const emit = defineEmits(['filter', 'clear', 'sync'])

const dateFrom = ref('')
const dateTo = ref('')
const activeFilter = ref('month')

const quickFilters = [
  { label: 'Hoje', value: 'today' },
  { label: 'Semana', value: 'week' },
  { label: 'Mês', value: 'month' },
  { label: 'Ano', value: 'year' }
]

// Format for display (DD/MM/YYYY)
function formatDateDisplay(date) {
  return format(date, 'dd/MM/yyyy')
}

// Convert DD/MM/YYYY to YYYY-MM-DD
function toAPIDate(dateStr) {
  if (!dateStr) return ''
  const parts = String(dateStr).split('/')
  if (parts.length !== 3) return ''
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

function applyQuickFilter(filter) {
  activeFilter.value = filter
  const now = new Date()

  switch (filter) {
    case 'today':
      dateFrom.value = formatDateDisplay(now)
      dateTo.value = formatDateDisplay(now)
      break
    case 'week':
      dateFrom.value = formatDateDisplay(startOfWeek(now, { weekStartsOn: 1 }))
      dateTo.value = formatDateDisplay(endOfWeek(now, { weekStartsOn: 1 }))
      break
    case 'month':
      dateFrom.value = formatDateDisplay(startOfMonth(now))
      dateTo.value = formatDateDisplay(endOfMonth(now))
      break
    case 'year':
      dateFrom.value = `01/01/${now.getFullYear()}`
      dateTo.value = `31/12/${now.getFullYear()}`
      break
  }

  emitDateFilter()
}

function applyFilters() {
  activeFilter.value = null
  emitDateFilter()
}

// Datas escolhidas no calendário também actualizam sem recarregar a página
function onDatePicked() {
  activeFilter.value = null
  emitDateFilter()
}

function clearFilters() {
  dateFrom.value = ''
  dateTo.value = ''
  activeFilter.value = null
  emit('clear')
}

function emitDateFilter() {
  // Send dates in YYYY-MM-DD format for the API
  emit('filter', {
    from: toAPIDate(dateFrom.value),
    to: toAPIDate(dateTo.value),
    quickFilter: activeFilter.value
  })
}

// Manter o toggle sincronizado quando o usuário digita datas manuais
watch([dateFrom, dateTo], ([from, to], [prevFrom, prevTo]) => {
  if (from === prevFrom && to === prevTo) return
})

// Aplicar filtro do mês por defeito
applyQuickFilter('month')
</script>

<style lang="scss" scoped>
.filter-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.quick-toggle {
  background: rgba(15, 23, 42, 0.04);
  border-radius: 10px;
  padding: 2px;
}

body.body--dark .filter-card {
  background: rgba(30, 41, 59, 0.7);
  border-color: rgba(255, 255, 255, 0.06);
}
</style>
