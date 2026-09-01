<template>
  <div class="q-pa-md">
    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="text-caption text-grey-5 q-mt-sm">A carregar dados do mutuário...</div>
    </div>

    <!-- Not Found -->
    <q-card v-else-if="!customer" flat bordered style="border-radius: 12px">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="person_off" size="64px" color="grey-4" />
        <div class="text-h6 text-grey-6 q-mt-md">Mutuário não encontrado</div>
        <q-btn flat color="primary" label="Voltar à lista" icon="arrow_back" class="q-mt-md" @click="goBack" />
      </q-card-section>
    </q-card>

    <!-- Customer Details -->
    <template v-else>
      <!-- ===================== HEADER ===================== -->
      <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
        <q-card-section>
          <div class="row items-center">
            <q-avatar :color="getStatusColor(customer.customerStatus)" text-color="white" size="56px" class="q-mr-md">
              <q-icon name="person" size="28px" />
            </q-avatar>
            <div class="col">
              <div class="text-h6 text-weight-bold">{{ customer.customerName }}</div>
              <div class="text-caption text-grey-5">
                <q-icon name="credit_card" size="12px" class="q-mr-xs" />
                Conta: <strong>{{ customer.accountNumber }}</strong>
              </div>
              <div class="row items-center q-gutter-sm q-mt-xs">
                <q-badge :color="getStatusColor(customer.customerStatus)" :label="getStatusText(customer.customerStatus)" rounded style="font-size: 10px" />
                <span class="text-caption text-grey-5">
                  <q-icon name="phone" size="10px" class="q-mr-xs" />{{ customer.customerPhone || 'Sem telefone' }}
                </span>
                <span class="text-caption text-grey-5">
                  <q-icon name="email" size="10px" class="q-mr-xs" />{{ customer.customerEmail || 'Sem e-mail' }}
                </span>
              </div>
            </div>
            <div class="col-auto text-right">
              <div class="text-caption text-grey-5">Rendimento mensal</div>
              <div class="text-weight-bold text-primary text-h6">{{ formatMoney(customer.customerMonthlySalary || 0) }}</div>
              <div class="text-caption text-grey-5 q-mt-xs">
                <q-icon name="work" size="10px" class="q-mr-xs" />
                {{ customer.customerProfession || 'Profissão não informada' }}
              </div>
            </div>
            <!-- Action icons -->
            <div class="col-auto">
              <q-btn flat round dense icon="description" color="primary" size="md" @click="showDocsModal = true">
                <q-tooltip>Documentos</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="edit" color="blue" size="md" @click="showEditModal = true">
                <q-tooltip>Editar mutuário</q-tooltip>
              </q-btn>
            </div>
          </div>


        </q-card-section>
      </q-card>

      <!-- ===================== LAYOUT ===================== -->
      <div class="row q-col-gutter-md">
        <!-- Full Width: Simulation + History -->
        <div class="col-12">
          <!-- Simulation Card -->
          <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
            <q-card-section>
              <div class="row items-center q-mb-md">
                <div class="col">
                  <div class="text-subtitle1 text-weight-bold"><q-icon name="calculate" size="18px" class="q-mr-xs" />Simulação de Crédito</div>
                  <div class="text-caption text-grey-5">Defina valor, prazo e taxa para validar capacidade de pagamento.</div>
                </div>
                <q-btn color="primary" icon="play_arrow" label="Simular" unelevated no-caps rounded size="sm" @click="simulateLoan" />
              </div>
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-4">
                  <q-input v-model.number="loanForm.capital" dense outlined label="Montante (MZN)" type="number" input-style="font-size: 13px">
                    <template v-slot:prepend><q-icon name="attach_money" size="14px" color="grey-5" /></template>
                  </q-input>
                </div>
                <div class="col-6 col-sm-4">
                  <q-select v-model="loanForm.prestacoes" dense outlined :options="numeroPrestacoes" label="Nº de prestações" emit-value map-options input-style="font-size: 13px" />
                </div>
                <div class="col-6 col-sm-4">
                  <q-select v-model="loanForm.juros" dense outlined :options="rateOptions" label="Taxa de juros" emit-value map-options input-style="font-size: 13px" />
                </div>
              </div>
              <div class="row q-col-gutter-sm q-mt-md capacity-strip">
                <div class="col-4">
                  <div class="text-caption text-grey-5" style="font-size: 10px">Capacidade (1/3)</div>
                  <div class="text-weight-bold text-positive">{{ formatMoney(maxCapacity) }}</div>
                </div>
                <div class="col-4">
                  <div class="text-caption text-grey-5" style="font-size: 10px">Prestação</div>
                  <div class="text-weight-bold text-primary">{{ estimatedInstallment > 0 ? formatMoney(estimatedInstallment) : '—' }}</div>
                </div>
                <div class="col-4">
                  <div class="text-caption text-grey-5" style="font-size: 10px">Margem</div>
                  <div class="text-weight-bold" :class="capacityExceeded ? 'text-negative' : 'text-positive'">
                    {{ estimatedInstallment > 0 ? formatMoney(Math.abs(installmentDelta)) : '—' }}
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Loan History -->
          <q-card flat bordered style="border-radius: 12px" class="q-mb-md">
            <q-card-section>
              <div class="row items-center q-mb-md">
                <div class="col">
                  <div class="text-subtitle1 text-weight-bold"><q-icon name="history" size="18px" class="q-mr-xs" />Histórico de Empréstimos</div>
                </div>
                <q-badge color="grey-6" rounded>{{ customerLoans.length }} registo(s)</q-badge>
              </div>
              <div v-if="customerLoans.length === 0" class="text-center q-pa-lg text-grey-5">
                <q-icon name="receipt_long" size="40px" />
                <div class="text-caption q-mt-sm">Ainda não há créditos registados.</div>
              </div>
              <q-list v-else separator>
                <q-item v-for="loan in customerLoans" :key="loan.id" class="loan-item">
                  <q-item-section avatar>
                    <q-avatar :color="getLoanStatusColor(loan.status)" text-color="white" size="40px">
                      <q-icon name="attach_money" size="20px" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">
                      {{ formatMoney(loan.amount) }}
                      <q-badge :color="getLoanStatusColor(loan.status)" :label="getLoanStatusText(loan.status)" rounded class="q-ml-sm" style="font-size: 10px" />
                    </q-item-label>
                    <q-item-label caption style="font-size: 11px">
                      {{ loan.numberOfInstallments }}x | {{ (loan.interestRate * 100).toFixed(1) }}% | {{ loan.dateCreated }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <div class="row q-gutter-xs items-center">
                      <!-- Ver Plano (apenas aprovado ou terminado) -->
                      <q-btn v-if="Number(loan.status) === 1 || Number(loan.status) === 3" flat round dense icon="table_chart" size="sm" color="teal" @click.stop="openAmortization(loan)">
                        <q-tooltip>Plano de Amortização</q-tooltip>
                      </q-btn>
                      <!-- Aprovar (apenas pendente) -->
                      <q-btn v-if="Number(loan.status) === 0 && canApproveLoan(authStore.userRole)" unelevated round dense icon="check_circle" size="sm" color="positive" @click.stop="approveLoan(loan)">
                        <q-tooltip>Aprovar Crédito</q-tooltip>
                      </q-btn>
                      <!-- Editar (apenas pendente) -->
                      <q-btn v-if="Number(loan.status) === 0" flat round dense icon="edit" size="sm" color="blue" @click.stop="openEditLoan(loan)">
                        <q-tooltip>Editar</q-tooltip>
                      </q-btn>
                      <!-- Documentos (apenas aprovado ou terminado) -->
                      <q-btn v-if="Number(loan.status) === 1 || Number(loan.status) === 3" flat round dense icon="description" size="sm" color="primary" @click.stop="goToDocuments(loan.id)">
                        <q-tooltip>Documentos</q-tooltip>
                      </q-btn>
                      <!-- Garantias -->
                      <q-btn flat round dense icon="security" size="sm" color="orange" @click.stop="openGuarantees(loan.id)">
                        <q-tooltip>Garantias</q-tooltip>
                      </q-btn>
                      <!-- Informação do Mutuário (para contrato) -->
                      <q-btn v-if="Number(loan.status) === 1 || Number(loan.status) === 3" flat round dense icon="info" size="sm" color="teal" @click.stop="openBorrowerInfo(loan)">
                        <q-tooltip>Info. Mutuário (Contrato)</q-tooltip>
                      </q-btn>
                      <!-- Rejeitar (apenas pendente) -->
                      <q-btn v-if="Number(loan.status) === 0" flat round dense icon="cancel" size="sm" color="negative" @click.stop="rejectLoan(loan)">
                        <q-tooltip>Rejeitar</q-tooltip>
                      </q-btn>
                      <!-- Eliminar (apenas pendente) -->
                      <q-btn v-if="Number(loan.status) === 0" flat round dense icon="delete" size="sm" color="negative" @click.stop="confirmDeleteLoan(loan)">
                        <q-tooltip>Eliminar</q-tooltip>
                      </q-btn>
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- ===================== MODAL: PLANO DE AMORTIZAÇÃO ===================== -->
      <q-dialog v-model="showAmortizationModal" persistent maximized>
        <q-card class="amort-modal-card">
          <!-- HEADER MODERNO -->
          <div class="amort-header">
            <div class="amort-header-content">
              <div class="amort-header-left">
                <q-icon name="account_balance_wallet" size="28px" color="white" class="q-mr-sm" />
                <div>
                  <div class="amort-header-title">Plano de Amortização</div>
                  <div class="amort-header-subtitle">{{ customer?.customerName || '' }} — Conta {{ customer?.accountNumber || '' }}</div>
                </div>
              </div>
              <q-btn flat round dense icon="close" color="white" @click="showAmortizationModal = false" size="md" />
            </div>
            <!-- Progress Bar -->
            <div class="amort-progress-section">
              <div class="amort-progress-info">
                <span class="text-white text-caption">Progresso do financiamento</span>
                <span class="text-white text-weight-bold">{{ amortInstallments.length > 0 ? Math.round((paidInstallments.length / amortInstallments.length) * 100) : 0 }}%</span>
              </div>
              <q-linear-progress :value="amortInstallments.length > 0 ? paidInstallments.length / amortInstallments.length : 0" color="white" rounded size="8px" track-color="rgba(255,255,255,0.2)" />
              <div class="amort-progress-labels">
                <span class="text-white-7">{{ paidInstallments.length }} de {{ amortInstallments.length }} prestações</span>
                <span class="text-white-7">{{ formatMoney(amortTotalPaid) }} pago</span>
              </div>
            </div>
          </div>

          <q-card-section class="amort-body">
            <!-- KPIs MODERNOS -->
            <div class="amort-kpi-grid">
              <div class="amort-kpi">
                <div class="amort-kpi-icon" style="background: rgba(16,185,129,0.1); color: #10b981">
                  <q-icon name="payments" size="20px" />
                </div>
                <div class="amort-kpi-info">
                  <div class="amort-kpi-label">Capital Financiado</div>
                  <div class="amort-kpi-value">{{ formatMoney(amortLoan?.amount || 0) }}</div>
                </div>
              </div>
              <div class="amort-kpi">
                <div class="amort-kpi-icon" style="background: rgba(59,130,246,0.1); color: #3b82f6">
                  <q-icon name="percent" size="20px" />
                </div>
                <div class="amort-kpi-info">
                  <div class="amort-kpi-label">Taxa de Juros</div>
                  <div class="amort-kpi-value">{{ ((amortLoan?.interestRate || 0) * 100).toFixed(1) }}%</div>
                </div>
              </div>
              <div class="amort-kpi">
                <div class="amort-kpi-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b">
                  <q-icon name="trending_up" size="20px" />
                </div>
                <div class="amort-kpi-info">
                  <div class="amort-kpi-label">Total Juros</div>
                  <div class="amort-kpi-value">{{ formatMoney(amortTotalInterest) }}</div>
                </div>
              </div>
              <div class="amort-kpi">
                <div class="amort-kpi-icon" style="background: rgba(239,68,68,0.1); color: #ef4444">
                  <q-icon name="account_balance" size="20px" />
                </div>
                <div class="amort-kpi-info">
                  <div class="amort-kpi-label">Total da Dívida</div>
                  <div class="amort-kpi-value amort-kpi-danger">{{ formatMoney(amortTotalDebt) }}</div>
                </div>
              </div>
            </div>

            <!-- SEGUNDA ROW: Pagos e Remanescente -->
            <div class="amort-kpi-grid q-mt-sm">
              <div class="amort-kpi">
                <div class="amort-kpi-icon" style="background: rgba(34,197,94,0.1); color: #22c55e">
                  <q-icon name="check_circle" size="20px" />
                </div>
                <div class="amort-kpi-info">
                  <div class="amort-kpi-label">Total Pago</div>
                  <div class="amort-kpi-value" style="color: #22c55e">{{ formatMoney(amortTotalPaid) }}</div>
                </div>
              </div>
              <div class="amort-kpi">
                <div class="amort-kpi-icon" :style="{ background: amortRemainingDebt > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: amortRemainingDebt > 0 ? '#ef4444' : '#22c55e' }">
                  <q-icon :name="amortRemainingDebt > 0 ? 'savings' : 'celebration'" size="20px" />
                </div>
                <div class="amort-kpi-info">
                  <div class="amort-kpi-label">Saldo Remanescente</div>
                  <div class="amort-kpi-value" :style="{ color: amortRemainingDebt > 0 ? '#ef4444' : '#22c55e' }">{{ formatMoney(amortRemainingDebt) }}</div>
                </div>
              </div>
              <div class="amort-kpi">
                <div class="amort-kpi-icon" style="background: rgba(99,102,241,0.1); color: #6366f1">
                  <q-icon name="assignment_turned_in" size="20px" />
                </div>
                <div class="amort-kpi-info">
                  <div class="amort-kpi-label">Prestações Pagas</div>
                  <div class="amort-kpi-value">{{ paidInstallments.length }} <span class="amort-kpi-sub">/ {{ amortInstallments.length }}</span></div>
                </div>
              </div>
              <div class="amort-kpi">
                <div class="amort-kpi-icon" style="background: rgba(249,115,22,0.1); color: #f97316">
                  <q-icon name="pending" size="20px" />
                </div>
                <div class="amort-kpi-info">
                  <div class="amort-kpi-label">Prestações Pendentes</div>
                  <div class="amort-kpi-value" style="color: #f97316">{{ pendingInstallments.length }}</div>
                </div>
              </div>
            </div>

            <!-- BOTÕES DE ACÇÃO -->
            <div class="amort-actions q-mt-lg">
              <q-btn v-if="canRegisterPayment(authStore.userRole)" unelevated color="positive" icon="paid" label="Liquidar Dívida Total" no-caps rounded class="amort-action-btn" :disable="pendingInstallments.length === 0" @click="showGlobalPaymentModal = true" />
              <q-btn outline color="grey-7" icon="download" label="Extracto do Crédito" no-caps rounded class="amort-action-btn" :disable="amortInstallments.length === 0" @click="printCreditExtract" />
            </div>

            <!-- Loading -->
            <div v-if="amortLoading" class="text-center q-pa-lg">
              <q-spinner-dots size="30px" color="primary" />
            </div>

            <template v-else>
              <!-- Pending Installments (shown first) -->
              <div v-if="pendingInstallments.length > 0" class="q-mb-lg">
                <div class="amort-section-title text-orange">
                  <q-icon name="schedule" size="16px" class="q-mr-xs" />Prestações pendentes ({{ pendingInstallments.length }})
                </div>
                <q-table :rows="pendingInstallments" :columns="pendingAmortColumns" row-key="id" flat dense hide-bottom :rows-per-page-options="[0]" class="amort-table">
                  <template v-slot:body-cell-amortization="props">
                    <q-td :props="props" class="text-right">{{ formatMoney(props.row.amortization) }}</q-td>
                  </template>
                  <template v-slot:body-cell-rateAmount="props">
                    <q-td :props="props" class="text-right">{{ formatMoney(props.row.rateAmount) }}</q-td>
                  </template>
                  <template v-slot:body-cell-installment="props">
                    <q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td>
                  </template>
                  <template v-slot:body-cell-paidAmount="props">
                    <q-td :props="props" class="text-right">
                      <span v-if="props.row.paidAmount > 0" class="text-positive text-weight-bold">
                        {{ formatMoney(props.row.paidAmount) }}
                      </span>
                      <span v-else class="text-grey-4">—</span>
                    </q-td>
                  </template>
                  <template v-slot:body-cell-status="props">
                    <q-td :props="props" class="text-center">
                      <q-badge v-if="Number(props.row.status) === -1" color="warning" text-color="white" rounded>Pago Parcial</q-badge>
                      <q-badge v-else color="grey-4" text-color="grey-7" rounded>Pendente</q-badge>
                    </q-td>
                  </template>
                  <template v-slot:body-cell-remainingBalance="props">
                    <q-td :props="props" class="text-right">
                      <span :class="((props.row.installment || 0) - (props.row.paidAmount || 0)) > 0 ? 'text-negative text-weight-bold' : 'text-positive'">
                        {{ formatMoney((props.row.installment || 0) - (props.row.paidAmount || 0)) }}
                      </span>
                    </q-td>
                  </template>
                  <template v-slot:body-cell-lateDays="props">
                    <q-td :props="props" class="text-center">
                      <q-badge v-if="props.row.lateDays > 0" color="negative" rounded>{{ props.row.lateDays }} dias</q-badge>
                      <span v-else class="text-grey-5">0</span>
                    </q-td>
                  </template>                   <template v-slot:body-cell-latePaymentInterest="props">
                    <q-td :props="props" class="text-right" :class="props.row.latePaymentInterest > 0 ? 'text-negative text-weight-bold' : ''">{{ formatMoney(props.row.latePaymentInterest || 0) }}</q-td>
                  </template>
                  <template v-slot:body-cell-totalToPay="props">
                    <q-td :props="props" class="text-right text-weight-bold">{{ formatMoney((props.row.installment || 0) + (props.row.latePaymentInterest || 0)) }}</q-td>
                  </template>
                  <template v-slot:body-cell-dueDate="props">
                    <q-td :props="props" class="text-right">{{ formatDateShort(props.row.dueDate) }}</q-td>
                  </template>
                  <template v-slot:body-cell-actions="props">
                    <q-td :props="props" class="text-center">
                      <q-btn v-if="Number(amortLoan?.status) === 1 && canRegisterPayment(authStore.userRole)" round dense icon="credit_card" size="sm" color="orange" class="amort-pay-btn" @click="openPaymentModal(props.row)" />
                    </q-td>
                  </template>
                </q-table>
              </div>

              <!-- Paid Installments -->
              <div v-if="paidInstallments.length > 0">
                <div class="amort-section-title text-positive">
                  <q-icon name="check_circle" size="16px" class="q-mr-xs" />Prestações pagas ({{ paidInstallments.length }})
                </div>
                <q-table :rows="paidInstallments" :columns="paidAmortColumns" row-key="id" flat dense hide-bottom :rows-per-page-options="[0]" class="amort-table">
                  <template v-slot:body-cell-amortization="props">
                    <q-td :props="props" class="text-right">{{ formatMoney(props.row.amortization) }}</q-td>
                  </template>
                  <template v-slot:body-cell-rateAmount="props">
                    <q-td :props="props" class="text-right">{{ formatMoney(props.row.rateAmount) }}</q-td>
                  </template>
                  <template v-slot:body-cell-installment="props">
                    <q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td>
                  </template>
                  <template v-slot:body-cell-paidAmount="props">
                    <q-td :props="props" class="text-right">
                      <span class="text-positive text-weight-bold">{{ formatMoney(props.row.paidAmount || props.row.installment) }}</span>
                    </q-td>
                  </template>
                  <template v-slot:body-cell-discount="props">
                    <q-td :props="props" class="text-right">
                      <span v-if="props.row.paidAmount && props.row.paidAmount < props.row.installment" class="text-orange">
                        -{{ formatMoney(props.row.installment - props.row.paidAmount) }}
                      </span>
                      <span v-else class="text-grey-4">—</span>
                    </q-td>
                  </template>
                  <template v-slot:body-cell-dueDate="props">
                    <q-td :props="props" class="text-right">{{ formatDateShort(props.row.dueDate) }}</q-td>
                  </template>
                  <template v-slot:body-cell-actions="props">
                    <q-td :props="props" class="text-center">
                      <q-btn flat round dense icon="visibility" size="xs" color="primary" @click="viewReceipt(props.row)" v-if="props.row.receiptUrl" />
                      <q-btn flat round dense icon="receipt" size="xs" color="positive" @click="previewReceipt(props.row)" />
                    </q-td>
                  </template>
                </q-table>
              </div>

              <!-- Empty state -->
              <div v-if="pendingInstallments.length === 0 && paidInstallments.length === 0" class="text-center q-pa-lg text-grey-5">
                <q-icon name="info" size="40px" />
                <div class="text-caption q-mt-sm">Sem prestações registadas.</div>
                <q-btn v-if="Number(amortLoan?.status) === 0 && canApproveLoan(authStore.userRole)" color="positive" icon="check_circle" label="Aprovar Crédito" unelevated no-caps rounded class="q-mt-md" @click="approveLoan(amortLoan); showAmortizationModal = false" />
              </div>
            </template>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- ===================== MODAL: SIMULAÇÃO + SUBMISSÃO ===================== -->
      <q-dialog v-model="showSimModal" persistent maximized>
        <q-card style="border-radius: 16px">
          <q-card-section class="row items-center q-pb-none bg-primary text-white">
            <q-icon name="table_chart" size="24px" class="q-mr-sm" />
            <div class="text-h6">Plano de Amortização — Simulação</div>
            <q-space />
            <q-btn flat round dense icon="close" @click="showSimModal = false" />
          </q-card-section>
          <q-card-section>
            <!-- Summary -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6 col-sm-3" v-for="item in simSummary" :key="item.label">
                <div class="summary-card">
                  <div class="text-caption text-grey-5" style="font-size: 10px">{{ item.label }}</div>
                  <div class="text-weight-bold" :class="item.class">{{ item.value }}</div>
                </div>
              </div>
            </div>
            <!-- Capacity -->
            <div class="capacity-check-box q-mb-md" :class="capacityExceeded ? 'warning' : 'success'">
              <q-icon :name="capacityExceeded ? 'warning' : 'check_circle'" :color="capacityExceeded ? 'orange' : 'positive'" size="20px" class="q-mr-sm" />
              <div>
                <div class="text-weight-medium" style="font-size: 13px">
                  {{ capacityExceeded ? 'Prestação acima da capacidade' : 'Dentro da capacidade' }}
                </div>
                <div class="text-caption text-grey-6">
                  Prestação: {{ formatMoney(estimatedInstallment) }} | Limite: {{ formatMoney(maxCapacity) }}
                </div>
              </div>
            </div>
            <!-- Table -->
            <q-table :rows="simulationResult" :columns="simColumns" row-key="installmentOrder" flat dense hide-bottom :rows-per-page-options="[0]" class="q-mb-md" style="font-size: 12px">
              <template v-slot:body-cell-amortization="props">
                <q-td :props="props" class="text-right">{{ formatMoney(props.row.amortization) }}</q-td>
              </template>
              <template v-slot:body-cell-rateAmount="props">
                <q-td :props="props" class="text-right">{{ formatMoney(props.row.rateAmount) }}</q-td>
              </template>
              <template v-slot:body-cell-installment="props">
                <q-td :props="props" class="text-right text-weight-bold">{{ formatMoney(props.row.installment) }}</q-td>
              </template>
              <template v-slot:body-cell-remainingBalance="props">
                <q-td :props="props" class="text-right">{{ formatMoney(props.row.remainingBalance) }}</q-td>
              </template>
              <template v-slot:body-cell-dueDate="props">
                <q-td :props="props" class="text-right">{{ formatDateShort(props.row.dueDate) }}</q-td>
              </template>
            </q-table>
            <!-- Submission -->
            <q-separator class="q-mb-md" />
            <div class="text-subtitle1 text-weight-bold q-mb-md"><q-icon name="send" size="18px" class="q-mr-xs" />Submissão do Crédito</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input v-model="loanForm.loanDescription" dense outlined label="Parecer técnico" type="textarea" rows="3" input-style="font-size: 13px" />
              </div>
              <div class="col-6 col-sm-3">
                <q-input v-model="loanForm.dateCreated" dense outlined label="Data" type="date" disable input-style="font-size: 13px" />
              </div>
              <div class="col-6 col-sm-3">
                <q-select v-model="loanForm.creditManager" dense outlined :options="managerOptions" label="Gestor" emit-value map-options input-style="font-size: 13px" />
              </div>
              <div class="col-12" v-if="!elegibility">
                <q-input v-model="loanForm.capacityExcessObservation" dense outlined label="Observação de excesso (mín. 10 caracteres)" type="textarea" rows="2" input-style="font-size: 13px" />
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" no-caps @click="showSimModal = false" />
            <q-btn unelevated label="Submeter Crédito" color="positive" icon="send" no-caps rounded :loading="submitting" :disable="!canSubmit" @click="submitLoan" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- ===================== MODAL: PAGAMENTO ===================== -->
      <q-dialog v-model="showPaymentModal" persistent>
        <q-card style="border-radius: 16px; min-width: 500px; max-width: 650px">
          <q-card-section class="row items-center q-pb-none">
            <q-icon name="payment" size="24px" color="positive" class="q-mr-sm" />
            <div class="text-h6">Registar Pagamento</div>
            <q-space />
            <q-btn flat round dense icon="close" @click="showPaymentModal = false" />
          </q-card-section>

          <q-card-section>
            <!-- Payment Summary -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6 col-sm-3" v-for="item in paymentSummary" :key="item.label">
                <div class="summary-card">
                  <div class="text-caption text-grey-5" style="font-size: 10px">{{ item.label }}</div>
                  <div class="text-weight-bold" :class="item.class">{{ item.value }}</div>
                </div>
              </div>
            </div>

            <q-separator class="q-mb-md" />

            <!-- Payment Form -->
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input v-model="paymentForm.paymentDate" dense outlined label="Data de pagamento" type="date" input-style="font-size: 13px" />
              </div>
              <div class="col-6">
                <q-select v-model="paymentForm.paymentMethod" dense outlined :options="paymentMethods" label="Meio de pagamento" emit-value map-options input-style="font-size: 13px" />
              </div>
              <div class="col-6">
                <q-input v-model="paymentForm.paymentReference" dense outlined label="Referência" input-style="font-size: 13px" />
              </div>
              <div class="col-6">
                <q-input v-model.number="paymentForm.amountReceived" dense outlined label="Valor a pagar" type="number" input-style="font-size: 13px" />
              </div>
              <div class="col-6">
                <q-input v-model="paymentForm.phoneNumber" dense outlined label="Telefone do cliente" input-style="font-size: 13px" />
              </div>
              <div class="col-6">
                <q-input v-model="paymentForm.staffName" dense outlined disable label="Funcionário responsável" input-style="font-size: 13px" hint="Utilizador da sessão actual" />
              </div>
              <div class="col-12">
                <q-file v-model="paymentForm.receiptFile" dense outlined label="Comprovativo de pagamento" accept=".pdf,.jpg,.jpeg,.png" input-style="font-size: 13px">
                  <template v-slot:prepend><q-icon name="attach_file" size="16px" /></template>
                </q-file>
              </div>
              <div v-if="paymentForm.amountReceived > 0 && paymentForm.amountReceived < (currentPaymentInstallment?.installment - (currentPaymentInstallment?.paidAmount || 0))" class="col-12">
                <q-banner class="bg-warning text-white" rounded>
                  <template v-slot:avatar><q-icon name="warning" /></template>
                  Pagamento parcial: ficará um saldo devedor de {{ formatMoney((currentPaymentInstallment?.installment || 0) - (currentPaymentInstallment?.paidAmount || 0) - paymentForm.amountReceived) }}
                </q-banner>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" no-caps @click="showPaymentModal = false" />
            <q-btn unelevated label="Confirmar Pagamento" color="positive" icon="check_circle" no-caps rounded :loading="paymentSaving" :disable="!canPay" @click="submitPayment" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- ===================== MODAL: PAGAMENTO GLOBAL ===================== -->
      <q-dialog v-model="showGlobalPaymentModal" persistent>
        <q-card style="border-radius: 16px; min-width: 550px; max-width: 700px">
          <q-card-section class="row items-center q-pb-none">
            <q-icon name="paid" size="24px" color="positive" class="q-mr-sm" />
            <div class="text-h6">Liquidar Dívida Total</div>
            <q-space />
            <q-btn flat round dense icon="close" @click="showGlobalPaymentModal = false" />
          </q-card-section>

          <q-card-section>
            <!-- Summary -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6">
                <div class="summary-card" style="border-left: 3px solid #f57c00">
                  <div class="text-caption text-grey-5" style="font-size: 10px">Total Pendente</div>
                  <div class="text-weight-bold text-orange">{{ formatMoney(totalPendingAmount) }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="summary-card" style="border-left: 3px solid #388e3c">
                  <div class="text-caption text-grey-5" style="font-size: 10px">Prestações Pendentes</div>
                  <div class="text-weight-bold text-positive">{{ pendingInstallments.length }}</div>
                </div>
              </div>
            </div>

            <q-separator class="q-mb-md" />

            <!-- Discount Options -->
            <div class="text-subtitle2 q-mb-sm">Opções de Desconto</div>
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-toggle v-model="globalPaymentForm.applyDiscount" label="Aplicar desconto por liquidação antecipada" color="positive" />
              </div>
              <div v-if="globalPaymentForm.applyDiscount" class="col-12">
                <q-select v-model="globalPaymentForm.discountType" dense outlined :options="discountOptions" label="Tipo de desconto" emit-value map-options input-style="font-size: 13px" />
              </div>
              <div v-if="globalPaymentForm.applyDiscount && globalPaymentForm.discountType === 'percentage'" class="col-6">
                <q-input v-model.number="globalPaymentForm.discountPercentage" dense outlined label="Percentagem de desconto (%)" type="number" min="0" max="100" input-style="font-size: 13px" />
              </div>
              <div v-if="globalPaymentForm.applyDiscount && globalPaymentForm.discountType === 'fixed'" class="col-6">
                <q-input v-model.number="globalPaymentForm.discountFixed" dense outlined label="Valor fixo de desconto (MZN)" type="number" min="0" input-style="font-size: 13px" />
              </div>
              <div v-if="globalPaymentForm.applyDiscount" class="col-6">
                <div class="summary-card" style="border-left: 3px solid #388e3c">
                  <div class="text-caption text-grey-5" style="font-size: 10px">Valor com Desconto</div>
                  <div class="text-weight-bold text-positive">{{ formatMoney(globalTotalWithDiscount) }}</div>
                </div>
              </div>
            </div>

            <q-separator class="q-mb-md" />

            <!-- Payment Form -->
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input v-model="globalPaymentForm.paymentDate" dense outlined label="Data de pagamento" type="date" input-style="font-size: 13px" />
              </div>
              <div class="col-6">
                <q-select v-model="globalPaymentForm.paymentMethod" dense outlined :options="paymentMethods" label="Meio de pagamento" emit-value map-options input-style="font-size: 13px" />
              </div>
              <div class="col-6">
                <q-input v-model="globalPaymentForm.paymentReference" dense outlined label="Referência" input-style="font-size: 13px" />
              </div>
              <div class="col-6">
                <q-input v-model="globalPaymentForm.phoneNumber" dense outlined label="Telefone do cliente" input-style="font-size: 13px" />
              </div>
              <div class="col-6">
                <q-input v-model="globalPaymentForm.staffName" dense outlined disable label="Funcionário responsável" input-style="font-size: 13px" hint="Utilizador da sessão actual" />
              </div>
              <div class="col-12">
                <q-input 
                  v-model="globalPaymentForm.observation" 
                  dense 
                  outlined 
                  :label="globalPaymentForm.applyDiscount ? 'Nota/Parecer (obrigatório) *' : 'Nota/Parecer'" 
                  type="textarea" 
                  rows="2" 
                  input-style="font-size: 13px"
                  :rules="globalPaymentForm.applyDiscount ? [val => !!val || 'Nota/Parecer é obrigatório quando há desconto'] : []"
                />
              </div>
              <div class="col-12">
                <q-file v-model="globalPaymentForm.receiptFile" dense outlined label="Comprovativo de pagamento" accept=".pdf,.jpg,.jpeg,.png" input-style="font-size: 13px">
                  <template v-slot:prepend><q-icon name="attach_file" size="16px" /></template>
                </q-file>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" no-caps @click="showGlobalPaymentModal = false" />
            <q-btn unelevated label="Confirmar Liquidação" color="positive" icon="check_circle" no-caps rounded :loading="globalPaymentSaving" :disable="!canPayGlobal" @click="submitGlobalPayment" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- ===================== MODAL: EDITAR CRÉDITO ===================== -->
      <q-dialog v-model="showEditLoanModal" persistent>
        <q-card style="border-radius: 16px; min-width: 450px">
          <q-card-section class="row items-center q-pb-none">
            <q-icon name="edit" size="24px" color="blue" class="q-mr-sm" />
            <div class="text-h6">Editar Crédito</div>
            <q-space />
            <q-btn flat round dense icon="close" @click="showEditLoanModal = false" />
          </q-card-section>
          <q-card-section>
            <div class="q-gutter-md">
              <q-input v-model.number="editLoanForm.amount" dense outlined label="Montante (MZN)" type="number" input-style="font-size: 13px" />
              <q-input v-model.number="editLoanForm.numberOfInstallments" dense outlined label="Nº de Prestações" type="number" input-style="font-size: 13px" />
              <q-select v-model="editLoanForm.interestRateId" dense outlined :options="rateOptions" label="Taxa de juros" emit-value map-options input-style="font-size: 13px" />
              <q-input v-model="editLoanForm.loanDescription" dense outlined label="Descrição" type="textarea" rows="2" input-style="font-size: 13px" />
            </div>
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" no-caps @click="showEditLoanModal = false" />
            <q-btn unelevated label="Guardar" color="primary" icon="save" no-caps rounded :loading="savingLoan" @click="saveEditLoan" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- ===================== MODAL: DOCUMENTOS ===================== -->
      <q-dialog v-model="showDocsModal" persistent maximized>
        <q-card style="border-radius: 16px">
          <q-card-section class="row items-center q-pb-none bg-primary text-white">
            <q-icon name="description" size="24px" class="q-mr-sm" />
            <div class="text-h6">Documentos — {{ customer.customerName }}</div>
            <q-space />
            <q-btn flat round dense icon="close" @click="showDocsModal = false" />
          </q-card-section>
          <q-card-section>
            <!-- Upload Form -->
            <div class="row q-col-gutter-sm items-end q-mb-lg">
              <div class="col-12 col-sm-4">
                <q-select v-model="docForm.documentName" dense outlined :options="documentTypeOptions" label="Tipo de documento" input-style="font-size: 13px" />
              </div>
              <div class="col-12 col-sm-5">
                <q-file v-model="docForm.file" dense outlined label="Selecionar ficheiro" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" input-style="font-size: 13px">
                  <template v-slot:prepend><q-icon name="attach_file" size="16px" /></template>
                </q-file>
              </div>
              <div class="col-12 col-sm-3">
                <q-btn unelevated color="secondary" icon="cloud_upload" label="Salvar" class="full-width" no-caps rounded size="sm" :loading="uploading" :disable="!docForm.documentName || !docForm.file" @click="uploadDocument" />
              </div>
            </div>
            <q-linear-progress v-if="uploadProgress > 0" :value="uploadProgress / 100" color="info" class="q-mb-md" rounded />
            <!-- Documents List -->
            <q-table :rows="customerDocuments" :columns="docColumns" row-key="id" flat dense hide-bottom :rows-per-page-options="[0]" style="font-size: 12px">
              <template v-slot:body-cell-documentName="props">
                <q-td :props="props">
                  <div class="row items-center">
                    <q-icon name="description" color="primary" size="18px" class="q-mr-sm" />
                    <span>{{ props.row.documentName }}</span>
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-createdAt="props">
                <q-td :props="props">{{ props.row.createdAt ? formatDate(props.row.createdAt) : '—' }}</q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <div class="row q-gutter-xs">
                    <q-btn flat round dense icon="open_in_new" size="xs" color="grey" @click="openDocument(props.row)" />
                    <q-btn flat round dense icon="delete" size="xs" color="negative" @click="deleteDocument(props.row)" />
                  </div>
                </q-td>
              </template>
            </q-table>
            <div v-if="customerDocuments.length === 0" class="text-center q-pa-lg text-grey-5">
              <q-icon name="folder_open" size="48px" />
              <div class="text-caption q-mt-sm">Nenhum documento registado</div>
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- Other Modals -->
      <CustomerFormModal v-model="showEditModal" :customer="customer" @saved="onCustomerSaved" />
      <GuaranteesModal v-model="showGuarantees" :loan-id="selectedLoanId" />
      <BorrowerInfoModal v-model="showBorrowerInfoModal" :loan="selectedLoanForInfo" :customer="customer" @saved="onBorrowerInfoSaved" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useCustomerStore } from '@/stores/customers'
import { useLoansStore } from '@/stores/loans'
import { usePaymentsStore } from '@/stores/payments'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useCompanyStore } from '@/stores/company'
import { formatMoney, formatDateShort } from '@/utils/formatters'
import CustomerFormModal from '@/components/modals/CustomerFormModal.vue'
import GuaranteesModal from '@/components/modals/GuaranteesModal.vue'
import BorrowerInfoModal from '@/components/modals/BorrowerInfoModal.vue'
import { canRegisterPayment, canApproveLoan, canDeleteCustomer } from '@/utils/permissions'
import { buildCompanyHeader, buildFooterWithSignature, commonStyles, tableLayout, infoTableLayout } from '@/utils/pdfHeader'
import { logApproveLoan, logPayment, logPartialPayment, logFullPayment, logDeleteDocument, logCreateGuarantee, logDeleteGuarantee, logUploadDocument, logEditCustomer, logRejectLoan } from '@/utils/logger'
import { generateAmortizationPlan } from '@/utils/amortization'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const customerStore = useCustomerStore()
const loansStore = useLoansStore()
const paymentsStore = usePaymentsStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const companyStore = useCompanyStore()

