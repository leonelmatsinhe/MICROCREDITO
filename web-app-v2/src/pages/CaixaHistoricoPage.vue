<template>
  <div class="q-pa-md caixa-historico-page">
    <!-- ═══════════ FILTROS ═══════════ -->
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-6 col-md-2">
            <q-input
              v-model="dateFrom"
              dense
              outlined
              label="Data início"
              type="date"
              input-style="font-size: 12px"
              @update:model-value="fetchHistory"
            />
          </div>
          <div class="col-6 col-md-2">
            <q-input
              v-model="dateTo"
              dense
              outlined
              label="Data fim"
              type="date"
              input-style="font-size: 12px"
              @update:model-value="fetchHistory"
            />
          </div>
          <div class="col-auto q-gutter-xs no-wrap">
            <q-btn flat round dense icon="filter_list_off" color="grey" size="sm" @click="clearFilters">
              <q-tooltip>Limpar filtros</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="refresh" color="primary" size="sm" :loading="loading" @click="fetchHistory">
              <q-tooltip>Actualizar</q-tooltip>
            </q-btn>
          </div>
          <div class="col text-right">
            <!-- Resumo do período filtrado -->
            <span class="text-caption text-grey-6 q-mr-md">
              {{ registers.length }} {{ registers.length === 1 ? 'caixa' : 'caixas' }}
            </span>
            <q-badge :color="periodDifferenceColor" style="font-size: 11px">
              Divergência acumulada: {{ formatMZN(periodDifference) }}
            </q-badge>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════════ CARREGAMENTO / VAZIO / TABELA ═══════════ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar histórico...</div>
    </div>

    <q-card v-else flat bordered style="border-radius: 12px; overflow: hidden">
      <q-card-section v-if="registers.length === 0" class="text-center q-pa-xl">
        <q-icon name="history" size="64px" color="grey-4" />
        <div class="text-h6 text-grey-6 q-mt-md">Nenhum caixa encontrado</div>
        <div class="text-caption text-grey-5">
          {{ isFiltering ? 'Ajuste as datas para ver mais resultados.' : 'Ainda não foram abertos caixas.' }}
        </div>
      </q-card-section>

      <q-table
        v-else
        :rows="registers"
        :columns="columns"
        row-key="id"
        flat
        bordered
        dense
        separator="horizontal"
        :rows-per-page-options="[15, 25, 50]"
        v-model:pagination="pagination"
        class="historico-table"
      >
        <!--
          Slot `body` — necessário para linhas expansíveis: renderiza a linha
          principal e, logo abaixo dela, a linha expandida com os movimentos.
          (O slot `top-row` NÃO recebe props.row — causava o erro
          "can't access property 'id', props.row is undefined".)
        -->
        <template v-slot:body="props">
          <!-- ── Linha principal ── -->
          <q-tr :props="props" class="cursor-pointer" @click="toggleExpand(props.row)">
            <!-- Data de abertura -->
            <q-td key="opening_date" :props="props" class="text-center">
              <div class="text-weight-medium" style="font-size: 12px">{{ formatDay(props.row.opening_date) }}</div>
              <div class="text-caption text-grey-6" style="font-size: 10px">{{ formatTime(props.row.createdAt) }}</div>
            </q-td>

            <!-- Responsável -->
            <q-td key="userName" :props="props" style="font-size: 12px">
              {{ props.row.userName || '—' }}
            </q-td>

            <!-- Estado -->
            <q-td key="status" :props="props" class="text-center">
              <q-badge :color="props.row.status === 'ABERTO' ? 'positive' : 'grey-7'" style="font-size: 10px">
                {{ props.row.status }}
              </q-badge>
            </q-td>

            <!-- Valores monetários -->
            <q-td key="opening_balance" :props="props" class="text-right" style="font-size: 12px">
              {{ formatMZN(props.row.opening_balance) }}
            </q-td>
            <q-td key="total_in" :props="props" class="text-right text-positive text-weight-medium" style="font-size: 12px">
              {{ formatMZN(props.row.total_in) }}
            </q-td>
            <q-td key="total_out" :props="props" class="text-right text-negative text-weight-medium" style="font-size: 12px">
              {{ formatMZN(props.row.total_out) }}
            </q-td>
            <q-td key="calculated" :props="props" class="text-right text-primary text-weight-medium" style="font-size: 12px">
              {{ formatMZN(props.row.closing_balance_calculated ?? calculatedBalance(props.row)) }}
            </q-td>
            <q-td key="closing_balance_informed" :props="props" class="text-right" style="font-size: 12px">
              {{ props.row.closing_balance_informed != null ? formatMZN(props.row.closing_balance_informed) : '—' }}
            </q-td>

            <!-- Divergência: chip verde/vermelho/âmbar -->
            <q-td key="difference" :props="props" class="text-center">
              <q-chip
                v-if="props.row.status === 'FECHADO' && props.row.difference != null"
                :color="differenceColor(props.row.difference)"
                text-color="white"
                dense
                style="font-size: 11px"
              >
                {{ formatMZN(props.row.difference) }}
              </q-chip>
              <q-badge v-else-if="props.row.status === 'ABERTO'" outline color="grey-6" label="em curso" style="font-size: 10px" />
              <span v-else class="text-grey-5">—</span>
            </q-td>

            <!-- Botão expandir -->
            <q-td key="expand" :props="props" class="text-center">
              <q-btn
                flat
                round
                dense
                size="sm"
                :icon="expandedId === props.row.id ? 'expand_less' : 'expand_more'"
                @click.stop="toggleExpand(props.row)"
              >
                <q-tooltip>{{ expandedId === props.row.id ? 'Esconder movimentos' : `Ver ${props.row.movementCount} movimento(s)` }}</q-tooltip>
              </q-btn>
            </q-td>
          </q-tr>

          <!-- ── Linha expandida: movimentos do caixa ── -->
          <q-tr v-if="expandedId === props.row.id" class="expanded-row">
            <q-td colspan="10" class="expanded-cell">
              <div v-if="expandedLoading" class="text-center q-pa-sm">
                <q-spinner-dots size="24px" color="primary" />
              </div>
              <div v-else-if="expandedMovements !== null && expandedMovements.length === 0" class="text-caption text-grey-6 text-center q-pa-sm">
                Sem movimentos neste caixa.
              </div>
              <q-list v-else-if="expandedMovements !== null" dense separator>
                <q-item v-for="movement in expandedMovements" :key="movement.id">
                  <q-item-section avatar>
                    <q-badge :color="movement.type === 'ENTRADA' ? 'positive' : 'negative'" style="font-size: 10px">
                      {{ movement.type === 'ENTRADA' ? 'ENTRADA' : 'SAÍDA' }}
                    </q-badge>
                  </q-item-section>
                  <q-item-section avatar>
                    <q-chip :color="categoryColor(movement.category)" text-color="white" dense style="font-size: 10px">
                      {{ categoryLabel(movement.category) }}
                    </q-chip>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label style="font-size: 12px">{{ movement.description }}</q-item-label>
                    <q-item-label caption style="font-size: 10px">
                      {{ formatDay(movement.createdAt) }} às {{ formatTime(movement.createdAt) }}
                      {{ movement.isAutomatic ? ' · automático' : ' · manual' }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <span
                      class="text-weight-bold"
                      :class="movement.type === 'ENTRADA' ? 'text-positive' : 'text-negative'"
                      style="font-size: 12px"
                    >
                      {{ movement.type === 'ENTRADA' ? '+' : '−' }} {{ formatMZN(movement.amount) }}
                    </span>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'

/**
 * HISTÓRICO / AUDITORIA DO CAIXA — caixas passados com divergências de fecho.
 * Filtrável por intervalo de datas; cada linha expande para mostrar os
 * movimentos daquele dia (GET /api/cash-registers/:id/movements).
 */
const $q = useQuasar()

// ─── Estado ───
const loading = ref(false)
const registers = ref([])
const dateFrom = ref('')
const dateTo = ref('')

// Expansão de linhas (um caixa de cada vez)
const expandedId = ref(null)
const expandedMovements = ref(null)
const expandedLoading = ref(false)

const isFiltering = computed(() => !!dateFrom.value || !!dateTo.value)

// ─── Formatação ───
function formatMZN(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MZN'
}

// date-fns (dependência existente no projecto)
import { format, parseISO } from 'date-fns'

function formatDay(value) {
  if (!value) return '—'
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd/MM/yyyy')
  } catch { return String(value).slice(0, 10) }
}

