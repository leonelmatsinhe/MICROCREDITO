<template>
  <div class="q-pa-md caixa-page">
    <!-- ═══════════ CARREGAMENTO ═══════════ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar caixa do dia...</div>
    </div>

    <template v-else>
      <!-- ═══════════ SEM CAIXA HOJE: BANNER + BOTÃO ABRIR ═══════════ -->
      <q-card v-if="!register" flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section class="text-center q-pa-xl">
          <q-icon name="account_balance_wallet" size="64px" color="grey-5" />
          <div class="text-h6 q-mt-md">Nenhum caixa aberto hoje</div>
          <div class="text-caption text-grey-6 q-mb-lg">
            Abra o caixa do dia para registar desembolsos, pagamentos e despesas.
          </div>
          <q-btn
            color="primary"
            size="lg"
            no-caps
            unelevated
            icon="point_of_sale"
            label="Abrir Caixa do Dia"
            :loading="saving"
            @click="openOpenDialog"
          />
        </q-card-section>
      </q-card>

      <template v-else>
        <!-- ═══════════ CABEÇALHO: STATUS DO CAIXA ═══════════ -->
        <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
          <q-card-section class="row items-center q-py-md">
            <q-icon
              :name="isOpen ? 'lock_open' : 'lock'"
              :color="isOpen ? 'positive' : 'grey-6'"
              size="28px"
              class="q-mr-sm"
            />
            <div class="col">
              <div class="text-subtitle1 text-weight-bold">
                Caixa de {{ formatDay(register.opening_date) }}
                <q-badge :color="isOpen ? 'positive' : 'grey'" class="q-ml-sm" align="middle">
                  {{ isOpen ? 'ABERTO' : 'FECHADO' }}
                </q-badge>
              </div>
              <div class="text-caption text-grey-6">
                Aberto às {{ formatTime(register.createdAt) }}
                <template v-if="!isOpen"> · Fechado às {{ formatTime(register.closed_at) }}</template>
              </div>
            </div>

            <!-- ═══ CONTADOR AO VIVO: dinheiro físico na gaveta ═══ -->
            <div
              class="drawer-counter gt-xs q-mr-md"
              :class="{ 'drawer-closed': !isOpen, 'flash-up': flash === 'up', 'flash-down': flash === 'down' }"
            >
              <div class="text-caption text-grey-6" style="font-size: 10px; line-height: 1.2">
                <q-icon name="account_balance_wallet" size="12px" class="q-mr-xs" />Dinheiro em caixa
              </div>
              <div class="text-weight-bolder" style="font-size: 21px; line-height: 1.15; font-variant-numeric: tabular-nums">
                {{ formatMZN(displayCash) }}
              </div>
            </div>

            <div class="row q-gutter-sm no-wrap">
              <q-btn
                flat
                no-caps
                icon="picture_as_pdf"
                label="PDF"
                :disable="movements.length === 0"
                @click="exportPDF"
              >
                <q-tooltip>Resumo do dia em PDF</q-tooltip>
              </q-btn>
              <q-btn
                flat
                no-caps
                icon="history"
                label="Histórico"
                @click="$router.push('/caixa/historico')"
              >
                <q-tooltip>Histórico e auditoria de caixas</q-tooltip>
              </q-btn>
              <q-btn
                v-if="isOpen"
                color="negative"
                outline
                no-caps
                icon="lock"
                label="Fechar Caixa"
                @click="openCloseDialog"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- ═══════════ 4 CARDS DE RESUMO (entradas/saídas já em MZN formatado) ═══════════ -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered style="border-radius: 12px">
              <q-card-section>
                <div class="text-caption text-grey-6">Saldo Inicial (fundo de troco)</div>
                <div class="text-h6 text-weight-bold" style="font-size: 19px">{{ formatMZN(register.opening_balance) }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered style="border-radius: 12px">
              <q-card-section>
                <div class="text-caption text-grey-6">Total Entradas</div>
                <div class="text-h6 text-weight-bold text-positive" style="font-size: 19px">{{ formatMZN(register.total_in) }}</div>
                <div class="text-caption text-grey-5" style="font-size: 10px">
                  {{ formatMZN(register.total_cash_in) }} em dinheiro · {{ formatMZN(register.total_bank_in) }} electrónico
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered style="border-radius: 12px">
              <q-card-section>
                <div class="text-caption text-grey-6">Total Saídas</div>
                <div class="text-h6 text-weight-bold text-negative" style="font-size: 19px">{{ formatMZN(register.total_out) }}</div>
                <div class="text-caption text-grey-5" style="font-size: 10px">
                  {{ formatMZN(register.total_cash_out) }} em dinheiro · {{ formatMZN(register.total_bank_out) }} electrónico
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered style="border-radius: 12px">
              <q-card-section>
                <div class="text-caption text-grey-6">Saldo Atual (consolidado)</div>
                <div class="text-h6 text-weight-bold text-primary" style="font-size: 19px">{{ formatMZN(currentBalance) }}</div>
                <div class="text-caption text-grey-5" style="font-size: 10px">
                  Em dinheiro físico: <strong class="text-grey-7">{{ formatMZN(cashBalance) }}</strong>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- ═══════════ RESULTADO DO FECHO (caixa fechado) ═══════════ -->
        <q-banner
          v-if="!isOpen"
          rounded
          class="q-mb-md bg-grey-2"
          style="border-radius: 10px"
        >
          <template v-slot:avatar>
            <q-icon :name="Math.abs(Number(register.difference)) < 0.01 ? 'check_circle' : 'warning'" :color="Math.abs(Number(register.difference)) < 0.01 ? 'positive' : 'warning'" />
          </template>
          <span class="text-body2">
            Valor contado: <strong>{{ formatMZN(register.closing_balance_informed) }}</strong> ·
            Valor calculado: <strong>{{ formatMZN(register.closing_balance_calculated) }}</strong> ·
            Divergência:
            <strong :class="Math.abs(Number(register.difference)) < 0.01 ? 'text-positive' : 'text-negative'">
              {{ formatMZN(register.difference) }}
            </strong>
          </span>
        </q-banner>

        <!-- ═══════════ AÇÕES + TABELA DE MOVIMENTOS ═══════════ -->
        <q-card flat bordered style="border-radius: 12px; overflow: hidden">
          <q-card-section class="row items-center q-py-sm">
            <div class="col text-subtitle2 text-weight-bold">Movimentos do Dia</div>
            <template v-if="isOpen">
              <q-btn
                outline
                color="positive"
                no-caps
                icon="add_circle"
                label="Nova Entrada"
                size="sm"
                class="q-mr-sm"
                @click="openMovementDialog('ENTRADA')"
              />
              <q-btn
                outline
                color="negative"
                no-caps
                icon="remove_circle"
                label="Nova Saída"
                size="sm"
                @click="openMovementDialog('SAIDA')"
              />
            </template>
          </q-card-section>

          <q-table
            :rows="movements"
            :columns="columns"
            row-key="id"
            flat
            bordered
            dense
            separator="horizontal"
            :rows-per-page-options="[10, 25, 50]"
            v-model:pagination="pagination"
            :loading="loadingMovements"
            no-data-label="Sem movimentos registados hoje."
          >
            <!-- Hora -->
            <template v-slot:body-cell-time="props">
              <q-td :props="props" class="text-center">
                {{ formatTime(props.row.createdAt) }}
              </q-td>
            </template>

            <!-- Categoria (chip colorido) -->
            <template v-slot:body-cell-category="props">
              <q-td :props="props" class="text-center">
                <q-chip :color="categoryColor(props.row.category)" text-color="white" dense style="font-size: 10px">
                  {{ categoryLabel(props.row.category) }}
                </q-chip>
                <q-badge v-if="props.row.isAutomatic" outline color="grey-6" label="auto" style="font-size: 9px; margin-left: 4px" />
              </q-td>
            </template>

            <!-- Valor -->
            <template v-slot:body-cell-amount="props">
              <q-td :props="props" class="text-right">
                <span
                  class="text-weight-bold"
                  :class="props.row.type === 'ENTRADA' ? 'text-positive' : 'text-negative'"
                >
                  {{ props.row.type === 'ENTRADA' ? '+' : '−' }} {{ formatMZN(props.row.amount) }}
                </span>
              </q-td>
            </template>

            <!-- Tipo -->
            <template v-slot:body-cell-type="props">
              <q-td :props="props" class="text-center">
                <q-badge :color="props.row.type === 'ENTRADA' ? 'positive' : 'negative'" style="font-size: 10px">
                  {{ props.row.type }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </template>
    </template>

    <!-- ═══════════ DIALOG: ABRIR CAIXA ═══════════ -->
    <q-dialog v-model="openDialog" persistent>
      <q-card style="min-width: 380px; border-radius: 12px">
        <q-card-section class="text-h6">Abrir Caixa do Dia</q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model.number="openForm.opening_balance"
            type="number"
            outlined
            dense
            label="Saldo inicial (fundo de troco) *"
            prefix="MZN"
            :rules="[v => (v !== null && v !== '' && v >= 0) || 'Informe um saldo inicial >= 0']"
            autofocus
          />
          <div v-if="suggestionLabel" class="text-caption text-primary q-mt-xs">
            <q-icon name="lightbulb" size="13px" class="q-mr-xs" />{{ suggestionLabel }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Abrir Caixa"
            :loading="saving"
            @click="submitOpen"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: NOVO MOVIMENTO ═══════════ -->
    <q-dialog v-model="movementDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px">
        <q-card-section class="text-h6">
          {{ movementForm.type === 'ENTRADA' ? 'Nova Entrada' : 'Nova Saída' }}
        </q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-none">
          <q-select
            v-model="movementForm.category"
            :options="manualCategoryOptions"
            outlined
            dense
            emit-value
            map-options
            label="Categoria *"
            :rules="[v => !!v || 'Seleccione a categoria']"
          />
          <q-input
            v-model.number="movementForm.amount"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Valor *"
            :rules="[v => (v !== null && v !== '' && v > 0) || 'Informe um valor maior que zero']"
          />
          <q-input
            v-model="movementForm.description"
            outlined
            dense
            type="textarea"
            rows="2"
            label="Descrição *"
            hint="Ex.: Internet mensal do escritório"
            :rules="[v => !!(v && v.trim().length >= 3) || 'A descrição é obrigatória (mín. 3 caracteres)']"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn
            unelevated
            no-caps
            :color="movementForm.type === 'ENTRADA' ? 'positive' : 'negative'"
            :label="movementForm.type === 'ENTRADA' ? 'Registar Entrada' : 'Registar Saída'"
            :loading="saving"
            @click="submitMovement"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══════════ DIALOG: FECHAR CAIXA (divergência em tempo real) ═══════════ -->
    <q-dialog v-model="closeDialog" persistent>
      <q-card style="min-width: 420px; border-radius: 12px">
        <q-card-section class="text-h6">Fechar Caixa</q-card-section>
        <q-card-section class="q-pt-none">
          <div class="q-pa-sm rounded-borders bg-blue-1 q-mb-sm">
            <div class="text-caption text-grey-8">
              <q-icon name="info" size="14px" class="q-mr-xs" />
              Conte apenas o <strong>dinheiro físico na gaveta</strong> — o sistema já sabe o que está nas contas bancárias.
            </div>
            <div class="row q-mt-xs q-gutter-md">
              <div>
                <div class="text-caption text-grey-6" style="font-size: 10px">Calculado pelo sistema (cash)</div>
                <div class="text-weight-bold text-primary">{{ formatMZN(cashBalance) }}</div>
              </div>
              <div>
                <div class="text-caption text-grey-6" style="font-size: 10px">Movimento electrónico do dia</div>
                <div class="text-weight-bold text-grey-8">{{ formatMZN(electronicBalance) }}</div>
              </div>
              <div>
                <div class="text-caption text-grey-6" style="font-size: 10px">Saldo consolidado</div>
                <div class="text-weight-bold text-grey-8">{{ formatMZN(currentBalance) }}</div>
              </div>
            </div>
          </div>
          <q-input
            v-model.number="closeForm.closing_balance_informed"
            type="number"
            outlined
            dense
            prefix="MZN"
            label="Valor contado em dinheiro físico *"
            :rules="[v => (v !== null && v !== '' && v >= 0) || 'Informe o valor contado >= 0']"
            autofocus
          />

          <!-- Divergência calculada em tempo real -->
          <div
            v-if="closeForm.closing_balance_informed !== null && closeForm.closing_balance_informed !== ''"
            class="q-mt-md q-pa-sm rounded-borders"
            :class="liveDifferenceClass"
          >
            <div class="text-caption">Divergência (contado − calculado):</div>
            <div class="text-h6 text-weight-bold">{{ formatMZN(liveDifference) }}</div>
            <div class="text-caption">{{ liveDifferenceLabel }}</div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" :disable="saving" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="negative"
            icon="lock"
            label="Fechar Caixa"
            :loading="saving"
            :disable="closeForm.closing_balance_informed === null || closeForm.closing_balance_informed === ''"
            @click="submitClose"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { format, parseISO } from 'date-fns'

/**
 * CAIXA DIÁRIO — página isolada do fluxo de caixa.
 * Status → resumo (4 cards) → movimentos → fecho com divergência em tempo real.
 */
const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

// ─── Estado ───
const loading = ref(false)
const saving = ref(false)
const loadingMovements = ref(false)
const register = ref(null)      // caixa de hoje (aberto ou fechado)
const movements = ref([])

const isOpen = computed(() => !!register.value && register.value.status === 'ABERTO')

// Saldo actual = saldo inicial + entradas − saídas (espelha o cálculo do backend)
const currentBalance = computed(() => {
  if (!register.value) return 0
  return round2(
    (Number(register.value.opening_balance) || 0) +
    (Number(register.value.total_in) || 0) -
    (Number(register.value.total_out) || 0)
  )
})

// Saldo em DINHEIRO FÍSICO (gaveta) = inicial + entradas cash − saídas cash.
// É este o valor que deve bater certo com a contagem no fecho do caixa —
// as entradas electrónicas (M-Pesa/transferência) nunca passam pela gaveta.
const cashBalance = computed(() => {
  if (!register.value) return 0
  return round2(
    (Number(register.value.opening_balance) || 0) +
    (Number(register.value.total_cash_in) || 0) -
    (Number(register.value.total_cash_out) || 0)
  )
})

// Movimento electrónico do dia (entradas − saídas bancárias/móveis).
const electronicBalance = computed(() => {
  if (!register.value) return 0
  return round2(
    (Number(register.value.total_bank_in) || 0) -
    (Number(register.value.total_bank_out) || 0)
  )
})

// ─── Contador ao vivo da gaveta ───
// displayCash anima de suave até cashBalance sempre que um movimento muda o
// saldo (fetchToday após cada registo); flash dá feedback verde/vermelho.
const displayCash = ref(0)
const flash = ref(null) // 'up' | 'down' | null
let flashTimer = null
let animFrame = null

watch(cashBalance, (target, prev) => {
  // Flash direccional: verde quando sobe (entrada), vermelho quando desce.
  flash.value = target > prev ? 'up' : 'down'
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flash.value = null }, 1100)

  // Animação de contagem (ease-out cúbico, ~600 ms) até ao novo valor.
  const from = Number(displayCash.value) || 0
  const start = performance.now()
  const duration = 600
  if (animFrame) cancelAnimationFrame(animFrame)
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    displayCash.value = from + (target - from) * eased
    if (t < 1) {
      animFrame = requestAnimationFrame(tick)
    } else {
      displayCash.value = target
    }
  }
  animFrame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (flashTimer) clearTimeout(flashTimer)
  if (animFrame) cancelAnimationFrame(animFrame)
})