// Loading
const loading = computed(() => customerStore.loading)
const customer = computed(() => customerStore.currentCustomer)
const submitting = ref(false)
const savingLoan = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)

// Modals
const showEditModal = ref(false)
const showGuarantees = ref(false)
const showAmortizationModal = ref(false)
const showSimModal = ref(false)
const showPaymentModal = ref(false)
const showEditLoanModal = ref(false)
const showDocsModal = ref(false)
const showGlobalPaymentModal = ref(false)
const showBorrowerInfoModal = ref(false)
const selectedLoanForInfo = ref(null)
const globalPaymentSaving = ref(false)

// Global payment form
const globalPaymentForm = ref({
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMethod: null,
  paymentReference: '',
  phoneNumber: '',
  staffName: authStore.userName || '',
  observation: '',
  receiptFile: null,
  applyDiscount: false,
  discountType: 'percentage',
  discountPercentage: 10,
  discountFixed: 0
})

const discountOptions = [
  { label: 'Percentual (%)', value: 'percentage' },
  { label: 'Valor Fixo (MZN)', value: 'fixed' }
]

// Watch for global payment modal to auto-fill phone
watch(showGlobalPaymentModal, (val) => {
  if (val) {
    globalPaymentForm.value.phoneNumber = customer.value?.customerPhone || ''
    globalPaymentForm.value.staffName = authStore.userName || ''
  }
})

