<template>
  <div class="portal-container">
    <!-- Header: nome da empresa com logo + perfil do mutuário -->
    <q-header class="bg-primary text-white">
      <q-toolbar>
        <q-avatar square size="30px" class="portal-logo q-mr-sm">
          <img :src="companyStore.companyLogo" alt="Logo" />
        </q-avatar>
        <q-toolbar-title class="portal-company-name">
          {{ companyStore.companyName }}
        </q-toolbar-title>
        <q-btn
          flat
          round
          dense
          :icon="isDark ? 'light_mode' : 'dark_mode'"
          @click="uiStore.toggleDark()"
        >
          <q-tooltip>{{ isDark ? 'Modo Claro' : 'Modo Escuro' }}</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="person" aria-label="Perfil">
          <q-tooltip>O meu perfil</q-tooltip>
          <!-- Sem @click nem fit: o q-menu abre/fecha automaticamente no clique do alvo;
               um @click manual causaria duplo-toggle e o menu nunca abriria -->
          <q-menu v-model="profileMenu" :offset="[0, 8]">
            <div class="portal-profile-menu q-pa-md">
              <div class="row items-center no-wrap q-mb-sm">
                <q-avatar size="44px" color="primary" text-color="white" class="q-mr-sm">
                  {{ getInitials(customer?.name) }}
                </q-avatar>
                <div class="col" style="min-width: 0">
                  <div class="text-weight-bold" style="font-size: 14px; word-break: break-word">
                    {{ customer?.name || '—' }}
                  </div>
                  <div class="text-caption text-grey-6">Conta {{ customer?.accountNumber || '—' }}</div>
                </div>
              </div>
              <q-separator class="q-mb-sm" />
              <div class="portal-profile-row">
                <q-icon name="phone" size="16px" class="text-grey-6" />
                <span>{{ customer?.phone || '—' }}</span>
              </div>
              <div class="portal-profile-row">
                <q-icon name="email" size="16px" class="text-grey-6" />
                <span class="portal-profile-email">{{ customer?.email || '—' }}</span>
              </div>
              <div class="portal-profile-row">
                <q-icon name="event" size="16px" class="text-grey-6" />
                <span>Registado em {{ formatDate(customer?.registrationDate) }}</span>
              </div>
            </div>
          </q-menu>
        </q-btn>
        <q-btn flat round dense icon="logout" @click="handleLogout">
          <q-tooltip>Sair</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Main Content -->
    <q-page-container>
      <q-page class="portal-page">

        <!-- Loading -->
        <div v-if="loading" class="text-center q-pa-xl">
          <q-spinner-dots size="40px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-sm">A carregar dados...</div>
        </div>

        <!-- Dashboard Tab -->
        <template v-else-if="tab === 'dashboard'">
          <!-- KPIs -->
          <div class="row q-col-gutter-sm q-mb-md">
            <div v-for="kpi in kpis" :key="kpi.label" class="col-12 col-sm-4">
              <q-card flat bordered class="kpi-card">
                <q-card-section class="row items-center no-wrap">
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

          <!-- Solicitar novo empréstimo (bloqueado quando há dívida por liquidar) -->
          <q-card v-if="hasOutstandingDebt" class="portal-debt-card q-mb-md">
            <q-card-section class="row items-center no-wrap">
              <q-avatar icon="credit_off" color="negative" text-color="white" size="38px" class="q-mr-sm" />
              <div class="col" style="min-width: 0">
                <div class="text-subtitle1 text-weight-bold text-negative">Dívida por liquidar</div>
                <div class="text-caption text-grey-7 portal-debt-text">
                  Só pode solicitar um novo crédito quando toda a dívida estiver liquidada.
                  <strong>Saldo devedor actual: {{ formatMoney(summary.totalDebt) }}</strong>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card v-else flat bordered class="portal-cta-card q-mb-md">
            <q-card-section class="row items-center no-wrap">
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
                  rounded
                  class="full-width"
                  @click="openLoanRequest"
                />
              </q-card-actions>
            </template>
          </q-card>

          <!-- Próximas Prestações -->
          <q-card flat bordered class="portal-section-card">
            <q-card-section class="portal-section-header">
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
                  <div class="row items-center no-wrap">
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
                    <div class="column items-end" style="gap: 6px">
                      <q-badge :color="inst.daysUntilDue <= 7 ? 'negative' : 'orange'" rounded>
                        {{ inst.daysUntilDue }} dias
                      </q-badge>
                      <q-btn flat round dense icon="payment" color="positive" size="sm" @click="openPaymentModal(inst)">
                        <q-tooltip>Pagar</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </template>

        <!-- Loans Tab -->
        <template v-else-if="tab === 'loans'">
          <div class="row items-center q-mb-md">
            <div class="col">
              <div class="text-subtitle1 text-weight-bold">Meus Créditos</div>
              <div class="text-caption text-grey-6">Histórico de todos os créditos da sua conta</div>
            </div>
            <div class="col-auto">
              <q-badge v-if="hasPendingRequest" color="orange" rounded class="q-px-md q-py-sm" style="font-size: 11px">
                Pedido em análise
              </q-badge>
              <q-badge v-else-if="hasOutstandingDebt" color="negative" rounded class="q-px-md q-py-sm" style="font-size: 11px">
                Dívida por liquidar
              </q-badge>
              <q-btn
                v-else
                unelevated
                color="primary"
                icon="add"
                label="Solicitar Novo Empréstimo"
                no-caps
                rounded
                size="sm"
                @click="openLoanRequest"
              />
            </div>
          </div>

          <div v-if="loans.length === 0" class="text-center q-pa-xl">
            <q-icon name="info" size="48px" color="grey-4" />
            <div class="text-h6 text-grey-6 q-mt-md">Nenhum crédito encontrado</div>
            <div class="text-caption text-grey-5 q-mb-md">Ainda não possui créditos na sua conta</div>
            <q-btn v-if="canRequestCredit" unelevated color="primary" icon="add" label="Solicitar Novo Empréstimo" no-caps rounded @click="openLoanRequest" />
          </div>

          <div v-for="loan in loans" :key="loan.id" class="q-mb-md">
            <q-card flat bordered class="loan-card">
              <q-card-section>
                <div class="row items-center no-wrap q-mb-sm">
                  <q-chip :color="getLoanStatusColor(loan.status)" text-color="white" size="sm" dense>
                    {{ getLoanStatusText(loan.status) }}
                  </q-chip>
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

                <!-- Progresso -->
                <q-linear-progress
                  :value="loan.paidCount / loan.numberOfInstallments"
                  color="positive"
                  size="8px"
                  rounded
                  class="q-mt-md"
                />
                <div class="text-caption text-grey-5 q-mt-xs">
                  {{ loan.paidCount }}/{{ loan.numberOfInstallments }} prestações pagas
                </div>

                <!-- Juros de Mora -->
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
                  unelevated
                  outline
                  color="primary"
                  icon="receipt_long"
                  label="Ver Prestações"
                  no-caps
                  rounded
                  class="full-width"
                  @click="openLoanInstallments(loan)"
                />
              </q-card-actions>
            </q-card>
          </div>
        </template>

        <!-- Installments Tab -->
        <template v-else-if="tab === 'installments'">
          <q-card flat bordered class="portal-section-card">
            <q-card-section class="portal-section-header">
              <div class="row items-center no-wrap">
                <q-icon name="receipt_long" size="20px" color="primary" class="q-mr-sm" />
                <div class="col" style="min-width: 0">
                  <div class="text-subtitle1 text-weight-bold">Todas as Prestações</div>
                  <div v-if="filterLoanId" class="text-caption text-grey-6">Crédito #{{ filterLoanId }} · <span class="text-primary" @click="clearLoanFilter">ver todas</span></div>
                </div>
                <q-badge color="primary" rounded>{{ filteredInstallments.length }} registos</q-badge>
              </div>
            </q-card-section>
            <q-card-section class="q-pa-sm">
              <div v-if="filteredInstallments.length === 0" class="text-center text-grey-5 q-pa-lg">
                Nenhuma prestação encontrada
              </div>
              <div v-else class="q-gutter-y-sm">
                <div
                  v-for="inst in visibleInstallments"
                  :key="inst.id"
                  class="installment-card"
                  :class="installmentCardClass(inst)"
                >
                  <!-- Cabeçalho: ordem + estado + vencimento -->
                  <div class="row items-center no-wrap q-mb-xs">
                    <q-avatar :color="installmentAvatarColor(inst)" text-color="white" size="34px" class="q-mr-sm">
                      {{ ordinalNumber(inst.installmentOrder) || '—' }}
                    </q-avatar>
                    <div class="col" style="min-width: 0">
                      <div class="text-weight-bold" style="font-size: 13px">{{ getInstallmentStatusText(inst.status) }}</div>
                      <div class="text-caption text-grey-6">Vence: {{ formatDate(inst.dueDate) }}</div>
                    </div>
                    <div v-if="inst.status !== 1" class="text-right">
                      <div class="text-caption text-grey-6">Prestação</div>
                      <div class="text-subtitle1 text-weight-bold text-primary">{{ formatMoney(inst.installment) }}</div>
                    </div>
                  </div>

                  <!-- PAGA: apenas valor pago, mora aplicada, data do pagamento e referência -->
                  <template v-if="inst.status === 1">
                    <div class="row q-col-gutter-sm installment-meta">
                      <div class="col-6">
                        <div class="text-caption text-grey-6">Valor pago</div>
                        <div class="text-weight-bold text-positive">{{ formatMoney(inst.paidAmount) }}</div>
                      </div>
                      <div class="col-6">
                        <div class="text-caption text-grey-6">Juros de mora aplicado</div>
                        <div class="text-weight-bold" :class="installmentPaidLateFee(inst) > 0 ? 'text-negative' : 'text-grey-6'">
                          {{ formatMoney(installmentPaidLateFee(inst)) }}
                        </div>
                      </div>
                      <div class="col-6">
                        <div class="text-caption text-grey-6">Data do pagamento</div>
                        <div class="text-weight-bold" style="font-size: 13px">{{ installmentPaidDate(inst) }}</div>
                      </div>
                      <div class="col-6">
                        <div class="text-caption text-grey-6">Referência</div>
                        <div class="text-weight-bold text-grey-8" style="font-size: 12px; overflow-wrap: anywhere">{{ installmentReference(inst) }}</div>
                      </div>
                    </div>
                  </template>

                  <!-- PENDENTE: valor + vencimento; atraso/mora apenas se venceu -->
                  <template v-else>
                    <div v-if="Number(inst.lateDays) > 0" class="row q-col-gutter-sm installment-meta">
                      <div class="col-6">
                        <div class="text-caption text-grey-6">Dias em atraso</div>
                        <div class="text-weight-bold text-negative">
                          {{ inst.lateDays }} {{ Number(inst.lateDays) === 1 ? 'dia' : 'dias' }}
                        </div>
                      </div>
                      <div class="col-6">
                        <div class="text-caption text-grey-6">Juros de mora</div>
                        <div class="text-weight-bold text-negative">{{ formatMoney(inst.latePaymentInterest) }}</div>
                      </div>
                    </div>
                    <q-btn
                      unelevated
                      color="positive"
                      icon="payment"
                      :label="Number(inst.paidAmount) > 0 ? 'Continuar Pagamento' : 'Pagar Prestação'"
                      no-caps
                      rounded
                      class="full-width q-mt-sm"
                      @click="openPaymentModal(inst)"
                    />
                  </template>
                </div>

                <!-- Ver mais -->
                <div v-if="visibleCount < filteredInstallments.length" class="text-center q-pt-sm">
                  <q-btn flat color="primary" :label="`Ver mais (${filteredInstallments.length - visibleCount} restantes)`" no-caps @click="showMore" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </template>

        <!-- Payments Tab -->
        <template v-else-if="tab === 'payments'">
          <q-card flat bordered class="portal-section-card">
            <q-card-section class="portal-section-header">
              <div class="row items-center no-wrap">
                <q-icon name="account_balance_wallet" size="20px" color="primary" class="q-mr-sm" />
                <div class="col" style="min-width: 0">
                  <div class="text-subtitle1 text-weight-bold">Histórico de Pagamentos</div>
                  <div class="text-caption text-grey-6">Inclui a prestação liquidada e a referência</div>
                </div>
                <q-btn
                  v-if="loans.length > 0"
                  unelevated
                  outline
                  color="primary"
                  icon="picture_as_pdf"
                  label="Extracto PDF"
                  no-caps
                  rounded
                  dense
                  :loading="generatingPdf"
                  @click="openExtractPicker"
                />
              </div>
            </q-card-section>
            <q-card-section class="q-pa-sm">
              <div v-if="allPayments.length === 0" class="text-center text-grey-5 q-pa-md">
                Nenhum pagamento registado
              </div>
              <div v-else class="q-gutter-y-sm">
                <div v-for="payment in allPayments" :key="payment.id" class="payment-card">
                  <div class="row items-center no-wrap">
                    <q-avatar :color="payment.status === 'completed' ? 'positive' : 'warning'" text-color="white" size="36px" class="q-mr-sm">
                      <q-icon :name="payment.status === 'completed' ? 'check' : 'schedule'" size="18px" />
                    </q-avatar>
                    <div class="col" style="min-width: 0">
                      <div class="text-weight-bold" style="font-size: 15px">{{ formatMoney(payment.amount) }}</div>
                      <div class="text-caption text-grey-6" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                        Ref: {{ payment.reference || 'N/A' }}
                      </div>
                      <div v-if="payment.installmentOrder" class="text-caption text-primary q-mt-xs">
                        Prestação {{ ordinalBadge(payment.installmentOrder) }}
                      </div>
                    </div>
                    <div class="text-right" style="flex-shrink: 0">
                      <div class="text-caption text-grey-5">{{ formatDate(payment.createdAt) }}</div>
                      <div v-if="paymentMethodLabel(payment.paymentMethod)" class="text-caption text-grey-6">
                        {{ paymentMethodLabel(payment.paymentMethod) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </template>
      </q-page>
    </q-page-container>

    <!-- Navegação inferior (fixa, substitui o sidebar removido) -->
    <div class="portal-bottom-nav">
      <div class="row">
        <q-btn flat stack no-caps class="col" :class="tab === 'dashboard' ? 'text-primary' : 'text-grey-6'" icon="dashboard" label="Painel" @click="goTab('dashboard')" />
        <q-btn flat stack no-caps class="col" :class="tab === 'loans' ? 'text-primary' : 'text-grey-6'" icon="payments" label="Créditos" @click="goTab('loans')" />
        <q-btn flat stack no-caps class="col" :class="tab === 'installments' ? 'text-primary' : 'text-grey-6'" icon="receipt_long" label="Prestações" @click="goTab('installments')" />
        <q-btn flat stack no-caps class="col" :class="tab === 'payments' ? 'text-primary' : 'text-grey-6'" icon="account_balance_wallet" label="Pagamentos" @click="goTab('payments')" />
      </div>
    </div>

    <!-- Payment Modal -->
    <q-dialog
      v-model="showPaymentModal"
      persistent
      :position="$q.screen.lt.sm ? 'bottom' : 'standard'"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card :style="paymentSheetStyle">
        <q-card-section class="row items-center bg-positive text-white" style="border-radius: inherit">
          <q-icon name="payment" size="24px" class="q-mr-sm" />
          <div class="text-h6">Pagamento de Prestação</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showPaymentModal = false" />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <!-- Resumo da prestação -->
          <q-card flat bordered class="q-mb-md" style="border-radius: 8px">
            <q-card-section>
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <div class="text-caption text-grey-5">Prestação</div>
                  <div class="text-h6 text-weight-bold text-primary">
                    {{ formatMoney(selectedInstallment?.installment) }}
                  </div>
                  <div class="text-caption text-grey-6" v-if="ordinalNumber(selectedInstallment?.installmentOrder)">
                    Prestação {{ ordinalNumber(selectedInstallment.installmentOrder) }}<template v-if="paymentTotalInstallments"> de {{ paymentTotalInstallments }}</template>
                  </div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Vencimento</div>
                  <div class="text-h6">{{ formatDate(selectedInstallment?.dueDate) }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Já pago</div>
                  <div class="text-weight-bold text-positive">{{ formatMoney(paymentAlreadyPaid) }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-5">Saldo em falta</div>
                  <div class="text-weight-bold text-orange">{{ formatMoney(paymentRemaining) }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Método de pagamento -->
          <div class="text-subtitle2 text-grey-6 q-mb-sm">Método de Pagamento</div>
          <q-btn-toggle
            v-model="paymentMethod"
            :options="[
              { label: 'M-Pesa', value: 'mpesa', icon: 'phone_android' },
              { label: 'Transferência', value: 'transfer', icon: 'account_balance' }
            ]"
            push
            glossy
            no-caps
            class="q-mb-md full-width"
            toggle-color="positive"
          />

          <!-- M-Pesa -->
          <template v-if="paymentMethod === 'mpesa'">
            <q-input
              v-model="paymentPhone"
              label="Número M-Pesa (12 dígitos)"
              dense
              outlined
              maxlength="12"
              class="q-mb-sm"
              inputmode="numeric"
              :error="paymentPhone.length > 0 && !isValidMpesaPhone"
              error-message="Número inválido — deve ter 12 dígitos e começar por 25884 ou 25885"
              @update:model-value="sanitizePhoneInput"
            >
              <template v-slot:prepend>
                <q-icon name="phone_android" size="18px" />
              </template>
            </q-input>
            <div class="text-caption text-grey-6 q-mb-md">
              Ex.: 258 84 000 000 · Números M-Pesa começam por 84 ou 85.
            </div>
            <div class="text-caption text-grey-6 q-mb-md">
              <q-icon name="phone_android" size="13px" class="q-mr-xs" />Pressione <strong>Pagar</strong> e aguarde <strong>10 segundos</strong> para digitar o seu PIN M-Pesa.
            </div>
          </template>

          <!-- Transferência bancária: apenas informativa (pagamento offline, sem registo na BD) -->
          <template v-else>
            <q-card flat bordered class="q-mb-sm" style="border-radius: 8px; background: rgba(255, 152, 0, 0.08)">
              <q-card-section class="q-py-sm row items-center no-wrap">
                <q-icon name="info_outline" size="20px" color="orange" class="q-mr-sm" />
                <div class="text-caption" style="line-height: 1.5">
                  Pagamento <strong>offline</strong>: transfira <strong>{{ formatMoney(paymentRemaining) }}</strong> para a conta da empresa indicada e conserve o comprovativo. O registo será feito pela instituição após confirmação.
                </div>
              </q-card-section>
            </q-card>
            <q-btn
              unelevated
              outline
              color="primary"
              icon="account_balance"
              label="Ver contas bancárias"
              no-caps
              rounded
              class="q-mb-sm"
              @click="openAccounts"
            />
            <q-card v-if="selectedAccount" flat bordered class="q-mb-sm" style="border-radius: 8px">
              <q-card-section class="q-py-sm row items-center no-wrap">
                <q-icon name="check_circle" color="positive" size="20px" class="q-mr-sm" />
                <div class="col" style="min-width: 0">
                  <div class="text-caption text-grey-5">{{ selectedAccount.accountDescription || 'Conta bancária' }}</div>
                  <div class="text-weight-bold" style="font-size: 13px">{{ selectedAccount.accountNumber }}</div>
                  <div class="text-caption text-grey-6" v-if="selectedAccount.accountHolder">{{ selectedAccount.accountHolder }}</div>
                </div>
                <q-btn flat round dense icon="edit" size="sm" color="grey-6" @click="openAccounts">
                  <q-tooltip>Alterar conta</q-tooltip>
                </q-btn>
              </q-card-section>
            </q-card>
            <div v-else class="text-caption text-orange q-mb-md">Escolha a conta da empresa para onde vai efectuar a transferência.</div>
          </template>

          <!-- Valor (apenas M-Pesa) -->
          <template v-if="paymentMethod === 'mpesa'">
            <q-input
              v-model.number="paymentAmount"
              label="Valor a pagar (MZN)"
              dense
              outlined
              type="number"
              :min="paymentMinAmount || 0"
              :max="paymentMaxAmount || 0"
              step="0.01"
              class="q-mb-sm"
              :error="amountError && Number(paymentAmount) > 0"
              :error-message="`O valor deve estar entre ${formatMoney(paymentMinAmount)} e ${formatMoney(paymentMaxAmount)}`"
            >
              <template v-slot:prepend>
                <q-icon name="attach_money" size="18px" />
              </template>
            </q-input>
            <div class="text-caption text-grey-6 q-mb-md">
              Pode pagar entre <strong>15%</strong> da prestação ({{ formatMoney(paymentMinAmount) }}) e o saldo em falta ({{ formatMoney(paymentMaxAmount) }}).
            </div>
          </template>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showPaymentModal = false" />
          <q-btn
            v-if="paymentMethod === 'mpesa'"
            unelevated
            label="Pagar via M-Pesa"
            icon="phone_android"
            color="positive"
            no-caps
            rounded
            class="q-ml-sm"
            :loading="paying"
            :disable="!canSubmitPayment"
            @click="processPayment"
          />
          <q-btn
            v-else
            unelevated
            label="Concluir"
            icon="check"
            color="positive"
            no-caps
            rounded
            class="q-ml-sm"
            @click="finishTransferInfo"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Escolher crédito para gerar o Extracto PDF -->
    <q-dialog v-model="showExtractPicker">
      <q-card style="border-radius: 16px; width: 100%; max-width: 430px; min-width: 0">
        <q-card-section class="row items-center bg-primary text-white" style="border-radius: 16px 16px 0 0">
          <q-icon name="picture_as_pdf" size="22px" class="q-mr-sm" />
          <div class="text-h6">Extracto do Crédito</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showExtractPicker = false" />
        </q-card-section>
        <q-card-section>
          <div class="text-body2 text-grey-6 q-mb-sm">Seleccione o crédito para gerar o extracto em PDF:</div>
          <q-list separator>
            <q-item v-for="loan in loans" :key="loan.id" clickable v-ripple @click="downloadCreditExtract(loan)">
              <q-item-section avatar>
                <q-avatar :color="getLoanStatusColor(loan.status)" text-color="white" size="36px">
                  <q-icon name="payments" size="18px" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>Crédito #{{ loan.id }}</q-item-label>
                <q-item-label caption>{{ formatMoney(loan.amount) }} · {{ getLoanStatusText(loan.status) }} · {{ loan.numberOfInstallments }} prestações</q-item-label>
              </q-item-section>
              <q-item-section side><q-icon name="chevron_right" /></q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Contas bancárias da empresa (transferência) -->
    <q-dialog v-model="showAccountsModal">
      <q-card style="border-radius: 16px; width: 100%; max-width: 480px; min-width: 0">
        <q-card-section class="row items-center bg-primary text-white" style="border-radius: 16px 16px 0 0">
          <q-icon name="account_balance" size="22px" class="q-mr-sm" />
          <div class="text-h6">Contas Bancárias da Empresa</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showAccountsModal = false" />
        </q-card-section>
        <q-card-section>
          <div v-if="loadingAccounts" class="text-center q-pa-lg">
            <q-spinner-dots size="36px" color="primary" />
          </div>
          <template v-else-if="companyAccounts.length > 0">
            <q-list separator>
              <q-item
                v-for="account in companyAccounts"
                :key="account.id"
                clickable
                v-ripple
                :active="selectedAccount && Number(selectedAccount.id) === Number(account.id)"
                active-class="text-primary"
                @click="chooseAccount(account)"
              >
                <q-item-section avatar>
                  <q-avatar :color="selectedAccount && Number(selectedAccount.id) === Number(account.id) ? 'primary' : 'grey-5'" text-color="white" size="36px">
                    <q-icon name="account_balance" size="18px" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ account.accountDescription || 'Conta bancária' }}</q-item-label>
                  <q-item-label caption>{{ account.accountNumber }}</q-item-label>
                  <q-item-label v-if="account.accountHolder" caption>{{ account.accountHolder }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-xs no-wrap">
                    <q-btn flat round dense icon="content_copy" size="sm" color="grey-6" @click.stop="copyAccountNumber(account)">
                      <q-tooltip>Copiar número</q-tooltip>
                    </q-btn>
                    <q-icon v-if="selectedAccount && Number(selectedAccount.id) === Number(account.id)" name="check_circle" color="positive" size="22px" />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </template>
          <div v-else class="text-center q-pa-lg text-grey-5">
            <q-icon name="account_balance" size="44px" />
            <div class="q-mt-sm">A instituição ainda não registou contas bancárias.</div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Novo Pedido de Empréstimo -->
    <q-dialog v-model="showLoanRequest" persistent>
      <q-card style="border-radius: 16px; width: 100%; max-width: 430px; min-width: 0">
        <q-card-section class="row items-center bg-primary text-white">
          <q-icon name="add_circle" size="24px" class="q-mr-sm" />
          <div class="text-h6">Solicitar Novo Empréstimo</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showLoanRequest = false" />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="text-body2 text-grey-6 q-mb-md">
            Preencha os dados pretendidos. O pedido será analisado pela instituição antes da aprovação.
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-12">
              <q-input
                v-model.number="loanRequest.amount"
                label="Montante pretendido (MTn)"
                dense
                outlined
                type="number"
                class="q-mb-sm"
                :rules="[v => v > 0 || 'Indique o montante pretendido']"
              >
                <template v-slot:prepend>
                  <q-icon name="attach_money" size="18px" />
                </template>
              </q-input>
            </div>
            <div class="col-12">
              <q-select
                v-model="loanRequest.numberOfInstallments"
                :options="installmentOptions"
                label="Nº de prestações (meses)"
                dense
                outlined
                emit-value
                map-options
                class="q-mb-sm"
                :rules="[v => !!v || 'Obrigatório']"
              />
              <div class="text-caption text-grey-6 q-mb-sm">Prazo entre 1 e 18 meses.</div>
            </div>
          </div>

          <!-- Nota: taxa definida pela instituição -->
          <q-card flat bordered class="q-mb-md" style="border-radius: 8px">
            <q-card-section class="q-py-sm row items-center no-wrap">
              <q-icon name="info_outline" size="20px" color="primary" class="q-mr-sm" />
              <div class="text-caption" style="line-height: 1.5">
                A <strong>taxa de juro</strong> e o valor da <strong>prestação mensal</strong> serão definidos pela instituição durante a análise do pedido.
                <template v-if="loanRequestCapacity > 0">
                  Capacidade indicativa de pagamento (1/3 do rendimento): <strong>{{ formatMoney(loanRequestCapacity) }}</strong>.
                </template>
              </div>
            </q-card-section>
          </q-card>

          <q-input
            v-model="loanRequest.loanDescription"
            label="Finalidade do crédito"
            dense
            outlined
            type="textarea"
            rows="2"
            class="q-mb-sm"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" no-caps @click="showLoanRequest = false" />
          <q-btn
            unelevated
            label="Enviar Pedido"
            color="primary"
            icon="send"
            no-caps
            rounded
            :loading="submittingRequest"
            :disable="!canSubmitLoanRequest"
            @click="submitLoanRequest"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useCompanyStore } from '@/stores/company'
import { api } from '@/boot/axios'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()
const companyStore = useCompanyStore()

const isDark = computed(() => uiStore.isDark)

const tab = ref('dashboard')
const loading = ref(true)
const profileMenu = ref(false)

const customer = ref(null)
const summary = ref({ totalLoans: 0, activeLoans: 0, activeLoanAmount: 0, pendingLoans: 0, pendingAmount: 0, totalDisbursed: 0, totalPaid: 0, totalDebt: 0 })
const loans = ref([])
const allPayments = ref([])

// New loan request modal
const showLoanRequest = ref(false)
const submittingRequest = ref(false)
const loanRequest = ref({
  amount: null,
  numberOfInstallments: null,
  loanDescription: ''
})
// Prazo de prestações (1 a 18 meses), como no Admin/Gestor
const installmentOptions = Array.from({ length: 18 }, (_, i) => ({
  label: `${i + 1} ${i === 0 ? 'mês' : 'meses'}`,
  value: i + 1
}))

// Payment modal
const showPaymentModal = ref(false)
const selectedInstallment = ref(null)
const paymentPhone = ref('')
const paymentAmount = ref(0)
const paymentMethod = ref('mpesa')
const paying = ref(false)

// Contas bancárias da empresa (transferência — apenas informativo)
const showAccountsModal = ref(false)
const loadingAccounts = ref(false)
const companyAccounts = ref([])
const selectedAccount = ref(null)

// Extracto do crédito em PDF (como no Admin/Gestor)
const generatingPdf = ref(false)
const showExtractPicker = ref(false)

const hasActiveLoan = computed(() => Number(summary.value.activeLoans || 0) > 0)
const hasPendingRequest = computed(() => Number(summary.value.pendingLoans || 0) > 0)
// Só é possível solicitar novo crédito quando toda a dívida estiver liquidada
const hasOutstandingDebt = computed(() => Number(summary.value.totalDebt || 0) > 0)
const canRequestCredit = computed(() => !hasPendingRequest.value && !hasOutstandingDebt.value)

// Capacidade indicativa (1/3 do rendimento mensal) — só informativa
const loanRequestCapacity = computed(() => (Number(customer.value?.monthlySalary) || 0) / 3)

const canSubmitLoanRequest = computed(() => {
  const amountOk = Number(loanRequest.value.amount) > 0
  const installments = Number(loanRequest.value.numberOfInstallments)
  const installmentsOk = Number.isInteger(installments) && installments >= 1 && installments <= 18
  return amountOk && installmentsOk
})

// ---- Pagamento de prestação ----
const paymentInstallmentValue = computed(() => Number(selectedInstallment.value?.installment) || 0)
const paymentAlreadyPaid = computed(() => Number(selectedInstallment.value?.paidAmount) || 0)
const paymentRemaining = computed(() =>
  Math.max(0, Math.round((paymentInstallmentValue.value - paymentAlreadyPaid.value) * 100) / 100)
)
const paymentMinAmount = computed(() => {
  if (paymentRemaining.value <= 0) return 0
  const min15 = Math.round(paymentInstallmentValue.value * 0.15 * 100) / 100
  return Math.min(paymentRemaining.value, min15)
})
const paymentMaxAmount = computed(() => paymentRemaining.value)
const isValidMpesaPhone = computed(() => /^258(84|85)\d{7}$/.test(paymentPhone.value))
const amountError = computed(() => {
  const v = Number(paymentAmount.value)
  if (!(v > 0) || paymentMaxAmount.value <= 0) return false
  return v < paymentMinAmount.value - 0.001 || v > paymentMaxAmount.value + 0.001
})
// Apenas o M-Pesa submete na BD; a transferência é informativa (offline)
const canSubmitPayment = computed(() => {
  const v = Number(paymentAmount.value)
  if (!(v > 0) || amountError.value) return false
  return isValidMpesaPhone.value
})
const paymentTotalInstallments = computed(() => {
  const loan = loans.value.find(l => Number(l.id) === Number(selectedInstallment.value?.loanId))
  return loan ? Number(loan.numberOfInstallments) || null : null
})

async function openLoanRequest() {
  loanRequest.value = {
    amount: null,
    numberOfInstallments: null,
    loanDescription: ''
  }
  showLoanRequest.value = true
}

async function submitLoanRequest() {
  const user = authStore.user
  if (!user) return
  submittingRequest.value = true
  try {
    const { data } = await api.post(`/api/portal/${user.companyId}/${user.id}/loans/request`, {
      amount: Number(loanRequest.value.amount),
      numberOfInstallments: Number(loanRequest.value.numberOfInstallments),
      loanDescription: loanRequest.value.loanDescription
    })
    if (data.success) {
      $q.notify({
        type: 'positive',
        message: data.message || 'Pedido enviado com sucesso',
        position: 'top'
      })
      showLoanRequest.value = false
      await loadData()
      tab.value = 'loans'
    }
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Erro ao enviar pedido',
      position: 'top'
    })
  } finally {
    submittingRequest.value = false
  }
}

