<template>
  <div class="q-pa-md">
    <!-- Selector do crédito -->
    <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="account_balance_wallet" size="20px" color="primary" />
        <div class="text-subtitle1 text-weight-bold">Plano de Amortização</div>
        <q-space />
        <q-select
          v-model="selectedLoanId"
          dense outlined
          :options="loanOptions"
          label="Crédito"
          emit-value map-options
          style="min-width: 220px"
          :disable="loanOptions.length <= 1"
        />
      </q-card-section>
    </q-card>

    <q-skeleton v-if="store.contextLoanLoading && contextInstallments.length === 0" type="rect" height="260px" style="border-radius: 12px" />

    <template v-else-if="contextLoan && contextInstallments.length > 0">
      <!-- KPIs do plano -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-6 col-sm-3" v-for="kpi in planKpis" :key="kpi.label">
          <q-card flat bordered style="border-radius: 12px">
            <q-card-section class="q-py-sm">
              <div class="text-caption text-grey-5" style="font-size: 10px">{{ kpi.label }}</div>
              <div class="text-weight-bold" :class="kpi.class">{{ kpi.value }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Acções -->
      <div class="row q-gutter-sm q-mb-md justify-end">
        <q-btn
          v-if="canRegisterPayment(authStore.userRole)"
          unelevated color="positive" icon="paid"
          label="Liquidar Dívida Total" no-caps rounded
          :disable="store.pendingInstallments.length === 0"
          @click="showLiquidateDialog = true"
        />
        <!-- FLUXO 2: extracto DINÂMICO — gerado on-demand no backend, sempre
             actualizado (pagamentos reais, mora, TAEG, estado por prestação). -->
        <q-btn unelevated color="primary" icon="picture_as_pdf" label="Baixar Extracto Atualizado (PDF)" no-caps rounded :disable="contextInstallments.length === 0" :loading="extracting" @click="printCreditExtract" />
        <q-btn outline color="grey-7" icon="description" label="Documentos Legais" no-caps rounded @click="$emit('go-to-legais')" />
      </div>

      <!-- Tabela pendentes -->
      <div v-if="store.pendingInstallments.length > 0" class="q-mb-lg">
        <div class="text-subtitle2 text-orange q-mb-xs">
          <q-icon name="schedule" size="16px" class="q-mr-xs" />Prestações pendentes ({{ store.pendingInstallments.length }})
        </div>
        <!-- Desktop: QTable | Mobile xs: QCards -->
        <q-table
          class="gt-xs amort-table"
          :rows="store.pendingInstallments" :columns="pendingColumns"
          row-key="id" flat dense hide-bottom :rows-per-page-options="[0]"
        >
          <template v-slot:body-cell-amortization="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.amortization) }}</q-td></template>
          <template v-slot:body-cell-rateAmount="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.rateAmount) }}</q-td></template>
          <template v-slot:body-cell-installment="props"><q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td></template>
          <template v-slot:body-cell-paidAmount="props">
            <q-td :props="props" class="text-right">
              <span v-if="props.row.paidAmount > 0" class="text-positive text-weight-bold">{{ formatMoney(props.row.paidAmount) }}</span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>
          <template v-slot:body-cell-status="props">
            <q-td :props="props" class="text-center">
              <q-badge v-if="Number(props.row.status) === -1" color="warning" text-color="white" rounded>Pago Parcial</q-badge>
              <q-badge v-else color="grey-4" text-color="grey-7" rounded>Pendente</q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-latePaymentInterest="props">
            <q-td :props="props" class="text-right" :class="props.row.latePaymentInterest > 0 ? 'text-negative text-weight-bold' : ''">{{ formatMoney(props.row.latePaymentInterest || 0) }}</q-td>
          </template>
          <template v-slot:body-cell-totalToPay="props"><q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(installmentTotalDue(props.row)) }}</q-td></template>
          <template v-slot:body-cell-dueDate="props"><q-td :props="props" class="text-right">{{ formatDateShort(props.row.dueDate) }}</q-td></template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn v-if="canRegisterPayment(authStore.userRole)" dense flat round icon="credit_card" size="sm" color="orange" @click="openPayment(props.row, 'full')">
                <q-tooltip>Pagar prestação</q-tooltip>
              </q-btn>
              <q-btn v-if="canRegisterPayment(authStore.userRole)" dense flat round icon="content_cut" size="sm" color="teal" @click="openPayment(props.row, 'partial')">
                <q-tooltip>Pagamento parcial</q-tooltip>
              </q-btn>
              <q-btn v-if="canRegisterPayment(authStore.userRole)" dense flat round icon="sell" size="sm" color="primary" @click="openPayment(props.row, 'discount')">
                <q-tooltip>Pagar com desconto</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <!-- Mobile (xs): cartões -->
        <div class="lt-sm">
          <q-card v-for="row in store.pendingInstallments" :key="row.id" flat bordered class="q-mb-sm" style="border-radius: 12px">
            <q-card-section>
              <div class="row items-center">
                <div class="text-weight-bold">{{ row.installmentOrder }}</div>
                <q-space />
                <q-badge :color="Number(row.status) === -1 ? 'warning' : 'grey-6'" rounded>
                  {{ Number(row.status) === -1 ? 'Pago Parcial' : 'Pendente' }}
                </q-badge>
              </div>
              <div class="text-caption q-mt-xs">
                Prestação: <strong>{{ formatMoney(row.installment) }}</strong> · Vence: {{ formatDateShort(row.dueDate) }}
              </div>
              <div class="text-caption" v-if="Number(row.latePaymentInterest) > 0">
                Mora: <span class="text-negative text-weight-bold">{{ formatMoney(row.latePaymentInterest) }}</span>
              </div>
              <div class="text-caption">Total a pagar: <strong class="text-negative">{{ formatMoney(installmentTotalDue(row)) }}</strong></div>
            </q-card-section>
            <q-card-actions align="right" v-if="canRegisterPayment(authStore.userRole)">
              <q-btn dense outline color="orange" label="Pagar" no-caps @click="openPayment(row, 'full')" />
              <q-btn dense outline color="teal" label="Parcial" no-caps @click="openPayment(row, 'partial')" />
              <q-btn dense outline color="primary" label="Desconto" no-caps @click="openPayment(row, 'discount')" />
            </q-card-actions>
          </q-card>
        </div>
      </div>

      <!-- Tabela pagas -->
      <div v-if="store.paidInstallments.length > 0">
        <div class="text-subtitle2 text-positive q-mb-xs">
          <q-icon name="check_circle" size="16px" class="q-mr-xs" />Prestações pagas ({{ store.paidInstallments.length }})
        </div>
        <q-table
          class="gt-xs amort-table"
          :rows="store.paidInstallments" :columns="paidColumns"
          row-key="id" flat dense hide-bottom :rows-per-page-options="[0]"
        >
          <template v-slot:body-cell-amortization="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.amortization) }}</q-td></template>
          <template v-slot:body-cell-rateAmount="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.rateAmount) }}</q-td></template>
          <template v-slot:body-cell-installment="props"><q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td></template>
          <template v-slot:body-cell-paidAmount="props"><q-td :props="props" class="text-right text-positive text-weight-bold">{{ formatMoney(props.row.paidAmount || props.row.installment) }}</q-td></template>
          <template v-slot:body-cell-chargedLatePaymentInterest="props">
            <q-td :props="props" class="text-right">
              <span :class="props.row.chargedLatePaymentInterest > 0 ? 'text-negative text-weight-bold' : 'text-grey-5'">{{ formatMoney(props.row.chargedLatePaymentInterest || 0) }}</span>
            </q-td>
          </template>
          <template v-slot:body-cell-dueDate="props"><q-td :props="props" class="text-right">{{ formatDateShort(props.row.dueDate) }}</q-td></template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn flat round dense icon="receipt" size="xs" color="positive" :loading="reciboLoadingId === props.row.id" @click="imprimirRecibo(props.row)">
                <q-tooltip>Recibo (PDF do backend)</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
        <div class="lt-sm">
          <q-card v-for="row in store.paidInstallments" :key="row.id" flat bordered class="q-mb-sm" style="border-radius: 12px">
            <q-card-section>
              <div class="row items-center">
                <div class="text-weight-bold">{{ row.installmentOrder }}</div>
                <q-space />
                <q-badge color="positive" rounded>Pago</q-badge>
              </div>
              <div class="text-caption q-mt-xs">Pago: <strong class="text-positive">{{ formatMoney(row.paidAmount || row.installment) }}</strong> · {{ formatDateShort(row.dueDate) }}</div>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn dense outline color="positive" icon="receipt" label="Recibo" no-caps :loading="reciboLoadingId === row.id" @click="imprimirRecibo(row)" />
            </q-card-actions>
          </q-card>
        </div>
      </div>

      <div v-if="store.pendingInstallments.length === 0 && store.paidInstallments.length === 0" class="text-center q-pa-lg text-grey-5">
        <q-icon name="info" size="40px" />
        <div class="text-caption q-mt-sm">Sem prestações registadas.</div>
      </div>
    </template>

    <q-card v-else flat bordered style="border-radius: 12px">
      <q-card-section class="text-center q-pa-xl text-grey-5">
        <q-icon name="account_balance_wallet" size="48px" />
        <div class="text-caption q-mt-sm">Sem crédito activo com plano de amortização.</div>
      </q-card-section>
    </q-card>

    <!-- ===================== DIALOG: LIQUIDAR DÍVIDA TOTAL ===================== -->
    <!-- UI premium fintech (componente próprio) — Conta Destino OBRIGATÓRIA:
         o backend grava bank_account_id e credita o saldo dentro da transacção
         atómica (POST /api/tranzaction/bulk). -->
    <LiquidarDividaModal
      v-model="showLiquidateDialog"
      :loan="contextLoan"
      :customer="store.customer"
      @pagamento-realizado="onLiquidacaoRealizada"
    />

    <!-- ===================== DIALOG: PAGAMENTO INDIVIDUAL ===================== -->
    <!-- UI premium fintech (componente próprio) — Conta Destino obrigatória,
         quote oficial do servidor e comprovativo ≤ 5 MB (POST /api/tranzaction). -->
    <RegistarPagamentoModal
      v-model="showPaymentModal"
      :installment="currentInstallment"
      :loan="contextLoan"
      :customer="store.customer"
      :mode="paymentMode"
      @pagamento-realizado="onPagamentoRealizado"
    />

    <!-- ===================== DIALOG: SUCESSO DO PAGAMENTO + BAIXAR RECIBO ===================== -->
    <!-- O recibo é emitido no BACKEND dentro da transacção do pagamento; aqui
         só se consome o PDF (ver recibo.pdf_url). Nunca se gera PDF no browser. -->
    <q-dialog v-model="sucessoPagamento">
      <q-card style="border-radius: 16px; min-width: 420px; max-width: 95vw">
        <q-card-section class="text-center q-pb-none">
          <q-icon name="check_circle" size="56px" color="positive" />
          <div class="text-h6 q-mt-sm">Pagamento registado</div>
          <div class="text-caption text-grey-6" v-if="ultimoPagamento?.recibo">
            Recibo <strong>{{ ultimoPagamento.recibo.numero }}</strong> emitido com selo electrónico AT
          </div>
        </q-card-section>
        <q-card-actions align="center" class="q-pa-md">
          <q-btn flat label="Fechar" color="grey" no-caps @click="sucessoPagamento = false" />
          <q-btn v-if="ultimoPagamento?.recibo" outline color="primary" icon="visibility" label="Ver Recibo" no-caps @click="verUltimoRecibo" />
          <q-btn v-if="ultimoPagamento?.recibo" unelevated color="positive" icon="download" label="Baixar Recibo" no-caps rounded :loading="baixandoRecibo" @click="baixarUltimoRecibo" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Visualizador do recibo legal (PDF servido pelo backend) -->
    <ReciboViewerDialog v-model="reciboViewerOpen" :recibo="reciboViewer" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useBankStore } from '@/stores/bank'
