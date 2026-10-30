<template>
  <div class="kyc-page">
    <!-- ══════════ 1. BLOQUEADOR / ALERTA DO TOPO ══════════ -->
    <section v-if="!store.isKycComplete" class="kyc-banner-blocker q-mb-lg">
      <div class="row items-center q-col-gutter-lg">
        <div class="col-12 col-md-7 row items-start no-wrap">
          <q-avatar size="52px" class="kyc-banner-icon q-mr-md shadow-1">
            <q-icon name="lock" size="28px" />
          </q-avatar>
          <div class="col">
            <div class="kyc-banner-tag">Exigência Regulatória Banco de Moçambique</div>
            <div class="kyc-banner-title">Desembolso bloqueado</div>
            <div class="kyc-banner-subtitle">
              Falta {{ missingRequiredCount }} documento obrigatório:
              <strong>{{ missingRequiredNames }}</strong>
            </div>
            <div class="text-caption text-grey-7 q-mt-xs">
              Nenhum crédito deste mutuário pode ser aprovado ou desembolsado até a regularização integral dos documentos base.
            </div>
          </div>
        </div>

        <div class="col-12 col-md-5">
          <div class="kyc-progress-box">
            <div class="row items-center justify-between q-mb-xs">
              <span class="text-weight-bold text-grey-8" style="font-size: 13px">
                Progresso dos Documentos Base
              </span>
              <span class="text-weight-bolder text-negative" style="font-size: 14px">
                {{ completedRequiredCount }} de {{ totalRequiredCount }} concluídos ({{ requiredProgressPct }}%)
              </span>
            </div>
            <q-linear-progress
              :value="requiredProgressPct / 100"
              rounded
              size="12px"
              :color="requiredProgressPct === 100 ? 'positive' : 'negative'"
              track-color="grey-3"
            />
            <div class="text-caption text-grey-6 q-mt-xs text-right" style="font-size: 11px">
              Restante: <strong>{{ missingRequiredCount }} documento(s)</strong> para desbloquear a concessão
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Banner de Sucesso quando KYC 100% completo -->
    <section v-else class="kyc-banner-success q-mb-lg">
      <div class="row items-center q-gutter-md">
        <q-avatar size="48px" color="positive" text-color="white" class="shadow-1">
          <q-icon name="verified" size="26px" />
        </q-avatar>
        <div class="col">
          <div class="text-subtitle1 text-weight-bold text-positive">
            Dossier KYC regularizado — Desembolso habilitado
          </div>
          <div class="text-caption text-grey-8">
            Todos os 3 documentos regulamentares foram enviados e validados. O mutuário está apto a receber crédito.
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════ 2. CHECKLIST HIERÁRQUICA ══════════ -->
    <!-- LINHA 1: DOCUMENTOS OBRIGATÓRIOS PARA DESEMBOLSO -->
    <div class="checklist-section q-mb-lg">
      <div class="row items-center justify-between q-mb-sm">
        <div class="section-title">
          <q-icon name="verified_user" size="18px" color="primary" class="q-mr-xs" />
          Obrigatórios para desembolso
          <span class="text-caption text-weight-normal text-grey-6 q-ml-sm">
            (Exigência legal do Banco de Moçambique)
          </span>
        </div>
        <q-badge
          :color="missingRequiredCount === 0 ? 'positive' : 'negative'"
          rounded
          class="text-weight-bold"
        >
          {{ missingRequiredCount === 0 ? 'Todos validados' : `Falta ${missingRequiredCount}` }}
        </q-badge>
      </div>

      <div class="row q-col-gutter-md">
        <div
          v-for="item in requiredChecklist"
          :key="item.name"
          class="col-12 col-md-4"
        >
          <!-- Card de documento que FALTA (2x mais destacado) -->
          <div
            v-if="!item.uploaded"
            class="doc-card doc-card--missing"
          >
            <div class="row items-start no-wrap">
              <q-avatar size="36px" color="red-1" text-color="negative" class="q-mr-sm">
                <q-icon name="error" size="22px" />
              </q-avatar>
              <div class="col">
                <div class="row items-center justify-between no-wrap">
                  <div class="doc-card__title text-negative">{{ item.name }}</div>
                  <q-badge color="negative" label="Falta" rounded class="text-weight-bold" />
                </div>
                <div class="doc-card__hint text-negative q-mt-xs">
                  Obrigatório para desembolso do crédito
                </div>
              </div>
            </div>

            <q-btn
              unelevated
              no-caps
              color="negative"
              icon="cloud_upload"
              label="Carregar agora"
              class="full-width q-mt-md doc-card__cta"
              @click="selectDocForUpload(item.name)"
            />
          </div>

          <!-- Card de documento OK (Verde e limpo) -->
          <div
            v-else
            class="doc-card doc-card--ok"
          >
            <div class="row items-start no-wrap">
              <q-avatar size="36px" color="green-1" text-color="positive" class="q-mr-sm">
                <q-icon name="check_circle" size="22px" />
              </q-avatar>
              <div class="col">
                <div class="row items-center justify-between no-wrap">
                  <div class="doc-card__title text-green-10">{{ item.name }}</div>
                  <q-badge color="positive" label="OK" rounded class="text-weight-bold" />
                </div>
                <div class="doc-card__hint text-grey-7 q-mt-xs">
                  Enviado em {{ formatDate(item.uploadedAt) }}
                </div>
              </div>
            </div>
            <div class="row items-center justify-between q-mt-md q-pt-sm" style="border-top: 1px solid #dcfce7">
              <span class="text-caption text-positive text-weight-bold">
                <q-icon name="task_alt" size="14px" /> Validado no dossier
              </span>
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="primary"
                label="Substituir"
                icon="refresh"
                @click="selectDocForUpload(item.name)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- LINHA 2: DOCUMENTOS EXTRAS (Visual discreto, cinza claro) -->
    <div class="checklist-section q-mb-lg">
      <div class="section-title q-mb-sm">
        <q-icon name="post_add" size="18px" color="grey-7" class="q-mr-xs" />
        Documentos complementares / extras
        <span class="text-caption text-weight-normal text-grey-6 q-ml-sm">
          (Apoio à análise cadastral e conformidade)
        </span>
      </div>

      <div class="row q-col-gutter-md">
        <div
          v-for="item in extraChecklist"
          :key="item.name"
          class="col-12 col-sm-6 col-md-4"
        >
          <div class="doc-card doc-card--extra" :class="{ 'is-uploaded': item.uploaded }">
            <div class="row items-center no-wrap">
              <q-icon
                :name="item.uploaded ? 'check_circle' : 'radio_button_unchecked'"
                :color="item.uploaded ? 'teal-7' : 'grey-5'"
                size="24px"
                class="q-mr-sm"
              />
              <div class="col">
                <div class="text-weight-bold text-grey-9" style="font-size: 13px">{{ item.name }}</div>
                <div class="text-caption text-grey-5">
                  {{ item.uploaded ? `Enviado em ${formatDate(item.uploadedAt)}` : 'Documento facultativo' }}
                </div>
              </div>
              <q-btn
                v-if="!item.uploaded"
                flat
                dense
                no-caps
                size="sm"
                color="primary"
                label="Adicionar"
                icon="add"
                @click="selectDocForUpload(item.name)"
              />
              <q-badge v-else color="grey-3" text-color="grey-8" label="Extra" rounded />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ 3. FORMULÁRIO DE UPLOAD CONECTADO ══════════ -->
    <div ref="uploadSectionRef" class="upload-box-card q-mb-lg">
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center no-wrap">
          <q-avatar size="36px" color="primary" text-color="white" class="q-mr-sm">
            <q-icon name="cloud_upload" size="20px" />
          </q-avatar>
          <div>
            <div class="text-subtitle2 text-weight-bold text-slate-800">
              Carregar Documento ao Dossier
            </div>
            <div class="text-caption text-grey-6">
              O documento anexado actualiza imediatamente o estado do dossier de desembolso.
            </div>
          </div>
        </div>

        <q-chip
          v-if="uploadForm.documentName"
          dense
          color="green-1"
          text-color="positive"
          icon="check"
          class="text-weight-bold"
        >
          Selecionado: {{ uploadForm.documentName }}
        </q-chip>
      </div>

      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-5">
          <q-select
            v-model="uploadForm.documentName"
            dense
            outlined
            :options="documentTypeOptions"
            label="Tipo de documento *"
            placeholder="Selecione o documento..."
            :rules="[val => !!val || 'Escolha o tipo de documento']"
          >
            <template v-slot:prepend>
              <q-icon name="description" size="18px" color="primary" />
            </template>
          </q-select>
        </div>

        <div class="col-12 col-md-5">
          <q-file
            v-model="uploadForm.file"
            dense
            outlined
            label="Ficheiro (JPG, PNG ou PDF · máx. 5MB) *"
            accept=".pdf,.jpg,.jpeg,.png"
            :rules="[val => !!val || 'Selecione o ficheiro do computador']"
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" size="18px" color="primary" />
            </template>
          </q-file>
        </div>

        <div class="col-12 col-md-2">
          <!-- Botão ENVIAR grande e verde -->
          <q-btn
            unelevated
            no-caps
            color="positive"
            icon="cloud_upload"
            label="Enviar"
            class="full-width upload-submit-btn text-weight-bold"
            :loading="uploading"
            :disable="!uploadForm.documentName || !uploadForm.file"
            @click="uploadDocument"
          />
        </div>
      </div>
    </div>

    <!-- ══════════ 4. TABELA DE DOCUMENTOS ENVIADOS ══════════ -->
    <div class="table-card">
      <div class="row items-center justify-between q-pa-md" style="border-bottom: 1px solid #e2e8f0">
        <div class="row items-center no-wrap">
          <q-icon name="folder" size="20px" color="primary" class="q-mr-sm" />
          <span class="text-subtitle2 text-weight-bold text-slate-800">
            Documentos enviados e arquivados
          </span>
        </div>
        <q-badge color="grey-7" rounded class="text-weight-bold">
          {{ store.kycDocuments.length }} ficheiro(s) arquivado(s)
        </q-badge>
      </div>

      <!-- Tabela Desktop -->
      <q-table
        class="gt-xs modern-doc-table"
        :rows="store.kycDocuments"
        :columns="docColumns"
        row-key="id"
        flat
        dense
        hide-bottom
        :rows-per-page-options="[0]"
      >
        <template v-slot:body-cell-documentName="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="32px" color="slate-1" text-color="primary" class="q-mr-sm">
                <q-icon :name="isPdf(props.row) ? 'picture_as_pdf' : 'image'" size="18px" :color="isPdf(props.row) ? 'negative' : 'primary'" />
              </q-avatar>
              <div>
                <span class="text-weight-bold text-slate-900" style="font-size: 13px">
                  {{ props.row.documentName }}
                </span>
                <q-badge
                  v-if="isBaseDoc(props.row.documentName)"
                  color="teal-8"
                  text-color="white"
                  rounded
                  class="q-ml-sm text-weight-bold base-doc-badge"
                >
                  <q-icon name="verified" size="11px" class="q-mr-xs" /> Base Obrigatória
                </q-badge>
              </div>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-createdAt="props">
          <q-td :props="props">
            <span class="text-caption text-grey-7">
              {{ props.row.createdAt ? formatDate(props.row.createdAt) : '—' }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-uploadedBy="props">
          <q-td :props="props">
            <span class="text-caption text-grey-7">
              {{ props.row.uploadedBy || 'Sistema' }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <div class="row items-center justify-end q-gutter-x-xs">
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="primary"
                icon="visibility"
                label="Ver"
                class="doc-action-btn"
                @click="viewDoc(props.row)"
              >
                <q-tooltip>Visualizar documento em tela cheia</q-tooltip>
              </q-btn>

              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="grey-8"
                icon="open_in_new"
                label="Abrir"
                class="doc-action-btn"
                @click="openExternal(props.row)"
              >
                <q-tooltip>Abrir documento em nova aba</q-tooltip>
              </q-btn>

              <q-btn
                flat
                round
                dense
                size="sm"
                color="negative"
                icon="delete"
                class="doc-action-btn"
                @click="removeDocument(props.row)"
              >
                <q-tooltip>Eliminar documento</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>

      <!-- Cartões Mobile -->
      <div class="lt-sm q-pa-sm">
        <div v-for="doc in store.kycDocuments" :key="doc.id" class="doc-mobile-item q-mb-sm">
          <div class="row items-center justify-between no-wrap q-mb-xs">
            <div class="text-weight-bold text-slate-900">{{ doc.documentName }}</div>
            <q-badge v-if="isBaseDoc(doc.documentName)" color="teal" text-color="white" label="Base" rounded />
          </div>
          <div class="text-caption text-grey-6 q-mb-sm">
            Enviado em {{ formatDate(doc.createdAt) }} por {{ doc.uploadedBy || 'Sistema' }}
          </div>
          <div class="row items-center q-gutter-xs">
            <q-btn unelevated dense size="sm" color="primary" icon="visibility" label="Ver" class="col" no-caps @click="viewDoc(doc)" />
            <q-btn outline dense size="sm" color="grey-8" icon="open_in_new" label="Abrir" class="col" no-caps @click="openExternal(doc)" />
            <q-btn flat dense size="sm" color="negative" icon="delete" class="col-auto" @click="removeDocument(doc)" />
          </div>
        </div>
      </div>

      <div v-if="store.kycDocuments.length === 0 && !store.kycLoading" class="text-center q-pa-xl text-grey-5">
        <q-icon name="folder_open" size="48px" />
        <div class="text-caption q-mt-sm">Nenhum documento arquivado até o momento.</div>
      </div>
      <div v-if="store.kycLoading" class="text-center q-pa-md">
        <q-skeleton type="rect" class="q-mb-sm" />
        <q-skeleton type="rect" />
      </div>
    </div>

    <!-- Modal de Pré-visualização -->
    <q-dialog v-model="showPreview">
      <q-card style="min-width: 80vw; max-width: 95vw; height: 85vh; border-radius: 16px" class="column">
        <q-card-section class="row items-center q-pb-none bg-slate-100 text-slate-800">
          <q-icon name="description" color="primary" size="22px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">{{ previewDoc?.documentName }}</div>
          <q-space />
          <q-btn flat round dense icon="open_in_new" color="primary" @click="openExternal(previewDoc)">
            <q-tooltip>Abrir em nova aba</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="col q-pa-none flex flex-center bg-grey-2">
          <iframe
            v-if="isPdf(previewDoc)"
            :src="docUrl(previewDoc)"
            style="width: 100%; height: 100%; border: none"
          />
          <img
            v-else
            :src="docUrl(previewDoc)"
            alt="Documento"
            style="max-width: 100%; max-height: 100%; object-fit: contain"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
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

const uploadSectionRef = ref(null)
const showPreview = ref(false)
const previewDoc = ref(null)

function docUrl(doc) {
  const url = doc?.documentFileUrl || doc?.fileUrl || doc?.url || ''
  if (!url) return ''
  return url.startsWith('http') || url.startsWith('/') ? url : `/documents/${url}`
}

function isPdf(doc) {
  const url = docUrl(doc).toLowerCase()
  return url.endsWith('.pdf') || doc?.documentName?.toLowerCase().endsWith('.pdf')
}

function viewDoc(doc) {
  previewDoc.value = doc
  showPreview.value = true
}

function openExternal(doc) {
  const url = docUrl(doc)
  if (url) window.open(url, '_blank')
}

const uploading = ref(false)
const uploadForm = ref({ documentName: null, file: null })

// Os 3 primeiros são regulamentares do Banco de Moçambique (Bloqueiam desembolso)
const BASE_DOCS = [
  'BI / Passaporte / Carta de condução',
  'NUIT',
  'Comprovativo de rendimentos'
]

const EXTRA_DOCS = [
  'Declaração do bairro',
  'Foto tipo passe',
  'Contrato autenticado'
]

const documentTypeOptions = [...BASE_DOCS, ...EXTRA_DOCS]

// Helper para conectar o clique no card de falta direto com o upload pré-selecionado
function selectDocForUpload(docName) {
  uploadForm.value.documentName = docName
  $q.notify({
    type: 'info',
    message: `Documento "${docName}" pré-selecionado para envio.`,
    position: 'top',
    timeout: 2000
  })
  if (uploadSectionRef.value) {
    uploadSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// Checklist calculada
const allChecklistItems = computed(() => {
  const map = new Map()
  for (const doc of store.kycDocuments) {
    const canonical = toCanonicalDocumentName(doc.documentName)
    if (canonical && !map.has(canonical)) {
      map.set(canonical, {
        name: canonical,
        uploaded: true,
        uploadedAt: doc.createdAt,
        required: BASE_DOCS.includes(canonical)
      })
    }
  }
  return documentTypeOptions.map(name => {
    const found = map.get(name)
    if (found) return found
    const isBase = BASE_DOCS.includes(name)
    return { name, uploaded: false, uploadedAt: null, required: isBase }
  })
})

const requiredChecklist = computed(() =>
  allChecklistItems.value.filter(item => item.required)
)

const extraChecklist = computed(() =>
  allChecklistItems.value.filter(item => !item.required)
)

const totalRequiredCount = computed(() => requiredChecklist.value.length)
const completedRequiredCount = computed(() => requiredChecklist.value.filter(i => i.uploaded).length)
const missingRequiredCount = computed(() => totalRequiredCount.value - completedRequiredCount.value)
const requiredProgressPct = computed(() =>
  totalRequiredCount.value > 0
    ? Math.round((completedRequiredCount.value / totalRequiredCount.value) * 100)
    : 0
)

const missingRequiredNames = computed(() => {
  const missing = requiredChecklist.value.filter(i => !i.uploaded).map(i => i.name)
  return missing.join(', ') || 'Nenhum'
})

const docColumns = [
  { name: 'documentName', label: 'Documento Anexado', field: 'documentName', align: 'left' },
  { name: 'createdAt', label: 'Data de Envio', field: 'createdAt', align: 'left' },
  { name: 'uploadedBy', label: 'Enviado por', field: 'uploadedBy', align: 'left' },
  { name: 'actions', label: 'Ações', field: 'actions', align: 'right' }
]

function isBaseDoc(name) {
  const canonical = toCanonicalDocumentName(name)
  return BASE_DOCS.some(base => toCanonicalDocumentName(base) === canonical)
}

function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString('pt-MZ') : '—'
}

async function uploadDocument() {
  if (!uploadForm.value.documentName || !uploadForm.value.file) return
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
    $q.notify({ type: 'positive', message: 'Documento enviado com sucesso! Dossier actualizado.', position: 'top' })
    uploadForm.value = { documentName: null, file: null }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro ao carregar documento', position: 'top' })
  } finally {
    uploading.value = false
  }
}

function removeDocument(doc) {
  $q.dialog({
    title: 'Confirmar remoção',
    message: `Deseja eliminar o documento "${doc.documentName}"? Caso seja um documento base, o desembolso será bloqueado.`,
    cancel: 'Cancelar',
    ok: { label: 'Eliminar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      await store.deleteDocument(doc.id)
      $q.notify({ type: 'positive', message: 'Documento removido com sucesso', position: 'top' })
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Erro ao remover documento', position: 'top' })
    }
  })
}
</script>

<style lang="scss" scoped>
$ink: #0f172a;
$muted: #64748b;
$line: #e2e8f0;

.kyc-page {
  padding: 20px 20px 96px;
}

// ── BANNER BLOQUEADOR SUPERIOR ──
.kyc-banner-blocker {
  background: #fff7ed;
  border: 1.5px solid #fdba74;
  border-left: 6px solid #c2410c;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 4px 18px rgba(194, 65, 12, 0.09);
}

.kyc-banner-icon {
  background: #c2410c;
  color: #ffffff;
}

.kyc-banner-tag {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #c2410c;
}

.kyc-banner-title {
  font-size: 20px;
  font-weight: 900;
  color: #7c2d12;
  letter-spacing: -0.4px;
  margin: 2px 0;
}

.kyc-banner-subtitle {
  font-size: 14px;
  color: #9a3412;
}

.kyc-progress-box {
  background: #ffffff;
  border: 1px solid #fed7aa;
  border-radius: 14px;
  padding: 14px 16px;
}

.kyc-banner-success {
  background: #f0fdf4;
  border: 1.5px solid #86efac;
  border-left: 6px solid #16a34a;
  border-radius: 16px;
  padding: 18px 22px;
}

// ── SEÇÕES & CHECKLIST ──
.section-title {
  font-size: 15px;
  font-weight: 800;
  color: $ink;
  display: flex;
  align-items: center;
}

.doc-card {
  border-radius: 14px;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.25s ease;

  &__title {
    font-size: 14px;
    font-weight: 800;
    line-height: 1.3;
  }
  &__hint {
    font-size: 12px;
    line-height: 1.35;
  }
  &__cta {
    height: 40px;
    border-radius: 10px;
    font-weight: 800;
    letter-spacing: 0.2px;
  }

  // Card em Falta: 2x mais destacado
  &--missing {
    background: #fef2f2;
    border: 2px solid #ef4444;
    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.12);
    transform: translateY(-2px);
  }

  // Card OK: Verde suave
  &--ok {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
  }

  // Card Extra: Discreto em cinza claro
  &--extra {
    background: #f8fafc;
    border: 1px solid $line;
    padding: 14px;
    &.is-uploaded {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
  }
}

// ── FORMULÁRIO DE UPLOAD CONECTADO ──
.upload-box-card {
  background: #ffffff;
  border: 1px solid $line;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.upload-submit-btn {
  height: 40px;
  border-radius: 10px;
  font-size: 14px;
  letter-spacing: 0.2px;
}

// ── TABELA DE DOCUMENTOS ARQUIVADOS ──
.table-card {
  background: #ffffff;
  border: 1px solid $line;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.modern-doc-table {
  :deep(.q-table__top), :deep(thead tr th) {
    font-weight: 700;
    color: #475569;
    background: #f8fafc;
    font-size: 12px;
  }
  :deep(tbody tr:hover) {
    background: #f8fafc;
  }
}

.base-doc-badge {
  font-size: 10px;
  padding: 3px 8px;
}

.doc-action-btn {
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 8px;
}

.doc-mobile-item {
  background: #f8fafc;
  border: 1px solid $line;
  border-radius: 12px;
  padding: 12px;
}

body.body--dark {
  .upload-box-card, .table-card, .doc-card--extra {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .section-title, .kyc-banner-title {
    color: #f1f5f9;
  }
}
</style>
