<template>
  <div>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Dados da Empresa</div>
        <div class="text-caption text-grey-5">Informações gerais e branding da instituição</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <template v-else>
      <q-form @submit="saveCompany">
        <!-- Logo Card -->
        <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-md">
              <q-icon name="image" size="16px" class="q-mr-xs" />
              Logotipo
            </div>

            <div class="row items-center q-col-gutter-md">
              <div class="col-auto">
                <div class="logo-preview" @click="triggerLogoUpload">
                  <img v-if="logoPreview || form.companyLogo" :src="logoPreview || getLogoUrl(form.companyLogo)" alt="Logo" class="logo-img" @error="onLogoError" />
                  <div v-else class="logo-placeholder">
                    <q-icon name="add_a_photo" size="28px" color="grey-5" />
                    <div class="text-caption text-grey-5 q-mt-xs" style="font-size: 10px">Adicionar Logo</div>
                  </div>
                  <div class="logo-overlay">
                    <q-icon name="camera_alt" size="20px" color="white" />
                  </div>
                </div>
                <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="onLogoSelected" />
              </div>
              <div class="col">
                <div class="text-body2 text-grey-7 q-mb-sm">
                  Carregue o logotipo da empresa que aparecerá no sidebar e nos relatórios.
                </div>
                <div class="text-caption text-grey-5 q-mb-sm">
                  Formatos aceites: PNG, JPG, SVG. Tamanho máximo: 2MB.
                </div>
                <div class="row q-gutter-sm">
                  <q-btn
                    flat
                    dense
                    no-caps
                    icon="cloud_upload"
                    label="Carregar Logo"
                    color="primary"
                    size="sm"
                    @click="triggerLogoUpload"
                    :loading="uploadingLogo"
                    type="button"
                  />
                  <q-btn
                    v-if="form.companyLogo || logoPreview"
                    flat
                    dense
                    no-caps
                    icon="delete"
                    label="Remover"
                    color="negative"
                    size="sm"
                    @click="removeLogo"
                    type="button"
                  />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Dados Gerais -->
        <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-md">
              <q-icon name="info" size="16px" class="q-mr-xs" />
              Dados Gerais
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.companyName"
                  dense
                  outlined
                  label="Nome da Empresa *"
                  :rules="[val => !!val || 'Obrigatório']"
                  input-style="font-size: 13px"
                >
                  <template v-slot:prepend>
                    <q-icon name="business" size="16px" color="grey-5" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.smsSender"
                  dense
                  outlined
                  label="Remetente SMS"
                  input-style="font-size: 13px"
                >
                  <template v-slot:prepend>
                    <q-icon name="sms" size="16px" color="grey-5" />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="row q-col-gutter-md q-mt-xs">
              <div class="col-12 col-sm-6">
                <q-input v-model="form.companyNuit" dense outlined label="NUIT" mask="#############" input-style="font-size: 13px">
                  <template v-slot:prepend>
                    <q-icon name="badge" size="16px" color="grey-5" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.companyWebsite" dense outlined label="Website" input-style="font-size: 13px">
                  <template v-slot:prepend>
                    <q-icon name="language" size="16px" color="grey-5" />
                  </template>
                </q-input>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Contacto -->
        <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-md">
              <q-icon name="contact_phone" size="16px" class="q-mr-xs" />
              Contacto
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input v-model="form.companyEmail" dense outlined label="Email" type="email" input-style="font-size: 13px">
                  <template v-slot:prepend>
                    <q-icon name="email" size="16px" color="grey-5" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.companyPhone" dense outlined label="Telefone" mask="#############" input-style="font-size: 13px">
                  <template v-slot:prepend>
                    <q-icon name="phone" size="16px" color="grey-5" />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="row q-col-gutter-md q-mt-xs">
              <div class="col-12">
                <q-input v-model="form.companyAddress" dense outlined label="Endereço" input-style="font-size: 13px">
                  <template v-slot:prepend>
                    <q-icon name="location_on" size="16px" color="grey-5" />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="row q-col-gutter-md q-mt-xs">
              <div class="col-12 col-sm-6">
                <q-input v-model="form.companyManager" dense outlined label="Gestor / Responsável" input-style="font-size: 13px">
                  <template v-slot:prepend>
                    <q-icon name="person" size="16px" color="grey-5" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model.number="form.forfeit" dense outlined label="Multa (%)" type="number" input-style="font-size: 13px">
                  <template v-slot:prepend>
                    <q-icon name="percent" size="16px" color="grey-5" />
                  </template>
                </q-input>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Contrato de Concessão -->
        <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-md">
              <q-icon name="description" size="16px" class="q-mr-xs" />
              Contrato de Concessão
            </div>
            <div class="row items-center no-wrap">
              <q-icon name="shield" size="22px" color="primary" class="q-mr-md" />
              <div class="col" style="min-width: 0">
                <div class="text-body2">Ocultar cláusula de seguro (VIGÉSIMA PRIMEIRA)</div>
                <div class="text-caption text-grey-6" style="line-height: 1.4">
                  Quando activado, a cláusula sobre protecção do empréstimo, seguro, garantias e recuperação do crédito deixa de constar do contrato de concessão gerado.
                </div>
                <div v-if="!authStore.isAdmin" class="text-caption text-orange q-mt-xs">
                  <q-icon name="lock" size="13px" class="q-mr-xs" />Apenas o Administrador pode alterar esta definição.
                </div>
              </div>
              <q-toggle
                v-model="form.contractHideInsuranceClause"
                color="negative"
                checked-icon="visibility_off"
                unchecked-icon="visibility"
                :disable="!authStore.isAdmin"
                class="q-ml-sm"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Serviço de SMS -->
        <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-md">
              <q-icon name="sms" size="16px" class="q-mr-xs" />
              Serviço de SMS
            </div>
            <div class="row items-center no-wrap">
              <q-icon name="campaign" size="22px" color="primary" class="q-mr-md" />
              <div class="col" style="min-width: 0">
                <div class="text-body2">Autorizar envio de SMS</div>
                <div class="text-caption text-grey-6" style="line-height: 1.4">
                  Quando desactivado, nenhum SMS é enviado — credenciais de acesso, aprovações de crédito, confirmações de pagamento, alertas e anúncios ficam em fila até voltar a activar.
                </div>
                <div v-if="!authStore.isAdmin" class="text-caption text-orange q-mt-xs">
                  <q-icon name="lock" size="13px" class="q-mr-xs" />Apenas o Administrador pode alterar esta definição.
                </div>
              </div>
              <q-toggle
                v-model="form.smsEnabled"
                color="positive"
                checked-icon="check"
                unchecked-icon="block"
                :disable="!authStore.isAdmin"
                class="q-ml-sm"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Save Button -->
        <div class="row justify-end q-mb-lg">
          <q-btn
            unelevated
            label="Salvar Alterações"
            color="primary"
            icon="save"
            no-caps
            type="submit"
            :loading="saving"
            padding="8px 24px"
            rounded
          />
        </div>
      </q-form>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'