import { formatMoney, formatDateShort } from '@/utils/formatters'
import { canRegisterPayment } from '@/utils/permissions'
import { api } from '@/boot/axios'
import ReciboViewerDialog from '@/components/recibos/ReciboViewerDialog.vue'
import RegistarPagamentoModal from '@/components/mutuario/RegistarPagamentoModal.vue'
import LiquidarDividaModal from '@/components/mutuario/LiquidarDividaModal.vue'

const $q = useQuasar()
const store = useMutuarioStore()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const bankStore = useBankStore()

// ── RECIBO BACKEND-AUTHORITATIVE ──
// O PDF do recibo é gerado no BACKEND (pdfkit, dentro da transacção do
// pagamento). O frontend apenas consome: GET /api/tranzactions/:id/recibo →
// visualizador com o PDF servido por /api/recibos/:id/pdf.
const reciboViewerOpen = ref(false)
const reciboViewer = ref(null)
const reciboLoadingId = ref(null)
const sucessoPagamento = ref(false)
const ultimoPagamento = ref(null) // { tranzactionId, recibo }
const baixandoRecibo = ref(false)
const extracting = ref(false)

async function imprimirRecibo(row) {
  const txId = Number(row?.tranzactionId)
  if (!txId) {
    $q.notify({ type: 'warning', message: 'Esta prestação não tem pagamento associado', position: 'top' })
    return
  }
  reciboLoadingId.value = row.id
  try {
    const { data } = await api.get(`/api/tranzactions/${txId}/recibo`)
    if (data?.success && data.result) {
      reciboViewer.value = data.result
      reciboViewerOpen.value = true
    } else {
      $q.notify({ type: 'negative', message: data?.message || 'Recibo não encontrado', position: 'top' })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao obter o recibo', position: 'top' })
  } finally {
    reciboLoadingId.value = null
  }
}

function verUltimoRecibo() {
  if (!ultimoPagamento.value?.recibo) return
  sucessoPagamento.value = false
  reciboViewer.value = ultimoPagamento.value.recibo
  reciboViewerOpen.value = true
}

async function baixarReciboPdf(recibo) {
  const { data } = await api.get(`/api/recibos/${recibo.id}/pdf`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `Recibo-${recibo.numero || recibo.id}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => window.URL.revokeObjectURL(url), 30000)
}

async function baixarUltimoRecibo() {
  const recibo = ultimoPagamento.value?.recibo
  if (!recibo?.id) return
  baixandoRecibo.value = true
  try {
    await baixarReciboPdf(recibo)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Não foi possível baixar o recibo', position: 'top' })
  } finally {
    baixandoRecibo.value = false
  }
}

const showLiquidateDialog = ref(false)
const showPaymentModal = ref(false)
const paymentMode = ref('full') // full | partial | discount
const currentInstallment = ref(null)
const selectedLoanId = ref(null)

// ── Callbacks dos modais (UI extraída) ──
// O pagamento já foi gravado pelo componente (POST /api/tranzaction com
// bank_account_id); o store payInstallment já refrescou o plano — aqui só se
// mostra o recibo legal emitido pelo backend.
function onPagamentoRealizado(resposta) {
  ultimoPagamento.value = { tranzactionId: resposta?.tranzactionId || null, recibo: resposta?.recibo || null }
  if (resposta?.recibo) {
    sucessoPagamento.value = true
  } else {
    $q.notify({ type: 'positive', message: 'Pagamento registado com sucesso', position: 'top' })
  }
}

// A liquidação notifica no próprio modal; o store liquidateAll já refrescou
// plano + métricas. Mantido para futuras extensões (ex.: baixar ZIP de recibos).
function onLiquidacaoRealizada() { /* refresh já feito no store */ }

const loanOptions = computed(() => {
  const options = store.loans
    .filter(l => [1, 3].includes(Number(l.status)))
    .map(l => ({ label: `#${l.id} — ${formatMoney(l.amount)} (${Number(l.status) === 1 ? 'Activo' : 'Terminado'})`, value: l.id }))
  return options.length > 0 ? options : [{ label: 'Sem créditos com plano', value: null }]
})

watch(loanOptions, (opts) => {
  if (opts.length > 0 && !selectedLoanId.value) {
    selectedLoanId.value = opts[0].value
  }
}, { immediate: true })

// Crédito EM CONTEXTO desta aba — nunca muta store.activeLoan (que alimenta
// os KPIs do header). Todas as acções abaixo usam contextLoan.id explícito.
const contextLoan = computed(() =>
  store.loans.find(l => Number(l.id) === Number(selectedLoanId.value)) || null
)
const contextInstallments = computed(() =>
  Number(store.contextLoan?.id) === Number(selectedLoanId.value)
    ? store.contextInstallments
    : []
)

watch(selectedLoanId, async (id) => {
  if (id) {
    await store.fetchPlanFor(id, companyStore.company?.forfeit || 0.1)
  }
}, { immediate: true })

// ── Helpers das prestações (espelham a semântica do backend) ──
const installmentRemaining = (inst) => Math.max(0, Number(inst?.installment || 0) - Number(inst?.paidAmount || 0))
const installmentLateInterest = (inst) => Number(inst?.latePaymentInterest || 0)
const installmentTotalDue = (inst) => Math.round((installmentRemaining(inst) + installmentLateInterest(inst)) * 100) / 100

// ── SALDO (PADRÃO MBR) = CAPITAL REMANESCENTE ──
// Capital financiado − capital já pago em cada prestação (na linha os juros
// são pagos primeiro e só depois o capital, limitado à amortização).
// 90.000 quando 0 prestações pagas; 0,00 quando todas pagas — alinhado com
// a coluna Saldo do Plano Inicial/Extracto PDF.
const capitalRemanescente = computed(() => {
  const capital = Number(contextLoan.value?.amount) || 0
  const capitalPago = contextInstallments.value.reduce((s, inst) => {
    const amort = Number(inst.amortization) || 0
    const juros = Number(inst.rateAmount) || 0
    const pago = Number(inst.paidAmount) || 0
    return s + Math.min(amort, Math.max(0, pago - juros))
  }, 0)
  return Math.max(0, Math.round((capital - capitalPago) * 100) / 100)
})

const planKpis = computed(() => [
  { label: 'Capital Financiado', value: formatMoney(contextLoan.value?.amount || 0), class: 'text-primary' },
  { label: 'Total Pago', value: formatMoney(contextInstallments.value.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0)), class: 'text-positive' },
  { label: 'Saldo Remanescente', value: formatMoney(capitalRemanescente.value), class: capitalRemanescente.value > 0 ? 'text-negative' : 'text-positive' },
  { label: 'Prestações', value: `${store.paidInstallments.length} / ${contextInstallments.value.length}`, class: '' }
])

