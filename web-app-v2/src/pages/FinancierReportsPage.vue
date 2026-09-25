<template>
  <q-page class="financier-reports-page q-pa-md">
    <!-- ═══════ FILTROS ═══════ -->
    <q-card flat class="glass-card q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center q-py-sm">
        <div class="col-12 col-lg-4">
          <q-select
            v-model="walletId"
            :options="walletOptions"
            outlined dense
            emit-value map-options
            label="Carteira / Fundo *"
            @update:model-value="onWalletChange"
          >
            <template v-slot:prepend><q-icon name="savings" size="16px" color="grey-5" /></template>
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar><q-badge :color="scope.opt.cor || 'blue'" :label="scope.opt.codigo" /></q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>
                    {{ scope.opt.parceiro ? `Parceiro: ${scope.opt.parceiro}` : 'Fundo próprio MBRM' }}
                    <span v-if="scope.opt.saldo !== null && scope.opt.saldo !== undefined">
                      · disponível {{ money(scope.opt.saldo) }}
                    </span>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>

        <!-- Datas em dd/mm/yyyy -->
        <div class="col-6 col-lg-2">
          <q-input v-model="fromDisplay" outlined dense label="De" mask="##/##/####" placeholder="dd/mm/aaaa">
            <template v-slot:prepend>
              <q-icon name="event" size="16px" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="fromDisplay" mask="DD/MM/YYYY" locale="pt" :today-btn="true" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div class="col-6 col-lg-2">
          <q-input v-model="toDisplay" outlined dense label="Até" mask="##/##/####" placeholder="dd/mm/aaaa">
            <template v-slot:prepend>
              <q-icon name="event" size="16px" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="toDisplay" mask="DD/MM/YYYY" locale="pt" :today-btn="true" />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div class="col-12 col-lg q-gutter-xs no-wrap">
          <q-btn outline no-caps rounded size="sm" label="Hoje" @click="applyQuickRange('today')" />
          <q-btn outline no-caps rounded size="sm" label="7 dias" @click="applyQuickRange('7d')" />
          <q-btn outline no-caps rounded size="sm" label="Este mês" @click="applyQuickRange('month')" />
          <q-btn outline no-caps rounded size="sm" label="Este ano" @click="applyQuickRange('year')" />
        </div>
        <div class="col-12 col-lg-auto">
          <q-btn color="primary" unelevated no-caps rounded size="sm" icon="filter_alt" label="Aplicar" :loading="loading" @click="load" />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="row q-col-gutter-sm items-center q-py-sm">
        <div class="col-12 col-lg-5">
          <q-select
            v-model="emails"
            use-input use-chips
            multiple hide-dropdown-icon
            input-debounce="0"
            outlined dense
            :options="emailSuggestions"
            label="E-mail(s) destinatário(s)"
            hint="Por defeito, o e-mail do parceiro configurado na carteira"
            new-value-mode="add-unique"
            @new-value="onNewEmail"
          >
            <template v-slot:prepend><q-icon name="mail" size="16px" color="grey-5" /></template>
          </q-select>
        </div>
        <div class="col-12 col-lg q-gutter-xs no-wrap">
          <q-btn color="positive" unelevated no-caps rounded icon="forward_to_inbox" label="Enviar por e-mail" :disable="!walletId" @click="openEmailDialog" />
          <q-btn color="primary" outline no-caps rounded icon="grid_on" label="Exportar Excel (2 abas)" :disable="!walletId" @click="exportExcel" />
          <q-btn color="grey-8" outline no-caps rounded icon="print" label="Imprimir / PDF" :disable="!walletId" @click="printView" />
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════ SEM CARTEIRA ═══════ -->
    <q-card v-if="!walletId" flat class="glass-card text-center q-pa-xl">
      <q-icon name="assessment" size="52px" color="grey-4" />
      <div class="text-subtitle1 text-grey-6 q-mt-sm">Escolha uma carteira para gerar o relatório do financiador</div>
      <div class="text-caption text-grey-5">O relatório mostra apenas desembolsos e recebimentos desta carteira.</div>
    </q-card>

    <template v-else>
      <!-- ═══════ CABEÇALHO DA CARTEIRA ═══════ -->
      <q-card v-if="report?.carteira" flat class="glass-card q-mb-md">
        <q-card-section class="row items-center q-py-sm">
          <q-badge :color="report.carteira.cor_badge || 'blue'" :label="report.carteira.codigo" class="q-mr-sm" />
          <div class="col">
            <div class="text-weight-bold">{{ report.carteira.nome }}</div>
            <div class="text-caption text-grey-6">
              {{ report.empresa?.name || 'Empresa' }} · NUIT {{ report.empresa?.nuit || '—' }} ·
              período {{ periodoLabel }}
            </div>
          </div>
          <q-btn flat dense no-caps color="primary" icon="refresh" label="Actualizar" :loading="loading" @click="load" />
        </q-card-section>
      </q-card>

      <!-- ═══════ KPIs ═══════ -->
      <div class="row q-col-gutter-md q-mb-md">
        <div v-for="item in resumoItems" :key="item.label" class="col-6 col-md-4 col-lg-3">
          <q-card flat class="glass-tile q-pa-md">
            <div class="row items-center no-wrap">
              <div class="tile-icon q-mr-sm" :style="{ background: item.bg }">
                <q-icon :name="item.icon" size="18px" :color="item.color" />
              </div>
              <div style="min-width: 0">
                <div class="text-caption text-grey-6">{{ item.label }}</div>
                <div class="text-subtitle2 text-weight-bold" :class="item.class">{{ item.value }}</div>
                <div v-if="item.hint" class="text-caption text-grey-5">{{ item.hint }}</div>
              </div>
            </div>
          </q-card>
        </div>
      </div>

      <!-- ═══════ GRÁFICOS ═══════ -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-lg-7">
          <q-card flat class="glass-card">
            <q-card-section>
              <div class="text-subtitle2 text-weight-bold">Desembolsado vs Recebido por mês</div>
              <div class="text-caption text-grey-6">Movimento da carteira no período selecionado</div>
              <div class="chart-box q-mt-sm"><Bar :data="barData" :options="barOptions" /></div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-lg-5">
          <q-card flat class="glass-card">
            <q-card-section>
              <div class="text-subtitle2 text-weight-bold">Composição dos recebimentos</div>
              <div class="text-caption text-grey-6">Capital, juros, mora e descontos</div>
              <div class="chart-box q-mt-sm"><Doughnut :data="pieData" :options="pieOptions" /></div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- ═══════ DESEMBOLSOS ═══════ -->
      <q-card flat class="glass-card q-mb-md">
        <q-card-section class="row items-center q-py-sm">
          <q-icon name="request_quote" size="20px" color="primary" class="q-mr-sm" />
          <div class="col">
            <div class="text-subtitle2 text-weight-bold">Desembolsos da carteira ({{ desembolsos.length }})</div>
            <div class="text-caption text-grey-6">Total: <strong>{{ money(totalDesembolsado) }}</strong></div>
          </div>
          <q-input v-model="searchLoans" dense outlined clearable placeholder="Pesquisar cliente" style="max-width: 220px" input-style="font-size: 13px">
            <template v-slot:prepend><q-icon name="search" size="16px" color="grey-5" /></template>
          </q-input>
        </q-card-section>
        <q-separator />
        <q-table
          :rows="filteredDesembolsos"
          :columns="loanColumns"
          row-key="id"
          flat dense separator="horizontal"
          :loading="loading"
          :pagination="{ rowsPerPage: 10 }"
          :rows-per-page-options="[10, 25, 50]"
        >
          <template v-slot:no-data>
            <div class="full-width text-center q-pa-xl text-grey-6">
              <q-icon name="savings" size="42px" color="grey-4" />
              <div class="q-mt-sm">
                Nenhum desembolso encontrado para
                <strong>{{ walletLabel }}</strong> no período {{ periodoLabel }}.
              </div>
              <div class="text-caption text-grey-5">Tente ajustar os filtros ou alargar o período.</div>
              <q-btn flat dense no-caps color="primary" label="Limpar filtros" class="q-mt-sm" @click="clearFilters" />
            </div>
          </template>
          <template v-slot:body-cell-customerName="props">
            <q-td :props="props">
              <div class="row items-center no-wrap">
                <q-avatar size="26px" color="primary" text-color="white" class="q-mr-sm" style="font-size: 11px">
                  {{ initials(props.row.customerName) }}
                </q-avatar>
                <div style="min-width: 0">
                  <div class="ellipsis">{{ props.row.customerName }}</div>
                  <div class="text-caption text-grey-6">Conta {{ props.row.accountNumber || '—' }}</div>
                </div>
              </div>
            </q-td>
          </template>
          <template v-slot:body-cell-disbursementDate="props">
            <q-td :props="props" class="text-center">{{ formatDate(props.row.disbursementDate) }}</q-td>
          </template>
          <template v-slot:body-cell-amount="props">
            <q-td :props="props" class="text-right text-weight-bold">{{ money(props.row.amount) }}</q-td>
          </template>
          <template v-slot:body-cell-rate="props">
            <q-td :props="props" class="text-center">
              <q-badge outline color="deep-purple" :label="`${(Number(props.row.interestRate) * 100).toFixed(2)}%`" />
            </q-td>
          </template>
          <template v-slot:body-cell-saldo_devedor="props">
            <q-td :props="props" class="text-right">{{ money(props.row.saldo_devedor) }}</q-td>
          </template>
          <template v-slot:body-cell-mora_gerada="props">
            <q-td :props="props" class="text-right" :class="Number(props.row.mora_gerada) > 0 ? 'text-negative' : ''">
              {{ money(props.row.mora_gerada) }}
            </q-td>
          </template>
          <template v-slot:body-cell-estado="props">
            <q-td :props="props" class="text-center">
              <q-badge :color="loanStatusColor(props.row)" :label="loanStatusLabel(props.row)" />
            </q-td>
          </template>
        </q-table>
        <q-separator v-if="filteredDesembolsos.length > 0" />
        <q-card-section v-if="filteredDesembolsos.length > 0" class="row items-center q-py-xs text-caption">
          <div class="col text-grey-6">Total do filtro</div>
          <div class="text-weight-bold">{{ money(totalFiltradoDesembolsos) }}</div>
        </q-card-section>
      </q-card>

      <!-- ═══════ RECEBIMENTOS ═══════ -->
      <q-card flat class="glass-card">
        <q-card-section class="row items-center q-py-sm">
          <q-icon name="payments" size="20px" color="positive" class="q-mr-sm" />
          <div class="col">
            <div class="text-subtitle2 text-weight-bold">Recebimentos da carteira ({{ recebimentos.length }})</div>
            <div class="text-caption text-grey-6">Total: <strong>{{ money(totalRecebido) }}</strong></div>
          </div>
          <q-input v-model="searchTx" dense outlined clearable placeholder="Pesquisar cliente" style="max-width: 220px" input-style="font-size: 13px">
            <template v-slot:prepend><q-icon name="search" size="16px" color="grey-5" /></template>
          </q-input>
        </q-card-section>
        <q-separator />
        <q-table
          :rows="filteredRecebimentos"
          :columns="txColumns"
          row-key="id"
          flat dense separator="horizontal"
          :loading="loading"
          :pagination="{ rowsPerPage: 10 }"
          :rows-per-page-options="[10, 25, 50]"
        >
          <template v-slot:no-data>
            <div class="full-width text-center q-pa-xl text-grey-6">
              <q-icon name="payments" size="42px" color="grey-4" />
              <div class="q-mt-sm">
                Nenhum recebimento encontrado para
                <strong>{{ walletLabel }}</strong> no período {{ periodoLabel }}.
              </div>
              <div class="text-caption text-grey-5">Tente ajustar os filtros ou alargar o período.</div>
              <q-btn flat dense no-caps color="primary" label="Limpar filtros" class="q-mt-sm" @click="clearFilters" />
            </div>
          </template>
          <template v-slot:body-cell-paymentDate="props">
            <q-td :props="props" class="text-center">{{ formatDate(props.row.paymentDate) }}</q-td>
          </template>
          <template v-slot:body-cell-customerName="props">
            <q-td :props="props">
              <div class="ellipsis">{{ props.row.customerName }}</div>
              <div class="text-caption text-grey-6">Crédito {{ props.row.loanId || '—' }}</div>
            </q-td>
          </template>
          <template v-slot:body-cell-amount="props">
            <q-td :props="props" class="text-right text-weight-bold text-positive">{{ money(props.row.amount) }}</q-td>
          </template>
          <template v-slot:body-cell-juros="props">
            <q-td :props="props" class="text-right">{{ money(props.row.juros) }}</q-td>
          </template>
          <template v-slot:body-cell-mora="props">
            <q-td :props="props" class="text-right">{{ money(props.row.mora) }}</q-td>
          </template>
          <template v-slot:body-cell-paymentMethod="props">
            <q-td :props="props" class="text-center text-caption">{{ props.row.paymentMethod || '—' }}</q-td>
          </template>
          <template v-slot:body-cell-recibo_numero="props">
            <q-td :props="props" class="text-center">
              <span v-if="props.row.recibo_numero">{{ props.row.recibo_numero }}</span>
              <span v-else class="text-caption text-grey-5">—</span>
            </q-td>
          </template>
        </q-table>
        <q-separator v-if="filteredRecebimentos.length > 0" />
        <q-card-section v-if="filteredRecebimentos.length > 0" class="row items-center q-py-xs text-caption">
          <div class="col text-grey-6">Total do filtro</div>
          <div class="text-weight-bold text-positive">{{ money(totalFiltradoRecebimentos) }}</div>
        </q-card-section>
      </q-card>
    </template>

    <!-- ═══════ DIALOG: ENVIAR POR E-MAIL ═══════ -->
    <q-dialog v-model="emailDialog" persistent>
      <q-card class="dialog-md">
        <q-card-section class="row items-center dialog-head">
          <q-icon name="mail" size="20px" class="q-mr-sm" />
          <div class="text-h6">Enviar relatório por e-mail</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="emailDialog = false" />
        </q-card-section>
        <q-card-section class="q-gutter-y-md">
          <q-select
            v-model="emailForm.to"
            use-chips multiple use-input new-value-mode="add-unique"
            outlined dense :options="emailSuggestions"
            label="E-mail(s) destinatário(s) *"
            input-debounce="0"
          >
            <template v-slot:prepend><q-icon name="mail" size="16px" color="grey-5" /></template>
          </q-select>
          <q-input v-model="emailForm.subject" outlined dense label="Assunto *" />
          <q-input v-model="emailForm.message" outlined dense type="textarea" autogrow label="Mensagem" />
          <q-banner dense rounded class="bg-blue-1 text-blue-10">
            <template v-slot:avatar><q-icon name="attach_file" /></template>
            Anexos: <strong>Relatório_{{ walletCode }}_{{ periodoLabel.replace(/\//g, '-') }}.xlsx</strong>
            (2 abas: Desembolsos e Recebimentos). O resumo do período segue no corpo do e-mail.
          </q-banner>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancelar" @click="emailDialog = false" />
          <q-btn unelevated rounded no-caps color="positive" icon="send" label="Enviar" :loading="sending" @click="sendEmail" />
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
import { getInitials } from '@/utils/formatters'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

/**
 * RELATÓRIO DE FINANCIADOR — isolado por carteira (nunca mistura fundos).
 * Datas em dd/mm/yyyy, KPIs de acompanhamento, tabelas com pesquisa e
 * totalizadores, gráficos e envio por e-mail com Excel (2 abas) em anexo.
 * O relatório oficial do Banco de Moçambique continua consolidado, sem
 * discriminar carteiras.
 */
const $q = useQuasar()
const route = useRoute()
const authStore = useAuthStore()
const walletsStore = useWalletsStore()

const walletId = ref(null)
const fromDisplay = ref('')
const toDisplay = ref('')
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
const totalFiltradoDesembolsos = computed(() => round(filteredDesembolsos.value.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)))
const totalFiltradoRecebimentos = computed(() => round(filteredRecebimentos.value.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)))

const periodoLabel = computed(() => {
  const from = fromDisplay.value || '—'
  const to = toDisplay.value || '—'
  return `${from} a ${to}`
})

const resumoItems = computed(() => {
  const r = report.value?.resumo || {}
  return [
    {
      label: 'Capital alocado', value: r.capital_alocado === null || r.capital_alocado === undefined ? 'Sem limite' : money(r.capital_alocado),
      icon: 'account_balance', color: 'blue-7', bg: 'rgba(37,99,235,0.12)'
    },
    {
      label: 'Desembolsado no período', value: money(r.desembolsado_periodo),
      hint: `${Number(r.num_desembolsos_periodo) || 0} crédito(s)`, icon: 'arrow_upward', color: 'indigo-7', bg: 'rgba(79,70,229,0.12)'
    },
    {
      label: 'Recebido no período', value: money(r.recebido_periodo),
      hint: `${Number(r.num_recebimentos) || 0} recebimento(s)`, icon: 'arrow_downward', color: 'green-7', bg: 'rgba(5,150,105,0.12)', class: 'text-positive'
    },
    {
      label: 'Juros recebidos no período', value: money(r.juros_periodo),
      icon: 'savings', color: 'teal', bg: 'rgba(13,148,136,0.12)'
    },
    {
      label: 'Mora recebida no período', value: money(r.mora_periodo),
      icon: 'warning_amber', color: 'deep-orange', bg: 'rgba(234,88,12,0.12)'
    },
    {
      label: 'Saldo analítico disponível', value: r.saldo_analitico === null || r.saldo_analitico === undefined ? 'Sem limite' : money(r.saldo_analitico),
      hint: `${Math.round((Number(r.utilizacao) || 0) * 100)}% utilizado`, icon: 'account_balance_wallet', color: 'green-7', bg: 'rgba(5,150,105,0.12)', class: 'text-positive'
    },
    {
      label: 'Saldo a receber dos clientes', value: money(r.saldo_a_receber),
      hint: `${Number(r.prestacoes_pendentes) || 0} prestação(ões) pendente(s)`,
      icon: 'pending_actions', color: 'deep-orange', bg: 'rgba(234,88,12,0.12)', class: 'text-deep-orange'
    },
    {
      label: 'Créditos / recebimentos', value: `${Number(r.num_creditos) || 0} / ${Number(r.num_recebimentos) || 0}`,
      icon: 'sync_alt', color: 'grey-8', bg: 'rgba(100,116,139,0.12)'
    },
    {
      label: 'Taxa média da carteira', value: r.taxa_media === null || r.taxa_media === undefined ? '—' : `${(Number(r.taxa_media) * 100).toFixed(2)}%`,
      icon: 'percent', color: 'deep-purple', bg: 'rgba(124,58,237,0.12)'
    },
    {
      label: 'Juros gerados (carteira)', value: money(r.juros_gerados),
      hint: 'Total previsto no plano de amortização', icon: 'functions', color: 'indigo-7', bg: 'rgba(79,70,229,0.12)'
    },
    {
      label: 'Previsão de lucro', value: money(r.previsao_lucro),
      hint: 'Juros previstos − juros recebidos', icon: 'trending_up', color: 'deep-purple', bg: 'rgba(124,58,237,0.12)', class: 'text-deep-purple'
    },
    {
      label: 'Prestações pagas', value: `${Number(r.prestacoes_pagas) || 0} / ${Number(r.prestacoes_total) || 0}`,
      hint: `${Number(r.prestacoes_atraso) || 0} em atraso`, icon: 'task_alt', color: 'green-7', bg: 'rgba(5,150,105,0.12)'
    }
  ]
})

const loanColumns = [
  { name: 'id', label: 'N.º', field: 'id', align: 'center', sortable: true },
  { name: 'customerName', label: 'Cliente', field: 'customerName', align: 'left', sortable: true },
  { name: 'disbursementDate', label: 'Data desembolso', field: 'disbursementDate', align: 'center', sortable: true },
  { name: 'amount', label: 'Montante', field: 'amount', align: 'right', sortable: true },
  { name: 'rate', label: 'Taxa', field: 'interestRate', align: 'center' },
  { name: 'saldo_devedor', label: 'Saldo devedor', field: 'saldo_devedor', align: 'right', sortable: true },
  { name: 'mora_gerada', label: 'Mora gerada', field: 'mora_gerada', align: 'right', sortable: true },
  { name: 'estado', label: 'Estado', field: 'status', align: 'center' }
]
const txColumns = [
  { name: 'paymentDate', label: 'Data', field: 'paymentDate', align: 'center', sortable: true },
  { name: 'customerName', label: 'Cliente', field: 'customerName', align: 'left', sortable: true },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right', sortable: true },
  { name: 'juros', label: 'Juros', field: 'juros', align: 'right', sortable: true },
  { name: 'mora', label: 'Mora', field: 'mora', align: 'right', sortable: true },
  { name: 'paymentMethod', label: 'Método', field: 'paymentMethod', align: 'center' },
  { name: 'recibo_numero', label: 'Recibo', field: 'recibo_numero', align: 'center' }
]

/* ── Formatação/utilitários ── */
const round = (value) => Math.round((Number(value) || 0) * 100) / 100
const initials = (name) => getInitials(name || '?')

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'dd/MM/yyyy')
}

