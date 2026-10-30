<template>
  <div class="q-pa-md caixa-historico-page">
    <!-- ═══════════ CABEÇALHO EXECUTIVO ═══════════ -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h6 text-weight-bold text-slate-800 q-my-none flex items-center">
          <q-icon name="account_balance_wallet" class="q-mr-sm text-primary" size="28px" />
          Histórico e Auditoria de Caixas
        </h1>
        <div class="text-caption text-grey-7 q-mt-xs">
          Rastreabilidade de turnos, conciliação de numerário e canais electrónicos
        </div>
      </div>
      <div class="row q-gutter-xs items-center">
        <q-btn
          outline
          color="grey-7"
          dense
          icon="refresh"
          label="Actualizar"
          size="sm"
          class="q-px-sm"
          :loading="loading"
          @click="fetchHistory"
        />
      </div>
    </div>

    <!-- ═══════════ KPI EXECUTIVE STRIP ═══════════ -->
    <div class="row q-col-gutter-sm q-mb-md" data-tour="caixa-hist-kpis">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Turnos Filtrados</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-slate-900">{{ registers.length }}</span>
              <span class="text-caption text-grey-6">{{ closedCount }} fechados · {{ openCount }} abertos</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Volume Movimentado</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-slate-900">{{ formatMZN(totalVolume) }}</span>
              <span class="text-caption text-positive font-mono">+{{ formatMZN(totalEntradas) }}</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Índice de Conformidade</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold" :class="conformityRate >= 95 ? 'text-positive' : 'text-warning'">
                {{ conformityRate }}%
              </span>
              <span class="text-caption text-grey-6">{{ conformCount }} de {{ closedCount }} sem quebra</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card
          flat
          bordered
          class="kpi-card"
          :class="{ 'kpi-alert': pendingPastRegistersCount > 0 }"
          data-tour="caixa-hist-resumo"
        >
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">
              {{ pendingPastRegistersCount > 0 ? 'Regularizações Pendentes' : 'Divergência Acumulada' }}
            </div>
            <div class="row items-baseline justify-between q-mt-xs">
              <template v-if="pendingPastRegistersCount > 0">
                <span class="text-h6 text-weight-bold text-negative flex items-center">
                  <q-icon name="warning_amber" size="20px" class="q-mr-xs" />
                  {{ pendingPastRegistersCount }} {{ pendingPastRegistersCount === 1 ? 'turno' : 'turnos' }}
                </span>
                <span class="text-caption text-negative">Exige regularização</span>
              </template>
              <template v-else>
                <span class="text-h6 text-weight-bold font-mono" :class="periodDifference === 0 ? 'text-slate-800' : (periodDifference < 0 ? 'text-negative' : 'text-amber-9')">
                  {{ formatMZN(periodDifference) }}
                </span>
                <q-badge :color="periodDifferenceColor" outline size="sm">
                  {{ periodDifference === 0 ? 'Equilibrado' : (periodDifference < 0 ? 'Quebra global' : 'Sobra global') }}
                </q-badge>
              </template>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ═══════════ BARRA DE FILTROS & PRESETS ═══════════ -->
    <q-card flat bordered class="q-mb-md filters-card" data-tour="caixa-hist-filters">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <!-- Filtros Rápidos (Pills) -->
          <div class="col-12 col-md-auto q-gutter-xs">
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activePreset === 'today' ? 'primary' : 'grey-2'"
              :text-color="activePreset === 'today' ? 'white' : 'grey-8'"
              label="Hoje"
              @click="applyPreset('today')"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activePreset === '7days' ? 'primary' : 'grey-2'"
              :text-color="activePreset === '7days' ? 'white' : 'grey-8'"
              label="Últimos 7 dias"
              @click="applyPreset('7days')"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activePreset === 'thisMonth' ? 'primary' : 'grey-2'"
              :text-color="activePreset === 'thisMonth' ? 'white' : 'grey-8'"
              label="Este Mês"
              @click="applyPreset('thisMonth')"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activePreset === 'all' ? 'primary' : 'grey-2'"
              :text-color="activePreset === 'all' ? 'white' : 'grey-8'"
              label="Ver Todos"
              @click="applyPreset('all')"
            />
          </div>

          <!-- Campos de data personalizados -->
          <div class="col-6 col-sm-4 col-md-2">
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
          <div class="col-6 col-sm-4 col-md-2">
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

          <div class="col-auto">
            <q-btn
              v-if="isFiltering"
              flat
              dense
              color="grey-7"
              icon="clear"
              label="Limpar"
              size="sm"
              @click="clearFilters"
            />
          </div>

          <q-space />

          <!-- Resumo de status -->
          <div class="col-auto text-caption text-grey-6">
            Apresentando <strong>{{ registers.length }}</strong> registros
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════════ CARREGAMENTO / VAZIO / TABELA ═══════════ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar histórico e auditoria...</div>
    </div>

    <q-card v-else flat bordered class="table-card">
      <q-card-section v-if="registers.length === 0" class="text-center q-pa-xl">
        <q-icon name="history" size="56px" color="grey-4" />
        <div class="text-subtitle1 text-grey-7 text-weight-medium q-mt-md">Nenhum caixa encontrado</div>
        <div class="text-caption text-grey-5">
          {{ isFiltering ? 'Ajuste os filtros de data para visualizar períodos anteriores.' : 'Ainda não foram registados turnos de caixa.' }}
        </div>
      </q-card-section>

      <q-table
        v-else
        data-tour="caixa-hist-table"
        :rows="registers"
        :columns="columns"
        row-key="id"
        flat
        dense
        separator="horizontal"
        :rows-per-page-options="[15, 25, 50]"
        v-model:pagination="pagination"
        class="historico-table"
      >
        <template v-slot:body="props">
          <!-- ── Linha principal do turno ── -->
          <q-tr
            :props="props"
            class="cursor-pointer main-row"
            :class="{
              'row-expanded': expandedId === props.row.id,
              'row-alert': isAbandoned(props.row)
            }"
            @click="toggleExpand(props.row)"
          >
            <!-- Data / Hora de abertura -->
            <q-td key="opening_date" :props="props" class="text-left">
              <div class="text-weight-bold text-slate-800" style="font-size: 12px">
                {{ formatDay(props.row.opening_date) }}
              </div>
              <div class="text-caption text-grey-6 flex items-center q-gutter-xs">
                <span>{{ formatTime(props.row.createdAt) }}</span>
                <span v-if="props.row.closing_time">→ {{ formatTime(props.row.closing_time) }}</span>
              </div>
            </q-td>

            <!-- Responsável -->
            <q-td key="userName" :props="props" class="text-left">
              <div class="text-weight-medium text-slate-800" style="font-size: 12px">
                {{ props.row.userName || '—' }}
              </div>
              <div class="text-caption text-grey-5">Caixa #{{ props.row.id }}</div>
            </q-td>

            <!-- Canal / Modo -->
            <q-td key="mode" :props="props" class="text-center">
              <q-badge
                v-if="props.row.mode === 'ELECTRONIC'"
                color="teal-1"
                text-color="teal-9"
                class="q-px-xs text-weight-medium"
                style="font-size: 10px; border: 1px solid #b2dfdb"
              >
                DIGITAL
              </q-badge>
              <q-badge
                v-else-if="props.row.mode === 'MIXED'"
                color="indigo-1"
                text-color="indigo-9"
                class="q-px-xs text-weight-medium"
                style="font-size: 10px; border: 1px solid #c5cae9"
              >
                MISTO
              </q-badge>
              <q-badge
                v-else
                color="blue-grey-1"
                text-color="blue-grey-9"
                class="q-px-xs text-weight-medium"
                style="font-size: 10px; border: 1px solid #cfd8dc"
              >
                FÍSICO
              </q-badge>
            </q-td>

            <!-- Estado -->
            <q-td key="status" :props="props" class="text-center">
              <template v-if="props.row.status === 'ABERTO'">
                <q-chip
                  v-if="isAbandoned(props.row)"
                  color="red-1"
                  text-color="red-9"
                  dense
                  icon="warning"
                  size="11px"
                  class="text-weight-bold"
                  style="border: 1px solid #ffcdd2"
                >
                  Pendente
                  <q-tooltip>Turno de dia anterior não encerrado. Exige regularização.</q-tooltip>
                </q-chip>
                <q-chip
                  v-else
                  color="blue-1"
                  text-color="primary"
                  dense
                  size="11px"
                  class="text-weight-bold"
                  style="border: 1px solid #bbdefb"
                >
                  Em Curso
                </q-chip>
              </template>
              <q-badge
                v-else
                color="grey-3"
                text-color="grey-8"
                class="q-px-sm"
                style="font-size: 11px"
              >
                Fechado
              </q-badge>
            </q-td>

            <!-- Fundo Inicial -->
            <q-td key="opening_balance" :props="props" class="text-right font-mono text-slate-800" style="font-size: 12px">
              {{ formatMZN(props.row.opening_balance || props.row.counted_open || 0) }}
            </q-td>

            <!-- Entradas -->
            <q-td key="total_in" :props="props" class="text-right font-mono text-slate-900" style="font-size: 12px">
              <div>{{ formatMZN(props.row.total_in) }}</div>
              <div v-if="props.row.total_bank_in > 0 && props.row.total_cash_in > 0" class="text-caption text-grey-5" style="font-size: 10px">
                Dig: {{ formatCompactMZN(props.row.total_bank_in) }} · Fís: {{ formatCompactMZN(props.row.total_cash_in) }}
              </div>
            </q-td>

            <!-- Saídas -->
            <q-td key="total_out" :props="props" class="text-right font-mono text-slate-900" style="font-size: 12px">
              <div>{{ formatMZN(props.row.total_out) }}</div>
              <div v-if="props.row.total_bank_out > 0 && props.row.total_cash_out > 0" class="text-caption text-grey-5" style="font-size: 10px">
                Dig: {{ formatCompactMZN(props.row.total_bank_out) }} · Fís: {{ formatCompactMZN(props.row.total_cash_out) }}
              </div>
            </q-td>

            <!-- Saldo Apurado em Livro -->
            <q-td key="calculated" :props="props" class="text-right font-mono text-weight-medium text-slate-900" style="font-size: 12px">
              {{ formatMZN(calculatedBalance(props.row)) }}
            </q-td>

            <!-- Contagem de Fecho -->
            <q-td key="closing_balance_informed" :props="props" class="text-right font-mono text-slate-800" style="font-size: 12px">
              {{ props.row.closing_balance_informed != null ? formatMZN(props.row.closing_balance_informed) : '—' }}
            </q-td>

            <!-- Divergência / Conformidade -->
            <q-td key="difference" :props="props" class="text-center">
              <template v-if="props.row.status === 'FECHADO' && props.row.difference != null">
                <!-- Conforme (0 MZN) -->
                <span
                  v-if="Math.abs(Number(props.row.difference)) < 0.01"
                  class="conformity-badge badge-ok flex items-center justify-center"
                >
                  <q-icon name="check_circle" size="14px" class="q-mr-xs text-positive" />
                  0,00 MZN
                </span>
                <!-- Quebra (Negativo - Falta dinheiro) -->
                <span
                  v-else-if="Number(props.row.difference) < 0"
                  class="conformity-badge badge-quebra flex items-center justify-center font-mono"
                >
                  <q-icon name="error_outline" size="14px" class="q-mr-xs text-negative" />
                  {{ formatMZN(props.row.difference) }}
                  <q-tooltip>Quebra de caixa apurada no fecho</q-tooltip>
                </span>
                <!-- Sobra (Positivo - Excedente) -->
                <span
                  v-else
                  class="conformity-badge badge-sobra flex items-center justify-center font-mono"
                >
                  <q-icon name="help_outline" size="14px" class="q-mr-xs text-amber-9" />
                  +{{ formatMZN(props.row.difference) }}
                  <q-tooltip>Sobra de caixa apurada no fecho</q-tooltip>
                </span>
              </template>
              <template v-else-if="isAbandoned(props.row)">
                <q-btn
                  dense
                  unelevated
                  color="negative"
                  text-color="white"
                  size="xs"
                  label="Regularizar"
                  icon="rule"
                  class="q-px-xs"
                  @click.stop="openRegularizeDialog(props.row)"
                >
                  <q-tooltip>Encerrar administrativamente e conciliar</q-tooltip>
                </q-btn>
              </template>
              <span v-else class="text-grey-5">—</span>
            </q-td>

            <!-- Acções & Exportações -->
            <q-td key="actions" :props="props" class="text-center no-wrap">
              <q-btn flat round dense size="sm" icon="grid_on" color="teal-8" @click.stop="exportRegister(props.row, 'xlsx')">
                <q-tooltip>Exportar folha Excel do turno</q-tooltip>
              </q-btn>
              <q-btn flat round dense size="sm" icon="picture_as_pdf" color="red-7" @click.stop="exportRegister(props.row, 'pdf')">
                <q-tooltip>Exportar termo PDF do turno</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                size="sm"
                :icon="expandedId === props.row.id ? 'expand_less' : 'expand_more'"
                color="grey-7"
                @click.stop="toggleExpand(props.row)"
              >
                <q-tooltip>{{ expandedId === props.row.id ? 'Fechar detalhes' : `Ver ${props.row.movementCount || 0} lançamentos` }}</q-tooltip>
              </q-btn>
            </q-td>
          </q-tr>

          <!-- ── Linha Expandida: Movimentos do Turno ── -->
          <q-tr v-if="expandedId === props.row.id" class="expanded-row">
            <q-td colspan="11" class="expanded-cell">
              <div v-if="expandedLoading" class="text-center q-pa-md">
                <q-spinner-dots size="28px" color="primary" />
                <div class="text-caption text-grey-5 q-mt-xs">A carregar lançamentos do turno...</div>
              </div>
              <div
                v-else-if="expandedMovements !== null && expandedMovements.length === 0"
                class="text-caption text-grey-6 text-center q-pa-md"
              >
                Nenhum movimento registado neste caixa.
              </div>
              <div v-else-if="expandedMovements !== null" class="q-pa-xs">
                <!-- Mini cabeçalho de detalhe -->
                <div class="row items-center justify-between q-pb-xs q-mb-xs border-b">
                  <div class="text-caption text-weight-bold text-slate-800">
                    Lançamentos do Turno (#{{ props.row.id }}) — {{ expandedMovements.length }} movimentos
                  </div>
                  <div class="text-caption text-grey-6 font-mono">
                    Apurado: <strong>{{ formatMZN(calculatedBalance(props.row)) }}</strong>
                  </div>
                </div>

                <div class="movements-list">
                  <div
                    v-for="movement in expandedMovements"
                    :key="movement.id"
                    class="movement-item row items-center justify-between q-py-xs"
                  >
                    <div class="row items-center q-gutter-x-sm col-auto">
                      <!-- Badge Entrada/Saída -->
                      <q-badge
                        :color="movement.type === 'ENTRADA' ? 'green-1' : 'red-1'"
                        :text-color="movement.type === 'ENTRADA' ? 'green-9' : 'red-9'"
                        class="text-weight-bold text-caption q-px-xs"
                        style="font-size: 10px; border: 1px solid"
                        :style="{ borderColor: movement.type === 'ENTRADA' ? '#a5d6a7' : '#ef9a9a' }"
                      >
                        {{ movement.type === 'ENTRADA' ? 'ENTRADA' : 'SAÍDA' }}
                      </q-badge>

                      <!-- Categoria -->
                      <q-chip
                        :color="categoryColor(movement.category)"
                        text-color="white"
                        dense
                        size="10px"
                        class="q-ma-none text-weight-medium"
                      >
                        {{ categoryLabel(movement.category) }}
                      </q-chip>

                      <!-- Método de Pagamento (Canal) -->
                      <span v-if="movement.paymentMethod" class="method-tag text-caption">
                        <q-icon :name="paymentMethodIcon(movement.paymentMethod)" size="12px" class="q-mr-xs" />
                        {{ movement.paymentMethod }}
                      </span>

                      <!-- Descrição -->
                      <span class="text-slate-800 text-caption text-weight-medium">
                        {{ movement.description || 'Movimento de tesouraria' }}
                      </span>

                      <!-- Carimbo -->
                      <span class="text-caption text-grey-5" style="font-size: 10px">
                        {{ formatTime(movement.createdAt) }}
                        <span v-if="movement.isAutomatic">· auto</span>
                      </span>
                    </div>

                    <div class="col-auto text-right font-mono text-weight-bold text-caption" :class="movement.type === 'ENTRADA' ? 'text-positive' : 'text-negative'">
                      {{ movement.type === 'ENTRADA' ? '+' : '−' }} {{ formatMZN(movement.amount) }}
                    </div>
                  </div>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>

    <!-- ═══════════ DIALOG: REGULARIZAR CAIXA PENDENTE ═══════════ -->
    <q-dialog v-model="regularizeDialog" persistent>
      <q-card style="width: 520px; max-width: 95vw; border-radius: 12px">
        <q-card-section class="bg-slate-900 text-white row items-center q-py-sm">
          <q-icon name="admin_panel_settings" size="22px" class="q-mr-sm text-amber-4" />
          <div class="text-subtitle1 text-weight-bold">Regularização Administrativa de Turno</div>
          <q-space />
          <q-btn dense flat round icon="close" color="white" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="bg-amber-1 q-pa-sm rounded-borders q-mb-md text-caption text-amber-10 row items-start" style="border: 1px solid #ffe082">
            <q-icon name="info" size="18px" class="q-mr-xs q-mt-xs text-amber-9" />
            <div class="col">
              Este caixa do dia <strong>{{ formatDay(selectedToRegularize?.opening_date) }}</strong> (operador: <strong>{{ selectedToRegularize?.userName }}</strong>) permaneceu aberto sem fecho formal. A sua conciliação restabelecerá o rigor dos saldos de balcão e do reporte ao regulador.
            </div>
          </div>

          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6">
              <div class="text-caption text-grey-6">Fundo Inicial:</div>
              <div class="text-weight-medium font-mono">{{ formatMZN(selectedToRegularize?.opening_balance || 0) }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Saldo Apurado em Livro:</div>
              <div class="text-weight-bold text-primary font-mono">{{ formatMZN(calculatedBalance(selectedToRegularize || {})) }}</div>
            </div>
          </div>

          <div class="q-mb-md">
            <div class="text-caption text-weight-medium text-slate-800 q-mb-xs">Modo de Regularização:</div>
            <q-btn-toggle
              v-model="regularizeMode"
              spread
              no-caps
              dense
              rounded
              toggle-color="primary"
              color="grey-2"
              text-color="grey-8"
              :options="[
                { label: 'Fechar pelo Apurado (Divergência Zero)', value: 'calculated' },
                { label: 'Informar Contagem Física Diferente', value: 'custom' }
              ]"
            />
          </div>

          <div v-if="regularizeMode === 'custom'" class="q-mb-md">
            <q-input
              v-model.number="customClosingBalance"
              outlined
              dense
              type="number"
              step="0.01"
              label="Valor Físico Efectivo (MZN)"
              prefix="MZN"
              class="font-mono"
            />
            <div class="text-caption text-grey-6 q-mt-xs">
              Divergência calculada:
              <strong :class="customDivergence < 0 ? 'text-negative' : (customDivergence > 0 ? 'text-amber-9' : 'text-positive')">
                {{ formatMZN(customDivergence) }}
              </strong>
            </div>
          </div>

          <q-input
            v-model="regularizeNotes"
            outlined
            dense
            type="textarea"
            rows="2"
            label="Despacho / Justificação da Auditoria *"
            placeholder="Ex.: Regularização de turno abandonado confirmada por conferência bancária e extracto de balcão."
            :rules="[val => !!val && val.trim().length >= 5 || 'Obrigatório registar a nota de regularização auditada.']"
          />
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-pa-sm">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="Confirmar Regularização"
            icon="check"
            :loading="regularizeLoading"
            :disable="!regularizeNotes || regularizeNotes.trim().length < 5"
            @click="submitRegularization"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '@/boot/axios'
import { format, parseISO, subDays, startOfMonth } from 'date-fns'

const $q = useQuasar()

// ─── Estado de Filtros & Dados ───
const loading = ref(false)
const registers = ref([])
const dateFrom = ref('')
const dateTo = ref('')
const activePreset = ref('all')

// Expansão de linhas
const expandedId = ref(null)
const expandedMovements = ref(null)
const expandedLoading = ref(false)

// Diálogo de Regularização
const regularizeDialog = ref(false)
const selectedToRegularize = ref(null)
const regularizeMode = ref('calculated')
const customClosingBalance = ref(0)
const regularizeNotes = ref('Regularização administrativa de turno pendente aprovada pela supervisão de tesouraria.')
const regularizeLoading = ref(false)

const isFiltering = computed(() => !!dateFrom.value || !!dateTo.value)

// ─── Cálculos Executivos de Resumo ───
const closedRegisters = computed(() => registers.value.filter(r => r.status === 'FECHADO'))
const closedCount = computed(() => closedRegisters.value.length)
const openCount = computed(() => registers.value.filter(r => r.status === 'ABERTO').length)

const todayStr = format(new Date(), 'yyyy-MM-dd')

function isAbandoned(row) {
  if (!row || row.status !== 'ABERTO') return false
  const day = String(row.opening_date || '').slice(0, 10)
  return day !== '' && day < todayStr
}

const pendingPastRegistersCount = computed(() => {
  return registers.value.filter(r => isAbandoned(r)).length
})

const totalEntradas = computed(() => {
  return registers.value.reduce((acc, r) => acc + (Number(r.total_in) || 0), 0)
})

const totalSaidas = computed(() => {
  return registers.value.reduce((acc, r) => acc + (Number(r.total_out) || 0), 0)
})

const totalVolume = computed(() => totalEntradas.value + totalSaidas.value)

const conformCount = computed(() => {
  return closedRegisters.value.filter(r => Math.abs(Number(r.difference) || 0) < 0.01).length
})

const conformityRate = computed(() => {
  if (closedCount.value === 0) return 100
  return Math.round((conformCount.value / closedCount.value) * 100)
})

const periodDifference = computed(() => {
  return registers.value.reduce((acc, r) => acc + (Number(r.difference) || 0), 0)
})

const periodDifferenceColor = computed(() => {
  if (Math.abs(periodDifference.value) < 0.01) return 'grey-6'
  return periodDifference.value < 0 ? 'negative' : 'amber-9'
})

// Divergência no modal de regularização
const customDivergence = computed(() => {
  if (!selectedToRegularize.value) return 0
  const calc = calculatedBalance(selectedToRegularize.value)
  return Math.round(((Number(customClosingBalance.value) || 0) - calc) * 100) / 100
})

// ─── Formatações ───
function formatMZN(value) {
  return (Number(value) || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MZN'
}

function formatCompactMZN(value) {
  const num = Number(value) || 0
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toFixed(0)
}

function formatDay(value) {
  if (!value) return '—'
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd/MM/yyyy')
  } catch {
    return String(value).slice(0, 10)
  }
}

function formatTime(value) {
  if (!value) return ''
  try {
    return format(new Date(value), 'HH:mm')
  } catch {
    return ''
  }
}

function paymentMethodIcon(method) {
  switch (String(method || '').toUpperCase()) {
    case 'MPESA': return 'phone_android'
    case 'EMOLA': return 'smartphone'
    case 'BANK': return 'account_balance'
    case 'CASH': return 'payments'
    default: return 'credit_card'
  }
}

// ─── Categorias ───
const categoryMeta = {
  DESEMBOLSO:    { label: 'Desembolso',   color: 'deep-orange-7' },
  REEMBOLSO:     { label: 'Reembolso',    color: 'positive' },
  JUROS_MORA:    { label: 'Juros Mora',   color: 'amber-9' },
  TAXA_ADMIN:    { label: 'Taxa Admin',   color: 'blue-grey-7' },
  INTERNET:      { label: 'Internet',     color: 'indigo' },
  LUZ:           { label: 'Luz',          color: 'orange-8' },
  AGUA:          { label: 'Água',         color: 'light-blue-8' },
  COMBUSTIVEL:   { label: 'Combustível',  color: 'brown-6' },
  RENTABILIDADE: { label: 'Rentabilidade',color: 'teal-8' },
  SALARIOS:      { label: 'Salários',     color: 'purple-7' },
  REUNIAO:       { label: 'Reunião',      color: 'pink-7' },
  TRANSPORTE:    { label: 'Transporte',   color: 'cyan-9' },
  OUTROS:        { label: 'Outros',       color: 'grey-7' }
}

function categoryLabel(category) {
  return categoryMeta[category]?.label || category
}

function categoryColor(category) {
  return categoryMeta[category]?.color || 'grey-7'
}

function calculatedBalance(row) {
  if (!row) return 0
  const counted = row.counted_open
  const base = Number(counted != null ? counted : row.opening_balance) || 0
  return Math.round(
    (base +
     (Number(row.total_in) || 0) -
     (Number(row.total_out) || 0)) * 100
  ) / 100
}

// ─── Presets de Filtro ───
function applyPreset(preset) {
  activePreset.value = preset
  const today = new Date()

  if (preset === 'today') {
    const str = format(today, 'yyyy-MM-dd')
    dateFrom.value = str
    dateTo.value = str
  } else if (preset === '7days') {
    dateFrom.value = format(subDays(today, 6), 'yyyy-MM-dd')
    dateTo.value = format(today, 'yyyy-MM-dd')
  } else if (preset === 'thisMonth') {
    dateFrom.value = format(startOfMonth(today), 'yyyy-MM-dd')
    dateTo.value = format(today, 'yyyy-MM-dd')
  } else if (preset === 'all') {
    dateFrom.value = ''
    dateTo.value = ''
  }
  fetchHistory()
}

function onCustomDateChange() {
  activePreset.value = 'custom'
  fetchHistory()
}

function clearFilters() {
  applyPreset('all')
}

// ─── API: Listagem de Histórico ───
async function fetchHistory() {
  loading.value = true
  try {
    const params = {}
    if (dateFrom.value) params.from = dateFrom.value
    if (dateTo.value) params.to = dateTo.value
    params.limit = 100
    const { data } = await api.get('/api/cash-registers/history', { params })
    registers.value = (data?.success && Array.isArray(data.result)) ? data.result : []
    closeExpanded()
  } catch (error) {
    console.error('Erro ao carregar histórico de caixas:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao carregar histórico de caixas',
      position: 'top'
    })
    registers.value = []
  } finally {
    loading.value = false
  }
}

