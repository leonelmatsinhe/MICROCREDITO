<template>
  <q-dialog v-model="show" persistent>
    <q-card style="width: 650px; max-width: 95vw; border-radius: 16px">
      <q-card-section class="bg-teal text-white row items-center" style="border-radius: 16px 16px 0 0">
        <q-icon name="security" size="24px" class="q-mr-sm" />
        <div class="text-h6">Garantias</div>
        <div class="text-caption q-ml-sm" style="opacity: 0.8">Crédito #{{ loanId }}</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-card-section class="q-pa-lg">
        <!-- Add Guarantee Form -->
        <q-card flat bordered style="border-radius: 12px" class="q-mb-lg">
          <q-card-section class="q-pa-lg">
            <div class="text-subtitle2 text-weight-bold q-mb-lg">
              <q-icon name="add_circle" size="16px" class="q-mr-xs" />
              Adicionar Garantia
            </div>

            <div class="q-gutter-y-lg">
              <!-- Descrição -->
              <q-input
                v-model="form.guaranteeDescription"
                dense
                outlined
                label="Descrição da garantia *"
                input-style="font-size: 13px"
              >
                <template v-slot:prepend><q-icon name="description" size="16px" color="grey-5" /></template>
              </q-input>

              <!-- Valor estimado -->
              <q-input
                v-model.number="form.purchaseAmount"
                dense
                outlined
                label="Valor estimado (MT) *"
                type="number"
                input-style="font-size: 13px"
              >
                <template v-slot:prepend><q-icon name="attach_money" size="16px" color="grey-5" /></template>
              </q-input>

              <!-- Upload de Fotografia -->
              <div>
                <div class="text-caption text-grey-6 q-mb-sm">Fotografia da Garantia</div>
                <div class="row items-center q-gutter-md">
                  <q-btn
                    outline
                    color="grey-7"
                    icon="camera_alt"
                    label="Escolher fotografia"
                    no-caps
                    size="sm"
                    @click="triggerFileInput"
                  />
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="onFileChange"
                  />
                  <span v-if="selectedFile" class="text-caption text-grey-7">
                    {{ selectedFile.name }}
                  </span>
                </div>
                <!-- Progress Bar -->
                <q-linear-progress
                  v-if="uploadValue > 0"
                  :value="uploadValue / 100"
                  color="teal"
                  class="q-mt-sm"
                  rounded
                  size="8px"
                />
                <!-- Preview da imagem -->
                <div v-if="form.guaranteeFileUrl" class="q-mt-sm">
                  <q-img
                    :src="form.guaranteeFileUrl"
                    style="max-width: 150px; max-height: 100px; border-radius: 8px"
                    fit="cover"
                  >
                    <q-btn
                      flat
                      round
                      dense
                      icon="close"
                      size="xs"
                      color="white"
                      class="absolute-top-right"
                      style="background: rgba(0,0,0,0.5)"
                      @click="removeImage"
                    />
                  </q-img>
                </div>
              </div>

              <!-- Estado -->
              <q-select
                v-model="form.status"
                dense
                outlined
                :options="statusOptions"
                label="Estado"
                emit-value
                map-options
                input-style="font-size: 13px"
              />

              <!-- Botão Adicionar -->
              <div class="row justify-end q-mt-md">
                <q-btn
                  color="teal"
                  icon="add"
                  label="Adicionar"
                  unelevated
                  rounded
                  size="sm"
                  no-caps
                  :loading="saving"
                  :disable="!form.guaranteeDescription || !form.purchaseAmount"
                  @click="addGuarantee"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Guarantees List -->
        <q-card flat bordered style="border-radius: 12px">
          <q-card-section class="q-pa-lg">
            <div class="row items-center q-mb-lg">
              <div class="text-subtitle2 text-weight-bold">
                <q-icon name="verified" size="16px" class="q-mr-xs" />
                Garantias Registadas
              </div>
              <q-space />
              <q-badge color="grey">{{ guarantees.length }}</q-badge>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="text-center q-pa-md">
              <q-spinner-dots size="30px" color="teal" />
            </div>

            <!-- Empty State -->
            <div v-else-if="guarantees.length === 0" class="text-center q-pa-lg">
              <q-icon name="security" size="40px" color="grey-4" />
              <div class="text-caption text-grey-5 q-mt-sm">Nenhuma garantia registada</div>
            </div>

            <!-- Guarantees List -->
            <q-list v-else separator>
              <q-item v-for="g in guarantees" :key="g.id" class="q-py-md">
                <q-item-section avatar>
                  <q-avatar v-if="g.guaranteeFileUrl" size="48px">
                    <q-img
                      :src="getImageUrl(g.guaranteeFileUrl)"
                      fit="cover"
                      style="width: 100%; height: 100%"
                      @error="onImageError"
                    />
                  </q-avatar>
                  <q-avatar v-else color="teal" text-color="white" size="48px">
                    <q-icon name="security" size="24px" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium" style="font-size: 13px">
                    {{ g.guaranteeDescription }}
                  </q-item-label>
                  <q-item-label caption style="font-size: 11px" class="q-mt-xs">
                    {{ formatMoney(g.purchaseAmount) }}
                    <q-badge
                      :color="g.status === 1 ? 'positive' : 'orange'"
                      :label="g.status === 1 ? 'Activa' : 'Pendente'"
                      rounded
                      class="q-ml-sm"
                      style="font-size: 9px"
                    />
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    size="sm"
                    color="negative"
                    @click="confirmDelete(g)"
                  >
                    <q-tooltip>Eliminar</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>

            <!-- Total -->
            <div v-if="guarantees.length > 0" class="row justify-end q-mt-lg">
              <div class="text-right">
                <div class="text-caption text-grey-5">Total Garantias</div>
                <div class="text-weight-bold text-teal" style="font-size: 16px">
                  {{ formatMoney(totalValue) }}
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useGuaranteesStore } from '@/stores/guarantees'
import { logCreateGuarantee, logDeleteGuarantee } from '@/utils/logger'