/** dd/mm/yyyy (ecrã) → yyyy-mm-dd (API) */
function toApiDate(display) {
  if (!display) return ''
  const parts = String(display).split('/')
  if (parts.length !== 3 || parts[2].length < 4) return ''
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

/** yyyy-mm-dd (API) → dd/mm/yyyy (ecrã) */
function toDisplayDate(apiDate) {
  if (!apiDate) return ''
  const parts = String(apiDate).slice(0, 10).split('-')
  if (parts.length !== 3) return ''
  return `${parts[2]}/${parts[1]}/${parts[0]}`
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
  return 'Activo'
}
function loanStatusColor(row) {
  if (Number(row.status) === 3) return 'grey-6'
  if (Number(row.prestacoes_atraso) > 0) return 'negative'
  return 'positive'
}

/* ── Gráficos ── */
const pieColor = { capital: '#1d4ed8', juros: '#0d9488', mora: '#ea580c', desconto: '#94a3b8' }

const barData = computed(() => {
  const serie = report.value?.serie_mensal || { meses: [], desembolsos: [], recebimentos: [] }
  return {
    labels: (serie.meses || []).map((mes) => {
      const [ano, mesNumero] = String(mes).split('-')
      const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return `${nomes[Number(mesNumero) - 1] || mesNumero}/${String(ano).slice(2)}`
    }),
    datasets: [
      { label: 'Desembolsado', data: serie.desembolsos || [], backgroundColor: '#2563eb', borderRadius: 6 },
      { label: 'Recebido', data: serie.recebimentos || [], backgroundColor: '#16a34a', borderRadius: 6 }
    ]
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
    tooltip: {
      backgroundColor: '#0f172a', padding: 10, cornerRadius: 10,
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
    labels: ['Capital', 'Juros', 'Mora', 'Descontos'],
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
  cutout: '60%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
    tooltip: {
      backgroundColor: '#0f172a', padding: 10, cornerRadius: 10,
      callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.parsed)}` }
    }
  }
}

/* ── Filtros ── */
function applyQuickRange(range) {
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
}

function clearFilters() {
  applyQuickRange('month')
  searchLoans.value = ''
  searchTx.value = ''
  load()
}

function onWalletChange() {
  const carteira = currentWallet.value
  emails.value = carteira?.parceiro_email ? [carteira.parceiro_email] : []
  emailSuggestions.value = [carteira?.parceiro_email].filter(Boolean)
  load()
}

function onNewEmail(value, done) {
  const email = String(value || '').trim()
  if (email.includes('@')) done(email)
}

/* ── Carregamento ── */
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
    $q.notify({ type: 'positive', message: 'Excel gerado (2 abas)', position: 'top' })
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao exportar o Excel', position: 'top' })
  }
}

/* ── Envio por e-mail (dialog) ── */
const emailDialog = ref(false)
const emailForm = ref({ to: [], subject: '', message: '' })

function openEmailDialog() {
  const resumo = report.value?.resumo || {}
  emailForm.value = {
    to: emails.value.length ? [...emails.value] : [currentWallet.value?.parceiro_email].filter(Boolean),
    subject: `Relatório Financiador ${walletCode.value} - ${periodoLabel.value}`,
    message:
      `Exmo(a). Sr(a). ${currentWallet.value?.parceiro_nome || 'Parceiro'},\n\n` +
      `Segue o relatório do movimento da carteira ${currentWallet.value?.nome || ''} (${walletCode.value}) no período ${periodoLabel.value}.\n\n` +
      `• Desembolsado no período: ${money(resumo.desembolsado_periodo)}\n` +
      `• Recebido no período: ${money(resumo.recebido_periodo)}\n` +
      `• Juros recebidos: ${money(resumo.juros_periodo)}\n` +
      `• Saldo analítico disponível: ${resumo.saldo_analitico === null || resumo.saldo_analitico === undefined ? 'Sem limite' : money(resumo.saldo_analitico)}\n` +
      `• Saldo a receber dos clientes: ${money(resumo.saldo_a_receber)}\n\n` +
      `Com os melhores cumprimentos,\n${report.value?.empresa?.name || 'MBR Microcrédito'}`
  }
  emailDialog.value = true
}

async function sendEmail() {
  if (!emailForm.value.to?.length) {
    $q.notify({ type: 'warning', message: 'Indique pelo menos um destinatário', position: 'top' })
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
    $q.notify({ type: 'positive', message: `Relatório enviado para ${recipients.join(', ')}`, position: 'top' })
    emailDialog.value = false
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao enviar o e-mail', position: 'top' })
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

.glass-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.glass-tile {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(15, 23, 42, 0.06);
  height: 100%;
}

.tile-icon {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chart-box {
  height: 240px;
  position: relative;
}

.dialog-md { width: 620px; max-width: 95vw; border-radius: 18px; }

.dialog-head {
  background: linear-gradient(135deg, $primary, #16a34a);
  color: #fff;
}

body.body--dark {
  .financier-reports-page { background: #1a1a2e; }
  .glass-card, .glass-tile { background: rgba(30, 41, 59, 0.72); border-color: rgba(255, 255, 255, 0.06); }
}
</style>