import { logUpdateCompany } from '@/utils/logger'

const $q = useQuasar()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(false)
const saving = ref(false)

const logoInput = ref(null)
const logoPreview = ref(null)
const uploadingLogo = ref(false)

const form = ref({
  companyName: '',
  smsSender: '',
  companyEmail: '',
  companyPhone: '',
  companyNuit: '',
  companyWebsite: '',
  companyAddress: '',
  companyManager: '',
  companyLogo: '',
  forfeit: 0,
  companyStatus: 1,
  smsEnabled: true,
  contractHideInsuranceClause: false
})

function getLogoUrl(logo) {
  if (!logo) return ''
  if (logo.startsWith('http')) return logo
  if (logo.startsWith('/')) return logo
  return `/documents/${logo}`
}

function onLogoError(e) {
  e.target.src = '/logo.png'
}

function triggerLogoUpload() {
  logoInput.value?.click()
}

async function onLogoSelected(event) {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    $q.notify({ type: 'warning', message: 'Ficheiro muito grande. Máximo 2MB.', position: 'top' })
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => { logoPreview.value = e.target.result }
  reader.readAsDataURL(file)

  uploadingLogo.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (data.success) {
      form.value.companyLogo = data.documentFileUrl || data.fileName || data.imageUrl
      $q.notify({ type: 'positive', message: 'Logo carregado com sucesso', position: 'top' })
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar logo', position: 'top' })
    logoPreview.value = null
  } finally {
    uploadingLogo.value = false
  }
}

function removeLogo() {
  form.value.companyLogo = ''
  logoPreview.value = null
}

async function saveCompany() {
  saving.value = true
  try {
    // smsEnabled/contractHideInsuranceClause são booleanos no formulário; a BD guarda 1/0
    const payload = {
      ...form.value,
      smsEnabled: form.value.smsEnabled ? 1 : 0,
      contractHideInsuranceClause: form.value.contractHideInsuranceClause ? 1 : 0
    }
    await companyStore.updateCompany(authStore.companyId, payload)
    logUpdateCompany(['Dados gerais', 'Logotipo', 'Meios de pagamento', 'Serviço de SMS'])
    $q.notify({ type: 'positive', message: 'Empresa atualizada com sucesso', position: 'top' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Erro ao guardar', position: 'top' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await companyStore.fetchCompany(authStore.companyId)
    if (companyStore.company) {
      const c = companyStore.company
      form.value = {
        companyName: c.companyName || '',
        smsSender: c.smsSender || '',
        companyEmail: c.companyEmail || '',
        companyPhone: c.companyPhone || '',
        companyNuit: c.companyNuit || '',
        companyWebsite: c.companyWebsite || '',
        companyAddress: c.companyAddress || '',
        companyManager: c.companyManager || '',
        companyLogo: c.companyLogo || '',
        forfeit: c.forfeit || 0,
        companyStatus: c.companyStatus ?? 1,
        smsEnabled: c.smsEnabled === 1 || c.smsEnabled == null,
        contractHideInsuranceClause: Number(c.contractHideInsuranceClause || 0) === 1
      }
    }
  } catch { /* silent */ }
  loading.value = false
})
</script>

<style lang="scss" scoped>
.logo-preview {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  border: 2px dashed $grey-4;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s;

  &:hover {
    border-color: $primary;
  }

  &:hover .logo-overlay {
    opacity: 1;
  }
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
}

.logo-placeholder {
  text-align: center;
}

.logo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

body.body--dark .logo-preview {
  border-color: $grey-6;

  &:hover {
    border-color: $primary;
  }
}
</style>
