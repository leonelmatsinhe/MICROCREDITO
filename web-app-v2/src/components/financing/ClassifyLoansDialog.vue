<template>
  <q-dialog v-model="open" persistent>
    <q-card class="classify-card">
      <q-card-section class="dialog-head row items-center no-wrap">
        <q-icon name="link" size="20px" class="q-mr-sm" />
        <div class="col">
          <div class="text-h6">Classificar créditos antigos</div>
          <div class="text-caption">
            Créditos anteriores às carteiras de financiamento. Ao classificar, a carteira passa a constar no
            crédito, nas prestações, nos pagamentos e nos recibos já emitidos.
          </div>
        </div>
        <q-btn flat round dense icon="close" color="white" @click="open = false" />
      </q-card-section>

      <q-card-section v-if="loading" class="text-center q-pa-xl">
        <q-spinner-dots size="40px" color="primary" />
      </q-card-section>

      <q-card-section v-else-if="rows.length === 0" class="text-center q-pa-xl">
        <q-icon name="task_alt" size="52px" color="positive" />
        <div class="text-subtitle1 q-mt-sm">Todos os créditos têm carteira atribuída</div>
        <div class="text-caption text-grey-6">
          Os recibos e relatórios já conseguem identificar a origem do capital de cada crédito.
        </div>
      </q-card-section>

      <template v-else>
        <!-- Acção em lote -->
        <q-card-section class="row items-center q-col-gutter-sm q-py-sm bulk-bar no-wrap">
          <div class="col">
            <q-select
              v-model="bulkWalletId"
              :options="walletOptions"
              dense
              outlined
              emit-value
              map-options
              label="Carteira a atribuir"
              bg-color="white"
            >
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <q-badge :color="scope.opt.cor || 'blue'" :label="scope.opt.codigo" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label style="font-size: 13px">{{ scope.opt.label }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            icon="done_all"
            :label="`Atribuir aos ${selection.length} selecionado(s)`"
            :disable="selection.length === 0 || !bulkWalletId"
            :loading="saving"
            @click="applyBulk"
          />
        </q-card-section>

        <!-- Propostas automáticas: carteira derivada da taxa de juro do crédito -->
        <q-card-section class="suggestion-bar q-py-sm">
          <div class="row items-center q-col-gutter-sm no-wrap">
            <q-icon name="auto_awesome" size="18px" color="primary" />
            <div class="col text-caption">
              <template v-if="sugestoesLoading">A calcular as propostas pela taxa de juro…</template>
              <template v-else-if="resumo">
                <strong>{{ resumo.sugeridos }}</strong> sugerido(s) de {{ resumo.total_creditos }} pela taxa de juro
                · <strong>{{ resumo.valor_sugerido ? money(resumo.valor_sugerido) : '0,00 MT' }}</strong>
                <span v-if="resumo.ambiguos"> · <span class="text-orange-9">{{ resumo.ambiguos }} com taxa ligada a mais de uma carteira</span></span>
                <span v-if="resumo.sem_taxa"> · <span class="text-grey-7">{{ resumo.sem_taxa }} sem taxa correspondente</span></span>
              </template>
              <template v-else>Sem propostas calculadas</template>
            </div>
            <q-btn
              v-if="!sugestoesLoading"
              dense
              no-caps
              rounded
              outline
              color="primary"
              icon="auto_fix_high"
              label="Sugerir pela taxa"
              :disable="rows.length === 0"
              @click="aplicarSugestoes"
            />
            <q-btn
              v-if="Object.keys(perRow).length > 0"
              dense
              no-caps
              rounded
              flat
              color="grey-7"
              icon="backspace"
              label="Limpar"
              @click="limparSugestoes"
            />
          </div>

          <!-- Impacto por carteira antes de gravar -->
          <div v-if="resumo?.por_carteira?.length" class="row q-col-gutter-sm q-mt-xs">
            <div v-for="item in resumo.por_carteira" :key="item.walletId" class="col-12 col-md-6">
              <div class="impact-card row items-center no-wrap q-pa-xs">
                <q-badge :color="item.cor_badge || 'blue'" :label="item.codigo" class="q-mr-sm" />
                <div class="col text-caption ellipsis">
                  {{ item.creditos }} crédito(s) · <strong>{{ money(item.valor) }}</strong>
                  <span class="text-grey-6">
                    ({{ item.primeira_data ? formatDate(item.primeira_data) : '—' }}
                    → {{ item.ultima_data ? formatDate(item.ultima_data) : '—' }})
                  </span>
                </div>
                <q-chip
                  dense
                  square
                  :color="item.excede_alocado ? 'negative' : 'primary'"
                  text-color="white"
                  :label="item.allocated_amount ? `${item.percentagem_do_alocado}% de ${money(item.allocated_amount)}` : 'sem limite analítico'"
                />
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pa-none" style="max-height: 46vh; overflow: auto">
          <q-markup-table flat dense separator="horizontal" class="loans-table">
            <thead>
              <tr>
                <th style="width: 42px">
                  <q-checkbox
                    :model-value="allSelected"
                    :indeterminate="selection.length > 0 && !allSelected"
                    dense
                    color="primary"
                    @update:model-value="toggleAll"
                  />
                </th>
                <th class="text-left">Mutuário</th>
                <th class="text-center">Crédito</th>
                <th class="text-right">Montante</th>
                <th class="text-center">Desembolso</th>
                <th class="text-center">Taxa</th>
                <th class="text-left" style="width: 220px">Carteira</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id" :class="linhaClass(row)">
                <td>
                  <q-checkbox v-model="selection" :val="row.id" dense color="primary" />
                </td>
                <td>
                  <div class="text-caption text-weight-medium ellipsis" style="max-width: 220px">
                    {{ row.customerName || '—' }}
                  </div>
                  <div class="text-caption text-grey-6">Conta {{ row.accountNumber || '—' }}</div>
                </td>
                <td class="text-center text-caption">#{{ row.id }}</td>
                <td class="text-right text-caption text-weight-bold">{{ money(row.amount) }}</td>
                <td class="text-center text-caption">{{ formatDate(row.disbursementDate) }}</td>
                <td class="text-center text-caption">
                  {{ row.interestRate ? `${(Number(row.interestRate) * 100).toFixed(2)}%` : '—' }}
                </td>
                <td>
                  <q-select
                    v-model="perRow[row.id]"
                    :options="walletOptions"
                    dense
                    outlined
                    emit-value
                    map-options
                    placeholder="Escolher carteira"
                    options-dense
                    :class="alterado(row) ? 'select-alterado' : ''"
                  >
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section avatar>
                          <q-badge :color="scope.opt.cor || 'blue'" :label="scope.opt.codigo" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label style="font-size: 12px">{{ scope.opt.label }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>

                  <!-- De onde veio a proposta e com que confiança -->
                  <div v-if="propostaDe(row.id)" class="row items-center q-mt-xs no-wrap">
                    <q-badge
                      :color="corConfianca(propostaDe(row.id))"
                      :label="etiquetaConfianca(propostaDe(row.id))"
                      class="q-mr-xs"
                    />
                    <div class="text-caption text-grey-7 ellipsis" style="font-size: 10px">
                      {{ propostaDe(row.id).motivo }}
                      <q-tooltip max-width="380px">{{ propostaDe(row.id).motivo }}</q-tooltip>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-card-section>

        <q-card-actions align="right" class="q-pb-md q-pr-md">
          <div class="text-caption text-grey-6 q-mr-auto q-pl-md">
            {{ rows.length }} crédito(s) sem carteira
            <span v-if="pendingAssignments.length"> · {{ pendingAssignments.length }} a classificar agora</span>
          </div>
          <q-btn flat no-caps label="Fechar" color="grey" @click="open = false" />
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            icon="save"
            :label="`Guardar classificação${pendingAssignments.length ? ` (${pendingAssignments.length})` : ''}`"
            :disable="pendingAssignments.length === 0"
            :loading="saving"
            @click="applyPerRow"
          />
        </q-card-actions>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useWalletsStore } from '@/stores/wallets'

/**
 * CLASSIFICAÇÃO RETROATIVA DE CRÉDITOS
 * ------------------------------------
 * Os créditos concedidos antes das carteiras ficaram sem origem de capital;
 * enquanto isso acontece o recibo mostra "A classificar". Aqui o Admin atribui
 * a carteira a cada crédito antigo (em lote ou individualmente) e o backend
 * propaga-a a prestações, pagamentos e recibos.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'classified'])

const $q = useQuasar()
const authStore = useAuthStore()
const walletsStore = useWalletsStore()

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const selection = ref([])
const bulkWalletId = ref(null)
const perRow = ref({})
const sugestoesLoading = ref(false)
const resumo = ref(null)
const propostas = ref({})

const walletOptions = computed(() =>
  walletsStore.walletOptions.map((wallet) => ({
    label: `${wallet.codigo} · ${wallet.nome}`,
    value: wallet.value,
    codigo: wallet.codigo,
    cor: wallet.cor
  }))
)

const allSelected = computed(() => rows.value.length > 0 && selection.value.length === rows.value.length)

const propostaDe = (loanId) => propostas.value[loanId] || null

/** Sugestão de carteira derivada da taxa de juro do crédito. */
const sugestaoDe = (loanId) => propostaDe(loanId)?.sugerida?.walletId || null

/** O crédito tem carteira escolhida diferente da que a taxa propõe. */
const alterado = (row) => {
  const escolhida = Number(perRow.value[row.id]) || null
  const sugerida = sugestaoDe(row.id)
  return Boolean(escolhida && sugerida && escolhida !== Number(sugerida))
}

const corConfianca = (proposta) =>
  proposta.confianca === 'ALTA' ? 'primary' : proposta.confianca === 'AMBIGUA' ? 'orange-8' : 'grey-6'

const etiquetaConfianca = (proposta) => {
  if (proposta.confianca === 'ALTA') return `Sugerida pela taxa ${proposta.taxaPercent}%`
  if (proposta.confianca === 'AMBIGUA') return 'Taxa ligada a mais de uma carteira'
  return 'Sem taxa correspondente'
}

const linhaClass = (row) => {
  const proposta = propostaDe(row.id)
  if (!proposta) return ''
  return proposta.confianca === 'ALTA' && sugestaoDe(row.id) === Number(perRow.value[row.id])
    ? 'linha-sugerida'
    : ''
}

const pendingAssignments = computed(() =>
  Object.entries(perRow.value)
    .filter(([, walletId]) => walletId)
    .map(([loanId, walletId]) => ({ loanId: Number(loanId), walletId: Number(walletId) }))
)

const money = (value) =>
  `${(Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`

const formatDate = (value) => {
  if (!value) return '—'
  const data = new Date(String(value).slice(0, 10))
  return Number.isNaN(data.getTime()) ? String(value) : data.toLocaleDateString('pt-PT')
}

function toggleAll(value) {
  selection.value = value ? rows.value.map((row) => row.id) : []
}

async function load() {
  const companyId = authStore.companyId
  if (!companyId) return
  loading.value = true
  try {
    if (walletsStore.wallets.length === 0) await walletsStore.fetchWallets(companyId)
    rows.value = await walletsStore.fetchUnclassifiedLoans(companyId)
    selection.value = []
    bulkWalletId.value = walletOptions.value[0]?.value || null
    perRow.value = {}
    await carregarPropostas()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao carregar os créditos sem carteira',
      position: 'top'
    })
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function apply(classify) {
  if (classify.length === 0) return
  saving.value = true
  try {
    const data = await walletsStore.classifyLoans(authStore.companyId, classify)
    $q.notify({
      type: data?.success === false ? 'negative' : 'positive',
      message: data?.message || 'Créditos classificados',
      position: 'top'
    })
    if (data?.success !== false) {
      await load()
      emit('classified')
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao classificar os créditos',
      position: 'top'
    })
  } finally {
    saving.value = false
  }
}