const selectedLoanId = ref(null)

// Documents
const customerDocuments = ref([])
const docForm = ref({ documentName: null, file: null })
const documentTypeOptions = ['BI / Passaporte / Carta de condução', 'NUIT', 'Alvará', 'Declaração do bairro', 'Contrato autenticado', 'Comprovativo de rendimentos']

// Loan simulation
const loanForm = ref({
  capital: 0, prestacoes: null, juros: null, creditManager: null,
  loanDescription: 'Crédito desembolsado mediante apresentação de garantias',
  capacityExcessObservation: '', dateCreated: new Date().toISOString().split('T')[0]
})
const simulationResult = ref([])
const selectedRate = ref(0)
const maxCapacity = ref(0)
const estimatedInstallment = ref(0)

// Edit loan
const editLoan = ref(null)
const editLoanForm = ref({ amount: 0, numberOfInstallments: 0, interestRateId: null, loanDescription: '' })

// Amortization modal
const amortLoan = ref(null)
const amortInstallments = ref([])
const amortLoading = ref(false)

// Payment modal
const currentPaymentInstallment = ref(null)
const paymentSaving = ref(false)
const paymentForm = ref({ paymentDate: new Date().toISOString().split('T')[0], paymentMethod: null, paymentReference: '', amountReceived: 0, receiptFile: null, phoneNumber: '', staffName: authStore.userName || '' })

