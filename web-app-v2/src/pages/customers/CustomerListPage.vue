<template>
  <div class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Mutuários</div>
        <div class="text-caption text-grey-5">
          Gestão de mutuários da empresa
        </div>
      </div>
      <div class="col-auto">
        <q-btn
          color="primary"
          icon="person_add"
          label="Novo Mutuário"
          unelevated
          rounded
          size="sm"
          @click="showCreateModal = true"
        />
      </div>
    </div>

    <!-- Search and Filters -->
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-12 col-md-5">
            <q-input
              v-model="searchQuery"
              dense
              outlined
              placeholder="Pesquisar por nome, telefone, NUIT ou conta..."
              clearable
              @clear="clearSearch"
              @keyup.enter="doSearch"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="selectedBairro"
              dense
              outlined
              :options="bairroOptions"
              label="Filtrar por Bairro"
              clearable
              emit-value
              map-options
              @update:model-value="applyFilters"
            />
          </div>
          <div class="col-12 col-md-2">
            <q-btn
              flat
              round
              dense
              icon="search"
              color="primary"
              size="sm"
              @click="doSearch"
            >
              <q-tooltip>Pesquisar</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="filter_list_off"
              color="grey"
              size="sm"
              @click="clearFilters"
            >
              <q-tooltip>Limpar filtros</q-tooltip>
            </q-btn>
          </div>
          <div class="col-12 col-md-2 text-right">
            <q-btn
              flat
              dense
              icon="download"
              label="Exportar"
              size="sm"
              color="positive"
              @click="exportData"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar mutuários...</div>
    </div>

    <!-- Empty State -->
    <q-card v-else-if="!hasCustomers" flat bordered style="border-radius: 12px">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="people_outline" size="64px" color="grey-4" />
        <div class="text-h6 text-grey-6 q-mt-md">Nenhum mutuário encontrado</div>
        <div class="text-caption text-grey-5 q-mb-md">
          {{ searchQuery ? 'Tente outro termo de pesquisa' : 'Adicione o primeiro mutuário' }}
        </div>
        <q-btn
          v-if="!searchQuery"
          color="primary"
          icon="person_add"
          label="Adicionar Mutuário"
          unelevated
          rounded
          @click="showCreateModal = true"
        />
      </q-card-section>
    </q-card>

    <!-- Customers Table -->
    <q-card v-else flat bordered style="border-radius: 12px; overflow: hidden">
      <q-table
        :rows="customers"
        :columns="columns"
        row-key="id"
        flat
        bordered
        :rows-per-page-options="[15, 25, 50]"
        :pagination="tablePagination"
        @request="onPaginationChange"
        :loading="loading"
        dense
        separator="horizontal"
        class="customer-table"
      >
        <!-- Avatar + Name Column -->
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar
                :color="getAvatarColor(props.row.customerName)"
                text-color="white"
                size="32px"
                class="q-mr-sm"
              >
                {{ getInitials(props.row.customerName) }}
              </q-avatar>
              <div>
                <div class="text-weight-medium" style="font-size: 13px">
                  {{ props.row.customerName }}
                </div>
                <div class="text-caption text-grey-5" style="font-size: 11px">
                  {{ props.row.customerPhone }}
                </div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Account Number -->
        <template v-slot:body-cell-account="props">
          <q-td :props="props">
            <q-chip
              dense
              size="sm"
              color="blue-1"
              text-color="blue-8"
              class="text-weight-medium"
            >
              {{ props.row.accountNumber }}
            </q-chip>
          </q-td>
        </template>

        <!-- Status Column -->
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="getStatusColor(props.row.customerStatus)"
              :label="getStatusText(props.row.customerStatus)"
              rounded
              class="q-pa-xs"
              style="font-size: 11px"
            />
          </q-td>
        </template>

        <!-- Actions Column -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat round dense icon="visibility" size="sm" color="primary" @click="viewCustomer(props.row)">
              <q-tooltip>Ver detalhes</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="edit" size="sm" color="grey-7" @click="editCustomer(props.row)" :disable="!canEditCustomer(authStore.userRole)">
              <q-tooltip>{{ canEditCustomer(authStore.userRole) ? 'Editar' : 'Sem permissão' }}</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" size="sm" color="negative" @click="confirmDelete(props.row)" :disable="!canDeleteCustomer(authStore.userRole)">
              <q-tooltip>{{ canDeleteCustomer(authStore.userRole) ? 'Eliminar' : 'Sem permissão' }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Create/Edit Modal -->
    <CustomerFormModal
      v-model="showCreateModal"
      :customer="editingCustomer"
      @saved="onCustomerSaved"
    />

    <!-- Delete Confirmation -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="border-radius: 12px; min-width: 320px">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar icon="warning" color="negative" text-color="white" size="40px" />
          <div class="q-ml-md">
            <div class="text-h6">Eliminar Mutuário</div>
            <div class="text-caption text-grey-6">
              Esta acção não pode ser desfeita.
            </div>
          </div>
        </q-card-section>
        <q-card-section>
          <div class="text-body2">
            Tem certeza que deseja eliminar o mutuário
            <strong>{{ deletingCustomer?.customerName }}</strong>?
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            unelevated
            label="Eliminar"
            color="negative"
            :loading="saving"
            @click="deleteCustomerConfirmed"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useCustomerStore } from '@/stores/customers'
