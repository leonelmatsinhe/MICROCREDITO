<template>
  <div class="q-pa-md payments-page">
    <!-- ═══════ BARRA SUPERIOR: TÍTULO & ACÇÃO PRINCIPAL ═══════ -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center no-wrap">
          <q-icon name="payments" size="28px" color="positive" class="q-mr-xs" />
          <span class="text-h6 text-weight-bold text-dark">Recebimentos & Caixa</span>
        </div>
        <div class="text-caption text-grey-7" style="font-size: 11px">
          Terminal de cobrança de prestações, liquidação e emissão de recibos oficiais
        </div>
      </div>

      <!-- BOTÃO PRINCIPAL: RECEBER PAGAMENTO SEM VOLTAS -->
      <div class="row items-center q-gutter-xs">
        <q-btn
          unelevated
          rounded
          no-caps
          color="positive"
          icon="add_circle"
          label="Receber Pagamento"
          class="text-weight-bold shadow-1"
          size="md"
          padding="8px 18px"
          @click="quickPayOpen = true"
          data-tour="payments-quick-btn"
        >
          <q-tooltip>Registar recebimento imediato (M-Pesa, Numerário ou Banco)</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ═══════ COCKPIT DE KPIS FINANCEIROS (4 CARDS) ═══════ -->
    <div class="row q-col-gutter-sm q-mb-md" data-tour="payments-kpis">
      <!-- 1. Total Recebido -->
      <div class="col-12 col-sm-6 col-lg-3">
        <q-card flat class="kpi-mini-card kpi-border-green">
          <q-card-section class="q-pa-sm">
            <div class="row items-center justify-between no-wrap q-mb-xs">
              <span class="kpi-mini-title">Total Recebido (Período)</span>
              <q-avatar size="26px" class="bg-green-1 text-positive" icon="savings" />
            </div>
            <div class="kpi-mini-val text-positive">{{ formatMoney(totalAmount) }}</div>
            <div class="kpi-mini-sub text-grey-6">
              <q-icon name="receipt_long" size="13px" class="q-mr-xs text-positive" />
              <span>{{ filteredRows.length }} {{ filteredRows.length === 1 ? 'pagamento' : 'pagamentos' }}</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 2. Recebimentos Hoje -->
      <div class="col-12 col-sm-6 col-lg-3">
        <q-card flat class="kpi-mini-card kpi-border-blue">
          <q-card-section class="q-pa-sm">
            <div class="row items-center justify-between no-wrap q-mb-xs">
              <span class="kpi-mini-title">Recebimentos de Hoje</span>
              <q-avatar size="26px" class="bg-blue-1 text-blue-9" icon="today" />
            </div>
            <div class="kpi-mini-val text-blue-10">{{ formatMoney(todayTotal) }}</div>
            <div class="kpi-mini-sub text-grey-6">
              <q-icon name="event_available" size="13px" class="q-mr-xs text-blue-7" />
              <span>{{ todayCount }} entrada(s) registada(s) hoje</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 3. Juros de Mora Recuperados -->
      <div class="col-12 col-sm-6 col-lg-3">
        <q-card flat class="kpi-mini-card kpi-border-orange">
          <q-card-section class="q-pa-sm">
            <div class="row items-center justify-between no-wrap q-mb-xs">
              <span class="kpi-mini-title">Juros de Mora Recuperados</span>
              <q-avatar size="26px" class="bg-orange-1 text-orange-9" icon="trending_up" />
            </div>
            <div class="kpi-mini-val text-orange-10">{{ formatMoney(totalLateInterest) }}</div>
            <div class="kpi-mini-sub text-grey-6">
              <q-icon name="gpp_bad" size="13px" class="q-mr-xs text-orange-8" />
              <span>Penalizações arrecadadas</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 4. Mix por Canal de Pagamento -->
      <div class="col-12 col-sm-6 col-lg-3">
        <q-card flat class="kpi-mini-card kpi-border-purple">
          <q-card-section class="q-pa-sm">
            <div class="row items-center justify-between no-wrap q-mb-xs">
              <span class="kpi-mini-title">Canais de Pagamento</span>
              <q-avatar size="26px" class="bg-purple-1 text-purple-9" icon="pie_chart" />
            </div>
            <div class="row items-baseline q-gutter-x-sm">
              <div class="kpi-mini-val text-purple-10">{{ mpesaShare }}%</div>
              <span class="text-caption text-grey-6" style="font-size: 11px">via M-Pesa</span>
            </div>
            <div class="kpi-mini-sub text-grey-6">
              <span>M-Pesa: <strong>{{ formatMoney(mpesaTotal) }}</strong> · Outros: {{ formatMoney(otherTotal) }}</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ═══════ BARRA DE FILTROS MODERNIZADA ═══════ -->
    <q-card flat bordered class="q-mb-md filters-card" style="border-radius: 12px" data-tour="payments-filters">
      <q-card-section class="q-py-sm q-px-md">
        <!-- Linha 1: Atalhos Rápidos de Período -->
        <div class="row items-center justify-between q-col-gutter-xs q-mb-sm">
          <div class="col-auto row items-center q-gutter-xs">
            <span class="text-caption text-grey-7 q-mr-xs text-weight-bold" style="font-size: 11px">Período:</span>
            <q-btn
              v-for="preset in periodPresets"
              :key="preset.value"
              dense
              unelevated
              rounded
              no-caps
              size="sm"
              :color="activePreset === preset.value ? 'positive' : 'grey-2'"
              :text-color="activePreset === preset.value ? 'white' : 'grey-8'"
              :label="preset.label"
              class="q-px-sm"
              @click="applyPreset(preset.value)"
            />
          </div>

          <!-- Botões Exportar PDF / Excel -->
          <div class="col-auto row items-center q-gutter-xs">
            <q-btn
              outline
              color="primary"
              icon="picture_as_pdf"
              label="PDF"
              no-caps
              rounded
              size="sm"
              padding="3px 10px"
              :disable="filteredRows.length === 0"
              @click="exportPDF"
            />
            <q-btn
              outline
              color="teal"
              icon="table_chart"
              label="Excel"
              no-caps
              rounded
              size="sm"
              padding="3px 10px"
              :disable="filteredRows.length === 0"
              @click="exportExcel"
            />
          </div>
        </div>

        <q-separator class="q-my-xs opacity-50" />

        <!-- Linha 2: Campos de Filtro -->
        <div class="row q-col-gutter-sm items-center q-mt-xs">
          <!-- Campo de Busca -->
          <div class="col-12 col-md-4">
            <q-input
              v-model="search"
              dense
              outlined
              placeholder="Pesquisar por mutuário, conta, telefone, referência..."
              clearable
              @clear="resetPage"
              @keyup.enter="resetPage"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" />
              </template>
            </q-input>
          </div>

          <!-- Data Início -->
          <div class="col-6 col-md-2">
            <q-input
              v-model="dateFrom"
              dense
              outlined
              label="Data início"
              type="date"
              input-style="font-size: 12px"
              @update:model-value="onCustomDateChange"
            />
          </div>

          <!-- Data Fim -->
          <div class="col-6 col-md-2">
            <q-input
              v-model="dateTo"
              dense
              outlined
              label="Data fim"
              type="date"
              input-style="font-size: 12px"
              @update:model-value="onCustomDateChange"
            />
          </div>

          <!-- Meio de Pagamento -->
          <div class="col-8 col-md-3">
            <q-select
              v-model="methodFilter"
              dense
              outlined
              label="Canal / Meio de pagamento"
              clearable
              emit-value
              map-options
              :options="methodOptions"
              @update:model-value="resetPage"
            />
          </div>

          <!-- Limpar / Refresh -->
          <div class="col-4 col-md-1 text-right q-gutter-xs no-wrap">
            <q-btn flat round dense icon="filter_list_off" color="grey" size="sm" @click="clearFilters">
              <q-tooltip>Limpar filtros</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="refresh" color="primary" size="sm" :loading="loading" @click="fetchPayments">
              <q-tooltip>Actualizar grelha</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════ CARREGAMENTO / VAZIO / TABELA ═══════ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="44px" color="primary" />
      <div class="text-caption text-grey-6 q-mt-sm">A carregar recebimentos e selos de validação fiscal...</div>
    </div>

    <q-card v-else flat bordered class="table-card" style="border-radius: 12px; overflow: hidden" data-tour="payments-table">
      <q-card-section v-if="filteredRows.length === 0" class="text-center q-pa-xl">
        <q-icon name="payments" size="64px" color="grey-4" />
        <div class="text-h6 text-grey-6 q-mt-md">Nenhum pagamento encontrado</div>
        <div class="text-caption text-grey-5 q-mb-md">
          {{ isFiltering ? 'Ajuste os filtros de período ou pesquisa para ver mais resultados.' : 'Ainda não foram registados recebimentos de prestações.' }}
        </div>
        <q-btn
          unelevated
          rounded
          no-caps
          color="positive"
          icon="add_circle"
          label="Registar Primeiro Pagamento"
          @click="quickPayOpen = true"
        />
      </q-card-section>

      <q-table
        v-else
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        flat
        bordered
        dense
        separator="horizontal"
        :rows-per-page-options="[15, 25, 50, 100]"
        v-model:pagination="pagination"
        class="payments-table"
      >
        <!-- MUTUÁRIO: Avatar + Nome clicável + Conta -->
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="28px" color="green-8" text-color="white" class="q-mr-xs text-weight-bold" style="font-size: 11px">
                {{ (props.row.customerName || 'M').substring(0, 2).toUpperCase() }}
              </q-avatar>
              <div class="col" style="min-width: 0">
                <router-link
                  v-if="props.row.accountNumber"
                  :to="`/mutuarios/${props.row.accountNumber}`"
                  class="text-weight-bold text-dark text-decoration-none hover-link ellipsis block"
                  style="font-size: 12.5px"
                >
                  {{ props.row.customerName }}
                </router-link>
                <div v-else class="text-weight-bold text-dark" style="font-size: 12.5px">
                  {{ props.row.customerName }}
                </div>
                <div class="text-caption text-grey-6" style="font-size: 10px">
                  Conta #{{ props.row.accountNumber || '—' }} · {{ props.row.customerPhone || '—' }}
                </div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- PRESTAÇÃO: Ordem + Vencimento limpo -->
        <template v-slot:body-cell-installment="props">
          <q-td :props="props" class="text-center">
            <div v-if="props.row.installmentOrder">
              <q-badge color="grey-3" text-color="grey-9" rounded class="text-weight-bold" style="font-size: 10.5px">
                {{ installmentLabel(props.row.installmentOrder) }}
              </q-badge>
              <div class="text-caption text-grey-6 q-mt-xs" style="font-size: 9.5px">
                vence {{ formatDateShort(props.row.installmentDueDate) || '—' }}
              </div>
            </div>
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <!-- MONTANTE: Valor limpo + badge discreto de parcial se aplicável (sem sobreposições!) -->
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" class="text-right">
            <div class="text-weight-bold text-positive" style="font-size: 13px">
              {{ formatMoney(props.row.totalAmount ?? props.row.amount) }}
            </div>
            <!-- Se for parcial, exibe badge limpo e não sobreposto -->
            <div v-if="Number(props.row.installmentStatus) === -1 && remainingBalance(props.row) > 0" class="q-mt-xs">
              <q-badge outline color="amber-9" style="font-size: 9px; padding: 1px 4px">
                Parcial (resta {{ formatMoney(remainingBalance(props.row)) }})
              </q-badge>
            </div>
          </q-td>
        </template>

        <!-- JUROS DE MORA -->
        <template v-slot:body-cell-lateInterest="props">
          <q-td :props="props" class="text-right">
            <span
              :class="Number(props.row.displayedLatePaymentInterest ?? props.row.latePaymentInterest ?? 0) > 0 ? 'text-negative text-weight-bold' : 'text-grey-6'"
              style="font-size: 12px"
            >
              {{ formatMoney(props.row.displayedLatePaymentInterest ?? props.row.latePaymentInterest ?? 0) }}
            </span>
          </q-td>
        </template>

        <!-- DESCONTO -->
        <template v-slot:body-cell-discount="props">
          <q-td :props="props" class="text-right">
            <span v-if="Number(props.row.discountAmount) > 0" class="text-teal text-weight-medium">
              -{{ formatMoney(props.row.discountAmount) }}
            </span>
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <!-- MÉTODO / CANAL -->
        <template v-slot:body-cell-method="props">
          <q-td :props="props" class="text-center">
            <!-- M-Pesa -->
            <q-badge
              v-if="isMpesa(props.row.paymentMethod)"
              class="bg-green-1 text-green-9 text-weight-bold"
              style="font-size: 10px; border: 1px solid #86efac"
            >
              <q-icon name="smartphone" size="11px" class="q-mr-xs text-green-8" />
              M-Pesa
            </q-badge>
            <!-- Numerário -->
            <q-badge
              v-else-if="Number(props.row.paymentMethod) === 1"
              class="bg-amber-1 text-amber-9 text-weight-bold"
              style="font-size: 10px; border: 1px solid #fde68a"
            >
              <q-icon name="payments" size="11px" class="q-mr-xs text-amber-8" />
              Numerário
            </q-badge>
            <!-- Banco / Outro -->
            <q-badge
              v-else
              class="bg-blue-1 text-blue-9 text-weight-bold"
              style="font-size: 10px; border: 1px solid #bfdbfe"
            >
              <q-icon name="account_balance" size="11px" class="q-mr-xs text-blue-8" />
              {{ methodLabel(props.row.paymentMethod) }}
            </q-badge>
          </q-td>
        </template>

        <!-- REFERÊNCIA & OPERADOR -->
        <template v-slot:body-cell-reference="props">
          <q-td :props="props" class="text-center">
            <div class="text-weight-bold text-dark font-mono" style="font-size: 11px">
              {{ props.row.tranzactionReference || '—' }}
            </div>
            <div class="text-caption text-grey-6 ellipsis" style="font-size: 9.5px; max-width: 140px; margin: auto">
              {{ props.row.staffName || 'Sistema' }}
            </div>
          </q-td>
        </template>

        <!-- DATA E HORA -->
        <template v-slot:body-cell-date="props">
          <q-td :props="props" class="text-center">
            <div class="text-weight-medium text-dark" style="font-size: 11px">
              {{ formatDateTimeDate(props.row.createdAt || props.row.paymentDate) }}
            </div>
            <div class="text-caption text-grey-6" style="font-size: 9.5px">
              {{ formatDateTimeTime(props.row.createdAt || props.row.paymentDate) }}
            </div>
          </q-td>
        </template>

        <!-- RECIBO & ACÇÕES: MENU INTEGRADO (PDF / TÉRMICO / WHATSAPP) -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <div class="row items-center justify-center no-wrap q-gutter-xs">
              <!-- Botão Principal Recibo -->
              <q-btn
                unelevated
                rounded
                dense
                no-caps
                size="sm"
                color="positive"
                icon="receipt"
                label="Recibo"
                padding="2px 10px"
                :loading="receiptLoadingId === props.row.id"
                @click="gerarRecibo(props.row)"
              >
                <q-tooltip>Emitir / Abrir Recibo Oficial</q-tooltip>
              </q-btn>

              <!-- Mais opções (Térmica / WhatsApp / Selo) -->
              <q-btn flat round dense size="sm" icon="more_vert" color="grey-7">
                <q-menu cover anchor="bottom right" self="top right">
                  <q-list dense style="min-width: 170px">
                    <q-item clickable v-close-popup @click="gerarRecibo(props.row)">
                      <q-item-section avatar><q-icon name="picture_as_pdf" color="primary" size="18px" /></q-item-section>
                      <q-item-section>Recibo PDF (A4)</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="abrirTalaoTermico(props.row)">
                      <q-item-section avatar><q-icon name="print" color="dark" size="18px" /></q-item-section>
                      <q-item-section>Talão Térmico (80mm)</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="enviarWhatsApp(props.row)">
                      <q-item-section avatar><q-icon name="chat" color="positive" size="18px" /></q-item-section>
                      <q-item-section>Enviar WhatsApp</q-item-section>
                    </q-item>
                    <q-separator v-if="props.row.reciboHash" />
                    <q-item v-if="props.row.reciboHash" dense class="text-caption text-grey-7">
                      <q-item-section>
                        <div style="font-size: 10px">Selo: {{ props.row.reciboNumero }}</div>
                        <div class="font-mono text-grey-5" style="font-size: 8px">{{ props.row.reciboHash.slice(0, 20) }}...</div>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-td>
        </template>

        <!-- TOTAL NA ÚLTIMA LINHA DA GRELHA -->
        <template v-slot:bottom-row>
          <q-tr class="payments-total-row">
            <q-td colspan="2" class="text-right">
              <span class="text-weight-bold">TOTAL · {{ filteredRows.length }} {{ filteredRows.length === 1 ? 'pagamento' : 'pagamentos' }}</span>
            </q-td>
            <q-td class="text-right">
              <span class="text-weight-bold text-positive" style="font-size: 13.5px">{{ formatMoney(totalAmount) }}</span>
            </q-td>
            <q-td class="text-right">
              <span class="text-weight-bold text-orange-10">{{ formatMoney(totalLateInterest) }}</span>
            </q-td>
            <q-td colspan="5" />
          </q-tr>
        </template>
      </q-table>
    </q-card>

    <!-- ═══════ MODAL EXPRESS: RECEBER PAGAMENTO SEM VOLTAS ═══════ -->
    <QuickPaymentModal
      v-model="quickPayOpen"
      @payment-success="onPaymentCompleted"
    />

    <!-- ═══════ VISUALIZADOR PDF DO RECIBO ═══════ -->
    <ReciboViewerDialog v-model="viewerOpen" :recibo="viewerRecibo" />

    <!-- ═══════ TALÃO TÉRMICO (80MM) ═══════ -->
    <ThermalReceiptDialog v-model="thermalOpen" :recibo="thermalRecibo" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'
