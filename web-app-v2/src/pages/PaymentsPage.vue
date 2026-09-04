<template>
  <div class="q-pa-md payments-page">
    <!-- ============ FILTROS ============ -->
    <q-card flat bordered class="q-mb-md filters-card" style="border-radius: 12px">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-12 col-md-3">
            <q-input
              v-model="search"
              dense
              outlined
              placeholder="Pesquisar por mutuário, conta, telefone, referência ou operador..."
              clearable
              @clear="resetPage"
              @keyup.enter="resetPage"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" />
              </template>
            </q-input>
          </div>
          <div class="col-6 col-md-2">
            <q-input v-model="dateFrom" dense outlined label="Data início" type="date" input-style="font-size: 12px" @update:model-value="resetPage" />
          </div>
          <div class="col-6 col-md-2">
            <q-input v-model="dateTo" dense outlined label="Data fim" type="date" input-style="font-size: 12px" @update:model-value="resetPage" />
          </div>
          <div class="col-6 col-md-2">
            <q-select
              v-model="methodFilter"
              dense
              outlined
              label="Meio de pagamento"
              clearable
              emit-value
              map-options
              :options="methodOptions"
              @update:model-value="resetPage"
            />
          </div>
          <!-- Limpar/Sync logo à direita do meio de pagamento -->
          <div class="col-auto q-gutter-xs no-wrap">
            <q-btn flat round dense icon="filter_list_off" color="grey" size="sm" @click="clearFilters">
              <q-tooltip>Limpar filtros</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="refresh" color="primary" size="sm" :loading="loading" @click="fetchPayments">
              <q-tooltip>Actualizar</q-tooltip>
            </q-btn>
          </div>
          <!-- PDF/Excel no fim da barra -->
          <div class="col-auto q-gutter-sm no-wrap">
            <q-btn
              outline
              color="primary"
              icon="picture_as_pdf"
              label="PDF"
              no-caps
              rounded
              size="sm"
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
              :disable="filteredRows.length === 0"
              @click="exportExcel"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ============ CARREGAMENTO / VAZIO / TABELA ============ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar pagamentos...</div>
    </div>

    <q-card v-else flat bordered class="table-card" style="border-radius: 12px; overflow: hidden">
      <q-card-section v-if="filteredRows.length === 0" class="text-center q-pa-xl">
        <q-icon name="payments" size="64px" color="grey-4" />
        <div class="text-h6 text-grey-6 q-mt-md">Nenhum pagamento encontrado</div>
        <div class="text-caption text-grey-5 q-mb-md">
          {{ isFiltering ? 'Ajuste os filtros para ver mais resultados.' : 'Ainda não foram registados pagamentos de prestações.' }}
        </div>
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
        <!-- Mutuário (só o nome) -->
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <span class="text-weight-medium" style="font-size: 13px">{{ props.row.customerName }}</span>
          </q-td>
        </template>

        <!-- Montante: se o pagamento é parcial, mostra o saldo devedor da prestação -->
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" class="text-right">
            <div class="text-weight-bold text-positive" style="font-size: 13px">{{ formatMoney(props.row.amount) }}</div>
            <div
              v-if="Number(props.row.installmentStatus) === -1 && remainingBalance(props.row) > 0"
              class="text-caption text-negative"
              style="font-size: 10px"
            >
              Saldo devedor: {{ formatMoney(remainingBalance(props.row)) }}
            </div>
          </q-td>
        </template>

        <!-- Data (última coluna) com hora/min/seg da transacção -->
        <template v-slot:body-cell-date="props">
          <q-td :props="props" class="text-center">
            <div class="text-weight-medium" style="font-size: 12px">{{ formatDateTime(props.row.createdAt || props.row.paymentDate) }}</div>
          </q-td>
        </template>

        <!-- Prestação: 1ª prestação, 2ª prestação, ... -->
        <template v-slot:body-cell-installment="props">
          <q-td :props="props" class="text-center">
            <div v-if="props.row.installmentOrder">
              <span class="text-weight-medium" style="font-size: 12px">{{ installmentLabel(props.row.installmentOrder) }}</span>
              <div class="text-caption text-grey-6" style="font-size: 10px">
                vence {{ formatDateShort(props.row.installmentDueDate) || '—' }}
              </div>
            </div>
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <!-- Método -->
        <template v-slot:body-cell-method="props">
          <q-td :props="props" class="text-center">
            <q-badge outline rounded color="primary" style="font-size: 10px; font-weight: 500">
              {{ methodLabel(props.row.paymentMethod) }}
            </q-badge>
          </q-td>
        </template>

        <!-- Total na última linha da grelha -->
        <template v-slot:bottom-row>
          <q-tr class="payments-total-row">
            <q-td colspan="2" class="text-right">
              <span class="text-weight-bold">TOTAL · {{ filteredRows.length }} {{ filteredRows.length === 1 ? 'pagamento' : 'pagamentos' }}</span>
            </q-td>
            <q-td class="text-right">
              <span class="text-weight-bold text-positive">{{ formatMoney(totalAmount) }}</span>
            </q-td>
            <q-td colspan="4" />
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'
import { formatMoney, formatDateShort } from '@/utils/formatters'

