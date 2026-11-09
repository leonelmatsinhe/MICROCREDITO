<template>
  <q-page class="financier-reports-page q-pa-md">
    <!-- ═══════ CABEÇALHO EXECUTIVO & FILTROS ═══════ -->
    <q-card flat bordered class="filter-card q-mb-md" data-tour="fin-rep-filtros">
      <q-card-section class="q-py-sm">
        <div class="row items-center justify-between q-col-gutter-sm">
          <div>
            <div class="text-subtitle1 text-weight-bold text-slate-900 flex items-center">
              <q-icon name="assessment" class="q-mr-xs text-primary" size="22px" />
              Relatório de Financiadores e Fundos
            </div>
            <div class="text-caption text-grey-7">
              Prestação analítica de contas e retorno por carteira segregada
            </div>
          </div>

          <!-- Botões de Acção e Exportação -->
          <div class="row items-center q-gutter-xs" data-tour="fin-rep-acoes">
            <q-btn
              color="primary"
              outline
              no-caps
              rounded
              size="sm"
              icon="grid_on"
              label="Excel (2 Abas)"
              :disable="!walletId"
              @click="exportExcel"
            />
            <q-btn
              color="grey-8"
              outline
              no-caps
              rounded
              size="sm"
              icon="print"
              label="Imprimir / PDF"
              :disable="!walletId"
              @click="printView"
            />
            <q-btn
              color="positive"
              unelevated
              no-caps
              rounded
              size="sm"
              icon="forward_to_inbox"
              label="Enviar por E-mail"
              :disable="!walletId"
              @click="openEmailDialog"
            />
          </div>
        </div>

        <q-separator class="q-my-sm" />

        <!-- Barra de Parâmetros e Filtros de Data -->
        <div class="row q-col-gutter-sm items-center">
          <div class="col-12 col-md-4">
            <q-select
              v-model="walletId"
              :options="walletOptions"
              outlined
              dense
              emit-value
              map-options
              label="Carteira / Fundo Financiador *"
              @update:model-value="onWalletChange"
            >
              <template v-slot:prepend><q-icon name="savings" size="16px" color="grey-6" /></template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <span class="code-badge font-mono">{{ scope.opt.codigo }}</span>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-bold text-slate-900">{{ scope.opt.label }}</q-item-label>
                    <q-item-label caption>
                      {{ scope.opt.parceiro ? `Parceiro: ${scope.opt.parceiro}` : 'Fundo Próprio Mais Mola' }}
                      <span v-if="scope.opt.saldo !== null && scope.opt.saldo !== undefined">
                        · Disp: {{ money(scope.opt.saldo) }}
                      </span>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <!-- Atalhos Rápidos de Data -->
          <div class="col-12 col-md-auto q-gutter-xs">
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activeQuickRange === 'today' ? 'primary' : 'grey-2'"
              :text-color="activeQuickRange === 'today' ? 'white' : 'grey-8'"
              label="Hoje"
              @click="applyQuickRange('today')"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activeQuickRange === '7d' ? 'primary' : 'grey-2'"
              :text-color="activeQuickRange === '7d' ? 'white' : 'grey-8'"
              label="7 Dias"
              @click="applyQuickRange('7d')"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activeQuickRange === 'month' ? 'primary' : 'grey-2'"
              :text-color="activeQuickRange === 'month' ? 'white' : 'grey-8'"
              label="Este Mês"
              @click="applyQuickRange('month')"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="activeQuickRange === 'year' ? 'primary' : 'grey-2'"
              :text-color="activeQuickRange === 'year' ? 'white' : 'grey-8'"
              label="Este Ano"
              @click="applyQuickRange('year')"
            />
          </div>

          <!-- Campos de Data -->
          <div class="col-6 col-sm-3 col-md-2">
            <q-input v-model="fromDisplay" outlined dense label="Data Inicial" mask="##/##/####" placeholder="dd/mm/aaaa" input-style="font-size: 12px">
              <template v-slot:prepend>
                <q-icon name="event" size="16px" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="fromDisplay" mask="DD/MM/YYYY" locale="pt" :today-btn="true" @update:model-value="activeQuickRange = 'custom'" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>

          <div class="col-6 col-sm-3 col-md-2">
            <q-input v-model="toDisplay" outlined dense label="Data Final" mask="##/##/####" placeholder="dd/mm/aaaa" input-style="font-size: 12px">
              <template v-slot:prepend>
                <q-icon name="event" size="16px" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="toDisplay" mask="DD/MM/YYYY" locale="pt" :today-btn="true" @update:model-value="activeQuickRange = 'custom'" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>

          <div class="col-auto">
            <q-btn color="primary" unelevated rounded size="sm" icon="filter_alt" label="Filtrar" :loading="loading" @click="load" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════ NENHUMA CARTEIRA SELECCIONADA ═══════ -->
    <q-card v-if="!walletId" flat bordered class="empty-card text-center q-pa-xl">
      <q-icon name="savings" size="56px" color="grey-4" />
      <div class="text-subtitle1 text-grey-7 text-weight-medium q-mt-md">Seleccione uma carteira para emitir o relatório</div>
      <div class="text-caption text-grey-5">O relatório analisa exclusivamente os desembolsos, reembolsos e rentabilidade do fundo selecionado.</div>
    </q-card>

    <template v-else>
      <!-- ═══════ IDENTIFICAÇÃO DO PARCEIRO / CARTEIRA ═══════ -->
      <q-card v-if="report?.carteira" flat bordered class="statement-card q-mb-md">
        <q-card-section class="q-py-sm">
          <div class="row items-center justify-between no-wrap">
            <div class="row items-center no-wrap">
              <span class="code-badge font-mono q-mr-sm">{{ report.carteira.codigo }}</span>
              <div>
                <div class="text-weight-bold text-slate-900" style="font-size: 14px">
                  {{ report.carteira.nome }}
                  <span v-if="report.carteira.parceiro_nome" class="text-grey-6 text-caption">
                    (Parceiro: <strong>{{ report.carteira.parceiro_nome }}</strong>)
                  </span>
                </div>
                <div class="text-caption text-grey-6">
                  Empresa: {{ report.empresa?.name || 'Mais Mola' }} · NUIT: {{ report.empresa?.nuit || '—' }} · Período: <strong>{{ periodoLabel }}</strong>
                </div>
              </div>
            </div>
            <div class="text-right">
              <q-btn flat dense no-caps color="primary" icon="refresh" label="Actualizar" size="sm" :loading="loading" @click="load" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- ═══════ 3 BLOCOS EXECUTIVOS FINANCEIROS ═══════ -->
      <div class="row q-col-gutter-sm q-mb-md" data-tour="fin-rep-kpis">
        <!-- BLOCO A: CAPITAL & ALOCAÇÃO -->
        <div class="col-12 col-md-4">
          <q-card flat bordered class="statement-card h-full">
            <q-card-section class="q-pa-sm">
              <div class="statement-header row items-center justify-between q-pb-xs border-b">
                <span class="text-caption text-weight-bold text-slate-800 text-uppercase">Posição de Capital</span>
                <q-icon name="account_balance" size="16px" color="primary" />
              </div>

              <div class="q-mt-xs q-gutter-y-xs">
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Capital Alocado:</span>
                  <span class="metric-val font-mono">{{ blocoCapital.alocado }}</span>
                </div>
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Desembolsado no Período:</span>
                  <span class="metric-val font-mono text-primary">{{ blocoCapital.desembolsadoPeriodo }}</span>
                </div>
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Disponível Analítico:</span>
                  <span class="metric-val font-mono text-positive">{{ blocoCapital.disponivel }}</span>
                </div>
                <div class="row items-center justify-between text-caption text-grey-6 q-pt-xs">
                  <span>Utilização do Fundo:</span>
                  <span class="font-mono text-weight-bold">{{ blocoCapital.utilizacao }}%</span>
                </div>
                <q-linear-progress
                  :value="blocoCapital.utilizacao / 100"
                  rounded
                  size="5px"
                  :color="blocoCapital.utilizacao >= 90 ? 'negative' : 'primary'"
                  track-color="grey-2"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- BLOCO B: DEMONSTRAÇÃO DE RETORNO -->
        <div class="col-12 col-md-4">
          <q-card flat bordered class="statement-card h-full">
            <q-card-section class="q-pa-sm">
              <div class="statement-header row items-center justify-between q-pb-xs border-b">
                <span class="text-caption text-weight-bold text-slate-800 text-uppercase">Cobrança & Retorno</span>
                <q-icon name="trending_up" size="16px" color="positive" />
              </div>

              <div class="q-mt-xs q-gutter-y-xs">
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Total Recebido no Período:</span>
                  <span class="metric-val font-mono text-positive">{{ blocoRetorno.totalRecebido }}</span>
                </div>
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Capital Amortizado:</span>
                  <span class="metric-val font-mono">{{ blocoRetorno.capitalAmortizado }}</span>
                </div>
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Juros Recebidos:</span>
                  <span class="metric-val font-mono text-positive">{{ blocoRetorno.jurosRecebidos }}</span>
                </div>
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Mora Recebida:</span>
                  <span class="metric-val font-mono text-amber-9">{{ blocoRetorno.moraRecebida }}</span>
                </div>
                <div class="row items-baseline justify-between q-pt-xs border-t">
                  <span class="metric-label text-weight-medium">Juros Gerados (Acumulado):</span>
                  <span class="metric-val font-mono text-indigo-8">{{ blocoRetorno.jurosGerados }}</span>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- BLOCO C: CARTEIRA ATIVA & QUALIDADE -->
        <div class="col-12 col-md-4">
          <q-card flat bordered class="statement-card h-full">
            <q-card-section class="q-pa-sm">
              <div class="statement-header row items-center justify-between q-pb-xs border-b">
                <span class="text-caption text-weight-bold text-slate-800 text-uppercase">Qualidade da Carteira</span>
                <q-icon name="speed" size="16px" color="amber-9" />
              </div>

              <div class="q-mt-xs q-gutter-y-xs">
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Saldo a Receber (Principal):</span>
                  <span class="metric-val font-mono text-amber-9">{{ blocoQualidade.saldoAReceber }}</span>
                </div>
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Previsão de Lucro Futuro:</span>
                  <span class="metric-val font-mono text-deep-purple-8">{{ blocoQualidade.previsaoLucro }}</span>
                </div>
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Taxa Média Ponderada:</span>
                  <span class="metric-val font-mono">{{ blocoQualidade.taxaMedia }}</span>
                </div>
                <div class="row items-baseline justify-between">
                  <span class="metric-label">Prestações Pagas / Total:</span>
                  <span class="metric-val font-mono">{{ blocoQualidade.prestacoesPagas }}</span>
                </div>
                <div class="row items-baseline justify-between q-pt-xs border-t">
                  <span class="metric-label">Prestações em Atraso:</span>
                  <span class="metric-val font-mono" :class="blocoQualidade.emAtrasoCount > 0 ? 'text-negative text-weight-bold' : 'text-positive'">
                    {{ blocoQualidade.emAtrasoCount }} pendência(s)
                  </span>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- ═══════ GRÁFICOS ANALÍTICOS ═══════ -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12 col-lg-7">
          <q-card flat bordered class="statement-card">
            <q-card-section class="q-pa-sm">
              <div class="text-caption text-weight-bold text-slate-800 text-uppercase">Desembolsado vs Recebido por Mês</div>
              <div class="text-caption text-grey-6">Fluxo mensal no período selecionado</div>
              <div class="chart-box q-mt-xs"><Bar :data="barData" :options="barOptions" /></div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-lg-5">
          <q-card flat bordered class="statement-card">
            <q-card-section class="q-pa-sm">
              <div class="text-caption text-weight-bold text-slate-800 text-uppercase">Composição dos Recebimentos</div>
              <div class="text-caption text-grey-6">Distribuição entre Capital, Juros, Mora e Descontos</div>
              <div class="chart-box q-mt-xs"><Doughnut :data="pieData" :options="pieOptions" /></div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- ═══════ TABELA 1: EXTRACTO DE DESEMBOLSOS (LOAN TAPE) ═══════ -->
      <q-card flat bordered class="statement-card q-mb-md" data-tour="fin-rep-desembolsos">
        <q-card-section class="q-py-xs row items-center justify-between border-b">
          <div class="row items-center no-wrap">
            <q-icon name="request_quote" size="18px" color="primary" class="q-mr-xs" />
            <div>
              <div class="text-caption text-weight-bold text-slate-800 text-uppercase">
                Desembolsos da Carteira ({{ desembolsos.length }})
              </div>
              <div class="text-caption text-grey-6">Total Desembolsado: <strong class="font-mono">{{ money(totalDesembolsado) }}</strong></div>
            </div>
          </div>
          <q-input
            v-model="searchLoans"
            dense
            outlined
            clearable
            placeholder="Pesquisar cliente ou conta..."
            style="max-width: 240px"
            input-style="font-size: 12px"
          >
            <template v-slot:prepend><q-icon name="search" size="14px" color="grey-6" /></template>
          </q-input>
        </q-card-section>

        <q-table
          :rows="filteredDesembolsos"
          :columns="loanColumns"
          row-key="id"
          flat
          dense
          separator="horizontal"
          :loading="loading"
          :pagination="{ rowsPerPage: 10 }"
          :rows-per-page-options="[10, 25, 50]"
          class="reports-table"
        >
          <template v-slot:no-data>
            <div class="full-width text-center q-pa-xl text-grey-6">
              <q-icon name="savings" size="42px" color="grey-4" />
              <div class="q-mt-sm">Nenhum desembolso encontrado para <strong>{{ walletLabel }}</strong> no período.</div>
            </div>
          </template>

          <template v-slot:body-cell-customerName="props">
            <q-td :props="props">
              <div class="text-weight-bold text-slate-900" style="font-size: 12px">{{ props.row.customerName }}</div>
              <div class="text-caption text-grey-6 font-mono">Conta: {{ props.row.accountNumber || '—' }}</div>
            </q-td>
          </template>

          <template v-slot:body-cell-disbursementDate="props">
            <q-td :props="props" class="text-center font-mono">{{ formatDate(props.row.disbursementDate) }}</q-td>
          </template>

          <template v-slot:body-cell-amount="props">
            <q-td :props="props" class="text-right font-mono text-weight-bold text-primary">{{ money(props.row.amount) }}</q-td>
          </template>

          <template v-slot:body-cell-rate="props">
            <q-td :props="props" class="text-center font-mono">
              {{ (Number(props.row.interestRate) * 100).toFixed(1) }}%
            </q-td>
          </template>

          <template v-slot:body-cell-saldo_devedor="props">
            <q-td :props="props" class="text-right font-mono text-amber-9">{{ money(props.row.saldo_devedor) }}</q-td>
          </template>

          <template v-slot:body-cell-mora_gerada="props">
            <q-td :props="props" class="text-right font-mono" :class="Number(props.row.mora_gerada) > 0 ? 'text-negative' : 'text-grey-6'">
              {{ money(props.row.mora_gerada) }}
            </q-td>
          </template>

          <template v-slot:body-cell-estado="props">
            <q-td :props="props" class="text-center">
              <q-badge
                :color="loanStatusBadgeColor(props.row)"
                :label="loanStatusLabel(props.row)"
                style="font-size: 10px"
              />
            </q-td>
          </template>
        </q-table>
      </q-card>

      <!-- ═══════ TABELA 2: EXTRACTO DE RECEBIMENTOS ═══════ -->
      <q-card flat bordered class="statement-card">
        <q-card-section class="q-py-xs row items-center justify-between border-b">
          <div class="row items-center no-wrap">
            <q-icon name="payments" size="18px" color="positive" class="q-mr-xs" />
            <div>
              <div class="text-caption text-weight-bold text-slate-800 text-uppercase">
                Recebimentos da Carteira ({{ recebimentos.length }})
              </div>
              <div class="text-caption text-grey-6">Total Recebido: <strong class="font-mono text-positive">{{ money(totalRecebido) }}</strong></div>
            </div>
          </div>
          <q-input
            v-model="searchTx"
            dense
            outlined
            clearable
            placeholder="Pesquisar cliente ou crédito..."
            style="max-width: 240px"
            input-style="font-size: 12px"
          >
            <template v-slot:prepend><q-icon name="search" size="14px" color="grey-6" /></template>
          </q-input>
        </q-card-section>

        <q-table
          :rows="filteredRecebimentos"
          :columns="txColumns"
          row-key="id"
          flat
          dense
          separator="horizontal"
          :loading="loading"
          :pagination="{ rowsPerPage: 10 }"
          :rows-per-page-options="[10, 25, 50]"
          class="reports-table"
        >
          <template v-slot:no-data>
            <div class="full-width text-center q-pa-xl text-grey-6">
              <q-icon name="payments" size="42px" color="grey-4" />
              <div class="q-mt-sm">Nenhum recebimento registado para <strong>{{ walletLabel }}</strong> no período.</div>
            </div>
          </template>

          <template v-slot:body-cell-paymentDate="props">
            <q-td :props="props" class="text-center font-mono">{{ formatDate(props.row.paymentDate) }}</q-td>
          </template>

          <template v-slot:body-cell-customerName="props">
            <q-td :props="props">
              <div class="text-weight-bold text-slate-900" style="font-size: 12px">{{ props.row.customerName }}</div>
              <div class="text-caption text-grey-6 font-mono">Crédito #{{ props.row.loanId || '—' }}</div>
            </q-td>
          </template>

          <template v-slot:body-cell-amount="props">
            <q-td :props="props" class="text-right font-mono text-weight-bold text-positive">{{ money(props.row.amount) }}</q-td>
          </template>

          <template v-slot:body-cell-juros="props">
            <q-td :props="props" class="text-right font-mono">{{ money(props.row.juros) }}</q-td>
          </template>

          <template v-slot:body-cell-mora="props">
            <q-td :props="props" class="text-right font-mono text-amber-9">{{ money(props.row.mora) }}</q-td>
          </template>

          <template v-slot:body-cell-paymentMethod="props">
            <q-td :props="props" class="text-center font-mono text-caption">
              {{ props.row.paymentMethod || '—' }}
            </q-td>
          </template>

          <template v-slot:body-cell-recibo_numero="props">
            <q-td :props="props" class="text-center font-mono text-caption">
              {{ props.row.recibo_numero || '—' }}
            </q-td>
          </template>
        </q-table>
      </q-card>
    </template>

    <!-- ═══════ DIALOG: ENVIAR POR E-MAIL ═══════ -->
    <q-dialog v-model="emailDialog" persistent>
      <q-card class="dialog-md">
        <q-card-section class="row items-center bg-slate-900 text-white q-py-sm">
          <q-icon name="mail" size="20px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Enviar Relatório ao Financiador</div>
          <q-space />
          <q-btn flat round dense icon="close" color="white" @click="emailDialog = false" />
        </q-card-section>

        <q-card-section class="q-gutter-y-sm q-pa-md">
          <q-select
            v-model="emailForm.to"
            use-chips
            multiple
            use-input
            new-value-mode="add-unique"
            outlined
            dense
            :options="emailSuggestions"
            label="E-mail(s) Destinatário(s) *"
            hint="Pressione Enter para adicionar múltiplos destinatários"
            input-debounce="0"
          >
            <template v-slot:prepend><q-icon name="mail" size="16px" color="grey-6" /></template>
          </q-select>

          <q-input v-model="emailForm.subject" outlined dense label="Assunto da Mensagem *" />
          <q-input v-model="emailForm.message" outlined dense type="textarea" rows="4" label="Corpo do E-mail" />

          <div class="bg-blue-1 text-blue-10 q-pa-sm rounded-borders text-caption row items-center" style="border: 1px solid #bfdbfe">
            <q-icon name="attach_file" size="16px" class="q-mr-xs text-primary" />
            <span>
              Anexo gerado automaticamente: <strong>Relatório_{{ walletCode }}_{{ periodoLabel.replace(/\//g, '-') }}.xlsx</strong>
            </span>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-px-md q-py-sm">
          <q-btn flat no-caps label="Cancelar" color="grey-7" @click="emailDialog = false" />
          <q-btn
            unelevated
            no-caps
            color="positive"
            icon="send"
            label="Enviar E-mail"
            :loading="sending"
            @click="sendEmail"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { api } from '@/boot/axios'
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { useAuthStore } from '@/stores/auth'
import { useWalletsStore } from '@/stores/wallets'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const $q = useQuasar()
const route = useRoute()
const authStore = useAuthStore()
const walletsStore = useWalletsStore()

const walletId = ref(null)
const fromDisplay = ref('')
const toDisplay = ref('')
const activeQuickRange = ref('month')
const emails = ref([])
const emailSuggestions = ref([])
const loading = ref(false)
const sending = ref(false)
const report = ref(null)
const searchLoans = ref('')
const searchTx = ref('')

const money = (value) => `${(Number(value) || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`

const walletOptions = computed(() =>
  walletsStore.walletOptions.map((option) => ({ ...option, saldo: option.saldo }))
)
const currentWallet = computed(() => walletsStore.walletById(walletId.value))
const walletCode = computed(() => currentWallet.value?.codigo || 'FINANCIADOR')
const walletLabel = computed(() => currentWallet.value ? `${currentWallet.value.codigo} · ${currentWallet.value.nome}` : 'a carteira')

const desembolsos = computed(() => report.value?.desembolsos || [])
const recebimentos = computed(() => report.value?.recebimentos || [])
const totalDesembolsado = computed(() => round(desembolsos.value.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)))
const totalRecebido = computed(() => round(recebimentos.value.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)))

const filteredDesembolsos = computed(() => filterRows(desembolsos.value, searchLoans.value))
const filteredRecebimentos = computed(() => filterRows(recebimentos.value, searchTx.value))

const periodoLabel = computed(() => {
  const from = fromDisplay.value || '—'
  const to = toDisplay.value || '—'
  return `${from} a ${to}`
})

// ─── Consolidação dos 3 Blocos Executivos ───
const blocoCapital = computed(() => {
  const r = report.value?.resumo || {}
  const alocadoNum = r.capital_alocado === null || r.capital_alocado === undefined ? null : Number(r.capital_alocado)
  const utilizacaoVal = Math.round((Number(r.utilizacao) || 0) * 100)
  return {
    alocado: alocadoNum === null ? 'Sem limite contratual' : money(alocadoNum),
    desembolsadoPeriodo: money(r.desembolsado_periodo),
    disponivel: r.saldo_analitico === null || r.saldo_analitico === undefined ? 'Sem limite' : money(r.saldo_analitico),
    utilizacao: utilizacaoVal
  }
})

const blocoRetorno = computed(() => {
  const r = report.value?.resumo || {}
  const dist = report.value?.distribuicao_recebimentos || {}
  return {
    totalRecebido: money(r.recebido_periodo),
    capitalAmortizado: money(dist.capital || 0),
    jurosRecebidos: money(r.juros_periodo),
    moraRecebida: money(r.mora_periodo),
    jurosGerados: money(r.juros_gerados)
  }
})

const blocoQualidade = computed(() => {
  const r = report.value?.resumo || {}
  return {
    saldoAReceber: money(r.saldo_a_receber),
    previsaoLucro: money(r.previsao_lucro),
    taxaMedia: r.taxa_media === null || r.taxa_media === undefined ? '—' : `${(Number(r.taxa_media) * 100).toFixed(2)}%`,
    prestacoesPagas: `${Number(r.prestacoes_pagas) || 0} de ${Number(r.prestacoes_total) || 0}`,
    emAtrasoCount: Number(r.prestacoes_atraso) || 0
  }
})

const loanColumns = [
  { name: 'customerName', label: 'Beneficiário / Conta', field: 'customerName', align: 'left', sortable: true },
  { name: 'disbursementDate', label: 'Data', field: 'disbursementDate', align: 'center', sortable: true },
  { name: 'amount', label: 'Capital', field: 'amount', align: 'right', sortable: true },
  { name: 'rate', label: 'Taxa', field: 'interestRate', align: 'center' },
  { name: 'saldo_devedor', label: 'Saldo Devedor', field: 'saldo_devedor', align: 'right', sortable: true },
  { name: 'mora_gerada', label: 'Mora Gerada', field: 'mora_gerada', align: 'right', sortable: true },
  { name: 'estado', label: 'Estado', field: 'status', align: 'center' }
]

const txColumns = [
  { name: 'paymentDate', label: 'Data', field: 'paymentDate', align: 'center', sortable: true },
  { name: 'customerName', label: 'Beneficiário / Ref', field: 'customerName', align: 'left', sortable: true },
  { name: 'amount', label: 'Total Recebido', field: 'amount', align: 'right', sortable: true },
  { name: 'juros', label: 'Juros', field: 'juros', align: 'right', sortable: true },
  { name: 'mora', label: 'Mora', field: 'mora', align: 'right', sortable: true },
  { name: 'paymentMethod', label: 'Canal', field: 'paymentMethod', align: 'center' },
  { name: 'recibo_numero', label: 'Nº Recibo', field: 'recibo_numero', align: 'center' }
]

const round = (value) => Math.round((Number(value) || 0) * 100) / 100

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'dd/MM/yyyy')
}