function formatTime(value) {
  if (!value) return '—'
  try {
    return format(new Date(value), 'HH:mm')
  } catch { return '—' }
}

// ─── Categorias (igual à CaixaPage) ───
const categoryMeta = {
  DESEMBOLSO:   { label: 'Desembolso',   color: 'deep-orange' },
  REEMBOLSO:    { label: 'Reembolso',    color: 'green' },
  JUROS_MORA:   { label: 'Juros Mora',   color: 'amber-8' },
  TAXA_ADMIN:   { label: 'Taxa Admin',   color: 'blue-grey' },
  INTERNET:     { label: 'Internet',     color: 'indigo' },
  LUZ:          { label: 'Luz',          color: 'orange' },
  AGUA:         { label: 'Água',         color: 'light-blue' },
  COMBUSTIVEL:  { label: 'Combustível',  color: 'brown' },
  RENTABILIDADE:{ label: 'Rentabilidade',color: 'teal' },
  SALARIOS:     { label: 'Salários',     color: 'purple' },
  REUNIAO:      { label: 'Reunião',      color: 'pink' },
  TRANSPORTE:   { label: 'Transporte',   color: 'cyan-8' },
  OUTROS:       { label: 'Outros',       color: 'grey' }
}

function categoryLabel(category) {
  return categoryMeta[category]?.label || category
}

