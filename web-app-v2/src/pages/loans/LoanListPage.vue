<template>
  <div class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6 text-weight-bold">Créditos</div>
        <div class="text-caption text-grey-5">Gestão de créditos da empresa</div>
      </div>
      <div class="col-auto">
        <q-btn
          color="primary"
          icon="person_add"
          label="Conceder Crédito"
          unelevated
          rounded
          size="sm"
          no-caps
          @click="router.push('/mutuarios')"
        />
      </div>
    </div>

    <!-- Search and Filters -->
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px">
      <q-card-section class="q-py-sm">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-12 col-md-4">
            <q-input
              v-model="searchQuery"
              dense
              outlined
              placeholder="Pesquisar por conta ou nome..."
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
              v-model="statusFilter"
              dense
              outlined
              :options="statusOptions"
              label="Estado"
              clearable
              emit-value
              map-options
              @update:model-value="applyFilters"
            />
          </div>
          <div class="col-12 col-md-2">
            <q-btn flat round dense icon="search" color="primary" size="sm" @click="doSearch">
              <q-tooltip>Pesquisar</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="filter_list_off" color="grey" size="sm" @click="clearFilters">
              <q-tooltip>Limpar filtros</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar créditos...</div>
    </div>

    <!-- Empty State -->
    <q-card v-else-if="!hasLoans" flat bordered style="border-radius: 12px">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="attach_money" size="64px" color="grey-4" />
        <div class="text-h6 text-grey-6 q-mt-md">Nenhum crédito encontrado</div>
        <div class="text-caption text-grey-5 q-mb-md">
          {{ searchQuery ? 'Tente outro termo de pesquisa' : 'Registe o primeiro crédito' }}
        </div>
        <q-btn
          v-if="!searchQuery"
          color="primary"
          icon="person_add"
          label="Conceder Crédito"
          unelevated
          rounded
          no-caps
          @click="router.push('/mutuarios')"
        />
      </q-card-section>
    </q-card>

    <!-- Loans Table -->
    <q-card v-else flat bordered style="border-radius: 12px; overflow: hidden">
      <q-table
        :rows="loans"
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
        class="loans-table"
        @row-click="(evt, row) => viewLoan(row)"
        style="cursor: pointer"
      >
        <!-- Customer Name -->
        <template v-slot:body-cell-customerName="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="24px" color="primary" text-color="white" class="q-mr-sm">
                {{ (props.row.customerName || '?').charAt(0).toUpperCase() }}
              </q-avatar>
              <span class="text-weight-medium" style="font-size: 13px">{{ props.row.customerName || '—' }}</span>
              <q-btn flat round dense icon="person" size="xs" color="grey-5" class="q-ml-xs" @click.stop="goToCustomer(props.row.accountNumber)">
                <q-tooltip>Ver mutuário</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <!-- Amount -->
        <template v-slot:body-cell-amount="props">
          <q-td :props="props">
            <span class="text-weight-bold" style="font-size: 13px">
              {{ formatMoney(props.row.amount) }}
            </span>
          </q-td>
        </template>

        <!-- Interest Rate -->
        <template v-slot:body-cell-rate="props">
          <q-td :props="props">
            <span v-if="Number(props.row.status) === 0" class="text-grey-5">A definir</span>
            <span v-else>{{ (props.row.interestRate * 100).toFixed(1) }}%</span>
          </q-td>
        </template>

        <!-- Status -->
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="getStatusColor(props.row.status)"
              :label="getStatusText(props.row.status)"
              rounded
              class="q-pa-xs"
              style="font-size: 11px"
            />
          </q-td>
        </template>

        <!-- Actions -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat round dense icon="description" size="sm" color="primary" @click.stop="goToDocuments(props.row)">
              <q-tooltip>Documentos</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="receipt" size="sm" color="teal" @click.stop="viewAmortization(props.row)">
              <q-tooltip>Plano de amortização</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.status === 0"
              flat
              round
              dense
              icon="delete"
              size="sm"
              color="negative"
              @click.stop="confirmDelete(props.row)"
            >
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Delete Confirmation -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card style="border-radius: 12px; min-width: 320px">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar icon="warning" color="negative" text-color="white" size="40px" />
          <div class="q-ml-md">
            <div class="text-h6">Eliminar Crédito</div>
            <div class="text-caption text-grey-6">
              Esta acção não pode ser desfeita.
            </div>
          </div>
        </q-card-section>
        <q-card-section>
          <div class="text-body2">
            Tem certeza que deseja eliminar o crédito da conta
            <strong>{{ deletingLoan?.accountNumber }}</strong>?
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            unelevated
            label="Eliminar"
            color="negative"
            :loading="saving"
            @click="deleteLoanConfirmed"
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
import { useLoansStore } from '@/stores/loans'
import { api } from '@/boot/axios'
import { formatMoney } from '@/utils/formatters'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const loansStore = useLoansStore()