function toApiDate(display) {
  if (!display) return ''
  const parts = String(display).split('/')
  if (parts.length !== 3 || parts[2].length < 4) return ''
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

function filterRows(rows, term) {
  const search = String(term || '').trim().toLowerCase()
  if (!search) return rows
  return rows.filter((row) =>
    [row.customerName, row.accountNumber, row.recibo_numero, row.loanId]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search))
  )
}

function loanStatusLabel(row) {
  if (Number(row.status) === 3) return 'Liquidado'
  if (Number(row.prestacoes_atraso) > 0) return 'Em atraso'
  return 'Regular'
}

function loanStatusBadgeColor(row) {
  if (Number(row.status) === 3) return 'grey-6'
  if (Number(row.prestacoes_atraso) > 0) return 'negative'
  return 'positive'
}

/* ── Gráficos ── */
const pieColor = { capital: '#2563eb', juros: '#059669', mora: '#d97706', desconto: '#94a3b8' }

const barData = computed(() => {
  const serie = report.value?.serie_mensal || { meses: [], desembolsos: [], recebimentos: [] }
  return {
    labels: (serie.meses || []).map((mes) => {
      const [ano, mesNumero] = String(mes).split('-')
      const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return `${nomes[Number(mesNumero) - 1] || mesNumero}/${String(ano).slice(2)}`
    }),
    datasets: [
      { label: 'Desembolsado', data: serie.desembolsos || [], backgroundColor: '#3b82f6', borderRadius: 4 },
      { label: 'Recebido', data: serie.recebimentos || [], backgroundColor: '#10b981', borderRadius: 4 }
    ]
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
    tooltip: {
      backgroundColor: '#0f172a', padding: 8, cornerRadius: 8,
      callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.parsed.y)}` }
    }
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b' } },
    y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#64748b' } }
  }
}

const pieData = computed(() => {
  const dist = report.value?.distribuicao_recebimentos || { capital: 0, juros: 0, mora: 0, desconto: 0 }
  return {
    labels: ['Capital Principal', 'Juros Remuneratórios', 'Juros de Mora', 'Descontos'],
    datasets: [{
      data: [Number(dist.capital) || 0, Number(dist.juros) || 0, Number(dist.mora) || 0, Number(dist.desconto) || 0],
      backgroundColor: [pieColor.capital, pieColor.juros, pieColor.mora, pieColor.desconto],
      borderWidth: 0
    }]
  }
})

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
    tooltip: {
      backgroundColor: '#0f172a', padding: 8, cornerRadius: 8,
      callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.parsed)}` }
    }
  }
}