/**
 * Calcula (sem gravar) as propostas de carteira a partir da taxa de juro de cada
 * crédito e pré-preenche o diálogo: o Admin vê exactamente o que vai ser
 * atribuído, pode corrigir linha a linha e só depois confirma.
 */
async function carregarPropostas() {
  const companyId = authStore.companyId
  if (!companyId) return
  sugestoesLoading.value = true
  try {
    const { propostas: lista, resumo: resumoPropostas } = await walletsStore.fetchClassificationProposals(companyId)
    const mapa = {}
    lista.forEach((item) => {
      mapa[item.id] = item
    })
    propostas.value = mapa
    resumo.value = resumoPropostas
    aplicarSugestoes()
  } catch (error) {
    propostas.value = {}
    resumo.value = null
    $q.notify({
      type: 'warning',
      message: error.response?.data?.message || 'Não foi possível calcular as propostas pela taxa de juro',
      position: 'top'
    })
  } finally {
    sugestoesLoading.value = false
  }
}

/** Preenche a carteira de cada crédito com a sugestão de confiança alta. */
function aplicarSugestoes() {
  const novo = { ...perRow.value }
  const sugeridos = []
  rows.value.forEach((row) => {
    const sugerida = sugestaoDe(row.id)
    if (sugerida) {
      novo[row.id] = Number(sugerida)
      sugeridos.push(row.id)
    }
  })
  perRow.value = novo
  selection.value = sugeridos
}

