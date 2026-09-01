<template>
  <q-dialog v-model="show" persistent maximized>
    <q-card style="border-radius: 16px; max-width: 700px; margin: auto">
      <q-card-section class="bg-primary text-white row items-center" style="border-radius: 16px 16px 0 0">
        <q-icon name="folder" size="24px" class="q-mr-sm" />
        <div class="text-h6">Documentos</div>
        <div class="text-caption q-ml-sm" style="opacity: 0.8">Conta #{{ accountNumber }}</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- Upload Form -->
        <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-md">
              <q-icon name="cloud_upload" size="16px" class="q-mr-xs" />
              Adicionar Documento
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="form.documentName"
                  dense
                  outlined
                  :options="documentTypes"
                  label="Tipo de documento *"
                  input-style="font-size: 13px"
                >
                  <template v-slot:prepend><q-icon name="description" size="16px" color="grey-5" /></template>
                </q-select>
              </div>
              <div class="col-12 col-sm-6">
                <q-file
                  v-model="form.file"
                  dense
                  outlined
                  label="Selecionar ficheiro *"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  input-style="font-size: 13px"
                >
                  <template v-slot:prepend><q-icon name="attach_file" size="16px" color="grey-5" /></template>
                </q-file>
              </div>
            </div>

            <!-- Upload Progress -->
            <q-linear-progress
              v-if="uploading"
              :value="uploadProgress / 100"
              color="primary"
              class="q-mt-sm"
            />

            <div class="row justify-end q-mt-sm">
              <q-btn
                color="primary"
                icon="cloud_upload"
                label="Salvar"
                unelevated
                rounded
                size="sm"
                no-caps
                :loading="uploading"
                :disable="!form.documentName || !form.file"
                @click="uploadDocument"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Documents List -->
        <q-card flat bordered style="border-radius: 12px">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-subtitle2 text-weight-bold">
                <q-icon name="list" size="16px" class="q-mr-xs" />
                Documentos Submetidos
              </div>
              <q-space />
              <q-badge color="grey">{{ documents.length }}</q-badge>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="text-center q-pa-md">
              <q-spinner-dots size="30px" color="primary" />
            </div>

            <!-- Empty State -->
            <div v-else-if="documents.length === 0" class="text-center q-pa-lg">
              <q-icon name="folder_open" size="40px" color="grey-4" />
              <div class="text-caption text-grey-5 q-mt-sm">Nenhum documento submetido</div>
            </div>

            <!-- Documents List -->
            <q-list v-else separator>
              <q-item v-for="doc in documents" :key="doc.id" class="doc-item">
                <q-item-section avatar>
                  <q-avatar :color="getDocColor(doc.documentName)" text-color="white" size="36px">
                    <q-icon :name="getDocIcon(doc.documentName)" size="18px" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium" style="font-size: 13px">
                    {{ doc.documentName }}
                  </q-item-label>
                  <q-item-label caption style="font-size: 11px">
                    {{ doc.createdAt ? `Submetido em ${formatDate(doc.createdAt)}` : 'Data indisponível' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-xs">
                    <q-btn
                      flat
                      round
                      dense
                      icon="visibility"
                      size="sm"
                      color="primary"
                      @click="viewDocument(doc)"
                    >
                      <q-tooltip>Ver documento</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      size="sm"
                      color="negative"
                      @click="confirmDelete(doc)"
                    >
                      <q-tooltip>Eliminar</q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useDocumentsStore } from '@/stores/documents'
import { logUploadDocument, logDeleteDocument } from '@/utils/logger'

const $q = useQuasar()
const authStore = useAuthStore()
const documentsStore = useDocumentsStore()

const props = defineProps({
  modelValue: Boolean,
  accountNumber: [String, Number]
})

const emit = defineEmits(['update:modelValue'])

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = computed(() => documentsStore.loading)
const uploading = computed(() => documentsStore.uploading)
const uploadProgress = computed(() => documentsStore.uploadProgress)
const documents = computed(() => documentsStore.documents)

const form = ref({
  documentName: null,
  file: null
})

const documentTypes = [
  'BI / Passaporte / Carta de condução',
  'NUIT',
  'Alvará',
  'Declaração do bairro',
  'Contrato autenticado',
  'Comprovativo de rendimentos',
  'Outro'
]

watch(show, (val) => {
  if (val && props.accountNumber) {
    documentsStore.fetchDocuments(props.accountNumber)
  }
})

function getDocColor(name) {
  if (!name) return 'grey'
  if (name.includes('BI') || name.includes('Passaporte')) return 'blue'
  if (name.includes('NUIT')) return 'purple'
  if (name.includes('Contrato')) return 'green'
  if (name.includes('Rendimento') || name.includes('Comprovativo')) return 'teal'
  return 'orange'
}

function getDocIcon(name) {
  if (!name) return 'description'
  if (name.includes('BI') || name.includes('Passaporte')) return 'badge'
  if (name.includes('NUIT')) return 'pin'
  if (name.includes('Contrato')) return 'gavel'
  if (name.includes('Rendimento') || name.includes('Comprovativo')) return 'receipt'
  return 'description'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('pt-MZ')
}

async function uploadDocument() {
  if (!form.value.documentName || !form.value.file) return

  const formData = new FormData()
  formData.append('file', form.value.file)
  formData.append('companyId', authStore.companyId)
  formData.append('accountNumber', props.accountNumber)
  formData.append('documentName', form.value.documentName)
  formData.append('uploadedBy', authStore.userName)

  try {
    await documentsStore.uploadDocument(formData)
    logUploadDocument(form.value.documentName, props.accountNumber)
    $q.notify({ type: 'positive', message: 'Documento submetido com sucesso', position: 'top' })
    form.value = { documentName: null, file: null }
    await documentsStore.fetchDocuments(props.accountNumber)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao submeter documento', position: 'top' })
  }
}

function viewDocument(doc) {
  if (doc.documentFileUrl) {
    window.open(doc.documentFileUrl, '_blank')
  }
}

function confirmDelete(doc) {
  $q.dialog({
    title: 'Eliminar Documento',
    message: `Tem certeza que deseja eliminar "${doc.documentName}"?`,
    cancel: 'Não',
    ok: { label: 'Sim, eliminar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      await documentsStore.deleteDocument(doc.id)
      logDeleteDocument(doc.documentName, props.accountNumber)
      $q.notify({ type: 'positive', message: 'Documento eliminado', position: 'top' })
      await documentsStore.fetchDocuments(props.accountNumber)
    } catch {
      $q.notify({ type: 'negative', message: 'Erro ao eliminar', position: 'top' })
    }
  })
}

function close() {
  show.value = false
}
</script>

<style lang="scss" scoped>
.doc-item {
  border-radius: 8px;
  margin-bottom: 4px;

  &:hover {
    background: rgba(0, 0, 0, 0.03);
  }
}

body.body--dark .doc-item:hover {
  background: rgba(255, 255, 255, 0.03);
}
</style>