function applyQuickRange(range) {
  activeQuickRange.value = range
  const today = new Date()
  if (range === 'today') {
    fromDisplay.value = format(today, 'dd/MM/yyyy')
    toDisplay.value = format(today, 'dd/MM/yyyy')
  } else if (range === '7d') {
    fromDisplay.value = format(subDays(today, 6), 'dd/MM/yyyy')
    toDisplay.value = format(today, 'dd/MM/yyyy')
  } else if (range === 'month') {
    fromDisplay.value = format(startOfMonth(today), 'dd/MM/yyyy')
    toDisplay.value = format(endOfMonth(today), 'dd/MM/yyyy')
  } else {
    fromDisplay.value = format(startOfYear(today), 'dd/MM/yyyy')
    toDisplay.value = format(endOfYear(today), 'dd/MM/yyyy')
  }
  load()
}

function onWalletChange() {
  const carteira = currentWallet.value
  emails.value = carteira?.parceiro_email ? [carteira.parceiro_email] : []
  emailSuggestions.value = [carteira?.parceiro_email].filter(Boolean)
  load()
}

const queryString = () => {
  const params = new URLSearchParams()
  const from = toApiDate(fromDisplay.value)
  const to = toApiDate(toDisplay.value)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return params
}

async function load() {
  if (!walletId.value) {
    report.value = null
    return
  }
  loading.value = true
  try {
    const { data } = await api.get(`/api/reports/financiadores/${authStore.companyId}/${walletId.value}`, {
      params: Object.fromEntries(queryString().entries())
    })
    if (data.success) {
      report.value = data
      if (emails.value.length === 0 && data.carteira?.parceiro_email) {
        emails.value = [data.carteira.parceiro_email]
        emailSuggestions.value = [data.carteira.parceiro_email]
      }
    }
  } catch (error) {
    report.value = null
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao gerar o relatório', position: 'top' })
  } finally {
    loading.value = false
  }
}

