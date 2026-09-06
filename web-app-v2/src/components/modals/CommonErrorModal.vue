<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card class="common-error-modal">
      <q-card-section class="common-error-header row items-center">
        <q-avatar icon="error_outline" color="negative" text-color="white" size="44px" />
        <div class="q-ml-md">
          <div class="text-h6">{{ title }}</div>
          <div class="text-caption common-error-subtitle">Operação não concluída</div>
        </div>
        <q-space />
        <q-btn flat round dense icon="close" aria-label="Fechar" @click="close" />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-lg">
        <div class="common-error-message">{{ message }}</div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn unelevated color="negative" label="Fechar" no-caps @click="close" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Não foi possível concluir' },
  message: { type: String, required: true }
})

const emit = defineEmits(['update:modelValue'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

function close() {
  dialogModel.value = false
}
</script>

<style lang="scss" scoped>
.common-error-modal {
  width: 460px;
  max-width: 92vw;
  border-radius: 14px;
}

.common-error-header {
  min-height: 82px;
  background: #fff5f5;
  color: #7f1d1d;
}

.common-error-subtitle {
  color: #b91c1c;
}

.common-error-message {
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
}

body.body--dark {
  .common-error-header {
    background: rgba(127, 29, 29, 0.22);
    color: #fecaca;
  }

  .common-error-subtitle {
    color: #fca5a5;
  }

  .common-error-message {
    color: #e5e7eb;
  }
}
</style>
