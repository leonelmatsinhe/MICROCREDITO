<template>
  <div class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Documentos do Crédito</div>
        <div class="text-caption text-grey-5" v-if="loan">
          Conta {{ loan.accountNumber }} — {{ customer?.customerName || '' }}
        </div>
      </div>
      <div class="col-auto">
        <q-btn flat icon="arrow_back" label="Voltar" no-caps @click="router.back()" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar dados do crédito...</div>
    </div>

    <template v-else-if="loan">
      <div class="row q-col-gutter-md">
        <!-- Contrato de Concessão -->
        <div class="col-12 col-md-4">
          <q-card flat bordered style="border-radius: 12px" class="document-card">
            <q-card-section class="text-center">
              <q-avatar color="primary" text-color="white" size="64px" class="q-mb-md">
                <q-icon name="gavel" size="32px" />
              </q-avatar>
              <div class="text-subtitle1 text-weight-bold">Contrato de Concessão</div>
              <div class="text-caption text-grey-5 q-mb-md">
                Contrato individual de crédito com confissão de dívida — 20 cláusulas
              </div>
              <q-btn
                unelevated
                color="primary"
                icon="picture_as_pdf"
                label="Gerar PDF"
                no-caps
                rounded
                :loading="generatingContract"
                @click="generateContract"
              />
            </q-card-section>
          </q-card>
        </div>

        <!-- Termo de Compromisso -->
        <div class="col-12 col-md-4">
          <q-card flat bordered style="border-radius: 12px" class="document-card">
            <q-card-section class="text-center">
              <q-avatar color="teal" text-color="white" size="64px" class="q-mb-md">
                <q-icon name="handshake" size="32px" />
              </q-avatar>
              <div class="text-subtitle1 text-weight-bold">Termo de Compromisso</div>
              <div class="text-caption text-grey-5 q-mb-md">
                Declaração de recebimento do valor do crédito
              </div>
              <q-btn
                unelevated
                color="teal"
                icon="picture_as_pdf"
                label="Gerar PDF"
                no-caps
                rounded
                :loading="generatingTerm"
                @click="generateTerm"
              />
            </q-card-section>
          </q-card>
        </div>

        <!-- Declaração de Garantias -->
        <div class="col-12 col-md-4">
          <q-card flat bordered style="border-radius: 12px" class="document-card">
            <q-card-section class="text-center">
              <q-avatar color="orange" text-color="white" size="64px" class="q-mb-md">
                <q-icon name="security" size="32px" />
              </q-avatar>
              <div class="text-subtitle1 text-weight-bold">Declaração de Garantias</div>
              <div class="text-caption text-grey-5 q-mb-md">
                Lista de bens dados em garantia do empréstimo
              </div>
              <q-btn
                unelevated
                color="orange"
                icon="picture_as_pdf"
                label="Gerar PDF"
                no-caps
                rounded
                :loading="generatingGuarantees"
                @click="generateGuarantees"
              />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Documentos do Crédito -->
      <q-card flat bordered style="border-radius: 12px" class="q-mt-md">
        <q-card-section>
          <div class="row items-center q-mb-md">
            <div class="col">
              <div class="text-subtitle1 text-weight-bold">
                <q-icon name="folder" size="18px" class="q-mr-xs" />
                Documentos do Crédito
              </div>
              <div class="text-caption text-grey-5">
                Comprovativos, contratos escaneados e declarações
              </div>
            </div>
            <div class="col-auto">
              <q-btn unelevated color="primary" icon="add" label="Adicionar Documento" no-caps rounded size="sm" @click="showUploadModal = true" />
            </div>
          </div>

          <!-- Lista de documentos -->
          <q-table :rows="creditDocuments" :columns="docColumns" row-key="id" flat dense :rows-per-page-options="[5, 10, 25]" class="q-mb-md">
            <template v-slot:body-cell-documentType="props">
              <q-td :props="props">
                <q-chip :color="getDocTypeColor(props.row.documentType)" text-color="white" size="sm" dense>
                  {{ getDocTypeLabel(props.row.documentType) }}
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <div class="row q-gutter-xs">
                  <q-btn flat round dense icon="open_in_new" size="xs" color="primary" @click="openDocument(props.row)" />
                  <q-btn flat round dense icon="download" size="xs" color="teal" @click="downloadDocument(props.row)" />
                  <q-btn flat round dense icon="delete" size="xs" color="negative" @click="deleteCreditDocument(props.row)" />
                </div>
              </q-td>
            </template>
          </q-table>

          <div v-if="creditDocuments.length === 0" class="text-center q-pa-lg text-grey-5">
            <q-icon name="folder_open" size="48px" />
            <div class="q-mt-sm">Nenhum documento anexado a este crédito</div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Modal Upload -->
      <q-dialog v-model="showUploadModal" persistent>
        <q-card style="border-radius: 16px; min-width: 500px; max-width: 600px">
          <q-card-section class="row items-center bg-primary text-white">
            <q-icon name="upload" size="24px" class="q-mr-sm" />
            <div class="text-h6">Adicionar Documento do Crédito</div>
            <q-space />
            <q-btn flat round dense icon="close" @click="showUploadModal = false" />
          </q-card-section>
          <q-card-section>
            <q-form @submit="uploadCreditDocument" class="q-gutter-md">
              <q-select v-model="uploadForm.documentType" dense outlined :options="docTypeOptions" label="Tipo de Documento *" emit-value map-options :rules="[v => !!v || 'Obrigatório']" input-style="font-size: 13px" />
              <q-input v-model="uploadForm.documentName" dense outlined label="Nome do Documento *" :rules="[v => !!v || 'Obrigatório']" input-style="font-size: 13px" />
              <q-input v-model="uploadForm.description" dense outlined label="Descrição" type="textarea" rows="2" input-style="font-size: 13px" />
              <div>
                <q-file v-model="uploadForm.file" dense outlined label="Ficheiro *" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" :rules="[v => !!v || 'Obrigatório']">
                  <template v-slot:prepend>
                    <q-icon name="attach_file" />
                  </template>
                </q-file>
              </div>
              <q-linear-progress v-if="uploadProgress > 0" :value="uploadProgress / 100" color="info" class="q-mb-md" rounded />
            </q-form>
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" no-caps @click="showUploadModal = false" />
            <q-btn unelevated label="Upload" color="primary" icon="cloud_upload" no-caps rounded :loading="uploading" :disable="!uploadForm.file || !uploadForm.documentType || !uploadForm.documentName" @click="uploadCreditDocument" />          </q-card-actions>
        </q-card>
      </q-dialog>

    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useLoansStore } from '@/stores/loans'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { formatMoney, numberToWords, formatDateShort } from '@/utils/formatters'
import { buildCompanyHeader, buildFooterWithSignature, tableLayout as commonTableLayout } from '@/utils/pdfHeader'
import { generateAmortizationWithBalance } from '@/utils/amortization'
import { api } from '@/boot/axios'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const loansStore = useLoansStore()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(true)
const loan = ref(null)
const customer = ref(null)
const company = ref(null)
const guarantees = ref([])
const accounts = ref([])
const amortization = ref([])

const generatingContract = ref(false)
const generatingTerm = ref(false)
const generatingGuarantees = ref(false)