const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

// ─── Estado ───
const loading = ref(false)
const allPayments = ref([])

// ─── Filtros ───
const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const methodFilter = ref(null)

const methodOptions = [
  { label: 'Numerário', value: 1 },
  { label: 'Cheque', value: 2 },
  { label: 'Transferência Bancária', value: 3 },
  { label: 'Depósito Bancário', value: 4 },
  { label: 'TPA', value: 5 },
  { label: 'E-Mola', value: 6 },
  { label: 'M-Pesa', value: 7 },
  { label: 'e-Mola', value: 8 }
]

const pagination = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 })

// ─── Fetch ───
async function fetchPayments() {
  const companyId = authStore.companyId
  if (!companyId) return
  loading.value = true
  try {
    const { data } = await api.get(`/api/payments/${companyId}/all`)
    allPayments.value = (data?.success && Array.isArray(data.result)) ? data.result : []
  } catch (error) {
    console.error('Erro ao carregar pagamentos:', error)
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao carregar pagamentos', position: 'top' })
    allPayments.value = []
  } finally {
    loading.value = false
  }
}

// ─── Filtros / ordenação ───
const isFiltering = computed(() => !!search.value || !!dateFrom.value || !!dateTo.value || methodFilter.value !== null)

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

// Paginação: manter rowsNumber sincronizado com o conjunto filtrado (senão o
// rodapé mostra "1-0 of 0") e voltar à 1ª página se o filtro reduzir as linhas.
watch(filteredRows, (rows) => {
  const n = rows.length
  const rpp = pagination.value.rowsPerPage || 25
  const maxPage = Math.max(1, Math.ceil(n / rpp))
  pagination.value.rowsNumber = n
  if (pagination.value.page > maxPage) pagination.value.page = maxPage
})

// ─── Total do conjunto filtrado (última linha da grelha) ───
const totalAmount = computed(() => filteredRows.value.reduce((acc, r) => acc + (Number(r.amount) || 0), 0))

// ─── Colunas (Data é a última) ───
const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'installment', label: 'Prestação', field: 'installmentOrder', align: 'center' },
  { name: 'amount', label: 'Montante', field: 'amount', align: 'right', sortable: true },
  { name: 'method', label: 'Método', field: 'paymentMethod', align: 'center' },
  { name: 'reference', label: 'Referência', field: 'tranzactionReference', align: 'center' },
  { name: 'staff', label: 'Operador', field: 'staffName', align: 'center', sortable: true },
  { name: 'date', label: 'Data', field: 'createdAt', align: 'center', sortable: true }
]

// ─── Helpers ───
function methodLabel(value) {
  const found = methodOptions.find(m => Number(m.value) === Number(value))
  return found ? found.label : '—'
}

// "1ª" → "1ª prestação" (aceita também "1" ou "1º")
function installmentLabel(order) {
  if (!order) return '—'
  const clean = String(order).replace(/[ºª]/g, '').trim()
  return clean ? `${clean}ª prestação` : '—'
}

// Saldo devedor da prestação: valor da prestação − total já pago nela
function remainingBalance(row) {
  const total = Number(row.installmentValue) || 0
  const paid = Number(row.installmentPaidAmount) || 0
  return Math.max(0, Math.round((total - paid) * 100) / 100)
}

function moneyRaw(value) {
  return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)
}

function dateLabel(value) {
  return value ? (formatDateShort(value) || '—') : '—'
}