function limparSugestoes() {
  perRow.value = {}
  selection.value = []
}

function applyBulk() {
  if (!bulkWalletId.value) return
  const classificacoes = selection.value.map((loanId) => ({
    loanId: Number(loanId),
    walletId: Number(bulkWalletId.value)
  }))
  apply(classificacoes)
}

function applyPerRow() {
  apply(pendingAssignments.value)
}

watch(
  () => props.modelValue,
  (value) => {
    if (value) load()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.suggestion-bar {
  background: rgba(15, 107, 47, 0.04);
  border-top: 1px solid rgba(15, 107, 47, 0.08);
}

.impact-card {
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  min-width: 0;
}

// Linha cuja carteira veio da sugestão da taxa (pré-visualização do que vai ser gravado).
.linha-sugerida {
  background: rgba(15, 107, 47, 0.035);
}

// Linha em que o Admin trocou a carteira proposta pela taxa.
.select-alterado :deep(.q-field__control) {
  background: rgba(239, 108, 0, 0.06);
}

.classify-card {
  width: 900px;
  max-width: 96vw;
  border-radius: 18px;
  overflow: hidden;
}

.dialog-head {
  background: linear-gradient(135deg, $primary, #16a34a);
  color: #fff;
}

.bulk-bar {
  background: rgba(15, 107, 47, 0.05);
}

.loans-table {
  thead tr th {
    font-size: 11px;
    color: $grey-7;
    font-weight: 600;
    background: #f8fafc;
  }
}
</style>
