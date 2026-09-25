<template>
  <div class="q-pa-md">
    <!-- Estado geral do KYC -->
    <q-banner :class="store.isKycComplete ? 'bg-green-1 text-green-10' : 'bg-orange-1 text-orange-10'" rounded class="q-mb-md">
      <template v-slot:avatar>
        <q-icon :name="store.isKycComplete ? 'verified' : 'gpp_maybe'" :color="store.isKycComplete ? 'positive' : 'orange'" size="28px" />
      </template>
      <div class="text-weight-bold">
        {{ store.isKycComplete ? 'KYC completo — desembolso habilitado' : 'KYC incompleto — desembolso bloqueado' }}
      </div>
      <div class="text-caption" v-if="!store.isKycComplete">
        Documentos base em falta: <strong>{{ store.kycMissing.join(', ') }}</strong>
      </div>
    </q-banner>

    <!-- CHECKLIST FIXA: BI, NUIT, Comprovativo, Declaração Bairro, Foto, Contrato -->
    <div class="row q-col-gutter-md">
      <div class="col-12 col-sm-6 col-md-4" v-for="item in checklistItems" :key="item.name">
        <q-card flat bordered :style="{ borderRadius: '12px', borderColor: item.uploaded ? '#a5d6a7' : undefined }">
          <q-card-section class="row items-center no-wrap">
            <q-icon
              :name="item.uploaded ? 'check_circle' : 'radio_button_unchecked'"
              :color="item.uploaded ? 'positive' : 'grey-5'"
              size="28px"
              class="q-mr-sm"
            />
            <div class="col">
              <div class="text-weight-medium" style="font-size: 13px">{{ item.name }}</div>
              <div class="text-caption text-grey-5">
                {{ item.uploaded ? `Enviado em ${formatDate(item.uploadedAt)}` : 'Obrigatório para desembolso' }}
              </div>
            </div>
            <q-chip :color="item.required ? (item.uploaded ? 'positive' : 'negative') : 'grey-6'" text-color="white" dense>
              {{ item.required ? (item.uploaded ? 'OK' : 'Falta') : 'Extra' }}
            </q-chip>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-separator class="q-my-md" />

    <!-- UPLOAD (QUploader ligado ao POST /api/document via store) -->
    <q-card flat bordered style="border-radius: 12px">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-sm">
          <q-icon name="cloud_upload" size="18px" class="q-mr-xs" />Carregar documento
        </div>
        <div class="row q-col-gutter-sm items-end">
          <div class="col-12 col-sm-5">
            <q-select v-model="uploadForm.documentName" dense outlined :options="documentTypeOptions" label="Tipo de documento *" :rules="[val => !!val || 'Escolha o tipo']" />
          </div>
          <div class="col-12 col-sm-5">
            <q-file v-model="uploadForm.file" dense outlined label="Ficheiro (JPG, PNG ou PDF · máx 5MB) *" accept=".pdf,.jpg,.jpeg,.png" :rules="[val => !!val || 'Escolha o ficheiro']">
              <template v-slot:prepend><q-icon name="attach_file" size="16px" /></template>
            </q-file>
          </div>
          <div class="col-12 col-sm-2">
            <q-btn unelevated color="primary" icon="cloud_upload" label="Enviar" class="full-width" no-caps rounded size="sm" :loading="uploading" :disable="!uploadForm.documentName || !uploadForm.file" @click="uploadDocument" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Documentos enviados -->
    <q-card flat bordered class="q-mt-md" style="border-radius: 12px">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="text-subtitle2 text-weight-bold">
            <q-icon name="folder" size="18px" class="q-mr-xs" />Documentos enviados
          </div>
          <q-space />
          <q-badge color="grey-6" rounded>{{ store.kycDocuments.length }} ficheiro(s)</q-badge>
        </div>

        <q-table
          class="gt-xs"
          :rows="store.kycDocuments" :columns="docColumns"
          row-key="id" flat dense hide-bottom :rows-per-page-options="[0]"
          style="font-size: 12px"
        >
          <template v-slot:body-cell-documentName="props">
            <q-td :props="props">
              <div class="row items-center">
                <q-icon name="description" color="primary" size="18px" class="q-mr-sm" />
                <span>{{ props.row.documentName }}</span>
                <q-badge v-if="isBaseDoc(props.row.documentName)" color="teal" outline rounded class="q-ml-sm" style="font-size: 9px">Base</q-badge>
              </div>
            </q-td>
          </template>
          <template v-slot:body-cell-createdAt="props">
            <q-td :props="props">{{ props.row.createdAt ? formatDate(props.row.createdAt) : '—' }}</q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense icon="open_in_new" size="xs" color="grey" @click="openDocument(props.row)">
                <q-tooltip>Abrir</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="delete" size="xs" color="negative" @click="removeDocument(props.row)">
                <q-tooltip>Eliminar</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <!-- Mobile: cartões -->
        <div class="lt-sm">
          <q-card v-for="doc in store.kycDocuments" :key="doc.id" flat bordered class="q-mb-sm" style="border-radius: 12px">
            <q-card-section class="row items-center">
              <q-icon name="description" color="primary" size="22px" class="q-mr-sm" />
              <div class="col">
                <div class="text-weight-medium" style="font-size: 13px">{{ doc.documentName }}</div>
                <div class="text-caption text-grey-5">{{ formatDate(doc.createdAt) }}</div>
              </div>
              <q-btn flat round dense icon="open_in_new" size="sm" @click="openDocument(doc)" />
              <q-btn flat round dense icon="delete" size="sm" color="negative" @click="removeDocument(doc)" />
            </q-card-section>
          </q-card>
        </div>

        <div v-if="store.kycDocuments.length === 0 && !store.kycLoading" class="text-center q-pa-lg text-grey-5">
          <q-icon name="folder_open" size="48px" />
          <div class="text-caption q-mt-sm">Nenhum documento registado</div>
        </div>
        <div v-if="store.kycLoading" class="text-center q-pa-md">
          <q-skeleton type="rect" class="q-mb-sm" />
          <q-skeleton type="rect" />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useMutuarioStore } from '@/stores/mutuario'