async function exportExcel() {
  try {
    await walletsStore.downloadFile(
      `/api/reports/financiadores/${authStore.companyId}/${walletId.value}/excel?${queryString().toString()}`,
      `Relatorio_${walletCode.value}_${toApiDate(fromDisplay.value)}_${toApiDate(toDisplay.value)}.xlsx`
    )
    $q.notify({ type: 'positive', message: 'Ficheiro Excel gerado com sucesso (2 abas)', position: 'top' })
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao exportar o ficheiro Excel', position: 'top' })
  }
}

const emailDialog = ref(false)
const emailForm = ref({ to: [], subject: '', message: '' })

function openEmailDialog() {
  const resumo = report.value?.resumo || {}
  emailForm.value = {
    to: emails.value.length ? [...emails.value] : [currentWallet.value?.parceiro_email].filter(Boolean),
    subject: `Relatório de Financiamento ${walletCode.value} — Período ${periodoLabel.value}`,
    message:
      `Exmo(a). Sr(a). ${currentWallet.value?.parceiro_nome || 'Parceiro'},\n\n` +
      `Enviamos em anexo o relatório analítico do movimento da carteira ${currentWallet.value?.nome || ''} (${walletCode.value}) referente ao período de ${periodoLabel.value}.\n\n` +
      `Resumo das Movimentações:\n` +
      `• Desembolsado no período: ${money(resumo.desembolsado_periodo)}\n` +
      `• Total Recebido no período: ${money(resumo.recebido_periodo)}\n` +
      `• Juros recebidos: ${money(resumo.juros_periodo)}\n` +
      `• Saldo analítico disponível: ${resumo.saldo_analitico === null || resumo.saldo_analitico === undefined ? 'Sem limite' : money(resumo.saldo_analitico)}\n` +
      `• Saldo a receber dos clientes: ${money(resumo.saldo_a_receber)}\n\n` +
      `Atenciosamente,\n${report.value?.empresa?.name || 'Mais Mola'}`
  }
  emailDialog.value = true
}

