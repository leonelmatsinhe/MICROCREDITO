<template>
  <q-page class="portal-page q-pa-sm">
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar dados...</div>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="row items-center no-wrap q-mb-sm q-px-xs">
        <div class="col" style="min-width: 0">
          <div class="text-h6 text-weight-bold">Histórico de Pagamentos</div>
          <div class="text-caption text-grey-6">Inclui a prestação liquidada e a referência</div>
        </div>
        <q-btn
          v-if="loans.length > 0"
          outline
          color="primary"
          icon="picture_as_pdf"
          label="Extracto PDF"
          no-caps
          dense
          :loading="generatingPdf"
          @click="openExtractPicker"
        />
      </div>

      <q-card flat bordered class="portal-section-card">
        <q-card-section class="q-pa-sm">
          <div v-if="allPayments.length === 0" class="text-center text-grey-5 q-pa-xl">
            <q-icon name="account_balance_wallet" size="52px" color="grey-4" />
            <div class="q-mt-sm">Nenhum pagamento registado</div>
          </div>
          <div v-else class="q-gutter-y-sm">
            <div v-for="payment in allPayments" :key="payment.id" class="payment-card">
              <div class="row items-center no-wrap">
                <q-avatar :color="payment.status === 'completed' ? 'positive' : 'warning'" text-color="white" size="36px" class="q-mr-sm">
                  <q-icon :name="payment.status === 'completed' ? 'check' : 'schedule'" size="18px" />
                </q-avatar>
                <div class="col" style="min-width: 0">
                  <div class="text-weight-bold" style="font-size: 15px">{{ formatMoney(payment.amount) }}</div>
                  <div class="text-caption text-grey-6" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                    Ref: {{ payment.reference || 'N/A' }}
                  </div>
                  <div v-if="payment.installmentOrder" class="text-caption text-primary q-mt-xs">
                    Prestação {{ ordinalBadge(payment.installmentOrder) }}
                  </div>
                  <!-- Comprovativo: mostra o n.º já emitido e permite descarregar -->
                  <div class="row items-center q-gutter-x-xs q-mt-xs">
                    <q-btn
                      flat
                      dense
                      no-caps
                      padding="2px 6px"
                      size="11px"
                      color="primary"
                      icon="picture_as_pdf"
                      label="Recibo"
                      :loading="reciboSendingId === payment.id"
                      @click="downloadRecibo(payment)"
                    />
                    <span v-if="payment.reciboNumero" class="text-caption text-grey-6">
                      {{ payment.reciboNumero }}
                    </span>
                  </div>
                </div>
                <div class="text-right" style="flex-shrink: 0">
                  <div class="text-caption text-grey-5">{{ formatDate(payment.createdAt) }}</div>
                  <div v-if="paymentMethodLabel(payment.paymentMethod)" class="text-caption text-grey-6">
                    {{ paymentMethodLabel(payment.paymentMethod) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </template>

    <!-- Escolher crédito para gerar o Extracto PDF -->
    <q-dialog v-model="showExtractPicker">
      <q-card style="border-radius: 16px; width: 100%; max-width: 430px; min-width: 0">
        <q-card-section class="row items-center bg-primary text-white" style="border-radius: 16px 16px 0 0">
          <q-icon name="picture_as_pdf" size="22px" class="q-mr-sm" />
          <div class="text-h6">Extracto do Crédito</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showExtractPicker = false" />
        </q-card-section>
        <q-card-section>
          <div class="text-body2 text-grey-6 q-mb-sm">Seleccione o crédito para gerar o extracto em PDF:</div>
          <q-list separator>
            <q-item v-for="loan in loans" :key="loan.id" clickable v-ripple @click="downloadCreditExtract(loan)">
              <q-item-section avatar>
                <q-avatar :color="getLoanStatusColor(loan.status)" text-color="white" size="36px">
                  <q-icon name="payments" size="18px" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>Crédito #{{ loan.id }}</q-item-label>
                <q-item-label caption>{{ formatMoney(loan.amount) }} · {{ getLoanStatusText(loan.status) }} · {{ loan.numberOfInstallments }} prestações</q-item-label>
              </q-item-section>
              <q-item-section side><q-icon name="chevron_right" /></q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { usePortalData } from '@/composables/usePortalData'

const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const {
  loading, customer, loans, allPayments,
  formatMoney, formatDate, getLoanStatusColor, getLoanStatusText, ordinalBadge, paymentMethodLabel,
  downloadPaymentRecibo
} = usePortalData()

const generatingPdf = ref(false)
const showExtractPicker = ref(false)
// Id do pagamento cujo recibo está a ser preparado (spinner do botão)
const reciboSendingId = ref(null)

/** Descarrega o comprovativo (recibo com numeração legal AT) de um pagamento. */
async function downloadRecibo(payment) {
  if (!payment?.id || reciboSendingId.value) return
  reciboSendingId.value = payment.id
  try {
    await downloadPaymentRecibo(payment.id, payment.reciboNumero)
  } finally {
    reciboSendingId.value = null
  }
}

function openExtractPicker() {
  if (loans.value.length === 1) {
    downloadCreditExtract(loans.value[0])
    return
  }
  showExtractPicker.value = true
}

// ==================== EXTRACTO DO CRÉDITO EM PDF (GERADO NO BACKEND) ====================
async function downloadCreditExtract(loan) {
  if (!loan || !loan.installments?.length) return
  generatingPdf.value = true
  try {
    // PDF GERADO NO BACKEND — o portal do financiador consome o mesmo endpoint
    // tabelar (POST /api/reports/table-pdf) usado pelas páginas internas.
    const { downloadTablePdf } = await import('@/utils/tablePdf')

    const cust = customer.value || {}
    const allAmorts = [...(loan.installments || [])].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

    const paidInstallments = allAmorts.filter(a => Number(a.status) === 1)
    const pendingInstallments = allAmorts.filter(a => Number(a.status) !== 1)

    const principal = parseFloat(loan.amount) || 0
    const rate = parseFloat(loan.interestRate) || 0
    const n = parseInt(loan.numberOfInstallments) || 1
    let totalInterest = 0
    let totalDebt = principal
    if (principal > 0 && rate > 0 && n > 0) {
      const factor = Math.pow(1 + rate, n)
      const pmt = principal * (rate * factor) / (factor - 1)
      totalInterest = Math.round(((pmt * n) - principal) * 100) / 100
      totalDebt = Math.round(pmt * n * 100) / 100
    }
    const totalPaid = allAmorts.reduce((sum, a) => sum + (parseFloat(a.paidAmount) || 0), 0)
    const remainingDebt = Math.max(0, Math.round((totalDebt - totalPaid) * 100) / 100)

    // Plano de amortização — tabela única enviada ao backend
    let saldoCorrente = principal
    const installmentsRows = allAmorts.map(row => {
      const status = Number(row.status) === 1 ? 'Pago' : Number(row.status) === -1 ? 'Parcial' : 'Pendente'
      const paidAmount = Number(row.paidAmount) || 0
      const discount = paidAmount > 0 && paidAmount < row.installment ? row.installment - paidAmount : 0
      const saldo = Math.max(0, saldoCorrente - (Number(row.amortization) || 0))
      saldoCorrente = saldo
      return [
        row.installmentOrder || '',
        formatDate(row.dueDate),
        formatMoney(row.amortization),
        formatMoney(row.rateAmount),
        formatMoney(row.installment),
        formatMoney(saldo),
        formatMoney(paidAmount),
        discount > 0 ? '-' + formatMoney(discount) : '—',
        status
      ]
    })

    const fileName = `Extracto_Credito_Conta${cust.accountNumber || 'N/A'}_${new Date().toISOString().split('T')[0]}.pdf`
    await downloadTablePdf({
      title: 'Extracto do Crédito',
      meta: [
        `${cust.name || ''} · Conta ${cust.accountNumber || 'N/A'} · Tel. ${cust.phone || '—'}`,
        `Capital ${formatMoney(principal)} · Taxa ${((rate) * 100).toFixed(1)}% · ${n} prestações · Total dívida ${formatMoney(totalDebt)}`,
        `Pago ${formatMoney(totalPaid)} · Saldo ${formatMoney(remainingDebt)} · Prestações pagas ${paidInstallments.length}/${allAmorts.length}`
      ],
      orientation: 'landscape',
      filename: `extracto-credito-${cust.accountNumber || 'na'}`,
      columns: [
        { label: 'Ordem', width: 40, align: 'center' },
        { label: 'Vencimento', width: 65, align: 'center' },
        { label: 'Capital', width: 70, align: 'right' },
        { label: 'Juros', width: 65, align: 'right' },
        { label: 'Prestação', width: 70, align: 'right' },
        { label: 'Saldo', width: 75, align: 'right' },
        { label: 'Pago', width: 70, align: 'right' },
        { label: 'Desconto', width: 65, align: 'right' },
        { label: 'Estado', width: 55, align: 'center' }
      ],
      rows: installmentsRows
    }, fileName)
    showExtractPicker.value = false
    $q.notify({ type: 'positive', message: 'Extracto gerado com sucesso', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar extracto:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar extracto', position: 'top' })
  } finally {
    generatingPdf.value = false
  }
}
</script>

<style lang="scss" scoped>
.portal-page {
  padding-bottom: 74px;
}

.portal-section-card {
  border-radius: 16px;
  overflow: hidden;
}

.payment-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  background: #ffffff;
}

body.body--dark {
  .payment-card {
    background: $gray-800;
    border-color: rgba(255, 255, 255, 0.08);
  }
  .text-grey-5,
  .text-grey-6 {
    color: #9ca3af;
  }
}
</style>