const $q = useQuasar()
const guaranteesStore = useGuaranteesStore()

const props = defineProps({
  modelValue: Boolean,
  loanId: [String, Number]
})

const emit = defineEmits(['update:modelValue'])

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = computed(() => guaranteesStore.loading)
const saving = computed(() => guaranteesStore.saving)
const guarantees = computed(() => guaranteesStore.guarantees)
const totalValue = computed(() => guaranteesStore.totalGuaranteeValue)

const form = ref({
  guaranteeDescription: '',
  purchaseAmount: 0,
  status: 0,
  guaranteeFileUrl: ''
})

const statusOptions = [
  { label: 'Pendente', value: 0 },
  { label: 'Activa', value: 1 }
]

// Upload
const fileInput = ref(null)
const selectedFile = ref(null)
const uploadValue = ref(0)

watch(show, (val) => {
  if (val && props.loanId) {
    guaranteesStore.fetchGuarantees(props.loanId)
  }
})

function formatMoney(value) {
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0) + ' MT'
}

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const file = e.target.files[0]
  if (file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      $q.notify({ type: 'negative', message: 'Por favor seleccione uma imagem', position: 'top' })
      return
    }
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      $q.notify({ type: 'negative', message: 'A imagem deve ter no máximo 5MB', position: 'top' })
      return
    }
    selectedFile.value = file
    // Create preview URL
    form.value.guaranteeFileUrl = URL.createObjectURL(file)
  }
}

function removeImage() {
  selectedFile.value = null
  form.value.guaranteeFileUrl = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function uploadFile() {
  if (!selectedFile.value) return null

  uploadValue.value = 50

  try {
    const data = await guaranteesStore.uploadFile(selectedFile.value)
    if (data.success) {
      uploadValue.value = 100
      return data.documentFileUrl || `/documents/${data.imageUrl}`
    } else {
      throw new Error(data.message || 'Erro no upload')
    }
  } catch (error) {
    throw error
  } finally {
    uploadValue.value = 0
  }
}

async function addGuarantee() {
  if (!form.value.guaranteeDescription || !form.value.purchaseAmount) return

  try {
    // Upload file first if selected
    let fileUrl = form.value.guaranteeFileUrl
    if (selectedFile.value) {
      fileUrl = await uploadFile()
    }

    await guaranteesStore.createGuarantee({
      loanId: props.loanId,
      guaranteeDescription: form.value.guaranteeDescription,
      purchaseAmount: form.value.purchaseAmount,
      status: form.value.status,
      guaranteeFileUrl: fileUrl || ''
    })

    logCreateGuarantee(form.value.guaranteeDescription, 'Garantia')
    $q.notify({ type: 'positive', message: 'Garantia adicionada com sucesso', position: 'top' })

    // Reset form
    form.value = { guaranteeDescription: '', purchaseAmount: 0, status: 0, guaranteeFileUrl: '' }
    selectedFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }

    await guaranteesStore.fetchGuarantees(props.loanId)
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao adicionar garantia', position: 'top' })
  }
}

function confirmDelete(g) {
  $q.dialog({
    title: 'Eliminar Garantia',
    message: `Tem certeza que deseja eliminar "${g.guaranteeDescription}"?`,
    cancel: 'Não',
    ok: { label: 'Sim, eliminar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      await guaranteesStore.deleteGuarantee(g.id)
      logDeleteGuarantee(g.guaranteeDescription, 'Garantia')
      $q.notify({ type: 'positive', message: 'Garantia eliminada', position: 'top' })
      await guaranteesStore.fetchGuarantees(props.loanId)
    } catch {
      $q.notify({ type: 'negative', message: 'Erro ao eliminar', position: 'top' })
    }
  })
}

function getImageUrl(url) {
  if (!url) return ''
  // Se já é uma URL completa, retorna como está
  if (url.startsWith('http')) return url
  // Se começa com /, usa o proxy do Vite
  if (url.startsWith('/')) return url
  // Caso contrário, adiciona /documents/
  return `/documents/${url}`
}

function onImageError(e) {
  // Se a imagem falhar, esconde o container
  e.target.style.display = 'none'
}

function close() {
  show.value = false
}
</script>