// ─── Expansão de Linha & Movimentos ───
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
    $q.notify({ type: 'negative', message: 'Erro ao carregar movimentos do turno', position: 'top' })
    expandedMovements.value = []
  } finally {
    expandedLoading.value = false
  }
}

function closeExpanded() {
  expandedId.value = null
  expandedMovements.value = null
}

// ─── Regularização de Turnos Pendentes ───
function openRegularizeDialog(row) {
  selectedToRegularize.value = row
  regularizeMode.value = 'calculated'
  customClosingBalance.value = calculatedBalance(row)
  regularizeNotes.value = `Regularização administrativa do caixa #${row.id} pendente de ${formatDay(row.opening_date)}.`
  regularizeDialog.value = true
}

async function submitRegularization() {
  if (!selectedToRegularize.value) return
  regularizeLoading.value = true
  try {
    const calc = calculatedBalance(selectedToRegularize.value)
    const closingVal = regularizeMode.value === 'calculated' ? calc : Number(customClosingBalance.value)

    await api.post(`/api/cash-registers/${selectedToRegularize.value.id}/close`, {
      closing_balance_informed: closingVal,
      tipo_fechamento: 'REGULARIZACAO_ADMINISTRATIVA',
      notes: regularizeNotes.value
    })

    $q.notify({
      type: 'positive',
      message: `Caixa #${selectedToRegularize.value.id} regularizado e encerrado com sucesso!`,
      position: 'top'
    })
    regularizeDialog.value = false
    await fetchHistory()
  } catch (err) {
    console.error('Erro na regularização de caixa:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Falha ao regularizar o turno de caixa',
      position: 'top'
    })
  } finally {
    regularizeLoading.value = false
  }
}

