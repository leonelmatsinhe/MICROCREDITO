<template>
  <q-card flat bordered class="settings-card">
    <q-card-section class="roles-header">
      <div class="row items-center">
        <q-icon name="admin_panel_settings" size="24px" color="primary" class="q-mr-sm" />
        <div class="text-h6 text-weight-bold">Permissões por Perfil</div>
      </div>
      <div class="text-caption text-grey-6 q-mt-xs">
        Configure as permissões de cada perfil do sistema
      </div>
    </q-card-section>

    <q-card-section>
      <!-- Gestor de Crédito -->
      <div class="role-section q-mb-lg">
        <div class="row items-center q-mb-md">
          <q-avatar size="40px" color="warning" text-color="white" class="q-mr-md">
            <q-icon name="supervisor_account" size="22px" />
          </q-avatar>
          <div>
            <div class="text-h6 text-weight-bold">Gestor de Crédito</div>
            <div class="text-caption text-grey-6">Gestão de mutuários e concessão de crédito</div>
          </div>
        </div>

        <q-separator class="q-mb-md" />

        <div class="row q-col-gutter-y-md q-col-gutter-x-sm">
          <div class="col-12 col-sm-6" v-for="perm in gestorPermissions" :key="perm.key">
            <div class="perm-item">
              <q-toggle
                v-model="permissions.gestor[perm.key]"
                :label="perm.label"
                :disable="!perm.canChange"
                color="primary"
              />
              <div class="perm-description q-ml-lg">
                {{ perm.description }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <q-separator class="q-my-lg" />

      <!-- Resumo -->
      <div class="bg-blue-1 rounded-borders q-pa-md">
        <div class="text-subtitle2 text-primary q-mb-sm">
          <q-icon name="info" size="16px" class="q-mr-xs" />
          Resumo das Permissões
        </div>
        <q-table
          :rows="summaryRows"
          :columns="summaryColumns"
          row-key="feature"
          flat
          dense
          hide-bottom
          :rows-per-page-options="[0]"
          style="font-size: 12px"
        >
          <template v-slot:body-cell-gestor="props">
            <q-td :props="props" class="text-center">
              <q-icon v-if="props.row.gestor" name="check_circle" color="positive" size="18px" />
              <q-icon v-else name="cancel" color="negative" size="18px" />
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- Botão Salvar -->
      <div class="row justify-end q-mt-lg">
        <q-btn
          unelevated
          color="primary"
          label="Guardar Permissões"
          icon="save"
          no-caps
          rounded
          @click="savePermissions"
          :loading="saving"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const saving = ref(false)

const gestorPermissions = [
  { key: 'viewCustomers', label: 'Ver Mutuários', description: 'Lista e detalhe de mutuários', canChange: true },
  { key: 'createCustomer', label: 'Cadastrar Mutuário', description: 'Criar novo mutuário', canChange: true },
  { key: 'editCustomer', label: 'Editar Mutuário', description: 'Actualizar dados do mutuário', canChange: true },
  { key: 'deactivateCustomer', label: 'Desactivar Mutuário', description: 'Desactivar (não deletar)', canChange: true },
  { key: 'viewLoans', label: 'Ver Créditos', description: 'Lista de créditos', canChange: true },
  { key: 'submitDocuments', label: 'Submeter Documentos', description: 'Enviar documentos do cliente', canChange: true },
  { key: 'submitGuarantees', label: 'Submeter Garantias', description: 'Registar garantias de crédito', canChange: true },
  { key: 'simulateLoan', label: 'Simular Crédito', description: 'Simular plano de amortização', canChange: true },
  { key: 'approveLoan', label: 'Aprovar Crédito', description: 'Aprovar concessão de crédito', canChange: false },
  { key: 'registerPayment', label: 'Registar Pagamento', description: 'Registar pagamentos', canChange: false },
  { key: 'viewReports', label: 'Ver Relatórios', description: 'Relatórios gerais', canChange: false }
]

const permissions = reactive({
  gestor: {
    viewCustomers: true,
    createCustomer: true,
    editCustomer: true,
    deactivateCustomer: true,
    viewLoans: true,
    submitDocuments: true,
    submitGuarantees: true,
    simulateLoan: true,
    approveLoan: false,
    registerPayment: false,
    viewReports: false
  }
})

const summaryColumns = [
  { name: 'feature', label: 'Funcionalidade', field: 'feature', align: 'left' },
  { name: 'gestor', label: 'Gestor', field: 'gestor', align: 'center' }
]

const summaryRows = [
  { feature: 'Ver Mutuários', gestor: true },
  { feature: 'Cadastrar/Editar Mutuário', gestor: true },
  { feature: 'Desactivar Mutuário', gestor: true },
  { feature: 'Ver Créditos', gestor: true },
  { feature: 'Submeter Documentos', gestor: true },
  { feature: 'Submeter Garantias', gestor: true },
  { feature: 'Simular Crédito', gestor: true },
  { feature: 'Aprovar Crédito', gestor: false },
  { feature: 'Registar Pagamento', gestor: false },
  { feature: 'Ver Relatórios', gestor: false }
]

onMounted(() => {
  const saved = localStorage.getItem('rolePermissions')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(permissions.gestor, parsed.gestor || {})
    } catch (e) {
      console.error('Erro ao carregar permissões:', e)
    }
  }
})

async function savePermissions() {
  saving.value = true
  try {
    localStorage.setItem('rolePermissions', JSON.stringify({
      gestor: { ...permissions.gestor }
    }))
    $q.notify({
      type: 'positive',
      message: 'Permissões guardadas com sucesso!',
      position: 'top'
    })
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: 'Erro ao guardar permissões',
      position: 'top'
    })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.settings-card {
  border-radius: 12px;
}

.role-section {
  padding: 12px 0;
}

.perm-item {
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.03);
  }
}

.perm-description {
  font-size: 11px;
  color: #9e9e9e;
  margin-top: -4px;
}

body.body--dark .settings-card {
  background-color: $dark-page;
}

body.body--dark .perm-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.roles-header {
  background: var(--q-grey-1);
}

body.body--dark .roles-header {
  background: rgba(255, 255, 255, 0.07);
}

body.body--dark .perm-description {
  color: rgba(255, 255, 255, 0.5);
}
</style>