import { formatMoney, formatDateShort } from '@/utils/formatters'
import ReciboViewerDialog from '@/components/recibos/ReciboViewerDialog.vue'
import ThermalReceiptDialog from '@/components/recibos/ThermalReceiptDialog.vue'
import QuickPaymentModal from '@/components/payments/QuickPaymentModal.vue'

const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

// ─── Estados ───
const loading = ref(false)
const allPayments = ref([])
const quickPayOpen = ref(false)

// ─── Filtros & Presets ───
const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const methodFilter = ref(null)
const activePreset = ref('all') // 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all'

const periodPresets = [
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: 'Esta Semana', value: 'week' },
  { label: 'Este Mês', value: 'month' },
  { label: 'Ano 2026', value: 'year' },
  { label: 'Todos', value: 'all' }
]

const methodOptions = [
  { label: 'Todos os canais', value: null },
  { label: 'M-Pesa (Vodacom)', value: 7 },
  { label: 'Numerário (Caixa)', value: 1 },
  { label: 'Transferência Bancária', value: 3 },
  { label: 'Depósito Bancário', value: 4 },
  { label: 'TPA / POS', value: 5 },
  { label: 'E-Mola', value: 6 }
]

const pagination = ref({ page: 1, rowsPerPage: 25 })

// ─── Fetch de Pagamentos ───
async function fetchPayments() {
  const companyId = authStore.companyId
  if (!companyId) return
  loading.value = true
  try {
    const { data } = await api.get(`/api/payments/${companyId}/all`)
    allPayments.value = (data?.success && Array.isArray(data.result)) ? data.result : []
    await carregarSeloDosRecibos(allPayments.value)
  } catch (error) {
    console.error('Erro ao carregar pagamentos:', error)
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar pagamentos', position: 'top' })
    allPayments.value = []
  } finally {
    loading.value = false
  }
}