import { useAuthStore } from '@/stores/auth'
import { toCanonicalDocumentName } from '@/utils/kycShared'

const $q = useQuasar()
const store = useMutuarioStore()
const authStore = useAuthStore()

const uploading = ref(false)
const uploadForm = ref({ documentName: null, file: null })

// Checklist fixa de 6 documentos — os 3 primeiros são BASE (bloqueiam desembolso)
const documentTypeOptions = [
  'BI / Passaporte / Carta de condução',
  'NUIT',
  'Comprovativo de rendimentos',
  'Declaração do bairro',
  'Foto tipo passe',
  'Contrato autenticado'
]
const BASE_DOCS = ['BI / Passaporte / Carta de condução', 'NUIT', 'Comprovativo de rendimentos']

const checklistItems = computed(() => {
  const map = new Map()
  for (const doc of store.kycDocuments) {
    const canonical = toCanonicalDocumentName(doc.documentName)
    if (canonical && !map.has(canonical)) {
      map.set(canonical, { name: canonical, uploaded: true, uploadedAt: doc.createdAt, required: BASE_DOCS.includes(canonical) })
    }
  }
  return documentTypeOptions.map(name => {
    const found = map.get(name)
    if (found) return found
    const isBase = BASE_DOCS.some(base => {
      const canonicalBase = toCanonicalDocumentName(base)
      return store.kycMissing.some(m => toCanonicalDocumentName(m) === canonicalBase) && toCanonicalDocumentName(name) === canonicalBase
    })
    return { name, uploaded: false, uploadedAt: null, required: BASE_DOCS.includes(name) || isBase }
  })
})

const docColumns = [
  { name: 'documentName', label: 'Documento', field: 'documentName', align: 'left' },
  { name: 'createdAt', label: 'Data', field: 'createdAt', align: 'left' },
  { name: 'uploadedBy', label: 'Enviado por', field: 'uploadedBy', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'center' }
]

function isBaseDoc(name) {
  const canonical = toCanonicalDocumentName(name)
  return BASE_DOCS.some(base => toCanonicalDocumentName(base) === canonical)
}

function formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleDateString('pt-MZ') : '—' }
function openDocument(doc) { if (doc.documentFileUrl) window.open(doc.documentFileUrl, '_blank') }

async function uploadDocument() {
  if (!uploadForm.value.documentName || !uploadForm.value.file) return
  // Validação client-side: 5MB e formato (o multer também valida)
  const file = uploadForm.value.file
  if (file.size > 5 * 1024 * 1024) {
    $q.notify({ type: 'negative', message: 'Ficheiro excede 5MB', position: 'top' })
    return
  }
  uploading.value = true
  try {
    await store.uploadDocument({
      file,
      documentName: uploadForm.value.documentName,
      uploadedBy: authStore.userName || 'Sistema'
    })
    $q.notify({ type: 'positive', message: 'Documento salvo — checklist actualizada', position: 'top' })
    uploadForm.value = { documentName: null, file: null }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro ao salvar documento', position: 'top' })
  } finally {
    uploading.value = false
  }
}

function removeDocument(doc) {
  $q.dialog({
    title: 'Confirmar',
    message: `Eliminar o documento "${doc.documentName}"? Isto pode tornar o KYC incompleto.`,
    cancel: 'Não',
    ok: { label: 'Sim, eliminar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      await store.deleteDocument(doc.id)
      $q.notify({ type: 'positive', message: 'Documento eliminado', position: 'top' })
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Erro ao eliminar', position: 'top' })
    }
  })
}
</script>