// ---- Navegação (mobile-first) ----
function goTab(t) {
  tab.value = t
}

// ---- Filtro por crédito + paginação "ver mais" na lista de prestações ----
const filterLoanId = ref(null)
const visibleCount = ref(10)

const filteredInstallments = computed(() => {
  const list = allInstallments.value
  if (filterLoanId.value) return list.filter(i => Number(i.loanId) === Number(filterLoanId.value))
  return list
})
const visibleInstallments = computed(() => filteredInstallments.value.slice(0, visibleCount.value))
function showMore() { visibleCount.value += 10 }
function openLoanInstallments(loan) {
  filterLoanId.value = loan.id
  visibleCount.value = 10
  goTab('installments')
}
function clearLoanFilter() { filterLoanId.value = null; visibleCount.value = 10 }
watch(tab, () => { if (tab.value !== 'installments') visibleCount.value = 10 })

// ---- KPIs do painel ----
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

// ---- Folha de pagamento (bottom sheet no telemóvel) ----
const paymentSheetStyle = computed(() =>
  $q.screen.lt.sm
    ? { borderRadius: '18px 18px 0 0', maxWidth: '100vw', width: '100%' }
    : { borderRadius: '16px', width: '100%', maxWidth: '460px' }
)

// ---- Helpers dos cards de prestações / pagamentos ----
function getInstallmentStatusText(status) {
  const s = Number(status)
  return s === 1 ? 'Pago' : s === -1 ? 'Parcial' : 'Pendente'
}
function installmentAvatarColor(inst) {
  const s = Number(inst.status)
  if (s === 1) return 'positive'
  if (s === -1) return 'warning'
  return Number(inst.lateDays) > 0 ? 'negative' : 'orange'
}
function installmentCardClass(inst) {
  const s = Number(inst.status)
  if (s === 1) return 'is-paid'
  if (Number(inst.lateDays) > 0) return 'is-overdue'
  return ''
}