// ─── Exportações Excel / PDF ───
async function exportRegister(row, formatType) {
  try {
    $q.notify({ type: 'info', message: 'A preparar relatório do turno...', position: 'top', timeout: 800 })
    const { data } = await api.get(`/api/cash-registers/${row.id}/movements`)
    const movements = (data?.success && Array.isArray(data.result)) ? data.result : []
    if (formatType === 'xlsx') {
      await exportRegisterXlsx(row, movements)
    } else {
      await exportRegisterPdf(row, movements)
    }
  } catch (error) {
    console.error('Erro ao exportar caixa:', error)
    $q.notify({ type: 'negative', message: 'Erro ao gerar exportação', position: 'top' })
  }
}

function registerSummaryRows(row) {
  const calc = calculatedBalance(row)
  return [
    ['Turno / Caixa ID', `#${row.id}`],
    ['Data do Caixa', formatDay(row.opening_date)],
    ['Responsável', row.userName || '—'],
    ['Modo Operacional', row.mode || 'PHYSICAL'],
    ['Estado', row.status],
    ['Fundo Inicial', formatMZN(row.opening_balance || row.counted_open || 0)],
    ['Total Entradas', formatMZN(row.total_in)],
    ['Total Saídas', formatMZN(row.total_out)],
    ['Saldo Apurado em Livro', formatMZN(calc)],
    ['Contagem de Fecho Informada', row.closing_balance_informed != null ? formatMZN(row.closing_balance_informed) : '—'],
    ['Divergência de Fecho', row.difference != null ? formatMZN(row.difference) : '—'],
    ['Notas / Despacho', row.notes || '—']
  ]
}

