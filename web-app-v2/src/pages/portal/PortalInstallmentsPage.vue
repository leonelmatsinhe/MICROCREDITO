<template>
  <q-page class="portal-page q-pa-sm">
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar dados...</div>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="row items-center no-wrap q-mb-sm q-px-xs">
        <div class="col" style="min-width: 0">
          <div class="text-h6 text-weight-bold">Todas as Prestações</div>
          <div v-if="filterLoanId" class="text-caption text-grey-6">
            Crédito #{{ filterLoanId }} · <span class="text-primary cursor-pointer" @click="clearLoanFilter">ver todas</span>
          </div>
        </div>
        <q-badge color="positive" rounded class="q-px-md q-py-sm" style="font-size: 11px">
          {{ filteredInstallments.length }} registos
        </q-badge>
      </div>

      <div v-if="filteredInstallments.length === 0" class="text-center text-grey-5 q-pa-lg">
        Nenhuma prestação encontrada
      </div>

      <div v-else class="q-gutter-y-sm">
        <div
          v-for="instItem in visibleInstallments"
          :key="instItem.id"
          class="installment-card"
          :class="installmentCardClass(instItem)"
        >
          <!-- Cabeçalho -->
          <div class="row items-center no-wrap q-mb-xs">
            <q-avatar :color="installmentAvatarColor(instItem)" text-color="white" size="34px" class="q-mr-sm">
              {{ ordinalNumber(instItem.installmentOrder) || '—' }}
            </q-avatar>
            <div class="col" style="min-width: 0">
              <div class="text-weight-bold" style="font-size: 13px">{{ getInstallmentStatusText(instItem.status) }}</div>
              <div class="text-caption text-grey-6">Vence: {{ formatDate(instItem.dueDate) }}</div>
            </div>
            <div v-if="instItem.status !== 1" class="text-right">
              <div class="text-caption text-grey-6">Prestação</div>
              <div class="text-subtitle1 text-weight-bold text-primary">{{ formatMoney(instItem.installment) }}</div>
              <div v-if="Number(instItem.latePaymentInterest) > 0" class="text-caption text-negative">
                Mora: {{ formatMoney(instItem.latePaymentInterest) }}
              </div>
              <div v-if="Number(instItem.latePaymentInterest) > 0" class="text-caption text-negative text-weight-bold">
                Total: {{ formatMoney(Math.max(0, Number(instItem.installment || 0) - Number(instItem.paidAmount || 0)) + Number(instItem.latePaymentInterest || 0)) }}
              </div>
            </div>
          </div>

          <!-- PAGA -->
          <template v-if="instItem.status === 1">
            <div class="row q-col-gutter-sm installment-meta">
              <div class="col-6">
                <div class="text-caption text-grey-6">Valor pago</div>
                <div class="text-weight-bold text-positive">{{ formatMoney(instItem.paidAmount) }}</div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-6">Juros de mora aplicado</div>
                <div class="text-weight-bold" :class="installmentPaidLateFee(instItem) > 0 ? 'text-negative' : 'text-grey-6'">
                  {{ formatMoney(installmentPaidLateFee(instItem)) }}
                </div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-6">Data do pagamento</div>
                <div class="text-weight-bold" style="font-size: 13px">{{ installmentPaidDate(instItem) }}</div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-6">Referência</div>
                <div class="text-weight-bold text-grey-8" style="font-size: 12px; overflow-wrap: anywhere">{{ installmentReference(instItem) }}</div>
              </div>
            </div>
          </template>

          <!-- PENDENTE -->
          <template v-else>
            <div v-if="Number(instItem.lateDays) > 0" class="row q-col-gutter-sm installment-meta q-mb-xs">
              <div class="col-6">
                <div class="text-caption text-grey-6">Dias em atraso</div>
                <div class="text-weight-bold text-negative">
                  {{ instItem.lateDays }} {{ Number(instItem.lateDays) === 1 ? 'dia' : 'dias' }}
                </div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-6">Juros de mora</div>
                <div class="text-weight-bold text-negative">{{ formatMoney(instItem.latePaymentInterest) }}</div>
              </div>
            </div>
            <q-btn
              unelevated
              color="positive"
              :icon="instItem.status !== 1 ? 'payment' : 'credit_card'"
              :label="Number(instItem.paidAmount) > 0 ? 'Continuar Pagamento' : 'Pagar Prestação'"
              no-caps
              class="full-width btn-native"
              @click="openPaymentModal(instItem)"
            />
          </template>
        </div>

        <!-- Ver mais -->
        <div v-if="visibleCount < filteredInstallments.length" class="text-center q-pt-sm">
          <q-btn flat color="primary" :label="`Ver mais (${filteredInstallments.length - visibleCount} restantes)`" no-caps @click="showMore" />
        </div>
      </div>
    </template>

    <PortalPaymentDialog v-model="showPaymentModal" :installment="selectedInstallment" @paid="refresh()" />
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePortalData } from '@/composables/usePortalData'
import PortalPaymentDialog from './PortalPaymentDialog.vue'

const { loading, refresh, allInstallments, formatMoney, formatDate,
  getInstallmentStatusText, installmentAvatarColor, installmentCardClass,
  installmentPaidLateFee, installmentPaidDate, installmentReference, ordinalNumber } = usePortalData()

const showPaymentModal = ref(false)
const selectedInstallment = ref(null)
const filterLoanId = ref(null)
const visibleCount = ref(10)

const filteredInstallments = computed(() => {
  const list = allInstallments.value
  if (filterLoanId.value) return list.filter(i => Number(i.loanId) === Number(filterLoanId.value))
  return list
})
const visibleInstallments = computed(() => filteredInstallments.value.slice(0, visibleCount.value))
function showMore() { visibleCount.value += 10 }
function clearLoanFilter() { filterLoanId.value = null; visibleCount.value = 10 }

function openPaymentModal(inst) {
  selectedInstallment.value = inst
  showPaymentModal.value = true
}
</script>

<style lang="scss" scoped>
.portal-page {
  padding-bottom: 74px;
}

.installment-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 12px;
  background: #ffffff;
  transition: border-color 0.2s;

  &.is-overdue {
    border-color: rgba(220, 38, 38, 0.4);
    background: rgba(220, 38, 38, 0.03);
  }

  &.is-paid {
    background: rgba(46, 125, 50, 0.03);
  }
}

.installment-meta > div {
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
  padding: 6px 8px;
}

.btn-native {
  min-height: 48px;
  border-radius: 12px;
}

body.body--dark {
  .installment-card {
    background: $gray-800;
    border-color: rgba(255, 255, 255, 0.08);
  }
  .installment-card.is-overdue {
    border-color: rgba(239, 68, 68, 0.45);
    background: rgba(239, 68, 68, 0.1);
  }
  .installment-card.is-paid {
    background: rgba(46, 125, 50, 0.08);
  }
  .installment-meta > div {
    background: rgba(255, 255, 255, 0.04);
  }
  .text-grey-5,
  .text-grey-6 {
    color: #9ca3af;
  }
}
</style>