// ---- Dados do pagamento da prestação (data, referência, mora aplicada) ----
// allPayments vem ordenado por createdAt DESC, pelo que o primeiro é o mais recente.
function installmentPayments(inst) {
  return allPayments.value.filter(p => Number(p.amortizationLoanId) === Number(inst.id))
}
function installmentPaidLateFee(inst) {
  return installmentPayments(inst).reduce((s, p) => s + (Number(p.latePaymentInterest) || 0), 0)
}
function installmentPaidDate(inst) {
  const list = installmentPayments(inst)
  if (!list.length) return '—'
  return formatDate(list[0].paymentDate || list[0].createdAt)
}
function installmentReference(inst) {
  const list = installmentPayments(inst)
  if (!list.length) return '—'
  return list[0].reference || '—'
}
function paymentMethodLabel(m) {
  const map = { 1: 'Numerário', 2: 'Cheque', 3: 'Transferência', 4: 'Depósito', 6: 'M-Pesa USSD', 7: 'M-Pesa' }
  return map[Number(m)] || ''
}

const upcomingInstallments = computed(() => {
  const result = []
  const now = new Date()

  loans.value.forEach(loan => {
    if (Number(loan.status) !== 1) return
    loan.installments.forEach(inst => {
      if (inst.status !== 1) {
        const dueDate = new Date(inst.dueDate)
        const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
        if (diffDays > 0 && diffDays <= 30) {
          result.push({
            ...inst,
            loanId: loan.id,
            totalInstallments: loan.numberOfInstallments,
            daysUntilDue: diffDays,
            lateFee: 0
          })
        }
      }
    })
  })

  return result.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5)
})

