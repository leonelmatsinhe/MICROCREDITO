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
        <q-form @submit="saveCustomer" class="q-gutter-md">
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
                label="Género *"
                :options="sexOptions"
                emit-value
                map-options
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
          />

          <q-input
            v-model="form.customerLocalOfBirth"
            dense
            outlined
            label="Local de Nascimento"
          />

          <!-- Contacto -->
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

          <!-- Profissão e Rendimento -->
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

          <!-- Morada -->
          <div class="text-subtitle2 text-primary q-mb-xs q-mt-md">
            <q-icon name="location_on" size="16px" class="q-mr-xs" />
            Morada
          </div>

          <q-input
            v-model="form.customerAddress"
            dense
            outlined
            label="Endereço"
          />

          <q-input
            v-model="form.customerBairro"
            dense
            outlined
            label="Bairro"
          />

          <!-- Cônjuge (apenas para Casado ou União de Facto) -->
          <template v-if="showSpouseFields">
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

          <!-- Pessoa de Emergência -->
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
  customerPPE: 0,
  customerStatus: 1
}

const form = ref({ ...defaultForm })

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
    form.value = { ...defaultForm, ...val }
  } else {
    form.value = { ...defaultForm }
  }
}, { immediate: true })

function close() {
  dialogModel.value = false
}

async function saveCustomer() {
  try {
    const payload = { ...form.value, companyId: authStore.companyId }

    if (isEdit.value) {
      await customerStore.updateCustomer(props.customer.id, payload)
      $q.notify({ type: 'positive', message: 'Mutuário atualizado com sucesso', position: 'top' })
    } else {
      await customerStore.createCustomer(payload)
      $q.notify({ type: 'positive', message: 'Mutuário criado com sucesso', position: 'top' })
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

body.body--dark {
  .customer-form-card {
    background-color: $dark-page;
  }
}
</style>
