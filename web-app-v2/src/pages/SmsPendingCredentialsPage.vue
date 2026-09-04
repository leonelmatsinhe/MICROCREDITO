<template>
  <div class="q-pa-md pending-creds-page">
    <!-- Filtros + acções -->
    <q-card flat bordered class="q-mb-md" style="border-radius: 10px">
      <q-card-section class="q-py-sm">
        <div class="row items-center q-col-gutter-sm no-wrap">
          <div class="col-auto items-center" style="width: 220px">
            <q-input v-model="search" dense outlined clearable placeholder="Pesquisar mutuário, telefone, assunto..." style="font-size: 12px">
              <template v-slot:prepend><q-icon name="search" size="16px" /></template>
            </q-input>
          </div>
          <div class="col-auto" style="width: 180px">
            <q-select v-model="filterType" :options="typeOptions" dense outlined clearable emit-value map-options
              placeholder="Assunto" options-dense style="font-size: 12px" />
          </div>
          <div class="col-auto" style="width: 150px">
            <q-select v-model="filterStatus" :options="statusOptions" dense outlined clearable emit-value map-options
              placeholder="Estado" options-dense style="font-size: 12px" />
          </div>
          <q-space />
          <div class="row items-center no-wrap q-gutter-lg">
            <q-btn color="indigo" icon="picture_as_pdf" label="PDF" unelevated no-caps rounded size="sm" @click="exportPDF" />
            <q-btn color="green-7" icon="table_view" label="Excel" unelevated no-caps rounded size="sm" @click="exportExcel" />
            <q-btn color="teal" icon="send" label="Processar fila" unelevated no-caps rounded size="sm" @click="flushQueue"
              :disable="!companySmsEnabled" />
            <q-btn flat round dense icon="filter_alt_off" color="grey-7" @click="clearFilters">
              <q-tooltip>Limpar filtros</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="refresh" color="grey-7" @click="fetchPending" :loading="loading">
              <q-tooltip>Actualizar</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Aviso SMS desactivado -->
    <q-banner v-if="!companySmsEnabled" class="bg-grey-3 text-grey-8 q-mb-md" rounded>
      <template v-slot:avatar><q-icon name="sms_failed" color="grey-7" /></template>
      O envio de SMS está <strong>desactivado</strong> nas configurações da empresa. As mensagens ficam na fila e só saem quando o Administrador voltar a autorizar (Configurações → Dados da Empresa).
    </q-banner>

    <!-- Resumo (único KPI com todos os estados) -->
    <div v-if="!loading && pendingList.length > 0" class="row q-mb-md">
      <div class="col-12 col-sm-8 col-md-6">
        <q-card flat bordered style="border-radius: 10px">
          <q-card-section class="q-py-md">
            <div class="row items-center justify-center">
              <div class="text-center q-px-lg">
                <div class="text-h4 text-weight-bold text-orange">{{ totalPending }}</div>
                <div class="text-caption text-grey-6">Mensagens na fila / falhadas</div>
              </div>
              <q-separator vertical class="q-mx-md self-stretch" />
              <div class="text-caption text-grey-7" style="line-height: 1.9">
                <div><span class="text-blue text-weight-bold">{{ queuedCount }}</span> a aguardar envio</div>
                <div><span class="text-cyan text-weight-bold">{{ processingCount }}</span> em envio</div>
                <div><span class="text-negative text-weight-bold">{{ failedCount }}</span> falhadas</div>
                <div><span class="text-positive text-weight-bold">{{ sentCount }}</span> enviadas</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <!-- Empty state -->
    <q-card v-else-if="pendingList.length === 0" flat bordered style="border-radius: 10px">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="mark_email_read" size="56px" color="green-5" />
        <div class="text-h6 q-mt-sm">Nenhuma mensagem na fila</div>
        <div class="text-caption text-grey-6 q-mt-xs">
          Todas as mensagens foram enviadas ou não há mensagens pendentes na fila.
        </div>
        <q-btn color="primary" flat no-caps icon="refresh" label="Verificar novamente" class="q-mt-md" @click="fetchPending" />
      </q-card-section>
    </q-card>

    <!-- Tabela -->
    <q-table
      v-else
      :rows="filteredRows"
      :columns="columns"
      row-key="id"
      flat
      bordered
      style="border-radius: 10px"
      :rows-per-page-options="[10, 15, 25, 50]"
      :pagination="pagination"
    >
      <template v-slot:body-cell-customer="props">
        <q-td :props="props">
          <div class="no-wrap">
            <div class="text-weight-medium" style="font-size: 13px">{{ customerName(props.row) }}</div>
            <div class="text-caption text-grey-6">Conta {{ accountNumber(props.row) }}</div>
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-phone="props">
        <q-td :props="props">
          <div class="row items-center no-wrap">
            <q-icon name="phone" size="13px" class="q-mr-xs text-grey-6" />
            <span>{{ phoneLabel(props.row) }}</span>
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip :color="statusColor(props.row.status)" text-color="white" size="xs" dense>
            {{ statusLabel(props.row.status) }}
          </q-chip>
          <div v-if="props.row.retries > 0" class="text-caption text-grey-6">
            {{ props.row.retries }} tentativa(s)
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-subject="props">
        <q-td :props="props">
          <span class="text-weight-medium" style="font-size: 12px">{{ messageTypeLabel(props.row.messageType) }}</span>
          <div v-if="props.row.errorMessage" class="text-negative text-caption ellipsis" style="max-width: 280px" :title="props.row.errorMessage">
            {{ props.row.errorMessage }}
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-created="props">
        <q-td :props="props">
          <template v-if="props.row.sentAt">
            <div style="font-size: 12px">{{ formatDateTime(props.row.sentAt) }}</div>
          </template>
          <template v-else>
            <div style="font-size: 12px" class="text-grey-6">—</div>
            <div class="text-caption text-grey-6">Criado em {{ formatDateTime(props.row.createdAt) }}</div>
          </template>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <div class="row items-center no-wrap">
            <q-btn flat round dense icon="visibility" size="xs" color="grey-7" @click="viewMessage(props.row)">
              <q-tooltip>Ver mensagem</q-tooltip>
            </q-btn>
            <q-btn
              flat round dense icon="replay"
              :color="companySmsEnabled ? 'teal' : 'grey'"
              size="xs"
              :disable="!companySmsEnabled || requeueingId === props.row.id"
              @click="requeue(props.row)"
            >
              <q-tooltip>Reenviar agora (repor na fila)</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" size="xs" color="negative" @click="deleteMessage(props.row)">
              <q-tooltip>Eliminar mensagem</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </q-table>

    <!-- Ver mensagem -->
    <q-dialog v-model="showMessageDialog">
      <q-card style="border-radius: 12px; min-width: 360px; max-width: 90vw">
        <q-card-section class="bg-primary text-white row items-center" style="border-radius: 12px 12px 0 0">
          <q-icon name="sms" size="20px" class="q-mr-sm" />
          <div class="text-h6">Mensagem</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showMessageDialog = false" />
        </q-card-section>
        <q-card-section v-if="selectedRow">
          <div class="q-mb-xs">
            <div class="text-caption text-grey-6">Nome</div>
            <div class="text-weight-medium" style="font-size: 13px">{{ customerName(selectedRow) }}</div>
          </div>
          <div class="q-mb-xs">
            <div class="text-caption text-grey-6">Tipo</div>
            <div class="text-weight-medium" style="font-size: 13px">{{ messageTypeLabel(selectedRow.messageType) }}</div>
          </div>
          <div class="q-mb-sm">
            <div class="text-caption text-grey-6">Telefone</div>
            <div class="text-weight-medium" style="font-size: 13px">{{ phoneLabel(selectedRow) }}</div>
          </div>
          <div v-if="selectedRow.errorMessage" class="q-mb-sm">
            <div class="text-caption text-grey-6">Erro</div>
            <div class="text-negative text-caption" style="font-size: 12px; white-space: pre-wrap">{{ selectedRow.errorMessage }}</div>
          </div>
          <q-card flat bordered class="message-body-card">
            <q-card-section class="q-py-sm">
              <div class="message-body-text">{{ selectedRow.messageBody }}</div>
            </q-card-section>
          </q-card>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'