const pendingColumns = [
  { name: 'installmentOrder', label: 'Ordem', field: 'installmentOrder', align: 'center' },
  { name: 'amortization', label: 'Capital', field: 'amortization', align: 'right' },
  { name: 'rateAmount', label: 'Juros', field: 'rateAmount', align: 'right' },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right' },
  { name: 'paidAmount', label: 'Valor Pago', field: 'paidAmount', align: 'right' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'latePaymentInterest', label: 'Juros de Mora', field: 'latePaymentInterest', align: 'right' },
  { name: 'totalToPay', label: 'Total a Pagar', field: 'totalToPay', align: 'right' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'right' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

const paidColumns = [
  { name: 'installmentOrder', label: 'Ordem', field: 'installmentOrder', align: 'center' },
  { name: 'amortization', label: 'Capital', field: 'amortization', align: 'right' },
  { name: 'rateAmount', label: 'Juros', field: 'rateAmount', align: 'right' },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right' },
  { name: 'paidAmount', label: 'Valor Pago', field: 'paidAmount', align: 'right' },
  { name: 'chargedLatePaymentInterest', label: 'Juros de Mora', field: 'chargedLatePaymentInterest', align: 'right' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'right' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center' }
]

function openPayment(installment, mode) {
  currentInstallment.value = installment
  paymentMode.value = mode
  showPaymentModal.value = true
}

// ── Extracto do crédito — PDF GERADO NO BACKEND (GET /api/loans/:id/documents/extracto/pdf)
// Nunca se gera PDF no browser: o pedido vai por axios (token de sessão) e o
// PDF chega como blob para abrir numa nova aba.
async function printCreditExtract() {
  const loan = contextLoan.value
  if (!loan?.id) return
  extracting.value = true
  try {
    const { data } = await api.get(`/api/loans/${loan.id}/documents/extracto/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    window.open(url, '_blank')
    setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  } catch (e) {
    console.error('Erro ao gerar extracto:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar o extracto do crédito', position: 'top' })
  } finally {
    extracting.value = false
  }
}
</script>

<style lang="scss" scoped>
.amort-table {
  font-size: 11px;
}
</style>
