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
import { api } from '@/boot/axios'

/**
 * DOCUMENTOS LEGAIS DO CRÉDITO — PDF GERADO NO BACKEND (REGRA FISCAL).
 * Os geradores de PDF do browser foram REMOVIDOS: o layout oficial
 * (Contrato, Termo, Garantias, Extracto) vive em services/legalDocsService.ts
 * (pdfkit) e é servido por GET /api/loans/:loanId/documents/:tipo/pdf.
 * O frontend consome o PDF via axios (token de sessão) e abre em nova aba.
 */

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

// ==================== GERADORES (BACKEND) ====================
// Abre o PDF oficial do backend em nova aba (blob → token de sessão incluído).
async function openLegalDoc(tipo, loadingRef) {
  if (!loan.value?.id) return
  loadingRef.value = true
  try {
    const { data } = await api.get(`/api/loans/${loan.value.id}/documents/${tipo}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    window.open(url, '_blank')
    setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  } finally {
    loadingRef.value = false
  }
}

async function generateContract() {
  try {
    await openLegalDoc('contrato', generatingContract)
    $q.notify({ type: 'positive', message: 'Contrato de Concessão gerado com sucesso', position: 'top' })
  } catch (error) {
    console.error('Erro ao gerar contrato:', error)
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao gerar contrato', position: 'top' })
  }
}

async function generateTerm() {
  try {
    await openLegalDoc('termo', generatingTerm)
    $q.notify({ type: 'positive', message: 'Termo de Compromisso gerado com sucesso', position: 'top' })
  } catch (error) {
    console.error('Erro ao gerar termo:', error)
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao gerar termo', position: 'top' })
  }
}

async function generateGuarantees() {
  try {
    await openLegalDoc('garantias', generatingGuarantees)
    $q.notify({ type: 'positive', message: 'Declaração de Garantias gerada com sucesso', position: 'top' })
  } catch (error) {
    console.error('Erro ao gerar declaração:', error)
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao gerar declaração', position: 'top' })
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
      const { data } = await api.get(`/api/customer/${loan.value.accountNumber}`)
      if (data.success) {
        customer.value = Array.isArray(data.result) ? data.result[0] : data.result
      }
    }

    // Fetch guarantees
    try {
      const { data } = await api.get(`/api/getLoanGuarantees/${loanId}`)
      if (data.success) {
        guarantees.value = data.result || []
      }
    } catch { guarantees.value = [] }

    // Fetch accounts
    try {
      const { data } = await api.get(`/api/accounts/${companyId}`)
      if (data.success) {
        accounts.value = data.result || []
      }
    } catch { accounts.value = [] }

    // Fetch amortization
    try {
      await loansStore.fetchAmortization(loanId)
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