function categoryColor(category) {
  return categoryMeta[category]?.color || 'grey'
}

// ─── Divergência ───
// |diff| < 0.01 → quadrado (verde); negativa → falta dinheiro (vermelho);
// positiva → sobra (âmbar — também exige atenção).
function differenceColor(difference) {
  const diff = Number(difference) || 0
  if (Math.abs(diff) < 0.01) return 'green'
  return diff < 0 ? 'red' : 'amber-8'
}

// Saldo calculado de caixas antigos sem o campo preenchido (fallback)
function calculatedBalance(row) {
  return Math.round(
    ((Number(row.opening_balance) || 0) +
     (Number(row.total_in) || 0) -
     (Number(row.total_out) || 0)) * 100
  ) / 100
}

const periodDifference = computed(() =>
  registers.value.reduce((acc, r) => acc + (Number(r.difference) || 0), 0)
)

const periodDifferenceColor = computed(() =>
  Math.abs(periodDifference.value) < 0.01 ? 'grey-7' : differenceColor(periodDifference.value)
)

// ─── API ───
async function fetchHistory() {
  loading.value = true
  try {
    const params = {}
    if (dateFrom.value) params.from = dateFrom.value
    if (dateTo.value) params.to = dateTo.value
    const { data } = await api.get('/api/cash-registers/history', { params })
    registers.value = (data?.success && Array.isArray(data.result)) ? data.result : []
    // Filtro mudou → fechar linha expandida (ids podem não existir mais)
    closeExpanded()
  } catch (error) {
    console.error('Erro ao carregar histórico de caixas:', error)
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar histórico', position: 'top' })
    registers.value = []
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  dateFrom.value = ''
  dateTo.value = ''
  fetchHistory()
}

// ─── Expansão de linha ───
async function toggleExpand(row) {
  if (expandedId.value === row.id) {
    closeExpanded()
    return
  }
  expandedId.value = row.id
  expandedMovements.value = null
  expandedLoading.value = true
  try {
    const { data } = await api.get(`/api/cash-registers/${row.id}/movements`)
    expandedMovements.value = (data?.success && Array.isArray(data.result)) ? data.result : []
  } catch (error) {
    console.error('Erro ao carregar movimentos do caixa:', error)
    $q.notify({ type: 'negative', message: 'Erro ao carregar movimentos', position: 'top' })
    expandedMovements.value = []
  } finally {
    expandedLoading.value = false
  }
}

function closeExpanded() {
  expandedId.value = null
  expandedMovements.value = null
}

// ─── Tabela ───
const pagination = ref({ page: 1, rowsPerPage: 25 })
const columns = [
  { name: 'opening_date', label: 'Dia', field: 'opening_date', align: 'center', sortable: true },
  { name: 'userName', label: 'Responsável', field: 'userName', align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'opening_balance', label: 'Saldo Inicial', field: 'opening_balance', align: 'right', sortable: true },
  { name: 'total_in', label: 'Entradas', field: 'total_in', align: 'right', sortable: true },
  { name: 'total_out', label: 'Saídas', field: 'total_out', align: 'right', sortable: true },
  { name: 'calculated', label: 'Saldo Calculado', field: 'closing_balance_calculated', align: 'right', sortable: true },
  { name: 'closing_balance_informed', label: 'Valor Contado', field: 'closing_balance_informed', align: 'right', sortable: true },
  { name: 'difference', label: 'Divergência', field: 'difference', align: 'center', sortable: true },
  { name: 'expand', label: '', field: () => '', align: 'center' }
]

// ─── Mount ───
onMounted(() => {
  fetchHistory()
})
</script>

<style lang="scss" scoped>
.caixa-historico-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}
body.body--dark .caixa-historico-page {
  background: #1a1a2e;
}

.historico-table {
  :deep(.q-table thead th) {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: $grey-6;
    background-color: $grey-1;
  }
  :deep(.q-table tbody td) {
    font-size: 12px;
    padding: 6px 8px;
  }
  :deep(.q-table tbody tr:hover) {
    background-color: $grey-2;
  }
}

.expanded-cell {
  background: #fafbfc;
  padding: 8px 16px;
}
body.body--dark .expanded-cell {
  background: rgba(255, 255, 255, 0.03);
}

/* Linha expandida sem hover da linha normal */
.historico-table :deep(.expanded-row:hover) {
  background: transparent;
}
</style>
