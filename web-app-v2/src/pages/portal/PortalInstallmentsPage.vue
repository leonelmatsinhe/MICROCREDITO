<template>
  <q-page class="portal-page q-pa-sm">
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar prestações...</div>
    </div>

    <template v-else>
      <!-- HEADER BANCÁRIO DO MÓDULO DE PRESTAÇÕES -->
      <div class="installments-header-card q-pa-md q-mb-sm">
        <div class="row items-center justify-between no-wrap">
          <div>
            <div class="text-h6 text-weight-bolder text-grey-9 row items-center">
              <span>Gestão de Prestações</span>
              <q-badge color="positive" rounded class="q-ml-sm text-bold" style="font-size: 11px">
                {{ filteredInstallments.length }}
              </q-badge>
            </div>
            <div class="text-caption text-grey-6">
              Liquidação instantânea via M-Pesa Open API com emissão de recibo legal AT
            </div>
          </div>
          <q-btn
            v-if="filterLoanId"
            flat
            dense
            color="primary"
            icon="filter_alt_off"
            label="Limpar filtro"
            no-caps
            class="text-caption"
            @click="clearLoanFilter"
          />
        </div>

        <!-- RESUMO RÁPIDO DO ESTADO DAS PRESTAÇÕES -->
        <div class="row q-col-gutter-xs q-mt-xs">
          <div class="col-4" v-if="overdueCount > 0">
            <div class="stat-pill is-overdue text-center q-pa-xs">
              <div class="text-caption text-negative font-11">Em Atraso</div>
              <div class="text-weight-bolder text-negative">{{ overdueCount }}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="stat-pill is-pending text-center q-pa-xs">
              <div class="text-caption text-grey-7 font-11">Em Aberto</div>
              <div class="text-weight-bolder text-grey-9">{{ pendingCount }}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="stat-pill is-paid text-center q-pa-xs">
              <div class="text-caption text-positive font-11">Liquidadas</div>
              <div class="text-weight-bolder text-positive">{{ paidCount }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredInstallments.length === 0" class="empty-state text-center text-grey-5 q-pa-xl">
        <q-icon name="assignment_turned_in" size="48px" class="q-mb-sm" />
        <div class="text-subtitle1 text-weight-bold">Nenhuma prestação encontrada</div>
      </div>

      <div v-else class="q-gutter-y-sm">
        <div
          v-for="instItem in visibleInstallments"
          :key="instItem.id"
          class="bank-inst-card"
          :class="{
            'is-overdue': Number(instItem.status) !== 1 && Number(instItem.lateDays) > 0,
            'is-paid': Number(instItem.status) === 1,
            'is-partial': Number(instItem.status) === -1
          }"
        >
          <!-- TOPO DO CARD: ORDINAL, STATUS E DATA -->
          <div class="row items-center justify-between no-wrap q-mb-sm">
            <div class="row items-center no-wrap">
              <div
                class="bank-order-circle q-mr-sm"
                :class="{
                  'bg-negative text-white': Number(instItem.status) !== 1 && Number(instItem.lateDays) > 0,
                  'bg-positive text-white': Number(instItem.status) === 1,
                  'bg-orange-8 text-white': Number(instItem.status) === -1,
                  'bg-grey-3 text-grey-8': Number(instItem.status) === 0 && !(Number(instItem.lateDays) > 0)
                }"
              >
                {{ ordinalNumber(instItem.installmentOrder) || '#' }}
              </div>
              <div>
                <div class="text-weight-bolder text-grey-9" style="font-size: 14px">
                  Prestação {{ ordinalNumber(instItem.installmentOrder) }}
                  <span class="text-caption text-grey-6">· Crédito #{{ instItem.loanId }}</span>
                </div>
                <div class="text-caption text-grey-6">
                  Vencimento: <strong class="text-grey-8">{{ formatDate(instItem.dueDate) }}</strong>
                </div>
              </div>
            </div>

            <!-- BADGE DE STATUS -->
            <div>
              <q-badge
                v-if="Number(instItem.status) === 1"
                color="positive"
                class="text-bold q-px-sm q-py-xs"
              >
                <q-icon name="check_circle" size="12px" class="q-mr-xs" /> Paga
              </q-badge>
              <q-badge
                v-else-if="Number(instItem.lateDays) > 0"
                color="negative"
                class="text-bold q-px-sm q-py-xs animate-pulse"
              >
                <q-icon name="warning" size="12px" class="q-mr-xs" /> {{ instItem.lateDays }} dias em atraso
              </q-badge>
              <q-badge
                v-else-if="Number(instItem.status) === -1"
                color="orange-9"
                class="text-bold q-px-sm q-py-xs"
              >
                Parcial
              </q-badge>
              <q-badge
                v-else
                color="primary"
                outline
                class="text-bold q-px-sm q-py-xs"
              >
                Em Aberto
              </q-badge>
            </div>
          </div>

          <!-- DETALHE FINANCEIRO: QUANDO PAGA -->
          <template v-if="Number(instItem.status) === 1">
            <div class="row q-col-gutter-xs inst-meta-grid q-mb-xs">
              <div class="col-6">
                <div class="meta-item">
                  <div class="text-caption text-grey-6 font-11">Total Liquidado</div>
                  <div class="text-weight-bolder text-positive">{{ formatMoney(Number(instItem.paidAmount) + installmentPaidLateFee(instItem)) }}</div>
                  <div v-if="installmentPaidLateFee(instItem) > 0" class="text-caption text-grey-5 font-10">Prestação: {{ formatMoney(instItem.paidAmount) }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="meta-item">
                  <div class="text-caption text-grey-6 font-11">Mora Liquidada</div>
                  <div class="text-weight-bold" :class="installmentPaidLateFee(instItem) > 0 ? 'text-positive' : 'text-grey-6'">
                    {{ formatMoney(installmentPaidLateFee(instItem)) }}
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="meta-item">
                  <div class="text-caption text-grey-6 font-11">Data de Quitação</div>
                  <div class="text-weight-bold text-grey-8 font-12">{{ installmentPaidDate(instItem) }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="meta-item">
                  <div class="text-caption text-grey-6 font-11">Recibo M-Pesa</div>
                  <div class="text-weight-bold text-primary font-11 ellipsis">{{ installmentPayments(instItem).length > 1 ? `${installmentPayments(instItem).length} pagamentos M-Pesa` : installmentReference(instItem) }}</div>
                </div>
              </div>
            </div>
          </template>

          <!-- DETALHE FINANCEIRO: QUANDO PENDENTE OU EM ATRASO -->
          <template v-else>
            <!-- CASO 1: EM ATRASO COM MORA -->
            <div v-if="Number(instItem.latePaymentInterest) > 0" class="mora-breakdown-box q-pa-sm q-mb-sm">
              <div class="row justify-between items-center text-caption q-mb-xs">
                <span class="text-grey-7">Valor da Prestação:</span>
                <span class="text-weight-bold text-grey-9">{{ formatMoney(instItem.installment) }}</span>
              </div>
              <div class="row justify-between items-center text-caption q-mb-xs text-negative">
                <span>Juros de Mora ({{ instItem.lateDays }} dias):</span>
                <span class="text-weight-bolder">+ {{ formatMoney(instItem.latePaymentInterest) }}</span>
              </div>
              <q-separator class="q-my-xs" />
              <div class="row justify-between items-center">
                <span class="text-caption text-weight-bolder text-grey-9">Total para Regularização:</span>
                <span class="text-subtitle1 text-weight-bolder text-primary">
                  {{ formatMoney(Math.max(0, Number(instItem.installment || 0) - Number(instItem.paidAmount || 0)) + Number(instItem.latePaymentInterest || 0)) }}
                </span>
              </div>
            </div>

            <!-- CASO 2: SEM ATRASO -->
            <div v-else class="row justify-between items-center q-pa-sm q-mb-sm bg-grey-1 rounded-borders">
              <div>
                <div class="text-caption text-grey-6 font-11">Valor da Prestação</div>
                <div class="text-subtitle1 text-weight-bolder text-primary">{{ formatMoney(instItem.installment) }}</div>
              </div>
              <div v-if="Number(instItem.paidAmount) > 0" class="text-right">
                <div class="text-caption text-grey-6 font-11">Já Amortizado</div>
                <div class="text-weight-bold text-positive">{{ formatMoney(instItem.paidAmount) }}</div>
              </div>
            </div>

            <!-- BOTÃO DE AÇÃO M-PESA -->
            <q-btn
              unelevated
              color="positive"
              icon="payments"
              :label="getPaymentButtonLabel(instItem)"
              no-caps
              class="full-width btn-inst-pay"
              @click="openPaymentModal(instItem)"
            />
          </template>
        </div>

        <!-- VER MAIS -->
        <div v-if="visibleCount < filteredInstallments.length" class="text-center q-pt-sm">
          <q-btn
            flat
            color="primary"
            :label="`Ver mais (${filteredInstallments.length - visibleCount} restantes)`"
            no-caps
            class="text-weight-bold"
            @click="showMore"
          />
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

const {
  loading, refresh, allInstallments, formatMoney, formatDate,
  getInstallmentStatusText, installmentAvatarColor, installmentCardClass,
  installmentPayments, installmentPaidLateFee, installmentPaidDate, installmentReference, ordinalNumber
} = usePortalData()

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

const overdueCount = computed(() => filteredInstallments.value.filter(i => Number(i.status) !== 1 && Number(i.lateDays) > 0).length)
const pendingCount = computed(() => filteredInstallments.value.filter(i => Number(i.status) !== 1 && !(Number(i.lateDays) > 0)).length)
const paidCount = computed(() => filteredInstallments.value.filter(i => Number(i.status) === 1).length)

function showMore() { visibleCount.value += 10 }
function clearLoanFilter() { filterLoanId.value = null; visibleCount.value = 10 }

function openPaymentModal(inst) {
  selectedInstallment.value = inst
  showPaymentModal.value = true
}

function getPaymentButtonLabel(inst) {
  const lateFee = Number(inst?.latePaymentInterest) || 0
  if (lateFee > 0) {
    return 'Pagar Prestação c/ Mora'
  }
  if (Number(inst?.paidAmount) > 0) {
    return 'Completar Prestação'
  }
  return 'Pagar via M-Pesa'
}
</script>

<style lang="scss" scoped>
.portal-page {
  padding-bottom: 74px;
}

.installments-header-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.stat-pill {
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;

  &.is-overdue {
    background: #fff5f5;
    border-color: #fed7d7;
  }
  &.is-paid {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }
}

.bank-inst-card {
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px;
  background: #ffffff;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);

  &.is-overdue {
    border-color: #feb2b2;
    border-left: 5px solid #e53e3e;
    background: #fffafa;
  }

  &.is-paid {
    border-color: #bbf7d0;
    border-left: 5px solid #10b981;
    background: #fcfdfc;
  }

  &.is-partial {
    border-color: #fbd38d;
    border-left: 5px solid #dd6b20;
    background: #fffaf0;
  }
}

.bank-order-circle {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
}

.inst-meta-grid .meta-item {
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  padding: 6px 8px;
}

.mora-breakdown-box {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 10px;
}

.btn-inst-pay {
  min-height: 46px;
  border-radius: 12px;
  font-weight: 700;
  letter-spacing: 0.2px;
  background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
}

.font-11 { font-size: 11px; }
.font-12 { font-size: 12px; }

@keyframes pulse-dot {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.animate-pulse {
  animation: pulse-dot 2s infinite ease-in-out;
}
</style>