function movementTableRows(movements) {
  return movements.map(m => [
    formatDay(m.createdAt) + ' ' + formatTime(m.createdAt),
    m.type === 'ENTRADA' ? 'ENTRADA' : 'SAÍDA',
    m.paymentMethod || 'CASH',
    categoryLabel(m.category),
    m.description || '',
    (m.type === 'ENTRADA' ? '+' : '-') + formatMZN(m.amount)
  ])
}

async function exportRegisterXlsx(row, movements) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const wsSummary = XLSX.utils.aoa_to_sheet([
    ['TERMO DE FECHO E AUDITORIA DE CAIXA — ' + formatDay(row.opening_date)],
    [],
    ...registerSummaryRows(row)
  ])
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo do Turno')

  const wsMovements = XLSX.utils.aoa_to_sheet([
    ['Hora', 'Tipo', 'Canal', 'Categoria', 'Descrição', 'Valor'],
    ...movementTableRows(movements)
  ])
  XLSX.utils.book_append_sheet(wb, wsMovements, 'Movimentos')

  XLSX.writeFile(wb, `auditoria-caixa-${formatDay(row.opening_date).replaceAll('/', '-')}-${row.id}.xlsx`)
}

async function exportRegisterPdf(row, movements) {
  const { downloadTablePdf, tablePdfError } = await import('@/utils/tablePdf')
  const daySlug = formatDay(row.opening_date).replaceAll('/', '-')
  const mvRows = movements.length ? movementTableRows(movements) : [['—', '—', '—', '—', 'Sem movimentos', '—']]
  try {
    await downloadTablePdf({
      title: 'Termo de Fecho e Auditoria de Caixa',
      meta: [`${formatDay(row.opening_date)} · Operador: ${row.userName || ''} · Caixa #${row.id}`],
      filename: `caixa-${daySlug}-${row.id}`,
      columns: [{ label: 'Conceito / Parâmetro', width: 200 }, { label: 'Valor Apurado' }],
      rows: registerSummaryRows(row).map(([k, v]) => [String(k), String(v)]),
      totalsRow: null
    }, `caixa-${daySlug}-${row.id}-resumo.pdf`)

    await downloadTablePdf({
      title: 'Termo de Fecho — Relação de Movimentos',
      meta: [`${formatDay(row.opening_date)} · Operador: ${row.userName || ''}`],
      filename: `caixa-${daySlug}-${row.id}-movimentos`,
      columns: [
        { label: 'Hora', width: 55 },
        { label: 'Tipo', width: 50 },
        { label: 'Canal', width: 50 },
        { label: 'Categoria', width: 70 },
        { label: 'Descrição' },
        { label: 'Valor', width: 70, align: 'right' }
      ],
      rows: mvRows
    }, `caixa-${daySlug}-${row.id}-movimentos.pdf`)
  } catch (e) {
    console.error('Erro ao gerar PDF do fecho:', e)
    $q.notify({ type: 'negative', message: await tablePdfError(e, 'Erro ao gerar PDF'), position: 'top' })
  }
}