// Documentos do crédito
const creditDocuments = ref([])
const showUploadModal = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadForm = ref({
  documentType: null,
  documentName: '',
  description: '',
  file: null
})

const docTypeOptions = [
  { label: 'Comprovativo de Pagamento', value: 'payment_receipt' },
  { label: 'Contrato de Concessão Escaneado', value: 'contract_scanned' },
  { label: 'Declaração de Garantias Escaneada', value: 'guarantees_declaration' },
  { label: 'Termo de Compromisso Escaneado', value: 'commitment_term' },
  { label: 'Outro Documento', value: 'other' }
]

const docColumns = [
  { name: 'documentType', label: 'Tipo', field: 'documentType', align: 'center', style: 'font-size: 11px' },
  { name: 'documentName', label: 'Nome', field: 'documentName', align: 'left', style: 'font-size: 11px' },
  { name: 'description', label: 'Descrição', field: 'description', align: 'left', style: 'font-size: 11px' },
  { name: 'createdAt', label: 'Data', field: 'createdAt', align: 'center', style: 'font-size: 11px' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center', style: 'font-size: 11px' }
]

function getDocTypeColor(type) {
  const colors = {
    payment_receipt: 'positive',
    contract_scanned: 'primary',
    guarantees_declaration: 'orange',
    commitment_term: 'teal',
    other: 'grey'
  }
  return colors[type] || 'grey'
}

function getDocTypeLabel(type) {
  const labels = {
    payment_receipt: 'Pagamento',
    contract_scanned: 'Contrato',
    guarantees_declaration: 'Garantias',
    commitment_term: 'Termo',
    other: 'Outro'
  }
  return labels[type] || 'Outro'
}

async function fetchCreditDocuments() {
  if (!loan.value?.id) return
  try {
    const companyId = authStore.companyId
    const accountNumber = loan.value.accountNumber
    const { data } = await api.get(`/api/document/${accountNumber}?companyId=${companyId}`)
    if (data.success) {
      creditDocuments.value = (data.result || []).filter(d => d.loanId === loan.value.id || !d.loanId)
    }
  } catch {
    creditDocuments.value = []
  }
}

async function uploadCreditDocument() {
  if (!uploadForm.value.file || !uploadForm.value.documentType || !uploadForm.value.documentName) return
  uploading.value = true
  uploadProgress.value = 0
  try {
    const formData = new FormData()
    formData.append('file', uploadForm.value.file)
    formData.append('documentName', uploadForm.value.documentName)
    formData.append('documentType', uploadForm.value.documentType)
    formData.append('description', uploadForm.value.description || '')
    formData.append('accountNumber', loan.value.accountNumber)
    formData.append('companyId', authStore.companyId)
    formData.append('loanId', loan.value.id)
    formData.append('uploadedBy', authStore.userName || 'Sistema')

    const token = localStorage.getItem('applicationMicroToken')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const { data } = await api.post('/api/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data', ...headers },
      onUploadProgress: (e) => {
        if (e.total) uploadProgress.value = Math.round((e.loaded * 100) / e.total)
      }
    })

    if (data.success) {
      $q.notify({ type: 'positive', message: 'Documento adicionado com sucesso', position: 'top' })
      showUploadModal.value = false
      uploadForm.value = { documentType: null, documentName: '', description: '', file: null }
      uploadProgress.value = 0
      await fetchCreditDocuments()
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao fazer upload', position: 'top' })
  } finally {
    uploading.value = false
  }
}

function openDocument(doc) {
  if (doc.documentFileUrl) {
    window.open(doc.documentFileUrl, '_blank')
  }
}

function downloadDocument(doc) {
  if (doc.documentFileUrl) {
    const link = document.createElement('a')
    link.href = doc.documentFileUrl
    link.download = doc.documentName || 'documento'
    link.click()
  }
}

async function deleteCreditDocument(doc) {
  $q.dialog({
    title: 'Eliminar Documento',
    message: `Deseja eliminar "${doc.documentName}"?`,
    cancel: 'Não',
    ok: { label: 'Sim, eliminar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/api/document/${doc.id}`)
      $q.notify({ type: 'positive', message: 'Documento eliminado', position: 'top' })
      await fetchCreditDocuments()
    } catch {
      $q.notify({ type: 'negative', message: 'Erro ao eliminar', position: 'top' })
    }
  })
}

// Helper: get company logo as base64 for pdfmake
async function getLogoBase64() {
  const logo = companyStore.companyLogo
  if (!logo || logo === '/logo.png') return null
  try {
    const token = localStorage.getItem('applicationMicroToken')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch(logo, { headers })
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('image/')) {
      console.warn('Logo URL returned non-image content-type:', contentType)
      return null
    }
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('Could not load logo:', e)
    return null
  }
}

// Helper: convert gender
function convertGender() {
  const g = customer.value?.customerGender?.toLowerCase()
  if (g === 'f' || g === 'feminino') return 'A MUTUÁRIA'
  return 'O MUTUÁRIO'
}

function convertGenderLabel() {
  const g = customer.value?.customerGender?.toLowerCase()
  if (g === 'f' || g === 'feminino') return 'Mulher'
  return 'Homem'
}

// Common table styles
const tableLayout = {
  fillColor: (rowIndex) => rowIndex === 0 ? '#f0f0f0' : null,
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#cccccc',
  vLineColor: () => '#cccccc',
}