const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(false)
const pendingList = ref([])
const smsSummary = ref({})
const showMessageDialog = ref(false)
const selectedRow = ref(null)
const requeueingId = ref(null)

const search = ref('')
const filterType = ref(null)
const filterStatus = ref(null)

const pagination = ref({ sortBy: 'createdAt', descending: true, page: 1, rowsPerPage: 15, rowsNumber: 0 })

const companySmsEnabled = computed(() => Number(companyStore.company?.smsEnabled ?? 1) === 1)

const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'phone', label: 'Telefone', field: 'phone', align: 'left', sortable: false },
  { name: 'status', label: 'Estado', field: 'status', align: 'left', sortable: true },
  { name: 'subject', label: 'Assunto', field: 'messageType', align: 'left', sortable: true },
  { name: 'created', label: 'Enviado em', field: 'sentAt', align: 'left', sortable: true },
  { name: 'actions', label: 'Acções', field: 'id', align: 'center', sortable: false }
]

const statusOptions = [
  { label: 'Na fila', value: 'queued' },
  { label: 'A enviar', value: 'processing' },
  { label: 'Falhou', value: 'failed' },
  { label: 'Enviada', value: 'sent' }
]

const typeOptions = computed(() => {
  const seen = new Set()
  const opts = []
  for (const r of pendingList.value) {
    if (r.messageType && !seen.has(r.messageType)) {
      seen.add(r.messageType)
      opts.push({ label: messageTypeLabel(r.messageType), value: r.messageType })
    }
  }
  return opts
})

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return pendingList.value.filter(r => {
    const matchesSearch = !q
      || `${customerName(r)} ${r.phone || ''} ${r.messageType || ''} ${r.messageBody || ''}`.toLowerCase().includes(q)
    const matchesType = !filterType.value || r.messageType === filterType.value
    const matchesStatus = !filterStatus.value || r.status === filterStatus.value
    return matchesSearch && matchesType && matchesStatus
  })
})

