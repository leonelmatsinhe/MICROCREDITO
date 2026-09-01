<template>
  <q-card flat bordered class="table-card">
    <q-card-section>
      <div class="row items-center q-mb-sm">
        <div class="text-subtitle1 text-weight-bold">
          <q-icon name="warning" color="negative" class="q-mr-xs" />
          Prestações Vencidas
        </div>
        <q-space />
        <q-badge color="negative" rounded :label="items.length" />
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
        class="overdue-table"
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
            <span class="text-weight-bold text-negative" style="font-size: 12px">
              {{ formatMoney(props.row.amount) }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-days="props">
          <q-td :props="props">
            <q-badge :color="getDaysColor(props.row.daysOverdue)" :label="`${props.row.daysOverdue} dias`" rounded />
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense round icon="phone" size="sm" color="positive" @click="$emit('call', props.row)">
              <q-tooltip>Ligar</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="sms" size="sm" color="blue" @click="$emit('sms', props.row)">
              <q-tooltip>Enviar SMS</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width text-center q-pa-lg text-grey-5">
            <q-icon name="check_circle" size="40px" color="positive" />
            <div class="q-mt-sm">Nenhuma prestação vencida</div>
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

defineEmits(['call', 'sms'])

const pagination = ref({ rowsPerPage: 5 })

const columns = [
  { name: 'customer', label: 'Mutuário', field: 'customerName', align: 'left', sortable: true },
  { name: 'amount', label: 'Valor', field: 'amount', align: 'right', sortable: true },
  { name: 'days', label: 'Dias', field: 'daysOverdue', align: 'center', sortable: true },
  { name: 'actions', label: '', field: 'actions', align: 'center' }
]

function getAvatarColor(row) {
  const colors = ['primary', 'secondary', 'teal', 'orange', 'purple', 'blue']
  const index = row.customerName ? row.customerName.charCodeAt(0) % colors.length : 0
  return colors[index]
}

function getDaysColor(days) {
  if (days >= 30) return 'negative'
  if (days >= 14) return 'orange'
  return 'warning'
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

.overdue-table {
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
