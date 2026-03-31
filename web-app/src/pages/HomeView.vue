<template>
  <div class="home-view bg-light min-vh-100">
    <NavBarVue />

    <b-container fluid class="py-4">

      <!-- ===================== CABEÇALHO ===================== -->
      <b-row class="mb-4 align-items-center">
        <b-col md="6">
          <h4 class="text-dark font-weight-bold mb-1">Painel de Controlo</h4>
          <p class="text-muted small mb-0">
            <b-icon icon="calendar3" class="mr-1"></b-icon>
            <span v-date-format="today"></span> | Bem-vindo, {{ user.name }}
          </p>
        </b-col>
        <b-col md="6" class="text-md-right mt-3 mt-md-0">
          <b-row align-v="end" class="justify-content-md-end">
            <b-col md="4" sm="6" class="mb-2 mb-md-0 pr-md-1">
              <b-form-datepicker
                v-model="dashboardDateFrom"
                size="sm"
                locale="pt-PT"
                placeholder="Data início"
                :date-format-options="{ year: 'numeric', month: '2-digit', day: '2-digit' }"
                reset-button
              ></b-form-datepicker>
            </b-col>
            <b-col md="4" sm="6" class="mb-2 mb-md-0 pl-md-1 pr-md-1">
              <b-form-datepicker
                v-model="dashboardDateTo"
                size="sm"
                locale="pt-PT"
                placeholder="Data fim"
                :min="dashboardDateFrom || undefined"
                :date-format-options="{ year: 'numeric', month: '2-digit', day: '2-digit' }"
                reset-button
              ></b-form-datepicker>
            </b-col>
            <b-col cols="auto" class="mb-2 mb-md-0 pl-md-2">
              <b-button
                variant="outline-secondary"
                size="sm"
                class="mr-1"
                @click="clearDashboardPeriodFilter"
              >
                Limpar
              </b-button>
              <b-button
                variant="mbr-green"
                size="sm"
                class="mr-1"
                @click="applyDashboardPeriodFilter"
              >
                <b-icon icon="search" class="mr-1"></b-icon> Aplicar
              </b-button>
              <b-button
                variant="mbr-green"
                size="sm"
                @click="syncAllData"
                class="shadow-sm"
              >
                <b-icon icon="arrow-repeat" class="mr-1"></b-icon> Sincronizar Dados
              </b-button>
            </b-col>
          </b-row>
        </b-col>
      </b-row>

      <b-row class="mb-3">
        <b-col>
          <b-button-group size="sm">
            <b-button
              :variant="activeAdminView === 'dashboard' ? 'mbr-green' : 'outline-secondary'"
              @click="activeAdminView = 'dashboard'"
            >
              <b-icon icon="speedometer2" class="mr-1"></b-icon> Painel
            </b-button>
            <b-button
              :variant="activeAdminView === 'sms-service' ? 'mbr-green' : 'outline-secondary'"
              @click="openSmsServiceView"
            >
              <b-icon icon="chat-left-dots-fill" class="mr-1"></b-icon> Serviço SMS
            </b-button>
          </b-button-group>
        </b-col>
      </b-row>

      <b-overlay :show="isLoading" rounded="lg" opacity="0.6" v-if="activeAdminView === 'dashboard'">
        <b-row v-if="hasDashboardFilter" class="mb-3">
          <b-col>
            <div class="filter-active-pill">
              <b-icon icon="funnel-fill" class="mr-2"></b-icon>
              Filtro ativo: {{ dashboardRangeLabel }}
            </div>
          </b-col>
        </b-row>

        <!-- ===================== KPIs - LINHA 1: CARTEIRA ===================== -->
        <b-row class="mb-3">
          <b-col lg="3" md="6" class="mb-3">
            <b-card
              no-body
              class="stat-card border-0 shadow-sm"
              @click="goToCustomers()"
            >
              <div class="d-flex align-items-center p-3">
                <div class="icon-shape bg-soft-info mr-3">
                  <b-icon icon="people-fill" class="text-info"></b-icon>
                </div>
                <div>
                  <div class="kpi-label">Mutuários</div>
                  <h3 class="font-weight-bold mb-0 text-dark">
                    {{ customersPagination.totalItems || customers.length }}
                  </h3>
                </div>
              </div>
            </b-card>
          </b-col>

          <b-col lg="3" md="6" class="mb-3">
            <b-card no-body class="stat-card border-0 shadow-sm accent-green">
              <div class="d-flex align-items-center p-3">
                <div class="icon-shape bg-mbr-green mr-3 text-white">
                  <b-icon icon="cash-stack"></b-icon>
                </div>
                <div>
                  <div class="kpi-label">Total Desembolsado</div>
                  <h3
                    class="font-weight-bold mb-0 text-mbr-green"
                    v-money-format="activeLoans"
                  ></h3>
                </div>
              </div>
            </b-card>
          </b-col>

          <b-col lg="3" md="6" class="mb-3">
            <b-card
              no-body
              class="stat-card border-0 shadow-sm"
              @click="selectLoanList(1)"
            >
              <div class="d-flex align-items-center p-3">
                <div class="icon-shape bg-soft-warning mr-3">
                  <b-icon icon="clock-history" class="text-warning"></b-icon>
                </div>
                <div>
                  <div class="kpi-label">Pendente</div>
                  <h3
                    class="font-weight-bold mb-0 text-dark"
                    v-money-format="pendingLoans"
                  ></h3>
                </div>
              </div>
            </b-card>
          </b-col>

          <b-col lg="3" md="6" class="mb-3">
            <b-card
              no-body
              class="stat-card border-0 shadow-sm"
              @click="selectLoanList(2)"
            >
              <div class="d-flex align-items-center p-3">
                <div class="icon-shape bg-soft-danger mr-3">
                  <b-icon icon="x-circle-fill" class="text-danger"></b-icon>
                </div>
                <div>
                  <div class="kpi-label">Rejeitado</div>
                  <h3
                    class="font-weight-bold mb-0 text-dark"
                    v-money-format="rejectedLoans"
                  ></h3>
                </div>
              </div>
            </b-card>
          </b-col>
        </b-row>

        <!-- ===================== KPIs - LINHA 2: FINANCEIRO ===================== -->
        <b-row class="mb-4">
          <b-col lg="3" md="6" class="mb-3">
            <b-card no-body class="stat-card border-0 shadow-sm accent-success">
              <div class="d-flex align-items-center p-3">
                <div class="icon-shape bg-soft-success mr-3">
                  <b-icon icon="wallet2" class="text-success"></b-icon>
                </div>
                <div>
                  <div class="kpi-label">Total Recebido</div>
                  <h3 class="font-weight-bold mb-0 text-success">
                    {{ convertMoney(totalRecebido) }}
                  </h3>
                </div>
              </div>
            </b-card>
          </b-col>

          <b-col lg="3" md="6" class="mb-3">
            <b-card no-body class="stat-card border-0 shadow-sm accent-danger">
              <div class="d-flex align-items-center p-3">
                <div class="icon-shape bg-soft-danger mr-3">
                  <b-icon icon="exclamation-triangle-fill" class="text-danger"></b-icon>
                </div>
                <div>
                  <div class="kpi-label">Total em Dívida</div>
                  <h3 class="font-weight-bold mb-0 text-danger">
                    {{ convertMoney(totalEmDivida) }}
                  </h3>
                </div>
              </div>
            </b-card>
          </b-col>

          <b-col lg="3" md="6" class="mb-3">
            <b-card no-body class="stat-card border-0 shadow-sm" style="cursor: pointer" @click="openCompletedLoansModal()">
              <div class="d-flex align-items-center p-3">
                <div class="icon-shape bg-soft-primary mr-3">
                  <b-icon icon="check2-all" class="text-primary"></b-icon>
                </div>
                <div class="flex-grow-1">
                  <div class="kpi-label">Créditos Liquidados</div>
                  <h3 class="font-weight-bold mb-0 text-dark">
                    {{ completedLoansCount }}
                  </h3>
                  <small class="text-muted d-block mt-1">Montante Liquidado</small>
                  <small class="font-weight-bold text-primary" v-money-format="liquidatedLoansAmount"></small>
                </div>
                <b-icon icon="box-arrow-up-right" font-scale="0.8" class="text-muted"></b-icon>
              </div>
            </b-card>
          </b-col>

          <b-col lg="3" md="6" class="mb-3">
            <b-card no-body class="stat-card border-0 shadow-sm">
              <div class="p-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div class="kpi-label mb-0 d-inline-flex align-items-center">
                    Taxa de Recuperação (Desembolsados)
                    <b-icon
                      icon="info-circle"
                      class="ml-1 text-muted"
                      v-b-tooltip.hover
                      title="Base do cálculo: créditos efetivamente desembolsados no período (ativos + liquidados)."
                    ></b-icon>
                  </div>
                  <strong :class="recoveryRateClass">{{ recoveryRate }}%</strong>
                </div>
                <b-progress :max="100" height="8px" class="mb-1">
                  <b-progress-bar
                    :value="recoveryRate"
                    :variant="recoveryRateVariant"
                  ></b-progress-bar>
                </b-progress>
                <small v-if="totalDesembolsadoComJuros > 0" class="text-muted">
                  {{ convertMoney(totalRecebido) }} de {{ convertMoney(totalDesembolsadoComJuros) }}
                </small>
                <small v-else class="text-muted">
                  Sem créditos desembolsados (ativos + liquidados) no período.
                </small>
              </div>
            </b-card>
          </b-col>
        </b-row>

        <!-- ===================== KPIs - LINHA 3: RISCO ===================== -->
        <b-row class="mb-4">
          <b-col lg="3" md="6" class="mb-3">
            <b-card no-body class="stat-card border-0 shadow-sm risk-card">
              <div class="p-3">
                <div class="kpi-label mb-1 d-inline-flex align-items-center">
                  Taxa de Atraso
                  <b-icon
                    icon="info-circle"
                    class="ml-1 text-muted"
                    v-b-tooltip.hover
                    title="Percentual da carteira em aberto que está em atraso."
                  ></b-icon>
                </div>
                <h4 class="font-weight-bold mb-0" :class="overdueRateClass">
                  {{ Number(delinquencyKpis.overdueRate || 0).toFixed(2) }}%
                </h4>
              </div>
            </b-card>
          </b-col>
          <b-col lg="3" md="6" class="mb-3">
            <b-card no-body class="stat-card border-0 shadow-sm risk-card">
              <div class="p-3">
                <div class="kpi-label mb-1 d-inline-flex align-items-center">
                  PAR 30
                  <b-icon
                    icon="info-circle"
                    class="ml-1 text-muted"
                    v-b-tooltip.hover
                    title="Montante em risco com mais de 30 dias de atraso."
                  ></b-icon>
                </div>
                <h5 class="font-weight-bold mb-0 text-dark">
                  {{ convertMoney(delinquencyKpis.par30Amount || 0) }}
                </h5>
              </div>
            </b-card>
          </b-col>
          <b-col lg="3" md="6" class="mb-3">
            <b-card no-body class="stat-card border-0 shadow-sm risk-card">
              <div class="p-3">
                <div class="kpi-label mb-1 d-inline-flex align-items-center">
                  PAR 60
                  <b-icon
                    icon="info-circle"
                    class="ml-1 text-muted"
                    v-b-tooltip.hover
                    title="Montante em risco com mais de 60 dias de atraso."
                  ></b-icon>
                </div>
                <h5 class="font-weight-bold mb-0 text-dark">
                  {{ convertMoney(delinquencyKpis.par60Amount || 0) }}
                </h5>
              </div>
            </b-card>
          </b-col>
          <b-col lg="3" md="6" class="mb-3">
            <b-card no-body class="stat-card border-0 shadow-sm risk-card">
              <div class="p-3">
                <div class="kpi-label mb-1 d-inline-flex align-items-center">
                  PAR 90
                  <b-icon
                    icon="info-circle"
                    class="ml-1 text-muted"
                    v-b-tooltip.hover
                    title="Montante em risco com mais de 90 dias de atraso."
                  ></b-icon>
                </div>
                <h5 class="font-weight-bold mb-0 text-dark">
                  {{ convertMoney(delinquencyKpis.par90Amount || 0) }}
                </h5>
              </div>
            </b-card>
          </b-col>
        </b-row>

        <!-- ===================== GRÁFICO COMPARATIVO (12 MESES) ===================== -->
        <b-row class="mb-4">
          <b-col lg="12">
            <b-card no-body class="border-0 shadow-sm overflow-hidden">
              <b-card-header class="bg-white border-0 py-3">
                <div class="d-flex justify-content-between align-items-center flex-wrap">
                  <h6 class="font-weight-bold text-dark mb-0">
                    <b-icon icon="bar-chart-line-fill" class="text-primary mr-2"></b-icon>
                    Desembolsos vs Pagamentos (Últimos 12 meses)
                  </h6>
                  <small class="text-muted mt-2 mt-md-0">{{ monthlyComparisonWindowLabel }}</small>
                </div>
              </b-card-header>
              <b-card-body>
                <div class="comparison-legend mb-3">
                  <span class="legend-item">
                    <span class="legend-dot legend-disbursed"></span>
                    Desembolsos
                  </span>
                  <span class="legend-item">
                    <span class="legend-dot legend-payments"></span>
                    Pagamentos
                  </span>
                </div>

                <div class="comparison-chart">
                  <div
                    v-for="point in monthlyComparisonSeries"
                    :key="point.key"
                    class="month-group"
                  >
                    <div class="month-bars">
                      <div
                        class="month-bar disbursed"
                        :style="{ height: point.disbursedHeight + '%' }"
                        v-b-tooltip.hover
                        :title="'Desembolsos: ' + convertMoney(point.disbursed)"
                      ></div>
                      <div
                        class="month-bar payments"
                        :style="{ height: point.paymentsHeight + '%' }"
                        v-b-tooltip.hover
                        :title="'Pagamentos: ' + convertMoney(point.payments)"
                      ></div>
                    </div>
                    <small class="month-label">{{ point.label }}</small>
                  </div>
                </div>

                <div class="comparison-totals mt-3">
                  <small class="text-muted mr-3">
                    Total desembolsado: <strong>{{ convertMoney(monthlyComparisonTotals.disbursed) }}</strong>
                  </small>
                  <small class="text-muted">
                    Total recebido: <strong>{{ convertMoney(monthlyComparisonTotals.payments) }}</strong>
                  </small>
                </div>
              </b-card-body>
            </b-card>
          </b-col>
        </b-row>

        <!-- ===================== PRESTAÇÕES VENCIDAS ===================== -->
        <b-row class="mb-4" v-if="filteredDueInstallments.length > 0">
          <b-col lg="12">
            <b-card no-body class="border-0 shadow-sm overflow-hidden">
              <b-card-header class="bg-white border-0 py-3">
                <b-row align-v="center">
                  <b-col>
                    <h6 class="font-weight-bold text-dark mb-0">
                      <b-icon icon="exclamation-triangle-fill" class="text-danger mr-2"></b-icon>
                      Prestações Vencidas
                      <b-badge variant="danger" pill class="ml-2">{{ filteredDueInstallments.length }}</b-badge>
                    </h6>
                  </b-col>
                  <b-col class="text-right">
                    <span class="text-danger font-weight-bold small">
                      Total: {{ convertMoney(totalDueAmount) }}
                    </span>
                  </b-col>
                </b-row>
              </b-card-header>

              <b-table
                responsive
                hover
                :items="filteredDueInstallments"
                :fields="dueFields"
                class="mb-0 overdue-table"
                thead-class="bg-light text-uppercase small text-muted font-weight-bold"
                tbody-tr-class="overdue-row"
              >
                <template #cell(customer)="data">
                  <div
                    class="d-flex align-items-center"
                    @click="openCustomerPanel(data.item.accountNumber)"
                    style="cursor: pointer"
                  >
                    <div class="avatar-circle avatar-danger mr-2">
                      {{ getCustomerName(data.item.accountNumber).charAt(0) }}
                    </div>
                    <span class="font-weight-bold text-dark">
                      {{ getCustomerName(data.item.accountNumber) }}
                    </span>
                  </div>
                </template>

                <template #cell(amount)="data">
                  <span class="font-weight-bold text-danger" v-money-format="data.item.installment"></span>
                </template>

                <template #cell(dueDate)="data">
                  <span class="text-dark" v-date-format="data.item.dueDate"></span>
                </template>

                <template #cell(lateDays)="data">
                  <b-badge
                    variant="danger"
                    pill
                    class="px-2 py-1"
                  >
                    {{ calculateLateDays(data.item.dueDate) }} dias
                  </b-badge>
                </template>

                <template #cell(actions)="data">
                  <b-button
                    variant="outline-danger"
                    size="sm"
                    pill
                    class="mr-1"
                    @click="remindCustomer(data.item)"
                    v-b-tooltip.hover
                    title="Enviar lembrete"
                  >
                    <b-icon icon="chat-left-dots-fill"></b-icon>
                  </b-button>
                  <b-button
                    variant="outline-secondary"
                    size="sm"
                    pill
                    @click="openCustomerPanel(data.item.accountNumber)"
                    v-b-tooltip.hover
                    title="Abrir perfil"
                  >
                    <b-icon icon="person-lines-fill"></b-icon>
                  </b-button>
                </template>
              </b-table>
            </b-card>
          </b-col>
        </b-row>

        <!-- Link para página dedicada de Prestações Próximas -->
        <b-row>
          <b-col lg="12">
            <b-card no-body class="border-0 shadow-sm overflow-hidden">
              <b-card-body class="py-3 d-flex justify-content-between align-items-center">
                <h6 class="font-weight-bold text-dark mb-0">
                  <b-icon icon="calendar-check" class="text-mbr-green mr-2"></b-icon>
                  Próximas Prestações
                  <b-badge variant="secondary" pill class="ml-2">{{ filteredUpcomingInstallments.length }}</b-badge>
                </h6>
                <b-button variant="mbr-green" size="sm" @click="$router.push('/prestacoes')">
                  <b-icon icon="box-arrow-up-right" class="mr-1"></b-icon> Ver todas
                </b-button>
              </b-card-body>
            </b-card>
          </b-col>
        </b-row>
      </b-overlay>

      <b-overlay :show="smsServiceLoading" rounded="lg" opacity="0.6" v-if="activeAdminView === 'sms-service'">
        <b-row class="mb-3">
          <b-col md="7">
            <h5 class="font-weight-bold text-dark mb-1">
              <b-icon icon="chat-left-dots-fill" class="text-mbr-green mr-2"></b-icon>
              Serviço SMS
            </h5>
            <p class="text-muted mb-0 small">
              Monitoria da fila SMS e envio de anúncios para contactos específicos.
            </p>
          </b-col>
          <b-col md="5" class="text-md-right mt-2 mt-md-0">
            <b-button size="sm" variant="outline-secondary" class="mr-2" @click="clearSmsFilters">
              Limpar filtros
            </b-button>
            <b-button size="sm" variant="mbr-green" @click="loadSmsServiceData">
              <b-icon icon="arrow-repeat" class="mr-1"></b-icon> Actualizar
            </b-button>
          </b-col>
        </b-row>

        <b-row class="mb-3">
          <b-col lg="3" md="6" class="mb-2">
            <b-card class="border-0 shadow-sm stat-card" no-body>
              <div class="p-3">
                <div class="kpi-label">Na Fila</div>
                <h4 class="mb-0 text-warning font-weight-bold">{{ smsQueueStats.queued }}</h4>
              </div>
            </b-card>
          </b-col>
          <b-col lg="3" md="6" class="mb-2">
            <b-card class="border-0 shadow-sm stat-card" no-body>
              <div class="p-3">
                <div class="kpi-label">Processando</div>
                <h4 class="mb-0 text-primary font-weight-bold">{{ smsQueueStats.processing }}</h4>
              </div>
            </b-card>
          </b-col>
          <b-col lg="3" md="6" class="mb-2">
            <b-card class="border-0 shadow-sm stat-card" no-body>
              <div class="p-3">
                <div class="kpi-label">Enviados</div>
                <h4 class="mb-0 text-success font-weight-bold">{{ smsQueueStats.sent }}</h4>
              </div>
            </b-card>
          </b-col>
          <b-col lg="3" md="6" class="mb-2">
            <b-card class="border-0 shadow-sm stat-card" no-body>
              <div class="p-3">
                <div class="kpi-label">Falhados</div>
                <h4 class="mb-0 text-danger font-weight-bold">{{ smsQueueStats.failed }}</h4>
              </div>
            </b-card>
          </b-col>
        </b-row>

        <b-row class="mb-3">
          <b-col lg="4" md="6" class="mb-2">
            <b-form-group label="Data Início" label-size="sm" class="mb-0">
              <b-form-datepicker
                v-model="smsHistoryFrom"
                size="sm"
                locale="pt-PT"
                placeholder="Data início"
                reset-button
              ></b-form-datepicker>
            </b-form-group>
          </b-col>
          <b-col lg="4" md="6" class="mb-2">
            <b-form-group label="Data Fim" label-size="sm" class="mb-0">
              <b-form-datepicker
                v-model="smsHistoryTo"
                size="sm"
                locale="pt-PT"
                :min="smsHistoryFrom || undefined"
                placeholder="Data fim"
                reset-button
              ></b-form-datepicker>
            </b-form-group>
          </b-col>
          <b-col lg="4" md="6" class="mb-2">
            <b-form-group label="Estado" label-size="sm" class="mb-0">
              <b-form-select v-model="smsHistoryStatus" :options="smsStatusOptions" size="sm"></b-form-select>
            </b-form-group>
          </b-col>
        </b-row>

        <b-card class="border-0 shadow-sm mb-4" no-body>
          <b-card-header class="bg-white border-0 py-2 d-flex justify-content-between align-items-center">
            <h6 class="font-weight-bold mb-0">Histórico da Fila SMS</h6>
            <b-button size="sm" variant="mbr-green" @click="fetchSmsQueueHistory">
              <b-icon icon="search" class="mr-1"></b-icon> Filtrar
            </b-button>
          </b-card-header>
          <b-table
            :items="smsQueueHistory"
            :fields="smsHistoryFields"
            responsive
            hover
            small
            show-empty
            empty-text="Sem registos para o filtro selecionado."
            class="mb-0"
          >
            <template #cell(status)="data">
              <b-badge :variant="smsStatusVariant(data.item.status)" pill>{{ data.item.status }}</b-badge>
            </template>
            <template #cell(customer)="data">
              <span>{{ data.item.customerName || "—" }}</span>
              <small class="text-muted d-block">{{ data.item.accountNumber || "—" }}</small>
            </template>
            <template #cell(phone)="data">
              <span>{{ data.item.phone || "—" }}</span>
            </template>
            <template #cell(messageType)="data">
              <span class="text-uppercase small">{{ data.item.messageType }}</span>
            </template>
            <template #cell(messageBody)="data">
              <span>{{ truncateSmsBody(data.item.messageBody) }}</span>
            </template>
            <template #cell(createdAt)="data">
              <small>{{ formatDateTime(data.item.createdAt) }}</small>
            </template>
          </b-table>
        </b-card>

        <b-card class="border-0 shadow-sm" no-body>
          <b-card-header class="bg-white border-0 py-2">
            <h6 class="font-weight-bold mb-0">
              <b-icon icon="megaphone-fill" class="text-mbr-green mr-2"></b-icon>
              Enviar SMS de Anúncio
            </h6>
          </b-card-header>
          <b-card-body>
            <b-row>
              <b-col md="12" class="mb-2">
                <b-form-group label="Mensagem do anúncio" label-size="sm" class="mb-0">
                  <b-form-textarea
                    v-model="smsAnnouncement.messageBody"
                    rows="4"
                    max-rows="8"
                    placeholder="Escreva a mensagem do anúncio..."
                  ></b-form-textarea>
                  <small class="text-muted">{{ smsAnnouncement.messageBody.length }} caracteres</small>
                </b-form-group>
              </b-col>
            </b-row>

            <b-row class="mb-2">
              <b-col md="6">
                <b-form-checkbox v-model="smsAnnouncement.sendToAllCustomers">
                  Enviar para todos os mutuários com telefone válido
                </b-form-checkbox>
              </b-col>
              <b-col md="6">
                <b-form-group label="Pesquisar contactos" label-size="sm" class="mb-0">
                  <b-form-input
                    v-model="smsAnnouncementSearch"
                    size="sm"
                    placeholder="Nome, conta ou telefone"
                    :disabled="smsAnnouncement.sendToAllCustomers"
                  ></b-form-input>
                </b-form-group>
              </b-col>
            </b-row>

            <b-row>
              <b-col md="7">
                <b-form-group label="Contactos do sistema" label-size="sm" class="mb-0">
                  <b-form-select
                    v-model="smsAnnouncement.selectedAccounts"
                    :options="smsAnnouncementContactOptions"
                    :select-size="8"
                    multiple
                    :disabled="smsAnnouncement.sendToAllCustomers"
                  ></b-form-select>
                </b-form-group>
              </b-col>
              <b-col md="5">
                <b-form-group label="Números extras (um por linha)" label-size="sm" class="mb-0">
                  <b-form-textarea
                    v-model="smsAnnouncement.customPhones"
                    rows="8"
                    max-rows="10"
                    placeholder="841234567&#10;258851112223"
                    :disabled="smsAnnouncement.sendToAllCustomers"
                  ></b-form-textarea>
                </b-form-group>
              </b-col>
            </b-row>

            <div class="d-flex justify-content-between align-items-center mt-3">
              <small class="text-muted">
                Destinatários estimados:
                <strong>{{ smsAnnouncementRecipientsCount }}</strong>
              </small>
              <div>
                <b-button size="sm" variant="outline-secondary" class="mr-2" @click="resetSmsAnnouncement">
                  Limpar
                </b-button>
                <b-button
                  size="sm"
                  variant="mbr-green"
                  :disabled="smsSendingAnnouncement || !canSendSmsAnnouncement"
                  @click="sendSmsAnnouncement"
                >
                  <b-icon icon="send-fill" class="mr-1"></b-icon>
                  Enfileirar anúncio
                </b-button>
              </div>
            </div>
          </b-card-body>
        </b-card>
      </b-overlay>
    </b-container>

    <!-- ===================== MODAL: ENVIAR NOTIFICAÇÃO ===================== -->
    <b-modal
      ref="notification-modal"
      title="Enviar Notificação"
      centered
      size="lg"
      hide-footer
    >
      <b-overlay :show="sendingNotification" rounded="sm">
        <!-- Dados do cliente -->
        <div class="notification-customer-info mb-3 p-3 bg-light rounded">
          <b-row>
            <b-col sm="6">
              <small class="text-muted d-block">Mutuário</small>
              <strong>{{ notificationData.customerName }}</strong>
            </b-col>
            <b-col sm="3">
              <small class="text-muted d-block">Prestação nº</small>
              <strong>{{ notificationData.installmentOrder }}</strong>
            </b-col>
            <b-col sm="3">
              <small class="text-muted d-block">Valor</small>
              <strong class="text-mbr-green">{{ convertMoney(notificationData.installmentAmount) }}</strong>
            </b-col>
          </b-row>
        </div>

        <!-- Canal de envio -->
        <h6 class="font-weight-bold text-dark mb-2">
          <b-icon icon="broadcast" class="mr-1"></b-icon> Canal de envio
        </h6>
        <b-form-checkbox-group v-model="notificationChannels" class="mb-3">
          <b-form-checkbox value="sms" class="mr-3">
            <b-icon icon="chat-left-dots" class="mr-1 text-info"></b-icon> SMS
          </b-form-checkbox>
          <b-form-checkbox value="email" class="mr-3">
            <b-icon icon="envelope" class="mr-1 text-warning"></b-icon> E-mail
          </b-form-checkbox>
          <b-form-checkbox value="whatsapp">
            <b-icon icon="whatsapp" class="mr-1 text-success"></b-icon> WhatsApp
          </b-form-checkbox>
        </b-form-checkbox-group>

        <!-- Contacto -->
        <b-row class="mb-3" v-if="notificationChannels.length > 0">
          <b-col sm="6" v-if="notificationChannels.includes('sms') || notificationChannels.includes('whatsapp')">
            <b-form-group label="Telefone" label-size="sm" label-class="font-weight-bold">
              <b-form-input
                v-model="notificationData.phone"
                size="sm"
                placeholder="Ex: 258841234567"
              ></b-form-input>
            </b-form-group>
          </b-col>
          <b-col sm="6" v-if="notificationChannels.includes('email')">
            <b-form-group label="E-mail" label-size="sm" label-class="font-weight-bold">
              <b-form-input
                v-model="notificationData.email"
                size="sm"
                type="email"
                placeholder="cliente@email.com"
              ></b-form-input>
            </b-form-group>
          </b-col>
        </b-row>

        <!-- Mensagem -->
        <b-form-group label="Mensagem" label-size="sm" label-class="font-weight-bold" class="mb-3">
          <b-form-textarea
            v-model="notificationMessage"
            rows="5"
            max-rows="10"
            size="sm"
            placeholder="Escreva a mensagem..."
          ></b-form-textarea>
          <small class="text-muted">{{ notificationMessage.length }} caracteres</small>
        </b-form-group>

        <hr class="my-2" />

        <!-- Acções -->
        <div class="d-flex justify-content-between align-items-center">
          <b-button size="sm" variant="outline-secondary" @click="$refs['notification-modal'].hide()">
            Cancelar
          </b-button>
          <div>
            <b-button
              size="sm"
              variant="outline-mbr-green"
              class="mr-2"
              @click="resetNotificationMessage()"
            >
              <b-icon icon="arrow-counterclockwise" class="mr-1"></b-icon> Repor mensagem
            </b-button>
            <b-button
              size="sm"
              variant="mbr-green"
              :disabled="notificationChannels.length === 0 || notificationMessage.length === 0 || sendingNotification"
              @click="sendNotification()"
              class="px-4"
            >
              <b-icon icon="send" class="mr-1"></b-icon>
              Enviar ({{ notificationChannels.length }})
            </b-button>
          </div>
        </div>
      </b-overlay>
    </b-modal>

    <!-- Modal: Empréstimos pendentes/rejeitados -->
    <b-modal
      hide-footer
      centered
      scrollable
      ref="show-pending-loans"
      size="xl"
      header-class="modal-loans-header border-0 pb-0"
      body-class="pt-0 px-3"
      content-class="modal-loans-content"
    >
      <template #modal-title>
        <div class="d-flex align-items-center">
          <div class="modal-title-icon mr-2" :class="selectedLoanType === 'rejected' ? 'icon-danger' : 'icon-warning'">
            <b-icon :icon="selectedLoanType === 'rejected' ? 'x-circle-fill' : 'clock-history'"></b-icon>
          </div>
          <div>
            <h6 class="font-weight-bold mb-0">{{ selectedLoanDescription }}</h6>
            <small class="text-muted">{{ company.companyName }}</small>
          </div>
        </div>
      </template>
      <LoansList :selectLoanList="selectedLoanList" :listType="selectedLoanType" />
    </b-modal>

    <!-- Modal: Créditos Liquidados -->
    <b-modal
      hide-footer
      centered
      scrollable
      ref="completed-loans-modal"
      size="xl"
      header-class="border-0 pb-0"
      body-class="pt-0 px-3"
    >
      <template #modal-title>
        <div class="d-flex align-items-center">
          <div class="modal-title-icon icon-primary mr-2">
            <b-icon icon="check2-all"></b-icon>
          </div>
          <div>
            <h6 class="font-weight-bold mb-0">Créditos Liquidados</h6>
            <small class="text-muted">{{ company.companyName }}</small>
          </div>
        </div>
      </template>

      <div class="mt-3 mb-3">
        <b-input-group size="sm">
          <b-input-group-prepend is-text>
            <b-icon icon="search"></b-icon>
          </b-input-group-prepend>
          <b-form-input
            v-model="completedSearch"
            placeholder="Pesquisar por nome ou nº de conta..."
            debounce="400"
            @update="onCompletedSearchChange"
          ></b-form-input>
          <b-input-group-append v-if="completedSearch">
            <b-button variant="outline-secondary" @click="completedSearch = ''; fetchCompletedLoans(1)">
              <b-icon icon="x"></b-icon>
            </b-button>
          </b-input-group-append>
        </b-input-group>
      </div>

      <b-overlay :show="completedLoading" rounded="sm" variant="white" opacity="0.7" spinner-small>
        <b-table
          :items="completedLoansList"
          :fields="completedFields"
          responsive
          hover
          small
          show-empty
          empty-text="Nenhum crédito liquidado encontrado."
          class="mb-0 completed-loans-table"
          thead-class="bg-light"
        >
          <template #cell(customer)="data">
            <div class="d-flex align-items-center">
              <div class="avatar-circle avatar-sm mr-2">
                {{ getCustomerName(data.item.accountNumber).charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="font-weight-bold text-truncate" style="max-width: 180px">
                  {{ getCustomerName(data.item.accountNumber) }}
                </div>
                <small class="text-muted">{{ data.item.accountNumber }}</small>
              </div>
            </div>
          </template>

          <template #cell(amount)="data">
            <span class="font-weight-bold">{{ convertMoney(data.item.amount) }}</span>
          </template>

          <template #cell(interestRate)="data">
            {{ data.item.interestRate }}%
          </template>

          <template #cell(installments)="data">
            {{ data.item.installments }}
          </template>

          <template #cell(capacityObs)="data">
            <small v-if="data.item.capacityExcessObservation" class="text-danger d-block">
              {{
                data.item.capacityExcessObservation.length > 80
                  ? `${data.item.capacityExcessObservation.slice(0, 80)}...`
                  : data.item.capacityExcessObservation
              }}
            </small>
            <small v-else class="text-muted">—</small>
          </template>

          <template #cell(dateCreated)="data">
            {{ formatDate(data.item.dateCreated) }}
          </template>

          <template #cell(dueDate)="data">
            {{ formatDate(data.item.dueDate) }}
          </template>
        </b-table>
      </b-overlay>

      <div class="d-flex justify-content-between align-items-center mt-3 mb-2" v-if="completedPagination.totalPages > 0">
        <small class="text-muted">
          Mostrando {{ completedLoansList.length }} de {{ completedPagination.totalItems }} registos
          (Página {{ completedPagination.currentPage }} de {{ completedPagination.totalPages }})
        </small>
        <b-pagination
          v-model="completedPagination.currentPage"
          :total-rows="completedPagination.totalItems"
          :per-page="completedPagination.itemsPerPage"
          size="sm"
          class="mb-0"
          @change="fetchCompletedLoans"
          first-number
          last-number
          limit="5"
        ></b-pagination>
      </div>
    </b-modal>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import NavBarVue from "@/components/NavBar";
import moment from "moment";
import axios from "axios";
import MoneyFormat from "@/utils/moneyFormat";
import LoansList from "@/components/loans/LoansList.vue";

export default {
  data: () => ({
    today: moment(),
    activeAdminView: "dashboard",
    dashboardDateFrom: "",
    dashboardDateTo: "",
    activeLoans: 0,
    pendingLoans: 0,
    rejectedLoans: 0,
    totalRecebido: 0,
    totalEmDivida: 0,
    totalDesembolsadoComJuros: 0,
    completedLoansCount: 0,
    liquidatedLoansAmount: 0,
    companyLoanList: [],
    selectedLoanDescription: "",
    selectedLoanList: [],
    selectedLoanType: "pending",
    smsServiceLoading: false,
    smsSendingAnnouncement: false,
    smsQueueHistory: [],
    smsQueueStats: {
      queued: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    },
    smsHistoryFrom: "",
    smsHistoryTo: "",
    smsHistoryStatus: "",
    smsStatusOptions: [
      { value: "", text: "Todos os estados" },
      { value: "queued", text: "queued" },
      { value: "processing", text: "processing" },
      { value: "sent", text: "sent" },
      { value: "failed", text: "failed" },
      { value: "cancelled", text: "cancelled" },
    ],
    smsHistoryFields: [
      { key: "status", label: "Estado", class: "text-center" },
      { key: "customer", label: "Mutuário / Conta" },
      { key: "phone", label: "Telefone" },
      { key: "messageType", label: "Tipo" },
      { key: "messageBody", label: "Mensagem" },
      { key: "createdAt", label: "Criado em", class: "text-center" },
    ],
    smsAnnouncementSearch: "",
    smsAnnouncement: {
      messageBody: "",
      sendToAllCustomers: false,
      selectedAccounts: [],
      customPhones: "",
    },
    // Modal de notificação
    notificationData: {
      customerName: "",
      phone: "",
      email: "",
      accountNumber: "",
      installmentOrder: 0,
      installmentAmount: 0,
    },
    notificationMessage: "",
    notificationChannels: ["sms"],
    sendingNotification: false,
    currentNotificationItem: null,

    dueFields: [
      { key: "customer", label: "Mutuário" },
      { key: "amount", label: "Prestação", class: "text-right" },
      { key: "installmentOrder", label: "Ordem", class: "text-center" },
      { key: "dueDate", label: "Vencimento", class: "text-center" },
      { key: "lateDays", label: "Dias em atraso", class: "text-center" },
      { key: "actions", label: "Acções", class: "text-center" },
    ],

    // Modal Créditos Liquidados
    completedLoansList: [],
    completedSearch: "",
    completedLoading: false,
    completedPagination: {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      itemsPerPage: 10,
    },
    completedFields: [
      { key: "customer", label: "Mutuário" },
      { key: "amount", label: "Valor do Crédito", class: "text-right" },
      { key: "interestRate", label: "Taxa (%)", class: "text-center" },
      { key: "installments", label: "Parcelas", class: "text-center" },
      { key: "capacityObs", label: "Obs. Excesso" },
      { key: "dateCreated", label: "Data de Submissão", class: "text-center" },
      { key: "dueDate", label: "Data de Desembolso", class: "text-center" },
    ],
  }),

  components: {
    NavBarVue,
    LoansList,
  },

  computed: {
    ...mapGetters([
      "isLoading",
      "user",
      "users",
      "token",
      "company",
      "companyLoans",
      "accounts",
      "customers",
      "customersNameMap",
      "customersPagination",
      "dueInstallments",
      "upcomingInstallments",
      "updatedPassword",
      "monthllyTransactions",
      "dashboardKpis",
    ]),

    filteredDueInstallments() {
      let list = this.dueInstallments || [];
      if (this.dashboardDateFrom) {
        const from = moment(this.dashboardDateFrom).startOf("day");
        list = list.filter((item) => moment(item.dueDate).isSameOrAfter(from));
      }
      if (this.dashboardDateTo) {
        const to = moment(this.dashboardDateTo).endOf("day");
        list = list.filter((item) => moment(item.dueDate).isSameOrBefore(to));
      }
      return list;
    },

    filteredUpcomingInstallments() {
      let list = this.upcomingInstallments || [];
      if (this.dashboardDateFrom) {
        const from = moment(this.dashboardDateFrom).startOf("day");
        list = list.filter((item) => moment(item.dueDate).isSameOrAfter(from));
      }
      if (this.dashboardDateTo) {
        const to = moment(this.dashboardDateTo).endOf("day");
        list = list.filter((item) => moment(item.dueDate).isSameOrBefore(to));
      }
      return list;
    },

    // Total das prestações vencidas (lista já filtrada por período)
    totalDueAmount() {
      return this.filteredDueInstallments.reduce((sum, item) => sum + (item.installment || 0), 0);
    },

    // Taxa de recuperação = totalRecebido / totalDesembolsadoComJuros * 100
    recoveryRate() {
      if (this.totalDesembolsadoComJuros <= 0) return 0;
      return Math.min(100, Math.round((this.totalRecebido / this.totalDesembolsadoComJuros) * 100));
    },

    recoveryRateVariant() {
      if (this.recoveryRate >= 70) return "success";
      if (this.recoveryRate >= 40) return "warning";
      return "danger";
    },

    recoveryRateClass() {
      if (this.recoveryRate >= 70) return "text-success";
      if (this.recoveryRate >= 40) return "text-warning";
      return "text-danger";
    },
    delinquencyKpis() {
      return this.dashboardKpis?.delinquency || {};
    },
    hasDashboardFilter() {
      return !!(this.dashboardDateFrom || this.dashboardDateTo);
    },
    dashboardRangeLabel() {
      const fromLabel = this.dashboardDateFrom
        ? moment(this.dashboardDateFrom).format("DD/MM/YYYY")
        : "Início";
      const toLabel = this.dashboardDateTo
        ? moment(this.dashboardDateTo).format("DD/MM/YYYY")
        : "Hoje";
      return `${fromLabel} a ${toLabel}`;
    },
    monthlyComparisonSeries() {
      const fromMonth = this.dashboardDateFrom
        ? moment(this.dashboardDateFrom).startOf("month")
        : null;
      const toMonth = this.dashboardDateTo
        ? moment(this.dashboardDateTo).endOf("month")
        : moment().endOf("month");
      const hasValidFrom = !!(fromMonth && fromMonth.isValid());
      const hasValidTo = !!(toMonth && toMonth.isValid());

      let startMonth = hasValidFrom ? fromMonth.clone() : toMonth.clone().subtract(11, "months").startOf("month");
      // Se o utilizador definiu um fim e o início não foi informado, ancoramos os últimos 12 meses nessa data.
      if (!hasValidFrom && hasValidTo) {
        startMonth = toMonth.clone().subtract(11, "months").startOf("month");
      }

      const monthMap = {};
      const months = [];

      const chartEndMonth = startMonth.clone().add(11, "months").endOf("month");
      const filterStart = hasValidFrom ? fromMonth.clone().startOf("month") : startMonth.clone();
      const filterEnd = hasValidTo ? toMonth.clone().endOf("month") : chartEndMonth.clone();

      for (let i = 0; i < 12; i += 1) {
        const monthPoint = startMonth.clone().add(i, "months");
        const key = monthPoint.format("YYYY-MM");
        months.push({
          key,
          label: monthPoint.locale("pt").format("MMM/YY"),
          disbursed: 0,
          payments: 0,
        });
        monthMap[key] = months[i];
      }

      const disbursedStatuses = new Set([1, 3]);
      (this.companyLoanList || []).forEach((loan) => {
        if (!disbursedStatuses.has(Number(loan.status))) return;
        const dateValue = loan.dueDate || loan.dateCreated || loan.createdAt;
        const date = moment(dateValue);
        if (!date.isValid() || date.isBefore(startMonth) || date.isAfter(chartEndMonth)) return;
        if (date.isBefore(filterStart) || date.isAfter(filterEnd)) return;
        const key = date.format("YYYY-MM");
        if (monthMap[key]) {
          monthMap[key].disbursed += parseFloat(loan.amount) || 0;
        }
      });

      (this.monthllyTransactions || []).forEach((transaction) => {
        const dateValue = transaction.createdAt || transaction.dateCreated;
        const date = moment(dateValue);
        if (!date.isValid() || date.isBefore(startMonth) || date.isAfter(chartEndMonth)) return;
        if (date.isBefore(filterStart) || date.isAfter(filterEnd)) return;
        const key = date.format("YYYY-MM");
        if (monthMap[key]) {
          monthMap[key].payments +=
            (parseFloat(transaction.amount) || 0) +
            (parseFloat(transaction.latePaymentInterest) || 0);
        }
      });

      const maxValue = months.reduce((max, item) => {
        return Math.max(max, item.disbursed, item.payments);
      }, 0);

      return months.map((item) => {
        const disbursedHeight = maxValue > 0 ? Math.max((item.disbursed / maxValue) * 100, 4) : 0;
        const paymentsHeight = maxValue > 0 ? Math.max((item.payments / maxValue) * 100, 4) : 0;
        return {
          ...item,
          disbursedHeight: item.disbursed > 0 ? disbursedHeight : 0,
          paymentsHeight: item.payments > 0 ? paymentsHeight : 0,
        };
      });
    },
    monthlyComparisonTotals() {
      return this.monthlyComparisonSeries.reduce(
        (acc, item) => {
          acc.disbursed += item.disbursed;
          acc.payments += item.payments;
          return acc;
        },
        { disbursed: 0, payments: 0 }
      );
    },
    monthlyComparisonWindowLabel() {
      if (!this.monthlyComparisonSeries.length) return "";
      const first = this.monthlyComparisonSeries[0];
      const last = this.monthlyComparisonSeries[this.monthlyComparisonSeries.length - 1];
      return `${first.label} - ${last.label}`;
    },
    overdueRateClass() {
      const rate = Number(this.delinquencyKpis.overdueRate || 0);
      if (rate >= 25) return "text-danger";
      if (rate >= 10) return "text-warning";
      return "text-success";
    },

    combinedNameMap() {
      const map = {};
      if (this.customersNameMap) {
        Object.keys(this.customersNameMap).forEach((key) => {
          map[key] = this.customersNameMap[key];
        });
      }
      if (this.customers && this.customers.length > 0) {
        this.customers.forEach((c) => {
          map[c.accountNumber] = c.customerName;
        });
      }
      return map;
    },
    smsAnnouncementContactOptions() {
      const source = this.customers || [];
      const search = String(this.smsAnnouncementSearch || "").trim().toLowerCase();
      const filtered = search
        ? source.filter((customer) => {
            const name = String(customer.customerName || "").toLowerCase();
            const account = String(customer.accountNumber || "");
            const phone = String(customer.customerPhone || "");
            return (
              name.includes(search) ||
              account.includes(search) ||
              phone.includes(search)
            );
          })
        : source;

      return filtered
        .filter((customer) => !!customer.customerPhone)
        .map((customer) => ({
          value: String(customer.accountNumber),
          text: `${customer.customerName} (${customer.accountNumber}) - ${customer.customerPhone}`,
        }));
    },
    smsAnnouncementRecipientsCount() {
      if (this.smsAnnouncement.sendToAllCustomers) {
        return (this.customers || []).filter((customer) => !!customer.customerPhone).length;
      }
      const selected = (this.smsAnnouncement.selectedAccounts || []).length;
      const custom = String(this.smsAnnouncement.customPhones || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => !!line).length;
      return selected + custom;
    },
    canSendSmsAnnouncement() {
      return (
        String(this.smsAnnouncement.messageBody || "").trim().length > 0 &&
        this.smsAnnouncementRecipientsCount > 0
      );
    },
  },

  watch: {
    companyLoans: function () {
      this.populateCompanyLoans();
    },
    monthllyTransactions: function () {
      this.calculateTotals();
    },
    dashboardKpis: {
      handler() {
        this.applyDashboardKpis();
      },
      deep: true,
    },
    company: {
      handler(val) {
        if (val && val.id) {
          this.loadTransactions();
          this.loadDashboardOverview();
          if (!this.customersNameMap || Object.keys(this.customersNameMap).length === 0) {
            this.$store.dispatch("getCustomersNameMap", val.id);
          }
        }
      },
      immediate: false,
    },
  },

  created() {
    this.checkPasswordStatus();
    // Se a company já estiver disponível, carrega transacções imediatamente
    if (this.company && this.company.id) {
      this.loadTransactions();
      this.loadDashboardOverview();
    }
  },

  methods: {
    smsStatusVariant(status) {
      const normalized = String(status || "").toLowerCase();
      const map = {
        queued: "warning",
        processing: "primary",
        sent: "success",
        failed: "danger",
        cancelled: "secondary",
      };
      return map[normalized] || "secondary";
    },
    truncateSmsBody(body) {
      const text = String(body || "");
      if (text.length <= 90) return text;
      return `${text.slice(0, 90)}...`;
    },
    formatDateTime(value) {
      if (!value) return "—";
      const parsed = moment(value);
      return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : "—";
    },
    openSmsServiceView() {
      this.activeAdminView = "sms-service";
      this.loadSmsServiceData();
    },
    clearSmsFilters() {
      this.smsHistoryFrom = "";
      this.smsHistoryTo = "";
      this.smsHistoryStatus = "";
      this.fetchSmsQueueHistory();
    },
    async loadSmsServiceData() {
      this.smsServiceLoading = true;
      try {
        await Promise.all([this.fetchSmsQueueHistory(), this.fetchSmsQueuePendingCount()]);
      } finally {
        this.smsServiceLoading = false;
      }
    },
    async fetchSmsQueuePendingCount() {
      if (!this.company || !this.company.id) return;
      try {
        const res = await axios.get("/api/sms-gateway/pending", {
          params: {
            companyId: this.company.id,
            limit: 500,
          },
        });
        if (res?.data?.data && Array.isArray(res.data.data)) {
          const queued = res.data.data.filter((item) => item.status === "queued").length;
          const processing = res.data.data.filter((item) => item.status === "processing").length;
          this.smsQueueStats.queued = queued;
          this.smsQueueStats.processing = processing;
        }
      } catch (err) {
        this.$bvToast.toast("Erro ao carregar pendências SMS.", {
          title: "Erro!",
          variant: "danger",
          solid: true,
          toaster: "b-toaster-top-center",
        });
      }
    },
    async fetchSmsQueueHistory() {
      if (!this.company || !this.company.id) return;
      try {
        const params = {
          companyId: this.company.id,
          from: this.smsHistoryFrom || undefined,
          to: this.smsHistoryTo || undefined,
          status: this.smsHistoryStatus || undefined,
          limit: 500,
        };
        const res = await axios.get("/api/sms-gateway/history", { params });
        if (res.data && res.data.success) {
          this.smsQueueHistory = Array.isArray(res.data.result) ? res.data.result : [];
          const stats = this.smsQueueHistory.reduce(
            (acc, row) => {
              const status = String(row.status || "").toLowerCase();
              if (Object.prototype.hasOwnProperty.call(acc, status)) {
                acc[status] += 1;
              }
              acc.total += 1;
              return acc;
            },
            { queued: 0, processing: 0, sent: 0, failed: 0, cancelled: 0, total: 0 }
          );
          this.smsQueueStats = {
            ...this.smsQueueStats,
            ...stats,
          };
        }
      } catch (err) {
        this.$bvToast.toast("Erro ao carregar histórico SMS.", {
          title: "Erro!",
          variant: "danger",
          solid: true,
          toaster: "b-toaster-top-center",
        });
      }
    },
    resetSmsAnnouncement() {
      this.smsAnnouncement = {
        messageBody: "",
        sendToAllCustomers: false,
        selectedAccounts: [],
        customPhones: "",
      };
      this.smsAnnouncementSearch = "";
    },
    async sendSmsAnnouncement() {
      if (!this.company || !this.company.id) return;
      if (!this.canSendSmsAnnouncement) return;

      const customerMap = {};
      (this.customers || []).forEach((customer) => {
        customerMap[String(customer.accountNumber)] = customer;
      });

      const selectedContacts = (this.smsAnnouncement.selectedAccounts || [])
        .map((account) => customerMap[String(account)])
        .filter((customer) => !!customer)
        .map((customer) => ({
          accountNumber: customer.accountNumber,
          customerName: customer.customerName,
          phone: customer.customerPhone,
        }));

      const customContacts = String(this.smsAnnouncement.customPhones || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => !!line)
        .map((phone, index) => ({
          accountNumber: null,
          customerName: `Contacto Extra ${index + 1}`,
          phone,
        }));

      this.smsSendingAnnouncement = true;
      try {
        const payload = {
          companyId: this.company.id,
          messageBody: String(this.smsAnnouncement.messageBody || "").trim(),
          sendToAllCustomers: !!this.smsAnnouncement.sendToAllCustomers,
          contacts: this.smsAnnouncement.sendToAllCustomers
            ? []
            : [...selectedContacts, ...customContacts],
        };

        const res = await axios.post("/api/sms-gateway/announcements", payload);
        if (res.data && res.data.success) {
          const queued = res.data.result?.queued || 0;
          const skipped = res.data.result?.skipped || 0;
          this.$bvToast.toast(`Anúncio enfileirado. ${queued} SMS na fila${skipped > 0 ? `, ${skipped} ignorado(s)` : ""}.`, {
            title: "Sucesso!",
            variant: "success",
            solid: true,
            toaster: "b-toaster-top-center",
          });
          this.resetSmsAnnouncement();
          await this.loadSmsServiceData();
        } else {
          this.$bvToast.toast(res.data?.message || "Não foi possível enfileirar o anúncio.", {
            title: "Aviso!",
            variant: "warning",
            solid: true,
            toaster: "b-toaster-top-center",
          });
        }
      } catch (err) {
        this.$bvToast.toast("Erro ao enviar anúncio SMS.", {
          title: "Erro!",
          variant: "danger",
          solid: true,
          toaster: "b-toaster-top-center",
        });
      } finally {
        this.smsSendingAnnouncement = false;
      }
    },
    convertMoney(value) {
      return MoneyFormat.formatMoney(value);
    },

    loadTransactions() {
      if (this.company && this.company.id) {
        this.$store.dispatch("getMonthllyTransactions", this.company.id);
      }
    },

    loadDashboardOverview() {
      if (this.company && this.company.id) {
        const payload = {
          companyId: this.company.id,
        };
        if (this.dashboardDateFrom) payload.from = this.dashboardDateFrom;
        if (this.dashboardDateTo) payload.to = this.dashboardDateTo;
        this.$store.dispatch("getDashboardOverview", payload);
      }
    },

    applyDashboardPeriodFilter() {
      this.loadDashboardOverview();
    },

    clearDashboardPeriodFilter() {
      this.dashboardDateFrom = "";
      this.dashboardDateTo = "";
      this.loadDashboardOverview();
    },

    calculateTotals() {
      // Total recebido (soma de todas as transacções da empresa)
      this.totalRecebido = this.monthllyTransactions.reduce(
        (sum, t) => sum + (parseFloat(t.amount) || 0) + (parseFloat(t.latePaymentInterest) || 0),
        0
      );

      // Total desembolsado com juros (capital + juros totais via fórmula Price)
      // Para recuperação, considerar créditos efetivamente desembolsados:
      // ativos + liquidados.
      // Total do crédito = PMT * n (inclui capital + juros)
      const totalDesembolsadoComJuros = this.companyLoanList
        .filter((c) => [1, 3].includes(Number(c.status)))
        .reduce((sum, loan) => {
          const capital = parseFloat(loan.amount) || 0;
          const rate = parseFloat(loan.interestRate) || 0;
          const n = parseInt(loan.numberOfInstallments) || 1;

          let totalLoan = capital; // fallback: sem juros
          if (rate > 0 && n > 0) {
            // Fórmula Price (amortização francesa)
            const pmt = capital * rate / (1 - Math.pow(1 + rate, -n));
            totalLoan = pmt * n;
          }

          return sum + totalLoan;
        }, 0);

      // Guardar o total desembolsado com juros no estado do componente
      this.totalDesembolsadoComJuros = Math.round(totalDesembolsadoComJuros * 100) / 100;

      // Total em dívida = total (capital + juros) - total recebido
      this.totalEmDivida = Math.max(0, this.totalDesembolsadoComJuros - this.totalRecebido);
    },

    selectLoanList(list) {
      if (list == 1) {
        this.selectedLoanDescription = "Financiamentos Pendentes";
        this.selectedLoanType = "pending";
        this.selectedLoanList = this.companyLoanList.filter((credit) => {
          return credit.status == 0;
        });
      } else if (list == 2) {
        this.selectedLoanDescription = "Financiamentos Rejeitados";
        this.selectedLoanType = "rejected";
        this.selectedLoanList = this.companyLoanList.filter((credit) => {
          return credit.status == -1;
        });
      }
      this.$refs["show-pending-loans"].show();
    },

    checkPasswordStatus() {
      this.user.updatedPassword == 1 ? "" : this.$router.replace("/profile");
    },

    goToCustomers() {
      this.$router.replace("/customers");
    },

    async openCustomerPanel(accountNumber) {
      const filteredCustomer = this.customers.filter((a) => {
        return a.accountNumber == accountNumber;
      });
      if (filteredCustomer.length > 0) {
        this.$store.commit("SET_CURRENT_CUSTOMER", filteredCustomer[0]);
        this.$router.replace("/customer");
        return;
      }
      try {
        const res = await axios.get(`/api/searchCustomers/${accountNumber}`);
        if (res.data.success && res.data.result.length > 0) {
          const customer = res.data.result.find((c) => c.accountNumber == accountNumber);
          if (customer) {
            this.$store.commit("SET_CURRENT_CUSTOMER", customer);
            this.$router.replace("/customer");
            return;
          }
        }
        this.$bvToast.toast("Mutuário não encontrado.", {
          title: "Aviso!", variant: "warning", solid: true, toaster: "b-toaster-top-center",
        });
      } catch {
        this.$bvToast.toast("Erro ao buscar dados do mutuário.", {
          title: "Erro!", variant: "danger", solid: true, toaster: "b-toaster-top-center",
        });
      }
    },

    syncAllData() {
      // Re-buscar empréstimos e transacções do servidor
      if (this.company && this.company.id) {
        this.$store.dispatch("getCompanyLoans", this.company.id);
        this.$store.dispatch("getDueInstallments", this.company.id);
        this.$store.dispatch("getUpcomingInstallments", this.company.id);
        this.loadTransactions();
        this.loadDashboardOverview();
      }
    },

    syncLoans() {
      if (this.user.userRole === 1) {
        this.companyLoanList = this.companyLoans;
      } else {
        const list = this.companyLoans.filter((a) => {
          return a.creditManager == this.user.id;
        });
        this.companyLoanList = list;
      }
    },

    populateCompanyLoans() {
      this.syncLoans();

      // Créditos desembolsados (activos)
      const disbursedLoan = this.companyLoanList.filter((credit) => {
        return credit.status == 1;
      });
      this.activeLoans = disbursedLoan.reduce((sum, p) => sum + p.amount, 0);

      // Créditos pendentes
      const pendingLoan = this.companyLoanList.filter((credit) => {
        return credit.status == 0;
      });
      this.pendingLoans = pendingLoan.reduce((sum, p) => sum + p.amount, 0);

      // Créditos rejeitados
      const rejectedLoan = this.companyLoanList.filter((credit) => {
        return credit.status == -1;
      });
      this.rejectedLoans = rejectedLoan.reduce((sum, p) => sum + p.amount, 0);

      // Créditos terminados
      const completedLoan = this.companyLoanList.filter((credit) => {
        return credit.status == 3;
      });
      this.completedLoansCount = completedLoan.length;
      this.liquidatedLoansAmount = completedLoan.reduce(
        (sum, p) => sum + (parseFloat(p.amount) || 0),
        0
      );

      // Recalcular totais financeiros
      this.calculateTotals();
      this.applyDashboardKpis();
    },

    applyDashboardKpis() {
      const kpis = this.dashboardKpis || {};
      const financial = kpis.financial || {};
      const delinquency = kpis.delinquency || {};
      const loans = kpis.loans || {};

      if (Object.keys(financial).length > 0) {
        const totalCollected = Number(financial.totalCollected || 0);
        const totalLateInterest = Number(financial.totalLateInterest || 0);
        const recoveryCollected = Number(
          financial.recoveryCollectedAmount || totalCollected + totalLateInterest
        );
        this.activeLoans = Number(financial.totalDisbursed || this.activeLoans);
        this.pendingLoans = Number(financial.pendingAmount || this.pendingLoans);
        this.liquidatedLoansAmount = Number(
          financial.liquidatedAmount || this.liquidatedLoansAmount
        );
        this.totalRecebido = Number(recoveryCollected.toFixed(2));
        this.totalDesembolsadoComJuros = Number(
          Number(financial.recoveryBaseAmount || this.totalDesembolsadoComJuros).toFixed(2)
        );
      }

      if (Object.keys(delinquency).length > 0) {
        this.totalEmDivida = Number(
          Number(delinquency.outstandingPortfolio || this.totalEmDivida).toFixed(2)
        );
      }

      if (Object.keys(loans).length > 0 && Number.isFinite(Number(loans.liquidated))) {
        this.completedLoansCount = Number(loans.liquidated);
      }
    },

    getCustomerName(accountNumber) {
      if (this.combinedNameMap[accountNumber]) {
        return this.combinedNameMap[accountNumber];
      }
      return String(accountNumber);
    },

    calculateLateDays(dueDate) {
      const diff = moment().diff(moment(dueDate), "days");
      return diff > 0 ? diff : 0;
    },

    buildNotificationMessage(customer, installment) {
      const dueDateLabel = installment?.dueDate
        ? moment(installment.dueDate).format("DD/MM/YYYY")
        : "data indisponível";
      return `Prezado(a) ${customer.customerName},\n\nLembrete: prestação nº ${installment.installmentOrder}, vencimento ${dueDateLabel}, valor ${MoneyFormat.formatMoney(installment.installment)}.\nSe já pagou, ignore esta mensagem.\n\n${this.company.companyName}`;
    },

    openNotificationModal(installment) {
      const customer = this.customers.find(
        (c) => c.accountNumber === installment.accountNumber
      );
      if (!customer) {
        this.$bvToast.toast("Não foi possível encontrar o cliente.", {
          title: "Aviso!",
          variant: "warning",
          solid: true,
          toaster: "b-toaster-top-center",
          autoHideDelay: 5000,
        });
        return;
      }

      this.currentNotificationItem = installment;
      this.notificationData = {
        customerName: customer.customerName,
        phone: customer.customerPhone || "",
        email: customer.customerEmail || "",
        accountNumber: customer.accountNumber,
        installmentOrder: installment.installmentOrder,
        installmentAmount: installment.installment,
      };
      this.notificationMessage = this.buildNotificationMessage(customer, installment);
      this.notificationChannels = ["sms"];
      this.$refs["notification-modal"].show();
    },

    resetNotificationMessage() {
      const customer = this.customers.find(
        (c) => c.accountNumber === this.notificationData.accountNumber
      );
      if (customer && this.currentNotificationItem) {
        this.notificationMessage = this.buildNotificationMessage(customer, this.currentNotificationItem);
      }
    },

    async sendNotification() {
      this.sendingNotification = true;
      const results = [];

      try {
        // SMS
        if (this.notificationChannels.includes("sms")) {
          if (!this.notificationData.phone) {
            this.$bvToast.toast("O número de telefone é obrigatório para enviar SMS.", {
              title: "Aviso!", variant: "warning", solid: true, toaster: "b-toaster-top-center",
            });
            this.sendingNotification = false;
            return;
          }
          const payload = {
            companyId: this.company.id,
            accountNumber: this.notificationData.accountNumber,
            customerName: this.notificationData.customerName,
            phone: this.notificationData.phone,
            messageType: "upcoming_installment_alert_manual",
            messageBody: this.notificationMessage,
            payloadJson: {
              source: "admin_dashboard_notification_modal",
              installmentOrder: this.notificationData.installmentOrder,
              dueDate: this.currentNotificationItem?.dueDate || null,
            },
          };
          const smsEnqueueRes = await axios.post("/api/sms-gateway/enqueue", payload);
          if (!smsEnqueueRes?.data?.success) {
            throw new Error(smsEnqueueRes?.data?.message || "Falha ao enfileirar SMS.");
          }
          results.push("SMS");
        }

        // WhatsApp
        if (this.notificationChannels.includes("whatsapp")) {
          if (!this.notificationData.phone) {
            this.$bvToast.toast("O número de telefone é obrigatório para enviar WhatsApp.", {
              title: "Aviso!", variant: "warning", solid: true, toaster: "b-toaster-top-center",
            });
            this.sendingNotification = false;
            return;
          }
          const phone = this.notificationData.phone.replace(/\D/g, "");
          const encodedMsg = encodeURIComponent(this.notificationMessage);
          window.open(`https://wa.me/${phone}?text=${encodedMsg}`, "_blank");
          results.push("WhatsApp");
        }

        // E-mail
        if (this.notificationChannels.includes("email")) {
          if (!this.notificationData.email) {
            this.$bvToast.toast("O e-mail do cliente é obrigatório.", {
              title: "Aviso!", variant: "warning", solid: true, toaster: "b-toaster-top-center",
            });
            this.sendingNotification = false;
            return;
          }
          const subject = encodeURIComponent(`Lembrete de Prestação - ${this.company.companyName}`);
          const body = encodeURIComponent(this.notificationMessage);
          window.open(`mailto:${this.notificationData.email}?subject=${subject}&body=${body}`, "_blank");
          results.push("E-mail");
        }

        if (results.length > 0) {
          this.$bvToast.toast(`Notificação enviada via: ${results.join(", ")}`, {
            title: "Sucesso!",
            variant: "success",
            solid: true,
            toaster: "b-toaster-top-center",
            autoHideDelay: 5000,
          });
          this.$refs["notification-modal"].hide();
        }
      } catch (err) {
        this.$bvToast.toast("Ocorreu um erro ao enviar a notificação.", {
          title: "Erro!", variant: "danger", solid: true, toaster: "b-toaster-top-center",
        });
      } finally {
        this.sendingNotification = false;
      }
    },

    // Manter compatibilidade com o botão de lembrete nas prestações vencidas
    remindCustomer(installment) {
      this.openNotificationModal(installment);
    },

    openCompletedLoansModal() {
      this.completedSearch = "";
      this.completedLoansList = [];
      this.completedPagination = { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 10 };
      this.$refs["completed-loans-modal"].show();
      this.fetchCompletedLoans(1);
    },

    async fetchCompletedLoans(page = 1) {
      this.completedLoading = true;
      try {
        const res = await axios.get(`/api/companyLoans/${this.company.id}/paginated`, {
          params: {
            page,
            limit: this.completedPagination.itemsPerPage,
            status: 3,
            search: this.completedSearch || "",
          },
        });
        if (res.data.success) {
          this.completedLoansList = res.data.result;
          const p = res.data.pagination;
          this.completedPagination = {
            currentPage: p.currentPage,
            totalPages: p.totalPages,
            totalItems: p.totalItems,
            itemsPerPage: p.itemsPerPage,
          };
        }
      } catch (err) {
        this.$bvToast.toast("Erro ao carregar créditos liquidados.", {
          title: "Erro!", variant: "danger", solid: true, toaster: "b-toaster-top-center",
        });
      } finally {
        this.completedLoading = false;
      }
    },

    onCompletedSearchChange() {
      this.fetchCompletedLoans(1);
    },

    formatDate(value) {
      if (!value) return "—";
      const d = moment(value);
      return d.isValid() ? d.format("DD/MM/YYYY") : "—";
    },
  },
};
</script>

<style scoped>
/* ==================== BASE FONT ==================== */
.home-view {
  font-size: 0.85rem;
}
.home-view h3 {
  font-size: 1.25rem;
}
.home-view h4 {
  font-size: 1.1rem;
}
.home-view h5,
.home-view h6 {
  font-size: 0.95rem;
}
.home-view p,
.home-view span,
.home-view td,
.home-view th,
.home-view label,
.home-view small {
  font-size: inherit;
}

/* ==================== MODAL FINANCIAMENTOS ==================== */
.modal-title-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-title-icon.icon-warning {
  background-color: rgba(255, 193, 7, 0.12);
  color: #d39e00;
}
.modal-title-icon.icon-danger {
  background-color: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}
.modal-title-icon.icon-primary {
  background-color: rgba(0, 123, 255, 0.1);
  color: #007bff;
}

/* ==================== CORES MBR ==================== */
.text-mbr-green {
  color: #009640 !important;
}
.bg-mbr-green {
  background-color: #009640 !important;
}

/* ==================== KPI LABELS ==================== */
.kpi-label {
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.65rem;
  font-weight: 700;
  color: #6c757d;
}

.filter-active-pill {
  display: inline-flex;
  align-items: center;
  background: rgba(0, 150, 64, 0.12);
  color: #0a5d2f;
  border: 1px solid rgba(0, 150, 64, 0.25);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 600;
}

.risk-card {
  border-left: 4px solid #ffc107 !important;
}

/* ==================== CARDS DE ESTATÍSTICA ==================== */
.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  border-radius: 12px;
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08) !important;
}
.accent-green {
  border-left: 4px solid #009640 !important;
}
.accent-success {
  border-left: 4px solid #28a745 !important;
}
.accent-danger {
  border-left: 4px solid #dc3545 !important;
}