// ─── Tabela ───
const pagination = ref({ page: 1, rowsPerPage: 25 })
const columns = [
  { name: 'opening_date', label: 'Data / Turno', field: 'opening_date', align: 'left', sortable: true },
  { name: 'userName', label: 'Responsável', field: 'userName', align: 'left', sortable: true },
  { name: 'mode', label: 'Canal', field: 'mode', align: 'center' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'opening_balance', label: 'Fundo Inicial', field: 'opening_balance', align: 'right' },
  { name: 'total_in', label: 'Entradas', field: 'total_in', align: 'right', sortable: true },
  { name: 'total_out', label: 'Saídas', field: 'total_out', align: 'right', sortable: true },
  { name: 'calculated', label: 'Saldo Apurado', field: () => '', align: 'right' },
  { name: 'closing_balance_informed', label: 'Fecho Contado', field: 'closing_balance_informed', align: 'right' },
  { name: 'difference', label: 'Divergência', field: 'difference', align: 'center', sortable: true },
  { name: 'actions', label: 'Acções', field: () => '', align: 'center' }
]

onMounted(() => {
  applyPreset('all')
})
</script>

<style lang="scss" scoped>
.caixa-historico-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}

.kpi-card {
  border-radius: 10px;
  background: #ffffff;
  border-color: #e2e8f0;
  transition: all 0.2s ease;
  &:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }
}