const allInstallments = computed(() => {
  const result = []
  loans.value.forEach(loan => {
    loan.installments.forEach(inst => {
      // Campos enriquecidos pela API com a MESMA fonte de verdade do Admin/Gestor
      const installmentValue = Number(inst.installment) || 0
      const latePaymentInterest = Number(inst.latePaymentInterest) || 0
      const lateFee = latePaymentInterest > 0 ? latePaymentInterest : Number(inst.lateFee) || 0

      result.push({
        ...inst,
        loanId: loan.id,
        daysOverdue: Number(inst.lateDays) || 0,
        lateFee,
        totalToPay: Math.round((installmentValue + latePaymentInterest) * 100) / 100
      })
    })
  })
  // Sequência da data de vencimento (1ª = primeiro vencimento), como nas restantes tabelas
  return result.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
})

function formatMoney(val) {
  return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(val || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function getLoanStatusColor(status) {
  const s = Number(status)
  const colors = { 0: 'orange', 1: 'positive', 2: 'negative', '-1': 'negative', 3: 'grey' }
  return colors[s] || 'grey'
}

function getLoanStatusText(status) {
  const s = Number(status)
  const texts = { 0: 'Pendente', 1: 'Activo', 2: 'Rejeitado', '-1': 'Rejeitado', 3: 'Liquidado' }
  return texts[s] || 'Desconhecido'
}

function ordinalNumber(order) {
  return String(order == null ? '' : order).replace(/[^0-9]/g, '')
}

function ordinalBadge(order) {
  const num = ordinalNumber(order)
  return num ? `${num}ª` : String(order == null ? '' : order)
}

// Aceita apenas dígitos e limita a 12 (número M-Pesa internacional)
function sanitizePhoneInput(value) {
  paymentPhone.value = String(value || '').replace(/[^0-9]/g, '').slice(0, 12)
}

// Normaliza o telefone do cliente para o formato internacional 25884/25885...
function normalizeMpesaPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('258')) digits = digits.slice(3)
  if (/^(84|85)/.test(digits)) digits = '258' + digits
  return digits
}

