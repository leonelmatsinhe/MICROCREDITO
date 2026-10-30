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

      <!-- TIMELINE DO PEDIDO EM ANÁLISE -->
      <q-card v-if="hasPendingRequest" flat bordered class="q-mb-sm timeline-card">
        <q-card-section class="q-pa-sm bg-orange-1 text-orange-10 row items-center justify-between">
          <div class="row items-center">
            <q-icon name="pending_actions" size="20px" class="q-mr-xs" />
            <span class="text-subtitle2 text-weight-bold">Acompanhamento do Pedido de Crédito</span>
          </div>
          <q-badge color="orange" rounded>Em Análise</q-badge>
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="text-caption text-grey-8 q-mb-md">
            Solicitou <strong>{{ formatMoney(summary.pendingAmount) }}</strong>. O seu pedido está a ser avaliado pela equipa de crédito.
          </div>

          <div class="timeline-steps row items-center justify-between text-center">
            <div class="step-item col">
              <q-avatar size="28px" color="positive" text-color="white" class="q-mb-xs">
                <q-icon name="check" size="16px" />
              </q-avatar>
              <div class="step-label text-weight-bold text-positive">Submetido</div>
              <div class="step-sub text-grey-6">Pelo portal</div>
            </div>

            <div class="step-line col-grow bg-positive"></div>

            <div class="step-item col">
              <q-avatar size="28px" color="orange" text-color="white" class="q-mb-xs">
                <q-spinner-dots size="16px" color="white" />
              </q-avatar>
              <div class="step-label text-weight-bold text-orange">Análise</div>
              <div class="step-sub text-grey-6">Gestor de Crédito</div>
            </div>

            <div class="step-line col-grow bg-grey-4"></div>

            <div class="step-item col">
              <q-avatar size="28px" color="grey-4" text-color="grey-7" class="q-mb-xs">
                <q-icon name="gavel" size="16px" />
              </q-avatar>
              <div class="step-label text-grey-6">Aprovação</div>
              <div class="step-sub text-grey-5">Administração</div>
            </div>

            <div class="step-line col-grow bg-grey-4"></div>

            <div class="step-item col">
              <q-avatar size="28px" color="grey-4" text-color="grey-7" class="q-mb-xs">
                <q-icon name="payments" size="16px" />
              </q-avatar>
              <div class="step-label text-grey-6">Desembolso</div>
              <div class="step-sub text-grey-5">Via M-Pesa</div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- ALERTA DE PRESTAÇÃO EM ATRASO (ALTA PRIORIDADE BANCÁRIA) -->
      <q-card v-if="overdueInstallments.length > 0" flat class="overdue-hero-card q-mb-sm">
        <q-card-section class="q-pa-md">
          <div class="row items-center justify-between no-wrap q-mb-xs">
            <div class="row items-center no-wrap text-negative text-weight-bolder" style="font-size: 14px">
              <q-avatar size="28px" color="red-1" text-color="negative" class="q-mr-xs">
                <q-icon name="warning" size="18px" />
              </q-avatar>
              <span>Regularização Pendente ({{ overdueInstallments.length }} em atraso)</span>
            </div>
            <q-badge color="negative" class="text-bold">Mora Acumulada</q-badge>
          </div>
          <div class="text-caption text-grey-8 q-mb-sm">
            Tem prestações com juros de mora legais acumulados. Regularize agora via M-Pesa Open API.
          </div>

          <div v-for="overdue in overdueInstallments" :key="overdue.id" class="overdue-item-box q-pa-sm q-mb-xs">
            <div class="row items-center justify-between no-wrap q-mb-xs">
              <div>
                <div class="text-weight-bold text-grey-9" style="font-size: 13px">
                  Prestação {{ ordinalNumber(overdue.installmentOrder) }} · Crédito #{{ overdue.loanId }}
                </div>
                <div class="text-caption text-negative font-11">
                  Venceu a {{ formatDate(overdue.dueDate) }} ({{ overdue.lateDays }} dias em atraso)
                </div>
              </div>
              <div class="text-right">
                <div class="text-caption text-grey-6 font-11">Total c/ Mora</div>
                <div class="text-subtitle1 text-weight-bolder text-primary">
                  {{ formatMoney(Math.max(0, Number(overdue.installment || 0) - Number(overdue.paidAmount || 0)) + Number(overdue.latePaymentInterest || 0)) }}
                </div>
              </div>
            </div>

            <q-btn
              unelevated
              color="positive"
              icon="payments"
              label="Pagar Prestação c/ Mora"
              no-caps
              class="full-width btn-inst-pay q-mt-xs"
              @click="openPaymentModal(overdue)"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Dívida por liquidar (apenas quando não há alerta de atraso prioritário) -->
      <q-card v-if="hasOutstandingDebt && (!overdueInstallments || overdueInstallments.length === 0)" flat class="portal-debt-card q-mb-sm">
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

      <!-- CTA PARA SIMULAÇÃO OU NOVO CRÉDITO -->
      <q-card v-else-if="!hasPendingRequest" flat bordered class="portal-cta-card q-mb-sm">
        <q-card-section class="row items-center no-wrap q-pa-sm">
          <q-avatar
            icon="monetization_on"
            color="primary"
            text-color="white"
            size="38px"
            class="q-mr-sm"
          />
          <div class="col" style="min-width: 0">
            <div class="text-subtitle2 text-weight-bold">
              Precisa de um novo crédito?
            </div>
            <div class="text-caption text-grey-6">
              Simule o valor da prestação ou submeta o pedido com carregamento directo de comprovativos.
            </div>
          </div>
        </q-card-section>
        <template v-if="canRequestCredit">
          <q-separator />
          <q-card-actions class="q-pa-sm row q-gutter-xs">
            <q-btn
              outline
              color="primary"
              icon="calculate"
              label="Simular Crédito"
              no-caps
              class="col btn-native"
              @click="showSimulatorModal = true"
            />
            <q-btn
              unelevated
              color="primary"
              icon="add"
              label="Solicitar Empréstimo"
              no-caps
              class="col btn-native"
              @click="openLoanRequest"
            />
          </q-card-actions>
        </template>
      </q-card>

      <!-- Próximas Prestações -->
      <q-card flat bordered class="portal-section-card q-mb-sm">
        <q-card-section class="portal-section-header q-py-sm">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <q-icon name="event" size="20px" color="primary" class="q-mr-sm" />
              <div class="text-subtitle1 text-weight-bold">Próximas Prestações</div>
            </div>
            <q-chip v-if="upcomingInstallments.length > 0" dense color="primary" text-color="white" size="xs">
              M-Pesa Directo
            </q-chip>
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
                icon="payments"
                label="Pagar via M-Pesa"
                no-caps
                class="full-width btn-native"
                @click="openPaymentModal(inst)"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- CARTÃO: MEU GESTOR DE CRÉDITO DEDICADO -->
      <q-card flat bordered class="portal-section-card q-mb-sm">
        <q-card-section class="q-pa-sm row items-center justify-between no-wrap">
          <div class="row items-center no-wrap">
            <q-avatar size="38px" color="teal-7" text-color="white" class="q-mr-sm">
              <q-icon name="support_agent" size="22px" />
            </q-avatar>
            <div>
              <div class="text-subtitle2 text-weight-bold">Gestor de Crédito Dedicado</div>
              <div class="text-caption text-grey-6">Esclarecimentos, renegociações e apoio directo</div>
            </div>
          </div>

          <div class="row q-gutter-xs">
            <q-btn
              round
              dense
              flat
              color="positive"
              icon="chat"
              :href="whatsappUrl"
              target="_blank"
            >
              <q-tooltip>Falar no WhatsApp</q-tooltip>
            </q-btn>
            <q-btn
              round
              dense
              flat
              color="primary"
              icon="call"
              :href="phoneCallUrl"
            >
              <q-tooltip>Ligar para o Gestor</q-tooltip>
            </q-btn>
          </div>
        </q-card-section>
      </q-card>
    </template>

    <PortalSimulatorDialog v-model="showSimulatorModal" @apply="onSimulationApplied" />
    <PortalPaymentDialog v-model="showPaymentModal" :installment="selectedInstallment" @paid="refresh()" />
    <PortalLoanRequestDialog v-model="showLoanRequest" :preset="simulatorPreset" @submitted="refresh()" />
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePortalData } from '@/composables/usePortalData'
import PortalPaymentDialog from './PortalPaymentDialog.vue'
import PortalLoanRequestDialog from './PortalLoanRequestDialog.vue'
import PortalSimulatorDialog from './PortalSimulatorDialog.vue'

