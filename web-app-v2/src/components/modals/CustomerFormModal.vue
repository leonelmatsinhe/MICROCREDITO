<template>
  <q-dialog v-model="dialogModel" persistent position="right" full-height>
    <q-card class="customer-form-card" style="width: 480px; max-width: 90vw">
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none bg-primary text-white" style="border-radius: 12px 12px 0 0">
        <q-icon :name="isEdit ? 'edit' : 'person_add'" size="24px" class="q-mr-sm" />
        <div class="text-h6">{{ isEdit ? 'Editar Mutuário' : 'Novo Mutuário' }}</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-separator />

      <!-- Form -->
      <q-card-section style="max-height: calc(100vh - 180px); overflow-y: auto">
        <q-form ref="formRef" @submit="saveCustomer" class="q-gutter-md">
          <!-- Tipo de Mutuário -->
          <div class="text-subtitle2 text-primary q-mb-xs">
            <q-icon :name="isCompany ? 'apartment' : 'person'" size="16px" class="q-mr-xs" />
            Tipo de Mutuário
          </div>

          <q-btn-toggle
            v-model="form.customerType"
            class="type-toggle full-width"
            no-caps
            unelevated
            toggle-color="primary"
            color="grey-3"
            text-color="grey-8"
            :options="[
              { label: 'Pessoa Física', value: 'PF', icon: 'person' },
              { label: 'Empresa', value: 'PJ', icon: 'apartment' }
            ]"
          />

          <!-- ==================== PESSOA FÍSICA ==================== -->
          <template v-if="!isCompany">
            <!-- Dados Pessoais -->
            <div class="text-subtitle2 text-primary q-mb-xs">
              <q-icon name="person" size="16px" class="q-mr-xs" />
              Dados Pessoais
            </div>

            <q-input
              v-model="form.customerName"
              dense
              outlined
              label="Nome Completo *"
              :rules="[val => !!val || 'Nome é obrigatório']"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-select
                  v-model="form.sex"
                  dense
                  outlined
                  label="Género"
                  :options="sexOptions"
                  emit-value
                  map-options
                  clearable
                />
              </div>
              <div class="col-6">
                <q-select
                  v-model="form.maritalStatus"
                  dense
                  outlined
                  label="Estado Civil"
                  :options="maritalOptions"
                  emit-value
                  map-options
                  clearable
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="form.customerNuit"
                  dense
                  outlined
                  label="NUIT"
                  mask="#############"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="form.customerNationalId"
                  dense
                  outlined
                  label="Bilhete de Identidade"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="form.issuedAt"
                  dense
                  outlined
                  label="Data de Emissão"
                  type="date"
                  :max="todayDate"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="form.localOfIssue"
                  dense
                  outlined
                  label="Local de Emissão"
                />
              </div>
            </div>

            <q-input
              v-model="form.customerDateOfBirth"
              dense
              outlined
              label="Data de Nascimento"
              type="date"
              :max="adultBirthDate"
            />

            <q-input
              v-model="form.customerLocalOfBirth"
              dense
              outlined
              label="Local de Nascimento"
            />
          </template>

          <!-- ==================== EMPRESA (PJ) ==================== -->
          <template v-else>
            <!-- Dados da Empresa -->
            <div class="text-subtitle2 text-primary q-mb-xs">
              <q-icon name="apartment" size="16px" class="q-mr-xs" />
              Dados da Empresa
            </div>

            <q-input
              v-model="form.customerName"
              dense
              outlined
              label="Nome da Empresa *"
              :rules="[val => !!val || 'Nome da empresa é obrigatório']"
            />

            <q-input
              v-model="form.customerNuit"
              dense
              outlined
              label="NUIT da Empresa *"
              mask="#############"
              :rules="[val => !!val || 'NUIT da empresa é obrigatório']"
            />

            <q-input
              v-model="form.companyLicenseNumber"
              dense
              outlined
              label="Nº do Alvará *"
              :rules="[val => !!val || 'Nº do Alvará é obrigatório']"
            />

            <q-input
              v-model="form.companyMainActivity"
              dense
              outlined
              label="Actividade Principal *"
              :rules="[val => !!val || 'Actividade Principal é obrigatória']"
            />

            <q-input
              v-model="form.customerMonthlySalary"
              dense
              outlined
              label="Rendimentos Mensais (MZN) *"
              type="number"
              :rules="[val => !!val || 'Rendimentos mensais é obrigatório']"
            />
          </template>

          <!-- Contacto (comum aos dois tipos) -->
          <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
            <q-icon name="phone" size="16px" class="q-mr-xs" />
            Contacto
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model="form.customerPhone"
                dense
                outlined
                label="Telefone *"
                mask="#############"
                :rules="[val => !!val || 'Telefone é obrigatório']"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="form.customerEmail"
                dense
                outlined
                label="Email"
                type="email"
              />
            </div>
          </div>

          <!-- ==================== EMPRESA: Representante Legal ==================== -->
          <template v-if="isCompany">
            <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
              <q-icon name="badge" size="16px" class="q-mr-xs" />
              Representante Legal
            </div>

            <q-input
              v-model="form.companyLegalRepresentative"
              dense
              outlined
              label="Representante Legal *"
              :rules="[val => !!val || 'Representante legal é obrigatório']"
            />

            <q-input
              v-model="form.companyRepresentativeIdNumber"
              dense
              outlined
              label="BI/Passaporte do Representante *"
              :rules="[val => !!val || 'Documento do representante é obrigatório']"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="form.companyRepresentativeIdExpiry"
                  dense
                  outlined
                  label="Data Validade BI *"
                  type="date"
                  :rules="[val => !!val || 'Data de validade é obrigatória']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="form.companyRepresentativeIdIssuer"
                  dense
                  outlined
                  label="Local Emissão"
                />
              </div>
            </div>
          </template>

          <!-- Profissão e Rendimento (apenas PF) -->
          <template v-if="!isCompany">
            <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
              <q-icon name="work" size="16px" class="q-mr-xs" />
              Profissão e Rendimento
            </div>

            <q-input
              v-model="form.customerProfession"
              dense
              outlined
              label="Profissão"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="form.customerMonthlySalary"
                  dense
                  outlined
                  label="Rendimento Mensal"
                  type="number"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="form.customerLocalOfWork"
                  dense
                  outlined
                  label="Local de Trabalho"
                />
              </div>
            </div>
          </template>

          <!-- Morada -->
          <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
            <q-icon name="location_on" size="16px" class="q-mr-xs" />
            Morada
          </div>

          <q-input
            v-model="form.customerAddress"
            dense
            outlined
            :label="isCompany ? 'Endereço *' : 'Endereço'"
            :rules="isCompany ? [val => !!val || 'Endereço é obrigatório'] : []"
          />

          <q-input
            v-if="!isCompany"
            v-model="form.customerBairro"
            dense
            outlined
            label="Bairro"
          />

          <!-- Cônjuge (apenas PF casado/união de facto) -->
          <template v-if="!isCompany && showSpouseFields">
            <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
              <q-icon name="family_restroom" size="16px" class="q-mr-xs" />
              Cônjuge
            </div>

            <q-input
              v-model="form.customerSpouseName"
              dense
              outlined
              label="Nome do Cônjuge"
            />

            <q-input
              v-model="form.customerSpouseContact"
              dense
              outlined
              label="Contacto do Cônjuge"
              mask="#############"
            />
          </template>

          <!-- Pessoa de Emergência (apenas PF) -->
          <template v-if="!isCompany">
            <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
              <q-icon name="emergency" size="16px" class="q-mr-xs" />
              Contacto de Emergência
            </div>

            <q-input
              v-model="form.customerEmergencyPerson"
              dense
              outlined
              label="Pessoa de Referência"
            />

            <q-input
              v-model="form.customerEmergencyContact"
              dense
              outlined
              label="Contacto de Emergência"
              mask="#############"
            />
          </template>

          <!-- PPE e Status -->
          <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
            <q-icon name="gavel" size="16px" class="q-mr-xs" />
            Exigências BM
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-toggle
                v-model="form.customerPPE"
                :true-value="1"
                :false-value="0"
                label="Pessoa Politicamente Exposta"
                color="warning"
              />
            </div>
            <div class="col-6">
              <q-toggle
                v-model="form.customerStatus"
                :true-value="1"
                :false-value="0"
                label="Mutuário Activo"
                color="positive"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="row justify-end q-gutter-sm q-mt-lg q-pb-sm">
            <q-btn flat label="Cancelar" color="grey" @click="close" />
            <q-btn
              type="submit"
              unelevated
              :label="isEdit ? 'Salvar' : 'Criar Mutuário'"
              color="primary"
              :loading="saving"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCustomerStore } from '@/stores/customers'

