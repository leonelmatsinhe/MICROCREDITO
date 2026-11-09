<template>
  <div data-tour="mutuario-body">
    <!-- ===================== HEADER COCKPIT 360° (Substitui a Navbar com Máximo Respiro) ===================== -->
    <div class="mutuario-header" data-tour="mutuario-header">
      <!-- ── TIER 1: BARRA DE NAVEGAÇÃO & IDENTIDADE DO MUTUÁRIO ── -->
      <q-toolbar class="q-py-md q-px-lg">
        <!-- Avatar do Mutuário -->
        <q-avatar size="48px" :color="statusColor" text-color="white" style="cursor: pointer" class="shadow-2 q-mr-md" @click="openPassportPhoto">
          <img v-if="store.customer?.passportPhotoUrl" :src="store.customer.passportPhotoUrl" alt="Foto" style="width: 100%; height: 100%; object-fit: cover" />
          <q-icon v-else name="person" size="28px" />
          <q-tooltip v-if="store.customer?.passportPhotoUrl">Clique para ampliar fotografia</q-tooltip>
        </q-avatar>

        <!-- Nome Completo & Badges de Estado / DTI (Máximo Respiro, sem truncamento!) -->
        <div class="col">
          <div class="row items-center q-gutter-sm">
            <span class="text-h5 text-weight-bolder text-white borrower-name-title">
              {{ displayBorrowerName }}
              <q-tooltip v-if="store.customer?.customerName && displayBorrowerName !== store.customer.customerName">
                {{ store.customer.customerName }}
              </q-tooltip>
            </span>
            <q-badge :color="statusColor" :label="statusText" rounded style="font-size: 11px; padding: 4px 10px" />
            <q-badge
              v-if="store.dtiStatus?.ratio > 0"
              :color="store.dtiStatus.color"
              rounded
              class="text-weight-bold"
              style="font-size: 11px; padding: 4px 10px"
            >
              DTI: {{ store.dtiStatus.percentStr }} · {{ store.dtiStatus.label }}
              <q-tooltip>Taxa de Esforço: A prestação compromete {{ store.dtiStatus.percentStr }} do rendimento mensal (Padrão BM/CGAP)</q-tooltip>
            </q-badge>
            <q-badge v-if="Number(store.customer?.isSelfRegistered) === 1" color="teal" outline rounded class="gt-xs" style="font-size: 10px">Auto-cadastro</q-badge>
          </div>
        </div>

        <q-space />

        <!-- Acções Rápidas com Espaço Confortável (data-tour="mutuario-actions") -->
        <div class="row items-center q-gutter-sm" data-tour="mutuario-actions">
          <q-btn
            unelevated
            rounded
            color="positive"
            text-color="white"
            icon="paid"
            label="Registar Pagamento"
            class="q-px-md text-weight-bold gt-xs"
            no-caps
            :disable="!store.activeLoanNextInstallment && store.pendingInstallments.length === 0"
            @click="openQuickPayment"
          >
            <q-tooltip>Receber prestação pendente ou liquidar débito</q-tooltip>
          </q-btn>

          <q-btn
            outline
            rounded
            color="orange-3"
            icon="campaign"
            label="Cobrança"
            class="q-px-md text-weight-bold gt-xs"
            no-caps
            @click="openCollectionModal"
          >
            <q-tooltip>Enviar lembrete ou notificação formal via SMS ou WhatsApp Directo</q-tooltip>
          </q-btn>

          <q-btn
            outline
            rounded
            color="white"
            icon="picture_as_pdf"
            label="Extracto PDF"
            class="q-px-sm gt-sm"
            no-caps
            :loading="extracting"
            :disable="!store.activeLoan?.id"
            @click="printExtract"
          >
            <q-tooltip>Emitir Extracto da Conta Actualizado em PDF</q-tooltip>
          </q-btn>

          <!-- Menu de Mais Opções -->
          <q-btn flat round dense icon="more_vert" color="white">
            <q-menu anchor="bottom right" self="top right">
              <q-list style="min-width: 220px">
                <q-item clickable v-close-popup @click="goBack">
                  <q-item-section avatar><q-icon name="arrow_back" color="primary" /></q-item-section>
                  <q-item-section class="text-weight-medium">Lista de Mutuários</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup class="lt-sm" @click="openQuickPayment">
                  <q-item-section avatar><q-icon name="paid" color="positive" /></q-item-section>
                  <q-item-section>Registar Pagamento</q-item-section>
                </q-item>
                <q-item clickable v-close-popup class="lt-sm" @click="openCollectionModal">
                  <q-item-section avatar><q-icon name="chat" color="amber-8" /></q-item-section>
                  <q-item-section>Enviar Cobrança</q-item-section>
                </q-item>
                <q-item clickable v-close-popup class="lt-md" @click="printExtract">
                  <q-item-section avatar><q-icon name="picture_as_pdf" color="primary" /></q-item-section>
                  <q-item-section>Baixar Extracto PDF</q-item-section>
                </q-item>
                <q-separator class="lt-sm" />
                <q-item clickable v-close-popup @click="openLiquidateModal" :disable="store.pendingInstallments.length === 0">
                  <q-item-section avatar><q-icon name="account_balance_wallet" color="teal" /></q-item-section>
                  <q-item-section>Liquidar Dívida Total</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="tab = 'creditos'">
                  <q-item-section avatar><q-icon name="calculate" color="primary" /></q-item-section>
                  <q-item-section>Simular Novo Crédito</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="showCredentialsModal = true">
                  <q-item-section avatar><q-icon name="lock_open" color="warning" /></q-item-section>
                  <q-item-section>Enviar Senha do Portal</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="showEditModal = true">
                  <q-item-section avatar><q-icon name="edit" color="grey-8" /></q-item-section>
                  <q-item-section>Editar Cadastro</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>

          <q-separator vertical dark inset class="q-mx-xs" />

          <!-- Alertas do Sistema -->
          <div class="row items-center gt-xs">
            <AlertBell />
          </div>

          <!-- Alternar Tema (Dark Mode) -->
          <q-btn
            flat
            round
            dense
            :icon="uiStore.isDark ? 'light_mode' : 'dark_mode'"
            color="white"
            @click="uiStore.toggleDark()"
          >
            <q-tooltip>{{ uiStore.isDark ? 'Modo Claro' : 'Modo Escuro' }}</q-tooltip>
          </q-btn>

          <!-- Perfil do Mutuário / Iniciais -->
          <q-avatar size="32px" color="positive" text-color="white" class="cursor-pointer shadow-1">
            <span style="font-size: 13px; font-weight: bold">{{ userInitials }}</span>
            <q-menu anchor="bottom right" self="top right">
              <q-list style="min-width: 200px">
                <q-item-label header>
                  <div class="text-weight-bold" style="font-size: 14px">{{ authStore.userName }}</div>
                  <div class="text-caption text-grey-6">{{ userRoleLabel }}</div>
                </q-item-label>
                <q-separator />
                <q-item clickable v-close-popup to="/profile">
                  <q-item-section avatar><q-icon name="person" size="18px" /></q-item-section>
                  <q-item-section>Meu Perfil</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="handleLogout">
                  <q-item-section avatar><q-icon name="logout" color="negative" size="18px" /></q-item-section>
                  <q-item-section class="text-negative">Terminar Sessão</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-avatar>
        </div>
      </q-toolbar>

      <!-- ── TIER 2: FAIXA DEDICADA DE KPIS & MÉTRICAS (Com Total Respiro) ── -->
      <div class="kpi-ribbon-bar q-px-md q-py-sm" data-tour="mutuario-kpis">
        <div class="row q-col-gutter-sm items-center">
          <!-- Rendimento -->
          <div class="col-6 col-sm-3 col-md">
            <div class="kpi-ribbon-item">
              <div class="kpi-ribbon-label">RENDIMENTO MENSAL</div>
              <div class="kpi-ribbon-val">{{ formatMoney(store.customer?.customerMonthlySalary || 0) }}</div>
              <div class="kpi-ribbon-sub">Salário comprovado</div>
            </div>
          </div>

          <!-- Total Dívida -->
          <div class="col-6 col-sm-3 col-md">
            <div class="kpi-ribbon-item">
              <div class="kpi-ribbon-label">TOTAL EM DÍVIDA</div>
              <div class="kpi-ribbon-val" :class="store.saldoRemanescente > 0 ? 'text-amber-3' : 'text-green-3'">
                {{ formatMoney(store.saldoRemanescente) }}
              </div>
              <div class="kpi-ribbon-sub">
                {{ store.saldoRemanescente > 0 ? 'Exposição viva' : 'Regularizado' }}
              </div>
            </div>
          </div>

          <!-- Capacidade (1/3) -->
          <div class="col-6 col-sm-3 col-md">
            <div class="kpi-ribbon-item">
              <div class="kpi-ribbon-label">CAPACIDADE LIVRE (1/3)</div>
              <div class="kpi-ribbon-val">
                {{ formatMoney(Math.max(0, store.maxCapacity - currentInstallmentShare)) }}
              </div>
              <div class="kpi-ribbon-sub">Teto de prestação segura</div>
            </div>
          </div>

          <!-- Dossier KYC -->
          <div class="col-6 col-sm-3 col-md cursor-pointer" @click="tab = 'docs'">
            <div class="kpi-ribbon-item">
              <div class="kpi-ribbon-label">DOSSIER KYC</div>
              <div class="row items-center q-mt-xs">
                <q-chip
                  :color="store.isKycComplete ? 'positive' : 'negative'"
                  text-color="white"
                  dense
                  icon="verified"
                  style="font-size: 11px; margin: 0"
                >
                  {{ store.isKycComplete ? 'Completo' : 'Incompleto' }}
                </q-chip>
              </div>
              <div class="kpi-ribbon-sub">Clique para ver documentos</div>
            </div>
          </div>

          <!-- Situação Geral / Próximo Vencimento -->
          <div class="col-12 col-sm-6 col-md gt-xs">
            <div class="kpi-ribbon-item">
              <div class="kpi-ribbon-label">SITUAÇÃO GERAL</div>
              <div class="kpi-ribbon-val text-weight-medium" style="font-size: 13px">
                <template v-if="store.activeLoan">
                  {{ store.activeLoanNextInstallment ? 'Próx: ' + formatDateShort(store.activeLoanNextInstallment.dueDate) : 'Crédito em dia' }}
                </template>
                <template v-else>
                  Sem crédito activo (Quitação)
                </template>
              </div>
              <div class="kpi-ribbon-sub">
                {{ store.activeLoan ? `${store.activeLoan.numberOfInstallments}x prestações` : 'Conta regularizada' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── TIER 3: TABS DE NAVEGAÇÃO ── -->
      <q-tabs
        v-model="tab"
        data-tour="mutuario-tabs"
        dense
        align="left"
        class="mutuario-tabs text-white"
        active-color="white"
        indicator-color="white"
        :breakpoint="0"
      >
        <q-tab name="visao" icon="dashboard" label="Visão Geral" no-caps />
        <q-tab name="creditos" icon="payments" label="Créditos &amp; Concessão" no-caps />
        <q-tab name="amortizacao" icon="table_chart" label="Plano de Amortização" no-caps />
        <q-tab name="docs" icon="folder_shared" no-caps>
          <q-badge v-if="!store.isKycComplete" color="negative" rounded floating style="font-size: 8px">!</q-badge>
          <div class="q-ml-xs">Documentos &amp; KYC</div>
        </q-tab>
        <q-tab name="legais" icon="gavel" label="Documentos Legais" no-caps />
        <q-tab name="garantias" icon="security" label="Garantias &amp; Recibos" no-caps />
      </q-tabs>
    </div>

    <!-- ===================== CONTEÚDO DAS ABAS ===================== -->
    <div class="mutuario-page">
        <!-- Loading inicial -->
        <div v-if="store.loading && !store.customer" class="q-pa-md">
          <q-skeleton type="rect" height="120px" class="q-mb-md" style="border-radius: 12px" />
          <q-skeleton type="rect" height="300px" style="border-radius: 12px" />
        </div>

        <!-- Não encontrado -->
        <q-card v-else-if="!store.loading && !store.customer" flat bordered style="border-radius: 12px" class="q-ma-md">
          <q-card-section class="text-center q-pa-xl">
            <q-icon name="person_off" size="64px" color="grey-4" />
            <div class="text-h6 text-grey-6 q-mt-md">Mutuário não encontrado</div>
            <q-btn flat color="primary" label="Voltar à lista" icon="arrow_back" class="q-mt-md" @click="goBack" />
          </q-card-section>
        </q-card>

        <q-tab-panels v-else v-model="tab" animated keep-alive>
          <q-tab-panel name="visao" class="q-pa-none">
            <TabVisaoGeral
              @register-payment="openQuickPayment"
              @liquidate="openLiquidateModal"
              @open-collection="openCollectionModal"
              @print-extract="printExtract"
              @go-to-tab="tab = $event"
              @approve-loan="openApproval"
            />
          </q-tab-panel>
          <q-tab-panel name="creditos" class="q-pa-none">
            <TabCreditos
              @go-to-tab="tab = 'docs'"
              @view-plan="onViewPlan"
              @view-guarantees="onViewGuarantees"
              @loan-info="onLoanInfo"
              @approve-loan="openApproval"
            />
          </q-tab-panel>
          <q-tab-panel name="amortizacao" class="q-pa-none">
            <!-- Recibo backend-authoritative: o PDF é servido pelo backend;
                 a ab trata o clique internamente (sem emit/print-receipt).
                 go-to-legais: atalho para os Documentos de Concessão. -->
            <TabAmortizacao @go-to-legais="tab = 'legais'" />
          </q-tab-panel>
          <q-tab-panel name="docs" class="q-pa-none">
            <TabDocumentosKyc />
          </q-tab-panel>
          <q-tab-panel name="legais" class="q-pa-none">
            <TabDocumentosLegais />
          </q-tab-panel>
          <q-tab-panel name="garantias" class="q-pa-none">
            <TabGarantiasRecibos />
          </q-tab-panel>
        </q-tab-panels>
      </div>

    <!-- ===================== MODAIS COMPARTILHADOS ===================== -->
    <CustomerFormModal v-model="showEditModal" :customer="store.customer" @saved="onCustomerSaved" />
    <BorrowerInfoModal v-model="showBorrowerInfoModal" :loan="selectedLoanForInfo" :customer="store.customer" />
    <LoanApprovalModal v-model="showApprovalModal" :loan="approvalLoan" @approved="onLoanApproved" />

    <!-- Modal de Envio de Alertas de Cobrança com 8 Templates & WhatsApp Directo -->
    <SendMessageModal
      v-model="showSendMessageModal"
      :customer="store.customer"
      :installment-data="activeInstallmentData"
    />

    <!-- Modal de Pagamento Rápido de Prestação -->
    <RegistarPagamentoModal
      v-model="showQuickPaymentModal"
      :installment="quickPaymentInstallment"
      :mode="quickPaymentMode"
      :customer="store.customer"
      :loan="store.activeLoan || store.contextLoan"
      :customer-name="store.customer?.customerName"
      :loan-id="store.activeLoan?.id || store.contextLoan?.id"
      @paid="onQuickPaymentSuccess"
      @pagamento-realizado="onQuickPaymentSuccess"
    />

    <!-- Modal de Liquidação Total da Dívida -->
    <LiquidarDividaModal
      v-model="showLiquidateModal"
      :customer-name="store.customer?.customerName"
      @liquidated="onQuickPaymentSuccess"
    />

    <!-- ===================== MODAL: ENVIO DE CREDENCIAIS ===================== -->
    <q-dialog v-model="showCredentialsModal" persistent @show="generateNewPassword">
      <q-card style="border-radius: 16px; min-width: 380px; max-width: 95vw">
        <q-card-section class="row items-center bg-warning text-white">
          <q-icon name="lock_open" size="24px" class="q-mr-sm" />
          <div class="text-h6">Enviar Credenciais</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showCredentialsModal = false" />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="text-body2 text-grey-6 q-mb-md">
            Envie as credenciais de acesso ao portal para o mutuário.
          </div>
          <q-card flat bordered class="q-mb-md" style="border-radius: 8px">
            <q-card-section>
              <div class="row q-col-gutter-sm">
                <div class="col-12">
                  <div class="text-caption text-grey-5">Mutuário</div>
                  <div class="text-weight-bold">{{ store.customer?.customerName }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Telefone</div>
                  <div class="text-weight-bold">{{ store.customer?.customerPhone || 'Não informado' }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Conta</div>
                  <div class="text-weight-bold">{{ store.customer?.accountNumber }}</div>
                </div>
                <div class="col-12">
                  <div class="text-caption text-grey-5">Nova Senha</div>
                  <div class="text-weight-bold text-warning" style="font-size: 18px; letter-spacing: 2px">{{ generatedPassword }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <div class="text-subtitle2 text-grey-6 q-mb-sm">Canal de Envio</div>
          <q-btn-toggle
            v-model="credentialsChannel"
            :options="[
              { label: 'SMS', value: 'sms', icon: 'sms' },
              { label: 'WhatsApp', value: 'whatsapp', icon: 'chat' }
            ]"
            push glossy no-caps
            class="q-mb-md full-width"
            toggle-color="warning"
          />

          <q-banner v-if="smsDisabled && credentialsChannel === 'sms'" class="bg-negative text-white q-mb-md" rounded>
            <template v-slot:avatar><q-icon name="sms_failed" size="24px" /></template>
            <div class="text-weight-bold">SMS indisponível</div>
            <div class="text-caption">O envio de SMS está desactivado nas configurações da empresa.</div>
          </q-banner>

          <q-card flat bordered style="border-radius: 8px">
            <q-card-section class="q-py-sm">
              <div class="text-caption text-grey-5">Preview da Mensagem</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
              <div style="white-space: pre-wrap; font-size: 13px">Ola {{ store.customer?.customerName }}. Sua senha de acesso ao portal da {{ companyName }} e: {{ generatedPassword }}. Telefone: {{ store.customer?.customerPhone }}. Altere apos o primeiro acesso.</div>
            </q-card-section>
          </q-card>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showCredentialsModal = false" />
          <q-btn
            unelevated
            :label="credentialsChannel === 'sms' ? 'Enviar SMS' : 'Enviar WhatsApp'"
            :color="credentialsChannel === 'sms' ? 'primary' : 'positive'"
            :icon="credentialsChannel === 'sms' ? 'sms' : 'chat'"
            no-caps rounded
            :loading="sendingCredentials"
            :disable="!store.customer?.customerPhone || (credentialsChannel === 'sms' && smsDisabled)"
            @click="sendCredentials"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { api } from '@/boot/axios'
import { formatMoney, formatDateShort, getInitials } from '@/utils/formatters'
import AlertBell from '@/components/layout/AlertBell.vue'
import CustomerFormModal from '@/components/modals/CustomerFormModal.vue'
import BorrowerInfoModal from '@/components/modals/BorrowerInfoModal.vue'
import LoanApprovalModal from '@/components/modals/LoanApprovalModal.vue'
import SendMessageModal from '@/components/modals/SendMessageModal.vue'
import RegistarPagamentoModal from '@/components/mutuario/RegistarPagamentoModal.vue'
import LiquidarDividaModal from '@/components/mutuario/LiquidarDividaModal.vue'
import TabVisaoGeral from '@/components/mutuario/TabVisaoGeral.vue'
import TabCreditos from '@/components/mutuario/TabCreditos.vue'
import TabAmortizacao from '@/components/mutuario/TabAmortizacao.vue'
import TabDocumentosKyc from '@/components/mutuario/TabDocumentosKyc.vue'
import TabDocumentosLegais from '@/components/mutuario/TabDocumentosLegais.vue'
import TabGarantiasRecibos from '@/components/mutuario/TabGarantiasRecibos.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const store = useMutuarioStore()
const companyStore = useCompanyStore()
const authStore = useAuthStore()
const uiStore = useUiStore()

const displayBorrowerName = computed(() => {
  const full = store.customer?.customerName
  if (!full) return 'A carregar mutuário...'
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return full
  // Se o nome for comprido (mais de 20 caracteres ou mais de 2 partes), mostra apenas o primeiro nome e o último/apelido
  if (full.length > 20 || parts.length >= 3) {
    return `${parts[0]} ${parts[parts.length - 1]}`
  }
  return full
})

function toggleSidebar() {
  uiStore.setSidebarStyle(uiStore.sidebarStyle === 'mini' ? 'expanded' : 'mini')
}

const userInitials = computed(() => getInitials(authStore.userName || 'U'))
const userRoleLabel = computed(() => {
  const roles = { 0: 'Operador', 1: 'Administrador', 2: 'Operador', 3: 'Gestor de Crédito' }
  return roles[authStore.userRole] || 'Utilizador'
})

function handleLogout() {
  $q.dialog({
    title: 'Sair',
    message: 'Tem certeza que deseja sair?',
    cancel: 'Não',
    ok: { label: 'Sim, sair', color: 'negative' },
    persistent: true
  }).onOk(() => {
    authStore.logout()
    router.push('/')
  })
}

const tab = ref('visao')
const showEditModal = ref(false)
const showBorrowerInfoModal = ref(false)
const selectedLoanForInfo = ref(null)

// Aprovação/desembolso de créditos pendentes
const showApprovalModal = ref(false)
const approvalLoan = ref(null)

// Cobrança & Mensagens (SMS Gateway / WhatsApp)
const showSendMessageModal = ref(false)
const activeInstallmentData = computed(() => {
  const next = store.activeLoanNextInstallment
  if (!next) return null
  return {
    installmentNumber: next.installmentOrder,
    dueDate: next.dueDate,
    amount: next.installment,
    lateFee: next.latePaymentInterest,
    daysOverdue: next.daysOverdue,
    daysUntilDue: next.daysLeft
  }
})

function openCollectionModal() {
  showSendMessageModal.value = true
}

// Pagamento Rápido (Quick Pay)
const showQuickPaymentModal = ref(false)
const quickPaymentInstallment = ref(null)
const quickPaymentMode = ref('full')

function openQuickPayment() {
  if (store.activeLoanNextInstallment) {
    quickPaymentInstallment.value = store.activeLoanNextInstallment
    quickPaymentMode.value = 'full'
    showQuickPaymentModal.value = true
  } else if (store.pendingInstallments.length > 0) {
    quickPaymentInstallment.value = store.pendingInstallments[0]
    quickPaymentMode.value = 'full'
    showQuickPaymentModal.value = true
  } else {
    $q.notify({ type: 'info', message: 'Este mutuário não tem prestações pendentes no momento.', position: 'top' })
  }
}

// Liquidação Total
const showLiquidateModal = ref(false)
function openLiquidateModal() {
  if (store.pendingInstallments.length === 0) {
    $q.notify({ type: 'info', message: 'Não há prestações pendentes para liquidar.', position: 'top' })
    return
  }
  showLiquidateModal.value = true
}

async function onQuickPaymentSuccess() {
  showQuickPaymentModal.value = false
  showLiquidateModal.value = false
  if (route.params.accountNumber) {
    await store.fetchAll(route.params.accountNumber)
  }
}

// Extracto em PDF
const extracting = ref(false)
async function printExtract() {
  const loanId = store.activeLoan?.id || store.contextLoan?.id
  if (!loanId) {
    $q.notify({ type: 'warning', message: 'Nenhum crédito activo encontrado para emitir extracto', position: 'top' })
    return
  }
  extracting.value = true
  try {
    const { data } = await api.get(`/api/loans/${loanId}/documents/extracto/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    window.open(url, '_blank')
    setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Não foi possível gerar o extracto em PDF', position: 'top' })
  } finally {
    extracting.value = false
  }
}

// Credenciais do portal
const showCredentialsModal = ref(false)
const credentialsChannel = ref('sms')
const sendingCredentials = ref(false)
const generatedPassword = ref('')

function generateNewPassword() {
  // 6 dígitos, igual ao comportamento anterior (utils/codeGenerator)
  generatedPassword.value = String(Math.floor(100000 + Math.random() * 900000))
}

const companyName = computed(() => companyStore.companyName || companyStore.company?.companyName || 'Mais Mola')
const smsDisabled = computed(() => Number(companyStore.company?.smsEnabled ?? 1) !== 1)

async function sendCredentials() {
  sendingCredentials.value = true
  try {
    const { data } = await api.post('/api/portal/send-credentials', {
      customerId: store.customer?.id,
      channel: credentialsChannel.value,
      newPassword: generatedPassword.value
    })
    if (data.alreadySent) {
      $q.notify({ type: 'warning', message: data.message, position: 'top', timeout: 5000 })
    } else if (data.success) {
      $q.notify({ type: 'positive', message: data.message || 'Credenciais enviadas com sucesso', position: 'top' })
      showCredentialsModal.value = false
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao enviar credenciais', position: 'top' })
  } finally {
    sendingCredentials.value = false
  }
}

function onLoanApproved() {
  approvalLoan.value = null
  store.fetchLoans()
}

const statusColor = computed(() => {
  const s = Number(store.customer?.customerStatus)
  return s === 1 ? 'positive' : s === 0 ? 'grey' : 'blue'
})
const statusText = computed(() => {
  const s = Number(store.customer?.customerStatus)
  return s === 1 ? 'Activo' : s === 0 ? 'Inactivo' : 'Activo'
})

// Prestação estimada do crédito activo para "Capacidade Disponível" no header
const currentInstallmentShare = computed(() => {
  if (!store.activeLoan) return 0
  const rate = Number(store.activeLoan.interestRate) || 0
  const n = Number(store.activeLoan.numberOfInstallments) || 1
  const principal = Number(store.activeLoan.amount) || 0
  if (principal <= 0 || rate <= 0) return principal / n
  const factor = Math.pow(1 + rate, n)
  return principal * (rate * factor) / (factor - 1)
})

function goBack() { router.push('/mutuarios') }
function openPassportPhoto() {
  if (store.customer?.passportPhotoUrl) window.open(store.customer.passportPhotoUrl, '_blank')
}
function onCustomerSaved() {
  showEditModal.value = false
  store.fetchAll(route.params.accountNumber)
}
function onViewPlan() { tab.value = 'amortizacao' }
function onViewGuarantees() { tab.value = 'garantias' }
function onLoanInfo(loan) {
  selectedLoanForInfo.value = loan
  showBorrowerInfoModal.value = true
}
function openApproval(loan) {
  approvalLoan.value = loan
  showApprovalModal.value = true
}
defineExpose({ openApproval })

// Recibo de prestação paga — BACKEND AUTHORITATIVE: o PDF legal (hash AT + QR)
// é gerado pelo backend dentro da transacção do pagamento. A aba Amortização
// consome-o internamente (ReciboViewerDialog); esta página não gera PDF.

// Recarrega dados se a rota mudar de mutuário
watch(() => route.params.accountNumber, (acc, old) => {
  if (acc && acc !== old && route.name === 'CustomerDetail') {
    store.clear()
    store.fetchAll(acc)
  }
})

// Recarrega o plano do crédito em contexto ao voltar para a aba (dados frescos)
watch(tab, async (t) => {
  if (t === 'amortizacao' && store.contextLoan?.id) {
    await store.fetchPlanFor(store.contextLoan.id, companyStore.company?.forfeit || 0.1)
  }
})

onMounted(async () => {
  const accountNumber = route.params.accountNumber
  if (!accountNumber) return
  try {
    await companyStore.fetchCompany(authStore.companyId)
  } catch { /* silent */ }
  await store.fetchAll(accountNumber)
})

onUnmounted(() => {
  store.clear()
})
</script>

<style lang="scss" scoped>
.mutuario-header {
  background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #0f172a 100%);
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.borrower-name-title {
  font-size: 21px;
  line-height: 1.25;
  letter-spacing: -0.3px;
  white-space: nowrap;
}

.kpi-ribbon-bar {
  background: rgba(0, 0, 0, 0.22);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.kpi-ribbon-item {
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
  min-height: 58px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

.kpi-ribbon-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  opacity: 0.75;
  color: #e2e8f0;
}

.kpi-ribbon-val {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-ribbon-sub {
  font-size: 11px;
  opacity: 0.7;
  color: #cbd5e1;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mutuario-tabs {
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.header-kpi-label {
  font-size: 9px;
  opacity: 0.82;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.mutuario-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
