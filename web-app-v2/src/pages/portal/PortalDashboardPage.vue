<template>
  <q-page class="portal-page q-pa-sm">
    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar dados...</div>
    </div>

    <template v-else>
      <!-- KPIs -->
      <div class="row q-col-gutter-sm q-mb-sm">
        <div v-for="kpi in kpis" :key="kpi.label" class="col-12 col-sm-4">
          <q-card flat bordered class="kpi-card">
            <q-card-section class="row items-center no-wrap q-pa-sm">
              <q-avatar :color="kpi.color" text-color="white" size="42px" class="q-mr-sm">
                <q-icon :name="kpi.icon" size="20px" />
              </q-avatar>
              <div class="col" style="min-width: 0">
                <div class="kpi-value" :class="kpi.valueClass">{{ kpi.value }}</div>
                <div class="text-caption text-grey-6">{{ kpi.label }}</div>
                <div v-if="kpi.sub" class="text-caption" :class="kpi.subClass || 'text-grey-6'">{{ kpi.sub }}</div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Dívida por liquidar -->
      <q-card v-if="hasOutstandingDebt" flat class="portal-debt-card q-mb-sm">
        <q-card-section class="row items-center no-wrap q-pa-sm">
          <q-icon name="warning_amber" color="negative" size="32px" class="q-mr-sm" />
          <div class="col" style="min-width: 0">
            <div class="text-subtitle1 text-weight-bold text-negative">Dívida por liquidar</div>
            <div class="text-caption text-grey-7 portal-debt-text">
              Só pode solicitar um novo crédito quando toda a dívida estiver liquidada.
              <strong>Saldo devedor actual: {{ formatMoney(summary.totalDebt) }}</strong>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card v-else flat bordered class="portal-cta-card q-mb-sm">
        <q-card-section class="row items-center no-wrap q-pa-sm">
          <q-avatar
            :icon="hasPendingRequest ? 'hourglass_top' : 'add_circle_outline'"
            :color="hasPendingRequest ? 'warning' : 'primary'"
            text-color="white"
            size="38px"
            class="q-mr-sm"
          />
          <div class="col" style="min-width: 0">
            <div class="text-subtitle2 text-weight-bold">
              {{ hasPendingRequest ? 'Pedido em análise' : 'Precisa de um novo crédito?' }}
            </div>
            <div class="text-caption text-grey-6">
              <template v-if="hasPendingRequest">
                Já existe um pedido de {{ formatMoney(summary.pendingAmount) }} a aguardar aprovação da instituição.
              </template>
              <template v-else>
                Solicite um novo empréstimo directamente pelo portal — a taxa de juro e a prestação serão definidas pela instituição aquando da aprovação.
              </template>
            </div>
          </div>
        </q-card-section>
        <template v-if="canRequestCredit">
          <q-separator />
          <q-card-actions class="q-pa-sm">
            <q-btn
              unelevated
              color="primary"
              icon="add"
              label="Solicitar Novo Empréstimo"
              no-caps
              class="full-width btn-native"
              @click="openLoanRequest"
            />
          </q-card-actions>
        </template>
      </q-card>

      <!-- Próximas Prestações -->
      <q-card flat bordered class="portal-section-card">
        <q-card-section class="portal-section-header q-py-sm">
          <div class="row items-center">
            <q-icon name="event" size="20px" color="primary" class="q-mr-sm" />
            <div class="text-subtitle1 text-weight-bold">Próximas Prestações</div>
          </div>
        </q-card-section>
        <q-card-section class="q-pa-sm">
          <div v-if="upcomingInstallments.length === 0" class="text-center text-grey-5 q-pa-md">
            Nenhuma prestação pendente
          </div>
          <div v-else class="q-gutter-y-sm">
            <div v-for="inst in upcomingInstallments" :key="inst.id" class="upcoming-card">
              <div class="row items-center no-wrap q-mb-xs">
                <q-avatar :color="inst.daysUntilDue <= 7 ? 'negative' : 'orange'" text-color="white" size="36px" class="q-mr-sm">
                  {{ ordinalNumber(inst.installmentOrder) || '—' }}
                </q-avatar>
                <div class="col" style="min-width: 0">
                  <div class="text-weight-bold" style="font-size: 15px">{{ formatMoney(inst.installment) }}</div>
                  <div class="text-caption text-grey-6">
                    <template v-if="ordinalNumber(inst.installmentOrder)">Prestação {{ ordinalNumber(inst.installmentOrder) }}<template v-if="inst.totalInstallments"> de {{ inst.totalInstallments }}</template> · </template>
                    Vence: {{ formatDate(inst.dueDate) }}
                  </div>
                </div>
                <q-badge :color="inst.daysUntilDue <= 7 ? 'negative' : 'orange'" rounded>
                  {{ inst.daysUntilDue }} dias
                </q-badge>
              </div>
              <q-btn
                unelevated
                color="positive"
                icon="payment"
                label="Pagar Prestação"
                no-caps
                class="full-width btn-native"
                @click="openPaymentModal(inst)"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </template>

    <PortalPaymentDialog v-model="showPaymentModal" :installment="selectedInstallment" @paid="refresh()" />
    <PortalLoanRequestDialog v-model="showLoanRequest" @submitted="refresh()" />
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePortalData } from '@/composables/usePortalData'
import PortalPaymentDialog from './PortalPaymentDialog.vue'
import PortalLoanRequestDialog from './PortalLoanRequestDialog.vue'