const props = defineProps({
  modelValue: Boolean,
  customer: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const authStore = useAuthStore()
const customerStore = useCustomerStore()

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isEdit = computed(() => !!props.customer?.id)
const saving = computed(() => customerStore.saving)

const defaultForm = {
  customerName: '',
  customerType: 'PF',
  sex: 'M',
  maritalStatus: 'solteiro',
  customerNuit: '',
  customerNationalId: '',
  issuedAt: '',
  localOfIssue: '',
  customerDateOfBirth: '',
  customerLocalOfBirth: '',
  customerPhone: '',
  customerEmail: '',
  customerProfession: '',
  customerMonthlySalary: '',
  customerLocalOfWork: '',
  customerAddress: '',
  customerBairro: '',
  customerSpouseName: '',
  customerSpouseContact: '',
  customerEmergencyPerson: '',
  customerEmergencyContact: '',
  companyLegalRepresentative: '',
  companyRepresentativeIdNumber: '',
  companyRepresentativeIdExpiry: '',
  companyRepresentativeIdIssuer: '',
  companyLicenseNumber: '',
  companyMainActivity: '',
  customerPPE: 0,
  customerStatus: 1
}

const form = ref({ ...defaultForm })
const formRef = ref(null)
const todayDate = new Date().toISOString().split('T')[0]
const adultBirthDate = (() => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 18)
  return date.toISOString().split('T')[0]
})()