async function carregarSeloDosRecibos(rows) {
  const ids = (rows || []).map((row) => Number(row.id)).filter(Boolean)
  if (ids.length === 0) return
  try {
    const { data } = await api.post('/api/recibos/lookup', {
      companyId: authStore.companyId,
      tranzactionIds: ids
    })
    if (data?.success && Array.isArray(data.result)) {
      const porPagamento = new Map(data.result.map((recibo) => [Number(recibo.tranzactionId), recibo]))
      allPayments.value = allPayments.value.map((row) => {
        const recibo = porPagamento.get(Number(row.id))
        return recibo ? { ...row, reciboNumero: recibo.numero, reciboHash: recibo.hash_at, reciboId: recibo.id } : row
      })
    }
  } catch {
    // Silencioso
  }
}

// ─── Aplicação de Presets de Período ───
function applyPreset(preset) {
  activePreset.value = preset
  const today = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`

  if (preset === 'today') {
    dateFrom.value = fmt(today)
    dateTo.value = fmt(today)
  } else if (preset === 'yesterday') {
    const y = new Date(today)
    y.setDate(y.getDate() - 1)
    dateFrom.value = fmt(y)
    dateTo.value = fmt(y)
  } else if (preset === 'week') {
    const d = new Date(today)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Segunda-feira
    const monday = new Date(d.setDate(diff))
    dateFrom.value = fmt(monday)
    dateTo.value = fmt(today)
  } else if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    dateFrom.value = fmt(start)
    dateTo.value = fmt(today)
  } else if (preset === 'year') {
    dateFrom.value = `${today.getFullYear()}-01-01`
    dateTo.value = `${today.getFullYear()}-12-31`
  } else {
    // 'all'
    dateFrom.value = ''
    dateTo.value = ''
  }
  resetPage()
}

function onCustomDateChange() {
  activePreset.value = 'custom'
  resetPage()
}

// ─── Filtros e Normalização ───
function normDate(v) {
  if (!v) return ''
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return m[0]
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const d = new Date(s)
  return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : ''
}

function passesFilters(p) {
  if (search.value) {
    const q = search.value.trim().toLowerCase()
    const haystack = [
      p.customerName,
      String(p.accountNumber || ''),
      p.customerPhone,
      p.tranzactionReference,
      p.staffName,
      p.description,
      p.installmentOrder
    ].filter(Boolean).join(' ').toLowerCase()
    if (!haystack.includes(q)) return false
  }
  if (dateFrom.value || dateTo.value) {
    const d = normDate(p.createdAt || p.paymentDate)
    if (dateFrom.value && d && d < normDate(dateFrom.value)) return false
    if (dateTo.value && d && d > normDate(dateTo.value)) return false
  }
  if (methodFilter.value !== null && Number(p.paymentMethod) !== Number(methodFilter.value)) return false
  return true
}

const filteredRows = computed(() => allPayments.value.filter(passesFilters))
const isFiltering = computed(() => !!search.value || !!dateFrom.value || !!dateTo.value || methodFilter.value !== null)

// ─── KPIs Calculados ───
const totalAmount = computed(() => filteredRows.value.reduce((acc, r) => acc + (Number(r.totalAmount ?? r.amount) || 0), 0))

const totalLateInterest = computed(() => {
  return filteredRows.value.reduce((acc, r) => acc + (Number(r.displayedLatePaymentInterest ?? r.latePaymentInterest) || 0), 0)
})

const todayStr = new Date().toISOString().slice(0, 10)
const todayPayments = computed(() => allPayments.value.filter(p => normDate(p.createdAt || p.paymentDate) === todayStr))
const todayTotal = computed(() => todayPayments.value.reduce((acc, r) => acc + (Number(r.totalAmount ?? r.amount) || 0), 0))
const todayCount = computed(() => todayPayments.value.length)

const mpesaTotal = computed(() => {
  return filteredRows.value
    .filter(r => isMpesa(r.paymentMethod))
    .reduce((acc, r) => acc + (Number(r.totalAmount ?? r.amount) || 0), 0)
})

const otherTotal = computed(() => Math.max(0, totalAmount.value - mpesaTotal.value))

const mpesaShare = computed(() => {
  if (totalAmount.value <= 0) return 0
  return Math.round((mpesaTotal.value / totalAmount.value) * 100)
})

function isMpesa(method) {
  const m = String(method || '').toUpperCase()
  return m === '7' || m.includes('MPESA') || m.includes('M-PESA')
}

// ─── Colunas da Grelha ───
const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'installment', label: 'Prestação', field: 'installmentOrder', align: 'center' },
  { name: 'amount', label: 'Montante', field: 'amount', align: 'right', sortable: true },
  { name: 'lateInterest', label: 'Juros Mora', field: 'latePaymentInterest', align: 'right', sortable: true },
  { name: 'discount', label: 'Desconto', field: 'discountAmount', align: 'right', sortable: true },
  { name: 'method', label: 'Canal', field: 'paymentMethod', align: 'center' },
  { name: 'reference', label: 'Referência / Operador', field: 'tranzactionReference', align: 'center' },
  { name: 'date', label: 'Data / Hora', field: 'createdAt', align: 'center', sortable: true },
  { name: 'actions', label: 'Recibo & Acções', field: 'id', align: 'center' }
]

// ─── Modais de Recibo ───
const receiptLoadingId = ref(null)
const viewerOpen = ref(false)
const viewerRecibo = ref(null)

const thermalOpen = ref(false)
const thermalRecibo = ref(null)

async function gerarRecibo(payment) {
  receiptLoadingId.value = payment.id
  try {
    const { data } = await api.post(`/api/recibos/gerar/${payment.id}`, { companyId: authStore.companyId })
    if (!data?.success) {
      $q.notify({ type: 'negative', message: data?.message || 'Erro ao emitir o recibo', position: 'top' })
      return
    }
    viewerRecibo.value = { ...data.result, customer_phone: payment.phoneNumber || payment.customerPhone || null }
    viewerOpen.value = true
    allPayments.value = allPayments.value.map((row) =>
      Number(row.id) === Number(payment.id)
        ? { ...row, reciboNumero: data.result?.numero, reciboHash: data.result?.hash_at }
        : row
    )
    $q.notify({ type: 'positive', message: `Recibo ${data.result?.numero} emitido`, position: 'top' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao emitir o recibo', position: 'top' })
  } finally {
    receiptLoadingId.value = null
  }
}

async function abrirTalaoTermico(payment) {
  receiptLoadingId.value = payment.id
  try {
    const { data } = await api.post(`/api/recibos/gerar/${payment.id}`, { companyId: authStore.companyId })
    if (data?.success && data.result) {
      thermalRecibo.value = {
        ...data.result,
        customer_name: payment.customerName,
        customer_phone: payment.phoneNumber || payment.customerPhone,
        account_number: payment.accountNumber,
        installment_order: payment.installmentOrder,
        due_date: payment.installmentDueDate,
        valor_pago: payment.totalAmount || payment.amount,
        capital_pago: payment.amount,
        mora_paga: payment.latePaymentInterest,
        payment_method: payment.paymentMethod,
        referencia: payment.tranzactionReference,
        staffName: payment.staffName
      }
      thermalOpen.value = true
    }
  } catch (err) {
    console.error('Erro ao abrir talão térmico:', err)
  } finally {
    receiptLoadingId.value = null
  }
}

function enviarWhatsApp(payment) {
  const phone = (payment.phoneNumber || payment.customerPhone || '').replace(/\D/g, '')
  const total = formatMoney(payment.totalAmount || payment.amount)
  const num = payment.reciboNumero || 'Oficial'
  const text = encodeURIComponent(
    `*${companyStore.companyName || companyStore.company?.companyName || 'Mais Mola'}*\n` +
    `Olá ${payment.customerName || 'Cliente'},\n` +
    `Confirmamos a recepção do seu pagamento no valor de *${total}*.\n` +
    `Recibo: *${num}*\n` +
    `Obrigado pela preferência!`
  )
  const target = phone.length >= 9 ? `https://wa.me/258${phone.slice(-9)}?text=${text}` : `https://wa.me/?text=${text}`
  window.open(target, '_blank')
}