// Paginação: manter rowsNumber sincronizado com o conjunto filtrado (senão o
// rodapé mostra "1-0 of 0") e voltar à última página válida se o filtro reduzir linhas.
watch(filteredRows, (rows) => {
  const n = rows.length
  const rpp = pagination.value.rowsPerPage || 15
  const maxPage = Math.max(1, Math.ceil(n / rpp))
  pagination.value.rowsNumber = n
  if (pagination.value.page > maxPage) pagination.value.page = maxPage
})

// ==================== RESUMO (1 KPI) ====================
const queuedCount = computed(() => pendingList.value.filter(r => r.status === 'queued').length)
const processingCount = computed(() => pendingList.value.filter(r => r.status === 'processing').length)
const failedCount = computed(() => pendingList.value.filter(r => r.status === 'failed').length)
const totalPending = computed(() => queuedCount.value + processingCount.value + failedCount.value)
const sentCount = computed(() => Number(smsSummary.value?.sent || 0))

function customerName(row) {
  return row?.customer?.customerName || row?.customerName || '—'
}
function accountNumber(row) {
  return row?.customer?.accountNumber ?? row?.accountNumber ?? '—'
}
function phoneLabel(row) {
  return row?.customer?.customerPhone || row?.phone ? `+${row?.customer?.customerPhone || row?.phone}` : '—'
}
function statusLabel(status) {
  return { queued: 'Na fila', processing: 'A enviar', failed: 'Falhou', sent: 'Enviada' }[status] || status
}
function statusColor(status) {
  return { queued: 'orange', processing: 'blue', failed: 'negative', sent: 'positive' }[status] || 'grey'
}
function messageTypeLabel(type) {
  const labels = {
    password_reset: 'Senha de acesso',
    loan_disbursement: 'Desembolso de crédito',
    installment_payment: 'Pagamento de prestação',
    late_interest_notice: 'Juros de mora',
    upcoming_installment_alert: 'Vencimento de prestação',
    admin_announcement: 'Anúncio'
  }
  return labels[type] || type || '—'
}
function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('pt-MZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function viewMessage(row) {
  selectedRow.value = row
  showMessageDialog.value = true
}

function clearFilters() {
  search.value = ''
  filterType.value = null
  filterStatus.value = null
}

async function fetchPending() {
  loading.value = true
  try {
    const companyId = authStore.companyId
    const [{ data: listData }, { data: summaryData }] = await Promise.all([
      api.get('/api/sms-gateway/pending-credentials', { params: { companyId } }),
      api.get('/api/sms-gateway/summary', { params: { companyId } })
    ])
    pendingList.value = listData.result || []
    smsSummary.value = summaryData?.result || {}
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao carregar as mensagens',
      position: 'top'
    })
    pendingList.value = []
  } finally {
    loading.value = false
  }
}

async function requeue(row) {
  requeueingId.value = row.id
  try {
    const { data } = await api.post(`/api/sms-gateway/pending-credentials/${row.id}/requeue`)
    $q.notify({ type: 'positive', message: data.message || 'SMS reposto na fila', position: 'top' })
    await fetchPending()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao repor SMS na fila',
      position: 'top'
    })
  } finally {
    requeueingId.value = null
  }
}

