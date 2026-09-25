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

async function getLogoBase64ForPdf() {
  const logo = companyStore.companyLogo
  if (!logo || logo === '/logo.png') return null
  try {
    const url = logo.startsWith('http') ? logo : logo.startsWith('/') ? logo : `/documents/${logo}`
    const token = localStorage.getItem('applicationMicroToken')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch(url, { headers })
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('image/')) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('Erro ao buscar logo:', e)
    return null
  }
}

// ==================== EXTRACTO DO CRÉDITO EM PDF (idêntico ao original) ====================
async function downloadCreditExtract(loan) {
  if (!loan || !loan.installments?.length) return
  generatingPdf.value = true
  try {
    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    const { buildCompanyHeader, buildFooterWithSignature, tableLayout, infoTableLayout } = await import('@/utils/pdfHeader')

    const comp = companyStore.company || {}
    const cust = customer.value || {}
    const allAmorts = [...(loan.installments || [])].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    const logoBase64 = await getLogoBase64ForPdf()

    const companyHeader = buildCompanyHeader(comp, logoBase64, 'Extracto do Crédito')

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

    const clientSection = [
      { text: 'DADOS DO CLIENTE', fontSize: 9, bold: true, color: '#1a237e', margin: [0, 0, 0, 6] },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [[
            { text: [{ text: 'Nome: ', bold: true, fontSize: 8 }, { text: cust.name || '', fontSize: 8 }] },
            { text: [{ text: 'Conta: ', bold: true, fontSize: 8 }, { text: String(cust.accountNumber || ''), fontSize: 8 }] },
            { text: [{ text: 'Telefone: ', bold: true, fontSize: 8 }, { text: cust.phone || '', fontSize: 8 }] },
            { text: [{ text: 'Email: ', bold: true, fontSize: 8 }, { text: cust.email || '', fontSize: 8 }] }
          ]]
        },
        layout: infoTableLayout,
        margin: [25, 0, 25, 12]
      }
    ]

    const summarySection = [
      { text: 'RESUMO DO CRÉDITO', fontSize: 9, bold: true, color: '#1a237e', margin: [25, 0, 25, 6] },
      {
        table: {
          widths: ['*', '*', '*', '*', '*'],
          body: [
            [
              { text: 'Capital Financiado', fontSize: 7, bold: true, color: '#666', alignment: 'center' },
              { text: 'Taxa de Juros', fontSize: 7, bold: true, color: '#666', alignment: 'center' },
              { text: 'Nº Prestações', fontSize: 7, bold: true, color: '#666', alignment: 'center' },
              { text: 'Total Juros', fontSize: 7, bold: true, color: '#666', alignment: 'center' },
              { text: 'Total Dívida', fontSize: 7, bold: true, color: '#666', alignment: 'center' }
            ],
            [
              { text: formatMoney(principal), fontSize: 9, bold: true, alignment: 'center' },
              { text: `${((rate) * 100).toFixed(1)}%`, fontSize: 9, bold: true, alignment: 'center' },
              { text: `${n}`, fontSize: 9, bold: true, alignment: 'center' },
              { text: formatMoney(totalInterest), fontSize: 9, bold: true, alignment: 'center' },
              { text: formatMoney(totalDebt), fontSize: 9, bold: true, alignment: 'center', color: '#c62828' }
            ]
          ]
        },
        layout: { hLineWidth: (i) => i === 0 || i === 2 ? 1 : 0.5, vLineWidth: () => 0.5, hLineColor: () => '#1a237e', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5 },
        margin: [25, 0, 25, 8]
      }
    ]

    const statusSection = [
      { text: 'SITUAÇÃO ACTUAL', fontSize: 9, bold: true, color: '#1a237e', margin: [25, 0, 25, 6] },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: 'Total Pago', fontSize: 7, bold: true, color: '#2e7d32', alignment: 'center' },
              { text: 'Saldo Remanescente', fontSize: 7, bold: true, color: '#c62828', alignment: 'center' },
              { text: 'Prestações Pagas', fontSize: 7, bold: true, color: '#1a237e', alignment: 'center' },
              { text: 'Prestações Pendentes', fontSize: 7, bold: true, color: '#f57c00', alignment: 'center' }
            ],
            [
              { text: formatMoney(totalPaid), fontSize: 9, bold: true, color: '#2e7d32', alignment: 'center' },
              { text: formatMoney(remainingDebt), fontSize: 9, bold: true, color: '#c62828', alignment: 'center' },
              { text: `${paidInstallments.length} de ${allAmorts.length}`, fontSize: 9, bold: true, alignment: 'center' },
              { text: `${pendingInstallments.length}`, fontSize: 9, bold: true, alignment: 'center' }
            ]
          ]
        },
        layout: { hLineWidth: (i) => i === 0 || i === 2 ? 1 : 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5 },
        margin: [25, 0, 25, 12]
      }
    ]

    let saldoCorrente = principal
    const installmentsBody = allAmorts.map(row => {
      const status = Number(row.status) === 1 ? 'Pago' : Number(row.status) === -1 ? 'Parcial' : 'Pendente'
      const statusColor = Number(row.status) === 1 ? '#2e7d32' : Number(row.status) === -1 ? '#f57c00' : '#333'
      const paidAmount = Number(row.paidAmount) || 0
      const discount = paidAmount > 0 && paidAmount < row.installment ? row.installment - paidAmount : 0

      const saldo = Math.max(0, saldoCorrente - (Number(row.amortization) || 0))
      saldoCorrente = saldo

      return [
        { text: row.installmentOrder || '', fontSize: 7, alignment: 'center' },
        { text: formatDate(row.dueDate), fontSize: 7, alignment: 'center' },
        { text: formatMoney(row.amortization), fontSize: 7, alignment: 'right' },
        { text: formatMoney(row.rateAmount), fontSize: 7, alignment: 'right' },
        { text: formatMoney(row.installment), fontSize: 7, alignment: 'right', bold: true },
        { text: formatMoney(saldo), fontSize: 7, alignment: 'right', color: saldo > 0 ? '#c62828' : '#2e7d32' },
        { text: formatMoney(paidAmount), fontSize: 7, alignment: 'right', color: paidAmount > 0 ? '#2e7d32' : '#999' },
        { text: discount > 0 ? '-' + formatMoney(discount) : '—', fontSize: 7, alignment: 'right', color: discount > 0 ? '#f57c00' : '#999' },
        { text: status, fontSize: 7, bold: true, color: statusColor, alignment: 'center' }
      ]
    })

    installmentsBody.push([
      { text: 'TOTAIS', fontSize: 7, bold: true, colSpan: 2, color: '#1a237e' }, {},
      { text: formatMoney(principal), fontSize: 7, alignment: 'right', bold: true },
      { text: formatMoney(totalInterest), fontSize: 7, alignment: 'right', bold: true },
      { text: formatMoney(totalDebt), fontSize: 7, alignment: 'right', bold: true },
      { text: '0,00 MZN', fontSize: 7, alignment: 'right', bold: true, color: '#2e7d32' },
      { text: formatMoney(totalPaid), fontSize: 7, alignment: 'right', bold: true, color: '#2e7d32' },
      { text: '', fontSize: 7 },
      { text: '', fontSize: 7 }
    ])

    const amortSection = [
      { text: `PLANO DE AMORTIZAÇÃO (${allAmorts.length} prestações)`, fontSize: 9, bold: true, color: '#1a237e', margin: [25, 0, 25, 6] },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', '*', '*', '*', '*', '*', 'auto'],
          body: [
            [
              { text: 'Ordem', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'center' },
              { text: 'Vencimento', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'center' },
              { text: 'Capital', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Juros', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Prestação', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Saldo', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Pago', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Desconto', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Estado', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'center' }
            ],
            ...installmentsBody
          ]
        },
        layout: tableLayout,
        margin: [25, 0, 25, 12]
      }
    ]

    const docDefinition = {
      footer: buildFooterWithSignature(comp),
      content: [
        ...companyHeader,
        clientSection,
        summarySection,
        statusSection,
        amortSection
      ].flat(),
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [25, 15, 25, 15]
    }
    const fileName = `Extracto_Credito_Conta${cust.accountNumber || 'N/A'}_${new Date().toISOString().split('T')[0]}.pdf`
    pdfMake.createPdf(docDefinition).download(fileName)
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