async function sendEmail() {
  if (!emailForm.value.to?.length) {
    $q.notify({ type: 'warning', message: 'Indique pelo menos um destinatário de e-mail', position: 'top' })
    return
  }
  sending.value = true
  try {
    const recipients = [...emailForm.value.to]
    for (const recipient of recipients) {
      await api.post(
        `/api/reports/financiadores/${authStore.companyId}/${walletId.value}/email?${queryString().toString()}`,
        { email: recipient, subject: emailForm.value.subject, message: emailForm.value.message }
      )
    }
    $q.notify({ type: 'positive', message: `Relatório enviado com sucesso para ${recipients.join(', ')}`, position: 'top' })
    emailDialog.value = false
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Falha ao enviar e-mail', position: 'top' })
  } finally {
    sending.value = false
  }
}

function printView() {
  window.print()
}

watch(() => route.query.walletId, (value) => {
  if (value) {
    walletId.value = Number(value)
    onWalletChange()
  }
})

onMounted(async () => {
  applyQuickRange('month')
  await walletsStore.fetchWallets(authStore.companyId)
  if (route.query.walletId) {
    walletId.value = Number(route.query.walletId)
  } else if (walletOptions.value.length > 0) {
    walletId.value = walletOptions.value[0].value
  }
  onWalletChange()
})
</script>

