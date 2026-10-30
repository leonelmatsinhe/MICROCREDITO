<template>
  <div class="q-pa-md pending-creds-page">
    <!-- ═══════════ CABEÇALHO EXECUTIVO ═══════════ -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center no-wrap">
          <q-icon name="forum" class="q-mr-sm text-primary" size="26px" />
          <h1 class="text-h6 text-weight-bold text-slate-800 q-my-none">
            Centro de Mensagens e Notificações
          </h1>
          <q-chip
            :color="companySmsEnabled ? 'positive' : 'amber-9'"
            text-color="white"
            size="sm"
            dense
            class="q-ml-sm"
          >
            <q-icon :name="companySmsEnabled ? 'check_circle' : 'warning'" size="14px" class="q-mr-xs" />
            Gateway SMS: {{ companySmsEnabled ? 'Activo' : 'Desactivado' }}
          </q-chip>
        </div>
        <div class="text-caption text-grey-7 q-mt-xs">
          Gestão de fila de saída, alertas de cobrança, recibos e credenciais por SMS e WhatsApp
        </div>
      </div>

      <div class="row items-center q-gutter-xs">
        <q-btn
          outline
          color="grey-8"
          icon="picture_as_pdf"
          label="PDF"
          no-caps
          rounded
          size="sm"
          @click="exportPDF"
        />
        <q-btn
          outline
          color="green-8"
          icon="table_view"
          label="Excel"
          no-caps
          rounded
          size="sm"
          @click="exportExcel"
        />
        <q-btn
          outline
          color="primary"
          icon="refresh"
          label="Actualizar"
          no-caps
          rounded
          size="sm"
          :loading="loading"
          @click="fetchPending"
        />
      </div>
    </div>

    <!-- ═══════════ ALERTA DE SMS DESACTIVADO ═══════════ -->
    <q-banner
      v-if="!companySmsEnabled"
      class="bg-amber-1 text-amber-10 q-mb-md border-amber rounded-borders shadow-1"
      rounded
    >
      <template v-slot:avatar>
        <q-icon name="phonelink_erase" color="amber-9" size="28px" />
      </template>
      <div class="text-weight-bold">O envio automático de SMS está temporariamente desactivado</div>
      <div class="text-caption q-mt-xs">
        As mensagens geradas ficam em espera e não são cobradas nem entregues até que um Administrador reactive o serviço nas opções da instituição.
      </div>
      <template v-slot:action>
        <q-btn
          flat
          dense
          no-caps
          color="amber-10"
          icon="settings"
          label="Ir para Configurações"
          @click="$router.push('/configuracoes')"
        />
      </template>
    </q-banner>

    <!-- ═══════════ KPI EXECUTIVE STRIP ═══════════ -->
    <div class="row q-col-gutter-sm q-mb-md" data-tour="sms-kpis">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Na Fila de Saída</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-slate-900">{{ queuedCount }}</span>
              <q-badge color="orange" outline size="sm">
                {{ processingCount > 0 ? `${processingCount} a enviar` : 'Aguardando' }}
              </q-badge>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Enviadas com Sucesso</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-positive">{{ sentCount }}</span>
              <span class="text-caption text-grey-6 font-mono">{{ deliveryRate }}% eficácia</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card" :class="{ 'kpi-alert': failedCount > 0 }">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Falhas / Requer Atenção</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold" :class="failedCount > 0 ? 'text-negative' : 'text-slate-800'">
                {{ failedCount }}
              </span>
              <q-badge v-if="failedCount > 0" color="negative" size="sm">
                Exige correcção de contacto
              </q-badge>
              <span v-else class="text-caption text-positive">Nenhuma falha</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-6 text-uppercase text-weight-medium">Total de Mensagens</div>
            <div class="row items-baseline justify-between q-mt-xs">
              <span class="text-h6 text-weight-bold text-slate-900">{{ pendingList.length }}</span>
              <span class="text-caption text-grey-6">Últimos registos</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- ═══════════ BARRA DE FILTROS & PRESETS ═══════════ -->
    <q-card flat bordered class="q-mb-md filters-card" data-tour="sms-filters">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <!-- Filtro de Texto -->
          <div class="col-12 col-sm-4 col-md-3">
            <q-input
              v-model="search"
              dense
              outlined
              clearable
              placeholder="Pesquisar mutuário, telefone, mensagem..."
              input-style="font-size: 12px"
            >
              <template v-slot:prepend><q-icon name="search" size="16px" /></template>
            </q-input>
          </div>

          <!-- Filtro de Assunto com rótulo visível -->
          <div class="col-12 col-sm-3 col-md-2">
            <q-select
              v-model="filterType"
              :options="typeOptions"
              dense
              outlined
              clearable
              emit-value
              map-options
              label="Assunto"
              options-dense
              input-style="font-size: 12px"
            />
          </div>

          <!-- Filtro de Estado com rótulo visível -->
          <div class="col-12 col-sm-3 col-md-2">
            <q-select
              v-model="filterStatus"
              :options="statusOptions"
              dense
              outlined
              clearable
              emit-value
              map-options
              label="Estado"
              options-dense
              input-style="font-size: 12px"
            />
          </div>

          <!-- Atalhos Rápidos de Estado -->
          <div class="col-12 col-md-auto q-gutter-xs">
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="!filterStatus ? 'primary' : 'grey-2'"
              :text-color="!filterStatus ? 'white' : 'grey-8'"
              label="Todas"
              @click="filterStatus = null"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="filterStatus === 'queued' ? 'primary' : 'grey-2'"
              :text-color="filterStatus === 'queued' ? 'white' : 'grey-8'"
              label="Na Fila"
              @click="filterStatus = 'queued'"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="filterStatus === 'failed' ? 'negative' : 'grey-2'"
              :text-color="filterStatus === 'failed' ? 'white' : 'grey-8'"
              label="Falhas"
              @click="filterStatus = 'failed'"
            />
            <q-btn
              unelevated
              rounded
              dense
              size="sm"
              class="q-px-sm"
              :color="filterStatus === 'sent' ? 'positive' : 'grey-2'"
              :text-color="filterStatus === 'sent' ? 'white' : 'grey-8'"
              label="Enviadas"
              @click="filterStatus = 'sent'"
            />
          </div>

          <div class="col-auto">
            <q-btn
              v-if="isFiltering"
              flat
              dense
              color="grey-7"
              icon="filter_alt_off"
              label="Limpar"
              size="sm"
              @click="clearFilters"
            />
          </div>

          <q-space />

          <div class="col-auto text-caption text-grey-6">
            Apresentando <strong>{{ filteredRows.length }}</strong> de {{ pendingList.length }}
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ═══════════ LOADING ═══════════ -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-6 q-mt-sm">A carregar fila de mensagens...</div>
    </div>

    <!-- ═══════════ ESTADO VAZIO ═══════════ -->
    <q-card v-else-if="filteredRows.length === 0" flat bordered class="empty-card text-center q-pa-xl" data-tour="sms-vazio">
      <q-card-section>
        <q-icon name="mark_email_read" size="56px" color="green-5" />
        <div class="text-subtitle1 text-weight-bold text-slate-800 q-mt-md">Nenhuma mensagem encontrada</div>
        <div class="text-caption text-grey-6 q-mt-xs">
          {{ isFiltering ? 'Nenhum registo corresponde aos filtros seleccionados.' : 'Não há mensagens pendentes nem histórico recente de envios.' }}
        </div>
        <q-btn
          v-if="isFiltering"
          outline
          color="primary"
          no-caps
          rounded
          size="sm"
          icon="filter_alt_off"
          label="Limpar Filtros"
          class="q-mt-md"
          @click="clearFilters"
        />
        <q-btn
          v-else
          outline
          color="primary"
          no-caps
          rounded
          size="sm"
          icon="refresh"
          label="Verificar novamente"
          class="q-mt-md"
          @click="fetchPending"
        />
      </q-card-section>
    </q-card>

    <!-- ═══════════ TABELA DE MENSAGENS ═══════════ -->
    <q-card v-else flat bordered class="table-card">
      <q-table
        data-tour="sms-table"
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        flat
        :rows-per-page-options="[15, 25, 50, 100]"
        :pagination="pagination"
      >
        <!-- Destinatário / Mutuário -->
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <template v-if="isCustomerMessage(props.row)">
              <div class="text-weight-bold text-slate-800" style="font-size: 13px">
                {{ customerName(props.row) }}
              </div>
              <div class="text-caption text-grey-6">
                Conta {{ accountNumber(props.row) }}
              </div>
            </template>
            <template v-else>
              <div class="row items-center no-wrap">
                <q-badge color="grey-3" text-color="grey-9" class="text-weight-medium q-mr-xs">
                  <q-icon name="admin_panel_settings" size="12px" class="q-mr-xs text-primary" />
                  Notificação Interna
                </q-badge>
              </div>
              <div class="text-caption text-grey-6 q-mt-xs">
                Administração / Equipa Operacional
              </div>
            </template>
          </q-td>
        </template>

        <!-- Telefone & WhatsApp -->
        <template v-slot:body-cell-phone="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <span class="font-mono text-weight-medium text-slate-800 q-mr-xs">
                {{ phoneLabel(props.row) }}
              </span>
              <a
                v-if="whatsappLink(props.row)"
                :href="whatsappLink(props.row)"
                target="_blank"
                rel="noopener"
                class="wa-icon-link"
                title="Abrir WhatsApp"
              >
                <q-icon name="chat" size="15px" color="positive" />
                <q-tooltip>Abrir conversa no WhatsApp</q-tooltip>
              </a>
            </div>
          </q-td>
        </template>

        <!-- Estado -->
        <template v-slot:body-cell-status="props">
          <q-td :props="props" data-tour="sms-estado">
            <q-chip :color="statusColor(props.row.status)" text-color="white" size="xs" dense>
              <q-icon :name="statusIcon(props.row.status)" size="11px" class="q-mr-xs" />
              {{ statusLabel(props.row.status) }}
            </q-chip>
            <div v-if="props.row.retries > 0" class="text-caption text-grey-6 q-mt-xs">
              {{ props.row.retries }} tentativa(s)
            </div>
          </q-td>
        </template>

        <!-- Assunto & Erro -->
        <template v-slot:body-cell-subject="props">
          <q-td :props="props">
            <div class="text-weight-medium text-slate-800" style="font-size: 12px">
              {{ messageTypeLabel(props.row.messageType) }}
            </div>
            <div
              v-if="props.row.errorMessage"
              class="text-negative text-caption ellipsis q-mt-xs flex items-center"
              style="max-width: 280px"
              :title="props.row.errorMessage"
            >
              <q-icon name="error_outline" size="13px" class="q-mr-xs text-negative" />
              <span>{{ props.row.errorMessage }}</span>
            </div>
          </q-td>
        </template>

        <!-- Data de Envio / Criação -->
        <template v-slot:body-cell-created="props">
          <q-td :props="props">
            <template v-if="props.row.sentAt">
              <div class="text-weight-medium text-slate-800" style="font-size: 12px">
                {{ formatDateTime(props.row.sentAt) }}
              </div>
              <div class="text-caption text-positive">Entregue</div>
            </template>
            <template v-else>
              <div style="font-size: 12px" class="text-grey-6">—</div>
              <div class="text-caption text-grey-6">Criado em {{ formatDateTime(props.row.createdAt) }}</div>
            </template>
          </q-td>
        </template>

        <!-- Acções -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" data-tour="sms-acoes">
            <div class="row items-center justify-center no-wrap q-gutter-xs">
              <q-btn
                flat
                round
                dense
                icon="visibility"
                size="sm"
                color="primary"
                @click="viewMessage(props.row)"
              >
                <q-tooltip>Ver conteúdo da mensagem</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="replay"
                :color="companySmsEnabled ? 'teal-8' : 'grey-5'"
                size="sm"
                :disable="!companySmsEnabled || requeueingId === props.row.id"
                :loading="requeueingId === props.row.id"
                @click="requeue(props.row)"
              >
                <q-tooltip>{{ companySmsEnabled ? 'Reenviar SMS' : 'SMS desactivado nas configurações' }}</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete_outline"
                size="sm"
                color="negative"
                @click="deleteMessage(props.row)"
              >
                <q-tooltip>Eliminar registo</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- ═══════════ MODAL DE VISUALIZAÇÃO DE MENSAGEM ═══════════ -->
    <q-dialog v-model="showMessageDialog">
      <q-card style="border-radius: 12px; min-width: 480px; max-width: 92vw">
        <!-- Header verde institucional com badge de estado -->
        <q-card-section class="row items-center q-py-sm text-white" style="background: #1B5E20; border-radius: 12px 12px 0 0">
          <q-icon name="chat" size="20px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Visualização da Mensagem</div>
          <q-chip
            v-if="selectedRow"
            :color="headerChipColor(selectedRow.status)"
            text-color="white"
            size="sm"
            dense
            class="q-ml-sm"
          >
            {{ statusLabel(selectedRow.status) }}
          </q-chip>
          <q-space />
          <q-btn flat round dense icon="close" color="white" @click="showMessageDialog = false" />
        </q-card-section>

        <q-card-section v-if="selectedRow" class="q-pt-md q-pb-sm">
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <div class="text-caption text-grey-6 text-uppercase">Destinatário</div>
              <div class="text-weight-bold text-slate-800" style="font-size: 13px">
                {{ isCustomerMessage(selectedRow) ? customerName(selectedRow) : 'Equipa Interna / Administração' }}
              </div>
              <div v-if="isCustomerMessage(selectedRow)" class="text-caption text-grey-6">
                Conta {{ accountNumber(selectedRow) }}
              </div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6 text-uppercase">Tipo / Assunto</div>
              <div class="text-weight-bold text-slate-800" style="font-size: 13px">
                {{ messageTypeLabel(selectedRow.messageType) }}
              </div>
              <div class="text-caption text-grey-6">
                {{ formatDateTime(selectedRow.sentAt || selectedRow.createdAt) }}
              </div>
            </div>
          </div>

          <div class="q-mt-sm">
            <div class="text-caption text-grey-6 text-uppercase">Contacto Telefónico</div>
            <a
              v-if="whatsappLink(selectedRow)"
              :href="whatsappLink(selectedRow)"
              target="_blank"
              rel="noopener"
              class="row items-center no-wrap msg-wa-link q-mt-xs"
            >
              <q-icon name="phone" size="14px" class="q-mr-xs text-positive" />
              <span class="text-weight-bold font-mono" style="font-size: 13px">{{ phoneLabel(selectedRow) }}</span>
              <q-icon name="open_in_new" size="12px" class="q-ml-xs" />
              <q-tooltip>Abrir conversa no WhatsApp</q-tooltip>
            </a>
            <div v-else class="text-weight-bold font-mono" style="font-size: 13px">
              {{ phoneLabel(selectedRow) }}
            </div>
          </div>

          <div v-if="selectedRow.errorMessage" class="q-mt-sm q-pa-sm bg-red-1 text-negative rounded-borders border-negative">
            <div class="text-caption text-weight-bold flex items-center">
              <q-icon name="error" size="14px" class="q-mr-xs" />
              Erro no envio
            </div>
            <div class="text-caption" style="font-size: 12px; white-space: pre-wrap">{{ selectedRow.errorMessage }}</div>
          </div>
        </q-card-section>

        <!-- Corpo da mensagem -->
        <q-card-section v-if="selectedRow" class="q-pt-none">
          <div class="text-caption text-grey-6 text-uppercase q-mb-xs">Texto Transmitido</div>
          <q-card flat class="message-body-card">
            <q-card-section style="padding: 14px">
              <div class="message-body-text">{{ selectedRow.messageBody }}</div>
            </q-card-section>
          </q-card>
          <div class="text-caption text-grey-5 q-mt-xs text-right">
            {{ selectedRow.messageBody?.length || 0 }} caracteres
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Fechar" color="grey-8" @click="showMessageDialog = false" />
          <q-btn
            unelevated
            no-caps
            rounded
            icon="replay"
            label="Reenviar Mensagem"
            :color="companySmsEnabled ? 'teal-8' : 'grey-5'"
            :disable="!companySmsEnabled || requeueingId === selectedRow?.id"
            :loading="requeueingId === selectedRow?.id"
            @click="resendFromDialog"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(false)