const { loading, summary, refresh, hasActiveLoan, hasPendingRequest, hasOutstandingDebt, canRequestCredit,
  upcomingInstallments, formatMoney, ordinalNumber, formatDate } = usePortalData()

const showPaymentModal = ref(false)
const selectedInstallment = ref(null)
const showLoanRequest = ref(false)

const kpis = computed(() => [
  {
    label: 'Valor do Crédito Activo',
    value: hasActiveLoan.value ? formatMoney(summary.value.activeLoanAmount) : '—',
    sub: hasActiveLoan.value
      ? `${summary.value.activeLoans} ${summary.value.activeLoans === 1 ? 'crédito activo' : 'créditos activos'}`
      : hasPendingRequest.value ? 'Pedido em análise' : 'Sem crédito activo',
    subClass: hasPendingRequest.value && !hasActiveLoan.value ? 'text-orange' : '',
    icon: 'payments',
    color: 'blue',
    valueClass: hasActiveLoan.value ? 'kpi-value text-primary' : 'kpi-value text-grey-5'
  },
  { label: 'Total Pago', value: formatMoney(summary.value.totalPaid), icon: 'check_circle', color: 'positive', valueClass: 'kpi-value text-positive' },
  { label: 'Saldo Devedor', value: formatMoney(summary.value.totalDebt), icon: 'savings', color: 'warning', valueClass: 'kpi-value text-orange' }
])

function openPaymentModal(inst) {
  selectedInstallment.value = inst
  showPaymentModal.value = true
}
</script>

<style lang="scss" scoped>
.portal-page {
  padding-bottom: 74px;
}

.kpi-card {
  border-radius: 16px;
}

.kpi-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.portal-section-card,
.portal-cta-card {
  border-radius: 16px;
  overflow: hidden;
}

.portal-section-header {
  background-color: $gray-100;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.upcoming-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  background: #ffffff;
}

.portal-debt-card {
  border-radius: 16px;
  background-color: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.25);
}

.portal-debt-text {
  line-height: 1.5;
}

body.body--dark {
  .portal-section-header {
    background-color: rgba(255, 255, 255, 0.04);
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }
  .upcoming-card {
    background: $gray-800;
    border-color: rgba(255, 255, 255, 0.08);
  }
  .portal-debt-card {
    background-color: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.4);
  }
  .kpi-value,
  .text-grey-5,
  .text-grey-6 {
    color: #9ca3af;
  }
}
</style>