const isCompany = computed(() => form.value.customerType === 'PJ')

// Mostrar campos de cônjuge apenas para Casado ou União de Facto
const showSpouseFields = computed(() => {
  return form.value.maritalStatus === 'casado' || form.value.maritalStatus === 'uniao'
})

const sexOptions = [
  { label: 'Masculino', value: 'M' },
  { label: 'Feminino', value: 'F' }
]

const maritalOptions = [
  { label: 'Solteiro(a)', value: 'solteiro' },
  { label: 'Casado(a)', value: 'casado' },
  { label: 'Divorciado(a)', value: 'divorciado' },
  { label: 'Viúvo(a)', value: 'viuvo' },
  { label: 'União de Facto', value: 'uniao' }
]

watch(() => props.customer, (val) => {
  if (val) {
    form.value = {
      ...defaultForm,
      ...val,
      customerType: val.customerType === 'PJ' ? 'PJ' : 'PF'
    }
  } else {
    form.value = { ...defaultForm }
  }
}, { immediate: true })

function close() {
  dialogModel.value = false
}

function resetForm() {
  form.value = { ...defaultForm }
  formRef.value?.resetValidation()
}

async function saveCustomer() {
  try {
    const payload = { ...form.value, companyId: authStore.companyId }

    if (payload.customerType === 'PJ') {
      // Empresa: campos exclusivos de pessoa física não se aplicam
      payload.sex = null
      payload.maritalStatus = null
      payload.customerDateOfBirth = null
      payload.customerLocalOfBirth = null
      payload.customerNationalId = null
      payload.customerProfession = null
      payload.customerLocalOfWork = null
      payload.customerBairro = null
      payload.customerSpouseName = null
      payload.customerSpouseContact = null
      payload.customerEmergencyPerson = null
      payload.customerEmergencyContact = null
      payload.issuedAt = null
      payload.localOfIssue = null
    } else {
      // Pessoa física: limpar campos de empresa
      payload.companyLegalRepresentative = null
      payload.companyRepresentativeIdNumber = null
      payload.companyRepresentativeIdExpiry = null
      payload.companyRepresentativeIdIssuer = null
      payload.companyLicenseNumber = null
      payload.companyMainActivity = null
    }

    if (isEdit.value) {
      await customerStore.updateCustomer(props.customer.id, payload)
      $q.notify({ type: 'positive', message: 'Mutuário atualizado com sucesso', position: 'top' })
    } else {
      await customerStore.createCustomer(payload)
      $q.notify({ type: 'positive', message: 'Mutuário criado com sucesso', position: 'top' })
      resetForm()
    }

    emit('saved')
    close()
  } catch (error) {
    const msg = error.response?.data?.message || 'Erro ao guardar mutuário'
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  }
}
</script>

<style lang="scss" scoped>
.customer-form-card {
  border-radius: 12px;
}

.type-toggle {
  border-radius: 8px;

  :deep(.q-btn) {
    flex: 1;
  }
}

body.body--dark {
  .customer-form-card {
    background-color: $dark-page;
  }
  .type-toggle {
    :deep(.q-btn) {
      background-color: rgba(255, 255, 255, 0.06);
      color: $grey-4;
    }
  }
}
</style>
