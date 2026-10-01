<template>
  <div class="q-pa-md">
    <!-- Selector do crédito -->
    <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="description" size="20px" color="primary" />
        <div class="text-subtitle1 text-weight-bold">Documentos Legais do Crédito</div>
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

    <q-skeleton v-if="loading" type="rect" height="180px" style="border-radius: 12px" />

    <template v-else-if="loan">
      <!-- ═══ FLUXO 1: DOCUMENTOS DE CONCESSÃO (IMUTÁVEL, hash + QR) ═══ -->
      <!-- Só existe após o desembolso; o pacote é gerado 1× e nunca muda. -->
      <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <q-icon name="verified_user" size="20px" :color="concessao ? 'positive' : 'grey-5'" class="q-mr-sm" />
            <div class="text-subtitle1 text-weight-bold">Documentos de Concessão</div>
            <q-badge v-if="concessao" outline color="positive" class="q-ml-sm">Imutável · hash {{ String(concessao.package_hash || '').slice(0, 10) }}…</q-badge>
            <q-badge v-else outline color="grey-6" class="q-ml-sm">Só após o desembolso</q-badge>
            <q-space />
            <q-btn
              v-if="concessao"
              outline color="positive" icon="folder_zip" label="ZIP completo" no-caps rounded dense
              :loading="gerando === 'zip'"
              @click="baixarZip"
            />
          </div>
          <div v-if="concessao" class="row q-col-gutter-sm">
            <div class="col-6 col-sm-3" v-for="doc in concessao.docs" :key="doc.key">
              <q-card flat bordered style="border-radius: 10px">
                <q-card-section class="text-center q-py-sm">
                  <q-icon name="picture_as_pdf" size="28px" color="negative" />
                  <div class="text-caption text-weight-medium ellipsis">{{ docLabel(doc.key) }}</div>
                  <q-btn flat dense no-caps color="primary" icon="download" label="Baixar" :loading="gerando === doc.key" @click="baixarConcessaoDoc(doc.key)" />
                </q-card-section>
              </q-card>
            </div>
          </div>
          <div v-else class="text-caption text-grey-6">
            <q-icon name="lock" size="14px" class="q-mr-xs" />Pacote de concessão ainda não emitido para este crédito. É gerado automaticamente no desembolso — se já foi desembolsado, aguarde um minuto (backfill) ou contacte o administrador.
          </div>
        </q-card-section>
      </q-card>

      <!-- (Os 3 cartões antigos "Gerar PDF" foram removidos — duplicavam o
           pacote imutável de cima. Os documentos legais saem SEMPRE do pacote
           de concessão; o extracto dinâmico fica na secção abaixo.) -->

      <!-- Extracto do crédito -->
      <q-card flat bordered class="q-mt-md" style="border-radius: 12px">
        <q-card-section>
          <div class="row items-center q-mb-md">
            <div class="text-subtitle1 text-weight-bold">
              <q-icon name="receipt_long" size="18px" class="q-mr-xs" />Extracto do Crédito
            </div>
            <q-space />
            <!-- 2026: alternar visão simples (6 colunas Price) vs completa (controle interno) -->
            <q-toggle
              v-model="fullView"
              label="Visão completa"
              color="primary"
              dense
              class="q-mr-md"
            >
              <q-tooltip>Adicionar Dias de mora, Mora, Desconto e Estado</q-tooltip>
            </q-toggle>
            <q-btn
              color="primary"
              icon="picture_as_pdf"
              label="Gerar PDF (landscape)"
              unelevated no-caps rounded
              :loading="generating === 'extracto'"
              :disable="generating !== null || viewRows.length === 0"
              @click="gerarExtracto"
            />
          </div>

          <div v-if="viewRows.length === 0" class="text-center q-pa-lg text-grey-5">
            <q-icon name="info" size="36px" />
            <div class="text-caption q-mt-sm">Sem plano de amortização registado para este crédito.</div>
          </div>
          <template v-else>
            <!-- Resumo: 6 QCards -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6 col-sm-2" v-for="item in extractSummary" :key="item.label">
                <div class="summary-card">
                  <div class="text-caption text-grey-5" style="font-size: 10px">{{ item.label }}</div>
                  <div class="text-weight-bold" :class="item.class" style="font-size: 12px">{{ item.value }}</div>
                </div>
              </div>
            </div>

            <!-- Tabela Price: Ordem | Amortização | Juros | Prestação | Saldo | Vencimento
                 (idêntica ao PDF oficial, anexo 2) — visão completa adiciona colunas de controle -->
            <q-table
              class="extract-table"
              :rows="viewRows"
              :columns="columnsExtracto"
              row-key="ordem"
              flat bordered dense
              :rows-per-page-options="[0]"
              hide-bottom
              :loading="loading"
            >
              <!-- Formatação das colunas -->
              <template v-slot:body-cell-ordem="props"><q-td :props="props" class="text-center">{{ props.row.ordem }}</q-td></template>
              <template v-slot:body-cell-amortizacao="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.amortizacao) }}</q-td></template>
              <template v-slot:body-cell-juros="props"><q-td :props="props" class="text-right">{{ formatMoney(props.row.juros) }}</q-td></template>
              <template v-slot:body-cell-prestacao="props"><q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.prestacao) }}</q-td></template>
              <template v-slot:body-cell-saldo="props">
                <q-td :props="props" class="text-right" :class="props.row.saldo > 0 ? '' : 'text-positive text-weight-bold'">
                  {{ formatMoney(props.row.saldo) }}
                </q-td>
              </template>
              <template v-slot:body-cell-vencimento="props"><q-td :props="props" class="text-right">{{ props.row.vencimento }}</q-td></template>
              <!-- Colunas extra (visão completa) -->
              <template v-slot:body-cell-moraDias="props"><q-td :props="props" class="text-center">{{ props.row.moraDias }}</q-td></template>
              <template v-slot:body-cell-mora="props">
                <q-td :props="props" class="text-right" :class="props.row.mora > 0 ? 'text-negative text-weight-bold' : ''">{{ formatMoney(props.row.mora) }}</q-td>
              </template>
              <template v-slot:body-cell-desconto="props">
                <q-td :props="props" class="text-right">
                  <span v-if="props.row.desconto > 0" class="text-orange">-{{ formatMoney(props.row.desconto) }}</span>
                  <span v-else class="text-grey-5">—</span>
                </q-td>
              </template>
              <template v-slot:body-cell-estado="props">
                <q-td :props="props" class="text-center">
                  <q-badge :color="props.row.pago ? 'positive' : props.row.parcial ? 'warning' : 'grey-6'" rounded>
                    {{ props.row.pago ? 'Pago' : props.row.parcial ? 'Parcial' : 'Pendente' }}
                  </q-badge>
                </q-td>
              </template>

              <!-- Footer TOTAIS (igual ao print do PDF: linha final com somas) -->
              <template v-slot:bottom-row>
                <q-tr class="bg-green-1 totals-tr">
                  <q-td class="text-weight-bold">TOTAIS</q-td>
                  <q-td class="text-right text-weight-bold">{{ formatMoney(totals.amortizacao) }}</q-td>
                  <q-td class="text-right text-weight-bold">{{ formatMoney(totals.juros) }}</q-td>
                  <q-td class="text-right text-weight-bold">{{ formatMoney(totals.prestacao) }}</q-td>
                  <q-td class="text-right text-weight-bold" :class="finalBalance > 0 ? 'text-negative' : 'text-positive'">{{ formatMoney(finalBalance) }}</q-td>
                  <q-td class="text-right"></q-td>
                  <template v-if="fullView">
                    <q-td></q-td>
                    <q-td class="text-right text-weight-bold text-negative">{{ formatMoney(totals.mora) }}</q-td>
                    <q-td class="text-right text-weight-bold text-orange">{{ totals.desconto > 0 ? '-' + formatMoney(totals.desconto) : '—' }}</q-td>
                    <q-td></q-td>
                  </template>
                </q-tr>
              </template>
            </q-table>

            <div class="text-caption text-grey-5 q-mt-xs">
              <q-icon name="computer" size="12px" class="q-mr-xs" />Documento processado por computador — {{ companyStore.company?.companyName || '' }}
            </div>
          </template>
        </q-card-section>
      </q-card>

      <!-- Aviso de documentos escaneados -->
      <q-banner class="bg-blue-1 text-blue-10 q-mt-md" rounded dense>
        <template v-slot:avatar><q-icon name="info" /></template>
        Para anexar contratos escaneados e comprovativos, use a aba
        <strong>Documentos &amp; KYC</strong> ou a página legada
        <router-link :to="`/loans/${loan.id}/documents`" style="font-weight: 600">/loans/{{ loan.id }}/documents</router-link>.
      </q-banner>
    </template>

    <q-card v-else flat bordered style="border-radius: 12px">
      <q-card-section class="text-center q-pa-xl text-grey-5">
        <q-icon name="description" size="48px" />
        <div class="text-caption q-mt-sm">Selecione um crédito com plano de amortização.</div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useLoansStore } from '@/stores/loans'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import { formatMoney, formatDateShort } from '@/utils/formatters'

