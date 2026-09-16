<template>
  <q-page class="portal-page q-pa-sm">
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar dados...</div>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="row items-center q-mb-sm q-px-xs">
        <div class="col">
          <div class="text-h6 text-weight-bold">Meus Créditos</div>
          <div class="text-caption text-grey-6">Histórico de todos os créditos da sua conta</div>
        </div>
        <q-badge v-if="hasPendingRequest" color="orange" rounded class="q-px-md q-py-sm" style="font-size: 11px">
          Pedido em análise
        </q-badge>
        <q-badge v-else-if="hasOutstandingDebt" color="negative" rounded class="q-px-md q-py-sm" style="font-size: 11px">
          Dívida por liquidar
        </q-badge>
      </div>

      <div v-if="loans.length === 0" class="text-center q-pa-xl">
        <q-icon name="info" size="48px" color="grey-4" />
        <div class="text-h6 text-grey-6 q-mt-md">Nenhum crédito encontrado</div>
        <div class="text-caption text-grey-5 q-mb-md">Ainda não possui créditos na sua conta</div>
        <q-btn v-if="canRequestCredit" unelevated color="primary" icon="add" label="Solicitar Novo Empréstimo" no-caps class="btn-native" @click="showLoanRequest = true" />
      </div>

      <div v-for="loan in loans" :key="loan.id" class="q-mb-sm">
        <q-card flat bordered class="loan-card">
          <q-card-section class="q-pa-sm">
            <div class="row items-center no-wrap q-mb-sm">
              <q-badge :color="getLoanStatusColor(loan.status)" rounded class="q-px-md q-py-sm" style="font-size: 11px">
                {{ getLoanStatusText(loan.status) }}
              </q-badge>
              <q-space />
              <div class="text-caption text-grey-5">Conta {{ customer.accountNumber }}</div>
            </div>

            <div class="loan-stats">
              <div class="loan-stat">
                <div class="text-caption text-grey-5">Valor do Crédito</div>
                <div class="loan-stat-value text-primary">{{ formatMoney(loan.amount) }}</div>
              </div>
              <div class="loan-stat">
                <div class="text-caption text-grey-5">Taxa de Juro</div>
                <div v-if="Number(loan.status) === 0" class="loan-stat-value text-grey-6">A definir</div>
                <div v-else class="loan-stat-value">{{ (loan.interestRate * 100).toFixed(1) }}%</div>
              </div>
              <div class="loan-stat">
                <div class="text-caption text-grey-5">Total Pago</div>
                <div class="loan-stat-value text-positive">{{ formatMoney(loan.totalPaid) }}</div>
              </div>
              <div class="loan-stat">
                <div class="text-caption text-grey-5">Saldo Devedor</div>
                <div class="loan-stat-value text-orange">{{ formatMoney(loan.totalDebt) }}</div>
              </div>
            </div>

            <q-linear-progress
              :value="loan.paidCount / loan.numberOfInstallments"
              color="positive"
              size="8px"
              rounded
              class="q-mt-sm"
            />
            <div class="text-caption text-grey-5 q-mt-xs">
              {{ loan.paidCount }}/{{ loan.numberOfInstallments }} prestações pagas
            </div>

            <div v-if="loan.totalLateFee > 0" class="portal-late-fee q-pa-sm q-mt-sm">
              <div class="text-caption text-negative">
                <q-icon name="warning" size="14px" class="q-mr-xs" />
                Juros de mora: {{ formatMoney(loan.totalLateFee) }}
              </div>
            </div>
          </q-card-section>
          <q-separator v-if="Number(loan.status) === 1" />
          <q-card-actions v-if="Number(loan.status) === 1" class="q-pa-sm">
            <q-btn
              outline
              color="primary"
              icon="receipt_long"
              label="Ver Prestações"
              no-caps
              class="full-width btn-native"
              @click="$router.push('/portal/prestacoes')"
            />
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <PortalLoanRequestDialog v-model="showLoanRequest" @submitted="refresh()" />
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { usePortalData } from '@/composables/usePortalData'
import PortalLoanRequestDialog from './PortalLoanRequestDialog.vue'

const { loading, customer, loans, refresh, hasPendingRequest, hasOutstandingDebt, canRequestCredit,
  formatMoney, getLoanStatusColor, getLoanStatusText } = usePortalData()

const showLoanRequest = ref(false)
</script>

<style lang="scss" scoped>
.portal-page {
  padding-bottom: 74px;
}

.loan-card {
  border-radius: 16px;
  overflow: hidden;
}

.loan-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.loan-stat {
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.03);
  padding: 8px 10px;
}

.loan-stat-value {
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
}

.portal-late-fee {
  background: $red-50;
  border-radius: 12px;
}

body.body--dark {
  .loan-stat {
    background: rgba(255, 255, 255, 0.04);
  }
  .portal-late-fee {
    background: rgba($red-500, 0.12);
  }
  .text-grey-5,
  .text-grey-6 {
    color: #9ca3af;
  }
}
</style>
