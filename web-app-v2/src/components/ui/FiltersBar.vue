<template>
  <q-card flat class="filter-card">
    <q-card-section class="q-py-sm q-px-md">
      <div class="row items-center q-col-gutter-sm">
        <!-- Presets (Hoje/Semana/Mês/Ano) — o activo vem do filtro aplicado -->
        <div class="col-auto">
          <q-btn-toggle
            :model-value="modelValue?.period"
            :options="PERIOD_PRESETS"
            toggle-color="green-9"
            unelevated
            rounded
            dense
            no-caps
            class="quick-toggle"
            @update:model-value="onPreset"
          />
        </div>

        <q-separator vertical inset class="q-mx-xs" />

        <!-- Datas (texto com máscara: aceita digitação e calendário) -->
        <div class="col-auto">
          <q-input
            v-model="draftFrom"
            outlined
            dense
            placeholder="Data início"
            mask="##/##/####"
            style="width: 135px"
            bg-color="white"
            :error="dateError !== ''"
            :loading="loading"
            @blur="applyDraftDates"
            @keyup.enter="applyDraftDates"
          >
            <template v-slot:prepend>
              <q-icon name="event" size="16px" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="calendarFrom"
                    mask="DD/MM/YYYY"
                    :navigation-min-year-month="bounds.min"
                    :navigation-max-year-month="bounds.max"
                    @update:model-value="onCalendarPick"
                  />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>

        <div class="col-auto">
          <q-input
            v-model="draftTo"
            outlined
            dense
            placeholder="Data fim"
            mask="##/##/####"
            style="width: 135px"
            bg-color="white"
            :error="dateError !== ''"
            @blur="applyDraftDates"
            @keyup.enter="applyDraftDates"
          >
            <template v-slot:prepend>
              <q-icon name="event" size="16px" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="calendarTo"
                    mask="DD/MM/YYYY"
                    :navigation-min-year-month="bounds.min"
                    :navigation-max-year-month="bounds.max"
                    @update:model-value="onCalendarPick"
                  />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>

        <!-- Período aplicado (substitui o espaço vazio à direita) -->
        <div class="col-auto period-label">
          <q-icon name="event_available" size="15px" color="green-9" />
          <span>{{ periodLabel }}</span>
        </div>

        <div v-if="dateError" class="col-auto text-negative text-caption">{{ dateError }}</div>

        <q-space />

        <!-- Acções -->
        <q-btn
          flat
          dense
          no-caps
          color="grey-7"
          label="Limpar"
          size="sm"
          :disable="modelValue?.period === 'all'"
          @click="clearFilters"
        >
          <q-tooltip>Mostrar todo o histórico (sem filtro de datas)</q-tooltip>
        </q-btn>
        <q-btn
          unelevated
          dense
          no-caps
          color="green-9"
          icon="refresh"
          label="Actualizar"
          size="sm"
          :loading="loading"
          @click="$emit('refresh')"
        >
          <q-tooltip>Recarregar com o filtro actual</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  PERIOD_PRESETS,
  calendarBounds,
  describePeriod,
  displayToIso,
  isoToDisplay,
  presetRange,
  resolveFilterFromQuery
} from '@/utils/period'

/**
 * BARRA DE FILTROS DO PAINEL — componente CONTROLADO.
 *
 * O estado aplicado vive no pai (e na URL); aqui só existe o rascunho das
 * datas digitadas. Assim:
 *  · um refresh repõe exactamente o mesmo filtro;
 *  · não há emissão durante o setup (o pai já carrega uma vez);
 *  · presets são recalculados a partir de hoje (nunca ficam presos no mês
 *    anterior).
 */
const props = defineProps({
  modelValue: { type: Object, default: () => resolveFilterFromQuery({}) },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'apply', 'refresh'])

const bounds = calendarBounds()
const draftFrom = ref(isoToDisplay(props.modelValue?.from))
const draftTo = ref(isoToDisplay(props.modelValue?.to))
const calendarFrom = ref(draftFrom.value)
const calendarTo = ref(draftTo.value)
const dateError = ref('')

const periodLabel = computed(() => describePeriod(props.modelValue))

// Sincroniza o rascunho quando o filtro aplicado muda (refresh/back/limpar).
watch(
  () => [props.modelValue?.from, props.modelValue?.to],
  ([from, to]) => {
    draftFrom.value = isoToDisplay(from)
    draftTo.value = isoToDisplay(to)
    calendarFrom.value = draftFrom.value
    calendarTo.value = draftTo.value
    dateError.value = ''
  }
)

function apply(next) {
  emit('update:modelValue', next)
  emit('apply', next)
}

function onPreset(period) {
  if (!period) return
  dateError.value = ''
  apply({ period, ...presetRange(period) })
}

function onCalendarPick() {
  draftFrom.value = calendarFrom.value || ''
  draftTo.value = calendarTo.value || ''
  applyDraftDates()
}

/** Datas digitadas: só aplica quando as duas são válidas e from <= to. */
function applyDraftDates() {
  const from = displayToIso(draftFrom.value)
  const to = displayToIso(draftTo.value)

  if (!draftFrom.value && !draftTo.value) {
    dateError.value = ''
    return
  }
  if (!from || !to) {
    dateError.value = 'Data inválida (DD/MM/AAAA)'
    return
  }
  if (from > to) {
    dateError.value = 'A data inicial é posterior à data final'
    return
  }
  dateError.value = ''
  if (props.modelValue?.period === 'custom' && props.modelValue.from === from && props.modelValue.to === to) {
    return
  }
  apply({ period: 'custom', from, to })
}

function clearFilters() {
  dateError.value = ''
  apply({ period: 'all', from: '', to: '' })
}
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

.period-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

body.body--dark {
  .filter-card {
    background: rgba(30, 41, 59, 0.7);
    border-color: rgba(255, 255, 255, 0.06);
  }
  .period-label { color: #e5e7eb; }
}
</style>