.kpi-alert {
  border-color: #fca5a5 !important;
  background: #fff5f5 !important;
}

.filters-card {
  border-radius: 10px;
  background: #ffffff;
  border-color: #e2e8f0;
}

.table-card {
  border-radius: 10px;
  background: #ffffff;
  border-color: #e2e8f0;
  overflow: hidden;
}

.historico-table {
  :deep(.q-table thead th) {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
    background-color: #f1f5f9;
    padding: 8px 10px;
    border-bottom: 1px solid #e2e8f0;
  }
  :deep(.q-table tbody td) {
    font-size: 12px;
    padding: 6px 10px;
    border-color: #f1f5f9;
  }
}

.main-row {
  transition: background-color 0.15s ease;
  &:hover {
    background-color: #f8fafc;
  }
}

.row-expanded {
  background-color: #f1f5f9 !important;
}

.row-alert {
  background-color: #fff9f9;
  &:hover {
    background-color: #fff1f1;
  }
}

.conformity-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.badge-ok {
  background-color: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.badge-quebra {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.badge-sobra {
  background-color: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}

.expanded-cell {
  background: #f8fafc;
  padding: 10px 16px;
  border-bottom: 2px solid #e2e8f0;
}

.border-b {
  border-bottom: 1px solid #e2e8f0;
}

.movement-item {
  border-bottom: 1px dashed #e2e8f0;
  &:last-child {
    border-bottom: none;
  }
}

.method-tag {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  padding: 1px 6px;
  border-radius: 4px;
  color: #334155;
  display: inline-flex;
  align-items: center;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-variant-numeric: tabular-nums;
}

.text-slate-800 {
  color: #1e293b;
}

.text-slate-900 {
  color: #0f172a;
}

body.body--dark {
  .caixa-historico-page {
    background: #0f172a;
  }
  .kpi-card, .filters-card, .table-card {
    background: #1e293b;
    border-color: #334155;
  }
  .historico-table :deep(.q-table thead th) {
    background-color: #1e293b;
    color: #94a3b8;
    border-color: #334155;
  }
  .text-slate-800, .text-slate-900 {
    color: #f8fafc;
  }
  .expanded-cell {
    background: #131c2e;
  }
}
</style>