function onPaymentCompleted() {
  fetchPayments()
}

// ─── Formatações ───
function methodLabel(value) {
  const found = methodOptions.find(m => Number(m.value) === Number(value))
  return found ? found.label : 'Outro'
}

function installmentLabel(order) {
  if (!order) return '—'
  const clean = String(order).replace(/[ºª]/g, '').trim()
  return clean ? `${clean}ª prestação` : '—'
}

function remainingBalance(row) {
  const total = Number(row.installmentValue) || 0
  const paid = Number(row.installmentPaidAmount) || 0
  return Math.max(0, Math.round((total - paid) * 100) / 100)
}

function formatDateTimeDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value).slice(0, 10)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

function formatDateTimeTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

function resetPage() {
  pagination.value = { ...pagination.value, page: 1 }
}

function clearFilters() {
  search.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  methodFilter.value = null
  activePreset.value = 'all'
  resetPage()
}

// ─── Exportações ───
function exportRows() {
  return filteredRows.value.map(p => ({
    customerName: p.customerName || '—',
    accountNumber: String(p.accountNumber ?? '—'),
    phone: p.customerPhone || '—',
    installment: installmentLabel(p.installmentOrder),
    installmentDue: formatDateShort(p.installmentDueDate) || '—',
    amount: Number(p.amount) || 0,
    balance: remainingBalance(p),
    method: methodLabel(p.paymentMethod),
    staff: p.staffName || '—',
    reference: p.tranzactionReference || '—',
    date: `${formatDateTimeDate(p.createdAt || p.paymentDate)} ${formatDateTimeTime(p.createdAt || p.paymentDate)}`
  }))
}

