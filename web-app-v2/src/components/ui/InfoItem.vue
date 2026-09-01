<template>
  <div class="info-item">
    <div class="text-caption text-grey-5" style="font-size: 11px; margin-bottom: 2px">
      <q-icon v-if="icon" :name="icon" size="12px" class="q-mr-xs" />
      {{ label }}
    </div>
    <div class="text-body2 text-weight-medium" style="font-size: 13px">
      {{ value }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  icon: { type: String, default: '' }
})
</script>