async function fetchCompanyAccounts() {
  const user = authStore.user
  if (!user?.companyId) return
  loadingAccounts.value = true
  try {
    const { data } = await api.get(`/api/accounts/${user.companyId}`)
    companyAccounts.value = data.success && Array.isArray(data.result) ? data.result : []
  } catch (e) {
    console.error('Erro ao carregar contas bancárias:', e)
    companyAccounts.value = []
  } finally {
    loadingAccounts.value = false
  }
}

async function openAccounts() {
  if (companyAccounts.value.length === 0) {
    await fetchCompanyAccounts()
  }
  showAccountsModal.value = true
}

function chooseAccount(account) {
  selectedAccount.value = account
  showAccountsModal.value = false
}

async function copyAccountNumber(account) {
  try {
    await navigator.clipboard.writeText(String(account.accountNumber || ''))
    $q.notify({ type: 'positive', message: 'Número de conta copiado', position: 'top' })
  } catch {
    $q.notify({ type: 'warning', message: 'Não foi possível copiar automaticamente', position: 'top' })
  }
}

function openPaymentModal(installment) {
  selectedInstallment.value = installment
  paymentMethod.value = 'mpesa'
  selectedAccount.value = null
  const remaining = Math.max(
    0,
    Math.round(((installment.installment || 0) - (installment.paidAmount || 0)) * 100) / 100
  )
  paymentAmount.value = remaining > 0 ? remaining : installment.installment || 0
  paymentPhone.value = normalizeMpesaPhone(customer.value?.phone)
  showPaymentModal.value = true
}

