<template>
  <div class="folha-contagem">
    <div class="folha-titulo">
      <q-icon name="list_alt" size="16px" class="q-mr-xs" />
      {{ title }} (MT)
    </div>

    <!-- Cabeçalho: Denominação | Quantidade | Subtotal -->
    <div class="folha-head">
      <span class="folha-c-denom">Denominação</span>
      <span class="folha-c-qty">Quantidade</span>
      <span class="folha-c-sub">Subtotal</span>
    </div>

    <div class="folha-group">Notas</div>
    <div v-for="d in NOTAS" :key="'nota-' + d.key" class="folha-row">
      <span class="folha-c-denom">{{ d.label }}</span>
      <span class="folha-c-qty">
        <q-input
          :model-value="modelValue?.[d.key]"
          type="number"
          outlined
          dense
          min="0"
          step="1"
          class="folha-input"
          :rules="[v => (v === null || v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0)) || 'Quantidade inteira >= 0']"
          @update:model-value="v => setQty(d.key, v)"
        />
      </span>
      <span class="folha-c-sub">{{ formatMZN(Number(d.value) * (Number(modelValue?.[d.key]) || 0)) }}</span>
    </div>

    <div class="folha-group">Moedas</div>
    <div v-for="d in MOEDAS" :key="'moeda-' + d.key" class="folha-row">
      <span class="folha-c-denom">{{ d.label }}</span>
      <span class="folha-c-qty">
        <q-input
          :model-value="modelValue?.[d.key]"
          type="number"
          outlined
          dense
          min="0"
          step="1"
          class="folha-input"
          :rules="[v => (v === null || v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0)) || 'Quantidade inteira >= 0']"
          @update:model-value="v => setQty(d.key, v)"
        />
      </span>
      <span class="folha-c-sub">{{ formatMZN(Number(d.value) * (Number(modelValue?.[d.key]) || 0)) }}</span>
    </div>

    <!-- Total calculado automaticamente -->
    <div class="folha-total">
      <span>{{ totalLabel }}</span>
      <strong>{{ formatMZN(total) }}</strong>
    </div>

    <div v-if="hint" class="text-caption text-grey-7 q-mt-xs">
      <q-icon name="info" size="13px" class="q-mr-xs" />{{ hint }}
    </div>
  </div>
</template>

<script setup>
/**
 * FOLHA DE CONTAGEM DE CAIXA (MT) — componente oficial de contagem de numerário
 * (denominações BCI/BM: 1000 … 1 MT e 50 centavos). Usado na abertura
 * (Fundo de Maneio) e no fecho (Conferência Cega) dos caixas.
 */
import { computed } from 'vue'
import { MZN_DENOMINATION_META, sumDenominations, formatMZN } from '@/utils/mznDenominations'

const props = defineProps({
  modelValue: { type: Object, required: true },
  title: { type: String, default: 'Folha de Contagem de Caixa' },
  totalLabel: { type: String, default: 'Total contado' },
  hint: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const NOTAS = MZN_DENOMINATION_META.filter((d) => d.tipo === 'NOTA')
const MOEDAS = MZN_DENOMINATION_META.filter((d) => d.tipo === 'MOEDA')

const total = computed(() => sumDenominations(props.modelValue))

function setQty(key, value) {
  emit('update:modelValue', { ...(props.modelValue || {}), [key]: value })
}
</script>

<style lang="scss" scoped>
.folha-titulo {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #37474f;
  margin-bottom: 6px;
}

.folha-head {
  display: grid;
  grid-template-columns: 1fr 110px 120px;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #eceff1;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #546e7a;
}

.folha-group {
  margin-top: 8px;
  margin-bottom: 2px;
  padding-left: 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #90a4ae;
}

.folha-row {
  display: grid;
  grid-template-columns: 1fr 110px 120px;
  gap: 8px;
  align-items: center;
  padding: 2px 10px;
}

.folha-c-denom {
  font-size: 13px;
  font-weight: 500;
  color: #37474f;
  font-variant-numeric: tabular-nums;
}

.folha-c-sub {
  text-align: right;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: #263238;
}

.folha-input {
  :deep(.q-field__control) {
    height: 34px;
    padding: 0 8px;
    background: #fff;
  }
  :deep(.q-field__native) {
    font-variant-numeric: tabular-nums;
  }
}

.folha-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #e3f2fd;
  color: #0d47a1;
  font-size: 14px;

  strong {
    font-size: 17px;
    font-variant-numeric: tabular-nums;
  }
}
</style>