// Data/hora da transacção (dd/mm/aaaa hh:mm:ss) — createdAt vem em UTC, converte p/ hora local
function formatDateTime(value) {
  if (!value) return '—'
  const s = String(value).trim()
  const p = (n) => String(n).padStart(2, '0')
  // Com fuso horário (ex.: ...Z) → converter para a hora local do navegador
  if (/Z$|[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s)
    if (isNaN(d.getTime())) return '—'
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`
  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) {
    return `${p(parsed.getDate())}/${p(parsed.getMonth() + 1)}/${parsed.getFullYear()} ${p(parsed.getHours())}:${p(parsed.getMinutes())}:${p(parsed.getSeconds())}`
  }
  return '—'
}

function resetPage() {
  pagination.value = { ...pagination.value, page: 1 }
}

function clearFilters() {
  search.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  methodFilter.value = null
  resetPage()
}

// ==================== EXPORTAÇÃO ====================
function exportRows() {
  return filteredRows.value.map(p => ({
    customerName: p.customerName || '—',
    accountNumber: String(p.accountNumber ?? '—'),
    phone: p.customerPhone || '—',
    installment: installmentLabel(p.installmentOrder),
    installmentDue: dateLabel(p.installmentDueDate),
    amount: Number(p.amount) || 0,
    balance: remainingBalance(p),
    method: methodLabel(p.paymentMethod),
    staff: p.staffName || '—',
    reference: p.tranzactionReference || '—',
    date: formatDateTime(p.createdAt || p.paymentDate)
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
    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    const { buildCompanyHeader, companyLogoBase64 } = await import('@/utils/pdfHeader')
    const company = companyStore.company || {}
    const logoBase64 = await companyLogoBase64(company)

    const cfg = exportConfig()
    const dateStr = new Date().toISOString().slice(0, 10)

    const body = [
      cfg.headers.map(h => ({ text: h, style: 'tableHeader' })),
      ...rows.map(row => cfg.keys.map((k, i) => ({
        text: cfg.money[i] ? moneyRaw(row[k]) : String(row[k] ?? '—'),
        style: cfg.money[i] ? 'cellRight' : 'cellCenter'
      })))
    ]
    // Linha de totais (colunas monetárias)
    const totalRow = cfg.keys.map((k, i) => {
      if (!cfg.money[i]) return { text: i === 0 ? 'TOTAL' : '', style: 'totalCell' }
      const sum = rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0)
      return { text: moneyRaw(sum), style: 'totalCellRight' }
    })
    body.push(totalRow)

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [24, 20, 24, 30],
      content: [
        ...buildCompanyHeader(company, logoBase64, `Pagamentos de Prestações — ${dateStr}`),
        {
          text: rows.length > 1 ? `${rows.length} pagamentos` : '1 pagamento',
          fontSize: 8,
          color: '#444',
          margin: [0, 0, 0, 8]
        },
        {
          table: {
            headerRows: 1,
            widths: cfg.widths,
            body
          },
          layout: 'grid',
          fontSize: 6.5
        }
      ],
      styles: {
        cellText: { fontSize: 6.5 },
        cellCenter: { fontSize: 6.5, alignment: 'center' },
        cellRight: { fontSize: 6.5, alignment: 'right' },
        tableHeader: { fontSize: 6.5, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
        totalCell: { fontSize: 6.5, bold: true, alignment: 'center', fillColor: '#e0e0e0' },
        totalCellRight: { fontSize: 6.5, bold: true, alignment: 'right', fillColor: '#e0e0e0' }
      }
    }

    pdfMake.createPdf(docDefinition).download(`pagamentos-${dateStr}.pdf`)
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
    const XLSX = await import('xlsx')
    const cfg = exportConfig()

    const wsData = [
      ['Pagamentos de Prestações'],
      [`Gerado em ${new Date().toLocaleString('pt-MZ')}`],
      [],
      cfg.headers,
      ...rows.map(row => cfg.keys.map((k, i) => (cfg.money[i] ? Number(row[k]) || 0 : String(row[k] ?? '')))),
      [],
      ['TOTAL', ...cfg.keys.slice(1).map((k, i) => {
        if (!cfg.money[i + 1]) return ''
        return rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0)
      })]
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = cfg.headers.map((h, i) => ({ wch: cfg.widths[i] ? Math.ceil(cfg.widths[i] / 6) : 20 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, cfg.sheet)
    XLSX.writeFile(wb, `pagamentos-${new Date().toISOString().slice(0, 10)}.xlsx`)
    $q.notify({ type: 'positive', message: 'Excel gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar Excel:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar Excel', position: 'top' })
  }
}

// ==================== MOUNT ====================
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
body.body--dark .payments-page { background: #1a1a2e; }

.filters-card {
  background: #fff;
}
body.body--dark .filters-card {
  background: #252540;
  border-color: rgba(255,255,255,0.06);
}

.table-card {
  background: #fff;
}
body.body--dark .table-card {
  background: #252540;
  border-color: rgba(255,255,255,0.06);
}

.payments-table {
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
  .payments-total-row td {
    background-color: #f1f3f4;
    border-top: 2px solid #dce0e5;
    font-size: 12px;
  }
}
body.body--dark {
  .payments-table {
    :deep(.q-table thead th) {
      background-color: $dark-page;
      color: $grey-5;
    }
    :deep(.q-table tbody tr:hover) {
      background-color: rgba(255, 255, 255, 0.03);
    }
  }
  .payments-total-row td {
    background-color: #252540;
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