<style lang="scss" scoped>
.financier-reports-page {
  background: #f8fafc;
  min-height: calc(100vh - 100px);
}

.filter-card, .statement-card, .empty-card {
  border-radius: 12px;
  background: #ffffff;
  border-color: #e2e8f0;
}

.statement-header {
  border-bottom: 1px solid #f1f5f9;
}

.metric-label {
  font-size: 11px;
  color: #64748b;
}

.metric-val {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}

.code-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 6px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  font-size: 11px;
  font-weight: 700;
}

.border-b {
  border-bottom: 1px solid #e2e8f0;
}

.border-t {
  border-top: 1px solid #f1f5f9;
}

.chart-box {
  height: 220px;
  position: relative;
}

.reports-table {
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

.dialog-md { width: 560px; max-width: 95vw; border-radius: 14px; }

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.text-slate-900 { color: #0f172a; }
.text-slate-800 { color: #1e293b; }

body.body--dark {
  .financier-reports-page { background: #0f172a; }
  .filter-card, .statement-card, .empty-card {
    background: #1e293b;
    border-color: #334155;
  }
  .statement-header, .border-b, .border-t {
    border-color: #334155;
  }
  .text-slate-900, .metric-val { color: #f8fafc; }
  .code-badge {
    background: #1e3a8a;
    border-color: #2563eb;
    color: #bfdbfe;
  }
}
</style>
