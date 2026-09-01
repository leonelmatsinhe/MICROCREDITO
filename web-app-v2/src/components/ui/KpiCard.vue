<template>
  <q-card flat bordered class="kpi-card cursor-pointer" @click="$emit('click')">
    <q-card-section class="q-pa-md">
      <div class="row items-center no-wrap">
        <div class="col-auto">
          <q-avatar :color="avatarColor" text-color="white" size="42px">
            <q-icon :name="icon" size="22px" />
          </q-avatar>
        </div>
        <div class="col q-ml-md">
          <div class="kpi-label text-grey-6">{{ label }}</div>
          <div class="row items-center no-wrap q-mt-xs">
            <span class="kpi-value text-weight-bold" :class="valueColor">
              {{ formattedValue }}
            </span>
            <q-badge
              v-if="trend !== null && trend !== undefined"
              :color="trend >= 0 ? 'positive' : 'negative'"
              :label="trend >= 0 ? `+${trend}%` : `${trend}%`"
              class="q-ml-sm"
              style="font-size: 10px"
              rounded
            />
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  icon: { type: String, default: 'trending_up' },
  avatarColor: { type: String, default: 'primary' },
  valueColor: { type: String, default: 'text-dark' },
  format: { type: String, default: 'number' }, // 'number' | 'money' | 'percent'
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  trend: { type: Number, default: null }
})

defineEmits(['click'])

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined) return '--'

  if (props.format === 'money') {
    const num = Number(props.value)
    if (isNaN(num)) return '--'
    return props.prefix + num.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MT'
  }

  if (props.format === 'percent') {
    return props.value + '%'
  }

  const num = Number(props.value)
  if (isNaN(num)) return props.value
  return props.prefix + num.toLocaleString('pt-MZ') + props.suffix
})
</script>

<style lang="scss" scoped>
.kpi-card {
  border-radius: 12px;
  transition: all 0.2s ease;
  border: 1px solid $gray-200;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
}

body.body--dark .kpi-card {
  background-color: $gray-800;
  border-color: $gray-700;
}

.kpi-label {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.kpi-value {
  font-size: 22px;
  line-height: 1.2;
}

body.body--dark .kpi-label {
  color: $gray-400;
}

body.body--dark .text-dark {
  color: $gray-100 !important;
}
</style>