const $q = useQuasar()
const store = useMutuarioStore()
const loansStore = useLoansStore()
const companyStore = useCompanyStore()
const authStore = useAuthStore()

const loading = ref(false)
const generating = ref(null)
const fullView = ref(false) // default: visão simples (6 colunas Price)
const selectedLoanId = ref(null)
const loan = ref(null)
const customer = ref(null)
const guarantees = ref([])
const accounts = ref([])
const amortization = ref([])

// ── FLUXO 1: PACOTE DE CONCESSÃO (imutável) ──
const concessao = ref(null)
const gerando = ref(null)
const docLabel = (key) => ({
  termo: 'Termo de Compromisso',
  garantias: 'Declaração de Garantias',
  contrato: 'Contrato de Concessão',
  plano: 'Plano Inicial'
}[key] || key)

async function fetchConcessao() {
  if (!loan.value?.id) return
  try {
    const { data } = await api.get(`/api/loans/${loan.value.id}/concession`)
    concessao.value = data?.result || null
  } catch { concessao.value = null }
}

async function baixarConcessaoDoc(key) {
  if (!loan.value?.id) return
  gerando.value = key
  try {
    const response = await api.get(`/api/loans/${loan.value.id}/concession/${key}/pdf`, { responseType: 'blob' })
    const ct = String(response.headers?.['content-type'] || '')
    if (!ct.includes('application/pdf')) throw new Error('Documento não disponível no pacote')
    // Download com NOME legível (Termo-de-Compromisso-conta-108.pdf) — o PDF
    // vem sempre do BACKEND (pacote imutável); nada de pdfmake no browser.
    const labels = { termo: 'Termo-de-Compromisso', garantias: 'Declaracao-de-Garantias', contrato: 'Contrato-de-Concessao', plano: 'Plano-Inicial' }
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${labels[key] || key}-conta-${loan.value.accountNumber || loan.value.id}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || e.message || 'Erro ao baixar documento do pacote', position: 'top' })
  } finally {
    gerando.value = null
  }
}

