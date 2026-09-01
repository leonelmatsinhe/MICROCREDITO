<template>
  <div class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Plano de Amortização</div>
        <div class="text-caption text-grey-5" v-if="loan">
          Conta {{ loan.accountNumber }} | {{ formatMoney(loan.amount) }}
        </div>
      </div>
      <div class="col-auto row q-gutter-sm">
        <q-btn
          v-if="installments.length > 0"
          color="negative"
          icon="picture_as_pdf"
          label="Imprimir PDF"
          unelevated
          no-caps
          rounded
          size="sm"
          :loading="generatingPdf"
          @click="generatePdf"
        />
        <q-btn flat icon="arrow_back" label="Voltar" no-caps @click="router.back()" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar plano...</div>
    </div>

    <template v-else>
      <!-- Loan Summary -->
      <q-card v-if="loan" flat bordered style="border-radius: 12px" class="q-mb-md">
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-3">
              <div class="text-caption text-grey-5">Montante</div>
              <div class="text-weight-bold text-primary" style="font-size: 18px">{{ formatMoney(loan.amount) }}</div>
            </div>
            <div class="col-12 col-sm-3">
              <div class="text-caption text-grey-5">Taxa de Juros</div>
              <div class="text-weight-bold" style="font-size: 18px">{{ (loan.interestRate * 100).toFixed(1) }}%</div>
            </div>
            <div class="col-12 col-sm-3">
              <div class="text-caption text-grey-5">Prestações</div>
              <div class="text-weight-bold" style="font-size: 18px">{{ loan.numberOfInstallments }}</div>
            </div>
            <div class="col-12 col-sm-3">
              <div class="text-caption text-grey-5">Estado</div>
              <q-badge
                :color="getStatusColor(loan.status)"
                :label="getStatusText(loan.status)"
                rounded
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Totals -->
      <div v-if="totals" class="row q-col-gutter-sm q-mb-md">
        <div class="col-12 col-sm-3">
          <q-card flat bordered style="border-radius: 10px">
            <q-card-section class="q-py-sm text-center">
              <div class="text-caption text-grey-5">Total Capital</div>
              <div class="text-weight-bold">{{ formatMoney(totals.totalCapital || 0) }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-3">
          <q-card flat bordered style="border-radius: 10px">
            <q-card-section class="q-py-sm text-center">
              <div class="text-caption text-grey-5">Total Juros</div>
              <div class="text-weight-bold text-orange">{{ formatMoney(totals.totalInterest || 0) }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-3">
          <q-card flat bordered style="border-radius: 10px">
            <q-card-section class="q-py-sm text-center">
              <div class="text-caption text-grey-5">Total a Pagar</div>
              <div class="text-weight-bold text-positive">{{ formatMoney(totals.totalInstallment || 0) }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-3">
          <q-card flat bordered style="border-radius: 10px">
            <q-card-section class="q-py-sm text-center">
              <div class="text-caption text-grey-5">Prestação Média</div>
              <div class="text-weight-bold">{{ formatMoney(totals.avgInstallment || 0) }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Amortization Table -->
      <q-card v-if="installments.length > 0" flat bordered style="border-radius: 12px; overflow: hidden">
        <q-table
          :rows="installments"
          :columns="columns"
          row-key="id"
          flat
          bordered
          dense
          separator="horizontal"
          :rows-per-page-options="[25, 50, 100]"
          class="amort-table"
        >
          <template v-slot:body-cell-capital="props">
            <q-td :props="props">
              {{ formatMoney(props.row.capitalPerInstall || props.row.amortization) }}
            </q-td>
          </template>

          <template v-slot:body-cell-interest="props">
            <q-td :props="props">
              {{ formatMoney(props.row.rateAmount) }}
            </q-td>
          </template>

          <template v-slot:body-cell-installment="props">
            <q-td :props="props">
              <span class="text-weight-bold">{{ formatMoney(props.row.installment) }}</span>
            </q-td>
          </template>

          <template v-slot:body-cell-balance="props">
            <q-td :props="props">
              {{ formatMoney(props.row.remainingBalance || 0) }}
            </q-td>
          </template>

          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="getInstallmentStatusColor(props.row.status)"
                :label="getInstallmentStatusText(props.row.status)"
                rounded
                class="q-pa-xs"
                style="font-size: 10px"
              />
            </q-td>
          </template>
        </q-table>
      </q-card>

      <!-- Empty State -->
      <q-card v-else flat bordered style="border-radius: 12px">
        <q-card-section class="text-center q-pa-xl">
          <q-icon name="receipt" size="48px" color="grey-4" />
          <div class="text-subtitle1 text-grey-6 q-mt-sm">Plano de amortização não disponível</div>
        </q-card-section>
      </q-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useLoansStore } from '@/stores/loans'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { formatMoney } from '@/utils/formatters'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const loansStore = useLoansStore()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const companyId = computed(() => authStore.companyId)

const loading = computed(() => loansStore.loading)
const loan = computed(() => loansStore.currentLoan)
const installments = computed(() => loansStore.amortization)
const totals = computed(() => loansStore.amortizationTotals)
const generatingPdf = ref(false)

const columns = [
  { name: 'order', label: 'Nº', field: 'installmentOrder', align: 'center', sortable: true },
  { name: 'date', label: 'Vencimento', field: 'dueDate', align: 'center', sortable: true },
  { name: 'capital', label: 'Capital', field: 'capitalPerInstall', align: 'right', sortable: true },
  { name: 'interest', label: 'Juros', field: 'rateAmount', align: 'right', sortable: true },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right', sortable: true },
  { name: 'balance', label: 'Saldo', field: 'remainingBalance', align: 'right', sortable: true },
  { name: 'status', label: 'Estado', field: 'status', align: 'center', sortable: true }
]

function getStatusColor(status) {
  const colors = { 0: 'orange', 1: 'positive', '-1': 'negative', 3: 'grey' }
  return colors[status] || 'grey'
}

function getStatusText(status) {
  const texts = { 0: 'Pendente', 1: 'Activo', '-1': 'Rejeitado', 3: 'Terminado' }
  return texts[status] || 'Desconhecido'
}

function getInstallmentStatusColor(status) {
  const colors = { 0: 'orange', 1: 'positive', 2: 'negative' }
  return colors[status] || 'grey'
}

function getInstallmentStatusText(status) {
  const texts = { 0: 'Pendente', 1: 'Pago', 2: 'Vencido' }
  return texts[status] || '—'
}

function fmtMoney(value) {
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0) + ' MT'
}

async function generatePdf() {
  generatingPdf.value = true
  try {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default

    if (pdfMake.vfs === undefined) {
      pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts
    }

    const companyName = companyStore.company?.companyName || 'Empresa'
    const l = loan.value

    const tableBody = [
      [
        { text: 'Nº', style: 'tableHeader', alignment: 'center' },
        { text: 'Vencimento', style: 'tableHeader', alignment: 'center' },
        { text: 'Capital', style: 'tableHeader', alignment: 'right' },
        { text: 'Juros', style: 'tableHeader', alignment: 'right' },
        { text: 'Prestação', style: 'tableHeader', alignment: 'right' },
        { text: 'Saldo', style: 'tableHeader', alignment: 'right' },
        { text: 'Estado', style: 'tableHeader', alignment: 'center' }
      ]
    ]

    installments.value.forEach((inst) => {
      tableBody.push([
        { text: String(inst.installmentOrder || ''), alignment: 'center', fontSize: 8 },
        { text: inst.dueDate || '', alignment: 'center', fontSize: 8 },
        { text: fmtMoney(inst.capitalPerInstall || inst.amortization), alignment: 'right', fontSize: 8 },
        { text: fmtMoney(inst.rateAmount), alignment: 'right', fontSize: 8 },
        { text: fmtMoney(inst.installment), alignment: 'right', fontSize: 8, bold: true },
        { text: fmtMoney(inst.remainingBalance || 0), alignment: 'right', fontSize: 8 },
        { text: getInstallmentStatusText(inst.status), alignment: 'center', fontSize: 8 }
      ])
    })

    // Totals row
    if (totals.value) {
      tableBody.push([
        { text: '', colSpan: 2, fontSize: 8 },
        {},
        { text: fmtMoney(totals.value.totalCapital || 0), alignment: 'right', fontSize: 8, bold: true },
        { text: fmtMoney(totals.value.totalInterest || 0), alignment: 'right', fontSize: 8, bold: true },
        { text: fmtMoney(totals.value.totalInstallment || 0), alignment: 'right', fontSize: 8, bold: true },
        { text: '', fontSize: 8 },
        { text: '', fontSize: 8 }
      ])
    }

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [20, 20, 20, 30],
      content: [
        // Header
        { text: companyName, style: 'companyName' },
        { text: 'Plano de Amortização', style: 'title' },
        { text: '\n' },

        // Loan Info
        {
          columns: [
            { width: '25%', text: [
              { text: 'Conta: ', style: 'label' },
              { text: String(l?.accountNumber || ''), style: 'value' }
            ]},
            { width: '25%', text: [
              { text: 'Montante: ', style: 'label' },
              { text: fmtMoney(l?.amount), style: 'value' }
            ]},
            { width: '25%', text: [
              { text: 'Taxa: ', style: 'label' },
              { text: `${((l?.interestRate || 0) * 100).toFixed(1)}%`, style: 'value' }
            ]},
            { width: '25%', text: [
              { text: 'Prestações: ', style: 'label' },
              { text: String(l?.numberOfInstallments || ''), style: 'value' }
            ]}
          ],
          columnGap: 10
        },
        { text: '\n' },

        // Table
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', '*', '*', '*', 'auto'],
            body: tableBody
          },
          layout: {
            hLineWidth: (i) => (i === 0 || i === 1 || i === tableBody.length) ? 1 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#cccccc',
            vLineColor: () => '#cccccc',
            fillColor: (rowIndex) => {
              if (rowIndex === 0) return '#f0f0f0'
              if (rowIndex === tableBody.length - 1 && totals.value) return '#f5f5f5'
              return null
            },
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3
          }
        },

        { text: '\n' },

        // Totals summary
        totals.value ? {
          columns: [
            { width: '25%', text: [
              { text: 'Total Capital: ', style: 'label' },
              { text: fmtMoney(totals.value.totalCapital || 0), style: 'valueBold' }
            ]},
            { width: '25%', text: [
              { text: 'Total Juros: ', style: 'label' },
              { text: fmtMoney(totals.value.totalInterest || 0), style: 'valueBold' }
            ]},
            { width: '25%', text: [
              { text: 'Total a Pagar: ', style: 'label' },
              { text: fmtMoney(totals.value.totalInstallment || 0), style: 'valueBold' }
            ]},
            { width: '25%', text: [
              { text: 'Prestação Média: ', style: 'label' },
              { text: fmtMoney(totals.value.avgInstallment || 0), style: 'valueBold' }
            ]}
          ],
          columnGap: 10
        } : {}
      ],
      styles: {
        companyName: { fontSize: 14, bold: true, color: '#0A6830', margin: [0, 0, 0, 2] },
        title: { fontSize: 18, bold: true, color: '#333333' },
        label: { fontSize: 9, color: '#666666' },
        value: { fontSize: 10, bold: true, color: '#333333' },
        valueBold: { fontSize: 10, bold: true, color: '#0A6830' },
        tableHeader: { fontSize: 8, bold: true, color: '#333333' }
      },
      defaultStyle: {
        fontSize: 9,
        color: '#333333'
      },
      footer: (currentPage, pageCount) => ({
        columns: [
          { text: `Gerado em: ${new Date().toLocaleDateString('pt-MZ')}`, fontSize: 7, color: '#999999' },
          { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: '#999999', alignment: 'right' }
        ],
        margin: [20, 0, 20, 0]
      })
    }

    const fileName = `Amortizacao_Conta${l?.accountNumber || 'N/A'}_${new Date().toISOString().split('T')[0]}.pdf`
    pdfMake.createPdf(docDefinition).download(fileName)

    $q.notify({ type: 'positive', message: 'PDF gerado com sucesso', position: 'top' })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF', position: 'top' })
  } finally {
    generatingPdf.value = false
  }
}

onMounted(async () => {
  const loanId = route.params.id
  if (!loanId) return

  await loansStore.fetchLoan(loanId, companyId.value)

  if (loan.value) {
    await loansStore.fetchAmortization(loanId, loan.value.forfeit || 0)
  }

  // Ensure company data is loaded for PDF header
  if (!companyStore.company && companyId.value) {
    await companyStore.fetchCompany(companyId.value)
  }
})
</script>

<style lang="scss" scoped>
.amort-table {
  :deep(.q-table thead th) {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    color: $grey-6;
    background-color: $grey-1;
  }
  :deep(.q-table tbody td) {
    font-size: 12px;
    padding: 6px 10px;
  }
}

body.body--dark {
  .amort-table {
    :deep(.q-table thead th) {
      background-color: $dark-page;
      color: $grey-5;
    }
  }
}
</style>