const pendingList = ref([])
const showMessageDialog = ref(false)
const selectedRow = ref(null)
const requeueingId = ref(null)

const search = ref('')
const filterType = ref(null)
const filterStatus = ref(null)

// Client-side pagination (sem rowsNumber fixo para não bloquear filtragem no client)
const pagination = ref({ sortBy: 'createdAt', descending: true, page: 1, rowsPerPage: 15 })

const companySmsEnabled = computed(() => Number(companyStore.company?.smsEnabled ?? 1) === 1)

// KPIs
const queuedCount = computed(() => pendingList.value.filter(r => r.status === 'queued').length)
const processingCount = computed(() => pendingList.value.filter(r => r.status === 'processing').length)
const sentCount = computed(() => pendingList.value.filter(r => r.status === 'sent').length)
const failedCount = computed(() => pendingList.value.filter(r => r.status === 'failed').length)

const deliveryRate = computed(() => {
  const total = sentCount.value + failedCount.value
  if (total === 0) return '100.0'
  return ((sentCount.value / total) * 100).toFixed(1)
})

const isFiltering = computed(() => {
  return !!search.value || !!filterType.value || !!filterStatus.value
})

const columns = [
  { name: 'customer', label: 'Destinatário / Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'phone', label: 'Contacto Telefónico', field: 'phone', align: 'left', sortable: false },
  { name: 'status', label: 'Estado', field: 'status', align: 'left', sortable: true },
  { name: 'subject', label: 'Assunto / Finalidade', field: 'messageType', align: 'left', sortable: true },
  { name: 'created', label: 'Data de Envio', field: 'sentAt', align: 'left', sortable: true },
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
    const cust = customerName(r)
    const phone = r.phone || ''
    const body = r.messageBody || ''
    const type = messageTypeLabel(r.messageType)
    const matchesSearch = !q || `${cust} ${phone} ${body} ${type}`.toLowerCase().includes(q)
    const matchesType = !filterType.value || r.messageType === filterType.value
    const matchesStatus = !filterStatus.value || r.status === filterStatus.value
    return matchesSearch && matchesType && matchesStatus
  })
})