// Global payment computed
const totalPendingAmount = computed(() =>
  pendingInstallments.value.reduce((sum, inst) => sum + (inst.installment || 0), 0)
)

const globalTotalWithDiscount = computed(() => {
  const total = totalPendingAmount.value
  if (!globalPaymentForm.value.applyDiscount) return total
  if (globalPaymentForm.value.discountType === 'percentage') {
    return total * (1 - (globalPaymentForm.value.discountPercentage || 0) / 100)
  }
  return Math.max(0, total - (globalPaymentForm.value.discountFixed || 0))
})

const canPayGlobal = computed(() => {
  const base = globalPaymentForm.value.paymentDate &&
    globalPaymentForm.value.paymentMethod &&
    globalPaymentForm.value.paymentReference &&
    globalPaymentForm.value.staffName
  // Se há desconto, nota/parecer é obrigatório
  if (globalPaymentForm.value.applyDiscount) {
    return base && globalPaymentForm.value.observation
  }
  return base
})

// Options
const numeroPrestacoes = [
  { label: 'Nº Prestações', value: null },
  ...Array.from({ length: 18 }, (_, i) => ({ label: `${i + 1} prestação${i > 0 ? 's' : ''}`, value: i + 1 }))
]
const rateOptions = ref([{ label: 'Taxa de juros', value: null }])
const managerOptions = ref([{ label: 'Selecionar Gestor', value: null }])
const paymentMethods = computed(() => {
  // Buscar meios de pagamento da tabela accounts (Contas Bancárias)
  const accounts = settingsStore.accounts || []
  const methods = accounts.map(acc => ({
    label: acc.accountDescription || acc.accountNumber || `Conta ${acc.id}`,
    value: acc.id
  }))
  // Fallback para meios padrão se não houver contas registadas
  if (methods.length === 0) {
    return [
      { label: 'Seleccionar método', value: null },
      { label: 'Numerário', value: 1 },
      { label: 'Cheque', value: 2 },
      { label: 'Transferência Bancária', value: 3 },
      { label: 'Depósito Bancário', value: 4 },
      { label: 'M-Pesa', value: 7 }
    ]
  }
  return [{ label: 'Seleccionar método', value: null }, ...methods]
})