// Apenas M-Pesa submete na BD; a transferência é informativa (offline)
async function processPayment() {
  const user = authStore.user
  if (!user || !selectedInstallment.value || paymentMethod.value !== 'mpesa') return
  paying.value = true
  try {
    const { data } = await api.post(`/api/portal/${user.companyId}/${user.id}/payments`, {
      installmentId: selectedInstallment.value.id,
      loanId: selectedInstallment.value.loanId,
      amount: Number(paymentAmount.value),
      method: 'mpesa',
      phone: paymentPhone.value
    })

    if (data.success) {
      $q.notify({
        type: 'positive',
        message: data.message || 'Pagamento registado com sucesso',
        position: 'top'
      })
      showPaymentModal.value = false
      await loadData()
    }
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Erro ao processar pagamento',
      position: 'top'
    })
  } finally {
    paying.value = false
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/')
}

// Transferência bancária: não submete nada na base de dados — só instruções
function finishTransferInfo() {
  showPaymentModal.value = false
  $q.notify({
    type: 'info',
    message: 'Efectue a transferência para a conta indicada e conserve o comprovativo.',
    position: 'top'
  })
}

async function loadData() {
  loading.value = true
  try {
    const user = authStore.user
    if (!user) {
      router.push('/')
      return
    }

    const companyId = user.companyId
    const customerId = user.id

    const { data } = await api.get(`/api/portal/${companyId}/${customerId}/dashboard`)

    if (data.success) {
      customer.value = data.customer
      summary.value = data.summary
      loans.value = data.loans || []
      allPayments.value = data.payments || []
    }
  } catch (e) {
    console.error('Erro ao carregar dados:', e)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar dados do portal',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

// ==================== EXTRACTO DO CRÉDITO EM PDF (como no Admin/Gestor) ====================
async function getLogoBase64ForPdf() {
  const logo = companyStore.companyLogo
  if (!logo || logo === '/logo.png') return null
  try {
    const url = logo.startsWith('http') ? logo : logo.startsWith('/') ? logo : `/documents/${logo}`
    const token = localStorage.getItem('applicationMicroToken')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch(url, { headers })
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('image/')) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('Erro ao buscar logo:', e)
    return null
  }
}

function formatDateShort(dateStr) {
  return formatDate(dateStr)
}

function openExtractPicker() {
  if (loans.value.length === 1) {
    downloadCreditExtract(loans.value[0])
    return
  }
  showExtractPicker.value = true
}

async function downloadCreditExtract(loan) {
  if (!loan || !loan.installments?.length) return
  generatingPdf.value = true
  try {
    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    const { buildCompanyHeader, buildFooterWithSignature, tableLayout, infoTableLayout } = await import('@/utils/pdfHeader')

    const comp = companyStore.company || {}
    const cust = customer.value || {}
    const allAmorts = [...(loan.installments || [])].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    const logoBase64 = await getLogoBase64ForPdf()

    const companyHeader = buildCompanyHeader(comp, logoBase64, 'Extracto do Crédito')

    const paidInstallments = allAmorts.filter(a => Number(a.status) === 1)
    const pendingInstallments = allAmorts.filter(a => Number(a.status) !== 1)

    // Totais pela fórmula Price (mesma do Admin/Gestor)
    const principal = parseFloat(loan.amount) || 0
    const rate = parseFloat(loan.interestRate) || 0
    const n = parseInt(loan.numberOfInstallments) || 1
    let totalInterest = 0
    let totalDebt = principal
    if (principal > 0 && rate > 0 && n > 0) {
      const factor = Math.pow(1 + rate, n)
      const pmt = principal * (rate * factor) / (factor - 1)
      totalInterest = Math.round(((pmt * n) - principal) * 100) / 100
      totalDebt = Math.round(pmt * n * 100) / 100
    }
    const totalPaid = allAmorts.reduce((sum, a) => sum + (parseFloat(a.paidAmount) || 0), 0)
    const remainingDebt = Math.max(0, Math.round((totalDebt - totalPaid) * 100) / 100)

    const clientSection = [
      { text: 'DADOS DO CLIENTE', fontSize: 9, bold: true, color: '#1a237e', margin: [0, 0, 0, 6] },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [[
            { text: [{ text: 'Nome: ', bold: true, fontSize: 8 }, { text: cust.name || '', fontSize: 8 }] },
            { text: [{ text: 'Conta: ', bold: true, fontSize: 8 }, { text: String(cust.accountNumber || ''), fontSize: 8 }] },
            { text: [{ text: 'Telefone: ', bold: true, fontSize: 8 }, { text: cust.phone || '', fontSize: 8 }] },
            { text: [{ text: 'Email: ', bold: true, fontSize: 8 }, { text: cust.email || '', fontSize: 8 }] }
          ]]
        },
        layout: infoTableLayout,
        margin: [25, 0, 25, 12]
      }
    ]

    const summarySection = [
      { text: 'RESUMO DO CRÉDITO', fontSize: 9, bold: true, color: '#1a237e', margin: [25, 0, 25, 6] },
      {
        table: {
          widths: ['*', '*', '*', '*', '*'],
          body: [
            [
              { text: 'Capital Financiado', fontSize: 7, bold: true, color: '#666', alignment: 'center' },
              { text: 'Taxa de Juros', fontSize: 7, bold: true, color: '#666', alignment: 'center' },
              { text: 'Nº Prestações', fontSize: 7, bold: true, color: '#666', alignment: 'center' },
              { text: 'Total Juros', fontSize: 7, bold: true, color: '#666', alignment: 'center' },
              { text: 'Total Dívida', fontSize: 7, bold: true, color: '#666', alignment: 'center' }
            ],
            [
              { text: formatMoney(principal), fontSize: 9, bold: true, alignment: 'center' },
              { text: `${((rate) * 100).toFixed(1)}%`, fontSize: 9, bold: true, alignment: 'center' },
              { text: `${n}`, fontSize: 9, bold: true, alignment: 'center' },
              { text: formatMoney(totalInterest), fontSize: 9, bold: true, alignment: 'center' },
              { text: formatMoney(totalDebt), fontSize: 9, bold: true, alignment: 'center', color: '#c62828' }
            ]
          ]
        },
        layout: { hLineWidth: (i) => i === 0 || i === 2 ? 1 : 0.5, vLineWidth: () => 0.5, hLineColor: () => '#1a237e', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5 },
        margin: [25, 0, 25, 8]
      }
    ]

    const statusSection = [
      { text: 'SITUAÇÃO ACTUAL', fontSize: 9, bold: true, color: '#1a237e', margin: [25, 0, 25, 6] },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: 'Total Pago', fontSize: 7, bold: true, color: '#2e7d32', alignment: 'center' },
              { text: 'Saldo Remanescente', fontSize: 7, bold: true, color: '#c62828', alignment: 'center' },
              { text: 'Prestações Pagas', fontSize: 7, bold: true, color: '#1a237e', alignment: 'center' },
              { text: 'Prestações Pendentes', fontSize: 7, bold: true, color: '#f57c00', alignment: 'center' }
            ],
            [
              { text: formatMoney(totalPaid), fontSize: 9, bold: true, color: '#2e7d32', alignment: 'center' },
              { text: formatMoney(remainingDebt), fontSize: 9, bold: true, color: '#c62828', alignment: 'center' },
              { text: `${paidInstallments.length} de ${allAmorts.length}`, fontSize: 9, bold: true, alignment: 'center' },
              { text: `${pendingInstallments.length}`, fontSize: 9, bold: true, alignment: 'center' }
            ]
          ]
        },
        layout: { hLineWidth: (i) => i === 0 || i === 2 ? 1 : 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5 },
        margin: [25, 0, 25, 12]
      }
    ]

    // Plano de amortização com coluna Saldo
    let saldoCorrente = principal
    const installmentsBody = allAmorts.map(row => {
      const status = Number(row.status) === 1 ? 'Pago' : Number(row.status) === -1 ? 'Parcial' : 'Pendente'
      const statusColor = Number(row.status) === 1 ? '#2e7d32' : Number(row.status) === -1 ? '#f57c00' : '#333'
      const paidAmount = Number(row.paidAmount) || 0
      const discount = paidAmount > 0 && paidAmount < row.installment ? row.installment - paidAmount : 0

      const saldo = Math.max(0, saldoCorrente - (Number(row.amortization) || 0))
      saldoCorrente = saldo

      return [
        { text: row.installmentOrder || '', fontSize: 7, alignment: 'center' },
        { text: formatDateShort(row.dueDate), fontSize: 7, alignment: 'center' },
        { text: formatMoney(row.amortization), fontSize: 7, alignment: 'right' },
        { text: formatMoney(row.rateAmount), fontSize: 7, alignment: 'right' },
        { text: formatMoney(row.installment), fontSize: 7, alignment: 'right', bold: true },
        { text: formatMoney(saldo), fontSize: 7, alignment: 'right', color: saldo > 0 ? '#c62828' : '#2e7d32' },
        { text: formatMoney(paidAmount), fontSize: 7, alignment: 'right', color: paidAmount > 0 ? '#2e7d32' : '#999' },
        { text: discount > 0 ? '-' + formatMoney(discount) : '—', fontSize: 7, alignment: 'right', color: discount > 0 ? '#f57c00' : '#999' },
        { text: status, fontSize: 7, bold: true, color: statusColor, alignment: 'center' }
      ]
    })

    installmentsBody.push([
      { text: 'TOTAIS', fontSize: 7, bold: true, colSpan: 2, color: '#1a237e' }, {},
      { text: formatMoney(principal), fontSize: 7, alignment: 'right', bold: true },
      { text: formatMoney(totalInterest), fontSize: 7, alignment: 'right', bold: true },
      { text: formatMoney(totalDebt), fontSize: 7, alignment: 'right', bold: true },
      { text: '0,00 MT', fontSize: 7, alignment: 'right', bold: true, color: '#2e7d32' },
      { text: formatMoney(totalPaid), fontSize: 7, alignment: 'right', bold: true, color: '#2e7d32' },
      { text: '', fontSize: 7 },
      { text: '', fontSize: 7 }
    ])

    const amortSection = [
      { text: `PLANO DE AMORTIZAÇÃO (${allAmorts.length} prestações)`, fontSize: 9, bold: true, color: '#1a237e', margin: [25, 0, 25, 6] },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', '*', '*', '*', '*', '*', 'auto'],
          body: [
            [
              { text: 'Ordem', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'center' },
              { text: 'Vencimento', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'center' },
              { text: 'Capital', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Juros', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Prestação', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Saldo', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Pago', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Desconto', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'right' },
              { text: 'Estado', fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: 'center' }
            ],
            ...installmentsBody
          ]
        },
        layout: tableLayout,
        margin: [25, 0, 25, 12]
      }
    ]

    const docDefinition = {
      footer: buildFooterWithSignature(comp),
      content: [
        ...companyHeader,
        clientSection,
        summarySection,
        statusSection,
        amortSection
      ].flat(),
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [25, 15, 25, 15]
    }
    const fileName = `Extracto_Credito_Conta${cust.accountNumber || 'N/A'}_${new Date().toISOString().split('T')[0]}.pdf`
    pdfMake.createPdf(docDefinition).download(fileName)
    showExtractPicker.value = false
    $q.notify({ type: 'positive', message: 'Extracto gerado com sucesso', position: 'top' })
  } catch (e) {
    console.error('Erro ao gerar extracto:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar extracto', position: 'top' })
  } finally {
    generatingPdf.value = false
  }
}