watch(filteredRows, (rows) => {
  const n = rows.length
  const rpp = pagination.value.rowsPerPage || 15
  const maxPage = Math.max(1, Math.ceil(n / rpp))
  if (pagination.value.page > maxPage) pagination.value.page = maxPage
})

function isCustomerMessage(row) {
  const name = customerName(row)
  return name && name !== '—' && name.trim() !== ''
}

function customerName(row) {
  return row?.customer?.customerName || row?.customerName || '—'
}

function accountNumber(row) {
  return row?.customer?.accountNumber ?? row?.accountNumber ?? '—'
}

/**
 * Normaliza o telefone garantindo exactamente um '+' no início (evita bugs como ++258)
 */
function phoneLabel(row) {
  const raw = String(row?.customer?.customerPhone || row?.phone || '').trim()
  if (!raw) return '—'
  return raw.startsWith('+') ? raw : `+${raw}`
}

function statusLabel(status) {
  return {
    queued: 'Na fila',
    processing: 'A enviar',
    failed: 'Falhou',
    sent: 'Enviada'
  }[status] || status
}

function statusIcon(status) {
  return {
    queued: 'schedule',
    processing: 'sync',
    failed: 'highlight_off',
    sent: 'check_circle'
  }[status] || 'help_outline'
}

function statusColor(status) {
  return {
    queued: 'orange-8',
    processing: 'blue-8',
    failed: 'negative',
    sent: 'positive'
  }[status] || 'grey'
}