// ─── Formatação ───
const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100

// Formatação MZN exigida: valor.toLocaleString('pt-MZ') + ' MZN'
function formatMZN(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MZN'
}

// date-fns para datas (dependência já existente no projecto)

function formatDay(dateStr) {
  try {
    return format(parseISO(String(dateStr).slice(0, 10)), 'dd/MM/yyyy')
  } catch { return dateStr }
}

function formatTime(value) {
  if (!value) return '—'
  try {
    return format(new Date(value), 'HH:mm')
  } catch { return '—' }
}

// ─── Categorias ───
// Automáticas (só sistema): DESEMBOLSO, REEMBOLSO, JUROS_MORA, TAXA_ADMIN
// Manuais: despesas correntes do escritório
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

// Categorias disponíveis para movimentos manuais (exclui as automáticas)
const AUTOMATIC_CATEGORIES = ['DESEMBOLSO', 'REEMBOLSO', 'JUROS_MORA', 'TAXA_ADMIN']
const manualCategoryOptions = Object.entries(categoryMeta)
  .filter(([key]) => !AUTOMATIC_CATEGORIES.includes(key))
  .map(([value, meta]) => ({ label: meta.label, value }))

// ─── Tabela ───
const pagination = ref({ page: 1, rowsPerPage: 25 })
const columns = [
  { name: 'time', label: 'Hora', field: 'createdAt', align: 'center', sortable: true },
  { name: 'category', label: 'Categoria', field: 'category', align: 'center' },
  { name: 'description', label: 'Descrição', field: 'description', align: 'left' },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right', sortable: true },
  { name: 'type', label: 'Tipo', field: 'type', align: 'center' }
]