async function baixarZip() {
  if (!loan.value?.id) return
  gerando.value = 'zip'
  try {
    const response = await api.get(`/api/loans/${loan.value.id}/concession/zip`, { responseType: 'blob' })
    const ct = String(response.headers?.['content-type'] || '')
    if (!ct.includes('zip')) throw new Error('ZIP não disponível')
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `concessao-conta-${loan.value.accountNumber || loan.value.id}.zip`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    $q.notify({ type: 'positive', message: 'Pacote completo baixado (imutável, com hash)', position: 'top' })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || e.message || 'Erro ao baixar o ZIP', position: 'top' })
  } finally {
    gerando.value = null
  }
}

const loanOptions = computed(() =>
  store.loans
    .filter(l => [1, 3].includes(Number(l.status)))
    .map(l => ({ label: `#${l.id} — ${formatMoney(l.amount)} (${Number(l.status) === 1 ? 'Activo' : 'Terminado'})`, value: l.id }))
)

// ── Mapeamento dos dados da API (amortization_loans via installmentPanification):
//    Amortização = amortization (capital) | Juros = rateAmount | Prestação = installment
//    Saldo = remainingBalance | Vencimento = dueDate
//    Fallback: se amortization vier vazio, calcula prestacao - juros (Price).
const viewRows = computed(() =>
  (amortization.value || []).map(r => {
    const prestacao = Number(r.installment) || 0
    const juros = Number(r.rateAmount) || 0
    const amortizacao = r.amortization != null ? Number(r.amortization) || 0 : Math.max(0, prestacao - juros)
    return {
      ordem: r.installmentOrder || '',
      amortizacao,
      juros,
      prestacao,
      saldo: Math.max(0, Number(r.remainingBalance) || 0),
      vencimento: formatDateShort(r.dueDate),
      // extras (visão completa)
      moraDias: Number(r.status) === 1 ? Number(r.chargedLateDays || 0) : Number(r.lateDays || 0),
      mora: Number(r.status) === 1 ? Number(r.chargedLatePaymentInterest || 0) : Number(r.latePaymentInterest || 0),
      desconto: Number(r.paidAmount) > 0 && Number(r.paidAmount) < prestacao ? prestacao - Number(r.paidAmount) : 0,
      pago: Number(r.status) === 1,
      parcial: Number(r.status) === -1
    }
  })
)

