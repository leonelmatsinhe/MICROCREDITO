<template>
  <div>
    <!-- ===================== HEADER FIXO (sticky — sem conflito com o QLayout do MainLayout) ===================== -->
    <div class="mutuario-header sticky-header">
      <q-toolbar>
        <q-btn flat round dense icon="arrow_back" @click="goBack">
          <q-tooltip>Voltar à lista</q-tooltip>
        </q-btn>

        <!-- Identidade do mutuário -->
        <q-avatar size="38px" :color="statusColor" text-color="white" style="cursor: pointer" @click="openPassportPhoto">
          <img v-if="store.customer?.passportPhotoUrl" :src="store.customer.passportPhotoUrl" alt="Foto" style="width: 100%; height: 100%; object-fit: cover" />
          <q-icon v-else name="person" size="18px" />
        </q-avatar>
        <div class="q-ml-sm col">
          <div class="row items-center no-wrap">
            <div class="text-weight-bold" style="font-size: 15px">{{ store.customer?.customerName || '...' }}</div>
            <q-badge :color="statusColor" :label="statusText" rounded class="q-ml-sm" style="font-size: 9px" />
            <q-badge v-if="Number(store.customer?.isSelfRegistered) === 1" color="teal" outline rounded class="q-ml-xs" style="font-size: 9px">Auto-cadastro</q-badge>
          </div>
          <div class="text-caption" style="opacity: 0.85; font-size: 10px">
            Conta {{ store.customer?.accountNumber || '—' }} · {{ store.customer?.customerPhone || 'Sem telefone' }}
          </div>
        </div>

        <!-- KPIs do header (escondidos em mobile) -->
        <div class="gt-xs row q-gutter-lg header-kpis">
          <div class="text-right">
            <div class="header-kpi-label">Rendimento</div>
            <div class="text-weight-bold" style="font-size: 13px">{{ formatMoney(store.customer?.customerMonthlySalary || 0) }}</div>
          </div>
          <div class="text-right">
            <div class="header-kpi-label">Total Dívida</div>
            <div class="text-weight-bold" style="font-size: 13px" :class="store.saldoRemanescente > 0 ? 'text-orange' : ''">
              {{ formatMoney(store.saldoRemanescente) }}
            </div>
          </div>
          <div class="text-right">
            <div class="header-kpi-label">Capacidade Disp.</div>
            <div class="text-weight-bold" style="font-size: 13px">
              {{ formatMoney(Math.max(0, store.maxCapacity - currentInstallmentShare)) }}
            </div>
          </div>
          <div class="text-right">
            <div class="header-kpi-label">KYC</div>
            <q-chip :color="store.isKycComplete ? 'positive' : 'negative'" text-color="white" dense style="font-size: 10px">
              {{ store.isKycComplete ? 'Completo' : 'Incompleto' }}
            </q-chip>
          </div>
        </div>

        <!-- Acções -->
        <q-btn flat round dense icon="lock_open" color="warning" @click="showCredentialsModal = true">
          <q-tooltip>Enviar Credenciais</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="edit" color="white" @click="showEditModal = true">
          <q-tooltip>Editar mutuário</q-tooltip>
        </q-btn>
      </q-toolbar>

      <!-- TABS -->
      <q-tabs
        v-model="tab"
        dense
        align="left"
        class="mutuario-tabs text-white"
        active-color="white"
        indicator-color="white"
        :breakpoint="0"
      >
        <q-tab name="visao" icon="dashboard" label="Visão Geral" no-caps />
        <q-tab name="creditos" icon="payments" label="Créditos" no-caps />
        <q-tab name="amortizacao" icon="table_chart" label="Plano de Amortização" no-caps />
        <q-tab name="docs" icon="folder_shared" no-caps>
          <q-badge v-if="!store.isKycComplete" color="negative" rounded floating style="font-size: 8px">!</q-badge>
          <div class="q-ml-xs">Documentos &amp; KYC</div>
        </q-tab>
        <q-tab name="legais" icon="gavel" label="Documentos Legais" no-caps />
        <q-tab name="garantias" icon="security" label="Garantias & Recibos" no-caps />
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
            <TabVisaoGeral />
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
            <TabAmortizacao @print-receipt="onPrintReceipt" />
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
import { usePaymentsStore } from '@/stores/payments'
import { api } from '@/boot/axios'
import { formatMoney } from '@/utils/formatters'
import CustomerFormModal from '@/components/modals/CustomerFormModal.vue'
import BorrowerInfoModal from '@/components/modals/BorrowerInfoModal.vue'
import LoanApprovalModal from '@/components/modals/LoanApprovalModal.vue'
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
const paymentsStore = usePaymentsStore()