const searchQuery = ref('')
const statusFilter = ref('')
const showDeleteConfirm = ref(false)
const deletingLoan = ref(null)

const loading = computed(() => loansStore.loading)
const saving = computed(() => loansStore.saving)
const loans = computed(() => loansStore.loans)
const hasLoans = computed(() => loansStore.hasLoans)

const statusOptions = [
  { label: 'Pendente', value: 0 },
  { label: 'Activo', value: 1 },
  { label: 'Rejeitado', value: -1 },
  { label: 'Terminado', value: 3 }
]

const columns = [
  { name: 'customerName', label: 'Cliente', field: 'customerName', align: 'left', sortable: true },
  { name: 'amount', label: 'Montante', field: 'amount', align: 'right', sortable: true },
  { name: 'installments', label: 'Prestações', field: 'numberOfInstallments', align: 'center', sortable: true },
  { name: 'rate', label: 'Taxa', field: 'interestRate', align: 'center', sortable: true },
  { name: 'date', label: 'Data', field: 'dateCreated', align: 'center', sortable: true },
  { name: 'status', label: 'Estado', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: 'Accões', field: 'actions', align: 'center' }
]

const tablePagination = computed(() => ({
  page: loansStore.pagination.currentPage,
  rowsPerPage: loansStore.pagination.itemsPerPage,
  rowsNumber: loansStore.pagination.totalItems
}))

function getStatusColor(status) {
  const colors = { 0: 'orange', 1: 'positive', '-1': 'negative', 3: 'grey' }
  return colors[status] || 'grey'
}

function getStatusText(status) {
  const texts = { 0: 'Pendente', 1: 'Activo', '-1': 'Rejeitado', 3: 'Terminado' }
  return texts[status] || 'Desconhecido'
}

async function loadLoans(page = 1) {
  const companyId = authStore.companyId
  if (!companyId) return

  await loansStore.fetchLoansPaginated(companyId, {
    page,
    limit: 15,
    status: statusFilter.value,
    search: searchQuery.value
  })

  // Enrich loans with customer names using dedicated endpoint
  try {
    const { data } = await api.get(`/api/customers/${companyId}/names`)
    if (data.success && data.result) {
      const nameMap = data.result
      loansStore.loans = loansStore.loans.map(loan => ({
        ...loan,
        customerName: nameMap[loan.accountNumber] || `Conta ${loan.accountNumber}`
      }))
    }
  } catch { /* silent */ }
}

function doSearch() {
  loadLoans(1)
}

function clearSearch() {
  searchQuery.value = ''
  loadLoans(1)
}

function clearFilters() {
  searchQuery.value = ''
  statusFilter.value = ''
  loadLoans(1)
}

function applyFilters() {
  loadLoans(1)
}

function onPaginationChange(props) {
  loadLoans(props.pagination.page)
}

function viewLoan(row) {
  router.push(`/loans/${row.id}`)
}

function goToCustomer(accountNumber) {
  router.push(`/mutuarios/${accountNumber}`)
}

function goToDocuments(row) {
  router.push(`/loans/${row.id}/documents`)
}

function viewAmortization(row) {
  router.push(`/loans/${row.id}/amortization`)
}

function confirmDelete(row) {
  deletingLoan.value = row
  showDeleteConfirm.value = true
}

async function deleteLoanConfirmed() {
  try {
    await loansStore.deleteLoan(deletingLoan.value.id)
    $q.notify({ type: 'positive', message: 'Crédito eliminado com sucesso', position: 'top' })
    loadLoans(loansStore.pagination.currentPage)
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Erro ao eliminar crédito', position: 'top' })
  }
}

onMounted(() => {
  loadLoans()
})
</script>

<style lang="scss" scoped>
.loans-table {
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
  .loans-table {
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