function exportConfig() {
  return {
    sheet: 'Pagamentos',
    headers: ['Mutuário', 'Conta', 'Telefone', 'Prestação', 'Venc. prestação', 'Montante (MZN)', 'Saldo devedor (MZN)', 'Método', 'Operador', 'Referência', 'Data e hora'],
    keys: ['customerName', 'accountNumber', 'phone', 'installment', 'installmentDue', 'amount', 'balance', 'method', 'staff', 'reference', 'date'],
    money: [false, false, false, false, false, true, true, false, false, false, false],
    widths: [150, 45, 85, 55, 60, 72, 72, 85, 80, 80, 100]
  }
}

async function exportPDF() {
  const rows = exportRows()
  if (rows.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há pagamentos para exportar', position: 'top' })
    return
  }
  try {
    const cfg = exportConfig()
    const dateStr = new Date().toISOString().slice(0, 10)
    const { downloadTablePdf } = await import('@/utils/tablePdf')
    await downloadTablePdf({
      title: 'Relatório Oficial de Recebimentos',
      meta: [`Emitido em ${dateStr}`, rows.length > 1 ? `${rows.length} pagamentos` : '1 pagamento'],
      orientation: 'landscape',
      filename: `recebimentos-${dateStr}`,
      columns: cfg.headers.map((h, i) => ({
        label: h,
        width: Math.round((cfg.widths[i] || 60) * 0.8),
        align: cfg.money[i] ? 'right' : 'left'
      })),
      rows: rows.map(row => cfg.keys.map((k, i) => (cfg.money[i] ? Number(row[k]) || 0 : String(row[k] ?? '—')))),
      totalsRow: cfg.keys.map((k, i) => {
        if (!cfg.money[i]) return i === 0 ? 'TOTAL' : ''
        return rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0)
      })
    }, `recebimentos-${dateStr}.pdf`)
    $q.notify({ type: 'positive', message: 'PDF gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar PDF:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF', position: 'top' })
  }
}