// Computed
const customerLoans = computed(() => loansStore.loans)


const installmentDelta = computed(() => maxCapacity.value - estimatedInstallment.value)
const elegibility = computed(() => !capacityExceeded.value)
const capacityExceeded = computed(() => estimatedInstallment.value > maxCapacity.value && maxCapacity.value > 0)

const totalToPay = computed(() => simulationResult.value.reduce((sum, r) => sum + r.installment, 0))

const canSubmit = computed(() => {
  if (!loanForm.value.capital || !loanForm.value.prestacoes || !loanForm.value.juros || !loanForm.value.creditManager) return false
  if (capacityExceeded.value && (!loanForm.value.capacityExcessObservation || loanForm.value.capacityExcessObservation.length < 10)) return false
  return true
})

const canPay = computed(() => paymentForm.value.paymentDate && paymentForm.value.paymentMethod && paymentForm.value.amountReceived > 0 && paymentForm.value.paymentReference && paymentForm.value.staffName)



// Amortization modal computed
const paidInstallments = computed(() => amortInstallments.value.filter(a => Number(a.status) === 1))
const partialInstallments = computed(() => amortInstallments.value.filter(a => Number(a.status) === -1))
const pendingInstallments = computed(() => amortInstallments.value.filter(a => Number(a.status) === 0 || Number(a.status) === -1))

// Total de juros pela fórmula Price
const amortTotalInterest = computed(() => {
  const principal = parseFloat(amortLoan.value?.amount) || 0
  const rate = parseFloat(amortLoan.value?.interestRate) || 0
  const n = parseInt(amortLoan.value?.numberOfInstallments) || 1
  if (principal <= 0 || rate === 0) return 0
  const factor = Math.pow(1 + rate, n)
  const pmt = principal * (rate * factor) / (factor - 1)
  return Math.round(((pmt * n) - principal) * 100) / 100
})

// Total da dívida = PMT × n
const amortTotalDebt = computed(() => {
  const principal = parseFloat(amortLoan.value?.amount) || 0
  const rate = parseFloat(amortLoan.value?.interestRate) || 0
  const n = parseInt(amortLoan.value?.numberOfInstallments) || 1
  if (principal <= 0 || rate === 0) return principal
  const factor = Math.pow(1 + rate, n)
  const pmt = principal * (rate * factor) / (factor - 1)
  return Math.round(pmt * n * 100) / 100
})

// Total pago = soma do valor realmente pago em todas as prestações
const amortTotalPaid = computed(() => {
  return amortInstallments.value.reduce((sum, inst) => sum + (parseFloat(inst.paidAmount) || 0), 0)
})

// Saldo remanescente = Total da dívida - Total pago
const amortRemainingDebt = computed(() => {
  return Math.max(0, Math.round((amortTotalDebt.value - amortTotalPaid.value) * 100) / 100)
})

const simSummary = computed(() => [
  { label: 'Capital', value: formatMoney(loanForm.value.capital), class: 'text-primary' },
  { label: 'Taxa', value: `${(selectedRate.value * 100).toFixed(1)}%`, class: '' },
  { label: 'Prestações', value: `${loanForm.value.prestacoes}x`, class: '' },
  { label: 'Total a pagar', value: formatMoney(totalToPay.value), class: 'text-positive' }
])

const paymentSummary = computed(() => {
  const p = currentPaymentInstallment.value || {}
  const installmentValue = p.installment || 0
  const alreadyPaid = p.paidAmount || 0
  const remaining = Math.round(Math.max(0, installmentValue - alreadyPaid) * 100) / 100
  const isPartial = Number(p.status) === -1 && alreadyPaid > 0
  
  // Calcular juros de mora em tempo real
  const today = new Date()
  const dueDate = new Date(p.dueDate)
  const daysOverdue = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)))
  const dailyRate = (companyStore.company?.forfeit || 0.1) / 100
  const lateFee = daysOverdue > 0 ? daysOverdue * dailyRate * installmentValue : 0
  const totalDue = remaining + lateFee
  
  const items = [
    { label: 'Prestação', value: formatMoney(installmentValue), class: 'text-primary' },
    { label: 'Capital', value: formatMoney(p.amortization || 0), class: '' },
    { label: 'Juros', value: formatMoney(p.rateAmount || 0), class: '' },
    { label: 'Vencimento', value: formatDateShort(p.dueDate), class: 'text-grey-7' }
  ]
  
  if (isPartial) {
    items.push(
      { label: 'Já Pago', value: formatMoney(alreadyPaid), class: 'text-positive' },
      { label: 'Em Falta', value: formatMoney(remaining), class: 'text-negative' }
    )
  }
  
  if (lateFee > 0) {
    items.push(
      { label: 'Juros de Mora', value: formatMoney(lateFee), class: 'text-negative text-weight-bold' }
    )
    items.push(
      { label: 'Total a Pagar', value: formatMoney(totalDue), class: 'text-negative text-weight-bold' }
    )
  }
  
  return items
})

// Document columns
const docColumns = [
  { name: 'documentName', label: 'Documento', field: 'documentName', align: 'left' },
  { name: 'createdAt', label: 'Data', field: 'createdAt', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'center' }
]

