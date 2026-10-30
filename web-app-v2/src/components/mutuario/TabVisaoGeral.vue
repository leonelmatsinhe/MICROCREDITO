<template>
  <div class="vg-page">
    <!-- SKELETONS -->
    <template v-if="store.loading && !store.customer">
      <q-skeleton type="rect" height="56px" class="q-mb-md" style="border-radius: 14px" />
      <div class="row q-col-gutter-md">
        <div v-for="i in 4" :key="i" class="col-12 col-sm-6 col-md-3">
          <q-skeleton type="rect" height="96px" style="border-radius: 14px" />
        </div>
      </div>
      <q-skeleton type="rect" height="200px" class="q-mt-lg" style="border-radius: 16px" />
    </template>

    <template v-else-if="store.customer">
      <!-- ── FICHA DE IDENTIFICAÇÃO CADASTRAL & CONTACTOS ── -->
      <div class="vg-card identity-strip q-mb-lg">
        <div class="row items-center justify-between q-col-gutter-sm">
          <div class="col-auto row items-center q-gutter-x-sm">
            <q-chip dense color="primary" text-color="white" icon="badge" class="text-weight-bold" style="font-size: 11px">
              Conta {{ store.customer?.accountNumber }}
            </q-chip>
            <q-chip v-if="store.customer?.customerPhone" dense outline color="grey-8" icon="phone" style="font-size: 11px">
              {{ store.customer.customerPhone }}
            </q-chip>
            <q-chip v-if="store.customer?.customerNuit" dense outline color="grey-8" icon="fingerprint" style="font-size: 11px">
              NUIT: {{ store.customer.customerNuit }}
            </q-chip>
            <q-chip v-if="store.customer?.customerNationalId" dense outline color="grey-8" icon="credit_card" style="font-size: 11px">
              BI: {{ store.customer.customerNationalId }}
            </q-chip>
          </div>
          <div class="col-auto vg-muted gt-xs">
            <span v-if="store.customer?.customerProfession">
              Profissão: <strong class="vg-strong">{{ store.customer.customerProfession }}</strong>
            </span>
            <span v-if="store.customer?.customerAddress" class="q-ml-sm">
              · Endereço: <strong class="vg-strong">{{ store.customer.customerAddress }}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- ── 4 KPIS MESTRES EXECUTIVOS ── -->
      <div class="row q-col-gutter-md">
        <div v-for="kpi in kpis" :key="kpi.label" class="col-12 col-sm-6 col-md-3">
          <div class="vg-card kpi-card full-height">
            <div class="row items-center no-wrap">
              <q-avatar :style="{ background: kpi.bg, color: kpi.color }" size="44px" class="q-mr-md">
                <q-icon :name="kpi.icon" size="22px" />
              </q-avatar>
              <div class="col" style="min-width: 0">
                <div class="vg-label">{{ kpi.label }}</div>
                <div class="kpi-value" :style="{ color: kpi.color }">{{ kpi.value }}</div>
                <div v-if="kpi.sub" class="vg-hint ellipsis">{{ kpi.sub }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════ DESTAQUE: CRÉDITO PENDENTE (o elemento mais importante da tela) ══════════ -->
      <section v-if="pendingLoan" class="pending-hero q-mt-lg" data-tour="mutuario-pending-loan">
        <div class="pending-hero__stripe" />
        <div class="row q-col-gutter-lg items-center">
          <!-- Valor & identificação -->
          <div class="col-12 col-md-5">
            <div class="row items-center q-gutter-x-sm q-mb-sm">
              <span class="pending-status">
                <q-icon name="hourglass_top" size="14px" class="q-mr-xs" />
                {{ pendingLoan.numberOfInstallments }}X PRESTAÇÕES — PENDENTE
              </span>
              <span v-if="otherPendingCount > 0" class="vg-hint">+{{ otherPendingCount }} outro(s) pendente(s)</span>
            </div>
            <div class="vg-label">Crédito #{{ pendingLoan.id }} · aguarda decisão</div>
            <div class="pending-amount">{{ formatMoney(pendingLoan.amount) }}</div>
            <div class="vg-muted q-mt-xs">
              Taxa <strong class="vg-strong">{{ ratePct(pendingLoan.interestRate) }}%/mês</strong>
              · Prestação estimada <strong class="vg-strong">{{ formatMoney(pendingInstallment) }}</strong>
              · Submetido em <strong class="vg-strong">{{ formatDateShort(pendingLoan.dateCreated || pendingLoan.createdAt) }}</strong>
            </div>
          </div>

          <!-- Etapas obrigatórias até ao desembolso -->
          <div class="col-12 col-md-4">
            <div class="vg-label q-mb-sm">Requisitos para desembolso</div>
            <div v-for="step in pendingSteps" :key="step.label" class="pending-step" :class="{ 'is-ok': step.ok }">
              <q-icon :name="step.ok ? 'check_circle' : 'cancel'" :color="step.ok ? 'positive' : 'negative'" size="20px" class="q-mr-sm" />
              <div class="col">
                <div class="pending-step__title">{{ step.label }}</div>
                <div class="vg-hint">{{ step.detail }}</div>
              </div>
            </div>
          </div>

          <!-- Acção principal para o gestor -->
          <div class="col-12 col-md-3">
            <q-btn
              unelevated
              no-caps
              class="full-width pending-cta"
              :color="nextPendingAction.color"
              :icon="nextPendingAction.icon"
              :label="nextPendingAction.label"
              @click="nextPendingAction.handler"
            />
            <div class="vg-hint text-center q-mt-sm">{{ nextPendingAction.hint }}</div>
            <q-btn
              flat
              dense
              no-caps
              color="primary"
              icon="open_in_new"
              label="Ver detalhes do contrato"
              class="full-width q-mt-xs"
              @click="$emit('go-to-tab', 'creditos')"
            />
          </div>
        </div>
      </section>

      <!-- ── FINANCIAMENTO ACTIVO COM PROGRESSO REAL & PRÓXIMA PRESTAÇÃO ── -->
      <section v-if="store.activeLoan" class="vg-card q-mt-lg" data-tour="mutuario-active-loan">
        <div class="row items-center q-col-gutter-md">
          <div class="col-12 col-md-7 row items-center no-wrap">
            <q-avatar size="40px" color="primary" text-color="white" class="q-mr-md">
              <q-icon name="payments" size="20px" />
            </q-avatar>
            <div>
              <div class="row items-center q-gutter-x-sm">
                <div class="vg-title">Financiamento Activo #{{ store.activeLoan.id }}</div>
                <q-badge color="positive" rounded>Activo</q-badge>
              </div>
              <div class="vg-muted">
                Montante <strong class="vg-strong">{{ formatMoney(store.activeLoan.amount) }}</strong> ·
                {{ store.activeLoan.numberOfInstallments }}x prestações ·
                {{ ratePct(store.activeLoan.interestRate) }}%/mês
              </div>
            </div>
          </div>
          <div class="col-12 col-md-5 text-right">
            <div class="vg-label">Amortização do contrato</div>
            <div class="text-weight-bold text-positive" style="font-size: 15px">
              {{ store.activeLoanPaidCount }} de {{ store.activeLoanTotalCount }} prestações
            </div>
          </div>
        </div>

        <q-linear-progress
          :value="store.activeLoanProgress"
          rounded
          size="10px"
          :color="store.activeLoanProgress >= 1 ? 'positive' : 'primary'"
          track-color="grey-3"
          class="q-my-md"
        />

        <div v-if="store.activeLoanNextInstallment" class="next-installment row items-center q-col-gutter-md">
          <div class="col-12 col-md-7 row items-center no-wrap">
            <q-icon
              :name="store.activeLoanNextInstallment.isOverdue ? 'error' : 'event'"
              :color="store.activeLoanNextInstallment.isOverdue ? 'negative' : 'primary'"
              size="26px"
              class="q-mr-sm"
            />
            <div>
              <div class="vg-strong text-weight-bold">
                {{ store.activeLoanNextInstallment.installmentOrder }}ª prestação · vence {{ formatDateShort(store.activeLoanNextInstallment.dueDate) }}
              </div>
              <div class="row items-center q-gutter-x-xs q-mt-xs">
                <q-badge v-if="store.activeLoanNextInstallment.isOverdue" color="negative" rounded>
                  {{ store.activeLoanNextInstallment.daysOverdue }} dias em atraso
                </q-badge>
                <q-badge v-else-if="store.activeLoanNextInstallment.daysLeft === 0" color="deep-orange-9" rounded>Vence hoje</q-badge>
                <q-badge v-else color="positive" outline rounded>Vence em {{ store.activeLoanNextInstallment.daysLeft }} dias</q-badge>
                <span v-if="store.activeLoanNextInstallment.latePaymentInterest > 0" class="text-negative text-caption text-weight-bold">
                  · Mora {{ formatMoney(store.activeLoanNextInstallment.latePaymentInterest) }}
                </span>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-5 text-right">
            <div class="vg-label">Total deste vencimento</div>
            <div class="text-h6 text-weight-bolder text-negative">{{ formatMoney(store.activeLoanNextInstallment.totalDue) }}</div>
            <q-btn flat dense no-caps color="primary" icon="table_chart" label="Ver plano" @click="$emit('go-to-tab', 'amortizacao')" />
          </div>
        </div>
        <div v-else class="vg-muted text-center q-py-sm">
          <q-icon name="check_circle" color="positive" size="20px" class="q-mr-xs" />
          Todas as prestações deste financiamento foram integralmente amortizadas.
        </div>
      </section>

      <!-- ── 2 COLUNAS: ACÇÕES + RISCO vs LINHA DO TEMPO ── -->
      <div class="row q-col-gutter-lg q-mt-md">
        <div class="col-12 col-lg-5">
          <!-- OPERAÇÕES DE BALCÃO: 1 acção principal + 3 secundárias discretas -->
          <section class="vg-card q-mb-lg">
            <div class="vg-section-title q-mb-md">
              <q-icon name="bolt" size="18px" color="primary" class="q-mr-xs" />
              Operações de balcão
            </div>

            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="paid"
              class="full-width primary-action"
              @click="$emit('register-payment')"
            >
              <div class="column items-start q-ml-sm text-left">
                <span class="text-weight-bold" style="font-size: 15px">Receber Prestação</span>
                <span class="primary-action__sub">{{ receiveHint }}</span>
              </div>
            </q-btn>

            <div class="row q-col-gutter-sm q-mt-sm">
              <div class="col-4">
                <q-btn flat no-caps class="full-width secondary-action" icon="picture_as_pdf" label="Extracto" @click="$emit('print-extract')">
                  <q-tooltip>Emitir extracto em PDF</q-tooltip>
                </q-btn>
              </div>
              <div class="col-4">
                <q-btn flat no-caps class="full-width secondary-action" icon="account_balance_wallet" label="Liquidar" @click="$emit('liquidate')">
                  <q-tooltip>Liquidação antecipada total</q-tooltip>
                </q-btn>
              </div>
              <div class="col-4">
                <q-btn flat no-caps class="full-width secondary-action is-warning" icon="campaign" label="Cobrar" @click="$emit('open-collection')">
                  <q-tooltip>Atenção: envia notificação de cobrança ao mutuário (SMS/WhatsApp)</q-tooltip>
                </q-btn>
              </div>
            </div>
          </section>

          <!-- COBERTURA DE GARANTIAS (ICR) — alerta de risco quando inexistente -->
          <section v-if="!hasGuarantees" class="risk-alert q-mb-lg">
            <div class="row no-wrap items-start">
              <q-avatar size="40px" class="risk-alert__icon q-mr-md">
                <q-icon name="gpp_bad" size="22px" />
              </q-avatar>
              <div class="col">
                <div class="risk-alert__eyebrow">Risco de crédito · Exigência Banco de Moçambique</div>
                <div class="risk-alert__title">Sem garantias registadas</div>
                <div class="risk-alert__text">
                  {{ guaranteeTargetLabel }} não tem cobertura colateral (ICR 0%).
                  Registe o penhor de bens antes de aprovar ou desembolsar.
                </div>
                <q-btn
                  unelevated
                  no-caps
                  color="deep-orange-9"
                  text-color="white"
                  icon="add_moderator"
                  label="Registar garantia agora"
                  class="q-mt-md risk-alert__btn"
                  @click="$emit('go-to-tab', 'garantias')"
                />
              </div>
            </div>
          </section>

          <section v-else class="vg-card q-mb-lg">
            <div class="row items-center justify-between q-mb-sm">
              <div class="vg-section-title">
                <q-icon name="shield" size="18px" color="primary" class="q-mr-xs" />
                Cobertura de garantias (ICR)
              </div>
              <q-btn flat dense no-caps color="primary" label="Ver garantias" size="sm" @click="$emit('go-to-tab', 'garantias')" />
            </div>
            <div class="row items-center justify-between q-mb-xs">
              <span class="vg-muted">Avaliação total: <strong class="vg-strong">{{ formatMoney(store.guaranteeCoverage.guaranteesTotal) }}</strong></span>
              <q-badge :color="store.guaranteeCoverage.covered ? 'positive' : 'negative'" rounded>
                {{ store.guaranteeCoverage.coveragePct }}% coberto
              </q-badge>
            </div>
            <q-linear-progress
              :value="Math.min(1, (store.guaranteeCoverage.coveragePct || 0) / 100)"
              rounded
              size="10px"
              :color="store.guaranteeCoverage.covered ? 'positive' : 'negative'"
              track-color="grey-3"
              class="q-my-sm"
            />
            <div v-if="store.guaranteeCoverage.covered" class="text-positive text-weight-bold text-caption">
              <q-icon name="check_circle" size="14px" /> Cobertura suficiente para mitigar o saldo devedor.
            </div>
            <div v-else class="text-negative text-weight-bold text-caption">
              <q-icon name="warning" size="14px" /> Défice colateral: faltam {{ formatMoney(store.guaranteeCoverage.shortfall) }}.
            </div>
          </section>

          <!-- TAXA DE ESFORÇO (DTI) -->
          <section class="vg-card">
            <div class="row items-center justify-between q-mb-sm">
              <div class="vg-section-title">
                <q-icon name="analytics" size="18px" color="primary" class="q-mr-xs" />
                Taxa de esforço (DTI)
              </div>
              <q-badge v-if="store.dtiStatus.ratio > 0" :color="store.dtiStatus.color" rounded class="text-weight-bold">
                {{ store.dtiStatus.percentStr }} · {{ store.dtiStatus.label }}
              </q-badge>
            </div>
            <div class="vg-muted q-mb-sm">
              A prestação contratual (<strong class="vg-strong">{{ formatMoney(store.currentInstallmentAmount) }}</strong>) compromete
              <strong :class="`text-${store.dtiStatus.color}`">{{ store.dtiStatus.percentStr }}</strong> do salário de
              <strong class="vg-strong">{{ formatMoney(store.customer?.customerMonthlySalary || 0) }}</strong>.
            </div>
            <q-linear-progress
              :value="Math.min(1, store.dtiRatio / 100)"
              rounded
              size="10px"
              :color="store.dtiStatus.color"
              track-color="grey-3"
            />
            <div class="row justify-between vg-hint q-mt-xs">
              <span>0%</span>
              <span class="text-weight-bold">Teto BM 33%</span>
              <span class="text-negative text-weight-bold">Crítico &gt;50%</span>
            </div>
            <q-separator class="q-my-md" />
            <div class="row items-center justify-between">
              <span class="vg-muted">Margem livre de endividamento</span>
              <strong :class="freeCapacity > 0 ? 'text-positive' : 'text-negative'" style="font-size: 15px">
                {{ formatMoney(freeCapacity) }}
              </strong>
            </div>
          </section>
        </div>

        <!-- LINHA DO TEMPO 360° -->
        <div class="col-12 col-lg-7">
          <section class="vg-card timeline-card" data-tour="mutuario-feed">
            <div class="vg-section-title q-mb-sm">
              <q-icon name="history" size="18px" color="primary" class="q-mr-xs" />
              Linha do tempo do mutuário
              <q-space />
              <span class="vg-hint">{{ filteredTimeline.length }} evento(s)</span>
            </div>

            <q-tabs
              v-model="feedFilter"
              dense
              no-caps
              align="left"
              active-color="primary"
              indicator-color="primary"
              class="timeline-tabs"
              :breakpoint="0"
            >
              <q-tab v-for="t in feedTabs" :key="t.value" :name="t.value">
                <div class="row items-center no-wrap">
                  <span>{{ t.label }}</span>
                  <q-badge v-if="t.count > 0" rounded color="grey-3" text-color="grey-9" class="q-ml-xs" :label="t.count" />
                </div>
              </q-tab>
            </q-tabs>
            <q-separator />

            <div class="timeline-scroll">
              <div v-if="filteredTimeline.length > 0" class="tl">
                <div v-for="event in filteredTimeline" :key="event.id" class="tl-item">
                  <div class="tl-node" :class="`tl-node--${event.type}`">
                    <q-icon :name="nodeIcon(event.type)" size="16px" />
                  </div>
                  <div class="tl-body">
                    <div class="row items-center no-wrap q-gutter-x-sm">
                      <div class="tl-title col">{{ event.title }}</div>
                      <span class="tl-tag" :class="`tl-tag--${event.type}`">{{ eventTypeLabel(event.type) }}</span>
                    </div>
                    <div class="tl-sub">{{ event.subtitle }}</div>
                    <div class="tl-date">{{ formatDate(event.date) }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center q-pa-xl text-grey-5">
                <q-icon name="inbox" size="44px" />
                <div class="text-caption q-mt-sm">Nenhum evento registado nesta categoria.</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMutuarioStore } from '@/stores/mutuario'
import { formatMoney, formatDateShort } from '@/utils/formatters'

const emit = defineEmits(['register-payment', 'liquidate', 'open-collection', 'print-extract', 'go-to-tab', 'approve-loan'])

const store = useMutuarioStore()
const feedFilter = ref('all')

const ratePct = (r) => (Number(r || 0) * 100).toFixed(1)

const freeCapacity = computed(() => Math.max(0, store.maxCapacity - store.currentInstallmentAmount))

// ── CRÉDITO PENDENTE EM DESTAQUE ──
const pendingLoans = computed(() =>
  store.loans.filter(l => Number(l.status) === 0).sort((a, b) => Number(b.id) - Number(a.id))
)
const pendingLoan = computed(() => pendingLoans.value[0] || null)
const otherPendingCount = computed(() => Math.max(0, pendingLoans.value.length - 1))

// Prestação Price estimada (apenas indicativa; o valor oficial vem do backend na aprovação)
const pendingInstallment = computed(() => {
  const l = pendingLoan.value
  if (!l) return 0
  const P = Number(l.amount) || 0
  const i = Number(l.interestRate) || 0
  const n = Number(l.numberOfInstallments) || 1
  if (i <= 0) return P / n
  return (P * i) / (1 - Math.pow(1 + i, -n))
})

// Cobertura: se não há crédito activo, avaliar as garantias do crédito pendente
watch(
  () => [store.activeLoan?.id, pendingLoan.value?.id],
  ([activeId, pendingId]) => {
    if (!activeId && pendingId) store.fetchGuaranteeCoverage(pendingId)
  },
  { immediate: true }
)

const hasGuarantees = computed(() => Number(store.guaranteeCoverage?.guaranteesTotal || 0) > 0)
const guaranteeTargetLabel = computed(() => {
  if (store.activeLoan) return `O crédito activo #${store.activeLoan.id}`
  if (pendingLoan.value) return `O crédito pendente #${pendingLoan.value.id}`
  return 'Este mutuário'
})

const pendingSteps = computed(() => [
  {
    label: 'Dossier KYC',
    ok: store.isKycComplete,
    detail: store.isKycComplete ? 'Documentos base completos' : `Falta: ${store.kycMissing.join(', ') || '—'}`
  },
  {
    label: 'Garantias',
    ok: hasGuarantees.value,
    detail: hasGuarantees.value ? `${store.guaranteeCoverage?.coveragePct ?? 0}% de cobertura` : 'Nenhuma garantia registada'
  },
  {
    label: 'Aprovação & desembolso',
    ok: false,
    detail: 'Aguarda decisão do gestor'
  }
])

// A acção principal segue a ordem real do processo: KYC → Garantias → Aprovação
const nextPendingAction = computed(() => {
  if (!store.isKycComplete) {
    return {
      label: 'Completar KYC',
      icon: 'lock_open',
      color: 'deep-orange-9',
      hint: 'Desembolso bloqueado até o dossier estar completo',
      handler: () => emit('go-to-tab', 'docs')
    }
  }
  if (!hasGuarantees.value) {
    return {
      label: 'Registar garantia',
      icon: 'add_moderator',
      color: 'deep-orange-9',
      hint: 'Exigência BM antes do desembolso',
      handler: () => emit('go-to-tab', 'garantias')
    }
  }
  return {
    label: 'Rever e aprovar',
    icon: 'task_alt',
    color: 'primary',
    hint: 'Todos os requisitos cumpridos',
    handler: () => emit('approve-loan', pendingLoan.value)
  }
})

const receiveHint = computed(() => {
  const next = store.activeLoanNextInstallment
  if (next) return `${next.installmentOrder}ª prestação · ${formatMoney(next.totalDue)}`
  return 'Sem prestações em aberto'
})

const kpis = computed(() => [
  {
    label: 'Total financiado',
    value: formatMoney(store.totalFinanciado),
    icon: 'account_balance_wallet',
    color: '#0369a1',
    bg: 'rgba(14,165,233,0.12)',
    sub: `${store.loans.length} financiamento(s)`
  },
  {
    label: 'Total amortizado / pago',
    value: formatMoney(store.totalPago),
    icon: 'check_circle',
    color: '#047857',
    bg: 'rgba(16,185,129,0.12)',
    sub: 'Capital e juros liquidados'
  },
  {
    label: 'Saldo devedor',
    value: formatMoney(store.saldoRemanescente),
    icon: 'savings',
    color: store.saldoRemanescente > 0 ? '#b91c1c' : '#047857',
    bg: store.saldoRemanescente > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
    sub: store.saldoRemanescente > 0 ? 'Exposição viva da carteira' : 'Totalmente regularizado'
  },
  {
    label: 'Próximo vencimento',
    value: store.proximoVencimento ? formatDateShort(store.proximoVencimento) : 'Regularizado',
    icon: 'event',
    color: '#b45309',
    bg: 'rgba(245,158,11,0.14)',
    sub: store.activeLoanNextInstallment ? `${store.activeLoanNextInstallment.installmentOrder}ª prestação` : 'Sem vencimentos'
  }
])

// ── LINHA DO TEMPO (sem o crédito pendente, que já está em destaque) ──
const baseTimeline = computed(() =>
  store.timelineEvents.filter(e => !(pendingLoan.value && e.id === `loan-${pendingLoan.value.id}`))
)
const feedTabs = computed(() => {
  const count = (type) => baseTimeline.value.filter(e => e.type === type).length
  return [
    { label: 'Todos', value: 'all', count: baseTimeline.value.length },
    { label: 'Pagamentos', value: 'payment', count: count('payment') },
    { label: 'Créditos', value: 'loan', count: count('loan') },
    { label: 'Cobrança', value: 'collection', count: count('collection') },
    { label: 'Documentos', value: 'document', count: count('document') }
  ]
})
const filteredTimeline = computed(() =>
  feedFilter.value === 'all' ? baseTimeline.value : baseTimeline.value.filter(e => e.type === feedFilter.value)
)

function nodeIcon(type) {
  return { payment: 'receipt_long', loan: 'request_quote', collection: 'campaign', document: 'description' }[type] || 'circle'
}

function eventTypeLabel(type) {
  return { payment: 'Pagamento', loan: 'Crédito', collection: 'Cobrança', document: 'Documento' }[type] || 'Evento'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-MZ', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style lang="scss" scoped>
$green-900: #14532d;
$ink: #0f172a;
$ink-2: #334155;
$muted: #64748b;
$line: #e2e8f0;

.vg-page {
  padding: 20px 20px 96px; // espaço inferior para o botão flutuante de tours
}

.vg-card {
  background: #fff;
  border: 1px solid $line;
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.04);
}

.identity-strip { padding: 10px 16px; }

.vg-title { font-size: 16px; font-weight: 700; color: $ink; letter-spacing: -0.2px; }
.vg-section-title { display: flex; align-items: center; font-size: 15px; font-weight: 700; color: $ink; }
.vg-label { font-size: 12px; font-weight: 600; color: $ink-2; }
.vg-muted { font-size: 12.5px; color: $muted; line-height: 1.5; }
.vg-hint { font-size: 11px; color: #94a3b8; }
.vg-strong { color: $ink; }

.kpi-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08); }
}
.kpi-value { font-size: 18px; font-weight: 800; letter-spacing: -0.4px; line-height: 1.3; }