function deleteMessage(row) {
  $q.dialog({
    title: 'Eliminar mensagem',
    message: `Pretende eliminar a mensagem de ${customerName(row)}?`,
    cancel: 'Cancelar',
    ok: { label: 'Eliminar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      const { data } = await api.delete(`/api/sms-gateway/${row.id}`)
      $q.notify({ type: 'positive', message: data.message || 'Mensagem eliminada', position: 'top' })
      await fetchPending()
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Erro ao eliminar a mensagem',
        position: 'top'
      })
    }
  })
}

async function flushQueue() {
  try {
    const companyId = authStore.companyId
    const { data } = await api.post('/api/sms-gateway/process', { companyId })
    const result = data?.result || {}
    const sent = result.sent || result.sent_count || 0
    const failed = result.failed || 0
    const deferred = result.deferred || 0
    $q.notify({
      type: 'positive',
      message: `Fila processada: ${sent} enviadas, ${deferred} aguardando saldo${failed ? `, ${failed} com erro` : ''}.`,
      position: 'top'
    })
    await fetchPending()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao processar a fila',
      position: 'top'
    })
  }
}

// ==================== EXPORTAÇÃO ====================
const exportCfg = {
  headers: ['Mutuário', 'Telefone', 'Estado', 'Assunto', 'Enviado em'],
  keys: ['customer', 'phone', 'status', 'subject', 'sentAt'],
  widths: [140, 95, 75, 95, 85]
}

function exportRows() {
  return filteredRows.value.map(r => ({
    customer: customerName(r),
    phone: phoneLabel(r).replace(/^\+/, ''),
    status: statusLabel(r.status),
    subject: messageTypeLabel(r.messageType),
    sentAt: r.sentAt ? formatDateTime(r.sentAt) : '—'
  }))
}

async function exportPDF() {
  const rows = exportRows()
  if (rows.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há mensagens para exportar', position: 'top' })
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

    const body = [
      exportCfg.headers.map(h => ({ text: h, style: 'tableHeader' })),
      ...rows.map(row => exportCfg.keys.map(k => ({ text: String(row[k] ?? '—'), style: 'cellText' })))
    ]

    const dateStr = new Date().toISOString().slice(0, 10)
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [24, 20, 24, 30],
      content: [
        ...buildCompanyHeader(company, logoBase64, `Centro de Mensagens — ${dateStr}`),
        {
          text: rows.length > 1 ? `${rows.length} mensagens` : '1 mensagem',
          fontSize: 8,
          color: '#444',
          margin: [0, 0, 0, 8]
        },
        {
          table: {
            headerRows: 1,
            widths: exportCfg.widths,
            body
          },
          layout: 'grid',
          fontSize: 7
        }
      ],
      styles: {
        cellText: { fontSize: 7 },
        tableHeader: { fontSize: 7, bold: true, alignment: 'center', fillColor: '#e8eaf6' }
      }
    }

    pdfMake.createPdf(docDefinition).download(`centro-mensagens-${dateStr}.pdf`)
    $q.notify({ type: 'positive', message: 'PDF gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar PDF:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF', position: 'top' })
  }
}

async function exportExcel() {
  const rows = exportRows()
  if (rows.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há mensagens para exportar', position: 'top' })
    return
  }
  try {
    const XLSX = await import('xlsx')
    const wsData = [
      ['Centro de Mensagens'],
      [`Gerado em ${new Date().toLocaleString('pt-MZ')}`],
      [],
      exportCfg.headers,
      ...rows.map(row => exportCfg.keys.map(k => String(row[k] ?? ''))),
      [],
      [`Total de mensagens: ${rows.length}`]
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = exportCfg.headers.map((h, i) => ({ wch: exportCfg.widths[i] ? Math.ceil(exportCfg.widths[i] / 6) : 20 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mensagens')

    const fileName = `centro-mensagens-${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
    $q.notify({ type: 'positive', message: 'Excel gerado com sucesso!', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar Excel:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar Excel', position: 'top' })
  }
}

onMounted(async () => {
  const companyId = authStore.companyId
  if (companyId && !companyStore.company) {
    await companyStore.fetchCompany(companyId).catch(() => {})
  }
  fetchPending()
})
</script>

<style lang="scss" scoped>
.q-table {
  font-size: 12px;
}

.message-body-card {
  border-radius: 8px;
  background: #f5f5f5;

  .message-body-text {
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #37474f;
  }
}

body.body--dark .message-body-card {
  background: #1f2733;
  border-color: rgba(255, 255, 255, 0.08);

  .message-body-text {
    color: #e2e8f0;
  }
}
</style>