function headerChipColor(status) {
  return {
    queued: 'orange-9',
    processing: 'blue-9',
    failed: 'negative',
    sent: 'positive'
  }[status] || 'grey-7'
}

function whatsappLink(row) {
  const raw = String(row?.customer?.customerPhone || row?.phone || '')
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 9 ? `https://wa.me/${digits}` : null
}

function messageTypeLabel(type) {
  const labels = {
    password_reset: 'Senha de Acesso',
    customer_credentials: 'Credenciais de Acesso',
    loan_disbursement: 'Desembolso de Crédito',
    installment_payment: 'Pagamento de Prestação',
    late_interest_notice: 'Juros de Mora',
    upcoming_installment_alert: 'Aviso de Vencimento',
    installment_reminder: 'Lembrete de Prestação',
    overdue_reminder: 'Aviso de Prestação em Mora',
    admin_daily_close_summary: 'Fecho Diário Administrativo',
    staff_mpesa_payment_alert: 'Alerta M-Pesa (Equipa)',
    staff_loan_alert: 'Alerta de Crédito (Equipa)',
    payment_receipt: 'Recibo de Pagamento',
    admin_announcement: 'Anúncio Institucional',
    welcome: 'Boas-vindas'
  }
  return labels[type] || type || 'Mensagem Geral'
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
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
    const { data: listData } = await api.get('/api/sms-gateway/pending-credentials', { params: { companyId } })
    pendingList.value = listData.result || []
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
    $q.notify({ type: 'positive', message: data.message || 'SMS reposto na fila de envio', position: 'top' })
    await fetchPending()
    return true
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Erro ao repor SMS na fila',
      position: 'top'
    })
    return false
  } finally {
    requeueingId.value = null
  }
}