// ─── API ───
async function fetchToday() {
  loading.value = true
  try {
    const { data } = await api.get('/api/cash-registers/today')
    if (data.success) {
      register.value = data.result.register
      movements.value = data.result.register?.movements || []
    }
  } catch (error) {
    console.error('Erro ao carregar caixa de hoje:', error)
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar caixa', position: 'top' })
  } finally {
    loading.value = false
  }
}

// ─── Dialog: abrir caixa ───
const openDialog = ref(false)
const openForm = ref({ opening_balance: null })
// Sugestão de saldo inicial: valor CONTADO em dinheiro no último fecho do
// utilizador (o que estava mesmo na gaveta vira o fundo de troco de hoje).
const openingSuggestion = ref({ suggested: 0, source: '', previousDate: null })

// Texto amigável da origem da sugestão (transparência de auditoria)
const suggestionLabel = computed(() => {
  const s = openingSuggestion.value
  if (!s || !s.source || s.source === 'primeiro-dia') return ''
  const day = s.previousDate ? formatDay(s.previousDate) : ''
  switch (s.source) {
    case 'contado-anterior':
      return `Sugerido: valor contado no fecho de ${day}`
    case 'contado-outro-operador':
      return `Sugerido: contado no fecho de ${day} (outro operador)`
    case 'calculado-anterior':
      return `Sugerido: saldo calculado do fecho de ${day}`
    case 'calculado-outro-operador':
      return `Sugerido: saldo do fecho de ${day} (outro operador)`
    default:
      return ''
  }
})