const { loading, summary, refresh, hasActiveLoan, hasPendingRequest, hasOutstandingDebt, canRequestCredit,
  overdueInstallments, upcomingInstallments, formatMoney, ordinalNumber, formatDate, customer } = usePortalData()

const showPaymentModal = ref(false)
const selectedInstallment = ref(null)
const showLoanRequest = ref(false)
const showSimulatorModal = ref(false)
const simulatorPreset = ref(null)

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

const gestorPhone = computed(() => '258840000000') // Número padrão de suporte/gestão da empresa

const whatsappUrl = computed(() => {
  const phone = String(gestorPhone.value).replace(/\D/g, '')
  const text = encodeURIComponent(`Olá, sou o mutuário ${customer.value?.name || ''} (Conta: ${customer.value?.accountNumber || ''}). Gostaria de obter informações sobre o meu crédito.`)
  return `https://wa.me/${phone}?text=${text}`
})

const phoneCallUrl = computed(() => {
  return `tel:${gestorPhone.value}`
})

function openPaymentModal(inst) {
  selectedInstallment.value = inst
  showPaymentModal.value = true
}

function openLoanRequest() {
  simulatorPreset.value = null
  showLoanRequest.value = true
}

function onSimulationApplied(sim) {
  simulatorPreset.value = {
    amount: sim.amount,
    installments: sim.installments
  }
  showLoanRequest.value = true
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
.portal-cta-card,
.timeline-card {
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

.timeline-steps {
  position: relative;
  margin: 8px 0;
}

.step-item {
  position: relative;
  z-index: 2;
}

.step-label {
  font-size: 11px;
  line-height: 1.2;
}

.step-sub {
  font-size: 9px;
}

.step-line {
  height: 3px;
  margin: 0 4px;
  margin-top: -16px;
  z-index: 1;
}

.btn-native {
  min-height: 42px;
  border-radius: 10px;
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
  .timeline-card {
    background: $gray-800;
  }
}

.overdue-hero-card {
  background: #fff5f5;
  border: 1.5px solid #feb2b2;
  border-left: 5px solid #e53e3e;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(229, 62, 62, 0.08);
}

.overdue-item-box {
  background: #ffffff;
  border: 1px solid #fed7d7;
  border-radius: 12px;
}

.btn-inst-pay {
  min-height: 44px;
  border-radius: 10px;
  font-weight: 700;
  background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
}

.font-11 { font-size: 11px; }

</style>
