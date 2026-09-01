<template>
  <q-card flat bordered class="table-card">
    <q-card-section>
      <div class="row items-center q-mb-sm">
        <div class="text-subtitle1 text-weight-bold">
          <q-icon name="event" color="primary" class="q-mr-xs" />
          Próximas Prestações
        </div>
        <q-space />
        <q-badge color="primary" rounded :label="items.length" />
      </div>

      <q-table
        :rows="items"
        :columns="columns"
        row-key="id"
        flat
        dense
        :pagination="pagination"
        :rows-per-page-options="[5, 10, 25]"
        hide-bottom
        class="upcoming-table"
      >
        <template v-slot:body-cell-customer="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="28px" :color="getAvatarColor(props.row)" text-color="white" class="q-mr-sm">
                <span style="font-size: 10px">{{ getInitials(props.row.customerName) }}</span>
              </q-avatar>
              <div>
                <div class="text-weight-medium" style="font-size: 12px">{{ props.row.customerName }}</div>
                <div class="text-grey-5" style="font-size: 10px">{{ props.row.accountNumber }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-amount="props">
          <q-td :props="props">
            <span class="text-weight-bold text-primary" style="font-size: 12px">
              {{ formatMoney(props.row.amount) }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-dueDate="props">
          <q-td :props="props">
            <div style="font-size: 12px">{{ formatDate(props.row.dueDate) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-days="props">
          <q-td :props="props">
            <q-badge :color="getDaysColor(props.row.daysUntilDue)" :label="`${props.row.daysUntilDue} dias`" rounded />
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge v-if="props.row.status === -1" color="warning" text-color="white" rounded>Parcial</q-badge>
            <q-badge v-else color="grey-4" text-color="grey-7" rounded>Pendente</q-badge>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width text-center q-pa-lg text-grey-5">
            <q-icon name="check_circle" size="40px" color="positive" />
            <div class="q-mt-sm">Nenhuma prestação nos próximos 30 dias</div>
          </div>
        </template>
      </q-table>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'
import { formatMoney, getInitials } from '@/utils/formatters'

defineProps({
  items: { type: Array, default: () => [] }
})

const pagination = ref({ rowsPerPage: 5 })

const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right', sortable: true },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'center', sortable: true },
  { name: 'days', label: 'Dias', field: 'daysUntilDue', align: 'center', sortable: true },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' }
]

function getAvatarColor(row) {
  const colors = ['primary', 'secondary', 'teal', 'orange', 'purple', 'blue']
  const index = row.customerName ? row.customerName.charCodeAt(0) % colors.length : 0
  return colors[index]
}

function getDaysColor(days) {
  if (days <= 3) return 'negative'
  if (days <= 7) return 'orange'
  return 'primary'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}
</script>

<style lang="scss" scoped>
.table-card {
  border-radius: 12px;
  border: 1px solid $gray-200;
}

body.body--dark .table-card {
  background-color: $gray-800;
  border-color: $gray-700;
}

.upcoming-table {
  background: transparent;

  th {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: #6B7280;
  }

  td {
    font-size: 12px;
    padding: 8px 12px;
  }
}
</style>