// ── Destaque do crédito pendente ──
.pending-hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #fffbeb 0%, #ffffff 55%);
  border: 1px solid #fcd34d;
  border-radius: 18px;
  padding: 22px 24px 22px 30px;
  box-shadow: 0 6px 24px rgba(180, 83, 9, 0.10);
}
.pending-hero__stripe {
  position: absolute; left: 0; top: 0; bottom: 0; width: 6px;
  background: linear-gradient(180deg, #d97706, #b45309);
}
.pending-status {
  display: inline-flex; align-items: center;
  background: #b45309; color: #fff;
  font-size: 11px; font-weight: 800; letter-spacing: 0.6px;
  padding: 5px 10px; border-radius: 999px;
}
.pending-amount {
  font-size: 34px; font-weight: 800; color: $ink; letter-spacing: -1px; line-height: 1.15;
}
.pending-step {
  display: flex; align-items: flex-start;
  padding: 8px 10px; border-radius: 10px; margin-bottom: 6px;
  background: #fef2f2; border: 1px solid #fecaca;
  &.is-ok { background: #f0fdf4; border-color: #bbf7d0; }
}
.pending-step__title { font-size: 13px; font-weight: 700; color: $ink; }
.pending-cta { height: 52px; border-radius: 12px; font-size: 15px; font-weight: 700; }

.next-installment {
  background: #f8fafc; border: 1px solid $line; border-radius: 12px; padding: 10px 6px; margin: 0;
}

// ── Operações de balcão ──
.primary-action {
  min-height: 60px; border-radius: 14px; justify-content: flex-start;
  box-shadow: 0 6px 16px rgba(20, 83, 45, 0.25);
  :deep(.q-btn__content) { justify-content: flex-start; }
}
.primary-action__sub { font-size: 11.5px; opacity: 0.85; font-weight: 500; }
.secondary-action {
  border: 1px solid $line; border-radius: 10px; color: $ink-2; font-size: 12.5px; padding: 6px 4px;
  &:hover { background: #f8fafc; }
  &.is-warning { color: #c2410c; border-color: #fed7aa; &:hover { background: #fff7ed; } }
}

// ── Alerta de garantias (risco) ──
.risk-alert {
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-left: 6px solid #c2410c;
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 4px 16px rgba(194, 65, 12, 0.10);
}
.risk-alert__icon { background: #c2410c; color: #fff; }
.risk-alert__eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #c2410c; }
.risk-alert__title { font-size: 17px; font-weight: 800; color: #7c2d12; margin-top: 2px; }
.risk-alert__text { font-size: 13px; color: #9a3412; margin-top: 4px; line-height: 1.5; }
.risk-alert__btn { border-radius: 10px; height: 42px; padding: 0 18px; font-weight: 700; }

// ── Linha do tempo ──
.timeline-card { padding-bottom: 8px; }
.timeline-tabs :deep(.q-tab) { padding: 0 10px; min-height: 38px; font-weight: 600; }
.timeline-scroll { max-height: 440px; overflow-y: auto; padding: 16px 4px 8px 2px; }

.tl { position: relative; }
.tl-item {
  position: relative; display: flex; gap: 14px; padding-bottom: 18px;
  &::before { // linha vertical que liga os eventos
    content: ''; position: absolute; left: 15px; top: 34px; bottom: 0; width: 2px; background: $line;
  }
  &:last-child { padding-bottom: 4px; &::before { display: none; } }
}
.tl-node {
  flex: 0 0 32px; width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; color: #fff;
  box-shadow: 0 0 0 4px #fff;
  &--loan { background: #b45309; }
  &--payment { background: #047857; }
  &--collection { background: #c2410c; }
  &--document { background: #475569; }
}
.tl-body {
  flex: 1; min-width: 0; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 12px; padding: 10px 12px;
}
.tl-title { font-size: 13.5px; font-weight: 700; color: $ink; }
.tl-sub { font-size: 12px; color: $muted; margin-top: 2px; }
.tl-date { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.tl-tag {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; white-space: nowrap;
  &--loan { background: #fef3c7; color: #92400e; }
  &--payment { background: #d1fae5; color: #065f46; }
  &--collection { background: #ffedd5; color: #9a3412; }
  &--document { background: #e2e8f0; color: #334155; }
}

body.body--dark {
  .vg-card, .tl-body, .next-installment { background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.08); }
  .vg-title, .vg-section-title, .vg-strong, .tl-title, .pending-amount, .pending-step__title { color: #f1f5f9; }
  .vg-label { color: #cbd5e1; }
  .pending-hero { background: rgba(180, 83, 9, 0.08); border-color: rgba(252, 211, 77, 0.35); }
  .tl-node { box-shadow: 0 0 0 4px #121212; }
}
</style>