/** Busca a sugestão ao abrir o dialog. Falha silenciosa — nunca bloqueia. */
async function fetchOpeningSuggestion() {
  try {
    const { data } = await api.get('/api/cash-registers/opening-balance-suggestion')
    if (data?.success && data.result) {
      openingSuggestion.value = data.result
      // Pré-preenche com o valor contado no fecho anterior (0 no primeiro dia).
      openForm.value.opening_balance = Number(data.result.suggested) || 0
    }
  } catch {
    // silencioso — campo fica vazio para preenchimento manual
  }
}

function openOpenDialog() {
  openForm.value = { opening_balance: null }
  openingSuggestion.value = { suggested: 0, source: '', previousDate: null }
  openDialog.value = true
  fetchOpeningSuggestion()
}

async function submitOpen() {
  if (openForm.value.opening_balance === null || openForm.value.opening_balance === '') {
    $q.notify({ type: 'warning', message: 'Informe o saldo inicial', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post('/api/cash-registers/open', {
      opening_balance: openForm.value.opening_balance
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: 'Caixa aberto com sucesso!', position: 'top' })
      openDialog.value = false
      await fetchToday()
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao abrir caixa', position: 'top' })
  } finally {
    saving.value = false
  }
}

// ─── Dialog: novo movimento ───
const movementDialog = ref(false)
const movementForm = ref({ type: 'ENTRADA', category: null, amount: null, description: '' })

function openMovementDialog(type) {
  movementForm.value = { type, category: null, amount: null, description: '' }
  movementDialog.value = true
}

async function submitMovement() {
  const form = movementForm.value
  if (!form.category || !form.amount || form.amount <= 0 || !form.description?.trim()) {
    $q.notify({ type: 'warning', message: 'Preencha categoria, valor e descrição', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post(`/api/cash-registers/${register.value.id}/movements`, {
      type: form.type,
      category: form.category,
      amount: form.amount,
      description: form.description.trim()
    })
    if (data.success) {
      $q.notify({ type: 'positive', message: 'Movimento registado!', position: 'top' })
      movementDialog.value = false
      await fetchToday()
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao registar movimento', position: 'top' })
  } finally {
    saving.value = false
  }
}

// ─── Dialog: fechar caixa (divergência em tempo real) ───
const closeDialog = ref(false)
const closeForm = ref({ closing_balance_informed: null, notes: '' })

function openCloseDialog() {
  closeForm.value = { closing_balance_informed: null, notes: '' }
  closeDialog.value = true
}

// Divergência comparada contra o saldo em DINHEIRO FÍSICO (a gaveta é o que se
// conta no fecho; o electrónico fica nas contas bancárias da empresa).
const liveDifference = computed(() => {
  const informed = Number(closeForm.value.closing_balance_informed)
  if (!Number.isFinite(informed)) return 0
  return round2(informed - cashBalance.value)
})

const liveDifferenceClass = computed(() =>
  Math.abs(liveDifference.value) < 0.01 ? 'bg-green-1 text-green-9' : 'bg-amber-2 text-amber-10'
)

const liveDifferenceLabel = computed(() => {
  const diff = liveDifference.value
  if (Math.abs(diff) < 0.01) return 'Caixa fechado sem divergência.'
  return diff > 0
    ? `Excedente de ${formatMZN(diff)} — verifique se algum movimento falta registar.`
    : `Faltam ${formatMZN(Math.abs(diff))} em caixa — confirme o valor contado.`
})

async function submitClose() {
  const informed = Number(closeForm.value.closing_balance_informed)
  if (!Number.isFinite(informed) || informed < 0) {
    $q.notify({ type: 'warning', message: 'Informe o valor contado em caixa', position: 'top' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post(`/api/cash-registers/${register.value.id}/close`, {
      closing_balance_informed: informed,
      notes: closeForm.value.notes || undefined
    })
    if (data.success) {
      const diff = Number(data.result?.difference) || 0
      $q.notify({
        type: Math.abs(diff) < 0.01 ? 'positive' : 'warning',
        message: Math.abs(diff) < 0.01
          ? 'Caixa fechado sem divergência!'
          : `Caixa fechado. Divergência: ${formatMZN(diff)}`,
        position: 'top',
        timeout: 5000
      })
      closeDialog.value = false
      await fetchToday()
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao fechar caixa', position: 'top' })
  } finally {
    saving.value = false
  }
}

// ==================== EXPORTAÇÃO PDF ====================
// Resumo do dia: cabeçalho da empresa, quadro de totais com divergência e
// lista completa de movimentos. Segue o padrão pdfmake da PaymentsPage.
function moneyRaw(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

async function exportPDF() {
  if (movements.value.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há movimentos para exportar', position: 'top' })
    return
  }
  try {
    // Garantir dados da empresa para o cabeçalho
    const companyId = authStore.companyId
    if (companyId && !companyStore.hasCompany) {
      await companyStore.fetchCompany(companyId).catch(() => {})
    }

    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    const { buildCompanyHeader, companyLogoBase64, commonStyles, tableLayout } = await import('@/utils/pdfHeader')
    const company = companyStore.company || {}
    const logoBase64 = await companyLogoBase64(company)

    const reg = register.value
    const dayLabel = formatDay(reg.opening_date)
    const isBalanced = Math.abs(Number(reg.difference ?? 0)) < 0.01 && reg.status === 'FECHADO'

    // ── Quadro de resumo (2 colunas: rótulo / valor) ──
    // Separação CASH vs BANK no PDF: o fecho audita o dinheiro físico;
    // o electrónico fica nas contas bancárias (total_bank_in/out).
    const summaryRows = [
      ['Estado do caixa', reg.status === 'ABERTO' ? 'ABERTO' : 'FECHADO'],
      ['Responsável', authStore.userName || '—'],
      ['Saldo inicial (fundo de troco)', moneyRaw(reg.opening_balance) + ' MZN'],
      ['Total entradas (cash + electrónico)', moneyRaw(reg.total_in) + ' MZN'],
      ['Total saídas (cash + electrónico)', moneyRaw(reg.total_out) + ' MZN'],
      ['— Entradas em dinheiro físico', moneyRaw(reg.total_cash_in) + ' MZN'],
      ['— Entradas electrónico (M-Pesa/banco)', moneyRaw(reg.total_bank_in) + ' MZN'],
      ['— Saídas em dinheiro físico', moneyRaw(reg.total_cash_out) + ' MZN'],
      ['— Saídas electrónico (M-Pesa/banco)', moneyRaw(reg.total_bank_out) + ' MZN'],
      ['Saldo consolidado (inicial + entradas − saídas)', moneyRaw(currentBalance.value) + ' MZN'],
      ['Saldo em dinheiro físico (gaveta)', moneyRaw(cashBalance.value) + ' MZN'],
      reg.status === 'FECHADO'
        ? ['Valor contado em caixa (dinheiro físico)', moneyRaw(reg.closing_balance_informed) + ' MZN']
        : null,
      reg.status === 'FECHADO'
        ? ['Divergência (contado − calculado cash)', moneyRaw(reg.difference) + ' MZN' + (isBalanced ? '  ✓ sem divergência' : '  ⚠ ATENÇÃO')]
        : null
    ].filter(Boolean)

    const summaryTable = {
      table: {
        widths: ['*', 'auto'],
        body: summaryRows.map(([label, value]) => ([
          { text: label, style: 'cellText' },
          { text: value, style: 'cellRightBold' }
        ]))
      },
      layout: 'grid',
      margin: [0, 0, 0, 14]
    }

    // ── Tabela de movimentos ──
    const movementHeader = [
      { text: 'Hora', style: 'tableHeader' },
      { text: 'Categoria', style: 'tableHeader' },
      { text: 'Descrição', style: 'tableHeader' },
      { text: 'Origem', style: 'tableHeader' },
      { text: 'Valor', style: 'tableHeader' }
    ]
    const movementRows = movements.value.map(m => ([
      { text: formatTime(m.createdAt), style: 'cellCenter' },
      { text: categoryLabel(m.category), style: 'cellCenter' },
      { text: m.description || '—', style: 'cellText' },
      { text: m.isAutomatic ? 'Automático' : 'Manual', style: 'cellCenter' },
      {
        text: (m.type === 'ENTRADA' ? '+ ' : '− ') + moneyRaw(m.amount) + ' MZN',
        style: m.type === 'ENTRADA' ? 'inPositive' : 'inNegative'
      }
    ]))

    // Linha de totais: entradas/saídas do dia
    const totalRow = [
      { text: 'TOTAIS', colSpan: 4, style: 'totalCell' },
      { text: '', style: 'totalCell' },
      { text: '', style: 'totalCell' },
      { text: '', style: 'totalCell' },
      {
        text: `+ ${moneyRaw(reg.total_in)} / − ${moneyRaw(reg.total_out)} MZN`,
        style: 'totalCellRight'
      }
    ]

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [24, 20, 24, 30],
      content: [
        ...buildCompanyHeader(company, logoBase64, `Caixa do Dia — ${dayLabel}`),
        {
          text: `${movements.value.length} movimento(s) registado(s)` +
            (reg.status === 'FECHADO' ? ` · caixa encerrado às ${formatTime(reg.closed_at)}` : ' · caixa em curso'),
          fontSize: 8,
          color: '#444',
          margin: [0, 0, 0, 8]
        },
        summaryTable,
        {
          text: 'MOVIMENTOS DO DIA',
          fontSize: 10,
          bold: true,
          color: '#1a237e',
          margin: [0, 0, 0, 5]
        },
        {
          table: {
            headerRows: 1,
            widths: [40, 70, '*', 55, 90],
            body: [movementHeader, ...movementRows, totalRow]
          },
          layout: tableLayout,
          fontSize: 7
        }
      ],
      styles: {
        ...commonStyles,
        inPositive: { fontSize: 7, alignment: 'right', bold: true, color: '#2e7d32' },
        inNegative: { fontSize: 7, alignment: 'right', bold: true, color: '#c62828' }
      },
      defaultStyle: { font: 'Roboto' }
    }

    pdfMake.createPdf(docDefinition).download(`caixa-${reg.opening_date}.pdf`)
    $q.notify({ type: 'positive', message: 'PDF gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar PDF do caixa:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF', position: 'top' })
  }
}

// ─── Mount ───
onMounted(() => {
  fetchToday()
})
</script>

<style lang="scss" scoped>
.caixa-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}
body.body--dark .caixa-page {
  background: #1a1a2e;
}

/* Contador ao vivo do dinheiro em gaveta (cabeçalho) */
.drawer-counter {
  padding: 6px 14px;
  border-radius: 10px;
  text-align: right;
  background: rgba(25, 118, 210, 0.06);
  border: 1px solid rgba(25, 118, 210, 0.18);
  transition: background-color 0.3s, box-shadow 0.3s, opacity 0.3s;

  &.drawer-closed {
    opacity: 0.55;
  }
  &.flash-up {
    background: rgba(46, 125, 50, 0.14);
    box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.3);
  }
  &.flash-down {
    background: rgba(198, 40, 40, 0.14);
    box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.3);
  }
}
body.body--dark .drawer-counter {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
}
</style>