/* ==================== ÍCONES ==================== */
.icon-shape {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.bg-soft-info {
  background-color: rgba(23, 162, 184, 0.1);
}
.bg-soft-warning {
  background-color: rgba(255, 193, 7, 0.1);
}
.bg-soft-danger {
  background-color: rgba(220, 53, 69, 0.1);
}
.bg-soft-success {
  background-color: rgba(40, 167, 69, 0.1);
}
.bg-soft-primary {
  background-color: rgba(0, 123, 255, 0.1);
}

/* ==================== BOTÕES MBR ==================== */
.btn-mbr-green {
  background-color: #009640;
  color: white;
  border-radius: 8px;
}
.btn-mbr-green:hover {
  background-color: #007a33;
  color: white;
}

.btn-mbr-green-light {
  background-color: rgba(0, 150, 64, 0.1);
  color: #009640;
  border: none;
  font-weight: 600;
}
.btn-mbr-green-light:hover {
  background-color: #009640;
  color: white;
}

/* ==================== FILTRO RÁDIO ==================== */
.mbr-radio-group .btn-outline-mbr {
  border-color: #dee2e6;
  color: #6c757d;
  background-color: white;
}
.mbr-radio-group .btn-outline-mbr:not(:disabled):not(.disabled).active {
  background-color: #009640;
  border-color: #009640;
  color: white;
}

/* ==================== AVATARES ==================== */
.avatar-circle {
  width: 35px;
  height: 35px;
  background-color: #e9ecef;
  color: #495057;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.avatar-danger {
  background-color: #f8d7da;
  color: #721c24;
}

/* ==================== BADGES ==================== */
.badge-soft-warning {
  background-color: #fff3cd;
  color: #856404;
}
.badge-soft-success {
  background-color: #d4edda;
  color: #155724;
}

/* ==================== BOTÃO OUTLINE MBR GREEN ==================== */
.btn-outline-mbr-green {
  color: #009640;
  border-color: #009640;
  background-color: transparent;
}
.btn-outline-mbr-green:hover {
  background-color: #009640;
  color: white;
}

/* ==================== MODAL NOTIFICAÇÃO ==================== */
.notification-customer-info strong {
  font-size: 0.9rem;
}

/* ==================== TABELA PRESTAÇÕES VENCIDAS ==================== */
.overdue-table {
  font-size: 0.78rem;
}

.overdue-row {
  border-left: 3px solid #dc3545;
}

/* ==================== MODAL CRÉDITOS LIQUIDADOS ==================== */
.avatar-sm {
  width: 30px;
  height: 30px;
  font-size: 0.7rem;
}

.completed-loans-table {
  font-size: 0.8rem;
}

/* ==================== GRÁFICO COMPARATIVO ==================== */
.comparison-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  color: #6c757d;
  font-size: 0.78rem;
  font-weight: 600;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}

.legend-disbursed {
  background-color: #007bff;
}

.legend-payments {
  background-color: #28a745;
}

.comparison-chart {
  min-height: 210px;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
}

.month-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.month-bars {
  height: 170px;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
}

.month-bar {
  width: 45%;
  border-radius: 4px 4px 0 0;
  min-height: 0;
  transition: opacity 0.2s ease;
}

.month-bar:hover {
  opacity: 0.8;
}

.month-bar.disbursed {
  background-color: #007bff;
}

.month-bar.payments {
  background-color: #28a745;
}

.month-label {
  color: #6c757d;
  margin-top: 6px;
  font-weight: 600;
  text-transform: uppercase;
}

.comparison-totals {
  border-top: 1px solid #eef1f4;
  padding-top: 10px;
}
</style>