// Amortization table columns — Paid
const paidAmortColumns = [
  { name: 'installmentOrder', label: 'Ordem', field: 'installmentOrder', align: 'center', style: 'font-size: 11px' },
  { name: 'amortization', label: 'Capital', field: 'amortization', align: 'right', style: 'font-size: 11px' },
  { name: 'rateAmount', label: 'Juros', field: 'rateAmount', align: 'right', style: 'font-size: 11px' },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right', style: 'font-size: 11px' },
  { name: 'paidAmount', label: 'Valor Pago', field: 'paidAmount', align: 'right', style: 'font-size: 11px' },
  { name: 'discount', label: 'Desconto', field: 'discount', align: 'right', style: 'font-size: 11px' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'right', style: 'font-size: 11px' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center', style: 'font-size: 11px' }
]

// Amortization table columns — Pending
const pendingAmortColumns = [
  { name: 'installmentOrder', label: 'Ordem', field: 'installmentOrder', align: 'center', style: 'font-size: 11px' },
  { name: 'amortization', label: 'Capital', field: 'amortization', align: 'right', style: 'font-size: 11px' },
  { name: 'rateAmount', label: 'Juros', field: 'rateAmount', align: 'right', style: 'font-size: 11px' },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right', style: 'font-size: 11px' },
  { name: 'paidAmount', label: 'Valor Pago', field: 'paidAmount', align: 'right', style: 'font-size: 11px' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center', style: 'font-size: 11px' },
  { name: 'remainingBalance', label: 'Saldo Devedor', field: 'remainingBalance', align: 'right', style: 'font-size: 11px' },
  { name: 'lateDays', label: 'Dias em atraso', field: 'lateDays', align: 'center', style: 'font-size: 11px' },
  { name: 'latePaymentInterest', label: 'Juros de mora', field: 'latePaymentInterest', align: 'right', style: 'font-size: 11px' },
  { name: 'totalToPay', label: 'Total a pagar', field: 'totalToPay', align: 'right', style: 'font-size: 11px' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'right', style: 'font-size: 11px' },
  { name: 'actions', label: 'Acções', field: 'actions', align: 'center', style: 'font-size: 11px' }
]

const simColumns = [
  { name: 'installmentOrder', label: 'Ordem', field: 'installmentOrder', align: 'center', style: 'font-size: 11px' },
  { name: 'amortization', label: 'Amortização', field: 'amortization', align: 'right', style: 'font-size: 11px' },
  { name: 'rateAmount', label: 'Juros', field: 'rateAmount', align: 'right', style: 'font-size: 11px' },
  { name: 'installment', label: 'Prestação', field: 'installment', align: 'right', style: 'font-size: 11px' },
  { name: 'remainingBalance', label: 'Saldo', field: 'remainingBalance', align: 'right', style: 'font-size: 11px' },
  { name: 'dueDate', label: 'Vencimento', field: 'dueDate', align: 'right', style: 'font-size: 11px' }
]

// ===================== FUNCTIONS =====================

function calculateInstallment(principal, rate, periods) {
  if (rate === 0) return principal / periods
  const num = rate * Math.pow(1 + rate, periods)
  const den = Math.pow(1 + rate, periods) - 1
  return principal * (num / den)
}

// Re-export from shared utility
import { calculateInstallment as calcInstallment } from '@/utils/amortization'

// Watch juros
watch(() => loanForm.value.juros, (rateId) => {
  if (rateId) {
    const rate = settingsStore.rates.find(r => r.id === rateId)
    selectedRate.value = rate ? rate.tax : 0
  } else {
    selectedRate.value = 0
  }
})

// Watch capital/prestacoes
watch([() => loanForm.value.capital, () => loanForm.value.prestacoes], () => {
  const { capital, prestacoes } = loanForm.value
  if (capital > 0 && prestacoes > 0 && selectedRate.value > 0) {
    estimatedInstallment.value = calculateInstallment(capital, selectedRate.value, prestacoes)
    maxCapacity.value = (customer.value?.customerMonthlySalary || 0) / 3
  } else {
    estimatedInstallment.value = 0
  }
})

function simulateLoan() {
  const { capital, prestacoes, dateCreated } = loanForm.value
  if (!capital || !prestacoes || !selectedRate.value) {
    $q.notify({ type: 'warning', message: 'Preencha montante, prestações e taxa', position: 'top' })
    return
  }
  // Usar função partilhada para garantir consistência com CLÁUSULA QUARTA
  // Passar data de desembolso para calcular vencimentos (30 dias após desembolso)
  const plan = generateAmortizationPlan(capital, selectedRate.value, prestacoes, dateCreated)
  simulationResult.value = plan
  estimatedInstallment.value = plan[0]?.installment || 0
  maxCapacity.value = (customer.value?.customerMonthlySalary || 0) / 3
  showSimModal.value = true
}

// ===================== LOAN ACTIONS =====================

async function openAmortization(loan) {
  amortLoan.value = loan
  amortInstallments.value = []
  showAmortizationModal.value = true
  amortLoading.value = true
  try {
    const forfeit = companyStore.company?.forfeit || 0.1
    const result = await loansStore.fetchAmortization(loan.id, forfeit)
    amortInstallments.value = result.installments || []
  } catch (e) {
    console.error('Erro ao buscar amortização:', e)
    $q.notify({ type: 'negative', message: 'Erro ao carregar plano de amortização', position: 'top' })
  } finally {
    amortLoading.value = false
  }
}

function viewReceipt(amortization) {
  if (amortization.receiptUrl) window.open(amortization.receiptUrl, '_blank')
}

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

async function previewReceipt(amortization) {
  try {
    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    const company = companyStore.company || {}
    const cust = customer.value || {}
    const logoBase64 = await getLogoBase64ForPdf()

    // Buscar transação desta prestação
    let transaction = null
    try {
      const token = localStorage.getItem('applicationMicroToken')
      const txnResp = await fetch(`/api/tranzaction/customer/${cust.accountNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const txnData = await txnResp.json()
      if (txnData.success && txnData.result) {
        const allTxns = Array.isArray(txnData.result) ? txnData.result : []
        transaction = allTxns.find(t => t.amortizationLoanId === amortization.id) || null
      }
    } catch (e) { /* silent */ }

    const methodLabels = { 1: 'Numerário', 2: 'Cheque', 3: 'Transferência Bancária', 4: 'Depósito Bancário', 5: 'TPA', 6: 'E-Mola', 7: 'M-Pesa', 8: 'e-Mola' }

    // Usar cabeçalho comum
    const companyHeader = buildCompanyHeader(company, logoBase64, 'Recibo de Pagamento')

    const doc = {
      content: [
        ...companyHeader,
        { text: `Ref: ${amortization.installmentOrder || ''} | ${formatDateShort(new Date())}`, fontSize: 7, alignment: 'center', color: '#888', margin: [0, 0, 0, 15] },
        { text: 'DADOS DO MUTUÁRIO', fontSize: 8, bold: true, color: '#1a237e', margin: [25, 0, 0, 6] },
        { table: { widths: ['*', '*'], body: [
          [{ text: [{ text: 'Nome: ', bold: true, fontSize: 8 }, { text: cust.customerName || '', fontSize: 8 }] }, { text: [{ text: 'Conta: ', bold: true, fontSize: 8 }, { text: String(cust.accountNumber || ''), fontSize: 8 }] }],
          [{ text: [{ text: 'Telefone: ', bold: true, fontSize: 8 }, { text: cust.customerPhone || '', fontSize: 8 }] }, { text: [{ text: 'NUIT: ', bold: true, fontSize: 8 }, { text: cust.customerNuit || '', fontSize: 8 }] }]
        ]}, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 6, paddingRight: () => 6 }, margin: [25, 0, 25, 12] },
        { text: 'DETALHES DO PAGAMENTO', fontSize: 8, bold: true, color: '#1a237e', margin: [25, 0, 0, 6] },
        { table: { widths: ['*', '*'], body: [
          [{ text: [{ text: 'Prestação: ', bold: true, fontSize: 8 }, { text: amortization.installmentOrder || '', fontSize: 8 }] }, { text: [{ text: 'Vencimento: ', bold: true, fontSize: 8 }, { text: formatDateShort(amortization.dueDate), fontSize: 8 }] }],
          [{ text: [{ text: 'Capital: ', bold: true, fontSize: 8 }, { text: formatMoney(amortization.amortization), fontSize: 8 }] }, { text: [{ text: 'Juros: ', bold: true, fontSize: 8 }, { text: formatMoney(amortization.rateAmount), fontSize: 8 }] }]
        ]}, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 6, paddingRight: () => 6 }, margin: [25, 0, 25, 12] },
        // Transacção
        ...(transaction ? [
          { text: 'TRANSPACÇÃO', fontSize: 8, bold: true, color: '#1a237e', margin: [25, 0, 0, 6] },
          { table: { widths: ['*', '*'], body: [
            [{ text: [{ text: 'Valor: ', bold: true, fontSize: 8 }, { text: formatMoney(transaction.amount), fontSize: 8, bold: true, color: '#2e7d32' }] }, { text: [{ text: 'Data: ', bold: true, fontSize: 8 }, { text: formatDateShort(transaction.paymentDate || transaction.createdAt), fontSize: 8 }] }],
            [{ text: [{ text: 'Meio: ', bold: true, fontSize: 8 }, { text: methodLabels[transaction.paymentMethod] || 'N/D', fontSize: 8 }] }, { text: [{ text: 'Referência: ', bold: true, fontSize: 8 }, { text: transaction.tranzactionReference || 'N/D', fontSize: 8 }] }],
            transaction.latePaymentInterest > 0 ? [{ text: [{ text: 'Juros de mora: ', bold: true, fontSize: 8 }, { text: formatMoney(transaction.latePaymentInterest), fontSize: 8, color: '#c62828' }] }, { text: [{ text: 'Funcionário: ', bold: true, fontSize: 8 }, { text: transaction.staffName || '', fontSize: 8 }] }] : [{ text: [{ text: 'Funcionário: ', bold: true, fontSize: 8 }, { text: transaction.staffName || '', fontSize: 8 }] }, { text: '', fontSize: 8 }]
          ]}, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 6, paddingRight: () => 6 }, margin: [25, 0, 25, 12] }
        ] : []),
        // Valor total
        { table: { widths: ['*'], body: [[{ columns: [
          { text: 'VALOR PAGO', fontSize: 9, bold: true, color: '#fff', margin: [8, 6, 0, 6] },
          { text: formatMoney(transaction ? transaction.amount : amortization.installment), fontSize: 13, bold: true, color: '#fff', alignment: 'right', margin: [0, 4, 8, 4] }
        ]}]]}, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#1a237e', paddingTop: () => 0, paddingBottom: () => 0 }, margin: [25, 0, 25, 15] },
        { text: `Estado: ${Number(amortization.status) === 1 ? 'PAGO' : Number(amortization.status) === -1 ? 'PARCIAL' : 'PENDENTE'}`, fontSize: 9, bold: true, alignment: 'center', color: Number(amortization.status) === 1 ? '#2e7d32' : Number(amortization.status) === -1 ? '#f57c00' : '#c62828', margin: [0, 0, 0, 15] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 340, y2: 0, lineWidth: 0.5, lineColor: '#e0e0e0' }], margin: [0, 5, 0, 8] },
        { columns: [
          { text: 'Documento processado por computador', fontSize: 6, color: '#bbb' },
          { text: 'Assinatura: ___________________', fontSize: 6, color: '#bbb', alignment: 'right' }
        ], margin: [25, 0, 25, 0] },
        { text: `${company.companyName || ''} | ${company.companyAddress || ''}`, fontSize: 5, color: '#ddd', alignment: 'center', margin: [0, 8, 0, 0] }
      ],
      pageSize: 'A5',
      pageOrientation: 'portrait',
      pageMargins: [0, 0, 0, 0]
      // header removido — dados da empresa agora estão no content
    }
    pdfMake.createPdf(doc).open()
  } catch (e) {
    console.error('Erro ao gerar recibo:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar recibo', position: 'top' })
  }
}

function openEditLoan(loan) {
  editLoan.value = loan
  const rateMatch = settingsStore.rates.find(r => Math.abs(r.tax - loan.interestRate) < 0.001)
  editLoanForm.value = {
    amount: loan.amount,
    numberOfInstallments: loan.numberOfInstallments,
    interestRateId: rateMatch ? rateMatch.id : null,
    loanDescription: loan.loanDescription || ''
  }
  showEditLoanModal.value = true
}

async function saveEditLoan() {
  if (!editLoan.value) return
  savingLoan.value = true
  try {
    const rate = settingsStore.rates.find(r => r.id === editLoanForm.value.interestRateId)
    await loansStore.updateLoan(editLoan.value.id, {
      ...editLoan.value,
      amount: editLoanForm.value.amount,
      numberOfInstallments: editLoanForm.value.numberOfInstallments,
      interestRate: rate ? rate.tax : editLoan.value.interestRate,
      loanDescription: editLoanForm.value.loanDescription
    })
    $q.notify({ type: 'positive', message: 'Crédito actualizado com sucesso', position: 'top' })
    showEditLoanModal.value = false
    await fetchLoans()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao actualizar crédito', position: 'top' })
  } finally {
    savingLoan.value = false
  }
}

async function approveLoan(loan) {
  $q.dialog({
    title: 'Aprovar Crédito',
    message: `Aprovar o crédito de ${formatMoney(loan.amount)}? Será gerado o plano de amortização automaticamente.`,
    cancel: 'Não',
    ok: { label: 'Sim, aprovar', color: 'positive' },
    persistent: true
  }).onOk(async () => {
    try {
      // Send ALL required fields — backend generates installments AND updates status
      // Enviar data de desembolso (hoje), não data da 1ª prestação
      // O backend soma +1 mês automaticamente
      const disbursementDate = new Date().toISOString().split('T')[0]
      await loansStore.createAmortization({
        companyId: authStore.companyId,
        loanId: loan.id,
        accountNumber: loan.accountNumber,
        interestRate: loan.interestRate,
        numberOfInstallments: loan.numberOfInstallments,
        amount: loan.amount,
        dueDate: disbursementDate,
        status: 0
      })
      logApproveLoan(customer.value?.customerName, loan.amount)
      $q.notify({ type: 'positive', message: 'Crédito aprovado e plano gerado com sucesso', position: 'top' })
      await fetchLoans()
    } catch (e) {
      console.error('Erro ao aprovar:', e)
      $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao aprovar crédito', position: 'top' })
    }
  })
}

function rejectLoan(loan) {
  $q.dialog({
    title: 'Rejeitar Crédito',
    message: `Tem certeza que deseja rejeitar o crédito de ${formatMoney(loan.amount)}?`,
    cancel: 'Não',
    ok: { label: 'Sim, rejeitar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      await loansStore.updateLoan(loan.id, { ...loan, status: -1 })
      $q.notify({ type: 'warning', message: 'Crédito rejeitado', position: 'top' })
      await fetchLoans()
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Erro ao rejeitar', position: 'top' })
    }
  })
}

function confirmDeleteLoan(loan) {
  $q.dialog({
    title: 'Eliminar Crédito',
    message: `Tem certeza que deseja eliminar o crédito de ${formatMoney(loan.amount)}? Esta acção não pode ser desfeita.`,
    cancel: 'Não',
    ok: { label: 'Sim, eliminar', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      await loansStore.deleteLoan(loan.id)
      $q.notify({ type: 'positive', message: 'Crédito eliminado', position: 'top' })
      await fetchLoans()
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Erro ao eliminar', position: 'top' })
    }
  })
}

// ===================== PAYMENT =====================

function openPaymentModal(installment) {
  currentPaymentInstallment.value = installment
  // Valor restante da prestação (APENAS capital+juros, sem juros de mora)
  const installmentValue = installment.installment || 0
  const alreadyPaid = installment.paidAmount || 0
  const remainingAmount = Math.round(Math.max(0, installmentValue - alreadyPaid) * 100) / 100
  
  paymentForm.value = {
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: null,
    paymentReference: '',
    amountReceived: remainingAmount, // Valor efectivo que vai para a prestação
    receiptFile: null,
    phoneNumber: customer.value?.customerPhone || '',
    staffName: authStore.userName || ''
  }
  showPaymentModal.value = true
}

async function printCreditExtract() {
  if (!amortLoan.value || amortInstallments.value.length === 0) return
  try {
    const pdfMakeMod = await import('pdfmake/build/pdfmake')
    const pdfMake = pdfMakeMod.default
    const pdfFontsMod = await import('pdfmake/build/vfs_fonts')
    const pdfFonts = pdfFontsMod.default
    if (pdfMake.vfs === undefined) pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts

    const loan = amortLoan.value
    const comp = companyStore.company || {}
    const cust = customer.value || {}
    const allAmorts = amortInstallments.value
    const logoBase64 = await getLogoBase64ForPdf()

    // Usar cabeçalho comum
    const companyHeader = buildCompanyHeader(comp, logoBase64, 'Extracto do Crédito')

    // Section: Dados do cliente
    const clientSection = [
      { text: 'DADOS DO CLIENTE', fontSize: 9, bold: true, color: '#1a237e', margin: [0, 0, 0, 6] },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: [{ text: 'Nome: ', bold: true, fontSize: 8 }, { text: cust.customerName || '', fontSize: 8 }] },
              { text: [{ text: 'Conta: ', bold: true, fontSize: 8 }, { text: String(cust.accountNumber || ''), fontSize: 8 }] },
              { text: [{ text: 'Telefone: ', bold: true, fontSize: 8 }, { text: cust.customerPhone || '', fontSize: 8 }] },
              { text: [{ text: 'NUIT: ', bold: true, fontSize: 8 }, { text: cust.customerNuit || '', fontSize: 8 }] }
            ]
          ]
        },
        layout: infoTableLayout,
        margin: [25, 0, 25, 12]
      }
    ]

    // Section: Resumo do crédito
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
              { text: formatMoney(loan.amount), fontSize: 9, bold: true, alignment: 'center' },
              { text: `${((parseFloat(loan.interestRate) || 0) * 100).toFixed(1)}%`, fontSize: 9, bold: true, alignment: 'center' },
              { text: `${loan.numberOfInstallments || 0}`, fontSize: 9, bold: true, alignment: 'center' },
              { text: formatMoney(amortTotalInterest.value), fontSize: 9, bold: true, alignment: 'center' },
              { text: formatMoney(amortTotalDebt.value), fontSize: 9, bold: true, alignment: 'center', color: '#c62828' }
            ]
          ]
        },
        layout: { hLineWidth: (i) => i === 0 || i === 2 ? 1 : 0.5, vLineWidth: () => 0.5, hLineColor: () => '#1a237e', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5 },
        margin: [25, 0, 25, 8]
      }
    ]

    // Section: Situação actual
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
              { text: formatMoney(amortTotalPaid.value), fontSize: 9, bold: true, color: '#2e7d32', alignment: 'center' },
              { text: formatMoney(amortRemainingDebt.value), fontSize: 9, bold: true, color: '#c62828', alignment: 'center' },
              { text: `${paidInstallments.value.length} de ${allAmorts.length}`, fontSize: 9, bold: true, alignment: 'center' },
              { text: `${pendingInstallments.value.length}`, fontSize: 9, bold: true, alignment: 'center' }
            ]
          ]
        },
        layout: { hLineWidth: (i) => i === 0 || i === 2 ? 1 : 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5 },
        margin: [25, 0, 25, 12]
      }
    ]

    // Section: Plano de amortização com coluna Saldo
    // Calcular saldo corrente para cada prestação
    let saldoCorrente = parseFloat(loan.amount) || 0
    const installmentsBody = allAmorts.map(row => {
      const status = Number(row.status) === 1 ? 'Pago' : Number(row.status) === -1 ? 'Parcial' : 'Pendente'
      const statusColor = Number(row.status) === 1 ? '#2e7d32' : Number(row.status) === -1 ? '#f57c00' : '#333'
      const paidAmount = row.paidAmount || 0
      const discount = paidAmount > 0 && paidAmount < row.installment ? row.installment - paidAmount : 0
      
      // Saldo = saldo anterior - amortização (capital)
      const saldo = Math.max(0, saldoCorrente - (row.amortization || 0))
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
      { text: formatMoney(parseFloat(loan.amount) || 0), fontSize: 7, alignment: 'right', bold: true },
      { text: formatMoney(amortTotalInterest.value), fontSize: 7, alignment: 'right', bold: true },
      { text: formatMoney(amortTotalDebt.value), fontSize: 7, alignment: 'right', bold: true },
      { text: '0,00 MT', fontSize: 7, alignment: 'right', bold: true, color: '#2e7d32' },
      { text: formatMoney(amortTotalPaid.value), fontSize: 7, alignment: 'right', bold: true, color: '#2e7d32' },
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
    pdfMake.createPdf(docDefinition).open()
  } catch (e) {
    console.error('Erro ao gerar extracto:', e)
    $q.notify({ type: 'negative', message: 'Erro ao gerar extracto', position: 'top' })
  }
}

async function submitPayment() {
  if (!currentPaymentInstallment.value || !amortLoan.value) return
  paymentSaving.value = true
  try {
    let receiptUrl = ''
    if (paymentForm.value.receiptFile) {
      const formData = new FormData()
      formData.append('file', paymentForm.value.receiptFile)
      const token = localStorage.getItem('applicationMicroToken')
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const uploadData = await uploadRes.json()
      if (uploadData.success) receiptUrl = uploadData.documentFileUrl || uploadData.imageUrl || ''
    }

    // Calculate late payment interest if overdue
    const today = new Date()
    const dueDate = new Date(currentPaymentInstallment.value.dueDate)
    const daysOverdue = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)))
    // Juros de mora = prestação × (forfeit / 100) × dias em atraso
    const dailyRate = (companyStore.company?.forfeit || 0.1) / 100
    const latePaymentInterest = daysOverdue > 0 ? daysOverdue * dailyRate * (currentPaymentInstallment.value.installment || 0) : 0

    await paymentsStore.createPayment({
      companyId: authStore.companyId,
      accountNumber: amortLoan.value.accountNumber,
      amortizationLoanId: currentPaymentInstallment.value.id,
      loanId: amortLoan.value.id,
      amount: paymentForm.value.amountReceived,
      latePaymentInterest,
      interestRateAmount: currentPaymentInstallment.value.rateAmount || 0,
      phoneNumber: paymentForm.value.phoneNumber || customer.value?.customerPhone || '',
      tranzactionReference: paymentForm.value.paymentReference,
      paymentMethod: paymentForm.value.paymentMethod,
      description: `Pagamento prestação ${currentPaymentInstallment.value.installmentOrder}`,
      receiptUrl,
      staffName: paymentForm.value.staffName || '',
      paymentDate: paymentForm.value.paymentDate
    })

    const installmentOrder = currentPaymentInstallment.value.installmentOrder
    const isPartial = paymentForm.value.amountReceived < (currentPaymentInstallment.value.installment || 0)
    const remaining = (currentPaymentInstallment.value.installment || 0) - paymentForm.value.amountReceived
    
    if (isPartial) {
      logPartialPayment(customer.value?.customerName, paymentForm.value.amountReceived, installmentOrder, remaining)
    } else {
      logPayment(customer.value?.customerName, paymentForm.value.amountReceived, installmentOrder)
    }
    
    $q.notify({ type: 'positive', message: 'Pagamento registado com sucesso', position: 'top' })
    showPaymentModal.value = false

    // Refresh amortization
    const forfeit = companyStore.company?.forfeit || 0.1
    const result = await loansStore.fetchAmortization(amortLoan.value.id, forfeit)
    amortInstallments.value = result.installments || []
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao registar pagamento', position: 'top' })
  } finally {
    paymentSaving.value = false
  }
}

// ===================== SUBMIT GLOBAL PAYMENT =====================

async function submitGlobalPayment() {
  if (!amortLoan.value || pendingInstallments.value.length === 0) return
  globalPaymentSaving.value = true
  try {
    let receiptUrl = ''
    if (globalPaymentForm.value.receiptFile) {
      const formData = new FormData()
      formData.append('file', globalPaymentForm.value.receiptFile)
      const token = localStorage.getItem('applicationMicroToken')
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const uploadData = await uploadRes.json()
      if (uploadData.success) receiptUrl = uploadData.documentFileUrl || uploadData.imageUrl || ''
    }

    // Pay each pending installment
    for (const installment of pendingInstallments.value) {
      const today = new Date()
      const dueDate = new Date(installment.dueDate)
      const daysOverdue = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)))

      // Calculate individual amount with discount
      let installmentAmount = installment.installment || 0
      if (globalPaymentForm.value.applyDiscount) {
        if (globalPaymentForm.value.discountType === 'percentage') {
          installmentAmount = installmentAmount * (1 - (globalPaymentForm.value.discountPercentage || 0) / 100)
        } else {
          const proportionalDiscount = (globalPaymentForm.value.discountFixed || 0) / pendingInstallments.value.length
          installmentAmount = Math.max(0, installmentAmount - proportionalDiscount)
        }
        // Arredondar a 2 casas decimais para evitar floating point
        installmentAmount = Math.round(installmentAmount * 100) / 100
      }

      // Juros de mora = prestação × (forfeit / 100) × dias em atraso
      const forfeitRate = (companyStore.company?.forfeit || 0.1) / 100
      const dailyLateInterest = daysOverdue > 0 ? daysOverdue * forfeitRate * (installment.installment || 0) : 0

      await paymentsStore.createPayment({
        companyId: authStore.companyId,
        accountNumber: amortLoan.value.accountNumber,
        amortizationLoanId: installment.id,
        loanId: amortLoan.value.id,
        amount: installmentAmount,
        latePaymentInterest: dailyLateInterest,
        interestRateAmount: installment.rateAmount || 0,
        phoneNumber: globalPaymentForm.value.phoneNumber || customer.value?.customerPhone || '',
        tranzactionReference: globalPaymentForm.value.paymentReference,
        paymentMethod: globalPaymentForm.value.paymentMethod,
        description: `Liquidação total - Prestação ${installment.installmentOrder}${globalPaymentForm.value.applyDiscount ? ' (com desconto)' : ''}`,
        receiptUrl,
        staffName: globalPaymentForm.value.staffName || '',
        paymentDate: globalPaymentForm.value.paymentDate,
        notes: globalPaymentForm.value.observation || null,
        discountApplied: globalPaymentForm.value.applyDiscount || false
      })
    }

    $q.notify({ type: 'positive', message: `Liquidação de ${pendingInstallments.value.length} prestações registada com sucesso`, position: 'top' })
    showGlobalPaymentModal.value = false

    // Refresh amortization
    const forfeit = companyStore.company?.forfeit || 0.1
    const result = await loansStore.fetchAmortization(amortLoan.value.id, forfeit)
    amortInstallments.value = result.installments || []
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao registar liquidação', position: 'top' })
  } finally {
    globalPaymentSaving.value = false
  }
}

// ===================== SUBMIT LOAN =====================

async function submitLoan() {
  submitting.value = true
  try {
    await loansStore.createLoan({
      accountNumber: customer.value.accountNumber,
      companyId: authStore.companyId,
      amount: loanForm.value.capital,
      numberOfInstallments: loanForm.value.prestacoes,
      interestRate: selectedRate.value,
      creditManager: loanForm.value.creditManager,
      loanDescription: loanForm.value.loanDescription || 'Crédito registado via sistema',
      capacityExcessObservation: loanForm.value.capacityExcessObservation || '',
      dateCreated: loanForm.value.dateCreated,
      status: 0
    })
    $q.notify({ type: 'positive', message: 'Crédito registado com sucesso', position: 'top' })
    showSimModal.value = false
    simulationResult.value = []
    loanForm.value.capital = 0
    loanForm.value.prestacoes = null
    loanForm.value.juros = null
    selectedRate.value = 0
    estimatedInstallment.value = 0
    await fetchLoans()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'Erro ao registar', position: 'top' })
  } finally {
    submitting.value = false
  }
}

// ===================== DOCUMENTS =====================

async function uploadDocument() {
  if (!docForm.value.file || !docForm.value.documentName) return
  uploading.value = true
  try {
    // Send file directly to /api/document via multipart/form-data
    const formData = new FormData()
    formData.append('file', docForm.value.file)
    formData.append('documentName', docForm.value.documentName)
    formData.append('accountNumber', customer.value.accountNumber)
    formData.append('companyId', authStore.companyId)
    formData.append('uploadedBy', authStore.userName)

    const token = localStorage.getItem('applicationMicroToken')
    const res = await fetch('/api/document', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message || 'Erro ao salvar documento')
    $q.notify({ type: 'positive', message: 'Documento salvo com sucesso', position: 'top' })
    docForm.value = { documentName: null, file: null }
    await fetchDocuments()
  } catch (e) { $q.notify({ type: 'negative', message: e.message || 'Erro ao salvar', position: 'top' }) }
  finally { uploading.value = false }
}

async function fetchDocuments() {
  try {
    const api = (await import('@/boot/axios')).default
    const { data } = await api.get(`/api/document/${customer.value.accountNumber}`)
    if (data.success) customerDocuments.value = data.result || []
  } catch { customerDocuments.value = [] }
}

async function deleteDocument(doc) {
  $q.dialog({ title: 'Confirmar', message: 'Eliminar este documento?', cancel: 'Não', ok: { label: 'Sim', color: 'negative' }, persistent: true })
  .onOk(async () => {
    try {
      const api = (await import('@/boot/axios')).default
      await api.delete(`/api/document/${doc.id}`)
      logDeleteDocument(doc.documentName, customer.value?.customerName)
      $q.notify({ type: 'positive', message: 'Eliminado', position: 'top' })
      await fetchDocuments()
    } catch { $q.notify({ type: 'negative', message: 'Erro ao eliminar', position: 'top' }) }
  })
}

function openDocument(doc) { if (doc.documentFileUrl) window.open(doc.documentFileUrl, '_blank') }

// ===================== NAVIGATION =====================

function goBack() { router.push('/mutuarios') }
function goToDocuments(id) { router.push(`/loans/${id}/documents`) }
function openGuarantees(loanId) { selectedLoanId.value = loanId; showGuarantees.value = true }

function openBorrowerInfo(loan) {
  selectedLoanForInfo.value = loan
  showBorrowerInfoModal.value = true
}

function onBorrowerInfoSaved(info) {
  fetchLoans()
}


function getLoanStatusColor(status) { const s = Number(status); return { 0: 'orange', 1: 'positive', '-1': 'negative', 3: 'grey' }[s] || 'grey' }
function getLoanStatusText(status) { const s = Number(status); return { 0: 'Pendente', 1: 'Activo', '-1': 'Rejeitado', 3: 'Terminado' }[s] || 'Desconhecido' }
function getStatusColor(status) { return (status === 1 || status === 'ativo') ? 'positive' : (status === 0 || status === 'inativo') ? 'grey' : 'blue' }
function getStatusText(status) { return (status === 1 || status === 'ativo') ? 'Activo' : (status === 0 || status === 'inativo') ? 'Inactivo' : 'Activo' }
function formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleDateString('pt-MZ') : '' }
function onCustomerSaved() { showEditModal.value = false; customerStore.fetchCustomerByAccount(route.params.accountNumber) }

async function fetchLoans() {
  try {
    const companyId = customer.value?.companyId
    if (companyId) {
      await loansStore.fetchLoans(companyId)
      loansStore.loans = loansStore.loans.filter(l => String(l.accountNumber) === String(route.params.accountNumber))
    }
  } catch { /* silent */ }
}

// ===================== ON MOUNTED =====================

onMounted(async () => {
  const accountNumber = route.params.accountNumber
  if (accountNumber) {
    await customerStore.fetchCustomerByAccount(accountNumber)
    await fetchDocuments()
    await fetchLoans()

    try {
      await settingsStore.fetchRates(authStore.companyId)
      rateOptions.value = settingsStore.rates.map(r => ({ label: `${r.name || 'Taxa'} - ${(r.tax * 100).toFixed(1)}%`, value: r.id }))
    } catch { /* silent */ }

    try {
      await settingsStore.fetchUsers(authStore.companyId)
      managerOptions.value = settingsStore.users.filter(u => u.userRole === 1 || u.userRole === 3).map(u => ({ label: u.name, value: u.id }))
    } catch { /* silent */ }

    try {
      await companyStore.fetchCompany(authStore.companyId)
    } catch { /* silent */ }

    // Buscar contas bancárias para meios de pagamento
    try {
      await settingsStore.fetchAccounts(authStore.companyId)
    } catch { /* silent */ }
  }
})
</script>

<style lang="scss" scoped>
.mini-stat { background: rgba(0,0,0,0.02); border-radius: 8px; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.06); }
body.body--dark .mini-stat { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); }
.capacity-strip { background: rgba(0,0,0,0.02); border-radius: 8px; padding: 12px; border: 1px solid rgba(0,0,0,0.06); }
body.body--dark .capacity-strip { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); }
.summary-card { background: rgba(0,0,0,0.02); border-radius: 8px; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.06); }
body.body--dark .summary-card { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); }
.capacity-check-box { display: flex; align-items: center; padding: 12px; border-radius: 8px;
  &.success { background: rgba(46,125,50,0.06); border: 1px solid rgba(46,125,50,0.2); }
  &.warning { background: rgba(255,152,0,0.06); border: 1px solid rgba(255,152,0,0.2); }
}
.loan-item { border-radius: 8px; margin-bottom: 4px; transition: background 0.15s; &:hover { background: rgba(0,0,0,0.03); } }
body.body--dark .loan-item:hover { background: rgba(255,255,255,0.04); }

// ==================== AMORTIZATION MODAL - MODERN DESIGN ====================
.amort-modal-card {
  border-radius: 20px;
  overflow: hidden;
  max-height: 100vh;
}

.amort-header {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  padding: 20px 28px 16px;
}

.amort-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.amort-header-left {
  display: flex;
  align-items: center;
}

.amort-header-title {
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.amort-header-subtitle {
  color: rgba(255,255,255,0.6);
  font-size: 0.78rem;
  margin-top: 2px;
}

.amort-progress-section {
  margin-top: 4px;
}

.amort-progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 0.75rem;
}

.amort-progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
}

.amort-body {
  padding: 24px 28px;
  background: #f8fafc;
}

body.body--dark .amort-body {
  background: #1a1a2e;
}

// KPI Grid - Modern Card Design
.amort-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 900px) {
  .amort-kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

.amort-kpi {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: all 0.2s ease;
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    transform: translateY(-1px);
  }
}

body.body--dark .amort-kpi {
  background: #252540;
  border-color: rgba(255,255,255,0.06);
  &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
}

.amort-kpi-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.amort-kpi-info {
  flex: 1;
  min-width: 0;
}

.amort-kpi-label {
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 2px;
}

.amort-kpi-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

body.body--dark .amort-kpi-value { color: #e2e8f0; }

.amort-kpi-danger { color: #ef4444 !important; }
.amort-kpi-sub { font-weight: 400; color: #94a3b8; font-size: 0.8rem; }

// Action Buttons
.amort-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.amort-action-btn {
  padding: 8px 20px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

// Section Titles
.amort-section-title {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e8ecef;
  display: flex;
  align-items: center;
  gap: 6px;
}

// Modern Table Design
.amort-table {
  font-size: 0.75rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  max-height: 350px;
  overflow-y: auto;
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.03);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.15);
    border-radius: 3px;
    &:hover { background: rgba(0,0,0,0.25); }
  }
  :deep(th) {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: #fff;
    font-weight: 600;
    font-size: 0.72rem;
    padding: 10px 12px;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  :deep(td) {
    padding: 8px 12px;
    vertical-align: middle;
    border-bottom: 1px solid #f1f5f9;
  }
  :deep(tr:nth-child(even)) {
    background: #f8fafc;
  }
  :deep(tr:hover) {
    background: #f1f5f9;
  }
}

body.body--dark .amort-table {
  :deep(th) { background: linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%); }
  :deep(td) { border-color: rgba(255,255,255,0.06); }
  :deep(tr:nth-child(even)) { background: rgba(255,255,255,0.02); }
  :deep(tr:hover) { background: rgba(255,255,255,0.04); }
}

.amort-pay-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  transition: all 0.2s ease;
  &:hover { transform: scale(1.08); box-shadow: 0 2px 8px rgba(249,115,22,0.3); }
}
</style>