const tab = ref('visao')
const showEditModal = ref(false)
const showBorrowerInfoModal = ref(false)
const selectedLoanForInfo = ref(null)

// Aprovação/desembolso de créditos pendentes
const showApprovalModal = ref(false)
const approvalLoan = ref(null)

// Credenciais do portal
const showCredentialsModal = ref(false)
const credentialsChannel = ref('sms')
const sendingCredentials = ref(false)
const generatedPassword = ref('')

function generateNewPassword() {
  // 6 dígitos, igual ao comportamento anterior (utils/codeGenerator)
  generatedPassword.value = String(Math.floor(100000 + Math.random() * 900000))
}

const companyName = computed(() => companyStore.companyName || 'Mais Mola')
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

// Recibo de prestação paga (mantém o comportamento do previewReceipt antigo)
async function onPrintReceipt(installment) {
  try {
    const { buildCompanyHeader, commonStyles } = await import('@/utils/pdfHeader')
    const { getPdfMake } = await import('@/utils/pdfMake')
    const pdfMake = await getPdfMake()
    const company = companyStore.company || {}
    const cust = store.customer || {}

    const companyHeader = buildCompanyHeader(company, null, 'Recibo de Pagamento')
    const doc = {
      content: [
        ...companyHeader,
        { text: `${cust.customerName || ''} — Conta ${cust.accountNumber || ''}`, fontSize: 10, margin: [25, 8, 0, 4] },
        { text: `Prestação ${installment.installmentOrder || ''} · Vencimento ${installment.dueDate ? new Date(installment.dueDate).toLocaleDateString('pt-MZ') : ''}`, fontSize: 9, margin: [25, 0, 0, 8] },
        { table: { widths: ['*', 'auto'], body: [
          [{ text: 'Capital', fontSize: 9 }, { text: formatMoney(installment.amortization), fontSize: 9, alignment: 'right' }],
          [{ text: 'Juros', fontSize: 9 }, { text: formatMoney(installment.rateAmount), fontSize: 9, alignment: 'right' }],
          [{ text: 'Mora cobrada', fontSize: 9 }, { text: formatMoney(installment.chargedLatePaymentInterest || 0), fontSize: 9, alignment: 'right' }],
          [{ text: 'VALOR PAGO', fontSize: 10, bold: true }, { text: formatMoney(installment.paidAmount || installment.installment), fontSize: 12, bold: true, alignment: 'right', color: '#2e7d32' }]
        ] }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0' }, margin: [25, 0, 25, 10] },
        { text: `Documento processado por computador — ${new Date().toLocaleDateString('pt-MZ')}`, fontSize: 7, color: '#999', margin: [25, 10, 0, 0] }
      ],
      pageSize: 'A5',
      pageMargins: [0, 0, 0, 0]
    }
    pdfMake.createPdf(doc).open()
  } catch (e) {
    console.error('Erro ao gerar recibo:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar recibo', position: 'top' })
  }
}

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
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.mutuario-header {
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
  color: white;
}

.mutuario-tabs {
  background: rgba(255, 255, 255, 0.08);
}

.header-kpi-label {
  font-size: 9px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.mutuario-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