onMounted(() => {
  loadData()
  const user = authStore.user
  if (user?.companyId) companyStore.fetchCompany(user.companyId)
})
</script>

<style lang="scss" scoped>
.portal-container {
  min-height: 100vh;
  background: #f4f4f4;
}

/* Página: padding reduzido no telemóvel e espaço para a navegação inferior (sempre visível) */
.portal-page {
  padding: 12px;
  padding-bottom: 92px;
}
@media (min-width: 600px) {
  .portal-page {
    padding: 16px;
    padding-bottom: 96px;
  }
}

/* Navegação inferior fixa (mobile) */
.portal-bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  background: #ffffff;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);

  .q-btn {
    min-height: 56px;
    font-size: 11px;
    border-radius: 0;
  }

  .q-icon {
    font-size: 22px;
  }
}

/* KPIs */
.kpi-card {
  border-radius: 14px;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  }
}

.kpi-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}
@media (max-width: 599.98px) {
  .kpi-value {
    font-size: 17px;
  }
}

/* Cartão CTA de novo empréstimo */
.portal-cta-card {
  border-radius: 14px;
  overflow: hidden;
}

/* Cartão de secção */
.portal-section-card {
  border-radius: 14px;
  overflow: hidden;
}

/* Faixa de título dos cartões */
.portal-section-header {
  background-color: $gray-100;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

/* Cartão de próxima prestação */
.upcoming-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  background: #ffffff;
}