// ==================== CONTRATO DE CONCESSÃO ====================
async function generateContract() {
  generatingContract.value = true
  try {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default
    if (pdfMake.vfs === undefined) {
      pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts
    }

    const c = company.value || {}
    const cu = customer.value || {}
    const l = loan.value || {}
    const amount = parseFloat(l.amount) || 0
    const rate = (l.interestRate * 100).toFixed(1)
    const totalWithInterest = amount + (amount * l.interestRate * l.numberOfInstallments)
    // Taxa de preparos administrativos — dinâmica, definida na concessão do crédito (0 = isento)
    const adminFeeRate = parseFloat(l.administrativeFee) || 0
    const preparationFee = Math.round(amount * adminFeeRate * 100) / 100
    const adminFeePct = (adminFeeRate * 100).toFixed(1)
    const companyName = c.companyName || 'MBR Microcrédito'
    const companyAbbr = companyName.replace(/\s+/g, '').substring(0, 10).toUpperCase()
    // Cláusula VIGÉSIMA PRIMEIRA (seguro) — ocultável por empresa em Configurações → Dados da Empresa
    const showInsuranceClause = Number(c.contractHideInsuranceClause || 0) !== 1

    // Build accounts table
    const accountsRows = accounts.value.length > 0
      ? accounts.value.map((acc, idx) => [
          { text: `${idx + 1}`, fontSize: 7, alignment: 'center' },
          { text: acc.accountDescription || '--', fontSize: 7 },
          { text: acc.accountHolder || '--', fontSize: 7 },
          { text: acc.accountNumber || '--', fontSize: 7, alignment: 'center', bold: true },
        ])
      : []

    // Build guarantees list
    const guaranteesList = guarantees.value.length > 0
      ? guarantees.value.map(g => ({ text: g.guaranteeDescription || g.description || 'Sem descrição', fontSize: 8 }))
      : [{ text: '(Sem garantias registadas)', fontSize: 8, italics: true, color: '#999999' }]

    const logoBase64 = await getLogoBase64()
    const headerElements = buildCompanyHeader(c, logoBase64, 'Contrato de Concessão de Empréstimo')

    const docDefinition = {
      footer: function(currentPage, pageCount) {
        return {
          columns: [
            { text: 'Documento processado por computador', alignment: 'left', fontSize: 7, margin: [30, 0, 0, 0] },
            { text: `${c.companyName || ''} | Pág. ${currentPage}/${pageCount}`, alignment: 'right', fontSize: 7, margin: [0, 0, 30, 0] },
          ],
        }
      },
      content: [
        ...headerElements,
        { text: '\nEntre:\n\n', fontSize: 8, bold: true },
        {
          text: { alignment: 'justify', fontSize: 8, text: `${c.companyName || ''}, uma instituição financeira licenciada pelo Banco de Moçambique, titular do NUIT ${c.companyNuit || ''}, com sede em ${c.companyAddress || ''}, doravante designada por Mutuante ou Credora` },
        },
        { text: '\n&\n\n', fontSize: 8 },
        {
          text: { alignment: 'justify', fontSize: 8, text: `${cu.customerName || ''}, portador do B.I número ${cu.customerNationalId || ''}, residente no ${cu.customerAddress || ''}, de ora em diante denominado ${convertGender()}.` },
        },
        // CLÁUSULA PRIMEIRA
        { text: '\nCLÁUSULA PRIMEIRA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Objecto, Montante e Forma de Desenvolvimento do Capital)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: '1. ', bold: true }, { text: `O presente contrato tem por objecto, regular a concessão de um empréstimo, em forma de mútuo que o Mutuante disponibiliza ao Mutuário e, este último confessa-se para todos os efeitos legais, devedor do Mutuante, no montante de capital de ` }, { text: `${formatMoney(amount)} (${numberToWords(amount)} meticais)`, bold: true }, { text: `, acrescidos de juros acordados de ` }, { text: `${rate}%`, bold: true }, { text: `, irão vencendo nos termos e condições indicados nas cláusulas que se seguem.` }], fontSize: 8, alignment: 'justify' },
        // CLÁUSULA SEGUNDA
        { text: '\nCLÁUSULA SEGUNDA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Forma de Desembolso e Entrada em Vigor do Contrato)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: '1. ', bold: true }, { text: 'O valor do empréstimo foi entregue ao Mutuário, através do desembolso directo na conta do Mutuário.' }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '\n2. ', bold: true }, { text: 'O presente contrato entra imediatamente em vigor na data da sua assinatura.' }], fontSize: 8, alignment: 'justify' },
        // CLÁUSULA TERCEIRA
        { text: '\nCLÁUSULA TERCEIRA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Prazo)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: '1. ', bold: true }, { text: `O presente contrato é celebrado por um período de ${l.numberOfInstallments} ${l.numberOfInstallments == 1 ? 'mês' : 'meses'}, contados a partir da data da disponibilização do capital mutuado.` }], fontSize: 8, alignment: 'justify' },
        // CLÁUSULA QUARTA
        { text: '\nCLÁUSULA QUARTA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Taxas de Juros e Plano de Pagamento)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: '1. ', bold: true }, { text: `O montante desembolsado e que constitui a dívida confessada, no presente contrato, vence juros remuneratórios de ${rate}%, sendo estes calculados mensalmente sobre o capital em dívida e pagáveis conjuntamente com o reembolso do capital.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '\n2. ', bold: true }, { text: 'O reembolso do capital e juros será efectuado de acordo com o plano de amortização constante do presente contrato, conforme tabela abaixo:' }], fontSize: 8, alignment: 'justify' },
        // PLANO DE PAGAMENTO
        { text: '\nPlano de Pagamento das Prestações', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 6] },
        // Mini tabela resumo (usando dados da API)
        ...(() => {
          const plan = amortization.value || []
          if (plan.length === 0) return []
          const totalInterest = plan.reduce((sum, r) => sum + (parseFloat(r.rateAmount) || 0), 0)
          const totalInstallment = plan.reduce((sum, r) => sum + (parseFloat(r.installment) || 0), 0)
          return [
            {
              table: {
                widths: ['*', '*', '*', '*', '*'],
                body: [
                  [
                    { text: 'Capital Financiado', fontSize: 8, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
                    { text: 'Taxa de Juro', fontSize: 8, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
                    { text: 'Nº Prestações', fontSize: 8, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
                    { text: 'Total de Juros', fontSize: 8, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
                    { text: 'Total a Pagar', fontSize: 8, bold: true, alignment: 'center', fillColor: '#e8eaf6' },
                  ],
                  [
                    { text: formatMoney(amount), fontSize: 10, bold: true, alignment: 'center' },
                    { text: `${rate}%`, fontSize: 10, bold: true, alignment: 'center' },
                    { text: `${l.numberOfInstallments}`, fontSize: 10, bold: true, alignment: 'center' },
                    { text: formatMoney(totalInterest), fontSize: 10, bold: true, alignment: 'center' },
                    { text: formatMoney(totalInstallment), fontSize: 10, bold: true, alignment: 'center', color: '#1565c0' },
                  ],
                ],
              },
              layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0' },
              margin: [0, 0, 0, 8],
            },
          ]
        })(),
        // Tabela de amortização - dados da API (consistente com simulador)
        ...(() => {
          const plan = amortization.value || []
          if (plan.length === 0) return []
          const totalInterest = plan.reduce((sum, r) => sum + (parseFloat(r.rateAmount) || 0), 0)
          const totalAmortization = plan.reduce((sum, r) => sum + (parseFloat(r.amortization) || 0), 0)
          const totalInstallment = plan.reduce((sum, r) => sum + (parseFloat(r.installment) || 0), 0)
          
          // Calcular saldo decrecente (sistema francês Price)
          let saldo = amount
          return [
            {
              table: {
                widths: ['auto', '*', '*', '*', '*', 'auto'],
                body: [
                  // Header
                  [
                    { text: 'Ordem', style: 'columnsTitle', alignment: 'center' },
                    { text: 'Amortização', style: 'columnsTitle', alignment: 'right' },
                    { text: 'Juros', style: 'columnsTitle', alignment: 'right' },
                    { text: 'Prestação', style: 'columnsTitle', alignment: 'right' },
                    { text: 'Saldo', style: 'columnsTitle', alignment: 'right' },
                    { text: 'Vencimento', style: 'columnsTitle', alignment: 'center' },
                  ],
                  // Rows usando dados da API
                  ...plan.map((a, idx) => {
                    const amort = parseFloat(a.amortization) || 0
                    // Usar remainingBalance da API se disponível, senão calcular
                    const apiBalance = a.remainingBalance !== undefined ? parseFloat(a.remainingBalance) : null
                    if (apiBalance !== null && apiBalance !== undefined) {
                      saldo = apiBalance
                    } else {
                      saldo = Math.max(0, saldo - amort)
                    }
                    // Forçar 0 na última prestação para evitar 0.01
                    if (idx === plan.length - 1) saldo = 0
                    return [
                      { text: `${idx + 1}ª`, fontSize: 7, alignment: 'center' },
                      { text: formatMoney(amort), fontSize: 7, alignment: 'right' },
                      { text: formatMoney(a.rateAmount || 0), fontSize: 7, alignment: 'right' },
                      { text: formatMoney(a.installment || 0), fontSize: 7, alignment: 'right', bold: true },
                      { text: formatMoney(saldo), fontSize: 7, alignment: 'right', color: saldo > 0 ? '#333' : '#2e7d32' },
                      { text: formatDateShort(a.dueDate), fontSize: 7, alignment: 'center' },
                    ]
                  }),
                  // Total
                  [
                    { text: 'Total', fontSize: 7, bold: true, alignment: 'center' },
                    { text: formatMoney(totalAmortization), fontSize: 7, alignment: 'right', bold: true },
                    { text: formatMoney(totalInterest), fontSize: 7, alignment: 'right', bold: true },
                    { text: formatMoney(totalInstallment), fontSize: 7, alignment: 'right', bold: true },
                    { text: '0,00 MT', fontSize: 7, alignment: 'right', bold: true, color: '#2e7d32' },
                    { text: '', fontSize: 7 },
                  ],
                ],
              },
              layout: commonTableLayout,
              margin: [0, 0, 0, 8],
            },
          ]
        })(),
        // CLÁUSULA QUINTA
        { text: '\nCLÁUSULA QUINTA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Reembolso e Local)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: 'As rendas mensais de capital e juros a amortizar serão pagas pelo Mutuário ao Mutuante, através de crédito a efectuar nas seguintes contas:', fontSize: 8, alignment: 'justify' },
        ...(accountsRows.length > 0
          ? [{ table: { widths: ['auto', '*', '*', 'auto'], body: [[{ text: '#', style: 'columnsTitle', alignment: 'center' }, { text: 'Banco', style: 'columnsTitle' }, { text: 'Titular', style: 'columnsTitle' }, { text: 'Nº Conta', style: 'columnsTitle', alignment: 'center' }], ...accountsRows] }, layout: tableLayout, margin: [0, 6, 0, 0] }]
          : [{ text: '(Sem contas registadas)', fontSize: 8, italics: true, color: '#999999', margin: [0, 4, 0, 0] }]
        ),
        // CLÁUSULA SEXTA
        { text: '\nCLÁUSULA SEXTA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Prova de Reembolso)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: 'O talão de depósito ou nota de transferência bancária servem como prova de reembolso da prestação devida.', fontSize: 8, alignment: 'justify' },
        // CLÁUSULA SÉTIMA
        { text: '\nCLÁUSULA SÉTIMA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Comissão de Preparos)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: 'Pela operação o Mutuário ' }, { text: adminFeeRate > 0 ? `paga uma taxa de preparos de ${formatMoney(preparationFee)} (${numberToWords(preparationFee)} meticais), correspondentes a ${adminFeePct}% sobre o capital do empréstimo, sendo estes liquidados de uma só vez na data do desembolso do capital.` : 'está isento do pagamento da taxa de preparos administrativos.', bold: adminFeeRate > 0 }], fontSize: 8, alignment: 'justify' },
        // CLÁUSULA OITAVA
        { text: '\nCLÁUSULA OITAVA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Mora e Incumprimento)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: '1. ', bold: true }, { text: `A mora pela amortização de qualquer prestação vencida implica a aplicação de juros moratórios de ${c.forfeit || 0.1}% por dia, a calcular sobre o capital e juros das prestações vencidas.` }], fontSize: 8, alignment: 'justify' },
        // CLÁUSULA NONA
        { text: '\nCLÁUSULA NONA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Garantias do Empréstimo)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: 'Para este empréstimo, o Mutuário apresenta como garantias:', fontSize: 8, alignment: 'justify' },
        { ul: guaranteesList, margin: [10, 4, 0, 0] },
        // CLÁUSULA DÉCIMA
        { text: '\nCLÁUSULA DÉCIMA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Futuro Uso das Garantias)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: 'As garantias descritas na cláusula nona poderão ser usadas em futuros créditos, mediante solicitação de novo empréstimo.', fontSize: 8, alignment: 'justify' },
        // CLÁUSULA DÉCIMA PRIMEIRA
        { text: '\nCLÁUSULA DÉCIMA PRIMEIRA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Pari Passu)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: 'Caso venha a ocorrer uma situação em que o Mutuário não possa cumprir pontualmente e integralmente com todas as suas obrigações, o Mutuante concorre em igualdade de circunstância com os restantes credores.', fontSize: 8, alignment: 'justify' },
        // CLÁUSULA DÉCIMA SEGUNDA
        { text: '\nCLÁUSULA DÉCIMA SEGUNDA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Entrega Voluntária dos Bens)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: '1. ', bold: true }, { text: 'Em caso de incumprimento do presente pelo Mutuário, o Mutuante reserva-se ao direito de se fazer pelas garantias assumidas sem recurso aos tribunais.' }], fontSize: 8, alignment: 'justify' },
        // CLÁUSULA DÉCIMA TERCEIRA
        { text: '\nCLÁUSULA DÉCIMA TERCEIRA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Execução das Garantias)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: '1. ', bold: true }, { text: 'O bem poderá ser executado logo que vencida qualquer uma das prestações e que o Mutuário tenha efectuado a sua completa e integral liquidação.' }], fontSize: 8, alignment: 'justify' },
        // CLÁUSULA DÉCIMA QUARTA
        { text: '\nCLÁUSULA DÉCIMA QUARTA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Exigibilidade do Crédito)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: '1. ', bold: true }, { text: 'O Crédito objecto do presente contrato considera-se vencido e automaticamente todo o capital e juros em dívida nos seguintes casos: falta de pagamento de uma ou mais prestações vencidas, aplicação para fins diferentes daqueles pelos quais o financiamento foi destinado.' }], fontSize: 8, alignment: 'justify' },
        // CLÁUSULA DÉCIMA QUINTA
        { text: '\nCLÁUSULA DÉCIMA QUINTA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Endereços)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: 'Todas as comunicações entre o Mutuante e o Mutuário deverão ser efectuadas por escrito, e dirigidas para os endereços constantes no Contrato.', fontSize: 8, alignment: 'justify' },
        // CLÁUSULA DÉCIMA SEXTA
        { text: '\nCLÁUSULA DÉCIMA SEXTA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Despesas)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: '1. ', bold: true }, { text: 'Todas as despesas inerentes à execução do presente contrato, incluindo o valor de impostos de selo, correm por conta e responsabilidade do Mutuário.' }], fontSize: 8, alignment: 'justify' },
        // CLÁUSULA DÉCIMA SÉTIMA
        { text: '\nCLÁUSULA DÉCIMA SÉTIMA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Liquidação Antecipada)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: [{ text: '1. ', bold: true }, { text: 'Em caso de reembolso antecipado da totalidade ou da parte do capital em dívida, o mesmo deverá ser efectuado nas datas do vencimento das prestações.' }], fontSize: 8, alignment: 'justify' },
        // CLÁUSULA DÉCIMA OITAVA
        { text: '\nCLÁUSULA DÉCIMA OITAVA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Acordo)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: 'O presente contrato vai ser assinado em duplicado, ficando uma à disposição do Mutuante e outra do Mutuário.', fontSize: 8, alignment: 'justify' },
        // CLÁUSULA DÉCIMA NONA
        { text: '\nCLÁUSULA DÉCIMA NONA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Foro)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: 'Em caso de litígio o foro competente é o Tribunal Judicial da Cidade de Maputo, com expressa renúncia a qualquer outro.', fontSize: 8, alignment: 'justify' },
        // CLÁUSULA VIGÉSIMA
        { text: '\nCLÁUSULA VIGÉSIMA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Disposições Finais)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        { text: 'O presente contrato é regido pela legislação moçambicana em vigor.', fontSize: 8, alignment: 'justify' },
        // CLÁUSULA VIGÉSIMA PRIMEIRA (seguro) — ocultável em Configurações → Empresa
        ...(showInsuranceClause ? [
        { text: '\nCLÁUSULA VIGÉSIMA PRIMEIRA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
        { text: '(Protecção do Empréstimo, Seguro, Garantias e Recuperação do Crédito)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
        // 1. Finalidade do Empréstimo
        { text: [{ text: '1. Finalidade do Empréstimo', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '1.1. ', bold: true }, { text: `O crédito concedido ao MUTUÁRIO integra o montante global do valor disponibilizado, destinado ao financiamento das actividades de geração de renda, dos beneficiários elegíveis definidos, celebrado entre a KMAD e a ` }, { text: companyName, bold: true }, { text: ` (${companyAbbr}).` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '1.2. ', bold: true }, { text: 'O MUTUÁRIO reconhece que os recursos recebidos constituem capital destinado à concessão de crédito e que a sua utilização, reembolso e recuperação deverão observar as condições estabelecidas no presente contrato.' }], fontSize: 8, alignment: 'justify' },
        // 2. Obrigatoriedade do seguro antes do desembolso
        { text: [{ text: '2. Obrigatoriedade do seguro antes do desembolso', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '2.1. ', bold: true }, { text: 'A contratação e activação do seguro obrigatório constituem condição suspensiva para o desembolso do crédito.' }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '2.2. ', bold: true }, { text: `A ${companyName} não efectuará qualquer desembolso ao MUTUÁRIO enquanto não estiver comprovada a existência de uma apólice de seguro válida e activa, emitida por uma seguradora legalmente autorizada a operar na República de Moçambique.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '2.3. ', bold: true }, { text: 'O seguro deverá abranger, conforme disponibilidade e condições da seguradora:' }], fontSize: 8, alignment: 'justify' },
        { text: '      a) Morte do MUTUÁRIO;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      b) Invalidez permanente total;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      c) Incapacidade temporária para o trabalho;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      d) Desemprego involuntário, quando aplicável; e', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      e) Outras coberturas consideradas necessárias para a protecção do crédito.', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: [{ text: '2.4. ', bold: true }, { text: `A ${companyName} deverá ser indicada como `, bold: false }, { text: 'beneficiária preferencial da indemnização até ao limite do saldo devedor', bold: true }, { text: ', relativamente às coberturas directamente relacionadas com o crédito.' }], fontSize: 8, alignment: 'justify' },
        // 3. Protecção do capital
        { text: [{ text: '3. Protecção do capital', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '3.1. ', bold: true }, { text: 'O MUTUÁRIO reconhece que a preservação do capital constitui condição essencial do financiamento.' }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '3.2. ', bold: true }, { text: `O MUTUÁRIO obriga-se a utilizar os recursos exclusivamente para a finalidade aprovada pela ${companyName} e definida no respectivo processo de crédito.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '3.3. ', bold: true }, { text: `É expressamente proibida a utilização do financiamento para fins diferentes dos aprovados, salvo autorização prévia e escrita da ${companyName}.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '3.4. ', bold: true }, { text: 'O incumprimento das obrigações de utilização, conservação ou reembolso do capital poderá determinar a exigência do ', bold: false }, { text: 'reembolso antecipado do saldo devedor', bold: true }, { text: ', sem prejuízo de outros direitos previstos no contrato e na legislação aplicável.' }], fontSize: 8, alignment: 'justify' },
        // 4. Garantias do crédito
        { text: [{ text: '4. Garantias do crédito', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '4.1. ', bold: true }, { text: `Como condição para a concessão do financiamento, o MUTUÁRIO deverá prestar as garantias exigidas pela ${companyName}, adequadas ao montante, prazo, finalidade e perfil de risco do crédito.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '4.2. ', bold: true }, { text: 'As garantias poderão incluir, conforme aplicável:' }], fontSize: 8, alignment: 'justify' },
        { text: '      a) Garantia pessoal/fiança;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      b) Aval;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      c) Penhor de bens móveis, equipamentos, mercadorias ou outros activos;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      d) Hipoteca ou outra garantia real legalmente admissível;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      e) Cessão de créditos ou de receitas provenientes de contratos; e', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: `      f) Outras garantias aceites pela ${companyName}.`, fontSize: 8, margin: [10, 2, 0, 0] },
        { text: [{ text: '4.3. ', bold: true }, { text: `A existência de seguro não elimina nem substitui as garantias exigidas pela ${companyName}, salvo decisão expressa da ${companyName} em sentido contrário.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '4.4. ', bold: true }, { text: 'Sempre que o financiamento seja garantido por um bem susceptível de seguro, o MUTUÁRIO deverá manter o referido bem devidamente seguro durante toda a vigência do crédito.' }], fontSize: 8, alignment: 'justify' },
        // 5. Seguro dos bens dados em garantia
        { text: [{ text: '5. Seguro dos bens dados em garantia', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '5.1. ', bold: true }, { text: 'Os bens dados em garantia deverão, sempre que a sua natureza o permita, estar cobertos por seguro adequado contra os principais riscos associados ao activo.' }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '5.2. ', bold: true }, { text: `A ${companyName} deverá ser indicada como `, bold: false }, { text: 'beneficiária preferencial da indemnização até ao limite do saldo devedor', bold: true }, { text: ', sempre que legalmente admissível.' }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '5.3. ', bold: true }, { text: 'Em caso de destruição, perda ou dano do bem dado em garantia, a indemnização do seguro deverá ser utilizada, conforme aplicável, para:' }], fontSize: 8, alignment: 'justify' },
        { text: '      a) reposição ou reparação do bem; ou', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: `      b) amortização ou liquidação do saldo devedor perante a ${companyName}.`, fontSize: 8, margin: [10, 2, 0, 0] },
        // 6. Morte ou invalidez permanente do mutuário
        { text: [{ text: '6. Morte ou invalidez permanente do mutuário', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '6.1. ', bold: true }, { text: `Em caso de morte ou invalidez permanente total do MUTUÁRIO decorrente de evento coberto pela apólice, a ${companyName} comunicará o sinistro à seguradora e adoptará as medidas necessárias para acionar a cobertura.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '6.2. ', bold: true }, { text: `O valor da indemnização será aplicado prioritariamente na liquidação do saldo devedor do MUTUÁRIO perante a ${companyName}, até ao limite do capital seguro.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '6.3. ', bold: true }, { text: 'Caso a indemnização seja superior ao saldo devedor, o remanescente será destinado ao beneficiário legalmente competente, nos termos da apólice e da legislação aplicável.' }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '6.4. ', bold: true }, { text: 'Caso a indemnização seja inferior ao saldo devedor ou o sinistro seja recusado pela seguradora por motivo previsto na apólice, o saldo não coberto continuará a ser devido pelo MUTUÁRIO ou pelos responsáveis legalmente obrigados.' }], fontSize: 8, alignment: 'justify' },
        // 7. Incapacidade temporária
        { text: [{ text: '7. Incapacidade temporária', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '7.1. ', bold: true }, { text: 'Quando esta cobertura estiver expressamente contratada, a incapacidade temporária poderá permitir o pagamento das prestações do crédito pela seguradora durante o período previsto na apólice.' }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '7.2. ', bold: true }, { text: `A incapacidade temporária não implica automaticamente a suspensão das obrigações do MUTUÁRIO perante a ${companyName}, salvo quando o pagamento pela seguradora estiver confirmado e abranger a respectiva prestação.` }], fontSize: 8, alignment: 'justify' },
        // 8. Desemprego involuntário
        { text: [{ text: '8. Desemprego involuntário', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '8.1. ', bold: true }, { text: 'Quando contratada esta cobertura, o desemprego involuntário do MUTUÁRIO poderá dar lugar ao pagamento das prestações do crédito pela seguradora, dentro dos limites, períodos de carência e condições estabelecidas na apólice.' }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '8.2. ', bold: true }, { text: 'O desemprego voluntário, abandono do emprego, despedimento por justa causa ou outras situações expressamente excluídas pela apólice não serão considerados eventos cobertos.' }], fontSize: 8, alignment: 'justify' },
        // 9. Incumprimento e recuperação do crédito
        { text: [{ text: '9. Incumprimento e recuperação do crédito', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '9.1. ', bold: true }, { text: 'O não pagamento de qualquer prestação na data de vencimento constituirá incumprimento nos termos definidos no contrato de crédito.' }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '9.2. ', bold: true }, { text: `Verificado o incumprimento, a ${companyName} poderá adoptar medidas de recuperação, incluindo:` }], fontSize: 8, alignment: 'justify' },
        { text: '      a) Contacto e notificação do MUTUÁRIO;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      b) Plano de regularização ou reestruturação, quando justificável;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      c) Acionamento das garantias constituídas;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      d) Acionamento do seguro, quando o incumprimento resultar de evento coberto;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      e) Execução das garantias legalmente admissíveis; e', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      f) Recurso às demais vias extrajudiciais ou judiciais disponíveis.', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: [{ text: '9.3. ', bold: true }, { text: `A ${companyName} deverá procurar recuperar o crédito de forma proporcional e adequada, tendo em consideração a preservação do Capital e os direitos do MUTUÁRIO.` }], fontSize: 8, alignment: 'justify' },
        // 10. Obrigação de comunicação de alterações
        { text: [{ text: '10. Obrigação de comunicação de alterações', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '10.1. ', bold: true }, { text: `O MUTUÁRIO obriga-se a comunicar imediatamente à ${companyName}, qualquer alteração relevante que possa afectar a sua capacidade de pagamento, incluindo perda de emprego, incapacidade para trabalhar, redução significativa dos rendimentos, perda ou deterioração dos bens dados em garantia, ou qualquer outro facto relevante para o cumprimento do contrato.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '10.2. ', bold: true }, { text: 'O MUTUÁRIO deverá igualmente comunicar qualquer alteração, cancelamento, suspensão ou não renovação da apólice de seguro.' }], fontSize: 8, alignment: 'justify' },
        // 11. Manutenção das garantias e seguros
        { text: [{ text: '11. Manutenção das garantias e seguros', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '11.1. ', bold: true }, { text: `Durante toda a vigência do crédito, o MUTUÁRIO deverá assegurar a manutenção das garantias e seguros exigidos pela ${companyName}.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '11.2. ', bold: true }, { text: `A ${companyName} poderá solicitar, a qualquer momento, comprovativos da validade das garantias e das apólices de seguro.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '11.3. ', bold: true }, { text: 'A falta de manutenção das garantias ou do seguro obrigatório poderá constituir incumprimento contratual, e dar lugar às medidas previstas no presente contrato.' }], fontSize: 8, alignment: 'justify' },
        // 12. Proibição de levantamento ou transferência de garantias
        { text: [{ text: '12. Proibição de levantamento ou transferência de garantias', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '12.1. ', bold: true }, { text: `Sem autorização prévia e escrita da ${companyName}, o MUTUÁRIO não poderá vender, transferir, alienar, onerar, dar novamente em garantia ou praticar qualquer acto que possa reduzir o valor dos bens dados em garantia.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '12.2. ', bold: true }, { text: 'Qualquer violação desta obrigação poderá determinar o vencimento antecipado do crédito, nos termos do presente contrato e da legislação aplicável.' }], fontSize: 8, alignment: 'justify' },
        // 13. Vencimento antecipado
        { text: [{ text: '13. Vencimento antecipado', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '13.1. ', bold: true }, { text: `Sem prejuízo das disposições legais aplicáveis, a ${companyName} poderá declarar antecipadamente vencido o crédito quando se verifique, designadamente:` }], fontSize: 8, alignment: 'justify' },
        { text: '      a) Utilização indevida dos fundos;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      b) Prestação de informações falsas ou materialmente incorrectas;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      c) Incumprimento reiterado das prestações;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      d) Cancelamento ou inexistência do seguro obrigatório;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      e) Deterioração ou desaparecimento das garantias sem reposição adequada;', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      f) Alienação não autorizada de bens dados em garantia; ou', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: '      g) Ocorrência de qualquer outro facto grave que comprometa significativamente a recuperação do crédito.', fontSize: 8, margin: [10, 2, 0, 0] },
        { text: [{ text: '13.2. ', bold: true }, { text: 'Declarado o vencimento antecipado, o MUTUÁRIO deverá proceder ao pagamento integral do saldo devedor, acrescido dos encargos contratualmente devidos e legalmente admissíveis.' }], fontSize: 8, alignment: 'justify' },
        // 14. Aplicação dos valores recuperados
        { text: [{ text: '14. Aplicação dos valores recuperados', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '14.1. ', bold: true }, { text: `Os valores recebidos pela ${companyName} provenientes de pagamentos do MUTUÁRIO, indemnizações de seguros, execução de garantias ou outras formas de recuperação serão aplicados na regularização das obrigações do crédito, observando a ordem de imputação prevista no contrato e na legislação aplicável.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '14.2. ', bold: true }, { text: `A ${companyName} manterá registos adequados dos valores desembolsados, recebidos, recuperados e eventualmente indemnizados pela seguradora, de modo a permitir o acompanhamento da utilização e recuperação do capital.` }], fontSize: 8, alignment: 'justify' },
        // 15. Responsabilidade pela sustentabilidade do Fundo
        { text: [{ text: '15. Responsabilidade pela sustentabilidade do Fundo', bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
        { text: [{ text: '15.1. ', bold: true }, { text: 'O MUTUÁRIO reconhece que o cumprimento pontual das suas obrigações contribui directamente para a preservação e continuidade do Fundo KMAD.' }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '15.2. ', bold: true }, { text: `O MUTUÁRIO compromete-se, por isso, a cumprir rigorosamente as condições do financiamento, permitindo que os valores recuperados possam, nos termos do contrato com a ${companyName} e das regras aplicáveis ao uso do capital, continuar a beneficiar outros membros elegíveis da comunidade.` }], fontSize: 8, alignment: 'justify' },
        { text: [{ text: '15.3. ', bold: true }, { text: `A presente cláusula não prejudica os direitos da ${companyName} decorrentes dos Contratos celebrados com os clientes, nem limita as obrigações da ${companyName} perante os seus clientes relativamente à administração, controlo, pagamento das prestações e preservação dos recursos disponibilizados.` }], fontSize: 8, alignment: 'justify' },
        ] : []),
        // Tabela de prestação de informação do Mutuário (também ocultada com a cláusula de seguro)
        ...(showInsuranceClause ? [
          ...(() => {
          // Buscar borrowerInfo do loan se disponível
          let borrowerInfo = null
          try {
            borrowerInfo = l.borrowerInfo ? JSON.parse(l.borrowerInfo) : null
          } catch {}
          const installments = amortization.value || []
          const lastInstallment = installments.length > 0 ? installments[installments.length - 1] : {}
          const firstInstallment = installments.length > 0 ? installments[0] : {}
          const installValue = firstInstallment.installment || 0
          const lastDue = lastInstallment.dueDate ? formatDateShort(lastInstallment.dueDate) : '-'
          return [
            { text: '\nTabela de Prestação de Informação do Mutuário', fontSize: 10, bold: true, alignment: 'center', margin: [0, 15, 0, 8] },
            {
              table: {
                widths: ['*', '*'],
                body: [
                  [{ text: 'Item', style: 'columnsTitle', bold: true }, { text: 'Informação', style: 'columnsTitle', bold: true }],
                  [{ text: 'Mutuário', fontSize: 8 }, { text: cu.customerName || '-', fontSize: 8 }],
                  [{ text: 'Valor do crédito', fontSize: 8 }, { text: formatMoney(amount), fontSize: 8 }],
                  [{ text: 'Prazo', fontSize: 8 }, { text: `${l.numberOfInstallments} meses`, fontSize: 8 }],
                  [{ text: 'Taxa', fontSize: 8 }, { text: `${rate}% ao mês`, fontSize: 8 }],
                  [{ text: 'Finalidade', fontSize: 8 }, { text: borrowerInfo?.finalidade || '-', fontSize: 8 }],
                  [{ text: 'Garantia', fontSize: 8 }, { text: borrowerInfo?.garantia || '-', fontSize: 8 }],
                  [{ text: 'Seguro de vida/crédito', fontSize: 8 }, { text: borrowerInfo?.seguroVida || 'Não', fontSize: 8 }],
                  [{ text: 'Capital seguro', fontSize: 8 }, { text: borrowerInfo?.capitalSeguro || formatMoney(amount), fontSize: 8 }],
                  [{ text: 'Seguro do bem', fontSize: 8 }, { text: borrowerInfo?.seguroBem || 'Não', fontSize: 8 }],
                  [{ text: 'Beneficiário', fontSize: 8 }, { text: borrowerInfo?.beneficiario || `${companyName} até ao saldo devedor`, fontSize: 8 }],
                  [{ text: 'Prestação mensal', fontSize: 8 }, { text: formatMoney(installValue), fontSize: 8 }],
                  [{ text: 'Data do desembolso', fontSize: 8 }, { text: formatDateShort(l.dateCreated), fontSize: 8 }],
                  [{ text: 'Data do vencimento', fontSize: 8 }, { text: lastDue, fontSize: 8 }],
                ],
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#e0e0e0',
                vLineColor: () => '#e0e0e0',
              },
              margin: [0, 0, 0, 15],
            },
          ]
          })(),
        ] : []),
        { text: '\n\n\n' },
        { text: `Maputo, aos ${formatDateShort(l.updatedAt || l.dateCreated)}`, bold: false, fontSize: 8, alignment: 'center' },
        { text: '\n\n\n' },
        {
          alignment: 'center', fontSize: 8,
          columns: [
            { text: `__________________________\n\n${c.companyManager || 'Gestor de Crédito'}\n\n(O MUTUANTE)`, alignment: 'center' },
            {},
            { text: `__________________________\n\n${cu.customerName || ''}\n\n(${convertGender().trim()})`, alignment: 'center' },
          ],
        },
      ],
      styles: { columnsTitle: { fontSize: 8, bold: true, color: '#000000' } },
    }

    const fileName = `Contrato_Concessao_Conta${l.accountNumber || 'N/A'}_${new Date().toISOString().split('T')[0]}.pdf`
    pdfMake.createPdf(docDefinition).open()
    $q.notify({ type: 'positive', message: 'Contrato de Concessão gerado com sucesso', position: 'top' })
  } catch (error) {
    console.error('Erro ao gerar contrato:', error)
    $q.notify({ type: 'negative', message: 'Erro ao gerar contrato: ' + error.message, position: 'top' })
  } finally {
    generatingContract.value = false
  }
}

// ==================== TERMO DE COMPROMISSO ====================
async function generateTerm() {
  generatingTerm.value = true
  try {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default
    if (pdfMake.vfs === undefined) {
      pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts
    }

    const c = company.value || {}
    const cu = customer.value || {}
    const l = loan.value || {}
    const amount = parseFloat(l.amount) || 0

    const logoBase64 = await getLogoBase64()
    const headerElements = buildCompanyHeader(c, logoBase64, 'Termo de Compromisso de Recebimento de Crédito')

    const docDefinition = {
      footer: function(currentPage, pageCount) {
        return {
          columns: [
            { text: 'Documento processado por computador', alignment: 'left', fontSize: 7, margin: [30, 0, 0, 0] },
            { text: `${c.companyName || ''} | Pág. ${currentPage}/${pageCount}`, alignment: 'right', fontSize: 7, margin: [0, 0, 30, 0] },
          ],
        }
      },
      content: [
        ...headerElements,
        {
          text: [
            { text: 'Pelo presente, eu ' },
            { text: cu.customerName || '', bold: true, decoration: 'underline' },
            { text: '\nCidadão(a) moçambicano(a) com o nº do BI ' },
            { text: cu.customerNationalId || '', bold: true },
            { text: ', ' },
            { text: 'declaro que recebi', bold: true },
            { text: ' na data de hoje, o valor de ' },
            { text: `${formatMoney(amount)} (${numberToWords(amount)} meticais)`, bold: true },
            { text: ', em:' },
          ],
          fontSize: 10, alignment: 'justify', lineHeight: 1.6,
        },
        { text: ' ' },
        { text: [{ text: 'Cheque (________)    Numerário (________)    Transferência (________)', fontSize: 10 }], alignment: 'left', margin: [0, 0, 0, 6] },
        { text: [{ text: ' da ' }, { text: c.companyName || 'MBR Microcrédito', bold: true }, { text: '.' }], fontSize: 10, alignment: 'justify' },
        { text: '\n\n' },
        { text: 'Sendo expressão da verdade e sem qualquer coação, firmo presente.', fontSize: 10, alignment: 'justify' },
        { text: '\n\n' },
        { text: `Mukhatine, ${formatDateShort(l.updatedAt || l.dateCreated)}`, fontSize: 10, alignment: 'center' },
        { text: '\n\n\n\n' },
        { text: '……………………………………………………………………………………', fontSize: 10, alignment: 'center' },
        { text: `(${cu.customerName || ''})`, fontSize: 9, alignment: 'center', bold: true },
      ],
    }

    pdfMake.createPdf(docDefinition).open()
    $q.notify({ type: 'positive', message: 'Termo de Compromisso gerado com sucesso', position: 'top' })
  } catch (error) {
    console.error('Erro ao gerar termo:', error)
    $q.notify({ type: 'negative', message: 'Erro ao gerar termo: ' + error.message, position: 'top' })
  } finally {
    generatingTerm.value = false
  }
}

// ==================== DECLARAÇÃO DE GARANTIAS ====================
async function generateGuarantees() {
  generatingGuarantees.value = true
  try {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default
    if (pdfMake.vfs === undefined) {
      pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts
    }

    const c = company.value || {}
    const cu = customer.value || {}
    const l = loan.value || {}
    const amount = parseFloat(l.amount) || 0
    const rate = (l.interestRate * 100).toFixed(1)
    const totalWithInterest = amount + (amount * l.interestRate * l.numberOfInstallments)

    // Build guarantees table
    const guarRows = guarantees.value.map((g, idx) => [
      { text: `${idx + 1}`, fontSize: 8, alignment: 'center' },
      { text: g.guaranteeDescription || g.description || '--', fontSize: 8 },
      { text: formatDateShort(g.createdAt || g.dateCreated), fontSize: 8 },
      { text: formatMoney(g.purchaseAmount || g.purchaseValue || 0), fontSize: 8, alignment: 'right' },
    ])

    const totalGuaranteeAmount = guarantees.value.reduce((sum, g) => sum + parseFloat(g.purchaseAmount || g.purchaseValue || 0), 0)

    const logoBase64 = await getLogoBase64()
    const headerElements = buildCompanyHeader(c, logoBase64, 'Declaração de Garantias')

    const docDefinition = {
      footer: function(currentPage, pageCount) {
        return {
          columns: [
            { text: 'Documento processado por computador', alignment: 'left', fontSize: 7, margin: [30, 0, 0, 0] },
            { text: `${c.companyName || ''} | Pág. ${currentPage}/${pageCount}`, alignment: 'right', fontSize: 7, margin: [0, 0, 30, 0] },
          ],
        }
      },
      content: [
        ...headerElements,
        { text: '\n' },
        { text: '1. Dados cliente', fontSize: 9, bold: true },
        { text: '\n' },
        { text: `${convertGenderLabel().toUpperCase()}: ${(cu.customerName || '').toUpperCase()}`, fontSize: 8, bold: true },
        { text: `Nº do cliente: ${cu.accountNumber || ''}`, fontSize: 8 },
        { text: `Morada: ${cu.customerAddress || ''}`, fontSize: 8 },
        { text: `Telemóvel: +${cu.customerPhone || ''}`, fontSize: 8 },
        { text: `NUIT: ${cu.customerNuit || ''}`, fontSize: 8 },
        { text: '\n' },
        { text: '2. Bens de garantia', fontSize: 9, bold: true },
        {
          table: {
            widths: ['auto', '*', '*', 'auto'],
            body: [
              [
                { text: '#', style: 'columnsTitle' },
                { text: 'Descrição', style: 'columnsTitle' },
                { text: 'Data de submissão', style: 'columnsTitle' },
                { text: 'Avaliação (MT)', style: 'columnsTitle' },
              ],
              ...guarRows,
            ],
          },
          layout: 'lightHorizontalLines',
        },
        { text: '\n\n' },
        { text: `Valor total dos bens para garantia ${formatMoney(totalGuaranteeAmount)} (${numberToWords(totalGuaranteeAmount)} meticais)`, fontSize: 9, bold: true },
        { text: '\n' },
        { text: `E por ser verdade, certifico que todas as informações por mim prestadas ao Gestor de Crédito, bem como os bens acima descritos, servem de garantia para a satisfação da obrigação prevista no contrato de concessão de empréstimo celebrado com a ${c.companyName || ''}`, fontSize: 9 },
        { text: '\n\n\n' },
        { text: `Maputo, aos ${formatDateShort(l.updatedAt || l.dateCreated)}`, bold: false, fontSize: 8, alignment: 'center' },
        { text: '\n\n\n' },
        {
          alignment: 'center', fontSize: 8,
          columns: [
            { text: `__________________________\n\n${authStore.userName || 'Gestor de Crédito'}\n\n(GESTOR DE CRÉDITO)` },
            { text: `__________________________\n\n${cu.customerName || ''}\n\n(${convertGenderLabel().toUpperCase()} ${convertGender().toUpperCase()})` },
          ],
        },
      ],
      styles: { columnsTitle: { fontSize: 8, bold: true, color: '#000000' } },
    }

    pdfMake.createPdf(docDefinition).open()
    $q.notify({ type: 'positive', message: 'Declaração de Garantias gerada com sucesso', position: 'top' })
  } catch (error) {
    console.error('Erro ao gerar declaração:', error)
    $q.notify({ type: 'negative', message: 'Erro ao gerar declaração: ' + error.message, position: 'top' })
  } finally {
    generatingGuarantees.value = false
  }
}

onMounted(async () => {
  const loanId = route.params.id
  if (!loanId) {
    loading.value = false
    return
  }

  try {
    const companyId = authStore.companyId

    // Fetch company FIRST to ensure logo is available
    await companyStore.fetchCompany(companyId)
    company.value = companyStore.company

    // Fetch loan
    await loansStore.fetchLoan(loanId, companyId)
    loan.value = loansStore.currentLoan

    if (!loan.value) {
      $q.notify({ type: 'negative', message: 'Crédito não encontrado', position: 'top' })
      loading.value = false
      return
    }

    // Fetch customer
    if (loan.value.accountNumber) {
      const { data } = await (await import('@/boot/axios')).api.get(`/api/customer/${loan.value.accountNumber}`)
      if (data.success) {
        customer.value = Array.isArray(data.result) ? data.result[0] : data.result
      }
    }

    // Fetch guarantees
    try {
      const { data } = await (await import('@/boot/axios')).api.get(`/api/getLoanGuarantees/${loanId}`)
      if (data.success) {
        guarantees.value = data.result || []
      }
    } catch { guarantees.value = [] }

    // Fetch accounts
    try {
      const { data } = await (await import('@/boot/axios')).api.get(`/api/accounts/${companyId}`)
      if (data.success) {
        accounts.value = data.result || []
      }
    } catch { accounts.value = [] }

    // Fetch amortization
    try {
      const forfeit = company.value?.forfeit || 0.1
      await loansStore.fetchAmortization(loanId, forfeit)
      amortization.value = loansStore.amortization || []
    } catch { amortization.value = [] }

    // Fetch credit documents
    await fetchCreditDocuments()

  } catch (error) {
    console.error('Erro ao carregar dados:', error)
    $q.notify({ type: 'negative', message: 'Erro ao carregar dados do crédito', position: 'top' })
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.document-card {
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}
</style>