async function exportExcel() {
  const rows = exportRows()
  if (rows.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há pagamentos para exportar', position: 'top' })
    return
  }
  try {
    $q.loading.show({ message: 'A gerar Excel...' })
    const { downloadExcelFromBackend } = await import('@/utils/excelDownload')
    await downloadExcelFromBackend(
      '/api/export/payments/excel',
      { rows },
      `recebimentos-${new Date().toISOString().slice(0, 10)}.xlsx`
    )
    $q.notify({ type: 'positive', message: 'Excel gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar Excel:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar Excel', position: 'top' })
  } finally {
    $q.loading.hide()
  }
}

onMounted(async () => {
  const companyId = authStore.companyId
  if (companyId && !companyStore.hasCompany) {
    await companyStore.fetchCompany(companyId).catch(() => {})
  }
  fetchPayments()
})
</script>

<style lang="scss" scoped>
.payments-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}

.kpi-mini-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
}

.kpi-border-green { border-top: 3px solid #16a34a; }
.kpi-border-blue { border-top: 3px solid #2563eb; }
.kpi-border-orange { border-top: 3px solid #ea580c; }
.kpi-border-purple { border-top: 3px solid #7c3aed; }

.kpi-mini-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.03em;
}

.kpi-mini-val {
  font-size: 19px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.kpi-mini-sub {
  font-size: 11px;
  margin-top: 3px;
  display: flex;
  align-items: center;
}

.filters-card {
  background: #ffffff;
}

.table-card {
  background: #ffffff;
}

.font-mono {
  font-family: 'Courier New', Courier, monospace;
}

.hover-link:hover {
  color: #15803d !important;
  text-decoration: underline;
}

.payments-table {
  :deep(.q-table thead th) {
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #475569;
    background-color: #f1f5f9;
  }
  :deep(.q-table tbody td) {
    font-size: 12px;
    padding: 8px 10px;
  }
  :deep(.q-table tbody tr:hover) {
    background-color: #f8fafc;
  }
  .payments-total-row td {
    background-color: #f8fafc;
    border-top: 2px solid #cbd5e1;
    font-size: 12.5px;
  }
}

body.body--dark {
  .payments-page {
    background: #0b1329;
  }

  .kpi-mini-card,
  .filters-card,
  .table-card {
    background: #162032 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  .kpi-mini-title {
    color: #94a3b8;
  }

  .kpi-mini-val {
    color: #f8fafc;
  }

  .payments-table {
    :deep(.q-table thead th) {
      background-color: #0b1329;
      color: #94a3b8;
      border-color: rgba(255, 255, 255, 0.08);
    }

    :deep(.q-table tbody td) {
      color: #f1f5f9;
      border-color: rgba(255, 255, 255, 0.06);
    }

    :deep(.q-table tbody tr:hover) {
      background-color: rgba(255, 255, 255, 0.035);
    }

    .payments-total-row td {
      background-color: #0f172a;
      border-top: 2px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
    }
  }
}
</style>