async function resendFromDialog() {
  const row = selectedRow.value
  if (!row) return
  const ok = await requeue(row)
  if (ok && selectedRow.value === row) {
    selectedRow.value = { ...row, status: 'queued', retries: 0 }
  }
}

function deleteMessage(row) {
  const name = isCustomerMessage(row) ? customerName(row) : messageTypeLabel(row.messageType)
  $q.dialog({
    title: 'Eliminar Registo de Mensagem',
    message: `Pretende eliminar o registo de ${name}?`,
    cancel: 'Cancelar',
    ok: { label: 'Eliminar', color: 'negative', unelevated: true, noCaps: true },
    persistent: true
  }).onOk(async () => {
    try {
      const { data } = await api.delete(`/api/sms-gateway/${row.id}`)
      $q.notify({ type: 'positive', message: data.message || 'Registo eliminado com sucesso', position: 'top' })
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

// ==================== EXPORTAÇÃO ====================
const exportCfg = {
  headers: ['Destinatário', 'Telefone', 'Estado', 'Assunto', 'Data de Envio'],
  keys: ['customer', 'phone', 'status', 'subject', 'sentAt'],
  widths: [140, 95, 75, 110, 85]
}

function exportRows() {
  return filteredRows.value.map(r => ({
    customer: isCustomerMessage(r) ? customerName(r) : 'Equipa Interna / Sistema',
    phone: phoneLabel(r).replace(/^\+/, ''),
    status: statusLabel(r.status),
    subject: messageTypeLabel(r.messageType),
    sentAt: r.sentAt ? formatDateTime(r.sentAt) : (r.createdAt ? formatDateTime(r.createdAt) : '—')
  }))
}

async function exportPDF() {
  const rows = exportRows()
  if (rows.length === 0) {
    $q.notify({ type: 'warning', message: 'Não há mensagens para exportar', position: 'top' })
    return
  }
  try {
    const { downloadTablePdf } = await import('@/utils/tablePdf')
    const dateStr = new Date().toISOString().slice(0, 10)
    await downloadTablePdf({
      title: 'Centro de Mensagens e Notificações',
      meta: [`Emitido em ${dateStr}`, rows.length > 1 ? `${rows.length} mensagens` : '1 mensagem'],
      filename: `centro-mensagens-${dateStr}`,
      columns: exportCfg.headers.map((h, i) => ({
        label: h,
        width: exportCfg.widths[i] ? Math.round(exportCfg.widths[i] * 0.9) : undefined,
        align: 'left'
      })),
      rows: rows.map(row => exportCfg.keys.map(k => String(row[k] ?? '—')))
    }, `centro-mensagens-${dateStr}.pdf`)
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
      ['Centro de Mensagens e Notificações'],
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
.pending-creds-page {
  max-width: 1400px;
  margin: 0 auto;
}

.kpi-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  transition: all 0.2s ease;

  &.kpi-alert {
    border-color: #fca5a5;
    background: #fef2f2;
  }
}

.filters-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.table-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.border-amber {
  border: 1px solid #fcd34d;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.wa-icon-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  opacity: 0.85;
  transition: opacity 0.15s ease, transform 0.15s ease;

  &:hover {
    opacity: 1;
    transform: scale(1.15);
  }
}

.message-body-card {
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;

  .message-body-text {
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    color: #1e293b;
  }
}

.msg-wa-link {
  color: #1B5E20;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

body.body--dark {
  .kpi-card {
    background: #1e293b;
    border-color: #334155;

    &.kpi-alert {
      background: #450a0a;
      border-color: #7f1d1d;
    }
  }

  .filters-card {
    background: #1e293b;
    border-color: #334155;
  }

  .table-card {
    background: #1e293b;
    border-color: #334155;
  }

  .message-body-card {
    background: #0f172a;
    border-color: #334155;

    .message-body-text {
      color: #e2e8f0;
    }
  }

  .msg-wa-link {
    color: #81c784;
  }
}
</style>