/* Cartão de prestação */
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

/* Cartão de pagamento */
.payment-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  background: #ffffff;
}

/* Cartão de crédito */
.loan-card {
  border-radius: 14px;
  overflow: hidden;
}

.loan-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.loan-stat {
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.03);
  padding: 8px 10px;
}

.loan-stat-value {
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
}

/* Aviso de juros de mora */
.portal-late-fee {
  background: $red-50;
  border-radius: 8px;
}

/* Aviso de dívida por liquidar — ícone nunca se sobrepõe ao texto */
.portal-debt-card {
  border-radius: 14px;
  background-color: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.25);
}

.portal-debt-text {
  line-height: 1.5;
}

/* Logo + nome da empresa no header */
.portal-logo {
  background: #ffffff;
  border-radius: 8px;
  padding: 2px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.portal-company-name {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Menu de perfil do mutuário */
.portal-profile-menu {
  width: 100%;
  min-width: 260px;
  max-width: 320px;
  font-size: 13px;
}

.portal-profile-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}

.portal-profile-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- Modo escuro ---- */
body.body--dark {
  .portal-container {
    background: $dark-page;
  }

  .portal-section-header {
    background-color: rgba(255, 255, 255, 0.04);
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }

  .portal-late-fee {
    background: rgba($red-500, 0.12);
  }

  .portal-debt-card {
    background-color: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .upcoming-card,
  .installment-card,
  .payment-card {
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

  .loan-stat {
    background: rgba(255, 255, 255, 0.04);
  }

  .portal-bottom-nav {
    background: $gray-800;
    border-top-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.3);
  }

  /* Melhor contraste dos textos auxiliares em fundos escuros */
  .text-grey-5,
  .text-grey-6 {
    color: #9ca3af;
  }
}
</style>