// Colunas na ORDEM EXATA do PDF oficial (anexo 2)
const simpleColumns = [
  { name: 'ordem', label: 'Ordem', field: 'ordem', align: 'center' },
  { name: 'amortizacao', label: 'Amortização', field: 'amortizacao', align: 'right' },
  { name: 'juros', label: 'Juros', field: 'juros', align: 'right' },
  { name: 'prestacao', label: 'Prestação', field: 'prestacao', align: 'right', classes: 'text-weight-bold' },
  { name: 'saldo', label: 'Saldo', field: 'saldo', align: 'right' },
  { name: 'vencimento', label: 'Vencimento', field: 'vencimento', align: 'right' }
]

const fullColumns = [
  ...simpleColumns,
  { name: 'moraDias', label: 'Dias de mora', field: 'moraDias', align: 'center' },
  { name: 'mora', label: 'Mora', field: 'mora', align: 'right' },
  { name: 'desconto', label: 'Desconto', field: 'desconto', align: 'right' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' }
]

const columnsExtracto = computed(() => (fullView.value ? fullColumns : simpleColumns))

// Totais do footer (TOTAIS do print)
const totals = computed(() => ({
  amortizacao: viewRows.value.reduce((s, r) => s + r.amortizacao, 0),
  juros: viewRows.value.reduce((s, r) => s + r.juros, 0),
  prestacao: viewRows.value.reduce((s, r) => s + r.prestacao, 0),
  mora: viewRows.value.reduce((s, r) => s + r.mora, 0),
  desconto: viewRows.value.reduce((s, r) => s + r.desconto, 0)
}))

// Saldo final (última prestação) e agregados de situação
const finalBalance = computed(() => viewRows.value.length > 0 ? viewRows.value[viewRows.value.length - 1].saldo : 0)
const totalPaid = computed(() => (amortization.value || []).reduce((s, r) => s + (parseFloat(r.paidAmount) || 0), 0))
const remainingDebt = computed(() => (amortization.value || [])
  .filter(r => Number(r.status) !== 1)
  .reduce((s, r) => {
    const late = Number(r.status) === 1 ? 0 : (parseFloat(r.latePaymentInterest) || 0)
    return s + Math.max(0, (parseFloat(r.installment) || 0) - (parseFloat(r.paidAmount) || 0)) + late
  }, 0))

const extractSummary = computed(() => [
  { label: 'Capital Financiado', value: formatMoney(loan.value?.amount || 0), class: 'text-primary' },
  { label: 'Taxa de Juros', value: `${((parseFloat(loan.value?.interestRate) || 0) * 100).toFixed(1)}%`, class: '' },
  { label: 'Total Juros', value: formatMoney(totals.value.juros), class: '' },
  { label: 'Total Dívida', value: formatMoney(totals.value.prestacao), class: 'text-negative' },
  { label: 'Total Pago', value: formatMoney(totalPaid.value), class: 'text-positive' },
  { label: 'Saldo Remanescente', value: formatMoney(remainingDebt.value), class: 'text-negative' }
])

// ── Carga dos dados do crédito seleccionado ──
async function loadLoanData(loanId) {
  if (!loanId) {
    loan.value = null
    amortization.value = []
    return
  }
  loading.value = true
  try {
    const companyId = authStore.companyId

    await companyStore.fetchCompany(companyId)

    await loansStore.fetchLoan(loanId, companyId)
    loan.value = loansStore.currentLoan

    if (!loan.value) {
      $q.notify({ type: 'negative', message: 'Crédito não encontrado', position: 'top' })
      return
    }

    // Cliente do crédito
    if (loan.value.accountNumber) {
      try {
        const { data } = await api.get(`/api/customer/${loan.value.accountNumber}`)
        if (data.success) customer.value = Array.isArray(data.result) ? data.result[0] : data.result
      } catch { customer.value = store.customer }
    }
    if (!customer.value) customer.value = store.customer

    // Garantias
    try {
      const { data } = await api.get(`/api/getLoanGuarantees/${loanId}`)
      if (data.success) guarantees.value = data.result || []
    } catch { guarantees.value = [] }

    // Contas da empresa (cláusula QUINTA do contrato)
    try {
      const { data } = await api.get(`/api/accounts/${companyId}`)
      if (data.success) accounts.value = data.result || []
    } catch { accounts.value = [] }

    // Plano de amortização com mora (forfeit da empresa)
    try {
      const forfeit = companyStore.company?.forfeit || 0.1
      const result = await loansStore.fetchAmortization(loanId, forfeit)
      amortization.value = result.installments || []
    } catch { amortization.value = [] }

    // Pacote de concessão (fluxo 1 — imutável)
    await fetchConcessao()
  } catch (e) {
    console.error('Erro ao carregar dados do crédito:', e)
    $q.notify({ type: 'negative', message: 'Erro ao carregar dados do crédito', position: 'top' })
  } finally {
    loading.value = false
  }
}

watch(loanOptions, (opts) => {
  if (opts.length > 0 && !selectedLoanId.value) selectedLoanId.value = opts[0].value
}, { immediate: true })

watch(selectedLoanId, (id) => loadLoanData(id))

onMounted(() => {
  if (store.activeLoan?.id) {
    selectedLoanId.value = store.activeLoan.id
    loadLoanData(store.activeLoan.id)
  }
})

// ── Gerar PDF do extracto — geração no BACKEND (pdfkit, layout do PDF oficial)
// via blob autenticado (rota existente GET /api/loans/:id/documents/extracto/pdf).
async function gerarExtracto() {
  if (!loan.value?.id) return
  generating.value = 'extracto'
  try {
    const response = await api.get(`/api/loans/${loan.value.id}/documents/extracto/pdf`, {
      responseType: 'blob'
    })
    // Guard: se o servidor devolveu JSON/HTML (erro, rota inexistente → SPA
    // catch-all), o blob não é PDF — ler a mensagem e notificar em vez de
    // abrir um visualizador vazio ("0 of 0").
    const contentType = String(response.headers?.['content-type'] || '')
    if (!contentType.includes('application/pdf')) {
      let message = 'Resposta inesperada do servidor'
      try {
        const text = await response.data.text()
        const parsed = JSON.parse(text)
        if (parsed?.message) message = parsed.message
      } catch { /* não é JSON — mantém mensagem genérica */ }
      throw new Error(message)
    }
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    $q.notify({ type: 'positive', message: 'Extracto do Crédito gerado com sucesso', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar documento:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar documento: ' + (e.message || ''), position: 'top' })
  } finally {
    generating.value = null
  }
}
</script>

<style lang="scss" scoped>
// Tabela extracto 2026: header verde, sticky, linhas alternadas, hover verde
.extract-table {
  :deep(thead th) {
    background: #14532d; // green-9
    color: #fff;
    font-weight: 600;
    padding-top: 10px;
    padding-bottom: 10px;
    position: sticky;
    top: 0;
    z-index: 2;
  }
  :deep(tbody tr:nth-child(even) td) {
    background: #fafafa; // bg-grey-1
  }
  :deep(tbody tr:hover td) {
    background: #e8f5e9 !important; // bg-green-1
  }
  :deep(.totals-tr td) {
    border-top: 2px solid #14532d;
  }
}

.summary-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fafafa;
}
</style>
