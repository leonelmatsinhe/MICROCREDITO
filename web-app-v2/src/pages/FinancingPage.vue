<template>
  <q-page class="financing-page q-pa-md">
    <!-- Cabeçalho da página + abas -->
    <q-card flat class="tabs-card q-mb-md">
      <q-card-section class="q-py-sm">
        <div class="row items-center q-col-gutter-sm">
          <div class="col-12 col-md">
            <div class="text-subtitle1 text-weight-bold">Financiamento — Carteiras e Taxas</div>
            <div class="text-caption text-grey-6">
              Origem do capital (parceiros/fundos MBRM), taxas de juro e separação dos relatórios
              (BM consolidado · financiadores isolados).
            </div>
          </div>
          <div class="col-12 col-md-auto">
            <q-tabs
              v-model="tab"
              dense
              no-caps
              align="right"
              active-color="primary"
              indicator-color="primary"
              class="financing-tabs"
            >
              <q-tab name="carteiras" icon="savings" label="Carteiras" />
              <q-tab name="taxas" icon="percent" label="Taxas de Juro" />
            </q-tabs>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-tab-panels v-model="tab" animated class="bg-transparent">
      <q-tab-panel name="carteiras" class="q-pa-none">
        <WalletsPanel />
      </q-tab-panel>
      <q-tab-panel name="taxas" class="q-pa-none">
        <RatesPanel />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WalletsPanel from '@/components/financing/WalletsPanel.vue'
import RatesPanel from '@/components/financing/RatesPanel.vue'

/**
 * FINANCIAMENTO — página única que junta as carteiras de financiamento e as
 * taxas de juro (antes separadas em Configurações), já que uma taxa pertence
 * sempre a uma origem de capital (carteira ou conta de desembolso).
 */
const route = useRoute()
const router = useRouter()
const tab = ref(route.query.tab === 'taxas' ? 'taxas' : 'carteiras')

watch(tab, (value) => {
  router.replace({ query: { ...route.query, tab: value } }).catch(() => {})
})

watch(() => route.query.tab, (value) => {
  const next = value === 'taxas' ? 'taxas' : 'carteiras'
  if (next !== tab.value) tab.value = next
})
</script>

<style lang="scss" scoped>
.financing-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}

.tabs-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.financing-tabs {
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
}

body.body--dark {
  .financing-page { background: #1a1a2e; }
  .tabs-card { background: rgba(30, 41, 59, 0.7); border-color: rgba(255, 255, 255, 0.06); }
  .financing-tabs { background: rgba(255, 255, 255, 0.06); }
}
</style>