import CustomerFormModal from '@/components/modals/CustomerFormModal.vue'
import { canDeleteCustomer, canEditCustomer } from '@/utils/permissions'
import { logDeleteCustomer, logDeactivateCustomer } from '@/utils/logger'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const customerStore = useCustomerStore()

const searchQuery = ref('')
const selectedBairro = ref('')
const showCreateModal = ref(false)
const showDeleteConfirm = ref(false)
const editingCustomer = ref(null)
const deletingCustomer = ref(null)

const loading = computed(() => customerStore.loading)
const saving = computed(() => customerStore.saving)
const customers = computed(() => customerStore.customers)
const hasCustomers = computed(() => customerStore.hasCustomers)

const bairroOptions = ref([])

const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'account', label: 'Conta', field: 'accountNumber', align: 'center', sortable: true },
  { name: 'nuit', label: 'NUIT', field: 'customerNuit', align: 'center', sortable: true },
  { name: 'bairro', label: 'Bairro', field: 'customerBairro', align: 'left', sortable: true },
  { name: 'status', label: 'Estado', field: 'customerStatus', align: 'center', sortable: true },
  { name: 'actions', label: 'Accões', field: 'actions', align: 'center' }
]

const tablePagination = computed(() => ({
  page: customerStore.pagination.currentPage,
  rowsPerPage: customerStore.pagination.itemsPerPage,
  rowsNumber: customerStore.pagination.totalItems
}))

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function getAvatarColor(name) {
  const colors = ['blue', 'green', 'teal', 'purple', 'orange', 'red', 'pink', 'cyan']
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function getStatusColor(status) {
  if (status === 1 || status === 'ativo') return 'positive'
  if (status === 0 || status === 'inativo') return 'grey'
  return 'blue'
}

function getStatusText(status) {
  if (status === 1 || status === 'ativo') return 'Activo'
  if (status === 0 || status === 'inativo') return 'Inactivo'
  return 'Activo'
}

async function loadCustomers(page = 1) {
  const companyId = authStore.companyId
  if (!companyId) return

  await customerStore.fetchCustomers(companyId, {
    page,
    limit: 15,
    search: searchQuery.value,
    bairro: selectedBairro.value
  })
}

function doSearch() {
  loadCustomers(1)
}

function clearSearch() {
  searchQuery.value = ''
  loadCustomers(1)
}

function clearFilters() {
  searchQuery.value = ''
  selectedBairro.value = ''
  loadCustomers(1)
}

function applyFilters() {
  loadCustomers(1)
}

function onPaginationChange(props) {
  loadCustomers(props.pagination.page)
}

function viewCustomer(row) {
  router.push(`/mutuarios/${row.accountNumber}`)
}

function editCustomer(row) {
  editingCustomer.value = { ...row }
  showCreateModal.value = true
}

function confirmDelete(row) {
  deletingCustomer.value = row
  showDeleteConfirm.value = true
}

async function deleteCustomerConfirmed() {
  try {
    const name = deletingCustomer.value.customerName || deletingCustomer.value.name
    await customerStore.deleteCustomer(deletingCustomer.value.id)
    logDeleteCustomer(name)
    $q.notify({ type: 'positive', message: 'Mutuário eliminado com sucesso', position: 'top' })
    loadCustomers(customerStore.pagination.currentPage)
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Erro ao eliminar mutuário', position: 'top' })
  }
}

function onCustomerSaved() {
  showCreateModal.value = false
  editingCustomer.value = null
  loadCustomers(customerStore.pagination.currentPage)
}

function exportData() {
  $q.notify({ type: 'info', message: 'Exportação em desenvolvimento', position: 'top' })
}

onMounted(() => {
  loadCustomers()
})
</script>

<style lang="scss" scoped>
.customer-table {
  :deep(.q-table__top) {
    display: none;
  }
  :deep(.q-table thead th) {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    color: $grey-6;
    background-color: $grey-1;
  }
  :deep(.q-table tbody td) {
    font-size: 13px;
    padding: 8px 12px;
  }
  :deep(.q-table tbody tr:hover) {
    background-color: $grey-2;
  }
}

body.body--dark {
  .customer-table {
    :deep(.q-table thead th) {
      background-color: $dark-page;
      color: $grey-5;
    }
    :deep(.q-table tbody tr:hover) {
      background-color: rgba(255, 255, 255, 0.03);
    }
  }
}
</style>
