<template>
  <q-card flat bordered class="q-mb-md filter-card">
    <q-card-section class="q-py-sm q-px-md">
      <div class="row items-center q-gutter-sm">
        <!-- Quick Filters -->
        <div class="col-auto">
          <q-btn-group flat rounded>
            <q-btn
              v-for="filter in quickFilters"
              :key="filter.value"
              :label="filter.label"
              :color="activeFilter === filter.value ? 'primary' : 'grey-6'"
              :flat="activeFilter !== filter.value"
              :outline="activeFilter === filter.value"
              size="sm"
              no-caps
              @click="applyQuickFilter(filter.value)"
            />
          </q-btn-group>
        </div>

        <q-separator vertical class="q-mx-sm" />

        <!-- Date From -->
        <div class="col-auto">
          <q-input
            v-model="dateFrom"
            outlined
            dense
            placeholder="Data início"
            mask="##/##/####"
            style="width: 130px"
          >
            <template v-slot:prepend>
              <q-icon name="event" size="16px" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="dateFrom" mask="DD/MM/YYYY" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>

        <!-- Date To -->
        <div class="col-auto">
          <q-input
            v-model="dateTo"
            outlined
            dense
            placeholder="Data fim"
            mask="##/##/####"
            style="width: 130px"
          >
            <template v-slot:prepend>
              <q-icon name="event" size="16px" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="dateTo" mask="DD/MM/YYYY" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>

        <q-space />

        <!-- Actions -->
        <div class="col-auto">
          <q-btn
            flat
            dense
            no-caps
            color="grey-6"
            icon="clear_all"
            label="Limpar"
            size="sm"
            @click="clearFilters"
          />
        </div>
        <div class="col-auto">
          <q-btn
            color="primary"
            dense
            round
            icon="search"
            size="sm"
            @click="applyFilters"
          >
            <q-tooltip>Aplicar filtros</q-tooltip>
          </q-btn>
        </div>
        <div class="col-auto">
          <q-btn
            color="secondary"
            dense
            round
            icon="sync"
            size="sm"
            @click="$emit('sync')"
          >
            <q-tooltip>Sincronizar dados</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

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

// Format for API (YYYY-MM-DD)
function formatDateAPI(date) {
  return format(date, 'yyyy-MM-dd')
}

// Convert DD/MM/YYYY to YYYY-MM-DD
function toAPIDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('/')
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

// Aplicar filtro do mês por defeito
applyQuickFilter('month')
</script>

<style lang="scss" scoped>
.filter-card {
  border-radius: 12px;
  border: 1px solid $gray-200;
}

body.body--dark .filter-card {
  background-color: $gray-800;
  border-color: $gray-700;
}
</style>
